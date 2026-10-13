// Три карты после босса уровня: «Скорость», «Ловкость», «Живучесть».
// Карты показываются лицом, переворачиваются рубашкой вверх и тасуются — Василий тянет одну.
// Здесь только показ; что даёт каждая карта — CARD_EFFECTS и applyBossCard в game.js.
// Скрипты обычные, без модулей: currentLang и SoundFX — из game.js.
window.BossCards = (function () {
  const CARDS = [
    {
      id: 'speed', img: 'assets/cards/card_speed.webp', icon: '⚡', color: '#38bdf8',
      title: { ru: 'СКОРОСТЬ', en: 'SPEED' },
      desc: { ru: '+12% к скорости бега', en: '+12% move speed' }
    },
    {
      id: 'agility', img: 'assets/cards/card_agility.webp', icon: '🤸', color: '#4ade80',
      title: { ru: 'ЛОВКОСТЬ', en: 'AGILITY' },
      desc: {
        ru: 'Перекат дешевле и чаще на 30%, 10% шанс увернуться от удара',
        en: 'Roll costs and recovers 30% less, 10% chance to dodge a hit'
      }
    },
    {
      id: 'vitality', img: 'assets/cards/card_vitality.webp', icon: '❤️', color: '#f87171',
      title: { ru: 'ЖИВУЧЕСТЬ', en: 'VITALITY' },
      desc: { ru: '+40 к здоровью, бинт лечит на 50% больше', en: '+40 max HP, bandages heal 50% more' }
    }
  ];
  const BACK_IMG = 'assets/cards/card_back.webp';
  const SLOT_X = [-230, 0, 230];
  const SWAPS = 5;
  const TEXT = {
    kicker: { ru: 'ТРОФЕЙ ЗОЛОТОГО МЯСНИКА', en: 'GOLDEN BUTCHER\'S TROPHY' },
    remember: { ru: 'Запомни карты…', en: 'Remember the cards…' },
    shuffle: { ru: 'Михалыч тасует…', en: 'Mikhalych shuffles…' },
    pick: { ru: 'Тяни одну карту', en: 'Draw one card' },
    accept: { ru: 'ПРИНЯТЬ', en: 'ACCEPT' }
  };

  const $ = id => document.getElementById(id);
  const lang = () => (typeof currentLang !== 'undefined' && currentLang === 'en' ? 'en' : 'ru');
  const tx = key => TEXT[key][lang()];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const click = () => { if (typeof SoundFX !== 'undefined') SoundFX.emptyClick(); };

  let els = [];       // карты по номеру в CARDS
  let order = [];     // order[место] = номер карты

  // Картинка, а если её нет — крупный значок на цветном фоне
  function faceImage(src, icon, color) {
    const box = document.createElement('div');
    box.className = 'bcard-art';
    box.style.background = `radial-gradient(circle at 50% 40%, ${color}55, #1c1917 70%)`;
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.onerror = () => {
      img.remove();
      box.textContent = icon;
    };
    box.appendChild(img);
    return box;
  }

  function build() {
    const table = $('cards-table');
    table.innerHTML = '';
    els = CARDS.map((c, i) => {
      const card = document.createElement('div');
      card.className = 'bcard';
      card.innerHTML = '<div class="bcard-hover"><div class="bcard-inner">' +
        '<div class="bcard-face bcard-front"></div><div class="bcard-face bcard-back"></div></div></div>';
      const front = card.querySelector('.bcard-front');
      front.style.borderColor = c.color;
      front.appendChild(faceImage(c.img, c.icon, c.color));
      const label = document.createElement('div');
      label.className = 'bcard-label';
      label.innerHTML = `<b style="color:${c.color}">${c.title[lang()]}</b><span>${c.desc[lang()]}</span>`;
      front.appendChild(label);
      card.querySelector('.bcard-back').appendChild(faceImage(BACK_IMG, '🐸', '#a16207'));
      card.dataset.idx = i;
      table.appendChild(card);
      return card;
    });
    order = [0, 1, 2];
    place(0);
  }

  // Расставить карты по местам; lift — подъём (для тасовки), чтобы карты не проходили друг сквозь друга
  function place(liftOf) {
    order.forEach((ci, slot) => {
      const lift = liftOf && liftOf[ci] ? liftOf[ci] : 0;
      els[ci].style.transform = `translateX(${SLOT_X[slot]}px) translateY(${lift}px)`;
    });
  }

  async function shuffle() {
    for (let n = 0; n < SWAPS; n++) {
      const a = Math.floor(Math.random() * 3);
      const b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
      const ca = order[a], cb = order[b];
      order[a] = cb;
      order[b] = ca;
      place({ [ca]: -34, [cb]: 34 });
      click();
      await wait(300);
      place(null);
      await wait(140);
    }
  }

  function open(onPick) {
    const modal = $('cards-modal');
    build();
    $('cards-kicker').textContent = tx('kicker');
    $('cards-title').textContent = tx('remember');
    $('cards-sub').textContent = '';
    const btn = $('cards-continue');
    btn.style.display = 'none';
    btn.textContent = tx('accept');
    modal.style.display = 'flex';
    els.forEach((el, i) => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.opacity = '1'; click(); }, 150 + i * 180);
    });

    (async () => {
      await wait(2400);
      els.forEach(el => el.classList.add('flipped'));
      click();
      await wait(650);
      $('cards-title').textContent = tx('shuffle');
      await shuffle();
      $('cards-title').textContent = tx('pick');
      els.forEach(el => {
        el.classList.add('pickable');
        el.onclick = () => pick(el, onPick);
      });
    })();
  }

  async function pick(el, onPick) {
    els.forEach(e => { e.classList.remove('pickable'); e.onclick = null; });
    const card = CARDS[+el.dataset.idx];
    el.classList.remove('flipped');
    el.classList.add('chosen');
    click();
    $('cards-title').textContent = card.title[lang()];
    $('cards-title').style.color = card.color;
    $('cards-sub').textContent = card.desc[lang()];
    await wait(600);
    // Остальные — показать, что было под ними
    els.forEach(e => {
      if (e === el) return;
      e.classList.remove('flipped');
      e.classList.add('dim');
    });
    const btn = $('cards-continue');
    btn.style.display = 'block';
    btn.onclick = () => {
      btn.onclick = null;
      $('cards-modal').style.display = 'none';
      $('cards-title').style.color = '';
      onPick(card.id);
    };
  }

  return { open };
})();
