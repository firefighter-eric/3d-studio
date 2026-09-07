import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { SpacecraftId } from './specs'
import { refineSpacecraftSurfaces } from './surfaces'
import { instanceEngines } from './instances'

export function SpacecraftModel({ id, separated = false }: { id: SpacecraftId; separated?: boolean }) {
  const { scene } = useGLTF(`/models/${id}.glb`)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(object => { if ('isMesh' in object) { object.castShadow = true; object.receiveShadow = true } })
    if (separated) {
      if (id === 'starship') {
        clone.getObjectByName('hotstage')!.position.y += 5
        clone.getObjectByName('ship')!.position.y += 13
      } else {
        if (id === 'falcon-heavy') {
          clone.getObjectByName('side-booster-left')!.position.x -= 6
          clone.getObjectByName('side-booster-right')!.position.x += 6
        }
        clone.getObjectByName('second-stage')!.position.y += 6
        for (const [name, x] of [['fairing-left', 4.5], ['fairing-right', -4.5]] as const) {
          const fairing = clone.getObjectByName(name)!
          fairing.position.x += x; fairing.position.y += 10
        }
      }
    }
    const dispose = refineSpacecraftSurfaces(clone)
    const engines=instanceEngines(clone)
    return { clone, dispose: () => { engines.dispose(); dispose() } }
  }, [scene, id, separated])
  useEffect(() => model.dispose, [model])
  return <primitive object={model.clone} dispose={null} />
}
