import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { CanvasBoundary } from '../../components/StudioCanvas'
import { createRecoveryWorld } from './world'
import { DURATION, FlightPlayer, sampleFlight } from './mission'
import type { CameraMode } from './mission'

type Props = { player: FlightPlayer; mode: CameraMode; onReady: () => void; onTick: () => void; exporting?: boolean }
declare global {
  interface Window { __falconHeavyFilm?: { duration: number; render: (time: number, captions?: boolean) => string } }
}

function Flight({ player, mode, onReady, onTick, exporting }: Props) {
  const { scene: source } = useGLTF('/models/falcon-heavy.glb')
  const world = useMemo(() => createRecoveryWorld(source), [source])
  const frames = useRef(0), tick = useRef(0), previousTime = useRef(-1)
  const { camera, gl, scene, size, invalidate } = useThree()
  useEffect(() => world.dispose, [world])
  useEffect(() => { invalidate() }, [player.time, mode, invalidate])
  useEffect(() => {
    if (!exporting || !import.meta.env.DEV) return
    const film = document.createElement('canvas'); film.width = size.width; film.height = size.height
    const ctx = film.getContext('2d')!
    const render = (time: number, captions = true) => {
      const s = sampleFlight(time)
      world.update(s, camera as THREE.PerspectiveCamera, 'director', size.width / size.height)
      gl.render(scene, camera)
      if (!captions) return gl.domElement.toDataURL('image/png')
      ctx.drawImage(gl.domElement, 0, 0, size.width, size.height)
      // Burn in restrained titles on the original 3D frames; no reference
      // footage, music, or external imagery is mixed into the exported film.
      const unit = size.width / 1920, w = size.width, h = size.height
      const shade = ctx.createLinearGradient(0, 0, 0, h); shade.addColorStop(0, '#08162177'); shade.addColorStop(.22, '#08162100'); shade.addColorStop(.74, '#08162100'); shade.addColorStop(1, '#08162188')
      ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h)
      ctx.textAlign = 'left'; ctx.fillStyle = '#eff1e7'; ctx.font = `500 ${23*unit}px Arial`; ctx.fillText('3D STUDIO  /  FLIGHT ARCHIVE 002', 76*unit, 74*unit)
      ctx.fillStyle = '#eaf0e9'; ctx.font = `500 ${17*unit}px Arial`; ctx.textAlign = 'right'; ctx.fillText('FALCON HEAVY  ·  DUAL RETURN', w-76*unit, 74*unit)
      ctx.textAlign = 'left'; ctx.font = `500 ${36*unit}px "PingFang SC", sans-serif`; ctx.fillText(s.phase.title, 76*unit, h-112*unit)
      ctx.font = `${17*unit}px "PingFang SC", sans-serif`; ctx.fillStyle = '#d2dedc'; ctx.fillText('基于现有模型制作 · 飞行阶段与场地为视觉重建', 76*unit, h-73*unit)
      ctx.textAlign = 'right'; ctx.fillStyle = '#e9f1e5'; ctx.font = `500 ${19*unit}px Arial`
      ctx.fillText(touchdownCaption(s.boosters.map(b => b.landed)), w-76*unit, h-78*unit)
      ctx.fillStyle = '#d0ed87'; ctx.fillRect(76*unit, h-43*unit, (w-152*unit)*s.time/DURATION, 2*unit)
      return film.toDataURL('image/png')
    }
    window.__falconHeavyFilm = { duration: DURATION, render }
    return () => { delete window.__falconHeavyFilm }
  }, [exporting, world, gl, scene, camera, size])
  useFrame((_, dt) => {
    const sample = exporting ? sampleFlight(player.time) : player.step(dt)
    world.update(sample, camera as THREE.PerspectiveCamera, mode, size.width / size.height)
    if (frames.current < 3) { frames.current++; if (frames.current === 3) onReady(); else invalidate() }
    tick.current += dt
    if (previousTime.current !== player.time && tick.current >= .075) { previousTime.current = player.time; tick.current = 0; onTick() }
  })
  return <primitive object={world.root} dispose={null} />
}
function touchdownCaption(landed: boolean[]) { return landed.every(Boolean) ? 'LZ-1  LANDED    /    LZ-2  LANDED' : landed[0] ? 'LZ-1  LANDED    /    LZ-2  FINAL APPROACH' : 'LZ-1    /    LZ-2' }

export function FalconHeavyCanvas(props: Props) {
  return <CanvasBoundary><Canvas aria-label="猎鹰重型双助推器回收三维动画" frameloop={props.player.playing && !props.exporting ? 'always' : 'demand'} dpr={props.exporting ? 1 : [1, 1.5]} shadows="percentage" camera={{ position: [0,100,500], near: .5, far: 40000, fov: 30 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
    <fog attach="fog" args={['#a7bdc2', 1800, 9000]} />
    <Suspense fallback={null}><Flight {...props} /></Suspense>
  </Canvas></CanvasBoundary>
}
