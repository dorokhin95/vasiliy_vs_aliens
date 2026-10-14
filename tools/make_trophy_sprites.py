"""
2D-лут из концепта Gemini -> иконки для игры. Наборы (SETS):
  trophies — жабьи трофеи (глаз, лапка, печень), blender_assets/trophy_concepts/toad_trophies_concept.png;
  promzona — лут Промзоны (цветмет, чертёж, техспирт, плазменная ячейка, квако-заряд),
             blender_assets/loot_concepts/promzona_loot_concept.png.

Концепт — предметы в ряд на белом фоне. Лут висит над землёй как остальной 2D-лут
(loot_mil_parts, loot_alien_core), 3D-модель ему не нужна. Поэтому:
  1) белый фон, связанный с краем картинки, вырезается в прозрачность (блики на предметах
     остаются), край смягчается;
  2) предметы разделяются как связные области (split_items);
  3) каждый обрезается по содержимому, вписывается в квадрат с полями и сжимается до 128×128.

    python tools/make_trophy_sprites.py [набор ...]   (без аргументов — все наборы)
"""
import os
import sys
from collections import deque
from PIL import Image, ImageChops, ImageFilter

SETS = {
    'trophies': ('blender_assets/trophy_concepts/toad_trophies_concept.png',
                 ['loot_toad_eye', 'loot_toad_leg', 'loot_toad_liver']),
    'promzona': ('blender_assets/loot_concepts/promzona_loot_concept.png',
                 ['loot_nonferrous', 'loot_blueprint', 'loot_tech_spirit', 'loot_plasma_cell', 'loot_kvako_charge']),
}
DST = 'assets/sprites/loot'
OUT = 128
PAD = 0.06          # поля вокруг предмета, доля стороны
WHITE_DIST = 34     # насколько пиксель может отличаться от белого и всё ещё считаться фоном


def is_bg(p):
    r, g, b = p[:3]
    return (255 - r) + (255 - g) + (255 - b) < WHITE_DIST


def cut_background(im):
    """Прозрачность для белого фона, связанного с краем (заливка от краёв)."""
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if bg[i] or not is_bg(px[x, y]):
            continue
        bg[i] = 1
        if x > 0:
            q.append((x - 1, y))
        if x < w - 1:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y < h - 1:
            q.append((x, y + 1))
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
    comps = sorted(comps, key=len, reverse=True)[:n]
    comps.sort(key=lambda pts: sum(p[0] for p in pts) / len(pts))

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


def make_set(src, names):
    im = Image.open(src).convert('RGB')
    rgba = cut_background(im)
    masks = split_items(rgba, len(names))
    assert len(masks) == len(names), f'{src}: нашлось предметов: {len(masks)}'
    for name, mask in zip(names, masks):
        part = rgba.copy()
        part.putalpha(ImageChops.darker(rgba.getchannel('A'), mask))
        part = part.crop(part.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
        side = int(max(part.size) * (1 + PAD * 2))
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2), part)
        sq = sq.resize((OUT, OUT), Image.LANCZOS)
        path = os.path.join(DST, name + '.png')
        sq.save(path, optimize=True)
        print(path, part.size)


def main():
    for key in sys.argv[1:] or SETS:
        make_set(*SETS[key])


if __name__ == '__main__':
    main()
