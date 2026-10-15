// Новохмуринск после спасения (docs/LEVEL2_PROMZONA.md, раздел 7): пятеро выживших из обороны у пролома
// обживаются в городе. Их нет, пока оборона не пройдена (Defense.stage === 'done'), — Василий видит их,
// когда впервые возвращается из Промзоны.
//   - Пост у пролома: Степаныч и Зина за баррикадой из мешков. Время от времени из Промзоны в пролом
//     пролезает жаба, и они её отстреливают — живая сценка: Василий может помочь, может пройти мимо.
//   - Мастерская: Толик у верстака во дворе к юго-западу от перекрёстка Михалыча, искрит сваркой.
//   - Столовая: Лена у котла на костре во дворе к северо-востоку от перекрёстка.
//   - Серёга, оправившийся после ранения, бродит между ними (ещё прихрамывает).
// С каждым можно поговорить (E): реплика облачком над головой. Окна мастерской и столовой — следующий шаг.
// Модели — те же, что в обороне (src/three_survivors.js), мешки баррикады — оттуда же (Defense.drawPiece).
// Скрипты обычные, без модулей: player, enemies, currentLocation, SoundFX и прочее — из game.js.
window.Settlers = (function () {
  const L = (r, e) => (currentLang === 'ru' ? r : e);

  // Пролом в верхнем заборе города (fenceBreach) и дуга мешков с городской стороны: проход посередине
  const POST = { x: 5555, y: 40 };
  const POST_R = 200;
  const POST_BAGS = [28, 44, 60, 120, 136, 152];   // градусы от востока, 90 — юг (к городу)
  // Дворы у перекрёстка Михалыча: свободные места, дома сюда не ставятся (generateWorld — 390 px от центра)
  const WORKSHOP = { x: 2610, y: 3330 };
  const CANTEEN = { x: 3330, y: 2690 };
  // Где бродит Серёга: от столовой к перекрёстку и обратно
  const ROUTE = [[3262, 2790], [3175, 2860], [3172, 3010], [3290, 2905]];
  const TALK_R = 78;                 // как близко подойти, чтобы заговорить
  const CRAWL_FIRST = 60 * 6;        // первая жаба в пролом — вскоре после возвращения
  const CRAWL_GAP = [60 * 70, 60 * 110];
  const CRAWL_NEAR = 1500;           // жабы лезут, только когда Василий недалеко от поста — для него сценка

  const postSpot = (deg, r) => {
    const a = deg * Math.PI / 180;
    return [POST.x + Math.cos(a) * r, POST.y + Math.sin(a) * r * GROUND_SQUASH];
  };
  // Кто где: at — точка, angle — куда смотрит (0 — восток, π/2 — юг), pose — поза на месте
  const SPOTS = {
    stepanych: { at: postSpot(66, 300), post: true },
    zina: { at: postSpot(114, 300), post: true },
    tolik: { at: [WORKSHOP.x + 72, WORKSHOP.y + 10], angle: Math.PI },
    lena: { at: [CANTEEN.x + 60, CANTEEN.y + 8], angle: Math.PI, pose: 'heal' },
    seryoga: { at: ROUTE[0], walker: true }
  };

  // Реплики — по кругу, по одной на каждое «E»
  const LINES = {
    stepanych: [
      ['Стоим, Василий. Сунется жаба в дыру — получит дуплетом.', 'We\'re holding, Vasiliy. A toad pokes through that hole — it gets both barrels.'],
      ['Тридцать лет в литейке отстоял, теперь вот забор стерегу. Ничего, тоже работа.', 'Thirty years in the foundry, now I guard a fence. Still a job.'],
      ['Ты на заводе осторожнее. Долбильщик этот — уже не человек.', 'Careful at the plant. That Pounder isn\'t human anymore.']
    ],
    zina: [
      ['Пропуск предъявляем! …Шучу, проходи.', 'Pass, please! …Kidding, go on through.'],
      ['Двадцать лет на проходной — мимо меня ни одна жаба не прошмыгнёт.', 'Twenty years at the gate — no toad slips past me.'],
      ['Наган ещё дедов. Старый, а не подводит — как я.', 'This revolver was my granddad\'s. Old, but reliable — like me.']
    ],
    tolik: [
      ['Обустраиваю мастерскую. Скоро стволы тебе подшаманю.', 'Setting up a workshop. Soon I\'ll tune up your guns.'],
      ['Принеси с завода цветмета — сварю что хочешь, хоть танк.', 'Bring me nonferrous metal from the plant — I\'ll weld you anything, even a tank.'],
      ['Чертежи в заводских сейфах лежат. Найдёшь — соберём такое, что жабы обквакаются.', 'Blueprints are in the plant\'s safes. Find them and we\'ll build something the toads will croak at.']
    ],
    lena: [
      ['Кухню развернула. Скоро и похлёбку сварим, и настойки.', 'Kitchen\'s set up. Soon there\'ll be soup and tinctures.'],
      ['Из жабьих лапок, между прочим, бульон наваристый. Не морщись.', 'Toad legs make a hearty broth, you know. Don\'t make that face.'],
      ['Береги себя, Василий. Бинтов мало, а ты у нас один.', 'Take care of yourself, Vasiliy. Bandages are scarce, and there\'s only one of you.']
    ],
    seryoga: [
      ['Нога почти не болит. Спасибо, что перевязал тогда.', 'My leg barely hurts now. Thanks for patching me up back then.'],
      ['Я в ночную видел: градирня светилась фиолетовым. Думал, мерещится…', 'On a night shift I saw the cooling tower glowing purple. Thought I was seeing things…'],
      ['Михалыч говорит, ты Мясника битой уложил. Правда, что ли?', 'Mikhalych says you took down the Butcher with a bat. For real?'],
      ['Степаныч ворчит, а сам по ночам жаб считает — не спит.', 'Stepanych grumbles, but he counts toads all night — never sleeps.']
    ]
  };

  let settlers = [], shots = [], bubble = null;
  let greeted = false, greetT = 0, crawlT = CRAWL_FIRST, weldT = 0, obstaclesPlaced = false;

  const active = () => currentLocation === 'city' && !!window.Defense && window.Defense.stage === 'done';

  // --- Сохранение: видел ли Василий город после спасения (приветствие — один раз) ---
  function saveState() {
    return { greeted };
  }
  function loadState(v) {
    greeted = !!(v && v.greeted);
    greetT = 0;
    crawlT = CRAWL_FIRST;
  }

  function spawn() {
    const defs = window.Defense.SURVIVORS;
    settlers = defs.map(def => {
      const sp = SPOTS[def.id];
      const [x, y] = sp.at;
      const angle = sp.post ? Math.atan2(POST.y + 60 - y, POST.x - x) : (sp.angle || Math.PI / 2);
      return { def, sp, x, y, angle, home: angle, t: Math.random() * 100, phase: Math.random() * 6, moving: false, dist: 0,
        aimT: 0, kick: 0, cd: 30 + Math.random() * 60, talkT: 0, line: 0, wp: 0, waitT: 60 + Math.random() * 120 };
    });
  }

  // --- Обновление ---
  function update() {
    if (!active()) {
      if (settlers.length) settlers = [];
      bubble = null;
      if (obstaclesPlaced && currentLocation === 'city') buildObstacles();
      return;
    }
    // Оборона прошла уже после того, как мир города собран (или загрузка): мешки и верстак — в препятствия
    if (!obstaclesPlaced) buildObstacles();
    if (!settlers.length) spawn();
    // Модели обычно уже загружены экраном загрузки; повторный вызов ничего не делает
    if (window.threeSurvivors) window.threeSurvivors.load();
    if (!greeted && ++greetT > 60 * 3) {
      greeted = true;
      showToast(L('НОВОХМУРИНСК ОЖИЛ', 'NOVOKHMURINSK IS ALIVE'),
        L('Спасённые обжились: пост у пролома, мастерская Толика, столовая Лены.', 'The rescued settled in: a post at the breach, Tolik\'s workshop, Lena\'s canteen.'));
      if (window.Menu) window.Menu.requestSave();
    }
    updateCrawlers();
    settlers.forEach(updateSettler);
    for (let i = shots.length - 1; i >= 0; i--) if (--shots[i].life <= 0) shots.splice(i, 1);
    if (bubble && --bubble.t <= 0) bubble = null;
    updateWelding();
  }

  // Жаба из Промзоны пролезает в пролом: обычная жаба, в счётчики и сохранение не идёт (summon)
  function updateCrawlers() {
    if (fenceBreach.state !== 'open') return;
    if (Math.hypot(player.x - POST.x, player.y - POST.y) > CRAWL_NEAR) return;
    if (--crawlT > 0) return;
    crawlT = CRAWL_GAP[0] + Math.random() * (CRAWL_GAP[1] - CRAWL_GAP[0]);
    const n = Math.random() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x = POST.x - 25 + Math.random() * 50, y = POST.y + 30 + i * 18;
      const hp = Math.round(140 * ENEMY_HP_SCALE);
      enemies.push({
        x, y, startX: x, startY: y, bounds: { x1: 4300, y1: 60, x2: 5950, y2: 1500 },
        districtId: 'nest', tier: 2, radius: 22, hp, maxHp: hp, speed: 2.4, type: 'grunt', color: '#22c55e',
        armor: 0, throwCooldown: 200, aggroRadius: 900, isAggroed: true, hitFlash: 0,
        patrolAngle: Math.PI / 2, patrolTimer: 90, shootCooldown: 90 + Math.random() * 60, summon: true, crawler: true
      });
    }
    createParticles(POST.x, POST.y + 40, '#6b7280', 14);
    const zina = settlers.find(s => s.def.id === 'zina');
    if (zina) say(zina, L('Лезут! К бою!', 'Incoming! To arms!'), 120);
  }

  function nearestToad(s, range) {
    let best = null, bd = range;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp <= 0 || e.type === 'boss' || e.type === 'pounder') continue;
      const d = Math.hypot(e.x - s.x, e.y - s.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function face(s, x, y) {
    s.angle = Math.atan2(y - s.y, x - s.x);
  }

  // Выстрел с поста — как в обороне: трассер, вспышка, попадание чаще, чем промах
  function shoot(s, e) {
    const w = s.def.weapon;
    face(s, e.x, e.y);
    s.aimT = 40;
    const ts = window.threeSurvivors;
    const m3 = ts && ts.ready(s.def.id) && ts.muzzle(s.def.id, 'aim', s.angle);
    const m = m3 ? { x: s.x + m3.x, y: s.y + m3.y } : { x: s.x, y: s.y - 50 };
    const hit = Math.random() < 0.75;
    const tx = e.x + (hit ? 0 : (Math.random() - 0.5) * 70), ty = e.y - 20 + (hit ? 0 : (Math.random() - 0.5) * 50);
    shots.push({ x1: m.x, y1: m.y, x2: tx, y2: ty, life: 5, maxLife: 5, color: w.color });
    muzzleFlashes.push({ x: m.x, y: m.y, angle: Math.atan2(ty - m.y, tx - m.x), type: w.flash, life: 4, maxLife: 4, scale: 0.7 });
    s.kick = 8;
    if (hit) {
      const r = damageEnemy(e, w.dmg, 'survivor', s.x, s.y);
      e.hitFlash = 5;
      addFloatingText(e.x, e.y - 24, `-${Math.round(r.dealt)}`, '#fde68a');
    }
    if (enemySoundVolume(s.x, s.y) > 0.3) (w.flash === 'shotgun' ? SoundFX.shotgun : SoundFX.makarov).call(SoundFX);
  }

  function updateSettler(s) {
    s.t++;
    if (s.kick > 0) s.kick--;
    if (s.aimT > 0) s.aimT--;
    // Разговор: повернуться к Василию и постоять
    if (s.talkT > 0) {
      s.talkT--;
      s.moving = false;
      if (!s.sp.pose) face(s, player.x, player.y);
      if (s.talkT === 0) s.angle = s.home;
      return;
    }
    if (s.sp.post) {
      const e = nearestToad(s, s.def.weapon.range);
      if (e) {
        face(s, e.x, e.y);
        s.aimT = 40;
        if ((s.cd -= 1) <= 0) {
          shoot(s, e);
          s.cd = s.def.weapon.cd + Math.random() * 20;
        }
      } else if (s.aimT <= 0 && s.t % 300 === 0) {
        // Оглядывает пролом
        s.angle = s.home + (Math.random() - 0.5) * 0.9;
      }
      return;
    }
    if (s.sp.walker) {
      if (s.waitT > 0) {
        s.waitT--;
        s.moving = false;
        if (s.waitT % 200 === 0) s.angle = Math.random() * Math.PI * 2;
        return;
      }
      const [tx, ty] = ROUTE[s.wp];
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      if (d < 3) {
        s.wp = (s.wp + 1 + Math.floor(Math.random() * (ROUTE.length - 1))) % ROUTE.length;
        s.waitT = 60 * (3 + Math.random() * 5);
        s.moving = false;
        return;
      }
      const step = Math.min(1.1, d);
      s.x += dx / d * step;
      s.y += dy / d * step;
      s.dist += step;
      s.angle = Math.atan2(dy, dx);
      s.moving = true;
    }
  }

  // Сварка у Толика: вспышки по несколько секунд, искры с верстака
  const weldPoint = () => ({ x: WORKSHOP.x + 30, y: WORKSHOP.y - 30 });
  function updateWelding() {
    weldT = (weldT + 1) % 360;
    const tolik = settlers.find(s => s.def.id === 'tolik');
    if (!tolik || tolik.talkT > 0 || !welding()) return;
    if (Math.hypot(player.x - WORKSHOP.x, player.y - WORKSHOP.y) > 1100) return;
    const p = weldPoint();
    if (Math.random() < 0.5) spawnDirectionalSparks(p.x, p.y, -Math.PI / 2 + (Math.random() - 0.5), 1.8, 2, '#fef9c3', 2, 8, 10);
  }
  const welding = () => weldT < 150 && (weldT % 50) < 38;

  // --- Разговор ---
  function say(s, text, t = 60 * 4.5) {
    bubble = { s, text, t, max: t };
  }

  // Ближайший, с кем можно заговорить (game.js: E)
  function nearest() {
    if (!active()) return null;
    let best = null, bd = TALK_R;
    settlers.forEach(s => {
      const d = Math.hypot(player.x - s.x, player.y - s.y);
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }

  function prompt(s) {
    return L(`[E] — поговорить: ${s.def.name[0]}`, `[E] — talk: ${s.def.name[1]}`);
  }

  function talk(s) {
    const lines = LINES[s.def.id];
    const [ru, en] = lines[s.line % lines.length];
    s.line++;
    s.talkT = 60 * 4.5;
    say(s, L(ru, en));
  }

  // --- Отрисовка ---
  const shade = (ctx, x, y, rx, ry, a = 0.28) => {
    ctx.fillStyle = `rgba(0, 0, 0, ${a})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Табличка на столбе: фанера, надпись краской
  function drawSign(ctx, x, y, text) {
    ctx.save();
    shade(ctx, x, y + 2, 12, 4);
    ctx.fillStyle = '#3f2d1c';
    ctx.fillRect(x - 3, y - 70, 6, 72);
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    const w = ctx.measureText(text).width + 18;
    ctx.translate(x, y - 74);
    ctx.rotate(-0.04);
    ctx.fillStyle = '#a07a4c';
    ctx.strokeStyle = '#1c1710';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -22, w, 24);
    ctx.strokeRect(-w / 2, -22, w, 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(-w / 2 + 2, -20, w - 4, 4);
    ctx.fillStyle = '#7f1d1d';
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, -5);
    ctx.restore();
  }

  // Верстак: столешница из досок, тиски, железки; рядом баллоны и ящики
  function drawWorkbench(ctx) {
    const x = WORKSHOP.x, y = WORKSHOP.y;
    ctx.save();
    shade(ctx, x, y + 4, 62, 14);
    ctx.strokeStyle = '#1c1710';
    ctx.lineWidth = 2;
    // Ножки
    ctx.fillStyle = '#2b2118';
    [[-46, 0], [42, 0], [-40, -14], [36, -14]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy - 26, 6, 28));
    // Столешница
    ctx.fillStyle = '#7c5a36';
    ctx.beginPath();
    ctx.moveTo(x - 54, y - 26);
    ctx.lineTo(x + 50, y - 26);
    ctx.lineTo(x + 44, y - 46);
    ctx.lineTo(x - 48, y - 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5b3f22';
    ctx.fillRect(x - 54, y - 26, 104, 7);
    ctx.strokeRect(x - 54, y - 26, 104, 7);
    ctx.strokeStyle = 'rgba(28, 23, 16, 0.5)';
    ctx.lineWidth = 1;
    [-33, -39].forEach(yy => { ctx.beginPath(); ctx.moveTo(x - 50, y + yy); ctx.lineTo(x + 46, y + yy); ctx.stroke(); });
    // Тиски на левом краю
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x - 46, y - 56, 16, 12);
    ctx.strokeRect(x - 46, y - 56, 16, 12);
    ctx.fillRect(x - 50, y - 50, 24, 4);
    // Лист железа и молоток
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 30);
    ctx.lineTo(x + 40, y - 31);
    ctx.lineTo(x + 36, y - 43);
    ctx.lineTo(x + 6, y - 41);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 31);
    ctx.lineTo(x - 2, y - 38);
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 25, y - 36, 8, 8);
    // Сварочная вспышка: белое пятно и голубой ореол на всё вокруг
    if (welding() && settlers.some(s => s.def.id === 'tolik' && s.talkT === 0)) {
      const p = weldPoint(), k = 0.6 + Math.random() * 0.4;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90);
      g.addColorStop(0, `rgba(219, 234, 254, ${0.75 * k})`);
      g.addColorStop(0.2, `rgba(147, 197, 253, ${0.3 * k})`);
      g.addColorStop(1, 'rgba(147, 197, 253, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 90, p.y - 90, 180, 180);
    }
    ctx.restore();
  }

  // Газовые баллоны у верстака: кислород (синий) и пропан (красный)
  function drawCylinders(ctx) {
    const x = WORKSHOP.x - 78, y = WORKSHOP.y + 2;
    ctx.save();
    shade(ctx, x + 10, y + 2, 26, 7);
    [[0, '#1d4ed8'], [20, '#b91c1c']].forEach(([dx, c]) => {
      ctx.fillStyle = c;
      ctx.strokeStyle = '#0b0f17';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(x + dx - 7, y - 58, 14, 58, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(x + dx - 4, y - 52, 3, 46);
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(x + dx - 3, y - 64, 6, 7);
    });
    ctx.restore();
  }

  // Ящики с барахлом за верстаком — военторговские, как в баррикаде обороны
  function drawCrates(ctx) {
    const tp = window.threeProps;
    const f = tp && tp.isLoaded.military_crate && tp.getFrameCanvas('military_crate', 2);
    if (!f) return;
    const x = WORKSHOP.x - 40, y = WORKSHOP.y - 62;
    ctx.save();
    shade(ctx, x + 24, y + 4, 50, 13);
    ctx.drawImage(f, x - 30, y - 52, 68, 68);
    ctx.drawImage(f, x + 22, y - 50, 68, 68);
    ctx.drawImage(f, x - 4, y - 78, 68, 68);
    ctx.restore();
  }

  // Полевая кухня: костёр в кольце камней, котёл на треноге, пар; рядом ящик с мисками
  function drawKitchen(ctx) {
    const x = CANTEEN.x, y = CANTEEN.y, now = performance.now() / 1000;
    ctx.save();
    // Отсвет костра на земле
    ctx.globalCompositeOperation = 'lighter';
    const flick = 0.85 + Math.sin(now * 13) * 0.08 + Math.sin(now * 7.3) * 0.07;
    const glow = ctx.createRadialGradient(x, y - 4, 0, x, y - 4, 150);
    glow.addColorStop(0, `rgba(251, 146, 60, ${0.32 * flick})`);
    glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 150, 150 * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Камни
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      ctx.fillStyle = i % 2 ? '#57534e' : '#78716c';
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 30, y + Math.sin(a) * 30 * GROUND_SQUASH, 8, 5.5, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Поленья и огонь
    ctx.fillStyle = '#3f2d1c';
    ctx.fillRect(x - 18, y - 4, 36, 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.5);
    ctx.fillRect(-16, -3, 32, 6);
    ctx.restore();
    [['#f97316', 18, 34], ['#facc15', 11, 24], ['#fef3c7', 5, 12]].forEach(([c, w, h], k) => {
      ctx.fillStyle = c;
      for (let i = -1; i <= 1; i++) {
        const hh = h * (0.75 + 0.25 * Math.sin(now * (9 + i * 2 + k) + i * 1.7));
        const fx = x + i * w * 0.55;
        ctx.beginPath();
        ctx.moveTo(fx - w / 2, y);
        ctx.quadraticCurveTo(fx - w * 0.35, y - hh * 0.6, fx + Math.sin(now * 6 + i) * 3, y - hh);
        ctx.quadraticCurveTo(fx + w * 0.35, y - hh * 0.6, fx + w / 2, y);
        ctx.closePath();
        ctx.fill();
      }
    });
    // Тренога и котёл
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    [[-34, 6], [34, 6], [0, -16]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x, y - 74);
      ctx.stroke();
    });
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 74);
    ctx.lineTo(x, y - 50);
    ctx.stroke();
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#030712';
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 42);
    ctx.quadraticCurveTo(x - 24, y - 14, x, y - 14);
    ctx.quadraticCurveTo(x + 24, y - 14, x + 24, y - 42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(251, 146, 60, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y - 17, 14, 3, 0, 0, Math.PI);
    ctx.fill();
    // Варево: бурое, побулькивает
    ctx.fillStyle = '#6b4f1d';
    ctx.beginPath();
    ctx.ellipse(x, y - 42, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const p = (now * 0.9 + i / 3) % 1;
      ctx.fillStyle = `rgba(190, 160, 90, ${1 - p})`;
      ctx.beginPath();
      ctx.arc(x - 12 + i * 11, y - 42 + Math.sin(i * 2.1) * 2, 1.5 + p * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Пар
    for (let i = 0; i < 4; i++) {
      const p = (now * 0.35 + i / 4) % 1;
      ctx.fillStyle = `rgba(226, 232, 240, ${0.22 * (1 - p)})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(now + i * 1.9) * 10 + p * 14, y - 48 - p * 70, 6 + p * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Ящик-стол с мисками и половником
  function drawBowls(ctx) {
    const x = CANTEEN.x - 82, y = CANTEEN.y - 16;
    ctx.save();
    shade(ctx, x, y + 3, 30, 8);
    ctx.fillStyle = '#8b6b3e';
    ctx.strokeStyle = '#1c1710';
    ctx.lineWidth = 1.8;
    ctx.fillRect(x - 26, y - 26, 52, 26);
    ctx.strokeRect(x - 26, y - 26, 52, 26);
    ctx.fillStyle = '#a3834e';
    ctx.fillRect(x - 26, y - 34, 52, 9);
    ctx.strokeRect(x - 26, y - 34, 52, 9);
    [[-14, '#cbd5e1'], [0, '#e2e8f0'], [14, '#cbd5e1']].forEach(([dx, c]) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x + dx, y - 33, 6, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  // Что стоит на местах — вперемешку с фигурами, по глубине: [y — где касается земли, рисовалка]
  function props() {
    return [
      [WORKSHOP.y, drawWorkbench], [WORKSHOP.y + 2, drawCylinders], [WORKSHOP.y - 62, drawCrates],
      [WORKSHOP.y - 70, ctx => drawSign(ctx, WORKSHOP.x + 70, WORKSHOP.y - 70, L('МАСТЕРСКАЯ', 'WORKSHOP'))],
      [CANTEEN.y, drawKitchen], [CANTEEN.y - 16, drawBowls],
      [CANTEEN.y - 70, ctx => drawSign(ctx, CANTEEN.x + 66, CANTEEN.y - 74, L('СТОЛОВАЯ', 'CANTEEN'))],
      [POST.y + 165, ctx => drawSign(ctx, POST.x - 235, POST.y + 165, L('ПОСТ', 'POST'))]
    ];
  }

  // 3D-кадр: поза по состоянию
  function sprite3d(s) {
    const ts = window.threeSurvivors, id = s.def.id;
    if (!ts || !ts.ready(id)) return null;
    if (id === 'seryoga') return ts.sprite(id, 'limp', s.angle, s.moving ? ts.stepFrame(s.dist) : 0);
    if (s.sp.pose === 'heal') return ts.sprite(id, 'heal', s.angle, Math.floor(s.t / 12));
    if (s.moving) return ts.sprite(id, 'walk', s.angle, ts.stepFrame(s.dist));
    const pose = !s.def.weapon ? 'idle' : s.kick > 3 ? 'fire' : s.aimT > 0 ? 'aim' : 'idle';
    return ts.sprite(id, pose, s.angle);
  }

  const figureH = s => (s.sp.pose === 'heal' ? 50 : 76);

  function drawSettler(ctx, s) {
    const sp = sprite3d(s);
    if (!sp) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    shade(ctx, 0, 1, 15, 6, 0.26);
    if (!s.moving) ctx.scale(1, 1 + Math.sin(s.t * 0.055 + s.phase) * 0.01);
    ctx.drawImage(sp.frame, sp.ox, sp.oy, sp.size, sp.size);
    ctx.restore();
  }

  // front = false — всё, что за Василием (выше по экрану), true — перед ним
  function drawActors(ctx, front) {
    if (!active()) return;
    const py = player.y;
    const items = props().filter(([y]) => (y > py) === front);
    settlers.forEach(s => { if ((s.y > py) === front) items.push([s.y, c => drawSettler(c, s)]); });
    items.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw(ctx));
  }

  // Мешки поста — низкие, под фигурами
  function drawGround(ctx) {
    if (!active()) return;
    POST_BAGS.map(deg => {
      const [x, y] = postSpot(deg, POST_R);
      const a = deg * Math.PI / 180;
      return { x, y, kind: deg === 44 || deg === 136 ? 'crates' : 'bags', tan: Math.atan2(Math.cos(a) * GROUND_SQUASH, -Math.sin(a)) };
    }).sort((a, b) => a.y - b.y).forEach(p => window.Defense.drawPiece(ctx, p));
  }

  function drawShots(ctx) {
    shots.forEach(sh => {
      ctx.save();
      ctx.globalAlpha = sh.life / sh.maxLife;
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sh.x1, sh.y1);
      ctx.lineTo(sh.x2, sh.y2);
      ctx.stroke();
      ctx.restore();
    });
  }

  // Облачко с репликой над головой — поверх всего
  function drawBubble(ctx) {
    if (!bubble || !active()) return;
    const s = bubble.s;
    const a = Math.min(1, bubble.t / 20, (bubble.max - bubble.t) / 8);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    // Перенос по словам — не шире 230 px
    const words = bubble.text.split(' '), lines = [];
    let cur = '';
    words.forEach(w => {
      const next = cur ? cur + ' ' + w : w;
      if (ctx.measureText(next).width > 230 && cur) { lines.push(cur); cur = w; } else cur = next;
    });
    if (cur) lines.push(cur);
    const name = L(s.def.name[0], s.def.name[1]);
    const w = Math.max(ctx.measureText(name).width, ...lines.map(l => ctx.measureText(l).width)) + 20;
    const h = 22 + lines.length * 15;
    const bx = s.x - w / 2, by = s.y - figureH(s) - 18 - h;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - 7, by + h);
    ctx.lineTo(s.x, by + h + 9);
    ctx.lineTo(s.x + 7, by + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    ctx.fillText(name, bx + 10, by + 15);
    ctx.fillStyle = '#e2e8f0';
    lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 31 + i * 15));
    ctx.restore();
  }

  // Для перерисовки деревьев и фонарей перед фигурами (environment.drawOccludingProps)
  function addActors(actors) {
    if (!active()) return;
    settlers.forEach(s => actors.push({ x: s.x, y: s.y, h: figureH(s) }));
  }

  // Отбрасываемые тени (game.js collectActorShadows)
  function addShadows(list) {
    if (!active()) return;
    settlers.forEach(s => {
      const sp = sprite3d(s);
      if (sp) list.push({ img: sp.frame, x: s.x + sp.ox, y: s.y + sp.oy, w: sp.size, h: sp.size });
    });
  }

  // Мешки, верстак, костёр и стоящие на местах — препятствия (game.js buildObstacles)
  function addObstacles() {
    obstaclesPlaced = active();
    if (!obstaclesPlaced) return;
    POST_BAGS.forEach(deg => {
      const [x, y] = postSpot(deg, POST_R);
      const a = deg * Math.PI / 180;
      addObstacle({ x, y, rx: 44, ry: 16, rot: Math.atan2(Math.cos(a) * GROUND_SQUASH, -Math.sin(a)) });
    });
    [
      [WORKSHOP.x, WORKSHOP.y - 18, 56, 22], [WORKSHOP.x - 68, WORKSHOP.y - 2, 22, 10], [WORKSHOP.x - 10, WORKSHOP.y - 66, 52, 18],
      [CANTEEN.x, CANTEEN.y, 38, 22], [CANTEEN.x - 82, CANTEEN.y - 18, 28, 12]
    ].forEach(([x, y, rx, ry]) => addObstacle({ x, y, rx, ry, rot: 0 }));
    ['stepanych', 'zina', 'tolik', 'lena'].forEach(id => {
      const [x, y] = SPOTS[id].at;
      addObstacle({ x, y, rx: 13, ry: 9, rot: 0 });
    });
  }

  // Места поста, мастерской и столовой: деревья туда не ставятся (environment.scatterGreenery)
  const inArea = (x, y) => [[POST.x, POST.y + 120, 360], [WORKSHOP.x, WORKSHOP.y - 20, 190], [CANTEEN.x, CANTEEN.y - 10, 170]]
    .some(([cx, cy, r]) => Math.hypot(x - cx, (y - cy) / GROUND_SQUASH) < r);

  return { saveState, loadState, update, nearest, prompt, talk, drawGround, drawActors, drawShots, drawBubble,
    addActors, addShadows, addObstacles, inArea, get list() { return settlers; } };
})();
