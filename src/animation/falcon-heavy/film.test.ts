import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import sharp from 'sharp'
import { DURATION } from './mission'

const base=new URL('../../../',import.meta.url)
const manifest=JSON.parse(await readFile(new URL('public/videos/falcon-heavy-dual-landing.json',base),'utf8'))
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')

test('the poster and local film recipe match the current shared model and animation',async()=>{
  const model=await readFile(new URL(`public${manifest.model}`,base))
  assert.equal(manifest.distribution,'local-only')
  assert.equal(manifest.file,'output/videos/falcon-heavy-dual-landing.mp4')
  assert.equal(hash(model),manifest.modelSha256,'Regenerate the film after changing its model')
  const sources=await Promise.all(['mission.ts','world.ts','Canvas.tsx'].map(name=>readFile(new URL(name,import.meta.url))))
  assert.equal(hash(Buffer.concat(sources)),manifest.renderSourceSha256,'Run npm run film:falcon-heavy after changing the animation')
  assert.equal(manifest.duration,DURATION);assert.equal(manifest.frames,DURATION*30)
  assert.equal(manifest.fps,30);assert.equal(manifest.audio,false)
  const poster=await sharp(new URL('public/videos/falcon-heavy-dual-landing.jpg',base).pathname).metadata()
  assert.equal(poster.width,1920);assert.equal(poster.height,1080)
})

test('the optional local MP4 matches its recorded render',async context=>{
  let video:Buffer
  try { video=await readFile(new URL(manifest.file,base)) }
  catch(error) {
    if ((error as NodeJS.ErrnoException).code!=='ENOENT') throw error
    context.skip('MP4 is a local export, excluded from Git and deployment')
    return
  }
  assert.equal(video.toString('ascii',4,8),'ftyp')
  assert.equal(video.length,manifest.bytes);assert.equal(hash(video),manifest.sha256)
})
