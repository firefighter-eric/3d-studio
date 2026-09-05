export type GameStatus = 'ready' | 'playing' | 'paused' | 'lost' | 'won'
export type Weapon = 'pulse' | 'spread' | 'laser' | 'missile'
export type PickupKind = Exclude<Weapon, 'pulse'> | 'repair' | 'bomb'
export type EnemyKind = 'scout' | 'interceptor' | 'frigate' | 'carrier' | 'boss'
export type Difficulty = 'normal' | 'rookie'
export interface FlightInput { x: number; y: number; fire?: boolean; focus?: boolean; target?: { x: number; y: number }; tap?: { x: number; y: number; remaining: number } }
export interface Enemy { id: number; active: boolean; kind: EnemyKind; x: number; y: number; originX: number; age: number; hp: number; maxHp: number; radius: number; fireIn: number; pattern: number; hit: number; rotation: number }
export interface Bullet { id: number; active: boolean; x: number; y: number; vx: number; vy: number; radius: number; damage: number; age: number; kind: Weapon | 'hostile' | 'plasma' }
export interface Pickup { id: number; active: boolean; kind: PickupKind; x: number; y: number; age: number }
export interface Particle { id: number; active: boolean; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: number; ring: boolean }
export interface CombatEvent { type: 'shot' | 'hit' | 'destroy' | 'pickup' | 'hurt' | 'bomb' | 'sector' | 'boss' | 'won' | 'lost'; value?: string; x?: number }
export const MAX_X = 5.35, MIN_Y = -7.1, MAX_Y = 6.4, SECTOR_DURATION = 30, BOSS_ARRIVAL = 90
export const SECTORS = [
  { name: '静海防线', english: 'TRANQUILITY PERIMETER', subtitle: '拦截敌方先遣编队', code: '01', color: '#81d9ef' },
  { name: '碎星航道', english: 'SHATTERED ORBIT', subtitle: '突破重型护卫舰封锁', code: '02', color: '#edbe77' },
  { name: '暗面要塞', english: 'THE DARK SIDE', subtitle: '击败「厄瑞玻斯」母舰', code: '03', color: '#c6a2ff' },
] as const
export const WEAPONS: Record<Weapon, { name: string; english: string; letter: string; color: string; description: string }> = {
  pulse: { name: '双联脉冲', english: 'PULSE CANNON', letter: 'P', color: '#e2f1ab', description: '稳定的双联直射火力' },
  spread: { name: '烈焰散弹', english: 'VULCAN SPREAD', letter: 'S', color: '#ffbd68', description: '扇形弹幕，覆盖多条航线' },
  laser: { name: '苍蓝激光', english: 'ION LASER', letter: 'L', color: '#79e7ff', description: '持续光束，贯穿整列敌舰' },
  missile: { name: '追踪导弹', english: 'SEEKER MISSILE', letter: 'M', color: '#c8a0ff', description: '自动追踪，爆炸范围伤害' },
}
export const PICKUP_COLORS: Record<PickupKind, string> = { spread: '#ffbd68', laser: '#79e7ff', missile: '#c8a0ff', repair: '#8becb1', bomb: '#faf3b5' }
export interface FlightSnapshot {
  status: GameStatus; elapsed: number; score: number; shields: number; maxShields: number; invulnerable: number; x: number; y: number;
  weapon: Weapon; level: number; bombs: number; kills: number; combo: number; maxCombo: number; multiplier: number; comboTime: number;
  sector: number; wave: number; boss: { hp: number; maxHp: number; phase: number } | null; warning: number; banner: number;
  notice: string; noticeTime: number; autoFire: boolean; difficulty: Difficulty; enemies: number; shots: number; pickups: number; victoryTime: number;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const distanceToSegment = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1)
  return Math.hypot(x - ax - dx * t, y - ay - dy * t)
}
// Time, collision, and fixed pools live here. Rendering never decides damage.
export class FlightSimulation {
  status: GameStatus = 'ready'; difficulty: Difficulty = 'normal'
  elapsed = 0; score = 0; shields = 5; maxShields = 5; invulnerable = 0; x = 0; y = -5.9; bank = 0; sector = 0; wave = 0
  weapon: Weapon = 'pulse'; levels: Record<Weapon, number> = { pulse: 1, spread: 0, laser: 0, missile: 0 }
  bombs = 2; kills = 0; combo = 0; maxCombo = 0; comboTime = 0; shots = 0; collected = 0
  autoFire = true; firing = false; laserActive = false; focus = false
  warning = 0; banner = 3.4; notice = ''; noticeTime = 0; shake = 0; flash = 0; bombFlash = 0
  victoryTime = 0; bossArrived = false; bossDefeated = false; beamX = [0, 0]; beamWarning = 0; beamActive = 0
  events: CombatEvent[] = []
  enemies: Enemy[] = Array.from({ length: 40 }, (_, id) => ({ id, active: false, kind: 'scout', x: 0, y: 0, originX: 0, age: 0, hp: 1, maxHp: 1, radius: .45, fireIn: 1, pattern: 0, hit: 0, rotation: 0 }))
  bullets: Bullet[] = Array.from({ length: 240 }, (_, id) => this.emptyBullet(id))
  hostile: Bullet[] = Array.from({ length: 420 }, (_, id) => this.emptyBullet(id))
  pickups: Pickup[] = Array.from({ length: 20 }, (_, id) => ({ id, active: false, kind: 'spread', x: 0, y: 0, age: 0 }))
  particles: Particle[] = Array.from({ length: 360 }, (_, id) => ({ id, active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 0, color: 0, ring: false }))
  private seed: number; private initialSeed: number
  private fireIn = 0; private nextWave = 2; private nextPickup = 3; private pickupIndex = 0; private bossCycle = 0; private victoryDelay = 0
  constructor(seed = 20260905) { this.seed = seed; this.initialSeed = seed }
  private emptyBullet(id: number): Bullet { return { id, active: false, x: 0, y: 0, vx: 0, vy: 0, radius: .1, damage: 1, age: 0, kind: 'pulse' } }
  private random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296 }
  get level() { return this.levels[this.weapon] }
  get multiplier() { return Math.min(5, 1 + Math.floor(this.combo / 8)) }
  get boss() { return this.enemies.find(e => e.active && e.kind === 'boss') }
  get bossPhase() { const b = this.boss; return b ? b.hp > b.maxHp * .66 ? 1 : b.hp > b.maxHp * .33 ? 2 : 3 : 1 }
  start(difficulty = this.difficulty) {
    this.difficulty = difficulty; this.maxShields = difficulty === 'rookie' ? 7 : 5; this.shields = this.maxShields
    this.elapsed = 0; this.score = 0; this.invulnerable = 1.8; this.x = 0; this.y = -5.9; this.bank = 0
    this.sector = 0; this.wave = 0; this.weapon = 'pulse'; this.levels = { pulse: 1, spread: 0, laser: 0, missile: 0 }
    this.bombs = 2; this.kills = 0; this.combo = 0; this.maxCombo = 0; this.comboTime = 0; this.shots = 0; this.collected = 0
    this.fireIn = 0; this.nextWave = 2; this.nextPickup = 3; this.pickupIndex = 0; this.bossCycle = 0; this.seed = this.initialSeed
    this.beamWarning = 0; this.beamActive = 0; this.warning = 0; this.banner = 3.4; this.notice = ''; this.noticeTime = 0
    this.shake = 0; this.flash = 0; this.bombFlash = 0; this.victoryTime = 0; this.victoryDelay = 0; this.bossArrived = false; this.bossDefeated = false
    this.laserActive = false; this.firing = false; this.focus = false
    for (const pool of [this.enemies, this.bullets, this.hostile, this.pickups, this.particles]) pool.forEach(e => { e.active = false })
    this.events = [{ type: 'sector' }]; this.status = 'playing'
  }
  pause() { if (this.status === 'playing') { this.status = 'paused'; this.firing = false; this.laserActive = false } }
  resume() { if (this.status === 'paused') this.status = 'playing' }
  togglePause() { if (this.status === 'playing') this.pause(); else this.resume() }
  toggleAutoFire() { this.autoFire = !this.autoFire }
  drainEvents() { const events = this.events; this.events = []; return events }
  snapshot(): FlightSnapshot {
    const b = this.boss
    return { status: this.status, elapsed: this.elapsed, score: this.score, shields: this.shields, maxShields: this.maxShields, invulnerable: this.invulnerable, x: this.x, y: this.y,
      weapon: this.weapon, level: this.level, bombs: this.bombs, kills: this.kills, combo: this.combo, maxCombo: this.maxCombo, multiplier: this.multiplier, comboTime: this.comboTime,
      sector: this.sector, wave: this.wave, boss: b ? { hp: b.hp, maxHp: b.maxHp, phase: this.bossPhase } : null, warning: this.warning, banner: this.banner,
      notice: this.notice, noticeTime: this.noticeTime, autoFire: this.autoFire, difficulty: this.difficulty, enemies: this.enemies.filter(e => e.active).length, shots: this.shots, pickups: this.collected, victoryTime: this.victoryTime }
  }
  spawnEnemy(kind: EnemyKind, x: number, y = 10.4, pattern = 0) {
    const e = this.enemies.find(e => !e.active); if (!e) return undefined
    const hp = ({ scout: 3.4, interceptor: 6, frigate: 23, carrier: 8, boss: this.difficulty === 'rookie' ? 330 : 420 }[kind]) * (kind === 'boss' ? 1 : 1 + this.sector * .18)
    Object.assign(e, { active: true, kind, x, y, originX: x, age: 0, hp, maxHp: hp, radius: { scout: .45, interceptor: .53, frigate: .9, carrier: .66, boss: 2.15 }[kind], fireIn: 1.3 + this.random() * .8, pattern, hit: 0, rotation: 0 }); return e
  }
  spawnPickup(kind: PickupKind, x: number, y: number) { const p = this.pickups.find(p => !p.active); if (p) Object.assign(p, { active: true, kind, x: clamp(x, -4.8, 4.8), y, age: 0 }); return p }
  collect(kind: PickupKind) {
    this.collected++; this.score += 150
    if (kind === 'repair') { const full = this.shields === this.maxShields; if (full) this.score += 350; this.shields = Math.min(this.maxShields, this.shields + 1); this.notice = full ? '护盾已满 · 奖励 +500' : '护盾修复 +1'; this.invulnerable = Math.max(this.invulnerable, .6) }
    else if (kind === 'bomb') { const full = this.bombs >= 3; if (full) this.score += 350; this.bombs = Math.min(3, this.bombs + 1); this.notice = full ? '冲击波已满 · 奖励 +500' : '冲击波补给 +1' }
    else { this.levels[kind] = Math.min(3, this.levels[kind] + 1); this.weapon = kind; this.fireIn = 0; this.notice = `${WEAPONS[kind].name} · LV.${this.level}` }
    this.noticeTime = 2.3; this.events.push({ type: 'pickup', value: kind }); this.burst(this.x, this.y, 15, kind === 'laser' ? 1 : kind === 'missile' ? 2 : 3)
  }
  private addBullet(pool: Bullet[], x: number, y: number, vx: number, vy: number, kind: Bullet['kind'], damage = 1) {
    const b = pool.find(b => !b.active); if (b) Object.assign(b, { active: true, x, y, vx, vy, age: 0, kind, damage, radius: kind === 'plasma' || kind === 'missile' ? .16 : .1 }); return b
  }
  burst(x: number, y: number, count = 18, color = 0, large = false) {
    let i = 0
    for (const p of this.particles) {
      if (p.active) continue
      const angle = this.random() * Math.PI * 2, speed = .8 + this.random() * (large ? 7 : 4), life = .22 + this.random() * (large ? 1.1 : .5)
      Object.assign(p, { active: true, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, size: .03 + this.random() * .09, color, ring: i === 0 && count >= 12 }); if (++i >= count) break
    }
  }
  damageEnemy(e: Enemy, damage: number) {
    if (!e.active) return; e.hp -= damage; e.hit = .09; if (e.hp > 0) return
    e.active = false; this.kills++; this.combo++; this.comboTime = 3.8; this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.score += ({ scout: 120, interceptor: 200, frigate: 600, carrier: 300, boss: 8000 }[e.kind]) * this.multiplier
    this.burst(e.x, e.y, e.kind === 'boss' ? 100 : e.kind === 'frigate' ? 36 : 22, 0, e.kind === 'boss' || e.kind === 'frigate')
    this.shake = Math.max(this.shake, e.kind === 'boss' ? 1 : e.kind === 'frigate' ? .28 : .08); this.events.push({ type: 'destroy', value: e.kind, x: e.x })
    if (e.kind === 'carrier') { const kinds: PickupKind[] = ['spread', 'laser', 'missile']; this.spawnPickup(kinds[(this.wave + this.sector) % 3], e.x, e.y) }
    else if (e.kind === 'frigate' && this.kills % 3 === 0) this.spawnPickup(this.shields < this.maxShields ? 'repair' : 'bomb', e.x, e.y)
    if (e.kind === 'boss') {
      this.bossDefeated = true; this.victoryTime = this.elapsed; this.victoryDelay = 2.4; this.beamActive = 0; this.beamWarning = 0
      this.hostile.forEach(b => { if (b.active) { this.score += 5; b.active = false } }); this.enemies.forEach(e => { e.active = false }); this.pickups.forEach(p => { p.active = false })
      this.flash = .5; this.invulnerable = 5; this.score += this.shields * 500 + this.bombs * 300
    }
  }
  private hurt() {
    if (this.invulnerable > 0 || this.status !== 'playing' || this.bossDefeated) return
    this.shields--; this.invulnerable = 2.2; this.flash = .65; this.shake = .65; this.combo = 0; this.comboTime = 0
    this.events.push({ type: 'hurt' }); this.burst(this.x, this.y, 20, 1)
    this.hostile.forEach(b => { if (b.active && Math.hypot(b.x - this.x, b.y - this.y) < 1.5) b.active = false })
    if (this.shields <= 0) { this.shields = 0; this.status = 'lost'; this.laserActive = false; this.firing = false; this.burst(this.x, this.y, 60, 0, true); this.events.push({ type: 'lost' }) }
  }
  bomb() {
    if (this.status !== 'playing' || this.bombs <= 0 || this.bossDefeated) return false
    this.bombs--; this.bombFlash = 1.2; this.shake = .7; this.invulnerable = Math.max(this.invulnerable, 2.1)
    this.hostile.forEach(b => { if (b.active) { this.score += 5; b.active = false } }); this.beamActive = 0; this.beamWarning = 0
    this.enemies.forEach(e => { if (e.active && e.y < 9) this.damageEnemy(e, e.kind === 'boss' ? 48 : 30) })
    this.burst(this.x, this.y, 48, 1, true); this.events.push({ type: 'bomb' }); return true
  }
  private spawnWave() {
    const pattern = this.wave % 6
    if (pattern === 0) for (let i = 0; i < 5; i++) this.spawnEnemy('scout', (i - 2) * 1.85, 9.8 + Math.abs(i - 2) * .65, this.wave)
    if (pattern === 1) for (let i = 0; i < 4; i++) this.spawnEnemy('interceptor', (i % 2 ? 1 : -1) * (3 + i * .22), 10 + i * .9, i % 2)
    if (pattern === 2) { this.spawnEnemy('frigate', 2.7); this.spawnEnemy('scout', -3.7); this.spawnEnemy('scout', 0, 11.4) }
    if (pattern === 3) for (let i = 0; i < 6; i++) this.spawnEnemy('scout', -4.6 + i * 1.8, 10 + i * .65, 1)
    if (pattern === 4) { this.spawnEnemy('carrier', clamp(this.x, -3.4, 3.4)); this.spawnEnemy('interceptor', -4.1, 10.8, 0); this.spawnEnemy('interceptor', 4.1, 10.8, 1) }
    if (pattern === 5) { this.spawnEnemy('frigate', -2.7, 10.2); if (this.sector > 0) this.spawnEnemy('frigate', 2.7, 11.6); else for (let i = 0; i < 3; i++) this.spawnEnemy('scout', i * 1.5, 11 + i * .6) }
    this.wave++
  }
  private playerFire() {
    const l = this.level
    if (this.weapon === 'laser') {
      this.fireIn += .065
      for (const e of this.enemies) if (e.active && e.y > this.y + .3 && e.y < 10 && Math.abs(e.x - this.x) < (e.kind === 'boss' ? 1.6 : e.radius) + .09 + l * .045) {
        this.damageEnemy(e, .83 + l * .3); if (this.random() > .6) this.burst(this.x, e.y - e.radius, 2, 1)
      }
    } else if (this.weapon === 'spread') {
      this.fireIn += .18 - l * .012; const count = 3 + l * 2
      for (let i = 0; i < count; i++) { const a = (i - (count - 1) / 2) * .14; this.addBullet(this.bullets, this.x, this.y + .7, Math.sin(a) * 20, Math.cos(a) * 20, 'spread', 1.15) }
    } else if (this.weapon === 'missile') {
      this.fireIn += .34 - l * .025
      for (const side of [-1, 1]) this.addBullet(this.bullets, this.x + side * .34, this.y + .25, side * 3.6, 10, 'missile', 3 + l)
      if (l >= 3) this.addBullet(this.bullets, this.x, this.y + .6, 0, 13, 'missile', 4)
      this.addBullet(this.bullets, this.x, this.y + .7, 0, 23, 'pulse', 1)
    } else { this.fireIn += .14; for (const side of [-1, 1]) this.addBullet(this.bullets, this.x + side * .51, this.y + .43, 0, 24, 'pulse', 1.15) }
    this.shots++; this.events.push({ type: 'shot', value: this.weapon, x: this.x })
  }
  private enemyFire(e: Enemy) {
    const speed = (this.difficulty === 'rookie' ? 3.6 : 4.5) + this.sector * .55, aimed = Math.atan2(this.x - e.x, e.y - this.y)
    if (e.kind === 'boss') {
      const phase = this.bossPhase; this.bossCycle++; const count = phase === 3 ? 11 : 7
      for (const side of [-1, 1]) for (let i = 0; i < count; i++) { const a = (i - (count - 1) / 2) * .18 + Math.sin(e.age * 1.8) * .25; this.addBullet(this.hostile, e.x + side * 1.65, e.y - .65, Math.sin(a) * speed, -Math.cos(a) * speed, 'hostile') }
      if (phase >= 2 && this.bossCycle % 4 === 0 && this.beamActive <= 0 && this.beamWarning <= 0) { this.beamX = [clamp(this.x - 1.1, -4.6, 4.6), clamp(this.x + 1.1, -4.6, 4.6)]; this.beamWarning = 1.3 }
      if (phase === 3 && this.bossCycle % 3 === 0) for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + e.age * .1; this.addBullet(this.hostile, e.x, e.y, Math.cos(a) * 3.5, Math.sin(a) * 3.5, 'plasma') }
      e.fireIn = phase === 3 ? .88 : 1.3
    } else if (e.kind === 'frigate') { for (let i = -2; i <= 2; i++) this.addBullet(this.hostile, e.x, e.y - .65, Math.sin(aimed + i * .23) * speed, -Math.cos(aimed + i * .23) * speed, 'plasma'); e.fireIn = 1.75 }
    else if (e.kind === 'interceptor') { for (const a of [-.14, .14]) this.addBullet(this.hostile, e.x, e.y - .4, Math.sin(aimed + a) * speed, -Math.cos(aimed + a) * speed, 'hostile'); e.fireIn = 1.85 }
    else { this.addBullet(this.hostile, e.x, e.y - .45, Math.sin(aimed) * speed, -Math.cos(aimed) * speed, 'hostile'); e.fireIn = 2.35 - this.sector * .2 }
  }
  step(dt: number, input: FlightInput) {
    if (this.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return
    const time = Math.min(dt, .05); this.elapsed += time
    for (const key of ['invulnerable', 'warning', 'banner', 'noticeTime', 'shake', 'flash', 'bombFlash', 'comboTime'] as const) this[key] = Math.max(0, this[key] - time)
    if (!this.comboTime) this.combo = 0
    if (this.bossDefeated) { this.victoryDelay -= time; if (this.victoryDelay <= 0) { this.status = 'won'; this.events.push({ type: 'won' }); return } }
    let dx = input.x, dy = input.y
    if (input.tap && input.tap.remaining > 0) { if (!dx && !dy) { dx = input.tap.x; dy = input.tap.y }; input.tap.remaining = Math.max(0, input.tap.remaining - time) }
    if (input.target) { dx = clamp((input.target.x - this.x) * 8, -1, 1); dy = clamp((input.target.y - this.y) * 8, -1, 1) }
    this.focus = Boolean(input.focus); const norm = Math.max(1, Math.hypot(dx, dy)), speed = this.focus ? 3.2 : 7.2
    this.x = clamp(this.x + dx / norm * speed * time, -MAX_X, MAX_X); this.y = clamp(this.y + dy / norm * speed * time, MIN_Y, MAX_Y)
    this.bank += (-dx * .28 - this.bank) * Math.min(1, time * 11)
    this.firing = !this.bossDefeated && (this.autoFire || Boolean(input.fire)); this.laserActive = this.firing && this.weapon === 'laser'
    this.fireIn = Math.max(-.1, this.fireIn - time); if (this.firing && this.fireIn <= 0) this.playerFire()
    const sector = Math.min(2, Math.floor(this.elapsed / SECTOR_DURATION))
    if (sector !== this.sector) { this.sector = sector; this.banner = 3.2; this.score += 1000; this.spawnPickup('repair', this.x, 5.5); this.events.push({ type: 'sector' }) }
    if (!this.bossArrived && this.elapsed >= BOSS_ARRIVAL) {
      this.bossArrived = true; this.warning = 3; this.banner = 0; this.hostile.forEach(b => { b.active = false }); this.enemies.forEach(e => { e.active = false })
      this.spawnEnemy('boss', 0, 11.7); this.spawnPickup('bomb', this.x, 3)
      this.spawnPickup('repair', this.x - .45, this.y + 1.2)
      if (this.difficulty === 'rookie') this.spawnPickup('repair', this.x + .45, this.y + 1.2)
      this.events.push({ type: 'boss' })
    }
    if (!this.bossArrived && this.elapsed >= this.nextWave) { this.spawnWave(); this.nextWave += this.sector === 0 ? 4.7 : this.sector === 1 ? 4.1 : 3.7 }
    if (!this.bossDefeated && this.elapsed >= this.nextPickup) {
      const sequence: PickupKind[] = ['spread', 'laser', 'missile', 'repair', 'spread', 'laser', 'bomb', 'missile']
      this.spawnPickup(sequence[this.pickupIndex % sequence.length], this.x, 5.4); this.pickupIndex++; this.nextPickup += this.pickupIndex < 3 ? 9 : 10.5
    }
    if (this.beamWarning > 0) { this.beamWarning -= time; if (this.beamWarning <= 0) this.beamActive = 1.2 }
    else if (this.beamActive > 0) { this.beamActive -= time; if (this.beamX.some(x => Math.abs(this.x - x) < .33) && this.y < (this.boss?.y ?? 6)) this.hurt() }
    for (const e of this.enemies) {
      if (!e.active) continue; e.age += time; e.hit = Math.max(0, e.hit - time); e.fireIn -= time
      if (e.kind === 'boss') { e.y += (4.7 - e.y) * Math.min(1, time * .9); e.x = Math.sin(e.age * .48) * (this.bossPhase === 3 ? 2.7 : 1.65); e.rotation = Math.sin(e.age * .48) * .03 }
      else if (e.kind === 'frigate') { e.y -= (e.age < 3.2 ? 1.6 : e.age < 10 ? .1 : 2.6) * time; e.x = e.originX + Math.sin(e.age * .85) * .5; e.rotation = Math.cos(e.age * .85) * .04 }
      else if (e.kind === 'interceptor') { e.y -= (2.7 + this.sector * .18) * time; e.x = e.originX + Math.sin(e.age * 1.25) * (e.pattern % 2 ? -2.7 : 2.7); e.rotation = Math.cos(e.age * 1.25) * (e.pattern % 2 ? .5 : -.5) }
      else { e.y -= (e.kind === 'carrier' ? 1.5 : 2.35 + this.sector * .18) * time; e.x = e.originX + Math.sin(e.age * 1.5 + e.pattern) * (e.kind === 'carrier' ? .35 : .5); e.rotation = Math.cos(e.age * 1.5 + e.pattern) * .12 }
      if (e.y < -9.7 || Math.abs(e.x) > 8.3) { e.active = false; continue }
      if (e.fireIn <= 0 && e.y < 7.8 && e.y > this.y + 1 && this.warning <= 0 && e.kind !== 'carrier') this.enemyFire(e)
      const contact = e.kind === 'boss' ? Math.hypot((e.x - this.x) / 2.2, (e.y - this.y) / 1) < 1 : Math.hypot(e.x - this.x, e.y - this.y) < e.radius + .18
      if (contact) this.hurt()
    }
    for (const b of this.bullets) {
      if (!b.active) continue; const oldX = b.x, oldY = b.y; b.age += time
      if (b.kind === 'missile') {
        let target: Enemy | undefined, best = Infinity
        for (const e of this.enemies) if (e.active && e.y > b.y - .6 && e.y < 10) { const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < best) { target = e; best = d } }
        if (target) { const a = Math.atan2(target.x - b.x, target.y - b.y); b.vx += (Math.sin(a) * 15 - b.vx) * time * 5; b.vy += (Math.cos(a) * 15 - b.vy) * time * 5 }
        else { b.vx *= 1 - time * 2; b.vy += (16 - b.vy) * time * 3 }
      }
      b.x += b.vx * time; b.y += b.vy * time
      if (b.y > 11 || b.y < -10 || Math.abs(b.x) > 8 || b.age > 4) { b.active = false; continue }
      for (const e of this.enemies) {
        if (!e.active || e.y > 9) continue
        const hit = e.kind === 'boss' ? Math.abs(b.x - e.x) < 2.15 && distanceToSegment(b.x, e.y, oldX, oldY, b.x, b.y) < .95 : distanceToSegment(e.x, e.y, oldX, oldY, b.x, b.y) < e.radius + b.radius
        if (hit) {
          b.active = false; this.damageEnemy(e, b.damage); this.burst(b.x, b.y, b.kind === 'missile' ? 9 : 2, b.kind === 'missile' ? 2 : 3)
          if (b.kind === 'missile') for (const other of this.enemies) if (other.active && other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 1.45) this.damageEnemy(other, b.damage * .55)
          break
        }
      }
    }
    for (const b of this.hostile) {
      if (!b.active) continue; const oldX = b.x, oldY = b.y; b.x += b.vx * time; b.y += b.vy * time; b.age += time
      if (b.y < -9.5 || b.y > 12 || Math.abs(b.x) > 8 || b.age > 9) { b.active = false; continue }
      if (distanceToSegment(this.x, this.y, oldX, oldY, b.x, b.y) < .17 + b.radius) { b.active = false; this.hurt() }
    }
    for (const p of this.pickups) {
      if (!p.active) continue; p.age += time; p.y -= 1.25 * time; const dist = Math.hypot(p.x - this.x, p.y - this.y)
      if (dist < 1.55) { p.x += (this.x - p.x) * time * 7; p.y += (this.y - p.y) * time * 7 } else p.x += Math.sin(p.age * 2) * time * .15
      if (dist < .68) { p.active = false; this.collect(p.kind) } else if (p.y < -9 || p.age > 17) p.active = false
    }
    for (const p of this.particles) { if (!p.active) continue; p.life -= time; if (p.life <= 0) { p.active = false; continue }; p.x += p.vx * time; p.y += p.vy * time; p.vx *= 1 - time * 2.4; p.vy *= 1 - time * 2.4 }
  }
}
