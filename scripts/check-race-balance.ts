import assert from 'node:assert/strict'
import { RaceSimulation } from '../src/racing/race.ts'
import { CAR_SPECS } from '../src/racing/cars.ts'
import { TRACK_LENGTH } from '../src/racing/track.ts'

for(const difficulty of ['casual','sport'] as const) for(const car of CAR_SPECS){
  const race=new RaceSimulation(car.id,difficulty);race.start()
  for(let frame=0;frame<250*60&&!['finished','timeout'].includes(race.status);frame++){
    const input=race.aiInput(race.player,true)
    input.boost=Math.abs(input.steer)<.18&&race.player.speed>28&&race.player.nitro>0&&race.player.boost<=0
    input.item=race.player.item!==null
    race.advance(1/60,input)
  }
  console.log(JSON.stringify({car:car.id,difficulty,status:race.status,length:TRACK_LENGTH.toFixed(1),time:race.time.toFixed(2),position:race.position,checks:race.player.checks,progress:race.player.progress.toFixed(2),laps:race.player.lapTimes.map(t=>t.toFixed(2)),resets:race.player.resets,boosts:race.player.boostsUsed,items:race.player.itemsUsed,ai:race.racers.slice(1).map(r=>({progress:Math.round(r.progress),resets:r.resets}))}))
  assert.equal(race.status,'finished',`${car.id} ${difficulty} must finish with normal steering inputs`)
  assert.equal(race.player.lapTimes.length,3)
  assert(race.player.resets<4,'Controller should navigate without repeated recovery')
}
