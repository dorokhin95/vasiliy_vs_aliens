from PIL import Image
import os

RAW_PATH = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy_spritesheet_raw.png"
OUT_DIR = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy"

raw = Image.open(RAW_PATH).convert("RGBA")
W, H = raw.size

# Координаты центров каждого Василия в исходном изображении
# Frame 0: X ~ 170..325
# Frame 1: X ~ 420..580
# Frame 2: X ~ 680..850
# Frame 3: X ~ 920..1015 (у 3-го кадра дуло прижато ближе к телу)

frame_boxes = [
    (30, 160, 325, 480),   # Захватываем длинное дуло 1-го кадра вплоть до x=325!
    (290, 160, 580, 480),  # Дуло 2-го кадра до x=580
    (540, 160, 850, 480),  # Дуло 3-го кадра до x=850
    (780, 160, 1024, 480)  # 4-й кадр
]

for i, box in enumerate(frame_boxes):
    sub = raw.crop(box)
    sw, sh = sub.size
    pix = sub.load()
    
    # 1. Удаляем чистый белый фон
    for x in range(sw):
        for y in range(sh):
            r, g, b, a = pix[x, y]
            if r > 230 and g > 230 and b > 230:
                pix[x, y] = (255, 255, 255, 0)
                
    # 2. Оставляем только фигуру текущего Василия (отсекаем край локтя следующего персонажа справа)
    # Находим связную маску Василия от центра
    non_transparent = [(x, y) for x in range(sw) for y in range(sh) if pix[x, y][3] > 0]
    
    # Фильтруем: исключаем ошметки слева и справа
    filtered_pixels = []
    for (x, y) in non_transparent:
        # Исключаем ошметок локтя/плеча следующего кадра справа внизу
        if x > sw - 45 and y < 220:
            pix[x, y] = (255, 255, 255, 0)
            continue
        filtered_pixels.append((x, y))
        
    min_x = min(p[0] for p in filtered_pixels)
    max_x = max(p[0] for p in filtered_pixels)
    min_y = min(p[1] for p in filtered_pixels)
    max_y = max(p[1] for p in filtered_pixels)
    
    clean_crop = Image.new("RGBA", (max_x - min_x + 1, max_y - min_y + 1), (0, 0, 0, 0))
    clean_pix = clean_crop.load()
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            clean_pix[x - min_x, y - min_y] = pix[x, y]
            
    # Центрируем на просторном полотне 200x200
    CANVAS_SIZE = 200
    square = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    target_h = 160
    scale = target_h / clean_crop.height
    target_w = int(clean_crop.width * scale)
    scaled = clean_crop.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    offset_x = (CANVAS_SIZE - target_w) // 2
    offset_y = (CANVAS_SIZE - target_h) // 2
    square.paste(scaled, (offset_x, offset_y), scaled)
    
    target_path = os.path.join(OUT_DIR, f"vasiliy_walk_{i}.png")
    square.save(target_path)
    print(f"Frame {i} with FULL shotgun barrel saved! Width: {target_w}")

print("Shotgun barrel fully restored!")
