/**
 * Кооператив (docs/COOP.md): игроки, кроме своего, и откуда берётся их ввод.
 *
 * Этап 1 — без сети: ?coop=2..4 добавляет товарищей-ботов. Бот держится рядом со своим Василием, стреляет
 * по ближайшей жабе, поднимает упавших. Нужен, чтобы проверить цели жаб, урон по всем, лут, смерть и подъём.
 * Позже тот же ввод (input.keys / input.mouse / input.down) будет приходить по сети.
 *
 * Скрипты обычные, без модулей: players, player, localPlayer, makePlayer, usePlayer, enemies — из game.js.
 */
window.Coop = (() => {
  const BOT_NAMES = ['Петя', 'Серёга', 'Коля'];
  const BOT_HEROES = ['bruiser', 'punk', 'kid'];   // боты — разными героями (src/heroes.js)
  const bots = new Set();

  // Свой Василий: имя и 3D-модель (родной цвет ватника — та, что уже грузится)
  localPlayer.name = 'Василий';
  localPlayer.hero = 'vasiliy';
  localPlayer.char = window.threeCharacter;
  localPlayer.char.owner = localPlayer;

  // hero — кем играет (src/heroes.js): своя модель
  function addPlayer(name, color, hero = 'vasiliy') {
    const p = makePlayer();
    p.id = players.length;
    p.name = name;
    p.color = color;
    p.hero = hero;
    p.char = new ThreeCharacterManager(color, hero);
    p.char.owner = p;
    players.push(p);
    return p;
  }

  function addBot() {
    const i = players.length - 1;
    const p = addPlayer(BOT_NAMES[i % BOT_NAMES.length], players.length % 4, BOT_HEROES[i % BOT_HEROES.length]);
    p.bot = { slot: i, shootT: 0 };
    bots.add(p);
    return p;
  }

  const n = Math.max(1, Math.min(4, Number(new URLSearchParams(location.search).get('coop')) || 1));
  for (let i = 1; i < n; i++) addBot();

  // Ввод бота: идёт к месту рядом со своим Василием (или к упавшему — поднимать), целится в ближайшую жабу
  function driveBot(p) {
    const k = p.input.keys;
    k.KeyW = k.KeyA = k.KeyS = k.KeyD = k.KeyE = false;
    p.input.down = false;
    if (p.dead || p.downT > 0) return;
    let gx, gy;
    const fallen = players.find(o => o !== p && o.downT > 0 && Math.hypot(o.x - p.x, o.y - p.y) < 600);
    if (fallen) { gx = fallen.x; gy = fallen.y; }
    else {
      const lead = localPlayer.dead ? players.find(o => !o.dead && o !== p) || p : localPlayer;
      const a = Math.PI * (0.6 + 0.4 * p.bot.slot);
      gx = lead.x + Math.cos(a) * 110;
      gy = lead.y + Math.sin(a) * 80;
    }
    const dx = gx - p.x, dy = gy - p.y;
    if (fallen && Math.hypot(dx, dy) < 50) k.KeyE = true;
    else if (Math.hypot(dx, dy) > 40) {
      if (dx > 20) k.KeyD = true;
      if (dx < -20) k.KeyA = true;
      if (dy > 20) k.KeyS = true;
      if (dy < -20) k.KeyW = true;
    }
    let best = null, bd = 520;
    for (const e of enemies) {
      if (e.hp <= 0 || e.defense) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) {
      p.input.mouse.x = best.x;
      p.input.mouse.y = best.y - 20;
      const melee = p.currentWeapon === 'bat' || p.currentWeapon === 'drill';
      p.input.down = !fallen && (melee ? bd < 90 : true);
      if (melee && bd < 300 && !fallen) {  // с битой — подойти вплотную
        k.KeyW = best.y < p.y - 20; k.KeyS = best.y > p.y + 20;
        k.KeyA = best.x < p.x - 20; k.KeyD = best.x > p.x + 20;
      }
    } else {
      p.input.mouse.x = p.x + (gx - p.x) + 1;
      p.input.mouse.y = p.y + (gy - p.y) + 1;
    }
  }

  // Каждый кадр до хода игроков (game.js update)
  function beforeUpdate() {
    if (window.Net) window.Net.hostBeforeUpdate(); // команды сетевых товарищей (src/net.js)
    bots.forEach(driveBot);
    // Карта за босса: бот тянет случайную, когда раздали всем
    if (cardOfferTimer <= 1) bots.forEach(p => {
      if (!p.pendingCards) return;
      const ids = BOSS_CARD_IDS[currentLocation] || BOSS_CARD_IDS.city;
      const was = player;
      usePlayer(p);
      applyBossCard(ids[Math.floor(Math.random() * ids.length)]);
      usePlayer(was);
    });
  }

  // Отладка: выдать всем ботам оружие и патроны (из консоли: Coop.armBots())
  function armBots() {
    const was = player;
    bots.forEach(p => {
      usePlayer(p);
      Object.keys(p.unlockedWeapons).forEach(w => { p.unlockedWeapons[w] = true; p.equipped[w] = true; });
      p.ammo.makarov.reserve = 200;
      p.ammo.shotgun.reserve = 120;
      p.currentWeapon = ['shotgun', 'makarov', 'plasma'][p.bot.slot % 3];
    });
    usePlayer(was);
  }

  return { addPlayer, addBot, beforeUpdate, armBots, bots };
})();
