import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei'
import type { OrbitControls as ControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { CanvasBoundary } from '../components/StudioCanvas'
import { buildArm, disposeStructure, Ground, LaunchSite } from './LaunchSite'
import { MissionPlayer, sampleMission, SITE, smooth } from './mission'
import { Plumes, Smoke, HotstageVents } from './FlightEffects'
import { refineSpacecraftSurfaces } from '../spacecraft/surfaces'
import { instanceEngines } from '../spacecraft/instances'
import { missionCamera } from './camera'
import type { CameraMode, MissionSample } from './mission'

// One render unit represents 100 metres, spanning both the tower and suborbital coast.
const SCALE = .01
type Shared = { player: MissionPlayer; mode: CameraMode; sample: MissionSample }
type SharedRef = RefObject<Shared>

function Sky() {
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
        vec3 day=mix(vec3(.58,.71,.79),vec3(.055,.21,.39),pow(h,.65));
        vec3 night=mix(vec3(.12,.23,.30),vec3(.012,.025,.045),pow(h,.15));
        vec3 c=mix(day,night,smoothstep(14000.,85000.,altitude));
        float sun=pow(max(0.,dot(d,normalize(vec3(-.6,.38,.5)))),500.);
        c+=vec3(.9,.64,.30)*sun*.8; gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} />
  </mesh>
}

function CatchArms({ shared }: { shared: SharedRef }) {
  const carriage = useRef<THREE.Group>(null), left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null)
  const pistons = useRef<(THREE.Mesh | null)[]>([]), rods = useRef<(THREE.Mesh | null)[]>([])
  const arms = useMemo(() => [buildArm(), buildArm()], [])
  const from = useMemo(()=>new THREE.Vector3(),[]), to = useMemo(()=>new THREE.Vector3(),[]), delta=useMemo(()=>new THREE.Vector3(),[]), axis=useMemo(()=>new THREE.Vector3(0,1,0),[])
  useEffect(() => () => arms.forEach(disposeStructure), [arms])
  useFrame(() => {
    const s=shared.current.sample, yaw=.3*(1-s.armClosure)
    if (left.current) left.current.rotation.y=-yaw
    if (right.current) right.current.rotation.y=yaw
    if (carriage.current) carriage.current.position.y=SITE.armTop-2-s.supportDrop
    for (const [i, side] of [-1,1].entries()) {
      from.set(SITE.towerX+7,-3.5,side*8.2)
      to.set(SITE.towerX+9+Math.cos(yaw)*12,-3.5,side*(5.5+Math.sin(yaw)*12))
      const length=from.distanceTo(to)
      for (const [mesh,start,end] of [[pistons.current[i],0,.62],[rods.current[i],.45,1]] as const) if(mesh) {
        mesh.position.copy(from).lerp(to,(start+end)/2)
        mesh.quaternion.setFromUnitVectors(axis,delta.copy(to).sub(from).normalize())
        mesh.scale.y=length*(end-start)
      }
    }
  })
  return <group ref={carriage} position={[0,SITE.armTop-2,0]}>
    {[-1,1].map((side,i)=><group key={side}>
      <mesh position={[SITE.towerX+9,-1.5,side*7.4]} castShadow><boxGeometry args={[4,12,.8]}/><meshStandardMaterial color="#53636a" metalness={.7} roughness={.45}/></mesh>
      {[-6,3].map(y=><mesh key={y} position={[SITE.towerX+8.2,y,side*6.7]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[1.1,1.1,.7,24]}/><meshStandardMaterial color="#25353c" metalness={.7} roughness={.4}/></mesh>)}
      <mesh ref={m=>{pistons.current[i]=m}} castShadow><cylinderGeometry args={[.38,.38,1,20]}/><meshStandardMaterial color="#a99962" metalness={.65} roughness={.38}/></mesh>
      <mesh ref={m=>{rods.current[i]=m}} castShadow><cylinderGeometry args={[.21,.21,1,20]}/><meshStandardMaterial color="#bdcbd0" metalness={.92} roughness={.2}/></mesh>
    </group>)}
    {[-6,3].map(y=><mesh key={y} position={[SITE.towerX+9,y,0]} castShadow><boxGeometry args={[4,.8,15]}/><meshStandardMaterial color="#53636a" metalness={.7} roughness={.45}/></mesh>)}
    <group ref={left} position={[SITE.towerX+9,0,5.5]}><primitive object={arms[0]} dispose={null}/></group>
    <group ref={right} position={[SITE.towerX+9,0,-5.5]}><primitive object={arms[1]} dispose={null}/></group>
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
    const dispose = [booster,ship,ring].map(refineSpacecraftSurfaces)
    const gimbals: THREE.Object3D[] = []
    booster.getObjectByName('raptor-booster')!.children.slice(20).forEach(engine => { const pivot=engine.children.find(child=>child.name.startsWith('engine-gimbal')); if(pivot)gimbals.push(pivot) })
    const engines=instanceEngines(booster), shipEngines=instanceEngines(ship)
    dispose.push(engines.dispose,shipEngines.dispose)
    return { booster, ship, ring, dispose, gimbals, updateEngines:engines.update, fins: [1,2,3,4].map(i => booster.getObjectByName(`booster-grid-fin-${i}`)).filter(Boolean) as THREE.Object3D[] }
  }, [scene])
  useEffect(()=>()=>objects.dispose.forEach(dispose=>dispose()),[objects])
  useFrame(() => {
    const s = shared.current.sample
    booster.current?.position.set(...s.position); booster.current?.rotation.set(0, 0, s.angle)
    ship.current?.position.set(...s.shipPosition); ship.current?.rotation.set(0, 0, s.shipAngle)
    ring.current?.position.set(...s.ringPosition); ring.current?.rotation.set(0, 0, s.ringAngle)
    if (ring.current) ring.current.visible = s.time < 300
    objects.fins.forEach((fin,i)=>{fin.rotation.z=s.finDeflection*(i%2 ? -1 : 1)})
    objects.gimbals.forEach(pivot=>{pivot.rotation.z=s.gimbal})
    objects.updateEngines()
  })
  return <>
    <group ref={booster}>
      <primitive object={objects.booster} dispose={null} />
      <HotstageVents shared={shared}/>
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
    const s = shared.current.sample, mode = shared.current.mode
    const {look,eye}=missionCamera(s,mode,size.width/size.height)
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
    <Sky />
    <ambientLight intensity={.22} />
    <hemisphereLight args={['#d5e9f3', '#52513e', .8]} />
    <directionalLight position={[-20, 30, 20]} color="#fff0d5" intensity={3.1} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2.3} shadow-camera-bottom={-1} shadow-camera-near={1} shadow-camera-far={80} shadow-bias={-.00002} shadow-normalBias={.003} />
    <directionalLight position={[20, 8, -15]} color="#b3d4e6" intensity={.9} />
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
