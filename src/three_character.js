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
    this.loadFailed = false;
    this.width = 160;
    this.height = 160;

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
    this.swingTimer = 0;
    this.swingDir = 1;
    this.rollAngle = 0;
    this.lastX = null;
    this.lastY = null;
    this.lastTime = performance.now();
    this.lastRenderState = '';
    this.idleFrameCounter = 0;

    // Weapon & Modular Arm Objects loaded from glTF
    this.batObj = null;
    this.makarovObj = null;
    this.shotgunObj = null;
    this.drillObj = null;
    this.plasmaObj = null;
    this.armLDown = null;
    this.armRPistol = null;
    this.armRBat = null;
    this.armsTwoHanded = null;

    // Load Model
    this.loadModel();
  }

  loadModel() {
    if (typeof THREE.GLTFLoader === 'undefined') {
      setTimeout(() => this.loadModel(), 200);
      return;
    }

    const loader = new THREE.GLTFLoader();
    const modelUrl = 'assets/models/vasiliy.glb?v=1030';
    loader.load(
      modelUrl,
      (gltf) => {
        this.model = gltf.scene;

        // Offset model down by pivotHeight inside rollPivot so feet remain at world Y=0 when upright
        this.model.position.set(0, -this.pivotHeight, 0);

        // Find the 3 high-detail dieselpunk weapon objects & modular arm postures from Blender
        this.shotgunObj = this.model.getObjectByName('Vasiliy_Shotgun');
        this.drillObj = this.model.getObjectByName('Vasiliy_Drill');
        this.plasmaObj = this.model.getObjectByName('Vasiliy_Plasma');
        this.armLDown = this.model.getObjectByName('Vasiliy_Arm_L_Down');
        this.armRPistol = this.model.getObjectByName('Vasiliy_Arm_R_Pistol');
        this.armRBat = this.model.getObjectByName('Vasiliy_Arm_R_Bat');
        this.armsTwoHanded = this.model.getObjectByName('Vasiliy_Arms_TwoHanded');

        // Load Spiked Bat (weapon_bat.glb) into Vasily's ONE-HANDED Right Arm (armRBat)
        loader.load('assets/models/weapon_bat.glb?v=1028', (batGltf) => {
          this.batObj = batGltf.scene;
          if (this.armRBat) {
            // Right Glove center relative to Right Shoulder (-0.26, 1.36, 0.02) is (-0.02, -0.18, 0.32).
            // Because weapon_bat.glb has its origin (0,0,0) at the blue-taped grip, parenting it to armRBat
            // at (-0.02, -0.18, 0.32) locks the handle inside Vasily's right fist at all swing angles!
            this.batObj.position.set(-0.02, -0.18, 0.32);
            this.batObj.rotation.set(-0.80, -0.35, 0);
            this.armRBat.add(this.batObj);
          } else {
            this.batObj.position.set(-0.28, 1.18, 0.34);
            this.batObj.rotation.set(-0.80, -0.35, 0);
            this.model.add(this.batObj);
          }
          this.setWeapon(this.currentWeaponId || 'bat');
        });

        // Load Makarov PM (weapon_makarov.glb) into Vasily's outstretched Right Pistol Hand
        loader.load('assets/models/weapon_makarov.glb?v=1028', (pmGltf) => {
          this.makarovObj = pmGltf.scene;
          this.makarovObj.position.set(-0.14, 1.25, 0.44);
          this.makarovObj.rotation.set(0, 0, 0);
          this.model.add(this.makarovObj);
          this.setWeapon(this.currentWeaponId || 'bat');
        });

        // Texture filtering
        this.model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mat = child.material;
            if (mat.map) {
              mat.map.minFilter = THREE.LinearFilter;
              mat.map.magFilter = THREE.LinearFilter;
              mat.map.needsUpdate = true;
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

        // Initial weapon setup (default spiked bat)
        this.setWeapon('bat');

        this.isLoaded = true;
        console.log('[ThreeCharacter] Vasily Master loaded with one-handed Bat/Makarov & two-handed Rifle postures!');
      },
      undefined,
      (err) => {
        this.loadFailed = true;
        console.error('[ThreeCharacter] Failed to load vasiliy.glb:', err);
      }
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
    const isBat = (weaponId === 'bat');
    const isMakarov = (weaponId === 'makarov');
    const isTwoHanded = (weaponId === 'shotgun' || weaponId === 'drill' || weaponId === 'plasma');

    if (this.batObj) this.batObj.visible = isBat;
    if (this.makarovObj) this.makarovObj.visible = isMakarov;
    if (this.shotgunObj) this.shotgunObj.visible = (weaponId === 'shotgun');
    if (this.drillObj) this.drillObj.visible = (weaponId === 'drill');
    if (this.plasmaObj) this.plasmaObj.visible = (weaponId === 'plasma');

    // Switch arm postures: one-handed (bat / pistol) vs two-handed (shotgun / drill / plasma)
    if (this.armLDown) this.armLDown.visible = (isBat || isMakarov);
    if (this.armRBat) this.armRBat.visible = isBat;
    if (this.armRPistol) this.armRPistol.visible = isMakarov;
    if (this.armsTwoHanded) this.armsTwoHanded.visible = isTwoHanded;
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
    const currentWeapon = player.currentWeapon || 'bat';
    if (player.isRolling) {
      if (this.batObj) this.batObj.visible = false;
      if (this.makarovObj) this.makarovObj.visible = false;
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

    // 3. Weapon Recoil (kickback along local Z + realistic barrel rise pitch)
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - 0.12);
      this.rollPivot.position.z = -this.recoil * 0.085;
      if (!player.isRolling) {
        this.rollPivot.rotation.x = -this.recoil * 0.13;
      }
    } else {
      this.rollPivot.position.z = 0;
    }

    // 4. Drill Vibration & Connected Right-Handed Bat Melee Swing Animation
    if (currentWeapon === 'drill' && this.drillObj && !player.isRolling) {
      this.drillObj.rotation.z = Math.sin(Date.now() * 0.08) * 0.04;
    }
    if (this.batObj && this.armRBat) {
      if (this.swingTimer > 0 && !player.isRolling) {
        this.swingTimer = Math.max(0, this.swingTimer - dt * 3.85);
        const p = 1.0 - this.swingTimer; // 0 -> 1

        let armPitch = 0;
        let armYaw = 0;
        let batPitch = -0.80;
        let batYaw = -0.35;
        let torsoYaw = 0;
        let lungeZ = 0;

        if (p < 0.20) {
          // Phase 1: Wind-up (cock right arm and bat back on the right side)
          const t = p / 0.20;
          armPitch = -0.12 * t;
          armYaw = -0.32 * t;
          batPitch = -0.80 + 0.35 * t;
          batYaw = -0.35 - 0.22 * t;
          torsoYaw = -0.22 * t;
          lungeZ = -0.03 * t;
        } else if (p < 0.65) {
          // Phase 2: Horizontal Power Cleave (whip right arm + bat from Right to Left across the front!)
          const t = (p - 0.20) / 0.45;
          const s = 1.0 - Math.pow(1.0 - t, 2.2); // explosive ease-out
          armPitch = -0.12 + 0.30 * s;
          armYaw = -0.32 + 1.02 * s; // -18° -> +40° shoulder sweep
          batPitch = -0.45 + 0.28 * Math.sin(t * Math.PI * 0.85); // levels bat horizontally
          batYaw = -0.57 + 1.05 * s; // -33° -> +27° wrist whip (total ~67° forward-left)
          torsoYaw = -0.22 + 0.58 * s; // torso twists into the strike
          lungeZ = 0.09 * Math.sin(t * Math.PI);
        } else {
          // Phase 3: Smooth Recovery back to one-handed ready stance on right side
          const t = (p - 0.65) / 0.35;
          const s = t * t * (3.0 - 2.0 * t);
          armPitch = 0.18 * (1.0 - s);
          armYaw = 0.70 * (1.0 - s);
          batPitch = -0.22 * (1.0 - s) + (-0.80) * s;
          batYaw = 0.48 * (1.0 - s) + (-0.35) * s;
          torsoYaw = 0.36 * (1.0 - s);
          lungeZ = 0;
        }

        this.armRBat.rotation.set(armPitch, armYaw, 0);
        this.batObj.rotation.set(batPitch, batYaw, 0);
        this.rollPivot.rotation.y = torsoYaw;
        this.rollPivot.position.z += lungeZ;
      } else {
        // One-handed ready stance: bat held in right hand on right side, cocked upward at 46°
        this.armRBat.rotation.set(0, 0, 0);
        this.batObj.rotation.set(-0.80, -0.35, 0);
        this.rollPivot.rotation.y = 0;
      }
    } else {
      if (this.armRBat) this.armRBat.rotation.set(0, 0, 0);
      this.rollPivot.rotation.y = 0;
    }

    // Render to offscreen canvas. Standing still and aiming at the same spot only changes the subtle
    // idle breathing, so re-rendering every 3rd frame (20 fps) is enough; the canvas keeps the last
    // image (preserveDrawingBuffer). Moving, rolling, recoil, swings and the drill render every frame.
    const isIdle = !player.isMoving && !player.isRolling && this.recoil <= 0 && this.swingTimer <= 0 && currentWeapon !== 'drill';
    const stateKey = `${currentWeapon}|${Math.round(player.angle * 180)}`;
    if (isIdle && stateKey === this.lastRenderState && (++this.idleFrameCounter % 3) !== 0) {
      return;
    }
    this.lastRenderState = isIdle ? stateKey : '';
    this.renderer.render(this.scene, this.camera);
  }

  triggerRecoil(strength = 1.0) {
    this.recoil = Math.min(1.4, strength);
  }

  triggerSwing() {
    this.swingTimer = 1.0;
  }

  /**
   * Calculates the exact screen position (x, y) of the weapon muzzle in 2.5D space.
   * Projects the 3D tip position through the orthographic camera.
   */
  getMuzzlePosition(player) {
    const weaponId = player.currentWeapon || 'bat';
    
    // Model tip coordinates in glTF local space (Blender coords converted to glTF):
    // bat:     x = -0.220, y = 1.240 (height), z = 0.960 (forward)
    // makarov: x = -0.140, y = 1.310 (height), z = 0.770 (forward)
    // shotgun: x = -0.068, y = 1.264 (height), z = 1.090 (forward)
    // drill:   x = -0.090, y = 1.215 (height), z = 1.137 (forward)
    // plasma:  x = -0.065, y = 1.215 (height), z = 1.140 (forward)
    let tipX = -0.068;
    let tipY = 1.264;
    let tipZ = 1.090;

    if (weaponId === 'bat') {
      tipX = -0.220;
      tipY = 1.240;
      tipZ = 0.960;
    } else if (weaponId === 'makarov') {
      tipX = -0.140;
      tipY = 1.310;
      tipZ = 0.770;
    } else if (weaponId === 'drill') {
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
