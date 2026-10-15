"""
Колея Промзоны (environment.js drawRails): концепт Gemini blender_assets/perk_concepts/rails_concept.png —
колея сверху, горизонтально, на всю ширину — -> бесшовная полоса assets/textures/rails_strip.png.

  - по ширине — кусок от промежутка между шпалами до такого же промежутка (X0..X1), конец плавно
    перетекает в начало (FADE px), так полоса повторяется без шва;
  - по высоте — насыпь целиком (Y0..Y1), края в прозрачность: полоса ложится на любую землю;
  - вдвое крупнее, чем на экране: на экране насыпь BED = 70 px, рельсы через 30 px (как рисовал код).

    python tools/make_rails_texture.py
"""
from PIL import Image

SRC = 'blender_assets/perk_concepts/rails_concept.png'
DST = 'assets/textures/rails_strip.png'
X0, X1 = 312, 1270      # середины промежутков между шпалами
FADE = 24
Y0, Y1 = 85, 760        # насыпь с краем земли
EDGE = 0.1              # доля высоты, которая уходит в прозрачность сверху и снизу
OUT_H = 140             # 2 × BED


def main():
    src = Image.open(SRC).convert('RGB').crop((0, Y0, Image.open(SRC).width, Y1))
    h = src.height
    tile = src.crop((X0, 0, X1, h))
    tail = src.crop((X1, 0, X1 + FADE, h))
    head = tile.crop((0, 0, FADE, h))
    ramp = Image.linear_gradient('L').rotate(-90, expand=True).resize((FADE, h))   # 255 слева -> 0 справа
    tile.paste(Image.composite(tail, head, ramp), (0, 0))
    alpha = Image.new('L', tile.size, 255)
    edge = int(h * EDGE)
    for y in range(edge):
        v = int(255 * y / edge)
        alpha.paste(v, (0, y, tile.width, y + 1))
        alpha.paste(v, (0, h - 1 - y, tile.width, h - y))
    out = tile.convert('RGBA')
    out.putalpha(alpha)
    out = out.resize((round(tile.width * OUT_H / h), OUT_H), Image.LANCZOS)
    out.save(DST, optimize=True)
    print(DST, out.size)


if __name__ == '__main__':
    main()
