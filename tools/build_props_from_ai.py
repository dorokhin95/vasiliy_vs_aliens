import cv2
import numpy as np
from PIL import Image
import os
import subprocess

PROPS_CONFIG = {
    'car_zhiguli': {
        'raw': 'blender_assets/props_concepts/car_zhiguli_raw.png',
        'clean': 'blender_assets/props_concepts/car_zhiguli_clean.png',
        'obj': 'blender_assets/car_zhiguli_volumetric.obj',
        'glb': 'assets/models/car_zhiguli.glb',
        'sprite': 'assets/sprites/props/car_zhiguli.png',
        'width': 3.8,
        'height': 2.2,
        'thickness': 0.55,
        'render_w': 320,
        'render_h': 200,
    },
    'car_uaz': {
        'raw': 'blender_assets/props_concepts/car_uaz_raw.png',
        'clean': 'blender_assets/props_concepts/car_uaz_clean.png',
        'obj': 'blender_assets/car_uaz_volumetric.obj',
        'glb': 'assets/models/car_uaz.glb',
        'sprite': 'assets/sprites/props/car_uaz.png',
        'width': 4.0,
        'height': 2.6,
        'thickness': 0.65,
        'render_w': 320,
        'render_h': 220,
    },
    'trash_dumpster': {
        'raw': 'blender_assets/props_concepts/trash_dumpster_raw.png',
        'clean': 'blender_assets/props_concepts/trash_dumpster_clean.png',
        'obj': 'blender_assets/trash_dumpster_volumetric.obj',
        'glb': 'assets/models/trash_dumpster.glb',
        'sprite': 'assets/sprites/props/trash_dumpster.png',
        'width': 1.6,
        'height': 1.6,
        'thickness': 0.45,
        'render_w': 192,
        'render_h': 192,
    },
    'military_crate': {
        'raw': 'blender_assets/props_concepts/military_crate_raw.png',
        'clean': 'blender_assets/props_concepts/military_crate_clean.png',
        'obj': 'blender_assets/military_crate_volumetric.obj',
        'glb': 'assets/models/military_crate.glb',
        'sprite': 'assets/sprites/props/military_crate.png',
        'width': 1.5,
        'height': 1.0,
        'thickness': 0.35,
        'render_w': 192,
        'render_h': 140,
    }
}

def remove_white_bg_clean(raw_path, clean_path):
    """
    Removes solid white background using exterior flood-fill + smooth alpha ramp + edge color decontamination.
    Preserves internal white details (like the white circle around the red cross on UAZ or white stencil text).
    """
    im = Image.open(raw_path).convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.float32)
    h, w, _ = rgb.shape

    # Distance from pure white (255, 255, 255)
    dist_white = np.sqrt(np.sum((255.0 - rgb) ** 2, axis=2))

    # Candidate background pixels: very close to pure white
    bg_candidates = (dist_white < 28.0).astype(np.uint8)

    # Flood fill from all 4 corners so internal white details (e.g. UAZ cross circle, crate text) are untouched
    flood_mask = np.zeros((h + 2, w + 2), np.uint8)
    exterior_bg = np.zeros((h, w), np.uint8)

    for seed_x in [0, w - 1, w // 2]:
        for seed_y in [0, h - 1, h // 2]:
            if seed_x in (0, w - 1) or seed_y in (0, h - 1):
                if bg_candidates[seed_y, seed_x] > 0:
                    temp = bg_candidates.copy()
                    cv2.floodFill(temp, flood_mask, (seed_x, seed_y), 255)
                    exterior_bg = np.maximum(exterior_bg, (temp == 255).astype(np.uint8))

    # Smooth alpha at boundary of exterior_bg
    # Dilate exterior_bg by 2px to catch anti-aliased white fringe
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    boundary_zone = cv2.dilate(exterior_bg, kernel, iterations=1) - exterior_bg

    alpha = np.where(exterior_bg > 0, 0.0, 255.0).astype(np.float32)
    # In boundary zone, ramp alpha smoothly based on distance from white
    ramp = np.clip((dist_white - 12.0) / 45.0, 0.0, 1.0) * 255.0
    alpha = np.where(boundary_zone > 0, np.minimum(alpha, ramp), alpha)

    # Slight morphological cleanup of isolated 1px specks
    fg_bin = (alpha > 20).astype(np.uint8)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(fg_bin, connectivity=8)
    if num_labels > 1:
        largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        keep_mask = (labels == largest_label).astype(np.float32)
        alpha *= keep_mask

    # Decontaminate edge RGB (un-premultiply white from semi-transparent border pixels)
    edge_mask = (alpha > 5) & (alpha < 245)
    a_norm = np.clip(alpha / 255.0, 0.1, 1.0)
    for c in range(3):
        decontam = (rgb[:, :, c] - (1.0 - a_norm) * 255.0) / a_norm
        rgb[:, :, c] = np.where(edge_mask, np.clip(decontam, 0, 255), rgb[:, :, c])

    # Crop tightly around object with small padding
    ys, xs = np.where(alpha > 15)
    pad = 12
    x1 = max(0, xs.min() - pad)
    x2 = min(w, xs.max() + pad)
    y1 = max(0, ys.min() - pad)
    y2 = min(h, ys.max() + pad)

    out_rgba = np.dstack([rgb.astype(np.uint8), alpha.astype(np.uint8)])[y1:y2, x1:x2]
    Image.fromarray(out_rgba).save(clean_path)
    print(f"[Clean BG] Saved {clean_path} ({out_rgba.shape[1]}x{out_rgba.shape[0]})")
    return out_rgba

def create_back_texture(clean_path, back_path):
    """
    Generates a shaded rear/back texture (*_back.png) by mirroring the silhouette
    and applying 3D dome shading so the back side of the 3D mesh in Blender looks dark & weathered.
    """
    im = Image.open(clean_path).convert('RGBA')
    arr = np.array(im)
    flipped = cv2.flip(arr, 1)
    rgb = flipped[:, :, :3].astype(np.float32)
    alpha = flipped[:, :, 3]
    h, w, _ = rgb.shape

    ys, xs = np.where(alpha > 25)
    cx = (xs.min() + xs.max()) / 2.0
    obj_w = max(1.0, float(xs.max() - xs.min()))

    _, X = np.ogrid[:h, :w]
    dist_cx = np.abs(X - cx)
    dome_shade = np.sqrt(np.maximum(0.35, 1.0 - (dist_cx / (obj_w * 0.55)) ** 2))
    for c in range(3):
        rgb[:, :, c] = np.clip(rgb[:, :, c] * 0.78 * dome_shade, 0, 255)

    out = np.dstack([rgb.astype(np.uint8), alpha])
    Image.fromarray(out).save(back_path)
    print(f"[Back Tex] Saved {back_path}")

def generate_volumetric_obj(prop_id, cfg, grid_step=4):
    back_path = cfg['clean'].replace('_clean.png', '_back.png')
    create_back_texture(cfg['clean'], back_path)

    im = Image.open(cfg['clean']).convert('RGBA')
    w, h = im.size
    rgba = np.array(im)
    alpha = rgba[:, :, 3]
    rgb = rgba[:, :, :3]

    ys_active, xs_active = np.where(alpha > 25)
    min_x, max_x = xs_active.min(), xs_active.max()
    min_y, max_y = ys_active.min(), ys_active.max()

    obj_w = max_x - min_x
    obj_h = max_y - min_y
    center_x = (min_x + max_x) / 2.0

    mask = (alpha > 25).astype(np.uint8)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    max_d = dist.max()
    norm_dist = dist / (max_d + 1e-5)

    # Boxy/chamfered 3D volumetric profile suited for vehicles & props
    depth = np.clip(norm_dist * 1.8, 0.0, 1.0) ** 0.45

    # Luminance detail relief (panel seams, rust, ribs, headlights)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    gray_blur = cv2.GaussianBlur(gray, (15, 15), 0)
    high_freq = np.clip((gray - gray_blur) * 1.2, -0.18, 0.18)
    total_depth = np.clip(depth * 0.88 + high_freq * 0.12, 0.04, 1.0) * mask

    sub_mask = mask[::grid_step, ::grid_step]
    sub_depth = total_depth[::grid_step, ::grid_step]
    grid_h, grid_w = sub_mask.shape

    scale_x = cfg['width'] / float(obj_w)
    scale_z = cfg['height'] / float(obj_h)
    thickness = cfg['thickness']

    front_idx = np.full((grid_h, grid_w), -1, dtype=int)
    back_idx = np.full((grid_h, grid_w), -1, dtype=int)

    verts = []
    uvs_front = []
    v_count = 1

    for r in range(grid_h):
        for c in range(grid_w):
            if sub_mask[r, c] > 0:
                px = c * grid_step
                py = r * grid_step

                vx = (px - center_x) * scale_x
                vz = (max_y - py) * scale_z
                d = sub_depth[r, c]

                vy_front = -d * thickness
                vy_back = d * thickness * 0.65

                uf = px / float(w)
                vf = 1.0 - (py / float(h))

                front_idx[r, c] = v_count
                verts.append((vx, vy_front, vz))
                uvs_front.append((uf, vf))
                v_count += 1

                back_idx[r, c] = v_count
                verts.append((vx, vy_back, vz))
                v_count += 1

    front_faces = []
    back_faces = []
    rim_faces = []

    for r in range(grid_h - 1):
        for c in range(grid_w - 1):
            f_tl = front_idx[r, c]
            f_tr = front_idx[r, c + 1]
            f_bl = front_idx[r + 1, c]
            f_br = front_idx[r + 1, c + 1]

            b_tl = back_idx[r, c]
            b_tr = back_idx[r, c + 1]
            b_bl = back_idx[r + 1, c]
            b_br = back_idx[r + 1, c + 1]

            if f_tl != -1 and f_tr != -1 and f_bl != -1 and f_br != -1:
                front_faces.append((f_tl, f_bl, f_br, f_tr))
                back_faces.append((b_tl, b_tr, b_br, b_bl))
            else:
                if f_tl != -1 and f_bl != -1 and f_tr != -1:
                    front_faces.append((f_tl, f_bl, f_tr))
                    back_faces.append((b_tl, b_tr, b_bl))
                elif f_tr != -1 and f_bl != -1 and f_br != -1:
                    front_faces.append((f_tr, f_bl, f_br))
                    back_faces.append((b_tr, b_br, b_bl))
                elif f_tl != -1 and f_tr != -1 and f_br != -1:
                    front_faces.append((f_tl, f_br, f_tr))
                    back_faces.append((b_tl, b_tr, b_br))
                elif f_tl != -1 and f_bl != -1 and f_br != -1:
                    front_faces.append((f_tl, f_bl, f_br))
                    back_faces.append((b_tl, b_br, b_bl))

            if (f_tl != -1) != (f_tr != -1):
                if f_tl != -1 and f_bl != -1:
                    rim_faces.append((f_tl, b_tl, b_bl, f_bl))
                elif f_tr != -1 and f_br != -1:
                    rim_faces.append((f_tr, f_br, b_br, b_tr))
            if (f_tl != -1) != (f_bl != -1):
                if f_tl != -1 and f_tr != -1:
                    rim_faces.append((f_tl, f_tr, b_tr, b_tl))
                elif f_bl != -1 and f_br != -1:
                    rim_faces.append((f_bl, b_bl, b_br, f_br))

    obj_out = cfg['obj']
    with open(obj_out, 'w') as f:
        f.write(f"# Volumetric 3D mesh for {prop_id}\n")
        for vx, vy, vz in verts:
            f.write(f"v {vx:.5f} {vy:.5f} {vz:.5f}\n")
        for uf, vf in uvs_front:
            f.write(f"vt {uf:.5f} {vf:.5f}\n")
            f.write(f"vt {1.0 - uf:.5f} {vf:.5f}\n")

        f.write("usemtl Mat_Front\n")
        for face in front_faces:
            if len(face) == 4:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]} {face[3]}/{face[3]}\n")
            elif len(face) == 3:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]}\n")

        f.write("usemtl Mat_Back\n")
        for face in back_faces + rim_faces:
            if len(face) == 4:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]} {face[3]}/{face[3]}\n")
            elif len(face) == 3:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]}\n")

    print(f"[3D OBJ] {prop_id}: {len(verts)} verts, {len(front_faces)+len(back_faces)+len(rim_faces)} faces -> {obj_out}")

def create_game_sprite_with_shadow(prop_id, cfg):
    """
    Creates the final 2.5D game sprite with a realistic soft ambient occlusion drop shadow
    underneath the object (no gray background box!).
    """
    im = Image.open(cfg['clean']).convert('RGBA')
    target_w, target_h = cfg['render_w'], cfg['render_h']

    # Fit inside target canvas with margin for drop shadow
    margin_x = int(target_w * 0.06)
    margin_y = int(target_h * 0.08)
    avail_w = target_w - margin_x * 2
    avail_h = target_h - margin_y * 2

    scale = min(avail_w / im.width, avail_h / im.height)
    new_w = int(im.width * scale)
    new_h = int(im.height * scale)

    resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    arr = np.array(resized)

    canvas = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    ox = (target_w - new_w) // 2
    oy = (target_h - new_h) // 2

    # Build soft contact shadow from object alpha shifted slightly down-right
    shadow_alpha = np.zeros((target_h, target_w), dtype=np.float32)
    sx = min(target_w - new_w, ox + 4)
    sy = min(target_h - new_h, oy + 6)
    shadow_alpha[sy:sy+new_h, sx:sx+new_w] = arr[:, :, 3].astype(np.float32) * 0.55
    shadow_alpha = cv2.GaussianBlur(shadow_alpha, (21, 21), 0)

    # Put shadow onto canvas
    canvas[:, :, 0] = 6
    canvas[:, :, 1] = 8
    canvas[:, :, 2] = 12
    canvas[:, :, 3] = np.clip(shadow_alpha, 0, 255).astype(np.uint8)

    # Alpha-composite the crisp prop over the shadow
    fg = arr.astype(np.float32)
    bg = canvas[oy:oy+new_h, ox:ox+new_w].astype(np.float32)
    fa = fg[:, :, 3:4] / 255.0
    ba = bg[:, :, 3:4] / 255.0
    out_a = fa + ba * (1.0 - fa)
    out_rgb = np.where(out_a > 1e-5, (fg[:, :, :3] * fa + bg[:, :, :3] * ba * (1.0 - fa)) / (out_a + 1e-5), 0.0)

    comp = np.dstack([ np.clip(out_rgb, 0, 255).astype(np.uint8), np.clip(out_a * 255.0, 0, 255).astype(np.uint8) ])
    canvas[oy:oy+new_h, ox:ox+new_w] = comp

    Image.fromarray(canvas).save(cfg['sprite'])
    print(f"[Sprite] Saved {cfg['sprite']} ({target_w}x{target_h})")

if __name__ == '__main__':
    os.makedirs('assets/models', exist_ok=True)
    os.makedirs('assets/sprites/props', exist_ok=True)
    for pid, cfg in PROPS_CONFIG.items():
        remove_white_bg_clean(cfg['raw'], cfg['clean'])
        generate_volumetric_obj(pid, cfg)
        create_game_sprite_with_shadow(pid, cfg)
