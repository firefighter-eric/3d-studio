import { CAR_SPECS } from '../racing/cars'
import type { CarId } from '../racing/cars'
import { SPACECRAFT, SPACECRAFT_SCENE_SCALE } from '../spacecraft/specs'
import type { SpacecraftId } from '../spacecraft/specs'
import { APPLE_PRODUCTS } from '../apple/specs'
import type { AppleProductId } from '../apple/specs'
import { DJI_PRODUCTS, qualityLabel } from '../dji/specs'
import type { DjiId } from '../dji/specs'
import { NVIDIA_PRODUCTS } from '../nvidia/specs'
import type { NvidiaProductId } from '../nvidia/specs'
export type AssetId = 'rocket' | 'basalt' | 'launchpad' | 'antenna' | CarId | SpacecraftId | AppleProductId | DjiId | NvidiaProductId
export type Vec3 = [number, number, number]

export interface ModelAsset {
  id: AssetId
  name: string
  english: string
  category: string
  description: string
  detail: string
  viewScale: number
  sceneScale: number
}

export const assets: ModelAsset[] = [
  ...NVIDIA_PRODUCTS.map(product => ({ id: product.id, name: product.name, english: `NVIDIA / ${product.english}`, category: `NVIDIA · ${product.family}`, description: product.description, detail: product.detail, viewScale: product.family === '机柜' ? 5.5 : 4.8, sceneScale: 2.6 })),
  ...DJI_PRODUCTS.map(product => ({ id: product.id, name: product.name, english: `DJI / ${product.slug.toUpperCase()}`, category: `DJI · ${product.category}`, description: product.description, detail: `${qualityLabel(product.quality)}。${product.features.join('、')}。支持环绕查看与场景组合。`, viewScale: 1, sceneScale: .55 })),
  ...APPLE_PRODUCTS.map(product => ({ id: product.id, name: product.name, english: `APPLE / ${product.family.toUpperCase()}`, category: 'Apple 产品', description: product.description, detail: product.detail, viewScale: 4.4, sceneScale: 2.2 })),
  ...SPACECRAFT.map(item => ({ id: item.id, name: item.name, english: item.english, category: '航天探索', description: item.description, detail: item.detail, viewScale: 5.8 / item.height, sceneScale: SPACECRAFT_SCENE_SCALE })),
  { id: 'rocket', name: '探索者 01', english: 'EXPLORER / 001', category: '航天探索', description: '好奇心，是最好的推进器。', detail: '一枚为未知而生的口袋火箭。象牙白机身、橙色尾翼与双舷窗，准备好奔向下一片星海。', viewScale: 1, sceneScale: 0.75 },
  { id: 'basalt', name: '玄武岩', english: 'BASALT / 002', category: '自然', description: '来自寂静星球的一块风景。', detail: '不规则的切面与深灰色岩层，为地表、星球和陨石带增加一点真实的粗粝感。', viewScale: 1.8, sceneScale: 1 },
  { id: 'launchpad', name: '发射平台', english: 'LAUNCH PAD / 003', category: '建筑', description: '每一次远行，都有一个起点。', detail: '八边形基座、环形导向线与周边信标，为火箭提供一处安静而可靠的出发地。', viewScale: 0.85, sceneScale: 0.65 },
  { id: 'antenna', name: '信号天线', english: 'RELAY / 004', category: '设施', description: '让遥远的世界，保持联系。', detail: '抛物面接收器与稳固支架组成的小型地面设施。指向星空，也连接每一次探索。', viewScale: 1.25, sceneScale: 1 },
  ...CAR_SPECS.map(car => ({ id: car.id, name: car.name, english: car.english, category: '方程式赛车', description: car.tagline, detail: `${car.role}型开放轮式赛车。独立前后翼、双叉臂悬挂、光头胎、Halo 与驾驶舱；${car.number} 号原创车队涂装。模型与湛蓝大奖赛共用，可下载标准 GLB。`, viewScale: 1, sceneScale: .85 })),
]

export const assetById = Object.fromEntries(assets.map(asset => [asset.id, asset])) as Record<AssetId, ModelAsset>

export interface SceneInstance {
  id: string
  assetId: AssetId
  position: Vec3
  rotation: Vec3
  scale: number
}

export const baseInstances: SceneInstance[] = [
  { id: 'pad-main', assetId: 'launchpad', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1.3 },
  { id: 'rocket-main', assetId: 'rocket', position: [0, 3.0, 0], rotation: [0, 0.2, 0], scale: 0.95 },
  { id: 'relay-west', assetId: 'antenna', position: [-6, 0, -4], rotation: [0, 0.5, 0], scale: 1.6 },
  { id: 'relay-east', assetId: 'antenna', position: [6, 0, -6], rotation: [0, -0.6, 0], scale: 1.3 },
  ...Array.from({ length: 12 }, (_, i): SceneInstance => {
    const angle = i * Math.PI * 2 / 12 + 0.13
    const radius = 10.5 + Math.sin(i * 2.4) * 1.8
    return { id: `rock-${i}`, assetId: 'basalt', position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius], rotation: [0, i * 1.1, 0], scale: 0.5 + (i % 4) * 0.2 }
  }),
]

export const scenes = [{ id: 'moonbase', name: '静海发射基地', english: 'TRANQUILITY BASE', description: '在月色与群山之间，为下一次出发做好准备。', assetIds: ['rocket', 'basalt', 'launchpad', 'antenna'] as AssetId[], instances: baseInstances }]
export const games = [
  { id: 'starflight', name: '星际穿行', english: 'STARFLIGHT', description: '穿越三重敌军防线，拾取武装补给，击败暗面母舰。', assetIds: ['rocket', 'basalt'] as AssetId[], sceneId: 'moonbase', duration: 150 },
  { id: 'azure-circuit', name: '湛蓝大奖赛', english: 'AZURE CIRCUIT', description: '驾驶方程式赛车，与五位对手角逐海岸线上的方格旗。', assetIds: CAR_SPECS.map(car => car.id) as AssetId[], trackId: 'azure-coast', laps: 3, duration: 240 },
]

const ADDITIONS_KEY = 'form-space.scene-additions.v1'
export const MAX_ADDITIONS = 12

export function readAdditions(): SceneInstance[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(ADDITIONS_KEY) || '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is SceneInstance => Boolean(item && typeof item.id === 'string' && item.id.startsWith('added-') && item.assetId in assetById && [item.position, item.rotation].every(v => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 100)) && typeof item.scale === 'number' && item.scale > 0 && item.scale <= 3)).slice(0, MAX_ADDITIONS)
  } catch { return [] }
}

export function saveAdditions(items: SceneInstance[]) {
  try { localStorage.setItem(ADDITIONS_KEY, JSON.stringify(items)) } catch { /* The scene remains usable when storage is unavailable. */ }
}

export function createInstances(ids: AssetId[], existing: SceneInstance[]): SceneInstance[] {
  const room = MAX_ADDITIONS - existing.length
  return ids.slice(0, room).map((assetId, i) => {
    const index = existing.length + i
    const col = index % 4
    const row = Math.floor(index / 4)
    const scale = assetById[assetId].sceneScale
    return { id: `added-${Date.now()}-${i}`, assetId, position: [-6 + col * 4, assetId === 'rocket' ? 2.5 * scale : 0, 5 + row * 3], rotation: [0, 0.25, 0], scale }
  })
}
