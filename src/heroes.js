// Герои коопа (docs/COOP.md, «Герои»): в сетевой игре каждый выбирает в лобби, кем играть, — шесть фигур с
// заметно разным силуэтом, двое одного героя взять не могут; имя игрок вводит своё. В одиночной игре — всегда
// Василий. Играют все одинаково: отличаются только модель (assets/models/hero_<id>.glb — тело героя на
// скелете, руках и оружии Василия, tools/build_heroes_blender.py), портрет в лобби (assets/sprites/heroes/<id>.webp)
// и род в текстах к игроку: «нашёл{|а}» — gendered() в game.js, f — женский.
const HEROES = [
  { id: 'vasiliy', ru: 'Василий', en: 'Vasiliy', f: false,
    about_ru: 'Хозяин теплотрассы, бывший инженер НИИ', about_en: 'Master of the heating main, ex-engineer' },
  { id: 'bruiser', ru: 'Грузчик', en: 'Loader', f: false,
    about_ru: 'С хлебозавода. Шкаф в спортивном костюме', about_en: 'From the bread factory. A wardrobe in a tracksuit' },
  { id: 'kid', ru: 'Пацан', en: 'Kid', f: false,
    about_ru: 'С района. Худи, кепка задом наперёд, наушники', about_en: 'From the block. Hoodie, backwards cap, headphones' },
  { id: 'punk', ru: 'Готка', en: 'Goth', f: true,
    about_ru: 'Из ДК. Шапка с ушками, чокер, сетка и платформы', about_en: 'From the House of Culture. Cat-ear hat, choker, fishnet and platforms' },
  { id: 'skier', ru: 'Лыжница', en: 'Skier', f: true,
    about_ru: 'Из спортшколы. Красная олимпийка и коса', about_en: 'From the sports school. Red ski jacket and a braid' },
  { id: 'sergeant', ru: 'Старшина', en: 'Sergeant', f: true,
    about_ru: 'Из милиции. Осталась, когда все сбежали', about_en: 'Militia. Stayed when everyone else ran' }
];

// Мерки моделей (assets/models/heroes.json — пишет tools/build_heroes_blender.py): рост, ширина (kx) и высота
// плеч (kz, dz) относительно Василия — для положения дула и подписи над головой. Пока не загрузились или
// героя нет в файле — как у Василия
const HERO_METRICS = { vasiliy: { height: 1.9, kx: 1, kz: 1, dz: 0 } };
fetch('assets/models/heroes.json?v=1').then(r => (r.ok ? r.json() : {})).then(m => Object.assign(HERO_METRICS, m)).catch(() => {});

function heroDef(id) {
  return HEROES.find(h => h.id === id) || HEROES[0];
}
function heroMetrics(id) {
  return HERO_METRICS[id] || HERO_METRICS.vasiliy;
}
