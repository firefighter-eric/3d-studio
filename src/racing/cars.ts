import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const CAR_SPECS = [
  { id: 'formula-r1', name: '赤焰 R1', english: 'IGNIS / R1', number: '07', color: '#ed593d', accent: '#f4ead0', dark: '#7c251f', role: '均衡', tagline: '把每一个弯，连成一条火线。', speed: 43, acceleration: 20, grip: 9, steering: 1.64, bars: [86, 88, 85] },
  { id: 'formula-r2', name: '潮汐 R2', english: 'TIDAL / R2', number: '12', color: '#26bfc0', accent: '#e8f6ed', dark: '#15616b', role: '抓地', tagline: '贴住弯心，听见海风。', speed: 41, acceleration: 22, grip: 11, steering: 1.83, bars: [80, 94, 98] },
  { id: 'formula-r3', name: '流星 R3', english: 'COMET / R3', number: '23', color: '#edb943', accent: '#302d49', dark: '#7b5020', role: '极速', tagline: '让终点，追不上你的尾灯。', speed: 46, acceleration: 18.5, grip: 8, steering: 1.56, bars: [98, 82, 79] },
] as const
export type CarId = typeof CAR_SPECS[number]['id']
export const isCarId = (id: string): id is CarId => CAR_SPECS.some(car => car.id === id)
export const carSpec = (id: CarId) => CAR_SPECS.find(car => car.id === id)!

// Metres; Y up, +Z forward. Origin is at the centre of the ground contact patch.
// Body parts are merged by material. Wheels retain named pivots for steering/spin.
export function buildFormulaCar(id: CarId): THREE.Group {
  const spec = carSpec(id), model = new THREE.Group()
  model.name = id
  const colors = [spec.color, spec.accent, '#20282d', '#56636a', '#f0c74c', '#121a20', spec.dark, '#ecf8f4']
  const materials = colors.map((color, i) => new THREE.MeshStandardMaterial({ color, metalness: i === 3 ? .82 : i === 2 || i === 5 ? .1 : .38, roughness: i === 2 || i === 5 ? .75 : .32 }))
  materials[5].roughness = .18
  const parts = materials.map((): THREE.BufferGeometry[] => [])
  function add(g: THREE.BufferGeometry, m: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z)
    const flat = g.index ? g.toNonIndexed() : g
    flat.deleteAttribute('uv'); parts[m].push(flat); if (flat !== g) g.dispose()
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, m = 0, ry = 0) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, 0, ry)
  function panel(points: number[][], y: number, depth: number, m = 0, bevel = .025) {
    const shape = new THREE.Shape(points.map(([x,z]) => new THREE.Vector2(x, -z)))
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1 })
    add(geo, m, 0, y, 0, -Math.PI / 2)
  }
  function loft(sections: number[][], m: number, xOffset = 0) {
    const verts: number[] = [], indices: number[] = []
    for (const [z, w, base, height] of sections) for (const [x,y] of [[-w,0],[-w*.82,height*.73],[-w*.47,height],[w*.47,height],[w*.82,height*.73],[w,0]]) verts.push(x+xOffset,base+y,z)
    for(let i=0;i<sections.length-1;i++) for(let j=0;j<6;j++) { const a=i*6+j,b=i*6+(j+1)%6,c=a+6,d=b+6; indices.push(a,b,c,b,d,c) }
    for(let j=1;j<5;j++) { indices.push(0,j+1,j); const a=(sections.length-1)*6; indices.push(a,a+j,a+j+1) }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();add(g,m)
  }
  function rod(a: number[], b: number[], radius: number, m: number) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start)
    const g=new THREE.CylinderGeometry(radius,radius,delta.length(),8)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()))
    const mid=start.add(end).multiplyScalar(.5);add(g,m,mid.x,mid.y,mid.z)
  }
  panel([[-.48,2.12],[.48,2.12],[.6,.82],[1.02,.34],[1.06,-1.45],[.58,-2.04],[-.58,-2.04],[-1.06,-1.45],[-1.02,.34],[-.6,.82]],.16,.08,2)
  loft([[-1.92,.18,.28,.46],[-1.35,.36,.28,.87],[-.63,.4,.28,.77],[.25,.36,.28,.48],[1.03,.22,.24,.26],[2.25,.13,.22,.15]],0)
  panel([[-.058,2.22],[.058,2.22],[.12,.68],[-.12,.68]],.532,.014,1,0)
  for (const side of [-1,1]) {
    const width=id==='formula-r2'?.33:.28
    loft([[-1.58,width*.52,.3,.19],[-1.05,width,.3,.36],[-.1,width,.3,.35],[.46,width*.78,.33,.2]],0,side*.73)
    box(side*.73,.5,.45,width*1.32,.18,.025,5)
    box(side*.74,.675,-.28,width*1.8,.018,.62,1)
    for(let i=0;i<5;i++) box(side*.74,.691,-.51+i*.1,width*1.4,.017,.031,6)
    panel([[side*.43,.49],[side*.98,.59],[side*1.02,.82],[side*.49,.74]],.27,.035,2)
    for(const z of [-1.36,1.37]) {
      rod([side*.31,.49,z+.3],[side*1.12,.41,z],.025,2)
      rod([side*.31,.25,z-.27],[side*1.12,.41,z],.028,2)
      rod([side*.26,.65,z-.18],[side*1.08,.44,z],.018,3)
    }
    rod([side*.28,.7,.24],[side*.59,.78,.39],.025,2)
    box(side*.64,.79,.4,.22,.09,.14,0)
  }
  // Multi-element front wing, shaped endplates and a high rear wing.
  const wingCount=id==='formula-r3'?2:3
  for(let i=0;i<wingCount;i++) panel([[-1.24,2.06+i*.15],[-.26,2.17+i*.15],[.26,2.17+i*.15],[1.24,2.06+i*.15],[1.24,1.94+i*.15],[.35,2.01+i*.15],[-.35,2.01+i*.15],[-1.24,1.94+i*.15]],.2+i*.065,.028,i===0?2:0,.012)
  for(const side of [-1,1]) {
    box(side*1.25,.34,2.2,.045,.35,.57,0)
    box(side*1.277,.39,2.17,.015,.11,.39,1)
    box(side*.34,.79,-1.98,.065,1.05,.18,2)
    box(side*1.05,1.35,-2,.06,.5,.6,0)
    box(side*1.088,1.39,-2,.02,.18,.31,1)
  }
  for(let i=0;i<2;i++) box(0,1.25+i*.17,-1.95-i*.17,2.1,.065,.32,i?0:2)
  box(0,1.442,-2.15,1.28,.018,.17,1)
  for(let i=-3;i<=3;i++) box(i*.16,.29,-1.95,.028,.22,.4,2)
  add(new THREE.CylinderGeometry(.065,.065,.26,12),3,0,.66,-1.97,Math.PI/2)
  box(0,.4,-2.12,.18,.1,.05,6)
  // Cockpit, driver, airbox and the three-legged halo.
  add(new THREE.SphereGeometry(1,20,12).scale(.32,.13,.44),5,0,.79,-.17)
  add(new THREE.SphereGeometry(.185,20,14),1,0,.93,-.28)
  add(new THREE.SphereGeometry(.19,20,10,0,Math.PI*2,Math.PI*.35,Math.PI*.23).scale(1,1,1.04),5,0,.93,-.28)
  box(0,1.03,-.28,.085,.045,.31,0)
  const haloPoints=[[-.34,.96,-.65],[-.4,1.12,-.35],[-.36,1.13,.23],[0,1.1,.53],[.36,1.13,.23],[.4,1.12,-.35],[.34,.96,-.65]].map(p=>new THREE.Vector3(...p))
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(haloPoints),32,.031,8,false),2)
  rod([0,.65,.59],[0,1.1,.53],.035,2)
  loft([[-1.03,.11,.92,.28],[-.7,.19,.88,.48],[-.54,.13,.83,.35]],0)
  box(0,1.2,-.535,.19,.16,.018,5)
  // Race numbers made of geometry, so exported GLBs have no font/texture dependency.
  const digits: Record<string,string>={ '0':'ab cdef'.replace(/ /g,''),'1':'bc','2':'abdeg','3':'abcdg','7':'abc' }
  const segments: Record<string,number[]>={a:[0,.14,0],b:[.08,.075,1],c:[.08,-.075,1],d:[0,-.14,0],e:[-.08,-.075,1],f:[-.08,.075,1],g:[0,0,0]}
  ;[...spec.number].forEach((digit,index)=> { for(const s of digits[digit]||[]) { const [x,z,vertical]=segments[s];box((index-.5)*.23+x,.58,z+1.17,vertical?.025:.15,.012,vertical?.12:.025,1) } })
  for(let m=0;m<parts.length;m++) if(parts[m].length) { const mesh=new THREE.Mesh(mergeGeometries(parts[m])!,materials[m]);mesh.name=`body-${m}`;mesh.castShadow=true;mesh.receiveShadow=true;model.add(mesh);parts[m].forEach(g=>g.dispose()) }
  for(const side of [-1,1]) for(const front of [true,false]) {
    const pivot=new THREE.Group();pivot.name=`wheel-${front?'front':'rear'}-${side<0?'left':'right'}`;pivot.position.set(side*1.13,.43,front?1.37:-1.36)
    const wheel=new THREE.Group();wheel.name='tire';const width=front?.34:.41
    function wheelMesh(g: THREE.BufferGeometry,m:number,rx=0,x=0) { const mesh=new THREE.Mesh(g,materials[m]);mesh.rotation.z=Math.PI/2;mesh.rotation.x=rx;mesh.position.x=x;mesh.castShadow=true;wheel.add(mesh) }
    wheelMesh(new THREE.CylinderGeometry(.43,.43,width,32,1),2)
    for(const sx of [-1,1]) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.344,.012,6,32),materials[4]);ring.rotation.y=Math.PI/2;ring.position.x=sx*(width/2+.003);wheel.add(ring)
      wheelMesh(new THREE.CylinderGeometry(.226,.226,.018,20),3,0,sx*(width/2+.008))
      wheelMesh(new THREE.CylinderGeometry(.082,.082,.035,12),6,0,sx*(width/2+.018))
      for(let i=0;i<8;i++) {const spoke=new THREE.Mesh(new THREE.BoxGeometry(.023,.034,.35),materials[2]);spoke.position.x=sx*(width/2+.021);spoke.rotation.x=i*Math.PI/4;wheel.add(spoke)}
    }
    const wheelParts=materials.map((): THREE.BufferGeometry[]=>[])
    for(const child of [...wheel.children]) {
      const mesh=child as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>
      mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);g.deleteAttribute('uv')
      wheelParts[materials.indexOf(mesh.material)].push(g);mesh.geometry.dispose();wheel.remove(mesh)
    }
    wheelParts.forEach((geometries,m)=>{if(geometries.length){const mesh=new THREE.Mesh(mergeGeometries(geometries)!,materials[m]);mesh.castShadow=true;wheel.add(mesh);geometries.forEach(g=>g.dispose())}})
    pivot.add(wheel);model.add(pivot)
  }
  model.userData={assetId:id,units:'metres',forward:'+Z',authoring:'procedural geometry',number:spec.number}
  return model
}
