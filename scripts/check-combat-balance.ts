import { FlightSimulation } from '../src/game/simulation.ts'
import type { FlightInput, Difficulty } from '../src/game/simulation.ts'
// Deterministic simulation soak: the controller uses ordinary input and finite bombs.
// No invulnerability, health injection, time skips, or damage shortcuts.
for (const difficulty of ['rookie','normal'] as Difficulty[]) {
 const g=new FlightSimulation();g.start(difficulty);let input:FlightInput={x:0,y:0};const weapons=new Set<string>();let maximumBullets=0
 for(let tick=0;tick<210*120&&g.status==='playing';tick++) {
  if(tick%12===0) {
   const p=g.pickups.filter(p=>p.active&&p.y<1.2).sort((a,b)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y))[0]
   const enemy=g.enemies.filter(e=>e.active&&e.y>0&&e.y<8).sort((a,b)=>a.y-b.y)[0]
   const tx=p?p.x:enemy?enemy.x:Math.sin(g.elapsed*.3)*3,ty=p?Math.min(-1.3,p.y):g.boss?-5.5:-5.2
   let best=Infinity
   for(const dx of [-1,0,1])for(const dy of [-1,0,1]) {
    const n=Math.max(1,Math.hypot(dx,dy)),vx=dx/n*7.2,vy=dy/n*7.2,nx=g.x+vx*.25,ny=g.y+vy*.25
    if(Math.abs(nx)>5.2||ny<-7||ny>1.6)continue
    let cost=Math.hypot(nx-tx,(ny-ty)*1.2)*.5
    for(const b of g.hostile)if(b.active)for(const t of [.08,.2,.38]) {const d=Math.hypot(g.x+vx*t-b.x-b.vx*t,g.y+vy*t-b.y-b.vy*t);cost+=Math.max(0,1.2-d)**2*(g.invulnerable>.5?3:35)}
    for(const e of g.enemies)if(e.active){const d=Math.hypot(nx-e.x,ny-e.y);cost+=Math.max(0,e.radius+.65-d)**2*22}
    if(g.beamActive>0||g.beamWarning>0)for(const bx of g.beamX)cost+=Math.max(0,.7-Math.abs(nx-bx))**2*50
    if(cost<best){best=cost;input={x:dx,y:dy}}
   }
   const imminent=g.hostile.some(b=>b.active&&Math.hypot(b.x+b.vx*.15-g.x,b.y+b.vy*.15-g.y)<.55)
   if((imminent&&g.invulnerable<=0)||(g.boss&&g.boss.hp<48))g.bomb()
  }
  g.step(1/120,input);g.drainEvents();weapons.add(g.weapon);maximumBullets=Math.max(maximumBullets,g.hostile.filter(b=>b.active).length)
 }
 console.log(JSON.stringify({difficulty,status:g.status,elapsed:+g.elapsed.toFixed(1),score:g.score,kills:g.kills,health:g.shields,bombs:g.bombs,weapons:[...weapons],maxEnemyBullets:maximumBullets,bossHP:g.boss?.hp??0}))
}
