/**
 * ThreeEnemyManager
 * 2.5D Real-Time WebGL Multi-Enemy Renderer for "Василий против пришельцев"
 * 
 * Renders the 3 authentic 3D dieselpunk alien models:
 * 1. Toad Grunt: Muscular frog shock trooper with road hazard sign armor and toxic canister gun.
 * 2. Toad Sniper: Lean ghillie camo scout with long pipe sniper rifle and NVG monocle.
 * 3. Toad Brute: Massive hulking tank with truck bumper collar and glowing acidic boils.
 * 
 * Uses offscreen Three.js WebGL rendering with discrete directional pose caching
 * to guarantee locked 60 FPS even when dozens of enemies are on screen.
 */

/**
 * Runs small tasks in browser idle time without blocking frames (also used by three_props.js).
 * At least one task runs per callback so the queue still drains when the main thread is never idle.
 */
function runIdleTasks(tasks) {
  const requestIdle = window.requestIdleCallback
    ? (cb) => window.requestIdleCallback(cb, { timeout: 300 })
    : (cb) => setTimeout(() => cb({ timeRemaining: () => 4 }), 50);

  const step = (deadline) => {
    do {
      tasks.shift()();
    } while (tasks.length > 0 && deadline.timeRemaining() > 3);
    if (tasks.length > 0) requestIdle(step);
  };
  if (tasks.length > 0) requestIdle(step);
}

/**
 * Replaces a cached frame <canvas> with a decoded <img> once it is ready (also used by three_props.js).
 * Chrome "hibernates" 2D canvases when the tab gets hidden (minimised, or the window fully covered
 * by another app); canvases that are only drawn *from* never wake up, and each drawImage from them
 * becomes ~10x slower until reload. Decoded images are not affected.
 */
function promoteFrameToImage(cache, key, canvas) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const img = new Image();
    // The object URL is kept alive on purpose: the browser may drop decoded pixels and re-read src
    img.src = URL.createObjectURL(blob);
    img.decode().then(() => {
      if (cache.get(key) === canvas) cache.set(key, img);
    }).catch(() => {});
  });
}

// Позы броска громилы (см. applyBrutePose и updateBruteThrow в game.js): lift0…lift3 — предмет
// поднимается от груди до положения над головой, throw — руки выброшены вперёд после броска,
// slam — кулаки врезались в землю (удар по земле, updateBruteSlam)
const BRUTE_LIFT_STEPS = 4;
const BRUTE_THROW_POSES = ['lift0', 'lift1', 'lift2', 'lift3', 'throw', 'slam'];
// Направления плеча (плечевой сустав → локоть) и предплечья (локоть → кулак) в осях
// [вверх, вперёд — куда смотрит громила, наружу от позвоночника]. Между chest и overhead —
// промежуточные шаги подъёма
const BRUTE_POSE_DIRS = {
  chest: { arm: [-0.35, 1.0, 0.35], fore: [0.35, 1.0, -0.45] },
  overhead: { arm: [0.8, 0.15, 0.6], fore: [0.45, 0.1, -0.9] },
  throw: { arm: [0.1, 1.0, 0.1], fore: [0.15, 1.0, -0.15] },
  slam: { arm: [-0.55, 0.8, 0.25], fore: [-0.9, 0.35, -0.1] }
};
// Обычный кадр громилы: 138 px мира, центр на 16 px выше его точки. Кадр позы выше: поднятые
// руки торчат над головой и иначе обрезались бы
const BRUTE_FRAME = { w: 138, anchor: -16 };
// Кадр пехотинца (и запасной для остальных): 86 px мира, центр на 10 px выше его точки
const GRUNT_FRAME = { w: 86, anchor: -10 };
const BRUTE_POSE_FRAME = { w: 170, anchor: -37 };

function brutePoseDirs(pose) {
  if (pose === 'throw' || pose === 'slam') return BRUTE_POSE_DIRS[pose];
  const k = Number(pose.slice(4)) / (BRUTE_LIFT_STEPS - 1);
  const mix = (a, b) => {
    const la = Math.hypot(...a), lb = Math.hypot(...b);
    return a.map((x, i) => x / la + (b[i] / lb - x / la) * k);
  };
  const { chest, overhead } = BRUTE_POSE_DIRS;
  return { arm: mix(chest.arm, overhead.arm), fore: mix(chest.fore, overhead.fore) };
}

class ThreeEnemyManager {
  constructor() {
    this.models = {
      grunt: null,
      sniper: null,
      brute: null
    };

    this.mixers = {
      grunt: null,
      sniper: null,
      brute: null
    };

    this.actions = {
      grunt: null,
      sniper: null,
      brute: null
    };

    this.isLoaded = {
      grunt: false,
      sniper: false,
      brute: false
    };

    // Frame cache: Map<key, HTMLCanvasElement → HTMLImageElement once decoded (see promoteFrameToImage)>
    this.cache = new Map();

    // Кулаки громилы в кадрах поз броска: ключ кадра → {x, y} от его точки (см. getBruteFists)
    this.bruteFists = new Map();
    this.bruteSkin = null;
    // Рот пехотинца по направлениям: отсюда вылетает язык (см. getGruntMouth)
    this.gruntMouths = new Map();
    this.gruntMouthLocal = null;

    // Offscreen Three.js setup
    this.width = 160;
    this.height = 160;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.scene = new THREE.Scene();

    // 2.5D Orthographic Camera matching Vasily's perspective
    const frustumSize = 2.45;
    this.frustumSize = frustumSize;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize / 2,
      frustumSize / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      50
    );

    const pitch = 28 * (Math.PI / 180);
    const camDist = 6.0;
    this.camera.position.set(0, camDist * Math.sin(pitch), camDist * Math.cos(pitch));
    this.camera.lookAt(0, 0.9, 0);

    // Studio Lighting for Novokhmurinsk
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    this.keyLight.position.set(2, 7, 5);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x93c5fd, 1.0);
    this.fillLight.position.set(-3, 4, 3);
    this.scene.add(this.fillLight);

    // Root containers for each enemy type in the scene
    this.roots = {
      grunt: new THREE.Group(),
      sniper: new THREE.Group(),
      brute: new THREE.Group()
    };

    for (const key in this.roots) {
      this.roots[key].visible = false;
      this.scene.add(this.roots[key]);
    }

    // Number of quantized directions and walk animation frames
    this.numDirections = 16;
    this.numFrames = 6;

    this.loadAllModels();
  }

  loadAllModels() {
    if (typeof THREE.GLTFLoader === 'undefined') {
      setTimeout(() => this.loadAllModels(), 200);
      return;
    }

    const loader = new THREE.GLTFLoader();
    const configs = [
      { type: 'grunt',  file: 'assets/models/toad_grunt.glb' },
      { type: 'sniper', file: 'assets/models/toad_sniper.glb' },
      { type: 'brute',  file: 'assets/models/toad_brute.glb' }
    ];

    let pending = configs.length;
    const onSettled = () => {
      if (--pending === 0) this.schedulePrewarm();
    };

    configs.forEach(cfg => {
      loader.load(
        cfg.file + '?v=1030',
        (gltf) => {
          const model = gltf.scene;
          this.models[cfg.type] = model;

          // Configure robust depth testing & texture filtering
          model.traverse((child) => {
            if (child.isMesh && child.material) {
              const mat = child.material;
              mat.depthWrite = true;
              mat.alphaTest = 0.4;
              mat.transparent = false;
              if (mat.map) {
                mat.map.minFilter = THREE.NearestFilter;
                mat.map.magFilter = THREE.NearestFilter;
                mat.map.needsUpdate = true;
              }
            }
          });

          // Animation setup
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.setLoop(THREE.LoopRepeat);
            action.play();
            this.mixers[cfg.type] = mixer;
            this.actions[cfg.type] = action;
          }

          // Special scale adjustments if needed
          if (cfg.type === 'brute') {
            model.scale.set(1.05, 1.05, 1.05);
            this.bruteSkin = this.buildBruteArmSkin(model);
          }

          this.roots[cfg.type].add(model);
          this.isLoaded[cfg.type] = true;
          console.log(`[ThreeEnemyManager] 3D Model loaded: ${cfg.type}`);
          onSettled();
        },
        undefined,
        (err) => {
          console.error(`[ThreeEnemyManager] Failed to load ${cfg.file}:`, err);
          onSettled();
        }
      );
    });
  }

  /**
   * Background cache warm-up: renders every pose (type × 16 directions × 6 frames) during browser idle time,
   * so shader compilation (~25–55 ms on first render of a type) and new-pose WebGL renders
   * don't cause frame hitches mid-fight.
   */
  schedulePrewarm() {
    const tasks = [];
    for (const type of ['grunt', 'sniper', 'brute']) {
      if (!this.isLoaded[type]) continue;
      for (let dirIdx = 0; dirIdx < this.numDirections; dirIdx++) {
        for (let frameIdx = 0; frameIdx < this.numFrames; frameIdx++) {
          tasks.push(() => this.getFrameCanvas(type, dirIdx, frameIdx));
        }
      }
    }
    // Позы броска громилы — тоже заранее, чтобы первый бросок в новую сторону не дёргал кадр
    if (this.isLoaded.brute) {
      for (let dirIdx = 0; dirIdx < this.numDirections; dirIdx++) {
        BRUTE_THROW_POSES.forEach(pose => tasks.push(() => this.getFrameCanvas('brute', dirIdx, 0, pose)));
      }
    }
    runIdleTasks(tasks);
  }

  /**
   * Renders and caches a single 3D pose of the enemy
   */
  getFrameCanvas(type, dirIdx, frameIdx, pose = null) {
    const key = pose ? `${type}_${dirIdx}_${pose}` : `${type}_${dirIdx}_${frameIdx}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    if (!this.isLoaded[type] || !this.models[type]) {
      return null;
    }

    // Hide all types, show target type
    for (const k in this.roots) {
      this.roots[k].visible = (k === type);
    }

    // Set target rotation:
    // In 2D game canvas:
    //   angle 0 = Right, PI/2 = Down (towards camera), PI = Left, 3PI/2 = Up (away from camera)
    // In Three.js:
    //   rotY = 0 -> Down (South, towards camera, showing front)
    //   rotY = PI -> Up (North, away from camera, showing back)
    //   rotY = +PI/2 -> Right (+X)
    //   rotY = -PI/2 -> Left (-X)
    const angle = (dirIdx / this.numDirections) * Math.PI * 2;
    const targetRotation = -angle + Math.PI / 2;
    this.roots[type].rotation.y = targetRotation;

    // Set animation time
    if (this.mixers[type] && this.actions[type]) {
      const clipDuration = this.actions[type].getClip().duration || 1.0;
      const t = (frameIdx / this.numFrames) * clipDuration;
      this.mixers[type].setTime(t);
    }

    // Поза броска поверх кадра ходьбы (руки после setTime — ходьба двигает те же кости)
    const posed = pose ? this.applyBrutePose(this.models[type], this.roots[type], pose) : null;

    // Camera height adjustment per enemy
    if (type === 'brute') {
      this.camera.zoom = 0.85;
      this.camera.lookAt(0, 1.15, 0);
    } else {
      this.camera.zoom = 1.0;
      this.camera.lookAt(0, 0.90, 0);
    }
    let size = this.width;
    if (posed) {
      // Кадр позы охватывает больше (BRUTE_POSE_FRAME) при той же плотности пикселей,
      // окно камеры сдвинуто вверх на разницу якорей
      const { w, anchor } = BRUTE_POSE_FRAME;
      size = Math.round(this.width * w / BRUTE_FRAME.w);
      this.camera.zoom = 0.85 * BRUTE_FRAME.w / w;
      const shift = (BRUTE_FRAME.anchor - anchor) * (this.frustumSize / this.camera.zoom) / w;
      this.camera.top = this.frustumSize / 2 + shift;
      this.camera.bottom = -this.frustumSize / 2 + shift;
      this.renderer.setSize(size, size, false);
    }
    this.camera.updateProjectionMatrix();

    // Render WebGL
    this.renderer.render(this.scene, this.camera);
    if (posed) {
      this.bruteFists.set(key, this.bruteFistsOnScreen(this.models[type]));
      // Вернуть кости рук и веса как были: микшер пишет не все значения при следующем setTime
      posed.forEach(([bone, q]) => bone.quaternion.copy(q));
      this.useBrutePoseSkin(false);
    }

    // Copy to dedicated 2D canvas for persistent caching
    const cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = size;
    cachedCanvas.height = size;
    const cctx = cachedCanvas.getContext('2d');
    cctx.drawImage(this.canvas, 0, 0);
    if (posed) {
      this.renderer.setSize(this.width, this.height, false);
      this.camera.top = this.frustumSize / 2;
      this.camera.bottom = -this.frustumSize / 2;
    }

    this.cache.set(key, cachedCanvas);
    promoteFrameToImage(this.cache, key, cachedCanvas);
    return cachedCanvas;
  }

  /**
   * Вторые веса скина громилы — для поз броска.
   * В модели длинные руки висят до колен, и кулаки с предплечьями привязаны в основном к костям бёдер,
   * а кости предплечий вершин почти не двигают: поднимешь руку — локоть уходит вверх, а кулак остаётся
   * у колена. Для поз каждая вершина руки переназначается по близости к костям (в позе привязки):
   * предплечье и кулак — на ForearmL/R (у локтя вперемешку с плечевой), плечо — на ArmL/R.
   * Ходьба рисуется с исходными весами: там кулаки качаются вместе с бёдрами, и это выглядит живо.
   */
  buildBruteArmSkin(model) {
    const meshes = [];
    model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
    if (meshes.length === 0) return null;
    const sk = meshes[0].skeleton;
    const bi = name => sk.bones.findIndex(b => b.name === name);
    if (['ArmL', 'ArmR', 'ForearmL', 'ForearmR', 'Pelvis', 'Head'].some(n => bi(n) < 0)) return null;
    const bonePos = name => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[bi(name)].clone().invert());
    const bindPos = (sm, i) => new THREE.Vector3()
      .fromBufferAttribute(sm.geometry.attributes.position, i).applyMatrix4(sm.bindMatrix);
    // Расстояние от точки до отрезка ab и где на нём ближайшая точка (0 — a, 1 — b)
    const segDist = (p, a, b) => {
      const ab = b.clone().sub(a);
      const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
      return [p.distanceTo(a.clone().addScaledVector(ab, t)), t];
    };
    const pelvis = bonePos('Pelvis'), head = bonePos('Head');
    const sides = {};
    ['L', 'R'].forEach(s => {
      const shoulder = bonePos('Arm' + s);
      const sign = Math.sign(shoulder.x);
      // Кулак висит у колена снаружи от ноги: дальше 0,58 от оси на высоте 0,15–1,3 — только
      // кисти и предплечья. Кулак — середина самых нижних из этих вершин
      const pts = [];
      meshes.forEach(sm => {
        for (let i = 0; i < sm.geometry.attributes.position.count; i++) {
          const p = bindPos(sm, i);
          if (p.x * sign > 0.58 && p.y > 0.15 && p.y < 1.3) pts.push(p);
        }
      });
      if (pts.length === 0) return;
      const minY = pts.reduce((m, p) => Math.min(m, p.y), Infinity);
      const low = pts.filter(p => p.y < minY + 0.12);
      const knee = bonePos('Shin' + s);
      sides[s] = {
        sign, A: bi('Arm' + s), F: bi('Forearm' + s),
        shoulder, elbow: bonePos('Forearm' + s),
        fist: low.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / low.length),
        hip: bonePos('Thigh' + s), foot: knee.clone().setY(0.05)
      };
    });
    if (!sides.L || !sides.R) return null;

    const swaps = meshes.map(sm => {
      const geo = sm.geometry;
      const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
      const fi = si.clone(), fw = sw.clone();
      for (let i = 0; i < si.count; i++) {
        const p = bindPos(sm, i);
        if (Math.abs(p.x) < 0.2) continue;
        const S = Math.sign(p.x) === sides.L.sign ? sides.L : sides.R;
        const [dF, tF] = segDist(p, S.elbow, S.fist);
        const [dU, tU] = segDist(p, S.shoulder, S.elbow);
        const other = Math.min(segDist(p, S.hip, S.foot)[0], segDist(p, pelvis, head)[0]);
        if (dF <= dU && dF < other && dF < 0.35 && p.y < 1.45) {
          const wf = Math.min(1, Math.max(0, (tF + 0.05) / 0.2));
          fi.setXYZW(i, S.F, S.A, 0, 0);
          fw.setXYZW(i, wf, 1 - wf, 0, 0);
        } else if (dU < dF && dU < other && dU < 0.4) {
          // У плечевого сустава остаётся часть старых весов (спина, голова) — иначе рвётся плечо
          const ka = Math.min(1, 0.4 + tU * 1.5);
          const idx = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)];
          const ws = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)];
          const m = new Map([[S.A, ka]]);
          for (let c = 0; c < 4; c++) {
            if (ws[c] > 0) m.set(idx[c], (m.get(idx[c]) || 0) + ws[c] * (1 - ka));
          }
          const top = [...m].sort((a, b) => b[1] - a[1]).slice(0, 4);
          const total = top.reduce((a, e) => a + e[1], 0);
          while (top.length < 4) top.push([0, 0]);
          fi.setXYZW(i, top[0][0], top[1][0], top[2][0], top[3][0]);
          fw.setXYZW(i, top[0][1] / total, top[1][1] / total, top[2][1] / total, top[3][1] / total);
        }
      }
      return { geo, walk: [si, sw], pose: [fi, fw] };
    });
    // Кулак в осях кости предплечья: с новыми весами он сидит на ней жёстко
    const fistLocal = {};
    ['L', 'R'].forEach(s => {
      fistLocal[s] = sides[s].fist.clone().applyMatrix4(sk.boneInverses[sides[s].F]);
    });
    return { swaps, fistLocal };
  }

  // Веса для поз броска (true) или исходные, для ходьбы (false)
  useBrutePoseSkin(on) {
    this.bruteSkin.swaps.forEach(k => {
      const [si, sw] = on ? k.pose : k.walk;
      k.geo.setAttribute('skinIndex', si);
      k.geo.setAttribute('skinWeight', sw);
    });
  }

  /**
   * Руки громилы для броска (game.js выставляет e.throwPose, см. BRUTE_THROW_POSES).
   * Плечо и предплечье поворачиваются так, чтобы «плечо → локоть» и «локоть → кулак» легли
   * на направления из BRUTE_POSE_DIRS. Возвращает исходные повороты костей, чтобы вернуть их
   * после рендера (веса возвращает useBrutePoseSkin(false)).
   */
  applyBrutePose(model, root, pose) {
    const spine = model.getObjectByName('Spine');
    if (!spine || !this.bruteSkin) return null;
    this.useBrutePoseSkin(true);
    model.updateMatrixWorld(true);
    const P = brutePoseDirs(pose);
    const up = new THREE.Vector3(0, 1, 0);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
    fwd.y = 0;
    fwd.normalize();
    const spinePos = spine.getWorldPosition(new THREE.Vector3());
    const saved = [];
    // Повернуть кость так, чтобы направление from → tip легло на target
    const aim = (bone, from, tip, target) => {
      saved.push([bone, bone.quaternion.clone()]);
      const cur = tip.sub(from).normalize();
      const worldQ = bone.getWorldQuaternion(new THREE.Quaternion());
      const delta = new THREE.Quaternion().setFromUnitVectors(cur, target);
      const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));
      bone.updateMatrixWorld(true);
    };
    ['L', 'R'].forEach(s => {
      const arm = model.getObjectByName('Arm' + s);
      const fore = model.getObjectByName('Forearm' + s);
      if (!arm || !fore) return;
      const shoulder = arm.getWorldPosition(new THREE.Vector3());
      const side = shoulder.clone().sub(spinePos);
      side.y = 0;
      side.normalize();
      const dir = d => new THREE.Vector3()
        .addScaledVector(up, d[0]).addScaledVector(fwd, d[1]).addScaledVector(side, d[2]).normalize();
      aim(arm, shoulder, fore.getWorldPosition(new THREE.Vector3()), dir(P.arm));
      const elbow = fore.getWorldPosition(new THREE.Vector3());
      aim(fore, elbow, fore.localToWorld(this.bruteSkin.fistLocal[s].clone()), dir(P.fore));
    });
    return saved;
  }

  // Середина между кулаками в только что отрисованном кадре позы, px мира от точки громилы
  bruteFistsOnScreen(model) {
    const { w, anchor } = BRUTE_POSE_FRAME;
    let x = 0, y = 0;
    ['L', 'R'].forEach(s => {
      const fore = model.getObjectByName('Forearm' + s);
      const p = fore.localToWorld(this.bruteSkin.fistLocal[s].clone()).project(this.camera);
      x += ((p.x + 1) / 2) * w - w / 2;
      y += ((1 - p.y) / 2) * w - w / 2 + anchor;
    });
    return { x: x / 2, y: y / 2 };
  }

  /**
   * Где кулаки громилы в позе броска (середина между ними, px мира от e.x, e.y) — game.js кладёт
   * туда поднятый предмет. null, пока модель не загружена: тогда game.js берёт средние высоты.
   */
  getBruteFists(e, pose) {
    if (!this.isLoaded.brute || !this.bruteSkin) return null;
    const dirIdx = this.dirIndex(e);
    const key = `brute_${dirIdx}_${pose}`;
    if (!this.bruteFists.has(key)) this.getFrameCanvas('brute', dirIdx, 0, pose);
    return this.bruteFists.get(key) || null;
  }

  /**
   * Рот пехотинца на экране (px мира от e.x, e.y) — отсюда game.js выпускает язык.
   * Точка рта — перёд морды (вершины головы, дальше всех выдающиеся вперёд), проецируется
   * той же камерой, что и кадры, для каждого направления один раз.
   */
  getGruntMouth(e) {
    if (!this.isLoaded.grunt) return null;
    const dirIdx = this.dirIndex(e);
    if (!this.gruntMouths.has(dirIdx)) this.gruntMouths.set(dirIdx, this.projectGruntMouth(dirIdx));
    return this.gruntMouths.get(dirIdx);
  }

  projectGruntMouth(dirIdx) {
    const model = this.models.grunt;
    const head = model.getObjectByName('Head');
    if (!head) return null;
    if (!this.gruntMouthLocal) {
      const meshes = [];
      model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
      const sk = meshes[0].skeleton;
      const hi = sk.bones.indexOf(head);
      const pts = [];
      meshes.forEach(sm => {
        const si = sm.geometry.attributes.skinIndex, sw = sm.geometry.attributes.skinWeight;
        const pos = sm.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const w = (si.getX(i) === hi ? sw.getX(i) : 0) + (si.getY(i) === hi ? sw.getY(i) : 0)
            + (si.getZ(i) === hi ? sw.getZ(i) : 0) + (si.getW(i) === hi ? sw.getW(i) : 0);
          if (w > 0.6) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(sm.bindMatrix));
        }
      });
      if (pts.length === 0) return null;
      const maxZ = pts.reduce((m, p) => Math.max(m, p.z), -Infinity);
      const front = pts.filter(p => p.z > maxZ - 0.06);
      const mouth = front.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / front.length);
      this.gruntMouthLocal = mouth.applyMatrix4(sk.boneInverses[hi]);
    }
    this.roots.grunt.rotation.y = -(dirIdx / this.numDirections) * Math.PI * 2 + Math.PI / 2;
    if (this.mixers.grunt) this.mixers.grunt.setTime(0);
    this.camera.zoom = 1.0;
    this.camera.lookAt(0, 0.9, 0);
    this.camera.updateProjectionMatrix();
    model.updateMatrixWorld(true);
    const p = head.localToWorld(this.gruntMouthLocal.clone()).project(this.camera);
    const { w, anchor } = GRUNT_FRAME;
    return { x: ((p.x + 1) / 2) * w - w / 2, y: ((1 - p.y) / 2) * w - w / 2 + anchor };
  }

  // Направление взгляда, округлённое до одного из numDirections кадров
  dirIndex(e) {
    let angle = e.angle !== undefined ? e.angle : (e.patrolAngle || 0);
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return Math.round((angle / (Math.PI * 2)) * this.numDirections) % this.numDirections;
  }

  /**
   * Main draw call invoked from game.js for each enemy
   */
  /**
   * Кадр жабы сейчас и где он лежит относительно её точки (e.x, e.y): { frame, ox, oy, size, anchorOffsetY }
   * или null, пока модель грузится. Общий для отрисовки и отбрасываемой тени (shadows.js).
   */
  sprite(e) {
    const type = e.type || 'grunt';
    if (!this.isLoaded[type]) return null;

    const dirIdx = this.dirIndex(e);

    // Quantize animation frame (walk stride)
    const animTimer = e.animTimer || 0;
    const frameIdx = Math.floor(animTimer * 1.2) % this.numFrames;

    const pose = type === 'brute' && e.throwPose ? e.throwPose : null;
    const frame = this.getFrameCanvas(type, dirIdx, frameIdx, pose);
    if (!frame) return null;

    // Render dimensions
    let renderW = GRUNT_FRAME.w;
    let anchorOffsetY = GRUNT_FRAME.anchor;

    if (type === 'sniper') {
      renderW = 82;
      anchorOffsetY = -10;
    } else if (type === 'brute') {
      renderW = BRUTE_FRAME.w;
      anchorOffsetY = BRUTE_FRAME.anchor;
    }
    // Кадр позы броска больше обычного (BRUTE_POSE_FRAME), фигура в нём того же размера
    const posed = pose && this.bruteFists.has(`brute_${dirIdx}_${pose}`);
    const size = posed ? BRUTE_POSE_FRAME.w : renderW;
    const frameY = posed ? BRUTE_POSE_FRAME.anchor : anchorOffsetY;
    return { frame, ox: -size / 2, oy: -size / 2 + frameY, size, anchorOffsetY };
  }

  // Для слоя теней: кадр и прямоугольник на карте
  shadowSprite(e) {
    const sp = this.sprite(e);
    return sp && { img: sp.frame, x: e.x + sp.ox, y: e.y + sp.oy, w: sp.size, h: sp.size };
  }

  draw(ctx, e) {
    const sp = this.sprite(e);
    if (!sp) return false; // Fallback to 2D while loading
    const type = e.type || 'grunt';
    const anchorOffsetY = sp.anchorOffsetY;

    ctx.save();
    ctx.translate(e.x, e.y);

    // 1. Контактная тень у ног (отбрасываемую кладёт слой теней, shadows.js)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.beginPath();
    ctx.ellipse(0, 10, e.radius * 1.1, e.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw 3D Model Canvas (without slow CPU ctx.filter)
    // Пехотинец приседает перед выпадом языком (squash > 0) и вытягивается в выпаде (< 0), game.js
    const sq = e.squash || 0;
    if (sq) {
      ctx.save();
      ctx.translate(0, 22);
      ctx.scale(1 + sq * 0.08, 1 - sq * 0.13);
      ctx.translate(0, -22);
    }
    ctx.drawImage(sp.frame, sp.ox, sp.oy, sp.size, sp.size);
    if (sq) ctx.restore();

    if (e.hitFlash && e.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
      ctx.beginPath();
      ctx.arc(0, anchorOffsetY * 0.5, e.radius * 0.92, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Aggro Indicator (no shadowBlur to keep GPU batching fast)
    if (e.isAggroed) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -e.radius - 16);
    }

    // 4. Health Bar (when damaged)
    if (e.hp < e.maxHp) {
      const barW = Math.max(30, e.radius * 1.6);
      const barH = 4;
      const barY = -e.radius - 10;
      const pct = Math.max(0, e.hp / e.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

      ctx.fillStyle = type === 'brute' ? '#a855f7' : '#ef4444';
      ctx.fillRect(-barW / 2, barY, barW * pct, barH);
    }

    ctx.restore();
    return true;
  }
}

window.threeEnemies = new ThreeEnemyManager();
