"""Звуки игры из CC0-библиотек: отобрать, обрезать тишину и хвосты, выровнять громкость, сжать в OGG.

    python tools/build_sounds.py <папка со скачанными наборами>

Наборы (все CC0, источники и ссылки — assets/sounds/CREDITS.md) раскладываются в папке по подпапкам:
    impact/  — Kenney «Impact Sounds»        rpg/   — Kenney «RPG Audio»
    scifi/   — Kenney «Sci-fi Sounds»        swish/ — artisticdude «Swishes Sound Pack»
    mud/     — rubberduck «25 CC0 mud sfx»   slime/ — rubberduck «40 CC0 water / splash / slime SFX»
    firearm/ — «The Free Firearm Sound Library» (Prepared, распакованный 7z)
Пишет assets/sounds/<имя>.ogg (моно, 44,1 кГц, Vorbis q4). Что звучит где — src/sounds.js (BANK).
Нужен ffmpeg в PATH.
"""
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'sounds')
SR = 44100

# имя: (путь в наборах, {start — откуда взять, с; dur — сколько, с; fade — затухание в конце, с; peak — пик, дБ})
# Пути с * — первый подходящий файл (у библиотеки оружия длинные имена)
SOUNDS = {}


def add(prefix, files, **opt):
    # Элемент — путь или (путь, свои параметры): у записей оружия в одном файле несколько выстрелов
    for i, f in enumerate(files):
        path, own = f if isinstance(f, tuple) else (f, {})
        SOUNDS[f'{prefix}_{i + 1}'] = (path, {**opt, **own})


K = 'impact/Audio/'
R = 'rpg/Audio/'
F = 'scifi/Audio/'
kenney = lambda base, name, ids: [f'{base}{name}_{i:03d}.ogg' for i in ids]

# Бита и удары
add('swish', [f'swish/swishes/swish-{i}.wav' for i in (3, 4, 5, 6, 7, 8)], dur=0.25)
add('punch_h', kenney(K, 'impactPunch_heavy', range(5)))
add('punch_m', kenney(K, 'impactPunch_medium', range(5)))
add('splat', ['slime/slime_16.ogg', 'slime/slime_04.ogg', 'mud/mud_11.ogg', 'mud/mud_08.ogg'], dur=0.3)
add('metal_h', kenney(K, 'impactMetal_heavy', range(5)))
add('metal_m', kenney(K, 'impactMetal_medium', range(5)))
add('metal_l', kenney(K, 'impactMetal_light', range(3)))
add('plate_h', kenney(K, 'impactPlate_heavy', range(3)))
add('tin', kenney(K, 'impactTin_medium', range(3)))
add('wood_h', kenney(K, 'impactWood_heavy', range(3)))
add('wood_m', kenney(K, 'impactWood_medium', range(2)))
add('plank', kenney(K, 'impactPlank_medium', range(3)))
add('wood_l', kenney(K, 'impactWood_light', range(2)))
add('glass_h', kenney(K, 'impactGlass_heavy', range(3)))
add('glass_l', kenney(K, 'impactGlass_light', range(3)))
add('mining', kenney(K, 'impactMining', range(3)))
add('soft_h', kenney(K, 'impactSoft_heavy', range(4)))
add('soft_m', kenney(K, 'impactSoft_medium', range(3)))
# Шаги: люди — бетон, трава, снег (щебень), грязь (слизь)
add('step_conc', kenney(K, 'footstep_concrete', range(5)))
add('step_grass', kenney(K, 'footstep_grass', range(5)))
add('step_snow', kenney(K, 'footstep_snow', range(5)))
add('step_mud', ['mud/mud_24.ogg', 'mud/mud_25.ogg', 'mud/mud_06.ogg', 'mud/mud_10.ogg'], dur=0.25)
# Жабы (выбрано на слух): по асфальту — босая нога пониже, по земле — трава пониже, в слизи — трава и капля
add('step_bare', [R + f'footstep0{i}.ogg' for i in (0, 2, 6, 7)])
add('drip', ['slime/slime_16.ogg'], dur=0.06, fade=0.03)
# Энергетическое оружие, моторы, взрывы
add('plasma', kenney(F, 'laserLarge', (0, 1, 3)), dur=0.5)
add('laser_s', kenney(F, 'laserSmall', (1, 2, 0)))
add('pew', [F + 'laserSmall_001.ogg'])     # лазерный бластер — очередь коротких «пиу» (выбрано на слух)
add('motor', [F + 'spaceEngineSmall_000.ogg'], start=1.0, dur=2.0, fade=0.01, lead=False)
add('thruster', [F + 'thrusterFire_003.ogg'], start=1.1, dur=0.9, fade=0.25, lead=False)
add('boom', kenney(F, 'lowFrequency_explosion', (1, 0)), dur=1.0, fade=0.3)
add('crunch', kenney(F, 'explosionCrunch', (0, 1)), dur=1.2, fade=0.3)
# Боссы, громила, дрель (выбрано на слух в прослушке): лезвие из ножен, силовое поле, научно-фантастический металл,
# глухие и хрустящие взрывы — с громкостью записи (keep)
add('knife_draw', [R + 'drawKnife3.ogg'], keep=True, lead=False)
add('field0', [F + 'forceField_000.ogg'], keep=True, lead=False)
add('field1', [F + 'forceField_001.ogg'], keep=True, lead=False)
add('field2', [F + 'forceField_002.ogg'], keep=True, lead=False)
add('scimetal', kenney(F, 'impactMetal', range(4)), keep=True, lead=False)
add('lowboom', [F + 'lowFrequency_explosion_000.ogg'], keep=True, lead=False)
add('lowboom2', [F + 'lowFrequency_explosion_001.ogg'], keep=True, lead=False)
add('crunch3', [F + 'explosionCrunch_002.ogg'], keep=True, lead=False)
add('crunch4', [F + 'explosionCrunch_003.ogg'], keep=True, lead=False)
# Выстрелы — The Free Firearm Sound Library: start — момент выстрела в записи (с), near — вблизи (у Василия),
# far — со средней дистанции, с эхом (выжившие и чужие выстрелы вдали). ПМ — Bersa .380 (9×17, ближе всего к
# 9×18) и Walther PPQ 9 мм, обрез — дробовики 12-го калибра Mossberg, Nova, Winchester Model 12
G = 'firearm/x/Prepared SFX Library/'
shot = lambda f, t: (G + f, {'start': max(0.0, t - 0.02)})
add('pm', [shot('Bersa/F_47P.wav', 0.33), shot('Bersa/F_47P.wav', 4.415), shot('Walther PPQ/X_39P.wav', 1.41)],
    dur=0.8, fade=0.35)
add('pm_far', [shot('Bersa/F_41P.wav', 0.435), shot('Bersa/F_41P.wav', 4.815), shot('Walther PPQ/X_31P.wav', 1.085)],
    dur=1.1, fade=0.5)
add('sg', [shot('Mossberg/N_30P.wav', 1.7), shot('Mossberg/N_30P.wav', 4.97), shot('Nova/O_21P.wav', 0.43),
           shot('Nova/O_21P.wav', 3.47), shot('Model 12/K_22P.wav', 0.84)], dur=1.0, fade=0.45)
add('sg_far', [shot('Nova/O_17P.wav', 0.695), shot('Nova/O_17P.wav', 3.715), shot('Mossberg/N_26P.wav', 0.785)],
    dur=1.3, fade=0.6)
# Тайники: скрип, двери, защёлки, железо, ткань, бумага, цепь
add('creak', [R + 'creak1.ogg', R + 'creak2.ogg', R + 'creak3.ogg'])
add('door', [R + 'doorOpen_1.ogg', R + 'doorOpen_2.ogg'])
add('latch', [R + 'metalLatch.ogg'])
add('click', [R + 'metalClick.ogg'])
add('pot', [R + 'metalPot1.ogg', R + 'metalPot2.ogg', R + 'metalPot3.ogg'])
add('cloth', [R + 'cloth1.ogg', R + 'cloth2.ogg', R + 'cloth3.ogg'])
add('coins', [R + 'handleCoins.ogg'])
add('paper', [R + 'bookFlip1.ogg', R + 'bookFlip3.ogg'])


def load(path, start=0.0, dur=None):
    cmd = ['ffmpeg', '-v', 'quiet', '-ss', str(start), '-i', path]
    if dur:
        cmd += ['-t', str(dur)]
    cmd += ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).copy()


def trim_lead(x, thr_db=-45):
    """Срезать тишину в начале (до первого звука выше порога), оставить 2 мс перед атакой."""
    a = np.abs(x)
    thr = a.max() * 10 ** (thr_db / 20)
    idx = np.argmax(a > thr)
    return x[max(0, idx - int(SR * 0.002)):]


def trim_tail(x, thr_db=-50):
    a = np.abs(x)
    thr = a.max() * 10 ** (thr_db / 20)
    above = np.where(a > thr)[0]
    return x[:above[-1] + int(SR * 0.01)] if len(above) else x


def process(src, opt):
    x = load(src, opt.get('start', 0.0), opt.get('dur'))
    if opt.get('lead', True):
        x = trim_lead(x)
    x = trim_tail(x)
    if 'dur' in opt and len(x) > int(SR * opt['dur']):
        x = x[:int(SR * opt['dur'])]
    fade = int(SR * opt.get('fade', 0.03))
    if 0 < fade < len(x):
        x[-fade:] *= np.linspace(1, 0, fade) ** 2
    x[:int(SR * 0.002)] *= np.linspace(0, 1, int(SR * 0.002))
    peak = np.abs(x).max()
    # keep — громкость как в записи: подобрано на слух в прослушке, где файлы звучали без выравнивания
    if peak > 0 and not opt.get('keep'):
        x *= 10 ** (opt.get('peak', -1.0) / 20) / peak
    return x


def save(x, path):
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libvorbis', '-q:a', '4', path], input=x.astype(np.float32).tobytes(), check=True)


def resolve(base, rel):
    if '*' not in rel:
        return os.path.join(base, rel)
    import glob
    hits = sorted(glob.glob(os.path.join(base, rel), recursive=True))
    if not hits:
        raise FileNotFoundError(rel)
    return hits[0]


def main():
    base = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name, (rel, opt) in SOUNDS.items():
        src = resolve(base, rel)
        x = process(src, opt)
        path = os.path.join(OUT, name + '.ogg')
        save(x, path)
        total += os.path.getsize(path)
        print(f'{name:22s} {len(x) / SR:5.2f} s  {os.path.getsize(path) // 1024:4d} KB  <- {rel}')
    print(f'{len(SOUNDS)} files, {total // 1024} KB')


if __name__ == '__main__':
    main()
