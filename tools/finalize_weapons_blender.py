"""
Оружие мастерской Толика (src/workshop.js) в руках Василия: сырые GLB из Rodin (blender_assets/promzona_models/,
концепты — blender_assets/promzona_concepts/weapon_*.png) -> assets/models/weapon_<имя>.glb.

  - склеить, Decimate до бюджета, base color + normal не больше 512 px, WebP — как жабы Промзоны
    (tools/build_promzona_toads_blender.py: import_joined, slim_materials, decimate);
  - ствол — в -Y Blender (= +Z glTF: вперёд у Василия), верх — +Z. Концепт нарисован сбоку стволом вправо,
    у Rodin это +X, поэтому rot_z = -90;
  - середина габарита — в начале координат, длина по стволу — в метрах. Рантайм всё равно подгоняет модель
    под обрез, дрель или ПМ, на месте которых она в руках (three_character.js, fitLike);
  - превью сбоку и под углом камеры игры — assets/models/preview/<имя>.png.

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/finalize_weapons_blender.py [-- имя ...]
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_promzona_toads_blender as T  # noqa: E402

RAW, OUT, PREVIEW = T.RAW, T.OUT, T.PREVIEW

# имя: (длина по стволу, м; бюджет треугольников; поворот вокруг вертикали, °; множитель цвета).
# Множитель — под свет Василия (three_character.js): средняя яркость ствола в кадре — как у обреза, ПМ и
# плазмагана (~120–128 sRGB); с 0,9 разрядник давал 179, гранатомёт — 160, граната — 147
WEAPONS = {
    'weapon_launcher': (0.95, 3500, -90, 0.48),
    'weapon_arc': (0.8, 3500, -90, 0.39),
    'weapon_emp': (0.14, 1500, 0, 0.66),
    # Наган Зины (квест «Коля», src/quests.js) — в руке, где ПМ
    'weapon_nagant': (0.235, 4000, -90, 0.36),
    # Лазерный бластер (карта Долбильщика) — в руках на месте плазмагана
    'weapon_laser': (1.0, 4000, -90, 0.5),
}


def bounds(obj):
    vs = [v.co for v in obj.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi


def render_preview(obj, name):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'TEXTURE'
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = 512, 256
    lo, hi = bounds(obj)
    size = max(hi - lo)
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = size * 1.2
    cam = bpy.data.objects.new('cam', cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    # Сбоку (справа от оружия, ствол влево на картинке) и сверху-спереди, как камера игры (28°)
    shots = [((6, 0, 0), (math.pi / 2, 0, math.pi / 2)), ((0, -6 * math.cos(math.radians(28)), 6 * math.sin(math.radians(28))),
                                                          (math.pi / 2 - math.radians(28), 0, 0))]
    paths = []
    for i, (loc, rot) in enumerate(shots):
        cam.location = loc
        cam.rotation_euler = rot
        p = os.path.join(PREVIEW, f'_{name}_{i}.png')
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        paths.append(p)
    import numpy as np
    imgs = []
    for p in paths:
        im = bpy.data.images.load(p)
        imgs.append(np.array(im.pixels[:], dtype=np.float32).reshape(256, 512, 4))
        bpy.data.images.remove(im)
        os.remove(p)
    sheet = np.concatenate(imgs[::-1], axis=0)      # пиксели снизу вверх: первый кадр — сверху
    bg = np.array([0.22, 0.22, 0.24, 1.0], dtype=np.float32)
    a = sheet[..., 3:4]
    out = sheet * a + bg * (1 - a)
    out[..., 3] = 1
    img = bpy.data.images.new('sheet', 512, 512, alpha=True)
    img.pixels = out.ravel()
    img.filepath_raw = os.path.join(PREVIEW, name + '.png')
    img.file_format = 'PNG'
    img.save()


def process(name, length, budget, rot_z, albedo):
    path = os.path.join(RAW, name + '.glb')
    if not os.path.exists(path):
        print(f'[skip] {name}: нет {path}')
        return
    T.clear_scene()
    obj = T.import_joined(path, name)
    T.slim_materials(obj, albedo)
    tris = T.decimate(obj, budget)
    obj.data.transform(Matrix.Rotation(math.radians(rot_z), 4, 'Z'))
    lo, hi = bounds(obj)
    obj.data.transform(Matrix.Translation(-(lo + hi) / 2))
    # Длина — вдоль ствола (Y); у гранаты — по большей стороне
    span = (hi - lo).y if rot_z else max(hi - lo)
    obj.data.transform(Matrix.Scale(length / span, 4))
    obj.data.update()
    lo, hi = bounds(obj)
    out = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True,
                              export_image_format='WEBP', export_image_quality=T.WEBP_QUALITY)
    size = hi - lo
    print(f'[ok] {name}: {tris} tris, {os.path.getsize(out) // 1024} KB, {size.x:.2f} x {size.y:.2f} x {size.z:.2f} м')
    render_preview(obj, name)


def main():
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    os.makedirs(PREVIEW, exist_ok=True)
    for name, cfg in WEAPONS.items():
        if not only or name in only:
            process(name, *cfg)


if __name__ == '__main__':
    main()
