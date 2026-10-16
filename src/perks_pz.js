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
  // Кооп: лежащего не добивают; жабы и боссы бьют сильнее, чем больше игроков (coopScale в game.js)
  if (player.downT > 0 || player.dead) return 0;
  if (players.length > 1) dmg *= enemyActing && (enemyActing.type === 'boss' || enemyActing.type === 'pounder') ? coopScale().bossDmg : coopScale().dmg;
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

// --- ГОРЮЧАЯ ЖИЖА (ПКМ): струя на 3 м вперёд, жижа растекается и горит 5 с, поджигает жаб ---
const FIRE_GOO = {
  range: 120,            // 3 м (~40 px на метр)
  flight: 20,            // кадров полёта капли
  drops: 7,              // капель в струе
  dropGap: 2,            // кадров между каплями
  poolR: 52,             // радиус горящей лужи (по земле сплюснут, GROUND_SQUASH)
  spreadFrames: 24,      // жижа растекается от места попадания за 0,4 с, огонь бежит следом
  poolLife: 300,         // 5 с
  burnFrames: 240,       // жаба горит 4 с и после выхода из лужи
  burnDps: 8,
  charFrames: 150,       // обугленной остаётся ещё 2,5 с после того, как погасла
  cooldown: 720          // 12 с
};
let gooShots = [];       // струи: капли летят дугой друг за другом
let firePools = [];
let splashFires = [];    // горящие брызги вокруг лужи — маленькие огоньки на 1–2 с

// ===== Огонь-симуляция =====
// Классический «Doom fire»: нижний ряд — источник жара, каждый кадр жар поднимается на клетку вверх,
// остывая на 0–2 и сбиваясь вбок на клетку — так языки сами рвутся, сливаются и колышутся.
// Цвет — по палитре от тёмно-красного к жёлто-белому, холодное прозрачно. У каждой лужи и каждой горящей
// жабы — своё поле (несколько тысяч клеток — дёшево), рисуется в режиме 'lighter'
const FIRE_MAX = 36;
const FIRE_PALETTE = (() => {
  const stops = [[0, 0, 0, 0, 0], [5, 120, 16, 6, 0.35], [11, 200, 40, 10, 0.75], [18, 240, 92, 18, 0.92],
    [25, 255, 150, 32, 1], [31, 255, 210, 80, 1], [36, 255, 248, 210, 1]];
  const pal = [];
  for (let v = 0; v <= FIRE_MAX; v++) {
    let i = 0;
    while (i < stops.length - 2 && v > stops[i + 1][0]) i++;
    const [v0, r0, g0, b0, a0] = stops[i], [v1, r1, g1, b1, a1] = stops[i + 1];
    const k = (v - v0) / (v1 - v0);
    pal.push([r0 + (r1 - r0) * k, g0 + (g1 - g0) * k, b0 + (b1 - b0) * k, (a0 + (a1 - a0) * k) * 255].map(Math.round));
  }
  return pal;
})();

// Поле с запасом: жар подаётся только в середину нижнего ряда (source даёт 0 у краёв), а высота такая,
// что языки гаснут раньше верха (в среднем −1 жара на клетку при cool = 1,5) — иначе пламя упирается
// в края поля и обрезается ровной линией
class FireField {
  constructor(w, h, cool = 1.5) {
    this.w = w;
    this.h = h;
    this.cool = cool;      // среднее остывание за клетку: меньше — языки выше
    this.cells = new Uint8Array(w * h);
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.g = this.canvas.getContext('2d');
    this.img = this.g.createImageData(w, h);
  }

  // source(x) — сколько жара (0..1) в нижнем ряду у столбца x
  step(source) {
    const { w, h, cells } = this;
    for (let x = 0; x < w; x++) {
      const heat = source(x);
      cells[(h - 1) * w + x] = heat > 0 ? Math.min(FIRE_MAX, Math.round(FIRE_MAX * heat * (0.75 + Math.random() * 0.25))) : 0;
    }
    for (let y = 1; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const src = y * w + x;
        const v = cells[src];
        const dx = ((Math.random() * 3) | 0) - 1;
        const nx = Math.min(w - 1, Math.max(0, x + dx));
        const decay = (Math.random() * this.cool * 2) | 0;
        cells[(y - 1) * w + nx] = v > decay ? v - decay : 0;
      }
    }
    // Нижние ряды — источник жара, ровная яркая полоса: растворяем, чтобы у огня не было «линейки» снизу
    const d = this.img.data;
    const fadeFrom = h - 5;
    for (let i = 0; i < cells.length; i++) {
      const c = FIRE_PALETTE[cells[i]];
      const y = (i / w) | 0;
      d[i * 4] = c[0];
      d[i * 4 + 1] = c[1];
      d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = y > fadeFrom ? c[3] * (h - 1 - y) / (h - 1 - fadeFrom) : c[3];
    }
    this.g.putImageData(this.img, 0, 0);
  }
}

// Маленькие языки (капли струи, брызги) — заготовленные кадры, как раньше
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

function drawFlame(ctx, x, y, scale, seed, now, wide = 1) {
  if (scale <= 0.02) return;
  const frames = getFlameFrames();
  const f = frames[Math.floor(Math.abs(now * 26 + seed * 7.3)) % FLAME_FRAMES];
  const w = FLAME_W * scale * wide, h = FLAME_H * scale;
  ctx.drawImage(f, x - w / 2, y - h + 6 * scale, w, h);
}

// ===== Искры, дым, капли, брызги — свои частицы огня =====
let fireFx = [];

function spawnEmber(x, y, spread = 10) {
  fireFx.push({ k: 'ember', x: x + (Math.random() - 0.5) * spread, y, vx: (Math.random() - 0.5) * 0.6,
    vy: -1.2 - Math.random() * 1.4, life: 40 + Math.random() * 30, t: 0, ph: Math.random() * 6, r: 1 + Math.random() * 1.4 });
}

function spawnFireSmoke(x, y) {
  fireFx.push({ k: 'smoke', x: x + (Math.random() - 0.5) * 14, y, vx: (Math.random() - 0.5) * 0.3 + 0.15,
    vy: -0.7 - Math.random() * 0.5, life: 70 + Math.random() * 40, t: 0, r: 6 + Math.random() * 4 });
}

// Капля жижи, стекающая со струи: падает и гаснет
function spawnDrip(x, y) {
  fireFx.push({ k: 'drip', x, y, vx: (Math.random() - 0.5) * 0.8, vy: 0.4 + Math.random() * 0.6, life: 16 + Math.random() * 8, t: 0, r: 1.5 + Math.random() });
}

function updateFireFx() {
  for (let i = fireFx.length - 1; i >= 0; i--) {
    const f = fireFx[i];
    f.t++;
    if (f.k === 'ember') {
      f.x += f.vx + Math.sin(f.t * 0.2 + f.ph) * 0.5;
      f.y += f.vy;
      f.vy *= 0.985;
    } else if (f.k === 'drip') {
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.25;
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
  if (kind !== 'smoke') ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < fireFx.length; i++) {
    const f = fireFx[i];
    if (f.k !== kind) continue;
    const k = 1 - f.t / f.life;
    if (kind === 'smoke') {
      ctx.fillStyle = `rgba(38, 34, 32, ${0.32 * k * Math.min(1, f.t / 10)})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = k > 0.5 ? `rgba(255, 220, 120, ${k})` : `rgba(255, 110, 30, ${Math.min(1, k * 1.6)})`;
      ctx.fillRect(f.x - f.r / 2, f.y - f.r / 2, f.r, f.r);
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

// ===== Струя =====
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
  const mx = player.x + Math.cos(a) * 18, my = player.y - 22;
  // Капли струи: следующая чуть позже и чуть в сторону — струя, а не шарик
  const drops = [];
  for (let n = 0; n < FIRE_GOO.drops; n++) {
    const off = (n - (FIRE_GOO.drops - 1) / 2) * 3;
    drops.push({ delay: n * FIRE_GOO.dropGap, ox: -Math.sin(a) * off, oy: Math.cos(a) * off * GROUND_SQUASH,
      r: 3.2 + Math.random() * 2.2 - n * 0.25, x: mx, y: my, px: mx, py: my, seed: Math.random() * 10 });
  }
  gooShots.push({ mx, my, tx, ty, angle: a, t: 0, drops, landed: false });
  player.gooCd = FIRE_GOO.cooldown;
  FireSound.shot();
  addFloatingText(player.x, player.y - 34, currentLang === 'ru' ? '🔥 ГОРЮЧАЯ ЖИЖА' : '🔥 FIRE GOO', '#fb923c');
}

function landGoo(sh) {
  FireSound.land(enemySoundVolume(sh.tx, sh.ty, true));
  // Лужа растекается от места попадания; огонь бежит по ней (pool.spread)
  // Очаги огня разложены по всей круглой луже: середина, внутреннее и внешнее кольцо; рисуются от дальних к ближним
  const cols = [{ dx: 0, dy: 0, r: 0 }];
  for (let n = 0; n < 6; n++) {
    const a = n / 6 * Math.PI * 2 + 0.3;
    cols.push({ dx: Math.cos(a) * 0.48, dy: Math.sin(a) * 0.48, r: 0.48 });
  }
  for (let n = 0; n < 7; n++) {
    const a = n / 7 * Math.PI * 2 + 0.1;
    cols.push({ dx: Math.cos(a) * 0.82, dy: Math.sin(a) * 0.82, r: 0.82 });
  }
  // Середина горит выше (меньше остывание за клетку), кромка — ниже
  cols.forEach(c => { c.field = new FireField(30, 56, 1.15 + c.r * 0.5); c.seed = Math.random() * 100; });
  cols.sort((a, b) => a.dy - b.dy);
  firePools.push({ x: sh.tx, y: sh.ty, t: 0, cols, seed: Math.random() * 100 });
  // Всплеск: горящие брызги разлетаются по земле и догорают маленькими огоньками
  for (let n = 0; n < 9; n++) {
    const a = sh.angle + (Math.random() - 0.5) * 2.6;
    const dist = FIRE_GOO.poolR * (0.9 + Math.random() * 0.8);
    splashFires.push({ x: sh.tx, y: sh.ty, tx: sh.tx + Math.cos(a) * dist, ty: sh.ty + Math.sin(a) * dist * GROUND_SQUASH,
      t: 0, fly: 10 + Math.random() * 8, life: 60 + Math.random() * 60, s: 0.16 + Math.random() * 0.12, seed: Math.random() * 10, z: 0 });
  }
  for (let n = 0; n < 16; n++) spawnEmber(sh.tx, sh.ty - 6, FIRE_GOO.poolR);
}

// Сила огня лужи: разгорается за 10 кадров, гаснет последнюю секунду
function poolPower(p) {
  return Math.min(1, p.t / 10) * Math.min(1, (FIRE_GOO.poolLife - p.t) / 60);
}

// Доля растёкшейся жижи (0..1)
function poolSpread(p) {
  const k = Math.min(1, p.t / FIRE_GOO.spreadFrames);
  return 1 - (1 - k) * (1 - k);
}

function updateFireGoo() {
  for (let i = gooShots.length - 1; i >= 0; i--) {
    const sh = gooShots[i];
    sh.t++;
    let done = true;
    sh.drops.forEach((d, n) => {
      const s = Math.min(1, Math.max(0, (sh.t - d.delay) / FIRE_GOO.flight));
      if (s < 1) done = false;
      d.px = d.x;
      d.py = d.y;
      d.x = sh.mx + d.ox + (sh.tx - sh.mx) * s;
      d.y = sh.my + d.oy + (sh.ty - sh.my) * s - 56 * s * (1 - s);
      if (s > 0 && s < 1 && Math.random() < 0.3) spawnDrip(d.x, d.y);
      if (s > 0 && s < 1 && n % 2 === 0 && sh.t % 3 === 0) spawnEmber(d.x, d.y, 3);
    });
    // Первая капля упала — всплеск и лужа; остальные доливают в неё
    if (!sh.landed && sh.t >= FIRE_GOO.flight) {
      sh.landed = true;
      landGoo(sh);
    }
    if (done) gooShots.splice(i, 1);
  }
  for (let i = firePools.length - 1; i >= 0; i--) {
    const p = firePools[i];
    if (++p.t >= FIRE_GOO.poolLife) {
      scorches.push({ x: p.x, y: p.y, t: 0 });
      firePools.splice(i, 1);
      continue;
    }
    const pw = poolPower(p);
    const spread = poolSpread(p);
    // Огонь бежит от середины к краям, пока жижа растекается; в середине выше, у кромки ниже.
    // Основание очага — округлое, в середине поля (у краёв поля жара нет)
    p.cols.forEach(c => {
      const lit = c.r <= spread + 0.05 ? 1 : 0;
      const k = lit * pw * (1 - 0.42 * c.r) * (0.82 + 0.18 * Math.sin(p.t * 0.17 + c.seed));
      c.field.step(x => {
        const u = Math.abs(x / (c.field.w - 1) * 2 - 1) / 0.62;
        return u < 1 ? k * Math.sqrt(1 - u * u) : 0;
      });
    });
    // Кто стоит в огне — загорается (и горит ещё 4 с после выхода)
    const R = FIRE_GOO.poolR * spread;
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (inGroundEllipse(e.x, e.y + footDY(e), p.x, p.y, R)) e.burnLeft = FIRE_GOO.burnFrames;
    }
    if (p.t % 3 === 0 && Math.random() < pw) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R * 0.8;
      spawnEmber(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * GROUND_SQUASH - 16, 6);
    }
    if (p.t % 8 === 0 && pw > 0.3) spawnFireSmoke(p.x, p.y - 44);
  }
  for (let i = splashFires.length - 1; i >= 0; i--) {
    const f = splashFires[i];
    f.t++;
    if (f.t <= f.fly) {
      const s = f.t / f.fly;
      f.z = 16 * s * (1 - s) * 4;
      if (f.t % 2 === 0) spawnEmber(f.x + (f.tx - f.x) * s, f.y + (f.ty - f.y) * s - f.z, 2);
    }
    if (f.t >= f.fly + f.life) splashFires.splice(i, 1);
  }
  // Горящие жабы: урон тиками, своё поле огня, искры и дым; после — обугленный вид
  for (let j = 0; j < enemies.length; j++) {
    const e = enemies[j];
    if (e.charLeft > 0 && !(e.burnLeft > 0)) e.charLeft--;
    if (!(e.burnLeft > 0)) {
      if (e.burnField && !(e.charLeft > 0)) e.burnField = null;
      continue;
    }
    e.burnLeft--;
    e.charLeft = FIRE_GOO.charFrames;
    // Свой счётчик тиков: пока жаба стоит в луже, burnLeft каждый кадр выставляется заново
    e.burnTick = (e.burnTick || 0) + 1;
    if (e.burnTick % 15 === 0) damageEnemy(e, FIRE_GOO.burnDps / 4, 'fire', e.x, e.y);
    if (e.burnTick % 60 === 0) addFloatingText(e.x, e.y - 40, `-${FIRE_GOO.burnDps} 🔥`, '#fb923c');
    if (!e.burnField) e.burnField = new FireField(40, 64, 1.12);
    const k = burnPower(e);
    // Жар — по ширине тела (середина поля), у боков сильнее: силуэт охвачен, середина видна;
    // по краям поля — запас, чтобы языки не упирались в границу
    e.burnField.step(x => {
      const u = Math.abs(x / 39 * 2 - 1) / 0.58;
      return u < 1 ? k * (0.62 + 0.38 * u) * (u > 0.85 ? (1 - u) / 0.15 * 0.6 + 0.4 : 1) : 0;
    });
    burningFx(e);
  }
  for (let i = scorches.length - 1; i >= 0; i--) if (++scorches[i].t >= SCORCH_LIFE) scorches.splice(i, 1);
  updateFireFx();
  updateFireSound();
  if (player.gooCd > 0) player.gooCd--;
}

// ===== Звук огня (WebAudio, синтез — как остальные звуки игры в SoundFX) =====
// Выстрел: влажный плевок под давлением, бульканье, толчок, «фух» воспламенения. Падение — глухой «вумп».
// Горение — непрерывный гул пламени (громкость — сколько огня и как близко), поверх — случайный треск
// и хлопки; горящие жабы шипят. SoundFX объявлен в game.js — здесь он берётся только во время игры
const FireSound = {
  loop: null,        // { src, gain, lp, bp, lfo } — гул пламени, пока есть огонь
  level: 0,
  quietFrames: 0,
  longNoise: null,

  // Шум на 2 с — для зацикленного гула (общий в SoundFX — полсекунды, на петле слышен повтор)
  noise(ac) {
    if (this.longNoise) return this.longNoise;
    const sr = ac.sampleRate;
    const buf = ac.createBuffer(1, sr * 2, sr);
    const d = buf.getChannelData(0);
    // Коричневый шум — тёплый, «рокочущий», без шипения белого
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    this.longNoise = buf;
    return buf;
  },

  // Кусок шума через фильтр с огибающей: type, частота от/до, громкость, длительность
  burst(ac, at, { type = 'bandpass', f0, f1, q = 1, vol, dur, attack = 0.004, brown = false }) {
    const src = ac.createBufferSource();
    src.buffer = brown ? this.noise(ac) : SoundFX.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, at);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f);
    f.connect(g);
    g.connect(SoundFX.out);
    src.start(at, Math.random() * 0.3);
    src.stop(at + dur + 0.02);
  },

  tone(ac, at, { type = 'sine', f0, f1, vol, dur }) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(SoundFX.out);
    o.start(at);
    o.stop(at + dur + 0.02);
  },

  // Выстрел горючей жижей
  shot() {
    const ac = SoundFX.ensure();
    if (!ac) return;
    const t = ac.currentTime;
    // 1. Плевок под давлением: короткое «пш», полоса уходит вверх
    this.burst(ac, t, { type: 'bandpass', f0: 700, f1: 2600, q: 0.9, vol: 0.32, dur: 0.11, attack: 0.003 });
    // 2. Толчок помпы
    this.tone(ac, t, { type: 'triangle', f0: 150, f1: 52, vol: 0.32, dur: 0.16 });
    // 3. Бульканье жижи — несколько мокрых пузырей
    for (let i = 0; i < 4; i++) {
      const at = t + 0.03 + i * (0.028 + Math.random() * 0.02);
      const f = 380 + Math.random() * 520;
      this.burst(ac, at, { type: 'bandpass', f0: f, f1: f * 1.6, q: 7, vol: 0.12 + Math.random() * 0.06, dur: 0.05 });
    }
    // 4. «Фух» воспламенения: тёплый шум разгорается и опадает
    this.burst(ac, t + 0.05, { type: 'lowpass', f0: 320, f1: 1900, q: 0.7, vol: 0.34, dur: 0.38, attack: 0.09, brown: true });
  },

  // Струя упала — лужа вспыхнула: глухой «вумп» и первый треск
  land(vol = 1) {
    const ac = SoundFX.ensure();
    if (!ac || vol <= 0.02) return;
    const t = ac.currentTime;
    this.burst(ac, t, { type: 'lowpass', f0: 1400, f1: 180, q: 0.8, vol: 0.5 * vol, dur: 0.45, attack: 0.012, brown: true });
    this.tone(ac, t, { type: 'sine', f0: 95, f1: 38, vol: 0.42 * vol, dur: 0.3 });
    // Шлепок жижи
    this.burst(ac, t, { type: 'bandpass', f0: 520, f1: 260, q: 2.5, vol: 0.22 * vol, dur: 0.09 });
    for (let i = 0; i < 5; i++) this.crackle(vol * 0.8, t + 0.05 + Math.random() * 0.25);
  },

  // Щелчок треска; иногда — хлопок погромче и ниже
  crackle(vol = 1, at = null) {
    const ac = SoundFX.ensure();
    if (!ac || vol <= 0.02) return;
    const t = at === null ? ac.currentTime : at;
    const pop = Math.random() < 0.12;
    const f = pop ? 900 + Math.random() * 900 : 2200 + Math.random() * 4200;
    this.burst(ac, t, { type: pop ? 'bandpass' : 'highpass', f0: f, f1: f * 0.7, q: pop ? 3 : 0.8,
      vol: (pop ? 0.3 : 0.07 + Math.random() * 0.1) * vol, dur: pop ? 0.05 : 0.008 + Math.random() * 0.018, attack: 0.001 });
  },

  // Шипение горящей жабы
  sizzle(vol = 1) {
    const ac = SoundFX.ensure();
    if (!ac || vol <= 0.02) return;
    const t = ac.currentTime;
    this.burst(ac, t, { type: 'highpass', f0: 3200 + Math.random() * 1500, f1: 5200, q: 0.6, vol: 0.07 * vol, dur: 0.25 + Math.random() * 0.2, attack: 0.03 });
  },

  // Гул пламени: level 0..1 каждый кадр. Петля заводится, когда огонь появился, и глохнет через секунду тишины
  setLevel(level) {
    this.level = level;
    if (level <= 0.01) {
      if (this.loop && ++this.quietFrames > 60) this.stopLoop();
      if (this.loop) this.loop.gain.gain.setTargetAtTime(0.0001, SoundFX.ctx.currentTime, 0.15);
      return;
    }
    this.quietFrames = 0;
    const ac = SoundFX.ensure();
    if (!ac) return;
    if (!this.loop) this.startLoop(ac);
    const t = ac.currentTime;
    // Пламя дышит: громкость и тембр слегка колышутся
    const flutter = 0.82 + 0.18 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1);
    // Если обновления прекратятся (пауза, меню) — гул сам затихнет через четверть секунды
    const g = this.loop.gain.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.28 * level * flutter, t, 0.08);
    g.setTargetAtTime(0.0001, t + 0.25, 0.12);
    this.loop.lp.frequency.setTargetAtTime(380 + 520 * level * flutter, t, 0.1);
  },

  startLoop(ac) {
    const src = ac.createBufferSource();
    src.buffer = this.noise(ac);
    src.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    lp.Q.value = 0.6;
    // Второй слой — «рёв» в середине: полосовой шум
    const src2 = ac.createBufferSource();
    src2.buffer = this.noise(ac);
    src2.loop = true;
    src2.playbackRate.value = 1.6;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 0.8;
    const bpGain = ac.createGain();
    bpGain.gain.value = 0.35;
    const gain = ac.createGain();
    gain.gain.value = 0.0001;
    src.connect(lp);
    lp.connect(gain);
    src2.connect(bp);
    bp.connect(bpGain);
    bpGain.connect(gain);
    gain.connect(SoundFX.out);
    src.start(0, Math.random());
    src2.start(0, Math.random());
    this.loop = { src, src2, gain, lp };
  },

  stopLoop() {
    if (!this.loop) return;
    try {
      this.loop.src.stop();
      this.loop.src2.stop();
    } catch (e) { /* уже остановлен */ }
    this.loop.gain.disconnect();
    this.loop = null;
  }
};

// Каждый кадр из updateFireGoo: сколько огня слышно (лужи, брызги, горящие жабы — с учётом расстояния),
// гул и случайный треск
function updateFireSound() {
  let level = 0;
  firePools.forEach(p => { level += poolPower(p) * enemySoundVolume(p.x, p.y, true); });
  for (let j = 0; j < enemies.length; j++) {
    const e = enemies[j];
    if (!(e.burnLeft > 0)) continue;
    const v = burnPower(e) * enemySoundVolume(e.x, e.y, true);
    level += v * 0.45;
    if (Math.random() < 0.012) FireSound.sizzle(v);
  }
  level += splashFires.length * 0.02;
  level = Math.min(1, level);
  FireSound.setLevel(gameState === 'PLAYING' ? level : 0);
  if (gameState === 'PLAYING' && Math.random() < level * 0.22) FireSound.crackle(0.5 + level * 0.5); // ~13 щелчков в секунду у полного огня
}

// ===== Отрисовка лужи, брызг, струи (слой земли, под фигурами) =====
function drawFirePools(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
  const now = performance.now() / 1000;
  const vis = (x, y) => !(x < viewMinX - 140 || x > viewMaxX + 140 || y < viewMinY - 160 || y > viewMaxY + 140);
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
  // Жижа на земле: тёмная маслянистая, растекается; подсвечена огнём
  firePools.forEach(p => {
    if (!vis(p.x, p.y)) return;
    const R = FIRE_GOO.poolR * (0.15 + 0.85 * poolSpread(p));
    ctx.save();
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
    g.addColorStop(0, 'rgba(60, 26, 8, 0.85)');
    g.addColorStop(0.7, 'rgba(110, 44, 10, 0.7)');
    g.addColorStop(1, 'rgba(150, 64, 18, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, R, R * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawFireGlow(ctx, p.x, p.y, R * 1.7, poolPower(p) * (0.85 + 0.15 * Math.sin(now * 13 + p.seed)));
  });
  drawFireFx(ctx, 'smoke');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  firePools.forEach(p => {
    if (!vis(p.x, p.y)) return;
    // Очаги по всей луже, от дальних к ближним — объёмный костёр по её круглой площади
    const R = FIRE_GOO.poolR;
    const cw = R * 1.25;
    p.cols.forEach(c => {
      const ch = cw * c.field.h / c.field.w;
      const bx = p.x + c.dx * R, by = p.y + c.dy * R * GROUND_SQUASH;
      ctx.drawImage(c.field.canvas, bx - cw / 2, by - ch + 4, cw, ch);
    });
  });
  // Горящие брызги: летят, падают и догорают
  splashFires.forEach(f => {
    if (!vis(f.x, f.y)) return;
    const s = Math.min(1, f.t / f.fly);
    const x = f.x + (f.tx - f.x) * s, y = f.y + (f.ty - f.y) * s - (f.t <= f.fly ? f.z : 0);
    const left = f.fly + f.life - f.t;
    drawFlame(ctx, x, y, f.s * Math.min(1, left / 30), f.seed, now);
  });
  ctx.restore();
  drawFireFx(ctx, 'ember');
  drawFireFx(ctx, 'drip');
  // Струя: горящие капли со светом
  gooShots.forEach(sh => {
    sh.drops.forEach(d => {
      if (sh.t < d.delay || sh.t >= d.delay + FIRE_GOO.flight) return;
      drawFireGlow(ctx, d.x, d.y + 4, 18, 0.7);
      // Горящая капля-комета: яркая голова, огненный хвост назад по полёту, чуть колышется
      const vx = d.x - d.px, vy = d.y - d.py;
      const len = Math.hypot(vx, vy) || 1;
      const tl = 10 + d.r * 3 + Math.sin(now * 30 + d.seed) * 2;
      const ex = d.x - vx / len * tl, ey = d.y - vy / len * tl;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const tail = ctx.createLinearGradient(d.x, d.y, ex, ey);
      tail.addColorStop(0, 'rgba(255, 190, 70, 0.95)');
      tail.addColorStop(0.45, 'rgba(255, 100, 24, 0.7)');
      tail.addColorStop(1, 'rgba(200, 40, 10, 0)');
      ctx.strokeStyle = tail;
      ctx.lineCap = 'round';
      ctx.lineWidth = d.r * 2;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.lineWidth = d.r;
      ctx.stroke();
      const head = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 1.4);
      head.addColorStop(0, 'rgba(255, 250, 220, 1)');
      head.addColorStop(0.5, 'rgba(255, 170, 50, 0.9)');
      head.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  });
}

// ===== Горящая жаба =====
// Высота фигуры над ступнями и ширина — по ним кладётся поле огня
const BURN_BODY = {
  grunt: [60, 44], sniper: [58, 40], stormtrooper: [64, 46], rocketeer: [66, 48],
  brute: [96, 76], boss: [140, 110], pounder: [150, 120]
};

function burnPower(e) {
  return Math.min(1, (e.burnLeft || 0) / 50) * Math.min(1, (e.burnTick || 0) / 8);
}

// Огонь позади фигуры: шире и выше её — силуэт охвачен пламенем
function drawBurningBack(ctx, e) {
  if (!(e.burnLeft > 0) || !e.burnField) return;
  const [H, W] = BURN_BODY[e.type] || [62, 44];
  const feet = e.y + footDY(e);
  drawFireGlow(ctx, e.x, feet - H * 0.3, H * 1.1, burnPower(e) * 0.8);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Жар занимает середину поля (58%) — поле шире тела, чтобы языки по бокам не обрезались
  const w = W * 2.1, h = w * e.burnField.h / e.burnField.w;
  ctx.drawImage(e.burnField.canvas, e.x - w / 2, feet - h + 6, w, h);
  ctx.restore();
}

// Огонь перед фигурой: прозрачнее и ниже, жаба видна сквозь него
function drawBurningFront(ctx, e) {
  if (!(e.burnLeft > 0) || !e.burnField) return;
  const [H, W] = BURN_BODY[e.type] || [62, 44];
  const feet = e.y + footDY(e);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55;
  const w = W * 1.6, h = w * e.burnField.h / e.burnField.w * 0.8;
  // Зеркально, чтобы передние языки не повторяли задние
  ctx.translate(e.x, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(e.burnField.canvas, -w / 2, feet - h + 8, w, h);
  ctx.restore();
}

// Горит — дёргается; горит или только что погасла — темнеет от гари. Применяется к рисованию фигуры
function burnTransform(ctx, e) {
  if (e.burnLeft > 0) {
    const t = performance.now() / 1000;
    ctx.translate(Math.sin(t * 47 + e.x) * 1.6 * burnPower(e), Math.sin(t * 31 + e.y) * 0.8 * burnPower(e));
  }
  if (e.charLeft > 0) {
    const k = e.burnLeft > 0 ? Math.min(1, (e.burnTick || 0) / 40) : e.charLeft / FIRE_GOO.charFrames;
    ctx.filter = `brightness(${(1 - 0.5 * k).toFixed(2)}) saturate(${(1 - 0.6 * k).toFixed(2)}) sepia(${(0.35 * k).toFixed(2)})`;
  }
}

// Искры и дым горящих жаб — из update
function burningFx(e) {
  const [H, W] = BURN_BODY[e.type] || [62, 44];
  const feet = e.y + footDY(e);
  if (e.burnTick % 3 === 0) spawnEmber(e.x, feet - H * (0.4 + Math.random() * 0.6), W);
  if (e.burnTick % 7 === 0) spawnFireSmoke(e.x, feet - H * 1.2);
}

function resetFireGoo() {
  gooShots = [];
  firePools = [];
  splashFires = [];
  scorches = [];
  fireFx = [];
}

// --- ЗНАЧКИ ПЕРКОВ И СПОСОБНОСТЕЙ: assets/sprites/perks/<id>.png (tools/make_trophy_sprites.py perks_*).
// Здесь, а не в game.js: этот файл грузится раньше, а значки нужны лавке, окну персонажа и хотбару
function perkIconSrc(id) {
  return `assets/sprites/perks/${id}.png?v=1`;
}

// <img> значка; если картинки нет — пропадает, остаётся текст
function perkIconImg(id, cls) {
  const img = document.createElement('img');
  img.className = cls;
  img.src = perkIconSrc(id);
  img.alt = '';
  img.onerror = () => img.remove();
  return img;
}

// --- СПОСОБНОСТИ НА ПКМ: карта Долбильщика (рывок или гиперрегенерация) и горючая жижа. F листает ---
// img — значок assets/sprites/perks/<img>.png; icon — эмодзи, пока картинка не загрузилась (и во всплывающем тексте)
const RMB_ABILITIES = {
  dash: { icon: '💨', img: 'ability_dash', ru: 'РЫВОК', en: 'DASH' },
  regen: { icon: '💚', img: 'ability_regen', ru: 'ГИПЕРРЕГЕНЕРАЦИЯ', en: 'HYPER-REGENERATION' },
  fire_goo: { icon: '🔥', img: 'fire_goo', ru: 'ГОРЮЧАЯ ЖИЖА', en: 'FIRE GOO' }
};
const RMB_ICON_IMG = {};
Object.keys(RMB_ABILITIES).forEach(k => {
  RMB_ICON_IMG[k] = new Image();
  RMB_ICON_IMG[k].src = perkIconSrc(RMB_ABILITIES[k].img);
});

// Значок у хотбара: картинка, а пока её нет — эмодзи. Меняется, только когда сменилась способность
function setRmbIcon(el, ab) {
  const img = RMB_ICON_IMG[ab];
  const ready = !!(img && img.complete && img.naturalWidth);
  const key = (ready ? 'img:' : 'txt:') + ab;
  if (!el || el._rmbKey === key) return;
  el._rmbKey = key;
  el.textContent = ready ? '' : RMB_ABILITIES[ab].icon;
  if (ready) el.appendChild(img.cloneNode());
}

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
