import manifest from './manifest.json'
import type { TeslaProductId } from './products'
export { TESLA_PRODUCTS, isTeslaProductId, teslaProduct } from './products'
export type { TeslaProductId } from './products'
export function teslaModelInfo(id: TeslaProductId) { return manifest[id] }
export function teslaModelUrl(id: TeslaProductId) { return `/models/tesla/${id}.glb` }
export function teslaPreviewUrl(id: TeslaProductId) { return `/models/tesla/${id}.webp` }
export function teslaDisplayHeight(id: TeslaProductId) { return manifest[id].dimensions[1] / Math.max(...manifest[id].dimensions) }
