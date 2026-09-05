import { mkdir, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { Mesh, Box3, Vector3 } from 'three'
import { buildSpacecraft } from '../src/spacecraft/build.ts'
import { SPACECRAFT } from '../src/spacecraft/specs.ts'

class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  onerror: ((error: unknown) => void) | null = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.() }).catch(error => this.onerror?.(error)) }
}
Object.defineProperty(globalThis, 'FileReader', { value: NodeFileReader, configurable: true })
await mkdir('public/models', { recursive: true })
const manifest: Record<string, unknown> = {}
for (const spec of SPACECRAFT) {
  const model = buildSpacecraft(spec.id)
  let triangles = 0, meshes = 0, tiles = 0
  model.traverse(object => {
    if (object instanceof Mesh) { meshes++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 }
    if (object.userData.tileCount) tiles += object.userData.tileCount
  })
  const dimensions = new Box3().setFromObject(model).getSize(new Vector3())
  const result = await new GLTFExporter().parseAsync(model, { binary: true }) as ArrayBuffer
  await writeFile(`public/models/${spec.id}.glb`, Buffer.from(result))
  manifest[spec.id] = { bytes: result.byteLength, triangles, meshes, hullTiles: tiles, dimensions: dimensions.toArray(), units: 'metres' }
  console.log(`${spec.id}: ${(result.byteLength / 1024 / 1024).toFixed(2)} MB, ${triangles.toLocaleString()} triangles, ${tiles} hull tiles, height ${dimensions.y.toFixed(2)} m`)
}
await writeFile('src/spacecraft/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
