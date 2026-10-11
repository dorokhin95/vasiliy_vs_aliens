import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color, roughness=0.6, metallic=0.0, emission_color=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if emission_color and emission_strength > 0:
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = emission_color
                bsdf.inputs['Emission Strength'].default_value = emission_strength
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = emission_color
    return mat

def create_toad_skin_material():
    mat = bpy.data.materials.new(name="Mat_Toad_Skin")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    output = nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    tex_noise = nodes.new(type='ShaderNodeTexNoise')
    tex_noise.inputs['Scale'].default_value = 18.0
    tex_noise.inputs['Detail'].default_value = 4.0
    
    color_ramp = nodes.new(type='ShaderNodeValToRGB')
    color_ramp.color_ramp.elements[0].position = 0.35
    color_ramp.color_ramp.elements[0].color = (0.16, 0.28, 0.12, 1.0) # Deep swamp olive
    color_ramp.color_ramp.elements[1].position = 0.75
    color_ramp.color_ramp.elements[1].color = (0.28, 0.44, 0.18, 1.0) # Toxic toad green
    
    links.new(tex_noise.outputs['Fac'], color_ramp.inputs['Fac'])
    links.new(color_ramp.outputs['Color'], bsdf.inputs['Base Color'])
    
    bsdf.inputs['Roughness'].default_value = 0.55
    bsdf.inputs['Specular IOR Level'].default_value = 0.6 if 'Specular IOR Level' in bsdf.inputs else 0.6
    
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat

def build_grunt_geometry():
    clear_scene()

    # Materials
    mat_skin = create_toad_skin_material()
    mat_underbelly = create_pbr_material("Mat_Toad_Belly", (0.42, 0.48, 0.26, 1.0), roughness=0.5)
    mat_hazard = create_pbr_material("Mat_Hazard_Sign", (0.95, 0.75, 0.08, 1.0), roughness=0.35, metallic=0.1)
    mat_hazard_stripe = create_pbr_material("Mat_Hazard_Black", (0.12, 0.12, 0.12, 1.0), roughness=0.4, metallic=0.1)
    mat_metal = create_pbr_material("Mat_Scrap_Metal", (0.18, 0.20, 0.22, 1.0), roughness=0.4, metallic=0.85)
    mat_rust = create_pbr_material("Mat_Rust", (0.35, 0.18, 0.10, 1.0), roughness=0.8, metallic=0.4)
    mat_glow_green = create_pbr_material("Mat_Toxic_Glow", (0.1, 0.9, 0.1, 1.0), roughness=0.2, emission_color=(0.2, 1.0, 0.15, 1.0), emission_strength=4.5)
    mat_cyber_cyan = create_pbr_material("Mat_Cyber_Eye", (0.05, 0.7, 0.9, 1.0), roughness=0.1, emission_color=(0.1, 0.9, 1.0, 1.0), emission_strength=5.0)
    mat_dark_leather = create_pbr_material("Mat_Dark_Straps", (0.10, 0.09, 0.08, 1.0), roughness=0.8)

    body_parts = []

    # 1. Torso / Belly (broad hunched amphibian trunk)
    # Scaled to Grunt proportions: broad shoulders (W=1.10), hunched (H=1.75)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.55, location=(0, 0.04, 1.08))
    torso = bpy.context.active_object
    torso.name = "Grunt_Torso"
    torso.scale = (1.08, 0.88, 0.95)
    bpy.ops.object.transform_apply(scale=True)
    torso.data.materials.append(mat_skin)
    body_parts.append(torso)

    # 2. Hunched Back Hump
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=0.42, location=(0, 0.22, 1.28))
    hump = bpy.context.active_object
    hump.name = "Grunt_Hump"
    hump.scale = (0.95, 0.80, 0.75)
    bpy.ops.object.transform_apply(scale=True)
    hump.data.materials.append(mat_skin)
    body_parts.append(hump)

    # 3. Toad Head (wide mouth, flat hunched skull)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.46, location=(0, -0.22, 1.44))
    head = bpy.context.active_object
    head.name = "Grunt_Head"
    head.scale = (1.05, 0.82, 0.58)
    head.rotation_euler = (math.radians(-12), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    head.data.materials.append(mat_skin)
    body_parts.append(head)

    # Throat Sac / Gular pouch
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=10, radius=0.32, location=(0, -0.28, 1.25))
    throat = bpy.context.active_object
    throat.name = "Grunt_Throat"
    throat.scale = (0.85, 0.75, 0.65)
    bpy.ops.object.transform_apply(scale=True)
    throat.data.materials.append(mat_underbelly)
    body_parts.append(throat)

    # 4. Eyes & Cybernetic Implant
    # Right Eye (Biological glowing predatory amphibian eye)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.14, location=(0.28, -0.26, 1.62))
    eye_r = bpy.context.active_object
    eye_r.name = "Grunt_Eye_R"
    eye_r.data.materials.append(create_pbr_material("Mat_Eye_Amber", (0.9, 0.7, 0.1, 1.0), roughness=0.1))
    body_parts.append(eye_r)

    # Left Eye (CYBERNETIC OCULAR MONOCLE from concept art)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.18, location=(-0.28, -0.28, 1.62))
    eye_l_casing = bpy.context.active_object
    eye_l_casing.name = "Grunt_CyberEye_Housing"
    eye_l_casing.rotation_euler = (math.radians(-70), 0, math.radians(-15))
    bpy.ops.object.transform_apply(rotation=True)
    eye_l_casing.data.materials.append(mat_metal)
    body_parts.append(eye_l_casing)

    # Glowing Cyan Lens inside Cyber Eye
    bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.06, location=(-0.30, -0.36, 1.65))
    lens = bpy.context.active_object
    lens.name = "Grunt_CyberEye_Lens"
    lens.rotation_euler = (math.radians(-70), 0, math.radians(-15))
    bpy.ops.object.transform_apply(rotation=True)
    lens.data.materials.append(mat_cyber_cyan)
    body_parts.append(lens)

    # Respirator / Tube fitting under jaw
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.14, location=(0, -0.46, 1.34))
    respirator = bpy.context.active_object
    respirator.name = "Grunt_Respirator"
    respirator.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    respirator.data.materials.append(mat_metal)
    body_parts.append(respirator)

    # 5. Chestplate: HAZARD WARNING ROAD SIGN (Authentic Concept Detail)
    # Triangular hazard sign plate
    bm_sign = bmesh.new()
    # Sign triangle vertices
    v1 = bm_sign.verts.new((-0.26, -0.32, 1.28))
    v2 = bm_sign.verts.new((0.26, -0.32, 1.28))
    v3 = bm_sign.verts.new((0.0, -0.34, 0.86))
    bm_sign.faces.new((v1, v2, v3))
    
    mesh_sign = bpy.data.meshes.new("Grunt_ChestSign_Mesh")
    bm_sign.to_mesh(mesh_sign)
    bm_sign.free()
    
    sign_obj = bpy.data.objects.new("Grunt_HazardSign", mesh_sign)
    bpy.context.collection.objects.link(sign_obj)
    
    # Add solidify modifier for metal thickness
    mod_solid = sign_obj.modifiers.new(name="Solidify", type='SOLIDIFY')
    mod_solid.thickness = 0.04
    mod_solid.offset = 1.0
    
    bpy.context.view_layer.objects.active = sign_obj
    sign_obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier="Solidify")
    sign_obj.data.materials.append(mat_hazard)
    body_parts.append(sign_obj)

    # Hazard Sign Exclamation Mark symbol in center
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -0.37, 1.14))
    symbol_bar = bpy.context.active_object
    symbol_bar.name = "Grunt_Sign_Bar"
    symbol_bar.scale = (0.045, 0.015, 0.12)
    bpy.ops.object.transform_apply(scale=True)
    symbol_bar.data.materials.append(mat_hazard_stripe)
    body_parts.append(symbol_bar)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.02, location=(0.0, -0.37, 0.96))
    symbol_dot = bpy.context.active_object
    symbol_dot.name = "Grunt_Sign_Dot"
    symbol_dot.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    symbol_dot.data.materials.append(mat_hazard_stripe)
    body_parts.append(symbol_dot)

    # Leather straps securing sign across back
    for strap_side, sign_dir in [("L", 1), ("R", -1)]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign_dir * 0.28, -0.05, 1.25))
        strap = bpy.context.active_object
        strap.name = f"Grunt_Strap_{strap_side}"
        strap.scale = (0.05, 0.38, 0.06)
        strap.rotation_euler = (math.radians(15), math.radians(sign_dir * -25), 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        strap.data.materials.append(mat_dark_leather)
        body_parts.append(strap)

    # 6. Backpack: Toxic Fuel Tank & Pressure Canister
    bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=0.62, location=(0.08, 0.44, 1.26))
    tank = bpy.context.active_object
    tank.name = "Grunt_ToxicTank"
    tank.rotation_euler = (math.radians(10), math.radians(6), 0)
    bpy.ops.object.transform_apply(rotation=True)
    tank.data.materials.append(mat_metal)
    body_parts.append(tank)

    # Glowing level indicator tube on tank
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.48, location=(0.08, 0.58, 1.26))
    gauge = bpy.context.active_object
    gauge.name = "Grunt_Tank_Gauge"
    gauge.rotation_euler = (math.radians(10), math.radians(6), 0)
    bpy.ops.object.transform_apply(rotation=True)
    gauge.data.materials.append(mat_glow_green)
    body_parts.append(gauge)

    # Tank top valve cap
    bpy.ops.mesh.primitive_cylinder_add(radius=0.10, depth=0.12, location=(0.08, 0.40, 1.62))
    cap = bpy.context.active_object
    cap.name = "Grunt_Tank_Cap"
    cap.data.materials.append(mat_rust)
    body_parts.append(cap)

    # 7. Muscular Frog Arms & Hands
    # Upper Arms (wide, powerful frog musculature)
    for side, sign_x in [("L", 1), ("R", -1)]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=10, radius=0.22, location=(sign_x * 0.48, 0.05, 1.28))
        shoulder = bpy.context.active_object
        shoulder.name = f"Grunt_Shoulder_{side}"
        shoulder.scale = (1.0, 0.85, 1.1)
        bpy.ops.object.transform_apply(scale=True)
        shoulder.data.materials.append(mat_skin)
        body_parts.append(shoulder)

        # Scrap metal shoulder pauldron on Left arm
        if side == "L":
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.26, location=(0.54, 0.05, 1.34))
            pauldron = bpy.context.active_object
            pauldron.name = "Grunt_Pauldron_L"
            pauldron.scale = (0.5, 0.9, 0.8)
            bpy.ops.object.transform_apply(scale=True)
            pauldron.data.materials.append(mat_rust)
            body_parts.append(pauldron)

        # Forearm extending forward to hold weapon
        f_y = -0.28
        f_z = 1.05
        bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.38, location=(sign_x * 0.40, f_y, f_z))
        forearm = bpy.context.active_object
        forearm.name = f"Grunt_Forearm_{side}"
        forearm.rotation_euler = (math.radians(55), 0, math.radians(sign_x * -18))
        bpy.ops.object.transform_apply(rotation=True)
        forearm.data.materials.append(mat_skin)
        body_parts.append(forearm)

        # Webbed 3-claw toad hand
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.14, location=(sign_x * 0.32, -0.46, 0.98))
        hand = bpy.context.active_object
        hand.name = f"Grunt_Hand_{side}"
        hand.scale = (1.1, 0.9, 0.6)
        bpy.ops.object.transform_apply(scale=True)
        hand.data.materials.append(mat_skin)
        body_parts.append(hand)

    # 8. Heavy Toxic Spitter / Scrap Canister Weapon
    # Gun receiver & pipe
    weapon_parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.72, location=(-0.08, -0.56, 1.00))
    barrel = bpy.context.active_object
    barrel.name = "Grunt_Weapon_Barrel"
    barrel.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    barrel.data.materials.append(mat_metal)
    weapon_parts.append(barrel)

    # Muzzle nozzle
    bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.12, location=(-0.08, -0.92, 1.00))
    nozzle = bpy.context.active_object
    nozzle.name = "Grunt_Weapon_Nozzle"
    nozzle.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    nozzle.data.materials.append(mat_rust)
    weapon_parts.append(nozzle)

    # Underslung toxic green canister cartridge on weapon
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.28, location=(-0.08, -0.62, 0.86))
    canister = bpy.context.active_object
    canister.name = "Grunt_Weapon_Canister"
    canister.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    canister.data.materials.append(mat_glow_green)
    weapon_parts.append(canister)

    # Gun stock and grip
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.08, -0.38, 0.95))
    stock = bpy.context.active_object
    stock.name = "Grunt_Weapon_Stock"
    stock.scale = (0.09, 0.22, 0.16)
    bpy.ops.object.transform_apply(scale=True)
    stock.data.materials.append(mat_rust)
    weapon_parts.append(stock)

    # Join weapon parts into one single mesh
    bpy.ops.object.select_all(action='DESELECT')
    for wp in weapon_parts:
        wp.select_set(True)
    bpy.context.view_layer.objects.active = barrel
    bpy.ops.object.join()
    weapon_obj = bpy.context.active_object
    weapon_obj.name = "Grunt_Weapon"

    # 9. Frog Legs & Webbed Feet
    for side, sign_x in [("L", 1), ("R", -1)]:
        # Heavy muscular frog thigh (angled outwards)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=10, radius=0.28, location=(sign_x * 0.36, 0.08, 0.68))
        thigh = bpy.context.active_object
        thigh.name = f"Grunt_Thigh_{side}"
        thigh.scale = (0.9, 1.2, 0.9)
        bpy.ops.object.transform_apply(scale=True)
        thigh.data.materials.append(mat_skin)
        body_parts.append(thigh)

        # Shin / Calf
        bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=0.46, location=(sign_x * 0.34, -0.04, 0.32))
        shin = bpy.context.active_object
        shin.name = f"Grunt_Shin_{side}"
        shin.rotation_euler = (math.radians(-15), 0, math.radians(sign_x * 10))
        bpy.ops.object.transform_apply(rotation=True)
        shin.data.materials.append(mat_skin)
        body_parts.append(shin)

        # Scrap knee guard
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign_x * 0.34, -0.16, 0.44))
        kneepad = bpy.context.active_object
        kneepad.name = f"Grunt_KneePad_{side}"
        kneepad.scale = (0.16, 0.06, 0.14)
        bpy.ops.object.transform_apply(scale=True)
        kneepad.data.materials.append(mat_rust)
        body_parts.append(kneepad)

        # Large webbed frog foot
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign_x * 0.34, -0.14, 0.06))
        foot = bpy.context.active_object
        foot.name = f"Grunt_Foot_{side}"
        foot.scale = (0.24, 0.42, 0.10)
        bpy.ops.object.transform_apply(scale=True)
        foot.data.materials.append(mat_skin)
        body_parts.append(foot)

    # Join All Body Parts into one unified Toad_Grunt_Body
    bpy.ops.object.select_all(action='DESELECT')
    for bp in body_parts:
        bp.select_set(True)
    bpy.context.view_layer.objects.active = torso
    bpy.ops.object.join()
    body_mesh = bpy.context.active_object
    body_mesh.name = "Toad_Grunt_Body"

    # Smooth shading
    for poly in body_mesh.data.polygons:
        poly.use_smooth = True
    for poly in weapon_obj.data.polygons:
        poly.use_smooth = True

    print("Toad Grunt geometry built successfully!")
    return body_mesh, weapon_obj

def create_grunt_rig(body_mesh, weapon_obj):
    bpy.ops.object.armature_add(location=(0, 0, 0))
    rig_obj = bpy.context.active_object
    rig_obj.name = "Toad_Grunt_Rig"
    armature = rig_obj.data
    armature.name = "Toad_Grunt_Skeleton"

    bpy.ops.object.mode_set(mode='EDIT')
    ebones = armature.edit_bones

    # Root
    root = ebones['Bone']
    root.name = "Root"
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.3)

    # Pelvis
    pelvis = ebones.new("Pelvis")
    pelvis.parent = root
    pelvis.head = (0, 0.04, 0.75)
    pelvis.tail = (0, 0.04, 1.05)

    # Spine & Chest
    spine = ebones.new("Spine")
    spine.parent = pelvis
    spine.head = (0, 0.04, 1.05)
    spine.tail = (0, 0.06, 1.35)

    chest = ebones.new("Chest")
    chest.parent = spine
    chest.head = (0, 0.06, 1.35)
    chest.tail = (0, -0.05, 1.50)

    # Head
    head_bone = ebones.new("Head")
    head_bone.parent = chest
    head_bone.head = (0, -0.15, 1.45)
    head_bone.tail = (0, -0.35, 1.65)

    # Arms
    for side, sign_x in [("L", 1), ("R", -1)]:
        arm = ebones.new(f"Arm.{side}")
        arm.parent = chest
        arm.head = (sign_x * 0.42, 0.06, 1.35)
        arm.tail = (sign_x * 0.40, -0.20, 1.05)

        forearm = ebones.new(f"Forearm.{side}")
        forearm.parent = arm
        forearm.head = (sign_x * 0.40, -0.20, 1.05)
        forearm.tail = (sign_x * 0.32, -0.46, 0.98)

        hand = ebones.new(f"Hand.{side}")
        hand.parent = forearm
        hand.head = (sign_x * 0.32, -0.46, 0.98)
        hand.tail = (sign_x * 0.28, -0.56, 0.98)

    # Weapon Socket Bone attached to Hand.R
    weapon_socket = ebones.new("Weapon_Socket")
    weapon_socket.parent = ebones["Hand.R"]
    weapon_socket.head = (-0.08, -0.45, 1.00)
    weapon_socket.tail = (-0.08, -0.85, 1.00)

    # Legs
    for side, sign_x in [("L", 1), ("R", -1)]:
        thigh = ebones.new(f"Thigh.{side}")
        thigh.parent = pelvis
        thigh.head = (sign_x * 0.32, 0.06, 0.75)
        thigh.tail = (sign_x * 0.34, -0.04, 0.40)

        shin = ebones.new(f"Shin.{side}")
        shin.parent = thigh
        shin.head = (sign_x * 0.34, -0.04, 0.40)
        shin.tail = (sign_x * 0.34, -0.12, 0.12)

        foot = ebones.new(f"Foot.{side}")
        foot.parent = shin
        foot.head = (sign_x * 0.34, -0.12, 0.12)
        foot.tail = (sign_x * 0.34, -0.32, 0.04)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Skinning: Parent Body Mesh with Automatic Weights
    bpy.ops.object.select_all(action='DESELECT')
    body_mesh.select_set(True)
    rig_obj.select_set(True)
    bpy.context.view_layer.objects.active = rig_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Parent Weapon to Weapon_Socket bone
    bpy.ops.object.select_all(action='DESELECT')
    weapon_obj.select_set(True)
    rig_obj.select_set(True)
    bpy.context.view_layer.objects.active = rig_obj
    bpy.ops.object.parent_set(type='BONE')
    weapon_obj.parent_bone = "Weapon_Socket"

    print("Toad Grunt rig and skinning created!")
    return rig_obj

def create_grunt_animations(rig_obj):
    bpy.context.view_layer.objects.active = rig_obj
    bpy.ops.object.mode_set(mode='POSE')

    if not rig_obj.animation_data:
        rig_obj.animation_data_create()

    # --- 1. WALK ANIMATION (Heavy Stomp Cycle, 16 frames) ---
    action_walk = bpy.data.actions.new(name="Toad_Grunt_Walk")
    rig_obj.animation_data.action = action_walk

    pbones = rig_obj.pose.bones
    thigh_l = pbones.get("Thigh.L")
    thigh_r = pbones.get("Thigh.R")
    shin_l = pbones.get("Shin.L")
    shin_r = pbones.get("Shin.R")
    pelvis = pbones.get("Pelvis")
    chest = pbones.get("Chest")
    head = pbones.get("Head")

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 16

    keyframes = [
        # (frame, thigh_l_rot, thigh_r_rot, shin_l_rot, shin_r_rot, pelvis_z, chest_y_rot)
        (1, 24, -22, -15, 10, 0.0, -3),
        (5, 0, 0, 10, 5, 0.04, 0),
        (9, -22, 24, 10, -15, 0.0, 3),
        (13, 0, 0, 5, 10, 0.04, 0),
        (17, 24, -22, -15, 10, 0.0, -3),
    ]

    for f, tl, tr, sl, sr, pz, cy in keyframes:
        bpy.context.scene.frame_set(f)
        for b in [thigh_l, thigh_r, shin_l, shin_r, pelvis, chest, head]:
            b.rotation_mode = 'XYZ'

        thigh_l.rotation_euler = (math.radians(tl), 0, 0)
        thigh_r.rotation_euler = (math.radians(tr), 0, 0)
        shin_l.rotation_euler = (math.radians(sl), 0, 0)
        shin_r.rotation_euler = (math.radians(sr), 0, 0)
        pelvis.location = (0, 0, pz)
        chest.rotation_euler = (0, math.radians(cy), 0)
        head.rotation_euler = (math.radians(math.sin(f * 0.4) * 4), 0, 0)

        thigh_l.keyframe_insert(data_path="rotation_euler", frame=f)
        thigh_r.keyframe_insert(data_path="rotation_euler", frame=f)
        shin_l.keyframe_insert(data_path="rotation_euler", frame=f)
        shin_r.keyframe_insert(data_path="rotation_euler", frame=f)
        pelvis.keyframe_insert(data_path="location", frame=f)
        chest.keyframe_insert(data_path="rotation_euler", frame=f)
        head.keyframe_insert(data_path="rotation_euler", frame=f)

    bpy.ops.object.mode_set(mode='OBJECT')
    print("Toad Grunt Walk animation cycle created!")

def export_grunt_glb(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False,
        export_animations=True,
        export_current_frame=False
    )
    print(f"Exported Toad Grunt GLB to: {output_path}")

def render_verification(rig_obj, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    # Camera setup (2.5D Orthographic perspective matching game)
    bpy.ops.object.camera_add(location=(0, -4.2, 3.4))
    cam = bpy.context.active_object
    cam.name = "Render_Cam"
    cam.rotation_euler = (math.radians(52), 0, 0)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 3.0
    bpy.context.scene.camera = cam

    # Lighting
    bpy.ops.object.light_add(type='SUN', location=(3, -4, 6))
    sun = bpy.context.active_object
    sun.data.energy = 4.5
    sun.rotation_euler = (math.radians(45), math.radians(25), math.radians(-30))

    bpy.ops.object.light_add(type='SUN', location=(-3, 3, 4))
    fill = bpy.context.active_object
    fill.data.energy = 2.0
    fill.data.color = (0.7, 0.85, 1.0)
    fill.rotation_euler = (math.radians(-45), math.radians(-20), math.radians(140))

    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.resolution_x = 256
    bpy.context.scene.render.resolution_y = 256

    views = {
        "front": 0,
        "iso": 35,
        "side": 90,
        "back": 180
    }

    for view_name, angle_deg in views.items():
        rig_obj.rotation_euler = (0, 0, math.radians(angle_deg))
        bpy.context.scene.frame_set(1)
        out_file = os.path.join(output_dir, f"toad_grunt_{view_name}.png")
        bpy.context.scene.render.filepath = out_file
        bpy.ops.render.render(write_still=True)
        print(f"Rendered verification view: {out_file}")

    rig_obj.rotation_euler = (0, 0, 0)

if __name__ == "__main__":
    body, weapon = build_grunt_geometry()
    rig = create_grunt_rig(body, weapon)
    create_grunt_animations(rig)
    
    # Export GLB
    glb_out = os.path.abspath("assets/models/toad_grunt.glb")
    export_grunt_glb(glb_out)

    # Render Preview Views
    render_verification(rig, os.path.abspath("assets/models/preview"))
