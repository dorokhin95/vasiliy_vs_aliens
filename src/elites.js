// «Рарники» Промзоны — вожаки со свитой (docs/ELITES.md). Идея тестеров (2026-11-06): по локации ходят
// особые стаи. Вожак — с именем, крупнее и крепче, при нём свита из 3–4 жаб; одно-два свойства — у всей стаи.
// Стая крепче и бьёт больнее обычных жаб, с вожака — лут побогаче. Свойства — способности, которые
// предлагали тестеры: язык-липучка, гипноз, ядовитое облако, икринки с жижей, предсмертный «бабах»;
// и из списка «как в Diablo» — купол (стрельба снаружи гаснет: надо заходить внутрь), кровосос, шустрые.
//
// Загружается после game.js: enemies, players, player, damageEnemy и прочее — оттуда, одна глобальная область.
// Ход — у хоста: Elites.update — из цикла жаб (жаба в нём «текущая», её цель — player), Elites.updatePlayer —
// из updatePlayerSelf, Elites.updateWorld — раз в кадр. Клиенту приходят поля жаб (e.elite, e.dying, e.elHyp)
// и eliteHazards (src/net.js, WORLD) — рисует он сам

let eliteHazards = [];   // лужи, облака, икринки в полёте: { k, x, y, r, t, life } (k: goo | acid | cloud | egg)

(function () {
  // --- Стаи ---
  const PACKS_BY_TIER = { 2: 1, 3: 2, 4: 2 };     // стай на район такой угрозы: ★★ — одна, ★★★ и ★★★★ — по две
  const MINIONS = { 2: 3, 3: 3, 4: 4 };
  const AFFIXES_BY_TIER = { 2: 1, 3: 2, 4: 2 };
  const LEADER_TYPES = ['grunt', 'brute', 'sniper'];
  const SNIPER_LEADER = 0.2;   // доля стай со снайпером-вожаком (и снайперами в свите)
  const GRUNT_HP = { 2: 140, 3: 185, 4: 230 };   // пехотинец района, если в районе своих нет (как в spawnEnemyInRect)
  // Множители поверх обычной жабы Промзоны (PZ_HP_SCALE, PZ_DMG_SCALE): у громилы-вожака здоровья и так много
  const STATS = {
    leader: { hp: 2.5, hpBrute: 1.8, dmg: 1.4, scale: 1.3, radius: 1.15 },
    minion: { hp: 1.5, hpBrute: 1.5, dmg: 1.15, scale: 1.08, radius: 1.04 }
  };
  const LEASH = 140;           // свита не отходит от вожака дальше, пока стая не в бою
  const ALERT_R = 700;         // заметил один — бежит вся стая

  // --- Свойства ---
  const AFFIX = {
    bind: { ru: 'Липкий язык', en: 'Sticky Tongue', color: '#f472b6', grunts: true },
    hypno: { ru: 'Гипноз', en: 'Hypnosis', color: '#c084fc' },
    cloud: { ru: 'Ядовитый', en: 'Poisonous', color: '#a3e635' },
    eggs: { ru: 'Икромёт', en: 'Spawn Mortar', color: '#facc15' },
    burst: { ru: 'Раздутый', en: 'Bloater', color: '#fb923c' },
    dome: { ru: 'Купол', en: 'Dome', color: '#38bdf8' },
    vampire: { ru: 'Кровосос', en: 'Bloodsucker', color: '#ef4444' },
    fast: { ru: 'Шустрый', en: 'Swift', color: '#22d3ee' }
  };
  // Первое свойство стаи — из «заметных», без повторов, пока колода не кончится; второе — любое
  const PRIMARY = ['bind', 'hypno', 'cloud', 'eggs', 'burst', 'dome'];

  // Язык-липучка: попал — Василий прилип: ни шагу, ни переката, стрелять можно. Язык держит его дольше
  // После липучки immune кадров (считая от прилипания) не прилипнуть снова — свита не держит по кругу
  const BIND = { root: 66, hold: 40, immune: 140 };
  // Гипноз (только вожак): замах windup — круги из глаз, видно, что сейчас будет; кто к концу замаха в поле
  // зрения и не в перекате — hold кадров бредёт к жабе (walk от своей скорости), не стреляет и не катится.
  // Спасают стена между вами, дальность или перекат в конце замаха. Удар битой или дрелью в замахе сбивает,
  // в коопе удержание снимает урон по вожаку от товарища
  const HYPNO = { range: 420, windup: 60, hold: 96, cd: 600, first: 150, walk: 0.55, stop: 56 };
  // Ядовитый: попал по Василию — под ним облако (у каждой жабы не чаще cd); погибая — облако на месте
  const CLOUD = { r: 62, life: 240, cd: 150 };
  // Икромёт: навесом икринки туда, где Василий (у вожака 3, остальные — рядом); круг на земле — куда упадёт.
  // Лопнула — урон вокруг и жижа: тормозит и жжёт
  const EGGS = { range: 620, min: 90, flight: 40, gap: 9, cd: 420, cdMinion: 720, burstR: 52, dmg: 30, spread: 80, gooR: 64, gooLife: 300 };
  // Раздутый: убитый не падает, а раздувается fuse кадров — и лопается: урон по кругу (к краю edge от него),
  // отброс и лужа кислоты
  const BURST = { fuse: 66, fuseMinion: 48, r: 120, rMinion: 88, dmg: 70, dmgMinion: 45, edge: 0.5, acidR: 92, acidRMinion: 66, acidLife: 360 };
  // Купол над вожаком: выстрелы снаружи гаснут на нём — по стае внутри бьют только изнутри
  const DOME = { r: 175, h: 0.92 };   // h — высота свода от радиуса: выше дальнего края круга на земле
  const DOME_PASS = new Set(['bat', 'drill', 'stomp', 'shock', 'fire', 'rocket', 'thrown']);
  const VAMP = { k: 4 };       // кровосос лечится на столько своих ударов
  const FAST = 1.35;
  // Лужи и облака: урон в секунду и множитель скорости; кислоту перекат проскакивает, газ — нет
  const HZ = {
    goo: { dps: 6, slow: 0.5 },
    cloud: { dps: 12, slow: 1 },
    acid: { dps: 16, slow: 0.75, rollSafe: true }
  };
  const HZ_FX = { goo: 'goo', cloud: 'poison', acid: 'acid' };   // как выглядит ожог (src/fx.js)

  const NAME_A = [['Ржавый', 'Rusty'], ['Мазутный', 'Oily'], ['Бешеный', 'Rabid'], ['Гнилой', 'Rotten'], ['Жирный', 'Fat'],
    ['Кривой', 'Crooked'], ['Шламовый', 'Sludgy'], ['Пузатый', 'Potbellied'], ['Хромой', 'Lame'], ['Лютый', 'Fierce'],
    ['Бородавчатый', 'Warty'], ['Сопливый', 'Snotty']];
  const NAME_B = [['Квакун', 'Croaker'], ['Бугай', 'Bruiser'], ['Жабень', 'Toadling'], ['Хрипун', 'Wheezer'],
    ['Слизень', 'Slug'], ['Пузан', 'Paunch'], ['Брюхан', 'Gutbag'], ['Горлодёр', 'Throatripper']];

  const rnd = n => Math.floor(Math.random() * n);
  const ru = () => currentLang === 'ru';
  const has = (e, a) => !!(e && e.elite && e.elite.affixes.indexOf(a) >= 0);
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function nameOf(e) {
    const n = e.elite.name;
    const i = ru() ? 0 : 1;
    return NAME_A[n[0]][i] + ' ' + NAME_B[n[1]][i];
  }
  function affixLabel(a) { return ru() ? AFFIX[a].ru : AFFIX[a].en; }
  function leaderOf(e) {
    if (!e || !e.elite) return null;
    if (e.elite.role === 'leader') return e;
    for (let i = 0; i < enemies.length; i++) {
      const o = enemies[i];
      if (o.elite && o.elite.role === 'leader' && o.elite.pack === e.elite.pack && o.hp > 0) return o;
    }
    return null;
  }
  function volAt(x, y) {
    const p = localPlayer || player;
    return Math.max(0, 1 - Math.hypot(x - p.x, y - p.y) / 900);
  }
  // Площадка логова Долбильщика (game.js): стаи — подальше, чтобы не лезли в бой с боссом
  function nearLair(x, y, pad) {
    return Math.hypot(x - POUNDER_HOME.x, y - POUNDER_HOME.y) < POUNDER_LAIR_R + pad;
  }
  function addHazard(k, x, y, r, life) {
    eliteHazards.push({ k, x: Math.round(x), y: Math.round(y), r: Math.round(r), t: 0, life });
  }

  // ===================== Стаи на карте =====================
  // Новый уровень: прежние лужи и состояния — прочь; в Промзоне — стаи из уже расставленных жаб
  function onLevel() {
    eliteHazards = [];
    players.forEach(p => { p.rootT = 0; p.rootImmT = 0; p.hypnoT = 0; p.eliteSlow = 1; });
    if (currentLocation === 'promzona') makePacks();
  }

  // Сохранение до рарников (src/menu.js applyWorld): стаи — из уже восстановленных жаб. Сколько жаб добавилось
  function addPacks() {
    if (currentLocation !== 'promzona') return 0;
    const n0 = enemies.length;
    makePacks();
    return enemies.length - n0;
  }

  function makePacks() {
    const byTier = {};
    enemies.forEach(e => {
      if (e.elite || e.defense || LEADER_TYPES.indexOf(e.type) < 0 || !e.districtId) return;
      (byTier[e.tier] || (byTier[e.tier] = {}))[e.districtId] = true;
    });
    const deck = shuffle(PRIMARY.slice());
    let packId = 0;
    [4, 3, 2].forEach(tier => {
      shuffle(Object.keys(byTier[tier] || {})).slice(0, PACKS_BY_TIER[tier] || 0).forEach(did => {
        const cands = enemies.filter(e => e.districtId === did && !e.elite && !e.defense && LEADER_TYPES.indexOf(e.type) >= 0
          && !nearLair(e.x, e.y, 260));
        // Вожак — чаще пехотинец или громила (свита у них — пехотинцы с языками), снайпер — изредка
        const melee = cands.filter(e => e.type !== 'sniper');
        const pool = melee.length && Math.random() > SNIPER_LEADER ? melee : cands;
        if (pool.length) makePack(pool[rnd(pool.length)], ++packId, tier, deck);
      });
    });
  }

  function makePack(L, id, tier, deck) {
    const mType = L.type === 'sniper' ? 'sniper' : 'grunt';
    const affixes = [];
    const ok = a => affixes.indexOf(a) < 0 && !(AFFIX[a].grunts && mType !== 'grunt');
    let i = deck.findIndex(ok);
    if (i < 0) { deck.push(...shuffle(PRIMARY.slice())); i = deck.findIndex(ok); }
    affixes.push(deck.splice(i, 1)[0]);
    while (affixes.length < (AFFIXES_BY_TIER[tier] || 1)) {
      const pool = Object.keys(AFFIX).filter(ok);
      affixes.push(pool[rnd(pool.length)]);
    }
    // Свита — как рядовые жабы того же района (или вожак, если он того же вида)
    const tmpl = enemies.find(o => o !== L && o.districtId === L.districtId && o.type === mType && !o.elite)
      || (L.type === mType ? L : null);
    const base = tmpl
      ? { radius: tmpl.radius, hp: tmpl.maxHp, speed: tmpl.speed, aggroRadius: tmpl.aggroRadius, color: tmpl.color }
      : { radius: 22, hp: Math.round((GRUNT_HP[tier] || 140) * ENEMY_HP_SCALE * PZ_HP_SCALE), speed: 2.7, aggroRadius: 300, color: '#22c55e' };
    const name = [rnd(NAME_A.length), rnd(NAME_B.length)];
    promote(L, 'leader', id, affixes, name);
    const n = MINIONS[tier] || 3;
    for (let k = 0; k < n; k++) {
      const m = spawnMinion(L, mType, base, k, n);
      if (m) promote(m, 'minion', id, affixes, name);
    }
  }

  function spawnMinion(L, type, base, k, n) {
    for (let a = 0; a < 16; a++) {
      const ang = (k / n) * Math.PI * 2 + Math.random() * 0.8 + a * 0.4;
      const d = 60 + Math.random() * 50 + a * 6;
      const x = L.x + Math.cos(ang) * d, y = L.y + Math.sin(ang) * d * GROUND_SQUASH;
      if (checkWalkCollision(x, y, base.radius, FOOT_DY[type])) continue;
      if (insideFactoryShape(x, y + FOOT_DY[type]) || nearLair(x, y, 60)) continue;
      const m = {
        x, y, armor: 0, throwCooldown: 120 + rnd(240), startX: x, startY: y, bounds: L.bounds,
        districtId: L.districtId, tier: L.tier, radius: base.radius, hp: base.hp, maxHp: base.hp,
        speed: base.speed, type, color: base.color, aggroRadius: base.aggroRadius, isAggroed: false, hitFlash: 0,
        patrolAngle: Math.random() * Math.PI * 2, patrolTimer: Math.random() * 120 + 60,
        shootCooldown: Math.random() * 70 + 45
      };
      enemies.push(m);
      return m;
    }
    return null;
  }

  function promote(e, role, pack, affixes, name) {
    const S = STATS[role];
    e.maxHp = Math.round(e.maxHp * (e.type === 'brute' ? S.hpBrute : S.hp));
    e.hp = e.maxHp;
    // Крупнее — и попасть легче; если на новом месте тесно, остаётся как был
    const r2 = Math.round(e.radius * S.radius);
    if (!checkWalkCollision(e.x, e.y, r2, FOOT_DY[e.type])) e.radius = r2;
    if (affixes.indexOf('fast') >= 0) e.speed *= FAST;
    e.elite = { role, pack, affixes: affixes.slice(), name, dmg: S.dmg, scale: S.scale };
    e.elEggCd = role === 'leader' ? 90 + rnd(120) : 200 + rnd(400);
    e.elHypCd = HYPNO.first;
    if (role === 'leader') e.bonusLoot = { nonferrous: 2 + (e.tier || 2), tech_spirit: 1, alien_core: 1 };
    else if (Math.random() < 0.5) e.bonusLoot = { nonferrous: 1 };
  }

  // Сохранение (src/menu.js): что записать о рарнике — и как поднять его из записи (данные — с проверкой)
  function saveOf(e) {
    return e.elite ? { r: e.elite.role, p: e.elite.pack, a: e.elite.affixes, n: e.elite.name } : undefined;
  }
  function restore(e, d) {
    if (!d || typeof d !== 'object' || (d.r !== 'leader' && d.r !== 'minion')) return;
    const affixes = Array.isArray(d.a) ? d.a.filter(a => typeof a === 'string' && AFFIX.hasOwnProperty(a)).slice(0, 3) : [];
    if (!affixes.length) return;
    const n = Array.isArray(d.n) ? d.n : [];
    const name = [Math.abs(n[0] | 0) % NAME_A.length, Math.abs(n[1] | 0) % NAME_B.length];
    const S = STATS[d.r];
    e.elite = { role: d.r, pack: Math.max(1, Math.min(99, d.p | 0)), affixes, name, dmg: S.dmg, scale: S.scale };
    e.elEggCd = d.r === 'leader' ? 90 + rnd(120) : 200 + rnd(400);
    e.elHypCd = HYPNO.first;
  }

  // ===================== Ход жабы (хост) =====================
  // true — ход этой жабы на этом кадре закончен (раздувается или гипнотизирует)
  function update(e) {
    if (e.dying > 0) {
      e.dying--;
      e.hitFlash = 0;   // светится само брюхо (drawBloatGlow), белая вспышка удара не нужна
      e.lunge = null;
      e.squash = 0;
      if (e.dying === 0) pop(e);
      return true;
    }
    if (e.elCloudCd > 0) e.elCloudCd--;
    if (e.elVampFx > 0) e.elVampFx--;
    const L = leaderOf(e);
    if (!e.isAggroed) {
      e.elAlerted = false;
      if (e.elHyp) endHypno(e, false);
      // Свита тянется за вожаком
      if (L && L !== e && Math.hypot(L.x - e.x, L.y - e.y) > LEASH) {
        e.patrolAngle = Math.atan2(L.y - e.y, L.x - e.x);
        e.patrolTimer = Math.max(e.patrolTimer || 0, 20);
      }
      return false;
    }
    if (!e.elAlerted) {
      e.elAlerted = true;
      enemies.forEach(o => {
        if (o === e || !o.elite || o.elite.pack !== e.elite.pack || o.isAggroed) return;
        if (Math.hypot(o.x - e.x, o.y - e.y) > ALERT_R) return;
        o.isAggroed = true;
        o.elAlerted = true;
        addFloatingText(o.x, o.y - 25, '!', '#ef4444');
      });
      announce(L || e);
    }
    if (player.inSafe || player.dead || player.downT > 0) return false;
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (has(e, 'eggs')) updateEggs(e, dist);
    if (e.elite.role === 'leader' && has(e, 'hypno')) return updateHypno(e, dist);
    return false;
  }

  // Стая заметила Василия: имя вожака и свойства — плашкой
  function announce(L) {
    if (!L || !L.elite || L.elite.announced) return;
    L.elite = Object.assign({}, L.elite, { announced: true });
    showToast('☠ ' + nameOf(L), L.elite.affixes.map(affixLabel).join(' · '));
  }

  function updateEggs(e, dist) {
    if (e.elEggCd > 0) { e.elEggCd--; return; }
    if (dist < EGGS.min || dist > EGGS.range || e.lunge || e.throwState) return;
    const leader = e.elite.role === 'leader';
    const n = leader ? 3 : 1;
    const px = player.x, py = player.y + footDY(player);
    for (let i = 0; i < n; i++) {
      let tx = px, ty = py;
      if (i > 0) {
        const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * EGGS.spread;
        tx += Math.cos(a) * d;
        ty += Math.sin(a) * d * GROUND_SQUASH;
        if (checkBuildingCollision(tx, ty, 8)) { tx = px; ty = py; }
      }
      eliteHazards.push({
        k: 'egg', x0: Math.round(e.x), y0: Math.round(e.y + footDY(e)), x: Math.round(tx), y: Math.round(ty),
        t: -i * EGGS.gap, T: EGGS.flight + Math.round(dist / 18), h: Math.round(60 + dist * 0.14), big: leader ? 1 : 0
      });
    }
    e.elEggCd = (leader ? EGGS.cd : EGGS.cdMinion) + rnd(120);
    createParticles(e.x, e.y - 30, '#facc15', 6);
    SoundFX.tongue();
  }

  function updateHypno(e, dist) {
    const H = e.elHyp;
    if (!H) {
      if (e.elHypCd > 0) { e.elHypCd--; return false; }
      if (dist > HYPNO.range || player.hypnoT > 0 || e.lunge || e.throwState) return false;
      if (wallBetween(e.x, e.y, player.x, player.y)) return false;
      e.elHyp = { ph: 'w', t: 0, pid: player.id };
      e.squash = 0;
      addFloatingText(e.x, e.y - 70, ru() ? 'ГИПНОЗ!' : 'HYPNOSIS!', '#c084fc');
      return true;
    }
    H.t++;
    const p = players.find(o => o.id === H.pid);
    if (H.ph === 'w') {
      if (p) e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      if (e.type === 'sniper') e.gunPose = null;
      if (H.t < HYPNO.windup) return true;
      // Не ушёл из виду и не откатился — попался
      if (p && !p.dead && !(p.downT > 0) && !p.isRolling && !p.inSafe
          && Math.hypot(p.x - e.x, p.y - e.y) < HYPNO.range * 1.15 && !wallBetween(e.x, e.y, p.x, p.y)) {
        p.hypnoT = HYPNO.hold;
        p.hypnoX = Math.round(e.x);
        p.hypnoY = Math.round(e.y);
        H.ph = 'h';
        H.t = 0;
        addFloatingText(p.x, p.y - 56, ru() ? 'ЗАГИПНОТИЗИРОВАН!' : 'HYPNOTIZED!', '#c084fc');
      } else {
        endHypno(e, true);
        addFloatingText(e.x, e.y - 70, ru() ? 'СОРВАЛОСЬ' : 'RESISTED', '#a78bfa');
      }
      return true;
    }
    // Держит: Василий бредёт к нему, а вожак и свита тем временем бьют
    if (!p || !(p.hypnoT > 0) || p.dead || p.downT > 0) { endHypno(e, false); return false; }
    p.hypnoX = Math.round(e.x);
    p.hypnoY = Math.round(e.y);
    return false;
  }

  function endHypno(e, missed) {
    const H = e.elHyp;
    if (H && H.ph === 'h') {
      const p = players.find(o => o.id === H.pid);
      if (p) p.hypnoT = 0;
    }
    e.elHyp = null;
    e.elHypCd = missed ? HYPNO.cd / 2 : HYPNO.cd + rnd(180);
  }

  // ===================== Урон по стае и от неё =====================
  // Из damageEnemy, до урона: раздувшегося не добить, через купол снаружи не прострелить; заодно сбивает гипноз.
  // Возвращает итог удара, если он не прошёл, иначе null
  function beforeDamage(e, weapon, fromX, fromY) {
    if (e.dying > 0) return { dealt: 0, invuln: true };
    const blk = domeBlock(e, weapon, fromX, fromY);
    if (blk) return blk;
    const H = e.elHyp;
    if (H) {
      if (H.ph === 'w' && (weapon === 'bat' || weapon === 'drill')) {
        endHypno(e, true);
        addFloatingText(e.x, e.y - 70, ru() ? 'СБИТ!' : 'STAGGERED!', '#fbbf24');
      } else if (H.ph === 'h' && player.id !== H.pid && weapon !== 'rocket' && weapon !== 'thrown') {
        endHypno(e, false);
      }
    }
    return null;
  }

  // Вожак с куполом, под которым стоит e (или сам e)
  function domeOver(e) {
    if (!has(e, 'dome')) return null;
    const L = leaderOf(e);
    if (!L || L.dying > 0) return null;
    if (L !== e && !inGroundEllipse(e.x, e.y + footDY(e), L.x, L.y + footDY(L), DOME.r)) return null;
    return L;
  }

  function domeBlock(e, weapon, fromX, fromY) {
    if (DOME_PASS.has(weapon)) return null;
    const L = domeOver(e);
    if (!L) return null;
    // Откуда стреляли: выжившие — со своего места, игроки — со своего
    const sx = weapon === 'survivor' ? fromX : player.x;
    const sy = weapon === 'survivor' ? fromY : player.y + footDY(player);
    if (inGroundEllipse(sx, sy, L.x, L.y + footDY(L), DOME.r)) return null;
    domeSpark(L, sx, sy);
    return { dealt: 0, shielded: true };
  }

  function domeSpark(L, sx, sy) {
    const a = Math.atan2(sy - (L.y + footDY(L)), sx - L.x);
    const x = L.x + Math.cos(a) * DOME.r, y = L.y + footDY(L) + Math.sin(a) * DOME.r * GROUND_SQUASH - 24;
    spawnDirectionalSparks(x, y, a, 1.2, 5, '#7dd3fc', 3, 9, 8);
    L.elDomeFlash = 10;
    L.elDomeA = Math.round(a * 100) / 100;
  }

  // Пули игроков: залетев под купол снаружи, гаснут на нём (лазер и прочее без пуль — в domeBlock)
  let domes = [];
  function stopBullet(b) {
    for (let i = 0; i < domes.length; i++) {
      const L = domes[i];
      const lx = L.x, ly = L.y + footDY(L);
      if (!inGroundEllipse(b.x, b.y + 18, lx, ly, DOME.r)) continue;
      if (inGroundEllipse(player.x, player.y + footDY(player), lx, ly, DOME.r)) continue;
      domeSpark(L, player.x, player.y + footDY(player));
      return true;
    }
    return false;
  }

  // Жаба из стаи попала по Василию (он — player) на dmg
  function onHit(e, dmg) {
    if (!e || !e.elite || !(dmg > 0)) return;
    if (has(e, 'cloud') && !(e.elCloudCd > 0)) {
      e.elCloudCd = CLOUD.cd;
      addHazard('cloud', player.x, player.y + footDY(player), CLOUD.r, CLOUD.life);
    }
    if (has(e, 'vampire') && e.hp > 0 && !(e.dying > 0) && e.hp < e.maxHp) {
      e.hp = Math.min(e.maxHp, e.hp + dmg * VAMP.k);
      if (!(e.elVampFx > 0) && window.Fx) {
        window.Fx.drain(player, e);
        e.elVampFx = 20;
      }
    }
  }

  // Язык попал (L — выпад, game.js updateGruntTongue): липучка держит
  function onTongue(e, L, dmg) {
    onHit(e, dmg);
    if (!has(e, 'bind') || player.dead || player.downT > 0 || player.rootImmT > 0) return;
    player.rootT = BIND.root;
    player.rootImmT = BIND.immune;
    L.holdExtra = BIND.hold;
    addFloatingText(player.x, player.y - 50, ru() ? 'ПРИЛИП!' : 'STUCK!', '#f472b6');
  }

  // Из handleEnemyKilled: true — жаба ещё не ушла (раздувается)
  function onKilled(dead) {
    if (!dead.elite) return false;
    if (has(dead, 'burst') && !dead.popped) {
      dead.hp = 1;
      dead.dying = dead.elite.role === 'leader' ? BURST.fuse : BURST.fuseMinion;
      dead.lunge = null;
      dead.squash = 0;
      dead.gunPose = null;
      if (dead.throwState) cancelThrow(dead);
      if (dead.elHyp) endHypno(dead, false);
      addFloatingText(dead.x - 30, dead.y - 110, ru() ? 'СЕЙЧАС ЛОПНЕТ!' : 'ABOUT TO POP!', '#fb923c');
      return true;
    }
    if (dead.elHyp) endHypno(dead, false);
    if (has(dead, 'cloud')) addHazard('cloud', dead.x, dead.y + footDY(dead), CLOUD.r * 1.2, CLOUD.life);
    if (dead.elite.role === 'leader') addFloatingText(dead.x - 40, dead.y - 70, '☠ ' + nameOf(dead), '#fde047');
    return false;
  }

  function pop(e) {
    const leader = e.elite.role === 'leader';
    const R = leader ? BURST.r : BURST.rMinion;
    const D = leader ? BURST.dmg : BURST.dmgMinion;
    const fx = e.x, fy = e.y + footDY(e);
    forEachPlayer(p => {
      if (p.isRolling || p.inSafe) return;
      const px = p.x, py = p.y + footDY(p);
      if (!inGroundEllipse(px, py, fx, fy, R + p.radius * 0.5) || playerDodged()) return;
      const dx = (px - fx) / R, dy = (py - fy) / (R * GROUND_SQUASH);
      const k = 1 - (1 - BURST.edge) * Math.min(1, Math.sqrt(dx * dx + dy * dy));
      if (window.Fx) window.Fx.from(fx, fy);
      const taken = armorAbsorb(D * k, 'ranged');
      p.hp -= taken;
      addFloatingText(p.x, p.y - 30, `-${Math.round(taken)}`, '#fb923c');
      const a = Math.atan2(py - fy, px - fx);
      slideMove(p, Math.cos(a) * 26, Math.sin(a) * 26, p.radius);
      if (p.hp <= 0) gameOver();
      else if (p === localPlayer) shakeScreen(12, 10);
    });
    addHazard('acid', fx, fy, leader ? BURST.acidR : BURST.acidRMinion, BURST.acidLife);
    if (window.Fx) window.Fx.pop(fx, fy, R);
    spawnDirectionalSparks(e.x, e.y - 24, -Math.PI / 2, Math.PI * 2, leader ? 14 : 9, '#fdba74', 3, 11, 16);
    SoundFX.explosion(0.7 * volAt(fx, fy));
    e.dying = 0;
    e.popped = true;
    e.hp = 0;
  }

  function eggLand(h) {
    const big = !!h.big;
    forEachPlayer(p => {
      if (p.isRolling || p.inSafe) return;
      if (!inGroundEllipse(p.x, p.y + footDY(p), h.x, h.y, EGGS.burstR + p.radius * 0.5) || playerDodged()) return;
      if (window.Fx) window.Fx.from(h.x, h.y);
      const taken = armorAbsorb(EGGS.dmg * (big ? 1 : 0.7), 'ranged');
      p.hp -= taken;
      addFloatingText(p.x, p.y - 30, `-${Math.round(taken)}`, '#facc15');
      if (p.hp <= 0) gameOver();
    });
    addHazard('goo', h.x, h.y, EGGS.gooR * (big ? 1 : 0.8), EGGS.gooLife);
    if (window.Fx) window.Fx.eggSplat(h.x, h.y);
    SoundFX.explosion(0.22 * volAt(h.x, h.y));
  }

  // ===================== Раз в кадр (хост) =====================
  function updateWorld() {
    domes = enemies.filter(e => e.elite && e.elite.role === 'leader' && !(e.dying > 0) && has(e, 'dome'));
    domes.forEach(L => { if (L.elDomeFlash > 0) L.elDomeFlash--; });
    for (let i = eliteHazards.length - 1; i >= 0; i--) {
      const h = eliteHazards[i];
      h.t++;
      if (h.k === 'egg') {
        if (h.t >= h.T) { eggLand(h); eliteHazards.splice(i, 1); }
        continue;
      }
      if (h.t >= h.life) eliteHazards.splice(i, 1);
    }
  }

  // ===================== Василий (из updatePlayerSelf, он — player) =====================
  // Таймеры липучки и гипноза; лужи и облака: урон и player.eliteSlow — множитель скорости
  function updatePlayer() {
    if (player.rootT > 0) player.rootT--;
    if (player.rootImmT > 0) player.rootImmT--;
    if (player.hypnoT > 0) player.hypnoT--;
    // Одинаковые лужи (облака) друг на друга не складываются: от каждого вида — одна
    let slow = 1, dps = 0, fx = null, fxDps = 0;
    if (eliteHazards.length && !player.inSafe) {
      const px = player.x, py = player.y + footDY(player);
      const hit = {};
      for (let i = 0; i < eliteHazards.length; i++) {
        const h = eliteHazards[i];
        const d = HZ[h.k];
        if (!d || hit[h.k] || !inGroundEllipse(px, py, h.x, h.y, h.r)) continue;
        hit[h.k] = true;
        if (d.slow < slow) slow = d.slow;
        if (!(d.rollSafe && player.isRolling)) {
          dps += d.dps;
          if (d.dps > fxDps) { fxDps = d.dps; fx = HZ_FX[h.k]; }
        }
      }
    }
    player.eliteSlow = slow;
    if (dps > 0 && !player.dead && !(player.downT > 0)) {
      const taken = armorAbsorb(dps / 60, 'ranged', fx);
      player.hp -= taken;
      player.elDot = (player.elDot || 0) + taken;
      player.elDotT = (player.elDotT || 0) + 1;
      if (player.elDotT >= 30) {
        if (player.elDot >= 1) addFloatingText(player.x + 14, player.y - 30, `-${Math.round(player.elDot)}`, '#a3e635');
        player.elDot = 0;
        player.elDotT = 0;
      }
      if (player.hp <= 0) gameOver();
    }
  }

  // ===================== Отрисовка =====================
  // Тяжёлое — форма лужи, клубы облака, соты купола, спираль гипноза — рисуется один раз в спрайт
  // и кэшируется; каждый кадр — только движение: пузыри, пар, мерцание, вращение
  const sprites = new Map();
  function cached(key, make) {
    let c = sprites.get(key);
    if (!c) {
      c = make();
      sprites.set(key, c);
      if (sprites.size > 90) sprites.delete(sprites.keys().next().value);
    }
    return c;
  }
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  function scaleOf(e) {
    if (!e.elite) return 1;
    let k = e.elite.scale || 1;
    if (e.dying > 0) {
      const fuse = e.elite.role === 'leader' ? BURST.fuse : BURST.fuseMinion;
      const s = 1 - e.dying / fuse;
      k *= 1 + 0.45 * s + Math.sin(s * 40) * 0.04 * s;
    }
    return k;
  }

  const inView = (x, y, x0, x1, y0, y1, pad) => x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad;
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
  }
  const easeOutBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

  // --- Лужи: жижа икринок, кислота раздутого, липучка у ног ---
  const PUDDLE = {
    goo: { edge: '#4a3f0b', mid: '#b5a215', core: '#fefce8', rim: 'rgba(48, 38, 6, 0.7)', alpha: 0.72, bubble: '#fef9c3' },
    acid: { edge: '#1a2e05', mid: '#4d7c0f', core: '#d9f99d', rim: 'rgba(20, 35, 4, 0.85)', alpha: 0.88, bubble: '#ecfccb' },
    pink: { edge: '#831843', mid: '#db2777', core: '#fbcfe8', rim: 'rgba(80, 7, 36, 0.75)', alpha: 0.85, bubble: '#fdf2f8' }
  };

  function puddleSprite(kind, r, seed) {
    return cached(`p|${kind}|${r}|${seed}`, () => {
      const P = PUDDLE[kind];
      const W = r * 2.7 + 10;
      const c = makeCanvas(W, W * GROUND_SQUASH + 10), g = c.getContext('2d');
      const R = Fx.rng(seed);
      g.translate(c.width / 2, c.height / 2);
      g.scale(1, GROUND_SQUASH);
      const main = Fx.blobPoints(r, 16, 0.2, R);
      // Тень-подтёк: лужа чуть утоплена в землю
      g.save();
      g.translate(1, 4);
      Fx.blobPath(g, main);
      g.fillStyle = 'rgba(0, 0, 0, 0.32)';
      g.fill();
      g.restore();
      const grad = g.createRadialGradient(-r * 0.22, -r * 0.28, r * 0.04, 0, 0, r * 1.15);
      grad.addColorStop(0, P.core);
      grad.addColorStop(0.42, P.mid);
      grad.addColorStop(1, P.edge);
      g.fillStyle = grad;
      Fx.blobPath(g, main);
      g.fill();
      g.lineWidth = 2.4;
      g.strokeStyle = P.rim;
      g.stroke();
      // Омут поглубже — темнее
      g.save();
      g.globalAlpha = 0.3;
      g.translate(r * 0.12, r * 0.1);
      g.fillStyle = P.edge;
      Fx.blobPath(g, Fx.blobPoints(r * 0.42, 8, 0.4, R));
      g.fill();
      g.restore();
      // Капли-спутники у края
      const nSat = 5 + Math.floor(R() * 5);
      for (let i = 0; i < nSat; i++) {
        const a = R() * Math.PI * 2, d = r * (1.04 + R() * 0.32), rr = r * (0.05 + R() * 0.09);
        g.beginPath();
        g.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, Math.PI * 2);
        g.fillStyle = P.mid;
        g.fill();
        g.lineWidth = 1.1;
        g.strokeStyle = P.rim;
        g.stroke();
      }
      if (kind === 'goo') {
        // Икра в жиже: прозрачные шарики с тёмной точкой и осколки скорлупы
        for (let i = 0; i < 9; i++) {
          const a = R() * Math.PI * 2, d = r * 0.75 * Math.sqrt(R()), rr = 2.2 + R() * 2.4;
          const x = Math.cos(a) * d, y = Math.sin(a) * d;
          g.fillStyle = 'rgba(254, 249, 195, 0.75)';
          g.beginPath();
          g.arc(x, y, rr, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(28, 25, 23, 0.85)';
          g.beginPath();
          g.arc(x + rr * 0.2, y + rr * 0.15, rr * 0.38, 0, Math.PI * 2);
          g.fill();
        }
        for (let i = 0; i < 5; i++) {
          const a = R() * Math.PI * 2, d = r * 0.8 * R(), s = 3 + R() * 4;
          g.save();
          g.translate(Math.cos(a) * d, Math.sin(a) * d);
          g.rotate(R() * 6.28);
          g.fillStyle = 'rgba(245, 245, 244, 0.85)';
          g.beginPath();
          g.moveTo(-s, 0);
          g.lineTo(s * 0.6, -s * 0.7);
          g.lineTo(s * 0.4, s * 0.6);
          g.closePath();
          g.fill();
          g.restore();
        }
      } else if (kind === 'acid') {
        // Пена по краю
        g.fillStyle = 'rgba(236, 252, 203, 0.55)';
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 + R() * 0.2, d = r * (0.8 + R() * 0.12);
          g.beginPath();
          g.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + R() * 2.2, 0, Math.PI * 2);
          g.fill();
        }
      }
      // Блики на поверхности
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      g.lineWidth = 2.4;
      g.beginPath();
      g.arc(-r * 0.12, -r * 0.08, r * 0.62, Math.PI * 1.08, Math.PI * 1.42);
      g.stroke();
      g.fillStyle = 'rgba(255, 255, 255, 0.45)';
      g.beginPath();
      g.ellipse(-r * 0.35, -r * 0.42, r * 0.14, r * 0.06, -0.4, 0, Math.PI * 2);
      g.fill();
      return c;
    });
  }

  function drawPuddle(ctx, h, now) {
    const P = PUDDLE[h.k];
    const seed = Fx.seedOf(h.x, h.y);
    const spr = puddleSprite(h.k, h.r, seed);
    const grow = 0.25 + 0.75 * easeOutBack(Math.min(1, h.t / 18));
    const fade = Math.min(1, (h.life - h.t) / 60);
    const s = grow * (0.86 + 0.14 * fade);
    ctx.save();
    ctx.globalAlpha = P.alpha * fade;
    ctx.drawImage(spr, h.x - spr.width * s / 2, h.y - spr.height * s / 2, spr.width * s, spr.height * s);
    // Блик ползёт по поверхности
    ctx.globalCompositeOperation = 'lighter';
    const sh = (now * 0.3 + (seed % 100) / 100) % 1;
    const gx = h.x + (sh - 0.5) * h.r * 1.1;
    const gr = ctx.createRadialGradient(gx, h.y, 0, gx, h.y, h.r * 0.45);
    gr.addColorStop(0, hexA(P.bubble, 0.18 * fade));
    gr.addColorStop(1, hexA(P.bubble, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.ellipse(gx, h.y, h.r * 0.45, h.r * 0.45 * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Пузыри: растут и лопаются колечком
    const R = Fx.rng(seed ^ 0x9e3779b9);
    for (let i = 0; i < 7; i++) {
      const per = 0.9 + R() * 1.4, off = R();
      const a = R() * 6.28, d = h.r * 0.72 * Math.sqrt(R()) * s;
      const bx = h.x + Math.cos(a) * d, by = h.y + Math.sin(a) * d * GROUND_SQUASH;
      const ph = (now / per + off) % 1;
      if (ph < 0.8) {
        const rr = 1 + ph * 4.2;
        ctx.globalAlpha = fade * 0.75;
        ctx.fillStyle = hexA(P.bubble, 0.35);
        ctx.strokeStyle = hexA(P.bubble, 0.85);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by - rr * 0.6, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(bx - rr * 0.45, by - rr * 1.15, 1.4, 1.4);
      } else {
        const q = (ph - 0.8) / 0.2;
        ctx.globalAlpha = fade * (1 - q) * 0.8;
        ctx.strokeStyle = hexA(P.bubble, 0.9);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(bx, by, 4 + q * 9, (4 + q * 9) * GROUND_SQUASH, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Кислота курится едким паром — над фигурами
  function drawAcidSteam(ctx, h, now) {
    const seed = Fx.seedOf(h.x, h.y);
    const fade = Math.min(1, h.t / 20) * Math.min(1, (h.life - h.t) / 60);
    for (let i = 0; i < 6; i++) {
      const ph = (now * 0.42 + i / 6 + (seed % 7) / 7) % 1;
      const sx = h.x + Math.sin(i * 2.7 + seed) * h.r * 0.55 + Math.sin(now * 1.3 + i) * 6;
      const sy = h.y - 4 - ph * 54;
      Fx.glow(ctx, sx, sy, 7 + ph * 16, '#d9f99d', Math.sin(ph * Math.PI) * 0.22 * fade);
    }
  }

  // --- Ядовитое облако: клубы газа, споры, пятно на земле ---
  function puffSprite(v) {
    return cached('puff' + v, () => {
      const S = 128, c = makeCanvas(S, S), g = c.getContext('2d');
      const R = Fx.rng(1000 + v * 77);
      for (let i = 0; i < 28; i++) {
        const a = R() * 6.28, d = R() * S * 0.24;
        const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.8;
        const r = S * (0.12 + R() * 0.16);
        const gr = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
        const top = y < S / 2;
        gr.addColorStop(0, top ? 'rgba(236, 252, 203, 0.85)' : 'rgba(190, 242, 100, 0.75)');
        gr.addColorStop(0.5, 'rgba(132, 204, 22, 0.6)');
        gr.addColorStop(0.8, 'rgba(77, 124, 15, 0.3)');
        gr.addColorStop(1, 'rgba(54, 83, 20, 0)');
        g.fillStyle = gr;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      // Низ клуба в тени — объём; тёмные завитки внутри
      g.globalCompositeOperation = 'source-atop';
      const sh = g.createLinearGradient(0, S * 0.25, 0, S * 0.85);
      sh.addColorStop(0, 'rgba(26, 46, 5, 0)');
      sh.addColorStop(1, 'rgba(26, 46, 5, 0.55)');
      g.fillStyle = sh;
      g.fillRect(0, 0, S, S);
      g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = `rgba(26, 46, 5, ${0.18 + R() * 0.15})`;
        g.lineWidth = 3 + R() * 5;
        g.beginPath();
        const cx = S * (0.3 + R() * 0.4), cy = S * (0.35 + R() * 0.35), rr = S * (0.08 + R() * 0.12);
        g.arc(cx, cy, rr, R() * 6.28, R() * 6.28 + 2.2 + R() * 1.5);
        g.stroke();
      }
      return c;
    });
  }

  function drawCloudStain(ctx, h) {
    const fade = Math.min(1, h.t / 20) * Math.min(1, (h.life - h.t) / 50);
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(1, GROUND_SQUASH);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, h.r * 1.1);
    g.addColorStop(0, `rgba(54, 83, 20, ${0.35 * fade})`);
    g.addColorStop(0.7, `rgba(77, 124, 15, ${0.22 * fade})`);
    g.addColorStop(1, 'rgba(77, 124, 15, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, h.r * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCloud(ctx, h, now) {
    const fade = Math.min(1, h.t / 20) * Math.min(1, (h.life - h.t) / 50);
    const grow = 0.45 + 0.55 * easeOutBack(Math.min(1, h.t / 26));
    const seed = Fx.seedOf(h.x, h.y);
    for (let k = 0; k < 10; k++) {
      const dir = k % 2 ? 1 : -1;
      const a = k * 0.7 + (seed % 10) + now * 0.2 * dir;
      const d = h.r * (0.08 + 0.58 * ((k * 0.618) % 1)) * grow;
      const px = h.x + Math.cos(a) * d;
      const py = h.y + Math.sin(a) * d * GROUND_SQUASH - 20 - 26 * ((k * 0.37) % 1) - Math.sin(now * 1.5 + k) * 3;
      const sz = h.r * (1.1 + 0.2 * Math.sin(now * 1.1 + k * 1.7)) * grow;
      ctx.save();
      ctx.globalAlpha = 0.78 * fade;
      ctx.translate(px, py);
      ctx.rotate(now * 0.14 * dir + k);
      ctx.drawImage(puffSprite(k % 3), -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
    // Споры — светлые точки всплывают и гаснут
    ctx.save();
    for (let k = 0; k < 14; k++) {
      const ph = (now * 0.28 + k * 0.137 + (seed % 13) / 13) % 1;
      const sx = h.x + Math.sin(k * 12.9898 + seed) * h.r * 0.8 + Math.sin(now * 1.5 + k) * 5;
      const sy = h.y - 6 - ph * 70;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9 * fade;
      ctx.fillStyle = k % 3 ? '#ecfccb' : '#fde047';
      ctx.beginPath();
      ctx.arc(sx, sy, k % 4 ? 1.2 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Икринки: круг-прицел на земле, яйцо в полёте ---
  function drawEggTarget(ctx, h, now) {
    const s = Math.min(1, Math.max(0, h.t) / h.T);
    const r = EGGS.burstR;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(1, GROUND_SQUASH);
    // Пятно темнеет: икринка всё ближе
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(250, 204, 21, ${0.06 + 0.22 * s})`);
    g.addColorStop(1, `rgba(234, 179, 8, ${0.12 + 0.2 * s})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Пунктир по краю крутится
    ctx.setLineDash([9, 6]);
    ctx.lineDashOffset = -now * 40;
    ctx.strokeStyle = `rgba(253, 224, 71, ${0.55 + 0.4 * s})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Сжимающееся кольцо — сколько осталось до падения
    ctx.strokeStyle = `rgba(254, 249, 195, ${0.5 + 0.5 * s})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, r * (1 - s)), 0, Math.PI * 2);
    ctx.stroke();
    // Уголки сходятся к центру
    ctx.fillStyle = `rgba(253, 224, 71, ${0.6 + 0.4 * s})`;
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate(k * Math.PI / 2 + Math.PI / 4);
      const d = r * (0.62 + 0.3 * (1 - s));
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + 9, -6);
      ctx.lineTo(d + 9, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawEggBody(ctx, x, y, r, rot, now, i) {
    ctx.save();
    ctx.translate(x, y);
    // Свечение вокруг
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
    glow.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
    glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(rot);
    // Студенистая оболочка на просвет, внутри — желток
    const jelly = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r * 1.3);
    jelly.addColorStop(0, 'rgba(254, 252, 232, 0.55)');
    jelly.addColorStop(0.7, 'rgba(253, 230, 138, 0.42)');
    jelly.addColorStop(1, 'rgba(202, 138, 4, 0.6)');
    ctx.fillStyle = jelly;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.3, r * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(254, 249, 195, 0.75)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const yolk = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 0.85);
    yolk.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    yolk.addColorStop(0.6, 'rgba(234, 179, 8, 0.9)');
    yolk.addColorStop(1, 'rgba(161, 98, 7, 0.9)');
    ctx.fillStyle = yolk;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    // Зародыш свернулся запятой и шевелится
    const wig = Math.sin(now * 16 + i * 2) * 0.35;
    ctx.save();
    ctx.rotate(wig);
    ctx.strokeStyle = 'rgba(54, 83, 20, 0.85)';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, Math.PI * 0.15, Math.PI * 1.25);
    ctx.stroke();
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, Math.PI * 1.25, Math.PI * 1.6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(26, 46, 5, 0.9)';
    ctx.beginPath();
    ctx.arc(Math.cos(Math.PI * 0.1) * r * 0.36, Math.sin(Math.PI * 0.1) * r * 0.36, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Блик
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.45, -r * 0.38, r * 0.32, r * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEggFlight(ctx, h, i, now, x0, x1, y0, y1) {
    const s = Math.min(1, h.t / h.T);
    const pos = q => [h.x0 + (h.x - h.x0) * q, h.y0 + (h.y - h.y0) * q, 4 * h.h * q * (1 - q) + 30 * (1 - q)];
    const [x, gy, z] = pos(s);
    if (!inView(x, gy, x0, x1, y0, y1, 140)) return;
    const r = h.big ? 9 : 7;
    // Тень растёт, пока падает
    const near = 1 - Math.min(1, z / (h.h + 30));
    ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + 0.25 * near})`;
    ctx.beginPath();
    ctx.ellipse(x, gy, r * (0.6 + 0.7 * near), r * (0.6 + 0.7 * near) * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    // Слизь тянется следом
    for (let k = 1; k <= 5; k++) {
      const [tx, tgy, tz] = pos(Math.max(0, s - k * 0.03));
      ctx.fillStyle = `rgba(234, 179, 8, ${0.5 - k * 0.08})`;
      ctx.beginPath();
      ctx.arc(tx, tgy - tz, r * (0.55 - k * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    const [x2, gy2, z2] = pos(Math.min(1, s + 0.02));
    const ang = Math.atan2((gy2 - z2) - (gy - z), x2 - x);
    drawEggBody(ctx, x, gy - z, r, ang + Math.sin(now * 12 + i) * 0.2, now, i);
  }

  // --- Купол: соты, френель, полоса-развёртка, рябь от попаданий ---
  function domePath(g, x, y, R, H) {
    g.beginPath();
    g.ellipse(x, y, R, R * GROUND_SQUASH, 0, 0, Math.PI);   // ближний край по земле
    g.ellipse(x, y, R, H, 0, Math.PI, Math.PI * 2);        // свод
    g.closePath();
  }

  function hexSprite(R, H) {
    return cached('hex' + R, () => {
      const W = R * 2 + 8, Hh = H + R * GROUND_SQUASH + 8;
      const c = makeCanvas(W, Hh), g = c.getContext('2d');
      const cx = W / 2, base = H + 4;
      const s = 12, w = Math.sqrt(3) * s;
      g.strokeStyle = '#e0f2fe';
      g.lineWidth = 1.3;
      for (let row = 0, y = 0; y < Hh + s; row++, y += s * 1.5) {
        for (let x = (row % 2) * w / 2; x < W + w; x += w) {
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = Math.PI / 6 + k * Math.PI / 3;
            const px = x + Math.cos(a) * s * 0.92, py = y + Math.sin(a) * s * 0.92;
            if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.closePath();
          g.stroke();
        }
      }
      // Френель: к краю купола соты ярче, в середине почти не видны
      g.globalCompositeOperation = 'destination-in';
      const gr = g.createRadialGradient(cx, base - H * 0.45, R * 0.1, cx, base - H * 0.3, R * 1.0);
      gr.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
      gr.addColorStop(0.65, 'rgba(0, 0, 0, 0.4)');
      gr.addColorStop(1, 'rgba(0, 0, 0, 1)');
      g.fillStyle = gr;
      domePath(g, cx, base, R, H);
      g.fill();
      return c;
    });
  }

  function drawDome(ctx, e, now) {
    const R = DOME.r, H = R * DOME.h;
    const x = e.x, y = e.y + footDY(e);
    const fl = (e.elDomeFlash || 0) / 10;
    const hs = hexSprite(R, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Свечение по земле у края
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, GROUND_SQUASH);
    const gg = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R * 1.08);
    gg.addColorStop(0, 'rgba(14, 165, 233, 0)');
    gg.addColorStop(0.85, `rgba(56, 189, 248, ${0.14 + fl * 0.2})`);
    gg.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Тело купола: прозрачное в середине, светится к краю
    const body = ctx.createRadialGradient(x, y - H * 0.45, R * 0.15, x, y - H * 0.3, R * 1.0);
    body.addColorStop(0, 'rgba(14, 165, 233, 0.02)');
    body.addColorStop(0.7, `rgba(14, 165, 233, ${0.07 + fl * 0.1})`);
    body.addColorStop(1, `rgba(56, 189, 248, ${0.26 + fl * 0.3})`);
    ctx.fillStyle = body;
    domePath(ctx, x, y, R, H);
    ctx.fill();
    // Соты
    ctx.globalAlpha = 0.2 + 0.45 * fl + 0.05 * Math.sin(now * 2.3);
    ctx.drawImage(hs, x - hs.width / 2, y - H - 4);
    // Полоса-развёртка ползёт снизу вверх
    ctx.save();
    domePath(ctx, x, y, R, H);
    ctx.clip();
    const band = (now * 0.35) % 1;
    const by = y + R * GROUND_SQUASH - band * (H + R * GROUND_SQUASH);
    ctx.beginPath();
    ctx.rect(x - R, by - 12, R * 2, 24);
    ctx.clip();
    ctx.globalAlpha = 0.6 * Math.sin(band * Math.PI);
    ctx.drawImage(hs, x - hs.width / 2, y - H - 4);
    ctx.restore();
    // Кромка свода и блик
    ctx.globalAlpha = 0.65 + 0.35 * fl;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, R, H, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.45 + 0.3 * fl;
    ctx.beginPath();
    ctx.ellipse(x, y, R, R * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(x, y, R * 0.84, H * 0.86, 0, Math.PI * 1.17, Math.PI * 1.4);
    ctx.stroke();
    // Рябь там, куда попали
    if (fl > 0 && typeof e.elDomeA === 'number') {
      const a = e.elDomeA;
      const px = x + Math.cos(a) * R * 0.93, py = y + Math.sin(a) * R * GROUND_SQUASH * 0.93 - H * 0.38;
      const rr = 10 + (1 - fl) * 46;
      const rg = ctx.createRadialGradient(px, py, 0, px, py, rr);
      rg.addColorStop(0, `rgba(255, 255, 255, ${0.9 * fl})`);
      rg.addColorStop(0.35, `rgba(125, 211, 252, ${0.6 * fl})`);
      rg.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(186, 230, 253, ${fl})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 0.9, rr * 0.6, a, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Гипноз: спираль, светящиеся глаза, волна к Василию ---
  function spiralSprite() {
    return cached('spiral', () => {
      const S = 112, c = makeCanvas(S, S), g = c.getContext('2d');
      g.translate(S / 2, S / 2);
      const bg = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
      bg.addColorStop(0, '#fdf4ff');
      bg.addColorStop(0.5, '#f0abfc');
      bg.addColorStop(1, '#c026d3');
      g.fillStyle = bg;
      g.beginPath();
      g.arc(0, 0, S / 2 - 2, 0, Math.PI * 2);
      g.fill();
      // Два толстых витка — читаются и в мелком размере
      g.lineCap = 'round';
      g.strokeStyle = '#3b0764';
      g.lineWidth = 6;
      for (let arm = 0; arm < 2; arm++) {
        g.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.01) {
          const a = arm * Math.PI + t * Math.PI * 3.5;
          const r = 3 + t * (S / 2 - 8);
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
      }
      g.strokeStyle = 'rgba(59, 7, 100, 0.9)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, S / 2 - 3, 0, Math.PI * 2);
      g.stroke();
      return c;
    });
  }

  function drawSpiral(ctx, x, y, size, rot, alpha) {
    const sp = spiralSprite();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(sp, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // Волна: две синусоиды-пряди от жабы к Василию; pull — шевроны бегут к жабе (тянет)
  function drawWave(ctx, xa, ya, xb, yb, now, alpha, pull) {
    const dx = xb - xa, dy = yb - ya, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let strand = 0; strand < 2; strand++) {
      const ph = strand * Math.PI;
      const path = () => {
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) {
          const q = i / 48;
          const env = Math.sin(q * Math.PI) * (pull ? 1 : 0.8);
          const off = Math.sin(q * L / 16 - now * 10 + ph) * 8 * env;
          const px = xa + dx * q + nx * off, py = ya + dy * q + ny * off;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      };
      path();
      ctx.strokeStyle = `rgba(192, 132, 252, ${0.22 * alpha})`;
      ctx.lineWidth = 7;
      ctx.stroke();
      path();
      ctx.strokeStyle = `rgba(245, 208, 254, ${0.85 * alpha})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    // Шевроны
    const ang = Math.atan2(dy, dx) + (pull ? Math.PI : 0);
    for (let k = 0; k < 5; k++) {
      let q = (now * 0.9 + k / 5) % 1;
      if (pull) q = 1 - q;
      const px = xa + dx * q, py = ya + dy * q;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.globalAlpha = alpha * Math.sin(q * Math.PI);
      ctx.strokeStyle = '#f5d0fe';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(3, 0);
      ctx.lineTo(-4, 6);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHypno(ctx, e, now) {
    const Hy = e.elHyp;
    const p = players.find(o => o.id === Hy.pid);
    const k = scaleOf(e);
    const hx = e.x, hy = e.y + 10 - (e.radius + 20) * k;
    if (Hy.ph === 'w') {
      const s = Math.min(1, Hy.t / HYPNO.windup);
      // Кольца расходятся от головы
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let m = 0; m < 3; m++) {
        const ph = (now * 1.4 + m / 3) % 1;
        ctx.globalAlpha = (1 - ph) * (0.25 + 0.65 * s);
        ctx.strokeStyle = m % 2 ? '#e879f9' : '#c084fc';
        ctx.lineWidth = 3.5 * (1 - ph) + 0.5;
        ctx.beginPath();
        ctx.ellipse(hx, hy, 10 + ph * 64, (10 + ph * 64) * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Глаза горят
      for (const sx of [-6, 6]) {
        const ex = hx + sx * k, ey = hy + 2;
        const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 6 + 8 * s);
        g.addColorStop(0, `rgba(253, 244, 255, ${0.6 + 0.4 * s})`);
        g.addColorStop(0.4, `rgba(232, 121, 249, ${0.5 + 0.4 * s})`);
        g.addColorStop(1, 'rgba(192, 38, 211, 0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ex, ey, 6 + 8 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // Спираль раскручивается перед мордой
      drawSpiral(ctx, hx, hy - 4, 16 + 34 * s, now * (5 + 6 * s), 0.3 + 0.65 * s);
      if (p) drawWave(ctx, hx, hy, p.x, p.y - 44, now, 0.2 + 0.55 * s, false);
    } else if (p) {
      drawWave(ctx, hx, hy, p.x, p.y - 44, now, 1, true);
      drawSpiral(ctx, hx, hy - 4, 34, now * 9, 0.85);
    }
  }

  // --- Липучка: розовая лужа у ног и нити до колен ---
  function drawStrands(ctx, p, now, alpha) {
    const fy = p.y + footDY(p);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const bx = p.x + Math.cos(a) * 26, by = fy + Math.sin(a) * 26 * GROUND_SQUASH;
      const tx = p.x + Math.cos(a) * 8, ty = fy - 12 - (i % 3) * 7;
      const wob = Math.sin(now * 3 + i * 1.7) * 3;
      const cx = (bx + tx) / 2 + Math.cos(a) * 7 + wob, cy = (by + ty) / 2 + 3;
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = '#db2777';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(cx, cy, tx, ty);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.65;
      ctx.strokeStyle = '#fce7f3';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(bx - 0.8, by - 0.8);
      ctx.quadraticCurveTo(cx - 1, cy - 1, tx - 0.8, ty - 0.8);
      ctx.stroke();
      if (i % 2 === 0) {
        const dy = ((now * 1.4 + i * 0.3) % 1) * 7;
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2 + dy, 1.6, 2.2 + dy * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Раздутый: полосатое кольцо опасности, раскалённое брюхо ---
  function drawBloatGround(ctx, e, now) {
    const leader = e.elite.role === 'leader';
    const R = leader ? BURST.r : BURST.rMinion;
    const fuse = leader ? BURST.fuse : BURST.fuseMinion;
    const s = 1 - e.dying / fuse;
    const pulse = 0.5 + 0.5 * Math.sin(now * (8 + 26 * s));
    const fy = e.y + footDY(e);
    ctx.save();
    ctx.translate(e.x, fy);
    ctx.scale(1, GROUND_SQUASH);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, `rgba(239, 68, 68, ${(0.06 + 0.2 * s) * (0.6 + 0.4 * pulse)})`);
    g.addColorStop(1, `rgba(249, 115, 22, ${0.18 + 0.2 * s})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    // Полосатая кромка, как лента ограждения
    const n = 32, rot = now * 1.4;
    ctx.lineWidth = 7;
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * Math.PI * 2;
      ctx.strokeStyle = i % 2 ? `rgba(28, 25, 23, ${0.7})` : `rgba(249, 115, 22, ${0.75 + 0.25 * pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, R - 3.5, a0, a0 + (Math.PI * 2) / n);
      ctx.stroke();
    }
    // Сжимается к центру — когда рванёт
    ctx.strokeStyle = `rgba(254, 215, 170, ${0.5 + 0.5 * s})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(3, (R - 8) * (1 - s)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBloatGlow(ctx, e, now) {
    const leader = e.elite.role === 'leader';
    const fuse = leader ? BURST.fuse : BURST.fuseMinion;
    const s = 1 - e.dying / fuse;
    const pulse = 0.5 + 0.5 * Math.sin(now * (8 + 26 * s));
    const k = scaleOf(e);
    const cx = e.x, cy = e.y + 10 - (e.radius * 0.9) * k;
    const r = e.radius * 1.3 * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(254, 215, 170, ${(0.3 + 0.55 * s) * (0.55 + 0.45 * pulse)})`);
    g.addColorStop(0.45, `rgba(249, 115, 22, ${(0.25 + 0.45 * s) * (0.55 + 0.45 * pulse)})`);
    g.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Пузыри вздуваются на коже
    for (let i = 0; i < 6; i++) {
      const a = i * 1.9 + now * 0.7, ph = (now * 2.2 + i * 0.37) % 1;
      const bx = cx + Math.cos(a) * r * 0.45, by = cy + Math.sin(a) * r * 0.5;
      ctx.globalAlpha = (1 - ph) * (0.4 + 0.6 * s);
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(bx, by, 1.5 + ph * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Кольца стаи под ногами ---
  function drawAura(ctx, e, now) {
    const leader = e.elite.role === 'leader';
    const col = AFFIX[e.elite.affixes[0]].color;
    const col2 = e.elite.affixes[1] ? AFFIX[e.elite.affixes[1]].color : col;
    const fy = e.y + footDY(e);
    const r = e.radius * (leader ? 1.7 : 1.3);
    ctx.save();
    ctx.translate(e.x, fy - 2);
    ctx.scale(1, GROUND_SQUASH);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.3);
    g.addColorStop(0, hexA(col, 0));
    g.addColorStop(0.75, hexA(col, leader ? 0.3 : 0.14));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = hexA(col, leader ? 0.95 : 0.6);
    ctx.lineWidth = leader ? 3 : 2;
    if (leader) {
      ctx.setLineDash([12, 6]);
      ctx.lineDashOffset = -now * 30;
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (leader) {
      // Второе свойство — тонкое кольцо снаружи; зубцы смотрят внутрь и ходят навстречу
      ctx.strokeStyle = hexA(col2, 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = hexA(col2, 0.95);
      for (let i = 0; i < 4; i++) {
        const a = -now * 0.9 + (i / 4) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(r * 1.06, 0);
        ctx.lineTo(r * 1.26, -6);
        ctx.lineTo(r * 1.26, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // Под фигурами: лужи, круги икринок, пятна облаков, кольца стаи, кольцо раздутого, липучка у ног
  function drawGround(ctx, x0, x1, y0, y1) {
    if (!window.Fx) return;
    const now = performance.now() / 1000;
    for (let i = 0; i < eliteHazards.length; i++) {
      const h = eliteHazards[i];
      if (h.k === 'egg') {
        if (h.t >= 0 && inView(h.x, h.y, x0, x1, y0, y1, 80)) drawEggTarget(ctx, h, now);
        continue;
      }
      if (!inView(h.x, h.y, x0, x1, y0, y1, h.r * 1.4)) continue;
      if (h.k === 'cloud') drawCloudStain(ctx, h);
      else drawPuddle(ctx, h, now);
    }
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.elite || !inView(e.x, e.y, x0, x1, y0, y1, 200)) continue;
      if (e.dying > 0) drawBloatGround(ctx, e, now);
      else drawAura(ctx, e, now);
    }
    players.forEach(p => {
      if (!(p.rootT > 0) || p.dead) return;
      const spr = puddleSprite('pink', 28, 4242 + (p.id || 0));
      const s = 0.6 + 0.4 * Math.min(1, (BIND.root - p.rootT) / 8);
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.rootT / 15) * PUDDLE.pink.alpha;
      ctx.drawImage(spr, p.x - spr.width * s / 2, p.y + footDY(p) - spr.height * s / 2, spr.width * s, spr.height * s);
      ctx.restore();
    });
  }

  // Над фигурами: облака и пар, икринки в полёте, купола, гипноз, раздутые, нити липучки, имена вожаков
  function drawOver(ctx, x0, x1, y0, y1) {
    if (!window.Fx) return;
    const now = performance.now() / 1000;
    for (let i = 0; i < eliteHazards.length; i++) {
      const h = eliteHazards[i];
      if (h.k === 'egg') {
        if (h.t >= 0) drawEggFlight(ctx, h, i, now, x0, x1, y0, y1);
        continue;
      }
      if (!inView(h.x, h.y, x0, x1, y0, y1, h.r + 60)) continue;
      if (h.k === 'cloud') drawCloud(ctx, h, now);
      else if (h.k === 'acid') drawAcidSteam(ctx, h, now);
    }
    players.forEach(p => {
      if (p.rootT > 0 && !p.dead) drawStrands(ctx, p, now, Math.min(1, p.rootT / 15));
      // Загипнотизированный: спираль над головой
      if (p.hypnoT > 0 && !p.dead) drawSpiral(ctx, p.x, p.y - 74, 30, -now * 7, Math.min(1, p.hypnoT / 12) * 0.95);
    });

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.elite || !inView(e.x, e.y, x0, x1, y0, y1, 260)) continue;
      const leader = e.elite.role === 'leader';
      if (e.dying > 0) drawBloatGlow(ctx, e, now);
      if (leader && has(e, 'dome') && !(e.dying > 0)) drawDome(ctx, e, now);
      if (e.elHyp) drawHypno(ctx, e, now);
      if (leader) drawPlate(ctx, e);
    }
  }

  // Имя вожака, свойства и полоска здоровья — на тёмной плашке
  function drawPlate(ctx, e) {
    const k = scaleOf(e);
    const ty = e.y + 10 - (e.radius + 58) * k;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.font = 'bold 13px Arial';
    const nm = '☠ ' + nameOf(e);
    const labels = e.elite.affixes.map(affixLabel);
    const sep = ' · ';
    const nameW = ctx.measureText(nm).width;
    ctx.font = 'bold 10px Arial';
    const widths = labels.map(l => ctx.measureText(l).width);
    const sepW = ctx.measureText(sep).width;
    const affW = widths.reduce((s, w) => s + w, 0) + sepW * (labels.length - 1);
    const bw = 76, by = ty + 17;
    const boxW = Math.max(nameW, affW, bw) + 14;
    ctx.fillStyle = 'rgba(12, 10, 9, 0.55)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(e.x - boxW / 2, ty - 14, boxW, 41, 6);
    else ctx.rect(e.x - boxW / 2, ty - 14, boxW, 41);
    ctx.fill();
    ctx.strokeStyle = hexA(AFFIX[e.elite.affixes[0]].color, 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Arial';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillStyle = '#fde047';
    ctx.strokeText(nm, e.x, ty);
    ctx.fillText(nm, e.x, ty);
    ctx.font = 'bold 10px Arial';
    let x = e.x - affW / 2;
    ctx.textAlign = 'left';
    labels.forEach((l, j) => {
      ctx.strokeText(l, x, ty + 12);
      ctx.fillStyle = AFFIX[e.elite.affixes[j]].color;
      ctx.fillText(l, x, ty + 12);
      x += widths[j];
      if (j < labels.length - 1) {
        ctx.fillStyle = '#e5e7eb';
        ctx.strokeText(sep, x, ty + 12);
        ctx.fillText(sep, x, ty + 12);
        x += sepW;
      }
    });
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(e.x - bw / 2 - 1, by - 1, bw + 2, 7);
    const pct = Math.max(0, Math.min(1, e.hp / e.maxHp));
    const hg = ctx.createLinearGradient(0, by, 0, by + 5);
    hg.addColorStop(0, e.dying > 0 ? '#fdba74' : '#fde047');
    hg.addColorStop(1, e.dying > 0 ? '#c2410c' : '#a16207');
    ctx.fillStyle = hg;
    ctx.fillRect(e.x - bw / 2, by, bw * pct, 5);
    ctx.restore();
  }

  window.Elites = {
    onLevel, update, updateWorld, updatePlayer, beforeDamage, stopBullet, onHit, onTongue, onKilled, saveOf, restore, addPacks,
    scaleOf, drawGround, drawOver,
    HYPNO
  };
})();
