// Тренировочный бой со вторым боссом по ссылке: index.html?boss2
// Василий с прокачкой из сохранения (оружие, перки, карты, ресурсы) — на свежей зачищенной Промзоне у логова
// Межпространственного Долбильщика. Босс жив и с полным здоровьем, даже если в сохранении он уже побеждён;
// остальных жаб нет, оборона у пролома считается пройденной. Нет сохранения — новый Василий.
// Режим ничего не пишет и не стирает: сохранение забега остаётся как было (Menu.saveRun молчит, смерть
// перезапускает бой, выход в меню — страница без ?boss2).
// Скрипты обычные, без модулей: startGame, travelTo, Loading, pounderRef — из game.js, Menu — из menu.js.
window.Practice = (function () {
  const active = /[?&]boss2\b/.test(location.search);
  const L = (r, e) => (currentLang === 'ru' ? r : e);

  // Расставить бой: только босс, полное здоровье, Василий у логова
  function arrange() {
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i] !== pounderRef) enemies.splice(i, 1);
    if (!pounderRef) spawnPounder();
    levelEnemyTotal = 0;
    enemyBullets = [];
    rockets = [];
    lootItems = [];
    player.x = POUNDER_HOME.x + 560;
    player.y = POUNDER_HOME.y + 120;
    player.hp = player.maxHp;
    camera.x = player.x - viewW / 2;
    camera.y = player.y - viewH / 2;
    updateHUD(true);
    showToast(L('ТРЕНИРОВОЧНЫЙ БОЙ', 'PRACTICE FIGHT'),
      L('Долбильщик против вашей прокачки. Прогресс не сохраняется.', 'The Pounder against your build. Progress is not saved.'));
  }

  // После экрана загрузки текущего перехода
  function afterLoading(fn) {
    const prev = Loading.onDone;
    Loading.onDone = () => {
      if (prev) prev();
      fn();
    };
  }

  function start() {
    const s = window.Menu && window.Menu.loadSave();
    let run = null;
    if (s) {
      // Копия забега: прокачка та же, Промзона — свежая (босс жив), оборона пройдена
      run = JSON.parse(JSON.stringify(s));
      if (run.format >= 6) {
        run.location = 'promzona';
        run.visited = Array.from(new Set([...(run.visited || []), 'city', 'promzona']));
        run.worlds = Object.assign({}, run.worlds, { promzona: {} });
      }
      run.defense = 'done';
    }
    startGame(run);
    if (window.Defense) window.Defense.loadState('done', true);
    afterLoading(() => {
      if (currentLocation === 'promzona') {
        arrange();
        return;
      }
      // Старое сохранение (или его нет) — забег в городе: в Промзону, свежую
      delete locationWorlds.promzona;
      travelTo('promzona');
      afterLoading(arrange);
    });
  }

  // Смерть в тренировке: забег не стирается — бой начинается заново
  function onDeath() {
    showToast(L('ПОТРАЧЕНО', 'WASTED'), L('Ещё раз…', 'Once more…'));
    setTimeout(() => location.reload(), 2200);
  }

  // Выход в меню: обычная страница, где «Продолжить» — настоящий забег
  function exit() {
    location.replace(location.pathname);
  }

  if (active) {
    // Сразу после загрузки страницы, минуя главное меню и комикс-предысторию
    const go = () => setTimeout(start, 0);
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go);
  }

  return { active, onDeath, exit };
})();
