import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, ChevronDown, Expand, Pause, Play, RotateCcw, VolumeX } from 'lucide-react'
import { BackButton } from '../../components/Interface'
import { FalconHeavyCanvas } from './Canvas'
import { DURATION, FlightPlayer, formatTime, phases, references, sampleFlight } from './mission'
import type { CameraMode } from './mission'
import './falcon-heavy.css'

const cameras: [CameraMode,string][] = [['director','导演镜头'],['pair','双芯全景'],['left','LZ-1 特写'],['right','LZ-2 特写']]
export default function FalconHeavyWorkspace({ back }: { back: () => void }) {
  const [player] = useState(() => new FlightPlayer()), [snapshot,setSnapshot] = useState(() => sampleFlight(0))
  const [playing,setPlaying] = useState(false), [ready,setReady] = useState(false), [mode,setMode] = useState<CameraMode>('director')
  const [speed,setSpeed] = useState(1), [notice,setNotice] = useState(''), shell = useRef<HTMLDivElement>(null)
  const exporting = import.meta.env.DEV && new URLSearchParams(location.search).get('render') === 'falcon-heavy'
  const sync = useCallback(() => { setSnapshot(sampleFlight(player.time)); setPlaying(player.playing) }, [player])
  const seek = useCallback((time: number) => { player.seek(time); sync() }, [player,sync])
  const toggle = useCallback(() => { if (ready) { player.toggle(); sync() } }, [player,ready,sync])
  const reset = useCallback(() => { player.reset(); sync() }, [player,sync])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('button, input, select, a, video, summary, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); seek(player.time+(e.code === 'ArrowLeft' ? -5 : 5)) }
      if (e.code === 'Home') { e.preventDefault(); reset() }
    }
    const hidden = () => { if (document.hidden) { player.playing = false; sync() } }
    window.addEventListener('keydown',key); document.addEventListener('visibilitychange',hidden)
    return () => { player.playing = false; window.removeEventListener('keydown',key); document.removeEventListener('visibilitychange',hidden) }
  }, [player,reset,seek,sync,toggle])
  const expand = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await shell.current?.requestFullscreen() }
    catch { setNotice('此浏览器未能进入全屏，可继续在当前窗口观看。') }
  }
  if (exporting) return <div className="fh-export" data-rendered={ready}><FalconHeavyCanvas player={player} mode="director" onReady={() => setReady(true)} onTick={sync} exporting /></div>
  const phaseIndex = phases.findIndex(p => p.id === snapshot.phase.id)
  return <>
    <div className="workspace-heading"><BackButton onClick={back}>返回动画</BackButton><span>FLIGHT ARCHIVE / 002</span></div>
    <div className="mission-heading"><div><h1>猎鹰重型：双芯归来</h1><p>一同出发，各自落地。两枚侧助推器返回海岸。</p></div><span className="mission-reference-tag">56 秒短片 · 现有模型重建</span></div>
    <div className="mission-layout fh-layout" data-animation="falcon-heavy-recovery" data-time={snapshot.time.toFixed(2)} data-phase={snapshot.phase.id} data-playing={playing} data-rendered={ready} data-landed-left={snapshot.boosters[0].landed} data-landed-right={snapshot.boosters[1].landed} data-camera={mode}>
      <div className="mission-player" ref={shell}>
        <div className="mission-viewport fh-viewport">
          <FalconHeavyCanvas player={player} mode={mode} onReady={() => setReady(true)} onTick={sync} />
          {!ready && <div className="canvas-loading" role="status"><span />准备猎鹰重型与海岸着陆区…</div>}
          <div className="mission-overlay-title"><span><i className={playing ? 'live' : ''} />{playing ? '飞行中' : snapshot.complete ? '回放结束' : '已暂停'}</span><strong>{snapshot.phase.title}</strong><small>FALCON HEAVY / DUAL RETURN</small></div>
          <div className="mission-camera-switch" role="group" aria-label="动画镜头">{cameras.map(([id,label]) => <button key={id} aria-pressed={mode===id} onClick={() => setMode(id)}>{label}</button>)}</div>
          {ready && snapshot.time===0 && !playing && <button className="mission-start" onClick={toggle}><Play size={18} fill="currentColor" />开始回收短片</button>}
          <div className="fh-landing-status">{snapshot.boosters.map((booster,i) => <span key={i} className={booster.landed ? 'landed' : ''}>{booster.landed && <Check size={12} />}LZ-{i+1}<b>{booster.landed ? '已着陆' : `${Math.round(booster.altitude).toLocaleString()} m`}</b></span>)}</div>
          <span className="mission-view-note">三维视觉重建 · 非实际遥测</span>
        </div>
        <div className="mission-controls">
          <div className="mission-time-row"><strong>{formatTime(snapshot.time)}</strong><span>{snapshot.phase.short}<i />00:56</span></div>
          <input className="mission-scrubber" type="range" min={0} max={DURATION} step={.05} value={snapshot.time} aria-label="回收进度" aria-valuetext={`${formatTime(snapshot.time)}，${snapshot.phase.title}`} style={{'--progress':`${snapshot.time/DURATION*100}%`} as React.CSSProperties} onChange={e => seek(Number(e.target.value))} />
          <div className="mission-markers" aria-hidden="true">{phases.filter(p => !['entry','legs'].includes(p.id)).map(p => <span key={p.id} style={{left:`${p.time/DURATION*100}%`}}>{p.short}</span>)}</div>
          <div className="mission-control-row"><div className="mission-transport"><button className="mission-play" disabled={!ready} onClick={toggle} aria-label={playing ? '暂停动画' : snapshot.complete ? '重新播放' : '播放动画'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button onClick={reset} aria-label="回到起点"><RotateCcw size={18} /></button><label className="mission-speed"><select aria-label="播放速度" value={speed} onChange={e => { const n=Number(e.target.value);player.speed=n;setSpeed(n) }}><option value={.5}>0.5× 慢放</option><option value={1}>1× 速度</option><option value={2}>2× 速度</option></select><ChevronDown size={13} /></label></div><div className="mission-extra-controls"><span title="无音轨"><VolumeX size={15} /><small>无音轨</small></span><button onClick={expand} aria-label="全屏观看"><Expand size={18} /></button></div></div>
          {notice && <p className="mission-notice" role="status">{notice}</p>}
        </div>
      </div>
      <aside className="mission-sidebar">
        <div className="mission-sidebar-title"><span className="catalog-id">TWO BOOSTERS. TWO LANDINGS.</span><strong>回收阶段<span>{String(phaseIndex+1).padStart(2,'0')} / 07</span></strong></div>
        <div className="mission-phase-list" aria-label="跳转回收阶段">{phases.map((p,i) => <button key={p.id} aria-current={i===phaseIndex ? 'step' : undefined} className={i===phaseIndex ? 'active' : i<phaseIndex ? 'passed' : ''} onClick={() => seek(p.time)}><span className="phase-index">{i<phaseIndex ? <Check size={10} /> : i+1}</span><span>{p.title}</span><time>{formatTime(p.time)}</time></button>)}</div>
        <div className="mission-phase-detail"><div className="fh-engine-counts">{snapshot.boosters.map((b,i) => <div key={i}><small>LZ-{i+1} 助推器</small><strong>{b.engines}<span> / 9 点火</span></strong></div>)}</div><p>{snapshot.phase.detail}</p></div>
        <a className="fh-model-link" href="#models/falcon-heavy">查看猎鹰重型模型<ArrowUpRight size={14} /></a>
      </aside>
    </div>
    <div className="mission-help"><span>空格 播放 / 暂停<span>·</span>← → 跳转 5 秒<span>·</span>Home 回到起点</span><a href="#models/falcon-heavy">查看猎鹰重型模型<ArrowUpRight size={14} /></a></div>
    <details className="mission-sources"><summary><span>关于这次重建<span>参考影片、复用模型与精度范围</span></span><ChevronDown size={16} /></summary><div><p>构图参考 SpaceX 2018 年官方短片《Falcon Heavy & Starman》中的海岸双芯着陆。使用本项目猎鹰 9 号细化建模，补出 Block 5 风格的中央芯级、侧芯鼻锥和分离机构，再用同一个猎鹰重型 GLB 制作动画与视频。</p><p>这是剪辑为 56 秒的回收过程可视化，前半段压缩了分离、返场和再入阶段，后半段突出两枚侧助推器独立接地。侧芯落到两个地面着陆区；中央芯级继续上升。轨迹、时间、场地、烟尘及外观细节为近似重建，不代表某次任务的准确遥测或工程 CAD。视频画面完全来自本项目三维渲染，无原片画面和音乐。</p><div>{references.map(ref => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer">{ref.label}<ArrowUpRight size={13} /></a>)}</div></div></details>
  </>
}
