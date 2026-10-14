"""
Концепт из Gemini (объект на чисто белом фоне) -> PNG с прозрачным фоном для генератора 3D.

Белый фон, связанный с краями картинки, становится прозрачным (заливка от краёв, а не по всему
кадру: белые детали внутри объекта остаются), картинка обрезается по объекту и уменьшается
до 1024 px по длинной стороне. Тяжёлая нейросеть удаления фона в Colab после этого не нужна.

    python tools/prep_concept_alpha.py <концепт.jpg> <выход.png> [max_side]
"""
import sys
from collections import deque

from PIL import Image, ImageFilter


def white_to_alpha(im, threshold=236):
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)

    def is_white(x, y):
        r, g, b = px[x, y]
        return r >= threshold and g >= threshold and b >= threshold

    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_white(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_white(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and is_white(nx, ny):
                bg[ny * w + nx] = 1
                queue.append((nx, ny))

    alpha = Image.frombytes('L', (w, h), bytes(0 if v else 255 for v in bg))
    # Мягкий край в 1 px, чтобы на силуэте не осталось белой бахромы
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def main():
    src, dst = sys.argv[1:3]
    max_side = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
    im = white_to_alpha(Image.open(src))
    box = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if box:
        pad = 16
        im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad),
                      min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    im.save(dst)
    print(dst, im.size)


if __name__ == '__main__':
    main()
