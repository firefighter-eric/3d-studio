import { useMemo } from 'react'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { nvidiaModelInfo, nvidiaModelUrl } from './specs'
import type { NvidiaProductId } from './specs'

export function NvidiaModel({ id }: { id: NvidiaProductId }) {
  const { scene } = useGLTF(nvidiaModelUrl(id), '/vendor/draco/')
  const model = useMemo(() => scene.clone(true), [scene])
  // Scene exhibits use a common one-unit size. The downloadable asset stays in metres.
  return <group name={`asset-${id}`} scale={1 / Math.max(...nvidiaModelInfo(id).dimensions)}>
    <primitive object={model} dispose={null} />
  </group>
}

export function NvidiaLighting() {
  return <>
    <ambientLight intensity={.7} />
    <hemisphereLight args={['#f4f1e8', '#556473', 1.5]} />
    <directionalLight position={[4, 6, 7]} intensity={3} color="#fff7e8" />
    <directionalLight position={[-5, 2, 5]} intensity={1.8} color="#d9e6ff" />
    <directionalLight position={[4, 3, -5]} intensity={2.4} color="#c9d8ec" />
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={4} position={[0, 3, 6]} scale={[7, 7, 1]} />
      <Lightformer form="rect" intensity={3} position={[-4, 2, 2]} rotation={[0, Math.PI / 3, 0]} scale={[3, 8, 1]} />
      <Lightformer form="rect" intensity={3} position={[5, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 7, 1]} />
      <Lightformer form="rect" intensity={2} position={[0, 7, -1]} rotation={[Math.PI / 2, 0, 0]} scale={[7, 5, 1]} />
    </Environment>
  </>
}
