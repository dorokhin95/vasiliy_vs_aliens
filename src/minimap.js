/**
 * Миникарта и помощь упавшему (кооп, docs/COOP.md).
 *
 *  - Миникарта в правом верхнем углу — круглый полупрозрачный радар вокруг своего Василия (не вся карта):
 *    дороги и дома рядом, свой Василий в середине (куда смотрит), товарищи — точками своего цвета, упавшие —
 *    красным кольцом, погибшие — крестиком; важные места: ларёк Михалыча, пролом, логово босса, пост,
 *    мастерская и столовая спасённых, оборона у пролома. Кто и что дальше края — на ободе, в свою сторону.
 *    M — крупнее (и дальше видно) / спрятать / снова мелко (запоминается).
 *  - Свой Василий упал: панель внизу — сколько осталось, что делать товарищу, кнопка «Позвать на помощь» (H).
 *  - Товарищ позвал: у остальных — окно «Петя зовёт на помощь — 120 м» со стрелкой и стрелка у края экрана.
 *
 * Скрипты обычные, без модулей: players, localPlayer, buildings, roads, camera, viewW/viewH — из game.js.
 */
window.Minimap = (() => {
  const L = (ru, en) => (currentLang === 'ru' ? ru : en);
  const MODE_KEY = 'vasiliy.minimap';
  const SIZES = [170, 260, 0];          // мелко, крупно, спрятана
  const RANGE = [1700, 3000, 0];        // сколько мира от Василия до края круга, px
  const STATIC_K = 1 / 6;               // подложка — вся локация в масштабе 1:6 (из неё вырезается круг)
  const PX_PER_M = 50;                  // Василий ~90 px ростом — около метра на 50 px
  let mode = 0;
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v !== null) mode = Math.max(0, SIZES.indexOf(Number(v)));
  } catch (e) { /* по умолчанию мелко */ }

  // --- DOM: холст карты, панель упавшего, окна зова ---
  const css = document.createElement('style');
  css.textContent = `
    #minimap { position: absolute; top: 15px; right: 15px; z-index: 11; border-radius: 50%; opacity: 0.78;
      pointer-events: none; }
    #minimap-hint { position: absolute; right: 19px; z-index: 11; color: #64748b; font: 600 11px Arial; pointer-events: none; }
    #down-panel { position: absolute; left: 50%; bottom: 120px; transform: translateX(-50%); z-index: 30; display: none;
      background: rgba(24, 8, 8, 0.92); border: 2px solid #ef4444; border-radius: 12px; padding: 14px 20px; color: #fecaca;
      font: 600 15px Arial; text-align: center; min-width: 340px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
    #down-panel h3 { margin: 0 0 6px; color: #f87171; font-size: 22px; letter-spacing: 1px; }
    #down-panel .down-line { margin: 4px 0; color: #fde2e2; font-weight: 500; }
    #down-panel .down-sent { color: #86efac; }
    #down-help { margin-top: 10px; font: 800 16px Arial; padding: 10px 22px; border-radius: 8px; cursor: pointer;
      color: #fff; background: linear-gradient(#ef4444, #b91c1c); border: 1px solid #fca5a5; }
    #down-help:hover { filter: brightness(1.15); }
    #down-help.sent { background: linear-gradient(#16a34a, #15803d); border-color: #86efac; }
    #help-calls { position: absolute; top: 132px; left: 50%; transform: translateX(-50%); z-index: 30; display: flex;
      flex-direction: column; gap: 6px; align-items: center; pointer-events: none; }
    .help-call { display: flex; align-items: center; gap: 10px; background: rgba(40, 6, 6, 0.92); border: 2px solid #ef4444;
      border-radius: 10px; padding: 8px 14px; color: #fee2e2; font: 700 15px Arial; box-shadow: 0 6px 18px rgba(0,0,0,0.5); }
    .help-call.flash { animation: helpFlash 0.5s ease-in-out 4; }
    .help-call .arrow { font-size: 22px; color: #f87171; display: inline-block; }
    @keyframes helpFlash { 50% { background: rgba(185, 28, 28, 0.95); } }`;
  document.head.appendChild(css);
  const host = document.getElementById('game-container') || document.body;
  const canvas = document.createElement('canvas');
  canvas.id = 'minimap';
  host.appendChild(canvas);
  const hint = document.createElement('div');
  hint.id = 'minimap-hint';
  host.appendChild(hint);
  const g = canvas.getContext('2d');

  const panel = document.createElement('div');
  panel.id = 'down-panel';
  panel.innerHTML = '<h3></h3><div class="down-line" id="down-time"></div><div class="down-line" id="down-what"></div>' +
    '<button id="down-help"></button>';
  host.appendChild(panel);
  const helpBtn = panel.querySelector('#down-help');
  // Кнопка — не выстрел: окно ловит mousedown для стрельбы
  helpBtn.addEventListener('mousedown', e => e.stopPropagation());
  helpBtn.addEventListener('click', e => {
    e.stopPropagation();
    callForHelp();
  });

  const calls = document.createElement('div');
  calls.id = 'help-calls';
  host.appendChild(calls);

  function toggle() {
    mode = (mode + 1) % SIZES.length;
    try { localStorage.setItem(MODE_KEY, String(SIZES[mode])); } catch (e) { /* не запомнится — не страшно */ }
    staticKey = '';
  }

  // --- Подложка: дороги и дома всей локации (перерисовывается, когда сменилась локация) ---
  let staticKey = '', staticCanvas = null;
  function buildStatic() {
    const size = Math.ceil(WORLD_WIDTH * STATIC_K);
    const k = STATIC_K;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const s = c.getContext('2d');
    s.fillStyle = '#10161f';
    s.fillRect(0, 0, size, size);
    s.fillStyle = '#2b3442';
    roads.forEach(r => s.fillRect(r.x * k, r.y * k, Math.max(1, r.w * k), Math.max(1, r.h * k)));
    buildings.forEach(b => {
      const fence = /fence/.test(b.type || '');
      s.fillStyle = fence ? '#475569' : '#56606e';
      s.fillRect(b.x * k, b.y * k, Math.max(1, b.w * k), Math.max(fence ? 1 : 2, b.h * k));
    });
    return c;
  }

  // Важные места: [x, y, значок, цвет]
  function places() {
    const list = [];
    if (currentLocation === 'city') list.push([safeZone.x, safeZone.y, 'kiosk']);
    if (fenceBreach.state !== 'intact') list.push([fenceBreach.x, breachFenceY(), 'breach']);
    if (currentLocation === 'city' && bossRef) list.push([BOSS_HOME.x, BOSS_HOME.y, 'boss']);
    if (currentLocation === 'promzona' && pounderRef) list.push([POUNDER_HOME.x, POUNDER_HOME.y, 'boss']);
    if (window.Settlers && window.Settlers.places) window.Settlers.places().forEach(p => list.push([p.x, p.y, p.kind]));
    if (currentLocation === 'promzona' && window.Defense && window.Defense.stage !== 'done' && window.Defense.stage !== 'pending')
      list.push([window.Defense.center.x, window.Defense.center.y, 'defense']);
    return list;
  }
  const ICON = { kiosk: '🏪', breach: '🚧', boss: '💀', post: '⛺', workshop: '🔧', canteen: '🍲', defense: '🛡' };

  let tick = 0;
  function drawMap(t) {
    const size = SIZES[mode];
    canvas.style.display = size && gameState !== 'MENU' ? '' : 'none';
    hint.style.display = canvas.style.display;
    if (!size || gameState === 'MENU') return;
    if (canvas.width !== size) { canvas.width = canvas.height = size; canvas.style.width = canvas.style.height = size + 'px'; }
    hint.style.top = (15 + size + 4) + 'px';
    hint.textContent = L(`M — ${mode === 0 ? 'крупнее' : 'спрятать'}`, `M — ${mode === 0 ? 'bigger' : 'hide'}`);
    const key = `${currentLocation}|${buildings.length}|${roads.length}`;
    if (key !== staticKey) { staticKey = key; staticCanvas = buildStatic(); }

    // Радар: в середине — свой Василий (погиб — тот, за кем смотрит камера), круг — RANGE мира вокруг
    const me = localPlayer.dead ? (alivePlayers()[0] || localPlayer) : localPlayer;
    const c = size / 2, R = c - 2;
    const range = RANGE[mode];
    const k = R / range;
    const toMap = (x, y) => [c + (x - me.x) * k, c + (y - me.y) * k];
    // Что дальше края — на ободе (inset — насколько внутрь от обода), в свою сторону
    const clampRim = (mx, my, inset) => {
      const dx = mx - c, dy = my - c, d = Math.hypot(dx, dy), lim = R - inset;
      return d > lim ? [c + dx / d * lim, c + dy / d * lim, true] : [mx, my, false];
    };
    g.clearRect(0, 0, size, size);
    g.save();
    g.beginPath();
    g.arc(c, c, R, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = 'rgba(10, 15, 22, 0.85)';
    g.fillRect(0, 0, size, size);
    // Кусок подложки вокруг Василия: в подложке 1 px = 1/STATIC_K мира
    const src = range * STATIC_K;
    g.drawImage(staticCanvas, (me.x - range) * STATIC_K, (me.y - range) * STATIC_K, src * 2, src * 2, 0, 0, size, size);
    // Что видно на экране — рамкой
    const [vx, vy] = toMap(camera.x, camera.y);
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = 1;
    g.strokeRect(vx, vy, viewW * k, viewH * k);
    // Ларёк: зелёный круг купола
    if (currentLocation === 'city') {
      const [sx, sy] = toMap(safeZone.x, safeZone.y);
      g.strokeStyle = 'rgba(16, 185, 129, 0.8)';
      g.beginPath();
      g.arc(sx, sy, Math.max(3, safeZone.radius * k), 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();

    // Важные места: дальше края — на ободе, помельче
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    places().forEach(([x, y, kind]) => {
      const [mx, my] = toMap(x, y);
      const [px, py, rim] = clampRim(mx, my, 9);
      g.globalAlpha = rim ? 0.75 : 1;
      g.font = `${rim ? 11 : (mode === 1 ? 15 : 13)}px "Segoe UI Emoji", Arial`;
      g.fillText(ICON[kind] || '•', px, py);
    });
    g.globalAlpha = 1;

    // Игроки: товарищи, потом свой — поверх. Товарищ дальше края — на ободе
    const r = mode === 1 ? 4.5 : 3.5;
    const order = players.filter(p => p !== me && !p.left).concat([me]);
    order.forEach(p => {
      const [mx, my] = toMap(p.x, p.y);
      const [x, y] = clampRim(mx, my, 5);
      if (p.dead) {
        g.font = '11px Arial';
        g.fillStyle = '#94a3b8';
        g.fillText('✝', x, y);
        return;
      }
      if (p.downT > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(t / 150);
        g.strokeStyle = `rgba(239, 68, 68, ${0.4 + 0.6 * pulse})`;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, r + 3 + pulse * 4, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = COOP_COLORS[p.color] || '#e5e7eb';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      if (p === me) {
        g.strokeStyle = '#fff';
        g.lineWidth = 1.5;
        g.stroke();
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(p.angle) * (r + 6), y + Math.sin(p.angle) * (r + 6));
        g.stroke();
      }
    });

    // Обод
    g.strokeStyle = 'rgba(148, 163, 184, 0.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(c, c, R, 0, Math.PI * 2);
    g.stroke();
  }

  // --- Упал свой: панель с таймером и кнопкой; погиб — коротко ---
  function updatePanel() {
    const me = localPlayer;
    const coop = players.length > 1;
    const show = coop && (gameState === 'PLAYING' || gameState === 'PAUSED') && (me.downT > 0 || me.dead) && !me.left;
    panel.style.display = show ? 'block' : 'none';
    if (!show) return;
    if (me.dead) {
      panel.querySelector('h3').textContent = L('ТЫ ПОГИБ', 'YOU DIED');
      panel.querySelector('#down-time').textContent = L('Смотришь, как дерутся товарищи.', 'You are watching your teammates.');
      panel.querySelector('#down-what').textContent = '';
      helpBtn.style.display = 'none';
      return;
    }
    helpBtn.style.display = '';
    panel.querySelector('h3').textContent = L('ТЫ УПАЛ', 'YOU ARE DOWN');
    const sec = Math.ceil(me.downT / 60);
    panel.querySelector('#down-time').textContent = me.reviving
      ? L('Тебя поднимают… таймер стоит', 'You are being revived… timer paused')
      : L(`Осталось ${sec} с — потом конец`, `${sec}s left — then it's over`);
    panel.querySelector('#down-what').textContent = L('Товарищ поднимет: пусть подойдёт вплотную и держит E.',
      'A teammate can revive you: they must come close and hold E.');
    helpBtn.classList.toggle('sent', !!me.helpCall);
    helpBtn.textContent = me.helpCall ? L('✔ Зов отправлен — позвать ещё раз [H]', '✔ Call sent — call again [H]')
      : L('🆘 Позвать на помощь [H]', '🆘 Call for help [H]');
  }

  // --- Зовут товарищи: окна со стрелкой и стрелка у края экрана ---
  const lastN = {};
  function callers() {
    if (localPlayer.dead || localPlayer.downT > 0) return [];
    return players.filter(p => p !== localPlayer && !p.left && p.downT > 0 && p.helpCall);
  }
  function updateCalls() {
    const list = callers();
    const html = list.map(p => {
      const a = Math.atan2(p.y - localPlayer.y, p.x - localPlayer.x);
      const m = Math.round(Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y) / PX_PER_M);
      const flash = lastN[p.id] !== p.helpN ? ' flash' : '';
      return `<div class="help-call${flash}" data-id="${p.id}"><span class="arrow" style="transform:rotate(${a}rad)">➤</span>` +
        `<span>🆘 ${escape(p.name)} ${L('зовёт на помощь', 'calls for help')} — ${m} ${L('м', 'm')} · ${Math.ceil(p.downT / 60)} ${L('с', 's')}</span></div>`;
    });
    // Перерисовать, только если что-то поменялось (иначе мигание сбрасывается каждый кадр)
    const sig = list.map(p => `${p.id}:${p.helpN}`).join(',');
    if (calls.dataset.sig !== sig) {
      calls.dataset.sig = sig;
      calls.innerHTML = html.join('');
      list.forEach(p => { lastN[p.id] = p.helpN; });
    } else {
      list.forEach(p => {
        const el = calls.querySelector(`[data-id="${p.id}"]`);
        if (!el) return;
        const a = Math.atan2(p.y - localPlayer.y, p.x - localPlayer.x);
        const m = Math.round(Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y) / PX_PER_M);
        el.querySelector('.arrow').style.transform = `rotate(${a}rad)`;
        el.lastChild.textContent = `🆘 ${p.name} ${L('зовёт на помощь', 'calls for help')} — ${m} ${L('м', 'm')} · ${Math.ceil(p.downT / 60)} ${L('с', 's')}`;
      });
    }
  }
  const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Стрелка на основном холсте: товарищ за краем экрана — у края, в его сторону; на экране — над ним
  function drawArrows(ctx, t) {
    const list = callers();
    if (!list.length) return;
    ctx.save();
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    list.forEach(p => {
      const sx = p.x - camera.x, sy = p.y - 40 - camera.y;
      const pad = 46;
      const onScreen = sx > pad && sx < viewW - pad && sy > pad && sy < viewH - pad;
      const bob = Math.sin(t / 120) * 6;
      let x, y, a;
      if (onScreen) {
        x = sx; y = sy - 50 + bob; a = Math.PI / 2;
      } else {
        const cx = viewW / 2, cy = viewH / 2;
        a = Math.atan2(sy - cy, sx - cx);
        // Точка на краю (прямоугольник с отступом) по направлению к товарищу
        const kx = (viewW / 2 - pad) / Math.abs(Math.cos(a) || 1e-6);
        const ky = (viewH / 2 - pad) / Math.abs(Math.sin(a) || 1e-6);
        const d = Math.min(kx, ky);
        x = cx + Math.cos(a) * d; y = cy + Math.sin(a) * d;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-10, -14);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (!onScreen) {
        const m = Math.round(Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y) / PX_PER_M);
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        const label = `${p.name} ${m} ${L('м', 'm')}`;
        const lx = x - Math.cos(a) * 34, ly = y - Math.sin(a) * 26 + 4;
        ctx.strokeText(label, lx, ly);
        ctx.fillStyle = '#fecaca';
        ctx.fillText(label, lx, ly);
      }
    });
    ctx.restore();
  }

  // Каждый кадр отрисовки (game.js render)
  function frame(ctx) {
    const t = performance.now();
    drawArrows(ctx, t);
    if (++tick % 4 !== 0) return;   // карта и окна — 15 раз в секунду хватает
    drawMap(t);
    updatePanel();
    updateCalls();
  }

  return { frame, toggle };
})();
