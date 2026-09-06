import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { ModelLink, SelectionButton } from '../components/Interface'
import type { AssetId } from '../data/catalog'
import { APPLE_FAMILIES, APPLE_PRODUCTS, applePreviewUrl } from './specs'
import type { AppleProductId } from './specs'
import './apple.css'

export function AppleCollection({ selected, toggleSelection, viewModel }: {
  selected: AssetId[]; toggleSelection: (id: AssetId) => void; viewModel: (id: AssetId) => void
}) {
  const [family, setFamily] = useState<typeof APPLE_FAMILIES[number]>('全部')
  const visible = APPLE_PRODUCTS.filter(product => family === '全部' || product.family === family)
  return <section className="apple-collection" aria-labelledby="apple-collection-title">
    <div className="apple-collection-heading">
      <div><span className="catalog-id">APPLE / PRODUCT COLLECTION</span><h2 id="apple-collection-title" tabIndex={-1}>熟悉的设计，换个角度。</h2><p>从掌心、桌面，到空间计算。探索 Apple 产品的每一面。</p></div>
      <button className="text-link" onClick={() => viewModel('apple-vision-pro')}>探索 Vision Pro<ArrowUpRight size={17} /></button>
    </div>
    <div className="apple-collection-controls"><div className="apple-family-filter" role="group" aria-label="Apple 产品系列">{APPLE_FAMILIES.map(item => <button key={item} aria-pressed={family === item} onClick={() => setFamily(item)}>{item}</button>)}</div><span className="apple-result-count" role="status">{visible.length} 款产品</span></div>
    <div className="asset-grid apple-product-grid">{visible.map(product => <article className={`asset-card apple-product-card ${selected.includes(product.id) ? 'is-selected' : ''}`} key={product.id}>
      <div className="card-selection"><SelectionButton compact selected={selected.includes(product.id)} onClick={() => toggleSelection(product.id)} label={product.name} /></div>
      <button className="asset-preview" aria-label={`查看${product.name}`} onClick={() => viewModel(product.id)}><img src={applePreviewUrl(product.id as AppleProductId)} width="768" height="512" loading="lazy" decoding="async" alt={`${product.name}，${product.finish}`} /></button>
      <div className="asset-card-copy"><span className="small-id">APPLE / {product.family.toUpperCase()}</span><div className="asset-title-row"><h3>{product.name}</h3></div><p className="apple-product-finish">{product.finish}</p><ModelLink onClick={() => viewModel(product.id)} /></div>
    </article>)}</div>
  </section>
}

export function AppleCollectionShortcut() {
  return <button className="apple-collection-shortcut" onClick={() => {
    const heading = document.getElementById('apple-collection-title')
    heading?.scrollIntoView({ block: 'start' })
    heading?.focus({ preventScroll: true })
  }}><span><strong>Apple 产品收藏</strong><small>iPhone · Mac · iPad · Vision Pro · Watch · AirPods</small></span><span>{APPLE_PRODUCTS.length} 款产品<ArrowUpRight size={18} /></span></button>
}
