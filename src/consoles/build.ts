import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { consoleProduct } from './products'
import type { ConsoleProductId } from './products'

type V = [number, number, number]
export const consoleMarkings = new Map<string, string>()
const mat = (name: string, color: string, metalness = .1, roughness = .5) => Object.assign(new T.MeshStandardMaterial({ color, metalness, roughness }), { name })
function materials() {
  return {
    white: mat('console-matte-white', '#e4e6e7', .04, .47),
    gloss: Object.assign(new T.MeshPhysicalMaterial({ color: '#e4e6e7', roughness: .24, metalness: .03, clearcoat: .45, clearcoatRoughness: .22 }), { name: 'console-gloss-white' }),
    shell: mat('console-graphite-shell', '#242829', .16, .42),
    black: mat('console-recess-black', '#070b0e', .04, .65),
    core: Object.assign(new T.MeshPhysicalMaterial({ color: '#10151b', roughness: .25, metalness: .08, clearcoat: .3 }), { name: 'console-black-center' }),
    grille: mat('console-vent-grille', '#292f34', .18, .5),
    metal: mat('console-port-metal', '#747f88', .76, .31),
    contact: mat('console-port-contacts', '#b69d64', .74, .38),
    green: Object.assign(mat('xbox-green-vent-interior', '#62a12a', .05, .53), { side: T.DoubleSide }),
    blue: Object.assign(mat('playstation-blue-light-guide', '#2592ed', .04, .32), { emissive: new T.Color('#127ff3'), emissiveIntensity: 1.3 }),
  }
}
type Mats = ReturnType<typeof materials>
function part(p: T.Object3D, geometry: T.BufferGeometry, material: T.Material, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const mesh = new T.Mesh(geometry, material); mesh.position.set(...pos); mesh.rotation.set(...rot); mesh.castShadow = true; mesh.receiveShadow = true; p.add(mesh); return mesh
}
function group(p: T.Object3D, name: string, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const g = new T.Group(); g.name = name; g.position.set(...pos); g.rotation.set(...rot); p.add(g); return g
}
function box(p: T.Object3D, size: V, pos: V, m: T.Material, radius = 0) {
  return part(p, radius ? new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(v => v * .45))) : new T.BoxGeometry(...size), m, pos)
}
function disc(p: T.Object3D, radius: number, depth: number, pos: V, m: T.Material, rot: V = [Math.PI / 2, 0, 0], segments = 48) {
  return part(p, new T.CylinderGeometry(radius, radius, depth, segments), m, pos, rot)
}
function rounded(w: number, h: number, r: number) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); s.closePath(); return s
}
function hole(s: T.Shape, x: number, y: number, r: number) { const p = new T.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); s.holes.push(p) }
function extrude(s: T.Shape, depth: number, bevel = 0) { return new T.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 8 }) }
function tube(p: T.Object3D, points: V[], radius: number, m: T.Material) { return part(p, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point))), 64, radius, 6, false), m) }
function marking(p: T.Object3D, name: string, svg: string, size: [number, number], pos: V, rot: V = [0, 0, 0]) {
  const m = mat(`console-marking-${name}`, '#ffffff', .05, .6); m.transparent = true; m.depthWrite = false
  consoleMarkings.set(m.name, svg); part(p, new T.PlaneGeometry(...size), m, pos, rot)
}
function textMark(p: T.Object3D, text: string, size: [number, number], pos: V, color = '#767e83', rot: V = [0, 0, 0]) {
  const width = Math.max(200, text.length * 85)
  marking(p, text, `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="128"><text x="${width / 2}" y="94" text-anchor="middle" font-family="Arial,sans-serif" font-size="92" letter-spacing="8" fill="${color}">${text}</text></svg>`, size, pos, rot)
}
function xboxButton(p: T.Object3D, pos: V, radius: number, m: Mats) {
  disc(p, radius + .7, .6, pos, m.black)
  // Original vector reconstruction of the small illuminated console emblem.
  marking(p, 'xbox-power', '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><clipPath id="ball"><circle cx="128" cy="128" r="116"/></clipPath></defs><circle cx="128" cy="128" r="116" fill="#e9edef"/><g fill="#252b2e" clip-path="url(#ball)"><path d="M37 13Q128 72 218 254L186 254Q116 131 21 53Z"/><path d="M219 13Q128 72 38 254L70 254Q140 131 235 53Z"/></g></svg>', [radius * 1.9, radius * 1.9], [pos[0], pos[1], pos[2] + .4])
}
function port(p: T.Object3D, type: 'usb-a' | 'usb-c' | 'hdmi' | 'ethernet' | 'power' | 'expansion', pos: V, m: Mats) {
  const sizes = { 'usb-a': [13, 5.5], 'usb-c': [8.4, 3], hdmi: [14, 5.8], ethernet: [14, 12], power: [17, 7.5], expansion: [27, 5] }
  const [w, h] = sizes[type]
  box(p, [w + 2, h + 2, 1.3], pos, m.black, type === 'usb-c' ? 2 : 1)
  box(p, [w, h, .6], [pos[0], pos[1], pos[2] + .8], m.metal, type === 'usb-c' ? 1.4 : .5)
  box(p, [w - 1.5, h - 1.2, .6], [pos[0], pos[1], pos[2] + 1.2], m.black, .4)
  if (type === 'power') {
    for (const dx of [-4, 4]) disc(p, 1, .5, [pos[0] + dx, pos[1], pos[2] + 1.7], m.metal, undefined, 12)
  } else for (let i = 0; i < (type === 'ethernet' ? 8 : 4); i++) box(p, [.6, .45, .25], [pos[0] - w / 3 + i * w / (type === 'ethernet' ? 11 : 5), pos[1] - h / 4, pos[2] + 1.65], m.contact)
}
function rearConnections(root: T.Object3D, xbox: boolean, w: number, h: number, d: number, m: Mats, pro = false) {
  const p = group(root, 'rear-ports-and-exhaust', [0, 0, -d / 2 - .5], [0, Math.PI, 0])
  const panelWidth = xbox ? w - 14 : 42
  box(p, [panelWidth, h - 24, 1], [0, h / 2 + 2, 0], m.shell, 2)
  for (let y = h * .46; y < h - 18; y += 5) {
    box(p, [panelWidth - 6, 2.5, .6], [0, y, .8], m.black, .4)
    for (const x of [-panelWidth * .27, 0, panelWidth * .27]) box(p, [1.1, 2.5, .8], [x, y, 1], m.grille)
  }
  const y0 = pro ? 48 : 26
  port(p, 'power', [0, y0, 1], m); port(p, 'hdmi', [0, y0 + 24, 1], m)
  port(p, 'ethernet', [0, y0 + 49, 1], m)
  for (const dy of [75, 88]) port(p, 'usb-a', [0, y0 + dy, 1], m)
  if (xbox) port(p, 'expansion', [0, y0 + 110, 1], m)
  for (const x of [-panelWidth / 2 + 4, panelWidth / 2 - 4]) for (const y of [15, h - 13]) {
    disc(p, 1.3, .4, [x, y, 1], m.black, undefined, 10)
    box(p, [1.4, .25, .2], [x, y, 1.3], m.metal)
  }
}

function seriesX(m: Mats) {
  const root = new T.Group(), body = group(root, 'series-x-tower'), [w, h, d] = consoleProduct('microsoft-xbox-series-x').dimensions
  const walls = rounded(w, d, 2.4); walls.holes.push(rounded(w - 5, d - 5, 1.6))
  part(body, extrude(walls, h - 3, .1), m.shell, [0, 2, 0], [-Math.PI / 2, 0, 0])
  box(body, [w - 3, 3, d - 3], [0, 2, 0], m.black, 1)
  disc(body, 59, 2.2, [0, 1.1, 0], m.black, [0, 0, 0], 64)
  const top = group(root, 'concave-green-top-vent')
  const grid = rounded(w - 5, d - 5, 1)
  for (let row = -4; row <= 4; row++) for (let col = -4; col <= 4; col++) hole(grid, col * 14.5, row * 14.5, 5.8)
  const geo = extrude(grid, 1.8), positions = geo.getAttribute('position'), normals = geo.getAttribute('normal')
  for (let i = 0; i < positions.count; i++) {
    const r2 = (positions.getX(i) ** 2 + positions.getY(i) ** 2) / 72 ** 2
    positions.setZ(i, positions.getZ(i) - 5.5 * Math.max(0, 1 - r2))
    // Transform the original normals with the smooth dish deformation. Flat
    // triangle normals would make this matte plastic surface look corrugated.
    const slope = r2 < 1 ? 11 / 72 ** 2 : 0
    const normal = new T.Vector3(normals.getX(i) - slope * positions.getX(i) * normals.getZ(i), normals.getY(i) - slope * positions.getY(i) * normals.getZ(i), normals.getZ(i)).normalize()
    normals.setXYZ(i, normal.x, normal.y, normal.z)
  }
  part(top, geo, mat('xbox-matte-top-grille', '#141a1c', .02, .8), [0, h - 2.2, 0], [-Math.PI / 2, 0, 0])
  box(top, [w - 7, 1, d - 7], [0, h - 10, 0], m.green, 1)
  // Green is the inner wall of each aperture, visible at the normal viewing
  // angle. A flat green floor alone is hidden behind the deep black grille.
  for (let row = -4; row <= 4; row++) for (let col = -4; col <= 4; col++) {
    const x = col * 14.5, z = row * 14.5, dip = 5.5 * Math.max(0, 1 - (x * x + z * z) / 72 ** 2)
    part(top, new T.CylinderGeometry(5.65, 5.65, 5, 24, 1, true), m.green, [x, h - 4.3 - dip, z])
  }
  const front = group(root, 'front-disc-drive-and-controls')
  box(front, [2.4, 128, .6], [-44, 110, d / 2 + .2], m.black, .8)
  disc(front, 2.4, .5, [-44, 38, d / 2 + .35], m.metal, undefined, 20)
  xboxButton(front, [45, 264, d / 2 + .2], 8, m)
  port(front, 'usb-a', [44, 38, d / 2 + .1], m)
  disc(front, 2.2, .5, [44, 52, d / 2 + .3], m.black, undefined, 20)
  textMark(front, 'XBOX', [31, 7], [0, 11, d / 2 + .3], '#5a6367')
  rearConnections(root, true, w, h, d, m)
  return root
}

function seriesS(m: Mats) {
  const root = new T.Group(), [w, h, d] = consoleProduct('microsoft-xbox-series-s').dimensions
  const body = group(root, 'series-s-white-enclosure')
  box(body, [w, h, d], [0, h / 2, 0], m.white, 2.5)
  const vent = group(root, 'circular-side-cooling-grille', [-w / 2 - .3, 187, 0], [0, -Math.PI / 2, 0])
  disc(vent, 61, .7, [0, 0, .5], m.black, undefined, 96)
  const grille = new T.Shape(); grille.absarc(0, 0, 60.4, 0, Math.PI * 2, false)
  for (let row = -14; row <= 14; row++) for (let col = -14; col <= 14; col++) {
    const x = col * 4, y = row * 4
    if (Math.hypot(x, y) < 56.5) hole(grille, x, y, 1.28)
  }
  part(vent, extrude(grille, .8), m.grille, [0, 0, 1])
  const front = group(root, 'front-power-pairing-and-usb')
  xboxButton(front, [0, 247, d / 2 + .15], 7, m)
  port(front, 'usb-a', [0, 27, d / 2 + .15], m)
  disc(front, 2, .5, [0, 41, d / 2 + .5], m.black, undefined, 20)
  textMark(front, 'XBOX', [27, 5.5], [0, 228, d / 2 + .3], '#80888c')
  const intake = group(root, 'secondary-side-intake', [-w / 2 - .1, 50, 0], [0, -Math.PI / 2, 0])
  for (let row = 0; row < 11; row++) for (let col = 0; col < 25; col++) disc(intake, .8, .4, [(col - 12) * 4.7, (row - 5) * 4.7, 0], m.grille, undefined, 8)
  for (const x of [-20, 20]) for (const z of [-52, 52]) box(body, [7, 1, 7], [x, .5, z], m.black, 1)
  rearConnections(root, true, w, h, d, m)
  return root
}

// PS5 covers are continuous, closed curved shells sampled in height/depth,
// including the Slim drive bulge. They are not flattened side photographs.
function coverPoint(side: number, v: number, u: number, h: number, d: number, pro: boolean): V {
  let x = (pro ? 36 : 30) + 4 * Math.cos(v * Math.PI * 2) + 4 * u ** 3 + 1.5 * Math.sin(Math.PI * u)
  if (!pro && side === 1 && v < .58) x += 22 * Math.sin(v / .58 * Math.PI) ** 1.4 * (.25 + .75 * Math.sin(u * Math.PI / 2))
  const front = d / 2 - 7 + 6 * Math.cos((v - .1) * Math.PI)
  return [side * x, 9 + v * (h - 12) + u ** 2 * 12 * v ** 5, -d / 2 + 4 + u * (front + d / 2 - 4)]
}
function coverGeometry(side: number, from: number, to: number, h: number, d: number, pro: boolean, inset = 0) {
  const rows = Math.max(3, Math.ceil((to - from) * 60)), cols = 28, positions: number[] = [], uv: number[] = [], indices: number[] = []
  const layerSize = (rows + 1) * (cols + 1)
  for (let layer = 0; layer < 2; layer++) for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
    const u = col / cols, v = from + (to - from) * row / rows, p = coverPoint(side, v, u, h, d, pro)
    p[0] -= side * (layer * 2.6 + inset); positions.push(...p); uv.push(u, row / rows)
  }
  const quad = (a: number, b: number, c: number, e: number, reverse = false) => indices.push(...(reverse ? [a, c, b, a, e, c] : [a, b, c, a, c, e]))
  for (let layer = 0; layer < 2; layer++) for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const a = layer * layerSize + row * (cols + 1) + col
    quad(a, a + 1, a + cols + 2, a + cols + 1, (side === 1) !== (layer === 1))
  }
  const boundary = [...Array.from({ length: cols }, (_, i) => i), ...Array.from({ length: rows }, (_, i) => i * (cols + 1) + cols), ...Array.from({ length: cols }, (_, i) => rows * (cols + 1) + cols - i), ...Array.from({ length: rows }, (_, i) => (rows - i) * (cols + 1))]
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i], b = boundary[(i + 1) % boundary.length]
    quad(a, a + layerSize, b + layerSize, b, side === 1)
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals(); return geo
}
function playstation(id: ConsoleProductId, m: Mats) {
  const pro = id === 'sony-ps5-pro', [, h, d] = consoleProduct(id).dimensions, root = new T.Group()
  const core = group(root, 'black-center-chassis')
  box(core, [49, h - 30, d - 30], [0, 9 + h / 2 - 5, -3], m.core, 6)
  const base = group(root, 'display-stand')
  disc(base, 66, 4, [0, 2, 0], m.black, [0, 0, 0], 80).scale.z = 1.24
  disc(base, 61, 1, [0, 4.5, 0], m.metal, [0, 0, 0], 80).scale.z = 1.24
  box(base, [45, 5, 79], [0, 6.5, -4], m.black, 2)
  const split = pro ? .54 : .58
  for (const side of [-1, 1]) {
    const prefix = side < 0 ? 'left' : 'right'
    part(group(root, `${prefix}-lower-white-cover`), coverGeometry(side, 0, split - .005, h, d, pro), m.white)
    part(group(root, `${prefix}-upper-white-cover`), coverGeometry(side, pro ? .625 : split + .005, 1, h, d, pro), pro ? m.white : m.gloss)
    if (pro) {
      for (let i = 0; i < 3; i++) {
        const from = .54 + i * .03
        part(group(root, `${prefix}-airflow-slit-${i + 1}`), coverGeometry(side, from, from + .019, h, d, true, 2), m.black)
        if (i < 2) part(core, coverGeometry(side, from + .019, from + .03, h, d, true), m.white)
      }
    }
  }
  const intake = group(root, 'front-louvers-and-blue-light-guides')
  for (const side of [-1, 1]) {
    for (let y = 38; y < h - 25; y += 5) {
      const p = coverPoint(side, (y - 9) / h, 1, h, d, pro)
      box(intake, [3, 1.1, 12], [p[0] - side * 4, y, p[2] - 8], m.grille)
    }
    tube(intake, Array.from({ length: 36 }, (_, i) => { const p = coverPoint(side, .18 + i / 35 * .75, 1, h, d, pro); return [p[0] - side * 3.8, p[1], p[2] + .4] }), .65, m.blue)
  }
  const front = group(root, 'front-usb-c-and-power')
  const frontZ = (d - 30) / 2 - 3
  for (const y of [80, 101]) port(front, 'usb-c', [0, y, frontZ + .1], m)
  box(front, [3, 9, 1.1], [0, 31, frontZ + .4], m.metal, 1)
  if (!pro) {
    const drive = group(root, 'slim-optical-drive-opening')
    const fascia = new T.Shape(), low = coverPoint(1, .01, 1, h, d, false), high = coverPoint(1, .574, 1, h, d, false)
    fascia.moveTo(25, low[1]); fascia.lineTo(low[0], low[1])
    for (let i = 1; i <= 40; i++) { const p = coverPoint(1, .01 + i / 40 * .564, 1, h, d, false); fascia.lineTo(p[0], p[1]) }
    fascia.lineTo(25, high[1]); fascia.closePath()
    const geometry = extrude(fascia, 2, .3), vertices = geometry.getAttribute('position')
    for (let i = 0; i < vertices.count; i++) vertices.setZ(i, vertices.getZ(i) + coverPoint(1, (vertices.getY(i) - 9) / (h - 12), 1, h, d, false)[2] - 1.1)
    geometry.computeVertexNormals(); part(drive, geometry, m.white)
    tube(drive, Array.from({ length: 32 }, (_, i) => { const p = coverPoint(1, .13 + i / 31 * .31, 1, h, d, false); return [43, p[1], p[2] + 1.7] }), 1.35, m.black)
    const p = coverPoint(1, .105, 1, h, d, false); disc(drive, 1.7, .7, [43, p[1], p[2] + 1.4], m.metal, undefined, 16)
  }
  const badge = group(root, 'console-brand-markings')
  const position = coverPoint(1, .84, .62, h, d, pro)
  textMark(badge, 'PS5', [29, 7.8], [position[0] + .8, position[1], position[2]], '#252e39', [0, Math.PI / 2, 0])
  textMark(badge, 'SONY', [23, 4.6], [0, h - 22, frontZ + .5], '#838e98')
  rearConnections(root, false, 49, h - 10, d - 26, m, pro)
  return root
}

function batch(root: T.Object3D) {
  for (const child of [...root.children]) if (!(child instanceof T.Mesh)) batch(child)
  const batches = new Map<T.Material, T.BufferGeometry[]>()
  for (const mesh of [...root.children]) {
    if (!(mesh instanceof T.Mesh) || Array.isArray(mesh.material)) continue
    mesh.updateMatrix(); const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone(); geo.applyMatrix4(mesh.matrix)
    const list = batches.get(mesh.material) || []; list.push(geo); batches.set(mesh.material, list); mesh.geometry.dispose(); root.remove(mesh)
  }
  for (const [material, geometries] of batches) {
    const geo = mergeGeometries(geometries); if (!geo) throw new Error(`Cannot batch ${material.name}`)
    part(root, geo, material).name = material.name; for (const g of geometries) g.dispose()
  }
}

export function buildConsoleModel(id: ConsoleProductId) {
  const m = materials(), root = id === 'microsoft-xbox-series-x' ? seriesX(m) : id === 'microsoft-xbox-series-s' ? seriesS(m) : playstation(id, m)
  root.name = id; batch(root); root.scale.setScalar(.001); root.updateMatrixWorld(true)
  const bounds = new T.Box3().setFromObject(root), center = bounds.getCenter(new T.Vector3())
  root.position.set(-center.x, -bounds.min.y, -center.z)
  root.userData = { product: consoleProduct(id).name, provenance: '3D Studio exterior reconstruction', engineeringAccuracy: false }
  return root
}
