import bpy
import math
from mathutils import Matrix, Vector, Euler

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Import ORIGINAL Vasily generated from the sprite
bpy.ops.import_scene.gltf(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_generated.glb')
model = bpy.data.objects['model']
model.name = 'Vasiliy_Body'

# Align Z so feet are on ground (Z=0)
min_z = min(v.co.z for v in model.data.vertices)
model.location.z = -min_z
# Rotate 180 around Z to face -Y (standard Blender forward direction)
model.rotation_euler = (0, 0, math.radians(180))
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Materials setup: preserve original camouflage texture
if model.material_slots:
    mat = model.material_slots[0].material
    if mat and mat.node_tree:
        for n in mat.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Roughness'].default_value = 0.85
                n.inputs['Metallic'].default_value = 0.1

# 2. Build Armature Rig
arm_data = bpy.data.armatures.new('Vasiliy_Armature')
rig = bpy.data.objects.new('Vasiliy_Rig', arm_data)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = rig.data.edit_bones

root = eb.new('Root')
root.head = (0, 0, 0)
root.tail = (0, 0, 0.2)

pelvis = eb.new('Pelvis')
pelvis.head = (0, 0, 0.95)
pelvis.tail = (0, 0, 1.15)
pelvis.parent = root

spine = eb.new('Spine')
spine.head = (0, 0, 1.15)
spine.tail = (0, 0, 1.35)
spine.parent = pelvis

chest = eb.new('Chest')
chest.head = (0, 0, 1.35)
chest.tail = (0, 0, 1.55)
chest.parent = spine

head = eb.new('Head')
head.head = (0, 0, 1.55)
head.tail = (0, 0, 1.95)
head.parent = chest

# Left Leg (X > 0)
thigh_l = eb.new('Thigh.L')
thigh_l.head = (0.16, 0, 0.95)
thigh_l.tail = (0.16, 0, 0.50)
thigh_l.parent = pelvis

shin_l = eb.new('Shin.L')
shin_l.head = (0.16, 0, 0.50)
shin_l.tail = (0.16, 0, 0.10)
shin_l.parent = thigh_l

foot_l = eb.new('Foot.L')
foot_l.head = (0.16, 0, 0.10)
foot_l.tail = (0.16, -0.22, 0)
foot_l.parent = shin_l

# Right Leg (X < 0)
thigh_r = eb.new('Thigh.R')
thigh_r.head = (-0.16, 0, 0.95)
thigh_r.tail = (-0.16, 0, 0.50)
thigh_r.parent = pelvis

shin_r = eb.new('Shin.R')
shin_r.head = (-0.16, 0, 0.50)
shin_r.tail = (-0.16, 0, 0.10)
shin_r.parent = thigh_r

foot_r = eb.new('Foot.R')
foot_r.head = (-0.16, 0, 0.10)
foot_r.tail = (-0.16, -0.22, 0)
foot_r.parent = shin_r

# Weapon Socket bone in front of right side at chest/hip level, pointing forward (-Y)
weapon_socket = eb.new('Weapon_Socket')
weapon_socket.head = (-0.14, -0.25, 1.18)
weapon_socket.tail = (-0.14, -0.65, 1.18)
weapon_socket.parent = chest

bpy.ops.object.mode_set(mode='OBJECT')

# Armature modifier
mod = model.modifiers.new(name='Armature', type='ARMATURE')
mod.object = rig
model.parent = rig

# 3. Clean spatial skinning for original Vasily
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
        if x > 0:
            vg_shin_l.add([v.index], 1.0, 'REPLACE')
        else:
            vg_shin_r.add([v.index], 1.0, 'REPLACE')
    elif z < 0.95:
        # Lower body / thighs
        if x > 0.05:
            vg_thigh_l.add([v.index], 1.0, 'REPLACE')
        elif x < -0.05:
            vg_thigh_r.add([v.index], 1.0, 'REPLACE')
        else:
            vg_pelvis.add([v.index], 1.0, 'REPLACE')
    elif z < 1.25:
        vg_pelvis.add([v.index], 1.0, 'REPLACE')
    elif z < 1.45:
        vg_spine.add([v.index], 1.0, 'REPLACE')
    elif z < 1.62:
        vg_chest.add([v.index], 1.0, 'REPLACE')
    else:
        vg_head.add([v.index], 1.0, 'REPLACE')

print('ORIGINAL VASILIY RIGGED & SKINNED SUCCESSFULLY!')

# 4. Authentic double-barrel shotgun mesh held in Right hand pointing forward
shotgun_mat = bpy.data.materials.new(name='Shotgun_Steel')
shotgun_mat.use_nodes = True
bsdf = shotgun_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.16, 0.18, 0.20, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.9
    bsdf.inputs['Roughness'].default_value = 0.35

wood_mat = bpy.data.materials.new(name='Shotgun_Walnut')
wood_mat.use_nodes = True
bsdf_w = wood_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_w:
    bsdf_w.inputs['Base Color'].default_value = (0.28, 0.12, 0.04, 1.0)
    bsdf_w.inputs['Roughness'].default_value = 0.7

# Barrels pointing forward (-Y)
bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.55, location=(-0.03, -0.28, 0.04))
b1 = bpy.context.active_object
b1.rotation_euler = (math.radians(90), 0, 0)
b1.data.materials.append(shotgun_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.55, location=(0.03, -0.28, 0.04))
b2 = bpy.context.active_object
b2.rotation_euler = (math.radians(90), 0, 0)
b2.data.materials.append(shotgun_mat)

# Receiver / Grip
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(0, 0, 0))
grip = bpy.context.active_object
grip.scale = (0.6, 1.2, 0.9)
grip.data.materials.append(wood_mat)

# Stock
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(0, 0.18, -0.02))
stock = bpy.context.active_object
stock.scale = (0.5, 1.8, 1.0)
stock.rotation_euler = (math.radians(-8), 0, 0)
stock.data.materials.append(wood_mat)

# Fore-end
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(0, -0.18, 0.01))
fore = bpy.context.active_object
fore.scale = (0.65, 1.6, 0.6)
fore.data.materials.append(wood_mat)

# Join gun parts
bpy.ops.object.select_all(action='DESELECT')
for p in [b1, b2, grip, stock, fore]:
    p.select_set(True)
bpy.context.view_layer.objects.active = b1
bpy.ops.object.join()
gun = bpy.context.active_object
gun.name = 'Vasiliy_Shotgun'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Attach gun to Weapon_Socket bone (Right hand side at -0.14, -0.25, 1.18)
gun.parent = rig
gun.parent_type = 'BONE'
gun.parent_bone = 'Weapon_Socket'
ws_mat = rig.matrix_world @ rig.data.bones['Weapon_Socket'].matrix_local
gun.matrix_parent_inverse = ws_mat.inverted()
target_world = Matrix.Translation(Vector((-0.14, -0.25, 1.18)))
gun.matrix_basis = target_world

# 5. True Leg Walking Animation (Vasiliy_Walk)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
for b in rig.pose.bones:
    b.rotation_mode = 'XYZ'

walk_action = bpy.data.actions.new('Vasiliy_Walk')
walk_action.use_fake_user = True
rig.animation_data_create()
rig.animation_data.action = walk_action

TOTAL_FRAMES = 16
for frame in range(1, TOTAL_FRAMES + 1):
    bpy.context.scene.frame_set(frame)
    phase = ((frame - 1) / TOTAL_FRAMES) * 2 * math.pi
    
    # Left leg stride: forward on phase 0, back on phase pi
    leg_l_angle = math.sin(phase) * 0.42
    knee_l_bend = max(0.0, -math.sin(phase)) * 0.48
    rig.pose.bones['Thigh.L'].rotation_euler = (leg_l_angle, 0, 0)
    rig.pose.bones['Shin.L'].rotation_euler = (-knee_l_bend, 0, 0)
    
    # Right leg stride: opposite phase
    leg_r_angle = -math.sin(phase) * 0.42
    knee_r_bend = max(0.0, math.sin(phase)) * 0.48
    rig.pose.bones['Thigh.R'].rotation_euler = (leg_r_angle, 0, 0)
    rig.pose.bones['Shin.R'].rotation_euler = (-knee_r_bend, 0, 0)
    
    # Pelvis bounce & chest subtle counter-twist
    rig.pose.bones['Pelvis'].location = (0, 0, -abs(math.sin(phase * 2)) * 0.025)
    rig.pose.bones['Chest'].rotation_euler = (math.radians(2), 0, math.sin(phase) * 0.035)
    
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
print('RESTORED AND EXPORTED REAL VASILIY GLB SUCCESSFULLY!')
