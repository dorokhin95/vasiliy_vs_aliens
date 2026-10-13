"""
Оптимизация игровых GLB-моделей: упрощение сетки + уменьшение текстур + WebP.

Запуск (фоновый Blender, текущая сессия Blender не затрагивается):
    blender -b --factory-startup --python tools/optimize_models_blender.py
    blender -b --factory-startup --python tools/optimize_models_blender.py -- --only toad_grunt,vasiliy
    blender -b --factory-startup --python tools/optimize_models_blender.py -- --out-dir D:/tmp/opt

Запускать после каждого экспорта модели из мастер-.blend: иначе в игру снова уедут
4K-текстуры и сотни тысяч треугольников. Бюджеты описаны в docs/PERFORMANCE.md.

Что сохраняется: имена объектов (код ищет Vasiliy_Arm_R_Bat, Vasiliy_Shotgun и т.п.),
скелет, веса и все анимации (каждый action экспортируется отдельным клипом).
"""
import bpy
import os
import sys

# mesh_tris: {имя объекта: макс. треугольников}; '*' — для всех мешей модели
TARGETS = {
    'toad_grunt':     {'path': 'assets/models/toad_grunt.glb',     'mesh_tris': {'*': 7000}, 'tex': 512},
    'toad_sniper':    {'path': 'assets/models/toad_sniper.glb',    'mesh_tris': {'*': 6000}, 'tex': 512},
    'toad_brute':     {'path': 'assets/models/toad_brute.glb',     'mesh_tris': {'*': 8000}, 'tex': 512},
    'vasiliy':        {'path': 'assets/models/vasiliy.glb',
                       'mesh_tris': {'Vasiliy_Body': 9000, 'Vasiliy_Shotgun': 1800,
                                     'Vasiliy_Drill': 1800, 'Vasiliy_Plasma': 1800},
                       'tex': 512},
    'car_zhiguli':    {'path': 'assets/models/car_zhiguli.glb',    'mesh_tris': {}, 'tex': 512},
    'car_uaz':        {'path': 'assets/models/car_uaz.glb',        'mesh_tris': {}, 'tex': 512},
    'trash_dumpster': {'path': 'assets/models/trash_dumpster.glb', 'mesh_tris': {}, 'tex': 512},
    'military_crate': {'path': 'assets/models/military_crate.glb', 'mesh_tris': {}, 'tex': 512},
    # Обысканные тайники: открытые двери, крышки, выпотрошенный бак (рисуются вместо закрытых)
    'car_zhiguli_open':    {'path': 'assets/models/car_zhiguli_open.glb',    'mesh_tris': {'*': 6000}, 'tex': 512},
    'car_uaz_open':        {'path': 'assets/models/car_uaz_open.glb',        'mesh_tris': {'*': 6000}, 'tex': 512},
    'trash_dumpster_open': {'path': 'assets/models/trash_dumpster_open.glb', 'mesh_tris': {'*': 4500}, 'tex': 512},
    'military_crate_open': {'path': 'assets/models/military_crate_open.glb', 'mesh_tris': {'*': 4500}, 'tex': 512},
    # Вторая (целая) плита ПО-2 — чередуется со старой (со сколом) в заборах
    'fence_po2_b':    {'path': 'assets/models/fence_po2_b.glb',    'mesh_tris': {'*': 3500}, 'tex': 512},
}
WEBP_QUALITY = 82


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    only, out_dir = None, None
    for i, a in enumerate(argv):
        if a == '--only':
            only = set(argv[i + 1].split(','))
        elif a == '--out-dir':
            out_dir = argv[i + 1]
    return only, out_dir


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def decimate(ob, max_tris):
    tris = tri_count(ob)
    if tris <= max_tris:
        return tris, tris
    mod = ob.modifiers.new('Optimize_Decimate', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = max_tris / tris
    mod.use_collapse_triangulate = True
    for o in bpy.context.scene.objects:
        o.select_set(o == ob)
    bpy.context.view_layer.objects.active = ob
    # У скелетных мешей первым стоит Armature: упрощаем исходную сетку, а не позу текущего кадра
    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return tris, tri_count(ob)


def shrink_textures(max_size):
    for img in bpy.data.images:
        w, h = img.size
        if max(w, h) > max_size:
            k = max_size / max(w, h)
            img.scale(max(1, round(w * k)), max(1, round(h * k)))


def optimize(name, cfg, out_dir):
    src = os.path.abspath(cfg['path'])
    dst = os.path.join(out_dir, os.path.basename(src)) if out_dir else src
    size_before = os.path.getsize(src)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)

    for ob in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
        limit = cfg['mesh_tris'].get(ob.name, cfg['mesh_tris'].get('*'))
        if limit:
            before, after = decimate(ob, limit)
            print(f'  [{name}] {ob.name}: {before} -> {after} tris')
    shrink_textures(cfg['tex'])

    for o in bpy.context.scene.objects:
        o.select_set(False)
    bpy.ops.export_scene.gltf(
        filepath=dst,
        export_format='GLB',
        use_active_scene=True,
        export_apply=False,
        export_skins=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_image_format='WEBP',
        export_image_quality=WEBP_QUALITY,
    )
    print(f'[OPTIMIZED] {name}: {size_before // 1024} KB -> {os.path.getsize(dst) // 1024} KB  ({dst})')


if __name__ == '__main__':
    only, out_dir = parse_args()
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    for name, cfg in TARGETS.items():
        if only and name not in only:
            continue
        optimize(name, cfg, out_dir)
