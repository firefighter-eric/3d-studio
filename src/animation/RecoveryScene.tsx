import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei'
import type { OrbitControls as ControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { CanvasBoundary } from '../components/StudioCanvas'
import { buildArm, disposeStructure, Ground, LaunchSite } from './LaunchSite'
import { CATCH, MissionPlayer, sampleMission, SITE, smooth } from './mission'
import type { CameraMode, MissionSample, Vec3 } from './mission'

// One render unit represents 100 metres, spanning both the tower and suborbital coast.
const SCALE = .01
const ORANGE = '#ff9a4f'
type Shared = { player: MissionPlayer; mode: CameraMode; sample: MissionSample }
type SharedRef = RefObject<Shared>

function Sky({ shared }: { shared: SharedRef }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ altitude: { value: 0 } }), [])
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position)
    if (material.current) material.current.uniforms.altitude.value = Math.max(0, camera.position.y / SCALE)
  })
  return <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
    <sphereGeometry args={[15000, 32, 20]} />
    <shaderMaterial ref={material} side={THREE.BackSide} depthWrite={false} uniforms={uniforms}
      vertexShader={'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
      fragmentShader={`varying vec3 vDirection; uniform float altitude;
        void main(){ vec3 d=normalize(vDirection); float h=clamp(d.y*.65+.2,0.,1.);
        vec3 day=mix(vec3(.69,.77,.75),vec3(.12,.31,.47),pow(h,.55));
        vec3 night=mix(vec3(.12,.23,.30),vec3(.012,.025,.045),pow(h,.15));
        vec3 c=mix(day,night,smoothstep(14000.,85000.,altitude));
        float sun=pow(max(0.,dot(d,normalize(vec3(-.6,.38,.5)))),500.);
        c+=vec3(.9,.64,.30)*sun*.8; gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} />
  </mesh>
}

function Plumes({ shared, ship = false }: { shared: SharedRef; ship?: boolean }) {
  const outer = useRef<THREE.InstancedMesh>(null), core = useRef<THREE.InstancedMesh>(null)
  const obj = useMemo(() => new THREE.Object3D(), [])
  const positions = useMemo(() => {
    const rings = ship ? [[3, 1.15, 0], [3, 2.8, Math.PI/3]] : [[20, 3.78, 0], [10, 2.22, Math.PI/10], [3, .76, 0]]
    return rings.flatMap(([count, radius, phase]) => Array.from({ length: count }, (_, i) => [Math.sin(i/count*Math.PI*2+phase)*radius, Math.cos(i/count*Math.PI*2+phase)*radius] as const))
  }, [ship])
  useFrame(() => {
    if (!outer.current || !core.current) return
    const s = shared.current.sample, active = ship ? s.shipEngines : s.boosterEngines
    const burn = ship ? s.time >= 160 : active > 0
    positions.forEach(([x, z], i) => {
      const on = burn && (ship || active === 33 || active === 13 && i >= 20 || active === 3 && i >= 30)
      const shimmer = 1 + Math.sin(s.time*48+i*2.7)*.07
      const length = ship ? (s.separated ? 36 : 5) : Math.min(s.time < 0 ? 22 : s.time < 160 ? 72 : s.time < 221 ? 62 : 38, Math.max(8, s.position[1]*.86)) * s.throttle
      obj.position.set(x, -length*.5, z); obj.rotation.set(Math.PI, 0, 0)
      obj.scale.set(on ? (ship ? i >= 3 ? 1.1 : .65 : .62)*shimmer : 0, on ? length : 0, on ? (ship && i >= 3 ? 1.1 : .62)*shimmer : 0)
      obj.updateMatrix(); outer.current!.setMatrixAt(i, obj.matrix)
      obj.scale.multiply(new THREE.Vector3(.46, .68, .46)); obj.position.y = -length*.34
      obj.updateMatrix(); core.current!.setMatrixAt(i, obj.matrix)
    })
    outer.current.instanceMatrix.needsUpdate = true; core.current.instanceMatrix.needsUpdate = true
  })
  return <>
    <instancedMesh ref={outer} args={[undefined, undefined, positions.length]} frustumCulled={false} renderOrder={3}>
      <coneGeometry args={[1, 1, 12, 1, true]} /><meshBasicMaterial color={ORANGE} transparent opacity={.5} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={core} args={[undefined, undefined, positions.length]} frustumCulled={false} renderOrder={4}>
      <coneGeometry args={[1, 1, 10, 1, true]} /><meshBasicMaterial color="#fff4cd" transparent opacity={.82} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  </>
}
function Smoke({ shared }: { shared: SharedRef }) {
  const mesh = useRef<THREE.InstancedMesh>(null), material = useRef<THREE.MeshStandardMaterial>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    if (!mesh.current || !material.current) return
    const t = shared.current.sample.time, launch = t >= -4 && t < 55, landing = t > 404 && t < 425
    mesh.current.visible = launch || landing
    if (!launch && !landing) return
    const elapsed = launch ? t + 4 : t - 404, fade = launch ? 1-smooth(30, 55, t) : 1-smooth(419, 425, t)
    material.current.opacity = (launch ? .34 : .10)*fade
    for (let i = 0; i < 90; i++) {
      const angle = i*2.399963, age = (elapsed + i*.16)%12, radius = (launch ? 3 : 1.3)+age*(launch ? 4.5 : 2.4), size = (launch ? 4 : 1.5)+age*(launch ? 1.3 : .65)
      dummy.position.set(Math.cos(angle)*radius + age*.6, 1.5+age*(launch ? .9 : .35), (launch ? SITE.launchZ : 0)+Math.sin(angle)*radius)
      dummy.scale.set(size*1.3, size*.55, size); dummy.rotation.set(i, i*.5, 0); dummy.updateMatrix(); mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, 90]} frustumCulled={false}>
    <icosahedronGeometry args={[1, 1]} /><meshStandardMaterial ref={material} color="#d9d8c8" roughness={1} transparent depthWrite={false} />
  </instancedMesh>
}
function CatchArms({ shared }: { shared: SharedRef }) {
  const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null)
  const arms = useMemo(() => [buildArm(), buildArm()], [])
  useEffect(() => () => arms.forEach(disposeStructure), [arms])
  useFrame(() => {
    const yaw = .3*(1-shared.current.sample.armClosure)
    if (left.current) left.current.rotation.y = -yaw
    if (right.current) right.current.rotation.y = yaw
  })
  return <group position={[0, SITE.armTop-2, 0]}>
    <mesh position={[SITE.towerX+9, -1.5, 0]} castShadow><boxGeometry args={[5, 13, 17]} /><meshStandardMaterial color="#485e68" metalness={.65} roughness={.6} /></mesh>
    <group ref={left} position={[SITE.towerX+9, 0, 5.5]}><primitive object={arms[0]} dispose={null} /></group>
    <group ref={right} position={[SITE.towerX+9, 0, -5.5]}><primitive object={arms[1]} dispose={null} /></group>
  </group>
}

function Vehicles({ shared }: { shared: SharedRef }) {
  const { scene } = useGLTF('/models/starship.glb')
  const booster = useRef<THREE.Group>(null), ship = useRef<THREE.Group>(null), ring = useRef<THREE.Group>(null)
  const objects = useMemo(() => {
    const booster = scene.getObjectByName('booster')!.clone(true), ship = scene.getObjectByName('ship')!.clone(true), ring = scene.getObjectByName('hotstage')!.clone(true)
    booster.position.set(0, 0, 0); booster.scale.y = SITE.boosterHeight/69
    ship.position.set(0, 0, 0); ship.scale.y = SITE.shipHeight/52
    ring.position.set(0, -69, 0)
    for (const obj of [booster, ship, ring]) obj.traverse(child => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true } })
    return { booster, ship, ring, fins: [1,2,3,4].map(i => booster.getObjectByName(`booster-grid-fin-${i}`)).filter(Boolean) as THREE.Object3D[] }
  }, [scene])
  useFrame(() => {
    const s = shared.current.sample
    booster.current?.position.set(...s.position); booster.current?.rotation.set(0, 0, s.angle)
    ship.current?.position.set(...s.shipPosition); ship.current?.rotation.set(0, 0, s.shipAngle)
    ring.current?.position.set(...s.ringPosition); ring.current?.rotation.set(0, 0, s.ringAngle)
    if (ring.current) ring.current.visible = s.time < 300
    objects.fins.forEach((fin, i) => { fin.rotation.z = s.time > 230 && s.time < CATCH ? .12*Math.sin(s.time*.45+i*1.6)*(1-smooth(411, 419, s.time)) : 0 })
  })
  return <>
    <group ref={booster}>
      <primitive object={objects.booster} dispose={null} />
      {/* Catch lugs carry the vehicle on the upper surfaces of the two tower arms. */}
      {[-1, 1].map(side => <group key={side} position={[0, SITE.pinHeight+.5, side*5.1]}>
        <mesh castShadow><boxGeometry args={[2.5, 1, 2.1]} /><meshStandardMaterial color="#899899" metalness={.8} roughness={.37} /></mesh>
        <mesh position={[0, -1, -side*.35]} rotation={[side*-.3, 0, 0]}><boxGeometry args={[1.2, 2, .45]} /><meshStandardMaterial color="#65767b" metalness={.8} roughness={.4} /></mesh>
      </group>)}
      <Plumes shared={shared} />
    </group>
    <group ref={ship}><primitive object={objects.ship} dispose={null} /><Plumes shared={shared} ship /></group>
    <group ref={ring}><primitive object={objects.ring} dispose={null} /></group>
  </>
}

function Director({ shared }: { shared: SharedRef }) {
  const controls = useRef<ControlsImpl>(null)
  const { camera, size } = useThree()
  const previous = useRef({ revision: -1, mode: '' }), target = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const s = shared.current.sample, mode = shared.current.mode, fit = Math.max(1, .9/(size.width/size.height))
    const center = new THREE.Vector3(...s.position).add(new THREE.Vector3(-Math.sin(s.angle)*34, Math.cos(s.angle)*34, 0))
    let look: Vec3, eye: Vec3
    if (mode === 'tower') {
      // Optical tracking from the tower side; widen to keep an ascending vehicle visible.
      look = [s.position[0]*.5, Math.max(76, center.y*.6), s.position[2]*.5]
      const distance = Math.max(230, center.y*.8, s.position[0]*.85)*fit
      eye = [look[0]+distance*.9, Math.max(65, look[1]-distance*.16), look[2]+distance]
    } else {
      const final = smooth(387, 412, s.time), early = 1-smooth(8, 35, s.time)
      const stage = smooth(153, 161, s.time)*(1-smooth(170, 184, s.time))
      const distance = (160 + early*45 + stage*65 - final*12)*fit
      look = [center.x - final*12, center.y + (s.separated ? 0 : 25), center.z]
      // Staging is observed from the side so the two independent vehicles are readable.
      eye = [look[0]+distance*(.9-final*.2), look[1]+distance*(.2-final*.02), look[2]+distance*1.32]
    }
    target.set(...look).multiplyScalar(SCALE)
    const reset = previous.current.revision !== shared.current.player.revision || previous.current.mode !== mode
    if (mode !== 'follow' || reset) {
      camera.position.set(...eye).multiplyScalar(SCALE)
      camera.lookAt(target)
    } else if (controls.current) {
      const delta = target.clone().sub(controls.current.target)
      camera.position.add(delta)
    }
    if (controls.current) { controls.current.target.copy(target); controls.current.update() }
    previous.current = { revision: shared.current.player.revision, mode }
  }, -1)
  return <OrbitControls ref={controls} enabled={shared.current.mode === 'follow'} enablePan={false} enableDamping dampingFactor={.08} minDistance={.7} maxDistance={20} minPolarAngle={.03} maxPolarAngle={Math.PI*.93} />
}

function Flight({ shared, onReady, onTick, preview }: { shared: SharedRef; onReady: () => void; onTick: () => void; preview: boolean }) {
  const frames = useRef(0), next = useRef(0), lastTime = useRef(-Infinity)
  const invalidate = useThree(state => state.invalidate)
  useFrame((_, dt) => {
    if (!preview) shared.current.player.advance(dt)
    shared.current.sample = sampleMission(shared.current.player.time)
    if (frames.current < 2) { frames.current++; if (frames.current === 2) onReady(); else invalidate() }
    next.current += dt
    if (!preview && next.current >= .08 && lastTime.current !== shared.current.player.time) { next.current = 0; lastTime.current = shared.current.player.time; onTick() }
  }, -2)
  return <>
    <Sky shared={shared} />
    <ambientLight intensity={.4} />
    <hemisphereLight args={['#d5e9f3', '#70705f', 1.1]} />
    <directionalLight position={[-20, 30, 20]} color="#fff0d5" intensity={2.7} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2.3} shadow-camera-bottom={-1} shadow-camera-near={1} shadow-camera-far={80} shadow-bias={-.00002} shadow-normalBias={.003} />
    <directionalLight position={[20, 8, -15]} color="#b3d4e6" intensity={1.5} />
    <Environment resolution={64} frames={1}>
      <Lightformer form="rect" position={[5, 3, 6]} scale={[6, 12, 1]} intensity={3} />
      <Lightformer form="rect" position={[-5, 3, -3]} rotation={[0, Math.PI, 0]} scale={[5, 10, 1]} intensity={2} />
    </Environment>
    <group scale={SCALE}><Ground /><LaunchSite /><CatchArms shared={shared} /><Smoke shared={shared} /><Vehicles shared={shared} /></group>
    <Director shared={shared} />
  </>
}

export function RecoveryCanvas({ player, mode, onReady, onTick, preview = false }: { player: MissionPlayer; mode: CameraMode; onReady: () => void; onTick: () => void; preview?: boolean }) {
  const shared = useRef<Shared>({ player, mode, sample: sampleMission(player.time) })
  shared.current.mode = mode
  return <CanvasBoundary><Canvas frameloop={player.playing ? 'always' : 'demand'} shadows={preview ? false : 'percentage'} dpr={[1, 1.5]} camera={{ position: [2, 1.8, 3], fov: 40, near: .01, far: 160000 }} gl={{ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true }} aria-label={preview ? '星舰发射回收动画预览' : '星舰发射与助推器回收三维动画'}>
    <Suspense fallback={null}><Flight shared={shared} onReady={onReady} onTick={onTick} preview={preview} /></Suspense>
  </Canvas></CanvasBoundary>
}
