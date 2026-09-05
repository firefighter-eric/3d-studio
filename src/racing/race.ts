import { CAR_SPECS, carSpec } from './cars'
import type { CarId } from './cars'
import { TRACK_LENGTH, ROAD_HALF_WIDTH, trackAt, nearestTrack, wrapAngle, clamp, circuitCurve, PICKUP_PROGRESS } from './track'
import { resolveCarBarriers } from './barriers'

export type RaceStatus = 'ready' | 'countdown' | 'racing' | 'paused' | 'finished' | 'timeout'
export type RaceDifficulty = 'casual' | 'sport'
export type RaceItem = 'turbo' | 'shield' | 'pulse'
export const ITEM_INFO: Record<RaceItem,{name:string;symbol:string;color:string;description:string}> = {
  turbo:{name:'涡轮补给',symbol:'N',color:'#ffc557',description:'补充 1 次氮气；满仓时立即短促加速'},
  shield:{name:'能量护盾',symbol:'◇',color:'#65dedb',description:'8 秒内抵挡碰撞和脉冲'},
  pulse:{name:'电磁脉冲',symbol:'ϟ',color:'#be9aff',description:'让前方 45 米内最近的对手减速'},
}
export interface RaceInput { steer:number; throttle:boolean; brake:boolean; drift:boolean; boost:boolean; item:boolean; reset:boolean }
export const emptyRaceInput=():RaceInput=>({steer:0,throttle:false,brake:false,drift:false,boost:false,item:false,reset:false})
export interface Racer {
  id:number;name:string;car:CarId;x:number;z:number;yaw:number;vx:number;vz:number;speed:number;steer:number;trackIndex:number;trackS:number;offset:number;progress:number;checks:number;lapTimes:number[];lapStart:number;finishTime:number|null;
  nitro:number;boost:number;drifting:boolean;driftCharge:number;driftAwards:number;item:RaceItem|null;shield:number;slow:number;hit:number;recovery:number;wrongWay:number;offroad:boolean;padCooldown:number;itemCooldown:number;resets:number;boostsUsed:number;itemsUsed:number
}
export interface RacePickup { s:number;offset:number;cooldown:number;id:number }
export interface RaceEvent {seq:number;kind:'start'|'boost'|'drift'|'pickup'|'item'|'hit'|'lap'|'finish'|'reset';text:string;time:number;racer:number}
export interface RaceRecord {time:number;lap:number;position:number;date:string;car:CarId;difficulty:RaceDifficulty}
const LAP_COUNT=3,CHECKS_PER_LAP=12,STEP=1/120
export const RACE_LAPS=LAP_COUNT
export class RaceSimulation {
  status:RaceStatus='ready'; previousStatus:RaceStatus='racing'; time=0; countdown=3;accumulator=0; frame=0;sequence=0;events:RaceEvent[]=[]; racers:Racer[]=[];pickups:RacePickup[]=[];pulse=0;cameraMode=0;autoThrottle=true;seed=2431
  constructor(public car:CarId='formula-r1',public difficulty:RaceDifficulty='casual'){this.prepare()}
  get player(){return this.racers[0]}
  get position(){return this.standings().findIndex(r=>r.id===0)+1}
  get lap(){return Math.min(3,Math.floor(this.player.checks/CHECKS_PER_LAP)+1)}
  get lastEvent(){return [...this.events].reverse().find(e=>e.racer===0)}
  random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296}
  prepare(){
    this.status='ready';this.time=0;this.countdown=3;this.accumulator=0;this.frame=0;this.events=[];this.sequence=0;this.seed=2431;this.pulse=0
    const grid=[[-16,-2.5],[-4,-2.5],[-4,2.5],[-10,-2.5],[-10,2.5],[-16,2.5]]
    this.racers=grid.map(([s,offset],i)=>{const p=trackAt(s,offset);return {id:i,name:['你','海盐','阿洛','逐风','柠檬','蓝调'][i],car:i===0?this.car:CAR_SPECS[(i+1)%3].id,x:p.x,z:p.z,yaw:Math.atan2(p.tx,p.tz),vx:0,vz:0,speed:0,steer:0,trackIndex:p.index,trackS:p.s,offset,progress:s,checks:0,lapTimes:[],lapStart:0,finishTime:null,nitro:1,boost:0,drifting:false,driftCharge:0,driftAwards:0,item:null,shield:0,slow:0,hit:0,recovery:0,wrongWay:0,offroad:false,padCooldown:0,itemCooldown:1+i,resets:0,boostsUsed:0,itemsUsed:0}})
    this.pickups=PICKUP_PROGRESS.flatMap((s,i)=>[-4.5,0,4.5].map((offset,j)=>({id:i*3+j,s,offset,cooldown:0})))
  }
  start(){if(this.status==='ready'){this.status='countdown';this.emit('start','准备发车',0)}}
  pause(){if(this.status==='racing'||this.status==='countdown'){this.previousStatus=this.status;this.status='paused';this.accumulator=0}}
  resume(){if(this.status==='paused'){this.status=this.previousStatus;this.accumulator=0}}
  emit(kind:RaceEvent['kind'],text:string,racer:number){this.events.push({seq:++this.sequence,kind,text,time:this.time,racer});if(this.events.length>40)this.events.shift()}
  standings(){return [...this.racers].sort((a,b)=>a.finishTime!==null&&b.finishTime!==null?a.finishTime-b.finishTime:a.finishTime!==null?-1:b.finishTime!==null?1:b.progress-a.progress)}
  advance(delta:number,input:RaceInput){
    if(this.status!=='countdown'&&this.status!=='racing')return 0
    this.accumulator+=clamp(delta,0,1/15)
    let steps=0
    while(this.accumulator>=STEP){this.tick(STEP,steps===0?input:{...input,boost:false,item:false,reset:false});this.accumulator-=STEP;steps++}
    return steps
  }
  tick(dt:number,input:RaceInput){
    if(this.status==='countdown'){this.countdown-=dt;if(this.countdown<=0){this.status='racing';this.countdown=0;this.emit('start','绿灯！全力出发',0)}return}
    if(this.status!=='racing')return
    this.time+=dt;this.frame++;this.pulse=Math.max(0,this.pulse-dt)
    this.pickups.forEach(p=>p.cooldown=Math.max(0,p.cooldown-dt))
    for(const racer of this.racers){
      let controls=racer.id===0?{...input}:this.aiInput(racer)
      if(racer.id===0&&this.difficulty==='casual'){
        const assist=this.aiInput(racer,true)
        controls.steer=clamp(controls.steer*.9+assist.steer*(Math.abs(controls.steer)>.1?.27:.88),-1,1)
        if(this.autoThrottle&&!controls.brake&&Math.abs(input.steer)<.1&&assist.brake)controls.brake=true
      }
      if(racer.id===0&&this.autoThrottle)controls.throttle=true
      this.drive(racer,controls,dt)
    }
    this.collisions()
    if(this.player.finishTime!==null){this.status='finished';this.emit('finish',this.position===1?'冠军！属于你的方格旗':`冲线！第 ${this.position} 名`,0)}
    else if(this.time>=240){this.status='timeout';this.emit('finish','练习时间结束，再试一次',0)}
  }
  aiInput(r:Racer,assist=false):RaceInput {
    const lane=assist?0:Math.sin(r.progress*.006+r.id*2)*2.9
    const target=trackAt(r.progress+8+r.speed*.4,lane)
    const error=wrapAngle(Math.atan2(target.x-r.x,target.z-r.z)-r.yaw)
    const bend=Math.max(Math.abs(circuitCurve(r.progress+7)),Math.abs(circuitCurve(r.progress+23)))
    const cornerSpeed=clamp(Math.sqrt(13/Math.max(.006,bend)),19,50)
    const speed=carSpec(r.car).speed*(assist?1:this.difficulty==='casual'?.81:.93)
    const desired=Math.min(speed,cornerSpeed*(assist?1:.97))
    return {steer:clamp(-error*2.75,-1,1),throttle:true,brake:r.speed>desired,drift:false,boost:!assist&&bend<.012&&r.nitro>0&&r.boost<=0&&r.speed>27&&r.progress>55,item:!assist&&r.item!==null&&r.itemCooldown<=0,reset:!assist&&r.speed<2&&this.time>12}
  }
  resetRacer(r:Racer){
    if(this.status!=='racing'||r.recovery>0||r.finishTime!==null)return
    const p=trackAt(r.progress,0);r.x=p.x;r.z=p.z;r.yaw=Math.atan2(p.tx,p.tz);r.vx=0;r.vz=0;r.speed=0;r.steer=0;r.offset=0;r.trackIndex=p.index;r.trackS=p.s;r.recovery=1.5;r.shield=Math.max(r.shield,2.6);r.drifting=false;r.driftCharge=0;r.wrongWay=0;r.resets++
    this.emit('reset','已回到赛道 · 重新起步',r.id)
  }
  activateBoost(r:Racer){if(this.status!=='racing'||r.boost>0||r.nitro<=0||r.recovery>0)return;r.nitro--;r.boost=2.25;r.boostsUsed++;this.emit('boost','氮气推进',r.id)}
  useItem(r:Racer){
    if(this.status!=='racing'||!r.item||r.recovery>0)return
    const item=r.item;r.item=null;r.itemCooldown=5;r.itemsUsed++
    if(item==='turbo'){if(r.nitro<3)r.nitro++;else r.boost=Math.max(r.boost,1.1);this.emit('item','涡轮补给 · 氮气 +1',r.id)}
    if(item==='shield'){r.shield=8;this.emit('item','能量护盾 · 8 秒保护',r.id)}
    if(item==='pulse'){
      const target=this.racers.filter(other=>other.id!==r.id&&other.finishTime===null&&other.progress>r.progress&&other.progress-r.progress<45).sort((a,b)=>a.progress-b.progress)[0]
      if(target&&target.shield<=0){target.slow=2.4;target.speed*=.58;this.emit('hit','受到脉冲干扰',target.id)}
      this.pulse=1;this.emit('item',target?target.shield>0?'对手护盾挡住了脉冲':`脉冲命中 ${target.name}`:'脉冲释放 · 前方没有目标',r.id)
    }
  }
  drive(r:Racer,input:RaceInput,dt:number){
    for(const key of ['boost','shield','slow','hit','recovery','padCooldown','itemCooldown'] as const)r[key]=Math.max(0,r[key]-dt)
    if(r.finishTime!==null){r.speed*=Math.exp(-dt*3);r.vx*=Math.exp(-dt*3);r.vz*=Math.exp(-dt*3);return}
    if(input.reset)this.resetRacer(r)
    if(r.recovery>0)return
    if(input.boost)this.activateBoost(r)
    if(input.item)this.useItem(r)
    const spec=carSpec(r.car)
    r.steer+=(clamp(input.steer,-1,1)-r.steer)*(1-Math.exp(-dt*10))
    const wasDrifting=r.drifting
    r.drifting=input.drift&&r.speed>16&&(Math.abs(r.steer)>.12||wasDrifting)&&!r.offroad
    const slip=Math.abs(wrapAngle(Math.atan2(r.vx,r.vz)-r.yaw))
    if(r.drifting){if(Math.abs(r.steer)>.12||slip>.12)r.driftCharge=clamp(r.driftCharge+dt*(.9+Math.abs(r.steer)*.65),0,1.1)}
    else if(wasDrifting){if(r.driftCharge>=1&&r.nitro<3){r.nitro++;r.driftAwards++;this.emit('drift','完美漂移 · 氮气 +1',r.id)}r.driftCharge=0}
    const max=spec.speed*(r.boost>0?1.38:1)*(r.slow>0?.53:1)*(r.offroad?.5:1)
    if(input.brake)r.speed=Math.max(0,r.speed-dt*31)
    else if(input.throttle)r.speed=Math.min(Math.max(r.speed,max),r.speed+spec.acceleration*dt*(r.boost>0?1.65:1))
    else r.speed=Math.max(0,r.speed-5*dt)
    if(r.speed>max)r.speed=Math.max(max,r.speed-dt*(r.offroad?45:18))
    const turn=spec.steering*(r.drifting?1.12:1)*clamp(r.speed/16,0,1)/(1+Math.max(0,r.speed-35)*.012)
    // +Z is forward and the camera follows from behind: driver-right is -X.
    // Positive steering input must therefore decrease Three.js rotation.y.
    r.yaw=wrapAngle(r.yaw-r.steer*turn*dt)
    const grip=r.drifting?2.4:spec.grip
    const blend=1-Math.exp(-grip*dt)
    r.vx+=(Math.sin(r.yaw)*r.speed-r.vx)*blend;r.vz+=(Math.cos(r.yaw)*r.speed-r.vz)*blend
    r.x+=r.vx*dt;r.z+=r.vz*dt
    this.containRacer(r)
    const p=nearestTrack(r.x,r.z,r.trackIndex)
    r.trackIndex=p.index;r.offset=p.offset;r.offroad=Math.abs(p.offset)>ROAD_HALF_WIDTH+.15
    let ds=p.s-r.trackS;if(ds>TRACK_LENGTH/2)ds-=TRACK_LENGTH;if(ds<-TRACK_LENGTH/2)ds+=TRACK_LENGTH
    const prev=r.progress
    if(Math.abs(ds)<6)r.progress+=ds
    r.trackS=p.s
    const gate=(r.checks+1)*TRACK_LENGTH/CHECKS_PER_LAP
    if(prev<gate&&r.progress>=gate&&Math.abs(p.offset)<ROAD_HALF_WIDTH+2.1){
      r.checks++
      if(r.checks%CHECKS_PER_LAP===0){r.lapTimes.push(this.time-r.lapStart);r.lapStart=this.time;this.emit('lap',r.checks===24?'最后一圈，全力冲刺！':`第 ${r.checks/12} 圈完成`,r.id)}
      if(r.checks>=CHECKS_PER_LAP*LAP_COUNT)r.finishTime=this.time
    }
    const direction=Math.sin(r.yaw)*p.tx+Math.cos(r.yaw)*p.tz
    r.wrongWay=direction<-.25&&r.speed>4?r.wrongWay+dt:Math.max(0,r.wrongWay-dt*2)
    if(!r.item){for(const pickup of this.pickups){let gap=Math.abs(pickup.s-p.s);gap=Math.min(gap,TRACK_LENGTH-gap);if(pickup.cooldown<=0&&gap<2.2&&Math.abs(pickup.offset-p.offset)<2.1){
      const roll=this.random();r.item=roll<.4?'turbo':roll<.72?'shield':'pulse';pickup.cooldown=6;this.emit('pickup',`获得${ITEM_INFO[r.item].name} · E 使用`,r.id);break
    }}}
    if(r.padCooldown<=0&&[35,TRACK_LENGTH*.57].some(s=>Math.abs(p.s-s)<2.1)&&Math.abs(p.offset)<3){r.boost=Math.max(r.boost,.8);r.padCooldown=3}
  }
  containRacer(r:Racer){
    if(!resolveCarBarriers(r))return
    const p=nearestTrack(r.x,r.z,r.trackIndex);r.offset=p.offset;r.trackIndex=p.index;r.offroad=Math.abs(p.offset)>ROAD_HALF_WIDTH+.15
    if(r.hit<=0){r.speed*=r.shield>0?.92:.48;r.hit=.65;if(r.id===0)this.emit('hit',r.shield>0?'护盾抵挡碰撞':'擦碰护栏 · 松开转向或按 R 回正',r.id)}
  }
  collisions(){
    for(let i=0;i<this.racers.length;i++)for(let j=i+1;j<this.racers.length;j++){
      const a=this.racers[i],b=this.racers[j];if(a.finishTime!==null||b.finishTime!==null||a.recovery>0||b.recovery>0)continue
      const dx=a.x-b.x,dz=a.z-b.z,d=Math.hypot(dx,dz);if(d>=2.65||d<.001)continue
      const nx=dx/d,nz=dz/d,push=(2.65-d)*.51;a.x+=nx*push;a.z+=nz*push;b.x-=nx*push;b.z-=nz*push
      this.containRacer(a);this.containRacer(b)
      for(const racer of [a,b])if(racer.hit<=0){racer.speed*=racer.shield>0?.98:.86;racer.hit=.7;if(racer.id===0)this.emit('hit',racer.shield>0?'护盾保护中':'车身接触，稳住路线',0)}
    }
  }
}
const RECORD_KEY='form-space.racing-records.v1'
export function readRaceRecords():RaceRecord[]{try{const list:unknown=JSON.parse(localStorage.getItem(RECORD_KEY)||'[]');return Array.isArray(list)?list.filter((r):r is RaceRecord=>!!r&&CAR_SPECS.some(c=>c.id===r.car)&&['casual','sport'].includes(r.difficulty)&&Number.isFinite(r.time)&&r.time>0&&r.time<=240&&Number.isFinite(r.lap)&&r.lap>0&&r.lap<=r.time&&Number.isInteger(r.position)&&r.position>=1&&r.position<=6&&typeof r.date==='string').slice(0,18):[]}catch{return[]}}
export function saveRaceRecord(record:RaceRecord){try{const list=readRaceRecords().filter(r=>r.car!==record.car||r.difficulty!==record.difficulty);const existing=readRaceRecords().find(r=>r.car===record.car&&r.difficulty===record.difficulty);list.push(existing&&existing.time<record.time?existing:record);localStorage.setItem(RECORD_KEY,JSON.stringify(list))}catch{/* Gameplay works without storage. */}}
export function raceTime(seconds:number){const minutes=Math.floor(seconds/60),s=(seconds%60).toFixed(2).padStart(5,'0');return `${String(minutes).padStart(2,'0')}:${s}`}
