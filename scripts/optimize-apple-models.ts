import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, flatten, join, prune, weld, getBounds, textureCompress } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'
import products from '../src/apple/products.json'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
})
const manifest: Record<string, unknown> = {}
await mkdir('public/models/apple', { recursive: true })
await mkdir('public/vendor/draco', { recursive: true })
for (const file of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) {
  // Shared local decoder, also used by the DJI collection.
  await copyFile(`node_modules/three/examples/jsm/libs/draco/gltf/${file}`, `public/vendor/draco/${file}`)
}
for (const product of products) {
  const document = await io.read(`/private/tmp/3d-studio-apple-raw/${product.id}.glb`)
  const source = JSON.parse(await readFile(`/private/tmp/3d-studio-apple-raw/${product.id}.json`, 'utf8'))
  // Static product exhibits do not need hundreds of tiny mesh nodes. Join by
  // material while preserving the original surfaces, UVs and embedded textures.
  await document.transform(weld(), dedup(), flatten(), join(), prune())
  await document.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor|emissive)Texture$/, quality: 92, effort: 70 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', formats: /png|jpeg/, lossless: true, effort: 70 }),
    draco({ method: 'edgebreaker', quantizePosition: 16, quantizeTexcoord: 14 }),
  )
  const root = document.getRoot()
  root.getDefaultScene()?.setName(product.id)
  let triangles = 0, primitives = 0
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    primitives++
    triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')!.getCount()) / 3
  }
  const binary = await io.writeBinary(document)
  // Draco drops unused vertices. Frame the exact shipped, decoded geometry.
  const decoded = await io.readBinary(binary)
  const bounds = getBounds(decoded.getRoot().getDefaultScene()!)
  const dimensions = bounds.max.map((value, i) => value - bounds.min[i])
  await writeFile(`public/models/apple/${product.id}.glb`, binary)
  manifest[product.id] = { ...source, dimensions, bounds, bytes: binary.byteLength,
    triangles, primitives, textures: root.listTextures().length,
    sha256: createHash('sha256').update(binary).digest('hex') }
  console.log(`${product.id}: ${(binary.byteLength / 1048576).toFixed(2)} MiB, ${triangles} triangles, ${primitives} draw calls`)
}
await writeFile('src/apple/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
