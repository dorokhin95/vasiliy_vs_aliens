import os
import json
import time
import re
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
import cv2
import numpy as np
from PIL import Image

UPLOAD_DIR = r"C:\Users\p.dorohin\.gemini\antigravity\brain\b32c11b0-de23-4578-9171-2ad81046354d\.user_uploaded"
CONCEPT_DIR = "blender_assets/loot_concepts"
SPRITE_DIR = "assets/sprites/loot"
MODEL_DIR = "assets/models"
CHUNK_SIZE = 14336

LOOT_ITEMS = {
    'loot_scrap': {
        'src': os.path.join(UPLOAD_DIR, 'media_1791789569388_92e1af34.png'),
        'prompt': 'Post-apocalyptic Soviet dieselpunk pile of heavy scrap metal, rusty steel cogwheel gear, vintage spanner wrench, oxidized copper bolt, suspension coil spring, 3D game asset.',
    },
    'loot_bottle': {
        'src': os.path.join(UPLOAD_DIR, 'media_1791789574418_46727ce6.png'),
        'prompt': 'Soviet dark green glass beer bottle Zhigulevskoe with torn paper label and rusty metal crown cap, upright cylinder, 3D game asset.',
    },
    'loot_stew': {
        'src': os.path.join(UPLOAD_DIR, 'media_1791789579245_f035483d.png'),
        'prompt': 'Soviet cylindrical ribbed tin can of braised beef stew Tushonka GOST with aged paper label and red bull head emblem, 3D game asset.',
    },
    'loot_vodka': {
        'src': os.path.join(UPLOAD_DIR, 'media_1791789583939_13e5cb96.png'),
        'prompt': 'Soviet clear glass vodka bottle Krepkaya with red and gold label and crimped red foil cap with pull tab, upright cylinder, 3D game asset.',
    },
    'loot_bandage': {
        'src': os.path.join(UPLOAD_DIR, 'media_1791789588360_fc9f6e88.png'),
        'prompt': 'Soviet cylindrical roll of sterile medical gauze bandage with faded teal-green paper wrapper band and red cross symbol, 3D game asset.',
    },
}

def clean_white_bg_and_make_sprite(item_id, raw_path, clean_path, sprite_path):
    im = Image.open(raw_path).convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.float32)
    h, w, _ = rgb.shape

    dist_white = np.sqrt(np.sum((255.0 - rgb) ** 2, axis=2))
    bg_candidates = (dist_white < 26.0).astype(np.uint8)

    flood_mask = np.zeros((h + 2, w + 2), np.uint8)
    exterior_bg = np.zeros((h, w), np.uint8)

    for sx in [0, w - 1, w // 2]:
        for sy in [0, h - 1, h // 2]:
            if sx in (0, w - 1) or sy in (0, h - 1):
                if bg_candidates[sy, sx] > 0:
                    temp = bg_candidates.copy()
                    cv2.floodFill(temp, flood_mask, (sx, sy), 255)
                    exterior_bg = np.maximum(exterior_bg, (temp == 255).astype(np.uint8))

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    boundary_zone = cv2.dilate(exterior_bg, kernel, iterations=1) - exterior_bg

    alpha = np.where(exterior_bg > 0, 0.0, 255.0).astype(np.float32)
    ramp = np.clip((dist_white - 10.0) / 42.0, 0.0, 1.0) * 255.0
    alpha = np.where(boundary_zone > 0, np.minimum(alpha, ramp), alpha)

    # Keep main connected component
    fg_bin = (alpha > 20).astype(np.uint8)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(fg_bin, connectivity=8)
    if num_labels > 1:
        largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        alpha *= (labels == largest_label).astype(np.float32)

    # Decontaminate white halo on semi-transparent edges
    edge_mask = (alpha > 5) & (alpha < 245)
    a_norm = np.clip(alpha / 255.0, 0.1, 1.0)
    for c in range(3):
        decontam = (rgb[:, :, c] - (1.0 - a_norm) * 255.0) / a_norm
        rgb[:, :, c] = np.where(edge_mask, np.clip(decontam, 0, 255), rgb[:, :, c])

    ys, xs = np.where(alpha > 15)
    pad = 10
    x1, x2 = max(0, xs.min() - pad), min(w, xs.max() + pad)
    y1, y2 = max(0, ys.min() - pad), min(h, ys.max() + pad)

    cropped = np.dstack([rgb.astype(np.uint8), alpha.astype(np.uint8)])[y1:y2, x1:x2]
    Image.fromarray(cropped).save(clean_path)
    print(f"[{item_id}] Saved clean PNG: {clean_path} ({cropped.shape[1]}x{cropped.shape[0]})")

    # Also save 128x128 game sprite icon with soft shadow
    target_w, target_h = 128, 128
    clean_im = Image.fromarray(cropped)
    avail = 108
    scale = min(avail / clean_im.width, avail / clean_im.height)
    nw, nh = max(1, int(clean_im.width * scale)), max(1, int(clean_im.height * scale))
    resized = clean_im.resize((nw, nh), Image.Resampling.LANCZOS)
    rarr = np.array(resized)

    canvas = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    ox = (target_w - nw) // 2
    oy = (target_h - nh) // 2

    sh_alpha = np.zeros((target_h, target_w), dtype=np.float32)
    sx = min(target_w - nw, ox + 3)
    sy = min(target_h - nh, oy + 4)
    sh_alpha[sy:sy+nh, sx:sx+nw] = rarr[:, :, 3].astype(np.float32) * 0.5
    sh_alpha = cv2.GaussianBlur(sh_alpha, (15, 15), 0)

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

    Image.fromarray(canvas).save(sprite_path)
    print(f"[{item_id}] Saved sprite icon: {sprite_path}")

def prepare_14k_webp(clean_path, webp_path, max_bytes=13800):
    im = Image.open(clean_path).convert('RGBA')
    bg = Image.new('RGB', im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[3])

    for max_dim in [420, 360, 320, 280, 240]:
        scale = min(1.0, max_dim / float(max(bg.size)))
        resized = bg.resize((int(bg.width * scale), int(bg.height * scale)), Image.Resampling.LANCZOS)
        for q in [82, 72, 65, 55, 45]:
            resized.save(webp_path, 'WEBP', quality=q, method=6)
            sz = os.path.getsize(webp_path)
            if sz <= max_bytes:
                print(f"[WebP] {webp_path}: {resized.size} ({sz} bytes, q={q})")
                return webp_path
    return webp_path

def submit_3d_task(item_id, webp_path, prompt):
    task_json = os.path.join(CONCEPT_DIR, f"{item_id}_task.json")
    if os.path.exists(task_json):
        with open(task_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if data.get('uuid') and data.get('subscription_key'):
            print(f"[{item_id}] Reusing existing task uuid={data['uuid']}")
            return data

    cmd = [
        'curl.exe', '-s', '--max-time', '45', '-X', 'POST',
        'https://hyperhuman.deemos.com/api/v2/rodin',
        '-H', 'Authorization: Bearer vibecoding',
        '-F', f'images=@{webp_path}',
        '-F', 'tier=Regular',
        '-F', 'material=PBR',
        '-F', 'mesh_mode=Quad',
        '-F', 'quality_override=18000',
        '-F', f'prompt={prompt}'
    ]
    for attempt in range(5):
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and res.stdout.strip():
            try:
                data = json.loads(res.stdout)
                if data.get('uuid') and data.get('jobs', {}).get('subscription_key'):
                    saved = {
                        'uuid': data['uuid'],
                        'subscription_key': data['jobs']['subscription_key']
                    }
                    with open(task_json, 'w', encoding='utf-8') as f:
                        json.dump(saved, f, indent=2)
                    print(f"[{item_id}] Submitted 3D job! uuid={saved['uuid']}")
                    return saved
            except Exception as e:
                print(f"[{item_id}] Parse error: {e}")
        time.sleep(2)
    raise RuntimeError(f"Failed to submit {item_id}")

def check_status(sub_key):
    res = subprocess.run(
        [
            'curl.exe', '-s', '--max-time', '20', '-X', 'POST',
            'https://hyperhuman.deemos.com/api/v2/status',
            '-H', 'Authorization: Bearer vibecoding',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({'subscription_key': sub_key})
        ],
        capture_output=True, text=True
    )
    if res.returncode == 0 and res.stdout.strip():
        data = json.loads(res.stdout)
        return [j.get('status') for j in data.get('jobs', [])]
    return []

def fetch_chunk(args):
    url, start, end, idx = args
    for _ in range(6):
        res = subprocess.run(
            ['curl.exe', '-s', '--max-time', '15', '-r', f'{start}-{end}', url],
            capture_output=True
        )
        if res.returncode == 0 and len(res.stdout) == (end - start + 1):
            return idx, res.stdout
    raise RuntimeError(f"Chunk {idx} failed")

def download_glb_chunked(item_id, uuid, out_path):
    res = subprocess.run(
        [
            'curl.exe', '-s', '-X', 'POST',
            'https://hyperhuman.deemos.com/api/v2/download',
            '-H', 'Authorization: Bearer vibecoding',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({'task_uuid': uuid})
        ],
        capture_output=True, text=True
    )
    items = json.loads(res.stdout).get('list', [])
    url = next(x['url'] for x in items if x['name'].endswith('.glb'))

    hdr = subprocess.run(
        ['curl.exe', '-s', '-D', '-', '-r', '0-0', '-o', 'NUL', url],
        capture_output=True, text=True
    )
    m = re.search(r'Content-Range:\s*bytes\s+0-0/(\d+)', hdr.stdout, re.IGNORECASE)
    total_size = int(m.group(1))
    print(f"[{item_id}] Downloading 360 3D GLB ({total_size} bytes)...")

    tasks = []
    idx = 0
    for start in range(0, total_size, CHUNK_SIZE):
        end = min(start + CHUNK_SIZE - 1, total_size - 1)
        tasks.append((url, start, end, idx))
        idx += 1

    chunks = [None] * len(tasks)
    with ThreadPoolExecutor(max_workers=16) as pool:
        for i, data in pool.map(fetch_chunk, tasks):
            chunks[i] = data

    with open(out_path, 'wb') as f:
        for ch in chunks:
            f.write(ch)
    print(f"[{item_id}] Saved {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == '__main__':
    os.makedirs(CONCEPT_DIR, exist_ok=True)
    os.makedirs(SPRITE_DIR, exist_ok=True)
    os.makedirs(MODEL_DIR, exist_ok=True)

    active = {}
    for item_id, cfg in LOOT_ITEMS.items():
        raw_path = os.path.join(CONCEPT_DIR, f"{item_id}_raw.png")
        clean_path = os.path.join(CONCEPT_DIR, f"{item_id}_clean.png")
        webp_path = os.path.join(CONCEPT_DIR, f"{item_id}_14k.webp")
        sprite_path = os.path.join(SPRITE_DIR, f"{item_id}.png")

        shutil.copyfile(cfg['src'], raw_path)
        clean_white_bg_and_make_sprite(item_id, raw_path, clean_path, sprite_path)
        prepare_14k_webp(clean_path, webp_path)
        active[item_id] = submit_3d_task(item_id, webp_path, cfg['prompt'])

    pending = set(active.keys())
    while pending:
        for item_id in list(pending):
            t = active[item_id]
            gen_glb = os.path.join(CONCEPT_DIR, f"{item_id}_generated.glb")
            if os.path.exists(gen_glb) and os.path.getsize(gen_glb) > 100000:
                pending.remove(item_id)
                continue
            statuses = check_status(t['subscription_key'])
            print(f"[{item_id}] Statuses: {statuses}")
            if statuses and all(s == 'Done' for s in statuses):
                download_glb_chunked(item_id, t['uuid'], gen_glb)
                pending.remove(item_id)
            elif any(s in ('Failed', 'Canceled') for s in statuses):
                raise RuntimeError(f"[{item_id}] Generation failed: {statuses}")
        if pending:
            time.sleep(8)

    print("ALL 5 LOOT 360 3D MODELS GENERATED AND DOWNLOADED!")
