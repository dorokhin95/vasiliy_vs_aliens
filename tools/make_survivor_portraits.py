"""Портреты выживших для окна диалога (src/dialog.js) — временные, пока нет нарисованных (арт А5,
docs/LEVEL2_PROMZONA.md): погрудные кадры из листа персонажей docs/comic_refs/survivors_comic_sheet.webp.

    python tools/make_survivor_portraits.py

Пишет assets/sprites/portraits/<id>.webp, 240×280.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'docs', 'comic_refs', 'survivors_comic_sheet.webp')
OUT = os.path.join(ROOT, 'assets', 'sprites', 'portraits')
SIZE = (240, 280)

# Левый верхний угол кадра на листе (px оригинала 2752×1536); кадр — 460×536, как SIZE
BOX_W, BOX_H = 460, 536
CROPS = {
    'stepanych': (180, 70),
    'zina': (770, 90),
    'tolik': (1310, 50),
    'lena': (1760, 150),
    'seryoga': (2175, 80),
}


def main():
    sheet = Image.open(SHEET).convert('RGB')
    os.makedirs(OUT, exist_ok=True)
    for name, (x, y) in CROPS.items():
        img = sheet.crop((x, y, x + BOX_W, y + BOX_H)).resize(SIZE, Image.LANCZOS)
        path = os.path.join(OUT, f'{name}.webp')
        img.save(path, 'WEBP', quality=86, method=6)
        print(path, os.path.getsize(path))


if __name__ == '__main__':
    main()
