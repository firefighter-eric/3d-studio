import { offset, smooth } from './mission'
import type { CameraMode, MissionSample, Vec3 } from './mission'

/** All shot blends use mission time, so pause/rewind doesn't change framing. */
export function missionCamera(s: MissionSample, mode: CameraMode, aspect: number) {
  const fit=Math.max(1,.95/aspect), center=offset(s.position,s.angle,34)
  let look: Vec3, eye: Vec3
  if(mode==='tower') {
    look=[s.position[0]*.5,Math.max(76,center[1]*.6),s.position[2]*.5]
    const d=Math.max(230,center[1]*.8,s.position[0]*.85)*fit
    eye=[look[0]+d*.9,Math.max(65,look[1]-d*.16),look[2]+d]
  } else {
    const final=smooth(391,418,s.time), early=1-smooth(8,35,s.time)
    const stage=smooth(155,161,s.time)*(1-smooth(164,171,s.time))
    const shipCenter=offset(s.shipPosition,s.shipAngle,25)
    const distanceBetween=Math.hypot(...shipCenter.map((v,i)=>v-center[i]))
    const ascent=smooth(0,12,s.time)*(1-smooth(145,155,s.time))
    const d=(150+50*early+ascent*35+stage*distanceBetween*.42-30*final)*(mode==='detail'?.82:1)*fit
    const height=26*(1-smooth(158,166,s.time))-ascent*24
    look=[center[0]-10*final,center[1]+height,center[2]]
    look=look.map((v,i)=>v+(shipCenter[i]-center[i])*stage*.25) as Vec3
    eye=[look[0]+d*(1.3-final*.38),look[1]+d*(.22-final*.08),look[2]+d*(.8+final*.32)]
    if(mode==='detail') {
      const blend=smooth(385,395,s.time), approach=smooth(392,414,s.time), pin=offset(s.position,s.angle,62)
      const closeLook: Vec3=[pin[0]-6*approach,pin[1]-3,pin[2]], closeDistance=(65-approach*27)*fit
      const closeEye: Vec3=[closeLook[0]+closeDistance,closeLook[1]+closeDistance*.72,closeLook[2]+closeDistance*1.35]
      look=look.map((v,i)=>v+(closeLook[i]-v)*blend) as Vec3
      eye=eye.map((v,i)=>v+(closeEye[i]-v)*blend) as Vec3
    }
  }
  return {look,eye}
}
