import bpy
import bmesh
import math
import os

ROOT = r"d:\pro1\vasiliy_vs_aliens"
MODELS_DIR = os.path.join(ROOT, "assets", "models")
LOOT_SPRITE_DIR = os.path.join(ROOT, "assets", "sprites", "loot")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LOOT_SPRITE_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_mat(name, base_color, metallic=0.0, roughness=0.5, emission=None, emission_strength=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
        elif emission and "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = (*emission, 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
        if alpha < 1.0 and "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
    return mat


def build_weapon_bat_glb():
    """
    Builds 3D Spiked Bat (Vasiliy_Bat) in Blender coords so that when exported to glTF (+Y up, +Z forward):
    In Blender: +X is right, -Y is forward (+Z in glTF), +Z is up (+Y in glTF).
    Wait: let's check glTF export coordinate convention in Blender:
    Blender (X, Y, Z) -> glTF (X, Z, -Y) when +Y Up is enabled!
    So glTF (x = -0.068, y = 1.24, z = 0.45..1.15) corresponds to:
    Blender X = -0.068, Blender Y = -0.45..-1.15, Blender Z = 1.24!
    Actually, let's build the bat centered at origin pointing along +Z (in glTF) or local origin,
    so in Three.js we can position/rotate it cleanly in `ThreeCharacterManager`!
    """
    clear_scene()
    mat_wood = make_mat("BatWood", (0.42, 0.27, 0.14), metallic=0.05, roughness=0.72)
    mat_wood_dark = make_mat("BatWoodDark", (0.22, 0.14, 0.08), metallic=0.08, roughness=0.80)
    mat_tape = make_mat("BlueTape", (0.12, 0.36, 0.68), metallic=0.05, roughness=0.42)
    mat_cloth = make_mat("DirtyCloth", (0.58, 0.54, 0.44), metallic=0.0, roughness=0.88)
    mat_rust = make_mat("RustyNail", (0.34, 0.19, 0.11), metallic=0.78, roughness=0.55)
    mat_steel = make_mat("NailTip", (0.55, 0.56, 0.58), metallic=0.88, roughness=0.35)

    objs = []

    # Bat body along Blender -Y (which exports as +Z forward in glTF)
    # Length 0.82m from Y=0.0 to Y=-0.82
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.024, radius2=0.052, depth=0.76, location=(0, -0.38, 0), rotation=(math.pi / 2, 0, 0))
    body = bpy.context.active_object
    body.data.materials.append(mat_wood)
    objs.append(body)

    # Rounded top cap
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.051, location=(0, -0.76, 0))
    cap = bpy.context.active_object
    cap.scale = (1.0, 0.65, 1.0)
    cap.data.materials.append(mat_wood_dark)
    objs.append(cap)

    # Pommel knob
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.032, location=(0, 0.01, 0))
    knob = bpy.context.active_object
    knob.scale = (1.0, 0.7, 1.0)
    knob.data.materials.append(mat_wood_dark)
    objs.append(knob)

    # Blue electrical tape grip
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.0265, depth=0.22, location=(0, -0.11, 0), rotation=(math.pi / 2, 0, 0))
    tape = bpy.context.active_object
    tape.data.materials.append(mat_tape)
    objs.append(tape)

    # Cloth wrap above tape
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.030, depth=0.09, location=(0, -0.25, 0), rotation=(math.pi / 2, 0, 0))
    cloth = bpy.context.active_object
    cloth.data.materials.append(mat_cloth)
    objs.append(cloth)

    # Barbed wire coils around barrel
    for i, y_pos in enumerate((-0.48, -0.55, -0.62, -0.69)):
        r = 0.038 + i * 0.004
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.0045, major_segments=18, minor_segments=6, location=(0, y_pos, 0), rotation=(math.pi / 2 + 0.12 * ((-1) ** i), 0, 0.15))
        wire = bpy.context.active_object
        wire.data.materials.append(mat_rust)
        objs.append(wire)

    # Long nails driven through the barrel at various angles
    nail_specs = [
        (-0.50, 0.3, 0.14),
        (-0.54, 1.45, 0.15),
        (-0.58, 2.55, 0.16),
        (-0.62, -0.85, 0.16),
        (-0.66, 0.85, 0.17),
        (-0.70, -2.1, 0.16),
        (-0.73, 2.0, 0.15),
    ]
    for y_pos, angle, length in nail_specs:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0048, depth=length, location=(0, y_pos, 0))
        nail = bpy.context.active_object
        nail.rotation_euler = (0.15, angle, 0.0)
        nail.data.materials.append(mat_rust)
        objs.append(nail)

        # Nail head
        hx = math.sin(angle) * (length * 0.5)
        hz = math.cos(angle) * (length * 0.5)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.010, depth=0.004, location=(hx, y_pos, hz))
        head = bpy.context.active_object
        head.rotation_euler = (0.15, angle, 0.0)
        head.data.materials.append(mat_steel)
        objs.append(head)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    bat = bpy.context.active_object
    bat.name = "Vasiliy_Bat"
    bpy.ops.object.shade_smooth()

    out_path = os.path.join(MODELS_DIR, "weapon_bat.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True)
    print(f"[OK] Exported {out_path} ({os.path.getsize(out_path)} bytes)")


def build_weapon_makarov_glb():
    clear_scene()
    mat_steel = make_mat("BluedSteel", (0.14, 0.17, 0.21), metallic=0.88, roughness=0.32)
    mat_barrel = make_mat("DarkBarrel", (0.07, 0.08, 0.10), metallic=0.92, roughness=0.25)
    mat_bakelite = make_mat("BakeliteGrip", (0.38, 0.15, 0.09), metallic=0.08, roughness=0.48)

    objs = []

    # Slide along Blender -Y (glTF +Z forward)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.14, 0.055))
    slide = bpy.context.active_object
    slide.scale = (0.022, 0.19, 0.032)
    slide.data.materials.append(mat_steel)
    objs.append(slide)

    # Rounded top of slide
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.020, depth=0.37, location=(0, -0.14, 0.076), rotation=(math.pi / 2, 0, 0))
    slide_top = bpy.context.active_object
    slide_top.data.materials.append(mat_steel)
    objs.append(slide_top)

    # Muzzle tip
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.011, depth=0.06, location=(0, -0.33, 0.065), rotation=(math.pi / 2, 0, 0))
    muzzle = bpy.context.active_object
    muzzle.data.materials.append(mat_barrel)
    objs.append(muzzle)

    # Bakelite grip angled slightly back
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.02, -0.025), rotation=(-0.22, 0, 0))
    grip = bpy.context.active_object
    grip.scale = (0.023, 0.048, 0.095)
    grip.data.materials.append(mat_bakelite)
    objs.append(grip)

    # Trigger guard
    bpy.ops.mesh.primitive_torus_add(major_radius=0.028, minor_radius=0.005, major_segments=14, minor_segments=6, location=(0, -0.11, 0.01), rotation=(0, math.pi / 2, 0))
    guard = bpy.context.active_object
    guard.data.materials.append(mat_steel)
    objs.append(guard)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    pm = bpy.context.active_object
    pm.name = "Vasiliy_Makarov"

    out_path = os.path.join(MODELS_DIR, "weapon_makarov.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True)
    print(f"[OK] Exported {out_path} ({os.path.getsize(out_path)} bytes)")


def setup_icon_studio():
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys() else 'BLENDER_EEVEE'
    scene.render.film_transparent = True
    scene.render.resolution_x = 256
    scene.render.resolution_y = 256
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    bpy.ops.object.camera_add(location=(0.0, -2.3, 1.55), rotation=(math.radians(56), 0, 0))
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 1.35
    scene.camera = cam

    bpy.ops.object.light_add(type='SUN', location=(2, -2, 4), rotation=(math.radians(40), math.radians(20), math.radians(-30)))
    sun = bpy.context.active_object
    sun.data.energy = 4.2
    sun.data.color = (1.0, 0.97, 0.90)

    bpy.ops.object.light_add(type='AREA', location=(-2, -1, 2), rotation=(math.radians(55), math.radians(-35), 0))
    fill = bpy.context.active_object
    fill.data.energy = 65.0
    fill.data.color = (0.70, 0.86, 1.0)


def build_and_render_alien_core():
    clear_scene()
    mat_core = make_mat("AlienCoreCrystal", (0.12, 0.98, 0.72), metallic=0.1, roughness=0.12, emission=(0.08, 0.95, 0.68), emission_strength=3.6)
    mat_inner = make_mat("AlienInnerPulse", (0.55, 1.0, 0.95), metallic=0.0, roughness=0.05, emission=(0.45, 1.0, 0.92), emission_strength=6.0)
    mat_chitin = make_mat("AlienChitin", (0.11, 0.16, 0.14), metallic=0.55, roughness=0.38)
    mat_copper = make_mat("CopperCoil", (0.78, 0.42, 0.18), metallic=0.88, roughness=0.28)

    objs = []

    # Faceted glowing crystal orb
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.36, location=(0, 0, 0.04))
    core = bpy.context.active_object
    core.data.materials.append(mat_core)
    objs.append(core)

    # Inner bright core
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.22, location=(0, 0, 0.04))
    inner = bpy.context.active_object
    inner.data.materials.append(mat_inner)
    objs.append(inner)

    # Dark alien chitin claws gripping the crystal
    for i in range(4):
        ang = i * (math.pi / 2) + 0.4
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.38,
            minor_radius=0.055,
            major_segments=16,
            minor_segments=8,
            location=(0, 0, 0.04),
            rotation=(math.radians(65), 0, ang)
        )
        claw = bpy.context.active_object
        claw.scale = (1.0, 0.65, 1.08)
        claw.data.materials.append(mat_chitin)
        objs.append(claw)

    # Copper containment rings
    for z_off, r_maj in ((-0.16, 0.34), (0.22, 0.31)):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=r_maj,
            minor_radius=0.032,
            major_segments=24,
            minor_segments=8,
            location=(0, 0, z_off),
            rotation=(0.18, -0.12, 0)
        )
        ring = bpy.context.active_object
        ring.data.materials.append(mat_copper)
        objs.append(ring)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = "Loot_AlienCore"

    glb_path = os.path.join(MODELS_DIR, "loot_alien_core.glb")
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', use_selection=True)
    print(f"[OK] Exported {glb_path}")

    setup_icon_studio()
    png_path = os.path.join(LOOT_SPRITE_DIR, "loot_alien_core_raw.png")
    bpy.context.scene.render.filepath = png_path
    bpy.ops.render.render(write_still=True)


def build_and_render_ammo_icons():
    # 1. 9x18mm Makarov ammo pack + brass cartridges
    clear_scene()
    mat_box = make_mat("KraftBox", (0.58, 0.46, 0.30), metallic=0.0, roughness=0.78)
    mat_stamp = make_mat("RedStamp", (0.55, 0.14, 0.12), metallic=0.0, roughness=0.65)
    mat_brass = make_mat("BrassCase", (0.85, 0.64, 0.22), metallic=0.92, roughness=0.22)
    mat_copper = make_mat("CopperBullet", (0.76, 0.38, 0.18), metallic=0.88, roughness=0.25)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.10, 0.05, 0.0), rotation=(0.1, 0.15, -0.45))
    box = bpy.context.active_object
    box.scale = (0.34, 0.24, 0.18)
    box.data.materials.append(mat_box)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.10, 0.05, 0.095), rotation=(0.1, 0.15, -0.45))
    label = bpy.context.active_object
    label.scale = (0.26, 0.14, 0.01)
    label.data.materials.append(mat_stamp)

    # Standing and lying 9x18 cartridges in foreground
    bullet_coords = [
        (0.22, -0.18, -0.02, 0.0, 0.0, 0.0),
        (0.34, -0.10, -0.02, 0.0, 0.0, 0.2),
        (0.12, -0.26, -0.02, 0.0, 0.0, -0.1),
        (0.24, 0.16, -0.10, math.radians(82), 0.2, 0.6),
    ]
    for bx, by, bz, rx, ry, rz in bullet_coords:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.055, depth=0.22, location=(bx, by, bz), rotation=(rx, ry, rz))
        case = bpy.context.active_object
        case.data.materials.append(mat_brass)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.053, location=(bx, by, bz + 0.12 if rx == 0 else bz + 0.02), rotation=(rx, ry, rz))
        tip = bpy.context.active_object
        tip.scale = (1.0, 1.0, 1.35)
        tip.data.materials.append(mat_copper)

    setup_icon_studio()
    bpy.context.scene.render.filepath = os.path.join(LOOT_SPRITE_DIR, "ammo_9x18_raw.png")
    bpy.ops.render.render(write_still=True)

    # 2. 12-gauge shotgun shells pack
    clear_scene()
    mat_red = make_mat("RedHull", (0.72, 0.12, 0.12), metallic=0.1, roughness=0.42)
    mat_green_box = make_mat("HuntBox", (0.22, 0.34, 0.20), metallic=0.05, roughness=0.72)
    mat_brass = make_mat("ShotgunBrass", (0.88, 0.68, 0.24), metallic=0.92, roughness=0.22)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.12, 0.08, 0.02), rotation=(0.08, 0.12, -0.40))
    sbox = bpy.context.active_object
    sbox.scale = (0.36, 0.26, 0.22)
    sbox.data.materials.append(mat_green_box)

    shells = [
        (0.20, -0.16, 0.0, 0, 0, 0),
        (0.35, -0.06, 0.0, 0, 0, 0),
        (0.08, -0.26, -0.08, math.radians(85), 0.1, 0.5),
    ]
    for sx, sy, sz, rx, ry, rz in shells:
        bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.068, depth=0.30, location=(sx, sy, sz), rotation=(rx, ry, rz))
        hull = bpy.context.active_object
        hull.data.materials.append(mat_red)
        bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.071, depth=0.10, location=(sx, sy, sz - 0.11 if rx == 0 else sz - 0.01), rotation=(rx, ry, rz))
        base = bpy.context.active_object
        base.data.materials.append(mat_brass)

    setup_icon_studio()
    bpy.context.scene.render.filepath = os.path.join(LOOT_SPRITE_DIR, "ammo_12g_raw.png")
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    build_weapon_bat_glb()
    build_weapon_makarov_glb()
    build_and_render_alien_core()
    build_and_render_ammo_icons()
