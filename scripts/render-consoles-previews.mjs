// Render product-library artwork from the actual runtime models. Requires a
// running dev server and Playwright (PLAYWRIGHT_MODULE may point to a host copy).
import { mkdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.CONSOLE_PREVIEW_ORIGIN || 'http://localhost:5180'
const manifest = JSON.parse(await readFile(new URL('../src/consoles/manifest.json', import.meta.url), 'utf8'))
await mkdir(new URL('../public/models/consoles/', import.meta.url), { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=metal'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5 })
  for (const id of Object.keys(manifest)) {
    await page.goto(`${origin}/#models/${id}`)
    await page.locator(`[data-model="${id}"][data-rendered="true"]`).waitFor({ timeout: 60000 })
    await page.evaluate(() => {
      const el = document.querySelector('.workspace-canvas')
      el.style.setProperty('width', '900px', 'important')
      el.style.setProperty('height', '600px', 'important')
      el.style.setProperty('min-height', '600px', 'important')
    })
    await page.waitForFunction(() => {
      const c = document.querySelector('.workspace-canvas canvas')
      return c && c.clientWidth === 900 && c.clientHeight === 600
    })
    // ResizeObserver and the demand renderer both run before sampling artwork.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
    const data = await page.locator('.workspace-canvas canvas').evaluate(canvas => canvas.toDataURL('image/png'))
    const bytes = Buffer.from(data.split(',')[1], 'base64')
    await sharp(bytes).resize(900, 600).webp({ quality: 94, alphaQuality: 100 }).toFile(new URL(`../public/models/consoles/${id}.webp`, import.meta.url).pathname)
    console.log(`${id}: rendered 900 × 600 preview`)
  }
} finally { await browser.close() }
