import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { getBounds } from '@gltf-transform/functions'
import { NVIDIA_PRODUCTS, GEFORCE_PRODUCTS, nvidiaModelInfo, nvidiaModelUrl, isNvidiaProductId } from './specs'
import { assetById, createInstances } from '../data/catalog'

const require = createRequire(import.meta.url)
const draco = require('draco3dgltf') as { createDecoderModule: () => Promise<unknown> }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco.createDecoderModule() })

test('NVIDIA products resolve through the shared catalog and scene placement contract', () => {
  assert.equal(new Set(NVIDIA_PRODUCTS.map(p => p.id)).size, NVIDIA_PRODUCTS.length)
  assert.equal(isNvidiaProductId('nvidia-unregistered-product'), false)
  const instances = createInstances(NVIDIA_PRODUCTS.map(p => p.id), [])
  assert.equal(instances.length, NVIDIA_PRODUCTS.length)
  for (const product of NVIDIA_PRODUCTS) {
    assert.ok(isNvidiaProductId(product.id))
    assert.equal(assetById[product.id].name, product.name)
    const instance = instances.find(i => i.assetId === product.id)!
    assert.ok(instance && instance.scale > 0 && instance.scale <= 3)
    assert.equal(instance.position[1], 0)
    assert.ok(product.source.startsWith('https://www.nvidia.com/'))
  }
})

test('GeForce generations retain their distinct FE cooling layouts and compact 5090 thickness', async () => {
  const expected = {
    'nvidia-gtx-1080-ti': ['radial-blower:front'],
    'nvidia-rtx-2080-ti': ['axial-fan:front', 'axial-fan:front'],
    'nvidia-rtx-3090': ['axial-fan:front', 'axial-fan:rear'],
    'nvidia-rtx-4090': ['axial-fan:front', 'axial-fan:rear'],
    'nvidia-rtx-5090': ['axial-fan:front', 'axial-fan:front'],
  }
  const hashes = new Set<string>()
  for (const product of GEFORCE_PRODUCTS) {
    const info = nvidiaModelInfo(product.id)
    hashes.add(info.sha256)
    const document = await io.read(`public${nvidiaModelUrl(product.id)}`)
    const nodes = document.getRoot().listNodes(), fans = nodes.filter(node => node.getExtras().kind)
    assert.deepEqual(fans.map(node => `${node.getExtras().kind}:${node.getExtras().face}`).sort(), [...expected[product.id]].sort())
    for (const fan of fans) {
      const z = fan.getWorldTranslation()[2]
      assert.ok(fan.getExtras().face === 'rear' ? z < 0 : z > 0, 'cooling assemblies must be on their declared side of the card')
      if (product.id === 'nvidia-rtx-2080-ti') assert.equal(fan.getExtras().blades, 13)
    }
    for (const name of ['pcb-and-pcie-contacts', 'io-bracket-and-display-ports', 'power-connectors']) assert.ok(nodes.some(node => node.getName() === name), name)
    assert.ok(info.dimensions[0] > .26 && info.dimensions[0] < .33, 'download preserves desktop card scale in metres')
  }
  assert.equal(hashes.size, 5, 'each generation must ship a distinct model')
  assert.ok(nvidiaModelInfo('nvidia-rtx-5090').dimensions[2] < nvidiaModelInfo('nvidia-rtx-4090').dimensions[2] * .8, '5090 FE uses a thinner dual-slot cooler')
})

for (const product of NVIDIA_PRODUCTS) test(`${product.name}: shipping GLB decodes, matches manifest, is grounded and has no remote assets`, async () => {
  const info = nvidiaModelInfo(product.id)
  const bytes = await readFile(new URL(`../../public${nvidiaModelUrl(product.id)}`, import.meta.url))
  assert.equal(bytes.subarray(0, 4).toString(), 'glTF')
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  assert.equal(bytes.length, info.bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), info.sha256)
  assert.ok(bytes.length < 2 * 1048576, 'each model must fit the 2 MiB web budget')
  assert.equal(info.units, 'metres')
  assert.equal(info.engineeringAccuracy, false)
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  assert.ok(json.buffers.every((buffer: { uri?: string }) => !buffer.uri))
  assert.ok(json.images.every((image: { uri?: string; bufferView?: number }) => !image.uri && image.bufferView !== undefined))
  const document = await io.readBinary(bytes), bounds = getBounds(document.getRoot().listScenes()[0])
  assert.ok(Math.abs(bounds.min[1]) < .001, 'floor pivot must remain grounded')
  for (const axis of [0, 2]) assert.ok(Math.abs(bounds.min[axis] + bounds.max[axis]) < .001, 'centered X/Z pivot')
  const dimensions = bounds.max.map((v, i) => v - bounds.min[i])
  dimensions.forEach((value, i) => {
    assert.ok(Number.isFinite(value) && value > 0)
    assert.ok(Math.abs(value - info.dimensions[i]) < .001)
    // These two products have published exterior sizes; small fittings are approximate.
    if (product.id === 'nvidia-dgx-spark' || product.id === 'nvidia-dgx-b300') assert.ok(Math.abs(value / (product.dimensions[i] / 1000) - 1) < .035)
  })
  let triangles = 0, draws = 0
  for (const node of document.getRoot().listNodes()) for (const primitive of node.getMesh()?.listPrimitives() || []) {
    assert.ok(primitive.getMaterial(), 'every primitive needs a material')
    const position = primitive.getAttribute('POSITION')!
    assert.ok(position.getMin([]).every(Number.isFinite) && position.getMax([]).every(Number.isFinite))
    triangles += (primitive.getIndices()?.getCount() || position.getCount()) / 3; draws++
  }
  assert.equal(triangles, info.triangles)
  assert.equal(draws, info.meshes)
  assert.ok(draws <= 40, 'detail must be batched for shared scenes')
  assert.ok(triangles > 5000 && triangles < 300000)
})
