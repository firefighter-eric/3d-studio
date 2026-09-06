export const CONSOLE_PRODUCTS = [
  {
    id: 'microsoft-xbox-series-x', name: 'Xbox Series X', brand: 'microsoft', brandName: 'Microsoft', family: 'Xbox',
    edition: 'Carbon Black · 光驱版', description: '黑色方塔，一眼认出的绿色风道。',
    detail: '重建 Xbox Series X 黑色光驱版的竖立机身、内凹顶面与绿色散热孔，补充正面的光盘槽、电源键、USB 接口和背部连接区域。',
    features: ['Series X', '光驱版', '绿色顶置风道', '竖立展示'],
    aliases: ['Xbox', 'Xbox Series X', 'XSX', '微软', 'X盒子', '碳黑', '光驱版'],
    appearance: '碳黑机身 · 绿色散热孔', dimensions: [151, 301, 151],
    source: 'https://www.xbox.com/en-US/consoles/xbox-series-x',
    technicalSource: 'https://www.xbox.com/en-US/consoles/compare',
    dimensionNote: '主体参考官方 151 × 301 × 151 mm；散热孔、接口和局部结构近似',
  },
  {
    id: 'microsoft-xbox-series-s', name: 'Xbox Series S', brand: 'microsoft', brandName: 'Microsoft', family: 'Xbox',
    edition: 'Robot White · 数字版', description: '白色小机身，黑色圆形散热窗。',
    detail: 'Xbox Series S 白色数字版外观重建。纤薄机身配有大面积圆形散热网、前置 USB 与配对按钮，背面保留 HDMI、网口、存储扩展和供电接口。',
    features: ['Series S', '数字版', '圆形散热网', '竖立展示'],
    aliases: ['Xbox', 'Xbox Series S', 'XSS', '微软', 'X盒子', '机器人白', '数字版'],
    appearance: '白色机身 · 黑色圆形散热网', dimensions: [65, 275, 151],
    source: 'https://www.xbox.com/en-US/consoles/xbox-series-s',
    technicalSource: 'https://www.xbox.com/en-US/consoles/compare',
    dimensionNote: '竖放主体参考官方 65 × 275 × 151 mm；散热孔和接口近似',
  },
  {
    id: 'sony-ps5-slim', name: 'PS5 轻薄光驱版', brand: 'sony', brandName: 'Sony', family: 'PlayStation',
    edition: 'Slim · 光驱版', description: '四片白色曲面，包裹深黑内芯。',
    detail: '参考 PS5 轻薄光驱版的四片分体外壳，重建上部亮面、下部哑光面、蓝色灯带与右侧光驱轮廓。以竖立造型展示，附展示用底座。',
    features: ['PS5 Slim', '四片分体外壳', '光驱版', '双前置 USB-C'],
    aliases: ['PS5', 'PS 5', 'PlayStation 5', 'Play Station', '索尼', '轻薄版', 'Slim', '光驱版'],
    appearance: '白色曲面外壳 · 黑色中框 · 蓝色灯带', dimensions: [96, 358, 216],
    source: 'https://www.playstation.com/en-us/ps5/',
    technicalSource: 'https://blog.playstation.com/2023/10/10/new-look-for-ps5-console-this-holiday-season/',
    dimensionNote: '竖放主体参考官方 96 × 358 × 216 mm；曲面、光驱、灯带及展示底座近似，下载包围盒包含底座',
  },
  {
    id: 'sony-ps5-pro', name: 'PS5 Pro', brand: 'sony', brandName: 'Sony', family: 'PlayStation',
    edition: 'Pro · 数字版', description: '三道散热叶片，刻下 Pro 的轮廓。',
    detail: 'PS5 Pro 数字版外观重建。修长的白色双侧面板与中央三道黑色散热开缝相接，配有前后接口、百叶风道和蓝色灯带，附展示用底座。',
    features: ['PS5 Pro', '三道散热开缝', '数字版', '双前置 USB-C'],
    aliases: ['PS5', 'PS 5', 'PlayStation 5', 'Play Station', '索尼', 'Pro', '增强版', '数字版'],
    appearance: '白色修长机身 · 三道黑色散热开缝', dimensions: [89, 388, 216],
    source: 'https://www.playstation.com/en-us/ps5/ps5-pro/',
    technicalSource: 'https://blog.playstation.com/2025/04/21/playstation-5-pro-teardown-an-inside-look-at-the-most-advanced-playstation-console-to-date/',
    dimensionNote: '竖放主体参考官方 89 × 388 × 216 mm；曲面、风道、灯带及展示底座近似，下载包围盒包含底座',
  },
] as const

export type ConsoleProductId = typeof CONSOLE_PRODUCTS[number]['id']
const products = new Map<string, typeof CONSOLE_PRODUCTS[number]>(CONSOLE_PRODUCTS.map(product => [product.id, product]))
export function isConsoleProductId(id: string): id is ConsoleProductId { return products.has(id) }
export function consoleProduct(id: ConsoleProductId) { return products.get(id)! }
