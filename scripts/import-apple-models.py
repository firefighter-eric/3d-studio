"""Download Apple's public AR assets, then convert with Blender 5.x.

python3 scripts/import-apple-models.py --download
blender --background --factory-startup --python scripts/import-apple-models.py
The source cache and intermediate files stay outside the repository.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/private/tmp/3d-studio-apple-source')
RAW = Path('/private/tmp/3d-studio-apple-raw')
PRODUCTS = json.loads((ROOT / 'src/apple/products.json').read_text())


def download():
    import concurrent.futures
    import urllib.request
    import zipfile
    CACHE.mkdir(parents=True, exist_ok=True)
    old_manifest = ROOT / 'src/apple/manifest.json'
    previous = json.loads(old_manifest.read_text()) if old_manifest.exists() else {}

    def fetch(product):
        path = CACHE / f"{product['id']}.usdz"
        if not path.exists():
            with urllib.request.urlopen(product['sourceModel'], timeout=120) as response:
                data = response.read()
            path.write_bytes(data)
        if not zipfile.is_zipfile(path):
            raise ValueError(f'Invalid USDZ: {path}')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        expected = previous.get(product['id'], {}).get('sourceSha256')
        if expected and digest != expected:
            raise ValueError(f"Source changed for {product['id']}; inspect the new asset before accepting it")
        print(f"{product['id']}: {path.stat().st_size / 1048576:.2f} MiB", flush=True)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(fetch, PRODUCTS))


def convert():
    import bpy
    from mathutils import Vector, Matrix
    RAW.mkdir(parents=True, exist_ok=True)
    for product in PRODUCTS:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        source = CACHE / f"{product['id']}.usdz"
        bpy.ops.wm.usd_import(filepath=str(source), import_cameras=False, import_lights=False,
                              import_textures_mode='IMPORT_PACK', import_visible_only=True,
                              apply_unit_conversion_scale=True)
        # UsdPreviewSurface opacity describes coverage. Blender's USD importer
        # maps it to transmission, which turns black thin glass opaque in glTF
        # (notably the iMac screen). Restore the original opacity, including maps.
        for material in bpy.data.materials:
            if not material.node_tree:
                continue
            tree = material.node_tree
            pbr = next((node for node in tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
            if not pbr:
                continue
            transmission, alpha = pbr.inputs['Transmission Weight'], pbr.inputs['Alpha']
            if transmission.is_linked:
                link = transmission.links[0]
                inverse = link.from_node
                if inverse.type != 'MATH' or inverse.operation != 'SUBTRACT' or inverse.inputs[0].default_value != 1:
                    raise ValueError(f'Unexpected USD opacity mapping: {material.name}')
                opacity = inverse.inputs[1]
                if opacity.is_linked:
                    tree.links.new(opacity.links[0].from_socket, alpha)
                else:
                    alpha.default_value = opacity.default_value
                tree.links.remove(link)
                transmission.default_value = 0
            elif transmission.default_value > 0:
                alpha.default_value = 1 - transmission.default_value
                transmission.default_value = 0
        # Keep Apple's visible AR arrangement, applying world transforms once.
        # Blender uses Z-up; the GLB exporter converts this to glTF's Y-up.
        objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
        transforms = {obj.name: obj.matrix_world.copy() for obj in objects}
        for obj in objects:
            world = transforms[obj.name]
            obj.data = obj.data.copy()
            obj.parent = None
            obj.matrix_world = Matrix.Identity(4)
            obj.data.transform(world)
        for obj in list(bpy.context.scene.objects):
            if obj.type != 'MESH':
                bpy.data.objects.remove(obj, do_unlink=True)
        bpy.context.view_layer.update()
        points = [Vector(v) for obj in objects for v in obj.bound_box]
        low = Vector(tuple(min(v[i] for v in points) for i in range(3)))
        high = Vector(tuple(max(v[i] for v in points) for i in range(3)))
        offset = Vector((-(low.x + high.x) / 2, -(low.y + high.y) / 2, -low.z))
        for obj in objects:
            obj.data.transform(Matrix.Translation(offset))
        # Retain original maps, capped at 2K. Re-encode image containers to PNG:
        # some source JPEG marker tables are accepted by USD but rejected by
        # glTF tooling. No tone mapping or creative edits are applied.
        textures = RAW / product['id']
        textures.mkdir(exist_ok=True)
        for image in bpy.data.images:
            if image.size[0] and max(image.size) > 2048:
                ratio = 2048 / max(image.size)
                image.scale(max(1, round(image.size[0] * ratio)), max(1, round(image.size[1] * ratio)))
            if image.size[0]:
                image.file_format = 'PNG'
                image.filepath_raw = str(textures / f'{image.name}.png')
                image.save()
                image.pack()
        bpy.context.view_layer.update()
        bpy.ops.export_scene.gltf(filepath=str(RAW / f"{product['id']}.glb"), export_format='GLB',
                                  export_yup=True, export_animations=False, export_copyright='Apple Inc.',
                                  export_extras=False, export_lights=False, export_cameras=False)
        dimensions = high - low
        metadata = {'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                    'sourceBytes': source.stat().st_size, 'dimensions': [dimensions.x, dimensions.z, dimensions.y],
                    'units': 'metres', 'sourceChecked': '2026-09-06'}
        (RAW / f"{product['id']}.json").write_text(json.dumps(metadata, indent=2) + '\n')
        print('APPLE_CONVERTED', product['id'], metadata['dimensions'], flush=True)


if __name__ == '__main__':
    download() if '--download' in sys.argv else convert()
