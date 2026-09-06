import manifest from './manifest.json'
import type { ConsoleProductId } from './products'
export { CONSOLE_PRODUCTS, isConsoleProductId, consoleProduct } from './products'
export type { ConsoleProductId } from './products'
export function consoleModelInfo(id: ConsoleProductId) { return manifest[id] }
export function consoleModelUrl(id: ConsoleProductId) { return `/models/consoles/${id}.glb` }
export function consolePreviewUrl(id: ConsoleProductId) { return `/models/consoles/${id}.webp` }
export function consoleDisplayHeight(id: ConsoleProductId) { return manifest[id].dimensions[1] / Math.max(...manifest[id].dimensions) }
