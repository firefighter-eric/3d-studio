import assert from 'node:assert/strict'
import test from 'node:test'
import { Euler, PerspectiveCamera, Vector3 } from 'three'
import { setRecoveryCamera } from './world'
import { DURATION, FlightPlayer, PADS, REST_HEIGHT, sampleFlight, TOUCHDOWNS } from './mission'

test('each booster reaches its own pad, completes leg deployment, shuts down and stays supported', () => {
  for (const [index, touchdown] of TOUCHDOWNS.entries()) {
    assert.ok(sampleFlight(touchdown-.2).boosters[index].throttle > 0)
    for (const t of [touchdown, touchdown+.1, DURATION]) {
      const b=sampleFlight(t).boosters[index]
      assert.equal(b.landed,true);assert.equal(b.altitude,0);assert.equal(b.engines,0);assert.equal(b.throttle,0);assert.equal(b.legs,1)
      assert.deepEqual(b.position,[PADS[index][0],REST_HEIGHT,PADS[index][2]])
    }
  }
  assert.equal(sampleFlight(49.3).boosters[0].landed,true)
  assert.equal(sampleFlight(49.3).boosters[1].landed,false)
})
test('the center core continues independently; side stages remain separated without below-ground motion', () => {
  let previous=sampleFlight(0)
  for(let t=.02;t<=DURATION;t+=.02) {
    const s=sampleFlight(t)
    assert.ok(s.boosters[1].position[0]-s.boosters[0].position[0] >= 8.49)
    for(let i=0;i<2;i++) {
      const b=s.boosters[i]
      assert.ok([...b.position,...b.rotation,b.throttle,b.legs].every(Number.isFinite))
      assert.ok(b.altitude>=0)
      assert.ok(Math.abs(b.altitude-previous.boosters[i].altitude)<5,'no altitude teleport at phase boundaries')
      if(t>18)assert.ok(b.altitude<=previous.boosters[i].altitude+.001)
    }
    previous=s
  }
  assert.ok(sampleFlight(12).center[1]>sampleFlight(12).boosters[0].position[1])
})
test('seeking backwards reconstructs the full pose and transport completes or restarts deterministically', () => {
  const player=new FlightPlayer(),original=sampleFlight(42)
  player.seek(56);assert.equal(player.playing,false)
  player.seek(42);assert.deepEqual(sampleFlight(player.time),original)
  player.seek(0);assert.equal(sampleFlight(player.time).boosters[0].legs,0)
  player.seek(DURATION-.02);player.toggle();player.step(.05)
  assert.equal(player.time,DURATION);assert.equal(player.playing,false)
  player.toggle();assert.equal(player.time,0);assert.equal(player.playing,true)
  player.reset();player.step(1);assert.equal(player.time,0)
  player.seek(Number.NaN);assert.equal(player.time,0)
})

test('director keeps complete boosters and both final landing pads inside desktop and narrow frames', () => {
  for(const aspect of [16/9,1.4,.78])for(let time=0;time<=DURATION;time+=.25) {
    const sample=sampleFlight(time),camera=new PerspectiveCamera()
    setRecoveryCamera(sample,camera,'director',aspect)
    const check=(point:Vector3)=>{
      const ndc=point.project(camera)
      assert.ok(Math.abs(ndc.x)<.87&&Math.abs(ndc.y)<.80,`cropped subject at ${time}s, aspect ${aspect}: ${ndc.toArray()}`)
      assert.ok(ndc.z<1&&ndc.z>-1)
    }
    for(const booster of sample.boosters) {
      const base=new Vector3(...booster.position)
      check(base.clone());check(new Vector3(0,47.8,0).applyEuler(new Euler(...booster.rotation)).add(base))
    }
    if(time>=32)for(const pad of PADS)for(const x of [-56,56])for(const z of [-56,56])check(new Vector3(pad[0]+x,0,pad[2]+z))
    if(aspect===16/9&&time>=25&&time<32) {
      const b=sample.boosters[0],base=new Vector3(...b.position),tip=new Vector3(0,47.8,0).applyEuler(new Euler(...b.rotation)).add(base)
      assert.ok(base.project(camera).distanceTo(tip.project(camera))>.18,'Do not lose the boosters as tiny dots during descent')
    }
  }
})
