export const SPACECRAFT = [
  {
    id: 'falcon-heavy', name: '猎鹰重型', english: 'FALCON HEAVY / BLOCK 5',
    configuration: '三芯组合 · 双侧助推器', height: 70, diameter: 3.7,
    engines: '27 × Merlin 1D + 1 × MVac',
    description: '三芯并肩，两枚归来。',
    detail: '复用猎鹰 9 号的箭体与 Merlin 发动机建模，组合中央芯级和两枚带整流鼻锥的侧助推器。保留双瓣整流罩、27 台一级发动机、12 片栅格翼、12 条可展开着陆腿，以及侧芯连接和分离机构。',
    features: ['三芯与侧助推器独立分离', '27 台 Merlin 1D 与真空发动机', '侧芯鼻锥与连接支架', '铰接栅格翼与着陆腿'],
    source: 'https://www.spacex.com/vehicles/falcon-heavy/', sourceLabel: 'SpaceX · Falcon Heavy',
  },
  {
    id: 'falcon-9', name: '猎鹰 9 号', english: 'FALCON 9 / BLOCK 5',
    configuration: 'Block 5 · 标准整流罩', height: 70, diameter: 3.7,
    engines: '9 × Merlin 1D + 1 × MVac',
    description: '一次出发，无数次归来。',
    detail: '70 米修长箭体、黑色级间段与双瓣整流罩。九台 Merlin 发动机、四片钛合金栅格翼、收拢着陆腿和外部管线，逐一构成可近距离探索的猎鹰 9 号。',
    features: ['Octaweb 九机布局与泵体管线', '镂空栅格翼与铰链', '着陆腿伸缩支柱', '双瓣整流罩与内部加强筋'],
    source: 'https://www.spacex.com/vehicles/falcon-9/',
    sourceLabel: 'SpaceX · Falcon 9',
  },
  {
    id: 'starship', name: '星舰', english: 'STARSHIP / SUPER HEAVY',
    configuration: '52 m 星舰 + 72 m 超级重型', height: 124, diameter: 9,
    engines: '33 × Raptor + 3 × Raptor / 3 × RVac',
    description: '让更远的世界，成为下一站。',
    detail: '不锈钢环焊箭体与逐片建模的六边形隔热瓦。完整组合体包含超级重型助推器、通风热分级环及星舰；四片气动襟翼和 33 + 6 台发动机均为真实三维结构。',
    features: ['逐片隔热瓦与拉丝钢面', '33 + 6 台发动机与独立摆动支点', '通风热分级环与捕获支点', '栅格翼执行机构与襟翼铰链'],
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
