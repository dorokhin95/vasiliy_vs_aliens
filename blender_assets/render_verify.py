import bpy
import math

bpy.ops.wm.open_mainfile(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_character_master.blend')

# Setup clean Studio 3-Point Lighting
world = bpy.context.scene.world
if not world:
    world = bpy.data.worlds.new('World')
    bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Color'].default_value = (0.05, 0.05, 0.07, 1.0)
    bg.inputs['Strength'].default_value = 1.0

# Key Light
key_l = bpy.data.lights.new('KeyLight', type='SUN')
key_l.energy = 4.0
key_obj = bpy.data.objects.new('KeyLight', key_l)
bpy.context.scene.collection.objects.link(key_obj)
key_obj.location = (2, -4, 4)
key_obj.rotation_euler = (math.radians(50), 0, math.radians(25))

# Fill Light
fill_l = bpy.data.lights.new('FillLight', type='SUN')
fill_l.energy = 1.8
fill_l.color = (0.7, 0.8, 1.0)
fill_obj = bpy.data.objects.new('FillLight', fill_l)
bpy.context.scene.collection.objects.link(fill_obj)
fill_obj.location = (-3, -3, 2)
fill_obj.rotation_euler = (math.radians(40), 0, math.radians(-35))

# Cam setup
cam_data = bpy.data.cameras.new('RenderCam')
cam_obj = bpy.data.objects.new('RenderCam', cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

bpy.context.scene.render.resolution_x = 320
bpy.context.scene.render.resolution_y = 320
bpy.context.scene.render.film_transparent = True

rig = bpy.data.objects['Vasiliy_Rig']

rig.animation_data.action = bpy.data.actions['Vasiliy_Walk']
bpy.context.scene.frame_set(1)

cam_obj.location = (0, -3.2, 1.25)
cam_obj.rotation_euler = (math.radians(90), 0, 0)
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/render_idle_front.png'
bpy.ops.render.render(write_still=True)

# 2. Render IDLE 2.5D game angle view (pitch 28 deg / 62 deg elevation, 45 deg yaw)
cam_obj.location = (1.8, -2.8, 2.5)
cam_obj.rotation_euler = (math.radians(55), 0, math.radians(30))
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/render_idle_isometric.png'
bpy.ops.render.render(write_still=True)

# 3. Render WALK cycle (stride frame 5) in game angle
bpy.context.scene.frame_set(5)
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/render_walk_stride.png'
bpy.ops.render.render(write_still=True)

print('ALL 3 VERIFICATION RENDERS COMPLETE!')
