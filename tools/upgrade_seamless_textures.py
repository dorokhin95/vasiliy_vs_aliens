import os
import cv2
import numpy as np
from PIL import Image

TEX_DIR = r"d:\pro1\vasiliy_vs_aliens\assets\textures"

def tileable_noise(h, w, scale, rng):
    """Generates a 100% seamless tileable noise map by wrapping borders before bicubic upsampling."""
    gh, gw = max(4, h // scale), max(4, w // scale)
    grid = rng.normal(0.0, 1.0, (gh, gw)).astype(np.float32)
    # Pad with wrapped edges for seamless bicubic interpolation
    pad = 2
    padded = np.pad(grid, pad, mode='wrap')
    up = cv2.resize(padded, ((gw + 2 * pad) * scale, (gh + 2 * pad) * scale), interpolation=cv2.INTER_CUBIC)
    ps = pad * scale
    return up[ps:ps + h, ps:ps + w]

def make_asphalt_road():
    h, w = 512, 512
    rng = np.random.default_rng(101)
    # Deep wet Soviet charcoal asphalt (#1d222a)
    base = np.zeros((h, w, 3), dtype=np.float32)
    base[:, :] = [29, 34, 42]

    n_macro = tileable_noise(h, w, 64, rng) * 4.5
    n_med   = tileable_noise(h, w, 16, rng) * 3.0
    n_fine  = rng.normal(0.0, 4.2, (h, w)).astype(np.float32)

    # Mineral aggregate speckles (light & dark gravel stones in bitumen)
    specks_hi = (rng.random((h, w)) > 0.965).astype(np.float32) * 16.0
    specks_lo = (rng.random((h, w)) > 0.960).astype(np.float32) * (-11.0)

    delta = n_macro + n_med + n_fine + specks_hi + specks_lo
    for c in range(3):
        base[:, :, c] += delta

    # Bitumen tar repair patches (seamless dark glossy strips)
    tar_mask = (tileable_noise(h, w, 32, rng) > 1.15).astype(np.float32)
    tar_mask = cv2.GaussianBlur(tar_mask, (9, 9), 0)
    for c in range(3):
        base[:, :, c] = base[:, :, c] * (1.0 - tar_mask * 0.28)

    out = np.clip(base, 14, 72).astype(np.uint8)
    os.makedirs(TEX_DIR, exist_ok=True)
    path = os.path.join(TEX_DIR, 'asphalt_road.png')
    Image.fromarray(out).save(path)
    print(f"Saved seamless asphalt texture: {path}")

def make_sidewalk_tiles():
    h, w = 512, 512
    rng = np.random.default_rng(202)
    # Soviet precast concrete sidewalk slabs (distinct lighter gray #474f5a so sidewalks pop against asphalt)
    base = np.zeros((h, w, 3), dtype=np.float32)
    base[:, :] = [68, 74, 82]

    # Per-tile slight shade variation (64x64 concrete slabs = 8x8 tiles in 512x512)
    tile_sz = 64
    for ty in range(h // tile_sz):
        for tx in range(w // tile_sz):
            v = rng.uniform(-5.5, 5.5)
            y0, y1 = ty * tile_sz, (ty + 1) * tile_sz
            x0, x1 = tx * tile_sz, (tx + 1) * tile_sz
            base[y0:y1, x0:x1] += v

    n_med  = tileable_noise(h, w, 16, rng) * 3.8
    n_fine = rng.normal(0.0, 3.2, (h, w)).astype(np.float32)
    for c in range(3):
        base[:, :, c] += n_med + n_fine

    # Beveled mortar joints every 64px with subtle moss in seams
    for i in range(0, h, tile_sz):
        # Dark joint seam
        base[i:i+2, :] *= 0.48
        base[:, i:i+2] *= 0.48
        # Highlight bevel edge on top/left of slab
        if i + 3 < h:
            base[i+2:i+3, :] += 8.0
            base[:, i+2:i+3] += 8.0
        # Shadow bevel edge on bottom/right of slab
        if i - 1 >= 0:
            base[i-1:i, :] *= 0.76
            base[:, i-1:i] *= 0.76

    # Moss patches along slab joints
    moss_noise = tileable_noise(h, w, 32, rng)
    joint_mask = np.zeros((h, w), dtype=np.float32)
    for i in range(0, h, tile_sz):
        joint_mask[max(0, i-3):min(h, i+5), :] = 1.0
        joint_mask[:, max(0, i-3):min(w, i+5)] = 1.0
    moss = np.clip((moss_noise - 0.35) * joint_mask, 0.0, 1.0)
    moss = cv2.GaussianBlur(moss, (5, 5), 0)
    base[:, :, 0] = base[:, :, 0] * (1.0 - moss * 0.35) + 34.0 * (moss * 0.35)
    base[:, :, 1] = base[:, :, 1] * (1.0 - moss * 0.35) + 52.0 * (moss * 0.35)
    base[:, :, 2] = base[:, :, 2] * (1.0 - moss * 0.35) + 30.0 * (moss * 0.35)

    out = np.clip(base, 20, 125).astype(np.uint8)
    path = os.path.join(TEX_DIR, 'sidewalk_tiles.png')
    Image.fromarray(out).save(path)
    print(f"Saved seamless sidewalk texture: {path}")

def make_ground_terrain():
    h, w = 512, 512
    rng = np.random.default_rng(303)
    # Damp Soviet autumn courtyard soil + muted olive/brown grass + fallen autumn leaves
    soil = np.zeros((h, w, 3), dtype=np.float32)
    soil[:, :] = [42, 41, 35]  # dark damp earth

    grass_olive = np.array([46, 56, 36], dtype=np.float32)
    grass_dry   = np.array([62, 54, 38], dtype=np.float32)

    n_patch1 = np.clip(tileable_noise(h, w, 64, rng) * 0.5 + 0.5, 0.0, 1.0)[..., None]
    n_patch2 = np.clip(tileable_noise(h, w, 32, rng) * 0.5 + 0.35, 0.0, 1.0)[..., None]

    base = soil * (1.0 - n_patch1) + grass_olive * n_patch1
    base = base * (1.0 - n_patch2 * 0.55) + grass_dry * (n_patch2 * 0.55)

    n_fine = rng.normal(0.0, 3.6, (h, w)).astype(np.float32)
    for c in range(3):
        base[:, :, c] += n_fine

    # Soft organic autumn leaf drifts (only in sheltered patches where wind blows leaves)
    drift_zone = (tileable_noise(h, w, 64, rng) > 0.65)
    leaves = (rng.random((h, w)) > 0.9965) & drift_zone
    ly, lx = np.where(leaves)
    for y, x in zip(ly, lx):
        col = [rng.uniform(76, 98), rng.uniform(58, 74), rng.uniform(30, 42)]
        y1, x1 = min(h, y + 2), min(w, x + 2)
        base[y:y1, x:x1] = col

    pebbles = (rng.random((h, w)) > 0.997)
    py, px = np.where(pebbles)
    for y, x in zip(py, px):
        v = rng.uniform(54, 68)
        base[y:min(h, y+2), x:min(w, x+2)] = [v, v, v * 0.95]

    out = np.clip(base, 18, 120).astype(np.uint8)
    path = os.path.join(TEX_DIR, 'ground_terrain.png')
    Image.fromarray(out).save(path)
    print(f"Saved seamless courtyard ground texture: {path}")

if __name__ == '__main__':
    make_asphalt_road()
    make_sidewalk_tiles()
    make_ground_terrain()
