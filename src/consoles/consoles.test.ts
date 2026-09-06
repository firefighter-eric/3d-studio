import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { getBounds } from '@gltf-transform/functions'
import sharp from 'sharp'
import { CONSOLE_PRODUCTS, consoleModelInfo, consoleModelUrl, consolePreviewUrl, isConsoleProductId } from './specs'
import { assetById, createInstances } from '../data/catalog'

const require = createRequire(import.meta.url)
const draco = require('draco3dgltf') as { createDecoderModule: () => Promise<unknown> }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco.createDecoderModule() })

test('Xbox and PlayStation models have unique products and fit the shared scene contract', () => {
  assert.equal(new Set(CONSOLE_PRODUCTS.map(p => p.id)).size, 4)
  assert.equal(isConsoleProductId('sony-unregistered'), false)
  const instances = createInstances(CONSOLE_PRODUCTS.map(p => p.id), [])
  assert.equal(instances.length, 4)
  for (const product of CONSOLE_PRODUCTS) {
    assert.ok(isConsoleProductId(product.id))
    assert.equal(assetById[product.id].name, product.name)
    const instance = instances.find(i => i.assetId === product.id)!
    assert.ok(instance && instance.scale > 0 && instance.scale <= 3)
    assert.equal(instance.position[1], 0)
    assert.ok(['www.xbox.com', 'www.playstation.com'].includes(new URL(product.source).hostname))
  }
})

for (const product of CONSOLE_PRODUCTS) test(`${product.name}: shipped GLB and preview decode, preserve metres, and contain no remote resources`, async () => {
  const info = consoleModelInfo(product.id), bytes = await readFile(`public${consoleModelUrl(product.id)}`)
  assert.equal(bytes.subarray(0, 4).toString(), 'glTF'); assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length); assert.equal(bytes.length, info.bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), info.sha256)
  assert.equal(info.units, 'metres'); assert.equal(info.engineeringAccuracy, false)
  assert.ok(bytes.length < 2 * 1048576)
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  assert.ok(json.buffers.every((buffer: { uri?: string }) => !buffer.uri))
  assert.ok(json.images.every((image: { uri?: string; bufferView?: number }) => !image.uri && image.bufferView !== undefined))
  const document = await io.readBinary(bytes), nodes = document.getRoot().listNodes(), bounds = getBounds(document.getRoot().listScenes()[0])
  assert.ok(Math.abs(bounds.min[1]) < .001)
  for (const axis of [0, 2]) assert.ok(Math.abs(bounds.min[axis] + bounds.max[axis]) < .001)
  bounds.max.map((value, i) => value - bounds.min[i]).forEach((value, i) => {
    assert.ok(Number.isFinite(value) && value > 0)
    assert.ok(Math.abs(value - info.dimensions[i]) < .001)
    if (product.brand === 'microsoft') assert.ok(Math.abs(value / (product.dimensions[i] / 1000) - 1) < .05)
  })
  assert.ok(info.dimensions[1] > .27 && info.dimensions[1] < .41, 'real console height in metres, including display stand')
  let triangles = 0, draws = 0
  for (const node of nodes) for (const primitive of node.getMesh()?.listPrimitives() || []) {
    assert.ok(primitive.getMaterial()); const position = primitive.getAttribute('POSITION')!
    assert.ok(position.getMin([]).every(Number.isFinite) && position.getMax([]).every(Number.isFinite))
    triangles += (primitive.getIndices()?.getCount() || position.getCount()) / 3; draws++
  }
  assert.equal(triangles, info.triangles); assert.equal(draws, info.meshes)
  assert.ok(draws <= 40 && triangles > 5000 && triangles < 150000)
  assert.ok(nodes.some(node => node.getName() === 'rear-ports-and-exhaust'))
  if (product.brand === 'sony') {
    for (const side of ['left', 'right']) for (const section of ['upper', 'lower']) {
      const cover = nodes.find(node => node.getName() === `${side}-${section}-white-cover`)!
      assert.ok(cover)
      const coverBounds = getBounds(cover)
      assert.ok(coverBounds.max[0] - coverBounds.min[0] > .006, 'covers must have a curved profile')
      assert.ok(coverBounds.max[2] - coverBounds.min[2] > .2, 'covers extend the full console depth')
    }
    assert.equal(nodes.some(node => node.getName() === 'slim-optical-drive-opening'), product.id === 'sony-ps5-slim')
    assert.equal(nodes.filter(node => node.getName().includes('airflow-slit')).length, product.id === 'sony-ps5-pro' ? 6 : 0)
  } else assert.ok(nodes.some(node => node.getName() === (product.id.endsWith('-x') ? 'concave-green-top-vent' : 'circular-side-cooling-grille')))
  const preview = await sharp(`public${consolePreviewUrl(product.id)}`).metadata()
  assert.equal(preview.width, 900); assert.equal(preview.height, 600)
})
