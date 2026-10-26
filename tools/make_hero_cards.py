"""Карточки героев коопа для лобби (src/net.js, renderLobby): погрудные кадры с листа героев
docs/comic_refs/heroes_sheet.webp (шестеро в ряд на белом, слева направо — как HEROES в src/heroes.js).

Фигуры находятся по белым промежуткам между головами (руки соседей касаются); кадр 6:7 — от макушки вниз, шириной по плечам.

    python tools/make_hero_cards.py

Пишет assets/sprites/heroes/<id>.webp, 240×280.
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'docs', 'comic_refs', 'heroes_sheet.webp')
OUT = os.path.join(ROOT, 'assets', 'sprites', 'heroes')
IDS = ['vasiliy', 'bruiser', 'kid', 'punk', 'skier', 'sergeant']
SIZE = (240, 280)
HEAD = 0.36   # доля роста фигуры в кадре (от макушки)


def figures(mask):
    """Отрезки столбцов, где есть фигура (промежутки шире 12 px — разрывы)."""
    cols = mask.any(axis=0)
    runs, start = [], None
    for x, v in enumerate(cols):
        if v and start is None:
            start = x
        elif not v and start is not None:
            runs.append([start, x])
            start = None
    if start is not None:
        runs.append([start, len(cols)])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < 12:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [r for r in merged if r[1] - r[0] > 40]


def main():
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(SHEET).convert('RGB')
    a = np.asarray(im).astype(int)
    mask = a.min(axis=2) < 235
    # Руки соседей касаются — фигуры делим по головам: верхние 16% листа — только головы
    runs = figures(mask[:int(mask.shape[0] * 0.16)])
    assert len(runs) == len(IDS), f'фигур на листе {len(runs)}, ждали {len(IDS)}: {runs}'
    for hid, (x0, x1) in zip(IDS, runs):
        rows = np.nonzero(mask[:, x0:x1].any(axis=1))[0]
        top, bottom = rows.min(), rows.max()
        h = (bottom - top) * HEAD
        w = h * SIZE[0] / SIZE[1]
        cx = (x0 + x1) / 2
        box = (round(cx - w / 2), top - 6, round(cx + w / 2), round(top - 6 + h))
        im.crop(box).resize(SIZE, Image.LANCZOS).save(os.path.join(OUT, hid + '.webp'), quality=88)
        print(f'[ok] {hid}: фигура x {x0}-{x1}, кадр {box}')


if __name__ == '__main__':
    main()
