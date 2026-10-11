import bpy
import math
import os
import random

os.makedirs('assets/sprites/props', exist_ok=True)
os.makedirs('assets/sprites/buildings', exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def setup_camera_and_light(cam_dist=10.0, ortho_scale=3.5, target_z=0.5):
    # Camera matching 2.5D orthographic top-down perspective (pitch ~28 deg from horizontal / 62 deg from vertical)
    pitch_deg = 28.0
    pitch_rad = math.radians(pitch_deg)
    
    # In Blender: camera looking towards origin from South (+Y looking towards -Y or -Y looking towards +Y)
    cam_y = -cam_dist * math.cos(pitch_rad)
    cam_z = target_z + cam_dist * math.sin(pitch_rad)
    
    bpy.ops.object.camera_add(location=(0, cam_y, cam_z))
    cam = bpy.context.active_object
    cam.name = "RenderCamera"
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = ortho_scale
    bpy.context.scene.camera = cam
    
    # Target empty
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, target_z))
    target = bpy.context.active_object
    
    tt = cam.constraints.new(type='TRACK_TO')
    tt.target = target
    tt.track_axis = 'TRACK_NEGATIVE_Z'
    tt.up_axis = 'UP_Y'
    
    # Key light (Cool northern sky daylight + warm sun)
    bpy.ops.object.light_add(type='SUN', location=(4, -6, 8))
    sun = bpy.context.active_object
    sun.data.energy = 4.0
    sun.data.color = (1.0, 0.96, 0.90)
    sun.rotation_euler = (math.radians(45), math.radians(20), math.radians(-35))
    
    # Fill light (Ambient cool bluish)
    bpy.ops.object.light_add(type='SUN', location=(-5, 4, 6))
    fill = bpy.context.active_object
    fill.data.energy = 2.2
    fill.data.color = (0.75, 0.85, 1.0)
    fill.rotation_euler = (math.radians(-40), math.radians(-15), math.radians(145))
    
    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.5, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat

def render_to_file(out_path, res_x=256, res_y=256):
    bpy.context.scene.render.resolution_x = res_x
    bpy.context.scene.render.resolution_y = res_y
    bpy.context.scene.render.filepath = os.path.abspath(out_path)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered: {out_path} ({res_x}x{res_y})")

# =============================================================
# 1. 3D WRECKED SOVIET LADA ZHIGULI CAR
# =============================================================
def build_car_zhiguli():
    clear_scene()
    setup_camera_and_light(cam_dist=8.0, ortho_scale=2.8, target_z=0.4)
    
    mat_car_body = create_pbr_material("Mat_Zhiguli_Body", (0.55, 0.16, 0.14, 1.0), metallic=0.35, roughness=0.45)
    mat_rust = create_pbr_material("Mat_Rust", (0.35, 0.18, 0.10, 1.0), metallic=0.1, roughness=0.85)
    mat_glass = create_pbr_material("Mat_Glass", (0.15, 0.22, 0.28, 1.0), metallic=0.1, roughness=0.2)
    mat_chrome = create_pbr_material("Mat_Chrome", (0.75, 0.78, 0.80, 1.0), metallic=0.85, roughness=0.25)
    mat_rubber = create_pbr_material("Mat_Rubber", (0.08, 0.08, 0.09, 1.0), metallic=0.0, roughness=0.9)
    
    # 1. Lower chassis / body box
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.25))
    chassis = bpy.context.active_object
    chassis.scale = (2.1, 0.95, 0.32)
    bpy.ops.object.transform_apply(scale=True)
    chassis.data.materials.append(mat_car_body)
    
    # 2. Cabin / roof (slanted windshield and rear)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.15, 0, 0.52))
    cabin = bpy.context.active_object
    cabin.scale = (1.15, 0.86, 0.28)
    bpy.ops.object.transform_apply(scale=True)
    cabin.data.materials.append(mat_car_body)
    
    # Windshield (slanted glass quad)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.46, 0, 0.48))
    windshield = bpy.context.active_object
    windshield.scale = (0.12, 0.80, 0.22)
    windshield.rotation_euler = (0, math.radians(35), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    windshield.data.materials.append(mat_glass)
    
    # Rear window
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.76, 0, 0.48))
    rear_win = bpy.context.active_object
    rear_win.scale = (0.12, 0.80, 0.22)
    rear_win.rotation_euler = (0, math.radians(-32), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    rear_win.data.materials.append(mat_glass)
    
    # Side windows
    for side_y in [0.44, -0.44]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.15, side_y, 0.50))
        sw = bpy.context.active_object
        sw.scale = (0.95, 0.04, 0.20)
        bpy.ops.object.transform_apply(scale=True)
        sw.data.materials.append(mat_glass)
        
    # Bumpers (Chrome)
    for bx, sign in [(1.08, 1), (-1.08, -1)]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, 0, 0.18))
        bumper = bpy.context.active_object
        bumper.scale = (0.08, 0.98, 0.10)
        bpy.ops.object.transform_apply(scale=True)
        bumper.data.materials.append(mat_chrome)
        
    # Headlights
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.05, location=(1.06, 0.32, 0.28))
    hl1 = bpy.context.active_object
    hl1.rotation_euler = (0, math.radians(90), 0)
    hl1.data.materials.append(create_pbr_material("Mat_HL_Yellow", (0.9, 0.85, 0.3, 1.0), roughness=0.1, emission=(0.9, 0.8, 0.2, 1.0), emission_strength=1.5))
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.05, location=(1.06, -0.32, 0.28))
    hl2 = bpy.context.active_object
    hl2.rotation_euler = (0, math.radians(90), 0)
    hl2.data.materials.append(mat_rust) # Broken smashed headlight
    
    # Wheels (flat tires)
    for wx in [0.65, -0.65]:
        for wy in [0.48, -0.48]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=0.12, location=(wx, wy, 0.12))
            wheel = bpy.context.active_object
            wheel.rotation_euler = (math.radians(90), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
            wheel.data.materials.append(mat_rubber)
            
    # Crumpled hood dent & rust
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(0.65, 0.12, 0.38))
    dent = bpy.context.active_object
    dent.scale = (1.2, 0.8, 0.2)
    bpy.ops.object.transform_apply(scale=True)
    dent.data.materials.append(mat_rust)
    
    # Soft ground shadow plane
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.01))
    sh = bpy.context.active_object
    sh.scale = (2.4, 1.3, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    sh.data.materials.append(create_pbr_material("Mat_Shadow", (0, 0, 0, 0.6), roughness=1.0))
    
    render_to_file('assets/sprites/props/car_zhiguli.png', 192, 128)

# =============================================================
# 2. 3D SOVIET UAZ BUKHANKA VAN
# =============================================================
def build_car_uaz():
    clear_scene()
    setup_camera_and_light(cam_dist=8.0, ortho_scale=3.1, target_z=0.5)
    
    mat_uaz = create_pbr_material("Mat_UAZ_Body", (0.28, 0.35, 0.24, 1.0), metallic=0.2, roughness=0.55)
    mat_rust = create_pbr_material("Mat_Rust", (0.35, 0.18, 0.10, 1.0), metallic=0.1, roughness=0.85)
    mat_glass = create_pbr_material("Mat_Glass", (0.15, 0.22, 0.28, 1.0), metallic=0.1, roughness=0.2)
    mat_rubber = create_pbr_material("Mat_Rubber", (0.08, 0.08, 0.09, 1.0), metallic=0.0, roughness=0.9)
    mat_red = create_pbr_material("Mat_Red_Cross", (0.75, 0.12, 0.10, 1.0), metallic=0.0, roughness=0.6)
    
    # 1. Main loaf hull (rounded box)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.48))
    hull = bpy.context.active_object
    hull.scale = (2.3, 1.05, 0.68)
    bpy.ops.object.transform_apply(scale=True)
    hull.data.materials.append(mat_uaz)
    
    # 2. Rounded front nose
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=(1.05, 0, 0.45))
    nose = bpy.context.active_object
    nose.scale = (0.5, 1.15, 0.72)
    bpy.ops.object.transform_apply(scale=True)
    nose.data.materials.append(mat_uaz)
    
    # Dual front windshield panels
    for side_y in [0.24, -0.24]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.12, side_y, 0.58))
        ws = bpy.context.active_object
        ws.scale = (0.06, 0.40, 0.24)
        ws.rotation_euler = (0, math.radians(22), 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        ws.data.materials.append(mat_glass)
        
    # Roof ribs (Corrugation)
    for rx in [-0.8, -0.5, -0.2, 0.1, 0.4, 0.7]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.98, location=(rx, 0, 0.83))
        rib = bpy.context.active_object
        rib.rotation_euler = (math.radians(90), 0, 0)
        rib.data.materials.append(mat_uaz)
        
    # Red cross on roof
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.1, 0, 0.84))
    rc1 = bpy.context.active_object
    rc1.scale = (0.35, 0.12, 0.02)
    rc1.data.materials.append(mat_red)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.1, 0, 0.84))
    rc2 = bpy.context.active_object
    rc2.scale = (0.12, 0.35, 0.02)
    rc2.data.materials.append(mat_red)
    
    # Wheels
    for wx in [0.72, -0.72]:
        for wy in [0.54, -0.54]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.14, location=(wx, wy, 0.15))
            wheel = bpy.context.active_object
            wheel.rotation_euler = (math.radians(90), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
            wheel.data.materials.append(mat_rubber)
            
    # Ground shadow
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.01))
    sh = bpy.context.active_object
    sh.scale = (2.6, 1.4, 1.0)
    sh.data.materials.append(create_pbr_material("Mat_Shadow", (0, 0, 0, 0.6), roughness=1.0))
    
    render_to_file('assets/sprites/props/car_uaz.png', 208, 140)

# =============================================================
# 3. 3D SOVIET TRASH DUMPSTER
# =============================================================
def build_trash_dumpster():
    clear_scene()
    setup_camera_and_light(cam_dist=6.0, ortho_scale=1.6, target_z=0.35)
    
    mat_bin = create_pbr_material("Mat_Bin_Green", (0.18, 0.28, 0.20, 1.0), metallic=0.4, roughness=0.6)
    mat_rust = create_pbr_material("Mat_Bin_Rust", (0.38, 0.22, 0.12, 1.0), metallic=0.2, roughness=0.8)
    mat_trash = create_pbr_material("Mat_Trash_Dark", (0.08, 0.08, 0.09, 1.0), metallic=0.0, roughness=0.9)
    mat_cardboard = create_pbr_material("Mat_Cardboard", (0.48, 0.35, 0.22, 1.0), metallic=0.0, roughness=0.9)
    
    # Tapered metal dumpster box
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.38))
    bin_body = bpy.context.active_object
    bin_body.scale = (0.75, 0.55, 0.55)
    bpy.ops.object.transform_apply(scale=True)
    bin_body.data.materials.append(mat_bin)
    
    # Rust along bottom rim
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.16))
    rust_base = bpy.context.active_object
    rust_base.scale = (0.76, 0.56, 0.18)
    rust_base.data.materials.append(mat_rust)
    
    # Trash bags and cardboard overflowing on top
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(-0.12, 0.05, 0.68))
    t1 = bpy.context.active_object
    t1.scale = (1.1, 0.9, 0.7)
    t1.data.materials.append(mat_trash)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.16, -0.04, 0.68))
    cb = bpy.context.active_object
    cb.scale = (0.24, 0.22, 0.16)
    cb.rotation_euler = (math.radians(12), math.radians(-15), math.radians(25))
    cb.data.materials.append(mat_cardboard)
    
    # Cast-iron wheels on bottom
    for wx in [0.32, -0.32]:
        for wy in [0.24, -0.24]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.04, location=(wx, wy, 0.05))
            w = bpy.context.active_object
            w.data.materials.append(mat_rust)
            
    # Shadow
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.01))
    sh = bpy.context.active_object
    sh.scale = (1.0, 0.8, 1.0)
    sh.data.materials.append(create_pbr_material("Mat_Shadow", (0, 0, 0, 0.6), roughness=1.0))
    
    render_to_file('assets/sprites/props/trash_dumpster.png', 128, 128)

# =============================================================
# 4. 3D SOVIET MILITARY CRATE
# =============================================================
def build_military_crate():
    clear_scene()
    setup_camera_and_light(cam_dist=5.0, ortho_scale=1.2, target_z=0.25)
    
    mat_wood = create_pbr_material("Mat_Ammo_Wood", (0.26, 0.32, 0.20, 1.0), metallic=0.0, roughness=0.75)
    mat_metal = create_pbr_material("Mat_Ammo_Corner", (0.18, 0.20, 0.22, 1.0), metallic=0.7, roughness=0.4)
    mat_brass = create_pbr_material("Mat_Padlock", (0.65, 0.52, 0.18, 1.0), metallic=0.8, roughness=0.3)
    
    # Main wooden crate
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.22))
    crate = bpy.context.active_object
    crate.scale = (0.65, 0.45, 0.32)
    bpy.ops.object.transform_apply(scale=True)
    crate.data.materials.append(mat_wood)
    
    # Metal corner brackets
    for cx in [0.32, -0.32]:
        for cy in [0.22, -0.22]:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cx, cy, 0.22))
            bracket = bpy.context.active_object
            bracket.scale = (0.06, 0.06, 0.33)
            bracket.data.materials.append(mat_metal)
            
    # Center latch and padlock
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.23, 0.25))
    latch = bpy.context.active_object
    latch.scale = (0.08, 0.02, 0.12)
    latch.data.materials.append(mat_metal)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.02, location=(0, -0.24, 0.20))
    lock = bpy.context.active_object
    lock.data.materials.append(mat_brass)
    
    # Shadow
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.01))
    sh = bpy.context.active_object
    sh.scale = (0.85, 0.65, 1.0)
    sh.data.materials.append(create_pbr_material("Mat_Shadow", (0, 0, 0, 0.6), roughness=1.0))
    
    render_to_file('assets/sprites/props/military_crate.png', 128, 128)

# =============================================================
# 5. 3D MIKHALYCH'S 24H SAFE ZONE STORE (200x150)
# =============================================================
def build_mikhalyh_shop():
    clear_scene()
    setup_camera_and_light(cam_dist=12.0, ortho_scale=4.2, target_z=0.7)
    
    mat_walls = create_pbr_material("Mat_Shop_Walls", (0.24, 0.28, 0.34, 1.0), metallic=0.1, roughness=0.6)
    mat_roof = create_pbr_material("Mat_Shop_Roof", (0.16, 0.20, 0.24, 1.0), metallic=0.4, roughness=0.5)
    mat_glass_lit = create_pbr_material("Mat_Shop_Interior", (0.85, 0.70, 0.32, 1.0), metallic=0.0, roughness=0.2, emission=(0.95, 0.75, 0.25, 1.0), emission_strength=2.2)
    mat_neon = create_pbr_material("Mat_Neon_Green", (0.1, 0.9, 0.5, 1.0), metallic=0.0, roughness=0.1, emission=(0.1, 1.0, 0.5, 1.0), emission_strength=4.0)
    mat_sandbag = create_pbr_material("Mat_Sandbags", (0.55, 0.48, 0.32, 1.0), metallic=0.0, roughness=0.85)
    mat_door = create_pbr_material("Mat_Shop_Door", (0.12, 0.14, 0.18, 1.0), metallic=0.6, roughness=0.4)
    
    # 1. Main building block
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.65))
    kiosk = bpy.context.active_object
    kiosk.scale = (2.8, 1.8, 1.2)
    bpy.ops.object.transform_apply(scale=True)
    kiosk.data.materials.append(mat_walls)
    
    # 2. Overhanging awning / roof
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.15, 1.32))
    roof = bpy.context.active_object
    roof.scale = (3.1, 2.1, 0.16)
    roof.rotation_euler = (math.radians(-5), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    roof.data.materials.append(mat_roof)
    
    # AC Unit on roof
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.85, 0.4, 1.55))
    ac = bpy.context.active_object
    ac.scale = (0.5, 0.35, 0.28)
    ac.data.materials.append(create_pbr_material("Mat_AC", (0.6, 0.65, 0.7, 1.0), roughness=0.4))
    
    # 3. Glowing shopfront glass window (front south face)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.91, 0.70))
    window = bpy.context.active_object
    window.scale = (2.4, 0.05, 0.75)
    window.data.materials.append(mat_glass_lit)
    
    # Window iron bars
    for bx in [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.8, location=(bx, -0.93, 0.70))
        bar = bpy.context.active_object
        bar.data.materials.append(mat_door)
        
    # Reinforced center security door
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.93, 0.55))
    door = bpy.context.active_object
    door.scale = (0.55, 0.04, 1.0)
    door.data.materials.append(mat_door)
    
    # 4. Glowing Neon Signboard over entrance
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -1.02, 1.25))
    sign = bpy.context.active_object
    sign.scale = (2.6, 0.06, 0.22)
    sign.data.materials.append(mat_neon)
    
    # 5. Sandbag fortifications in front
    for sx in [-1.1, -0.85, -0.6, 0.6, 0.85, 1.1]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(sx, -1.15, 0.16))
        sb = bpy.context.active_object
        sb.scale = (1.1, 0.7, 0.5)
        bpy.ops.object.transform_apply(scale=True)
        sb.data.materials.append(mat_sandbag)
        
        # Second layer of sandbags
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16, location=(sx + 0.05, -1.12, 0.32))
        sb2 = bpy.context.active_object
        sb2.scale = (1.1, 0.7, 0.5)
        bpy.ops.object.transform_apply(scale=True)
        sb2.data.materials.append(mat_sandbag)
        
    # Large shadow
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.01))
    sh = bpy.context.active_object
    sh.scale = (3.6, 2.6, 1.0)
    sh.data.materials.append(create_pbr_material("Mat_Shadow", (0, 0, 0, 0.65), roughness=1.0))
    
    render_to_file('assets/sprites/buildings/mikhalyh_shop.png', 256, 192)

if __name__ == "__main__":
    build_car_zhiguli()
    build_car_uaz()
    build_trash_dumpster()
    build_military_crate()
    build_mikhalyh_shop()
    print("ALL 3D ENVIRONMENT ASSETS RENDERED IN BLENDER!")
