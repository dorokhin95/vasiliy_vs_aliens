import bpy
import math
from mathutils import Vector

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Import T-pose model
bpy.ops.import_scene.gltf(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_tpose.glb')
model = bpy.data.objects['model']
model.name = 'Vasiliy_Body'

# Align feet with ground (Z=0)
min_z = min(v.co.z for v in model.data.vertices)
model.location.z = -min_z
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Materials setup: enhance textures & colors
if model.material_slots:
    mat = model.material_slots[0].material
    if mat and mat.node_tree:
        for n in mat.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Roughness'].default_value = 0.8
                n.inputs['Metallic'].default_value = 0.0

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
head.tail = (0, 0, 1.90)
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
foot_l.tail = (0.16, -0.20, 0)
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
foot_r.tail = (-0.16, -0.20, 0)
foot_r.parent = shin_r

# Left Arm (T-pose points towards +X)
up_arm_l = eb.new('UpperArm.L')
up_arm_l.head = (0.22, 0, 1.40)
up_arm_l.tail = (0.52, 0, 1.38)
up_arm_l.parent = chest

fore_arm_l = eb.new('Forearm.L')
fore_arm_l.head = (0.52, 0, 1.38)
fore_arm_l.tail = (0.76, 0, 1.36)
fore_arm_l.parent = up_arm_l

hand_l = eb.new('Hand.L')
hand_l.head = (0.76, 0, 1.36)
hand_l.tail = (0.94, 0, 1.35)
hand_l.parent = fore_arm_l

# Right Arm (T-pose points towards -X)
up_arm_r = eb.new('UpperArm.R')
up_arm_r.head = (-0.22, 0, 1.40)
up_arm_r.tail = (-0.52, 0, 1.38)
up_arm_r.parent = chest

fore_arm_r = eb.new('Forearm.R')
fore_arm_r.head = (-0.52, 0, 1.38)
fore_arm_r.tail = (-0.76, 0, 1.36)
fore_arm_r.parent = up_arm_r

hand_r = eb.new('Hand.R')
hand_r.head = (-0.76, 0, 1.36)
hand_r.tail = (-0.94, 0, 1.35)
hand_r.parent = fore_arm_r

# Weapon Socket Bone attached to chest, pointing straight forward (-Y)
weapon_socket = eb.new('Weapon_Socket')
weapon_socket.head = (-0.06, -0.25, 1.28)
weapon_socket.tail = (-0.06, -0.65, 1.28)
weapon_socket.parent = chest

bpy.ops.object.mode_set(mode='OBJECT')

# Armature modifier
mod = model.modifiers.new(name='Armature', type='ARMATURE')
mod.object = rig
model.parent = rig

# 3. Clean Proximity Skinning with tight isolation
model.vertex_groups.clear()
deform_bones = [b for b in rig.data.bones if b.name not in ['Root', 'Weapon_Socket']]
bone_segs = {}
for b in deform_bones:
    vg = model.vertex_groups.new(name=b.name)
    bone_segs[b.name] = (b.head_local, b.tail_local, vg)

def dist_to_segment(p, a, b):
    ab = b - a
    t = (p - a).dot(ab) / (ab.dot(ab) + 1e-8)
    t = max(0.0, min(1.0, t))
    closest = a + ab * t
    return (p - closest).length

for v in model.data.vertices:
    p = v.co
    dists = []
    for name, (head_pos, tail_pos, vg) in bone_segs.items():
        d = dist_to_segment(p, head_pos, tail_pos)
        # Strong side penalties
        if name.endswith('.L') and p.x < -0.05:
            d += 2.0
        elif name.endswith('.R') and p.x > 0.05:
            d += 2.0
        # Arm vertices (abs(x) > 0.25) ignore torso bones
        if abs(p.x) > 0.25 and name in ['Spine', 'Pelvis', 'Chest']:
            d += (abs(p.x) - 0.25) * 4.0
        # Torso vertices (abs(x) < 0.22) ignore arm bones completely
        if abs(p.x) < 0.22 and ('Arm' in name or 'Hand' in name):
            d += 4.0
        # Leg isolation
        if p.z < 0.90 and ('Spine' in name or 'Chest' in name or 'Head' in name or 'Arm' in name):
            d += 3.0
        if p.z > 1.05 and ('Thigh' in name or 'Shin' in name or 'Foot' in name):
            d += 3.0
        dists.append((name, d, vg))
    
    dists.sort(key=lambda x: x[1])
    top = dists[:3]
    weights = [1.0 / (d[1]**2 + 0.002) for d in top]
    tot = sum(weights)
    for i, (name, d, vg) in enumerate(top):
        w = weights[i] / tot
        if w > 0.01:
            vg.add([v.index], w, 'REPLACE')

print('SKINNING COMPLETE!')

# 4. Create Double-barrel Shotgun Mesh with correct local alignment
shotgun_mat = bpy.data.materials.new(name='Shotgun_Metal')
shotgun_mat.use_nodes = True
bsdf = shotgun_mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.18, 0.20, 0.22, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.9
    bsdf.inputs['Roughness'].default_value = 0.3

wood_mat = bpy.data.materials.new(name='Shotgun_Wood')
wood_mat.use_nodes = True
bsdf_w = wood_mat.node_tree.nodes.get('Principled BSDF')
if bsdf_w:
    bsdf_w.inputs['Base Color'].default_value = (0.28, 0.12, 0.04, 1.0)
    bsdf_w.inputs['Roughness'].default_value = 0.65

# Build gun with origin at Grip (0,0,0)
# Barrels point along -Y
bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.55, location=(-0.03, -0.28, 0.04))
b1 = bpy.context.active_object
b1.rotation_euler = (math.radians(90), 0, 0)
b1.data.materials.append(shotgun_mat)

bpy.ops.mesh.primitive_cylinder_add(radius=0.026, depth=0.55, location=(0.03, -0.28, 0.04))
b2 = bpy.context.active_object
b2.rotation_euler = (math.radians(90), 0, 0)
b2.data.materials.append(shotgun_mat)

# Receiver / Grip (at 0,0,0)
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(0, 0, 0))
grip = bpy.context.active_object
grip.scale = (0.6, 1.2, 0.9)
grip.data.materials.append(wood_mat)

# Stock (extends behind grip: +Y)
bpy.ops.mesh.primitive_cube_add(size=0.1, location=(0, 0.18, -0.02))
stock = bpy.context.active_object
stock.scale = (0.5, 1.8, 1.0)
stock.rotation_euler = (math.radians(-8), 0, 0)
stock.data.materials.append(wood_mat)

# Fore-end (under barrels: -Y)
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

# Apply transforms so origin is at grip
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Attach gun to Weapon_Socket bone
gun.parent = rig
gun.parent_type = 'BONE'
gun.parent_bone = 'Weapon_Socket'
gun.matrix_parent_inverse.identity()
gun.location = (0, 0, 0)
gun.rotation_euler = (0, 0, 0)

# 5. Pose Mode: Two-Handed Combat Grip & True Walking Animations
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
for b in rig.pose.bones:
    b.rotation_mode = 'XYZ'

# Precision two-handed grip on the shotgun at chest level
def apply_combat_arms():
    # Right arm: holds the pistol grip at (-0.06, -0.25, 1.28)
    rig.pose.bones['UpperArm.R'].rotation_euler = (math.radians(-32), math.radians(10), math.radians(66))
    rig.pose.bones['Forearm.R'].rotation_euler = (math.radians(-24), math.radians(22), math.radians(38))
    rig.pose.bones['Hand.R'].rotation_euler = (math.radians(12), 0, math.radians(12))

    # Left arm: reaches forward and across to support fore-end at (-0.04, -0.42, 1.28)
    rig.pose.bones['UpperArm.L'].rotation_euler = (math.radians(-38), math.radians(-14), math.radians(-62))
    rig.pose.bones['Forearm.L'].rotation_euler = (math.radians(-24), math.radians(-28), math.radians(-44))
    rig.pose.bones['Hand.L'].rotation_euler = (math.radians(-8), 0, math.radians(-12))

# -----------------
# Action: Vasiliy_Walk (16 frames)
# Frame 1: Grounded combat idle stance (both feet parallel and planted)
# Frames 2-16: True alternating leg walking strides
# -----------------
walk_action = bpy.data.actions.new('Vasiliy_Walk')
walk_action.use_fake_user = True
rig.animation_data_create()
rig.animation_data.action = walk_action

TOTAL_FRAMES = 16
for frame in range(1, TOTAL_FRAMES + 1):
    bpy.context.scene.frame_set(frame)
    phase = ((frame - 1) / TOTAL_FRAMES) * 2 * math.pi
    
    apply_combat_arms()
    
    # Left leg stride
    leg_l_angle = math.sin(phase) * 0.42
    knee_l_bend = max(0.0, -math.sin(phase)) * 0.50
    rig.pose.bones['Thigh.L'].rotation_euler = (leg_l_angle, 0, 0)
    rig.pose.bones['Shin.L'].rotation_euler = (-knee_l_bend, 0, 0)
    
    # Right leg stride (opposite phase)
    leg_r_angle = -math.sin(phase) * 0.42
    knee_r_bend = max(0.0, math.sin(phase)) * 0.50
    rig.pose.bones['Thigh.R'].rotation_euler = (leg_r_angle, 0, 0)
    rig.pose.bones['Shin.R'].rotation_euler = (-knee_r_bend, 0, 0)
    
    # Subtle pelvis step bounce & chest counter-rotation
    rig.pose.bones['Pelvis'].location = (0, 0, -abs(math.sin(phase * 2)) * 0.025)
    rig.pose.bones['Chest'].rotation_euler = (math.radians(3), 0, math.sin(phase) * 0.04)
    
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
print('EXPORTED FINAL VASILIY.GLB TO GAME ASSETS!')
