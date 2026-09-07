import * as THREE from 'three'
import { instanceEngines } from '../../spacecraft/instances'
import { refineSpacecraftSurfaces } from '../../spacecraft/surfaces'
import { LEG_ANGLE, mix, PADS, PAD_TOP, smooth, TOUCHDOWNS } from './mission'
import type { BoosterSample, CameraMode, FlightSample, V3 } from './mission'

const noiseGLSL = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.5+noise(p*2.03)*.25+noise(p*4.01)*.125+noise(p*8.07)*.0625;}
`
const v = (p: readonly number[]) => new THREE.Vector3(p[0], p[1], p[2])
const rand = (n: number) => { const x = Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x) }

/** One scene is shared by the interactive player and frame-by-frame film export. */
export function createRecoveryWorld(source: THREE.Group) {
  const root = new THREE.Group(), geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  const ownGeometry = <T extends THREE.BufferGeometry>(value: T) => { geometry.add(value); return value }
  const ownMaterial = <T extends THREE.Material>(value: T) => { materials.add(value); return value }
  const pbr = (color: string, roughness = .85) => ownMaterial(new THREE.MeshStandardMaterial({ color, roughness }))
  const concrete = pbr('#b9b4a0'), roadMat = pbr('#676c63'), metal = pbr('#7d8582', .4), paint = pbr('#eeeadc'), dark = pbr('#253139')
  const boxGeo = ownGeometry(new THREE.BoxGeometry(1, 1, 1)), cylinderGeo = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 96))
  function mesh(g: THREE.BufferGeometry, mat: THREE.Material, position: V3, scale: V3 = [1,1,1], parent: THREE.Object3D = root) {
    const item = new THREE.Mesh(g, mat); item.position.set(...position); item.scale.set(...scale); item.receiveShadow = true; item.castShadow = true; parent.add(item); return item
  }
  const plane = ownGeometry(new THREE.PlaneGeometry(1, 1))
  const terrain = pbr('#626349')
  terrain.onBeforeCompile = shader => {
    shader.vertexShader='varying vec3 terrainPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nterrainPosition=(modelMatrix*vec4(position,1.)).xyz;')
    shader.fragmentShader=`varying vec3 terrainPosition;\n${noiseGLSL}`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float patches=fbm(terrainPosition.xz*.026);float grain=fbm(terrainPosition.xz*.65);
      diffuseColor.rgb*=.55+patches*.7+grain*.4;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.85,1.06,.82),smoothstep(.4,.64,patches));`)
  }
  // Land stops at the beach. Overlapping distant ground and water planes
  // produce visible depth fighting even when their elevations differ.
  mesh(plane, terrain, [0, -.65, 62232.5], [250000, 125000, 1]).rotation.x = -Math.PI/2
  const sand = mesh(plane, pbr('#b8ab88'), [0, -.4, -305], [250000, 75, 1]); sand.rotation.x=-Math.PI/2

  const ocean = ownMaterial(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec3 p; void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
    fragmentShader: `${noiseGLSL} varying vec3 p;uniform float uTime;void main(){float distance=length(p-cameraPosition);float waves=sin(p.x*.12+p.z*.19+uTime*.5)*sin(p.z*.45-uTime*.4);float swell=fbm(p.xz*.014);float coast=1.-smoothstep(-480.,-350.,p.z);vec3 sea=mix(vec3(.055,.23,.29),vec3(.025,.13,.21),coast);sea+=(swell*.035+pow(max(0.,waves),8.)*.025)*(1.-smoothstep(800.,5500.,distance));sea=mix(sea,vec3(.24,.49,.68),smoothstep(4500.,27000.,distance));gl_FragColor=vec4(sea,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  }))
  const sea = mesh(plane, ocean, [0, -.24, -125342], [250000, 250000, 1]); sea.rotation.x=-Math.PI/2; sea.castShadow=false
  // A continuous coast, with narrow broken whitewater bands.
  const foam = ownMaterial(new THREE.MeshBasicMaterial({color:'#d8e3d7',transparent:true,opacity:.35}))
  for (let i=0;i<90;i++) {
    const strip=mesh(boxGeo,foam,[-2200+i*49,-.12,-344-rand(i)*5],[25+rand(i+2)*28,.04,.8+rand(i+8)*1.4]); strip.rotation.y=(rand(i+3)-.5)*.035; strip.castShadow=false
  }

  const skyMaterial = ownMaterial(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `${noiseGLSL} varying vec3 d;void main(){vec3 n=normalize(d);float h=max(0.,n.y);vec3 col=mix(vec3(.24,.49,.68),vec3(.035,.16,.35),smoothstep(0.,.6,h));vec2 uv=n.xz/(max(.08,n.y))*.95;float c=smoothstep(.43,.68,fbm(uv+vec2(12.8,4.3)))*smoothstep(.025,.14,n.y)*(1.-smoothstep(.5,.9,n.y));col=mix(col,vec3(.70,.75,.79),c*.68);float sun=pow(max(0.,dot(n,normalize(vec3(-.5,.65,.6)))),600.);col+=sun*vec3(1.,.8,.5);gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  }))
  const sky=mesh(ownGeometry(new THREE.SphereGeometry(200000,32,16)),skyMaterial,[0,0,0]); sky.castShadow=false;sky.receiveShadow=false;sky.renderOrder=-100

  function padTexture(label: string) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1024
    const c=canvas.getContext('2d')!
    c.fillStyle='#bfb9a3';c.fillRect(0,0,1024,1024)
    for(let i=0;i<18000;i++){c.fillStyle=`rgba(50,54,46,${rand(i)*.09})`;c.fillRect(rand(i+3)*1024,rand(i+9)*1024,1+rand(i+2)*3,1+rand(i+6)*3)}
    c.strokeStyle='#aaa591';c.lineWidth=2
    for(let j=0;j<1024;j+=85){c.beginPath();c.moveTo(j,0);c.lineTo(j,1024);c.moveTo(0,j);c.lineTo(1024,j);c.stroke()}
    c.fillStyle='#3d484b';c.beginPath();c.arc(512,512,326,0,Math.PI*2);c.fill()
    c.strokeStyle='#eceadd';c.lineWidth=12;c.beginPath();c.arc(512,512,289,0,Math.PI*2);c.stroke()
    c.save();c.translate(512,512);c.rotate(-.32);c.fillStyle='#edece1'
    c.beginPath();c.moveTo(-166,-114);c.lineTo(-89,-114);c.lineTo(166,114);c.lineTo(89,114);c.closePath();c.fill()
    c.beginPath();c.moveTo(114,-142);c.lineTo(166,-142);c.lineTo(-114,142);c.lineTo(-166,142);c.closePath();c.fill();c.restore()
    c.font='500 48px sans-serif';c.textAlign='center';c.fillStyle='#333f40';c.fillText(label,512,937)
    c.fillStyle='#e1d092';for(let i=0;i<16;i++){c.save();c.translate(512,512);c.rotate(i*Math.PI/8);c.fillRect(-6,464,12,31);c.restore()}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures.add(texture);return texture
  }
  for (const [i,pad] of PADS.entries()) {
    mesh(cylinderGeo,concrete,[pad[0],-.18,pad[2]],[58,.72,58])
    const surface=ownMaterial(new THREE.MeshStandardMaterial({map:padTexture(`LZ-${i+1}`),roughness:.94,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}))
    const top=mesh(ownGeometry(new THREE.CircleGeometry(56.5,128)),surface,[pad[0],PAD_TOP,pad[2]]);top.rotation.x=-Math.PI/2
    const access=mesh(boxGeo,roadMat,[pad[0],-.05,pad[2]+140],[9,.12,168]);access.castShadow=false
    for(const side of [-1,1]) {
      mesh(boxGeo,concrete,[pad[0]+side*59,.65,pad[2]+40],[.8,1.2,17])
      for(let j=0;j<5;j++)mesh(boxGeo,paint,[pad[0]+side*57,1.2,pad[2]+34+j*2.8],[.11,2.4,.11])
      const x=pad[0]+side*69,z=pad[2]+12
      mesh(boxGeo,metal,[x,7.5,z],[.2,15,.2]);mesh(boxGeo,dark,[x,15,z],[2.2,.65,.7])
      mesh(boxGeo,paint,[x,14.9,z+.38],[1.8,.34,.08])
    }
    for(let j=0;j<3;j++) {
      mesh(boxGeo,paint,[pad[0]+72+j*5,2,pad[2]+65],[3.6,4,5.8])
      mesh(boxGeo,dark,[pad[0]+72+j*5,3,pad[2]+68],[2.5,.8,.08])
    }
  }
  mesh(boxGeo,roadMat,[0,-.08,255],[1450,.16,10]).castShadow=false
  for(let i=0;i<65;i++)mesh(boxGeo,paint,[-700+i*22,.02,255],[9,.02,.16]).castShadow=false
  const scrubGeometry=ownGeometry(new THREE.SphereGeometry(1,7,5)), scrubMaterial=pbr('#405438')
  const shrubs=new THREE.InstancedMesh(scrubGeometry,scrubMaterial,6500);shrubs.receiveShadow=true;root.add(shrubs)
  const dummy=new THREE.Object3D(),col=new THREE.Color();let count=0
  for(let i=0;i<8500&&count<6500;i++) {
    const x=(rand(i+23)-.5)*1900,z=-280+rand(i+74)*1200
    if(PADS.some(p=>Math.hypot(x-p[0],z-p[2])<70)||Math.abs(z-255)<10||PADS.some(p=>Math.abs(x-p[0])<9&&z>p[2]&&z<260))continue
    dummy.position.set(x,.18,z);dummy.scale.set(1.2+rand(i+2)*2.8,.45+rand(i+5)*1.1,1.1+rand(i+7)*2.6);dummy.rotation.y=rand(i+8)*6.28;dummy.updateMatrix();shrubs.setMatrixAt(count,dummy.matrix)
    shrubs.setColorAt(count,col.setHSL(.20+rand(i+7)*.035,.17+rand(i+9)*.12,.7+rand(i+8)*.2));count++
  }
  shrubs.count=count

  const model=source.clone(true);root.add(model)
  const disposeSurfaces=refineSpacecraftSurfaces(model)
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true}})
  const engines=instanceEngines(model)
  const center=model.getObjectByName('center-core')!
  const boosters=[model.getObjectByName('side-booster-left')!,model.getObjectByName('side-booster-right')!]
  const sootMaterials=new Map<THREE.Material,THREE.Material>()
  for(const booster of boosters) booster.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||Array.isArray(object.material)||object.material.name!=='ceramic-white')return
    const material=object.material as THREE.MeshStandardMaterial
    if(!sootMaterials.has(material)) {
      const soot=ownMaterial(material.clone()), previous=material.onBeforeCompile
      soot.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);shader.fragmentShader=noiseGLSL+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float soot=(1.-smoothstep(9.,32.,vMetalPosition.y))*(.40+fbm(vec2(atan(vMetalPosition.x,vMetalPosition.z)*3.,vMetalPosition.y*.16))*.5);
        diffuseColor.rgb*=1.-soot*.8;`)}
      soot.customProgramCacheKey=()=> 'falcon-heavy-flight-soot-v1';sootMaterials.set(material,soot)
    }
    object.material=sootMaterials.get(material)!
  })
  const parts=boosters.map(booster=>{
    const legs:THREE.Object3D[]=[],fins:THREE.Object3D[]=[],braces:THREE.Object3D[]=[]
    booster.traverse(o=>{if(o.userData.articulation==='landing-leg')legs.push(o);if(o.userData.articulation==='grid-fin')fins.push(o);if(o.userData.articulation==='leg-brace')braces.push(o)})
    return {legs,fins,braces}
  })

  const flameMaterial=ownMaterial(new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending,
    uniforms:{uTime:{value:0},uPower:{value:1}},
    vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`${noiseGLSL} varying vec2 st;uniform float uTime;uniform float uPower;void main(){float y=1.-st.y;float n=fbm(vec2(st.x*9.,y*12.-uTime*8.));float center=.5+sin(y*16.-uTime*9.)*.025*y;float width=(.055+.23*sin(y*3.14159))*(1.-y*.65);float edge=abs(st.x-center)/width;float a=(1.-smoothstep(.25,1.2,edge+(n-.4)*.7))*smoothstep(1.,.65,y);a*=.75+n*.5;vec3 color=mix(vec3(1.2,.12,.005),vec3(4.,2.6,1.4),1.-smoothstep(.1,.8,edge+y*.7));gl_FragColor=vec4(color,a*uPower);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  }))
  function plume(parent: THREE.Object3D) {
    const group=new THREE.Group();parent.add(group)
    for(const angle of [0,Math.PI/2]){const item=mesh(plane,flameMaterial,[0,-.5,0],[1,1,1],group);item.rotation.y=angle;item.castShadow=false;item.receiveShadow=false}
    return group
  }
  const plumes=boosters.map(plume),centerPlume=plume(center)
  const glowMat=ownMaterial(new THREE.MeshBasicMaterial({color:'#ffd594',transparent:true,opacity:.16,depthWrite:false,blending:THREE.AdditiveBlending}))
  const glows=PADS.map(p=>{const m=mesh(ownGeometry(new THREE.CircleGeometry(12,48)),glowMat,[p[0],PAD_TOP+.02,p[2]]);m.rotation.x=-Math.PI/2;m.castShadow=false;return m})

  const smokeMaterial=ownMaterial(new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    vertexShader:'varying vec2 st;varying vec3 tint;void main(){st=uv;tint=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader:`${noiseGLSL} varying vec2 st;varying vec3 tint;void main(){vec2 p=st*2.-1.;float edge=1.-smoothstep(.12,1.,length(p));float texture=fbm(st*6.7+vec2(4.,8.));float a=edge*texture*.46;gl_FragColor=vec4(tint,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  }))
  const smoke=new THREE.InstancedMesh(plane,smokeMaterial,144);smoke.frustumCulled=false;smoke.renderOrder=4;root.add(smoke)
  // Allocate instanceColor before the shader is compiled.
  for(let i=0;i<smoke.count;i++)smoke.setColorAt(i,new THREE.Color('#b9b2a1'))
  const sun=new THREE.DirectionalLight('#fff1d9',3.25);sun.position.set(-380,650,520);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048)
  Object.assign(sun.shadow.camera,{left:-430,right:430,top:430,bottom:-430,near:10,far:1500});sun.shadow.bias=-.00015;sun.shadow.normalBias=.12;root.add(sun)
  root.add(new THREE.HemisphereLight('#c6e4fc','#807c60',2.2))
  const fill=new THREE.DirectionalLight('#d7ebf8',.65);fill.position.set(200,350,-400);root.add(fill)
  const vector=new THREE.Vector3(),end=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0)

  function pose(index:number,s:BoosterSample) {
    const booster=boosters[index];booster.position.set(...s.position);booster.rotation.set(...s.rotation)
    for(const leg of parts[index].legs)leg.rotation.set(s.legs*LEG_ANGLE,leg.userData.azimuth,0,'YXZ')
    for(const fin of parts[index].fins)fin.rotation.set(s.fins*Math.PI/2,fin.userData.azimuth,0,'YXZ')
    for(const brace of parts[index].braces) {
      const phi=brace.userData.azimuth,tilt=s.legs*LEG_ANGLE
      const r=1.84+6.2*Math.sin(tilt)+.2*Math.cos(tilt),y=3.4+6.2*Math.cos(tilt)-.2*Math.sin(tilt)
      brace.position.set(Math.sin(phi)*2.02,7.5,Math.cos(phi)*2.02)
      end.set(Math.sin(phi)*r,y,Math.cos(phi)*r).sub(brace.position)
      brace.quaternion.setFromUnitVectors(axis,vector.copy(end).normalize());brace.scale.set(1,end.length(),1)
    }
    const plume=plumes[index];plume.visible=s.throttle>.002
    const length=(s.engines===9?48:s.engines===3?29:21)*s.throttle
    // A close-to-ground exhaust stops at the pad instead of burning through it.
    const plumeLength=s.engines===1?Math.min(length,s.position[1]-PAD_TOP):length
    const width=s.engines===9?14:s.engines===3?9:6
    plume.scale.set(width,plumeLength,width)
    glows[index].visible=s.engines===1&&s.altitude<24&&!s.landed
    glows[index].scale.setScalar((1-smooth(0,24,s.altitude))*.7+.3)
  }
  function update(sample:FlightSample,camera:THREE.PerspectiveCamera,mode:CameraMode,aspect:number) {
    center.position.set(...sample.center);center.visible=sample.centerVisible
    centerPlume.scale.set(15,60,15)
    sample.boosters.forEach((s,i)=>pose(i,s));engines.update()
    flameMaterial.uniforms.uTime.value=sample.time;ocean.uniforms.uTime.value=sample.time
    setRecoveryCamera(sample,camera,mode,aspect);sky.position.copy(camera.position)
    for(let i=0;i<144;i++) {
      const side=i<72?0:1,j=i%72,born=42+j*.125,age=sample.time-born
      const active=age>=0&&age<10&&born<TOUCHDOWNS[side]+.25
      const phi=j*2.39996+side*.7,speed=2.5+rand(j+side*50)*3.3
      const radius=active?(2+age*2.8)*(1-smooth(7,10,age)):0
      dummy.position.set(PADS[side][0]+Math.cos(phi)*age*speed,PAD_TOP+1.2+Math.max(0,age)*.48,PADS[side][2]+Math.sin(phi)*age*speed)
      dummy.quaternion.copy(camera.quaternion);dummy.scale.set(radius*2.4,radius*1.15,1);dummy.updateMatrix();smoke.setMatrixAt(i,dummy.matrix)
    }
    smoke.instanceMatrix.needsUpdate=true
  }
  return {
    root,update,
    dispose(){engines.dispose();disposeSurfaces();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());shrubs.dispose();smoke.dispose();sun.shadow.dispose()},
  }
}

export function setRecoveryCamera(s:FlightSample,camera:THREE.PerspectiveCamera,mode:CameraMode,aspect:number) {
  const t=s.time,a=s.boosters[0],b=s.boosters[1]
  const midpoint=v(a.position).add(v(b.position)).multiplyScalar(.5)
  const target=midpoint.clone().add(new THREE.Vector3(0,24,0))
  let offset=new THREE.Vector3(110,30,205),fov=31
  const pairFit=Math.max(1,1.6/aspect)
  if(mode==='left'||mode==='right') {
    const booster=mode==='left'?a:b
    target.copy(v(booster.position)).add(new THREE.Vector3(0,23,0))
    offset.set(65,18,120).multiplyScalar(Math.max(1,.85/aspect));fov=30
  } else if(t>=32) {
    const h=Math.max(a.altitude,b.altitude)
    target.y=Math.max(30,(h+48)*.5)
    target.z=-18
    const distance=Math.max(500,(h+80)*2.2)
    offset.set(mix(-410,-435,smooth(49.7,56,t)),Math.max(78,h*.1+62),distance).multiplyScalar(pairFit)
    fov=22
  } else if(t>=8) {
    offset.set(mix(175,95,smooth(8,25,t)),60,420).multiplyScalar(pairFit);fov=33
  }
  camera.aspect=aspect;camera.fov=fov;camera.near=5;camera.far=240000
  camera.updateProjectionMatrix()
  const subjects=mode==='left'?[a]:mode==='right'?[b]:s.boosters
  const points=subjects.flatMap(booster=>{
    const rotation=new THREE.Euler(...booster.rotation)
    return [new THREE.Vector3(0,0,0),new THREE.Vector3(0,49,0)].map(p=>p.applyEuler(rotation).add(v(booster.position)))
  })
  if(mode==='director'&&t<8)points.push(v(s.center).add(new THREE.Vector3(0,70,0)))
  if(t>=32&&mode!=='left'&&mode!=='right')for(const pad of PADS)for(const dx of [-59,59])for(const dz of [-59,59])points.push(new THREE.Vector3(pad[0]+dx,0,pad[2]+dz))
  // Fit both touchdown zones and the complete vehicles inside the title-safe
  // frame. Perspective foreshortening makes an altitude-only distance unsafe.
  for(let iteration=0;iteration<4;iteration++) {
    camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateMatrixWorld()
    let correction=1
    for(const p of points){const ndc=p.clone().project(camera);correction=Math.max(correction,Math.abs(ndc.x)/.84,Math.abs(ndc.y)/.76)}
    if(correction<1.002)break
    offset.multiplyScalar(correction*1.015)
  }
  camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateMatrixWorld()
}
