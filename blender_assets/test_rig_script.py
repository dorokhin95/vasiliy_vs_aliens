import bpy
import math

# Open master blend
blend_path = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend'
bpy.ops.wm.open_mainfile(filepath=blend_path)

# Delete old blocky body
old_body = bpy.data.objects.get('Vasiliy_Body')
if old_body:
    bpy.data.objects.remove(old_body, do_unlink=True)

# Import new textured GLB
bpy.ops.import_scene.gltf(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_generated.glb')
new_model = bpy.data.objects.get('model')
new_model.name = 'Vasiliy_Body'

rig = bpy.data.objects.get('Vasiliy_Rig')

# Align scale and position
bbox = new_model.bound_box
min_z = min(v[2] for v in bbox)
max_z = max(v[2] for v in bbox)
h = max_z - min_z
scale_factor = 2.05 / h
new_model.scale = (scale_factor, scale_factor, scale_factor)
new_model.location = (0, 0, 0)
bpy.ops.object.select_all(action='DESELECT')
new_model.select_set(True)
bpy.context.view_layer.objects.active = new_model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Bind new model to rig with automatic weights
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

print('SKINNING APPLIED! Vertex groups:', len(new_model.vertex_groups))
