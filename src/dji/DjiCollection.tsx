import { useState } from 'react'
import { ArrowUpRight, Camera, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { DjiCanvas } from './DjiCanvas'
import { DJI_CATEGORIES, DJI_PRODUCTS, djiFile, filterDjiProducts, qualityLabel } from './specs'
import type { DjiId } from './specs'
import type { AssetId } from '../data/catalog'
import { SelectionButton } from '../components/Interface'
import { VisiblePreview } from '../components/VisiblePreview'
import './dji.css'

const PAGE_SIZE = 6
export function DjiCollectionShortcut() {
  return <button className="dji-collection-shortcut" aria-label="跳到大疆产品收藏" onClick={() => {
    const section = document.getElementById('dji-collection')
    section?.scrollIntoView({ block: 'start' }); section?.focus({ preventScroll: true })
  }}><span><strong>DJI 大疆产品收藏</strong><small>Osmo · 无人机 · 稳定器 · 麦克风</small></span><span>{DJI_PRODUCTS.length} 款产品<ArrowUpRight size={18} /></span></button>
}
export function DjiCollection({ selected, toggleSelection, viewModel }: { selected: AssetId[]; toggleSelection: (id: AssetId) => void; viewModel: (id: AssetId) => void }) {
  const [category, setCategory] = useState('全部'), [quality, setQuality] = useState('all'), [query, setQuery] = useState(''), [page, setPage] = useState(0)
  const filtered = filterDjiProducts(category, quality, query)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pages - 1)
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const heroId: DjiId = 'dji-osmo-pocket-4p'
  const officialCount = DJI_PRODUCTS.filter(product => product.quality === 'official').length
  return <section id="dji-collection" tabIndex={-1} className="dji-collection" aria-label="DJI 大疆产品模型库">
    <div className="dji-hero">
      <div className="dji-hero-orbit" aria-hidden="true" />
      <div className="dji-hero-copy"><span className="catalog-id">DJI / PRODUCT COLLECTION</span><h2>每一面，<br />都有新视角。</h2><p>从掌中光影，到天空之上。<br />探索大疆 {DJI_PRODUCTS.length} 款设备的形态与细节。</p><button className="button primary" onClick={() => viewModel(heroId)}><Camera size={17} />探索 Osmo Pocket 4P<ArrowUpRight size={17} /></button><span className="dji-hero-note">按系列保留最新代 · 场景共用素材</span></div>
      <div className="dji-hero-model"><VisiblePreview><DjiCanvas id={heroId} hero /></VisiblePreview></div>
      <div className="dji-hero-caption"><span>OSMO POCKET 4P</span><span className="dji-quality reconstructed">外观近似模型</span></div>
    </div>
    <div className="dji-section-title"><div><span className="catalog-id">THE COLLECTION</span><h2>大疆产品</h2></div><p>{officialCount} 款官网展示模型 <span>·</span> {DJI_PRODUCTS.length - officialCount} 款外观近似模型</p></div>
    <div className="dji-filter-bar">
      <div className="dji-categories" role="group" aria-label="大疆产品分类">{['全部', ...DJI_CATEGORIES].map(name => <button key={name} aria-pressed={category === name} onClick={() => { setCategory(name); setPage(0) }}>{name}<span>{name === '全部' ? DJI_PRODUCTS.length : DJI_PRODUCTS.filter(p => p.category === name).length}</span></button>)}</div>
      <div className="dji-search-row"><label className="dji-search"><Search size={15} /><input type="search" aria-label="搜索大疆型号" placeholder="搜索型号，例如 Mavic" value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} />{query && <button aria-label="清除型号搜索" onClick={() => { setQuery(''); setPage(0) }}><X size={14} /></button>}</label><label className="dji-quality-filter"><SlidersHorizontal size={14} /><select aria-label="模型来源筛选" value={quality} onChange={event => { setQuality(event.target.value); setPage(0) }}><option value="all">全部模型来源</option><option value="official">官网展示模型</option><option value="reconstructed">外观近似模型</option></select></label></div>
    </div>
    <p className="dji-results" role="status">{filtered.length} 款模型{query && ` · “${query}”`}</p>
    <div className="dji-grid">{visible.map(product => <article className={`dji-card ${selected.includes(product.id) ? 'is-selected' : ''}`} key={product.id}>
      <div className="card-selection"><SelectionButton compact selected={selected.includes(product.id)} label={product.name} onClick={() => toggleSelection(product.id)} /></div>
      <button className="dji-preview" aria-label={`查看${product.name}`} onClick={() => viewModel(product.id)}><img src={`/models/dji/thumbnails/${product.slug}.webp`} alt={`${product.name}实际三维模型预览`} loading="lazy" width="600" height="450" /><span className="dji-preview-index">{product.category}</span></button>
      <div className="dji-card-copy"><div className="dji-card-topline"><span className={`dji-quality ${product.quality}`}>{qualityLabel(product.quality)}</span><span>{(djiFile(product.id).triangles / 10000).toFixed(1)} 万面</span></div><h3>{product.name}</h3><p>{product.description}</p><button className="text-link" onClick={() => viewModel(product.id)}>查看三维模型<ArrowUpRight size={16} /></button></div>
    </article>)}</div>
    {!filtered.length && <div className="dji-empty"><Search size={24} /><h3>没有找到匹配的型号</h3><p>试试其他关键词，或调整分类与模型来源。</p><button className="button secondary" onClick={() => { setQuery(''); setCategory('全部'); setQuality('all'); setPage(0) }}>清除筛选</button></div>}
    <div className="dji-pagination"><p>近似模型依据产品照片制作，适合外观展示与创意场景。</p>{pages > 1 && <div><button aria-label="大疆模型上一页" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><span>{currentPage + 1} / {pages}</span><button aria-label="大疆模型下一页" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></div>}</div>
  </section>
}
