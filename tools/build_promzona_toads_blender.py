"""
Новые жабы Промзоны: сырые GLB из Rodin (blender_assets/promzona_models/) -> игровые GLB со скелетом
и циклом ходьбы в assets/models/, такие же, как у пехотинца, снайпера и громилы
(tools/build_all_enemies_blender.py).

Что делает с каждой жабой:
  - склеивает меши, сшивает швы, Decimate до бюджета врага (docs/PERFORMANCE.md);
    base color + normal, текстуры <= 512 px, экспорт в WebP;
  - ставит корень между щиколотками на Z=0, под тазом по глубине; лицом в -Y (= +Z glTF, к камере);
    рост в метрах — рантайм врагов модели не нормализует;
  - скелет тех же 12 костей, что у старых жаб: Root, Pelvis, Spine, Head, Arm/Forearm и Thigh/Shin .L/.R
    (в three.js точки из имён пропадают: ArmL, ThighR). Суставы — по срезам модели (JOINTS, метры сырой
    модели от корня), а не по долям роста: у ракетчика правая рука поднята к пусковой;
  - веса автоматические (heat). Оружие (капсула от приклада к дулу, weapon.capsule — её же ось берётся за ось
    ствола) жёстко на правом предплечье, вместе с кистью. Вершины, которым heat не дал костей, — на ближайшую кость;
  - клип <Name>_Walk: 16 кадров, ключи как у старых жаб (игра снимает с клипа 6 кадров × 16 направлений);
    свободная левая рука качается против левой ноги, рука с оружием держит его ровно;
  - клипы верхней части тела (только Spine, Arm.R, Forearm.R — ноги берутся из ходьбы, так стреляют на ходу):
    <Name>_Aim — ствол горизонтально вперёд, <Name>_Fire — отдача (3 кадра: прицел, отдача, прицел),
    <Name>_Overheat / <Name>_Reload — оружие опущено. Ось ствола считается по геометрии оружия;
  - кость Muzzle (не деформирует) на дуле: откуда в игре вылетают пули и ракеты в любом ракурсе;
  - превью шага под углом камеры игры: assets/models/preview/<имя>_walk.png.

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/build_promzona_toads_blender.py [-- имя ...]
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'blender_assets', 'promzona_models')
OUT = os.path.join(ROOT, 'assets', 'models')
PREVIEW = os.path.join(OUT, 'preview')
MAX_TEX = 512
WEBP_QUALITY = 82

# albedo — множитель цвета (линейный, в glTF baseColorFactor): у моделей Rodin много серого металла,
# и под ярким светом врагов (three_enemies.js) они выгорали добела. Подобрано так, чтобы средняя
# яркость кадров совпала со старыми жабами (sRGB ~100–110).
# Суставы в метрах сырой модели (рост ~1,9 м) от корня: x — влево модели (+) / вправо (-), y — назад (+),
# z — вверх. Замерено по горизонтальным срезам: где расходятся ноги, где руки отходят от корпуса.
TOADS = {
    'toad_stormtrooper': {
        'name': 'Toad_Stormtrooper',
        'height': 1.85,
        'tris': 7000,
        'albedo': 0.45,
        'nod': True,
        'joints': {
            'hip': 0.62, 'spine': 0.95, 'neck': 1.38, 'top': (0.0, -0.05, 1.85),
            'leg': {'L': [(0.27, 0.06, 0.62), (0.27, 0.09, 0.34), (0.29, 0.13, 0.10)],
                    'R': [(-0.27, 0.06, 0.62), (-0.25, 0.09, 0.34), (-0.29, 0.13, 0.10)]},
            'arm': {'L': [(0.45, 0.10, 1.15), (0.66, 0.10, 0.82), (0.74, -0.04, 0.50)],
                    'R': [(-0.45, 0.10, 1.15), (-0.64, 0.12, 0.85), (-0.71, -0.08, 0.52)]},
        },
        # Автомат в правой руке по диагонали: приклад снаружи бедра, дуло перед правым коленом.
        # Стрельба от бедра одной рукой; перегрев — автомат опущен (раскалённые радиаторы рисует игра)
        'weapon': {'capsule': ((-0.90, 0.13, 0.66), (-0.17, -0.72, 0.42), 0.11),
                   'aim': (25, 0, 6, 15), 'kick': 9, 'rest': ('Overheat', (0, -55, 0, 25))},
    },
    'toad_rocketeer': {
        'name': 'Toad_Rocketeer',
        'height': 1.95,
        'tris': 7000,
        'albedo': 0.65,
        'nod': True,
        'joints': {
            'hip': 0.62, 'spine': 1.0, 'neck': 1.40, 'top': (0.0, -0.15, 1.85),
            'leg': {'L': [(0.27, 0.10, 0.62), (0.28, 0.14, 0.34), (0.32, 0.14, 0.10)],
                    'R': [(-0.27, 0.10, 0.62), (-0.29, 0.14, 0.34), (-0.32, 0.14, 0.10)]},
            'arm': {'L': [(0.50, 0.10, 1.20), (0.71, 0.10, 0.88), (0.78, 0.0, 0.46)],
                    'R': [(-0.50, 0.10, 1.20), (-0.66, 0.12, 0.90), (-0.69, -0.05, 0.60)]},
        },
        # Пусковая у правого бедра стволами вперёд, кисть на рукояти. Первый вариант держал её на плече,
        # и Rodin вплавил трубы в голову. Залп с бедра, корпус упирается назад; перезарядка — пусковая опущена
        'weapon': {'capsule': ((-0.68, 0.14, 0.60), (-0.68, -0.84, 0.55), 0.21),
                   'aim': (20, 3, -4), 'kick': 12, 'rest': ('Reload', (0, -40, 0))},
    },
}

# Ключи шага, как у старых жаб: (кадр, бедро L, бедро R, голень L, голень R, подъём таза, крен корпуса)
WALK_KEYS = [
    (1, 20, -18, -10, 8, 0.0, -2.0),
    (5, 0, 0, 8, 5, 0.035, 0.0),
    (9, -18, 20, 8, -10, 0.0, 2.0),
    (13, 0, 0, 5, 8, 0.035, 0.0),
    (17, 20, -18, -10, 8, 0.0, -2.0),
]
ARM_SWING = 0.55   # свободная рука качается против своей ноги, с такой долей её угла


def tris_of(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_joined(path, name):
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    if obj.parent:
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for o in list(bpy.context.scene.objects):
        if o != obj:
            bpy.data.objects.remove(o, do_unlink=True)
    obj.name = name
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Швы UV в glTF — разрезанные вершины: сшиваем, иначе heat-веса считаются по кусочкам
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0001)
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def slim_materials(obj, albedo=1.0):
    for mat in obj.data.materials:
        if not mat or not mat.use_nodes:
            continue
        nodes = mat.node_tree.nodes
        bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
        for n in list(nodes):
            if n.type != 'TEX_IMAGE' or not n.image:
                continue
            targets = {l.to_node.type for l in n.outputs[0].links}
            if 'SEPARATE_COLOR' in targets or 'SEPRGB' in targets:
                # metallic/roughness: рантайм всё равно задаёт материалу свои
                for l in list(n.outputs[0].links):
                    sep = l.to_node
                    for out in sep.outputs:
                        for l2 in list(out.links):
                            mat.node_tree.links.remove(l2)
                    nodes.remove(sep)
                nodes.remove(n)
                continue
            img = n.image
            w, h = img.size
            if max(w, h) > MAX_TEX:
                k = MAX_TEX / max(w, h)
                img.scale(max(1, round(w * k)), max(1, round(h * k)))
        if bsdf:
            bsdf.inputs['Metallic'].default_value = 0.05
            bsdf.inputs['Roughness'].default_value = 0.9
            link = next(iter(bsdf.inputs['Base Color'].links), None)
            if link and albedo != 1.0:
                # Текстура × цвет: экспортёр пишет это в baseColorFactor
                mix = nodes.new('ShaderNodeMix')
                mix.data_type = 'RGBA'
                mix.blend_type = 'MULTIPLY'
                mix.inputs['Factor'].default_value = 1.0
                mix.inputs[7].default_value = (albedo, albedo, albedo, 1.0)   # B (цвет)
                mat.node_tree.links.new(link.from_socket, mix.inputs[6])     # A (текстура)
                mat.node_tree.links.new(mix.outputs[2], bsdf.inputs['Base Color'])


def decimate(obj, budget):
    have = tris_of(obj)
    if have <= budget:
        return have
    mod = obj.modifiers.new('dec', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = budget / have
    mod.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return tris_of(obj)


def raw_origin(obj):
    """Корень: середина между щиколотками по x, глубина таза (низ корпуса) по y, земля по z."""
    vs = [v.co for v in obj.data.vertices]
    z0 = min(v.z for v in vs)
    ankles = [v for v in vs if 0.10 <= v.z - z0 <= 0.18]
    cx = sum(v.x for v in ankles) / len(ankles)
    left = [v.x for v in ankles if v.x > cx]
    right = [v.x for v in ankles if v.x <= cx]
    ox = (sum(left) / len(left) + sum(right) / len(right)) / 2
    torso = [v for v in vs if 0.62 <= v.z - z0 <= 0.80 and abs(v.x - ox) < 0.3]
    oy = sum(v.y for v in torso) / len(torso)
    return Vector((ox, oy, z0)), max(v.z for v in vs) - z0


def in_weapon(cfg, raw):
    """Вершина (метры сырой модели от корня) — часть оружия: внутри капсулы от приклада к дулу."""
    a, b, r = cfg['weapon']['capsule']
    return seg_dist(raw, Vector(a), Vector(b)) < r


def weapon_axis(mesh, cfg, k):
    """Ось ствола — ось капсулы (от приклада к дулу); дуло — самая дальняя вдоль неё вершина оружия."""
    a, b, _ = cfg['weapon']['capsule']
    axis = (Vector(b) - Vector(a)).normalized()
    pts = [v.co for v in mesh.data.vertices if in_weapon(cfg, v.co / k)]
    muzzle = max(pts, key=lambda p: p.dot(axis)).copy()
    return axis, muzzle


def build_rig(cfg, k, weapon=None):
    J = cfg['joints']
    P = lambda p: Vector(p) * k
    bpy.ops.object.armature_add(location=(0, 0, 0))
    rig = bpy.context.active_object
    rig.name = cfg['name'] + '_Rig'
    rig.data.name = cfg['name'] + '_Skeleton'
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones

    def bone(name, head, tail, parent=None):
        b = eb.get(name) or eb.new(name)
        b.head, b.tail = head, tail
        if parent:
            b.parent = eb[parent]
        return b

    root = eb['Bone']
    root.name = 'Root'
    root.head, root.tail = (0, 0, 0), (0, 0, 0.2)
    bone('Pelvis', P((0, 0, J['hip'])), P((0, 0, J['spine'])), 'Root')
    bone('Spine', P((0, 0, J['spine'])), P((0, J['top'][1] * 0.5, J['neck'])), 'Pelvis')
    bone('Head', P((0, J['top'][1] * 0.5, J['neck'])), P(J['top']), 'Spine')
    for s in ('L', 'R'):
        sh, el, wr = J['arm'][s]
        bone(f'Arm.{s}', P(sh), P(el), 'Spine')
        bone(f'Forearm.{s}', P(el), P(wr), f'Arm.{s}')
        hip, knee, ankle = J['leg'][s]
        bone(f'Thigh.{s}', P(hip), P(knee), 'Pelvis')
        bone(f'Shin.{s}', P(knee), P(ankle), f'Thigh.{s}')
    if weapon:
        axis, muzzle = weapon
        m = bone('Muzzle', muzzle, muzzle + axis * 0.1, 'Forearm.R')
        m.use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (p - (a + ab * t)).length


def skin(mesh, rig, cfg, k):
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    groups = {g.name: g for g in mesh.vertex_groups}
    for name in [b.name for b in rig.data.bones if b.use_deform]:
        if name not in groups:
            groups[name] = mesh.vertex_groups.new(name=name)
    deform = [b for b in rig.data.bones if b.name != 'Root' and b.use_deform]
    segs = {b.name: (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in deform}

    def set_only(v, name):
        for g in mesh.vertex_groups:
            g.remove([v.index])
        groups[name].add([v.index], 1.0, 'REPLACE')

    fixed = orphans = 0
    for v in mesh.data.vertices:
        if cfg.get('weapon') and in_weapon(cfg, v.co / k):   # капсула — в метрах сырой модели
            set_only(v, 'Forearm.R')
            fixed += 1
            continue
        if sum(g.weight for g in v.groups) < 0.01:
            near = min(segs, key=lambda n: seg_dist(v.co, *segs[n]))
            set_only(v, near)
            orphans += 1
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return fixed, orphans


def rotate_about_head(rig, name, q):
    """Повернуть кость (с детьми) в осях арматуры вокруг её начала."""
    pb = rig.pose.bones[name]
    m = pb.matrix.copy()
    head = m.translation.copy()
    pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def current_axis(rig, axis):
    """Куда смотрит ствол сейчас: ось из позы привязки, повёрнутая вместе с предплечьем."""
    pb = rig.pose.bones['Forearm.R']
    return (pb.matrix.to_3x3() @ pb.bone.matrix_local.to_3x3().inverted() @ axis).normalized()


def reset_pose(rig):
    for b in rig.pose.bones:
        b.location = (0, 0, 0)
        b.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()


def weapon_pose(rig, axis, raise_deg, pitch_deg, lean_deg, yaw_deg=0):
    """Корпус наклонить (+ вперёд), руку поднять вперёд, предплечьем навести ствол: pitch от горизонта (+ вверх),
    yaw — доворот внутрь, к середине тела (оружие в правой руке, иначе кисть выворачивается наружу)."""
    reset_pose(rig)
    if lean_deg:
        rotate_about_head(rig, 'Spine', Quaternion((1, 0, 0), math.radians(lean_deg)))
    if raise_deg:
        rotate_about_head(rig, 'Arm.R', Quaternion((1, 0, 0), math.radians(-raise_deg)))
    p, y = math.radians(pitch_deg), math.radians(yaw_deg)
    target = Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    rotate_about_head(rig, 'Forearm.R', current_axis(rig, axis).rotation_difference(target))
    return target


UPPER = ('Spine', 'Arm.R', 'Forearm.R')


def key_upper(rig, frame):
    for name in UPPER:
        rig.pose.bones[name].keyframe_insert(data_path='rotation_euler', frame=frame)


def new_action(rig, name):
    act = bpy.data.actions.new(name=name)
    act.use_fake_user = True
    rig.animation_data.action = act
    return act


def animate_weapon(rig, cfg, axis):
    """Клипы стрельбы: прицел, отдача, опущенное оружие. Ключи только у Spine, Arm.R, Forearm.R."""
    w = cfg['weapon']
    sc = bpy.context.scene
    new_action(rig, cfg['name'] + '_Aim')
    sc.frame_set(1)
    weapon_pose(rig, axis, *w['aim'])
    key_upper(rig, 1)
    key_upper(rig, 2)

    new_action(rig, cfg['name'] + '_Fire')
    sc.frame_set(1)
    target = weapon_pose(rig, axis, *w['aim'])
    key_upper(rig, 1)
    key_upper(rig, 3)
    sc.frame_set(2)
    # Отдача: корпус назад, ствол подбрасывает вверх
    rotate_about_head(rig, 'Spine', Quaternion((1, 0, 0), math.radians(-w['kick'] * 0.3)))
    side = target.cross(Vector((0, 0, 1))).normalized()
    rotate_about_head(rig, 'Forearm.R', Quaternion(side, math.radians(w['kick'])))
    key_upper(rig, 2)

    rest_name, rest = w['rest']
    new_action(rig, cfg['name'] + '_' + rest_name)
    sc.frame_set(1)
    weapon_pose(rig, axis, *rest)
    key_upper(rig, 1)
    key_upper(rig, 2)
    reset_pose(rig)


def animate(rig, cfg):
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    rig.animation_data_create()
    action = new_action(rig, cfg['name'] + '_Walk')
    pb = rig.pose.bones
    for b in pb:
        b.rotation_mode = 'XYZ'
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, 16
    for f, tl, tr, sl, sr, pz, sy in WALK_KEYS:
        sc.frame_set(f)
        pb['Thigh.L'].rotation_euler = (math.radians(tl), 0, 0)
        pb['Thigh.R'].rotation_euler = (math.radians(tr), 0, 0)
        pb['Shin.L'].rotation_euler = (math.radians(sl), 0, 0)
        pb['Shin.R'].rotation_euler = (math.radians(sr), 0, 0)
        pb['Pelvis'].location = (0, 0, pz)
        pb['Spine'].rotation_euler = (0, math.radians(sy), 0)
        pb['Head'].rotation_euler = (math.radians(math.sin(f * 0.4) * 3) if cfg['nod'] else 0, 0, 0)
        pb['Arm.L'].rotation_euler = (math.radians(-tl * ARM_SWING), 0, 0)
        for name in ('Thigh.L', 'Thigh.R', 'Shin.L', 'Shin.R', 'Spine', 'Head', 'Arm.L'):
            pb[name].keyframe_insert(data_path='rotation_euler', frame=f)
        pb['Pelvis'].keyframe_insert(data_path='location', frame=f)
    if cfg.get('weapon'):
        animate_weapon(rig, cfg, cfg['_axis'])
    rig.animation_data.action = action   # активна ходьба: она и первая в файле
    sc.frame_set(1)
    bpy.ops.object.mode_set(mode='OBJECT')


def render_walk_preview(rig, cfg, name, height):
    """Шесть кадров шага (как снимает игра) под углом камеры игры, полосой."""
    pitch = math.radians(28)
    target = Vector((0, 0, height * 0.48))
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = height * 1.35
    cam = bpy.data.objects.new('cam', cam_data)
    cam.location = target + Vector((0, -8 * math.cos(pitch), 8 * math.sin(pitch)))
    cam.rotation_euler = (math.pi / 2 - pitch, 0, 0)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    for rot, energy in (((45, 20, -30), 4.0), ((60, -20, 150), 1.8)):
        ld = bpy.data.lights.new('sun', 'SUN')
        ld.energy = energy
        lo = bpy.data.objects.new('sun', ld)
        lo.rotation_euler = tuple(math.radians(a) for a in rot)
        bpy.context.scene.collection.objects.link(lo)
    sc = bpy.context.scene
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.resolution_x = sc.render.resolution_y = 256
    frames = []
    for i, yaw in enumerate((0, 45, 90)):
        rig.rotation_euler = (0, 0, math.radians(yaw))
        for j in range(6):
            sc.frame_set(1 + round(j * 16 / 6))
            path = os.path.join(PREVIEW, f'_{name}_{i}_{j}.png')
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True)
            frames.append(path)
    rig.rotation_euler = (0, 0, 0)
    # лист 6 × 3
    cell = 256
    sheet = bpy.data.images.new('sheet', 6 * cell, 3 * cell, alpha=True)
    px = [0.22, 0.22, 0.24, 1.0] * (6 * cell * 3 * cell)
    for idx, path in enumerate(frames):
        im = bpy.data.images.load(path)
        src = list(im.pixels)
        cx, cy = (idx % 6) * cell, (2 - idx // 6) * cell
        for y in range(cell):
            for x in range(cell):
                si = (y * cell + x) * 4
                a = src[si + 3]
                if a <= 0:
                    continue
                di = ((cy + y) * 6 * cell + cx + x) * 4
                for c in range(3):
                    px[di + c] = src[si + c] * a + px[di + c] * (1 - a)
        bpy.data.images.remove(im)
        os.remove(path)
    sheet.pixels = px
    sheet.filepath_raw = os.path.join(PREVIEW, name + '_walk.png')
    sheet.file_format = 'PNG'
    sheet.save()


def process(name, cfg):
    path = os.path.join(RAW, name + '.glb')
    if not os.path.exists(path):
        print(f'[skip] {name}: нет {path}')
        return
    clear_scene()
    mesh = import_joined(path, cfg['name'] + '_Body')
    slim_materials(mesh, cfg.get('albedo', 1.0))
    tris = decimate(mesh, cfg['tris'])
    origin, raw_h = raw_origin(mesh)
    k = cfg['height'] / raw_h
    mesh.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(-origin))
    mesh.data.update()
    weapon = weapon_axis(mesh, cfg, k) if cfg.get('weapon') else None
    cfg['_axis'] = weapon[0] if weapon else None
    rig = build_rig(cfg, k, weapon)
    fixed, orphans = skin(mesh, rig, cfg, k)
    animate(rig, cfg)
    out = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False,
                              export_animations=True, export_animation_mode='ACTIONS',
                              export_skins=True, export_current_frame=False,
                              export_image_format='WEBP', export_image_quality=WEBP_QUALITY)
    print(f'[ok] {name}: {tris} tris, {os.path.getsize(out) // 1024} KB, рост {cfg["height"]} м, '
          f'оружие {fixed} вершин, без костей было {orphans}')
    render_walk_preview(rig, cfg, name, cfg['height'])


def main():
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    os.makedirs(PREVIEW, exist_ok=True)
    for name, cfg in TOADS.items():
        if not only or name in only:
            process(name, cfg)


if __name__ == '__main__':
    main()
