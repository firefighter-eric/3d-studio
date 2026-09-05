import { useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Box, Check, Download, Layers, Plus, Trash2, Undo2 } from 'lucide-react'
import { assets, assetById, baseInstances, MAX_ADDITIONS } from '../data/catalog'
import type { AssetId, SceneInstance } from '../data/catalog'
import { ModelCanvas, WorldCanvas } from '../components/StudioCanvas'
import type { ViewActions } from '../components/StudioCanvas'
import { BackButton, InteractionHint, SelectionButton, ViewToolbar } from '../components/Interface'
import { isCarId,carSpec } from '../racing/cars'

export function ModelWorkspace({ id, selected, toggleSelection, back, play, add }: { id: AssetId; selected: boolean; toggleSelection: () => void; back: () => void; play: () => void; add: () => void }) {
  const asset = assetById[id], actions = useRef<ViewActions>(null)
  const car=isCarId(id)?carSpec(id):null
  const [autoRotate, setAutoRotate] = useState(false)
  return <>
    <div className="workspace-heading"><BackButton onClick={back}>返回模型</BackButton><span>{asset.english}</span></div>
    <section className="workspace-layout">
      <div className="workspace-canvas"><ModelCanvas key={id} id={id} ref={actions} autoRotate={autoRotate} /><div className="canvas-label"><Box size={15} />{asset.name}</div><ViewToolbar actions={actions} autoRotate={autoRotate} setAutoRotate={setAutoRotate} /><div className="workspace-hint"><InteractionHint /></div></div>
      <aside className="workspace-sidebar"><div className="sidebar-title"><span className="catalog-id">{asset.category}</span><h1>{asset.name}</h1><p>{asset.description}</p></div><p className="detail-description">{asset.detail}</p><dl className="model-details"><div><dt>创作方式</dt><dd>{car?'程序化建模 · GLB':'原创设计'}</dd></div><div><dt>使用方式</dt><dd>查看 · 场景组合{id === 'rocket' || id === 'basalt' || car ? ' · 游戏' : ''}</dd></div><div><dt>收藏位置</dt><dd>模型 / {asset.category}</dd></div></dl><SelectionButton selected={selected} onClick={toggleSelection} label={asset.name} /><button className="button primary full-width" onClick={add}><Plus size={18} />加入发射基地</button>{car&&<><div className="formula-spec-list">{['极速','加速','操控'].map((name,i)=><div key={name}><span>{name}</span><div><i style={{width:`${car.bars[i]}%`}}/></div></div>)}</div><a className="button secondary full-width formula-download" href={`/models/${id}.glb`} download><Download size={17}/>下载赛车 GLB</a></>}{(id === 'rocket' || id === 'basalt' || car) && <button className="button secondary full-width" onClick={play}>{car?'驾驶赛车':'玩游戏'}<ArrowRight size={18} /></button>}<p className="sidebar-footnote">拖动查看各个角度，双指捏合可缩放。工具栏也支持键盘操作。</p></aside>
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
