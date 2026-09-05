import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FlightSimulation, MAX_X, MIN_Y, BOSS_ARRIVAL } from './simulation.ts'
import type { FlightInput } from './simulation.ts'
const idle:FlightInput={x:0,y:0}
function advance(game:FlightSimulation,seconds:number,input:FlightInput=idle){for(let i=0;i<Math.ceil(seconds*120);i++){game.step(1/120,input);game.drainEvents()}}
function incoming(game:FlightSimulation){const b=game.hostile.find(b=>!b.active)!;Object.assign(b,{active:true,x:game.x,y:game.y+.03,vx:0,vy:-4,age:0,radius:.1})}

test('movement, focus speed, tap buffer, pause and frame gaps have bounded behavior',()=>{
 const g=new FlightSimulation();g.start();g.autoFire=false;advance(g,2,{x:1,y:-1});assert.equal(g.x,MAX_X);assert.equal(g.y,MIN_Y)
 g.pause();const snapshot=g.snapshot();g.step(.03,{x:-1,y:1});assert.deepEqual(g.snapshot(),snapshot)
 g.resume();g.x=0;g.y=-5;g.step(.05,{x:1,y:0,focus:true});assert.ok(Math.abs(g.x-.16)<1e-9)
 g.x=0;g.step(.05,{x:1,y:0});assert.ok(Math.abs(g.x-.36)<1e-9)
 const before=g.elapsed;g.step(20,idle);assert.ok(Math.abs(g.elapsed-before-.05)<1e-9)
 const tap={x:0,y:0,tap:{x:-1,y:0,remaining:.085}};const x=g.x;advance(g,.2,tap);assert.ok(g.x<x);const after=g.x;g.step(.01,tap);assert.equal(g.x,after)
})
test('manual fire is explicit; spread scales to nine directions and retained levels cap at three',()=>{
 const g=new FlightSimulation();g.start();g.autoFire=false;advance(g,.25);assert.equal(g.shots,0)
 g.step(.01,{...idle,fire:true});assert.equal(g.bullets.filter(b=>b.active).length,2)
 g.bullets.forEach(b=>b.active=false);g.collect('spread');g.step(.01,{...idle,fire:true});assert.equal(g.bullets.filter(b=>b.active).length,5)
 assert.ok(g.bullets.some(b=>b.active&&b.vx<0)&&g.bullets.some(b=>b.active&&b.vx>0))
 g.collect('spread');g.collect('spread');g.collect('spread');assert.equal(g.level,3)
 g.collect('laser');assert.equal(g.weapon,'laser');g.collect('spread');assert.equal(g.level,3)
 g.bullets.forEach(b=>b.active=false);g.step(.01,{...idle,fire:true});assert.equal(g.bullets.filter(b=>b.active).length,9)
})
test('laser damages aligned enemies through the line and leaves adjacent ships unharmed',()=>{
 const g=new FlightSimulation();g.start();g.collect('laser');const a=g.spawnEnemy('frigate',0,1)!,b=g.spawnEnemy('frigate',0,4)!,c=g.spawnEnemy('frigate',3,4)!
 g.step(.008,idle);assert.ok(a.hp<a.maxHp&&b.hp<b.maxHp);assert.equal(c.hp,c.maxHp);assert.equal(g.laserActive,true)
 g.autoFire=false;g.step(.01,idle);assert.equal(g.laserActive,false)
})
test('missiles curve toward actual enemies and expire; swept bullets do not tunnel through targets',()=>{
 const g=new FlightSimulation();g.start();g.collect('missile');g.spawnEnemy('frigate',3,4);advance(g,.25)
 const missile=g.bullets.find(b=>b.active&&b.kind==='missile'&&b.age>.1)!;assert.ok(missile.vx>0)
 const h=new FlightSimulation();h.start();h.autoFire=false;const e=h.spawnEnemy('scout',0,0)!
 Object.assign(h.bullets[0],{active:true,x:0,y:-2,vx:0,vy:100,damage:10,radius:.1,age:0,kind:'pulse'});h.step(.05,idle)
 assert.equal(e.active,false);assert.equal(h.kills,1)
})
test('pickups are collected by contact, repair caps health and bomb stock stays bounded',()=>{
 const g=new FlightSimulation();g.start();g.spawnPickup('laser',g.x,g.y+.4);g.step(.01,idle);assert.equal(g.weapon,'laser');assert.equal(g.collected,1)
 g.shields=2;g.collect('repair');assert.equal(g.shields,3);g.shields=g.maxShields;g.collect('repair');assert.equal(g.shields,g.maxShields)
 for(let i=0;i<5;i++)g.collect('bomb');assert.equal(g.bombs,3)
})
test('damage clears nearby bullets, grants grace, resets combo, and ends at zero shields',()=>{
 const g=new FlightSimulation();g.start();g.invulnerable=0;g.combo=12;g.comboTime=3;incoming(g);incoming(g);g.step(.01,idle);assert.equal(g.shields,4);assert.equal(g.combo,0)
 incoming(g);g.step(.01,idle);assert.equal(g.shields,4)
 g.shields=1;g.invulnerable=0;incoming(g);g.step(.01,idle);assert.equal(g.status,'lost');assert.equal(g.shields,0)
 const score=g.score;advance(g,1,{x:1,y:1,fire:true});assert.equal(g.score,score)
})
test('shockwave is finite, clears bullets and beams, damages ships and cannot fire during pause',()=>{
 const g=new FlightSimulation();g.start();const e=g.spawnEnemy('frigate',0,3)!;incoming(g);g.beamWarning=1;assert.equal(g.bomb(),true)
 assert.equal(g.bombs,1);assert.equal(e.active,false);assert.equal(g.hostile.some(b=>b.active),false);assert.equal(g.beamWarning,0);assert.ok(g.invulnerable>=2)
 g.pause();assert.equal(g.bomb(),false);assert.equal(g.bombs,1);g.resume();assert.equal(g.bomb(),true);assert.equal(g.bomb(),false)
})
test('campaign reaches the capital ship and requires its destruction to complete',()=>{
 const g=new FlightSimulation();g.start();g.autoFire=false;g.elapsed=BOSS_ARRIVAL-.005;g.step(.01,idle)
 assert.equal(g.sector,2);assert.equal(g.bossArrived,true);assert.ok(g.boss);assert.equal(g.status,'playing')
 const boss=g.boss!;g.damageEnemy(boss,boss.maxHp*.35);assert.equal(g.bossPhase,2);g.damageEnemy(boss,boss.maxHp*.33);assert.equal(g.bossPhase,3)
 g.elapsed=180;g.step(.01,idle);assert.equal(g.status,'playing')
 g.damageEnemy(boss,10000);const score=g.score;assert.ok(g.bossDefeated);advance(g,2.5);assert.equal(g.status,'won');assert.equal(g.score,score)
 g.start('rookie');assert.equal(g.shields,7);assert.equal(g.score,0);assert.equal(g.kills,0);assert.equal(g.bossArrived,false);assert.equal(g.weapon,'pulse');assert.equal(g.enemies.some(e=>e.active),false)
})
test('boss beams telegraph before damage and leave a safe lane',()=>{
 const g=new FlightSimulation();g.start();g.autoFire=false;g.bossArrived=true;g.spawnEnemy('boss',0,5.9);g.beamX=[g.x,3];g.beamWarning=.3;g.invulnerable=0
 advance(g,.2);assert.equal(g.shields,5);assert.equal(g.beamActive,0);advance(g,.13);assert.equal(g.shields,4)
 g.invulnerable=0;g.x=-4;advance(g,.2);assert.equal(g.shields,4)
})
test('seeded wave schedules and input produce reproducible finite pools',()=>{
 const a=new FlightSimulation(54),b=new FlightSimulation(54);a.start();b.start()
 for(let i=0;i<1800;i++){const input={x:Math.sin(i/100),y:0};a.step(1/120,input);b.step(1/120,input);a.drainEvents();b.drainEvents()}
 assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.enemies.length,40);assert.equal(a.hostile.length,420);assert.equal(a.particles.length,360)
})
