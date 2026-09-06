import { Component, forwardRef, Suspense, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { DjiModel } from './DjiModel'
import { djiFile, djiProduct } from './specs'
import type { DjiId } from './specs'
import type { ViewActions } from '../components/StudioCanvas'

class ModelBoundary extends Component<{ children: ReactNode; file: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <div className="render-fallback" role="alert"><strong>模型暂时无法加载</strong><p>请重试，并确认浏览器已开启 WebGL。</p><button className="button secondary" onClick={() => { useGLTF.clear(this.props.file); this.setState({ failed: false }) }}>重新加载模型</button></div>
  }
}

function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0), invalidate = useThree(state => state.invalidate)
  useFrame(() => { if (++frames.current === 2) onReady(); else if (frames.current < 2) invalidate() })
  return null
}

const Controls = forwardRef<ViewActions, { autoRotate: boolean; hero: boolean }>(function Controls({ autoRotate, hero }, ref) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, size, invalidate } = useThree()
  useEffect(() => {
    const narrowDetail = !hero && size.width < 500
    const fit = Math.max(1, .85 / (size.width / size.height)) * (narrowDetail ? 1.08 : 1)
    const targetY = narrowDetail ? .16 : 0
    camera.position.set(hero ? 4.5 : 5, hero ? 2 : 3.2, 9).multiplyScalar(fit)
    camera.position.y += targetY
    controls.current?.target.set(0, targetY, 0); controls.current?.update(); controls.current?.saveState(); invalidate()
  }, [camera, size.width, size.height, hero, invalidate])
  useImperativeHandle(ref, () => ({
    reset() { controls.current?.reset(); invalidate() },
    zoom(direction) {
      const target = controls.current?.target ?? new THREE.Vector3()
      const offset = camera.position.clone().sub(target)
      offset.setLength(THREE.MathUtils.clamp(offset.length() * (direction > 0 ? .8 : 1.25), 1, 25))
      camera.position.copy(target).add(offset); controls.current?.update(); invalidate()
    },
    rotate(direction) {
      const target = controls.current?.target ?? new THREE.Vector3()
      const offset = camera.position.clone().sub(target).applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * .3)
      camera.position.copy(target).add(offset); controls.current?.update(); invalidate()
    },
  }), [camera, invalidate])
  return <OrbitControls ref={controls} makeDefault enableDamping enablePan autoRotate={autoRotate} autoRotateSpeed={.55} minDistance={1} maxDistance={25} minPolarAngle={.03} maxPolarAngle={Math.PI - .03} />
})

export const DjiCanvas = forwardRef<ViewActions, { id: DjiId; variant?: string; autoRotate?: boolean; hero?: boolean }>(function DjiCanvas({ id, variant = 'default', autoRotate = false, hero = false }, ref) {
  const [ready, setReady] = useState(false)
  const info = djiFile(id, variant)
  const h = 4.5 * info.dimensions[1] / Math.max(...info.dimensions)
  return <ModelBoundary key={`${id}-${variant}`} file={info.file}><div className="canvas-shell dji-canvas" data-rendered={ready} data-model={id} data-variant={variant}>
    <Canvas camera={{ position: [5, 3.2, 9], fov: 34, near: .025, far: 100 }} dpr={[1, 1.75]} frameloop={autoRotate ? 'always' : 'demand'} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} aria-label={`${djiProduct(id).name}三维视图`}>
      <Suspense fallback={null}>
        <ambientLight intensity={.65} />
        <hemisphereLight args={['#e6eff5', '#45423b', 1]} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} color="#fff4e6" />
        <directionalLight position={[-4, 2, -4]} intensity={2.4} color="#cddbe8" />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" position={[-4, 3, 5]} intensity={3} scale={[3, 6, 1]} />
          <Lightformer form="rect" position={[4, 3, -5]} rotation={[0, Math.PI, 0]} intensity={3} scale={[2, 7, 1]} />
          <Lightformer form="rect" position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} intensity={2} scale={[5, 5, 1]} />
        </Environment>
        <group position={[0, -h / 2, 0]}><DjiModel id={id} variant={variant} /></group>
        <Controls ref={ref} autoRotate={autoRotate} hero={hero} />
        <Ready onReady={() => setReady(true)} />
      </Suspense>
    </Canvas>
    {!ready && <div className="canvas-loading" role="status"><span />正在加载模型与材质…</div>}
  </div></ModelBoundary>
})
