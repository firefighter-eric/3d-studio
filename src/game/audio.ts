import type { CombatEvent, FlightSimulation } from './simulation'

// Original synthesised music and effects. No audio downloads or autoplay before a gesture.
export class CombatAudio {
  private context?: AudioContext
  private master?: GainNode
  private noise?: AudioBuffer
  private beat = -1
  private lastShot = 0
  enabled = true
  music = true
  private active = false
  private audible?: boolean
  private tailUntil = 0
  async unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = 0; this.master.connect(this.context.destination)
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate)
        const data = this.noise.getChannelData(0); let seed = 179
        for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 16807) & 0x7fffffff); data[i] = seed / 0x3fffffff - 1 }
      }
      if (this.context.state === 'suspended') await this.context.resume()
      this.setActive(this.active)
    } catch { /* Gameplay remains available without a supported audio output. */ }
  }
  setActive(active: boolean) {
    this.active = active
    const audible = active && this.enabled
    if (this.context && this.master && audible !== this.audible) { this.master.gain.setTargetAtTime(audible ? .34 : 0, this.context.currentTime, .04); this.audible = audible }
  }
  setEnabled(enabled: boolean) { this.enabled = enabled; this.setActive(this.active) }
  private tone(frequency: number, duration: number, gain: number, type: OscillatorType = 'sine', end = frequency, pan = 0, delay = 0) {
    const c = this.context; if (!c || !this.master || !this.enabled) return
    const t = c.currentTime + delay, oscillator = c.createOscillator(), envelope = c.createGain(), stereo = c.createStereoPanner()
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration)
    envelope.gain.setValueAtTime(0, t); envelope.gain.linearRampToValueAtTime(gain, t + .008); envelope.gain.exponentialRampToValueAtTime(.001, t + duration)
    stereo.pan.value = Math.max(-.7, Math.min(.7, pan)); oscillator.connect(envelope); envelope.connect(stereo); stereo.connect(this.master)
    oscillator.start(t); oscillator.stop(t + duration + .02); oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); stereo.disconnect() }
  }
  private impact(duration = .22, gain = .3, low = 1500) {
    const c = this.context; if (!c || !this.master || !this.noise || !this.enabled) return
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), envelope = c.createGain(), t = c.currentTime
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(low, t); filter.frequency.exponentialRampToValueAtTime(70, t + duration)
    envelope.gain.setValueAtTime(gain, t); envelope.gain.exponentialRampToValueAtTime(.001, t + duration)
    source.connect(filter); filter.connect(envelope); envelope.connect(this.master); source.start(t); source.stop(t + duration)
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect() }
  }
  update(sim: FlightSimulation, events: CombatEvent[]) {
    if (events.some(e => e.type === 'won' || e.type === 'lost')) this.tailUntil = (this.context?.currentTime ?? 0) + 1.3
    this.setActive(sim.status === 'playing' || (this.context?.currentTime ?? 0) < this.tailUntil)
    if (!this.context || !this.enabled) return
    const beat = Math.floor(sim.elapsed * 112 / 60 * 2)
    if (sim.status === 'playing' && this.music && beat !== this.beat) {
      this.beat = beat
      const notes = [48, 55, 60, 63, 55, 58, 63, 67, 44, 51, 56, 60, 46, 53, 58, 62]
      const note = notes[beat % notes.length] + (sim.boss ? 12 : 0), hz = 440 * Math.pow(2, (note - 69) / 12)
      this.tone(hz, .23, .028, 'triangle', hz)
      if (beat % 4 === 0) { this.tone(hz / 2, .45, .065, 'sine'); this.tone(110, .13, .12, 'sine', 35) }
      if (beat % 4 === 2) this.impact(.035, .023, 4500)
    }
    for (const event of events) {
      if (event.type === 'shot') {
        const now = this.context.currentTime; if (now - this.lastShot < .085) continue; this.lastShot = now
        if (event.value === 'laser') this.tone(230, .07, .022, 'sawtooth', 210, (event.x ?? 0) / 8)
        else if (event.value === 'missile') this.tone(170, .13, .045, 'triangle', 60)
        else this.tone(event.value === 'spread' ? 500 : 800, .07, .04, 'triangle', 180, (event.x ?? 0) / 8)
      }
      if (event.type === 'destroy') { this.impact(event.value === 'boss' ? .8 : .19, event.value === 'boss' ? .55 : .16); this.tone(75, .22, .1, 'sine', 30) }
      if (event.type === 'pickup') [523.25, 659.25, 783.99].forEach((f,i)=>this.tone(f,.18,.1,'sine',f,0,i*.065))
      if (event.type === 'hurt') { this.impact(.28,.25,2300); this.tone(190,.3,.18,'sawtooth',55) }
      if (event.type === 'bomb') { this.impact(.75,.5,4500); this.tone(160,.7,.22,'sine',28) }
      if (event.type === 'boss') [0,.22,.44].forEach(t=>this.tone(180,.15,.11,'square',180,0,t))
      if (event.type === 'won') [523,659,784,1047].forEach((f,i)=>this.tone(f,.5,.15,'triangle',f,0,i*.13))
      if (event.type === 'lost') [220,196,164,110].forEach((f,i)=>this.tone(f,.35,.12,'triangle',f,0,i*.14))
    }
  }
  dispose() { if (this.context) void this.context.close().catch(()=>{}); this.context = undefined }
}
