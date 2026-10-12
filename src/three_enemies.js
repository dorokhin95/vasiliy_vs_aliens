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

    // Frame cache: Map<key, HTMLCanvasElement>
    this.cache = new Map();

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
        cfg.file + '?v=1022',
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
    runIdleTasks(tasks);
  }

  /**
   * Renders and caches a single 3D pose of the enemy
   */
  getFrameCanvas(type, dirIdx, frameIdx) {
    const key = `${type}_${dirIdx}_${frameIdx}`;
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

    // Camera height adjustment per enemy
    if (type === 'brute') {
      this.camera.zoom = 0.85;
      this.camera.lookAt(0, 1.15, 0);
    } else {
      this.camera.zoom = 1.0;
      this.camera.lookAt(0, 0.90, 0);
    }
    this.camera.updateProjectionMatrix();

    // Render WebGL
    this.renderer.render(this.scene, this.camera);

    // Copy to dedicated 2D canvas for persistent caching
    const cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = this.width;
    cachedCanvas.height = this.height;
    const cctx = cachedCanvas.getContext('2d');
    cctx.drawImage(this.canvas, 0, 0);

    this.cache.set(key, cachedCanvas);
    return cachedCanvas;
  }

  /**
   * Main draw call invoked from game.js for each enemy
   */
  draw(ctx, e) {
    const type = e.type || 'grunt';
    if (!this.isLoaded[type]) {
      return false; // Fallback to 2D while loading
    }

    // Quantize facing angle (0 to 2PI)
    let angle = e.angle !== undefined ? e.angle : (e.patrolAngle || 0);
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;

    const dirIdx = Math.round((angle / (Math.PI * 2)) * this.numDirections) % this.numDirections;

    // Quantize animation frame (walk stride)
    const animTimer = e.animTimer || 0;
    const frameIdx = Math.floor(animTimer * 1.2) % this.numFrames;

    const frameCanvas = this.getFrameCanvas(type, dirIdx, frameIdx);
    if (!frameCanvas) return false;

    // Render dimensions
    let renderW = 86;
    let renderH = 86;
    let anchorOffsetY = -10;

    if (type === 'sniper') {
      renderW = 82;
      renderH = 82;
      anchorOffsetY = -10;
    } else if (type === 'brute') {
      renderW = 138;
      renderH = 138;
      anchorOffsetY = -16;
    }

    ctx.save();
    ctx.translate(e.x, e.y);

    // 1. Soft Elliptical Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 10, e.radius * 1.1, e.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw 3D Model Canvas (without slow CPU ctx.filter)
    ctx.drawImage(
      frameCanvas,
      -renderW / 2,
      -renderH / 2 + anchorOffsetY,
      renderW,
      renderH
    );

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
