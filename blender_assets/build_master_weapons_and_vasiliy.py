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

# 2. Cleanly remove dangling lower arms outside hip contour (abs(X) > 0.19, 0.65 < Z < 1.28)
# Preserves the full broad shoulder width (Z > 1.28)
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(model.data)
verts_to_delete = [v for v in bm.verts if abs(v.co.x) > 0.19 and 0.65 < v.co.z < 1.28]
bmesh.ops.delete(bm, geom=verts_to_delete, context='VERTS')
bmesh.update_edit_mesh(model.data)
bpy.ops.object.mode_set(mode='OBJECT')

# 3. Flank Patches to close hip/waist openings smoothly
bpy.ops.mesh.primitive_cylinder_add(radius=0.185, depth=0.55, location=(-0.17, -0.01, 0.98))
r_patch = bpy.context.active_object
r_patch.scale = (0.35, 1.0, 1.0)
if camo_mat: r_patch.data.materials.append(camo_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.185, depth=0.55, location=(0.17, -0.01, 0.98))
l_patch = bpy.context.active_object
l_patch.scale = (0.35, 1.0, 1.0)
if camo_mat: l_patch.data.materials.append(camo_mat)

# Glove Material (heavy dark winter leather)
glove_mat = bpy.data.materials.new(name='GloveMat')
glove_mat.use_nodes = True
bsdf_g = glove_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_g:
    bsdf_g.inputs['Base Color'].default_value = (0.12, 0.12, 0.14, 1.0)
    bsdf_g.inputs['Roughness'].default_value = 0.85

def create_thick_limb(p1, p2, r1, r2, mat, name='Limb'):
    p1 = Vector(p1)
    p2 = Vector(p2)
    dir_vec = p2 - p1
    length = dir_vec.length
    mid = (p1 + p2) / 2.0
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=length, location=mid)
    obj = bpy.context.active_object
    obj.name = name
    up = Vector((0, 0, 1))
    rot_quat = up.rotation_difference(dir_vec)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = rot_quat
    if mat: obj.data.materials.append(mat)
    return obj

# 4. BROAD, BULKY WINTER SLEEVES WITH PROPER GRIP REACH
# Weapon Grip is at (-0.09, -0.36, 1.22)
# Weapon Fore-end is at (-0.06, -0.58, 1.22)

# Right Shoulder at (-0.26, -0.02, 1.36)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.125, location=(-0.26, -0.02, 1.36))
r_sh = bpy.context.active_object
if camo_mat: r_sh.data.materials.append(camo_mat)

# Right Upper Arm: shoulder (-0.26, -0.02, 1.36) -> elbow (-0.22, -0.16, 1.20)
r_up = create_thick_limb((-0.26, -0.02, 1.36), (-0.22, -0.16, 1.20), 0.115, 0.10, camo_mat, 'R_Upper')

# Right Elbow Joint
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.10, location=(-0.22, -0.16, 1.20))
r_elb = bpy.context.active_object
if camo_mat: r_elb.data.materials.append(camo_mat)

# Right Forearm: elbow (-0.22, -0.16, 1.20) -> wrist (-0.09, -0.36, 1.22)
r_fore = create_thick_limb((-0.22, -0.16, 1.20), (-0.09, -0.36, 1.22), 0.098, 0.088, camo_mat, 'R_Forearm')

# Right Mitten gripping trigger at (-0.09, -0.36, 1.22)
bpy.ops.mesh.primitive_cube_add(size=0.11, location=(-0.09, -0.36, 1.22))
r_hand = bpy.context.active_object
r_hand.scale = (0.85, 1.3, 0.95)
r_hand.data.materials.append(glove_mat)

# Left Shoulder at (0.26, -0.02, 1.36)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.125, location=(0.26, -0.02, 1.36))
l_sh = bpy.context.active_object
if camo_mat: l_sh.data.materials.append(camo_mat)

# Left Upper Arm: shoulder (0.26, -0.02, 1.36) -> elbow (0.20, -0.26, 1.18)
l_up = create_thick_limb((0.26, -0.02, 1.36), (0.20, -0.26, 1.18), 0.115, 0.10, camo_mat, 'L_Upper')

# Left Elbow Joint
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.10, location=(0.20, -0.26, 1.18))
l_elb = bpy.context.active_object
if camo_mat: l_elb.data.materials.append(camo_mat)

# Left Forearm: elbow (0.20, -0.26, 1.18) -> wrist (-0.06, -0.58, 1.20)
# Reaches across and forward to support the fore-end
l_fore = create_thick_limb((0.20, -0.26, 1.18), (-0.06, -0.58, 1.20), 0.098, 0.088, camo_mat, 'L_Forearm')

# Left Mitten cupping fore-end at (-0.06, -0.58, 1.20)
bpy.ops.mesh.primitive_cube_add(size=0.11, location=(-0.06, -0.58, 1.20))
l_hand = bpy.context.active_object
l_hand.scale = (0.95, 1.4, 0.75)
l_hand.data.materials.append(glove_mat)

# Join all arm parts into Vasiliy_Body
arm_parts = [r_patch, l_patch, r_sh, r_up, r_elb, r_fore, r_hand, l_sh, l_up, l_elb, l_fore, l_hand]
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
for p in arm_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.join()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -------------------------------------------------------------
# 5. DETAILED DIESELPUNK WEAPONS
# -------------------------------------------------------------

# Shared Materials
steel_mat = bpy.data.materials.new(name='Diesel_Steel')
steel_mat.use_nodes = True
bsdf = steel_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.22, 0.24, 0.26, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.95
    bsdf.inputs['Roughness'].default_value = 0.32

wood_mat = bpy.data.materials.new(name='Birch_Wood')
wood_mat.use_nodes = True
bsdf = wood_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.36, 0.17, 0.06, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.65

brass_mat = bpy.data.materials.new(name='Soviet_Brass')
brass_mat.use_nodes = True
bsdf = brass_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.75, 0.58, 0.22, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.90
    bsdf.inputs['Roughness'].default_value = 0.35

orange_mat = bpy.data.materials.new(name='Industrial_Orange')
orange_mat.use_nodes = True
bsdf = orange_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.85, 0.38, 0.08, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.45
    bsdf.inputs['Metallic'].default_value = 0.30

glow_plasma_mat = bpy.data.materials.new(name='Plasma_Glow')
glow_plasma_mat.use_nodes = True
bsdf = glow_plasma_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.1, 0.9, 0.7, 1.0)
    bsdf.inputs['Emission Color'].default_value = (0.1, 1.0, 0.7, 1.0)
    bsdf.inputs['Emission Strength'].default_value = 4.0

# -----------------
# A. ОБРЕЗ ДВУСТВОЛКИ (Vasiliy_Shotgun)
# -----------------
# Stock: resting against shoulder from Y=-0.16 to -0.34
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.08, -0.22, 1.25))
s_stock = bpy.context.active_object
s_stock.scale = (0.55, 2.4, 1.2)
s_stock.rotation_euler = (math.radians(-5), 0, 0)
s_stock.data.materials.append(wood_mat)

# Receiver & Trigger (inside right hand at Y=-0.36)
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.07, -0.42, 1.24))
s_rec = bpy.context.active_object
s_rec.scale = (0.75, 1.8, 1.1)
s_rec.data.materials.append(steel_mat)

# Wooden Fore-end (inside left hand at Y=-0.58)
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.065, -0.58, 1.22))
s_fore = bpy.context.active_object
s_fore.scale = (0.80, 2.2, 0.75)
s_fore.data.materials.append(wood_mat)

# Long Double Barrels: Y=-0.48 to Y=-1.08 (length 60 cm, extends WAY in front of left hand!)
bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.62, location=(-0.09, -0.78, 1.25))
s_b1 = bpy.context.active_object
s_b1.rotation_euler = (math.radians(90), 0, 0)
s_b1.data.materials.append(steel_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.62, location=(-0.04, -0.78, 1.25))
s_b2 = bpy.context.active_object
s_b2.rotation_euler = (math.radians(90), 0, 0)
s_b2.data.materials.append(steel_mat)

# Front Sight Bead
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=(-0.065, -1.07, 1.275))
s_sight = bpy.context.active_object
s_sight.data.materials.append(brass_mat)

bpy.ops.object.select_all(action='DESELECT')
for p in [s_stock, s_rec, s_fore, s_b1, s_b2, s_sight]: p.select_set(True)
bpy.context.view_layer.objects.active = s_stock
bpy.ops.object.join()
shotgun_obj = bpy.context.active_object
shotgun_obj.name = 'Vasiliy_Shotgun'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -----------------
# B. ПЕРФОРАТОР / БУР (Vasiliy_Drill)
# -----------------
# Heavy Industrial Housing (Orange steel motor block)
bpy.ops.mesh.primitive_cube_add(size=0.18, location=(-0.07, -0.42, 1.24))
d_body = bpy.context.active_object
d_body.scale = (1.0, 1.6, 1.2)
d_body.data.materials.append(orange_mat)

# Motor Cooling Fins (Cylinder on side)
bpy.ops.mesh.primitive_cylinder_add(radius=0.075, depth=0.22, location=(-0.07, -0.38, 1.32))
d_vent = bpy.context.active_object
d_vent.data.materials.append(steel_mat)

# Main Rear Handle (held in right hand at Y=-0.36)
bpy.ops.mesh.primitive_cube_add(size=0.09, location=(-0.08, -0.28, 1.22))
d_h1 = bpy.context.active_object
d_h1.scale = (0.6, 1.4, 1.2)
d_h1.data.materials.append(steel_mat)

# Auxiliary D-Ring Side Handle (held in left hand at Y=-0.58)
bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=0.18, location=(-0.06, -0.56, 1.22))
d_h2 = bpy.context.active_object
d_h2.rotation_euler = (0, math.radians(90), 0)
d_h2.data.materials.append(steel_mat)

# Heavy Steel Tool Chuck Mechanism
bpy.ops.mesh.primitive_cylinder_add(radius=0.065, depth=0.16, location=(-0.065, -0.62, 1.24))
d_chuck = bpy.context.active_object
d_chuck.rotation_euler = (math.radians(90), 0, 0)
d_chuck.data.materials.append(steel_mat)

# Heavy Spiral Industrial Auger Bit (Шнек с резьбой и твёрдосплавным наконечником)
# Extends forward to Y=-1.16!
bpy.ops.mesh.primitive_cone_add(radius1=0.07, radius2=0.02, depth=0.48, location=(-0.065, -0.88, 1.24))
d_bit = bpy.context.active_object
d_bit.rotation_euler = (math.radians(-90), 0, 0)
d_bit.data.materials.append(steel_mat)

# Spiral Flutes (3 helical rings around bit)
spiral_rings = []
for i in range(4):
    y_pos = -0.72 - i * 0.09
    r_pos = 0.065 - i * 0.009
    bpy.ops.mesh.primitive_torus_add(major_radius=r_pos, minor_radius=0.015, location=(-0.065, y_pos, 1.24))
    ring = bpy.context.active_object
    ring.rotation_euler = (math.radians(72), math.radians(25), 0)
    ring.data.materials.append(steel_mat)
    spiral_rings.append(ring)

# Carbide Cross Tip at Y=-1.13
bpy.ops.mesh.primitive_cube_add(size=0.035, location=(-0.065, -1.13, 1.24))
d_tip = bpy.context.active_object
d_tip.scale = (1.4, 0.4, 1.4)
d_tip.data.materials.append(brass_mat)

bpy.ops.object.select_all(action='DESELECT')
for p in [d_body, d_vent, d_h1, d_h2, d_chuck, d_bit, d_tip] + spiral_rings: p.select_set(True)
bpy.context.view_layer.objects.active = d_body
bpy.ops.object.join()
drill_obj = bpy.context.active_object
drill_obj.name = 'Vasiliy_Drill'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -----------------
# C. КУСТАРНЫЙ ПЛАЗМОМЁТ (Vasiliy_Plasma)
# -----------------
# Heavy Reinforced Frame
bpy.ops.mesh.primitive_cube_add(size=0.15, location=(-0.07, -0.42, 1.24))
p_frame = bpy.context.active_object
p_frame.scale = (0.9, 2.0, 1.1)
p_frame.data.materials.append(steel_mat)

# Rear Battery Housing with High-Voltage warning
bpy.ops.mesh.primitive_cube_add(size=0.12, location=(-0.08, -0.26, 1.26))
p_bat = bpy.context.active_object
p_bat.scale = (0.8, 1.5, 1.2)
p_bat.data.materials.append(steel_mat)

# Glowing Plasma Reaction Chamber Core (Glass/Energy chamber)
bpy.ops.mesh.primitive_cylinder_add(radius=0.052, depth=0.24, location=(-0.065, -0.52, 1.25))
p_core = bpy.context.active_object
p_core.rotation_euler = (math.radians(90), 0, 0)
p_core.data.materials.append(glow_plasma_mat)

# Quad Magnetic Accelerator Rails (4 copper rails extending forward to Y=-1.12)
rails = []
rail_offsets = [(-0.035, 0.035), (0.035, 0.035), (-0.035, -0.035), (0.035, -0.035)]
for dx, dz in rail_offsets:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.48, location=(-0.065 + dx, -0.84, 1.24 + dz))
    r = bpy.context.active_object
    r.rotation_euler = (math.radians(90), 0, 0)
    r.data.materials.append(brass_mat)
    rails.append(r)

# Ceramic Ring Insulators along rails
insulators = []
for y_pos in [-0.70, -0.88, -1.04]:
    bpy.ops.mesh.primitive_torus_add(major_radius=0.055, minor_radius=0.012, location=(-0.065, y_pos, 1.24))
    ins = bpy.context.active_object
    ins.rotation_euler = (math.radians(90), 0, 0)
    ins.data.materials.append(steel_mat)
    insulators.append(ins)

# Twin Emitter Discharge Prongs at tip Y=-1.10
bpy.ops.mesh.primitive_cone_add(radius1=0.025, radius2=0.005, depth=0.08, location=(-0.065, -1.10, 1.24))
p_tip = bpy.context.active_object
p_tip.rotation_euler = (math.radians(-90), 0, 0)
p_tip.data.materials.append(glow_plasma_mat)

bpy.ops.object.select_all(action='DESELECT')
for p in [p_frame, p_bat, p_core, p_tip] + rails + insulators: p.select_set(True)
bpy.context.view_layer.objects.active = p_frame
bpy.ops.object.join()
plasma_obj = bpy.context.active_object
plasma_obj.name = 'Vasiliy_Plasma'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -----------------
# 6. Armature Rig & Clean Parenting
# -----------------
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
weapon_socket.head = (-0.07, -0.36, 1.22)
weapon_socket.tail = (-0.07, -0.76, 1.22)
weapon_socket.parent = chest

bpy.ops.object.mode_set(mode='OBJECT')

for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'

# Armature modifier for Body
mod = model.modifiers.new(name='Armature', type='ARMATURE')
mod.object = rig
model.parent = rig

# Bone parent all 3 weapons to Weapon_Socket keeping world transforms!
for w_obj in [shotgun_obj, drill_obj, plasma_obj]:
    bpy.ops.object.select_all(action='DESELECT')
    w_obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    rig.data.bones.active = rig.data.bones['Weapon_Socket']
    bpy.ops.object.parent_set(type='BONE')
    bpy.ops.object.mode_set(mode='OBJECT')

# 7. Skinning Weights
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
        vg_chest.add([v.index], 1.0, 'REPLACE')
    else:
        vg_head.add([v.index], 1.0, 'REPLACE')

# 8. 16-Frame Walking Animation
rig.animation_data_create()
action = bpy.data.actions.new(name='Vasiliy_Walk')
rig.animation_data.action = action

bpy.ops.object.mode_set(mode='POSE')
for frame in range(1, 17):
    phase = ((frame - 1) / 16.0) * math.pi * 2.0
    
    leg_l_angle = math.sin(phase) * 0.42
    knee_l_bend = max(0.0, -math.sin(phase)) * 0.48
    rig.pose.bones['Thigh.L'].rotation_euler = (leg_l_angle, 0, 0)
    rig.pose.bones['Shin.L'].rotation_euler = (-knee_l_bend, 0, 0)
    
    leg_r_angle = -math.sin(phase) * 0.42
    knee_r_bend = max(0.0, math.sin(phase)) * 0.48
    rig.pose.bones['Thigh.R'].rotation_euler = (leg_r_angle, 0, 0)
    rig.pose.bones['Shin.R'].rotation_euler = (-knee_r_bend, 0, 0)
    
    rig.pose.bones['Pelvis'].location = (0, 0, -abs(math.sin(phase * 2)) * 0.02)
    rig.pose.bones['Chest'].rotation_euler = (0, 0, math.sin(phase) * 0.025)
    
    for b in rig.pose.bones:
        b.keyframe_insert(data_path='rotation_euler', frame=frame)
        b.keyframe_insert(data_path='location', frame=frame)

bpy.ops.object.mode_set(mode='OBJECT')

# Save Master Blend
bpy.ops.wm.save_as_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')
print('SAVED MASTER BLEND WITH ALL 3 DETAILED WEAPONS!')

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
print('EXPORTED VASILIY.GLB WITH ALL 3 WEAPONS!')
