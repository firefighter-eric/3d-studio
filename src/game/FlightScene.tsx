import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Basalt } from '../components/Models'
import { CanvasBoundary, StudioLights } from '../components/StudioCanvas'
import { EnemyShip, PlayerShip } from './Ships'
import { PICKUP_COLORS } from './simulation'
import type { Bullet, FlightInput, FlightSnapshot, FlightSimulation, PickupKind, CombatEvent } from './simulation'

function Starfield({ simulation }: { simulation?: FlightSimulation }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => { let seed = 83; const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296 }; return new Float32Array(Array.from({ length: 260 },()=>[(random()-.5)*22,(random()-.5)*26,-2-random()*7]).flat()) }, [])
  useFrame((_,dt)=>{
    if (!ref.current || !simulation || simulation.status !== 'playing') return
    const attr=ref.current.geometry.attributes.position
    for(let i=0;i<attr.count;i++) { let y=attr.getY(i)-Math.min(dt,.05)*(.5+(i%4)*.45); if(y < -13)y=13;attr.setY(i,y) }; attr.needsUpdate=true
  })
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]} /></bufferGeometry><pointsMaterial color="#b8dfe8" size={.025} transparent opacity={.62} sizeAttenuation /></points>
}
function CombatLights() { return <><ambientLight intensity={1.1} color="#b8d3e6" /><directionalLight position={[-3,5,9]} intensity={3.8} color="#e2f1ff" /><directionalLight position={[4,-5,6]} intensity={1.6} color="#ffc9a0" /></> }
export function FlightPreview() {
  return <CanvasBoundary><Canvas camera={{position:[0,0,10],fov:38}} dpr={[1,1.5]} frameloop="demand" gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}} aria-label="星际穿行战斗机与敌舰三维预览"><Suspense fallback={null}>
    <StudioLights /><Starfield /><group position={[.4,-.45,.4]} rotation={[.18,-.22,-.45]} scale={2.8}><PlayerShip /></group>
    <group position={[-1.7,1.65,-1.5]} rotation={[.12,.15,.25]} scale={1.2}><EnemyShip kind="interceptor" /></group>
    <group position={[2.4,1.3,-2.7]} rotation={[.05,-.1,-.2]} scale={.9}><EnemyShip kind="frigate" /></group>
    <mesh position={[-.1,2.1,-1]} rotation={[0,0,-.4]}><capsuleGeometry args={[.035,.7,3,6]} /><meshBasicMaterial color="#95f2ff" /></mesh>
  </Suspense></Canvas></CanvasBoundary>
}
function FlightCamera({ simulation, reducedMotion }: {simulation:FlightSimulation;reducedMotion:boolean}) {
  const {camera,size}=useThree()
  useEffect(()=>{if(camera instanceof THREE.OrthographicCamera){camera.zoom=Math.min(size.width/13,size.height/18);camera.updateProjectionMatrix()}},[camera,size])
  useFrame(()=>{const s=reducedMotion||simulation.status!=='playing'?0:simulation.shake*.09;camera.position.x=Math.sin(simulation.elapsed*87)*s;camera.position.y=Math.cos(simulation.elapsed*69)*s})
  return null
}
const letterTextures=new Map<PickupKind,THREE.CanvasTexture>()
function pickupTexture(kind:PickupKind) {
  if(letterTextures.has(kind))return letterTextures.get(kind)!
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!
  const color=PICKUP_COLORS[kind];ctx.translate(64,64);ctx.beginPath()
  for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;const x=Math.cos(a)*53,y=Math.sin(a)*53;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}
  ctx.closePath();ctx.fillStyle='#081723';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle=color;ctx.stroke()
  ctx.shadowColor=color;ctx.shadowBlur=12;ctx.fillStyle=color;ctx.font='bold 61px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(({spread:'S',laser:'L',missile:'M',repair:'+',bomb:'B'})[kind],0,3)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;letterTextures.set(kind,texture);return texture
}
function PickupMesh({kind}:{kind:PickupKind}) {
  const map=useMemo(()=>pickupTexture(kind),[kind])
  return <><mesh position={[0,0,.2]}><planeGeometry args={[.94,.94]} /><meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false} /></mesh><mesh><torusGeometry args={[.56,.02,6,36]} /><meshBasicMaterial color={PICKUP_COLORS[kind]} transparent opacity={.6} toneMapped={false} /></mesh></>
}
const bulletColors:Record<Bullet['kind'],string>={pulse:'#e2fac5',spread:'#ffc47b',laser:'#80eaff',missile:'#d7b1ff',hostile:'#ff6d52',plasma:'#ffb08a'}
function BulletPool({pool,hostile=false}:{pool:Bullet[];hostile?:boolean}) {
  const outer=useRef<THREE.InstancedMesh>(null),inner=useRef<THREE.InstancedMesh>(null)
  const temp=useMemo(()=>new THREE.Object3D(),[]),color=useMemo(()=>new THREE.Color(),[])
  useFrame(()=>{
    if(!outer.current||!inner.current)return
    for(const b of pool) {
      if(!b.active){temp.scale.setScalar(0);temp.updateMatrix();outer.current.setMatrixAt(b.id,temp.matrix);inner.current.setMatrixAt(b.id,temp.matrix);continue}
      temp.position.set(b.x,b.y,.4);temp.rotation.set(0,0,hostile?0:-Math.atan2(b.vx,b.vy))
      if(hostile)temp.scale.set(b.radius*1.55,b.radius*1.55,1);else temp.scale.set(b.kind==='missile'?.15:.075,b.kind==='missile'?.36:.32,1)
      temp.updateMatrix();outer.current.setMatrixAt(b.id,temp.matrix);outer.current.setColorAt(b.id,color.set(bulletColors[b.kind]))
      temp.position.z=.42;temp.scale.multiplyScalar(hostile?.38:.52);temp.updateMatrix();inner.current.setMatrixAt(b.id,temp.matrix)
    }
    outer.current.instanceMatrix.needsUpdate=true;inner.current.instanceMatrix.needsUpdate=true;if(outer.current.instanceColor)outer.current.instanceColor.needsUpdate=true
  })
  return <><instancedMesh ref={outer} args={[undefined,undefined,pool.length]} frustumCulled={false}>
    {hostile?<circleGeometry args={[1,12]} />:<capsuleGeometry args={[.5,1,2,6]} />}<meshBasicMaterial toneMapped={false} />
  </instancedMesh><instancedMesh ref={inner} args={[undefined,undefined,pool.length]} frustumCulled={false}>
    {hostile?<circleGeometry args={[1,10]} />:<capsuleGeometry args={[.5,1,2,6]} />}<meshBasicMaterial color={hostile?'#fff4d7':'#f6ffff'} toneMapped={false} />
  </instancedMesh></>
}
function Effects({simulation}:{simulation:FlightSimulation}) {
  const bits=useRef<THREE.InstancedMesh>(null),rings=useRef<THREE.InstancedMesh>(null),bomb=useRef<THREE.Mesh>(null)
  const temp=useMemo(()=>new THREE.Object3D(),[]),color=useMemo(()=>new THREE.Color(),[])
  useFrame(()=>{
    if(!bits.current||!rings.current)return
    const palette=['#ffb16f','#8bedff','#c69eff','#e3f1a7']
    for(const p of simulation.particles) {
      const fade=p.life/p.maxLife
      temp.position.set(p.x,p.y,.5);temp.rotation.set(0,0,Math.atan2(p.vy,p.vx));temp.scale.set(p.active?p.size*fade:0,p.active?p.size*fade*.48:0,1);temp.updateMatrix();bits.current.setMatrixAt(p.id,temp.matrix);bits.current.setColorAt(p.id,color.set(palette[p.color]).multiplyScalar(Math.max(.1,fade)))
      temp.scale.setScalar(p.active&&p.ring?(1-fade)*1.55+.04:0);temp.updateMatrix();rings.current.setMatrixAt(p.id,temp.matrix);rings.current.setColorAt(p.id,color.set(palette[p.color]).multiplyScalar(Math.max(0,fade*.7)))
    }
    for(const mesh of [bits.current,rings.current]) {mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}
    if(bomb.current){bomb.current.visible=simulation.bombFlash>0;bomb.current.position.set(simulation.x,simulation.y,.5);bomb.current.scale.setScalar(.6+(1.2-simulation.bombFlash)*17);(bomb.current.material as THREE.MeshBasicMaterial).opacity=simulation.bombFlash*.6}
  })
  return <><instancedMesh ref={bits} args={[undefined,undefined,simulation.particles.length]} frustumCulled={false}><planeGeometry args={[2,2]} /><meshBasicMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></instancedMesh>
    <instancedMesh ref={rings} args={[undefined,undefined,simulation.particles.length]} frustumCulled={false}><ringGeometry args={[.95,1,24]} /><meshBasicMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></instancedMesh>
    <mesh ref={bomb} visible={false}><ringGeometry args={[.965,1,80]} /><meshBasicMaterial color="#b4f6ff" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh></>
}
function Scenery({simulation}:{simulation:FlightSimulation}) {
  const rocks=useRef<(THREE.Group|null)[]>([])
  useFrame(()=>{for(let i=0;i<8;i++){const r=rocks.current[i];if(!r)continue;r.position.y=12-((simulation.elapsed*.8+i*3.7)%26);r.rotation.z=i+simulation.elapsed*.04}})
  return <group>{Array.from({length:8},(_,i)=><group ref={g=>{rocks.current[i]=g}} key={i} position={[(i%2?1:-1)*(6.35+(i%3)*.35),i*3-10,-4]} rotation={[.4,i,.3]} scale={.7+i%3*.3}><Basalt dark /></group>)}</group>
}
interface WorldProps { simulation:FlightSimulation;input:MutableRefObject<FlightInput>;onSnapshot:(s:FlightSnapshot)=>void;onEvents:(events:CombatEvent[])=>void;reducedMotion:boolean;onPerformance?:(fps:number,draws:number)=>void }
function FlightWorld({simulation,input,onSnapshot,onEvents,reducedMotion,onPerformance}:WorldProps) {
  const ship=useRef<THREE.Group>(null),shield=useRef<THREE.Mesh>(null),hitbox=useRef<THREE.Mesh>(null),enemies=useRef<(THREE.Group|null)[]>([]),pickups=useRef<(THREE.Group|null)[]>([]),flashes=useRef<(THREE.Mesh|null)[]>([]),laser=useRef<THREE.Group>(null),beams=useRef<(THREE.Group|null)[]>([])
  const accumulator=useRef(0),hudTime=useRef(0),lastStatus=useRef(simulation.status),performanceTime=useRef(0),frames=useRef(0)
  const {gl}=useThree()
  useFrame((_,delta)=>{
    if(simulation.status==='playing') {accumulator.current+=Math.min(delta,.1);while(accumulator.current>=1/120){simulation.step(1/120,input.current);accumulator.current-=1/120}} else accumulator.current=0
    onEvents(simulation.drainEvents())
    if(ship.current){ship.current.position.set(simulation.status==='ready'?2.1:simulation.x,simulation.status==='ready'?3.3:simulation.y,0);ship.current.scale.setScalar(simulation.status==='ready'?2.5:1);ship.current.rotation.set(0,simulation.status==='ready'?-.22:simulation.bank*.7,simulation.status==='ready'?-.4:simulation.bank*.42);ship.current.visible=simulation.status!=='lost'&&(simulation.invulnerable<=0||Math.floor(simulation.invulnerable*18)%4!==0)}
    if(shield.current){shield.current.visible=simulation.invulnerable>0&&simulation.status==='playing';shield.current.position.set(simulation.x,simulation.y,.2);shield.current.rotation.z=simulation.elapsed; (shield.current.material as THREE.MeshBasicMaterial).opacity=.18+Math.sin(simulation.elapsed*8)*.08}
    if(hitbox.current){hitbox.current.position.set(simulation.x,simulation.y,.85);hitbox.current.visible=simulation.status==='playing';hitbox.current.scale.setScalar(simulation.focus?1.2:.7)}
    for(const e of simulation.enemies){const ref=enemies.current[e.id],flash=flashes.current[e.id];if(ref){ref.visible=e.active;ref.position.set(e.x,e.y,0);ref.rotation.z=e.rotation}if(flash){flash.visible=e.active&&e.hit>0;flash.position.set(e.x,e.y,.5);flash.scale.set(e.radius*.8,e.radius*.8,1)}}
    for(const p of simulation.pickups){const ref=pickups.current[p.id];if(ref){ref.visible=p.active;ref.position.set(p.x,p.y,.25);ref.rotation.z=Math.sin(p.age*2)*.1;ref.scale.setScalar(.92+Math.sin(p.age*5)*.05)}}
    if(laser.current){laser.current.visible=simulation.laserActive;laser.current.position.set(simulation.x,simulation.y+.7,.3);laser.current.scale.set(.78+simulation.level*.17,9-simulation.y-.7,1)}
    beams.current.forEach((ref,i)=>{if(!ref)return;ref.visible=simulation.beamActive>0||simulation.beamWarning>0;ref.position.set(simulation.beamX[i],((simulation.boss?.y??6)-9)/2,.27);ref.scale.set(simulation.beamActive>0?.68:.045,(simulation.boss?.y??6)+9,1);const mat=(ref.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;mat.opacity=simulation.beamActive>0?.7:.3+Math.sin(simulation.elapsed*20)*.15})
    hudTime.current+=delta
    if(hudTime.current>.1||lastStatus.current!==simulation.status){onSnapshot(simulation.snapshot());hudTime.current=0;lastStatus.current=simulation.status}
    performanceTime.current+=delta;frames.current++
    if(performanceTime.current>2){onPerformance?.(Math.round(frames.current/performanceTime.current),gl.info.render.calls);performanceTime.current=0;frames.current=0}
  },-1)
  return <>
    <FlightCamera simulation={simulation} reducedMotion={reducedMotion}/><CombatLights/><Starfield simulation={simulation}/><Scenery simulation={simulation}/>
    <group ref={ship} position={[0,-5.9,0]}><PlayerShip engineOn={simulation.status==='playing'}/></group>
    <mesh ref={shield} visible={false}><ringGeometry args={[.83,.86,6]}/><meshBasicMaterial color="#8aebff" transparent opacity={.3} depthWrite={false} side={THREE.DoubleSide}/></mesh>
    <mesh ref={hitbox} visible={false}><ringGeometry args={[.085,.13,20]}/><meshBasicMaterial color="#ffffff" transparent opacity={.85} toneMapped={false}/></mesh>
    {simulation.enemies.map(e=><group key={e.id}><group ref={g=>{enemies.current[e.id]=g}} visible={false}><EnemyShip kind={e.kind}/></group><mesh ref={m=>{flashes.current[e.id]=m}} visible={false}><circleGeometry args={[.5,12]}/><meshBasicMaterial color="#fff0d2" transparent opacity={.48} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh></group>)}
    {simulation.pickups.map(p=><group key={p.id} ref={g=>{pickups.current[p.id]=g}} visible={false}><PickupMesh kind={p.kind}/></group>)}
    <BulletPool pool={simulation.bullets}/><BulletPool pool={simulation.hostile} hostile/><Effects simulation={simulation}/>
    <group ref={laser} visible={false}>{[{width:.52,opacity:.1,color:'#58cfff'},{width:.17,opacity:.64,color:'#79edff'},{width:.044,opacity:.98,color:'#efffff'}].map((v,i)=><mesh key={i} position={[0,.5,i*.005]}><planeGeometry args={[v.width,1]}/><meshBasicMaterial color={v.color} transparent opacity={v.opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>)}</group>
    {[0,1].map(i=><group ref={g=>{beams.current[i]=g}} key={i} visible={false}><mesh><planeGeometry args={[1,1]}/><meshBasicMaterial color="#ff694c" transparent opacity={.6} depthWrite={false} toneMapped={false}/></mesh><mesh position={[0,0,.01]}><planeGeometry args={[.13,1]}/><meshBasicMaterial color="#fff0bd" transparent opacity={.7} depthWrite={false} toneMapped={false}/></mesh></group>)}
  </>
}
export function FlightCanvas(props:WorldProps) {
  return <CanvasBoundary><Canvas orthographic camera={{position:[0,0,25],zoom:40,near:.1,far:100}} dpr={[1,1.5]} gl={{antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'}} aria-label="星际穿行实时三维战斗画面"><Suspense fallback={null}><FlightWorld {...props}/></Suspense></Canvas></CanvasBoundary>
}
