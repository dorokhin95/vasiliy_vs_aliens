import bpy
import math

bpy.ops.wm.open_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')

rig = bpy.data.objects['Vasiliy_Rig']
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

# Set all bones to XYZ Euler
for b in rig.pose.bones:
    b.rotation_mode = 'XYZ'

# Pose Right Arm:
# In rest pose, UpperArm points down and slightly outward.
# We rotate it up and forward:
r_upper = rig.pose.bones['UpperArm.R']
r_fore = rig.pose.bones['Forearm.R']
r_hand = rig.pose.bones['Hand.R']

l_upper = rig.pose.bones['UpperArm.L']
l_fore = rig.pose.bones['Forearm.L']
l_hand = rig.pose.bones['Hand.L']

# Right arm: Upper arm rotates forward and slightly inward
# Let's test rotations:
r_upper.rotation_euler = (math.radians(-60), math.radians(20), math.radians(-30))
r_fore.rotation_euler = (math.radians(-70), math.radians(10), math.radians(20))
r_hand.rotation_euler = (math.radians(20), math.radians(0), math.radians(0))

# Left arm: Upper arm reaches forward and across chest
l_upper.rotation_euler = (math.radians(-70), math.radians(-30), math.radians(40))
l_fore.rotation_euler = (math.radians(-80), math.radians(20), math.radians(-30))
l_hand.rotation_euler = (math.radians(-10), math.radians(20), math.radians(0))

bpy.ops.object.mode_set(mode='OBJECT')

# Setup camera to view Vasily full body centered
cam = bpy.data.objects.get('Game_Render_Cam')
if cam:
    cam.location = (0, -4.5, 1.3)
    cam.rotation_euler = (math.radians(80), 0, 0)
    cam.data.ortho_scale = 2.6
    bpy.context.scene.camera = cam

bpy.context.scene.render.resolution_x = 256
bpy.context.scene.render.resolution_y = 256
bpy.context.scene.render.film_transparent = True
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/arm_pose_test.png'
bpy.ops.render.render(write_still=True)
print('RENDERED ARM POSE TEST!')
