// Логово Василия — подвал под любым жилым домом города (docs/LEVEL2_PROMZONA.md, раздел 7, «Подвал Василия»).
// Отдельная карта-локация 'basement' (game.js currentLocation): комната — картинка assets/sprites/basement/room.webp,
// отрендеренная в Blender той же камерой, что модели (tools/build_basement_room_blender.py); обстановка — модели
// basement_* (src/three_props.js CITY_MODELS) на своих местах, пока не построено — куча хлама.
//   - Вход: E у двери подвала жилого дома (дверь на фасаде у каждого). Первый раз Василий занимает этот подвал,
//     дальше вход — только там. Выход — E у лестницы. В коопе логово одно на всех и входят вместе: переход —
//     когда все живые рядом с дверью (tryTravel), иначе «Ждём остальных».
//   - Обстановка — FURNITURE: уровни, цена, что даёт. E у вещи — окно «Обустройство логова» (gameState 'BASEMENT'):
//     построить или улучшить, забрать водку и тушёнку, отдохнуть.
//   - Самогонный аппарат и стеллаж с закатками копят запас, пока идёт игра (update), до потолка по уровню.
//   - Диван и буржуйка: «Отдохнуть» — полное здоровье и выносливость, «Выспался» (урон) и «Согрелся»
//     (восстановление выносливости) — баффы player.buffs, их счёт ведёт src/canteen.js; раз за заход в подвал.
//   - Ковёр (крит) и спортуголок (макс. выносливость) действуют всегда, у каждого игрока (updatePlayer):
//     в сохранение статы идут без надбавки (applied), после загрузки она возвращается сама.
//   - Радио «ВЭФ»: на миникарте Промзоны — сейфы, со 2-го уровня — и тайники с предметами квестов (places).
//   - Сохранение — basement в корне забега; в коопе — общий мир (Net WORLD: netGet/netSet), действия окна — netAction.
// Скрипты обычные, без модулей: player, players, buildings, containers, payCost и прочее — из game.js.
window.Basement = (function () {
  const $ = id => document.getElementById(id);
  const L = (r, e) => (currentLang === 'ru' ? r : e);
  const T = pair => L(pair[0], pair[1]);

  // --- Комната: метры пола -> пиксели мира (assets/sprites/basement/room.json) ---
  const ROOM = { ppm: 42, w: 1012, h: 525, x0: 506.1, y0: 492.66, sin: 0.4695, W: 22, D: 18 };
  const COS = Math.sqrt(1 - ROOM.sin * ROOM.sin);
  const ORIGIN = { x: 2494, y: 2738 };             // левый верхний угол картинки: комната — посреди карты
  // X — вправо от середины, Y — вглубь от переднего края пола, Z — вверх (м)
  const at = (X, Y, Z = 0) => ({ x: ORIGIN.x + ROOM.x0 + X * ROOM.ppm, y: ORIGIN.y + ROOM.y0 - (Y * ROOM.sin + Z * COS) * ROOM.ppm });
  const roomImg = new Image();
  roomImg.src = 'assets/sprites/basement/room.webp?v=1';
  const carpetImg = new Image();
  carpetImg.src = 'assets/sprites/basement/carpet.webp?v=1';
  const STAIRS = { X: -8.0, W: 2.2, Y0: 15.3 };   // лестница к двери: внизу — выход
  const BULB = { X: 0, Y: 8.0, Z: 2.38 };

  // --- Обстановка ---
  // Цены ступенями (docs/BALANCE.md, «Уровень 2»): 1-й уровень — стеклотара и чермет, 2-й — лут Промзоны
  // (цветмет, детали, техспирт, плазма), верхний — чертёж и квако-ядра. Чертежей в Промзоне ~6, а верхних
  // уровней у подвала и мастерской — 13: часть ждёт следующих уровней
  // model — модель, X/Y — середина пятна (у стены Y считается по глубине модели), size — [длина, глубина] м
  const MIN = 3600;  // кадров в минуте
  const FURNITURE = [
    { id: 'shelf', model: 'basement_shelf', X: -5.3, wall: true, size: [1.3, 0.5],
      name: ['Стеллаж с закатками', 'Pantry shelf'],
      levels: [
        { cost: { bottles: 25, scrap: 15 }, text: ['Тушёнка: банка за 4 мин, в запасе до 2', 'Stew: a can per 4 min, stores up to 2'] },
        { cost: { bottles: 50, nonferrous: 6, toad_leg: 6 }, text: ['Тушёнка: в запасе до 4', 'Stew: stores up to 4'] },
        { cost: { bottles: 70, blueprint: 1, alien_core: 1 }, text: ['Тушёнка: банка за 3 мин, в запасе до 6', 'Stew: a can per 3 min, stores up to 6'] }
      ] },
    { id: 'still', model: 'basement_still', X: -2.4, wall: true, size: [1.4, 0.6],
      name: ['Самогонный аппарат', 'Moonshine still'],
      levels: [
        { cost: { scrap: 25, bottles: 20, tech_spirit: 1 }, text: ['Водка: бутылка за 4 мин, в запасе до 2', 'Vodka: a bottle per 4 min, stores up to 2'] },
        { cost: { nonferrous: 12, tech_spirit: 3, mil_parts: 3 }, text: ['Водка: в запасе до 4 (медный змеевик)', 'Vodka: stores up to 4 (copper coil)'] },
        { cost: { nonferrous: 15, tech_spirit: 3, blueprint: 1, alien_core: 2 }, text: ['Водка: бутылка за 3 мин, в запасе до 6', 'Vodka: a bottle per 3 min, stores up to 6'] }
      ] },
    { id: 'stove', model: 'basement_stove', X: 1.0, wall: true, size: [1.4, 0.9],
      name: ['Буржуйка', 'Potbelly stove'],
      levels: [
        { cost: { scrap: 45, bottles: 15 }, text: ['Отдых: «Согрелся» — выносливость восстанавливается вдвое быстрее 3 мин', 'Rest: "Warmed up" — stamina regenerates twice as fast for 3 min'] },
        { cost: { scrap: 70, nonferrous: 8, blueprint: 1 }, text: ['Отдых: баффы отдыха действуют 5 мин', 'Rest: rest buffs last 5 min'] }
      ] },
    { id: 'sofa', model: 'basement_sofa', X: 5.0, wall: true, size: [2.0, 1.4],
      name: ['Диван', 'Sofa'],
      levels: [
        { cost: { bottles: 40, scrap: 15 }, text: ['«Отдохнуть»: полное здоровье и выносливость (раз за заход)', '"Rest": full health and stamina (once per visit)'] },
        { cost: { bottles: 80, toad_eye: 4, blueprint: 1 }, text: ['Отдых: «Выспался» — урон +15% на 3 мин', 'Rest: "Well rested" — +15% damage for 3 min'] }
      ] },
    { id: 'carpet', carpet: true, X: 5.0,
      name: ['Ковёр на стене', 'Wall carpet'],
      levels: [
        { cost: { bottles: 60, scrap: 10 }, text: ['Уют: шанс крита +3%', 'Cosiness: +3% critical chance'] },
        { cost: { bottles: 90, alien_core: 3, blueprint: 1 }, text: ['Уют: шанс крита +6%', 'Cosiness: +6% critical chance'] }
      ] },
    { id: 'radio', model: 'basement_radio', X: 8.0, wall: true, size: [0.6, 0.5],
      name: ['Радиоприёмник «ВЭФ»', 'VEF radio'],
      levels: [
        { cost: { nonferrous: 10, bottles: 25, scrap: 15 }, text: ['Ловит переговоры жаб: на миникарте Промзоны — ближайший невскрытый сейф', 'Picks up toad chatter: the nearest unopened safe on the Promzona minimap'] },
        { cost: { nonferrous: 15, plasma_cell: 4, alien_core: 2, blueprint: 1 }, text: ['На миникарте — все невскрытые сейфы и тайники с предметами квестов', 'The minimap shows every unopened safe and quest stash'] }
      ] },
    { id: 'gym', model: 'basement_gym', X: -6.5, Y: 6.0, size: [1.8, 1.4],
      name: ['Спортуголок', 'Gym corner'],
      levels: [
        { cost: { scrap: 40 }, text: ['Гиря: макс. выносливость +10', 'Kettlebell: +10 max stamina'] },
        { cost: { scrap: 70, mil_parts: 4 }, text: ['Макс. выносливость +20', '+20 max stamina'] },
        { cost: { scrap: 100, mil_parts: 6, alien_core: 2, blueprint: 1 }, text: ['Макс. выносливость +30', '+30 max stamina'] }
      ] }
  ];
  const byId = {};
  FURNITURE.forEach(f => { byId[f.id] = f; });
  const JUNK = { model: 'basement_junk', size: [1.2, 0.9] };
  const PROD = {
    shelf: { item: 'stew', cap: [0, 2, 4, 6], period: [0, 4, 4, 3] },
    still: { item: 'vodka', cap: [0, 2, 4, 6], period: [0, 4, 4, 3] }
  };
  const GYM_STAMINA = [0, 10, 20, 30];
  const CARPET_CRIT = [0, 0.03, 0.06];
  const REST_DAMAGE = 1.15;      // «Выспался» (game.js weaponDmg)
  const REST_STAMINA = 2;        // «Согрелся» (game.js: восстановление выносливости)
  const BUFF_NAMES = { rested: ['Выспался', 'Well rested'], warm: ['Согрелся', 'Warmed up'] };
  const BUFF_MAX = 5 * MIN;      // для src/canteen.js loadState: самое долгое, что может быть

  // --- Состояние (общее для всех игроков) ---
  let state = fresh();
  function fresh() {
    return { house: null, lv: {}, stock: { shelf: 0, still: 0 }, prod: { shelf: 0, still: 0 } };
  }
  const lv = id => state.lv[id] || 0;
  const maxLv = f => f.levels.length;

  function saveState() {
    return JSON.parse(JSON.stringify(state));
  }
  function loadState(v) {
    state = fresh();
    if (!v || typeof v !== 'object') return;
    if (Number.isInteger(v.house) && v.house >= 0) state.house = v.house;
    FURNITURE.forEach(f => {
      const n = Math.floor(Number(v.lv && v.lv[f.id]) || 0);
      if (n > 0) state.lv[f.id] = Math.min(n, maxLv(f));
    });
    Object.keys(PROD).forEach(k => {
      state.stock[k] = Math.max(0, Math.min(PROD[k].cap[lv(k)], Math.floor(Number(v.stock && v.stock[k]) || 0)));
      state.prod[k] = Math.max(0, Math.floor(Number(v.prod && v.prod[k]) || 0));
    });
  }
  // Кооп: клиенту — всё, кроме счётчиков производства (меняются каждый кадр)
  function netGet() {
    return { house: state.house, lv: state.lv, stock: state.stock };
  }
  function netSet(v) {
    state.house = v.house;
    state.lv = v.lv || {};
    state.stock = v.stock || { shelf: 0, still: 0 };
    if (isOpen()) render();
  }

  // --- Двери подвалов на фасадах жилых домов (город) ---
  // Сдвиг от левого края дома, в единицах HOUSE_BASE: между кустом и подъездом
  const DOOR_OFF = { khrushchevka: 45, brezhnevka: 66 };
  let doorCache = null, doorKey = null;
  function doors() {
    if (currentLocation !== 'city') return [];
    if (doorKey === buildings) return doorCache;
    doorKey = buildings;
    doorCache = buildings.filter(b => b.type === 'panel').map((b, i) => {
      const kind = houseKind(b);
      return { i, x: b.x + (DOOR_OFF[kind] || 45) * houseScale(b), y: b.y + b.h };
    });
    return doorCache;
  }
  const myDoor = () => (state.house === null ? null : doors()[state.house] || null);
  const exitPoint = () => at(STAIRS.X, STAIRS.Y0 - 0.5);

  // --- Предметы в комнате: где стоят и чем нарисованы ---
  function spot(f) {
    const built = lv(f.id) > 0;
    const m = built ? { model: f.model, size: f.size } : JUNK;
    const d = m.size[1];
    const Y = f.wall ? ROOM.D - d / 2 - 0.12 : f.Y;
    const c = at(f.X, Y);
    return { f, built, model: m.model, x: c.x, y: c.y, w: m.size[0] * ROOM.ppm, depth: d * ROOM.ppm * ROOM.sin,
      front: at(f.X, Y - d / 2 - 0.35) };
  }
  const spots = () => FURNITURE.filter(f => !f.carpet).map(spot);

  // --- Мир: стены комнаты и препятствия (game.js generateWorld / buildObstacles) ---
  function onWorld() {
    if (currentLocation !== 'basement') return;
    const l = at(-ROOM.W / 2, 0).x, r = at(ROOM.W / 2, 0).x, back = at(0, ROOM.D).y, front = at(0, 0).y;
    const big = 400;
    [
      { x: l - big, y: back - big, w: r - l + 2 * big, h: big + 4 },
      { x: l - big, y: front - 26, w: r - l + 2 * big, h: big },
      { x: l - big, y: back - big, w: big + 4, h: front - back + 2 * big },
      { x: r - 4, y: back - big, w: big, h: front - back + 2 * big }
    ].forEach(rc => buildings.push(Object.assign({ type: 'basement_wall' }, rc)));
    // Новый заход — отдохнуть можно снова
    players.forEach(p => { p.basementRested = false; });
  }
  function addObstacles() {
    if (currentLocation !== 'basement') return;
    spots().forEach(s => addObstacle({ x: s.x, y: s.y, rx: s.w * 0.5, ry: Math.max(8, s.depth * 0.6), rot: 0 }));
    const s0 = at(STAIRS.X - STAIRS.W / 2, ROOM.D), s1 = at(STAIRS.X + STAIRS.W / 2, STAIRS.Y0);
    addObstacle({ rect: true, x1: s0.x, y1: s0.y, x2: s1.x, y2: s1.y });
    [-4, 4].forEach(X => { const c = at(X, 9); addObstacle({ x: c.x, y: c.y, rx: 12, ry: 7, rot: 0 }); });
  }

  // Куда встать после перехода: в подвал — у лестницы, в город — у своей двери
  function placeInside() {
    const e = at(STAIRS.X + 1.2, STAIRS.Y0 - 1.0);
    players.forEach((p, i) => {
      p.x = e.x + (i - (players.length - 1) / 2) * 44;
      p.y = e.y - FOOT_DY.player + (i % 2) * 14;
      p.isRolling = false;
    });
  }
  function placeAtDoor() {
    const d = myDoor();
    if (!d) return placePlayerAtBreach();
    players.forEach((p, i) => {
      p.x = d.x + (i - (players.length - 1) / 2) * 40;
      p.y = d.y + 52 - FOOT_DY.player + (i % 2) * 14;
      p.isRolling = false;
    });
  }

  // --- Что рядом с Василием (game.js: nearbyInteractable) ---
  const near = (pt, r) => Math.hypot(player.x - pt.x, player.y + FOOT_DY.player - pt.y) < r;
  // Логово — часть Новохмуринска после спасения (docs/LEVEL2_PROMZONA.md, раздел 7): двери подвалов появляются,
  // когда выжившие ушли в город через пролом (оборона пройдена), вместе с постом, мастерской и столовой.
  // Экономика города на обстановку не рассчитана — её первые уровни идут из запаса Промзоны (docs/BALANCE.md)
  function unlocked() {
    return !!(window.Defense && window.Defense.stage === 'done');
  }

  function nearest() {
    if (currentLocation === 'city') {
      if (!unlocked()) return null;
      if (state.house !== null) {
        const d = myDoor();
        return d && near({ x: d.x, y: d.y + 14 }, 58) ? { type: 'basement_door', door: d.i } : null;
      }
      const d = doors().find(dd => near({ x: dd.x, y: dd.y + 14 }, 58));
      return d ? { type: 'basement_door', door: d.i } : null;
    }
    if (currentLocation !== 'basement') return null;
    if (near(exitPoint(), 70)) return { type: 'basement_exit' };
    let best = null, bd = 80;
    spots().forEach(s => {
      const dd = Math.hypot(player.x - s.front.x, player.y + FOOT_DY.player - s.front.y);
      if (dd < bd) { bd = dd; best = s; }
    });
    return best ? { type: 'basement_item', id: best.f.id } : null;
  }
  function prompt(it) {
    if (it.type === 'basement_door') {
      return state.house === null ? L('[E] Занять подвал под логово', '[E] Make this basement your lair')
        : L('[E] Спуститься в логово', '[E] Go down to your lair');
    }
    if (it.type === 'basement_exit') return L('[E] Наверх, в Новохмуринск', '[E] Upstairs, to Novokhmurinsk');
    const f = byId[it.id];
    return lv(f.id) > 0 ? L(`[E] ${T(f.name)} — обустройство`, `[E] ${T(f.name)} — upgrades`)
      : L(`[E] Разобрать хлам: ${T(f.name)}`, `[E] Clear the junk: ${T(f.name)}`);
  }

  // Двери и выход — у хоста (как пролом), окно — у того, кто нажал
  function interact(it) {
    if (it.type === 'basement_door') {
      const d = doors()[it.door];
      if (!d) return;
      if (state.house === null) {
        state.house = d.i;
        showToast(L('ЛОГОВО', 'LAIR'), L('Подвал занят. Здесь будет логово Василия.', 'Basement taken. This is Vasiliy\'s lair now.'));
      }
      tryTravel('basement', { x: d.x, y: d.y + 14 });
    } else if (it.type === 'basement_exit') {
      tryTravel('city', exitPoint());
    } else if (it.type === 'basement_item') {
      open(it.id);
    }
  }

  // Кооп: переход, когда все живые рядом; иначе — сколько ещё ждать
  function tryTravel(target, pt) {
    const alive = players.filter(p => !p.dead && !p.left);
    const here = alive.filter(p => Math.hypot(p.x - pt.x, p.y + FOOT_DY.player - pt.y) < 170);
    if (here.length < alive.length) {
      addFloatingText(pt.x - 60, pt.y - 60, L(`Ждём остальных: ${here.length}/${alive.length}`, `Waiting for the others: ${here.length}/${alive.length}`), '#fbbf24');
      return;
    }
    travelTo(target);
  }

  // --- Каждый кадр ---
  // Мир (хост): самогонка и закатки копят запас, пока идёт игра
  function update() {
    Object.keys(PROD).forEach(k => {
      const n = lv(k), P = PROD[k];
      if (!n || state.stock[k] >= P.cap[n]) { state.prod[k] = 0; return; }
      if (++state.prod[k] < P.period[n] * MIN) return;
      state.prod[k] = 0;
      state.stock[k]++;
      if (currentLocation === 'basement') {
        const s = spot(byId[k]);
        addFloatingText(s.x - 30, s.y - 70, `+1 ${t(P.item)}`, '#fde68a');
      }
    });
  }
  // Игрок: надбавки ковра и спортуголка — разница с тем, что уже прибавлено (applied)
  function bonus() {
    return { crit: CARPET_CRIT[lv('carpet')], stamina: GYM_STAMINA[lv('gym')] };
  }
  function updatePlayer() {
    const b = bonus();
    const a = player.basementApplied || (player.basementApplied = { crit: 0, stamina: 0 });
    if (a.crit === b.crit && a.stamina === b.stamina) return;
    player.critChance += b.crit - a.crit;
    player.maxStamina += b.stamina - a.stamina;
    player.stamina = Math.min(player.stamina, player.maxStamina);
    player.basementApplied = { crit: b.crit, stamina: b.stamina };
  }
  // Сколько из статов игрока — от логова (src/menu.js: в сохранение без этого)
  const applied = p => p.basementApplied || { crit: 0, stamina: 0 };
  const restDamage = () => (player.buffs && player.buffs.rested > 0 ? REST_DAMAGE : 1);
  const restStamina = () => (player.buffs && player.buffs.warm > 0 ? REST_STAMINA : 1);

  // --- Действия окна (кооп: netAction — у клиента сразу, у хоста по-настоящему) ---
  const cost = f => (lv(f.id) < maxLv(f) ? f.levels[lv(f.id)].cost : null);
  const build = netAction('basement.build', id => {
    const f = byId[id];
    const c = f && cost(f);
    if (!c || !canAffordCost(c)) return;
    payCost(c);
    state.lv[id] = lv(id) + 1;
    if (currentLocation === 'basement') buildObstacles(); // хлам сменился вещью другого размера
    SoundFX.reload();
    const s = f.carpet ? at(f.X, ROOM.D - 1) : spot(f);
    addFloatingText(s.x - 50, s.y - 70, lv(id) === 1 ? L(`${T(f.name)} — готово!`, `${T(f.name)} — done!`)
      : L(`${T(f.name)}: уровень ${lv(id)}`, `${T(f.name)}: level ${lv(id)}`), '#86efac');
    createParticles(s.x, s.y - 20, '#d6d3d1', 18);
    updateHUD(true);
    if (window.Menu) window.Menu.requestSave();
    if (isOpen()) render();
  });
  const collect = netAction('basement.collect', id => {
    const n = state.stock[id] || 0;
    if (!n) return;
    const item = PROD[id].item;
    player.items[item] = (player.items[item] || 0) + n;
    state.stock[id] = 0;
    SoundFX.reloadEnd('makarov');
    addFloatingText(player.x - 30, player.y - 50, `+${n} ${t(item)}`, '#fde68a');
    updateHUD(true);
    if (window.Menu) window.Menu.requestSave();
    if (isOpen()) render();
  });
  const rest = netAction('basement.rest', () => {
    if (!lv('sofa') || player.basementRested) return;
    player.basementRested = true;
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.healLeft = 0;
    const dur = (lv('stove') >= 2 ? 5 : 3) * MIN;
    const b = player.buffs || (player.buffs = {});
    const got = [];
    if (lv('sofa') >= 2) { b.rested = dur; got.push(T(BUFF_NAMES.rested)); }
    if (lv('stove') >= 1) { b.warm = dur; got.push(T(BUFF_NAMES.warm)); }
    addFloatingText(player.x - 60, player.y - 56, L(gendered('Отдохнул{|а}'), 'Rested') + (got.length ? `: ${got.join(', ')}` : ''), '#86efac');
    createParticles(player.x, player.y - 10, '#bbf7d0', 14);
    updateHUD(true);
    if (window.Menu) window.Menu.requestSave();
    if (isOpen()) render();
  });

  // --- Окно «Обустройство логова» ---
  const isOpen = () => gameState === 'BASEMENT';
  let focusId = null;
  function open(id) {
    if (gameState !== 'PLAYING') return;
    focusId = id || null;
    gameState = 'BASEMENT';
    for (const k in keys) keys[k] = false;
    mouseDown = false;
    render();
    $('basement-modal').style.display = 'flex';
    const el = focusId && $(`bm-card-${focusId}`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function close() {
    if (!isOpen()) return;
    $('basement-modal').style.display = 'none';
    gameState = 'PLAYING';
    if (window.Menu) window.Menu.requestSave();
  }

  const thumbs = {};
  function thumb(f) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (f.carpet) {
      if (carpetImg.complete && carpetImg.naturalWidth) g.drawImage(carpetImg, 2, 14, 60, 34);
      return c;
    }
    const tp = window.threeProps;
    const fr = tp && tp.isLoaded[f.model] && tp.getFrameCanvas(f.model, 0);
    if (fr) g.drawImage(fr, 0, 0, 64, 64);
    return c;
  }

  function render() {
    $('bm-title').textContent = L('ЛОГОВО ВАСИЛИЯ', 'VASILIY\'S LAIR');
    $('bm-sub').textContent = L('Подвал обживается: каждая вещь — свои уровни. Запасы копятся, пока ты на вылазке; отдохнуть — раз за заход.',
      'Make the basement a home: every item has levels. Supplies pile up while you are out; rest once per visit.');
    $('bm-close').textContent = L('ЗАКРЫТЬ [ESC]', 'CLOSE [ESC]');
    renderWallet();
    const box = $('bm-list');
    box.innerHTML = '';
    FURNITURE.forEach(f => {
      const n = lv(f.id);
      const card = document.createElement('div');
      card.id = `bm-card-${f.id}`;
      card.className = `shop-card ${n ? 'owned' : ''} ${f.id === focusId ? 'bm-focus' : ''}`;
      const left = document.createElement('div');
      left.className = 'shop-card-left';
      left.append(thumbs[f.id] || (thumbs[f.id] = thumb(f)));
      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'shop-card-title';
      title.textContent = `${T(f.name)}  ${'●'.repeat(n)}${'○'.repeat(maxLv(f) - n)}`;
      const desc = document.createElement('div');
      desc.className = 'shop-card-desc';
      const now = n ? T(f.levels[n - 1].text) : L('Пока на этом месте — хлам.', 'For now there is only junk here.');
      const next = n < maxLv(f) ? L(`Дальше: ${T(f.levels[n].text)}`, `Next: ${T(f.levels[n].text)}`) : L('Лучше уже некуда.', 'It does not get any better.');
      desc.textContent = `${now} ${next}`;
      info.append(title, desc);
      left.append(info);
      const btns = document.createElement('div');
      btns.className = 'bm-btns';
      const c = cost(f);
      const up = document.createElement('button');
      up.className = 'shop-buy-btn';
      if (c) {
        up.innerHTML = `${n ? L('Улучшить', 'Upgrade') : L('Построить', 'Build')}: ${formatCostHTML(c)}`;
        up.disabled = !canAffordCost(c);
        up.onclick = () => build(f.id);
      } else {
        up.textContent = L('МАКС.', 'MAX');
        up.disabled = true;
      }
      btns.append(up);
      if (PROD[f.id] && n) {
        const k = state.stock[f.id] || 0, P = PROD[f.id];
        const b = document.createElement('button');
        b.className = 'shop-buy-btn bm-act';
        b.textContent = L(`Забрать: ${t(P.item)} ${k}/${P.cap[n]}`, `Take: ${t(P.item)} ${k}/${P.cap[n]}`);
        b.disabled = !k;
        b.onclick = () => collect(f.id);
        btns.append(b);
      }
      if (f.id === 'sofa' && n) {
        const b = document.createElement('button');
        b.className = 'shop-buy-btn bm-act';
        b.textContent = player.basementRested ? L(gendered('Уже отдохнул{|а}'), 'Already rested') : L('Отдохнуть', 'Rest');
        b.disabled = !!player.basementRested;
        b.onclick = () => rest();
        btns.append(b);
      }
      card.append(left, btns);
      box.append(card);
    });
  }

  function renderWallet() {
    const box = $('bm-wallet');
    box.innerHTML = '';
    ['bottles', 'scrap', 'nonferrous', 'blueprint', 'alien_core', 'tech_spirit', 'mil_parts', 'plasma_cell', 'toad_leg', 'toad_eye'].forEach(k => {
      const it = document.createElement('div');
      it.className = 'resource-item';
      it.innerHTML = '<img class="res-icon" alt=""><span></span>';
      it.querySelector('img').src = RES_DISPLAY[k].img;
      it.querySelector('span').textContent = player.resources[k] || 0;
      it.querySelector('span').style.color = RES_DISPLAY[k].color;
      box.append(it);
    });
  }

  // --- Отрисовка ---
  function modelFrame(model, cx, cy, w) {
    const tp = window.threeProps;
    const img = tp && tp.isLoaded[model] && tp.getFrameCanvas(model, 0);
    return img ? Object.assign(pzFrame(model, cx, cy, w), { img }) : null;
  }
  function shade(ctx, x, y, rx, ry) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Комната — вместо улиц (environment.js draw)
  function drawRoom(ctx) {
    ctx.fillStyle = '#020203';
    ctx.fillRect(ORIGIN.x - 2000, ORIGIN.y - 2000, ROOM.w + 4000, ROOM.h + 4000);
    if (roomImg.complete && roomImg.naturalWidth) ctx.drawImage(roomImg, ORIGIN.x, ORIGIN.y, ROOM.w, ROOM.h);
    // Ковёр — на стене над диваном
    if (lv('carpet') && carpetImg.complete && carpetImg.naturalWidth) {
      const f = byId.carpet, w = lv('carpet') >= 2 ? 2.8 : 2.3;
      const a = at(f.X - w / 2, ROOM.D, 2.45), b = at(f.X + w / 2, ROOM.D, 0.95);
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(carpetImg, a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.restore();
    }
  }

  // Обстановка вперемешку с фигурами: что выше Василия — до него, ниже — после (как src/settlers.js)
  function drawActors(ctx, front) {
    if (currentLocation !== 'basement') return;
    const py = player.y + FOOT_DY.player;
    spots().filter(s => (s.y + s.depth * 0.5 > py) === front).sort((a, b) => a.y - b.y).forEach(s => {
      const fr = modelFrame(s.model, s.x, s.y, s.w);
      if (!fr) return;
      shade(ctx, s.x, s.y + s.depth * 0.3, s.w * 0.55, Math.max(6, s.depth * 0.6));
      ctx.drawImage(fr.img, fr.x, fr.y, fr.w, fr.h);
      if (s.built && s.f.id === 'stove') drawFire(ctx, s);
    });
  }
  // Огонь в буржуйке: дверца светится и мигает
  function drawFire(ctx, s) {
    const now = performance.now() / 1000;
    const k = 0.75 + Math.sin(now * 11) * 0.12 + Math.sin(now * 6.3) * 0.1;
    const p = at(byId.stove.X, ROOM.D - 0.9 - 0.12 - 0.1, 0.38);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
    g.addColorStop(0, `rgba(255, 170, 60, ${0.75 * k})`);
    g.addColorStop(1, 'rgba(255, 120, 30, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - 26, p.y - 26, 52, 52);
    ctx.restore();
  }

  // Свет: темнота к углам, лампочка, отсвет буржуйки на полу (поверх всего, game.js render)
  function drawLight(ctx) {
    if (currentLocation !== 'basement') return;
    const now = performance.now() / 1000;
    const flick = 1 + Math.sin(now * 23) * 0.015 + (Math.random() < 0.01 ? -0.12 : 0);
    const c = at(BULB.X, BULB.Y);
    ctx.save();
    const g = ctx.createRadialGradient(c.x, c.y, 90 * flick, c.x, c.y, 640);
    g.addColorStop(0, 'rgba(3, 3, 8, 0)');
    g.addColorStop(1, 'rgba(3, 3, 8, 0.62)');
    ctx.fillStyle = g;
    ctx.fillRect(ORIGIN.x - 600, ORIGIN.y - 600, ROOM.w + 1200, ROOM.h + 1200);
    ctx.globalCompositeOperation = 'lighter';
    const b = at(BULB.X, BULB.Y, BULB.Z);
    const h = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 46);
    h.addColorStop(0, `rgba(255, 236, 180, ${0.55 * flick})`);
    h.addColorStop(1, 'rgba(255, 220, 150, 0)');
    ctx.fillStyle = h;
    ctx.fillRect(b.x - 46, b.y - 46, 92, 92);
    if (lv('stove')) {
      const k = 0.8 + Math.sin(now * 9) * 0.1 + Math.sin(now * 5.1) * 0.08;
      const p = at(byId.stove.X, ROOM.D - 1.6);
      const s = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 150);
      s.addColorStop(0, `rgba(255, 140, 50, ${0.22 * k})`);
      s.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = s;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 150, 150 * GROUND_SQUASH, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Двери подвалов на фасадах (город, после домов): у своей — лампа и надпись
  function drawDoors(ctx) {
    if (currentLocation !== 'city' || !unlocked()) return;
    const ds = doors();
    const vx0 = camera.x - 60, vx1 = camera.x + viewW + 60, vy0 = camera.y - 60, vy1 = camera.y + viewH + 60;
    ds.forEach(d => {
      if (d.x < vx0 || d.x > vx1 || d.y < vy0 || d.y > vy1) return;
      const mine = state.house === d.i;
      if (state.house !== null && !mine) return drawDoor(ctx, d, false, true);
      drawDoor(ctx, d, mine, false);
    });
  }
  function drawDoor(ctx, d, mine, locked) {
    const x = d.x, y = d.y;
    ctx.save();
    // Бетонный проём, ступени вниз и железная дверь
    ctx.fillStyle = '#6b6a66';
    ctx.fillRect(x - 17, y - 40, 34, 40);
    ctx.fillStyle = '#26292d';
    ctx.fillRect(x - 13, y - 36, 26, 36);
    ctx.fillStyle = locked ? '#3a4047' : '#4a5560';
    ctx.fillRect(x - 11, y - 34, 22, 32);
    ctx.strokeStyle = '#1a1d21';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 11, y - 34, 22, 32);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(x + 6, y - 19, 3, 5);
    ctx.fillStyle = '#5a5955';
    ctx.fillRect(x - 17, y - 2, 34, 6);
    if (mine) {
      // Надпись краской и лампа над дверью
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444';
      ctx.fillText(L('ВАСЯ', 'VASYA'), x, y - 23);
      const now = performance.now() / 1000;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y - 44, 0, x, y - 44, 60);
      g.addColorStop(0, `rgba(255, 214, 140, ${0.5 + Math.sin(now * 3) * 0.04})`);
      g.addColorStop(1, 'rgba(255, 200, 120, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 60, y - 104, 120, 120);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(x, y - 44, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Миникарта (src/minimap.js): своя дверь, выход, радио ---
  function places() {
    const out = [];
    if (currentLocation === 'city') {
      const d = unlocked() ? myDoor() : null;
      if (d) out.push({ x: d.x, y: d.y, kind: 'lair' });
    } else if (currentLocation === 'basement') {
      const e = exitPoint();
      out.push({ x: e.x, y: e.y, kind: 'exit' });
    } else if (currentLocation === 'promzona' && lv('radio')) {
      const safes = containers.filter(c => window.Safes && window.Safes.isSafe(c) && !c.searched);
      if (lv('radio') >= 2) {
        safes.forEach(c => out.push({ x: c.x, y: c.y, kind: 'radio' }));
        if (window.Quests && window.Quests.radioTargets) window.Quests.radioTargets().forEach(c => out.push({ x: c.x, y: c.y, kind: 'radio' }));
      } else if (safes.length) {
        const me = localPlayer;
        const c = safes.reduce((a, b) => (Math.hypot(a.x - me.x, a.y - me.y) < Math.hypot(b.x - me.x, b.y - me.y) ? a : b));
        out.push({ x: c.x, y: c.y, kind: 'radio' });
      }
    }
    return out;
  }

  // Район для значка вверху экрана (game.js getDistrictAt)
  const DISTRICT = {
    id: 'basement', tier: 0, color: '#f59e0b', bottleMult: 1, scrapMult: 1,
    name_ru: '🏠 ЛОГОВО ВАСИЛИЯ', name_en: '🏠 VASILIY\'S LAIR',
    meta_ru: 'Безопасно | Подвал: обстановка, запасы, отдых', meta_en: 'Safe | Basement: furniture, supplies, rest'
  };

  $('bm-close').addEventListener('click', close);
  ['mousedown', 'mouseup'].forEach(ev => $('basement-modal').addEventListener(ev, e => e.stopPropagation()));

  return {
    FURNITURE, DISTRICT, BUFF_NAMES, BUFF_MAX, saveState, loadState, netGet, netSet, onWorld, addObstacles,
    placeInside, placeAtDoor, nearest, prompt, interact, update, updatePlayer, applied, restDamage, restStamina,
    open, close, isOpen, drawRoom, drawActors, drawLight, drawDoors, places, level: lv
  };
})();
