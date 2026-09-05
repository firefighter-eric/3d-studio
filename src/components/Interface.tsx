import { ArrowLeft, ArrowUpRight, Box, Check, Mouse, MoveUpRight, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import type { ViewActions } from './StudioCanvas'

export function OrbitLogo() { return <svg viewBox="0 0 56 44" fill="none" aria-hidden="true"><ellipse cx="28" cy="22" rx="27" ry="10" transform="rotate(-32 28 22)" stroke="currentColor" strokeWidth="1.3" /><ellipse cx="28" cy="22" rx="25" ry="11" transform="rotate(27 28 22)" stroke="currentColor" strokeWidth="1" /><circle cx="28" cy="22" r="4" fill="#d0ed87" /></svg> }
export function PageHeading({ title, subtitle, count }: { title: string; subtitle: string; count?: string }) { return <div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{count && <span className="collection-count">{count}</span>}</div> }
export function SelectionButton({ selected, onClick, label, compact = false }: { selected: boolean; onClick: () => void; label: string; compact?: boolean }) { return <button type="button" className={`selection-control ${compact ? 'compact' : ''} ${selected ? 'selected' : ''}`} onClick={onClick} aria-pressed={selected} aria-label={`${selected ? '取消选择' : '选择'}${label}`}><span className="checkbox-mark">{selected && <Check size={14} strokeWidth={2.5} />}</span>{!compact && <span>{selected ? '已选为创作素材' : '选为创作素材'}</span>}</button> }
export function BackButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="back-button" onClick={onClick}><ArrowLeft size={16} />{children}</button> }
export function InteractionHint({ scene = false }: { scene?: boolean }) { return <span className="interaction-hint"><Mouse size={16} /><span>{scene ? '拖动环绕 · 右键平移 · 滚轮缩放' : '拖动旋转 · 滚轮缩放'}</span></span> }
export function ViewToolbar({ actions, autoRotate, setAutoRotate }: { actions: RefObject<ViewActions | null>; autoRotate: boolean; setAutoRotate: (value: boolean) => void }) {
  return <div className="view-toolbar" role="toolbar" aria-label="三维视角控制">
    <button aria-label="放大" title="放大" onClick={() => actions.current?.zoom(1)}><ZoomIn size={18} /></button>
    <button aria-label="缩小" title="缩小" onClick={() => actions.current?.zoom(-1)}><ZoomOut size={18} /></button>
    <span className="toolbar-divider" />
    <button aria-label="向右旋转" title="向右旋转" onClick={() => actions.current?.rotate(1)}><MoveUpRight size={18} /></button>
    <button aria-label="自动旋转" title="自动旋转" aria-pressed={autoRotate} className={autoRotate ? 'active' : ''} onClick={() => setAutoRotate(!autoRotate)}><RotateCw size={18} /></button>
    <button aria-label="恢复视角" title="恢复视角" onClick={() => { setAutoRotate(false); actions.current?.reset() }}><RotateCcw size={18} /></button>
  </div>
}
export function ModelLink({ onClick, children = '查看模型' }: { onClick: () => void; children?: ReactNode }) { return <button className="text-link" onClick={onClick}>{children}<ArrowUpRight size={17} /></button> }
export function PrimaryViewButton({ onClick }: { onClick: () => void }) { return <button className="button primary" onClick={onClick}><Box size={20} />查看模型</button> }
