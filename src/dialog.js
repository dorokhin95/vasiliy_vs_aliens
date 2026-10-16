// Окно диалога со спасёнными в городе (docs/LEVEL2_PROMZONA.md, раздел 7, «Разговоры и квесты»).
// E у выжившего (src/settlers.js) — игра на паузе (gameState 'DIALOG'), внизу экрана панель: слева портрет,
// имя и роль, справа реплика (печатается по буквам; E, пробел, Enter или клик — сразу целиком), под ней
// варианты ответа (1–9 или мышью). ESC — закрыть.
// Темы: «Расскажи о себе» (несколько страниц), «Что слышно на заводе?» (подсказки, по одной за раз, по кругу),
// «Есть работа?» (выдача и сдача квестов — src/quests.js), у Толика и Лены — мастерская и столовая,
// у Зины после оружейки — «Про Колю», «Бывай». У Серёги работы нет — он рассказывает истории.
// Портреты — tools/make_survivor_portraits.py (временные, из листа выживших).
// Скрипты обычные, без модулей: gameState, keys, mouseDown, currentLang — из game.js.
window.Dialog = (function () {
  const $ = id => document.getElementById(id);
  const L = (r, e) => (currentLang === 'ru' ? r : e);
  const T = pair => L(pair[0], pair[1]);
  const TYPE_SPEED = 2;            // символов за шаг печати (шаг — 16 мс)

  const LABELS = {
    about: ['Расскажи о себе', 'Tell me about yourself'],
    rumors: ['Что слышно на заводе?', 'Any news from the plant?'],
    stories: ['Расскажи что-нибудь', 'Tell me something'],
    work: ['Есть работа?', 'Got any work?'],
    workshop: ['Мастерская', 'Workshop'],
    canteen: ['Столовая', 'Canteen'],
    next: ['Дальше', 'Next'],
    bye: ['Бывай', 'See you'],
    hint: ['E — дальше · 1–9 — ответ · ESC — закрыть', 'E — next · 1–9 — answer · ESC — close']
  };

  // Кто что говорит. about — страницы по порядку; rumors — по одной за раз, по кругу; work, place — один ответ
  const CHARS = {
    stepanych: {
      role: ['Бригадир литейного цеха · пост у пролома', 'Foundry foreman · breach post'],
      greet: [
        ['А, Василий. Тихо пока. Ну, почти.', 'Ah, Vasiliy. Quiet for now. Well, almost.'],
        ['Рассказывай, как там на заводе?', 'So, how\'s it going at the plant?']
      ],
      about: [
        ['Сорок лет на заводе. Тридцать из них — в литейке, бригадиром. Чугун лили такой, что на полстраны хватало.', 'Forty years at the plant. Thirty of them in the foundry, as foreman. We poured enough iron for half the country.'],
        ['Завод закрыли — а я остался. Сторожем при цехе, считай. Куда мне ехать? Тут всё моё.', 'They shut the plant — I stayed. A watchman at the shop, more or less. Where would I go? Everything I have is here.'],
        ['Как жабы полезли — собрал кого смог. Бригада моя в цеху осталась… Не все дошли до проходной.', 'When the toads came, I gathered whoever I could. My crew stayed in the shop… Not all of them made it to the gate.']
      ],
      rumors: [
        ['Штурмовики эти, с плазменными автоматами: дай им очередь подлиннее — перегреются, пар пойдёт. Вот тогда и бей.', 'Those stormtroopers with plasma rifles: let them fire a long burst — they overheat and start steaming. That\'s when you hit them.'],
        ['В литейном теперь жаб полно. Печи остывали долго, тепло — им нравится.', 'The foundry is full of toads now. The furnaces took ages to cool down, it\'s warm — they love it.'],
        ['Ракетчик после залпа пустой ходит. Секунд сорок у тебя есть, пока он перезарядится.', 'A rocketeer is empty after a volley. You\'ve got about forty seconds before he reloads.']
      ],
      work: true
    },
    zina: {
      role: ['Вохровка с проходной · пост у пролома', 'Plant guard · breach post'],
      greet: [
        ['Стой, кто идёт! …А, это ты. Проходи.', 'Halt, who goes there! …Oh, it\'s you. Come on in.'],
        ['Пропуск предъявляем! Шучу. Ноги только вытирай.', 'Show your pass! Kidding. Just wipe your feet.']
      ],
      about: [
        ['Двадцать лет на проходной. Пропуска, досмотр, несунов ловила — всех знаю, кто тут работал.', 'Twenty years at the gate. Passes, searches, catching thieves — I know everyone who ever worked here.'],
        ['Наган мне от деда достался. В ВОХРе другой выдали, а я свой носила — привычнее.', 'The revolver was my granddad\'s. The guard service issued me another, but I carried mine — feels right.'],
        ['Напарник у меня был, Коля. Начальник караула. Как градирни засветились — пошёл посмотреть. С тех пор не видела.', 'I had a partner, Kolya. Head of the guard. When the cooling towers lit up, he went to take a look. Haven\'t seen him since.']
      ],
      rumors: [
        ['Снайперы ихние на рампах складов сидят. По открытому не бегай — перебежками.', 'Their snipers sit on the warehouse ramps. Don\'t run across open ground — dash from cover to cover.'],
        ['На градирнях по ночам свет фиолетовый. И гудит что-то, как трансформатор. Нехорошее место.', 'The cooling towers glow purple at night. And something hums there like a transformer. Bad place.'],
        ['Сейфы в конторах не ломай — код подбирай. Шкафы старые: ошибёшься много — заклинит.', 'Don\'t smash the office safes — work out the code. They\'re old: too many mistakes and they jam.']
      ],
      work: true,
      // Открывается, когда сдана «Оружейка ВОХР»
      extra: ['armory', ['Про Колю', 'About Kolya'], [
        ['Коля начальником караула был. Здоровый, громкий — на проходной его все боялись. А я знала: добрый он.', 'Kolya was head of the guard. Big, loud — everyone at the gate was scared of him. But I knew: he was kind.'],
        ['Как градирни засветились, он один пошёл. Сказал: «Проверю, Зин, и назад». Не вернулся.', 'When the cooling towers lit up, he went alone. Said: "I\'ll check it out, Zin, and come right back." He never did.'],
        ['Серёга говорит, по заводу теперь ходит кто-то с молотом. В бушлате нашем, ВОХРовском, с полосами… Не хочу думать, что это он.', 'Seryoga says someone with a hammer walks the plant now. In our guard jacket, with the stripes… I don\'t want to think it\'s him.']
      ]]
    },
    tolik: {
      role: ['Сварщик · мастерская', 'Welder · workshop'],
      greet: [
        ['О, Василий! Заходи, только под искры не лезь.', 'Hey, Vasiliy! Come in, just stay clear of the sparks.'],
        ['Чего надо? Шучу. Рад видеть.', 'What do you want? Kidding. Good to see you.']
      ],
      about: [
        ['Сварщик шестого разряда. Хоть трубу, хоть танк — всё сварю, было бы чем.', 'Top-grade welder. A pipe or a tank — I\'ll weld anything, as long as I have the gear.'],
        ['Маску не снимаю — привычка. Да и жабы её, кажется, боятся: думают, у меня глаз железный.', 'I never take the mask off — habit. And the toads seem scared of it: they think I\'ve got an iron eye.'],
        ['Мастерскую вот обустраиваю. Верстак есть, баллоны есть. Аппарата нет — в механическом остался.', 'Setting up a workshop. Got a bench, got the tanks. No welder though — it stayed in the machine shops.']
      ],
      rumors: [
        ['Ракетчики пусковые свои из нашего же железа клепают. Заряды у них — квакнутая химия, но рвётся знатно.', 'The rocketeers rivet their launchers out of our own scrap. Their charges are toad chemistry, but they blow up nicely.'],
        ['В механических цехах проходы узкие, а там громилы — не разбежишься. Бери что-нибудь для ближнего.', 'The machine shops have narrow aisles, and brutes in them — no room to run. Bring something for close quarters.'],
        ['Цветмет ищи в катушках кабеля и на подстанции. Медь — она везде, где ток был.', 'Look for nonferrous metal in cable drums and at the substation. Copper is wherever there was current.']
      ],
      work: true,
      place: ['workshop', ['Пока не работает: варить нечем. Аппарат нужен — без него только гвозди в биту гнуть.', 'Not open yet: nothing to weld with. I need my rig — without it I can only bend nails into your bat.'],
        ['Аппарат на месте, настраиваю. Скоро открою — заходи.', 'The rig is here, I\'m setting it up. Opening soon — drop by.']]
    },
    lena: {
      role: ['Лаборантка · столовая', 'Lab assistant · canteen'],
      greet: [
        ['Василий! Цел? Дай посмотрю… Ладно, живой.', 'Vasiliy! In one piece? Let me look… Fine, you\'ll live.'],
        ['Котёл кипит. Проголодаешься — скажи.', 'The pot is boiling. Get hungry — just say.']
      ],
      about: [
        ['Я в заводской лаборатории работала. Анализы, пробы шлама, реактивы… Скучно было. Было.', 'I worked in the plant lab. Tests, sludge samples, reagents… It was boring. Was.'],
        ['Медицине нигде не училась — только курсы при профкоме. Серёгу перевязывать пришлось уже по ходу.', 'I never studied medicine — just a union first-aid course. I learned on the job, patching up Seryoga.'],
        ['Записи мои в лаборатории остались — журнал проб. Если по жабам что и понять, то только по нему.', 'My notes stayed in the lab — the sample log. If anything can explain the toads, it\'s that.']
      ],
      rumors: [
        ['Шлам в прудах жабам как лекарство, а человека жжёт. Не стой в нём.', 'The sludge in the ponds heals toads but burns people. Don\'t stand in it.'],
        ['Из жабьих лапок — бульон, из печени — настойка. Не смейся, я анализы делала: это съедобно.', 'Toad legs make broth, the liver makes a tincture. Don\'t laugh, I ran the tests: it\'s edible.'],
        ['Технический спирт — в цистернах на сортировке. Мне бы его, для настоек.', 'There\'s industrial alcohol in the tank cars at the rail yard. I could use it for tinctures.']
      ],
      work: true,
      place: ['canteen', ['Котёл есть, огонь есть. Рецептов нет — всё в журнале осталось.', 'I have a pot and a fire. No recipes — they\'re all in my log.'],
        ['Журнал при мне, рецепты разбираю. Скоро будет чем кормить — заходи.', 'I have my log, sorting out the recipes. Soon there\'ll be food — drop by.']]
    },
    seryoga: {
      role: ['Слесарь', 'Fitter'],
      greet: [
        ['Василий! Садись, расскажу чего.', 'Vasiliy! Sit down, I\'ve got a story.'],
        ['Нога? Нормально, хожу же.', 'The leg? Fine, I\'m walking, aren\'t I.']
      ],
      about: [
        ['Слесарь я. Был. Год как из ПТУ — и на тебе, жабы.', 'I\'m a fitter. Was. A year out of trade school — and then, toads.'],
        ['Кислотой ногу обожгло, когда из механического выбирались. Если б не ты — там бы и остался. Спасибо, что перевязал.', 'Acid burned my leg when we were getting out of the machine shop. If not for you, I\'d have stayed there. Thanks for patching me up.']
      ],
      stories: [
        ['Я в ночную видел: градирня светилась фиолетовым. Думал — мерещится. А Коля, начальник караула, пошёл проверить…', 'On a night shift I saw a cooling tower glowing purple. Thought I was seeing things. And Kolya, the head guard, went to check…'],
        ['Михалыч говорит, ты Мясника битой уложил. Правда, что ли?', 'Mikhalych says you took down the Butcher with a bat. For real?'],
        ['Степаныч ворчит, а сам по ночам жаб считает — не спит.', 'Stepanych grumbles, but he counts toads all night — never sleeps.'],
        ['Говорят, у Михалыча в ларьке есть всё. Даже то, чего нет.', 'They say Mikhalych\'s kiosk has everything. Even things that don\'t exist.']
      ]
    }
  };

  let who = null, settler = null;
  let full = '', shown = 0, typer = 0, options = [];
  const rumorAt = {};

  const isOpen = () => gameState === 'DIALOG';

  function open(s) {
    if (gameState !== 'PLAYING' || !CHARS[s.def.id]) return;
    who = s.def.id;
    settler = s;
    gameState = 'DIALOG';
    // Отпущенные, пока окно открыто, клавиши иначе «залипают»
    for (const k in keys) keys[k] = false;
    mouseDown = false;
    const c = CHARS[who];
    $('dialog-portrait').src = `assets/sprites/portraits/${who}.webp?v=1155`;
    $('dialog-name').textContent = L(s.def.name[0], s.def.name[1]);
    $('dialog-role').textContent = T(c.role);
    $('dialog-hint').textContent = T(LABELS.hint);
    $('dialog-panel').style.display = 'flex';
    menu(T(c.greet[Math.floor(Math.random() * c.greet.length)]));
  }

  function close() {
    if (!isOpen()) return;
    clearInterval(typer);
    $('dialog-panel').style.display = 'none';
    gameState = 'PLAYING';
    if (settler) settler.talkT = 60 * 2;      // ещё постоит, глядя на Василия
    who = null;
    settler = null;
  }

  // Реплика и варианты ответа: [надпись, действие]. Варианты показываются, когда реплика допечатана
  function say(text, opts) {
    full = personalize(text); // кооп: к игроку — по его имени (game.js)
    shown = 0;
    options = opts;
    $('dialog-options').innerHTML = '';
    clearInterval(typer);
    typer = setInterval(() => {
      shown = Math.min(full.length, shown + TYPE_SPEED);
      $('dialog-text').textContent = full.slice(0, shown);
      if (shown >= full.length) finishTyping();
    }, 16);
  }

  function finishTyping() {
    clearInterval(typer);
    shown = full.length;
    $('dialog-text').textContent = full;
    renderOptions();
  }

  function renderOptions() {
    const box = $('dialog-options');
    if (box.childElementCount) return;
    options.forEach(([label, act], i) => {
      const b = document.createElement('button');
      b.className = 'dialog-option';
      b.innerHTML = '<kbd></kbd><span></span>';
      b.querySelector('kbd').textContent = i + 1;
      b.querySelector('span').textContent = label;
      b.addEventListener('click', () => choose(i));
      box.append(b);
    });
  }

  function choose(i) {
    if (shown < full.length) { finishTyping(); return; }
    const o = options[i];
    if (o) o[1]();
  }

  // Темы разговора — после каждой реплики снова список тем
  function topics() {
    const c = CHARS[who];
    const list = [[T(LABELS.about), () => pages(c.about, 0)]];
    if (c.rumors) list.push([T(LABELS.rumors), () => rotate('rumors')]);
    if (c.stories) list.push([T(LABELS.stories), () => rotate('stories')]);
    if (c.work && window.Quests) list.push(window.Quests.topic(who, ui));
    if (c.extra && window.Quests && window.Quests.flag(c.extra[0])) list.push([T(c.extra[1]), () => pages(c.extra[2], 0)]);
    if (c.place) {
      const open = window.Quests && window.Quests.flag(c.place[0]);
      // Мастерская работает — тема открывает её окно (src/workshop.js)
      if (open && c.place[0] === 'workshop' && window.Workshop) list.push([`🔧 ${T(LABELS.workshop)}`, () => window.Workshop.open()]);
      // Столовая — так же: окно блюд (src/canteen.js)
      else if (open && c.place[0] === 'canteen' && window.Canteen) list.push([`🍲 ${T(LABELS.canteen)}`, () => window.Canteen.open()]);
      else list.push([T(LABELS[c.place[0]]), () => menu(T(c.place[open ? 2 : 1]))]);
    }
    list.push([T(LABELS.bye), close]);
    return list;
  }

  function menu(text) {
    say(text, topics());
  }

  // Несколько страниц подряд: «Дальше», на последней — снова темы (или then(текст последней))
  function pages(list, i, then = menu) {
    if (i >= list.length - 1) then(T(list[list.length - 1]));
    else say(T(list[i]), [[T(LABELS.next), () => pages(list, i + 1, then)]]);
  }

  // Для квестов (src/quests.js): реплика с ответами, реплика со списком тем, страницы подряд
  const ui = {
    say: (text, opts) => say(text, opts),
    menu: text => menu(text),
    pages: (texts, then) => pages(texts.map(s => [s, s]), 0, then)
  };

  // Подсказки и истории — по одной за раз, по кругу
  function rotate(kind) {
    const list = CHARS[who][kind], key = who + kind;
    const i = rumorAt[key] || 0;
    rumorAt[key] = i + 1;
    menu(T(list[i % list.length]));
  }

  // Клавиши, пока окно открыто (game.js keydown): true — забрали
  function handleKey(e) {
    if (!isOpen()) return false;
    if (e.code === 'Escape') {
      close();
      return true;
    }
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
      if (shown < full.length) finishTyping();
      else if (options.length === 1) choose(0);
      return true;
    }
    const digit = /^(Digit|Numpad)[1-9]$/.test(e.code) ? Number(e.code.slice(-1)) : 0;
    if (digit) {
      choose(digit - 1);
      return true;
    }
    return true;
  }

  // Клик по реплике — допечатать
  $('dialog-text').addEventListener('click', () => { if (shown < full.length) finishTyping(); });

  return { open, close, isOpen, handleKey };
})();
