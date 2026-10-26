/**
 * Сетевой кооператив (docs/COOP.md, этап 2). Хост ведёт игру, клиенты — терминалы.
 *
 *  - Сервер (tools/coop_server.py) раздаёт игру и пересылает сообщения: клиент → хост с пометкой from,
 *    хост → клиенту по полю to.
 *  - Лобби: «Кооп по сети» в главном меню. Хост создаёт игру, остальные подключаются, у каждого имя и цвет.
 *  - Клиент каждый кадр шлёт ввод (клавиши, точка мыши в мире, кнопка), разовые действия — командами
 *    (смена оружия, расходник, перекат, перезарядка, способность, E). Хост выполняет их за его Василия.
 *  - Хост после каждого update() шлёт каждому клиенту снимок: игроки, жабы рядом с ним (только изменившиеся
 *    поля), пули, лут, предметы громил, ракеты, кольца, тайники; новые частицы, вспышки, гильзы, цифры;
 *    звуки (громкость клиент считает от своего Василия) и рывки моделей (отдача, замах).
 *  - Клиент мир не считает (game.js update → clientUpdate): накладывает снимки, сам ведёт только частицы.
 *
 * Скрипты обычные, без модулей: players, player, localPlayer, enemies, bullets и прочее — из game.js,
 * Coop.addPlayer — из src/coop.js.
 */
window.Net = (() => {
  const RU = () => currentLang === 'ru';
  const L = (ru, en) => (RU() ? ru : en);
  const NAME_KEY = 'vasiliy.coopName';
  const HERO_KEY = 'vasiliy.coopHero';   // кем играть (src/heroes.js)
  const VIEW_R = 1700;          // жабы и эффекты дальше от Василия клиента ему не шлются

  let ws = null;
  let role = null;              // 'host' | 'client' | null
  let myNet = -1;               // id соединения на сервере (хост — 0)
  let started = false;
  let recording = false;        // хост: идёт update() — звуки и рывки моделей пишутся для клиентов
  const lobby = [];             // [{ net, name, color, hero }]
  const byNet = new Map();      // net id → игрок (хост)
  const sent = new Map();       // net id → { key → строка поля }: что клиент уже знает
  const queue = [];             // клиент: снимки, пришедшие с прошлого кадра
  let sounds = [], anims = [];  // хост: события этого кадра
  const enemyById = new Map();  // клиент: nid → жаба
  let lastSnap = null;          // отладка: последний снимок
  let lastClose = null, closeStack = '';
  let nidSeq = 1;

  // ===================== Кодирование: ссылки на игроков, жаб, тайники — номерами =====================
  const refIndex = new Map();   // объект → токен (тайники, урны)
  function buildRefs() {
    refIndex.clear();
    containers.forEach((c, i) => refIndex.set(c, { $c: i }));
    binLists().forEach((list, li) => list.forEach((b, i) => refIndex.set(b, { $b: [li, i] })));
  }
  function binLists() {
    const env = window.environmentRenderer;
    return env ? [env.courtyardBins || [], env.staticSidewalkBins || []] : [];
  }
  const SKIP_KEYS = new Set(['input', 'char', 'bot', 'actions', 'nearby', 'threat', '_n', 'owner', 'hits']);
  function enc(v, depth = 0) {
    if (v === null || v === undefined) return v;
    const ty = typeof v;
    if (ty === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
    if (ty === 'string' || ty === 'boolean') return v;
    if (ty !== 'object') return undefined;
    if (depth > 5) return undefined;
    if (v.nid && depth > 0) return { $e: v.nid };
    if (depth > 0 && typeof v.id === 'number' && players[v.id] === v) return { $p: v.id };
    const r = refIndex.get(v);
    if (r && depth > 0) return r;
    if (Array.isArray(v)) return v.map(x => { const y = enc(x, depth + 1); return y === undefined ? null : y; });
    if (v instanceof Set) return { $s: [...v] };
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return undefined; // THREE, DOM, холсты, Map
    const o = {};
    for (const k in v) {
      if (SKIP_KEYS.has(k)) continue;
      const y = enc(v[k], depth + 1);
      if (y !== undefined) o[k] = y;
    }
    return o;
  }
  function dec(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(dec);
    if (v.$e !== undefined) return enemyById.get(v.$e) || null;
    if (v.$p !== undefined) return players[v.$p] || null;
    if (v.$c !== undefined) return containers[v.$c] || null;
    if (v.$b !== undefined) { const l = binLists()[v.$b[0]]; return l ? l[v.$b[1]] || null : null; }
    if (v.$s !== undefined) return new Set(v.$s);
    const o = {};
    for (const k in v) o[k] = dec(v[k]);
    return o;
  }

  // Поля объекта строками (для сравнения с тем, что клиент уже знает)
  function fieldStrings(obj) {
    const out = {};
    const e = enc(obj);
    for (const k in e) out[k] = JSON.stringify(e[k]);
    return out;
  }
  // Что изменилось для этого клиента: { поле: значение }; null — ничего
  function delta(known, key, fs) {
    let prev = known.get(key);
    if (!prev) { prev = {}; known.set(key, prev); }
    let d = null;
    for (const k in fs) {
      if (prev[k] !== fs[k]) {
        (d || (d = {}))[k] = JSON.parse(fs[k]);
        prev[k] = fs[k];
      }
    }
    return d;
  }

  // Модуль со своим состоянием (мастерская, оборона, спасённые, квесты): netGet у хоста, netSet у клиента
  function mod(name) {
    return [() => (window[name] && window[name].netGet ? window[name].netGet() : null),
      v => { if (v && window[name] && window[name].netSet) window[name].netSet(v); }];
  }

  // Мир, который клиенту присылается целиком, если поменялся (чтение и запись глобальных let из game.js)
  const WORLD = {
    bullets: [() => bullets, v => { bullets = v; }],
    enemyBullets: [() => enemyBullets, v => { enemyBullets = v; }],
    lootItems: [() => lootItems, v => { lootItems = v; }],
    rockets: [() => rockets, v => { rockets = v; }],
    rocketBlasts: [() => rocketBlasts, v => { rocketBlasts = v; }],
    thrownProps: [() => thrownProps, v => { thrownProps = v; }],
    pounderRings: [() => pounderRings, v => { pounderRings = v; }],
    shockwaves: [() => shockwaves, v => { shockwaves = v; }],
    shieldShards: [() => shieldShards, v => { shieldShards = v; }],
    lairCracks: [() => lairCracks, v => { lairCracks = v; }],
    bioPuddles: [() => bioPuddles, v => { bioPuddles = v; }],
    gooShots: [() => gooShots, v => { gooShots = v; }],
    firePools: [() => firePools, v => { firePools = v; }],
    splashFires: [() => splashFires, v => { splashFires = v; }],
    fireFx: [() => fireFx, v => { fireFx = v; }],
    scorches: [() => scorches, v => { scorches = v; }],
    scalars: [() => ({
      boss: bossRef ? bossRef.nid : 0, pounder: pounderRef ? pounderRef.nid : 0,
      cleared: levelCleared, total: levelEnemyTotal, fence: { state: fenceBreach.state, cracks: fenceBreach.cracks }
    }), v => {
      bossRef = v.boss ? enemyById.get(v.boss) || null : null;
      pounderRef = v.pounder ? enemyById.get(v.pounder) || null : null;
      levelCleared = v.cleared;
      levelEnemyTotal = v.total;
      if (v.fence.state !== fenceBreach.state && v.fence.state === 'open') openBreachCollision();
      fenceBreach.state = v.fence.state;
      fenceBreach.cracks = v.fence.cracks;
    }],
    workshop: mod('Workshop'),
    defense: mod('Defense'),
    settlers: mod('Settlers'),
    quests: mod('Quests'),
    basement: mod('Basement')
  };
  // Эффекты: клиенту — только новые (дальше они живут у него сами, updateCosmetics)
  const FX = {
    particles: () => particles, floatingTexts: () => floatingTexts,
    muzzleFlashes: () => muzzleFlashes, shellCasings: () => shellCasings
  };
  // Тайники и урны: что меняется у них в игре
  const CONT_KEYS = ['searched', 'x', 'y', 'dirIdx', 'airborne', 'moved', 'z', 'tilt', 'held', 'safe'];
  const pick = (o) => { const r = {}; CONT_KEYS.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };

  // ===================== Соединение =====================
  function send(obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }
  // Хост → клиенту: поле to — первым, сервер читает его, не разбирая всё сообщение
  function sendTo(net, obj) {
    if (ws && ws.readyState === 1) ws.send('{"to":' + net + ',' + JSON.stringify(obj).slice(1));
  }

  function connect(asRole) {
    const name = encodeURIComponent(myName());
    ws = new WebSocket(`ws://${location.host}/ws?role=${asRole}&name=${name}`);
    role = asRole;
    ws.onmessage = ev => onMessage(JSON.parse(ev.data));
    ws.onclose = (ev) => {
      lastClose = { code: ev.code, reason: ev.reason, t: Math.round(performance.now()), stack: closeStack };
      if (role) setStatus(L('Соединение потеряно', 'Connection lost'));
      if (started && role === 'client') leaveToMenu(L('Хост отключился', 'Host disconnected'));
      ws = null;
    };
    ws.onerror = () => setStatus(L('Не удалось подключиться к серверу коопа (tools/coop_server.py)', 'Cannot reach the coop server (tools/coop_server.py)'));
  }

  function onMessage(m) {
    if (m.t === 'error' && m.msg === 'host_exists') {
      setStatus(L('Игру уже создали — подключайся к ней', 'A game already exists — join it'));
      role = null;
      return;
    }
    if (m.t === 'hello') {
      myNet = m.id;
      if (role === 'host') {
        lobby.length = 0;
        lobby.push({ net: 0, name: myName(), color: 0, hero: myHero() });
        renderLobby();
      } else {
        send({ t: 'hero', hero: myHero() });   // кем хочу играть — хосту, он проверит, что свободен
        if (!m.host) setStatus(L('Хоста пока нет — подожди, пока кто-то создаст игру', 'No host yet — wait for someone to create a game'));
      }
      return;
    }
    if (role === 'host') hostMessage(m);
    else clientMessage(m);
  }

  // ===================== ХОСТ =====================
  function hostMessage(m) {
    if (m.t === 'join') {
      if (started) { joinRunning(m); return; }
      const used = new Set(lobby.map(x => x.color));
      if (lobby.length >= 4) { sendTo(m.from, { t: 'full', msg: 'full' }); return; }
      // Одинаковые имена — с номером: по имени игрок потом находит своего Василия в сохранении
      let name = (m.name || 'Василий').slice(0, 16);
      for (let k = 2; lobby.some(x => x.name === name); k++) name = `${(m.name || 'Василий').slice(0, 13)} ${k}`;
      lobby.push({ net: m.from, name, color: [0, 1, 2, 3].find(c => !used.has(c)), hero: freeHero(null, lobby.map(x => x.hero)) });
      broadcastLobby();
    } else if (m.t === 'hero') {
      // Игрок выбрал героя в лобби: если свободен — его; в идущей игре героя не сменить
      const x = lobby.find(e => e.net === m.from);
      if (started || !x || !HEROES.some(h => h.id === m.hero) || lobby.some(e => e !== x && e.hero === m.hero)) return;
      x.hero = m.hero;
      broadcastLobby();
    } else if (m.t === 'leave') {
      const i = lobby.findIndex(x => x.net === m.from);
      if (i >= 0) lobby.splice(i, 1);
      const p = byNet.get(m.from);
      if (p) {
        // Место за ним: вернётся с тем же именем — продолжит с того же (wasDead — погиб ли до ухода)
        p.wasDead = !!p.dead;
        p.dead = true;
        p.left = true;
        p.netId = null;
        addFloatingText(p.x - 40, p.y - 70, L(gendered(`${p.name} отключил{ся|ась}`, p), `${p.name} left`), '#94a3b8');
        byNet.delete(m.from);
      }
      sent.delete(m.from);
      if (!started) broadcastLobby();
    } else if (m.t === 'in') {
      const p = byNet.get(m.from);
      if (!p) return;
      const k = p.input.keys;
      for (const key in k) k[key] = false;
      (m.k || []).forEach(key => { k[key] = true; });
      p.input.mouse.x = m.mx;
      p.input.mouse.y = m.my;
      if (p === player) mouseDown = !!m.d; else p.input.down = !!m.d;
    } else if (m.t === 'act') {
      const p = byNet.get(m.from);
      if (p) (p.actions || (p.actions = [])).push([m.f, m.a || []]);
    } else if (m.t === 'rpc') {
      // Действие из окна клиента (netAction в game.js): за его Василия; потом ему — всё заново, что бы ни вышло
      const p = byNet.get(m.from);
      const fn = NET_ACTIONS[m.n];
      if (!p || !fn || p.dead) return;
      withPlayer(p, () => fn(m.a || []));
      sent.delete(m.from);
    } else if (m.t === 'card') {
      const p = byNet.get(m.from);
      if (p && p.pendingCards) withPlayer(p, () => applyBossCard(m.id));
    }
  }

  // Вход в идущую игру: тот же ник, что ушёл, — свой Василий обратно; иначе новый игрок (если есть место),
  // а если такой был в загруженном сохранении — с его вещами
  function joinRunning(m) {
    const name = (m.name || 'Василий').slice(0, 16);
    let p = players.find(x => x.left && x.name === name);
    if (!p) {
      if (players.some(x => !x.left && x.name === name)) { sendTo(m.from, { t: 'full', msg: 'name' }); return; }
      if (players.filter(x => !x.left).length >= 4) { sendTo(m.from, { t: 'full', msg: 'full' }); return; }
      const used = new Set(players.filter(x => !x.left).map(x => x.color));
      p = window.Coop.addPlayer(name, [0, 1, 2, 3].find(c => !used.has(c)), freeHero(null, players.filter(x => !x.left).map(x => x.hero)));
      p.id = players.indexOf(p);
      withPlayer(p, () => {
        resetPlayerState();
        const rec = savedRecs[name];
        if (rec) { applyRecord(rec); reskin(p, rec.hero); delete savedRecs[name]; } else p.wasDead = false;
      });
    }
    p.left = false;
    p.dead = !!p.wasDead;
    p.netId = m.from;
    p.input = { keys: {}, mouse: { x: p.x, y: p.y }, down: false };
    byNet.set(m.from, p);
    sent.delete(m.from);
    // Встаёт рядом с живым товарищем
    const mate = alivePlayers().find(x => x !== p);
    if (mate && !p.dead) { p.x = mate.x + 40; p.y = mate.y + 30; }
    addFloatingText(p.x - 40, p.y - 70, L(`${p.name} в игре`, `${p.name} joined`), '#4ade80');
    const list = rosterList();
    sendTo(m.from, { t: 'start', you: p.id, list, loc: currentLocation });
    byNet.forEach((o, net) => { if (net !== m.from) sendTo(net, { t: 'roster', list }); });
  }
  const rosterList = () => players.map(p => ({ id: p.id, name: p.name, color: p.color, hero: p.hero }));

  // Герой из сохранения (он там свой у каждого имени): другая модель
  function reskin(p, hero) {
    if (!hero || hero === p.hero || !HEROES.some(h => h.id === hero)) return;
    p.hero = hero;
    p.char = new ThreeCharacterManager(p.color, hero);
    p.char.owner = p;
    if (p === localPlayer) window.threeCharacter = p.char;
  }

  // --- Сохранение коопа (Menu.saveRun у хоста): общий мир + игроки по именам ---
  let savedRecs = {};   // из загруженного сохранения — кого пока нет в игре
  function coopSnapshot(snap) {
    const base = snap();
    const recs = Object.assign({}, savedRecs);
    players.forEach(p => withPlayer(p, () => {
      const r = snap();
      recs[p.name] = {
        name: p.name, color: p.color, hero: p.hero, dead: p.left ? !!p.wasDead : !!p.dead, freeUpgrade: !!p.freeUpgrade,
        run: { player: r.player, workshop: r.workshop, canteen: r.canteen }
      };
    }));
    return { coop: 1, savedAt: Date.now(), base, players: Object.values(recs) };
  }
  // Запись игрока — на текущего (player)
  function applyRecord(rec) {
    window.Menu.applyPlayer(rec.run || {});
    player.freeUpgrade = !!rec.freeUpgrade;
    player.wasDead = !!rec.dead;
    player.dead = !!rec.dead;
  }

  function broadcastLobby() {
    renderLobby();
    lobby.forEach(x => { if (x.net) sendTo(x.net, { t: 'lobby', list: lobby }); });
  }

  function withPlayer(p, fn) {
    const was = player;
    usePlayer(p);
    try { fn(); } finally { usePlayer(was); }
  }

  // Команды клиента — за его Василия, в начале кадра хоста (Coop.beforeUpdate)
  const ACTIONS = {
    roll: () => performRoll(),
    reload: () => startReload(),
    weapon: w => window.switchWeapon(w),
    item: id => window.useItem(id),
    ability: () => useRmbAbility(),
    abilityNext: () => cycleRmbAbility(),
    interact: () => handleInteract(),
    help: () => callForHelp()
  };
  function hostBeforeUpdate() {
    if (!started) return;
    byNet.forEach(p => {
      if (!p.actions || !p.actions.length || p.dead) return;
      const list = p.actions;
      p.actions = [];
      // Лёжа можно только позвать на помощь
      withPlayer(p, () => list.forEach(([f, a]) => { if (ACTIONS[f] && (!(p.downT > 0) || f === 'help')) ACTIONS[f](...a); }));
    });
  }

  let lastStepAt = 0;
  function hostBegin() {
    if (role !== 'host' || !started) return;
    recording = true;
    lastStepAt = performance.now();
  }

  // После update(): каждому клиенту — его снимок
  function hostSend() {
    if (role !== 'host' || !started) return;
    recording = false;
    buildRefs();
    enemies.forEach(e => { if (!e.nid) e.nid = nidSeq++; });
    // Поля игроков и жаб — строками один раз на кадр, сравнение — у каждого клиента своё
    const pf = players.map(p => fieldStrings(p));
    const ef = new Map();
    const world = {};
    for (const k in WORLD) world[k] = JSON.stringify(enc(WORLD[k][0]()));
    const fx = {};
    for (const k in FX) fx[k] = FX[k]().filter(o => !o._n);
    const conts = containers.map(c => JSON.stringify(pick(c)));
    const bins = binLists().map(l => l.map(b => JSON.stringify(pick(b))));
    byNet.forEach((p, net) => {
      let known = sent.get(net);
      if (!known) { known = new Map(); sent.set(net, known); }
      const msg = { t: 's' };
      const P = [];
      players.forEach((o, i) => {
        const d = delta(known, 'p' + i, pf[i]);
        if (d) P.push([i, d]);
      });
      if (P.length) msg.P = P;
      const nearS = JSON.stringify(p.nearby ? enc({ v: p.nearby }).v : null);
      if (known.get('near') !== nearS) { known.set('near', nearS); msg.near = JSON.parse(nearS); }
      // Жабы рядом с ним (боссы — всегда): видимые по порядку и изменившиеся поля
      const eye = p.dead ? (alivePlayers()[0] || p) : p;
      const vis = [], E = [];
      enemies.forEach(e => {
        const boss = e.type === 'boss' || e.type === 'pounder';
        if (!boss && (Math.abs(e.x - eye.x) > VIEW_R || Math.abs(e.y - eye.y) > VIEW_R)) {
          known.delete('e' + e.nid);
          return;
        }
        vis.push(e.nid);
        if (!ef.has(e)) ef.set(e, fieldStrings(e));
        const d = delta(known, 'e' + e.nid, ef.get(e));
        if (d) E.push([e.nid, d]);
      });
      msg.Ev = vis;
      if (E.length) msg.E = E;
      // Мир — что поменялось
      const W = {};
      let any = false;
      for (const k in world) {
        if (known.get('w' + k) !== world[k]) {
          known.set('w' + k, world[k]);
          W[k] = JSON.parse(world[k]);
          any = true;
        }
      }
      if (any) msg.W = W;
      const C = [];
      conts.forEach((s, i) => { if (known.get('c' + i) !== s) { known.set('c' + i, s); C.push([i, JSON.parse(s)]); } });
      if (C.length) msg.C = C;
      const B = [];
      bins.forEach((l, li) => l.forEach((s, i) => { const key = 'b' + li + '_' + i; if (known.get(key) !== s) { known.set(key, s); B.push([li, i, JSON.parse(s)]); } }));
      if (B.length) msg.B = B;
      // Новые эффекты — те, что рядом
      const F = {};
      let anyF = false;
      for (const k in fx) {
        const near = fx[k].filter(o => Math.abs(o.x - eye.x) < VIEW_R && Math.abs(o.y - eye.y) < VIEW_R);
        if (near.length) { F[k] = near.map(o => enc(o)); anyF = true; }
      }
      if (anyF) msg.F = F;
      if (sounds.length) msg.S = sounds;
      if (toasts.length) msg.T = toasts;
      if (anims.length) msg.A = anims;
      sendTo(net, msg);
    });
    for (const k in fx) fx[k].forEach(o => { o._n = 1; });
    sounds = [];
    anims = [];
    toasts = [];
    soundAt = null;
  }

  // Звук хода хоста — клиентам. at — где (если громкость считалась от места), em — чей Василий
  function recordSound(f, args, at) {
    if (!recording) return;
    sounds.push({ f, a: args.map(a => (typeof a === 'object' && a !== null ? (refIndex.get(a) || enc(a)) : a)), at, em: enemyActing ? -1 : player.id });
  }

  function sayTo(p, key) {
    if (role === 'host' && started && p.netId) sendTo(p.netId, { t: 'say', key });
  }
  // Дрожь земли у всех (прорыв, game.js): у хоста — сразу, товарищам — событием
  function shakeAll(frames, amp) {
    shakeScreen(frames, amp);
    if (role === 'host' && started) byNet.forEach((p, net) => sendTo(net, { t: 'shake', f: frames, a: amp }));
  }

  // Товарищ нажал E у лавки, выжившего или сейфа: окно открывается у него (действия придут как rpc)
  function remoteInteract(p, it) {
    if (!p.netId) return;
    if (it.type === 'shop') sendTo(p.netId, { t: 'ui', kind: 'shop' });
    else if (it.type === 'settler' && window.Settlers) {
      const i = window.Settlers.list.indexOf(it.target);
      if (i >= 0) sendTo(p.netId, { t: 'ui', kind: 'settler', i });
    } else if (it.type === 'container' && window.Safes && window.Safes.isSafe(it.target)) {
      window.Safes.open && sendTo(p.netId, { t: 'ui', kind: 'safe', i: containers.indexOf(it.target) });
    } else if (it.type === 'basement_item') {
      sendTo(p.netId, { t: 'ui', kind: 'basement', id: it.id });
    }
  }

  // ===================== Окна у клиента =====================
  // rpc — действие хосту; optimistic — сразу у себя, без своих частиц, цифр и заставок (их пришлёт хост)
  function rpc(name, args) {
    send({ t: 'rpc', n: name, a: args });
  }
  let muted = false;
  function optimistic(fn) {
    const np = particles.length, nf = floatingTexts.length;
    muted = true;
    try { return fn(); } finally {
      muted = false;
      if (particles.length > np) particles.length = np;
      if (floatingTexts.length > nf) floatingTexts.length = nf;
    }
  }
  function openUi(m) {
    if (gameState !== 'PLAYING') return;
    if (m.kind === 'shop') openShop();
    else if (m.kind === 'settler' && window.Settlers && window.Settlers.list[m.i]) window.Settlers.talk(window.Settlers.list[m.i]);
    else if (m.kind === 'safe' && window.Safes && containers[m.i]) window.Safes.open(containers[m.i]);
    else if (m.kind === 'basement' && window.Basement) window.Basement.open(m.id);
  }

  // Заставки (квест взят, уровень зачищен) — всем: хост шлёт свои с кадром, клиент повторяет за ним
  let toasts = [];
  const lastToast = {};
  function wrapToast() {
    const raw = showToast;
    showToast = function (title, sub) {
      if (role === 'client' && started) {
        if (muted) return;
        if (performance.now() - (lastToast[title] || 0) < 3000) return; // уже показали своё такое же
      }
      lastToast[title] = performance.now();
      if (role === 'host' && started) toasts.push([title, sub]);
      return raw(title, sub);
    };
  }

  function onTravel(target) {
    if (role === 'host' && started) byNet.forEach((p, net) => { sent.delete(net); sendTo(net, { t: 'travel', target }); });
  }
  function onGameOver() {
    if (role === 'host' && started) byNet.forEach((p, net) => sendTo(net, { t: 'over' }));
    // Забег кончился — сеанс тоже: новый — через лобби
    if (started) {
      started = false;
      role = null;
      if (ws) { closeStack = new Error().stack.slice(0, 600); ws.close(); }
    }
  }

  function hostStart(save) {
    if (role !== 'host' || started) return;
    if (!save || !save.coop) save = null;
    // Игроки — по лобби: хост первым (его Василий уже есть), остальные — новые
    const me = localPlayer;
    players.length = 0;
    me.id = 0;
    me.name = lobby[0].name;
    me.color = lobby[0].color;
    reskin(me, lobby[0].hero);
    players.push(me);
    if (window.Coop) window.Coop.bots.clear();
    byNet.clear();
    lobby.slice(1).forEach(x => {
      const p = window.Coop.addPlayer(x.name, x.color, x.hero);
      p.id = players.indexOf(p);
      p.netId = x.net;
      byNet.set(x.net, p);
    });
    started = true;
    hideLobby();
    if (window.Menu) window.Menu.resume && window.Menu.resume();
    savedRecs = {};
    if (save) {
      // Сохранённый кооп: мир — из него, каждый — по своему имени; кого нет — ждёт в сохранении
      startGame(save.base);
      (save.players || []).forEach(r => { if (r && r.name) savedRecs[r.name] = r; });
      players.forEach(p => withPlayer(p, () => {
        resetPlayerState();
        const rec = savedRecs[p.name];
        if (rec) { applyRecord(rec); reskin(p, rec.hero); delete savedRecs[p.name]; }
      }));
      if (currentLocation !== 'city') placePlayersOnArrival(null);
      if (localPlayer.pendingCards) cardOfferTimer = 90;
      applyHotbarOrder();
      updateHUD(true);
    } else {
      startGame();
      if (window.Menu) window.Menu.clearCoop();
    }
    const list = rosterList();
    byNet.forEach((p, net) => sendTo(net, { t: 'start', you: p.id, list, loc: currentLocation }));
    startTicker();
  }

  // Окно хоста свёрнуто или без фокуса: requestAnimationFrame стоит или идёт раз в секунду, а остальные
  // играют — тогда мир двигает такт от воркера (таймеры воркеров браузер не душит)
  let ticker = null, hiddenLast = 0, hiddenAcc = 0;
  function startTicker() {
    if (ticker) return;
    const src = 'setInterval(() => postMessage(0), 16);';
    ticker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    ticker.onmessage = () => {
      if (!started || role !== 'host') return;
      const now = performance.now();
      if (now - lastStepAt < 60) { hiddenLast = 0; hiddenAcc = 0; return; }
      if (!hiddenLast) hiddenLast = now;
      hiddenAcc += Math.min(now - hiddenLast, 1000);
      hiddenLast = now;
      while (hiddenAcc > 1000 / 60) {
        hiddenAcc -= 1000 / 60;
        update();
      }
    };
  }

  // ===================== КЛИЕНТ =====================
  function clientMessage(m) {
    if (m.t === 'lobby') {
      lobby.length = 0;
      m.list.forEach(x => lobby.push(x));
      renderLobby();
    } else if (m.t === 'full') {
      setStatus(m.msg === 'name' ? L('Такое имя уже в игре — возьми другое', 'That name is already in the game — pick another')
        : L('Мест нет: уже четверо', 'No room: four players already'));
    } else if (m.t === 'start') clientStart(m);
    else if (m.t === 'roster') {
      // Кто-то вошёл в идущую игру
      m.list.forEach(x => {
        let p = players[x.id];
        if (!p) { p = window.Coop.addPlayer(x.name, x.color, x.hero); p.id = x.id; }
      });
    }
    else if (m.t === 's') { queue.push(m); lastSnap = m; }
    else if (m.t === 'say') { const was = player; usePlayer(localPlayer); sayLine(m.key); usePlayer(was); }
    else if (m.t === 'shake') shakeScreen(m.f, m.a);
    else if (m.t === 'ui') pendingUi = m;
    else if (m.t === 'travel') {
      queue.length = 0;
      enemyById.clear();
      travelTo(m.target);
    } else if (m.t === 'over') gameOverAll();   // сам закроет сеанс (onGameOver); одиночное сохранение не тронет
    else if (m.t === 'host_left') leaveToMenu(L('Хост вышел из игры', 'The host left the game'));
  }

  function clientStart(m) {
    const me = localPlayer;
    players.length = 0;
    m.list.forEach(x => {
      let p;
      if (x.id === m.you) {
        p = me;
        p.name = x.name;
        p.color = x.color;
        p.hero = x.hero || 'vasiliy';
        if (x.color !== 0 || p.hero !== 'vasiliy') {
          p.char = new ThreeCharacterManager(x.color, p.hero);
          p.char.owner = p;
          window.threeCharacter = p.char;
        }
        players.push(p);
      } else {
        p = window.Coop.addPlayer(x.name, x.color, x.hero);
      }
      p.id = x.id;
    });
    players.sort((a, b) => a.id - b.id);
    if (window.Coop) window.Coop.bots.clear();
    started = true;
    hideLobby();
    startGame(null, m.loc || 'city');
    // Клиент жаб не расставляет: какие и где — придёт от хоста
    enemies = [];
    bossRef = null;
    pounderRef = null;
    hookClientActions();
  }

  // Действия с клавиш и хотбара у клиента — командой хосту (свой выбор слотов, колесо, Q считаются тут)
  function hookClientActions() {
    const fwd = (f) => (...a) => send({ t: 'act', f, a });
    performRoll = fwd('roll');
    startReload = fwd('reload');
    useRmbAbility = fwd('ability');
    cycleRmbAbility = fwd('abilityNext');
    handleInteract = fwd('interact');
    callForHelp = fwd('help');
    window.switchWeapon = fwd('weapon');
    window.useItem = fwd('item');
  }

  let pendingUi = null;  // окно, которое хост велел открыть (после свежего снимка)
  let trackerT = 0;
  let cardsState = 0;   // 0 — нет карт, 1 — окно открыто, 2 — выбрал, ждём хоста
  function clientUpdate() {
    usePlayer(localPlayer);
    // После загрузки снимков может набраться много: эффекты и звуки — только из последних
    if (queue.length > 20) queue.slice(0, -5).forEach(m => { delete m.F; delete m.S; delete m.A; });
    let mine = false;
    while (queue.length) mine = applySnapshot(queue.shift()) || mine;
    usePlayer(localPlayer);
    if (pendingUi) { openUi(pendingUi); pendingUi = null; }
    // Свой Василий поменялся (купил, сварил, подобрал): открытое окно и хотбар — заново
    if (mine) {
      if (gameState === 'SHOP') { renderArsenalAndSupplies(); renderUpgradeTrees(); }
      else if (gameState === 'WORKSHOP' && window.Workshop) window.Workshop.refresh();
      else if (gameState === 'CANTEEN' && window.Canteen) window.Canteen.refresh();
      else if (gameState === 'INVENTORY' && window.CharacterPanel) window.CharacterPanel.refresh();
      applyHotbarOrder();
      refreshConsumableSlots();
      updateHUD(true);
    }
    if (window.Safes) window.Safes.update();
    if (window.Quests && ++trackerT % 30 === 0) window.Quests.refreshTracker();
    // Карты за босса: у каждого своё окно, выбор — хосту
    if (!localPlayer.pendingCards) cardsState = 0;
    else if (cardsState === 0 && gameState === 'PLAYING' && window.BossCards) {
      cardsState = 1;
      gameState = 'CARDS';
      window.BossCards.open(id => {
        cardsState = 2;
        send({ t: 'card', id });
        gameState = 'PLAYING';
      }, currentLocation === 'promzona' ? 'kicker_pounder' : 'kicker');
    }
    // Ввод — хосту (в меню — пустой: Василий стоит)
    mouseWorld.x = mouseScreen.x + camera.x;
    mouseWorld.y = mouseScreen.y + camera.y;
    const playing = gameState === 'PLAYING';
    const k = [];
    if (playing) for (const key in keys) if (keys[key]) k.push(key);
    send({ t: 'in', k, mx: Math.round(mouseWorld.x), my: Math.round(mouseWorld.y), d: playing && mouseDown });

    updateCosmetics();
    updateSpeech();
    SoundFX.updateSteps();
    cameraKickX *= 0.72;
    cameraKickY *= 0.72;
    const camP = localPlayer.dead ? (alivePlayers()[0] || localPlayer) : localPlayer;
    camera.x = camP.x - viewW / 2 + cameraKickX;
    camera.y = camP.y - viewH / 2 + cameraKickY;
    updateInteractPrompt();
    updateHUD();
  }

  // true — пришли изменения своего Василия
  function applySnapshot(m) {
    let mine = false;
    if (m.P) m.P.forEach(([i, d]) => {
      const p = players[i];
      if (!p) return;
      Object.assign(p, dec(d));
      if (p === localPlayer && ['items', 'resources', 'ammo', 'unlockedWeapons', 'equipped', 'unlockedPerks', 'ws', 'cards', 'empGrenades'].some(k => k in d)) mine = true;
    });
    if ('near' in m) nearbyInteractable = dec(m.near);
    if (m.E) m.E.forEach(([id, d]) => {
      let e = enemyById.get(id);
      if (!e) { e = { nid: id }; enemyById.set(id, e); }
      Object.assign(e, d);   // ссылки внутри — ниже, когда все жабы на месте
      e._refs = d;
    });
    if (m.Ev) {
      const keep = new Set(m.Ev);
      enemyById.forEach((e, id) => { if (!keep.has(id)) enemyById.delete(id); });
      enemies = m.Ev.map(id => enemyById.get(id)).filter(Boolean);
    }
    // Поля-ссылки жаб (цель, что держит громила) — теперь, когда все жабы известны
    if (m.E) m.E.forEach(([id]) => {
      const e = enemyById.get(id);
      if (!e || !e._refs) return;
      const d = e._refs;
      delete e._refs;
      for (const key in d) if (d[key] && typeof d[key] === 'object') e[key] = dec(d[key]);
    });
    if (m.C) m.C.forEach(([i, d]) => { if (containers[i]) Object.assign(containers[i], d); });
    if (m.C && window.Safes && window.Safes.isOpen()) window.Safes.refresh();
    if (m.T) m.T.forEach(([title, sub]) => showToast(title, sub));
    if (m.B) m.B.forEach(([li, i, d]) => { const l = binLists()[li]; if (l && l[i]) Object.assign(l[i], d); });
    if (m.W) for (const k in m.W) if (WORLD[k]) WORLD[k][1](dec(m.W[k]));
    if (m.F) for (const k in m.F) if (FX[k]) { const arr = FX[k](); m.F[k].forEach(o => arr.push(dec(o))); }
    if (m.A) m.A.forEach(a => {
      const p = players[a.p];
      if (!p || !p.char) return;
      if (a.k === 'recoil') p.char.triggerRecoil(a.s);
      else if (a.k === 'swing') p.char.triggerSwing();
    });
    if (m.S) m.S.forEach(playSound);
    return mine;
  }

  // Звук с хоста: от места — громкость от своего Василия; ход товарища — его Василий источник
  function playSound(ev) {
    const fn = rawSound[ev.f];
    if (!fn) return;
    const was = player;
    const em = ev.em >= 0 ? players[ev.em] : null;
    if (em) usePlayer(em);
    SoundFX.at = ev.at || null;
    try { fn.apply(SoundFX, ev.a.map(a => (a && typeof a === 'object' ? dec(a) : a))); } catch (err) { /* звук не важнее игры */ }
    SoundFX.at = null;
    usePlayer(was);
  }

  // ===================== Звуки и рывки моделей: обёртки =====================
  const NO_RECORD = new Set(['ensure', 'setVolume', 'updateSteps', 'preloadSounds', 'pan', 'spatial']);
  const rawSound = {};
  function wrapSounds() {
    for (const f in SoundFX) {
      const fn = SoundFX[f];
      if (typeof fn !== 'function' || NO_RECORD.has(f)) continue;
      rawSound[f] = fn;
      SoundFX[f] = function (...args) {
        // Громкость «от места» (enemySoundVolume, SoundFX.pan) у хоста считается для всех: место — в событии
        const at = soundAt;
        soundAt = null;
        if (role === 'host' && started) recordSound(f, args, at);
        if (role === 'client' && started && recordingBlocked()) return; // свои звуки клиент получает от хоста
        SoundFX.at = at;
        try { return fn.apply(SoundFX, args); } finally { SoundFX.at = null; }
      };
    }
  }
  // Клиент сам звуков мира не порождает (мир не считает) — кроме шагов и действий в своих окнах (optimistic);
  // всё прочее приходит от хоста
  const recordingBlocked = () => !muted;
  let soundAt = null;
  function noteSoundAt(x, y, v) { soundAt = { x: Math.round(x), y: Math.round(y), v: Math.round(v * 100) / 100 }; }

  function wrapAnims() {
    const P = ThreeCharacterManager.prototype;
    const rec = P.triggerRecoil, sw = P.triggerSwing;
    P.triggerRecoil = function (s) {
      if (recording && this.owner) anims.push({ p: this.owner.id, k: 'recoil', s });
      return rec.call(this, s);
    };
    P.triggerSwing = function () {
      if (recording && this.owner) anims.push({ p: this.owner.id, k: 'swing' });
      return sw.call(this);
    };
  }

  // ===================== Лобби =====================
  function myName() {
    let n = '';
    try { n = localStorage.getItem(NAME_KEY) || ''; } catch (e) { /* без хранилища — по умолчанию */ }
    return n || 'Василий';
  }
  function setName(n) {
    try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* не сохранится — не страшно */ }
  }
  function myHero() {
    let h = '';
    try { h = localStorage.getItem(HERO_KEY) || ''; } catch (e) { /* без хранилища — Василий */ }
    return HEROES.some(x => x.id === h) ? h : 'vasiliy';
  }
  function setMyHero(h) {
    try { localStorage.setItem(HERO_KEY, h); } catch (e) { /* не сохранится — не страшно */ }
  }
  // Герой новому в лобби или в игре: кого хочет, если никто не взял, иначе первый свободный
  function freeHero(want, taken) {
    const used = new Set(taken);
    if (want && !used.has(want) && HEROES.some(x => x.id === want)) return want;
    return (HEROES.find(x => !used.has(x.id)) || HEROES[0]).id;
  }
  // Выбор героя в лобби: хост — себе и всем в список, клиент — просьбой хосту; до входа — просто запоминаем
  function pickHero(id) {
    setMyHero(id);
    if (role === 'host' && lobby[0] && !started) {
      if (lobby.some(x => x !== lobby[0] && x.hero === id)) return;
      lobby[0].hero = id;
      broadcastLobby();
    } else if (role === 'client' && ws) send({ t: 'hero', hero: id });
    else renderLobby();
  }

  let panel = null;
  function buildLobby() {
    const box = document.querySelector('#screen-menu .menu-buttons');
    if (!box) return;
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.id = 'btn-coop';
    btn.textContent = L('КООП ПО СЕТИ', 'LAN CO-OP');
    btn.addEventListener('click', showLobby);
    box.insertBefore(btn, document.getElementById('btn-menu-intro'));

    panel = document.createElement('div');
    panel.id = 'coop-lobby';
    panel.className = 'coop-lobby';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="coop-box">
        <h2>${L('Кооп по локальной сети', 'LAN co-op')}</h2>
        <label class="coop-row">${L('Имя', 'Name')} <input id="coop-name" maxlength="16" autocomplete="off"></label>
        <div class="coop-heroes" id="coop-heroes"></div>
        <div class="coop-row coop-buttons">
          <button class="btn-action" id="coop-host">${L('Создать игру', 'Host a game')}</button>
          <button class="btn-action" id="coop-join">${L('Подключиться', 'Join')}</button>
        </div>
        <div id="coop-list" class="coop-list"></div>
        <div id="coop-status" class="coop-status"></div>
        <div class="coop-row coop-buttons">
          <button class="btn-action" id="coop-start" style="display:none">${L('Начать', 'Start')}</button>
          <button class="btn-action" id="coop-continue" style="display:none">${L('Продолжить', 'Continue')}</button>
          <button class="btn-secondary" id="coop-back">${L('Назад', 'Back')}</button>
        </div>
        <div class="coop-note">${L('Все — в одной сети. Хост запускает VasiliyCoopServer.exe из папки игры, остальные открывают адрес «для друзей» из его окна.',
          'Everyone on one network. The host runs VasiliyCoopServer.exe from the game folder, the others open the "for friends" address shown in its window.')}</div>
      </div>`;
    document.body.appendChild(panel);
    const nameEl = panel.querySelector('#coop-name');
    nameEl.value = myName();
    nameEl.addEventListener('input', () => setName(nameEl.value.trim().slice(0, 16)));
    nameEl.addEventListener('keydown', e => e.stopPropagation());
    panel.querySelector('#coop-heroes').addEventListener('click', e => {
      const card = e.target.closest('.coop-hero');
      if (card && !card.classList.contains('taken')) pickHero(card.dataset.hero);
    });
    panel.querySelector('#coop-host').addEventListener('click', () => { if (!ws) { setStatus(L('Создаём…', 'Creating…')); connect('host'); } });
    panel.querySelector('#coop-join').addEventListener('click', () => { if (!ws) { setStatus(L('Подключаемся…', 'Joining…')); connect('client'); } });
    panel.querySelector('#coop-start').addEventListener('click', () => hostStart(null));
    panel.querySelector('#coop-continue').addEventListener('click', () => hostStart(window.Menu && window.Menu.loadCoop()));
    panel.querySelector('#coop-back').addEventListener('click', () => {
      if (ws) { role = null; ws.close(); }
      lobby.length = 0;
      hideLobby();
    });
  }
  // Лобби — только если игру раздаёт сервер коопа (VasiliyCoopServer.exe / coop_server.py). На GitHub Pages и
  // других сайтах его нет: тогда окно — скачать игру с сервером и как запустить
  function serverHere() {
    return fetch('__coop', { cache: 'no-store' })
      .then(r => (r.ok ? r.text() : ''))
      .then(t => t === 'vasiliy-coop')
      .catch(() => false);
  }
  function showLobby() {
    if (!panel) return;
    serverHere().then(ok => {
      if (!ok) { showDownload(); return; }
      panel.style.display = 'flex';
      renderLobby();
    });
  }

  const ZIP_URL = 'https://github.com/dorokhin95/vasiliy_vs_aliens/archive/refs/heads/main.zip';
  let dlPanel = null;
  function showDownload() {
    if (!dlPanel) {
      dlPanel = document.createElement('div');
      dlPanel.className = 'coop-lobby';
      dlPanel.innerHTML = `
        <div class="coop-box coop-download">
          <h2>${L('Кооп по локальной сети', 'LAN co-op')}</h2>
          <p>${L('С сайта кооп не запустить: нужен сервер на одном из компьютеров вашей сети. Это бесплатно и без установки — только Windows.',
            'Co-op can\'t run from the website: one PC on your network has to be the server. Free, nothing to install — Windows only.')}</p>
          <ol>
            <li>${L('Скачай игру с сервером коопа (архив ~150 МБ) на компьютер, который будет сервером.',
              'Download the game with the co-op server (~150 MB archive) to the PC that will be the server.')}</li>
            <li>${L('Распакуй архив и запусти <b>VasiliyCoopServer.exe</b> в папке игры.',
              'Unzip it and run <b>VasiliyCoopServer.exe</b> in the game folder.')}</li>
            <li>${L('Windows может предупредить: «Подробнее» → «Выполнить в любом случае». Про брандмауэр — «Разрешить доступ» для частных сетей.',
              'Windows may warn you: "More info" → "Run anyway". For the firewall — "Allow access" on private networks.')}</li>
            <li>${L('Игра откроется сама. В окне сервера есть адрес «для друзей» — его открывают в браузере остальные (в той же сети или Wi-Fi), им скачивать ничего не нужно.',
              'The game opens by itself. The server window shows an address "for friends" — the others open it in a browser (same network or Wi-Fi), they download nothing.')}</li>
            <li>${L('«Кооп по сети» → имя → хост «Создать игру», друзья «Подключиться», хост «Начать». До 4 игроков. Не закрывай окно сервера, пока играете.',
              '"LAN co-op" → name → the host clicks "Host a game", friends "Join", the host "Start". Up to 4 players. Keep the server window open while you play.')}</li>
          </ol>
          <div class="coop-row coop-buttons">
            <a class="btn-action coop-dl-btn" href="${ZIP_URL}" target="_blank" rel="noopener">${L('Скачать игру с сервером (ZIP)', 'Download the game with the server (ZIP)')}</a>
            <button class="btn-secondary" id="coop-dl-back">${L('Назад', 'Back')}</button>
          </div>
        </div>`;
      document.body.appendChild(dlPanel);
      dlPanel.querySelector('#coop-dl-back').addEventListener('click', () => { dlPanel.style.display = 'none'; });
    }
    dlPanel.style.display = 'flex';
  }
  function hideLobby() {
    if (panel) panel.style.display = 'none';
  }
  function setStatus(text) {
    const el = panel && panel.querySelector('#coop-status');
    if (el) el.textContent = text;
  }
  function renderLobby() {
    if (!panel) return;
    const list = panel.querySelector('#coop-list');
    list.innerHTML = lobby.map(x => `<div class="coop-player"><span class="coop-dot" style="background:${COOP_COLORS[x.color]}"></span>${escapeHtml(x.name)} <span class="coop-who">${L(heroDef(x.hero).ru, heroDef(x.hero).en)}</span>${x.net === myNet ? L(' (ты)', ' (you)') : ''}${x.net === 0 ? L(' — хост', ' — host') : ''}</div>`).join('');
    // Герои (src/heroes.js): карточки; занятые другими — серые, с именем, кто взял
    const mine = lobby.find(x => x.net === myNet);
    const want = mine ? mine.hero : myHero();
    panel.querySelector('#coop-heroes').innerHTML = HEROES.map(h => {
      const by = lobby.find(x => x.hero === h.id && x !== mine);
      const tip = L(h.about_ru, h.about_en) + (by ? ` — ${by.name}` : '');
      return `<div class="coop-hero${h.id === want ? ' mine' : ''}${by ? ' taken' : ''}" data-hero="${h.id}" title="${escapeHtml(tip)}">` +
        `<img src="assets/sprites/heroes/${h.id}.webp?v=1" alt="" onerror="this.style.visibility='hidden'"><span>${L(h.ru, h.en)}</span></div>`;
    }).join('');
    panel.querySelector('#coop-start').style.display = role === 'host' ? '' : 'none';
    // Сохранённый сетевой забег (у хоста): кто в нём был
    const save = role === 'host' && window.Menu ? window.Menu.loadCoop() : null;
    const cont = panel.querySelector('#coop-continue');
    cont.style.display = save && save.coop ? '' : 'none';
    if (save && save.coop) {
      cont.title = L('Сохранённый забег: ', 'Saved run: ') + (save.players || []).map(r => r.name + (r.dead ? ' ✝' : '')).join(', ');
      panel.querySelector('#coop-start').textContent = L('Начать заново', 'New run');
    }
    if (role === 'host') setStatus(lobby.length > 1 ? L('Можно начинать', 'Ready to start') : L('Ждём товарищей… Им — адрес этой страницы с IP твоего ПК', 'Waiting for friends… give them this page address with your PC IP'));
    else if (role === 'client' && lobby.length) setStatus(L('Ждём, пока хост начнёт', 'Waiting for the host to start'));
  }
  const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Хост ушёл или связь пропала: забег не кончился (хост продолжит из сохранения) — просто в меню
  function leaveToMenu(text) {
    started = false;
    role = null;
    if (ws) { closeStack = new Error().stack.slice(0, 600); ws.close(); }
    ['shop-modal', 'workshop-modal', 'canteen-modal', 'basement-modal', 'char-panel', 'dialog-panel', 'safe-panel', 'cards-modal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    gameState = 'GAMEOVER';
    document.getElementById('screen-menu').style.display = 'flex';
    updateUILanguage();
    setTimeout(() => alert(text), 50);
  }

  wrapSounds();
  wrapToast();
  wrapAnims();
  buildLobby();

  return {
    get started() { return started; },
    get role() { return role; },
    isHost: () => role === 'host' && started,
    isClient: () => role === 'client' && started,
    hostBegin, hostSend, hostBeforeUpdate, clientUpdate, sayTo, shakeAll, remoteInteract, onTravel, onGameOver, noteSoundAt, coopSnapshot,
    rpc, optimistic,
    enc, dec,
    dbg: () => ({ q: queue.length, last: lastSnap, ids: [...enemyById.keys()].slice(0, 20), lastClose, ws: ws && ws.readyState })
  };
})();
