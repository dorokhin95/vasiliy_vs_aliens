import bpy
import bmesh
import math
import os

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_toon_material(name, color_rgba, roughness=0.6):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()

    output = nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = color_rgba
    bsdf.inputs['Roughness'].default_value = roughness
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat

def build_vasiliy_character():
    reset_scene()

    # --- MATERIALS ---
    mat_skin = create_toon_material("M_Skin", (0.82, 0.58, 0.46, 1.0), roughness=0.7)
    mat_ushanka_fur = create_toon_material("M_Fur", (0.28, 0.28, 0.30, 1.0), roughness=0.9)
    mat_ushanka_cloth = create_toon_material("M_HatCloth", (0.20, 0.20, 0.22, 1.0), roughness=0.8)
    mat_star = create_toon_material("M_Star", (0.85, 0.10, 0.10, 1.0), roughness=0.4)
    mat_fufayka = create_toon_material("M_Fufayka", (0.26, 0.32, 0.20, 1.0), roughness=0.85) # Quilted olive khaki
    mat_scarf = create_toon_material("M_Scarf", (0.38, 0.34, 0.28, 1.0), roughness=0.9)
    mat_belt = create_toon_material("M_Belt", (0.16, 0.12, 0.08, 1.0), roughness=0.5)
    mat_pants = create_toon_material("M_Pants", (0.16, 0.18, 0.16, 1.0), roughness=0.9) # Dark quilted trousers
    mat_boots = create_toon_material("M_Boots", (0.12, 0.10, 0.09, 1.0), roughness=0.6) # Black/tar boots
    mat_bag = create_toon_material("M_Bag", (0.45, 0.40, 0.28, 1.0), roughness=0.9)     # Burlap canvas
    mat_wood = create_toon_material("M_Wood", (0.35, 0.18, 0.08, 1.0), roughness=0.5)
    mat_gun_metal = create_toon_material("M_GunMetal", (0.15, 0.16, 0.18, 1.0), roughness=0.3)
    mat_tape = create_toon_material("M_Tape", (0.75, 0.70, 0.58, 1.0), roughness=0.9)

    mesh_objects = []

    # 1. HIPS / PELVIS
    bpy.ops.mesh.primitive_cylinder_add(radius=0.24, depth=0.22, location=(0, 0, 0.95))
    hips = bpy.context.active_object
    hips.name = "Vasiliy_Hips"
    hips.data.materials.append(mat_pants)
    mesh_objects.append(hips)

    # 2. TORSO / FUFAYKA (Padded quilted jacket)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.28))
    torso = bpy.context.active_object
    torso.name = "Vasiliy_Torso"
    torso.scale = (0.54, 0.38, 0.48)
    bpy.ops.object.transform_apply(scale=True)
    torso.data.materials.append(mat_fufayka)
    mesh_objects.append(torso)

    # Belt
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=0.08, location=(0, 0, 1.04))
    belt = bpy.context.active_object
    belt.name = "Vasiliy_Belt"
    belt.data.materials.append(mat_belt)
    mesh_objects.append(belt)

    # Scarf / Thick collar
    bpy.ops.mesh.primitive_torus_add(major_radius=0.24, minor_radius=0.09, location=(0, 0, 1.54))
    scarf = bpy.context.active_object
    scarf.name = "Vasiliy_Scarf"
    scarf.scale = (1.0, 0.85, 0.7)
    bpy.ops.object.transform_apply(scale=True)
    scarf.data.materials.append(mat_scarf)
    mesh_objects.append(scarf)

    # 3. HEAD & FACE
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.20, location=(0, 0, 1.76))
    head = bpy.context.active_object
    head.name = "Vasiliy_Head"
    head.scale = (0.9, 0.95, 1.05)
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials.append(mat_skin)
    mesh_objects.append(head)

    # Nose
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.20, 1.74))
    nose = bpy.context.active_object
    nose.name = "Vasiliy_Nose"
    nose.scale = (0.05, 0.08, 0.08)
    bpy.ops.object.transform_apply(scale=True)
    nose.data.materials.append(mat_skin)
    mesh_objects.append(nose)

    # 4. USHANKA HAT
    # Main crown
    bpy.ops.mesh.primitive_cylinder_add(radius=0.24, depth=0.20, location=(0, 0, 1.88))
    ushanka_top = bpy.context.active_object
    ushanka_top.name = "Vasiliy_UshankaTop"
    ushanka_top.data.materials.append(mat_ushanka_cloth)
    mesh_objects.append(ushanka_top)

    # Front Fur Flap
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.19, 1.85))
    flap_front = bpy.context.active_object
    flap_front.name = "Vasiliy_FlapFront"
    flap_front.scale = (0.24, 0.08, 0.14)
    bpy.ops.object.transform_apply(scale=True)
    flap_front.data.materials.append(mat_ushanka_fur)
    mesh_objects.append(flap_front)

    # Red Soviet Star on flap
    bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.02, location=(0, -0.24, 1.86))
    star = bpy.context.active_object
    star.name = "Vasiliy_Star"
    star.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    star.data.materials.append(mat_star)
    mesh_objects.append(star)

    # Hanging Ear Flaps (Left & Right)
    for side, sign in [("L", 1), ("R", -1)]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.22, -0.02, 1.70))
        ear_flap = bpy.context.active_object
        ear_flap.name = f"Vasiliy_EarFlap_{side}"
        ear_flap.scale = (0.06, 0.20, 0.26)
        bpy.ops.object.transform_apply(scale=True)
        ear_flap.data.materials.append(mat_ushanka_fur)
        mesh_objects.append(ear_flap)

    # 5. SHOULDER BAG / DUFFEL (Вещмешок)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.26, 0.14, 1.10))
    bag = bpy.context.active_object
    bag.name = "Vasiliy_Bag"
    bag.scale = (0.16, 0.28, 0.32)
    bag.rotation_euler = (math.radians(5), math.radians(10), math.radians(-15))
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    bag.data.materials.append(mat_bag)
    mesh_objects.append(bag)

    # 6. ARMS AND HANDS
    for side, sign in [("L", 1), ("R", -1)]:
        # Upper arm
        bpy.ops.mesh.primitive_cylinder_add(radius=0.10, depth=0.32, location=(sign * 0.34, 0, 1.34))
        u_arm = bpy.context.active_object
        u_arm.name = f"Vasiliy_UpperArm_{side}"
        u_arm.data.materials.append(mat_fufayka)
        mesh_objects.append(u_arm)

        # Forearm
        bpy.ops.mesh.primitive_cylinder_add(radius=0.085, depth=0.28, location=(sign * 0.32, -0.12, 1.12))
        f_arm = bpy.context.active_object
        f_arm.name = f"Vasiliy_Forearm_{side}"
        f_arm.rotation_euler = (math.radians(35), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        f_arm.data.materials.append(mat_fufayka)
        mesh_objects.append(f_arm)

        # Hand / Glove
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.28, -0.24, 0.98))
        hand = bpy.context.active_object
        hand.name = f"Vasiliy_Hand_{side}"
        hand.scale = (0.09, 0.12, 0.10)
        bpy.ops.object.transform_apply(scale=True)
        hand.data.materials.append(mat_skin)
        mesh_objects.append(hand)

    # 7. LEGS AND BOOTS
    for side, sign in [("L", 1), ("R", -1)]:
        # Thigh
        bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.38, location=(sign * 0.15, 0, 0.72))
        thigh = bpy.context.active_object
        thigh.name = f"Vasiliy_Thigh_{side}"
        thigh.data.materials.append(mat_pants)
        mesh_objects.append(thigh)

        # Calf
        bpy.ops.mesh.primitive_cylinder_add(radius=0.10, depth=0.32, location=(sign * 0.15, 0, 0.40))
        calf = bpy.context.active_object
        calf.name = f"Vasiliy_Calf_{side}"
        calf.data.materials.append(mat_boots)
        mesh_objects.append(calf)

        # Boot Foot
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.15, -0.06, 0.12))
        boot = bpy.context.active_object
        boot.name = f"Vasiliy_BootFoot_{side}"
        boot.scale = (0.13, 0.26, 0.16)
        bpy.ops.object.transform_apply(scale=True)
        boot.data.materials.append(mat_boots)
        mesh_objects.append(boot)

    # Join Body into Single Mesh
    bpy.ops.object.select_all(action='DESELECT')
    for m in mesh_objects:
        m.select_set(True)
    bpy.context.view_layer.objects.active = torso
    bpy.ops.object.join()
    body_mesh = bpy.context.active_object
    body_mesh.name = "Vasiliy_Body"

    # --- 8. MODULAR WEAPON: SAWED-OFF DOUBLE-BARREL SHOTGUN (ОБРЕЗ) ---
    weapon_parts = []

    # Wooden stock
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.16, -0.32, 1.04))
    w_stock = bpy.context.active_object
    w_stock.name = "Gun_Stock"
    w_stock.scale = (0.05, 0.22, 0.08)
    w_stock.rotation_euler = (math.radians(-15), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    w_stock.data.materials.append(mat_wood)
    weapon_parts.append(w_stock)

    # Receiver
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.16, -0.46, 1.07))
    w_receiver = bpy.context.active_object
    w_receiver.name = "Gun_Receiver"
    w_receiver.scale = (0.06, 0.12, 0.07)
    bpy.ops.object.transform_apply(scale=True)
    w_receiver.data.materials.append(mat_gun_metal)
    weapon_parts.append(w_receiver)

    # Double barrels
    for b_offset in [-0.022, 0.022]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.020, depth=0.34, location=(-0.16 + b_offset, -0.68, 1.08))
        barrel = bpy.context.active_object
        barrel.name = f"Gun_Barrel_{b_offset}"
        barrel.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        barrel.data.materials.append(mat_gun_metal)
        weapon_parts.append(barrel)

    # Tape wrap
    bpy.ops.mesh.primitive_cylinder_add(radius=0.038, depth=0.08, location=(-0.16, -0.62, 1.08))
    tape = bpy.context.active_object
    tape.name = "Gun_Tape"
    tape.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    tape.data.materials.append(mat_tape)
    weapon_parts.append(tape)

    # Join weapon as modular object
    bpy.ops.object.select_all(action='DESELECT')
    for wp in weapon_parts:
        wp.select_set(True)
    bpy.context.view_layer.objects.active = w_stock
    bpy.ops.object.join()
    gun_mesh = bpy.context.active_object
    gun_mesh.name = "Vasiliy_Weapon_Shotgun"

    print("Vasiliy 3D model and modular shotgun created successfully!")
    return body_mesh, gun_mesh

def build_rig(body_mesh, gun_mesh):
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = "Vasiliy_Rig"
    arm = arm_obj.data
    arm.name = "Vasiliy_Armature"

    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones

    # Root
    root = eb['Bone']
    root.name = "Root"
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.2)

    # Hips & Spine
    hips = eb.new("Hips")
    hips.parent = root
    hips.head = (0, 0, 0.95)
    hips.tail = (0, 0, 1.15)

    spine = eb.new("Spine")
    spine.parent = hips
    spine.head = (0, 0, 1.15)
    spine.tail = (0, 0, 1.55)

    head_b = eb.new("Head")
    head_b.parent = spine
    head_b.head = (0, 0, 1.55)
    head_b.tail = (0, 0, 2.05)

    # Left & Right Arms
    for side, sign in [("L", 1), ("R", -1)]:
        u_arm = eb.new(f"UpperArm.{side}")
        u_arm.parent = spine
        u_arm.head = (sign * 0.28, 0, 1.48)
        u_arm.tail = (sign * 0.34, -0.05, 1.20)

        f_arm = eb.new(f"Forearm.{side}")
        f_arm.parent = u_arm
        f_arm.head = (sign * 0.34, -0.05, 1.20)
        f_arm.tail = (sign * 0.28, -0.22, 1.00)

        hand = eb.new(f"Hand.{side}")
        hand.parent = f_arm
        hand.head = (sign * 0.28, -0.22, 1.00)
        hand.tail = (sign * 0.24, -0.32, 1.00)

    # Weapon Socket Bone on Right Hand
    w_socket = eb.new("Weapon_Socket")
    w_socket.parent = eb["Hand.R"]
    w_socket.head = (-0.24, -0.32, 1.00)
    w_socket.tail = (-0.16, -0.68, 1.08)

    # Legs
    for side, sign in [("L", 1), ("R", -1)]:
        thigh = eb.new(f"Thigh.{side}")
        thigh.parent = hips
        thigh.head = (sign * 0.15, 0, 0.95)
        thigh.tail = (sign * 0.15, 0, 0.55)

        calf = eb.new(f"Calf.{side}")
        calf.parent = thigh
        calf.head = (sign * 0.15, 0, 0.55)
        calf.tail = (sign * 0.15, 0, 0.20)

        foot = eb.new(f"Foot.{side}")
        foot.parent = calf
        foot.head = (sign * 0.15, 0, 0.20)
        foot.tail = (sign * 0.15, -0.20, 0.05)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Skinning body with automatic weights
    bpy.ops.object.select_all(action='DESELECT')
    body_mesh.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Parent modular weapon to Weapon_Socket bone
    bpy.ops.object.select_all(action='DESELECT')
    gun_mesh.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='BONE')
    gun_mesh.parent_bone = "Weapon_Socket"

    print("Rig and parenting completed successfully!")
    return arm_obj

def setup_game_camera_and_render():
    # Camera: Top-Down 2.5D view looking at Vasily (centered at z=1.0)
    bpy.ops.object.camera_add(location=(0, -3.2, 2.5))
    cam = bpy.context.active_object
    cam.name = "Game_Render_Cam"
    cam.rotation_euler = (math.radians(52), 0, 0)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 2.5
    bpy.context.scene.camera = cam

    # Lighting
    bpy.ops.object.light_add(type='SUN', location=(3, -3, 6))
    sun = bpy.context.active_object
    sun.data.energy = 4.5
    sun.rotation_euler = (math.radians(45), math.radians(20), math.radians(-30))

    bpy.ops.object.light_add(type='SUN', location=(-3, 3, 4))
    rim = bpy.context.active_object
    rim.data.energy = 2.0
    rim.data.color = (0.75, 0.85, 1.0)
    rim.rotation_euler = (math.radians(-45), math.radians(-20), math.radians(150))

    # Transparent render settings
    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.resolution_x = 256
    bpy.context.scene.render.resolution_y = 320

def animate_walk(arm_obj):
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    if not arm_obj.animation_data:
        arm_obj.animation_data_create()

    action = bpy.data.actions.new(name="Vasiliy_Walk")
    arm_obj.animation_data.action = action

    pb = arm_obj.pose.bones
    thigh_l = pb["Thigh.L"]
    thigh_r = pb["Thigh.R"]
    calf_l = pb["Calf.L"]
    calf_r = pb["Calf.R"]
    arm_l = pb["UpperArm.L"]
    arm_r = pb["UpperArm.R"]
    hips = pb["Hips"]
    spine = pb["Spine"]

    for b in [thigh_l, thigh_r, calf_l, calf_r, arm_l, arm_r, hips, spine]:
        b.rotation_mode = 'XYZ'

    # 4 Keyframe Walk Loop
    # Frame 1: Left step forward, Right back
    bpy.context.scene.frame_set(1)
    thigh_l.rotation_euler = (math.radians(-28), 0, 0)
    calf_l.rotation_euler = (math.radians(12), 0, 0)
    thigh_r.rotation_euler = (math.radians(24), 0, 0)
    calf_r.rotation_euler = (math.radians(18), 0, 0)
    arm_l.rotation_euler = (math.radians(18), 0, 0)
    arm_r.rotation_euler = (math.radians(-12), 0, 0)
    hips.location = (0, 0, 0)
    spine.rotation_euler = (0, 0, math.radians(-3))
    for b in [thigh_l, thigh_r, calf_l, calf_r, arm_l, arm_r, spine]:
        b.keyframe_insert(data_path="rotation_euler", frame=1)
    hips.keyframe_insert(data_path="location", frame=1)

    # Frame 5: Passing position
    bpy.context.scene.frame_set(5)
    thigh_l.rotation_euler = (math.radians(0), 0, 0)
    calf_l.rotation_euler = (math.radians(6), 0, 0)
    thigh_r.rotation_euler = (math.radians(-6), 0, 0)
    calf_r.rotation_euler = (math.radians(35), 0, 0)
    arm_l.rotation_euler = (math.radians(0), 0, 0)
    arm_r.rotation_euler = (math.radians(0), 0, 0)
    hips.location = (0, 0, 0.03)
    spine.rotation_euler = (0, 0, 0)
    for b in [thigh_l, thigh_r, calf_l, calf_r, arm_l, arm_r, spine]:
        b.keyframe_insert(data_path="rotation_euler", frame=5)
    hips.keyframe_insert(data_path="location", frame=5)

    # Frame 9: Right step forward, Left back
    bpy.context.scene.frame_set(9)
    thigh_l.rotation_euler = (math.radians(24), 0, 0)
    calf_l.rotation_euler = (math.radians(18), 0, 0)
    thigh_r.rotation_euler = (math.radians(-28), 0, 0)
    calf_r.rotation_euler = (math.radians(12), 0, 0)
    arm_l.rotation_euler = (math.radians(-12), 0, 0)
    arm_r.rotation_euler = (math.radians(18), 0, 0)
    hips.location = (0, 0, 0)
    spine.rotation_euler = (0, 0, math.radians(3))
    for b in [thigh_l, thigh_r, calf_l, calf_r, arm_l, arm_r, spine]:
        b.keyframe_insert(data_path="rotation_euler", frame=9)
    hips.keyframe_insert(data_path="location", frame=9)

    # Frame 13: Passing position
    bpy.context.scene.frame_set(13)
    thigh_l.rotation_euler = (math.radians(-6), 0, 0)
    calf_l.rotation_euler = (math.radians(35), 0, 0)
    thigh_r.rotation_euler = (math.radians(0), 0, 0)
    calf_r.rotation_euler = (math.radians(6), 0, 0)
    arm_l.rotation_euler = (math.radians(0), 0, 0)
    arm_r.rotation_euler = (math.radians(0), 0, 0)
    hips.location = (0, 0, 0.03)
    spine.rotation_euler = (0, 0, 0)
    for b in [thigh_l, thigh_r, calf_l, calf_r, arm_l, arm_r, spine]:
        b.keyframe_insert(data_path="rotation_euler", frame=13)
    hips.keyframe_insert(data_path="location", frame=13)

    bpy.ops.object.mode_set(mode='OBJECT')
    print("Walk animation keyframes created!")

def render_character_views(arm_obj, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    # Down (S), Right (D), Up (W), Left (A)
    directions = {
        "down": 0,
        "right": 90,
        "up": 180,
        "left": 270
    }
    frames = [1, 5, 9, 13]

    for dir_name, angle in directions.items():
        arm_obj.rotation_euler = (0, 0, math.radians(angle))
        for f_idx, frame_num in enumerate(frames):
            bpy.context.scene.frame_set(frame_num)
            out_file = os.path.join(output_dir, f"vasiliy_{dir_name}_{f_idx}.png")
            bpy.context.scene.render.filepath = out_file
            bpy.ops.render.render(write_still=True)
            print(f"Rendered: {out_file}")

    arm_obj.rotation_euler = (0, 0, 0)

if __name__ == "__main__":
    body, gun = build_vasiliy_character()
    rig = build_rig(body, gun)
    setup_game_camera_and_render()
    animate_walk(rig)

    # Save master Blender project
    blend_path = os.path.abspath("blender_assets/vasiliy_character_master.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Master Blender file saved to: {blend_path}")

    # Render game sprites
    out_sprites = os.path.abspath("assets/sprites/vasiliy_clean")
    render_character_views(rig, out_sprites)
    print("All sprites generated directly from Blender 3D rig successfully!")
