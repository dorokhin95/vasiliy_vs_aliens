from PIL import Image
import os

OUT_DIR = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy"
UP_RAW = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy_walk_up_raw.png"
DOWN_RAW = r"c:\Users\Павел\Desktop\game_dev\vasiliy_vs_aliens\assets\sprites\vasiliy_walk_down_raw.png"

def slice_spritesheet(raw_path, prefix):
    raw = Image.open(raw_path).convert("RGBA")
    W, H = raw.size
    frame_w = W // 4

    for i in range(4):
        # Вырезаем столбец с запасом
        col = raw.crop((i * frame_w, 0, (i + 1) * frame_w, H))
        cw, ch = col.size
        pix = col.load()

        # 1. Удаляем фон
        for x in range(cw):
            for y in range(ch):
                r, g, b, a = pix[x, y]
                if r > 230 and g > 230 and b > 230:
                    pix[x, y] = (255, 255, 255, 0)

        # 2. Ищем пиксели тела
        non_transparent = [(x, y) for x in range(cw) for y in range(ch) if pix[x, y][3] > 0]
        body_pixels = [(x, y) for (x, y) in non_transparent if 20 < x < (cw - 15) and 160 < y < 480]

        if not body_pixels:
            body_pixels = non_transparent

        min_x = min(p[0] for p in body_pixels)
        max_x = max(p[0] for p in body_pixels)
        min_y = min(p[1] for p in body_pixels)
        max_y = max(p[1] for p in body_pixels)

        # Добавляем 2px запас
        min_x = max(0, min_x - 2)
        min_y = max(0, min_y - 2)
        max_x = min(cw, max_x + 2)
        max_y = min(ch, max_y + 2)

        clean_crop = col.crop((min_x, min_y, max_x, max_y))

        # Центрируем на квадратном полотне 200x200
        CANVAS_SIZE = 200
        square = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        target_h = 160
        scale = target_h / clean_crop.height
        target_w = int(clean_crop.width * scale)
        scaled = clean_crop.resize((target_w, target_h), Image.Resampling.LANCZOS)

        offset_x = (CANVAS_SIZE - target_w) // 2
        offset_y = (CANVAS_SIZE - target_h) // 2
        square.paste(scaled, (offset_x, offset_y), scaled)

        out_name = f"vasiliy_{prefix}_{i}.png"
        square.save(os.path.join(OUT_DIR, out_name))
        print(f"Saved: {out_name}")

print("Slicing UP frames (Back view)...")
slice_spritesheet(UP_RAW, "up")

print("Slicing DOWN frames (Front view)...")
slice_spritesheet(DOWN_RAW, "down")

print("All multidirectional walk cycles processed!")
