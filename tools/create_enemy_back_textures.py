import cv2
import numpy as np
from PIL import Image

def generate_noise(w, h, seed):
    np.random.seed(seed)
    n_large = cv2.resize(np.random.uniform(0.65, 1.35, (48, 48)).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
    n_med = cv2.resize(np.random.uniform(0.75, 1.25, (160, 160)).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
    n_fine = cv2.GaussianBlur(np.random.uniform(0.85, 1.15, (h, w)).astype(np.float32), (5, 5), 0)
    # Warty bumps (cellular Voronoi-like spots)
    bumps = np.zeros((h, w), dtype=np.float32)
    for _ in range(350):
        bx = np.random.randint(50, w - 50)
        by = np.random.randint(50, h - 50)
        br = np.random.randint(4, 14)
        cv2.circle(bumps, (bx, by), br, float(np.random.uniform(0.2, 0.6)), -1)
    bumps = cv2.GaussianBlur(bumps, (7, 7), 0)
    return (n_large * n_med * n_fine + bumps)

def generate_clean_back(enemy_id, front_path, back_path, config):
    im = Image.open(front_path)
    arr = np.array(im)
    base = cv2.flip(arr, 1)
    alpha = base[:, :, 3]
    rgb = base[:, :, :3].astype(np.float32)
    h, w, _ = rgb.shape

    ys, xs = np.where(alpha > 40)
    cx = int((xs.min() + xs.max()) / 2)
    top_y, bot_y = int(ys.min()), int(ys.max())
    char_h = bot_y - top_y
    char_w = xs.max() - xs.min()

    noise = generate_noise(w, h, config['seed'])

    base_skin = np.array(config['base_skin'], dtype=np.float32)
    dark_skin = np.array(config['dark_skin'], dtype=np.float32)
    high_skin = np.array(config['high_skin'], dtype=np.float32)

    Y, X = np.ogrid[:h, :w]
    dist_cx = np.abs(X - cx)

    # 3D Dome curvature shading (darker near edges)
    dome_shade = np.sqrt(np.maximum(0.25, 1.0 - (dist_cx / (char_w * 0.46 + 1e-5))**2))

    skin_canvas = np.zeros((h, w, 3), dtype=np.float32)
    for c in range(3):
        col = (dark_skin[c] * 0.35 + base_skin[c] * 0.50 * noise + high_skin[c] * 0.15 * (noise**1.4)) * dome_shade
        skin_canvas[:, :, c] = np.clip(col, 0, 255)

    torso_y_end = int(top_y + char_h * config['torso_ratio'])
    torso_w = char_w * config['torso_w_ratio']

    inside_torso = (Y >= top_y) & (Y < torso_y_end) & (dist_cx < torso_w)
    falloff = np.where(inside_torso, np.clip(1.2 - (dist_cx / torso_w) ** 2, 0, 1), 0.0).astype(np.float32)
    falloff = cv2.GaussianBlur(falloff, (21, 21), 0)
    falloff = np.where(alpha > 40, np.clip(falloff, 0, 1), 0.0)

    for c in range(3):
        rgb[:, :, c] = rgb[:, :, c] * (1.0 - falloff) + skin_canvas[:, :, c] * falloff

    # Spine vertebrae
    spine_start = int(top_y + char_h * 0.12)
    spine_end = int(top_y + char_h * 0.68)
    step = config.get('spine_step', 18)
    rad = config.get('spine_rad', 10)
    for y in range(spine_start, spine_end, step):
        if y < h and 0 <= cx < w and alpha[y, cx] > 40:
            cv2.circle(rgb, (cx, y), rad, (dark_skin * 0.8).tolist(), -1)
            cv2.circle(rgb, (cx, y), int(rad * 0.65), base_skin.tolist(), -1)
            cv2.circle(rgb, (cx, y - 2), int(rad * 0.35), high_skin.tolist(), -1)

    if enemy_id == 'toad_grunt':
        # Leather straps
        s_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.line(s_mask, (cx - 95, int(top_y + char_h * 0.22)), (cx + 105, int(top_y + char_h * 0.60)), 255, 16)
        cv2.line(s_mask, (cx + 95, int(top_y + char_h * 0.22)), (cx - 105, int(top_y + char_h * 0.60)), 255, 16)
        s_mask = cv2.bitwise_and(s_mask, s_mask, mask=(alpha > 40).astype(np.uint8))
        for c, val in enumerate([36, 30, 24]):
            rgb[:, :, c] = np.where(s_mask > 0, val * noise, rgb[:, :, c])
            
        cv2.circle(rgb, (cx, int(top_y + char_h * 0.41)), 16, (65, 58, 38), -1)
        cv2.circle(rgb, (cx, int(top_y + char_h * 0.41)), 10, (110, 95, 48), -1)

        # Back toxic canister tank
        cw, ch_can = 72, 135
        c_x1, c_x2 = cx - cw // 2, cx + cw // 2
        c_y1 = int(top_y + char_h * 0.18)
        c_y2 = c_y1 + ch_can
        
        can_Y, can_X = np.ogrid[c_y1 - 8 : c_y2 + 8, c_x1 - 4 : c_x2 + 4]
        rel_x = (can_X - cx) / float(cw / 2)
        valid_x = np.abs(rel_x) <= 1.0
        cyl_shade = np.where(valid_x, np.sqrt(np.maximum(0.04, 1.0 - rel_x**2)), 0.0)
        
        patch_rgb = rgb[c_y1 - 8 : c_y2 + 8, c_x1 - 4 : c_x2 + 4]
        patch_alpha = alpha[c_y1 - 8 : c_y2 + 8, c_x1 - 4 : c_x2 + 4] > 40
        for c, val in enumerate([56, 64, 58]):
            patch_rgb[:, :, c] = np.where(valid_x & patch_alpha, val * cyl_shade * 1.35, patch_rgb[:, :, c])
            
        hazard = np.abs(can_Y - (c_y1 + ch_can * 0.52)) < 11
        for c, val in enumerate([135, 118, 32]):
            patch_rgb[:, :, c] = np.where(valid_x & patch_alpha & hazard, val * cyl_shade, patch_rgb[:, :, c])
            
        dial = (np.abs(can_Y - (c_y1 + 35)) < 9) & (np.abs(can_X - (cx - 12)) < 9)
        for c, val in enumerate([35, 230, 85]):
            patch_rgb[:, :, c] = np.where(dial, val, patch_rgb[:, :, c])
            
        rgb[c_y1 - 8 : c_y2 + 8, c_x1 - 4 : c_x2 + 4] = patch_rgb
        cv2.rectangle(rgb, (c_x1 - 5, c_y1 + 22), (c_x2 + 5, c_y1 + 31), (28, 30, 32), -1)
        cv2.rectangle(rgb, (c_x1 - 5, c_y2 - 31), (c_x2 + 5, c_y2 - 22), (28, 30, 32), -1)

    elif enemy_id == 'toad_sniper':
        s_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.line(s_mask, (cx + 80, int(top_y + char_h * 0.16)), (cx - 75, int(top_y + char_h * 0.62)), 255, 14)
        s_mask = cv2.bitwise_and(s_mask, s_mask, mask=(alpha > 40).astype(np.uint8))
        for c, val in enumerate([28, 30, 24]):
            rgb[:, :, c] = np.where(s_mask > 0, val, rgb[:, :, c])
            
        pw, ph = 60, 85
        px1, px2 = cx - pw // 2, cx + pw // 2
        py1 = int(top_y + char_h * 0.30)
        py2 = py1 + ph
        cv2.rectangle(rgb, (px1, py1), (px2, py2), (42, 48, 36), -1)
        cv2.rectangle(rgb, (px1 - 2, py1 - 2), (px2 + 2, py2 + 2), (28, 32, 24), 2)
        cv2.line(rgb, (px1 + 8, int(top_y + char_h * 0.08)), (px1 + 8, py1), (20, 22, 24), 4)
        cv2.circle(rgb, (px1 + 8, int(top_y + char_h * 0.08)), 4, (140, 35, 220), -1)

    elif enemy_id == 'toad_brute':
        bracket_y1 = int(top_y + char_h * 0.28)
        bracket_y2 = bracket_y1 + 36
        bx1 = cx - 180
        bx2 = cx + 180
        b_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.rectangle(b_mask, (bx1, bracket_y1), (bx2, bracket_y2), 255, -1)
        b_mask = cv2.bitwise_and(b_mask, b_mask, mask=(alpha > 40).astype(np.uint8))
        for c, val in enumerate([88, 48, 32]):
            rgb[:, :, c] = np.where(b_mask > 0, val * noise, rgb[:, :, c])
            
        for rx in range(bx1 + 30, bx2 - 20, 45):
            cv2.circle(rgb, (rx, (bracket_y1 + bracket_y2) // 2), 6, (135, 108, 76), -1)
            cv2.circle(rgb, (rx, (bracket_y1 + bracket_y2) // 2), 3, (35, 22, 14), -1)

        pustules = [
            (cx - 70, int(top_y + char_h * 0.16), 13),
            (cx + 65, int(top_y + char_h * 0.18), 15),
            (cx - 45, int(top_y + char_h * 0.24), 16),
            (cx + 50, int(top_y + char_h * 0.25), 14),
            (cx - 85, int(top_y + char_h * 0.35), 11),
            (cx + 80, int(top_y + char_h * 0.37), 12),
        ]
        for px, py, pr in pustules:
            cv2.circle(rgb, (px, py), pr + 4, (35, 75, 18), -1)
            cv2.circle(rgb, (px, py), pr, (110, 195, 28), -1)
            cv2.circle(rgb, (px - 2, py - 2), pr // 2, (190, 235, 55), -1)

    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    out_arr = np.dstack([rgb, alpha])
    Image.fromarray(out_arr).save(back_path)
    print(f"[{enemy_id}] Saved clean back texture: {back_path}")

CONFIGS = {
    'toad_grunt': {
        'seed': 42,
        'base_skin': [65, 82, 48],
        'dark_skin': [38, 48, 28],
        'high_skin': [88, 112, 65],
        'torso_ratio': 0.65,
        'torso_w_ratio': 0.38,
        'spine_step': 16,
        'spine_rad': 9
    },
    'toad_sniper': {
        'seed': 137,
        'base_skin': [68, 75, 52],
        'dark_skin': [42, 48, 34],
        'high_skin': [88, 98, 70],
        'torso_ratio': 0.70,
        'torso_w_ratio': 0.42,
        'spine_step': 18,
        'spine_rad': 8
    },
    'toad_brute': {
        'seed': 999,
        'base_skin': [58, 72, 42],
        'dark_skin': [35, 44, 26],
        'high_skin': [78, 98, 56],
        'torso_ratio': 0.68,
        'torso_w_ratio': 0.44,
        'spine_step': 22,
        'spine_rad': 16
    }
}

if __name__ == "__main__":
    for eid, cfg in CONFIGS.items():
        front = f"assets/enemies/{eid}_perfect.png"
        back = f"assets/enemies/{eid}_back.png"
        generate_clean_back(eid, front, back, cfg)
