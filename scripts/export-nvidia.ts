import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, getBounds, prune, weld } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'
import { buildNvidiaModel, nvidiaLabels } from '../src/nvidia/build.ts'
import { NVIDIA_PRODUCTS, isGeForceProductId, isNvidiaProductId } from '../src/nvidia/products.ts'

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
const requested = process.argv.slice(2)
for (const id of requested) if (!isNvidiaProductId(id)) throw new Error(`Unknown NVIDIA product: ${id}`)
const products = NVIDIA_PRODUCTS.filter(product => !requested.length || requested.includes(product.id))
const manifest: Record<string, unknown> = requested.length ? JSON.parse(await readFile('src/nvidia/manifest.json', 'utf8')) : {}
await mkdir('public/models/nvidia', { recursive: true })
await mkdir('public/vendor/draco', { recursive: true })
for (const file of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) await copyFile(`node_modules/three/examples/jsm/libs/draco/gltf/${file}`, `public/vendor/draco/${file}`)
const xml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

// Original texture artwork only: no product photographs embedded in the GLBs.
function porousArtwork() {
  let seed = 72
  const random = () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296 }
  let marks = ''
  for (let i = 0; i < 19000; i++) {
    const x = random() * 1024, y = random() * 1024, r = .5 + random() * 1.9
    marks += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${i % 3 ? '#383930' : '#d7c7a0'}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><path fill="#a5987a" d="M0 0h1024v1024H0z"/>${marks}</svg>`
}
const porousImage = await sharp(Buffer.from(porousArtwork())).png().toBuffer()
for (const product of products) {
  nvidiaLabels.clear()
  const model = buildNvidiaModel(product.id)
  const raw = await new GLTFExporter().parseAsync(model, { binary: true }) as ArrayBuffer
  const document = await io.readBinary(new Uint8Array(raw))
  for (const material of document.getRoot().listMaterials()) {
    const artwork = nvidiaLabels.get(material.getName())
    if (!artwork) continue
    const png = artwork.porous ? porousImage : await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="192"><path fill="${artwork.background}" d="M0 0h1024v192H0z"/><text x="512" y="128" fill="${artwork.color}" font-family="Arial,sans-serif" font-size="${artwork.text.length > 11 ? 82 : 103}" font-weight="600" letter-spacing="5" text-anchor="middle">${xml(artwork.text)}</text></svg>`)).png().toBuffer()
    const texture = document.createTexture(material.getName()).setImage(png).setMimeType('image/png')
    material.setBaseColorTexture(texture).setBaseColorFactor([1, 1, 1, 1])
  }
  // Textures are attached after Three exports the untextured geometry. Convert
  // its bottom-left UV origin to glTF's image convention so labels read upright.
  for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (!nvidiaLabels.has(primitive.getMaterial()?.getName() || '')) continue
    const uv = primitive.getAttribute('TEXCOORD_0')
    if (!uv) continue
    const array = uv.getArray()!.slice()
    for (let i = 1; i < array.length; i += 2) array[i] = 1 - array[i]
    primitive.setAttribute('TEXCOORD_0', uv.clone().setArray(array))
  }
  document.getRoot().getAsset().copyright = '3D Studio exterior reconstruction. NVIDIA product designs and trademarks belong to NVIDIA. Not an official NVIDIA CAD asset.'
  document.getRoot().listScenes()[0].setName(product.name)
  // Embedded textures and Draco geometry; the runtime decoder ships locally.
  await document.transform(weld(), dedup(), prune({ keepLeaves: true, keepAttributes: true }), draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }))
  const scene = document.getRoot().listScenes()[0], bounds = getBounds(scene)
  let triangles = 0, meshes = 0
  for (const node of document.getRoot().listNodes()) for (const primitive of node.getMesh()?.listPrimitives() || []) {
    triangles += (primitive.getIndices()?.getCount() || primitive.getAttribute('POSITION')!.getCount()) / 3; meshes++
  }
  const output = await io.writeBinary(document)
  await writeFile(`public/models/nvidia/${product.id}.glb`, output)
  manifest[product.id] = {
    bytes: output.length, triangles, meshes, materials: document.getRoot().listMaterials().length,
    dimensions: bounds.max.map((v, i) => v - bounds.min[i]), units: 'metres',
    sha256: createHash('sha256').update(output).digest('hex'), source: product.source,
    technicalSource: product.technicalSource, referenceChecked: isGeForceProductId(product.id) ? '2026-09-07' : '2026-09-06',
    provenance: 'original exterior reconstruction', engineeringAccuracy: false,
  }
  console.log(`${product.name}: ${(output.length / 1048576).toFixed(2)} MB, ${Math.round(triangles)} triangles, ${meshes} meshes`)
}
await writeFile('src/nvidia/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
