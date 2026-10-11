import os
from PIL import Image

def process_character_sheets():
    out_dir = "assets/sprites/vasiliy_clean"
    os.makedirs(out_dir, exist_ok=True)

    sources = {
        "side": "assets/sprites/vasiliy_spritesheet_raw.png",
        "up": "assets/sprites/vasiliy_walk_up_raw.png",
        "down": "assets/sprites/vasiliy_walk_down_raw.png"
    }

    TARGET_W = 256
    TARGET_H = 320

    for direction, path in sources.items():
        img = Image.open(path).convert('RGBA')
        W, H = img.size

        # Create precise alpha mask
        alpha = Image.new('L', (W, H))
        px = img.load()
        apx = alpha.load()
        for y in range(H):
            for x in range(W):
                r, g, b, a = px[x, y]
                # Smooth edge alpha threshold
                brightness = (r + g + b) / 3.0
                if brightness >= 248:
                    apx[x, y] = 0
                elif brightness <= 220:
                    apx[x, y] = 255
                else:
                    # Anti-aliased alpha transition for soft edges without white halos
                    norm = (248.0 - brightness) / (248.0 - 220.0)
                    apx[x, y] = int(norm * 255)

        img.putalpha(alpha)

        # Detect the 4 discrete character components across X
        col_counts = [sum(apx[x, y] > 0 for y in range(H)) for x in range(W)]
        in_char = False
        ranges = []
        start = 0
        for x in range(W):
            if col_counts[x] > 5 and not in_char:
                in_char = True
                start = x
            elif col_counts[x] <= 5 and in_char:
                in_char = False
                ranges.append((start, x))
        if in_char:
            ranges.append((start, W))

        print(f"[{direction}] Found {len(ranges)} character poses")

        for idx, (x1, x2) in enumerate(ranges[:4]):
            # Get bounding box for this specific character pose
            sub_alpha = alpha.crop((x1, 0, x2, H))
            bbox = sub_alpha.getbbox()
            if not bbox:
                continue

            char_y1 = bbox[1]
            char_y2 = bbox[3]
            char_crop = img.crop((x1, char_y1, x2, char_y2))

            # Canvas with consistent anchor at bottom center
            canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
            crop_w, crop_h = char_crop.size

            # Paste aligned so feet are anchored at bottom
            paste_x = (TARGET_W - crop_w) // 2
            paste_y = TARGET_H - crop_h - 15 # 15px bottom padding for feet

            canvas.paste(char_crop, (paste_x, paste_y), char_crop)
            out_filename = f"vasiliy_{direction}_{idx}.png"
            out_path = os.path.join(out_dir, out_filename)
            canvas.save(out_path)
            print(f"  Saved: {out_path} ({crop_w}x{crop_h} -> {TARGET_W}x{TARGET_H})")

    # Generate flipped side frames for left direction
    for idx in range(4):
        right_frame = Image.open(os.path.join(out_dir, f"vasiliy_side_{idx}.png"))
        left_frame = right_frame.transpose(Image.FLIP_LEFT_RIGHT)
        left_frame.save(os.path.join(out_dir, f"vasiliy_left_{idx}.png"))

    print("\nAll 4-directional flawless frames generated in assets/sprites/vasiliy_clean!")

if __name__ == "__main__":
    process_character_sheets()
