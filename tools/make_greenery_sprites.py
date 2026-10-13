"""
Берёзы и кусты: концепты из Gemini -> спрайты для дворов (EnvironmentRenderer.drawTree / drawBush).

Деревья и кусты в игре — плоские спрайты, они не вращаются, поэтому 3D-модель им не нужна (а тонкие
ветки берёзы Rodin превращает в комки). Концепты — blender_assets/greenery_concepts:
  birch_tree_1_concept.png, birch_tree_2_concept.png — по дереву на картинке;
  bushes_concept.png — сирень слева, шиповник справа.

Белый фон вырезается так:
  1) фон — почти белое, связанное с краем картинки, и белые просветы внутри кроны;
  2) кайма — пиксели в паре точек от фона: там лист или ветка смешаны с белым. Их цвет раскладывается
     как «цвет поверх белого» (color to alpha): белая доля уходит в прозрачность, цвет очищается.
     Без этого крона выглядит заиндевевшей;
  3) кора берёзы светлая, но внутри ствола до фона далеко — она остаётся непрозрачной.
Спрайт обрезается и сжимается (в игре рисуется примерно вдвое мельче — с запасом на чёткость).

    python tools/make_greenery_sprites.py
"""
import os
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

SRC = 'blender_assets/greenery_concepts'
DST = 'assets/sprites/props'
# (концепт, какая часть: None — вся, 'left' / 'right' — половина, имя спрайта, высота спрайта)
ITEMS = [
    ('birch_tree_1_concept.png', None, 'birch_tree_1', 420),
    ('birch_tree_2_concept.png', None, 'birch_tree_2', 400),
    ('bushes_concept.png', 'left', 'courtyard_bush_lilac', 180),
    ('bushes_concept.png', 'right', 'courtyard_bush_rosehip', 180),
]
EDGE_WHITE = 45    # (255·3 − r − g − b) меньше этого и связано с краем — фон
HOLE_WHITE = 30    # просветы внутри кроны белее этого — тоже фон
FRINGE = 5         # ширина каймы вокруг фона, px (до сжатия)


def flood_background(dist):
    h, w = dist.shape
    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if bg[y, x] or dist[y, x] >= EDGE_WHITE:
            continue
        bg[y, x] = True
        if x > 0:
            q.append((y, x - 1))
        if x < w - 1:
            q.append((y, x + 1))
        if y > 0:
            q.append((y - 1, x))
        if y < h - 1:
            q.append((y + 1, x))
    return bg


def cut_background(im):
    rgb = np.asarray(im, dtype=np.float32)
    dist = 765.0 - rgb.sum(axis=2)
    bg = flood_background(dist) | (dist < HOLE_WHITE)
    # Кайма: в нескольких пикселях от фона
    bg_img = Image.fromarray((bg * 255).astype(np.uint8))
    near = np.asarray(bg_img.filter(ImageFilter.MaxFilter(FRINGE * 2 + 1))) > 0
    fringe = near & ~bg
    # Color to alpha от белого: доля «не белого» по самому тёмному каналу
    a_fringe = np.clip((255.0 - rgb.min(axis=2)) / 255.0 * 1.35, 0.0, 1.0)
    alpha = np.where(bg, 0.0, np.where(fringe, a_fringe, 1.0))
    safe = np.maximum(alpha, 1e-3)[..., None]
    clean = np.where(fringe[..., None], (rgb - 255.0 * (1.0 - alpha[..., None])) / safe, rgb)
    clean = np.clip(clean, 0, 255)
    out = np.dstack([clean, alpha * 255.0]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def main():
    for src, part, name, out_h in ITEMS:
        im = Image.open(os.path.join(SRC, src)).convert('RGB')
        if part == 'left':
            im = im.crop((0, 0, im.width // 2, im.height))
        elif part == 'right':
            im = im.crop((im.width // 2, 0, im.width, im.height))
        rgba = cut_background(im)
        box = rgba.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        rgba = rgba.crop(box)
        out_w = round(rgba.width * out_h / rgba.height)
        rgba = rgba.resize((out_w, out_h), Image.LANCZOS)
        path = os.path.join(DST, name + '.png')
        rgba.save(path, optimize=True)
        print(path, rgba.size)


if __name__ == '__main__':
    main()
