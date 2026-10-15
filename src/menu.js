// Василий против пришельцев — сохранение забега, пауза и настройки.
// Подключается после game.js и работает с его глобальными переменными (player, containers, enemies,
// gameState, bossRef, currentLang …): скрипты обычные, без модулей, глобальная область у них общая.
//
// Сохранение (localStorage, ключ vasiliy.run):
//  - пишется само: раз в 30 секунд вне боя, сразу после магазина и победы над боссом, при паузе,
//    сворачивании и закрытии вкладки; во время боя не пишется;
//  - карта строится одинаково при каждом запуске, поэтому хранится только прогресс: статы и инвентарь
//    Василия, перки, обысканные тайники и переброшенные громилами предметы (по номеру в списке),
//    здоровье Мясника, лут на земле и живые враги (респауна нет — убитые не должны возвращаться);
//  - после загрузки Василий стоит у ларька Михалыча, живые враги — там, где были;
//  - смерть стирает сохранение (рогалик);
//  - «код сохранения» — то же сохранение одной строкой, чтобы перенести забег в другой браузер или на
//    другой компьютер (сервера у игры нет).
// Настройки (ключ vasiliy.settings) хранятся отдельно и смертью не стираются.

window.Menu = (() => {
  const SAVE_KEY = 'vasiliy.run';
  const SETTINGS_KEY = 'vasiliy.settings';
  // Меняя состав сохранения, увеличьте номер и научите applyRun() читать старые форматы.
  // 1 — без врагов (тогда враги расставляются заново), 2 — с живыми врагами,
  // 3 — тайники по номеру (громилы их переставляют), броня врагов, здоровье Мясника,
  // 4 — карта 6000×6000 с крупными домами: мир из форматов 1–3 к ней не подходит, из них берётся
  //     только прогресс Василия, а город расставляется заново,
  // 5 — дома ×2.55: тайники встали иначе, мир из формата 4 тоже не подходит (старые места тайников
  //     оказывались на стенах домов),
  // 6 — две локации (город и Промзона): location — где Василий, worlds — миры обеих локаций
  //     (в каждом то же, что раньше лежало в world); посещённые локации — visited.
  //     Сохранение формата 5 читается как город
  const SAVE_FORMAT = 6;
  // Раскладка карты: с версии 2 в городе нет штабов, и на их месте встали два тайника — номера тайников
  // после них сдвинулись; с версии 3 в СЗ углу Промзоны логово Долбильщика. Мир старой раскладки ищет
  // тайник по месту, где тот стоял (applyWorld)
  const LAYOUT_VERSION = 3;
  const WORLD_FORMAT = 5;
  const ENEMY_TYPES = new Set(['grunt', 'sniper', 'brute', 'stormtrooper', 'rocketeer']);
  const CODE_PREFIX = 'VVA1';
  const AUTOSAVE_INTERVAL_MS = 30000;
  const AUTOSAVE_CHECK_MS = 3000;
  const COMBAT_RADIUS = 750;
  const LOOT_LIMIT = 150;
  const CONFIRM_MS = 3500;
  const LOOT_TYPES = new Set(['scrap', 'bottle', 'mil_parts', 'alien_core', 'ammo_9x18', 'ammo_12g', 'stew', 'vodka', 'bandage']);

  const TEXT = {
    ru: {
      continue: 'ПРОДОЛЖИТЬ',
      new_run: 'НОВЫЙ ЗАБЕГ',
      new_run_confirm: 'ТОЧНО? ЗАБЕГ СОТРЁТСЯ',
      settings: 'НАСТРОЙКИ',
      intro: 'ПРЕДЫСТОРИЯ',
      comic_skip: 'ПРОПУСТИТЬ [ESC]',
      comic_hint: 'Клик или пробел — дальше · ← назад',
      loading_title: 'ЗАГРУЗКА',
      pause: 'ПАУЗА',
      resume: 'ПРОДОЛЖИТЬ',
      save_now: 'СОХРАНИТЬ',
      exit_menu: 'ВЫЙТИ В МЕНЮ',
      saved_at: 'Прогресс сохранён в {t}',
      practice_note: 'Тренировочный бой — прогресс не сохраняется. «Выйти в меню» вернёт ваш забег.',
      saved_now: 'Сохранено ✓',
      not_saved: 'Прогресс ещё не сохранялся',
      combat: 'Идёт бой — игра сохранится, когда враги отстанут',
      run_summary: 'Забег от {d} · ❤ {hp}/{maxHp} · оружие: {w} · перки: {p}{toads}',
      toads_left: ' · жаб осталось: {n}',
      sec_sound: 'Звук',
      volume: 'Громкость',
      sec_lang: 'Язык',
      sec_graphics: 'Графика',
      lights: 'Свет фонарей',
      particles: 'Частицы и искры',
      particles_high: 'Много',
      particles_low: 'Мало',
      resolution: 'Разрешение',
      resolution_auto: 'Авто',
      show_fps: 'Счётчик FPS (F3)',
      sec_controls: 'Управление',
      sec_save: 'Сохранение',
      save_note: 'Игра сохраняется сама: раз в полминуты вне боя, после магазина и при закрытии вкладки. После загрузки Василий появляется у ларька Михалыча. Смерть стирает забег.',
      save_status: 'Последнее сохранение: {d}',
      save_none: 'Сохранения пока нет',
      copy_code: 'Скопировать код сохранения',
      code_placeholder: 'Сюда вставьте код сохранения, чтобы перенести забег из другого браузера или с другого компьютера',
      load_code: 'Загрузить из кода',
      load_code_confirm: 'ТОЧНО? ТЕКУЩИЙ ЗАБЕГ ЗАМЕНИТСЯ',
      delete_save: 'Удалить сохранение',
      delete_confirm: 'ТОЧНО УДАЛИТЬ?',
      code_copied: 'Код скопирован в буфер обмена. Вставьте его здесь же, в настройках, в другом браузере или на другом компьютере.',
      code_select: 'Код в поле ниже — скопируйте его (Ctrl+C).',
      code_bad: 'Код не подходит. Проверьте, что он скопирован целиком.',
      code_empty: 'Сначала вставьте код в поле.',
      no_save: 'Сохранения нет: забег ещё не начат или Василий погиб.',
      save_deleted: 'Сохранение удалено.',
      back: 'НАЗАД [ESC]',
      controls: [
        ['W A S D', 'Передвижение'],
        ['Мышь', 'Прицеливание'],
        ['ЛКМ', 'Удар / стрельба'],
        ['Пробел', 'Перекат (тратит выносливость)'],
        ['E', 'Обыскать тайник / лавка Михалыча / поговорить'],
        ['R', 'Перезарядка'],
        ['Q', 'Смена оружия в ячейках 4 и 5 (жёлтые)'],
        ['Колесо', 'Сменить оружие'],
        ['1–9', 'Слоты хотбара (порядок — перетаскиванием мышью)'],
        ['ПКМ', 'Способность карты босса: рывок / гиперрегенерация'],
        ['I', 'Инвентарь'],
        ['C', 'Персонаж: характеристики, перки, карты'],
        ['J', 'Журнал заданий'],
        ['ESC', 'Пауза / закрыть окно'],
        ['F3', 'Счётчик FPS']
      ]
    },
    en: {
      continue: 'CONTINUE',
      new_run: 'NEW RUN',
      new_run_confirm: 'SURE? THE RUN WILL BE LOST',
      settings: 'SETTINGS',
      intro: 'STORY',
      comic_skip: 'SKIP [ESC]',
      comic_hint: 'Click or Space — next · ← back',
      loading_title: 'LOADING',
      pause: 'PAUSED',
      resume: 'RESUME',
      save_now: 'SAVE',
      exit_menu: 'EXIT TO MENU',
      saved_at: 'Progress saved at {t}',
      practice_note: 'Practice fight — progress is not saved. "Exit to menu" brings back your run.',
      saved_now: 'Saved ✓',
      not_saved: 'Progress has not been saved yet',
      combat: 'In combat — the game will save once enemies back off',
      run_summary: 'Run from {d} · ❤ {hp}/{maxHp} · weapons: {w} · perks: {p}{toads}',
      toads_left: ' · toads left: {n}',
      sec_sound: 'Sound',
      volume: 'Volume',
      sec_lang: 'Language',
      sec_graphics: 'Graphics',
      lights: 'Street lamp lighting',
      particles: 'Particles & sparks',
      particles_high: 'High',
      particles_low: 'Low',
      resolution: 'Resolution',
      resolution_auto: 'Auto',
      show_fps: 'FPS counter (F3)',
      sec_controls: 'Controls',
      sec_save: 'Save',
      save_note: 'The game saves by itself: every 30 seconds out of combat, after the shop and when the tab closes. After loading, Vasiliy appears at Mikhalych\'s kiosk. Death erases the run.',
      save_status: 'Last save: {d}',
      save_none: 'No save yet',
      copy_code: 'Copy save code',
      code_placeholder: 'Paste a save code here to move a run from another browser or computer',
      load_code: 'Load from code',
      load_code_confirm: 'SURE? THE CURRENT RUN WILL BE REPLACED',
      delete_save: 'Delete save',
      delete_confirm: 'REALLY DELETE?',
      code_copied: 'Code copied to clipboard. Paste it here, in Settings, in another browser or on another computer.',
      code_select: 'The code is in the box below — copy it (Ctrl+C).',
      code_bad: 'This code does not work. Make sure it was copied in full.',
      code_empty: 'Paste a code into the box first.',
      no_save: 'No save: the run has not started yet or Vasiliy is dead.',
      save_deleted: 'Save deleted.',
      back: 'BACK [ESC]',
      controls: [
        ['W A S D', 'Move'],
        ['Mouse', 'Aim'],
        ['LMB', 'Attack / shoot'],
        ['Space', 'Dodge roll (uses stamina)'],
        ['E', 'Scavenge / Mikhalych\'s shop / talk'],
        ['R', 'Reload'],
        ['Q', 'Swap the weapons in slots 4 and 5 (yellow)'],
        ['Wheel', 'Switch weapon'],
        ['1–9', 'Hotbar slots (drag with the mouse to reorder)'],
        ['RMB', 'Boss card ability: dash / hyper-regeneration'],
        ['I', 'Inventory'],
        ['C', 'Character: stats, perks, cards'],
        ['J', 'Quest journal'],
        ['ESC', 'Pause / close window'],
        ['F3', 'FPS counter']
      ]
    }
  };

  const tr = (key, vars) => {
    let s = (TEXT[currentLang] || TEXT.ru)[key];
    if (s === undefined) return key;
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  };
  const $ = id => document.getElementById(id);

  // --- Хранилище: в приватном окне или при запрете сайта localStorage бросает исключения ---
  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }
  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (e) { /* нечего удалять */ }
  }

  const num = (v, def, min = -Infinity, max = Infinity) =>
    (typeof v === 'number' && isFinite(v)) ? Math.min(max, Math.max(min, v)) : def;
  const round2 = v => Math.round(v * 100) / 100;

  // ======================= НАСТРОЙКИ =======================
  // scale — разрешение отрисовки: 'auto' (снижается само, если кадры не успевают) или доля окна
  const DEFAULT_SETTINGS = { volume: 100, lang: 'ru', lights: true, particles: 'high', showFps: false, scale: 'auto' };
  const SCALES = ['auto', '1', '0.75', '0.5'];
  const settings = Object.assign({}, DEFAULT_SETTINGS);
  (function loadSettings() {
    const s = readJSON(SETTINGS_KEY) || {};
    settings.volume = Math.round(num(s.volume, DEFAULT_SETTINGS.volume, 0, 100));
    settings.lang = s.lang === 'en' ? 'en' : 'ru';
    settings.lights = typeof s.lights === 'boolean' ? s.lights : DEFAULT_SETTINGS.lights;
    settings.particles = s.particles === 'low' ? 'low' : 'high';
    settings.showFps = s.showFps === true;
    settings.scale = SCALES.includes(String(s.scale)) ? String(s.scale) : DEFAULT_SETTINGS.scale;
  })();

  function saveSettings() {
    writeJSON(SETTINGS_KEY, settings);
  }

  function applySettings() {
    // Квадрат: на слух громкость меняется равномернее, чем при линейном ползунке
    SoundFX.setVolume((settings.volume / 100) ** 2);
    particleScale = settings.particles === 'low' ? 0.4 : 1;
    if (window.setRenderScaleSetting) window.setRenderScaleSetting(settings.scale);
    if (window.environmentRenderer) window.environmentRenderer.lightsEnabled = settings.lights;
    perfStats.visible = settings.showFps || /[?&]perf\b/.test(location.search);
    frozenFrameState = null; // на паузе перерисовать застывший кадр с новыми настройками
    if (currentLang !== settings.lang) {
      currentLang = settings.lang;
      updateUILanguage();
    }
  }

  // ======================= СОХРАНЕНИЕ ЗАБЕГА =======================
  let lastSaveAt = 0;
  let saveRequested = false;

  const runActive = () => gameState === 'PLAYING' || gameState === 'SHOP' || gameState === 'PAUSED' || gameState === 'INVENTORY' ||
    gameState === 'DIALOG' || gameState === 'WORKSHOP';

  // Бой — когда рядом есть враг, который гонится за Василием. Иначе можно было бы сохраниться
  // посреди драки и обновлением страницы сбежать к Михалычу со всем добытым в бою
  function inCombat() {
    if (bossRef && bossRef.isAggroed) return true;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.isAggroed && Math.hypot(e.x - player.x, e.y - player.y) < COMBAT_RADIUS) return true;
    }
    return false;
  }

  function snapshot() {
    const ammo = k => ({ clip: player.ammo[k].clip, reserve: player.ammo[k].reserve });
    // Мир той локации, где Василий, снимается сейчас; другой — каким он был, когда Василий оттуда ушёл
    const worlds = Object.assign({}, locationWorlds, { [currentLocation]: snapshotWorld() });
    return {
      format: SAVE_FORMAT,
      savedAt: Date.now(),
      location: currentLocation,
      visited: Array.from(locationsVisited),
      // Оборона у пролома в Промзоне: 'done' — выжившие ушли; иначе после загрузки начнётся сначала
      defense: window.Defense ? window.Defense.saveState() : undefined,
      // Спасённые в городе: видел ли Василий их на местах (приветствие — один раз)
      settlers: window.Settlers ? window.Settlers.saveState() : undefined,
      // Квесты спасённых: взятые, сданные, найденные предметы, что открыто (src/quests.js)
      quests: window.Quests ? window.Quests.saveState() : undefined,
      // Мастерская Толика: купленные улучшения, бесплатное потрачено, сколько ЭМИ-гранат сделано (src/workshop.js)
      workshop: window.Workshop ? window.Workshop.saveState() : undefined,
      worlds,
      player: {
        hp: round2(player.hp),
        maxHp: player.maxHp,
        stamina: round2(player.stamina),
        maxStamina: player.maxStamina,
        baseDamage: player.baseDamage,
        critChance: round2(player.critChance),
        critMult: player.critMult,
        items: Object.assign({}, player.items),
        resources: Object.assign({}, player.resources),
        weapons: Object.keys(player.unlockedWeapons).filter(k => player.unlockedWeapons[k]),
        ammo: { makarov: ammo('makarov'), shotgun: ammo('shotgun'), launcher: ammo('launcher') },
        empGrenades: player.empGrenades || 0,
        arcCharge: player.arcCharge || 0,
        currentWeapon: player.currentWeapon,
        equipped: Object.keys(player.equipped || {}).filter(k => player.equipped[k]),
        perks: Array.from(player.unlockedPerks),
        blockedPerks: Array.from(player.blockedPerks),
        cards: Object.assign({}, player.cards),
        pendingCards: !!player.pendingCards,
        // Способности ряда Промзоны (src/perks_pz.js): шламовая броня и что выбрано на ПКМ
        slimeArmor: round2(player.slimeArmor || 0),
        rmbAbility: player.rmbAbility || null
      }
    };
  }

  // Мир текущей локации: что обыскано и переставлено, живые враги, босс, забор, лут на земле.
  // Им же game.js запоминает локацию, из которой Василий ушёл через пролом (travelTo)
  function snapshotWorld() {
    return {
      layout: LAYOUT_VERSION,
      // [номер, обыскан, x, y, поворот] — только обысканные и переброшенные
      containers: containers.map((c, i) => (c.searched || c.moved)
        ? [i, c.searched ? 1 : 0, Math.round(c.x), Math.round(c.y), typeof c.dirIdx === 'number' ? c.dirIdx : -1]
        : null).filter(Boolean),
      bins: movedBins(),
      // Мясник есть только в городе: в Промзоне bossRef нет, но это не значит, что он побеждён
      bossDefeated: currentLocation === 'city' && !bossRef,
      boss: bossRef ? {
        hp: Math.ceil(bossRef.hp), enraged: !!bossRef.enraged,
        shield: Math.ceil(bossRef.shield), berserk: !!bossRef.berserk
      } : null,
      fence: { state: fenceBreach.state, cracks: fenceBreach.cracks },
      loot: lootItems.slice(0, LOOT_LIMIT).map(it => [it.x, it.y, it.type, it.val]),
      enemyTotal: levelEnemyTotal,
      // Долбильщик есть только в Промзоне, как Мясник — только в городе
      pounderDefeated: currentLocation === 'promzona' && !pounderRef,
      pounder: pounderRef ? { hp: Math.ceil(pounderRef.hp), phase: pounderRef.phase, snipers: !!pounderRef.snipersCalled } : null,
      // Жабы обороны у пролома не сохраняются: незаконченная оборона после загрузки начнётся заново
      enemies: enemies.filter(e => e.type !== 'boss' && e.type !== 'pounder' && !e.defense && !e.summon).map(e => ({
        type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: Math.ceil(e.hp), maxHp: e.maxHp,
        armor: e.armor || 0,
        radius: e.radius, speed: e.speed, aggroRadius: e.aggroRadius, color: e.color,
        tier: e.tier, districtId: e.districtId, bounds: e.bounds
      }))
    };
  }

  const isSave = s => !!(s && s.format >= 1 && s.format <= SAVE_FORMAT && s.player &&
    (s.format >= 6 ? s.worlds && typeof s.worlds === 'object' : s.world));

  // Где Василий в сохранении: до формата 6 Промзоны не было — значит, в городе
  const locationOf = s => (s && s.format >= 6 && s.location === 'promzona' ? 'promzona' : 'city');

  // Урны, которые громилы переставили: [список (0 — во дворах, 1 — на тротуарах), номер, x, y]
  function binLists() {
    const env = window.environmentRenderer;
    return env ? [env.courtyardBins, env.staticSidewalkBins] : [];
  }
  function movedBins() {
    const out = [];
    binLists().forEach((list, li) => list.forEach((b, i) => {
      if (b.moved) out.push([li, i, Math.round(b.x), Math.round(b.y)]);
    }));
    return out;
  }

  function loadSave() {
    const s = readJSON(SAVE_KEY);
    return isSave(s) ? s : null;
  }

  // Пишет сохранение, если сейчас можно: идёт забег и нет боя
  function saveRun() {
    // Тренировочный бой (?boss2, src/practice.js) не пишет сохранение
    if (window.Practice && window.Practice.active) return false;
    if (!runActive() || inCombat()) return false;
    if (!writeJSON(SAVE_KEY, snapshot())) return false;
    lastSaveAt = Date.now();
    saveRequested = false;
    return true;
  }

  function tryAutosave() {
    if (!runActive() || inCombat()) return;
    if (saveRequested || Date.now() - lastSaveAt >= AUTOSAVE_INTERVAL_MS) saveRun();
  }

  // Важное событие (покупка, босс): сохранить как можно скорее — сразу или когда закончится бой
  function requestSave() {
    saveRequested = true;
    tryAutosave();
  }

  // Вызывается из startGame() после generateWorld(): переносит прогресс на свежую карту.
  // Каждое поле проверяется: сохранение могло прийти из кода, набранного руками
  function applyRun(s) {
    const p = s.player || {};
    player.maxHp = num(p.maxHp, player.maxHp, 1, 100000);
    player.hp = num(p.hp, player.maxHp, 1, player.maxHp);
    player.maxStamina = num(p.maxStamina, player.maxStamina, 1, 100000);
    player.stamina = num(p.stamina, player.maxStamina, 0, player.maxStamina);
    player.baseDamage = num(p.baseDamage, player.baseDamage, 0, 100000);
    player.critChance = num(p.critChance, player.critChance, 0, 1);
    player.critMult = num(p.critMult, player.critMult, 1, 100);
    for (const k in player.items) {
      player.items[k] = Math.floor(num(p.items && p.items[k], player.items[k], 0, 99999));
    }
    for (const k in player.resources) {
      player.resources[k] = Math.floor(num(p.resources && p.resources[k], player.resources[k], 0, 999999));
    }
    const weapons = Array.isArray(p.weapons) ? p.weapons : [];
    for (const k in player.unlockedWeapons) {
      player.unlockedWeapons[k] = k === 'bat' || weapons.includes(k);
    }
    player.empGrenades = Math.floor(num(p.empGrenades, 0, 0, 9));
    player.arcCharge = Math.floor(num(p.arcCharge, 0, 0, 99999));
    // Мастерская: магазин ПМ и перезарядка обреза зависят от улучшений — до патронов (clip не больше maxClip)
    if (window.Workshop) window.Workshop.loadState(s.workshop);
    ['makarov', 'shotgun', 'launcher'].forEach(k => {
      const a = p.ammo && p.ammo[k];
      if (!a) return;
      player.ammo[k].clip = Math.floor(num(a.clip, player.ammo[k].clip, 0, player.ammo[k].maxClip));
      player.ammo[k].reserve = Math.floor(num(a.reserve, player.ammo[k].reserve, 0, 99999));
    });
    // Что с собой: в старых сохранениях этого нет — тогда всё купленное
    player.equipped = {};
    const carried = Array.isArray(p.equipped) ? p.equipped : Object.keys(player.unlockedWeapons);
    for (const k in player.unlockedWeapons) {
      if (player.unlockedWeapons[k] && carried.includes(k)) player.equipped[k] = true;
    }
    if (player.unlockedWeapons[p.currentWeapon] && player.equipped[p.currentWeapon]) {
      player.currentWeapon = p.currentWeapon;
    } else {
      player.currentWeapon = Object.keys(player.equipped)[0] || null;
    }
    const knownPerk = id => Object.values(UPGRADE_TREES).some(tree => tree.perks[id]);
    (Array.isArray(p.perks) ? p.perks : []).filter(knownPerk).forEach(id => player.unlockedPerks.add(id));
    (Array.isArray(p.blockedPerks) ? p.blockedPerks : []).filter(knownPerk).forEach(id => player.blockedPerks.add(id));
    // Карты за боссов: здоровье от «Живучести» уже входит в maxHp
    for (const k in player.cards) {
      player.cards[k] = Math.floor(num(p.cards && p.cards[k], 0, 0, 9));
    }
    player.pendingCards = !!p.pendingCards;
    player.slimeArmor = num(p.slimeArmor, slimeArmorMax(), 0, slimeArmorMax());
    player.rmbAbility = typeof p.rmbAbility === 'string' ? p.rmbAbility : null;

    // Миры локаций. Формат 6 — по локациям: мир той, где Василий, восстанавливается сразу (generateWorld
    // уже построил её в startGame), другой ждёт перехода через пролом. Раньше был один мир — городской.
    // Сохранение со старой карты (до WORLD_FORMAT): прогресс Василия перенесён, мир остаётся свежим
    let w = {};
    if (s.format >= 6) {
      const worlds = s.worlds || {};
      w = worlds[currentLocation] || {};
      locationWorlds = {};
      ['city', 'promzona'].forEach(id => {
        if (id !== currentLocation && worlds[id] && typeof worlds[id] === 'object') locationWorlds[id] = worlds[id];
      });
      (Array.isArray(s.visited) ? s.visited : []).forEach(id => {
        if (id === 'city' || id === 'promzona') locationsVisited.add(id);
      });
    } else if (s.format >= WORLD_FORMAT) {
      w = s.world || {};
    }
    applyWorld(w);
    lastSaveAt = Date.now();
    saveRequested = false;
  }

  // Мир локации из снимка (snapshotWorld) — на только что построенную generateWorld() карту.
  // Каждое поле проверяется: сохранение могло прийти из кода, набранного руками
  function applyWorld(w) {
    w = w || {};
    if (Array.isArray(w.containers)) {
      // Формат 3: по номеру тайника; у старой раскладки — сначала по месту (переброшенные громилой — по номеру)
      const byPos = (w.layout || 1) < LAYOUT_VERSION ? new Map(containers.map(c => [c.x + ',' + c.y, c])) : null;
      w.containers.forEach(d => {
        const c = Array.isArray(d) && ((byPos && byPos.get(d[2] + ',' + d[3])) || containers[d[0]]);
        if (!c) return;
        c.searched = !!d[1];
        const x = num(d[2], c.x, 60, WORLD_WIDTH - 60), y = num(d[3], c.y, 60, WORLD_HEIGHT - 60);
        // Место внутри дома (сохранение с другой раскладки) — тайник остаётся там, где встал
        if ((x !== c.x || y !== c.y) && !checkBuildingCollision(x, y, 10)) {
          c.x = x;
          c.y = y;
          if (d[4] >= 0 && d[4] < 16) c.dirIdx = Math.floor(d[4]);
          c.moved = true;
          placeObstacleFor(c, throwableKind(c));
        }
      });
    } else {
      // Форматы 1–2: обысканные тайники по координатам
      const searched = new Set(Array.isArray(w.searched) ? w.searched : []);
      containers.forEach(c => { if (searched.has(c.x + ',' + c.y)) c.searched = true; });
    }
    if (Array.isArray(w.bins)) {
      const lists = binLists();
      w.bins.forEach(d => {
        const b = Array.isArray(d) && lists[d[0]] && lists[d[0]][d[1]];
        if (!b) return;
        b.x = num(d[2], b.x, 60, WORLD_WIDTH - 60);
        b.y = num(d[3], b.y, 60, WORLD_HEIGHT - 60);
        b.moved = true;
        placeObstacleFor(b, 'bin');
      });
    }
    if (w.pounderDefeated && pounderRef) {
      const i = enemies.indexOf(pounderRef);
      if (i >= 0) enemies.splice(i, 1);
      pounderRef = null;
    } else if (w.pounder && pounderRef) {
      pounderRef.hp = num(w.pounder.hp, pounderRef.maxHp, 1, pounderRef.maxHp);
      // Фаза не повторяется после загрузки; копии 20% не сохраняются — после загрузки их нет
      pounderRef.phase = Math.floor(num(w.pounder.phase, 1, 1, 3));
      pounderRef.snipersCalled = !!w.pounder.snipers;
    }
    if (w.bossDefeated && bossRef) {
      const i = enemies.indexOf(bossRef);
      if (i >= 0) enemies.splice(i, 1);
      bossRef = null;
    } else if (w.boss && bossRef) {
      bossRef.hp = num(w.boss.hp, bossRef.maxHp, 1, bossRef.maxHp);
      bossRef.enraged = !!w.boss.enraged; // подмога из капсул уже вылезала — второй раз не будет
      bossRef.shield = num(w.boss.shield, BOSS_SHIELD_MAX, 0, BOSS_SHIELD_MAX);
      bossRef.berserk = !!w.boss.berserk;
    }
    // Забор за логовом: треснул или уже проломлен
    if (w.fence && (w.fence.state === 'cracked' || w.fence.state === 'open')) {
      fenceBreach.state = w.fence.state;
      fenceBreach.cracks = Math.floor(num(w.fence.cracks, 1, 0, 3));
      if (fenceBreach.state === 'open') openBreachCollision();
    }
    (Array.isArray(w.loot) ? w.loot : []).slice(0, LOOT_LIMIT).forEach(it => {
      if (!Array.isArray(it) || !LOOT_TYPES.has(it[2])) return;
      spawn3DLootItem(num(it[0], safeZone.x, 0, WORLD_WIDTH), num(it[1], safeZone.y, 0, WORLD_HEIGHT), it[2], num(it[3], 1, 1, 9999));
    });
    // Живые враги (формат 2). В формате 1 их нет — остаются только что расставленные
    if (Array.isArray(w.enemies)) {
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].type !== 'boss' && enemies[i].type !== 'pounder') enemies.splice(i, 1);
      }
      w.enemies.forEach(d => {
        if (!d || !ENEMY_TYPES.has(d.type)) return;
        const maxHp = num(d.maxHp, 100, 1, 100000);
        const x = num(d.x, 0, 60, WORLD_WIDTH - 60), y = num(d.y, 0, 60, WORLD_HEIGHT - 60);
        const b = d.bounds || {};
        enemies.push({
          x, y, startX: x, startY: y,
          bounds: { x1: num(b.x1, x - 300), y1: num(b.y1, y - 300), x2: num(b.x2, x + 300), y2: num(b.y2, y + 300) },
          districtId: typeof d.districtId === 'string' ? d.districtId : 'courtyards',
          tier: num(d.tier, 1, 0, 9),
          radius: num(d.radius, 22, 8, 60),
          armor: num(d.armor, d.type === 'brute' ? 0.6 : 0, 0, 0.9),
          throwCooldown: 120 + Math.floor(Math.random() * 240),
          hp: num(d.hp, maxHp, 1, maxHp),
          maxHp,
          speed: num(d.speed, 2.5, 0.5, 6),
          type: d.type,
          color: typeof d.color === 'string' ? d.color : '#22c55e',
          aggroRadius: num(d.aggroRadius, 300, 50, 1000),
          isAggroed: false,
          hitFlash: 0,
          patrolAngle: Math.random() * Math.PI * 2,
          patrolTimer: Math.random() * 120 + 60,
          shootCooldown: Math.random() * 70 + 45
        });
      });
      levelEnemyTotal = Math.round(num(w.enemyTotal, enemies.length, 0, 1000));
    }
    levelCleared = enemies.length === 0 && levelEnemyTotal > 0;
  }

  function onGameOver() {
    if (window.Practice && window.Practice.active) return;   // тренировка забег не стирает
    removeKey(SAVE_KEY);
    lastSaveAt = 0;
    saveRequested = false;
  }

  // --- Код сохранения: VVA1.<JSON в base64url>.<контрольная сумма> ---
  function toBase64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromBase64Url(s) {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  // FNV-1a: ловит обрезанный или испорченный при копировании код
  function checksum(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  }
  function encodeSave(s) {
    const json = JSON.stringify(s);
    return `${CODE_PREFIX}.${toBase64Url(json)}.${checksum(json)}`;
  }
  function decodeSave(code) {
    const parts = code.replace(/\s+/g, '').split('.');
    if (parts.length !== 3 || parts[0] !== CODE_PREFIX) return null;
    try {
      const json = fromBase64Url(parts[1]);
      if (checksum(json) !== parts[2]) return null;
      const s = JSON.parse(json);
      return isSave(s) ? s : null;
    } catch (e) {
      return null;
    }
  }

  const formatDate = ts => new Date(ts).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-GB',
    { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const formatTime = ts => new Date(ts).toLocaleTimeString(currentLang === 'ru' ? 'ru-RU' : 'en-GB',
    { hour: '2-digit', minute: '2-digit' });

  // ======================= ЭКРАНЫ =======================
  // Кнопка с подтверждением: первый клик меняет надпись на «ТОЧНО?», второй в течение пары секунд — выполняет
  function confirmClick(btn, confirmKey, action) {
    if (btn.dataset.armed) {
      clearTimeout(btn._disarm);
      delete btn.dataset.armed;
      btn.classList.remove('armed');
      action();
      refreshTexts();
      return;
    }
    btn.dataset.armed = '1';
    btn.classList.add('armed');
    btn.textContent = tr(confirmKey);
    btn._disarm = setTimeout(() => {
      delete btn.dataset.armed;
      btn.classList.remove('armed');
      refreshTexts();
    }, CONFIRM_MS);
  }

  function startNewRun() {
    removeKey(SAVE_KEY);
    hidePause();
    const begin = () => {
      startGame();
      requestSave();
    };
    // Самый первый забег начинается с комикса-предыстории (src/comic.js)
    if (window.Comic && !window.Comic.seen()) window.Comic.play(begin);
    else begin();
  }

  function continueRun(save) {
    const s = save || loadSave();
    if (!s) {
      refreshMenu();
      return;
    }
    hidePause();
    startGame(s);
  }

  // --- Пауза ---
  function pause() {
    if (gameState !== 'PLAYING') return;
    gameState = 'PAUSED';
    // Клавиши, отпущенные, пока окно было не в фокусе, иначе «залипают» после паузы
    for (const k in keys) keys[k] = false;
    mouseDown = false;
    saveRun();
    $('screen-pause').style.display = 'flex';
    updatePauseStatus();
  }

  function resume() {
    if (gameState !== 'PAUSED') return;
    hidePause();
    gameState = 'PLAYING';
  }

  function hidePause() {
    $('screen-pause').style.display = 'none';
  }

  function updatePauseStatus(justSaved = false) {
    const el = $('pause-save-status');
    if (window.Practice && window.Practice.active) el.textContent = tr('practice_note');
    else if (inCombat()) el.textContent = tr('combat');
    else if (justSaved) el.textContent = tr('saved_now');
    else el.textContent = lastSaveAt ? tr('saved_at', { t: formatTime(lastSaveAt) }) : tr('not_saved');
  }

  function exitToMenu() {
    if (window.Practice && window.Practice.active) {
      window.Practice.exit();
      return;
    }
    saveRun();
    hidePause();
    gameState = 'MENU';
    $('screen-menu').style.display = 'flex';
    updateUILanguage();
  }

  // --- Главное меню: «Продолжить», если есть сохранение ---
  function refreshMenu() {
    const save = gameState === 'MENU' ? loadSave() : null;
    const btnContinue = $('btn-continue');
    const btnStart = $('btn-start');
    const note = $('continue-note');
    btnContinue.style.display = save ? '' : 'none';
    note.style.display = save ? '' : 'none';
    btnStart.classList.toggle('btn-secondary', !!save);
    btnStart.classList.toggle('btn-action', !save);
    if (save) {
      const p = save.player;
      // Жабы — той локации, где Василий остановился
      const w = save.format >= 6 ? (save.worlds && save.worlds[locationOf(save)]) || {} : save.world;
      note.textContent = tr('run_summary', {
        d: formatDate(save.savedAt),
        hp: Math.ceil(num(p.hp, 0)),
        maxHp: Math.round(num(p.maxHp, 0)),
        w: Array.isArray(p.weapons) ? p.weapons.length : 1,
        p: Array.isArray(p.perks) ? p.perks.length : 0,
        toads: Array.isArray(w.enemies) ? tr('toads_left', { n: w.enemies.length }) : ''
      });
      if (!btnStart.dataset.armed) btnStart.textContent = tr('new_run');
    }
  }

  // --- Настройки ---
  const settingsOpen = () => $('settings-modal').style.display === 'flex';

  function openSettings() {
    settings.showFps = perfStats.visible; // F3 мог переключить счётчик в обход настроек
    $('settings-modal').style.display = 'flex';
    $('set-code-msg').textContent = '';
    syncSettingsUI();
  }

  function closeSettings() {
    $('settings-modal').style.display = 'none';
  }

  function syncSettingsUI() {
    $('set-volume').value = settings.volume;
    $('set-volume-val').textContent = settings.volume + '%';
    $('set-lights').checked = settings.lights;
    $('set-fps').checked = settings.showFps;
    document.querySelectorAll('#set-lang button').forEach(b => b.classList.toggle('active', b.dataset.v === currentLang));
    document.querySelectorAll('#set-particles button').forEach(b => b.classList.toggle('active', b.dataset.v === settings.particles));
    document.querySelectorAll('#set-scale button').forEach(b => b.classList.toggle('active', b.dataset.v === settings.scale));
    const save = loadSave();
    $('set-save-status').textContent = save ? tr('save_status', { d: formatDate(save.savedAt) }) : tr('save_none');
    // Удалять сохранение посреди забега бессмысленно — автосохранение тут же запишет его снова
    $('btn-delete-save').style.display = save && !runActive() ? '' : 'none';
  }

  function setCodeMessage(key, ok) {
    const el = $('set-code-msg');
    el.textContent = tr(key);
    el.className = 'settings-msg ' + (ok ? 'ok' : 'err');
  }

  function copySaveCode() {
    saveRun(); // вне боя — свежий снимок; в бою — последнее сохранение
    const save = loadSave();
    if (!save) {
      setCodeMessage('no_save', false);
      return;
    }
    const code = encodeSave(save);
    const box = $('set-code');
    box.value = code;
    box.select();
    const fallback = () => setCodeMessage('code_select', true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => setCodeMessage('code_copied', true), fallback);
    } else {
      fallback();
    }
    syncSettingsUI();
  }

  function loadFromCode(btn) {
    const code = $('set-code').value.trim();
    if (!code) {
      setCodeMessage('code_empty', false);
      return;
    }
    const save = decodeSave(code);
    if (!save) {
      setCodeMessage('code_bad', false);
      return;
    }
    const doLoad = () => {
      writeJSON(SAVE_KEY, save);
      $('set-code').value = '';
      closeSettings();
      continueRun(save);
    };
    if (runActive() || loadSave()) confirmClick(btn, 'load_code_confirm', doLoad);
    else doLoad();
  }

  // Тексты по data-t (содержимое) и data-tp (placeholder); кнопки в режиме «ТОЧНО?» не трогаем
  function refreshTexts() {
    document.querySelectorAll('[data-t]').forEach(el => {
      if (!el.dataset.armed) el.textContent = tr(el.dataset.t);
    });
    document.querySelectorAll('[data-tp]').forEach(el => { el.placeholder = tr(el.dataset.tp); });
    // Подсказки по управлению — в настройках и в меню паузы
    ['set-controls', 'pause-controls'].forEach(id => {
      const list = $(id);
      if (!list) return;
      list.innerHTML = '';
      // Пара «клавиша — что делает» — одной строкой, чтобы в две колонки (пауза) она не разрывалась
      tr('controls').forEach(([key, what]) => {
        const row = document.createElement('div');
        row.className = 'ctrl-row';
        const k = document.createElement('kbd');
        k.textContent = key;
        const d = document.createElement('span');
        d.textContent = what;
        row.append(k, d);
        list.append(row);
      });
    });
    refreshMenu();
    if (gameState === 'PAUSED') updatePauseStatus();
    if (settingsOpen()) syncSettingsUI();
  }

  function onEscape() {
    if (settingsOpen()) closeSettings();
    else if (gameState === 'SHOP') closeShop();
    else if (gameState === 'INVENTORY') window.CharacterPanel.close();
    else if (gameState === 'DIALOG') window.Dialog.close();
    else if (gameState === 'WORKSHOP') window.Workshop.close();
    else if (gameState === 'PLAYING') pause();
    else if (gameState === 'PAUSED') resume();
  }

  // ======================= ПОДКЛЮЧЕНИЕ =======================
  $('btn-continue').addEventListener('click', () => continueRun());
  $('btn-start').addEventListener('click', e => {
    if (gameState === 'MENU' && loadSave()) confirmClick(e.currentTarget, 'new_run_confirm', startNewRun);
    else startNewRun();
  });
  $('btn-menu-settings').addEventListener('click', openSettings);
  $('btn-menu-intro').addEventListener('click', () => window.Comic && window.Comic.play());

  $('btn-resume').addEventListener('click', resume);
  $('btn-pause-save').addEventListener('click', () => updatePauseStatus(saveRun()));
  $('btn-pause-settings').addEventListener('click', openSettings);
  $('btn-pause-exit').addEventListener('click', exitToMenu);

  $('btn-settings-close').addEventListener('click', closeSettings);
  $('set-volume').addEventListener('input', e => {
    settings.volume = Number(e.target.value);
    $('set-volume-val').textContent = settings.volume + '%';
    applySettings();
    saveSettings();
  });
  $('set-volume').addEventListener('change', () => SoundFX.reload()); // пробный звук на новой громкости
  $('set-lights').addEventListener('change', e => {
    settings.lights = e.target.checked;
    applySettings();
    saveSettings();
  });
  $('set-fps').addEventListener('change', e => {
    settings.showFps = e.target.checked;
    applySettings();
    saveSettings();
  });
  document.querySelectorAll('#set-particles button').forEach(b => b.addEventListener('click', () => {
    settings.particles = b.dataset.v;
    applySettings();
    saveSettings();
    syncSettingsUI();
  }));
  document.querySelectorAll('#set-scale button').forEach(b => b.addEventListener('click', () => {
    settings.scale = b.dataset.v;
    applySettings();
    saveSettings();
    syncSettingsUI();
  }));
  document.querySelectorAll('#set-lang button').forEach(b => b.addEventListener('click', () => {
    settings.lang = b.dataset.v;
    applySettings();
    saveSettings();
    syncSettingsUI();
  }));
  // Кнопка языка в углу HUD (game.js) уже переключила currentLang — запоминаем выбор
  $('btn-lang').addEventListener('click', () => {
    settings.lang = currentLang;
    saveSettings();
  });
  $('btn-copy-code').addEventListener('click', copySaveCode);
  $('btn-load-code').addEventListener('click', e => loadFromCode(e.currentTarget));
  $('btn-delete-save').addEventListener('click', e => confirmClick(e.currentTarget, 'delete_confirm', () => {
    removeKey(SAVE_KEY);
    lastSaveAt = 0;
    setCodeMessage('save_deleted', true);
    syncSettingsUI();
  }));

  // Автосохранение по таймеру (работает и тогда, когда рендер стоит) и при уходе со страницы
  setInterval(tryAutosave, AUTOSAVE_CHECK_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (gameState === 'PLAYING') pause();
    else saveRun();
  });
  window.addEventListener('pagehide', saveRun);
  // Переключился в другое окно — игра встаёт на паузу, а не продолжает без игрока
  window.addEventListener('blur', pause);

  applySettings();
  refreshTexts();

  return {
    applyRun, onGameOver, requestSave, refreshTexts, onEscape, pause, resume, saveRun, inCombat,
    snapshotWorld, applyWorld, locationOf, loadSave
  };
})();
