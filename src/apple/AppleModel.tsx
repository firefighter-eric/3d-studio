import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { appleModelInfo, appleModelUrl } from './specs'
import type { AppleProductId } from './specs'

export function AppleModel({ id }: { id: AppleProductId }) {
  const { scene } = useGLTF(appleModelUrl(id), '/vendor/draco/')
  const model = useMemo(() => scene.clone(true), [scene])
  // GLB downloads retain metres. The shared scene uses a one-unit exhibit so
  // pocket-size products remain visible alongside the existing creative assets.
  return <group name={`asset-${id}`} scale={1 / Math.max(...appleModelInfo(id).dimensions)}>
    <primitive object={model} dispose={null} />
  </group>
}
