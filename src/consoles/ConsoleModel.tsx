import { useMemo } from 'react'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { consoleModelInfo, consoleModelUrl } from './specs'
import type { ConsoleProductId } from './specs'

export function ConsoleModel({ id }: { id: ConsoleProductId }) {
  const { scene } = useGLTF(consoleModelUrl(id), '/vendor/draco/')
  const model = useMemo(() => scene.clone(true), [scene])
  return <group name={`asset-${id}`} scale={1 / Math.max(...consoleModelInfo(id).dimensions)}>
    <primitive object={model} dispose={null} />
  </group>
}

export function ConsoleLighting() {
  return <>
    <ambientLight intensity={.4} />
    <hemisphereLight args={['#edf3ff', '#38464d', 1.1]} />
    <directionalLight position={[5, 6, 8]} intensity={2.3} color="#fffaf3" />
    <directionalLight position={[-6, 2, 4]} intensity={1.5} color="#d8e7ff" />
    <directionalLight position={[3, 4, -6]} intensity={2.2} color="#dbe7ef" />
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2.3} position={[-4, 4, 6]} scale={[4, 8, 1]} />
      <Lightformer form="rect" intensity={2} position={[5, 3, -3]} rotation={[0, Math.PI, 0]} scale={[4, 7, 1]} />
      <Lightformer form="rect" intensity={2.5} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 6, 1]} />
    </Environment>
  </>
}
