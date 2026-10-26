// Василий против пришельцев — комиксы во весь экран с подписью (RU/EN), плавная смена и лёгкий наезд камеры.
// intro — предыстория, 12 кадров: перед самым первым забегом (флаг vasiliy.introSeen) и по кнопке
// «Предыстория» в меню. promzona — переход во вторую локацию, 8 кадров: при первом шаге в пролом (src/game.js).
// pounder — один кадр: Долбильщик впервые заметил Василия (src/game.js, introducePounder; флаг vasiliy.pounderIntroSeen).
// Управление: клик / пробел / Enter / → — дальше, ← — назад, ESC или кнопка — пропустить.
// Раскадровка и промты: предыстория — docs/INTRO_COMIC.md, переход — docs/LEVEL2_PROMZONA.md, раздел 6.

window.Comic = (() => {
  const INTRO = [
    {
      img: 'assets/comic/intro_01.webp',
      ru: 'Новохмуринск. Город, о котором забыли все.',
      en: 'Novokhmurinsk. A town everyone has forgotten.'
    },
    {
      img: 'assets/comic/intro_02.webp',
      ru: 'Когда-то Василий был{|а} инженером НИИ. Он{|а} чертил{|а} будущее.',
      en: 'Once, Vasiliy was an engineer at a research institute. He drew the future.'
    },
    {
      img: 'assets/comic/intro_03.webp',
      ru: 'Потом будущее закрыли на замок. Вместе с НИИ.',
      en: 'Then the future was locked away. Along with the institute.'
    },
    {
      img: 'assets/comic/intro_04.webp',
      ru: 'Тридцать лет спустя у него остались ушанка, теплотрасса и мешок стеклотары.',
      en: 'Thirty years later, all he had left was an ushanka, a heating main and a bag of empty bottles.'
    },
    {
      img: 'assets/comic/intro_05.webp',
      ru: 'А однажды осенью с неба посыпались звёзды.',
      en: 'Then one autumn night, the stars started falling.'
    },
    {
      img: 'assets/comic/intro_06.webp',
      ru: 'Это были не звёзды. Это были десантные капсулы Болотной Империи Квак\'Тулху.',
      en: 'They weren\'t stars. They were landing pods of the Swamp Empire of Kvak\'Tulhu.'
    },
    {
      img: 'assets/comic/intro_07.webp',
      ru: 'Армия продержалась три дня. Кого не превратили в икру — разбежались.',
      en: 'The army held out for three days. Whoever wasn\'t turned into spawn ran away.'
    },
    {
      img: 'assets/comic/intro_08.webp',
      ru: 'Флагман рухнул в заброшенный торговый центр. Там поселился Император Квакула.',
      en: 'The flagship crashed into the abandoned shopping mall. Emperor Kvakula made it his throne room.'
    },
    {
      img: 'assets/comic/intro_09.webp',
      ru: 'А в северо-восточном гнезде жабы вывели на Земле кое-что пострашнее себя. Золотого Мясника.',
      en: 'And in the north-eastern nest, the toads bred something on Earth scarier than themselves. The Golden Butcher.'
    },
    {
      img: 'assets/comic/intro_10.webp',
      ru: 'Жабий яд валил с ног любого. Но не т{ого|у}, кто тридцать лет пил{|а} «Тройной» одеколон.',
      en: 'Toad venom brought down anyone. Anyone but a man who\'d been drinking cheap cologne for thirty years.'
    },
    {
      img: 'assets/comic/intro_11.webp',
      ru: 'У Михалыча нашёлся дедовский обрез. А у Василия — инженерная голова.',
      en: 'Mikhalych had an old sawed-off shotgun. Vasiliy had an engineer\'s head.'
    },
    {
      img: 'assets/comic/intro_12.webp',
      ru: 'Новохмуринск ещё не сдался. Пока жив{|а} {хозяин|хозяйка} теплотрассы.',
      en: 'Novokhmurinsk hasn\'t given up yet. Not while the master of the heating main still lives.'
    }
  ];
  const PROMZONA = [
    {
      img: 'assets/comic/promzona_01.webp',
      ru: 'Забор, который держал жаб в городе, треснул. Василий доломал{|а} его сам{|а}.',
      en: 'The fence that kept the toads in town had cracked. Vasiliy finished the job himself.'
    },
    {
      img: 'assets/comic/promzona_02.webp',
      ru: 'За забором — завод, на котором когда-то держался весь Новохмуринск.',
      en: 'Beyond the fence stood the factory that once kept all of Novokhmurinsk alive.'
    },
    {
      img: 'assets/comic/promzona_03.webp',
      ru: 'Жаб здесь хватало. После Мясника — мелочь, но патроны Василий берёг{|ла}.',
      en: 'There were plenty of toads here. Small fry after the Butcher, but Vasiliy was saving his ammo.'
    },
    {
      img: 'assets/comic/promzona_04.webp',
      ru: 'У проходной кто-то стрелял. Люди. Живые.',
      en: 'Someone was shooting by the factory gates. People. Alive.'
    },
    {
      img: 'assets/comic/promzona_05.webp',
      ru: '— Не стреляй, свои! — Свои давно в икре, дед.',
      en: '"Don\'t shoot, I\'m human!" "All the humans turned into spawn long ago, grandpa."'
    },
    {
      img: 'assets/comic/promzona_06.webp',
      ru: 'Серёгу зацепило кислотой. Яд Василия не брал — и руки у него не дрожали.',
      en: 'Seryoga had caught some acid. The venom never worked on Vasiliy, and his hands didn\'t shake.'
    },
    {
      img: 'assets/comic/promzona_07.webp',
      ru: '— За забором чисто, я город зачистил{|а}. Уходите к пролому. Я прикрою.',
      en: '"It\'s clear beyond the fence, I cleaned up the town. Head for the hole in the wall. I\'ll cover you."'
    },
    {
      img: 'assets/comic/promzona_08.webp',
      ru: 'Жабы шли со всего завода. {Хозяин|Хозяйка} теплотрассы встал{|а} за баррикаду.',
      en: 'Toads were coming from all over the factory. The master of the heating main took his place at the barricade.'
    }
  ];
  // seenKey — флаг «уже смотрел» в localStorage. У перехода его нет: он показывается при первом входе
  // в Промзону, а это помнит сохранение (locationsVisited)
  // Кадр представления босса Промзоны: когда Долбильщик впервые замечает Василия (src/game.js, introducePounder)
  const POUNDER = [
    {
      img: 'assets/comic/pounder_intro.webp',
      // Это Коля, начальник караула ВОХР (docs/LEVEL2_PROMZONA.md, «Разговоры и квесты»): имя называет Зина, не кадр
      ru: 'Межпространственный Долбильщик. Когда-то — начальник караула ВОХР. Он первым пошёл к градирням на фиолетовый свет.',
      en: 'The Interdimensional Pounder. Once the head of the plant guard. He was the first to walk toward the purple light at the cooling towers.'
    }
  ];
  const SETS = {
    intro: { frames: INTRO, seenKey: 'vasiliy.introSeen' },
    promzona: { frames: PROMZONA, seenKey: null },
    pounder: { frames: POUNDER, seenKey: 'vasiliy.pounderIntroSeen' }
  };

  const $ = id => document.getElementById(id);
  const root = $('comic');
  const layers = [$('comic-img-a'), $('comic-img-b')];
  const caption = $('comic-caption');
  const dots = $('comic-dots');

  let active = false;
  let index = 0;
  let front = 0;      // какой из двух слоёв сейчас виден
  let showToken = 0;  // при быстром листании старый кадр не должен проявиться поверх нового
  let onDone = null;
  let set = SETS.intro;
  let preloaded = [];

  function seen(name = 'intro') {
    try { return localStorage.getItem(SETS[name].seenKey) === '1'; } catch (e) { return false; }
  }

  function markSeen() {
    if (!set.seenKey) return;
    try { localStorage.setItem(set.seenKey, '1'); } catch (e) { /* не критично: покажем ещё раз */ }
  }

  function preload(i) {
    if (i >= set.frames.length || preloaded[i]) return;
    const im = new Image();
    im.src = set.frames[i].img;
    preloaded[i] = im;
  }

  function show(i) {
    index = i;
    const token = ++showToken;
    const next = layers[1 - front];
    const prev = layers[front];
    next.classList.remove('shown');
    next.src = set.frames[i].img;
    const reveal = () => {
      if (token !== showToken) return;
      prev.classList.remove('shown');
      void next.offsetWidth; // перезапуск анимации наезда
      next.classList.add('shown');
      front = 1 - front;
    };
    (next.decode ? next.decode() : Promise.resolve()).then(reveal, reveal);

    caption.classList.remove('shown');
    caption.textContent = personalize(set.frames[i][currentLang === 'en' ? 'en' : 'ru']); // кооп: имя игрока
    void caption.offsetWidth;
    caption.classList.add('shown');
    Array.from(dots.children).forEach((d, k) => d.classList.toggle('on', k === i));
    preload(i + 1);
  }

  function next() {
    if (index < set.frames.length - 1) show(index + 1);
    else finish();
  }

  function prev() {
    if (index > 0) show(index - 1);
  }

  function finish() {
    if (!active) return;
    active = false;
    showToken++;
    markSeen();
    root.style.display = 'none';
    layers.forEach(l => { l.classList.remove('shown'); l.removeAttribute('src'); });
    const done = onDone;
    onDone = null;
    if (done) done();
  }

  // done — что сделать после последнего кадра или пропуска (например, начать забег); name — какой комикс
  function play(done = null, name = 'intro') {
    onDone = done;
    if (set !== SETS[name]) preloaded = [];
    set = SETS[name];
    active = true;
    index = 0;
    root.style.display = 'block';
    dots.innerHTML = '';
    set.frames.forEach(() => dots.appendChild(document.createElement('span')));
    preload(0);
    show(0);
  }

  root.addEventListener('click', next);
  $('comic-skip').addEventListener('click', e => {
    e.stopPropagation();
    finish();
  });
  // Перехватываем клавиши раньше игры (capture), чтобы ESC не ставил паузу, а пробел не делал перекат
  window.addEventListener('keydown', e => {
    if (!active) return;
    e.stopImmediatePropagation();
    if (e.code === 'Escape') finish();
    else if (e.code === 'ArrowLeft') prev();
    else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') next();
    else return;
    e.preventDefault();
  }, true);

  return { play, seen, isActive: () => active };
})();
