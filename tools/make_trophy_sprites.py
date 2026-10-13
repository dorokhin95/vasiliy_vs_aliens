"""
Жабьи трофеи (глаз, лапка, печень): концепт из Gemini -> иконки лута для игры.

Концепт — три предмета в ряд на белом фоне (blender_assets/trophy_concepts/toad_trophies_concept.png).
Трофеи падают с жаб и висят над землёй как остальной 2D-лут (loot_mil_parts, loot_alien_core),
3D-модель им не нужна. Поэтому:
  1) белый фон, связанный с краем картинки, вырезается в прозрачность (блики на предметах
     остаются), край смягчается;
  2) предметы разделяются по пустым вертикальным полосам между ними;
  3) каждый обрезается по содержимому, вписывается в квадрат с полями и сжимается до 128×128.

    python tools/make_trophy_sprites.py
"""
import os
from collections import deque
from PIL import Image, ImageFilter

SRC = 'blender_assets/trophy_concepts/toad_trophies_concept.png'
DST = 'assets/sprites/loot'
NAMES = ['loot_toad_eye', 'loot_toad_leg', 'loot_toad_liver']
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


def split_columns(im):
    """Диапазоны x, где есть непрозрачные пиксели, — по одному на предмет."""
    w, h = im.size
    a = im.getchannel('A').load()
    filled = [any(a[x, y] > 40 for y in range(0, h, 2)) for x in range(w)]
    spans, start = [], None
    for x, f in enumerate(filled + [False]):
        if f and start is None:
            start = x
        elif not f and start is not None:
            if x - start > 20:
                spans.append((start, x))
            start = None
    return spans


def main():
    im = Image.open(SRC).convert('RGB')
    rgba = cut_background(im)
    spans = split_columns(rgba)
    assert len(spans) == len(NAMES), f'нашлось предметов: {len(spans)}'
    for name, (x0, x1) in zip(NAMES, spans):
        part = rgba.crop((x0, 0, x1, rgba.height))
        part = part.crop(part.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
        side = int(max(part.size) * (1 + PAD * 2))
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2), part)
        sq = sq.resize((OUT, OUT), Image.LANCZOS)
        path = os.path.join(DST, name + '.png')
        sq.save(path, optimize=True)
        print(path, part.size)


if __name__ == '__main__':
    main()
