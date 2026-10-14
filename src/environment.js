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
 * - Фрустум-клиппинг (viewport culling) для стабильных 60 FPS на карте 6000x6000
 */

// --- РАСКЛАДКА КАРТЫ НОВОХМУРИНСКА (общая для environment.js и game.js: скрипты без модулей) ---
// Карта 6000×6000. Раньше была 4000, а дома — в 2,55 раза мельче: Василий рядом с хрущёвкой казался
// великаном. Три дороги по каждой оси: две кольцевые и проспект через центр, где купол Михалыча.
// Кварталы, районы, гнёзда и логово Мясника считаются отсюда
const MAP = (() => {
  const SIZE = 6000;
  const ROADS = [{ pos: 1215, size: 180 }, { pos: 2870, size: 260 }, { pos: 4665, size: 180 }];
  const end = r => r.pos + r.size;
  const mid = r => r.pos + r.size / 2;
  return {
    SIZE,
    ROADS,
    MAIN: ROADS[1],
    CENTER: mid(ROADS[1]),          // 3000 — купол Михалыча на перекрёстке проспектов
    RING_A: mid(ROADS[0]),          // середины кольцевых дорог — граница внешних районов
    RING_B: mid(ROADS[2]),
    // Полосы между дорогами по одной оси — для подсветки районов
    BANDS: [[0, ROADS[0].pos], [end(ROADS[0]), ROADS[1].pos], [end(ROADS[1]), ROADS[2].pos], [end(ROADS[2]), SIZE]],
    // Кварталы под застройку: полосы с отступом от дорог и края карты
    BLOCKS: [[165, ROADS[0].pos - 60], [end(ROADS[0]) + 50, ROADS[1].pos - 60],
      [end(ROADS[1]) + 50, ROADS[2].pos - 60], [end(ROADS[2]) + 50, SIZE - 165]],
    SPACE: 1.5,                      // расстояния внутри кварталов — во столько раз больше прежних
    HOUSE: 2.55                      // дома — во столько раз крупнее прежних (этаж почти в рост Василия)
  };
})();

// Какой это дом: хрущёвка, брежневка, котельная — и во сколько раз он крупнее исходного
// размера модели (на котором замерены подъезды, палисадники и выступ крыши)
const HOUSE_BASE = { khrushchevka: [320, 160], brezhnevka: [220, 260], boiler_house: [320, 160] };
function houseKind(b) {
  if (b.type === 'factory') return b.model;
  return b.type === 'panel' ? (b.subType || (b.w > b.h ? 'khrushchevka' : 'brezhnevka')) : b.type;
}
// Здания с 3D-моделью: дома города и цеха Промзоны (factory) — у них силуэтная коллизия, тень, полупрозрачность
function isModelBuilding(b) {
  return b.type === 'panel' || b.type === 'boiler_house' || b.type === 'factory';
}

// --- Модели Промзоны: габарит в метрах [длина, глубина, высота], как их выдаёт tools/finalize_promzona_blender.py.
// Здания и декор — постройки типа factory, вагоны, машины и бочки — тайники. Модель в кадре нормализуется
// по наибольшему габариту (PZ_TARGET_SPAN), поэтому из габарита и ширины пятна на карте считается всё:
// кадр, глубина пятна и насколько модель поднимается над ним (pzFrame)
const PZ_TARGET_SPAN = 2.15;
// Высокие модели нормализуются мельче: кадр 2,4 единицы, а камера смотрит в 0,48 высоты — у градирни
// задний край верхнего кольца уходил за кадр и обрезался
const PZ_SPAN = { building_cooling_tower: 1.85 };
function pzSpan(model) {
  return PZ_SPAN[model] || PZ_TARGET_SPAN;
}
const PZ_MODELS = {
  building_admin: [60, 31.1, 19.6],
  building_checkpoint: [12, 2.7, 3.3],
  building_cooling_tower: [37.6, 37.6, 44.9],
  building_foundry: [70, 35, 23.7],
  building_gasholder: [36.0, 36.0, 24.6],
  building_mech_workshop: [55, 25, 15.5],
  building_oil_tank: [25.3, 25.3, 13.2],
  building_pump_station: [18, 10.4, 4.4],
  building_smokestack: [8.2, 8.2, 26.5],
  building_warehouse: [50, 27.4, 14.0],
  prop_locomotive: [16.3, 3.3, 5.3],
  prop_gantry_crane: [25, 12, 10.8],
  prop_pipe_rack: [12, 1.2, 5.1],
  prop_pipe_stack: [8.3, 9.1, 2.8],
  prop_cable_reel: [2.6, 2.6, 2.2],
  container_boxcar: [14, 3.2, 4.9],
  container_gondola: [14, 3.2, 3.4],
  container_tankcar: [12, 2.9, 4.0],
  container_kamaz: [7.5, 2.6, 3.3],
  container_zil: [6.7, 2.6, 2.8],
  container_barrel: [0.9, 0.9, 1.3],
  // Сейфы (src/safes.js) — тоже тайники, с открытым вариантом
  safe_cabinet: [0.79, 0.76, 1.56],
  safe_fireproof: [0.85, 0.89, 1.03],
  safe_vault: [1.29, 1.24, 1.54]
};
// Яркость моделей Промзоны (множитель цвета материала). Цеха и декор сделаны вручную по концептам
// (tools/model_promzona_blender.py): материал неосвещённый, свет нарисован на концепте — множитель 1.
// Тайники — модели Rodin, у них по умолчанию 0,86
const PZ_COLOR = {
  building_admin: 1, building_checkpoint: 1, building_cooling_tower: 1, building_foundry: 1, building_gasholder: 1,
  building_mech_workshop: 1, building_oil_tank: 1, building_pump_station: 1, building_smokestack: 1, building_warehouse: 1,
  prop_cable_reel: 1, prop_gantry_crane: 1, prop_locomotive: 1, prop_pipe_rack: 1, prop_pipe_stack: 1
};
// Тайники Промзоны: тип → модель и длина на карте, px (машины города ~40 px/м, вагоны чуть ужаты)
const PZ_CONTAINERS = {
  boxcar: { model: 'container_boxcar', len: 470 },
  gondola: { model: 'container_gondola', len: 470 },
  tankcar: { model: 'container_tankcar', len: 400 },
  kamaz: { model: 'container_kamaz', len: 270 },
  zil: { model: 'container_zil', len: 245 },
  barrel: { model: 'container_barrel', len: 36 },
  // Сейфы чуть крупнее масштаба бочки — их надо замечать
  safe_cabinet: { model: 'safe_cabinet', len: 44 },
  safe_fireproof: { model: 'safe_fireproof', len: 48 },
  safe_vault: { model: 'safe_vault', len: 70 }
};

// Кадр модели Промзоны, у которой пятно на карте шириной w с центром (cx, cy).
// Камера ThreePropsManager: орто 2,4 единицы, стоит в 6 единицах под 28° и смотрит в 0,48 высоты модели —
// поэтому центр пятна ниже центра кадра, а реальный наклон чуть меньше 28°.
// { x, y, w, h } — кадр (квадрат), depth — глубина пятна на экране, rise — высота модели над пятном
function pzFrame(model, cx, cy, w) {
  const [mx, md, mh] = PZ_MODELS[model];
  const s = pzSpan(model) / Math.max(mx, md, mh);
  const H = mh * s;
  const pitch = 28 * Math.PI / 180;
  const th = Math.atan2(6 * Math.sin(pitch) - 0.48 * H, 6 * Math.cos(pitch));
  const k = w / (mx * s);
  const size = 2.4 * k;
  const drop = 0.48 * H * Math.cos(th) * k;
  return { x: cx - size / 2, y: cy - drop - size / 2, w: size, h: size,
    depth: md * s * Math.sin(th) * k, rise: H * Math.cos(th) * k };
}
function houseScale(b) {
  const base = HOUSE_BASE[houseKind(b)];
  return base ? b.w / base[0] : 1;
}

// Деревья и кусты по вариантам: [спрайт, ширина, высота в мире при scale = 1]
// (дома стали крупнее — деревья выросли вместе с ними: берёза почти с пятиэтажку)
const TREE_SPRITES = {
  1: ['autumn_tree_1', 178, 205],
  2: ['autumn_tree_2', 195, 183],
  3: ['birch_tree_1', 205, 272],   // стройная плакучая берёза
  4: ['birch_tree_2', 222, 290]    // двуствольная берёза с пышной кроной
};
const BUSH_SPRITES = {
  1: ['courtyard_bush', 78, 62],
  2: ['courtyard_bush_2', 78, 62],
  3: ['courtyard_bush_lilac', 86, 90],
  4: ['courtyard_bush_rosehip', 92, 88]
};

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
    // Машины, баки и ящики, за которыми в этом кадре стоит персонаж (см. planDeferredContainers)
    this.deferredContainers = new Set();
    // Насколько прозрачен дом, за которым скрыт Василий: 0..1, плавно (drawOccludingProps)
    this.buildingFade = new Map();

    // Локация (window.getLocation в game.js): город или Промзона — у каждой свой декор
    this.location = 'city';
    this.rails = [];

    this.initAssets();
    this.generateDecorations();
  }

  // Смена локации (game.js generateWorld): декор, дворы, районы на земле и вид за забором строятся заново
  setLocation(id) {
    this.location = id;
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
    this.deferredContainers.clear();
    this.buildingFade.clear();
    this.districtZones = null;
    this.outskirts = null;
    this.bioPuddles = [];
    this.rails = id === 'promzona' ? this.promzonaRails() : [];
    // Модели Промзоны (постройки и новые жабы) грузятся при первом заходе в неё, а не на старте города
    if (id === 'promzona' && window.threeProps) window.threeProps.loadPromzona();
    if (id === 'promzona' && window.threeEnemies) window.threeEnemies.loadPromzona();
    if (id === 'promzona' && window.threePounder) window.threePounder.load();
    this.generateDecorations();
  }

  // Ж/д колеи Промзоны: две вдоль юга через всю карту (сортировка) и ветка на север к цехам
  promzonaRails() {
    return [
      { horizontal: true, pos: 4950, from: 0, to: MAP.SIZE },
      { horizontal: true, pos: 5070, from: 0, to: MAP.SIZE },
      { horizontal: false, pos: 2350, from: 1460, to: 4950 }
    ];
  }

  // Точка на рельсах или рядом (деревьям и кустам туда нельзя)
  onRails(x, y, pad = 80) { // 80: и между двумя колеями сортировки (120 px) деревьям не место
    return this.rails.some(r => r.horizontal
      ? Math.abs(y - r.pos) < pad && x > r.from - pad && x < r.to + pad
      : Math.abs(x - r.pos) < pad && y > r.from - pad && y < r.to + pad);
  }

  // Колея: насыпь из щебня, шпалы, два рельса. Рисуется поверх дорог (переезды)
  drawRails(ctx, camera, screenW, screenH) {
    const GAUGE = 30, BED = 70, STEP = 24;
    const x0 = camera.x - 60, x1 = camera.x + screenW + 60, y0 = camera.y - 60, y1 = camera.y + screenH + 60;
    ctx.save();
    this.rails.forEach(r => {
      const a = Math.max(r.from, r.horizontal ? x0 : y0), b = Math.min(r.to, r.horizontal ? x1 : y1);
      if (b <= a) return;
      if (r.horizontal ? (r.pos + BED < y0 || r.pos - BED > y1) : (r.pos + BED < x0 || r.pos - BED > x1)) return;
      const rect = (along, across, len, wid) => (r.horizontal
        ? ctx.fillRect(along, r.pos + across, len, wid)
        : ctx.fillRect(r.pos + across, along, wid, len));
      // Насыпь
      ctx.fillStyle = 'rgba(64, 60, 54, 0.92)';
      rect(a, -BED / 2, b - a, BED);
      ctx.fillStyle = 'rgba(38, 35, 31, 0.6)';
      rect(a, -BED / 2, b - a, 4);
      rect(a, BED / 2 - 4, b - a, 4);
      // Шпалы — от сетки мира, чтобы не «ехали» за камерой
      ctx.fillStyle = '#3b2c22';
      for (let p = Math.ceil(a / STEP) * STEP; p < b; p += STEP) rect(p, -GAUGE / 2 - 12, 10, GAUGE + 24);
      // Рельсы: тень, тело, блик
      [[-GAUGE / 2, 1], [GAUGE / 2 - 4, 1]].forEach(([off]) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        rect(a, off + 2, b - a, 4);
        ctx.fillStyle = '#5b5148';
        rect(a, off, b - a, 4);
        ctx.fillStyle = 'rgba(203, 196, 186, 0.55)';
        rect(a, off, b - a, 1);
      });
    });
    ctx.restore();
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
      // Берёзы, сирень и шиповник (tools/make_greenery_sprites.py)
      { key: 'birch_tree_1', path: 'assets/sprites/props/birch_tree_1.png?v=1', type: 'prop' },
      { key: 'birch_tree_2', path: 'assets/sprites/props/birch_tree_2.png?v=1', type: 'prop' },
      { key: 'courtyard_bush_lilac', path: 'assets/sprites/props/courtyard_bush_lilac.png?v=1', type: 'prop' },
      { key: 'courtyard_bush_rosehip', path: 'assets/sprites/props/courtyard_bush_rosehip.png?v=1', type: 'prop' },
      { key: 'bio_puddle_eggs', path: 'assets/sprites/props/bio_puddle_eggs.webp?v=1', type: 'prop' },
      { key: 'bio_puddle_vents', path: 'assets/sprites/props/bio_puddle_vents.webp?v=1', type: 'prop' },
      { key: 'bio_puddle_pod', path: 'assets/sprites/props/bio_puddle_pod.webp?v=1', type: 'prop' },

      // Здания
      { key: 'building_panel_320x160', path: 'assets/sprites/buildings/building_panel_320x160.png?v=1024', type: 'building' },
      { key: 'building_panel_220x260', path: 'assets/sprites/buildings/building_panel_220x260.png?v=1024', type: 'building' },
      { key: 'building_boiler_house', path: 'assets/sprites/buildings/building_boiler_house.png?v=1024', type: 'building' },
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
      { key: 'loot_toad_eye', path: 'assets/sprites/loot/loot_toad_eye.png?v=1', type: 'loot' },
      { key: 'loot_toad_leg', path: 'assets/sprites/loot/loot_toad_leg.png?v=1', type: 'loot' },
      { key: 'loot_toad_liver', path: 'assets/sprites/loot/loot_toad_liver.png?v=1', type: 'loot' },
      { key: 'loot_nonferrous', path: 'assets/sprites/loot/loot_nonferrous.png?v=1', type: 'loot' },
      { key: 'loot_blueprint', path: 'assets/sprites/loot/loot_blueprint.png?v=1', type: 'loot' },
      { key: 'loot_tech_spirit', path: 'assets/sprites/loot/loot_tech_spirit.png?v=1', type: 'loot' },
      { key: 'loot_plasma_cell', path: 'assets/sprites/loot/loot_plasma_cell.png?v=1', type: 'loot' },
      { key: 'loot_kvako_charge', path: 'assets/sprites/loot/loot_kvako_charge.png?v=1', type: 'loot' },
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
    return MAP.ROADS.some(r => coord > r.pos - 90 && coord < r.pos + r.size + 90);
  }

  // Площадь у Ларька Михалыча: свои фонари, дорожные сюда не ставим (иначе двоятся и закрывают вывеску)
  isInShopPlaza(x, y) {
    return this.location === 'city' && Math.hypot(x - MAP.CENTER, y - MAP.CENTER) < 300;
  }

  generateDecorations() {
    // Статичные лужи, люки, фонарные столбы и уличные урны по всей дорожной сети
    const limit = MAP.SIZE - 120;
    MAP.ROADS.forEach(road => {
      const ry = road.pos, h = road.size;
      for (let x = 160; x < limit; x += 320) {
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
      for (let lx = 220; lx < limit - 60; lx += 340) {
        if (this.isNearIntersection(lx)) continue;
        // Чередуем верхний и нижний тротуар (а на центральном проспекте — по обе стороны)
        this.staticStreetLamps.push({
          x: lx,
          y: ry - 18,
          lightX: lx + 18,
          lightY: ry + 26,
          flipX: 1
        });
        if (road === MAP.MAIN || ((lx / 340) % 2 === 0)) {
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

    MAP.ROADS.forEach(road => {
      const rx = road.pos, w = road.size;
      for (let y = 160; y < limit; y += 350) {
        if (!this.isNearIntersection(y)) {
          this.staticManholes.push({ x: rx + 32 + ((y * 13) % (w - 64)), y: y + ((y * 19) % 70) });
        }
      }
      // Фонарные столбы вдоль вертикальных улиц
      for (let ly = 240; ly < limit - 80; ly += 380) {
        if (this.isNearIntersection(ly)) continue;
        if (!this.isInShopPlaza(rx - 18, ly)) {
          this.staticStreetLamps.push({
            x: rx - 18,
            y: ly,
            lightX: rx + 26,
            lightY: ly + 10,
            flipX: 1
          });
        }
        if (road === MAP.MAIN && !this.isInShopPlaza(rx + w + 18, ly + 160)) {
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

    // Пара фонарей и урн у передних углов площадки Ларька Михалыча — по бокам от киоска, ниже вывески
    if (this.location === 'city') {
      const C = MAP.CENTER;
      this.staticStreetLamps.push(
        { x: C - 160, y: C + 30, lightX: C - 132, lightY: C + 50, flipX: 1 },
        { x: C + 160, y: C + 30, lightX: C + 132, lightY: C + 50, flipX: -1 }
      );
      this.staticSidewalkBins.push(
        { x: C - 188, y: C + 44 },
        { x: C + 188, y: C + 44 }
      );
    }

    // У каждого фонаря свой ритм «дыхания», примерно каждый седьмой — неисправный и моргает.
    // Зерно зависит только от координат, поэтому рисунок одинаков при каждой загрузке
    this.staticStreetLamps.forEach(lp => {
      const s = Math.sin(lp.x * 12.9898 + lp.y * 78.233) * 43758.5453;
      lp.seed = s - Math.floor(s);
      lp.faulty = lp.seed < 0.14;
      // Светящийся плафон «Кобры» в спрайте фонаря
      lp.headX = lp.x + 16 * (lp.flipX || 1);
      lp.headY = lp.y - 116;
    });
  }

  // --- Граница карты: бетонный забор ПО-2 по периметру и «город за забором» (фон, без коллизий) ---
  generateOutskirts(worldW, worldH) {
    if (this.outskirts) return;
    const lots = [];
    const rnd = (i) => { const s = Math.sin(i * 91.7 + 13.1) * 43758.5453; return s - Math.floor(s); };
    const H = v => Math.round(v * MAP.HOUSE);
    const TYPES = [
      { type: 'panel', subType: 'khrushchevka', w: H(320), h: H(160) },
      { type: 'panel', subType: 'brezhnevka', w: H(220), h: H(260) },
      { type: 'garage', w: 140, h: 100 },
      { type: 'panel', subType: 'khrushchevka', w: H(320), h: H(160) },
      { type: 'boiler_house', w: H(320), h: H(160) }
    ];
    // Не ставим дома на продолжения дорог (с запасом под тротуары)
    const onRoad = (from, size) => MAP.ROADS.some(r => from + size > r.pos - 70 && from < r.pos + r.size + 70);
    let n = 0;
    const row = (horizontal, fixed, start, end) => {
      for (let pos = start; pos < end;) {
        const t = TYPES[Math.floor(rnd(n++) * TYPES.length)];
        const span = horizontal ? t.w : t.h;
        if (!onRoad(pos, span)) {
          lots.push(horizontal
            ? { type: t.type, subType: t.subType, w: t.w, h: t.h, x: pos, y: fixed(t) }
            : { type: t.type, subType: t.subType, w: t.w, h: t.h, x: fixed(t), y: pos });
        }
        pos += span + 90 + Math.floor(rnd(n++) * 120);
      }
    };
    // Два ряда кварталов с каждой стороны: ближний (за забором) и дальний. Из Промзоны город виден только
    // на юге, за проломом; с остальных сторон завода — пустырь в тумане
    const city = this.location !== 'promzona';
    if (city) {
      row(true, (t) => -170 - t.h, -1300, worldW + 1300);
      row(true, (t) => -620 - t.h, -1300, worldW + 1300);
    }
    row(true, () => worldH + 170, -1300, worldW + 1300);
    row(true, () => worldH + 620, -1300, worldW + 1300);
    if (city) {
      row(false, (t) => -170 - t.w, -150, worldH + 150);
      row(false, (t) => -620 - t.w, -150, worldH + 150);
      row(false, () => worldW + 170, -150, worldH + 150);
      row(false, () => worldW + 620, -150, worldH + 150);
    }
    this.outskirts = { lots, worldW, worldH };
  }

  // Земля, продолжения дорог и дома за забором, затянутые дымкой. Рисуется первым, под всем остальным
  drawOutskirts(ctx, camera, screenW, screenH, worldW, worldH, roads) {
    const x0 = camera.x - 40, y0 = camera.y - 40, x1 = camera.x + screenW + 40, y1 = camera.y + screenH + 40;
    if (x0 >= 0 && y0 >= 0 && x1 <= worldW && y1 <= worldH) return; // граница не видна
    this.generateOutskirts(worldW, worldH);

    // 1. Земля снаружи: тот же бесшовный грунт (паттерн привязан к миру, стыка нет)
    ctx.fillStyle = this.patterns['ground'] || '#22272e';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    // 2. Дороги уходят за забор
    const asphalt = this.patterns['asphalt'] || '#1e2430';
    const sidewalk = this.patterns['sidewalk'] || '#4b5563';
    roads.forEach(r => {
      const horizontal = r.w > r.h;
      const segs = horizontal
        ? [[x0, Math.min(0, x1)], [Math.max(worldW, x0), x1]]
        : [[y0, Math.min(0, y1)], [Math.max(worldH, y0), y1]];
      segs.forEach(([a, b]) => {
        if (b <= a) return;
        if (horizontal) {
          ctx.fillStyle = sidewalk;
          ctx.fillRect(a, r.y - 36, b - a, r.h + 72);
          ctx.fillStyle = asphalt;
          ctx.fillRect(a, r.y, b - a, r.h);
        } else {
          ctx.fillStyle = sidewalk;
          ctx.fillRect(r.x - 36, a, r.w + 72, b - a);
          ctx.fillStyle = asphalt;
          ctx.fillRect(r.x, a, r.w, b - a);
        }
      });
    });

    // 3. Кварталы за забором (3D-спрайты тех же домов и гаражей)
    const tp = window.threeProps;
    if (tp) {
      this.outskirts.lots.forEach(b => {
        if (!this.isVisible(b.x - 60, b.y - 120, b.w + 120, b.h + 180, camera, screenW, screenH)) return;
        if (b.type === 'garage') tp.drawGarage(ctx, b);
        else tp.drawMajorBuilding(ctx, b);
      });
    }

    // 4. Дымка: чем дальше от забора, тем темнее
    if (!this.outskirtsFog) {
      const fog = (ax, ay, bx, by) => {
        const g = ctx.createLinearGradient(ax, ay, bx, by);
        g.addColorStop(0, 'rgba(9, 12, 17, 0.42)');
        g.addColorStop(0.45, 'rgba(9, 12, 17, 0.66)');
        g.addColorStop(1, 'rgba(9, 12, 17, 0.86)');
        return g;
      };
      this.outskirtsFog = {
        top: fog(0, 0, 0, -1100), bottom: fog(0, worldH, 0, worldH + 1100),
        left: fog(0, 0, -1100, 0), right: fog(worldW, 0, worldW + 1100, 0)
      };
    }
    const f = this.outskirtsFog;
    const far = 4000;
    ctx.fillStyle = f.top; ctx.fillRect(-far, -far, worldW + far * 2, far);
    ctx.fillStyle = f.bottom; ctx.fillRect(-far, worldH, worldW + far * 2, far);
    ctx.fillStyle = f.left; ctx.fillRect(-far, 0, far, worldH);
    ctx.fillStyle = f.right; ctx.fillRect(worldW, 0, far, worldH);
  }

  // Сегменты забора по периметру: лицом вдоль верхней/нижней границы, торцом вдоль боковых
  borderFenceSegments(worldW, worldH) {
    if (this.borderSegments) return this.borderSegments;
    const segs = [];
    for (let x = 55; x < worldW; x += 110) {
      segs.push({ x, y: 15, dir: 0, w: 130, h: 130, baseY: 40, side: 'top' });
      segs.push({ x, y: worldH - 25, dir: 0, w: 130, h: 130, baseY: worldH, side: 'bottom' });
    }
    for (let y = 30; y < worldH; y += 50) {
      segs.push({ x: 20, y, dir: 4, w: 130, h: 130, baseY: y + 30, side: 'left' });
      segs.push({ x: worldW - 20, y, dir: 4, w: 130, h: 130, baseY: y + 30, side: 'right' });
    }
    segs.sort((a, b) => a.baseY - b.baseY); // ближние к камере (ниже по экрану) рисуются поверх дальних
    this.borderSegments = segs;
    return segs;
  }

  drawBorderSegment(ctx, s) {
    // Пролёт за логовом Мясника (window.fenceBreach из game.js): трещит, потом проломлен
    const fb = window.fenceBreach;
    const breach = fb && s.side === (fb.side || 'top') && Math.abs(s.x - fb.x) < fb.halfW ? fb.state : null;
    if (breach === 'open') {
      this.drawFenceRubble(ctx, s);
      return;
    }
    const tp = window.threeProps;
    // Целая и сколотая плиты вперемешку, половина отражена — забор не повторяется
    const drawn = tp && tp.isLoaded['fence_po2'] &&
      tp.drawFenceSlab(ctx, tp.fenceVariant(s.x, s.y), s.dir, s.x, s.y, s.w, s.h);
    if (!drawn) {
      ctx.fillStyle = '#6b7280';
      if (s.dir === 0) ctx.fillRect(s.x - 55, s.y - 30, 110, 45);
      else ctx.fillRect(s.x - 8, s.y - 40, 16, 60);
    }
    if (breach === 'cracked') this.drawFenceCracks(ctx, s, fb.cracks);
  }

  // Трещины по плите: чем больше ударов берсерка, тем их больше
  drawFenceCracks(ctx, s, n) {
    const paths = [
      [[-30, -40], [-18, -24], [-22, -8], [-8, 6], [-12, 22]],
      [[22, -44], [12, -28], [18, -12], [6, 2], [10, 20], [2, 30]],
      [[-46, -6], [-30, -2], [-16, 10], [2, 8], [20, 18], [40, 14]]
    ];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < Math.min(n, paths.length); i++) {
      [['rgba(20, 18, 16, 0.85)', 3], ['rgba(203, 213, 225, 0.35)', 1]].forEach(([color, w], k) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        paths[i].forEach(([dx, dy], j) => {
          const x = s.x + dx + k * 1.2, y = s.y + dy + k;
          if (j) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  // Проломленный пролёт: обломанные края плиты, торчащая арматура, куски бетона на земле
  drawFenceRubble(ctx, s) {
    const x = s.x, base = s.baseY + 4; // низ плиты: у верхнего забора 44, у нижнего — край карты
    ctx.save();
    // Сам проём: за забором темно — пустырь в тумане
    const hole = ctx.createLinearGradient(0, base - 66, 0, base + 6);
    hole.addColorStop(0, 'rgba(4, 5, 7, 0.95)');
    hole.addColorStop(0.75, 'rgba(4, 5, 7, 0.7)');
    hole.addColorStop(1, 'rgba(4, 5, 7, 0)');
    ctx.fillStyle = hole;
    ctx.fillRect(x - 55, base - 66, 110, 72);
    // Обломанные края соседних плит
    ctx.fillStyle = '#a3a8ae';
    ctx.strokeStyle = '#3f4349';
    ctx.lineWidth = 1.5;
    [[-1, x - 55], [1, x + 55]].forEach(([side, ex]) => {
      ctx.beginPath();
      ctx.moveTo(ex, base);
      ctx.lineTo(ex, base - 64);
      ctx.lineTo(ex - side * 12, base - 52);
      ctx.lineTo(ex - side * 6, base - 38);
      ctx.lineTo(ex - side * 17, base - 22);
      ctx.lineTo(ex - side * 8, base);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    // Арматура
    ctx.strokeStyle = '#5b3a24';
    ctx.lineWidth = 2;
    [[-48, -40, -30, -58], [-46, -18, -24, -26], [48, -44, 28, -60], [47, -14, 30, -6]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x + x1, base + y1);
      ctx.quadraticCurveTo(x + (x1 + x2) / 2, base + Math.min(y1, y2) - 6, x + x2, base + y2);
      ctx.stroke();
    });
    // Куски бетона
    const chunks = [[-30, 6, 20, 0.3], [-6, 14, 16, -0.4], [18, 8, 22, 0.2], [34, 22, 12, 0.9], [-38, 24, 13, -0.7], [6, 30, 10, 0.5]];
    chunks.forEach(([dx, dy, r, a]) => {
      ctx.save();
      ctx.translate(x + dx, base + dy);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(-r * 0.9, -r * 0.25, r * 1.9, r * 0.8);
      ctx.fillStyle = '#a3a8ae';
      ctx.strokeStyle = '#3f4349';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.4);
      ctx.lineTo(r * 0.7, -r * 0.55);
      ctx.lineTo(r, r * 0.2);
      ctx.lineTo(-r * 0.6, r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(-r * 0.6, r * 0.05, r * 1.4, r * 0.3);
      ctx.restore();
    });
    ctx.restore();
  }

  drawBorderFence(ctx, camera, screenW, screenH, worldW, worldH) {
    const segs = this.borderFenceSegments(worldW, worldH);
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!this.isVisible(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, camera, screenW, screenH)) continue;
      this.drawBorderSegment(ctx, s);
    }
  }

  // Единичные градиенты света (радиус/длина 1), масштабируются при рисовании: в кадре ничего не создаётся
  ensureLightGradients(ctx) {
    if (this.lightGrad) return;
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    pool.addColorStop(0, 'rgba(255, 192, 105, 0.52)');
    pool.addColorStop(0.3, 'rgba(255, 170, 78, 0.32)');
    pool.addColorStop(0.65, 'rgba(255, 140, 55, 0.11)');
    pool.addColorStop(1, 'rgba(255, 120, 40, 0)');
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    halo.addColorStop(0, 'rgba(255, 246, 220, 0.95)');
    halo.addColorStop(0.14, 'rgba(255, 214, 140, 0.7)');
    halo.addColorStop(0.42, 'rgba(255, 168, 78, 0.2)');
    halo.addColorStop(1, 'rgba(255, 150, 60, 0)');
    const cone = ctx.createLinearGradient(0, 0, 1, 0);
    cone.addColorStop(0, 'rgba(255, 205, 130, 0.22)');
    cone.addColorStop(0.7, 'rgba(255, 180, 95, 0.07)');
    cone.addColorStop(1, 'rgba(255, 170, 80, 0)');
    this.lightGrad = { pool, halo, cone };
  }

  // Яркость фонаря 0..1: лёгкое неравномерное «дыхание» натриевой лампы; у неисправных — серии провалов
  lampIntensity(lp, t) {
    const fract = (v) => v - Math.floor(v);
    let k = 0.9 + 0.06 * Math.sin(t * 1.3 + lp.seed * 40) + 0.04 * Math.sin(t * 3.7 + lp.seed * 17);
    if (lp.faulty) {
      // Двухсекундные окна: в части из них лампа «барахлит» короткими провалами по ~120 мс
      const troubled = fract(Math.sin(Math.floor(t * 0.5) * 7.13 + lp.seed * 19.1) * 3758.5) < 0.4;
      if (troubled) {
        const r = fract(Math.sin(Math.floor(t * 8) * 12.9898 + lp.seed * 78.233) * 43758.5453);
        if (r < 0.5) k *= 0.08 + r * 0.6;
      }
    }
    return k;
  }

  // Конус света от плафона к пятну на земле (дымка)
  fillLampCone(ctx, lp) {
    const dx = lp.lightX - lp.headX;
    const dy = lp.lightY + 6 - lp.headY;
    ctx.save();
    ctx.translate(lp.headX, lp.headY);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.scale(Math.hypot(dx, dy), 1);
    ctx.fillStyle = this.lightGrad.cone;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(1, -62);
    ctx.lineTo(1, 62);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  fillUnitCircle(ctx, x, y, rx, ry, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Пятна света на земле — до персонажей (тени и фигуры ложатся поверх освещённого асфальта)
  drawLampPools(ctx, camera, screenW, screenH) {
    if (this.lightsEnabled === false) return; // настройка «Свет фонарей»
    this.ensureLightGradients(ctx);
    const t = performance.now() / 1000;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.staticStreetLamps.length; i++) {
      const lp = this.staticStreetLamps[i];
      if (!this.isVisible(lp.lightX - 130, lp.lightY - 80, 260, 160, camera, screenW, screenH)) continue;
      const k = this.lampIntensity(lp, t);
      if (k < 0.03) continue;
      ctx.globalAlpha = k;
      this.fillUnitCircle(ctx, lp.lightX, lp.lightY, 122, 72, this.lightGrad.pool);
    }
    ctx.restore();
  }

  // Плафоны, ореолы и дымка конуса — поверх персонажей: лампа висит высоко, а проходящих под ней
  // тёплый конус слегка подсвечивает
  drawLampGlows(ctx, camera, screenW, screenH) {
    if (this.lightsEnabled === false) return;
    this.ensureLightGradients(ctx);
    const t = performance.now() / 1000;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.staticStreetLamps.length; i++) {
      const lp = this.staticStreetLamps[i];
      if (!this.isVisible(Math.min(lp.headX, lp.lightX) - 80, lp.headY - 70, 260, lp.lightY - lp.headY + 150, camera, screenW, screenH)) continue;
      const k = this.lampIntensity(lp, t);
      if (k < 0.03) continue;
      ctx.globalAlpha = k;
      this.fillLampCone(ctx, lp);
      ctx.globalAlpha = 0.35 * k;
      this.fillUnitCircle(ctx, lp.headX, lp.headY + 3, 62, 44, this.lightGrad.halo);
      ctx.globalAlpha = k;
      this.fillUnitCircle(ctx, lp.headX, lp.headY + 3, 17, 12, this.lightGrad.halo);
    }
    ctx.restore();
  }

  // Берёзы, сирень и шиповник по кварталам — кварталы стали просторнее, голыми их не оставляем.
  // Сколько на квартал по району: [деревьев, кустов]. Места одинаковы при каждой загрузке
  scatterGreenery(buildings) {
    // Деревья и кусты по районам: [деревьев, кустов] на квартал. В Промзоне — редкие берёзы сквозь плиты
    const WANT = {
      courtyards: [7, 7], heating: [4, 5], garages: [2, 4], cordon: [1, 3], nest: [0, 2],
      pz_breach: [2, 4], pz_admin: [4, 5], pz_railyard: [1, 3], pz_depot: [1, 2], pz_foundry: [0, 2],
      pz_workshops: [1, 2], pz_warehouses: [1, 2], pz_tankfarm: [1, 2], pz_cooling: [0, 2], pz_sludge: [0, 1]
    };
    const conts = typeof containers !== 'undefined' ? containers : [];
    const onRoad = (x, y) => MAP.ROADS.some(r =>
      (x > r.pos - 70 && x < r.pos + r.size + 70) || (y > r.pos - 70 && y < r.pos + r.size + 70));
    const blocked = (x, y, pad) =>
      this.isInShopPlaza(x, y) || (this.location === 'city' && Math.hypot(x - MAP.CENTER, y - MAP.CENTER) < 430) ||
      // Площадка обороны у пролома (src/defense.js)
      (this.location === 'promzona' && window.Defense && window.Defense.inArea(x, y)) ||
      // Площадка логова Долбильщика (POUNDER_HOME в game.js)
      (this.location === 'promzona' && typeof POUNDER_HOME !== 'undefined' &&
        Math.hypot(x - POUNDER_HOME.x, y - POUNDER_HOME.y) < POUNDER_LAIR_R + 90) ||
      onRoad(x, y) || this.onRails(x, y) ||
      // Цех поднимается над пятном на сотни px: дерево позади него торчало бы кроной из крыши
      buildings.some(b => x > b.x - pad && x < b.x + b.w + pad && y < b.y + b.h + pad + 30 &&
        y > b.y - pad - (b.type === 'factory' ? pzFrame(b.model, b.x + b.w / 2, b.y + b.h / 2, b.w).rise : 0)) ||
      conts.some(c => Math.hypot(c.x - x, c.y - y) < pad + 60) ||
      this.courtyardTrees.some(t => Math.hypot(t.x - x, t.y - y) < 120) ||
      this.courtyardBushes.some(t => Math.hypot(t.x - x, t.y - y) < 80) ||
      this.courtyardBenches.some(t => Math.hypot(t.x - x, t.y - y) < 70);
    let seed = 20261013;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    MAP.BLOCKS.forEach(([x1, x2]) => MAP.BLOCKS.forEach(([y1, y2]) => {
      const district = window.getDistrictAt ? window.getDistrictAt((x1 + x2) / 2, (y1 + y2) / 2).id : 'courtyards';
      const [nTrees, nBushes] = WANT[district] || [0, 0];
      let trees = 0, bushes = 0;
      for (let k = 0; k < 200 && (trees < nTrees || bushes < nBushes); k++) {
        const x = Math.round(x1 + 50 + rnd() * (x2 - x1 - 100));
        const y = Math.round(y1 + 120 + rnd() * (y2 - y1 - 170));
        if (trees < nTrees) {
          // Крона проверяется по наибольшему масштабу; случайное число — после проверок, как раньше, чтобы не сдвинуть остальную раскладку
          if (blocked(x, y, 70) || this.treeHidesContainer({ x, y, variant: 3 + (trees % 2), scale: 1.15 })) continue;
          this.courtyardTrees.push({ x, y, variant: 3 + (trees % 2), scale: 0.9 + rnd() * 0.25 });
          trees++;
        } else {
          if (blocked(x, y, 45)) continue;
          this.courtyardBushes.push({ x, y, variant: 3 + (bushes % 2), scale: 0.85 + rnd() * 0.3 });
          bushes++;
        }
      }
    }));
  }

  ensureCourtyardLayout(buildings) {
    if (this.courtyardBuilt || !buildings || buildings.length === 0) return;
    this.courtyardBuilt = true;

    buildings.forEach((b, idx) => {
      if (b.type !== 'panel' && b.type !== 'boiler_house') return;

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

      // Определяем координаты подъездов по типу здания (замерены на исходном размере, k — масштаб дома)
      const kind = houseKind(b);
      const k = houseScale(b);
      let entrances = [];
      if (kind === 'khrushchevka') {
        // Хрущевка: 2 подъезда
        entrances = [b.x + 80 * k, b.x + 244 * k];
      } else if (kind === 'brezhnevka') {
        // Брежневка: 1 центральный подъезд
        entrances = [b.x + 108 * k];
      } else {
        // Котельная: центральный вход
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
          // У котельной — урна у входа
          this.courtyardBins.push({ x: ex + 34, y: b.y + b.h + 14 });
        }
      });

      // 3. Палисадники (газоны с низким побеленным поребриком) вдоль фасада и кусты/деревья
      if (kind === 'khrushchevka') {
        this.courtyardLawns.push(
          { x: b.x + 4 * k,   y: b.y + b.h + 2, w: 54 * k, h: 22 },
          { x: b.x + 104 * k, y: b.y + b.h + 2, w: 116 * k, h: 22 },
          { x: b.x + 266 * k, y: b.y + b.h + 2, w: 50 * k, h: 22 }
        );
        // Кусты в палисаднике под окнами первого этажа
        this.courtyardBushes.push(
          { x: b.x + 26 * k,  y: b.y + b.h + 12, variant: 1, scale: 0.88 },
          { x: b.x + 162 * k, y: b.y + b.h + 13, variant: 2, scale: 0.94 },
          { x: b.x + 294 * k, y: b.y + b.h + 12, variant: 1, scale: 0.86 }
        );
        // Побеленные осенние деревья по углам двора перед домом
        this.pushTrees(
          { x: b.x - 28,       y: b.y + b.h + 24, variant: (idx % 2) + 1, scale: 0.95 },
          { x: b.x + b.w + 28, y: b.y + b.h + 28, variant: ((idx + 1) % 2) + 1, scale: 0.92 }
        );
      } else if (kind === 'brezhnevka') {
        this.courtyardLawns.push(
          { x: b.x + 6 * k,   y: b.y + b.h + 2, w: 78 * k, h: 22 },
          { x: b.x + 132 * k, y: b.y + b.h + 2, w: 82 * k, h: 22 }
        );
        this.courtyardBushes.push(
          { x: b.x + 36 * k,  y: b.y + b.h + 12, variant: 2, scale: 0.90 },
          { x: b.x + 182 * k, y: b.y + b.h + 12, variant: 1, scale: 0.90 }
        );
        this.pushTrees(
          { x: b.x - 26,       y: b.y + b.h + 18, variant: ((idx + 1) % 2) + 1, scale: 0.94 },
          { x: b.x + b.w + 26, y: b.y + b.h - 20, variant: (idx % 2) + 1, scale: 0.90 }
        );
      } else {
        // Озеленение вокруг котельных (k — масштаб дома)
        this.courtyardBushes.push(
          { x: b.x + 34,       y: b.y + b.h + 14, variant: 1, scale: 0.85 },
          { x: b.x + b.w - 34, y: b.y + b.h + 14, variant: 2, scale: 0.85 }
        );
        if (idx % 2 === 0) {
          this.pushTrees(
            { x: b.x - 30, y: b.y + b.h + 20, variant: 1, scale: 0.90 }
          );
        }
      }
    });
    this.scatterGreenery(buildings);
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

    // 0. ГОРОД ЗА ЗАБОРОМ (видно только у границы карты)
    this.drawOutskirts(ctx, camera, screenW, screenH, worldWidth, worldHeight, roads);

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

    // 2.2. Ж/Д КОЛЕИ ПРОМЗОНЫ (переезды поверх дорог)
    if (this.rails.length) this.drawRails(ctx, camera, screenW, screenH);

    // 2.5. ВНУТРИДВОРОВЫЕ ДОРОЖКИ К ПОДЪЕЗДАМ И ПАЛИСАДНИКИ
    this.drawCourtyardGround(ctx, camera, screenW, screenH);

    // 3. ДОРОЖНЫЕ ДЕТАЛИ (Люки, лужи и трафаретные указатели районов)
    this.drawRoadProps(ctx, camera, screenW, screenH);

    // 3.5. БИО-ЛУЖИ КВАКО-ГНЁЗД (под всем, что стоит на земле)
    this.drawBioPuddles(ctx, camera, screenW, screenH);

    // 4. БЕЗОПАСНАЯ ЗОНА (бетонная площадь, защитный купол)
    this.drawSafeZone(ctx, camera, screenW, screenH, safeZone);

    // 4.5. ОТБРАСЫВАЕМЫЕ ТЕНИ всего, что стоит на земле, — одним слоем до самих предметов
    this.drawCastShadows(ctx, camera, screenW, screenH, buildings, containers, safeZone);

    // 4.6. ЛАРЁК МИХАЛЫЧА с неоновой вывеской
    this.drawShopKiosk(ctx, camera, screenW, screenH, safeZone);

    // 5. ЗДАНИЯ И ИНФРАСТРУКТУРА (3D Хрущевки, Брежневки, Котельные, 3D Гаражи, Заборы ПО-2, Теплотрассы)
    this.drawBuildings(ctx, camera, screenW, screenH, buildings);

    // 5.2. БЕТОННЫЙ ЗАБОР ПО-2 ПО ПЕРИМЕТРУ КАРТЫ
    this.drawBorderFence(ctx, camera, screenW, screenH, worldWidth, worldHeight);

    // 5.5. ДВОРОВОЕ БЛАГОУСТРОЙСТВО И УЛИЧНОЕ ОСВЕЩЕНИЕ (Скамейки, маленькие урны, кусты, деревья с побелкой, фонари «Кобра»)
    this.drawStreetAndCourtyardProps(ctx, camera, screenW, screenH);

    // 6. КОНТЕЙНЕРЫ (Жигули, УАЗики, мусорные баки, армейские ящики)
    this.drawContainers(ctx, camera, screenW, screenH, containers);
  }

  drawDistrictAtmosphere(ctx, camera, screenW, screenH) {

    // A. Текстурное и цветовое тонирование кварталов по специализации
    if (!this.districtZones && this.location === 'promzona') {
      // Промзона: мазут у сортировки и автобазы, ржавая окалина у цехов и складов, гнилая зелень гнезда
      const tint = {
        pz_railyard: ['rgba(20, 18, 14, 0.32)', 'garages'], pz_depot: ['rgba(20, 18, 14, 0.32)', 'garages'],
        pz_foundry: ['rgba(40, 24, 16, 0.28)', 'cordon'], pz_workshops: ['rgba(28, 24, 20, 0.26)', 'garages'],
        pz_warehouses: ['rgba(28, 24, 20, 0.24)', ''], pz_tankfarm: ['rgba(16, 20, 28, 0.28)', 'garages'],
        pz_cooling: ['rgba(16, 48, 28, 0.34)', 'nest'], pz_sludge: ['rgba(22, 52, 24, 0.38)', 'nest']
      };
      this.districtZones = [];
      MAP.BANDS.forEach(bx => MAP.BANDS.forEach(by => {
        const d = window.getDistrictAt ? window.getDistrictAt((bx[0] + bx[1]) / 2, (by[0] + by[1]) / 2) : null;
        const t = d && tint[d.id];
        if (t) this.districtZones.push({ x: bx[0], y: by[0], w: bx[1] - bx[0], h: by[1] - by[0], color: t[0], type: t[1] });
      }));
    }
    if (!this.districtZones) {
      const [b0, b1, b2, b3] = MAP.BANDS;
      const rect = (bx, by, color, type) => ({ x: bx[0], y: by[0], w: bx[1] - bx[0], h: by[1] - by[0], color, type });
      const GAR = 'rgba(15, 23, 42, 0.34)', HEAT = 'rgba(14, 36, 52, 0.26)';
      const CORD = 'rgba(38, 18, 18, 0.26)', NEST = 'rgba(16, 48, 28, 0.34)';
      this.districtZones = [
        // Tier 2A: Гаражный кооператив «Восток» (западные кварталы — тёмный гравий и мазут)
        rect(b0, b1, GAR, 'garages'), rect(b0, b2, GAR, 'garages'),
        // Tier 2B: Магистраль теплотрассы (восточные кварталы — оттаявший грунт и конденсат)
        rect(b3, b1, HEAT, 'heating'), rect(b3, b2, HEAT, 'heating'),
        // Tier 3: Военный кордон (север и юг — выжженная земля и следы боёв)
        rect(b1, b0, CORD, 'cordon'), rect(b2, b0, CORD, 'cordon'), rect(b1, b3, CORD, 'cordon'), rect(b2, b3, CORD, 'cordon'),
        // Tier 4: Квако-гнёзда (четыре угла — био-заражение пришельцев)
        rect(b0, b0, NEST, 'nest'), rect(b3, b0, NEST, 'nest'), rect(b0, b3, NEST, 'nest'), rect(b3, b3, NEST, 'nest')
      ];
    }
    const zones = this.districtZones;

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
      }
      // Био-лужи гнёзд рисует drawBioPuddles (их места и действие — в game.js)
    }
  }

  // Лужи слизи с икрой, отдушинами и коконом — спрайты из концептов (tools/make_bio_puddle_sprites.py)
  drawBioPuddles(ctx, camera, screenW, screenH) {
    const list = this.bioPuddles;
    if (!list) return;
    const W = 170;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!this.isVisible(p.x - W / 2, p.y - W / 2, W, W, camera, screenW, screenH)) continue;
      const img = this.props[p.sprite];
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.flip) ctx.scale(-1, 1);
      if (img) {
        const h = W * img.height / img.width;
        ctx.drawImage(img, -W / 2, -h / 2, W, h);
      } else {
        // Спрайт ещё грузится: тёмное пятно слизи без яркого центра
        ctx.fillStyle = 'rgba(54, 83, 20, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 58, 38, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
    const crossRoads = MAP.ROADS;

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

  /**
   * Отбрасываемые тени (shadows.js): дома, гаражи, ларёк, пограничный забор, тайники, деревья, кусты,
   * скамейки, урны, фонари, а ещё персонажи и лут — их кадры кладёт в this.shadowActors game.js.
   * Тень уходит влево от предмета на SHEAR·высоту — так и отсекается по экрану.
   */
  drawCastShadows(ctx, camera, screenW, screenH, buildings, containers, safeZone) {
    const sc = window.shadowCaster;
    if (!sc) return;
    const seen = (x, y, w, h) => this.isVisible(x - sc.reach(h), y, w + sc.reach(h), h, camera, screenW, screenH);
    sc.begin(ctx);
    const tp = window.threeProps;

    if (tp) {
      // Дома и гаражи
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        const garage = b.type === 'garage';
        if (!garage && !isModelBuilding(b)) continue;
        const f = garage ? tp.garageFrame(b) : tp.majorBuildingFrame(b);
        if (!f || !tp.isLoaded[f.propKey] || !seen(f.x, f.y, f.w, f.h)) continue;
        sc.cast(tp.getFrameCanvas(f.propKey, 0), f.x, f.y, f.w, f.h);
      }
      // Ларёк Михалыча
      const shop = tp.shopSprite(safeZone);
      if (shop && seen(shop.x, shop.y, shop.w, shop.h)) sc.cast(shop.frame, shop.x, shop.y, shop.w, shop.h);
      // Плиты пограничного забора (кроме проломленного пролёта)
      const segs = this.borderSegments;
      const fb = window.fenceBreach;
      if (segs && tp.isLoaded['fence_po2']) {
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i];
          const x = s.x - s.w / 2, y = s.y - s.h / 2;
          if (!seen(x, y, s.w, s.h)) continue;
          if (fb && fb.state === 'open' && s.side === (fb.side || 'top') && Math.abs(s.x - fb.x) < fb.halfW) continue;
          const v = tp.fenceVariant(s.x, s.y);
          const frame = tp.getFrameCanvas(v.key, s.dir) || tp.getFrameCanvas('fence_po2', s.dir);
          sc.cast(frame, x, y, s.w, s.h, { flip: v.flip });
        }
      }
      // Тайники (поднятые и летящие — их тень рисует game.js)
      for (let i = 0; i < containers.length; i++) {
        const c = containers[i];
        if (c.airborne) continue;
        const vr = this.containerViewRect(c);
        if (!seen(vr.x, vr.y, vr.w, vr.h)) continue;
        const sp = tp.containerSprite(c);
        if (sp) sc.cast(sp.frame, sp.x, sp.y, sp.w, sp.h);
      }
    }

    // Дворовое: деревья, кусты, скамейки, урны, фонари
    for (let i = 0; i < this.courtyardTrees.length; i++) {
      const tr = this.courtyardTrees[i];
      const r = this.treeRect(tr);
      if (!seen(r.x, r.y, r.w, r.h)) continue;
      sc.cast(this.props[(TREE_SPRITES[tr.variant] || TREE_SPRITES[1])[0]] || this.props['autumn_tree_1'], r.x, r.y, r.w, r.h);
    }
    for (let i = 0; i < this.courtyardBushes.length; i++) {
      const b = this.courtyardBushes[i];
      const r = this.bushRect(b);
      if (!seen(r.x, r.y, r.w, r.h)) continue;
      sc.cast(this.props[(BUSH_SPRITES[b.variant] || BUSH_SPRITES[1])[0]] || this.props['courtyard_bush'], r.x, r.y, r.w, r.h);
    }
    const bench = this.props['courtyard_bench'];
    for (let i = 0; i < this.courtyardBenches.length; i++) {
      const bn = this.courtyardBenches[i];
      if (seen(bn.x - 36, bn.y - 24, 72, 48)) sc.cast(bench, bn.x - 36, bn.y - 24, 72, 48, { flip: bn.flipX === -1 });
    }
    const bin = this.props['small_trash_bin'];
    [this.courtyardBins, this.staticSidewalkBins].forEach(list => {
      for (let i = 0; i < list.length; i++) {
        const tb = list[i];
        if (!tb.airborne && seen(tb.x - 18, tb.y - 20, 36, 36)) sc.cast(bin, tb.x - 18, tb.y - 20, 36, 36);
      }
    });
    const lamp = this.props['street_lamp'];
    for (let i = 0; i < this.staticStreetLamps.length; i++) {
      const lp = this.staticStreetLamps[i];
      if (seen(lp.x - 36, lp.y - 138, 72, 144)) sc.cast(lamp, lp.x - 36, lp.y - 138, 72, 144, { flip: lp.flipX === -1 });
    }

    // Персонажи и лут
    const actors = this.shadowActors;
    if (actors) {
      for (let i = 0; i < actors.length; i++) {
        const a = actors[i];
        if (seen(a.x, a.y, a.w, a.h)) sc.cast(a.img, a.x, a.y, a.w, a.h, a);
      }
    }

    sc.end(ctx);
  }

  drawStreetAndCourtyardProps(ctx, camera, screenW, screenH) {
    const benchImg = this.props['courtyard_bench'];
    const binImg = this.props['small_trash_bin'];
    const bush1Img = this.props['courtyard_bush'];
    const tree1Img = this.props['autumn_tree_1'];
    const lampImg = this.props['street_lamp'];

    // 1. Тёплые пятна натриевого света от уличных фонарей на асфальте и тротуарах
    this.drawLampPools(ctx, camera, screenW, screenH);

    // 2. Дворовые кусты в палисадниках
    if (bush1Img) {
      for (let i = 0; i < this.courtyardBushes.length; i++) {
        const b = this.courtyardBushes[i];
        if (!this.isVisible(b.x - 50, b.y - 50, 100, 100, camera, screenW, screenH)) continue;
        this.drawBush(ctx, b);
      }
    }

    // 3. Дворовые деревянные скамейки у подъездов
    if (benchImg) {
      for (let i = 0; i < this.courtyardBenches.length; i++) {
        const bn = this.courtyardBenches[i];
        if (!this.isVisible(bn.x - 50, bn.y - 40, 100, 80, camera, screenW, screenH)) continue;
        this.drawBench(ctx, bn);
      }
    }

    // 4. Маленькие советские урны (у скамеек возле подъездов и вдоль тротуаров)
    if (binImg) {
      for (let i = 0; i < this.courtyardBins.length; i++) {
        const tb = this.courtyardBins[i];
        if (tb.airborne || !this.isVisible(tb.x - 30, tb.y - 30, 60, 60, camera, screenW, screenH)) continue;
        this.drawBin(ctx, tb);
      }
      for (let i = 0; i < this.staticSidewalkBins.length; i++) {
        const tb = this.staticSidewalkBins[i];
        if (tb.airborne || !this.isVisible(tb.x - 30, tb.y - 30, 60, 60, camera, screenW, screenH)) continue;
        this.drawBin(ctx, tb);
      }
    }

    // 5. Осенние дворовые деревья с побеленными стволами
    if (tree1Img) {
      for (let i = 0; i < this.courtyardTrees.length; i++) {
        const tr = this.courtyardTrees[i];
        const vr = this.treeRect(tr);
        if (!this.isVisible(vr.x, vr.y, vr.w, vr.h + 20, camera, screenW, screenH)) continue;
        // Контактная тень у корней (отбрасываемую кладёт слой теней, shadows.js)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
        ctx.beginPath();
        ctx.ellipse(tr.x, tr.y + 4, 24 * tr.scale, 11 * tr.scale, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawTree(ctx, tr);
      }
    }

    // 6. Уличные бетонные фонарные столбы «Кобра»
    if (lampImg) {
      for (let i = 0; i < this.staticStreetLamps.length; i++) {
        const lp = this.staticStreetLamps[i];
        if (!this.isVisible(lp.x - 60, lp.y - 160, 120, 180, camera, screenW, screenH)) continue;
        // Тень у основания бетонного столба
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(lp.x, lp.y + 2, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawLamp(ctx, lp);
      }
    }
  }

  // Тайник за кроной дерева то пропадает за ней, то вылезает поверх (кого рисовать выше, решает, кто стоит
  // ниже по экрану) — поэтому деревья туда, где крона закроет тайник, не ставятся
  treeHidesContainer(tr) {
    const conts = typeof containers !== 'undefined' ? containers : [];
    const r = this.treeRect(tr);
    return conts.some(c => c.y < tr.y + 24 && c.y > r.y - 10 && c.x > r.x - 45 && c.x < r.x + r.w + 45);
  }

  pushTrees(...trees) {
    trees.forEach(tr => { if (!this.treeHidesContainer(tr)) this.courtyardTrees.push(tr); });
  }

  treeRect(tr) {
    const [, w0, h0] = TREE_SPRITES[tr.variant] || TREE_SPRITES[1];
    const w = w0 * tr.scale;
    const h = h0 * tr.scale;
    return { x: tr.x - w * 0.5, y: tr.y - h + 16, w, h };
  }

  drawTree(ctx, tr) {
    const key = (TREE_SPRITES[tr.variant] || TREE_SPRITES[1])[0];
    const img = this.props[key] || this.props['autumn_tree_1'];
    if (!img) return;
    const r = this.treeRect(tr);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
  }

  drawLamp(ctx, lp) {
    const lampImg = this.props['street_lamp'];
    if (!lampImg) return;
    ctx.save();
    ctx.translate(lp.x, lp.y);
    ctx.scale(lp.flipX || 1, 1);
    ctx.drawImage(lampImg, -36, -138, 72, 144);
    ctx.restore();
    // Свечение плафона рисует drawLampGlows() поверх персонажей
  }

  bushRect(b) {
    const [, w0, h0] = BUSH_SPRITES[b.variant] || BUSH_SPRITES[1];
    const w = w0 * b.scale;
    const h = h0 * b.scale;
    return { x: b.x - w * 0.5, y: b.y - h * 0.55, w, h };
  }

  drawBush(ctx, b) {
    const key = (BUSH_SPRITES[b.variant] || BUSH_SPRITES[1])[0];
    const img = this.props[key] || this.props['courtyard_bush'];
    if (!img) return;
    const r = this.bushRect(b);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
  }

  drawBench(ctx, bn) {
    const benchImg = this.props['courtyard_bench'];
    if (!benchImg) return;
    ctx.save();
    ctx.translate(bn.x, bn.y);
    ctx.scale(bn.flipX || 1, 1);
    ctx.drawImage(benchImg, -36, -24, 72, 48);
    ctx.restore();
  }

  drawBin(ctx, tb) {
    const binImg = this.props['small_trash_bin'];
    if (binImg) ctx.drawImage(binImg, tb.x - 18, tb.y - 20, 36, 36);
  }

  // Где на экране видна машина, бак или ящик (с запасом: картинка модели квадратная, с полями)
  containerRect(c) {
    const pz = PZ_CONTAINERS[c.type];
    if (pz) {
      // Вагон, машина или бочка Промзоны: (x, y) — середина пятна на земле, модель поднимается на rise
      const f = pzFrame(pz.model, c.x, c.y, pz.len);
      return { x: c.x - pz.len / 2, y: c.y - f.depth / 2 - f.rise, w: pz.len, h: f.rise + f.depth };
    }
    if (c.type === 'car') return { x: c.x - 100, y: c.y - 70, w: 200, h: 110 };
    if (c.type === 'trash') return { x: c.x - 36, y: c.y - 42, w: 72, h: 70 };
    return { x: c.x - 30, y: c.y - 32, w: 60, h: 56 };
  }

  // Где может быть нарисован тайник, с полями кадра: у машин города — квадрат 220, у вагонов Промзоны — по модели
  containerViewRect(c) {
    if (!PZ_CONTAINERS[c.type]) return { x: c.x - 110, y: c.y - 110, w: 220, h: 220 };
    const r = this.containerRect(c);
    return { x: r.x - 40, y: r.y - 40, w: r.w + 80, h: r.h + 80 };
  }

  containerOnScreen(c, camera, screenW, screenH) {
    const r = this.containerViewRect(c);
    return this.isVisible(r.x, r.y, r.w, r.h, camera, screenW, screenH);
  }

  // a: {x, y, h} — точка ног и высота спрайта персонажа
  actorOverlaps(r, a) {
    return a.x + 24 > r.x && a.x - 24 < r.x + r.w && a.y > r.y && a.y - a.h < r.y + r.h;
  }

  /**
   * Машина, бак или ящик, за которым стоит персонаж, рисуется не в общем проходе, а после персонажей —
   * иначе Василий «стоит на крыше» машины. Перерисовать поверх, как деревья, нельзя: обысканные
   * контейнеры полупрозрачные и вокруг фигуры стали бы плотнее. Если перед тем же контейнером стоит
   * другой персонаж, порядок выбирается в пользу Василия (actors[0]).
   * Вызывается из render() до draw().
   */
  planDeferredContainers(actors, containers, camera, screenW, screenH) {
    this.deferredContainers.clear();
    for (let i = 0; i < containers.length; i++) {
      const c = containers[i];
      if (c.airborne || !this.containerOnScreen(c, camera, screenW, screenH)) continue;
      const r = this.containerRect(c);
      let playerBehind = false, behind = false, front = false;
      for (let j = 0; j < actors.length; j++) {
        const a = actors[j];
        if (!this.actorOverlaps(r, a)) continue;
        if (a.y < c.y) {
          behind = true;
          if (j === 0) playerBehind = true;
        } else {
          front = true;
        }
      }
      if (playerBehind || (behind && !front)) this.deferredContainers.add(c);
    }
  }

  /**
   * Деревья, фонари, кусты, скамейки и урны рисуются до персонажей; если персонаж стоит позади
   * (выше по экрану) и перекрывается с ними, они перерисовываются поверх — иначе Василий «ходит по кроне».
   * Здесь же рисуются отложенные контейнеры (planDeferredContainers). Всё — в порядке глубины.
   * actors: [{x, y, h}] — точка ног и высота спрайта.
   */
  drawOccludingProps(ctx, actors, camera, screenW, screenH, buildings) {
    const items = [];
    const behind = (baseY, r) => actors.some(a => a.y < baseY && this.actorOverlaps(r, a));

    // Дома и гаражи: за домом крыша, будки и трубы закрывают персонажа — иначе Василий «стоит на крыше».
    // Если Василий скрыт больше чем на 60%, дом плавно становится полупрозрачным. Поля кадра прозрачные,
    // перерисовка там ничего не меняет
    const tp = window.threeProps;
    if (tp && buildings) {
      const p = actors[0];
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        if (!isModelBuilding(b) && b.type !== 'garage') continue;
        const f = tp.buildingFrame(b);
        if (!f || !this.isVisible(f.x, f.y, f.w, f.h, camera, screenW, screenH)) continue;
        const base = b.y + b.h;
        const hidden = p.y < base && this.actorOverlaps(f, p) && tp.buildingCover(b, p) > 0.6;
        const was = this.buildingFade.get(b) || 0;
        const fade = Math.abs((hidden ? 1 : 0) - was) < 0.02 ? (hidden ? 1 : 0) : was + ((hidden ? 1 : 0) - was) * 0.15;
        if (fade > 0) this.buildingFade.set(b, fade);
        else this.buildingFade.delete(b);
        // Дом перерисовывается только там, где за ним кто-то стоит: целиком он накрыл бы фонари, урны и фигуры
        // перед фасадом (они нарисованы раньше). Тех, кто стоит перед домом в той же области, ещё и вырезаем;
        // перекрытые дырки (evenodd) снова закрашиваются — двое вплотную перед одним домом бывают редко
        const back = actors.filter(a => a.y < base && this.actorOverlaps(f, a));
        if (back.length === 0) continue;
        const front = actors.filter(a => a.y >= base && this.actorOverlaps(f, a));
        const actorRect = (a) => ctx.rect(a.x - 34, a.y - a.h - 10, 68, a.h + 22);
        items.push({ y: base, draw: () => {
          ctx.save();
          ctx.beginPath();
          back.forEach(actorRect);
          ctx.clip();
          if (front.length) {
            ctx.beginPath();
            ctx.rect(f.x, f.y, f.w, f.h);
            front.forEach(actorRect);
            ctx.clip('evenodd');
          }
          tp.drawBuildingSprite(ctx, b, 1 - 0.85 * fade);
          ctx.restore();
        } });
      }
    }

    this.deferredContainers.forEach(c => items.push({ y: c.y, draw: () => this.drawContainer(ctx, c) }));
    for (let i = 0; i < this.courtyardBushes.length; i++) {
      const b = this.courtyardBushes[i];
      if (!this.isVisible(b.x - 50, b.y - 50, 100, 100, camera, screenW, screenH)) continue;
      if (behind(b.y, this.bushRect(b))) items.push({ y: b.y, draw: () => this.drawBush(ctx, b) });
    }
    for (let i = 0; i < this.courtyardBenches.length; i++) {
      const bn = this.courtyardBenches[i];
      if (!this.isVisible(bn.x - 50, bn.y - 40, 100, 80, camera, screenW, screenH)) continue;
      if (behind(bn.y, { x: bn.x - 36, y: bn.y - 24, w: 72, h: 48 })) items.push({ y: bn.y, draw: () => this.drawBench(ctx, bn) });
    }
    const bins = [this.courtyardBins, this.staticSidewalkBins];
    for (let k = 0; k < bins.length; k++) {
      for (let i = 0; i < bins[k].length; i++) {
        const tb = bins[k][i];
        if (tb.airborne || !this.isVisible(tb.x - 30, tb.y - 30, 60, 60, camera, screenW, screenH)) continue;
        if (behind(tb.y, { x: tb.x - 18, y: tb.y - 20, w: 36, h: 36 })) items.push({ y: tb.y, draw: () => this.drawBin(ctx, tb) });
      }
    }
    for (let i = 0; i < this.courtyardTrees.length; i++) {
      const tr = this.courtyardTrees[i];
      const vr = this.treeRect(tr);
      if (!this.isVisible(vr.x, vr.y, vr.w, vr.h + 20, camera, screenW, screenH)) continue;
      if (behind(tr.y, this.treeRect(tr))) items.push({ y: tr.y, draw: () => this.drawTree(ctx, tr) });
    }
    for (let i = 0; i < this.staticStreetLamps.length; i++) {
      const lp = this.staticStreetLamps[i];
      if (!this.isVisible(lp.x - 60, lp.y - 160, 120, 180, camera, screenW, screenH)) continue;
      if (behind(lp.y, { x: lp.x - 36, y: lp.y - 138, w: 72, h: 144 })) items.push({ y: lp.y, draw: () => this.drawLamp(ctx, lp) });
    }
    // Плиты пограничного забора (нижняя и боковые границы), стоящие ближе к камере, чем персонаж
    if (this.borderSegments) {
      for (let i = 0; i < this.borderSegments.length; i++) {
        const s = this.borderSegments[i];
        if (s.side === 'top') continue;
        if (!this.isVisible(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, camera, screenW, screenH)) continue;
        const r = { x: s.x - (s.dir === 0 ? 60 : 12), y: s.y - 45, w: s.dir === 0 ? 120 : 24, h: 80 };
        if (behind(s.baseY, r)) items.push({ y: s.baseY, draw: () => this.drawBorderSegment(ctx, s) });
      }
    }

    items.sort((p, q) => p.y - q.y);
    for (let i = 0; i < items.length; i++) items[i].draw();
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
    // На главном проспекте — у кольцевых дорог, гнёзда — на кольцевых у углов карты
    const C = MAP.CENTER, [rA, , rB] = MAP.ROADS;
    const nearA = rA.pos + rA.size + 160, nearB = rB.pos - 160;
    const cornerA = rA.pos - 160, cornerB = rB.pos + rB.size + 160;
    const stencils = this.location === 'promzona' ? [
      { x: nearA, y: C, text: '◄ ШЛАМ-ПРУДЫ [КВАКО-ГНЕЗДО]', color: 'rgba(192, 132, 252, 0.80)' },
      { x: nearB, y: C, text: 'АВТОБАЗА [ЧЕРМЕТ] ►', color: 'rgba(251, 146, 60, 0.72)' },
      { x: C, y: nearA, text: '▲ ЛИТЕЙНЫЙ ЦЕХ', color: 'rgba(248, 113, 113, 0.75)' },
      { x: C, y: nearB, text: '▼ ЗАВОДОУПРАВЛЕНИЕ', color: 'rgba(250, 204, 21, 0.72)' },
      { x: cornerA, y: MAP.RING_A, text: '☠ ГРАДИРНИ: КВАКО-ГНЕЗДО', color: 'rgba(192, 132, 252, 0.80)' },
      { x: cornerB, y: MAP.RING_A, text: '⚠ РЕЗЕРВУАРНЫЙ ПАРК', color: 'rgba(248, 113, 113, 0.75)' },
      { x: cornerA, y: MAP.RING_B, text: 'Ж/Д СОРТИРОВКА [ЧЕРМЕТ]', color: 'rgba(251, 146, 60, 0.72)' },
      { x: cornerB, y: MAP.RING_B, text: '▼ ПРОЛОМ В НОВОХМУРИНСК', color: 'rgba(52, 211, 153, 0.80)' }
    ] : [
      { x: nearA, y: C, text: '◄ ГСК «ВОСТОК» [ЧЕРМЕТ]', color: 'rgba(251, 146, 60, 0.72)' },
      { x: nearB, y: C, text: 'ТЕПЛОСЕТЬ [ВОДКА / ТУШЁНКА] ►', color: 'rgba(56, 189, 248, 0.72)' },
      { x: C, y: nearA, text: '▲ ВОЕННЫЙ КОРДОН [ВОЕНТОРГ]', color: 'rgba(248, 113, 113, 0.75)' },
      { x: C, y: nearB, text: '▼ ВОЕННЫЙ КОРДОН [ВОЕНТОРГ]', color: 'rgba(248, 113, 113, 0.75)' },
      { x: cornerA, y: MAP.RING_A, text: '⚠ КВАКО-ГНЕЗДО СЗ [ЛУТ ×2.5]', color: 'rgba(192, 132, 252, 0.80)' },
      { x: cornerB, y: MAP.RING_A, text: '☠ СВ ГНЕЗДО: ЛОГОВО БОССА', color: 'rgba(192, 132, 252, 0.80)' },
      { x: cornerA, y: MAP.RING_B, text: '⚠ КВАКО-ГНЕЗДО ЮЗ [ЛУТ ×2.5]', color: 'rgba(192, 132, 252, 0.80)' },
      { x: cornerB, y: MAP.RING_B, text: '⚠ КВАКО-ГНЕЗДО ЮВ [ЛУТ ×2.5]', color: 'rgba(192, 132, 252, 0.80)' }
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
    ctx.restore();
  }

  drawShopKiosk(ctx, camera, screenW, screenH, safeZone) {
    if (!this.isVisible(safeZone.shopX - 140, safeZone.shopY - 150, 280, 230, camera, screenW, screenH)) return;
    ctx.save();

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

    // 2. Затем отрисовываем основные здания (3D Хрущевки, Брежневки, Котельные ТЭЦ и 3D-гаражи)
    buildings.forEach(b => {
      if (b.type === 'fence_wall' || b.type === 'heating_line' || b.type === 'border_fence') return;
      if (b.type === 'factory') {
        // Цеха и градирни поднимаются над пятном на сотни пикселей — видимость по кадру модели
        const f = pzFrame(b.model, b.x + b.w / 2, b.y + b.h / 2, b.w);
        if (!this.isVisible(f.x, f.y, f.w, f.h, camera, screenW, screenH)) return;
        if (window.threeProps && window.threeProps.drawMajorBuilding(ctx, b)) return;
        // Пока модель грузится — тёмное пятно на земле
        ctx.fillStyle = 'rgba(30, 36, 44, 0.85)';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        return;
      }
      if (!this.isVisible(b.x - 40, b.y - 40, b.w + 80, b.h + 80, camera, screenW, screenH)) return;

      if (b.type === 'panel' || b.type === 'boiler_house') {
        // Путь А: Рендеринг честной 360° 3D-модели здания (.glb) через Three.js WebGL
        if (window.threeProps && window.threeProps.drawMajorBuilding(ctx, b)) {
          return;
        }
        // Мгновенный 2D-фоллбэк из концепт-арта, пока загружается .glb
        if (b.type === 'boiler_house' && this.buildings['building_boiler_house']) {
          const img = this.buildings['building_boiler_house'];
          ctx.drawImage(img, b.x - 24, b.y - 24, img.width, img.height);
          return;
        } else if (houseKind(b) === 'khrushchevka' && this.buildings['building_panel_320x160']) {
          const img = this.buildings['building_panel_320x160'];
          ctx.drawImage(img, b.x - 24, b.y - 24, img.width, img.height);
          return;
        } else if (houseKind(b) === 'brezhnevka' && this.buildings['building_panel_220x260']) {
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
      if (!this.containerOnScreen(c, camera, screenW, screenH)) return;
      // За ним стоит персонаж — нарисуем после персонажей (drawOccludingProps).
      // Поднятый или летящий (громила швыряет) рисует game.js поверх фигур
      if (c.airborne || this.deferredContainers.has(c)) return;
      this.drawContainer(ctx, c);
    });
  }

  drawContainer(ctx, c) {
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
    // Жабьи трофеи — с пульсирующим ореолом: их выпадает немного, мимо пройти не должны
    const isTrophy = l.type === 'toad_eye' || l.type === 'toad_leg' || l.type === 'toad_liver';
    if (isTrophy) {
      const pulse = 0.3 + 0.14 * Math.sin(time * 1.6 + l.y);
      glowColor = l.type === 'toad_eye' ? `rgba(250, 204, 21, ${pulse})`
        : l.type === 'toad_leg' ? `rgba(74, 222, 128, ${pulse})` : `rgba(244, 63, 94, ${pulse})`;
    }
    // Лут Промзоны — ровное свечение своего цвета
    const PZ_GLOW = {
      nonferrous: 'rgba(251, 146, 60, 0.34)', blueprint: 'rgba(96, 165, 250, 0.36)', tech_spirit: 'rgba(203, 213, 225, 0.32)',
      plasma_cell: 'rgba(103, 232, 249, 0.42)', kvako_charge: 'rgba(163, 230, 53, 0.42)'
    };
    if (PZ_GLOW[l.type]) glowColor = PZ_GLOW[l.type];
    const big = isTrophy || !!PZ_GLOW[l.type] || l.type === 'alien_core' || l.type === 'mil_parts';

    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, hoverY, big ? 17 : 14, 0, Math.PI * 2);
    ctx.fill();

    if (img) {
      const size = big ? 32 : 28;
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
