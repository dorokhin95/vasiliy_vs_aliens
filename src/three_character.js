/**
 * ThreeCharacterManager
 * 2.5D Real-Time WebGL Character Renderer for "Василий против пришельцев"
 * 
 * Path A: Authentic 3D Dieselpunk Hero
 * - Modeled Soviet camouflage sleeves connected directly from shoulders to weapons
 * - Real two-handed grip at chest level (ZERO air gaps, ZERO floating weapons)
 * - Grounded 16-frame walking animation from Blender
 * - Modular weapons (Shotgun, Mining Drill, Plasma Rifle) seated directly in hands pointing forward
 */

class ThreeCharacterManager {
  constructor() {
    this.isLoaded = false;
    this.width = 192;
    this.height = 192;

    // Offscreen Canvas and WebGL Renderer
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Scene
    this.scene = new THREE.Scene();

    // Orthographic Camera (top-down 2.5D angle: 28 degrees pitch)
    const aspect = 1;
    const frustumSize = 2.45;
    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      50
    );

    const pitch = 28 * (Math.PI / 180);
    const camDist = 6;
    this.camera.position.set(0, camDist * Math.sin(pitch), camDist * Math.cos(pitch));
    this.camera.lookAt(0, 1.0, 0);

    // Studio 3-Point Lighting for Novokhmurinsk
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    this.keyLight.position.set(2, 7, 5);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x93c5fd, 1.8);
    this.fillLight.position.set(-3, 4, 3);
    this.scene.add(this.fillLight);

    // Root Container for Vasily (Y-rotation = horizontal facing direction)
    this.characterRoot = new THREE.Group();
    this.scene.add(this.characterRoot);

    // Center-of-Mass Pivot at waist height (Y = 0.90) so combat roll rotates around torso, NOT feet!
    this.pivotHeight = 0.90;
    this.rollPivot = new THREE.Group();
    this.rollPivot.position.set(0, this.pivotHeight, 0);
    this.characterRoot.add(this.rollPivot);

    // Animation & Mixers
    this.mixer = null;
    this.walkAction = null;
    this.idleAction = null;
    this.rollAction = null;
    this.activeActionName = '';
    this.recoil = 0;
    this.rollAngle = 0;
    this.lastX = null;
    this.lastY = null;
    this.lastTime = performance.now();

    // Weapon Objects loaded from glTF
    this.shotgunObj = null;
    this.drillObj = null;
    this.plasmaObj = null;

    // Load Model
    this.loadModel();
  }

  loadModel() {
    if (typeof THREE.GLTFLoader === 'undefined') {
      setTimeout(() => this.loadModel(), 200);
      return;
    }

    const loader = new THREE.GLTFLoader();
    const modelUrl = 'assets/models/vasiliy.glb?v=' + Date.now();
    loader.load(
      modelUrl,
      (gltf) => {
        this.model = gltf.scene;

        // Offset model down by pivotHeight inside rollPivot so feet remain at world Y=0 when upright
        this.model.position.set(0, -this.pivotHeight, 0);

        // Find the 3 high-detail dieselpunk weapon objects from Blender
        this.shotgunObj = this.model.getObjectByName('Vasiliy_Shotgun');
        this.drillObj = this.model.getObjectByName('Vasiliy_Drill');
        this.plasmaObj = this.model.getObjectByName('Vasiliy_Plasma');

        // Texture filtering and shadow setup
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const mat = child.material;
              if (mat.map) {
                mat.map.minFilter = THREE.LinearFilter;
                mat.map.magFilter = THREE.LinearFilter;
                mat.map.needsUpdate = true;
              }
            }
          }
        });

        // Set up AnimationMixer for Walk, Idle, and Roll actions
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);

          const findClip = (keyword) =>
            gltf.animations.find(c => c.name.toLowerCase().includes(keyword));

          const walkClip = findClip('walk') || gltf.animations[0];
          const idleClip = findClip('idle') || walkClip;
          const rollClip = findClip('roll') || walkClip;

          this.walkAction = this.mixer.clipAction(walkClip);
          this.walkAction.setLoop(THREE.LoopRepeat);

          this.idleAction = this.mixer.clipAction(idleClip);
          this.idleAction.setLoop(THREE.LoopRepeat);

          this.rollAction = this.mixer.clipAction(rollClip);
          this.rollAction.setLoop(THREE.LoopRepeat);

          this.switchAction('idle');
          this.mixer.update(0);
        }

        this.rollPivot.add(this.model);

        // Initial weapon setup (default shotgun)
        this.setWeapon('shotgun');

        this.isLoaded = true;
        console.log('[ThreeCharacter] Vasily Master Path A loaded with Walk, Idle & Roll animations!');
      },
      undefined,
      (err) => console.error('[ThreeCharacter] Failed to load vasiliy.glb:', err)
    );
  }

  switchAction(name) {
    if (this.activeActionName === name) return;
    this.activeActionName = name;

    const map = {
      walk: this.walkAction,
      idle: this.idleAction,
      roll: this.rollAction
    };

    for (const k in map) {
      if (map[k]) {
        if (k === name) {
          map[k].reset();
          map[k].play();
        } else {
          map[k].stop();
        }
      }
    }
  }

  setWeapon(weaponId) {
    if (this.shotgunObj) this.shotgunObj.visible = (weaponId === 'shotgun');
    if (this.drillObj) this.drillObj.visible = (weaponId === 'drill');
    if (this.plasmaObj) this.plasmaObj.visible = (weaponId === 'plasma');
  }

  update(player) {
    if (!this.isLoaded || !this.characterRoot) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    const moveDx = this.lastX !== null ? (player.x - this.lastX) : 0;
    const moveDy = this.lastY !== null ? (player.y - this.lastY) : 0;
    this.lastX = player.x;
    this.lastY = player.y;

    // 1. Weapon Selection (hide weapon briefly during tight somersault roll so barrel doesn't poke ground)
    const currentWeapon = player.currentWeapon || 'shotgun';
    if (player.isRolling) {
      if (this.shotgunObj) this.shotgunObj.visible = false;
      if (this.drillObj) this.drillObj.visible = false;
      if (this.plasmaObj) this.plasmaObj.visible = false;
      this.currentWeaponId = null;
    } else if (this.currentWeaponId !== currentWeapon) {
      this.currentWeaponId = currentWeapon;
      this.setWeapon(currentWeapon);
    }

    // 2. Combat Roll vs Normal Aiming & Walking
    if (player.isRolling) {
      // Face the roll movement direction so somersault pitches forward along roll trajectory
      const rollDirAngle = (player.rollDx || player.rollDy)
        ? Math.atan2(player.rollDy, player.rollDx)
        : player.angle;
      this.characterRoot.rotation.y = -rollDirAngle + Math.PI / 2;

      // Exact progress [0..1] over the 18-frame roll duration
      const totalRollFrames = 18;
      const rem = Math.max(0, Math.min(totalRollFrames, player.rollDuration || 0));
      const progress = 1.0 - (rem / totalRollFrames);

      // Full 360-degree forward somersault around center-of-mass pivot
      this.rollAngle = progress * Math.PI * 2;
      this.rollPivot.rotation.x = this.rollAngle;
      // Slight diagonal shoulder-roll tilt
      const arc = Math.sin(progress * Math.PI);
      this.rollPivot.rotation.z = arc * 0.22;

      // Drop center-of-mass toward the ground so the tucked ball rolls ON the asphalt
      this.rollPivot.position.y = this.pivotHeight - arc * 0.22;
      const tuckScale = 1.0 - arc * 0.12;
      this.rollPivot.scale.set(1.0, tuckScale, tuckScale);

      if (this.mixer && this.rollAction) {
        this.switchAction('roll');
        const clipDur = this.rollAction.getClip().duration || 1.0;
        this.rollAction.time = progress * clipDur;
        this.mixer.update(0);
      }
    } else {
      // Reset roll pivot transforms
      this.rollAngle = 0;
      this.rollPivot.rotation.x = 0;
      this.rollPivot.rotation.z = 0;
      this.rollPivot.position.y = this.pivotHeight;
      this.rollPivot.scale.set(1, 1, 1);

      // Smooth 360° Mouse Aiming
      const targetRotation = -player.angle + Math.PI / 2;
      this.characterRoot.rotation.y = targetRotation;

      if (this.mixer) {
        if (player.isMoving) {
          this.switchAction('walk');
          // Check if player is walking forward or backing up relative to aim angle
          const aimX = Math.cos(player.angle);
          const aimY = Math.sin(player.angle);
          const dot = moveDx * aimX + moveDy * aimY;
          const dirSign = dot < -0.15 ? -1.0 : 1.0;
          this.walkAction.timeScale = dirSign * 1.95;
          this.mixer.update(dt);
        } else {
          this.switchAction('idle');
          this.idleAction.timeScale = 0.8;
          this.mixer.update(dt);
        }
      }
    }

    // 3. Weapon Recoil (applied along local Z of rollPivot)
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - 0.14);
      this.rollPivot.position.z = -this.recoil * 0.06;
    } else {
      this.rollPivot.position.z = 0;
    }

    // 4. Drill Vibration / Spin
    if (currentWeapon === 'drill' && this.drillObj && !player.isRolling) {
      this.drillObj.rotation.z = Math.sin(Date.now() * 0.08) * 0.04;
    }

    // Render to offscreen canvas
    this.renderer.render(this.scene, this.camera);
  }

  triggerRecoil() {
    this.recoil = 1.0;
  }

  /**
   * Calculates the exact screen position (x, y) of the weapon muzzle in 2.5D space.
   * Projects the 3D tip position through the orthographic camera.
   */
  getMuzzlePosition(player) {
    const weaponId = player.currentWeapon || 'shotgun';
    
    // Model tip coordinates in glTF local space (Blender coords converted to glTF):
    // shotgun: x = -0.068, y = 1.264 (height), z = 1.090 (forward)
    // drill:   x = -0.090, y = 1.215 (height), z = 1.137 (forward)
    // plasma:  x = -0.065, y = 1.215 (height), z = 1.140 (forward)
    let tipX = -0.068;
    let tipY = 1.264;
    let tipZ = 1.090;

    if (weaponId === 'drill') {
      tipX = -0.090;
      tipY = 1.215;
      tipZ = 1.137;
    } else if (weaponId === 'plasma') {
      tipX = -0.065;
      tipY = 1.215;
      tipZ = 1.140;
    }

    // 1. Rotate tip by Vasily's characterRoot rotation (targetRotation = -player.angle + Math.PI / 2)
    const rotY = -player.angle + Math.PI / 2;
    const sinR = Math.sin(rotY);
    const cosR = Math.cos(rotY);

    const xw = tipX * cosR + tipZ * sinR;
    const yw = tipY;
    const zw = -tipX * sinR + tipZ * cosR;

    // 2. Camera View Transform (Pitch = 28 deg, looking at Y=1.0)
    const pitch = 28 * (Math.PI / 180);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const xCam = xw;
    const yCam = (yw - 1.0) * cosP - zw * sinP;

    // 3. Orthographic projection & canvas scale
    // frustumSize = 2.45, renderW = 110, renderH = 110
    // Scale factor = 110 / 2.45 = 44.898 px per 3D unit
    const scale = 110 / 2.45;
    const offsetX = xCam * scale;
    // Note: Canvas Y increases downwards, whereas Camera Y increases upwards.
    // Also drawImage applies a vertical anchor offset of -14px.
    const offsetY = -14 - yCam * scale;

    return {
      x: player.x + offsetX,
      y: player.y + offsetY
    };
  }

  draw(ctx, player) {
    if (!this.isLoaded) return false;

    this.update(player);

    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.isDrunk) {
      const wobble = Math.sin(Date.now() * 0.006) * 0.15;
      ctx.rotate(wobble);
    }

    // Аура перегара (Шаман)
    if (player.hasPerk && player.hasPerk('fume_aura')) {
      const time = Date.now() * 0.004;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 75 + Math.sin(time) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Мягкая тень под ногами
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Отрисовка 3D Василия из WebGL холста
    const renderW = 110;
    const renderH = 110;
    ctx.drawImage(this.canvas, -renderW / 2, -renderH / 2 - 14, renderW, renderH);

    ctx.restore();
    return true;
  }
}

// Global Singleton Instance
window.threeCharacter = new ThreeCharacterManager();
