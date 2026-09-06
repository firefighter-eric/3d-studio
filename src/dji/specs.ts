import products from './products.json'
import manifest from './manifest.json'

export type DjiId = keyof typeof manifest
export type DjiCategory = 'Osmo 相机' | '无人机' | '稳定器' | '麦克风'
export interface DjiVariant { key: string; label: string; source?: string; sourceSha256?: string }
export interface DjiProduct {
  id: DjiId; slug: string; name: string; category: DjiCategory; family: string
  quality: 'official' | 'reconstructed'; description: string; features: string[]
  source: string; referenceImage: string; variants: DjiVariant[]
}
export interface DjiFile {
  file: string; bytes: number; triangles: number; meshes: number; textures: number
  dimensions: number[]; sha256: string; sourceSha256?: string
}
export const DJI_PRODUCTS = products as DjiProduct[]
export const DJI_CATEGORIES: DjiCategory[] = ['Osmo 相机', '无人机', '稳定器', '麦克风']
const byId = new Map(DJI_PRODUCTS.map(product => [product.id, product]))
export function isDjiId(id: string): id is DjiId { return byId.has(id as DjiId) }
export function djiProduct(id: DjiId) { return byId.get(id)! }
export function djiFile(id: DjiId, variant = 'default'): DjiFile {
  const variants = manifest[id].variants as Record<string, DjiFile>
  return variants[variant] ?? variants.default
}
export function qualityLabel(quality: DjiProduct['quality']) { return quality === 'official' ? '官网展示模型' : '外观近似模型' }
export function filterDjiProducts(category: string, quality: string, query: string) {
  const search = query.trim().toLocaleLowerCase().replace(/\s+/g, '')
  return DJI_PRODUCTS.filter(product => (category === '全部' || product.category === category)
    && (quality === 'all' || product.quality === quality)
    && (!search || `${product.name}${product.category}${product.family}${product.description}`.toLocaleLowerCase().replace(/\s+/g, '').includes(search)))
}
