import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AssetId, Vec3 } from '../data/catalog'
import { isCarId } from '../racing/cars'
import { FormulaCar } from '../racing/FormulaCar'
import { isSpacecraftId } from '../spacecraft/specs'
import { SpacecraftModel } from '../spacecraft/SpacecraftModel'
import { isAppleProductId } from '../apple/specs'
import { AppleModel } from '../apple/AppleModel'
import { isDjiId } from '../dji/specs'
import { DjiModel } from '../dji/DjiModel'
import { isNvidiaProductId } from '../nvidia/specs'
import { NvidiaModel } from '../nvidia/NvidiaModel'
import { isTeslaProductId } from '../tesla/specs'
import { TeslaModel } from '../tesla/TeslaModel'
import { isConsoleProductId } from '../consoles/specs'
import { ConsoleModel } from '../consoles/ConsoleModel'

const ivory = '#e8e4d6'
const orange = '#cf592c'
const metal = '#536067'

function Band({ y, radius, color = metal, thickness = 0.023 }: { y: number; radius: number; color?: string; thickness?: number }) {
  return <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, thickness, 8, 48]} /><meshStandardMaterial color={color} metalness={0.75} roughness={0.35} /></mesh>
}

function Porthole({ y, radius, z }: { y: number; radius: number; z: number }) {
  return <group position={[0, y, z]}>
    <mesh><torusGeometry args={[radius, 0.052, 12, 36]} /><meshStandardMaterial color="#a8a997" metalness={0.8} roughness={0.26} /></mesh>
    <mesh position={[0, 0, 0.008]} scale={[1, 1, 0.3]}><sphereGeometry args={[radius * 0.88, 32, 20]} /><meshPhysicalMaterial color="#16414a" metalness={0.48} roughness={0.1} clearcoat={1} emissive="#0d282c" emissiveIntensity={0.3} /></mesh>
    <mesh position={[-radius * 0.25, radius * 0.32, radius * 0.28]} rotation={[0, 0, -0.4]}><capsuleGeometry args={[radius * 0.05, radius * 0.45, 3, 8]} /><meshBasicMaterial color="#97c6ce" transparent opacity={0.55} /></mesh>
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 4) * radius, Math.sin(i * Math.PI / 4) * radius, 0.057]}><sphereGeometry args={[0.018, 6, 6]} /><meshStandardMaterial color="#d4d2bd" metalness={0.8} roughness={0.4} /></mesh>)}
  </group>
}

function RocketMark() {
  const map = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 160
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = orange; ctx.font = 'italic 700 100px Arial'; ctx.textAlign = 'center'; ctx.fillText('01', 128, 104)
    ctx.fillRect(42, 135, 172, 5)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
  return <mesh position={[0, -0.69, 0.795]} rotation={[-0.1, 0, 0]}><planeGeometry args={[0.48, 0.3]} /><meshStandardMaterial map={map} transparent depthWrite={false} roughness={0.7} polygonOffset polygonOffsetFactor={-1} /></mesh>
}

export function Rocket({ engineOn = false }: { engineOn?: boolean }) {
  const flame = useRef<THREE.Group>(null)
  const body = useMemo(() => [new THREE.Vector2(0.43, -1.65), new THREE.Vector2(0.61, -1.4), new THREE.Vector2(0.76, -0.9), new THREE.Vector2(0.82, -0.2), new THREE.Vector2(0.8, 0.45), new THREE.Vector2(0.72, 1.0), new THREE.Vector2(0.64, 1.28)], [])
  const nose = useMemo(() => [new THREE.Vector2(0.643, 1.28), new THREE.Vector2(0.57, 1.62), new THREE.Vector2(0.43, 1.96), new THREE.Vector2(0.26, 2.28), new THREE.Vector2(0.09, 2.54), new THREE.Vector2(0, 2.63)], [])
  const fin = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0.56, -0.66); shape.quadraticCurveTo(0.87, -0.77, 1.09, -1.05); shape.lineTo(1.43, -2.13); shape.quadraticCurveTo(1.48, -2.31, 1.3, -2.22); shape.lineTo(0.55, -1.68); shape.closePath()
    return shape
  }, [])
  useFrame(({ clock }) => { if (flame.current && engineOn) flame.current.scale.y = 0.9 + Math.sin(clock.elapsedTime * 28) * 0.14 })
  return <group name="asset-explorer-01">
    <mesh castShadow receiveShadow><latheGeometry args={[body, 64]} /><meshPhysicalMaterial color={ivory} roughness={0.37} metalness={0.25} clearcoat={0.3} /></mesh>
    <mesh castShadow><latheGeometry args={[nose, 64]} /><meshPhysicalMaterial color={orange} roughness={0.32} metalness={0.3} clearcoat={0.45} /></mesh>
    <Band y={1.29} radius={0.65} thickness={0.04} color="#bdbbad" />
    <Band y={0.91} radius={0.742} thickness={0.012} color="#9b9c92" />
    <Band y={-0.15} radius={0.825} thickness={0.012} color="#a8a89c" />
    <Band y={-1.27} radius={0.665} thickness={0.04} />
    {[-1.12, 0.99].map(y => Array.from({ length: 16 }, (_, i) => {
      const r = y > 0 ? 0.73 : 0.702
      return <mesh key={`${y}-${i}`} position={[Math.sin(i * Math.PI / 8) * r, y, Math.cos(i * Math.PI / 8) * r]}><sphereGeometry args={[0.019, 6, 6]} /><meshStandardMaterial color="#737c77" metalness={0.6} roughness={0.6} /></mesh>
    }))}
    <Porthole y={0.61} radius={0.225} z={0.785} />
    <Porthole y={0.05} radius={0.166} z={0.821} />
    <RocketMark />
    {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map(angle => <group key={angle} rotation={[0, angle + Math.PI / 6, 0]}><mesh position={[0, 0, -0.055]} castShadow><extrudeGeometry args={[fin, { depth: 0.11, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 2, steps: 1, curveSegments: 10 }]} /><meshPhysicalMaterial color={orange} roughness={0.37} metalness={0.28} clearcoat={0.4} /></mesh></group>)}
    <mesh position={[0, -1.54, 0]} castShadow><cylinderGeometry args={[0.57, 0.5, 0.28, 40]} /><meshStandardMaterial color="#344148" metalness={0.8} roughness={0.28} /></mesh>
    <mesh position={[0, -1.94, 0]} castShadow><cylinderGeometry args={[0.3, 0.46, 0.6, 40, 1, true]} /><meshStandardMaterial side={THREE.DoubleSide} color="#586064" metalness={0.9} roughness={0.3} /></mesh>
    {[-1.68, -1.85, -2.04, -2.23].map((y, i) => <Band key={y} y={y} radius={0.31 + i * 0.055} thickness={0.04} color="#777d77" />)}
    <mesh position={[0, -2.18, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.37, 32]} /><meshStandardMaterial color="#091016" emissive={engineOn ? '#fb8635' : '#030507'} emissiveIntensity={engineOn ? 2 : 0.1} side={THREE.DoubleSide} /></mesh>
    {engineOn && <group ref={flame} position={[0, -2.23, 0]}>
      <mesh position={[0, -0.62, 0]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.35, 1.4, 24]} /><meshBasicMaterial color="#ef7838" transparent opacity={0.6} depthWrite={false} /></mesh>
      <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.23, 0.95, 24]} /><meshBasicMaterial color="#fce7ae" /></mesh>
    </group>}
  </group>
}

export function Basalt({ dark = false }: { dark?: boolean }) {
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1)
    const points = geo.attributes.position
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), y = points.getY(i), z = points.getZ(i)
      const f = 1 + Math.sin(x * 14 + z * 6) * 0.1 + Math.cos(y * 8) * 0.07
      points.setXYZ(i, x * f * 1.18, Math.max(-0.6, y * f * 0.8), z * f)
    }
    geo.computeVertexNormals(); return geo
  }, [])
  return <group name="asset-basalt" position={[0, 0.6, 0]}>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={dark ? '#101e2a' : '#626c6d'} flatShading roughness={0.98} metalness={0.12} /></mesh>
    <mesh position={[0.82, -0.35, 0.64]} scale={0.3} rotation={[0.3, 0.7, 0]} geometry={geometry} castShadow><meshStandardMaterial color={dark ? '#162432' : '#86908a'} flatShading roughness={1} /></mesh>
  </group>
}

export function Launchpad() {
  return <group name="asset-launchpad">
    <mesh position={[0, 0.12, 0]} receiveShadow castShadow><cylinderGeometry args={[2.7, 2.9, 0.25, 8]} /><meshStandardMaterial color="#343f43" roughness={0.75} metalness={0.45} /></mesh>
    <mesh position={[0, 0.275, 0]} receiveShadow><cylinderGeometry args={[2.5, 2.5, 0.08, 8]} /><meshStandardMaterial color="#647273" roughness={0.75} metalness={0.4} /></mesh>
    <mesh position={[0, 0.323, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.76, 1.86, 64]} /><meshStandardMaterial color="#dd9761" roughness={0.65} emissive="#855331" emissiveIntensity={0.12} /></mesh>
    <mesh position={[0, 0.326, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.85, 0.875, 48]} /><meshStandardMaterial color="#a6af9c" /></mesh>
    {[-0.6, 0.6].map(x => <mesh key={x} position={[x, 0.33, 0]}><boxGeometry args={[0.07, 0.01, 1.1]} /><meshStandardMaterial color="#d5d8bd" /></mesh>)}
    <mesh position={[0, 0.33, 0]}><boxGeometry args={[1.2, 0.01, 0.07]} /><meshStandardMaterial color="#d5d8bd" /></mesh>
    {Array.from({ length: 8 }, (_, i) => {
      const a = i * Math.PI / 4 + Math.PI / 8
      return <group key={i} position={[Math.sin(a) * 2.6, 0.25, Math.cos(a) * 2.6]} rotation={[0, a, 0]}>
        <mesh castShadow><boxGeometry args={[0.26, 0.27, 0.3]} /><meshStandardMaterial color="#273235" metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0, 0.14, 0]}><boxGeometry args={[0.16, 0.05, 0.22]} /><meshStandardMaterial color="#e0eaa1" emissive="#c9e87d" emissiveIntensity={1.4} /></mesh>
      </group>
    })}
    <mesh position={[0, 0.1, 2.8]} rotation={[0.08, 0, 0]} receiveShadow><boxGeometry args={[1.3, 0.13, 1.1]} /><meshStandardMaterial color="#576164" roughness={0.8} /></mesh>
  </group>
}

function Strut({ a, b, radius = 0.055 }: { a: Vec3; b: Vec3; radius?: number }) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b)
  const mid = from.clone().add(to).multiplyScalar(0.5)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
  return <mesh position={mid} quaternion={quaternion} castShadow><cylinderGeometry args={[radius, radius, from.distanceTo(to), 10]} /><meshStandardMaterial color="#829195" metalness={0.7} roughness={0.4} /></mesh>
}

export function Antenna() {
  const dish = useMemo(() => Array.from({ length: 18 }, (_, i) => { const r = i / 17 * 1.12; return new THREE.Vector2(r, r * r * 0.34) }), [])
  return <group name="asset-antenna">
    <mesh position={[0, 0.07, 0]} receiveShadow><cylinderGeometry args={[0.8, 0.86, 0.15, 6]} /><meshStandardMaterial color="#454f52" roughness={0.8} metalness={0.4} /></mesh>
    {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map(a => <Strut key={a} a={[Math.sin(a) * 0.64, 0.15, Math.cos(a) * 0.64]} b={[0, 1.7, 0]} radius={0.09} />)}
    <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.14, 0.2, 1.65, 16]} /><meshStandardMaterial color="#a2ada9" roughness={0.4} metalness={0.7} /></mesh>
    <group position={[0, 1.78, 0]} rotation={[0.48, 0, -0.15]}>
      <mesh castShadow receiveShadow><latheGeometry args={[dish, 48]} /><meshStandardMaterial color={ivory} side={THREE.DoubleSide} roughness={0.45} metalness={0.5} /></mesh>
      <mesh position={[0, 0.428, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.12, 0.036, 8, 48]} /><meshStandardMaterial color="#798785" metalness={0.6} roughness={0.4} /></mesh>
      {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map(a => <Strut key={a} a={[Math.sin(a) * 0.95, 0.31, Math.cos(a) * 0.95]} b={[0, 1.15, 0]} radius={0.023} />)}
      <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.09, 0.16, 0.3, 16]} /><meshStandardMaterial color={orange} metalness={0.4} roughness={0.4} /></mesh>
    </group>
  </group>
}

export function AssetModel({ id, separated = false }: { id: AssetId; separated?: boolean }) {
  if (isConsoleProductId(id)) return <ConsoleModel id={id} />
  if (isTeslaProductId(id)) return <TeslaModel id={id} />
  if (isNvidiaProductId(id)) return <NvidiaModel id={id} />
  if (isDjiId(id)) return <DjiModel id={id} />
  if (isAppleProductId(id)) return <AppleModel id={id} />
  if (isSpacecraftId(id)) return <SpacecraftModel id={id} separated={separated} />
  if (isCarId(id)) return <FormulaCar id={id} />
  if (id === 'rocket') return <Rocket />
  if (id === 'basalt') return <Basalt />
  if (id === 'launchpad') return <Launchpad />
  return <Antenna />
}
