"""Портреты выживших для окна диалога (src/dialog.js): нарисованные в Gemini по листу персонажей (арт А5,
docs/LEVEL2_PROMZONA.md) — у каждого свой фон: литейка, проходная, мастерская, столовая, двор.

Исходники — снимки картинок Gemini (blender_assets/portrait_concepts/<id>.png, белые поля вокруг картинки);
из каждого — кадр 5:6 на всю высоту картинки, по центру персонажа (CENTER — доля ширины картинки).

    python tools/make_survivor_portraits.py

Пишет assets/sprites/portraits/<id>.webp, 240×280.
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'blender_assets', 'portrait_concepts')
OUT = os.path.join(ROOT, 'assets', 'sprites', 'portraits')
SIZE = (240, 280)
# Где середина персонажа по ширине картинки (доля)
CENTER = {'stepanych': 0.47, 'zina': 0.47, 'tolik': 0.47, 'lena': 0.46, 'seryoga': 0.5}


def picture_box(im):
    """Картинка на снимке: всё, что не белые поля"""
    a = np.asarray(im.convert('RGB')).astype(int)
    m = a.min(axis=2) < 245
    ys, xs = np.nonzero(m)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, cx in CENTER.items():
        path = os.path.join(SRC, name + '.png')
        if not os.path.exists(path):
            print(f'[skip] {name}: нет {path}')
            continue
        im = Image.open(path).convert('RGB')
        x0, y0, x1, y1 = picture_box(im)
        h = y1 - y0
        w = round(h * SIZE[0] / SIZE[1])
        left = round(x0 + (x1 - x0) * cx - w / 2)
        left = max(x0, min(x1 - w, left))
        crop = im.crop((left, y0, left + w, y1)).resize(SIZE, Image.LANCZOS)
        out = os.path.join(OUT, name + '.webp')
        crop.save(out, quality=88)
        print(f'[ok] {name}: {w}x{h} -> {out}')


if __name__ == '__main__':
    main()
