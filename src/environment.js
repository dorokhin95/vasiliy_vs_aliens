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

    // Предварительно сгенерированные фиксированные позиции луж, люков и дворовых объектов
    this.staticPuddles = [];
    this.staticManholes = [];
    this.staticCourtyardProps = [];

    this.initAssets();
    this.generateDecorations();
  }

  initAssets() {
    const assetsToLoad = [
      // Текстуры поверхности
      { key: 'asphalt', path: 'assets/textures/asphalt_road.png', type: 'pattern' },
      { key: 'ground', path: 'assets/textures/ground_terrain.png', type: 'pattern' },
      { key: 'sidewalk', path: 'assets/textures/sidewalk_tiles.png', type: 'pattern' },

      // Пропсы
      { key: 'manhole', path: 'assets/sprites/props/manhole_cover.png?v=1011', type: 'prop' },
      { key: 'puddle', path: 'assets/sprites/props/puddle.png?v=1011', type: 'prop' },
      { key: 'car_zhiguli', path: 'assets/sprites/props/car_zhiguli.png?v=1011', type: 'prop' },
      { key: 'car_uaz', path: 'assets/sprites/props/car_uaz.png?v=1011', type: 'prop' },
      { key: 'trash_dumpster', path: 'assets/sprites/props/trash_dumpster.png?v=1011', type: 'prop' },
      { key: 'military_crate', path: 'assets/sprites/props/military_crate.png?v=1011', type: 'prop' },
      { key: 'fence_po2', path: 'assets/sprites/props/fence_po2.png?v=1016', type: 'prop' },
      { key: 'heating_pipes', path: 'assets/sprites/props/heating_pipes.png?v=1016', type: 'prop' },

      // Здания
      { key: 'building_panel_320x160', path: 'assets/sprites/buildings/building_panel_320x160.png', type: 'building' },
      { key: 'building_panel_220x260', path: 'assets/sprites/buildings/building_panel_220x260.png', type: 'building' },
      { key: 'garage_block_140x100', path: 'assets/sprites/buildings/garage_block_140x100.png?v=1016', type: 'building' },
      { key: 'mikhalyh_shop', path: 'assets/sprites/buildings/mikhalyh_shop.png?v=1016', type: 'building' },

      // Выпадающий 3D лут
      { key: 'loot_scrap', path: 'assets/sprites/loot/loot_scrap.png?v=1012', type: 'loot' },
      { key: 'loot_bottle', path: 'assets/sprites/loot/loot_bottle.png?v=1012', type: 'loot' },
      { key: 'loot_stew', path: 'assets/sprites/loot/loot_stew.png?v=1012', type: 'loot' },
      { key: 'loot_vodka', path: 'assets/sprites/loot/loot_vodka.png?v=1012', type: 'loot' },
      { key: 'loot_bandage', path: 'assets/sprites/loot/loot_bandage.png?v=1012', type: 'loot' }
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

  generateDecorations() {
    // Статичные лужи и люки по всей дорожной сети (дороги y=800, 1900, 3100 и x=800, 1900, 3100)
    const roadLinesH = [800, 1900, 3100];
    const roadLinesV = [800, 1900, 3100];

    roadLinesH.forEach(ry => {
      const h = (ry === 1900) ? 200 : 140;
      for (let x = 150; x < 3900; x += 320) {
        // Люки каждые 320 пикселей ближе к обочине
        this.staticManholes.push({ x: x + ((x * 17) % 70), y: ry + 30 + ((x * 11) % (h - 60)) });
        // Лужи каждые 480 пикселей
        if (x % 480 < 300) {
          this.staticPuddles.push({
            x: x + 90,
            y: ry + h / 2 + ((x % 3) - 1) * 20,
            scale: 0.75 + (x % 5) * 0.1,
            rotation: ((x % 7) / 7) * Math.PI
          });
        }
      }
    });

    roadLinesV.forEach(rx => {
      const w = (rx === 1900) ? 200 : 140;
      for (let y = 150; y < 3900; y += 350) {
        this.staticManholes.push({ x: rx + 30 + ((y * 13) % (w - 60)), y: y + ((y * 19) % 80) });
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

    // 1.5. АТМОСФЕРНОЕ ЗОНИРОВАНИЕ РАЙОНОВ (оттенки почвы, масляные пятна у гаражей, воронки на кордоне, био-слизь в гнездах)
    this.drawDistrictAtmosphere(ctx, camera, screenW, screenH);

    // 2. ДОРОЖНАЯ СЕТЬ (Тротуары, бордюры, асфальт, разметка)
    this.drawRoadNetwork(ctx, camera, screenW, screenH, roads);

    // 3. ДОРОЖНЫЕ ДЕТАЛИ (Люки, лужи и трафаретные указатели районов)
    this.drawRoadProps(ctx, camera, screenW, screenH);

    // 4. БЕЗОПАСНАЯ ЗОНА (Магазин Михалыча на бетонной площади, защитный купол)
    this.drawSafeZone(ctx, camera, screenW, screenH, safeZone);

    // 5. ЗДАНИЯ И ИНФРАСТРУКТУРА (Панельки, 3D Гаражи, Секционные заборы ПО-2, Теплотрассы с камерами и паром)
    this.drawBuildings(ctx, camera, screenW, screenH, buildings);

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

    const SIDEWALK_WIDTH = 28;

    // Сначала тротуары по бокам дорог
    roads.forEach(r => {
      if (!this.isVisible(r.x - SIDEWALK_WIDTH, r.y - SIDEWALK_WIDTH, r.w + SIDEWALK_WIDTH * 2, r.h + SIDEWALK_WIDTH * 2, camera, screenW, screenH)) return;

      ctx.fillStyle = sidewalkPattern;
      if (r.w > r.h) {
        // Горизонтальная дорога: тротуары сверху и снизу
        ctx.fillRect(r.x, r.y - SIDEWALK_WIDTH, r.w, SIDEWALK_WIDTH);
        ctx.fillRect(r.x, r.y + r.h, r.w, SIDEWALK_WIDTH);

        // Бордюрный камень (темно-серый бетон со швами)
        ctx.fillStyle = '#1e2530';
        ctx.fillRect(r.x, r.y - 4, r.w, 4);
        ctx.fillRect(r.x, r.y + r.h, r.w, 4);
      } else {
        // Вертикальная дорога: тротуары слева и справа
        ctx.fillRect(r.x - SIDEWALK_WIDTH, r.y, SIDEWALK_WIDTH, r.h);
        ctx.fillRect(r.x + r.w, r.y, SIDEWALK_WIDTH, r.h);

        // Бордюр
        ctx.fillStyle = '#1e2530';
        ctx.fillRect(r.x - 4, r.y, 4, r.h);
        ctx.fillRect(r.x + r.w, r.y, 4, r.h);
      }
    });

    // Полотно асфальта
    roads.forEach(r => {
      if (!this.isVisible(r.x, r.y, r.w, r.h, camera, screenW, screenH)) return;

      ctx.fillStyle = asphaltPattern;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      // Глубокая тень по кромке обочины
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      if (r.w > r.h) {
        ctx.fillRect(r.x, r.y, r.w, 3);
        ctx.fillRect(r.x, r.y + r.h - 3, r.w, 3);
      } else {
        ctx.fillRect(r.x, r.y, 3, r.h);
        ctx.fillRect(r.x + r.w - 3, r.y, 3, r.h);
      }
    });

    // Разметка дорог: белая прерывистая и пешеходные переходы
    roads.forEach(r => {
      if (!this.isVisible(r.x, r.y, r.w, r.h, camera, screenW, screenH)) return;

      // Прерывистая разделительная полоса
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.setLineDash([32, 24]);
      ctx.beginPath();
      if (r.w > r.h) {
        ctx.moveTo(r.x, r.y + r.h / 2);
        ctx.lineTo(r.x + r.w, r.y + r.h / 2);
      } else {
        ctx.moveTo(r.x + r.w / 2, r.y);
        ctx.lineTo(r.x + r.w / 2, r.y + r.h);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Пешеходные переходы (зебра) вблизи перекрестков
      this.drawCrosswalks(ctx, r);
    });
  }

  drawCrosswalks(ctx, r) {
    // Зебры на въездах к центральному перекрестку (1900, 1900) и второстепенным
    const intersections = [800, 1900, 3100];
    ctx.fillStyle = 'rgba(235, 240, 248, 0.9)';

    if (r.w > r.h) {
      intersections.forEach(ix => {
        // Зебра слева (перед перекрестком) и справа (после перекрестка)
        const leftCrossX = ix - 60;
        const rightCrossX = ix + 220;
        
        [leftCrossX, rightCrossX].forEach(zx => {
          for (let zy = r.y + 12; zy < r.y + r.h - 12; zy += 18) {
            ctx.fillRect(zx, zy, 40, 10);
          }
        });
      });
    } else {
      intersections.forEach(iy => {
        const topCrossY = iy - 60;
        const bottomCrossY = iy + 220;

        [topCrossY, bottomCrossY].forEach(zy => {
          for (let zx = r.x + 12; zx < r.x + r.w - 12; zx += 18) {
            ctx.fillRect(zx, zy, 10, 40);
          }
        });
      });
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

    // 2. Затем отрисовываем основные здания (панельки и 3D-гаражи), чтобы стык труб/заборов аккуратно входил в стену
    buildings.forEach(b => {
      if (b.type === 'fence_wall' || b.type === 'heating_line') return;
      if (!this.isVisible(b.x - 40, b.y - 40, b.w + 80, b.h + 80, camera, screenW, screenH)) return;

      if (b.type === 'panel') {
        if (b.w >= 300 && this.buildings['building_panel_320x160']) {
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
    ctx.fillStyle = l.type === 'vodka' ? 'rgba(245, 158, 11, 0.22)' : (l.type === 'bottle' ? 'rgba(34, 197, 94, 0.22)' : 'rgba(56, 189, 248, 0.22)');
    ctx.beginPath();
    ctx.arc(0, hoverY, 14, 0, Math.PI * 2);
    ctx.fill();

    if (img) {
      const size = 28;
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
