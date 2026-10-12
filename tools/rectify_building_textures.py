import os
import cv2
import numpy as np
from PIL import Image

def build_clean_roof_tile(base_rgb, is_bunker=False):
    """Creates a clean weathered Soviet bitumen/concrete roof texture (256x256) without stretched 3D vent artifacts."""
    rng = np.random.default_rng(42 if not is_bunker else 99)
    h, w = 256, 256
    roof = np.zeros((h, w, 3), dtype=np.float32)
    base_col = np.array([58, 60, 64] if is_bunker else [42, 44, 48], dtype=np.float32)
    roof[:, :] = base_col

    # Add multi-scale weathering noise
    n1 = cv2.resize(rng.normal(0, 6.5, (32, 32)).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
    n2 = rng.normal(0, 2.5, (h, w)).astype(np.float32)
    for c in range(3):
        roof[:, :, c] += n1 + n2

    # Bitumen roll seams & tar repair patches
    for y in range(24, h - 24, 32):
        roof[y:y+2, 16:w-16] *= 0.78
    patches = [(36, 40, 90, 75, 0.76), (130, 60, 210, 115, 0.82), (60, 145, 165, 205, 0.74), (170, 150, 230, 215, 1.12)]
    for x1, y1, x2, y2, mult in patches:
        roof[y1:y2, x1:x2] *= mult

    # Concrete parapet border around the perimeter
    parapet_col = np.array([105, 108, 104] if is_bunker else [118, 120, 122], dtype=np.float32)
    b = 14
    roof[:b, :] = parapet_col + n2[:b, :, None]
    roof[-b:, :] = parapet_col + n2[-b:, :, None]
    roof[:, :b] = parapet_col + n2[:, :b, None]
    roof[:, -b:] = parapet_col + n2[:, -b:, None]
    # Dark inner shadow line inside parapet
    roof[b:b+3, b:-b] *= 0.62
    roof[-b-3:-b, b:-b] *= 0.62
    roof[b:-b, b:b+3] *= 0.62
    roof[b:-b, -b-3:-b] *= 0.62

    return np.clip(roof, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    # 1. Khrushchevka (873x553)
    im = Image.open('blender_assets/cat3_concepts/building_khrushchevka_clean.png').convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3].copy()
    rgb[arr[:, :, 3] < 128] = [54, 58, 62]
    rgb = np.clip(rgb.astype(np.float32) * 0.88, 0, 255).astype(np.uint8)

    atlas = np.zeros((512, 512, 3), dtype=np.uint8)
    M_f = cv2.getPerspectiveTransform(
        np.array([[25, 86], [752, 162], [750, 540], [36, 416]], dtype=np.float32),
        np.array([[0, 0], [511, 0], [511, 255], [0, 255]], dtype=np.float32)
    )
    atlas[0:256, 0:512] = cv2.warpPerspective(rgb, M_f, (512, 256), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)

    M_s = cv2.getPerspectiveTransform(
        np.array([[752, 162], [862, 100], [845, 468], [750, 540]], dtype=np.float32),
        np.array([[0, 0], [255, 0], [255, 255], [0, 255]], dtype=np.float32)
    )
    atlas[256:512, 0:256] = cv2.warpPerspective(rgb, M_s, (256, 256), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    atlas[256:512, 256:512] = build_clean_roof_tile(rgb, is_bunker=False)
    Image.fromarray(atlas).save('blender_assets/cat3_concepts/building_khrushchevka_atlas.png')
    print("Saved Khrushchevka PBR atlas")

    # 2. Military HQ (882x554)
    im_hq = Image.open('blender_assets/cat3_concepts/building_military_hq_clean.png').convert('RGBA')
    arr_hq = np.array(im_hq)
    rgb_hq = arr_hq[:, :, :3].copy()
    rgb_hq[arr_hq[:, :, 3] < 128] = [48, 52, 46]
    rgb_hq = np.clip(rgb_hq.astype(np.float32) * 0.88, 0, 255).astype(np.uint8)

    atlas_hq = np.zeros((512, 512, 3), dtype=np.uint8)
    M_hq_left = cv2.getPerspectiveTransform(
        np.array([[28, 240], [442, 308], [442, 535], [34, 456]], dtype=np.float32),
        np.array([[0, 0], [279, 0], [279, 255], [0, 255]], dtype=np.float32)
    )
    M_hq_right = cv2.getPerspectiveTransform(
        np.array([[442, 308], [866, 204], [854, 392], [442, 535]], dtype=np.float32),
        np.array([[0, 0], [231, 0], [231, 255], [0, 255]], dtype=np.float32)
    )
    atlas_hq[0:256, 0:280] = cv2.warpPerspective(rgb_hq, M_hq_left, (280, 256), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    atlas_hq[0:256, 280:512] = cv2.warpPerspective(rgb_hq, M_hq_right, (232, 256), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)

    M_hq_side = cv2.getPerspectiveTransform(
        np.array([[442, 308], [866, 204], [854, 392], [442, 535]], dtype=np.float32),
        np.array([[0, 0], [255, 0], [255, 255], [0, 255]], dtype=np.float32)
    )
    atlas_hq[256:512, 0:256] = cv2.warpPerspective(rgb_hq, M_hq_side, (256, 256), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    atlas_hq[256:512, 256:512] = build_clean_roof_tile(rgb_hq, is_bunker=True)
    Image.fromarray(atlas_hq).save('blender_assets/cat3_concepts/building_military_hq_atlas.png')
    print("Saved Military HQ PBR atlas")
