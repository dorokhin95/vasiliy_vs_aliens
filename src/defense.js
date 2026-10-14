// Оборона у пролома (docs/LEVEL2_PROMZONA.md, раздел 1 и этап 5): первый раз в Промзоне Василий попадает
// за баррикаду у пролома, где пятеро последних выживших с завода держатся против жаб. Три волны с
// передышками, потом выжившие уходят в пролом — в зачищенный Новохмуринск, Василий прикрывает.
//   - Баррикада (мешки, ящики, бочки) — дугой вокруг пролома, остаётся и после обороны; для ходьбы — препятствие,
//     пули летят поверх.
//   - Выжившие не умирают. Они в 3D (src/three_survivors.js, tools/build_promzona_survivors_blender.py):
//     стоят, целятся и стреляют в сторону жабы, на отходе идут к пролому (Серёга ковыляет, прижав руку
//     к бедру), Лена на колене бинтует лежащего Серёгу. Пока модели грузятся (или если не загрузились) —
//     плоские фигуры из листа docs/comic_refs/survivors_comic_sheet.webp (tools/make_survivor_sprites.py),
//     которые двигаются по частям: ноги качаются от бедра, корпус дышит и отдаёт при выстреле.
//   - Жабы обороны — обычные жабы с пометкой defense: в счётчик жаб локации и в сохранение не идут.
// Скрипты обычные, без модулей: player, enemies, currentLocation, SoundFX и прочее — из game.js.
window.Defense = (function () {
  const L = (r, e) => (currentLang === 'ru' ? r : e);

  // Центр обороны и дуга баррикады: от запада через север к востоку, к пролому (юг) открыта
  const C = { x: 5440, y: 5700 };
  const R = 300;
  // [угол, градусы (0 — восток, 270 — север), что стоит]; через 15°, пропуски на 225° и 315° — проходы
  const PIECES = [
    [180, 'bags'], [195, 'crates'], [210, 'bags'], [240, 'bags'], [255, 'barrels'], [270, 'bags'], [285, 'crates'],
    [300, 'bags'], [330, 'bags'], [345, 'barrels'], [360, 'bags']
  ];
  const pieceAt = ([deg, kind]) => {
    const a = deg * Math.PI / 180;
    // Касательная к дуге на экране — так лежат мешки
    const tan = Math.atan2(Math.cos(a) * GROUND_SQUASH, -Math.sin(a));
    return { x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R * GROUND_SQUASH, kind, tan };
  };

  // Выжившие. hip — доля высоты спрайта, где бедро; gap — где щель между ногами; muzzle — дуло (доли);
  // weapon: урон, перезарядка (кадры), дальность, вспышка; spot — где стоит в обороне (угол и доля радиуса)
  const SURVIVORS = [
    { id: 'stepanych', name: ['Степаныч', 'Stepanych'], h: 96, hip: 0.58, gap: 0.31, muzzle: [0.969, 0.48],
      weapon: { dmg: 30, cd: 95, range: 520, flash: 'shotgun', color: '#fde68a' }, spot: [250, 0.72] },
    { id: 'zina', name: ['Зина', 'Zina'], h: 90, hip: 0.64, gap: 0.479, muzzle: [0.315, 0.717],
      weapon: { dmg: 12, cd: 45, range: 480, flash: 'makarov', color: '#fde68a' }, spot: [200, 0.74] },
    { id: 'tolik', name: ['Толик', 'Tolik'], h: 92, hip: 0.58, gap: 0.417, muzzle: [0.387, 0.641],
      weapon: { dmg: 22, splash: 12, cd: 140, range: 560, flash: 'shotgun', color: '#fb923c' }, spot: [305, 0.72] },
    { id: 'lena', name: ['Лена', 'Lena'], h: 86, hip: 0.64, gap: 0.444, medic: true, spot: [0, 0], at: [-158, 110] },
    { id: 'seryoga', name: ['Серёга', 'Seryoga'], h: 88, hip: 0.57, gap: 0.433, wounded: true, spot: [0, 0], at: [-175, 122] }
  ];
  const images = {};
  SURVIVORS.forEach(s => {
    const img = new Image();
    img.src = `assets/sprites/survivors/${s.id}.webp`;
    images[s.id] = img;
  });

  // Волны (docs/LEVEL2_PROMZONA.md, раздел 1): [тип, откуда — 'n' с севера или 'w' с запада]
  const WAVES = [
    [['grunt', 'n'], ['grunt', 'w'], ['grunt', 'n'], ['grunt', 'w'], ['grunt', 'n'], ['grunt', 'w']],
    [['grunt', 'n'], ['grunt', 'w'], ['stormtrooper', 'n'], ['grunt', 'n'], ['stormtrooper', 'w'], ['grunt', 'w']],
    [['stormtrooper', 'n'], ['brute', 'w'], ['stormtrooper', 'w']]
  ];
  const SPAWN_GAP = 40;          // кадров между жабами волны
  const KNEE_PX = 17;            // колено лежащего Серёги — восточнее его середины (3D-кадр «лёжа»)
  const PAUSE = 60 * 12;         // передышка между волнами
  const BREACH_OUT = 40;         // насколько за пролом уходят выжившие, px

  let stage = 'pending';         // pending — ещё не было; wave, pause, retreat — идёт; done — выжившие ушли
  let wave = 0, timer = 0, queue = [], survivors = [], shots = [], banner = null;

  // --- Состояние для сохранения: незаконченная оборона после загрузки начнётся сначала ---
  function saveState() {
    return stage === 'done' ? 'done' : 'pending';
  }
  function loadState(v, promzonaVisited) {
    // Старые сохранения, где Промзона уже пройдена, — без обороны
    stage = v === 'done' || (v === undefined && promzonaVisited) ? 'done' : 'pending';
    clearRun();
  }
  function clearRun() {
    wave = 0;
    timer = 0;
    queue = [];
    survivors = [];
    shots = [];
    setBanner('');
  }

  // Новый мир (generateWorld): незаконченная оборона сбрасывается, жабы обороны ушли вместе с миром
  function onWorld() {
    if (stage !== 'done') stage = 'pending';
    clearRun();
  }

  // Василий вошёл в Промзону (переход или загрузка): если обороны ещё не было — начинается
  function onEnter() {
    if (currentLocation !== 'promzona' || stage !== 'pending') return;
    stage = 'pause';
    wave = 0;
    timer = 60 * 4;           // пара секунд оглядеться до первой волны
    survivors = SURVIVORS.map(def => {
      let x, y;
      if (def.at) {
        x = fenceBreach.x + def.at[0];
        y = C.y + def.at[1];
      } else {
        const a = def.spot[0] * Math.PI / 180;
        x = C.x + Math.cos(a) * R * def.spot[1];
        y = C.y + Math.sin(a) * R * def.spot[1] * GROUND_SQUASH;
      }
      // angle — куда смотрит (как у жаб: 0 — восток, π/2 — юг); стрелки — от центра обороны наружу
      const angle = Math.atan2(y - C.y, x - C.x);
      return { def, x, y, facing: x < C.x ? -1 : 1, angle, lookout: angle, phase: Math.random() * 6, t: Math.random() * 100,
        moving: false, dist: 0, aimT: 0, firePause: 0, cd: 30 + Math.random() * 60, kick: 0, gone: false, alpha: 1, healCd: 300 };
    });
    // Серёга лежит головой на запад (кадр «лицом на восток»), Лена смотрит на его раненое колено
    const ser = survivors.find(s => s.def.wounded), lena = survivors.find(s => s.def.medic);
    if (ser) ser.angle = 0;
    if (ser && lena) lena.angle = Math.atan2(ser.y - lena.y, ser.x + KNEE_PX - lena.x);
    if (window.threeSurvivors) window.threeSurvivors.load();
    showToast(L('ОБОРОНА У ПРОЛОМА', 'HOLD THE BREACH'),
      L('Выжившие с завода держатся из последних сил. Помоги им отбиться!', 'The plant\'s last survivors are barely holding. Help them fight off the toads!'));
  }

  // Жаба обороны: обычная жаба района ★★, сразу идёт на Василия и не теряет его
  function makeToad(type, side) {
    const x = side === 'n' ? C.x - 250 + Math.random() * 500 : 4760;
    const y = side === 'n' ? 4760 : C.y - 260 + Math.random() * 300;
    const stats = {
      grunt: { radius: 22, hp: 140, speed: 2.72, color: '#22c55e' },
      brute: { radius: 34, hp: 380, speed: 1.8, color: '#a855f7' },
      stormtrooper: { radius: GUNNER_STATS.stormtrooper.radius, hp: GUNNER_STATS.stormtrooper.hp[2],
        speed: GUNNER_STATS.stormtrooper.speed, color: GUNNER_STATS.stormtrooper.color }
    }[type];
    const hp = Math.round(stats.hp * ENEMY_HP_SCALE);
    enemies.push({
      x, y, startX: x, startY: y, bounds: { x1: 4400, y1: 4400, x2: 5900, y2: 5900 },
      districtId: 'pz_breach', tier: 2, radius: stats.radius, hp, maxHp: hp, speed: stats.speed, type, color: stats.color,
      armor: type === 'brute' ? 0.6 : 0, throwCooldown: 200, aggroRadius: 3000, isAggroed: true, hitFlash: 0,
      patrolAngle: 0, patrolTimer: 90, shootCooldown: 60 + Math.random() * 60, defense: true
    });
  }

  const defenseToads = () => enemies.filter(e => e.defense);

  function setBanner(text) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'defense-banner';
      banner.style.cssText = 'position:absolute;top:96px;left:50%;transform:translateX(-50%);z-index:12;' +
        'background:rgba(12,16,24,0.9);border:1px solid #b45309;border-radius:8px;padding:5px 14px;' +
        'color:#fde68a;font:800 13px "Segoe UI",sans-serif;pointer-events:none;display:none;white-space:nowrap';
      (document.getElementById('game-container') || document.body).appendChild(banner);
    }
    banner.style.display = text ? 'block' : 'none';
    if (banner.textContent !== text) banner.textContent = text;
  }

  // Передышка: подбросить патронов к купленным стволам или бинт
  function dropSupplies() {
    const drop = [];
    if (player.unlockedWeapons.makarov) drop.push(['ammo_9x18', 12]);
    if (player.unlockedWeapons.shotgun) drop.push(['ammo_12g', 6]);
    drop.push(['bandage', 1]);
    drop.forEach(([type, val], i) => spawn3DLootItem(C.x - 40 + i * 40, C.y + 40, type, val));
    addFloatingText(C.x - 70, C.y + 10, L('Тут патроны, бери!', 'Ammo here, grab it!'), '#fde68a');
  }

  function update() {
    if (currentLocation !== 'promzona') return;
    survivors.forEach(updateSurvivor);
    for (let i = shots.length - 1; i >= 0; i--) if (--shots[i].life <= 0) shots.splice(i, 1);
    if (stage === 'pending' || stage === 'done') return;

    if (stage === 'pause') {
      if (--timer <= 0) {
        stage = 'wave';
        queue = WAVES[wave].slice();
        timer = 0;
        showToast(L(`ВОЛНА ${wave + 1} ИЗ ${WAVES.length}`, `WAVE ${wave + 1} OF ${WAVES.length}`),
          L('Жабы идут из цехов!', 'Toads are coming from the workshops!'));
      } else {
        setBanner(L(`🛡 Передышка — волна ${wave + 1} из ${WAVES.length} через ${Math.ceil(timer / 60)} с`,
          `🛡 Breather — wave ${wave + 1} of ${WAVES.length} in ${Math.ceil(timer / 60)}s`));
      }
      return;
    }
    if (stage === 'wave') {
      if (queue.length && --timer <= 0) {
        const [type, side] = queue.shift();
        makeToad(type, side);
        timer = SPAWN_GAP;
      }
      const left = defenseToads().length + queue.length;
      setBanner(L(`🛡 Волна ${wave + 1} из ${WAVES.length} · жаб: ${left}`, `🛡 Wave ${wave + 1} of ${WAVES.length} · toads: ${left}`));
      if (left === 0) {
        wave++;
        if (wave < WAVES.length) {
          stage = 'pause';
          timer = PAUSE;
          dropSupplies();
        } else {
          stage = 'retreat';
          survivors.forEach(s => { s.retreatDelay = Math.random() * 40; });
          // Пара догоняющих — прикрыть отход
          makeToad('grunt', 'n');
          makeToad('grunt', 'w');
          showToast(L('ОТХОДИМ!', 'FALL BACK!'), L('Выжившие уходят в пролом — прикрой их!', 'The survivors are leaving through the breach — cover them!'));
        }
      }
      return;
    }
    if (stage === 'retreat') {
      setBanner(L('🛡 Выжившие уходят в пролом — прикрой!', '🛡 The survivors are leaving through the breach — cover them!'));
      if (survivors.every(s => s.gone)) {
        stage = 'done';
        survivors = [];
        setBanner('');
        showToast(L('ВЫЖИВШИЕ СПАСЕНЫ', 'SURVIVORS SAVED'),
          L('Они ушли в Новохмуринск. Баррикада осталась — пригодится.', 'They made it to Novokhmurinsk. The barricade stays — it\'ll come in handy.'));
        if (window.Menu) window.Menu.requestSave();
      }
    }
  }

  // --- Выживший: прицел, выстрел, лечение, отход ---
  function nearestToad(s, range) {
    let best = null, bd = range;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp <= 0 || e.type === 'pounder' || e.type === 'boss') continue;
      const d = Math.hypot(e.x - s.x, e.y - s.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // Повернуться к жабе и держать прицел ещё ~0,7 с
  function face(s, e) {
    s.angle = Math.atan2(e.y - s.y, e.x - s.x);
    s.facing = e.x < s.x ? -1 : 1;
    s.aimT = 40;
  }

  // Дуло: у 3D-модели — кость Muzzle в позе прицела, у плоской фигуры — точка на листе
  function muzzleOf(s) {
    const ts = window.threeSurvivors;
    const m3 = ts && ts.ready(s.def.id) && ts.muzzle(s.def.id, 'aim', s.angle);
    if (m3) return { x: s.x + m3.x, y: s.y + m3.y };
    const def = s.def, img = images[def.id];
    const w = img.naturalWidth ? def.h * img.naturalWidth / img.naturalHeight : def.h * 0.5;
    return { x: s.x + (def.muzzle[0] - 0.5) * w * s.facing, y: s.y - (1 - def.muzzle[1]) * def.h };
  }

  function shoot(s, e) {
    const w = s.def.weapon;
    face(s, e);
    const m = muzzleOf(s);
    const hit = Math.random() < 0.72;
    const tx = e.x + (hit ? 0 : (Math.random() - 0.5) * 70), ty = e.y - 20 + (hit ? 0 : (Math.random() - 0.5) * 50);
    shots.push({ x1: m.x, y1: m.y, x2: tx, y2: ty, life: w.splash ? 10 : 5, maxLife: w.splash ? 10 : 5, color: w.color, flare: !!w.splash });
    muzzleFlashes.push({ x: m.x, y: m.y, angle: Math.atan2(ty - m.y, tx - m.x), type: w.flash, life: 4, maxLife: 4, scale: 0.7 });
    s.kick = 8;
    if (hit) {
      const r = damageEnemy(e, w.dmg, 'survivor', s.x, s.y);
      e.hitFlash = 5;
      addFloatingText(e.x, e.y - 24, `-${Math.round(r.dealt)}`, '#fde68a');
    }
    if (w.splash) {
      // Ракетница: огненный шар, задевает соседей
      createParticles(tx, ty, '#fb923c', 10);
      spawnDirectionalSparks(tx, ty, -Math.PI / 2, Math.PI * 2, 8, '#fdba74', 3, 9, 12);
      enemies.forEach(o => {
        if (o !== e && o.type !== 'pounder' && o.type !== 'boss' && Math.hypot(o.x - tx, o.y - ty) < 70) {
          damageEnemy(o, w.splash, 'survivor', tx, ty);
          o.hitFlash = 5;
        }
      });
    }
    const vol = enemySoundVolume(s.x, s.y);
    if (vol > 0.3) (w.flash === 'shotgun' ? SoundFX.shotgun : SoundFX.makarov).call(SoundFX);
  }

  function walkTo(s, tx, ty, speed) {
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    if (d < 4) {
      s.moving = false;
      return true;
    }
    s.moving = true;
    s.facing = dx < 0 ? -1 : 1;
    s.angle = Math.atan2(dy, dx);
    const step = Math.min(speed, d);
    s.x += dx / d * step;
    s.y += dy / d * step;
    s.dist += step;
    s.phase += speed * 0.11;
    return false;
  }

  function updateSurvivor(s) {
    s.t++;
    if (s.kick > 0) s.kick--;
    if (s.aimT > 0) s.aimT--;
    if (s.gone) return;
    const def = s.def;
    if (stage === 'retreat') {
      if (s.retreatDelay > 0) { s.retreatDelay--; return; }
      // Раненый ковыляет на костыле, медсестра рядом; остальные — быстрее
      const slow = def.wounded || def.medic;
      const tx = fenceBreach.x + (def.wounded ? -14 : def.medic ? 14 : (s.x < fenceBreach.x ? -20 : 20));
      s.limp = def.wounded;
      s.lying = false;
      s.kneeling = false;
      if (def.weapon && (s.cd -= 1) <= 0) {
        const e = nearestToad(s, def.weapon.range * 0.8);
        if (e) {
          shoot(s, e);
          s.firePause = 22;          // встал, выстрелил, пошёл дальше
        }
        s.cd = def.weapon.cd * 1.3;
      }
      if (s.firePause > 0) {
        s.firePause--;
        s.moving = false;
        return;
      }
      // Дошёл до пролома — дальше только наружу, тает за забором (иначе ходьба тянула назад к точке у пролома)
      if (!s.exiting && walkTo(s, tx, WORLD_HEIGHT - 60, slow ? 1.5 : 2.3)) s.exiting = true;
      if (s.exiting) {
        const step = slow ? 1.2 : 1.8;
        s.y += step;
        s.dist += step;
        s.angle = Math.PI / 2;
        s.moving = true;
        s.phase += 0.2;
        s.alpha = Math.max(0, 1 - (s.y - (WORLD_HEIGHT - 60)) / BREACH_OUT);
        if (s.alpha <= 0) s.gone = true;
      }
      return;
    }
    s.moving = false;
    // Раненый лежит у забора, медсестра на коленях рядом и перевязывает; в передышку лечит Василия
    s.lying = !!def.wounded;
    s.kneeling = !!def.medic;
    if (def.medic) s.facing = -1;            // к Серёге
    if (def.medic) {
      if (stage === 'pause' && --s.healCd <= 0 && Math.hypot(player.x - s.x, player.y - s.y) < 260 && player.hp < player.maxHp) {
        s.healCd = 300;
        const heal = Math.min(20, player.maxHp - player.hp);
        player.hp += heal;
        addFloatingText(player.x - 20, player.y - 50, `+${Math.round(heal)} ${L('Лена', 'Lena')}`, '#4ade80');
        createParticles(player.x, player.y - 20, '#4ade80', 6);
      }
      return;
    }
    if (!def.weapon) return;
    const e = nearestToad(s, def.weapon.range);
    if (e) {
      face(s, e);
      if ((s.cd -= 1) <= 0) {
        shoot(s, e);
        s.cd = def.weapon.cd + Math.random() * 20;
      }
    } else if (s.t % 240 === 0 && s.aimT <= 0) {
      // Оглядывается — в свою сторону обороны
      s.angle = s.lookout + (Math.random() - 0.5) * 1.6;
      s.facing = Math.cos(s.angle) < 0 ? -1 : 1;
    }
  }

  // --- Отрисовка ---
  // Мешок с песком: светлый верх, тёмный контур — в стиле комикса
  function drawBag(ctx, x, y) {
    ctx.fillStyle = '#7c6b4a';
    ctx.strokeStyle = '#1c1710';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(214, 196, 150, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x - 3, y - 3, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPiece(ctx, p) {
    const tp = window.threeProps;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 6, 50, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.kind === 'bags') {
      // Три ряда мешков вдоль дуги, верхний — вразбежку
      ctx.translate(p.x, p.y);
      const ca = Math.cos(p.tan), sa = Math.sin(p.tan);
      [[0, 4, 4], [-9, -4, 3], [0, -12, 3]].forEach(([shift, dy, n]) => {
        for (let i = 0; i < n; i++) {
          const along = (i - (n - 1) / 2) * 26 + shift;
          drawBag(ctx, along * ca, along * sa + dy);
        }
      });
    } else if (p.kind === 'crates' && tp && tp.isLoaded.military_crate) {
      // Ящики военторга: два внизу, один сверху
      const f = tp.getFrameCanvas('military_crate', 2);
      if (f) {
        ctx.drawImage(f, p.x - 62, p.y - 52, 68, 68);
        ctx.drawImage(f, p.x - 6, p.y - 50, 68, 68);
        ctx.drawImage(f, p.x - 34, p.y - 78, 68, 68);
      }
    } else if (p.kind === 'barrels' && tp && tp.isLoaded.container_barrel) {
      const f = tp.getFrameCanvas('container_barrel', 0);
      if (f) {
        [[-28, 2], [8, 6], [-8, -10]].forEach(([dx, dy]) => {
          const fr = pzFrame('container_barrel', p.x + dx, p.y + dy, 36);
          ctx.drawImage(f, fr.x, fr.y, fr.w, fr.h);
        });
      }
    }
    ctx.restore();
  }

  // Баррикада — под фигурами (она низкая), только в Промзоне
  function drawGround(ctx) {
    if (currentLocation !== 'promzona') return;
    PIECES.map(pieceAt).sort((a, b) => a.y - b.y).forEach(p => drawPiece(ctx, p));
  }

  // Раненый лежит на спине: вся фигура повёрнута на землю, грудь чуть поднимается от дыхания
  function drawLying(ctx, s, img, sc) {
    const def = s.def, iw = img.naturalWidth, ih = img.naturalHeight;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.translate(s.x, s.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, def.h * 0.55, def.h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Голова к западу, ноги к пролому; лёгкий наклон к камере — лежит на земле, а не висит
    ctx.rotate(-Math.PI / 2 + 0.12);
    ctx.scale(1 + Math.sin(s.t * 0.06) * 0.015, 0.8);
    ctx.drawImage(img, -iw * sc / 2, -def.h * 0.5, iw * sc, ih * sc);
    ctx.restore();
  }

  // 3D-кадр выжившего сейчас: поза по состоянию, направление — angle. null — модель ещё не готова
  function sprite3d(s) {
    const ts = window.threeSurvivors, def = s.def;
    if (!ts || !ts.ready(def.id)) return null;
    if (s.lying) return ts.sprite(def.id, 'lie', 0);
    if (s.kneeling) return ts.sprite(def.id, 'heal', s.angle, Math.floor(s.t / 12));
    if (s.moving || def.wounded) return ts.sprite(def.id, s.limp || def.wounded ? 'limp' : 'walk', s.angle, s.moving ? ts.stepFrame(s.dist) : 0);
    const pose = !def.weapon ? 'idle' : s.kick > 3 ? 'fire' : s.aimT > 0 ? 'aim' : 'idle';
    return ts.sprite(def.id, pose, s.angle);
  }

  // Высота фигуры на экране (имя над головой, предметы перед ней — environment.drawOccludingProps)
  const figureH = s => (s.lying ? 26 : s.kneeling ? 50 : 76);

  function drawSurvivor3D(ctx, s, sp) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.translate(s.x, s.y);
    // Контактная тень (отбрасываемую кладёт слой теней — addShadows)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.beginPath();
    if (s.lying) ctx.ellipse(0, 6, 40, 10, 0, 0, Math.PI * 2);
    else ctx.ellipse(0, 1, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Стоящие дышат
    if (!s.moving && !s.lying) ctx.scale(1, 1 + Math.sin(s.t * 0.055 + s.phase) * 0.01);
    ctx.drawImage(sp.frame, sp.ox, sp.oy, sp.size, sp.size);
    ctx.restore();
    // Лежащему — над головой (она на западе), иначе имя легло бы на Лену
    if (s.lying) drawName(ctx, s, -14, -34);
    else drawName(ctx, s, -figureH(s) - 4);
  }

  // Плоская фигура по частям: две ноги качаются от бедра, корпус дышит, наклоняется на ходу и отдаёт при
  // выстреле. Стоящая на коленях (медсестра) — ноги поджаты, корпус ниже и склоняется к раненому
  function drawSurvivor(ctx, s) {
    const sp = sprite3d(s);
    if (sp) {
      drawSurvivor3D(ctx, s, sp);
      return;
    }
    const def = s.def, img = images[def.id];
    if (!img.complete || !img.naturalWidth) return;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const sc = def.h / ih;
    if (s.lying) {
      drawLying(ctx, s, img, sc);
      drawName(ctx, s, -def.h * 0.35);
      return;
    }
    const hipY = ih * def.hip, gapX = iw * def.gap, legH = ih - hipY;
    const t = s.t;
    const crouch = s.kneeling ? 0.5 : 1;                        // во сколько раз короче ноги
    const drop = legH * (1 - crouch) * sc;                       // настолько ниже корпус
    const swing = s.moving ? Math.sin(s.phase) * (s.limp ? 0.22 : 0.38) : Math.sin(t * 0.021) * 0.015;
    const bob = s.moving ? -Math.abs(Math.sin(s.phase)) * (s.limp ? (Math.sin(s.phase) > 0 ? 5 : 1) : 3) : 0;
    const breath = 1 + Math.sin(t * 0.055 + s.phase) * 0.012;
    const lean = s.moving ? 0.06 : Math.sin(t * 0.017 + s.phase) * 0.012;
    const kick = s.kick / 8;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.translate(s.x, s.y);
    // Тень у ног
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 2, def.h * 0.24, def.h * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(s.facing, 1);
    ctx.translate(-iw * sc / 2, -def.h + drop);
    // Ноги: каждая — от бедра, качаются в противофазе
    const legW = Math.min(gapX, iw - gapX);
    [[0, gapX, -1], [gapX, iw - gapX, 1]].forEach(([sx, sw, side]) => {
      const pivotX = (side < 0 ? gapX - legW * 0.5 : gapX + legW * 0.5) * sc;
      ctx.save();
      ctx.translate(pivotX, hipY * sc);
      ctx.rotate(side * swing * (s.kneeling && side > 0 ? 0 : 1));
      ctx.scale(1, crouch);
      ctx.drawImage(img, sx, hipY, sw, legH, sx * sc - pivotX, 0, sw * sc, legH * sc);
      ctx.restore();
    });
    // Корпус: дышит от бедра, наклон, отдача
    ctx.save();
    ctx.translate(iw * sc / 2, hipY * sc + bob);
    // На коленях склоняется к раненому и перевязывает — корпус покачивается
    ctx.rotate(lean - kick * 0.07 + (s.kneeling ? 0.22 + Math.sin(t * 0.09) * 0.06 : 0));
    ctx.translate(-kick * 3, 0);
    ctx.scale(1, breath);
    ctx.drawImage(img, 0, 0, iw, hipY + 4, -iw * sc / 2, -hipY * sc, iw * sc, (hipY + 4) * sc);
    ctx.restore();
    ctx.restore();
    drawName(ctx, s, -def.h + drop - 6);
  }

  // Имя над головой
  function drawName(ctx, s, dy, dx = 0) {
    if (s.alpha <= 0.5) return;
    const def = s.def, name = L(def.name[0], def.name[1]);
    ctx.save();
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText(name, s.x + dx + 1, s.y + dy + 1);
    ctx.fillStyle = def.wounded ? '#fca5a5' : '#e2e8f0';
    ctx.fillText(name, s.x + dx, s.y + dy);
    ctx.restore();
  }

  function drawActors(ctx) {
    survivors.filter(s => !s.gone).sort((a, b) => a.y - b.y).forEach(s => drawSurvivor(ctx, s));
  }

  // Трассеры выстрелов и огненный след ракетницы — поверх фигур
  function drawShots(ctx) {
    shots.forEach(sh => {
      const k = sh.life / sh.maxLife;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = sh.flare ? 3 : 1.6;
      ctx.beginPath();
      ctx.moveTo(sh.x1, sh.y1);
      if (sh.flare) ctx.quadraticCurveTo((sh.x1 + sh.x2) / 2, Math.min(sh.y1, sh.y2) - 60, sh.x2, sh.y2);
      else ctx.lineTo(sh.x2, sh.y2);
      ctx.stroke();
      ctx.restore();
    });
  }

  // Для перерисовки предметов, за которыми стоит фигура (environment.drawOccludingProps)
  function addActors(actors) {
    survivors.forEach(s => { if (!s.gone) actors.push({ x: s.x, y: s.y, h: sprite3d(s) ? figureH(s) : s.def.h }); });
  }

  // Отбрасываемые тени 3D-фигур (game.js collectActorShadows)
  function addShadows(list) {
    survivors.forEach(s => {
      if (s.gone || s.alpha < 0.5) return;
      const sp = sprite3d(s);
      if (sp) list.push({ img: sp.frame, x: s.x + sp.ox, y: s.y + sp.oy, w: sp.size, h: sp.size });
    });
  }

  // Баррикада — препятствие для ходьбы (пули летят поверх); стоит всегда, и после обороны
  function addObstacles() {
    if (currentLocation !== 'promzona') return;
    PIECES.map(pieceAt).forEach(p => {
      addObstacle({ x: p.x, y: p.y, rx: p.kind === 'bags' ? 46 : 42, ry: 16, rot: p.kind === 'bags' ? p.tan : 0 });
    });
  }

  // Жаба обороны не в счётчике локации: у обороны свой счётчик
  const isDefenseToad = e => !!e.defense;

  // Площадка обороны: деревья туда не ставятся (environment.scatterGreenery)
  const inArea = (x, y) => Math.hypot(x - C.x, (y - C.y) / GROUND_SQUASH) < R + 120;

  return { saveState, loadState, onWorld, onEnter, update, drawGround, drawActors, drawShots, addActors, addShadows, addObstacles,
    isDefenseToad, inArea, get stage() { return stage; } };
})();
