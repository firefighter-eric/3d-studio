import { Component, Suspense, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { AssetModel } from './Models'
import { assetById } from '../data/catalog'
import type { AssetId, SceneInstance } from '../data/catalog'
import { isCarId } from '../racing/cars'
import { isSpacecraftId } from '../spacecraft/specs'
import type { SpacecraftView } from '../spacecraft/specs'

export interface ViewActions { reset: () => void; zoom: (direction: number) => void; rotate: (direction: number) => void }

class RenderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="render-fallback"><strong>三维视图暂时无法启动</strong><p>请使用支持 WebGL 的浏览器，并打开硬件加速后刷新页面。</p><button className="button secondary" onClick={() => location.reload()}>重新加载</button></div> : this.props.children }
}

export function CanvasBoundary({ children }: { children: ReactNode }) { return <RenderBoundary>{children}</RenderBoundary> }

function RenderReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0), invalidate = useThree(state => state.invalidate)
  useFrame(() => {
    if (frames.current >= 2) return
    frames.current++
    if (frames.current === 2) onReady()
    else invalidate()
  })
  return null
}

export function StudioLights({ shadows = false }: { shadows?: boolean }) {
  return <>
    <ambientLight intensity={shadows ? 0.2 : 0.5} />
    <hemisphereLight args={['#dce7e8', '#29252a', shadows ? 0.8 : 1.5]} />
    <directionalLight position={shadows ? [8, 16, 6] : [5, 8, 6]} intensity={shadows ? 2.5 : 3.3} color="#fff0d7" castShadow={shadows} shadow-mapSize={[2048, 2048]} shadow-camera-left={-23} shadow-camera-right={23} shadow-camera-top={23} shadow-camera-bottom={-23} shadow-camera-far={65} shadow-bias={-0.0002} shadow-normalBias={0.035} />
    <directionalLight position={[-6, 3, -4]} intensity={shadows ? 0.8 : 3.7} color="#a6bdc9" />
    <directionalLight position={[4, -2, -3]} intensity={1.3} color="#e99859" />
    <Environment resolution={64} frames={1}>
      <Lightformer form="rect" intensity={3.5} position={[-4, 3, 5]} scale={[3, 8, 1]} />
      <Lightformer form="rect" intensity={2} position={[5, 1, -3]} rotation={[0, Math.PI, 0]} scale={[3, 6, 1]} />
      <Lightformer form="rect" intensity={2} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 6, 1]} />
    </Environment>
  </>
}

const Controls = forwardRef<ViewActions, { autoRotate?: boolean; scene?: boolean; interactive?: boolean; car?: boolean; spacecraft?: boolean; view?: SpacecraftView; separated?: boolean }>(function Controls({ autoRotate = false, scene = false, interactive = true, car = false, spacecraft = false, view = 'full', separated = false }, ref) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, invalidate, size } = useThree()
  useEffect(() => {
    if (!scene && !interactive) return
    const fit = Math.max(1, (scene ? 1.08 : spacecraft ? 0.52 : 0.9) / (size.width / size.height))
    const narrow = size.width < 500
    if (scene) camera.position.set(25, 23, 31).multiplyScalar(fit)
    else if (spacecraft) {
      if (view === 'engines') camera.position.set(0.85, -4.2, 1.3)
      else if (view === 'upper') camera.position.set(2.2, 2.7, 4.5).multiplyScalar(fit)
      else camera.position.set(4.8, 1.0, 10).multiplyScalar(fit * (separated ? narrow ? 1.6 : 1.4 : narrow ? 1.43 : 1.22))
    }
    else camera.position.set(...(car ? [6.5, 3.7, 9] : [4.8, 1.9, 10]) as [number,number,number]).multiplyScalar(fit)
    controls.current?.target.set(0, scene ? 0.7 : spacecraft && view === 'engines' ? -2.82 : spacecraft && view === 'upper' ? 1.75 + (separated ? 0.6 : 0) : spacecraft ? narrow ? separated ? 0.42 : 0.05 : separated ? -0.2 : -0.55 : 0, 0)
    controls.current?.update(); controls.current?.saveState(); invalidate()
  }, [camera, invalidate, interactive, scene, car, spacecraft, view, separated, size.width, size.height])
  useImperativeHandle(ref, () => ({
    reset() { controls.current?.reset(); invalidate() },
    zoom(direction) {
      const target = controls.current?.target || new THREE.Vector3()
      const delta = camera.position.clone().sub(target)
      const length = THREE.MathUtils.clamp(delta.length() * (direction > 0 ? 0.82 : 1.22), scene ? 12 : spacecraft ? 0.45 : 5, scene ? 90 : 20)
      camera.position.copy(target).add(delta.setLength(length)); controls.current?.update(); invalidate()
    },
    rotate(direction) {
      const target = controls.current?.target || new THREE.Vector3()
      const offset = camera.position.clone().sub(target).applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * 0.28)
      camera.position.copy(target).add(offset); controls.current?.update(); invalidate()
    },
  }), [camera, invalidate, scene, spacecraft])
  return <OrbitControls ref={controls} makeDefault enabled={interactive} autoRotate={autoRotate} autoRotateSpeed={0.6} enablePan={scene || spacecraft} enableDamping dampingFactor={0.08} minDistance={scene ? 12 : spacecraft ? 0.45 : 5} maxDistance={scene ? 90 : 20} minPolarAngle={0.15} maxPolarAngle={scene ? Math.PI / 2.1 : Math.PI * 0.96} />
})

function OrbitFloor({ y = -2.7 }: { y?: number }) {
  return <group position={[0, y, 0]}>
    {[2, 2.45, 3.2, 4.1].map((r, i) => <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r, r + (i === 1 ? 0.013 : 0.007), 100]} /><meshBasicMaterial color={i === 1 ? '#857555' : '#3c4140'} transparent opacity={i === 1 ? 0.65 : 0.45} side={THREE.DoubleSide} /></mesh>)}
    {Array.from({ length: 40 }, (_, i) => <mesh key={i} position={[Math.sin(i / 40 * Math.PI * 2) * 3.7, 0, Math.cos(i / 40 * Math.PI * 2) * 3.7]} rotation={[-Math.PI / 2, 0, -i / 40 * Math.PI * 2]}><planeGeometry args={[0.012, i % 5 === 0 ? 0.15 : 0.07]} /><meshBasicMaterial color="#59605a" transparent opacity={0.45} /></mesh>)}
  </group>
}

export const ModelCanvas = forwardRef<ViewActions, { id: AssetId; hero?: boolean; compact?: boolean; autoRotate?: boolean; separated?: boolean; view?: SpacecraftView }>(function ModelCanvas({ id, hero = false, compact = false, autoRotate = false, separated = false, view = 'full' }, ref) {
  const asset = assetById[id]
  const [ready, setReady] = useState(false)
  const car = isCarId(id)
  const spacecraft = isSpacecraftId(id)
  const y = spacecraft ? -2.9 : car ? -.68 : id === 'rocket' ? (hero ? 0.15 : 0.4) : id === 'basalt' ? -1.1 : id === 'launchpad' ? -0.4 : -1.65
  return <CanvasBoundary><div className="canvas-shell" data-rendered={ready} data-model={id} data-view={view} data-separated={separated}><Canvas camera={{ position: compact ? spacecraft ? [4.5, 0.8, 10] : [6, 4, 9] : [4.8, 1.9, 10], fov: compact ? 36 : 35 }} dpr={[1, 1.8]} frameloop={autoRotate ? 'always' : 'demand'} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} aria-label={`${asset.name}三维视图`}>
    <Suspense fallback={null}>
      <StudioLights />
      <group position={[0, y, 0]} rotation={id === 'rocket' ? [0, 0, hero ? -0.34 : -0.08] : [0, spacecraft ? -0.45 : -0.3, 0]} scale={asset.viewScale * (compact ? 0.98 : id === 'rocket' && !hero ? 0.87 : 1)}><AssetModel id={id} separated={separated} /></group>
      {!compact && (!spacecraft || view !== 'engines') && <OrbitFloor y={spacecraft ? -3.04 : car ? -.7 : id === 'rocket' ? -2.75 : -1.95} />}
      <Controls ref={ref} autoRotate={autoRotate} interactive={!compact} car={car} spacecraft={spacecraft} view={view} separated={separated} />
      <RenderReady onReady={() => setReady(true)} />
    </Suspense>
  </Canvas>{!ready && <div className="canvas-loading" role="status"><span />准备三维视图…</div>}</div></CanvasBoundary>
})

export function BaseWorld({ instances }: { instances: SceneInstance[] }) {
  return <group>
    <mesh position={[0, -0.33, 0]} receiveShadow><cylinderGeometry args={[17, 17.5, 0.65, 80]} /><meshStandardMaterial color="#424c4d" roughness={0.97} metalness={0.1} /></mesh>
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><ringGeometry args={[7.25, 8.6, 80]} /><meshStandardMaterial color="#2a3437" roughness={0.9} /></mesh>
    <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[7.91, 7.94, 100]} /><meshStandardMaterial color="#879282" /></mesh>
    <mesh position={[0, 0.01, 7]} receiveShadow><boxGeometry args={[2.7, 0.01, 10]} /><meshStandardMaterial color="#2a3437" roughness={0.9} /></mesh>
    {[4.3, 5.5, 6.7, 7.9, 9.1, 10.3, 11.5].map(z => <mesh key={z} position={[0, 0.023, z]}><boxGeometry args={[0.065, 0.02, 0.6]} /><meshStandardMaterial color="#aeb3a0" /></mesh>)}
    {[-1, 1].flatMap(side => Array.from({ length: 4 }, (_, i) => <group key={`${side}-${i}`} position={[side * 2, 0, 4.5 + i * 2]}><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.035, 0.065, 0.6, 8]} /><meshStandardMaterial color="#88958a" metalness={0.6} /></mesh><mesh position={[0, 0.62, 0]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color="#d0ed87" emissive="#d0ed87" emissiveIntensity={2} /></mesh></group>))}
    {instances.map(instance => <group key={instance.id} position={instance.position} rotation={instance.rotation} scale={instance.scale}><AssetModel id={instance.assetId} /></group>)}
    {Array.from({ length: 9 }, (_, i) => {
      const x = -14 + i * 3.5, h = 1 + Math.sin(i * 3.2) * 0.4
      return <mesh key={i} position={[x, h * 0.42, -11 - Math.sin(i) * 1.6]} scale={[2.5, h, 2.2]} rotation={[0, i, 0]} castShadow><dodecahedronGeometry args={[1.5, 0]} /><meshStandardMaterial color="#637172" roughness={1} flatShading /></mesh>
    })}
  </group>
}

export const WorldCanvas = forwardRef<ViewActions, { instances: SceneInstance[]; preview?: boolean; autoRotate?: boolean }>(function WorldCanvas({ instances, preview = false, autoRotate = false }, ref) {
  const [ready, setReady] = useState(false)
  return <CanvasBoundary><div className="canvas-shell" data-rendered={ready}><Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [25, 23, 31], fov: preview ? 42 : 46, near: 0.1, far: 150 }} dpr={[1, 1.5]} frameloop={autoRotate ? 'always' : 'demand'} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} aria-label="静海发射基地三维场景">
    <Suspense fallback={null}><StudioLights shadows /><BaseWorld instances={instances} /><Controls ref={ref} scene autoRotate={autoRotate} interactive={!preview} /><RenderReady onReady={() => setReady(true)} /></Suspense>
  </Canvas>{!ready && <div className="canvas-loading" role="status"><span />准备三维视图…</div>}</div></CanvasBoundary>
})
