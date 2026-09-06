import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, getBounds, prune, weld } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'
import { buildTeslaModel, teslaLabels } from '../src/tesla/build.ts'
import { TESLA_PRODUCTS } from '../src/tesla/products.ts'

class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  onerror: ((error: unknown) => void) | null = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.() }).catch(error => this.onerror?.(error)) }
}
Object.defineProperty(globalThis, 'FileReader', { value: NodeFileReader, configurable: true })
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
})
const manifest: Record<string, unknown> = {}
await mkdir('public/models/tesla', { recursive: true })
const xml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
for (const product of TESLA_PRODUCTS) {
  teslaLabels.clear()
  const model = buildTeslaModel(product.id)
  const raw = await new GLTFExporter().parseAsync(model, { binary: true }) as ArrayBuffer
  const document = await io.readBinary(new Uint8Array(raw))
  for (const material of document.getRoot().listMaterials()) {
    const artwork = teslaLabels.get(material.getName())
    if (!artwork) continue
    const png = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="768" height="128"><path fill="${artwork.background}" d="M0 0h768v128H0z"/><text x="384" y="88" fill="${artwork.color}" font-family="Arial,sans-serif" font-size="${artwork.text.length > 6 ? 65 : 78}" font-weight="500" letter-spacing="15" text-anchor="middle">${xml(artwork.text)}</text></svg>`)).png().toBuffer()
    material.setBaseColorTexture(document.createTexture(material.getName()).setImage(png).setMimeType('image/png')).setBaseColorFactor([1, 1, 1, 1])
  }
  for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (!teslaLabels.has(primitive.getMaterial()?.getName() || '')) continue
    const uv = primitive.getAttribute('TEXCOORD_0')
    if (!uv) continue
    const array = uv.getArray()!.slice()
    for (let i = 1; i < array.length; i += 2) array[i] = 1 - array[i]
    primitive.setAttribute('TEXCOORD_0', uv.clone().setArray(array))
  }
  document.getRoot().getAsset().copyright = 'Original exterior reconstruction by 3D Studio. Tesla product designs and trademarks belong to Tesla. Not an official Tesla CAD model.'
  document.getRoot().listScenes()[0].setName(product.name)
  await document.transform(weld(), dedup(), prune({ keepLeaves: true, keepAttributes: true }), draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }))
  const bounds = getBounds(document.getRoot().listScenes()[0])
  let triangles = 0, meshes = 0
  for (const node of document.getRoot().listNodes()) for (const primitive of node.getMesh()?.listPrimitives() || []) {
    triangles += (primitive.getIndices()?.getCount() || primitive.getAttribute('POSITION')!.getCount()) / 3; meshes++
  }
  const output = await io.writeBinary(document)
  await writeFile(`public/models/tesla/${product.id}.glb`, output)
  manifest[product.id] = {
    bytes: output.length, triangles, meshes, materials: document.getRoot().listMaterials().length,
    dimensions: bounds.max.map((v, i) => v - bounds.min[i]), units: 'metres',
    sha256: createHash('sha256').update(output).digest('hex'), source: product.source,
    referenceChecked: '2026-09-07', provenance: 'original exterior reconstruction', engineeringAccuracy: false,
  }
  console.log(`${product.name}: ${(output.length / 1048576).toFixed(2)} MB, ${triangles} triangles, ${meshes} meshes`)
}
await writeFile('src/tesla/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
