import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Expand, Film, Gauge, Pause, Play, RotateCcw, VolumeX } from 'lucide-react'
import { BackButton, PageHeading } from '../components/Interface'
import { RecoveryCanvas } from '../animation/RecoveryScene'
import { CATCH, directorRate, END, formatTime, MissionPlayer, phases, references, sampleMission, START } from '../animation/mission'
import type { CameraMode, MissionSample, PlaybackSpeed } from '../animation/mission'
import '../animation/animation.css'

const noop = () => {}
const cameras: [CameraMode, string][] = [['director', '导演镜头'], ['follow', '自由跟随'], ['tower', '塔架视角']]
function Preview() {
  const [player] = useState(() => { const value = new MissionPlayer(); value.seek(418); return value })
  const [ready, setReady] = useState(false)
  return <div className="animation-preview" data-rendered={ready}>
    <RecoveryCanvas player={player} mode="director" onReady={() => setReady(true)} onTick={noop} preview />
    {!ready && <div className="canvas-loading" role="status"><span />准备飞行场景…</div>}
    <div className="preview-caption"><span className="status-dot" />SUPER HEAVY · RETURN TO LAUNCH SITE<span>{formatTime(418)}</span></div>
  </div>
}
function AnimationLibrary({ enter }: { enter: () => void }) {
  return <div className="animation-library">
    <PageHeading title="让时间，进入三维世界。" subtitle="沿着时间线，观察一场完整的飞行。" count="01 个过程" />
    <section className="animation-feature">
      <div className="animation-feature-copy"><span className="catalog-id">飞行档案 001 / STARBASE</span><h2>从发射台，<br />回到发射塔。</h2><p>星舰升空，助推器返航。<br />跟随超级重型，重走首次塔架捕获的关键阶段。</p><div className="animation-tags"><span>实时 3D</span><span>9 个阶段</span><span>可拖动时间线</span></div><button className="button primary" onClick={enter}><Play size={18} fill="currentColor" />打开动画<ArrowRight size={18} /></button><small>参考第五次试飞 · 飞行过程约 7 分钟<br />导演节奏会加快巡航，并放慢最后进近。</small></div>
      <Preview />
    </section>
    <div className="animation-library-notes"><div><Film size={21} /><strong>模型成为主角</strong><p>复用星舰与超级重型模型，独立呈现两级的去向。</p></div><div><Gauge size={21} /><strong>每一步都能细看</strong><p>暂停、回放、逐段跳转，切换镜头观察发动机与捕获支点。</p></div><div><Check size={21} /><strong>公开资料重建</strong><p>以真实飞行阶段为依据，轨迹与场地采用可视化近似。</p></div></div>
  </div>
}

const xMap = (v: number) => 24+v/68000*222, yMap = (v: number) => 130-v/110000*98
const flightPath = Array.from({ length: 86 }, (_, i) => { const s = sampleMission(i*5); return `${i === 0 ? 'M' : 'L'}${xMap(s.position[0]).toFixed(1)},${yMap(s.position[1]).toFixed(1)}` }).join(' ')
function Trajectory({ sample }: { sample: MissionSample }) {
  return <div className="mission-map"><div className="mission-small-heading"><span>返场轨迹</span><span>示意 · 非等比例</span></div><svg viewBox="0 0 280 152" role="img" aria-label="助推器从发射场向海上飞行，返场点火后沿弧形轨迹返回塔架">
    <defs><linearGradient id="sea-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#254959" stopOpacity=".3"/><stop offset="1" stopColor="#254959" stopOpacity="0"/></linearGradient></defs>
    <path d="M22 132 H269 V150 H22Z" fill="url(#sea-fill)" />
    {[40, 85, 130].map(y => <path key={y} d={`M20 ${y} H268`} stroke="#253c45" strokeWidth=".6" strokeDasharray="3 4" />)}
    <path d={flightPath} fill="none" stroke="#667b7b" strokeWidth="1.5" />
    <path d="M15 132V119h7v13m-9-8h11" fill="none" stroke="#d0ed87" />
    <circle cx={xMap(sample.position[0])} cy={yMap(sample.position[1])} r="4" fill="#d0ed87" stroke="#152229" strokeWidth="2" />
    <text x="29" y="147">STARBASE</text><text x="197" y="147">海上方向 →</text>
    <text x="126" y="20">滑行 / 下降</text><text x="189" y="70">返场点火</text>
  </svg></div>
}
function EngineDiagram({ count }: { count: number }) {
  const engines = [[20, 22], [10, 13], [3, 4.5]].flatMap(([n,r], ring) => Array.from({length:n}, (_, i) => ({ x: 32+Math.cos(i/n*Math.PI*2)*r, y: 32+Math.sin(i/n*Math.PI*2)*r, on: count === 33 || count === 13 && ring > 0 || count === 3 && ring === 2 })))
  return <svg viewBox="0 0 64 64" role="img" aria-label={`助推器 ${count} 台发动机点火`}><circle cx="32" cy="32" r="29" fill="#17252b" stroke="#33474d" />{engines.map((e,i) => <circle key={i} cx={e.x} cy={e.y} r="2.6" fill={e.on ? '#ffc983' : '#41565e'} />)}</svg>
}
function AnimationWorkspace({ back }: { back: () => void }) {
  const [player] = useState(() => new MissionPlayer())
  const [snapshot, setSnapshot] = useState(() => sampleMission(player.time)), [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false), [mode, setMode] = useState<CameraMode>('director'), [speed, setSpeed] = useState<PlaybackSpeed>('director')
  const [fullscreen, setFullscreen] = useState(false), [notice, setNotice] = useState('')
  const shell = useRef<HTMLDivElement>(null)
  const sync = useCallback(() => { setSnapshot(sampleMission(player.time)); setPlaying(player.playing) }, [player])
  const seek = useCallback((time: number) => { player.seek(time); sync() }, [player, sync])
  const toggle = useCallback(() => { if (!ready) return; player.toggle(); sync() }, [player, ready, sync])
  const reset = useCallback(() => { player.reset(); sync() }, [player, sync])
  useEffect(() => {
    const hidden = () => { if (document.hidden) { player.playing = false; sync() } }
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('button, input, select, a, summary, [contenteditable="true"]') || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code === 'Space') { event.preventDefault(); toggle() }
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') { event.preventDefault(); seek(player.time+(event.code === 'ArrowLeft' ? -5 : 5)) }
      if (event.code === 'Home') { event.preventDefault(); reset() }
    }
    const full = () => setFullscreen(document.fullscreenElement === shell.current)
    document.addEventListener('visibilitychange', hidden); window.addEventListener('keydown', key); document.addEventListener('fullscreenchange', full)
    return () => { player.playing = false; document.removeEventListener('visibilitychange', hidden); window.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', full) }
  }, [player, reset, seek, sync, toggle])
  const expand = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen(); else setNotice('此浏览器暂不支持全屏，可横置设备观看。') }
    catch { setNotice('浏览器未能进入全屏，可继续在当前窗口观看。') }
  }
  const phaseIndex = phases.findIndex(p => p.id === snapshot.phase.id)
  return <>
    <div className="workspace-heading"><BackButton onClick={back}>返回动画</BackButton><span>FLIGHT ARCHIVE / 001</span></div>
    <div className="mission-heading"><div><h1>星舰：发射与回收</h1><p>一次升空，两条航迹。跟随超级重型返回 Starbase。</p></div><span className="mission-reference-tag">参考 Flight 5 · 2024.10.13</span></div>
    <div className="mission-layout" data-animation="starship-recovery" data-time={snapshot.time.toFixed(2)} data-phase={snapshot.phase.id} data-playing={playing} data-caught={snapshot.caught} data-booster-engines={snapshot.boosterEngines} data-ship-engines={snapshot.shipEngines} data-camera={mode} data-rendered={ready}>
      <div className="mission-player" ref={shell}>
        <div className="mission-viewport">
          <RecoveryCanvas player={player} mode={mode} onReady={() => setReady(true)} onTick={sync} />
          {!ready && <div className="canvas-loading" role="status"><span />装载星舰与发射场…</div>}
          <div className="mission-overlay-title"><span><i className={playing ? 'live' : ''} />{playing ? '飞行中' : snapshot.time >= END ? '回放结束' : '已暂停'}</span><strong>{snapshot.phase.title}</strong><small>SUPER HEAVY / {String(phaseIndex+1).padStart(2,'0')}</small></div>
          <div className="mission-camera-switch" role="group" aria-label="动画镜头">{cameras.map(([id,label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div>
          {ready && snapshot.time === START && !playing && <button className="mission-start" onClick={toggle}><Play size={19} fill="currentColor" />开始飞行</button>}
          {snapshot.caught && <div className="mission-caught"><Check size={16} />助推器已由塔臂承接</div>}
          <div className="mission-telemetry"><div><span>重建高度</span><strong>{snapshot.position[1] >= 1000 ? (snapshot.position[1]/1000).toFixed(1) : snapshot.position[1].toFixed(0)}<small>{snapshot.position[1] >= 1000 ? 'km' : 'm'}</small></strong></div><div><span>重建速度</span><strong>{snapshot.speed.toFixed(0)}<small>m/s</small></strong></div></div>
          <span className="mission-view-note">{mode === 'follow' ? '拖动环绕 · 滚轮缩放' : '轨迹与场地为近似重建'}</span>
        </div>
        <div className="mission-controls">
          <div className="mission-time-row"><strong>{formatTime(snapshot.time)}</strong><span>{snapshot.phase.short}<i />{formatTime(END)}</span></div>
          <input className="mission-scrubber" type="range" min={START} max={END} step={.1} value={snapshot.time} aria-label="飞行进度" aria-valuetext={`${formatTime(snapshot.time)}，${snapshot.phase.title}`} style={{ '--progress': `${(snapshot.time-START)/(END-START)*100}%` } as React.CSSProperties} onChange={event => seek(Number(event.target.value))} />
          <div className="mission-markers" aria-hidden="true">{phases.filter(p => ['ascent','hotstage','coast','descent','landing','caught'].includes(p.id)).map(p => <span key={p.id} style={{left:`${(p.time-START)/(END-START)*100}%`}}>{p.short}</span>)}</div>
          <div className="mission-control-row"><div className="mission-transport"><button className="mission-play" disabled={!ready} onClick={toggle} aria-label={playing ? '暂停动画' : snapshot.time >= END ? '重新播放' : '播放动画'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button onClick={reset} aria-label="回到起点" title="回到起点"><RotateCcw size={18} /></button><label className="mission-speed"><span className="sr-only">播放速度</span><select value={speed} aria-label="播放速度" onChange={event => { const value = event.target.value as PlaybackSpeed; player.speed=value; setSpeed(value) }}><option value="director">导演节奏</option><option value="1">1× 实时</option><option value="4">4× 速度</option><option value="8">8× 速度</option></select><ChevronDown size={13} /></label><small className="mission-rate">{speed === 'director' ? `${directorRate(snapshot.time)}×` : `${speed}×`}</small></div><div className="mission-extra-controls"><span title="此动画没有音轨"><VolumeX size={15} /><small>无音轨</small></span><button onClick={expand} aria-label={fullscreen ? '退出全屏' : '全屏观看'} title="全屏观看"><Expand size={18} /></button></div></div>
          {notice && <p role="status" className="mission-notice">{notice}</p>}
        </div>
      </div>
      <aside className="mission-sidebar">
        <div className="mission-sidebar-title"><span className="catalog-id">FLIGHT SEQUENCE</span><strong>飞行阶段<span>{String(phaseIndex+1).padStart(2,'0')} / 09</span></strong></div>
        <div className="mission-phase-list" aria-label="跳转飞行阶段">{phases.map((p,i) => <button key={p.id} className={`${i === phaseIndex ? 'active' : ''} ${i < phaseIndex ? 'passed' : ''}`} aria-current={i === phaseIndex ? 'step' : undefined} onClick={() => seek(p.time)}><span className="phase-index">{i < phaseIndex ? <Check size={10} /> : String(i+1).padStart(2,'0')}</span><span>{p.title}</span><time>{formatTime(p.time)}</time></button>)}</div>
        <div className="mission-phase-detail"><div className="mission-engine-status"><EngineDiagram count={snapshot.boosterEngines} /><div><small>助推器发动机</small><strong>{snapshot.boosterEngines}<span> / 33 点火</span></strong></div></div><p>{snapshot.phase.detail}</p></div>
        <Trajectory sample={snapshot} />
      </aside>
    </div>
    <div className="mission-help"><span>空格 播放 / 暂停<span>·</span>← → 跳转 5 秒<span>·</span>Home 回到起点</span><a href="#models/starship">查看星舰模型<ArrowUpRight size={14} /></a></div>
    <details className="mission-sources"><summary><span>关于这次重建<span>飞行依据、模型与精度范围</span></span><ChevronDown size={16} /></summary><div><p>参考 2024 年 10 月 13 日第五次试飞的发射、热分级、返场点火、抛弃热分级环和首次塔架捕获。仅演示起飞前 10 秒至助推器捕获完成；星舰上面级继续飞行，本片不包含其后续再入与海上溅落。</p><p>时间节点取近似值。位置、速度、发动机推力、姿态和塔臂运动是为说明过程而重建的动画，不是实际遥测或工程仿真。复用模型库的星舰资产，将显示比例调整为约 71 m 助推器（含热分级环）与 50 m 上面级；塔架、捕获支点和 Starbase 场地为程序化近似，不是 B12 / S30 的精确复刻。</p><div>{references.map(ref => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer">{ref.label}<ArrowUpRight size={13} /></a>)}</div></div></details>
  </>
}
export default function Animations({ detail, enter, back }: { detail?: string; enter: () => void; back: () => void }) { return detail ? <AnimationWorkspace back={back} /> : <AnimationLibrary enter={enter} /> }
