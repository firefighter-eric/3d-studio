import type { RaceSimulation } from './race'

export class RaceAudio {
  context:AudioContext|null=null;master:GainNode|null=null;engine:OscillatorNode|null=null;engineGain:GainNode|null=null;skidGain:GainNode|null=null;muted=false;lastEvent=0;lastCount=4
  init(){
    if(this.context){void this.context.resume();return}
    const context=new AudioContext();this.context=context
    const master=context.createGain();master.gain.value=this.muted?0:.28;master.connect(context.destination);this.master=master
    const engine=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain();engine.type='sawtooth';engine.frequency.value=48;filter.type='lowpass';filter.frequency.value=750;filter.Q.value=.7;gain.gain.value=0;engine.connect(filter);filter.connect(gain);gain.connect(master);engine.start();this.engine=engine;this.engineGain=gain
    const buffer=context.createBuffer(1,context.sampleRate*.4,context.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.5
    const source=context.createBufferSource(),skid=context.createGain(),high=context.createBiquadFilter();source.buffer=buffer;source.loop=true;high.type='bandpass';high.frequency.value=1350;high.Q.value=.6;skid.gain.value=0;source.connect(high);high.connect(skid);skid.connect(master);source.start();this.skidGain=skid
  }
  setMuted(muted:boolean){this.muted=muted;if(this.master&&this.context)this.master.gain.setTargetAtTime(muted?0:.28,this.context.currentTime,.025)}
  beep(frequency:number,duration=.1,type:OscillatorType='sine',volume=.2){
    if(!this.context||!this.master||this.muted)return
    const c=this.context,osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.value=frequency;gain.gain.setValueAtTime(volume,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);osc.connect(gain);gain.connect(this.master);osc.start();osc.stop(c.currentTime+duration)
  }
  silence(){if(this.context){this.engineGain?.gain.setTargetAtTime(0,this.context.currentTime,.03);this.skidGain?.gain.setTargetAtTime(0,this.context.currentTime,.02)}}
  update(race:RaceSimulation){
    if(!this.context)return
    const c=this.context,p=race.player,active=race.status==='racing'
    this.engine?.frequency.setTargetAtTime(46+p.speed*2.4+(p.boost>0?22:0),c.currentTime,.07)
    this.engineGain?.gain.setTargetAtTime(active?.12+p.speed*.0013:0,c.currentTime,.06)
    this.skidGain?.gain.setTargetAtTime(active&&p.drifting?.18:0,c.currentTime,.05)
    const count=Math.ceil(race.countdown);if(race.status==='countdown'&&count!==this.lastCount){this.lastCount=count;this.beep(560,.12,'sine',.3)}
    for(const event of race.events)if(event.seq>this.lastEvent){
      if(event.racer===0){if(event.kind==='pickup'||event.kind==='drift')this.beep(880,.18,'triangle',.28);if(event.kind==='boost')this.beep(180,.35,'sawtooth',.12);if(event.kind==='hit')this.beep(90,.12,'triangle',.22);if(event.kind==='item')this.beep(640,.24,'sine',.25);if(event.kind==='lap')this.beep(1100,.35,'sine',.28);if(event.kind==='start'&&race.status==='racing')this.beep(1000,.42,'sine',.3);if(event.kind==='finish')this.beep(1320,.75,'triangle',.3)}
      this.lastEvent=event.seq
    }
  }
  dispose(){this.silence();void this.context?.close();this.context=null}
}
