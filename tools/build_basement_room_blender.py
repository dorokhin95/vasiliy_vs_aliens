"""
Логово Василия (src/basement.js): комната подвала — фон карты 'basement', собранный кодом в Blender и отрендеренный
камерой игры (орто, спереди, 28° — как кадры моделей в src/three_props.js), поэтому мебель-модели встают на пол.

  - Комната ROOM_W × ROOM_D м, фасад (камера) — со стороны -Y; задняя стена — кирпич с побелкой, трубы,
    продухи; боковые стены видны верхом; пол — бетон с трещинами; колонны, лестница к двери, лампочка.
  - Масштаб: PX_PER_M пикселей на метр по горизонтали (как люди и модели в игре), рендер ×2 для резкости.
  - Выход: assets/sprites/basement/room.webp и room.json — где в картинке передний левый угол пола
    (как перевести метры комнаты в пиксели мира — src/basement.js).

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/build_basement_room_blender.py
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_workshop_props_blender as W  # noqa: E402  материалы и детали

ROOT = W.ROOT
OUT_DIR = os.path.join(ROOT, 'assets', 'sprites', 'basement')
ROOM_W, ROOM_D, WALL_H, WALL_T = 22.0, 18.0, 2.8, 0.45
PITCH = 28.0
PX_PER_M = 42
SS = 2                       # рендер ×2
MARGIN = 0.6                 # поля вокруг комнаты, м


def mat_brick(name):
    t = W.NT(name)
    br = t.node('ShaderNodeTexBrick', offset=0.5, squash=1.0)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Brick Width'].default_value = 0.25
    br.inputs['Row Height'].default_value = 0.075
    br.inputs['Mortar Size'].default_value = 0.012
    br.inputs['Color1'].default_value = W.hex_rgb('#7a3e2c')
    br.inputs['Color2'].default_value = W.hex_rgb('#5e2f22')
    br.inputs['Mortar'].default_value = W.hex_rgb('#8a8378')
    m = t.node('ShaderNodeMapping')
    m.inputs['Rotation'].default_value = (math.pi / 2, 0, 0)     # кирпич на стене XZ
    t.link(t.coord(), m.inputs['Vector'])
    t.link(m.outputs['Vector'], br.inputs['Vector'])
    col = t.mix(t.math('MULTIPLY', t.noise(3.0, 6), 0.4), br.outputs['Color'], W.hex_rgb('#2e1a12'))
    # Побелка: облезла пятнами, снизу грязь
    white = t.ramp(t.noise(0.9, 8, 0.65), [(0.42, 0.0), (0.58, 1.0)])
    col = t.mix(t.math('MULTIPLY', white, 0.85), col, W.hex_rgb('#b7b2a4'))
    geo = t.node('ShaderNodeNewGeometry')
    z = t.node('ShaderNodeSeparateXYZ')
    t.link(geo.outputs['Position'], z.inputs[0])
    low = t.ramp(z.outputs['Z'], [(0.0, 1.0), (0.9, 0.0)])
    col = t.mix(t.math('MULTIPLY', low, 0.7), col, W.hex_rgb('#2a241c'))
    col = t.mix(t.math('MULTIPLY', t.math('SUBTRACT', 1.0, t.ao(0.25)), 0.8), col, W.hex_rgb('#15110d'))
    return t.out(col)


def mat_concrete(name):
    t = W.NT(name)
    col = t.mix(t.ramp(t.noise(0.7, 8, 0.6), [(0.3, 0.0), (0.7, 1.0)]), W.hex_rgb('#3e3d39'), W.hex_rgb('#5d5b55'))
    # Плиты 3×3 м: стыки — «кирпич» с крупными кирпичами, тон плиты чуть разный
    br = t.node('ShaderNodeTexBrick', offset=0.0, squash=1.0)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Brick Width'].default_value = 3.0
    br.inputs['Row Height'].default_value = 3.0
    br.inputs['Mortar Size'].default_value = 0.015
    br.inputs['Color1'].default_value = (1, 1, 1, 1)
    br.inputs['Color2'].default_value = (0.82, 0.82, 0.82, 1)
    br.inputs['Mortar'].default_value = (0.55, 0.55, 0.55, 1)
    t.link(t.coord(), br.inputs['Vector'])
    col = t.mix(1.0, col, br.outputs['Color'], 'MULTIPLY')
    # Редкие тонкие трещины
    vor = t.node('ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE')
    vor.inputs['Scale'].default_value = 0.45
    t.link(t.coord(), vor.inputs['Vector'])
    crack = t.math('MULTIPLY', t.ramp(vor.outputs['Distance'], [(0.0, 1.0), (0.006, 0.0)]),
                   t.ramp(t.noise(1.2, 4), [(0.5, 0.0), (0.62, 1.0)]))
    col = t.mix(t.math('MULTIPLY', crack, 0.7), col, W.hex_rgb('#1a1916'))
    stains = t.ramp(t.noise(0.35, 6, 0.6), [(0.55, 0.0), (0.75, 1.0)])
    col = t.mix(t.math('MULTIPLY', stains, 0.55), col, W.hex_rgb('#24221d'))
    col = t.mix(t.math('MULTIPLY', t.math('SUBTRACT', 1.0, t.ao(0.4)), 0.85), col, W.hex_rgb('#100e0b'))
    return t.out(col)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    W.PARTS = []
    W._font = None
    brick = mat_brick('brick')
    conc = mat_concrete('concrete')
    plaster = W.mat_paint('plaster', '#8e8a80', wear=0.3, rust=0.2, bare='#6d675d')
    pipe_ins = W.mat_paint('pipe_ins', '#7c7a72', wear=0.5, rust=0.6, bare='#9b9890')
    rusty = W.mat_paint('pipe', '#5a3a26', wear=0.4, rust=1.0, bare='#7a6a5a')
    door = W.mat_paint('door', '#3f4a52', wear=0.9, rust=0.9)
    dsteel = W.mat_steel('dsteel', '#3a3d41', 0.25)
    paper = W.mat_flat('paper', '#9c9584')
    water = W.mat_flat('water', '#2c3234')
    bulb = W.mat_flat('bulb', '#fff3c4')
    cable = W.mat_rubber('cable')
    red = W.mat_paint('valve', '#8a2620', wear=0.7, rust=0.6)

    hw, d = ROOM_W / 2, ROOM_D
    # Пол
    W.box((ROOM_W + 2 * WALL_T, d + WALL_T, 0.2), (0, d / 2 - WALL_T / 2 + WALL_T, -0.1), conc, bevel=0.0)
    # Задняя стена и боковые
    W.box((ROOM_W + 2 * WALL_T, WALL_T, WALL_H), (0, d + WALL_T / 2, WALL_H / 2), brick, bevel=0.01)
    for sx in (-1, 1):
        W.box((WALL_T, d, WALL_H), (sx * (hw + WALL_T / 2), d / 2, WALL_H / 2), brick, bevel=0.01)
    # Цоколь штукатурки у стены
    W.box((ROOM_W, 0.06, 0.35), (0, d - 0.03, 0.175), plaster, bevel=0.005)
    # Колонны
    for x in (-4.0, 4.0):
        W.box((0.5, 0.5, WALL_H), (x, 9.0, WALL_H / 2), plaster, bevel=0.02)
    # Трубы теплотрассы вдоль задней стены, кронштейны, вентиль, стояк
    for z, r, m in ((2.35, 0.13, pipe_ins), (1.95, 0.09, rusty)):
        W.cyl(r, ROOM_W, (0, d - 0.35, z), m, rot=(0, math.pi / 2, 0), verts=20)
        for x in range(-10, 11, 3):
            W.box((0.05, 0.3, 0.05), (x, d - 0.2, z - r - 0.02), dsteel, bevel=0.005)
    W.cyl(0.09, WALL_H, (8.6, d - 0.35, WALL_H / 2), rusty, verts=18)
    W.torus(0.16, 0.02, (8.6, d - 0.55, 1.2), red, rot=(math.pi / 2, 0, 0), maj=20, mnr=8)
    W.cyl(0.03, 0.2, (8.6, d - 0.45, 1.2), dsteel, rot=(math.pi / 2, 0, 0), verts=10)
    # Продухи под потолком: тёмные проёмы с решёткой
    for x in (-2.0, 3.5, 9.0):
        W.box((0.8, 0.1, 0.4), (x, d + 0.02, 2.45), W.mat_flat('void', '#0b0d10'), bevel=0.0)
        for k in range(5):
            W.box((0.025, 0.06, 0.42), (x - 0.32 + k * 0.16, d - 0.03, 2.45), dsteel, bevel=0.0)
    # Лестница к двери: ступени поднимаются к задней стене, дверь наверху
    sx0, sw = -8.0, 2.2
    for i in range(5):
        W.box((sw, 0.42, 0.16 * (i + 1)), (sx0, d - 2.7 + i * 0.42 + 0.21, 0.08 * (i + 1)), plaster, bevel=0.01)
    W.box((sw, 0.6, 0.8), (sx0, d - 0.3, 0.4), plaster, bevel=0.01)            # площадка
    W.box((1.1, 0.1, 1.9), (sx0, d - 0.02, 0.8 + 0.95), door, bevel=0.01)       # дверь
    W.box((1.25, 0.06, 0.08), (sx0, d - 0.06, 2.72), dsteel, bevel=0.004)       # притолока
    W.box((0.06, 0.07, 0.14), (sx0 + 0.4, d - 0.09, 1.75), dsteel, bevel=0.004)
    for x in (sx0 - sw / 2 - 0.05, sx0 + sw / 2 + 0.05):                        # перила
        W.tube([(x, d - 2.7, 0.95), (x, d - 0.6, 1.75)], 0.025, dsteel, smooth=False)
        W.cyl(0.02, 0.95, (x, d - 2.7, 0.475), dsteel, verts=8)
    # Лампочка на проводе посреди комнаты
    W.tube([(0, 8.0, 4.5), (0, 8.0, 2.5)], 0.008, cable, smooth=False)
    W.cyl(0.035, 0.08, (0, 8.0, 2.47), dsteel, verts=12)
    W.sphere(0.06, (0, 8.0, 2.38), bulb, seg=16, rings=10)
    # Мелочи на полу: газеты, лужа, решётка слива
    for x, y, a in ((2.5, 3.0, 0.3), (-6.0, 5.5, -0.5), (6.5, 12.0, 1.1)):
        W.box((0.45, 0.32, 0.004), (x, y, 0.002), paper, rot=(0, 0, a), bevel=0.0)
    W.cyl(1.0, 0.003, (-1.5, 4.5, 0.0015), water, verts=32, bevel=0.0)        # лужа
    W.PARTS[-1].scale = (1.4, 0.65, 1)
    W.box((0.5, 0.5, 0.01), (5.5, 6.0, 0.005), dsteel, bevel=0.002)
    return {'bulb': (0, 8.0, 2.38)}


def render(info):
    obj = W.join_all('room')
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.film_transparent = True
    sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    bg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.55, 0.62, 0.8, 1)
    bg.inputs['Strength'].default_value = 0.45
    # Лампочка — тёплый точечный свет; из продухов — холодный слабый
    ld = bpy.data.lights.new('bulb', 'POINT')
    ld.energy = 1800
    ld.color = (1.0, 0.82, 0.55)
    ld.shadow_soft_size = 0.15
    lo = bpy.data.objects.new('bulb', ld)
    lo.location = Vector(info['bulb']) + Vector((0, 0, -0.12))
    sc.collection.objects.link(lo)
    for x in (-2.0, 3.5, 9.0):
        a = bpy.data.lights.new('vent', 'AREA')
        a.energy = 6
        a.color = (0.7, 0.8, 1.0)
        a.size = 0.8
        o = bpy.data.objects.new('vent', a)
        o.location = (x, ROOM_D - 0.3, 2.45)
        o.rotation_euler = (math.radians(70), 0, 0)
        sc.collection.objects.link(o)
    # Камера игры: орто, спереди, PITCH; кадр — по комнате с полями
    p = math.radians(PITCH)
    up = Vector((0, math.sin(p), math.cos(p)))
    xmin, xmax = -ROOM_W / 2 - WALL_T - MARGIN, ROOM_W / 2 + WALL_T + MARGIN
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    ys = [v.dot(up) for v in vs if -0.5 < v.z < 3.2]
    smin, smax = min(ys) - MARGIN, max(ys) + MARGIN
    width_m, height_m = xmax - xmin, smax - smin
    res_x = round(width_m * PX_PER_M * SS)
    res_y = round(height_m * PX_PER_M * SS)
    sc.render.resolution_x, sc.render.resolution_y = res_x, res_y
    cam_d = bpy.data.cameras.new('cam')
    cam_d.type = 'ORTHO'
    cam_d.ortho_scale = max(width_m, height_m)
    cam_d.sensor_fit = 'HORIZONTAL' if width_m >= height_m else 'VERTICAL'
    cam = bpy.data.objects.new('cam', cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    fwd = Vector((0, math.cos(p), -math.sin(p)))
    centre_s = (smin + smax) / 2
    # Точка на оси камеры: x — середина, по «вверх» — centre_s; отступаем назад вдоль взгляда
    base = Vector((0, 0, 0)) + up * centre_s
    cam.location = base - fwd * 40
    cam.rotation_euler = (math.pi / 2 - p, 0, 0)
    cam_d.clip_end = 200
    os.makedirs(OUT_DIR, exist_ok=True)
    png = os.path.join(OUT_DIR, '_room.png')
    sc.render.filepath = png
    bpy.ops.render.render(write_still=True)
    # Прозрачный фон за комнатой — тёмный, как темнота подвала в игре; картинка — WebP
    import numpy as np
    im = bpy.data.images.load(png)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(res_y, res_x, 4)
    dark = np.array([0.006, 0.006, 0.009], dtype=np.float32)
    a = px[..., 3:4]
    px[..., :3] = px[..., :3] * a + dark * (1 - a)
    px[..., 3] = 1
    out = bpy.data.images.new('room', res_x, res_y, alpha=False)
    out.pixels = px.ravel()
    out.filepath_raw = os.path.join(OUT_DIR, 'room.webp')
    out.file_format = 'WEBP'
    sc.render.image_settings.quality = 82
    out.save()
    bpy.data.images.remove(im)
    os.remove(png)
    # Где на картинке точка пола (X, Y): px = (X - xmin)·PPM, py = (smax - Y·sin p)·PPM (в пикселях карты, без ×2)
    meta = {'ppm': PX_PER_M, 'w': round(width_m * PX_PER_M), 'h': round(height_m * PX_PER_M),
            'x0': -xmin * PX_PER_M, 'y0': smax * PX_PER_M, 'sin': math.sin(p),
            'roomW': ROOM_W, 'roomD': ROOM_D, 'wallT': WALL_T, 'stairs': {'x': -8.0, 'w': 2.2, 'y0': ROOM_D - 2.7}}
    with open(os.path.join(OUT_DIR, 'room.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=1)
    print(f'[ok] room: {res_x}x{res_y}, {meta}')


if __name__ == '__main__':
    render(build())
