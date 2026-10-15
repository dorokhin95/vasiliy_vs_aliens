"""
2D-лут из концепта Gemini -> иконки для игры. Наборы (SETS):
  trophies — жабьи трофеи (глаз, лапка, печень), blender_assets/trophy_concepts/toad_trophies_concept.png;
  promzona — лут Промзоны (цветмет, чертёж, техспирт, плазменная ячейка, квако-заряд),
             blender_assets/loot_concepts/promzona_loot_concept.png;
  perks_cyber, perks_mutation, perks_magic — значки перков трёх веток (лавка, окно персонажа),
  abilities — значки способностей ПКМ (у горючей жижи — значок её перка): blender_assets/perk_concepts/,
             в assets/sprites/perks/;
  quest — предметы квестов (src/quests.js): blender_assets/perk_concepts/quest_items_concept.png,
             в assets/sprites/quest/;
  weapons_ws — стволы мастерской Толика (гранатомёт, разрядник, ЭМИ-граната) из их концептов для Rodin,
             electronics — продвинутая электроника (лут сейфов);
  dishes — блюда столовой Лены и проба шлама (квест «Проба шлама»).

Концепты — из того же чата Gemini, что и лут, тем же промтом: предметы в ряд на белом фоне.
Лут висит над землёй как остальной 2D-лут
(loot_mil_parts, loot_alien_core), 3D-модель ему не нужна. Поэтому:
  1) белый фон, связанный с краем картинки, вырезается в прозрачность (блики на предметах
     остаются), край смягчается;
  2) предметы разделяются как связные области (split_items); мелкие оторванные куски (искры, пламя, луч)
     прибавляются к ближайшему предмету;
  3) каждый обрезается по содержимому, вписывается в квадрат с полями и сжимается до 128×128.

    python tools/make_trophy_sprites.py [набор ...]   (без аргументов — все наборы)
"""
import os
import sys
from collections import deque
from PIL import Image, ImageChops, ImageFilter

PERKS = 'blender_assets/perk_concepts/'
SETS = {
    'trophies': ('blender_assets/trophy_concepts/toad_trophies_concept.png',
                 ['loot_toad_eye', 'loot_toad_leg', 'loot_toad_liver']),
    'promzona': ('blender_assets/loot_concepts/promzona_loot_concept.png',
                 ['loot_nonferrous', 'loot_blueprint', 'loot_tech_spirit', 'loot_plasma_cell', 'loot_kvako_charge']),
    'perks_cyber': (PERKS + 'perks_cyber_concept.png',
                    ['drill_arm', 'car_battery', 'stethoscope', 'fire_goo', 'laser_eye'], 'assets/sprites/perks'),
    'perks_mutation': (PERKS + 'perks_mutation_concept.png',
                       ['tentacle_arm', 'slime_skin', 'third_frog_eye', 'sludge_skin', 'frog_legs'], 'assets/sprites/perks'),
    'perks_magic': (PERKS + 'perks_magic_concept.png',
                    ['fume_aura', 'shaman_carpet', 'pigeon_familiar', 'charmed_spirit', 'lucky_charm'], 'assets/sprites/perks'),
    'abilities': (PERKS + 'abilities_concept.png', ['ability_dash', 'ability_regen'], 'assets/sprites/perks'),
    'quest': (PERKS + 'quest_items_concept.png',
              ['quest_welding_rig', 'quest_sample_log', 'quest_shift_tag', 'quest_guard_log'], 'assets/sprites/quest'),
    # Мастерская Толика: значки стволов (160 px, как у остального оружия) — из концептов для Rodin, и плата
    # Длинные стволы — наискось (дулом вверх-вправо, как обрез), иначе в квадрате ячейки они тонкие
    'weapons_ws': [('blender_assets/promzona_concepts/weapon_launcher.png', ['weapon_launcher'], 'assets/sprites/weapons', 160, 22),
                   ('blender_assets/promzona_concepts/weapon_arc.png', ['weapon_arc'], 'assets/sprites/weapons', 160, 22),
                   ('blender_assets/promzona_concepts/weapon_emp.png', ['weapon_emp'], 'assets/sprites/weapons', 160)],
    'electronics': (PERKS + 'electronics_concept.png', ['loot_electronics']),
    # Столовая Лены (src/canteen.js): блюда — assets/sprites/dishes/, проба шлама — значок квеста.
    # None — предмет этого листа сохраняется другой частью набора
    'dishes': [(PERKS + 'dishes1_concept.png', ['soup', 'tincture', 'jelly', 'compress'], 'assets/sprites/dishes'),
               (PERKS + 'dishes2_concept.png', ['drops', 'ointment', 'borscht', None], 'assets/sprites/dishes'),
               (PERKS + 'dishes2_concept.png', [None, None, None, 'quest_sludge_sample'], 'assets/sprites/quest')],
}
DST = 'assets/sprites/loot'
MIN_PART = 6        # кусок меньше (пикселей маски в 1/4) — пыль, не прибавляется
ENCLOSED_MIN = 700  # замкнутый белый просвет больше (пикселей) — фон, меньше — блик
OUT = 128
PAD = 0.06          # поля вокруг предмета, доля стороны
WHITE_DIST = 34     # насколько пиксель может отличаться от белого и всё ещё считаться фоном


def is_bg(p):
    r, g, b = p[:3]
    return (255 - r) + (255 - g) + (255 - b) < WHITE_DIST


def flood_bg(px, w, h, bg, seeds):
    """Залить фон (bg = 1) от seeds по белым пикселям; вернуть, сколько залито."""
    q = deque(seeds)
    n = 0
    while q:
        x, y = q.popleft()
        i = y * w + x
        if bg[i] or not is_bg(px[x, y]):
            continue
        bg[i] = 1
        n += 1
        if x > 0:
            q.append((x - 1, y))
        if x < w - 1:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y < h - 1:
            q.append((x, y + 1))
    return n


def cut_background(im, enclosed=False):
    """Прозрачность для белого фона, связанного с краем (заливка от краёв). enclosed — ещё и замкнутые белые
    просветы крупнее ENCLOSED_MIN (внутри петли стетоскопа, кабеля): у значков белого в самих предметах нет."""
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    edge = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    edge += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    flood_bg(px, w, h, bg, edge)
    if enclosed:
        seen = bytearray(bg)
        for y0 in range(h):
            for x0 in range(w):
                i0 = y0 * w + x0
                if seen[i0] or not is_bg(px[x0, y0]):
                    continue
                # белый просвет внутри предмета: собрать его целиком
                seen[i0] = 1
                q, pts = deque([(x0, y0)]), []
                while q:
                    x, y = q.popleft()
                    pts.append(y * w + x)
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(px[nx, ny]):
                            seen[ny * w + nx] = 1
                            q.append((nx, ny))
                if len(pts) >= ENCLOSED_MIN:
                    for k in pts:
                        bg[k] = 1
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if bg[y * w + x]:
                ap[x, y] = 0
    # Мягкий край без белой каймы: альфа чуть сужается и размывается
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def split_items(im, n):
    """Предметы — связные области непрозрачного (маска в 1/4 размера, 8 соседей), n самых крупных слева
    направо. Для каждого — маска полного размера: предметы, стоящие вплотную или перекрываясь по столбцам
    (плазменная ячейка и ракета), не попадают друг к другу в кадр."""
    k = 4
    w, h = im.size
    small = im.getchannel('A').resize((w // k, h // k), Image.BOX).point(lambda v: 255 if v > 40 else 0)
    sw, sh = small.size
    px = small.load()
    label = [0] * (sw * sh)
    comps = []
    for y0 in range(sh):
        for x0 in range(sw):
            if not px[x0, y0] or label[y0 * sw + x0]:
                continue
            label[y0 * sw + x0] = len(comps) + 1
            q, pts = deque([(x0, y0)]), []
            while q:
                x, y = q.popleft()
                pts.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < sw and 0 <= ny < sh and px[nx, ny] and not label[ny * sw + nx]:
                            label[ny * sw + nx] = len(comps) + 1
                            q.append((nx, ny))
            comps.append(pts)
    comps = sorted(comps, key=len, reverse=True)
    rest = [pts for pts in comps[n:] if len(pts) >= MIN_PART]
    comps = comps[:n]
    comps.sort(key=lambda pts: sum(p[0] for p in pts) / len(pts))
    # Оторванные куски (искры, языки пламени, луч) — к ближайшему по горизонтали предмету
    spans = [(min(p[0] for p in pts), max(p[0] for p in pts)) for pts in comps]
    for pts in rest:
        cx = sum(p[0] for p in pts) / len(pts)
        near = min(range(len(comps)), key=lambda i: max(spans[i][0] - cx, 0, cx - spans[i][1]))
        comps[near] = comps[near] + pts

    def mask_of(pts):
        m = Image.new('L', (sw, sh), 0)
        mp = m.load()
        for x, y in pts:
            mp[x, y] = 255
        return m

    raw = [mask_of(pts) for pts in comps]
    masks = []
    for i, m in enumerate(raw):
        # своя область с запасом на мягкий край, минус чужие
        own = m.filter(ImageFilter.MaxFilter(3))
        for j, other in enumerate(raw):
            if j != i:
                own = ImageChops.subtract(own, other)
        masks.append(own.resize((w, h), Image.NEAREST))
    return masks


def make_set(src, names, dst=DST, out=OUT, rot=0):
    im = Image.open(src).convert('RGB')
    rgba = cut_background(im, enclosed=dst != DST)
    masks = split_items(rgba, len(names))
    assert len(masks) == len(names), f'{src}: нашлось предметов: {len(masks)}'
    for name, mask in zip(names, masks):
        if name is None:
            continue
        part = rgba.copy()
        part.putalpha(ImageChops.darker(rgba.getchannel('A'), mask))
        part = part.crop(part.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
        if rot:
            part = part.rotate(rot, resample=Image.BICUBIC, expand=True)
            part = part.crop(part.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
        side = int(max(part.size) * (1 + PAD * 2))
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2), part)
        sq = sq.resize((out, out), Image.LANCZOS)
        os.makedirs(dst, exist_ok=True)
        path = os.path.join(dst, name + '.png')
        sq.save(path, optimize=True)
        print(path, part.size)


def main():
    for key in sys.argv[1:] or SETS:
        parts = SETS[key] if isinstance(SETS[key], list) else [SETS[key]]
        for part in parts:
            make_set(*part)


if __name__ == '__main__':
    main()
