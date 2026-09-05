import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Camera, ChevronLeft, ChevronRight, CirclePause, Flag, Maximize, Minimize, Play, RotateCcw, Shield, Trophy, Volume2, VolumeX, Zap } from 'lucide-react'
import { CAR_SPECS, carSpec, isCarId } from '../racing/cars'
import type { CarId } from '../racing/cars'
import { RaceSimulation, emptyRaceInput, ITEM_INFO, raceTime, readRaceRecords, saveRaceRecord } from '../racing/race'
import type { RaceDifficulty, RaceInput } from '../racing/race'
import { RaceScene } from '../racing/RaceScene'
import { RaceAudio } from '../racing/RaceAudio'
import { MINIMAP_POINTS, minimapPoint, TRACK_LENGTH } from '../racing/track'
import '../racing/racing.css'
import { carBarrierClearance } from '../racing/barriers'

function preferences(){try{const p=JSON.parse(localStorage.getItem('form-space.racing-settings.v1')||'{}');return {car:isCarId(p.car)?p.car:'formula-r1' as CarId,difficulty:p.difficulty==='sport'?'sport' as const:'casual' as const,sound:p.sound!==false,auto:p.auto!==false}}catch{return {car:'formula-r1' as CarId,difficulty:'casual' as const,sound:true,auto:true}}}
function CircuitMap({race,preview=false}:{race:RaceSimulation;preview?:boolean}){
  return <svg className={preview?'race-map preview':'race-map'} viewBox="0 0 160 166" role="img" aria-label="海风环线赛道及车手位置"><polyline points={MINIMAP_POINTS} fill="none" stroke="currentColor" strokeWidth={preview?6:5} strokeLinecap="round" strokeLinejoin="round"/>{race.racers.map(r=>{const p=minimapPoint(r.x,r.z);return <circle key={r.id} cx={p.x} cy={p.y} r={r.id===0?4.4:2.5} fill={r.id===0?'#ff8060':'#f5f4e6'} stroke="#234b5c" strokeWidth="1.3"/>})}<text x="88" y="86" fill="currentColor" fontSize="7" letterSpacing="1.6">AZURE</text><text x="88" y="96" fill="currentColor" fontSize="5.5" letterSpacing=".6">954 M</text></svg>
}
export function RacingGame({back,viewModel,initialCar}:{back:()=>void;viewModel:(id:CarId)=>void;initialCar?:CarId}){
  const initial=useRef(preferences()),[race,setRace]=useState(()=>{const r=new RaceSimulation(initialCar||initial.current.car,initial.current.difficulty);r.autoThrottle=initial.current.auto;return r})
  const [,setTick]=useState(0),[ready,setReady]=useState(false),[sound,setSound]=useState(initial.current.sound),[fullscreen,setFullscreen]=useState(false),[runId,setRunId]=useState(0)
  const [records,setRecords]=useState(readRaceRecords),input=useRef<RaceInput>(emptyRaceInput()),keys=useRef(new Set<string>()),touch=useRef(new Map<number,string>()),field=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDivElement>(null),audio=useRef<RaceAudio|null>(null),saved=useRef(false)
  const spec=carSpec(race.car),player=race.player,groundSpeed=Math.hypot(player.vx,player.vz),status=race.status,active=status==='racing'||status==='countdown',finished=status==='finished'||status==='timeout',best=records.find(r=>r.car===race.car&&r.difficulty===race.difficulty)
  const syncInput=useCallback(()=>{const held=(...codes:string[])=>codes.some(code=>keys.current.has(code)||[...touch.current.values()].includes(code));input.current.steer=Number(held('ArrowRight','KeyD','right'))-Number(held('ArrowLeft','KeyA','left'));input.current.throttle=held('ArrowUp','KeyW','gas');input.current.brake=held('ArrowDown','KeyS','brake');input.current.drift=held('ShiftLeft','ShiftRight','drift')},[])
  const clearInput=useCallback(()=>{keys.current.clear();touch.current.clear();input.current=emptyRaceInput()},[])
  const initAudio=useCallback(()=>{if(!audio.current)audio.current=new RaceAudio();audio.current.setMuted(!sound);audio.current.init()},[sound])
  const refresh=useCallback(()=>{audio.current?.update(race);setTick(n=>n+1)},[race])
  const pause=useCallback(()=>{race.pause();clearInput();audio.current?.silence();refresh()},[race,clearInput,refresh])
  const resume=()=>{initAudio();race.resume();clearInput();refresh();field.current?.focus()}
  const resetRun=(car= race.car,difficulty:RaceDifficulty=race.difficulty)=>{audio.current?.silence();clearInput();const r=new RaceSimulation(car,difficulty);r.autoThrottle=race.autoThrottle;setReady(false);saved.current=false;setRunId(n=>n+1);setRace(r);if(audio.current){audio.current.lastEvent=0;audio.current.lastCount=4}}
  const start=()=>{if(!ready)return;initAudio();clearInput();race.start();refresh();field.current?.focus()}
  const toggleSound=()=>{const next=!sound;setSound(next);if(next){if(!audio.current)audio.current=new RaceAudio();audio.current.init()}audio.current?.setMuted(!next)}
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await field.current?.requestFullscreen()}catch{/* The game remains playable in the current viewport. */}}
  useEffect(()=>{try{localStorage.setItem('form-space.racing-settings.v1',JSON.stringify({car:race.car,difficulty:race.difficulty,sound,auto:race.autoThrottle}))}catch{}},[race,race.autoThrottle,sound])
  useEffect(()=>{
    const keydown=(e:KeyboardEvent)=>{
      if(['KeyP','Escape'].includes(e.code)&&(race.status==='racing'||race.status==='countdown'||race.status==='paused')){if(e.repeat)return;e.preventDefault();if(race.status==='paused'){audio.current?.init();race.resume();clearInput();refresh();field.current?.focus()}else pause();return}
      if(!['racing','countdown'].includes(race.status))return
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space','KeyE','KeyR','KeyC'].includes(e.code))e.preventDefault();else return
      keys.current.add(e.code);syncInput()
      if(!e.repeat){if(e.code==='Space')input.current.boost=true;if(e.code==='KeyE')input.current.item=true;if(e.code==='KeyR')input.current.reset=true;if(e.code==='KeyC'){race.cameraMode=1-race.cameraMode;refresh()}}
    }
    const keyup=(e:KeyboardEvent)=>{keys.current.delete(e.code);syncInput()}
    const blur=()=>{if(race.status==='racing'||race.status==='countdown')pause();else clearInput()}
    const visibility=()=>{if(document.hidden)blur()}
    const fs=()=>setFullscreen(!!document.fullscreenElement)
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);document.addEventListener('fullscreenchange',fs)
    return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('fullscreenchange',fs);clearInput()}
  },[race,pause,refresh,clearInput,syncInput])
  useEffect(()=>()=>audio.current?.dispose(),[])
  useEffect(()=>{
    if(status==='finished'&&!saved.current&&player.finishTime!==null){saved.current=true;saveRaceRecord({car:race.car,difficulty:race.difficulty,time:player.finishTime,lap:Math.min(...player.lapTimes),position:race.position,date:new Date().toISOString()});setRecords(readRaceRecords())}
    if(status==='paused'||finished){dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()}
  },[status,finished,player,race])
  const trap=(e:React.KeyboardEvent)=>{if(e.key!=='Tab'||!dialog.current)return;const buttons=[...dialog.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
  const hold=(action:string)=>(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch.current.set(e.pointerId,action);syncInput()}
  const release=(e:ReactPointerEvent<HTMLButtonElement>)=>{touch.current.delete(e.pointerId);syncInput()}
  const touchButton=(label:string,action:string,content:React.ReactNode)=><button aria-label={label} onPointerDown={hold(action)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} className={`race-touch-${action}`} disabled={!active}>{content}</button>
  const event=race.lastEvent,eventVisible=event&&race.time-event.time<2.6&&status==='racing'
  return <section className="racing-game">
    <div className="race-toolbar"><button className="back-button" onClick={back}><ArrowLeft size={16}/>游戏库</button><span>湛蓝大奖赛 <i>/</i> AZURE CIRCUIT</span><button className="race-model-link" onClick={()=>viewModel(race.car)}>查看赛车模型<ArrowRight size={14}/></button></div>
    <div ref={field} tabIndex={0} className={`race-field ${player.boost>0?'is-boosting':''} status-${status}`} aria-label="赛车赛道。方向键驾驶，Shift 漂移，空格氮气，E 道具，P 暂停。" data-status={status} data-ready={ready} data-car={race.car} data-difficulty={race.difficulty} data-player-x={player.x.toFixed(2)} data-player-z={player.z.toFixed(2)} data-yaw={player.yaw.toFixed(3)} data-speed={player.speed.toFixed(2)} data-steer={player.steer.toFixed(3)} data-progress={player.progress.toFixed(2)} data-offset={player.offset.toFixed(2)} data-lap={race.lap} data-checkpoints={player.checks} data-position={race.position} data-elapsed={race.time.toFixed(2)} data-nitro={player.nitro} data-drift={player.driftCharge.toFixed(2)} data-drift-awards={player.driftAwards} data-item={player.item||'none'} data-items-used={player.itemsUsed} data-boosts-used={player.boostsUsed} data-resets={player.resets} data-wall-clearance={carBarrierClearance(player).toFixed(3)} data-ground-speed={groundSpeed.toFixed(2)}>
      <RaceScene key={`${race.car}-${race.difficulty}-${runId}`} simulation={race} input={input} onHud={refresh} onReady={()=>setReady(true)}/>
      {!ready&&<div className="race-loading" role="status"><span/>正在准备赛车与赛道…</div>}
      {fullscreen&&<button className="race-exit-fullscreen" aria-label="退出全屏" onClick={toggleFullscreen}><Minimize size={17}/></button>}
      {status==='ready'&&<div className="race-setup">
        <div className="race-setup-copy"><span className="race-eyebrow"><span/> FORM / SPACE RACING CLUB</span><h1>湛蓝大奖赛<span>AZURE CIRCUIT</span></h1><p className="race-intro">把风，甩在身后。<br/>驾驶你的方程式赛车，向海岸线尽头冲刺。</p>
          <div className="race-garage-heading"><span>01 / 选择赛车</span><button onClick={()=>viewModel(race.car)}>查看完整模型<ArrowRight size={13}/></button></div>
          <div className="race-car-choices" role="group" aria-label="选择赛车">{CAR_SPECS.map(car=><button key={car.id} style={{'--car-color':car.color} as React.CSSProperties} aria-pressed={race.car===car.id} onClick={()=>resetRun(car.id)}><span className="race-car-number">{car.number}</span><strong>{car.name}</strong><small>{car.role}型</small></button>)}</div>
          <div className="race-specs">{['极速','加速','操控'].map((name,i)=><div key={name}><span>{name}</span><div><i style={{width:`${spec.bars[i]}%`}}/></div></div>)}</div>
          <div className="race-mode-heading">02 / 比赛设置</div>
          <div className="race-modes" role="group" aria-label="比赛难度"><button aria-pressed={race.difficulty==='casual'} onClick={()=>resetRun(race.car,'casual')}><strong>轻松巡航</strong><small>辅助转向 · 轻松上手</small></button><button aria-pressed={race.difficulty==='sport'} onClick={()=>resetRun(race.car,'sport')}><strong>竞速挑战</strong><small>自主转向 · 更强对手</small></button></div>
          <button className="race-auto" aria-pressed={race.autoThrottle} onClick={()=>{race.autoThrottle=!race.autoThrottle;refresh()}}><span className="race-switch"><i/></span>自动油门 <small>{race.autoThrottle?'已开启':'关闭 · 按 W / ↑ 加速'}</small></button>
          <button className="race-start" disabled={!ready} onClick={start}><Flag size={20}/><span>{ready?'驶向发车线':'准备赛道中…'}</span><ArrowRight size={21}/></button>
          <div className="race-setup-keys"><span><kbd>← →</kbd> 转向</span><span><kbd>SHIFT</kbd> 漂移</span><span><kbd>SPACE</kbd> 氮气</span><span><kbd>E</kbd> 道具</span></div>
        </div>
        <div className="race-track-preview"><span className="race-eyebrow">COASTAL GRAND PRIX / 01</span><CircuitMap race={race} preview/><h2>海风环线</h2><p><span>{Math.round(TRACK_LENGTH)} m</span><span>3 圈</span><span>6 位车手</span></p><small>单人 · AI 竞速 · 约 2 分钟</small>{best&&<div className="race-personal-best"><Trophy size={14}/> 本车最佳 {raceTime(best.time)}</div>}</div>
      </div>}
      {status!=='ready'&&<div className="race-hud">
        <div className="race-position"><small>POSITION</small><div><strong>{String(race.position).padStart(2,'0')}</strong><span>/ 06</span></div><div className="race-rivals">{race.standings().slice(0,3).map((r,i)=><span key={r.id} className={r.id===0?'is-player':''}><i>{i+1}</i>{r.name}<b style={{background:carSpec(r.car).color}}/></span>)}</div></div>
        <div className="race-lap"><small>LAP</small><strong>{race.lap}<span> / 3</span></strong><time>{raceTime(race.time)}</time></div>
        <div className="race-top-right"><div className="race-action-row"><button aria-label={sound?'关闭赛车声音':'开启赛车声音'} aria-pressed={sound} onClick={toggleSound}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button aria-label="切换赛车镜头" onClick={()=>{race.cameraMode=1-race.cameraMode;refresh()}}><Camera size={18}/></button><button aria-label="全屏比赛" onClick={toggleFullscreen}><Maximize size={17}/></button><button aria-label="暂停比赛" disabled={!active} onClick={pause}><CirclePause size={22}/></button></div><CircuitMap race={race}/></div>
        <div className="race-speed"><svg viewBox="0 0 134 88" aria-hidden="true"><path d="M15 75 A54 54 0 1 1 119 75" fill="none" stroke="#e5f1e74d" strokeWidth="4"/><path d="M15 75 A54 54 0 1 1 119 75" fill="none" stroke={player.boost>0?'#75edf5':'#f1f4de'} strokeWidth="4" pathLength="100" strokeDasharray={`${Math.min(100,groundSpeed/62*100)} 100`}/></svg><strong>{Math.round(groundSpeed*3.6).toString().padStart(3,'0')}</strong><small>KM/H <span>{player.boost>0?'BOOST':`D${Math.max(1,Math.min(7,Math.ceil(player.speed/7)))}`}</span></small></div>
        <div className={`race-drift-meter ${player.drifting?'charging':''} ${player.driftCharge>=1?'charged':''}`}><div><span>{player.driftCharge>=1?'松开漂移，收取氮气':player.drifting?'漂移集氮':'NITRO SYSTEM'}</span><strong>{player.drifting?`${Math.floor(Math.min(1,player.driftCharge)*100)}%`:`${player.nitro} / 3`}</strong></div><div className="race-charge-track"><i style={{width:`${Math.min(1,player.driftCharge)*100}%`}}/></div><button aria-label={`使用氮气，剩余 ${player.nitro} 次`} disabled={!active||!player.nitro||player.boost>0} onClick={()=>input.current.boost=true}><Zap size={18}/><span>氮气推进</span><div className="race-nitro-slots">{[0,1,2].map(i=><i key={i} className={i<player.nitro?'filled':''}/>)}</div><kbd>SPACE</kbd></button></div>
        <button className={`race-item ${player.item?'has-item':''}`} aria-label={player.item?`使用${ITEM_INFO[player.item].name}`:'暂无道具'} disabled={!active||!player.item} onClick={()=>input.current.item=true} style={{'--item-color':player.item?ITEM_INFO[player.item].color:'#dfecde'} as React.CSSProperties}><span className="race-item-symbol">{player.item?ITEM_INFO[player.item].symbol:'?'}</span><span><strong>{player.item?ITEM_INFO[player.item].name:'驶过补给，拾取道具'}</strong><small>{player.item?ITEM_INFO[player.item].description:'赛道上的彩色菱形是补给'}</small></span><kbd>E</kbd></button>
        {player.wrongWay>1.5&&<div className="race-wrong-way">逆向行驶 <small>按 R 回到赛道</small></div>}
        {eventVisible&&<div key={event.seq} className={`race-event event-${event.kind} ${player.wrongWay>1.5?'below-warning':''}`} role="status">{event.text}</div>}
        <div className="race-touch-controls"><div>{touchButton('向左转向','left',<ChevronLeft size={28}/>)}{touchButton('向右转向','right',<ChevronRight size={28}/>)}</div><div>{!race.autoThrottle&&touchButton('踩油门','gas','油门')}{touchButton('刹车','brake','刹车')}{touchButton('按住漂移','drift','漂移')}</div></div>
        <div className="race-bottom-help">{race.difficulty==='casual'?'辅助转向已开启':'方向键驾驶'}<span>·</span>Shift 漂移<span>·</span>R 回正<span>·</span>P 暂停</div>
      </div>}
      {status==='countdown'&&<div className="race-countdown" aria-live="polite"><div>{[0,1,2,3,4].map(i=><i key={i} className={5-Math.ceil(race.countdown)*1.5>i?'lit':''}/>)}</div><strong>{Math.max(1,Math.ceil(race.countdown))}</strong><span>引擎就绪 · 准备发车</span></div>}
      {status==='paused'&&<div className="race-modal"><div ref={dialog} className="race-dialog" role="dialog" aria-modal="true" aria-labelledby="race-pause-title" onKeyDown={trap}><span className="race-eyebrow">TAKE A BREATH</span><h2 id="race-pause-title">稍停一站。</h2><p>赛道会等你，计时已经暂停。</p><button className="race-start" onClick={resume}><Play size={18}/>继续比赛<ArrowRight size={18}/></button><div className="race-dialog-actions"><button onClick={()=>resetRun()}><RotateCcw size={16}/>重新发车</button><button onClick={back}>返回游戏库</button></div><div className="race-pause-settings"><button aria-pressed={sound} onClick={toggleSound}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}音效{sound?'开启':'关闭'}</button><button onClick={()=>{race.cameraMode=1-race.cameraMode;refresh()}}><Camera size={17}/>{race.cameraMode?'远景镜头':'追尾镜头'}</button></div><div className="race-control-guide"><span>W / ↑ 油门 · S / ↓ 刹车</span><span>A D / ← → 转向 · Shift 漂移</span><span>Space 氮气 · E 道具 · R 回正</span><small>持续过弯漂移蓄满后松开，可获得 1 次氮气。手机可同时按住转向与漂移。</small></div></div></div>}
      {finished&&<div className="race-modal race-result-overlay"><div ref={dialog} className="race-dialog race-result" role="dialog" aria-modal="true" aria-labelledby="race-result-title" onKeyDown={trap}><span className="race-eyebrow">THE CHECKERED FLAG</span><div className="race-result-medal"><Trophy size={26}/><strong>{status==='finished'?String(race.position).padStart(2,'0'):'—'}</strong><span>{status==='finished'?`/ 06 · ${race.position===1?'冠军':race.position<=3?'登上领奖台':'完赛'}`:'练习结束'}</span></div><h2 id="race-result-title">{status==='timeout'?'下一次，会更快。':race.position===1?'海岸线，为你欢呼。':'每一个弯，都算数。'}</h2><p>{spec.name} · 海风环线 · {race.difficulty==='casual'?'轻松巡航':'竞速挑战'}</p><div className="race-result-stats"><div><small>完赛用时</small><strong>{status==='finished'?raceTime(player.finishTime!):'未完赛'}</strong></div><div><small>最快单圈</small><strong>{player.lapTimes.length?raceTime(Math.min(...player.lapTimes)):'—'}</strong></div><div><small>氮气 / 道具</small><strong>{player.boostsUsed} <span>/</span> {player.itemsUsed}</strong></div></div><div className="race-lap-results">{[0,1,2].map(i=><span key={i}>LAP 0{i+1}<strong>{player.lapTimes[i]?raceTime(player.lapTimes[i]):'—'}</strong></span>)}</div>{status==='finished'&&<small className="race-saved">有效完赛成绩已保存在当前浏览器</small>}<button className="race-start" onClick={()=>resetRun()}><RotateCcw size={18}/>再跑一场<ArrowRight size={18}/></button><div className="race-dialog-actions"><button onClick={()=>resetRun(race.car==='formula-r1'?'formula-r2':'formula-r1')}>换一辆赛车</button><button onClick={back}>返回游戏库</button></div></div></div>}
    </div>
  </section>
}
