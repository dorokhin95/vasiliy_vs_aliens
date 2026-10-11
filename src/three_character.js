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
      antialias: false,
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

    // Root Container for Vasily
    this.characterRoot = new THREE.Group();
    this.scene.add(this.characterRoot);

    // Animation & Mixers
    this.mixer = null;
    this.walkAction = null;
    this.recoil = 0;
    this.rollAngle = 0;
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
                mat.map.minFilter = THREE.NearestFilter;
                mat.map.magFilter = THREE.NearestFilter;
                mat.map.needsUpdate = true;
              }
            }
          }
        });

        // Set up AnimationMixer for true leg walking
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          this.walkAction = this.mixer.clipAction(gltf.animations[0]);
          this.walkAction.setLoop(THREE.LoopRepeat);
          this.walkAction.play();
          // Frame 1 = grounded combat stance (feet planted)
          this.walkAction.time = 0;
          this.walkAction.paused = true;
          this.mixer.update(0);
        }

        this.characterRoot.add(this.model);

        // Initial weapon setup (default shotgun)
        this.setWeapon('shotgun');

        this.isLoaded = true;
        console.log('[ThreeCharacter] Vasily Master Path A loaded with all 3 detailed dieselpunk weapons!');
      },
      undefined,
      (err) => console.error('[ThreeCharacter] Failed to load vasiliy.glb:', err)
    );
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

    // 1. Weapon Selection
    const currentWeapon = player.currentWeapon || 'shotgun';
    if (this.currentWeaponId !== currentWeapon) {
      this.currentWeaponId = currentWeapon;
      this.setWeapon(currentWeapon);
    }

    // 2. Smooth 360° Mouse Aiming
    // In Canvas: angle=0 is Right, PI/2 is Down, -PI/2 is Up, PI is Left.
    // Three.js model forward is +Z. Screen Right is +X.
    // To face +X (Right, angle=0): rotate +Z to +X -> rotation.y = +Math.PI / 2.
    const targetRotation = -player.angle + Math.PI / 2;
    this.characterRoot.rotation.y = targetRotation;

    // 3. Leg Walking Animation (True Stride vs Grounded Stance)
    if (this.mixer) {
      if (player.isMoving && !player.isRolling) {
        if (this.walkAction) {
          this.walkAction.paused = false;
          // Step animation speed in sync with movement
          this.mixer.update(dt * 1.8);
        }
      } else {
        if (this.walkAction) {
          this.walkAction.paused = true;
          // Return to Frame 1 (grounded combat stance, feet firmly planted)
          this.walkAction.time = 0;
          this.mixer.update(0);
        }
      }
    }

    // 4. Idle Breathing in Neutral Stance
    if (!player.isMoving && !player.isRolling) {
      const breath = Math.sin(Date.now() * 0.003) * 0.012;
      this.characterRoot.position.y = breath;
    } else if (!player.isRolling) {
      this.characterRoot.position.y = 0;
    }

    // 5. Combat Roll
    if (player.isRolling) {
      this.rollAngle += 0.35;
      this.characterRoot.rotation.x = this.rollAngle;
      this.characterRoot.position.y = Math.sin(this.rollAngle) * 0.15;
    } else {
      this.rollAngle = 0;
      this.characterRoot.rotation.x = 0;
    }

    // 6. Weapon Recoil
    if (this.recoil > 0) {
      this.recoil -= 0.14;
      this.characterRoot.position.z = this.recoil * 0.06;
    } else {
      this.recoil = 0;
      this.characterRoot.position.z = 0;
    }

    // 7. Drill Vibration / Spin
    if (currentWeapon === 'drill' && this.drillObj) {
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
