import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { assets, assetById, createInstances, MAX_ADDITIONS, readAdditions, saveAdditions } from './data/catalog'
import type { AssetId, SceneInstance } from './data/catalog'
import { OrbitLogo } from './components/Interface'
import { GameLibrary, SceneLibrary } from './pages/Libraries'
import { ModelLibrary } from './pages/ModelLibrary'
import { modelLibraryHash, readModelFilters } from './data/model-library'
import type { ModelLibraryState } from './data/model-library'
import { ModelWorkspace, SceneWorkspace } from './pages/Workspaces'
import { FlightGame } from './pages/FlightGame'
import { RacingGame } from './pages/RacingGame'
import { isCarId } from './racing/cars'
import type { CarId } from './racing/cars'

const Animations = lazy(() => import('./pages/Animations'))
type Tab = 'models' | 'scenes' | 'animations' | 'games'
type Route = { tab: Tab; detail?: string }
const tabLabels: Record<Tab, string> = { models: '模型', scenes: '场景', animations: '动画', games: '游戏' }
function getRoute(): Route {
  const [tab, detail] = location.hash.slice(1).split('?')[0].split('/')
  if (tab === 'scenes') return { tab, detail: detail === 'moonbase' ? detail : undefined }
  if (tab === 'animations') return { tab, detail: detail === 'starship-recovery' || detail === 'falcon-heavy-recovery' ? detail : undefined }
  if (tab === 'games') return { tab, detail: detail === 'starflight' || detail === 'azure-circuit' ? detail : undefined }
  return { tab: 'models', detail: assets.some(a => a.id === detail) ? detail : undefined }
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute), [selected, setSelected] = useState<AssetId[]>([])
  const [modelFilters, setModelFilters] = useState(() => readModelFilters(location.hash))
  const modelScroll = useRef(0), lastViewedModel = useRef<AssetId | undefined>(undefined)
  const [raceCar,setRaceCar]=useState<CarId|undefined>()
  const [additions, setAdditions] = useState<SceneInstance[]>(readAdditions), [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const previousRestoration = history.scrollRestoration
    history.scrollRestoration = 'manual'
    const onHash = () => {
      const nextRoute = getRoute()
      if (nextRoute.tab === 'models' && !nextRoute.detail) setModelFilters(readModelFilters(location.hash))
      setRoute(nextRoute)
    }
    window.addEventListener('hashchange', onHash)
    return () => { window.removeEventListener('hashchange', onHash); history.scrollRestoration = previousRestoration }
  }, [])
  useLayoutEffect(() => { window.scrollTo({ top: route.tab === 'models' && !route.detail ? modelScroll.current : 0, behavior: 'instant' }) }, [route])
  useEffect(() => {
    if (route.tab !== 'models' || route.detail) return
    const rememberScroll = () => { modelScroll.current = window.scrollY }
    window.addEventListener('scroll', rememberScroll, { passive: true })
    return () => window.removeEventListener('scroll', rememberScroll)
  }, [route])
  useEffect(() => { const detailName = route.tab === 'models' && route.detail ? assetById[route.detail as AssetId].name : route.tab === 'scenes' && route.detail ? '静海发射基地' : route.tab === 'animations' && route.detail ? route.detail === 'falcon-heavy-recovery' ? '猎鹰重型：双芯归来' : '星舰：发射与回收' : route.tab === 'games' && route.detail ? route.detail==='azure-circuit'?'湛蓝大奖赛':'星际穿行' : ''; document.title = `${detailName ? `${detailName} · ` : ''}${tabLabels[route.tab]} · 3D Studio` }, [route])
  useEffect(() => { saveAdditions(additions) }, [additions])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
  const navigate = (tab: Tab, detail?: string) => {
    if (route.tab === 'models' && !route.detail) modelScroll.current = window.scrollY
    const hash = tab === 'models' && !detail ? modelLibraryHash(modelFilters) : `#${tab}${detail ? `/${detail}` : ''}`
    if (location.hash !== hash) location.hash = hash
    else setRoute({ tab, detail })
  }
  const updateModelFilters = (filters: ModelLibraryState) => {
    setModelFilters(filters)
    modelScroll.current = 0
    lastViewedModel.current = undefined
    history.replaceState(history.state, '', modelLibraryHash(filters))
  }
  const notify = (message: string) => { if (toastTimer.current) clearTimeout(toastTimer.current); setToast(message); toastTimer.current = setTimeout(() => setToast(''), 3800) }
  const toggleSelection = (id: AssetId) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  const addAssets = (ids = selected) => {
    const created = createInstances(ids, additions)
    if (!created.length) { notify(additions.length >= MAX_ADDITIONS ? '新增空间已满，可以撤销或清空新增模型。' : '先选择一件模型，再加入场景。'); return }
    setAdditions([...additions, ...created]); setSelected([]); navigate('scenes', 'moonbase'); notify(`已将 ${created.length} 个模型加入发射基地${created.length < ids.length ? '，新增空间已满' : ''}。`)
  }
  const play = () => navigate('games', 'starflight'), viewModel = (id: AssetId) => { lastViewedModel.current = id; navigate('models', id) }
  const playRace = (car?:CarId)=>{setRaceCar(car);navigate('games','azure-circuit')}
  return <div className={`app-shell ${route.tab === 'games' && route.detail ? route.detail==='azure-circuit'?'racing-route':'combat-route' : ''}`}>
    <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>跳到主要内容</a>
    <header className="site-header"><div className="header-inner"><button className="brand" aria-label="3D Studio 首页" onClick={() => navigate('models')}><OrbitLogo /><strong>3D Studio</strong></button><nav aria-label="主导航">{(['models', 'scenes', 'animations', 'games'] as Tab[]).map(tab => <button key={tab} aria-current={route.tab === tab ? 'page' : undefined} className={route.tab === tab ? 'active' : ''} onClick={() => navigate(tab)}>{tabLabels[tab]}</button>)}</nav><span className="header-tagline">你的三维游乐场<span className="header-orbit" /></span></div></header>
    <main id="main-content" tabIndex={-1} className={`main-content ${route.detail ? 'detail-main' : ''}`}>
      {route.tab === 'models' && !route.detail && <ModelLibrary selected={selected} toggleSelection={toggleSelection} viewModel={viewModel} addSelected={() => addAssets()} filters={modelFilters} updateFilters={updateModelFilters} restoreFocus={lastViewedModel.current} />}
      {route.tab === 'models' && route.detail && <ModelWorkspace key={route.detail} id={route.detail as AssetId} selected={selected.includes(route.detail as AssetId)} toggleSelection={() => toggleSelection(route.detail as AssetId)} back={() => navigate('models')} play={()=>isCarId(route.detail!)?playRace(route.detail! as CarId):play()} add={() => addAssets([route.detail as AssetId])} />}
      {route.tab === 'scenes' && !route.detail && <SceneLibrary additions={additions} enter={() => navigate('scenes', 'moonbase')} goModels={() => navigate('models')} />}
      {route.tab === 'scenes' && route.detail && <SceneWorkspace additions={additions} selected={selected} toggleSelection={toggleSelection} addSelected={() => addAssets()} undo={() => { setAdditions(current => current.slice(0, -1)); notify('已撤销最后加入的模型。') }} clear={() => { setAdditions([]); notify('已清空新增模型，基地初始布局已保留。') }} back={() => navigate('scenes')} goModels={() => navigate('models')} />}
      {route.tab === 'games' && !route.detail && <GameLibrary playGame={play} playRace={()=>playRace()} viewModel={viewModel} />}
      {route.tab === 'animations' && <Suspense fallback={<p role="status">正在准备动画模块…</p>}><Animations detail={route.detail} enter={detail => navigate('animations', detail)} back={() => navigate('animations')} /></Suspense>}
      {route.tab === 'games' && route.detail==='starflight' && <FlightGame back={() => navigate('games')} viewModel={() => viewModel('rocket')} />}
      {route.tab === 'games' && route.detail==='azure-circuit' && <RacingGame back={()=>navigate('games')} viewModel={viewModel} initialCar={raceCar}/>}
    </main>
    <footer className="site-footer"><span>3D Studio</span><span>让想象，成为可以触碰的世界。</span></footer>
    {toast && <div className="toast" role="status"><Check size={18} /><span>{toast}</span><button aria-label="关闭提示" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>
}
