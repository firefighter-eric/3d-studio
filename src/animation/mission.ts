/** Flight 5 inspired choreography. Metres and seconds; reconstructed, not telemetry. */
export type Vec3 = [number, number, number]
export type CameraMode = 'director' | 'follow' | 'tower' | 'detail'
export type PlaybackSpeed = 'director' | '1' | '4' | '8'
export const START = -10
export const END = 425
export const SEPARATION = 161
export const RING_RELEASE = 221
export const CATCH = 419
export const SITE = { towerX: -32, launchZ: 28, launchHeight: 25, catchHeight: 20, armTop: 82, pinHeight: 62, boosterHeight: 68, shipHeight: 50, ringHeight: 3 }

export const phases = [
  { id: 'countdown', time: -10, title: '点火准备', short: '点火', detail: '发射台供水启动，33 台猛禽发动机依次建立推力。塔臂位于打开位置。', engines: '33 台发动机准备' },
  { id: 'ascent', time: 0, title: '起飞与爬升', short: '起飞', detail: '组合体离开发射台，逐渐向海上倾转。助推器的 33 台发动机提供上升推力。', engines: '33 台 · 上升推进' },
  { id: 'hotstage', time: 159, title: '热分级', short: '热分级', detail: '助推器保留 3 台中心发动机；星舰的 6 台发动机点火，经过热分级环排气后分离。', engines: '助推器 3 台 / 星舰 6 台' },
  { id: 'boostback', time: 165, title: '翻转与返场点火', short: '返场', detail: '助推器翻转，13 台内圈发动机执行返场点火，减小向海上飞行的速度，转向发射场。', engines: '13 台 · 返场推进' },
  { id: 'coast', time: 220, title: '关机与抛环', short: '抛环', detail: '返场点火结束，热分级环被抛弃以减轻重量。助推器沿弹道继续滑行，星舰独立飞向太空。', engines: '0 台 · 无动力飞行' },
  { id: 'descent', time: 280, title: '大气层下降', short: '下降', detail: '助推器保持发动机朝下，利用栅格翼调整姿态与落点。这一过程没有猎鹰 9 号式的再入点火。', engines: '0 台 · 栅格翼控制' },
  { id: 'landing', time: 391, title: '着陆点火', short: '减速', detail: '13 台发动机重新点火消除下降速度，随后外侧 10 台关闭，由中心 3 台进行最后进近。', engines: '13 → 3 台 · 着陆推进' },
  { id: 'approach', time: 409, title: '塔架进近', short: '进近', detail: '中心 3 台发动机控制低速下降和横向修正。塔臂对准助推器上部的捕获支点。', engines: '3 台 · 精确进近' },
  { id: 'caught', time: CATCH, title: '塔臂承接', short: '捕获', detail: '上部捕获支点落在塔臂承托面，发动机关机。助推器悬挂于塔架，星舰上面级仍在独立飞行。', engines: '0 台 · 塔臂承重' },
] as const
export const references = [
  { label: 'SpaceX · 第五次试飞官方影片', url: 'https://www.youtube.com/watch?v=hI9HQfCAw64' },
  { label: 'SpaceX · 试飞与回收说明', url: 'https://www.spacex.com/updates/' },
] as const

type Key = { t: number; p: Vec3; v?: Vec3 }
const trajectory: Key[] = [
  { t: START, p: [0, 25, 28] }, { t: 0, p: [0, 25, 28] },
  { t: 10, p: [3, 145, 28] }, { t: 30, p: [140, 1600, 28] },
  { t: 60, p: [1700, 8800, 28] }, { t: 120, p: [18500, 38000, 28] },
  { t: 161, p: [46000, 67000, 28], v: [700, 600, 0] }, { t: 190, p: [60000, 82000, 28], v: [180, 400, 0] },
  { t: 220, p: [59000, 92000, 28], v: [-320, 260, 0] }, { t: 245, p: [49000, 96000, 28], v: [-420, 0, 0] },
  { t: 280, p: [37500, 88500, 28] }, { t: 320, p: [18000, 52000, 28] },
  { t: 355, p: [5800, 22200, 28] }, { t: 375, p: [1450, 8200, 28] },
  { t: 391, p: [190, 1850, 28] }, { t: 400, p: [42, 405, 23] },
  { t: 409, p: [7, 97, 9] }, { t: 414, p: [1.6, 41, 2.6] },
  { t: 418, p: [0, 21.6, 0] }, { t: CATCH, p: [0, 20, 0] },
  { t: END, p: [0, 20, 0] },
]
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a), 0, 1); return u * u * (3 - 2 * u) }
const mix = (a: number, b: number, u: number) => a + (b - a) * u

// Shape-preserving cubic Hermite interpolation prevents overshooting the ground or catch.
function slope(keys: Key[], index: number, axis: number): number {
  if (keys[index].v) return keys[index].v![axis]
  if (index === 0 || index === keys.length - 1) return 0
  const a = keys[index - 1], b = keys[index], c = keys[index + 1]
  const h0 = b.t - a.t, h1 = c.t - b.t
  const d0 = (b.p[axis] - a.p[axis]) / h0, d1 = (c.p[axis] - b.p[axis]) / h1
  if (d0 * d1 <= 0) return 0
  const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0
  return (w0 + w1) / (w0 / d0 + w1 / d1)
}
function curve(keys: Key[], time: number): Vec3 {
  const t = clamp(time, keys[0].t, keys.at(-1)!.t)
  let i = 0
  while (i < keys.length - 2 && t > keys[i + 1].t) i++
  const a = keys[i], b = keys[i + 1], h = b.t - a.t, u = (t - a.t) / h
  return a.p.map((v, axis) => (2*u**3 - 3*u**2 + 1)*v + (u**3 - 2*u**2 + u)*h*slope(keys, i, axis) + (-2*u**3 + 3*u**2)*b.p[axis] + (u**3 - u**2)*h*slope(keys, i + 1, axis)) as Vec3
}
export function boosterAngle(t: number) {
  const ascent = -0.92 * smooth(15, 159, t)
  if (t < 162) return ascent
  if (t < 179) return mix(-0.92, 1.24, smooth(162, 179, t))
  if (t < 216) return 1.24
  if (t < 256) return mix(1.24, 0, smooth(216, 256, t))
  return -0.055 * Math.sin((t - 256) * .033) * (1 - smooth(391, 417, t))
}
export function offset(p: Vec3, angle: number, height: number): Vec3 { return [p[0] - Math.sin(angle)*height, p[1] + Math.cos(angle)*height, p[2]] }
// After separation the curve tracks a reference centre of mass. Convert it
// back to an engine-plane origin so attitude changes rotate about the body.
function boosterPosition(t: number): Vec3 {
  const base = curve(trajectory, t), angle = boosterAngle(t)
  const pivotBlend = smooth(SEPARATION, 179, t)*(1-smooth(375, 409, t))
  return [base[0]+Math.sin(angle)*34*pivotBlend, base[1]+(1-Math.cos(angle))*34*pivotBlend-.22*smooth(CATCH,CATCH+1.8,t), base[2]]
}
const sepPosition = offset(curve(trajectory, SEPARATION), boosterAngle(SEPARATION), SITE.boosterHeight + SITE.ringHeight)
const sepBefore = curve(trajectory, SEPARATION-.001), sepAfter = curve(trajectory, SEPARATION+.001)
const sepVelocity = sepAfter.map((v,i) => (v-sepBefore[i])/.002) as Vec3
function earlyShip(t: number): Vec3 {
  const dt = t-SEPARATION
  return sepPosition.map((v,i) => v+sepVelocity[i]*dt+[10,6,0][i]*dt*dt) as Vec3
}
const shipKeys: Key[] = [
  { t: 185, p: earlyShip(185) }, { t: 190, p: earlyShip(190), v: sepVelocity.map((v,i) => v+[20,12,0][i]*29) as Vec3 },
  { t: 240, p: [148000, 129000, 28] }, { t: 330, p: [351000, 163000, 28] },
  { t: END + 30, p: [758000, 183000, 28] },
]
const ringAnchor = (t: number) => offset(boosterPosition(t), boosterAngle(t), SITE.boosterHeight)
const ringReleasePos = ringAnchor(RING_RELEASE)
const ringBefore = ringAnchor(RING_RELEASE-.001), ringAfter = ringAnchor(RING_RELEASE+.001)
const ringVelocity = ringAfter.map((v,i) => (v-ringBefore[i])/.002) as Vec3

/** Per-engine thrust envelopes make ignition/shutdown continuous when seeking. */
export function enginePower(t: number, index: number, ship = false) {
  const burn = (start: number, end: number) => smooth(start, start+.45, t)*(1-smooth(end-.18, end, t))
  if (ship) return smooth(160+index*.035, 160.55+index*.035, t)
  const inner = index >= 20, center = index >= 30, stagger = (index%5)*.028
  const ascent = burn(-3+stagger, center ? 220 : 159)
  const boostback = inner && !center ? burn(165+stagger, 220) : 0
  const landing = inner ? burn(391+stagger, center ? CATCH : 402) : 0
  return Math.max(ascent, boostback, landing)
}

export function sampleMission(input: number) {
  const time = clamp(Number.isFinite(input) ? input : START, START, END)
  const position = boosterPosition(time), angle = boosterAngle(time)
  const separated = time >= SEPARATION
  const shipPosition = separated ? time < 190 ? earlyShip(time) : curve(shipKeys, time) : offset(position, angle, 71)
  const sinceRelease = Math.max(0, time - RING_RELEASE)
  const eject = smooth(0, 1.2, sinceRelease)*1.6
  const ringPosition = time < RING_RELEASE ? offset(position, angle, SITE.boosterHeight) : ringReleasePos.map((v,i) => v+ringVelocity[i]*sinceRelease+(i === 1 ? -4.4*sinceRelease**2 : i === 2 ? eject : 0)) as Vec3
  let boosterEngines = 0
  if (time >= -3 && time < 159) boosterEngines = 33
  else if (time >= 159 && time < 165) boosterEngines = 3
  else if (time >= 165 && time < 220) boosterEngines = 13
  else if (time >= 391 && time < 402) boosterEngines = 13
  else if (time >= 402 && time < CATCH) boosterEngines = 3
  const throttle = boosterEngines === 0 ? 0 : time < 0 ? smooth(-3, -1, time) : time >= 391 ? mix(.95, .35, smooth(393, 418.8, time)) : .95
  const before = boosterPosition(Math.max(START, time - .025)), after = boosterPosition(Math.min(END, time + .025))
  const speed = Math.hypot(...after.map((value, i) => (value - before[i]) / .05))
  return {
    time, position, angle, speed, separated,
    shipPosition, shipAngle: separated ? mix(-.92, -1.48, smooth(161, 390, time)) : angle,
    shipEngines: time >= 160 ? 6 : 0,
    ringPosition, ringAngle: time < RING_RELEASE ? angle : boosterAngle(RING_RELEASE) + sinceRelease*.065,
    ringReleased: time >= RING_RELEASE,
    boosterEngines, throttle, caught: time >= CATCH,
    armClosure: smooth(408, 418.3, time),
    // Small common support deflection keeps pins in contact during load transfer.
    supportDrop: .22*smooth(CATCH, CATCH+1.8, time),
    gimbal: .035*Math.sin(time*.55)*(smooth(391,393,time)*(1-smooth(416,419,time))) + .012*Math.sin(time*.19)*smooth(0,8,time)*(1-smooth(150,159,time)),
    finDeflection: -.17*Math.sin(time*.12)*smooth(250,295,time)*(1-smooth(409,418,time)),
    phase: [...phases].reverse().find(p => time >= p.time) ?? phases[0],
  }
}
export type MissionSample = ReturnType<typeof sampleMission>
export function directorRate(time: number) {
  if (time < 16) return 1
  if (time < 145) return 8
  if (time < 180) return 2
  if (time < 360) return 8
  if (time < 391) return 3
  return 1
}
export function formatTime(t: number) {
  const total = Math.floor(Math.abs(t) + .0001)
  return `T${t < 0 ? '−' : '+'}${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
export class MissionPlayer {
  time = START
  playing = false
  speed: PlaybackSpeed = 'director'
  revision = 0
  seek(time: number) { this.time = clamp(Number.isFinite(time) ? time : START, START, END); this.revision++ }
  toggle() { if (this.time >= END) this.seek(START); this.playing = !this.playing }
  reset() { this.seek(START); this.playing = false }
  advance(realSeconds: number) {
    if (!this.playing || !Number.isFinite(realSeconds) || realSeconds <= 0) return
    // A stalled/background frame cannot jump across an entire mission phase.
    let remaining = Math.min(realSeconds, .12)
    while (remaining > 0) {
      const dt = Math.min(remaining, 1/120)
      this.time = Math.min(END, this.time + dt * (this.speed === 'director' ? directorRate(this.time) : Number(this.speed)))
      remaining -= dt
    }
    if (this.time >= END) this.playing = false
  }
}
