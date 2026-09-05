import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { CarId } from './cars'

export function FormulaCar({ id }: { id: CarId }) {
  const { scene } = useGLTF(`/models/${id}.glb`)
  const car = useMemo(() => scene.clone(true), [scene])
  return <primitive object={car} dispose={null} />
}
