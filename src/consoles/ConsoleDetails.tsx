import { ArrowUpRight } from 'lucide-react'
import { consoleModelInfo, consoleProduct } from './specs'
import type { ConsoleProductId } from './specs'

export function ConsoleDetails({ id }: { id: ConsoleProductId }) {
  const product = consoleProduct(id), info = consoleModelInfo(id)
  return <>
    <div className="spacecraft-features">{product.features.map(feature => <span key={feature}>{feature}</span>)}</div>
    <dl className="model-details">
      <div><dt>版本</dt><dd>{product.edition}</dd></div>
      <div><dt>外观</dt><dd>{product.appearance}</dd></div>
      <div><dt>创作方式</dt><dd>外观重建 · PBR 材质</dd></div>
      <div><dt>模型文件</dt><dd>GLB · {(info.bytes / 1048576).toFixed(2)} MB · 米制</dd></div>
      <div><dt>使用方式</dt><dd>查看 · 下载 · 场景组合</dd></div>
    </dl>
  </>
}

export function ConsoleSourceNote({ id }: { id: ConsoleProductId }) {
  const product = consoleProduct(id)
  return <p className="sidebar-footnote">{product.dimensionNote}。此为 3D Studio 制作的外观展示模型，非官方 CAD。下载保留米制，场景按展示比例缩放。
    <a href={product.source} target="_blank" rel="noreferrer">{product.family} 官方产品参考<ArrowUpRight size={11} /></a>
  </p>
}
