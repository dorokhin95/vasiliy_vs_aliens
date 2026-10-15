"""
Мастерская Толика в городе (src/settlers.js): верстак, баллоны на тележке, ящики с барахлом — модели, собранные
кодом в Blender (без генератора): геометрия с фасками, процедурные материалы, запечённые в одну текстуру.

  - Детали — коробки, цилиндры, уголок, трубки по кривой, буквы; размеры в метрах, фасад — в -Y, верх — +Z.
  - Материалы процедурные (Cycles): дерево — волокно и разный тон досок (атрибут tint), крашеный металл —
    потёртости до голого железа по рёбрам (нормаль фаски против нормали грани) и ржавчина в углах (AO),
    сталь, резина, латунь.
  - Запекание: все детали — один меш, Smart UV, base color (DIFFUSE COLOR) и AO с полом под моделью;
    текстура = цвет × затенение. Материал в GLB — одна текстура (игра свет считает сама, src/three_props.js).
  - Превью — assets/models/preview/<имя>.png: камера игры (спереди, 28°) и под углом, свет как в игре.

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/build_workshop_props_blender.py [-- имя ...]
"""
import math
import os
import random
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'models')
PREVIEW = os.path.join(OUT, 'preview')
TEX = 1024
FONT = 'C:/Windows/Fonts/arialbd.ttf'

rng = random.Random(7)


# ---------------------------------------------------------------- материалы

def hex_rgb(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # sRGB -> линейный
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c) + (a,)


class NT:
    """Узлы материала: короткие вызовы, связи — link(выход, вход)."""

    def __init__(self, name):
        self.mat = bpy.data.materials.new(name)
        self.mat.use_nodes = True
        self.nt = self.mat.node_tree
        self.n = self.nt.nodes
        self.bsdf = next(x for x in self.n if x.type == 'BSDF_PRINCIPLED')
        self.bsdf.inputs['Roughness'].default_value = 0.8
        self._coord = None

    def node(self, kind, **inputs):
        x = self.n.new(kind)
        for k, v in inputs.items():
            if k in x.inputs:
                x.inputs[k].default_value = v
            else:
                setattr(x, k, v)
        return x

    def link(self, a, b):
        self.nt.links.new(a, b)

    def coord(self):
        if not self._coord:
            self._coord = self.node('ShaderNodeTexCoord').outputs['Object']
        return self._coord

    def noise(self, scale, detail=6.0, rough=0.55, vec=None):
        x = self.node('ShaderNodeTexNoise', Scale=scale, Detail=detail, Roughness=rough)
        self.link(vec or self.coord(), x.inputs['Vector'])
        return x.outputs['Fac']

    def ramp(self, fac, stops):
        """stops: [(позиция, цвет rgba)] или [(позиция, число)]"""
        r = self.node('ShaderNodeValToRGB')
        el = r.color_ramp.elements
        while len(el) > len(stops):
            el.remove(el[-1])
        while len(el) < len(stops):
            el.new(0.5)
        for e, (p, c) in zip(el, stops):
            e.position = p
            e.color = c if isinstance(c, tuple) else (c, c, c, 1)
        self.link(fac, r.inputs['Fac'])
        return r.outputs['Color']

    def mix(self, fac, a, b, blend='MIX'):
        m = self.node('ShaderNodeMix', data_type='RGBA', blend_type=blend)
        for sock, v in ((m.inputs[0], fac), (m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            elif isinstance(v, tuple):
                sock.default_value = v
            else:
                self.link(v, sock)
        return m.outputs[2]

    def math(self, op, a, b=0.0, clamp=False):
        m = self.node('ShaderNodeMath', operation=op, use_clamp=clamp)
        for sock, v in ((m.inputs[0], a), (m.inputs[1], b)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            else:
                self.link(v, sock)
        return m.outputs[0]

    def edge(self, radius=0.006, gain=14.0):
        """Рёбра: 1 - (нормаль фаски · нормаль грани), усиленно"""
        bev = self.node('ShaderNodeBevel', Radius=radius)
        bev.samples = 8
        geo = self.node('ShaderNodeNewGeometry')
        dot = self.node('ShaderNodeVectorMath', operation='DOT_PRODUCT')
        self.link(bev.outputs['Normal'], dot.inputs[0])
        self.link(geo.outputs['Normal'], dot.inputs[1])
        return self.math('MULTIPLY', self.math('SUBTRACT', 1.0, dot.outputs['Value']), gain, clamp=True)

    def ao(self, dist=0.08):
        a = self.node('ShaderNodeAmbientOcclusion', Distance=dist)
        a.samples = 8
        return a.outputs['AO']

    def tint(self):
        a = self.node('ShaderNodeAttribute', attribute_name='tint')
        return a.outputs['Fac']

    def out(self, color):
        if isinstance(color, tuple):
            self.bsdf.inputs['Base Color'].default_value = color
        else:
            self.link(color, self.bsdf.inputs['Base Color'])
        return self.mat


def mat_flat(name, hexc):
    return NT(name).out(hex_rgb(hexc))


def mat_paint(name, hexc, wear=0.6, rust=0.5, bare='#8b8f93'):
    """Крашеный металл: тон пятнами, потёртости по рёбрам до железа, ржавчина в углах"""
    t = NT(name)
    base = hex_rgb(hexc)
    dark = tuple(c * 0.72 for c in base[:3]) + (1,)
    col = t.mix(t.ramp(t.noise(1.8, 8, 0.6), [(0.3, 0.0), (0.7, 1.0)]), dark, base)
    col = t.mix(t.ramp(t.noise(18.0, 4), [(0.45, 0.0), (0.75, 0.3)]), col, hex_rgb('#3a3632'), 'MIX')
    breakup = t.ramp(t.noise(30.0, 8, 0.7), [(0.35, 0.0), (0.7, 1.0)])
    wear_m = t.math('MULTIPLY', t.math('MULTIPLY', t.edge(), breakup), wear, clamp=True)
    col = t.mix(wear_m, col, hex_rgb(bare))
    rust_m = t.math('MULTIPLY', t.math('SUBTRACT', 1.0, t.ao(0.06)), t.ramp(t.noise(6.0, 6), [(0.4, 0.0), (0.65, 1.0)]))
    col = t.mix(t.math('MULTIPLY', rust_m, rust, clamp=True), col, hex_rgb('#6a3a1e'))
    # Грязь: пятнами и в углах
    grime = t.math('ADD', t.math('MULTIPLY', t.ramp(t.noise(1.4, 7, 0.65), [(0.4, 0.0), (0.75, 1.0)]), 0.5),
                   t.math('MULTIPLY', t.math('SUBTRACT', 1.0, t.ao(0.15)), 0.7), clamp=True)
    col = t.mix(grime, col, hex_rgb('#24251f'))
    # Пыль на том, что смотрит вверх
    geo = t.node('ShaderNodeNewGeometry')
    up = t.node('ShaderNodeSeparateXYZ')
    t.link(geo.outputs['Normal'], up.inputs[0])
    dust = t.math('MULTIPLY', t.math('MULTIPLY', up.outputs['Z'], t.ramp(t.noise(5.0, 6), [(0.3, 0.2), (0.8, 1.0)])), 0.22, clamp=True)
    col = t.mix(dust, col, hex_rgb('#8b8576'))
    return t.out(col)


def mat_steel(name, hexc='#6d7277', scratch=0.35):
    t = NT(name)
    base = hex_rgb(hexc)
    dark = tuple(c * 0.6 for c in base[:3]) + (1,)
    col = t.mix(t.noise(9.0, 10, 0.65), dark, base)
    # Царапины — вытянутый шум
    sc = t.node('ShaderNodeMapping')
    sc.inputs['Scale'].default_value = (60.0, 2.0, 2.0)
    t.link(t.coord(), sc.inputs['Vector'])
    scr = t.ramp(t.noise(1.0, 2, 0.5, sc.outputs['Vector']), [(0.62, 0.0), (0.7, 1.0)])
    col = t.mix(t.math('MULTIPLY', scr, scratch), col, hex_rgb('#b7bcc2'))
    col = t.mix(t.math('MULTIPLY', t.edge(0.004, 10.0), 0.5), col, hex_rgb('#c9ced3'))
    return t.out(col)


def mat_wood(name, axis, light='#7a5f40', dark='#4b3826', worn=0.35, oil=0.5):
    """Дерево: волокно вдоль оси axis ('X'|'Y'|'Z'), тон доски — атрибут tint, масляные пятна, светлые стёртые рёбра"""
    t = NT(name)
    m = t.node('ShaderNodeMapping')
    m.inputs['Scale'].default_value = {'X': (1.2, 45, 45), 'Y': (45, 1.2, 45), 'Z': (45, 45, 1.2)}[axis]
    t.link(t.coord(), m.inputs['Vector'])
    streak = t.noise(2.5, 10, 0.62, m.outputs['Vector'])
    col = t.ramp(streak, [(0.3, hex_rgb(dark)), (0.72, hex_rgb(light))])
    wave = t.node('ShaderNodeTexWave', wave_type='BANDS', bands_direction=axis, Scale=7.0, Distortion=2.5, Detail=2.0)
    t.link(t.coord(), wave.inputs['Vector'])
    col = t.mix(t.math('MULTIPLY', wave.outputs['Fac'], 0.3), col, hex_rgb(dark))
    # Тон доски: tint 0..1 — от темнее к светлее
    shade = t.math('ADD', t.math('MULTIPLY', t.tint(), 0.7), 0.6)
    sh = t.node('ShaderNodeCombineColor')
    for k in range(3):
        t.link(shade, sh.inputs[k])
    col = t.mix(1.0, col, sh.outputs['Color'], 'MULTIPLY')
    # Масло и копоть пятнами
    spots = t.ramp(t.noise(1.1, 6, 0.62), [(0.42, 0.0), (0.7, 1.0)])
    col = t.mix(t.math('MULTIPLY', spots, oil), col, hex_rgb('#231a12'))
    col = t.mix(t.math('MULTIPLY', t.edge(0.005, 12.0), worn), col, hex_rgb('#a89272'))
    col = t.mix(t.math('MULTIPLY', t.math('SUBTRACT', 1.0, t.ao(0.06)), 0.7), col, hex_rgb('#1e1710'))
    return t.out(col)


def mat_rubber(name, hexc='#19191b'):
    t = NT(name)
    base = hex_rgb(hexc)
    col = t.mix(t.noise(25.0, 4), base, tuple(min(1, c * 1.8) for c in base[:3]) + (1,))
    col = t.mix(t.math('MULTIPLY', t.edge(0.004, 8.0), 0.35), col, hex_rgb('#5a5a5c'))
    return t.out(col)


# ---------------------------------------------------------------- детали

PARTS = []


def keep(o, mat, tint=1.0, bevel=0.0, seg=2):
    if bevel > 0:
        b = o.modifiers.new('bevel', 'BEVEL')
        b.width = bevel
        b.segments = seg
        b.limit_method = 'ANGLE'
        b.angle_limit = math.radians(35)
    o.data.materials.clear()
    o.data.materials.append(mat)
    o['tint'] = tint
    PARTS.append(o)
    return o


def box(size, loc, mat, rot=(0, 0, 0), bevel=0.004, tint=1.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return keep(o, mat, tint, bevel)


def cyl(r, h, loc, mat, rot=(0, 0, 0), verts=24, bevel=0.003, tint=1.0, cap=True, wall=0.006):
    """Цилиндр; без торцов (cap=False) — труба со стенкой wall"""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot,
                                        end_fill_type='NGON' if cap else 'NOTHING')
    o = bpy.context.active_object
    for p in o.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    if not cap:
        sm = o.modifiers.new('wall', 'SOLIDIFY')
        sm.thickness = wall
        bevel = 0.0
    return keep(o, mat, tint, bevel)


def sphere(r, loc, mat, scale=(1, 1, 1), seg=24, rings=12, tint=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    for p in o.data.polygons:
        p.use_smooth = True
    return keep(o, mat, tint)


def torus(R, r, loc, mat, rot=(0, 0, 0), maj=32, mnr=12):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mnr,
                                     location=loc, rotation=rot)
    o = bpy.context.active_object
    for p in o.data.polygons:
        p.use_smooth = True
    return keep(o, mat)


def angle_iron(length, a, t, loc, axis, flip, mat):
    """Уголок a×a толщиной t вдоль оси axis; flip — куда смотрят полки (знаки двух поперечных осей)"""
    bm = bmesh.new()
    s1, s2 = flip
    prof = [(0, 0), (s1 * a, 0), (s1 * a, s2 * t), (s1 * t, s2 * t), (s1 * t, s2 * a), (0, s2 * a)]
    if s1 * s2 < 0:
        prof = prof[::-1]
    h = length / 2
    vs0, vs1 = [], []
    for u, v in prof:
        if axis == 'Z':
            p0, p1 = (u, v, -h), (u, v, h)
        elif axis == 'X':
            p0, p1 = (-h, u, v), (h, u, v)
        else:
            p0, p1 = (u, -h, v), (u, h, v)
        vs0.append(bm.verts.new(p0))
        vs1.append(bm.verts.new(p1))
    bm.faces.new(vs0)
    bm.faces.new(vs1[::-1])
    n = len(prof)
    for i in range(n):
        bm.faces.new([vs0[i], vs0[(i + 1) % n], vs1[(i + 1) % n], vs1[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('angle')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('angle', me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    return keep(o, mat, bevel=0.0015, seg=1)


def tube(points, r, mat, smooth=True, res=10):
    """Трубка (кабель, шланг) по точкам: кривая NURBS с толщиной -> меш"""
    cu = bpy.data.curves.new('tube', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    cu.resolution_u = res
    sp = cu.splines.new('NURBS' if smooth else 'POLY')
    sp.points.add(len(points) - 1)
    for p, c in zip(sp.points, points):
        p.co = (c[0], c[1], c[2], 1)
    if smooth:
        sp.use_endpoint_u = True
        sp.order_u = 3
    cu.use_fill_caps = True
    o = bpy.data.objects.new('tube', cu)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.active_object
    for p in o.data.polygons:
        p.use_smooth = True
    return keep(o, mat)


_font = None


def letters(text, size, loc, rot, mat, extrude=0.0006):
    global _font
    if _font is None:
        _font = bpy.data.fonts.load(FONT) if os.path.exists(FONT) else False
    cu = bpy.data.curves.new('txt', 'FONT')
    cu.body = text
    if _font:
        cu.font = _font
    cu.size = size
    cu.resolution_u = 2      # буквы мелкие — гладкие кривые не нужны
    cu.extrude = extrude
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new('txt', cu)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.selected_objects:
        x.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return keep(bpy.context.active_object, mat)


def letters_round(text, size, r, z, angle0, step, mat, vertical=False, z_step=0.0):
    """Буквы по окружности цилиндра радиуса r (ось Z в начале координат детали — смещение потом)"""
    out = []
    for i, ch in enumerate(text):
        if ch == ' ':
            continue
        a = angle0 + (0 if vertical else i * step)
        zz = z - (i * z_step if vertical else 0)
        x, y = math.sin(a) * r, -math.cos(a) * r
        out.append(letters(ch, size, (x, y, zz), (math.pi / 2, 0, a), mat))
    return out


def place(objs, loc, eul=(0, 0, 0)):
    """Детали, собранные вокруг начала координат, — повернуть и поставить"""
    m = Matrix.Translation(loc) @ Euler(eul, 'XYZ').to_matrix().to_4x4()
    for o in objs:
        o.matrix_world = m @ o.matrix_world


# ---------------------------------------------------------------- модели

def build_workbench():
    frame = mat_paint('frame', '#3f4b3c', wear=0.9, rust=0.8)
    cab = mat_paint('cabinet', '#4a5745', wear=0.8, rust=0.5)
    vise = mat_paint('vise', '#3c5664', wear=0.9, rust=0.4)
    trans = mat_paint('transformer', '#3a4656', wear=0.6, rust=0.3)
    top = mat_wood('top', 'X', '#7d6142', '#45331f', 0.45, oil=0.8)
    handle_wood = mat_wood('handle', 'X', '#9a6b3c', '#5a3a1e', 0.2, oil=0.2)
    ply = mat_wood('ply', 'X', '#8a7352', '#5a4630', 0.3, oil=0.3)
    copper = mat_steel('copper', '#9a5a2e', 0.3)
    steel = mat_steel('steel')
    dsteel = mat_steel('dsteel', '#43474c', 0.25)
    sheet = mat_steel('sheet', '#7a7f84', 0.5)
    rubber = mat_rubber('rubber')
    glass = mat_flat('glass', '#16302c')
    card = mat_paint('cardboard', '#8a6b43', wear=0.2, rust=0.0, bare='#a88a5e')
    brass = mat_steel('brass', '#a8873a', 0.2)
    white = mat_flat('label', '#b9ae8c')

    L, D, H = 2.0, 0.8, 0.85
    x0, x1, y0, y1 = -L / 2 + 0.03, L / 2 - 0.03, -D / 2 + 0.03, D / 2 - 0.03
    a, t = 0.05, 0.005
    # Ножки — уголок, рёбром наружу
    for x, y, f in ((x0, y0, (1, 1)), (x1, y0, (-1, 1)), (x0, y1, (1, -1)), (x1, y1, (-1, -1))):
        angle_iron(H - 0.05, a, t, (x, y, (H - 0.05) / 2), 'Z', f, frame)
        box((0.07, 0.07, 0.006), (x + f[0] * 0.025, y + f[1] * 0.025, 0.003), frame, bevel=0.002)
    # Обвязка под столешницей и внизу
    # Обвязка: угол уголка сверху снаружи, горизонтальная полка — под столешницей (и под нижней полкой)
    for z in (H - 0.05, 0.16):
        angle_iron(x1 - x0, a, t, (0, y0, z), 'X', (1, -1), frame)
        angle_iron(x1 - x0, a, t, (0, y1, z), 'X', (-1, -1), frame)
        angle_iron(y1 - y0, a, t, (x0, 0, z), 'Y', (1, -1), frame)
        angle_iron(y1 - y0, a, t, (x1, 0, z), 'Y', (-1, -1), frame)
    # Нижняя полка — лист под левой частью
    box((1.32, D - 0.1, 0.006), (-0.3, 0, 0.165), frame, bevel=0.002)
    # Столешница — доски вдоль, по краю — стальной уголок
    n = 5
    gap = 0.008
    w = (D - gap * (n - 1)) / n
    for i in range(n):
        y = -D / 2 + w / 2 + i * (w + gap)
        box((L, w, 0.05), (0, y, H - 0.025), top, bevel=0.005, tint=rng.random())
    angle_iron(L, 0.035, 0.004, (0, -D / 2 - 0.002, H + 0.002), 'X', (1, -1), mat_steel('edge', '#55595e', 0.3))
    # Тумба с ящиками справа
    cx, cw, cd, cz0, cz1 = 0.66, 0.56, D - 0.08, 0.22, H - 0.05
    box((cw, cd, cz1 - cz0), (cx, 0, (cz0 + cz1) / 2), cab, bevel=0.006)
    dh = (cz1 - cz0 - 0.04) / 3
    for i in range(3):
        z = cz0 + 0.02 + dh / 2 + i * dh
        box((cw - 0.05, 0.02, dh - 0.016), (cx, -cd / 2 - 0.008, z), cab, bevel=0.005)
        cyl(0.007, 0.16, (cx, -cd / 2 - 0.035, z + dh * 0.2), steel, rot=(0, math.pi / 2, 0), verts=10)
        for dx in (-0.075, 0.075):
            box((0.012, 0.025, 0.014), (cx + dx, -cd / 2 - 0.025, z + dh * 0.2), steel, bevel=0.002)
        box((0.07, 0.004, 0.035), (cx, -cd / 2 - 0.019, z - dh * 0.18), white, bevel=0.001)
    # Тиски на левом переднем углу
    vx, vy = -0.78, -0.3
    box((0.2, 0.2, 0.025), (vx, vy, H + 0.0125), vise, bevel=0.004)
    for dx in (-0.075, 0.075):
        for dy in (-0.075, 0.075):
            cyl(0.012, 0.012, (vx + dx, vy + dy, H + 0.031), dsteel, verts=6)
    box((0.13, 0.17, 0.1), (vx, vy + 0.03, H + 0.075), vise, bevel=0.01)
    box((0.07, 0.07, 0.05), (vx, vy + 0.14, H + 0.1), dsteel, bevel=0.008)          # наковаленка
    box((0.16, 0.03, 0.065), (vx, vy - 0.06, H + 0.155), vise, bevel=0.006)         # неподвижная губка
    box((0.15, 0.1, 0.085), (vx, vy - 0.15, H + 0.11), vise, bevel=0.01)           # подвижная губка
    box((0.16, 0.025, 0.06), (vx, vy - 0.1, H + 0.16), vise, bevel=0.005)
    for y in (vy - 0.0745, vy - 0.0855):
        box((0.15, 0.006, 0.04), (vx, y, H + 0.165), dsteel, bevel=0.001)          # губки-накладки
    cyl(0.014, 0.16, (vx, vy - 0.27, H + 0.1), steel, rot=(math.pi / 2, 0, 0), verts=14)
    cyl(0.009, 0.26, (vx, vy - 0.35, H + 0.1), steel, rot=(0, math.pi / 2, 0), verts=10)
    for dx in (-0.13, 0.13):
        sphere(0.016, (vx + dx, vy - 0.35, H + 0.1), steel, seg=12, rings=8)
    # На столе: лист железа, труба с приваренным уголком (заготовка), молоток, ключ, электроды, щиток
    box((0.55, 0.36, 0.004), (0.42, 0.02, H + 0.002), sheet, rot=(0, 0, 0.06), bevel=0.0015)
    cyl(0.045, 0.42, (0.5, -0.02, H + 0.05), dsteel, rot=(0, math.pi / 2, 0.08), verts=20)
    angle_iron(0.18, 0.04, 0.004, (0.5, -0.02, H + 0.096), 'Y', (1, 1), steel)
    torus(0.046, 0.006, (0.43, -0.03, H + 0.05), dsteel, rot=(0, math.pi / 2, 0.08), maj=20, mnr=6)   # шов
    cyl(0.013, 0.3, (-0.12, -0.18, H + 0.013), handle_wood, rot=(0, math.pi / 2, 0.35), verts=10)
    box((0.04, 0.11, 0.035), (0.02, -0.13, H + 0.018), dsteel, rot=(0, 0, 0.35), bevel=0.004)
    box((0.22, 0.03, 0.01), (-0.36, -0.22, H + 0.005), steel, rot=(0, 0, -0.2), bevel=0.003)
    cyl(0.03, 0.012, (-0.47, -0.2, H + 0.006), steel, verts=16)
    box((0.3, 0.07, 0.045), (-0.1, 0.26, H + 0.023), card, rot=(0, 0, 0.05), bevel=0.003)
    box((0.06, 0.004, 0.025), (-0.1, 0.225, H + 0.025), white, rot=(0, 0, 0.05), bevel=0.0005)
    # Щиток сварщика: корпус, тёмное стекло, ручка
    mask = mat_rubber('mask', '#1d1e20')
    box((0.24, 0.07, 0.2), (-0.42, 0.2, H + 0.1), mask, rot=(-0.35, 0, 0.15), bevel=0.02)
    box((0.11, 0.02, 0.05), (-0.41, 0.15, H + 0.12), glass, rot=(-0.35, 0, 0.15), bevel=0.003)
    cyl(0.014, 0.12, (-0.44, 0.26, H + 0.04), handle_wood, rot=(0, math.pi / 2, 0.15), verts=10)
    # Задняя стенка: фанера на стойках, на ней ключи, ножовка, моток проволоки; лампа на кронштейне
    yb = D / 2 - 0.03
    for x, f in ((-0.95, (1, -1)), (0.95, (-1, -1))):
        angle_iron(0.62, a, t, (x, yb, H + 0.31), 'Z', f, frame)
    box((1.86, 0.015, 0.52), (0, yb - 0.01, H + 0.33), ply, bevel=0.004, tint=0.5)
    for k, (x, ln) in enumerate(((-0.8, 0.26), (-0.72, 0.23), (-0.645, 0.2), (-0.58, 0.17), (-0.525, 0.15))):
        zc = H + 0.5 - ln / 2
        box((0.024 - k * 0.002, 0.006, ln), (x, yb - 0.025, zc), steel, bevel=0.002)
        torus(0.022 - k * 0.002, 0.006, (x, yb - 0.025, zc + ln / 2), steel, rot=(math.pi / 2, 0, 0), maj=16, mnr=6)
        cyl(0.004, 0.03, (x, yb - 0.03, H + 0.53), dsteel, rot=(math.pi / 2, 0, 0), verts=6, bevel=0)
    box((0.42, 0.003, 0.09), (-0.15, yb - 0.022, H + 0.42), steel, rot=(0, 0.05, 0), bevel=0.001)        # ножовка
    box((0.12, 0.025, 0.1), (0.1, yb - 0.03, H + 0.44), handle_wood, rot=(0, 0.05, 0), bevel=0.01)
    torus(0.085, 0.012, (0.38, yb - 0.03, H + 0.42), copper, rot=(math.pi / 2, 0, 0), maj=28, mnr=8)  # проволока
    torus(0.075, 0.01, (0.385, yb - 0.04, H + 0.415), copper, rot=(math.pi / 2, 0.2, 0), maj=28, mnr=8)
    for x in (0.6, 0.72):                                                                          # плоскогубцы, отвёртка
        box((0.018, 0.012, 0.2), (x, yb - 0.025, H + 0.4), rubber if x < 0.7 else handle_wood, rot=(0, 0.12, 0), bevel=0.004)
        box((0.014, 0.008, 0.08), (x - 0.012, yb - 0.025, H + 0.53), steel, rot=(0, 0.12, 0), bevel=0.002)
    tube([(0.92, yb - 0.02, H + 0.6), (0.85, yb - 0.1, H + 0.68), (0.62, yb - 0.25, H + 0.66)], 0.008, dsteel)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.09, radius2=0.03, depth=0.1, location=(0.6, yb - 0.27, H + 0.6),
                                    end_fill_type='NOTHING')
    sh = bpy.context.active_object
    sm = sh.modifiers.new('wall', 'SOLIDIFY')
    sm.thickness = 0.004
    keep(sh, trans)
    sphere(0.025, (0.6, yb - 0.27, H + 0.565), mat_flat('bulb', '#efe6c4'), seg=12, rings=8)
    # Сварочный трансформатор на нижней полке, кабель к держаку на столе
    tx, ty, tz = -0.55, 0.02, 0.17
    box((0.5, 0.34, 0.42), (tx, ty, tz + 0.21), trans, bevel=0.012)
    slot = mat_flat('slot', '#16181b')
    for i in range(6):
        box((0.004, 0.2, 0.012), (tx - 0.251, ty, tz + 0.1 + i * 0.045), slot, bevel=0.0)
        box((0.3, 0.004, 0.012), (tx + 0.02, ty - 0.171, tz + 0.08 + i * 0.03), slot, bevel=0.0)
    cyl(0.035, 0.03, (tx - 0.12, ty - 0.18, tz + 0.32), dsteel, rot=(math.pi / 2, 0, 0), verts=18)
    box((0.012, 0.012, 0.05), (tx - 0.12, ty - 0.198, tz + 0.33), white, bevel=0.0)
    box((0.12, 0.004, 0.07), (tx + 0.1, ty - 0.172, tz + 0.33), white, bevel=0.001)
    for dx in (-0.06, 0.06):
        cyl(0.02, 0.03, (tx + 0.16 + dx * 0.4, ty - 0.18, tz + 0.18), brass, rot=(math.pi / 2, 0, 0), verts=12)
    for dx in (-0.16, 0.16):
        box((0.02, 0.02, 0.07), (tx + dx, ty, tz + 0.455), dsteel, bevel=0.003)
    box((0.34, 0.025, 0.02), (tx, ty, tz + 0.49), dsteel, bevel=0.005)
    tube([(tx + 0.17, ty - 0.2, tz + 0.18), (tx + 0.3, ty - 0.33, tz + 0.12), (0.0, -0.45, 0.35),
          (0.25, -0.43, H - 0.1), (0.3, -0.25, H + 0.03), (0.32, -0.1, H + 0.02)], 0.011, rubber)
    tube([(tx + 0.14, ty - 0.2, tz + 0.18), (tx + 0.2, ty - 0.36, 0.05), (tx + 0.55, -0.42, 0.02),
          (tx + 0.8, -0.3, 0.02)], 0.011, rubber)
    cyl(0.016, 0.16, (0.37, -0.1, H + 0.022), rubber, rot=(0, math.pi / 2, -0.4), verts=12)     # держак
    cyl(0.003, 0.18, (0.48, -0.13, H + 0.03), dsteel, rot=(0, math.pi / 2, -0.6), verts=6)      # электрод
    cyl(0.03, 0.025, (tx + 0.8, -0.3, 0.025), brass, verts=14)                                    # клемма массы


def build_cylinders():
    blue = mat_paint('oxygen', '#22549e', wear=0.8, rust=0.25, bare='#7d8187')
    red = mat_paint('propane', '#a82a20', wear=0.8, rust=0.35, bare='#7d8187')
    cart = mat_paint('cart', '#2f3532', wear=0.9, rust=0.8)
    steel = mat_steel('steel')
    dsteel = mat_steel('dsteel', '#43474c', 0.25)
    brass = mat_steel('brass', '#ad8b3a', 0.2)
    rubber = mat_rubber('rubber')
    hose_b = mat_rubber('hose_b', '#23406e')
    hose_r = mat_rubber('hose_r', '#7a2520')
    face = mat_flat('gauge', '#e6e2d4')
    black = mat_flat('ink_black', '#141414')
    white = mat_flat('ink_white', '#e8e4da')

    # Тележка: плита, стойки, ручка, ось с колёсами сзади
    base_z = 0.08
    box((0.66, 0.36, 0.012), (0, 0, base_z - 0.006), cart, bevel=0.003)
    for x in (-0.3, 0.3):
        cyl(0.016, 1.12, (x, 0.17, base_z + 0.56), cart, verts=12)
    cyl(0.016, 0.6, (0, 0.17, base_z + 1.12), cart, rot=(0, math.pi / 2, 0), verts=12)
    for x in (-0.3, 0.3):
        sphere(0.02, (x, 0.17, base_z + 1.12), cart, seg=12, rings=8)
        tube([(x, 0.17, base_z + 1.12), (x, 0.3, base_z + 1.2), (x, 0.4, base_z + 1.24)], 0.015, cart)
    cyl(0.015, 0.68, (0, 0.4, base_z + 1.24), rubber, rot=(0, math.pi / 2, 0), verts=12)
    cyl(0.012, 0.6, (0, 0.17, base_z + 0.75), cart, rot=(0, math.pi / 2, 0), verts=10)
    cyl(0.014, 0.82, (0, 0.2, 0.14), dsteel, rot=(0, math.pi / 2, 0), verts=12)
    for x in (-0.38, 0.38):
        torus(0.11, 0.04, (x, 0.2, 0.15), rubber, rot=(0, math.pi / 2, 0), maj=28, mnr=10)
        cyl(0.075, 0.05, (x, 0.2, 0.15), dsteel, rot=(0, math.pi / 2, 0), verts=20)
        cyl(0.025, 0.07, (x, 0.2, 0.15), steel, rot=(0, math.pi / 2, 0), verts=10)

    def gauge(x, y, z):
        cyl(0.032, 0.022, (x, y, z), dsteel, rot=(math.pi / 2, 0, 0), verts=20)
        cyl(0.026, 0.004, (x, y - 0.012, z), face, rot=(math.pi / 2, 0, 0), verts=20, bevel=0)
        box((0.002, 0.002, 0.02), (x + 0.004, y - 0.0145, z + 0.004), black, rot=(0, 0.6, 0), bevel=0)

    # Кислород: высокий синий, 40 л (собирается вокруг своей оси, потом ставится на тележку)
    ox, oy, r = -0.15, 0.0, 0.11
    i0 = len(PARTS)
    cyl(r, 1.26, (0, 0, base_z + 0.63), blue, verts=36, bevel=0.006)
    sphere(r, (0, 0, base_z + 1.26), blue, scale=(1, 1, 0.75), seg=36, rings=14)
    cyl(0.03, 0.06, (0, 0, base_z + 1.36), steel, verts=16)
    cyl(0.045, 0.02, (0, 0, base_z + 1.34), blue, verts=20)
    box((0.05, 0.05, 0.06), (0, 0, base_z + 1.42), brass, bevel=0.006)
    cyl(0.01, 0.05, (0, 0, base_z + 1.47), brass, verts=10)
    box((0.07, 0.006, 0.006), (0, 0, base_z + 1.495), dsteel, bevel=0.001)
    cyl(0.04, 0.09, (0.07, 0, base_z + 1.42), brass, rot=(0, math.pi / 2, 0), verts=18)    # редуктор
    gauge(0.06, -0.05, base_z + 1.49)
    gauge(0.12, -0.05, base_z + 1.46)
    letters_round('КИСЛОРОД', 0.05, r + 0.0015, base_z + 1.06, 0.0, 0, black, vertical=True, z_step=0.062)
    place(PARTS[i0:], (ox, oy, 0))
    # Пропан: красный, толстый, 50 л, с кожухом вентиля
    px, py, R = 0.15, -0.01, 0.15
    i0 = len(PARTS)
    cyl(R, 0.72, (0, 0, base_z + 0.36), red, verts=40, bevel=0.006)
    sphere(R, (0, 0, base_z + 0.72), red, scale=(1, 1, 0.55), seg=40, rings=14)
    torus(R - 0.005, 0.012, (0, 0, base_z + 0.16), red, maj=40, mnr=8)
    torus(R - 0.005, 0.012, (0, 0, base_z + 0.56), red, maj=40, mnr=8)
    cyl(0.07, 0.08, (0, 0, base_z + 0.84), red, verts=24, cap=False)
    box((0.045, 0.045, 0.05), (0, 0, base_z + 0.84), brass, bevel=0.005)
    cyl(0.035, 0.07, (-0.06, 0, base_z + 0.86), brass, rot=(0, math.pi / 2, 0), verts=16)
    gauge(-0.07, -0.045, base_z + 0.92)
    letters_round('ПРОПАН', 0.075, R + 0.0015, base_z + 0.4, -0.75, 0.3, white)
    place(PARTS[i0:], (px, py, 0))
    # Хомут на тележке поперёк баллонов
    zs = base_z + 0.5
    tube([(-0.3, 0.17, zs), (-0.28, -0.11, zs), (-0.15, -0.125, zs), (0.0, -0.14, zs), (0.15, -0.172, zs),
          (0.3, -0.12, zs), (0.3, 0.17, zs)], 0.006, dsteel)
    # Шланги: от редукторов вниз и петлями на плиту перед баллонами
    for col, sx, ex in ((hose_b, ox + 0.12, -0.12), (hose_r, px - 0.1, 0.12)):
        pts = [(sx, -0.02, base_z + 1.42 if col is hose_b else base_z + 0.86), (sx + 0.02, -0.16, base_z + 0.9),
               (ex, -0.24, base_z + 0.35), (ex - 0.1, -0.3, base_z + 0.04)]
        for k in range(9):
            a = k / 8 * 2 * math.pi
            pts.append((ex + 0.12 * math.cos(a) - 0.05, -0.31 + 0.08 * math.sin(a), base_z + 0.02 + 0.006 * k))
        tube(pts, 0.012, col)


def build_crates():
    wood = {ax: mat_wood('wood_' + ax, ax, '#8a7a62', '#4f4232', 0.5, oil=0.35) for ax in 'XYZ'}
    steel = mat_steel('steel', '#5d6166', 0.3)
    dsteel = mat_steel('dsteel', '#3e4146', 0.2)
    rusty = mat_paint('rusty', '#6b4a32', wear=0.3, rust=1.0, bare='#7a6a5a')
    ink = mat_flat('ink', '#1b1b18')

    def crate(cx, cy, cz, w, d, h, yaw, lid=True):
        made = []
        bt = 0.018            # толщина доски
        nb = 3
        bh = (h - 0.01 * (nb - 1)) / nb
        for i in range(nb):
            z = cz + bh / 2 + i * (bh + 0.01)
            for sgn in (-1, 1):
                made.append(box((w, bt, bh), (0, sgn * (d / 2 - bt / 2), z), wood['X'], bevel=0.003, tint=rng.random()))
                made.append(box((bt, d - 2 * bt, bh), (sgn * (w / 2 - bt / 2), 0, z), wood['Y'], bevel=0.003, tint=rng.random()))
        made.append(box((w - 2 * bt, d - 2 * bt, bt), (0, 0, cz + bt / 2), wood['X'], bevel=0.002, tint=rng.random()))
        # Угловые бруски и планки
        for sx in (-1, 1):
            for sy in (-1, 1):
                made.append(box((0.035, 0.035, h), (sx * (w / 2 + 0.008), sy * (d / 2 + 0.008), cz + h / 2), wood['Z'],
                                bevel=0.004, tint=rng.random()))
                made.append(box((0.04, 0.003, 0.05), (sx * (w / 2 - 0.01), sy * (d / 2 + 0.026), cz + h - 0.03), dsteel, bevel=0.0008))
        if lid:
            nl = 4
            lw = (d + 0.02 - 0.008 * (nl - 1)) / nl
            for i in range(nl):
                y = -(d + 0.02) / 2 + lw / 2 + i * (lw + 0.008)
                made.append(box((w + 0.03, lw, bt), (0, y, cz + h + bt / 2), wood['X'], bevel=0.003, tint=rng.random()))
        for o in made:
            v = Vector(o.location)
            c, s = math.cos(yaw), math.sin(yaw)
            o.location = (cx + v.x * c - v.y * s, cy + v.x * s + v.y * c, v.z)
            o.rotation_euler = (0, 0, yaw)
        return made

    crate(-0.34, 0.02, 0.0, 0.62, 0.44, 0.4, 0.04)
    crate(0.34, -0.02, 0.0, 0.58, 0.42, 0.38, -0.05)
    top = crate(0.02, 0.06, 0.42, 0.6, 0.42, 0.34, 0.09, lid=False)
    # Трафарет на переднем ящике
    letters('ЗИП  №7', 0.07, (-0.34, 0.02 - 0.22 - 0.001, 0.22), (math.pi / 2, 0, 0.04), ink)
    letters('ТОЛИК', 0.055, (0.34, -0.02 - 0.21 - 0.001, 0.2), (math.pi / 2, 0, -0.05), ink)
    # Барахло в открытом ящике: трубы, арматура, шестерня, лист
    zt = 0.42
    cyl(0.04, 0.7, (-0.08, 0.04, zt + 0.42), rusty, rot=(0.35, 0.55, 0), verts=18, cap=False)
    cyl(0.03, 0.62, (0.1, 0.1, zt + 0.4), steel, rot=(-0.25, -0.4, 0), verts=16, cap=False)
    cyl(0.05, 0.4, (0.18, 0.0, zt + 0.3), rusty, rot=(0.1, 0.9, 0.3), verts=18, cap=False)
    for i in range(4):
        cyl(0.007, 0.6, (-0.1 + i * 0.05, 0.1, zt + 0.36), dsteel, rot=(0.45 - i * 0.15, -0.45 + i * 0.12, 0), verts=6)
    box((0.3, 0.004, 0.26), (0.05, 0.16, zt + 0.42), steel, rot=(0.3, 0, 0.2), bevel=0.001)
    # Шестерня: диск, ступица, зубья по кругу
    i0 = len(PARTS)
    cyl(0.11, 0.035, (0, 0, 0), dsteel, verts=36)
    cyl(0.03, 0.045, (0, 0, 0), steel, verts=16)
    for k in range(18):
        a = k / 18 * 2 * math.pi
        box((0.026, 0.028, 0.035), (math.cos(a) * 0.118, math.sin(a) * 0.118, 0), dsteel, rot=(0, 0, a), bevel=0.002)
    place(PARTS[i0:], (-0.16, -0.08, zt + 0.38), (1.2, 0, 0.3))


# имя: (сборка, бюджет треугольников — сетка прореживается до него перед развёрткой)
MODELS = {
    'prop_workbench': (build_workbench, 4500),
    'prop_gas_cylinders': (build_cylinders, 4000),
    'prop_crate_stack': (build_crates, 3500),
}


# ---------------------------------------------------------------- запекание и экспорт

def join_all(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
        o.select_set(False)
    # Тон доски — атрибут tint на всех вершинах детали
    for o in PARTS:
        me = o.data
        if 'tint' not in me.attributes:
            me.attributes.new('tint', 'FLOAT', 'POINT')
        a = me.attributes['tint']
        for i in range(len(a.data)):
            a.data[i].value = o['tint']
    for o in PARTS:
        o.select_set(True)
    bpy.context.view_layer.objects.active = PARTS[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def decimate(obj, budget):
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris <= budget:
        return tris
    d = obj.modifiers.new('dec', 'DECIMATE')
    d.ratio = budget / tris
    d.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=d.name)
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def bake(obj, name):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = False
    sc.world = sc.world or bpy.data.worlds.new('w')
    # UV: все детали в одну развёртку
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')

    def target(img_name):
        img = bpy.data.images.new(img_name, TEX, TEX, alpha=False, float_buffer=False)
        for m in obj.data.materials:
            n = m.node_tree.nodes.new('ShaderNodeTexImage')
            n.image = img
            m.node_tree.nodes.active = n
        return img

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    col = target(name + '_col')
    sc.cycles.samples = 16
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, margin=6, use_clear=True)
    # AO с полом: пол под моделью затеняет низ, как в жизни
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
    floor = bpy.context.active_object
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    ao = target(name + '_ao')
    sc.world.light_settings.distance = 0.35
    sc.cycles.samples = 96
    bpy.ops.object.bake(type='AO', margin=6, use_clear=True)
    bpy.data.objects.remove(floor)

    c = np.array(col.pixels[:], dtype=np.float32).reshape(TEX, TEX, 4)
    a = np.array(ao.pixels[:], dtype=np.float32).reshape(TEX, TEX, 4)[..., :1]
    out = c.copy()
    out[..., :3] = c[..., :3] * (0.22 + 0.78 * np.power(a, 1.4))
    out[..., 3] = 1
    final = bpy.data.images.new(name, TEX, TEX, alpha=False)
    final.pixels = out.ravel()
    final.filepath_raw = os.path.join(PREVIEW, '_' + name + '_tex.png')
    final.file_format = 'PNG'
    final.save()

    # Один материал с запечённой текстурой
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.85
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = final
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.material_index = 0
    return final


def render_preview(obj, name):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 24
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x, sc.render.resolution_y = 512, 512
    sc.render.film_transparent = True
    sc.world.use_nodes = True
    bg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (1, 1, 1, 1)
    bg.inputs['Strength'].default_value = 0.9
    for nm, energy, rot in (('key', 2.6, (math.radians(50), 0, math.radians(30))), ('fill', 1.0, (math.radians(55), 0, math.radians(-40)))):
        ld = bpy.data.lights.new(nm, 'SUN')
        ld.energy = energy
        lo = bpy.data.objects.new(nm, ld)
        lo.rotation_euler = rot
        sc.collection.objects.link(lo)
    lo_, hi_ = bounds(obj)
    size = max(hi_ - lo_)
    centre = (lo_ + hi_) / 2
    cam_d = bpy.data.cameras.new('cam')
    cam_d.type = 'ORTHO'
    cam_d.ortho_scale = size * 1.25
    cam = bpy.data.objects.new('cam', cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    shots = []
    for i, (yaw, pitch) in enumerate(((0, 28), (35, 28))):
        p, yv = math.radians(pitch), math.radians(yaw)
        d = 6
        cam.location = centre + Vector((d * math.cos(p) * math.sin(yv), -d * math.cos(p) * math.cos(yv), d * math.sin(p)))
        cam.rotation_euler = (math.pi / 2 - p, 0, yv)
        path = os.path.join(PREVIEW, f'_{name}_{i}.png')
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        shots.append(path)
    ims = []
    for p in shots:
        im = bpy.data.images.load(p)
        ims.append(np.array(im.pixels[:], dtype=np.float32).reshape(512, 512, 4))
        bpy.data.images.remove(im)
        os.remove(p)
    sheet = np.concatenate(ims, axis=1)
    bgc = np.array([0.22, 0.22, 0.24, 1.0], dtype=np.float32)
    a = sheet[..., 3:4]
    out = sheet * a + bgc * (1 - a)
    out[..., 3] = 1
    img = bpy.data.images.new('sheet', 1024, 512, alpha=True)
    img.pixels = out.ravel()
    img.filepath_raw = os.path.join(PREVIEW, name + '.png')
    img.file_format = 'PNG'
    img.save()


def bounds(obj):
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi


def process(name):
    global PARTS, _font
    _font = None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PARTS = []
    MODELS[name][0]()
    obj = join_all(name)
    decimate(obj, MODELS[name][1])
    # Середина по X и Y — в начале координат, низ — на полу
    lo, hi = bounds(obj)
    obj.data.transform(Matrix.Translation((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)))
    obj.data.update()
    bake(obj, name)
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_attributes=False,
                              export_image_format='WEBP', export_image_quality=78)
    lo, hi = bounds(obj)
    s = hi - lo
    print(f'[ok] {name}: {tris} tris, {os.path.getsize(out) // 1024} KB, {s.x:.2f} x {s.y:.2f} x {s.z:.2f} м')
    render_preview(obj, name)


def main():
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    os.makedirs(PREVIEW, exist_ok=True)
    for name in MODELS:
        if not only or name in only:
            process(name)


if __name__ == '__main__':
    main()
