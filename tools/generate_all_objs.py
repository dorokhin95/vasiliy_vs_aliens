import cv2
import numpy as np
from PIL import Image
import os
import math

ENEMY_CONFIGS = {
    'toad_grunt': {
        'img': 'assets/enemies/toad_grunt_perfect.png',
        'glb': 'assets/models/toad_grunt.glb',
        'width': 1.25,
        'height': 1.80,
        'thickness': 0.40,
        'back_color': (0.16, 0.26, 0.12, 1.0), # Olive swamp skin
        'glow_color': (0.1, 0.9, 0.2, 1.0),
        'stride_speed': 1.8,
    },
    'toad_sniper': {
        'img': 'assets/enemies/toad_sniper_perfect.png',
        'glb': 'assets/models/toad_sniper.glb',
        'width': 1.05,
        'height': 1.82,
        'thickness': 0.34,
        'back_color': (0.18, 0.22, 0.15, 1.0), # Camo poncho / ghillie
        'glow_color': (0.6, 0.1, 0.9, 1.0), # Purple NVG glow
        'stride_speed': 1.6,
    },
    'toad_brute': {
        'img': 'assets/enemies/toad_brute_perfect.png',
        'glb': 'assets/models/toad_brute.glb',
        'width': 2.05,
        'height': 2.35,
        'thickness': 0.65,
        'back_color': (0.12, 0.20, 0.10, 1.0), # Deep dark warty hide
        'glow_color': (0.3, 1.0, 0.1, 1.0), # Acidic pustule glow
        'stride_speed': 1.2,
    }
}

def generate_volumetric_obj(enemy_id, cfg, grid_step=6):
    img_path = cfg['img']
    im = Image.open(img_path)
    w, h = im.size
    rgba = np.array(im)
    alpha = rgba[:, :, 3]
    rgb = rgba[:, :, :3]

    # Find tight bounding box of alpha to correctly ground feet and center X
    ys_active, xs_active = np.where(alpha > 35)
    min_x, max_x = xs_active.min(), xs_active.max()
    min_y, max_y = ys_active.min(), ys_active.max()
    
    char_w = max_x - min_x
    char_h = max_y - min_y
    center_x = (min_x + max_x) / 2.0
    ground_y = max_y # Feet at bottom

    # Binary mask & Distance transform
    mask = (alpha > 35).astype(np.uint8)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    max_d = dist.max()
    norm_dist = dist / (max_d + 1e-5)

    # Volumetric dome profile
    depth = np.sin(norm_dist * (np.pi / 2)) ** 0.65

    # Emboss luminance detail (hazard sign, belts, weapon, muscles)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    gray_blur = cv2.GaussianBlur(gray, (17, 17), 0)
    high_freq = np.clip((gray - gray_blur) * 1.5, -0.2, 0.2)
    total_depth = np.clip(depth * 0.85 + high_freq * 0.15, 0.05, 1.0) * mask

    # Grid sampling
    sub_mask = mask[::grid_step, ::grid_step]
    sub_depth = total_depth[::grid_step, ::grid_step]
    grid_h, grid_w = sub_mask.shape

    scale_x = cfg['width'] / float(char_w)
    scale_z = cfg['height'] / float(char_h)
    thickness = cfg['thickness']

    front_idx = np.full((grid_h, grid_w), -1, dtype=int)
    back_idx = np.full((grid_h, grid_w), -1, dtype=int)

    verts = []
    uvs_front = []
    uvs_back = []
    v_count = 1

    for r in range(grid_h):
        for c in range(grid_w):
            if sub_mask[r, c] > 0:
                px = c * grid_step
                py = r * grid_step

                vx = (px - center_x) * scale_x
                vz = (ground_y - py) * scale_z # Z=0 at ground
                d = sub_depth[r, c]
                
                vy_front = -d * thickness
                vy_back = d * thickness * 0.70

                uf = px / float(w)
                vf = 1.0 - (py / float(h))

                # Front vertex
                front_idx[r, c] = v_count
                verts.append((vx, vy_front, vz))
                uvs_front.append((uf, vf))
                v_count += 1

                # Back vertex
                back_idx[r, c] = v_count
                verts.append((vx, vy_back, vz))
                # Back UV: mirror X and slightly shift to sample texture cleanly
                uvs_back.append((1.0 - uf, vf))
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

            # Rim stitching
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

    obj_out = f"blender_assets/{enemy_id}_volumetric.obj"
    os.makedirs(os.path.dirname(obj_out), exist_ok=True)
    with open(obj_out, 'w') as f:
        f.write(f"# Volumetric 3D mesh for {enemy_id}\n")
        for vx, vy, vz in verts:
            f.write(f"v {vx:.5f} {vy:.5f} {vz:.5f}\n")
        for uf, vf in uvs_front:
            f.write(f"vt {uf:.5f} {vf:.5f}\n")
            f.write(f"vt {1.0 - uf:.5f} {vf:.5f}\n")

        # Front faces (Material 1)
        f.write("usemtl Mat_Front\n")
        for face in front_faces:
            if len(face) == 4:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]} {face[3]}/{face[3]}\n")
            elif len(face) == 3:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]}\n")

        # Back & Rim faces (Material 2)
        f.write("usemtl Mat_Back\n")
        for face in back_faces:
            if len(face) == 4:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]} {face[3]}/{face[3]}\n")
            elif len(face) == 3:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]}\n")
        for face in rim_faces:
            if len(face) == 4:
                f.write(f"f {face[0]}/{face[0]} {face[1]}/{face[1]} {face[2]}/{face[2]} {face[3]}/{face[3]}\n")

    print(f"[{enemy_id}] Generated OBJ: {len(verts)} verts, {len(front_faces)+len(back_faces)+len(rim_faces)} faces")
    return obj_out

if __name__ == "__main__":
    for eid, conf in ENEMY_CONFIGS.items():
        generate_volumetric_obj(eid, conf)
