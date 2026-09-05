import { ArrowRight, ArrowUpRight, Boxes, Gamepad2, Layers, ShieldCheck, Timer, Zap } from 'lucide-react'
import { assets, assetById, baseInstances, games, scenes } from '../data/catalog'
import type { AssetId, SceneInstance } from '../data/catalog'
import { ModelCanvas, WorldCanvas } from '../components/StudioCanvas'
import { InteractionHint, ModelLink, PageHeading, PrimaryViewButton, SelectionButton } from '../components/Interface'
import { FlightPreview } from '../game/FlightScene'
import { isCarId } from '../racing/cars'
import { isSpacecraftId } from '../spacecraft/specs'

interface ModelLibraryProps { selected: AssetId[]; toggleSelection: (id: AssetId) => void; viewModel: (id: AssetId) => void; addSelected: () => void }
export function ModelLibrary({ selected, toggleSelection, viewModel, addSelected }: ModelLibraryProps) {
  return <>
    <PageHeading title="模型" subtitle="从每一个角度，发现想象。" count={`${String(assets.length).padStart(2, '0')} 件作品`} />
    <section className="hero-showcase model-hero spacecraft-hero" aria-label="星舰高精度模型">
      <div className="hero-visual"><ModelCanvas id="starship" hero /></div>
      <div className="hero-copy"><span className="catalog-id">SPACEX / NEW COLLECTION</span><h2>星舰 <span>Starship</span></h2><p>让更远的世界，成为下一站。<br />从九机轰鸣，到三十九束火焰。</p><div className="category-line">高精度模型<span>·</span>可分级查看<span>·</span>GLB</div><div className="hero-actions"><PrimaryViewButton onClick={() => viewModel('starship')} /><button className="button secondary" onClick={() => viewModel('falcon-9')}>探索猎鹰 9 号<ArrowUpRight size={19} /></button></div></div>
      <div className="hero-bottom"><SelectionButton selected={selected.includes('starship')} onClick={() => toggleSelection('starship')} label="星舰" /><InteractionHint /></div>
    </section>
    <div className="section-heading"><h2>更多创作素材</h2><span>选择模型，组合你的世界</span></div>
    <div className="asset-grid">{[...assets.filter(a=>a.id==='falcon-9'),...assets.filter(a=>isCarId(a.id)),...assets.filter(a=>!isCarId(a.id)&&!isSpacecraftId(a.id))].map(asset => <article className={`asset-card ${selected.includes(asset.id) ? 'is-selected' : ''}`} key={asset.id}>
      <div className="card-selection"><SelectionButton compact selected={selected.includes(asset.id)} onClick={() => toggleSelection(asset.id)} label={asset.name} /></div>
      <button className="asset-preview" aria-label={`查看${asset.name}`} onClick={() => viewModel(asset.id)}><ModelCanvas id={asset.id} compact /></button>
      <div className="asset-card-copy"><span className="small-id">{asset.english}</span><div className="asset-title-row"><h3>{asset.name}</h3><span>{isSpacecraftId(asset.id) ? '高精度 · GLB' : asset.category}</span></div><ModelLink onClick={() => viewModel(asset.id)} /></div>
    </article>)}</div>
    {selected.length > 0 && <div className="selection-tray"><div><Boxes size={20} /><span>已选择 <strong>{selected.length}</strong> 个模型</span><span className="selected-names">{selected.map(id => assetById[id].name).join('、')}</span></div><button className="button primary" onClick={addSelected}>加入发射基地<ArrowRight size={17} /></button></div>}
  </>
}

export function SceneLibrary({ additions, enter, goModels }: { additions: SceneInstance[]; enter: () => void; goModels: () => void }) {
  const scene = scenes[0]
  return <>
    <PageHeading title="场景" subtitle="把独立的灵感，放进同一个世界。" count="01 处空间" />
    <section className="hero-showcase scene-hero">
      <div className="hero-visual scene-visual"><WorldCanvas preview instances={[...baseInstances, ...additions]} /></div>
      <div className="hero-copy"><span className="catalog-id">TRANQUILITY BASE</span><h2>静海<br />发射基地</h2><p>在月色与群山之间，<br />为下一次出发做好准备。</p><div className="category-line">月面基地<span>·</span>{baseInstances.length + additions.length} 个模型实例</div><button className="button primary" onClick={enter}>进入场景<ArrowUpRight size={20} /></button></div>
      <div className="hero-bottom"><span className="quiet-status"><span className="status-dot" />可以自由探索的三维空间</span><span className="subtle-note">由模型库中的素材组合而成</span></div>
    </section>
    <div className="section-heading"><h2>这个世界的组成</h2><button className="text-link" onClick={goModels}>前往模型库<ArrowUpRight size={16} /></button></div>
    <div className="asset-reference-row">{scene.assetIds.map(id => <div key={id}><Layers size={20} /><span>{assetById[id].name}</span><small>{baseInstances.filter(instance => instance.assetId === id).length + additions.filter(instance => instance.assetId === id).length} 个实例</small></div>)}</div>
    <div className="editorial-note"><h3>一个模型，无限种组合。</h3><p>在模型页选择素材，就能把它们加入发射基地。<br />你的新增布局会保留在当前浏览器。</p></div>
  </>
}

export function GameLibrary({ playGame, playRace, viewModel }: { playGame: () => void; playRace:()=>void; viewModel: (id: AssetId) => void }) {
  return <>
    <PageHeading title="游戏" subtitle="让你的模型，拥有下一场冒险。" count={`${String(games.length).padStart(2, '0')} 款游戏`} />
    <section className="hero-showcase race-library-hero">
      <div className="hero-visual"><ModelCanvas id="formula-r1" hero/></div>
      <div className="hero-copy"><span className="catalog-id">AZURE CIRCUIT / 002</span><h2>湛蓝大奖赛</h2><p>把风，甩在身后。<br/>与五位对手，角逐海岸线上的方格旗。</p><div className="category-line">街机赛车<span>·</span>漂移 / 道具<span>·</span>约 2 分钟</div><button className="button primary" onClick={playRace}><Gamepad2 size={21}/>开始比赛<ArrowRight size={18}/></button></div>
      <div className="hero-bottom"><span className="quiet-status"><span className="status-dot"/>三款赛车 · 三圈竞速 · 键盘与触屏</span><ModelLink onClick={()=>viewModel('formula-r1')}>查看赛车模型</ModelLink></div>
    </section>
    <div className="game-feature-row"><div><Timer/><h3>六车争夺方格旗</h3><p>海风环线，三圈完整比赛，两档驾驶难度。</p></div><div><Zap/><h3>漂移换来推进力</h3><p>过弯蓄满后松开漂移，收取氮气再冲刺。</p></div><div><ShieldCheck/><h3>让道具改变名次</h3><p>涡轮、护盾与脉冲，抓住每一次超车机会。</p></div></div>
    <div className="section-heading game-secondary-title"><h2>下一场冒险，去星海。</h2><span>同一个工作室，不同的驾驶体验</span></div>
    <section className="hero-showcase game-hero">
      <div className="hero-visual game-library-visual"><FlightPreview /></div>
      <div className="hero-copy"><span className="catalog-id">STARFLIGHT / 001</span><h2>星际穿行</h2><p>穿越敌军火线，<br />让星海重新归于宁静。</p><div className="category-line">街机挑战<span>·</span>单人<span>·</span>约 2–3 分钟</div><button className="button primary" onClick={playGame}><Gamepad2 size={21} />开始游戏<ArrowRight size={18} /></button></div>
      <div className="hero-bottom"><span className="quiet-status"><span className="status-dot" />键盘与触屏均可游玩</span><ModelLink onClick={() => viewModel('rocket')}>查看使用模型</ModelLink></div>
    </section>
    <div className="game-feature-row"><div><Timer /><h3>突破三重防线</h3><p>拦截战斗机与护卫舰，直面最终母舰。</p></div><div><Zap /><h3>拾取武器补给</h3><p>散弹、激光、追踪导弹，最高升至三级。</p></div><div><ShieldCheck /><h3>掌握战斗节奏</h3><p>精细移动避弹，冲击波清场，连击倍增得分。</p></div></div>
    <div className="editorial-note"><h3>从素材，到可玩的世界。</h3><p>为「探索者 01」装上双联火炮，<br />从静海基地启航，加入一场完整的星际空战。</p></div>
  </>
}
