import bpy
import bmesh
import math
from mathutils import Matrix, Vector

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Import original Vasily
bpy.ops.import_scene.gltf(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_generated.glb')
model = bpy.data.objects['model']
model.name = 'Vasiliy_Body'
camo_mat = model.material_slots[0].material if model.material_slots else None

# Align feet to Z=0
min_z = min(v.co.z for v in model.data.vertices)
for v in model.data.vertices:
    v.co.z -= min_z

bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 2. Delete ALL dangling fused arm vertices cleanly (cut at abs(X) > 0.17)
# This completely eliminates both old dangling arms and dangling hands!
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(model.data)
verts_to_delete = [v for v in bm.verts if abs(v.co.x) > 0.17 and 0.65 < v.co.z < 1.36]
bmesh.ops.delete(bm, geom=verts_to_delete, context='VERTS')
bmesh.update_edit_mesh(model.data)
bpy.ops.object.mode_set(mode='OBJECT')

# 3. Flank Patches to close jacket torso holes
bpy.ops.mesh.primitive_cylinder_add(radius=0.175, depth=0.62, location=(-0.16, -0.01, 1.02))
r_patch = bpy.context.active_object
r_patch.scale = (0.35, 1.0, 1.0)
if camo_mat: r_patch.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.175, depth=0.62, location=(0.16, -0.01, 1.02))
l_patch = bpy.context.active_object
l_patch.scale = (0.35, 1.0, 1.0)
if camo_mat: l_patch.data.materials.append(camo_mat)

# Glove Material (dark tactical leather)
glove_mat = bpy.data.materials.new(name='GloveMat')
glove_mat.use_nodes = True
bsdf_g = glove_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_g:
    bsdf_g.inputs['Base Color'].default_value = (0.15, 0.15, 0.17, 1.0)
    bsdf_g.inputs['Roughness'].default_value = 0.85

# Helper function to create cylinder segment between two 3D points
def create_limb_segment(p1, p2, radius, mat, name='Limb'):
    p1 = Vector(p1)
    p2 = Vector(p2)
    dir_vec = p2 - p1
    length = dir_vec.length
    mid = (p1 + p2) / 2.0
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, location=mid)
    obj = bpy.context.active_object
    obj.name = name
    # Align cylinder Z-axis with dir_vec
    up = Vector((0, 0, 1))
    rot_quat = up.rotation_difference(dir_vec)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = rot_quat
    if mat: obj.data.materials.append(mat)
    return obj

# 4. Modeled RIGHT ARM (holds grip and trigger)
# Shoulder joint
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.088, location=(-0.19, -0.02, 1.34))
r_sh = bpy.context.active_object
if camo_mat: r_sh.data.materials.append(camo_mat)

# Right upper arm: shoulder (-0.19, -0.02, 1.34) -> elbow (-0.15, -0.16, 1.28)
r_up = create_limb_segment((-0.19, -0.02, 1.34), (-0.15, -0.16, 1.28), 0.075, camo_mat, 'R_Upper')

# Right forearm: elbow (-0.15, -0.16, 1.28) -> wrist (-0.08, -0.31, 1.25)
r_fore = create_limb_segment((-0.15, -0.16, 1.28), (-0.08, -0.31, 1.25), 0.068, camo_mat, 'R_Forearm')

# Right hand (gripping trigger)
bpy.ops.mesh.primitive_cube_add(size=0.09, location=(-0.08, -0.31, 1.25))
r_hand = bpy.context.active_object
r_hand.scale = (0.7, 1.2, 0.8)
r_hand.data.materials.append(glove_mat)

# 5. Modeled LEFT ARM (reaches forward-across and firmly cups shotgun fore-end from below)
# Shoulder joint
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.088, location=(0.19, -0.02, 1.34))
l_sh = bpy.context.active_object
if camo_mat: l_sh.data.materials.append(camo_mat)

# Left upper arm: shoulder (0.19, -0.02, 1.34) -> elbow (0.14, -0.22, 1.27)
l_up = create_limb_segment((0.19, -0.02, 1.34), (0.14, -0.22, 1.27), 0.075, camo_mat, 'L_Upper')

# Left forearm: elbow (0.14, -0.22, 1.27) -> wrist (-0.06, -0.44, 1.22)
l_fore = create_limb_segment((0.14, -0.22, 1.27), (-0.06, -0.44, 1.22), 0.068, camo_mat, 'L_Forearm')

# Left hand (cupping under fore-end)
bpy.ops.mesh.primitive_cube_add(size=0.09, location=(-0.06, -0.44, 1.22))
l_hand = bpy.context.active_object
l_hand.scale = (0.8, 1.3, 0.6)
l_hand.data.materials.append(glove_mat)

# Join all arm parts and flank patches into Vasiliy_Body
arm_parts = [r_patch, l_patch, r_sh, r_up, r_fore, r_hand, l_sh, l_up, l_fore, l_hand]
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
for p in arm_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.join()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 6. Modeled DOUBLE-BARREL SHOTGUN (held firmly in both hands)
shotgun_mat = bpy.data.materials.new(name='Shotgun_Steel')
shotgun_mat.use_nodes = True
bsdf_s = shotgun_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_s:
    bsdf_s.inputs['Base Color'].default_value = (0.22, 0.24, 0.26, 1.0)
    bsdf_s.inputs['Metallic'].default_value = 0.95
    bsdf_s.inputs['Roughness'].default_value = 0.30

wood_mat = bpy.data.materials.new(name='Shotgun_Wood')
wood_mat.use_nodes = True
bsdf_w = wood_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_w:
    bsdf_w.inputs['Base Color'].default_value = (0.35, 0.16, 0.06, 1.0)
    bsdf_w.inputs['Roughness'].default_value = 0.65

# Barrel 1 (right)
bpy.ops.mesh.primitive_cylinder_add(radius=0.024, depth=0.55, location=(-0.09, -0.55, 1.27))
b1 = bpy.context.active_object
b1.rotation_euler = (math.radians(90), 0, 0)
b1.data.materials.append(shotgun_mat)

# Barrel 2 (left)
bpy.ops.mesh.primitive_cylinder_add(radius=0.024, depth=0.55, location=(-0.04, -0.55, 1.27))
b2 = bpy.context.active_object
b2.rotation_euler = (math.radians(90), 0, 0)
b2.data.materials.append(shotgun_mat)

# Receiver / Grip (inside right hand)
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.07, -0.31, 1.25))
grip = bpy.context.active_object
grip.scale = (0.6, 1.4, 0.9)
grip.data.materials.append(wood_mat)

# Stock (tucked back under right armpit)
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.08, -0.15, 1.28))
stock = bpy.context.active_object
stock.scale = (0.5, 2.0, 1.1)
stock.rotation_euler = (math.radians(-6), 0, 0)
stock.data.materials.append(wood_mat)

# Fore-end (resting right inside left hand palm)
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.06, -0.44, 1.25))
fore = bpy.context.active_object
fore.scale = (0.65, 1.6, 0.6)
fore.data.materials.append(wood_mat)

# Join gun parts into Vasiliy_Shotgun
bpy.ops.object.select_all(action='DESELECT')
for p in [b1, b2, grip, stock, fore]:
    p.select_set(True)
bpy.context.view_layer.objects.active = b1
bpy.ops.object.join()
gun = bpy.context.active_object
gun.name = 'Vasiliy_Shotgun'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 7. Armature Rig & Clean Hierarchy
arm_data = bpy.data.armatures.new('Vasiliy_Armature')
rig = bpy.data.objects.new('Vasiliy_Rig', arm_data)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = rig.data.edit_bones

root = eb.new('Root'); root.head = (0, 0, 0); root.tail = (0, 0, 0.2)
pelvis = eb.new('Pelvis'); pelvis.head = (0, 0, 0.95); pelvis.tail = (0, 0, 1.15); pelvis.parent = root
spine = eb.new('Spine'); spine.head = (0, 0, 1.15); spine.tail = (0, 0, 1.35); spine.parent = pelvis
chest = eb.new('Chest'); chest.head = (0, 0, 1.35); chest.tail = (0, 0, 1.55); chest.parent = spine
head = eb.new('Head'); head.head = (0, 0, 1.55); head.tail = (0, 0, 1.95); head.parent = chest

# Legs
thigh_l = eb.new('Thigh.L'); thigh_l.head = (0.16, 0, 0.95); thigh_l.tail = (0.16, 0, 0.50); thigh_l.parent = pelvis
shin_l = eb.new('Shin.L'); shin_l.head = (0.16, 0, 0.50); shin_l.tail = (0.16, 0, 0.10); shin_l.parent = thigh_l
foot_l = eb.new('Foot.L'); foot_l.head = (0.16, 0, 0.10); foot_l.tail = (0.16, -0.22, 0); foot_l.parent = shin_l

thigh_r = eb.new('Thigh.R'); thigh_r.head = (-0.16, 0, 0.95); thigh_r.tail = (-0.16, 0, 0.50); thigh_r.parent = pelvis
shin_r = eb.new('Shin.R'); shin_r.head = (-0.16, 0, 0.50); shin_r.tail = (-0.16, 0, 0.10); shin_r.parent = thigh_r
foot_r = eb.new('Foot.R'); foot_r.head = (-0.16, 0, 0.10); foot_r.tail = (-0.16, -0.22, 0); foot_r.parent = shin_r

# Weapon socket bone right at grip location, child of Chest
weapon_socket = eb.new('Weapon_Socket')
weapon_socket.head = (-0.07, -0.31, 1.25)
weapon_socket.tail = (-0.07, -0.71, 1.25)
weapon_socket.parent = chest

bpy.ops.object.mode_set(mode='OBJECT')

# Set all pose bones to XYZ Euler rotation mode
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'

# Armature modifier for Body
mod = model.modifiers.new(name='Armature', type='ARMATURE')
mod.object = rig
model.parent = rig

# Gun parenting: native Bone Parent to Weapon_Socket
bpy.ops.object.select_all(action='DESELECT')
gun.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
rig.data.bones.active = rig.data.bones['Weapon_Socket']
bpy.ops.object.parent_set(type='BONE')
bpy.ops.object.mode_set(mode='OBJECT')

# 8. Clean Skinning Weights
model.vertex_groups.clear()
vg_head = model.vertex_groups.new(name='Head')
vg_chest = model.vertex_groups.new(name='Chest')
vg_spine = model.vertex_groups.new(name='Spine')
vg_pelvis = model.vertex_groups.new(name='Pelvis')
vg_thigh_l = model.vertex_groups.new(name='Thigh.L')
vg_shin_l = model.vertex_groups.new(name='Shin.L')
vg_thigh_r = model.vertex_groups.new(name='Thigh.R')
vg_shin_r = model.vertex_groups.new(name='Shin.R')

for v in model.data.vertices:
    x, y, z = v.co
    if z < 0.48:
        if x > 0: vg_shin_l.add([v.index], 1.0, 'REPLACE')
        else: vg_shin_r.add([v.index], 1.0, 'REPLACE')
    elif z < 0.92:
        if x > 0: vg_thigh_l.add([v.index], 1.0, 'REPLACE')
        else: vg_thigh_r.add([v.index], 1.0, 'REPLACE')
    elif z < 1.15:
        vg_pelvis.add([v.index], 1.0, 'REPLACE')
    elif z < 1.35:
        vg_spine.add([v.index], 1.0, 'REPLACE')
    elif z < 1.62:
        # Chest includes torso, shoulders, arms and hands!
        vg_chest.add([v.index], 1.0, 'REPLACE')
    else:
        vg_head.add([v.index], 1.0, 'REPLACE')

# 9. Realistic 16-Frame Alternating Walk Animation
rig.animation_data_create()
action = bpy.data.actions.new(name='Vasiliy_Walk')
rig.animation_data.action = action

bpy.ops.object.mode_set(mode='POSE')
for frame in range(1, 17):
    phase = ((frame - 1) / 16.0) * math.pi * 2.0
    
    # Left leg stride
    leg_l_angle = math.sin(phase) * 0.42
    knee_l_bend = max(0.0, -math.sin(phase)) * 0.48
    rig.pose.bones['Thigh.L'].rotation_euler = (leg_l_angle, 0, 0)
    rig.pose.bones['Shin.L'].rotation_euler = (-knee_l_bend, 0, 0)
    
    # Right leg stride
    leg_r_angle = -math.sin(phase) * 0.42
    knee_r_bend = max(0.0, math.sin(phase)) * 0.48
    rig.pose.bones['Thigh.R'].rotation_euler = (leg_r_angle, 0, 0)
    rig.pose.bones['Shin.R'].rotation_euler = (-knee_r_bend, 0, 0)
    
    # Pelvis bounce & subtle chest counter twist
    rig.pose.bones['Pelvis'].location = (0, 0, -abs(math.sin(phase * 2)) * 0.02)
    rig.pose.bones['Chest'].rotation_euler = (0, 0, math.sin(phase) * 0.025)
    
    for b in rig.pose.bones:
        b.keyframe_insert(data_path='rotation_euler', frame=frame)
        b.keyframe_insert(data_path='location', frame=frame)

bpy.ops.object.mode_set(mode='OBJECT')

# Save Master Blend
bpy.ops.wm.save_as_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')
print('SAVED MASTER BLEND!')

# Export to assets/models/vasiliy.glb
bpy.ops.export_scene.gltf(
    filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/assets/models/vasiliy.glb',
    export_format='GLB',
    use_selection=False,
    export_animations=True,
    export_current_frame=False,
    export_skins=True,
    export_morph=True,
    export_lights=False,
    export_cameras=False
)
print('EXPORTED CLEAN TWO-HANDED VASILIY.GLB TO GAME ASSETS!')
