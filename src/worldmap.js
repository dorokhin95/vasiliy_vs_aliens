/**
 * Карта локации по M (docs/COOP.md, «Карта»): вся локация в окне, с туманом — видно только то, где уже
 * пробежались, — и метками игрока.
 *
 *  - Туман: локация разбита на клетки CELL px; клетка открывается, когда кто-то из игроков был ближе REVEAL px.
 *    Открытое — в сохранении забега (saveState, по локациям); старое сохранение без карты — открывается
 *    вокруг обысканных тайников (там точно были).
 *  - Что на карте: дороги и дома (подложка миникарты), купол, пролом, логово босса, пост, мастерская, столовая,
 *    своя дверь подвала, в открытых клетках — тайники (янтарные — ещё не обысканы, серые — обысканы), игроки,
 *    рамка экрана, названия районов.
 *  - Метки: ЛКМ по карте ставит метку (до MAX_MARKS на локацию), клик по метке убирает. Метка видна на миникарте,
 *    а в мире — флажок на месте и стрелка у края экрана с расстоянием, пока место не на экране. Метки — свои у
 *    каждого игрока, в сохранении забега.
 *  - В одиночной игре мир на паузе, пока карта открыта (gameState 'MAP'); в коопе — идёт (NET_LIVE_STATES).
 *
 * Скрипты обычные, без модулей: players, localPlayer, containers, camera, viewW/viewH — из game.js;
 * подложка и значки мест — из src/minimap.js.
 */
window.WorldMap = (() => {
  const L = (ru, en) => (currentLang === 'ru' ? ru : en);
  const CELL = 150;                 // клетка тумана, px мира
  const REVEAL = 640;               // открывается вокруг игрока, px (чуть меньше половины экрана по диагонали)
  const MAX_MARKS = 5;
  const PX_PER_M = 50;
  const N = () => Math.ceil(WORLD_WIDTH / CELL);

  const explored = {};              // локация -> Uint8Array клеток
  const marks = {};                 // локация -> [{ x, y }]
  let legacy = {};                  // локация -> true: сохранение без карты, открыть вокруг обысканных тайников
  let tick = 0;

  // --- Сохранение: клетки — hex-строкой бит, метки — парами ---
  function saveState() {
    const ex = {};
    for (const loc in explored) {
      const a = explored[loc];
      let hex = '';
      for (let i = 0; i < a.length; i += 8) {
        let b = 0;
        for (let k = 0; k < 8 && i + k < a.length; k++) if (a[i + k]) b |= 1 << k;
        hex += b.toString(16).padStart(2, '0');
      }
      ex[loc] = hex;
    }
    const mk = {};
    for (const loc in marks) if (marks[loc].length) mk[loc] = marks[loc].map(m => [Math.round(m.x), Math.round(m.y)]);
    return { cell: CELL, explored: ex, marks: mk };
  }
  function loadState(s) {
    for (const k in explored) delete explored[k];
    for (const k in marks) delete marks[k];
    legacy = {};
    if (!s || typeof s !== 'object') { legacy = { city: true, promzona: true }; return; }
    const n = N(), total = n * n;
    if (s.cell === CELL && s.explored) {
      for (const loc in s.explored) {
        const hex = String(s.explored[loc]);
        const a = new Uint8Array(total);
        for (let i = 0; i < hex.length - 1 && i / 2 * 8 < total; i += 2) {
          const b = parseInt(hex.slice(i, i + 2), 16) || 0;
          for (let k = 0; k < 8; k++) { const idx = (i / 2) * 8 + k; if (idx < total && (b >> k) & 1) a[idx] = 1; }
        }
        explored[loc] = a;
      }
    } else legacy = { city: true, promzona: true };
    if (s.marks) for (const loc in s.marks) {
      marks[loc] = (Array.isArray(s.marks[loc]) ? s.marks[loc] : []).slice(0, MAX_MARKS)
        .map(m => ({ x: +m[0] || 0, y: +m[1] || 0 }));
    }
  }

  function grid() {
    const loc = currentLocation;
    if (!explored[loc]) {
      explored[loc] = new Uint8Array(N() * N());
      if (legacy[loc]) {
        // Где уже были: вокруг каждого обысканного тайника
        delete legacy[loc];
        containers.forEach(c => { if (c.searched) reveal(explored[loc], c.x, c.y, REVEAL * 0.8); });
      }
    }
    return explored[loc];
  }
  function reveal(a, x, y, r) {
    const n = N();
    const c0 = Math.max(0, Math.floor((x - r) / CELL)), c1 = Math.min(n - 1, Math.floor((x + r) / CELL));
    const r0 = Math.max(0, Math.floor((y - r) / CELL)), r1 = Math.min(n - 1, Math.floor((y + r) / CELL));
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const mx = (cx + 0.5) * CELL, my = (cy + 0.5) * CELL;
      if (Math.hypot(mx - x, my - y) < r) a[cy * n + cx] = 1;
    }
  }
  const isOpen = (a, x, y) => {
    const n = N(), cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    return cx >= 0 && cy >= 0 && cx < n && cy < n && !!a[cy * n + cx];
  };

  // --- Метки ---
  const list = () => (marks[currentLocation] = marks[currentLocation] || []);
  function toggleMark(x, y, nearPx) {
    const l = list();
    const i = l.findIndex(m => Math.hypot(m.x - x, m.y - y) < nearPx);
    if (i >= 0) l.splice(i, 1);
    else {
      if (l.length >= MAX_MARKS) l.shift();
      l.push({ x, y });
    }
    if (window.Menu) window.Menu.requestSave();
  }
  const markers = () => list().map(m => ({ x: m.x, y: m.y, kind: 'mark' }));

  // --- Окно ---
  const css = document.createElement('style');
  css.textContent = `
    #worldmap { position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center;
      background: rgba(5, 8, 12, 0.78); }
    #worldmap .wm-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 12px 14px 10px; color: #e2e8f0;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6); display: flex; flex-direction: column; gap: 8px; }
    #worldmap .wm-head { display: flex; align-items: center; gap: 14px; }
    #worldmap h2 { margin: 0; font: 800 18px Arial; color: #fbbf24; letter-spacing: 1px; flex: 1; }
    #worldmap .wm-btn { font: 700 12px Arial; padding: 5px 10px; border-radius: 6px; border: 1px solid #475569; background: #1e293b;
      color: #e2e8f0; cursor: pointer; }
    #worldmap .wm-btn:hover { border-color: #94a3b8; }
    #worldmap canvas { display: block; border-radius: 8px; cursor: crosshair; background: #0a0f16; }
    #worldmap .wm-hint { font: 600 12px Arial; color: #94a3b8; display: flex; gap: 16px; flex-wrap: wrap; }
    #worldmap .wm-hint b { color: #e2e8f0; }`;
  document.head.appendChild(css);
  const win = document.createElement('div');
  win.id = 'worldmap';
  win.innerHTML = `<div class="wm-box"><div class="wm-head"><h2></h2><button class="wm-btn" id="wm-radar"></button>` +
    `<button class="wm-btn" id="wm-close"></button></div><canvas id="wm-canvas"></canvas><div class="wm-hint"></div></div>`;
  document.body.appendChild(win);
  const canvas = win.querySelector('#wm-canvas');
  const g = canvas.getContext('2d');
  // Клики по окну — не выстрелы (окно ловит mousedown для стрельбы)
  win.addEventListener('mousedown', e => e.stopPropagation());
  win.addEventListener('click', e => { if (e.target === win) close(); });
  win.querySelector('#wm-close').addEventListener('click', close);
  win.querySelector('#wm-radar').addEventListener('click', () => { if (window.Minimap) window.Minimap.toggle(); refreshTexts(); });
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    const k = canvas.width / WORLD_WIDTH;
    const x = (e.clientX - r.left) * (canvas.width / r.width) / k, y = (e.clientY - r.top) * (canvas.height / r.height) / k;
    toggleMark(x, y, 14 / k);
  });

  function refreshTexts() {
    const names = { city: L('НОВОХМУРИНСК', 'NOVOKHMURINSK'), promzona: L('ПРОМЗОНА', 'PROMZONA'), basement: L('ЛОГОВО', 'LAIR') };
    win.querySelector('h2').textContent = L('КАРТА — ', 'MAP — ') + (names[currentLocation] || currentLocation);
    win.querySelector('#wm-close').textContent = L('ЗАКРЫТЬ [M]', 'CLOSE [M]');
    const mm = window.Minimap ? window.Minimap.mode() : 0;
    win.querySelector('#wm-radar').textContent = L(`Радар: ${['мелко', 'крупно', 'спрятан'][mm]}`, `Radar: ${['small', 'large', 'hidden'][mm]}`);
    win.querySelector('.wm-hint').innerHTML = L(
      '<span><b>ЛКМ</b> — поставить метку, клик по метке — убрать (до 5)</span><span><b>Туман</b> — где ещё не были</span>' +
      '<span><b>●</b> тайник не обыскан, <b style="color:#64748b">●</b> обыскан</span>',
      '<span><b>LMB</b> — place a marker, click a marker to remove it (up to 5)</span><span><b>Fog</b> — where you have not been yet</span>' +
      '<span><b>●</b> unsearched stash, <b style="color:#64748b">●</b> searched</span>');
  }

  function isShown() { return gameState === 'MAP'; }
  function open() {
    if (gameState !== 'PLAYING' || currentLocation === 'basement') return;
    gameState = 'MAP';
    for (const k in keys) keys[k] = false;
    mouseDown = false;
    refreshTexts();
    win.style.display = 'flex';
    draw();
  }
  function close() {
    if (!isShown()) return;
    win.style.display = 'none';
    gameState = 'PLAYING';
  }
  function toggle() { if (isShown()) close(); else open(); }

  // --- Названия районов: клетки по районам, связные куски — подпись в середине каждого ---
  let labelKey = '', labels = [];
  function buildLabels() {
    const n = 24, step = WORLD_WIDTH / n, ids = new Array(n * n), seen = new Uint8Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) ids[j * n + i] = getDistrictAt((i + 0.5) * step, (j + 0.5) * step).id;
    const out = [];
    for (let s = 0; s < n * n; s++) {
      if (seen[s]) continue;
      const id = ids[s], stack = [s]; let sx = 0, sy = 0, cnt = 0;
      seen[s] = 1;
      while (stack.length) {
        const c = stack.pop(), i = c % n, j = (c - i) / n;
        sx += i + 0.5; sy += j + 0.5; cnt++;
        [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].forEach(([a, b]) => {
          if (a < 0 || b < 0 || a >= n || b >= n) return;
          const d = b * n + a;
          if (!seen[d] && ids[d] === id) { seen[d] = 1; stack.push(d); }
        });
      }
      if (cnt < 4 || id === 'hub') continue;
      const dist = (currentLocation === 'promzona' ? PROMZONA_DISTRICTS : DISTRICTS)[id];
      if (!dist) continue;
      const name = L(dist.name_ru, dist.name_en).replace(/^[^\wА-Яа-яЁё]+\s*/u, '');
      out.push({ x: sx / cnt * step, y: sy / cnt * step, name, color: dist.color || '#94a3b8' });
    }
    return out;
  }

  // --- Отрисовка окна ---
  function draw() {
    const S = Math.max(360, Math.min(Math.floor(innerHeight * 0.82), Math.floor(innerWidth * 0.86), 860));
    if (canvas.width !== S) { canvas.width = canvas.height = S; canvas.style.width = canvas.style.height = S + 'px'; }
    const k = S / WORLD_WIDTH;
    const toMap = (x, y) => [x * k, y * k];
    const a = grid();
    g.clearRect(0, 0, S, S);
    const img = window.Minimap && window.Minimap.staticImage();
    if (img) g.drawImage(img, 0, 0, S, S);
    if (currentLocation === 'city') {
      const [sx, sy] = toMap(safeZone.x, safeZone.y);
      g.strokeStyle = 'rgba(16, 185, 129, 0.8)';
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(sx, sy, safeZone.radius * k, 0, Math.PI * 2); g.stroke();
    }
    // Тайники — только в открытых клетках
    containers.forEach(c => {
      if (!isOpen(a, c.x, c.y)) return;
      g.fillStyle = c.searched ? 'rgba(100, 116, 139, 0.75)' : '#f59e0b';
      g.beginPath(); g.arc(c.x * k, c.y * k, c.searched ? 1.6 : 2.4, 0, Math.PI * 2); g.fill();
    });
    // Туман
    const n = N(), cs = CELL * k;
    g.fillStyle = 'rgba(4, 7, 11, 0.93)';
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!a[j * n + i]) g.fillRect(i * cs, j * cs, cs + 0.5, cs + 0.5);
    // Названия районов
    const lk = currentLocation + '|' + currentLang;
    if (lk !== labelKey) { labelKey = lk; labels = buildLabels(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.max(10, Math.round(S / 70))}px Arial`;
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.75)';
    labels.forEach(l => {
      // Подпись — внутри карты, даже если район у самого края
      const w = g.measureText(l.name).width;
      const x = Math.max(w / 2 + 4, Math.min(S - w / 2 - 4, l.x * k)), y = Math.max(10, Math.min(S - 10, l.y * k));
      g.globalAlpha = isOpen(a, l.x, l.y) ? 0.9 : 0.45;
      g.strokeText(l.name, x, y); g.fillStyle = l.color; g.fillText(l.name, x, y);
    });
    g.globalAlpha = 1;
    // Рамка экрана
    g.strokeStyle = 'rgba(226, 232, 240, 0.5)'; g.lineWidth = 1;
    g.strokeRect(camera.x * k, camera.y * k, viewW * k, viewH * k);
    // Важные места и метки
    g.font = `${Math.max(12, Math.round(S / 46))}px "Segoe UI Emoji", Arial`;
    const ICON = window.Minimap ? window.Minimap.ICON : {};
    (window.Minimap ? window.Minimap.places() : []).forEach(([x, y, kind]) => g.fillText(ICON[kind] || '•', x * k, y * k));
    list().forEach(m => {
      g.fillStyle = '#fbbf24';
      g.beginPath(); g.arc(m.x * k, m.y * k, 4, 0, Math.PI * 2); g.fill();
      g.fillText('📍', m.x * k, m.y * k - 9);
    });
    // Игроки: товарищи, потом свой
    const me = localPlayer;
    players.filter(p => p !== me && !p.left).concat([me]).forEach(p => {
      const [x, y] = toMap(p.x, p.y);
      if (p.dead) { g.fillStyle = '#94a3b8'; g.font = '12px Arial'; g.fillText('✝', x, y); return; }
      g.fillStyle = COOP_COLORS[p.color] || '#e5e7eb';
      g.beginPath(); g.arc(x, y, p === me ? 5 : 4, 0, Math.PI * 2); g.fill();
      if (p === me) {
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(p.angle) * 12, y + Math.sin(p.angle) * 12); g.stroke();
      }
    });
  }

  // --- В мире: флажок на месте метки и стрелка у края экрана с расстоянием ---
  function drawMarks(ctx, t) {
    const l = list();
    if (!l.length || gameState !== 'PLAYING') return;
    ctx.save();
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    const pad = 46, cx = viewW / 2, cy = viewH / 2;
    l.forEach((m, i) => {
      const sx = m.x - camera.x, sy = m.y - camera.y;
      const onScreen = sx > pad && sx < viewW - pad && sy > pad && sy < viewH - pad;
      if (onScreen) {
        const bob = Math.sin(t / 160 + i) * 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 34 + bob); ctx.stroke();
        ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.moveTo(sx, sy - 34 + bob); ctx.lineTo(sx + 16, sy - 28 + bob); ctx.lineTo(sx, sy - 22 + bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(sx, sy + 2, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        return;
      }
      const a = Math.atan2(sy - cy, sx - cx);
      const kx = (viewW / 2 - pad) / Math.abs(Math.cos(a) || 1e-6), ky = (viewH / 2 - pad) / Math.abs(Math.sin(a) || 1e-6);
      const d = Math.min(kx, ky), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-9, -12); ctx.lineTo(-4, 0); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      const meters = Math.round(Math.hypot(m.x - localPlayer.x, m.y - localPlayer.y) / PX_PER_M);
      ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      const label = `📍 ${meters} ${L('м', 'm')}`;
      const lx = x - Math.cos(a) * 34, ly = y - Math.sin(a) * 26 + 4;
      ctx.strokeText(label, lx, ly); ctx.fillStyle = '#fde68a'; ctx.fillText(label, lx, ly);
    });
    ctx.restore();
  }

  // Каждый кадр (game.js render): туман открывается вокруг игроков, в окне — перерисовка
  function frame(ctx) {
    if (gameState === 'MENU' || currentLocation === 'basement') return;
    tick++;
    const a = grid();   // сетка локации (и старое сохранение — вокруг обысканных тайников) — сразу
    if (tick % 30 === 0) players.forEach(p => { if (!p.left && !p.dead) reveal(a, p.x, p.y, REVEAL); });
    drawMarks(ctx, performance.now());
    if (isShown()) draw();
  }

  return { saveState, loadState, toggle, open, close, isOpen: isShown, markers, frame };
})();
