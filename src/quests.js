// Квесты спасённых (docs/LEVEL2_PROMZONA.md, раздел 7, «Разговоры и квесты»). Выдаются и сдаются в окне
// диалога (src/dialog.js, тема «Есть работа?»), выполняются в Промзоне.
//   - У каждого выжившего — цепочка: следующий квест открывается после сдачи предыдущего (пока — по первому).
//   - Цель «найти предмет»: предмет лежит в определённых тайниках или сейфах Промзоны (раскладка одинаковая,
//     места постоянные — `find`: район и тип, первые по порядку). Обыскал тайник или вскрыл сейф, пока квест
//     взят, — рядом выпадает предмет (подобрать — подойти). Тайник обыскан раньше, чем взят квест, — предмет
//     ждёт на земле рядом. Над тайником с предметом — жёлтый «!».
//   - Цель «принести» (bring: { ресурс: сколько }): квест готов к сдаче, когда у Василия столько есть; сдача забирает.
//   - Цель «проба» (sample): постоять у первой лужи шлам-прудов Промзоны и нажать E (game.js handleInteract).
//   - Цель «зачистить» (clear: район): в районе не осталось жаб — считаются живые в Промзоне, а из города —
//     по снимку Промзоны (locationWorlds); когда осталось мало, над ними «!».
//   - Цель «после босса» (boss): Долбильщик побеждён — там, где он пал (или в логове), лежит предмет.
//   - Награда: открыть мастерскую или столовую, патроны на посту при каждом возвращении, ящик припасов,
//     бесплатное улучшение в мастерской, гранатомёт (src/workshop.js), чертёж, наган Зины.
//   - Над головой выжившего: «!» — есть новый квест, «?» — можно сдать. Журнал — вкладка окна инвентаря (J),
//     строка прогресса — слева под полосками здоровья.
//   - В сохранении — `quests` в корне забега: состояние, найденные предметы, открытое.
// Скрипты обычные, без модулей: containers, enemies, player, spawn3DLootItem и прочее — из game.js.
window.Quests = (function () {
  const L = (r, e) => (currentLang === 'ru' ? r : e);
  const T = pair => L(pair[0], pair[1]);
  const PICK_R = 46;               // как близко подойти к предмету, чтобы подобрать
  const CLEAR_HINT = 3;            // зачистка: столько жаб и меньше осталось — над ними «!»

  const QUESTS = [
    {
      id: 'tolik_rig', giver: 'tolik', reward: 'workshop', guard: true, icon: 'quest_welding_rig',
      title: ['Сварочный аппарат', 'The welding rig'],
      item: ['Сварочный аппарат', 'Welding rig'],
      where: ['Механические цеха, кузов ЗИЛа', 'Machine shops, the ZIL truck bed'],
      find: { district: 'pz_workshops', types: ['zil'], n: 1 },
      offer: [
        ['Слушай, Василий. Аппарат мой сварочный в механических цехах остался — в кузове ЗИЛа, я его туда грузил, когда всё началось.', 'Listen, Vasiliy. My welding rig stayed in the machine shops — in the bed of a ZIL truck, I was loading it when it all started.'],
        ['Только там громила здоровенный трётся. Бригадиром его прозвали — злой, как начальство. Принесёшь аппарат — мастерская заработает.', 'But there\'s a huge brute hanging around. We call him the Foreman — mean as management. Bring me the rig and the workshop will be up and running.']
      ],
      accepted: ['Вот и договорились. С громилой осторожнее — он в броне, со спины бей.', 'Deal. Careful with the brute — he\'s armored, hit him from behind.'],
      progress: ['Аппарат в кузове ЗИЛа, в механических цехах. Без него никак.', 'The rig is in the ZIL truck bed, in the machine shops. Can\'t do without it.'],
      turnIn: ['Вот твой аппарат', 'Here\'s your rig'],
      done: ['Живой! И аппарат живой! Дай мне его настроить — и мастерская заработает.', 'You\'re alive! And so is the rig! Let me set it up — and the workshop will be open.']
    },
    {
      id: 'tolik_cable', giver: 'tolik', reward: 'freeUpgrade',
      title: ['Цветмет на кабель', 'Copper for cable'],
      item: ['Цветмет', 'Non-ferrous metal'],
      where: ['Принести Толику 30 цветмета', 'Bring Tolik 30 non-ferrous metal'],
      bring: { nonferrous: 30 },
      offer: [
        ['Аппарат гудит, а варить толком нечем: кабель весь порченый, жабы погрызли. Медь нужна — много меди.', 'The rig hums, but there\'s nothing proper to weld with: the cables are ruined, chewed by toads. I need copper — lots of copper.'],
        ['Притащи цветмета штук тридцать — с катушек, с подстанции, с вагонов. За это первую доработку твоего ствола сделаю бесплатно.', 'Bring me about thirty pieces of non-ferrous metal — from cable drums, the substation, the wagons. In return I\'ll upgrade one of your guns for free.']
      ],
      accepted: ['Медь — она везде, где ток был. Не надорвись только.', 'Copper is wherever there was current. Just don\'t break your back.'],
      progress: ['Тридцать цветмета, Василий. Без меди обмотку не перемотаешь.', 'Thirty non-ferrous, Vasiliy. Can\'t rewind a coil without copper.'],
      turnIn: ['Вот цветмет', 'Here\'s the copper'],
      done: ['Вот это я понимаю! Выбирай любой ствол — первую доработку сделаю бесплатно.', 'Now that\'s what I\'m talking about! Pick any gun — the first upgrade is on me.']
    },
    {
      id: 'tolik_rockets', giver: 'tolik', reward: 'launcher',
      title: ['Ракетная начинка', 'Rocket filling'],
      item: ['Квако-заряды', 'Kvako charges'],
      where: ['Принести Толику 5 квако-зарядов (с ракетчиков)', 'Bring Tolik 5 kvako charges (from rocketeers)'],
      bring: { kvako_charge: 5 },
      offer: [
        ['Видел у ракетчиков пусковые? Труба, пружина и жабья химия. Я такое из водопроводной трубы соберу — начинка только нужна.', 'Seen the rocketeers\' launchers? A pipe, a spring and toad chemistry. I can build one from a water pipe — I just need the filling.'],
        ['Принеси пять квако-зарядов с ракетчиков. Соберу тебе гранатомёт, а из зарядов потом гранаты буду крутить.', 'Bring me five kvako charges from the rocketeers. I\'ll build you a grenade launcher, and later I\'ll make grenades out of the charges.']
      ],
      accepted: ['Ракетчика после залпа бей — он пустой ходит.', 'Hit a rocketeer right after a volley — he walks around empty.'],
      progress: ['Пять квако-зарядов. С ракетчиков, больше неоткуда.', 'Five kvako charges. From rocketeers, nowhere else.'],
      turnIn: ['Вот квако-заряды', 'Here are the kvako charges'],
      done: ['Держи. Труба, пружина, приклад от «Сайги» — и бахает как надо. Гранаты к нему — у меня в мастерской: заряд на три штуки.', 'Here you go. A pipe, a spring, a Saiga stock — and it bangs just right. Grenades are at my workshop: one charge makes three.']
    },
    {
      id: 'lena_log', giver: 'lena', reward: 'canteen', icon: 'quest_sample_log',
      title: ['Лабораторный журнал', 'The lab log'],
      item: ['Журнал проб', 'Sample log'],
      where: ['Заводоуправление, несгораемый шкаф', 'Plant administration, the fireproof cabinet'],
      find: { district: 'pz_admin', types: ['safe_fireproof'], n: 1 },
      offer: [
        ['Мой журнал проб остался в заводоуправлении. Я его в несгораемый шкаф заперла, когда жабы полезли, — привычка: документы в сейф.', 'My sample log stayed in the admin building. I locked it in a fireproof cabinet when the toads came — habit: documents go in the safe.'],
        ['Код я не помню, честно. Но ты же инженер — подберёшь. Без журнала у меня ни рецептов, ни анализов.', 'I honestly don\'t remember the code. But you\'re an engineer — you\'ll crack it. Without the log I have no recipes and no tests.']
      ],
      accepted: ['Спасибо! Шкаф старый: ошибёшься много — заклинит. Не торопись.', 'Thank you! The cabinet is old: too many mistakes and it jams. Take your time.'],
      progress: ['Несгораемый шкаф в заводоуправлении. Журнал там.', 'The fireproof cabinet in the admin building. The log is in there.'],
      turnIn: ['Вот твой журнал', 'Here\'s your log'],
      done: ['Он! Все пробы на месте… Теперь я смогу готовить. Столовая открывается — ну, почти.', 'That\'s it! All the samples are here… Now I can cook. The canteen is opening — well, almost.']
    },
    {
      id: 'lena_broth', giver: 'lena', reward: 'recipesBroth',
      title: ['Наваристый бульон', 'A hearty broth'],
      item: ['Лапки и печень', 'Legs and liver'],
      where: ['Принести Лене 5 жабьих лапок и 3 печени', 'Bring Lena 5 toad legs and 3 livers'],
      bring: { toad_leg: 5, toad_liver: 3 },
      offer: [
        ['Журнал на месте — значит, и рецепты. Только из чего варить? Тушёнка кончается, а люди есть хотят.', 'The log is back — so are the recipes. But what do I cook with? The stew is running out, and people need to eat.'],
        ['Принеси жабьих лапок штук пять и три печени. Сварю похлёбку и настойку поставлю. Жабье, конечно, но… питательно.', 'Bring me five toad legs and three livers. I\'ll make soup and set a tincture. Toad, sure, but… nourishing.']
      ],
      accepted: ['Лапки — с пехоты, печень — со стрелков и громил. Свежее неси, ладно?', 'Legs from the grunts, livers from the gunners and brutes. Fresh ones, okay?'],
      progress: ['Пять лапок и три печени. Котёл ждёт.', 'Five legs and three livers. The pot is waiting.'],
      turnIn: ['Вот лапки и печень', 'Here are the legs and livers'],
      done: ['Вот это бульон будет! Похлёбку и настойку теперь варю — заходи в столовую.', 'Now that\'ll be a broth! I can make the soup and the tincture now — drop by the canteen.']
    },
    {
      id: 'lena_sludge', giver: 'lena', reward: 'recipeOintment', sample: true, icon: 'quest_sludge_sample',
      title: ['Проба шлама', 'A sludge sample'],
      item: ['Проба шлама', 'Sludge sample'],
      where: ['Шлам-пруды на западе Промзоны: набрать пробу у лужи (E)', 'Sludge ponds in the west of the Promzona: take a sample at a puddle (E)'],
      offer: [
        ['Шлам этот жжёт, как кислота, а жабы в нём купаются. Значит, его можно обратить — мазь сделать.', 'That sludge burns like acid, yet the toads bathe in it. So it can be turned around — made into an ointment.'],
        ['Набери мне пробу на шлам-прудах, на западе завода. Вот пробирка. Только в луже долго не стой.', 'Take a sample for me at the sludge ponds in the west of the plant. Here\'s a test tube. Just don\'t stand in the puddle too long.']
      ],
      accepted: ['Набрал — и сразу назад. И не нюхай!', 'Fill it and come straight back. And don\'t sniff it!'],
      progress: ['Проба шлама с прудов. Без неё мазь не сварю.', 'A sludge sample from the ponds. No ointment without it.'],
      turnIn: ['Вот проба', 'Here\'s the sample'],
      done: ['Светится… Отлично. Мазь будет — шлам перестанет жечь. Заходи, сварю.', 'It glows… Perfect. You\'ll get an ointment — the sludge won\'t burn anymore. Drop by, I\'ll cook it.']
    },
    {
      id: 'stepanych_tags', giver: 'stepanych', reward: 'postAmmo', icon: 'quest_shift_tag',
      title: ['Пропавшая смена', 'The lost shift'],
      item: ['Жетон смены', 'Shift tag'],
      where: ['Литейный цех, бочки и кузов', 'Foundry, barrels and a truck bed'],
      find: { district: 'pz_foundry', types: ['barrel', 'zil'], n: 3 },
      offer: [
        ['Бригада моя в литейке осталась. Шесть человек… Я их всех по жетонам помню — номерки латунные, на проходной выдавали.', 'My crew stayed in the foundry. Six men… I remember each of them by their tags — brass numbers they handed out at the gate.'],
        ['Найди мне жетоны. Три хотя бы. Хочу знать, кто… Хочу знать.', 'Find me their tags. Three at least. I want to know who… I want to know.']
      ],
      accepted: ['Спасибо, Василий. В литейном жаб много — не геройствуй.', 'Thank you, Vasiliy. The foundry is crawling with toads — don\'t play the hero.'],
      progress: ['Жетоны — в литейном цехе: в бочках и в кузове, где наши прятались.', 'The tags are in the foundry: in the barrels and the truck bed where our guys hid.'],
      turnIn: ['Вот жетоны', 'Here are the tags'],
      done: ['…Петров. Гуляев. Сашка Мохов… Спасибо. Пусть хоть имена останутся. Возвращаться будешь — заходи на пост, патронов отсыплю. Каждый раз.', '…Petrov. Gulyaev. Sashka Mokhov… Thank you. At least their names remain. Whenever you come back, drop by the post — I\'ll give you ammo. Every time.']
    },
    {
      id: 'stepanych_pipe', giver: 'stepanych', reward: 'blueprint', clear: 'pz_foundry', icon: 'quest_foundry_pipe',
      title: ['Труба', 'The pipe'],
      item: ['Литейный цех', 'The foundry'],
      where: ['Литейный цех: перебить всех жаб', 'The foundry: kill every toad'],
      offer: [
        ['Знаешь, откуда они к посту лезут? Из литейки. Там теплотрасса — труба до самого забора, по ней и ползут.', 'Know where they crawl to the post from? The foundry. There\'s a heating main — a pipe right up to the fence, they crawl along it.'],
        ['Пока литейка жабья — нам труба. Вычисти её, Василий. Всю, до последней. А я тебе кое-что отдам — на чёрный день берёг.', 'As long as the foundry is theirs, we\'re done for. Clear it out, Vasiliy. All of it, down to the last one. And I\'ll give you something — I was saving it for a rainy day.']
      ],
      accepted: ['В литейном их много, и громилы там злые. Бей по одному, в толпу не лезь.', 'There are a lot of them in the foundry, and the brutes there are mean. One at a time, don\'t charge into a crowd.'],
      progress: ['Литейку — дочиста. Пока хоть одна там сидит, лезть будут.', 'The foundry — clean. As long as even one sits there, they\'ll keep crawling.'],
      turnIn: ['Литейка чистая', 'The foundry is clear'],
      done: ['Чистая? Вот это дело. Держи — чертёж, из бригадирского стола вынес, когда всё началось. Разрядник какой-то сварочный. Толику покажи — он разберётся.', 'Clear? Now that\'s something. Here — a blueprint, I took it from the foreman\'s desk when it all started. Some welding arc discharger. Show Tolik — he\'ll figure it out.']
    },
    {
      id: 'zina_armory', giver: 'zina', reward: 'armory', icon: 'quest_guard_log',
      title: ['Оружейка ВОХР', 'The guard armory'],
      item: ['Журнал караула', 'Guard log'],
      where: ['Заводоуправление, кассовый сейф', 'Plant administration, the vault'],
      find: { district: 'pz_admin', types: ['safe_vault'], n: 1 },
      offer: [
        ['Оружейка наша, ВОХРовская, — кассовый сейф в заводоуправлении, мы его туда от проходной перенесли. Патроны, аптечка, журнал караула. Ключи у Коли были, а Коли нет.', 'Our guard armory is a vault in the admin building — we moved it there from the gate. Ammo, a first-aid kit, the guard log. Kolya had the keys, and Kolya\'s gone.'],
        ['Замок кодовый, пять цифр. Вскроешь — патроны и бинты твои. Мне только журнал принеси.', 'It\'s a combination lock, five digits. Crack it — the ammo and bandages are yours. Just bring me the log.']
      ],
      accepted: ['Сейф тяжёлый, кассовый. Не спеши — пять цифр подобрать надо.', 'It\'s a heavy vault. Don\'t rush — five digits to work out.'],
      progress: ['Кассовый сейф в заводоуправлении. Журнал караула там.', 'The vault in the admin building. The guard log is in there.'],
      turnIn: ['Вот журнал караула', 'Here\'s the guard log'],
      done: ['Последняя запись Колина: «Ушёл к градирням, там свет. Буду к утру». Не пришёл… На, держи — это из нашей заначки. Заслужил.', 'Kolya\'s last entry: "Went to the cooling towers, there\'s a light. Back by morning." He never came… Here, take this — from our stash. You\'ve earned it.']
    },
    {
      id: 'zina_kolya', giver: 'zina', reward: 'nagant', boss: true, icon: 'quest_kolya_pass',
      title: ['Коля', 'Kolya'],
      item: ['Пропуск Коли', 'Kolya\'s pass'],
      where: ['Логово у градирен: одолеть Долбильщика, забрать пропуск', 'The lair by the cooling towers: defeat the Pounder, take the pass'],
      offer: [
        ['Видел того, у градирен? Здоровый, с кувалдой. А на плече — наша нашивка, ВОХР. Я её Коле сама пришивала.', 'Have you seen the one by the cooling towers? Huge, with a sledgehammer. And on his shoulder — our guard patch. I sewed it on for Kolya myself.'],
        ['Это Коля, Василий. Был Коля. Отпусти его… А пропуск его принеси — он всегда в нагрудном кармане носил. Хочу, чтобы хоть что-то осталось.', 'That\'s Kolya, Vasiliy. Used to be. Let him go… And bring me his pass — he always kept it in his breast pocket. I want something of him to remain.']
      ],
      accepted: ['Он и раньше был самый сильный в карауле. Бинтов возьми побольше.', 'He was the strongest in the guard even before. Take plenty of bandages.'],
      // Долбильщик уже побеждён, когда Зина просит
      acceptedDown: ['Ты его уже… Значит, отмучился. Пропуск там, у логова, поищи.', 'You already… So his suffering is over. Look for the pass there, by the lair.'],
      progress: ['Логово у градирен. Пропуск — при нём.', 'His lair is by the cooling towers. The pass is on him.'],
      turnIn: ['Вот Колин пропуск', 'Here\'s Kolya\'s pass'],
      done: ['…Рябов Николай Петрович, начальник караула. На фото ещё с усами… Спасибо, Василий. Держи мой наган — пристрелянный. Мне из оружейки ТТ хватит. А ты береги себя.', '…Ryabov, Nikolai Petrovich, head of the guard. Still with his mustache in the photo… Thank you, Vasiliy. Take my Nagant — it\'s well zeroed. A TT from the armory is enough for me. And you take care of yourself.']
    }
  ];
  const byId = {};
  QUESTS.forEach(q => { byId[q.id] = q; });

  // state[id] = { s: 'active' | 'done', got: [true, false, …] }; нет записи — квест ещё не взят
  let state = {}, flags = {};
  let pickups = [], prepared = false, lastLoc = null, tracker = null;

  // --- Сохранение ---
  function saveState() {
    return { state, flags };
  }
  function loadState(v) {
    state = v && v.state ? JSON.parse(JSON.stringify(v.state)) : {};
    flags = v && v.flags ? Object.assign({}, v.flags) : {};
    lastLoc = null;
    onWorld();
  }
  const flag = k => !!flags[k];

  // Сетевой кооп (src/net.js): квесты общие — состояние и предметы на земле ведёт хост
  function netGet() {
    return { state, flags, pickups: pickups.map(p => ({ qi: p.q.id, k: p.k, x: p.x, y: p.y })) };
  }
  function netSet(v) {
    state = v.state || {};
    flags = v.flags || {};
    pickups = (v.pickups || []).map(p => ({ q: byId[p.qi], k: p.k, x: p.x, y: p.y })).filter(p => p.q);
    prepared = true;
  }

  // --- Состояние квеста ---
  const isActive = q => state[q.id] && state[q.id].s === 'active';
  const isDone = q => state[q.id] && state[q.id].s === 'done';
  const gotCount = q => (state[q.id] ? state[q.id].got.filter(Boolean).length : 0);
  const isReady = q => isActive(q) && (q.bring ? canAffordCost(q.bring) : q.clear ? clearLeft(q) === 0
    : gotCount(q) >= (q.find ? q.find.n : 1));
  // Сколько собрано: «2/3» у поиска, «12/30» у «принести», «осталось 5» у зачистки; пусто, если предмет один
  function progressText(q) {
    if (q.bring) return Object.keys(q.bring).map(k => `${Math.min(player.resources[k] || 0, q.bring[k])}/${q.bring[k]}`).join(', ');
    if (q.clear) {
      const left = clearLeft(q);
      return left === null ? '' : L(`осталось ${left}`, `${left} left`);
    }
    return q.find && q.find.n > 1 ? `${gotCount(q)}/${q.find.n}` : '';
  }
  const suffix = (q, a, b = '') => {
    const p = progressText(q);
    return p ? a + p + b : '';
  };
  // Зачистка: сколько жаб района живо — в Промзоне по живым, из города по снимку Промзоны; не была — null
  function clearLeft(q) {
    const list = currentLocation === 'promzona' ? enemies
      : (locationWorlds.promzona && Array.isArray(locationWorlds.promzona.enemies) ? locationWorlds.promzona.enemies : null);
    if (!list) return null;
    return list.filter(e => e.districtId === q.clear && !e.summon && !e.defense && e.type !== 'pounder' && e.type !== 'boss').length;
  }
  // Долбильщик побеждён: в Промзоне его нет, из города — по снимку Промзоны
  const bossDown = () => (currentLocation === 'promzona' ? !pounderRef
    : !!(locationWorlds.promzona && locationWorlds.promzona.pounderDefeated));
  let bossAt = null;   // где Долбильщик был последний раз — там и пропуск, когда он падёт

  // Квест, который сейчас у этого выжившего: первый не сданный по цепочке
  const current = giver => QUESTS.find(q => q.giver === giver && !isDone(q)) || null;
  const available = () => !!window.Defense && window.Defense.stage === 'done';

  // Значок над головой: 'new' — есть что предложить, 'ready' — можно сдать
  function marker(giver) {
    const q = current(giver);
    if (!q || !available()) return null;
    if (isReady(q)) return 'ready';
    return state[q.id] ? null : 'new';
  }

  // Тайники с предметами квеста: район и тип, первые по порядку (раскладка Промзоны постоянная)
  function targets(q) {
    if (currentLocation !== 'promzona' || !q.find) return [];
    return containers.filter(c => c.districtId === q.find.district && q.find.types.includes(c.type)).slice(0, q.find.n);
  }

  // --- Тема «Есть работа?» в окне диалога: [надпись, действие] ---
  // ui — из src/dialog.js: say(text, options), menu(text), pages(list, then), bye
  function topic(giver, ui) {
    const q = current(giver);
    const work = L('Есть работа?', 'Got any work?');
    if (!q) return [work, () => ui.menu(L('Пока ничего. Спасибо тебе, Василий.', 'Nothing for now. Thank you, Vasiliy.'))];
    if (isReady(q)) return [`★ ${T(q.turnIn)}`, () => turnIn(q, ui)];
    if (isActive(q)) {
      return [work, () => ui.menu(T(q.progress) + suffix(q, ' (', ')'))];
    }
    return [`★ ${work}`, () => ui.pages(q.offer.map(T), last => ui.say(last, [
      [L('Берусь', 'I\'m on it'), () => accept(q, ui)],
      [L('Не сейчас', 'Not now'), () => ui.menu(L('Ну, как надумаешь.', 'Well, whenever you\'re ready.'))]
    ]))];
  }

  // Взять, сдать, набрать пробу — и сетевым товарищам (netAction в game.js). Хост отвечает в пустое окно:
  // реплики показывает окно диалога у самого игрока
  const NO_UI = { say() {}, menu() {}, pages() {} };
  const accept = netAction('q.accept', acceptRaw, ([q]) => [q.id], ([id]) => [byId[id], NO_UI]);
  const turnIn = netAction('q.turnIn', turnInRaw, ([q]) => [q.id], ([id]) => [byId[id], NO_UI]);

  function acceptRaw(q, ui) {
    if (!q || state[q.id]) return;
    state[q.id] = { s: 'active', got: Array(q.find ? q.find.n : q.sample || q.boss ? 1 : 0).fill(false) };
    prepared = false;
    showToast(L('НОВОЕ ЗАДАНИЕ', 'NEW QUEST'), `${T(q.title)} — ${T(q.where)}`);
    SoundFX.reload();
    if (window.Menu) window.Menu.requestSave();
    ui.menu(T(q.boss && q.acceptedDown && bossDown() ? q.acceptedDown : q.accepted));
  }

  // Сдал один — квест закрыт у всех, награда — ему (кооп: player — тот, кто сдаёт)
  function turnInRaw(q, ui) {
    if (!q || !state[q.id] || state[q.id].s === 'done') return;
    state[q.id].s = 'done';
    if (q.bring) payCost(q.bring);
    giveReward(q);
    showToast(L('ЗАДАНИЕ ВЫПОЛНЕНО', 'QUEST COMPLETE'), T(q.title));
    SoundFX.batSwing(true);
    if (window.Menu) window.Menu.requestSave();
    ui.menu(T(q.done));
  }

  function giveReward(q) {
    flags[q.reward] = true;
    if (q.reward === 'freeUpgrade') player.freeUpgrade = true;
    if (q.reward === 'launcher' && window.Workshop) window.Workshop.giveLauncher();
    if (q.reward === 'blueprint') {
      player.resources.blueprint = (player.resources.blueprint || 0) + 1;
      addFloatingText(player.x - 40, player.y - 50, L('+1 ЧЕРТЁЖ', '+1 BLUEPRINT'), '#60a5fa');
    }
    if (q.reward === 'nagant') {
      // Наган Зины: сразу с собой и в руках, барабан полный и 28 в запас
      player.unlockedWeapons.nagant = true;
      player.equipped.nagant = true;
      player.ammo.nagant.clip = player.ammo.nagant.maxClip;
      player.ammo.nagant.reserve += 28;
      applyHotbarOrder();
      window.switchWeapon('nagant');
    }
    if (q.reward === 'armory') {
      // Заначка ВОХР: патроны к купленным стволам и бинты — у ног Василия
      const drop = [['bandage', 3]];
      if (player.unlockedWeapons.makarov) drop.push(['ammo_9x18', 36]);
      if (player.unlockedWeapons.shotgun) drop.push(['ammo_12g', 18]);
      drop.forEach(([type, val], i) => spawn3DLootItem(player.x - 40 + i * 40, player.y + 50, type, val));
    }
  }

  // --- Мир: предметы на земле, громила у аппарата ---
  // Новый мир (generateWorld): предметы и охрана расставятся заново, когда мир загрузится
  function onWorld() {
    pickups = [];
    prepared = false;
  }

  function prepare() {
    prepared = true;
    const from = lastLoc;
    lastLoc = currentLocation;
    // Пост Степаныча: при каждом возвращении из Промзоны — патроны у мешков
    if (currentLocation === 'city' && from === 'promzona' && flag('postAmmo')) postAmmo();
    if (currentLocation !== 'promzona') return;
    QUESTS.forEach(q => {
      if (!isActive(q)) return;
      targets(q).forEach((c, k) => {
        if (state[q.id].got[k]) return;
        // Тайник уже обыскан — предмет ждёт рядом
        if (c.searched) dropItem(q, k, c);
      });
      if (q.guard && !isReady(q)) spawnGuard(q);
    });
  }

  function postAmmo() {
    const drop = [['bandage', 1]];
    if (player.unlockedWeapons.makarov) drop.push(['ammo_9x18', 18]);
    if (player.unlockedWeapons.shotgun) drop.push(['ammo_12g', 8]);
    if (player.unlockedWeapons.nagant) drop.push(['ammo_762n', 7]);
    drop.forEach(([type, val], i) => spawn3DLootItem(5555 - 40 + i * 40, 300, type, val));
    addFloatingText(5480, 260, L('Степаныч: «Бери, заслужил»', 'Stepanych: "Take it, you earned it"'), '#fde68a');
  }

  // Громила-«Бригадир» у ЗИЛа с аппаратом: элитный, в броне. Не сохраняется — встаёт при каждом входе
  function spawnGuard(q) {
    const c = targets(q)[0];
    if (!c || enemies.some(e => e.questGuard === q.id)) return;
    const x = c.x + 90, y = c.y + 40;
    const hp = Math.round(900 * ENEMY_HP_SCALE);
    enemies.push({
      x, y, startX: x, startY: y, bounds: { x1: c.x - 500, y1: c.y - 400, x2: c.x + 500, y2: c.y + 400 },
      districtId: c.districtId, tier: 4, radius: 38, hp, maxHp: hp, speed: 1.9, type: 'brute', color: '#a855f7',
      armor: 0.6, throwCooldown: 200, aggroRadius: 520, isAggroed: false, hitFlash: 0,
      patrolAngle: 0, patrolTimer: 90, shootCooldown: 120, summon: true, questGuard: q.id, elite: true
    });
  }

  function dropItem(q, k, c) {
    if (pickups.some(p => p.q === q && p.k === k)) return;
    const a = Math.atan2(player.y - c.y, player.x - c.x);
    pickups.push({ q, k, x: c.x + Math.cos(a) * (c.radius + 34), y: c.y + Math.sin(a) * (c.radius + 26) });
  }

  // Тайник обыскан или сейф вскрыт (game.js scavengeContainer, src/safes.js crack)
  function onSearched(c) {
    if (currentLocation !== 'promzona') return;
    QUESTS.forEach(q => {
      if (!isActive(q)) return;
      const k = targets(q).indexOf(c);
      if (k >= 0 && !state[q.id].got[k]) dropItem(q, k, c);
    });
  }

  function pickUp(p) {
    const st = state[p.q.id];
    st.got[p.k] = true;
    pickups.splice(pickups.indexOf(p), 1);
    const n = p.q.find ? p.q.find.n : 1;
    const giver = window.Defense.SURVIVORS.find(s => s.id === p.q.giver);
    const name = giver ? L(giver.name[0], giver.name[1]) : '';
    addFloatingText(p.x - 50, p.y - 50, `+ ${T(p.q.item)}${n > 1 ? ` ${gotCount(p.q)}/${n}` : ''}`, '#fbbf24');
    if (isReady(p.q)) showToast(T(p.q.title), L(`Найдено. Отнеси — ${name}, Новохмуринск`, `Found. Take it to ${name} in Novokhmurinsk`));
    createParticles(p.x, p.y - 10, '#fbbf24', 14);
    SoundFX.reload();
    if (window.Menu) window.Menu.requestSave();
  }

  function bossDrops() {
    if (currentLocation !== 'promzona') return;
    if (pounderRef) {
      bossAt = { x: pounderRef.x, y: pounderRef.y };
      return;
    }
    QUESTS.forEach(q => {
      if (!q.boss || !isActive(q) || state[q.id].got[0] || pickups.some(p => p.q === q)) return;
      const at = bossAt || POUNDER_HOME;
      pickups.push({ q, k: 0, x: at.x, y: at.y + 50 });
    });
  }

  function update() {
    if (!prepared) prepare();
    bossDrops();
    // Предмет квеста подбирает любой из игроков — квест общий
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (players.some(pl => !pl.dead && !(pl.downT > 0) && Math.hypot(pl.x - p.x, pl.y - p.y) < PICK_R)) pickUp(p);
    }
    updateTracker();
  }

  // Значки предметов (icon): assets/sprites/quest/ (tools/make_trophy_sprites.py quest) — на земле и в журнале
  const iconSrc = q => (q.bring ? RES_DISPLAY[Object.keys(q.bring)[0]].img : `assets/sprites/quest/${q.icon}.png?v=1`);
  const ICONS = {};
  QUESTS.forEach(q => {
    ICONS[q.id] = new Image();
    ICONS[q.id].src = iconSrc(q);
  });

  // --- Проба шлама: первая лужа шлам-прудов (раскладка луж постоянная), E рядом ---
  const SAMPLE_R = 90;
  const sampleQuest = () => QUESTS.find(q => q.sample && isActive(q) && !state[q.id].got[0]) || null;
  const sampleSpot = () => (currentLocation === 'promzona' && bioPuddles.length ? bioPuddles[0] : null);
  function nearSample() {
    const q = sampleQuest(), p = sampleSpot();
    return !!(q && p && Math.hypot(player.x - p.x, (player.y - p.y) / GROUND_SQUASH) < SAMPLE_R);
  }
  const samplePrompt = () => L('[E] Набрать пробу шлама', '[E] Take a sludge sample');
  const takeSample = netAction('q.sample', takeSampleRaw);
  function takeSampleRaw() {
    const q = sampleQuest();
    if (!q || !nearSample()) return;
    state[q.id].got[0] = true;
    const giver = window.Defense.SURVIVORS.find(s => s.id === q.giver);
    const name = giver ? L(giver.name[0], giver.name[1]) : '';
    addFloatingText(player.x - 50, player.y - 50, `+ ${T(q.item)}`, '#a3e635');
    showToast(T(q.title), L(`Проба набрана. Отнеси — ${name}, Новохмуринск`, `Sample taken. Take it to ${name} in Novokhmurinsk`));
    createParticles(player.x, player.y - 10, '#a3e635', 14);
    SoundFX.reload();
    if (window.Menu) window.Menu.requestSave();
  }

  // --- Отрисовка ---
  // Предмет на земле: светится и подпрыгивает; над тайником с предметом — «!»
  function drawWorld(ctx) {
    if (currentLocation !== 'promzona') return;
    const now = performance.now() / 1000;
    pickups.forEach(p => {
      const bob = Math.sin(now * 4 + p.k) * 3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40);
      g.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
      g.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 40, 40 * GROUND_SQUASH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const icon = ICONS[p.q.id];
      if (icon && icon.complete && icon.naturalWidth) {
        ctx.drawImage(icon, p.x - 21, p.y - 44 + bob, 42, 42);
        drawLabel(ctx, p.x, p.y - 48 + bob, T(p.q.item));
        return;
      }
      // Пока значок не загрузился — ящичек
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(p.x - 11, p.y - 22 + bob, 22, 16, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#451a03';
      ctx.fillRect(p.x - 4, p.y - 26 + bob, 8, 4);
      ctx.restore();
      drawLabel(ctx, p.x, p.y - 34 + bob, T(p.q.item));
    });
  }

  // «!» над тайником с предметом — поверх всего, иначе его закрыл бы сам тайник (грузовик, вагон)
  function drawOverlay(ctx) {
    if (currentLocation !== 'promzona') return;
    const now = performance.now() / 1000;
    QUESTS.forEach(q => {
      if (!isActive(q)) return;
      targets(q).forEach((c, k) => {
        if (state[q.id].got[k] || c.searched) return;
        drawBang(ctx, c.x, c.y - 70 + Math.sin(now * 3 + k) * 4, '!');
      });
    });
    // Зачистка: последние жабы района — с «!», чтобы не искать их по всем закоулкам
    QUESTS.forEach(q => {
      if (!q.clear || !isActive(q)) return;
      const left = enemies.filter(e => e.districtId === q.clear && !e.summon && !e.defense && e.type !== 'pounder');
      if (left.length === 0 || left.length > CLEAR_HINT) return;
      left.forEach((e, k) => drawBang(ctx, e.x, e.y - (e.radius || 20) - 40 + Math.sin(now * 3 + k) * 4, '!'));
    });
    // Лужа, где набрать пробу шлама
    const sp = sampleQuest() ? sampleSpot() : null;
    if (sp) drawBang(ctx, sp.x, sp.y - 60 + Math.sin(performance.now() / 1000 * 3) * 4, '!');
  }

  function drawLabel(ctx, x, y, text) {
    ctx.save();
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Жёлтый знак в кружке: «!» — новый квест или тайник с предметом, «?» — можно сдать
  function drawBang(ctx, x, y, ch) {
    ctx.save();
    ctx.fillStyle = ch === '?' ? '#22c55e' : '#f59e0b';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1c1917';
    ctx.fillText(ch, x, y + 1);
    ctx.restore();
  }

  // --- Строка прогресса: слева под полосками здоровья ---
  function lines() {
    return QUESTS.filter(isActive).map(q => {
      const giver = window.Defense.SURVIVORS.find(s => s.id === q.giver);
      const name = giver ? L(giver.name[0], giver.name[1]) : '';
      const ready = q.clear ? L(`доложи — ${name}`, `report to ${name}`) : L(`отнеси — ${name}`, `bring it to ${name}`);
      return { q, title: T(q.title), text: isReady(q) ? ready : `${T(q.where)}${suffix(q, q.clear ? ' — ' : ' ')}`, ready: isReady(q) };
    });
  }

  function updateTracker() {
    if (!tracker) {
      tracker = document.createElement('div');
      tracker.id = 'quest-tracker';
      tracker.style.cssText = 'position:absolute;top:96px;left:14px;z-index:11;pointer-events:none;display:none;' +
        'max-width:300px;font:600 12px "Segoe UI",sans-serif;color:#e2e8f0;text-shadow:0 1px 2px #000';
      (document.getElementById('game-container') || document.body).appendChild(tracker);
    }
    const list = gameState === 'PLAYING' ? lines() : [];
    const key = currentLang + list.map(l => l.title + l.text).join('|');
    tracker.style.display = list.length ? 'block' : 'none';
    if (tracker.dataset.key === key) return;
    tracker.dataset.key = key;
    tracker.innerHTML = '';
    list.forEach(l => {
      const d = document.createElement('div');
      d.style.cssText = 'margin-bottom:4px;background:rgba(12,16,24,0.7);border-left:3px solid ' +
        (l.ready ? '#22c55e' : '#f59e0b') + ';padding:3px 8px';
      d.innerHTML = '<b style="color:#fbbf24"></b><br><span style="color:#cbd5e1;font-weight:500"></span>';
      d.querySelector('b').textContent = l.title;
      d.querySelector('span').textContent = l.text;
      tracker.append(d);
    });
  }

  // --- Журнал (вкладка окна инвентаря, src/inventory.js): [{ title, giver, text, state }] ---
  function journal() {
    return QUESTS.filter(q => state[q.id]).map(q => {
      const giver = window.Defense.SURVIVORS.find(s => s.id === q.giver);
      const ready = q.clear ? L('Зачищено — доложить в Новохмуринске', 'Cleared — report back in Novokhmurinsk')
        : q.bring || q.sample ? L('Собрано — отнести в Новохмуринск', 'Collected — take it back to Novokhmurinsk')
        : L('Найдено — отнести в Новохмуринск', 'Found — take it back to Novokhmurinsk');
      return {
        icon: iconSrc(q),
        title: T(q.title), giver: giver ? L(giver.name[0], giver.name[1]) : '',
        text: isDone(q) ? T(q.done) : isReady(q) ? ready : `${T(q.where)}${suffix(q, ' — ')}`,
        state: isDone(q) ? 'done' : isReady(q) ? 'ready' : 'active'
      };
    });
  }

  return { saveState, loadState, netGet, netSet, refreshTracker: () => updateTracker(), flag, marker, topic, onWorld, onSearched, update, drawWorld, drawOverlay, drawBang, journal,
    nearSample, samplePrompt, takeSample, sampleSpot: () => (sampleQuest() ? sampleSpot() : null) };
})();
