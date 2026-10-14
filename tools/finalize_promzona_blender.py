"""
Промзона: сырые GLB из Rodin (blender_assets/promzona_models/) -> игровые GLB в assets/models/.

Что делает с каждой моделью:
  - склеивает меши, применяет трансформы;
  - Decimate до бюджета треугольников из docs/PERFORMANCE.md;
  - выкидывает карту metallic/roughness (рантайм всё равно ставит roughness>=0.82, metalness<=0.10),
    оставляет base color + normal, текстуры <= 512 px (цвет зданий — 1024), экспорт в WebP;
  - длинную сторону кладёт вдоль X (у пары closed/_open поворот берётся от закрытой модели),
    фасад смотрит в -Y Blender (= +Z glTF, к камере), центр по XY, низ на Z=0;
  - масштаб в метрах (рантайм всё равно нормализует по targetSpan);
  - превью 256 px под углом 28° в assets/models/preview/ и общий лист превью.

Жабы (toad_*) тут не обрабатываются: им нужен скелет и цикл ходьбы, это отдельный шаг.

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b -P tools/finalize_promzona_blender.py [-- имя1 имя2 ...]
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'blender_assets', 'promzona_models')
OUT = os.path.join(ROOT, 'assets', 'models')
PREVIEW = os.path.join(OUT, 'preview')

# id: (длина по длинной стороне, м; бюджет треугольников)
MODELS = {
    'building_admin':         (60.0, 8000),
    'building_checkpoint':    (12.0, 8000),
    'building_cooling_tower': (40.0, 8000),
    'building_foundry':       (70.0, 8000),
    'building_gasholder':     (35.0, 8000),
    'building_mech_workshop': (55.0, 8000),
    'building_oil_tank':      (25.0, 8000),
    'building_pump_station':  (18.0, 8000),
    'building_smokestack':    (10.0, 6000),
    'building_warehouse':     (50.0, 8000),
    'container_boxcar':       (14.0, 5000),
    'container_gondola':      (14.0, 5000),
    'container_tankcar':      (12.0, 5000),
    'container_kamaz':        (7.5, 5000),
    'container_zil':          (6.7, 5000),
    'container_barrel':       (0.9, 3000),
    'safe_cabinet':           (0.8, 4000),
    'safe_fireproof':         (0.9, 4000),
    'safe_vault':             (1.3, 4000),
    'prop_locomotive':        (17.0, 6000),
    'prop_gantry_crane':      (25.0, 6000),
    'prop_pipe_rack':         (12.0, 5000),
    'prop_pipe_stack':        (8.0, 5000),
    'prop_cable_reel':        (2.2, 4000),
}
MATCH_HEIGHT = {'safe_cabinet', 'safe_fireproof', 'safe_vault', 'container_barrel'}
OPEN_EXTRA_TRIS = 1.2   # у открытых вариантов внутри больше деталей
MAX_TEX = 512
# Цвет у зданий — 1024: цех на экране шириной до ~1500 px, и в 512 фасад выходил мыльным. Нормали и всё у
# декора и тайников — 512
MAX_TEX_BUILDING_COLOR = 1024
WEBP_QUALITY = 82
PITCH_DEG = 28          # как у камеры в игре


def tris_of(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def bounds(obj):
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for item in list(coll):
            if item.users == 0:
                coll.remove(item)


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
    return obj


def slim_materials(obj, color_max=MAX_TEX):
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
            img = n.image
            w, h = img.size
            is_color = bsdf is not None and any(l.to_socket == bsdf.inputs['Base Color'] for l in n.outputs[0].links)
            limit = color_max if is_color else MAX_TEX
            if max(w, h) > limit:
                k = limit / max(w, h)
                img.scale(max(1, round(w * k)), max(1, round(h * k)))
        if bsdf:
            bsdf.inputs['Metallic'].default_value = 0.05
            bsdf.inputs['Roughness'].default_value = 0.9


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


def place(obj, length, rot_z, height=None):
    if rot_z:
        obj.data.transform(Matrix.Rotation(rot_z, 4, 'Z'))
    lo, hi = bounds(obj)
    if height:
        s = height / max(hi.z - lo.z, 1e-4)
    else:
        s = length / max(hi.x - lo.x, hi.y - lo.y, 1e-4)
    obj.data.transform(Matrix.Scale(s, 4))
    lo, hi = bounds(obj)
    off = Vector(((lo.x + hi.x) * -0.5, (lo.y + hi.y) * -0.5, -lo.z))
    for v in obj.data.vertices:
        v.co += off
    obj.data.update()


def render_preview(obj, name):
    lo, hi = bounds(obj)
    size = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z)
    center = Vector((0, 0, (hi.z - lo.z) * 0.4))
    pitch = math.radians(PITCH_DEG)
    dist = size * 3
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = size * 1.25
    cam = bpy.data.objects.new('cam', cam_data)
    cam.location = center + Vector((0, -dist * math.cos(pitch), dist * math.sin(pitch)))
    cam.rotation_euler = (math.pi / 2 - pitch, 0, 0)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    for loc, energy, rot in (((4, -5, 7), 4.0, (45, 20, -30)), ((-4, 4, 5), 1.8, (60, -20, 150))):
        ld = bpy.data.lights.new('sun', 'SUN')
        ld.energy = energy
        lo_ = bpy.data.objects.new('sun', ld)
        lo_.rotation_euler = tuple(math.radians(a) for a in rot)
        bpy.context.scene.collection.objects.link(lo_)
    sc = bpy.context.scene
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.resolution_x = sc.render.resolution_y = 256
    sc.render.filepath = os.path.join(PREVIEW, name + '.png')
    bpy.ops.render.render(write_still=True)


def process(name, length, budget, rot_z, height=None):
    path = os.path.join(RAW, name + '.glb')
    if not os.path.exists(path):
        print(f'[skip] {name}: нет {path}')
        return None
    clear_scene()
    obj = import_joined(path, name)
    if rot_z is None:
        lo, hi = bounds(obj)
        rot_z = math.radians(90) if (hi.y - lo.y) > (hi.x - lo.x) * 1.15 else 0.0
    slim_materials(obj, MAX_TEX_BUILDING_COLOR if name.startswith('building_') else MAX_TEX)
    tris = decimate(obj, budget)
    place(obj, length, rot_z, height)
    out = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True,
                              export_image_format='WEBP', export_image_quality=WEBP_QUALITY)
    lo, hi = bounds(obj)
    print(f'[ok] {name}: {tris} tris, {os.path.getsize(out) // 1024} KB, '
          f'{hi.x - lo.x:.1f} x {hi.y - lo.y:.1f} x {hi.z - lo.z:.1f} m, rot {math.degrees(rot_z):.0f}')
    render_preview(obj, name)
    return rot_z, hi.z - lo.z


def contact_sheet(names):
    imgs = []
    for n in names:
        p = os.path.join(PREVIEW, n + '.png')
        if os.path.exists(p):
            imgs.append(bpy.data.images.load(p))
    if not imgs:
        return
    cols, cell = 8, 256
    rows = (len(imgs) + cols - 1) // cols
    sheet = bpy.data.images.new('sheet', cols * cell, rows * cell, alpha=True)
    px = [0.25, 0.25, 0.25, 1.0] * (cols * cell * rows * cell)
    for i, im in enumerate(imgs):
        src = list(im.pixels)
        cx, cy = (i % cols) * cell, (rows - 1 - i // cols) * cell
        for y in range(cell):
            for x in range(cell):
                si = (y * cell + x) * 4
                a = src[si + 3]
                if a <= 0:
                    continue
                di = ((cy + y) * cols * cell + cx + x) * 4
                for c in range(3):
                    px[di + c] = src[si + c] * a + px[di + c] * (1 - a)
    sheet.pixels = px
    sheet.filepath_raw = os.path.join(PREVIEW, '_promzona_sheet.png')
    sheet.file_format = 'PNG'
    sheet.save()


def main():
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    os.makedirs(PREVIEW, exist_ok=True)
    done = []
    for name, (length, budget) in MODELS.items():
        if only and name not in only and name + '_open' not in only:
            continue
        res = process(name, length, budget, None)
        if res is None:
            continue
        rot, closed_h = res
        done.append(name)
        if os.path.exists(os.path.join(RAW, name + '_open.glb')):
            # открытая дверца/крышка раздвигает габарит в плане, поэтому сейфы и бочку
            # подгоняем к высоте закрытого варианта, вагоны и машины — к длине
            h = closed_h if name in MATCH_HEIGHT else None
            process(name + '_open', length, int(budget * OPEN_EXTRA_TRIS), rot, h)
            done.append(name + '_open')
    contact_sheet(done)


main()
