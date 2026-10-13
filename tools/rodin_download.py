"""
Скачать готовую модель Hyper3D Rodin по номеру задачи.

В рабочей сети длинные загрузки с file.hyper3d.com обрываются (~16 КБ), поэтому GLB качается
кусками по 14 КБ в 16 потоков и склеивается. Номер задачи (task_uuid) выдаёт generate_3d в Blender
MCP — в handle задачи `hyper3d:main:<task_uuid>|<subscription_key>`.

    python tools/rodin_download.py <task_uuid> <out.glb>
    python tools/rodin_download.py <task_uuid> <out.glb> --api-key <ключ>   # если не пробный ключ аддона
"""
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

CHUNK_SIZE = 14336
API = 'https://hyperhuman.deemos.com/api/v2'


def api_post(path, payload, api_key):
    res = subprocess.run(
        ['curl.exe', '-s', '--max-time', '20', '-X', 'POST', f'{API}/{path}',
         '-H', f'Authorization: Bearer {api_key}',
         '-H', 'Content-Type: application/json',
         '-d', json.dumps(payload)],
        capture_output=True, text=True
    )
    return json.loads(res.stdout)


def fetch_chunk(args):
    url, start, end, idx = args
    for _ in range(6):
        res = subprocess.run(['curl.exe', '-s', '--max-time', '15', '-r', f'{start}-{end}', url], capture_output=True)
        if res.returncode == 0 and len(res.stdout) == end - start + 1:
            return idx, res.stdout
    raise RuntimeError(f'Кусок {idx} ({start}-{end}) не скачался')


def download(task_uuid, out_path, api_key='vibecoding'):
    items = api_post('download', {'task_uuid': task_uuid}, api_key).get('list', [])
    url = next(x['url'] for x in items if x['name'].endswith('.glb'))
    hdr = subprocess.run(['curl.exe', '-s', '-D', '-', '-r', '0-0', '-o', 'NUL', url], capture_output=True, text=True)
    m = re.search(r'Content-Range:\s*bytes\s+0-0/(\d+)', hdr.stdout, re.IGNORECASE)
    total = int(m.group(1))
    tasks = [(url, s, min(s + CHUNK_SIZE - 1, total - 1), i) for i, s in enumerate(range(0, total, CHUNK_SIZE))]
    chunks = [None] * len(tasks)
    with ThreadPoolExecutor(max_workers=16) as pool:
        for i, data in pool.map(fetch_chunk, tasks):
            chunks[i] = data
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, 'wb') as f:
        for ch in chunks:
            f.write(ch)
    print(f'{task_uuid}: {total} байт -> {out_path}')


if __name__ == '__main__':
    args = sys.argv[1:]
    key = 'vibecoding'
    if '--api-key' in args:
        i = args.index('--api-key')
        key = args[i + 1]
        del args[i:i + 2]
    download(args[0], args[1], key)
