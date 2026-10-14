"""
Карты после босса: концепт из Gemini -> картинки для окна выбора карт (src/cards.js). Наборы (SETS):
  butcher — за Золотого Мясника: рубашка, «Скорость», «Ловкость», «Живучесть»
            (blender_assets/card_concepts/boss_cards_concept.png);
  pounder — за Межпространственного Долбильщика: «Лазерный бластер», «Рывок», «Гиперрегенерация»
            (blender_assets/card_concepts/pounder_cards_concept.png), рубашка общая.

Концепт — карты в ряд на белом фоне. Карты разделяются по белым вертикальным полосам,
каждая обрезается чуть внутрь (без скруглённых белых углов и тёмной рамки — рамку рисует CSS),
приводится к 2:3 и сохраняется в WebP.

    python tools/make_card_sprites.py [набор ...]   (без аргументов — все наборы)
"""
import os
import sys
from PIL import Image

SETS = {
    'butcher': ('blender_assets/card_concepts/boss_cards_concept.png',
                ['card_back', 'card_speed', 'card_agility', 'card_vitality']),
    'pounder': ('blender_assets/card_concepts/pounder_cards_concept.png',
                ['card_laser', 'card_dash', 'card_regen']),
}
DST = 'assets/cards'
INSET = 7            # px внутрь от края карты
OUT_W, OUT_H = 240, 360


def is_paper(p):
    return p[0] > 236 and p[1] > 236 and p[2] > 236


def spans(values, min_len):
    out, start = [], None
    for i, v in enumerate(values + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def make_set(src, names):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    px = im.load()
    cols = [sum(not is_paper(px[x, y]) for y in range(0, h, 3)) > h // 12 for x in range(w)]
    xs = spans(cols, 60)
    assert len(xs) == len(names), f'{src}: нашлось карт: {len(xs)}'
    os.makedirs(DST, exist_ok=True)
    # Концепт бывает крупнее (2752 px): отступ внутрь — в долях ширины, как у первого набора (7 px на 1024)
    inset = max(INSET, round(INSET * w / 1024))
    for name, (x0, x1) in zip(names, xs):
        rows = [sum(not is_paper(px[x, y]) for x in range(x0, x1, 2)) > (x1 - x0) // 6 for y in range(h)]
        y0, y1 = max(spans(rows, 60), key=lambda s: s[1] - s[0])
        card = im.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))
        # К 2:3: лишнее срезается поровну с краёв
        cw, ch = card.size
        if cw / ch > OUT_W / OUT_H:
            nw = round(ch * OUT_W / OUT_H)
            card = card.crop(((cw - nw) // 2, 0, (cw - nw) // 2 + nw, ch))
        else:
            nh = round(cw * OUT_H / OUT_W)
            card = card.crop((0, (ch - nh) // 2, cw, (ch - nh) // 2 + nh))
        card = card.resize((OUT_W, OUT_H), Image.LANCZOS)
        path = os.path.join(DST, name + '.webp')
        card.save(path, quality=88, method=6)
        print(path, (x1 - x0, y1 - y0))


def main():
    for key in sys.argv[1:] or SETS:
        make_set(*SETS[key])


if __name__ == '__main__':
    main()
