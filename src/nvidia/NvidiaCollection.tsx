import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { ModelLink, SelectionButton } from '../components/Interface'
import type { AssetId } from '../data/catalog'
import { NVIDIA_PRODUCTS, NVIDIA_FAMILIES, nvidiaPreviewUrl } from './specs'
import './nvidia.css'

export function NvidiaCollection({ selected, toggleSelection, viewModel }: {
  selected: AssetId[]; toggleSelection: (id: AssetId) => void; viewModel: (id: AssetId) => void
}) {
  const [family, setFamily] = useState<typeof NVIDIA_FAMILIES[number]>('全部')
  const products = NVIDIA_PRODUCTS.filter(product => family === '全部' || product.family === family)
  return <section className="nvidia-collection" aria-labelledby="nvidia-collection-title">
    <div className="nvidia-heading">
      <div><span className="catalog-id">NVIDIA / COMPUTING COLLECTION</span><h2 id="nvidia-collection-title">算力，也有形状。</h2><p>从桌面 AI 到液冷机柜，探索 NVIDIA 硬件的每一面。</p></div>
      <button className="text-link" onClick={() => viewModel('nvidia-gb300-nvl72')}>探索 GB300 NVL72<ArrowUpRight size={17} /></button>
    </div>
    <div className="nvidia-controls"><div className="nvidia-filter" role="group" aria-label="NVIDIA 产品系列">{NVIDIA_FAMILIES.map(item => <button key={item} aria-pressed={family === item} onClick={() => setFamily(item)}>{item}</button>)}</div><span className="nvidia-count" role="status">{products.length} 款模型</span></div>
    <div className="asset-grid nvidia-grid">{products.map(product => <article className={`asset-card nvidia-card ${selected.includes(product.id) ? 'is-selected' : ''}`} key={product.id}>
      <div className="card-selection"><SelectionButton compact selected={selected.includes(product.id)} onClick={() => toggleSelection(product.id)} label={product.name} /></div>
      <button className="asset-preview" aria-label={`查看${product.name}`} onClick={() => viewModel(product.id)}><img src={nvidiaPreviewUrl(product.id)} width="900" height="600" loading="lazy" decoding="async" alt={`${product.name} 三维模型，${product.appearance}`} /></button>
      <div className="asset-card-copy"><span className="small-id">NVIDIA / {product.family}</span><div className="asset-title-row"><h3>{product.name}</h3></div><p className="nvidia-appearance">{product.appearance}</p><div className="nvidia-card-bottom"><ModelLink onClick={() => viewModel(product.id)} /><span>外观重建 · GLB</span></div></div>
    </article>)}</div>
    <p className="nvidia-collection-note">依 NVIDIA 公开资料制作的展示模型；局部细节近似。每款均可旋转查看、下载或加入场景。</p>
  </section>
}
