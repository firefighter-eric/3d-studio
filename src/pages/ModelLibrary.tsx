import { useLayoutEffect } from 'react'
import { ArrowRight, ArrowUpRight, Boxes, Search, X } from 'lucide-react'
import { assetById } from '../data/catalog'
import type { AssetId } from '../data/catalog'
import { DEFAULT_MODEL_FILTERS, filterModels, libraryModels, MODEL_BRANDS, MODEL_SORTS, MODEL_SOURCES, MODEL_TYPES } from '../data/model-library'
import type { ModelLibraryState } from '../data/model-library'
import { ModelCanvas } from '../components/StudioCanvas'
import { VisiblePreview } from '../components/VisiblePreview'
import { PageHeading, SelectionButton } from '../components/Interface'

interface Props {
  selected: AssetId[]
  toggleSelection: (id: AssetId) => void
  viewModel: (id: AssetId) => void
  addSelected: () => void
  filters: ModelLibraryState
  updateFilters: (filters: ModelLibraryState) => void
  restoreFocus?: AssetId
}

export function ModelLibrary({ selected, toggleSelection, viewModel, addSelected, filters, updateFilters, restoreFocus }: Props) {
  const results = filterModels(filters)
  const change = (value: Partial<ModelLibraryState>) => updateFilters({ ...filters, ...value })
  const reset = () => updateFilters({ ...DEFAULT_MODEL_FILTERS })
  const filtered = filters.query || filters.brand !== 'all' || filters.type !== 'all' || filters.source !== 'all'
  useLayoutEffect(() => {
    if (restoreFocus) document.getElementById(`view-${restoreFocus}`)?.focus({ preventScroll: true })
  }, [restoreFocus])
  return <div className="model-library">
    <PageHeading title="模型库" subtitle="从喜欢的形状，开始下一次创作。" count={`${libraryModels.length} 个模型 · ${Object.keys(MODEL_BRANDS).length} 个品牌`} />
    <section className="model-filters" aria-label="查找模型">
      <div className="model-search-row">
        <label className="model-search"><Search size={21} aria-hidden="true" /><input type="search" aria-label="搜索全部模型" placeholder="搜索名称、品牌或型号，如 苹果、Starship、NV72" value={filters.query} onChange={event => change({ query: event.target.value })} />{filters.query && <button type="button" aria-label="清除搜索" onClick={() => change({ query: '' })}><X size={17} /></button>}</label>
        <span className="model-search-note">找到 · 查看 · 加入场景</span>
      </div>
      <div className="model-brand-row"><span className="model-filter-label">品牌</span><div className="model-brand-options" role="group" aria-label="品牌筛选">
        {(['all', ...Object.keys(MODEL_BRANDS)] as ModelLibraryState['brand'][]).map(brand => <button key={brand} type="button" aria-pressed={filters.brand === brand} onClick={() => change({ brand })}><span>{brand === 'all' ? '全部' : MODEL_BRANDS[brand]}</span><small>{brand === 'all' ? libraryModels.length : libraryModels.filter(model => model.brand === brand).length}</small></button>)}
      </div></div>
      <div className="model-filter-row">
        <label><span>类型</span><select aria-label="模型类型" value={filters.type} onChange={event => change({ type: event.target.value as ModelLibraryState['type'] })}><option value="all">全部类型</option>{Object.entries(MODEL_TYPES).map(([value, label]) => <option key={value} value={value}>{label} · {libraryModels.filter(model => model.type === value).length}</option>)}</select></label>
        <label><span>来源</span><select aria-label="模型来源" value={filters.source} onChange={event => change({ source: event.target.value as ModelLibraryState['source'] })}><option value="all">全部来源</option>{Object.entries(MODEL_SOURCES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {filtered && <button className="model-clear-filters" onClick={reset}><X size={14} />清除筛选</button>}
      </div>
    </section>
    <div className="model-results-bar"><p role="status" aria-live="polite"><strong>{results.length}</strong> 个模型{filtered && <span> / 全部 {libraryModels.length} 个</span>}</p><label className="model-sort"><span>排序</span><select aria-label="模型排序" value={filters.sort} onChange={event => change({ sort: event.target.value as ModelLibraryState['sort'] })}>{Object.entries(MODEL_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="model-grid">{results.map(model => <article className={`model-card ${selected.includes(model.id) ? 'is-selected' : ''}`} data-model-id={model.id} key={model.id}>
      <div className="model-card-select"><SelectionButton compact selected={selected.includes(model.id)} onClick={() => toggleSelection(model.id)} label={model.name} /></div>
      <button id={`view-${model.id}`} className="model-card-preview" aria-label={`查看${model.name}`} onClick={() => viewModel(model.id)}>
        {model.preview ? <img src={model.preview} alt={`${model.name}三维模型预览`} width="600" height="450" loading="lazy" decoding="async" /> : <VisiblePreview><ModelCanvas id={model.id} compact /></VisiblePreview>}
      </button>
      <div className="model-card-copy"><div className="model-card-meta"><span>{MODEL_BRANDS[model.brand]}</span><span>{MODEL_TYPES[model.type]}</span></div><h2>{model.name}</h2><p>{model.description}</p><div className="model-card-footer"><span className={`model-source ${model.source}`}>{MODEL_SOURCES[model.source]}</span><button className="text-link" aria-label={`查看${model.name}详情`} onClick={() => viewModel(model.id)}>查看模型<ArrowUpRight size={16} /></button></div></div>
    </article>)}</div>
    {!results.length && <div className="model-empty"><Search size={30} /><h2>没有找到匹配的模型</h2><p>试试其他名称，或调整品牌、类型和来源。</p><button className="button secondary" onClick={reset}>查看全部模型<ArrowRight size={17} /></button></div>}
    {selected.length > 0 && <div className="selection-tray"><div><Boxes size={20} /><span>已选择 <strong>{selected.length}</strong> 个模型</span><span className="selected-names">{selected.map(id => assetById[id].name).join('、')}</span></div><button className="button primary" onClick={addSelected}>加入发射基地<ArrowRight size={17} /></button></div>}
    <p className="model-library-note">官网展示模型保留来源信息；外观重建模型依据公开资料制作，局部细节近似。</p>
  </div>
}
