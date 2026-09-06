import { ArrowUpRight } from 'lucide-react'
import { nvidiaProduct, nvidiaModelInfo } from './specs'
import type { NvidiaProductId } from './specs'
import './nvidia.css'

export function NvidiaDetails({ id }: { id: NvidiaProductId }) {
  const product = nvidiaProduct(id), info = nvidiaModelInfo(id)
  return <>
    <div className="nvidia-features">{product.features.map(feature => <span key={feature}>{feature}</span>)}</div>
    <dl className="model-details nvidia-details">
      <div><dt>外观</dt><dd>{product.appearance}</dd></div>
      <div><dt>创作方式</dt><dd>外观重建 · PBR 材质</dd></div>
      <div><dt>模型文件</dt><dd>GLB · {(info.bytes / 1048576).toFixed(2)} MB · 米制</dd></div>
      <div><dt>使用方式</dt><dd>查看 · 下载 · 场景组合</dd></div>
    </dl>
  </>
}

export function NvidiaSourceNote({ id }: { id: NvidiaProductId }) {
  const product = nvidiaProduct(id)
  return <p className="sidebar-footnote nvidia-source-note">{product.dimensionNote}。此为 3D Studio 制作的展示模型。下载保留米制，场景中按展示比例缩放。
    <a href={product.source} target="_blank" rel="noreferrer">NVIDIA 官方产品资料<ArrowUpRight size={11} /></a>
  </p>
}
