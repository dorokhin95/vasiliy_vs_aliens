"""
Модель плоского предмета из концепта сбоку, когда Rodin недоступен (кончились кредиты): силуэт концепта
(blender_assets/promzona_concepts/<имя>.png, белый фон) -> объёмная «подушка» с текстурой того же концепта
-> сырой GLB в blender_assets/promzona_models/<имя>.glb, дальше — как у Rodin (tools/finalize_weapons_blender.py).

  - маска — не белые пиксели; белые просветы внутри (спусковая скоба) — дыры, мелкие (блики) — заливаются;
  - сетка ячеек по силуэту, толщина в каждой точке — от расстояния до края силуэта (√d): ствол тонкий и круглый,
    барабан и рукоять — толще; край — тонкая кромка;
  - лицо и изнанка — проекция концепта сбоку (изнанка — зеркально), кромка — цвет края;
  - концепт нарисован стволом вправо: это +X Blender, верх — +Z, толщина — по Y (как у Rodin).

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/extrude_concept_blender.py -- имя [длина_м]
"""
import os
import sys
from collections import deque

import bmesh
import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONCEPTS = os.path.join(ROOT, 'blender_assets', 'promzona_concepts')
RAW = os.path.join(ROOT, 'blender_assets', 'promzona_models')

CELLS = 240          # ячеек по длинной стороне силуэта
WHITE_DIST = 30      # насколько пиксель может отличаться от белого и всё ещё считаться фоном
HOLE_MIN = 40        # белый просвет внутри больше (ячеек) — дыра, меньше — блик, заливается
EDGE = 0.8           # толщина кромки (полутолщина, ячеек)
BULGE = 2.6          # полутолщина = EDGE + BULGE·√d, d — ячеек до края
TEX = 1024           # сторона текстуры (finalize ужмёт до 512)


def load_rgba(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]   # сверху вниз
    bpy.data.images.remove(img)
    return px


def components(mask):
    """Связные области (4 соседа): список массивов индексов."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        seen[y0, x0] = True
        q, pts = deque([(y0, x0)]), []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        out.append(pts)
    return out


def distance(mask):
    """Расстояние от ячейки до ближайшей пустой (чамфер 3-4, в ячейках)."""
    h, w = mask.shape
    big = 10 ** 6
    d = np.where(mask, big, 0).astype(np.int64)
    for y in range(h):
        for x in range(w):
            if not d[y, x]:
                continue
            best = d[y, x]
            for dy, dx, c in ((-1, -1, 4), (-1, 0, 3), (-1, 1, 4), (0, -1, 3)):
                ny, nx = y + dy, x + dx
                v = d[ny, nx] if 0 <= ny < h and 0 <= nx < w else 0
                best = min(best, v + c)
            d[y, x] = best
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            if not d[y, x]:
                continue
            best = d[y, x]
            for dy, dx, c in ((1, 1, 4), (1, 0, 3), (1, -1, 4), (0, 1, 3)):
                ny, nx = y + dy, x + dx
                v = d[ny, nx] if 0 <= ny < h and 0 <= nx < w else 0
                best = min(best, v + c)
            d[y, x] = best
    return d / 3.0


def bleed(rgb, solid, passes=12):
    """Цвет предмета растекается на фон у края: на кромке и при ужатии текстуры нет белой каймы."""
    rgb, solid = rgb.copy(), solid.copy()
    for _ in range(passes):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(solid.shape, dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            s = np.roll(np.roll(solid, dy, 0), dx, 1)
            c = np.roll(np.roll(rgb, dy, 0), dx, 1)
            acc += c * s[..., None]
            cnt += s
        grow = (~solid) & (cnt > 0)
        rgb[grow] = acc[grow] / cnt[grow][:, None]
        solid = solid | grow
    return rgb


def build(name, length):
    px = load_rgba(os.path.join(CONCEPTS, name + '.png'))
    H, W = px.shape[:2]
    rgb = px[..., :3]
    obj_px = (1.0 - rgb).max(axis=2) * 255 > WHITE_DIST
    ys, xs = np.nonzero(obj_px)
    pad = 6
    x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
    cw, ch = x1 - x0, y1 - y0
    cell = max(cw, ch) / CELLS
    gw, gh = int(np.ceil(cw / cell)), int(np.ceil(ch / cell))

    # Маска ячеек: доля предмета в ячейке больше половины
    mask = np.zeros((gh, gw), dtype=bool)
    sub = obj_px[y0:y1, x0:x1]
    for gy in range(gh):
        for gx in range(gw):
            a = sub[int(gy * cell):int((gy + 1) * cell) + 1, int(gx * cell):int((gx + 1) * cell) + 1]
            mask[gy, gx] = a.size > 0 and a.mean() > 0.5
    # Предмет — крупнейший кусок (и всё крупное рядом), пыль — прочь
    comps = sorted(components(mask), key=len, reverse=True)
    mask[:] = False
    for pts in comps:
        if len(pts) >= max(30, len(comps[0]) * 0.01):
            for y, x in pts:
                mask[y, x] = True
    # Белые просветы: мелкие (блики) заливаются, крупные (скоба) — дыры
    holes = components(~mask)
    for pts in holes:
        touches = any(y in (0, gh - 1) or x in (0, gw - 1) for y, x in pts)
        if not touches and len(pts) < HOLE_MIN:
            for y, x in pts:
                mask[y, x] = True

    dist = distance(mask)
    half = np.where(mask, EDGE + BULGE * np.sqrt(np.maximum(dist - 0.5, 0)), 0)

    # Текстура: кадр силуэта с растёкшимся по фону цветом
    tex_rgb = bleed(rgb[y0:y1, x0:x1], obj_px[y0:y1, x0:x1])
    th, tw = tex_rgb.shape[:2]
    img = bpy.data.images.new(name + '_tex', tw, th, alpha=False)
    rgba = np.concatenate([tex_rgb, np.ones((th, tw, 1), dtype=np.float32)], axis=2)[::-1]
    img.pixels = rgba.ravel()
    k = TEX / max(tw, th)
    img.scale(max(1, round(tw * k)), max(1, round(th * k)))
    img.filepath_raw = os.path.join(RAW, name + '_tex.png')
    img.file_format = 'PNG'
    img.save()

    # Сетка: углы ячеек; полутолщина угла — наименьшая из соседних ячеек, на краю — кромка
    def corner_half(cx, cy):
        hs = [half[y, x] for y in (cy - 1, cy) for x in (cx - 1, cx) if 0 <= y < gh and 0 <= x < gw]
        inside = [half[y, x] for y in (cy - 1, cy) for x in (cx - 1, cx)
                  if 0 <= y < gh and 0 <= x < gw and mask[y, x]]
        return EDGE if len(inside) < 4 else min(hs)

    s = length / (gw * cell)            # метров на пиксель концепта (по длинной стороне сетки — длина)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    front, back = {}, {}

    def vert(cx, cy, side):
        store = front if side < 0 else back
        if (cx, cy) not in store:
            hh = corner_half(cx, cy) * cell * s
            store[(cx, cy)] = bm.verts.new((cx * cell * s, side * hh, -cy * cell * s))
        return store[(cx, cy)]

    def uv_of(cx, cy):
        return (cx * cell / cw, 1.0 - cy * cell / ch)

    def face(corners, side):
        vs = [vert(cx, cy, side) for cx, cy in corners]
        f = bm.faces.new(vs)
        for loop, (cx, cy) in zip(f.loops, corners):
            loop[uv].uv = uv_of(cx, cy)
        return f

    for gy in range(gh):
        for gx in range(gw):
            if not mask[gy, gx]:
                continue
            q = [(gx, gy), (gx + 1, gy), (gx + 1, gy + 1), (gx, gy + 1)]
            face(q, -1)
            face(q[::-1], 1)
            # Кромка там, где сосед пустой
            for (ax, ay), (bx, by), (nx, ny) in (((gx, gy), (gx + 1, gy), (gx, gy - 1)),
                                                  ((gx + 1, gy), (gx + 1, gy + 1), (gx + 1, gy)),
                                                  ((gx + 1, gy + 1), (gx, gy + 1), (gx, gy + 1)),
                                                  ((gx, gy + 1), (gx, gy), (gx - 1, gy))):
                if 0 <= nx < gw and 0 <= ny < gh and mask[ny, nx]:
                    continue
                vs = [vert(ax, ay, -1), vert(bx, by, -1), vert(bx, by, 1), vert(ax, ay, 1)]
                f = bm.faces.new(vs)
                for loop, (cx, cy) in zip(f.loops, ((ax, ay), (bx, by), (bx, by), (ax, ay))):
                    loop[uv].uv = uv_of(cx, cy)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    # Середина габарита — в начале координат
    lo = np.array([min(v.co[i] for v in mesh.vertices) for i in range(3)])
    hi = np.array([max(v.co[i] for v in mesh.vertices) for i in range(3)])
    c = (lo + hi) / 2
    for v in mesh.vertices:
        v.co.x -= c[0]
        v.co.y -= c[1]
        v.co.z -= c[2]
    for p in mesh.polygons:
        p.use_smooth = True

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    texn = nodes.new('ShaderNodeTexImage')
    texn.image = img
    mat.node_tree.links.new(texn.outputs['Color'], bsdf.inputs['Base Color'])
    mesh.materials.append(mat)

    os.makedirs(RAW, exist_ok=True)
    out = os.path.join(RAW, name + '.glb')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True)
    size = hi - lo
    print(f'[ok] {name}: сетка {gw}x{gh}, {len(mesh.polygons)} граней, {size[0]:.3f} x {size[1]:.3f} x {size[2]:.3f} м -> {out}')


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if not args:
        print('нужно имя концепта')
        return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build(args[0], float(args[1]) if len(args) > 1 else 1.0)


if __name__ == '__main__':
    main()
