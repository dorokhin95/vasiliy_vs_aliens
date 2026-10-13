"""
Био-лужи Квако-гнезда: концепты из Gemini -> спрайты для игры.

Концепт — лужа слизи на куске асфальта, вид 3/4 сверху на светло-сером фоне (почти та же камера,
что в игре). 3D-модель здесь не нужна: лужа плоская, лежит на земле и видна с одного ракурса
(Rodin делал из таких картинок кольца и «медальоны»). Поэтому:
  1) серый фон вырезается в прозрачность;
  2) находится зелёная слизь, и всё дальше от неё (кусок асфальта с толщиной) плавно растворяется
     в землю — получается пятно заражения, а не приподнятая плита;
  3) спрайт обрезается и сжимается в WebP с прозрачностью.
Печатает, где в спрайте слизь: по этим числам в игре задаётся зона, где лужа жжёт и лечит жаб
(BIO_PUDDLE_SPRITES в src/game.js).

    python tools/make_bio_puddle_sprites.py
"""
import os
from PIL import Image

SRC = 'blender_assets/puddle_concepts'
DST = 'assets/sprites/props'
NAMES = ['bio_puddle_eggs', 'bio_puddle_vents', 'bio_puddle_pod']
OUT_W = 256


def process(name):
    im = Image.open(os.path.join(SRC, f'{name}_concept.png')).convert('RGB')
    w, h = im.size
    px = im.load()
    bg = px[4, 4]

    # Слизь: заметно зелёная
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if g > 90 and g > r + 25 and g > b + 25:
                xs.append(x)
                ys.append(y)
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    rx = (max(xs) - min(xs)) / 2 * 1.05
    ry = (max(ys) - min(ys)) / 2 * 1.05

    out = Image.new('RGBA', (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            # фон: близко к серому фону и почти без цвета
            dbg = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
            sat = max(r, g, b) - min(r, g, b)
            a_bg = 1.0 if (dbg > 60 or sat > 30) else max(0.0, (dbg - 24) / 36)
            # растворение асфальта вокруг слизи
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            d = d ** 0.5
            a_fall = max(0.0, min(1.0, (1.32 - d) / 0.42))
            # асфальт вокруг слизи темнее — светлый на тёмной земле гнезда читался бы как плита
            if not (g > 90 and g > r + 25 and g > b + 25):
                r, g, b = int(r * 0.7), int(g * 0.7), int(b * 0.7)
            op[x, y] = (r, g, b, int(255 * min(a_bg, a_fall)))

    bbox = out.getbbox()
    out = out.crop(bbox)
    k = OUT_W / out.width
    out = out.resize((OUT_W, round(out.height * k)), Image.LANCZOS)
    os.makedirs(DST, exist_ok=True)
    path = os.path.join(DST, f'{name}.webp')
    out.save(path, 'WEBP', quality=85, method=6)
    # слизь в долях спрайта: центр и полуоси
    fcx = (cx - bbox[0]) / (bbox[2] - bbox[0])
    fcy = (cy - bbox[1]) / (bbox[3] - bbox[1])
    frx = rx / (bbox[2] - bbox[0])
    fry = ry / (bbox[3] - bbox[1])
    print(f"{name}: {out.size}, {os.path.getsize(path) // 1024} KB, "
          f"слизь: cx {fcx:.3f} cy {fcy:.3f} rx {frx:.3f} ry {fry:.3f}, аспект {out.height / out.width:.3f}")


if __name__ == '__main__':
    for n in NAMES:
        process(n)
