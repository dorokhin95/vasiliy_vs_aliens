import os
import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor

PROPS = ['car_zhiguli', 'car_uaz', 'trash_dumpster', 'military_crate']
CHUNK_SIZE = 14336  # 14 KB (strictly under 16 KB DPI stream cap)

def get_glb_url(prop_id):
    task_file = f"blender_assets/props_concepts/{prop_id}_task.json"
    with open(task_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    uuid = data['uuid']
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
    for item in items:
        if item['name'].endswith('.glb'):
            return item['url']
    raise RuntimeError(f"No GLB URL found for {prop_id}: {res.stdout}")

def fetch_chunk(args):
    url, start, end, idx = args
    for attempt in range(6):
        res = subprocess.run(
            ['curl.exe', '-s', '--max-time', '15', '-r', f'{start}-{end}', url],
            capture_output=True
        )
        expected = end - start + 1
        if res.returncode == 0 and len(res.stdout) == expected:
            return idx, res.stdout
    raise RuntimeError(f"Failed chunk {idx} ({start}-{end})")

def download_glb_chunked(prop_id, out_path):
    url = get_glb_url(prop_id)
    # Get first byte & total size via Content-Range
    hdr_res = subprocess.run(
        ['curl.exe', '-s', '-D', '-', '-r', '0-0', '-o', 'NUL', url],
        capture_output=True, text=True
    )
    m = re.search(r'Content-Range:\s*bytes\s+0-0/(\d+)', hdr_res.stdout, re.IGNORECASE)
    if not m:
        raise RuntimeError(f"Could not determine size for {prop_id}:\n{hdr_res.stdout}")
    total_size = int(m.group(1))
    print(f"[{prop_id}] Downloading real 3D GLB ({total_size} bytes) in 14KB chunks...")

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

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'wb') as f:
        for ch in chunks:
            f.write(ch)
    print(f"[{prop_id}] Saved real 360 3D model -> {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == '__main__':
    for p in PROPS:
        raw_glb = f"blender_assets/props_concepts/{p}_generated.glb"
        download_glb_chunked(p, raw_glb)
