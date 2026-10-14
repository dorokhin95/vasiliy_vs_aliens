"""
Выжившие Промзоны (оборона у пролома, src/defense.js): сырые GLB из Rodin (blender_assets/promzona_models/,
концепты — blender_assets/promzona_concepts/survivor_*.png) -> игровые GLB со скелетом и клипами
в assets/models/survivor_<имя>.glb. Рисует их src/three_survivors.js.

Как у жаб Промзоны (tools/build_promzona_toads_blender.py, оттуда же склейка, текстуры и Decimate):
  - корень между щиколотками на Z=0, лицом в -Y (= +Z glTF, к камере), рост в метрах;
  - 12 костей: Root, Pelvis, Spine, Head, Arm/Forearm и Thigh/Shin .L/.R. Суставы — по срезам и рендерам
    сырой модели с сеткой (JOINTS, метры сырой модели от корня: x — влево модели (+), y — назад (+), z — вверх);
  - веса автоматические (heat); оружие и то, что не должно гнуться (ракетница, лом, сумка Лены), — капсулы
    жёстко на кости. Ось оружия — ось капсулы (от приклада к дулу), кость Muzzle (не деформирует) — на дуле.
Клипы — полные позы (ключи у всех костей), игра снимает с них кадры по 16 направлениям:
  <Name>_Walk   — шаг, 16 кадров (игра берёт 6); у Серёги вместо него <Name>_Limp — ковыляет на раненой ноге;
  <Name>_Idle   — стоит, руки чуть опущены;
  <Name>_Aim    — целится: оружие горизонтально вперёд (ракетница — вверх, навесом), вторая рука на цевье
                  или под рукоятью; <Name>_Fire — отдача (3 кадра: прицел, отдача, прицел);
  <Name>_Heal   — Лена на колене бинтует (4 кадра по кругу);
  <Name>_Lie    — Серёга лежит на спине головой назад (+Y), раненое колено согнуто.
Позы ставятся направлениями костей (point_bone) и двухзвенным IK рук и ног, без констрейнтов.
albedo — множитель цвета (baseColorFactor): у Rodin текстуры светлые, под светом three_survivors.js Зина и Лена
выгорали; подобрано по средней яркости кадров (~105–120 sRGB, как у Василия и жаб; белый халат Лены — светлее).
Превью: assets/models/preview/<имя>_walk.png (шаг в трёх ракурсах) и <имя>_poses.png.

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/build_promzona_survivors_blender.py [-- имя ...]
"""
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_promzona_toads_blender as T  # noqa: E402  склейка, материалы, Decimate, превью шага

ROOT = T.ROOT
RAW, OUT, PREVIEW = T.RAW, T.OUT, T.PREVIEW
WEBP_QUALITY = T.WEBP_QUALITY
FWD = Vector((0, -1, 0))

# Суставы: hip/spine/neck — высоты таза, начала спины и шеи; top — макушка; leg — [бедро, колено, щиколотка],
# arm — [плечо, локоть, запястье]. Замерено по горизонтальным срезам через 2,5 % роста и рендерам спереди и сбоку с сеткой 10 см.
def human(hip, spine, neck, top, hip_x, knee, ankle, shoulder, elbow, wrist):
    def lr(p):
        x, y, z = p
        return {'L': [(x, y, z)], 'R': [(-x, y, z)]}
    leg = {s: [(hip_x if s == 'L' else -hip_x, 0.02, hip)] for s in 'LR'}
    arm = {s: [] for s in 'LR'}
    for p in (knee, ankle):
        for s, v in lr(p).items():
            leg[s] += v
    for p in (shoulder, elbow, wrist):
        for s, v in lr(p).items():
            arm[s] += v
    return {'hip': hip, 'spine': spine, 'neck': neck, 'top': top, 'leg': leg, 'arm': arm}


SURVIVORS = {
    # Мастер с двустволкой: ружьё в правой руке стволами к земле; целится от плеча, левая рука на цевье
    'survivor_stepanych': {
        'name': 'Survivor_Stepanych', 'height': 1.78, 'tris': 6000, 'albedo': 0.75,
        'joints': human(0.88, 1.05, 1.60, (0.0, -0.02, 1.896), 0.12, (0.17, -0.02, 0.48), (0.20, 0.08, 0.10),
                        (0.23, 0.04, 1.47), (0.37, 0.05, 1.17), (0.41, -0.01, 0.92)),
        'weapon': {'capsule': ((-0.34, -0.03, 1.00), (-0.55, -0.30, 0.34), 0.055),
                   # запястье относительно плеча (x — к середине тела), наклон ствола, наклон корпуса, отдача
                   'grip': (0.07, -0.30, -0.14), 'pitch': -2, 'lean': 6, 'kick': 9, 'support': 0.45},
        'rigid': [],
    },
    # Вахтёрша с наганом: держит двумя руками на вытянутых, левая ладонь под рукоятью
    'survivor_zina': {
        'name': 'Survivor_Zina', 'height': 1.68, 'tris': 6000, 'albedo': 0.47,
        'joints': human(0.86, 1.05, 1.55, (0.0, 0.0, 1.899), 0.12, (0.17, -0.02, 0.47), (0.20, 0.06, 0.10),
                        (0.24, 0.04, 1.47), (0.38, 0.05, 1.17), (0.45, -0.01, 0.90)),
        'weapon': {'capsule': ((-0.47, -0.04, 0.86), (-0.53, -0.28, 0.54), 0.05),
                   'grip': (0.16, -0.46, -0.06), 'pitch': -3, 'lean': 3, 'kick': 12, 'support': -0.02},
        'rigid': [],
    },
    # Сварщик: ракетница в правой, лом в левой. Стреляет с вытянутой руки вверх — ракета летит дугой
    'survivor_tolik': {
        'name': 'Survivor_Tolik', 'height': 1.80, 'tris': 6000, 'albedo': 0.64,
        'joints': human(0.88, 1.05, 1.58, (0.0, -0.05, 1.899), 0.11, (0.16, -0.02, 0.50), (0.19, 0.08, 0.10),
                        (0.22, 0.04, 1.48), (0.32, 0.05, 1.17), (0.39, -0.01, 0.90)),
        'weapon': {'capsule': ((-0.43, -0.07, 0.87), (-0.50, -0.13, 0.59), 0.06),
                   'grip': (0.06, -0.48, 0.02), 'pitch': 14, 'lean': 0, 'kick': 14, 'support': None},
        'rigid': [((0.53, 0.25, 1.11), (0.28, -0.21, 0.57), 0.045, 'Forearm.L')],   # лом
    },
    # Лаборантка: бинт в правой руке, сумка на левом бедре (на тазу, чтобы не моталась за рукой)
    'survivor_lena': {
        'name': 'Survivor_Lena', 'height': 1.66, 'tris': 6000, 'albedo': 0.53,
        'joints': human(0.88, 1.05, 1.58, (0.0, 0.0, 1.897), 0.11, (0.15, -0.01, 0.50), (0.18, 0.06, 0.10),
                        (0.20, 0.03, 1.47), (0.31, 0.05, 1.17), (0.40, 0.0, 0.92)),
        'weapon': None,
        'rigid': [((0.19, -0.09, 0.97), (0.29, -0.09, 0.92), 0.08, 'Pelvis'),         # сумка
                  ((-0.38, -0.05, 0.86), (-0.37, -0.05, 0.74), 0.05, 'Forearm.R')],   # бинт
        'heal': True,
    },
    # Раненый: правая голень в бинтах. Лежит, на отходе ковыляет
    'survivor_seryoga': {
        'name': 'Survivor_Seryoga', 'height': 1.76, 'tris': 6000, 'albedo': 0.64,
        'joints': human(0.88, 1.05, 1.60, (0.0, -0.05, 1.895), 0.12, (0.16, 0.0, 0.50), (0.18, 0.04, 0.10),
                        (0.21, 0.04, 1.48), (0.33, 0.04, 1.17), (0.39, 0.0, 0.93)),
        'weapon': None,
        'rigid': [],
        'wounded': True,
    },
}


# --- Модель и скелет ---
def raw_origin(obj):
    """Корень: середина щиколоток по x, глубина корпуса у бёдер по y, земля по z (как в замерах)."""
    vs = [v.co for v in obj.data.vertices]
    z0 = min(v.z for v in vs)
    H = max(v.z for v in vs) - z0
    ankles = [v for v in vs if 0.05 * H <= v.z - z0 <= 0.09 * H]
    cx = sum(v.x for v in ankles) / len(ankles)
    left = [v.x for v in ankles if v.x > cx]
    right = [v.x for v in ankles if v.x <= cx]
    ox = (sum(left) / len(left) + sum(right) / len(right)) / 2
    torso = [v for v in vs if 0.35 * H <= v.z - z0 <= 0.45 * H and abs(v.x - ox) < 0.17 * H]
    oy = sum(v.y for v in torso) / len(torso)
    return Vector((ox, oy, z0)), H


def parts_of(cfg):
    """Жёсткие части: (a, b, r, кость) в метрах сырой модели; оружие — на правом предплечье."""
    parts = list(cfg['rigid'])
    if cfg['weapon']:
        a, b, r = cfg['weapon']['capsule']
        parts.insert(0, (a, b, r, 'Forearm.R'))
    return parts


def weapon_axis(mesh, cfg, k):
    a, b, r = cfg['weapon']['capsule']
    axis = (Vector(b) - Vector(a)).normalized()
    pts = [v.co for v in mesh.data.vertices if T.seg_dist(v.co / k, Vector(a), Vector(b)) < r]
    muzzle = max(pts, key=lambda p: p.dot(axis)).copy()
    return axis, muzzle


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

    parts = [(Vector(a), Vector(b), r, bone) for a, b, r, bone in parts_of(cfg)]
    counts = [0] * len(parts)
    orphans = 0
    for v in mesh.data.vertices:
        raw = v.co / k
        hit = next((i for i, (a, b, r, _) in enumerate(parts) if T.seg_dist(raw, a, b) < r), None)
        if hit is not None:
            set_only(v, parts[hit][3])
            counts[hit] += 1
            continue
        if sum(g.weight for g in v.groups) < 0.01:
            set_only(v, min(segs, key=lambda n: T.seg_dist(v.co, *segs[n])))
            orphans += 1
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return counts, orphans


# --- Позы ---
def update():
    bpy.context.view_layer.update()


def reset_pose(rig):
    for b in rig.pose.bones:
        b.rotation_mode = 'QUATERNION'
        b.location = (0, 0, 0)
        b.rotation_quaternion = (1, 0, 0, 0)
        b.scale = (1, 1, 1)
    update()


def rot(rig, name, axis, deg):
    """Повернуть кость (с детьми) вокруг её начала, ось — в осях персонажа."""
    T.rotate_about_head(rig, name, Quaternion(Vector(axis), math.radians(deg)))


def pitch(rig, name, deg):
    """Кость, висящая вниз: + — конец вперёд (-Y)."""
    rot(rig, name, (1, 0, 0), -deg)


def point_bone(rig, name, d):
    pb = rig.pose.bones[name]
    cur = (pb.tail - pb.head).normalized()
    T.rotate_about_head(rig, name, cur.rotation_difference(Vector(d).normalized()))


def set_abs_rotation(rig, name, R):
    """Поворот кости относительно позы привязки (в осях персонажа) — ровно R."""
    pb = rig.pose.bones[name]
    C = (pb.matrix.to_3x3() @ pb.bone.matrix_local.to_3x3().inverted()).to_quaternion()
    T.rotate_about_head(rig, name, R @ C.inverted())


def move(rig, name, offset):
    pb = rig.pose.bones[name]
    m = pb.matrix.copy()
    m.translation = m.translation + Vector(offset)
    pb.matrix = m
    update()


def ik(rig, upper, lower, target, pole):
    """Двухзвенное IK: конец lower — в target, сгиб (локоть, колено) — в сторону pole."""
    a, b = rig.pose.bones[upper], rig.pose.bones[lower]
    S = a.head.copy()
    l1, l2 = a.bone.length, b.bone.length
    d = Vector(target) - S
    dist = max(abs(l1 - l2) + 1e-3, min(d.length, (l1 + l2) * 0.999))
    dn = d.normalized()
    cos_a = max(-1.0, min(1.0, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)))
    p = Vector(pole) - dn * Vector(pole).dot(dn)
    p = p.normalized() if p.length > 1e-6 else Vector((0, 0, -1))
    E = S + dn * (l1 * cos_a) + p * (l1 * math.sqrt(1 - cos_a * cos_a))
    point_bone(rig, upper, E - S)
    point_bone(rig, lower, S + dn * dist - E)


def bone_end(rig, name):
    return rig.pose.bones[name].tail.copy()


def lower_arms(rig, deg=9, left=True, right=True):
    """Из A-позы руки чуть ближе к телу."""
    if left:
        rot(rig, 'Arm.L', (0, 1, 0), deg)
    if right:
        rot(rig, 'Arm.R', (0, 1, 0), -deg)


def gun_pose(rig, cfg, grip_up=0.0, pitch_up=0.0, lean_back=0.0):
    """Прицел: ствол вдоль взгляда (FWD, поднят на pitch), запястье около плеча + grip; вторая рука — на цевье
    (support — доля пути от запястья к дулу) или под рукоятью (support < 0)."""
    w = cfg['weapon']
    if w['lean'] or lean_back:
        pitch(rig, 'Spine', -(w['lean'] - lean_back))   # Spine смотрит вверх: «вперёд» — с обратным знаком
    p = math.radians(w['pitch'] + pitch_up)
    D = Vector((0, -math.cos(p), math.sin(p)))
    R = cfg['_axis'].rotation_difference(D)
    fore = rig.pose.bones['Forearm.R']
    f = R @ (fore.bone.tail_local - fore.bone.head_local)
    S = rig.pose.bones['Arm.R'].head.copy()
    gx, gy, gz = w['grip']
    grip = S + Vector((gx, gy, gz + grip_up))
    l1 = rig.pose.bones['Arm.R'].bone.length
    E = S + (grip - f - S).normalized() * l1
    point_bone(rig, 'Arm.R', E - S)
    set_abs_rotation(rig, 'Forearm.R', R)
    if w['support'] is not None:
        wrist = bone_end(rig, 'Forearm.R')
        muzzle = rig.pose.bones['Muzzle'].head.copy()
        if w['support'] >= 0:
            target = wrist + (muzzle - wrist) * w['support'] + Vector((0, 0, -0.03))
        else:
            target = wrist + Vector((0.05, 0.02, -0.06))
        ik(rig, 'Arm.L', 'Forearm.L', target, (0.6, 0.3, -1))
    else:
        lower_arms(rig, 6, right=False)


def stance(rig, cfg):
    """Ноги чуть шире, колени мягко — стойка стрелка."""
    for s, sign in (('L', -1), ('R', 1)):
        rot(rig, f'Thigh.{s}', (0, 1, 0), sign * 3)
    pitch(rig, 'Thigh.L', 6)
    pitch(rig, 'Shin.L', -6)
    pitch(rig, 'Thigh.R', -4)


def walk_pose(rig, cfg, p, wounded=False):
    """Фаза шага p ∈ [0, 1): левое бедро вперёд при p = 0."""
    c, s = math.cos(2 * math.pi * p), math.sin(2 * math.pi * p)
    if wounded:
        # Правая нога (в бинтах) прямая и почти не гнётся, шаг на неё короткий — таз проседает, корпус
        # валится на здоровую ногу; правая рука прижата к бедру, левая отведена для равновесия
        tl, tr = 22 * c, -10 * c
        bl = 6 + 40 * max(0.0, -s)
        br = 3
        dip = -0.035 * max(0.0, -s) + 0.012 * max(0.0, s)
        roll = 7 * max(0.0, -s) - 2
    else:
        tl, tr = 24 * c, -24 * c
        bl = 6 + 45 * max(0.0, -s)
        br = 6 + 45 * max(0.0, s)
        dip = 0.02 * abs(s) - 0.01
        roll = 0
    move(rig, 'Pelvis', (0, 0, dip))
    if roll:
        rot(rig, 'Spine', (0, 1, 0), -roll)
    rot(rig, 'Spine', (0, 0, 1), 4 * c * (0 if wounded else 1))
    pitch(rig, 'Spine', -4 if wounded else -2)
    pitch(rig, 'Thigh.L', tl)
    pitch(rig, 'Shin.L', -bl)
    pitch(rig, 'Thigh.R', tr)
    pitch(rig, 'Shin.R', -br)
    pitch(rig, 'Head', -2 * s)
    lower_arms(rig, 7, left=not cfg.get('heal'))
    armed = 0.3 if cfg['weapon'] else 0.7
    if wounded:
        knee = rig.pose.bones['Shin.R'].head
        ik(rig, 'Arm.R', 'Forearm.R', knee + Vector((0.02, -0.12, 0.16)), (-0.5, 1, -0.2))
        rot(rig, 'Arm.L', (0, 1, 0), -18)
        pitch(rig, 'Arm.L', 10 * c)
    else:
        pitch(rig, 'Arm.L', -tl * 0.7)
        pitch(rig, 'Arm.R', -tr * armed)
        if not cfg['weapon']:
            pitch(rig, 'Forearm.L', 10 + 10 * max(0.0, c))
            pitch(rig, 'Forearm.R', 10 + 10 * max(0.0, -c))


def heal_pose(rig, cfg, p):
    """Лена на правом колене перед раненым: левая стопа впереди, корпус склонён, руки бинтуют — правая
    обходит левую по кругу."""
    pel = rig.pose.bones['Pelvis'].head.copy()
    thigh = rig.pose.bones['Thigh.R'].bone.length
    shin = rig.pose.bones['Shin.R'].bone.length
    drop = pel.z - (thigh + 0.07)
    move(rig, 'Pelvis', (0, 0.05, -drop))
    hipL = rig.pose.bones['Thigh.L'].head.copy()
    hipR = rig.pose.bones['Thigh.R'].head.copy()
    ik(rig, 'Thigh.R', 'Shin.R', Vector((hipR.x, hipR.y + shin * 0.95, 0.09)), (0, 0.15, -1))
    ik(rig, 'Thigh.L', 'Shin.L', Vector((hipL.x + 0.04, hipL.y - 0.38, 0.09)), (0.1, -1, 0.4))
    pitch(rig, 'Spine', -48)   # Spine смотрит вверх: минус — наклон вперёд
    pitch(rig, 'Head', -18)
    sh = rig.pose.bones['Arm.L'].head
    c, s = math.cos(2 * math.pi * p), math.sin(2 * math.pi * p)
    center = Vector((0.0, sh.y - 0.25, 0.40))
    ik(rig, 'Arm.L', 'Forearm.L', center + Vector((0.06, 0, 0.02)), (1, 0.3, -0.5))
    ik(rig, 'Arm.R', 'Forearm.R', center + Vector((-0.05 + 0.06 * c, -0.05 * s, 0.06 + 0.06 * s)), (-1, 0.3, -0.5))


def lie_pose(rig, cfg):
    """Серёга на спине головой назад (+Y), лицом вверх: поза стоя — согнутое раненое колено, руки вдоль тела,
    затем корень кладётся на землю (поворот вокруг X на -90°: вверх -> назад, вперёд -> вверх)."""
    pitch(rig, 'Thigh.R', 38)
    pitch(rig, 'Shin.R', -70)
    rot(rig, 'Thigh.L', (0, 1, 0), 4)
    lower_arms(rig, 6)
    # Левая рука на животе: в позе стоя предплечье — поперёк корпуса и чуть вперёд (лёжа — поверх живота)
    pitch(rig, 'Arm.L', 8)
    point_bone(rig, 'Forearm.L', (-0.8, -0.45, -0.25))
    rot(rig, 'Head', (0, 0, 1), -25)   # голова к камере
    H = cfg['height']
    back = cfg['_back']                   # насколько спина позади корня
    root = rig.pose.bones['Root']
    root.matrix = Matrix.Translation((0, -H * 0.5, back)) @ Matrix.Rotation(math.radians(-90), 4, 'X') @ root.matrix
    update()


# --- Клипы ---
def key_all(rig, frame):
    for b in rig.pose.bones:
        b.keyframe_insert(data_path='location', frame=frame)
        b.keyframe_insert(data_path='rotation_quaternion', frame=frame)


def clip(rig, cfg, suffix, frames, pose_fn):
    """Клип из ключей: frames — номера кадров, pose_fn(i) ставит позу i-го ключа."""
    act = T.new_action(rig, cfg['name'] + '_' + suffix)
    sc = bpy.context.scene
    for i, f in enumerate(frames):
        sc.frame_set(f)
        reset_pose(rig)
        pose_fn(i)
        key_all(rig, f)
    return act


def animate(rig, cfg):
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    rig.animation_data_create()
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, 17
    wounded = cfg.get('wounded')
    steps = list(range(1, 18, 2))   # 9 ключей, последний = первый
    walk = clip(rig, cfg, 'Limp' if wounded else 'Walk', steps,
                lambda i: walk_pose(rig, cfg, (i % 8) / 8, wounded))
    if wounded:
        clip(rig, cfg, 'Lie', [1, 2], lambda i: lie_pose(rig, cfg))
    else:
        clip(rig, cfg, 'Idle', [1, 2], lambda i: (lower_arms(rig, 9, left=not cfg.get('heal')), stance(rig, cfg) if cfg['weapon'] else None))
    if cfg['weapon']:
        w = cfg['weapon']
        clip(rig, cfg, 'Aim', [1, 2], lambda i: (stance(rig, cfg), gun_pose(rig, cfg)))
        clip(rig, cfg, 'Fire', [1, 2, 3], lambda i: (stance(rig, cfg),
             gun_pose(rig, cfg, *((0.03, w['kick'], 3) if i == 1 else (0, 0, 0)))))
    if cfg.get('heal'):
        clip(rig, cfg, 'Heal', [1, 3, 5, 7, 9], lambda i: heal_pose(rig, cfg, (i % 4) / 4))
    rig.animation_data.action = walk
    sc.frame_set(1)
    bpy.ops.object.mode_set(mode='OBJECT')


# --- Превью ---
def render_sheet(rig, cfg, name, shots, cols, out_name):
    """shots: [(клип, кадр, поворот°)] -> лист cols × n под углом камеры игры."""
    height = cfg['height']
    pitch_r = math.radians(28)
    target = Vector((0, 0, height * 0.48))
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = height * 1.5
    cam = bpy.data.objects.new('cam', cam_data)
    cam.location = target + Vector((0, -8 * math.cos(pitch_r), 8 * math.sin(pitch_r)))
    cam.rotation_euler = (math.pi / 2 - pitch_r, 0, 0)
    sc = bpy.context.scene
    sc.collection.objects.link(cam)
    sc.camera = cam
    if not any(o.type == 'LIGHT' for o in sc.objects):
        for r, energy in (((45, 20, -30), 4.0), ((60, -20, 150), 1.8)):
            ld = bpy.data.lights.new('sun', 'SUN')
            ld.energy = energy
            lo = bpy.data.objects.new('sun', ld)
            lo.rotation_euler = tuple(math.radians(a) for a in r)
            sc.collection.objects.link(lo)
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    cell = 256
    sc.render.resolution_x = sc.render.resolution_y = cell
    rows = (len(shots) + cols - 1) // cols
    px = np.empty((rows * cell, cols * cell, 4), dtype=np.float32)
    px[:] = (0.22, 0.22, 0.24, 1.0)
    for idx, (clip_name, frame, yaw) in enumerate(shots):
        rig.animation_data.action = bpy.data.actions[cfg['name'] + '_' + clip_name]
        rig.rotation_euler = (0, 0, math.radians(yaw))
        sc.frame_set(frame)
        path = os.path.join(PREVIEW, f'_{name}_{idx}.png')
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(path)
        src = np.array(im.pixels[:], dtype=np.float32).reshape(cell, cell, 4)
        bpy.data.images.remove(im)
        os.remove(path)
        cx, cy = (idx % cols) * cell, (rows - 1 - idx // cols) * cell   # пиксели Blender — снизу вверх
        dst = px[cy:cy + cell, cx:cx + cell]
        a = src[..., 3:4]
        dst[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a)
    rig.rotation_euler = (0, 0, 0)
    sheet = bpy.data.images.new('sheet', cols * cell, rows * cell, alpha=True)
    sheet.pixels = px.ravel()
    sheet.filepath_raw = os.path.join(PREVIEW, out_name)
    sheet.file_format = 'PNG'
    sheet.save()
    bpy.data.images.remove(sheet)
    bpy.data.objects.remove(cam, do_unlink=True)


def previews(rig, cfg, name):
    walk = 'Limp' if cfg.get('wounded') else 'Walk'
    render_sheet(rig, cfg, name, [(walk, 1 + round(j * 16 / 6), yaw) for yaw in (0, 45, 90) for j in range(6)],
                 6, name + '_walk.png')
    shots = []
    if cfg['weapon']:
        shots = [(c, f, yaw) for c, f in (('Idle', 1), ('Aim', 1), ('Fire', 2)) for yaw in (0, 60, 90)]
    if cfg.get('heal'):
        shots = [('Idle', 1, 0), ('Idle', 1, 90)] + [('Heal', f, yaw) for yaw in (0, 90) for f in (1, 5)]
    if cfg.get('wounded'):
        shots = [('Lie', 1, yaw) for yaw in (0, 90, 180)]
    render_sheet(rig, cfg, name, shots, 3 if cfg['weapon'] or cfg.get('wounded') else 3, name + '_poses.png')


def process(name, cfg):
    path = os.path.join(RAW, name + '.glb')
    if not os.path.exists(path):
        print(f'[skip] {name}: нет {path}')
        return
    T.clear_scene()
    mesh = T.import_joined(path, cfg['name'] + '_Body')
    T.slim_materials(mesh, cfg.get('albedo', 1.0))
    origin, raw_h = raw_origin(mesh)
    tris = T.decimate(mesh, cfg['tris'])
    k = cfg['height'] / raw_h
    cfg['_k'] = k
    mesh.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(-origin))
    mesh.data.update()
    cfg['_back'] = max(v.co.y for v in mesh.data.vertices if v.co.z > 0.5 * cfg['height'])
    weapon = weapon_axis(mesh, cfg, k) if cfg['weapon'] else None
    cfg['_axis'] = weapon[0] if weapon else None
    rig = T.build_rig(cfg, k, weapon)
    counts, orphans = skin(mesh, rig, cfg, k)
    animate(rig, cfg)
    out = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False,
                              export_animations=True, export_animation_mode='ACTIONS',
                              export_skins=True, export_current_frame=False,
                              export_image_format='WEBP', export_image_quality=WEBP_QUALITY)
    print(f'[ok] {name}: {tris} tris, {os.path.getsize(out) // 1024} KB, рост {cfg["height"]} м, '
          f'жёсткие части {counts} вершин, без костей было {orphans}')
    previews(rig, cfg, name)


def main():
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    os.makedirs(PREVIEW, exist_ok=True)
    for name, cfg in SURVIVORS.items():
        if not only or name in only:
            process(name, cfg)


if __name__ == '__main__':
    main()
