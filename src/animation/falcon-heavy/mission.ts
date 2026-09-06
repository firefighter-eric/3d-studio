export const DURATION = 56
export const TOUCHDOWNS = [49, 49.65] as const
export const PAD_TOP = .22
export const LEG_ANGLE = 2.22
// Lowest point of the exported articulated foot, with the leg fully unfolded.
export const REST_HEIGHT = PAD_TOP - (3.4 + 7.74 * Math.cos(LEG_ANGLE) - .415 * Math.sin(LEG_ANGLE))
export const PADS = [[-145, 0, 52], [145, 0, -52]] as const
export type CameraMode = 'director' | 'pair' | 'left' | 'right'
export type V3 = [number, number, number]
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))
export const mix = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (start: number, end: number, t: number) => { const x = clamp((t - start) / (end - start)); return x * x * (3 - 2 * x) }

export const phases = [
  { id: 'separation', time: 0, title: '三芯飞行 · 双侧分离', short: '分离', detail: '两枚侧助推器从中央芯级分离。中央芯级带着上面级继续上升，回收镜头跟随两枚侧芯。' },
  { id: 'boostback', time: 8, title: '翻转 · 返场点火', short: '返场', detail: '侧助推器转向并点火，改变水平运动方向，分别返回各自的着陆区。' },
  { id: 'entry', time: 18, title: '再入点火', short: '再入', detail: '发动机朝向来流，短暂点火减速。四片栅格翼展开，调整下降方向。' },
  { id: 'descent', time: 25, title: '并行下降', short: '下降', detail: '两枚助推器分别对准 LZ-1 与 LZ-2。持续跟随双芯下降，随后切换到同时显示两处着陆区的海岸全景。' },
  { id: 'landing', time: 34, title: '着陆点火', short: '减速', detail: '中央 Merlin 发动机重新点火，持续降低下降速度。两枚助推器独立控制最后进近。' },
  { id: 'legs', time: 41, title: '展开着陆腿', short: '展腿', detail: '四条碳纤维着陆腿绕铰链向外展开，伸缩支柱随之延伸，准备支撑箭体。' },
  { id: 'touchdown', time: 49, title: '双芯着陆', short: '落地', detail: '两枚助推器先后接地，各自关机。最后停留片刻，看烟尘散去、两枚火箭并肩矗立。' },
] as const
export const references = [
  { label: 'SpaceX 官方影片 · 双芯着陆镜头 01:22', url: 'https://www.youtube.com/watch?v=A0FZIwabctw&t=82s' },
  { label: 'SpaceX · Falcon Heavy', url: 'https://www.spacex.com/vehicles/falcon-heavy/' },
  { label: 'SpaceX · Falcon 用户指南', url: 'https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf' },
]

// Cubic Hermite interpolation preserves velocities at cuts in the edit and
// avoids the repeated stop/start motion of easing every altitude keyframe.
const altitudeKeys = [
  [0, 2200, 45], [6, 2490, 48], [14, 2810, 0], [18, 2530, -115],
  [25, 1320, -185], [30, 550, -95], [34, 260, -52], [40, 66, -16],
  [44, 22, -6], [47, 6, -4], [49, 0, 0],
] as const
export function altitudeAt(time: number) {
  const t = clamp(time, 0, TOUCHDOWNS[0])
  const i = Math.max(0, altitudeKeys.findIndex((key, j) => j < altitudeKeys.length - 1 && t >= key[0] && t <= altitudeKeys[j + 1][0]))
  const [t0, y0, v0] = altitudeKeys[i], [t1, y1, v1] = altitudeKeys[i + 1]
  const h = t1 - t0, u = (t - t0) / h
  return Math.max(0, (2*u**3-3*u*u+1)*y0+(u**3-2*u*u+u)*h*v0+(-2*u**3+3*u*u)*y1+(u**3-u*u)*h*v1)
}

export type BoosterSample = {
  position: V3; rotation: V3; altitude: number; legs: number; fins: number;
  throttle: number; engines: number; landed: boolean; pad: 0 | 1;
}
export function sampleFlight(value: number) {
  const time = clamp(value, 0, DURATION)
  const boosters = PADS.map((pad, index): BoosterSample => {
    const side = index === 0 ? -1 : 1
    const delay = TOUCHDOWNS[index] - TOUCHDOWNS[0]
    const t = time - delay * smooth(5, 34, time)
    const separation = smooth(3, 10, time), returned = smooth(10, 33, time)
    const altitude = altitudeAt(t), landed = time >= TOUCHDOWNS[index]
    const boostback = smooth(8, 9.2, t) * (1 - smooth(13.3, 14.3, t))
    const entry = smooth(18, 18.7, t) * (1 - smooth(23, 24.2, t))
    const landing = smooth(34, 34.7, t) * (1 - smooth(48.9, 49, t))
    const departing = 1 - smooth(2.9, 3.15, time)
    const throttle = Math.max(departing * .8, boostback * .82, entry * .7, landing * (.8 - .32*smooth(40, 49, t)))
    const flip = smooth(6, 10, time) * (1 - smooth(14.3, 18, time))
    return {
      pad: index as 0 | 1, altitude, landed,
      position: [mix(side*(4.25+separation*65), pad[0], returned), REST_HEIGHT+altitude, mix(-1600 + time*12, pad[2], returned)],
      rotation: [flip*2.15+.05*(1-returned), .08*side*separation, side*(.12*separation*(1-returned) + .035*Math.sin(t*.5)*smooth(17, 22, t)*(1-smooth(32, 45, t)))],
      legs: smooth(41, 45, t), fins: smooth(15, 18, t),
      throttle: landed ? 0 : throttle, engines: landed || throttle < .002 ? 0 : departing > .01 ? 9 : landing > 0 ? 1 : 3,
    }
  }) as [BoosterSample, BoosterSample]
  const phase = [...phases].reverse().find(p => time >= p.time)!
  const center: V3 = [0, 2200 + 45*time + .5*5*time*time + REST_HEIGHT, -1600 + 12*time]
  return { time, phase, boosters, center, centerVisible: time < 14, complete: time >= DURATION }
}
export type FlightSample = ReturnType<typeof sampleFlight>
export const formatTime = (t: number) => `00:${Math.floor(clamp(t, 0, DURATION)).toString().padStart(2, '0')}`

export class FlightPlayer {
  time = 0
  playing = false
  speed = 1
  seek(t: number) { this.time = clamp(t, 0, DURATION); if (this.time === DURATION) this.playing = false }
  toggle() { if (this.time === DURATION) this.time = 0; this.playing = !this.playing }
  reset() { this.time = 0; this.playing = false }
  step(dt: number) { if (this.playing && Number.isFinite(dt) && dt > 0) this.seek(this.time + Math.min(dt, .1)*this.speed); return sampleFlight(this.time) }
}
