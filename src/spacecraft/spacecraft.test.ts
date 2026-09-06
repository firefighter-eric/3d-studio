import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { SPACECRAFT } from './specs'
import manifest from './manifest.json'
import { assetById, createInstances } from '../data/catalog'
import { instanceEngines } from './instances'

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
  } else if (spec.id === 'falcon-heavy') {
    const cores = ['center-core', 'side-booster-left', 'side-booster-right'].map(name => scene.getObjectByName(name)!)
    assert.ok(cores.every(Boolean), 'Three independently articulated cores must be exported')
    for (const core of cores) {
      const arrays: number[] = [], articulations: Record<string, number> = {}
      core.traverse(object => {
        if (object.userData.engineCount) arrays.push(object.userData.engineCount)
        const kind = object.userData.articulation
        if (kind) articulations[kind] = (articulations[kind] ?? 0) + 1
      })
      assert.deepEqual(arrays, [9])
      assert.equal(articulations['landing-leg'], 4)
      assert.equal(articulations['grid-fin'], 4)
      assert.equal(articulations['leg-brace'], 4)
    }
    assert.ok(cores[0].getObjectByName('merlin-vacuum'))
    assert.ok(!cores[1].getObjectByName('merlin-vacuum'), 'Side boosters carry nosecones, not an upper stage')
    assert.equal(cores[1].userData.heightMetres, 47.8)
    assert.equal(cores[1].position.x, -cores[2].position.x)
  } else {
    for (const name of ['booster', 'hotstage', 'ship', 'heat-shield']) assert.ok(scene.getObjectByName(name), name)
    assert.equal(scene.getObjectByName('raptor-booster')!.children.length, 33)
    assert.equal(scene.getObjectByName('raptor-ship')!.children.length, 3)
    assert.equal(scene.getObjectByName('rvac-ship')!.children.length, 3)
    assert.ok(scene.getObjectByName('heat-shield')!.userData.tileCount > 9000)
    for (const name of ['forward-flap-left', 'forward-flap-right', 'aft-flap-left', 'aft-flap-right']) assert.ok(scene.getObjectByName(name))
    for (const name of ['catch-pin-port','catch-pin-starboard','booster-grid-fin-1','booster-grid-fin-2','booster-grid-fin-3','booster-grid-fin-4']) assert.ok(scene.getObjectByName(name),name)
  }
  const originalMeshes: Mesh[]=[]
  scene.traverseVisible(object=>{if(object instanceof Mesh)originalMeshes.push(object)})
  const engines=instanceEngines(scene), visible: Mesh[]=[]
  scene.traverseVisible(object=>{if(object instanceof Mesh)visible.push(object)})
  assert.ok(visible.length < originalMeshes.length*.65, 'instancing should reduce the draw calls of repeated engines')
  const renderedTriangles=visible.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh instanceof InstancedMesh ? mesh.count : 1),0)
  assert.equal(renderedTriangles,triangles,'batching must preserve every visible surface')
  const engine=scene.getObjectByName(spec.id==='starship' ? 'raptor-booster-31' : 'merlin-1d-01')!
  const pivot=engine.children.find(child=>child.name.startsWith('engine-gimbal'))!
  assert.ok(pivot,'engine gimbal remains articulated after export')
  const batch=visible.find(mesh=>mesh instanceof InstancedMesh && mesh.name.startsWith(spec.id==='starship' ? 'raptor-booster-batch' : 'merlin-1d-batch')) as InstancedMesh
  const before=new Matrix4(), after=new Matrix4(), index=spec.id==='starship'?30:0
  batch.getMatrixAt(index,before);pivot.rotation.z=.06;engines.update();batch.getMatrixAt(index,after)
  assert.notDeepEqual(before.elements,after.elements,'batched bell should follow the animated pivot')
  assert.ok(after.elements.every(Number.isFinite))
  engines.dispose()
})

test('spacecraft catalog entries can be composed at the same scene scale without sinking into the ground', () => {
  const instances = createInstances(['falcon-9', 'starship', 'falcon-heavy'], [])
  assert.equal(instances.length, 3)
  assert.equal(instances[0].scale, instances[1].scale)
  assert.ok(instances.every(item => item.position[1] === 0 && assetById[item.assetId]))
  assert.notDeepEqual(instances[0].position, instances[1].position)
})
