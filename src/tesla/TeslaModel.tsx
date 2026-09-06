import { useMemo } from 'react'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { teslaModelInfo, teslaModelUrl } from './specs'
import type { TeslaProductId } from './specs'

export function TeslaModel({ id }: { id: TeslaProductId }) {
  const { scene } = useGLTF(teslaModelUrl(id), '/vendor/draco/')
  const model = useMemo(() => scene.clone(true), [scene])
  return <group name={`asset-${id}`} scale={1 / Math.max(...teslaModelInfo(id).dimensions)}>
    <primitive object={model} dispose={null} />
  </group>
}

export function TeslaLighting() {
  return <>
    <ambientLight intensity={.45} />
    <hemisphereLight args={['#eef3fa', '#555d68', 1.25]} />
    <directionalLight position={[4, 6, 7]} intensity={2.3} color="#fffaf3" />
    <directionalLight position={[-6, 2, -5]} intensity={2.4} color="#ccdfff" />
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={3} position={[-4, 4, 5]} scale={[4, 7, 1]} />
      <Lightformer form="rect" intensity={2} position={[5, 3, -3]} rotation={[0, Math.PI, 0]} scale={[4, 6, 1]} />
      <Lightformer form="rect" intensity={3.5} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[7, 5, 1]} />
    </Environment>
  </>
}
