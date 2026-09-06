import { useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Box, Check, Download, Layers, Plus, Trash2, Undo2 } from 'lucide-react'
import { assets, assetById, baseInstances, MAX_ADDITIONS } from '../data/catalog'
import type { AssetId, SceneInstance } from '../data/catalog'
import { ModelCanvas, WorldCanvas } from '../components/StudioCanvas'
import type { ViewActions } from '../components/StudioCanvas'
import { BackButton, InteractionHint, SelectionButton, ViewToolbar } from '../components/Interface'
import { isCarId,carSpec } from '../racing/cars'
import { isSpacecraftId, spacecraftSpec } from '../spacecraft/specs'
import type { SpacecraftView } from '../spacecraft/specs'
import spacecraftManifest from '../spacecraft/manifest.json'
import { isAppleProductId, appleProduct } from '../apple/specs'
import { AppleDetails } from '../apple/AppleDetails'
import { isNvidiaProductId, nvidiaProduct } from '../nvidia/specs'
import { NvidiaDetails, NvidiaSourceNote } from '../nvidia/NvidiaDetails'
import { isTeslaProductId, teslaProduct } from '../tesla/specs'
import { TeslaDetails, TeslaSourceNote } from '../tesla/TeslaDetails'
import { isConsoleProductId, consoleProduct } from '../consoles/specs'
import { ConsoleDetails, ConsoleSourceNote } from '../consoles/ConsoleDetails'
import { isDjiId, djiProduct, djiFile } from '../dji/specs'
import { DjiCanvas } from '../dji/DjiCanvas'
import { libraryModelById, MODEL_BRANDS, MODEL_TYPES, MODEL_SOURCES } from '../data/model-library'

export function ModelWorkspace({ id, selected, toggleSelection, back, play, add }: { id: AssetId; selected: boolean; toggleSelection: () => void; back: () => void; play: () => void; add: () => void }) {
  const asset = libraryModelById[id], actions = useRef<ViewActions>(null)
  const car = isCarId(id) ? carSpec(id) : null
  const spacecraft = isSpacecraftId(id) ? spacecraftSpec(id) : null
  const apple = isAppleProductId(id) ? appleProduct(id) : null
  const nvidia = isNvidiaProductId(id) ? nvidiaProduct(id) : null
  const tesla = isTeslaProductId(id) ? teslaProduct(id) : null
  const consoleItem = isConsoleProductId(id) ? consoleProduct(id) : null
  const dji = isDjiId(id) ? djiProduct(id) : null
  const modelInfo = isSpacecraftId(id) ? spacecraftManifest[id] : null
  const [autoRotate, setAutoRotate] = useState(false), [separated, setSeparated] = useState(false)
  const [view, setView] = useState<SpacecraftView>('full'), [variant, setVariant] = useState('default')
  const djiInfo = dji ? djiFile(dji.id, variant) : null
  const download = djiInfo?.file ?? asset.download
  return <>
    <div className="workspace-heading"><BackButton onClick={back}>返回模型库</BackButton><span>{MODEL_BRANDS[asset.brand]} / {MODEL_TYPES[asset.type]}</span></div>
    <section className="workspace-layout model-workspace">
      <div className="workspace-canvas">
        {dji ? <DjiCanvas key={`${id}-${variant}`} id={dji.id} variant={variant} autoRotate={autoRotate} ref={actions} /> : <ModelCanvas key={id} id={id} ref={actions} autoRotate={autoRotate} separated={separated} view={view} />}
        <div className="canvas-label"><Box size={15} />{asset.name}</div>
        {spacecraft && <div className="model-view-options" role="group" aria-label="航天模型观察位置">{([['full', '全貌'], ['upper', '上面级'], ['engines', '发动机']] as const).map(([value, label]) => <button key={value} aria-pressed={view === value} onClick={() => { setAutoRotate(false); setView(value) }}>{label}</button>)}</div>}
        {dji && dji.variants.length > 1 && <div className="model-view-options" role="group" aria-label="产品模型构型">{dji.variants.map(item => <button key={item.key} aria-pressed={item.key === variant} onClick={() => { setVariant(item.key); setAutoRotate(false) }}>{item.label}</button>)}</div>}
        <ViewToolbar actions={actions} autoRotate={autoRotate} setAutoRotate={setAutoRotate} />
        <div className="workspace-hint"><InteractionHint scene /></div>
      </div>
      <aside className="workspace-sidebar">
        <div className="sidebar-title"><span className="catalog-id">{MODEL_BRANDS[asset.brand]} · {MODEL_TYPES[asset.type]}</span><h1>{asset.name}</h1><p>{asset.description}</p></div>
        <div className="model-detail-source"><span className={`model-source ${asset.source}`}>{MODEL_SOURCES[asset.source]}</span><span>{download ? 'GLB · 可下载' : '实时三维模型'}</span></div>
        <div className="model-actions">
          <SelectionButton selected={selected} onClick={toggleSelection} label={asset.name} />
          <button className="button primary full-width" onClick={add}><Plus size={18} />加入发射基地</button>
          {download && <a className="button secondary full-width" href={download} download={dji ? `${dji.slug}-${variant}.glb` : true}><Download size={17} />{dji && dji.variants.length > 1 ? '下载当前构型 GLB' : '下载模型 GLB'}</a>}
        </div>
        <p className="detail-description">{asset.detail}</p>
        {spacecraft ? <>
          <div className="spacecraft-features">{spacecraft.features.map(feature => <span key={feature}>{feature}</span>)}</div>
          <dl className="model-details spacecraft-details">
            <div><dt>构型</dt><dd>{spacecraft.configuration}</dd></div>
            <div><dt>高度 / 直径</dt><dd>{spacecraft.height} m / {spacecraft.diameter} m</dd></div>
            <div><dt>发动机</dt><dd>{spacecraft.engines}</dd></div>
            <div><dt>模型文件</dt><dd>GLB · {(modelInfo!.bytes / 1048576).toFixed(1)} MB · 米制</dd></div>
          </dl>
          <button className="button secondary full-width separation-button" aria-pressed={separated} onClick={() => { setSeparated(!separated); setView('full'); setAutoRotate(false) }}><Layers size={17} />{separated ? '合拢级段' : '分级展开'}<span>{separated ? 'ON' : 'OFF'}</span></button>
        </> : dji ? <>
          <div className="spacecraft-features">{dji.features.map(feature => <span key={feature}>{feature}</span>)}</div>
          <dl className="model-details"><div><dt>当前构型</dt><dd>{dji.variants.find(item => item.key === variant)?.label}</dd></div><div><dt>三角面</dt><dd>{Math.round(djiInfo!.triangles).toLocaleString()}</dd></div><div><dt>模型文件</dt><dd>GLB · {(djiInfo!.bytes / 1048576).toFixed(2)} MB</dd></div><div><dt>使用方式</dt><dd>环绕查看 · 场景组合</dd></div></dl>
        </> : apple ? <AppleDetails id={apple.id} /> : nvidia ? <NvidiaDetails id={nvidia.id} /> : tesla ? <TeslaDetails id={tesla.id} /> : consoleItem ? <ConsoleDetails id={consoleItem.id} /> : <dl className="model-details"><div><dt>创作方式</dt><dd>{car ? '程序化建模 · GLB' : '原创设计'}</dd></div><div><dt>使用方式</dt><dd>查看 · 场景组合{id === 'rocket' || id === 'basalt' || car ? ' · 游戏' : ''}</dd></div></dl>}
        {id === 'starship' && <a className="button secondary full-width" href="#animations/starship-recovery">观看发射与回收<ArrowRight size={17} /></a>}
        {id === 'falcon-heavy' && <a className="button secondary full-width" href="#animations/falcon-heavy-recovery">观看双助推器回收<ArrowRight size={17} /></a>}
        {car && <div className="formula-spec-list">{['极速', '加速', '操控'].map((name, i) => <div key={name}><span>{name}</span><div><i style={{ width: `${car.bars[i]}%` }} /></div></div>)}</div>}
        {(id === 'rocket' || id === 'basalt' || car) && <button className="button secondary full-width" onClick={play}>{car ? '驾驶赛车' : '玩游戏'}<ArrowRight size={18} /></button>}
        {spacecraft ? <p className="sidebar-footnote">依公开资料制作的外观展示模型，局部细节为近似复原。<a href={spacecraft.source} target="_blank" rel="noreferrer">{spacecraft.sourceLabel}<ArrowUpRight size={11} /></a></p> : dji ? <p className="sidebar-footnote">{dji.quality === 'official' ? '来自 DJI 官网的展示模型，版权归 DJI。' : '依据 DJI 产品照片制作，外壳、接口与比例为近似复原，非官方 CAD。'} 场景中按展示比例放大。<a href={dji.source} target="_blank" rel="noreferrer">DJI 官方产品参考<ArrowUpRight size={11} /></a></p> : apple ? <p className="sidebar-footnote">来自 Apple 官网的 AR 展示模型，已转换为 GLB。下载保留米制；加入场景时按展示比例放大。<a href={apple.source} target="_blank" rel="noreferrer">Apple 官方产品页面<ArrowUpRight size={11} /></a></p> : nvidia ? <NvidiaSourceNote id={nvidia.id} /> : tesla ? <TeslaSourceNote id={tesla.id} /> : consoleItem ? <ConsoleSourceNote id={consoleItem.id} /> : <p className="sidebar-footnote">拖动查看各个角度，双指捏合可缩放。工具栏也支持键盘操作。</p>}
      </aside>
    </section>
  </>
}

export function SceneWorkspace({ additions, selected, toggleSelection, addSelected, undo, clear, back, goModels }: { additions: SceneInstance[]; selected: AssetId[]; toggleSelection: (id: AssetId) => void; addSelected: () => void; undo: () => void; clear: () => void; back: () => void; goModels: () => void }) {
  const actions = useRef<ViewActions>(null), [autoRotate, setAutoRotate] = useState(false)
  const instances = [...baseInstances, ...additions]
  const full = additions.length >= MAX_ADDITIONS
  return <>
    <div className="workspace-heading"><BackButton onClick={back}>返回场景</BackButton><span>TRANQUILITY BASE</span></div>
    <section className="workspace-layout scene-workspace">
      <div className="workspace-canvas"><WorldCanvas instances={instances} ref={actions} autoRotate={autoRotate} /><div className="canvas-label"><Layers size={15} />静海发射基地</div><ViewToolbar actions={actions} autoRotate={autoRotate} setAutoRotate={setAutoRotate} /><div className="workspace-hint"><InteractionHint scene /></div><span className="instance-count">{instances.length} 个模型实例</span></div>
      <aside className="workspace-sidebar"><div className="sidebar-title"><span className="catalog-id">共享素材，组合世界</span><h1>静海发射基地</h1><p>选择模型，加入这片空间。</p></div><div className="scene-asset-options">{assets.map(asset => <button key={asset.id} className={selected.includes(asset.id) ? 'selected' : ''} aria-pressed={selected.includes(asset.id)} onClick={() => toggleSelection(asset.id)}><Box size={18} /><span>{asset.name}</span><span className="checkbox-mark">{selected.includes(asset.id) && <Check size={13} />}</span></button>)}</div><button className="button primary full-width" disabled={!selected.length || full} onClick={addSelected}><Plus size={18} />{full ? '新增空间已满' : `加入选中的模型${selected.length ? ` (${selected.length})` : ''}`}</button><p className="sidebar-footnote">新素材会依次排列在基地前方。最多新增 {MAX_ADDITIONS} 个实例，布局自动保存在本机。</p><div className="scene-added-heading"><span>本次新增</span><strong>{additions.length} / {MAX_ADDITIONS}</strong></div>{additions.length > 0 ? <><ul className="added-list">{additions.map((instance, i) => <li key={instance.id}><span>{assetById[instance.assetId].name}</span><small>{String(i + 1).padStart(2, '0')}</small></li>)}</ul><div className="scene-edit-actions"><button disabled={!additions.length} onClick={undo}><Undo2 size={15} />撤销上一个</button><button disabled={!additions.length} onClick={clear}><Trash2 size={15} />清空新增</button></div></> : <p className="empty-note">还没有新增模型。试着选中一件素材。</p>}<button className="text-link" onClick={goModels}>浏览全部模型<ArrowUpRight size={15} /></button></aside>
    </section>
  </>
}
