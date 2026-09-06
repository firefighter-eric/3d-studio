import { ArrowUpRight } from 'lucide-react'
import { teslaModelInfo, teslaProduct } from './specs'
import type { TeslaProductId } from './specs'

export function TeslaDetails({ id }: { id: TeslaProductId }) {
  const product = teslaProduct(id), info = teslaModelInfo(id)
  return <>
    <div className="spacecraft-features">{product.features.map(feature => <span key={feature}>{feature}</span>)}</div>
    <dl className="model-details">
      <div><dt>外观</dt><dd>{product.appearance}</dd></div>
      <div><dt>创作方式</dt><dd>外观重建 · PBR 材质</dd></div>
      <div><dt>模型文件</dt><dd>GLB · {(info.bytes / 1048576).toFixed(2)} MB · 米制</dd></div>
      <div><dt>使用方式</dt><dd>查看 · 下载 · 场景组合</dd></div>
    </dl>
  </>
}

export function TeslaSourceNote({ id }: { id: TeslaProductId }) {
  return <p className="sidebar-footnote">依据公开外观资料制作的 3D Studio 展示模型，几何与尺寸为近似重建，非官方 CAD。下载保留米制，加入场景时按展示比例缩放。
    <a href={teslaProduct(id).source} target="_blank" rel="noreferrer">Tesla 官方外观参考<ArrowUpRight size={11} /></a>
  </p>
}
