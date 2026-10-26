// Столовая Лены (docs/LEVEL2_PROMZONA.md, раздел 7, «Столовая»): Лена готовит из жабьих трофеев снадобья и бустеры,
// готовое ложится в инвентарь как расходник (player.items) и ставится в ячейки хотбара 1–3 (game.js consumableSlots).
// Окно — тема «Столовая» в разговоре с Леной, когда сдан «Лабораторный журнал» (Quests.flag('canteen')).
// Пока окно открыто, игра стоит (gameState 'CANTEEN'), ESC закрывает (src/menu.js).
//   - DISHES: из чего (cost — ресурсы, items — расходники), что даёт. Часть рецептов открывают квесты Лены:
//     «Наваристый бульон» (recipesBroth: похлёбка, настойка), «Проба шлама» (recipeOintment: мазь).
//   - Действие блюда — use (из useItem в game.js); то, что длится, — player.buffs, счёт — update.
//     Капли и борщ прибавляют к critChance и maxHp на время: в сохранение идут без надбавки (bonus), а таймеры —
//     в saveState; при загрузке надбавка возвращается.
// Скрипты обычные, без модулей: player, canAffordCost, payCost, formatCostHTML, RES_DISPLAY и прочее — из game.js.
window.Canteen = (function () {
  const $ = id => document.getElementById(id);
  const L = (r, e) => (currentLang === 'ru' ? r : e);
  const T = pair => L(pair[0], pair[1]);

  const DISHES = [
    { id: 'soup', name: ['Похлёбка из лягушачьих лапок', 'Frog-leg soup'], short: ['Похлёбка', 'Soup'],
      desc: ['Выносливость сразу полная, 20 с перекаты и удары её не тратят', 'Full stamina at once; for 20s rolls and swings cost none'],
      cost: { toad_leg: 2 }, items: { stew: 1 }, recipe: 'recipesBroth' },
    { id: 'tincture', name: ['Настойка на лягушачьей печени', 'Toad-liver tincture'], short: ['Настойка', 'Tincture'],
      desc: ['Урон как у водки, но 20 с и рука твёрдая — без разброса', 'Damage like vodka, but for 20s and with a steady hand — no spread'],
      cost: { toad_liver: 1, tech_spirit: 1 }, recipe: 'recipesBroth' },
    { id: 'jelly', name: ['Студень из лапок', 'Frog-leg aspic'], short: ['Студень', 'Aspic'],
      desc: ['Лечит 80 здоровья за 4 с (бинт — 45 за 3 с)', 'Heals 80 HP over 4s (a bandage: 45 over 3s)'],
      cost: { toad_leg: 3, bottles: 2 } },
    { id: 'compress', name: ['Спиртовой компресс', 'Spirit compress'], short: ['Компресс', 'Compress'],
      desc: ['Лечит как бинт, снимает оглушение, 10 с шлам не жжёт', 'Heals like a bandage, clears stun, sludge doesn\'t burn for 10s'],
      cost: { tech_spirit: 1 }, items: { bandage: 1 } },
    { id: 'drops', name: ['Капли из жабьего глаза', 'Toad-eye drops'], short: ['Капли', 'Drops'],
      desc: ['30 с: +20% к шансу крита', '30s: +20% critical chance'],
      cost: { toad_eye: 2, tech_spirit: 1 } },
    { id: 'ointment', name: ['Мазь из шлама', 'Sludge ointment'], short: ['Мазь', 'Ointment'],
      desc: ['3 мин шлам не жжёт и не замедляет', 'For 3 min sludge neither burns nor slows you'],
      cost: { toad_liver: 1, tech_spirit: 1 }, recipe: 'recipeOintment' },
    { id: 'borscht', name: ['Борщ «на вылазку»', 'Borscht "for the road"'], short: ['Борщ', 'Borscht'],
      desc: ['3 мин: +30 к макс. здоровью (новая тарелка только обновляет время)', '3 min: +30 max HP (a new bowl only refreshes the time)'],
      cost: { toad_leg: 3, toad_liver: 2, tech_spirit: 1 }, items: { stew: 3 } }
  ];
  const byId = {};
  DISHES.forEach(d => { byId[d.id] = d; });
  const ICON = id => `assets/sprites/dishes/${id}.png?v=1`;
  const ITEM_IMG = { stew: 'assets/sprites/loot/loot_stew.png?v=1026', bandage: 'assets/sprites/loot/loot_bandage.png?v=1026' };

  const SEC = 60;
  const DUR = { soup: 20 * SEC, tincture: 20 * SEC, compress: 10 * SEC, drops: 30 * SEC, ointment: 180 * SEC, borscht: 180 * SEC };
  const DROPS_CRIT = 0.2, BORSCHT_HP = 30, JELLY_HEAL = 80, JELLY_FRAMES = 4 * SEC;

  const isDish = id => !!byId[id];
  const known = d => !d.recipe || !!(window.Quests && window.Quests.flag(d.recipe));
  const isOpen = () => gameState === 'CANTEEN';
  const buffs = () => player.buffs || (player.buffs = {});
  const active = k => (buffs()[k] || 0) > 0;

  // --- Сохранение: таймеры баффов; критический шанс и здоровье игрок сохраняет без надбавки (bonus) ---
  function bonus() {
    return { crit: active('drops') ? DROPS_CRIT : 0, hp: active('borscht') ? BORSCHT_HP : 0 };
  }
  function saveState() {
    return { buffs: Object.assign({}, buffs()) };
  }
  function loadState(v) {
    player.buffs = {};
    const b = v && v.buffs ? v.buffs : {};
    Object.keys(DUR).forEach(k => {
      const t = Math.floor(Number(b[k]) || 0);
      if (t > 0) player.buffs[k] = Math.min(t, DUR[k]);
    });
    // Отдых в логове: «Выспался», «Согрелся» (src/basement.js) — тоже здесь, счёт тот же
    if (window.Basement) Object.keys(window.Basement.BUFF_NAMES).forEach(k => {
      const t = Math.floor(Number(b[k]) || 0);
      if (t > 0) player.buffs[k] = Math.min(t, window.Basement.BUFF_MAX);
    });
    if (active('drops')) player.critChance += DROPS_CRIT;
    if (active('borscht')) player.maxHp += BORSCHT_HP;
  }

  // --- Действие блюда (game.js useItem уже списал штуку и поставил общую задержку) ---
  function use(id) {
    const b = buffs();
    const say = (txt, col) => addFloatingText(player.x, player.y - 34, txt, col);
    if (id === 'soup') {
      player.stamina = player.maxStamina;
      b.soup = DUR.soup;
      say(L('ВЫНОСЛИВОСТЬ НЕ ТРАТИТСЯ 20 С', 'NO STAMINA COST FOR 20s'), '#38bdf8');
      createParticles(player.x, player.y, '#38bdf8', 12);
    } else if (id === 'tincture') {
      player.isDrunk = true;
      player.drunkTimer = Math.max(player.drunkTimer || 0, DUR.tincture);
      b.tincture = DUR.tincture;
      say(L('НАСТОЙКА: УРОН, РУКА ТВЁРДАЯ', 'TINCTURE: DAMAGE, STEADY HAND'), '#f59e0b');
      createParticles(player.x, player.y, '#b45309', 12);
    } else if (id === 'jelly') {
      player.healLeft += JELLY_HEAL;
      player.healRate = Math.max(player.healRate || 0, JELLY_HEAL / JELLY_FRAMES);
      say(L(`+${JELLY_HEAL} HP за 4 с`, `+${JELLY_HEAL} HP over 4s`), '#22c55e');
      createParticles(player.x, player.y, '#86efac', 12);
    } else if (id === 'compress') {
      player.healLeft += BANDAGE_HEAL;
      player.stunTimer = 0;
      player.dazeTimer = 0;
      b.compress = DUR.compress;
      say(L(`+${BANDAGE_HEAL} HP, ОГЛУШЕНИЕ СНЯТО`, `+${BANDAGE_HEAL} HP, STUN CLEARED`), '#22c55e');
      createParticles(player.x, player.y, '#e2e8f0', 10);
    } else if (id === 'drops') {
      if (!active('drops')) player.critChance += DROPS_CRIT;
      b.drops = DUR.drops;
      say(L('+20% КРИТ НА 30 С', '+20% CRIT FOR 30s'), '#fde047');
      createParticles(player.x, player.y - 30, '#fde047', 10);
    } else if (id === 'ointment') {
      b.ointment = DUR.ointment;
      say(L('ШЛАМ НЕ ЖЖЁТ 3 МИН', 'SLUDGE-PROOF FOR 3 MIN'), '#a3e635');
      createParticles(player.x, player.y, '#a3e635', 12);
    } else if (id === 'borscht') {
      // Не копится: новая тарелка только обновляет время
      if (!active('borscht')) {
        player.maxHp += BORSCHT_HP;
        player.hp = Math.min(player.maxHp, player.hp + BORSCHT_HP);
      }
      b.borscht = DUR.borscht;
      say(L(`+${BORSCHT_HP} К МАКС. ЗДОРОВЬЮ НА 3 МИН`, `+${BORSCHT_HP} MAX HP FOR 3 MIN`), '#ef4444');
      createParticles(player.x, player.y, '#ef4444', 14);
    }
  }

  // --- Каждый кадр (game.js update): баффы идут, кончаются — надбавки снимаются ---
  function update() {
    const b = buffs();
    for (const k in b) {
      if (!(b[k] > 0)) continue;
      if (--b[k] > 0) continue;
      delete b[k];
      if (k === 'drops') player.critChance = Math.max(0, player.critChance - DROPS_CRIT);
      if (k === 'borscht') {
        player.maxHp -= BORSCHT_HP;
        player.hp = Math.min(player.hp, player.maxHp);
      }
      const d = byId[k];
      const nm = d ? T(d.short) : window.Basement && window.Basement.BUFF_NAMES[k] ? T(window.Basement.BUFF_NAMES[k]) : '';
      if (nm) addFloatingText(player.x, player.y - 46, L(`${nm} — всё`, `${nm} wore off`), '#94a3b8');
      updateHUD(true);
    }
    // Похлёбка: выносливость не тратится — держится полной
    if (b.soup > 0) player.stamina = player.maxStamina;
  }

  // Шлам не жжёт и не замедляет (game.js: жжение и скорость в био-луже)
  const sludgeProof = () => active('ointment') || active('compress');
  // Настойка: рука твёрдая (game.js drunkAim)
  const steady = () => active('tincture');

  // --- Окно ---
  function open() {
    if (gameState !== 'PLAYING' && gameState !== 'DIALOG') return;
    if (window.Dialog && window.Dialog.isOpen()) window.Dialog.close();
    gameState = 'CANTEEN';
    for (const k in keys) keys[k] = false;
    mouseDown = false;
    render();
    $('canteen-modal').style.display = 'flex';
  }

  function close() {
    if (!isOpen()) return;
    $('canteen-modal').style.display = 'none';
    gameState = 'PLAYING';
    if (window.Menu) window.Menu.requestSave();
  }

  // Хватает ли ресурсов и расходников (тушёнка, бинт)
  const affordable = d => canAffordCost(d.cost) && Object.keys(d.items || {}).every(k => (player.items[k] || 0) >= d.items[k]);

  function costHTML(d) {
    const items = Object.keys(d.items || {}).map(k => `<span><img class="inline-res-icon" src="${ITEM_IMG[k]}">${d.items[k]}</span>`);
    return [...items, formatCostHTML(d.cost)].join(' ');
  }

  function render() {
    if (player !== localPlayer) return; // блюдо товарища по сети — окно не наше
    $('cn-title').textContent = L('СТОЛОВАЯ ЛЕНЫ', 'LENA\'S CANTEEN');
    $('cn-sub').textContent = L('Лена варит из жабьих трофеев: снадобья и бустеры. Готовое — в инвентарь; в ячейку хотбара 1–3 — кнопкой у блюда или в окне инвентаря (I).',
      'Lena cooks toad trophies into remedies and boosters. They go to your inventory; put them into hotbar slots 1–3 with the buttons on the dish or in the inventory window (I).');
    $('cn-close').textContent = L('ЗАКРЫТЬ [ESC]', 'CLOSE [ESC]');
    renderWallet();
    const box = $('cn-dishes');
    box.innerHTML = '';
    DISHES.forEach(d => {
      const c = document.createElement('div');
      const open = known(d);
      c.className = `shop-card ${open ? '' : 'locked'}`;
      const left = document.createElement('div');
      left.className = 'shop-card-left';
      left.innerHTML = '<img class="shop-card-img" alt=""><div><div class="shop-card-title"></div><div class="shop-card-desc"></div></div>';
      left.querySelector('img').src = ICON(d.id);
      left.querySelector('.shop-card-title').textContent = `${T(d.name)} (${L('у тебя', 'have')} ${player.items[d.id] || 0})`;
      left.querySelector('.shop-card-desc').textContent = open ? T(d.desc)
        : L('Рецепт — в журнале проб, Лена ещё не разобрала. Спроси у неё работу.', 'The recipe is in the sample log, Lena hasn\'t worked it out yet. Ask her for work.');
      if (open) left.querySelector('div').append(slotPickerEl(d.id, render));
      const b = document.createElement('button');
      b.className = 'shop-buy-btn';
      if (open) {
        b.innerHTML = costHTML(d);
        b.disabled = !affordable(d);
        b.onclick = () => cook(d);
      } else {
        b.textContent = L('НЕТ РЕЦЕПТА', 'NO RECIPE');
        b.disabled = true;
      }
      c.append(left, b);
      box.append(c);
    });
  }

  function renderWallet() {
    const box = $('cn-wallet');
    box.innerHTML = '';
    const cell = (img, n, color) => {
      const it = document.createElement('div');
      it.className = 'resource-item';
      it.innerHTML = '<img class="res-icon" alt=""><span></span>';
      it.querySelector('img').src = img;
      it.querySelector('span').textContent = n;
      if (color) it.querySelector('span').style.color = color;
      box.append(it);
    };
    ['bottles', 'toad_leg', 'toad_liver', 'toad_eye', 'tech_spirit'].forEach(k => cell(RES_DISPLAY[k].img, player.resources[k], RES_DISPLAY[k].color));
    ['stew', 'bandage'].forEach(k => cell(ITEM_IMG[k], player.items[k] || 0));
  }

  // Сварить — и сетевым товарищам (netAction в game.js)
  const cook = netAction('canteen.cook', cookRaw, ([d]) => [d.id], ([id]) => [byId[id]]);
  function cookRaw(d) {
    if (!d || !known(d) || !affordable(d)) return;
    payCost(d.cost);
    Object.keys(d.items || {}).forEach(k => { player.items[k] -= d.items[k]; });
    player.items[d.id] = (player.items[d.id] || 0) + 1;
    SoundFX.reloadEnd('makarov');
    addFloatingText(player.x, player.y - 40, `+1 ${T(d.short)}`, '#86efac');
    updateHUD(true);
    if (window.Menu) window.Menu.requestSave();
    render();
  }

  // Подпись и картинка для хотбара и инвентаря
  function info(id) {
    const d = byId[id];
    return d ? { img: ICON(id), name: T(d.short), title: `${T(d.name)}: ${T(d.desc)}` } : null;
  }

  $('cn-close').addEventListener('click', close);
  ['mousedown', 'mouseup'].forEach(ev => $('canteen-modal').addEventListener(ev, e => e.stopPropagation()));

  return { DISHES, isDish, use, update, open, close, isOpen, refresh: () => { if (isOpen()) render(); }, saveState, loadState, bonus, sludgeProof, steady, info };
})();
