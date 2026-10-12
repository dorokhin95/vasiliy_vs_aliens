/**
 * vasiliy_vs_aliens - Environment Renderer
 * Высокодетализированный 2.5D дизельпанк-рендерер советского окружения Новохмуринска:
 * - Бесшовный текстурированный асфальт с битумными заплатками и трещинами
 * - Бесшовный грунт (земля с гравием и пожухлой травой) во дворах
 * - Бетонные тротуары с бордюрным камнем по краям дорог
 * - Дорожная разметка: белые прерывистые полосы и пешеходные переходы (зебры)
 * - Чугунные ГОСТ-люки и радужные бензиновые лужи на дорогах
 * - Реалистичные 2.5D панельные дома (Хрущевки/Брежневки) с крышами, антеннами и запеченным светом окон (без мерцания)
 * - Гаражные кооперативы с металлическими воротами
 * - 3D-моделированные контейнеры: разбитые Жигули, УАЗ-буханка скорой, скошенные мусорные баки, армейские ящики
 * - Безопасная зона: магазин Михалыча с неоновой вывеской, решетками и мешками с песком
 * - Фрустум-клиппинг (viewport culling) для стабильных 60 FPS на карте 4000x4000
 */

class EnvironmentRenderer {
  constructor() {
    this.loaded = false;
    this.textures = {};
    this.patterns = {};
    this.props = {};
    this.buildings = {};

    // Предварительно сгенерированные фиксированные позиции луж, люков, фонарей и дворового благоустройства
    this.staticPuddles = [];
    this.staticManholes = [];
    this.staticStreetLamps = [];
    this.staticSidewalkBins = [];

    this.courtyardBuilt = false;
    this.courtyardWalkways = [];
    this.courtyardLawns = [];
    this.courtyardBenches = [];
    this.courtyardBins = [];
    this.courtyardBushes = [];
    this.courtyardTrees = [];

    this.initAssets();
    this.generateDecorations();
  }

  initAssets() {
    const assetsToLoad = [
      // Текстуры поверхности
      { key: 'asphalt', path: 'assets/textures/asphalt_road.png?v=1025', type: 'pattern' },
      { key: 'ground', path: 'assets/textures/ground_terrain.png?v=1025', type: 'pattern' },
      { key: 'sidewalk', path: 'assets/textures/sidewalk_tiles.png?v=1025', type: 'pattern' },

      // Пропсы дорог и дворов
      { key: 'manhole', path: 'assets/sprites/props/manhole_cover.png?v=1011', type: 'prop' },
      { key: 'puddle', path: 'assets/sprites/props/puddle.png?v=1011', type: 'prop' },
      { key: 'car_zhiguli', path: 'assets/sprites/props/car_zhiguli.png?v=1011', type: 'prop' },
      { key: 'car_uaz', path: 'assets/sprites/props/car_uaz.png?v=1011', type: 'prop' },
      { key: 'trash_dumpster', path: 'assets/sprites/props/trash_dumpster.png?v=1011', type: 'prop' },
      { key: 'military_crate', path: 'assets/sprites/props/military_crate.png?v=1011', type: 'prop' },
      { key: 'fence_po2', path: 'assets/sprites/props/fence_po2.png?v=1016', type: 'prop' },
      { key: 'heating_pipes', path: 'assets/sprites/props/heating_pipes.png?v=1016', type: 'prop' },
      { key: 'street_lamp', path: 'assets/sprites/props/street_lamp.png?v=1025', type: 'prop' },
      { key: 'courtyard_bench', path: 'assets/sprites/props/courtyard_bench.png?v=1025', type: 'prop' },
      { key: 'small_trash_bin', path: 'assets/sprites/props/small_trash_bin.png?v=1025', type: 'prop' },
      { key: 'autumn_tree_1', path: 'assets/sprites/props/autumn_tree_1.png?v=1025', type: 'prop' },
      { key: 'autumn_tree_2', path: 'assets/sprites/props/autumn_tree_2.png?v=1025', type: 'prop' },
      { key: 'courtyard_bush', path: 'assets/sprites/props/courtyard_bush.png?v=1025', type: 'prop' },
      { key: 'courtyard_bush_2', path: 'assets/sprites/props/courtyard_bush_2.png?v=1025', type: 'prop' },

      // Здания
      { key: 'building_panel_320x160', path: 'assets/sprites/buildings/building_panel_320x160.png?v=1024', type: 'building' },
      { key: 'building_panel_220x260', path: 'assets/sprites/buildings/building_panel_220x260.png?v=1024', type: 'building' },
      { key: 'building_boiler_house', path: 'assets/sprites/buildings/building_boiler_house.png?v=1024', type: 'building' },
      { key: 'building_military_hq', path: 'assets/sprites/buildings/building_military_hq.png?v=1024', type: 'building' },
      { key: 'garage_block_140x100', path: 'assets/sprites/buildings/garage_block_140x100.png?v=1016', type: 'building' },
      { key: 'mikhalyh_shop', path: 'assets/sprites/buildings/mikhalyh_shop.png?v=1016', type: 'building' },

      // Выпадающий 3D лут
      { key: 'loot_scrap', path: 'assets/sprites/loot/loot_scrap.png?v=1026', type: 'loot' },
      { key: 'loot_bottle', path: 'assets/sprites/loot/loot_bottle.png?v=1026', type: 'loot' },
      { key: 'loot_stew', path: 'assets/sprites/loot/loot_stew.png?v=1026', type: 'loot' },
      { key: 'loot_vodka', path: 'assets/sprites/loot/loot_vodka.png?v=1026', type: 'loot' },
      { key: 'loot_bandage', path: 'assets/sprites/loot/loot_bandage.png?v=1026', type: 'loot' },
      { key: 'loot_mil_parts', path: 'assets/sprites/loot/loot_mil_parts.png?v=1026', type: 'loot' },
      { key: 'loot_alien_core', path: 'assets/sprites/loot/loot_alien_core.png?v=1026', type: 'loot' },
      { key: 'loot_ammo_9x18', path: 'assets/sprites/loot/ammo_9x18.png?v=1026', type: 'loot' },
      { key: 'loot_ammo_12g', path: 'assets/sprites/loot/ammo_12g.png?v=1026', type: 'loot' }
    ];

    let remaining = assetsToLoad.length;
    const onAssetLoaded = () => {
      remaining--;
      if (remaining <= 0) {
        this.loaded = true;
      }
    };

    assetsToLoad.forEach(item => {
      const img = new Image();
      img.src = item.path;
      img.onload = () => {
        if (item.type === 'pattern') {
          this.textures[item.key] = img;
        } else if (item.type === 'prop') {
          this.props[item.key] = img;
        } else if (item.type === 'building') {
          this.buildings[item.key] = img;
        } else if (item.type === 'loot') {
          if (!this.loot) this.loot = {};
          this.loot[item.key] = img;
        }
        onAssetLoaded();
      };
      img.onerror = () => {
        console.warn(`[Environment] Failed to load ${item.path}`);
        onAssetLoaded();
      };
    });
  }

  isNearIntersection(coord) {
    return (
      (coord > 710 && coord < 1010) ||
      (coord > 1810 && coord < 2190) ||
      (coord > 3010 && coord < 3310)
    );
  }

  generateDecorations() {
    // Статичные лужи, люки, фонарные столбы и уличные урны по всей дорожной сети
    const roadLinesH = [800, 1900, 3100];
    const roadLinesV = [800, 1900, 3100];

    roadLinesH.forEach(ry => {
      const h = (ry === 1900) ? 200 : 140;
      for (let x = 160; x < 3880; x += 320) {
        if (!this.isNearIntersection(x)) {
          this.staticManholes.push({ x: x + ((x * 17) % 60), y: ry + 32 + ((x * 11) % (h - 64)) });
        }
        if (x % 480 < 300 && !this.isNearIntersection(x + 80)) {
          this.staticPuddles.push({
            x: x + 80,
            y: ry + h / 2 + ((x % 3) - 1) * 20,
            scale: 0.72 + (x % 5) * 0.08,
            rotation: ((x % 7) / 7) * Math.PI
          });
        }
      }

      // Уличные фонарные столбы «Кобра» вдоль тротуаров горизонтальных улиц
      for (let lx = 220; lx < 3820; lx += 340) {
        if (this.isNearIntersection(lx)) continue;
        // Чередуем верхний и нижний тротуар (а на центральном проспекте — по обе стороны)
        this.staticStreetLamps.push({
          x: lx,
          y: ry - 18,
          lightX: lx + 18,
          lightY: ry + 26,
          flipX: 1
        });
        if (ry === 1900 || ((lx / 340) % 2 === 0)) {
          this.staticStreetLamps.push({
            x: lx + 140,
            y: ry + h + 18,
            lightX: lx + 122,
            lightY: ry + h - 24,
            flipX: -1
          });
        }
        // Маленькие советские урны на тротуарах возле столбов
        if ((lx % 680) === 220) {
          this.staticSidewalkBins.push({ x: lx - 24, y: ry - 16 });
        }
      }
    });

    roadLinesV.forEach(rx => {
      const w = (rx === 1900) ? 200 : 140;
      for (let y = 160; y < 3880; y += 350) {
        if (!this.isNearIntersection(y)) {
          this.staticManholes.push({ x: rx + 32 + ((y * 13) % (w - 64)), y: y + ((y * 19) % 70) });
        }
      }
      // Фонарные столбы вдоль вертикальных улиц
      for (let ly = 240; ly < 3800; ly += 380) {
        if (this.isNearIntersection(ly)) continue;
        this.staticStreetLamps.push({
          x: rx - 18,
          y: ly,
          lightX: rx + 26,
          lightY: ly + 10,
          flipX: 1
        });
        if (rx === 1900) {
          this.staticStreetLamps.push({
            x: rx + w + 18,
            y: ly + 160,
            lightX: rx + w - 26,
            lightY: ly + 170,
            flipX: -1
          });
        }
      }
    });

    // Пара фонарей и урн прямо на площади у Ларька Михалыча
    this.staticStreetLamps.push(
      { x: 1888, y: 1936, lightX: 1916, lightY: 1956, flipX: 1 },
      { x: 2112, y: 1936, lightX: 2084, lightY: 1956, flipX: -1 }
    );
    this.staticSidewalkBins.push(
      { x: 1898, y: 1952 },
      { x: 2102, y: 1952 }
    );
  }

  ensureCourtyardLayout(buildings) {
    if (this.courtyardBuilt || !buildings || buildings.length === 0) return;
    this.courtyardBuilt = true;

    buildings.forEach((b, idx) => {
      if (b.type !== 'panel' && b.type !== 'boiler_house' && b.type !== 'military_hq') return;

      // 1. Внутридворовой тротуар перед фасадом здания
      const pathY = b.y + b.h + 28;
      const pathH = 22;
      this.courtyardWalkways.push({
        x: b.x - 14,
        y: pathY,
        w: b.w + 28,
        h: pathH,
        isMainPath: true
      });

      // Определяем координаты подъездов по типу здания
      let entrances = [];
      if (b.type === 'panel' && b.w >= 300) {
        // Хрущевка 320x160: 2 подъезда
        entrances = [b.x + 80, b.x + 244];
      } else if (b.type === 'panel' && b.h >= 240) {
        // Брежневка 220x260: 1 центральный подъезд
        entrances = [b.x + 108];
      } else {
        // Котельная / Военный штаб: центральный вход
        entrances = [b.x + b.w * 0.5];
      }

      // 2. Бетонные дорожки от каждого подъезда к дворовому тротуару + лавочки и урны
      entrances.forEach((ex, eIdx) => {
        const walkW = 34;
        this.courtyardWalkways.push({
          x: ex - walkW * 0.5,
          y: b.y + b.h - 2,
          w: walkW,
          h: 32,
          isMainPath: false
        });

        if (b.type === 'panel') {
          // У каждого подъезда жилого дома — деревянная скамейка и маленькая зеленая урна
          const side = (eIdx % 2 === 0) ? -1 : 1;
          const benchX = ex + side * 42;
          const benchY = b.y + b.h + 15;
          this.courtyardBenches.push({ x: benchX, y: benchY, flipX: side });
          this.courtyardBins.push({ x: ex - side * 28, y: b.y + b.h + 14 });
        } else {
          // У котельной и штаба — урна у входа
          this.courtyardBins.push({ x: ex + 34, y: b.y + b.h + 14 });
        }
      });

      // 3. Палисадники (газоны с низким побеленным поребриком) вдоль фасада и кусты/деревья
      if (b.type === 'panel' && b.w >= 300) {
        this.courtyardLawns.push(
          { x: b.x + 4,   y: b.y + b.h + 2, w: 54, h: 22 },
          { x: b.x + 104, y: b.y + b.h + 2, w: 116, h: 22 },
          { x: b.x + 266, y: b.y + b.h + 2, w: 50, h: 22 }
        );
        // Кусты в палисаднике под окнами первого этажа
        this.courtyardBushes.push(
          { x: b.x + 26,  y: b.y + b.h + 12, variant: 1, scale: 0.88 },
          { x: b.x + 162, y: b.y + b.h + 13, variant: 2, scale: 0.94 },
          { x: b.x + 294, y: b.y + b.h + 12, variant: 1, scale: 0.86 }
        );
        // Побеленные осенние деревья по углам двора перед домом
        this.courtyardTrees.push(
          { x: b.x - 28,       y: b.y + b.h + 24, variant: (idx % 2) + 1, scale: 0.95 },
          { x: b.x + b.w + 28, y: b.y + b.h + 28, variant: ((idx + 1) % 2) + 1, scale: 0.92 }
        );
      } else if (b.type === 'panel' && b.h >= 240) {
        this.courtyardLawns.push(
          { x: b.x + 6,   y: b.y + b.h + 2, w: 78, h: 22 },
          { x: b.x + 132, y: b.y + b.h + 2, w: 82, h: 22 }
        );
        this.courtyardBushes.push(
          { x: b.x + 36,  y: b.y + b.h + 12, variant: 2, scale: 0.90 },
          { x: b.x + 182, y: b.y + b.h + 12, variant: 1, scale: 0.90 }
        );
        this.courtyardTrees.push(
          { x: b.x - 26,       y: b.y + b.h + 18, variant: ((idx + 1) % 2) + 1, scale: 0.94 },
          { x: b.x + b.w + 26, y: b.y + b.h - 20, variant: (idx % 2) + 1, scale: 0.90 }
        );
      } else {
        // Озеленение вокруг котельных и штабов
        this.courtyardBushes.push(
          { x: b.x + 34,       y: b.y + b.h + 14, variant: 1, scale: 0.85 },
          { x: b.x + b.w - 34, y: b.y + b.h + 14, variant: 2, scale: 0.85 }
        );
        if (idx % 2 === 0) {
          this.courtyardTrees.push(
            { x: b.x - 30, y: b.y + b.h + 20, variant: 1, scale: 0.90 }
          );
        }
      }
    });
  }

  ensurePatterns(ctx) {
    if (this.textures['ground'] && !this.patterns['ground']) {
      this.patterns['ground'] = ctx.createPattern(this.textures['ground'], 'repeat');
    }
    if (this.textures['asphalt'] && !this.patterns['asphalt']) {
      this.patterns['asphalt'] = ctx.createPattern(this.textures['asphalt'], 'repeat');
    }
    if (this.textures['sidewalk'] && !this.patterns['sidewalk']) {
      this.patterns['sidewalk'] = ctx.createPattern(this.textures['sidewalk'], 'repeat');
    }
  }

  // Проверка видимости во фрустуме камеры
  isVisible(x, y, w, h, camera, screenW, screenH) {
    const margin = 200;
    return (
      x + w >= camera.x - margin &&
      x <= camera.x + screenW + margin &&
      y + h >= camera.y - margin &&
      y <= camera.y + screenH + margin
    );
  }

  draw(ctx, camera, screenW, screenH, worldWidth, worldHeight, roads, buildings, containers, safeZone) {
    this.ensurePatterns(ctx);
    this.ensureCourtyardLayout(buildings);

    const viewX = Math.max(0, camera.x);
    const viewY = Math.max(0, camera.y);
    const viewW = Math.min(worldWidth - viewX, screenW);
    const viewH = Math.min(worldHeight - viewY, screenH);

    // 1. БАЗОВАЯ ЗЕМЛЯ / ДВОРЫ
    if (this.patterns['ground']) {
      ctx.fillStyle = this.patterns['ground'];
      ctx.fillRect(viewX, viewY, viewW, viewH);
    } else {
      ctx.fillStyle = '#22272e';
      ctx.fillRect(viewX, viewY, viewW, viewH);
    }

    // 1.5. АТМОСФЕРНОЕ ЗОНИРОВАНИЕ РАЙОНОВ
    this.drawDistrictAtmosphere(ctx, camera, screenW, screenH);

    // 2. ДОРОЖНАЯ СЕТЬ (Тротуары из плит, объемные бордюры со швами, треснувший асфальт, потертая разметка)
    this.drawRoadNetwork(ctx, camera, screenW, screenH, roads);

    // 2.5. ВНУТРИДВОРОВЫЕ ДОРОЖКИ К ПОДЪЕЗДАМ И ПАЛИСАДНИКИ
    this.drawCourtyardGround(ctx, camera, screenW, screenH);

    // 3. ДОРОЖНЫЕ ДЕТАЛИ (Люки, лужи и трафаретные указатели районов)
    this.drawRoadProps(ctx, camera, screenW, screenH);

    // 4. БЕЗОПАСНАЯ ЗОНА (Магазин Михалыча на бетонной площади, защитный купол)
    this.drawSafeZone(ctx, camera, screenW, screenH, safeZone);

    // 5. ЗДАНИЯ И ИНФРАСТРУКТУРА (3D Хрущевки, Брежневки, Котельные, Штабы, 3D Гаражи, Заборы ПО-2, Теплотрассы)
    this.drawBuildings(ctx, camera, screenW, screenH, buildings);

    // 5.5. ДВОРОВОЕ БЛАГОУСТРОЙСТВО И УЛИЧНОЕ ОСВЕЩЕНИЕ (Скамейки, маленькие урны, кусты, деревья с побелкой, фонари «Кобра»)
    this.drawStreetAndCourtyardProps(ctx, camera, screenW, screenH);

    // 6. КОНТЕЙНЕРЫ (Жигули, УАЗики, мусорные баки, армейские ящики)
    this.drawContainers(ctx, camera, screenW, screenH, containers);
  }

  drawDistrictAtmosphere(ctx, camera, screenW, screenH) {
    const time = Date.now() * 0.0025;

    // A. Текстурное и цветовое тонирование кварталов по специализации
    const zones = [
      // Tier 2A: Гаражный кооператив «Восток» (Западные кварталы — темный гравий и мазут)
      { x: 0, y: 940, w: 800, h: 960, color: 'rgba(15, 23, 42, 0.34)', type: 'garages' },
      { x: 0, y: 2100, w: 800, h: 1000, color: 'rgba(15, 23, 42, 0.34)', type: 'garages' },
      // Tier 2B: Магистраль Теплотрассы (Восточные кварталы — оттаявший грунт и конденсат)
      { x: 3240, y: 940, w: 760, h: 960, color: 'rgba(14, 36, 52, 0.26)', type: 'heating' },
      { x: 3240, y: 2100, w: 760, h: 1000, color: 'rgba(14, 36, 52, 0.26)', type: 'heating' },
      // Tier 3: Военный Кордон (Север и Юг — выжженная земля и следы боев)
      { x: 940, y: 0, w: 960, h: 800, color: 'rgba(38, 18, 18, 0.26)', type: 'cordon' },
      { x: 2100, y: 0, w: 1000, h: 800, color: 'rgba(38, 18, 18, 0.26)', type: 'cordon' },
      { x: 940, y: 3240, w: 960, h: 760, color: 'rgba(38, 18, 18, 0.26)', type: 'cordon' },
      { x: 2100, y: 3240, w: 1000, h: 760, color: 'rgba(38, 18, 18, 0.26)', type: 'cordon' },
      // Tier 4: Квако-Гнездо (4 дальних угла — био-заражение пришельцев)
      { x: 0, y: 0, w: 800, h: 800, color: 'rgba(16, 48, 28, 0.34)', type: 'nest' },
      { x: 3240, y: 0, w: 760, h: 800, color: 'rgba(16, 48, 28, 0.34)', type: 'nest' },
      { x: 0, y: 3240, w: 800, h: 760, color: 'rgba(16, 48, 28, 0.34)', type: 'nest' },
      { x: 3240, y: 3240, w: 760, h: 760, color: 'rgba(16, 48, 28, 0.34)', type: 'nest' }
    ];

    for (let zIdx = 0; zIdx < zones.length; zIdx++) {
      const z = zones[zIdx];
      if (!this.isVisible(z.x, z.y, z.w, z.h, camera, screenW, screenH)) continue;
      ctx.fillStyle = z.color;
      ctx.fillRect(z.x, z.y, z.w, z.h);

      // Детали поверхности по типу района (без аллокаций градиентов каждый кадр)
      if (z.type === 'garages') {
        ctx.fillStyle = 'rgba(8, 10, 14, 0.55)';
        for (let i = 0; i < 5; i++) {
          const ox = z.x + 160 + ((i * 137) % (z.w - 280));
          const oy = z.y + 180 + ((i * 193) % (z.h - 320));
          ctx.beginPath();
          ctx.ellipse(ox, oy, 36 + (i % 3) * 10, 18 + (i % 2) * 8, 0.3 * i, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (z.type === 'cordon') {
        for (let i = 0; i < 4; i++) {
          const cx = z.x + 200 + ((i * 211) % (z.w - 360));
          const cy = z.y + 180 + ((i * 163) % (z.h - 320));
          ctx.fillStyle = 'rgba(30, 24, 22, 0.38)';
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(10, 10, 12, 0.65)';
          ctx.beginPath();
          ctx.arc(cx, cy, 18, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (z.type === 'nest') {
        for (let i = 0; i < 5; i++) {
          const bx = z.x + 160 + ((i * 149) % (z.w - 300));
          const by = z.y + 160 + ((i * 179) % (z.h - 300));
          const pulseR = 36 + Math.sin(time + i * 1.4) * 4;
          ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
          ctx.beginPath();
          ctx.arc(bx, by, pulseR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(74, 222, 128, 0.38)';
          ctx.beginPath();
          ctx.arc(bx, by, pulseR * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawRoadNetwork(ctx, camera, screenW, screenH, roads) {
    const sidewalkPattern = this.patterns['sidewalk'] || '#4b5563';
    const asphaltPattern = this.patterns['asphalt'] || '#1e2430';

    const SIDEWALK_WIDTH = 36;

    // 1. Тротуары из крупной советской бетонной плитки по бокам дорог + внешний поребрик газона
    roads.forEach(r => {
      if (!this.isVisible(r.x - SIDEWALK_WIDTH, r.y - SIDEWALK_WIDTH, r.w + SIDEWALK_WIDTH * 2, r.h + SIDEWALK_WIDTH * 2, camera, screenW, screenH)) return;

      ctx.fillStyle = sidewalkPattern;
      if (r.w > r.h) {
        // Горизонтальная дорога: тротуары сверху и снизу
        ctx.fillRect(r.x, r.y - SIDEWALK_WIDTH, r.w, SIDEWALK_WIDTH);
        ctx.fillRect(r.x, r.y + r.h, r.w, SIDEWALK_WIDTH);

        // Внешний бетонный поребрик на границе тротуара и дворового газона
        ctx.fillStyle = '#262c34';
        ctx.fillRect(r.x, r.y - SIDEWALK_WIDTH - 3, r.w, 3);
        ctx.fillRect(r.x, r.y + r.h + SIDEWALK_WIDTH, r.w, 3);
      } else {
        // Вертикальная дорога: тротуары слева и справа
        ctx.fillRect(r.x - SIDEWALK_WIDTH, r.y, SIDEWALK_WIDTH, r.h);
        ctx.fillRect(r.x + r.w, r.y, SIDEWALK_WIDTH, r.h);

        ctx.fillStyle = '#262c34';
        ctx.fillRect(r.x - SIDEWALK_WIDTH - 3, r.y, 3, r.h);
        ctx.fillRect(r.x + r.w + SIDEWALK_WIDTH, r.y, 3, r.h);
      }
    });

    // 2. Полотно треснувшего советского асфальта
    roads.forEach(r => {
      if (!this.isVisible(r.x, r.y, r.w, r.h, camera, screenW, screenH)) return;

      ctx.fillStyle = asphaltPattern;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      // Объемный советский дорожный бордюр БР 100.30.15 (светлая грань + темная фаска + водосточная тень)
      if (r.w > r.h) {
        // Верхний и нижний бортовой камень
        ctx.fillStyle = '#6c7582';
        ctx.fillRect(r.x, r.y - 6, r.w, 4);
        ctx.fillRect(r.x, r.y + r.h + 2, r.w, 4);

        ctx.fillStyle = '#252b33';
        ctx.fillRect(r.x, r.y - 2, r.w, 2);
        ctx.fillRect(r.x, r.y + r.h, r.w, 2);

        // Тень и грязь в водосточном желобе у бордюра
        ctx.fillStyle = 'rgba(8, 10, 14, 0.52)';
        ctx.fillRect(r.x, r.y, r.w, 5);
        ctx.fillRect(r.x, r.y + r.h - 5, r.w, 5);
      } else {
        ctx.fillStyle = '#6c7582';
        ctx.fillRect(r.x - 6, r.y, 4, r.h);
        ctx.fillRect(r.x + r.w + 2, r.y, 4, r.h);

        ctx.fillStyle = '#252b33';
        ctx.fillRect(r.x - 2, r.y, 2, r.h);
        ctx.fillRect(r.x + r.w, r.y, 2, r.h);

        ctx.fillStyle = 'rgba(8, 10, 14, 0.52)';
        ctx.fillRect(r.x, r.y, 5, r.h);
        ctx.fillRect(r.x + r.w - 5, r.y, 5, r.h);
      }
    });

    // 3. Разметка дорог: потертая прерывистая линия (прерывается на перекрестках!) и зебры со стоп-линиями
    const dashSegments = [
      [20, 725],
      [1015, 1825],
      [2175, 3025],
      [3315, 3980]
    ];

    roads.forEach(r => {
      if (!this.isVisible(r.x, r.y, r.w, r.h, camera, screenW, screenH)) return;

      ctx.strokeStyle = 'rgba(214, 222, 232, 0.62)';
      ctx.lineWidth = 4;
      ctx.setLineDash([28, 24]);
      ctx.beginPath();
      if (r.w > r.h) {
        const cy = r.y + r.h / 2;
        dashSegments.forEach(([s, e]) => {
          ctx.moveTo(s, cy);
          ctx.lineTo(e, cy);
        });
      } else {
        const cx = r.x + r.w / 2;
        dashSegments.forEach(([s, e]) => {
          ctx.moveTo(cx, s);
          ctx.lineTo(cx, e);
        });
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Пешеходные переходы (зебра) вблизи перекрестков
      this.drawCrosswalks(ctx, r);
    });
  }

  drawCrosswalks(ctx, r) {
    const crossRoads = [
      { pos: 800,  size: 140 },
      { pos: 1900, size: 200 },
      { pos: 3100, size: 140 }
    ];

    if (r.w > r.h) {
      crossRoads.forEach(cr => {
        const leftCrossX = cr.pos - 54;
        const rightCrossX = cr.pos + cr.size + 14;

        [leftCrossX, rightCrossX].forEach((zx, sideIdx) => {
          // Стоп-линия перед зеброй
          ctx.fillStyle = 'rgba(214, 222, 232, 0.52)';
          const stopX = sideIdx === 0 ? zx - 10 : zx + 44;
          ctx.fillRect(stopX, r.y + 10, 4, r.h - 20);

          // Полосы зебры с легкой потертостью от колес
          for (let zy = r.y + 12; zy < r.y + r.h - 14; zy += 18) {
            ctx.fillStyle = 'rgba(220, 226, 234, 0.66)';
            ctx.fillRect(zx, zy, 38, 10);
            ctx.fillStyle = 'rgba(30, 36, 44, 0.28)';
            ctx.fillRect(zx + 10, zy, 18, 10);
          }
        });
      });
    } else {
      crossRoads.forEach(cr => {
        const topCrossY = cr.pos - 54;
        const bottomCrossY = cr.pos + cr.size + 14;

        [topCrossY, bottomCrossY].forEach((zy, sideIdx) => {
          ctx.fillStyle = 'rgba(214, 222, 232, 0.52)';
          const stopY = sideIdx === 0 ? zy - 10 : zy + 44;
          ctx.fillRect(r.x + 10, stopY, r.w - 20, 4);

          for (let zx = r.x + 12; zx < r.x + r.w - 14; zx += 18) {
            ctx.fillStyle = 'rgba(220, 226, 234, 0.66)';
            ctx.fillRect(zx, zy, 10, 38);
            ctx.fillStyle = 'rgba(30, 36, 44, 0.28)';
            ctx.fillRect(zx, zy + 10, 10, 18);
          }
        });
      });
    }
  }

  drawCourtyardGround(ctx, camera, screenW, screenH) {
    const sidewalkPattern = this.patterns['sidewalk'] || '#4b5563';

    // 1. Палисадники (газоны с низким побеленным советским поребриком под окнами домов)
    for (let i = 0; i < this.courtyardLawns.length; i++) {
      const lw = this.courtyardLawns[i];
      if (!this.isVisible(lw.x - 10, lw.y - 10, lw.w + 20, lw.h + 20, camera, screenW, screenH)) continue;

      ctx.fillStyle = 'rgba(24, 34, 20, 0.52)';
      ctx.fillRect(lw.x, lw.y, lw.w, lw.h);

      // Побеленный кирпичный/бетонный бордюрчик палисадника
      ctx.strokeStyle = 'rgba(186, 194, 202, 0.58)';
      ctx.lineWidth = 2;
      ctx.strokeRect(lw.x, lw.y, lw.w, lw.h);
    }

    // 2. Бетонные дорожки от подъездов и дворовые тротуары
    for (let i = 0; i < this.courtyardWalkways.length; i++) {
      const cw = this.courtyardWalkways[i];
      if (!this.isVisible(cw.x - 10, cw.y - 10, cw.w + 20, cw.h + 20, camera, screenW, screenH)) continue;

      // Тень бордюра дорожки
      ctx.fillStyle = 'rgba(10, 14, 18, 0.55)';
      ctx.fillRect(cw.x - 2, cw.y - 2, cw.w + 4, cw.h + 4);

      // Мощение тротуарной плиткой
      ctx.fillStyle = sidewalkPattern;
      ctx.fillRect(cw.x, cw.y, cw.w, cw.h);

      // Светлый бетонный поребрик по краям дорожки
      ctx.strokeStyle = '#5c6572';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cw.x, cw.y, cw.w, cw.h);
    }
  }

  drawStreetAndCourtyardProps(ctx, camera, screenW, screenH) {
    const benchImg = this.props['courtyard_bench'];
    const binImg = this.props['small_trash_bin'];
    const bush1Img = this.props['courtyard_bush'];
    const bush2Img = this.props['courtyard_bush_2'] || bush1Img;
    const tree1Img = this.props['autumn_tree_1'];
    const tree2Img = this.props['autumn_tree_2'] || tree1Img;
    const lampImg = this.props['street_lamp'];

    // 1. Теплые пятна натриевого света от уличных фонарей на асфальте и тротуарах
    for (let i = 0; i < this.staticStreetLamps.length; i++) {
      const lp = this.staticStreetLamps[i];
      if (!this.isVisible(lp.lightX - 90, lp.lightY - 90, 180, 180, camera, screenW, screenH)) continue;

      ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
      ctx.beginPath();
      ctx.ellipse(lp.lightX, lp.lightY, 78, 52, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(253, 224, 71, 0.11)';
      ctx.beginPath();
      ctx.ellipse(lp.lightX, lp.lightY, 42, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Дворовые кусты в палисадниках
    if (bush1Img) {
      for (let i = 0; i < this.courtyardBushes.length; i++) {
        const b = this.courtyardBushes[i];
        if (!this.isVisible(b.x - 50, b.y - 50, 100, 100, camera, screenW, screenH)) continue;
        const img = (b.variant === 2 && bush2Img) ? bush2Img : bush1Img;
        const w = 78 * b.scale;
        const h = 62 * b.scale;
        ctx.drawImage(img, b.x - w * 0.5, b.y - h * 0.55, w, h);
      }
    }

    // 3. Дворовые деревянные скамейки у подъездов
    if (benchImg) {
      for (let i = 0; i < this.courtyardBenches.length; i++) {
        const bn = this.courtyardBenches[i];
        if (!this.isVisible(bn.x - 50, bn.y - 40, 100, 80, camera, screenW, screenH)) continue;
        ctx.save();
        ctx.translate(bn.x, bn.y);
        ctx.scale(bn.flipX || 1, 1);
        ctx.drawImage(benchImg, -36, -24, 72, 48);
        ctx.restore();
      }
    }

    // 4. Маленькие советские урны (у скамеек возле подъездов и вдоль тротуаров)
    if (binImg) {
      for (let i = 0; i < this.courtyardBins.length; i++) {
        const tb = this.courtyardBins[i];
        if (!this.isVisible(tb.x - 30, tb.y - 30, 60, 60, camera, screenW, screenH)) continue;
        ctx.drawImage(binImg, tb.x - 18, tb.y - 20, 36, 36);
      }
      for (let i = 0; i < this.staticSidewalkBins.length; i++) {
        const tb = this.staticSidewalkBins[i];
        if (!this.isVisible(tb.x - 30, tb.y - 30, 60, 60, camera, screenW, screenH)) continue;
        ctx.drawImage(binImg, tb.x - 18, tb.y - 20, 36, 36);
      }
    }

    // 5. Осенние дворовые деревья с побеленными стволами
    if (tree1Img) {
      for (let i = 0; i < this.courtyardTrees.length; i++) {
        const tr = this.courtyardTrees[i];
        if (!this.isVisible(tr.x - 95, tr.y - 140, 190, 180, camera, screenW, screenH)) continue;
        const img = (tr.variant === 2 && tree2Img) ? tree2Img : tree1Img;
        const w = (tr.variant === 2 ? 156 : 142) * tr.scale;
        const h = (tr.variant === 2 ? 146 : 164) * tr.scale;
        // Мягкая тень на земле у корней дерева
        ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
        ctx.beginPath();
        ctx.ellipse(tr.x, tr.y + 4, 24 * tr.scale, 11 * tr.scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(img, tr.x - w * 0.5, tr.y - h + 16, w, h);
      }
    }

    // 6. Уличные бетонные фонарные столбы «Кобра»
    if (lampImg) {
      for (let i = 0; i < this.staticStreetLamps.length; i++) {
        const lp = this.staticStreetLamps[i];
        if (!this.isVisible(lp.x - 60, lp.y - 160, 120, 180, camera, screenW, screenH)) continue;

        ctx.save();
        ctx.translate(lp.x, lp.y);
        // Тень у основания бетонного столба
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.scale(lp.flipX || 1, 1);
        ctx.drawImage(lampImg, -36, -138, 72, 144);

        // Теплое свечение самой натриевой лампы в плафоне «Кобры»
        ctx.fillStyle = 'rgba(253, 224, 71, 0.38)';
        ctx.beginPath();
        ctx.arc(16, -116, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawRoadProps(ctx, camera, screenW, screenH) {
    // 1. Лужи
    if (this.props['puddle']) {
      const pImg = this.props['puddle'];
      this.staticPuddles.forEach(p => {
        if (!this.isVisible(p.x - 70, p.y - 50, 140, 100, camera, screenW, screenH)) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        ctx.drawImage(pImg, -pImg.width / 2, -pImg.height / 2);
        ctx.restore();
      });
    }

    // 2. Чугунные люки
    if (this.props['manhole']) {
      const mImg = this.props['manhole'];
      this.staticManholes.forEach(m => {
        if (!this.isVisible(m.x - 32, m.y - 32, 64, 64, camera, screenW, screenH)) return;
        ctx.drawImage(mImg, m.x - 24, m.y - 24, 48, 48);
      });
    }

    // 3. Дорожные трафаретные указатели секторов Новохмуринска на асфальте
    const stencils = [
      { x: 960,  y: 2000, text: '◄ ГСК «ВОСТОК» [ЧЕРМЕТ]', color: 'rgba(251, 146, 60, 0.72)' },
      { x: 3040, y: 2000, text: 'ТЕПЛОСЕТЬ [ВОДКА / ТУШЁНКА] ►', color: 'rgba(56, 189, 248, 0.72)' },
      { x: 2000, y: 1020, text: '▲ ВОЕННЫЙ КОРДОН [ВОЕНТОРГ]', color: 'rgba(248, 113, 113, 0.75)' },
      { x: 2000, y: 2980, text: '▼ ВОЕННЫЙ КОРДОН [ВОЕНТОРГ]', color: 'rgba(248, 113, 113, 0.75)' },
      { x: 640,  y: 870,  text: '⚠ КВАКО-ГНЕЗДО СЗ [ЛУТ ×2.5]', color: 'rgba(192, 132, 252, 0.80)' },
      { x: 3360, y: 870,  text: '⚠ КВАКО-ГНЕЗДО СВ [ЛУТ ×2.5]', color: 'rgba(192, 132, 252, 0.80)' },
      { x: 640,  y: 3170, text: '⚠ КВАКО-ГНЕЗДО ЮЗ [ЛУТ ×2.5]', color: 'rgba(192, 132, 252, 0.80)' },
      { x: 3360, y: 3170, text: '⚠ КВАКО-ГНЕЗДО ЮВ [ЛУТ ×2.5]', color: 'rgba(192, 132, 252, 0.80)' }
    ];

    ctx.save();
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    stencils.forEach(s => {
      if (!this.isVisible(s.x - 160, s.y - 40, 320, 80, camera, screenW, screenH)) return;
      ctx.fillStyle = 'rgba(10, 14, 20, 0.55)';
      ctx.fillRect(s.x - 125, s.y - 13, 250, 26);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, s.x, s.y);
    });
    ctx.restore();
  }

  drawSafeZone(ctx, camera, screenW, screenH, safeZone) {
    const rBound = safeZone.radius + 40;
    if (!this.isVisible(safeZone.x - rBound, safeZone.y - rBound, rBound * 2, rBound * 2, camera, screenW, screenH)) {
      return;
    }

    ctx.save();
    const time = Date.now() * 0.002;
    const pulse = Math.sin(time) * 6;

    // 1. Бетонный островок безопасности / площадка под Ларьком Михалыча
    const sidewalkPattern = this.patterns['sidewalk'] || '#3b4252';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(safeZone.shopX - 124, safeZone.shopY - 58, 248, 128, 16);
    ctx.fill();

    ctx.fillStyle = sidewalkPattern;
    ctx.strokeStyle = '#1e2530';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(safeZone.shopX - 120, safeZone.shopY - 62, 240, 124, 14);
    ctx.fill();
    ctx.stroke();

    // 2. Мягкое свечение периметра базы (без аллокации createRadialGradient)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, safeZone.radius + pulse, 0, Math.PI * 2);
    ctx.fill();

    // 3. Защитный энергетический барьер (пунктирный купол)
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Путь А: 360° 3D-модель Ларька Михалыча (выровнена по сетке дорог dirIdx = 0)
    const rendered3DShop = window.threeProps && window.threeProps.drawShop(ctx, safeZone);

    if (!rendered3DShop) {
      if (this.buildings['mikhalyh_shop']) {
        const shopImg = this.buildings['mikhalyh_shop'];
        ctx.drawImage(shopImg, safeZone.shopX - shopImg.width / 2, safeZone.shopY - shopImg.height / 2 - 10);
      } else {
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(safeZone.shopX - 45, safeZone.shopY - 35, 90, 70);
      }
    }

    // 5. Неоновая вывеска "У МИХАЛЫЧА" над киоском (без тяжелого shadowBlur)
    ctx.fillStyle = 'rgba(6, 78, 59, 0.78)';
    ctx.beginPath();
    ctx.roundRect(safeZone.shopX - 118, safeZone.shopY - 134, 236, 24, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('КИОСК "У МИХАЛЫЧА" 24/7', safeZone.shopX, safeZone.shopY - 122);

    ctx.restore();
  }

  drawBuildings(ctx, camera, screenW, screenH, buildings) {
    const time = Date.now() * 0.003;

    // 1. Сначала отрисовываем примыкающие секционные заборы ПО-2 и магистрали теплотрассы
    buildings.forEach(b => {
      if (b.type !== 'fence_wall' && b.type !== 'heating_line') return;
      if (!this.isVisible(b.x - 60, b.y - 60, b.w + 120, b.h + 120, camera, screenW, screenH)) return;

      if (b.type === 'fence_wall') {
        if (window.threeProps && window.threeProps.drawFenceWall(ctx, b)) return;
        const img = this.props['fence_po2'];
        if (img) {
          const segments = b.segments || 2;
          for (let i = 0; i < segments; i++) {
            ctx.drawImage(img, b.x + i * 104 - 10, b.y - 38, 128, 88);
          }
          return;
        }
      } else if (b.type === 'heating_line') {
        const rendered = window.threeProps && window.threeProps.drawHeatingLine(ctx, b, this.props['manhole']);
        if (!rendered) {
          const img = this.props['heating_pipes'];
          if (img) {
            const segments = b.segments || 2;
            for (let i = 0; i < segments; i++) {
              ctx.drawImage(img, b.x + i * 94 - 10, b.y - 26, 120, 84);
            }
          }
        }
        // Клубы теплого белого пара над вентилями и камерами теплотрассы
        ctx.save();
        const steamX = b.x + b.w - 22 + Math.sin(time + b.x) * 5;
        const steamY = b.y + 8 - ((time * 8 + b.y) % 18);
        ctx.fillStyle = 'rgba(226, 232, 240, 0.16)';
        ctx.beginPath();
        ctx.arc(steamX, steamY, 16 + Math.sin(time * 1.5) * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
    });

    // 2. Затем отрисовываем основные здания (3D Хрущевки, Брежневки, Котельные ТЭЦ, Военные штабы и 3D-гаражи)
    buildings.forEach(b => {
      if (b.type === 'fence_wall' || b.type === 'heating_line') return;
      if (!this.isVisible(b.x - 40, b.y - 40, b.w + 80, b.h + 80, camera, screenW, screenH)) return;

      if (b.type === 'panel' || b.type === 'boiler_house' || b.type === 'military_hq') {
        // Путь А: Рендеринг честной 360° 3D-модели здания (.glb) через Three.js WebGL
        if (window.threeProps && window.threeProps.drawMajorBuilding(ctx, b)) {
          return;
        }
        // Мгновенный 2D-фоллбэк из концепт-арта, пока загружается .glb
        if (b.type === 'boiler_house' && this.buildings['building_boiler_house']) {
          const img = this.buildings['building_boiler_house'];
          ctx.drawImage(img, b.x - 24, b.y - 24, img.width, img.height);
          return;
        } else if (b.type === 'military_hq' && this.buildings['building_military_hq']) {
          const img = this.buildings['building_military_hq'];
          ctx.drawImage(img, b.x - 24, b.y - 24, img.width, img.height);
          return;
        } else if (b.w >= 300 && this.buildings['building_panel_320x160']) {
          const img = this.buildings['building_panel_320x160'];
          ctx.drawImage(img, b.x - 24, b.y - 24, img.width, img.height);
          return;
        } else if (b.h >= 240 && this.buildings['building_panel_220x260']) {
          const img = this.buildings['building_panel_220x260'];
          ctx.drawImage(img, b.x - 24, b.y - 24, img.width, img.height);
          return;
        }
      } else if (b.type === 'garage') {
        // Путь А: Рендеринг честной 360° 3D-модели гаража (.glb) через Three.js WebGL (воротами вперед)
        if (window.threeProps && window.threeProps.drawGarage(ctx, b)) {
          return;
        }
        if (this.buildings['garage_block_140x100']) {
          const img = this.buildings['garage_block_140x100'];
          ctx.drawImage(img, b.x - 16, b.y - 16, img.width, img.height);
          return;
        }
      }

      // Fallback
      ctx.fillStyle = b.type === 'panel' ? '#2d3748' : '#475569';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });
  }

  drawContainers(ctx, camera, screenW, screenH, containers) {
    containers.forEach(c => {
      if (!this.isVisible(c.x - 110, c.y - 110, 220, 220, camera, screenW, screenH)) return;

      // Путь А: Рендеринг честной 360° 3D-модели (.glb) через Three.js WebGL
      if (window.threeProps && window.threeProps.drawContainer(ctx, c)) {
        return;
      }

      let img = null;
      let drawW = 58, drawH = 42;
      let flipX = 1;

      if (c.type === 'car') {
        const isUaz = c.subType
          ? (c.subType === 'uaz')
          : (((Math.floor(c.x) + Math.floor(c.y)) % 2) === 0);
        img = isUaz ? this.props['car_uaz'] : this.props['car_zhiguli'];
        drawW = isUaz ? 208 : 200;
        drawH = isUaz ? 143 : 125;
        flipX = ((Math.floor(c.x * 13 + c.y * 7) % 2) === 0) ? 1 : -1;
      } else if (c.type === 'trash') {
        img = this.props['trash_dumpster'];
        drawW = 68;
        drawH = 68;
      } else {
        img = this.props['military_crate'];
        drawW = 58;
        drawH = 42;
      }

      ctx.save();
      ctx.translate(c.x, c.y);

      if (c.searched) {
        // Обысканный контейнер: полупрозрачный / затемненный
        ctx.globalAlpha = 0.55;
        if (img) {
          ctx.save();
          ctx.scale(flipX, 1);
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        } else {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-16, -16, 32, 32);
        }
        ctx.globalAlpha = 1.0;

        // Отметка обыска
        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', 0, -drawH / 2 - 6);
      } else {
        // Необысканный контейнер
        if (img) {
          ctx.save();
          ctx.scale(flipX, 1);
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        } else {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-16, -16, 32, 32);
        }

        // Индикатор неоткрытого тайника над объектом
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText('▼', 0, -drawH / 2 - 6);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    });
  }

  // Отрисовка высокодетализированного 3D выпавшего лута
  drawLootItem(ctx, l) {
    // Путь А: Рендеринг честной 360° 3D-модели (.glb) через Three.js WebGL
    if (window.threeProps && window.threeProps.drawLootItem(ctx, l)) {
      return;
    }

    let img = null;
    const typeKey = `loot_${l.type}`;
    if (this.loot && this.loot[typeKey]) {
      img = this.loot[typeKey];
    }

    ctx.save();
    ctx.translate(l.x, l.y);

    // Легкое покачивание и парение выпавшего лута
    const time = Date.now() * 0.005;
    const hoverY = Math.sin(time + l.x) * 3;

    // Свечение редкости вокруг лута
    let glowColor = 'rgba(56, 189, 248, 0.22)';
    if (l.type === 'vodka') glowColor = 'rgba(245, 158, 11, 0.25)';
    else if (l.type === 'bottle') glowColor = 'rgba(34, 197, 94, 0.22)';
    else if (l.type === 'mil_parts') glowColor = 'rgba(239, 68, 68, 0.34)';
    else if (l.type === 'alien_core') glowColor = 'rgba(168, 85, 247, 0.42)';
    else if (l.type === 'ammo_9x18' || l.type === 'ammo_12g') glowColor = 'rgba(250, 204, 21, 0.28)';

    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, hoverY, (l.type === 'alien_core' || l.type === 'mil_parts') ? 17 : 14, 0, Math.PI * 2);
    ctx.fill();

    if (img) {
      const size = (l.type === 'alien_core' || l.type === 'mil_parts') ? 32 : 28;
      ctx.drawImage(img, -size / 2, -size / 2 + hoverY, size, size);
    } else {
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.icon, 0, hoverY);
    }

    ctx.restore();
  }
}

window.environmentRenderer = new EnvironmentRenderer();
