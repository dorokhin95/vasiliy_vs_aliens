import bpy
import math

bpy.ops.wm.open_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')

# Remove old body
for obj in list(bpy.data.objects):
    if 'Body' in obj.name or 'model' in obj.name:
        bpy.data.objects.remove(obj, do_unlink=True)

# Import T-pose model
bpy.ops.import_scene.gltf(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_tpose.glb')
model = bpy.data.objects['model']
model.name = 'Vasiliy_Body'
rig = bpy.data.objects['Vasiliy_Rig']

# Check dimensions
bbox = model.bound_box
min_z = min(v[2] for v in bbox)
max_z = max(v[2] for v in bbox)
h = max_z - min_z
print('T-POSE MODEL HEIGHT:', h, 'MIN_Z:', min_z, 'MAX_Z:', max_z)

# Scale model to 2.0m height and align center
scale_f = 2.0 / h
model.scale = (scale_f, scale_f, scale_f)
# Align feet with ground
model.location = (0, 0, -min_z * scale_f + 0.15)
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Put Rig into Edit mode to align arm bones horizontally for T-pose
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = rig.data.edit_bones

# Right arm (extends towards -X)
eb['UpperArm.R'].head = (-0.22, 0, 1.45)
eb['UpperArm.R'].tail = (-0.52, 0, 1.42)
eb['Forearm.R'].head = (-0.52, 0, 1.42)
eb['Forearm.R'].tail = (-0.78, 0, 1.40)
eb['Hand.R'].head = (-0.78, 0, 1.40)
eb['Hand.R'].tail = (-0.95, 0, 1.38)

# Left arm (extends towards +X)
eb['UpperArm.L'].head = (0.22, 0, 1.45)
eb['UpperArm.L'].tail = (0.52, 0, 1.42)
eb['Forearm.L'].head = (0.52, 0, 1.42)
eb['Forearm.L'].tail = (0.78, 0, 1.40)
eb['Hand.L'].head = (0.78, 0, 1.40)
eb['Hand.L'].tail = (0.95, 0, 1.38)

bpy.ops.object.mode_set(mode='OBJECT')

# Parent model to rig with ARMATURE_AUTO
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

print('--- T-POSE AUTO SKINNING RESULT ---')
for vg in model.vertex_groups:
    count = len([v for v in model.data.vertices if any(g.group == vg.index for g in v.groups)])
    print(f'{vg.name}: {count} vertices')
