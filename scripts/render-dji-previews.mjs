// Requires the local app and Playwright; PLAYWRIGHT_MODULE can select a host copy.
import { mkdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.DJI_PREVIEW_ORIGIN || 'http://localhost:5180'
const products = JSON.parse(await readFile(new URL('../src/dji/products.json', import.meta.url), 'utf8'))
const output = new URL('../public/models/dji/thumbnails/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const product of products) {
    await page.goto(`${origin}/#models/${product.id}`)
    await page.locator(`.dji-canvas[data-model="${product.id}"][data-rendered="true"]`).waitFor({ timeout: 60000 })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const data = await page.locator('.dji-canvas canvas').evaluate(canvas => canvas.toDataURL('image/png'))
    const bytes = Buffer.from(data.split(',')[1], 'base64')
    const alpha = await sharp(bytes).ensureAlpha().extractChannel('alpha').stats()
    if (alpha.channels[0].mean < 1) throw new Error(`${product.name}: empty model render`)
    await sharp(bytes).trim({ threshold: 5 })
      .resize(550, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: 25, bottom: 25, left: 25, right: 25, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 93 }).toFile(new URL(`${product.slug}.webp`, output).pathname)
    console.log(`${product.name}: 600 × 450 actual model preview`)
  }
  if (errors.length) throw new Error(errors.join('\n'))
} finally { await browser.close() }
