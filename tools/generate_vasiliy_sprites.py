import os
from PIL import Image, ImageDraw

OUTPUT_DIR = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Палитра Darkest Dungeon / Disco Elysium
PALETTE = {
    "outline": (15, 23, 42, 255),       # Жирный темный чернильный контур
    "outline_light": (30, 41, 59, 255),
    "skin": (224, 175, 140, 255),       # Обветренная кожа
    "beard": (148, 163, 184, 255),      # Седая борода
    "ushanka": (120, 53, 15, 255),      # Коричневая ушанка
    "ushanka_dark": (69, 26, 3, 255),
    "star": (220, 38, 38, 255),         # Красная звезда
    "coat": (71, 85, 105, 255),         # Стеганая советская фуфайка
    "coat_dark": (30, 41, 59, 255),
    "boots": (15, 23, 42, 255),         # Кирзовые сапоги
    "pipe_metal": (148, 163, 184, 255), # Ржавая труба
    "blue_tape": (37, 99, 235, 255),    # Синяя советская изолента
    "spark": (56, 189, 248, 255),       # Электроискры
}

def create_base_canvas():
    return Image.new("RGBA", (128, 128), (0, 0, 0, 0))

# 1. ГЕНЕРАЦИЯ АНИМАЦИИ ХОДЬБЫ (Walk Cycle - 4 кадра: idle, step1, idle2, step2)
for frame_idx, (bob, leg_l, leg_r, arm_swing) in enumerate([
    (0, 0, 0, 0),         # Idle
    (2, 6, -6, 4),        # Шаг левой
    (0, 0, 0, 0),         # Фаза перехода
    (2, -6, 6, -4)        # Шаг правой
]):
    img = create_base_canvas()
    d = ImageDraw.Draw(img)
    cx, cy = 64, 64 + bob

    # Кирзовые сапоги (ноги снизу)
    # Левая нога
    d.ellipse([cx - 20, cy + 18 + leg_l, cx - 6, cy + 32 + leg_l], fill=PALETTE["boots"], outline=PALETTE["outline"], width=3)
    # Правая нога
    d.ellipse([cx + 6, cy + 18 + leg_r, cx + 20, cy + 32 + leg_r], fill=PALETTE["boots"], outline=PALETTE["outline"], width=3)

    # Тело: ватная фуфайка со стегаными швами
    d.ellipse([cx - 24, cy - 20, cx + 24, cy + 24], fill=PALETTE["coat"], outline=PALETTE["outline"], width=4)
    # Стеганые полосы фуфайки
    d.line([cx - 14, cy - 14, cx - 14, cy + 18], fill=PALETTE["coat_dark"], width=2)
    d.line([cx + 14, cy - 14, cx + 14, cy + 18], fill=PALETTE["coat_dark"], width=2)
    d.line([cx, cy - 18, cx, cy + 20], fill=PALETTE["outline"], width=3) # Замок/пуговицы

    # Голова и ушанка (вид сверху/2.5D)
    # Лицо и седая борода
    d.ellipse([cx - 16, cy - 28, cx + 16, cy - 4], fill=PALETTE["skin"], outline=PALETTE["outline"], width=3)
    d.polygon([(cx - 14, cy - 16), (cx + 14, cy - 16), (cx, cy - 2)], fill=PALETTE["beard"], outline=PALETTE["outline"])

    # Шапка-ушанка
    d.rectangle([cx - 22, cy - 36, cx + 22, cy - 22], fill=PALETTE["ushanka"], outline=PALETTE["outline"], width=3)
    # Уши ушанки
    d.polygon([(cx - 24, cy - 32), (cx - 16, cy - 18), (cx - 26, cy - 18)], fill=PALETTE["ushanka_dark"], outline=PALETTE["outline"])
    d.polygon([(cx + 24, cy - 32), (cx + 16, cy - 18), (cx + 26, cy - 18)], fill=PALETTE["ushanka_dark"], outline=PALETTE["outline"])
    # Красная звезда на ушанке
    d.polygon([(cx, cy - 33), (cx + 3, cy - 26), (cx - 3, cy - 26)], fill=PALETTE["star"])

    # Левая рука
    d.ellipse([cx - 30, cy - 10 - arm_swing, cx - 18, cy + 6 - arm_swing], fill=PALETTE["coat"], outline=PALETTE["outline"], width=3)

    img.save(os.path.join(OUTPUT_DIR, f"vasiliy_walk_{frame_idx}.png"))

print("Walk sprites generated.")

# 2. ГЕНЕРАЦИЯ КАДРОВ ПЕРЕКАТА (Roll: 4 угла поворота)
for roll_idx, angle in enumerate([0, 90, 180, 270]):
    img = create_base_canvas()
    d = ImageDraw.Draw(img)
    cx, cy = 64, 64
    # Клубок фуфайки в перекате
    d.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], fill=(51, 65, 85, 255), outline=PALETTE["outline"], width=4)
    # Сапоги и ушанка мелькают при вращении
    d.ellipse([cx - 18, cy - 28, cx + 18, cy - 12], fill=PALETTE["ushanka"], outline=PALETTE["outline"], width=3)
    d.ellipse([cx - 14, cy + 10, cx + 14, cy + 26], fill=PALETTE["boots"], outline=PALETTE["outline"], width=3)
    # Поворачиваем изображение
    rotated = img.rotate(angle)
    rotated.save(os.path.join(OUTPUT_DIR, f"vasiliy_roll_{roll_idx}.png"))

print("Roll sprites generated.")

# 3. ОТДЕЛЬНЫЕ СЛОИ ОРУЖИЯ (Спрайты оружия на прозрачном фоне)
# А. Базовая шок-труба с изолентой
img_pipe = create_base_canvas()
dp = ImageDraw.Draw(img_pipe)
dp.rectangle([56, 30, 72, 94], fill=PALETTE["pipe_metal"], outline=PALETTE["outline"], width=3)
# Синяя изолента
dp.rectangle([55, 60, 73, 76], fill=PALETTE["blue_tape"], outline=PALETTE["outline"], width=2)
# Аккумуляторные контакты / зубцы
dp.polygon([(56, 30), (50, 18), (62, 24)], fill=(234, 179, 8, 255), outline=PALETTE["outline"])
dp.polygon([(72, 30), (78, 18), (66, 24)], fill=(234, 179, 8, 255), outline=PALETTE["outline"])
img_pipe.save(os.path.join(OUTPUT_DIR, "weapon_shock_pipe.png"))

# Б. Рука-Перфоратор (Киборг)
img_drill = create_base_canvas()
dd = ImageDraw.Draw(img_drill)
# Желтый строительный корпус
dd.rectangle([50, 50, 78, 92], fill=(234, 179, 8, 255), outline=PALETTE["outline"], width=3)
dd.rectangle([54, 70, 74, 86], fill=(30, 41, 59, 255), outline=PALETTE["outline"], width=2)
# Металлическое сверло/бур
dd.polygon([(64, 12), (52, 50), (76, 50)], fill=(148, 163, 184, 255), outline=PALETTE["outline"], width=3)
dd.line([(64, 14), (64, 48)], fill=(71, 85, 105, 255), width=3)
img_drill.save(os.path.join(OUTPUT_DIR, "weapon_cyber_drill.png"))

# В. Жабий Хлыст-Язык (Биомутация)
img_tongue = create_base_canvas()
dt = ImageDraw.Draw(img_tongue)
# Извивающийся розовый язык
dt.line([(64, 90), (60, 60), (74, 40), (64, 15)], fill=(236, 72, 153, 255), width=10)
dt.ellipse([56, 10, 72, 26], fill=(244, 114, 182, 255), outline=PALETTE["outline"], width=3)
# Капли ядовитой слизи
dt.ellipse([50, 35, 58, 43], fill=(132, 204, 22, 255))
dt.ellipse([70, 55, 76, 61], fill=(132, 204, 22, 255))
img_tongue.save(os.path.join(OUTPUT_DIR, "weapon_toad_tongue.png"))

# 4. СЛОИ ЭКИПИРОВКИ (СПИНА И ГОЛОВА)
# А. Аккумулятор от КАМАЗа (на спину)
img_batt = create_base_canvas()
db = ImageDraw.Draw(img_batt)
db.rectangle([40, 44, 88, 84], fill=(30, 41, 59, 255), outline=PALETTE["outline"], width=4)
# Ручка аккумулятора
db.line([(52, 44), (52, 34), (76, 34), (76, 44)], fill=(71, 85, 105, 255), width=4)
# Клеммы
db.rectangle([44, 38, 52, 44], fill=(239, 68, 68, 255), outline=PALETTE["outline"], width=2)
db.rectangle([76, 38, 84, 44], fill=(59, 130, 246, 255), outline=PALETTE["outline"], width=2)
img_batt.save(os.path.join(OUTPUT_DIR, "gear_car_battery.png"))

# Б. Советский Ковер (Плащ шамана)
img_carpet = create_base_canvas()
dc = ImageDraw.Draw(img_carpet)
dc.polygon([(44, 30), (84, 30), (96, 96), (32, 96)], fill=(153, 27, 27, 255), outline=PALETTE["outline"], width=4)
# Узоры ковра
dc.rectangle([46, 44, 82, 82], outline=(251, 191, 36, 255), width=3)
dc.polygon([(64, 48), (76, 63), (64, 78), (52, 63)], fill=(251, 191, 36, 255))
# Бахрома снизу
for fx in range(34, 96, 6):
    dc.line([(fx, 96), (fx, 104)], fill=(254, 240, 138, 255), width=2)
img_carpet.save(os.path.join(OUTPUT_DIR, "gear_soviet_carpet.png"))

# В. Призрачный Голубь Гена
img_pigeon = create_base_canvas()
dpig = ImageDraw.Draw(img_pigeon)
# Крылья и тело
dpig.ellipse([48, 50, 80, 78], fill=(148, 163, 184, 210), outline=PALETTE["outline"], width=3)
dpig.polygon([(30, 40), (54, 58), (44, 72)], fill=(203, 213, 225, 220), outline=PALETTE["outline"], width=2)
dpig.polygon([(98, 40), (74, 58), (84, 72)], fill=(203, 213, 225, 220), outline=PALETTE["outline"], width=2)
# Голова и клюв
dpig.ellipse([56, 38, 72, 54], fill=(71, 85, 105, 230), outline=PALETTE["outline"], width=2)
dpig.polygon([(62, 38), (66, 38), (64, 30)], fill=(245, 158, 11, 255))
img_pigeon.save(os.path.join(OUTPUT_DIR, "gear_ghost_pigeon.png"))

print("All Vasily sprite layers generated successfully!")
