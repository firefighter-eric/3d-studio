import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Rocket } from '../components/Models'
import type { EnemyKind } from './simulation'

type Part = { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }
const templates = new Map<EnemyKind, Part[]>()
function buildShip(kind: EnemyKind): Part[] {
  const groups: THREE.BufferGeometry[][] = Array.from({ length: 6 }, () => [])
  const add = (geometry: THREE.BufferGeometry, material = 0, x = 0, y = 0, z = 0, rotation = 0) => {
    geometry.rotateZ(rotation); geometry.translate(x, y, z); const flat = geometry.index ? geometry.toNonIndexed() : geometry; groups[material].push(flat); if (flat !== geometry) geometry.dispose()
  }
  const plate = (points: number[][], material = 0, depth = .12, z = 0) => {
    const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])))
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .025, bevelThickness: .025 })
    g.translate(0, 0, -depth / 2); add(g, material, 0, 0, z)
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, m = 0) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z)
  const orb = (x: number, y: number, z: number, r: number, m = 4) => add(new THREE.SphereGeometry(r, 12, 8), m, x, y, z)
  if (kind === 'boss') {
    plate([[-.7,1.25],[.7,1.25],[1.03,.45],[.57,-1.15],[0,-1.5],[-.57,-1.15],[-1.03,.45]], 0, .48)
    plate([[-.48,.94],[.48,.94],[.63,.25],[.33,-1.08],[-.33,-1.08],[-.63,.25]], 1, .15, .31)
    for (const side of [-1, 1]) {
      plate([[side*.5,.8],[side*2.45,1.15],[side*2.75,.25],[side*2.37,-.7],[side*1.48,-1.0],[side*.66,-.3]],0,.3)
      plate([[side*1.12,.69],[side*2.25,.89],[side*2.41,.29],[side*1.54,-.45],[side*1.05,-.25]],1,.12,.24)
      box(side*1.88,-.52,.18,.4,1.02,.25,2); box(side*1.88,-1.15,.18,.18,.6,.17,2); box(side*1.88,-1.43,.19,.12,.14,.15,4)
      box(side*2.44,.2,.2,.09,.67,.04,3)
      for (let i=0;i<4;i++) box(side*(1.1+i*.3),.49,.36,.12,.46,.045,2)
      for (let i=0;i<3;i++) { box(side*(.88+i*.66),1.02,0,.4,.48,.3,2); box(side*(.88+i*.66),1.31,.05,.27,.11,.2,4) }
      for (let i=0;i<5;i++) orb(side*(.82+i*.32),-.08,.35,.035,3)
      box(side*.4,-.82,.43,.09,.65,.06,3)
    }
    add(new THREE.TorusGeometry(.41,.1,8,28),2,0,.25,.47)
    add(new THREE.TorusGeometry(.28,.035,8,28),4,0,.25,.58); orb(0,.25,.53,.24,4)
    box(0,.87,.38,.32,.31,.09,2)
  } else if (kind === 'frigate') {
    plate([[-.38,.9],[.38,.9],[.54,.05],[.26,-1.02],[-.26,-1.02],[-.54,.05]],0,.29)
    for (const s of [-1,1]) {
      plate([[s*.22,.6],[s*.86,.77],[s*1.02,.2],[s*.88,-.83],[s*.48,-.94],[s*.35,-.2]],0,.18)
      box(s*.72,.05,.16,.29,1.05,.17,1); box(s*.72,-.72,.16,.13,.51,.13,2)
      box(s*.72,-1.02,.16,.1,.15,.12,4); box(s*.76,.81,.03,.28,.17,.16,4)
      for(let i=0;i<5;i++) box(s*.75,.42-i*.14,.27,.21,.045,.025,2)
      box(s*.99,.1,.05,.06,.42,.11,3)
    }
    plate([[-.2,.56],[.2,.56],[.24,-.4],[0,-.75],[-.24,-.4]],1,.08,.21)
    orb(0,-.08,.27,.18,4); box(0,.56,.3,.12,.2,.06,3)
  } else if (kind === 'carrier') {
    plate([[-.43,.68],[.43,.68],[.7,.2],[.7,-.4],[.36,-.72],[-.36,-.72],[-.7,-.4],[-.7,.2]],0,.28)
    box(0,-.08,.21,.7,.77,.12,1); box(0,-.08,.3,.12,.48,.04,5); box(0,-.08,.3,.43,.12,.04,5)
    for (const s of [-1,1]) { box(s*.62,.02,.18,.17,.69,.14,2); box(s*.61,.46,.17,.12,.15,.12,5); box(s*.34,.72,0,.27,.13,.15,5) }
  } else {
    const interceptor = kind === 'interceptor'
    plate([[-.19,.57],[.19,.57],[.24,-.07],[0,-.79],[-.24,-.07]],0,.2)
    for (const s of [-1,1]) {
      plate([[s*.12,.3],[s*(interceptor?.91:.73),.66],[s*(interceptor?.75:.8),-.05],[s*.38,-.47],[s*.2,-.08]],0,.12)
      plate([[s*.3,.32],[s*(interceptor?.74:.6),.5],[s*.54,-.09],[s*.31,-.24]],1,.05,.11)
      box(s*.55,-.32,.05,.07,.5,.07,2); box(s*.55,-.59,.06,.065,.1,.065,4)
      box(s*.31,.46,-.01,.18,.25,.16,2); box(s*.31,.61,.01,.14,.08,.12,4)
      box(s*.58,.21,.16,.045,.2,.02,3)
    }
    plate([[-.1,.22],[.1,.22],[.11,-.15],[0,-.41],[-.11,-.15]],4,.04,.17)
    box(0,.42,.17,.11,.16,.04,2)
    if(interceptor) { box(-.85,.46,.04,.07,.55,.06,2); box(.85,.46,.04,.07,.55,.06,2) }
  }
  const colors = kind === 'interceptor' ? ['#626778','#984d62','#212635','#e49a86','#ff746e','#96e7b2'] : kind === 'carrier' ? ['#667377','#aba989','#283638','#e8cea2','#fb9b6e','#8effb6'] : ['#687d87','#b55d47','#202f3a','#f6bd74','#ff6d4f','#b4e8d6']
  return groups.flatMap((geometries, i) => {
    if (!geometries.length) return []
    const geometry = mergeGeometries(geometries)!; geometries.forEach(g=>g.dispose())
    return [{ geometry, material: new THREE.MeshStandardMaterial({ color: colors[i], roughness: i===4?.25:.48, metalness: i===4?.25:.65, emissive: i>=3?colors[i]:'#000000', emissiveIntensity: i>=4?2:i===3?.45:0 }) }]
  })
}
export function EnemyShip({ kind }: { kind: EnemyKind }) {
  const parts = useMemo(() => { if (!templates.has(kind)) templates.set(kind,buildShip(kind)); return templates.get(kind)! }, [kind])
  return <group dispose={null}>{parts.map((p,i)=><mesh key={i} geometry={p.geometry} material={p.material} />)}</group>
}
export function PlayerShip({ engineOn = true }: { engineOn?: boolean }) {
  const wing = useMemo(() => {
    const shape = new THREE.Shape([new THREE.Vector2(.13,.07),new THREE.Vector2(.75,-.22),new THREE.Vector2(.78,-.48),new THREE.Vector2(.31,-.4),new THREE.Vector2(.14,-.26)])
    return new THREE.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:true,bevelThickness:.018,bevelSize:.016,bevelSegments:2,steps:1})
  },[])
  return <group>
    <group scale={.255}><Rocket engineOn={engineOn} /></group>
    {[-1,1].map(s=><group key={s}>
      <mesh geometry={wing} scale={[s,1,1]} position={[0,0,-.08]}><meshStandardMaterial color="#d6dcce" metalness={.55} roughness={.35} side={THREE.DoubleSide}/></mesh>
      <mesh position={[s*.61,-.3,.025]} rotation={[0,0,s*-.2]}><boxGeometry args={[.16,.24,.025]}/><meshStandardMaterial color="#c65d37" metalness={.5} roughness={.4}/></mesh>
      <mesh position={[s*.51,-.1,.03]}><cylinderGeometry args={[.065,.09,.43,12]}/><meshStandardMaterial color="#526c73" metalness={.82} roughness={.28}/></mesh>
      <mesh position={[s*.51,.24,.03]}><cylinderGeometry args={[.033,.044,.3,10]}/><meshStandardMaterial color="#9bafae" metalness={.85} roughness={.23}/></mesh>
      {[.13,.21,.29].map(y=><mesh key={y} position={[s*.51,y,.03]}><cylinderGeometry args={[.048,.048,.02,10]}/><meshStandardMaterial color="#2b4149" metalness={.8} roughness={.35}/></mesh>)}
      <mesh position={[s*.51,.4,.03]}><sphereGeometry args={[.038,8,6]}/><meshBasicMaterial color="#bbfaff"/></mesh>
      <mesh position={[s*.35,-.35,-.015]}><cylinderGeometry args={[.085,.07,.25,12]}/><meshStandardMaterial color="#38525c" metalness={.7} roughness={.35}/></mesh>
      <mesh position={[s*.35,-.5,-.015]} rotation={[0,0,Math.PI]}><coneGeometry args={[.052,engineOn?.34:.05,10]}/><meshBasicMaterial color="#95eaff" transparent opacity={engineOn?.7:.25}/></mesh>
      {[0,1,2].map(i=><mesh key={i} position={[s*.65,-.22-i*.055,.071]}><boxGeometry args={[.09,.018,.01]}/><meshStandardMaterial color="#45595e" metalness={.65} roughness={.4}/></mesh>)}
    </group>)}
  </group>
}
