import * as THREE from 'three'

/** Keep articulated source nodes, draw their repeated engine parts in batches. */
export function instanceEngines(root: THREE.Object3D) {
  const batches: { array: THREE.Object3D; sources: THREE.Mesh[]; mesh: THREE.InstancedMesh }[] = []
  const arrays: THREE.Object3D[] = []
  root.traverse(object => {
    if (object.userData.engineCount && /^(merlin-1d|raptor-booster|raptor-ship|rvac-ship)(?:_\d+)?$/.test(object.name)) arrays.push(object)
  })
  for (const array of arrays) {
    const name = array.name
    const engines = [...array.children]
    const slots = engines.map(engine => {
      const meshes: THREE.Mesh[] = []
      engine.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object) })
      return meshes
    })
    for (let i = 0; i < slots[0].length; i++) {
      const sources = slots.map(parts => parts[i]), first = sources[0]
      const mesh = new THREE.InstancedMesh(first.geometry, first.material, engines.length)
      mesh.name = `${name}-batch-${i}`; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false
      sources.forEach(source => { source.visible = false })
      array.add(mesh); batches.push({ array, sources, mesh })
    }
  }
  const inverse = new THREE.Matrix4(), matrix = new THREE.Matrix4()
  const update = () => {
    for (const batch of batches) {
      batch.array.updateWorldMatrix(true, true)
      inverse.copy(batch.array.matrixWorld).invert()
      batch.sources.forEach((source, i) => batch.mesh.setMatrixAt(i, matrix.multiplyMatrices(inverse, source.matrixWorld)))
      batch.mesh.instanceMatrix.needsUpdate = true
    }
  }
  update()
  return { update, dispose: () => batches.forEach(({mesh})=>mesh.dispose()) }
}
