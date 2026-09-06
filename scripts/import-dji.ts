import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join as joinPath } from 'node:path'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, getBounds, join, prune, textureCompress, weld } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'
import products from '../src/dji/products.json'
import { buildDjiStudy, surfaceLabels } from '../src/dji/build.ts'

class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  onerror: ((error: unknown) => void) | null = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.() }).catch(error => this.onerror?.(error)) }
}
Object.defineProperty(globalThis, 'FileReader', { value: NodeFileReader, configurable: true })
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})
const cache = process.env.DJI_SOURCE_CACHE || joinPath(tmpdir(), '3d-studio-dji-sources')
await mkdir(cache, { recursive: true }); await mkdir('public/models/dji', { recursive: true })
await mkdir('public/vendor/draco', { recursive: true })
for (const file of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) await copyFile(`node_modules/three/examples/jsm/libs/draco/gltf/${file}`, `public/vendor/draco/${file}`)
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const manifest: Record<string, unknown> = {}
const escapeXml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

for (const product of products) {
  const variants: Record<string, unknown> = {}
  for (const variant of product.variants) {
    let document
    let sourceSha256: string | undefined
    if ('source' in variant && variant.source) {
      const path = joinPath(cache, `${product.slug}-${variant.key}.glb`)
      let raw: Uint8Array
      try { raw = await readFile(path) } catch {
        const response = await fetch(variant.source)
        if (!response.ok) throw new Error(`${product.name}: ${response.status}`)
        raw = new Uint8Array(await response.arrayBuffer())
        if (hash(raw) !== variant.sourceSha256) throw new Error(`${product.name}: source changed; review it before updating the pinned digest`)
        await writeFile(path, raw)
      }
      sourceSha256 = hash(raw)
      if (sourceSha256 !== variant.sourceSha256) throw new Error(`${product.name}: cached source digest mismatch`)
      document = await io.readBinary(raw)
    } else {
      surfaceLabels.clear()
      const study = buildDjiStudy(product, variant.key)
      const raw = await new GLTFExporter().parseAsync(study, { binary: true }) as ArrayBuffer
      document = await io.readBinary(new Uint8Array(raw))
      for (const material of document.getRoot().listMaterials()) {
        const artwork = surfaceLabels.get(material.getName())
        if (!artwork) continue
        const { text, background, screen } = artwork
        // Original display artwork: no photographs baked into the reconstruction.
        const image = screen
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="640"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#315263"/><stop offset="1" stop-color="#d6b385"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h1024v640H0z"/><path fill="#3c5559" d="M0 500L210 270 350 411 560 175 840 476 1024 300V640H0z"/><path fill="#182e36" d="M0 569L370 408 760 585 1024 501V640H0z"/><g fill="#edf3e7" font-family="Arial" font-size="37"><text x="32" y="61">${escapeXml(text)}</text><text x="32" y="602">00:12:48</text><text x="735" y="602">REC ●</text></g><rect x="933" y="24" width="50" height="25" rx="4" fill="none" stroke="#e7eedb" stroke-width="4"/><path d="M505 287v60m-30-30h60" stroke="#eef4e4" stroke-width="2" fill="none"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="256"><path fill="${background}" d="M0 0h1024v256H0z"/><text x="512" y="174" fill="#cdd2d0" font-family="Arial,sans-serif" font-size="${text.length > 12 ? 83 : 120}" font-weight="600" font-style="${text === 'DJI' ? 'italic' : 'normal'}" text-anchor="middle" letter-spacing="8">${escapeXml(text)}</text></svg>`
        const texture = document.createTexture(material.getName()).setImage(await sharp(Buffer.from(image)).flip().png().toBuffer()).setMimeType('image/png')
        material.setBaseColorTexture(texture).setBaseColorFactor([1, 1, 1, 1])
        if (screen) material.setEmissiveTexture(texture).setEmissiveFactor([.16, .16, .16])
      }
      // Merge static detail meshes by material while preserving named assemblies.
      await document.transform(weld(), dedup(), join({ keepNamed: true }))
    }
    const scene = document.getRoot().listScenes()[0]
    const origin = document.createNode(product.id)
    const existing = scene.listChildren()
    scene.addChild(origin)
    for (const child of existing) origin.addChild(child)
    const multiplier = product.quality === 'official' ? product.sourceScale : 1
    origin.setScale([multiplier, multiplier, multiplier])
    const initial = getBounds(scene)
    origin.setTranslation([-(initial.min[0] + initial.max[0]) / 2, -initial.min[1], -(initial.min[2] + initial.max[2]) / 2])
    scene.setName(product.name)
    document.getRoot().getAsset().copyright = product.quality === 'official' ? 'DJI. Public product-viewer asset; no separate redistribution license supplied.' : '3D Studio exterior reconstruction. DJI product design and trademarks belong to DJI.'
    origin.setExtras({ product: product.name, provenance: product.quality, source: product.source, engineeringAccuracy: false })
    await document.transform(dedup(), prune({ keepLeaves: true }), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [4096, 4096], quality: 95 }), draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }))
    const output = await io.writeBinary(document)
    // Measure the encoded delivery, since Draco removes zero-area triangles.
    const delivery = await io.readBinary(output)
    const bounds = getBounds(delivery.getRoot().listScenes()[0]), dimensions = bounds.max.map((value, i) => value - bounds.min[i])
    let triangles = 0, meshes = 0
    for (const node of delivery.getRoot().listNodes()) for (const primitive of node.getMesh()?.listPrimitives() || []) {
      triangles += (primitive.getIndices()?.getCount() || primitive.getAttribute('POSITION')!.getCount()) / 3; meshes++
    }
    const file = `/models/dji/${product.slug}-${variant.key}.glb`
    await writeFile(`public${file}`, output)
    variants[variant.key] = { file, bytes: output.length, triangles, meshes, textures: document.getRoot().listTextures().length, dimensions, sha256: hash(output), ...(sourceSha256 ? { sourceSha256 } : {}) }
    console.log(`${product.name} / ${variant.key}: ${(output.length / 1048576).toFixed(2)} MB, ${Math.round(triangles).toLocaleString()} triangles`)
  }
  manifest[product.id] = { quality: product.quality, units: 'metres', dimensionAccuracy: product.quality === 'official' ? 'manufacturer visualization' : 'estimated exterior proportions', variants }
}
await writeFile('src/dji/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
