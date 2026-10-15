// Мастерская Толика (docs/LEVEL2_PROMZONA.md, раздел 7, «Мастерская»): улучшения оружия, новые стволы и ЭМИ-граната.
// Окно — тема «Мастерская» в разговоре с Толиком (src/dialog.js), когда сдан квест «Сварочный аппарат»
// (Quests.flag('workshop')). Пока окно открыто, игра стоит (gameState 'WORKSHOP'), ESC закрывает (src/menu.js).
//   - Улучшения (UPGRADES) покупаются по одному разу; game.js спрашивает Workshop.has(id) там, где считается
//     урон, пробитие, выносливость, нагрев и дробь (upg, weaponDmg, weaponPen). Магазин ПМ и перезарядка обреза —
//     в player.ammo (applyStats). Одно улучшение — бесплатно после квеста «Цветмет на кабель» (флаг freeUpgrade).
//   - Гранатомёт (launcher) даёт квест «Ракетная начинка»; гранаты — рецепт (квако-заряд + чермет = 3 гранаты).
//     Граната летит дугой — общий массив rockets из game.js с пометкой player, взрыв — explode.
//   - Сварочный разрядник (arc) — по чертежу. Пока жмёшь, дуга бьёт ближайшую жабу впереди и перескакивает
//     на соседних; питание — плазменные ячейки (ARC_CELL кадров дуги на ячейку).
//   - ЭМИ-граната (emp) — только из продвинутой электроники: она лежит в определённых сейфах Промзоны, её ровно
//     на EMP_MAX гранат. Взрыв EMP_R: на EMP_FRAMES глохнут жабы с плазменным и лазерным оружием (снайперы,
//     штурмовики) — e.empT, и у Василия Плазмаган, лазер и разрядник — player.empT. Зачем она — не говорится.
// Скрипты обычные, без модулей: player, enemies, rockets, mouseWorld, SoundFX и прочее — из game.js.
window.Workshop = (function () {
  const $ = id => document.getElementById(id);
  const L = (r, e) => (currentLang === 'ru' ? r : e);
  const T = pair => L(pair[0], pair[1]);

  const UPGRADES = [
    { id: 'bat_nails', weapon: 'bat', name: ['Гвозди-сотки', 'Hundred-nails'],
      desc: ['Урон биты +20%', 'Bat damage +20%'], cost: { nonferrous: 4, scrap: 6 } },
    { id: 'bat_tape', weapon: 'bat', name: ['Обмотка изолентой', 'Tape grip'],
      desc: ['Удар тратит на 30% меньше выносливости', 'Swings cost 30% less stamina'], cost: { nonferrous: 6, mil_parts: 1 } },
    { id: 'pm_mag', weapon: 'makarov', name: ['Магазин на 12', '12-round magazine'],
      desc: ['Магазин ПМ: 8 → 12 патронов', 'Makarov magazine: 8 → 12 rounds'], cost: { nonferrous: 5, scrap: 6 } },
    { id: 'pm_bore', weapon: 'makarov', name: ['Расточка ствола', 'Bored barrel'],
      desc: ['Урон ПМ +20%, лучше пробивает броню', 'Makarov damage +20%, better armor piercing'], cost: { nonferrous: 8, mil_parts: 2 } },
    { id: 'drill_bit', weapon: 'drill', name: ['Победитовое сверло', 'Carbide bit'],
      desc: ['Урон дрели +20%, броню почти не замечает', 'Drill damage +20%, nearly ignores armor'], cost: { nonferrous: 8, mil_parts: 2 } },
    { id: 'drill_coil', weapon: 'drill', name: ['Медная обмотка мотора', 'Copper motor winding'],
      desc: ['Дрель тратит на 35% меньше выносливости', 'The drill uses 35% less stamina'], cost: { nonferrous: 6, scrap: 6 } },
    { id: 'sg_choke', weapon: 'shotgun', name: ['Чок', 'Choke'],
      desc: ['Дробь слабеет дальше: 250 → 330 px', 'Buckshot keeps its power further: 250 → 330 px'], cost: { nonferrous: 6, scrap: 6 } },
    { id: 'sg_break', weapon: 'shotgun', name: ['Быстрый перелом', 'Quick break'],
      desc: ['Перезарядка обреза на 35% быстрее', 'The shotgun reloads 35% faster'], cost: { nonferrous: 8, mil_parts: 2 } },
    { id: 'pl_radiator', weapon: 'plasma', name: ['Медный радиатор', 'Copper radiator'],
      desc: ['Греется медленнее: 16% → 11% за выстрел', 'Heats slower: 16% → 11% per shot'], cost: { nonferrous: 10, plasma_cell: 2 } },
    { id: 'pl_overdrive', weapon: 'plasma', name: ['Разгон ячейки', 'Cell overdrive'],
      desc: ['Урон Плазмагана +20%', 'Plasma gun damage +20%'], cost: { nonferrous: 12, plasma_cell: 3, blueprint: 1 } }
  ];
  const WEAPON_NAMES = {
    bat: ['Бита', 'Bat'], makarov: ['ПМ', 'Makarov'], drill: ['Дрель', 'Drill'], shotgun: ['Обрез', 'Shotgun'],
    plasma: ['Плазмаган', 'Plasma gun']
  };
  const WEAPON_IMG = w => `assets/sprites/weapons/weapon_${w}.png?v=1`;

  // Рецепты: гранаты, разрядник, ЭМИ-граната
  const GRENADE_COST = { kvako_charge: 1, scrap: 2 }, GRENADES_PER = 3;
  const ARC_COST = { blueprint: 1, nonferrous: 15, plasma_cell: 3, mil_parts: 3 };
  const EMP_COST = { electronics: 2 };
  const EMP_MAX = 2;                 // больше электроники на карте нет
  const EMP_R = 650;                 // накрывает всю арену Долбильщика (барьер — 600 px)
  const EMP_FRAMES = 60 * 60;
  const ARC_CELL = 60 * 12;          // кадров дуги на одну плазменную ячейку
  const LAUNCHER_RANGE = 450, LAUNCHER_BLAST = 90;
  const EMP_RANGE = 420;

  let bought = new Set(), freeUsed = false, empMade = 0;
  let arcs = [], empRings = [];

  // --- Сохранение ---
  function saveState() {
    return { bought: [...bought], freeUsed, empMade };
  }
  function loadState(v) {
    bought = new Set((v && Array.isArray(v.bought) ? v.bought : []).filter(id => UPGRADES.some(u => u.id === id)));
    freeUsed = !!(v && v.freeUsed);
    empMade = Math.min(EMP_MAX, Math.max(0, Math.floor((v && v.empMade) || 0)));
    arcs = [];
    empRings = [];
    applyStats();
  }
  const has = id => bought.has(id);

  // Магазин ПМ и перезарядка обреза живут в player.ammo — пересчитать после покупки и загрузки
  function applyStats() {
    const pm = player.ammo.makarov, sg = player.ammo.shotgun;
    pm.maxClip = has('pm_mag') ? 12 : 8;
    pm.clip = Math.min(pm.clip, pm.maxClip);
    sg.reloadTime = has('sg_break') ? 72 : 110;
  }

  const freeAvailable = () => !!(window.Quests && window.Quests.flag('freeUpgrade')) && !freeUsed;
  const isOpen = () => gameState === 'WORKSHOP';

  // --- Окно ---
  function open() {
    if (gameState !== 'PLAYING' && gameState !== 'DIALOG') return;
    if (window.Dialog && window.Dialog.isOpen()) window.Dialog.close();
    gameState = 'WORKSHOP';
    for (const k in keys) keys[k] = false;
    mouseDown = false;
    render();
    $('workshop-modal').style.display = 'flex';
  }

  function close() {
    if (!isOpen()) return;
    $('workshop-modal').style.display = 'none';
    gameState = 'PLAYING';
    if (window.Menu) window.Menu.requestSave();
  }

  function card(img, title, desc, btn, cls = '') {
    const c = document.createElement('div');
    c.className = `shop-card ${cls}`;
    const left = document.createElement('div');
    left.className = 'shop-card-left';
    left.innerHTML = '<img class="shop-card-img" alt=""><div><div class="shop-card-title"></div><div class="shop-card-desc"></div></div>';
    left.querySelector('img').src = img;
    left.querySelector('.shop-card-title').textContent = title;
    left.querySelector('.shop-card-desc').textContent = desc;
    c.append(left, btn);
    return c;
  }

  function button(label, enabled, onClick, cls = '') {
    const b = document.createElement('button');
    b.className = `shop-buy-btn ${cls}`;
    b.innerHTML = label;
    b.disabled = !enabled;
    b.onclick = onClick;
    return b;
  }

  function render() {
    $('ws-title').textContent = L('МАСТЕРСКАЯ ТОЛИКА', 'TOLIK\'S WORKSHOP');
    $('ws-sub').textContent = L('Толик варит, точит и мотает: улучшения стволов, новое оружие и боеприпасы к нему.',
      'Tolik welds, grinds and winds: weapon upgrades, new weapons and ammo for them.');
    $('ws-h-upgrades').textContent = L('Улучшения оружия', 'Weapon upgrades');
    $('ws-h-craft').textContent = L('Новое оружие и боеприпасы', 'New weapons and ammo');
    $('ws-close').textContent = L('ЗАКРЫТЬ [ESC]', 'CLOSE [ESC]');
    renderWallet();
    const free = freeAvailable();
    $('ws-free').style.display = free ? '' : 'none';
    $('ws-free').textContent = L('Толик должен тебе за цветмет: одно улучшение — бесплатно.', 'Tolik owes you for the copper: one upgrade is free.');

    const up = $('ws-upgrades');
    up.innerHTML = '';
    UPGRADES.forEach(u => {
      const owned = has(u.id), gun = !!player.unlockedWeapons[u.weapon];
      let btn;
      if (owned) btn = button(L('✔ СДЕЛАНО', '✔ DONE'), false, null, 'ws-done');
      else if (free && gun) btn = button(L('БЕСПЛАТНО', 'FREE'), true, () => buy(u, true), 'ws-free-btn');
      else btn = button(formatCostHTML(u.cost), gun && canAffordCost(u.cost), () => buy(u, false));
      const title = `${T(WEAPON_NAMES[u.weapon])}: ${T(u.name)}`;
      const desc = T(u.desc) + (gun ? '' : L(' — сначала нужно само оружие', ' — you need the weapon first'));
      up.append(card(WEAPON_IMG(u.weapon), title, desc, btn, owned ? 'owned' : ''));
    });

    const craft = $('ws-craft');
    craft.innerHTML = '';
    // Гранатомёт: даёт квест, потом — гранаты
    if (player.unlockedWeapons.launcher) {
      craft.append(card(WEAPON_IMG('launcher'), L(`Гранаты ×${GRENADES_PER} (сейчас ${grenades()})`, `Grenades ×${GRENADES_PER} (have ${grenades()})`),
        L('Толик разбирает квако-заряд ракетчика на три гранаты к самопальному гранатомёту.',
          'Tolik takes a rocketeer\'s kvako charge apart into three grenades for the homemade launcher.'),
        button(formatCostHTML(GRENADE_COST), canAffordCost(GRENADE_COST), craftGrenades)));
    } else {
      craft.append(card(WEAPON_IMG('launcher'), L('Самопальный гранатомёт', 'Homemade grenade launcher'),
        L('Стреляет навесом, взрыв пробивает броню. Толик соберёт его, когда будет из чего — спроси у него работу.',
          'Lobbed shots, the blast pierces armor. Tolik will build one when he has the parts — ask him for work.'),
        button(L('НЕ СОБРАН', 'NOT BUILT'), false, null), 'locked'));
    }
    // Разрядник: по чертежу
    if (player.unlockedWeapons.arc) {
      craft.append(card(WEAPON_IMG('arc'), L('Сварочный разрядник', 'Welding arc discharger'),
        L(`Собран. Питание — плазменные ячейки: одна — ${ARC_CELL / 60} с дуги (у тебя ${player.resources.plasma_cell}).`,
          `Built. Runs on plasma cells: one cell — ${ARC_CELL / 60}s of arc (you have ${player.resources.plasma_cell}).`),
        button(L('✔ СОБРАН', '✔ BUILT'), false, null, 'ws-done'), 'owned'));
    } else {
      craft.append(card(WEAPON_IMG('arc'), L('Сварочный разрядник (чертёж «Дуговой резак»)', 'Welding arc discharger ("Arc cutter" blueprint)'),
        L('Ближний бой: дуга бьёт жабу и перескакивает ещё на две соседние. Гудит, пока держишь. Питание — плазменные ячейки.',
          'Close range: the arc hits a toad and jumps to two more nearby. Hums while you hold it. Runs on plasma cells.'),
        button(formatCostHTML(ARC_COST), canAffordCost(ARC_COST), buildArc)));
    }
    // ЭМИ-граната: только когда есть электроника или граната уже делалась. Зачем — не говорим
    if (player.resources.electronics > 0 || empMade > 0) {
      const left = EMP_MAX - empMade;
      craft.append(card(WEAPON_IMG('emp'), L(`ЭМИ-граната (сделано ${empMade} из ${EMP_MAX})`, `EMP grenade (made ${empMade} of ${EMP_MAX})`),
        L('Самоделка из плат НИИ. Глушит всю электронику вокруг на минуту — и твою тоже.',
          'Homemade from research-institute boards. Jams all electronics around for a minute — yours too.'),
        left > 0 ? button(formatCostHTML(EMP_COST), canAffordCost(EMP_COST), craftEmp)
          : button(L('ПЛАТ БОЛЬШЕ НЕТ', 'NO BOARDS LEFT'), false, null)));
    }
  }

  // Кошелёк: то, что идёт в мастерскую
  function renderWallet() {
    const box = $('ws-wallet');
    box.innerHTML = '';
    ['scrap', 'mil_parts', 'nonferrous', 'blueprint', 'plasma_cell', 'kvako_charge', 'electronics'].forEach(k => {
      if (k === 'electronics' && !player.resources.electronics && !empMade) return;
      const d = RES_DISPLAY[k];
      const it = document.createElement('div');
      it.className = 'resource-item';
      it.innerHTML = '<img class="res-icon" alt=""><span></span>';
      it.querySelector('img').src = d.img;
      it.querySelector('span').textContent = player.resources[k];
      if (d.color) it.querySelector('span').style.color = d.color;
      box.append(it);
    });
  }

  function done(text) {
    SoundFX.reloadEnd('shotgun');
    addFloatingText(player.x, player.y - 40, text, '#fbbf24');
    updateHUD(true);
    if (window.Menu) window.Menu.requestSave();
    render();
  }

  function buy(u, free) {
    if (has(u.id) || !player.unlockedWeapons[u.weapon]) return;
    if (free) {
      if (!freeAvailable()) return;
      freeUsed = true;
    } else {
      if (!canAffordCost(u.cost)) return;
      payCost(u.cost);
    }
    bought.add(u.id);
    applyStats();
    done(`🔧 ${T(u.name)}`);
  }

  const grenades = () => player.ammo.launcher.clip + player.ammo.launcher.reserve;

  function craftGrenades() {
    if (!canAffordCost(GRENADE_COST)) return;
    payCost(GRENADE_COST);
    player.ammo.launcher.reserve += GRENADES_PER;
    done(L(`+${GRENADES_PER} ГРАНАТЫ`, `+${GRENADES_PER} GRENADES`));
  }

  function buildArc() {
    if (player.unlockedWeapons.arc || !canAffordCost(ARC_COST)) return;
    payCost(ARC_COST);
    unlockWeapon('arc');
    done(L('⚡ СВАРОЧНЫЙ РАЗРЯДНИК', '⚡ WELDING ARC'));
  }

  function craftEmp() {
    if (empMade >= EMP_MAX || !canAffordCost(EMP_COST)) return;
    payCost(EMP_COST);
    empMade++;
    player.empGrenades = (player.empGrenades || 0) + 1;
    unlockWeapon('emp');
    done(L('+1 ЭМИ-ГРАНАТА', '+1 EMP GRENADE'));
  }

  // Новое оружие: сразу с собой и в хотбаре
  function unlockWeapon(w) {
    player.unlockedWeapons[w] = true;
    player.equipped[w] = true;
    applyHotbarOrder();
  }

  // Награда квеста «Ракетная начинка» (src/quests.js)
  function giveLauncher() {
    unlockWeapon('launcher');
    player.ammo.launcher.clip = 1;
    player.ammo.launcher.reserve += 2;
    updateHUD(true);
  }

  // Продвинутая электроника — в двух первых кассовых сейфах и двух первых несгораемых шкафах Промзоны
  // (раскладка постоянная, как у предметов квестов): по 2 на гранату — ровно на EMP_MAX гранат
  function isElectronicsSafe(c) {
    if (currentLocation !== 'promzona') return false;
    const first = type => containers.filter(x => x.type === type).slice(0, 2);
    return first('safe_vault').includes(c) || first('safe_fireproof').includes(c);
  }

  // --- Стрельба: game.js (attack) зовёт fire для launcher, arc, emp; возвращает задержку до следующего ---
  function fire(w, muzzle) {
    if (w === 'launcher') return fireLauncher(muzzle);
    if (w === 'arc') return fireArc(muzzle);
    if (w === 'emp') return throwEmp(muzzle);
    return 10;
  }

  // Точка броска: курсор, но не дальше range
  function aimPoint(range) {
    const dx = mouseWorld.x - player.x, dy = mouseWorld.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, range / d);
    return { x: player.x + dx * k, y: player.y + dy * k, d: Math.min(d, range) };
  }

  function lob(muzzle, target, kind, dmg) {
    const fx = player.x, fy = player.y + footDY(player);
    rockets.push({
      player: true, kind, mx: muzzle.x, my: muzzle.y, fx, fy, tx: target.x, ty: target.y + footDY(player),
      t: 0, T: Math.round(22 + target.d / 14), peak: 40 + target.d * 0.25,
      x: muzzle.x, y: muzzle.y, prevX: muzzle.x, prevY: muzzle.y, gx: fx, gy: fy, dmg
    });
  }

  function fireLauncher(muzzle) {
    const a = player.ammo.launcher;
    if (a.clip <= 0) {
      startReload();
      return 14;
    }
    a.clip--;
    lob(muzzle, aimPoint(LAUNCHER_RANGE), 'grenade', WEAPONS.launcher.dmg(player.baseDamage) * (player.isDrunk ? 1.4 : 1));
    SoundFX.rocketLaunch(0.9);
    if (window.threeCharacter) window.threeCharacter.triggerRecoil(0.9);
    spawnGunpowderSmoke(muzzle.x, muzzle.y, player.angle, 4);
    muzzleFlashes.push({ x: muzzle.x, y: muzzle.y, angle: player.angle, type: 'shotgun', life: 4, maxLife: 4, scale: 0.8 });
    cameraKickX -= Math.cos(player.angle) * 3;
    cameraKickY -= Math.sin(player.angle) * 3;
    if (a.clip === 0 && a.reserve > 0) setTimeout(() => { if (player.currentWeapon === 'launcher' && a.clip === 0) startReload(); }, 250);
    updateHUD(true);
    return WEAPONS.launcher.cooldown;
  }

  function throwEmp(muzzle) {
    if (!(player.empGrenades > 0)) {
      SoundFX.emptyClick();
      return 20;
    }
    player.empGrenades--;
    lob(muzzle, aimPoint(EMP_RANGE), 'emp', 0);
    SoundFX.batSwing(false);
    if (window.threeCharacter) window.threeCharacter.triggerRecoil(0.5);
    // Последнюю бросил — пустая ячейка не нужна, в руках — предыдущее оружие
    if (player.empGrenades === 0) {
      player.equipped.emp = false;
      player.unlockedWeapons.emp = false;
      setTimeout(() => window.switchWeapon(player.lastRanged && player.lastRanged !== 'emp' ? player.lastRanged : 'bat'), 300);
      applyHotbarOrder();
    }
    updateHUD(true);
    return 40;
  }

  // Дуга: ближайшая жаба в конусе впереди, от неё — к соседним
  function fireArc(muzzle) {
    if (!(player.arcCharge > 0)) {
      if (player.resources.plasma_cell > 0) {
        player.resources.plasma_cell--;
        player.arcCharge = ARC_CELL;
        addFloatingText(player.x, player.y - 40, L('−1 ПЛАЗМЕННАЯ ЯЧЕЙКА', '−1 PLASMA CELL'), '#67e8f9');
      } else {
        SoundFX.emptyClick();
        addFloatingText(player.x, player.y - 36, L('НЕТ ПЛАЗМЕННЫХ ЯЧЕЕК', 'NO PLASMA CELLS'), '#ef4444');
        return 30;
      }
    }
    const W = WEAPONS.arc;
    player.arcCharge -= W.cooldown;
    player.arcTick = (player.arcTick || 0) + 1;
    if (player.arcTick % 3 === 0) SoundFX.laser();
    let best = null, bd = Infinity;
    enemies.forEach(e => {
      if (e.hp <= 0) return;
      const d = Math.hypot(e.x - muzzle.x, e.y - muzzle.y);
      if (d > W.range + e.radius) return;
      let da = Math.abs(Math.atan2(e.y - muzzle.y, e.x - muzzle.x) - player.angle);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < 1.0 && d < bd) { bd = d; best = e; }
    });
    if (!best) {
      // В пустоту — короткая искра
      const len = 40 + Math.random() * 30;
      arcs.push({ pts: zigzag(muzzle.x, muzzle.y, muzzle.x + Math.cos(player.angle) * len, muzzle.y + Math.sin(player.angle) * len, 4), life: 3 });
      return W.cooldown;
    }
    const base = W.dmg(player.baseDamage) * (player.isDrunk ? 1.4 : 1);
    const hitList = [best];
    let from = { x: muzzle.x, y: muzzle.y }, cur = best, k = 1;
    zap(from, cur, base);
    while (hitList.length <= W.chain) {
      let nxt = null, nd = W.chainR;
      enemies.forEach(e => {
        if (e.hp <= 0 || hitList.includes(e)) return;
        const d = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (d < nd) { nd = d; nxt = e; }
      });
      if (!nxt) break;
      k *= 0.7;
      zap({ x: cur.x, y: cur.y - 14 }, nxt, base * k);
      hitList.push(nxt);
      cur = nxt;
    }
    if (window.threeCharacter && player.arcTick % 2 === 0) window.threeCharacter.triggerRecoil(0.2);
    return W.cooldown;
  }

  function zap(from, e, dmg) {
    arcs.push({ pts: zigzag(from.x, from.y, e.x, e.y - 14, 6), life: 3 });
    const hit = damageEnemy(e, dmg, 'arc', player.x, player.y);
    e.hitFlash = 4;
    if (player.arcTick % 4 === 0) {
      addFloatingText(e.x, e.y - 24, damageLabel(hit, `-${Math.round(hit.dealt)} ⚡`), '#7dd3fc');
      spawnDirectionalSparks(e.x, e.y - 12, -Math.PI / 2, Math.PI * 2, 5, '#bae6fd', 3, 9, 8);
    }
  }

  function zigzag(x1, y1, x2, y2, n) {
    const pts = [[x1, y1]];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    for (let i = 1; i < n; i++) {
      const s = i / n, off = (Math.random() - 0.5) * Math.min(26, len * 0.3);
      pts.push([x1 + dx * s + nx * off, y1 + dy * s + ny * off]);
    }
    pts.push([x2, y2]);
    return pts;
  }

  // ЭМИ мешает стрелять: game.js спрашивает перед выстрелом из плазмы, лазера и разрядника
  function jammed(w) {
    if (!(player.empT > 0) || (w !== 'plasma' && w !== 'laser' && w !== 'arc')) return false;
    SoundFX.emptyClick();
    addFloatingText(player.x, player.y - 36, L(`⚡ ЭМИ: ЕЩЁ ${Math.ceil(player.empT / 60)} С`, `⚡ EMP: ${Math.ceil(player.empT / 60)}s LEFT`), '#7dd3fc');
    return true;
  }

  // У кого плазменное или лазерное оружие: снайперы (лазерный прицел), штурмовики (плазменные автоматы)
  const empTarget = e => e.type === 'sniper' || e.type === 'stormtrooper';

  // --- Взрыв гранаты и ЭМИ (game.js rocketExplode, у снарядов с player) ---
  function explode(r) {
    const x = r.tx, y = r.ty;
    if (r.kind === 'emp') return empBlast(x, y);
    spawnShockwave(x, y, LAUNCHER_BLAST + 18, '#fb923c', 22);
    spawnDirectionalSparks(x, y - 6, -Math.PI / 2, Math.PI * 2, 16, '#fde047', 4, 11, 14);
    createParticles(x, y - 6, '#f97316', 14);
    spawnGunpowderSmoke(x, y - 4, -Math.PI / 2, 7);
    rocketBlasts.push({ x, y, t: 0, life: 12 });
    const near = Math.hypot(player.x - x, player.y - y);
    if (near < 600) {
      const kick = 16 * (1 - near / 600);
      cameraKickX += (Math.random() - 0.5) * kick;
      cameraKickY += (Math.random() - 0.5) * kick;
    }
    SoundFX.explosion(1);
    // Жабы и боссы: в середине — весь урон, к краю — половина
    enemies.forEach(e => {
      if (e.hp <= 0) return;
      const fy = e.y + footDY(e);
      if (!inGroundEllipse(e.x, fy, x, y, LAUNCHER_BLAST + e.radius * 0.5)) return;
      const k = 1 - 0.5 * Math.min(1, Math.hypot(e.x - x, (fy - y) / GROUND_SQUASH) / LAUNCHER_BLAST);
      const hit = damageEnemy(e, r.dmg * k, 'launcher', x, y);
      e.hitFlash = 6;
      addFloatingText(e.x, e.y - 24, damageLabel(hit, `-${Math.round(hit.dealt)}`), '#fdba74');
    });
    // Себя тоже задевает — треть урона
    const inSafe = Math.hypot(player.x - safeZone.x, player.y - safeZone.y) < safeZone.radius;
    if (!player.isRolling && !inSafe && inGroundEllipse(player.x, player.y + footDY(player), x, y, LAUNCHER_BLAST + player.radius * 0.5)) {
      const dmg = Math.round(r.dmg * 0.33);
      player.hp -= armorAbsorb(dmg, 'ranged');
      const a = Math.atan2(player.y - y, player.x - x);
      slideMove(player, Math.cos(a) * 16, Math.sin(a) * 16, player.radius);
      addFloatingText(player.x, player.y - 30, `-${dmg}`, '#ef4444');
      if (player.hp <= 0) gameOver();
    }
  }

  function empBlast(x, y) {
    empRings.push({ x, y, t: 0, life: 40 });
    SoundFX.bossFx('pounder_storm', x, y);
    cameraKickX += (Math.random() - 0.5) * 10;
    cameraKickY += (Math.random() - 0.5) * 10;
    let n = 0;
    enemies.forEach(e => {
      if (e.hp <= 0 || !empTarget(e)) return;
      if (!inGroundEllipse(e.x, e.y + footDY(e), x, y, EMP_R)) return;
      e.empT = EMP_FRAMES;
      e.gunPose = 'rest';
      n++;
      spawnDirectionalSparks(e.x, e.y - 20, -Math.PI / 2, Math.PI * 2, 8, '#7dd3fc', 3, 10, 10);
    });
    if (inGroundEllipse(player.x, player.y + footDY(player), x, y, EMP_R)) {
      player.empT = EMP_FRAMES;
      addFloatingText(player.x, player.y - 50, L('⚡ ЭМИ: плазма и лазер молчат 60 с', '⚡ EMP: plasma and laser jammed for 60s'), '#7dd3fc');
    }
    updateHUD(true);
    return n;
  }

  // --- Каждый кадр (game.js update) ---
  function update() {
    if (player.empT > 0 && --player.empT === 0) {
      addFloatingText(player.x, player.y - 46, L('⚡ ЭЛЕКТРОНИКА ОЖИЛА', '⚡ ELECTRONICS BACK ONLINE'), '#7dd3fc');
      updateHUD(true);
    }
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!(e.empT > 0)) continue;
      e.empT--;
      // Заглохшее оружие искрит
      if (e.empT % 26 === 0) spawnDirectionalSparks(e.x + (Math.random() - 0.5) * 16, e.y - 22, -Math.PI / 2, 1.6, 4, '#7dd3fc', 2, 7, 8);
    }
    for (let i = arcs.length - 1; i >= 0; i--) if (--arcs[i].life <= 0) arcs.splice(i, 1);
    for (let i = empRings.length - 1; i >= 0; i--) if (++empRings[i].t >= empRings[i].life) empRings.splice(i, 1);
  }

  // --- Отрисовка: дуги разрядника, кольцо ЭМИ (после выстрелов, в координатах мира) ---
  function drawEffects(ctx) {
    if (arcs.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      arcs.forEach(a => {
        [[7, 'rgba(56, 189, 248, 0.25)'], [3, 'rgba(125, 211, 252, 0.8)'], [1.2, 'rgba(240, 249, 255, 1)']].forEach(([w, c]) => {
          ctx.strokeStyle = c;
          ctx.lineWidth = w;
          ctx.beginPath();
          a.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          ctx.stroke();
        });
      });
      ctx.restore();
    }
    empRings.forEach(r => {
      const k = r.t / r.life, rad = EMP_R * Math.min(1, k * 1.6);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 10 * (1 - k) + 2;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * GROUND_SQUASH, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (k < 0.25) {
        const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 160);
        g.addColorStop(0, `rgba(224, 242, 254, ${0.9 * (1 - k / 0.25)})`);
        g.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, 160, 160 * GROUND_SQUASH, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // Граната и ЭМИ-граната в полёте (game.js drawRockets у снарядов с player)
  function drawProjectile(ctx, r) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(r.gx, r.gy, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.t * 0.35);
    if (r.kind === 'emp') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(-5, -1, 10, 2);
    } else {
      ctx.fillStyle = '#3f4a2f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(-1.5, -4, 3, 8);
    }
    ctx.restore();
  }

  // Подпись ячейки хотбара (game.js updateHUD)
  function slotText(w) {
    if (w === 'launcher') {
      const a = player.ammo.launcher;
      return player.reloadingWeapon === 'launcher' ? 'R...' : `${a.clip}/${a.reserve}`;
    }
    if (w === 'arc') {
      if (player.empT > 0) return `ЭМИ ${Math.ceil(player.empT / 60)}`;
      const pct = Math.round((player.arcCharge || 0) / ARC_CELL * 100);
      return `${pct}%·${player.resources.plasma_cell}`;
    }
    if (w === 'emp') return `×${player.empGrenades || 0}`;
    return '';
  }

  $('ws-close').addEventListener('click', close);
  // Клики по окну не стреляют
  ['mousedown', 'mouseup'].forEach(ev => $('workshop-modal').addEventListener(ev, e => e.stopPropagation()));

  return { UPGRADES, has, open, close, isOpen, saveState, loadState, applyStats, fire, jammed, explode, update, drawEffects,
    drawProjectile, slotText, isElectronicsSafe, giveLauncher, EMP_MAX };
})();
