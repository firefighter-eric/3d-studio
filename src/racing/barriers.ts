import { TRACK, ROAD_HALF_WIDTH, nearestTrack } from './track'

// The renderer and collision solver use the same continuous wall sections.
export const BARRIER_OFFSET = ROAD_HALF_WIDTH + 2.8
export const BARRIER_HALF_THICKNESS = .15
export const BARRIER_INNER = BARRIER_OFFSET - BARRIER_HALF_THICKNESS
const CONTACT_GAP = .055
// Includes the wings, fully steered front wheels and maximum body roll.
export const CAR_FOOTPRINT = { halfWidth: 1.54, front: 2.53, rear: 2.34 } as const
const CAR_RADIUS = Math.hypot(CAR_FOOTPRINT.halfWidth, CAR_FOOTPRINT.front)

interface Point { x: number; z: number }
export interface BarrierSection {
  points: Point[]; nx: number; nz: number; side: number; s: number
  minX: number; maxX: number; minZ: number; maxZ: number
}
interface CarBody { x: number; z: number; yaw: number; vx: number; vz: number; trackIndex: number }

export const BARRIER_SECTIONS: BarrierSection[][] = TRACK.map((a, i) => {
  const b = TRACK[(i + 1) % TRACK.length]
  return [-1, 1].map(side => {
    const points = [[a, BARRIER_INNER], [b, BARRIER_INNER], [b, BARRIER_OFFSET + BARRIER_HALF_THICKNESS], [a, BARRIER_OFFSET + BARRIER_HALF_THICKNESS]].map(([p, offset]) => {
      const point = p as typeof a, distance = offset as number
      return { x: point.x + point.nx * side * distance, z: point.z + point.nz * side * distance }
    })
    const dx = points[1].x - points[0].x, dz = points[1].z - points[0].z, length = Math.hypot(dx, dz)
    const sign = (dz * a.nx - dx * a.nz) * side >= 0 ? 1 : -1
    return { points, nx: dz / length * sign, nz: -dx / length * sign, side, s: a.s,
      minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
      minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) }
  })
})

export function carFootprint(body: Pick<CarBody, 'x' | 'z' | 'yaw'>): Point[] {
  const sin = Math.sin(body.yaw), cos = Math.cos(body.yaw)
  return [[-CAR_FOOTPRINT.halfWidth, CAR_FOOTPRINT.front], [CAR_FOOTPRINT.halfWidth, CAR_FOOTPRINT.front], [CAR_FOOTPRINT.halfWidth, -CAR_FOOTPRINT.rear], [-CAR_FOOTPRINT.halfWidth, -CAR_FOOTPRINT.rear]].map(([x, z]) => ({
    x: body.x + cos * x + sin * z, z: body.z - sin * x + cos * z,
  }))
}

function overlaps(a: Point[], b: Point[]) {
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length], nx = q.z - p.z, nz = p.x - q.x
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity
    for (const v of a) { const d = v.x * nx + v.z * nz; aMin = Math.min(aMin, d); aMax = Math.max(aMax, d) }
    for (const v of b) { const d = v.x * nx + v.z * nz; bMin = Math.min(bMin, d); bMax = Math.max(bMax, d) }
    if (aMax < bMin || bMax < aMin) return false
  }
  return true
}

/** Keep the entire rotated hull on the road side, including after another car pushes it. */
export function resolveCarBarriers(body: CarBody): boolean {
  const center = nearestTrack(body.x, body.z, body.trackIndex)
  if (Math.abs(center.offset) + CAR_RADIUS + CONTACT_GAP < BARRIER_INNER) return false
  let collided = false
  // Recover toward the road even if a pile-up moved the centre beyond a thin wall.
  if (Math.abs(center.offset) > BARRIER_INNER - CONTACT_GAP) {
    const side = Math.sign(center.offset), offset = side * (BARRIER_INNER - CONTACT_GAP)
    body.x = center.x + center.nx * offset; body.z = center.z + center.nz * offset
    collided = true
  }
  for (let pass = 0; pass < 5; pass++) {
    let moved = false
    let hull = carFootprint(body)
    for (let j = -17; j <= 17; j++) for (const wall of BARRIER_SECTIONS[(center.index + j + TRACK.length) % TRACK.length]) {
      if (body.x + CAR_RADIUS < wall.minX || body.x - CAR_RADIUS > wall.maxX || body.z + CAR_RADIUS < wall.minZ || body.z - CAR_RADIUS > wall.maxZ) continue
      if (!overlaps(hull, wall.points)) continue
      const origin = wall.points[0]
      const penetration = Math.max(...hull.map(p => (p.x - origin.x) * wall.nx + (p.z - origin.z) * wall.nz))
      if (penetration < 0) continue
      body.x -= wall.nx * (penetration + CONTACT_GAP); body.z -= wall.nz * (penetration + CONTACT_GAP)
      const outwardSpeed = body.vx * wall.nx + body.vz * wall.nz
      if (outwardSpeed > 0) { body.vx -= wall.nx * outwardSpeed * 1.08; body.vz -= wall.nz * outwardSpeed * 1.08 }
      moved = collided = true; hull = carFootprint(body)
    }
    if (!moved) break
  }
  return collided
}

function insideWallRing(x: number, z: number, sideIndex: number) {
  let inside = false
  for (const section of BARRIER_SECTIONS) {
    const [a, b] = section[sideIndex].points
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside
  }
  return inside
}

/** Measure the rendered inner wall polyline, independently of the SAT solver. */
export function carBarrierClearance(body: Pick<CarBody, 'x' | 'z' | 'yaw' | 'trackIndex'>): number {
  const hull = carFootprint(body)
  const index = nearestTrack(body.x, body.z, body.trackIndex).index
  let clearance = Infinity
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length]
    for (let j = 0; j <= 4; j++) {
      const x = a.x + (b.x - a.x) * j / 4, z = a.z + (b.z - a.z) * j / 4
      let closest = Infinity, signedDistance = Infinity
      for (let k = -22; k <= 22; k++) for (const wall of BARRIER_SECTIONS[(index + k + TRACK.length) % TRACK.length]) {
        const [start, end] = wall.points, dx = end.x - start.x, dz = end.z - start.z
        const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / (dx * dx + dz * dz)))
        const ox = x - start.x - dx * t, oz = z - start.z - dz * t, distance = ox * ox + oz * oz
        if (distance < closest) { closest = distance; signedDistance = Math.sqrt(distance) }
      }
      // A nearest segment's normal is ambiguous at concave joins; use the actual
      // closed wall rings to distinguish the driving corridor from its exterior.
      if (!insideWallRing(x, z, 1) || insideWallRing(x, z, 0)) signedDistance *= -1
      clearance = Math.min(clearance, signedDistance)
    }
  }
  return clearance
}
