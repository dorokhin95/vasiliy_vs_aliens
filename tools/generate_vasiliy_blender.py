import bpy
import math
import os

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_material(name, color, roughness=0.8):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
    return mat

def build_vasiliy():
    clear_scene()

    # Materials
    mat_fufayka = create_material("Mat_Fufayka", (0.28, 0.32, 0.22, 1.0))   # Khaki/quilted jacket
    mat_pants = create_material("Mat_Pants", (0.15, 0.16, 0.15, 1.0))       # Dark quilted pants
    mat_boots = create_material("Mat_Boots", (0.20, 0.17, 0.14, 1.0))       # Dirty leather boots
    mat_hat = create_material("Mat_Hat", (0.22, 0.22, 0.24, 1.0))           # Grey fur ushanka
    mat_face = create_material("Mat_Face", (0.76, 0.52, 0.42, 1.0))         # Weathered skin
    mat_star = create_material("Mat_Star", (0.80, 0.12, 0.12, 1.0))         # Soviet red star
    mat_wood = create_material("Mat_Wood", (0.35, 0.20, 0.12, 1.0))         # Shotgun stock
    mat_metal = create_material("Mat_Metal", (0.12, 0.13, 0.14, 1.0), roughness=0.3) # Shotgun barrels
    mat_bag = create_material("Mat_Bag", (0.42, 0.38, 0.26, 1.0))           # Canvas bag

    # --- Mesh Parts ---
    parts = []

    # 1. Torso (Fufayka)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.25))
    torso = bpy.context.active_object
    torso.name = "Vasiliy_Torso"
    torso.scale = (0.55, 0.38, 0.65)
    bpy.ops.object.transform_apply(scale=True)
    torso.data.materials.append(mat_fufayka)
    parts.append(torso)

    # 2. Scarf / Collar
    bpy.ops.mesh.primitive_torus_add(major_radius=0.28, minor_radius=0.1, location=(0, 0, 1.62))
    scarf = bpy.context.active_object
    scarf.name = "Vasiliy_Scarf"
    scarf.scale = (1.0, 0.85, 0.8)
    bpy.ops.object.transform_apply(scale=True)
    scarf.data.materials.append(mat_bag)
    parts.append(scarf)

    # 3. Head & Ushanka
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.85))
    head = bpy.context.active_object
    head.name = "Vasiliy_Head"
    head.scale = (0.32, 0.32, 0.35)
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials.append(mat_face)
    parts.append(head)

    # Ushanka crown
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 2.05))
    hat_crown = bpy.context.active_object
    hat_crown.name = "Vasiliy_HatCrown"
    hat_crown.scale = (0.38, 0.38, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    hat_crown.data.materials.append(mat_hat)
    parts.append(hat_crown)

    # Ushanka front flap
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.18, 1.98))
    hat_front = bpy.context.active_object
    hat_front.name = "Vasiliy_HatFront"
    hat_front.scale = (0.34, 0.08, 0.16)
    bpy.ops.object.transform_apply(scale=True)
    hat_front.data.materials.append(mat_hat)
    parts.append(hat_front)

    # Red star on hat
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.03, location=(0, -0.22, 1.98))
    star = bpy.context.active_object
    star.name = "Vasiliy_HatStar"
    star.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    star.data.materials.append(mat_star)
    parts.append(star)

    # Ushanka ear flaps (Left & Right)
    for side, sign in [("L", 1), ("R", -1)]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.2, 0, 1.82))
        ear = bpy.context.active_object
        ear.name = f"Vasiliy_HatEar_{side}"
        ear.scale = (0.07, 0.32, 0.26)
        bpy.ops.object.transform_apply(scale=True)
        ear.data.materials.append(mat_hat)
        parts.append(ear)

    # 4. Canvas Bag across shoulder
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.32, 0.1, 1.05))
    bag = bpy.context.active_object
    bag.name = "Vasiliy_Bag"
    bag.scale = (0.16, 0.32, 0.35)
    bag.rotation_euler = (0, math.radians(12), math.radians(-10))
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    bag.data.materials.append(mat_bag)
    parts.append(bag)

    # 5. Arms & Hands
    for side, sign in [("L", 1), ("R", -1)]:
        # Upper arm
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.36, 0, 1.38))
        arm = bpy.context.active_object
        arm.name = f"Vasiliy_Arm_{side}"
        arm.scale = (0.18, 0.22, 0.34)
        bpy.ops.object.transform_apply(scale=True)
        arm.data.materials.append(mat_fufayka)
        parts.append(arm)

        # Forearm
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.36, -0.12, 1.15))
        forearm = bpy.context.active_object
        forearm.name = f"Vasiliy_Forearm_{side}"
        forearm.scale = (0.16, 0.20, 0.32)
        bpy.ops.object.transform_apply(scale=True)
        forearm.data.materials.append(mat_fufayka)
        parts.append(forearm)

        # Hand
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.34, -0.25, 1.05))
        hand = bpy.context.active_object
        hand.name = f"Vasiliy_Hand_{side}"
        hand.scale = (0.14, 0.14, 0.14)
        bpy.ops.object.transform_apply(scale=True)
        hand.data.materials.append(mat_face)
        parts.append(hand)

    # 6. Legs & Boots
    for side, sign in [("L", 1), ("R", -1)]:
        # Thigh / Pants
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.16, 0, 0.72))
        leg = bpy.context.active_object
        leg.name = f"Vasiliy_Leg_{side}"
        leg.scale = (0.22, 0.24, 0.45)
        bpy.ops.object.transform_apply(scale=True)
        leg.data.materials.append(mat_pants)
        parts.append(leg)

        # Boot
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.16, -0.05, 0.24))
        boot = bpy.context.active_object
        boot.name = f"Vasiliy_Boot_{side}"
        boot.scale = (0.24, 0.36, 0.38)
        bpy.ops.object.transform_apply(scale=True)
        boot.data.materials.append(mat_boots)
        parts.append(boot)

    # 7. Modular Weapon: Sawed-Off Shotgun (Обрез)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.1, -0.38, 1.12))
    stock = bpy.context.active_object
    stock.name = "Weapon_Stock"
    stock.scale = (0.08, 0.30, 0.12)
    bpy.ops.object.transform_apply(scale=True)
    stock.data.materials.append(mat_wood)

    # Barrels
    for b_offset in [-0.03, 0.03]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.032, depth=0.48, location=(-0.1 + b_offset, -0.62, 1.14))
        barrel = bpy.context.active_object
        barrel.name = f"Weapon_Barrel_{b_offset}"
        barrel.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        barrel.data.materials.append(mat_metal)

    # --- Join Vasiliy Body Mesh ---
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = torso
    bpy.ops.object.join()
    body_mesh = bpy.context.active_object
    body_mesh.name = "Vasiliy_Body"

    # Join weapon as separate modular object
    bpy.ops.object.select_all(action='DESELECT')
    stock.select_set(True)
    for b in bpy.data.objects:
        if "Weapon_Barrel" in b.name:
            b.select_set(True)
    bpy.context.view_layer.objects.active = stock
    bpy.ops.object.join()
    weapon_mesh = bpy.context.active_object
    weapon_mesh.name = "Vasiliy_Weapon_Shotgun"

    print("Vasiliy body and weapon generated successfully!")
    return body_mesh, weapon_mesh

def create_armature(body_mesh, weapon_mesh):
    bpy.ops.object.armature_add(location=(0, 0, 0))
    armature_obj = bpy.context.active_object
    armature_obj.name = "Vasiliy_Armature"
    armature = armature_obj.data
    armature.name = "Vasiliy_Skeleton"

    bpy.ops.object.mode_set(mode='EDIT')
    ebones = armature.edit_bones

    # Root
    root = ebones['Bone']
    root.name = "Root"
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.3)

    # Hips & Spine
    hips = ebones.new("Hips")
    hips.parent = root
    hips.head = (0, 0, 0.95)
    hips.tail = (0, 0, 1.25)

    chest = ebones.new("Chest")
    chest.parent = hips
    chest.head = (0, 0, 1.25)
    chest.tail = (0, 0, 1.65)

    head_bone = ebones.new("Head")
    head_bone.parent = chest
    head_bone.head = (0, 0, 1.65)
    head_bone.tail = (0, 0, 2.15)

    # Arms
    for side, sign in [("L", 1), ("R", -1)]:
        arm = ebones.new(f"Arm.{side}")
        arm.parent = chest
        arm.head = (sign * 0.28, 0, 1.55)
        arm.tail = (sign * 0.38, -0.05, 1.25)

        forearm = ebones.new(f"Forearm.{side}")
        forearm.parent = arm
        forearm.head = (sign * 0.38, -0.05, 1.25)
        forearm.tail = (sign * 0.32, -0.25, 1.05)

        hand = ebones.new(f"Hand.{side}")
        hand.parent = forearm
        hand.head = (sign * 0.32, -0.25, 1.05)
        hand.tail = (sign * 0.28, -0.35, 1.05)

    # Weapon socket bone
    weapon_socket = ebones.new("Weapon_Socket")
    weapon_socket.parent = ebones["Hand.R"]
    weapon_socket.head = (-0.28, -0.35, 1.05)
    weapon_socket.tail = (-0.1, -0.55, 1.1)

    # Legs
    for side, sign in [("L", 1), ("R", -1)]:
        thigh = ebones.new(f"Thigh.{side}")
        thigh.parent = hips
        thigh.head = (sign * 0.16, 0, 0.95)
        thigh.tail = (sign * 0.16, 0, 0.50)

        calf = ebones.new(f"Calf.{side}")
        calf.parent = thigh
        calf.head = (sign * 0.16, 0, 0.50)
        calf.tail = (sign * 0.16, 0, 0.15)

        foot = ebones.new(f"Foot.{side}")
        foot.parent = calf
        foot.head = (sign * 0.16, 0, 0.15)
        foot.tail = (sign * 0.16, -0.25, 0.0)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent Body Mesh with Automatic Weights
    bpy.ops.object.select_all(action='DESELECT')
    body_mesh.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Parent Weapon to Weapon_Socket Bone
    bpy.ops.object.select_all(action='DESELECT')
    weapon_mesh.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.parent_set(type='BONE')
    # Assign to socket bone
    weapon_mesh.parent_bone = "Weapon_Socket"

    print("Armature and rigging completed!")
    return armature_obj

def setup_camera_and_lighting():
    # 2.5D Isometric Top-Down Camera
    bpy.ops.object.camera_add(location=(0, -4.5, 3.8))
    cam = bpy.context.active_object
    cam.name = "Vasiliy_Render_Cam"
    # Pitch down ~42 degrees for 2.5D Top-Down Action style
    cam.rotation_euler = (math.radians(52), 0, 0)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 3.2
    bpy.context.scene.camera = cam

    # Sun Light (Stylized game lighting)
    bpy.ops.object.light_add(type='SUN', location=(3, -3, 6))
    sun = bpy.context.active_object
    sun.data.energy = 4.0
    sun.rotation_euler = (math.radians(45), math.radians(20), math.radians(-30))

    # Fill Light
    bpy.ops.object.light_add(type='SUN', location=(-3, 3, 4))
    fill = bpy.context.active_object
    fill.data.energy = 1.8
    fill.data.color = (0.7, 0.85, 1.0) # Cold ambient fill
    fill.rotation_euler = (math.radians(-45), math.radians(-20), math.radians(150))

    # Transparent Background
    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.resolution_x = 256
    bpy.context.scene.render.resolution_y = 256

def create_walk_animation(armature_obj):
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.mode_set(mode='POSE')

    # Ensure animation data
    if not armature_obj.animation_data:
        armature_obj.animation_data_create()

    action = bpy.data.actions.new(name="Walk")
    armature_obj.animation_data.action = action

    pbones = armature_obj.pose.bones
    thigh_l = pbones.get("Thigh.L")
    thigh_r = pbones.get("Thigh.R")
    calf_l = pbones.get("Calf.L")
    calf_r = pbones.get("Calf.R")
    hips = pbones.get("Hips")
    chest = pbones.get("Chest")

    frames = [1, 5, 9, 13, 17] # 16 frame loop
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 16

    # Cycle keyframes
    # Frame 1: Left leg forward, Right leg back
    bpy.context.scene.frame_set(1)
    thigh_l.rotation_mode = 'XYZ'
    thigh_r.rotation_mode = 'XYZ'
    thigh_l.rotation_euler = (math.radians(-25), 0, 0)
    thigh_r.rotation_euler = (math.radians(25), 0, 0)
    hips.location = (0, 0, 0)
    thigh_l.keyframe_insert(data_path="rotation_euler", frame=1)
    thigh_r.keyframe_insert(data_path="rotation_euler", frame=1)
    hips.keyframe_insert(data_path="location", frame=1)

    # Frame 5: Passing position (Legs straight, hips slightly up)
    bpy.context.scene.frame_set(5)
    thigh_l.rotation_euler = (math.radians(0), 0, 0)
    thigh_r.rotation_euler = (math.radians(0), 0, 0)
    hips.location = (0, 0, 0.04)
    thigh_l.keyframe_insert(data_path="rotation_euler", frame=5)
    thigh_r.keyframe_insert(data_path="rotation_euler", frame=5)
    hips.keyframe_insert(data_path="location", frame=5)

    # Frame 9: Right leg forward, Left leg back
    bpy.context.scene.frame_set(9)
    thigh_l.rotation_euler = (math.radians(25), 0, 0)
    thigh_r.rotation_euler = (math.radians(-25), 0, 0)
    hips.location = (0, 0, 0)
    thigh_l.keyframe_insert(data_path="rotation_euler", frame=9)
    thigh_r.keyframe_insert(data_path="rotation_euler", frame=9)
    hips.keyframe_insert(data_path="location", frame=9)

    # Frame 13: Passing position
    bpy.context.scene.frame_set(13)
    thigh_l.rotation_euler = (math.radians(0), 0, 0)
    thigh_r.rotation_euler = (math.radians(0), 0, 0)
    hips.location = (0, 0, 0.04)
    thigh_l.keyframe_insert(data_path="rotation_euler", frame=13)
    thigh_r.keyframe_insert(data_path="rotation_euler", frame=13)
    hips.keyframe_insert(data_path="location", frame=13)

    # Frame 17 (Same as 1 for loop)
    bpy.context.scene.frame_set(17)
    thigh_l.rotation_euler = (math.radians(-25), 0, 0)
    thigh_r.rotation_euler = (math.radians(25), 0, 0)
    hips.location = (0, 0, 0)
    thigh_l.keyframe_insert(data_path="rotation_euler", frame=17)
    thigh_r.keyframe_insert(data_path="rotation_euler", frame=17)
    hips.keyframe_insert(data_path="location", frame=17)

    bpy.ops.object.mode_set(mode='OBJECT')
    print("Walk animation cycle created!")

def render_directional_sprites(armature_obj, output_dir):
    directions = {
        "down": 0,          # Facing camera (S)
        "right": 90,        # Side view right (D)
        "up": 180,          # Facing away (W)
        "left": 270         # Side view left (A)
    }

    frames = [1, 5, 9, 13] # 4 keyframes per walk cycle
    os.makedirs(output_dir, exist_ok=True)

    for dir_name, angle in directions.items():
        # Rotate Root / Model
        armature_obj.rotation_euler = (0, 0, math.radians(angle))
        for f_idx, frame_num in enumerate(frames):
            bpy.context.scene.frame_set(frame_num)
            out_file = os.path.join(output_dir, f"vasiliy_{dir_name}_{f_idx}.png")
            bpy.context.scene.render.filepath = out_file
            bpy.ops.render.render(write_still=True)
            print(f"Rendered: {out_file}")

    # Reset rotation
    armature_obj.rotation_euler = (0, 0, 0)

if __name__ == "__main__":
    body, weapon = build_vasiliy()
    rig = create_armature(body, weapon)
    setup_camera_and_lighting()
    create_walk_animation(rig)

    # Save Blend file
    blend_path = os.path.abspath("blender_assets/vasiliy_character.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Project saved to: {blend_path}")

    # Render Sprites
    sprites_dir = os.path.abspath("assets/sprites/vasiliy_v2")
    render_directional_sprites(rig, sprites_dir)
    print("All sprites rendered successfully!")
