export const ROAD_HALF_WIDTH = 8.5
export const TRACK_POINTS: readonly [number,number][] = [[0,0],[0,88],[-24,138],[-87,144],[-128,103],[-99,51],[-135,4],[-111,-52],[-45,-61],[-7,-108],[59,-105],[110,-69],[98,-7],[56,16],[38,-31],[12,-40]]
export const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n))
export const wrapAngle=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n))
export interface TrackPoint { x:number;z:number;tx:number;tz:number;nx:number;nz:number;s:number;index:number }
function spline(p0:number,p1:number,p2:number,p3:number,t:number) { return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t) }
const raw: {x:number;z:number;s:number}[]=[]
for(let i=0;i<TRACK_POINTS.length;i++) for(let j=0;j<48;j++) {
  const p0=TRACK_POINTS[(i-1+TRACK_POINTS.length)%TRACK_POINTS.length],p1=TRACK_POINTS[i],p2=TRACK_POINTS[(i+1)%TRACK_POINTS.length],p3=TRACK_POINTS[(i+2)%TRACK_POINTS.length]
  const t=j/48,x=spline(p0[0],p1[0],p2[0],p3[0],t),z=spline(p0[1],p1[1],p2[1],p3[1],t)
  const prev=raw[raw.length-1];raw.push({x,z,s:prev?prev.s+Math.hypot(x-prev.x,z-prev.z):0})
}
export const TRACK_LENGTH=raw[raw.length-1].s+Math.hypot(raw[0].x-raw[raw.length-1].x,raw[0].z-raw[raw.length-1].z)
export const TRACK: TrackPoint[]=raw.map((p,index)=>{ const a=raw[(index+raw.length-1)%raw.length],b=raw[(index+1)%raw.length],len=Math.hypot(b.x-a.x,b.z-a.z); const tx=(b.x-a.x)/len,tz=(b.z-a.z)/len;return {...p,tx,tz,nx:tz,nz:-tx,index} })
export function trackAt(distance:number,offset=0):TrackPoint {
  const s=((distance%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH
  let lo=0,hi=TRACK.length-1
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(TRACK[mid].s<=s)lo=mid;else hi=mid-1}
  const a=TRACK[lo],b=TRACK[(lo+1)%TRACK.length],t=(s-a.s)/((lo===TRACK.length-1?TRACK_LENGTH:b.s)-a.s)
  const tx=a.tx+(b.tx-a.tx)*t,tz=a.tz+(b.tz-a.tz)*t,len=Math.hypot(tx,tz),nx=tz/len,nz=-tx/len
  return {x:a.x+(b.x-a.x)*t+nx*offset,z:a.z+(b.z-a.z)*t+nz*offset,tx:tx/len,tz:tz/len,nx,nz,s,index:lo}
}
export function nearestTrack(x:number,z:number,hint?:number): TrackPoint & {offset:number;distance:number} {
  let best=Infinity,result=TRACK[0],bestS=0,bestX=0,bestZ=0
  const count=hint===undefined?TRACK.length:35,start=hint===undefined?0:hint-17
  for(let j=0;j<count;j++) {
    const i=(start+j+TRACK.length)%TRACK.length,a=TRACK[i],b=TRACK[(i+1)%TRACK.length],dx=b.x-a.x,dz=b.z-a.z
    const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+dx*t,pz=a.z+dz*t,d=(x-px)**2+(z-pz)**2
    if(d<best){best=d;result=a;bestS=a.s+Math.hypot(dx,dz)*t;bestX=px;bestZ=pz}
  }
  const p=trackAt(bestS);return {...p,index:result.index,x:bestX,z:bestZ,offset:(x-bestX)*p.nx+(z-bestZ)*p.nz,distance:Math.sqrt(best)}
}
export function circuitCurve(progress:number) { const a=trackAt(progress),b=trackAt(progress+16);return wrapAngle(Math.atan2(b.tx,b.tz)-Math.atan2(a.tx,a.tz))/16 }
export const PICKUP_PROGRESS=[75,210,340,470,610,760].map(s=>s/TRACK_LENGTH*TRACK_LENGTH).filter(s=>s<TRACK_LENGTH-15)
export const MINIMAP_POINTS=TRACK.filter((_,i)=>i%5===0).map(p=>`${((p.x+151)/283*144+8).toFixed(1)},${((155-p.z)/285*144+8).toFixed(1)}`).join(' ')
export const minimapPoint=(x:number,z:number)=>({x:(x+151)/283*144+8,y:(155-z)/285*144+8})
