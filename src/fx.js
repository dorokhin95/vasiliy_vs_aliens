// Эффекты боя — только картинка, на ход игры не влияют.
//  - Удар по Василию (Fx.hurt — из armorAbsorb, src/perks_pz.js): росчерк когтей или вспышка попадания,
//    брызги крови летят прочь от того, кто ударил, падают и остаются пятнами на земле; сам Василий
//    вспыхивает красным (src/three_character.js), у своего края экрана краснеют, на последних 30 %
//    здоровья — бьётся пульс. Кислота и яд — шипят зелёным, без крови.
//  - Всплески для способностей жаб (src/elites.js): икринка лопнула, раздутый взорвался, кровосос пьёт.
// fxBits — то, что летит (капли, ошмётки, росчерки, кольца): создаёт хост, товарищам уходят новые
// (FX в src/net.js), дальше каждый двигает их сам (Fx.update из updateCosmetics). Пятна на земле — у каждого
// свои: остаются там, где упала капля.
// Загружается после game.js: player, players, localPlayer, enemyActing, footDY, GROUND_SQUASH — оттуда

let fxBits = [];

(function () {
  const GRAV = 0.38;
  const MAX_BITS = 600;
  const MAX_DECALS = 220;
  const HIT_GAP = 8;         // мелкий непрерывный урон (жаба трётся о Василия) — брызги не чаще раза в столько кадров
  const DOT_GAP = 16;
  const MIN_GAP = 5;
  const FLASH = 12;          // кадров красной вспышки на Василии
  // Росчерк: [толщина, цвет, прозрачность] — от свечения к белой сердцевине
  const SLASH_RED = [[7, '#7f1d1d', 0.45], [4, '#ef4444', 0.9], [1.6, '#fff7ed', 1]];
  const SLASH_PINK = [[7, '#831843', 0.45], [4, '#f472b6', 0.9], [1.6, '#fdf2f8', 1]];

  // Палитры: от тёмного к светлому
  const PAL = {
    blood: ['#5f0f0f', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626'],
    acid: ['#3f6212', '#4d7c0f', '#65a30d', '#84cc16', '#bef264'],
    goo: ['#854d0e', '#a16207', '#ca8a04', '#eab308', '#fde68a'],
    gore: ['#14532d', '#166534', '#3f6212', '#4d7c0f', '#65a30d'],
    pink: ['#831843', '#9d174d', '#be185d', '#db2777', '#f472b6'],
    shell: ['#a8a29e', '#d6d3d1', '#e7e5e4', '#fef3c7', '#fffbeb']
  };

  let decals = [];
  let frame = 0;
  let fromHint = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function push(b) {
    if (fxBits.length >= MAX_BITS) fxBits.splice(0, fxBits.length - MAX_BITS + 1);
    fxBits.push(b);
  }

  // Детерминированный случайный ряд — для одинаковой формы пятна у всех
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedOf(x, y) { return ((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663)) >>> 0; }

  // Гладкий замкнутый контур через точки (середины отрезков — опорные, точки — контрольные)
  function blobPath(g, pts) {
    const n = pts.length;
    g.beginPath();
    const mx = (pts[n - 1][0] + pts[0][0]) / 2, my = (pts[n - 1][1] + pts[0][1]) / 2;
    g.moveTo(mx, my);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  }
  function blobPoints(r, n, jitter, R) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.5;
      const rr = r * (1 - jitter + R() * jitter * 1.6);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return pts;
  }

  // Мягкое пятно света/дыма цвета c: рисуется один раз, дальше — drawImage с прозрачностью (градиент на каждую
  // частицу каждый кадр — дорого)
  const glows = new Map();
  function glowSprite(c) {
    let g = glows.get(c);
    if (!g) {
      g = document.createElement('canvas');
      g.width = g.height = 64;
      const x = g.getContext('2d');
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, hexA(c, 1));
      gr.addColorStop(0.45, hexA(c, 0.5));
      gr.addColorStop(1, hexA(c, 0));
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      glows.set(c, g);
    }
    return g;
  }
  function glow(ctx, x, y, r, c, a) {
    if (a <= 0.01 || r <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(glowSprite(c), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  // ===================== Удар по Василию =====================
  // Откуда прилетело (пуля, взрыв) — для следующего Fx.hurt; иначе — от жабы, чей сейчас ход (enemyActing)
  function from(x, y) { fromHint = { x, y }; }

  // p получил dmg (после брони). kind: melee | ranged | energy | acid | poison | goo
  function hurt(p, dmg, kind) {
    if (!(dmg > 0) || !p) return;
    const lash = kind === 'tongue';   // язык: тот же удар, только росчерк розовый и брызги слюны
    if (lash) kind = 'melee';
    p.hurtAcc = (p.hurtAcc || 0) + dmg;
    const dot = kind === 'acid' || kind === 'poison' || kind === 'goo';
    // Мелкие удары копятся и выплёскиваются разом; и даже крупные — не чаще раза в MIN_GAP кадров
    const since = frame - (p.hurtAt || -999);
    if ((since < (dot ? DOT_GAP : HIT_GAP) && p.hurtAcc < 10) || (since < MIN_GAP && p.hurtAcc < 25)) { fromHint = null; return; }
    const amt = p.hurtAcc;
    p.hurtAcc = 0;
    p.hurtAt = frame;
    const src = fromHint || (enemyActing ? { x: enemyActing.x, y: enemyActing.y } : null);
    fromHint = null;
    // Брызги летят прочь от удара
    const away = src && Math.hypot(p.x - src.x, p.y - src.y) > 1 ? Math.atan2(p.y - src.y, p.x - src.x) : Math.random() * Math.PI * 2;
    const k = Math.min(1, amt / 30);
    const gx = p.x, gy = p.y + footDY(p);   // земля под ногами
    const chest = 46;                       // высота груди над землёй

    if (dot) {
      const pal = kind === 'goo' ? PAL.goo : PAL.acid;
      for (let i = 0; i < 3; i++) {
        push({ t: 'steam', x: gx + rand(-14, 14), y: gy + rand(-4, 4), z: rand(4, 20), vz: rand(0.6, 1.2), r: rand(4, 7), life: 30, max: 30, c: kind === 'poison' ? '#d9f99d' : '#e5e7eb' });
      }
      for (let i = 0; i < 3; i++) {
        push({ t: 'drop', x: gx + rand(-10, 10), y: gy + rand(-3, 3), z: rand(4, 14), vx: rand(-0.8, 0.8), vy: rand(-0.4, 0.4), vz: rand(1.5, 3), r: rand(1.2, 2), c: pick(pal.slice(2)), dec: null });
      }
      p.hurtFlash = Math.max(p.hurtFlash || 0, 7);
      p.hurtTint = kind === 'goo' ? '#eab308' : '#84cc16';
      p.hurtK = Math.max(0.25, Math.min(0.5, k));
      return;
    }

    if (kind === 'energy') {
      push({ t: 'star', x: gx - Math.cos(away) * 8, y: gy, z: chest, a: away + Math.PI, r: 14 + 16 * k, life: 9, max: 9, c: '#67e8f9' });
      for (let i = 0; i < 6 + Math.round(6 * k); i++) {
        const a = away + rand(-1.2, 1.2), v = rand(2, 6);
        push({ t: 'spark', x: gx, y: gy, z: chest + rand(-8, 8), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: rand(-1, 3), life: 14, max: 14, c: pick(['#a5f3fc', '#67e8f9', '#f0abfc']) });
      }
    } else if (kind === 'melee') {
      // Росчерк когтей поперёк удара
      push({ t: 'slash', x: gx, y: gy + 2, z: chest + rand(-6, 6), a: away + Math.PI / 2 + rand(-0.6, 0.6), w: 38 + 30 * k, life: 16, max: 16, flip: Math.random() < 0.5 ? 1 : -1, pink: lash ? 1 : 0 });
      if (lash) {
        for (let i = 0; i < 6; i++) {
          const a = away + rand(-1, 1), v = rand(1, 3.5);
          push({ t: 'drop', x: gx, y: gy, z: chest + rand(-6, 6), vx: Math.cos(a) * v, vy: Math.sin(a) * v * GROUND_SQUASH, vz: rand(0.5, 3), r: rand(1.4, 2.6), c: pick(PAL.pink.slice(2)), dec: 'pink' });
        }
      }
    } else {
      push({ t: 'star', x: gx - Math.cos(away) * 6, y: gy, z: chest, a: away + Math.PI, r: 12 + 16 * k, life: 8, max: 8, c: '#fde68a' });
    }

    // Кровь: веер капель прочь от удара, крупные оставляют пятна
    const n = 3 + Math.round(8 * k);
    for (let i = 0; i < n; i++) {
      const a = away + rand(-0.7, 0.7), v = rand(1.2, 4.2) * (0.7 + k * 0.6);
      const r = rand(0.9, 1.6 + k * 0.9);
      push({
        t: 'drop', x: gx + Math.cos(a) * 6, y: gy + Math.sin(a) * 3, z: chest + rand(-10, 8),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v * GROUND_SQUASH, vz: rand(0.5, 3.4),
        r, c: pick(PAL.blood), dec: r > 1.3 ? 'blood' : null
      });
    }
    push({ t: 'mist', x: gx + Math.cos(away) * 10, y: gy, z: chest, r: 7 + 7 * k, vr: 0.9, life: 16, max: 16, c: '#b91c1c', a0: 0.35 });
    p.hurtFlash = FLASH;
    p.hurtTint = kind === 'energy' ? '#38bdf8' : '#ff2020';
    p.hurtK = Math.max(0.3, k);
  }

  // ===================== Всплески =====================
  // Капли во все стороны с земли (x, y): pal — палитра, power — сила разлёта, dec — пятно на земле
  function splash(x, y, pal, n, power, dec, z0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = rand(0.6, 1) * power;
      push({
        t: 'drop', x, y, z: z0 || rand(4, 12), vx: Math.cos(a) * v, vy: Math.sin(a) * v * GROUND_SQUASH,
        vz: rand(2, 5) * (0.6 + power / 8), r: rand(1.4, 3.2), c: pick(pal.slice(1)), dec
      });
    }
  }

  function ring(x, y, r1, c, life, w) {
    push({ t: 'ring', x, y, r1, life, max: life, c, w: w || 4 });
  }

  // Икринка лопнула: кольцо, слизь, скорлупа
  function eggSplat(x, y) {
    ring(x, y, 62, '#fde047', 16, 5);
    splash(x, y, PAL.goo, 14, 4.5, 'goo');
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, v = rand(1.5, 3.5);
      push({ t: 'chunk', x, y, z: 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * GROUND_SQUASH, vz: rand(2.5, 5), r: rand(2.5, 4), rot: rand(0, 6), vrot: rand(-0.4, 0.4), c: pick(PAL.shell.slice(1)), dec: null, shard: 1 });
    }
    push({ t: 'mist', x, y, z: 10, r: 14, vr: 1.6, life: 20, max: 20, c: '#fde047', a0: 0.45 });
  }

  // Раздутый лопнул: вспышка, ударная волна, ошмётки и кислота во все стороны
  function pop(x, y, R) {
    push({ t: 'flash', x, y, z: 26, r: R * 0.9, life: 10, max: 10, c: '#fed7aa' });
    ring(x, y, R * 1.1, '#fb923c', 20, 7);
    ring(x, y, R * 0.7, '#bef264', 14, 4);
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, v = rand(2, 6.5);
      push({ t: 'chunk', x, y, z: rand(14, 34), vx: Math.cos(a) * v, vy: Math.sin(a) * v * GROUND_SQUASH, vz: rand(2.5, 6.5), r: rand(3, 6.5), rot: rand(0, 6), vrot: rand(-0.3, 0.3), c: pick(PAL.gore), dec: 'gore' });
    }
    splash(x, y, PAL.acid, 26, 6.5, 'acid', 22);
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      push({ t: 'mist', x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 8, z: rand(14, 34), r: rand(14, 22), vr: 1.4, life: 34, max: 34, c: i % 2 ? '#a3e635' : '#fb923c', a0: 0.4 });
    }
  }

  // Кровосос пьёт: капли крови летят дугой от Василия к жабе
  function drain(p, e) {
    for (let i = 0; i < 2; i++) {
      push({ t: 'drain', x: p.x, y: p.y + footDY(p), x0: p.x, y0: p.y - 20, x1: e.x, y1: e.y - 26, t0: -i * 4, T: 26, bend: rand(-60, 60), life: 26 + i * 4, max: 26 + i * 4 });
    }
  }

  // ===================== Ход (у хоста и у товарищей) =====================
  function addDecal(x, y, r, c, kind) {
    if (decals.length >= MAX_DECALS) decals.shift();
    const life = kind === 'blood' ? 600 : 420;
    decals.push({ x, y, r, c, life, max: life, s: (Math.random() * 1e9) >>> 0, kind });
  }

  function update() {
    frame++;
    for (let i = 0; i < players.length; i++) if (players[i].hurtFlash > 0) players[i].hurtFlash--;
    for (let i = fxBits.length - 1; i >= 0; i--) {
      const b = fxBits[i];
      if (b.t === 'drop' || b.t === 'chunk') {
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;
        b.vz -= GRAV;
        b.vx *= 0.985;
        b.vy *= 0.985;
        if (b.vrot) b.rot += b.vrot;
        if (b.z <= 0) {
          if (b.dec) addDecal(b.x, b.y, b.r * rand(1.5, 2.3), b.c, b.dec);
          fxBits.splice(i, 1);
        }
        continue;
      }
      if (b.t === 'spark') {
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;
        b.vz -= 0.2;
        b.vx *= 0.9;
        b.vy *= 0.9;
      } else if (b.t === 'mist') {
        b.r += b.vr;
        b.z += 0.3;
      } else if (b.t === 'steam') {
        b.z += b.vz;
        b.r += 0.25;
      } else if (b.t === 'drain') {
        b.t0++;
      }
      if (--b.life <= 0) fxBits.splice(i, 1);
    }
    for (let i = decals.length - 1; i >= 0; i--) if (--decals[i].life <= 0) decals.splice(i, 1);
  }

  // ===================== Отрисовка =====================
  const inView = (x, y, v, pad) => x > v[0] - pad && x < v[1] + pad && y > v[2] - pad && y < v[3] + pad;

  // Пятна на земле — под фигурами
  function drawGround(ctx, x0, x1, y0, y1) {
    const v = [x0, x1, y0, y1];
    for (let i = 0; i < decals.length; i++) {
      const d = decals[i];
      if (!inView(d.x, d.y, v, 30)) continue;
      const fade = Math.min(1, d.life / 120);
      const R = rng(d.s);
      ctx.save();
      ctx.globalAlpha = fade * (d.kind === 'blood' ? 0.85 : 0.75);
      ctx.translate(d.x, d.y);
      ctx.scale(1, GROUND_SQUASH);
      ctx.rotate(R() * 6.28);
      ctx.fillStyle = d.c;
      blobPath(ctx, blobPoints(d.r, 7, 0.35, R));
      ctx.fill();
      // Брызги вокруг кляксы
      const n = 1 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const a = R() * 6.28, dd = d.r * (1.2 + R() * 0.9);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * dd, Math.sin(a) * dd, d.r * (0.18 + R() * 0.22), 0, Math.PI * 2);
        ctx.fill();
      }
      // Блик на свежем
      if (d.life > d.max - 90) {
        ctx.globalAlpha = fade * 0.35 * ((d.life - (d.max - 90)) / 90);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-d.r * 0.25, -d.r * 0.3, d.r * 0.35, d.r * 0.18, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Ударные волны по земле
    for (let i = 0; i < fxBits.length; i++) {
      const b = fxBits[i];
      if (b.t !== 'ring' || !inView(b.x, b.y, v, b.r1)) continue;
      const s = 1 - b.life / b.max;
      const r = b.r1 * (0.25 + 0.75 * Math.sqrt(s));
      ctx.save();
      ctx.globalAlpha = (1 - s) * 0.85;
      ctx.strokeStyle = b.c;
      ctx.lineWidth = b.w * (1 - s * 0.6);
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, r, r * GROUND_SQUASH, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - s) * 0.25;
      ctx.lineWidth = b.w * 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Летящее — над фигурами
  function drawOver(ctx, x0, x1, y0, y1) {
    const v = [x0, x1, y0, y1];
    for (let i = 0; i < fxBits.length; i++) {
      const b = fxBits[i];
      if (b.t === 'ring' || !inView(b.x, b.y, v, 80)) continue;
      const sy = b.y - (b.z || 0);
      if (b.t === 'drop') {
        // Капля — вытянута по скорости, с бликом
        const vx = b.vx, vy = b.vy * 0.5 - b.vz;
        const sp = Math.hypot(vx, vy);
        ctx.save();
        ctx.translate(b.x, sy);
        ctx.rotate(Math.atan2(vy, vx));
        ctx.fillStyle = b.c;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.r * (1 + Math.min(1, sp * 0.15)), b.r * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        if (b.r > 1.6) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.arc(b.r * 0.3, -b.r * 0.3, b.r * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (b.t === 'chunk') {
        ctx.save();
        ctx.translate(b.x, sy);
        ctx.rotate(b.rot);
        const R = rng(seedOf(b.r * 100, b.vrot * 1000));
        ctx.fillStyle = b.c;
        if (b.shard) {
          ctx.beginPath();
          ctx.moveTo(-b.r, -b.r * 0.4);
          ctx.lineTo(b.r * 0.9, -b.r * 0.7);
          ctx.lineTo(b.r * 0.3, b.r * 0.8);
          ctx.closePath();
          ctx.fill();
        } else {
          blobPath(ctx, blobPoints(b.r, 6, 0.45, R));
          ctx.fill();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(b.r * 0.25, b.r * 0.25, b.r * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(-b.r * 0.3, -b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (b.t === 'slash') {
        // Три серпа-росчерка: появляются за пару кадров, держатся и гаснут. Свечение — под ними
        const s = 1 - b.life / b.max;
        const grow = Math.min(1, s * 7);
        const fade = s < 0.35 ? 1 : 1 - (s - 0.35) / 0.65;
        const pal = b.pink ? SLASH_PINK : SLASH_RED;
        ctx.save();
        ctx.translate(b.x, sy);
        ctx.rotate(b.a);
        ctx.scale(1, b.flip);
        for (let k = -1; k <= 1; k++) {
          const off = k * 9;
          const w = b.w * (1 - Math.abs(k) * 0.16);
          const x0s = -w / 2, x1s = x0s + w * grow, mid = (x0s + x1s) / 2;
          const th = 5.5 * (1 - Math.abs(k) * 0.2);
          const crescent = (thk) => {
            ctx.beginPath();
            ctx.moveTo(x0s, off - 3);
            ctx.quadraticCurveTo(mid, off + 4 + thk, x1s, off - 3);
            ctx.quadraticCurveTo(mid, off + 4 - thk * 0.4, x0s, off - 3);
            ctx.closePath();
          };
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.5 * fade;
          ctx.fillStyle = pal[0][1];
          crescent(th * 2.2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.95 * fade;
          ctx.fillStyle = pal[1][1];
          crescent(th);
          ctx.fill();
          ctx.globalAlpha = fade;
          ctx.fillStyle = pal[2][1];
          crescent(th * 0.35);
          ctx.fill();
        }
        ctx.restore();
      } else if (b.t === 'star' || b.t === 'flash') {
        const s = 1 - b.life / b.max;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(b.x, sy);
        const r = b.r * (0.6 + s * 0.6);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, `rgba(255, 255, 255, ${0.95 * (1 - s)})`);
        g.addColorStop(0.35, hexA(b.c, 0.7 * (1 - s)));
        g.addColorStop(1, hexA(b.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        if (b.t === 'star') {
          // Лучи попадания
          ctx.rotate(b.a);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * (1 - s)})`;
          for (let k = 0; k < 5; k++) {
            ctx.rotate(Math.PI * 2 / 5 + 0.3);
            const L = r * (k % 2 ? 1.1 : 1.6);
            ctx.beginPath();
            ctx.moveTo(0, -1.6);
            ctx.lineTo(L, 0);
            ctx.lineTo(0, 1.6);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.restore();
      } else if (b.t === 'spark') {
        const s = b.life / b.max;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = b.c;
        ctx.globalAlpha = s;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(b.x, sy);
        ctx.lineTo(b.x - b.vx * 2.4, sy - b.vy * 1.2 + b.vz * 2.4);
        ctx.stroke();
        ctx.restore();
      } else if (b.t === 'mist' || b.t === 'steam') {
        const s = 1 - b.life / b.max;
        glow(ctx, b.x, sy, b.r, b.c, (b.a0 || 0.3) * (1 - s));
      } else if (b.t === 'drain') {
        if (b.t0 < 0) continue;
        const s = Math.min(1, b.t0 / b.T);
        const ease = s * s * (3 - 2 * s);
        const mx = (b.x0 + b.x1) / 2 + b.bend, my = Math.min(b.y0, b.y1) - 40;
        const px = (1 - ease) * (1 - ease) * b.x0 + 2 * (1 - ease) * ease * mx + ease * ease * b.x1;
        const py = (1 - ease) * (1 - ease) * b.y0 + 2 * (1 - ease) * ease * my + ease * ease * b.y1;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, px, py, 10, '#dc2626', 0.8);
        glow(ctx, px, py, 3.5, '#fecaca', 0.95);
        ctx.restore();
      }
    }
  }

  // Края экрана своего Василия: красные при ударе, пульс на последних 30 % здоровья. Экранные координаты
  function drawScreen(ctx, w, h) {
    const p = localPlayer;
    if (!p || p.dead || typeof gameState === 'undefined' || gameState === 'GAMEOVER') return;
    const hit = (p.hurtFlash || 0) / FLASH * (p.hurtK || 0.3);
    const hpK = p.maxHp > 0 ? p.hp / p.maxHp : 1;
    const low = hpK < 0.3 && !(p.downT > 0) ? (0.3 - Math.max(0, hpK)) / 0.3 : 0;
    const t = performance.now() / 1000;
    const beat = low > 0 ? Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.1)), 8) : 0;
    const aHit = Math.min(0.6, hit * 0.75);
    const aLow = low * (0.22 + 0.33 * beat);
    if (aHit + aLow < 0.02) return;
    const tint = hit > 0 && p.hurtTint ? p.hurtTint : '#b91c1c';
    const rIn = Math.min(w, h) * (0.42 - 0.08 * Math.max(hit, beat * low));
    const rOut = Math.hypot(w, h) * 0.62;
    ctx.save();
    const g = ctx.createRadialGradient(w / 2, h / 2, rIn, w / 2, h / 2, rOut);
    g.addColorStop(0, hexA(tint, 0));
    g.addColorStop(0.6, hexA(tint, (aHit + aLow) * 0.55));
    g.addColorStop(1, hexA(tint === '#ff2020' ? '#7f1d1d' : tint, Math.min(0.85, aHit + aLow)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
  }

  window.Fx = {
    PAL, from, hurt, splash, ring, eggSplat, pop, drain, update, drawGround, drawOver, drawScreen,
    rng, seedOf, blobPath, blobPoints, hexA, glow
  };
})();
