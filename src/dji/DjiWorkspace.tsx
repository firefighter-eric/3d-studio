import { useRef, useState } from 'react'
import { ArrowUpRight, Box, Download, Plus } from 'lucide-react'
import { BackButton, InteractionHint, SelectionButton, ViewToolbar } from '../components/Interface'
import type { ViewActions } from '../components/StudioCanvas'
import { DjiCanvas } from './DjiCanvas'
import { djiProduct, djiFile, qualityLabel } from './specs'
import type { DjiId } from './specs'
import './dji.css'

export function DjiWorkspace({ id, selected, toggleSelection, back, add }: { id: DjiId; selected: boolean; toggleSelection: () => void; back: () => void; add: () => void }) {
  const product = djiProduct(id), actions = useRef<ViewActions>(null)
  const [variant, setVariant] = useState('default'), [autoRotate, setAutoRotate] = useState(false)
  const info = djiFile(id, variant), official = product.quality === 'official'
  return <>
    <div className="workspace-heading"><BackButton onClick={back}>返回模型</BackButton><span>DJI / {product.category}</span></div>
    <section className="workspace-layout dji-workspace">
      <div className="workspace-canvas">
        <DjiCanvas key={`${id}-${variant}`} id={id} variant={variant} autoRotate={autoRotate} ref={actions} />
        <div className="canvas-label"><Box size={15} />{product.name}</div>
        <div className="dji-view-note"><span className={`dji-quality ${product.quality}`}>{qualityLabel(product.quality)}</span><span>{(info.triangles / 10000).toFixed(1)} 万三角面 · PBR 材质</span></div>
        {product.variants.length > 1 && <div className="dji-variant-switch" role="group" aria-label="产品模型构型">{product.variants.map(item => <button key={item.key} aria-pressed={item.key === variant} onClick={() => { setVariant(item.key); setAutoRotate(false) }}>{item.label}</button>)}</div>}
        <ViewToolbar actions={actions} autoRotate={autoRotate} setAutoRotate={setAutoRotate} />
        <div className="workspace-hint"><InteractionHint scene /></div>
      </div>
      <aside className="workspace-sidebar">
        <div className="sidebar-title"><span className="catalog-id">DJI · {product.category}</span><h1>{product.name}</h1><p>{product.description}</p></div>
        <div className={`dji-source-note ${product.quality}`}><strong>{qualityLabel(product.quality)}</strong><p>{official ? '来自 DJI 官网的三维展示文件，保留原始外观几何和材质细节。' : '依据 DJI 产品照片重新建模。外壳、镜头、接口与比例为近似复原，非官方 CAD。'}</p></div>
        <div className="spacecraft-features">{product.features.map(feature => <span key={feature}>{feature}</span>)}</div>
        <dl className="model-details"><div><dt>当前构型</dt><dd>{product.variants.find(item => item.key === variant)?.label}</dd></div><div><dt>三角面</dt><dd>{Math.round(info.triangles).toLocaleString()}</dd></div><div><dt>模型文件</dt><dd>GLB · {(info.bytes / 1048576).toFixed(2)} MB</dd></div><div><dt>使用方式</dt><dd>环绕查看 · 场景组合</dd></div></dl>
        <SelectionButton selected={selected} onClick={toggleSelection} label={product.name} />
        <button className="button primary full-width" onClick={add}><Plus size={18} />加入发射基地</button>
        <a className="button secondary full-width" href={info.file} download={`${product.slug}-${variant}.glb`}><Download size={17} />下载当前构型 GLB</a>
        <a className="dji-source-link" href={product.source} target="_blank" rel="noreferrer">DJI 官方产品参考<ArrowUpRight size={14} /></a>
        <p className="sidebar-footnote">{official ? '展示资源版权归 DJI；用于产品外观查看，不代表工程级尺寸精度。' : '细节与实物可能不同，适合展示与场景创作，不用于测量或零件加工。'} 场景中按展示比例放大。</p>
      </aside>
    </section>
  </>
}
