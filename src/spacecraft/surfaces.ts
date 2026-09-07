import * as THREE from 'three'

/** Fine surface response for close inspection; the portable GLB retains PBR defaults. */
export function refineSpacecraftSurfaces(root: THREE.Object3D) {
  const materials = new Map<THREE.Material, THREE.Material>()
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = (Array.isArray(object.material) ? object.material : [object.material]).map(source => {
      if (materials.has(source)) return materials.get(source)!
      const result = source.clone()
      const steel = /steel|weld|titanium|bell-alloy|engine-alloy/.test(source.name)
      const ceramic = /tile|ceramic|carbon/.test(source.name)
      if (result instanceof THREE.MeshStandardMaterial && (steel || ceramic)) {
        result.onBeforeCompile = shader => {
          shader.vertexShader = 'varying vec3 vMetalPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMetalPosition=position;')
          shader.fragmentShader = 'varying vec3 vMetalPosition;\n'+shader.fragmentShader
          shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            float grainWave=sin(vMetalPosition.y*360. + sin(vMetalPosition.x*23.)*.35);
            float grain=grainWave*(1.-smoothstep(.2,1.5,fwidth(vMetalPosition.y*360.)));
            float variation=sin(vMetalPosition.x*2.1+vMetalPosition.z*.83)*sin(vMetalPosition.y*3.7);
            roughnessFactor=clamp(roughnessFactor+grain*${steel ? '.055' : '.018'}+variation*.028,.16,.99);
            diffuseColor.rgb*=1.+variation*${steel ? '.028' : '.055'}+grain*.015;
          `)
        }
        result.customProgramCacheKey = () => `spacecraft-surface-v2-${steel ? 'steel' : 'ceramic'}`
      }
      materials.set(source, result)
      return result
    })
    if (object.material.length === 1) object.material = object.material[0]
  })
  return () => materials.forEach(material => material.dispose())
}
