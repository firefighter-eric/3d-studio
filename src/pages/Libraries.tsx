import { ArrowRight, ArrowUpRight, Boxes, Gamepad2, Layers, ShieldCheck, Timer, Zap } from 'lucide-react'
import { assets, assetById, baseInstances, scenes } from '../data/catalog'
import type { AssetId, SceneInstance } from '../data/catalog'
import { ModelCanvas, WorldCanvas } from '../components/StudioCanvas'
import { InteractionHint, ModelLink, PageHeading, PrimaryViewButton, SelectionButton } from '../components/Interface'
import { FlightPreview } from '../game/FlightScene'

interface ModelLibraryProps { selected: AssetId[]; toggleSelection: (id: AssetId) => void; viewModel: (id: AssetId) => void; playGame: () => void; addSelected: () => void }
export function ModelLibrary({ selected, toggleSelection, viewModel, playGame, addSelected }: ModelLibraryProps) {
  return <>
    <PageHeading title="模型" subtitle="从每一个角度，发现想象。" count={`${String(assets.length).padStart(2, '0')} 件作品`} />
    <section className="hero-showcase model-hero" aria-label="探索者 01">
      <div className="hero-visual"><ModelCanvas id="rocket" hero /></div>
      <div className="hero-copy"><span className="catalog-id">EXPLORER / 001</span><h2>探索者 <span>01</span></h2><p>好奇心，是最好的推进器。<br />一枚为未知而生的口袋火箭。</p><div className="category-line">原创设计<span>·</span>航天探索</div><div className="hero-actions"><PrimaryViewButton onClick={() => viewModel('rocket')} /><button className="button secondary" onClick={playGame}>玩游戏<ArrowRight size={21} /></button></div></div>
      <div className="hero-bottom"><SelectionButton selected={selected.includes('rocket')} onClick={() => toggleSelection('rocket')} label="探索者 01" /><InteractionHint /></div>
    </section>
    <div className="section-heading"><h2>更多创作素材</h2><span>选择模型，组合你的世界</span></div>
    <div className="asset-grid">{assets.slice(1).map(asset => <article className={`asset-card ${selected.includes(asset.id) ? 'is-selected' : ''}`} key={asset.id}>
      <div className="card-selection"><SelectionButton compact selected={selected.includes(asset.id)} onClick={() => toggleSelection(asset.id)} label={asset.name} /></div>
      <button className="asset-preview" aria-label={`查看${asset.name}`} onClick={() => viewModel(asset.id)}><ModelCanvas id={asset.id} compact /></button>
      <div className="asset-card-copy"><span className="small-id">{asset.english}</span><div className="asset-title-row"><h3>{asset.name}</h3><span>{asset.category}</span></div><ModelLink onClick={() => viewModel(asset.id)} /></div>
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

export function GameLibrary({ playGame, viewModel }: { playGame: () => void; viewModel: (id: AssetId) => void }) {
  return <>
    <PageHeading title="游戏" subtitle="让你的模型，拥有下一场冒险。" count="01 款游戏" />
    <section className="hero-showcase game-hero">
      <div className="hero-visual game-library-visual"><FlightPreview /></div>
      <div className="hero-copy"><span className="catalog-id">STARFLIGHT / 001</span><h2>星际穿行</h2><p>穿越敌军火线，<br />让星海重新归于宁静。</p><div className="category-line">街机挑战<span>·</span>单人<span>·</span>约 2–3 分钟</div><button className="button primary" onClick={playGame}><Gamepad2 size={21} />开始游戏<ArrowRight size={18} /></button></div>
      <div className="hero-bottom"><span className="quiet-status"><span className="status-dot" />键盘与触屏均可游玩</span><ModelLink onClick={() => viewModel('rocket')}>查看使用模型</ModelLink></div>
    </section>
    <div className="game-feature-row"><div><Timer /><h3>突破三重防线</h3><p>拦截战斗机与护卫舰，直面最终母舰。</p></div><div><Zap /><h3>拾取武器补给</h3><p>散弹、激光、追踪导弹，最高升至三级。</p></div><div><ShieldCheck /><h3>掌握战斗节奏</h3><p>精细移动避弹，冲击波清场，连击倍增得分。</p></div></div>
    <div className="editorial-note"><h3>从素材，到可玩的世界。</h3><p>为「探索者 01」装上双联火炮，<br />从静海基地启航，加入一场完整的星际空战。</p></div>
  </>
}
