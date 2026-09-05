import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, Mesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { SPACECRAFT } from './specs'
import manifest from './manifest.json'
import { assetById, createInstances } from '../data/catalog'

for (const spec of SPACECRAFT) test(`${spec.id}: exported GLB is self-contained, correctly scaled and preserves inspectable assemblies`, async () => {
  const bytes = await readFile(new URL(`../../public/models/${spec.id}.glb`, import.meta.url))
  assert.equal(bytes.readUInt32LE(0), 0x46546c67)
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  assert.equal(bytes.length, manifest[spec.id].bytes)
  assert.ok(bytes.length < 12 * 1024 * 1024, 'Avoid accidental unbounded asset growth')
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
  assert.ok(json.buffers.every((buffer: { uri?: string }) => !buffer.uri))
  assert.ok(!json.images?.length, 'No missing runtime texture or font dependencies')
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const { scene } = await new GLTFLoader().parseAsync(buffer, '')
  const bounds = new Box3().setFromObject(scene)
  assert.ok(Math.abs(bounds.getSize(new Vector3()).y - spec.height) < 0.1)
  assert.ok(bounds.min.y >= -0.05, 'Engine exit plane should rest on the scene ground')
  let triangles = 0
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return
    const geometry = object.geometry
    for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value))
    triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3
    assert.ok(geometry.attributes.normal, 'Exported surfaces need normals for PBR lighting')
  })
  assert.equal(triangles, manifest[spec.id].triangles)
  if (spec.id === 'falcon-9') {
    for (const name of ['first-stage', 'second-stage', 'fairing-left', 'fairing-right', 'merlin-vacuum']) assert.ok(scene.getObjectByName(name), name)
    assert.equal(scene.getObjectByName('merlin-1d')!.children.length, 9)
    for (let i = 1; i <= 4; i++) {
      assert.ok(scene.getObjectByName(`grid-fin-${i}`))
      assert.ok(scene.getObjectByName(`landing-leg-${i}`))
    }
  } else {
    for (const name of ['booster', 'hotstage', 'ship', 'heat-shield']) assert.ok(scene.getObjectByName(name), name)
    assert.equal(scene.getObjectByName('raptor-booster')!.children.length, 33)
    assert.equal(scene.getObjectByName('raptor-ship')!.children.length, 3)
    assert.equal(scene.getObjectByName('rvac-ship')!.children.length, 3)
    assert.ok(scene.getObjectByName('heat-shield')!.userData.tileCount > 9000)
    for (const name of ['forward-flap-left', 'forward-flap-right', 'aft-flap-left', 'aft-flap-right']) assert.ok(scene.getObjectByName(name))
  }
})

test('spacecraft catalog entries can be composed at the same scene scale without sinking into the ground', () => {
  const instances = createInstances(['falcon-9', 'starship'], [])
  assert.equal(instances.length, 2)
  assert.equal(instances[0].scale, instances[1].scale)
  assert.ok(instances.every(item => item.position[1] === 0 && assetById[item.assetId]))
  assert.notDeepEqual(instances[0].position, instances[1].position)
})
