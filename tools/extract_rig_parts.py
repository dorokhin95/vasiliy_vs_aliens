from PIL import Image
import os

RAW_PATH = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy_spritesheet_raw.png"
OUT_DIR = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy_rig"

raw = Image.open(RAW_PATH).convert("RGBA")
# Берем 1-го стоящего Василия (X: 30..325, Y: 160..480)
# Координаты внутри этого кропа для каждой кости:
# Голова+Ушанка: верх
# Торс+Фуфайка: центр
# Левая рука / Правая рука
# Нога левая / Нога правая
# Обрез/Оружие

col = raw.crop((40, 160, 320, 480))
cw, ch = col.size
pix = col.load()

# Удаляем белый фон
for x in range(cw):
    for y in range(ch):
        r, g, b, a = pix[x, y]
        if r > 230 and g > 230 and b > 230:
            pix[x, y] = (255, 255, 255, 0)

# Анатомические зоны костей (X, Y, W, H)
parts = {
    # 1. Голова и ушанка со звездой
    "head": (70, 10, 85, 75),
    # 2. Торс в фуфайке с ремнем
    "torso": (60, 75, 100, 95),
    # 3. Левая нога с сапогом
    "leg_left": (60, 160, 45, 110),
    # 4. Правая нога с сапогом
    "leg_right": (115, 160, 50, 110),
    # 5. Оружие: обрез с замотанным стволом
    "weapon_shotgun": (120, 100, 150, 60),
    # 6. Левая рука / плечо
    "arm_left": (45, 75, 45, 70),
    # 7. Сумка через плечо
    "bag": (50, 125, 45, 60)
}

for name, (px, py, pw, ph) in parts.items():
    part_img = col.crop((px, py, px + pw, py + ph))
    # Обрезаем лишнюю прозрачность
    bbox = part_img.getbbox()
    if bbox:
        clean_part = part_img.crop(bbox)
        clean_part.save(os.path.join(OUT_DIR, f"{name}.png"))
        print(f"Extracted bone part: {name} ({clean_part.size})")

print("All skeletal body parts extracted successfully!")
