import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { nvidiaProduct } from './products'
import type { GeForceProductId } from './products'

type V = [number, number, number]
type XY = [number, number]
type Labels = Map<string, { text: string; background: string; color: string; porous?: boolean }>
const TAU = Math.PI * 2
const mat = (name: string, color: string, metalness = .7, roughness = .36) => Object.assign(new T.MeshStandardMaterial({ color, metalness, roughness }), { name })
function materials(id: GeForceProductId) {
  return {
    frame: mat('geforce-machined-frame', id.endsWith('3090') ? '#a29c8c' : id.endsWith('4090') ? '#848482' : id.endsWith('5090') ? '#626568' : '#b9bfc4', .8, .29),
    edge: mat('geforce-cut-aluminum', '#bfc6cb', .86, .27),
    dark: mat('geforce-anodized-backplate', '#262c31', .65, .4),
    fin: mat('geforce-heatsink-fins', id.includes('1080') || id.includes('2080') ? '#6a757e' : '#454b50', .8, .39),
    blade: mat('geforce-fan-polymer', '#20262b', .25, .43),
    black: mat('geforce-connectors', '#0a0f14', .12, .57),
    pcb: mat('geforce-pcb', '#19282b', .25, .57),
    gold: mat('geforce-gold-contacts', '#bfa05b', .85, .3),
  }
}
type Mats = ReturnType<typeof materials>
function mesh(p: T.Object3D, geometry: T.BufferGeometry, material: T.Material, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const o = new T.Mesh(geometry, material); o.position.set(...pos); o.rotation.set(...rot); o.castShadow = true; o.receiveShadow = true; p.add(o); return o
}
function group(p: T.Object3D, name: string, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const g = new T.Group(); g.name = name; g.position.set(...pos); g.rotation.set(...rot); p.add(g); return g
}
function box(p: T.Object3D, size: V, pos: V, m: T.Material, radius = 0) {
  return mesh(p, radius ? new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v * .45))) : new T.BoxGeometry(...size), m, pos)
}
function disc(p: T.Object3D, radius: number, depth: number, pos: V, m: T.Material, segments = 64) {
  return mesh(p, new T.CylinderGeometry(radius, radius, depth, segments), m, pos, [Math.PI / 2, 0, 0])
}
function polygon(points: XY[]) { const s = new T.Shape(); s.moveTo(...points[0]); for (const point of points.slice(1)) s.lineTo(...point); s.closePath(); return s }
function rounded(w: number, h: number, r: number) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); s.closePath(); return s
}
function circleHole(s: T.Shape, x: number, y: number, radius: number) { const h = new T.Path(); h.absarc(x, y, radius, 0, TAU, true); s.holes.push(h) }
function rectHole(s: T.Shape, x: number, y: number, w: number, h: number) { s.holes.push(polygon([[x - w / 2, y - h / 2], [x - w / 2, y + h / 2], [x + w / 2, y + h / 2], [x + w / 2, y - h / 2]])) }
function plate(p: T.Object3D, s: T.Shape, depth: number, pos: V, m: T.Material, bevel = .45) {
  return mesh(p, new T.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 20 }), m, pos)
}
function ring(p: T.Object3D, r: number, width: number, depth: number, pos: V, m: T.Material) {
  const s = new T.Shape(); s.absarc(0, 0, r + width, 0, TAU, false); circleHole(s, 0, 0, r); plate(p, s, depth, pos, m, .25)
}
function screw(p: T.Object3D, pos: V, m: Mats) {
  disc(p, 1.5, .7, pos, m.edge, 10)
  for (const angle of [0, Math.PI / 2]) box(p, [1.7, .32, .16], [pos[0], pos[1], pos[2] + .45], m.black).rotation.z = angle
}
function label(p: T.Object3D, labels: Labels, text: string, size: [number, number], pos: V, background: string, color = '#dbe0df', rot: V = [0, 0, 0]) {
  const name = `geforce-marking-${text}-${background}`, m = mat(name, background === 'transparent' ? '#ffffff' : background, .75, .32)
  if (background === 'transparent') { m.transparent = true; m.depthWrite = false }
  labels.set(name, { text, background, color }); mesh(p, new T.PlaneGeometry(...size), m, pos, rot)
}

// An actual swept blade section, with depth and a rounded leading edge. These
// are independent static rotors; airflow and internal electronics are illustrative.
function axialFan(root: T.Object3D, name: string, x: number, z: number, r: number, blades: number, m: Mats, rear = false) {
  const p = group(root, name, [x, 0, z], [0, rear ? Math.PI : 0, 0])
  ring(p, r, 1.7, 2, [0, 0, -3], m.dark)
  const blade = new T.Shape()
  blade.moveTo(r * .24, -r * .1)
  blade.bezierCurveTo(r * .53, -r * .24, r * .86, -r * .01, r * .93, r * .27)
  blade.quadraticCurveTo(r * .92, r * .37, r * .78, r * .4)
  blade.bezierCurveTo(r * .66, r * .18, r * .42, r * .19, r * .24, r * .14)
  blade.closePath()
  const geo = new T.ExtrudeGeometry(blade, { depth: 1.8, bevelEnabled: true, bevelSize: .45, bevelThickness: .45, bevelSegments: 2, steps: 1, curveSegments: 10 })
  const positions = geo.getAttribute('position')
  for (let i = 0; i < positions.count; i++) positions.setZ(i, positions.getZ(i) + positions.getY(i) / r * 11 - (positions.getX(i) / r - .45) * 2 - 2)
  geo.computeVertexNormals()
  for (let i = 0; i < blades; i++) mesh(p, geo.clone(), m.blade, [0, 0, -1], [0, 0, i * TAU / blades])
  geo.dispose()
  disc(p, r * .265, 4, [0, 0, 1], m.black)
  disc(p, r * .23, .7, [0, 0, 3.2], m.dark)
  mesh(p, new T.TorusGeometry(r * .23, .32, 6, 48), m.fin, [0, 0, 3.6])
  p.userData = { kind: 'axial-fan', blades, face: rear ? 'rear' : 'front' }
}
function blower(root: T.Object3D, x: number, z: number, m: Mats) {
  const p = group(root, 'blower-rotor', [x, 0, z])
  disc(p, 34, 1.5, [0, 0, -6], m.black)
  for (let i = 0; i < 48; i++) {
    const a = i * TAU / 48
    box(p, [8.7, .9, 7], [Math.cos(a) * 28.9, Math.sin(a) * 28.9, -2.2], m.blade, .3).rotation.z = a + .28
  }
  disc(p, 23.4, 4, [0, 0, .5], m.dark)
  disc(p, 21.6, .6, [0, 0, 2.7], m.black)
  ring(p, 34.7, 2.2, 2, [0, 0, -1], m.edge)
  p.userData = { kind: 'radial-blower', blades: 48, face: 'front' }
}
function fins(p: T.Object3D, x: number, width: number, height: number, depth: number, z: number, m: Mats, pitch = 2.25) {
  const n = Math.floor(width / pitch)
  for (let i = 0; i < n; i++) box(p, [.48, height, depth], [x - width / 2 + (i + .5) * width / n, 0, z], m.fin)
}

function connectors(root: T.Object3D, id: GeForceProductId, l: number, h: number, d: number, m: Mats) {
  const modern = !id.includes('1080') && !id.includes('2080'), blackwell = id.endsWith('5090')
  const pcb = group(root, 'pcb-and-pcie-contacts')
  const pcbWidth = blackwell ? 84 : modern ? l * .62 : l - 9, pcbX = blackwell ? 0 : modern ? -l * .17 : 0
  box(pcb, [pcbWidth, h - 15, 1.6], [pcbX, -1, -d / 2 + 4], m.pcb, 1)
  // The short Blackwell board connects to its PCIe edge through a narrow spine.
  box(pcb, [l - 27, 7, 1.6], [0, -h / 2 + 7, -d / 2 + 4], m.pcb)
  for (const [start, length] of [[-l / 2 + 26, 17], [-l / 2 + 47, 66]]) {
    box(pcb, [length, 9, 1.6], [start + length / 2, -h / 2 - 1, -d / 2 + 4], m.pcb)
    for (let i = 0; i < Math.floor(length / 1.8); i++) for (const face of [-1, 1]) box(pcb, [1.2, 6.8, .12], [start + 1.5 + i * 1.8, -h / 2 - 1.7, -d / 2 + 4 + face * .88], m.gold)
  }
  for (let i = 0; i < 12; i++) box(pcb, [3.3, 2.1, .8], [pcbX - pcbWidth / 2 + 9 + i * (pcbWidth - 18) / 12, -h / 2 + 13, -d / 2 + 5.3], m.black)
  if (id.includes('1080') || id.includes('2080') || id.endsWith('3090')) {
    const x = -l / 2 + 30
    box(pcb, [24, 5, 1.7], [x, h / 2 - 3, -d / 2 + 4], m.pcb)
    for (let i = 0; i < 14; i++) box(pcb, [1, 4, .14], [x - 10.5 + i * 1.6, h / 2 - 2, -d / 2 + 5], m.gold)
  }
  const io = group(root, 'io-bracket-and-display-ports', [-l / 2 - 2, 0, 0], [0, -Math.PI / 2, 0])
  const plateShape = rounded(d - 2, h + 5, 2), portX = -d / 2 + 11
  for (let i = 0; i < 4; i++) rectHole(plateShape, portX, -36 + i * 22, 15, 6)
  for (let y = -40; y <= 44; y += 7) for (let x = 4; x < d / 2 - 5; x += 6) rectHole(plateShape, x, y, 3, 4)
  if (id.includes('2080')) rectHole(plateShape, portX, 47, 8, 3)
  plate(io, plateShape, 1.1, [0, 0, 0], m.edge, .1)
  for (let i = 0; i < 4; i++) {
    const y = -36 + i * 22
    box(io, [16.4, 7.2, 4], [portX, y, -1.4], m.fin, .65)
    box(io, [14.1, 5.1, .5], [portX, y, 1], m.black, .5)
    for (let j = 0; j < 7; j++) box(io, [.65, .35, .2], [portX - 4.5 + j * 1.5, y - 1.5, 1.3], m.gold)
  }
  if (id.includes('2080')) {
    box(io, [9, 4, 2], [portX, 47, -.2], m.fin, 1.6)
    box(io, [7.5, 2.4, .5], [portX, 47, 1.2], m.black, 1)
  }
  box(io, [d - 2, 1.2, 8], [0, h / 2 + 3, -3], m.edge)
  for (const x of [-d / 2 + 7, d / 2 - 7]) box(io, [5, 7, 1.1], [x, -h / 2 - 5, .5], m.edge)

  const power = group(root, 'power-connectors', [modern ? 8 : l / 2 - 27, h / 2 - 2.5, -d / 2 + 10], [-Math.PI / 2, 0, blackwell ? -.18 : 0])
  const ports = modern ? [{ x: 0, pins: 12, sense: !id.endsWith('3090') }] : [{ x: -10, pins: id.includes('1080') ? 6 : 8, sense: false }, { x: 11, pins: 8, sense: false }]
  for (const { x, pins, sense } of ports) {
    const columns = pins / 2, width = columns * 3 + 3
    box(power, [width, 9, 7], [x, 0, -2], m.black, 1)
    for (let row = 0; row < 2; row++) for (let col = 0; col < columns; col++) {
      const cx = x + (col - (columns - 1) / 2) * 3, cy = (row - .5) * 3
      box(power, [2.2, 2.2, .6], [cx, cy, 1.7], m.fin, .25)
      box(power, [1.45, 1.45, .3], [cx, cy, 2.1], m.black)
    }
    if (sense) for (let i = 0; i < 4; i++) box(power, [.8, 1, .5], [x - 3 + i * 2, 3.5, 1.8], m.gold)
    box(power, [5, 1.8, 2], [x, -5, -.5], m.dark)
  }
}

function backplate(root: T.Object3D, l: number, h: number, d: number, m: Mats, labels: Labels, name: string, short = false) {
  const p = group(root, 'machined-backplate', [short ? -l * .21 : 0, 0, -d / 2], [0, Math.PI, 0])
  const w = short ? l * .53 : l - 7
  plate(p, rounded(w, h - 7, 6), 1.4, [0, 0, 0], m.dark)
  for (let i = 0; i < 17; i++) box(p, [w - 17, .7, .6], [0, (i - 8) * 5.6, 1.9], m.fin)
  label(p, labels, name, [Math.min(w - 28, 97), 17], [0, 0, 2.4], '#262c31')
  for (const x of [-w / 2 + 7, w / 2 - 7]) for (const y of [-h / 2 + 11, h / 2 - 11]) screw(p, [x, y, 2], m)
}

function pascal(root: T.Object3D, l: number, h: number, d: number, m: Mats, labels: Labels) {
  const p = group(root, 'faceted-blower-shroud'), z = d / 2 - 5
  const outer = polygon([[-l / 2 + 2, -h / 2 + 9], [-l / 2 + 13, -h / 2 + 2], [l / 2 - 14, -h / 2 + 2], [l / 2 - 2, -h / 2 + 17], [l / 2 - 2, h / 2 - 16], [l / 2 - 16, h / 2 - 2], [-l / 2 + 16, h / 2 - 2], [-l / 2 + 2, h / 2 - 14]])
  circleHole(outer, 80, 0, 37.4)
  outer.holes.push(polygon([[-99, -32], [-88, -41], [15, -41], [25, -28], [25, 29], [12, 41], [-88, 41], [-99, 29]]))
  plate(p, outer, 5, [0, 0, z], m.frame, .6)
  for (const side of [-1, 1]) {
    plate(p, polygon([[-96, side * 42], [18, side * 42], [32, side * 52], [-109, side * 52]]), 1.5, [0, 0, z + 4.7], m.edge, .2)
    plate(p, polygon([[37, side * 13], [46, side * 42], [124, side * 39], [114, side * 52], [29, side * 52]]), 1.1, [0, 0, z + 4.8], m.frame, .2)
    box(p, [l - 12, 5, d - 8], [0, side * (h / 2 - 5), -2], m.dark, 1)
  }
  const sink = group(root, 'vapor-chamber-and-window-fins')
  box(sink, [113, 76, 2], [-38, 0, -d / 2 + 8], m.dark)
  fins(sink, -38, 111, 74, d - 19, -1, m, 2)
  const glass = Object.assign(mat('geforce-heatsink-window', '#7a9cab', .2, .18), { transparent: true, opacity: .15, depthWrite: false })
  mesh(p, new T.PlaneGeometry(99, 65), glass, [-39, 0, z + 3])
  blower(root, 80, z + 2, m)
  label(p, labels, 'GTX 1080 Ti', [72, 11], [-115, 0, z + 5.8], 'transparent', '#23292d', [0, 0, Math.PI / 2])
  label(p, labels, 'GEFORCE GTX', [90, 14], [-27, h / 2 - 2.1, 0], '#262c31', '#8dcc45', [-Math.PI / 2, 0, 0])
  for (const x of [-105, 31, 123]) for (const y of [-44, 44]) screw(p, [x, y, z + 5.8], m)
  backplate(root, l, h, d, m, labels, 'GTX 1080 Ti')
}

function turing(root: T.Object3D, l: number, h: number, d: number, m: Mats, labels: Labels) {
  const p = group(root, 'dual-fan-aluminum-shroud'), z = d / 2 - 4
  const face = rounded(l - 5, h - 7, 19)
  for (const x of [-76, 76]) circleHole(face, x, 0, 45.5)
  plate(p, face, 3, [0, 0, z], m.frame, .7)
  const inset = rounded(l - 18, h - 21, 28)
  for (const x of [-76, 76]) circleHole(inset, x, 0, 46.8)
  plate(p, inset, .7, [0, 0, z + 3.6], m.dark, .2)
  for (const side of [-1, 1]) box(p, [l - 26, 6, d - 4], [0, side * (h / 2 - 6), 0], m.frame, 2)
  for (const x of [-76, 76]) ring(p, 44.7, 2, 1.3, [x, 0, z + 3.8], m.edge)
  const sink = group(root, 'full-length-heatsink')
  fins(sink, 0, l - 19, h - 23, d - 18, -2, m, 2.3)
  axialFan(root, 'left-front-fan', -76, z + 3, 44, 13, m)
  axialFan(root, 'right-front-fan', 76, z + 3, 44, 13, m)
  label(p, labels, 'RTX 2080 Ti', [44, 9], [0, 0, z + 4.6], '#262c31')
  label(p, labels, 'GEFORCE RTX', [91, 13], [-10, h / 2 - 2.8, 0], '#262c31', '#8dcc45', [-Math.PI / 2, 0, 0])
  for (const x of [-l / 2 + 15, l / 2 - 15]) for (const y of [-h / 2 + 17, h / 2 - 17]) screw(p, [x, y, z + 3.8], m)
  backplate(root, l, h, d, m, labels, 'RTX 2080 Ti')
}

function flowThrough(root: T.Object3D, id: GeForceProductId, l: number, h: number, d: number, m: Mats, labels: Labels) {
  const blackwell = id.endsWith('5090'), ada = id.endsWith('4090')
  const p = group(root, 'flow-through-metal-frame'), r = blackwell ? 56 : ada ? 55 : 52, x = blackwell ? 84 : 85, z = d / 2 - 3
  // Open peripheral frame: the gaps between the fins remain real geometry on
  // both sides. A compact central hourglass connects the two cooling sections.
  const frame = rounded(l - 4, h - 6, blackwell ? 15 : ada ? 17 : 11)
  frame.holes.push(rounded(l - 19, h - 21, blackwell ? 12 : 14))
  plate(p, frame, d - 5, [0, 0, -d / 2 + 2], m.frame, .6)
  const waist: XY[] = [[-56, -h / 2 + 4], [56, -h / 2 + 4], [8, 0], [56, h / 2 - 4], [-56, h / 2 - 4], [-8, 0]]
  for (const side of [-1, 1]) {
    plate(p, polygon(waist), 3, [0, 0, side > 0 ? z : -d / 2], m.frame, 1)
    // Recessed dark triangles leave a narrow machined hourglass edge, rather
    // than covering the fans with crossing bars.
    for (const end of [-1, 1]) {
      const inset = polygon([[-46, end * (h / 2 - 6)], [46, end * (h / 2 - 6)], [0, end * 7]])
      plate(p, inset, .7, [0, 0, side > 0 ? z + 3.8 : -d / 2 - 1.7], m.dark, 1.2)
    }
  }
  const sink = group(root, 'flow-through-heatsink-fins')
  for (const side of [-1, 1]) {
    // Fans sit in front of recessed fin banks; no solid board blocks the two
    // end sections on the 5090. The 3090/4090 have a short left-side PCB.
    fins(sink, side * x, 115, h - 25, blackwell ? d - 19 : d - 18, 0, m, blackwell ? 2 : 2.15)
    for (const y of [-h / 2 + 14, h / 2 - 14]) box(sink, [117, 3, d - 9], [side * x, y, 0], m.dark, 1)
  }
  ring(p, r + .6, blackwell ? 2 : 3, 2.2, [-x, 0, z - .3], m.dark)
  axialFan(root, 'left-front-fan', -x, z - .5, r, 9, m)
  if (blackwell) {
    ring(p, r + .6, 2, 2.2, [x, 0, z - .3], m.dark)
    axialFan(root, 'right-front-fan', x, z - .5, r, 9, m)
    // Central rear cover leaves both fin stacks open, matching double flow-through.
    const rear = group(root, 'compact-central-backplate', [0, 0, -d / 2 - .5], [0, Math.PI, 0])
    plate(rear, polygon([[-50, -h / 2 + 9], [-24, 0], [-50, h / 2 - 9], [50, h / 2 - 9], [24, 0], [50, -h / 2 + 9]]), 1.3, [0, 0, 0], m.dark)
    label(rear, labels, 'RTX 5090', [58, 11], [0, -h / 2 + 27, 2], '#262c31')
  } else {
    const rearRing = group(p, '', [x, 0, -d / 2 + .5], [0, Math.PI, 0])
    ring(rearRing, r + .6, 3, 2.2, [0, 0, 0], m.dark)
    axialFan(root, 'right-rear-flow-through-fan', x, -d / 2 + 1, r, 9, m, true)
    backplate(root, l, h, d, m, labels, nvidiaProduct(id).name, true)
  }
  label(p, labels, nvidiaProduct(id).name, [41, 7], [0, -h / 2 + 15, z + 5.9], 'transparent', '#bcc5c9')
  label(p, labels, 'GEFORCE RTX', [100, 15], [-41, h / 2 - 2, 0], '#262c31', '#e2e4df', [-Math.PI / 2, 0, 0])
  for (const xPos of [-l / 2 + 14, l / 2 - 14]) for (const y of [-h / 2 + 15, h / 2 - 15]) screw(p, [xPos, y, z + 1], m)
}

/** Millimetre construction space. The shared NVIDIA exporter supplies metres,
 * grounded origin, material batching, embedded markings and Draco compression. */
export function buildGeForceModel(id: GeForceProductId, labels: Labels) {
  const root = new T.Group(), m = materials(id), [l, h, d] = nvidiaProduct(id).dimensions
  connectors(root, id, l, h, d, m)
  if (id === 'nvidia-gtx-1080-ti') pascal(root, l, h, d, m, labels)
  else if (id === 'nvidia-rtx-2080-ti') turing(root, l, h, d, m, labels)
  else flowThrough(root, id, l, h, d, m, labels)
  return root
}
