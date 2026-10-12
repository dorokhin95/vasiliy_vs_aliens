import bpy
import os

TARGETS = [
    ("assets/models/weapon_shotgun.glb", 3200),
    ("assets/models/weapon_drill.glb",   3200),
    ("assets/models/weapon_plasma.glb",  3200),
    ("assets/models/loot_scrap.glb",     2200),
    ("assets/models/loot_bottle.glb",    2200),
    ("assets/models/loot_stew.glb",      2200),
    ("assets/models/loot_vodka.glb",     2200),
    ("assets/models/loot_bandage.glb",   2200),
    ("assets/models/trash_dumpster.glb", 3500),
    ("assets/models/military_crate.glb", 3500),
    ("assets/models/fence_po2.glb",      3200),
    ("assets/models/heating_pipes.glb",  3200),
    ("assets/models/garage_block.glb",   4000),
    ("assets/models/mikhalyh_shop.glb",  4500),
    ("assets/models/car_zhiguli.glb",    4500),
    ("assets/models/car_uaz.glb",        4500),
]

for rel_path, target_verts in TARGETS:
    abs_path = os.path.abspath(rel_path)
    if not os.path.exists(abs_path):
        continue

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=abs_path)

    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    total_before = sum(len(m.data.vertices) for m in meshes)

    if total_before <= target_verts * 1.25:
        print(f"[SKIP] {rel_path}: already {total_before} verts")
        continue

    for m in meshes:
        v_count = len(m.data.vertices)
        if v_count > target_verts:
            ratio = max(0.08, min(1.0, target_verts / float(v_count)))
            bpy.context.view_layer.objects.active = m
            mod = m.modifiers.new(name="FastDecimate", type='DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=mod.name)

    total_after = sum(len(m.data.vertices) for m in meshes)
    bpy.ops.export_scene.gltf(
        filepath=abs_path,
        export_format='GLB',
        export_apply=True
    )
    print(f"[OPTIMIZED] {rel_path}: {total_before} -> {total_after} verts ({os.path.getsize(abs_path)//1024} KB)")
