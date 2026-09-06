import products from './products.json'
import manifest from './manifest.json'

export type AppleProductId = keyof typeof manifest
export const APPLE_PRODUCTS = products as (Omit<typeof products[number], 'id'> & { id: AppleProductId })[]
export const APPLE_FAMILIES = ['全部', 'iPhone', 'Mac', 'iPad', 'Vision', 'Watch', 'AirPods'] as const
export function isAppleProductId(id: string): id is AppleProductId { return Object.hasOwn(manifest, id) }
export function appleProduct(id: AppleProductId) { return APPLE_PRODUCTS.find(product => product.id === id)! }
export function appleModelInfo(id: AppleProductId) { return manifest[id] }
export function appleModelUrl(id: AppleProductId) { return `/models/apple/${id}.glb` }
export function applePreviewUrl(id: AppleProductId) { return `/models/apple/${id}.png` }
export function appleDisplayHeight(id: AppleProductId) {
  const dimensions = manifest[id].dimensions
  return dimensions[1] / Math.max(...dimensions)
}
