"""
Выжившие Промзоны: 2D-спрайты из листа docs/comic_refs/survivors_comic_sheet.webp -> assets/sprites/survivors/.

Пока нет 3D-моделей (арт А4), выжившие в игре — плоские фигуры из листа. Чтобы они двигались живо,
src/defense.js рисует каждую фигуру по частям: корпус и две ноги, ноги качаются от бедра. Поэтому скрипт
кроме картинки печатает для каждого: долю высоты, где бедро, долю ширины, где щель между ногами, и где
дуло оружия — эти числа переносятся в SURVIVORS (src/defense.js).

Фон листа — ровный серый: убирается заливкой от краёв кадра (контур персонажа её останавливает, серые
сапоги не страдают). Степаныч и Зина стоят вплотную, ствол двустволки лежит поверх пальто Зины: в полосе
наложения Степанычу достаётся только не-синее (ствол), Зине — только синее (пальто).

    python tools/make_survivor_sprites.py
"""
import os
from collections import deque

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'docs', 'comic_refs', 'survivors_comic_sheet.webp')
OUT = os.path.join(ROOT, 'assets', 'sprites', 'survivors')
HEIGHT = 192           # px спрайта; в игре рисуется вдвое меньше — чётко и на крупном экране
K = 2752 / 2000        # координаты ниже сняты с листа, показанного шириной 2000

# id: (x1, x2 кадра на листе шириной 2000; дуло (x, y) на том же листе или None; доля высоты бедра)
CHARS = {
    'stepanych': ((55, 742), (720, 548), 0.58),
    'zina': ((538, 910), (655, 792), 0.64),
    'tolik': ((912, 1300), (1062, 705), 0.58),
    'lena': ((1298, 1622), None, 0.64),
    'seryoga': ((1622, 1960), None, 0.57),
}
# Ствол двустволки Степаныча поверх пальто Зины: осевая линия и полутолщина (лист шириной 2000)
BARREL = ((536, 501), (724, 551), 19)
ZINA_LEFT = 538


def is_bg(c):
    # Фон и мягкие тени под ногами — серые без оттенка
    r, g, b = c[:3]
    return abs(r - g) < 10 and abs(g - b) < 10 and 30 < r < 98


def barrel_dist(gx, gy):
    """Расстояние от точки листа (полный размер) до оси ствола и где на нём проекция (0..1)."""
    (ax, ay), (bx, by), _ = BARREL
    ax, ay, bx, by = ax * K, ay * K, bx * K, by * K
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((gx - ax) * dx + (gy - ay) * dy) / (dx * dx + dy * dy)))
    return ((gx - ax - dx * t) ** 2 + (gy - ay - dy * t) ** 2) ** 0.5, t


def cut(img, cid, x1, x2):
    W, H = img.size
    a, b = int(x1 * K), min(W, int(x2 * K))
    crop = img.crop((a, 0, b, H)).convert('RGBA')
    w, h = crop.size
    px = crop.load()
    bg = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(px[x, y]):
                bg[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(px[x, y]) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and is_bg(px[nx, ny]):
                bg[ny * w + nx] = 1
                q.append((nx, ny))
    zl = int(ZINA_LEFT * K)
    half = BARREL[2] * K
    orig = crop.copy().load()
    for y in range(h):
        for x in range(w):
            if bg[y * w + x]:
                px[x, y] = (0, 0, 0, 0)
                continue
            gx = x + a
            if gx < zl:
                continue
            d, t = barrel_dist(gx, y)
            on_barrel = d < half and 0 < t <= 1
            if cid == 'stepanych' and not on_barrel:
                px[x, y] = (0, 0, 0, 0)            # правее его плеча — Зина, кроме самого ствола
            elif cid == 'zina' and on_barrel:
                # Латаем пальто под стволом: берём цвет прямо над стволом; там фон — значит, вне Зины
                # (на краю рукава сверху фон — тогда берём снизу)
                above = int(y - (half - d) - half - 3)
                below = int(y + (half - d) + half + 3)
                if 0 <= above and not bg[above * w + x]:
                    px[x, y] = orig[x, above]
                elif below < h and not bg[below * w + x]:
                    px[x, y] = orig[x, below]
                else:
                    px[x, y] = (0, 0, 0, 0)
    return crop, a


def legs_gap(img, hip_frac):
    """Щель между ногами: самый пустой столбец между двумя самыми заполненными (ногами) ниже колен."""
    w, h = img.size
    a = img.getchannel('A').load()
    y0 = int(h * max(hip_frac + 0.12, 0.78))
    cov = [sum(1 for y in range(y0, h) if a[x, y] > 40) for x in range(w)]
    # Только в пределах ног: двустволка Степаныча делает кадр шире фигуры
    xs = [x for x in range(w) if cov[x] > 0]
    lo, hi = xs[0], xs[-1]
    mid = range(lo + int((hi - lo) * 0.3), lo + int((hi - lo) * 0.7) + 1)
    gap = min(mid, key=lambda x: cov[x])
    return gap / w


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(SRC).convert('RGB')
    for cid, ((x1, x2), muzzle, hip) in CHARS.items():
        crop, a = cut(sheet, cid, x1, x2)
        bbox = crop.getbbox()
        crop = crop.crop(bbox)
        s = HEIGHT / crop.height
        spr = crop.resize((max(1, round(crop.width * s)), HEIGHT), Image.LANCZOS)
        spr.save(os.path.join(OUT, cid + '.webp'), 'WEBP', quality=90)
        gap = legs_gap(spr, hip)
        mz = None
        if muzzle:
            mx = (muzzle[0] * K - a - bbox[0]) / crop.width
            my = (muzzle[1] * K - bbox[1]) / crop.height
            mz = (round(mx, 3), round(my, 3))
        print(f"{cid}: {spr.size[0]}x{spr.size[1]}, hip {hip}, legsGap {gap:.3f}, muzzle {mz}")


if __name__ == '__main__':
    main()
