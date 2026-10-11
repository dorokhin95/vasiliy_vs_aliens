import bpy
import math

bpy.ops.wm.open_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')

# Remove old body
old = bpy.data.objects.get('Vasiliy_Body')
if old:
    bpy.data.objects.remove(old, do_unlink=True)

# Import new model
bpy.ops.import_scene.gltf(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_generated.glb')
model = bpy.data.objects['model']
model.name = 'Vasiliy_Body'
rig = bpy.data.objects['Vasiliy_Rig']

# Rotate 180 deg around Z to face -Y, shift Z up by 1.1m
model.rotation_euler = (0, 0, math.radians(180))
model.location = (0, 0, 1.1)
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Parent with ARMATURE_AUTO
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

# Print vertex group sizes
print('--- VERTEX GROUPS RESULT ---')
for vg in model.vertex_groups:
    count = len([v for v in model.data.vertices if any(g.group == vg.index for g in v.groups)])
    print(f'{vg.name}: {count} vertices')
