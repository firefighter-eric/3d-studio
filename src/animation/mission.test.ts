import assert from 'node:assert/strict'
import test from 'node:test'
import { CATCH, END, enginePower, MissionPlayer, phases, RING_RELEASE, sampleMission, SEPARATION, SITE, START } from './mission'
import { missionCamera } from './camera'
import { Raycaster, Vector3 } from 'three'
import { buildSite, disposeStructure } from './LaunchSite'

test('reconstructed recovery separates the ship and ring and catches only the booster', () => {
  assert.equal(sampleMission(SEPARATION-.01).separated, false)
  assert.equal(sampleMission(SEPARATION).separated, true)
  assert.equal(sampleMission(RING_RELEASE-.01).ringReleased, false)
  assert.equal(sampleMission(RING_RELEASE).ringReleased, true)
  const final = sampleMission(CATCH)
  assert.equal(final.caught, true)
  assert.equal(final.boosterEngines, 0)
  assert.equal(final.shipEngines, 6)
  assert.ok(final.shipPosition[0] > 500000, 'upper stage continues downrange instead of returning with the booster')
  assert.equal(final.position[0], 0)
  assert.equal(final.position[2], 0)
  assert.equal(final.position[1]+SITE.pinHeight, SITE.armTop, 'upper catch pins meet the arms, not the engine section')
  assert.ok(final.position[1] > 10, 'booster remains suspended above the ground')
  assert.equal(final.angle, 0)
  assert.equal(final.armClosure, 1)
})

test('engine sequence includes hot staging and 13-to-3 landing burn without an entry burn', () => {
  for (const [t, engines] of [[-10,0],[-1,33],[50,33],[159.5,3],[162,3],[181,13],[219.9,13],[220,0],[300,0],[380,0],[391,13],[400,13],[403,3],[418,3],[419,0],[425,0]]) {
    assert.equal(sampleMission(t).boosterEngines, engines, `engine count at ${t}s`)
  }
  assert.equal(sampleMission(160).shipEngines, 6, 'ship ignites before mechanical separation')
})

test('scrubbing is deterministic and all poses remain finite and continuous', () => {
  const samples = Array.from({length:1741}, (_,i) => sampleMission(START+i*.25))
  for (const s of samples) {
    assert.deepEqual(sampleMission(s.time), s)
    assert.ok([...s.position, ...s.shipPosition, ...s.ringPosition, s.angle, s.speed].every(Number.isFinite))
    assert.ok(s.position[1] >= SITE.catchHeight-.22, 'the support may settle 22 cm under load')
    assert.ok(s.speed < 1800, `no unphysical speed spike at ${s.time}: ${s.speed}`)
  }
  for (const s of [...samples].reverse()) assert.deepEqual(sampleMission(s.time), s, 'backward seeking must reconstruct the same state')
  for (const t of [...phases.map(p=>p.time), SEPARATION, RING_RELEASE, 402]) {
    const a = sampleMission(t-.0001), b = sampleMission(t+.0001)
    for (const key of ['position','shipPosition','ringPosition'] as const) assert.ok(Math.hypot(...a[key].map((v,i)=>v-b[key][i])) < (key === 'shipPosition' ? 1.5 : .6), `${key} has a discontinuity at ${t}`)
    assert.ok(Math.abs(a.angle-b.angle) < .001)
  }
})

test('catch pins remain on the support through gradual load transfer', () => {
  for (let t=CATCH;t<=END;t+=.05) {
    const s=sampleMission(t)
    assert.ok(Math.abs(s.position[1]+SITE.pinHeight-(SITE.armTop-s.supportDrop))<1e-8)
    assert.equal(s.boosterEngines,0)
    assert.equal(Math.abs(s.gimbal),0)
  }
  assert.ok(sampleMission(CATCH+1).supportDrop>0)
  assert.equal(sampleMission(END).supportDrop,.22)
})

test('engine thrust fades continuously and leaves the outer ring off during recovery', () => {
  for (let i=0;i<33;i++) {
    assert.equal(enginePower(300,i),0)
    assert.equal(enginePower(425,i),0)
    if(i<20) assert.equal(enginePower(400,i),0)
    if(i>=20&&i<30) { assert.ok(enginePower(401,i)>0);assert.equal(enginePower(402,i),0) }
    for (const t of [-3,159,165,220,391,402,419]) assert.ok(Math.abs(enginePower(t-.0001,i)-enginePower(t+.0001,i))<.002)
  }
  for(let i=0;i<6;i++) {assert.equal(enginePower(159,i,true),0);assert.ok(enginePower(161,i,true)>.99)}
})

test('ring release inherits velocity and director framing has no separation jump', () => {
  const dt=.001, a=sampleMission(RING_RELEASE-dt), b=sampleMission(RING_RELEASE), c=sampleMission(RING_RELEASE+dt)
  const dv=a.ringPosition.map((v,i)=>(b.ringPosition[i]-v)/dt-(c.ringPosition[i]-b.ringPosition[i])/dt)
  assert.ok(Math.hypot(...dv)<.1)
  for(const t of [159,161,162,164,171,385,391,395,409,419]) for(const aspect of [.7,1.7]) for (const mode of ['director','detail'] as const) {
    const before=missionCamera(sampleMission(t-.0001),mode,aspect),after=missionCamera(sampleMission(t+.0001),mode,aspect)
    assert.ok(Math.hypot(...before.eye.map((v,i)=>v-after.eye[i]))<.4)
    assert.ok([...after.look,...after.eye].every(Number.isFinite))
  }
})

test('launch table has a clear exhaust aperture and all site geometry assembles', () => {
  const site=buildSite();site.updateMatrixWorld(true)
  const ray=new Raycaster(new Vector3(0,30,SITE.launchZ),new Vector3(0,-1,0))
  const hits=ray.intersectObject(site,true)
  assert.ok(hits.length>0)
  assert.ok(hits[0].point.y<2,'a solid launch deck must not block the engines')
  disposeStructure(site)
})

test('return trajectory reverses downrange motion and slows before support contact', () => {
  assert.ok(sampleMission(220).position[0] > sampleMission(161).position[0])
  assert.ok(sampleMission(280).position[0] < sampleMission(220).position[0])
  assert.ok(sampleMission(245).position[1] > sampleMission(161).position[1])
  assert.ok(sampleMission(400).speed < sampleMission(391).speed)
  assert.ok(sampleMission(418.8).speed < 2)
  assert.equal(sampleMission(END).speed, 0)
})

test('hot staging carries the ship forward and clear of the booster throughout the flip', () => {
  let previousDistance = 70
  for (let t = SEPARATION; t <= 190; t += .1) {
    const s = sampleMission(t), delta = s.shipPosition.map((v,i) => v-s.position[i])
    const distance = Math.hypot(...delta)
    assert.ok(delta[1] > 0, `upper stage falls behind the booster at ${t}s`)
    assert.ok(distance >= previousDistance-.01, `stages converge again at ${t}s`)
    previousDistance = distance
  }
})

test('playback pause, seek, restart, end and background frame clamp preserve transport state', () => {
  const player = new MissionPlayer()
  player.advance(1); assert.equal(player.time, START)
  player.speed = '1'; player.toggle(); player.advance(.1); assert.ok(Math.abs(player.time-(START+.1)) < .00001)
  player.toggle(); const paused = player.time; player.advance(.1); assert.equal(player.time, paused)
  player.seek(418); assert.equal(player.playing, false); assert.equal(sampleMission(player.time).caught, false)
  player.seek(500); assert.equal(player.time, END)
  player.toggle(); assert.equal(player.time, START); assert.equal(player.playing, true)
  player.advance(30); assert.ok(player.time <= START+.121, 'stalled frame cannot skip the launch')
  player.seek(END-.01); player.advance(.1); assert.equal(player.time, END); assert.equal(player.playing, false)
  player.reset(); assert.equal(player.time, START); assert.equal(player.playing, false)
  assert.equal(sampleMission(player.time).armClosure, 0); assert.equal(sampleMission(player.time).ringReleased, false)
})
