// Симуляция дохода локации: сколько стеклотары, чермета, деталей, ядер и расходников даёт полная
// зачистка (все тайники + все враги + награда босса). Результаты и цели — docs/BALANCE.md.
//
// Как запустить: открыть игру, начать забег, открыть консоль браузера (F12), вставить этот файл
// целиком и выполнить economySim(). N — сколько раз «обыскивается» каждый тайник и «умирает»
// каждый враг (случайность усредняется).
window.economySim = function (N = 300) {
  const was = { res: Object.assign({}, player.resources), mk: player.unlockedWeapons.makarov, loot: lootItems.slice() };
  player.unlockedWeapons.makarov = true; // поздняя игра: в баках попадаются патроны к ПМ
  lootItems.length = 0;
  const keys = ['bottles', 'scrap', 'mil_parts', 'alien_core', 'bandage', 'stew', 'vodka', 'ammo_9x18', 'ammo_12g'];
  const zero = () => Object.fromEntries(keys.map(k => [k, 0]));
  const tot = zero(), by = {};
  const bucket = key => (by[key] = by[key] || Object.assign({ n: 0 }, zero()));
  const takeLoot = b => {
    lootItems.forEach(it => {
      const k = it.type === 'bottle' ? 'bottles' : it.type;
      b[k] += it.val / N;
      tot[k] += it.val / N;
    });
    lootItems.length = 0;
  };
  containers.forEach(c => {
    const b = bucket('тайники:' + c.districtId);
    b.n++;
    const s = c.searched;
    for (let i = 0; i < N; i++) {
      const before = Object.assign({}, player.resources);
      c.searched = false;
      scavengeContainer(c);
      for (const k in player.resources) {
        const d = player.resources[k] - before[k];
        b[k] += d / N;
        tot[k] += d / N;
      }
      takeLoot(b);
    }
    c.searched = s;
  });
  enemies.filter(e => e.type !== 'boss').forEach(e => {
    const b = bucket('враги:' + e.districtId);
    b.n++;
    for (let i = 0; i < N; i++) {
      spawnLootDrop(e);
      takeLoot(b);
    }
  });
  // Награда босса — как в onBossDefeated
  const b = bucket('босс');
  b.n = 1;
  BOSS_REWARD.forEach(([k, v]) => {
    const kk = k === 'bottle' ? 'bottles' : k;
    b[kk] += v;
    tot[kk] += v;
  });
  floatingTexts.length = 0;
  particles.length = 0;
  Object.assign(player.resources, was.res);
  player.unlockedWeapons.makarov = was.mk;
  lootItems.length = 0;
  was.loot.forEach(l => lootItems.push(l));
  const r = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]));
  const out = {};
  for (const k in by) out[k] = r(by[k]);
  return { total: r(tot), by: out };
};
