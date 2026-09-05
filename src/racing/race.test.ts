import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RaceSimulation, emptyRaceInput } from './race.ts'
import { TRACK_LENGTH, ROAD_HALF_WIDTH, trackAt, nearestTrack } from './track.ts'
import { CAR_SPECS } from './cars.ts'
import { Box3, PerspectiveCamera, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BARRIER_INNER, CAR_FOOTPRINT, carBarrierClearance, resolveCarBarriers } from './barriers.ts'

function started(){const race=new RaceSimulation('formula-r2','sport');race.autoThrottle=false;race.status='racing';return race}
function place(race:RaceSimulation,s:number,offset=0){const r=race.player,p=trackAt(s,offset);Object.assign(r,{x:p.x,z:p.z,yaw:Math.atan2(p.tx,p.tz),progress:s,trackS:p.s,trackIndex:p.index,offset,vx:0,vz:0,speed:0});return r}
function advance(race:RaceSimulation,seconds:number,input=emptyRaceInput()){for(let i=0;i<seconds*120;i++)race.advance(1/120,input)}

test('countdown gates movement, pause freezes the world, and frame gaps are bounded',()=>{
  const race=new RaceSimulation();const x=race.player.x;race.start();advance(race,2);assert.equal(race.status,'countdown');assert.equal(race.time,0);assert.equal(race.player.x,x)
  race.pause();const state=JSON.stringify(race.racers);advance(race,1);assert.equal(JSON.stringify(race.racers),state);race.resume();advance(race,1.1);assert.equal(race.status,'racing')
  const time=race.time;race.advance(10,emptyRaceInput());assert(race.time-time<=1/15+.000001)
})
test('manual throttle, braking and independent steering change real vehicle motion',()=>{
  const race=started();place(race,20);advance(race,.5);assert.equal(race.player.speed,0)
  advance(race,1,{...emptyRaceInput(),throttle:true});assert(race.player.speed>18);const speed=race.player.speed,yaw=race.player.yaw,x=race.player.x
  advance(race,.3,{...emptyRaceInput(),steer:1,throttle:true});assert(race.player.yaw<yaw);assert(race.player.x<x)
  advance(race,.8,{...emptyRaceInput(),brake:true});assert(race.player.speed<speed*.5)
})
test('left and right steering match the chase-camera view in every heading',()=>{
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const projected:number[]=[]
    for(const steer of [-1,0,1]){
      const race=started(),r=place(race,30),origin=new Vector3(r.x,.2,r.z),forward=new Vector3(Math.sin(heading),0,Math.cos(heading))
      r.yaw=heading;r.speed=24;r.vx=forward.x*24;r.vz=forward.z*24
      const camera=new PerspectiveCamera(61,16/9,.15,850)
      camera.position.copy(origin).addScaledVector(forward,-12.7);camera.position.y=6.8
      camera.lookAt(origin.clone().addScaledVector(forward,8));camera.updateMatrixWorld()
      for(let frame=0;frame<36;frame++)race.drive(r,{...emptyRaceInput(),steer,throttle:true},1/120)
      projected.push(new Vector3(r.x,.2,r.z).project(camera).x)
    }
    assert(projected[0]<projected[1]-.005,'Left input must move toward the left of the screen')
    assert(projected[2]>projected[1]+.005,'Right input must move toward the right of the screen')
  }
})
test('track interpolation closes seamlessly and gives a consistent lateral road position',()=>{
  const a=trackAt(17,3.2),b=trackAt(TRACK_LENGTH+17,3.2);assert(Math.hypot(a.x-b.x,a.z-b.z)<1e-8)
  const nearest=nearestTrack(a.x,a.z);assert(Math.abs(nearest.offset-3.2)<.08);assert(Math.abs(nearest.s-17)<.1)
})
test('grass and barriers slow a car, and recovery does not award checkpoint progress',()=>{
  const race=started(),r=place(race,45,ROAD_HALF_WIDTH+2.9);r.speed=36;r.vx=Math.sin(r.yaw)*36;r.vz=Math.cos(r.yaw)*36
  race.advance(1/60,{...emptyRaceInput(),throttle:true});assert(r.offroad);assert(r.speed<25)
  const progress=r.progress,checks=r.checks;race.resetRacer(r);assert.equal(r.progress,progress);assert.equal(r.checks,checks);assert.equal(r.offset,0);assert(r.recovery>0);assert.equal(r.speed,0)
})
test('laps require ordered checkpoints, forward crossing and all three complete laps',()=>{
  const race=started(),r=place(race,TRACK_LENGTH-.4);r.checks=11;r.speed=25;r.vx=Math.sin(r.yaw)*25;r.vz=Math.cos(r.yaw)*25
  race.advance(1/30,{...emptyRaceInput(),throttle:true});assert.equal(r.checks,12);assert.equal(r.lapTimes.length,1);assert.equal(r.finishTime,null)
  place(race,TRACK_LENGTH-.4);r.checks=0;r.speed=25;r.vx=Math.sin(r.yaw)*25;r.vz=Math.cos(r.yaw)*25;race.advance(1/30,{...emptyRaceInput(),throttle:true});assert.equal(r.checks,0,'Skipping earlier gates must not award a lap')
  place(race,TRACK_LENGTH+.4);r.checks=12;r.yaw+=Math.PI;r.speed=25;r.vx=Math.sin(r.yaw)*25;r.vz=Math.cos(r.yaw)*25;race.advance(1/30,{...emptyRaceInput(),throttle:true});assert.equal(r.checks,12,'Reverse crossing cannot add a lap')
})
test('nitro consumes finite stock once and actions are blocked during pause',()=>{
  const race=started(),r=race.player;race.activateBoost(r);assert.equal(r.nitro,0);assert.equal(r.boostsUsed,1);race.activateBoost(r);assert.equal(r.boostsUsed,1)
  r.item='turbo';race.pause();race.useItem(r);race.resetRacer(r);assert.equal(r.item,'turbo');assert.equal(r.resets,0);assert.equal(r.nitro,0)
})
test('physical pickup contact fills one slot; items are consumed and stocks stay capped',()=>{
  const race=started(),box=race.pickups[0],r=place(race,box.s,box.offset);race.drive(r,emptyRaceInput(),1/120);assert(r.item);assert(box.cooldown>0)
  r.nitro=3;r.item='turbo';race.useItem(r);assert.equal(r.nitro,3);assert.equal(r.item,null);assert(r.boost>0)
  r.item='shield';race.useItem(r);assert.equal(r.shield,8);assert.equal(r.item,null)
})
test('pulse targets only an opponent ahead in range and respects active shields',()=>{
  const race=started(),r=place(race,100),target=race.racers[1];for(const other of race.racers.slice(1))other.progress=0
  target.progress=110;target.speed=30;target.shield=2;r.item='pulse';race.useItem(r);assert.equal(target.slow,0)
  target.shield=0;r.item='pulse';race.useItem(r);assert(target.slow>2);assert(target.speed<20)
  target.progress=180;target.slow=0;r.item='pulse';race.useItem(r);assert.equal(target.slow,0)
})
test('stationary or straight-line drift cannot farm nitro; a driven lap can earn it',()=>{
  const idle=started();idle.player.nitro=0;advance(idle,3,{...emptyRaceInput(),drift:true,steer:1});assert.equal(idle.player.driftAwards,0)
  const straight=started();place(straight,5);straight.player.nitro=0;advance(straight,1.5,{...emptyRaceInput(),throttle:true,drift:true});assert.equal(straight.player.driftAwards,0)
  const race=new RaceSimulation('formula-r2','casual');race.start()
  for(let i=0;i<60*48;i++){const input=race.aiInput(race.player,true);input.drift=Math.abs(input.steer)>.18&&race.player.speed>19&&race.player.driftCharge<1.01;input.boost=Math.abs(input.steer)<.18&&race.player.speed>28;race.advance(1/60,input)}
  assert(race.player.driftAwards>=1);assert(race.player.nitro<=3);assert(race.player.lapTimes.length>=1)
})
test('all exported cars contain visible meshes, four independent wheel pivots and no external resources',()=>{
  for(const car of CAR_SPECS){const data=readFileSync(new URL(`../../public/models/${car.id}.glb`,import.meta.url));assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.byteLength);const length=data.readUInt32LE(12),gltf=JSON.parse(data.subarray(20,20+length).toString());assert(gltf.meshes.length>=8);assert.equal(gltf.nodes.filter((n:{name?:string})=>n.name?.startsWith('wheel-')).length,4);assert(gltf.buffers.every((b:{uri?:string})=>!b.uri));assert(!gltf.images?.length);assert(data.byteLength<900_000)}
})

test('the collision hull contains all three actual GLBs at full wheel steer and body roll',async()=>{
  for(const car of CAR_SPECS){
    const bytes=readFileSync(new URL(`../../public/models/${car.id}.glb`,import.meta.url))
    const {scene}=await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer,'')
    for(const steer of [-.34,0,.34])for(const roll of [-.05,0,.05]){
      scene.traverse(node=>{if(node.name.startsWith('wheel-front'))node.rotation.y=steer});scene.rotation.z=roll
      const bounds=new Box3().setFromObject(scene)
      assert(bounds.min.x>=-CAR_FOOTPRINT.halfWidth&&bounds.max.x<=CAR_FOOTPRINT.halfWidth)
      assert(bounds.min.z>=-CAR_FOOTPRINT.rear&&bounds.max.z<=CAR_FOOTPRINT.front)
    }
  }
})

test('front, rear and sideways wall contacts contain the whole hull around both sides of the circuit',()=>{
  for(let s=0;s<TRACK_LENGTH;s+=6)for(const side of [-1,1])for(const angle of [0,.4,.9,Math.PI/2,2.2,Math.PI]){
    const race=started(),r=place(race,s,side*(BARRIER_INNER-.1));r.yaw+=angle
    assert(resolveCarBarriers(r));const clearance=carBarrierClearance(r)
    assert(clearance>=-.015,`Hull outside wall at ${s}, side ${side}, angle ${angle}: ${clearance}`)
    assert.equal(r.progress,s);assert.equal(r.checks,0)
  }
})

test('boosted and drifting cars cannot tunnel through walls at low frame rates or with a shield',()=>{
  for(const s of [32,185,340,455,615,820,TRACK_LENGTH-2])for(const side of [-1,1])for(const shield of [0,8]){
    const race=started(),r=place(race,s,side*6);r.yaw+=side*Math.PI*.35;r.speed=63.48;r.boost=4;r.shield=shield
    r.vx=Math.sin(r.yaw)*r.speed;r.vz=Math.cos(r.yaw)*r.speed
    for(let frame=0;frame<24;frame++){
      race.advance(1/15,{...emptyRaceInput(),throttle:true,drift:true,steer:Math.sin(frame*.2)*.5})
      assert(carBarrierClearance(r)>=-.015,`Boost crossed a wall at ${s} / ${side} / ${shield}`)
    }
  }
})

test('opponent pile-ups cannot push a car through either wall',()=>{
  for(const side of [-1,1]){
    const race=started()
    race.racers.forEach((r,i)=>{const p=trackAt(50+i*.1,side*(9.5-i*.45));Object.assign(r,{x:p.x,z:p.z,yaw:Math.atan2(p.tx,p.tz),trackIndex:p.index,progress:50+i*.1});race.containRacer(r)})
    for(let frame=0;frame<12;frame++){
      race.collisions()
      for(const r of race.racers)assert(carBarrierClearance(r)>=-.015,'Opponent contact pushed a hull outside')
    }
  }
})
