import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enginePower, SITE, smooth } from './mission'
import type { MissionSample } from './mission'

type State = RefObject<{ sample: MissionSample }>
const TAU = Math.PI*2
const flameVertex = `varying vec2 vFlow;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main(){vFlow=vec2(uv.x,-position.y); vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.); gl_Position=projectionMatrix*mvPosition;
  #include <logdepthbuf_vertex>
  }`
const flameFragment = `varying vec2 vFlow; uniform float time; uniform float core;
  #include <logdepthbuf_pars_fragment>
  void main(){
    #include <logdepthbuf_fragment>
    float q=vFlow.y;
    float turbulence=sin(q*74.-time*32.+sin(vFlow.x*31.+time*7.)*2.)*.12+sin(q*133.-time*51.)*.06;
    float diamonds=pow(.5+.5*cos(q*91.-.4),12.)*(1.-smoothstep(.35,.8,q));
    vec3 blue=vec3(.33,.48,1.); vec3 hot=vec3(1.,.85,.61); vec3 orange=vec3(1.,.34,.085);
    vec3 c=mix(blue,hot,smoothstep(.015,.13,q)); c=mix(c,orange,smoothstep(.18,.85,q)*(1.-core*.75));
    c+=diamonds*vec3(.38,.45,.62);
    float fade=(1.-smoothstep(.45,1.,q))*smoothstep(0.,.016,q);
    gl_FragColor=vec4(c,clamp((.07+core*.15+turbulence*.3+diamonds*.07)*fade,0.,.5));
  }`

export function Plumes({ shared, ship=false }: { shared: State; ship?: boolean }) {
  const outer=useRef<THREE.InstancedMesh>(null), core=useRef<THREE.InstancedMesh>(null)
  const outerMaterial=useRef<THREE.ShaderMaterial>(null), coreMaterial=useRef<THREE.ShaderMaterial>(null)
  const dummy=useMemo(()=>new THREE.Object3D(),[])
  const geometry=useMemo(()=>new THREE.LatheGeometry([[.025,-1],[.28,-.84],[.56,-.56],[.88,-.24],[1.02,-.075],[1,0]].map(([r,y])=>new THREE.Vector2(r,y)),24),[])
  const uniforms=useMemo(()=>[{time:{value:0},core:{value:0}},{time:{value:0},core:{value:1}}],[])
  const positions=useMemo(()=> (ship ? [[3,1.15,0],[3,2.8,Math.PI/3]] : [[20,3.78,0],[10,2.22,Math.PI/10],[3,.76,0]])
    .flatMap(([count,radius,phase])=>Array.from({length:count},(_,i)=>[Math.sin(i/count*TAU+phase)*radius,Math.cos(i/count*TAU+phase)*radius])),[ship])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{
    if (!outer.current || !core.current) return
    const s=shared.current.sample, vacuum=smooth(12000,80000,s.position[1])
    if (outerMaterial.current) outerMaterial.current.uniforms.time.value=s.time
    if (coreMaterial.current) coreMaterial.current.uniforms.time.value=s.time
    positions.forEach(([x,z],i)=>{
      const power=enginePower(s.time,i,ship), throttle=ship ? 1 : s.throttle
      const thrust=power*throttle
      const nominal=ship ? 7+smooth(160.8,163,s.time)*36 : s.time<0 ? 24 : s.time<159 ? 74 : s.time<221 ? 64 : 36
      const length=Math.min(nominal,ship ? nominal : Math.max(8,s.position[1]*.9))*Math.sqrt(thrust)
      const radius=(ship && i>=3 ? 1.16 : .56)*(1+vacuum*1.35)*(1+.025*Math.sin(s.time*39+i*2.1))
      const gimbal=ship || i<20 ? 0 : s.gimbal
      dummy.position.set(x+Math.sin(gimbal)*2.726,(1-Math.cos(gimbal))*2.726,z); dummy.rotation.set(0,0,gimbal)
      dummy.scale.set(radius*power,length,radius*power); dummy.updateMatrix(); outer.current!.setMatrixAt(i,dummy.matrix)
      dummy.scale.set(radius*.47*power,length*.73,radius*.47*power); dummy.updateMatrix(); core.current!.setMatrixAt(i,dummy.matrix)
    })
    outer.current.instanceMatrix.needsUpdate=true; core.current.instanceMatrix.needsUpdate=true
  })
  return <>
    <instancedMesh ref={outer} args={[geometry,undefined,positions.length]} frustumCulled={false} renderOrder={3}>
      <shaderMaterial ref={outerMaterial} uniforms={uniforms[0]} vertexShader={flameVertex} fragmentShader={flameFragment} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/>
    </instancedMesh>
    <instancedMesh ref={core} args={[geometry,undefined,positions.length]} frustumCulled={false} renderOrder={4}>
      <shaderMaterial ref={coreMaterial} uniforms={uniforms[1]} vertexShader={flameVertex} fragmentShader={flameFragment} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/>
    </instancedMesh>
  </>
}

const cloudVertex=`attribute float opacity; varying vec2 vCloud; varying float vOpacity;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main(){vCloud=uv;vOpacity=opacity;vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
  #include <logdepthbuf_vertex>
  }`
const cloudFragment=`varying vec2 vCloud; varying float vOpacity;
  #include <logdepthbuf_pars_fragment>
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  void main(){
    #include <logdepthbuf_fragment>
    vec2 p=(vCloud-.5)*2.;float n=noise(p*4.)*.6+noise(p*9.)*.28+noise(p*19.)*.12;
    float edge=1.-smoothstep(.35,1.,length(p)+n*.15);
    float alpha=edge*(.65+n*.35)*vOpacity;if(alpha<.003)discard;
    vec3 c=mix(vec3(.46,.50,.51),vec3(.91,.92,.89),clamp(vCloud.y*.75+n*.35,0.,1.));
    gl_FragColor=vec4(c,alpha);
  }`

// Each puff has an absolute birth time. Rewinding or jumping reconstructs the
// identical cloud; particles never wrap from old smoke back to their emitter.
export function Smoke({shared}:{shared:State}) {
  const mesh=useRef<THREE.InstancedMesh>(null), dummy=useMemo(()=>new THREE.Object3D(),[])
  const spinAxis=useMemo(()=>new THREE.Vector3(0,0,1),[])
  const rotation=useMemo(()=>new THREE.Quaternion(),[]), spin=useMemo(()=>new THREE.Quaternion(),[])
  const geometry=useMemo(()=>{const g=new THREE.PlaneGeometry(1,1);g.setAttribute('opacity',new THREE.InstancedBufferAttribute(new Float32Array(240),1));return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(({camera})=>{
    if(!mesh.current)return
    const t=shared.current.sample.time, opacity=geometry.getAttribute('opacity') as THREE.InstancedBufferAttribute
    camera.getWorldQuaternion(rotation)
    for(let i=0;i<240;i++){
      const launch=i<180, j=launch?i:i-180, birth=launch?-4+j*.16:405+j*.21, age=t-birth
      const life=launch?24:12, alive=age>0&&age<life, seed=j*2.399963, spread=launch?3.6:1.8
      const power=launch?1:.38, radius=4+age*spread, size=(launch?7:3)+Math.max(0,age)*(launch?2.4:1.3)
      dummy.position.set(Math.cos(seed)*radius+age*1.15,2+Math.max(0,age)*(launch?1.15:.6),(launch?SITE.launchZ:0)+Math.sin(seed)*radius)
      spin.setFromAxisAngle(spinAxis,seed+age*.015)
      dummy.quaternion.copy(rotation).multiply(spin);dummy.scale.set(size*1.35,size,1);dummy.updateMatrix();mesh.current.setMatrixAt(i,dummy.matrix)
      opacity.setX(i,alive ? power*smooth(0,1.8,age)*(1-smooth(life*.42,life,age))*.48*(launch ? 1 : 1-smooth(421,425,t)) : 0)
    }
    opacity.needsUpdate=true;mesh.current.instanceMatrix.needsUpdate=true
    mesh.current.visible=(t>-4&&t<50)||(t>405&&t<425)
  })
  return <instancedMesh ref={mesh} args={[geometry,undefined,240]} frustumCulled={false} renderOrder={2}>
    <shaderMaterial vertexShader={cloudVertex} fragmentShader={cloudFragment} transparent depthWrite={false} side={THREE.DoubleSide} />
  </instancedMesh>
}

export function HotstageVents({shared}:{shared:State}) {
  const mesh=useRef<THREE.InstancedMesh>(null), dummy=useMemo(()=>new THREE.Object3D(),[])
  useFrame(()=>{
    if(!mesh.current)return
    const t=shared.current.sample.time, power=smooth(160,160.5,t)*(1-smooth(161.4,163,t))
    mesh.current.visible=power>0
    for(let i=0;i<16;i++){
      const angle=i*TAU/16, length=(3+power*5)*(1+.1*Math.sin(t*29+i))
      dummy.position.set(Math.sin(angle)*(4.5+length*.5),69.5,Math.cos(angle)*(4.5+length*.5))
      dummy.rotation.set(Math.PI/2,0,-angle);dummy.scale.set(.38*power,length,.38*power);dummy.updateMatrix();mesh.current.setMatrixAt(i,dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate=true
  })
  return <instancedMesh ref={mesh} args={[undefined,undefined,16]} frustumCulled={false}>
    <coneGeometry args={[1,1,12]}/><meshBasicMaterial color="#b7d6ff" transparent opacity={.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/>
  </instancedMesh>
}
