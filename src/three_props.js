/**
 * ThreePropsManager
 * 2.5D Real-Time WebGL 3D Props & Vehicles Renderer for "Василий против пришельцев"
 *
 * Path A (Strict 3D Pipeline):
 * - Loads full 360° 3D meshes (.glb) generated via Hyper3D Rodin from AI concept art:
 *   1. car_zhiguli (Soviet Lada VAZ-2105/2107 sedan)
 *   2. car_uaz (Soviet UAZ-452 Bukhanka ambulance van)
 *   3. trash_dumpster (Soviet steel municipal TBO 0.75m3 container)
 *   4. military_crate (Soviet wooden 5.45-PS ammunition crate)
 * - Renders through Three.js WebGL with a 28° orthographic camera matching Vasily & enemies
 * - Uses offscreen directional pose caching (16 angles over 360°) for locked 60 FPS
 */

class ThreePropsManager {
  constructor() {
    this.models = {
      car_zhiguli: null,
      car_uaz: null,
      trash_dumpster: null,
      military_crate: null,
      loot_scrap: null,
      loot_bottle: null,
      loot_stew: null,
      loot_vodka: null,
      loot_bandage: null,
      mikhalyh_shop: null,
      garage_block: null,
      fence_po2: null,
      heating_pipes: null,
      weapon_shotgun: null
    };

    this.isLoaded = {
      car_zhiguli: false,
      car_uaz: false,
      trash_dumpster: false,
      military_crate: false,
      loot_scrap: false,
      loot_bottle: false,
      loot_stew: false,
      loot_vodka: false,
      loot_bandage: false,
      mikhalyh_shop: false,
      garage_block: false,
      fence_po2: false,
      heating_pipes: false,
      weapon_shotgun: false
    };

    this.modelHeights = {};

    // Cache: Map<`${propKey}_${dirIdx}`, HTMLCanvasElement>
    this.cache = new Map();

    // Offscreen WebGL canvas (high enough resolution for large vehicles & buildings)
    this.width = 256;
    this.height = 256;
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

    this.scene = new THREE.Scene();

    // 2.5D Orthographic Camera (28° pitch matching ThreeCharacterManager & ThreeEnemyManager)
    const frustumSize = 2.4;
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
    this.camera.lookAt(0, 0.55, 0);

    // Balanced 3-Point Lighting (prevents overexposing baked PBR textures on roofs)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    this.keyLight.position.set(3, 8, 5);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    this.fillLight.position.set(-4, 5, 3);
    this.scene.add(this.fillLight);

    this.roots = {
      car_zhiguli: new THREE.Group(),
      car_uaz: new THREE.Group(),
      trash_dumpster: new THREE.Group(),
      military_crate: new THREE.Group(),
      loot_scrap: new THREE.Group(),
      loot_bottle: new THREE.Group(),
      loot_stew: new THREE.Group(),
      loot_vodka: new THREE.Group(),
      loot_bandage: new THREE.Group(),
      mikhalyh_shop: new THREE.Group(),
      garage_block: new THREE.Group(),
      fence_po2: new THREE.Group(),
      heating_pipes: new THREE.Group(),
      weapon_shotgun: new THREE.Group()
    };

    for (const key in this.roots) {
      this.roots[key].visible = false;
      this.scene.add(this.roots[key]);
    }

    this.numDirections = 16;
    this.loadAllModels();
  }

  loadAllModels() {
    if (typeof THREE.GLTFLoader === 'undefined') {
      setTimeout(() => this.loadAllModels(), 200);
      return;
    }

    const loader = new THREE.GLTFLoader();
    const configs = [
      { key: 'car_zhiguli',    file: 'assets/models/car_zhiguli.glb',    targetSpan: 1.95, colorScale: 0.92 },
      { key: 'car_uaz',        file: 'assets/models/car_uaz.glb',        targetSpan: 1.95, colorScale: 0.92 },
      { key: 'trash_dumpster', file: 'assets/models/trash_dumpster.glb', targetSpan: 1.55, colorScale: 0.90 },
      { key: 'military_crate', file: 'assets/models/military_crate.glb', targetSpan: 1.55, colorScale: 0.90 },
      { key: 'loot_scrap',     file: 'assets/models/loot_scrap.glb',     targetSpan: 1.65, colorScale: 0.95 },
      { key: 'loot_bottle',    file: 'assets/models/loot_bottle.glb',    targetSpan: 1.75, colorScale: 0.95 },
      { key: 'loot_stew',      file: 'assets/models/loot_stew.glb',      targetSpan: 1.60, colorScale: 0.95 },
      { key: 'loot_vodka',     file: 'assets/models/loot_vodka.glb',     targetSpan: 1.75, colorScale: 0.95 },
      { key: 'loot_bandage',   file: 'assets/models/loot_bandage.glb',   targetSpan: 1.55, colorScale: 0.92 },
      { key: 'mikhalyh_shop',  file: 'assets/models/mikhalyh_shop.glb',  targetSpan: 1.95, colorScale: 0.84 },
      { key: 'garage_block',   file: 'assets/models/garage_block.glb',   targetSpan: 1.90, colorScale: 0.80 },
      { key: 'fence_po2',      file: 'assets/models/fence_po2.glb',      targetSpan: 2.05, colorScale: 0.72 },
      { key: 'heating_pipes',  file: 'assets/models/heating_pipes.glb',  targetSpan: 2.05, colorScale: 0.78 },
      { key: 'weapon_shotgun', file: 'assets/models/weapon_shotgun.glb', targetSpan: 1.85, colorScale: 0.95 }
    ];

    configs.forEach(cfg => {
      loader.load(
        cfg.file + '?v=' + Date.now(),
        (gltf) => {
          const model = gltf.scene;
          const cScale = cfg.colorScale || 0.90;

          // Configure materials & textures for crisp, non-washed-out PBR rendering matching dark dusk palette
          model.traverse((child) => {
            if (child.isMesh && child.material) {
              const mat = child.material;
              mat.depthWrite = true;
              mat.transparent = false;
              if (mat.color) mat.color.setRGB(cScale, cScale, cScale);
              if (typeof mat.roughness === 'number') mat.roughness = Math.max(mat.roughness, 0.82);
              if (typeof mat.metalness === 'number') mat.metalness = Math.min(mat.metalness, 0.10);
              if (mat.map) {
                mat.map.minFilter = THREE.LinearFilter;
                mat.map.magFilter = THREE.LinearFilter;
                mat.map.needsUpdate = true;
              }
            }
          });

          // Normalize bounding box: center X/Z at 0, place bottom on ground Y=0, scale to targetSpan
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          const maxDim = Math.max(size.x, size.y, size.z, 0.001);
          const scaleFactor = cfg.targetSpan / maxDim;
          model.scale.setScalar(scaleFactor);

          // Recompute box after scaling
          const scaledBox = new THREE.Box3().setFromObject(model);
          const scaledCenter = new THREE.Vector3();
          scaledBox.getCenter(scaledCenter);

          model.position.x -= scaledCenter.x;
          model.position.z -= scaledCenter.z;
          model.position.y -= scaledBox.min.y;

          this.modelHeights[cfg.key] = Math.max(0.2, scaledBox.max.y - scaledBox.min.y);
          this.models[cfg.key] = model;
          this.roots[cfg.key].add(model);
          this.isLoaded[cfg.key] = true;
          this.cache.clear();
          console.log(`[ThreePropsManager] 3D Model loaded: ${cfg.key}`);
        },
        undefined,
        (err) => console.warn(`[ThreePropsManager] 3D Model not yet available (${cfg.file}):`, err)
      );
    });
  }

  getFrameCanvas(propKey, dirIdx) {
    const cacheKey = `${propKey}_${dirIdx}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (!this.isLoaded[propKey] || !this.models[propKey]) {
      return null;
    }

    for (const k in this.roots) {
      this.roots[k].visible = (k === propKey);
    }

    const angle = (dirIdx / this.numDirections) * Math.PI * 2;
    this.roots[propKey].rotation.y = angle;

    // Look at vertical center of the normalized model
    const h = this.modelHeights[propKey] || 0.8;
    this.camera.lookAt(0, h * 0.48, 0);
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);

    const cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = this.width;
    cachedCanvas.height = this.height;
    const cctx = cachedCanvas.getContext('2d');
    cctx.drawImage(this.canvas, 0, 0);

    this.cache.set(cacheKey, cachedCanvas);
    return cachedCanvas;
  }

  /**
   * Renders the 3D Fortified Kiosk "Ларёк Михалыча 24/7" (.glb) in the Safe Zone,
   * strictly aligned with the city grid (dirIdx = 0).
   */
  drawShop(ctx, safeZone) {
    if (!this.isLoaded['mikhalyh_shop']) {
      return false;
    }

    const dirIdx = 0;
    const frameCanvas = this.getFrameCanvas('mikhalyh_shop', dirIdx);
    if (!frameCanvas) return false;

    const renderW = 275;
    const renderH = 275;

    ctx.save();
    ctx.translate(safeZone.shopX, safeZone.shopY - 10);

    // Ground contact shadow on concrete plaza
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.roundRect(-106, 22, 212, 48, 12);
    ctx.fill();

    ctx.drawImage(frameCanvas, -renderW / 2, -renderH / 2, renderW, renderH);
    ctx.restore();
    return true;
  }

  /**
   * Renders a 3D Soviet metal garage box (.glb) onto the main 2D game canvas,
   * oriented with its double steel doors facing forward (dirIdx = 0).
   */
  drawGarage(ctx, b) {
    if (!this.isLoaded['garage_block']) {
      return false;
    }

    const frameCanvas = this.getFrameCanvas('garage_block', 0);
    if (!frameCanvas) return false;

    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const renderW = 195;
    const renderH = 195;

    ctx.save();
    ctx.translate(cx, cy);

    // Concrete apron in front of garage doors + ambient shadow
    ctx.fillStyle = '#252b34';
    ctx.fillRect(-64, 18, 128, 34);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
    ctx.beginPath();
    ctx.roundRect(-72, -18, 144, 68, 8);
    ctx.fill();

    ctx.drawImage(frameCanvas, -renderW / 2, -renderH / 2, renderW, renderH);
    ctx.restore();
    return true;
  }

  /**
   * Renders a continuous multi-section PO-2 concrete perimeter fence wall (.glb)
   * flush against the outside edge of a building or garage cooperative.
   */
  drawFenceWall(ctx, b) {
    if (!this.isLoaded['fence_po2']) {
      return false;
    }

    const frameCanvas = this.getFrameCanvas('fence_po2', 0);
    if (!frameCanvas) return false;

    const segments = b.segments || 2;
    const segStep = 110;
    const renderW = 130;
    const renderH = 130;

    ctx.save();

    // 1. Dark weathered dirt/moss foundation strip along the base of the fence wall
    ctx.fillStyle = 'rgba(10, 14, 18, 0.55)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y + 8, segments * segStep, 22, 6);
    ctx.fill();

    // 2. Render connected 3D PO-2 slabs edge-to-edge (3D concrete footers meet naturally)
    for (let i = 0; i < segments; i++) {
      const sx = b.x + i * segStep + segStep * 0.5;
      const sy = b.y + b.h * 0.5 - 10;
      ctx.drawImage(frameCanvas, sx - renderW / 2, sy - renderH / 2, renderW, renderH);
    }

    ctx.restore();
    return true;
  }

  /**
   * Renders a continuous above-ground district heating pipeline (.glb) emerging flush from a building wall
   * and terminating into a concrete heat collector chamber (Тепловая Камера ТК) with a cast-iron manhole.
   */
  drawHeatingLine(ctx, b, manholeImg) {
    if (!this.isLoaded['heating_pipes']) {
      return false;
    }

    const frameCanvas = this.getFrameCanvas('heating_pipes', 0);
    if (!frameCanvas) return false;

    const segments = b.segments || 2;
    const segStep = 104;
    const renderW = 124;
    const renderH = 124;
    const cy = b.y + b.h * 0.5;

    ctx.save();

    // 1. Dark gravel/concrete trench bed under the pipeline
    ctx.fillStyle = 'rgba(12, 15, 20, 0.55)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y + 6, segments * segStep + 44, 32, 6);
    ctx.fill();

    // 2. Left end: Steel wall-entry collar flush against the exterior building wall
    ctx.fillStyle = '#1f242d';
    ctx.strokeStyle = '#0f1318';
    ctx.lineWidth = 2;
    ctx.fillRect(b.x - 4, cy - 20, 12, 40);
    ctx.strokeRect(b.x - 4, cy - 20, 12, 40);

    // 3. Connected 3D insulated pipe segments
    for (let i = 0; i < segments; i++) {
      const sx = b.x + 6 + i * segStep + segStep * 0.5;
      ctx.drawImage(frameCanvas, sx - renderW / 2, cy - renderH / 2 - 2, renderW, renderH);
    }

    // 4. Right end: Concrete Heat Collector Chamber (Тепловая камера ТК) where pipes go underground
    const endX = b.x + segments * segStep;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(endX - 2, cy - 24, 50, 50);

    ctx.fillStyle = '#323942';
    ctx.strokeStyle = '#1b2026';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(endX, cy - 22, 44, 44, 4);
    ctx.fill();
    ctx.stroke();

    if (manholeImg) {
      ctx.drawImage(manholeImg, endX + 4, cy - 18, 36, 36);
    } else {
      ctx.fillStyle = '#1e2229';
      ctx.beginPath();
      ctx.arc(endX + 22, cy, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return true;
  }

  /**
   * Renders a 3D container/vehicle onto the main 2D game canvas.
   * Returns true if 3D model is loaded and rendered, false to fallback while loading.
   */
  drawContainer(ctx, c) {
    let propKey = 'military_crate';
    let renderW = 76;
    let renderH = 76;
    let shadowRx = 26;
    let shadowRy = 15;

    if (c.type === 'car') {
      const isUaz = c.subType
        ? (c.subType === 'uaz')
        : (((Math.floor(c.x) + Math.floor(c.y)) % 2) === 0);
      propKey = isUaz ? 'car_uaz' : 'car_zhiguli';
      renderW = isUaz ? 215 : 205;
      renderH = isUaz ? 215 : 205;
      shadowRx = isUaz ? 72 : 68;
      shadowRy = isUaz ? 28 : 25;
    } else if (c.type === 'trash') {
      propKey = 'trash_dumpster';
      renderW = 88;
      renderH = 88;
      shadowRx = 26;
      shadowRy = 18;
    }

    if (!this.isLoaded[propKey]) {
      return false;
    }

    // Natural 3D orientation per container (uses explicit c.dirIdx if placed along a road/wall, else deterministic hash)
    let dirIdx;
    if (typeof c.dirIdx === 'number') {
      dirIdx = ((c.dirIdx % this.numDirections) + this.numDirections) % this.numDirections;
    } else {
      const hash = Math.abs(Math.floor(c.x * 17 + c.y * 31));
      const carAngles = [0, 1, 15, 7, 8, 9];
      const propAngles = [0, 1, 15, 2, 14];
      const allowed = c.type === 'car' ? carAngles : propAngles;
      dirIdx = allowed[hash % allowed.length];
    }
    const rotAngle = (dirIdx / this.numDirections) * Math.PI * 2;

    const frameCanvas = this.getFrameCanvas(propKey, dirIdx);
    if (!frameCanvas) return false;

    ctx.save();
    ctx.translate(c.x, c.y);

    // 1. Soft elliptical ground contact shadow aligned with 3D model rotation
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 8, shadowRx, shadowRy, -rotAngle, 0, Math.PI * 2);
    ctx.fill();

    // 2. Render 3D WebGL model
    if (c.searched) {
      ctx.globalAlpha = 0.55;
    }
    ctx.drawImage(frameCanvas, -renderW / 2, -renderH / 2, renderW, renderH);
    ctx.globalAlpha = 1.0;

    // 3. Interaction status indicator
    const indicatorY = c.type === 'car' ? -64 : -34;
    if (c.searched) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', 0, indicatorY);
    } else {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('▼', 0, indicatorY);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    return true;
  }

  /**
   * Renders a 360° 3D loot item (.glb) on the ground with gentle hover & slow 360° rotation.
   */
  drawLootItem(ctx, l) {
    const propKey = `loot_${l.type}`;
    if (!this.isLoaded[propKey]) {
      return false;
    }

    const now = Date.now();
    const hoverTime = now * 0.005;
    const hoverY = Math.sin(hoverTime + l.x) * 3;

    // Smoothly cycle through 16 3D angles (1 full turn every ~6.4 seconds)
    const dirIdx = Math.floor(((now * 0.0025 + l.x * 0.07 + l.y * 0.05) % 1.0) * this.numDirections) % this.numDirections;
    const frameCanvas = this.getFrameCanvas(propKey, dirIdx);
    if (!frameCanvas) return false;

    ctx.save();
    ctx.translate(l.x, l.y);

    // 1. Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Rarity glow halo per item type
    const glowColors = {
      vodka: 'rgba(245, 158, 11, 0.30)',
      stew: 'rgba(251, 191, 36, 0.28)',
      bandage: 'rgba(74, 222, 128, 0.28)',
      bottle: 'rgba(34, 197, 94, 0.24)',
      scrap: 'rgba(56, 189, 248, 0.24)'
    };
    ctx.fillStyle = glowColors[l.type] || 'rgba(56, 189, 248, 0.24)';
    ctx.beginPath();
    ctx.arc(0, hoverY, 16, 0, Math.PI * 2);
    ctx.fill();

    // 3. Render 360° 3D model
    const renderSize = 42;
    ctx.drawImage(frameCanvas, -renderSize / 2, -renderSize / 2 + hoverY, renderSize, renderSize);

    ctx.restore();
    return true;
  }
}

window.threeProps = new ThreePropsManager();
