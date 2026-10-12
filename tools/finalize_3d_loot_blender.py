import bpy
import math
import os

LOOT_MODELS = [
    {
        'id': 'loot_scrap',
        'in_glb': 'blender_assets/loot_concepts/loot_scrap_generated.glb',
        'out_glb': 'assets/models/loot_scrap.glb',
        'target_span': 0.85,
    },
    {
        'id': 'loot_bottle',
        'in_glb': 'blender_assets/loot_concepts/loot_bottle_generated.glb',
        'out_glb': 'assets/models/loot_bottle.glb',
        'target_span': 0.85,
    },
    {
        'id': 'loot_stew',
        'in_glb': 'blender_assets/loot_concepts/loot_stew_generated.glb',
        'out_glb': 'assets/models/loot_stew.glb',
        'target_span': 0.75,
    },
    {
        'id': 'loot_vodka',
        'in_glb': 'blender_assets/loot_concepts/loot_vodka_generated.glb',
        'out_glb': 'assets/models/loot_vodka.glb',
        'target_span': 0.85,
    },
    {
        'id': 'loot_bandage',
        'in_glb': 'blender_assets/loot_concepts/loot_bandage_generated.glb',
        'out_glb': 'assets/models/loot_bandage.glb',
        'target_span': 0.72,
    },
]

def process_loot_model(cfg):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    in_path = os.path.abspath(cfg['in_glb'])
    if not os.path.exists(in_path):
        print(f"[Skip] {in_path} does not exist yet")
        return

    bpy.ops.import_scene.gltf(filepath=in_path)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        print(f"[Error] No mesh in {in_path}")
        return

    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = cfg['id']
    obj.rotation_mode = 'XYZ'

    if obj.parent:
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for o in list(bpy.context.scene.objects):
        if o != obj:
            bpy.data.objects.remove(o, do_unlink=True)

    obj.rotation_mode = 'XYZ'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Optimize texture resolution to 512x512 for fast WebGL loading
    for img in bpy.data.images:
        if img.size[0] > 512 or img.size[1] > 512:
            img.scale(512, 512)

    verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    xs = [v.x for v in verts]
    ys = [v.y for v in verts]
    zs = [v.z for v in verts]

    dx = max(xs) - min(xs)
    dy = max(ys) - min(ys)
    dz = max(zs) - min(zs)
    print(f"[{cfg['id']}] Raw bounds: dx={dx:.3f}, dy={dy:.3f}, dz={dz:.3f}, verts={len(verts)}")

    max_dim = max(dx, dy, dz, 1e-4)
    s = cfg['target_span'] / max_dim
    obj.scale = (s, s, s)
    bpy.ops.object.transform_apply(scale=True)

    verts = [v.co for v in obj.data.vertices]
    cx = (min(v.x for v in verts) + max(v.x for v in verts)) * 0.5
    cy = (min(v.y for v in verts) + max(v.y for v in verts)) * 0.5
    min_z = min(v.z for v in verts)
    max_z = max(v.z for v in verts)
    height = max_z - min_z

    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= min_z
    obj.data.update()

    out_path = os.path.abspath(cfg['out_glb'])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_image_format='WEBP',
        export_image_quality=85
    )
    print(f"[{cfg['id']}] Exported clean 360 3D GLB -> {out_path} ({os.path.getsize(out_path)} bytes)")

    # Render preview angles
    prev_dir = os.path.abspath("assets/models/preview")
    os.makedirs(prev_dir, exist_ok=True)

    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, height * 0.48))
    target = bpy.context.active_object

    cam_dist = cfg['target_span'] * 2.4
    pitch = math.radians(30)
    bpy.ops.object.camera_add(location=(0, -cam_dist * math.cos(pitch), cam_dist * math.sin(pitch)))
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = cfg['target_span'] * 1.25
    bpy.context.scene.camera = cam

    tt = cam.constraints.new(type='TRACK_TO')
    tt.target = target
    tt.track_axis = 'TRACK_NEGATIVE_Z'
    tt.up_axis = 'UP_Y'

    bpy.ops.object.light_add(type='SUN', location=(4, -5, 7))
    sun = bpy.context.active_object
    sun.data.energy = 4.2
    sun.rotation_euler = (math.radians(45), math.radians(20), math.radians(-30))

    bpy.ops.object.light_add(type='SUN', location=(-4, 4, 5))
    fill = bpy.context.active_object
    fill.data.energy = 2.0

    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.resolution_x = 256
    bpy.context.scene.render.resolution_y = 256

    obj.rotation_mode = 'XYZ'
    for angle_name, deg in [('iso', 35), ('side', 0), ('front', 90), ('back', -90)]:
        obj.rotation_euler = (0, 0, math.radians(deg))
        bpy.context.scene.render.filepath = os.path.join(prev_dir, f"{cfg['id']}_{angle_name}.png")
        bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    for m in LOOT_MODELS:
        process_loot_model(m)
