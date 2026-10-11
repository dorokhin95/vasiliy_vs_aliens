import bpy
import math

bpy.ops.wm.open_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')

rig = bpy.data.objects['Vasiliy_Rig']
shotgun = bpy.data.objects['Vasiliy_Weapon_Shotgun']

# In Pose Mode, pose arms to hold shotgun with BOTH hands
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

# Action: Vasiliy_Walk
action = bpy.data.actions.get('Vasiliy_Walk')
rig.animation_data.action = action

# Posing the arms:
# Right arm: holds the stock/trigger
# Left arm: reaches forward to hold the barrel/forend
# In Blender coordinate system: -Y is forward, +Z is up, -X is right arm, +X is left arm
r_upper = rig.pose.bones['UpperArm.R']
r_fore = rig.pose.bones['Forearm.R']
r_hand = rig.pose.bones['Hand.R']

l_upper = rig.pose.bones['UpperArm.L']
l_fore = rig.pose.bones['Forearm.L']
l_hand = rig.pose.bones['Hand.L']

# Set two-handed combat grip across all keyframes
for frame in range(1, 14):
    bpy.context.scene.frame_set(frame)
    # Right arm: elbow bent, hand forward at chest
    r_upper.rotation_euler = (math.radians(-45), math.radians(15), math.radians(-20))
    r_fore.rotation_euler = (math.radians(-50), math.radians(0), math.radians(10))
    r_hand.rotation_euler = (math.radians(10), math.radians(0), math.radians(0))
    
    # Left arm: reaches across to hold the barrel
    l_upper.rotation_euler = (math.radians(-55), math.radians(-25), math.radians(35))
    l_fore.rotation_euler = (math.radians(-65), math.radians(10), math.radians(-25))
    l_hand.rotation_euler = (math.radians(-10), math.radians(15), math.radians(0))
    
    # Insert keyframes
    for b in [r_upper, r_fore, r_hand, l_upper, l_fore, l_hand]:
        b.keyframe_insert(data_path='rotation_euler', frame=frame)

# Save the blend
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.wm.save_as_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')

# Now export the complete animated, rigged model to assets/models/vasiliy.glb!
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
print('EXPORTED ANIMATED SKINNED VASILIY.GLB SUCCESS!')
