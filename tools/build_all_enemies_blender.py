import bpy
import math
import os

ENEMY_CONFIGS = [
    {
        'id': 'toad_grunt',
        'name': 'Toad_Grunt',
        'obj': 'blender_assets/toad_grunt_volumetric.obj',
        'tex': 'assets/enemies/toad_grunt_perfect.png',
        'tex_back': 'assets/enemies/toad_grunt_back.png',
        'glb': 'assets/models/toad_grunt.glb',
        'width': 1.25,
        'height': 1.80,
        'back_color': (0.16, 0.24, 0.12, 1.0),
        'cam_scale': 2.3,
    },
    # Снайпер больше не собирается здесь: новая модель с винтовкой, прицелом и дулом — tools/build_promzona_toads_blender.py
    # (TOADS['toad_sniper']). Запуск этого скрипта иначе затёр бы её старой объёмной картинкой
    {
        'id': 'toad_brute',
        'name': 'Toad_Brute',
        'obj': 'blender_assets/toad_brute_volumetric.obj',
        'tex': 'assets/enemies/toad_brute_perfect.png',
        'tex_back': 'assets/enemies/toad_brute_back.png',
        'glb': 'assets/models/toad_brute.glb',
        'width': 2.05,
        'height': 2.35,
        'back_color': (0.11, 0.18, 0.09, 1.0),
        'cam_scale': 3.1,
    }
]

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def process_enemy(cfg):
    print(f"\n================ BUILDING {cfg['id'].upper()} ================")
    clear_scene()

    # 1. Import OBJ
    obj_path = os.path.abspath(cfg['obj'])
    bpy.ops.wm.obj_import(filepath=obj_path)
    mesh_obj = bpy.context.selected_objects[0]
    mesh_obj.name = f"{cfg['name']}_Body"

    # Reset rotation so model stands upright on ground (Z up, Y forward/depth, X width)
    mesh_obj.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.objects.active = mesh_obj
    bpy.ops.object.transform_apply(rotation=True)

    # Smooth shading
    for poly in mesh_obj.data.polygons:
        poly.use_smooth = True

    # 2. Materials
    # Slot 0: Mat_Front with concept art texture
    mat_f = mesh_obj.material_slots['Mat_Front'].material
    mat_f.name = f"Mat_{cfg['name']}_Front"
    mat_f.use_nodes = True
    nodes_f = mat_f.node_tree.nodes
    links_f = mat_f.node_tree.links
    bsdf_f = nodes_f.get("Principled BSDF")

    tex_img = nodes_f.new(type='ShaderNodeTexImage')
    tex_img.image = bpy.data.images.load(os.path.abspath(cfg['tex']))
    links_f.new(tex_img.outputs['Color'], bsdf_f.inputs['Base Color'])
    links_f.new(tex_img.outputs['Alpha'], bsdf_f.inputs['Alpha'])
    bsdf_f.inputs['Roughness'].default_value = 0.55
    bsdf_f.inputs['Metallic'].default_value = 0.15

    # Slot 1: Mat_Back with matching dark textured toad hide
    mat_b = mesh_obj.material_slots['Mat_Back'].material
    mat_b.name = f"Mat_{cfg['name']}_Back"
    mat_b.use_nodes = True
    nodes_b = mat_b.node_tree.nodes
    links_b = mat_b.node_tree.links
    bsdf_b = nodes_b.get("Principled BSDF")

    tex_b = nodes_b.new(type='ShaderNodeTexImage')
    tex_b.image = bpy.data.images.load(os.path.abspath(cfg['tex_back']))
    links_b.new(tex_b.outputs['Color'], bsdf_b.inputs['Base Color'])
    links_b.new(tex_b.outputs['Alpha'], bsdf_b.inputs['Alpha'])
    bsdf_b.inputs['Roughness'].default_value = 0.65

    # 3. Armature Rigging
    h = cfg['height']
    w = cfg['width']

    bpy.ops.object.armature_add(location=(0, 0, 0))
    rig_obj = bpy.context.active_object
    rig_obj.name = f"{cfg['name']}_Rig"
    armature = rig_obj.data
    armature.name = f"{cfg['name']}_Skeleton"

    bpy.ops.object.mode_set(mode='EDIT')
    ebones = armature.edit_bones

    root = ebones['Bone']
    root.name = "Root"
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.2)

    pelvis = ebones.new("Pelvis")
    pelvis.parent = root
    pelvis.head = (0, 0, h * 0.42)
    pelvis.tail = (0, 0, h * 0.65)

    spine = ebones.new("Spine")
    spine.parent = pelvis
    spine.head = (0, 0, h * 0.65)
    spine.tail = (0, 0, h * 0.82)

    head = ebones.new("Head")
    head.parent = spine
    head.head = (0, 0, h * 0.82)
    head.tail = (0, -0.15, h * 0.98)

    # Arms
    for side, sign_x in [("L", 1), ("R", -1)]:
        arm = ebones.new(f"Arm.{side}")
        arm.parent = spine
        arm.head = (sign_x * w * 0.35, 0, h * 0.80)
        arm.tail = (sign_x * w * 0.28, -0.18, h * 0.55)

        forearm = ebones.new(f"Forearm.{side}")
        forearm.parent = arm
        forearm.head = (sign_x * w * 0.28, -0.18, h * 0.55)
        forearm.tail = (sign_x * w * 0.20, -0.32, h * 0.42)

    # Legs
    for side, sign_x in [("L", 1), ("R", -1)]:
        thigh = ebones.new(f"Thigh.{side}")
        thigh.parent = pelvis
        thigh.head = (sign_x * w * 0.24, 0, h * 0.42)
        thigh.tail = (sign_x * w * 0.25, -0.05, h * 0.20)

        shin = ebones.new(f"Shin.{side}")
        shin.parent = thigh
        shin.head = (sign_x * w * 0.25, -0.05, h * 0.20)
        shin.tail = (sign_x * w * 0.25, -0.10, 0.04)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Skinning: Automatic Weights
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    rig_obj.select_set(True)
    bpy.context.view_layer.objects.active = rig_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # 4. Keyframed Walk Animation (16 frames loop)
    bpy.context.view_layer.objects.active = rig_obj
    bpy.ops.object.mode_set(mode='POSE')
    if not rig_obj.animation_data:
        rig_obj.animation_data_create()

    action_walk = bpy.data.actions.new(name=f"{cfg['name']}_Walk")
    rig_obj.animation_data.action = action_walk

    pb = rig_obj.pose.bones
    thigh_l = pb.get("Thigh.L")
    thigh_r = pb.get("Thigh.R")
    shin_l = pb.get("Shin.L")
    shin_r = pb.get("Shin.R")
    pelvis_b = pb.get("Pelvis")
    spine_b = pb.get("Spine")
    head_b = pb.get("Head")

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 16

    keyframes = [
        (1,  20, -18, -10,   8,  0.0, -2.0),
        (5,   0,   0,   8,   5, 0.035,  0.0),
        (9, -18,  20,   8, -10,  0.0,  2.0),
        (13,  0,   0,   5,   8, 0.035,  0.0),
        (17, 20, -18, -10,   8,  0.0, -2.0),
    ]

    for f, tl, tr, sl, sr, pz, sy in keyframes:
        bpy.context.scene.frame_set(f)
        for b in [thigh_l, thigh_r, shin_l, shin_r, pelvis_b, spine_b, head_b]:
            if b: b.rotation_mode = 'XYZ'

        if thigh_l: thigh_l.rotation_euler = (math.radians(tl), 0, 0)
        if thigh_r: thigh_r.rotation_euler = (math.radians(tr), 0, 0)
        if shin_l:  shin_l.rotation_euler = (math.radians(sl), 0, 0)
        if shin_r:  shin_r.rotation_euler = (math.radians(sr), 0, 0)
        if pelvis_b: pelvis_b.location = (0, 0, pz)
        if spine_b:  spine_b.rotation_euler = (0, math.radians(sy), 0)
        if head_b:   head_b.rotation_euler = (math.radians(math.sin(f * 0.4) * 3), 0, 0)

        for b in [thigh_l, thigh_r, shin_l, shin_r, spine_b, head_b]:
            if b: b.keyframe_insert(data_path="rotation_euler", frame=f)
        if pelvis_b:
            pelvis_b.keyframe_insert(data_path="location", frame=f)

    bpy.ops.object.mode_set(mode='OBJECT')

    # 5. Export GLB
    glb_out = os.path.abspath(cfg['glb'])
    os.makedirs(os.path.dirname(glb_out), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=glb_out,
        export_format='GLB',
        use_selection=False,
        export_apply=False,
        export_animations=True,
        export_current_frame=False
    )
    print(f"[{cfg['id']}] Exported GLB to: {glb_out}")

    # 6. Render Previews
    out_dir = os.path.abspath("assets/models/preview")
    os.makedirs(out_dir, exist_ok=True)

    target_z = h * 0.50
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, target_z))
    target = bpy.context.active_object

    cam_dist = 4.2
    pitch_rad = math.radians(52)
    bpy.ops.object.camera_add(location=(0, -cam_dist * math.cos(pitch_rad), target_z + cam_dist * math.sin(pitch_rad)))
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = cfg['cam_scale']
    bpy.context.scene.camera = cam

    tt = cam.constraints.new(type='TRACK_TO')
    tt.target = target
    tt.track_axis = 'TRACK_NEGATIVE_Z'
    tt.up_axis = 'UP_Y'

    # Lighting
    bpy.ops.object.light_add(type='SUN', location=(3, -4, 6))
    sun = bpy.context.active_object
    sun.data.energy = 4.5
    sun.rotation_euler = (math.radians(45), math.radians(25), math.radians(-30))

    bpy.ops.object.light_add(type='SUN', location=(-3, 3, 4))
    fill = bpy.context.active_object
    fill.data.energy = 2.0
    fill.data.color = (0.7, 0.85, 1.0)
    fill.rotation_euler = (math.radians(-45), math.radians(-20), math.radians(140))

    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.resolution_x = 256
    bpy.context.scene.render.resolution_y = 256

    views = {
        'front': 0,
        'iso': 32,
        'side': 85,
        'back': 180
    }

    for vname, vangle in views.items():
        rig_obj.rotation_euler = (0, 0, math.radians(vangle))
        bpy.context.scene.frame_set(1)
        out_f = os.path.join(out_dir, f"{cfg['id']}_{vname}.png")
        bpy.context.scene.render.filepath = out_f
        bpy.ops.render.render(write_still=True)
        print(f"[{cfg['id']}] Rendered {vname}: {out_f}")

    rig_obj.rotation_euler = (0, 0, 0)

if __name__ == "__main__":
    for cfg in ENEMY_CONFIGS:
        process_enemy(cfg)
    print("\nALL 3 3D MODELS EXPORTED AND PREVIEWED!")
