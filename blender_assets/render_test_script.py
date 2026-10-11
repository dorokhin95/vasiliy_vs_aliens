import bpy
import math

# Clear default objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import generated GLB
bpy.ops.import_scene.gltf(filepath='c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_generated.glb')
model = bpy.data.objects['model']

# Get bounding box to find center and height
bbox = model.bound_box
min_z = min(v[2] for v in bbox)
max_z = max(v[2] for v in bbox)
center_z = (min_z + max_z) / 2.0
height = max_z - min_z

# Add Target Empty at center
target = bpy.data.objects.new('CamTarget', None)
target.location = (0, 0, center_z)
bpy.context.collection.objects.link(target)

# Add Camera with Track To Constraint
cam_data = bpy.data.cameras.new('IsoCam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = height * 1.3
cam = bpy.data.objects.new('IsoCam', cam_data)
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

# Add Track To constraint
tt = cam.constraints.new(type='TRACK_TO')
tt.target = target
tt.track_axis = 'TRACK_NEGATIVE_Z'
tt.up_axis = 'UP_Y'

# Function to position camera at angle around Vasily
def set_camera_angle(angle_deg):
    cam_dist = 6.0
    pitch = math.radians(25) # 25 deg downward angle
    rad = math.radians(angle_deg)
    cam.location = (
        cam_dist * math.sin(rad) * math.cos(pitch),
        -cam_dist * math.cos(rad) * math.cos(pitch),
        center_z + cam_dist * math.sin(pitch)
    )
    bpy.context.view_layer.update()

# Add 3-point Lights
# Key Sun (Front-right)
key_light = bpy.data.objects.new('KeySun', bpy.data.lights.new('KeySun', 'SUN'))
key_light.data.energy = 4.0
key_light.rotation_euler = (math.radians(45), math.radians(30), math.radians(-30))
bpy.context.collection.objects.link(key_light)

# Fill Sun (Back-left)
fill_light = bpy.data.objects.new('FillSun', bpy.data.lights.new('FillSun', 'SUN'))
fill_light.data.energy = 2.5
fill_light.rotation_euler = (math.radians(45), math.radians(-30), math.radians(150))
bpy.context.collection.objects.link(fill_light)

# Render settings
bpy.context.scene.render.resolution_x = 256
bpy.context.scene.render.resolution_y = 256
bpy.context.scene.render.film_transparent = True

# 1. Front view (angle = 0: camera in front of character)
set_camera_angle(0)
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_3d_front.png'
bpy.ops.render.render(write_still=True)

# 2. Back view (angle = 180: camera behind character)
set_camera_angle(180)
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_3d_back.png'
bpy.ops.render.render(write_still=True)

# 3. Side Right view (angle = 90: camera to the right of character)
set_camera_angle(90)
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_3d_side.png'
bpy.ops.render.render(write_still=True)

# 4. Side Left view (angle = 270: camera to the left of character)
set_camera_angle(270)
bpy.context.scene.render.filepath = 'c:/Users/Павел/Desktop/game_dev/vasiliy_vs_aliens/blender_assets/vasiliy_3d_side_left.png'
bpy.ops.render.render(write_still=True)

print('TRACK-TO RENDERS COMPLETE!')
