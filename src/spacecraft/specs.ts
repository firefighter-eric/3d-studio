export const SPACECRAFT = [
  {
    id: 'falcon-9', name: '猎鹰 9 号', english: 'FALCON 9 / BLOCK 5',
    configuration: 'Block 5 · 标准整流罩', height: 70, diameter: 3.7,
    engines: '9 × Merlin 1D + 1 × MVac',
    description: '一次出发，无数次归来。',
    detail: '70 米修长箭体、黑色级间段与双瓣整流罩。九台 Merlin 发动机、四片钛合金栅格翼、收拢着陆腿和外部管线，逐一构成可近距离探索的猎鹰 9 号。',
    features: ['Octaweb 九机布局', '镂空栅格翼', '四组收拢着陆腿', '可分离双瓣整流罩'],
    source: 'https://www.spacex.com/vehicles/falcon-9/',
    sourceLabel: 'SpaceX · Falcon 9',
  },
  {
    id: 'starship', name: '星舰', english: 'STARSHIP / SUPER HEAVY',
    configuration: '52 m 星舰 + 72 m 超级重型', height: 124, diameter: 9,
    engines: '33 × Raptor + 3 × Raptor / 3 × RVac',
    description: '让更远的世界，成为下一站。',
    detail: '不锈钢环焊箭体与逐片建模的六边形隔热瓦。完整组合体包含超级重型助推器、通风热分级环及星舰；四片气动襟翼和 33 + 6 台发动机均为真实三维结构。',
    features: ['六边形隔热瓦网格', '33 + 6 台发动机', '通风热分级环', '四片气动襟翼'],
    source: 'https://www.spacex.com/vehicles/starship/',
    sourceLabel: 'SpaceX · Starship',
  },
] as const

export type SpacecraftId = typeof SPACECRAFT[number]['id']
export type SpacecraftView = 'full' | 'upper' | 'engines'
export const isSpacecraftId = (id: string): id is SpacecraftId => SPACECRAFT.some(item => item.id === id)
export const spacecraftSpec = (id: SpacecraftId) => SPACECRAFT.find(item => item.id === id)!
// GLBs retain metres. The studio uses a shared scale for both scene instances.
export const SPACECRAFT_SCENE_SCALE = 0.08
