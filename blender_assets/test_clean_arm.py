import bpy
import math

bpy.ops.wm.open_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')

rig = bpy.data.objects['Vasiliy_Rig']
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

# Convert EVERY bone to XYZ Euler
for b in rig.pose.bones:
    b.rotation_mode = 'XYZ'

# Let's test rotating UpperArm.R up and forward:
# In rest pose, UpperArm points down.
# Let's rotate it forward by 70 degrees:
rig.pose.bones['UpperArm.R'].rotation_euler = (math.radians(-70), 0, 0)
rig.pose.bones['Forearm.R'].rotation_euler = (math.radians(-40), 0, 0)

rig.pose.bones['UpperArm.L'].rotation_euler = (math.radians(-70), 0, 0)
rig.pose.bones['Forearm.L'].rotation_euler = (math.radians(-40), 0, 0)

bpy.ops.object.mode_set(mode='OBJECT')

# Setup camera
cam = bpy.data.objects.get('Game_Render_Cam')
if cam:
    cam.location = (0, -4.5, 1.3)
    cam.rotation_euler = (math.radians(80), 0, 0)
    cam.data.ortho_scale = 2.6
    bpy.context.scene.camera = cam

bpy.context.scene.render.resolution_x = 256
bpy.context.scene.render.resolution_y = 256
bpy.context.scene.render.film_transparent = True
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/clean_arm_test.png'
bpy.ops.render.render(write_still=True)
print('CLEAN ARM TEST RENDERED!')
