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

    // Предварительно сгенерированные фиксированные позиции луж и люков для детерминированности
    this.staticPuddles = [];
    this.staticManholes = [];

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
      { key: 'manhole', path: 'assets/sprites/props/manhole_cover.png', type: 'prop' },
      { key: 'puddle', path: 'assets/sprites/props/puddle.png', type: 'prop' },
      { key: 'car_zhiguli', path: 'assets/sprites/props/car_zhiguli.png', type: 'prop' },
      { key: 'car_uaz', path: 'assets/sprites/props/car_uaz.png', type: 'prop' },
      { key: 'trash_dumpster', path: 'assets/sprites/props/trash_dumpster.png', type: 'prop' },
      { key: 'military_crate', path: 'assets/sprites/props/military_crate.png', type: 'prop' },

      // Здания
      { key: 'building_panel_320x160', path: 'assets/sprites/buildings/building_panel_320x160.png', type: 'building' },
      { key: 'building_panel_220x260', path: 'assets/sprites/buildings/building_panel_220x260.png', type: 'building' },
      { key: 'garage_block_140x100', path: 'assets/sprites/buildings/garage_block_140x100.png', type: 'building' },
      { key: 'mikhalyh_shop', path: 'assets/sprites/buildings/mikhalyh_shop.png', type: 'building' },

      // Выпадающий 3D лут
      { key: 'loot_scrap', path: 'assets/sprites/loot/loot_scrap.png', type: 'loot' },
      { key: 'loot_bottle', path: 'assets/sprites/loot/loot_bottle.png', type: 'loot' },
      { key: 'loot_stew', path: 'assets/sprites/loot/loot_stew.png', type: 'loot' },
      { key: 'loot_vodka', path: 'assets/sprites/loot/loot_vodka.png', type: 'loot' },
      { key: 'loot_bandage', path: 'assets/sprites/loot/loot_bandage.png', type: 'loot' }
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

    // 2. ДОРОЖНАЯ СЕТЬ (Тротуары, бордюры, асфальт, разметка)
    this.drawRoadNetwork(ctx, camera, screenW, screenH, roads);

    // 3. ДОРОЖНЫЕ ДЕТАЛИ (Люки и лужи)
    this.drawRoadProps(ctx, camera, screenW, screenH);

    // 4. БЕЗОПАСНАЯ ЗОНА (Магазин Михалыча, мешки, защитный купол)
    this.drawSafeZone(ctx, safeZone);

    // 5. ЗДАНИЯ (Панельки 320x160, 220x260, Гаражи)
    this.drawBuildings(ctx, camera, screenW, screenH, buildings);

    // 6. КОНТЕЙНЕРЫ (Жигули, УАЗики, мусорные баки, армейские ящики)
    this.drawContainers(ctx, camera, screenW, screenH, containers);
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
  }

  drawSafeZone(ctx, safeZone) {
    // Мягкое свечение периметра базы
    ctx.save();
    const time = Date.now() * 0.002;
    const pulse = Math.sin(time) * 6;

    const grad = ctx.createRadialGradient(safeZone.x, safeZone.y, safeZone.radius - 60, safeZone.x, safeZone.y, safeZone.radius + pulse);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.0)');
    grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.06)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.22)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, safeZone.radius + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Защитный энергетический барьер (пунктирный купол)
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Оборонительные мешки с песком вокруг лавки
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 2;
    const sandbags = [
      { x: safeZone.shopX - 110, y: safeZone.shopY + 50, w: 70, h: 22 },
      { x: safeZone.shopX + 40, y: safeZone.shopY + 50, w: 70, h: 22 },
      { x: safeZone.shopX - 120, y: safeZone.shopY - 40, w: 22, h: 70 },
      { x: safeZone.shopX + 100, y: safeZone.shopY - 40, w: 22, h: 70 }
    ];
    sandbags.forEach(sb => {
      ctx.beginPath();
      ctx.roundRect(sb.x, sb.y, sb.w, sb.h, 6);
      ctx.fill();
      ctx.stroke();
    });

    // 2.5D Киоск Михалыча
    if (this.buildings['mikhalyh_shop']) {
      const shopImg = this.buildings['mikhalyh_shop'];
      // Размеры спрайта 256x192, центрируем по магазину
      ctx.drawImage(shopImg, safeZone.shopX - shopImg.width / 2, safeZone.shopY - shopImg.height / 2 - 10);
    } else {
      // Fallback
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(safeZone.shopX - 45, safeZone.shopY - 35, 90, 70);
    }

    // Неоновая вывеска "У МИХАЛЫЧА" над киоском
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('КИОСК "У МИХАЛЫЧА" 24/7', safeZone.shopX, safeZone.shopY - 110);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  drawBuildings(ctx, camera, screenW, screenH, buildings) {
    buildings.forEach(b => {
      if (!this.isVisible(b.x - 30, b.y - 30, b.w + 60, b.h + 60, camera, screenW, screenH)) return;

      if (b.type === 'panel') {
        if (b.w >= 300 && this.buildings['building_panel_320x160']) {
          const img = this.buildings['building_panel_320x160'];
          // Отрисовываем спрайт (368x208 с запеченной тенью): смещение тени (-24, -24)
          ctx.drawImage(img, b.x - 24, b.y - 24, img.width, img.height);
          return;
        } else if (b.h >= 240 && this.buildings['building_panel_220x260']) {
          const img = this.buildings['building_panel_220x260'];
          ctx.drawImage(img, b.x - 24, b.y - 24, img.width, img.height);
          return;
        }
      } else if (b.type === 'garage' && this.buildings['garage_block_140x100']) {
        const img = this.buildings['garage_block_140x100'];
        ctx.drawImage(img, b.x - 16, b.y - 16, img.width, img.height);
        return;
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
      if (!this.isVisible(c.x - 70, c.y - 70, 140, 140, camera, screenW, screenH)) return;

      let img = null;
      let drawW = 54, drawH = 40;
      let rot = 0;

      if (c.type === 'car') {
        // Чередуем Жигули и УАЗик на основе координат
        const isUaz = ((Math.floor(c.x) + Math.floor(c.y)) % 2 === 0);
        img = isUaz ? this.props['car_uaz'] : this.props['car_zhiguli'];
        // Реалистичные пропорции: легковой седан 100x62, УАЗ-буханка 106x70
        drawW = isUaz ? 106 : 100;
        drawH = isUaz ? 70 : 62;
        rot = ((c.x * 37) % 60 - 30) * (Math.PI / 180); // Легкий случайный наклон парковки
      } else if (c.type === 'trash') {
        img = this.props['trash_dumpster'];
        // Мусорный бак ТБО: 48x48
        drawW = 48;
        drawH = 48;
        rot = ((c.y * 23) % 40 - 20) * (Math.PI / 180);
      } else {
        // Военный ящик боеприпасов: 44x44
        img = this.props['military_crate'];
        drawW = 44;
        drawH = 44;
      }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(rot);

      if (c.searched) {
        // Обысканный контейнер: полупрозрачный / затемненный
        ctx.globalAlpha = 0.55;
        if (img) {
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
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
        ctx.fillText('✓', 0, -drawH / 2 - 8);
      } else {
        // Необысканный контейнер
        if (img) {
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-16, -16, 32, 32);
        }

        // Тонкая золотистая обводка интерактивности вокруг тайника
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-drawW / 2 - 2, -drawH / 2 - 2, drawW + 4, drawH + 4);

        // Индикатор неоткрытого лута
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▼', 0, -drawH / 2 - 9);
      }

      ctx.restore();
    });
  }

  // Отрисовка высокодетализированного 3D выпавшего лута
  drawLootItem(ctx, l) {
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
      const size = 26;
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
