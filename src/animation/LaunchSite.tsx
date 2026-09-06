import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { SITE } from './mission'
import type { Vec3 } from './mission'

const steel = '#71848b', dark = '#263d46', pale = '#b2bcba', pad = '#8a8e85', yellow = '#b99b58'
class Structure {
  parts = new Map<string, THREE.BufferGeometry[]>()
  add(geometry: THREE.BufferGeometry, color: string) {
    const indexed=geometry.index ? geometry : mergeVertices(geometry)
    if(indexed!==geometry)geometry.dispose()
    if (!this.parts.has(color)) this.parts.set(color, []); this.parts.get(color)!.push(indexed)
  }
  box(p: Vec3, s: Vec3, color = steel) { this.add(new THREE.BoxGeometry(...s).translate(...p), color) }
  bar(a: Vec3, b: Vec3, r = .3, color = steel) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from)
    const g = new THREE.CylinderGeometry(r, r, delta.length(), 6)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())).translate(...from.add(to).multiplyScalar(.5).toArray())
    this.add(g, color)
  }
  cylinder(p: Vec3, top: number, bottom: number, height: number, color = pale, segments = 32) { this.add(new THREE.CylinderGeometry(top, bottom, height, segments).translate(...p), color) }
  ring(p: Vec3, radius: number, tube: number, color = pale) { const g = new THREE.TorusGeometry(radius, tube, 8, 96); g.rotateX(Math.PI/2).translate(...p); this.add(g, color) }
  finish() {
    const group = new THREE.Group()
    this.parts.forEach((geometries, color) => {
      const merged = mergeGeometries(geometries), material = new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: color === steel || color === dark ? .55 : .12 })
      geometries.forEach(g => g.dispose())
      if (!merged) throw new Error(`Incompatible launch-site geometry for ${color}`)
      const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
    })
    return group
  }
}
export function disposeStructure(group: THREE.Group) { group.traverse(obj => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose()) } }) }
export function buildSite() {
  const b = new Structure(), x = SITE.towerX
  b.box([-15, -.8, 15], [155, 1.6, 142], pad)
  b.box([-165, -.5, 19], [260, 1, 13], '#596562')
  b.box([-295, -.5, -95], [13, 1, 250], '#596562')
  for (let i = 0; i < 20; i++) b.box([-50 - i*12, .02, 19], [5, .08, .18], '#c3c2a3')
  b.box([x, 2, 0], [24, 4, 24], '#777e78')
  for (const dx of [-7, 7]) for (const z of [-7, 7]) {
    b.box([x + dx, 73, z], [1.4, 146, 1.4], dark)
    b.box([x + dx, 3, z], [4, 6, 4], pad)
  }
  for (let level = 0; level < 11; level++) {
    const y = 5 + level*12.3
    // Open service decks and perimeter rails retain the tower's depth in silhouette.
    for (const side of [-1, 1]) {
      b.box([x, y, side*6.7], [16, .5, 2.6], steel)
      b.box([x+side*6.7, y, 0], [2.6, .5, 11], steel)
      for (let k = 0; k < 7; k++) b.box([x-6+k*2, y+.26, side*6.7], [.08,.04,2.6], dark)
    }
    for (const side of [-1, 1]) {
      b.bar([x-7, y, side*7], [x+7, y+12, side*7], .3, dark)
      b.bar([x+7, y, side*7], [x-7, y+12, side*7], .3, dark)
      b.bar([x+side*7, y, -7], [x+side*7, y+12, 7], .3, dark)
      b.bar([x+side*7, y, 7], [x+side*7, y+12, -7], .3, dark)
      b.bar([x-8, y+1.5, side*8], [x+8, y+1.5, side*8], .09, pale)
      for (let k = 0; k < 5; k++) b.bar([x-8+k*4, y, side*8], [x-8+k*4, y+1.5, side*8], .08, pale)
      b.bar([x+side*8, y+1.5, -8], [x+side*8, y+1.5, 8], .09, pale)
      for (let k = 0; k < 5; k++) b.bar([x+side*8, y, -8+k*4], [x+side*8, y+1.5, -8+k*4], .08, pale)
    }
    b.bar([x-4,y, -4], [x+4,y+12.3,-4], .12, pale)
    for (let step=0; step<28; step++) b.box([x-4+step*8/28,y+step*12.3/28,-4], [.55,.10,1.6], steel)
  }
  // Elevator, carriage rails, cable runs and crown crane.
  b.box([x-8.2, 68, 2], [2.7, 132, 3.5], '#5e7378')
  for (const z of [-5.5, 5.5]) b.box([x+8.1, 75, z], [.35, 139, .45], pale)
  for (let i = 0; i < 4; i++) b.bar([x-4+i*.65, 12, -8.1], [x-4+i*.65, 143, -8.1], .11, dark)
  b.box([x, 143.5, 0], [19, 3, 18], pale)
  b.box([x-2, 147, 0], [4, 4, 5], dark)
  b.bar([x-12, 148, 0], [x+24, 148, 0], .75, yellow)
  b.bar([x-12, 148, 0], [x-2, 154, 0], .18, steel)
  b.bar([x-2, 154, 0], [x+24, 148, 0], .18, steel)
  // Launch table is next to the catch axis, leaving a clear suspended recovery volume.
  const table = new THREE.Shape()
  table.absarc(0, 0, 12, 0, Math.PI*2, false)
  const aperture = new THREE.Path(); aperture.absarc(0, 0, 4.65, 0, Math.PI*2, true); table.holes.push(aperture)
  const platform = new THREE.ExtrudeGeometry(table, {depth: 3, bevelEnabled:false, steps:1, curveSegments:64})
  platform.rotateX(-Math.PI/2).translate(0,22,SITE.launchZ); b.add(platform, dark)
  for (const y of [22.1,24.8]) b.ring([0,y,SITE.launchZ],11.9,.14,pale)
  b.ring([0,24.7,SITE.launchZ],4.7,.15,pale)
  for (let i = 0; i < 24; i++) {
    const a=i*Math.PI/12, px=Math.cos(a), pz=Math.sin(a)
    b.bar([px*5.1,22.3,SITE.launchZ+pz*5.1],[px*11.7,24.8,SITE.launchZ+pz*11.7],.14,steel)
    b.bar([px*12.2,25,SITE.launchZ+pz*12.2],[px*12.2,26.3,SITE.launchZ+pz*12.2],.06,pale)
    if (i%2===0) b.box([px*5,25.15,SITE.launchZ+pz*5],[.7,.3,.7],pale)
  }
  b.ring([0,26.3,SITE.launchZ],12.2,.06,pale)
  b.ring([0,21.8,SITE.launchZ],10.2,.35,pale)
  for (let i = 0; i < 6; i++) {
    const a = i*Math.PI/3, px = Math.cos(a), pz = Math.sin(a)
    b.bar([px*14, 0, SITE.launchZ+pz*14], [px*10, 24, SITE.launchZ+pz*10], 1.35, dark)
    b.box([px*14, .8, SITE.launchZ+pz*14], [5, 1.6, 5], pad)
    b.bar([px*17, 1.3, SITE.launchZ+pz*17], [px*11, 16, SITE.launchZ+pz*11], .36, pale)
  }
  b.box([0, .1, SITE.launchZ], [39, .2, 39], '#3b4b4e')
  for (const x of [-1,1]) for (const z of [-1,1]) {
    b.bar([x*18,1.1,SITE.launchZ+z*18],[x*6,1.1,SITE.launchZ+z*6],.48,pale)
    b.box([x*15,.5,SITE.launchZ+z*15],[3,1,3],pad)
  }
  // Expansion joints and drainage strips make the hardstanding readable at ground level.
  for (let i=0; i<9; i++) b.box([-83+i*17,.025,15],[.035,.035,141], '#646e69')
  for (let i=0; i<8; i++) b.box([-15,.027,-55+i*20],[155,.035,.035], '#646e69')
  for (const xx of [-64,58]) for (let i=0; i<45; i++) b.box([xx,.06,-45+i*2.5],[1,.09,.15],dark)
  // Service pipes, tank farm, berms and small buildings provide readable scale.
  for (let i = 0; i < 5; i++) {
    const tx = -99-i%3*17, tz = -30-Math.floor(i/3)*25
    b.cylinder([tx, 13, tz], 5.5, 5.5, 26, '#c4ccc7')
    b.cylinder([tx, 26.3, tz], 4.8, 5.5, .6, pale)
    for (let j = 1; j < 5; j++) b.cylinder([tx, j*5, tz], 5.56, 5.56, .14, steel)
    b.bar([tx+5.7, 1, tz], [tx+5.7, 27, tz], .16, dark)
  }
  for (let i = 0; i < 4; i++) {
    b.bar([-90, 1.5+i*.55, -19+i*2], [-18, 1.5+i*.55, -19+i*2], .28, pale)
    b.bar([-18, 1.5+i*.55, -19+i*2], [-18, 1.5+i*.55, 34], .28, pale)
  }
  b.box([-120, 4, 61], [38, 8, 19], '#8c9a96')
  b.box([-175, 5, -75], [50, 10, 23], '#afb5a9')
  b.box([-235, 3, 62], [27, 6, 14], '#c4c9b8')
  for (let i = 0; i < 24; i++) {
    const z = -58+i*5.8
    b.bar([-72, 0, z], [-72, 3.5, z], .08, dark)
    b.bar([65, 0, z], [65, 3.5, z], .08, dark)
  }
  for (const xx of [-72, 65]) for (const h of [1, 2.5, 3.4]) b.bar([xx, h, -58], [xx, h, 76], .035, steel)
  for (const p of [[42, 53], [-65, 64], [-65, -51]] as const) { b.bar([p[0], 0, p[1]], [p[0], 20, p[1]], .15, pale); b.box([p[0], 20, p[1]], [2, .4, .8], '#d9d2a8') }
  return b.finish()
}
export function buildArm() {
  const b = new Structure()
  for (const z of [-.85,.85]) for (const y of [-1.6,1.3]) b.box([17.5,y,z],[37,.3,.3],dark)
  b.box([20, 1.8, 0], [31, .4, 1.9], '#c4c9c2')
  b.box([21,2.015,0],[17,.03,1.5],'#9ca69f')
  for (let i = 0; i < 8; i++) {
    const x = i*4.5
    for (const z of [-.85,.85]) {
      b.bar([x,-1.6,z],[x+4.5,1.3,z],.13,steel)
      b.bar([x,1.3,z],[x+4.5,-1.6,z],.13,steel)
      b.bar([x,-1.6,z],[x,1.3,z],.15,dark)
      b.box([x,1.3,z],[.6,.5,.1],pale)
    }
    b.bar([x,-1.5,-.8],[x+4.5,-1.5,.8],.11,steel)
    b.bar([x,1.2,-.8],[x,1.2,.8],.12,steel)
  }
  b.cylinder([0, 0, 0], 1.5, 1.5, 5, pale)
  for (const y of [-2.5,2.5]) b.cylinder([0,y,0],1.75,1.75,.25,dark)
  b.bar([3,-2.25,0],[24,-2.25,0],.17,pale)
  b.bar([3,-2.25,.35],[16,-2.25,.35],.11,yellow)
  for (let i=0;i<12;i++) b.box([8+i*2,1.94,1.02],[.4,.12,.13],yellow)
  b.box([35.7,.1,0],[1.4,3.4,2],pale)
  return b.finish()
}
export function LaunchSite() {
  const site = useMemo(buildSite, [])
  // R3F disposes the per-mount geometry on removal; shared spacecraft GLB is separate.
  useEffect(() => () => disposeStructure(site), [site])
  return <primitive object={site} dispose={null} />
}

export function Ground() {
  const terrain = useMemo(() => {
    const g = new THREE.PlaneGeometry(1600000, 1600000, 192, 192)
    g.rotateX(-Math.PI/2)
    const p = g.attributes.position
    for (let i=0; i<p.count; i++) p.setY(i, -.25-(p.getX(i)**2+p.getZ(i)**2)/(2*6371000))
    g.computeVertexNormals(); return g
  }, [])
  const earthMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({color:'#ffffff', roughness:.94})
    material.onBeforeCompile = shader => {
      shader.vertexShader='varying vec3 vSurface;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=position;')
      shader.fragmentShader=`varying vec3 vSurface;
        float terrainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float terrainNoise(vec2 p){vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(terrainHash(i),terrainHash(i+vec2(1.,0.)),f.x),mix(terrainHash(i+vec2(0.,1.)),terrainHash(i+vec2(1.)),f.x),f.y);}
        float terrainFbm(vec2 p){return terrainNoise(p)*.53+terrainNoise(p*2.03)*.27+terrainNoise(p*4.11)*.13+terrainNoise(p*8.17)*.07;}
      `+shader.fragmentShader
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 p=vSurface.xz;
        float coast=365.+sin(p.y*.001)*85.+sin(p.y*.009)*16.+sin(p.y*.000015)*6000.;
        float inland=coast-p.x;
        float macro=terrainFbm(p*.00055), detail=terrainFbm(p*.013);
        vec3 land=mix(vec3(.115,.137,.060),vec3(.23,.23,.125),macro);
        land*=.84+detail*.32;
        float channels=abs(terrainFbm(p*.003)-.49);
        float wet=(1.-smoothstep(.016,.048,channels))*smoothstep(100.,400.,inland)*(1.-smoothstep(3500.,13000.,inland));
        land=mix(land,vec3(.032,.087,.081),wet*.85);
        land=mix(vec3(.40,.37,.245),land,smoothstep(15.,95.,inland));
        vec3 sea=mix(vec3(.023,.115,.142),vec3(.055,.205,.215),exp(-max(0.,-inland)/1600.));
        float surf=(1.-smoothstep(0.,18.,abs(inland+10.)))*(.45+.2*sin(p.y*.12));
        sea=mix(sea,vec3(.40,.49,.44),surf);
        diffuseColor.rgb=mix(sea,land,smoothstep(-2.,4.,inland));
      `)
      shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
        float haze=1.-exp(-length(vViewPosition)*.0005);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.46,.61,.68),haze*.75);
      `)
    }
    material.customProgramCacheKey=()=> 'starbase-continuous-terrain-v2'
    return material
  }, [])
  useEffect(() => () => { terrain.dispose(); earthMaterial.dispose() }, [terrain, earthMaterial])
  return <mesh geometry={terrain} material={earthMaterial} receiveShadow />
}
