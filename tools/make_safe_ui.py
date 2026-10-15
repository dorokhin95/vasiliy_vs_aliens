"""
Окно сейфа (src/safes.js, index.html .safe-panel) из концептов Gemini -> assets/sprites/safe/:
  door_<тип>.webp — дверь под каждый тип сейфа, фон окна (под тёмной вуалью, чтобы читались цифры):
                    blender_assets/perk_concepts/safe_doors_concept.png — три двери в ряд, анфас;
  dial.png        — лимб с цифрами 0–9 (0 — сверху, по часовой), поворачивается к набранной цифре;
  lamp_<цвет>.png — лампочки подсказки: green — цифра на месте, yellow — есть, но не тут, off — нет:
                    blender_assets/perk_concepts/safe_dial_lamps_concept.png — лимб и три лампы в ряд.
Фон вырезается и предметы делятся так же, как у значков (tools/make_trophy_sprites.py).

    python tools/make_safe_ui.py
"""
import os
import sys

from PIL import Image, ImageChops

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_trophy_sprites import cut_background, split_items  # noqa: E402

SRC = 'blender_assets/perk_concepts/'
DST = 'assets/sprites/safe'
DOORS = ['door_cabinet', 'door_fireproof', 'door_vault']   # как SAFE_TYPES: safe_cabinet, safe_fireproof, safe_vault
DOOR_W = 300
PARTS = [('dial', 192), ('lamp_green', 48), ('lamp_yellow', 48), ('lamp_off', 48)]


def parts(src, n):
    rgba = cut_background(Image.open(src).convert('RGB'), enclosed=True)
    for mask in split_items(rgba, n):
        part = rgba.copy()
        part.putalpha(ImageChops.darker(rgba.getchannel('A'), mask))
        yield part.crop(part.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())


def main():
    os.makedirs(DST, exist_ok=True)
    # Двери: прямоугольник без полей, немного внутрь — края у концепта неровные
    for name, door in zip(DOORS, parts(SRC + 'safe_doors_concept.png', len(DOORS))):
        w, h = door.size
        inset = int(w * 0.02)
        door = door.crop((inset, inset, w - inset, h - inset)).convert('RGB')
        door = door.resize((DOOR_W, round(DOOR_W * door.height / door.width)), Image.LANCZOS)
        path = os.path.join(DST, name + '.webp')
        door.save(path, quality=82)
        print(path, door.size)
    # Лимб и лампы: квадрат по большей стороне; лампы — по общей (у горящих свечение шире, стекло — того же размера)
    cut = list(parts(SRC + 'safe_dial_lamps_concept.png', len(PARTS)))
    lamp_side = max(max(p.size) for p in cut[1:])
    for (name, size), part in zip(PARTS, cut):
        side = lamp_side if name.startswith('lamp_') else max(part.size)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2), part)
        sq = sq.resize((size, size), Image.LANCZOS)
        path = os.path.join(DST, name + '.png')
        sq.save(path, optimize=True)
        print(path, part.size)


if __name__ == '__main__':
    main()
