import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { spacecraftSpec, type SpacecraftId } from './specs'

type V3 = [number, number, number]
const TAU = Math.PI * 2
const material = (name: string, color: string, metalness: number, roughness: number) => {
  const result = new THREE.MeshStandardMaterial({ color, metalness, roughness })
  result.name = name
  return result
}

// Authoring is in metres, Y up, origin on the engine exit plane. Geometry is
// batched by material within each named assembly, retaining the stage hierarchy.
class Assembly {
  group = new THREE.Group()
  buckets = new Map<THREE.Material, THREE.BufferGeometry[]>()
  constructor(name: string) { this.group.name = name }
  add(geometry: THREE.BufferGeometry, mat: THREE.Material, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0]) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1)))
    geometry.deleteAttribute('uv')
    const indexed = geometry.index ? geometry : mergeVertices(geometry)
    if (indexed !== geometry) geometry.dispose()
    if (!this.buckets.has(mat)) this.buckets.set(mat, [])
    this.buckets.get(mat)!.push(indexed)
  }
  box(mat: THREE.Material, size: V3, position: V3, rotation: V3 = [0, 0, 0]) { this.add(new THREE.BoxGeometry(...size), mat, position, rotation) }
  cylinder(mat: THREE.Material, radius: number, y: number, height: number, x = 0, z = 0, top = radius, segments = 128, open = false) {
    this.add(new THREE.CylinderGeometry(top, radius, height, segments, 1, open), mat, [x, y, z])
  }
  ring(mat: THREE.Material, radius: number, y: number, thickness: number, x = 0, z = 0, segments = 128) {
    this.add(new THREE.TorusGeometry(radius, thickness, 6, segments), mat, [x, y, z], [Math.PI / 2, 0, 0])
  }
  rod(mat: THREE.Material, a: V3, b: V3, radius = 0.03, segments = 10) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b)
    const geometry = new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), segments)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()))
    this.add(geometry, mat, from.add(to).multiplyScalar(0.5).toArray() as V3)
  }
  lathe(mat: THREE.Material, points: number[][], segments = 160, start = 0, length = TAU) {
    this.add(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments, start, length), mat)
  }
  plate(mat: THREE.Material, points: number[][], depth: number, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], bevel = 0.02) {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1 })
    geometry.translate(0, 0, -depth / 2)
    this.add(geometry, mat, position, rotation)
  }
  finish() {
    for (const [mat, geometries] of this.buckets) {
      const geometry = mergeGeometries(geometries)!
      geometry.computeBoundingBox(); geometry.computeBoundingSphere()
      const mesh = new THREE.Mesh(geometry, mat)
      mesh.name = `${this.group.name}-${mat.name}`
      mesh.castShadow = true; mesh.receiveShadow = true
      this.group.add(mesh)
      geometries.forEach(item => item.dispose())
    }
    this.buckets.clear()
    return this.group
  }
}

const palette = () => ({
  white: material('ceramic-white', '#e8e9e7', 0.22, 0.36),
  black: material('carbon-composite', '#171c20', 0.3, 0.5),
  steel: material('brushed-stainless-steel', '#aab5bc', 0.9, 0.3),
  weld: material('welded-seams', '#75828a', 0.86, 0.4),
  titanium: material('titanium', '#68716e', 0.82, 0.42),
  nozzle: material('engine-alloy', '#6d6760', 0.88, 0.4),
  inside: material('nozzle-interior', '#24282a', 0.65, 0.57),
  copper: material('engine-plumbing', '#9a7860', 0.85, 0.4),
  red: material('flag-red', '#b23c39', 0.1, 0.5),
  blue: material('marking-blue', '#173f67', 0.1, 0.5),
})
type Palette = ReturnType<typeof palette>

// A hollow, curved bell with a real inner wall, throat, injector hardware,
// cooling bands and feed pipes. Exit is y = 0, not a solid capped cone.
function engine(name: string, radius: number, height: number, p: Palette) {
  const a = new Assembly(name)
  const profile: number[][] = []
  for (let i = 0; i <= 22; i++) {
    const t = i / 22
    profile.push([radius * (0.25 + 0.75 * (1 - t) ** 1.55), height * 0.72 * t])
  }
  const outer = new THREE.MeshStandardMaterial({ color: p.nozzle.color, metalness: 0.88, roughness: 0.36, side: THREE.DoubleSide })
  outer.name = 'bell-alloy'
  a.lathe(outer, profile, 64)
  a.lathe(p.inside, profile.map(([r, y]) => [r - radius * 0.035, y]).reverse(), 64)
  a.ring(p.titanium, radius - radius * 0.015, 0.018, radius * 0.025, 0, 0, 64)
  for (let i = 1; i < 10; i++) {
    const t = i / 12
    a.ring(p.copper, radius * (0.25 + 0.75 * (1 - t) ** 1.55) + 0.008, height * 0.72 * t, radius * 0.014, 0, 0, 64)
  }
  a.cylinder(p.titanium, radius * 0.25, height * 0.79, height * 0.22, 0, 0, radius * 0.3, 32)
  a.ring(p.steel, radius * 0.32, height * 0.88, radius * 0.045, 0, 0, 32)
  a.cylinder(p.steel, radius * 0.32, height * 0.96, height * 0.08, 0, 0, radius * 0.3, 32)
  for (let i = 0; i < 3; i++) {
    const angle = i * TAU / 3
    const x = Math.sin(angle), z = Math.cos(angle)
    a.rod(p.copper, [x * radius * 0.48, height * 0.32, z * radius * 0.48], [x * radius * 0.44, height * 0.92, z * radius * 0.44], radius * 0.055)
    a.cylinder(p.titanium, radius * 0.14, height * 0.81, height * 0.17, x * radius * 0.53, z * radius * 0.53, radius * 0.14, 16)
  }
  return a.finish()
}

function engineArray(name: string, layout: V3[], prototype: THREE.Group) {
  const group = new THREE.Group(); group.name = name
  layout.forEach((position, i) => { const item = prototype.clone(true); item.name = `${name}-${String(i + 1).padStart(2, '0')}`; item.position.set(...position); group.add(item) })
  group.userData.engineCount = layout.length
  return group
}

function radial(radius: number, y: number, angle: number): V3 { return [Math.sin(angle) * radius, y, Math.cos(angle) * radius] }

// Vertical local XY lattice, hinged at its lower edge. Super Heavy uses a
// horizontal orientation; Falcon's fins are stowed against the interstage.
function gridFin(name: string, width: number, length: number, p: Palette, cells: number) {
  const fin = new Assembly(name), thickness = width * 0.048, depth = width * 0.13
  for (const x of [-width / 2, width / 2]) fin.box(p.titanium, [thickness, length, depth], [x, length / 2, 0])
  for (const y of [0, length]) fin.box(p.titanium, [width, thickness, depth], [0, y, 0])
  for (let i = 1; i < cells; i++) fin.box(p.titanium, [thickness * 0.43, length, depth * 0.8], [-width / 2 + width * i / cells, length / 2, 0])
  const rows = Math.round(cells * length / width)
  for (let i = 1; i < rows; i++) fin.box(p.titanium, [width, thickness * 0.43, depth * 0.8], [0, length * i / rows, 0])
  fin.rod(p.steel, [-width * 0.3, -0.13, 0], [width * 0.3, -0.13, 0], width * 0.065, 20)
  return fin.finish()
}

// Small geometry lettering stays sharp at close range and needs no network
// font or texture. Deliberately uses plain technical lettering, not a logo asset.
const letters: Record<string, string[]> = {
  A:['01110','10001','10001','11111','10001','10001','10001'], C:['01111','10000','10000','10000','10000','10000','01111'],
  E:['11111','10000','10000','11110','10000','10000','11111'], F:['11111','10000','10000','11110','10000','10000','10000'],
  H:['10001','10001','10001','11111','10001','10001','10001'], I:['11111','00100','00100','00100','00100','00100','11111'],
  L:['10000','10000','10000','10000','10000','10000','11111'], N:['10001','11001','11001','10101','10011','10011','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'], P:['11110','10001','10001','11110','10000','10000','10000'],
  R:['11110','10001','10001','11110','10100','10010','10001'], S:['01111','10000','10000','01110','00001','00001','11110'],
  T:['11111','00100','00100','00100','00100','00100','00100'], U:['10001','10001','10001','10001','10001','10001','01110'],
  V:['10001','10001','10001','10001','10001','01010','00100'], X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'], '9':['01110','10001','10001','01111','00001','00001','11110'],
}
function lettering(a: Assembly, text: string, cell: number, y: number, radius: number, mat: THREE.Material, vertical = false, angle = 0) {
  const total = (text.length * 6 - 1) * cell
  for (let c = 0; c < text.length; c++) (letters[text[c]] || []).forEach((row, j) => {
    for (let k = 0; k < 5; k++) if (row[k] === '1') {
      const u = (c * 6 + k) * cell - total / 2, v = (3 - j) * cell
      const phi = angle + (vertical ? -v : u) / radius
      a.box(mat, [cell * 1.01, cell * 1.01, 0.015], radial(radius + 0.017, y + (vertical ? u : v), phi), [0, phi, 0])
    }
  })
}
function flag(a: Assembly, y: number, radius: number, width: number, p: Palette, angle = 0) {
  const height = width / 1.9
  for (let i = 0; i < 13; i++) {
    const phi = angle
    a.box(i % 2 ? p.white : p.red, [width, height / 13, 0.025], radial(radius + 0.025, y + height / 2 - height * i / 13, phi), [0, phi, 0])
  }
  a.box(p.blue, [width * 0.42, height * 7 / 13, 0.027], [-width * 0.29, y + height * 3 / 13, radius + 0.045])
  for (let j = 0; j < 9; j++) for (let k = 0; k < (j % 2 ? 5 : 6); k++) a.box(p.white, [width * 0.012, width * 0.012, 0.03], [-width * 0.46 + k * width * 0.064 + (j % 2) * width * 0.032, y + height * 0.43 - j * height * 0.05, radius + 0.055])
}

function falcon9(p: Palette) {
  const model = new THREE.Group(), first = new Assembly('first-stage')
  first.cylinder(p.black, 1.83, 2.35, 2.4)
  first.cylinder(p.white, 1.85, 22.5, 37.9)
  first.cylinder(p.black, 1.85, 44.4, 5.9, 0, 0, 1.85, 160, true)
  for (const y of [3.5, 5.3, 14.2, 24.7, 36.6, 41.45, 47.32]) first.ring(y > 41 ? p.titanium : p.weld, 1.853, y, 0.022)
  for (let i = 0; i < 40; i++) {
    const phi = i * TAU / 40
    first.box(p.titanium, [0.045, 1.2, 0.025], radial(1.835, 2.3, phi), [0, phi, 0])
  }
  // Two external raceways with clamps and small valve/umbilical panels.
  for (const phi of [Math.PI * 0.55, Math.PI * 1.55]) {
    first.box(p.white, [0.17, 37.3, 0.16], radial(1.86, 22.5, phi), [0, phi, 0])
    for (let y = 5; y < 41; y += 2.8) first.box(p.weld, [0.22, 0.045, 0.19], radial(1.86, y, phi), [0, phi, 0])
  }
  for (const y of [8.2, 15.5, 35.8, 40.8]) {
    first.box(p.weld, [0.32, 0.43, 0.05], radial(1.86, y, -0.7), [0, -0.7, 0])
    first.box(p.white, [0.26, 0.35, 0.065], radial(1.86, y, -0.7), [0, -0.7, 0])
  }
  lettering(first, 'SPACEX', 0.13, 26.4, 1.851, p.blue, true)
  lettering(first, 'FALCON 9', 0.071, 18.4, 1.851, p.black, true)
  flag(first, 37.5, 1.851, 1.15, p)
  first.cylinder(p.black, 1.77, 2.08, 0.2)
  const firstGroup = first.finish()
  const merlins: V3[] = [[0, 0.02, 0], ...Array.from({ length: 8 }, (_, i) => radial(1.18, 0.02, i * TAU / 8))]
  firstGroup.add(engineArray('merlin-1d', merlins, engine('merlin-engine', 0.445, 2.15, p)))
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2
    const fin = gridFin(`grid-fin-${i + 1}`, 1.15, 1.55, p, 7)
    fin.position.set(...radial(1.99, 42.8, angle)); fin.rotation.y = angle
    firstGroup.add(fin)
    const leg = new Assembly(`landing-leg-${i + 1}`)
    // Tapered carbon shell hugs the tank in its launch configuration.
    leg.plate(p.black, [[-0.7, 0], [0.7, 0], [0.34, 3.4], [0.12, 7.6], [-0.12, 7.6], [-0.34, 3.4]], 0.14, [0, 0, 0.08])
    leg.plate(p.white, [[-0.56, 0.22], [0.56, 0.22], [0.23, 3.1], [0.075, 6.9], [-0.075, 6.9], [-0.23, 3.1]], 0.03, [0, 0, 0.165])
    for (const side of [-1, 1]) leg.rod(p.titanium, [side * 0.52, 0.4, 0.15], [side * 0.1, 6.85, 0.12], 0.06, 16)
    leg.rod(p.steel, [-0.57, 0.28, 0.13], [0.57, 0.28, 0.13], 0.16, 24)
    const legGroup = leg.finish(); legGroup.position.set(...radial(1.84, 3.4, angle)); legGroup.rotation.y = angle
    firstGroup.add(legGroup)
  }
  model.add(firstGroup)

  const upper = new Assembly('second-stage')
  upper.cylinder(p.white, 1.85, 51.95, 8.2)
  upper.cylinder(p.black, 1.7, 47.68, 0.3)
  for (const y of [47.9, 51.5, 55.95]) upper.ring(p.weld, 1.857, y, 0.019)
  upper.lathe(p.white, [[1.85, 56.05], [1.85, 56.9], [0, 56.9]])
  for (let i = 0; i < 4; i++) {
    const phi = Math.PI / 4 + i * Math.PI / 2
    upper.box(p.titanium, [0.23, 0.5, 0.12], radial(1.85, 49.5, phi), [0, phi, 0])
  }
  const upperGroup = upper.finish(); upperGroup.position.y = 0
  const mvac = engine('merlin-vacuum', 1.46, 3.2, p); mvac.position.y = 44.5; upperGroup.add(mvac)
  model.add(upperGroup)

  // Standard fairing: 13.1 m tall, maximum diameter 5.2 m. Smooth ogive, not a cone.
  const profile = [[1.85, 56.9], [2.1, 57.8], [2.6, 59.05], [2.6, 64.4]]
  for (let i = 1; i <= 40; i++) {
    const t = i / 40
    profile.push([2.6 * Math.cos(t * Math.PI / 2), 64.4 + 5.6 * Math.sin(t * Math.PI / 2)])
  }
  for (let i = 0; i < 2; i++) {
    const fairing = new Assembly(i ? 'fairing-right' : 'fairing-left')
    const white = p.white.clone(); white.name = 'fairing-shell'; white.side = THREE.DoubleSide
    fairing.lathe(white, profile, 112, i * Math.PI, Math.PI)
    fairing.lathe(p.black, profile.map(([r, y]) => [Math.max(0, r - 0.055), y]).reverse(), 112, i * Math.PI, Math.PI)
    for (const phi of [i * Math.PI, (i + 1) * Math.PI]) for (let j = 0; j < profile.length - 1; j++) {
      const [r1, y1] = profile[j], [r2, y2] = profile[j + 1]
      fairing.rod(p.weld, radial(r1, y1, phi), radial(r2, y2, phi), 0.015, 6)
    }
    for (let j = 0; j < 9; j++) {
      const phi = (i + 0.12 + j * 0.092) * Math.PI
      fairing.box(p.titanium, [0.08, 0.12, 0.025], radial(2.605, 60.1, phi), [0, phi, 0])
    }
    model.add(fairing.finish())
  }
  return model
}

function shipRadius(y: number) {
  if (y <= 33) return 4.5
  const t = Math.min(1, (y - 33) / 19)
  return 4.5 * Math.cos(t * Math.PI / 2)
}

// Individual six-sided surface prisms laid onto the curved windward hull.
// Every tile has its own perimeter gap and deterministic subtle colour variation.
function heatShield(p: Palette) {
  const assembly = new Assembly('heat-shield'), tileMats = [0, 1, 2, 3].map(i => material(`thermal-tile-${i}`, ['#242a2d', '#292e31', '#20272a', '#303639'][i], 0.07, 0.93))
  const side = 0.16, step = Math.sqrt(3) * side
  let count = 0
  for (let row = 0; row < 212; row++) {
    const y = 1.1 + row * side * 1.5
    if (y > 51.45) break
    const radius = shipRadius(y), halfArc = Math.PI * radius * 0.515
    for (let col = Math.ceil(-halfArc / step); col <= Math.floor(halfArc / step); col++) {
      const u = (col + (row % 2) * 0.5) * step, angle = u / radius
      if (Math.abs(angle) > Math.PI * 0.515) continue
      const positions: number[] = [], indices: number[] = []
      for (const offset of [0.018, 0.064]) for (let k = 0; k < 6; k++) {
        const phi = Math.PI / 6 + k * TAU / 6, yy = y + Math.sin(phi) * side * 0.955
        const theta = angle + Math.cos(phi) * side * 0.955 / radius, r = shipRadius(yy) + offset
        positions.push(Math.sin(theta) * r, yy, Math.cos(theta) * r)
      }
      for (let k = 1; k < 5; k++) indices.push(6, 6 + k, 7 + k)
      for (let k = 0; k < 6; k++) { const n = (k + 1) % 6; indices.push(k, n, k + 6, n, n + 6, k + 6) }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
      assembly.add(geometry, tileMats[Math.abs(row * 17 + col * 31) % 4]); count++
    }
  }
  const result = assembly.finish(); result.userData.tileCount = count
  // The inner substrate is visible only inside the narrow expansion gaps.
  const substrate = p.black.clone(); substrate.name = 'thermal-substrate'; substrate.roughness = 0.98
  const under = new Assembly('tile-substrate')
  const profile = Array.from({ length: 130 }, (_, i) => { const y = 0.9 + i / 129 * 51.05; return [shipRadius(y) + 0.012, y] })
  under.lathe(substrate, profile, 96, -Math.PI * 0.516, Math.PI * 1.032)
  result.add(under.finish())
  return result
}

function starship(p: Palette) {
  const model = new THREE.Group(), booster = new Assembly('booster')
  const flapTile = material('flap-thermal-tiles', '#2c3337', 0.07, 0.93)
  // Alternating rolled steel panels, with fine circumferential and longitudinal welds.
  const panelMats = ['#a6b1b8', '#b2bbc0', '#aab4ba'].map((color, i) => material(`steel-panel-${i}`, color, 0.9, 0.29 + i * 0.022))
  for (let i = 0; i < 36; i++) {
    const low = 3.2 + i * 1.825
    booster.cylinder(panelMats[i % 3], 4.5, low + 0.9125, 1.825)
    booster.ring(p.weld, 4.502, low, 0.021)
    for (let j = 0; j < 3; j++) {
      const phi = j * TAU / 3 + (i % 2) * 0.6
      booster.rod(p.weld, radial(4.505, low + 0.035, phi), radial(4.505, low + 1.79, phi), 0.01, 6)
    }
  }
  booster.cylinder(p.steel, 4.5, 2.3, 1.8, 0, 0, 4.5, 160, true)
  booster.cylinder(p.black, 4.36, 3.08, 0.15)
  for (let i = 0; i < 60; i++) {
    const phi = i * TAU / 60
    booster.box(p.weld, [0.065, 10.6, 0.075], radial(4.52, 8.6, phi), [0, phi, 0])
  }
  for (const phi of [0.32, Math.PI + 0.32]) {
    booster.box(p.steel, [0.38, 53, 0.32], radial(4.5, 34, phi), [0, phi, 0])
    for (let y = 8; y < 61; y += 3.65) booster.box(p.titanium, [0.46, 0.06, 0.37], radial(4.5, y, phi), [0, phi, 0])
  }
  for (let i = 0; i < 4; i++) {
    const phi = Math.PI / 4 + i * Math.PI / 2
    booster.plate(p.steel, [[-0.45, 0], [0.45, 0], [0.7, 7.2], [0.35, 9.5], [-0.35, 9.5], [-0.7, 7.2]], 0.62, radial(4.49, 4.2, phi), [0, phi, 0])
    booster.box(p.titanium, [0.7, 1.15, 0.58], radial(4.5, 62.7, phi), [0, phi, 0])
    booster.rod(p.steel, radial(4.5, 63, phi), radial(5.5, 63, phi), 0.18, 20)
  }
  // Convex LOX dome beneath the open hot-staging ring.
  booster.add(new THREE.SphereGeometry(1, 80, 32, 0, TAU, 0, Math.PI / 2).scale(4.43, 1.7, 4.43), p.steel, [0, 67.1, 0])
  lettering(booster, 'SUPER HEAVY', 0.085, 52, 4.51, p.black, false, -Math.PI * 0.2)
  const boosterGroup = booster.finish()
  const raptorLayout: V3[] = [
    ...Array.from({ length: 20 }, (_, i) => radial(3.78, 0.02, i * TAU / 20)),
    ...Array.from({ length: 10 }, (_, i) => radial(2.22, 0.02, (i + 0.5) * TAU / 10)),
    ...Array.from({ length: 3 }, (_, i) => radial(0.76, 0.02, i * TAU / 3)),
  ]
  boosterGroup.add(engineArray('raptor-booster', raptorLayout, engine('raptor', 0.54, 2.9, p)))
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2
    const hinge = new THREE.Group(); hinge.name = `grid-fin-hinge-${i + 1}`; hinge.position.set(...radial(4.55, 65.1, angle)); hinge.rotation.y = angle
    const fin = gridFin(`booster-grid-fin-${i + 1}`, 3.5, 3.8, p, 13)
    fin.rotation.x = Math.PI / 2; hinge.add(fin); boosterGroup.add(hinge)
  }
  model.add(boosterGroup)

  const hotstage = new Assembly('hotstage')
  for (const y of [69.05, 69.3, 71.75, 71.98]) hotstage.ring(p.steel, 4.48, y, 0.06)
  // Actual openings, not black stripes on a solid cylinder.
  for (let i = 0; i < 64; i++) {
    const phi = i * TAU / 64
    hotstage.box(p.steel, [0.13, 2.85, 0.18], radial(4.47, 70.5, phi), [0, phi, 0])
    if (i % 8 === 0) hotstage.rod(p.weld, radial(4.36, 69.16, phi), radial(4.36, 71.85, phi + TAU / 16), 0.055)
  }
  model.add(hotstage.finish())

  const ship = new Assembly('ship')
  for (let i = 0; i < 18; i++) {
    const low = i * 1.825
    ship.cylinder(panelMats[(i + 1) % 3], 4.5, low + 0.9125, 1.825, 0, 0, 4.5, 160, true)
    ship.ring(p.weld, 4.503, low + 0.04, 0.018)
  }
  const profile = Array.from({ length: 81 }, (_, i) => { const y = 32.85 + 19.15 * i / 80; return [shipRadius(y), y] })
  ship.lathe(p.steel, profile, 192)
  for (let y = 34.7; y < 50.5; y += 1.825) ship.ring(p.weld, shipRadius(y) + 0.007, y, 0.016)
  ship.cylinder(p.black, 4.3, 3.1, 0.12)
  for (let i = 0; i < 24; i++) {
    const phi = i * TAU / 24
    ship.rod(p.weld, radial(4.42, 0.25, phi), radial(4.42, 2.9, phi), 0.065)
  }
  // Leeward utility raceway and payload door.
  ship.box(p.steel, [0.32, 29, 0.26], [0, 17.5, -4.51])
  ship.box(p.weld, [2.5, 0.63, 0.06], [0, 30.1, -4.47])
  ship.box(p.black, [2.28, 0.42, 0.075], [0, 30.1, -4.49])
  lettering(ship, 'STARSHIP', 0.13, 25.3, 4.51, p.black, false, Math.PI)
  const shipGroup = ship.finish(); shipGroup.position.y = 72
  shipGroup.add(heatShield(p))
  shipGroup.add(engineArray('raptor-ship', Array.from({ length: 3 }, (_, i) => radial(1.15, 0.13, i * TAU / 3)), engine('raptor-sea-level', 0.54, 2.9, p)))
  shipGroup.add(engineArray('rvac-ship', Array.from({ length: 3 }, (_, i) => radial(2.8, 0.13, (i + 0.5) * TAU / 3)), engine('raptor-vacuum', 1.18, 2.9, p)))
  for (const side of [-1, 1]) for (const fore of [false, true]) {
    const flap = new Assembly(`${fore ? 'forward' : 'aft'}-flap-${side > 0 ? 'right' : 'left'}`)
    const points = fore ? [[0, 0], [1.8, 1.4], [2.1, 4.8], [0.2, 6.8]] : [[0, 0], [3.5, 0.9], [3.1, 5.2], [0.1, 10.2]]
    flap.plate(p.steel, points, 0.22)
    flap.plate(p.black, points.map(([x, y]) => [x * 0.97, y * 0.99]), 0.035, [0, 0, 0.15])
    // Tiled windward flap surface with a clipped hexagonal tessellation.
    const polygon = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
    const polygonPoints = polygon.getPoints()
    const inside = (x: number, y: number) => {
      let hit = false
      for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
        const a = polygonPoints[i], b = polygonPoints[j]
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) hit = !hit
      }
      return hit
    }
    for (let row = 0; row < (fore ? 29 : 43); row++) for (let col = 0; col < 14; col++) {
      const x = 0.13 + col * 0.277 + (row % 2) * 0.1385, y = 0.16 + row * 0.24
      const hex = Array.from({ length: 6 }, (_, k) => [x + Math.cos(Math.PI / 6 + k * TAU / 6) * 0.148, y + Math.sin(Math.PI / 6 + k * TAU / 6) * 0.148])
      if (hex.every(([xx, yy]) => inside(xx, yy))) flap.plate(flapTile, hex, 0.025, [0, 0, 0.19], [0, 0, 0], 0)
    }
    flap.rod(p.titanium, [0, 0.5, 0], [0, fore ? 6.3 : 9.7, 0], fore ? 0.16 : 0.21, 24)
    for (const y of fore ? [0.7, 3.5, 6] : [1, 4.5, 8.8]) flap.cylinder(p.steel, 0.25, y, 0.4, 0, 0, 0.25, 24)
    const group = flap.finish()
    group.position.set(side * (fore ? 2.9 : 4.35), fore ? 40 : 1.1, fore ? -0.65 : 0)
    group.scale.x = side
    group.rotation.y = side * 0.12
    shipGroup.add(group)
  }
  model.add(shipGroup)
  return model
}

export function buildSpacecraft(id: SpacecraftId) {
  const p = palette(), model = id === 'falcon-9' ? falcon9(p) : starship(p), spec = spacecraftSpec(id)
  model.name = id
  model.userData = { title: spec.name, configuration: spec.configuration, units: 'metres', heightMetres: spec.height, diameterMetres: spec.diameter, reference: spec.source, author: '3D Studio', note: 'Public-reference visualization; exterior details are approximations, not manufacturing CAD.' }
  return model
}
