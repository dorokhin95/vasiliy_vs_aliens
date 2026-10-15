// Окно «Инвентарь / Персонаж / Задания»: I — что у Василия с собой (только то, что есть), C — его
// характеристики, перки, карты и прогресс локации, J — журнал квестов спасённых (src/quests.js). Пока окно открыто, мир стоит (gameState 'INVENTORY'); ESC или та же
// клавиша закрывают. Скрипты обычные, без модулей: player, currentLang, t и таблицы — из game.js.
window.CharacterPanel = (function () {
  const $ = id => document.getElementById(id);
  const ru = () => currentLang === 'ru';
  const L = (r, e) => (ru() ? r : e);
  let tab = 'inventory';

  // Ресурсы и трофеи: [поле player.resources, ru, en, иконка (RES_DISPLAY), цвет]
  const RESOURCES = [
    ['bottles', 'Стеклотара', 'Bottles'],
    ['scrap', 'Чермет', 'Scrap metal'],
    ['mil_parts', 'Оружейные детали', 'Weapon parts'],
    ['alien_core', 'Квако-ядра', 'Alien cores']
  ];
  const SUPPLIES = [
    ['vodka', 'assets/sprites/loot/loot_vodka.png?v=1026'],
    ['stew', 'assets/sprites/loot/loot_stew.png?v=1026'],
    ['bandage', 'assets/sprites/loot/loot_bandage.png?v=1026']
  ];

  // TROPHY_NAMES написаны капсом для всплывающих надписей — в списке обычным регистром
  const capitalize = s => s.charAt(0) + s.slice(1).toLowerCase();

  function isOpen() {
    return gameState === 'INVENTORY';
  }

  function open(which) {
    if (gameState !== 'PLAYING' && !isOpen()) return;
    tab = which || tab;
    gameState = 'INVENTORY';
    // Отпущенные, пока окно открыто, клавиши иначе «залипают»
    for (const k in keys) keys[k] = false;
    mouseDown = false;
    render();
    $('char-panel').style.display = 'flex';
  }

  function close() {
    if (!isOpen()) return;
    $('char-panel').style.display = 'none';
    gameState = 'PLAYING';
  }

  // Та же клавиша на открытой вкладке закрывает окно, другая — переключает вкладку
  function toggle(which) {
    if (isOpen() && tab === which) close();
    else open(which);
  }

  function cell(img, name, value, color) {
    const d = document.createElement('div');
    d.className = 'inv-cell';
    d.innerHTML = `<img src="${img}" alt=""><span class="inv-name"></span><b></b>`;
    d.querySelector('.inv-name').textContent = name;
    const b = d.querySelector('b');
    b.textContent = value;
    if (color) b.style.color = color;
    return d;
  }

  // list — строки списком (характеристики), иначе плитка (предметы)
  function section(title, items, list = false) {
    if (items.length === 0) return null;
    const s = document.createElement('section');
    s.className = 'inv-section';
    const h = document.createElement('h3');
    h.textContent = title;
    const grid = document.createElement('div');
    grid.className = list ? 'char-section-grid' : 'inv-grid';
    items.forEach(i => grid.append(i));
    s.append(h, grid);
    return s;
  }

  function renderInventory(body) {
    const r = player.resources;
    const res = RESOURCES.filter(([k]) => r[k] > 0)
      .map(([k, nr, ne]) => cell(RES_DISPLAY[k].img, L(nr, ne), r[k], RES_DISPLAY[k].color));
    const named = table => Object.keys(table).filter(k => r[k] > 0)
      .map(k => cell(RES_DISPLAY[k].img, capitalize(L(table[k][0], table[k][1])), r[k], table[k][2]));
    const trophies = named(TROPHY_NAMES);
    const pzLoot = named(PZ_LOOT_NAMES);
    const supplies = SUPPLIES.filter(([k]) => player.items[k] > 0)
      .map(([k, img]) => cell(img, t(k), player.items[k]));
    const ammo = [];
    const pm = player.ammo.makarov, sg = player.ammo.shotgun;
    // Патроны — только к купленному оружию: стартовый запас без ствола не нужен
    if (player.unlockedWeapons.makarov) {
      ammo.push(cell('assets/sprites/loot/ammo_9x18.png', L('Патроны 9×18', '9×18 rounds'), `${pm.clip} + ${pm.reserve}`));
    }
    if (player.unlockedWeapons.shotgun) {
      ammo.push(cell('assets/sprites/loot/ammo_12g.png', L('Патроны 12 калибра', '12-gauge shells'), `${sg.clip} + ${sg.reserve}`));
    }
    // Мастерская Толика (src/workshop.js)
    if (player.unlockedWeapons.launcher) {
      const gl = player.ammo.launcher;
      ammo.push(cell('assets/sprites/weapons/weapon_launcher.png?v=1', L('Гранаты', 'Grenades'), `${gl.clip} + ${gl.reserve}`));
    }
    if (player.empGrenades > 0) {
      ammo.push(cell('assets/sprites/weapons/weapon_emp.png?v=1', L('ЭМИ-гранаты', 'EMP grenades'), player.empGrenades));
    }
    // Оружие: с собой или оставлено у Михалыча
    const weapons = SHOP_ARSENAL_ITEMS.filter(it => it.type === 'weapon' && player.unlockedWeapons[it.weaponKey])
      .map(it => cell(it.img, L(it.name_ru, it.name_en),
        player.equipped[it.weaponKey] ? L('с собой', 'carried') : L('у Михалыча', 'at Mikhalych'),
        player.equipped[it.weaponKey] ? '#4ade80' : '#94a3b8'));
    const parts = [
      section(L('Оружие', 'Weapons'), weapons),
      section(L('Патроны (в обойме + запас)', 'Ammo (clip + reserve)'), ammo),
      section(L('Припасы', 'Supplies'), supplies),
      section(L('Ресурсы', 'Resources'), res),
      section(L('Жабьи трофеи', 'Toad trophies'), trophies),
      section(L('Лут Промзоны', 'Industrial Zone loot'), pzLoot)
    ].filter(Boolean);
    if (parts.length === 0) {
      const p = document.createElement('p');
      p.className = 'inv-empty';
      p.textContent = L('Пусто — обыскивай тайники и бей жаб.', 'Empty — search stashes and beat toads.');
      body.append(p);
    }
    parts.forEach(p => body.append(p));
  }

  function statRow(label, value) {
    const d = document.createElement('div');
    d.className = 'stat-row';
    d.innerHTML = '<span></span><b></b>';
    d.querySelector('span').textContent = label;
    d.querySelector('b').textContent = value;
    return d;
  }

  function renderStats(body) {
    const c = player.cards || {};
    const speed = player.speed * (1 + CARD_EFFECTS.speed * (c.speed || 0));
    const rows = [
      statRow(L('Здоровье', 'Health'), `${Math.ceil(player.hp)} / ${player.maxHp}`),
      statRow(L('Выносливость', 'Stamina'), `${Math.round(player.maxStamina)}`),
      statRow(L('Урон', 'Damage'), `${player.baseDamage}`),
      statRow(L('Критический удар', 'Critical hit'), `${Math.round(player.critChance * 100)}% ×${player.critMult}`),
      statRow(L('Скорость бега', 'Move speed'), speed.toFixed(1))
    ];
    if (c.agility) rows.push(statRow(L('Шанс увернуться', 'Dodge chance'), `${Math.round(CARD_EFFECTS.agilityDodge * c.agility * 100)}%`));
    body.append(section(L('Характеристики', 'Stats'), rows, true));

    // Карты после боссов
    const cardNames = {};
    (window.BossCards ? window.BossCards.ALL : []).forEach(cd => { cardNames[cd.id] = capitalize(L(cd.title.ru, cd.title.en)); });
    const cards = Object.keys(cardNames).filter(k => c[k] > 0).map(k => statRow(cardNames[k], `×${c[k]}`));
    const cs = section(L('Карты боссов', 'Boss cards'), cards, true);
    if (cs) body.append(cs);

    // Перки из веток прокачки, цветом ветки
    const perks = [];
    Object.values(UPGRADE_TREES).forEach(tree => {
      Object.values(tree.perks).forEach(pk => {
        if (!player.hasPerk(pk.id)) return;
        const row = statRow(L(pk.name_ru, pk.name_en), '');
        row.querySelector('span').style.color = tree.color;
        row.querySelector('span').prepend(perkIconImg(pk.id, 'perk-mini'));
        row.querySelector('b').textContent = L(pk.desc_ru, pk.desc_en);
        row.classList.add('perk-row');
        perks.push(row);
      });
    });
    const ps = section(L('Перки', 'Perks'), perks, true);
    if (ps) body.append(ps);

    // Прогресс локации
    const toadsLeft = enemies.filter(e => e.type !== 'boss' && e.type !== 'pounder' && !e.defense && !e.summon).length;
    const progress = [
      statRow(L('Локация', 'Location'), currentLocation === 'promzona' ? L('Промзона', 'Promzona') : L('Новохмуринск', 'Novokhmurinsk')),
      statRow(L('Жаб осталось', 'Toads left'), `${toadsLeft} / ${levelEnemyTotal}`),
      statRow(L('Босс', 'Boss'), currentLocation === 'promzona'
        ? (pounderRef ? t('pounder_alive') : t('pounder_dead'))
        : (bossRef ? t('boss_alive') : t('boss_dead')))
    ];
    body.append(section(L('Прогресс', 'Progress'), progress, true));
  }

  // Журнал: взятые квесты — сверху, сданные — ниже
  function renderQuests(body) {
    const list = window.Quests ? window.Quests.journal() : [];
    const row = q => {
      const d = statRow(`${q.title} · ${q.giver}`, q.text);
      d.classList.add('perk-row');
      d.querySelector('span').style.color = q.state === 'done' ? '#64748b' : q.state === 'ready' ? '#4ade80' : '#fbbf24';
      if (q.icon) {
        const img = document.createElement('img');
        img.className = 'quest-mini';
        img.src = q.icon;
        img.alt = '';
        img.onerror = () => img.remove();
        d.querySelector('span').prepend(img);
      }
      return d;
    };
    const active = section(L('Взятые', 'Active'), list.filter(q => q.state !== 'done').map(row), true);
    const done = section(L('Выполненные', 'Completed'), list.filter(q => q.state === 'done').map(row), true);
    if (!active && !done) {
      const p = document.createElement('p');
      p.className = 'inv-empty';
      p.textContent = L('Заданий нет. Поговори со спасёнными в Новохмуринске.', 'No quests. Talk to the rescued survivors in Novokhmurinsk.');
      body.append(p);
    }
    if (active) body.append(active);
    if (done) body.append(done);
  }

  function render() {
    $('char-tab-inventory').textContent = L('🎒 ИНВЕНТАРЬ [I]', '🎒 INVENTORY [I]');
    $('char-tab-stats').textContent = L('👤 ПЕРСОНАЖ [C]', '👤 CHARACTER [C]');
    $('char-tab-quests').textContent = L('📜 ЗАДАНИЯ [J]', '📜 QUESTS [J]');
    $('char-tab-inventory').classList.toggle('active', tab === 'inventory');
    $('char-tab-stats').classList.toggle('active', tab === 'stats');
    $('char-tab-quests').classList.toggle('active', tab === 'quests');
    $('char-close').textContent = L('ЗАКРЫТЬ [ESC]', 'CLOSE [ESC]');
    const body = $('char-body');
    body.innerHTML = '';
    if (tab === 'inventory') renderInventory(body);
    else if (tab === 'quests') renderQuests(body);
    else renderStats(body);
  }

  $('char-tab-inventory').addEventListener('click', () => open('inventory'));
  $('char-tab-stats').addEventListener('click', () => open('stats'));
  $('char-tab-quests').addEventListener('click', () => open('quests'));
  $('char-close').addEventListener('click', close);
  $('hud-btn-inventory').addEventListener('click', () => toggle('inventory'));
  $('hud-btn-stats').addEventListener('click', () => toggle('stats'));
  // Клик по затемнению вокруг окна закрывает его
  $('char-panel').addEventListener('mousedown', e => { if (e.target.id === 'char-panel') close(); });

  return { open, close, toggle, isOpen };
})();
