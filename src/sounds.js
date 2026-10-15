// Звуки — поверх SoundFX из game.js. Основа — записи из CC0-библиотек (assets/sounds, CREDITS.md, сборка —
// tools/build_sounds.py, банк — BANK ниже): случайный вариант, разброс высоты, общее уличное эхо, панорама,
// вдали — тише и глуше. Пока записи не загрузились (или файла нет) — синтез (WebAudio), тем же приёмом,
// что звук огня (src/perks_pz.js): несколько слоёв (щелчок атаки, тело, хвост), огибающие, разброс.
//   - Оружие: ПМ, обрез, плазма — заново; лазер и дрель — непрерывный гул, пока жмёшь; перезарядки — механика
//     магазина и переломки; бита — свист по воздуху, по жабе — мокрый шлепок, по броне — звон.
//   - Шаги Василия, выживших и жаб: у людей — подошвы, у жаб — шлёпанье лап, громилы и боссы — тяжёлый топот.
//     Поверхность — асфальт и плитка (дороги с тротуарами), земля, щебень (ж/д колеи Промзоны), слизь (лужи).
//     Слышно только в радиусе (`HEAR`), левее-правее — в панораме.
//   - Падение брошенного громилой: урна, мусорный бак, ящик, машина, бочка — у каждого своё.
//   - Открытие тайников: мусорка, «Жигули», УАЗ, армейский ящик, вагоны, грузовики, бочка, сейфы.
// Скрипты обычные, без модулей: SoundFX, player, enemies, roads, inBioPuddle, footDY — из game.js.
(function () {
  const S = SoundFX;
  let verb = null, brown = null, pink = null;
  const curves = {};

  // --- Инструменты ---
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pan = x => Math.max(-0.85, Math.min(0.85, (x - player.x) / 700));

  // Шум на 2 с: коричневый (тёплый рокот) и розовый (мягче белого)
  function noiseBuf(kind) {
    const ac = S.ctx;
    if (kind === 'white') return S.noiseBuf;
    if (kind === 'brown' && brown) return brown;
    if (kind === 'pink' && pink) return pink;
    const sr = ac.sampleRate, buf = ac.createBuffer(1, sr * 2, sr), d = buf.getChannelData(0);
    if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
      brown = buf;
    } else {
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099;
        b1 = 0.963 * b1 + w * 0.2965;
        b2 = 0.57 * b2 + w * 1.0526;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
      pink = buf;
    }
    return buf;
  }

  // Уличное эхо: отражения от домов (ранние всплески) и затухающий хвост
  function reverb() {
    if (verb) return verb;
    const ac = S.ctx, sr = ac.sampleRate, len = Math.floor(sr * 1.3);
    const ir = ac.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        lp = lp * 0.82 + (Math.random() * 2 - 1) * 0.18;     // хвост глуше начала
        d[i] = lp * Math.exp(-t * 4.2) * 0.9;
      }
      [0.045, 0.09, 0.15, 0.24].forEach((t, k) => {
        const at = Math.floor((t + ch * 0.007) * sr);
        for (let j = 0; j < 90; j++) d[at + j] += (Math.random() * 2 - 1) * (0.5 / (k + 1)) * (1 - j / 90);
      });
    }
    verb = ac.createConvolver();
    verb.buffer = ir;
    verb.connect(S.out);
    return verb;
  }

  // Шина звука: громкость, панорама, доля эха
  function bus(vol = 1, p = 0, wet = 0) {
    const ac = S.ctx;
    const g = ac.createGain();
    g.gain.value = vol;
    let tail = g;
    if (p && ac.createStereoPanner) {
      const pn = ac.createStereoPanner();
      pn.pan.value = p;
      g.connect(pn);
      tail = pn;
    }
    tail.connect(S.out);
    if (wet > 0) {
      const w = ac.createGain();
      w.gain.value = wet;
      tail.connect(w);
      w.connect(reverb());
    }
    return g;
  }

  // Перегруз: мягкое насыщение, чтобы выстрел «рвал», а не пищал
  function shaper(dest, amount) {
    const ac = S.ctx;
    if (!curves[amount]) {
      const c = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = i / 512 - 1;
        c[i] = Math.tanh(x * amount) / Math.tanh(amount);
      }
      curves[amount] = c;
    }
    const ws = ac.createWaveShaper();
    ws.curve = curves[amount];
    ws.connect(dest);
    return ws;
  }

  // Кусок шума через фильтр с огибающей
  function burst(at, dest, { type = 'bandpass', f0, f1, q = 1, vol, dur, attack = 0.003, noise = 'white' }) {
    const ac = S.ctx;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf(noise);
    src.playbackRate.value = rnd(0.85, 1.15);
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
    g.connect(dest);
    src.start(at, Math.random() * (src.buffer.duration - dur - 0.05 > 0 ? src.buffer.duration - dur - 0.05 : 0));
    src.stop(at + dur + 0.03);
  }

  function tone(at, dest, { type = 'sine', f0, f1, vol, dur, attack = 0.004 }) {
    const ac = S.ctx;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + dur + 0.03);
  }

  // Металл: несколько негармоничных частот (как у пластины или бочки), высокие гаснут быстрее
  function ring(at, dest, f, ratios, vol, dur) {
    ratios.forEach((r, i) => tone(at, dest, {
      f0: f * r * rnd(0.99, 1.01), f1: f * r * 0.995, vol: vol / Math.pow(i + 1, 0.7), dur: dur / (1 + i * 0.45), attack: 0.002
    }));
  }

  // Россыпь коротких щелчков: хруст, гравий, щепки, гремящий хлам
  function grains(at, dest, n, spread, { f0 = 1500, f1 = 4000, q = 2, vol = 0.08, dur = 0.008, type = 'bandpass' }) {
    for (let i = 0; i < n; i++) {
      const f = rnd(f0, f1);
      burst(at + Math.random() * spread, dest, { type, f0: f, f1: f * 0.8, q, vol: vol * rnd(0.5, 1), dur: dur * rnd(0.6, 1.4), attack: 0.001 });
    }
  }

  // Скрип: пила низкой частоты (рывки трения) через узкий фильтр — петли, крышки, двери
  function creak(at, dest, { rate0, rate1, f, q = 6, vol, dur }) {
    const ac = S.ctx;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rate0, at);
    o.frequency.linearRampToValueAtTime(rate1, at + dur);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f, at);
    bp.frequency.linearRampToValueAtTime(f * rnd(1.1, 1.3), at + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.04);
    g.gain.setValueAtTime(vol, at + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(bp);
    bp.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + dur + 0.03);
  }

  // Удар о землю: низ и глухой шум
  function thump(at, dest, f, vol, dur = 0.16) {
    tone(at, dest, { f0: f, f1: f * 0.4, vol, dur });
    burst(at, dest, { type: 'lowpass', f0: f * 8, f1: f * 1.5, vol: vol * 0.7, dur: dur * 1.2, noise: 'brown' });
  }

  // Шуршание: в мусоре и бардачках копаются
  function rummage(at, dest, n, spread, lo = 800, hi = 3500, vol = 0.1) {
    for (let i = 0; i < n; i++) {
      const f = rnd(lo, hi);
      burst(at + Math.random() * spread, dest, { f0: f, f1: f * rnd(0.7, 1.3), q: 1.2, vol: vol * rnd(0.5, 1), dur: rnd(0.03, 0.08), attack: 0.006, noise: 'pink' });
    }
  }

  // Звон стекла: россыпь высоких «динь»
  function glass(at, dest, n, spread, vol) {
    for (let i = 0; i < n; i++) {
      const t = at + Math.random() * spread;
      ring(t, dest, rnd(2400, 6500), [1, 2.4], vol * rnd(0.5, 1), rnd(0.05, 0.14));
    }
    burst(at, dest, { type: 'highpass', f0: 5000, vol: vol * 1.4, dur: 0.18, attack: 0.002 });
  }

  // Квак-ворчание жабы: пила через «гласную» — громила, подхватывая груз
  function croak(at, dest, f, vol, dur) {
    const ac = S.ctx;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, at);
    o.frequency.exponentialRampToValueAtTime(f * 0.7, at + dur);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 4;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(bp);
    bp.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + dur + 0.03);
  }

  // Лимитер на общем выходе: выстрелы и грохот в куче не хрипят
  let limited = false;
  function limit(ac) {
    limited = true;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -4;
    comp.knee.value = 4;
    comp.ratio.value = 12;
    comp.attack.value = 0.002;
    comp.release.value = 0.15;
    S.out.disconnect();
    S.out.connect(comp);
    comp.connect(ac.destination);
  }

  const start = () => {
    const ac = S.ensure();
    if (ac && !limited) limit(ac);
    return ac ? ac.currentTime : null;
  };

  // --- Оружие ---
  // Бита: свист всегда; hit — false (мимо), 'flesh' (по жабе), 'armor' (по броне), true (о что-то твёрдое)
  S.batSwing = function (hit = false) {
    const t = start();
    if (t === null) return;
    const d = bus(1, 0, hit ? 0.12 : 0.04);
    const p = rnd(0.85, 1.15);
    burst(t, d, { f0: 320 * p, f1: 1250 * p, q: 1.1, vol: 0.5, dur: 0.1, attack: 0.035 });
    burst(t + 0.08, d, { f0: 1250 * p, f1: 280 * p, q: 1, vol: 0.38, dur: 0.12, attack: 0.004 });
    if (!hit) return;
    const at = t + 0.05;
    if (hit === 'armor') {
      ring(at, d, 640 * p, [1, 2.76, 5.4, 8.9], 0.15, 0.5);
      burst(at, d, { type: 'highpass', f0: 3500, vol: 0.3, dur: 0.012, attack: 0.001 });
      thump(at, d, 150, 0.3, 0.1);
    } else if (hit === 'flesh') {
      thump(at, d, 120 * p, 0.55, 0.14);
      burst(at, d, { f0: 750 * p, f1: 240, q: 3, vol: 0.32, dur: 0.1, attack: 0.002 });       // мокрый шлепок
      burst(at + 0.045, d, { f0: 1600, f1: 2600, q: 8, vol: 0.1, dur: 0.05, attack: 0.004 }); // хлюп
      grains(at, d, 3, 0.03, { f0: 2500, f1: 5000, vol: 0.1 });                              // гвозди скребут
    } else {
      thump(at, d, 150 * p, 0.45, 0.12);
      burst(at, d, { f0: 520 * p, q: 2, vol: 0.3, dur: 0.07, attack: 0.001 });
    }
  };

  // ПМ: сухой хлёсткий хлопок, щелчок затвора, эхо от домов. vol, p — для выстрелов выживших (по расстоянию)
  S.makarov = function (vol = 1, p = 0) {
    const t = start();
    if (t === null || vol <= 0.02) return;
    const d = bus(vol * 0.72, p, 0.35), sh = shaper(d, 2.5), k = rnd(0.92, 1.08);
    burst(t, d, { type: 'highpass', f0: 2500, vol: 0.45, dur: 0.012, attack: 0.001 });
    burst(t, sh, { f0: 2100 * k, f1: 650, q: 1.1, vol: 0.55, dur: 0.09, attack: 0.001 });
    tone(t, d, { f0: 190 * k, f1: 55, vol: 0.45, dur: 0.11, attack: 0.002 });
    tone(t, d, { type: 'triangle', f0: 480 * k, f1: 170, vol: 0.16, dur: 0.05, attack: 0.002 });
    burst(t + 0.01, d, { type: 'lowpass', f0: 1200, f1: 200, vol: 0.14, dur: 0.35, attack: 0.01, noise: 'brown' });
    burst(t + 0.05, d, { f0: 3600, q: 5, vol: 0.1, dur: 0.014, attack: 0.001 });
    burst(t + 0.075, d, { f0: 2400, q: 5, vol: 0.09, dur: 0.018, attack: 0.001 });
  };

  // Обрез 12-го калибра: грохот с перегрузом, удар в грудь, раскат эха
  S.shotgun = function (vol = 1, p = 0) {
    const t = start();
    if (t === null || vol <= 0.02) return;
    const d = bus(vol * 0.48, p, 0.45), sh = shaper(d, 4), k = rnd(0.93, 1.07);
    burst(t, d, { type: 'highpass', f0: 3000, vol: 0.5, dur: 0.014, attack: 0.001 });
    burst(t, sh, { type: 'lowpass', f0: 5200 * k, f1: 300, q: 0.7, vol: 0.75, dur: 0.3, attack: 0.002 });
    tone(t, d, { f0: 100 * k, f1: 34, vol: 0.75, dur: 0.32, attack: 0.002 });
    tone(t, d, { type: 'triangle', f0: 170 * k, f1: 60, vol: 0.4, dur: 0.16, attack: 0.002 });
    burst(t + 0.02, d, { type: 'lowpass', f0: 700, f1: 110, vol: 0.3, dur: 1.0, attack: 0.02, noise: 'brown' });
    grains(t + 0.01, d, 6, 0.06, { type: 'highpass', f0: 4000, f1: 8000, vol: 0.05 });
  };

  // Плазмаган «Тесла»: электрический разряд с модуляцией, треск искр, шипение
  S.plasma = function () {
    const t = start();
    if (t === null) return;
    const ac = S.ctx, d = bus(1, 0, 0.2), k = rnd(0.9, 1.1);
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1500 * k, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.16);
    const m = ac.createOscillator();
    m.frequency.value = rnd(50, 75);
    const mg = ac.createGain();
    mg.gain.value = 420;
    m.connect(mg);
    mg.connect(o.frequency);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(2200, t);
    bp.frequency.exponentialRampToValueAtTime(600, t + 0.16);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.24, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(bp);
    bp.connect(g);
    g.connect(d);
    o.start(t);
    m.start(t);
    o.stop(t + 0.2);
    m.stop(t + 0.2);
    tone(t, d, { f0: 300, f1: 80, vol: 0.32, dur: 0.14, attack: 0.002 });
    grains(t, d, 6, 0.1, { type: 'highpass', f0: 4000, f1: 8000, vol: 0.09 });
    burst(t + 0.03, d, { type: 'highpass', f0: 6000, vol: 0.05, dur: 0.25, attack: 0.02 });
  };

  // Непрерывный гул (лазер, дрель): заводится при первом вызове, держится, пока вызовы идут, и сам гаснет
  function hum(build) {
    const h = { nodes: null, timer: 0 };
    h.keep = (level, fade) => {
      const t = start();
      if (t === null) return;
      if (!h.nodes) h.nodes = build(S.ctx, t);
      const g = h.nodes.gain.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(level, t, 0.02);
      g.setTargetAtTime(0.0001, t + fade, 0.05);
      clearTimeout(h.timer);
      h.timer = setTimeout(() => {
        if (!h.nodes) return;
        h.nodes.srcs.forEach(s => { try { s.stop(); } catch (e) { /* уже остановлен */ } });
        h.nodes.gain.disconnect();
        h.nodes = null;
      }, (fade + 0.8) * 1000);
    };
    return h;
  }

  // Лазерный бластер: два расстроенных «пилы» под фильтром, высокий писк с дрожью, шипение
  const laserHum = hum((ac, t) => {
    const gain = ac.createGain();
    gain.gain.value = 0.0001;
    gain.connect(bus(1, 0, 0.15));
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    lp.Q.value = 4;
    lp.connect(gain);
    const srcs = [];
    [178, 181.5].forEach(f => {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(lp);
      srcs.push(o);
    });
    const whine = ac.createOscillator();
    whine.frequency.value = 2400;
    const wg = ac.createGain();
    wg.gain.value = 0.12;
    const trem = ac.createOscillator();
    trem.frequency.value = 31;
    const tg = ac.createGain();
    tg.gain.value = 0.08;
    trem.connect(tg);
    tg.connect(wg.gain);
    whine.connect(wg);
    wg.connect(gain);
    srcs.push(whine, trem);
    const hiss = ac.createBufferSource();
    hiss.buffer = noiseBuf('pink');
    hiss.loop = true;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const hg = ac.createGain();
    hg.gain.value = 0.35;
    hiss.connect(hp);
    hp.connect(hg);
    hg.connect(gain);
    srcs.push(hiss);
    srcs.forEach(s => s.start(t));
    // Включение: короткий взлёт
    tone(t, gain, { f0: 400, f1: 2200, vol: 0.4, dur: 0.12 });
    return { gain, srcs };
  });
  S.laser = function () {
    laserHum.keep(0.1, 0.12);
  };

  // Ударная дрель ИЭ-1035: мотор с биением, треск редуктора
  const drillHum = hum((ac, t) => {
    const gain = ac.createGain();
    gain.gain.value = 0.0001;
    gain.connect(bus(1, 0, 0.05));
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    lp.Q.value = 2;
    lp.connect(gain);
    const srcs = [];
    const wob = ac.createOscillator();
    wob.frequency.value = 7;
    const wg = ac.createGain();
    wg.gain.value = 6;
    wob.connect(wg);
    [[118, 'sawtooth', 1], [236.5, 'square', 0.35]].forEach(([f, type, v]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = f;
      wg.connect(o.frequency);
      const og = ac.createGain();
      og.gain.value = v;
      o.connect(og);
      og.connect(lp);
      srcs.push(o);
    });
    // Редуктор: шум, рубленный на 38 Гц
    const n = ac.createBufferSource();
    n.buffer = noiseBuf('white');
    n.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 3;
    const am = ac.createGain();
    am.gain.value = 0;
    const chop = ac.createOscillator();
    chop.type = 'square';
    chop.frequency.value = 38;
    const cg = ac.createGain();
    cg.gain.value = 0.25;
    chop.connect(cg);
    cg.connect(am.gain);
    n.connect(bp);
    bp.connect(am);
    am.connect(gain);
    srcs.push(wob, n, chop);
    srcs.forEach(s => s.start(t));
    return { gain, srcs };
  });
  S.drill = function () {
    drillHum.keep(0.2, 0.3);
  };
  // Бур вошёл в жабу: скрежет и чавканье
  S.drillHit = function () {
    const t = start();
    if (t === null) return;
    const d = bus(1, 0, 0.05);
    burst(t, d, { f0: 1300, f1: 600, q: 2, vol: 0.22, dur: 0.18, attack: 0.01 });
    burst(t + 0.03, d, { f0: 650, f1: 300, q: 3, vol: 0.18, dur: 0.1 });
    grains(t, d, 5, 0.12, { f0: 1800, f1: 4200, vol: 0.08 });
  };

  // Перезарядка: начало и конец. ПМ — магазин, обрез — переломка и гильзы
  S.reloadStart = function (w) {
    const t = start();
    if (t === null) return;
    const d = bus(0.9);
    if (w === 'shotgun') {
      thump(t, d, 220, 0.22, 0.08);
      burst(t, d, { f0: 2600, q: 4, vol: 0.11, dur: 0.02, attack: 0.001 });       // защёлка
      ring(t + 0.18, d, 3300, [1, 2.2], 0.07, 0.18);                              // гильзы звенят
      ring(t + 0.24, d, 2900, [1, 2.2], 0.06, 0.16);
      burst(t + 0.3, d, { type: 'lowpass', f0: 1500, f1: 600, vol: 0.03, dur: 0.06 });
    } else {
      burst(t, d, { f0: 3200, q: 5, vol: 0.09, dur: 0.015, attack: 0.001 });      // кнопка
      burst(t + 0.05, d, { f0: 1400, f1: 900, q: 1.5, vol: 0.07, dur: 0.07, attack: 0.01 }); // магазин выходит
      thump(t + 0.12, d, 260, 0.12, 0.05);
    }
  };
  S.reloadEnd = function (w) {
    const t = start();
    if (t === null) return;
    const d = bus(0.9);
    if (w === 'shotgun') {
      burst(t, d, { f0: 1200, q: 2, vol: 0.07, dur: 0.03 });                     // патроны в стволы
      burst(t + 0.09, d, { f0: 1100, q: 2, vol: 0.07, dur: 0.03 });
      thump(t + 0.2, d, 200, 0.3, 0.07);                                          // закрыл
      burst(t + 0.2, d, { f0: 3000, q: 4, vol: 0.12, dur: 0.015, attack: 0.001 });
    } else {
      thump(t, d, 240, 0.18, 0.06);                                               // магазин вошёл
      burst(t, d, { f0: 2600, q: 4, vol: 0.09, dur: 0.015, attack: 0.001 });
      burst(t + 0.16, d, { f0: 1800, f1: 1200, q: 1.5, vol: 0.06, dur: 0.05 });     // затвор назад
      burst(t + 0.22, d, { f0: 3400, q: 5, vol: 0.10, dur: 0.014, attack: 0.001 }); // и вперёд
      thump(t + 0.22, d, 300, 0.1, 0.04);
    }
  };
  // Накопитель лазера: заряд с нарастающим писком и сигнал «готов»
  S.laserRecharge = function () {
    const t = start();
    if (t === null) return;
    const d = bus(0.8);
    tone(t, d, { type: 'triangle', f0: 260, f1: 1800, vol: 0.06, dur: 0.9, attack: 0.3 });
    tone(t + 0.9, d, { f0: 1760, f1: 1760, vol: 0.04, dur: 0.12 });
  };
  // Осечка, пусто: курок щёлкает вхолостую
  S.emptyClick = function () {
    const t = start();
    if (t === null) return;
    const d = bus(0.9);
    burst(t, d, { type: 'highpass', f0: 3500, vol: 0.22, dur: 0.008, attack: 0.001 });
    burst(t + 0.004, d, { f0: 1500, q: 3, vol: 0.12, dur: 0.02, attack: 0.001 });
  };

  // --- Шаги ---
  // Поверхность под ногами: асфальт и плитка — дороги с тротуарами (36 px) и площадь у Михалыча;
  // щебень — ж/д колеи Промзоны; слизь — био-лужи и шлам; остальное — земля
  function surfaceAt(x, y) {
    if (typeof inBioPuddle === 'function' && inBioPuddle(x, y)) return 'wet';
    for (let i = 0; i < roads.length; i++) {
      const r = roads[i];
      if (x > r.x - 36 && x < r.x + r.w + 36 && y > r.y - 36 && y < r.y + r.h + 36) return 'hard';
    }
    const env = window.environmentRenderer;
    if (env && env.isInShopPlaza && env.isInShopPlaza(x, y)) return 'hard';
    if (currentLocation === 'promzona' && env && env.onRails && env.onRails(x, y, 40)) return 'gravel';
    return 'ground';
  }

  // Человек: каблук и носок; size — громче и ниже у тяжёлых
  function humanStep(t, d, surf) {
    const p = rnd(0.85, 1.15);
    if (surf === 'hard') {
      burst(t, d, { f0: 1700 * p, q: 1.5, vol: 0.3, dur: 0.025, attack: 0.001 });
      tone(t, d, { f0: 160 * p, f1: 70, vol: 0.16, dur: 0.05, attack: 0.002 });
      burst(t + 0.03, d, { type: 'highpass', f0: 4000, vol: 0.05, dur: 0.02, attack: 0.003 });
    } else if (surf === 'gravel') {
      burst(t, d, { type: 'lowpass', f0: 900, f1: 250, vol: 0.22, dur: 0.06, noise: 'brown' });
      grains(t, d, 8, 0.07, { f0: 1500, f1: 3500, vol: 0.09 });
    } else if (surf === 'wet') {
      burst(t, d, { f0: 500 * p, f1: 1100, q: 3, vol: 0.2, dur: 0.08, attack: 0.01 });
      tone(t + 0.04, d, { f0: 400, f1: 900, vol: 0.05, dur: 0.03 });
    } else {
      burst(t, d, { type: 'lowpass', f0: 650 * p, f1: 180, vol: 0.28, dur: 0.07, noise: 'brown' });
      grains(t, d, 4, 0.04, { f0: 2000, f1: 4000, vol: 0.04, dur: 0.006 });
    }
  }

  // Жаба: шлёп лапы и присоска; size — по размеру жабы
  function toadStep(t, d, surf, size) {
    const p = rnd(0.85, 1.15) / size;
    burst(t, d, { f0: 950 * p, f1: 300 * p, q: 2, vol: 0.28, dur: 0.05, attack: 0.001 });
    tone(t, d, { f0: 150 * p, f1: 60, vol: 0.22, dur: 0.07 });
    tone(t + 0.03, d, { f0: 280 * p, f1: 700 * p, vol: 0.05, dur: 0.025 });
    if (surf === 'hard') burst(t, d, { type: 'highpass', f0: 2500, vol: 0.12, dur: 0.012, attack: 0.001 });
    else if (surf === 'wet') burst(t, d, { f0: 600, f1: 1400, q: 4, vol: 0.16, dur: 0.09, attack: 0.008 });
    else burst(t, d, { type: 'lowpass', f0: 420, f1: 150, vol: 0.18, dur: 0.08, noise: 'brown' });
  }

  // Громила: тяжёлый шаг, земля отзывается
  function heavyStep(t, d, surf) {
    thump(t, d, rnd(80, 95), 0.5, 0.2);
    burst(t, d, { f0: 520, f1: 200, q: 1.5, vol: 0.26, dur: 0.08, attack: 0.002 });
    if (surf === 'hard') grains(t, d, 4, 0.05, { f0: 2000, f1: 4500, vol: 0.06 });
    else if (surf === 'gravel') grains(t, d, 10, 0.08, { f0: 1400, f1: 3200, vol: 0.1 });
  }

  // Босс: топот, от которого дрожит земля
  function giantStep(t, d, surf) {
    thump(t, d, rnd(55, 65), 0.7, 0.32);
    burst(t, d, { type: 'lowpass', f0: 300, f1: 60, vol: 0.45, dur: 0.45, noise: 'brown' });
    grains(t + 0.03, d, surf === 'hard' ? 6 : 10, 0.15, { f0: 1200, f1: 3000, vol: 0.07 });
  }

  // Слышимость шагов: px, громкость вблизи, шаг (px пути на один звук)
  const HEAR = {
    player: [0, 0.22, 46], human: [520, 0.36, 34], toad: [650, 0.35, 40], heavy: [900, 0.6, 64], giant: [1300, 0.75, 95]
  };
  const tracks = new WeakMap();
  let budget = 0;

  function track(o, x, y, kind, size = 1) {
    const [radius, vol0, stride] = HEAR[kind];
    let st = tracks.get(o);
    if (!st) {
      tracks.set(o, { x, y, acc: Math.random() * stride });
      return;
    }
    const dd = Math.hypot(x - st.x, y - st.y);
    st.x = x;
    st.y = y;
    if (dd > 30 || dd < 0.05) return;                 // телепорт, отброс или стоит
    st.acc += dd;
    if (st.acc < stride * size) return;
    st.acc = 0;
    const dist = Math.hypot(x - player.x, y - player.y);
    const vol = kind === 'player' ? vol0 : vol0 * Math.max(0, 1 - dist / radius);
    if (vol < 0.03 || budget-- <= 0) return;
    const surf = surfaceAt(x, y);
    // Записи шагов (ниже, BANK); пока не загрузились — синтез
    if (sampleStep(kind, surf, vol, kind === 'player' ? 0 : pan(x), size, kind === 'player' ? 0 : dist / radius)) return;
    const t = start();
    if (t === null) return;
    const d = bus(vol, kind === 'player' ? 0 : pan(x));
    if (kind === 'player' || kind === 'human') humanStep(t, d, surf);
    else if (kind === 'toad') toadStep(t, d, surf, size);
    else if (kind === 'heavy') heavyStep(t, d, surf);
    else giantStep(t, d, surf);
  }

  // Каждый кадр из update(): кто сдвинулся на шаг — тот и шагнул
  S.updateSteps = function () {
    if (!S.ctx) return;
    budget = 6;
    if (!player.isRolling) track(player, player.x, player.y + footDY(player), 'player');
    else tracks.delete(player);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (Math.abs(e.x - player.x) > 1300 || Math.abs(e.y - player.y) > 1300) continue;
      const fy = e.y + footDY(e);
      if (e.type === 'boss' || e.type === 'pounder') track(e, e.x, fy, 'giant', e.isMini ? 0.7 : 1);
      else if (e.type === 'brute') track(e, e.x, fy, 'heavy');
      else track(e, e.x, fy, 'toad', Math.max(0.8, Math.min(1.3, (e.radius || 22) / 22)));
    }
    const people = [];
    if (window.Settlers) people.push(...window.Settlers.list);
    if (window.Defense && window.Defense.actors) people.push(...window.Defense.actors.filter(s => !s.gone && !s.exiting));
    people.forEach(s => track(s, s.x, s.y, 'human'));
  };

  // --- Падение брошенного громилой ---
  S.impact = function (kind, vol = 1, p = 0) {
    const t = start();
    if (t === null || vol <= 0.02) return;
    const d = bus(vol * 0.5, p, 0.3);
    if (kind === 'bin') {
      // Уличная урна: жестяной звон, подскок, мусор
      thump(t, d, 130, 0.35, 0.12);
      ring(t, d, 520, [1, 2.3, 3.9, 5.1], 0.2, 0.45);
      ring(t + 0.18, d, 540, [1, 2.3, 3.9], 0.1, 0.25);
      ring(t + 0.3, d, 560, [1, 2.3], 0.05, 0.15);
      rummage(t + 0.05, d, 5, 0.3, 1000, 4000, 0.08);
    } else if (kind === 'trash') {
      // Мусорный бак: гулкий удар большого железа, крышка лязгает
      thump(t, d, 85, 0.6, 0.3);
      ring(t, d, 160, [1, 2.1, 3.3, 4.6], 0.3, 0.9);
      ring(t + 0.13, d, 400, [1, 2.6, 4.1], 0.15, 0.4);
      rummage(t + 0.05, d, 6, 0.35, 800, 3000, 0.08);
    } else if (kind === 'box') {
      // Армейский ящик: стук дерева, треск досок
      thump(t, d, 140, 0.45, 0.14);
      burst(t, d, { f0: 330, q: 2, vol: 0.45, dur: 0.1, attack: 0.001 });
      grains(t + 0.01, d, 10, 0.15, { type: 'highpass', f0: 2000, f1: 5000, vol: 0.12, dur: 0.012 });
      creak(t + 0.05, d, { rate0: 60, rate1: 30, f: 700, q: 5, vol: 0.06, dur: 0.15 });
    } else if (kind === 'car') {
      // Машина: грохот, мнётся железо, сыплется стекло
      const sh = shaper(d, 3);
      burst(t, sh, { type: 'lowpass', f0: 3000, f1: 200, vol: 0.7, dur: 0.5, attack: 0.002 });
      tone(t, d, { f0: 70, f1: 28, vol: 0.8, dur: 0.5, attack: 0.002 });
      grains(t, d, 14, 0.3, { f0: 800, f1: 2500, q: 3, vol: 0.15, dur: 0.03 });
      ring(t + 0.02, d, 210, [1, 2.76, 5.4], 0.15, 0.6);
      glass(t + 0.04, d, 12, 0.5, 0.08);
    } else if (kind === 'barrel') {
      // Бочка: гулкий барабан, потом катится
      thump(t, d, 110, 0.45, 0.2);
      ring(t, d, 140, [1, 1.6, 2.3, 3.1], 0.35, 1.0);
      burst(t + 0.2, d, { type: 'lowpass', f0: 380, f1: 200, vol: 0.18, dur: 1.0, attack: 0.1, noise: 'brown' });
      ring(t + 0.45, d, 150, [1, 1.6], 0.08, 0.3);
      ring(t + 0.7, d, 155, [1, 1.6], 0.05, 0.25);
    } else {
      thump(t, d, 110, 0.5, 0.2);
    }
  };

  // Громила подхватывает груз: скрежет по земле и ворчание
  S.liftProp = function (kind, vol = 1, p = 0) {
    const t = start();
    if (t === null || vol <= 0.02) return;
    const d = bus(vol, p, 0.1);
    burst(t, d, { type: 'lowpass', f0: 900, f1: 300, vol: 0.2, dur: 0.3, attack: 0.03, noise: 'brown' });
    croak(t + 0.05, d, kind === 'car' ? 70 : 95, 0.18, 0.35);
    if (kind === 'car' || kind === 'trash' || kind === 'bin' || kind === 'barrel') ring(t, d, kind === 'bin' ? 520 : 180, [1, 2.4], 0.06, 0.3);
  };

  // --- Открытие тайников и сейфов ---
  S.containerOpen = function (c) {
    const t = start();
    if (t === null) return;
    const d = bus(1, pan(c.x), 0.12);
    const type = c.type;
    if (type === 'trash') {
      // Мусорный бак ЖЭК-4: крышка скрипит и бьёт, копание, бутылки звякают
      creak(t, d, { rate0: 32, rate1: 18, f: 1100, q: 8, vol: 0.16, dur: 0.35 });
      ring(t + 0.32, d, 300, [1, 2.3, 3.9], 0.16, 0.35);
      thump(t + 0.32, d, 120, 0.2, 0.1);
      rummage(t + 0.45, d, 9, 0.6, 900, 3500, 0.1);
      ring(t + 0.6, d, 2400, [1, 2.7], 0.06, 0.14);
      ring(t + 0.8, d, 3100, [1, 2.7], 0.05, 0.12);
    } else if (type === 'car' && c.subType === 'uaz') {
      // «Буханка»: тяжёлая сдвижная дверь, лязг, склянки аптечки
      burst(t, d, { f0: 2600, q: 4, vol: 0.16, dur: 0.02, attack: 0.001 });
      burst(t + 0.05, d, { type: 'lowpass', f0: 500, f1: 300, vol: 0.25, dur: 0.45, attack: 0.05, noise: 'brown' });
      thump(t + 0.5, d, 110, 0.35, 0.14);
      ring(t + 0.5, d, 230, [1, 2.76], 0.1, 0.3);
      rummage(t + 0.65, d, 6, 0.5, 600, 2500, 0.09);
      glass(t + 0.8, d, 4, 0.3, 0.04);
    } else if (type === 'car') {
      // «Жигули»: ручка, щелчок замка, дверь скрипит, бардачок
      burst(t, d, { f0: 3000, q: 4, vol: 0.14, dur: 0.015, attack: 0.001 });
      thump(t + 0.05, d, 180, 0.25, 0.07);
      creak(t + 0.12, d, { rate0: 24, rate1: 14, f: 700, q: 6, vol: 0.12, dur: 0.28 });
      rummage(t + 0.4, d, 7, 0.5, 600, 2500, 0.09);
    } else if (type === 'box') {
      // Армейский ящик: две защёлки, крышка скрипит и падает
      [0, 0.09].forEach(dt => {
        ring(t + dt, d, 1800, [1, 2.4], 0.06, 0.08);
        burst(t + dt, d, { type: 'highpass', f0: 3000, vol: 0.14, dur: 0.01, attack: 0.001 });
      });
      creak(t + 0.15, d, { rate0: 40, rate1: 24, f: 480, q: 5, vol: 0.13, dur: 0.3 });
      burst(t + 0.47, d, { f0: 340, q: 1.5, vol: 0.3, dur: 0.08, attack: 0.001 });
      thump(t + 0.47, d, 140, 0.25, 0.1);
      rummage(t + 0.6, d, 5, 0.4, 700, 2200, 0.08);
    } else if (type === 'boxcar') {
      // Крытый вагон: тяжёлая откатная дверь — рокот, визг, удар в упор
      const ac = S.ctx, g = ac.createGain();
      g.gain.value = 1;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 9;
      const lg = ac.createGain();
      lg.gain.value = 0.5;
      lfo.connect(lg);
      lg.connect(g.gain);
      g.connect(d);
      lfo.start(t);
      lfo.stop(t + 1.2);
      burst(t, g, { type: 'lowpass', f0: 520, f1: 380, vol: 0.32, dur: 1.1, attack: 0.08, noise: 'brown' });
      creak(t + 0.1, d, { rate0: 14, rate1: 9, f: 950, q: 12, vol: 0.06, dur: 0.8 });
      ring(t + 1.1, d, 180, [1, 2.76, 5.4], 0.28, 0.6);
      thump(t + 1.1, d, 90, 0.4, 0.2);
    } else if (type === 'gondola') {
      // Полувагон с ломом: железяки гремят
      for (let i = 0; i < 10; i++) ring(t + Math.random() * 0.8, d, rnd(380, 1400), [1, 2.3, 3.7], rnd(0.05, 0.12), rnd(0.15, 0.3));
      thump(t + 0.1, d, 120, 0.25, 0.12);
    } else if (type === 'tankcar') {
      // Цистерна: штурвал вентиля скрипит, люк лязгает, внутри плещется
      creak(t, d, { rate0: 12, rate1: 10, f: 1600, q: 10, vol: 0.1, dur: 0.5 });
      ring(t + 0.5, d, 260, [1, 2.4, 4.1], 0.2, 0.5);
      thump(t + 0.5, d, 120, 0.25, 0.12);
      burst(t + 0.6, d, { type: 'bandpass', f0: 300, f1: 450, q: 1, vol: 0.14, dur: 0.8, attack: 0.15, noise: 'brown' });
    } else if (type === 'kamaz' || type === 'zil') {
      // Кузов грузовика: защёлки, цепь, борт падает
      burst(t, d, { f0: 2800, q: 4, vol: 0.16, dur: 0.015, attack: 0.001 });
      burst(t + 0.08, d, { f0: 2500, q: 4, vol: 0.14, dur: 0.015, attack: 0.001 });
      for (let i = 0; i < 6; i++) ring(t + 0.12 + i * 0.035, d, rnd(2200, 3200), [1, 2.4], 0.04, 0.06);
      ring(t + 0.38, d, 210, [1, 2.76, 5.4], 0.24, 0.5);
      thump(t + 0.38, d, 100, 0.4, 0.18);
      rummage(t + 0.6, d, 5, 0.4, 600, 2400, 0.08);
    } else if (type === 'barrel') {
      // Бочка: крышку поддевают — скрип, хлопок, гул пустоты
      creak(t, d, { rate0: 50, rate1: 20, f: 900, q: 8, vol: 0.11, dur: 0.25 });
      tone(t + 0.25, d, { f0: 200, f1: 600, vol: 0.18, dur: 0.03 });
      burst(t + 0.27, d, { f0: 180, q: 12, vol: 0.25, dur: 0.4, attack: 0.003 });
      tone(t + 0.27, d, { f0: 110, f1: 80, vol: 0.16, dur: 0.4 });
    } else if (type && type.startsWith('safe_')) {
      // Сейф: ригели уходят, ручка, тяжёлая дверь скрипит; у кассового — ниже и дольше
      const big = type === 'safe_vault', mid = type === 'safe_fireproof';
      for (let i = 0; i < 3; i++) {
        ring(t + i * 0.07, d, 2200, [1, 2.2], 0.07, 0.07);
        thump(t + i * 0.07, d, 260, 0.12, 0.05);
      }
      creak(t + 0.28, d, { rate0: 20, rate1: 9, f: big ? 380 : mid ? 520 : 700, q: 6, vol: 0.16, dur: big ? 0.9 : 0.6 });
      thump(t + (big ? 1.15 : 0.9), d, big ? 80 : 110, 0.35, 0.18);
      ring(t + (big ? 1.15 : 0.9), d, big ? 150 : 240, [1, 2.76], 0.1, 0.4);
    } else {
      rummage(t, d, 6, 0.5, 800, 3000, 0.1);
    }
  };

  // ===================== ЗАПИСИ (CC0) =====================
  // Банк записанных звуков: assets/sounds/<ключ>_<n>.ogg (источники и лицензии — assets/sounds/CREDITS.md,
  // сборка — tools/build_sounds.py). Грузятся при первом звуке; пока не загрузились — синтез выше.
  // Каждый раз — случайный вариант (не тот же подряд) со случайной высотой; вдали — тише и глуше
  const BANK = {
    // оружие
    pm: 3, pm_far: 3, sg: 5, sg_far: 3,
    plasma: 3, laser_s: 3, pew: 1, motor: 1, thruster: 1, boom: 2, crunch: 2,
    // бита и удары
    swish: 6, punch_h: 5, punch_m: 5, splat: 4, metal_h: 5, metal_m: 5, metal_l: 3, plate_h: 3, tin: 3,
    wood_h: 3, plank: 3, wood_l: 2, glass_h: 3, glass_l: 3, mining: 3, soft_h: 4, soft_m: 3,
    // шаги
    step_conc: 5, step_grass: 5, step_snow: 5, step_mud: 4, step_bare: 4, drip: 1,
    // тайники
    creak: 3, door: 2, latch: 1, click: 1, pot: 3, cloth: 3, coins: 1, paper: 2
  };
  const SOUND_V = 1170;
  const buffers = {};
  const lastPick = {};
  let loading = false;

  function loadBank() {
    if (loading || !S.ctx) return;
    loading = true;
    Object.entries(BANK).forEach(([key, n]) => {
      buffers[key] = [];
      for (let i = 1; i <= n; i++) {
        fetch(`assets/sounds/${key}_${i}.ogg?v=${SOUND_V}`)
          .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
          .then(ab => S.ctx.decodeAudioData(ab))
          .then(buf => { buffers[key].push(buf); })
          .catch(() => {});
      }
    });
  }
  const has = key => !!(buffers[key] && buffers[key].length);

  // Проиграть запись: vol, pan, rate (высота), jitter (разброс высоты), wet (эхо), at (задержка, с),
  // lp / hp (фильтры, Гц), offset, dur (обрезать, с, с затуханием), loop. Нет записи — null
  function play(key, o = {}) {
    const list = buffers[key];
    if (!list || !list.length || !S.ctx) return null;
    const ac = S.ctx;
    const t = ac.currentTime + (o.at || 0);
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastPick[key]) i = (i + 1) % list.length;
    lastPick[key] = i;
    const src = ac.createBufferSource();
    src.buffer = list[i];
    const j = o.jitter === undefined ? 0.06 : o.jitter;
    src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * j);
    src.loop = !!o.loop;
    let node = src;
    if (o.lp) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      node.connect(f);
      node = f;
    }
    if (o.hp) {
      const f = ac.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = o.hp;
      node.connect(f);
      node = f;
    }
    const d = bus(o.vol === undefined ? 1 : o.vol, o.pan || 0, o.wet || 0);
    const env = ac.createGain();
    node.connect(env);
    env.connect(d);
    src.start(t, o.offset || 0);
    if (o.dur) {
      env.gain.setValueAtTime(1, t + o.dur * 0.7);
      env.gain.linearRampToValueAtTime(0.0001, t + o.dur);
      src.stop(t + o.dur + 0.02);
    }
    return { src, gain: d, env };
  }

  // Звук на карте: громкость и глухость по расстоянию (дальше — тише и без верхов), панорама
  function spatial(x, y, radius = 950) {
    const k = Math.min(1, Math.hypot(x - player.x, y - player.y) / radius);
    return { vol: Math.max(0, 1 - k), pan: pan(x), lp: 18000 * Math.pow(1 - k, 2) + 900 };
  }

  const synth = {};
  ['batSwing', 'makarov', 'shotgun', 'plasma', 'laser', 'drill', 'drillHit', 'reloadStart', 'reloadEnd', 'emptyClick',
    'impact', 'liftProp', 'containerOpen', 'toadPlasma', 'rocketLaunch', 'explosion'].forEach(k => { synth[k] = S[k]; });
  const ready = () => {
    start();
    loadBank();
    return has('swish');
  };

  // --- Оружие ---
  S.batSwing = function (hit = false) {
    if (!ready()) return synth.batSwing(hit);
    play('swish', { vol: hit ? 0.26 : 0.33, rate: 0.85, jitter: 0.1 });
    if (hit === 'armor') {
      play('metal_m', { vol: 0.5, at: 0.03, wet: 0.15 });
      play('punch_m', { vol: 0.3, at: 0.03 });
    } else if (hit === 'flesh') {
      play('punch_h', { vol: 0.42, at: 0.03 });
      play('splat', { vol: 0.22, at: 0.04, rate: 0.9, dur: 0.25 });
    } else if (hit) {
      play('wood_h', { vol: 0.45, at: 0.03, wet: 0.1 });
    }
  };

  // ПМ и обрез: у Василия — запись вблизи, у выживших и вдали — со средней дистанции, с эхом
  S.makarov = function (vol = 1, p = 0) {
    if (!ready() || !has('pm')) return synth.makarov(vol, p);
    if (vol < 0.75 && has('pm_far')) play('pm_far', { vol: 1.6 * vol, pan: p, lp: 12000 * vol + 1500, jitter: 0.04 });
    else play('pm', { vol: 1.5 * vol, pan: p, wet: 0.12, jitter: 0.04 });
  };

  S.shotgun = function (vol = 1, p = 0) {
    if (!ready() || !has('sg')) return synth.shotgun(vol, p);
    if (vol < 0.75 && has('sg_far')) play('sg_far', { vol: 1.8 * vol, pan: p, lp: 12000 * vol + 1500, jitter: 0.03 });
    else {
      play('sg', { vol: 1.7 * vol, pan: p, wet: 0.15, jitter: 0.03 });
      play('boom', { vol: 0.3 * vol, pan: p, rate: 1.5, dur: 0.3 });     // удар в грудь
    }
  };

  S.plasma = function () {
    if (!ready() || !has('plasma')) return synth.plasma();
    play('plasma', { vol: 0.55, wet: 0.15, jitter: 0.05 });
    play('boom', { vol: 0.25, rate: 1.8, dur: 0.18 });
  };

  // Лазер и дрель — петля, пока жмёшь (вызовы идут каждые несколько кадров), затихает сама
  function sampleHum(key, level, fade, o) {
    const h = { node: null, timer: 0 };
    h.keep = () => {
      const ac = S.ctx;
      const t = ac.currentTime;
      if (!h.node) {
        h.node = play(key, Object.assign({ loop: true, vol: 0.0001, jitter: 0 }, o));
        if (!h.node) return false;
      }
      const g = h.node.gain.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(level, t, 0.03);
      g.setTargetAtTime(0.0001, t + fade, 0.06);
      clearTimeout(h.timer);
      h.timer = setTimeout(() => {
        if (!h.node) return;
        try { h.node.src.stop(); } catch (e) { /* уже остановлен */ }
        h.node = null;
      }, (fade + 0.8) * 1000);
      return true;
    };
    return h;
  }
  const drillLoop = sampleHum('motor', 0.4, 0.3, { rate: 2.3, lp: 4000 });
  // Лазерный бластер: пока жмёшь (вызов каждые 3 кадра) — очередь коротких «пиу», не чаще чем раз в 85 мс
  let lastPew = 0;
  S.laser = function () {
    if (!ready() || !has('pew')) return synth.laser();
    const now = performance.now();
    if (now - lastPew < 85) return;
    lastPew = now;
    play('pew', { vol: 0.35, rate: 1.1, jitter: 0.03, dur: 0.12 });
  };
  S.drill = function () {
    if (!ready() || !has('motor')) return synth.drill();
    drillLoop.keep();
  };
  S.drillHit = function () {
    if (!ready() || !has('mining')) return synth.drillHit();
    play('mining', { vol: 0.45, rate: 1.4, jitter: 0.15 });
    play('splat', { vol: 0.35, rate: 1.3, dur: 0.15 });
  };

  // Перезарядка — из защёлок и щелчков: ПМ — кнопка, магазин выходит, входит, затвор; обрез — переломил,
  // гильзы звякнули, патроны в стволы, закрыл
  S.reloadStart = function (w) {
    if (!ready() || !has('latch')) return synth.reloadStart(w);
    if (w === 'shotgun') {
      play('latch', { vol: 0.75, rate: 0.75 });
      play('tin', { vol: 0.18, rate: 2.4, at: 0.16, dur: 0.15 });
      play('tin', { vol: 0.14, rate: 2.7, at: 0.24, dur: 0.15 });
    } else {
      play('click', { vol: 0.5, rate: 1.5, dur: 0.1 });
      play('cloth', { vol: 0.35, rate: 1.6, at: 0.05, dur: 0.15 });
    }
  };
  S.reloadEnd = function (w) {
    if (!ready() || !has('latch')) return synth.reloadEnd(w);
    if (w === 'shotgun') {
      play('click', { vol: 0.4, rate: 0.9, dur: 0.1 });
      play('click', { vol: 0.4, rate: 0.95, at: 0.1, dur: 0.1 });
      play('latch', { vol: 0.85, rate: 0.85, at: 0.22 });
    } else {
      play('latch', { vol: 0.6, rate: 1.2 });
      play('latch', { vol: 0.75, rate: 1.45, at: 0.2 });
    }
  };
  S.emptyClick = function () {
    if (!ready() || !has('click')) return synth.emptyClick();
    play('click', { vol: 1, rate: 1.4, dur: 0.1, jitter: 0.04 });
  };

  // Оружие жаб: плазменный автомат штурмовика, ракеты
  S.toadPlasma = function (vol = 1) {
    if (!ready() || !has('laser_s')) return synth.toadPlasma(vol);
    play('laser_s', { vol: 0.4 * vol, rate: 0.7, jitter: 0.08, lp: 5000 });
  };
  S.rocketLaunch = function (vol = 1) {
    if (!ready() || !has('thruster')) return synth.rocketLaunch(vol);
    play('thruster', { vol: 0.6 * vol, rate: 1.3, dur: 0.45, jitter: 0.05 });
  };
  S.explosion = function (vol = 1) {
    if (!ready() || !has('crunch')) return synth.explosion(vol);
    play('crunch', { vol: 0.64 * vol, wet: 0.3, jitter: 0.05 });
    play('boom', { vol: 0.68 * vol, jitter: 0.05 });
  };

  // --- Шаги ---
  // kind: player, human, toad, heavy, giant; far — 0 рядом … 1 на краю слышимости (глуше)
  function sampleStep(kind, surf, vol, p, size, far) {
    if (!ready() || !has('step_conc')) return false;
    const lp = 16000 * Math.pow(1 - far, 2) + 900;
    if (kind === 'player' || kind === 'human') {
      const key = surf === 'hard' ? 'step_conc' : surf === 'gravel' ? 'step_snow' : surf === 'wet' ? 'step_mud' : 'step_grass';
      // Записи разной силы: асфальт звонкий, трава тихая — выровнено на слух по громкости
      const g = { hard: 0.5, ground: 1.4, gravel: 1, wet: 0.6 }[surf];
      play(key, { vol: vol * g, pan: p, lp, jitter: 0.08, dur: surf === 'wet' ? 0.22 : null });
    } else if (kind === 'toad') {
      // Выбрано на слух: асфальт — босая нога пониже, земля — трава пониже, слизь — трава и капля, щебень — хруст
      const o = { pan: p, lp, jitter: 0.08 };
      if (surf === 'hard') play('step_bare', Object.assign({ vol: vol * 0.75, rate: 0.7 / size }, o));
      else if (surf === 'gravel') play('step_snow', Object.assign({ vol: vol * 0.8, rate: 0.75 / size }, o));
      else if (surf === 'wet') {
        play('step_grass', Object.assign({ vol: vol * 0.9, rate: 0.8 / size }, o));
        play('drip', Object.assign({ vol: vol * 0.3, at: 0.01 }, o));
      } else play('step_grass', Object.assign({ vol: vol, rate: 0.75 / size }, o));
    } else if (kind === 'heavy') {
      play('soft_h', { vol: vol * 0.9, pan: p, lp, rate: 0.75, jitter: 0.08 });
      play(surf === 'hard' ? 'step_bare' : 'step_grass', { vol: vol * 0.6, pan: p, lp, rate: 0.55, jitter: 0.06 });
    } else {
      play('soft_h', { vol: vol, pan: p, lp, rate: 0.55, jitter: 0.06, wet: 0.2 });
      play('boom', { vol: vol * 0.35, pan: p, lp: Math.min(lp, 2500), rate: 1.4, dur: 0.35 });
    }
    return true;
  }

  // --- Падение брошенного громилой ---
  const IMPACT_GAIN = { bin: 0.9, trash: 0.47, box: 0.52, car: 0.56, barrel: 0.7 };
  S.impact = function (kind, vol = 1, p = 0) {
    if (!ready() || !has('metal_h')) return synth.impact(kind, vol, p);
    // Громкость падений выровнена по иерархии: тише выстрелов, машина громче урны
    const k = vol * (IMPACT_GAIN[kind] || 0.6);
    const o = (key, v, extra = {}) => play(key, Object.assign({ vol: v * k, pan: p, wet: 0.25 }, extra));
    if (kind === 'bin') {
      o('tin', 0.9);
      o('metal_l', 0.6, { at: 0.02 });
      o('tin', 0.35, { at: 0.2, rate: 1.1 });
      o('paper', 0.4, { at: 0.05 });
    } else if (kind === 'trash') {
      o('metal_h', 1);
      o('plate_h', 0.8, { at: 0.01, rate: 0.85 });
      o('soft_h', 0.7, { rate: 0.7 });
      o('pot', 0.4, { at: 0.12, rate: 0.8 });
    } else if (kind === 'box') {
      o('wood_h', 1);
      o('plank', 0.7, { at: 0.02 });
      o('soft_h', 0.5, { rate: 0.8 });
    } else if (kind === 'car') {
      o('metal_h', 1, { rate: 0.75 });
      o('crunch', 0.6, { lp: 3500, dur: 0.6 });
      o('glass_h', 0.8, { at: 0.03 });
      o('glass_l', 0.5, { at: 0.18 });
      o('soft_h', 0.9, { rate: 0.55 });
    } else if (kind === 'barrel') {
      o('plate_h', 0.9, { rate: 0.75 });
      o('metal_h', 0.6, { rate: 0.8, at: 0.01 });
      o('plate_h', 0.35, { rate: 0.8, at: 0.35 });
      o('plate_h', 0.18, { rate: 0.82, at: 0.6 });
    } else {
      o('soft_h', 0.9);
    }
  };

  S.liftProp = function (kind, vol = 1, p = 0) {
    if (!ready() || !has('soft_m')) return synth.liftProp(kind, vol, p);
    play('soft_m', { vol: 0.5 * vol, pan: p, rate: 0.7 });
    if (kind === 'car' || kind === 'trash' || kind === 'bin' || kind === 'barrel') play('metal_l', { vol: 0.25 * vol, pan: p, rate: 0.8 });
  };

  // --- Тайники и сейфы ---
  S.containerOpen = function (c) {
    if (!ready() || !has('creak')) return synth.containerOpen(c);
    const p = pan(c.x);
    const o = (key, v, extra = {}) => play(key, Object.assign({ vol: v * 0.45, pan: p, wet: 0.1 }, extra));
    const type = c.type;
    if (type === 'trash') {
      o('creak', 0.6, { rate: 1.1 });
      o('pot', 0.55, { at: 0.3, rate: 0.75 });
      o('paper', 0.6, { at: 0.5 });
      o('cloth', 0.5, { at: 0.7 });
      o('glass_l', 0.35, { at: 0.95 });
    } else if (type === 'car' && c.subType === 'uaz') {
      // «Буханка»: тугой замок, тяжёлая железная дверь скрипит и лязгает, внутри аптечка — склянки
      o('latch', 0.7, { rate: 0.8 });
      o('door', 0.7, { at: 0.06, rate: 0.8, dur: 0.8 });
      o('metal_m', 0.45, { at: 0.75, rate: 0.75 });
      o('cloth', 0.6, { at: 0.9 });
      o('glass_l', 0.3, { at: 1.1 });
    } else if (type === 'car') {
      o('latch', 0.6, { rate: 0.9 });
      o('door', 0.7, { at: 0.05, rate: 1.15, dur: 0.6 });
      o('cloth', 0.6, { at: 0.5 });
      o('paper', 0.4, { at: 0.75 });
    } else if (type === 'box') {
      o('latch', 0.7);
      o('latch', 0.6, { at: 0.12, rate: 1.1 });
      o('creak', 0.55, { at: 0.2, rate: 0.9 });
      o('wood_l', 0.7, { at: 0.55 });
      o('cloth', 0.45, { at: 0.7 });
    } else if (type === 'boxcar') {
      // Крытый вагон: тяжёлая откатная дверь — скрежет по направляющей и удар в упор
      o('latch', 0.7, { rate: 0.7 });
      o('creak', 0.7, { at: 0.1, rate: 0.5 });
      o('creak', 0.5, { at: 0.45, rate: 0.45 });
      o('metal_h', 0.85, { at: 1.0, rate: 0.6, wet: 0.3 });
    } else if (type === 'gondola') {
      for (let i = 0; i < 5; i++) o(i % 2 ? 'metal_l' : 'metal_m', 0.45, { at: Math.random() * 0.6, rate: rnd(0.8, 1.2) });
      o('mining', 0.4, { at: 0.2 });
    } else if (type === 'tankcar') {
      o('creak', 0.6, { rate: 0.6 });
      o('pot', 0.6, { at: 0.5, rate: 0.6 });
      o('splat', 0.4, { at: 0.7, rate: 0.6 });
    } else if (type === 'kamaz' || type === 'zil') {
      o('latch', 0.7);
      o('coins', 0.4, { at: 0.1, rate: 0.6 });
      o('metal_h', 0.85, { at: 0.38, rate: 0.85, wet: 0.25 });
      o('cloth', 0.45, { at: 0.7 });
    } else if (type === 'barrel') {
      o('creak', 0.5, { rate: 1.4 });
      o('pot', 0.6, { at: 0.25, rate: 0.9 });
    } else if (type && type.startsWith('safe_')) {
      const big = type === 'safe_vault', mid = type === 'safe_fireproof';
      o('click', 0.6);
      o('latch', 0.7, { at: 0.12 });
      o('latch', 0.6, { at: 0.24, rate: 0.9 });
      o('door', 0.75, { at: 0.35, rate: big ? 0.55 : mid ? 0.7 : 0.85 });
      o('metal_h', 0.6, { at: big ? 1.6 : mid ? 1.3 : 1.05, rate: big ? 0.6 : 0.8 });
    } else {
      o('cloth', 0.6);
      o('paper', 0.5, { at: 0.2 });
    }
  };

  S.pan = pan;
})();
