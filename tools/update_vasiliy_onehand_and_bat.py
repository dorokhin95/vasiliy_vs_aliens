import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = r"d:\pro1\vasiliy_vs_aliens"
MASTER_BLEND = os.path.join(ROOT, "blender_assets", "vasiliy_character_master.blend")
OUT_VASILIY_GLB = os.path.join(ROOT, "assets", "models", "vasiliy.glb")
OUT_BAT_GLB = os.path.join(ROOT, "assets", "models", "weapon_bat.glb")
PREVIEW_DIR = r"C:\Users\p.dorohin\.gemini\antigravity\brain\b32c11b0-de23-4578-9171-2ad81046354d"


def transform_cylinder_exact(template_cyl, orig_p1, orig_p2, new_p1, new_p2, scale_radius=1.0):
    bpy.ops.object.select_all(action='DESELECT')
    template_cyl.select_set(True)
    bpy.context.view_layer.objects.active = template_cyl
    bpy.ops.object.duplicate()
    new_obj = bpy.context.active_object

    op1 = Vector(orig_p1)
    op2 = Vector(orig_p2)
    orig_center = (op1 + op2) * 0.5
    orig_vec = op2 - op1
    orig_len = orig_vec.length
    orig_axis = orig_vec.normalized()

    np1 = Vector(new_p1)
    np2 = Vector(new_p2)
    new_center = (np1 + np2) * 0.5
    new_vec = np2 - np1
    new_len = new_vec.length
    new_axis = new_vec.normalized()

    rot_quat = orig_axis.rotation_difference(new_axis)
    len_scale = new_len / max(orig_len, 0.001)

    for v in new_obj.data.vertices:
        rel = v.co - orig_center
        along = rel.dot(orig_axis)
        radial = rel - orig_axis * along
        scaled_rel = (orig_axis * (along * len_scale)) + (radial * scale_radius)
        v.co = new_center + (rot_quat @ scaled_rel)

    new_obj.data.update()
    return new_obj


def clone_and_move(template_obj, target_center, scale_factor=1.0):
    bpy.ops.object.select_all(action='DESELECT')
    template_obj.select_set(True)
    bpy.context.view_layer.objects.active = template_obj
    bpy.ops.object.duplicate()
    new_obj = bpy.context.active_object

    verts = new_obj.data.vertices
    center = sum((v.co for v in verts), Vector((0, 0, 0))) / len(verts)
    t_center = Vector(target_center)
    for v in verts:
        v.co = t_center + (v.co - center) * scale_factor
    new_obj.data.update()
    return new_obj


def make_static_child_of_rig(obj, rig, pivot_point=(0.0, 0.0, 0.0)):
    """
    Makes obj a static Mesh child of rig (no Armature modifier) with its origin at pivot_point.
    That way Three.js can freely rotate obj around pivot_point (e.g. Right Shoulder ball-joint)!
    """
    obj.modifiers.clear()
    obj.vertex_groups.clear()
    piv = Vector(pivot_point)
    for v in obj.data.vertices:
        v.co -= piv
    obj.data.update()

    obj.parent = rig
    obj.parent_type = 'OBJECT'
    obj.location = piv
    obj.rotation_mode = 'XYZ'
    obj.rotation_euler = (0, 0, 0)
    obj.scale = (1, 1, 1)


def build_all():
    bpy.ops.wm.open_mainfile(filepath=MASTER_BLEND)
    bpy.context.scene.frame_set(1)

    body = bpy.data.objects['Vasiliy_Body']
    rig = bpy.data.objects['Vasiliy_Rig']

    # Separate loose parts of Vasiliy_Body
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')

    all_parts = list(bpy.context.selected_objects)

    part_map = {}
    body_parts = []
    for p in all_parts:
        idx = int(p.name.split('.')[1]) if '.' in p.name else 0
        if idx in (1391, 1392, 1393, 1394, 1396, 1397, 1398, 1399):
            part_map[idx] = p
        else:
            body_parts.append(p)

    # Exact original endpoints of 1391 (Right Upper Arm) and 1393 (Right Forearm):
    orig_r_shoulder = (-0.26, -0.02, 1.36)
    orig_r_elbow = (-0.22, -0.16, 1.20)
    orig_r_hand = (-0.09, -0.36, 1.22)

    tpl_upper_cyl = part_map[1391]
    tpl_elbow_sph = part_map[1392]
    tpl_fore_cyl = part_map[1393]
    tpl_glove = part_map[1394]

    # 1. Re-join clean Vasiliy_Body (with shoulders 1390 & 1395 intact)
    bpy.ops.object.select_all(action='DESELECT')
    for p in body_parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = body_parts[0]
    bpy.ops.object.join()
    clean_body = bpy.context.active_object
    clean_body.name = "Vasiliy_Body"

    # 2. Build Vasiliy_Arm_L_Down (Natural left arm hanging at his left side for one-handed weapons)
    l_shoulder = (0.26, -0.02, 1.36)
    l_elbow = (0.30, 0.00, 1.15)
    l_hand = (0.28, -0.12, 0.96)

    l_up_down = transform_cylinder_exact(tpl_upper_cyl, orig_r_shoulder, orig_r_elbow, l_shoulder, l_elbow, scale_radius=0.92)
    l_el_down = clone_and_move(tpl_elbow_sph, l_elbow, scale_factor=0.90)
    l_fo_down = transform_cylinder_exact(tpl_fore_cyl, orig_r_elbow, orig_r_hand, l_elbow, l_hand, scale_radius=0.88)
    l_gl_down = clone_and_move(tpl_glove, l_hand, scale_factor=0.98)

    bpy.ops.object.select_all(action='DESELECT')
    for p in (l_up_down, l_el_down, l_fo_down, l_gl_down):
        p.select_set(True)
    bpy.context.view_layer.objects.active = l_up_down
    bpy.ops.object.join()
    arm_l_down = bpy.context.active_object
    arm_l_down.name = "Vasiliy_Arm_L_Down"
    make_static_child_of_rig(arm_l_down, rig, pivot_point=l_shoulder)

    # 3. Build Vasiliy_Arm_R_Pistol (Right arm aiming Makarov PM forward in one hand)
    r_shoulder = (-0.26, -0.02, 1.36)
    r_elbow_pm = (-0.22, -0.22, 1.27)
    r_hand_pm = (-0.14, -0.44, 1.25)

    r_up_pm = transform_cylinder_exact(tpl_upper_cyl, orig_r_shoulder, orig_r_elbow, r_shoulder, r_elbow_pm, scale_radius=0.95)
    r_el_pm = clone_and_move(tpl_elbow_sph, r_elbow_pm, scale_factor=0.92)
    r_fo_pm = transform_cylinder_exact(tpl_fore_cyl, orig_r_elbow, orig_r_hand, r_elbow_pm, r_hand_pm, scale_radius=0.90)
    r_gl_pm = clone_and_move(tpl_glove, r_hand_pm, scale_factor=1.0)

    bpy.ops.object.select_all(action='DESELECT')
    for p in (r_up_pm, r_el_pm, r_fo_pm, r_gl_pm):
        p.select_set(True)
    bpy.context.view_layer.objects.active = r_up_pm
    bpy.ops.object.join()
    arm_r_pistol = bpy.context.active_object
    arm_r_pistol.name = "Vasiliy_Arm_R_Pistol"
    make_static_child_of_rig(arm_r_pistol, rig, pivot_point=r_shoulder)

    # 4. Build Vasiliy_Arm_R_Bat (Right arm holding the Spiked Bat, pivoted at Right Shoulder!)
    # Notice: relative to Right Shoulder (-0.26, -0.02, 1.36):
    # Elbow is at (-0.33, -0.15, 1.21) -> relative (-0.07, -0.13, -0.15)
    # Hand is at (-0.28, -0.34, 1.18) -> relative (-0.02, -0.32, -0.18)
    # In glTF space (+Y up, +Z forward):
    # Right Shoulder is at (-0.26, 1.36, 0.02)
    # Hand relative to Right Shoulder in glTF is (-0.02, -0.18, 0.32)!
    r_elbow_bat = (-0.33, -0.15, 1.21)
    r_hand_bat = (-0.28, -0.34, 1.18)

    r_up_bat = transform_cylinder_exact(tpl_upper_cyl, orig_r_shoulder, orig_r_elbow, r_shoulder, r_elbow_bat, scale_radius=0.95)
    r_el_bat = clone_and_move(tpl_elbow_sph, r_elbow_bat, scale_factor=0.92)
    r_fo_bat = transform_cylinder_exact(tpl_fore_cyl, orig_r_elbow, orig_r_hand, r_elbow_bat, r_hand_bat, scale_radius=0.90)
    r_gl_bat = clone_and_move(tpl_glove, r_hand_bat, scale_factor=1.05)

    bpy.ops.object.select_all(action='DESELECT')
    for p in (r_up_bat, r_el_bat, r_fo_bat, r_gl_bat):
        p.select_set(True)
    bpy.context.view_layer.objects.active = r_up_bat
    bpy.ops.object.join()
    arm_r_bat = bpy.context.active_object
    arm_r_bat.name = "Vasiliy_Arm_R_Bat"
    make_static_child_of_rig(arm_r_bat, rig, pivot_point=r_shoulder)

    # 5. Join the original two-handed rifle arms (1391..1394 and 1396..1399) into Vasiliy_Arms_TwoHanded
    bpy.ops.object.select_all(action='DESELECT')
    for idx in (1391, 1392, 1393, 1394, 1396, 1397, 1398, 1399):
        part_map[idx].select_set(True)
    bpy.context.view_layer.objects.active = part_map[1391]
    bpy.ops.object.join()
    arms_twohanded = bpy.context.active_object
    arms_twohanded.name = "Vasiliy_Arms_TwoHanded"
    make_static_child_of_rig(arms_twohanded, rig, pivot_point=(0, 0, 0))

    # Export updated vasiliy.glb!
    bpy.ops.export_scene.gltf(
        filepath=OUT_VASILIY_GLB,
        export_format='GLB',
        export_animations=True
    )
    print(f"Exported updated {OUT_VASILIY_GLB} ({os.path.getsize(OUT_VASILIY_GLB)} bytes)")

    # Test-render Bat Ready Pose and Bat Mid-Swing Cleave Pose!
    bpy.data.objects['Vasiliy_Shotgun'].hide_render = True
    bpy.data.objects['Vasiliy_Drill'].hide_render = True
    bpy.data.objects['Vasiliy_Plasma'].hide_render = True
    arms_twohanded.hide_render = True
    arm_r_pistol.hide_render = True
    arm_l_down.hide_render = False
    arm_r_bat.hide_render = False

    bpy.ops.import_scene.gltf(filepath=OUT_BAT_GLB)
    bat_objs = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    bat = bat_objs[0]
    if bat.parent:
        bpy.ops.object.select_all(action='DESELECT')
        bat.select_set(True)
        bpy.context.view_layer.objects.active = bat
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bat.rotation_mode = 'XYZ'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Parent bat to arm_r_bat so when arm_r_bat rotates around Right Shoulder, bat moves with the hand!
    bat.parent = arm_r_bat
    # Hand relative to Right Shoulder (-0.26, -0.02, 1.36) is (-0.02, -0.32, -0.18).
    # Because bat's origin (0,0,0) is now the exact center of the blue-taped handle grip,
    # placing bat at (-0.02, -0.32, -0.18) locks the grip inside Vasily's right fist at ALL rotations!
    bat.location = (-0.02, -0.32, -0.18)
    bat.rotation_euler = (math.radians(-48), math.radians(0), math.radians(-18))

    bpy.ops.object.camera_add(location=(0, -5.3, 3.8), rotation=(math.radians(62), 0, 0))
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 2.45
    bpy.context.scene.camera = cam

    bpy.ops.object.light_add(type='SUN', location=(2, -5, 7))
    bpy.context.active_object.data.energy = 4.0

    bpy.context.scene.render.resolution_x = 320
    bpy.context.scene.render.resolution_y = 320
    bpy.context.scene.render.film_transparent = True

    # Frame 1: Ready Pose (One-handed right grip, cocked up at 45 deg on right side)
    arm_r_bat.rotation_euler = (0, 0, 0)
    bat.rotation_euler = (math.radians(-46), math.radians(0), math.radians(-20))
    bpy.context.scene.render.filepath = os.path.join(PREVIEW_DIR, "debug_bat_swing_1_ready.png")
    bpy.ops.render.render(write_still=True)

    # Frame 2: Mid-Swing Impact (Directly in front-center of Vasily, leveled horizontally!)
    arm_r_bat.rotation_euler = (math.radians(8), math.radians(0), math.radians(18))
    bat.rotation_euler = (math.radians(-12), math.radians(0), math.radians(8))
    bpy.context.scene.render.filepath = os.path.join(PREVIEW_DIR, "debug_bat_swing_2_impact.png")
    bpy.ops.render.render(write_still=True)

    # Frame 3: Cleave Follow-Through (Sweeping across to front-left, total yaw ~62 deg, well in front of body!)
    arm_r_bat.rotation_euler = (math.radians(12), math.radians(0), math.radians(36))
    bat.rotation_euler = (math.radians(-10), math.radians(0), math.radians(26))
    bpy.context.scene.render.filepath = os.path.join(PREVIEW_DIR, "debug_bat_swing_3_cleave.png")
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    build_all()
