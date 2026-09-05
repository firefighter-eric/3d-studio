import { mkdir, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { buildFormulaCar, CAR_SPECS } from '../src/racing/cars.ts'

// GLTFExporter uses FileReader even when all assets are geometry-only.
class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  onerror: ((error: unknown) => void) | null = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.() }).catch(error => this.onerror?.(error)) }
}
Object.defineProperty(globalThis, 'FileReader', { value: NodeFileReader, configurable: true })
await mkdir('public/models', { recursive: true })
for (const car of CAR_SPECS) {
  const result=await new GLTFExporter().parseAsync(buildFormulaCar(car.id), { binary:true }) as ArrayBuffer
  await writeFile(`public/models/${car.id}.glb`,Buffer.from(result))
  console.log(`${car.id}.glb: ${(result.byteLength/1024).toFixed(1)} KB`)
}
