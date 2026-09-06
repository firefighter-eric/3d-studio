export const NVIDIA_PRODUCTS = [
  {
    id: 'nvidia-gb200-nvl72', name: 'GB200 NVL72', family: '机柜', english: 'GRACE BLACKWELL / NVL72',
    description: '把 72 颗 GPU，连接成一台计算机。',
    detail: '液冷机柜、18 层计算托盘、9 层 NVLink 交换托盘与背部冷却管线。以开放式机柜呈现 Grace Blackwell 的硬件秩序。',
    features: ['72 × Blackwell GPU', '36 × Grace CPU', '机柜级液冷'],
    source: 'https://www.nvidia.com/en-us/data-center/gb200-nvl72/',
    technicalSource: 'https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html',
    dimensions: [600, 2240, 1100], dimensionNote: '机柜尺寸与局部结构为展示估算',
    appearance: '石墨黑机柜 · 香槟金托盘',
  },
  {
    id: 'nvidia-gb300-nvl72', name: 'GB300 NVL72', family: '机柜', english: 'BLACKWELL ULTRA / NVL72',
    description: '从芯片，到整座 AI 工厂。',
    detail: 'Blackwell Ultra 机柜外观重建。金属计算托盘、密集网络接口、线缆束、供电模块与冷却歧管组成可环绕查看的完整机柜。',
    features: ['72 × Blackwell Ultra GPU', '36 × Grace CPU', 'NVLink 互联'],
    source: 'https://www.nvidia.com/en-us/data-center/gb300-nvl72/',
    technicalSource: 'https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html',
    dimensions: [600, 2240, 1100], dimensionNote: '机柜尺寸与局部结构为展示估算',
    appearance: '石墨黑机柜 · 金色互联面板',
  },
  {
    id: 'nvidia-dgx-b300', name: 'DGX B300', family: '服务器', english: 'BLACKWELL ULTRA / DGX',
    description: '八颗 B300，一体化 AI 服务器。',
    detail: '参考 DGX B300 的 10U 机箱与金色透气前面板，补充前部接口、抽拉托盘、侧面钣金、背部风扇与供电接口。',
    features: ['8 × B300 GPU', '10U 机架服务器', 'ConnectX-8'],
    source: 'https://www.nvidia.com/en-us/data-center/dgx-b300/',
    technicalSource: 'https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html',
    dimensions: [482.6, 442, 904.2], dimensionNote: '机箱外廓参考官方尺寸；局部细节近似',
    appearance: '金色透气前板 · 深灰金属机箱',
  },
  {
    id: 'nvidia-b300-sxm', name: 'B300 GPU', family: 'GPU', english: 'BLACKWELL ULTRA / SXM',
    description: '走近 Blackwell Ultra 的计算核心。',
    detail: 'B300 SXM 模块的结构示意模型：双芯粒、周边 HBM 堆栈、载板元件、固定框与底部连接器。裸芯片及布线布局用于展示，不代表制造版图。',
    features: ['Blackwell Ultra', 'SXM 模块示意', 'HBM3e'],
    source: 'https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/',
    technicalSource: 'https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory/latest/components.html',
    dimensions: [140, 15, 150], dimensionNote: '封装、载板尺寸与元件位置为示意估算',
    appearance: '深绿载板 · 金色触点 · 双芯粒',
  },
  {
    id: 'nvidia-dgx-spark', name: 'DGX Spark', family: '桌面', english: 'GRACE BLACKWELL / GB10',
    description: '让桌面，装下一点超级计算。',
    detail: '150 mm 见方的桌面 AI 计算机。重建金属顶盖、纹理透气前板与两侧深色凹槽，背部配有 USB-C、HDMI、以太网及高速互联接口。',
    features: ['GB10 Superchip', '128 GB 统一内存', '150 × 150 × 50.5 mm'],
    source: 'https://www.nvidia.com/en-us/products/workstations/dgx-spark/',
    technicalSource: 'https://docs.nvidia.com/dgx/dgx-spark/system-overview.html',
    dimensions: [150, 50.5, 150], dimensionNote: '外廓参考官方尺寸；接口与纹理近似',
    appearance: '香槟金铝壳 · 纹理透气前板',
  },
  {
    id: 'nvidia-dgx-station', name: 'DGX Station', family: '桌面', english: 'GRACE BLACKWELL ULTRA / DESKTOP',
    description: '把 AI 工作站，带到身边。',
    detail: '参考 NVIDIA 展示图的桌边 AI 工作站：深色塔式机身、交叉前脸、上下散热网面与背部接口。DGX Station 由多家 OEM 制造，此模型不对应某一家量产机箱。',
    features: ['GB300 Desktop Superchip', 'Grace CPU', '桌边 AI 工作站'],
    source: 'https://www.nvidia.com/en-us/products/workstations/dgx-station/',
    technicalSource: 'https://docs.nvidia.com/dgx/dgx-station-development-guide/Intro.html',
    dimensions: [180, 450, 430], dimensionNote: '参考展示图估算；各 OEM 机箱外形不同',
    appearance: '曜石黑机身 · 交叉金属前脸',
  },
] as const

export type NvidiaProduct = typeof NVIDIA_PRODUCTS[number]
export type NvidiaProductId = NvidiaProduct['id']
export const NVIDIA_FAMILIES = ['全部', '机柜', '服务器', 'GPU', '桌面'] as const
export function isNvidiaProductId(id: string): id is NvidiaProductId { return NVIDIA_PRODUCTS.some(product => product.id === id) }
export function nvidiaProduct(id: NvidiaProductId): NvidiaProduct { return NVIDIA_PRODUCTS.find(product => product.id === id)! }
