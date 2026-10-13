/**
 * ThreeBossManager
 * Live 2.5D WebGL renderer for the boss «Золотой Мясник» (assets/models/boss_golden_butcher.glb).
 *
 * Unlike the toads (pose cache), there is only one boss, so it is rendered live every frame
 * like Vasiliy: smooth animation at any angle and no cache memory.
 *
 * Clips authored in Blender at 60 fps with the same phase lengths as BOSS_ATTACKS in game.js
 * (windup / active / recover); the clip time is derived from the current phase so the animation
 * stays in sync with the red telegraph zones even when the boss is enraged (shorter windups).
 */

class ThreeBossManager {
  constructor() {
    this.isLoaded = false;
    this.loadFailed = false;

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
    this.attackClips = {
      slash: { clip: 'Attack_Slash', phases: [34, 8, 30] },
      chop: { clip: 'Attack_Chop', phases: [52, 6, 50] },
      spin: { clip: 'Attack_Spin', phases: [38, 30, 44] },
      lunge: { clip: 'Attack_Lunge', phases: [40, 14, 36] }
    };

    this.loadModel();
  }

  loadModel() {
    if (typeof THREE.GLTFLoader === 'undefined') {
      setTimeout(() => this.loadModel(), 200);
      return;
    }
    const loader = new THREE.GLTFLoader();
    loader.load(
      'assets/models/boss_golden_butcher.glb?v=1',
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
        console.log('[ThreeBoss] Golden Butcher loaded:', Object.keys(this.actions).join(', '));
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
    if (a.phase === 'windup') {
      frame = windupF * Math.min(1, a.t / a.windup);
    } else if (a.phase === 'active') {
      frame = windupF + activeF * Math.min(1, a.t / Math.max(1, activeF));
    } else {
      frame = windupF + activeF + recoverF * Math.min(1, a.t / a.recover);
    }
    return frame / 60;
  }

  updatePose(e) {
    if (e.attack && this.attackClips[e.attack.key]) {
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
    if (e.hitFlash > 0) {
      r = g = b = 0.45;
    } else if (e.enraged) {
      const pulse = 0.12 + Math.sin(e.animTimer * 0.2) * 0.06;
      r = pulse; g = pulse * 0.35;
    }
    for (const mat of this.materials) mat.emissive.setRGB(r, g, b);
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

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    if (e.enraged) {
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.45 + Math.sin(e.animTimer * 0.2) * 0.2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 4, 58, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.drawImage(this.canvas, -drawSize / 2, -drawSize / 2 - feetOffset, drawSize, drawSize);
    ctx.restore();
    return true;
  }
}

window.threeBoss = new ThreeBossManager();
