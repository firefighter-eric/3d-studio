import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { DjiId } from './specs'
import { djiFile } from './specs'

// Share resources across scene instances, then release GPU memory when the last
// instance disappears. Deferring eviction also allows React StrictMode remounts.
const usage = new Map<string, { count: number; timer?: ReturnType<typeof setTimeout> }>()
export function DjiModel({ id, variant = 'default' }: { id: DjiId; variant?: string }) {
  const info = djiFile(id, variant)
  const { scene } = useGLTF(info.file, '/vendor/draco/')
  const model = useMemo(() => scene.clone(true), [scene])
  useEffect(() => {
    const entry = usage.get(info.file) ?? { count: 0 }
    clearTimeout(entry.timer); entry.count++; usage.set(info.file, entry)
    return () => {
      entry.count--
      entry.timer = setTimeout(() => {
        if (entry.count) return
        useGLTF.clear(info.file)
        const resources = new Set<{ dispose: () => void }>()
        scene.traverse(object => {
          if (!('isMesh' in object)) return
          const mesh = object as import('three').Mesh
          resources.add(mesh.geometry)
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            resources.add(material)
            for (const value of Object.values(material)) if (value?.isTexture) resources.add(value)
          }
        })
        resources.forEach(resource => resource.dispose()); usage.delete(info.file)
      }, 1500)
    }
  }, [info.file, scene])
  return <primitive object={model} scale={4.5 / Math.max(...info.dimensions)} dispose={null} />
}
