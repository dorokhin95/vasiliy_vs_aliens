import bpy
import math
import os

os.makedirs('assets/sprites/props', exist_ok=True)
os.makedirs('assets/sprites/loot', exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def setup_camera_and_light(cam_dist=10.0, ortho_scale=3.5, target_z=0.5):
    # Camera matching 2.5D orthographic top-down perspective (pitch 32 deg from horizontal)
    pitch_deg = 32.0
    pitch_rad = math.radians(pitch_deg)
    
    cam_y = -cam_dist * math.cos(pitch_rad)
    cam_z = target_z + cam_dist * math.sin(pitch_rad)
    
    bpy.ops.object.camera_add(location=(0, cam_y, cam_z))
    cam = bpy.context.active_object
    cam.name = "RenderCamera"
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = ortho_scale
    bpy.context.scene.camera = cam
    
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, target_z))
    target = bpy.context.active_object
    
    tt = cam.constraints.new(type='TRACK_TO')
    tt.target = target
    tt.track_axis = 'TRACK_NEGATIVE_Z'
    tt.up_axis = 'UP_Y'
    
    # Key light: crisp warm sunlight
    bpy.ops.object.light_add(type='SUN', location=(5, -6, 8))
    sun = bpy.context.active_object
    sun.data.energy = 4.5
    sun.data.color = (1.0, 0.96, 0.90)
    sun.rotation_euler = (math.radians(45), math.radians(25), math.radians(-30))
    
    # Fill light: sky ambient
    bpy.ops.object.light_add(type='SUN', location=(-5, 4, 6))
    fill = bpy.context.active_object
    fill.data.energy = 2.4
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

def add_ground_shadow(scale_x, scale_y, offset_x=0.08, offset_y=-0.08):
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(offset_x, offset_y, 0.005))
    sh = bpy.context.active_object
    sh.scale = (scale_x, scale_y, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    sh.data.materials.append(create_pbr_material("Mat_Shadow_Soft", (0.01, 0.01, 0.02, 0.65), roughness=1.0))

# =============================================================
# 1. SOVIET LADA ZHIGULI SEDAN (VAZ-2105/2107)
# Реальные габариты: длина 4.1м, ширина 1.6м, высота 1.4м
# В сцене: scale=(4.1, 1.65, 1.4) / 2 = (2.05, 0.82, 0.7)
# =============================================================
def build_car_zhiguli():
    clear_scene()
    setup_camera_and_light(cam_dist=9.0, ortho_scale=3.8, target_z=0.45)
    
    mat_body = create_pbr_material("Mat_Zhiguli_Paint", (0.58, 0.14, 0.12, 1.0), metallic=0.35, roughness=0.45)
    mat_rust = create_pbr_material("Mat_Rust_Deep", (0.35, 0.17, 0.08, 1.0), metallic=0.1, roughness=0.9)
    mat_glass = create_pbr_material("Mat_Glass_Tint", (0.12, 0.18, 0.24, 1.0), metallic=0.2, roughness=0.15)
    mat_chrome = create_pbr_material("Mat_Bumper_Chrome", (0.80, 0.82, 0.85, 1.0), metallic=0.88, roughness=0.2)
    mat_tire = create_pbr_material("Mat_Tire_Rubber", (0.08, 0.08, 0.09, 1.0), metallic=0.0, roughness=0.92)
    mat_interior = create_pbr_material("Mat_Interior_Dark", (0.05, 0.05, 0.06, 1.0), metallic=0.0, roughness=0.8)
    
    # 1. Шасси / кузов
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.28))
    body = bpy.context.active_object
    body.scale = (2.3, 0.96, 0.36)
    bpy.ops.object.transform_apply(scale=True)
    body.data.materials.append(mat_body)
    
    # Капот (чуть скошенный и помятый)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.78, 0, 0.38))
    hood = bpy.context.active_object
    hood.scale = (0.74, 0.92, 0.14)
    bpy.ops.object.transform_apply(scale=True)
    hood.data.materials.append(mat_body)
    
    # Багажник
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.78, 0, 0.38))
    trunk = bpy.context.active_object
    trunk.scale = (0.72, 0.92, 0.14)
    bpy.ops.object.transform_apply(scale=True)
    trunk.data.materials.append(mat_body)
    
    # Кабина с салоном и крышей
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.05, 0, 0.62))
    roof = bpy.context.active_object
    roof.scale = (1.25, 0.86, 0.36)
    bpy.ops.object.transform_apply(scale=True)
    roof.data.materials.append(mat_body)
    
    # Лобовое стекло (наклонное)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.54, 0, 0.58))
    ws = bpy.context.active_object
    ws.scale = (0.16, 0.82, 0.28)
    ws.rotation_euler = (0, math.radians(38), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    ws.data.materials.append(mat_glass)
    
    # Заднее стекло
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.65, 0, 0.58))
    rw = bpy.context.active_object
    rw.scale = (0.16, 0.82, 0.28)
    rw.rotation_euler = (0, math.radians(-34), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    rw.data.materials.append(mat_glass)
    
    # Боковые стекла
    for sy in [0.44, -0.44]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.05, sy, 0.62))
        side_glass = bpy.context.active_object
        side_glass.scale = (1.1, 0.04, 0.24)
        bpy.ops.object.transform_apply(scale=True)
        side_glass.data.materials.append(mat_glass)
        
    # Хромированная радиаторная решетка
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.16, 0, 0.32))
    grille = bpy.context.active_object
    grille.scale = (0.04, 0.78, 0.18)
    bpy.ops.object.transform_apply(scale=True)
    grille.data.materials.append(mat_interior)
    
    # Квадратные советские фары (одна целая, одна разбита с ржавчиной)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.16, 0.34, 0.32))
    hl1 = bpy.context.active_object
    hl1.scale = (0.05, 0.16, 0.14)
    bpy.ops.object.transform_apply(scale=True)
    hl1.data.materials.append(create_pbr_material("Mat_HL1", (0.95, 0.90, 0.70, 1.0), emission=(0.95, 0.90, 0.50, 1.0), emission_strength=1.5))
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.16, -0.34, 0.32))
    hl2 = bpy.context.active_object
    hl2.scale = (0.05, 0.16, 0.14)
    bpy.ops.object.transform_apply(scale=True)
    hl2.data.materials.append(mat_rust)
    
    # Бамперы
    for bx in [1.18, -1.18]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, 0, 0.20))
        bmp = bpy.context.active_object
        bmp.scale = (0.08, 0.98, 0.10)
        bpy.ops.object.transform_apply(scale=True)
        bmp.data.materials.append(mat_chrome)
        
    # Колеса (спущенные)
    for wx in [0.72, -0.72]:
        for wy in [0.46, -0.46]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.20, depth=0.15, location=(wx, wy, 0.12))
            wh = bpy.context.active_object
            wh.rotation_euler = (math.radians(90), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
            wh.data.materials.append(mat_tire)
            
    # Следы ржавчины на порогах и крыльях
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.7, 0.49, 0.22))
    rust_fender = bpy.context.active_object
    rust_fender.scale = (0.35, 0.05, 0.14)
    rust_fender.data.materials.append(mat_rust)
    
    add_ground_shadow(2.7, 1.45)
    render_to_file('assets/sprites/props/car_zhiguli.png', 256, 160)

# =============================================================
# 2. SOVIET UAZ-452 BUKHANKA AMBULANCE VAN
# Реальные габариты: длина 4.4м, ширина 1.9м, высота 2.1м
# =============================================================
def build_car_uaz():
    clear_scene()
    setup_camera_and_light(cam_dist=9.5, ortho_scale=4.2, target_z=0.6)
    
    mat_body = create_pbr_material("Mat_UAZ_Khaki", (0.32, 0.38, 0.28, 1.0), metallic=0.18, roughness=0.6)
    mat_rust = create_pbr_material("Mat_Rust_Deep", (0.35, 0.17, 0.08, 1.0), metallic=0.1, roughness=0.9)
    mat_glass = create_pbr_material("Mat_Glass_Tint", (0.12, 0.18, 0.24, 1.0), metallic=0.2, roughness=0.15)
    mat_red = create_pbr_material("Mat_Red_Cross", (0.75, 0.12, 0.10, 1.0), metallic=0.0, roughness=0.6)
    mat_white = create_pbr_material("Mat_White_Circle", (0.85, 0.85, 0.82, 1.0), metallic=0.0, roughness=0.7)
    mat_tire = create_pbr_material("Mat_Tire_Rubber", (0.08, 0.08, 0.09, 1.0), metallic=0.0, roughness=0.92)
    
    # 1. Основной кузов буханки
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.58))
    hull = bpy.context.active_object
    hull.scale = (2.5, 1.15, 0.85)
    bpy.ops.object.transform_apply(scale=True)
    hull.data.materials.append(mat_body)
    
    # 2. Округлая передняя «морда»
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.55, location=(1.15, 0, 0.56))
    nose = bpy.context.active_object
    nose.scale = (0.55, 1.25, 0.88)
    bpy.ops.object.transform_apply(scale=True)
    nose.data.materials.append(mat_body)
    
    # 3. Сдвоенное лобовое стекло буханки
    for sy in [0.28, -0.28]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.26, sy, 0.72))
        ws = bpy.context.active_object
        ws.scale = (0.08, 0.45, 0.32)
        ws.rotation_euler = (0, math.radians(24), 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        ws.data.materials.append(mat_glass)
        
    # 4. Боковые салонные окна
    for sx in [0.4, -0.2, -0.8]:
        for sy in [0.58, -0.58]:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, sy, 0.72))
            win = bpy.context.active_object
            win.scale = (0.45, 0.04, 0.28)
            bpy.ops.object.transform_apply(scale=True)
            win.data.materials.append(mat_glass)
            
    # 5. Ребра жесткости на крыше (штамповка)
    for rx in [-0.9, -0.6, -0.3, 0.0, 0.3, 0.6, 0.9]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=1.05, location=(rx, 0, 1.02))
        rib = bpy.context.active_object
        rib.rotation_euler = (math.radians(90), 0, 0)
        rib.data.materials.append(mat_body)
        
    # 6. Санитарный знак (Красный Крест) на крыше
    bpy.ops.mesh.primitive_cylinder_add(radius=0.32, depth=0.03, location=(-0.1, 0, 1.04))
    circle = bpy.context.active_object
    circle.data.materials.append(mat_white)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.1, 0, 1.06))
    rc1 = bpy.context.active_object
    rc1.scale = (0.42, 0.14, 0.02)
    rc1.data.materials.append(mat_red)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.1, 0, 1.06))
    rc2 = bpy.context.active_object
    rc2.scale = (0.14, 0.42, 0.02)
    rc2.data.materials.append(mat_red)
    
    # Круглые советские фары
    for sy in [0.38, -0.38]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.06, location=(1.36, sy, 0.42))
        hl = bpy.context.active_object
        hl.rotation_euler = (0, math.radians(90), 0)
        hl.data.materials.append(create_pbr_material(f"Mat_UAZ_HL_{sy}", (0.9, 0.88, 0.75, 1.0), roughness=0.2))
        
    # Высокие внедорожные колеса УАЗ
    for wx in [0.78, -0.78]:
        for wy in [0.56, -0.56]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.26, depth=0.18, location=(wx, wy, 0.20))
            wh = bpy.context.active_object
            wh.rotation_euler = (math.radians(90), 0, 0)
            wh.data.materials.append(mat_tire)
            
    add_ground_shadow(3.0, 1.65)
    render_to_file('assets/sprites/props/car_uaz.png', 256, 170)

# =============================================================
# 3. SOVIET METAL TRASH DUMPSTER (Контейнер ТБО 0.75 м3)
# Реальные габариты: ширина 1.0м, глубина 0.8м, высота 1.1м
# =============================================================
def build_trash_dumpster():
    clear_scene()
    setup_camera_and_light(cam_dist=6.5, ortho_scale=2.2, target_z=0.45)
    
    mat_bin = create_pbr_material("Mat_Bin_Soviet_Green", (0.22, 0.32, 0.24, 1.0), metallic=0.45, roughness=0.55)
    mat_rust = create_pbr_material("Mat_Bin_Rust", (0.38, 0.20, 0.10, 1.0), metallic=0.15, roughness=0.88)
    mat_bag = create_pbr_material("Mat_Trash_Bag", (0.06, 0.06, 0.08, 1.0), metallic=0.1, roughness=0.6)
    mat_box = create_pbr_material("Mat_Cardboard", (0.52, 0.40, 0.26, 1.0), metallic=0.0, roughness=0.9)
    mat_metal_rim = create_pbr_material("Mat_Metal_Rim", (0.16, 0.18, 0.20, 1.0), metallic=0.7, roughness=0.4)
    
    # Скошенный корпус советского бака
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.48))
    body = bpy.context.active_object
    body.scale = (0.95, 0.75, 0.68)
    bpy.ops.object.transform_apply(scale=True)
    body.data.materials.append(mat_bin)
    
    # Уголки усиления и верхний бортик
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.83))
    rim = bpy.context.active_object
    rim.scale = (1.02, 0.82, 0.06)
    rim.data.materials.append(mat_metal_rim)
    
    # Ржавчина снизу (коррозия дна)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.20))
    rust_bottom = bpy.context.active_object
    rust_bottom.scale = (0.96, 0.76, 0.22)
    rust_bottom.data.materials.append(mat_rust)
    
    # Черные мусорные пакеты с отходами
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.26, location=(-0.16, 0.06, 0.88))
    bag1 = bpy.context.active_object
    bag1.scale = (1.1, 0.9, 0.75)
    bag1.data.materials.append(mat_bag)
    
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(0.14, 0.12, 0.86))
    bag2 = bpy.context.active_object
    bag2.scale = (1.0, 1.1, 0.7)
    bag2.data.materials.append(mat_bag)
    
    # Торчащая картонная коробка
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.18, -0.12, 0.88))
    cbox = bpy.context.active_object
    cbox.scale = (0.32, 0.28, 0.24)
    cbox.rotation_euler = (math.radians(15), math.radians(-18), math.radians(30))
    cbox.data.materials.append(mat_box)
    
    # Маленькие металлические колесики
    for wx in [0.42, -0.42]:
        for wy in [0.32, -0.32]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.05, location=(wx, wy, 0.07))
            wheel = bpy.context.active_object
            wheel.data.materials.append(mat_rust)
            
    add_ground_shadow(1.35, 1.15)
    render_to_file('assets/sprites/props/trash_dumpster.png', 160, 160)

# =============================================================
# 4. SOVIET MILITARY AMMO CRATE (Ящик для боеприпасов)
# Реальные габариты: 0.85м x 0.55м x 0.4м
# =============================================================
def build_military_crate():
    clear_scene()
    setup_camera_and_light(cam_dist=5.5, ortho_scale=1.7, target_z=0.3)
    
    mat_wood = create_pbr_material("Mat_Ammo_Olive", (0.28, 0.35, 0.22, 1.0), metallic=0.0, roughness=0.78)
    mat_metal = create_pbr_material("Mat_Iron_Band", (0.16, 0.18, 0.20, 1.0), metallic=0.75, roughness=0.38)
    mat_brass = create_pbr_material("Mat_Padlock_Brass", (0.72, 0.58, 0.20, 1.0), metallic=0.85, roughness=0.25)
    mat_stencil = create_pbr_material("Mat_Stencil_Text", (0.85, 0.85, 0.80, 1.0), metallic=0.0, roughness=0.9)
    
    # 1. Основной ящик из досок
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.28))
    crate = bpy.context.active_object
    crate.scale = (0.85, 0.58, 0.40)
    bpy.ops.object.transform_apply(scale=True)
    crate.data.materials.append(mat_wood)
    
    # 2. Металлические полосы жесткости по периметру
    for sx in [0.28, -0.28]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, 0, 0.28))
        band = bpy.context.active_object
        band.scale = (0.05, 0.59, 0.41)
        band.data.materials.append(mat_metal)
        
    # Металлические защитные уголки
    for cx in [0.42, -0.42]:
        for cy in [0.28, -0.28]:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cx, cy, 0.28))
            corner = bpy.context.active_object
            corner.scale = (0.06, 0.06, 0.42)
            corner.data.materials.append(mat_metal)
            
    # Ручки для переноски по бокам
    for rx in [0.44, -0.44]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.018, location=(rx, 0, 0.28))
        handle = bpy.context.active_object
        handle.rotation_euler = (0, math.radians(90), 0)
        handle.data.materials.append(mat_metal)
        
    # Центральный замок и скоба
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.30, 0.32))
    hasp = bpy.context.active_object
    hasp.scale = (0.10, 0.02, 0.14)
    hasp.data.materials.append(mat_metal)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.025, location=(0, -0.31, 0.26))
    lock = bpy.context.active_object
    lock.data.materials.append(mat_brass)
    
    # Военная трафаретная маркировка на крышке
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.49))
    stencil = bpy.context.active_object
    stencil.scale = (0.35, 0.18, 0.01)
    stencil.data.materials.append(mat_stencil)
    
    add_ground_shadow(1.15, 0.85)
    render_to_file('assets/sprites/props/military_crate.png', 160, 160)

# =============================================================
# 5. ИКОНКИ ВЫПАДАЮЩИХ РЕСУРСОВ (LOOT DROPS)
# 3D рендеры для: scrap (шестеренка/металлолом), bottle (бутылка),
# stew (банка тушенки), vodka (бутылка «Столичная»), bandage (аптечка)
# =============================================================
def build_loot_scrap():
    clear_scene()
    setup_camera_and_light(cam_dist=4.0, ortho_scale=1.1, target_z=0.15)
    mat_gear = create_pbr_material("Mat_Steel_Gear", (0.55, 0.58, 0.62, 1.0), metallic=0.88, roughness=0.3)
    mat_copper = create_pbr_material("Mat_Copper_Bolt", (0.80, 0.45, 0.25, 1.0), metallic=0.85, roughness=0.35)
    
    # Шестеренка
    bpy.ops.mesh.primitive_cylinder_add(radius=0.30, depth=0.12, location=(0, 0, 0.12))
    gear = bpy.context.active_object
    gear.data.materials.append(mat_gear)
    
    # Зубья шестерни
    for i in range(8):
        ang = (i / 8.0) * math.pi * 2
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(math.cos(ang) * 0.32, math.sin(ang) * 0.32, 0.12))
        tooth = bpy.context.active_object
        tooth.scale = (0.12, 0.12, 0.12)
        tooth.rotation_euler = (0, 0, ang)
        tooth.data.materials.append(mat_gear)
        
    # Болт и гайка рядом
    bpy.ops.mesh.primitive_cylinder_add(radius=0.10, depth=0.22, location=(0.25, -0.22, 0.11))
    bolt = bpy.context.active_object
    bolt.rotation_euler = (math.radians(90), 0, math.radians(45))
    bolt.data.materials.append(mat_copper)
    
    add_ground_shadow(0.85, 0.85)
    render_to_file('assets/sprites/loot/loot_scrap.png', 96, 96)

def build_loot_bottle():
    clear_scene()
    setup_camera_and_light(cam_dist=4.0, ortho_scale=1.1, target_z=0.2)
    mat_glass = create_pbr_material("Mat_Green_Bottle", (0.12, 0.45, 0.20, 1.0), metallic=0.15, roughness=0.15)
    mat_label = create_pbr_material("Mat_Bottle_Label", (0.92, 0.90, 0.82, 1.0), metallic=0.0, roughness=0.7)
    mat_cap = create_pbr_material("Mat_Crown_Cap", (0.85, 0.70, 0.15, 1.0), metallic=0.8, roughness=0.25)
    
    # Тело бутылки
    bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=0.36, location=(0, 0, 0.18))
    body = bpy.context.active_object
    body.data.materials.append(mat_glass)
    
    # Горлышко
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.22, location=(0, 0, 0.44))
    neck = bpy.context.active_object
    neck.data.materials.append(mat_glass)
    
    # Крышка
    bpy.ops.mesh.primitive_cylinder_add(radius=0.068, depth=0.04, location=(0, 0, 0.56))
    cap = bpy.context.active_object
    cap.data.materials.append(mat_cap)
    
    # Этикетка
    bpy.ops.mesh.primitive_cylinder_add(radius=0.145, depth=0.18, location=(0, 0, 0.18))
    lbl = bpy.context.active_object
    lbl.data.materials.append(mat_label)
    
    add_ground_shadow(0.65, 0.65)
    render_to_file('assets/sprites/loot/loot_bottle.png', 96, 96)

def build_loot_stew():
    clear_scene()
    setup_camera_and_light(cam_dist=3.8, ortho_scale=0.95, target_z=0.18)
    mat_tin = create_pbr_material("Mat_Tin_Can", (0.78, 0.80, 0.82, 1.0), metallic=0.85, roughness=0.25)
    mat_label = create_pbr_material("Mat_Stew_Label", (0.75, 0.15, 0.12, 1.0), metallic=0.0, roughness=0.6) # Красная советская ГОСТ этикетка
    mat_cow = create_pbr_material("Mat_Stew_Cow", (0.95, 0.95, 0.90, 1.0), metallic=0.0, roughness=0.8)
    
    # Жестяная банка
    bpy.ops.mesh.primitive_cylinder_add(radius=0.24, depth=0.30, location=(0, 0, 0.15))
    can = bpy.context.active_object
    can.data.materials.append(mat_tin)
    
    # Бумажная красная этикетка
    bpy.ops.mesh.primitive_cylinder_add(radius=0.245, depth=0.22, location=(0, 0, 0.15))
    lbl = bpy.context.active_object
    lbl.data.materials.append(mat_label)
    
    # Белая эмблема коровы/ГОСТ
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.248, 0.15))
    badge = bpy.context.active_object
    badge.scale = (0.16, 0.01, 0.10)
    badge.data.materials.append(mat_cow)
    
    add_ground_shadow(0.75, 0.75)
    render_to_file('assets/sprites/loot/loot_stew.png', 96, 96)

def build_loot_vodka():
    clear_scene()
    setup_camera_and_light(cam_dist=4.2, ortho_scale=1.1, target_z=0.24)
    mat_glass = create_pbr_material("Mat_Clear_Glass", (0.85, 0.90, 0.95, 0.8), metallic=0.1, roughness=0.1)
    mat_label = create_pbr_material("Mat_Vodka_White", (0.92, 0.92, 0.90, 1.0), metallic=0.0, roughness=0.6)
    mat_gold = create_pbr_material("Mat_Gold_Medal", (0.85, 0.72, 0.22, 1.0), metallic=0.85, roughness=0.25)
    mat_foil = create_pbr_material("Mat_Red_Foil_Cap", (0.75, 0.10, 0.10, 1.0), metallic=0.7, roughness=0.3)
    
    # Стеклянная бутылка белого стекла
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.38, location=(0, 0, 0.19))
    body = bpy.context.active_object
    body.data.materials.append(mat_glass)
    
    # Горлышко
    bpy.ops.mesh.primitive_cylinder_add(radius=0.065, depth=0.24, location=(0, 0, 0.48))
    neck = bpy.context.active_object
    neck.data.materials.append(mat_glass)
    
    # Красная бескозырка/фольга
    bpy.ops.mesh.primitive_cylinder_add(radius=0.072, depth=0.06, location=(0, 0, 0.61))
    cap = bpy.context.active_object
    cap.data.materials.append(mat_foil)
    
    # Этикетка с золотыми медалями
    bpy.ops.mesh.primitive_cylinder_add(radius=0.154, depth=0.22, location=(0, 0, 0.19))
    lbl = bpy.context.active_object
    lbl.data.materials.append(mat_label)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.156, 0.19))
    medal = bpy.context.active_object
    medal.scale = (0.14, 0.01, 0.08)
    medal.data.materials.append(mat_gold)
    
    add_ground_shadow(0.7, 0.7)
    render_to_file('assets/sprites/loot/loot_vodka.png', 96, 96)

def build_loot_bandage():
    clear_scene()
    setup_camera_and_light(cam_dist=3.8, ortho_scale=0.95, target_z=0.14)
    mat_gauze = create_pbr_material("Mat_Gauze_White", (0.90, 0.88, 0.84, 1.0), metallic=0.0, roughness=0.9)
    mat_paper = create_pbr_material("Mat_Bandage_Paper", (0.42, 0.62, 0.48, 1.0), metallic=0.0, roughness=0.75) # Аптечная зеленая лента
    mat_red = create_pbr_material("Mat_Med_Red", (0.75, 0.12, 0.10, 1.0), metallic=0.0, roughness=0.6)
    
    # Рулон стерильного бинта
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.18, location=(0, 0, 0.09))
    roll = bpy.context.active_object
    roll.rotation_euler = (math.radians(90), 0, 0)
    roll.data.materials.append(mat_gauze)
    
    # Бумажная бандероль
    bpy.ops.mesh.primitive_cylinder_add(radius=0.224, depth=0.10, location=(0, 0, 0.09))
    band = bpy.context.active_object
    band.rotation_euler = (math.radians(90), 0, 0)
    band.data.materials.append(mat_paper)
    
    # Красный крестик
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.102, 0.09))
    rc = bpy.context.active_object
    rc.scale = (0.08, 0.01, 0.08)
    rc.data.materials.append(mat_red)
    
    add_ground_shadow(0.7, 0.7)
    render_to_file('assets/sprites/loot/loot_bandage.png', 96, 96)

if __name__ == '__main__':
    print("--- 1. RENDERING 3D CARS & CONTAINERS WITH TRUE 2.5D PROPORTIONS ---")
    build_car_zhiguli()
    build_car_uaz()
    build_trash_dumpster()
    build_military_crate()
    
    print("--- 2. RENDERING HIGH-DETAIL 3D LOOT ITEMS ---")
    build_loot_scrap()
    build_loot_bottle()
    build_loot_stew()
    build_loot_vodka()
    build_loot_bandage()
    print("ALL ENVIRONMENT & LOOT ASSETS RENDERED SUCCESSFULLY!")
