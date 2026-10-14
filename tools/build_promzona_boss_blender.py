"""
Босс Промзоны «Межпространственный Долбильщик»: сырой GLB из Rodin (blender_assets/promzona_models/
boss_dolbilshchik.glb) -> assets/models/boss_dolbilshchik.glb со скелетом человека и своими клипами.

Модель — как у новых жаб (tools/build_promzona_toads_blender.py): склейка, Decimate до бюджета, base color +
normal, текстуры 512 WebP, корень между щиколотками на Z=0, лицом в -Y. Суставы — по срезам модели (JOINTS).

Скелет (деформирующие кости): Root, Hips, Spine, Chest, Neck, Head, Shoulder/UpperArm/Forearm/Hand .L/.R,
Thigh/Shin/Foot .L/.R и Hammer (молот, на правой кисти). HammerHead — метка на бойке без веса: откуда бьёт
разряд и где удар молота касается земли.

Анимации ставятся как у аниматора — управляющими костями, потом запекаются в обычные ключи:
  - Ctrl_Hammer — молот: точка хвата и куда смотрит боёк. Правая рука тянется к ней по IK, кисть берёт её поворот;
  - Grip.L на рукояти ниже правой руки — левая рука по IK, когда удар двуручный (влияние анимируется);
  - Ctrl_Foot.L/R — стопы стоят на земле, пока таз приседает и скручивается;
  - корпус, шея и голова — поворотами.
После запекания управляющие кости и ограничения удаляются, в файле остаются только ключи деформирующих костей.

Клипы (60 кадров/с, кадр 0 — начало; фазы как в плане, docs/LEVEL2_PROMZONA.md, этап 9):
  Idle, Walk, Attack_Slam 44/6/42, Attack_Sweep 30/10/34, Attack_Electric 56/12/40,
  Attack_Leap 36 присед + 34 полёт + 6 удар + 44 возврат (высоту прыжка рисует игра), Blink 16.

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/build_promzona_boss_blender.py
"""
import math
import os

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'blender_assets', 'promzona_models', 'boss_dolbilshchik.glb')
OUT = os.path.join(ROOT, 'assets', 'models', 'boss_dolbilshchik.glb')
PREVIEW = os.path.join(ROOT, 'assets', 'models', 'preview')
NAME = 'Boss_Dolbilshchik'
HEIGHT = 2.05        # м: выше Василия и жаб
TRIS = 12000         # один на экране, рендерится живьём, как Мясник
ALBEDO = 1.0         # множитель цвета (baseColorFactor), см. яркость кадров рядом с Мясником
MAX_TEX = 512
WEBP_QUALITY = 82
FPS = 60

# Суставы — метры сырой модели (рост 1,9 м) от корня: x влево модели (+), y назад (+), z вверх
J = {
    'hips': (0, 0, 0.92), 'spine': (0, 0, 1.08), 'chest': (0, 0, 1.25), 'neck': (0, 0.01, 1.52),
    'head': (0, 0, 1.64), 'top': (0, -0.02, 1.90),
    'arm': {
        'L': [(0.06, 0.0, 1.48), (0.30, 0.0, 1.45), (0.42, -0.05, 1.13), (0.47, -0.20, 0.90), (0.47, -0.25, 0.76)],
        'R': [(-0.06, 0.0, 1.48), (-0.30, 0.0, 1.45), (-0.40, -0.12, 1.17), (-0.58, -0.27, 1.21), (-0.64, -0.32, 1.24)],
    },
    'leg': {
        'L': [(0.17, 0.0, 0.90), (0.24, -0.02, 0.48), (0.32, 0.02, 0.11), (0.36, -0.20, 0.03)],
        'R': [(-0.17, 0.0, 0.90), (-0.24, -0.02, 0.48), (-0.32, 0.02, 0.11), (-0.36, -0.20, 0.03)],
    },
    'hammer': [(-0.63, -0.31, 1.22), (-0.63, -0.33, 0.12)],   # хват -> центр бойка
}
HAMMER_LEN = 1.10    # от хвата до центра бойка (сырые метры)


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (p - (a + ab * t)).length


# Жёсткие части (сырые метры от корня): молот — рукоять капсулой и боёк коробкой, ранец, шлем на поясе
def rigid_bone(v):
    if seg_dist(v, Vector((-0.63, -0.31, 1.45)), Vector((-0.63, -0.32, 0.22))) < 0.06:
        return 'Hammer'
    if -0.88 < v.x < -0.43 and -0.48 < v.y < -0.225 and v.z < 0.26:
        return 'Hammer'
    if v.y > 0.20 and v.z > 1.0 and abs(v.x) < 0.38:
        return 'Chest'          # ранец
    if 0.08 < v.x < 0.38 and -0.36 < v.y < -0.11 and 0.62 < v.z < 0.98:
        return 'Hips'           # шлем на поясе
    return None


# ---------------------------------------------------------------- модель

def tris_of(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def import_joined(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
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
    obj.name = NAME + '_Body'
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0001)
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def slim_materials(obj):
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
                for l in list(n.outputs[0].links):
                    sep = l.to_node
                    for out in sep.outputs:
                        for l2 in list(out.links):
                            mat.node_tree.links.remove(l2)
                    nodes.remove(sep)
                nodes.remove(n)
                continue
            w, h = n.image.size
            if max(w, h) > MAX_TEX:
                k = MAX_TEX / max(w, h)
                n.image.scale(max(1, round(w * k)), max(1, round(h * k)))
        if bsdf:
            bsdf.inputs['Metallic'].default_value = 0.05
            bsdf.inputs['Roughness'].default_value = 0.85
            link = next(iter(bsdf.inputs['Base Color'].links), None)
            if link and ALBEDO != 1.0:
                mix = nodes.new('ShaderNodeMix')
                mix.data_type = 'RGBA'
                mix.blend_type = 'MULTIPLY'
                mix.inputs['Factor'].default_value = 1.0
                mix.inputs[7].default_value = (ALBEDO, ALBEDO, ALBEDO, 1.0)
                mat.node_tree.links.new(link.from_socket, mix.inputs[6])
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
    """Середина между щиколотками по x (без молота), глубина пояса по y, земля по z."""
    vs = [v.co for v in obj.data.vertices]
    z0 = min(v.z for v in vs)
    # Боёк молота стоит на земле справа от правой стопы — в срез щиколоток не берём всё, что дальше 0,35 м
    # вправо от середины модели (так же замерены JOINTS)
    mid = (min(v.x for v in vs) + max(v.x for v in vs)) / 2
    ank = [v for v in vs if 0.10 <= v.z - z0 <= 0.16 and v.x > mid - 0.35]
    cx = sum(v.x for v in ank) / len(ank)
    left = [v.x for v in ank if v.x > cx]
    right = [v.x for v in ank if v.x <= cx]
    ox = (sum(left) / len(left) + sum(right) / len(right)) / 2
    torso = [v for v in vs if 0.95 <= v.z - z0 <= 1.1 and abs(v.x - ox) < 0.25]
    oy = sum(v.y for v in torso) / len(torso)
    return Vector((ox, oy, z0)), max(v.z for v in vs) - z0


# ---------------------------------------------------------------- скелет

def build_rig(k):
    P = lambda p: Vector(p) * k
    bpy.ops.object.armature_add(location=(0, 0, 0))
    rig = bpy.context.active_object
    rig.name = NAME + '_Rig'
    rig.data.name = NAME + '_Skeleton'
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones

    def bone(name, head, tail, parent=None, deform=True, roll=None):
        b = eb.get(name) or eb.new(name)
        b.head, b.tail = head, tail
        if parent:
            b.parent = eb[parent]
        b.use_deform = deform
        if roll is not None:
            b.roll = roll
        return b

    root = eb['Bone']
    root.name = 'Root'
    root.head, root.tail = (0, 0, 0), (0, 0, 0.2)
    root.use_deform = False
    bone('Hips', P(J['hips']), P(J['spine']), 'Root')
    bone('Spine', P(J['spine']), P(J['chest']), 'Hips')
    bone('Chest', P(J['chest']), P(J['neck']), 'Spine')
    bone('Neck', P(J['neck']), P(J['head']), 'Chest')
    bone('Head', P(J['head']), P(J['top']), 'Neck')
    for s in ('L', 'R'):
        clav, sh, el, wr, hand = J['arm'][s]
        bone(f'Shoulder.{s}', P(clav), P(sh), 'Chest')
        bone(f'UpperArm.{s}', P(sh), P(el), f'Shoulder.{s}')
        bone(f'Forearm.{s}', P(el), P(wr), f'UpperArm.{s}')
        bone(f'Hand.{s}', P(wr), P(hand), f'Forearm.{s}')
        hip, knee, ankle, toe = J['leg'][s]
        bone(f'Thigh.{s}', P(hip), P(knee), 'Hips')
        bone(f'Shin.{s}', P(knee), P(ankle), f'Thigh.{s}')
        bone(f'Foot.{s}', P(ankle), P(toe), f'Shin.{s}')
    grip, head = J['hammer']
    bone('Hammer', P(grip), P(head), 'Hand.R')
    hh = bone('HammerHead', P(head), P(head) + Vector((0, 0, -0.08)), 'Hammer', deform=False)

    # Управляющие кости (только для постановки, потом удаляются)
    hand_r = eb['Hand.R']
    c = bone('Ctrl_Hammer', hand_r.head.copy(), hand_r.tail.copy(), 'Root', deform=False, roll=hand_r.roll)
    # Grip.L — на рукояти ниже правой руки, вдоль молота
    hdir = (P(head) - P(grip)).normalized()
    gl = P(grip) + hdir * 0.32 * k
    bone('Grip.L', gl, gl + Vector((0, -0.08, 0)), 'Ctrl_Hammer', deform=False)
    for s, sx in (('L', 1), ('R', -1)):
        foot = eb[f'Foot.{s}']
        bone(f'Ctrl_Foot.{s}', foot.head.copy(), foot.tail.copy(), 'Root', deform=False, roll=foot.roll)
        knee = eb[f'Shin.{s}'].head
        bone(f'Pole_Knee.{s}', knee + Vector((0, -0.6 * k, 0)), knee + Vector((0, -0.7 * k, 0)), 'Root', deform=False)
        elbow = eb[f'Forearm.{s}'].head
        bone(f'Pole_Elbow.{s}', elbow + Vector((sx * 0.3 * k, 0.5 * k, -0.1 * k)),
             elbow + Vector((sx * 0.3 * k, 0.6 * k, -0.1 * k)), 'Chest', deform=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


CONTROL_BONES = ('Ctrl_Hammer', 'Grip.L', 'Ctrl_Foot.L', 'Ctrl_Foot.R', 'Pole_Knee.L', 'Pole_Knee.R',
                 'Pole_Elbow.L', 'Pole_Elbow.R')


def skin(mesh, rig, k):
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for g in list(mesh.vertex_groups):
        b = rig.data.bones.get(g.name)
        if not b or not b.use_deform:
            mesh.vertex_groups.remove(g)
    groups = {g.name: g for g in mesh.vertex_groups}
    deform = [b for b in rig.data.bones if b.use_deform and b.name != 'Root']
    for b in deform:
        if b.name not in groups:
            groups[b.name] = mesh.vertex_groups.new(name=b.name)
    segs = {b.name: (b.head_local, b.tail_local) for b in deform}
    fixed = orphans = 0
    for v in mesh.data.vertices:
        rule = rigid_bone(v.co / k)
        weak = sum(g.weight for g in v.groups) < 0.01
        if not rule and not weak:
            continue
        for g in mesh.vertex_groups:
            g.remove([v.index])
        if rule:
            groups[rule].add([v.index], 1.0, 'REPLACE')
            fixed += 1
        else:
            near = min(segs, key=lambda n: seg_dist(v.co, *segs[n]))
            groups[near].add([v.index], 1.0, 'REPLACE')
            orphans += 1
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return fixed, orphans


# ---------------------------------------------------------------- управляющий риг

def setup_constraints(rig):
    pb = rig.pose.bones
    for b in pb:
        b.rotation_mode = 'QUATERNION'
    iks = []
    for bone, target, pole in (('Forearm.R', 'Ctrl_Hammer', 'Pole_Elbow.R'), ('Forearm.L', 'Grip.L', 'Pole_Elbow.L'),
                               ('Shin.L', 'Ctrl_Foot.L', 'Pole_Knee.L'), ('Shin.R', 'Ctrl_Foot.R', 'Pole_Knee.R')):
        c = pb[bone].constraints.new('IK')
        c.name = 'IK'
        c.target, c.subtarget = rig, target
        c.pole_target, c.pole_subtarget = rig, pole
        c.chain_count = 2
        iks.append((bone, c))
    for bone, src in (('Hand.R', 'Ctrl_Hammer'), ('Foot.L', 'Ctrl_Foot.L'), ('Foot.R', 'Ctrl_Foot.R')):
        c = pb[bone].constraints.new('COPY_ROTATION')
        c.name = 'Rot'
        c.target, c.subtarget = rig, src
    # Угол полюса — тот, при котором в позе покоя сустав остаётся на месте. Хват левой руки на рукояти
    # справа от тела — на время подбора он стоит у левого запястья
    grip = pb['Grip.L']
    grip.matrix = Matrix.Translation(pb['Forearm.L'].bone.tail_local - grip.bone.head_local) @ grip.bone.matrix_local
    bpy.context.view_layer.update()
    for bone, c in iks:
        joint = pb[bone].parent
        rest = joint.bone.tail_local.copy()
        best = None
        for ang in (0, 90, -90, 180):
            c.pole_angle = math.radians(ang)
            bpy.context.view_layer.update()
            d = (joint.tail - rest).length
            if best is None or d < best[0]:
                best = (d, ang)
        c.pole_angle = math.radians(best[1])
        print(f'  IK {bone}: pole {best[1]}°, отклонение в покое {best[0]:.3f} м')
    reset(rig)
    bpy.context.view_layer.update()


def reset(rig):
    for b in rig.pose.bones:
        b.location = (0, 0, 0)
        b.rotation_quaternion = (1, 0, 0, 0)
        b.scale = (1, 1, 1)


def set_matrix(rig, name, M):
    rig.pose.bones[name].matrix = M
    bpy.context.view_layer.update()


def euler_q(rx=0, ry=0, rz=0):
    """Поворот в осях арматуры (градусы): x — наклон вперёд (+)/назад, y — крен, z — поворот влево (+)."""
    return (Quaternion((0, 0, 1), math.radians(rz)) @ Quaternion((0, 1, 0), math.radians(ry))
            @ Quaternion((1, 0, 0), math.radians(rx)))


def rotate_bone(rig, name, q):
    pb = rig.pose.bones[name]
    m = pb.matrix.copy()
    head = m.translation.copy()
    set_matrix(rig, name, Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ m)


def apply_pose(rig, pose, k):
    """pose: hips (dx, dy, dz, rx, ry, rz), spine/chest/neck/head (rx, ry, rz), hammer ((хват), (направление бойка),
    крен), two (0..1 — левая рука на рукояти), arm_l (rx, ry, rz) — свободная левая рука,
    feet {'L': (x, y, z, rz)} — стопы (сырые метры). Всё в сырых метрах и градусах."""
    reset(rig)
    bpy.context.view_layer.update()
    pb = rig.pose.bones
    # стопы — на месте или куда сказано
    for s in ('L', 'R'):
        f = pose.get('feet', {}).get(s)
        rest = pb[f'Ctrl_Foot.{s}'].bone.matrix_local
        if f:
            x, y, z, rz = f
            M = Matrix.Translation(Vector((x, y, z)) * k) @ Quaternion((0, 0, 1), math.radians(rz)).to_matrix().to_4x4() \
                @ Matrix.Translation(-rest.translation) @ rest
            set_matrix(rig, f'Ctrl_Foot.{s}', M)
    hx = pose.get('hips', (0, 0, 0, 0, 0, 0))
    set_matrix(rig, 'Hips', Matrix.Translation(Vector(hx[:3]) * k) @ pb['Hips'].matrix)
    rotate_bone(rig, 'Hips', euler_q(*hx[3:]))
    for name in ('Spine', 'Chest', 'Neck', 'Head'):
        if name.lower() in pose:
            rotate_bone(rig, name, euler_q(*pose[name.lower()]))
    if 'arm_l' in pose:
        rotate_bone(rig, 'UpperArm.L', euler_q(*pose['arm_l']))
    # молот: хват в точке grip, боёк по направлению d, крен вокруг рукояти
    grip, d, roll = pose.get('hammer', (J['hammer'][0], (0, -0.02, -1), 0))
    rest = pb['Ctrl_Hammer'].bone.matrix_local
    rest_dir = (Vector(J['hammer'][1]) - Vector(J['hammer'][0])).normalized()
    d = Vector(d).normalized()
    q = Quaternion(d, math.radians(roll)) @ rest_dir.rotation_difference(d)
    M = Matrix.Translation(Vector(grip) * k) @ q.to_matrix().to_4x4() @ Matrix.Translation(-rest.translation) @ rest
    set_matrix(rig, 'Ctrl_Hammer', M)
    pb['Forearm.L'].constraints['IK'].influence = pose.get('two', 0.0)


KEY_BONES = ('Hips', 'Spine', 'Chest', 'Neck', 'Head', 'UpperArm.L', 'Ctrl_Hammer', 'Ctrl_Foot.L', 'Ctrl_Foot.R')


def key_pose(rig, frame, last_q):
    """Ключ позы. Кватернион приводится к знаку предыдущего ключа той же кости: q и -q — один поворот,
    но между ключами с разными знаками интерполяция идёт длинным путём (молот уходил назад сквозь голову)."""
    pb = rig.pose.bones
    for name in KEY_BONES:
        q = pb[name].rotation_quaternion.copy()
        prev = last_q.get(name)
        if prev is not None and prev.dot(q) < 0:
            q.negate()
            pb[name].rotation_quaternion = q
        last_q[name] = q
        pb[name].keyframe_insert(data_path='rotation_quaternion', frame=frame)
        pb[name].keyframe_insert(data_path='location', frame=frame)
    pb['Forearm.L'].constraints['IK'].keyframe_insert(data_path='influence', frame=frame)


# ---------------------------------------------------------------- клипы

GRIP0 = J['hammer'][0]
DOWN = (0, -0.02, -1)
CARRY = {'hammer': ((-0.60, -0.25, 1.18), (0, -0.35, -0.94), 0)}      # молот чуть на весу, боёк не волочится
OVERHEAD = {'hammer': ((-0.08, 0.12, 1.98), (0, 0.75, 0.35), 0), 'two': 1,
            'hips': (0, 0.02, -0.04, -4, 0, 0), 'spine': (-8, 0, 0), 'chest': (-8, 0, 0), 'head': (-4, 0, 0)}
# Верх дуги удара: молот идёт из-за головы вперёд над ней, а не вниз сквозь тело (поворот больше 180°
# интерполяция провела бы коротким путём — назад и вниз)
ARC_TOP = {'hammer': ((-0.08, -0.22, 1.85), (0, -0.30, 0.95), 0), 'two': 1,
           'hips': (0, 0, -0.10, 4, 0, 0), 'spine': (2, 0, 0), 'chest': (2, 0, 0)}
ARC_FRONT = {'hammer': ((-0.09, -0.48, 1.40), (0, -0.96, 0.25), 0), 'two': 1,
             'hips': (0, -0.03, -0.16, 9, 0, 0), 'spine': (8, 0, 0), 'chest': (6, 0, 0), 'head': (-6, 0, 0)}
IMPACT = {'hammer': ((-0.10, -0.55, 0.78), (0, -0.82, -0.57), 0), 'two': 1,
          'hips': (0, -0.06, -0.22, 14, 0, 0), 'spine': (14, 0, 0), 'chest': (10, 0, 0), 'head': (-12, 0, 0)}


def merge(*poses):
    out = {}
    for p in poses:
        out.update(p)
    return out


def walk_feet(f, period=48, stride=0.20, lift=0.13):
    """Стопы шага: L начинает впереди, R — сзади, на полпериода позже."""
    def foot(phase, x):
        # 0..0.5 — опора (стопа едет назад по земле), 0.5..1 — перенос (вверх и вперёд)
        if phase < 0.5:
            y = -stride + 2 * stride * (phase / 0.5)
            z = 0.11
        else:
            t = (phase - 0.5) / 0.5
            y = stride - 2 * stride * t
            z = 0.11 + lift * math.sin(math.pi * t)
        return (x, y + 0.02, z, 0)
    ph = (f % period) / period
    return {'L': foot(ph, 0.32), 'R': foot((ph + 0.5) % 1.0, -0.32)}


CLIPS = {
    'Idle': [
        (0, merge(CARRY, {'hammer': (GRIP0, DOWN, 0)})),
        (60, merge({'hammer': ((-0.63, -0.31, 1.235), DOWN, 0)}, {'chest': (-1.5, 0, 0), 'head': (1, 0, 2),
                                                                  'hips': (0, 0, 0.006, 0, 0, 0)})),
        (120, {'hammer': (GRIP0, DOWN, 0)}),
    ],
    'Walk': [(f, merge(CARRY, {
        'feet': walk_feet(f),
        'hips': (0, 0, -0.03 * abs(math.cos(2 * math.pi * f / 48)), 4, 0, 5 * math.sin(2 * math.pi * f / 48)),
        'chest': (2, 0, -7 * math.sin(2 * math.pi * f / 48)),
        'arm_l': (-18 * math.sin(2 * math.pi * f / 48), 0, 0),
        'hammer': ((-0.60, -0.25 - 0.05 * math.sin(2 * math.pi * f / 48), 1.18), (0, -0.35, -0.94), 0)}))
        for f in range(0, 49, 4)],
    # Удар сверху: 44 замах / 6 удар / 42 возврат
    'Attack_Slam': [
        (0, {'hammer': (GRIP0, DOWN, 0)}),
        (12, {'hammer': ((-0.30, -0.35, 1.30), (0.1, -0.2, 0.97), 0), 'two': 1, 'chest': (-3, 0, 0)}),
        (32, OVERHEAD),
        (44, merge(OVERHEAD, {'hammer': ((-0.06, 0.16, 2.02), (0, 0.85, 0.2), 0), 'spine': (-11, 0, 0)})),
        (45, ARC_TOP),
        (46, ARC_FRONT),
        (47, IMPACT),
        (50, IMPACT),
        (70, {'hammer': ((-0.35, -0.30, 0.98), (-0.05, -0.3, -0.95), 0), 'two': 1,
              'hips': (0, 0, -0.08, 5, 0, 0), 'spine': (5, 0, 0)}),
        (92, {'hammer': (GRIP0, DOWN, 0), 'two': 0}),
    ],
    # Размах: 30 замах / 10 удар / 34 возврат — справа-сзади через перёд влево
    'Attack_Sweep': [
        (0, {'hammer': (GRIP0, DOWN, 0)}),
        (30, {'hammer': ((-0.55, 0.30, 1.02), (-0.6, 0.65, -0.3), 0), 'two': 1,
              'hips': (0, 0, -0.10, 0, 0, -25), 'chest': (0, 0, -35), 'head': (0, 0, 20)}),
        (35, {'hammer': ((-0.05, -0.62, 1.00), (0, -1, -0.12), 0), 'two': 1,
              'hips': (0, 0, -0.12, 4, 0, 0), 'chest': (4, 0, 0)}),
        (40, {'hammer': ((0.55, -0.18, 1.00), (0.92, 0.3, -0.12), 0), 'two': 1,
              'hips': (0, 0, -0.10, 0, 0, 30), 'chest': (0, 0, 45), 'head': (0, 0, -25)}),
        (56, {'hammer': ((0.22, -0.30, 0.92), (0.4, -0.2, -0.9), 0), 'two': 1,
              'hips': (0, 0, -0.05, 0, 0, 12), 'chest': (0, 0, 15)}),
        (74, {'hammer': (GRIP0, DOWN, 0), 'two': 0}),
    ],
    # Электрический молот: 56 замах (молот вертикально над головой, боёк вверх, заряд) / 12 удар / 40 возврат
    'Attack_Electric': [
        (0, {'hammer': (GRIP0, DOWN, 0)}),
        (20, {'hammer': ((-0.22, -0.12, 1.50), (0.05, -0.1, 0.99), 0), 'two': 1, 'chest': (-3, 0, 0)}),
        (40, {'hammer': ((-0.10, 0.0, 1.92), (0, 0.12, 0.99), 0), 'two': 1,
              'hips': (0, 0, -0.05, -3, 0, 0), 'chest': (-7, 0, 0), 'head': (-10, 0, 0)}),
        (48, {'hammer': ((-0.12, 0.02, 1.95), (0.04, 0.14, 0.99), 6), 'two': 1,
              'hips': (0, 0, -0.06, -3, 0, 0), 'chest': (-8, 0, 2), 'head': (-10, 0, 0)}),
        (56, {'hammer': ((-0.09, -0.02, 1.93), (-0.03, 0.10, 0.99), -6), 'two': 1,
              'hips': (0, 0, -0.06, -3, 0, 0), 'chest': (-8, 0, -2), 'head': (-10, 0, 0)}),
        (61, {'hammer': ((-0.10, -0.62, 0.74), (0, -0.85, -0.53), 0), 'two': 1,
              'hips': (0, -0.08, -0.25, 16, 0, 0), 'spine': (18, 0, 0), 'chest': (10, 0, 0), 'head': (-14, 0, 0)}),
        (68, {'hammer': ((-0.10, -0.62, 0.74), (0, -0.85, -0.53), 0), 'two': 1,
              'hips': (0, -0.08, -0.25, 16, 0, 0), 'spine': (18, 0, 0), 'chest': (10, 0, 0), 'head': (-14, 0, 0)}),
        (86, {'hammer': ((-0.35, -0.30, 0.98), (-0.05, -0.3, -0.95), 0), 'two': 1,
              'hips': (0, 0, -0.08, 5, 0, 0), 'spine': (5, 0, 0)}),
        (108, {'hammer': (GRIP0, DOWN, 0), 'two': 0}),
    ],
    # Прыжок: 36 присед / 34 полёт (стопы поджаты, молот над головой) / 6 удар / 44 возврат
    'Attack_Leap': [
        (0, {'hammer': (GRIP0, DOWN, 0)}),
        (36, {'hammer': ((-0.30, 0.22, 0.95), (0, 0.6, -0.8), 0), 'two': 1,
              'hips': (0, 0.05, -0.34, 18, 0, 0), 'spine': (10, 0, 0), 'head': (-16, 0, 0)}),
        (46, merge(OVERHEAD, {'feet': {'L': (0.30, 0.10, 0.42, 0), 'R': (-0.30, 0.18, 0.36, 0)},
                              'hips': (0, 0.02, 0.06, -6, 0, 0)})),
        (66, merge(OVERHEAD, {'feet': {'L': (0.32, -0.04, 0.20, 0), 'R': (-0.32, 0.02, 0.18, 0)},
                              'hips': (0, 0.0, 0.02, -2, 0, 0)})),
        (70, merge(OVERHEAD, {'hammer': ((-0.06, 0.16, 2.02), (0, 0.85, 0.2), 0)})),
        (71, ARC_TOP),
        (72, ARC_FRONT),
        (73, IMPACT),
        (76, IMPACT),
        (96, {'hammer': ((-0.35, -0.30, 0.98), (-0.05, -0.3, -0.95), 0), 'two': 1,
              'hips': (0, 0, -0.08, 5, 0, 0), 'spine': (5, 0, 0)}),
        (120, {'hammer': (GRIP0, DOWN, 0), 'two': 0}),
    ],
    # Мерцание: вздрагивает, как сбой в изображении
    'Blink': [
        (0, {'hammer': (GRIP0, DOWN, 0)}),
        (3, {'hammer': ((-0.58, -0.31, 1.24), DOWN, 4), 'hips': (-0.03, 0, 0, 0, 0, 0), 'chest': (0, 0, 8),
             'head': (0, 4, -10)}),
        (7, {'hammer': ((-0.67, -0.31, 1.20), DOWN, -4), 'hips': (0.03, 0, -0.01, 0, 0, 0), 'chest': (0, 0, -8),
             'head': (0, -4, 8)}),
        (11, {'hammer': ((-0.62, -0.31, 1.23), DOWN, 2), 'hips': (-0.01, 0, 0, 0, 0, 0), 'chest': (0, 0, 3),
              'head': (0, 2, -3)}),
        (16, {'hammer': (GRIP0, DOWN, 0)}),
    ],
}


def author_and_bake(rig, k):
    sc = bpy.context.scene
    sc.render.fps = FPS
    rig.animation_data_create()
    baked = []
    deform = [b.name for b in rig.data.bones if b.use_deform]
    for clip, keys in CLIPS.items():
        ctrl = bpy.data.actions.new(name=f'_ctrl_{clip}')
        rig.animation_data.action = ctrl
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.mode_set(mode='POSE')
        last_q = {}
        for frame, pose in keys:
            sc.frame_set(frame)
            apply_pose(rig, pose, k)
            key_pose(rig, frame, last_q)
        first, last = keys[0][0], keys[-1][0]
        for b in rig.data.bones:
            b.select = b.name in deform
        bpy.ops.nla.bake(frame_start=first, frame_end=last, step=1, only_selected=True, visual_keying=True,
                         clear_constraints=False, clear_parents=False, use_current_action=False,
                         bake_types={'POSE'})
        act = rig.animation_data.action
        act.name = clip
        act.use_fake_user = True
        baked.append(act)
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.data.actions.remove(ctrl)
        print(f'  клип {clip}: кадры {first}..{last}')
    return baked


def strip_controls(rig):
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    for b in rig.pose.bones:
        for c in list(b.constraints):
            b.constraints.remove(c)
    bpy.ops.object.mode_set(mode='EDIT')
    for name in CONTROL_BONES:
        eb = rig.data.edit_bones.get(name)
        if eb:
            rig.data.edit_bones.remove(eb)
    bpy.ops.object.mode_set(mode='OBJECT')
    # из клипов — ключи только существующих костей
    for act in bpy.data.actions:
        for fc in list(act.fcurves):
            if any(f'["{n}"]' in fc.data_path for n in CONTROL_BONES):
                act.fcurves.remove(fc)


def main():
    mesh = import_joined(RAW)
    slim_materials(mesh)
    tris = decimate(mesh, TRIS)
    origin, raw_h = raw_origin(mesh)
    print(f'  корень {origin.x:.3f}, {origin.y:.3f}, {origin.z:.3f}; рост сырой модели {raw_h:.3f}')
    k = HEIGHT / raw_h
    mesh.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(-origin))
    mesh.data.update()
    rig = build_rig(k)
    fixed, orphans = skin(mesh, rig, k)
    setup_constraints(rig)
    baked = author_and_bake(rig, k)
    strip_controls(rig)
    rig.animation_data.action = next(a for a in baked if a.name == 'Idle')
    bpy.context.scene.frame_set(0)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False,
                              export_animations=True, export_animation_mode='ACTIONS',
                              export_skins=True, export_current_frame=False,
                              export_image_format='WEBP', export_image_quality=WEBP_QUALITY)
    print(f'[ok] {NAME}: {tris} tris, {os.path.getsize(OUT) // 1024} KB, рост {HEIGHT} м, '
          f'жёстких вершин {fixed}, без костей было {orphans}, клипов {len(baked)}')


if __name__ == '__main__':
    main()
