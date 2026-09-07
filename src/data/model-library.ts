import { assets } from './catalog'
import type { AssetId, ModelAsset } from './catalog'
import { appleProduct, applePreviewUrl, appleModelUrl, isAppleProductId } from '../apple/specs'
import { djiProduct, djiFile, isDjiId } from '../dji/specs'
import { nvidiaProduct, nvidiaPreviewUrl, nvidiaModelUrl, isGeForceProductId, isNvidiaProductId } from '../nvidia/specs'
import { teslaProduct, teslaPreviewUrl, teslaModelUrl, isTeslaProductId } from '../tesla/specs'
import { consoleProduct, consolePreviewUrl, consoleModelUrl, isConsoleProductId } from '../consoles/specs'
import { isSpacecraftId } from '../spacecraft/specs'
import { isCarId } from '../racing/cars'

export const MODEL_BRANDS = { spacex: 'SpaceX', apple: 'Apple', dji: 'DJI', nvidia: 'NVIDIA', tesla: 'Tesla', microsoft: 'Microsoft', sony: 'Sony', original: '原创' } as const
export const MODEL_TYPES = {
  rocket: '火箭', computer: '电脑', phone: '手机', tablet: '平板', drone: '无人机', camera: '相机',
  stabilizer: '稳定器', microphone: '麦克风', headphones: '耳机', watch: '手表', headset: '头显',
  rack: '机柜', server: '服务器', gpu: 'GPU', console: '游戏主机', car: '汽车', robot: '机器人', energy: '储能设备', charger: '充电桩', facility: '设施', nature: '自然',
} as const
export const MODEL_SOURCES = { official: '官网展示', reconstructed: '外观重建', original: '原创设计' } as const
export const MODEL_SORTS = { recommended: '推荐顺序', name: '名称 A–Z', brand: '按品牌' } as const
export type ModelBrand = keyof typeof MODEL_BRANDS
export type ModelType = keyof typeof MODEL_TYPES
export type ModelSource = keyof typeof MODEL_SOURCES
export interface ModelLibraryState {
  query: string
  brand: ModelBrand | 'all'
  type: ModelType | 'all'
  source: ModelSource | 'all'
  sort: keyof typeof MODEL_SORTS
}
export const DEFAULT_MODEL_FILTERS: ModelLibraryState = { query: '', brand: 'all', type: 'all', source: 'all', sort: 'recommended' }
export interface LibraryModel extends ModelAsset {
  brand: ModelBrand
  type: ModelType
  source: ModelSource
  aliases: readonly string[]
  preview?: string
  download?: string
}

const brandAliases: Record<ModelBrand, string> = {
  spacex: 'SpaceX 太空探索技术公司', apple: 'Apple 苹果', dji: 'DJI 大疆', nvidia: 'NVIDIA 英伟达 辉达 NV', tesla: 'Tesla 特斯拉', original: '原创 3D Studio',
  microsoft: 'Microsoft 微软', sony: 'Sony 索尼',
}
const typeAliases: Record<ModelType, string> = {
  rocket: 'rocket spacecraft 航天 太空', computer: 'computer desktop laptop 计算机 笔记本 台式机 工作站',
  phone: 'phone smartphone 智能手机', tablet: 'tablet', drone: 'drone UAV 飞行器', camera: 'camera 摄影 摄像机',
  stabilizer: 'gimbal 云台', microphone: 'microphone mic 收音', headphones: 'headphones earbuds', watch: 'watch 可穿戴',
  headset: 'headset VR AR 空间计算', rack: 'rack NV72 NVL72 液冷', server: 'server 算力', gpu: 'GPU 显卡 芯片',
  console: 'console gaming 游戏机 游戏主机 家用游戏机 电玩',
  car: 'car vehicle 汽车 车辆', robot: 'robot robotics 机器人', energy: 'energy battery storage 电池 储能 能源', charger: 'charger charging 充电', facility: 'facility 建筑 基地', nature: 'nature rock 岩石',
}

function describeModel(asset: ModelAsset): LibraryModel {
  if (isConsoleProductId(asset.id)) {
    const product = consoleProduct(asset.id)
    return { ...asset, brand: product.brand, type: 'console', source: 'reconstructed', aliases: [product.family, product.edition, ...product.aliases, ...product.features], preview: consolePreviewUrl(asset.id), download: consoleModelUrl(asset.id) }
  }
  if (isTeslaProductId(asset.id)) {
    const product = teslaProduct(asset.id)
    const types: Record<typeof product.family, ModelType> = { '汽车': 'car', '机器人': 'robot', '储能设备': 'energy', '充电桩': 'charger' }
    return { ...asset, brand: 'tesla', type: types[product.family], source: 'reconstructed', aliases: [...product.aliases, ...product.features], preview: teslaPreviewUrl(asset.id), download: teslaModelUrl(asset.id) }
  }
  if (isAppleProductId(asset.id)) {
    const product = appleProduct(asset.id)
    const types: Record<string, ModelType> = { iPhone: 'phone', Mac: 'computer', iPad: 'tablet', Vision: 'headset', Watch: 'watch', AirPods: 'headphones' }
    const type = types[product.family]
    if (!type) throw new Error(`Missing model type: ${asset.id}`)
    return { ...asset, brand: 'apple', type, source: 'official', aliases: [product.family], preview: applePreviewUrl(asset.id), download: appleModelUrl(asset.id) }
  }
  if (isDjiId(asset.id)) {
    const product = djiProduct(asset.id)
    const types: Record<typeof product.category, ModelType> = { 'Osmo 相机': 'camera', '无人机': 'drone', '稳定器': 'stabilizer', '麦克风': 'microphone' }
    return { ...asset, brand: 'dji', type: product.id === 'dji-ronin-4d' ? 'camera' : types[product.category], source: product.quality,
      aliases: [product.family, product.category, ...product.features], preview: `/models/dji/thumbnails/${product.slug}.webp`, download: djiFile(asset.id).file }
  }
  if (isNvidiaProductId(asset.id)) {
    const product = nvidiaProduct(asset.id)
    const types: Record<typeof product.family, ModelType> = { '机柜': 'rack', '服务器': 'server', GPU: 'gpu', '桌面': 'computer' }
    return { ...asset, brand: 'nvidia', type: types[product.family], source: 'reconstructed',
      aliases: [...product.features, ...(isGeForceProductId(asset.id) ? ['GeForce', 'FE', '创始版', '公版显卡'] : []), ...(asset.id === 'nvidia-dgx-station' ? ['NV Studio', 'NVIDIA Studio'] : [])],
      preview: nvidiaPreviewUrl(asset.id), download: nvidiaModelUrl(asset.id) }
  }
  if (isSpacecraftId(asset.id)) return { ...asset, brand: 'spacex', type: 'rocket', source: 'reconstructed', aliases: asset.id === 'starship' ? ['星舰 超级重型 Starship Super Heavy'] : asset.id === 'falcon-heavy' ? ['重型猎鹰 猎鹰重型 Falcon Heavy FH 双助推器 双芯回收'] : ['猎鹰9号 Falcon 9'], download: `/models/${asset.id}.glb` }
  if (isCarId(asset.id)) return { ...asset, brand: 'original', type: 'car', source: 'original', aliases: ['方程式赛车', 'racing', 'F1'], download: `/models/${asset.id}.glb` }
  const types = { rocket: 'rocket', basalt: 'nature', launchpad: 'facility', antenna: 'facility' } as const
  return { ...asset, brand: 'original', type: types[asset.id as keyof typeof types], source: 'original', aliases: [] }
}

const featured: AssetId[] = ['falcon-heavy', 'starship', 'apple-iphone-17-pro', 'dji-osmo-pocket-4p', 'nvidia-gb300-nvl72', 'tesla-cybertruck', 'tesla-optimus', 'nvidia-rtx-5090', 'microsoft-xbox-series-x', 'sony-ps5-pro', 'apple-macbook-pro', 'nvidia-dgx-spark', 'dji-mavic-4-pro', 'falcon-9']
export const libraryModels = assets.map(describeModel).sort((a, b) => {
  const rank = (id: AssetId) => featured.includes(id) ? featured.indexOf(id) : featured.length
  return rank(a.id) - rank(b.id)
})
export const libraryModelById = Object.fromEntries(libraryModels.map(model => [model.id, model])) as Record<AssetId, LibraryModel>
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
const searchIndex = new Map(libraryModels.map(model => {
  const fields = [model.name, model.id, model.english, model.description, brandAliases[model.brand], MODEL_TYPES[model.type], typeAliases[model.type], ...model.aliases]
  const text = fields.join(' ').normalize('NFKC').toLocaleLowerCase()
  // Preserve field boundaries so "Series X" followed by "Microsoft" cannot
  // produce the unrelated GPU search term "SXM" when whitespace is removed.
  return [model.id, { compact: fields.map(normalize), words: new Set(text.match(/[\p{L}\p{N}]+/gu) || []) }]
}))
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

export function filterModels(state: ModelLibraryState): LibraryModel[] {
  const terms = state.query.trim().split(/\s+/u).map(normalize).filter(Boolean)
  const result = libraryModels.filter(model => (state.brand === 'all' || model.brand === state.brand)
    && (state.type === 'all' || model.type === state.type)
    && (state.source === 'all' || model.source === state.source)
    // Single-letter variants (Series X / S, Model X / S) must match a word,
    // otherwise the X in "Xbox" makes both Series consoles match Series X.
    && terms.every(term => /^[a-z]$/.test(term) ? searchIndex.get(model.id)!.words.has(term) : searchIndex.get(model.id)!.compact.some(field => field.includes(term))))
  if (state.sort === 'name') result.sort((a, b) => collator.compare(a.name, b.name))
  if (state.sort === 'brand') result.sort((a, b) => collator.compare(MODEL_BRANDS[a.brand], MODEL_BRANDS[b.brand]) || collator.compare(a.name, b.name))
  return result
}

export function readModelFilters(hash: string): ModelLibraryState {
  const [route, query] = hash.replace(/^#/, '').split('?')
  if (route !== 'models') return { ...DEFAULT_MODEL_FILTERS }
  const params = new URLSearchParams(query)
  const brand = params.get('brand') ?? '', type = params.get('type') ?? '', source = params.get('source') ?? '', sort = params.get('sort') ?? ''
  return { query: params.get('q') ?? '', brand: Object.hasOwn(MODEL_BRANDS, brand) ? brand as ModelBrand : 'all',
    type: Object.hasOwn(MODEL_TYPES, type) ? type as ModelType : 'all', source: Object.hasOwn(MODEL_SOURCES, source) ? source as ModelSource : 'all',
    sort: Object.hasOwn(MODEL_SORTS, sort) ? sort as ModelLibraryState['sort'] : 'recommended' }
}

export function modelLibraryHash(state: ModelLibraryState): string {
  const params = new URLSearchParams()
  if (state.query) params.set('q', state.query)
  for (const key of ['brand', 'type', 'source', 'sort'] as const) if (state[key] !== DEFAULT_MODEL_FILTERS[key]) params.set(key, state[key])
  return `#models${params.size ? `?${params}` : ''}`
}
