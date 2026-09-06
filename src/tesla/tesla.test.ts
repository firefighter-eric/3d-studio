import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { getBounds } from '@gltf-transform/functions'
import sharp from 'sharp'
import { TESLA_PRODUCTS, teslaModelInfo, teslaModelUrl, teslaPreviewUrl, isTeslaProductId } from './specs'
import { assetById, createInstances } from '../data/catalog'

const require = createRequire(import.meta.url)
const draco = require('draco3dgltf') as { createDecoderModule: () => Promise<unknown> }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco.createDecoderModule() })

test('Tesla products have unique IDs, verified provenance links and grounded scene placement', () => {
  assert.equal(TESLA_PRODUCTS.length, 12)
  assert.equal(new Set(TESLA_PRODUCTS.map(p => p.id)).size, 12)
  assert.equal(isTeslaProductId('tesla-unregistered-model'), false)
  const instances = createInstances(TESLA_PRODUCTS.map(p => p.id), [])
  assert.equal(instances.length, 12)
  for (const product of TESLA_PRODUCTS) {
    assert.equal(assetById[product.id].name, product.name)
    const instance = instances.find(i => i.assetId === product.id)!
    assert.ok(instance && instance.scale > 0 && instance.scale <= 3)
    assert.equal(instance.position[1], 0)
    assert.equal(new URL(product.source).hostname, 'www.tesla.com')
  }
})

for (const product of TESLA_PRODUCTS) test(`${product.name}: GLB and thumbnail ship locally, decode, fit the web budget and preserve the scene pivot`, async () => {
  const info = teslaModelInfo(product.id)
  const bytes = await readFile(new URL(`../../public${teslaModelUrl(product.id)}`, import.meta.url))
  assert.equal(bytes.subarray(0, 4).toString(), 'glTF')
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  assert.equal(bytes.length, info.bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), info.sha256)
  assert.ok(bytes.length < 1048576, 'each product stays below 1 MiB')
  assert.equal(info.units, 'metres')
  assert.equal(info.engineeringAccuracy, false)
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  assert.ok(json.buffers.every((buffer: { uri?: string }) => !buffer.uri))
  assert.ok((json.images || []).every((image: { uri?: string; bufferView?: number }) => !image.uri && image.bufferView !== undefined))
  const document = await io.readBinary(bytes), bounds = getBounds(document.getRoot().listScenes()[0])
  assert.ok(Math.abs(bounds.min[1]) < .001, 'Y=0 floor pivot')
  for (const axis of [0, 2]) assert.ok(Math.abs(bounds.min[axis] + bounds.max[axis]) < .001, 'centered X/Z pivot')
  const dimensions = bounds.max.map((value, i) => value - bounds.min[i])
  dimensions.forEach((value, i) => assert.ok(Number.isFinite(value) && value > 0 && Math.abs(value - info.dimensions[i]) < .001))
  let triangles = 0, draws = 0
  for (const node of document.getRoot().listNodes()) for (const primitive of node.getMesh()?.listPrimitives() || []) {
    assert.ok(primitive.getMaterial())
    const position = primitive.getAttribute('POSITION')!
    assert.ok(position.getMin([]).every(Number.isFinite) && position.getMax([]).every(Number.isFinite))
    triangles += (primitive.getIndices()?.getCount() || position.getCount()) / 3; draws++
  }
  assert.equal(triangles, info.triangles)
  assert.equal(draws, info.meshes)
  assert.ok(draws <= 24 && triangles > 2000 && triangles < 160000)
  const preview = await readFile(new URL(`../../public${teslaPreviewUrl(product.id)}`, import.meta.url))
  const metadata = await sharp(preview).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 900)
  assert.equal(metadata.height, 600)
})
