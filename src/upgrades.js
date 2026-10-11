// Василий против пришельцев | Vasiliy vs Aliens
// Дерево прокачки и мутаций с визуальными слоями

export const UPGRADE_TREES = {
  // 1. ВЕТКА КИБОРГИЗАЦИИ (Гаражный киберпанк)
  cyber: {
    id: "cyber",
    name_ru: "Кибернизация (Гараж-Панк)",
    name_en: "Cybernetics (Garage Punk)",
    color: "#38bdf8",
    perks: {
      drill_arm: {
        id: "drill_arm",
        name_ru: "Рука-Перфоратор",
        name_en: "Drill Arm",
        desc_ru: "+15 урона вблизи, сплеш-удар при перекате",
        desc_en: "+15 melee dmg, shockwave during roll",
        cost: { scrap: 15, bottles: 5 },
        visualSlot: "right_arm",
        visualType: "cyber_drill",
        weaponVisual: "drill_pipe",
        statMods: { damage: 15, rollDmg: 30 },
        locks: ["tentacle_arm"] // БЛОКИРУЕТ руку-щупальце из мутаций!
      },
      car_battery: {
        id: "car_battery",
        name_ru: "Аккумулятор от КАМАЗа",
        name_en: "Truck Battery Pack",
        desc_ru: "Электро-разряды рикошетят в 2 соседние жабы",
        desc_en: "Chain lightning arcs to 2 nearby toads",
        cost: { scrap: 25, bottles: 10 },
        visualSlot: "back",
        visualType: "battery_pack",
        statMods: { chainLightning: 2 },
        locks: ["shaman_carpet"] // БЛОКИРУЕТ ковер-плащ шамана!
      },
      laser_eye: {
        id: "laser_eye",
        name_ru: "Лазерный прицел-глаз",
        name_en: "Cybernetic Bionic Eye",
        desc_ru: "Красный луч прицеливания, +25% шанс крита (x2.5)",
        desc_en: "Red laser sight, +25% crit chance (x2.5 dmg)",
        cost: { scrap: 35, bottles: 15 },
        visualSlot: "head",
        visualType: "cyber_eye",
        statMods: { critChance: 0.25, critMult: 2.5 },
        locks: ["third_frog_eye"] // БЛОКИРУЕТ третий жабий глаз!
      }
    }
  },

  // 2. ВЕТКА БИОМУТАЦИЙ (Жабий геном)
  mutation: {
    id: "mutation",
    name_ru: "Биомутации (Жабий Геном)",
    name_en: "Bio-Mutations (Toad DNA)",
    color: "#22c55e",
    perks: {
      tentacle_arm: {
        id: "tentacle_arm",
        name_ru: "Жабий Хлыст-Язык",
        name_en: "Toad Tongue Whip",
        desc_ru: "Авто-притягивание лута и патронов на дистанции 180px",
        desc_en: "Auto-pull loot & scrap from 180px radius",
        cost: { scrap: 10, bottles: 12 },
        visualSlot: "right_arm",
        visualType: "mutant_tongue",
        weaponVisual: "slime_blaster",
        statMods: { magnetRadius: 180, poisonDmg: 5 },
        locks: ["drill_arm"] // БЛОКИРУЕТ руку-перфоратор!
      },
      slime_skin: {
        id: "slime_skin",
        name_ru: "Токсичная Слизь",
        name_en: "Toxic Mucus Skin",
        desc_ru: "Зеленая скользкая кожа: +20% к скорости, враги травятся при контакте",
        desc_en: "+20% move speed, contact poison trail",
        cost: { scrap: 20, bottles: 15 },
        visualSlot: "body",
        visualType: "green_slime_body",
        statMods: { speedMult: 1.2, poisonAura: true },
        locks: ["titan_armor"] // БЛОКИРУЕТ тяжелую броню из титана!
      },
      third_frog_eye: {
        id: "third_frog_eye",
        name_ru: "Жабий Глаз-Пузырь",
        name_en: "Amphibian Bulging Eye",
        desc_ru: "Круговой обзор 360°, видит врагов сквозь стены и в темноте",
        desc_en: "360° awareness, sees toads through buildings",
        cost: { scrap: 25, bottles: 18 },
        visualSlot: "head",
        visualType: "frog_eye",
        statMods: { wallVision: true },
        locks: ["laser_eye"] // БЛОКИРУЕТ лазерный глаз!
      }
    }
  },

  // 3. ВЕТКА ШАМАНА ТЕПЛОТРАССЫ (Мистика и суррогаты)
  magic: {
    id: "magic",
    name_ru: "Шаман Теплотрассы (Эзотерика)",
    name_en: "Heating Pipeline Shaman",
    color: "#a855f7",
    perks: {
      fume_aura: {
        id: "fume_aura",
        name_ru: "Аура Перегара",
        name_en: "Hangover Stench Aura",
        desc_ru: "Фиолетовый пар вокруг: враги рядом дезориентированы и замедлены на 45%",
        desc_en: "Fume cloud: nearby enemies slowed by 45%",
        cost: { scrap: 15, bottles: 15 },
        visualSlot: "aura",
        visualType: "purple_fume",
        statMods: { slowAura: 0.45 },
        locks: []
      },
      shaman_carpet: {
        id: "shaman_carpet",
        name_ru: "Плащ из Советского Ковра",
        name_en: "Soviet Rug Cloak",
        desc_ru: "+50 макс. HP, регенерация 1 HP в секунду",
        desc_en: "+50 max HP, passive 1 HP/sec regen",
        cost: { scrap: 20, bottles: 20 },
        visualSlot: "back",
        visualType: "soviet_carpet_cape",
        statMods: { bonusMaxHp: 50, regenHp: 1 },
        locks: ["car_battery"] // БЛОКИРУЕТ аккумулятор на спине!
      },
      pigeon_familiar: {
        id: "pigeon_familiar",
        name_ru: "Призрачный Голубь Гена",
        name_en: "Ghost Pigeon Gena",
        desc_ru: "Призывает летающего голубя-пета, атакующего глаза жабам",
        desc_en: "Summons spectral pigeon attacking toad eyes",
        cost: { scrap: 35, bottles: 25 },
        visualSlot: "familiar",
        visualType: "pigeon_pet",
        statMods: { hasPigeonPet: true },
        locks: []
      }
    }
  }
};
