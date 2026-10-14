"""
Промзона: модели, собранные вручную по концептам Gemini (blender_assets/promzona_concepts/<имя>.png),
-> assets/models/<имя>.glb. Генератор 3D не участвует.

Как устроено:
  1. Геометрия строится кодом по форме с картинки (BUILDERS): коробки корпусов, пилообразная крыша, оболочка
     градирни, опоры-распорки, цилиндры. Размеры — в метрах, длина и глубина берутся из PZ (как PZ_MODELS
     в src/environment.js), часть пропорций (SHAPES) подбирается.
  2. Камера концепта и подбираемые пропорции ищутся по силуэту: маска концепта (белый фон, связанный с
     краями, — фон) сравнивается с силуэтом модели, растеризованным той же камерой (IoU, покоординатный спуск).
  3. Текстура — сам концепт 1024 px, спроецированный на модель с найденной камеры (UV = проекция вершин).
     Фон — прозрачный (альфа по маске, режим MASK), цвета края растянуты в фон, чтобы не было белой каймы.
  4. Материал неосвещённый (KHR_materials_unlit): свет и тени уже нарисованы на концепте. Двусторонний.

Здания Промзоны игра рисует одним ракурсом спереди (dirIdx 0), поэтому чем ближе камера концепта к игровой,
тем точнее картинка. У круглых объектов поворот камеры не важен (YAW_FREE: поворот 0), у вытянутых концепт
должен быть фронтальным.

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/model_promzona_blender.py -- имя ...
"""
import json
import math
import os
import struct
import sys

import bmesh
import bpy
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CONCEPTS = os.path.join(ROOT, 'blender_assets', 'promzona_concepts')
OUT = os.path.join(ROOT, 'assets', 'models')
PREVIEW = os.path.join(OUT, 'preview')
IMG = 1024          # концепты квадратные 1024 px
FIT_RES = 200       # разрешение масок при подгонке
WHITE = 0.94        # фон: все каналы светлее этого
PURE_WHITE = 0.975  # замкнутые просветы фона внутри силуэта
FRINGE = 0.78       # светлая кайма по краю силуэта (смесь с белым фоном) — в фон
# Свои настройки фона: (порог белого, размыкание px — тонкие линии вроде ограждения на краю уходят в фон)
MASK_OPTS = {'building_cooling_tower': (0.86, 2)}
# Свои настройки замкнутых просветов: (порог белого, размыкание px). Просветы между прутьями ворот и перилами
# узкие (4–8 px) и не совсем белые — по умолчанию оставались белыми полосами
HOLE_OPTS = {'building_checkpoint': (0.93, 1), 'prop_pipe_rack': (0.94, 1)}
# Сквозные объекты (стойки, решётки, фермы) моделируются оболочкой: при подгонке силуэт сравнивается с маской,
# у которой просветы закрыты (замыкание, px при FIT_RES)
FIT_CLOSE = {'building_checkpoint': 10, 'building_pump_station': 4, 'prop_locomotive': 4, 'prop_gantry_crane': 4, 'prop_pipe_rack': 3}


# ---------------------------------------------------------------- геометрия

class Geo:
    """Набор полигонов в метрах: x — длина (вправо), y — глубина (+ назад, фасад в -Y), z — вверх."""

    def __init__(self):
        self.V, self.F = [], []
        # Части, где фон концепта не прозрачный, а закрашен: [(с, по, цвет)]
        self.fill = []
        # Части, нужные только для подгонки по силуэту и выкидываемые из модели: [(с, по)]
        self.cut = []
        # Ниже этой высоты текстура берётся с этой высоты (кромка над выкинутыми частями без их остатков)
        self.uv_zmin = None

    def add(self, verts, faces):
        b = len(self.V)
        self.V += [tuple(map(float, v)) for v in verts]
        self.F += [tuple(i + b for i in f) for f in faces]

    def box(self, x0, x1, y0, y1, z0, z1):
        self.add([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                  (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
                 [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])

    def extrude_xz(self, poly, y0, y1):
        """Профиль в плоскости x-z (против часовой), вытянутый по глубине от y0 до y1."""
        n = len(poly)
        self.add([(x, y0, z) for x, z in poly] + [(x, y1, z) for x, z in poly],
                 [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] +
                 [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)])

    def extrude_yz(self, poly, x0, x1):
        n = len(poly)
        self.add([(x0, y, z) for y, z in poly] + [(x1, y, z) for y, z in poly],
                 [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] +
                 [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)])

    def lathe(self, prof, seg=48, cx=0.0, cy=0.0, cap_bottom=False, cap_top=False, front_only=False):
        """Тело вращения: prof — [(r, z)] снизу вверх. front_only — только передняя половина (y < 0):
        то, что видно спереди, без задней стенки, которая сквозь просветы показала бы лишнее."""
        verts, faces = [], []
        n = seg + 1 if front_only else seg
        for r, z in prof:
            for k in range(n):
                a = (math.pi + math.pi * k / seg) if front_only else 2 * math.pi * k / seg
                verts.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
        for j in range(len(prof) - 1):
            for k in range(seg):
                a, b = j * n + k, j * n + (k + 1) % n
                faces.append((a, b, b + n, a + n))
        if cap_bottom:
            faces.append(tuple(range(seg))[::-1])
        if cap_top:
            top = (len(prof) - 1) * seg
            faces.append(tuple(range(top, top + seg)))
        self.add(verts, faces)

    def cylinder(self, p0, p1, r, seg=24, caps=True):
        """Цилиндр по оси p0 -> p1."""
        p0, p1 = np.array(p0, float), np.array(p1, float)
        ax = p1 - p0
        ax /= np.linalg.norm(ax)
        tmp = np.array([0, 0, 1.0]) if abs(ax[2]) < 0.9 else np.array([1.0, 0, 0])
        u = np.cross(ax, tmp)
        u /= np.linalg.norm(u)
        w = np.cross(ax, u)
        ring = [r * (math.cos(2 * math.pi * k / seg) * u + math.sin(2 * math.pi * k / seg) * w) for k in range(seg)]
        verts = [p0 + d for d in ring] + [p1 + d for d in ring]
        faces = [(k, (k + 1) % seg, seg + (k + 1) % seg, seg + k) for k in range(seg)]
        if caps:
            faces += [tuple(range(seg))[::-1], tuple(range(seg, 2 * seg))]
        self.add(verts, faces)

    def strut(self, p0, p1, w):
        """Брус квадратного сечения w от p0 до p1."""
        self.cylinder(p0, p1, w * 0.7071, seg=4)


def to_bmesh(geo):
    """Грани помнят свой номер в geo.F (слой gid): по нему выкидываются части geo.cut."""
    bm = bmesh.new()
    gid = bm.faces.layers.int.new('gid')
    vs = [bm.verts.new(v) for v in geo.V]
    for i, f in enumerate(geo.F):
        try:
            bm.faces.new([vs[k] for k in f])[gid] = i
        except ValueError:
            pass
    return bm


def triangles(geo):
    bm = to_bmesh(geo)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    V = np.array([v.co[:] for v in bm.verts])
    T = np.array([[v.index for v in f.verts] for f in bm.faces])
    bm.free()
    return V, T


# ---------------------------------------------------------------- объекты
# PZ — [длина, глубина, высота] в метрах (длина и глубина задают пятно, высота — начальная)

PZ = {
    'building_cooling_tower': [40, 40, 50],
    'building_oil_tank': [25, 25, 12],
    'building_gasholder': [35, 35, 25],
    'building_smokestack': [10, 10, 22],
    'prop_pipe_stack': [8, 7, 4],
    'prop_cable_reel': [2.2, 1.4, 2.2],
    'building_foundry': [70, 35, 28],
    'building_mech_workshop': [55, 25, 15],
    'building_warehouse': [50, 24, 15],
    'building_admin': [60, 23, 23],
    'building_checkpoint': [12, 4, 6],
    'building_pump_station': [18, 15, 8],
    'prop_locomotive': [17, 5, 7],
    'prop_gantry_crane': [25, 12, 14],
    'prop_pipe_rack': [12, 3.4, 6],
}
# Круглые: поворот камеры не важен, берётся 0
YAW_FREE = {'building_cooling_tower', 'building_oil_tank', 'building_gasholder'}
# Мелкие и квадратные в плане: модель поворачивается так, как стоит на концепте (на карте — наискось)
BAKE_YAW = {'building_smokestack', 'prop_pipe_stack', 'prop_cable_reel'}


def build_cooling_tower(p, detail=1.0):
    L, _, H = p['L'], p['D'], p['H']
    R = L / 2
    g = Geo()
    h_leg = p['leg'] * H
    r_bot = R * p['r_bot']
    r_t = R * p['r_throat']
    z_t = H * p['z_throat']
    r_top = R * p['r_top']
    # гипербола ниже и выше горловины: r = r_t * sqrt(1 + ((z - z_t) / b)^2)
    b_lo = (z_t - h_leg) / math.sqrt(max((r_bot / r_t) ** 2 - 1, 1e-4))
    b_hi = (H - z_t) / math.sqrt(max((r_top / r_t) ** 2 - 1, 1e-4))
    rings = max(10, int(26 * detail))
    prof = []
    for i in range(rings + 1):
        z = h_leg + (H - h_leg) * i / rings
        b = b_lo if z < z_t else b_hi
        prof.append((r_t * math.sqrt(1 + ((z - z_t) / b) ** 2), z))
    seg = max(24, int(64 * detail))
    g.lathe(prof, seg=seg)
    # бортик наверху
    g.lathe([(r_top, H - 0.6), (r_top + 0.5, H - 0.6), (r_top + 0.5, H), (r_top - 0.3, H)], seg=seg)
    # Опоры — конус от земли к нижнему краю оболочки, передняя половина: сами V-образные ноги и просветы
    # между ними даёт картинка (прозрачный фон). Брусья по числу ног с картинкой не совпадали и рассыпались
    # Опоры на концепте есть, в игре — нет: оболочка стоит прямо на земле. Конус опор нужен только
    # для подгонки камеры по силуэту, из модели он выкидывается, и модель опускается на землю
    r_g = r_bot * p['leg_spread']
    f0 = len(g.F)
    g.lathe([(r_g, 0.0), (r_bot, h_leg + 0.4)], seg=seg, front_only=True)
    g.cut.append((f0, len(g.F)))
    g.uv_zmin = h_leg + 0.04 * H   # верхушки ног по нижней кромке оболочки
    return g


def build_foundry(p, detail=1.0):
    """Литейный цех: шесть пролётов с двускатными кровлями вдоль глубины (пила на фасаде) и фонарями на коньках."""
    L, D, H = p['L'], p['D'], p['H']
    he = H * p['eave']
    n = 6
    bay = L / n
    g = Geo()
    poly = [(-L / 2, 0.0), (L / 2, 0.0), (L / 2, he)]
    for i in range(n - 1, -1, -1):
        x0 = -L / 2 + i * bay
        poly += [(x0 + bay / 2, H), (x0, he)]
    g.extrude_xz(poly, -D / 2, D / 2)
    # фонари на коньках: треугольные призмы вдоль глубины
    hs, ws = H * p['sky'], bay * 0.32
    for i in range(n):
        xc = -L / 2 + (i + 0.5) * bay
        g.extrude_xz([(xc - ws / 2, H - hs * 0.6), (xc + ws / 2, H - hs * 0.6), (xc, H + hs)],
                     -D / 2 + D * 0.12, D / 2 - D * 0.08)
    return g


def build_mech_workshop(p, detail=1.0):
    """Механический цех: корпус и вальмовая кровля (конёк вдоль длины)."""
    L, D, H = p['L'], p['D'], p['H']
    hw = H * p['wall']
    g = Geo()
    g.box(-L / 2, L / 2, -D / 2, D / 2, 0, hw)
    hip = D * 0.45
    g.add([(-L / 2, -D / 2, hw), (L / 2, -D / 2, hw), (L / 2, D / 2, hw), (-L / 2, D / 2, hw),
           (-L / 2 + hip, 0, H), (L / 2 - hip, 0, H)],
          [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4)])
    return g


def build_warehouse(p, detail=1.0):
    """Склад-ангар: стены, арочная кровля вдоль длины, погрузочная рампа со съездами перед воротами."""
    L, D, H = p['L'], p['D'], p['H']
    hw = H * p['wall']
    g = Geo()
    g.box(-L / 2, L / 2, -D / 2, D / 2, 0, hw)
    arc = [(D / 2 * math.cos(a), hw + (H - hw) * math.sin(a)) for a in np.linspace(0, math.pi, 17)]
    g.extrude_yz(arc, -L / 2, L / 2)
    hr, dr = H * 0.05, D * p['ramp']
    x0, x1, sl = -0.31 * L, 0.31 * L, 0.06 * L
    g.extrude_xz([(x0 - sl, 0), (x1 + sl, 0), (x1, hr), (x0, hr)], -D / 2 - dr, -D / 2)
    return g


def build_admin(p, detail=1.0):
    """Заводоуправление: четырёхэтажный корпус с плоской кровлей, крыльцо с козырьком и ступенями левее середины."""
    L, D, H = p['L'], p['D'], p['H']
    g = Geo()
    g.box(-L / 2, L / 2, -D / 2, D / 2, 0, H)
    xc, w = -0.055 * L, 0.27 * L
    dp = D * p['porch']
    g.box(xc - w / 2, xc + w / 2, -D / 2 - dp, -D / 2, 0, H * 0.27)          # козырёк над входом со стойками
    g.box(xc - w / 2, xc + w / 2, -D / 2 - dp * 1.6, -D / 2 - dp, 0, H * 0.04)  # ступени
    return g


def build_checkpoint(p, detail=1.0):
    """Проходная в ряд: кирпичная будка ВОХР, навес на стойках над турникетами, откатные ворота чуть глубже."""
    L, D, H = p['L'], p['D'], p['H']
    x = lambda f: -L / 2 + f * L
    g = Geo()
    g.box(x(0.0), x(0.33), -D / 2, D / 2, 0, H)                       # будка
    g.box(x(0.31), x(0.655), -D / 2, D / 2, 0, H)                     # навес: стойки и плита (просветы — с картинки)
    yg = -D / 2 + D * p['gate_y']
    g.box(x(0.627), x(1.0), yg, yg + 0.25, 0, H * p['gate_h'])        # ворота
    return g


def build_pump_station(p, detail=1.0):
    """Насосная: кирпичный корпус с плоской кровлей, перед фасадом — две трубы с задвижками на опорах."""
    L, D, H = p['L'], p['D'], p['H']
    x = lambda f: -L / 2 + f * L
    g = Geo()
    g.box(-L / 2, L / 2, -D / 2, D / 2, 0, H)
    dp = D * p['pipes']
    g.box(x(0.38), x(0.92), -D / 2 - dp, -D / 2, 0, H * p['pipes_h'])   # трубы, задвижки и опоры
    return g


def build_locomotive(p, detail=1.0):
    """Тепловоз ТЭМ2 боком: тележки, рама с площадками, капот, кабина справа."""
    L, D, H = p['L'], p['D'], p['H']
    x = lambda f: -L / 2 + f * L
    hd = H * p['deck']
    g = Geo()
    g.box(x(0.08), x(0.92), -D * 0.4, D * 0.4, 0, hd - H * 0.1)        # тележки и бак
    g.box(x(0.02), x(0.98), -D / 2, D / 2, hd - H * 0.1, hd)           # рама и площадки
    g.box(x(0.075), x(0.745), -D * 0.38, D * 0.38, hd, H * p['hood'])  # капот
    g.box(x(0.72), x(0.93), -D * 0.47, D * 0.47, hd, H)                # кабина
    return g


def tapered(g, x0, x1, y0, y1, xb0, xb1, yb0, yb1, z0, z1):
    """Брус, сечение которого меняется от низа (xb, yb) к верху (x, y)."""
    g.add([(xb0, yb0, z0), (xb1, yb0, z0), (xb1, yb1, z0), (xb0, yb1, z0),
           (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
          [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])


def build_gantry_crane(p, detail=1.0):
    """Козловой кран спереди: решётчатая ферма поверху, две ноги-башни (А-рама разведена по глубине), кабина и крюк."""
    L, D, H = p['L'], p['D'], p['H']
    x = lambda f: -L / 2 + f * L
    hg = H * p['girder']
    dg = D * 0.3
    g = Geo()
    g.box(x(0.0), x(1.0), -dg / 2, dg / 2, H - hg, H)                     # ферма
    for c in (0.205, 0.795):                                             # ноги: сверху шире по x, внизу разведены по y
        tapered(g, x(c - 0.045), x(c + 0.045), -dg / 2, dg / 2,
                x(c - 0.02), x(c + 0.02), -D / 2, D / 2, 0, H - hg)
    g.box(x(0.245), x(0.33), -dg / 2, dg / 2, H - hg - H * 0.18, H - hg)  # кабина
    g.box(x(0.475), x(0.525), -0.3, 0.3, H * 0.4, H - hg)               # трос и крюк
    return g


def build_pipe_rack(p, detail=1.0):
    """Эстакада спереди: пять опор в ряд, поверху пучок труб и площадка с ограждением."""
    L, D, H = p['L'], p['D'], p['H']
    x = lambda f: -L / 2 + f * L
    hp = H * p['pipes']
    g = Geo()
    g.box(x(0.0), x(1.0), -D / 2, D / 2, hp, H * 0.88)                     # трубы
    g.box(x(0.03), x(0.97), -D / 2, D / 2, H * 0.88, H)                    # площадка и ограждение
    for c in (0.105, 0.309, 0.508, 0.702, 0.895):
        g.box(x(c - 0.022), x(c + 0.022), -D * 0.4, D * 0.4, 0, hp)        # опоры
    return g


def build_oil_tank(p, detail=1.0):
    R, H = p['L'] / 2 * p['r'], p['H']
    seg = max(24, int(64 * detail))
    g = Geo()
    hw = H * p['wall']
    g.lathe([(R * 1.06, 0.0), (R * 1.06, 0.5), (R, 0.5)], seg=seg)                     # фундаментное кольцо
    g.lathe([(R, 0.5), (R, hw), (R * 0.12, H), (0.01, H)], seg=seg, cap_bottom=False)  # стенка и кровля
    g.lathe([(R * 1.005, hw), (R * 1.005, hw + 1.1)], seg=seg)                         # ограждение по краю
    g.lathe([(R * 1.06, 0.5), (R * 1.06, hw)], seg=seg, front_only=True)               # лестница по стенке
    return g


def build_gasholder(p, detail=1.0):
    Rf, H = p['L'] / 2, p['H']
    Rt = Rf * p['tank']
    seg = max(24, int(64 * detail))
    g = Geo()
    ht = H * p['tank_h']
    g.lathe([(Rf * 1.03, 0.0), (Rf * 1.03, 0.6), (Rt, 0.6)], seg=seg)                  # бетонное основание
    dome = [(Rt * math.cos(a), ht + Rt * p['dome'] * math.sin(a)) for a in np.linspace(0, math.pi / 2, 7)]
    g.lathe([(Rt, 0.6)] + dome, seg=seg)                                               # колокол и купол
    g.lathe([(Rf, 0.6), (Rf, H)], seg=seg)                                             # направляющий каркас
    return g


def build_smokestack(p, detail=1.0):
    P, H = p['L'] * p['plinth'], p['H']
    hp = H * p['plinth_h']
    rb, rt = p['L'] / 2 * p['r_bot'], p['L'] / 2 * p['r_top']
    seg = max(16, int(40 * detail))
    g = Geo()
    g.box(-P / 2, P / 2, -P / 2, P / 2, 0, hp)
    g.lathe([(rb, hp), (rt, H - 0.5), (rt * 1.1, H - 0.5), (rt * 1.1, H), (rt * 0.85, H)], seg=seg)
    return g


def build_pipe_stack(p, detail=1.0):
    L, d = p['L'], p['d']
    r = d / 2
    seg = max(12, int(24 * detail))
    g = Geo()
    hs = d * 0.35   # шпалы
    for k in range(4):
        x = -L / 2 + L * (0.1 + 0.8 * k / 3)
        g.box(x - 0.15, x + 0.15, -2.6 * d - 0.3, 2.6 * d + 0.3, 0, hs)
    for row, cnt in enumerate((5, 4, 3)):
        z = hs + r + row * d * 0.866
        for i in range(cnt):
            y = (i - (cnt - 1) / 2) * d
            g.cylinder((-L / 2, y, z), (L / 2, y, z), r * 0.98, seg=max(10, seg * 2 // 3))
    return g


def build_cable_reel(p, detail=1.0):
    Rf, W = p['L'] / 2, p['D'] * p['w']
    Rd = Rf * p['drum']
    t = W * 0.12
    seg = max(16, int(40 * detail))
    g = Geo()
    for y0 in (-W / 2, W / 2 - t):
        g.cylinder((0, y0, Rf), (0, y0 + t, Rf), Rf, seg=seg)
    g.cylinder((0, -W / 2 + t, Rf), (0, W / 2 - t, Rf), Rd, seg=seg, caps=False)
    return g


BUILDERS = {'building_cooling_tower': build_cooling_tower, 'building_oil_tank': build_oil_tank,
            'building_gasholder': build_gasholder, 'building_smokestack': build_smokestack,
            'prop_pipe_stack': build_pipe_stack, 'prop_cable_reel': build_cable_reel,
            'building_foundry': build_foundry, 'building_mech_workshop': build_mech_workshop,
            'building_warehouse': build_warehouse, 'building_admin': build_admin,
            'building_checkpoint': build_checkpoint, 'building_pump_station': build_pump_station,
            'prop_locomotive': build_locomotive, 'prop_gantry_crane': build_gantry_crane,
            'prop_pipe_rack': build_pipe_rack}

# Подбираемые пропорции: имя -> (начало, мин, макс, шаг)
SHAPES = {
    'building_cooling_tower': {'H': (50, 35, 65, 3), 'leg': (0.09, 0.04, 0.16, 0.01),
                               'r_bot': (0.96, 0.85, 1.0, 0.02), 'r_throat': (0.62, 0.45, 0.8, 0.03),
                               'z_throat': (0.72, 0.55, 0.9, 0.03), 'r_top': (0.7, 0.5, 0.9, 0.03),
                               'leg_spread': (1.04, 1.0, 1.15, 0.02)},
    'building_oil_tank': {'H': (12, 8, 18, 1), 'r': (1.0, 0.9, 1.05, 0.02), 'wall': (0.85, 0.7, 0.95, 0.03)},
    'building_gasholder': {'H': (25, 18, 34, 1.5), 'tank': (0.85, 0.7, 0.95, 0.03), 'tank_h': (0.8, 0.6, 0.95, 0.03),
                           'dome': (0.12, 0.04, 0.25, 0.02)},
    'building_smokestack': {'H': (22, 16, 30, 1.5), 'plinth': (0.9, 0.6, 1.0, 0.04), 'plinth_h': (0.12, 0.06, 0.2, 0.01),
                            'r_bot': (0.5, 0.3, 0.6, 0.03), 'r_top': (0.4, 0.25, 0.55, 0.03)},
    'prop_pipe_stack': {'d': (0.9, 0.6, 1.4, 0.05)},
    'prop_cable_reel': {'w': (0.9, 0.6, 1.2, 0.04), 'drum': (0.75, 0.55, 0.9, 0.03)},
    'building_foundry': {'H': (24, 14, 34, 1.5), 'eave': (0.6, 0.4, 0.8, 0.03), 'sky': (0.08, 0.0, 0.2, 0.02)},
    'building_mech_workshop': {'H': (15, 9, 22, 1), 'wall': (0.72, 0.5, 0.9, 0.03)},
    'building_warehouse': {'H': (15, 9, 22, 1), 'wall': (0.6, 0.4, 0.8, 0.03), 'ramp': (0.15, 0.05, 0.3, 0.02)},
    'building_admin': {'H': (23, 15, 30, 1), 'porch': (0.15, 0.06, 0.3, 0.02)},
    'building_checkpoint': {'H': (4.5, 3, 7, 0.3), 'D': (3.0, 1.5, 5.0, 0.3), 'gate_h': (0.62, 0.4, 0.9, 0.03),
                            'gate_y': (0.2, 0.0, 0.6, 0.04)},
    'building_pump_station': {'H': (6, 4, 9, 0.4), 'D': (10, 6, 16, 0.6), 'pipes': (0.15, 0.05, 0.3, 0.02),
                              'pipes_h': (0.4, 0.25, 0.6, 0.03)},
    'prop_locomotive': {'H': (5, 3.5, 7, 0.3), 'D': (3.2, 2.2, 4.5, 0.2), 'deck': (0.33, 0.2, 0.45, 0.02),
                        'hood': (0.85, 0.7, 0.98, 0.02)},
    'prop_gantry_crane': {'H': (14, 9, 20, 0.8), 'girder': (0.2, 0.12, 0.3, 0.02)},
    'prop_pipe_rack': {'H': (6, 4, 9, 0.3), 'D': (2.0, 1.0, 4.0, 0.2), 'pipes': (0.68, 0.5, 0.85, 0.02)},
}


# ---------------------------------------------------------------- концепт и маска

def concept_path(name):
    """Фронтальный концепт (<имя>_front.png, камера прямо перед длинным фасадом), если он есть."""
    front = os.path.join(CONCEPTS, name + '_front.png')
    return front if os.path.exists(front) else os.path.join(CONCEPTS, name + '.png')


def load_concept(name):
    img = bpy.data.images.load(concept_path(name))
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1, :, :3].copy()   # строки сверху вниз


def flood_background(white):
    """Фон — белое, связанное с краями картинки."""
    m = np.zeros_like(white)
    m[0, :], m[-1, :], m[:, 0], m[:, -1] = white[0, :], white[-1, :], white[:, 0], white[:, -1]
    for it in range(4000):
        d = m.copy()
        d[1:] |= m[:-1]
        d[:-1] |= m[1:]
        d[:, 1:] |= m[:, :-1]
        d[:, :-1] |= m[:, 1:]
        d &= white
        if it % 16 == 0 and np.array_equal(d, m):
            break
        m = d
    return m


def object_mask(rgb, name=''):
    thr, opening = MASK_OPTS.get(name, (WHITE, 0))
    white = rgb.min(axis=2) >= thr
    if opening:
        # тонкое (тоньше 2·opening px) — проходимо для фона: ограждение не отгораживает белый просвет за ним
        obj = ~white
        white |= obj & ~dilate(erode(obj, opening), opening)
    # грубо на 256, затем довести на полном разрешении
    k = rgb.shape[0] // 256
    small = white.reshape(256, k, 256, k).all(axis=(1, 3))
    bg_small = flood_background(small)
    seed = np.repeat(np.repeat(bg_small, k, 0), k, 1) & white
    m = seed
    for it in range(4000):
        d = m.copy()
        d[1:] |= m[:-1]
        d[:-1] |= m[1:]
        d[:, 1:] |= m[:, :-1]
        d[:, :-1] |= m[:, 1:]
        d &= white
        if it % 8 == 0 and np.array_equal(d, m):
            break
        m = d
    # Замкнутые просветы (между опорами, в фермах) с краем не связаны — берём чисто белое, без тонких
    # бликов на самом объекте: размыкание на 2 px
    hole_thr, hole_r = HOLE_OPTS.get(name, (PURE_WHITE, 2))
    pure = rgb.min(axis=2) >= hole_thr
    m |= dilate(erode(pure, hole_r), hole_r)
    # светлая кайма: пиксели края, смешанные с белым фоном
    light = rgb.min(axis=2) >= FRINGE
    for _ in range(2):
        m |= light & dilate(m, 1)
    return ~m


def erode(m, r):
    out = m.copy()
    for _ in range(r):
        o = out.copy()
        o[1:] &= out[:-1]
        o[:-1] &= out[1:]
        o[:, 1:] &= out[:, :-1]
        o[:, :-1] &= out[:, 1:]
        out = o
    return out


def dilate(m, r):
    out = m.copy()
    for _ in range(r):
        o = out.copy()
        o[1:] |= out[:-1]
        o[:-1] |= out[1:]
        o[:, 1:] |= out[:, :-1]
        o[:, :-1] |= out[:, 1:]
        out = o
    return out


def save_mask_preview(name, rgb, mask):
    """Концепт с фоном, закрашенным пурпурным: видно, что попало в фон."""
    os.makedirs(PREVIEW, exist_ok=True)
    vis = rgb.copy()
    vis[~mask] = (0.8, 0.1, 0.8)
    img = bpy.data.images.new(name + '_mask', IMG, IMG)
    img.pixels.foreach_set(np.concatenate([vis, np.ones(mask.shape + (1,), np.float32)], 2)[::-1].ravel().astype(np.float32))
    img.filepath_raw = os.path.join(PREVIEW, name + '_mask.png')
    img.file_format = 'PNG'
    img.save()


def downsample(mask, res):
    k = mask.shape[0] / res
    ys = (np.arange(res) * k + k / 2).astype(int)
    return mask[np.ix_(ys, ys)]


# ---------------------------------------------------------------- камера и растеризация

def project(P, cam, center, lref):
    """cam = (yaw, pitch, s, cx, cy, persp): пиксели концепта (v вниз)."""
    yaw, pitch, s, cx, cy, persp = cam
    d = P - center
    c, sn = math.cos(yaw), math.sin(yaw)
    x = d[:, 0] * c - d[:, 1] * sn
    y = d[:, 0] * sn + d[:, 1] * c
    z = d[:, 2]
    cp, sp = math.cos(pitch), math.sin(pitch)
    up = y * sp + z * cp
    depth = y * cp - z * sp
    k = 1.0 / (1.0 + persp * depth / lref)
    return np.stack([cx + s * x * k, cy - s * up * k], axis=1)


def rasterize(uv, T, res):
    m = np.zeros((res, res), bool)
    q = uv * (res / IMG)
    for a, b, c in q[T]:
        x0 = max(int(math.floor(min(a[0], b[0], c[0]))), 0)
        x1 = min(int(math.ceil(max(a[0], b[0], c[0]))), res)
        y0 = max(int(math.floor(min(a[1], b[1], c[1]))), 0)
        y1 = min(int(math.ceil(max(a[1], b[1], c[1]))), res)
        if x0 >= x1 or y0 >= y1:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
        e0 = (b[0] - a[0]) * (ys - a[1]) - (b[1] - a[1]) * (xs - a[0])
        e1 = (c[0] - b[0]) * (ys - b[1]) - (c[1] - b[1]) * (xs - b[0])
        e2 = (a[0] - c[0]) * (ys - c[1]) - (a[1] - c[1]) * (xs - c[0])
        inside = ((e0 >= 0) & (e1 >= 0) & (e2 >= 0)) | ((e0 <= 0) & (e1 <= 0) & (e2 <= 0))
        m[y0:y1, x0:x1] |= inside
    return m


def geo_center(V):
    lo, hi = V.min(0), V.max(0)
    return (lo + hi) / 2, float(max(hi - lo))


def fit(name, target, log):
    spec = SHAPES.get(name, {})
    L, D, H = PZ[name]
    base = {'L': L, 'D': D, 'H': H}
    shape_keys = list(spec)
    yaw_free = name in YAW_FREE

    def params_of(vec):
        p = dict(base)
        for i, key in enumerate(shape_keys):
            lo, hi = spec[key][1], spec[key][2]
            p[key] = min(hi, max(lo, vec[6 + i]))
        return p

    def score(vec):
        p = params_of(vec)
        V, T = triangles(BUILDERS[name](p, detail=0.4))
        c, lref = geo_center(V)
        m = rasterize(project(V, vec[:6], c, lref), T, FIT_RES)
        inter = np.logical_and(m, target).sum()
        return inter / max(1, np.logical_or(m, target).sum())

    ys, xs = np.nonzero(target)
    tb = np.array([xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]) * (IMG / FIT_RES)
    best_vec, best = None, -1
    frontal = concept_path(name).endswith('_front.png')
    yaws = [0.0] if (yaw_free or frontal) else [0.0] + [math.radians(a) for a in (20, -20, 40, -40)]
    for yaw0 in yaws:
        vec = [yaw0, math.radians(30), 1.0, 0.0, 0.0, 0.12] + [spec[k][0] for k in shape_keys]
        p = params_of(vec)
        V, _ = triangles(BUILDERS[name](p, detail=0.4))
        c, lref = geo_center(V)
        uv = project(V, vec[:6], c, lref)
        pw = uv[:, 0].max() - uv[:, 0].min()
        vec[2] = (tb[2] - tb[0]) / pw
        uv = project(V, vec[:6], c, lref)
        vec[3] = (tb[0] + tb[2]) / 2 - (uv[:, 0].min() + uv[:, 0].max()) / 2
        vec[4] = (tb[1] + tb[3]) / 2 - (uv[:, 1].min() + uv[:, 1].max()) / 2
        s = score(vec)
        if s > best:
            best, best_vec = s, vec
    vec = list(best_vec)
    steps = [math.radians(4), math.radians(3), 0.03, 8.0, 8.0, 0.05] + [spec[k][3] for k in shape_keys]
    frozen = {0} if yaw_free else set()
    evals = 0
    while evals < 900:
        improved = False
        for i in range(len(vec)):
            if i in frozen:
                continue
            for sign in (1, -1):
                trial = list(vec)
                trial[i] = vec[i] * (1 + sign * steps[i]) if i == 2 else vec[i] + sign * steps[i]
                if i == 5:
                    trial[i] = min(0.6, max(0.0, trial[i]))
                if i == 1:
                    # концепты сняты сверху под 25–35°: иначе подгонка меняет наклон на пропорции модели
                    lo, hi = (20, 38) if frontal else (12, 45)
                    trial[i] = min(math.radians(hi), max(math.radians(lo), trial[i]))
                s = score(trial)
                evals += 1
                if s > best + 1e-5:
                    best, vec, improved = s, trial, True
                    break
        if not improved:
            steps = [st / 2 for st in steps]
            if max(steps[3], steps[4]) < 0.5:
                break
    log(f'  подгонка: IoU {best:.3f} за {evals} шагов; камера yaw {math.degrees(vec[0]):.1f}°, '
        f'pitch {math.degrees(vec[1]):.1f}°, persp {vec[5]:.2f}; ' +
        ', '.join(f'{k} {params_of(vec)[k]:.3f}' for k in shape_keys))
    return vec[:6], params_of(vec), best


# ---------------------------------------------------------------- текстура, UV, экспорт

def bleed(rgb, mask, n=8):
    """Цвета объекта растягиваются в фон на n px — при фильтрации на краю не будет белой каймы."""
    rgb = rgb.copy()
    have = mask.copy()
    for _ in range(n):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(mask.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(have, (dy, dx), (0, 1))
            acc += np.roll(rgb, (dy, dx), (0, 1)) * sh[..., None]
            cnt += sh
        new = (~have) & (cnt > 0)
        rgb[new] = acc[new] / cnt[new][:, None]
        have |= new
    return rgb


def make_texture(name, rgb, mask):
    rgba = np.concatenate([bleed(rgb, mask), mask[..., None].astype(np.float32)], axis=2)
    img = bpy.data.images.new(name + '_tex', IMG, IMG, alpha=True)
    img.pixels.foreach_set(rgba[::-1].ravel().astype(np.float32))
    img.filepath_raw = os.path.join(bpy.app.tempdir, name + '_tex.png')
    img.file_format = 'PNG'
    img.save()
    img.pack()
    return img


def subdivide_long(bm, maxlen, rounds=6):
    for _ in range(rounds):
        edges = [e for e in bm.edges if e.calc_length() > maxlen]
        if not edges:
            break
        bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True)


def build_object(name, cam, p, rgb, mask):
    geo = BUILDERS[name](p, detail=1.0)
    if name in BAKE_YAW:
        # модель стоит так, как на концепте: поворот камеры переносится в саму модель
        c, sn = math.cos(cam[0]), math.sin(cam[0])
        geo.V = [(x * c - y * sn, x * sn + y * c, z) for x, y, z in geo.V]
        cam = (0.0,) + tuple(cam[1:])
    bm = to_bmesh(geo)
    V0 = np.array([v.co[:] for v in bm.verts])
    c, lref = geo_center(V0)
    if geo.fill:
        rgb, mask = rgb.copy(), mask.copy()
        for f0, f1, color in geo.fill:
            part = Geo()
            part.V = geo.V
            part.F = geo.F[f0:f1]
            Vp, Tp = triangles(part)
            region = rasterize(project(Vp, cam, c, lref), Tp, IMG) & ~mask
            rgb[region] = color
            mask |= region
    if geo.cut:
        gid = bm.faces.layers.int['gid']
        drop = [f for f in bm.faces if any(f0 <= f[gid] < f1 for f0, f1 in geo.cut)]
        bmesh.ops.delete(bm, geom=drop, context='FACES_ONLY')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    subdivide_long(bm, max(lref / 14, 2.0))   # дробим для проекции с перспективой; мелочь — не мельче 2 м
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    uv_layer = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        P = np.array([l.vert.co[:] for l in f.loops])
        if geo.uv_zmin is not None:
            P[:, 2] = np.maximum(P[:, 2], geo.uv_zmin)
        uv = project(P, cam, c, lref)
        for l, (u, v) in zip(f.loops, uv):
            l[uv_layer].uv = (u / IMG, 1.0 - v / IMG)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    tris = len(bm.faces)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    # центр по XY, низ на 0
    lo = np.array([v.co[:] for v in me.vertices]).min(0)
    hi = np.array([v.co[:] for v in me.vertices]).max(0)
    off = (-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])
    for v in me.vertices:
        v.co.x += off[0]
        v.co.y += off[1]
        v.co.z += off[2]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.blend_method = 'CLIP'
    mat.alpha_threshold = 0.5
    mat.use_backface_culling = False
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = make_texture(name, rgb, mask)
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    mat.node_tree.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    bsdf.inputs['Roughness'].default_value = 1.0
    bsdf.inputs['Metallic'].default_value = 0.0
    me.materials.append(mat)
    return obj, tris, hi - lo


def make_unlit(path):
    """KHR_materials_unlit: свет уже нарисован на концепте. Плюс прозрачный фон (MASK) и обе стороны."""
    data = open(path, 'rb').read()
    ln = struct.unpack('<I', data[12:16])[0]
    j = json.loads(data[20:20 + ln])
    rest = data[20 + ln:]
    for m in j.get('materials', []):
        m.setdefault('extensions', {})['KHR_materials_unlit'] = {}
        # Blender 4.2 не пишет MASK сам: фон концепта прозрачный, отсечение по 0,5
        m['alphaMode'] = 'MASK'
        m['alphaCutoff'] = 0.5
        m['doubleSided'] = True
    used = j.setdefault('extensionsUsed', [])
    if 'KHR_materials_unlit' not in used:
        used.append('KHR_materials_unlit')
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + len(rest)
    out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + rest
    open(path, 'wb').write(out)


def process(name, log):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rgb = load_concept(name)
    mask = object_mask(rgb, name)
    save_mask_preview(name, rgb, mask)
    target = downsample(mask, FIT_RES)
    if FIT_CLOSE.get(name):
        target = erode(dilate(target, FIT_CLOSE[name]), FIT_CLOSE[name])
    cam, p, iou = fit(name, target, log)
    obj, tris, size = build_object(name, cam, p, rgb, mask)
    out = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True,
                              export_image_format='WEBP', export_image_quality=90)
    make_unlit(out)
    log(f'[ok] {name}: {tris} tris, {os.path.getsize(out) // 1024} KB, '
        f'{size[0]:.1f} x {size[1]:.1f} x {size[2]:.1f} m (IoU {iou:.3f})')


def main():
    names = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(BUILDERS)
    for name in names:
        process(name, lambda s: print(s, flush=True))


if __name__ == '__main__':
    main()
