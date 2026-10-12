import os
import sys
import math
from PIL import Image, ImageFilter, ImageEnhance

ROOT = r"d:\pro1\vasiliy_vs_aliens"
BRAIN = r"C:\Users\p.dorohin\.gemini\antigravity\brain\b32c11b0-de23-4578-9171-2ad81046354d"
WEAPONS_SPRITE_DIR = os.path.join(ROOT, "assets", "sprites", "weapons")
LOOT_SPRITE_DIR = os.path.join(ROOT, "assets", "sprites", "loot")
CAT3_DIR = os.path.join(ROOT, "blender_assets", "cat3_concepts")

os.makedirs(WEAPONS_SPRITE_DIR, exist_ok=True)
os.makedirs(LOOT_SPRITE_DIR, exist_ok=True)


def remove_white_bg_and_add_shadow(src_path, dst_path, size=(160, 160), pad=10):
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    px = img.load()

    # Flood-fill from corners to remove pure/near-white studio background
    visited = set()
    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for x in range(0, w, 4):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(0, h, 4):
        stack.append((0, y))
        stack.append((w - 1, y))

    bg_mask = [[False] * h for _ in range(w)]
    while stack:
        cx, cy = stack.pop()
        if (cx, cy) in visited:
            continue
        visited.add((cx, cy))
        r, g, b, a = px[cx, cy]
        if a < 20 or (r > 236 and g > 236 and b > 236 and max(r, g, b) - min(r, g, b) < 18):
            bg_mask[cx][cy] = True
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    stack.append((nx, ny))

    for x in range(w):
        for y in range(h):
            if bg_mask[x][y]:
                px[x, y] = (0, 0, 0, 0)
            else:
                # Feather edge pixels next to background
                r, g, b, a = px[x, y]
                if r > 225 and g > 225 and b > 225:
                    nb_bg = 0
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= nx < w and 0 <= ny < h and bg_mask[nx][ny]:
                            nb_bg += 1
                    if nb_bg > 0:
                        px[x, y] = (r, g, b, int(a * 0.45))

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # Fit inside target size with padding
    tw, th = size[0] - pad * 2, size[1] - pad * 2
    iw, ih = img.size
    scale = min(tw / max(1, iw), th / max(1, ih))
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    img_resized = img.resize((nw, nh), Image.Resampling.LANCZOS)

    # Create subtle drop shadow like loot_vodka.png
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    alpha = img_resized.split()[3]
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sx = (size[0] - nw) // 2 + 3
    sy = (size[1] - nh) // 2 + 4
    shadow_layer = Image.new("RGBA", (nw, nh), (0, 0, 0, 155))
    shadow.paste(shadow_layer, (sx, sy), mask=alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=3.5))

    canvas = Image.alpha_composite(canvas, shadow)
    ox = (size[0] - nw) // 2
    oy = (size[1] - nh) // 2
    canvas.paste(img_resized, (ox, oy), mask=img_resized)
    canvas.save(dst_path, "PNG")
    print(f"[OK] Saved sprite {dst_path} ({os.path.getsize(dst_path)} bytes)")


def main():
    # 1. Process newly generated AI concepts
    bat_src = os.path.join(BRAIN, "weapon_bat_concept_1791806687029.jpg")
    makarov_src = os.path.join(BRAIN, "weapon_makarov_concept_1791806707785.jpg")
    mil_parts_src = os.path.join(BRAIN, "loot_mil_parts_concept_1791806726306.jpg")

    if os.path.exists(bat_src):
        remove_white_bg_and_add_shadow(bat_src, os.path.join(WEAPONS_SPRITE_DIR, "weapon_bat.png"), size=(160, 160), pad=10)
    if os.path.exists(makarov_src):
        remove_white_bg_and_add_shadow(makarov_src, os.path.join(WEAPONS_SPRITE_DIR, "weapon_makarov.png"), size=(160, 160), pad=12)
    if os.path.exists(mil_parts_src):
        remove_white_bg_and_add_shadow(mil_parts_src, os.path.join(LOOT_SPRITE_DIR, "loot_mil_parts.png"), size=(128, 128), pad=8)

    # 2. Process existing clean weapon concepts into assets/sprites/weapons/
    for w_name in ("weapon_shotgun", "weapon_drill", "weapon_plasma"):
        src = os.path.join(CAT3_DIR, f"{w_name}_clean.png")
        if os.path.exists(src):
            remove_white_bg_and_add_shadow(src, os.path.join(WEAPONS_SPRITE_DIR, f"{w_name}.png"), size=(160, 160), pad=10)


if __name__ == "__main__":
    main()


def finalize_rendered_transparent_icon(src_path, dst_path, size=(128, 128), pad=8):
    if not os.path.exists(src_path):
        return
    img = Image.open(src_path).convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    tw, th = size[0] - pad * 2, size[1] - pad * 2
    iw, ih = img.size
    scale = min(tw / max(1, iw), th / max(1, ih))
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    img_resized = img.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    alpha = img_resized.split()[3]
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sx = (size[0] - nw) // 2 + 3
    sy = (size[1] - nh) // 2 + 4
    shadow_layer = Image.new("RGBA", (nw, nh), (0, 0, 0, 165))
    shadow.paste(shadow_layer, (sx, sy), mask=alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=3.5))

    canvas = Image.alpha_composite(canvas, shadow)
    ox = (size[0] - nw) // 2
    oy = (size[1] - nh) // 2
    canvas.paste(img_resized, (ox, oy), mask=img_resized)
    canvas.save(dst_path, "PNG")
    try:
        os.remove(src_path)
    except OSError:
        pass
    print(f"[OK] Finalized {dst_path} ({os.path.getsize(dst_path)} bytes)")


if __name__ == "__main__":
    finalize_rendered_transparent_icon(
        os.path.join(LOOT_SPRITE_DIR, "loot_alien_core_raw.png"),
        os.path.join(LOOT_SPRITE_DIR, "loot_alien_core.png"),
        size=(128, 128),
        pad=8,
    )
    finalize_rendered_transparent_icon(
        os.path.join(LOOT_SPRITE_DIR, "ammo_9x18_raw.png"),
        os.path.join(LOOT_SPRITE_DIR, "ammo_9x18.png"),
        size=(128, 128),
        pad=8,
    )
    finalize_rendered_transparent_icon(
        os.path.join(LOOT_SPRITE_DIR, "ammo_12g_raw.png"),
        os.path.join(LOOT_SPRITE_DIR, "ammo_12g.png"),
        size=(128, 128),
        pad=8,
    )
