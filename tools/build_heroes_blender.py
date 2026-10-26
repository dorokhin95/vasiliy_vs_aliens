"""Герои коопа (docs/COOP.md, «Герои»): тела из Rodin на скелете, руках и оружии Василия.

Василий — assets/models/vasiliy.glb: скелет из 12 костей, клипы Idle/Walk/Roll, руки — отдельные жёсткие меши
(Vasiliy_Arm_*) с оружием в них, корпус — скин. Герой: концепт Gemini (Т-поза, пустые руки, белый фон,
blender_assets/promzona_concepts/hero_<id>.png) -> Rodin (tools/generate_promzona_rodin.py hero_<id>) ->
здесь: тело героя без рук садится на скелет Василия, скелет и руки растягиваются под его рост и ширину,
рукава перекрашиваются под его одежду. Играет его src/three_character.js — тот же код, что у Василия.

  - корень между щиколотками на Z=0, лицом в -Y (= +Z glTF, к камере), рост — HEROES[id]['height'];
  - руки Т-позы отрезаются: всё выше 0,62 роста шире корпуса (|x| > полуширина по поясу и животу); что
    остаётся под плечом, закрывает плечо руки Василия;
  - скелет: кости ×(kx, kx, kz) — kx по полуширине корпуса, kz по росту (относительно Василия); руки Василия
    (объекты) — так же, их плечи — на высоте оси отрезанных рук: dz — насколько это выше, чем 1,36·kz;
    на dz же поднимается Weapon_Socket (стволы в руках);
  - рукава: текстура ватника «model» — яркость × цвет одежды героя (sleeve), перчатки те же;
  - веса — автоматические (heat), как у выживших Промзоны.
kx, kz, dz и рост пишутся в assets/models/heroes.json — src/three_character.js берёт их оттуда для положения
дула (getMuzzlePosition) и высоты подписи. Превью шага — assets/models/preview/hero_<id>_walk.png.

    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --factory-startup -P tools/build_heroes_blender.py [-- id ...]
"""
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_promzona_toads_blender as T  # noqa: E402  импорт, материалы, Decimate, превью шага

ROOT, RAW, OUT, PREVIEW = T.ROOT, T.RAW, T.OUT, T.PREVIEW
VASILIY = os.path.join(OUT, 'vasiliy.glb')
METRICS = os.path.join(OUT, 'heroes.json')
TRIS = 18000        # у Василия корпус 9000; герои из Rodin Detail — вдвое щедрее, текстуры 1024
MAX_TEX = 1024
V_SHOULDER = Vector((0.26, -0.02, 1.36))   # плечо руки Василия: Vasiliy_Arm_* в vasiliy.glb
V_TW = 0.245                               # полуширина корпуса сырого Василия Rodin (vasiliy_tpose.glb): мерка для kx
V_HEIGHT = 1.90                            # его же рост
ARMS = ('Vasiliy_Arm_L_Down', 'Vasiliy_Arm_R_Bat', 'Vasiliy_Arm_R_Pistol')   # вращаются у плеча
ARMS_TWO = 'Vasiliy_Arms_TwoHanded'                                            # в начале координат

# sleeve — цвет рукавов (sRGB 0..1), albedo — множитель текстуры тела (как у выживших)
HEROES = {
    # Сам Василий в Т-позе (blender_assets/vasiliy_tpose.glb) — проверка конвейера, в игру не идёт
    'test':     dict(raw=os.path.join(ROOT, 'blender_assets', 'vasiliy_tpose.glb'), height=1.90, sleeve=(0.46, 0.47, 0.33)),
    'bruiser':  dict(height=2.00, sleeve=(0.18, 0.30, 0.72)),   # грузчик: синий спортивный костюм
    'kid':      dict(height=1.82, sleeve=(0.50, 0.50, 0.52)),   # пацан: серое худи
    'punk':     dict(height=1.62, sleeve=(0.16, 0.14, 0.16)),   # готка: чёрная сетка
    'skier':    dict(height=1.78, sleeve=(0.80, 0.12, 0.12)),   # лыжница: красная олимпийка
    'sergeant': dict(height=1.76, sleeve=(0.36, 0.43, 0.56)),   # старшина: бушлат милиции
}


def torso_half_width(verts, h):
    """Полуширина корпуса по поясу и животу: ниже рук Т-позы (их ось ~0,74 роста), выше бёдер."""
    return max(abs(v.x) for v in verts if 0.52 * h <= v.z <= 0.62 * h)


def cut_arms(obj, h):
    """Отрезает руки Т-позы. Возвращает (полуширина корпуса, высота плеча — ось руки у самого корпуса)."""
    me = obj.data
    verts = [v.co.copy() for v in me.vertices]
    tw = torso_half_width(verts, h)
    arm = [v.z for v in verts if v.z > 0.62 * h and tw + 0.04 < abs(v.x) < tw + 0.16]
    sz = sum(arm) / len(arm) if arm else 0.74 * h
    bm = bmesh.new()
    bm.from_mesh(me)
    gone = [v for v in bm.verts if v.co.z > 0.62 * h and abs(v.co.x) > tw + 0.01]
    bmesh.ops.delete(bm, geom=gone, context='VERTS')
    edges = [e for e in bm.edges if e.is_boundary]
    if edges:
        bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    bm.to_mesh(me)
    bm.free()
    me.update()
    return tw, sz, len(gone)


def rename_hero_data(obj, hid):
    """Материал и текстуры героя — свои имена: у рук Василия останутся «model» и «texture_diffuse»."""
    for slot in obj.material_slots:
        mat = slot.material
        if not mat:
            continue
        mat.name = f'hero_{hid}'
        if mat.node_tree:
            for n in mat.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    n.image.name = f'hero_{hid}_' + n.image.name


def sleeves_material(hid, color):
    """Копия материала ватника с перекрашенной текстурой: яркость × цвет одежды героя."""
    src = bpy.data.materials['model']
    node = next(n for n in src.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image
                and n.outputs[0].links and n.outputs[0].links[0].to_socket.name == 'Base Color')
    img = node.image
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    lum = px[:, 0] * 0.299 + px[:, 1] * 0.587 + px[:, 2] * 0.114
    mean = max(1e-3, float(lum.mean()))
    lum = mean + (lum - mean) * 0.35   # камуфляж ватника гасим: ровный цвет с мягкой тенью
    out = px.copy()
    for c in range(3):
        out[:, c] = np.clip(lum / mean * color[c], 0, 1)
    new = bpy.data.images.new(f'sleeves_{hid}', w, h, alpha=True)
    new.colorspace_settings.name = img.colorspace_settings.name
    new.pixels = out.ravel().tolist()
    new.pack()
    mat = src.copy()
    mat.name = f'sleeves_{hid}'
    n2 = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image == img)
    n2.image = new
    for n in list(mat.node_tree.nodes):   # без стёжки ватника: карта нормалей — долой
        if n.type == 'NORMAL_MAP':
            mat.node_tree.nodes.remove(n)
    return mat


def scale_rig(rig, kx, kz, dz):
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for b in rig.data.edit_bones:
        extra = dz if b.name == 'Weapon_Socket' else 0.0
        b.head = Vector((b.head.x * kx, b.head.y * kx, b.head.z * kz + extra))
        b.tail = Vector((b.tail.x * kx, b.tail.y * kx, b.tail.z * kz + extra))
    bpy.ops.object.mode_set(mode='OBJECT')


def place_arms(kx, kz, dz, sleeves):
    for name in ARMS + (ARMS_TWO,):
        o = bpy.data.objects[name]
        if name == ARMS_TWO:
            o.location = Vector((0, 0, dz))
        else:
            s = V_SHOULDER
            o.location = Vector((math.copysign(s.x * kx, o.location.x), s.y * kx, s.z * kz + dz))
        o.scale = Vector((kx, kx, kz))
        for slot in o.material_slots:
            if slot.material and slot.material.name == 'model':
                slot.material = sleeves


def skin(mesh, rig):
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    bpy.ops.object.select_all(action='DESELECT')


def save_metrics(hid, m):
    if hid == 'test':
        return
    data = {}
    if os.path.exists(METRICS):
        with open(METRICS, encoding='utf-8') as f:
            data = json.load(f)
    data[hid] = m
    with open(METRICS, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')


def process(hid, cfg):
    raw = cfg.get('raw') or os.path.join(RAW, f'hero_{hid}.glb')
    if not os.path.exists(raw):
        print(f'[skip] {hid}: нет {raw}')
        return
    T.clear_scene()
    hero = T.import_joined(raw, 'Hero_Body')
    rename_hero_data(hero, hid)
    T.MAX_TEX = MAX_TEX
    T.slim_materials(hero, cfg.get('albedo', 1.0))
    tris = T.decimate(hero, TRIS)
    origin, raw_h = T.raw_origin(hero)
    k = cfg['height'] / raw_h
    hero.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(-origin))
    hero.data.update()
    tw, sz, gone = cut_arms(hero, cfg['height'])

    # Василий: скелет, руки, оружие, клипы; его корпус — мерка и долой
    bpy.ops.import_scene.gltf(filepath=VASILIY)
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and o.name not in ('Hero_Body',) and not o.name.startswith('Vasiliy_'):
            bpy.data.objects.remove(o, do_unlink=True)   # Icosphere и прочее лишнее из glb
    rig = bpy.data.objects['Vasiliy_Rig']
    vbody = bpy.data.objects['Vasiliy_Body']
    vmesh = vbody.data
    bpy.data.objects.remove(vbody, do_unlink=True)
    bpy.data.meshes.remove(vmesh)

    kx = tw / V_TW
    kz = cfg['height'] / V_HEIGHT
    dz = sz - V_SHOULDER.z * kz
    scale_rig(rig, kx, kz, dz)
    sleeves = sleeves_material(hid, cfg['sleeve'])
    place_arms(kx, kz, dz, sleeves)
    hero.name = 'Vasiliy_Body'
    skin(hero, rig)

    out = os.path.join(OUT, f'hero_{hid}.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_apply=False,
                              export_animations=True, export_animation_mode='ACTIONS',
                              export_skins=True, export_current_frame=False,
                              export_image_format='WEBP', export_image_quality=T.WEBP_QUALITY)
    m = dict(height=round(cfg['height'], 3), kx=round(kx, 4), kz=round(kz, 4), dz=round(dz, 4))
    save_metrics(hid, m)
    print(f'[ok] {hid}: {tris} tris, {os.path.getsize(out) // 1024} KB, срезано вершин рук {gone}, '
          f'корпус {tw:.3f} (Василий {V_TW}), ось рук {sz:.3f}, {m}', flush=True)

    # Превью шага: как в игре — руки на двух стволах с обрезом
    walk = next((a for a in bpy.data.actions if 'Walk' in a.name), None)
    if walk:
        rig.animation_data.action = walk
    for name in ('Vasiliy_Arm_L_Down', 'Vasiliy_Arm_R_Bat', 'Vasiliy_Arm_R_Pistol', 'Vasiliy_Drill', 'Vasiliy_Plasma'):
        bpy.data.objects[name].hide_render = True
    T.render_walk_preview(rig, cfg, f'hero_{hid}', cfg['height'])


def main():
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    os.makedirs(PREVIEW, exist_ok=True)
    for hid, cfg in HEROES.items():
        if (only and hid in only) or (not only and hid != 'test'):
            process(hid, cfg)


if __name__ == '__main__':
    main()
