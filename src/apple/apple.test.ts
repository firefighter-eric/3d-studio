import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { getBounds } from '@gltf-transform/functions'
// @ts-expect-error draco3dgltf exposes no TypeScript declarations.
import draco3d from 'draco3dgltf'
import { APPLE_PRODUCTS, appleModelInfo, appleModelUrl } from './specs'
import { assets, createInstances, readAdditions, saveAdditions } from '../data/catalog'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
})

for (const product of APPLE_PRODUCTS) test(`${product.name}: shipped GLB decodes with complete local resources and a grounded metre-space origin`, async () => {
  const data = readFileSync(new URL(`../../public${appleModelUrl(product.id)}`, import.meta.url))
  const info = appleModelInfo(product.id)
  assert.equal(data.readUInt32LE(0), 0x46546c67)
  assert.equal(data.readUInt32LE(4), 2)
  assert.equal(data.readUInt32LE(8), data.length)
  assert.equal(createHash('sha256').update(data).digest('hex'), info.sha256)
  assert.ok(data.length < 12 * 1048576, 'A product must stay under the 12 MiB download budget')
  const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString())
  assert.ok(json.buffers.every((buffer: { uri?: string }) => !buffer.uri), 'External buffers are not allowed')
  assert.ok(json.images.length > 0)
  assert.ok(json.images.every((image: { uri?: string; bufferView?: number }) => !image.uri && image.bufferView !== undefined), 'Textures must be embedded')
  const document = await io.readBinary(data)
  const bounds = getBounds(document.getRoot().getDefaultScene()!)
  assert.ok(Math.abs(bounds.min[1]) < 0.0001, 'The exhibit must rest on the floor')
  for (let axis = 0; axis < 3; axis++) {
    const dimension = bounds.max[axis] - bounds.min[axis]
    assert.ok(Number.isFinite(dimension) && dimension > 0.001 && dimension < 1, 'Product dimensions must remain in metres')
    assert.ok(Math.abs(dimension - info.dimensions[axis]) < 0.0001, 'Decoded geometry must match the viewer framing metadata')
    if (axis !== 1) assert.ok(Math.abs(bounds.max[axis] + bounds.min[axis]) < 0.0001, 'The exhibit must be horizontally centred')
  }
  assert.ok(document.getRoot().listMaterials().length > 2)
})

test('All nine Apple products have unique catalog entries, previews and local decoders', () => {
  assert.equal(APPLE_PRODUCTS.length, 9)
  assert.equal(new Set(assets.map(asset => asset.id)).size, assets.length)
  for (const product of APPLE_PRODUCTS) {
    assert.equal(assets.filter(asset => asset.id === product.id).length, 1)
    const png = readFileSync(new URL(`../../public/models/apple/${product.id}.png`, import.meta.url))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.ok(png.length > 5000, 'A preview must contain a rendered product')
  }
  for (const file of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) {
    assert.ok(readFileSync(new URL(`../../public/vendor/draco/${file}`, import.meta.url)).length > 1000)
  }
})

test('Apple scene additions survive storage validation with useful exhibit scales', () => {
  const values = new Map<string, string>()
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } })
  try {
    const additions = createInstances(APPLE_PRODUCTS.map(product => product.id), [])
    saveAdditions(additions)
    assert.deepEqual(readAdditions(), additions)
    assert.equal(additions.length, 9)
    assert.ok(additions.every(instance => instance.position[1] === 0 && instance.scale >= 1 && instance.scale <= 3))
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
