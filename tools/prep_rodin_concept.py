"""
Концепт из Gemini -> картинка для Hyper3D Rodin.

Сохраняет кадр из Gemini (скриншот с картинкой в левом верхнем углу) как концепт
<dir>/<name>_concept.png и рядом сжатую копию <name>_14k.webp меньше 14 КБ: в рабочей сети длинные
загрузки обрываются, а Rodin хватает и небольшой картинки. Белый фон по краям обрезается.

    python tools/prep_rodin_concept.py <скриншот.png> <dir> <name> [ширина высота [предел КБ]]

Предел КБ (по умолчанию 14) — размер сжатой копии <name>_<КБ>k.webp.
"""
import os
import sys
from PIL import Image, ImageChops


def trim_white(im, pad=12):
    bg = Image.new('RGB', im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 18 else 0)
    box = diff.getbbox()
    if not box:
        return im
    x0, y0, x1, y1 = box
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def main():
    shot, out_dir, name = sys.argv[1:4]
    w, h = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (1024, 572)
    kb = int(sys.argv[6]) if len(sys.argv) > 6 else 14
    im = Image.open(shot).convert('RGB').crop((0, 0, w, h))
    im = trim_white(im)
    os.makedirs(out_dir, exist_ok=True)
    concept = os.path.join(out_dir, f'{name}_concept.png')
    im.save(concept)
    webp = os.path.join(out_dir, f'{name}_{kb}k.webp')
    dims = (512, 448, 384, 340, 300) if kb <= 14 else (1024, 896, 768, 640, 512)
    for max_dim in dims:
        for q in (82, 74, 66, 58):
            c = im.copy()
            c.thumbnail((max_dim, max_dim), Image.LANCZOS)
            c.save(webp, 'WEBP', quality=q)
            if os.path.getsize(webp) < kb * 1024 + 200:
                print(concept, im.size, '->', webp, c.size, os.path.getsize(webp))
                return
    print(f'не удалось ужать до {kb} КБ:', os.path.getsize(webp))


if __name__ == '__main__':
    main()
