"""
Промзона: концепты Gemini (blender_assets/promzona_concepts/<имя>.png) -> сырые GLB Rodin в режиме Regular
(blender_assets/promzona_models/<имя>.glb), дальше их обрабатывает tools/finalize_promzona_blender.py.

Blender MCP (generate_3d) всегда шлёт tier=Sketch — модели выходят грубыми. Здесь задачи уходят в API Rodin
напрямую: tier=Regular, PBR, quad-сетка 18 тыс. граней, bbox_condition по габариту модели (иначе длинные
объекты получаются крестом из двух копий). Порядок bbox_condition на деле [длина, высота, ширина].

Картинка ужимается до <14 КБ (tools/prep_rodin_concept.py): в рабочей сети длинные загрузки обрываются.
Номера задач сохраняются в <имя>_task.json рядом с концептом — повторный запуск не платит второй раз,
а дожидается и скачивает уже отправленные.

    python tools/generate_promzona_rodin.py [имя ...]
"""
import json
import os
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CONCEPTS = os.path.join(ROOT, 'blender_assets', 'promzona_concepts')
RAW = os.path.join(ROOT, 'blender_assets', 'promzona_models')
API = 'https://hyperhuman.deemos.com/api/v2'
KEY = os.environ.get('RODIN_API_KEY', 'vibecoding')

sys.path.insert(0, os.path.dirname(__file__))
from rodin_download import download  # noqa: E402

# имя: (габарит [длина, глубина, высота] — как PZ_MODELS в src/environment.js, подсказка)
MODELS = {
    'building_foundry':       ([70, 35, 28], 'abandoned Soviet foundry hall with sawtooth skylight roof'),
    'building_mech_workshop': ([55, 25, 15], 'abandoned Soviet brick mechanical workshop with large windows'),
    'building_warehouse':     ([50, 24, 15], 'abandoned Soviet warehouse hangar with arched corrugated roof and loading ramp'),
    'building_admin':         ([60, 23, 23], 'abandoned Soviet 4-storey concrete panel administration building'),
    'building_checkpoint':    ([12, 4, 6], 'Soviet factory checkpoint: guard booth, turnstile canopy, sliding gate'),
    'building_cooling_tower': ([40, 40, 51], 'concrete hyperbolic cooling tower on slanted legs'),
    'building_smokestack':    ([10, 10, 22], 'tall red brick factory chimney on a concrete plinth'),
    'building_oil_tank':      ([25, 25, 12], 'rusty cylindrical steel oil storage tank with side stair'),
    'building_gasholder':     ([35, 35, 25], 'rusty telescopic gasholder inside a steel guide frame'),
    'building_pump_station':  ([18, 15, 8], 'small brick pump station with large pipes and valves in front'),
    'prop_locomotive':        ([17, 5, 7], 'abandoned Soviet TEM2 diesel shunting locomotive'),
    'prop_gantry_crane':      ([25, 12, 14], 'rusty yellow gantry crane with lattice girder'),
    # Без подсказки «открытая» Rodin заливал промежутки между опорами сплошной стеной
    'prop_pipe_rack':         ([12, 3.4, 6], 'open see-through steel pipe rack: thin lattice support legs, pipes on top, empty space under the pipes, no walls, no panels, no fill between the legs'),
    'prop_pipe_stack':        ([8, 7, 4], 'stack of large rusty steel pipes on wooden sleepers'),
    'prop_cable_reel':        ([2.2, 1.4, 2.2], 'large wooden cable reel with black cable'),
    # Баррикады: мешки — у пролома в обороне и на посту в городе (src/defense.js drawPiece), поддоны — там же
    'prop_sandbag_wall':      ([3.0, 0.9, 1.0], 'low straight barricade wall of stacked burlap sandbags, brick pattern'),
    'prop_pallet_barricade':  ([3.0, 1.3, 1.3], 'makeshift barricade of weathered wooden pallets standing upright and leaning'),
    # Оружие мастерской Толика в руках Василия (tools/finalize_weapons_blender.py): концепт сбоку, ствол вправо
    'weapon_launcher':        ([0.95, 0.12, 0.3], 'homemade single-shot grenade launcher: steel pipe barrel, spring, wooden rifle stock'),
    'weapon_arc':             ([0.8, 0.14, 0.3], 'homemade welding arc discharger gun with copper coil, cables and electrode tip'),
    'weapon_emp':             ([0.1, 0.1, 0.16], 'homemade EMP grenade: soldered metal canister with circuit boards and a glowing blue core'),
    # Жаба-снайпер: новая модель по старому концепту (assets/enemies/toad_sniper_perfect.png на белом), чтобы
    # винтовку можно было вскинуть — скелет, прицел и дуло собирает tools/build_promzona_toads_blender.py
    'toad_sniper':        ([1.3, 0.6, 1.85], 'full body game character, lean alien toad sniper in a ragged ghillie camouflage cloak and hood with a green night-vision monocle, holding a long sniper rifle diagonally across the body, rifle muzzle clearly away from the body'),
    # Выжившие (docs/LEVEL2_PROMZONA.md, раздел 5): полный рост, A-поза, оружие отведено от тела — иначе Rodin
    # вплавляет его в ноги. Скелет и анимации — tools/build_promzona_survivors_blender.py
    'survivor_stepanych': ([0.95, 0.5, 1.78], 'full body game character, old Soviet foreman in a quilted jacket and flat cap holding a double-barreled hunting shotgun pointing down, A-pose'),
    'survivor_zina':      ([0.95, 0.5, 1.70], 'full body game character, heavy-set woman guard in a navy quilted coat and fur hat holding a revolver pointing down, A-pose'),
    'survivor_tolik':     ([1.0, 0.5, 1.78], 'full body game character, wiry welder with a welding mask on his forehead holding a flare pistol and a crowbar pointing down, A-pose'),
    'survivor_lena':      ([0.8, 0.45, 1.66], 'full body game character, young female lab assistant in a white lab coat with a red first-aid bag, A-pose'),
    'survivor_seryoga':   ([0.8, 0.45, 1.75], 'full body game character, young skinny mechanic in blue overalls with a bandaged leg, A-pose'),
}


def curl_json(args, timeout=60):
    res = subprocess.run(['curl.exe', '-s', '--max-time', str(timeout)] + args, capture_output=True, text=True)
    try:
        return json.loads(res.stdout)
    except ValueError:
        return {'error': res.stdout[:300] or res.stderr[:300]}


def prep(name):
    webp = os.path.join(CONCEPTS, name + '_14k.webp')
    if not os.path.exists(webp):
        from PIL import Image
        src = os.path.join(CONCEPTS, name + '.png')
        w, h = Image.open(src).size  # концепт целиком (кадр из Gemini бывает не 1024)
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'prep_rodin_concept.py'),
                        src, CONCEPTS, name, str(w), str(h)], check=True)
    return webp


def submit(name):
    task_path = os.path.join(CONCEPTS, name + '_task.json')
    if os.path.exists(task_path):
        with open(task_path, encoding='utf-8') as f:
            return json.load(f)
    (length, depth, height), prompt = MODELS[name]
    # Rodin принимает только целые: пропорции в долях наибольшей стороны ×100
    big = max(length, depth, height)
    bbox = [max(1, round(v / big * 100)) for v in (length, height, depth)]
    webp = prep(name)
    for attempt in range(5):
        data = curl_json(['-X', 'POST', f'{API}/rodin', '-H', f'Authorization: Bearer {KEY}',
                          '-F', f'images=@{webp}', '-F', 'tier=Regular', '-F', 'material=PBR',
                          '-F', 'mesh_mode=Quad', '-F', 'quality_override=18000',
                          '-F', f'bbox_condition={json.dumps(bbox)}', '-F', f'prompt={prompt}'])
        if data.get('uuid') and data.get('jobs', {}).get('subscription_key'):
            task = {'uuid': data['uuid'], 'subscription_key': data['jobs']['subscription_key'], 'tier': 'Regular',
                    'bbox': bbox}
            with open(task_path, 'w', encoding='utf-8') as f:
                json.dump(task, f, indent=2)
            print(f'[sent] {name}: {task["uuid"]} bbox {bbox}', flush=True)
            return task
        print(f'[retry {attempt + 1}] {name}: {data}', flush=True)
        if 'INSUFFICIENT' in json.dumps(data).upper():
            raise RuntimeError(f'{name}: у ключа Rodin кончились кредиты: {data}')
        time.sleep(3)
    raise RuntimeError(f'{name}: задача не отправилась')


def status(task):
    data = curl_json(['-X', 'POST', f'{API}/status', '-H', f'Authorization: Bearer {KEY}',
                      '-H', 'Content-Type: application/json',
                      '-d', json.dumps({'subscription_key': task['subscription_key']})], timeout=20)
    return [j.get('status') for j in data.get('jobs', [])]


def main():
    names = sys.argv[1:] or list(MODELS)
    os.makedirs(RAW, exist_ok=True)
    tasks = {n: submit(n) for n in names}
    pending = dict(tasks)
    t0 = time.time()
    while pending and time.time() - t0 < 60 * 40:
        for name, task in list(pending.items()):
            st = status(task)
            if st and all(s == 'Done' for s in st):
                out = os.path.join(RAW, name + '.glb')
                try:
                    download(task['uuid'], out, KEY)
                    del pending[name]
                except Exception as e:  # ссылка на файл появляется чуть позже статуса
                    print(f'[wait] {name}: {e}', flush=True)
            elif any(s == 'Failed' for s in st):
                print(f'[failed] {name}: {st}', flush=True)
                del pending[name]
        if pending:
            print(f'[{int(time.time() - t0)} s] ждём: {", ".join(pending)}', flush=True)
            time.sleep(20)
    print('готово' if not pending else f'не дождались: {", ".join(pending)}')


if __name__ == '__main__':
    main()
