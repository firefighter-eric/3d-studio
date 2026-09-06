import { appleProduct, appleModelInfo } from './specs'
import type { AppleProductId } from './specs'
import './apple.css'

export function AppleDetails({ id }: { id: AppleProductId }) {
  const product = appleProduct(id), info = appleModelInfo(id)
  return <>
    <div className="apple-product-features">{product.features.map(feature => <span key={feature}>{feature}</span>)}</div>
    <dl className="model-details apple-model-details">
      <div><dt>外观</dt><dd>{product.finish}</dd></div>
      <div><dt>模型来源</dt><dd>Apple 官方 AR 展示模型</dd></div>
      <div><dt>模型文件</dt><dd>GLB · {(info.bytes / 1048576).toFixed(1)} MB</dd></div>
      <div><dt>使用方式</dt><dd>查看 · 下载 · 场景组合</dd></div>
    </dl>
  </>
}
