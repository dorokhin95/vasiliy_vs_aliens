import os
import cv2
import numpy as np
from PIL import Image

RAW_DIR = r"C:\Users\p.dorohin\.gemini\antigravity\brain\b32c11b0-de23-4578-9171-2ad81046354d\.user_uploaded"
CONCEPT_DIR = r"d:\pro1\vasiliy_vs_aliens\blender_assets\cat3_concepts"
SPRITE_DIR = r"d:\pro1\vasiliy_vs_aliens\assets\sprites\props"
TEX_DIR = r"d:\pro1\vasiliy_vs_aliens\assets\textures"

PROPS = [
    {
        'id': 'street_lamp',
        'src': os.path.join(RAW_DIR, 'media_1791805033359_348a545e.png'),
        'sprite': os.path.join(SPRITE_DIR, 'street_lamp.png'),
        'size': (96, 192),
        'is_foliage': False,
        'is_tree_trunk': False,
        'dusk_tint': 0.88,
    },
    {
        'id': 'courtyard_bench',
        'src': os.path.join(RAW_DIR, 'media_1791805056638_b0eeec14.png'),
        'sprite': os.path.join(SPRITE_DIR, 'courtyard_bench.png'),
        'size': (96, 64),
        'is_foliage': False,
        'is_tree_trunk': False,
        'dusk_tint': 0.86,
    },
    {
        'id': 'small_trash_bin',
        'src': os.path.join(RAW_DIR, 'media_1791805146973_698f64f9.png'),
        'sprite': os.path.join(SPRITE_DIR, 'small_trash_bin.png'),
        'size': (54, 54),
        'is_foliage': False,
        'is_tree_trunk': False,
        'dusk_tint': 0.86,
    },
    {
        'id': 'autumn_tree_1',
        'src': os.path.join(RAW_DIR, 'media_1791805180011_77900247.png'),
        'sprite': os.path.join(SPRITE_DIR, 'autumn_tree_1.png'),
        'size': (168, 196),
        'is_foliage': True,
        'is_tree_trunk': True,
        'dusk_tint': 0.88,
    },
    {
        'id': 'autumn_tree_2',
        'src': os.path.join(RAW_DIR, 'media_1791805209542_65abc233.png'),
        'sprite': os.path.join(SPRITE_DIR, 'autumn_tree_2.png'),
        'size': (188, 176),
        'is_foliage': True,
        'is_tree_trunk': True,
        'dusk_tint': 0.88,
    },
    {
        'id': 'courtyard_bush',
        'src': os.path.join(RAW_DIR, 'media_1791805243819_246a6958.png'),
        'sprite': os.path.join(SPRITE_DIR, 'courtyard_bush.png'),
        'size': (92, 74),
        'is_foliage': True,
        'is_tree_trunk': False,
        'dusk_tint': 0.86,
    },
    {
        'id': 'courtyard_bush_2',
        'src': os.path.join(RAW_DIR, 'media_1791805272556_7f320976.png'),
        'sprite': os.path.join(SPRITE_DIR, 'courtyard_bush_2.png'),
        'size': (88, 72),
        'is_foliage': True,
        'is_tree_trunk': False,
        'dusk_tint': 0.86,
    },
]

def clean_and_make_sprite(item):
    os.makedirs(CONCEPT_DIR, exist_ok=True)
    os.makedirs(SPRITE_DIR, exist_ok=True)

    im = Image.open(item['src']).convert('RGBA')
    arr = np.array(im)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].copy()

    # 1. Exterior flood-fill from all 4 borders with FIXED_RANGE so it only removes pure white background (#FFFFFF)
    flood_img = rgb.copy()
    mask = np.zeros((h + 2, w + 2), np.uint8)
    tol = (12, 12, 12)
    ff_flags = 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE

    for x in range(0, w, 4):
        if np.all(flood_img[0, x] > 242):
            cv2.floodFill(flood_img, mask, (x, 0), (255, 0, 255), tol, tol, flags=ff_flags)
        if np.all(flood_img[h - 1, x] > 242):
            cv2.floodFill(flood_img, mask, (x, h - 1), (255, 0, 255), tol, tol, flags=ff_flags)
    for y in range(0, h, 4):
        if np.all(flood_img[y, 0] > 242):
            cv2.floodFill(flood_img, mask, (0, y), (255, 0, 255), tol, tol, flags=ff_flags)
        if np.all(flood_img[y, w - 1] > 242):
            cv2.floodFill(flood_img, mask, (w - 1, y), (255, 0, 255), tol, tol, flags=ff_flags)

    bg_mask = (mask[1:-1, 1:-1] == 255)

    # 2. Remove interior white holes between branches/slats while protecting whitewashed tree trunks
    r, g, b = rgb[:, :, 0].astype(np.float32), rgb[:, :, 1].astype(np.float32), rgb[:, :, 2].astype(np.float32)
    luma = (r + g + b) / 3.0
    sat = (np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) / (np.maximum(np.maximum(r, g), b) + 1e-5)

    if item['is_foliage']:
        if item['is_tree_trunk']:
            yy = np.arange(h)[:, None]
            upper_zone = (yy < int(h * 0.65))
            interior_white = upper_zone & (luma > 236.0) & (sat < 0.06)
        else:
            # Bush has no whitewashed trunk, remove all interior white holes between twigs
            interior_white = (luma > 232.0) & (sat < 0.06)
        bg_mask = bg_mask | interior_white
    elif item['id'] in ('courtyard_bench', 'street_lamp', 'small_trash_bin'):
        interior_white = (luma > 246.0) & (sat < 0.03)
        bg_mask = bg_mask | interior_white

    fg_mask = (~bg_mask).astype(np.uint8) * 255
    if not item['is_foliage']:
        kernel = np.ones((3, 3), np.uint8)
        fg_mask = cv2.erode(fg_mask, kernel, iterations=1)
        alpha = cv2.GaussianBlur(fg_mask.astype(np.float32), (3, 3), 0)
    else:
        max_y = int(h * 0.65) if item['is_tree_trunk'] else h
        edge_white = (luma > 215.0) & (sat < 0.07) & (np.arange(h)[:, None] < max_y)
        alpha = fg_mask.astype(np.float32)
        alpha[edge_white] *= np.clip((245.0 - luma[edge_white]) / 30.0, 0.0, 1.0)

    tint = item.get('dusk_tint', 0.88)
    rgb_f = rgb.astype(np.float32) * tint
    edge_zone = (alpha > 0) & (alpha < 235)
    rgb_f[edge_zone] *= 0.70
    rgb_out = np.clip(rgb_f, 0, 255).astype(np.uint8)

    ys, xs = np.where(alpha > 15)
    pad = 8
    x1, x2 = max(0, xs.min() - pad), min(w, xs.max() + pad)
    y1, y2 = max(0, ys.min() - pad), min(h, ys.max() + pad)

    cropped = np.dstack([rgb_out, np.clip(alpha, 0, 255).astype(np.uint8)])[y1:y2, x1:x2]
    clean_path = os.path.join(CONCEPT_DIR, f"{item['id']}_clean.png")
    Image.fromarray(cropped).save(clean_path)

    tw, th = item['size']
    clean_im = Image.fromarray(cropped)
    avail_w, avail_h = int(tw * 0.92), int(th * 0.92)
    scale = min(avail_w / clean_im.width, avail_h / clean_im.height)
    nw, nh = max(1, int(clean_im.width * scale)), max(1, int(clean_im.height * scale))
    resized = clean_im.resize((nw, nh), Image.Resampling.LANCZOS)
    rarr = np.array(resized)

    canvas = np.zeros((th, tw, 4), dtype=np.uint8)
    ox = (tw - nw) // 2
    oy = (th - nh) // 2

    sh_alpha = np.zeros((th, tw), dtype=np.float32)
    sx = min(tw - nw, ox + 4)
    sy = min(th - nh, oy + 5)
    sh_alpha[sy:sy+nh, sx:sx+nw] = rarr[:, :, 3].astype(np.float32) * 0.45
    sh_alpha = cv2.GaussianBlur(sh_alpha, (11, 11), 0)

    canvas[:, :, 0] = 6
    canvas[:, :, 1] = 8
    canvas[:, :, 2] = 12
    canvas[:, :, 3] = np.clip(sh_alpha, 0, 255).astype(np.uint8)

    fg = rarr.astype(np.float32)
    bg = canvas[oy:oy+nh, ox:ox+nw].astype(np.float32)
    fa = fg[:, :, 3:4] / 255.0
    ba = bg[:, :, 3:4] / 255.0
    out_a = fa + ba * (1.0 - fa)
    out_rgb = np.where(out_a > 1e-5, (fg[:, :, :3] * fa + bg[:, :, :3] * ba * (1.0 - fa)) / (out_a + 1e-5), 0.0)
    canvas[oy:oy+nh, ox:ox+nw] = np.dstack([np.clip(out_rgb, 0, 255).astype(np.uint8), np.clip(out_a * 255.0, 0, 255).astype(np.uint8)])

    Image.fromarray(canvas).save(item['sprite'])
    print(f"[{item['id']}] Saved clean={cropped.shape[1]}x{cropped.shape[0]} -> sprite={item['sprite']} ({tw}x{th})")

def process_uploaded_asphalt():
    src = os.path.join(RAW_DIR, 'media_1791805304928_44fab0f6.jpg')
    if not os.path.exists(src):
        return
    im = Image.open(src).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
    arr = np.array(im, dtype=np.float32)
    # Apply subtle dusk road grading (slightly darker wet charcoal tone so cars/characters/loot pop)
    arr *= np.array([0.62, 0.65, 0.70], dtype=np.float32)
    out = np.clip(arr, 0, 255).astype(np.uint8)
    os.makedirs(TEX_DIR, exist_ok=True)
    out_path = os.path.join(TEX_DIR, 'asphalt_road.png')
    Image.fromarray(out).save(out_path)
    print(f"[asphalt_road] Processed uploaded asphalt texture -> {out_path}")

if __name__ == '__main__':
    for item in PROPS:
        clean_and_make_sprite(item)
    process_uploaded_asphalt()
