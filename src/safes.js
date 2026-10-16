// Сейфы Промзоны (docs/LEVEL2_PROMZONA.md, раздел 9): новый вид тайника, вскрывается подбором кода.
// После каждой попытки под цифрой загорается лампочка: зелёная — цифра на месте, жёлтая — есть в коде, но
// не здесь, не горит — такой нет. Цифры в коде не повторяются. Не угадал за все попытки — замок заклинило
// на JAM_FRAMES, потом код новый. Игра на паузу не встаёт: ударили Василия или он отошёл — окно закрывается.
// Перк «Стетоскоп» (ветка Кибернизации) сразу подсвечивает одну цифру кода.
// Скрипты обычные, без модулей: player, containers, currentLang, spawn3DLootItem — из game.js.
window.Safes = (function () {
  const $ = id => document.getElementById(id);
  const L = (r, e) => (currentLang === 'ru' ? r : e);

  // Тип тайника → длина кода, попытки, имя. Модели и размер на карте — PZ_MODELS / PZ_CONTAINERS (environment.js)
  const SAFE_TYPES = {
    safe_cabinet: { digits: 3, attempts: 8, name: ['Железный шкаф', 'Iron cabinet'] },
    safe_fireproof: { digits: 4, attempts: 7, name: ['Несгораемый шкаф', 'Fireproof cabinet'] },
    safe_vault: { digits: 5, attempts: 6, name: ['Кассовый сейф', 'Cash vault'] }
  };
  const JAM_FRAMES = 60 * 30;

  // Что внутри: [тип лута, от, до, шанс] — по таблице docs/LEVEL2_PROMZONA.md, раздел 9. Лут Промзоны
  // (PZ_LOOT_NAMES в game.js): цветмет и спирт — в шкафах, плазменные ячейки и чертёж (шанс) — в несгораемых,
  // в кассовом — чертёж всегда. Чертежи падают только из сейфов
  const SAFE_LOOT = {
    safe_cabinet: [['bottle', 3, 5], ['scrap', 4, 7], ['nonferrous', 1, 2], ['tech_spirit', 1, 1, 0.5],
      ['ammo_9x18', 8, 8, 0.5], ['ammo_12g', 4, 4, 0.4], ['bandage', 1, 1, 0.4]],
    safe_fireproof: [['bottle', 4, 6], ['scrap', 6, 10], ['mil_parts', 1, 2], ['blueprint', 1, 1, 0.35], ['nonferrous', 2, 3],
      ['plasma_cell', 1, 2, 0.6], ['bandage', 1, 1, 0.6], ['stew', 1, 1, 0.5], ['ammo_12g', 6, 6, 0.5]],
    safe_vault: [['bottle', 8, 10], ['scrap', 10, 14], ['mil_parts', 2, 3], ['alien_core', 2, 3], ['blueprint', 1, 1],
      ['plasma_cell', 1, 2, 0.5], ['kvako_charge', 1, 1, 0.5], ['vodka', 1, 1, 0.6], ['bandage', 1, 1]]
  };

  let cur = null;          // сейф, который сейчас вскрывают
  let input = [];          // набранные цифры
  let lastHp = 0;
  const jammed = new Set();

  const isSafe = c => !!(c && SAFE_TYPES[c.type]);
  const state = c => c.safe || (c.safe = { code: null, guesses: [], jam: 0, hint: null });
  const isOpen = () => !!cur;

  function newCode(n) {
    const d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d.slice(0, n);
  }

  // Сетевой кооп: код сейфа загадывает и проверяет только хост (у клиента он лишь приходит в снимке),
  // поэтому подготовка и проверка кода — только у хоста (netAction local: false)
  const cIndex = ([c, ...rest]) => [containers.indexOf(c), ...rest];
  const cFrom = ([i, ...rest]) => [containers[i], ...rest];
  const prep = netAction('safe.prep', prepRaw, cIndex, cFrom, false);
  const tryCode = netAction('safe.try', tryCodeRaw, cIndex, cFrom, false);

  function prepRaw(c) {
    if (!c || !isSafe(c) || c.searched) return;
    const s = state(c), def = SAFE_TYPES[c.type];
    if (s.jam > 0) return;
    if (!s.code) s.code = newCode(def.digits);
    // Стетоскоп: инженер слышит механизм — одна цифра сразу известна
    if (s.hint === null && player.hasPerk('stethoscope')) s.hint = Math.floor(Math.random() * def.digits);
  }

  function open(c) {
    const s = state(c);
    if (s.jam > 0) {
      addFloatingText(c.x - 40, c.y - 60, L('🔒 Заклинило', '🔒 Jammed'), '#f87171');
      return;
    }
    prep(c);
    cur = c;
    input = [];
    lastHp = player.hp;
    $('safe-panel').dataset.door = c.type;   // фон — дверь этого типа (assets/sprites/safe/, index.html)
    turnDial(0);
    render();
    $('safe-panel').style.display = 'flex';
  }

  // Лимб (assets/sprites/safe/dial.png: 0 — сверху, цифры по часовой через 36°) поворачивается к набранной
  // цифре кратчайшим путём; spin — полный оборот при вводе кода
  let dialAngle = 0;
  function turnDial(d, spin = 0) {
    let target = -d * 36;
    target += Math.round((dialAngle - target) / 360) * 360;
    dialAngle = target + spin;
    const el = $('safe-dial');
    if (el) el.style.transform = `rotate(${dialAngle}deg)`;
  }

  // Снимок обновил сейф, который открыт у клиента (src/net.js): лампочки, вскрыт, заклинило
  function refresh() {
    if (!cur) return;
    if (cur.searched || state(cur).jam > 0) close();
    else render();
  }

  function close() {
    if (!cur) return;
    cur = null;
    input = [];
    $('safe-panel').style.display = 'none';
  }

  function press(d) {
    if (!cur || input.length >= SAFE_TYPES[cur.type].digits) return;
    input.push(d);
    turnDial(d);
    SoundFX.emptyClick();
    render();
  }

  function erase() {
    if (!cur) return;
    input.pop();
    render();
  }

  function submit() {
    if (!cur) return;
    const def = SAFE_TYPES[cur.type];
    if (input.length < def.digits) return;
    const digits = input.slice();
    input = [];
    turnDial(0, 360);
    tryCode(cur, digits);
    if (cur) render();
  }

  // Проверка кода (у хоста — и за товарища по сети: тогда c не тот, что открыт здесь)
  function tryCodeRaw(c, digits) {
    if (!c || !isSafe(c) || c.searched || !Array.isArray(digits)) return;
    const def = SAFE_TYPES[c.type];
    const s = state(c);
    if (!s.code || s.jam > 0 || digits.length !== def.digits) return;
    const lamps = digits.map((d, i) => (d === s.code[i] ? 'green' : s.code.includes(d) ? 'yellow' : 'off'));
    s.guesses.push({ digits: digits.slice(), lamps });
    if (lamps.every(l => l === 'green')) {
      crack(c);
      return;
    }
    if (s.guesses.length >= def.attempts) {
      // Замок заклинило: подождать и начать заново — уже с другим кодом
      s.jam = JAM_FRAMES;
      s.code = null;
      s.guesses = [];
      s.hint = null;
      jammed.add(c);
      addFloatingText(c.x - 50, c.y - 60, L('🔒 ЗАКЛИНИЛО!', '🔒 JAMMED!'), '#f87171');
      SoundFX.overheat();
      if (cur === c) close();
      return;
    }
    SoundFX.reload();
    if (cur === c) render();
  }

  function crack(c) {
    c.searched = true;
    const s = state(c);
    s.code = null;
    if (cur === c) close();
    const loot = SAFE_LOOT[c.type] || [];
    const drops = [];
    loot.forEach(([type, a, b, chance = 1]) => {
      if (Math.random() < chance) drops.push([type, a + Math.floor(Math.random() * (b - a + 1))]);
    });
    const toPlayer = Math.atan2(player.y - c.y, player.x - c.x);
    // Продвинутая электроника — всегда в одних и тех же сейфах, ровно на ЭМИ-гранаты (src/workshop.js)
    if (window.Workshop && window.Workshop.isElectronicsSafe(c)) drops.push(['electronics', 1]);
    drops.forEach(([type, val], i) => {
      const a = toPlayer + (i - (drops.length - 1) / 2) * 0.5;
      spawn3DLootItem(c.x + Math.cos(a) * (c.radius + 26), c.y + Math.sin(a) * (c.radius + 20), type, val);
    });
    addFloatingText(c.x - 40, c.y - 60, L('🔓 Вскрыт!', '🔓 Cracked!'), '#4ade80');
    // Журнал Лены, журнал караула Зины (src/quests.js)
    if (window.Quests) window.Quests.onSearched(c);
    createParticles(c.x, c.y - 20, '#fde047', 16);
    SoundFX.containerOpen(c); // ригели, скрип тяжёлой двери (src/sounds.js)
    if (window.Menu) window.Menu.requestSave();
    updateHUD(true);
  }

  // Каждый кадр из update(): заклинившие замки отходят, окно закрывается от удара и если Василий отошёл
  function update() {
    jammed.forEach(c => {
      if (--c.safe.jam <= 0) {
        c.safe.jam = 0;
        jammed.delete(c);
      }
    });
    if (!cur) return;
    if (player.hp < lastHp - 0.5 || cur.searched || !canReachContainer(cur)) {
      if (player.hp < lastHp - 0.5) addFloatingText(player.x - 40, player.y - 60, L('Сбили!', 'Interrupted!'), '#f87171');
      close();
      return;
    }
    lastHp = Math.max(lastHp, player.hp);
  }

  // Клавиши, пока окно открыто: цифры — в код (а не в хотбар), Backspace, Enter, ESC и E — закрыть.
  // Остальные (WASD, перекат) — игре. true — клавиша съедена
  function handleKey(e) {
    if (!cur) return false;
    const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
    let used = true;
    if (m) press(Number(m[1]));
    else if (e.code === 'Backspace') erase();
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') submit();
    else if (e.code === 'Escape' || e.code === 'KeyE') close();
    else used = false;
    if (used) e.preventDefault();
    return used;
  }

  // Подсказка над сейфом
  function prompt(c) {
    const s = state(c);
    if (s.jam > 0) return L(`🔒 Замок заклинило — ${Math.ceil(s.jam / 60)} с`, `🔒 Lock jammed — ${Math.ceil(s.jam / 60)}s`);
    return L(`[E] Вскрыть: ${SAFE_TYPES[c.type].name[0]}`, `[E] Crack: ${SAFE_TYPES[c.type].name[1]}`);
  }

  function digitCell(d, lamp, hint) {
    const cell = document.createElement('div');
    cell.className = 'safe-digit' + (hint ? ' hint' : '');
    cell.textContent = d === undefined || d === null ? '' : d;
    const l = document.createElement('i');
    l.className = 'safe-lamp ' + (lamp || 'none');
    const wrap = document.createElement('div');
    wrap.className = 'safe-slot';
    wrap.append(cell, l);
    return wrap;
  }

  function render() {
    if (!cur) return;
    const def = SAFE_TYPES[cur.type];
    const s = state(cur);
    $('safe-title').textContent = L(def.name[0], def.name[1]);
    $('safe-l-green').textContent = L('на месте', 'right place');
    $('safe-l-yellow').textContent = L('есть, не тут', 'wrong place');
    $('safe-l-off').textContent = L('нет', 'none');
    $('safe-attempts').textContent = L(`Попыток осталось: ${def.attempts - s.guesses.length}`,
      `Attempts left: ${def.attempts - s.guesses.length}`);
    const hintEl = $('safe-hint');
    if (s.hint !== null && s.code) {
      hintEl.style.display = 'block';
      hintEl.textContent = L(`🩺 Стетоскоп: ${s.hint + 1}-я цифра — ${s.code[s.hint]}`,
        `🩺 Stethoscope: digit ${s.hint + 1} is ${s.code[s.hint]}`);
    } else {
      hintEl.style.display = 'none';
    }
    const rows = $('safe-rows');
    rows.innerHTML = '';
    s.guesses.forEach(g => {
      const row = document.createElement('div');
      row.className = 'safe-row';
      g.digits.forEach((d, i) => row.append(digitCell(d, g.lamps[i])));
      rows.append(row);
    });
    const now = document.createElement('div');
    now.className = 'safe-row current';
    for (let i = 0; i < def.digits; i++) now.append(digitCell(input[i], null, false));
    rows.append(now);
    rows.scrollTop = rows.scrollHeight;
    $('safe-ok').disabled = input.length < def.digits;
  }

  // Лимб: цифры 0–9, стереть, ввести
  function buildKeypad() {
    const pad = $('safe-keypad');
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(d => {
      const b = document.createElement('button');
      b.className = 'safe-key';
      b.textContent = d;
      b.addEventListener('click', () => press(d));
      pad.append(b);
    });
    $('safe-erase').addEventListener('click', erase);
    $('safe-ok').addEventListener('click', submit);
    $('safe-close').addEventListener('click', close);
    // Клики по окну не стреляют и не машут битой; кнопки не забирают фокус, иначе Enter и пробел
    // «нажимали» бы последнюю кнопку ещё раз
    ['mousedown', 'mouseup', 'click'].forEach(ev => $('safe-panel').addEventListener(ev, e => {
      e.stopPropagation();
      if (ev === 'mousedown') e.preventDefault();
    }));
  }
  buildKeypad();

  return { isSafe, isOpen, open, close, refresh, update, handleKey, prompt, SAFE_TYPES };
})();
