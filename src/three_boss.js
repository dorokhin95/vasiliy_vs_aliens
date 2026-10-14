/**
 * ThreeBossManager
 * Live 2.5D WebGL renderer for the bosses: «Золотой Мясник» (assets/models/boss_golden_butcher.glb, city)
 * and «Межпространственный Долбильщик» (assets/models/boss_dolbilshchik.glb, Promzona) — one instance each.
 *
 * Unlike the toads (pose cache), there is only one boss, so it is rendered live every frame
 * like Vasiliy: smooth animation at any angle and no cache memory.
 *
 * Clips authored in Blender at 60 fps with the same phase lengths as BOSS_ATTACKS in game.js
 * (windup / active / recover); the clip time is derived from the current phase so the animation
 * stays in sync with the red telegraph zones even when the boss is enraged (shorter windups).
 */

class ThreeBossManager {
  // cfg: { file, name, attackClips, lazy } — lazy: модель грузится по load(), а не сразу
  constructor(cfg) {
    this.cfg = cfg;
    this.isLoaded = false;
    this.loadFailed = false;
    this.loadRequested = false;

    // Frustum covers the spin reach (~1.8 m) and the overhead chop (~2.9 m); 80 screen px per metre
    this.frustumSize = 4.4;
    this.pxPerMeter = 80;
    this.lookAtY = 1.0;
    this.pitch = 28 * (Math.PI / 180);

    this.width = 384;
    this.height = 384;
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
    const half = this.frustumSize / 2;
    this.camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 60);
    const camDist = 12;
    this.camera.position.set(0, this.lookAtY + camDist * Math.sin(this.pitch), camDist * Math.cos(this.pitch));
    this.camera.lookAt(0, this.lookAtY, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
    keyLight.position.set(2, 7, 5);
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-3, 4, 3);
    this.scene.add(fillLight);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.mixer = null;
    this.actions = {};
    this.activeClip = '';
    this.materials = [];

    // Phase lengths of each attack clip in frames (must match the Blender keyframes)
    this.attackClips = cfg.attackClips;

    if (!cfg.lazy) this.load();
  }

  load() {
    if (this.loadRequested) return;
    this.loadRequested = true;
    this.loadModel();
  }

  loadModel() {
    if (typeof THREE.GLTFLoader === 'undefined') {
      setTimeout(() => this.loadModel(), 200);
      return;
    }
    const loader = new THREE.GLTFLoader();
    loader.load(
      this.cfg.file,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mat = child.material;
            // Without an environment map metallic surfaces render almost black
            if (typeof mat.metalness === 'number') mat.metalness = Math.min(mat.metalness, 0.15);
            if (mat.emissive) this.materials.push(mat);
            child.frustumCulled = false;
          }
        });
        this.root.add(model);

        this.mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
          const action = this.mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat);
          this.actions[clip.name] = action;
        });

        // Compile shaders and upload textures right away, not when the player reaches the lair
        this.playClip('Idle', 0);
        this.renderer.render(this.scene, this.camera);

        this.isLoaded = true;
        console.log(`[ThreeBoss] ${this.cfg.name} loaded:`, Object.keys(this.actions).join(', '));
      },
      undefined,
      (err) => {
        this.loadFailed = true;
        console.warn('[ThreeBoss] Boss model not available, using 2D placeholder:', err);
      }
    );
  }

  playClip(name, time) {
    const action = this.actions[name];
    if (!action) return;
    if (this.activeClip !== name) {
      for (const key in this.actions) {
        if (key !== name) this.actions[key].stop();
      }
      action.play();
      this.activeClip = name;
    }
    action.time = time;
    this.mixer.update(0);
  }

  // Clip time (seconds) for the current attack phase
  attackClipTime(e) {
    const a = e.attack;
    const cfg = this.attackClips[a.key];
    const [windupF, activeF, recoverF] = cfg.phases;
    let frame;
    if (cfg.hold !== undefined && a.phase !== 'recover') {
      // Держит позу (юла Долбильщика: руки с молотом разведены), пока крутится
      frame = a.phase === 'windup' ? cfg.hold * Math.min(1, a.t / a.windup) : cfg.hold;
    } else if (a.phase === 'windup') {
      frame = windupF * Math.min(1, a.t / a.windup);
    } else if (a.phase === 'active') {
      frame = windupF + activeF * Math.min(1, a.t / Math.max(1, activeF));
    } else {
      frame = windupF + activeF + recoverF * Math.min(1, a.t / a.recover);
    }
    return frame / 60;
  }

  updatePose(e) {
    if (e.blinkAnim > 0 && !e.attack && this.actions['Blink']) {
      // Мерцание Долбильщика: вздрагивает, пока перескакивает
      this.playClip('Blink', (16 - e.blinkAnim) / 60);
    } else if (e.attack && this.attackClips[e.attack.key]) {
      this.playClip(this.attackClips[e.attack.key].clip, this.attackClipTime(e));
    } else if (e.isMoving) {
      // Walk cadence follows movement speed (clip stride matches ~1.9 px/frame)
      const walk = this.actions['Walk'];
      const rate = (e.speed * (e.enraged ? 1.25 : 1.0)) / 1.9 * 0.75;
      const duration = walk ? walk.getClip().duration : 0.8;
      this.playClip('Walk', ((e.animTimer / 60) * rate) % duration);
    } else {
      const idle = this.actions['Idle'];
      const duration = idle ? idle.getClip().duration : 2.0;
      this.playClip('Idle', (e.animTimer / 60) % duration);
    }

    // Facing: the model looks along +Z (towards the camera) at rotation 0, like the toads
    const aim = e.attack ? e.attack.aim : (e.angle || 0);
    this.root.rotation.y = -aim + Math.PI / 2;

    // Hit flash (white) and enraged glow (pulsing orange) through the material emissive
    let r = 0, g = 0, b = 0;
    if (e.type === 'pounder') {
      // Долбильщик: мерцая — фиолетовый пульс, в ярости — ровное фиолетовое свечение ядра
      if (e.hitFlash > 0) {
        r = g = b = 0.45;
      } else if (e.blinking > 0) {
        const pulse = 0.3 + Math.sin(e.animTimer * 0.6) * 0.15;
        r = pulse * 0.7; g = pulse * 0.25; b = pulse;
      } else if (e.isClone) {
        // Копия: ровный холодный фиолетовый отсвет
        r = 0.22; g = 0.1; b = 0.38;
      } else if (e.phase >= 2) {
        const pulse = 0.12 + Math.sin(e.animTimer * 0.2) * 0.05;
        r = pulse * 0.6; g = pulse * 0.15; b = pulse;
      }
    } else if (e.invuln > 0) {
      // Входит в берсерк, неуязвим: раскалённое золото, частый пульс
      const pulse = 0.34 + Math.sin(e.animTimer * 0.5) * 0.14;
      r = pulse; g = pulse * 0.72; b = pulse * 0.18;
    } else if (e.hitFlash > 0) {
      r = g = b = 0.45;
    } else if (e.berserk) {
      // Берсерк: налитый кровью, пульсирует чаще и ярче ярости
      const pulse = 0.26 + Math.sin(e.animTimer * 0.35) * 0.12;
      r = pulse; g = pulse * 0.12; b = pulse * 0.08;
    } else if (e.enraged) {
      const pulse = 0.12 + Math.sin(e.animTimer * 0.2) * 0.06;
      r = pulse; g = pulse * 0.35;
    }
    for (const mat of this.materials) mat.emissive.setRGB(r, g, b);
  }

  // Для слоя теней (shadows.js): холст прошлого кадра и где он на карте; ноги стоят ровно на e.y
  shadowSprite(e) {
    if (!this.isLoaded) return null;
    const drawSize = this.frustumSize * this.pxPerMeter;
    const feetOffset = this.lookAtY * Math.cos(this.pitch) * this.pxPerMeter;
    // В прыжке тень остаётся на земле, а фигура уходит вверх (e.z) — тень от неё не рисуем
    if (e.z > 20) return null;
    return { img: this.canvas, x: e.x - drawSize / 2, y: e.y - drawSize / 2 - feetOffset, w: drawSize, h: drawSize, footY: e.y, live: true };
  }

  draw(ctx, e) {
    if (!this.isLoaded) return false;

    this.updatePose(e);
    this.renderer.render(this.scene, this.camera);

    const drawSize = this.frustumSize * this.pxPerMeter;
    // The canvas centre is the look-at point (y = lookAtY); the feet are lookAtY·cos(pitch) below it
    const feetOffset = this.lookAtY * Math.cos(this.pitch) * this.pxPerMeter;

    ctx.save();
    ctx.translate(e.x, e.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    if (e.type === 'pounder') {
      if (e.blinking > 0 || e.phase >= 2) {
        ctx.strokeStyle = `rgba(168, 85, 247, ${(e.blinking > 0 ? 0.7 : 0.45) + Math.sin(e.animTimer * 0.4) * 0.25})`;
        ctx.lineWidth = e.blinking > 0 ? 5 : 3;
        ctx.beginPath();
        ctx.ellipse(0, 4, 58, 24, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (e.invuln > 0) {
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.7 + Math.sin(e.animTimer * 0.5) * 0.3})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 4, 62, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.enraged || e.berserk) {
      ctx.strokeStyle = e.berserk
        ? `rgba(239, 68, 68, ${0.6 + Math.sin(e.animTimer * 0.35) * 0.3})`
        : `rgba(249, 115, 22, ${0.45 + Math.sin(e.animTimer * 0.2) * 0.2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 4, 58, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const top = -drawSize / 2 - feetOffset - (e.z || 0);
    if (e.blinking > 0) {
      // Мерцает между измерениями: полупрозрачный, полосы кадра съезжают вбок
      const strips = 12, sh = drawSize / strips;
      ctx.globalAlpha = 0.5 + Math.sin(e.animTimer * 0.9) * 0.15;
      for (let i = 0; i < strips; i++) {
        const glitch = Math.random() < 0.25 ? (Math.random() - 0.5) * 26 : 0;
        ctx.drawImage(this.canvas, 0, i * this.height / strips, this.width, this.height / strips,
          -drawSize / 2 + glitch, top + i * sh, drawSize, sh);
      }
      ctx.globalAlpha = 1;
    } else {
      // Копия Долбильщика полупрозрачная — видно, кто настоящий
      if (e.isClone) ctx.globalAlpha = 0.72;
      ctx.drawImage(this.canvas, -drawSize / 2, top, drawSize, drawSize);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return true;
  }
}

window.threeBoss = new ThreeBossManager({
  name: 'Golden Butcher',
  file: 'assets/models/boss_golden_butcher.glb?v=1',
  attackClips: {
    slash: { clip: 'Attack_Slash', phases: [34, 8, 30] },
    chop: { clip: 'Attack_Chop', phases: [52, 6, 50] },
    spin: { clip: 'Attack_Spin', phases: [38, 30, 44] },
    lunge: { clip: 'Attack_Lunge', phases: [40, 14, 36] },
    // Захват: своего клипа нет — тот же рывок вперёд, только на месте и быстрее
    grab: { clip: 'Attack_Lunge', phases: [40, 14, 36] },
    // Землетрясение берсерка: тот же удар сверху, меч уходит в землю
    quake: { clip: 'Attack_Chop', phases: [52, 6, 50] }
  }
});

// Босс Промзоны: грузится при первом заходе в неё (environment.setLocation). Фазы клипов —
// tools/build_promzona_boss_blender.py; у прыжка «замах» — присед и полёт (36 + 34)
window.threePounder = new ThreeBossManager({
  name: 'Interdimensional Pounder',
  file: 'assets/models/boss_dolbilshchik.glb?v=1',
  lazy: true,
  attackClips: {
    slam: { clip: 'Attack_Slam', phases: [44, 6, 42] },
    sweep: { clip: 'Attack_Sweep', phases: [30, 10, 34] },
    electric: { clip: 'Attack_Electric', phases: [56, 12, 40] },
    leap: { clip: 'Attack_Leap', phases: [70, 6, 44] },
    // Электробуря — тот же удар в землю; юла — поза конца размаха, крутится сама модель
    storm: { clip: 'Attack_Slam', phases: [44, 6, 42] },
    spin: { clip: 'Attack_Sweep', phases: [30, 10, 34], hold: 40 }
  }
});
