import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Crosshair, Focus, Maximize2, Minimize2, Music2, Pause, Play, Radar, RotateCcw, Sparkles, Trophy, Volume2, VolumeX, Waves } from 'lucide-react'
import { BOSS_ARRIVAL, FlightSimulation, SECTORS, WEAPONS } from '../game/simulation'
import type { CombatEvent, Difficulty, FlightInput, Weapon } from '../game/simulation'
import { FlightCanvas } from '../game/FlightScene'
import { CombatAudio } from '../game/audio'
import '../game/combat.css'

const RECORD_KEY = 'form-space.starflight.records.v2'
const PREFS_KEY = 'form-space.starflight.preferences.v2'
interface FlightRecord { score: number; kills: number; won: boolean; difficulty: Difficulty; date: string }
function readRecords(): FlightRecord[] {
  try { const raw: unknown = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]'); return Array.isArray(raw) ? raw.filter(r => r && Number.isFinite(r.score) && r.score >= 0 && Number.isFinite(r.kills) && typeof r.won === 'boolean' && ['normal','rookie'].includes(r.difficulty) && typeof r.date === 'string').slice(0,5) : [] } catch { return [] }
}
function readPreferences() {
  try { const p = JSON.parse(localStorage.getItem(PREFS_KEY)||'{}'); return { sound:p.sound!==false, music:p.music!==false, auto:p.auto!==false, difficulty:p.difficulty==='rookie'?'rookie' as const:'normal' as const } } catch { return { sound:true,music:true,auto:true,difficulty:'normal' as const } }
}
const formatTime = (time:number) => `${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')}`

export function FlightGame({back,viewModel}:{back:()=>void;viewModel:()=>void}) {
  const [preferences] = useState(readPreferences)
  const [simulation] = useState(()=>{const s=new FlightSimulation();s.autoFire=preferences.auto;return s})
  const [snapshot,setSnapshot] = useState(()=>simulation.snapshot())
  const [audio] = useState(()=>new CombatAudio())
  const [sound,setSound] = useState(preferences.sound), [music,setMusic] = useState(preferences.music), [difficulty,setDifficulty] = useState<Difficulty>(preferences.difficulty)
  const [records,setRecords] = useState(readRecords), [fullscreen,setFullscreen] = useState(false)
  const [reducedMotion] = useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const input=useRef<FlightInput>({x:0,y:0}), keys=useRef(new Set<string>()), pointerFire=useRef(false)
  const field=useRef<HTMLDivElement>(null), cabinet=useRef<HTMLDivElement>(null), dialog=useRef<HTMLElement>(null), saved=useRef(false)
  const drag=useRef<{id:number;px:number;py:number;x:number;y:number}|null>(null)
  const publish=useCallback(()=>setSnapshot(simulation.snapshot()),[simulation])
  const clearInput=useCallback(()=>{keys.current.clear();pointerFire.current=false;drag.current=null;input.current={x:0,y:0}},[])
  const focusField=()=>field.current?.focus({preventScroll:true})
  const syncInput=useCallback(()=>{
    const held=keys.current
    input.current={...input.current,x:Number(held.has('ArrowRight')||held.has('KeyD'))-Number(held.has('ArrowLeft')||held.has('KeyA')),y:Number(held.has('ArrowUp')||held.has('KeyW'))-Number(held.has('ArrowDown')||held.has('KeyS')),fire:held.has('Space')||held.has('KeyJ')||pointerFire.current,focus:held.has('ShiftLeft')||held.has('ShiftRight')}
  },[])
  const start=()=>{clearInput();saved.current=false;simulation.start(difficulty);publish();audio.enabled=sound;audio.music=music;audio.setActive(true);void audio.unlock();focusField()}
  const pause=useCallback(()=>{simulation.pause();clearInput();audio.setActive(false);publish()},[simulation,clearInput,audio,publish])
  const resume=()=>{clearInput();simulation.resume();publish();audio.setActive(true);void audio.unlock();focusField()}
  const useBomb=useCallback(()=>{if(simulation.bomb())publish()},[simulation,publish])
  const toggleFire=useCallback(()=>{simulation.toggleAutoFire();publish()},[simulation,publish])
  const onEvents=useCallback((events:CombatEvent[])=>audio.update(simulation,events),[audio,simulation])
  const onPerformance=useCallback((fps:number,draws:number)=>{if(field.current){field.current.dataset.fps=String(fps);field.current.dataset.drawCalls=String(draws);field.current.dataset.rendered='true'}},[])
  useEffect(()=>{audio.setEnabled(sound);audio.music=music;try{localStorage.setItem(PREFS_KEY,JSON.stringify({sound,music,auto:snapshot.autoFire,difficulty}))}catch{}},[audio,sound,music,snapshot.autoFire,difficulty])
  useEffect(()=>()=>{audio.dispose()},[audio])
  useEffect(()=>{
    if(!['paused','lost','won'].includes(snapshot.status))return
    const frame=requestAnimationFrame(()=>dialog.current?.querySelector<HTMLButtonElement>('.combat-primary')?.focus({preventScroll:true}))
    return()=>cancelAnimationFrame(frame)
  },[snapshot.status])
  useEffect(()=>{
    const movement=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD']
    const down=(event:KeyboardEvent)=>{
      if(event.code==='Tab'&&dialog.current&&['paused','lost','won'].includes(simulation.status)){
        const buttons=Array.from(dialog.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));const first=buttons[0],last=buttons[buttons.length-1]
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }
      if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement)return
      if((event.code==='Space'||event.code==='Enter')&&event.target instanceof HTMLButtonElement)return
      const active=simulation.status==='playing'
      if(active&&(movement.includes(event.code)||['Space','KeyJ','ShiftLeft','ShiftRight'].includes(event.code))){event.preventDefault();keys.current.add(event.code);syncInput();if(movement.includes(event.code)&&!event.repeat)input.current.tap={x:input.current.x,y:input.current.y,remaining:.085}}
      if(!event.repeat&&['KeyP','Escape'].includes(event.code)&&(active||simulation.status==='paused')){event.preventDefault();simulation.togglePause();clearInput();audio.setActive(simulation.status==='playing');publish();if(simulation.status==='playing')field.current?.focus({preventScroll:true})}
      if(active&&!event.repeat&&['KeyX','KeyB'].includes(event.code)){event.preventDefault();useBomb()}
      if(active&&!event.repeat&&event.code==='KeyF'){event.preventDefault();toggleFire()}
    }
    const up=(event:KeyboardEvent)=>{keys.current.delete(event.code);syncInput()}
    const hidden=()=>{if(document.hidden)pause()}
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',pause);document.addEventListener('visibilitychange',hidden)
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',hidden);clearInput()}
  },[simulation,clearInput,syncInput,pause,publish,audio,toggleFire,useBomb])
  useEffect(()=>{
    if(!['won','lost'].includes(snapshot.status)||saved.current)return
    saved.current=true;clearInput()
    const record:FlightRecord={score:snapshot.score,kills:snapshot.kills,won:snapshot.status==='won',difficulty:snapshot.difficulty,date:new Date().toISOString()}
    setRecords(current=>{const next=[...current,record].sort((a,b)=>b.score-a.score).slice(0,5);try{localStorage.setItem(RECORD_KEY,JSON.stringify(next))}catch{}return next})
  },[snapshot,clearInput])
  useEffect(()=>{const changed=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed)},[])
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await cabinet.current?.requestFullscreen()}catch{/* Embedded hosts may disable the optional Fullscreen API. */}}
  const pointerDown=(event:PointerEvent<HTMLDivElement>)=>{
    if(simulation.status!=='playing'||(event.target as HTMLElement).closest('button'))return
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);focusField();pointerFire.current=true;syncInput();drag.current={id:event.pointerId,px:event.clientX,py:event.clientY,x:simulation.x,y:simulation.y}
  }
  const pointerMove=(event:PointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d||d.id!==event.pointerId||!field.current)return;const rect=field.current.getBoundingClientRect();input.current.target={x:d.x+(event.clientX-d.px)/rect.width*13,y:d.y-(event.clientY-d.py)/rect.height*18}}
  const pointerUp=(event:PointerEvent<HTMLDivElement>)=>{if(drag.current?.id!==event.pointerId)return;drag.current=null;pointerFire.current=false;input.current.target=undefined;syncInput()}
  const status=snapshot.status,finished=status==='won'||status==='lost',weapon=WEAPONS[snapshot.weapon],sector=SECTORS[snapshot.sector]
  const best=records[0]?.score??0,progress=Math.min(1,snapshot.elapsed/BOSS_ARRIVAL)
  const rank=status==='won'?(snapshot.shields>=3&&snapshot.maxCombo>=16?'S':snapshot.shields>=2?'A':'B'):snapshot.kills>=30?'C':'D'
  return <div className="combat-page">
    <div className="combat-heading"><button className="combat-back" onClick={back}><ArrowLeft size={15}/>游戏库</button><span>星际穿行 <i>/</i> STARFLIGHT</span><div><button aria-label={sound?'关闭声音':'开启声音'} aria-pressed={sound} onClick={()=>setSound(!sound)}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><button className={!music?'is-muted':''} aria-label={music?'关闭背景音乐':'开启背景音乐'} aria-pressed={music} onClick={()=>setMusic(!music)}><Music2 size={17}/></button>{document.fullscreenEnabled&&<button aria-label={fullscreen?'退出全屏':'全屏游玩'} onClick={()=>void toggleFullscreen()}><Maximize2 size={16}/></button>}</div></div>
    <div className={`combat-cabinet ${fullscreen?'is-fullscreen':''}`} ref={cabinet}>
      <aside className="combat-side combat-mission">
        <span className="combat-eyebrow"><span className="signal-dot"/> FLIGHT CONTROL</span>
        <h2>穿越火线，<br/>抵达暗面。</h2><p className="mission-description">从静海启航。<br/>你的每一次出击，都有回响。</p>
        <div className="combat-route-list">{SECTORS.map((s,i)=><div className={`${snapshot.sector===i?'is-current':''} ${snapshot.sector>i?'is-cleared':''}`} key={s.code}><span>{snapshot.sector>i?<Check size={13}/>:s.code}</span><div><strong>{s.name}</strong><small>{i===2?'FINAL SECTOR':s.english}</small></div>{snapshot.sector===i&&<ChevronRight size={13}/>}</div>)}</div>
        <div className="combat-current-weapon" style={{'--weapon-color':weapon.color} as CSSProperties}><div className="weapon-label"><Crosshair size={13}/><span>当前武装</span><b>LV.{snapshot.level}</b></div><div className="equipped-weapon"><span>{weapon.letter}</span><div><strong>{weapon.name}</strong><small>{weapon.english}</small></div></div><div className="weapon-level" aria-label={`武器等级 ${snapshot.level}，最高 3 级`}>{[1,2,3].map(l=><i key={l} className={l<=snapshot.level?'filled':''}/>)}</div><p>{weapon.description}</p></div>
        <div className="combat-flight-status"><Radar size={34} strokeWidth={1}/><div><span>EXPLORER 01</span><strong>{status==='ready'?'等待出击':status==='paused'?'通讯待机':status==='won'?'航道已清空':status==='lost'?'信号中断':snapshot.boss?'母舰交战中':'编队拦截中'}</strong></div><i className={status==='playing'?'live':''}/></div>
        <button className="combat-model-link" onClick={viewModel}>查看探索者模型<ArrowUpRight size={12}/></button>
      </aside>
      <div className={`combat-field combat-sector-${snapshot.sector} ${status==='ready'?'is-ready':''} ${snapshot.shields<=2&&status==='playing'?'low-shield':''}`} ref={field} tabIndex={0} aria-label="星际穿行战斗区。方向键或 WASD 移动，空格射击，X 冲击波，P 暂停。触屏拖动移动。" data-status={status} data-player-x={snapshot.x.toFixed(2)} data-player-y={snapshot.y.toFixed(2)} data-weapon={snapshot.weapon} data-level={snapshot.level} data-kills={snapshot.kills} data-enemies={snapshot.enemies} data-shots={snapshot.shots} data-elapsed={snapshot.elapsed.toFixed(1)} data-boss-phase={snapshot.boss?.phase??0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp}>
        <div className="combat-background" aria-hidden="true"/><div className="combat-nebula-tint" aria-hidden="true"/>
        <div className="combat-canvas"><FlightCanvas simulation={simulation} input={input} onSnapshot={setSnapshot} onEvents={onEvents} reducedMotion={reducedMotion} onPerformance={onPerformance}/></div>
        <div className="combat-vignette" aria-hidden="true"/>{fullscreen&&<button className="combat-fullscreen-exit" aria-label="退出全屏" onClick={()=>void toggleFullscreen()}><Minimize2 size={16}/></button>}
        <div className="combat-hud"><div className="combat-score"><span>SCORE</span><strong>{String(snapshot.score).padStart(6,'0')}</strong></div><div className="combat-hud-right"><div className={`combat-shields ${snapshot.shields<=2?'is-low':''}`} aria-label={`剩余护盾 ${status==='ready'?(difficulty==='rookie'?7:5):snapshot.shields} 格`}><span>SHIELD</span><div>{Array.from({length:status==='ready'?(difficulty==='rookie'?7:5):snapshot.maxShields},(_,i)=><i className={i<(status==='ready'?(difficulty==='rookie'?7:5):snapshot.shields)?'filled':''} key={i}/>)}</div></div><button aria-label="暂停游戏" disabled={status!=='playing'} onClick={pause}><Pause size={17}/></button></div></div>
        {snapshot.combo>=2&&status==='playing'&&<div className="combat-combo"><b>×{snapshot.multiplier}</b><span>{snapshot.combo} CHAIN</span><i style={{width:`${snapshot.comboTime/3.8*100}%`}}/></div>}
        {snapshot.boss&&status==='playing'&&<div className="combat-boss-bar"><div><span>厄瑞玻斯 <small>EREBUS</small></span><b>PHASE 0{snapshot.boss.phase}</b></div><div className="boss-health-track" role="progressbar" aria-label="母舰剩余装甲" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.ceil(snapshot.boss.hp/snapshot.boss.maxHp*100)}><i style={{width:`${Math.max(0,snapshot.boss.hp/snapshot.boss.maxHp)*100}%`}}/>{[1,2].map(i=><b key={i} style={{left:`${i*33.33}%`}}/>)}</div></div>}
        {status==='playing'&&snapshot.banner>0&&!snapshot.boss&&<div className="combat-sector-banner" key={snapshot.sector}><span>SECTOR {sector.code}</span><h2>{sector.name}</h2><p>{sector.subtitle}</p></div>}
        {status==='playing'&&snapshot.warning>0&&<div className="combat-warning"><span/><div><small>WARNING / CAPITAL SHIP</small><strong>母舰接近</strong><p>厄瑞玻斯 · 重型星际母舰</p></div><span/></div>}
        {snapshot.noticeTime>0&&status==='playing'&&<div className="combat-pickup-notice" role="status" style={{color:weapon.color}}><Sparkles size={14}/>{snapshot.notice}</div>}
        {snapshot.victoryTime>0&&status==='playing'&&<div className="combat-sector-banner"><span>THREAT ELIMINATED</span><h2>航道已清空</h2><p>探索者 01，欢迎回家。</p></div>}
        {status==='playing'&&snapshot.elapsed<8&&snapshot.banner<=0&&<div className="combat-first-hint"><Focus size={13}/>拖动或按方向键移动 · 拾取发光补给</div>}
        <div className="combat-bottom-hud"><button className={`combat-fire-toggle ${snapshot.autoFire?'is-on':''}`} disabled={status!=='playing'&&status!=='paused'} aria-pressed={snapshot.autoFire} onClick={()=>{toggleFire();focusField()}}><Crosshair size={13}/><span>{snapshot.autoFire?'自动射击':'手动射击'}</span><i/></button><button className="combat-bomb-button" aria-label={`释放冲击波，剩余 ${snapshot.bombs} 次`} disabled={status!=='playing'||snapshot.bombs<=0} onClick={()=>{useBomb();focusField()}}><Waves size={17}/><span>冲击波</span><b>{snapshot.bombs}</b><kbd>X</kbd></button></div>
        <div className="combat-hit-flash" style={{opacity:reducedMotion?0:Math.max(0,simulation.flash-.3)*.8}} aria-hidden="true"/>
        {status==='ready'&&<section className="combat-launch-screen" aria-label="出击准备"><div className="launch-kicker"><span/>ORIGINAL ARCADE EXPERIENCE</div><div className="launch-content"><div className="launch-title" aria-hidden="true">STAR<br/><span>FLIGHT</span><i>01</i></div><h1>星际穿行</h1><p>突破三重防线，直面暗面母舰。</p><div className="launch-powerups"><span className="pickup-token spread">S</span><span className="pickup-token laser">L</span><span className="pickup-token missile">M</span><small>拾取补给，解锁全新火力。</small></div><div className="combat-difficulty" aria-label="游戏难度"><button className={difficulty==='normal'?'selected':''} aria-pressed={difficulty==='normal'} onClick={()=>setDifficulty('normal')}>标准挑战<span>5 格护盾</span></button><button className={difficulty==='rookie'?'selected':''} aria-pressed={difficulty==='rookie'} onClick={()=>setDifficulty('rookie')}>新手巡航<span>7 格 · 较慢弹幕</span></button></div><button className="combat-primary" onClick={start}>立即出击<ArrowRight size={19}/></button><div className="launch-controls"><span><kbd>WASD</kbd> / 方向键移动</span><span>{snapshot.autoFire?'触屏拖动 · 自动开火已开启':'触屏拖动时射击 · 空格手动开火'}</span></div></div></section>}
        {(status==='paused'||finished)&&<div className="combat-overlay"><section className="combat-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="combat-dialog-title">
          {status==='paused'?<div className="combat-pause-icon"><Pause size={28}/></div>:<div className={`combat-rank ${status==='won'?'won':''}`}><span>MISSION RANK</span><strong>{rank}</strong></div>}
          <span className="combat-eyebrow">{status==='paused'?'FLIGHT ON HOLD':status==='won'?'MISSION ACCOMPLISHED':'FLIGHT RECORDER'}</span><h2 id="combat-dialog-title">{status==='paused'?'航行已暂停':status==='won'?'星海，重新归于宁静。':'王牌，也需要下一次出击。'}</h2><p>{status==='paused'?'调整呼吸，火力与航路都为你保留。':status==='won'?'厄瑞玻斯母舰已击毁。三重防线，全线突破。':'护盾耗尽。灵活移动，用冲击波化解密集弹幕。'}</p>
          {finished?<><div className="combat-final-score"><small>FINAL SCORE</small><strong>{snapshot.score.toLocaleString()}</strong>{snapshot.score>0&&snapshot.score>=best&&<span><Trophy size={12}/>本机最佳战绩</span>}</div><div className="combat-result-grid"><div><strong>{snapshot.kills}</strong><span>击毁敌舰</span></div><div><strong>{snapshot.maxCombo}</strong><span>最高连击</span></div><div><strong>{formatTime(snapshot.victoryTime||snapshot.elapsed)}</strong><span>出击时间</span></div></div><span className="result-difficulty">{snapshot.difficulty==='rookie'?'新手巡航':'标准挑战'} · {status==='won'?'3 / 3 星区完成':`抵达第 ${snapshot.sector+1} 星区`}</span></>:<div className="pause-status"><span>{sector.name}</span><span>{formatTime(snapshot.elapsed)}</span><span>{snapshot.kills} 击毁</span></div>}
          {status==='paused'&&<div className="combat-pause-settings"><button aria-pressed={sound} onClick={()=>{setSound(!sound);if(!sound)void audio.unlock()}}>{sound?<Volume2 size={13}/>:<VolumeX size={13}/>}音效 {sound?'开':'关'}</button><button aria-pressed={music} onClick={()=>setMusic(!music)}><Music2 size={13}/>音乐 {music?'开':'关'}</button></div>}
          <button className="combat-primary" onClick={status==='paused'?resume:start}>{status==='paused'?<Play size={17}/>:<RotateCcw size={17}/>}<span>{status==='paused'?'继续战斗':'再次出击'}</span><ArrowRight size={17}/></button>
          {status==='paused'&&<button className="combat-secondary" onClick={start}><RotateCcw size={14}/>重新开始</button>}<button className="combat-exit" onClick={back}>返回游戏库<ArrowUpRight size={13}/></button>
        </section></div>}
      </div>
      <aside className="combat-side combat-manual"><span className="combat-eyebrow">FIELD MANUAL / 01</span><h3>补给，决定你的火力。</h3><div className="combat-arsenal">{(['spread','laser','missile'] as Weapon[]).map(w=><div key={w} className={snapshot.weapon===w?'equipped':''}><span className={`pickup-token ${w}`}>{WEAPONS[w].letter}</span><div><strong>{WEAPONS[w].name}</strong><p>{WEAPONS[w].description}</p></div></div>)}</div><p className="combat-upgrade-note">同类补给升级，最高 LV.3。<br/>切换武器后，各自等级保留。</p><div className="combat-supplies"><span><i>+</i>修复护盾</span><span><i>B</i>补充冲击波</span></div><div className="combat-record"><span><Trophy size={13}/>本机最高纪录</span><strong>{String(best).padStart(6,'0')}</strong><small>{records.length?`${records[0].difficulty==='rookie'?'新手巡航':'标准挑战'} · ${records[0].won?'任务完成':`${records[0].kills} 架击毁`}`:'等待你的第一场出击'}</small></div><div className="combat-key-guide"><div><span>移动</span><kbd>W A S D / ↑ ↓ ← →</kbd></div><div><span>手动射击</span><kbd>SPACE / J</kbd></div><div><span>低速精细移动</span><kbd>SHIFT</kbd></div><div><span>释放冲击波</span><kbd>X / B</kbd></div><div><span>切换自动射击</span><kbd>F</kbd></div><div><span>暂停</span><kbd>P / ESC</kbd></div></div><p className="combat-hitbox-note"><Focus size={14}/>舰体中心的光点为受击判定位置。</p></aside>
    </div>
    <div className="combat-footer"><span><span className="signal-dot"/>{status==='playing'?`${sector.name} · ${snapshot.boss?'母舰交战':`第 ${snapshot.wave} 波`}`:'三重星区 · 四种武器 · 最终母舰'}</span><div className="combat-campaign-progress" aria-label={`航程进度 ${Math.round(progress*100)}%`}><i style={{width:`${progress*100}%`}}/>{[1,2].map(i=><b key={i} style={{left:`${i*33.33}%`}}/>)}</div><span className="combat-duration">{formatTime(snapshot.victoryTime||snapshot.elapsed)} <i>/</i> 单局约 2–3 分钟</span></div>
  </div>
}
