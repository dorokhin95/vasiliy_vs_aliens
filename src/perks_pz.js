// Загружается до game.js: game.js в конце сразу рисует HUD и зовёт отсюда currentRmbAbility, updateArmorHud
// Способности ряда Промзоны (UPGRADE_TREES, perks с promzona: true): шламовая броня, горючая жижа на ПКМ
// и переключение способностей на ПКМ. Общие переменные game.js (player, enemies, particles...) видны здесь:
// скрипты без модулей делят одну глобальную область. Открываются вместе с Промзоной, цена — с её лутом.

// --- ШЛАМОВАЯ КОЖА: дополнительная броня поверх здоровья ---
// Удар сначала приходится на броню, она забирает часть урона — сколько, зависит от вида атаки:
// ближний бой гасит хорошо, кислоту и взрывы — наполовину, плазму, лазер и электричество — слабо.
// Восстанавливается сама (если 5 с не было урона) и быстро — в шламе и био-лужах
const SLIME_ARMOR = {
  max: 60,
  absorb: { melee: 0.8, ranged: 0.5, energy: 0.2 },
  regenDelay: 300,       // кадров без урона до самовосстановления
  regenPerSec: 1,
  puddlePerSec: 10       // в шламе Василий обмазывается заново
};

function slimeArmorMax() {
  return player.hasPerk('sludge_skin') ? SLIME_ARMOR.max : 0;
}

// Урон по Василию с учётом брони: возвращает, сколько дошло до здоровья (здоровье здесь не меняется).
// kind: 'melee' | 'ranged' | 'energy'
function armorAbsorb(dmg, kind) {
  player.hurtFrame = 0;
  const max = slimeArmorMax();
  if (max <= 0 || !(player.slimeArmor > 0) || dmg <= 0) return dmg;
  const share = SLIME_ARMOR.absorb[kind] ?? SLIME_ARMOR.absorb.melee;
  const taken = Math.min(player.slimeArmor, dmg * share);
  player.slimeArmor -= taken;
  if (taken >= 1) createParticles(player.x, player.y - 18, '#84cc16', 4);
  return dmg - taken;
}

function updateSlimeArmor() {
  const max = slimeArmorMax();
  if (max <= 0) {
    player.slimeArmor = 0;
    return;
  }
  player.hurtFrame = (player.hurtFrame || 0) + 1;
  let gain = 0;
  if (player.inSlime) gain = SLIME_ARMOR.puddlePerSec / 60;
  else if (player.hurtFrame > SLIME_ARMOR.regenDelay) gain = SLIME_ARMOR.regenPerSec / 60;
  player.slimeArmor = Math.min(max, (player.slimeArmor || 0) + gain);
}

function updateArmorHud() {
  const box = document.getElementById('armor-row');
  if (!box) return;
  const max = slimeArmorMax();
  setHudStyle(box, 'display', max > 0 ? 'flex' : 'none');
  if (max > 0) setHudStyle(document.getElementById('armor-bar'), 'width', `${Math.round(player.slimeArmor / max * 100)}%`);
}

// --- ГОРЮЧАЯ ЖИЖА (ПКМ): плевок на 3 м вперёд, лужа горит 5 с и поджигает жаб ---
const FIRE_GOO = {
  range: 120,            // 3 м (~40 px на метр)
  flight: 22,            // кадров полёта
  poolR: 52,             // радиус горящей лужи (по земле сплюснут, GROUND_SQUASH)
  poolLife: 300,         // 5 с
  burnFrames: 240,       // жаба горит 4 с и после выхода из лужи
  burnDps: 8,
  cooldown: 720          // 12 с
};
let gooShots = [];
let firePools = [];

function shootFireGoo() {
  const a = player.angle;
  const fx = player.x, fy = player.y + footDY(player);
  // Летит до 3 м по земле; упирается в стену — падает перед ней
  let tx = fx, ty = fy;
  for (let d = 10; d <= FIRE_GOO.range; d += 10) {
    const x = fx + Math.cos(a) * d, y = fy + Math.sin(a) * d * GROUND_SQUASH;
    if (checkBuildingCollision(x, y, 6)) break;
    tx = x; ty = y;
  }
  gooShots.push({ mx: player.x + Math.cos(a) * 18, my: player.y - 22, tx, ty, t: 0, x: player.x, y: player.y - 22 });
  player.gooCd = FIRE_GOO.cooldown;
  SoundFX.reload && SoundFX.reload();
  addFloatingText(player.x, player.y - 34, currentLang === 'ru' ? '🔥 ГОРЮЧАЯ ЖИЖА' : '🔥 FIRE GOO', '#fb923c');
}

function updateFireGoo() {
  for (let i = gooShots.length - 1; i >= 0; i--) {
    const g = gooShots[i];
    g.t++;
    const s = Math.min(1, g.t / FIRE_GOO.flight);
    g.x = g.mx + (g.tx - g.mx) * s;
    g.y = g.my + (g.ty - g.my) * s - 60 * s * (1 - s);
    if (g.t % 2 === 0) spawnEmber(g.x, g.y, 4);
    if (s >= 1) {
      // Языки лужи: разложены по эллипсу, к середине выше; дальние — первыми
      const tongues = [];
      // Сплошной костёр: широкие языки с перекрытием, к середине выше, по краю — низкие
      for (let n = 0; n < 15; n++) {
        const a = n * 2.4 + Math.random() * 0.6, r = n === 0 ? 0 : 0.15 + Math.sqrt(n / 15) * 0.7;
        tongues.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r, s: (1 - r * 0.7 + Math.random() * 0.2) * 0.62,
          w: 1.3 + Math.random() * 0.5, seed: Math.random() * 10 });
      }
      tongues.sort((u, v) => u.dy - v.dy);
      firePools.push({ x: g.tx, y: g.ty, t: 0, tongues });
      for (let n = 0; n < 14; n++) spawnEmber(g.tx, g.ty, FIRE_GOO.poolR);
      gooShots.splice(i, 1);
    }
  }
  for (let i = firePools.length - 1; i >= 0; i--) {
    const p = firePools[i];
    if (++p.t >= FIRE_GOO.poolLife) {
      scorches.push({ x: p.x, y: p.y, t: 0 });
      firePools.splice(i, 1);
      continue;
    }
    // Кто стоит в огне — загорается (и горит ещё 4 с после выхода)
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (inGroundEllipse(e.x, e.y + footDY(e), p.x, p.y, FIRE_GOO.poolR)) e.burnLeft = FIRE_GOO.burnFrames;
    }
    const pw = poolPower(p);
    if (p.t % 3 === 0 && Math.random() < pw) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * FIRE_GOO.poolR * 0.8;
      spawnEmber(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * GROUND_SQUASH - 10, 6);
    }
    if (p.t % 10 === 0 && pw > 0.3) spawnFireSmoke(p.x, p.y - 34);
  }
  // Горящие жабы: урон раз в секунду кусками по кадрам, огонёк над головой
  for (let j = 0; j < enemies.length; j++) {
    const e = enemies[j];
    if (!(e.burnLeft > 0)) continue;
    e.burnLeft--;
    // Свой счётчик тиков: пока жаба стоит в луже, burnLeft каждый кадр выставляется заново
    e.burnTick = (e.burnTick || 0) + 1;
    if (e.burnTick % 15 === 0) damageEnemy(e, FIRE_GOO.burnDps / 4, 'fire', e.x, e.y);
    burningFx(e);
    if (e.burnTick % 60 === 0) addFloatingText(e.x, e.y - 40, `-${FIRE_GOO.burnDps} 🔥`, '#fb923c');
  }
  for (let i = scorches.length - 1; i >= 0; i--) if (++scorches[i].t >= SCORCH_LIFE) scorches.splice(i, 1);
  updateFireFx();
  if (player.gooCd > 0) player.gooCd--;
}

// --- ОГОНЬ: кадры языков пламени рисуются один раз (FLAME_FRAMES штук), дальше только листаются ---
// Язык — три слоя (красный край, оранжевая середина, светлое ядро), край колышется синусами, кончик
// гуляет; кадры зациклены по фазе. Рисуются в режиме 'lighter' — пламя светится и складывается
const FLAME_FRAMES = 24;
const FLAME_W = 48, FLAME_H = 84;
let flameFrames = null;

function getFlameFrames() {
  if (flameFrames) return flameFrames;
  flameFrames = [];
  const layers = [
    { w: 0.48, h: 0.96, blur: 7, base: 'rgba(255, 96, 24, 0.9)', mid: 'rgba(230, 52, 12, 0.55)', tip: 'rgba(160, 20, 6, 0)', amp: 1 },
    { w: 0.34, h: 0.78, blur: 4, base: 'rgba(255, 170, 46, 0.95)', mid: 'rgba(255, 120, 30, 0.6)', tip: 'rgba(255, 80, 20, 0)', amp: 0.8 },
    { w: 0.18, h: 0.5, blur: 2, base: 'rgba(255, 250, 215, 1)', mid: 'rgba(255, 220, 120, 0.8)', tip: 'rgba(255, 180, 60, 0)', amp: 0.55 }
  ];
  for (let f = 0; f < FLAME_FRAMES; f++) {
    const c = document.createElement('canvas');
    c.width = FLAME_W;
    c.height = FLAME_H;
    const g = c.getContext('2d');
    const ph = (f / FLAME_FRAMES) * Math.PI * 2;
    const bx = FLAME_W / 2, by = FLAME_H - 6;
    layers.forEach((L, li) => {
      const H = (FLAME_H - 10) * L.h * (1 + 0.07 * Math.sin(ph * 2 + li));
      const halfW = (FLAME_W / 2) * L.w;
      // Ось языка: к кончику уводит всё сильнее
      const axis = t => Math.sin(t * 4.2 - ph * 2 + li * 0.7) * 5 * L.amp * t + Math.sin(ph + t * 2) * 2 * t;
      const width = t => halfW * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)), 0.7) * Math.pow(1 - t, 0.45)
        * (1 + 0.12 * Math.sin(t * 9 + ph * 3 + li));
      g.save();
      g.shadowColor = L.base;
      g.shadowBlur = L.blur;
      const grad = g.createLinearGradient(0, by, 0, by - H);
      grad.addColorStop(0, L.base);
      grad.addColorStop(0.55, L.mid);
      grad.addColorStop(1, L.tip);
      g.fillStyle = grad;
      g.beginPath();
      const N = 18;
      for (let n = 0; n <= N; n++) {
        const t = n / N;
        const x = bx + axis(t) - width(t), y = by - t * H;
        if (n === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      for (let n = N; n >= 0; n--) {
        const t = n / N;
        g.lineTo(bx + axis(t) + width(t), by - t * H);
      }
      g.closePath();
      g.fill();
      g.restore();
    });
    flameFrames.push(c);
  }
  return flameFrames;
}

// Один язык пламени: (x, y) — основание, scale — размер, seed — свой сдвиг фазы, wide — во сколько раз шире
function drawFlame(ctx, x, y, scale, seed, now, wide = 1) {
  if (scale <= 0.02) return;
  const frames = getFlameFrames();
  const f = frames[Math.floor(Math.abs(now * 26 + seed * 7.3)) % FLAME_FRAMES];
  const w = FLAME_W * scale * wide, h = FLAME_H * scale;
  ctx.drawImage(f, x - w / 2, y - h + 6 * scale, w, h);
}

// Искры и дым огня — свои, не общие particles: искры светятся ('lighter') и вьются, дым тёмный и растёт
let fireFx = [];

function spawnEmber(x, y, spread = 10) {
  fireFx.push({ k: 'ember', x: x + (Math.random() - 0.5) * spread, y, vx: (Math.random() - 0.5) * 0.6,
    vy: -1.2 - Math.random() * 1.4, life: 40 + Math.random() * 30, t: 0, ph: Math.random() * 6, r: 1 + Math.random() * 1.4 });
}

function spawnFireSmoke(x, y) {
  fireFx.push({ k: 'smoke', x: x + (Math.random() - 0.5) * 12, y, vx: (Math.random() - 0.5) * 0.3 + 0.15,
    vy: -0.7 - Math.random() * 0.5, life: 70 + Math.random() * 40, t: 0, r: 6 + Math.random() * 4 });
}

function updateFireFx() {
  for (let i = fireFx.length - 1; i >= 0; i--) {
    const f = fireFx[i];
    f.t++;
    if (f.k === 'ember') {
      f.x += f.vx + Math.sin(f.t * 0.2 + f.ph) * 0.5;
      f.y += f.vy;
      f.vy *= 0.985;
    } else {
      f.x += f.vx;
      f.y += f.vy;
      f.r += 0.35;
    }
    if (f.t >= f.life) fireFx.splice(i, 1);
  }
}

function drawFireFx(ctx, kind) {
  ctx.save();
  if (kind === 'ember') ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < fireFx.length; i++) {
    const f = fireFx[i];
    if (f.k !== kind) continue;
    const k = 1 - f.t / f.life;
    if (kind === 'ember') {
      ctx.fillStyle = k > 0.5 ? `rgba(255, 220, 120, ${k})` : `rgba(255, 110, 30, ${Math.min(1, k * 1.6)})`;
      ctx.fillRect(f.x - f.r / 2, f.y - f.r / 2, f.r, f.r);
    } else {
      ctx.fillStyle = `rgba(38, 34, 32, ${0.32 * k * Math.min(1, f.t / 10)})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Тёплый свет огня на земле и на всём вокруг
function drawFireGlow(ctx, x, y, r, a) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, `rgba(255, 150, 50, ${0.34 * a})`);
  g.addColorStop(0.35, `rgba(255, 100, 30, ${0.12 * a})`);
  g.addColorStop(1, 'rgba(255, 60, 10, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * GROUND_SQUASH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Пятна гари: остаются после лужи и тают за SCORCH_LIFE
const SCORCH_LIFE = 360;
let scorches = [];

// Сила огня лужи: разгорается за 10 кадров, гаснет последнюю секунду
function poolPower(p) {
  return Math.min(1, p.t / 10) * Math.min(1, (FIRE_GOO.poolLife - p.t) / 60);
}

function drawFirePools(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
  const now = performance.now() / 1000;
  const vis = (x, y) => !(x < viewMinX - 120 || x > viewMaxX + 120 || y < viewMinY - 140 || y > viewMaxY + 120);
  // Гарь и сама горючая жижа — на земле
  scorches.forEach(sc => {
    if (!vis(sc.x, sc.y)) return;
    const a = 1 - sc.t / SCORCH_LIFE;
    ctx.save();
    ctx.globalAlpha = a * 0.75;
    const g = ctx.createRadialGradient(sc.x, sc.y, 2, sc.x, sc.y, FIRE_GOO.poolR * 0.95);
    g.addColorStop(0, 'rgba(18, 14, 12, 0.85)');
    g.addColorStop(0.7, 'rgba(30, 22, 16, 0.55)');
    g.addColorStop(1, 'rgba(30, 22, 16, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sc.x, sc.y, FIRE_GOO.poolR * 0.95, FIRE_GOO.poolR * 0.95 * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  firePools.forEach(p => {
    if (!vis(p.x, p.y)) return;
    const pw = poolPower(p);
    const R = FIRE_GOO.poolR * (0.75 + 0.25 * Math.min(1, p.t / 8));
    ctx.save();
    // Маслянистая жижа: тёмная, с рыжей кромкой, подсвеченной огнём
    const g = ctx.createRadialGradient(p.x, p.y, 3, p.x, p.y, R);
    g.addColorStop(0, 'rgba(70, 30, 8, 0.85)');
    g.addColorStop(0.75, 'rgba(120, 48, 10, 0.65)');
    g.addColorStop(1, 'rgba(160, 70, 20, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, R, R * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawFireGlow(ctx, p.x, p.y, R * 1.6, pw * (0.85 + 0.15 * Math.sin(now * 13 + p.x)));
  });
  drawFireFx(ctx, 'smoke');
  // Языки: дальние раньше ближних, чтобы ближние перекрывали
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  firePools.forEach(p => {
    if (!vis(p.x, p.y)) return;
    const pw = poolPower(p);
    p.tongues.forEach(tg => {
      const x = p.x + tg.dx * FIRE_GOO.poolR, y = p.y + tg.dy * FIRE_GOO.poolR * GROUND_SQUASH;
      drawFlame(ctx, x, y, tg.s * pw * (0.85 + 0.15 * Math.sin(now * 7 + tg.seed)), tg.seed, now, tg.w);
    });
  });
  ctx.restore();
  drawFireFx(ctx, 'ember');
  // Летящий сгусток жижи: горящая капля
  gooShots.forEach(sh => {
    drawFireGlow(ctx, sh.x, sh.y + 4, 26, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255, 140, 30, 0.95)';
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    drawFlame(ctx, sh.x, sh.y + 5, 0.32, sh.mx, now);
    ctx.restore();
  });
}

// Высота фигуры над ступнями — докуда облизывает пламя горящую жабу
const BURN_BODY_H = { grunt: 60, sniper: 58, stormtrooper: 64, rocketeer: 66, brute: 96, boss: 140, pounder: 150 };

// Горящая жаба: языки по телу, свет вокруг. Рисуется поверх фигуры
function drawBurning(ctx, e) {
  if (!(e.burnLeft > 0)) return;
  const now = performance.now() / 1000;
  const H = BURN_BODY_H[e.type] || 64;
  const feet = e.y + footDY(e);
  const k = Math.min(1, e.burnLeft / 50) * Math.min(1, (e.burnTick || 0) / 8);
  const sc = H / 64;
  drawFireGlow(ctx, e.x, feet - H * 0.35, H * 1.1, k * 0.8);
  // Языки — по краям силуэта и у ног: сама жаба должна оставаться видна, а не тонуть в белом
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.8;
  const seed = Math.abs(e.startX || e.x) % 10;
  [[-0.34, 0.08, 0.42], [0.32, 0.06, 0.38], [-0.26, 0.48, 0.33], [0.27, 0.58, 0.3], [0.02, 0.0, 0.36], [-0.06, 0.88, 0.24]].forEach(([ox, oy, s], i) => {
    drawFlame(ctx, e.x + ox * H * 0.6, feet - oy * H, s * sc * k * (0.9 + 0.1 * Math.sin(now * 8 + i * 2)), seed + i * 3.1, now);
  });
  ctx.restore();
}

// Искры и дым горящих жаб — из update
function burningFx(e) {
  const H = BURN_BODY_H[e.type] || 64;
  const feet = e.y + footDY(e);
  if (e.burnTick % 4 === 0) spawnEmber(e.x, feet - H * (0.3 + Math.random() * 0.5), H * 0.5);
  if (e.burnTick % 9 === 0) spawnFireSmoke(e.x, feet - H * 0.9);
}

function resetFireGoo() {
  gooShots = [];
  firePools = [];
  scorches = [];
  fireFx = [];
}

// --- СПОСОБНОСТИ НА ПКМ: карта Долбильщика (рывок или гиперрегенерация) и горючая жижа. F листает ---
const RMB_ABILITIES = {
  dash: { icon: '💨', ru: 'РЫВОК', en: 'DASH' },
  regen: { icon: '💚', ru: 'ГИПЕРРЕГЕНЕРАЦИЯ', en: 'HYPER-REGENERATION' },
  fire_goo: { icon: '🔥', ru: 'ГОРЮЧАЯ ЖИЖА', en: 'FIRE GOO' }
};

function rmbAbilities() {
  const list = [];
  const card = cardAbility();
  if (card) list.push(card);
  if (player.hasPerk('fire_goo')) list.push('fire_goo');
  return list;
}

// Выбранная способность (player.rmbAbility); если её нет — первая доступная
function currentRmbAbility() {
  const list = rmbAbilities();
  if (!list.length) return null;
  return list.includes(player.rmbAbility) ? player.rmbAbility : list[0];
}

function cycleRmbAbility() {
  const list = rmbAbilities();
  if (list.length < 2) return;
  const i = list.indexOf(currentRmbAbility());
  player.rmbAbility = list[(i + 1) % list.length];
  const def = RMB_ABILITIES[player.rmbAbility];
  addFloatingText(player.x, player.y - 44, `${def.icon} ${currentLang === 'ru' ? def.ru : def.en}`, '#facc15');
  updateHUD(true);
}

function rmbCooldown(ab) {
  return ab === 'fire_goo' ? (player.gooCd || 0) : (player.abilityCd || 0);
}

function useRmbAbility() {
  const ab = currentRmbAbility();
  if (!ab || player.stunTimer > 0) return;
  const cd = rmbCooldown(ab);
  if (cd > 0) {
    addFloatingText(player.x, player.y - 30, currentLang === 'ru' ? `⏳ ${Math.ceil(cd / 60)} С` : `⏳ ${Math.ceil(cd / 60)}s`, '#94a3b8');
    return;
  }
  if (ab === 'fire_goo') {
    shootFireGoo();
    updateHUD(true);
  } else {
    useCardAbility();
  }
}
