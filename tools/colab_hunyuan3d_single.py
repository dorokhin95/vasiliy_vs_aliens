"""
Colab (T4, бесплатно): концепты с прозрачным фоном -> текстурированные GLB через Hunyuan3D-2.

Новая сессия Colab (тип среды - T4 GPU), одна ячейка:
    from google.colab import drive; drive.mount('/content/drive')
    %run /content/drive/MyDrive/vasiliy_3d/in/colab_gen_v3.py

Всё, что дорого получить, лежит на Drive и переживает обрыв сессии (Colab рвёт её через ~1,5 ч без действий):
  - собранные колёса custom_rasterizer/nvdiffrast и mesh_processor - DRIVE_ROOT/wheels: повторная установка - секунды;
  - веса моделей - DRIVE_ROOT/hf_cache;
  - готовые формы - DRIVE_ROOT/work, готовые GLB - DRIVE_ROOT/out. После обрыва просто запустить снова.

Берёт PNG из DRIVE_ROOT/in (кроме character-*/used-*), делает форму по одной картинке (без MV-Adapter:
SDXL/SD 2.1 не влезали в 12.7 ГБ ОЗУ Colab), потом текстуру. Входы готовит tools/prep_concept_alpha.py.
"""
import gc
import glob
import os
import shutil
import subprocess
import sys
import sysconfig
import time

DRIVE_ROOT = '/content/drive/MyDrive/vasiliy_3d'
IN_DIR = os.path.join(DRIVE_ROOT, 'in')
OUT_DIR = os.path.join(DRIVE_ROOT, 'out')
WORK = os.path.join(DRIVE_ROOT, 'work')
WHEELS = os.path.join(DRIVE_ROOT, 'wheels')
REPO = '/content/Hunyuan3D-2'
HUNYUAN_COMMIT = 'f8db63096c8282cb27354314d896feba5ba6ff8a'
os.environ.setdefault('HF_HOME', os.path.join(DRIVE_ROOT, 'hf_cache'))
for d in (OUT_DIR, WORK, WHEELS):
    os.makedirs(d, exist_ok=True)


def sh(cmd, cwd=None):
    print('$', cmd, flush=True)
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:])
        raise RuntimeError('failed: ' + cmd)


def setup():
    if os.path.exists('/content/.hy3d_single_ready'):
        return
    t0 = time.time()
    frozen = subprocess.run([sys.executable, '-m', 'pip', 'freeze'], capture_output=True, text=True).stdout
    keep = ('numpy==', 'scipy==', 'torch==', 'torchvision==', 'numba==', 'llvmlite==', 'pillow==',
            'opencv-python==', 'opencv-python-headless==', 'scikit-image==')
    with open('/content/constraints.txt', 'w') as f:
        f.write(''.join(l + '\n' for l in frozen.splitlines() if l.lower().startswith(keep)))
    if not os.path.exists(REPO):
        sh(f'git clone -q https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git {REPO}')
    sh(f'git checkout -q {HUNYUAN_COMMIT}', cwd=REPO)
    sh("pip install -q -c /content/constraints.txt 'transformers==4.57.3' 'diffusers==0.34.0' "
       "'huggingface_hub>=0.34,<1.0' 'accelerate>=1.0' omegaconf einops pymeshlab xatlas pygltflib "
       "trimesh onnxruntime pybind11 ninja")
    sh('pip install -q -c /content/constraints.txt --no-deps rembg pymatting')
    sh(f'pip install -q --no-deps -e {REPO}')
    import torch
    tag = f"torch{torch.__version__.split('+')[0]}-cu{torch.version.cuda}-sm{''.join(map(str, torch.cuda.get_device_capability(0)))}"
    cache = os.path.join(WHEELS, tag)
    os.makedirs(cache, exist_ok=True)
    # Колёса CUDA-расширений собираются ~5 минут - собираем один раз и храним на Drive
    if not glob.glob(os.path.join(cache, 'custom_rasterizer-*.whl')):
        cap = torch.cuda.get_device_capability(0)
        os.environ['TORCH_CUDA_ARCH_LIST'] = f'{cap[0]}.{cap[1]}'
        sh(f'pip wheel -q --no-build-isolation --no-deps -w {cache} .',
           cwd=f'{REPO}/hy3dgen/texgen/custom_rasterizer')
    sh(f'pip install -q --no-deps {glob.glob(os.path.join(cache, "custom_rasterizer-*.whl"))[0]}')
    suffix = sysconfig.get_config_var('EXT_SUFFIX')
    so_name = 'mesh_processor' + suffix
    so_cache = os.path.join(cache, so_name)
    so_dst = f'{REPO}/hy3dgen/texgen/differentiable_renderer/{so_name}'
    if not os.path.exists(so_cache):
        sh(f'c++ -O3 -shared -std=c++11 -fPIC $({sys.executable} -m pybind11 --includes) mesh_processor.cpp -o {so_name}',
           cwd=f'{REPO}/hy3dgen/texgen/differentiable_renderer')
        shutil.copy2(so_dst, so_cache)
    else:
        shutil.copy2(so_cache, so_dst)
    open('/content/.hy3d_single_ready', 'w').close()
    print(f'setup done in {time.time() - t0:.0f} s', flush=True)


setup()
for path in (REPO,):
    if path not in sys.path:
        sys.path.insert(0, path)

import torch  # noqa: E402
import trimesh  # noqa: E402
from PIL import Image  # noqa: E402

SHAPE_SUBFOLDER = 'hunyuan3d-dit-v2-0'
PAINT_SUBFOLDER = 'hunyuan3d-paint-v2-0'
# Персонажам хватит меньшего числа граней (в игре они ~90 px), зданиям нужна геометрия покрупнее,
# тайникам и сейфам - поменьше (их на карте много). Дальше всё равно упрощает optimize_models_blender.py
MAX_FACES = {'toad': 40000, 'building': 60000, 'container': 25000, 'safe': 15000, 'prop': 25000}
OCTREE = 384


def kind(name):
    prefix = name.split('_', 1)[0]
    return prefix if prefix in MAX_FACES else 'prop'


def pending():
    names = []
    for path in sorted(glob.glob(os.path.join(IN_DIR, '*.png'))):
        name = os.path.splitext(os.path.basename(path))[0]
        if name.startswith(('character-', 'used-')):
            continue
        if os.path.exists(os.path.join(OUT_DIR, name + '.glb')):
            print('skip (done):', name)
            continue
        names.append((name, path))
    return names


def free():
    gc.collect()
    torch.cuda.empty_cache()


def make_shapes(items):
    todo = [(n, p) for n, p in items if not os.path.exists(os.path.join(WORK, n + '_shape.glb'))]
    if not todo:
        return
    from hy3dgen.shapegen import (Hunyuan3DDiTFlowMatchingPipeline, FloaterRemover,
                                  DegenerateFaceRemover, FaceReducer)
    pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        'tencent/Hunyuan3D-2', subfolder=SHAPE_SUBFOLDER, variant='fp16', torch_dtype=torch.float16)
    for name, path in todo:
        t0 = time.time()
        image = Image.open(path).convert('RGBA')
        mesh = pipe(image=image, num_inference_steps=50, guidance_scale=5.0, octree_resolution=OCTREE,
                    num_chunks=8000, generator=torch.Generator('cuda').manual_seed(1234),
                    output_type='trimesh')[0]
        raw = len(mesh.faces)
        mesh = FloaterRemover()(mesh)
        mesh = DegenerateFaceRemover()(mesh)
        mesh = FaceReducer()(mesh, max_facenum=MAX_FACES[kind(name)])
        mesh.export(os.path.join(WORK, name + '_shape.glb'))
        print(f'shape {name}: {raw:,} -> {len(mesh.faces):,} faces, {time.time() - t0:.0f} s', flush=True)
        free()
    del pipe
    free()


def make_textures(items):
    from hy3dgen.texgen import Hunyuan3DPaintPipeline
    paint = Hunyuan3DPaintPipeline.from_pretrained('tencent/Hunyuan3D-2', subfolder=PAINT_SUBFOLDER)
    paint.enable_model_cpu_offload()
    for name, path in items:
        shape_path = os.path.join(WORK, name + '_shape.glb')
        out_path = os.path.join(OUT_DIR, name + '.glb')
        if not os.path.exists(shape_path) or os.path.exists(out_path):
            continue
        t0 = time.time()
        mesh = trimesh.load(shape_path, force='mesh')
        image = Image.open(path).convert('RGBA')
        try:
            textured = paint(mesh, image=image)
        except torch.cuda.OutOfMemoryError:
            print(f'texture {name}: out of VRAM, skipped', flush=True)
            free()
            continue
        textured.export(out_path)
        print(f'texture {name}: {time.time() - t0:.0f} s -> {out_path}', flush=True)
        free()
    del paint
    free()


items = pending()
print(len(items), 'to generate:', ', '.join(n for n, _ in items), flush=True)
if items:
    make_shapes(items)
    make_textures(items)
print('done; GLB in', OUT_DIR)
