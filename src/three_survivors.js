/**
 * Выжившие у пролома в 3D (оборона, src/defense.js). Модели и клипы — tools/build_promzona_survivors_blender.py:
 * полные позы на скелете из 12 костей, оружие жёстко в правой руке, кость Muzzle — дуло.
 * Кадры рендерятся как у жаб (three_enemies.js): 16 направлений, ракурс камеры игры, в кэш — картинкой.
 * Рендерер и холст общие с ThreeEnemyManager (свой WebGL-контекст не нужен), сцена и камера — свои.
 * Модели грузятся, только пока оборона не пройдена (game.js, экран загрузки).
 */
const SURVIVOR_IDS = ['stepanych', 'zina', 'tolik', 'lena', 'seryoga'];
// Поза → [клип, кадров, доля клипа для одиночного кадра]. walk/limp — 6 кадров шага, heal — 4 кадра бинтования
const SURVIVOR_POSES = {
  walk: ['Walk', 6], limp: ['Limp', 6], heal: ['Heal', 4],
  idle: ['Idle', 1, 0], aim: ['Aim', 1, 0], fire: ['Fire', 1, 0.5], lie: ['Lie', 1, 0]
};
// Кадр на экране: SURVIVOR_FRAME px на 2,45 м — масштаб Василия (three_character.js: 110 px)
const SURVIVOR_FRAME = 110;
const SURVIVOR_DIRS = 16;
// Длина шага на экране: цикл из двух шагов ~1,4 м — 6 кадров
const SURVIVOR_STRIDE_PX = 62;

class ThreeSurvivorManager {
  constructor() {
    this.models = {};
    this.mixers = {};
    this.clips = {};
    this.roots = {};
    this.cache = new Map();
    this.muzzles = new Map();
    this.requested = null;
    this.settled = new Set();

    this.scene = new THREE.Scene();
    // Свет — направления как у Василия и жаб, рассеянного меньше: у моделей Rodin свет уже в текстуре,
    // и под ровным светом они выглядели плоскими и выгоревшими
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const key = new THREE.DirectionalLight(0xfff7ed, 2.4);
    key.position.set(2, 7, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fill.position.set(-3, 4, 3);
    this.scene.add(fill);

    const f = 2.45;
    this.camera = new THREE.OrthographicCamera(-f / 2, f / 2, f / 2, -f / 2, 0.1, 50);
    const pitch = 28 * Math.PI / 180;
    this.camera.position.set(0, 6 * Math.sin(pitch), 6 * Math.cos(pitch));
    this.camera.lookAt(0, 0.9, 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    // Где на кадре земля под ногами (корень модели): кадр рисуется так, чтобы она легла на точку выжившего
    const g = new THREE.Vector3(0, 0, 0).project(this.camera);
    this.ground = { x: (g.x + 1) / 2 * SURVIVOR_FRAME, y: (1 - g.y) / 2 * SURVIVOR_FRAME };
  }

  // Запросить модели (повторные вызовы ничего не делают). Когда всё загружено — прогрев кадров в простое
  load() {
    if (this.requested) return;
    this.requested = new Set(SURVIVOR_IDS);
    if (typeof THREE.GLTFLoader === 'undefined') {
      this.requested = null;
      setTimeout(() => this.load(), 200);
      return;
    }
    const loader = new THREE.GLTFLoader();
    let pending = SURVIVOR_IDS.length;
    const onSettled = id => {
      this.settled.add(id);
      if (--pending === 0) this.schedulePrewarm();
    };
    SURVIVOR_IDS.forEach(id => {
      loader.load(`assets/models/survivor_${id}.glb?v=1137`, gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child.isMesh && child.material) {
            const mat = child.material;
            mat.depthWrite = true;
            mat.alphaTest = 0.4;
            mat.transparent = false;
            if (mat.map) {
              mat.map.minFilter = THREE.LinearFilter;
              mat.map.magFilter = THREE.LinearFilter;
              mat.map.needsUpdate = true;
            }
          }
        });
        const root = new THREE.Group();
        root.visible = false;
        root.add(model);
        this.scene.add(root);
        this.roots[id] = root;
        this.models[id] = model;
        this.mixers[id] = new THREE.AnimationMixer(model);
        this.clips[id] = {};
        gltf.animations.forEach(c => { this.clips[id][c.name.split('_').pop()] = c; });
        onSettled(id);
      }, undefined, err => {
        console.error(`[ThreeSurvivorManager] Failed to load ${id}:`, err);
        onSettled(id);
      });
    });
  }

  allSettled() {
    return !!this.requested && SURVIVOR_IDS.every(id => this.settled.has(id));
  }

  ready(id) {
    return !!this.models[id];
  }

  dirIndex(angle) {
    const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.round(a / (Math.PI * 2) * SURVIVOR_DIRS) % SURVIVOR_DIRS;
  }

  // Кадр шага по пройденному пути (px)
  stepFrame(dist) {
    return Math.floor(dist / (SURVIVOR_STRIDE_PX / 6)) % 6;
  }

  // Поставить модель в позу: клип, кадр, направление. false — нет такого клипа
  pose(id, pose, dirIdx, frameIdx) {
    const def = SURVIVOR_POSES[pose];
    const clip = def && this.clips[id][def[0]];
    if (!clip) return false;
    for (const k in this.roots) this.roots[k].visible = k === id;
    this.roots[id].rotation.y = -(dirIdx / SURVIVOR_DIRS) * Math.PI * 2 + Math.PI / 2;
    const mixer = this.mixers[id];
    mixer.stopAllAction();
    mixer.clipAction(clip).play();
    const t = def[1] > 1 ? (frameIdx % def[1]) / def[1] * clip.duration : clip.duration * def[2];
    mixer.setTime(t);
    return true;
  }

  frame(id, pose, dirIdx, frameIdx) {
    const key = `${id}_${pose}_${dirIdx}_${frameIdx}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    if (!this.models[id] || !window.threeEnemies || !this.pose(id, pose, dirIdx, frameIdx)) return null;
    const renderer = window.threeEnemies.renderer;
    renderer.render(this.scene, this.camera);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SURVIVOR_FRAME;
    const c = canvas.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(renderer.domElement, 0, 0, SURVIVOR_FRAME, SURVIVOR_FRAME);
    this.cache.set(key, canvas);
    promoteFrameToImage(this.cache, key, canvas);
    return canvas;
  }

  /**
   * Кадр выжившего и где он лежит относительно его точки (ноги; у лежащего — середина тела):
   * { frame, ox, oy, size } или null, пока модель грузится
   */
  sprite(id, pose, angle, frameIdx = 0) {
    const n = (SURVIVOR_POSES[pose] || [0, 1])[1];
    const frame = this.frame(id, pose, this.dirIndex(angle), n > 1 ? frameIdx % n : 0);
    return frame && { frame, ox: -this.ground.x, oy: -this.ground.y, size: SURVIVOR_FRAME };
  }

  // Дуло в позе прицела (px от точки выжившего); behind — за фигурой. null — нет модели или дула
  muzzle(id, pose, angle) {
    const dirIdx = this.dirIndex(angle);
    const key = `${id}_${pose}_${dirIdx}`;
    if (this.muzzles.has(key)) return this.muzzles.get(key);
    if (!this.models[id]) return null;
    const model = this.models[id];
    const bone = model.getObjectByName('Muzzle'), spine = model.getObjectByName('Spine');
    if (!bone || !spine || !this.pose(id, pose, dirIdx, 0)) return null;
    model.updateMatrixWorld(true);
    const world = bone.getWorldPosition(new THREE.Vector3());
    const look = this.camera.getWorldDirection(new THREE.Vector3());
    const behind = world.dot(look) > spine.getWorldPosition(new THREE.Vector3()).dot(look);
    const p = world.project(this.camera);
    const m = { x: (p.x + 1) / 2 * SURVIVOR_FRAME - this.ground.x, y: (1 - p.y) / 2 * SURVIVOR_FRAME - this.ground.y, behind };
    this.muzzles.set(key, m);
    return m;
  }

  /**
   * Прогрев в простое (экран загрузки прогоняет очередь): стрелки стоят, целятся и стреляют во все стороны;
   * шаг — на южную половину (на отходе идут к пролому, остальное дорисуется по ходу); Лена бинтует,
   * Серёга лежит головой на запад (направление 0 — лицом на восток)
   */
  schedulePrewarm() {
    const tasks = [];
    const add = (id, pose, dirs, frames) => {
      if (!this.models[id] || !this.clips[id][SURVIVOR_POSES[pose][0]]) return;
      dirs.forEach(d => { for (let f = 0; f < frames; f++) tasks.push(() => this.frame(id, pose, d, f)); });
    };
    const all = [...Array(SURVIVOR_DIRS).keys()];
    const south = all.slice(0, SURVIVOR_DIRS / 2 + 1);
    ['stepanych', 'zina', 'tolik'].forEach(id => {
      ['idle', 'aim', 'fire'].forEach(p => add(id, p, all, 1));
      add(id, 'walk', south, 6);
      tasks.push(() => all.forEach(d => this.muzzle(id, 'aim', d / SURVIVOR_DIRS * Math.PI * 2)));
    });
    add('lena', 'heal', all, 4);
    add('lena', 'idle', all, 1);
    add('lena', 'walk', south, 6);
    add('seryoga', 'lie', [0], 1);
    add('seryoga', 'limp', south, 6);
    runIdleTasks(tasks);
  }
}

window.threeSurvivors = new ThreeSurvivorManager();
