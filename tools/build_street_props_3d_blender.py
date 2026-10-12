import bpy
import bmesh
import math
import os
import numpy as np

STREET_PROPS = [
    {
        'id': 'street_lamp',
        'clean_png': 'blender_assets/cat3_concepts/street_lamp_clean.png',
        'out_glb': 'assets/models/street_lamp.glb',
        'target_span': 2.2,
    },
    {
        'id': 'courtyard_bench',
        'clean_png': 'blender_assets/cat3_concepts/courtyard_bench_clean.png',
        'out_glb': 'assets/models/courtyard_bench.glb',
        'target_span': 1.8,
    },
    {
        'id': 'small_trash_bin',
        'clean_png': 'blender_assets/cat3_concepts/small_trash_bin_clean.png',
        'out_glb': 'assets/models/small_trash_bin.glb',
        'target_span': 1.4,
    },
    {
        'id': 'autumn_tree_1',
        'clean_png': 'blender_assets/cat3_concepts/autumn_tree_1_clean.png',
        'out_glb': 'assets/models/autumn_tree_1.glb',
        'target_span': 2.3,
    },
    {
        'id': 'autumn_tree_2',
        'clean_png': 'blender_assets/cat3_concepts/autumn_tree_2_clean.png',
        'out_glb': 'assets/models/autumn_tree_2.glb',
        'target_span': 2.3,
    },
    {
        'id': 'courtyard_bush',
        'clean_png': 'blender_assets/cat3_concepts/courtyard_bush_clean.png',
        'out_glb': 'assets/models/courtyard_bush.glb',
        'target_span': 1.6,
    },
]

def build_prop_glb(cfg):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    clean_path = os.path.abspath(cfg['clean_png'])
    if not os.path.exists(clean_path):
        return

    src_img = bpy.data.images.load(clean_path)
    orig_w, orig_h = src_img.size[0], src_img.size[1]
    aspect = orig_w / float(max(1, orig_h))

    tex_img = src_img.copy()
    tex_img.name = cfg['id'] + "_tex"
    tex_img.scale(256, 256)
    tex_img.pack()

    mesh = bpy.data.meshes.new(cfg['id'] + "_mesh")
    obj = bpy.data.objects.new(cfg['id'], mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")

    pitch = math.radians(28.0)
    cos_p = math.cos(pitch)
    sin_p = math.sin(pitch)

    if aspect >= 1.0:
        sx = cfg['target_span']
        sv = sx / aspect
    else:
        sv = cfg['target_span']
        sx = sv * aspect

    # Create a crossed/curved 3D relief card tilted to face the 28-deg ortho camera with 3D normal curvature
    nx, ny = 12, 12
    grid_verts = {}
    for iy in range(ny + 1):
        for ix in range(nx + 1):
            u = ix / float(nx)
            v = iy / float(ny)
            px = (u - 0.5) * sx
            pv = v * sv
            # Cylindrical 3D depth bulge so directional lights shade it volumetrically
            bulge = math.cos((u - 0.5) * math.pi) * 0.18
            wy = pv * sin_p - bulge * cos_p
            wz = pv * cos_p + bulge * sin_p
            vert = bm.verts.new((px, wy, wz))
            grid_verts[(ix, iy)] = (vert, u, v)

    for iy in range(ny):
        for ix in range(nx):
            v00, u0, v0 = grid_verts[(ix, iy)]
            v10, u1, _  = grid_verts[(ix + 1, iy)]
            v11, _,  v1 = grid_verts[(ix + 1, iy + 1)]
            v01, _,  _  = grid_verts[(ix, iy + 1)]
            f = bm.faces.new([v00, v10, v11, v01])
            for loop, uv in zip(f.loops, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]):
                loop[uv_layer].uv = uv

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    for poly in mesh.polygons:
        poly.use_smooth = True

    mat = bpy.data.materials.new(name=cfg['id'] + "_mat")
    mat.use_nodes = True
    mat.blend_method = 'CLIP'
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    bsdf.inputs['Roughness'].default_value = 0.88
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = tex_img
    links.new(bsdf.inputs['Base Color'], tex.outputs['Color'])
    links.new(bsdf.inputs['Alpha'], tex.outputs['Alpha'])
    obj.data.materials.append(mat)

    out_path = os.path.abspath(cfg['out_glb'])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_image_format='WEBP',
        export_image_quality=88
    )
    print(f"[Exported] {out_path} ({os.path.getsize(out_path)//1024} KB)")

if __name__ == '__main__':
    for p in STREET_PROPS:
        build_prop_glb(p)
