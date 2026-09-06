import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
// @ts-expect-error The Draco package does not ship TypeScript declarations.
import draco3d from 'draco3dgltf'
import { getBounds } from '@gltf-transform/functions'
import { DJI_PRODUCTS, djiFile, filterDjiProducts, isDjiId } from './specs'
import { assetById, createInstances, readAdditions, saveAdditions } from '../data/catalog'

test('DJI collection keeps the newest selected generation in each product line', () => {
  assert.equal(DJI_PRODUCTS.length, 19)
  assert.equal(new Set(DJI_PRODUCTS.map(product => product.id)).size, 19)
  for (const slug of ['osmo-pocket-3', 'osmo-pocket-4', 'osmo-action-4', 'osmo-action-5-pro', 'mini-4-pro', 'mavic-3-pro', 'neo', 'mic-mini', 'osmo-mobile-8', 'rs-4', 'rs-3-mini']) assert.equal(isDjiId(`dji-${slug}`), false, slug)
  assert.equal(filterDjiProducts('全部', 'official', '').length, 3)
  assert.equal(filterDjiProducts('全部', 'reconstructed', '').length, 16)
  assert.deepEqual(['Osmo 相机', '无人机', '稳定器', '麦克风'].map(category => filterDjiProducts(category, 'all', '').length), [4, 8, 5, 2])
  assert.equal(filterDjiProducts('无人机', 'all', ' MAvic 4 PRO ')[0].id, 'dji-mavic-4-pro')
  assert.equal(filterDjiProducts('麦克风', 'official', '').length, 0)
})

test('every shipped DJI variant decodes, is self-contained, and agrees with its manifest', async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() })
  for (const product of DJI_PRODUCTS) {
    const digests = new Set<string>()
    for (const variant of product.variants) {
      const info = djiFile(product.id, variant.key)
      const bytes = await readFile(new URL(`../../public${info.file}`, import.meta.url))
      assert.equal(bytes.toString('ascii', 0, 4), 'glTF', product.name)
      assert.equal(bytes.length, info.bytes)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), info.sha256)
      digests.add(info.sha256)
      const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
      assert.ok(json.buffers.every((buffer: { uri?: string }) => !buffer.uri), `${product.name}: external buffer`)
      assert.ok(json.images.every((image: { uri?: string }) => !image.uri), `${product.name}: external image`)
      const document = await io.readBinary(bytes), scene = document.getRoot().listScenes()[0]
      const bounds = getBounds(scene)
      assert.ok(Math.abs(bounds.min[1]) < .0001, `${product.name}: model must rest at ground level`)
      for (let i = 0; i < 3; i++) {
        const size = bounds.max[i] - bounds.min[i]
        assert.ok(Number.isFinite(size) && size > .01 && size < 2, `${product.name}: invalid display scale`)
        assert.ok(Math.abs(size - info.dimensions[i]) < .0001, `${product.name}: incorrect bounds`)
      }
      let triangles = 0
      for (const node of document.getRoot().listNodes()) for (const primitive of node.getMesh()?.listPrimitives() ?? []) triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')!.getCount()) / 3
      assert.equal(triangles, info.triangles)
      assert.ok(triangles > 15000 && document.getRoot().listMaterials().length >= 2)
      assert.ok(document.getRoot().listTextures().length >= 1)
      assert.equal(document.getRoot().listNodes().find(node => node.getName() === product.id)!.getExtras().engineeringAccuracy, false)
      if (product.quality === 'official') {
        assert.equal(info.sourceSha256, variant.sourceSha256)
        assert.equal(new URL(variant.source!).hostname, 'www-cdn.djiits.com')
      } else assert.equal(variant.source, undefined)
    }
    assert.equal(digests.size, product.variants.length, `${product.name}: duplicate variant files`)
  }
})

test('DJI models join the shared scene and survive local layout persistence', () => {
  const previous = globalThis.localStorage
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) } })
  try {
    const selected = ['dji-osmo-pocket-4p', 'dji-mavic-4-pro', 'dji-mic-3'] as const
    const instances = createInstances([...selected], [])
    assert.equal(instances.length, 3)
    instances.forEach(instance => { assert.ok(instance.scale > 0 && instance.scale <= 3); assert.ok(assetById[instance.assetId]) })
    saveAdditions(instances)
    assert.deepEqual(readAdditions(), instances)
  } finally { Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous }) }
})
