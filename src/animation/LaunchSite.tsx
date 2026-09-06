import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { SITE } from './mission'
import type { Vec3 } from './mission'

const steel = '#71848b', dark = '#263d46', pale = '#b2bcba', pad = '#8a8e85', yellow = '#b99b58'
class Structure {
  parts = new Map<string, THREE.BufferGeometry[]>()
  add(geometry: THREE.BufferGeometry, color: string) { if (!this.parts.has(color)) this.parts.set(color, []); this.parts.get(color)!.push(geometry) }
  box(p: Vec3, s: Vec3, color = steel) { this.add(new THREE.BoxGeometry(...s).translate(...p), color) }
  bar(a: Vec3, b: Vec3, r = .3, color = steel) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from)
    const g = new THREE.CylinderGeometry(r, r, delta.length(), 6)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())).translate(...from.add(to).multiplyScalar(.5).toArray())
    this.add(g, color)
  }
  cylinder(p: Vec3, top: number, bottom: number, height: number, color = pale, segments = 32) { this.add(new THREE.CylinderGeometry(top, bottom, height, segments).translate(...p), color) }
  finish() {
    const group = new THREE.Group()
    this.parts.forEach((geometries, color) => {
      const merged = mergeGeometries(geometries), material = new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: color === steel || color === dark ? .55 : .12 })
      geometries.forEach(g => g.dispose())
      if (merged) { const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh) }
    })
    return group
  }
}
export function disposeStructure(group: THREE.Group) { group.traverse(obj => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose()) } }) }
function buildSite() {
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
    b.box([x, y, 0], [16, .65, 16], steel)
    for (const side of [-1, 1]) {
      b.bar([x-7, y, side*7], [x+7, y+12, side*7], .3, dark)
      b.bar([x+7, y, side*7], [x-7, y+12, side*7], .3, dark)
      b.bar([x+side*7, y, -7], [x+side*7, y+12, 7], .3, dark)
      b.bar([x+side*7, y, 7], [x+side*7, y+12, -7], .3, dark)
      b.bar([x-8, y+1.5, side*8], [x+8, y+1.5, side*8], .09, pale)
      for (let k = 0; k < 5; k++) b.bar([x-8+k*4, y, side*8], [x-8+k*4, y+1.5, side*8], .08, pale)
    }
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
  b.cylinder([0, 23.5, SITE.launchZ], 12, 13, 3, dark, 48)
  b.cylinder([0, 25.05, SITE.launchZ], 6.5, 6.5, .15, '#202b2c', 48)
  for (let i = 0; i < 6; i++) {
    const a = i*Math.PI/3, px = Math.cos(a), pz = Math.sin(a)
    b.bar([px*14, 0, SITE.launchZ+pz*14], [px*10, 24, SITE.launchZ+pz*10], 1.35, dark)
    b.box([px*14, .8, SITE.launchZ+pz*14], [5, 1.6, 5], pad)
    b.bar([px*17, 1.3, SITE.launchZ+pz*17], [px*11, 16, SITE.launchZ+pz*11], .36, pale)
  }
  b.box([0, .1, SITE.launchZ], [39, .2, 39], '#3b4b4e')
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
  b.box([17.5, 0, 0], [37, 3.2, 1.7], dark)
  b.box([20, 1.8, 0], [31, .4, 1.9], pale)
  for (let i = 0; i < 8; i++) {
    const x = i*4.5
    b.bar([x, -1.6, .95], [x+4.5, 1.6, .95], .2, steel)
    b.bar([x, 1.6, -.95], [x+4.5, -1.6, -.95], .2, steel)
  }
  b.cylinder([0, 0, 0], 1.5, 1.5, 5, pale)
  b.bar([-1, -2.3, 0], [25, -2.3, 0], .4, yellow)
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
    const g = new THREE.PlaneGeometry(15000, 16000, 200, 220)
    g.rotateX(-Math.PI/2); g.translate(-6080, -.25, 0)
    const p = g.attributes.position, c = new Float32Array(p.count*3), color = new THREE.Color()
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), edge = 365+Math.sin(z*.001)*110+Math.sin(z*.011)*19
      const noise = Math.sin(x*.011+Math.cos(z*.017)*2)*Math.sin(z*.009)+Math.sin(x*.037+z*.029)*.2
      const wet = Math.sin(x*.006+z*.004+Math.sin(z*.01))
      color.set(x > edge ? '#276074' : x > edge-75 ? '#a59a73' : wet > .73 && x < -280 ? '#344f53' : noise > .1 ? '#566846' : '#70775a')
      color.multiplyScalar(.92 + Math.sin(x*.137+z*.37)*.08).toArray(c, i*3)
      if (x > edge) p.setY(i, -1)
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals(); return g
  }, [])
  const globe = useMemo(() => new THREE.SphereGeometry(6371000, 160, 100), [])
  const earthMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .9})
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 vSurface;\n'+shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurface=position;')
      shader.fragmentShader = 'varying vec3 vSurface;\n'+shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float coastline=365.+sin(vSurface.z*.00007)*9000.;
        float n=sin(vSurface.x*.00012)*sin(vSurface.z*.00016);
        vec3 land=mix(vec3(.14,.18,.105),vec3(.20,.23,.15),n*.5+.5);
        vec3 sea=vec3(.035,.13,.19)+n*.008;
        diffuseColor.rgb*=mix(land,sea,smoothstep(coastline-500.,coastline+100.,vSurface.x));`)
    }
    material.customProgramCacheKey = () => 'starbase-coast-v1'
    return material
  }, [])
  useEffect(() => () => { globe.dispose(); terrain.dispose(); earthMaterial.dispose() }, [globe, terrain, earthMaterial])
  return <>
    <mesh geometry={globe} material={earthMaterial} position={[0, -6371002, 0]} />
    <mesh geometry={terrain} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>
  </>
}
