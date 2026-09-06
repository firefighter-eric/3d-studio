import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { nvidiaProduct } from './products'
import type { NvidiaProductId } from './products'

type V = [number, number, number]
const Y = new T.Vector3(0, 1, 0)
const material = (name: string, color: string, metalness = .65, roughness = .38) => {
  const m = new T.MeshStandardMaterial({ color, metalness, roughness }); m.name = name; return m
}
function materials() {
  return {
    shell: material('graphite-anodized-aluminum', '#30343b', .72, .36),
    dark: material('dark-machined-metal', '#151b20', .48, .42),
    black: material('black-polymer', '#080e12', .1, .58),
    gold: material('champagne-brushed-metal', '#afa078', .82, .31),
    silver: material('stainless-steel', '#8c959b', .83, .29),
    pcb: material('solder-mask', '#143d32', .25, .57),
    copper: material('copper-traces', '#bda167', .85, .31),
    die: material('silicon-die', '#3b5158', .86, .2),
    hbm: material('memory-package', '#454b4d', .65, .33),
    blue: material('coolant-supply', '#344f6c', .3, .4),
    red: material('coolant-return', '#744234', .3, .4),
    green: Object.assign(material('status-green', '#86bd32', .25, .3), { emissive: new T.Color('#6bac16'), emissiveIntensity: .4 }),
  }
}
type Mats = ReturnType<typeof materials>
export const nvidiaLabels = new Map<string, { text: string; background: string; color: string; porous?: boolean }>()
function part(p: T.Object3D, geometry: T.BufferGeometry, m: T.Material, position: V = [0, 0, 0], rotation: V = [0, 0, 0]) {
  const mesh = new T.Mesh(geometry, m); mesh.position.set(...position); mesh.rotation.set(...rotation)
  mesh.castShadow = true; mesh.receiveShadow = true; p.add(mesh); return mesh
}
function group(p: T.Object3D, name: string, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const g = new T.Group(); g.name = name; g.position.set(...pos); g.rotation.set(...rot); p.add(g); return g
}
function box(p: T.Object3D, size: V, pos: V, m: T.Material, radius = 0) {
  return part(p, radius ? new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v * .45))) : new T.BoxGeometry(...size), m, pos)
}
function cylinder(p: T.Object3D, r: number, h: number, pos: V, m: T.Material, rot: V = [0, 0, 0], segments = 12) {
  return part(p, new T.CylinderGeometry(r, r, h, segments), m, pos, rot)
}
function beam(p: T.Object3D, a: V, b: V, width: number, depth: number, m: T.Material) {
  const va = new T.Vector3(...a), vb = new T.Vector3(...b), delta = vb.clone().sub(va)
  const mesh = box(p, [width, delta.length(), depth], va.add(vb).multiplyScalar(.5).toArray(), m)
  mesh.quaternion.setFromUnitVectors(Y, delta.normalize()); return mesh
}
function cable(p: T.Object3D, points: V[], r: number, m: T.Material) {
  return part(p, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v => new T.Vector3(...v))), 18, r, 6, false), m)
}
function screw(p: T.Object3D, pos: V, m: Mats, r = 2, rot: V = [0, 0, 0]) {
  const g = group(p, '', pos, rot)
  cylinder(g, r, .8, [0, 0, 0], m.silver, [Math.PI / 2, 0, 0], 8)
  box(g, [r * 1.1, r * .22, .2], [0, 0, .5], m.black)
}
function label(p: T.Object3D, text: string, size: [number, number], pos: V, background = '#181f24', color = '#d9decf', rot: V = [0, 0, 0]) {
  const name = `marking-${text}-${background}`
  const m = material(name, background, .22, .5)
  nvidiaLabels.set(name, { text, background, color })
  part(p, new T.PlaneGeometry(...size), m, pos, rot)
}
function porous(p: T.Object3D, size: [number, number], pos: V, m: Mats, rot: V = [0, 0, 0]) {
  const face = m.gold.clone(); face.name = 'porous-gold-metal'
  nvidiaLabels.set(face.name, { text: '', background: '#a5987a', color: '#2d2e27', porous: true })
  part(p, new T.PlaneGeometry(...size), face, pos, rot)
}
function vents(p: T.Object3D, width: number, height: number, pos: V, m: Mats, count = 16, rot: V = [0, 0, 0]) {
  const g = group(p, '', pos, rot)
  box(g, [width, height, 1], [0, 0, 0], m.black)
  for (let i = 0; i < count; i++) box(g, [width - 3, height / count * .32, 1.3], [0, -height / 2 + (i + .5) * height / count, .6], m.shell)
}
function port(p: T.Object3D, width: number, height: number, pos: V, m: Mats, rot: V = [0, 0, 0], contact = false) {
  const g = group(p, '', pos, rot)
  box(g, [width, height, 2], [0, 0, 0], m.silver, .5)
  box(g, [width - 2, height - 2, 1], [0, 0, 1.2], m.black, .4)
  if (contact) for (let i = 0; i < 4; i++) box(g, [1, 1, .4], [-width / 4 + i * width / 6, -height / 4, 1.8], m.copper)
}
function fan(p: T.Object3D, radius: number, pos: V, m: Mats, rot: V = [0, 0, 0]) {
  const g = group(p, '', pos, rot)
  box(g, [radius * 2.14, radius * 2.14, 7], [0, 0, -4], m.dark, 3)
  cylinder(g, radius, 1, [0, 0, 0], m.black, [Math.PI / 2, 0, 0], 32)
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7
    const blade = box(g, [radius * .74, radius * .3, 2], [Math.sin(a) * radius * .48, Math.cos(a) * radius * .48, 1], m.shell, 2)
    blade.rotation.z = -a + .6
  }
  cylinder(g, radius * .2, 3, [0, 0, 2], m.dark, [Math.PI / 2, 0, 0], 20)
  for (const ratio of [.4, .65, .88]) part(g, new T.TorusGeometry(radius * ratio, .7, 5, 32), m.silver, [0, 0, 4])
  for (const a of [0, Math.PI / 2]) { const rib = box(g, [1, radius * 1.95, 1], [0, 0, 4], m.silver); rib.rotation.z = a }
}

function rack(id: NvidiaProductId, m: Mats) {
  const root = new T.Group(), ultra = id === 'nvidia-gb300-nvl72'
  const frame = group(root, 'rack-frame')
  box(frame, [600, 48, 1100], [0, 24, 0], m.dark, 4)
  box(frame, [600, 42, 1100], [0, 2219, 0], m.shell, 3)
  for (const x of [-281, 281]) for (const z of [-530, 530]) box(frame, [38, 2160, 38], [x, 1128, z], m.shell, 2)
  for (const x of [-297, 297]) {
    box(frame, [6, 2080, 1005], [x, 1110, 0], m.dark)
    for (const z of [-480, 480]) box(frame, [8, 2080, 7], [x * .997, 1110, z], m.shell)
    for (const y of [300, 1950]) {
      const g = group(frame, '', [x * 1.008, y, 0], [0, Math.sign(x) * Math.PI / 2, 0])
      vents(g, 420, 90, [0, 0, 0], m, 18)
    }
  }
  const compute = group(root, 'compute-trays-18')
  const switches = group(root, 'nvlink-switch-trays-9')
  // 18 compute trays surround the central 9-tray NVLink switch bank.
  for (let i = 0; i < 27; i++) {
    const isSwitch = i >= 9 && i < 18, y = 230 + i * 53
    const p = isSwitch ? switches : compute
    box(p, [508, 49, 960], [0, y, 20], m.dark)
    box(p, [510, 43, 14], [0, y, 508], isSwitch ? m.shell : m.gold, 5)
    for (const x of [-234, 234]) {
      box(p, [15, 27, 19], [x, y, 524], m.black, 3)
      box(p, [5, 21, 5], [x, y, 536], isSwitch ? m.silver : m.gold, 1)
    }
    const ports = isSwitch ? 12 : ultra ? 8 : 6
    for (let j = 0; j < ports; j++) {
      const x = (j - (ports - 1) / 2) * (isSwitch ? 31 : 45)
      port(p, 22, 10, [x, y + 3, 517], m)
      box(p, [3, 2, 1], [x - 8, y + 11, 519], m.green)
      if (isSwitch && j % 2 === 0) cable(p, [[x, y + 3, 521], [x + 10, y - 1, 565], [235, y - 12, 555]], 2, m.black)
    }
    vents(p, isSwitch ? 350 : 300, 7, [0, y - 13, 517], m, 2)
    for (const x of [-258, 258]) screw(p, [x, y, 519], m, 2.5)
    // Rear quick disconnects, compute exhaust, and liquid branches.
    for (const x of [-218, 218]) {
      cylinder(p, 7, 15, [x, y, -477], m.silver, [Math.PI / 2, 0, 0])
      cable(p, [[x, y, -487], [x * 1.1, y, -530], [x > 0 ? 245 : -245, y + 14, -530]], 4, x > 0 ? m.red : m.blue)
    }
    vents(p, 360, 28, [0, y, -465], m, 6, [0, Math.PI, 0])
  }
  const power = group(root, 'power-shelves')
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 1810 + shelf * 105
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 80
      box(power, [77, 96, 600], [x, y, 195], m.black, 2)
      vents(power, 68, 64, [x, y + 8, 497], m, 10)
      box(power, [43, 10, 13], [x, y - 30, 506], m.shell, 2)
      box(power, [4, 4, 2], [x + 29, y - 31, 502], m.green)
    }
  }
  for (const y of [1720, 2125]) {
    box(power, [506, 47, 45], [0, y, 495], m.gold, 10)
    vents(power, 380, 21, [0, y, 519], m, 5)
    for (let i = 0; i < 6; i++) cable(power, [[-160 + i * 50, y, 523], [-190 + i * 40, y + 21, 562], [230, y - 11, 550]], 3, m.black)
  }
  const plumbing = group(root, 'rear-cooling-manifolds')
  for (const x of [-245, 245]) {
    cylinder(plumbing, 12, 2040, [x, 1090, -529], x < 0 ? m.blue : m.red)
    for (const y of [115, 2150]) {
      cylinder(plumbing, 18, 25, [x, y, -529], m.silver)
      cylinder(plumbing, 11, 29, [x, y, -545], m.silver, [Math.PI / 2, 0, 0])
    }
  }
  for (let i = 0; i < 8; i++) cable(plumbing, [[-160 + i * 43, 160, -485], [-155 + i * 43, 1000, -500], [-155 + i * 43, 2140, -494]], 5, m.black)
  label(root, 'NVIDIA', [145, 30], [-142, 2188, 551], '#30343b')
  label(root, ultra ? 'GB300 NVL72' : 'GB200 NVL72', [172, 27], [127, 2188, 551], '#30343b', '#b9cf90')
  return root
}

function gpu(m: Mats) {
  const root = new T.Group()
  box(root, [140, 2.5, 150], [0, 5, 0], m.pcb, 2)
  const core = group(root, 'blackwell-ultra-package')
  box(core, [86, 2, 90], [0, 7.2, 3], m.black, 1)
  box(core, [64, 1.2, 65], [0, 9, 3], m.copper, 1)
  for (const x of [-13.2, 13.2]) {
    box(core, [25, 1.5, 39], [x, 10.7, 3], m.die, .4)
    for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) box(core, [3.1, .14, 3.1], [x - 9 + c * 3.6, 11.52, -11 + r * 4], (r + c) % 3 ? m.hbm : m.copper)
  }
  for (const x of [-33, 33]) for (let i = 0; i < 4; i++) {
    box(core, [10, 2.4, 14], [x, 10.4, -27 + i * 20], m.hbm, .4)
    for (let layer = 0; layer < 3; layer++) box(core, [10.2, .25, 14.2], [x, 9.8 + layer * .65, -27 + i * 20], m.silver)
  }
  for (const x of [-48, 48]) box(root, [5, 5, 108], [x, 10, 0], m.silver, .8)
  for (const z of [-52, 52]) box(root, [100, 5, 5], [0, 10, z], m.silver, .8)
  for (const x of [-48, 48]) for (const z of [-52, 52]) screw(root, [x, 13, z], m, 3, [-Math.PI / 2, 0, 0])
  const components = group(root, 'power-delivery-and-passives')
  for (const side of [-1, 1]) for (let i = 0; i < 14; i++) {
    const z = -58 + i * 9
    box(components, [8, 3, 6], [side * 60, 8, z], m.dark, .4)
    for (const dx of [-4, 4]) box(components, [1, 1, 5], [side * 60 + dx, 7, z], m.silver)
  }
  for (const side of [-1, 1]) for (let i = 0; i < 22; i++) {
    const x = -52 + i * 5
    box(components, [2.6, 1.5, 3], [x, 7, side * 63], i % 4 ? m.hbm : m.copper)
    box(components, [1, .1, 8], [x, 6.3, side * 68], m.copper)
  }
  for (const x of [-58, 58]) for (const z of [-68, 68]) cylinder(root, 3, 3, [x, 4, z], m.copper)
  for (const x of [-40, 0, 40]) box(root, [30, 4, 117], [x, 2, 0], m.black)
  label(root, 'NVIDIA  B300', [50, 6], [0, 6.4, -61], '#143d32', '#c5c8b5', [-Math.PI / 2, 0, 0])
  return root
}

function server(m: Mats) {
  const root = new T.Group()
  box(root, [473, 437, 874], [0, 220.5, -4], m.shell, 2)
  box(root, [482.6, 442, 8], [0, 221, 441], m.dark)
  const bezel = group(root, 'gold-front-bezel')
  box(bezel, [446, 322, 16], [0, 274, 444.1], m.gold, 3)
  porous(bezel, [435, 310], [0, 274, 452.15], m)
  label(bezel, 'NVIDIA', [110, 22], [-143, 143, 452.2], '#a5987a', '#eee6d2')
  const io = group(root, 'front-io-and-removable-trays')
  for (let i = 0; i < 8; i++) port(io, 27, 13, [(i - 3.5) * 47, 97, 447], m, [0, 0, 0], true)
  for (const y of [27, 63]) {
    vents(io, 421, 24, [0, y, 446], m, 6)
    for (const x of [-216, 216]) box(io, [8, 23, 5], [x, y, 449], m.silver, 1)
  }
  for (const x of [-236, 236]) for (const y of [20, 116, 324, 424]) screw(root, [x, y, 447], m, 3)
  // Sheet-metal seams, service panels, embossing and fasteners on both sides.
  for (const side of [-1, 1]) {
    const g = group(root, 'side-service-panels', [side * 237, 220, -8], [0, side * Math.PI / 2, 0])
    for (let i = 0; i < 4; i++) {
      box(g, [167, 247, 1.4], [-310 + i * 207, -15, 0], m.dark, 5)
      box(g, [163, 243, 1.6], [-310 + i * 207, -15, 1], m.shell, 4)
      for (const y of [-155, 155]) screw(g, [-310 + i * 207, y, 2], m, 2.5)
    }
    for (const y of [-190, 120, 192]) box(g, [840, 1, 1], [0, y, 1], m.dark)
  }
  for (let i = 0; i < 5; i++) box(root, [420, 1, 3], [0, 439.3, -330 + i * 151], m.silver)
  const rear = group(root, 'rear-fans-and-power', [0, 0, -452.1], [0, Math.PI, 0])
  box(rear, [470, 437, 4], [0, 220, -3], m.dark)
  for (const y of [191, 334]) for (const x of [-146, 0, 146]) fan(rear, 60, [x, y, 0], m)
  for (let i = 0; i < 12; i++) port(rear, 29, 24, [(i % 6 - 2.5) * 71, i < 6 ? 35 : 86, 0], m)
  label(rear, 'DGX B300', [86, 15], [0, 428, 1])
  return root
}

function spark(m: Mats) {
  const root = new T.Group()
  box(root, [143, 3.5, 143], [0, 1.75, 0], m.black, 5)
  box(root, [150, 46, 150], [0, 27.5, 0], m.gold, 4)
  // A thin lid seam runs around the aluminum enclosure.
  box(root, [149.4, .6, 149.4], [0, 46.6, 0], m.dark, 3.6)
  box(root, [150, 3.6, 150], [0, 48.7, 0], m.gold, 2)
  porous(root, [143, 39], [0, 26.5, 75.01], m)
  for (const x of [-60, 60]) {
    box(root, [17, 39, 1.5], [x, 26, 74.9], m.black, 5)
    box(root, [4, 29, 2], [x + Math.sign(x) * 3.8, 26, 75.4], m.gold, 1.5)
  }
  label(root, 'NVIDIA', [24, 5.5], [-61, 25, 75.8], '#080e12', '#d4d0b6', [0, 0, Math.PI / 2])
  const rear = group(root, 'rear-connectivity', [0, 0, -75.05], [0, Math.PI, 0])
  box(rear, [140, 38, 1], [0, 25, 0], m.dark, 4)
  for (const x of [-54, -37, -20, -3]) port(rear, 9, 4, [x, 19, .5], m)
  port(rear, 15, 7, [-47, 35, .5], m)
  port(rear, 14, 12, [15, 21, .5], m, [0, 0, 0], true)
  for (const x of [37, 58]) port(rear, 17, 10, [x, 24, .5], m, [0, 0, 0], true)
  cylinder(rear, 3.3, 1.2, [-65, 35, .5], m.silver, [Math.PI / 2, 0, 0])
  box(rear, [1, 2, 1], [-65, 35, 1.3], m.green)
  vents(rear, 89, 4, [13, 39, .5], m, 2)
  return root
}

function station(m: Mats) {
  const root = new T.Group()
  box(root, [164, 12, 388], [0, 6, 0], m.black, 5)
  box(root, [180, 437, 430], [0, 231.5, 0], m.shell, 10)
  box(root, [172, 425, 5], [0, 231, 213], m.dark, 12)
  for (const y of [132, 330]) {
    box(root, [158, 184, 4], [0, y, 216], m.black, 20)
    vents(root, 138, 158, [0, y, 218.1], m, 58)
  }
  const face = group(root, 'crossed-front-fascia')
  // Broad triangular metal cheeks form the characteristic X around the vents.
  for (const side of [-1, 1]) {
    const shape = new T.Shape()
    shape.moveTo(side * 84, 346); shape.lineTo(side * 5, 232); shape.quadraticCurveTo(0, 228, side * 5, 221); shape.lineTo(side * 84, 110); shape.closePath()
    part(face, new T.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1, bevelSegments: 2, steps: 1 }), m.shell, [0, 0, 219])
  }
  label(root, 'NVIDIA', [44, 9], [-65, 154, 223.5], '#30343b', '#c4b998', [0, 0, Math.PI / 2])
  label(root, 'DGX STATION', [71, 8], [0, 433, 216.5], '#151b20', '#a5aca9')
  for (const x of [-29, -10, 10, 29]) port(root, x < 0 ? 12 : 8, x < 0 ? 6 : 4, [x, 29, 217], m)
  cylinder(root, 4.5, 1, [61, 30, 218], m.black, [Math.PI / 2, 0, 0]); box(root, [1, 3, .4], [61, 30, 219], m.green)
  for (const side of [-1, 1]) {
    const g = group(root, 'side-panel', [side * 90, 225, -2], [0, side * Math.PI / 2, 0])
    box(g, [386, 382, .6], [0, 0, 0], m.dark, 8)
    box(g, [380, 376, .7], [0, 0, .7], m.shell, 8)
    vents(g, 90, 214, [-130, 1, 1.3], m, 46)
    for (const x of [-181, 181]) for (const y of [-182, 182]) screw(g, [x, y, 1.4], m)
  }
  const rear = group(root, 'rear-connectivity-and-exhaust', [0, 0, -215.2], [0, Math.PI, 0])
  box(rear, [157, 410, 1], [0, 230, 0], m.dark, 3)
  for (const y of [245, 368]) fan(rear, 50, [0, y, 1], m)
  for (let i = 0; i < 4; i++) port(rear, 11, 7, [-58, 242 + i * 20, 1], m)
  for (const x of [-36, 0, 36]) port(rear, 21, 12, [x, 166, 1], m, [0, 0, 0], true)
  for (let i = 0; i < 4; i++) vents(rear, 117, 10, [0, 100 + i * 14, 1], m, 2)
  port(rear, 29, 22, [-46, 52, 1], m); vents(rear, 69, 44, [27, 52, 1], m, 9)
  return root
}

// Collapse static detail geometry by material. Named assemblies remain in the
// GLB for inspection, while thousands of screws/vents never become draw calls.
function batchStatic(p: T.Object3D) {
  for (const child of [...p.children]) if (!(child instanceof T.Mesh)) batchStatic(child)
  const batches = new Map<T.Material, T.BufferGeometry[]>()
  for (const child of [...p.children]) {
    if (!(child instanceof T.Mesh) || Array.isArray(child.material)) continue
    child.updateMatrix()
    const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()
    geometry.applyMatrix4(child.matrix)
    const list = batches.get(child.material) || []; list.push(geometry); batches.set(child.material, list)
    child.geometry.dispose(); p.remove(child)
  }
  for (const [m, geometries] of batches) {
    const merged = mergeGeometries(geometries)
    if (!merged) throw new Error(`Cannot batch ${m.name}`)
    const mesh = part(p, merged, m); mesh.name = m.name
    for (const g of geometries) g.dispose()
  }
  // Unnamed helper groups can be collapsed without losing useful hierarchy.
  for (const child of [...p.children]) if (!(child instanceof T.Mesh) && !child.name) {
    child.updateMatrix()
    for (const mesh of [...child.children]) { mesh.applyMatrix4(child.matrix); p.add(mesh) }
    p.remove(child)
  }
  if (p.children.filter(child => child instanceof T.Mesh).length > batches.size) {
    // Rebatch once after removing transformed helper groups.
    const holder = new T.Group()
    for (const child of [...p.children]) if (child instanceof T.Mesh) holder.add(child)
    batchStatic(holder)
    for (const child of [...holder.children]) p.add(child)
  }
}

export function buildNvidiaModel(id: NvidiaProductId) {
  const m = materials()
  const model = id.endsWith('nvl72') ? rack(id, m) : id === 'nvidia-dgx-b300' ? server(m) : id === 'nvidia-b300-sxm' ? gpu(m) : id === 'nvidia-dgx-spark' ? spark(m) : station(m)
  model.name = id
  batchStatic(model)
  model.scale.setScalar(.001)
  model.updateMatrixWorld(true)
  // Download contract: metres, Y up, front +Z, centered X/Z, floor at Y=0.
  const bounds = new T.Box3().setFromObject(model), center = bounds.getCenter(new T.Vector3())
  model.position.set(-center.x, -bounds.min.y, -center.z)
  model.userData = { product: nvidiaProduct(id).name, provenance: '3D Studio exterior reconstruction', engineeringAccuracy: false }
  return model
}
