// Deterministic original 3D film. Start npm run dev, then run this script.
// Requires local Chrome, ffmpeg, and Playwright (or PLAYWRIGHT_MODULE).
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

let playwright
try { playwright=await import(process.env.PLAYWRIGHT_MODULE||'playwright') }
catch(error) {
  if(process.env.PLAYWRIGHT_MODULE)throw error
  playwright=await import(pathToFileURL(join(homedir(),'.codex/node_modules/playwright/index.mjs')).href)
}
const origin=process.env.FALCON_FILM_ORIGIN||'http://localhost:5180'
const folder=new URL('../output/videos/',import.meta.url).pathname
const publicFolder=new URL('../public/videos/',import.meta.url).pathname
await mkdir(folder,{recursive:true})
await mkdir(publicFolder,{recursive:true})
const temporary=join(folder,'falcon-heavy-dual-landing.partial.mp4'),output=join(folder,'falcon-heavy-dual-landing.mp4')
const width=1920,height=1080,fps=30
const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=metal']})
let encoder,encoded=false
try {
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1})
  const errors=[]
  page.on('pageerror',error=>errors.push(String(error)))
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  await page.goto(`${origin}/?render=falcon-heavy#animations/falcon-heavy-recovery`,{waitUntil:'networkidle'})
  await page.locator('.fh-export[data-rendered="true"]').waitFor({timeout:60000})
  await page.evaluate(()=>document.fonts.ready)
  const duration=await page.evaluate(()=>window.__falconHeavyFilm.duration)
  const frames=Math.round(duration*fps)
  encoder=spawn(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','slow','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',temporary],{stdio:['pipe','ignore','pipe']})
  let stderr='';encoder.stderr.on('data',data=>stderr+=data)
  const completion=new Promise((resolve,reject)=>{encoder.once('error',reject);encoder.once('exit',code=>code===0?resolve():reject(new Error(`ffmpeg exited ${code}: ${stderr}`)))})
  completion.catch(()=>{})
  encoder.stdin.on('error',()=>{})
  for(let frame=0;frame<frames;frame++) {
    if(encoder.exitCode!==null)await completion
    const url=await page.evaluate(time=>window.__falconHeavyFilm.render(time),frame/fps)
    const bytes=Buffer.from(url.split(',')[1],'base64')
    if(!encoder.stdin.write(bytes))await Promise.race([once(encoder.stdin,'drain'),completion])
    if(errors.length)throw new Error(errors.join('\n'))
    if(frame%150===0)console.log(`Rendered ${frame}/${frames} frames (${Math.round(frame/frames*100)}%)`)
  }
  encoder.stdin.end();await completion
  const poster=await page.evaluate(()=>window.__falconHeavyFilm.render(45.2,false))
  await sharp(Buffer.from(poster.split(',')[1],'base64')).jpeg({quality:93}).toFile(join(publicFolder,'falcon-heavy-dual-landing.jpg'))
  const bytes=await readFile(temporary)
  const modelBytes=await readFile(new URL('../public/models/falcon-heavy.glb',import.meta.url))
  const renderSources=await Promise.all(['mission.ts','world.ts','Canvas.tsx'].map(name=>readFile(new URL(`../src/animation/falcon-heavy/${name}`,import.meta.url))))
  const renderSourceSha256=createHash('sha256').update(Buffer.concat(renderSources)).digest('hex')
  await rename(temporary,output);encoded=true
  await writeFile(join(publicFolder,'falcon-heavy-dual-landing.json'),JSON.stringify({title:'猎鹰重型：双芯归来',file:'output/videos/falcon-heavy-dual-landing.mp4',distribution:'local-only',width,height,fps,frames,duration,audio:false,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),model:'/models/falcon-heavy.glb',modelSha256:createHash('sha256').update(modelBytes).digest('hex'),renderSourceSha256,reference:'https://www.youtube.com/watch?v=A0FZIwabctw&t=82s',provenance:'Original project 3D render; public-reference visualization, compressed flight phases, approximate geometry and trajectories.'},null,2)+'\n')
  console.log(`Saved ${output}: ${duration}s, ${frames} frames, ${(bytes.length/1048576).toFixed(1)} MB`)
} finally {
  if(encoder&&encoder.exitCode===null)encoder.kill('SIGTERM')
  await browser.close()
  if(!encoded)await rm(temporary,{force:true})
}
