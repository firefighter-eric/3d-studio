import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FormulaCar } from './FormulaCar'
import { CanvasBoundary } from '../components/StudioCanvas'
import { TRACK, TRACK_LENGTH, ROAD_HALF_WIDTH, trackAt, nearestTrack, clamp, wrapAngle } from './track'
import type { RaceSimulation, RaceInput, Racer } from './race'
import { BARRIER_SECTIONS, BARRIER_OFFSET } from './barriers'
import type { BarrierSection } from './barriers'

function wallGeometry(wall:BarrierSection,bottom:number,top:number){
  const positions=[...wall.points.flatMap(p=>[p.x,bottom,p.z]),...wall.points.flatMap(p=>[p.x,top,p.z])]
  const indices=[0,2,1,0,3,2,4,5,6,4,6,7]
  for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,j,i+4,j,j+4,i+4)}
  if(wall.side<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]]
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function strip(left:number,right:number,y:number,color:string,curb=false){
  const vertices:number[]=[],colors:number[]=[],indices:number[]=[]
  for(let i=0;i<TRACK.length;i++){
    const a=TRACK[i],b=TRACK[(i+1)%TRACK.length],base=vertices.length/3
    const c=new THREE.Color(curb?(Math.floor(a.s/2.8)%2===0?'#f27350':'#fcf4d9'):color)
    for(const [p,offset] of [[a,left],[b,left],[a,right],[b,right]] as const){vertices.push(p.x+p.nx*offset,y,p.z+p.nz*offset);colors.push(c.r,c.g,c.b)}
    indices.push(base,base+1,base+2,base+2,base+1,base+3)
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals()
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94}));mesh.receiveShadow=true;return mesh
}
function makeSign(text:string,subtitle:string,width=1024,height=200,bg='#122b36',fg='#fff5d7'){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const ctx=canvas.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,width,height)
  ctx.fillStyle='#f17550';ctx.fillRect(0,0,18,height);ctx.fillStyle=fg;ctx.textAlign='center';ctx.font=`italic 900 ${height*.41}px Arial`;ctx.fillText(text,width/2,height*.49)
  ctx.fillStyle='#b5d7d5';ctx.font=`500 ${height*.13}px Arial`;ctx.fillText(subtitle,width/2,height*.8)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture
}
function makeWorld(){
  const root=new THREE.Group();root.name='azure-circuit'
  const road=strip(-8.5,8.5,.18,'#48565c')
  const asphalt=document.createElement('canvas');asphalt.width=256;asphalt.height=256;const ac=asphalt.getContext('2d')!;ac.fillStyle='#c1c5c6';ac.fillRect(0,0,256,256)
  let noiseSeed=91;for(let i=0;i<18000;i++){noiseSeed=(noiseSeed*1664525+1013904223)>>>0;const x=noiseSeed%256;noiseSeed=(noiseSeed*1664525+1013904223)>>>0;const y=noiseSeed%256;ac.fillStyle=i%2?'#ffffff16':'#00000014';ac.fillRect(x,y,1,1)}
  const map=new THREE.CanvasTexture(asphalt);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace
  const uv:number[]=[];const positions=road.geometry.attributes.position;for(let i=0;i<positions.count;i++)uv.push(positions.getX(i)*.28,positions.getZ(i)*.28);road.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));road.material.map=map
  root.add(strip(-11.5,11.5,.08,'#beaa87'),road,strip(-9.5,-8.5,.22,'#fff',true),strip(8.5,9.5,.22,'#fff',true),strip(-8.15,-8.02,.19,'#e9eadc'),strip(8.02,8.15,.19,'#e9eadc'))
  const palette=['#edf1df','#304f5c','#ee7651','#71babd','#698979','#e4c99e','#4d8863','#82a268','#a88d6d','#304640','#bfdcdd','#ba6c4e','#315b73','#e9b756']
  const mats=palette.map((color,i)=>new THREE.MeshStandardMaterial({color,roughness:i===10?.28:.88,metalness:i===10?.35:0}))
  const groups=mats.map(():THREE.BufferGeometry[]=>[])
  function add(g:THREE.BufferGeometry,m:number,x=0,y=0,z=0,rx=0,ry=0,rz=0){g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);const flat=g.index?g.toNonIndexed():g;flat.deleteAttribute('uv');groups[m].push(flat);if(g!==flat)g.dispose()}
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m=0,ry=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,0,ry)
  // Ocean, the sandstone island shelf, and pale grass.
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshStandardMaterial({color:'#3299b2',roughness:.4,metalness:.16}));ocean.rotation.x=-Math.PI/2;ocean.position.y=-5.2;root.add(ocean)
  add(new THREE.CylinderGeometry(186,196,8.4,96).scale(1.08,1,1),8,-18,-4.3,12)
  add(new THREE.CylinderGeometry(184,186,.5,96).scale(1.08,1,1),5,-18,-.2,12)
  add(new THREE.CylinderGeometry(178,181,.35,96).scale(1.08,1,1),7,-18,-.09,12)
  for(let i=0;i<4;i++)add(new THREE.RingGeometry(194+i*5,194.5+i*5,96).scale(1.08,1,1),i%2?3:10,-18,-5.16+i*.005,12,-Math.PI/2)
  for(const sections of BARRIER_SECTIONS)for(const wall of sections){
    add(wallGeometry(wall,.135,.92),Math.floor(wall.s/21)%2?0:3)
    add(wallGeometry(wall,.92,.99),0)
  }
  // Grid boxes, chevrons and genuine boost pads line up with the simulation.
  for(let s=-24;s<0;s+=6)for(const side of [-1,1]){const p=trackAt(s,side*2.5),yaw=Math.atan2(p.tx,p.tz);box(p.x,.197,p.z,2.5,.015,.15,0,yaw);for(const edge of [-1,1])box(p.x+p.nx*edge*1.2,.197,p.z+p.nz*edge*1.2,.1,.015,1.4,0,yaw)}
  for(let i=0;i<16;i++)for(let j=0;j<3;j++){const p=trackAt(j*.58-.8,(i-7.5)*1.035);box(p.x,.205,p.z,1.035,.016,.59,(i+j)%2?0:1)}
  for(let s=68;s<TRACK_LENGTH;s+=65){const p=trackAt(s),yaw=Math.atan2(p.tx,p.tz);box(p.x,.198,p.z,.15,.015,2.3,0,yaw);for(const side of [-1,1])box(p.x+p.nx*side*.42+p.tx*.67,.198,p.z+p.nz*side*.42+p.tz*.67,.14,.015,1.2,0,yaw+side*-.8)}
  for(const s of [35,TRACK_LENGTH*.57])for(let i=0;i<5;i++){const p=trackAt(s-1.5+i*.65),yaw=Math.atan2(p.tx,p.tz);box(p.x,.205,p.z,5.6,.024,.34,i%2?10:3,yaw)}
  // Start gantry and clock-light housings.
  const start=trackAt(0),yaw=Math.atan2(start.tx,start.tz)
  for(const side of [-1,1]){const p=trackAt(0,side*(BARRIER_OFFSET+1));box(p.x,3.25,p.z,.6,6.5,.65,0,yaw);box(p.x,.95,p.z,1,1.9,1,2,yaw)}
  box(start.x,6.25,start.z,(BARRIER_OFFSET+1)*2+.6,1.15,.75,1,yaw)
  for(let i=-2;i<=2;i++){box(start.x+start.nx*i*.75,5.29,start.z+start.nz*i*.75,.48,.56,.3,1,yaw);add(new THREE.SphereGeometry(.12,8,8),2,start.x+start.nx*i*.75,5.3,start.z+start.nz*i*.75-.2)}
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(17.8,1.02),new THREE.MeshBasicMaterial({map:makeSign('AZURE CIRCUIT','FORM / SPACE GRAND PRIX'),side:THREE.DoubleSide}));sign.position.set(start.x-start.tx*.39,6.26,start.z-start.tz*.39);sign.rotation.y=yaw+Math.PI;root.add(sign)
  // Start-line grandstand with stepped seating and a lightweight canopy.
  for(let row=0;row<4;row++){box(19+row*1.7,.5+row*.5,33,1.65,.8,35,0);for(let i=0;i<25;i++){box(19+row*1.7,1.05+row*.5,17+i*1.32,.65,.2,.73,(i+row)%3?3:2);if((i*3+row)%4!==0){add(new THREE.SphereGeometry(.18,6,6),5,19+row*1.7,1.64+row*.5,17+i*1.32);box(19+row*1.7,1.33+row*.5,17+i*1.32,.34,.37,.35,(i+row)%2?1:13)}}}
  box(22,5.1,33,11,.16,39,0);box(21.7,5.23,33,11.5,.12,39.3,3)
  for(const x of [17,27])for(const z of [15,32,51])box(x,2.6,z,.15,5.2,.15,1)
  for(let i=0;i<4;i++){box(41,2.3,17+i*11,15,4.6,9,0);box(33.42,2.1,17+i*11,.06,3.5,6.4,10);box(41,4.7,17+i*11,15.8,.2,9.4,2);box(41,5.2,17+i*11,10,.4,7,0)}
  // Trackside hospitality buildings stay outside the road corridor.
  for(const [x,z,w,h,d] of [[24,103,10,7,13],[32,124,12,5,10],[-55,99,13,6,11],[-61,-18,11,5,12],[-74,-8,8,8,9],[45,-72,12,6,10],[68,-32,9,4,9],[-95,25,9,5,11]]){
    if(nearestTrack(x,z).distance<16)continue
    box(x,h/2,z,w,h,d,0);box(x,h+.2,z,w+.7,.45,d+.7,11)
    for(let ix=-1;ix<=1;ix++)for(let iy=0;iy<2;iy++)box(x+ix*w*.25,1.5+iy*2,z+d/2+.025,1.3,1.25,.05,10)
  }
  let seed=412;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  for(let i=0;i<130;i++){
    const x=rand()*325-183,z=rand()*305-137
    if(Math.hypot((x+18)/1.08,z-12)>168||nearestTrack(x,z).distance<17||x>13&&x<52&&z>5&&z<63)continue
    if(i%3===0){add(new THREE.IcosahedronGeometry(2+rand()*2,0).scale(1,.5+rand()*.4,1.1),8,x,.2,z);continue}
    const h=5+rand()*3.7;add(new THREE.CylinderGeometry(.12,.27,h,7),8,x,h/2,z,0,0,.08)
    for(let j=0;j<6;j++){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.6,-.2,1.9,0,-1,4.1,.6,-.2,1.9,0,.17,1.8],3));g.setIndex([0,1,4,0,4,3,1,2,4,2,3,4,4,1,0,3,4,0,4,2,1,4,3,2]);g.computeVertexNormals();add(g,j%2?6:7,x+.08*h,h,z,.05,j*Math.PI/3+rand()*.2)
    }
    add(new THREE.IcosahedronGeometry(.4,0),6,x+.08*h,h-.12,z)
  }
  // Cliff-side lighthouse and a few yachts beyond the shore.
  add(new THREE.CylinderGeometry(2.1,3.1,14,16),0,-171,7.05,53)
  for(const y of [4,9])add(new THREE.CylinderGeometry(2.85-y*.054,2.92-y*.054,1.7,16),2,-171,y,53)
  add(new THREE.CylinderGeometry(3.6,3.6,.3,16),1,-171,14,53);add(new THREE.CylinderGeometry(2,2,2.8,12),10,-171,15.4,53);add(new THREE.ConeGeometry(3.4,2.2,16),2,-171,17.8,53)
  for(let i=0;i<5;i++){const x=183+i*14,z=32+i*12;add(new THREE.SphereGeometry(1,12,8).scale(2.5,1.2,7),0,x,-4.7,z);box(x,-3.2,z,2.7,1.7,4.6,0);box(x,-2.5,z,2.4,.8,3,10);box(x,-.2,z,.08,6.4,.08,1)}
  for(let i=0;i<9;i++){const angle=i/9*Math.PI*2;add(new THREE.IcosahedronGeometry(25+i%3*8,0).scale(2,.75,1.2),12,Math.sin(angle)*430,-8,Math.cos(angle)*390)}
  for(let i=0;i<7;i++){const angle=i/7*Math.PI*2;for(let j=0;j<3;j++)add(new THREE.SphereGeometry(1,12,8).scale(13+j*4,3.1+j,7.5),0,Math.sin(angle)*310+j*13,48+i%3*13,Math.cos(angle)*310)}
  for(let m=0;m<groups.length;m++)if(groups[m].length){const mesh=new THREE.Mesh(mergeGeometries(groups[m])!,mats[m]);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);groups[m].forEach(g=>g.dispose())}
  return root
}
function RacingWorld(){const world=useMemo(makeWorld,[]);return <primitive object={world} />}

function RacingCar({racer,simulation}:{racer:Racer;simulation:RaceSimulation}){
  const group=useRef<THREE.Group>(null),jets=useRef<THREE.Group>(null),shield=useRef<THREE.Mesh>(null),wheels=useRef<THREE.Object3D[]>([]),spin=useRef(0)
  const shadowMap=useMemo(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;const ctx=c.getContext('2d')!,g=ctx.createRadialGradient(32,32,7,32,32,32);g.addColorStop(0,'#122a3b66');g.addColorStop(.5,'#122a3b40');g.addColorStop(1,'#122a3b00');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)},[])
  useFrame((_,dt)=>{
    if(!group.current)return
    group.current.position.set(racer.x,.2+(racer.recovery>0?Math.sin(racer.recovery*18)*.025:0),racer.z);group.current.rotation.set(0,racer.yaw,clamp(-racer.steer*racer.speed*.0009,-.05,.05))
    if(wheels.current.length===0)group.current.traverse(child=>{if(child.name.startsWith('wheel-'))wheels.current.push(child)})
    if(simulation.status==='racing')spin.current+=racer.speed*dt/.43
    for(const wheel of wheels.current){wheel.rotation.y=wheel.name.includes('front')?-racer.steer*.34:0;if(wheel.children[0])wheel.children[0].rotation.x=spin.current}
    if(jets.current){jets.current.visible=racer.boost>0;jets.current.scale.z=.8+Math.sin(simulation.time*45)*.2}
    if(shield.current){shield.current.visible=racer.shield>0;shield.current.rotation.y+=dt;const m=shield.current.material as THREE.MeshBasicMaterial;m.opacity=.075+Math.sin(simulation.time*7)*.025}
  })
  return <group ref={group}>
    <FormulaCar id={racer.car}/>
    <group ref={jets} visible={false}>{[-.44,.44].map(x=><group key={x} position={[x,.38,-2.03]}><mesh position={[0,0,-.7]} rotation={[-Math.PI/2,0,0]}><coneGeometry args={[.16,1.6,12]}/><meshBasicMaterial color="#a4f5ff" transparent opacity={.8}/></mesh><mesh position={[0,0,-.35]} rotation={[-Math.PI/2,0,0]}><coneGeometry args={[.09,.85,10]}/><meshBasicMaterial color="#f3ffdf"/></mesh></group>)}</group>
    <mesh ref={shield} visible={false} position={[0,.7,0]} scale={[1.8,1.2,3.05]}><sphereGeometry args={[1,20,12]}/><meshBasicMaterial color="#7cfff4" transparent opacity={.08} depthWrite={false} wireframe/></mesh>
    <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[4.2,6.7]}/><meshBasicMaterial map={shadowMap} transparent opacity={.7} depthWrite={false}/></mesh>
    {racer.id===0&&<group position={[0,2.5,0]}><mesh rotation={[0,0,Math.PI]}><coneGeometry args={[.16,.28,3]}/><meshBasicMaterial color="#ffd390"/></mesh></group>}
  </group>
}
function Pickups({simulation}:{simulation:RaceSimulation}){
  const ref=useRef<THREE.InstancedMesh>(null),rings=useRef<THREE.InstancedMesh>(null)
  const matrix=useMemo(()=>new THREE.Matrix4(),[]),q=useMemo(()=>new THREE.Quaternion(),[]),v=useMemo(()=>new THREE.Vector3(),[]),scale=useMemo(()=>new THREE.Vector3(),[])
  useFrame(()=>{if(!ref.current||!rings.current)return
    simulation.pickups.forEach((pickup,i)=>{
      const p=trackAt(pickup.s,pickup.offset),size=pickup.cooldown>0?0:.92
      v.set(p.x,1.6+Math.sin(simulation.time*2+i)*.22,p.z);q.setFromEuler(new THREE.Euler(.2,simulation.time+i,.1));scale.setScalar(size);matrix.compose(v,q,scale);ref.current!.setMatrixAt(i,matrix)
      v.y=.28;q.setFromEuler(new THREE.Euler(-Math.PI/2,0,0));scale.setScalar(size*1.3);matrix.compose(v,q,scale);rings.current!.setMatrixAt(i,matrix)
    });ref.current.instanceMatrix.needsUpdate=true;rings.current.instanceMatrix.needsUpdate=true
  })
  useEffect(()=>{if(ref.current)simulation.pickups.forEach((_,i)=>ref.current!.setColorAt(i,new THREE.Color(['#f2c96d','#71e1d7','#b5a2ef'][i%3])));if(ref.current?.instanceColor)ref.current.instanceColor.needsUpdate=true},[simulation])
  return <><instancedMesh ref={ref} args={[undefined,undefined,simulation.pickups.length]}><octahedronGeometry args={[1,0]}/><meshStandardMaterial color="white" emissive="#4d6555" emissiveIntensity={.4} roughness={.27} metalness={.28}/></instancedMesh><instancedMesh ref={rings} args={[undefined,undefined,simulation.pickups.length]}><ringGeometry args={[.8,1,16]}/><meshBasicMaterial color="#defdf0" transparent opacity={.8} side={THREE.DoubleSide}/></instancedMesh></>
}
function TireEffects({simulation}:{simulation:RaceSimulation}){
  const marks=useRef<THREE.InstancedMesh>(null),sparks=useRef<THREE.InstancedMesh>(null),cursor=useRef(0),last=useRef(0)
  const matrix=useMemo(()=>new THREE.Matrix4(),[]),dummy=useMemo(()=>new THREE.Object3D(),[])
  useEffect(()=>{if(marks.current)for(let i=0;i<180;i++)marks.current.setMatrixAt(i,new THREE.Matrix4().makeScale(0,0,0))},[])
  useFrame(()=>{
    const r=simulation.player
    if(marks.current&&simulation.status==='racing'&&r.drifting&&simulation.time-last.current>.065){
      last.current=simulation.time
      for(const side of [-1,1]){dummy.position.set(r.x+Math.cos(r.yaw)*side*1.12-Math.sin(r.yaw)*1.4,.208,r.z-Math.sin(r.yaw)*side*1.12-Math.cos(r.yaw)*1.4);dummy.rotation.set(-Math.PI/2,0,-r.yaw);dummy.scale.set(1,1,1);dummy.updateMatrix();marks.current.setMatrixAt(cursor.current++%180,dummy.matrix)}marks.current.instanceMatrix.needsUpdate=true
    }
    if(sparks.current){for(let i=0;i<24;i++){
      const side=i%2?1:-1,t=((simulation.time*2+i*.13)%1),active=r.drifting&&simulation.status==='racing'
      dummy.position.set(r.x+Math.cos(r.yaw)*side*(1.05+t*.6)-Math.sin(r.yaw)*(1.5+t*2),.35+t*.5,r.z-Math.sin(r.yaw)*side*(1.05+t*.6)-Math.cos(r.yaw)*(1.5+t*2));dummy.rotation.set(t*5,t*3,t*7);dummy.scale.setScalar(active?(1-t)*.085:0);dummy.updateMatrix();sparks.current.setMatrixAt(i,dummy.matrix)
    }sparks.current.instanceMatrix.needsUpdate=true;(sparks.current.material as THREE.MeshBasicMaterial).color.set(r.driftCharge>=1?'#55eeff':'#ffce5d')}
  })
  return <><instancedMesh ref={marks} args={[undefined,undefined,180]}><planeGeometry args={[.25,.72]}/><meshBasicMaterial color="#1d2c31" transparent opacity={.4} depthWrite={false}/></instancedMesh><instancedMesh ref={sparks} args={[undefined,undefined,24]}><octahedronGeometry args={[1,0]}/><meshBasicMaterial color="#ffc952"/></instancedMesh></>
}
function CameraRig({simulation}:{simulation:RaceSimulation}){
  const {camera,size}=useThree(),at=useMemo(()=>new THREE.Vector3(),[]),pos=useMemo(()=>new THREE.Vector3(),[]),initialized=useRef(false),oldStatus=useRef('')
  useFrame((_,dt)=>{
    const r=simulation.player,ready=simulation.status==='ready',wide=simulation.cameraMode===1,mobile=size.width<650
    const road=trackAt(r.progress+8),dir=Math.atan2(road.tx,road.tz),angle=r.yaw+wrapAngle(dir-r.yaw)*.3
    if(ready){if(mobile){pos.set(r.x+10,8,r.z+14);at.set(r.x,-3.3,r.z)}else{pos.set(r.x+10,5.1,r.z+10);at.set(r.x-2,.55,r.z-1)}}
    else {const distance=wide?18:mobile?15:12.7,height=wide?10:mobile?8.8:6.8;pos.set(r.x-Math.sin(angle)*distance,height,r.z-Math.cos(angle)*distance);at.set(r.x+Math.sin(angle)*8,1.25,r.z+Math.cos(angle)*8)}
    if(!initialized.current||oldStatus.current==='ready'&&!ready){camera.position.copy(pos);initialized.current=true}else camera.position.lerp(pos,1-Math.exp(-Math.min(dt,.06)*(ready?3.5:8)))
    camera.lookAt(at)
    const c=camera as THREE.PerspectiveCamera,target=ready?43:wide?64:mobile?68:61+(r.boost>0?7:0)
    c.fov+=(target-c.fov)*(1-Math.exp(-dt*4));c.updateProjectionMatrix();oldStatus.current=simulation.status
  })
  return null
}
function RaceRuntime({simulation,input,onHud,onReady}:{simulation:RaceSimulation;input:React.RefObject<RaceInput>;onHud:()=>void;onReady:()=>void}){
  const frames=useRef(0),hudClock=useRef(0)
  useFrame((state,dt)=>{
    const steps=simulation.advance(dt,input.current)
    if(steps>0){input.current.boost=false;input.current.item=false;input.current.reset=false}
    frames.current++;if(frames.current===3)onReady()
    hudClock.current+=dt;if(hudClock.current>.08){hudClock.current=0;onHud()}
    const field=state.gl.domElement.closest('.race-field') as HTMLElement|null
    if(field&&frames.current%20===0){field.dataset.fps=String(Math.round(1/Math.max(.001,dt)));field.dataset.drawCalls=String(state.gl.info.render.calls)}
  },-1)
  return null
}
function PulseEffect({simulation}:{simulation:RaceSimulation}){
  const ref=useRef<THREE.Mesh>(null),position=useRef({x:0,z:0}),previous=useRef(0)
  useFrame(()=>{if(!ref.current)return;const t=simulation.pulse;if(t>previous.current){position.current={x:simulation.player.x,z:simulation.player.z}}previous.current=t;ref.current.visible=t>0;ref.current.position.set(position.current.x,.3,position.current.z);ref.current.scale.setScalar(1+(1-t)*42);(ref.current.material as THREE.MeshBasicMaterial).opacity=t*.45})
  return <mesh ref={ref} visible={false} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.96,1,64]}/><meshBasicMaterial color="#dfb0ff" transparent opacity={.4} depthWrite={false} side={THREE.DoubleSide}/></mesh>
}
export function RaceScene({simulation,input,onHud,onReady}:{simulation:RaceSimulation;input:React.RefObject<RaceInput>;onHud:()=>void;onReady:()=>void}){
  return <CanvasBoundary><Canvas shadows={{type:THREE.PCFShadowMap}} dpr={[1,1.5]} camera={{position:[8,6,-23],fov:60,near:.15,far:850}} gl={{antialias:true,alpha:false,preserveDrawingBuffer:true}} aria-label="湛蓝大奖赛实时三维赛道">
    <color attach="background" args={['#bddbe4']}/><fog attach="fog" args={['#bddbe4',190,640]}/>
    <hemisphereLight args={['#fff4dd','#52776b',2.3]}/><directionalLight position={[-60,100,45]} intensity={3.2} color="#fff0cf" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-150} shadow-camera-right={150} shadow-camera-top={165} shadow-camera-bottom={-135} shadow-camera-far={320} shadow-bias={-.0005} shadow-normalBias={.04}/><directionalLight position={[30,40,-70]} intensity={1.1} color="#b6e4ed"/>
    <Suspense fallback={null}><RacingWorld/>{simulation.racers.map(r=><RacingCar key={r.id} racer={r} simulation={simulation}/>)}<Pickups simulation={simulation}/><TireEffects simulation={simulation}/><PulseEffect simulation={simulation}/><CameraRig simulation={simulation}/><RaceRuntime simulation={simulation} input={input} onHud={onHud} onReady={onReady}/></Suspense>
  </Canvas></CanvasBoundary>
}
