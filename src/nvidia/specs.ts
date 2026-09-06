import manifest from './manifest.json'
import type { NvidiaProductId } from './products'
export { NVIDIA_PRODUCTS, NVIDIA_FAMILIES, isNvidiaProductId, nvidiaProduct } from './products'
export type { NvidiaProductId } from './products'
export function nvidiaModelInfo(id: NvidiaProductId) { return manifest[id] }
export function nvidiaModelUrl(id: NvidiaProductId) { return `/models/nvidia/${id}.glb` }
export function nvidiaPreviewUrl(id: NvidiaProductId) { return `/models/nvidia/${id}.webp` }
export function nvidiaDisplayHeight(id: NvidiaProductId) {
  const size = manifest[id].dimensions
  return size[1] / Math.max(...size)
}
