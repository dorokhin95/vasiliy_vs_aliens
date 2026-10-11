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

# Align Z and rotate 180 to face -Y (Blender forward)
min_z = min(v.co.z for v in model.data.vertices)
model.location.z = -min_z
model.rotation_euler = (0, 0, math.radians(180))
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 2. Delete ALL dangling arm & hand vertices
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(model.data)
verts_to_delete = [v for v in bm.verts if abs(v.co.x) > 0.22 and 0.68 < v.co.z < 1.38]
bmesh.ops.delete(bm, geom=verts_to_delete, context='VERTS')
bmesh.update_edit_mesh(model.data)
bpy.ops.object.mode_set(mode='OBJECT')

# 3. Add closed flank patches
bpy.ops.mesh.primitive_cylinder_add(radius=0.17, depth=0.55, location=(-0.20, 0, 1.05))
r_patch = bpy.context.active_object
r_patch.scale = (0.35, 1.0, 1.0)
if camo_mat: r_patch.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.17, depth=0.55, location=(0.20, 0, 1.05))
l_patch = bpy.context.active_object
l_patch.scale = (0.35, 1.0, 1.0)
if camo_mat: l_patch.data.materials.append(camo_mat)

# Glove Material
glove_mat = bpy.data.materials.new(name='GloveMat')
glove_mat.use_nodes = True
bsdf_g = glove_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_g:
    bsdf_g.inputs['Base Color'].default_value = (0.16, 0.16, 0.18, 1.0)
    bsdf_g.inputs['Roughness'].default_value = 0.85

# 4. Modeled forward right arm
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.085, location=(-0.21, -0.02, 1.36))
r_shoulder = bpy.context.active_object
if camo_mat: r_shoulder.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.075, depth=0.22, location=(-0.19, -0.09, 1.32))
r_up = bpy.context.active_object
r_up.rotation_euler = (math.radians(52), math.radians(-8), math.radians(10))
if camo_mat: r_up.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.068, depth=0.20, location=(-0.14, -0.22, 1.26))
r_fore = bpy.context.active_object
r_fore.rotation_euler = (math.radians(20), math.radians(-15), math.radians(22))
if camo_mat: r_fore.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cube_add(size=0.09, location=(-0.10, -0.31, 1.25))
r_hand = bpy.context.active_object
r_hand.scale = (0.7, 1.3, 0.8)
r_hand.data.materials.append(glove_mat)

# 5. Modeled forward left arm
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.085, location=(0.21, -0.02, 1.36))
l_shoulder = bpy.context.active_object
if camo_mat: l_shoulder.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.075, depth=0.22, location=(0.18, -0.09, 1.32))
l_up = bpy.context.active_object
l_up.rotation_euler = (math.radians(52), math.radians(8), math.radians(-10))
if camo_mat: l_up.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.068, depth=0.28, location=(0.06, -0.27, 1.26))
l_fore = bpy.context.active_object
l_fore.rotation_euler = (math.radians(22), math.radians(35), math.radians(-50))
if camo_mat: l_fore.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cube_add(size=0.09, location=(-0.04, -0.43, 1.22))
l_hand = bpy.context.active_object
l_hand.scale = (0.8, 1.3, 0.6)
l_hand.data.materials.append(glove_mat)

# Join all arm and torso patch parts into model
arm_parts = [r_patch, l_patch, r_shoulder, r_up, r_fore, r_hand, l_shoulder, l_up, l_fore, l_hand]
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
for p in arm_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.join()

# 6. Build double-barrel shotgun mesh (firmly resting inside hands)
shotgun_mat = bpy.data.materials.new(name='Shotgun_Steel')
shotgun_mat.use_nodes = True
bsdf_s = shotgun_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_s:
    bsdf_s.inputs['Base Color'].default_value = (0.18, 0.20, 0.22, 1.0)
    bsdf_s.inputs['Metallic'].default_value = 0.9
    bsdf_s.inputs['Roughness'].default_value = 0.35

wood_mat = bpy.data.materials.new(name='Shotgun_Wood')
wood_mat.use_nodes = True
bsdf_w = wood_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_w:
    bsdf_w.inputs['Base Color'].default_value = (0.28, 0.12, 0.04, 1.0)
    bsdf_w.inputs['Roughness'].default_value = 0.7

bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.55, location=(-0.10, -0.52, 1.27))
b1 = bpy.context.active_object
b1.rotation_euler = (math.radians(90), 0, 0)
b1.data.materials.append(shotgun_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.55, location=(-0.04, -0.52, 1.27))
b2 = bpy.context.active_object
b2.rotation_euler = (math.radians(90), 0, 0)
b2.data.materials.append(shotgun_mat)

bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.07, -0.31, 1.25))
grip = bpy.context.active_object
grip.scale = (0.6, 1.4, 0.9)
grip.data.materials.append(wood_mat)

bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.09, -0.15, 1.28))
stock = bpy.context.active_object
stock.scale = (0.5, 2.0, 1.1)
stock.rotation_euler = (math.radians(-6), 0, 0)
stock.data.materials.append(wood_mat)

bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.07, -0.43, 1.24))
fore = bpy.context.active_object
fore.scale = (0.65, 1.6, 0.6)
fore.data.materials.append(wood_mat)

# Join gun parts into single mesh
bpy.ops.object.select_all(action='DESELECT')
for p in [b1, b2, grip, stock, fore]:
    p.select_set(True)
bpy.context.view_layer.objects.active = b1
bpy.ops.object.join()
gun = bpy.context.active_object
gun.name = 'Vasiliy_Shotgun'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 7. Build Armature Rig
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

# Weapon socket bone right at the grip, child of Chest
weapon_socket = eb.new('Weapon_Socket')
weapon_socket.head = (-0.07, -0.31, 1.25)
weapon_socket.tail = (-0.07, -0.71, 1.25)
weapon_socket.parent = chest

bpy.ops.object.mode_set(mode='OBJECT')

# Armature modifiers
mod = model.modifiers.new(name='Armature', type='ARMATURE')
mod.object = rig
model.parent = rig

gun.parent = rig
gun.parent_type = 'BONE'
gun.parent_bone = 'Weapon_Socket'
ws_mat = rig.matrix_world @ rig.data.bones['Weapon_Socket'].matrix_local
gun.matrix_parent_inverse = ws_mat.inverted()
gun.matrix_basis = Matrix.Translation(Vector((-0.07, -0.31, 1.25)))

# 8. Clean Vertex Group Skinning
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
        if x > 0.05: vg_thigh_l.add([v.index], 1.0, 'REPLACE')
        elif x < -0.05: vg_thigh_r.add([v.index], 1.0, 'REPLACE')
        else: vg_pelvis.add([v.index], 1.0, 'REPLACE')
    elif z < 1.15:
        vg_pelvis.add([v.index], 1.0, 'REPLACE')
    elif z < 1.35:
        vg_spine.add([v.index], 1.0, 'REPLACE')
    elif z < 1.60:
        vg_chest.add([v.index], 1.0, 'REPLACE')
    else:
        vg_head.add([v.index], 1.0, 'REPLACE')

# 9. Walk Animation (Vasiliy_Walk)
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
print('EXPORTED PERFECT VASILIY.GLB TO GAME ASSETS!')

# 10. Render 3 Verification Views
world = bpy.context.scene.world or bpy.data.worlds.new('World')
bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Color'].default_value = (0.05, 0.05, 0.08, 1.0)

cam_data = bpy.data.cameras.new('Cam')
cam = bpy.data.objects.new('Cam', cam_data)
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam

# Studio Lighting
key = bpy.data.lights.new('Key', type='SUN')
key.energy = 4.0
key_obj = bpy.data.objects.new('Key', key)
bpy.context.scene.collection.objects.link(key_obj)
key_obj.location = (2, -3, 3)

fill = bpy.data.lights.new('Fill', type='SUN')
fill.energy = 2.5
fill.color = (0.8, 0.9, 1.0)
fill_obj = bpy.data.objects.new('Fill', fill)
bpy.context.scene.collection.objects.link(fill_obj)
fill_obj.location = (-2, -3, 2)

bpy.context.scene.render.resolution_x = 360
bpy.context.scene.render.resolution_y = 360
bpy.context.scene.render.film_transparent = True

# 1. SIDE VIEW
bpy.context.scene.frame_set(1)
cam.location = (3.5, -0.2, 1.25)
cam.rotation_euler = (math.radians(90), 0, math.radians(90))
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/final_verify_side.png'
bpy.ops.render.render(write_still=True)

# 2. 2.5D ISOMETRIC GAME VIEW
cam.location = (1.8, -2.8, 2.2)
cam.rotation_euler = (math.radians(58), 0, math.radians(32))
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/final_verify_iso.png'
bpy.ops.render.render(write_still=True)

# 3. WALK STRIDE FRAME (Frame 5)
bpy.context.scene.frame_set(5)
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/final_verify_walk.png'
bpy.ops.render.render(write_still=True)

print('ALL 3 VERIFICATION VIEWS SAVED!')
