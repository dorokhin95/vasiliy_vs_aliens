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
    this.swingP = 1; // bat strike progress 0..1 (1 = idle)
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
    this.laserObj = null; // лазерный бластер (карта Долбильщика) — перекрашенная копия плазмагана
    // Стволы мастерской Толика (src/workshop.js; модели — tools/finalize_weapons_blender.py)
    this.launcherObj = null; // гранатомёт — в руках на месте обреза
    this.arcObj = null;      // сварочный разрядник — на месте дрели
    this.empObj = null;      // ЭМИ-граната — в руке, где пистолет
    this.nagantObj = null;   // наган Зины (квест «Коля») — на месте ПМ, длиннее его по стволу
    this.nagantTipZ = 0;     // насколько дуло нагана дальше дула ПМ (getMuzzlePosition)
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
        // Лазерный бластер: своей модели нет — копия плазмагана в меди с красным свечением, в тех же руках
        if (this.plasmaObj && this.plasmaObj.parent) {
          this.laserObj = this.plasmaObj.clone(true);
          this.laserObj.name = 'Vasiliy_Laser';
          this.laserObj.traverse((o) => {
            if (!o.isMesh || !o.material) return;
            const tint = (m) => {
              const c = m.clone();
              if (c.color) c.color.multiply(new THREE.Color(1.5, 0.62, 0.42));
              if (c.emissive && c.emissive.getHex() !== 0) c.emissive.setRGB(1.0, 0.16, 0.1);
              return c;
            };
            o.material = Array.isArray(o.material) ? o.material.map(tint) : tint(o.material);
          });
          this.laserObj.visible = false;
          this.plasmaObj.parent.add(this.laserObj);
        }
        // Гранатомёт и разрядник: модель стволом вперёд (+Z glTF), встаёт на место обреза / дрели в тех же
        // руках — та же длина по стволу и та же середина (подгонка — fitLike, в осях модели Василия)
        loader.load('assets/models/weapon_launcher.glb?v=2', (g) => {
          this.launcherObj = this.fitLike(g.scene, this.shotgunObj);
          this.setWeapon(this.currentWeaponId || 'bat');
        });
        loader.load('assets/models/weapon_arc.glb?v=2', (g) => {
          this.arcObj = this.fitLike(g.scene, this.drillObj);
          this.setWeapon(this.currentWeaponId || 'bat');
        });
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
          // The pistol follows the pistol arm (arm swing and torso motion), keeping its world placement
          if (this.armRPistol) {
            this.model.updateMatrixWorld(true);
            this.armRPistol.attach(this.makarovObj);
          }
          // ЭМИ-граната — в той же руке, где пистолет, у его рукояти (модель ~14 см, середина в начале координат)
          loader.load('assets/models/weapon_emp.glb?v=2', (g) => {
            const grenade = g.scene;
            grenade.position.copy(this.makarovObj.position).add(new THREE.Vector3(0, 0.05, 0.1));
            grenade.visible = false;
            this.makarovObj.parent.add(grenade);
            this.empObj = grenade;
            this.setWeapon(this.currentWeaponId || 'bat');
          });
          // Наган: рукоять там же, где у ПМ, ствол длиннее — 235 мм против 161
          loader.load('assets/models/weapon_nagant.glb?v=1', (g) => {
            this.nagantObj = this.fitLike(g.scene, this.makarovObj, 235 / 161);
            if (this.nagantObj) this.nagantTipZ = this.nagantObj.userData.extraZ;
            this.setWeapon(this.currentWeaponId || 'bat');
          });
          this.setWeapon(this.currentWeaponId || 'bat');
        });

        this.setupUpperBody();

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

  /**
   * The arms are separate rigid meshes parented to the rig, not to the chest bone, so they used to hang
   * still while the torso bobbed and twisted. They now live in an "upper body" group that copies the chest
   * bone's motion every frame (relative to its bind pose), and they pivot at the shoulder (their origin).
   */
  setupUpperBody() {
    this.rig = this.model.getObjectByName('Vasiliy_Rig');
    this.spineBone = this.model.getObjectByName('Spine');
    this.chestBone = this.model.getObjectByName('Chest');
    this.headBone = this.model.getObjectByName('Head');
    this.legBones = ['ThighL', 'ShinL', 'ThighR', 'ShinR'].map(n => this.model.getObjectByName(n));
    if (!this.rig || !this.chestBone || !this.spineBone || this.legBones.some(b => !b)) return;

    let skinned = null;
    this.model.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
    if (skinned) skinned.skeleton.pose();
    this.model.updateMatrixWorld(true);
    this.chestRestInv = this.boneInRig(this.chestBone, new THREE.Matrix4()).invert();

    this.upperBody = new THREE.Group();
    this.upperBody.matrixAutoUpdate = false;
    this.rig.add(this.upperBody);
    [this.armLDown, this.armRBat, this.armRPistol, this.armsTwoHanded].forEach(arm => {
      if (arm) this.upperBody.add(arm); // same parent space (rig), so local transforms stay valid
    });

    // Bat strike keyframes in model space (Vasiliy faces +Z, right side is -X): direction shoulder→hand,
    // direction of the bat (grip→tip) and torso twist (+ turns the chest to his left). The strike crosses
    // the front at p≈0.3 (~0.1 s), together with the 2D slash and the moment the hit is applied.
    const v = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
    this.handRestDir = v(-0.02, -0.18, 0.32);
    this.batRestQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.80, -0.35, 0));
    this.batRestDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.batRestQ);
    const keys = [
      { p: 0.00, twist: 0.00, hand: null, tip: null, lunge: 0.00, ease: 'inout' },
      { p: 0.15, twist: -0.60, hand: v(-0.60, 0.55, -0.20), tip: v(-0.45, 0.60, -0.65), lunge: -0.02, ease: 'in' },
      { p: 0.27, twist: -0.20, hand: v(-0.50, -0.05, 0.85), tip: v(-0.75, 0.00, 0.65), lunge: 0.03, ease: 'linear' },
      { p: 0.37, twist: 0.25, hand: v(-0.05, -0.15, 1.00), tip: v(0.00, -0.05, 1.00), lunge: 0.07, ease: 'linear' },
      { p: 0.48, twist: 0.65, hand: v(0.45, -0.20, 0.85), tip: v(0.80, -0.10, 0.60), lunge: 0.08, ease: 'out' },
      { p: 0.64, twist: 0.80, hand: v(0.70, -0.45, 0.45), tip: v(0.80, -0.35, -0.45), lunge: 0.05, ease: 'inout' },
      { p: 1.00, twist: 0.00, hand: null, tip: null, lunge: 0.00, ease: 'inout' }
    ];
    const yAxis = new THREE.Vector3(0, 1, 0);
    this.swingKeys = keys.map(k => {
      // Targets are given in model space; the arm lives in the twisted chest frame, so undo the twist
      const unTwist = new THREE.Quaternion().setFromAxisAngle(yAxis, -k.twist);
      const armQ = new THREE.Quaternion();
      if (k.hand) armQ.setFromUnitVectors(this.handRestDir, k.hand.clone().applyQuaternion(unTwist));
      let batQ = this.batRestQ.clone();
      if (k.tip) {
        const tipInArm = k.tip.clone().applyQuaternion(unTwist).applyQuaternion(armQ.clone().invert());
        batQ = new THREE.Quaternion().setFromUnitVectors(this.batRestDir, tipInArm).multiply(this.batRestQ);
      }
      return { p: k.p, twist: k.twist, lunge: k.lunge, ease: k.ease, armQ, batQ };
    });
    this.swingDuration = 0.34;
    this.swingP = 1;
    this.appliedTwist = [];
    this._q = new THREE.Quaternion();
    this._m = new THREE.Matrix4();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
  }

  undoTwist() {
    for (const [bone, inverse] of this.appliedTwist) bone.quaternion.multiply(inverse);
    this.appliedTwist.length = 0;
  }

  // Bone transform relative to the rig object
  boneInRig(bone, out) {
    return out.copy(this.rig.matrixWorld).invert().multiply(bone.matrixWorld);
  }

  // > 0 when the left leg is in front. Read from the knees of the playing clip, so the arm swing stays in
  // sync at any cadence and when backpedalling (the walk clip then plays in reverse)
  legSwing() {
    const [thighL, shinL, thighR, shinR] = this.legBones;
    const fwd = (hip, knee) => {
      this._v1.setFromMatrixPosition(hip.matrixWorld);
      this._v2.setFromMatrixPosition(knee.matrixWorld);
      this.model.worldToLocal(this._v1);
      this.model.worldToLocal(this._v2);
      return this._v2.z - this._v1.z;
    };
    return Math.max(-1, Math.min(1, (fwd(thighL, shinL) - fwd(thighR, shinR)) / 0.4));
  }

  // Interpolated bat strike pose at progress p (0..1)
  swingPose(p) {
    const keys = this.swingKeys;
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].p) i++;
    const a = keys[i], b = keys[i + 1];
    let t = Math.max(0, Math.min(1, (p - a.p) / (b.p - a.p)));
    if (b.ease === 'inout') t = t * t * (3 - 2 * t);
    else if (b.ease === 'in') t = t * t;
    else if (b.ease === 'out') t = 1 - (1 - t) * (1 - t);
    return {
      twist: a.twist + (b.twist - a.twist) * t,
      lunge: a.lunge + (b.lunge - a.lunge) * t,
      armQ: a.armQ.clone().slerp(b.armQ, t),
      batQ: a.batQ.clone().slerp(b.batQ, t)
    };
  }

  // Torso twist, arm swing while walking and the bat strike. Runs after the clip has posed the skeleton
  animateUpperBody(player, currentWeapon, dt) {
    if (!this.upperBody) return;
    const swinging = this.swingP < 1 && currentWeapon === 'bat' && !this.somersault(player);
    if (this.swingP < 1) this.swingP = Math.min(1, this.swingP + dt / this.swingDuration);
    const pose = swinging ? this.swingPose(this.swingP) : null;

    // 1. Torso twist through the spine bones. Only for this frame's render: undoTwist() restores the clip
    // pose afterwards, because the mixer rewrites a bone only when the clip value changes — in the idle clip
    // the spine is static, so a twist left on the bone would stay (and accumulate) forever
    if (pose && pose.twist !== 0) {
      const yAxis = this._v1.set(0, 1, 0);
      const parts = [[this.spineBone, 0.55], [this.chestBone, 0.45], [this.headBone, -0.6]];
      for (const [bone, share] of parts) {
        if (!bone) continue;
        const q = new THREE.Quaternion().setFromAxisAngle(yAxis, pose.twist * share);
        bone.quaternion.multiply(q);
        this.appliedTwist.push([bone, q.invert()]);
      }
    }
    if (pose) this.rollPivot.position.z += pose.lunge;

    // 2. Upper body follows the chest bone
    this.characterRoot.updateMatrixWorld(true);
    this.boneInRig(this.chestBone, this.upperBody.matrix).multiply(this.chestRestInv);
    this.upperBody.matrixWorldNeedsUpdate = true;

    // 3. Arms: counter-swing to the legs while walking; the bat arm follows the strike keyframes
    const swing = this.somersault(player) ? 0 : this.legSwing();
    if (this.armLDown) {
      // +X rotation swings an arm backwards: the left arm goes back when the left leg is in front
      const counter = pose ? (pose.twist < 0 ? -0.35 : 0.45) * Math.abs(pose.twist) : 0;
      this.armLDown.rotation.set(swing * 0.55 + counter, 0, 0);
    }
    if (this.armRPistol) this.armRPistol.rotation.set(-swing * 0.06, 0, 0);
    if (this.armRBat && this.batObj) {
      if (pose) {
        this.armRBat.quaternion.copy(pose.armQ);
        this.batObj.quaternion.copy(pose.batQ);
      } else {
        this.armRBat.rotation.set(-swing * 0.35, 0, 0);
        this.batObj.quaternion.copy(this.batRestQ);
      }
    }
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

  // Кувырок переката. Рывок (карта Долбильщика) — тоже isRolling, но Василий бежит, а не кувыркается
  somersault(player) {
    return player.isRolling && !player.isDashing;
  }

  // Габарит объекта в осях модели Василия (не мира: корень может быть повёрнут к прицелу)
  localBox(o) {
    this.model.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.model.matrixWorld).invert();
    const box = new THREE.Box3(), part = new THREE.Box3(), m = new THREE.Matrix4();
    o.traverse((c) => {
      if (!c.isMesh || !c.geometry) return;
      if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
      part.copy(c.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, c.matrixWorld));
      box.union(part);
    });
    return box;
  }

  // Новый ствол на месте старого (ref): тот же родитель, оси — как у модели Василия (ствол +Z, верх +Y),
  // длина по стволу и середина — как у ref. Возвращает obj (скрытым) или null, если ref нет
  // k — во сколько раз длиннее ref по стволу: тыльная часть остаётся на месте, ствол уходит вперёд
  fitLike(obj, ref, k = 1) {
    if (!ref || !ref.parent) return null;
    const parent = ref.parent;
    parent.add(obj);
    this.model.updateMatrixWorld(true);
    const pq = parent.getWorldQuaternion(new THREE.Quaternion());
    const mq = this.model.getWorldQuaternion(new THREE.Quaternion());
    obj.quaternion.copy(pq.invert().multiply(mq));
    obj.position.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    const rb = this.localBox(ref), ob = this.localBox(obj);
    const refLen = rb.getSize(new THREE.Vector3()).z;
    obj.scale.setScalar(k * refLen / Math.max(1e-6, ob.getSize(new THREE.Vector3()).z));
    const center = this.localBox(obj).getCenter(new THREE.Vector3());
    const want = rb.getCenter(new THREE.Vector3());
    want.z += (k - 1) * refLen / 2;
    obj.userData.extraZ = (k - 1) * refLen;
    const w = obj.getWorldPosition(new THREE.Vector3())
      .add(this.model.localToWorld(want.clone()).sub(this.model.localToWorld(center.clone())));
    obj.position.copy(parent.worldToLocal(w));
    obj.visible = false;
    return obj;
  }

  setWeapon(weaponId) {
    // 'none' — всё оружие оставлено у Михалыча: руки как с битой, но пустые
    const unarmed = (weaponId === 'none');
    const isBat = (weaponId === 'bat');
    const isMakarov = (weaponId === 'makarov' || weaponId === 'emp' || weaponId === 'nagant');
    const isTwoHanded = (weaponId === 'shotgun' || weaponId === 'drill' || weaponId === 'plasma' || weaponId === 'laser' ||
      weaponId === 'launcher' || weaponId === 'arc');

    if (this.batObj) this.batObj.visible = isBat;
    if (this.makarovObj) this.makarovObj.visible = (weaponId === 'makarov');
    if (this.empObj) this.empObj.visible = (weaponId === 'emp');
    if (this.nagantObj) this.nagantObj.visible = (weaponId === 'nagant');
    if (this.launcherObj) this.launcherObj.visible = (weaponId === 'launcher');
    if (this.arcObj) this.arcObj.visible = (weaponId === 'arc');
    if (this.shotgunObj) this.shotgunObj.visible = (weaponId === 'shotgun');
    if (this.drillObj) this.drillObj.visible = (weaponId === 'drill');
    if (this.plasmaObj) this.plasmaObj.visible = (weaponId === 'plasma');
    if (this.laserObj) this.laserObj.visible = (weaponId === 'laser');

    // Switch arm postures: one-handed (bat / pistol) vs two-handed (shotgun / drill / plasma)
    if (this.armLDown) this.armLDown.visible = (isBat || isMakarov || unarmed);
    if (this.armRBat) this.armRBat.visible = (isBat || unarmed);
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
    const currentWeapon = player.currentWeapon || 'none';
    if (this.somersault(player)) {
      if (this.batObj) this.batObj.visible = false;
      if (this.makarovObj) this.makarovObj.visible = false;
      if (this.shotgunObj) this.shotgunObj.visible = false;
      if (this.drillObj) this.drillObj.visible = false;
      if (this.plasmaObj) this.plasmaObj.visible = false;
      if (this.laserObj) this.laserObj.visible = false;
      if (this.launcherObj) this.launcherObj.visible = false;
      if (this.arcObj) this.arcObj.visible = false;
      if (this.empObj) this.empObj.visible = false;
      if (this.nagantObj) this.nagantObj.visible = false;
      this.currentWeaponId = null;
    } else if (this.currentWeaponId !== currentWeapon) {
      this.currentWeaponId = currentWeapon;
      this.setWeapon(currentWeapon);
    }

    // 2. Combat Roll vs Normal Aiming & Walking
    if (this.somersault(player)) {
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
      if (!this.somersault(player)) {
        this.rollPivot.rotation.x = -this.recoil * 0.13;
      }
    } else {
      this.rollPivot.position.z = 0;
    }

    // 4. Drill vibration
    if (currentWeapon === 'drill' && this.drillObj && !this.somersault(player)) {
      this.drillObj.rotation.z = Math.sin(Date.now() * 0.08) * 0.04;
    }

    // 5. Torso twist, arm swing while walking and the bat strike (see animateUpperBody)
    this.rollPivot.rotation.y = 0;
    this.animateUpperBody(player, currentWeapon, dt);

    // Render to offscreen canvas. Standing still and aiming at the same spot only changes the subtle
    // idle breathing, so re-rendering every 3rd frame (20 fps) is enough; the canvas keeps the last
    // image (preserveDrawingBuffer). Moving, rolling, recoil, swings and the drill render every frame.
    const isIdle = !player.isMoving && !player.isRolling && this.recoil <= 0 && this.swingP >= 1 && currentWeapon !== 'drill';
    const stateKey = `${currentWeapon}|${Math.round(player.angle * 180)}`;
    if (isIdle && stateKey === this.lastRenderState && (++this.idleFrameCounter % 3) !== 0) {
      if (this.appliedTwist) this.undoTwist();
      return;
    }
    this.lastRenderState = isIdle ? stateKey : '';
    this.renderer.render(this.scene, this.camera);
    if (this.appliedTwist) this.undoTwist();
  }

  triggerRecoil(strength = 1.0) {
    this.recoil = Math.min(1.4, strength);
  }

  triggerSwing() {
    this.swingP = 0;
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
    } else if (weaponId === 'makarov' || weaponId === 'emp' || weaponId === 'nagant') {
      tipX = -0.140;
      tipY = 1.310;
      tipZ = 0.770 + (weaponId === 'nagant' ? this.nagantTipZ : 0);
    } else if (weaponId === 'drill' || weaponId === 'arc') {
      tipX = -0.090;
      tipY = 1.215;
      tipZ = 1.137;
    } else if (weaponId === 'plasma' || weaponId === 'laser') {
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

  // Для слоя теней (shadows.js): холст с Василием (прошлый кадр — разницы не видно) и где он на карте
  shadowSprite(player) {
    if (!this.isLoaded) return null;
    return { img: this.canvas, x: player.x - 55, y: player.y - 55 - 14, w: 110, h: 110, live: true };
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

    // Аура перегара рисуется облаком на земле до фигур (drawFumeAura в game.js)

    // Контактная тень под ногами (отбрасываемую кладёт слой теней, shadows.js)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
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
