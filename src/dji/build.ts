/** Photo-based exterior studies. These are intentionally NOT manufacturer CAD.
 * Authored in millimetres; the exporter converts to approximate metres.
 * Official DJI assets never pass through this builder.
 */
import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

type V = [number, number, number]
export interface StudySpec { slug: string; name: string; family: string }
export interface SurfaceLabel { text: string; background: string; screen?: boolean }
export const surfaceLabels = new Map<string, SurfaceLabel>()

function materials() {
  const make = (name: string, color: string, roughness: number, metalness = 0) => new T.MeshStandardMaterial({ name, color, roughness, metalness })
  return {
    shell: make('graphite-polymer', '#363a3b', .4, .12), dark: make('rubber', '#141919', .72),
    black: make('black-anodized', '#080d11', .27, .35), silver: make('brushed-alloy', '#737d80', .29, .8),
    light: make('light-grey-polymer', '#b9bcb8', .4, .08), white: make('warm-grey-polymer', '#d0d1cc', .42),
    red: make('record-red', '#c85335', .32), orange: make('propeller-tip', '#d27834', .5),
    glass: new T.MeshPhysicalMaterial({ name: 'coated-optical-glass', color: '#153b42', roughness: .085, metalness: .6, clearcoat: 1, clearcoatRoughness: .08 }),
    green: new T.MeshStandardMaterial({ name: 'status-led', color: '#acd278', emissive: '#62a642', emissiveIntensity: .5, roughness: .3 }),
  }
}
type Mats = ReturnType<typeof materials>

function part(parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const mesh = new T.Mesh(geo, mat); mesh.position.set(...pos); mesh.rotation.set(...rot); parent.add(mesh); return mesh
}
function box(p: T.Object3D, size: V, pos: V, mat: T.Material, radius = 1.2, rot: V = [0, 0, 0]) {
  return part(p, new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(x => x / 2 - .01))), mat, pos, rot)
}
function cylinder(p: T.Object3D, radius: number, length: number, pos: V, mat: T.Material, rot: V = [0, 0, 0], bottom = radius) {
  return part(p, new T.CylinderGeometry(radius, bottom, length, 48), mat, pos, rot)
}
function sphere(p: T.Object3D, size: V, pos: V, mat: T.Material) {
  const mesh = part(p, new T.SphereGeometry(1, 48, 32), mat, pos); mesh.scale.set(...size); return mesh
}
function ring(p: T.Object3D, r: number, tube: number, pos: V, mat: T.Material, rot: V = [0, 0, 0]) {
  return part(p, new T.TorusGeometry(r, tube, 10, 72), mat, pos, rot)
}
function group(p: T.Object3D, name: string, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const g = new T.Group(); g.name = name; g.position.set(...pos); g.rotation.set(...rot); p.add(g); return g
}
function beam(p: T.Object3D, a: V, b: V, width: number, depth: number, mat: T.Material) {
  const start = new T.Vector3(...a), end = new T.Vector3(...b), delta = end.clone().sub(start)
  const mesh = box(p, [width, delta.length(), depth], start.clone().add(end).multiplyScalar(.5).toArray(), mat, Math.min(width, depth) * .3)
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return mesh
}
function label(p: T.Object3D, text: string, size: [number, number], pos: V, bg = '#252b2d', rot: V = [0, 0, 0], screen = false) {
  const key = `label:${text}:${bg}:${screen}`
  surfaceLabels.set(key, { text, background: bg, screen })
  return part(p, new T.PlaneGeometry(...size), new T.MeshStandardMaterial({ name: key, color: '#ffffff', roughness: screen ? .22 : .6, metalness: screen ? .12 : 0 }), pos, rot)
}
function screw(p: T.Object3D, pos: V, m: Mats, r = .9, rot: V = [0, 0, 0]) {
  const g = group(p, 'fastener', pos, rot)
  cylinder(g, r, .5, [0, 0, 0], m.silver, [Math.PI / 2, 0, 0])
  box(g, [r * .95, .21, .16], [0, 0, .28], m.black, .05)
  box(g, [.21, r * .95, .16], [0, 0, .29], m.black, .05)
}
function lens(p: T.Object3D, r: number, pos: V, m: Mats, rot: V = [0, 0, 0]) {
  const g = group(p, 'lens-assembly', pos, rot)
  cylinder(g, r, r * .26, [0, 0, 0], m.black, [Math.PI / 2, 0, 0])
  ring(g, r * .91, r * .048, [0, 0, r * .15], m.silver)
  ring(g, r * .75, r * .07, [0, 0, r * .17], m.dark)
  sphere(g, [r * .7, r * .7, r * .13], [0, 0, r * .17], m.glass)
  cylinder(g, r * .29, r * .025, [0, 0, r * .31], m.black, [Math.PI / 2, 0, 0])
  ring(g, r * .43, r * .014, [0, 0, r * .32], m.glass)
  sphere(g, [r * .17, r * .07, r * .012], [-r * .22, r * .27, r * .303], m.silver)
  return g
}
function slots(p: T.Object3D, pos: V, count: number, length: number, m: Mats, rot: V = [0, 0, 0], spacing = 1.8) {
  const g = group(p, 'ventilation', pos, rot)
  for (let i = 0; i < count; i++) box(g, [length, .55, .35], [0, (i - (count - 1) / 2) * spacing, 0], m.black, .2)
}
function screen(p: T.Object3D, w: number, h: number, pos: V, m: Mats, text = 'OSMO', rot: V = [0, 0, 0]) {
  const g = group(p, 'display', pos, rot)
  box(g, [w, h, 3], [0, 0, 0], m.black, 2)
  label(g, text, [w - 3, h - 3], [0, 0, 1.6], '#0d2029', [0, 0, 0], true)
  return g
}

function pocket(spec: StudySpec, variant: string, m: Mats) {
  const root = new T.Group(), pro = spec.slug.endsWith('4p')
  const h = pro ? 99 : 96
  box(root, [34, h, 28], [0, h / 2, 0], m.shell, 7)
  box(root, [30, h - 10, 1], [0, h / 2, -13.7], m.dark, .4)
  box(root, [33.5, 1, 27.6], [0, 8, 0], m.black, .4)
  for (const x of [-16.7, 16.7]) slots(root, [x, 40, 0], 7, 12, m, [0, Math.sign(x) * Math.PI / 2, 0], 2.4)
  const wide = (pro && variant === 'default') || (!pro && variant === 'alternate')
  screen(root, wide ? 46 : 29, wide ? 28 : 48, [0, 70, 15], m, '4K  60', [0, 0, 0])
  cylinder(root, 5, 3, [-7, 28, 15.5], m.black, [Math.PI / 2, 0, 0]); ring(root, 4, .6, [-7, 28, 17.2], m.silver)
  cylinder(root, 3.4, 1.4, [8, 28, 15], m.orange, [Math.PI / 2, 0, 0]); cylinder(root, 2.3, 1.5, [8, 28, 15.5], m.black, [Math.PI / 2, 0, 0])
  if (pro) for (const x of [-7, 7]) cylinder(root, 3.2, 1, [x, 45, 14.7], m.dark, [Math.PI / 2, 0, 0])
  label(root, 'OSMO', [17, 5], [0, 13, 14.2]); box(root, [8, 3.1, .4], [0, 5, 14], m.black, 1)
  for (const x of [-10, 10]) screw(root, [x, 7, -14.4], m)
  cylinder(root, 11, 8, [0, h + 3, 0], m.black)
  ring(root, 10.5, .7, [0, h + 5, 0], m.silver, [Math.PI / 2, 0, 0])
  const gimbal = group(root, 'three-axis-gimbal')
  beam(gimbal, [11, h + 6, -2], [21, h + 26, -2], 9, 12, m.shell)
  cylinder(gimbal, 10, 11, [18, h + 29, -2], m.dark, [0, 0, Math.PI / 2])
  box(gimbal, [30, pro ? 45 : 28, 27], [0, h + 28, 0], m.shell, 7)
  if (pro) for (const dy of [-10.3, 10.3]) lens(gimbal, 8.8, [0, h + 28 + dy, 14], m)
  else { box(gimbal, [24, 23, 2], [0, h + 28, 14], m.black, 5); lens(gimbal, 8.8, [0, h + 28, 16], m) }
  label(gimbal, 'DJI', [11, 5], [0, h + 28, -13.6], '#363a3b', [0, Math.PI, 0])
  return root
}

function action(spec: StudySpec, m: Mats) {
  const root = new T.Group()
  box(root, [73, 47, 31], [0, 25, 0], m.shell, 6)
  box(root, [71, 45, 2], [0, 25, 15.4], m.dark, 5)
  box(root, [71, 1, 30], [0, 6.5, 0], m.black, .4)
  screen(root, 27, 31, [-19, 27, 17], m, '4K / 60')
  const outer = part(root, new T.CylinderGeometry(18.8, 18.8, 5, 8), m.black, [17, 28, 19], [Math.PI / 2, Math.PI / 8, 0])
  outer.name = 'octagonal-lens-protector'; lens(root, 16.8, [17, 28, 22], m)
  label(root, 'ACTION 6', [27, 4.3], [-15, 7, 16.5], '#141919')
  screen(root, 65, 38, [0, 26, -16], m, '4K  60', [0, Math.PI, 0])
  box(root, [11, 1.8, 8], [22, 48.5, -1], m.dark, 2); cylinder(root, 2.3, .3, [22, 49.5, -1], m.red)
  box(root, [1, 30, 20], [36.6, 24, 0], m.dark, .4)
  slots(root, [-36.6, 27, 0], 7, 9, m, [0, -Math.PI / 2, 0])
  cylinder(root, 2.3, .5, [30, 7, 16.7], m.black, [Math.PI / 2, 0, 0])
  box(root, [30, 3, 20], [0, 1.8, 0], m.black, 1.3)
  for (const x of [-12, 12]) screw(root, [x, 4, 15], m)
  return root
}

function panorama(spec: StudySpec, m: Mats) {
  const root = new T.Group(), second = spec.slug === '360-2'
  box(root, [61, 89, 33], [0, 44.5, 0], second ? m.shell : m.dark, 8)
  box(root, [56, 34, 1], [0, 23, 16.4], m.black, .4)
  for (const side of [-1, 1]) {
    const optical = lens(root, 21, [0, 65, side * 18], m, side === 1 ? [0, 0, 0] : [0, Math.PI, 0])
    sphere(optical, [14, 14, 8], [0, 0, 5], m.glass)
  }
  screen(root, 48, 27, [0, 25, 18], m, '8K  360°')
  for (const x of [-16, 16]) cylinder(root, 2.7, .8, [x, 7.5, 17], x < 0 && second ? m.red : m.silver, [Math.PI / 2, 0, 0])
  label(root, second ? 'OSMO 360 II' : 'OSMO 360', [36, 8], [0, 27, -16.6], '#141919', [0, Math.PI, 0])
  slots(root, [-30.5, 35, 0], 9, 12, m, [0, -Math.PI / 2, 0])
  box(root, [1, 35, 21], [30.5, 28, 0], m.dark, .4)
  cylinder(root, 3, 1, [0, 0, 0], m.silver)
  return root
}

function nano(m: Mats) {
  const root = new T.Group()
  box(root, [60, 32, 28], [0, 56, 0], m.shell, 7)
  lens(root, 14, [16, 56, 16], m)
  label(root, 'DJI', [16, 12], [-15, 56, 14.2], '#363a3b')
  box(root, [2, 4, .6], [-25, 55, 14.2], m.green, .6)
  box(root, [57, 36, 17], [0, 20, -3], m.shell, 6)
  screen(root, 52, 31, [0, 20, 7], m, '4K  NANO')
  box(root, [45, 2, 14], [0, 39, -3], m.black, .5)
  for (const x of [-16, 16]) cylinder(root, 3.5, .6, [x, 50, -14.2], m.silver, [Math.PI / 2, 0, 0])
  slots(root, [-30, 56, 0], 5, 9, m, [0, -Math.PI / 2, 0])
  return root
}

function propeller(p: T.Object3D, radius: number, m: Mats, blades = 2) {
  for (let i = 0; i < blades; i++) {
    const g = group(p, `blade-${i}`, [0, 0, 0], [0, i * Math.PI * 2 / blades, 0])
    const shape = new T.Shape(); shape.moveTo(1, -2); shape.bezierCurveTo(radius * .23, -radius * .12, radius * .63, -radius * .17, radius, -radius * .07)
    shape.quadraticCurveTo(radius * 1.04, -radius * .012, radius * .94, radius * .035)
    shape.bezierCurveTo(radius * .65, radius * .08, radius * .35, radius * .035, 1, 2); shape.closePath()
    const geo = new T.ExtrudeGeometry(shape, { depth: .7, bevelEnabled: true, bevelSize: .25, bevelThickness: .2, bevelSegments: 2, curveSegments: 14 })
    part(g, geo, m.dark, [0, 0, 0], [Math.PI / 2, 0, .045])
    if (blades === 2) box(g, [3.6, .8, 2.5], [radius * .93, .4, -radius * .01], m.orange, .6)
  }
}
function motor(p: T.Object3D, pos: V, radius: number, bladeRadius: number, m: Mats, angle = 0, blades = 2) {
  const g = group(p, 'motor-and-propeller', pos)
  cylinder(g, radius, 9, [0, 0, 0], m.silver)
  cylinder(g, radius * 1.02, 4, [0, 5, 0], m.dark)
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8
    box(g, [1.4, 4, .7], [Math.sin(a) * (radius + .1), .3, Math.cos(a) * (radius + .1)], m.black, .15, [0, a, 0])
  }
  const rotor = group(g, 'rotor', [0, 8, 0], [0, angle, 0]); propeller(rotor, bladeRadius, m, blades)
  cylinder(rotor, radius * .42, 2, [0, 1, 0], m.shell); screw(rotor, [0, 2.2, 0], m, 1.1, [-Math.PI / 2, 0, 0])
}

function foldable(spec: StudySpec, variant: string, m: Mats) {
  const root = new T.Group(), folded = variant === 'folded', mavic = spec.slug === 'mavic-4-pro', air = spec.slug === 'air-3s'
  const lito = spec.slug.startsWith('lito'), mini = spec.slug === 'mini-5-pro'
  const factor = mavic ? 1.25 : air ? 1.05 : .78, body = lito ? m.white : mini ? m.light : m.shell
  const hull = group(root, 'fuselage', [0, 46, 0]); hull.scale.setScalar(factor)
  // A tapered, curved planform gives the fuselage a recognisable aerodynamic outline.
  const plan = new T.Shape(); plan.moveTo(-27, -60); plan.bezierCurveTo(-37, -42, -37, 24, -30, 46); plan.quadraticCurveTo(-25, 64, 0, 65)
  plan.quadraticCurveTo(25, 64, 30, 46); plan.bezierCurveTo(37, 24, 37, -42, 27, -60); plan.quadraticCurveTo(0, -68, -27, -60)
  part(hull, new T.ExtrudeGeometry(plan, { depth: 29, bevelEnabled: true, bevelSize: 6, bevelThickness: 7, bevelSegments: 5, curveSegments: 20 }), body, [0, 18, 0], [Math.PI / 2, 0, 0])
  box(hull, [53, 3, 57], [0, 25, -23], body, 7); box(hull, [54, 1, 58], [0, 23.2, -23], m.dark, .4)
  cylinder(hull, 4.2, .8, [0, 27, -18], m.dark)
  for (let i = 0; i < 4; i++) box(hull, [2.3, .45, 1.2], [-5 + i * 3.4, 27.2, -28], m.green, .2)
  label(hull, 'DJI', [21, 11], [0, 27.4, 19], lito ? '#d0d1cc' : mini ? '#b9bcb8' : '#363a3b', [-Math.PI / 2, 0, 0])
  for (const side of [-1, 1]) {
    slots(hull, [side * 34.5, 3, -2], 9, 17, m, [0, side * Math.PI / 2, 0], 1.8)
    lens(hull, 6, [side * 23, 13, 58], m, [.1, side * .24, 0])
    screw(hull, [side * 22, -15, 43], m)
    if (mavic || air || mini || spec.slug === 'lito-x1') lens(hull, 4, [side * 30, 3, -49], m, [0, side * 2.8, 0])
  }
  if (air || mini) box(hull, [24, 9, 3], [0, 19, 62], m.black, 3)
  const cam = group(hull, 'stabilized-camera', [0, -17, 60])
  beam(cam, [-19, 9, -9], [-19, -13, 1], 5, 6, m.silver); beam(cam, [-19, -13, 1], [0, -13, 1], 5, 6, m.silver)
  if (mavic) {
    sphere(cam, [24, 24, 22], [0, 0, 4], m.black)
    lens(cam, 11.5, [-5, -6, 23], m); lens(cam, 6.2, [10, 9, 21], m); lens(cam, 6.2, [-7, 12, 22], m)
    label(cam, 'HASSELBLAD', [24, 3], [0, -20, 20], '#080d11')
  } else if (air) {
    box(cam, [27, 42, 23], [0, -2, 8], m.black, 6); lens(cam, 9, [0, 8, 21], m); lens(cam, 8.5, [0, -12, 21], m)
  } else {
    box(cam, [31, 26, 25], [0, -3, 8], m.black, 7); lens(cam, mini ? 11 : 9, [0, -3, 22], m)
  }
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    const a: V = [side * 31, 4, front * 41]
    const b: V = folded ? [side * 43, -9, -front * 23] : [side * (front > 0 ? 116 : 110), front > 0 ? -4 : 8, front * 102]
    const arm = group(hull, `arm-${side}-${front}`)
    beam(arm, a, b, front > 0 ? 10 : 8, 11, body)
    cylinder(arm, 8, 12, a, m.silver)
    if (front > 0) beam(arm, [b[0], b[1], b[2]], [b[0], b[1] - 29, b[2] + 8], 5, 6, body)
    box(arm, [5, 3, 6], [b[0], b[1] - (front > 0 ? 28 : 7), b[2] + (front > 0 ? 8 : 0)], m.dark, 1)
    motor(arm, b, 9.5, folded ? 45 : 61, m, folded ? Math.PI / 2 : side * .65 + front * .25)
    label(arm, spec.name.replace('DJI ', ''), [33, 5], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 7, (a[2] + b[2]) / 2], lito ? '#d0d1cc' : '#363a3b', [-Math.PI / 2, 0, 0])
  }
  return root
}

function guarded(spec: StudySpec, m: Mats) {
  const root = new T.Group(), flip = spec.slug === 'flip', avata = spec.slug === 'avata-360', neo2 = spec.slug === 'neo-2'
  const body = flip || spec.slug === 'neo' ? m.light : m.shell, r = flip ? 43 : avata ? 47 : 32, span = r + 7
  const y = flip ? 30 : avata ? 25 : 20
  box(root, [flip ? 39 : 43, flip ? 56 : 30, avata ? 127 : 93], [0, y, 0], body, 11)
  box(root, [29, 2, 52], [0, y + (flip ? 29 : 16), -10], body, 4)
  label(root, flip ? 'DJI FLIP' : avata ? 'AVATA 360' : neo2 ? 'DJI NEO 2' : 'DJI NEO', [27, 8], [0, y + (flip ? 30.2 : 17.2), 9], flip || !neo2 && !avata ? '#b9bcb8' : '#363a3b', [-Math.PI / 2, 0, 0])
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    const x = side * span, z = front * span
    beam(root, [side * 13, 12, front * 31], [x, 11, z], 8, 7, body)
    const cage = group(root, 'propeller-guard', [x, 16, z])
    const shape = new T.Shape(); shape.absarc(0, 0, r + 2.2, 0, Math.PI * 2, false)
    const hole = new T.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); shape.holes.push(hole)
    part(cage, new T.ExtrudeGeometry(shape, { depth: flip ? 4 : 9, bevelEnabled: true, bevelSize: .5, bevelThickness: .5, bevelSegments: 2, curveSegments: 48 }), body, [0, 4, 0], [Math.PI / 2, 0, 0])
    ring(cage, r + .8, 1.1, [0, flip ? 8 : 9, 0], body, [Math.PI / 2, 0, 0])
    for (let i = 0; i < (flip ? 16 : 5); i++) {
      const a = i * Math.PI * 2 / (flip ? 16 : 5)
      beam(cage, [Math.sin(a) * 8, flip ? 9 : 1, Math.cos(a) * 8], [Math.sin(a + (flip ? .14 : .03)) * r, flip ? 8 : 7, Math.cos(a + (flip ? .14 : .03)) * r], flip ? .85 : 1.4, flip ? 1.4 : 1.7, body)
    }
    motor(root, [x, 14, z], 6.5, r - 3, m, side * .7, 3)
    box(root, [9, 6, 11], [x, 5, z], m.dark, 2)
  }
  const camera = group(root, 'front-gimbal', [0, avata ? 18 : 14, avata ? 70 : 53])
  box(camera, [29, avata ? 47 : 26, 25], [0, 0, 0], m.black, 7)
  lens(camera, avata ? 16 : 11, [0, 0, 14], m)
  if (avata) lens(camera, 16, [0, 0, -15], m, [0, Math.PI, 0])
  if (flip || neo2) { box(root, [27, 12, 2], [0, y + 17, 48], m.black, 3); label(root, 'SENSOR', [20, 4], [0, y + 17, 49.2], '#080d11') }
  slots(root, [0, y, -47], 8, 24, m, [0, Math.PI, 0])
  for (const x of [-12, 12]) screw(root, [x, y + 10, -47.8], m)
  return root
}

function mobile(spec: StudySpec, m: Mats) {
  const root = new T.Group(), pro = spec.slug.endsWith('8p')
  box(root, [33, 129, 32], [0, 70, 0], m.shell, 11)
  box(root, [24, 89, 1], [0, 61, -16.1], m.dark, .4)
  label(root, 'DJI', [12, 9], [0, 30, 16.2], '#363a3b')
  if (pro) screen(root, 25, 32, [0, 108, 17], m, 'TRACK')
  else box(root, [27, 17, 1.3], [0, 118, 16.3], m.dark, .5)
  cylinder(root, 5.3, 3.2, [-4, pro ? 79 : 99, 17], m.dark, [Math.PI / 2, 0, 0])
  ring(root, 4, .4, [-4, pro ? 79 : 99, 19], m.silver)
  for (const [x, y] of [[9, pro ? 80 : 100], [9, pro ? 66 : 85]]) cylinder(root, 2.5, 1.1, [x, y, 17], y < 90 ? m.red : m.silver, [Math.PI / 2, 0, 0])
  cylinder(root, 7, 7, [-19, 105, 0], m.black, [0, 0, Math.PI / 2])
  const arm = group(root, 'three-axis-arm')
  cylinder(arm, 17, 24, [0, 145, 0], m.dark); ring(arm, 17, .6, [0, 146, 0], m.silver, [Math.PI / 2, 0, 0])
  beam(arm, [0, 154, 0], [39, 163, 0], 17, 18, m.shell)
  cylinder(arm, 11, 21, [39, 163, 0], m.silver, [Math.PI / 2, 0, 0])
  beam(arm, [41, 165, 0], [70, 226, 0], 13, 18, m.shell)
  cylinder(arm, 17, 26, [65, 231, 0], m.dark, [0, 0, Math.PI / 2])
  beam(arm, [56, 234, 0], [8, 248, 0], 12, 16, m.shell)
  box(arm, [38, 25, 10], [0, 247, 7], m.black, 5)
  for (const y of [214, 281]) box(arm, [28, 7, 19], [0, y, 13], m.shell, 2)
  box(arm, [153, 72, 8], [0, 249, 19], m.black, 9)
  screen(arm, 145, 66, [0, 249, 23.4], m, 'OSMO  MOBILE')
  box(arm, [17, 10, 13], [0, 207, 18], m.shell, 3); lens(arm, 3.3, [2, 207, 25.4], m)
  cylinder(root, 11, 6, [0, 4, 0], m.dark)
  return root
}

function rs(m: Mats) {
  const root = new T.Group()
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; beam(root, [0, 27, 0], [Math.sin(a) * 89, 4, Math.cos(a) * 89], 11, 12, m.shell) }
  cylinder(root, 14, 142, [0, 101, 0], m.dark)
  for (const y of [36, 46, 165]) ring(root, 14, .7, [0, y, 0], m.silver, [Math.PI / 2, 0, 0])
  box(root, [41, 67, 39], [0, 204, 0], m.shell, 9)
  screen(root, 28, 35, [0, 213, 20.6], m, 'RONIN  RS5')
  cylinder(root, 4.4, 2, [-8, 184, 21], m.black, [Math.PI / 2, 0, 0]); cylinder(root, 2.7, 1.5, [8, 184, 21], m.red, [Math.PI / 2, 0, 0])
  cylinder(root, 10, 9, [-24, 211, 0], m.dark, [0, 0, Math.PI / 2])
  cylinder(root, 22, 29, [0, 250, 0], m.dark)
  beam(root, [0, 263, 0], [70, 273, 0], 16, 27, m.shell)
  beam(root, [70, 273, 0], [80, 366, 0], 15, 26, m.shell)
  cylinder(root, 24, 29, [80, 372, 0], m.dark, [Math.PI / 2, 0, 0])
  beam(root, [80, 372, 8], [0, 372, 8], 16, 22, m.shell)
  beam(root, [0, 369, 8], [0, 357, 65], 14, 20, m.shell)
  cylinder(root, 20, 27, [0, 358, 70], m.dark, [0, 0, Math.PI / 2])
  box(root, [90, 6, 49], [27, 355, 70], m.black, 2)
  for (const x of [-14, 0, 14, 28, 42, 56]) box(root, [1, .4, 5], [x, 358.4, 88], m.silver, .15)
  for (const [x, y, z] of [[0, 249, 23], [80, 372, 16], [58, 350, 83]]) box(root, [9, 5, 3], [x, y, z], m.red, 1)
  label(root, 'RONIN', [34, 8], [42, 275, 14], '#363a3b')
  label(root, 'DJI', [17, 9], [0, 99, 14.4], '#141919')
  return root
}

function cinema(m: Mats) {
  const root = new T.Group()
  box(root, [112, 115, 150], [0, 73, -12], m.shell, 8)
  box(root, [93, 97, 36], [0, 72, -104], m.dark, 5)
  slots(root, [57, 69, 0], 22, 70, m, [0, Math.PI / 2, 0], 3.6)
  box(root, [2, 68, 85], [-57, 76, 0], m.black, .6)
  for (let i = 0; i < 12; i++) cylinder(root, 3.2, 1.7, [-59, 56 + Math.floor(i / 4) * 14, -31 + i % 4 * 17], i === 1 ? m.red : m.silver, [0, 0, Math.PI / 2])
  for (const side of [-1, 1]) {
    beam(root, [side * 59, 72, 0], [side * 89, 100, 14], 11, 16, m.silver)
    box(root, [27, 77, 32], [side * 90, 74, 13], m.dark, 10)
    cylinder(root, 5, 2, [side * 90, 101, 30], m.red, [Math.PI / 2, 0, 0])
  }
  beam(root, [0, 119, 43], [0, 151, 37], 13, 16, m.black); beam(root, [0, 151, 37], [0, 151, -51], 15, 14, m.dark)
  beam(root, [0, 145, -40], [0, 182, -51], 8, 8, m.silver)
  screen(root, 91, 59, [0, 188, -53], m, 'RONIN  4D', [-.15, 0, 0])
  const camera = group(root, 'four-axis-camera', [0, 100, 101])
  for (const side of [-1, 1]) beam(root, [side * 37, 24, 49], [side * 37, 78, 99], 15, 15, m.shell)
  box(camera, [87, 76, 70], [0, 0, 0], m.dark, 12)
  cylinder(camera, 35, 71, [0, 0, 48], m.black, [Math.PI / 2, 0, 0])
  for (const z of [24, 33, 53, 73]) ring(camera, 35, 1.5, [0, 0, z], m.silver)
  lens(camera, 34, [0, 0, 85], m)
  box(camera, [100, 83, 14], [0, 0, 88], m.black, 6)
  lens(camera, 34, [0, 0, 97], m)
  box(camera, [47, 23, 34], [0, 55, 38], m.shell, 5); lens(camera, 6, [10, 55, 56], m)
  label(root, 'DJI  RONIN 4D', [67, 13], [0, 108, -123], '#141919', [0, Math.PI, 0])
  return root
}

function mic(spec: StudySpec, m: Mats) {
  const root = new T.Group(), flagship = spec.slug === 'mic-3', second = spec.slug.includes('2'), s = spec.slug.endsWith('2s')
  const w = flagship ? 114 : 102, h = flagship ? 37 : 34, depth = 48
  const tray = group(root, 'charging-case')
  // Open cavity is built as five walls so the tray is visibly hollow from every angle.
  box(tray, [w, 5, depth], [0, 2.5, 0], m.shell, 3)
  for (const side of [-1, 1]) box(tray, [4, h, depth], [side * (w / 2 - 2), h / 2, 0], m.shell, 1.8)
  for (const z of [-1, 1]) box(tray, [w - 5, h, 4], [0, h / 2, z * (depth / 2 - 2)], m.shell, 1.8)
  box(tray, [w - 9, 13, depth - 9], [0, 12, 0], m.dark, 3)
  const lid = group(tray, 'open-hinged-lid', [0, h - 1, -depth / 2], [-.35, 0, 0])
  box(lid, [w, depth, 5], [0, depth / 2, -1], m.shell, 3)
  box(lid, [w - 8, depth - 9, 4], [0, depth / 2, 2.2], m.black, 3)
  for (const x of [-28, 0, 28]) box(lid, [22, 13, 3], [x, 12, 5], m.dark, 3)
  cylinder(tray, 2.5, w - 21, [0, h, -depth / 2], m.silver, [0, 0, Math.PI / 2])
  box(tray, [25, 15, 2], [0, h - 5, depth / 2 + .6], m.shell, 2)
  box(tray, [16, .6, .6], [0, h - 9, depth / 2 + 1.8], m.black, .2)
  for (let i = 0; i < 4; i++) sphere(tray, [.6, .6, .3], [-7.5 + i * 5, 10, depth / 2 + .2], m.green)
  box(tray, [10, 3.4, 1], [0, 11, -depth / 2 - .1], m.black, 1)
  for (const side of [-1, 1]) {
    const tx = group(root, `transmitter-${side}`, [side * (flagship ? 35 : 31), 27, 0], [0, side * -.15, 0])
    const mat = second && side < 0 ? m.white : m.shell
    box(tx, [flagship ? 24 : 22, flagship ? 31 : 25, 15], [0, 8, 0], mat, flagship ? 5 : 6)
    box(tx, [15, 22, 3], [0, 8, -9], m.black, 2)
    label(tx, 'DJI', [12, 8], [0, 9, 7.7], second && side < 0 ? '#d0d1cc' : '#363a3b')
    for (let x = -6; x <= 6; x += 2.4) for (let z = -3; z <= 3; z += 2) cylinder(tx, .45, .3, [x, flagship ? 24 : 21, z], m.black)
    cylinder(tx, 1.8, .6, [11.4, 7, 0], m.black, [0, 0, Math.PI / 2]); sphere(tx, [.5, 1.5, .25], [-7, 16, 7.6], m.green)
  }
  const rx = group(root, 'receiver', [0, 24, 1])
  box(rx, [flagship ? 28 : 27, flagship ? 29 : 21, 19], [0, 8, 0], m.dark, 4)
  if (flagship || s) screen(rx, 21, 15, [0, 10, 10], m, flagship ? '-12 dB' : 'RX')
  else label(rx, 'DJI', [15, 7], [0, 9, 9.7], '#141919')
  cylinder(rx, 4, 5, [16, 12, 0], m.silver, [0, 0, Math.PI / 2])
  return root
}

export function buildDjiStudy(spec: StudySpec, variant = 'default') {
  const m = materials()
  let result: T.Group
  switch (spec.family) {
    case 'pocket': result = pocket(spec, variant, m); break
    case 'action': result = action(spec, m); break
    case 'panorama': result = panorama(spec, m); break
    case 'nano': result = nano(m); break
    case 'foldable': result = foldable(spec, variant, m); break
    case 'guarded': result = guarded(spec, m); break
    case 'mobile': result = mobile(spec, m); break
    case 'rs': result = rs(m); break
    case 'cinema': result = cinema(m); break
    case 'mic': result = mic(spec, m); break
    default: throw new Error(`No exterior study for ${spec.slug}`)
  }
  result.name = `dji-${spec.slug}-exterior-study`
  result.scale.setScalar(.001)
  result.userData = { provenance: 'Photo-based exterior approximation', product: spec.name, engineeringAccuracy: false }
  return result
}
