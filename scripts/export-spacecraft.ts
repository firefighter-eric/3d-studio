import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { Mesh, Box3, Vector3 } from 'three'
import { buildSpacecraft } from '../src/spacecraft/build.ts'
import { SPACECRAFT } from '../src/spacecraft/specs.ts'
import { NodeIO } from '@gltf-transform/core'
import { dedup, prune, weld } from '@gltf-transform/functions'

class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  onerror: ((error: unknown) => void) | null = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.() }).catch(error => this.onerror?.(error)) }
}
Object.defineProperty(globalThis, 'FileReader', { value: NodeFileReader, configurable: true })
await mkdir('public/models', { recursive: true })
const requested = process.argv.slice(2)
if (requested.some(id => !SPACECRAFT.some(spec => spec.id === id))) throw new Error('Unknown spacecraft ID')
const manifest: Record<string, unknown> = requested.length ? JSON.parse(await readFile('src/spacecraft/manifest.json', 'utf8')) : {}
for (const spec of SPACECRAFT.filter(spec => !requested.length || requested.includes(spec.id))) {
  const model = buildSpacecraft(spec.id)
  let triangles = 0, meshes = 0, tiles = 0
  model.traverse(object => {
    if (object instanceof Mesh) { meshes++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 }
    if (object.userData.tileCount) tiles += object.userData.tileCount
  })
  const dimensions = new Box3().setFromObject(model).getSize(new Vector3())
  const raw = await new GLTFExporter().parseAsync(model, { binary: true }) as ArrayBuffer
  const io = new NodeIO(), document = await io.readBinary(new Uint8Array(raw))
  // Preserve articulated node names and pivots. Weld only identical vertices;
  // deduplicate shared engine hardware without introducing runtime decoders.
  await document.transform(weld(), dedup(), prune({ keepLeaves: true, keepAttributes: true }))
  triangles = 0; meshes = 0
  for (const node of document.getRoot().listNodes()) for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
    meshes++; triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')!.getCount())/3
  }
  const result = await io.writeBinary(document)
  await writeFile(`public/models/${spec.id}.glb`, result)
  manifest[spec.id] = { bytes: result.byteLength, triangles, meshes, hullTiles: tiles, dimensions: dimensions.toArray(), units: 'metres' }
  console.log(`${spec.id}: ${(result.byteLength / 1024 / 1024).toFixed(2)} MB, ${triangles.toLocaleString()} triangles, ${tiles} hull tiles, height ${dimensions.y.toFixed(2)} m`)
}
await writeFile('src/spacecraft/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
