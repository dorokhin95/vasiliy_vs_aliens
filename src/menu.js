// Василий против пришельцев — сохранение забега, пауза и настройки.
// Подключается после game.js и работает с его глобальными переменными (player, containers, enemies,
// gameState, bossRef, currentLang …): скрипты обычные, без модулей, глобальная область у них общая.
//
// Сохранение (localStorage, ключ vasiliy.run):
//  - пишется само: раз в 30 секунд вне боя, сразу после магазина и победы над боссом, при паузе,
//    сворачивании и закрытии вкладки; во время боя не пишется;
//  - карта строится одинаково при каждом запуске, поэтому хранится только прогресс: статы и инвентарь
//    Василия, перки, обысканные тайники (по координатам), побеждён ли босс, лут на земле;
//  - после загрузки Василий стоит у ларька Михалыча, враги расставляются заново;
//  - смерть стирает сохранение (рогалик);
//  - «код сохранения» — то же сохранение одной строкой, чтобы перенести забег в другой браузер или на
//    другой компьютер (сервера у игры нет).
// Настройки (ключ vasiliy.settings) хранятся отдельно и смертью не стираются.

window.Menu = (() => {
  const SAVE_KEY = 'vasiliy.run';
  const SETTINGS_KEY = 'vasiliy.settings';
  // Меняя состав сохранения, увеличьте номер и добавьте перевод старого формата в loadSave()
  const SAVE_FORMAT = 1;
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
      pause: 'ПАУЗА',
      resume: 'ПРОДОЛЖИТЬ',
      save_now: 'СОХРАНИТЬ',
      exit_menu: 'ВЫЙТИ В МЕНЮ',
      saved_at: 'Прогресс сохранён в {t}',
      saved_now: 'Сохранено ✓',
      not_saved: 'Прогресс ещё не сохранялся',
      combat: 'Идёт бой — игра сохранится, когда враги отстанут',
      run_summary: 'Забег от {d} · ❤ {hp}/{maxHp} · оружие: {w} · перки: {p}',
      sec_sound: 'Звук',
      volume: 'Громкость',
      sec_lang: 'Язык',
      sec_graphics: 'Графика',
      lights: 'Свет фонарей',
      particles: 'Частицы и искры',
      particles_high: 'Много',
      particles_low: 'Мало',
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
        ['E', 'Обыскать тайник / лавка Михалыча'],
        ['R', 'Перезарядка'],
        ['Q', 'Следующее оружие'],
        ['1–8', 'Слоты хотбара (порядок — перетаскиванием мышью)'],
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
      pause: 'PAUSED',
      resume: 'RESUME',
      save_now: 'SAVE',
      exit_menu: 'EXIT TO MENU',
      saved_at: 'Progress saved at {t}',
      saved_now: 'Saved ✓',
      not_saved: 'Progress has not been saved yet',
      combat: 'In combat — the game will save once enemies back off',
      run_summary: 'Run from {d} · ❤ {hp}/{maxHp} · weapons: {w} · perks: {p}',
      sec_sound: 'Sound',
      volume: 'Volume',
      sec_lang: 'Language',
      sec_graphics: 'Graphics',
      lights: 'Street lamp lighting',
      particles: 'Particles & sparks',
      particles_high: 'High',
      particles_low: 'Low',
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
        ['E', 'Scavenge / Mikhalych\'s shop'],
        ['R', 'Reload'],
        ['Q', 'Next weapon'],
        ['1–8', 'Hotbar slots (drag with the mouse to reorder)'],
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
  const DEFAULT_SETTINGS = { volume: 100, lang: 'ru', lights: true, particles: 'high', showFps: false };
  const settings = Object.assign({}, DEFAULT_SETTINGS);
  (function loadSettings() {
    const s = readJSON(SETTINGS_KEY) || {};
    settings.volume = Math.round(num(s.volume, DEFAULT_SETTINGS.volume, 0, 100));
    settings.lang = s.lang === 'en' ? 'en' : 'ru';
    settings.lights = typeof s.lights === 'boolean' ? s.lights : DEFAULT_SETTINGS.lights;
    settings.particles = s.particles === 'low' ? 'low' : 'high';
    settings.showFps = s.showFps === true;
  })();

  function saveSettings() {
    writeJSON(SETTINGS_KEY, settings);
  }

  function applySettings() {
    // Квадрат: на слух громкость меняется равномернее, чем при линейном ползунке
    SoundFX.setVolume((settings.volume / 100) ** 2);
    particleScale = settings.particles === 'low' ? 0.4 : 1;
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

  const runActive = () => gameState === 'PLAYING' || gameState === 'SHOP' || gameState === 'PAUSED';

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
    return {
      format: SAVE_FORMAT,
      savedAt: Date.now(),
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
        ammo: { makarov: ammo('makarov'), shotgun: ammo('shotgun') },
        currentWeapon: player.currentWeapon,
        perks: Array.from(player.unlockedPerks),
        blockedPerks: Array.from(player.blockedPerks)
      },
      world: {
        searched: containers.filter(c => c.searched).map(c => c.x + ',' + c.y),
        bossDefeated: !bossRef,
        loot: lootItems.slice(0, LOOT_LIMIT).map(it => [it.x, it.y, it.type, it.val])
      }
    };
  }

  const isSave = s => !!(s && s.format === SAVE_FORMAT && s.player && s.world);

  function loadSave() {
    const s = readJSON(SAVE_KEY);
    return isSave(s) ? s : null;
  }

  // Пишет сохранение, если сейчас можно: идёт забег и нет боя
  function saveRun() {
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
    ['makarov', 'shotgun'].forEach(k => {
      const a = p.ammo && p.ammo[k];
      if (!a) return;
      player.ammo[k].clip = Math.floor(num(a.clip, player.ammo[k].clip, 0, player.ammo[k].maxClip));
      player.ammo[k].reserve = Math.floor(num(a.reserve, player.ammo[k].reserve, 0, 99999));
    });
    if (player.unlockedWeapons[p.currentWeapon]) player.currentWeapon = p.currentWeapon;
    const knownPerk = id => Object.values(UPGRADE_TREES).some(tree => tree.perks[id]);
    (Array.isArray(p.perks) ? p.perks : []).filter(knownPerk).forEach(id => player.unlockedPerks.add(id));
    (Array.isArray(p.blockedPerks) ? p.blockedPerks : []).filter(knownPerk).forEach(id => player.blockedPerks.add(id));

    const w = s.world || {};
    const searched = new Set(Array.isArray(w.searched) ? w.searched : []);
    containers.forEach(c => { if (searched.has(c.x + ',' + c.y)) c.searched = true; });
    if (w.bossDefeated && bossRef) {
      const i = enemies.indexOf(bossRef);
      if (i >= 0) enemies.splice(i, 1);
      bossRef = null;
    }
    (Array.isArray(w.loot) ? w.loot : []).slice(0, LOOT_LIMIT).forEach(it => {
      if (!Array.isArray(it) || !LOOT_TYPES.has(it[2])) return;
      spawn3DLootItem(num(it[0], safeZone.x, 0, WORLD_WIDTH), num(it[1], safeZone.y, 0, WORLD_HEIGHT), it[2], num(it[3], 1, 1, 9999));
    });
    lastSaveAt = Date.now();
    saveRequested = false;
  }

  function onGameOver() {
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
    if (inCombat()) el.textContent = tr('combat');
    else if (justSaved) el.textContent = tr('saved_now');
    else el.textContent = lastSaveAt ? tr('saved_at', { t: formatTime(lastSaveAt) }) : tr('not_saved');
  }

  function exitToMenu() {
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
      note.textContent = tr('run_summary', {
        d: formatDate(save.savedAt),
        hp: Math.ceil(num(p.hp, 0)),
        maxHp: Math.round(num(p.maxHp, 0)),
        w: Array.isArray(p.weapons) ? p.weapons.length : 1,
        p: Array.isArray(p.perks) ? p.perks.length : 0
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
    const list = $('set-controls');
    if (list) {
      list.innerHTML = '';
      tr('controls').forEach(([key, what]) => {
        const k = document.createElement('kbd');
        k.textContent = key;
        const d = document.createElement('span');
        d.textContent = what;
        list.append(k, d);
      });
    }
    refreshMenu();
    if (gameState === 'PAUSED') updatePauseStatus();
    if (settingsOpen()) syncSettingsUI();
  }

  function onEscape() {
    if (settingsOpen()) closeSettings();
    else if (gameState === 'SHOP') closeShop();
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

  return { applyRun, onGameOver, requestSave, refreshTexts, onEscape, pause, resume, saveRun, inCombat };
})();
