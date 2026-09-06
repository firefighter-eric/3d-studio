import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { teslaProduct } from './products'
import type { TeslaProductId } from './products'

type V = [number, number, number]
type Knot = [number, number]
const Y = new T.Vector3(0, 1, 0)
function material(name: string, color: string, metalness = .3, roughness = .35) {
  const value = new T.MeshStandardMaterial({ color, metalness, roughness }); value.name = name; return value
}
function materials(color = '#e6e8e8', metallic = .48) {
  const paint = new T.MeshPhysicalMaterial({ color, metalness: metallic, roughness: .26, clearcoat: .85, clearcoatRoughness: .19 }); paint.name = 'body-paint'
  return {
    paint, white: material('ceramic-white', '#e9ebe9', .22, .34),
    steel: material('brushed-stainless-steel', '#a2a7aa', .86, .31),
    silver: material('machined-alloy', '#a4acb2', .82, .24),
    dark: material('graphite-metal', '#292c31', .65, .3),
    black: material('black-polymer', '#0e1115', .15, .43),
    rubber: material('tire-rubber', '#171a1e', .03, .86),
    glass: material('tinted-glass', '#14232b', .54, .12),
    red: material('red-calipers', '#a92022', .38, .37),
    lamp: Object.assign(material('headlight-lens', '#e3f7ff', .22, .17), { emissive: new T.Color('#c2e2f7'), emissiveIntensity: .65 }),
    tail: Object.assign(material('tail-light-lens', '#b70915', .25, .24), { emissive: new T.Color('#e31226'), emissiveIntensity: .6 }),
    green: Object.assign(material('status-light', '#90dcc1', .2, .3), { emissive: new T.Color('#71c5a1'), emissiveIntensity: .5 }),
  }
}
type Mats = ReturnType<typeof materials>
export const teslaLabels = new Map<string, { text: string; background: string; color: string }>()
function part(p: T.Object3D, geometry: T.BufferGeometry, m: T.Material, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const mesh = new T.Mesh(geometry, m); mesh.position.set(...pos); mesh.rotation.set(...rot); mesh.castShadow = true; mesh.receiveShadow = true; p.add(mesh); return mesh
}
function group(p: T.Object3D, name: string, pos: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const value = new T.Group(); value.name = name; value.position.set(...pos); value.rotation.set(...rot); p.add(value); return value
}
function box(p: T.Object3D, size: V, pos: V, m: T.Material, radius = .01) {
  return part(p, radius ? new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v * .45))) : new T.BoxGeometry(...size), m, pos)
}
function cylinder(p: T.Object3D, r: number, h: number, pos: V, m: T.Material, rot: V = [0, 0, 0], segments = 40) {
  return part(p, new T.CylinderGeometry(r, r, h, segments), m, pos, rot)
}
function sphere(p: T.Object3D, radius: number, size: V, pos: V, m: T.Material) {
  const value = part(p, new T.SphereGeometry(radius, 32, 20), m, pos); value.scale.set(...size); return value
}
function beam(p: T.Object3D, a: V, b: V, width: number, depth: number, m: T.Material) {
  const va = new T.Vector3(...a), vb = new T.Vector3(...b), delta = vb.clone().sub(va)
  const mesh = box(p, [width, delta.length(), depth], va.add(vb).multiplyScalar(.5).toArray(), m, .006)
  mesh.quaternion.setFromUnitVectors(Y, delta.normalize()); return mesh
}
function line(p: T.Object3D, points: V[], radius: number, m: T.Material, smooth = true) {
  const curve = smooth ? new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point))) : new T.CurvePath<T.Vector3>()
  if (curve instanceof T.CurvePath) for (let i = 1; i < points.length; i++) curve.add(new T.LineCurve3(new T.Vector3(...points[i - 1]), new T.Vector3(...points[i])))
  return part(p, new T.TubeGeometry(curve, Math.max(16, points.length * 10), radius, 6, false), m)
}
function polygon(p: T.Object3D, points: V[], m: T.Material) {
  const geometry = new T.BufferGeometry(), indices: number[] = []
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1)
  geometry.setAttribute('position', new T.Float32BufferAttribute(points.flat(), 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  // Thin exterior panels have two visible sides in a downloadable orbit model.
  const panel = m.clone(); panel.side = T.DoubleSide
  return part(p, geometry, panel)
}
function label(p: T.Object3D, text: string, size: [number, number], pos: V, background = '#101419', color = '#d7dde0', rot: V = [0, 0, 0]) {
  const name = `mark-${text}-${background}`, m = material(name, background, .2, .4)
  teslaLabels.set(name, { text, background, color }); return part(p, new T.PlaneGeometry(...size), m, pos, rot)
}
function badge(p: T.Object3D, pos: V, size: number, m: T.Material, rot: V = [0, 0, 0]) {
  const mark = group(p, '', pos, rot)
  line(mark, [[-size * .5, 0, 0], [0, size * .07, 0], [size * .5, 0, 0]], size * .045, m)
  polygon(mark, [[-size * .18, -size * .07, 0], [size * .18, -size * .07, 0], [0, -size * .7, 0]], m)
}
function sample(knots: Knot[], t: number, smooth = true) {
  if (t <= knots[0][0]) return knots[0][1]
  for (let i = 1; i < knots.length; i++) if (t <= knots[i][0]) {
    const [a, av] = knots[i - 1], [b, bv] = knots[i], u = (t - a) / (b - a)
    if (!smooth) return T.MathUtils.lerp(av, bv, u)
    // Monotone cubic interpolation keeps the roof continuous without the
    // repeated flat spots produced by applying smoothstep to every interval.
    const slope = (bv - av) / (b - a)
    const previous = i > 1 ? (av - knots[i - 2][1]) / (a - knots[i - 2][0]) : slope
    const next = i < knots.length - 1 ? (knots[i + 1][1] - bv) / (knots[i + 1][0] - b) : slope
    const tangent = (left: number, right: number) => left * right <= 0 ? 0 : 2 * left * right / (left + right)
    return (2 * u ** 3 - 3 * u ** 2 + 1) * av + (u ** 3 - 2 * u ** 2 + u) * (b - a) * tangent(previous, slope) + (-2 * u ** 3 + 3 * u ** 2) * bv + (u ** 3 - u ** 2) * (b - a) * tangent(slope, next)
  }
  return knots.at(-1)![1]
}

// Closed longitudinal lofts provide true wheel-arch cut-outs and continuous
// body panels; lights, glazing, seams and running gear are separate geometry.
function loft(p: T.Object3D, z0: number, z1: number, section: (z: number) => [number, number][], m: T.Material, segments = 160) {
  const positions: number[] = [], indices: number[] = [], columns = section(z0).length
  for (let row = 0; row <= segments; row++) {
    const z = T.MathUtils.lerp(z0, z1, row / segments)
    for (const [x, y] of section(z)) positions.push(x, y, z)
  }
  for (let row = 0; row < segments; row++) for (let col = 0; col < columns; col++) {
    const a = row * columns + col, b = (row + 1) * columns + col, c = (row + 1) * columns + (col + 1) % columns, d = row * columns + (col + 1) % columns
    indices.push(a, b, c, a, c, d)
  }
  for (let i = 1; i < columns - 1; i++) { indices.push(0, i, i + 1); const start = segments * columns; indices.push(start, start + i + 1, start + i) }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return part(p, geometry, m)
}
function wheel(p: T.Object3D, pos: V, radius: number, width: number, m: Mats, style: 'split' | 'aero' | 'offroad' | 'truck' = 'split', side = 1) {
  const assembly = group(p, '', pos), tread = radius * .22
  const profile = [new T.Vector2(radius * .56, -width / 2), new T.Vector2(radius * .83, -width / 2), new T.Vector2(radius * .98, -width * .31), new T.Vector2(radius, -width * .17), new T.Vector2(radius, width * .17), new T.Vector2(radius * .98, width * .31), new T.Vector2(radius * .83, width / 2), new T.Vector2(radius * .56, width / 2)]
  part(assembly, new T.LatheGeometry(profile, 64), m.rubber, [0, 0, 0], [0, 0, Math.PI / 2])
  for (const offset of [-.24, .24]) part(assembly, new T.TorusGeometry(radius - .002, .006, 5, 64), m.black, [width * offset, 0, 0], [0, Math.PI / 2, 0])
  const x = side * (width / 2 + .002)
  cylinder(assembly, radius * .71, .018, [x - side * .055, 0, 0], m.silver, [0, 0, Math.PI / 2])
  cylinder(assembly, radius * .59, .022, [x - side * .031, 0, 0], m.dark, [0, 0, Math.PI / 2])
  box(assembly, [.05, radius * .51, radius * .19], [x - side * .012, 0, radius * .46], style === 'truck' ? m.dark : m.red, .025)
  part(assembly, new T.TorusGeometry(radius * .72, radius * .034, 8, 48), m.silver, [x, 0, 0], [0, Math.PI / 2, 0])
  if (style === 'aero') {
    cylinder(assembly, radius * .73, .023, [x, 0, 0], m.paint, [0, 0, Math.PI / 2], 64)
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8, vane = box(assembly, [.012, radius * .22, .014], [x + side * .016, Math.sin(angle) * radius * .56, Math.cos(angle) * radius * .56], m.dark, .004); vane.rotation.x = -angle
    }
  } else {
    for (let i = 0; i < (style === 'truck' ? 8 : 5); i++) {
      const angle = i * Math.PI * 2 / (style === 'truck' ? 8 : 5)
      for (const split of style === 'split' ? [-.07, .07] : [0]) {
        const a = angle + split
        beam(assembly, [x, Math.sin(a) * radius * .14, Math.cos(a) * radius * .14], [x, Math.sin(a + .13) * radius * .69, Math.cos(a + .13) * radius * .69], radius * .085, .03, style === 'offroad' ? m.dark : m.silver)
      }
    }
  }
  cylinder(assembly, radius * .18, .035, [x + side * .025, 0, 0], m.dark, [0, 0, Math.PI / 2])
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; cylinder(assembly, .009, .008, [x + side * .046, Math.sin(a) * radius * .105, Math.cos(a) * radius * .105], m.silver, [0, 0, Math.PI / 2], 8) }
  if (style === 'offroad') for (let i = 0; i < 40; i++) {
    const a = i * Math.PI / 20
    for (const shift of [-1, 1]) {
      const block = box(assembly, [width * .43, tread * .32, tread * .47], [shift * width * .22, Math.cos(a) * (radius - .002), Math.sin(a) * (radius - .002)], m.rubber, .008); block.rotation.x = a
    }
  }
}

function passengerCar(id: TeslaProductId, m: Mats) {
  const p = teslaProduct(id), [width, height, length] = p.dimensions, root = new T.Group()
  const y = id === 'tesla-model-y', x = id === 'tesla-model-x', roadster = id === 'tesla-roadster', cab = id === 'tesla-cybercab', s = id === 'tesla-model-s'
  const radius = (x ? .37 : y ? .36 : roadster ? .34 : .335), wheelZ = [-length * .298, length * .292]
  const body = group(root, 'body-shell'), glazing = group(root, 'glazing-and-trim'), running = group(root, 'wheels-and-chassis'), details = group(root, 'exterior-details')
  const widths: Knot[] = [[-.5, .73], [-.45, .95], [-.3, 1], [-.03, .98], [.24, .98], [.4, .97], [.48, .85], [.5, .70]]
  const heights: Knot[] = [[-.5, .52], [-.45, .64], [-.30, .69], [-.16, .69], [.13, .66], [.32, .64], [.47, .53], [.5, .46]]
  const bodyWidth = (z: number) => sample(widths, z / length) * width / 2
  const bodyHeight = (z: number) => sample(heights, z / length) * height
  const arch = (z: number) => Math.max(height * .16, ...wheelZ.map(wz => Math.abs(z - wz) < radius + .027 ? radius + Math.sqrt((radius + .027) ** 2 - (z - wz) ** 2) : 0))
  loft(body, -length / 2, length / 2, z => {
    const w = bodyWidth(z), top = bodyHeight(z), lower = Math.min(top - .055, arch(z))
    return [[-w * .88, lower], [-w, lower + .015], [-w, top - .095], [-w * .98, top - .027], [-w * .84, top + .008], [-w * .45, top + .024], [0, top + .029], [w * .45, top + .024], [w * .84, top + .008], [w * .98, top - .027], [w, top - .095], [w, lower + .015], [w * .88, lower]]
  }, m.paint, 240)
  box(running, [width * .77, .08, length * .49], [0, height * .18, 0], m.black, .045)
  for (const side of [-1, 1]) {
    for (const wz of wheelZ) wheel(running, [side * (width / 2 - .055), radius, wz], radius, .245, m, cab ? 'aero' : 'split', side)
    line(details, [[side * width * .96 / 2, height * .225, wheelZ[0] + radius], [side * width / 2, height * .215, 0], [side * width * .96 / 2, height * .225, wheelZ[1] - radius]], .027, m.black)
    if (y || x) for (const wz of wheelZ) {
      const points = Array.from({ length: 33 }, (_, i): V => { const a = i / 32 * Math.PI; return [side * (bodyWidth(wz + Math.cos(a) * (radius + .04)) + .004), radius + Math.sin(a) * (radius + .04), wz + Math.cos(a) * (radius + .04)] })
      line(details, points, .023, m.black)
    }
  }
  const front = length * (x ? .255 : roadster ? .14 : .215), rear = -length * (roadster ? .24 : .39)
  const roof: Knot[] = [[rear, height * .68], [-length * .21, height * (roadster ? .97 : .94)], [-length * .07, height], [length * .05, height * .967], [front, bodyHeight(front) + .04]]
  const cabinWidth = (z: number) => sample([[rear, .60], [-length * .21, .72], [-length * .07, .77], [length * .06, .77], [front, .82]], z) * width / 2
  const cabinBase = (z: number) => bodyHeight(z) + .008
  loft(glazing, rear, front, z => {
    const w = cabinWidth(z), base = cabinBase(z), top = Math.max(base + .004, sample(roof, z)), h = top - base
    return [[-w, base], [-w * .99, base + h * .18], [-w * .91, base + h * .70], [-w * .80, base + h * .94], [-w * .45, top - .004], [0, top], [w * .45, top - .004], [w * .80, base + h * .94], [w * .91, base + h * .70], [w * .99, base + h * .18], [w, base]]
  }, m.glass, 100)
  for (const side of [-1, 1]) {
    const trim = Array.from({ length: 30 }, (_, i): V => { const z = T.MathUtils.lerp(rear, front, i / 29); return [side * cabinWidth(z), cabinBase(z) + .007, z] })
    line(glazing, trim, .012, m.black)
    for (const direction of [-1, 1]) {
      const z0 = direction > 0 ? front : rear, z1 = direction > 0 ? length * .035 : -length * .20
      line(glazing, Array.from({ length: 24 }, (_, i): V => { const z = T.MathUtils.lerp(z0, z1, i / 23), base = cabinBase(z); return [side * cabinWidth(z) * .80, base + (sample(roof, z) - base) * .94 + .004, z] }), direction > 0 ? .014 : .026, m.paint)
    }
    if (!roadster && !cab) {
      const z = -length * .072, base = cabinBase(z), h = sample(roof, z) - base
      line(glazing, [[side * cabinWidth(z), base, z], [side * cabinWidth(z) * .99, base + h * .18, z], [side * cabinWidth(z) * .91, base + h * .70, z], [side * cabinWidth(z) * .8, base + h * .94, z]], .016, m.black, false)
    }
    const seams = roadster || cab ? [-length * .22, front] : [-length * .32, -length * .065, front]
    for (const z of seams) line(details, [[side * cabinWidth(z), cabinBase(z), z], [side * bodyWidth(z) * 1.003, bodyHeight(z) - .07, z], [side * bodyWidth(z) * 1.002, height * .36, z + .025], [side * bodyWidth(z) * .98, height * .235, z + .10]], .004, m.dark)
    for (const z of roadster || cab ? [-length * .17] : [length * .015, -length * .265]) {
      const handle = box(details, [.017, .021, .15], [side * bodyWidth(z) * 1.004, bodyHeight(z) - .075, z], m.dark, .009); handle.rotation.z = side * .04
    }
    if (!cab) {
      beam(details, [side * width * .40, bodyHeight(front), front - .03], [side * width * .52, bodyHeight(front) + .015, front + .065], .029, .034, m.black)
      const mirror = sphere(details, 1, [.125, .052, .12], [side * width * .535, bodyHeight(front) + .035, front + .075], m.paint)
      mirror.rotation.y = side * .12
    }
    // A subtle hood crease follows each front fender into the nose.
    line(details, Array.from({ length: 16 }, (_, i): V => { const z = T.MathUtils.lerp(front, length * .46, i / 15); return [side * bodyWidth(z) * .61, bodyHeight(z) + .024, z] }), .003, m.dark)
  }
  if (x) for (const side of [-1, 1]) line(details, [[side * width * .16, height * .999, -length * .19], [side * width * .32, height * .973, -length * .19], [side * width * .35, height * .925, -length * .22], [side * width * .41, height * .73, -length * .31]], .004, m.black)
  const frontZ = length * .487, lampY = bodyHeight(frontZ) + .025
  if (y || cab) {
    line(details, [[-width * .40, lampY, frontZ - .01], [0, lampY - .008, length * .505], [width * .40, lampY, frontZ - .01]], .018, m.black)
    line(details, [[-width * .39, lampY + .004, frontZ], [0, lampY - .004, length * .508], [width * .39, lampY + .004, frontZ]], .009, m.lamp)
  } else for (const side of [-1, 1]) {
    const points: V[] = [[side * width * .235, lampY - .025, frontZ + .018], [side * width * .34, lampY + .004, frontZ], [side * width * .422, lampY + .045, frontZ - .10]]
    line(details, points, s || x ? .028 : .024, m.black)
    line(details, points.map(([a, b, c]) => [a, b + .008, c + .006]), .008, m.lamp)
  }
  for (const side of [-1, 1]) {
    const vent = box(details, [width * .115, .055, .055], [side * width * .34, lampY - .16, length * .477], m.black, .025); vent.rotation.y = side * .25
    if (y) box(details, [width * .094, .02, .02], [side * width * .34, lampY - .143, length * .50], m.lamp)
    const tailPoints: V[] = [[side * width * .20, bodyHeight(-length / 2) - .048, -length * .502], [side * bodyWidth(-length / 2) * 1.014, bodyHeight(-length / 2) - .042, -length * .502], [side * bodyWidth(-length * .475) * 1.008, bodyHeight(-length * .475) - .055, -length * .475], [side * bodyWidth(-length * .445) * 1.005, bodyHeight(-length * .445) - .065, -length * .445]]
    line(details, tailPoints, .019, m.tail)
  }
  if (y || cab) line(details, [[-width * .34, bodyHeight(-length / 2) - .044, -length * .503], [0, bodyHeight(-length / 2) - .044, -length * .503], [width * .34, bodyHeight(-length / 2) - .044, -length * .503]], .010, m.tail)
  box(details, [width * .57, .058, .032], [0, height * .31, length * .503], m.black, .015)
  box(details, [width * .62, .055, .09], [0, height * .235, -length * .46], m.dark, .018)
  label(details, 'TESLA', [.32, .055], [0, bodyHeight(-length / 2) - .17, -length * .502], '#15191e', '#c2c8cc', [0, Math.PI, 0])
  badge(details, [0, bodyHeight(length * .44) + .035, length * .44], .095, m.silver, [-Math.PI / 2, 0, 0])
  return root
}

function cybertruck(m: Mats) {
  const root = new T.Group(), body = group(root, 'stainless-body'), cabin = group(root, 'angular-cabin'), trim = group(root, 'trim-and-lights'), running = group(root, 'all-terrain-wheels')
  const wheelZ = [-1.78, 1.68], radius = .445, half = 1.035
  const top = (z: number) => sample([[-2.84, 1.26], [-1.65, 1.38], [.1, 1.35], [1.50, 1.08], [2.84, 1.0]], z, false)
  const width = (z: number) => sample([[-2.84, .92], [-2.4, half], [2.40, half], [2.84, .95]], z, false)
  loft(body, -2.84, 2.84, z => {
    const w = width(z), h = top(z), lower = Math.max(.39, ...wheelZ.map(wz => Math.abs(wz - z) < radius + .047 ? radius + Math.sqrt((radius + .047) ** 2 - (z - wz) ** 2) : 0))
    return [[-w * .92, lower], [-w, lower + .02], [-w, h - .11], [-w * .98, h], [0, h + .012], [w * .98, h], [w, h - .11], [w, lower + .02], [w * .92, lower]]
  }, m.steel, 200)
  // The cabin is a wedge with distinct metal pillars and inset planar glass.
  const front: V[] = [[-.91, 1.115, 1.43], [.91, 1.115, 1.43], [.83, 1.87, -.37], [-.83, 1.87, -.37]]
  polygon(cabin, front, m.glass)
  polygon(cabin, [[-.83, 1.87, -.37], [.83, 1.87, -.37], [.96, 1.405, -1.60], [-.96, 1.405, -1.60]], m.steel)
  for (const side of [-1, 1]) {
    polygon(cabin, [[side * .91, 1.115, 1.43], [side * .83, 1.87, -.37], [side * .96, 1.405, -1.6], [side * 1.015, 1.36, -.4]], m.steel)
    polygon(cabin, [[side * .934, 1.37, .92], [side * .847, 1.803, -.35], [side * .923, 1.42, -1.44], [side * 1.009, 1.368, -.40]], m.glass)
    line(trim, [[side * .91, 1.115, 1.43], [side * .83, 1.87, -.37], [side * .96, 1.405, -1.60]], .019, m.steel, false)
    beam(trim, [side * .87, 1.78, -.28], [side * 1.016, 1.36, -.22], .031, .026, m.black)
    for (const z of [-1.58, -.32, 1.18]) line(trim, [[side * 1.019, top(z) - .012, z], [side * 1.038, .98, z], [side * 1.033, .52, z + .025]], .005, m.dark, false)
    for (const wz of wheelZ) {
      wheel(running, [side * 1.02, radius, wz], radius, .325, m, 'offroad', side)
      const points = Array.from({ length: 9 }, (_, i): V => { const a = i / 8 * Math.PI; return [side * 1.047, radius + Math.sin(a) * .505, wz + Math.cos(a) * .505] })
      line(trim, points, .055, m.black, false)
    }
    box(trim, [.11, .10, 2.43], [side * 1.046, .41, -.02], m.black, .02)
    beam(trim, [side * .96, 1.19, .99], [side * 1.21, 1.20, 1.02], .036, .034, m.black)
    const mirror = box(trim, [.19, .085, .19], [side * 1.24, 1.24, 1.02], m.black, .017); mirror.rotation.y = side * .18
  }
  const bed = group(root, 'covered-pickup-bed')
  for (let i = 0; i < 25; i++) {
    const z = -2.72 + i * 1.1 / 24
    box(bed, [1.77, .018, .035], [0, top(z) + .026, z], m.dark, .004)
  }
  box(trim, [1.96, .095, .055], [0, 1.014, 2.832], m.black, .007)
  box(trim, [1.88, .025, .02], [0, 1.045, 2.865], m.lamp, .005)
  for (const side of [-1, 1]) box(trim, [.24, .055, .03], [side * .69, .735, 2.852], m.lamp, .006)
  box(trim, [1.88, .075, .045], [0, 1.243, -2.85], m.black, .006)
  box(trim, [1.82, .025, .012], [0, 1.25, -2.88], m.tail, .003)
  box(trim, [1.95, .16, .13], [0, .47, 2.70], m.black, .023)
  box(trim, [1.96, .16, .16], [0, .46, -2.75], m.black, .018)
  box(running, [1.68, .12, 3.0], [0, .34, 0], m.black, .025)
  label(trim, 'CYBERTRUCK', [.59, .066], [0, .96, -2.846], '#a2a7aa', '#2a2e31', [0, Math.PI, 0])
  return root
}

function semi(m: Mats) {
  const root = new T.Group(), body = group(root, 'aerodynamic-cab'), glazing = group(root, 'panoramic-windscreen'), chassis = group(root, 'tractor-frame'), wheels = group(root, 'three-axle-running-gear')
  const radius = .51, frontAxle = 2.30, nose = 3.63
  // A tall tapered cab and a low nose surround the front axle. The rear frame
  // remains exposed so the tractor does not read as a delivery van.
  const cabWidth = (z: number) => sample([[-.35, 1.14], [.55, 1.22], [2.35, 1.18], [3.4, 1.04], [nose, .91]], z)
  const cabHeight = (z: number) => sample([[-.35, 3.6], [.10, 3.8], [1.12, 3.77], [2.10, 3.35], [2.95, 1.52], [nose, 1.19]], z)
  loft(body, -.35, nose, z => {
    const w = cabWidth(z), h = cabHeight(z)
    const lower = Math.abs(z - frontAxle) < .56 ? Math.max(.36, radius + Math.sqrt(.56 ** 2 - (z - frontAxle) ** 2)) : .36
    return [[-w * .85, lower], [-w, lower], [-w, h * .82], [-w * .9, h * .975], [-w * .60, h], [0, h + .015], [w * .60, h], [w * .9, h * .975], [w, h * .82], [w, lower], [w * .85, lower]]
  }, m.paint, 150)
  function glassPatch(point: (u: number, v: number) => V) {
    const positions: number[] = [], indices: number[] = [], rows = 56, cols = 24
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) positions.push(...point(col / cols, row / rows))
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) { const a = row * (cols + 1) + col, b = a + cols + 1; indices.push(a, b, b + 1, a, b + 1, a + 1) }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
    const glass = m.glass.clone(); glass.side = T.DoubleSide; part(glazing, geometry, glass)
  }
  // Glazing samples the actual cab surface instead of crossing it with a flat
  // plane. That keeps the wraparound windshield visible from every view.
  glassPatch((u, v) => {
    const z = T.MathUtils.lerp(1.82, 2.79, v), across = (u * 2 - 1) * .93, h = cabHeight(z)
    const surface = sample([[0, h + .015], [.60, h], [.9, h * .975], [1, h * .82]], Math.abs(across), false)
    return [across * cabWidth(z), surface + .017, z]
  })
  for (const side of [-1, 1]) {
    glassPatch((u, v) => {
      const z = T.MathUtils.lerp(.20, 2.08, v), h = cabHeight(z), y = T.MathUtils.lerp(1.98, Math.min(3.38, h * .94), u)
      const across = y / h < .82 ? 1 : sample([[.82, 1], [.975, .9], [1, .6]], y / h, false)
      return [side * (across * cabWidth(z) + .014), y, z]
    })
    line(body, [[side * 1.223, 3.0, .18], [side * 1.24, 1.30, .18], [side * 1.23, .73, .2], [side * 1.22, .73, 1.50]], .008, m.dark, false)
    for (const y of [.50, .71, .92]) box(body, [.08, .045, .72], [side * 1.23, y, .69], m.dark, .008)
    beam(body, [side * 1.15, 2.35, 2.18], [side * 1.42, 2.4, 2.2], .055, .06, m.black)
    box(body, [.14, .48, .21], [side * 1.43, 2.43, 2.22], m.black, .06)
    wheel(wheels, [side * 1.11, radius, frontAxle], radius, .30, m, 'truck', side)
    for (const z of [-1.43, -2.83]) for (const offset of [0, -.32]) wheel(wheels, [side * (1.08 + offset), radius, z], radius, .29, m, 'truck', side)
    box(chassis, [.17, .25, 4.0], [side * .55, .83, -1.55], m.dark, .012)
    for (const z of [-1.43, -2.83]) {
      const points = Array.from({ length: 25 }, (_, i): V => { const a = i / 24 * Math.PI; return [side * 1.1, radius + Math.sin(a) * .56, z + Math.cos(a) * .56] })
      line(chassis, points, .08, m.black)
    }
    line(body, [[side * .59, 1.36, 3.51], [side * .88, 1.40, 3.38], [side * 1.01, 1.32, 3.20]], .035, m.black)
    line(body, [[side * .59, 1.373, 3.523], [side * .88, 1.413, 3.394], [side * 1.01, 1.333, 3.212]], .012, m.lamp)
  }
  for (const z of [-1.43, -2.83]) cylinder(chassis, .1, 2.22, [0, radius, z], m.dark, [0, 0, Math.PI / 2])
  box(chassis, [2.25, .12, .34], [0, .52, -3.52], m.dark, .015)
  for (const side of [-1, 1]) box(chassis, [.34, .07, .024], [side * .87, .59, -3.7], m.tail, .008)
  cylinder(chassis, .61, .085, [0, 1.10, -1.85], m.dark)
  box(chassis, [.15, .105, .47], [0, 1.105, -2.33], m.black, .015)
  for (let i = 0; i < 12; i++) box(chassis, [1.50, .035, .035], [0, .97, -.72 - i * .09], m.silver, 0)
  line(chassis, [[-.25, 1.1, -.4], [-.34, 1.65, -.55], [.1, 1.80, -.6], [.28, 1.13, -.89]], .032, m.black)
  box(body, [1.58, .115, .025], [0, .63, 3.642], m.black, .027)
  label(body, 'TESLA', [.44, .086], [0, 1.055, 3.647], '#e6e8e8', '#363b40')
  return root
}

function optimus(m: Mats) {
  const root = new T.Group(), torso = group(root, 'torso'), head = group(root, 'head-and-visor'), arms = group(root, 'arms-and-articulated-hands'), legs = group(root, 'legs-and-feet')
  box(torso, [.29, .21, .16], [0, .95, -.012], m.black, .065)
  // Sculpted chest and waist shells wrap the visible black actuator core.
  loft(torso, -.102, .104, z => { const w = sample([[-.102, .10], [-.06, .187], [.07, .18], [.104, .12]], z); return [[-w * .66, 1.02], [-w, 1.17], [-w, 1.32], [-w * .75, 1.38], [w * .75, 1.38], [w, 1.32], [w, 1.17], [w * .66, 1.02]] }, m.white, 36)
  box(torso, [.125, .245, .052], [0, 1.16, -.12], m.dark, .035)
  for (let i = 0; i < 7; i++) box(torso, [.21, .018, .022], [0, 1.07 + i * .035, -.139], m.black, .006)
  cylinder(torso, .051, .065, [0, 1.404, 0], m.dark)
  const skull = sphere(head, 1, [.088, .134, .084], [0, 1.57, -.005], m.black)
  skull.rotation.x = -.04
  sphere(head, 1, [.077, .112, .037], [0, 1.565, .069], m.glass)
  line(head, [[-.065, 1.60, .079], [0, 1.624, .102], [.065, 1.60, .079]], .002, m.dark)
  for (const side of [-1, 1]) {
    const shoulder: V = [side * .22, 1.30, 0], elbow: V = [side * .28, 1.065, .025], wrist: V = [side * .30, .842, .040]
    sphere(arms, .067, [1, 1, 1], shoulder, m.dark)
    beam(arms, shoulder, elbow, .09, .092, m.white)
    sphere(arms, .047, [1, 1, 1], elbow, m.dark)
    cylinder(arms, .048, .098, elbow, m.silver, [0, 0, Math.PI / 2], 32)
    beam(arms, [elbow[0], elbow[1] - .035, elbow[2]], wrist, .086, .076, m.white)
    beam(arms, [side * .315, 1.02, .035], [side * .338, .90, .045], .014, .023, m.silver)
    sphere(arms, .03, [1, 1, 1], wrist, m.dark)
    box(arms, [.072, .087, .042], [side * .30, .783, .043], m.white, .022)
    for (let finger = 0; finger < 4; finger++) {
      const x = side * (.27 + finger * .019), length = [.066, .080, .076, .061][finger]
      for (let joint = 0; joint < 3; joint++) {
        const y = .736 - joint * length / 3, z = .047 + joint * .006
        box(arms, [.014, length / 3 - .003, .016], [x, y - length / 6, z], m.white, .004)
        cylinder(arms, .009, .016, [x, y, z], m.dark, [0, 0, Math.PI / 2], 12)
      }
    }
    beam(arms, [side * .258, .80, .04], [side * .237, .766, .062], .018, .020, m.white)
    beam(arms, [side * .237, .766, .062], [side * .240, .736, .074], .016, .018, m.white)
    const hip: V = [side * .092, .94, 0], knee: V = [side * .106, .555, .013], ankle: V = [side * .112, .165, -.016]
    sphere(legs, .071, [1, 1, 1], hip, m.dark)
    beam(legs, [hip[0], .886, .012], [knee[0], .608, .023], .124, .126, m.white)
    cylinder(legs, .051, .136, knee, m.dark, [0, 0, Math.PI / 2])
    box(legs, [.09, .073, .041], [side * .106, .56, .083], m.white, .021)
    beam(legs, [knee[0], .50, .007], [ankle[0], .23, -.010], .101, .104, m.white)
    beam(legs, [side * .108, .472, -.071], [side * .111, .219, -.052], .031, .03, m.silver)
    cylinder(legs, .035, .103, ankle, m.dark, [0, 0, Math.PI / 2])
    box(legs, [.118, .063, .224], [side * .114, .040, .058], m.black, .025)
    box(legs, [.107, .072, .172], [side * .114, .090, .044], m.white, .023)
    for (const x of [-.03, 0, .03]) box(legs, [.003, .017, .009], [side * .114 + x, .063, .170], m.dark, .001)
  }
  label(torso, 'TESLA', [.092, .024], [0, 1.297, .106], '#e9ebe9', '#6f777e')
  return root
}

function powerwall(m: Mats) {
  const root = new T.Group(), shell = group(root, 'cabinet-and-mount'), details = group(root, 'vents-and-markings')
  box(shell, [.56, 1.02, .04], [0, .53, -.071], m.dark, .024)
  box(shell, [.609, 1.09, .173], [0, .545, .001], m.white, .036)
  box(shell, [.581, .099, .165], [0, 1.04, .004], m.black, .02)
  box(shell, [.580, .959, .025], [0, .493, .087], m.white, .029)
  for (const side of [-1, 1]) for (let i = 0; i < 18; i++) box(details, [.003, .006, .101], [side * .304, .794 + i * .009, -.006], m.dark, .001)
  box(details, [.058, .006, .006], [0, .976, .100], m.green, .002)
  label(details, 'TESLA', [.145, .029], [0, .877, .104], '#e9ebe9', '#22282e')
  for (const x of [-.20, .20]) for (const y of [.115, .94]) cylinder(details, .009, .005, [x, y, -.094], m.silver, [Math.PI / 2, 0, 0], 12)
  return root
}

function megapack(m: Mats) {
  const root = new T.Group(), cabinet = group(root, 'modular-battery-cabinet'), cooling = group(root, 'cooling-array'), details = group(root, 'doors-and-hardware')
  box(cabinet, [8.80, .19, 1.66], [0, .095, 0], m.dark, .025)
  box(cabinet, [8.72, 2.58, 1.58], [0, 1.47, 0], m.white, .039)
  box(cabinet, [8.82, .07, 1.66], [0, 2.79, 0], m.white, .017)
  for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * 1.065
    box(details, [1.033, 2.33, .026], [x, 1.452, .809], m.white, .012)
    for (const y of [.65, 2.24]) box(details, [.021, .13, .026], [x - .484, y, .84], m.silver, .008)
    box(details, [.033, .13, .025], [x + .435, 1.35, .844], m.dark, .009)
    box(details, [.915, .115, .015], [x, 2.51, .834], m.dark, .009)
    for (let j = 0; j < 4; j++) box(details, [.905, .012, .02], [x, 2.465 + j * .026, .848], m.silver, .002)
    box(cooling, [.91, 2.09, .12], [x, 1.395, -.81], m.dark, .019)
    for (const y of [.91, 1.80]) {
      cylinder(cooling, .355, .032, [x, y, -.889], m.black, [Math.PI / 2, 0, 0], 48)
      for (let j = 0; j < 7; j++) { const a = j * Math.PI * 2 / 7, blade = box(cooling, [.28, .075, .026], [x + Math.cos(a) * .15, y + Math.sin(a) * .15, -.91], m.dark, .017); blade.rotation.z = a + .5 }
      for (const r of [.15, .25, .34]) part(cooling, new T.TorusGeometry(r, .006, 5, 40), m.silver, [x, y, -.927])
      cylinder(cooling, .069, .019, [x, y, -.925], m.dark, [Math.PI / 2, 0, 0])
    }
  }
  for (const x of [-4.35, 4.35]) for (const z of [-.75, .75]) box(cabinet, [.08, .24, .11], [x, .14, z], m.dark, .01)
  label(details, 'TESLA', [.58, .115], [-3.76, 2.15, .838], '#e9ebe9', '#343b40')
  label(details, 'MEGAPACK', [.62, .063], [-3.76, 1.98, .838], '#e9ebe9', '#5e666b')
  return root
}

function supercharger(m: Mats) {
  const root = new T.Group(), cabinet = group(root, 'v4-charging-post'), cable = group(root, 'charging-cable-and-connector')
  box(cabinet, [.51, .07, .29], [0, .035, 0], m.dark, .017)
  box(cabinet, [.545, 1.89, .279], [0, 1.015, 0], m.white, .10)
  box(cabinet, [.399, 1.676, .014], [0, 1.068, .137], m.black, .070)
  box(cabinet, [.299, .035, .009], [0, 1.786, .151], m.dark, .008)
  label(cabinet, 'TESLA', [.245, .048], [0, 1.823, .152], '#0e1115', '#dce1e1')
  label(cabinet, '1A', [.077, .056], [0, .378, .153], '#0e1115', '#a8afb3')
  box(cabinet, [.10, .055, .011], [.098, .94, .15], m.dark, .012)
  box(cabinet, [.074, .027, .006], [.098, .95, .159], m.glass, .005)
  line(cable, [[-.262, 1.66, -.028], [-.374, 1.51, .035], [-.4, .52, .08], [-.285, .20, .13], [.07, .255, .18], [.307, .73, .10], [.285, 1.14, .084]], .021, m.black)
  const connector = box(cable, [.077, .177, .084], [.287, 1.206, .08], m.black, .022); connector.rotation.z = -.14
  box(cable, [.092, .043, .065], [.280, 1.302, .077], m.silver, .015)
  box(cabinet, [.03, .12, .035], [.28, 1.25, .015], m.dark, .012)
  return root
}

function batchStatic(root: T.Object3D) {
  // Preserve named assemblies, but bake helper transforms and batch their
  // static surfaces by material so each tire tread/robot joint isn't a draw.
  for (const child of [...root.children]) if (!(child instanceof T.Mesh) && !child.name) {
    child.updateMatrix()
    for (const part of [...child.children]) { part.applyMatrix4(child.matrix); root.add(part) }
    root.remove(child)
  }
  if (root.children.some(child => !(child instanceof T.Mesh) && !child.name)) { batchStatic(root); return }
  for (const child of root.children) if (!(child instanceof T.Mesh)) batchStatic(child)
  const batches = new Map<string, { material: T.Material; geometries: T.BufferGeometry[] }>()
  for (const child of [...root.children]) {
    if (!(child instanceof T.Mesh) || Array.isArray(child.material)) continue
    child.updateMatrix()
    const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()
    geo.applyMatrix4(child.matrix)
    if (!teslaLabels.has(child.material.name)) geo.deleteAttribute('uv')
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name)
    const key = child.material.name + ':' + child.material.side
    const batch: { material: T.Material; geometries: T.BufferGeometry[] } = batches.get(key) || { material: child.material, geometries: [] }
    batch.geometries.push(geo); batches.set(key, batch)
    child.geometry.dispose(); root.remove(child)
  }
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries)
    if (!geometry) throw new Error(`Cannot batch Tesla material: ${batch.material.name}`)
    part(root, geometry, batch.material).name = batch.material.name
    batch.geometries.forEach(g => g.dispose())
  }
}

export function buildTeslaModel(id: TeslaProductId) {
  const colors: Partial<Record<TeslaProductId, string>> = { 'tesla-model-y': '#7b9baf', 'tesla-model-s': '#8f1529', 'tesla-roadster': '#c91d25', 'tesla-cybercab': '#bca178' }
  const m = materials(colors[id], id === 'tesla-cybercab' ? .75 : .48)
  const model = id === 'tesla-cybertruck' ? cybertruck(m) : id === 'tesla-semi' ? semi(m) : id === 'tesla-optimus' ? optimus(m) : id === 'tesla-powerwall-3' ? powerwall(m) : id === 'tesla-megapack' ? megapack(m) : id === 'tesla-supercharger-v4' ? supercharger(m) : passengerCar(id, m)
  model.name = id
  batchStatic(model)
  model.updateMatrixWorld(true)
  const bounds = new T.Box3().setFromObject(model), center = bounds.getCenter(new T.Vector3())
  model.position.set(-center.x, -bounds.min.y, -center.z)
  model.userData = { product: teslaProduct(id).name, units: 'metres', provenance: '3D Studio original exterior reconstruction', engineeringAccuracy: false }
  return model
}
