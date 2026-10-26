// Василий против пришельцев | Vasiliy vs Aliens
// Автономная сборка (без ES-модулей, работает при прямом открытии file://)

// --- 1. ДЕРЕВО ПРОКАЧКИ И ВЕТОК (UPGRADE TREES) ---
const UPGRADE_TREES = {
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
        desc_ru: "+12 к базовому урону, ударная волна при перекате",
        desc_en: "+12 base dmg, shockwave during roll",
        cost: { bottles: 10, scrap: 18, toad_leg: 2, toad_eye: 1 },
        statMods: { damage: 12 },
        locks: ["tentacle_arm"]
      },
      car_battery: {
        id: "car_battery",
        name_ru: "Аккумулятор от КАМАЗа",
        name_en: "Truck Battery Pack",
        desc_ru: "Цепная молния бьёт 2 соседние жабы при попадании",
        desc_en: "Chain lightning arcs to 2 nearby toads",
        cost: { bottles: 14, scrap: 28, mil_parts: 2, toad_eye: 3, toad_liver: 2 },
        statMods: {},
        locks: ["shaman_carpet"]
      },
      // Новый ряд — открывается вместе с Промзоной (promzona: true), в цене обязательно её лут.
      // Как работают — src/perks_pz.js и src/safes.js
      stethoscope: {
        id: "stethoscope",
        promzona: true,
        name_ru: "Стетоскоп",
        name_en: "Stethoscope",
        desc_ru: "Инженер слышит механизм: сейф сразу выдаёт одну цифру кода",
        desc_en: "An engineer hears the mechanism: a safe gives away one digit of its code",
        cost: { bottles: 16, scrap: 24, nonferrous: 3, toad_eye: 2 },
        statMods: {},
        locks: []
      },
      fire_goo: {
        id: "fire_goo",
        promzona: true,
        name_ru: "Горючая жижа",
        name_en: "Fire Goo",
        desc_ru: "ПКМ: плевок горючей жижей на 3 м — лужа горит 5 с и поджигает жаб (8 урона/с, 4 с). Перезарядка 12 с, F — сменить способность",
        desc_en: "RMB: spit fire goo 3 m ahead — the pool burns for 5 s and sets toads on fire (8 dmg/s for 4 s). 12 s cooldown, F switches abilities",
        cost: { scrap: 20, nonferrous: 4, tech_spirit: 3, toad_eye: 2 },
        statMods: {},
        locks: []
      },
      laser_eye: {
        id: "laser_eye",
        name_ru: "Лазерный прицел-глаз",
        name_en: "Cybernetic Bionic Eye",
        desc_ru: "Лазерный целеуказатель, +25% шанс крита (x2.5)",
        desc_en: "Red laser sight, +25% crit chance (x2.5)",
        cost: { bottles: 20, scrap: 38, mil_parts: 4, alien_core: 2, toad_eye: 5, toad_liver: 2 },
        statMods: { critChance: 0.25, critMult: 2.5 },
        locks: ["third_frog_eye"]
      }
    }
  },
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
        desc_ru: "Авто-притягивание всего лута в радиусе 185px",
        desc_en: "Auto-pull loot & resources from 185px radius",
        cost: { bottles: 14, scrap: 12, toad_leg: 3 },
        statMods: {},
        locks: ["drill_arm"]
      },
      slime_skin: {
        id: "slime_skin",
        name_ru: "Токсичная Слизь",
        name_en: "Toxic Mucus Skin",
        desc_ru: "+22% к скорости бега и +30% реген выносливости",
        desc_en: "+22% move speed & +30% stamina regen",
        cost: { bottles: 18, scrap: 22, mil_parts: 2, toad_leg: 3, toad_liver: 1 },
        statMods: {},
        locks: []
      },
      third_frog_eye: {
        id: "third_frog_eye",
        name_ru: "Жабий Глаз-Пузырь",
        name_en: "Amphibian Bulging Eye",
        desc_ru: "+35 макс. Выносливости и снижение расхода на 25%",
        desc_en: "+35 Max Stamina & -25% stamina cost",
        cost: { bottles: 22, scrap: 30, mil_parts: 3, alien_core: 3, toad_eye: 4, toad_leg: 3 },
        statMods: { bonusMaxStamina: 35 },
        locks: ["laser_eye"]
      },
      sludge_skin: {
        id: "sludge_skin",
        promzona: true,
        name_ru: "Шламовая кожа",
        name_en: "Sludge Skin",
        desc_ru: "Броня 60 поверх здоровья: в ближнем бою гасит 80% урона, кислоту и взрывы — 50%, плазму, лазер и разряды — 20%. Восстанавливается сама и быстро — в шламе",
        desc_en: "60 armor on top of health: absorbs 80% of melee damage, 50% of acid and blasts, 20% of plasma, lasers and shocks. Regenerates, fast in sludge",
        cost: { bottles: 15, nonferrous: 3, alien_core: 2, toad_liver: 4 },
        statMods: {},
        locks: []
      },
      frog_legs: {
        id: "frog_legs",
        promzona: true,
        name_ru: "Жабьи ноги",
        name_en: "Frog Legs",
        desc_ru: "Перекат на 35% длиннее и кончается приземлением: жаб рядом отбрасывает и оглушает на полсекунды (боссов — только урон)",
        desc_en: "Roll covers 35% more ground and ends with a landing: nearby toads are knocked back and stunned for half a second (bosses just take damage)",
        cost: { scrap: 15, kvako_charge: 2, toad_leg: 5 },
        statMods: {},
        locks: []
      }
    }
  },
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
        desc_ru: "Облако перегара вокруг Василия: жабы в нём хмелеют и замедляются на 45%",
        desc_en: "A cloud of booze fumes around Vasiliy: toads inside get tipsy and slow down by 45%",
        cost: { bottles: 16, scrap: 15, toad_liver: 2, toad_leg: 1 },
        statMods: {},
        locks: []
      },
      shaman_carpet: {
        id: "shaman_carpet",
        name_ru: "Плащ из Советского Ковра",
        name_en: "Soviet Rug Cloak",
        desc_ru: "+60 макс. HP и пассивная регенерация здоровья",
        desc_en: "+60 max HP & passive health regeneration",
        cost: { bottles: 22, scrap: 24, mil_parts: 2, toad_liver: 3, toad_leg: 2 },
        statMods: { bonusMaxHp: 60 },
        locks: ["car_battery"]
      },
      pigeon_familiar: {
        id: "pigeon_familiar",
        name_ru: "Призрачный Голубь Гена",
        name_en: "Ghost Pigeon Gena",
        desc_ru: "+20 к базовому урону всех видов оружия",
        desc_en: "+20 base damage to all weapons",
        cost: { bottles: 28, scrap: 35, mil_parts: 3, alien_core: 3, toad_eye: 3, toad_liver: 2, toad_leg: 2 },
        statMods: { damage: 20 },
        locks: []
      },
      charmed_spirit: {
        id: "charmed_spirit",
        promzona: true,
        name_ru: "Заговорённый спирт",
        name_en: "Charmed Spirit",
        desc_ru: "Опьянение длится 15 с вместо 10, а рука твёрдая — разброс как у трезвого. С Аурой перегара облако у пьяного шире на 40%",
        desc_en: "Drunkenness lasts 15 s instead of 10 and the hand stays steady — sober accuracy. With the Hangover Aura the cloud is 40% wider while drunk",
        cost: { bottles: 25, tech_spirit: 4, toad_liver: 3 },
        statMods: {},
        locks: []
      },
      lucky_charm: {
        id: "lucky_charm",
        promzona: true,
        name_ru: "Малый оберег удачи",
        name_en: "Small Lucky Charm",
        desc_ru: "3% шанс увернуться от любой атаки",
        desc_en: "3% chance to dodge any attack",
        cost: { bottles: 18, nonferrous: 2, kvako_charge: 1, toad_eye: 3 },
        statMods: {},
        locks: []
      }
    }
  }
};

// --- 2. 8-КАДРОВЫЙ АНИМАТОР И МОДУЛЬНЫЙ РЕНДЕРЕР ВАСИЛИЯ (SPRITECOOK) ---
class VasiliyAnimator {
  constructor() {
    this.walkFrames = [];
    this.backWalkFrames = [];
    this.idleImg = new Image();
    this.backIdleImg = new Image();
    this.weapons = {};
    this.gear = {};
    this.loaded = false;
    this.assetsRequested = false;
  }

  // 2D-спрайты (~3.8 МБ) нужны только как запасной вариант, если 3D-модель не загрузилась
  ensureAssets() {
    if (this.assetsRequested) return;
    this.assetsRequested = true;
    this.loadAssets();
  }

  loadAssets() {
    let toLoad = 16 + 2 + 5 + 2;
    let loadedCount = 0;
    const onLoad = () => {
      loadedCount++;
      if (loadedCount >= toLoad) this.loaded = true;
    };

    // 1. Опорные спрайты покоя: спереди (Down) и со спины (Up)
    this.idleImg.src = 'assets/sprites/vasiliy_modular/vasiliy_idle.png';
    this.idleImg.onload = onLoad;
    this.idleImg.onerror = onLoad;

    this.backIdleImg.src = 'assets/sprites/vasiliy_modular/vasiliy_back_idle.png';
    this.backIdleImg.onload = onLoad;
    this.backIdleImg.onerror = onLoad;

    // 2. 8 кадров ходьбы лицом вперед (Down) и 8 кадров со спины (Up)
    for (let i = 0; i < 8; i++) {
      const imgFront = new Image();
      imgFront.src = `assets/sprites/vasiliy_modular/vasiliy_walk_${i}.png`;
      imgFront.onload = onLoad;
      imgFront.onerror = onLoad;
      this.walkFrames.push(imgFront);

      const imgBack = new Image();
      imgBack.src = `assets/sprites/vasiliy_modular/vasiliy_back_walk_${i}.png`;
      imgBack.onload = onLoad;
      imgBack.onerror = onLoad;
      this.backWalkFrames.push(imgBack);
    }

    // 3. Модульное оружие
    const weaponDefs = [
      ['bat', 'assets/sprites/weapons/weapon_bat.png?v=1026'],
      ['makarov', 'assets/sprites/weapons/weapon_makarov.png?v=1026'],
      ['shotgun', 'assets/sprites/vasiliy_modular/weapons/shotgun.png'],
      ['drill', 'assets/sprites/vasiliy_modular/weapons/drill.png'],
      ['plasma', 'assets/sprites/vasiliy_modular/weapons/plasma.png']
    ];
    weaponDefs.forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = onLoad;
      img.onerror = onLoad;
      this.weapons[key] = img;
    });

    // 4. Модульная спинная экипировка (Ковер, аккумулятор)
    const gearDefs = [
      ['carpet', 'assets/sprites/vasiliy_modular/gear/carpet.png'],
      ['battery', 'assets/sprites/vasiliy_modular/gear/battery.png']
    ];
    gearDefs.forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = onLoad;
      img.onerror = onLoad;
      this.gear[key] = img;
    });
  }

  draw(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);

    // 1. Аура перегара рисуется облаком на земле до фигур (drawFumeAura)

    // Определение направления прицеливания (влево / вправо / вверх / вниз)
    const isAimingLeft = Math.cos(player.angle) < 0;
    const isFacingUp = player.moveDir === 'up';
    const aimSin = Math.sin(player.angle);
    const aimCos = Math.cos(player.angle);

    // Покачивание торса при дыхании или шаге
    const bob = player.isMoving ? Math.abs(Math.sin(player.animTimer * 0.35)) * 3 : Math.sin(Date.now() * 0.003) * 1.5;

    // Определение движения назад (Backpedaling / Strafe)
    const moveDx = player.lastDx || 0;
    const moveDy = player.lastDy || 0;
    let isMovingBackward = false;
    if (isAimingLeft && moveDx > 0.1) isMovingBackward = true;
    else if (!isAimingLeft && moveDx < -0.1) isMovingBackward = true;
    else if (isFacingUp && moveDy > 0.1) isMovingBackward = true;
    else if (!isFacingUp && player.moveDir === 'down' && moveDy < -0.1) isMovingBackward = true;

    // 2.5D Наклон и ракурс торса
    let verticalTilt = 0;
    let verticalScaleY = 1.0;
    let headPitchOffset = 0;

    if (isFacingUp) {
      // Идет / целится вверх: видна спина
      verticalTilt = isAimingLeft ? 0.04 : -0.04;
      verticalScaleY = 0.96;
      headPitchOffset = -2;
    } else if (player.moveDir === 'down') {
      // Идет / целится вниз: лицом к игроку
      verticalTilt = isAimingLeft ? -0.04 : 0.04;
      verticalScaleY = 0.98;
      headPitchOffset = 1;
    }

    // 2. СЛОЙ СПИНЫ (Если лицом вперед — под Василием, если спиной — поверх спины)
    const drawGear = () => {
      if (player.hasPerk && player.hasPerk('shaman_carpet') && this.gear.carpet) {
        ctx.save();
        const carpetX = isFacingUp ? 0 : (isAimingLeft ? 12 : -12);
        ctx.drawImage(this.gear.carpet, carpetX - 18, -52 - bob + headPitchOffset, 36, 36);
        ctx.restore();
      } else if (player.hasPerk && player.hasPerk('car_battery') && this.gear.battery) {
        ctx.save();
        const battX = isFacingUp ? 0 : (isAimingLeft ? 12 : -12);
        ctx.drawImage(this.gear.battery, battX - 18, -50 - bob + headPitchOffset, 36, 36);
        ctx.restore();
      }
    };

    if (!isFacingUp) {
      drawGear(); // При взгляде вперед спинная экипировка сзади
    }

    // 3. ВЫБОР СПРАЙТА: ЛИЦОМ (DOWN) ИЛИ СПИНОЙ (UP)
    const activeWalkFrames = isFacingUp ? this.backWalkFrames : this.walkFrames;
    const activeIdle = isFacingUp ? this.backIdleImg : this.idleImg;

    let frameImg = activeIdle;
    if (player.isMoving && activeWalkFrames.length === 8) {
      const rawIdx = Math.floor((player.animTimer * 0.18) % 8);
      const frameIdx = isMovingBackward ? (7 - rawIdx) : rawIdx;
      frameImg = activeWalkFrames[frameIdx];
    }

    if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(0, -bob + headPitchOffset);
      ctx.rotate(verticalTilt);

      // Масштаб под игровой мир: 640px спрайт -> ~86px высота
      const scale = 0.135;
      ctx.scale(isAimingLeft ? -scale : scale, scale * verticalScaleY);
      // Опора ног строго в (0, 0)
      ctx.drawImage(frameImg, -320, -640, 640, 640);
      ctx.restore();
    }

    if (isFacingUp) {
      drawGear(); // При виде со спины экипировка на спине видна поверх
    }

    // 4. СВЕТЯЩИЙСЯ КИБЕР-ГЛАЗ (Только если смотрим лицом вперед)
    if (player.hasPerk && player.hasPerk('laser_eye') && !isFacingUp) {
      ctx.save();
      const eyeX = isAimingLeft ? -4 : 4;
      const eyeY = -66 - bob + headPitchOffset;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Лазерная линия
      ctx.save();
      ctx.translate(eyeX, eyeY);
      ctx.rotate(player.angle);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(600, 0);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    // 5. МОДУЛЬНЫЙ ШАРНИР ОРУЖИЯ (Четкий пиксель-арт 360°)
    const activeWeaponKey = player.currentWeapon || 'shotgun';
    const weaponImg = this.weapons[activeWeaponKey] || this.weapons['shotgun'];

    if (weaponImg && weaponImg.complete && weaponImg.naturalWidth > 0) {
      ctx.save();

      // Отключаем сглаживание, чтобы пиксели были кристально резкими
      ctx.imageSmoothingEnabled = false;

      // Анатомический сокет руки Василия
      const handBaseX = isAimingLeft ? -19 : 19;
      const handX = handBaseX + (aimCos * 2);
      const handY = -41.6 - bob + (aimSin * 5) + (headPitchOffset * 0.5);

      ctx.translate(handX, handY);

      // Вращение точно за курсором мыши
      ctx.rotate(player.angle);

      // Отражение по вертикали при взгляде влево (чтобы ствол не переворачивался вверх ногами)
      if (isAimingLeft) {
        ctx.scale(1, -1);
      }

      // Отрисовка откалиброванного 80x48 спрайта (рукоять точно в шарнире 20, 24)
      const wepW = 76;
      const wepH = 45;
      const anchorX = 20 * (wepW / 80);
      const anchorY = 24 * (wepH / 48);

      ctx.drawImage(weaponImg, -anchorX, -anchorY, wepW, wepH);

      ctx.restore();
    }

    ctx.restore();
  }
}

const vasiliyAnimator = new VasiliyAnimator();

const SpriteRenderer = {
  drawVasiliy(ctx, p) {
    if (window.threeCharacter && window.threeCharacter.draw(ctx, p)) {
      return;
    }
    if (window.threeCharacter && !window.threeCharacter.loadFailed) {
      return; // 3D-модель ещё грузится
    }
    vasiliyAnimator.ensureAssets();
    vasiliyAnimator.draw(ctx, p);
  },

  // --- ДЕТАЛИЗИРОВАННЫЙ СПРАЙТ ЖАБЫ-ШТУРМОВИКА (TOAD GRUNT) ---
  drawToadGrunt(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    const angle = e.angle !== undefined ? e.angle : 0;
    const facingLeft = Math.cos(angle) < 0;
    const time = e.animTimer || 0;
    const breathe = Math.sin(time * 0.8) * 1.5;

    // 1. Мягкая тень под ногами
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 10, e.radius * 1.05, e.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Аггро-индикатор
    if (e.isAggroed) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
      ctx.fillText('!', 0, -e.radius - 18);
      ctx.shadowBlur = 0;
    }

    // Зеркалирование по направлению движения
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    // 3. Мощные согнутые задние лапы с перепончатыми стопами
    const legWiggle = Math.sin(time * 1.5) * 2.5;
    // Дальняя лапа
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.ellipse(-16, 12 + legWiggle, 11, 7, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14532d';
    // 3 перепончатых пальца
    [-24, -20, -16].forEach(fx => {
      ctx.beginPath();
      ctx.arc(fx, 17 + legWiggle, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ближняя лапа (согнутое жабье бедро)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(14, 13 - legWiggle, 12, 8, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14532d';
    [10, 15, 20].forEach(fx => {
      ctx.beginPath();
      ctx.arc(fx, 18 - legWiggle, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Сгорбленное туловище мутанта
    const torsoGrad = ctx.createRadialGradient(-2, 3 + breathe, 4, 0, 4 + breathe, e.radius);
    torsoGrad.addColorStop(0, '#4ade80');
    torsoGrad.addColorStop(0.5, '#22c55e');
    torsoGrad.addColorStop(0.85, '#15803d');
    torsoGrad.addColorStop(1, '#052e16');

    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    // Сгорбленная форма туловища
    ctx.ellipse(0, 4 + breathe, e.radius * 0.95, e.radius * 0.75, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#052e16';
    ctx.stroke();

    // Брюхо жабы (бледное с тёмными бородавками)
    ctx.fillStyle = 'rgba(187, 247, 208, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 7 + breathe, e.radius * 0.6, e.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Бородавки
    ctx.fillStyle = '#14532d';
    [[-12, -2], [-6, 10], [8, -3], [-14, 6], [6, 12]].forEach(([wx, wy]) => {
      ctx.beginPath();
      ctx.arc(wx, wy + breathe, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Вытянутая голова с широкой жабьей пастью
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(4, -8 + breathe, e.radius * 0.8, e.radius * 0.55, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Линия широкого жабьего рта
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -4 + breathe);
    ctx.quadraticCurveTo(6, -2 + breathe, 18, -6 + breathe);
    ctx.stroke();

    // 6. Трофейная броня: дорожный знак «ВНИМАНИЕ» на груди
    ctx.save();
    ctx.translate(-2, 3 + breathe);
    ctx.rotate(0.08);

    // Подложка знака (ржавый металл)
    ctx.fillStyle = '#475569';
    ctx.fillRect(-11, -8, 22, 16);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-11, -8, 22, 16);

    // Красный фон знака
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-9, -6, 18, 12);

    // Белый восклицательный знак
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-2, -4, 4, 5);
    ctx.fillRect(-2, 2, 4, 2);

    // Заклёпки по углам
    ctx.fillStyle = '#cbd5e1';
    [[-8, -5], [8, -5], [-8, 5], [8, 5]].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 7. Глаза на вершине головы
    // Правый органический глаз (выпуклый над головой)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(11, -15 + breathe, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#052e16';
    ctx.stroke();

    // Горизонтальный чёрный жабий зрачок
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(11, -15 + breathe, 4.2, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Левый бионический глаз
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(-5, -15 + breathe, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Светящаяся линза
    const lensGrad = ctx.createRadialGradient(-5, -15 + breathe, 1, -5, -15 + breathe, 5);
    lensGrad.addColorStop(0, '#ffffff');
    lensGrad.addColorStop(0.4, '#38bdf8');
    lensGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(-5, -15 + breathe, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -15 + breathe); ctx.lineTo(-2, -15 + breathe);
    ctx.moveTo(-5, -18 + breathe); ctx.lineTo(-5, -12 + breathe);
    ctx.stroke();

    // 8. Оружие в перепончатых передних лапах
    ctx.save();
    ctx.translate(10, 2 + breathe);

    // Перепончатая лапа, держащая ложу
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(-2, 4, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Корпус бластера
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, -3, 22, 7);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0, -3, 22, 7);

    // Колба с едкой кислотой
    ctx.fillStyle = '#a3e635';
    ctx.shadowColor = '#a3e635';
    ctx.shadowBlur = 5;
    ctx.fillRect(6, -6, 9, 4.5);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, -6, 9, 4.5);

    // Массивный ствол
    ctx.fillStyle = '#475569';
    ctx.fillRect(20, -2, 7, 5);
    ctx.restore();

    // 9. Полоска здоровья над головой
    if (e.hp < e.maxHp) {
      const barW = 34;
      const barH = 5;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(-barW / 2 - 1, -e.radius - 15, barW + 2, barH + 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2, -e.radius - 14, barW * pct, barH);
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2 - 1, -e.radius - 15, barW + 2, barH + 2);
    }

    ctx.restore();
  },

  // --- ДЕТАЛИЗИРОВАННЫЙ СПРАЙТ ЖАБЫ-СНАЙПЕРА (TOAD SNIPER) ---
  drawToadSniper(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    const angle = e.angle !== undefined ? e.angle : 0;
    const facingLeft = Math.cos(angle) < 0;
    const time = e.animTimer || 0;
    const breath = Math.sin(time * 0.9) * 1.2;

    // 1. Мягкая тень под ногами
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 8, e.radius * 1.1, e.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Аггро-индикатор
    if (e.isAggroed) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fillText('!', 0, -e.radius - 16);
      ctx.shadowBlur = 0;
    }

    // Зеркалирование
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    // 3. Задние тонкие лапы
    ctx.fillStyle = '#365314';
    ctx.beginPath();
    ctx.ellipse(-12, 8, 8, 5, Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(10, 9, 9, 5.5, -Math.PI / 5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Тело снайпера (камуфляжный халат/ghillie cape)
    const bodyGrad = ctx.createRadialGradient(-2, 2 + breath, 3, 0, 2 + breath, e.radius);
    bodyGrad.addColorStop(0, '#84cc16');
    bodyGrad.addColorStop(0.5, '#65a30d');
    bodyGrad.addColorStop(0.85, '#3f6212');
    bodyGrad.addColorStop(1, '#1a2e05');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2 + breath, e.radius * 0.88, e.radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#14532d';
    ctx.stroke();

    // Маскировочный капюшон/накидка
    ctx.fillStyle = '#3f6212';
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.9, -6 + breath);
    ctx.lineTo(-e.radius * 1.25, 4 + breath);
    ctx.lineTo(-e.radius * 0.4, 11 + breath);
    ctx.closePath();
    ctx.fill();

    // 5. Вытянутая морда снайпера
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.ellipse(5, -6 + breath, e.radius * 0.72, e.radius * 0.48, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. Глаза снайпера
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(8, -12 + breath, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#14532d';
    ctx.stroke();

    // Кошачий вертикальный зрачок
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(7.5, -15 + breath, 1.5, 6);

    // Левый глаз под капюшоном
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(-4, -12 + breath, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#14532d';
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4.5, -14 + breath, 1.5, 5);

    // 7. Длинная снайперская винтовка из оцинкованной трубы с прицелом
    ctx.save();
    ctx.translate(6, -2 + breath);

    // Ложа винтовки
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4, -2, 16, 5);

    // Длинный тонкий ствол с надульником
    ctx.fillStyle = '#475569';
    ctx.fillRect(10, -1.5, 26, 3);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(34, -3, 4, 6); // дульный тормоз-компенсатор

    // Оптический прицел со светящейся линзой
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, -6, 12, 3.5);
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 4;
    ctx.fillRect(17, -5.5, 2.5, 2.5);
    ctx.shadowBlur = 0;

    // Лазерный целеуказатель при аггро
    if (e.isAggroed) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(38, 0);
      ctx.lineTo(95, 0);
      ctx.stroke();
    }

    ctx.restore();

    // 7. Полоска здоровья
    if (e.hp < e.maxHp) {
      const barW = 28;
      const barH = 4;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(-barW / 2 - 1, -e.radius - 10, barW + 2, barH + 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2, -e.radius - 9, barW * pct, barH);
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2 - 1, -e.radius - 10, barW + 2, barH + 2);
    }

    ctx.restore();
  },

  // --- ДЕТАЛИЗИРОВАННЫЙ СПРАЙТ ЖАБЫ-ТАНКА (TOAD BRUTE) ---
  drawToadBrute(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // Мягкая тень под ногами
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 14, e.radius * 1.15, e.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Аггро-индикатор
    if (e.isAggroed) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillText('!', 0, -e.radius - 20);
      ctx.shadowBlur = 0;
    }

    // Огромное массивное тело
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#052e16';
    ctx.stroke();

    // Светящиеся токсичные волдыри на горбу
    ctx.fillStyle = '#a3e635';
    for (let offset of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.arc(offset, -10, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Бампер грузовика на шее (воротник)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-e.radius * 0.8, -4, e.radius * 1.6, 12);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(-e.radius * 0.8, -4, e.radius * 1.6, 12);

    // Полоска здоровья
    if (e.hp < e.maxHp) {
      const barW = e.radius * 1.8;
      const barH = 5;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barW / 2 - 1, -e.radius - 12, barW + 2, barH + 2);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(-barW / 2, -e.radius - 11, barW * pct, barH);
    }

    ctx.restore();
  }
};

window.SpriteRenderer = SpriteRenderer;

// --- 3. СИСТЕМА ЛОКАЛИЗАЦИИ ---
const LANGS = {
  ru: {
    game_title: "Василий против пришельцев",
    subtitle: "Новохмуринский Квакокалипсис",
    start_game: "ВЫЙТИ В ГОРОД",
    restart: "НАЧАТЬ ЗАНОВО",
    controls_title: "УПРАВЛЕНИЕ:",
    controls_move: "WASD — Передвижение по городу",
    controls_aim: "ЛКМ — Удар / Стрельба | R — Перезарядка",
    controls_roll: "ПРОБЕЛ — Перекат (-25 выносливости)",
    controls_interact: "E — Обыскать тайник / Лавка Михалыча | ESC — Пауза и настройки",
    controls_items: "1–8 — Слоты хотбара (порядок меняется перетаскиванием) | Q — Смена оружия в жёлтых ячейках 4 и 5 | Колесо — следующее оружие",
    equip_btn: "Экипировать",
    unequip_btn: "Снять",
    equipped_tag: "С СОБОЙ",
    stashed_tag: "У МИХАЛЫЧА",
    left_at_shop: "🎒 ОСТАВЛЕНО У МИХАЛЫЧА",
    unarmed: "✊ НЕЧЕМ БИТЬ — ВОЗЬМИ ОРУЖИЕ У МИХАЛЫЧА",
    hp: "ЗДОРОВЬЕ",
    stamina: "ВЫНОСЛИВ.",
    armor: "БРОНЯ",
    vodka: "Водка",
    stew: "Тушенка",
    bandage: "Бинты",
    game_over: "ПОТРАЧЕНО",
    game_over_sub: "Василий не вернулся с вылазки в Новохмуринск...",
    status_drunk: "ПОД МУХОЙ (+Урон, -Точность!)",
    status_slime: "В СЛИЗИ: −40% скорости, кислота −6 HP/с",
    safe_zone: "БЕЗОПАСНАЯ ЗОНА: У МИХАЛЫЧА",
    prompt_shop: "[E] Открыть лавку и верстак Михалыча",
    prompt_search: "[E] Обыскать тайник",
    shop_title: "ЛАВКА И ВЕРСТАК «У МИХАЛЫЧА»",
    shop_sub: "Покупай оружие, патроны, припасы и собирай армейские/инопланетные модификации!",
    tab_weapons: "Арсенал и Патроны",
    tab_supplies: "Припасы",
    tab_upgrades: "Ветки прокачки",
    shop_bandage: "Бинты (+45 HP за 3 с)",
    shop_stew: "Тушенка (+65 Вынослив.)",
    shop_vodka: "Водка (+Урон берсерка)",
    shop_close: "ВЕРНУТЬСЯ В ГОРОД [ESC]",
    installed: "УСТАНОВЛЕНО",
    locked_by: "БЛОКИРУЕТСЯ:",
    cost_scrap: "чермета",
    cost_bottles: "бут.",
    boss_name: "ЗОЛОТОЙ МЯСНИК",
    boss_enraged: "ЯРОСТЬ!",
    boss_berserk: "БЕРСЕРК!",
    boss_shield_tag: "ЩИТ — берёт только плазма",
    say_shield_bullets: "Кажется, обычные пули этот щит не возьмут…",
    say_shield_melee: "Кажется, железкой этот щит не пробить…",
    say_plasma_armor: "Кажется, плазма плохо пробивает эту броню…",
    say_boss_invuln: "Его сейчас ничем не взять — переждать бы…",
    say_breach: "Что это было? Будто рухнуло что-то…",
    say_coop_later: "Это окно в сетевом коопе пока не открывается — скоро",
    boss_invuln: "НЕУЯЗВИМ — берсерк",
    boss_shield_down: "⚡ ЩИТ ПРОБИТ!",
    status_daze: "ОГЛУШЁН: −40% скорости",
    prompt_breach: "[E] Проломить треснувший забор",
    prompt_breach_wait: "Забор треснул. Сначала добей жаб — осталось: ",
    breach_title: "ПРОЛОМ В ЗАБОРЕ",
    breach_sub: "За логовом Мясника — путь в Промзону",
    breach_here: "ПРОЛОМИ ЗАБОР",
    breach_marker: "ПРОЛОМ",
    location_city: "НОВОХМУРИНСК",
    location_promzona: "ПРОМЗОНА",
    location_sub: "Пролом в заборе — дорога обратно",
    location_basement: "ЛОГОВО ВАСИЛИЯ",
    location_basement_sub: "Подвал: обустрой, запасись, отдохни. Наверх — по лестнице",
    basement_hud: "🏠 Логово — здесь безопасно",
    boss_defeated: "🏆 ЗОЛОТОЙ МЯСНИК ПОВЕРЖЕН!",
    boss_adds: "🥚 Капсулы лопаются — подмога!",
    toads_left: "Жаб осталось",
    boss_alive: "☠ Мясник жив",
    boss_dead: "✓ Мясник повержен",
    pounder_name: "МЕЖПРОСТРАНСТВЕННЫЙ ДОЛБИЛЬЩИК",
    pounder_storm: "ЭЛЕКТРОБУРЯ!",
    pounder_mini: "Отщепил копию — пока она жива, его не взять!",
    pounder_shielded: "ЗАЩИЩЁН КОПИЕЙ",
    pounder_snipers: "Призвал снайперов из гнезда!",
    pounder_clones: "Расслоился между измерениями — две копии!",
    pounder_blink: "МЕРЦАЕТ — неуязвим",
    pounder_defeated: "🏆 ДОЛБИЛЬЩИК ПОВЕРЖЕН!",
    pounder_alive: "☠ Долбильщик жив",
    pounder_dead: "✓ Долбильщик повержен",
    cleared_hud: "✅ ЛОКАЦИЯ ЗАЧИЩЕНА",
    level_cleared: "ЛОКАЦИЯ ЗАЧИЩЕНА",
    level_cleared_sub: "Ни одной жабы не осталось. Забор за логовом Мясника треснул — иди и проломи его.",
    level_cleared_sub_pz: "Ни одной жабы не осталось. Промзона наша — пока."
  },
  en: {
    game_title: "Vasiliy vs Aliens",
    subtitle: "Novokhmurinsk Toadpocalypse",
    start_game: "VENTURE INTO CITY",
    restart: "START OVER",
    controls_title: "CONTROLS:",
    controls_move: "WASD — Move around town",
    controls_aim: "LMB — Attack / Shoot | R — Reload",
    controls_roll: "SPACE — Dodge Roll (-25 Stamina)",
    controls_interact: "E — Scavenge / Shop | ESC — Pause & settings",
    controls_items: "1–8 — Hotbar slots (drag to reorder) | Q — Swap weapons in yellow slots 4 and 5 | Wheel — next weapon",
    equip_btn: "Equip",
    unequip_btn: "Unequip",
    equipped_tag: "CARRIED",
    stashed_tag: "AT MIKHALYCH",
    left_at_shop: "🎒 LEFT AT MIKHALYCH",
    unarmed: "✊ NOTHING TO FIGHT WITH — TAKE A WEAPON AT MIKHALYCH",
    hp: "HEALTH",
    stamina: "STAMINA",
    armor: "ARMOR",
    vodka: "Vodka",
    stew: "Stew",
    bandage: "Bandages",
    game_over: "WASTED",
    game_over_sub: "Vasiliy never returned from the raid...",
    status_drunk: "DRUNK BERSERK (+DMG, -Accuracy!)",
    status_slime: "IN SLIME: −40% speed, acid −6 HP/s",
    safe_zone: "SAFE ZONE: MIKHALYCH'S SCRAP",
    prompt_shop: "[E] Open Mikhalych's Workbench",
    prompt_search: "[E] Scavenge stash",
    shop_title: "MIKHALYCH'S SHOP & WORKBENCH",
    shop_sub: "Buy weapons, ammo, rations and craft military/alien augmentations!",
    tab_weapons: "Arsenal & Ammo",
    tab_supplies: "Supplies",
    tab_upgrades: "Skill Trees",
    shop_bandage: "Bandages (+45 HP over 3s)",
    shop_stew: "Stew (+65 Stamina)",
    shop_vodka: "Vodka (+Berserk DMG)",
    shop_close: "RETURN TO CITY [ESC]",
    installed: "INSTALLED",
    locked_by: "LOCKED BY:",
    cost_scrap: "scrap",
    cost_bottles: "bot.",
    boss_name: "THE GOLDEN BUTCHER",
    boss_enraged: "ENRAGED!",
    boss_berserk: "BERSERK!",
    boss_shield_tag: "SHIELD — plasma only",
    say_shield_bullets: "Looks like plain bullets won't get through this shield…",
    say_shield_melee: "Looks like I can't smash through this shield…",
    say_plasma_armor: "Looks like plasma barely scratches this armor…",
    say_boss_invuln: "Nothing gets through to him right now — better wait it out…",
    say_breach: "What was that? Sounded like something caved in…",
    say_coop_later: "This window doesn't open in network co-op yet — coming soon",
    boss_invuln: "INVULNERABLE — berserk",
    boss_shield_down: "⚡ SHIELD DOWN!",
    status_daze: "DAZED: −40% speed",
    prompt_breach: "[E] Smash the cracked fence",
    prompt_breach_wait: "The fence is cracked. Finish off the toads first — left: ",
    breach_title: "FENCE BREACHED",
    breach_sub: "Behind the Butcher's lair — the way to the Industrial Zone",
    breach_here: "SMASH THE FENCE",
    breach_marker: "BREACH",
    location_city: "NOVOKHMURINSK",
    location_promzona: "INDUSTRIAL ZONE",
    location_sub: "The fence breach is the way back",
    location_basement: "VASILIY'S LAIR",
    location_basement_sub: "The basement: furnish it, stock up, rest. Upstairs — by the stairs",
    basement_hud: "🏠 Lair — safe here",
    boss_defeated: "🏆 THE GOLDEN BUTCHER IS DOWN!",
    boss_adds: "🥚 The pods burst — reinforcements!",
    toads_left: "Toads left",
    boss_alive: "☠ Butcher alive",
    boss_dead: "✓ Butcher down",
    pounder_name: "THE INTERDIMENSIONAL POUNDER",
    pounder_storm: "ELECTRIC STORM!",
    pounder_mini: "Split off a copy — while it lives, he can't be hurt!",
    pounder_shielded: "SHIELDED BY A COPY",
    pounder_snipers: "Called snipers from the nest!",
    pounder_clones: "Split across dimensions — two copies!",
    pounder_blink: "BLINKING — invulnerable",
    pounder_defeated: "🏆 THE POUNDER IS DOWN!",
    pounder_alive: "☠ Pounder alive",
    pounder_dead: "✓ Pounder down",
    cleared_hud: "✅ AREA CLEARED",
    level_cleared: "AREA CLEARED",
    level_cleared_sub: "Not a single toad left. The fence behind the Butcher's lair has cracked — go and smash it.",
    level_cleared_sub_pz: "Not a single toad left. The industrial zone is ours — for now."
  }
};

let currentLang = 'ru';
function t(key) {
  const s = LANGS[currentLang][key] || key;
  return key === 'game_title' ? s : personalize(s); // название игры — всегда про Василия
}

// --- Кооп: имя игрока вместо «Василий» в текстах (кат-сцены, диалоги, квесты, подписи) — со склонением ---
// Падежи, какие встречаются в текстах: Василий, Василия (род./вин.), Василию, Василием, Василии
const NAME_FORMS = {};
function nameForms(name) {
  if (NAME_FORMS[name]) return NAME_FORMS[name];
  const words = name.trim().split(/\s+/);
  const last = words.pop();
  const head = words.length ? words.join(' ') + ' ' : '';
  const lo = last.toLowerCase();
  const end1 = lo.slice(-1), end2 = lo.slice(-2);
  const stem = n => last.slice(0, last.length - n);
  let f;
  if (!/^[а-яё-]+$/i.test(last) || /[оеиуыюэё]$/.test(lo)) {
    f = [last, last, last, last, last];                                 // не склоняется: Ли, Хосе, Ник латиницей
  } else if (end2 === 'ий') {
    f = [last, stem(1) + 'я', stem(1) + 'ю', stem(1) + 'ем', stem(1) + 'и'];   // Василий, Дмитрий
  } else if (end1 === 'й') {
    f = [last, stem(1) + 'я', stem(1) + 'ю', stem(1) + 'ем', stem(1) + 'е'];   // Андрей, Сергей
  } else if (end1 === 'ь') {
    f = [last, stem(1) + 'я', stem(1) + 'ю', stem(1) + 'ем', stem(1) + 'е'];   // Игорь
  } else if (end2 === 'ия') {
    f = [last, stem(1) + 'и', stem(1) + 'и', stem(1) + 'ей', stem(1) + 'и'];   // Мария
  } else if (end1 === 'я') {
    f = [last, stem(1) + 'и', stem(1) + 'е', stem(1) + (end2 === 'ья' ? 'ёй' : 'ей'), stem(1) + 'е'];   // Вася, Коля, Илья
  } else if (end1 === 'а') {
    const soft = /[гкхжшщч]$/.test(lo.slice(0, -1));
    const hiss = /[жшщчц]$/.test(lo.slice(0, -1));
    f = [last, stem(1) + (soft ? 'и' : 'ы'), stem(1) + 'е', stem(1) + (hiss ? 'ей' : 'ой'), stem(1) + 'е'];  // Миша, Никита
  } else {
    // Согласная: Иван, Пётр, Павел (беглая гласная — как в жизни)
    const FLEETING = { 'пётр': 'Петр', 'петр': 'Петр', 'павел': 'Павл', 'лев': 'Льв' };
    let b = FLEETING[lo] ? (last[0] === last[0].toUpperCase() ? FLEETING[lo] : FLEETING[lo].toLowerCase()) : last;
    const hiss = /[жшщчц]$/.test(lo);
    f = [last, b + 'а', b + 'у', b + (hiss ? 'ем' : 'ом'), b + 'е'];
  }
  NAME_FORMS[name] = { nom: head + f[0], gen: head + f[1], dat: head + f[2], ins: head + f[3], pre: head + f[4] };
  return NAME_FORMS[name];
}

// Род в тексте под героя игрока (src/heroes.js): «нашёл{|а}» — мужской|женский вариант; who — о ком текст
function gendered(text, who) {
  if (typeof text !== 'string' || text.indexOf('{') < 0) return text;
  let fem = false;
  try { fem = typeof heroDef === 'function' && heroDef((who || localPlayer).hero).f; } catch (e) { /* игрок ещё не создан */ }
  return text.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (m, a, b) => (fem ? b : a));
}

// Текст для своего игрока: род — под его героя, в коопе со своим именем — «Василий» в нём меняется на это
// имя в нужном падеже
function personalize(text) {
  if (typeof text !== 'string') return text;
  text = gendered(text);
  let name, many;
  try { name = (localPlayer.name || '').trim(); many = players.length > 1; } catch (e) { return text; } // игрок ещё не создан
  if (!name || name === 'Василий' || name === 'Vasiliy' || !many) return text;
  const f = nameForms(name);
  return text
    .replace(/Васили(ем|ю|я|и|й)(?![а-яё])/g, (m, end) => ({ 'й': f.nom, 'я': f.gen, 'ю': f.dat, 'ем': f.ins, 'и': f.pre })[end])
    .replace(/Vasil(?:i)?y\b/g, name);
}

function updateUILanguage() {
  document.getElementById('lbl-hp').innerText = t('hp');
  document.getElementById('lbl-stamina').innerText = t('stamina');
  document.getElementById('lbl-armor').innerText = t('armor');
  if (typeof refreshConsumableSlots === 'function') refreshConsumableSlots();
  const lblBat = document.getElementById('lbl-w-bat');
  if (lblBat) lblBat.innerText = currentLang === 'ru' ? 'Бита' : 'Spiked Bat';
  const lblMakarov = document.getElementById('lbl-w-makarov');
  if (lblMakarov) lblMakarov.innerText = currentLang === 'ru' ? 'ПМ 9×18' : 'Makarov PM';
  const lblNagant = document.getElementById('lbl-w-nagant');
  if (lblNagant) lblNagant.innerText = currentLang === 'ru' ? 'Наган' : 'Nagant';
  const lblShotgun = document.getElementById('lbl-w-shotgun');
  if (lblShotgun) lblShotgun.innerText = currentLang === 'ru' ? 'Обрез' : 'Shotgun';
  const lblDrill = document.getElementById('lbl-w-drill');
  if (lblDrill) lblDrill.innerText = currentLang === 'ru' ? 'Дрель' : 'Drill';
  const lblPlasma = document.getElementById('lbl-w-plasma');
  if (lblPlasma) lblPlasma.innerText = currentLang === 'ru' ? 'Плазма' : 'Plasma';
  const lblLaser = document.getElementById('lbl-w-laser');
  if (lblLaser) lblLaser.innerText = currentLang === 'ru' ? 'Лазер' : 'Laser';
  document.getElementById('safe-zone-tag').innerText = t('safe_zone');
  document.getElementById('status-badge').innerText = t('status_drunk');
  document.getElementById('btn-lang').innerText = currentLang.toUpperCase();
  
  document.getElementById('shop-title').innerText = t('shop_title');
  document.getElementById('shop-sub').innerText = t('shop_sub');
  const lblTabWep = document.getElementById('lbl-tab-weapons');
  if (lblTabWep) lblTabWep.innerText = t('tab_weapons');
  const lblTabSup = document.getElementById('lbl-tab-supplies');
  if (lblTabSup) lblTabSup.innerText = t('tab_supplies');
  const lblTabUpg = document.getElementById('lbl-tab-upgrades');
  if (lblTabUpg) lblTabUpg.innerText = t('tab_upgrades');
  document.getElementById('btn-shop-close').innerText = t('shop_close');

  const menuScreen = document.getElementById('screen-menu');
  if (menuScreen.style.display !== 'none') {
    if (gameState === 'MENU') {
      document.getElementById('menu-title').innerText = t('game_title');
      document.getElementById('menu-subtitle').innerText = t('subtitle');
      document.getElementById('btn-start').innerText = t('start_game');
    } else if (gameState === 'GAMEOVER') {
      document.getElementById('menu-title').innerText = t('game_over');
      document.getElementById('menu-subtitle').innerText = t('game_over_sub');
      document.getElementById('btn-start').innerText = t('restart');
    }
    document.getElementById('menu-ctrl-title').innerText = t('controls_title');
    document.getElementById('menu-ctrl-move').innerText = t('controls_move');
    document.getElementById('menu-ctrl-aim').innerText = t('controls_aim');
    document.getElementById('menu-ctrl-roll').innerText = t('controls_roll');
    document.getElementById('menu-ctrl-interact').innerText = t('controls_interact');
    document.getElementById('menu-ctrl-items').innerText = t('controls_items');
  }

  if (document.getElementById('shop-modal').style.display === 'flex') {
    renderArsenalAndSupplies();
    renderUpgradeTrees();
  }
  if (window.Menu) window.Menu.refreshTexts();
}

document.getElementById('btn-lang').addEventListener('click', () => {
  currentLang = currentLang === 'ru' ? 'en' : 'ru';
  updateUILanguage();
});

// --- 4. ДВИЖОК И ПЕРЕМЕННЫЕ ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Масштаб отрисовки (настройка «Разрешение»): холст рисуется в renderScale от размера окна, CSS растягивает
// его на весь экран. На слабой встроенной видеокарте при 1920 px кадр упирается в заливку пикселей (тени,
// земля, дымка за забором) — при 75% пикселей почти вдвое меньше. Игра живёт в логических пикселях окна
// viewW × viewH: камера, отсечение, мышь, экранные стрелки; render() ставит масштаб в начале кадра
let renderScale = 1;
let renderScaleSetting = 'auto'; // 'auto' | 1 | 0.75 | 0.5 (src/menu.js)
let viewW = window.innerWidth, viewH = window.innerHeight;
const RENDER_SCALE_MIN = 0.5;

function resizeCanvas() {
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.max(1, Math.round(viewW * renderScale));
  canvas.height = Math.max(1, Math.round(viewH * renderScale));
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.setRenderScaleSetting = function(v) {
  renderScaleSetting = v === 'auto' ? 'auto' : Math.max(RENDER_SCALE_MIN, Math.min(1, Number(v) || 1));
  renderScale = renderScaleSetting === 'auto' ? 1 : renderScaleSetting;
  autoScale.reset();
  resizeCanvas();
};

// «Авто»: если 3 с игры кадры в основном дольше 28 мс (меньше ~35 FPS), разрешение снижается на ступень
// (до 50%). Обратно само не поднимается — запас по видеокарте при vsync не измерить; поднимает смена
// настройки или перезагрузка
const autoScale = {
  t: 0, n: 0, slow: 0, holdUntil: 0,
  reset() { this.t = 0; this.n = 0; this.slow = 0; },
  // После старта и перехода грузятся модели и прогреваются кадры — эти тормоза разрешение не снижают
  hold(ms) { this.holdUntil = performance.now() + ms; this.reset(); },
  frame(dt) {
    if (renderScaleSetting !== 'auto' || gameState !== 'PLAYING' || document.hidden ||
        performance.now() < this.holdUntil) { this.reset(); return; }
    if (dt > 250) return; // пауза, свёрнутая вкладка
    this.t += dt;
    this.n++;
    if (dt > 28) this.slow++;
    if (this.t < 3000) return;
    if (this.slow > this.n * 0.6 && renderScale > RENDER_SCALE_MIN) {
      renderScale = Math.max(RENDER_SCALE_MIN, Math.round((renderScale - 0.15) * 100) / 100);
      resizeCanvas();
    }
    this.reset();
  }
};

// Раскладка карты — MAP в environment.js
const WORLD_WIDTH = MAP.SIZE;
const WORLD_HEIGHT = MAP.SIZE;
const camera = { x: 0, y: 0 };
let gameState = 'MENU';

// Игрок. В коопе (docs/COOP.md) их несколько — players; makePlayer() создаёт каждого с нуля
function makePlayer() {
  return {
  x: MAP.CENTER,
  y: MAP.CENTER,
  radius: 20,
  speed: 4.2,
  maxHp: 100,
  hp: 100,
  maxStamina: 100,
  stamina: 100,
  isRolling: false,
  rollDuration: 0,
  rollCooldown: 0,
  rollDx: 0,
  rollDy: 0,
  angle: 0,
  facingLeft: false,
  moveDir: 'side', // 'side', 'up', 'down'
  isMoving: false,
  animTimer: 0,
  baseDamage: 24,
  critChance: 0.05,
  critMult: 1.6,
  isDrunk: false,
  drunkTimer: 0,
  itemCooldown: 0, // общая перезарядка расходников, кадры
  healLeft: 0,     // сколько ещё долечит наложенный бинт
  items: {
    vodka: 0,
    stew: 1,
    bandage: 2,
    // Столовая Лены (src/canteen.js)
    soup: 0, tincture: 0, jelly: 0, compress: 0, drops: 0, ointment: 0, borscht: 0
  },
  buffs: {},            // блюда столовой, что действуют сейчас: кадры (src/canteen.js)
  healRate: 0,          // с какой скоростью лечит наложенное (студень — быстрее бинта)
  resources: {
    bottles: 0,
    scrap: 0,
    mil_parts: 0,
    alien_core: 0,
    toad_eye: 0,
    toad_leg: 0,
    toad_liver: 0,
    // Лут Промзоны (PZ_LOOT_NAMES)
    nonferrous: 0,
    blueprint: 0,
    tech_spirit: 0,
    plasma_cell: 0,
    kvako_charge: 0,
    electronics: 0   // продвинутая электроника: только в сейфах, на ЭМИ-гранаты (src/workshop.js)
  },
  // карты, выбранные после боссов: Мясника — speed, agility, vitality; Долбильщика — laser, dash, regen
  cards: { speed: 0, agility: 0, vitality: 0, laser: 0, dash: 0, regen: 0 },
  unlockedWeapons: {
    bat: true,
    makarov: false,
    drill: false,
    shotgun: false,
    plasma: false,
    laser: false, // только картой Долбильщика
    // Мастерская Толика (src/workshop.js)
    launcher: false,
    arc: false,
    emp: false,
    nagant: false   // наган Зины — награда квеста «Коля» (src/quests.js)
  },
  ammo: {
    makarov: { clip: 8, maxClip: 8, reserve: 16, reloadTime: 80 },
    shotgun: { clip: 2, maxClip: 2, reserve: 8, reloadTime: 110 },
    launcher: { clip: 0, maxClip: 1, reserve: 0, reloadTime: 90 },
    // Наган заряжается по патрону: reloadTime — на один
    nagant: { clip: 0, maxClip: 7, reserve: 0, reloadTime: 20 }
  },
  empGrenades: 0,       // ЭМИ-гранаты (src/workshop.js)
  arcCharge: 0,         // заряд разрядника: кадры дуги из текущей плазменной ячейки
  empT: 0,              // ЭМИ: сколько кадров ещё молчат плазма, лазер и разрядник
  reloadingWeapon: null,
  reloadTimer: 0,
  reloadMaxTimer: 0,
  plasmaHeat: 0,
  plasmaOverheated: false,
  plasmaOverheatTimer: 0,
  laserCharge: 0,       // накопитель лазерного бластера, кадры огня (до CARD_EFFECTS.laserCharge)
  laserRecharge: 0,     // идёт перезарядка накопителя, кадров осталось
  abilityCd: 0,         // перезарядка способности на ПКМ (рывок / гиперрегенерация), кадры
  regenLeft: 0,         // гиперрегенерация: сколько кадров ещё лечит
  isDashing: false,     // рывок — быстрый перекат (isRolling) без кувырка
  currentWeapon: 'bat',
  equipped: { bat: true }, // что из купленного Василий носит с собой (остальное — у Михалыча)
  unlockedPerks: new Set(),
  blockedPerks: new Set(),
  hasPerk(id) {
    return this.unlockedPerks.has(id);
  },
  // Кооп: кто это и чем управляется. input — его клавиши и мышь (свои — с клавиатуры, чужие — по сети)
  id: 0,
  name: '',
  color: 0,          // цвет ватника (COOP_COLORS)
  input: { keys: {}, mouse: { x: 0, y: 0 }, down: false },
  shootCd: 0,
  nearby: null,
  char: null         // его 3D-Василий (ThreeCharacterManager)
  };
}

// player — «текущий» игрок: тот, чей ход сейчас считает update() (usePlayer), а вне этого — свой (localPlayer).
// Так сотни мест player.* работают для любого из игроков без переделки
let player = makePlayer();
const players = [player];
let localPlayer = player;

const safeZone = {
  x: MAP.CENTER,
  y: MAP.CENTER,
  radius: 280,
  shopX: MAP.CENTER,
  shopY: MAP.CENTER - 60,
  shopRadius: 55
};

let buildings = [];
let roads = [];
let containers = [];
let enemies = [];
let bullets = [];
let enemyBullets = [];
let particles = [];
let muzzleFlashes = [];
let shellCasings = [];
let floatingTexts = [];
let lootItems = [];
// Зачистка локации: сколько жаб было при генерации и перебиты ли все (включая босса)
let levelEnemyTotal = 0;
let levelCleared = false;
let cameraKickX = 0;
let cameraKickY = 0;

// --- СИСТЕМА РАЙОНОВ НОВОХМУРИНСКА И МАТРИЦА ЗАВИСИМОСТЕЙ (TIER 0 -> TIER 4) ---
// bottleMult / scrapMult — множители стеклотары и чермета с тайников и врагов района.
// Врагов конечное число, поэтому весь доход локации посчитан заранее: docs/BALANCE.md
const DISTRICTS = {
  hub: {
    id: 'hub',
    tier: 0,
    name_ru: '🟢 ПЯТАЧОК У МИХАЛЫЧА',
    name_en: '🟢 MIKHALYCH SAFE HUB',
    meta_ru: 'Угроза: Безопасно | Лавка Оружия, Патронов и Верстак',
    meta_en: 'Threat: Safe | Arsenal, Ammo & Workbench',
    color: '#10b981',
    bottleMult: 1.0,
    scrapMult: 1.0
  },
  courtyards: {
    id: 'courtyards',
    tier: 1,
    name_ru: '🟡 СПАЛЬНЫЕ ХРУЩЁВКИ',
    name_en: '🟡 RESIDENTIAL COURTYARDS',
    meta_ru: 'Угроза: ★☆☆☆ (Болотные Прыгуны) | Ресурс: Стеклотара, Бинты',
    meta_en: 'Threat: ★☆☆☆ (Swamp Leapers) | Loot: Bottles, Bandages',
    color: '#eab308',
    bottleMult: 1.0,
    scrapMult: 0.8
  },
  garages: {
    id: 'garages',
    tier: 2,
    name_ru: '🟠 ГАРАЖНЫЙ КООПЕРАТИВ «ВОСТОК»',
    name_en: '🟠 GARAGE COOPERATIVE',
    meta_ru: 'Угроза: ★★☆☆ (Плевальщики и Пехота) | Ресурс: Чермет ×1.5 (на ПМ и Дрель)',
    meta_en: 'Threat: ★★☆☆ (Spitters & Grunts) | Loot: Scrap ×1.5 (for PM & Drill)',
    color: '#f97316',
    bottleMult: 1.3,
    scrapMult: 1.5
  },
  heating: {
    id: 'heating',
    tier: 2,
    name_ru: '🔵 МАГИСТРАЛЬ ТЕПЛОТРАССЫ',
    name_en: '🔵 HEATING PIPELINE SECTOR',
    meta_ru: 'Угроза: ★★☆☆ (Засады у труб) | Ресурс: Чермет, Водка, Тушёнка ×1.5',
    meta_en: 'Threat: ★★☆☆ (Pipe Ambushes) | Loot: Scrap, Vodka, Stew ×1.5',
    color: '#38bdf8',
    bottleMult: 1.6,
    scrapMult: 1.0
  },
  cordon: {
    id: 'cordon',
    tier: 3,
    name_ru: '🔴 ВОЕННЫЙ КОРДОН',
    name_en: '🔴 MILITARY CORDON',
    meta_ru: 'Угроза: ★★★☆ (Штурмовики и Громилы) | Особый ресурс: Оружейные детали (на Обрез)',
    meta_en: 'Threat: ★★★☆ (Troopers & Brutes) | Special Loot: Gun Parts (for Shotgun)',
    color: '#ef4444',
    bottleMult: 2.0,
    scrapMult: 1.2
  },
  nest: {
    id: 'nest',
    tier: 4,
    name_ru: '🟣 КВАКО-ГНЕЗДО (ЗОНА ВЫСАДКИ)',
    name_en: '🟣 TOAD NEST (DROP ZONE)',
    meta_ru: 'Угроза: ★★★★ (Элитные Квако-Танки) | Особый ресурс: Квако-ядра (на Плазмаган)',
    meta_en: 'Threat: ★★★★ (Elite Toad Tanks) | Special Loot: Alien Cores (for Plasma Gun)',
    color: '#a855f7',
    bottleMult: 2.6,
    scrapMult: 1.2
  }
};

// --- ЛОКАЦИИ ---
// Город (Новохмуринск) и Промзона за его северным забором: одна сетка дорог (MAP.ROADS), свои районы,
// застройка и враги. Между ними — пролом в заборе (fenceBreach). Уходя из локации, её мир сохраняется в
// locationWorlds (тем же снимком, что пишет сохранение: Menu.snapshotWorld) и восстанавливается при возвращении.
// План Промзоны — docs/LEVEL2_PROMZONA.md
let currentLocation = 'city';
let locationWorlds = {};          // { city: снимок мира, promzona: снимок мира } — для тех, где Василия сейчас нет
let locationsVisited = new Set(['city']);
window.getLocation = () => currentLocation;

// Районы Промзоны (раздел 2 плана): сложность растёт от пролома (юго-восток) к градирням (северо-запад)
const PROMZONA_DISTRICTS = {
  pz_breach: {
    id: 'pz_breach', tier: 1,
    name_ru: '🟢 У ПРОЛОМА', name_en: '🟢 BY THE BREACH',
    meta_ru: 'Угроза: ★☆☆☆ | Пролом — обратно в Новохмуринск, к Михалычу',
    meta_en: 'Threat: ★☆☆☆ | The breach leads back to Novokhmurinsk and Mikhalych',
    color: '#10b981', bottleMult: 1.0, scrapMult: 1.0
  },
  pz_admin: {
    id: 'pz_admin', tier: 1,
    name_ru: '🟡 ЗАВОДОУПРАВЛЕНИЕ', name_en: '🟡 PLANT ADMINISTRATION',
    meta_ru: 'Угроза: ★☆☆☆ | Ресурс: Стеклотара, Бинты, Техспирт',
    meta_en: 'Threat: ★☆☆☆ | Loot: Bottles, Bandages, Tech alcohol',
    color: '#eab308', bottleMult: 1.2, scrapMult: 1.0,
    pzLoot: [['tech_spirit', 0.12]] // заводская лаборатория
  },
  pz_railyard: {
    id: 'pz_railyard', tier: 2,
    name_ru: '🟠 Ж/Д СОРТИРОВКА', name_en: '🟠 RAIL YARD',
    meta_ru: 'Угроза: ★★☆☆ | Ресурс: Чермет, Тушёнка, Цветмет',
    meta_en: 'Threat: ★★☆☆ | Loot: Scrap, Stew, Non-ferrous',
    pzLoot: [['nonferrous', 0.2]],
    color: '#f97316', bottleMult: 1.4, scrapMult: 1.5
  },
  pz_depot: {
    id: 'pz_depot', tier: 2,
    name_ru: '🟠 АВТОБАЗА', name_en: '🟠 TRUCK DEPOT',
    meta_ru: 'Угроза: ★★☆☆ | Ресурс: Чермет ×1.5, Цветмет',
    meta_en: 'Threat: ★★☆☆ | Loot: Scrap ×1.5, Non-ferrous',
    pzLoot: [['nonferrous', 0.22]],
    color: '#f97316', bottleMult: 1.4, scrapMult: 1.6
  },
  pz_foundry: {
    id: 'pz_foundry', tier: 3,
    name_ru: '🔴 ЛИТЕЙНЫЙ ЦЕХ', name_en: '🔴 FOUNDRY',
    meta_ru: 'Угроза: ★★★☆ | Ресурс: Чермет, Детали, Цветмет',
    meta_en: 'Threat: ★★★☆ | Loot: Scrap, Parts, Non-ferrous',
    pzLoot: [['nonferrous', 0.35]],
    color: '#ef4444', bottleMult: 2.0, scrapMult: 1.4
  },
  pz_workshops: {
    id: 'pz_workshops', tier: 3,
    name_ru: '🔴 МЕХАНИЧЕСКИЕ ЦЕХА', name_en: '🔴 MACHINE SHOPS',
    meta_ru: 'Угроза: ★★★☆ | Ресурс: Детали, Цветмет',
    meta_en: 'Threat: ★★★☆ | Loot: Parts, Non-ferrous',
    pzLoot: [['nonferrous', 0.35]],
    color: '#ef4444', bottleMult: 2.0, scrapMult: 1.3
  },
  pz_warehouses: {
    id: 'pz_warehouses', tier: 3,
    name_ru: '🔴 СКЛАДЫ ПРОДУКЦИИ', name_en: '🔴 WAREHOUSES',
    meta_ru: 'Угроза: ★★★☆ | Ресурс: Детали, Патроны, Цветмет',
    meta_en: 'Threat: ★★★☆ | Loot: Parts, Ammo, Non-ferrous',
    pzLoot: [['nonferrous', 0.18], ['tech_spirit', 0.06]],
    color: '#ef4444', bottleMult: 2.0, scrapMult: 1.2
  },
  pz_tankfarm: {
    id: 'pz_tankfarm', tier: 3,
    name_ru: '🔴 РЕЗЕРВУАРНЫЙ ПАРК', name_en: '🔴 TANK FARM',
    meta_ru: 'Угроза: ★★★☆ | Ресурс: Детали, Водка, Техспирт',
    meta_en: 'Threat: ★★★☆ | Loot: Parts, Vodka, Tech alcohol',
    pzLoot: [['tech_spirit', 0.12]],
    color: '#ef4444', bottleMult: 2.1, scrapMult: 1.2
  },
  pz_cooling: {
    id: 'pz_cooling', tier: 4,
    name_ru: '🟣 ГРАДИРНИ (КВАКО-ГНЕЗДО)', name_en: '🟣 COOLING TOWERS (TOAD NEST)',
    meta_ru: 'Угроза: ★★★★ | Особый ресурс: Квако-ядра',
    meta_en: 'Threat: ★★★★ | Special Loot: Alien Cores',
    color: '#a855f7', bottleMult: 2.6, scrapMult: 1.2
  },
  pz_sludge: {
    id: 'pz_sludge', tier: 4,
    name_ru: '🟣 ШЛАМ-ПРУДЫ', name_en: '🟣 SLUDGE PONDS',
    meta_ru: 'Угроза: ★★★★ | Особый ресурс: Квако-ядра',
    meta_en: 'Threat: ★★★★ | Special Loot: Alien Cores',
    color: '#a855f7', bottleMult: 2.6, scrapMult: 1.2
  }
};

// Районы Промзоны по сетке кварталов: запад — гнездо, центр — цеха и склады, восток — резервуары и
// автобаза, юг — сортировка, заводоуправление и пролом
function getPromzonaDistrictAt(x, y) {
  const D = PROMZONA_DISTRICTS;
  if (x < MAP.RING_A) {
    if (y < MAP.CENTER) return D.pz_cooling;
    return y < MAP.RING_B ? D.pz_sludge : D.pz_railyard;
  }
  if (x > MAP.RING_B) {
    if (y < MAP.CENTER) return D.pz_tankfarm;
    return y < MAP.RING_B ? D.pz_depot : D.pz_breach;
  }
  if (y < MAP.RING_A) return D.pz_warehouses;
  if (y < MAP.CENTER) return D.pz_foundry;
  if (y < MAP.RING_B) return D.pz_workshops;
  return x < MAP.CENTER ? D.pz_railyard : D.pz_admin;
}

function getDistrictAt(x, y) {
  if (currentLocation === 'promzona') return getPromzonaDistrictAt(x, y);
  if (currentLocation === 'basement' && window.Basement) return window.Basement.DISTRICT; // логово (src/basement.js)
  if (Math.hypot(x - safeZone.x, y - safeZone.y) < 420) {
    return DISTRICTS.hub;
  }
  const isOuterX = (x < MAP.RING_A || x > MAP.RING_B);
  const isOuterY = (y < MAP.RING_A || y > MAP.RING_B);

  // 4 дальних угла карты — Квако-Гнезда (Tier 4)
  if (isOuterX && isOuterY) {
    return DISTRICTS.nest;
  }
  // Западный сектор — Гаражный кооператив «Восток» (Tier 2A)
  if (x < MAP.RING_A) {
    return DISTRICTS.garages;
  }
  // Восточный сектор — Магистраль Теплотрассы (Tier 2B)
  if (x > MAP.RING_B) {
    return DISTRICTS.heating;
  }
  // Северный и Южный сектора — Военный Кордон (Tier 3)
  if (isOuterY) {
    return DISTRICTS.cordon;
  }
  // Центральные 4 квартала вокруг базы — Спальные Хрущёвки (Tier 1)
  return DISTRICTS.courtyards;
}
window.getDistrictAt = getDistrictAt;

let lastPlayerDistrictId = 'hub';

// Купол Михалыча есть только в городе. В Промзоне безопасной зоны нет: купол уносится далеко за карту,
// и все проверки «рядом с базой» (спавн, магазин, отталкивание жаб) просто не срабатывают
const SAFE_ZONE_HOME = { x: safeZone.x, y: safeZone.y, radius: safeZone.radius, shopX: safeZone.shopX, shopY: safeZone.shopY };
function applyLocationSafeZone() {
  if (currentLocation === 'city') Object.assign(safeZone, SAFE_ZONE_HOME);
  else Object.assign(safeZone, { x: -100000, y: -100000, radius: 0, shopX: -100000, shopY: -100000 });
}

function generateWorld() {
  applyLocationSafeZone();
  // Декор (фонари, дворы, рельсы, дымка за забором) у каждой локации свой — до buildObstacles, который его раскладывает
  if (window.environmentRenderer) window.environmentRenderer.setLocation(currentLocation);
  bossRef = null;
  pounderRef = null;
  buildings = [];
  roads = [];
  containers = [];
  enemies = [];
  bullets = [];
  enemyBullets = [];
  rockets = [];
  resetFireGoo();
  rocketBlasts = [];
  pounderRings = [];
  if (window.Defense) window.Defense.onWorld();
  if (window.Quests) window.Quests.onWorld(); // предметы квестов и охрана — когда мир загрузится
  particles = [];
  muzzleFlashes = [];
  shellCasings = [];
  floatingTexts = [];
  lootItems = [];
  thrownProps = [];
  cameraKickX = 0;
  cameraKickY = 0;

  // Дороги — MAP.ROADS: проспект через центр и две кольцевые, по каждой оси (в подвале их нет)
  if (currentLocation !== 'basement') MAP.ROADS.forEach(r => {
    roads.push({ x: 0, y: r.pos, w: WORLD_WIDTH, h: r.size });
    roads.push({ x: r.pos, y: 0, w: r.size, h: WORLD_HEIGHT });
  });

  const isNearRoad = (rx, ry, rw, rh, pad = 32) => {
    return roads.some(r =>
      rx + rw + pad > r.x && rx - pad < r.x + r.w &&
      ry + rh + pad > r.y && ry - pad < r.y + r.h
    );
  };

  const overlapsAnyBuilding = (rx, ry, rw, rh, ignoreB = null, padX = 26, padY = 32) => {
    return buildings.some(other => {
      if (other === ignoreB) return false;
      return (
        rx + rw + padX > other.x &&
        rx - padX < other.x + other.w &&
        ry + rh + padY > other.y &&
        ry - padY < other.y + other.h
      );
    });
  };

  // Ж/д колеи Промзоны (environment.rails): насыпь ~70 px, на неё не строим и не ставим тайники
  const rails = (window.environmentRenderer && window.environmentRenderer.rails) || [];
  const onRails = (rx, ry, rw, rh, pad = 50) => rails.some(r => r.horizontal
    ? ry + rh > r.pos - pad && ry < r.pos + pad && rx + rw > r.from && rx < r.to
    : rx + rw > r.pos - pad && rx < r.pos + pad && ry + rh > r.from && ry < r.to);

  const tryAddBuilding = (x, y, w, h, type, extra = {}) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (rx < 70 || ry < 70 || rx + w > WORLD_WIDTH - 70 || ry + h > WORLD_HEIGHT - 70) return null;
    if (Math.hypot(rx + w / 2 - safeZone.x, ry + h / 2 - safeZone.y) < 390) return null;
    if (isNearRoad(rx, ry, w, h, 30)) return null;
    if (!extra.overRails && onRails(rx, ry, w, h)) return null;
    if (overlapsAnyBuilding(rx, ry, w, h, null, 24, 28)) return null;
    const obj = Object.assign({ x: rx, y: ry, w, h, type }, extra);
    obj.col = buildingCollisionRect(obj);
    buildings.push(obj);
    return obj;
  };

  const tryAddContainer = (x, y, type, subType = null, dirIdx = undefined) => {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx < 85 || cy < 85 || cx > WORLD_WIDTH - 85 || cy > WORLD_HEIGHT - 85) return false;
    if (Math.hypot(cx - safeZone.x, cy - safeZone.y) < 305) return false;

    const pz = PZ_CONTAINERS[type];
    // У грузовиков Промзоны (x, y) — середина пятна, радиус — полдлины
    const cRadius = pz ? Math.round(pz.len * (type === 'barrel' ? 0.5 : 0.45)) : (type === 'car' ? 48 : (type === 'trash' ? 26 : 22));
    const pad = type === 'car' || (pz && type !== 'barrel') ? 56 : 38;
    if (onRails(cx - cRadius, cy - cRadius, cRadius * 2, cRadius * 2, 40)) return false;

    // Дом рисуется выше своего пятна (крыша уходит назад) — тайник за ним оказался бы на стене
    const insideBuilding = buildings.some(b => {
      const roof = buildingSpriteTop(b);
      return cx >= b.x - pad && cx <= b.x + b.w + pad &&
        cy >= b.y - pad - roof && cy <= b.y + b.h + pad;
    });
    if (insideBuilding) return false;

    const tooClose = containers.some(existing =>
      Math.hypot(cx - existing.x, cy - existing.y) < (cRadius + existing.radius + 36)
    );
    if (tooClose) return false;

    const dist = getDistrictAt(cx, cy);
    containers.push({
      x: cx,
      y: cy,
      radius: cRadius,
      type: type,
      subType: subType,
      dirIdx: dirIdx,
      districtId: dist.id,
      tier: dist.tier,
      searched: false
    });
    return true;
  };

  // Сетка 16 городских кварталов между дорогами (MAP.BLOCKS). Расстояния внутри квартала — ×MAP.SPACE
  // к прежней карте, дома — ×MAP.HOUSE; гаражи, заборы, трубы и машины — прежнего размера.
  // Между силуэтами соседних домов — проход не уже ~90 px: щель, в которую видно землю, но не пройти,
  // хуже глухой стены. Дома прижаты к дорогам квартала — иначе в квартал два крупных дома не встают
  const colRanges = MAP.BLOCKS;
  const rowRanges = MAP.BLOCKS;
  const S = v => Math.round(v * MAP.SPACE);
  const H = v => Math.round(v * MAP.HOUSE);

  // Враги появляются после того, как расставлены все препятствия, иначе жаба может родиться внутри машины
  const pendingSpawns = [];

  // Тайник у желаемой точки, а если там дом или другой тайник — в ближайшем свободном месте (по кольцам
  // до 300 px): с крупными домами прежние точки часто оказывались внутри стен
  const placeContainer = (x, y, type, subType = null, dirIdx = undefined) => {
    if (tryAddContainer(x, y, type, subType, dirIdx)) return true;
    for (let r = 60; r <= 300; r += 60) {
      const n = Math.max(6, Math.round(r / 25));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        if (tryAddContainer(x + Math.cos(a) * r, y + Math.sin(a) * r, type, subType, dirIdx)) return true;
      }
    }
    return false;
  };

  // Застройка, тайники и жабы города; Промзоны — generatePromzonaLayout
  if (currentLocation === 'city') {
    // 0. Стартовые мусорные баки у площади Михалыча, по краям главного проспекта (Tier 0 -> Tier 1 переход)
    const C = MAP.CENTER, main = MAP.MAIN;
    tryAddContainer(C - 340, main.pos - 55, 'trash', null, 0);
    tryAddContainer(C + 340, main.pos - 55, 'trash', null, 0);
    tryAddContainer(C - 340, main.pos + main.size + 55, 'trash', null, 0);

    // 1. Генерация архитектуры, контейнеров и патрулей по каждому из 16 кварталов согласно правилам района
    colRanges.forEach(([x1, x2], cIdx) => {
      rowRanges.forEach(([y1, y2], rIdx) => {
        const bcx = (x1 + x2) * 0.5;
        const bcy = (y1 + y2) * 0.5;
        const dist = getDistrictAt(bcx, bcy);
        const blockBuildings = [];

        if (dist.id === 'courtyards') {
          // 🟡 TIER 1: СПАЛЬНЫЕ ХРУЩЁВКИ — просторные дворы из 5-этажных Хрущёвок и 9-этажных Брежневок
          const b1 = tryAddBuilding(x1 + S(60), y1 + S(33), H(320), H(160), 'panel', { subType: 'khrushchevka' });
          const b2 = tryAddBuilding(x2 - S(70) - H(220), y2 - S(25) - H(260), H(220), H(260), 'panel', { subType: 'brezhnevka' });
          const b3 = tryAddBuilding(x1 + S(90), y2 - S(80) - H(160), H(320), H(160), 'panel', { subType: 'khrushchevka' });
          [b1, b2, b3].forEach(b => { if (b) blockBuildings.push(b); });

          // Примыкающий забор ПО-2 или короткий ввод теплотрассы к одному из домов
          if (b1) {
            tryAddBuilding(b1.x + b1.w + 4, Math.round(b1.y + b1.h - 32), 220, 30, 'fence_wall', { segments: 2 });
          }
          if (b3) {
            tryAddBuilding(b3.x + b3.w + 4, Math.round(b3.y + b3.h * 0.62 - 20), 252, 40, 'heating_line', { segments: 2 });
          }

          // Контейнеры: мусорные баки ЖЭК-4 рядом со стенами панелек + редкие Жигули у дороги
          blockBuildings.forEach(b => {
            placeContainer(b.x - 48, b.y + b.h - 24, 'trash', null, 0);
            placeContainer(b.x + H(80), b.y + b.h + 48, 'trash', null, 1);
          });
          placeContainer(bcx, y1 + 25, 'car', 'zhiguli', 0);
          // Домов во дворе теперь два (крупные) — ещё пара баков посреди двора
          placeContainer(bcx - S(60), bcy + S(40), 'trash', null, 0);
          placeContainer(x1 + S(200), y2 - S(120), 'trash', null, 1);

          // Враги: ТОЛЬКО слабые Жабы-Пехотинцы (65 HP), никаких Громил и Снайперов у базы!
          for (let i = 0; i < 3; i++) {
            pendingSpawns.push([x1 + 40, y1 + 40, x2 - 40, y2 - 40, dist]);
          }

        } else if (dist.id === 'garages') {
          // 🟠 TIER 2A: ГАРАЖНЫЙ КООПЕРАТИВ «ВОСТОК» — ряды 3D гаражных боксов №74, заборы ПО-2, много машин и чермета
          const g1 = tryAddBuilding(x1 + S(40), y1 + S(80), 140, 100, 'garage');
          const g2 = tryAddBuilding(x1 + S(220), y1 + S(80), 140, 100, 'garage');
          const g3 = tryAddBuilding(x1 + S(40), y1 + S(360), 140, 100, 'garage');
          const g4 = tryAddBuilding(x1 + S(220), y1 + S(360), 140, 100, 'garage');
          const g5 = tryAddBuilding(x1 + S(80), y2 - S(190), 140, 100, 'garage');
          const g6 = tryAddBuilding(x1 + S(260), y2 - S(190), 140, 100, 'garage');
          [g1, g2, g3, g4, g5, g6].forEach(g => { if (g) blockBuildings.push(g); });

          // Бетонные заборы ПО-2 продолжают линии гаражного кооператива
          if (g2) tryAddBuilding(g2.x + g2.w + 4, g2.y + g2.h - 32, 220, 30, 'fence_wall', { segments: 2 });
          if (g4) tryAddBuilding(g4.x + g4.w + 4, g4.y + g4.h - 32, 220, 30, 'fence_wall', { segments: 2 });
          if (g6) tryAddBuilding(g6.x + g6.w + 4, g6.y + g6.h - 32, 220, 30, 'fence_wall', { segments: 2 });

          // Контейнеры: Жигули и УАЗы перед гаражами + мусорные баки + армейский ящик с инструментами в глубине
          if (g1) placeContainer(g1.x + 70, g1.y + g1.h + 72, 'car', 'zhiguli', 0);
          if (g3) placeContainer(g3.x + 70, g3.y + g3.h + 72, 'car', 'uaz', 8);
          placeContainer(x2 - S(90), bcy - S(120), 'car', 'zhiguli', 1);
          placeContainer(x1 + S(420), y1 + S(230), 'box', null, 0);
          placeContainer(x1 + S(60), y2 - S(50), 'trash', null, 0);
          placeContainer(x2 - S(110), y2 - S(110), 'box', null, 1);

          // Враги: Пехотинцы + Снайперы в засадах между гаражами
          for (let i = 0; i < 4; i++) {
            pendingSpawns.push([x1 + 40, y1 + 40, x2 - 40, y2 - 40, dist]);
          }

        } else if (dist.id === 'heating') {
          // 🔵 TIER 2B: МАГИСТРАЛЬ ТЕПЛОТРАССЫ — Кирпичные Котельные ТЭЦ, Брежневки и длинные линии труб теплотрассы
          const p1 = tryAddBuilding(x1 + S(45), y1 + S(36), H(220), H(260), 'panel', { subType: 'brezhnevka' });
          const p2 = tryAddBuilding(x1 + S(45), y2 - S(16) - H(160), H(320), H(160), 'boiler_house');
          // Гараж — справа от брежневки (под ней теперь котельная)
          const g1 = p1 ? tryAddBuilding(p1.x + p1.w + 60, p1.y + S(40), 140, 100, 'garage') : null;

          // Разветвленные магистрали теплотрассы (по 2-3 секции) от стен Котельной и домов
          if (p1) {
            tryAddBuilding(p1.x + p1.w + 4, Math.round(p1.y + p1.h * 0.55 - 20), 252, 40, 'heating_line', { segments: 2 });
          }
          if (g1) {
            tryAddBuilding(g1.x + g1.w + 4, Math.round(g1.y + g1.h * 0.55 - 20), 356, 40, 'heating_line', { segments: 3 });
          }
          if (p2) {
            tryAddBuilding(p2.x + p2.w + 4, Math.round(p2.y + p2.h * 0.62 - 20), 252, 40, 'heating_line', { segments: 2 });
          }

          // Контейнеры: тайники с водкой и тушенкой у тепловых камер + машины
          placeContainer(x1 + S(330), y1 + S(290), 'trash', null, 0);
          placeContainer(x1 + S(420), y1 + S(380), 'box', null, 0);
          placeContainer(x1 + S(260), y1 + S(575), 'trash', null, 1);
          placeContainer(x1 + S(480), y2 - S(280), 'box', null, 0);
          placeContainer(x1 + S(160), y1 + 38, 'car', 'uaz', 0);
          placeContainer(x2 - S(110), bcy + S(40), 'car', 'zhiguli', 8);

          // Враги: Снайперы и Штурмовики вдоль труб
          for (let i = 0; i < 4; i++) {
            pendingSpawns.push([x1 + 40, y1 + 40, x2 - 40, y2 - 40, dist]);
          }

        } else if (dist.id === 'cordon') {
          // 🔴 TIER 3: ВОЕННЫЙ КОРДОН — блокпосты из плит ПО-2, санитарные УАЗы, склады (штаба больше нет)
          const g1 = tryAddBuilding(x1 + S(120), y2 - S(165), 140, 100, 'garage');
          const g2 = tryAddBuilding(x2 - S(360), y1 + S(120), 140, 100, 'garage');

          // Длинные защитные рубежи из бетонных заборов ПО-2
          if (g1) tryAddBuilding(g1.x + g1.w + 4, g1.y + g1.h - 32, 330, 30, 'fence_wall', { segments: 3 });
          if (g2) tryAddBuilding(g2.x + g2.w + 4, g2.y + g2.h - 32, 220, 30, 'fence_wall', { segments: 2 });

          // Контейнеры: преобладают Армейские ящики (55%) и УАЗ-Буханки (35%)
          placeContainer(bcx - S(90), bcy - S(20), 'box', null, 0);
          placeContainer(bcx + S(40), bcy + S(30), 'box', null, 1);
          placeContainer(x2 - S(180), y2 - S(140), 'box', null, 0);
          // УАЗ — на площадке правее гаража
          placeContainer(x1 + S(380), y2 - S(150), 'car', 'uaz', 0);
          placeContainer(x2 - S(210), y1 + S(60), 'car', 'uaz', 8);
          placeContainer(x1 + S(60), y2 - S(70), 'trash', null, 0);

          // Враги: Громилы (35%) + Снайперы (35%) + Ветераны-пехотинцы (30%)
          for (let i = 0; i < 5; i++) {
            pendingSpawns.push([x1 + 40, y1 + 40, x2 - 40, y2 - 40, dist]);
          }

        } else if (dist.id === 'nest') {
          // 🟣 TIER 4: КВАКО-ГНЕЗДО (4 УГЛА КАРТЫ) — захваченные котельные, элитные склады спецхрана (лут ×2.5).
          // Котельная — в СВ и ЮЗ углах; в СЗ и ЮВ раньше стоял штаб, теперь там пусто
          const g1 = tryAddBuilding(x1 + S(50), y1 + S(70), 140, 100, 'garage');
          const p1 = (cIdx + rIdx) % 2 === 1
            ? tryAddBuilding(x1 + S(50), y2 - S(70) - H(160), H(320), H(160), 'boiler_house') : null;

          if (g1) tryAddBuilding(g1.x + g1.w + 4, g1.y + g1.h - 32, 220, 30, 'fence_wall', { segments: 2 });
          if (p1) tryAddBuilding(p1.x + p1.w + 4, Math.round(p1.y + p1.h * 0.62 - 20), 252, 40, 'heating_line', { segments: 2 });

          // СВ угол — логово босса: вместо центрального склада открытая арена, ящики-трофеи по краям
          const isBossLair = (cIdx === 3 && rIdx === 0);
          if (isBossLair) {
            placeContainer(x2 - S(40), y1 + S(40), 'box', null, 1);
            placeContainer(x2 - S(40), y2 - S(260), 'box', null, 2);
          } else {
            // Богатое хранилище армейских спец-ящиков и санитарных УАЗов в центре гнезда
            placeContainer(bcx - S(65), bcy - S(45), 'box', null, 0);
            placeContainer(bcx + S(55), bcy - S(40), 'box', null, 1);
            placeContainer(bcx - S(50), bcy + S(55), 'box', null, 2);
            placeContainer(bcx + S(65), bcy + S(60), 'box', null, 0);
            placeContainer(x2 - S(140), y1 + S(140), 'car', 'uaz', 8);
          }
          placeContainer(x1 + S(150), bcy + S(10), 'car', 'uaz', 0);

          // Враги: Элитные стаи (50% Элитные Громилы 320 HP + 35% Снайперы + 15% Мутанты-пехотинцы);
          // в логове — только небольшая охрана, чтобы бой с боссом не превращался в свалку
          const packSize = isBossLair ? 3 : 6;
          for (let i = 0; i < packSize; i++) {
            pendingSpawns.push([x1 + 35, y1 + 35, x2 - 35, y2 - 35, dist]);
          }
        }
      });
    });
  } else if (currentLocation === 'promzona') {
    generatePromzonaLayout({ tryAddBuilding, placeContainer, pendingSpawns });
  }

  // Бетонный забор ПО-2 по периметру карты: не выпускает ни Василия, ни жаб, пули в него упираются.
  // Рисует его EnvironmentRenderer.drawBorderFence; здесь — только коллизия (с запасом наружу)
  const out = 400;
  if (currentLocation !== 'basement') [
    { x: -out, y: -out, w: WORLD_WIDTH + out * 2, h: out + 40 },
    { x: -out, y: WORLD_HEIGHT - 40, w: WORLD_WIDTH + out * 2, h: out + 40 },
    { x: -out, y: -out, w: out + 32, h: WORLD_HEIGHT + out * 2 },
    { x: WORLD_WIDTH - 32, y: -out, w: out + 32, h: WORLD_HEIGHT + out * 2 }
  ].forEach((r, i) => buildings.push(Object.assign({ type: 'border_fence', side: ['top', 'bottom', 'left', 'right'][i] }, r)));
  // Пролом: в городе — пролёт верхнего забора над логовом Мясника, цел, пока Василий его не проломит;
  // в Промзоне — тот же пролёт с её стороны, в нижнем заборе, открыт сразу (через него Василий и пришёл)
  // Подвал (src/basement.js): пролома нет — 'intact', как у ещё целого забора в городе
  fenceBreach.side = currentLocation === 'promzona' ? 'bottom' : 'top';
  fenceBreach.state = currentLocation === 'promzona' ? 'open' : 'intact';
  fenceBreach.cracks = 0;
  if (fenceBreach.state === 'open') openBreachCollision();
  lairCracks = [];
  shockwaves = [];
  if (window.Basement) window.Basement.onWorld(); // стены комнаты подвала

  buildObstacles();
  if (currentLocation === 'basement') bioPuddles = [];
  else generateBioPuddles();
  pendingSpawns.forEach(args => spawnEnemyInRect(...args));
  if (currentLocation === 'city') spawnBoss();
  else if (currentLocation === 'promzona') spawnPounder();
  levelEnemyTotal = enemies.filter(e => e.type !== 'boss').length;
  levelCleared = false;
}

const PZ_ENEMY_PROFILE = {
  pz_admin: 'garages', pz_breach: 'garages', pz_railyard: 'heating', pz_depot: 'heating',
  pz_foundry: 'cordon', pz_workshops: 'cordon', pz_warehouses: 'cordon', pz_tankfarm: 'cordon',
  pz_cooling: 'nest', pz_sludge: 'nest'
};
// Новые жабы Промзоны (docs/LEVEL2_PROMZONA.md, раздел 3): доля от всех жаб района по его угрозе,
// остальные — по PZ_ENEMY_PROFILE. Штурмовики — с ★★, ракетчики — с ★★★
const PZ_NEW_TOADS = {
  2: { stormtrooper: 0.25, rocketeer: 0 },
  3: { stormtrooper: 0.25, rocketeer: 0.12 },
  4: { stormtrooper: 0.2, rocketeer: 0.15 }
};
// Здоровье по угрозе района — до ENEMY_HP_SCALE, как у остальных
const GUNNER_STATS = {
  stormtrooper: { radius: 22, hp: { 2: 185, 3: 200, 4: 240 }, speed: 2.35, aggroRadius: 430, color: '#f472b6' },
  rocketeer: { radius: 24, hp: { 3: 300, 4: 360 }, speed: 1.95, aggroRadius: 720, color: '#fb923c' }
};

/**
 * Застройка, тайники и жабы Промзоны (docs/LEVEL2_PROMZONA.md, раздел 2). Кварталы — та же сетка MAP.BLOCKS:
 * столбцы 0..3 с запада на восток, ряды 0..3 с севера на юг. Цеха и декор — постройки factory (модели PZ_MODELS),
 * глубина пятна считается из модели (pzFrame). Вагоны стоят на колеях сортировки (y 4950 и 5070),
 * грузовики и бочки — тайники. Помощники — из generateWorld
 */
function generatePromzonaLayout({ tryAddBuilding, placeContainer, pendingSpawns }) {
  const B = MAP.BLOCKS;
  const block = (c, r) => ({ x1: B[c][0], x2: B[c][1], y1: B[r][0], y2: B[r][1] });
  const depthOf = (model, w) => Math.max(24, Math.round(pzFrame(model, 0, 0, w).depth));
  // Постройка шириной w с левым верхним углом пятна (x, y)
  const factory = (model, x, y, w, extra = {}) =>
    tryAddBuilding(x, y, w, depthOf(model, w), 'factory', Object.assign({ model }, extra));
  // Жабы квартала: n штук по всему кварталу
  const spawns = (bl, n) => {
    const dist = getDistrictAt((bl.x1 + bl.x2) / 2, (bl.y1 + bl.y2) / 2);
    for (let i = 0; i < n; i++) pendingSpawns.push([bl.x1 + 40, bl.y1 + 40, bl.x2 - 40, bl.y2 - 40, dist]);
  };
  // Вагон на колее: x — середина, y — ось колеи, стоит вдоль X. На переездах вагонов нет
  const wagon = (type, x, y, dirIdx = 0) => {
    const half = PZ_CONTAINERS[type].len / 2;
    if (x - half < 60 || x + half > WORLD_WIDTH - 60) return false;
    if (MAP.ROADS.some(r => x + half > r.pos - 20 && x - half < r.pos + r.size + 20)) return false;
    if (containers.some(c => PZ_CONTAINERS[c.type] && Math.abs(c.y - y) < 40 &&
      Math.abs(c.x - x) < half + PZ_CONTAINERS[c.type].len / 2 + 90)) return false;
    const dist = getDistrictAt(x, y);
    containers.push({ x: Math.round(x), y: Math.round(y), radius: 40, type, subType: null, dirIdx,
      districtId: dist.id, tier: dist.tier, searched: false });
    return true;
  };
  const TRACK_A = 4950, TRACK_B = 5070;

  // --- Градирни (квако-гнездо) — северо-запад, два квартала
  // В самом углу (0, 0) — логово Долбильщика (POUNDER_HOME): градирня, насосная и эстакада только в (0, 1)
  [block(0, 0), block(0, 1)].forEach((bl, i) => {
    if (i === 1) {
      factory('building_cooling_tower', bl.x1 + 200, bl.y2 - 400, 520);
      factory('building_pump_station', bl.x1 + 120, bl.y2 - 120 - depthOf('building_pump_station', 240), 240);
      factory('prop_pipe_rack', bl.x2 - 330, bl.y1 + 260 + i * 120, 260, { noCollide: true });
    }
    placeContainer(bl.x2 - 200, bl.y2 - 140, 'barrel');
    placeContainer(bl.x2 - 150, bl.y2 - 120, 'barrel');
    placeContainer(bl.x1 + 120, bl.y1 + 160, 'barrel');
    spawns(bl, i === 0 ? 4 : 7);
  });

  // --- Шлам-пруды — запад между проспектом и южной кольцевой: лужи шлама (generateBioPuddles), эстакады
  {
    const bl = block(0, 2);
    factory('prop_pipe_rack', bl.x1 + 140, bl.y1 + 220, 260, { noCollide: true });
    factory('prop_pipe_rack', bl.x1 + 520, bl.y2 - 420, 260, { noCollide: true });
    factory('prop_pipe_stack', bl.x2 - 260, bl.y1 + 520, 200);
    placeContainer(bl.x1 + 200, bl.y2 - 160, 'barrel');
    placeContainer(bl.x2 - 180, bl.y2 - 200, 'barrel');
    spawns(bl, 7);
  }

  // --- Ж/д сортировка — юго-запад: вагоны на двух колеях, тепловоз, катушки кабеля под насыпью
  wagon('boxcar', 420, TRACK_A);
  wagon('tankcar', 980, TRACK_A, 8);
  wagon('gondola', 2420, TRACK_A);
  wagon('gondola', 640, TRACK_B, 8);
  wagon('boxcar', 1660, TRACK_B);
  wagon('tankcar', 2380, TRACK_B, 8);
  [block(0, 3), block(1, 3)].forEach((bl, i) => {
    if (i === 1) factory('prop_locomotive', 1500, TRACK_A - 32, 560, { overRails: true });
    factory('prop_cable_reel', bl.x1 + 140 + i * 260, 5300, 80);
    factory('prop_cable_reel', bl.x1 + 260 + i * 260, 5420, 80);
    factory('prop_pipe_stack', bl.x2 - 360, 5560, 200);
    placeContainer(bl.x1 + 200, 5650, 'barrel');
    spawns(bl, 5);
  });

  // --- Литейный цех — центр-север: козловой кран над веткой, цех, труба (ориентир)
  {
    const bl = block(1, 1);
    factory('prop_gantry_crane', 2350 - 210, bl.y1 + 520, 420, { noCollide: true, overRails: true });
    factory('prop_pipe_stack', bl.x1 + 120, bl.y1 + 260, 200);
    factory('prop_cable_reel', bl.x1 + 460, bl.y2 - 260, 80);
    factory('prop_pipe_stack', bl.x1 + 200, bl.y2 - 360, 200);
    placeContainer(bl.x2 - 180, bl.y1 + 220, 'barrel');
    placeContainer(bl.x1 + 640, bl.y1 + 900, 'barrel');
    spawns(bl, 5);
  }
  {
    const bl = block(2, 1);
    factory('building_foundry', bl.x1 + 90, bl.y1 + 520, 900);
    factory('building_smokestack', bl.x2 - 290, bl.y1 + 380, 170);
    factory('prop_pipe_stack', bl.x2 - 330, bl.y2 - 260, 200);
    placeContainer(bl.x1 + 260, bl.y2 - 140, 'zil', null, 0);
    placeContainer(bl.x2 - 160, bl.y1 + 160, 'barrel');
    spawns(bl, 5);
  }

  // --- Склады продукции — центр-север, вдоль северного забора
  [block(1, 0), block(2, 0)].forEach((bl, i) => {
    factory('building_warehouse', bl.x1 + 40 + i * 40, bl.y1 + 230, 640);
    factory('building_warehouse', i === 0 ? bl.x1 + 40 : bl.x2 - 680, bl.y1 + 690, 640);
    placeContainer(bl.x2 - 220, bl.y1 + 200, 'kamaz', null, 0);
    placeContainer(bl.x2 - 140, bl.y2 - 120, 'barrel');
    placeContainer(bl.x2 - 190, bl.y2 - 100, 'barrel');
    spawns(bl, 4);
  });

  // --- Механические цеха — центр: корпуса, эстакады труб над проходами, штабели
  {
    const bl = block(1, 2);
    factory('building_mech_workshop', bl.x1 + 40, bl.y1 + 300, 700);
    factory('prop_pipe_rack', bl.x1 + 140, bl.y2 - 330, 260, { noCollide: true });
    factory('prop_pipe_stack', bl.x2 - 330, bl.y2 - 280, 200);
    placeContainer(bl.x1 + 520, bl.y2 - 140, 'barrel');
    spawns(bl, 5);
  }
  {
    const bl = block(2, 2);
    factory('building_mech_workshop', bl.x1 + 60, bl.y1 + 280, 700);
    factory('building_mech_workshop', bl.x2 - 620, bl.y2 - 360, 560);
    factory('prop_pipe_rack', bl.x2 - 420, bl.y1 + 220, 260, { noCollide: true });
    factory('prop_pipe_stack', bl.x1 + 120, bl.y2 - 260, 200);
    placeContainer(bl.x1 + 420, bl.y2 - 120, 'zil', null, 8);
    spawns(bl, 5);
  }

  // --- Резервуарный парк — северо-восток: резервуары, газгольдеры, насосная
  {
    const bl = block(3, 0);
    factory('building_oil_tank', bl.x1 + 60, bl.y1 + 300, 330);
    factory('building_oil_tank', bl.x2 - 400, bl.y1 + 300, 330);
    factory('building_gasholder', bl.x1 + 220, bl.y2 - 300, 440);
    placeContainer(bl.x2 - 150, bl.y2 - 180, 'barrel');
    placeContainer(bl.x2 - 110, bl.y2 - 150, 'barrel');
    spawns(bl, 5);
  }
  {
    const bl = block(3, 1);
    factory('building_gasholder', bl.x1 + 60, bl.y1 + 360, 440);
    factory('building_oil_tank', bl.x2 - 400, bl.y1 + 520, 330);
    factory('building_pump_station', bl.x1 + 140, bl.y2 - 260, 240);
    placeContainer(bl.x2 - 260, bl.y2 - 160, 'kamaz', null, 8);
    placeContainer(bl.x2 - 160, bl.y1 + 200, 'barrel');
    spawns(bl, 5);
  }

  // --- Автобаза — восток: боксы (гаражи города), КАМАЗы, ЗИЛы, бочки с соляркой
  {
    const bl = block(3, 2);
    [[60, 120], [260, 120], [460, 120], [60, 560], [260, 560]].forEach(([dx, dy]) =>
      tryAddBuilding(bl.x1 + dx, bl.y1 + dy, 140, 100, 'garage'));
    placeContainer(bl.x1 + 200, bl.y1 + 360, 'kamaz', null, 0);
    placeContainer(bl.x2 - 220, bl.y1 + 420, 'zil', null, 8);
    placeContainer(bl.x1 + 250, bl.y2 - 160, 'kamaz', null, 8);
    placeContainer(bl.x2 - 160, bl.y2 - 260, 'barrel');
    placeContainer(bl.x2 - 120, bl.y2 - 230, 'barrel');
    placeContainer(bl.x2 - 170, bl.y2 - 200, 'barrel');
    spawns(bl, 8);
  }

  // --- Заводоуправление — юг-центр: управление и проходная (здесь оборона выживших, этап 5).
  // Проходная — у главных ворот: там, где проспект упирается в южный забор, будкой к дороге
  {
    const bl = block(2, 3);
    factory('building_admin', bl.x1 + 120, 5420, 760);
    factory('building_checkpoint', bl.x1 + 10, 5700, 320);
    placeContainer(bl.x2 - 260, 5720, 'car', 'zhiguli', 0);
    placeContainer(bl.x1 + 560, 5760, 'trash', null, 0);
    spawns(bl, 6);
  }

  // --- У пролома — юго-восток: сюда Василий приходит из города, жаб нет (что здесь будет — решим позже)
  {
    const bl = block(3, 3);
    placeContainer(bl.x1 + 200, 5420, 'zil', null, 0);
    placeContainer(bl.x1 + 120, 5640, 'barrel');
  }

  // --- Сейфы (src/safes.js, раздел 9 плана). Ставятся последними: номера прежних тайников в старых
  // сохранениях не сдвигаются. [столбец, ряд квартала, доля по x, доля по y, тип]; место рядом найдёт placeContainer
  [
    // Кассовые — заводоуправление (касса), резервуарный парк, у градирен
    [2, 3, 0.62, 0.62, 'safe_vault'], [3, 0, 0.18, 0.86, 'safe_vault'], [0, 1, 0.78, 0.16, 'safe_vault'],
    // Несгораемые — кабинеты начальников цехов, склады, управление
    [1, 1, 0.12, 0.2, 'safe_fireproof'], [2, 1, 0.86, 0.2, 'safe_fireproof'], [1, 2, 0.86, 0.16, 'safe_fireproof'],
    [2, 2, 0.12, 0.86, 'safe_fireproof'], [2, 3, 0.9, 0.2, 'safe_fireproof'], [1, 0, 0.86, 0.5, 'safe_fireproof'],
    // Железные шкафы — конторки цехов, склады, автобаза, сортировка
    [1, 0, 0.14, 0.9, 'safe_cabinet'], [2, 0, 0.5, 0.92, 'safe_cabinet'], [2, 0, 0.9, 0.5, 'safe_cabinet'],
    [3, 2, 0.2, 0.2, 'safe_cabinet'], [3, 2, 0.86, 0.86, 'safe_cabinet'], [0, 3, 0.86, 0.16, 'safe_cabinet'],
    [1, 3, 0.14, 0.16, 'safe_cabinet'], [1, 2, 0.14, 0.86, 'safe_cabinet'], [2, 2, 0.86, 0.14, 'safe_cabinet'],
    [1, 1, 0.86, 0.9, 'safe_cabinet'], [3, 1, 0.12, 0.5, 'safe_cabinet'], [0, 2, 0.86, 0.5, 'safe_cabinet']
  ].forEach(([c, r, fx, fy, type]) => {
    const bl = block(c, r);
    placeContainer(bl.x1 + (bl.x2 - bl.x1) * fx, bl.y1 + (bl.y2 - bl.y1) * fy, type, null, 0);
  });
}

// Респауна нет, врагов на локации меньше (69 вместо 83) — зато каждый крепче
const ENEMY_HP_SCALE = 1.3;
// Промзона — уровень 2: Василий приходит с перками, плазмой и мастерской (базовый урон 36–56, +20%),
// поэтому жабы там крепче городских того же тира — время убийства как в городе (docs/BALANCE.md, «Бой в Промзоне»)
const PZ_HP_SCALE = 1.5;

function spawnEnemyInRect(x1, y1, x2, y2, distOverride = null) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const ex = x1 + Math.random() * (x2 - x1);
    const ey = y1 + Math.random() * (y2 - y1);

    // Строгий буфер безопасности вокруг базы Михалыча (не ближе 520px!)
    if (Math.hypot(ex - safeZone.x, ey - safeZone.y) < 520) continue;

    // Не спавнить внутри зданий/заборов/труб
    if (checkWalkCollision(ex, ey, 36)) continue;
    // И на площадке логова Долбильщика
    if (currentLocation === 'promzona' && Math.hypot(ex - POUNDER_HOME.x, ey - POUNDER_HOME.y) < POUNDER_LAIR_R + 60) continue;

    const dist = distOverride || getDistrictAt(ex, ey);
    if (dist.id === 'hub') continue;
    // Районы Промзоны берут состав жаб у городского района той же угрозы, часть из них — новые (PZ_NEW_TOADS)
    const kind = PZ_ENEMY_PROFILE[dist.id] || dist.id;

    const rand = Math.random();
    let type = 'grunt';
    let radius = 22;
    let hp = 110;
    let speed = 2.65;
    let aggroRadius = 290;
    let color = '#22c55e';

    if (kind === 'courtyards') {
      // 🟡 TIER 1 (Спальные дворы): Болотные Прыгуны (92 HP — требует 4 полных удара битой с гвоздями и контроля выносливости!)
      type = 'grunt';
      radius = 21;
      hp = 92;
      speed = 2.52;
      aggroRadius = 250;
      color = '#22c55e';
    } else if (kind === 'garages') {
      // 🟠 TIER 2A (Гаражи): 55% Пехотинец (135 HP), 38% Кислотный Снайпер (110 HP), 7% Громила (360 HP)
      if (rand < 0.07) {
        type = 'brute'; radius = 34; hp = 360; speed = 1.75; aggroRadius = 310; color = '#a855f7';
      } else if (rand < 0.45) {
        type = 'sniper'; radius = 16; hp = 110; speed = 2.1; aggroRadius = 370; color = '#84cc16';
      } else {
        type = 'grunt'; radius = 22; hp = 135; speed = 2.7; aggroRadius = 300; color = '#22c55e';
      }
    } else if (kind === 'heating') {
      // 🔵 TIER 2B (Теплотрасса): 50% Пехотинец (140 HP), 38% Снайпер (115 HP), 12% Громила (380 HP)
      if (rand < 0.12) {
        type = 'brute'; radius = 34; hp = 380; speed = 1.8; aggroRadius = 320; color = '#a855f7';
      } else if (rand < 0.50) {
        type = 'sniper'; radius = 16; hp = 115; speed = 2.12; aggroRadius = 380; color = '#84cc16';
      } else {
        type = 'grunt'; radius = 22; hp = 140; speed = 2.72; aggroRadius = 305; color = '#22c55e';
      }
    } else if (kind === 'cordon') {
      // 🔴 TIER 3 (Военный кордон): 38% Бронированный Громила (480 HP), 35% Снайпер (145 HP), 27% Штурмовик (185 HP)
      if (rand < 0.38) {
        type = 'brute'; radius = 35; hp = 480; speed = 1.88; aggroRadius = 345; color = '#a855f7';
      } else if (rand < 0.73) {
        type = 'sniper'; radius = 16; hp = 145; speed = 2.2; aggroRadius = 405; color = '#84cc16';
      } else {
        type = 'grunt'; radius = 23; hp = 185; speed = 2.82; aggroRadius = 325; color = '#22c55e';
      }
    } else if (kind === 'nest') {
      // 🟣 TIER 4 (Квако-Гнездо): 52% Элитный Квако-Танк (680 HP), 33% Элитный Снайпер (180 HP), 15% Мутант (230 HP)
      if (rand < 0.52) {
        type = 'brute'; radius = 37; hp = 680; speed = 1.98; aggroRadius = 365; color = '#a855f7';
      } else if (rand < 0.85) {
        type = 'sniper'; radius = 17; hp = 180; speed = 2.25; aggroRadius = 420; color = '#84cc16';
      } else {
        type = 'grunt'; radius = 24; hp = 230; speed = 2.92; aggroRadius = 345; color = '#22c55e';
      }
    }
    const pzNew = PZ_ENEMY_PROFILE[dist.id] && PZ_NEW_TOADS[dist.tier];
    if (pzNew) {
      const r2 = Math.random();
      const nt = r2 < pzNew.stormtrooper ? 'stormtrooper'
        : (r2 < pzNew.stormtrooper + pzNew.rocketeer ? 'rocketeer' : null);
      if (nt) {
        const st = GUNNER_STATS[nt];
        type = nt; radius = st.radius; hp = st.hp[dist.tier]; speed = st.speed; aggroRadius = st.aggroRadius; color = st.color;
      }
    }
    // Ступни этого типа тоже должны стоять на свободном месте (см. footDY)
    if (checkWalkCollision(ex, ey, radius, FOOT_DY[type])) continue;
    if (insideFactoryShape(ex, ey + FOOT_DY[type])) continue;
    hp = Math.round(hp * ENEMY_HP_SCALE * (currentLocation === 'promzona' ? PZ_HP_SCALE : 1));

    enemies.push({
      x: ex,
      y: ey,
      // Громилы в железе: спереди броня гасит большую часть урона (см. damageEnemy)
      armor: type === 'brute' ? (kind === 'nest' ? 0.65 : 0.6) : 0,
      throwCooldown: 120 + Math.floor(Math.random() * 240),
      startX: ex,
      startY: ey,
      bounds: { x1, y1, x2, y2 },
      districtId: dist.id,
      tier: dist.tier,
      radius: radius,
      hp: hp,
      maxHp: hp,
      speed: speed,
      type: type,
      color: color,
      aggroRadius: aggroRadius,
      isAggroed: false,
      hitFlash: 0,
      patrolAngle: Math.random() * Math.PI * 2,
      patrolTimer: Math.random() * 120 + 60,
      shootCooldown: Math.random() * 70 + 45
    });
    return true;
  }
  return false;
}

// --- УПРАВЛЕНИЕ ---
// Ввод и перезарядка текущего игрока: usePlayer подставляет сюда того, чей ход считается
let keys = player.input.keys;
let mouseScreen = { x: 0, y: 0 };
let mouseWorld = player.input.mouse;
let mouseDown = false;
let shootCooldown = 0;
let nearbyInteractable = null;

// Сделать p текущим игроком: его ввод, перезарядка, подсказка рядом и 3D-модель. Скаляры прошлого — к нему
function usePlayer(p) {
  if (!p || p === player) return;
  player.input.down = mouseDown;
  player.shootCd = shootCooldown;
  player.nearby = nearbyInteractable;
  player = p;
  keys = p.input.keys;
  mouseWorld = p.input.mouse;
  mouseDown = p.input.down;
  shootCooldown = p.shootCd;
  nearbyInteractable = p.nearby;
  if (p.char) window.threeCharacter = p.char;
}

// --- Действия из окон в сетевом коопе (src/net.js) ---
// Окна (лавка, мастерская, столовая, сейф, диалог, инвентарь) открываются у самого игрока и работают по его
// копии Василия из снимка. Действие (купить, сварить, сдать квест, выкинуть) у клиента выполняется сразу —
// окно отзывается без задержки — и уходит хосту, а тот выполняет его за этого игрока по-настоящему; следующий
// снимок исправит, если вышло иначе. local: false — только у хоста (там, где решает случай или тайна хоста).
// toWire / fromWire — аргументы в сообщение и обратно (объекты — по id)
const NET_ACTIONS = {};
function netAction(name, fn, toWire = a => a, fromWire = a => a, local = true) {
  NET_ACTIONS[name] = (wire) => fn(...fromWire(wire));
  return function (...args) {
    if (window.Net && window.Net.isClient()) {
      window.Net.rpc(name, toWire(args));
      if (!local) return undefined;
      return window.Net.optimistic(() => fn(...args));
    }
    return fn(...args);
  };
}

// --- КООП (docs/COOP.md): сила врагов и лут от числа игроков, цели жаб, упавшие и подъём ---
// Числа — стартовые, правятся по ощущениям. Индекс — число игроков (1..4)
const COOP_SCALE = {
  hp:      [1, 1, 1.5, 2, 2.5],      // здоровье жаб
  dmg:     [1, 1, 1.1, 1.2, 1.3],    // урон жаб
  bossHp:  [1, 1, 1.8, 2.6, 3.4],
  bossDmg: [1, 1, 1.15, 1.3, 1.45],
  bossRate:[1, 1, 1.1, 1.2, 1.3],    // частота атак боссов
  loot:    [1, 1, 1.8, 2.6, 3.4]
};
const DOWN_FRAMES = 60 * 60;         // упавшего можно поднять 60 с, потом — окончательная смерть
const REVIVE_FRAMES = 3 * 60;        // держать E над упавшим
const REVIVE_RADIUS = 70;
function coopScale() {
  const n = Math.max(1, Math.min(4, players.filter(p => !p.left).length));
  const o = {};
  for (const k in COOP_SCALE) o[k] = COOP_SCALE[k][n];
  return o;
}
let enemyActing = null;              // чей ход сейчас считается (armorAbsorb: удар босса или жабы)

function alivePlayers() {
  return players.filter(p => !p.dead && !(p.downT > 0));
}

// Игрок, в которого попадает точка (пули жаб)
function playerAt(x, y, r) {
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (p.dead || p.downT > 0) continue;
    if (Math.hypot(x - p.x, y - p.y) < r + p.radius) return p;
  }
  return null;
}

// Удар по площади: fn для каждого стоящего на ногах игрока, на это время он текущий
function forEachPlayer(fn) {
  const was = player;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (p.dead || p.downT > 0) continue;
    usePlayer(p);
    fn(p);
  }
  usePlayer(was);
}

// Пули, выпущенные за ход игрока, — его (урон по боссу идёт ему в угрозу, перки — его)
function tagBulletOwners() {
  for (let i = bullets.length - 1; i >= 0 && !bullets[i].owner; i--) bullets[i].owner = player;
}

// Кого бьёт жаба. Одиночная игра — как раньше: Василия. В коопе — ближайшего; держит цель, пока не ушла
// дальше полутора радиусов агро; ударивший с шансом 50 % перетягивает её на себя. Боссы — по угрозе (bossTarget)
function pickTarget(e) {
  if (players.length === 1) return players[0];
  const alive = alivePlayers();
  if (!alive.length) return null;
  let near = alive[0], nd = Infinity;
  for (const p of alive) {
    const d = Math.hypot(p.x - e.x, p.y - e.y) + (p.inSafe ? 5000 : 0);
    if (d < nd) { nd = d; near = p; }
  }
  if (e.type === 'boss' || e.type === 'pounder') return bossTarget(e, alive, near);
  const dist = p => Math.hypot(p.x - e.x, p.y - e.y);
  if (e.type === 'sniper') return e.target = sniperTarget(e, alive, near);
  if (e.type === 'brute') return e.target = bruteTarget(e, alive, near, dist);
  let t = e.target && alive.includes(e.target) ? e.target : null;
  if (!t || !e.isAggroed || t.inSafe || dist(t) > (e.aggroRadius || 400) * 1.5) t = near;
  if (e.lastHitBy && e.lastHitBy !== t && alive.includes(e.lastHitBy)) {
    if (Math.random() < 0.5 && dist(e.lastHitBy) <= dist(t) * 1.5) t = e.lastHitBy;
  }
  e.lastHitBy = null;
  e.target = t;
  return t;
}

// Нет ли стены между точками (через 40 px)
function lineClear(x1, y1, x2, y2) {
  const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 40);
  for (let i = 1; i < n; i++) {
    if (checkBuildingCollision(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, 4)) return false;
  }
  return true;
}

// Снайпер бьёт ближайшего из тех, кого видит (не за стеной). Пока горит лазер — цель не меняет:
// по лазеру видно, в кого он целится. Пересматривает раз в треть секунды
function sniperTarget(e, alive, near) {
  const t = e.target && alive.includes(e.target) && !e.target.inSafe ? e.target : null;
  if (t && (e.shootCooldown < SN_AIM || --e.retargetT > 0)) return t;
  e.retargetT = 20;
  let best = null, bd = Infinity;
  for (const p of alive) {
    if (p.inSafe || !lineClear(e.x, e.y - 20, p.x, p.y - 20)) continue;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best || near;
}

// Громила: кто вплотную — того кулаками; иначе швыряет в самого дальнего из видимых (стрелков сзади).
// Пока несёт предмет — цель не меняет
function bruteTarget(e, alive, near, dist) {
  const t = e.target && alive.includes(e.target) && !e.target.inSafe ? e.target : null;
  if (t && e.throwState) return t;
  if (dist(near) < THROW_RANGE_MIN) return near;
  if (t && --e.retargetT > 0) return t;
  e.retargetT = 30;
  const reach = Math.min(THROW_RANGE_MAX, (e.aggroRadius || 400) * 1.4);
  let best = null, bd = -1;
  for (const p of alive) {
    const d = dist(p);
    if (p.inSafe || d > reach || d <= bd || !lineClear(e.x, e.y - 30, p.x, p.y - 20)) continue;
    bd = d;
    best = p;
  }
  return best || near;
}

// Босс раз в 6–10 с выбирает, на кого идти: на самого опасного (урон по нему + близость), раненого охотнее,
// иногда — на случайного. Угроза со временем остывает
function bossTarget(e, alive, near) {
  // Из логова босс не уходит: цель — из тех, кто в логове (иначе он ушёл бы домой, пока там дерутся другие)
  const home = e.type === 'boss' ? BOSS_HOME : (e.isClone || e.isMini ? null : POUNDER_HOME);
  const leash = e.type === 'boss' ? BOSS_LEASH_RADIUS : POUNDER_LEASH;
  if (home) {
    const inLair = alive.filter(p => Math.hypot(p.x - home.x, p.y - home.y) < leash && !p.inSafe);
    if (inLair.length) {
      alive = inLair;
      if (!inLair.includes(near)) near = inLair[0];
      if (e.target && !inLair.includes(e.target)) e.retargetT = 0;
    }
  }
  if (e.target && alive.includes(e.target) && --e.retargetT > 0) return e.target;
  e.retargetT = 360 + Math.floor(Math.random() * 240);
  const threat = e.threat || (e.threat = new Map());
  let best = near;
  if (alive.length > 1 && Math.random() < 0.25) best = alive[Math.floor(Math.random() * alive.length)];
  else {
    let bs = -Infinity;
    for (const p of alive) {
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      const score = (threat.get(p) || 0) + 300 * (1 - Math.min(d, 1200) / 1200) + (p.hp < p.maxHp * 0.3 ? 200 : 0) - (p.inSafe ? 5000 : 0);
      if (score > bs) { bs = score; best = p; }
    }
  }
  threat.forEach((v, p) => threat.set(p, v * 0.5));
  if (e.target && best !== e.target) addFloatingText(best.x - 10, best.y - 70, '⚠', '#ef4444');
  e.target = best;
  return best;
}

// Жабы и боссы крепче, чем больше игроков (раз на жабу — при первом её ходе)
function coopScaleEnemy(e) {
  e.coopScaled = true;
  if (players.length === 1 || e.defense) return;
  const boss = e.type === 'boss' || e.type === 'pounder';
  const k = boss ? coopScale().bossHp : coopScale().hp;
  e.coopK = k;       // снимок мира (src/menu.js) пишет здоровье без него: вернувшись, жаба усилится заново
  e.maxHp = (e.maxHp || e.hp) * k;
  e.hp *= k;
}

// Кто нанёс урон: жаба может переключиться на него, босс копит угрозу (damageEnemy)
function noteAttacker(e, dealt, weapon) {
  if (players.length === 1 || !(dealt > 0) || weapon === 'rocket' || weapon === 'thrown') return;
  e.lastHitBy = player;
  if (e.type === 'boss' || e.type === 'pounder') {
    const threat = e.threat || (e.threat = new Map());
    threat.set(player, (threat.get(player) || 0) + dealt);
  }
}

// Текущий Василий упал: лежит 60 с, его могут поднять; не подняли — погиб насовсем
function playerDown() {
  if (player.downT > 0 || player.dead) return;
  player.hp = 0;
  player.downT = DOWN_FRAMES;
  player.reviveT = 0;
  player.helpCall = false;
  player.isMoving = false;
  player.isRolling = false;
  player.reloadingWeapon = null;
  addFloatingText(player.x - 30, player.y - 60, currentLang === 'ru' ? gendered(`${player.name || 'Василий'} упал{|а}!`, player) : `${player.name || 'Vasiliy'} is down!`, '#ef4444');
  checkAllDown();
}

// Упавший зовёт на помощь (H): у товарищей — окно и стрелка к нему (src/minimap.js), пока не подняли или не погиб
function callForHelp() {
  if (!(player.downT > 0)) return;
  player.helpCall = true;
  player.helpN = (player.helpN || 0) + 1;   // каждый новый зов — окно у товарищей мигает заново
}

// Ход упавшего: таймер идёт, рядом стоящий товарищ с зажатой E поднимает
function updateDowned() {
  const me = player;
  let helper = null;
  for (const p of players) {
    if (p === me || p.dead || p.downT > 0) continue;
    if (p.input.keys['KeyE'] && Math.hypot(p.x - me.x, p.y - me.y) < REVIVE_RADIUS) { helper = p; break; }
  }
  me.reviving = !!helper;   // поднимают — таймер стоит
  if (helper) {
    if (++me.reviveT >= REVIVE_FRAMES) {
      me.downT = 0;
      me.reviveT = 0;
      me.helpCall = false;
      me.hp = me.maxHp * 0.35;
      addFloatingText(me.x - 30, me.y - 60, currentLang === 'ru' ? 'НА НОГАХ!' : 'BACK UP!', '#4ade80');
      createParticles(me.x, me.y - 20, '#4ade80', 14);
    }
    return;
  }
  me.reviveT = Math.max(0, (me.reviveT || 0) - 2);
  if (--me.downT <= 0) {
    me.downT = 0;
    me.dead = true;
    me.helpCall = false;
    addFloatingText(me.x - 30, me.y - 60, currentLang === 'ru' ? gendered(`${me.name || 'Василий'} погиб{|ла}`, me) : `${me.name || 'Vasiliy'} is dead`, '#94a3b8');
    checkAllDown();
  }
}

// Все лежат или погибли — поднимать некому: конец забега
function checkAllDown() {
  if (alivePlayers().length > 0) return;
  usePlayer(localPlayer);
  gameOverAll();
}

window.addEventListener('keydown', (e) => {
  // Окно диалога забирает все клавиши: ответы, «дальше», ESC (src/dialog.js)
  if (window.Dialog && window.Dialog.handleKey(e)) return;
  // Окно сейфа забирает цифры, Enter, Backspace, ESC и E (src/safes.js)
  if (window.Safes && gameState === 'PLAYING' && window.Safes.handleKey(e)) return;
  keys[e.code] = true;
  if (e.code === 'KeyE' && gameState === 'PLAYING') handleInteract();
  // ESC: закрыть настройки / магазин, поставить или снять паузу (src/menu.js)
  if (e.code === 'Escape') {
    if (window.Menu) window.Menu.onEscape();
    else if (gameState === 'SHOP') closeShop();
  }

  // I — инвентарь, C — персонаж, J — журнал заданий (src/inventory.js); та же клавиша закрывает
  const panelTab = { KeyI: 'inventory', KeyC: 'stats', KeyJ: 'quests' }[e.code];
  if (panelTab && window.CharacterPanel && (gameState === 'PLAYING' || gameState === 'INVENTORY')) {
    window.CharacterPanel.toggle(panelTab);
    return;
  }

  if (gameState === 'PLAYING') {
    if (e.code === 'Space') performRoll();
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyQ') cycleWeapon();
    if (e.code === 'KeyF') cycleRmbAbility();
    if (e.code === 'KeyH') callForHelp();          // кооп: упал — позвать товарищей
    if (e.code === 'KeyM' && window.Minimap) window.Minimap.toggle();
    // Цифры 1–9 — видимые слоты хотбара по порядку (порядок игрок меняет перетаскиванием)
    const digit = /^Digit[1-9]$/.test(e.code) ? Number(e.code.slice(5)) : 0;
    if (digit) {
      const slotId = visibleHotbarSlots()[digit - 1];
      if (slotId) activateHotbarSlot(slotId);
    }
  }
});

window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousemove', (e) => {
  mouseScreen.x = e.clientX;
  mouseScreen.y = e.clientY;
});
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) mouseDown = true;
  // ПКМ — выбранная способность: карта Долбильщика или горючая жижа (src/perks_pz.js), F — сменить
  else if (e.button === 2 && gameState === 'PLAYING') useRmbAbility();
});
// Системное меню браузера по ПКМ в игре не нужно нигде (ПКМ — способность), кроме полей ввода (код сохранения)
window.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('input, textarea')) e.preventDefault();
});
// Колесо — следующее/предыдущее взятое оружие (не чаще раза в 120 мс: колёса шлют пачку событий)
let lastWheelAt = 0;
window.addEventListener('wheel', (e) => {
  if (gameState !== 'PLAYING' || e.deltaY === 0) return;
  const now = performance.now();
  if (now - lastWheelAt < 120) return;
  lastWheelAt = now;
  stepWeapon(e.deltaY > 0 ? 1 : -1);
}, { passive: true });

// --- ХОТБАР: слоты перетаскиваются мышью, клавиши 1–8 идут по видимому порядку, порядок сохраняется ---
// Ячейки 1–3 (c0, c1, c2) — расходники, какой в какой — выбирает игрок (consumableSlots); оружие — с 4-й
const HOTBAR_CONSUMABLES = ['c0', 'c1', 'c2'];
const HOTBAR_DEFAULT_ORDER = ['c0', 'c1', 'c2', 'bat', 'makarov', 'nagant', 'drill', 'shotgun', 'plasma', 'launcher', 'arc', 'emp', 'laser'];
const HOTBAR_WEAPONS = new Set(['bat', 'makarov', 'nagant', 'drill', 'shotgun', 'plasma', 'launcher', 'arc', 'emp', 'laser']);
const HOTBAR_STORAGE_KEY = 'vasiliy.hotbarOrder';
let hotbarOrder = loadHotbarOrder();

function loadHotbarOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(HOTBAR_STORAGE_KEY));
    if (Array.isArray(saved)) {
      // Порядок игрока, а слоты, которых тогда ещё не было (лазер), — в конец. Старый порядок (водка, тушёнка,
      // бинт отдельными ячейками) — без них: на их месте ячейки расходников
      const known = saved.filter(id => HOTBAR_DEFAULT_ORDER.includes(id));
      const order = [...new Set(known), ...HOTBAR_DEFAULT_ORDER.filter(id => !known.includes(id))];
      if (order.length === HOTBAR_DEFAULT_ORDER.length) return consumablesFirst(order);
    }
  } catch (e) { /* хранилище недоступно — порядок по умолчанию */ }
  return HOTBAR_DEFAULT_ORDER.slice();
}

// Ячейки расходников всегда первые три (между собой — в порядке игрока)
function consumablesFirst(order) {
  return [...order.filter(id => HOTBAR_CONSUMABLES.includes(id)), ...order.filter(id => !HOTBAR_CONSUMABLES.includes(id))];
}

// Что лежит в ячейках расходников: id предмета (player.items) или null. Выбор — в окне инвентаря (src/inventory.js)
const CONSUMABLE_SLOTS_KEY = 'vasiliy.consumableSlots';
const BASE_ITEMS = {
  vodka: { img: 'assets/sprites/loot/loot_vodka.png?v=1026' },
  stew: { img: 'assets/sprites/loot/loot_stew.png?v=1026' },
  bandage: { img: 'assets/sprites/loot/loot_bandage.png?v=1026' }
};
// var: updateUILanguage может позвать refreshConsumableSlots раньше этой строки
var consumableSlots = loadConsumableSlots();

function loadConsumableSlots() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONSUMABLE_SLOTS_KEY));
    if (Array.isArray(saved) && saved.length === 3) return saved.map(id => (typeof id === 'string' ? id : null));
  } catch (e) { /* по умолчанию */ }
  return ['vodka', 'stew', 'bandage'];
}

// Картинка, короткое имя и подсказка расходника: свои — у водки, тушёнки, бинта, блюда — из src/canteen.js
function itemInfo(id) {
  if (!id) return null;
  if (BASE_ITEMS[id]) return { img: BASE_ITEMS[id].img, name: t(id), title: t(id) };
  return window.Canteen ? window.Canteen.info(id) : null;
}

// Поставить расходник в ячейку i (0–2); если он уже в другой — ячейки меняются местами. null — убрать
window.setConsumableSlot = function(i, id) {
  if (i < 0 || i > 2) return;
  id = id || null;
  const j = id ? consumableSlots.indexOf(id) : -1;
  if (j >= 0 && j !== i) consumableSlots[j] = consumableSlots[i];
  consumableSlots[i] = id;
  try { localStorage.setItem(CONSUMABLE_SLOTS_KEY, JSON.stringify(consumableSlots)); } catch (e) { /* не критично */ }
  refreshConsumableSlots();
};

// Картинка, подпись и счётчик в ячейках расходников
function refreshConsumableSlots() {
  if (!consumableSlots) return;
  HOTBAR_CONSUMABLES.forEach((slotId, i) => {
    const el = document.querySelector(`.hotbar-slot[data-slot="${slotId}"]`);
    if (!el) return;
    const id = consumableSlots[i], info = itemInfo(id);
    const img = el.querySelector('.slot-img'), name = el.querySelector('.slot-name'), count = el.querySelector('.slot-count');
    const n = id ? (player.items[id] || 0) : 0;
    const key = `${currentLang}|${id}|${n}`;
    if (el._slotKey === key) return;
    el._slotKey = key;
    img.style.visibility = info ? 'visible' : 'hidden';
    if (info && img.getAttribute('src') !== info.img) img.src = info.img;
    name.textContent = info ? info.name : '—';
    count.textContent = id ? n : '';
    el.title = info ? info.title : '';
    el.classList.toggle('empty', !id || n <= 0);
  });
}

function saveHotbarOrder() {
  try { localStorage.setItem(HOTBAR_STORAGE_KEY, JSON.stringify(hotbarOrder)); } catch (e) { /* не критично */ }
}

// Ещё не купленное и оставленное у Михалыча оружие в хотбаре скрыто и номера не занимает
// Q переключает оружие в этих ячейках хотбара (номера с нуля: 4-я и 5-я)
const Q_SLOTS = [3, 4];

function visibleHotbarSlots() {
  return hotbarOrder.filter(id => !HOTBAR_WEAPONS.has(id) || isEquipped(id));
}

function activateHotbarSlot(id) {
  if (HOTBAR_WEAPONS.has(id)) window.switchWeapon(id);
  else if (HOTBAR_CONSUMABLES.includes(id)) {
    const item = consumableSlots[HOTBAR_CONSUMABLES.indexOf(id)];
    if (item) window.useItem(item);
  }
}

// Расставляет слоты в DOM по hotbarOrder и подписывает клавиши [1]..[N] у видимых
function applyHotbarOrder() {
  if (player !== localPlayer) return;
  const bar = document.getElementById('hotbar');
  if (!bar) return;
  const visible = visibleHotbarSlots();
  hotbarOrder.forEach(id => {
    const slot = bar.querySelector(`[data-slot="${id}"]`);
    if (!slot) return;
    bar.appendChild(slot);
    const n = visible.indexOf(id);
    slot.querySelector('.slot-key').textContent = n >= 0 ? `[${n + 1}]` : '';
    // Ячейки 4 и 5 — пара оружия для Q (cycleWeapon), подсвечены жёлтым
    slot.classList.toggle('q-slot', Q_SLOTS.includes(n));
  });
}

function initHotbarDrag() {
  const bar = document.getElementById('hotbar');
  if (!bar) return;
  let drag = null;

  // Клик по хотбару — не выстрел (окно ловит mousedown для стрельбы)
  bar.addEventListener('mousedown', (e) => e.stopPropagation());

  bar.addEventListener('pointerdown', (e) => {
    const slot = e.target.closest('.hotbar-slot');
    if (!slot || e.button !== 0) return;
    drag = { slot, startX: e.clientX, startY: e.clientY, moved: false };
    try { bar.setPointerCapture(e.pointerId); } catch (err) { /* указатель уже отпущен */ }
  });

  bar.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
    drag.moved = true;
    drag.slot.classList.add('dragging');
    // Ставим слот перед первым видимым соседом, чей центр правее курсора, иначе — сразу за последним видимым
    const others = [...bar.querySelectorAll('.hotbar-slot')].filter(s => s !== drag.slot && s.style.display !== 'none');
    if (others.length === 0) return;
    const before = others.find(s => { const r = s.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; });
    const anchor = before || others[others.length - 1].nextElementSibling;
    if (anchor !== drag.slot && drag.slot.nextElementSibling !== anchor) bar.insertBefore(drag.slot, anchor);
  });

  const finish = (e) => {
    if (!drag) return;
    const { slot, moved } = drag;
    drag = null;
    slot.classList.remove('dragging');
    if (moved) {
      hotbarOrder = consumablesFirst([...bar.querySelectorAll('.hotbar-slot')].map(s => s.dataset.slot));
      saveHotbarOrder();
      applyHotbarOrder();
    } else if (e.type === 'pointerup') {
      activateHotbarSlot(slot.dataset.slot);
    }
  };
  bar.addEventListener('pointerup', finish);
  bar.addEventListener('pointercancel', finish);

  applyHotbarOrder();
}
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });

// Кнопки меню, сохранения, пауза и настройки — в src/menu.js.
// save — сохранённый забег (RunSave): мир строится заново, поверх него восстанавливается прогресс
// Василий с нуля: здоровье, припасы, оружие, карты, перки (новый забег; сохранение потом накладывается сверху)
function resetPlayerState() {
  // Кооп: встают полукругом под куполом, свой — в середине
  const slot = players.indexOf(player);
  player.x = safeZone.x + [0, -70, 70, 0][slot % 4];
  player.y = safeZone.y + 70 + [0, 30, 30, 70][slot % 4];
  player.maxHp = 100;
  player.hp = player.maxHp;
  player.maxStamina = 100;
  player.stamina = player.maxStamina;
  player.isDrunk = false;
  player.drunkTimer = 0;
  player.itemCooldown = 0;
  player.healLeft = 0;
  player.stunTimer = 0;
  player.knockFrames = 0;
  player.dazeTimer = 0;
  player.cards = { speed: 0, agility: 0, vitality: 0, laser: 0, dash: 0, regen: 0 };
  player.pendingCards = false;
  player.items = { vodka: 0, stew: 1, bandage: 2, soup: 0, tincture: 0, jelly: 0, compress: 0, drops: 0, ointment: 0, borscht: 0 };
  player.buffs = {};
  player.healRate = 0;
  player.resources = {
    bottles: 0, scrap: 0, mil_parts: 0, alien_core: 0, toad_eye: 0, toad_leg: 0, toad_liver: 0,
    nonferrous: 0, blueprint: 0, tech_spirit: 0, plasma_cell: 0, kvako_charge: 0, electronics: 0
  };
  player.unlockedWeapons = {
    bat: true,
    makarov: false,
    drill: false,
    shotgun: false,
    plasma: false,
    laser: false,
    launcher: false,
    arc: false,
    emp: false,
    nagant: false
  };
  player.ammo = {
    makarov: { clip: 8, maxClip: 8, reserve: 16, reloadTime: 80 },
    shotgun: { clip: 2, maxClip: 2, reserve: 8, reloadTime: 110 },
    launcher: { clip: 0, maxClip: 1, reserve: 0, reloadTime: 90 },
    nagant: { clip: 0, maxClip: 7, reserve: 0, reloadTime: 20 }
  };
  player.empGrenades = 0;
  player.arcCharge = 0;
  player.empT = 0;
  player.reloadingWeapon = null;
  player.reloadTimer = 0;
  player.reloadMaxTimer = 0;
  player.plasmaHeat = 0;
  player.plasmaOverheated = false;
  player.plasmaOverheatTimer = 0;
  player.laserCharge = CARD_EFFECTS.laserCharge;
  player.laserRecharge = 0;
  player.abilityCd = 0;
  player.gooCd = 0;
  player.rmbAbility = null;
  player.slimeArmor = 0;
  player.hurtFrame = 0;
  player.regenLeft = 0;
  player.isDashing = false;
  player.currentWeapon = 'bat';
  player.equipped = { bat: true };
  player.lastMelee = 'bat';
  player.lastRanged = null;
  player.baseDamage = 24;
  player.critChance = 0.05;
  player.critMult = 1.6;
  player.unlockedPerks.clear();
  player.blockedPerks.clear();
  player.downT = 0;
  player.dead = false;
  player.ws = null;            // мастерская Толика — у каждого своя (src/workshop.js)
  player.freeUpgrade = false;  // бесплатное улучшение — тому, кто сдал квест Толика
}

// loc — где начать без сохранения (сетевой клиент, вошедший в идущую игру)
function startGame(save = null, loc = null) {
  gameState = 'PLAYING';
  document.getElementById('screen-menu').style.display = 'none';

  players.forEach(p => { usePlayer(p); resetPlayerState(); });
  usePlayer(localPlayer);
  cardOfferTimer = 0;
  lastPlayerDistrictId = 'hub';

  // Локация, где Василий был при сохранении (новый забег — город)
  currentLocation = loc || (save && window.Menu ? window.Menu.locationOf(save) : 'city');
  if (window.Basement) window.Basement.loadState(save ? save.basement : undefined);
  locationWorlds = {};
  autoScale.hold(6000);
  locationsVisited = new Set(['city', currentLocation]);
  generateWorld();
  if (save && window.Menu) window.Menu.applyRun(save);
  // Оборона у пролома: прошла ли (из сохранения) и не начать ли её сейчас, если забег в Промзоне
  if (window.Defense) {
    window.Defense.loadState(save ? save.defense : undefined, locationsVisited.has('promzona'));
    window.Defense.onEnter();
  }
  if (window.Settlers) window.Settlers.loadState(save ? save.settlers : undefined);
  if (window.Quests) window.Quests.loadState(save ? save.quests : undefined);
  // Мастерская Толика: новый забег — с чистого листа (сохранённую загружает Menu.applyRun до патронов)
  if (window.Workshop && !save) window.Workshop.loadState(undefined);
  // В Промзоне купола Михалыча нет — после загрузки Василий у пролома; в подвале — у лестницы
  if (currentLocation !== 'city') placePlayersOnArrival(null);
  if (player.pendingCards) cardOfferTimer = 90; // карты за Мясника ещё не выбраны
  if (window.threeCharacter) window.threeCharacter.setWeapon(player.currentWeapon || 'none');
  applyHotbarOrder();
  updateHUD(true);
  Loading.start();
}

// --- ЭКРАН ЗАГРУЗКИ ---
// Перед началом игры и после перехода через пролом: догружаются модели локации, прогреваются кадры
// (обычно это идёт в простое уже в игре — первый показ дёргал кадр) и запекаются куски земли вокруг
// Василия. Пока идёт загрузка, gameState — 'LOADING' (мир стоит). Если что-то не грузится дольше
// LOADING_MAX_MS — игра всё равно начинается, остальное догрузится в простое
const LOADING_MAX_MS = 30000;
const Loading = {
  active: false,
  onDone: null,
  start(onDone = null) {
    this.active = true;
    this.onDone = onDone;
    this.t0 = performance.now();
    this.framesTotal = 0;
    gameState = 'LOADING';
    const el = document.getElementById('loading-screen');
    if (el) el.style.display = 'flex';
    this.step();
  },
  // Модели, без которых сцену не показать: окружение, Василий, жабы и пропсы локации, её босс; и звуки
  modelsReady() {
    const er = window.environmentRenderer, tp = window.threeProps, te = window.threeEnemies;
    const ch = window.threeCharacter;
    const boss = currentLocation === 'promzona' ? window.threePounder : window.threeBoss;
    // Выжившие: у пролома в Промзоне — пока оборона не пройдена, в городе — после (src/three_survivors.js)
    const ts = window.threeSurvivors;
    const rescued = !!window.Defense && window.Defense.stage === 'done';
    const survivors = !!ts && (currentLocation === 'promzona' ? !rescued : rescued);
    if (survivors) ts.load();
    const checks = [
      !!(er && er.loaded),
      !ch || ch.isLoaded || ch.loadFailed,
      !tp || (tp.allSettled() && (currentLocation !== 'promzona' || tp.promzonaRequested)),
      !te || (te.allSettled() && (currentLocation !== 'promzona' || te.promzonaRequested)),
      !boss || !boss.loadRequested || boss.isLoaded || boss.loadFailed,
      !survivors || ts.allSettled(),
      // Записи звуков (src/sounds.js) — иначе первые секунды игры без звука
      !SoundFX.preloadSounds || SoundFX.preloadSounds()
    ];
    return { done: checks.filter(Boolean).length, total: checks.length };
  },
  show(progress, text) {
    const fill = document.getElementById('loading-fill');
    const label = document.getElementById('loading-text');
    if (fill) fill.style.width = `${Math.round(progress * 100)}%`;
    if (label) label.textContent = text;
  },
  step() {
    if (!this.active) return;
    const ru = currentLang === 'ru';
    const timedOut = performance.now() - this.t0 > LOADING_MAX_MS;
    const m = this.modelsReady();
    if (m.done < m.total && !timedOut) {
      this.show(0.05 + 0.4 * m.done / m.total, ru ? 'Загружаем модели и звуки…' : 'Loading models and sounds…');
      setTimeout(() => this.step(), 100);
      return;
    }
    // Кадры: очередь прогрева прогоняется кусками по ~30 мс, между ними — обновить полоску
    const left = window.flushIdleTasks ? window.flushIdleTasks(30) : 0;
    this.framesTotal = Math.max(this.framesTotal, left);
    if (left > 0 && !timedOut) {
      const k = this.framesTotal ? 1 - left / this.framesTotal : 1;
      this.show(0.45 + 0.45 * k, ru ? `Готовим кадры… ${left}` : `Preparing frames… ${left}`);
      setTimeout(() => this.step(), 0);
      return;
    }
    // Земля вокруг Василия
    this.show(0.95, ru ? 'Земля и тени…' : 'Ground and shadows…');
    setTimeout(() => this.finish(), 0);
  },
  finish() {
    if (!this.active) return;
    const er = window.environmentRenderer;
    camera.x = player.x - viewW / 2;
    camera.y = player.y - viewH / 2;
    if (er) er.prebakeGround(ctx, camera, viewW, viewH, WORLD_WIDTH, WORLD_HEIGHT, roads, buildings, safeZone);
    this.active = false;
    const el = document.getElementById('loading-screen');
    if (el) el.style.display = 'none';
    gameState = 'PLAYING';
    autoScale.hold(4000);
    const done = this.onDone;
    this.onDone = null;
    if (done) done();
  }
};

function gameOver() {
  // Кооп: упал — ещё не конец, могут поднять (playerDown); конец — когда на ногах никого
  if (players.length > 1) { playerDown(); return; }
  gameOverAll();
}

function gameOverAll() {
  // Сетевой кооп: стирает своё сохранение только хост; у клиента своих сохранений сеанса нет
  const net = !!(window.Net && window.Net.started) ? (window.Net.isHost() ? 'host' : 'client') : null;
  if (window.Net) window.Net.onGameOver();
  gameState = 'GAMEOVER';
  // Тренировочный бой (?boss2): забег не стирается, бой начинается заново
  if (window.Practice && window.Practice.active) {
    window.Practice.onDeath();
    return;
  }
  // Рогалик: смерть заканчивает забег, сохранение стирается
  if (window.Menu) window.Menu.onGameOver(net);
  document.getElementById('screen-menu').style.display = 'flex';
  updateUILanguage();
}

// --- ВЗАИМОДЕЙСТВИЕ И МАГАЗИН/ВЕРСТАК ---
function handleInteract() {
  if (!nearbyInteractable) return;
  if (player !== localPlayer) {
    // Товарищ по сети: тайники и пролом — здесь, окна (лавка, диалог, сейф) — у него (src/net.js)
    const it = nearbyInteractable;
    if (it.type === 'container' && !(window.Safes && window.Safes.isSafe(it.target))) scavengeContainer(it.target);
    else if (it.type === 'breach' && levelCleared) breakFence();
    else if (it.type === 'sample') window.Quests.takeSample();
    else if (it.type === 'basement_door' || it.type === 'basement_exit') window.Basement.interact(it);
    else if (window.Net) window.Net.remoteInteract(player, it);
    return;
  }
  if (nearbyInteractable.type === 'shop') openShop();
  else if (nearbyInteractable.type === 'breach') {
    if (levelCleared) breakFence();
  }
  else if (nearbyInteractable.type === 'settler') window.Settlers.talk(nearbyInteractable.target);
  else if (nearbyInteractable.type === 'sample') window.Quests.takeSample();
  else if (/^basement_/.test(nearbyInteractable.type)) window.Basement.interact(nearbyInteractable);
  else if (nearbyInteractable.type === 'container') {
    const c = nearbyInteractable.target;
    if (window.Safes && window.Safes.isSafe(c)) window.Safes.open(c);
    else scavengeContainer(c);
  }
}

// raw — из сохранения: уже с кооп-множителем, второй раз не умножать
function spawn3DLootItem(x, y, type, val = 1, raw = false) {
  const icons = {
    scrap: '⚙️',
    bottle: '🍾',
    mil_parts: '🧰',
    alien_core: '🔮',
    ammo_9x18: '🔫',
    ammo_12g: '💥',
    ammo_762n: '🔫',
    stew: '🥫',
    vodka: '🍾',
    bandage: '🩹',
    toad_eye: '👁️',
    toad_leg: '🦶',
    toad_liver: '🫀',
    nonferrous: '🪙',
    blueprint: '📜',
    tech_spirit: '🧪',
    plasma_cell: '🔋',
    kvako_charge: '🚀'
  };
  // Кооп: всего выпадает больше, чтобы хватало всем; чертёж — каждому свой
  if (players.length > 1 && !raw) {
    if (COOP_PER_PLAYER_LOOT.has(type)) {
      for (let k = 1; k < players.length; k++) {
        lootItems.push({ x: Math.round(x + (k - 1.5) * 26), y: Math.round(y + 18), type, icon: icons[type] || '⚙️', val: Math.max(1, Math.round(val)) });
      }
    } else {
      const v = val * coopScale().loot;
      val = Math.floor(v) + (Math.random() < v - Math.floor(v) ? 1 : 0);
    }
  }
  lootItems.push({
    x: Math.round(x),
    y: Math.round(y),
    type: type,
    icon: icons[type] || '⚙️',
    val: Math.max(1, Math.round(val))
  });
}
const COOP_PER_PLAYER_LOOT = new Set(['blueprint']);

// Тайники дают меньше стеклотары и чермета, чем раньше: обыскать всё и не драться было выгоднее,
// чем зачищать район (см. docs/BALANCE.md)
const STASH_YIELD = 0.75;

// Достаёт ли Василий до тайника: до машин, баков и ящиков — по радиусу, до вагонов и грузовиков Промзоны —
// до борта (они длинные, середина далеко)
function canReachContainer(c) {
  const o = c.obstacle;
  if (o && o.rect) {
    const fy = player.y + FOOT_DY.player;
    const dx = Math.max(o.x1 - player.x, 0, player.x - o.x2);
    const dy = Math.max(o.y1 - fy, 0, fy - o.y2);
    return dx * dx + dy * dy < 40 * 40;
  }
  if (Math.abs(player.x - c.x) >= 80 || Math.abs(player.y - c.y) >= 80) return false;
  return Math.hypot(player.x - c.x, player.y - c.y) < c.radius + player.radius + 20;
}

// Добыча из тайников Промзоны: [стеклотара от, до], [чермет от, до], бонусы с шансами.
// Цветмет — из полувагонов с ломом, крытых вагонов и грузовиков (проводка, обмотки), техспирт — из цистерн и бочек
const PZ_STASH_LOOT = {
  boxcar: { bottles: [1, 2], scrap: [3, 5], bonus: [['stew', 0.6], ['ammo_9x18', 0.35], ['ammo_12g', 0.25], ['ammo_762n', 0.3], ['nonferrous', 0.5]] },
  gondola: { bottles: [0, 1], scrap: [5, 8], bonus: [['mil_parts', 0.2], ['nonferrous', 0.9]] },
  tankcar: { bottles: [2, 3], scrap: [2, 3], bonus: [['vodka', 0.55], ['tech_spirit', 0.6]] },
  kamaz: { bottles: [1, 2], scrap: [3, 5], bonus: [['stew', 0.45], ['ammo_12g', 0.4], ['mil_parts', 0.2], ['nonferrous', 0.5]] },
  zil: { bottles: [1, 2], scrap: [2, 4], bonus: [['bandage', 0.5], ['stew', 0.35], ['nonferrous', 0.35], ['tech_spirit', 0.15]] },
  barrel: { bottles: [0, 1], scrap: [1, 2], bonus: [['vodka', 0.15], ['tech_spirit', 0.35]] }
};
const rollRange = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));

// Звуки удара битой от лёгкого к тяжёлому (src/sounds.js batSwing)
const BAT_HIT_RANK = [null, 'flesh', 'knock', 'heavy', 'armor'];

function scavengeContainer(c) {
  if (c.searched) return;
  c.searched = true;
  SoundFX.containerOpen(c); // у каждого тайника свой звук (src/sounds.js)

  const dist = getDistrictAt(c.x, c.y);
  const bMult = (dist.bottleMult || 1.0) * STASH_YIELD;
  const sMult = (dist.scrapMult || 1.0) * STASH_YIELD;
  const toPlayerAngle = Math.atan2(player.y - c.y, player.x - c.x);

  let bottleRoll = 1;
  let scrapRoll = 0;
  const bonusDrops = [];

  const pzLoot = PZ_STASH_LOOT[c.type];
  if (pzLoot) {
    bottleRoll = Math.round(rollRange(pzLoot.bottles) * bMult);
    scrapRoll = Math.max(1, Math.round(rollRange(pzLoot.scrap) * sMult));
    pzLoot.bonus.forEach(([item, chance]) => {
      if (item === 'ammo_762n' && !player.unlockedWeapons.nagant) return;
      if (Math.random() < chance) bonusDrops.push(item);
    });
    // Гнездо и шлам — квако-ядра, цеха — оружейные детали
    if (dist.tier >= 4 && Math.random() < 0.45) bonusDrops.push('alien_core');
    else if (dist.tier === 3 && Math.random() < 0.25) bonusDrops.push('mil_parts');
  } else if (c.type === 'trash') {
    // Мусорный бак ЖЭК-4: в спальных дворах — главный источник стеклотары и бинтов
    bottleRoll = Math.max(1, Math.round((2 + Math.floor(Math.random() * 2)) * bMult));
    scrapRoll = Math.floor(Math.random() * 2);
    const r = Math.random();
    if (dist.id === 'heating' && r < 0.55) {
      bonusDrops.push('vodka');
    } else if (r < 0.35) {
      bonusDrops.push('bandage');
    } else if (r < 0.50 && player.unlockedWeapons.makarov) {
      bonusDrops.push('ammo_9x18');
    }
  } else if (c.type === 'car' && c.subType !== 'uaz') {
    // ВАЗ-2101 Жигули: источник чермета (особенно в Гаражном кооперативе «Восток»)
    const garageBonus = dist.id === 'garages' ? 2 : 0;
    scrapRoll = Math.max(1, Math.round((2 + Math.floor(Math.random() * 3) + garageBonus) * sMult));
    bottleRoll = Math.round((1 + Math.floor(Math.random() * 2)) * bMult);
    const r = Math.random();
    if (r < 0.38) bonusDrops.push('stew');
    else if (r < 0.62) bonusDrops.push('ammo_9x18');
  } else if (c.type === 'car' && c.subType === 'uaz') {
    // Санитарный УАЗ-452 «Буханка»: чермет + медицина, а на Кордоне — Оружейные детали!
    scrapRoll = Math.round((3 + Math.floor(Math.random() * 3)) * sMult);
    bottleRoll = Math.round((1 + Math.floor(Math.random() * 2)) * bMult);
    bonusDrops.push('bandage');
    if (dist.id === 'cordon') {
      bonusDrops.push('mil_parts');
    }
    if (Math.random() < 0.5) bonusDrops.push('ammo_12g');
  } else {
    // Армейский ящик (Военторг / Спецхран):
    scrapRoll = Math.round((4 + Math.floor(Math.random() * 3)) * sMult);
    bottleRoll = Math.round((1 + Math.floor(Math.random() * 2)) * bMult);
    bonusDrops.push('stew');
    if (dist.id === 'cordon') {
      // На Военном Кордоне — Оружейные детали (ящиков там много, поэтому не в каждом)
      if (Math.random() < 0.55) bonusDrops.push('mil_parts');
      if (Math.random() < 0.55) bonusDrops.push('ammo_12g');
    } else if (dist.id === 'nest') {
      // В Квако-Гнезде — Квако-ядра в каждом втором ящике и иногда Оружейные детали
      if (Math.random() < 0.5) bonusDrops.push('alien_core');
      if (Math.random() < 0.25) bonusDrops.push('mil_parts');
    } else {
      bonusDrops.push('ammo_9x18');
    }
  }

  player.resources.bottles += bottleRoll;
  player.resources.scrap += scrapRoll;

  addFloatingText(c.x, c.y - 28, `+${bottleRoll} Стеклотара  +${scrapRoll} Чермет`, dist.color || '#38bdf8');

  bonusDrops.forEach((itemType, idx) => {
    const spreadAngle = toPlayerAngle + (idx - (bonusDrops.length - 1) * 0.5) * 0.55;
    const dropDist = c.radius + 18;
    spawn3DLootItem(
      c.x + Math.cos(spreadAngle) * dropDist,
      c.y + Math.sin(spreadAngle) * dropDist,
      itemType,
      itemType === 'ammo_9x18' ? 8 : itemType === 'ammo_12g' ? 4 : itemType === 'ammo_762n' ? 7 : itemType === 'nonferrous' ? 2 : 1
    );
  });

  createParticles(c.x, c.y, dist.color || '#94a3b8', 14);
  // Предмет квеста в этом тайнике — выпадает рядом (src/quests.js)
  if (window.Quests) window.Quests.onSearched(c);
  updateHUD(true);
}

// --- КАТАЛОГ ОРУЖИЯ, ПАТРОНОВ И ПРИПАСОВ МИХАЛЫЧА (С PNG-РЕНДЕРАМИ) ---
const SHOP_ARSENAL_ITEMS = [
  // Бита своя с самого начала: в лавке её можно только взять с собой или оставить у Михалыча
  {
    id: 'bat',
    type: 'weapon',
    weaponKey: 'bat',
    slotKey: '',
    img: 'assets/sprites/weapons/weapon_bat.png?v=1026',
    name_ru: 'Бита с гвоздями',
    name_en: 'Spiked Bat',
    desc_ru: 'Урон: 26 | Тратит 18 выносливости за удар. Отбрасывает жаб; удар во время замаха сбивает выпад языком.',
    desc_en: 'DMG: 26 | Costs 18 stamina per swing. Knocks toads back; a hit during the windup stops a tongue lash.',
    zone_ru: '🏚 Своя, с самого начала',
    zone_en: '🏚 Your own, from the start',
    cost: {}
  },
  {
    id: 'makarov',
    type: 'weapon',
    weaponKey: 'makarov',
    slotKey: '[5]',
    img: 'assets/sprites/weapons/weapon_makarov.png?v=1026',
    name_ru: 'Пистолет Макарова (ПМ 9×18)',
    name_en: 'Makarov Pistol (PM 9×18)',
    desc_ru: 'Урон: 36 | Магазин: 8 патр. (+24 в комплекте). Надёжное табельное оружие против плевальщиков.',
    desc_en: 'DMG: 36 | Mag: 8 rds (+24 included). Reliable sidearm against ranged spitters.',
    zone_ru: '📍 Ресурсы: Дворы (Стеклотара) + Гаражи (Чермет)',
    zone_en: '📍 Loot in: Courtyards (Bottles) + Garages (Scrap)',
    cost: { bottles: 12, scrap: 10 }
  },
  {
    id: 'ammo_9x18',
    type: 'ammo',
    ammoKey: 'makarov',
    amount: 16,
    img: 'assets/sprites/loot/ammo_9x18.png?v=1026',
    name_ru: 'Пачка патронов 9×18 ПМ (+16 шт.)',
    name_en: '9×18mm Makarov Ammo Pack (+16)',
    desc_ru: 'Пополняет боезапас для Пистолета Макарова (перезарядка — клавиша R).',
    desc_en: 'Replenishes reserve ammo for the Makarov Pistol (press R to reload).',
    zone_ru: '📦 Всегда в наличии у Михалыча',
    zone_en: '📦 Always in stock',
    cost: { bottles: 4, scrap: 2 }
  },
  {
    id: 'drill',
    type: 'weapon',
    weaponKey: 'drill',
    slotKey: '[6]',
    img: 'assets/sprites/weapons/weapon_drill.png?v=1026',
    name_ru: 'Ударная дрель ИЭ-1035',
    name_en: 'Soviet Impact Drill IE-1035',
    desc_ru: 'Урон: 24/тик, лучше всех пробивает броню громил | Тратит выносливость (-4.5/тик). Перемалывает жаб в ближнем бою без патронов.',
    desc_en: 'DMG: 24/tick, best against brute armor | Drains stamina (-4.5/tick). Shreds armor at close range.',
    zone_ru: '📍 Ресурсы: Гаражный кооператив и Теплосеть',
    zone_en: '📍 Loot in: Garages & Heating Pipeline',
    cost: { bottles: 15, scrap: 22 }
  },
  {
    id: 'shotgun',
    type: 'weapon',
    weaponKey: 'shotgun',
    slotKey: '[7]',
    img: 'assets/sprites/weapons/weapon_shotgun.png?v=1026',
    name_ru: 'Дедовский Обрез 12 калибра',
    name_en: 'Grandpa\'s Sawed-Off 12G',
    desc_ru: 'Урон: 7×18 картечь, в упор ×1,35, вдаль быстро слабеет | Стволы: 2 патр. (+12 в комплекте). Сносит штурмовиков в упор.',
    desc_en: 'DMG: 7×18 buckshot, ×1.35 point-blank, weak at range | Barrels: 2 shells (+12 included). Devastating up close.',
    zone_ru: '🔴 Нужны Оружейные детали с Военного Кордона!',
    zone_en: '🔴 Requires Military Gun Parts from Military Cordon!',
    cost: { bottles: 20, scrap: 25, mil_parts: 5 }
  },
  {
    id: 'ammo_12g',
    type: 'ammo',
    ammoKey: 'shotgun',
    amount: 8,
    img: 'assets/sprites/loot/ammo_12g.png?v=1026',
    name_ru: 'Пачка картечи 12 калибра (+8 шт.)',
    name_en: '12-Gauge Buckshot Pack (+8)',
    desc_ru: 'Охотничьи патроны в красной гильзе для Дедовского Обреза (клавиша R).',
    desc_en: 'Heavy 12-gauge shells for the Sawed-Off Shotgun (press R to reload).',
    zone_ru: '📦 Всегда в наличии у Михалыча',
    zone_en: '📦 Always in stock',
    cost: { bottles: 6, scrap: 4 }
  },
  {
    id: 'plasma',
    type: 'weapon',
    weaponKey: 'plasma',
    slotKey: '[8]',
    img: 'assets/sprites/weapons/weapon_plasma.png?v=1026',
    name_ru: 'Трофейный Плазмаган «Тесла»',
    name_en: 'Trophy Alien Plasma Rifle',
    desc_ru: 'Урон: 48 | Боезапас бесконечен! Нагревается (+16%/выстр.), при 100% — клин на 3 сек.',
    desc_en: 'DMG: 48 | Infinite ammo! Builds heat (+16%/shot), overheats at 100% for 3s.',
    zone_ru: '🟣 Нужны Квако-ядра из угловых Квако-Гнёзд и жабьи глаза с печенью!',
    zone_en: '🟣 Requires Alien Cores from corner Toad Nests plus toad eyes and liver!',
    cost: { bottles: 30, scrap: 35, mil_parts: 6, alien_core: 5, toad_eye: 3, toad_liver: 2 }
  },
  {
    // Не продаётся: только картой Межпространственного Долбильщика (cardOnly)
    id: 'laser',
    type: 'weapon',
    weaponKey: 'laser',
    cardOnly: true,
    slotKey: '[9]',
    img: 'assets/sprites/weapons/weapon_laser.png?v=2',
    name_ru: 'Лазерный бластер',
    name_en: 'Laser Blaster',
    desc_ru: 'Луч: высокая скорострельность, средний урон. 30 с огня, потом 5 с перезарядки накопителя (или R).',
    desc_en: 'Beam: high fire rate, medium damage. 30 s of fire, then 5 s to recharge the cell (or R).',
    zone_ru: '🃏 Трофей Межпространственного Долбильщика',
    zone_en: '🃏 Interdimensional Pounder\'s trophy',
    cost: {}
  },
  // Сделано в мастерской Толика (src/workshop.js): здесь — только взять с собой или оставить
  {
    id: 'launcher', type: 'weapon', weaponKey: 'launcher', cardOnly: true,
    img: 'assets/sprites/weapons/weapon_launcher.png?v=1',
    name_ru: 'Самопальный гранатомёт', name_en: 'Homemade grenade launcher',
    desc_ru: 'Навесом в точку прицела, взрыв пробивает броню и задевает тебя рядом. Гранаты — у Толика.',
    desc_en: 'Lobs to the crosshair, the blast pierces armor and hits you if close. Grenades — from Tolik.',
    zone_ru: '🔧 Мастерская Толика', zone_en: '🔧 Tolik\'s workshop', cost: {}
  },
  {
    id: 'arc', type: 'weapon', weaponKey: 'arc', cardOnly: true,
    img: 'assets/sprites/weapons/weapon_arc.png?v=1',
    name_ru: 'Сварочный разрядник', name_en: 'Welding arc discharger',
    desc_ru: 'Дуга бьёт ближайшую жабу впереди и перескакивает ещё на две. Питание — плазменные ячейки.',
    desc_en: 'The arc hits the nearest toad ahead and jumps to two more. Runs on plasma cells.',
    zone_ru: '🔧 Мастерская Толика', zone_en: '🔧 Tolik\'s workshop', cost: {}
  },
  {
    id: 'emp', type: 'weapon', weaponKey: 'emp', cardOnly: true,
    img: 'assets/sprites/weapons/weapon_emp.png?v=1',
    name_ru: 'ЭМИ-граната', name_en: 'EMP grenade',
    desc_ru: 'Самоделка из плат НИИ. Глушит всю электронику вокруг на минуту — и твою тоже.',
    desc_en: 'Homemade from research-institute boards. Jams all electronics around for a minute — yours too.',
    zone_ru: '🔧 Мастерская Толика', zone_en: '🔧 Tolik\'s workshop', cost: {}
  },
  // Наган Зины — награда квеста «Коля» (src/quests.js): здесь — только взять с собой или оставить
  {
    id: 'nagant', type: 'weapon', weaponKey: 'nagant', cardOnly: true,
    img: 'assets/sprites/weapons/weapon_nagant.png?v=1',
    name_ru: 'Наган Зины', name_en: 'Zina\'s Nagant revolver',
    desc_ru: 'Барабан на 7 патронов, бьёт сильнее ПМ, пуля прошивает жабу навылет. Заряжается по патрону (R).',
    desc_en: '7-round cylinder, hits harder than the PM, the bullet goes through a toad. Loads one round at a time (R).',
    zone_ru: '🎖 Подарок Зины', zone_en: '🎖 A gift from Zina', cost: {}
  },
  {
    id: 'ammo_762n',
    type: 'ammo',
    ammoKey: 'nagant',
    amount: 14,
    img: 'assets/sprites/loot/ammo_762n.png?v=1',
    name_ru: 'Патроны 7,62 к нагану (+14 шт.)',
    name_en: '7.62 Nagant rounds (+14)',
    desc_ru: 'Пополняют боезапас нагана Зины (зарядить — клавиша R).',
    desc_en: 'Replenishes reserve ammo for Zina\'s Nagant (press R to load).',
    zone_ru: '📦 У Михалыча, раз уж наган есть', zone_en: '📦 Mikhalych has them, now that you own a Nagant',
    cost: { bottles: 6, scrap: 3 }
  }
];

const SHOP_SUPPLY_ITEMS = [
  {
    id: 'bandage',
    img: 'assets/sprites/loot/loot_bandage.png?v=1026',
    name_ru: 'Стерильный бинт (+45 HP за 3 с)',
    name_en: 'Sterile Bandage (+45 HP over 3s)',
    desc_ru: 'Перевязка ран: лечит постепенно, 3 секунды. Следующий расходник — не раньше чем через 3 с.',
    desc_en: 'Heals gradually over 3 seconds. Next consumable only after 3s.',
    cost: { bottles: 3 }
  },
  {
    id: 'stew',
    img: 'assets/sprites/loot/loot_stew.png?v=1026',
    name_ru: 'Говядина тушёная ГОСТ (+65 Вын.)',
    name_en: 'Soviet Beef Stew (+65 Stamina)',
    desc_ru: 'Мгновенно восстанавливает силы для ударов битой, дрели и перекатов (клавиша [2]).',
    desc_en: 'Instantly restores 65 Stamina for melee & dodge rolls (key [2]).',
    cost: { bottles: 4 }
  },
  {
    id: 'vodka',
    img: 'assets/sprites/loot/loot_vodka.png?v=1026',
    name_ru: 'Водка «Крепкая» (Берсерк ×1.8)',
    name_en: 'Stolichnaya Vodka (Berserk ×1.8)',
    desc_ru: 'Увеличивает урон биты, дрели и стрельбы на 10 секунд (клавиша [1]).',
    desc_en: 'Boosts melee and weapon damage for 10 seconds (key [1]).',
    cost: { bottles: 5 }
  }
];

function canAffordCost(cost) {
  return Object.keys(cost).every(k => (player.resources[k] || 0) >= cost[k]);
}

function payCost(cost) {
  for (const k in cost) player.resources[k] -= cost[k];
}

// Иконки и цвета ресурсов в ценах (порядок — как в кошельке)
const RES_DISPLAY = {
  bottles: { img: 'assets/sprites/loot/loot_bottle.png?v=1026' },
  scrap: { img: 'assets/sprites/loot/loot_scrap.png?v=1026' },
  mil_parts: { img: 'assets/sprites/loot/loot_mil_parts.png?v=1026', color: '#fca5a5' },
  alien_core: { img: 'assets/sprites/loot/loot_alien_core.png?v=1026', color: '#d8b4fe' },
  toad_eye: { img: 'assets/sprites/loot/loot_toad_eye.png?v=1', color: '#fde047' },
  toad_leg: { img: 'assets/sprites/loot/loot_toad_leg.png?v=1', color: '#86efac' },
  toad_liver: { img: 'assets/sprites/loot/loot_toad_liver.png?v=1', color: '#fda4af' },
  nonferrous: { img: 'assets/sprites/loot/loot_nonferrous.png?v=1', color: '#fb923c' },
  blueprint: { img: 'assets/sprites/loot/loot_blueprint.png?v=1', color: '#60a5fa' },
  tech_spirit: { img: 'assets/sprites/loot/loot_tech_spirit.png?v=1', color: '#cbd5e1' },
  plasma_cell: { img: 'assets/sprites/loot/loot_plasma_cell.png?v=1', color: '#67e8f9' },
  kvako_charge: { img: 'assets/sprites/loot/loot_kvako_charge.png?v=1', color: '#a3e635' },
  electronics: { img: 'assets/sprites/loot/loot_electronics.png?v=1', color: '#7dd3fc' }
};

function formatCostHTML(cost) {
  const parts = [];
  for (const k in RES_DISPLAY) {
    if (!cost[k]) continue;
    const d = RES_DISPLAY[k];
    const style = d.color ? ` style="color:${d.color};"` : '';
    parts.push(`<span${style}><img class="inline-res-icon" src="${d.img}">${cost[k]}</span>`);
  }
  return parts.join(' ');
}

// Кошелёк в шапке лавки
function updateShopWallet() {
  const ids = {
    bottles: 'shop-res-bottles', scrap: 'shop-res-scrap', mil_parts: 'shop-res-mil', alien_core: 'shop-res-core',
    toad_eye: 'shop-res-eye', toad_leg: 'shop-res-leg', toad_liver: 'shop-res-liver'
  };
  for (const k in PZ_LOOT_NAMES) ids[k] = 'shop-res-' + k;
  for (const k in ids) {
    const el = document.getElementById(ids[k]);
    if (el) el.innerText = player.resources[k];
  }
  // Лут Промзоны в кошельке — когда Василий там побывал (или лут уже есть)
  const showPz = locationsVisited.has('promzona') || Object.keys(PZ_LOOT_NAMES).some(k => player.resources[k] > 0);
  document.querySelectorAll('.res-pz').forEach(el => { el.style.display = showPz ? '' : 'none'; });
}

function openShop() {
  gameState = 'SHOP';
  document.getElementById('shop-modal').style.display = 'flex';
  renderArsenalAndSupplies();
  renderUpgradeTrees();
}

window.closeShop = function() {
  document.getElementById('shop-modal').style.display = 'none';
  gameState = 'PLAYING';
  if (window.Menu) window.Menu.requestSave(); // покупки сохраняем сразу
};

window.switchShopTab = function(tab) {
  const weaponsView = document.getElementById('shop-view-weapons');
  const suppliesView = document.getElementById('shop-view-supplies');
  const upgradesView = document.getElementById('shop-view-upgrades');
  const btnWeapons = document.getElementById('tab-btn-weapons');
  const btnSupplies = document.getElementById('tab-btn-supplies');
  const btnUpgrades = document.getElementById('tab-btn-upgrades');

  if (weaponsView) weaponsView.style.display = tab === 'weapons' ? 'block' : 'none';
  if (suppliesView) suppliesView.style.display = tab === 'supplies' ? 'block' : 'none';
  if (upgradesView) upgradesView.style.display = tab === 'upgrades' ? 'block' : 'none';

  if (btnWeapons) btnWeapons.classList.toggle('active', tab === 'weapons');
  if (btnSupplies) btnSupplies.classList.toggle('active', tab === 'supplies');
  if (btnUpgrades) btnUpgrades.classList.toggle('active', tab === 'upgrades');

  if (tab === 'upgrades') renderUpgradeTrees();
  else renderArsenalAndSupplies();
};

function renderArsenalAndSupplies() {
  if (player !== localPlayer) return; // покупка товарища по сети — окно не наше
  updateShopWallet();

  const arsenalBox = document.getElementById('arsenal-container');
  if (arsenalBox) {
    arsenalBox.innerHTML = '';
    const hasTier2Weapon = !!(player.unlockedWeapons.makarov || player.unlockedWeapons.drill);
    const canSeeShotgun = hasTier2Weapon || player.resources.mil_parts > 0 || !!player.unlockedWeapons.shotgun;
    const canSeePlasma = !!player.unlockedWeapons.shotgun || player.resources.alien_core > 0 || !!player.unlockedWeapons.plasma;

    SHOP_ARSENAL_ITEMS.forEach(item => {
      // Не показываем патроны к ещё не купленному оружию и не спойлерим весь топ-арсенал сразу
      if (item.type === 'ammo' && !player.unlockedWeapons[item.ammoKey]) return;
      if (item.weaponKey === 'shotgun' && !canSeeShotgun) return;
      if (item.weaponKey === 'plasma' && !canSeePlasma) return;
      if (item.cardOnly && !player.unlockedWeapons[item.weaponKey]) return;

      const isOwnedWeapon = item.type === 'weapon' && player.unlockedWeapons[item.weaponKey];
      const carried = isOwnedWeapon && isEquipped(item.weaponKey);
      const card = document.createElement('div');
      card.className = `shop-card ${isOwnedWeapon ? 'owned' : ''} ${isOwnedWeapon && !carried ? 'stashed' : ''}`;

      const ammoInfo = item.type === 'ammo'
        ? ` (Запас: ${player.ammo[item.ammoKey].clip}/${player.ammo[item.ammoKey].reserve})`
        : '';

      const left = document.createElement('div');
      left.className = 'shop-card-left';
      left.innerHTML = `
        <img class="shop-card-img" src="${item.img}" alt="">
        <div>
          <div class="shop-card-title">${currentLang === 'ru' ? item.name_ru : item.name_en}${ammoInfo}</div>
          <div class="shop-card-desc">${currentLang === 'ru' ? item.desc_ru : item.desc_en}</div>
          <div class="shop-card-zone">${currentLang === 'ru' ? item.zone_ru : item.zone_en}</div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'shop-buy-btn';
      if (isOwnedWeapon) {
        // Купленное: взять с собой или оставить у Михалыча
        btn.className = `shop-buy-btn ${carried ? 'unequip' : 'equip'}`;
        btn.innerHTML = `<span class="equip-tag">${carried ? t('equipped_tag') : t('stashed_tag')}</span>` +
          `<span>${carried ? t('unequip_btn') : t('equip_btn')}</span>`;
        btn.onclick = () => window.setEquipped(item.weaponKey, !carried);
      } else {
        btn.disabled = !canAffordCost(item.cost);
        btn.innerHTML = formatCostHTML(item.cost);
        btn.onclick = () => buyArsenalItem(item);
      }

      card.appendChild(left);
      card.appendChild(btn);
      arsenalBox.appendChild(card);
    });
  }

  const suppliesBox = document.getElementById('supplies-container');
  if (suppliesBox) {
    suppliesBox.innerHTML = '';
    SHOP_SUPPLY_ITEMS.forEach(sup => {
      const card = document.createElement('div');
      card.className = 'shop-card';

      const left = document.createElement('div');
      left.className = 'shop-card-left';
      left.innerHTML = `
        <img class="shop-card-img" src="${sup.img}" alt="">
        <div>
          <div class="shop-card-title">${currentLang === 'ru' ? sup.name_ru : sup.name_en} (${player.items[sup.id]} шт.)</div>
          <div class="shop-card-desc">${currentLang === 'ru' ? sup.desc_ru : sup.desc_en}</div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'shop-buy-btn';
      btn.disabled = !canAffordCost(sup.cost);
      btn.innerHTML = formatCostHTML(sup.cost);
      btn.onclick = () => buyItem(sup.id, sup.cost.bottles);

      card.appendChild(left);
      card.appendChild(btn);
      suppliesBox.appendChild(card);
    });
  }
}

const buyArsenalItem = netAction('shop.arsenal', buyArsenalItemRaw,
  ([item]) => [SHOP_ARSENAL_ITEMS.indexOf(item)], ([i]) => [SHOP_ARSENAL_ITEMS[i]]);
function buyArsenalItemRaw(item) {
  if (!item) return;
  if (!canAffordCost(item.cost)) return;
  if (item.type === 'weapon' && player.unlockedWeapons[item.weaponKey]) return;

  payCost(item.cost);
  if (item.type === 'weapon') {
    player.unlockedWeapons[item.weaponKey] = true;
    player.equipped[item.weaponKey] = true; // купленное сразу с собой, снять можно в той же карточке
    if (item.weaponKey === 'makarov') {
      player.ammo.makarov.clip = 8;
      player.ammo.makarov.reserve += 16;
    } else if (item.weaponKey === 'shotgun') {
      player.ammo.shotgun.clip = 2;
      player.ammo.shotgun.reserve += 10;
    }
    applyHotbarOrder(); // новый слот получает номер, следующие сдвигаются
    window.switchWeapon(item.weaponKey);
  } else if (item.type === 'ammo') {
    player.ammo[item.ammoKey].reserve += item.amount;
    addFloatingText(player.x, player.y - 30, `+${item.amount} ПАТРОНОВ`, '#facc15');
  }

  SoundFX.reload();
  updateHUD(true);
  renderArsenalAndSupplies();
}

window.buyItem = netAction('shop.item', function(item, costBottles) {
  if (player.resources.bottles >= costBottles) {
    player.resources.bottles -= costBottles;
    player.items[item]++;
    addFloatingText(player.x, player.y - 30, `+1 ${t(item).toUpperCase()}`, '#4ade80');
    updateHUD(true);
    renderArsenalAndSupplies();
  }
});

function renderUpgradeTrees() {
  if (player !== localPlayer) return;
  const container = document.getElementById('tree-container');
  if (!container) return;
  container.innerHTML = '';
  updateShopWallet();

  // Подсказка: перки ставятся на жабьи трофеи
  const hint = document.createElement('div');
  hint.className = 'tree-hint';
  hint.innerHTML = currentLang === 'ru'
    ? `Михалыч вживляет модификации на жабьей биологии: ${formatCostHTML({ toad_eye: 'глаза', toad_leg: 'лапки', toad_liver: 'печень' })} — падают только с жаб.`
    : `Mikhalych builds mods on toad biology: ${formatCostHTML({ toad_eye: 'eyes', toad_leg: 'legs', toad_liver: 'liver' })} — dropped by toads only.`;
  container.appendChild(hint);

  for (const treeKey in UPGRADE_TREES) {
    const tree = UPGRADE_TREES[treeKey];
    const col = document.createElement('div');
    col.className = 'tree-column';

    const colTitle = document.createElement('div');
    colTitle.className = 'tree-col-title';
    colTitle.style.color = tree.color;
    colTitle.innerText = currentLang === 'ru' ? tree.name_ru : tree.name_en;
    col.appendChild(colTitle);

    for (const perkKey in tree.perks) {
      const perk = tree.perks[perkKey];
      if (perk.promzona && !locationsVisited.has('promzona')) continue;
      const isInstalled = player.hasPerk(perk.id);
      const isLocked = player.blockedPerks.has(perk.id);

      const card = document.createElement('div');
      card.className = `perk-card ${isInstalled ? 'installed' : ''} ${isLocked ? 'locked' : ''}`;

      const nameEl = document.createElement('div');
      nameEl.className = 'perk-name';
      nameEl.innerText = currentLang === 'ru' ? perk.name_ru : perk.name_en;

      const descEl = document.createElement('div');
      descEl.className = 'perk-desc';
      descEl.innerText = personalize(currentLang === 'ru' ? perk.desc_ru : perk.desc_en);

      const costEl = document.createElement('div');
      costEl.className = 'perk-cost';
      costEl.innerHTML = formatCostHTML(perk.cost);

      const head = document.createElement('div');
      head.className = 'perk-head';
      head.appendChild(perkIconImg(perk.id, 'perk-icon'));
      head.appendChild(nameEl);
      card.appendChild(head);
      card.appendChild(descEl);
      card.appendChild(costEl);

      if (isLocked) {
        const lockWarn = document.createElement('div');
        lockWarn.className = 'perk-lock-warn';
        lockWarn.innerText = `${t('locked_by')} несовместимый апгрейд!`;
        card.appendChild(lockWarn);
      } else if (isInstalled) {
        const installedBadge = document.createElement('div');
        installedBadge.style.color = '#22c55e';
        installedBadge.style.fontWeight = 'bold';
        installedBadge.style.fontSize = '11px';
        installedBadge.innerText = `✅ ${t('installed')}`;
        card.appendChild(installedBadge);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn-buy-perk';
        buyBtn.innerText = currentLang === 'ru' ? 'Установить' : 'Install';
        buyBtn.disabled = !canAffordCost(perk.cost);
        buyBtn.onclick = () => buyPerk(perk);
        card.appendChild(buyBtn);
      }

      col.appendChild(card);
    }

    container.appendChild(col);
  }
}

const buyPerk = netAction('shop.perk', buyPerkRaw, ([perk]) => [perk.id], ([id]) => [findPerk(id)]);
function findPerk(id) {
  for (const k in UPGRADE_TREES) for (const pk in UPGRADE_TREES[k].perks) if (UPGRADE_TREES[k].perks[pk].id === id) return UPGRADE_TREES[k].perks[pk];
  return null;
}
function buyPerkRaw(perk) {
  if (!perk || !canAffordCost(perk.cost)) return;
  if (player.blockedPerks.has(perk.id)) return;

  payCost(perk.cost);
  player.unlockedPerks.add(perk.id);

  if (perk.locks && perk.locks.length > 0) {
    perk.locks.forEach(lockedId => {
      player.blockedPerks.add(lockedId);
    });
  }

  if (perk.statMods.damage) player.baseDamage += perk.statMods.damage;
  if (perk.statMods.bonusMaxHp) {
    player.maxHp += perk.statMods.bonusMaxHp;
    player.hp += perk.statMods.bonusMaxHp;
  }
  if (perk.statMods.bonusMaxStamina) {
    player.maxStamina += perk.statMods.bonusMaxStamina;
    player.stamina += perk.statMods.bonusMaxStamina;
  }
  if (perk.statMods.critChance) player.critChance += perk.statMods.critChance;
  if (perk.statMods.critMult) player.critMult = perk.statMods.critMult;
  if (perk.id === 'sludge_skin') player.slimeArmor = slimeArmorMax();
  if (perk.id === 'fire_goo') player.rmbAbility = 'fire_goo';

  addFloatingText(player.x, player.y - 35, `${perk.name_ru.toUpperCase()}`, '#38bdf8');
  createParticles(player.x, player.y, '#38bdf8', 20);

  updateHUD(true);
  renderUpgradeTrees();
}

// --- Кооп: выкинуть оружие, патроны, припас (окно инвентаря) — подберёт любой ---
// Патроны — пачкой (all — весь запас), припас — по одному (all — все). Выкинувший подберёт обратно через 3 с
const DROP_AMMO = { makarov: ['ammo_9x18', 8], shotgun: ['ammo_12g', 4], nagant: ['ammo_762n', 7] };
const LOOT_ITEM_TYPES = new Set(['stew', 'vodka', 'bandage']);
function weaponTitle(w) {
  const it = SHOP_ARSENAL_ITEMS.find(x => x.type === 'weapon' && x.weaponKey === w);
  return it ? (currentLang === 'ru' ? it.name_ru : it.name_en).toUpperCase() : w.toUpperCase();
}
function weaponImg(w) {
  const it = SHOP_ARSENAL_ITEMS.find(x => x.type === 'weapon' && x.weaponKey === w);
  return it ? it.img : `assets/sprites/weapons/weapon_${w}.png?v=1`;
}
function dropLoot(type, val, extra) {
  const a = player.angle;
  lootItems.push(Object.assign({
    x: Math.round(player.x + Math.cos(a) * 46 + (Math.random() - 0.5) * 18),
    y: Math.round(player.y + Math.sin(a) * 30 + 18 + (Math.random() - 0.5) * 10),
    type, icon: '📦', val, by: player.id, noPick: 180
  }, extra || {}));
}
window.dropItem = netAction('drop', function(kind, id, all) {
  if (kind === 'item') {
    const n = Math.min(player.items[id] || 0, all ? 999 : 1);
    if (n <= 0) return;
    player.items[id] -= n;
    const info = itemInfo(id);
    dropLoot(LOOT_ITEM_TYPES.has(id) ? id : 'item:' + id, n, info ? { img: info.img } : null);
  } else if (kind === 'ammo') {
    const d = DROP_AMMO[id], am = player.ammo[id];
    if (!d || !am) return;
    const n = Math.min(am.reserve, all ? am.reserve : d[1]);
    if (n <= 0) return;
    am.reserve -= n;
    dropLoot(d[0], n);
  } else if (kind === 'weapon') {
    if (!player.unlockedWeapons[id]) return;
    // Ствол — с патронами в обойме; запас остаётся у себя (его выкидывают отдельно)
    const clip = player.ammo[id] ? player.ammo[id].clip : 0;
    if (player.ammo[id]) player.ammo[id].clip = 0;
    if (player.reloadingWeapon === id) { player.reloadingWeapon = null; player.reloadTimer = 0; }
    player.unlockedWeapons[id] = false;
    player.equipped[id] = false;
    if (player.currentWeapon === id) player.currentWeapon = equippedWeapons()[0] || null;
    dropLoot('weapon:' + id, 1, { img: weaponImg(id), ammo: clip });
    applyHotbarOrder();
  }
  addFloatingText(player.x - 30, player.y - 50, currentLang === 'ru' ? gendered('Выкинул{|а}') : 'Dropped', '#94a3b8');
  updateHUD(true);
});

// Расходники: общая перезарядка, а бинт лечит постепенно. Раньше бинт лечил мгновенно и без
// перезарядки, и спамом бинтов можно было перекрыть любой урон (так стояли против Мясника)
const CONSUMABLE_COOLDOWN = 180; // кадров при 60 Гц — 3 с
const BANDAGE_HEAL = 45;
const BANDAGE_HEAL_FRAMES = 180;

window.useItem = function(itemType) {
  if (gameState !== 'PLAYING' && player === localPlayer) return;
  if (player.items[itemType] <= 0) return;
  if (player.itemCooldown > 0) {
    addFloatingText(player.x, player.y - 30, currentLang === 'ru' ? '⏳ ЕЩЁ НЕ ВРЕМЯ' : '⏳ NOT YET', '#94a3b8');
    return;
  }

  player.items[itemType]--;
  player.itemCooldown = CONSUMABLE_COOLDOWN;
  if (itemType === 'vodka') {
    player.isDrunk = true;
    player.drunkTimer = player.hasPerk('charmed_spirit') ? 900 : 600;
    addFloatingText(player.x, player.y - 30, t('status_drunk'), '#f59e0b');
    createParticles(player.x, player.y, '#f59e0b', 14);
  } else if (itemType === 'stew') {
    player.stamina = Math.min(player.maxStamina, player.stamina + 65);
    addFloatingText(player.x, player.y - 30, "+65 ВЫНОСЛИВ.", '#38bdf8');
    createParticles(player.x, player.y, '#38bdf8', 10);
  } else if (window.Canteen && window.Canteen.isDish(itemType)) {
    window.Canteen.use(itemType);
  } else if (itemType === 'bandage') {
    // Лечение идёт в update(), BANDAGE_HEAL за BANDAGE_HEAL_FRAMES; карта «Живучесть» — больше
    player.healLeft += BANDAGE_HEAL * (1 + CARD_EFFECTS.vitalityBandage * (player.cards.vitality || 0));
    addFloatingText(player.x, player.y - 30, currentLang === 'ru' ? `+${BANDAGE_HEAL} HP за 3 с` : `+${BANDAGE_HEAL} HP over 3s`, '#22c55e');
    createParticles(player.x, player.y, '#22c55e', 12);
  }
  updateHUD(true);
};

// «Жабьи ноги»: перекат длиннее и кончается приземлением — жаб в радиусе отбрасывает и оглушает.
// Оглушённая жаба стоит столбом (stunT, кадры); снова оглушить её можно только через stunCd — перекатами
// толпу насовсем не заморозить. Боссов только бьёт: не отбрасывает и не оглушает
const FROG_LEGS = { roll: 1.35, radius: 62, dmg: 0.5, push: 34, stun: 30, immune: 90 };

function frogLegsLanding() {
  if (player.inSafe) return;
  const fx = player.x, fy = player.y + footDY(player);
  spawnShockwave(fx, fy, FROG_LEGS.radius, '#bef264', 20);
  SoundFX.bossFx('frog_land', fx, fy);
  if (player === localPlayer) cameraKickY += 5;
  const dmg = player.baseDamage * FROG_LEGS.dmg;
  enemies.forEach(e => {
    if (e.hp <= 0 || !inGroundEllipse(e.x, e.y + footDY(e), fx, fy, FROG_LEGS.radius + e.radius)) return;
    const hit = damageEnemy(e, dmg, 'stomp', player.x, player.y);
    e.hitFlash = 6;
    addFloatingText(e.x, e.y - 20, damageLabel(hit, `-${Math.round(hit.dealt)}`), '#bef264');
    if (e.type === 'boss' || e.type === 'pounder') return;
    const a = Math.atan2(e.y - player.y, e.x - player.x);
    const kb = e.type === 'brute' ? FROG_LEGS.push * 0.35 : FROG_LEGS.push;
    const kx = e.x + Math.cos(a) * kb, ky = e.y + Math.sin(a) * kb;
    if (!checkWalkCollision(kx, ky, e.radius, footDY(e))) {
      e.x = kx;
      e.y = ky;
    }
    if (e.stunCd > 0) return;
    e.stunT = FROG_LEGS.stun;
    e.stunCd = FROG_LEGS.stun + FROG_LEGS.immune;
    if (e.lunge) { // язык в замахе — сбит
      e.lunge = null;
      e.squash = 0;
    }
  });
}

function performRoll() {
  // Карта «Ловкость»: перекат дешевле и чаще
  const agility = Math.max(0.4, 1 - CARD_EFFECTS.agilityRoll * (player.cards.agility || 0));
  const stamMult = (player.hasPerk('third_frog_eye') ? 0.75 : 1.0) * agility;
  const rollCost = Math.round(25 * stamMult);
  if (player.isRolling || player.rollCooldown > 0 || player.stamina < rollCost || player.stunTimer > 0) return;
  
  let dx = 0, dy = 0;
  if (keys['KeyW']) dy -= 1;
  if (keys['KeyS']) dy += 1;
  if (keys['KeyA']) dx -= 1;
  if (keys['KeyD']) dx += 1;
  
  if (dx === 0 && dy === 0) {
    dx = Math.cos(player.angle);
    dy = Math.sin(player.angle);
  } else {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
  }
  
  player.isRolling = true;
  player.rollDuration = 18;
  player.rollCooldown = Math.round(35 * agility);
  player.rollDx = dx;
  player.rollDy = dy;
  player.stamina -= rollCost;
  createParticles(player.x, player.y, '#94a3b8', 8);

  if (player.hasPerk('drill_arm')) {
    createParticles(player.x, player.y, '#eab308', 15);
    enemies.forEach(e => {
      if (Math.hypot(player.x - e.x, player.y - e.y) < 75) {
        const hit = damageEnemy(e, 35, 'shock', player.x, player.y);
        addFloatingText(e.x, e.y - 20, damageLabel(hit, `-${Math.round(hit.dealt)} УДАР`), '#eab308');
      }
    });
  }
}

// --- СНАРЯЖЕНИЕ: что Василий носит с собой ---
// Купленное оружие лежит у Михалыча; с собой — то, что игрок экипировал в лавке (хоть всё, хоть
// ничего). В хотбаре, на Q и на колесе — только взятое. Q меняет ближнее и дальнее: к последнему
// дальнему из ближнего и обратно, колесо перебирает всё взятое по порядку хотбара
const MELEE_WEAPONS = new Set(['bat', 'drill']);

function isEquipped(w) {
  return !!(player.unlockedWeapons[w] && player.equipped && player.equipped[w]);
}

function equippedWeapons() {
  return hotbarOrder.filter(w => HOTBAR_WEAPONS.has(w) && isEquipped(w));
}

window.setEquipped = netAction('shop.equip', function(w, on) {
  if (!player.unlockedWeapons[w]) return;
  player.equipped[w] = on;
  if (on) {
    // Взял оружие, а руки пустые — сразу в руки
    if (!player.currentWeapon) window.switchWeapon(w);
  } else if (player.currentWeapon === w) {
    // Снял то, что в руках: взять другое того же вида, иначе любое, иначе — пустые руки
    const rest = equippedWeapons();
    const same = rest.filter(x => MELEE_WEAPONS.has(x) === MELEE_WEAPONS.has(w));
    const next = same[0] || rest[0] || null;
    if (player.reloadingWeapon === w) {
      player.reloadingWeapon = null;
      player.reloadTimer = 0;
    }
    if (next) window.switchWeapon(next);
    else player.currentWeapon = null;
  }
  applyHotbarOrder();
  updateHUD(true);
  renderArsenalAndSupplies();
});

window.switchWeapon = function(weaponKey) {
  const allWeapons = [...HOTBAR_WEAPONS];
  if (!allWeapons.includes(weaponKey)) return;

  if (!player.unlockedWeapons[weaponKey]) {
    SoundFX.emptyClick();
    addFloatingText(player.x, player.y - 38, currentLang === 'ru' ? '🔒 КУПИТЕ В ЛАВКЕ МИХАЛЫЧА!' : '🔒 BUY AT MIKHALYCH SHOP!', '#f87171');
    return;
  }
  if (!isEquipped(weaponKey)) {
    SoundFX.emptyClick();
    addFloatingText(player.x, player.y - 38, t('left_at_shop'), '#94a3b8');
    return;
  }
  if (MELEE_WEAPONS.has(weaponKey)) player.lastMelee = weaponKey;
  else player.lastRanged = weaponKey;

  if (player.reloadingWeapon && player.reloadingWeapon !== weaponKey) {
    player.reloadingWeapon = null;
    player.reloadTimer = 0;
  }

  player.currentWeapon = weaponKey;
  const names = {
    bat: currentLang === 'ru' ? 'БИТА С ГВОЗДЯМИ' : 'SPIKED BAT',
    makarov: currentLang === 'ru' ? 'ПИСТОЛЕТ МАКАРОВА (ПМ)' : 'MAKAROV PM 9x18',
    drill: currentLang === 'ru' ? 'УДАРНАЯ ДРЕЛЬ ИЭ-1035' : 'IMPACT DRILL',
    shotgun: currentLang === 'ru' ? 'ДЕДОВСКИЙ ОБРЕЗ 12К' : 'SAWED-OFF SHOTGUN',
    plasma: currentLang === 'ru' ? 'ТРОФЕЙНЫЙ ПЛАЗМАГАН' : 'TROPHY PLASMA GUN',
    laser: currentLang === 'ru' ? 'ЛАЗЕРНЫЙ БЛАСТЕР' : 'LASER BLASTER',
    launcher: currentLang === 'ru' ? 'САМОПАЛЬНЫЙ ГРАНАТОМЁТ' : 'HOMEMADE GRENADE LAUNCHER',
    arc: currentLang === 'ru' ? 'СВАРОЧНЫЙ РАЗРЯДНИК' : 'WELDING ARC',
    emp: currentLang === 'ru' ? 'ЭМИ-ГРАНАТА' : 'EMP GRENADE',
    nagant: currentLang === 'ru' ? 'НАГАН ЗИНЫ' : 'ZINA\'S NAGANT'
  };
  addFloatingText(player.x, player.y - 35, `${names[weaponKey]}`, '#38bdf8');
  createParticles(player.x, player.y, '#38bdf8', 8);
  updateHUD(true);
};

// Q: оружие в 4-й и 5-й ячейках хотбара (жёлтые) — туда-обратно. В руках что-то третье — берёт из 4-й.
// Расходник в этих ячейках не в счёт; в паре одно оружие — берёт его
window.cycleWeapon = function() {
  const visible = visibleHotbarSlots();
  const pair = Q_SLOTS.map(i => visible[i]).filter(id => id && HOTBAR_WEAPONS.has(id));
  if (pair.length === 0) return;
  const i = pair.indexOf(player.currentWeapon);
  const next = i < 0 ? pair[0] : pair[(i + 1) % pair.length];
  if (next !== player.currentWeapon) window.switchWeapon(next);
};

// Колесо: следующее (dir = 1) или предыдущее взятое оружие по порядку хотбара
function stepWeapon(dir) {
  const weapons = equippedWeapons();
  if (weapons.length === 0) return;
  const i = weapons.indexOf(player.currentWeapon);
  const next = weapons[((i < 0 ? (dir > 0 ? -1 : 0) : i) + dir + weapons.length) % weapons.length];
  if (next !== player.currentWeapon) window.switchWeapon(next);
}

function startReload() {
  const wKey = player.currentWeapon;
  if (wKey === 'laser') {
    rechargeLaser();
    return;
  }
  if (wKey !== 'makarov' && wKey !== 'shotgun' && wKey !== 'launcher' && wKey !== 'nagant') return;
  if (player.reloadingWeapon) return;

  const ammoState = player.ammo[wKey];
  if (ammoState.clip >= ammoState.maxClip) return;
  if (ammoState.reserve <= 0) {
    SoundFX.emptyClick();
    addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? 'НЕТ ПАТРОНОВ! (К МИХАЛЫЧУ)' : 'OUT OF AMMO!', '#ef4444');
    return;
  }

  player.reloadingWeapon = wKey;
  player.reloadMaxTimer = ammoState.reloadTime;
  player.reloadTimer = ammoState.reloadTime;
  SoundFX.reloadStart(wKey);
  addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? 'ПЕРЕЗАРЯДКА [R]...' : 'RELOADING [R]...', '#facc15');
  updateHUD(true);
}

// --- ОРУЖИЕ: УРОН, СКОРОСТРЕЛЬНОСТЬ, ПРОБИТИЕ ---
// dmg(b) — урон за удар / выстрел / тик дрели от базового урона Василия b (у обреза — за одну дробину).
// cooldown — кадры между атаками. pen — пробитие брони (0 — броня гасит всё, 1 — броня не мешает).
// Те же числа показывает таблица баланса (F4), так что править — только здесь
const WEAPONS = {
  bat: { dmg: b => b + 2, cooldown: 22, pen: 0.2 },
  makarov: { dmg: b => b + 12, cooldown: 14, pen: 0.25 },
  // Дрель лучше всех пробивает броню, но тиков меньше и урон за тик ниже: раньше она давала втрое
  // больше урона в секунду, чем остальное оружие, и разбирала Мясника за полминуты
  drill: { dmg: b => b * 0.75 + 6, cooldown: 14, pen: 0.7 },
  // Дробь в упор сильнее (×1,35 ближе 60 px), с 100 px слабеет и к 250 px даёт четверть урона
  shotgun: {
    dmg: b => b * 0.72, cooldown: 26, pen: 0.4, pellets: 7, clip: 2, reload: 110,
    falloff: { near: 60, full: 100, far: 250, closeMult: 1.35, farMult: 0.25 }
  },
  plasma: { dmg: b => b + 24, cooldown: 10, pen: 0.8 },
  // Лазерный бластер (карта Долбильщика): луч бьёт сразу, тиков много, урон за тик средний; range — длина луча
  laser: { dmg: b => b * 0.22 + 3, cooldown: 5, pen: 0.6, range: 560 },
  // Мастерская Толика (src/workshop.js): гранатомёт — урон взрыва в середине; разрядник — урон дуги за тик,
  // range — до первой жабы, chain — на сколько ещё перескакивает, chainR — как далеко
  launcher: { dmg: b => b * 1.5 + 54, cooldown: 30, pen: 1.0 },
  // Наган Зины (квест «Коля»): сильнее и медленнее ПМ, пуля прошивает первую жабу (pierce) и бьёт следующую
  // слабее (pierceMult); барабан заряжается по патрону — player.ammo.nagant.reloadTime кадров на штуку
  nagant: { dmg: b => b * 1.4 + 28, cooldown: 24, pen: 0.5, pierce: 1, pierceMult: 0.75 },
  arc: { dmg: b => b * 0.3 + 4, cooldown: 6, pen: 0.6, range: 150, chain: 2, chainR: 120 },
  chain: { pen: 1.0 },  // цепная молния перка «Аккумулятор от КАМАЗа»
  shock: { pen: 0.5 },  // ударная волна переката перка «Рука-перфоратор»
  thrown: { pen: 1.0 }  // предмет, брошенный громилой (бьёт и по своим)
};

// --- БРОНЯ И УДАРЫ В СПИНУ ---
// e.armor — доля урона, которую броня гасит при ударе спереди (громилы, Мясник).
// Удар со спины (сзади от того, куда враг смотрит) броню не замечает и бьёт сильнее
const BACK_ARC = 1.95;       // дальше этого угла от взгляда врага — уже спина (~112°)
const BACKSTAB_MULT = 1.25;

// Множитель урона дробины по пройденному ею пути (WEAPONS.shotgun.falloff)
function shotgunFalloff(d) {
  const F = WEAPONS.shotgun.falloff;
  // Чок мастерской: дробь слабеет позже (250 → 330 px)
  const k = upg('sg_choke') ? 1.32 : 1;
  const full = F.full * k, far = F.far * k;
  if (d <= F.near) return F.closeMult;
  if (d <= full) return F.closeMult + (1 - F.closeMult) * (d - F.near) / (full - F.near);
  if (d >= far) return F.farMult;
  return 1 + (F.farMult - 1) * (d - full) / (far - full);
}

// --- Улучшения мастерской Толика (src/workshop.js): урон +20% и лучшее пробитие ---
function upg(id) {
  return !!(window.Workshop && window.Workshop.has(id));
}
const UPG_DMG = { bat: 'bat_nails', makarov: 'pm_bore', drill: 'drill_bit', plasma: 'pl_overdrive' };
const UPG_PEN = { makarov: ['pm_bore', 0.4], drill: ['drill_bit', 0.85] };
function weaponDmg(key) {
  return WEAPONS[key].dmg(player.baseDamage) * (UPG_DMG[key] && upg(UPG_DMG[key]) ? 1.2 : 1) *
    (window.Basement ? window.Basement.restDamage() : 1);
}
function weaponPen(weapon) {
  if (UPG_PEN[weapon] && upg(UPG_PEN[weapon][0])) return UPG_PEN[weapon][1];
  return (WEAPONS[weapon] && WEAPONS[weapon].pen !== undefined) ? WEAPONS[weapon].pen : 0.5;
}

function armorFactor(armor, weapon) {
  return 1 - armor * (1 - weaponPen(weapon));
}

// Единственное место, где враг получает урон. fromX/fromY — откуда пришёл удар.
// Возвращает фактический урон и как он прошёл, чтобы место вызова показало цифру
function damageEnemy(e, dmg, weapon, fromX, fromY) {
  if (e.type === 'boss') return damageBoss(e, dmg, weapon, fromX, fromY);
  if (e.type === 'pounder' && (e.blinking > 0 || (!e.isClone && pounderMiniAlive()))) {
    // Мерцает между измерениями или его прикрывает малая копия: удары проходят насквозь
    e.isAggroed = true;
    const ha = Math.atan2(fromY - e.y, fromX - e.x);
    spawnDirectionalSparks(e.x + Math.cos(ha) * 36, e.y - 60 + Math.sin(ha) * 30, ha, 1.4, 4, '#d8b4fe', 3, 9, 8);
    sayLine('say_boss_invuln');
    return { dealt: 0, invuln: true };
  }
  const armor = e.armor || 0;
  let fromBehind = false;
  if (armor > 0) {
    let diff = Math.abs(Math.atan2(fromY - e.y, fromX - e.x) - (e.angle || 0));
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
    fromBehind = diff > BACK_ARC;
  }
  const dealt = armor > 0 ? dmg * (fromBehind ? BACKSTAB_MULT : armorFactor(armor, weapon)) : dmg;
  e.hp -= dealt;
  e.isAggroed = true;
  noteAttacker(e, dealt, weapon);
  if (e.lunge && e.lunge.phase === 'windup' && (weapon === 'bat' || weapon === 'drill')) interruptTongue(e);
  if (armor > 0 && !fromBehind && dealt < dmg * 0.8) {
    // Звонкий удар по железу: серые искры навстречу удару
    spawnDirectionalSparks(e.x, e.y - 22, Math.atan2(fromY - e.y, fromX - e.x), 1.3, 6, '#cbd5e1', 3, 9, 9);
    if (Math.random() < 0.25) SoundFX.ricochet();
  }
  return { dealt, fromBehind, armored: armor > 0 && !fromBehind };
}

// Мясник: сначала энергощит — его снимает только плазма. Под щитом золотая кожа: плазма её почти
// не берёт, а огнестрел, дрель и бита срезают с каждого попадания BOSS_ARMOR_FLAT — чем сильнее
// одиночный удар, тем больше проходит (но не меньше BOSS_ARMOR_MIN). Со спины кожа не спасает
function damageBoss(e, dmg, weapon, fromX, fromY) {
  e.isAggroed = true;
  const hitAngle = Math.atan2(fromY - e.y, fromX - e.x);
  if (e.invuln > 0) {
    // Входит в берсерк: всё отскакивает
    spawnDirectionalSparks(e.x + Math.cos(hitAngle) * 40, e.y - 44 + Math.sin(hitAngle) * 30, hitAngle, 1.4, 5, '#fca5a5', 3, 9, 8);
    sayLine('say_boss_invuln');
    return { dealt: 0, invuln: true };
  }
  if (e.shield > 0) {
    e.shieldFlash = 8;
    shieldRipple(e, hitAngle);
    if (weapon !== 'plasma') {
      spawnDirectionalSparks(e.x + Math.cos(hitAngle) * 64, e.y - 52 + Math.sin(hitAngle) * 44, hitAngle, 1.2, 5, '#7dd3fc', 3, 9, 8);
      // Василий догадывается, что так щит не взять (цепная молния и волна переката — не его удары)
      if (weapon === 'makarov' || weapon === 'shotgun' || weapon === 'nagant') sayLine('say_shield_bullets');
      else if (weapon === 'bat' || weapon === 'drill') sayLine('say_shield_melee');
      return { dealt: 0, shielded: true };
    }
    const absorbed = Math.min(e.shield, dmg);
    e.shield -= absorbed;
    noteAttacker(e, absorbed, weapon);
    if (e.shield <= 0) {
      e.shield = 0;
      onBossShieldBroken(e);
    }
    return { dealt: absorbed, shield: true };
  }
  let diff = Math.abs(hitAngle - (e.angle || 0));
  while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
  const fromBehind = diff > BACK_ARC && weapon !== 'plasma';
  let dealt;
  if (weapon === 'plasma') {
    dealt = dmg * BOSS_PLASMA_VS_SKIN;
    sayLine('say_plasma_armor');
  }
  else if (fromBehind) dealt = dmg * BACKSTAB_MULT;
  else dealt = Math.max(dmg * BOSS_ARMOR_MIN, dmg - BOSS_ARMOR_FLAT);
  e.hp -= dealt;
  noteAttacker(e, dealt, weapon);
  const armored = !fromBehind && dealt < dmg * 0.8;
  if (armored) {
    spawnDirectionalSparks(e.x, e.y - 40, hitAngle, 1.3, 6, '#fde047', 3, 9, 9);
    if (Math.random() < 0.25) SoundFX.ricochet();
  }
  return { dealt, fromBehind, armored };
}

function onBossShieldBroken(e) {
  shatterShield(e);
  addFloatingText(e.x - 70, e.y - 130, t('boss_shield_down'), '#38bdf8');
  spawnDirectionalSparks(e.x, e.y - 52, -Math.PI / 2, Math.PI * 2, 30, '#7dd3fc', 4, 13, 18);
  createParticles(e.x, e.y - 52, '#bae6fd', 20);
  SoundFX.bossFx('butcher_shield', e.x, e.y);
  cameraKickX += (Math.random() - 0.5) * 14;
  cameraKickY += (Math.random() - 0.5) * 14;
}

// Подпись к цифре урона: «БРОНЯ», если броня съела урон, «В СПИНУ», если удар зашёл сзади
function damageLabel(hit, base) {
  if (hit.invuln) return currentLang === 'ru' ? 'НЕУЯЗВИМ' : 'IMMUNE';
  if (hit.shielded) return currentLang === 'ru' ? 'ЩИТ' : 'SHIELD';
  if (hit.shield) return base + ' 🛡';
  if (hit.fromBehind) return base + (currentLang === 'ru' ? ' В СПИНУ' : ' BACKSTAB');
  if (hit.armored) return base + (currentLang === 'ru' ? ' БРОНЯ' : ' ARMOR');
  return base;
}

// --- ПРОЦЕДУРНЫЙ АУДИО-СИНТЕЗАТОР ВЫСТРЕЛОВ И УДАРОВ (WebAudio API, 0 внешних файлов) ---
const SoundFX = {
  ctx: null,
  noiseBuf: null,
  out: null, // общая громкость: все звуки идут через этот узел (ползунок в настройках)
  volume: 1,
  setVolume(v) {
    this.volume = v;
    if (this.out) this.out.gain.value = v;
  },
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = this.volume;
      this.out.connect(this.ctx.destination);
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 0.5, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuf = buf;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },
  batSwing(hit = false) {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    // Свист рассекаемого воздуха + глухой удар битой с гвоздями
    const nSrc = ac.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.14);
    const nGain = ac.createGain();
    nGain.gain.setValueAtTime(0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    nSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.out);
    nSrc.start(now);
    nSrc.stop(now + 0.16);

    if (hit) {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);
      const oGain = ac.createGain();
      oGain.gain.setValueAtTime(0.38, now);
      oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(oGain);
      oGain.connect(this.out);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  },
  makarov() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    // Сухой хлесткий хлопок 9х18 ПМ
    const nSrc = ac.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.13);
    const nGain = ac.createGain();
    nGain.gain.setValueAtTime(0.30, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    nSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.out);
    nSrc.start(now);
    nSrc.stop(now + 0.15);

    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.09);
    const oGain = ac.createGain();
    oGain.gain.setValueAtTime(0.28, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
    osc.connect(oGain);
    oGain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.11);
  },
  shotgun() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;

    const nSrc = ac.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.24);
    const nGain = ac.createGain();
    nGain.gain.setValueAtTime(0.42, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    nSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.out);
    nSrc.start(now);
    nSrc.stop(now + 0.26);

    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.16);
    const oGain = ac.createGain();
    oGain.gain.setValueAtTime(0.45, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(oGain);
    oGain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.18);
  },
  // Лазер: тихое жужжание, играет раз в несколько тиков луча
  laser() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(1150, now + 0.08);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.1);
  },

  plasma() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.13);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.14);
  },
  drill() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.08);
    osc.frequency.linearRampToValueAtTime(80, now + 0.16);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.18);
  },
  reload() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.06);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.10, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.13);
  },
  emptyClick() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.035);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.045);
  },
  overheat() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const nSrc = ac.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + 0.35);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    nSrc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    nSrc.start(now);
    nSrc.stop(now + 0.37);
  },
  // Плазменный автомат жабы-штурмовика: короткий низкий выстрел; vol — по расстоянию до Василия
  toadPlasma(vol = 1) {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.09 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.1);
  },
  // Пуск ракеты: шипящий выхлоп
  rocketLaunch(vol = 1) {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const nSrc = ac.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + 0.32);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.2 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    nSrc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    nSrc.start(now);
    nSrc.stop(now + 0.35);
  },
  // Взрыв ракеты: глухой удар и рокот
  explosion(vol = 1) {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const nSrc = ac.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 0.55);
    const nGain = ac.createGain();
    nGain.gain.setValueAtTime(0.45 * vol, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    nSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.out);
    nSrc.start(now);
    nSrc.stop(now + 0.62);
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.4);
    const oGain = ac.createGain();
    oGain.gain.setValueAtTime(0.5 * vol, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(oGain);
    oGain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.43);
  },
  bossSwing(heavy = false) {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    // Тяжёлый свист ржавого тесака
    const nSrc = ac.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.28);
    const nGain = ac.createGain();
    nGain.gain.setValueAtTime(0.32, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    nSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.out);
    nSrc.start(now);
    nSrc.stop(now + 0.31);

    if (heavy) {
      // Глухой удар о землю
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(72, now);
      osc.frequency.exponentialRampToValueAtTime(26, now + 0.32);
      const oGain = ac.createGain();
      oGain.gain.setValueAtTime(0.55, now);
      oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(oGain);
      oGain.connect(this.out);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  },
  // Шлепок-«чпок» жабьего языка: короткий влажный свист вниз и щелчок
  tongue() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.14);
    const nSrc = ac.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    const nGain = ac.createGain();
    nGain.gain.setValueAtTime(0.12, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    nSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.out);
    nSrc.start(now);
    nSrc.stop(now + 0.06);
  },
  ricochet() {
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    const startFreq = 1800 + Math.random() * 900;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.07);
  }
};

// Множитель количества частиц и искр (настройка «Частицы»: 1 — много, 0.4 — мало)
let particleScale = 1;

function spawnDirectionalSparks(x, y, baseAngle, spread, count, color, speedMin = 6, speedMax = 14, life = 14) {
  count = count > 0 ? Math.max(1, Math.round(count * particleScale)) : 0;
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (Math.random() - 0.5) * spread;
    const spd = speedMin + Math.random() * (speedMax - speedMin);
    particles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      radius: 1.5 + Math.random() * 1.5,
      color: Math.random() < 0.35 ? '#ffffff' : color,
      type: 'spark',
      drag: 0.88,
      life: Math.floor(life * (0.7 + Math.random() * 0.5)),
      maxLife: life
    });
  }
}

function spawnGunpowderSmoke(x, y, baseAngle, count = 5) {
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (Math.random() - 0.5) * 0.55;
    const spd = 1.2 + Math.random() * 3.4;
    const maxL = 22 + Math.floor(Math.random() * 14);
    particles.push({
      x: x + Math.cos(a) * (4 + i * 3),
      y: y + Math.sin(a) * (4 + i * 3),
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - 0.25,
      radius: 5 + Math.random() * 4,
      color: i % 2 === 0 ? '#cbd5e1' : '#94a3b8',
      type: 'smoke',
      drag: 0.92,
      life: maxL,
      maxLife: maxL
    });
  }
}

function spawnShellCasing(x, y, weaponAngle, shellType = 'shotgun') {
  const ejectAngle = weaponAngle + Math.PI * (0.55 + (Math.random() - 0.5) * 0.22);
  const spd = 2.4 + Math.random() * 2.0;
  shellCasings.push({
    x: x - Math.cos(weaponAngle) * 16,
    y: y - Math.sin(weaponAngle) * 16,
    vx: Math.cos(ejectAngle) * spd,
    vy: Math.sin(ejectAngle) * spd,
    z: 14,
    vz: 2.2 + Math.random() * 1.4,
    rot: weaponAngle + Math.random() * Math.PI,
    vRot: (Math.random() - 0.5) * 0.45,
    type: shellType,
    life: 210,
    maxLife: 210
  });
  if (shellCasings.length > 45) {
    shellCasings.shift();
  }
}

function shootPlayerWeapon() {
  if (shootCooldown > 0) return;

  const wKey = player.currentWeapon;
  if (!wKey || !isEquipped(wKey)) {
    // Всё оружие оставлено у Михалыча — напомнить, но не чаще раза в пару секунд
    if (!wKey && !(player.unarmedHintCd > 0)) {
      player.unarmedHintCd = 120;
      addFloatingText(player.x - 60, player.y - 40, t('unarmed'), '#94a3b8');
    }
    return;
  }

  // Если оружие сейчас перезаряжается — ждём окончания перезарядки. Наган заряжается по патрону:
  // выстрел прерывает зарядку, если в барабане уже что-то есть
  if (player.reloadingWeapon === wKey) {
    if (wKey !== 'nagant' || player.ammo.nagant.clip <= 0) return;
    player.reloadingWeapon = null;
    player.reloadTimer = 0;
  }

  const stamMult = player.hasPerk('third_frog_eye') ? 0.75 : 1.0;

  // Exact 2.5D Muzzle Position projected from 3D weapon model
  let muzzle = null;
  if (window.threeCharacter && typeof window.threeCharacter.getMuzzlePosition === 'function') {
    muzzle = window.threeCharacter.getMuzzlePosition(player);
  }
  if (!muzzle) {
    const visualChestY = player.y - 24;
    muzzle = {
      x: player.x + Math.cos(player.angle) * 50,
      y: visualChestY + Math.sin(player.angle) * 23
    };
  }

  // Мастерская Толика: гранатомёт, разрядник, ЭМИ-граната; после ЭМИ плазма, лазер и разрядник молчат
  if (window.Workshop) {
    if (window.Workshop.jammed(wKey)) {
      shootCooldown = 30;
      return;
    }
    if (wKey === 'launcher' || wKey === 'arc' || wKey === 'emp') {
      shootCooldown = window.Workshop.fire(wKey, muzzle);
      updateHUD(true);
      return;
    }
  }

  // =========================================================================
  // [4] БИТА С ГВОЗДЯМИ (Рукопашное оружие, старт игры, тратит 18 выносливости)
  // =========================================================================
  if (wKey === 'bat') {
    const batStamCost = 18 * stamMult * (upg('bat_tape') ? 0.7 : 1);
    const isExhausted = player.stamina < batStamCost;

    if (isExhausted) {
      player.stamina = Math.max(0, player.stamina - 6);
      shootCooldown = 36;
      addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? 'ВЫДОХСЯ! (-УРОН)' : 'EXHAUSTED!', '#f97316');
    } else {
      player.stamina = Math.max(0, player.stamina - batStamCost);
      shootCooldown = WEAPONS.bat.cooldown;
    }

    if (window.threeCharacter && typeof window.threeCharacter.triggerSwing === 'function') {
      window.threeCharacter.triggerSwing();
    }

    const batReach = 84;
    let hitAny = false;
    let hitKind = null;

    muzzleFlashes.push({
      x: player.x,
      y: player.y - 18,
      angle: player.angle,
      type: 'bat_slash',
      life: 9,
      maxLife: 9,
      scale: isExhausted ? 0.78 : 1.05
    });

    enemies.forEach(e => {
      const dist = Math.hypot(e.x - player.x, e.y - (player.y - 16));
      if (dist < batReach + e.radius) {
        const toEnemyAngle = Math.atan2(e.y - (player.y - 16), e.x - player.x);
        let angleDiff = Math.abs(toEnemyAngle - player.angle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff < 1.18) {
          hitAny = true;
          let dmg = weaponDmg('bat') * (player.isDrunk ? 1.8 : 1.0);
          if (isExhausted) dmg *= 0.45;
          const isCrit = !isExhausted && (Math.random() < player.critChance);
          if (isCrit) dmg *= player.critMult;

          const hit = damageEnemy(e, dmg, 'bat', player.x, player.y);
          e.hitFlash = 6;
          // Звук удара: по броне (наплечники, золотая кожа, щит) звенит, по громиле — тяжело, по штурмовику
          // и ракетчику — со стуком биты, по остальным жабам — со шлепком; из нескольких — самый тяжёлый
          const kind = hit.armored || hit.shielded || hit.invuln || e.type === 'boss' || e.type === 'pounder' ? 'armor'
            : e.type === 'brute' ? 'heavy' : e.type === 'stormtrooper' || e.type === 'rocketeer' ? 'knock' : 'flesh';
          if (BAT_HIT_RANK.indexOf(kind) > BAT_HIT_RANK.indexOf(hitKind)) hitKind = kind;

          // Отбрасывание жабы шипованной битой (чтобы можно было держать дистанцию в стартовой зоне!)
          const kb = (e.type === 'boss' || e.type === 'pounder') ? 0 : (isExhausted ? 7 : (e.type === 'brute' ? 8 : 20));
          const kx = e.x + Math.cos(toEnemyAngle) * kb;
          const ky = e.y + Math.sin(toEnemyAngle) * kb;
          if (!checkWalkCollision(kx, ky, e.radius, footDY(e))) {
            e.x = kx;
            e.y = ky;
          }

          spawnDirectionalSparks(e.x, e.y - 8, toEnemyAngle, 1.0, 9, '#ef4444', 4, 11, 12);
          createParticles(e.x, e.y, '#22c55e', 6);
          addFloatingText(e.x, e.y - 20, damageLabel(hit, `${isCrit ? 'КРИТ! ' : ''}-${Math.round(hit.dealt)}`), isCrit ? '#ef4444' : '#f8fafc');
        }
      }
    });

    SoundFX.batSwing(hitAny ? hitKind || 'flesh' : false);
    if (hitAny) {
      cameraKickX += Math.cos(player.angle) * 3.2;
      cameraKickY += Math.sin(player.angle) * 3.2;
    }
    updateHUD();
    return;
  }

  // =========================================================================
  // [5] ПИСТОЛЕТ МАКАРОВА (ПМ 9×18, магазин 8 патр., перезарядка R)
  // =========================================================================
  if (wKey === 'makarov') {
    const pmAmmo = player.ammo.makarov;
    if (pmAmmo.clip <= 0) {
      startReload();
      shootCooldown = 14;
      return;
    }

    pmAmmo.clip--;
    shootCooldown = WEAPONS.makarov.cooldown;
    SoundFX.makarov();
    if (window.threeCharacter) {
      window.threeCharacter.triggerRecoil(0.65);
    }

    const spread = drunkAim() ? 0.14 : 0.035;
    const angle = player.angle + (Math.random() - 0.5) * spread;
    const speed = 25;
    const isCrit = Math.random() < (player.critChance + 0.05);
    let dmg = weaponDmg('makarov') * (player.isDrunk ? 1.6 : 1.0) * (isCrit ? player.critMult : 1.0);

    cameraKickX -= Math.cos(angle) * 2.1;
    cameraKickY -= Math.sin(angle) * 2.1;

    muzzleFlashes.push({
      x: muzzle.x,
      y: muzzle.y,
      angle: angle,
      type: 'makarov',
      life: 3,
      maxLife: 3,
      scale: 0.72 + Math.random() * 0.15
    });

    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      prevX: muzzle.x,
      prevY: muzzle.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: angle,
      speed: speed,
      drag: 0.992,
      radius: 3.0,
      damage: dmg,
      isCrit: isCrit,
      weaponType: 'makarov',
      trailLen: 30,
      life: 34,
      maxLife: 34,
      color: isCrit ? '#ef4444' : '#fde047'
    });

    spawnDirectionalSparks(muzzle.x, muzzle.y, angle, 0.35, 5, '#fbbf24', 5, 12, 9);
    spawnGunpowderSmoke(muzzle.x, muzzle.y, angle, 2);
    spawnShellCasing(muzzle.x, muzzle.y, player.angle, 'makarov');

    if (pmAmmo.clip === 0 && pmAmmo.reserve > 0) {
      setTimeout(() => {
        if (player.currentWeapon === 'makarov' && player.ammo.makarov.clip === 0) {
          startReload();
        }
      }, 220);
    }
    updateHUD(true);
    return;
  }

  // =========================================================================
  // [5б] НАГАН ЗИНЫ (7,62, барабан на 7, пуля навылет; гильзы остаются в барабане)
  // =========================================================================
  if (wKey === 'nagant') {
    const nAmmo = player.ammo.nagant;
    if (nAmmo.clip <= 0) {
      startReload();
      shootCooldown = 14;
      return;
    }
    nAmmo.clip--;
    shootCooldown = WEAPONS.nagant.cooldown;
    SoundFX.nagant();
    if (window.threeCharacter) window.threeCharacter.triggerRecoil(0.9);

    const spread = drunkAim() ? 0.12 : 0.025;
    const angle = player.angle + (Math.random() - 0.5) * spread;
    const speed = 27;
    const isCrit = Math.random() < (player.critChance + 0.05);
    const dmg = weaponDmg('nagant') * (player.isDrunk ? 1.6 : 1.0) * (isCrit ? player.critMult : 1.0);
    cameraKickX -= Math.cos(angle) * 3;
    cameraKickY -= Math.sin(angle) * 3;
    muzzleFlashes.push({ x: muzzle.x, y: muzzle.y, angle, type: 'makarov', life: 4, maxLife: 4, scale: 0.95 + Math.random() * 0.15 });
    bullets.push({
      x: muzzle.x, y: muzzle.y, prevX: muzzle.x, prevY: muzzle.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle, speed, drag: 0.993,
      radius: 3.2, damage: dmg, isCrit, weaponType: 'nagant', trailLen: 36, life: 36, maxLife: 36,
      pierce: WEAPONS.nagant.pierce, color: isCrit ? '#ef4444' : '#fde047'
    });
    spawnDirectionalSparks(muzzle.x, muzzle.y, angle, 0.4, 7, '#fbbf24', 5, 13, 10);
    spawnGunpowderSmoke(muzzle.x, muzzle.y, angle, 3);
    if (nAmmo.clip === 0 && nAmmo.reserve > 0) {
      setTimeout(() => {
        if (player.currentWeapon === 'nagant' && player.ammo.nagant.clip === 0) startReload();
      }, 260);
    }
    updateHUD(true);
    return;
  }

  // =========================================================================
  // [6] УДАРНАЯ ДРЕЛЬ ИЭ-1035 (Контактный бур, тратит 4.5 выносливости за тик)
  // =========================================================================
  if (wKey === 'drill') {
    const drillStamCost = 4.5 * stamMult * (upg('drill_coil') ? 0.65 : 1);
    if (player.stamina < drillStamCost) {
      shootCooldown = 18;
      SoundFX.emptyClick();
      addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? 'НЕТ ВЫНОСЛИВОСТИ ДЛЯ ДРЕЛИ!' : 'NO STAMINA FOR DRILL!', '#f97316');
      return;
    }

    player.stamina = Math.max(0, player.stamina - drillStamCost);
    shootCooldown = WEAPONS.drill.cooldown;
    const drillReach = 88;
    SoundFX.drill();
    if (window.threeCharacter) {
      window.threeCharacter.triggerRecoil(0.45);
    }

    cameraKickX += (Math.random() - 0.5) * 3.0;
    cameraKickY += (Math.random() - 0.5) * 3.0;

    muzzleFlashes.push({
      x: muzzle.x,
      y: muzzle.y,
      angle: player.angle,
      type: 'drill',
      life: 5,
      maxLife: 5,
      scale: 1.0
    });

    spawnDirectionalSparks(muzzle.x, muzzle.y, player.angle, 1.35, 14, '#fbbf24', 5, 13, 13);

    let drillHit = false;
    enemies.forEach(e => {
      const dist = Math.hypot(e.x - player.x, e.y - (player.y - 20));
      if (dist < drillReach + e.radius) {
        const toEnemyAngle = Math.atan2(e.y - (player.y - 20), e.x - player.x);
        let angleDiff = Math.abs(toEnemyAngle - player.angle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff < 1.05) {
          const dmg = weaponDmg('drill') * (player.isDrunk ? 1.8 : 1.0);
          const hit = damageEnemy(e, dmg, 'drill', player.x, player.y);
          e.hitFlash = 5;
          drillHit = true;
          spawnDirectionalSparks(e.x, e.y - 8, toEnemyAngle, 1.1, 10, '#f97316', 5, 12, 12);
          createParticles(e.x, e.y, '#22c55e', 6);
          addFloatingText(e.x, e.y - 20, damageLabel(hit, `-${Math.round(hit.dealt)} БУР`), '#eab308');
        }
      }
    });
    if (drillHit) SoundFX.drillHit();
    updateHUD();
    return;
  }

  // =========================================================================
  // [9] ЛАЗЕРНЫЙ БЛАСТЕР (карта Долбильщика: луч, 30 с огня, 5 с перезарядки накопителя)
  // =========================================================================
  if (wKey === 'laser') {
    if (player.laserRecharge > 0) {
      shootCooldown = 16;
      SoundFX.emptyClick();
      return;
    }
    shootCooldown = WEAPONS.laser.cooldown;
    player.laserCharge -= WEAPONS.laser.cooldown;
    if (player.laserCharge <= 0) rechargeLaser();
    fireLaserBeam(muzzle);
    updateHUD(true);
    return;
  }

  // =========================================================================
  // [8] ТРОФЕЙНЫЙ ПЛАЗМАГАН (Бесконечный боезапас, но перегревается при 100%)
  // =========================================================================
  if (wKey === 'plasma') {
    if (player.plasmaOverheated) {
      shootCooldown = 16;
      SoundFX.emptyClick();
      addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? '⚡ ПЕРЕГРЕВ КАТУШКИ!' : '⚡ OVERHEATED!', '#ef4444');
      return;
    }

    shootCooldown = WEAPONS.plasma.cooldown;
    SoundFX.plasma();
    if (window.threeCharacter) {
      window.threeCharacter.triggerRecoil(0.7);
    }

    player.plasmaHeat = Math.min(100, player.plasmaHeat + (upg('pl_radiator') ? 11 : 16));
    if (player.plasmaHeat >= 100) {
      player.plasmaOverheated = true;
      player.plasmaOverheatTimer = 180; // 3.0 сек аварийного охлаждения
      SoundFX.overheat();
      spawnGunpowderSmoke(muzzle.x, muzzle.y, player.angle, 9);
      addFloatingText(player.x, player.y - 42, currentLang === 'ru' ? '🔥 ПЕРЕГРЕВ ПЛАЗМЫ (3 СЕК)!' : '🔥 PLASMA OVERHEAT (3s)!', '#ef4444');
    }

    let dmg = weaponDmg('plasma') * (player.isDrunk ? 1.5 : 1.0);
    let isCrit = Math.random() < player.critChance;
    if (isCrit) dmg *= player.critMult;

    const angle = player.angle + (Math.random() - 0.5) * (drunkAim() ? 0.16 : 0.025);
    const speed = 22;

    cameraKickX -= Math.cos(angle) * 1.8;
    cameraKickY -= Math.sin(angle) * 1.8;

    muzzleFlashes.push({
      x: muzzle.x,
      y: muzzle.y,
      angle: angle,
      type: 'plasma',
      life: 3,
      maxLife: 3,
      scale: 1.0 + Math.random() * 0.2
    });

    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      prevX: muzzle.x,
      prevY: muzzle.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: angle,
      speed: speed,
      drag: 1.0,
      radius: 5.5,
      damage: dmg,
      isCrit: isCrit,
      weaponType: 'plasma',
      trailLen: 34,
      life: 44,
      maxLife: 44,
      color: isCrit ? '#f43f5e' : '#38bdf8'
    });

    spawnDirectionalSparks(muzzle.x, muzzle.y, angle, 0.65, 7, '#38bdf8', 5, 11, 10);
    if (Math.random() < 0.5) {
      spawnShellCasing(muzzle.x, muzzle.y, player.angle, 'plasma');
    }
    updateHUD(true);
    return;
  }

  // =========================================================================
  // [7] ДЕДОВСКИЙ ОБРЕЗ 12 КАЛИБРА (2 патрона в стволах, перезарядка R)
  // =========================================================================
  const sgAmmo = player.ammo.shotgun;
  if (sgAmmo.clip <= 0) {
    startReload();
    shootCooldown = 18;
    return;
  }

  sgAmmo.clip--;
  shootCooldown = WEAPONS.shotgun.cooldown;
  SoundFX.shotgun();
  if (window.threeCharacter) {
    window.threeCharacter.triggerRecoil(1.25);
  }

  cameraKickX -= Math.cos(player.angle) * 4.5;
  cameraKickY -= Math.sin(player.angle) * 4.5;

  muzzleFlashes.push({
    x: muzzle.x,
    y: muzzle.y,
    angle: player.angle,
    type: 'shotgun',
    life: 4,
    maxLife: 4,
    scale: 1.05 + Math.random() * 0.25
  });

  const pellets = WEAPONS.shotgun.pellets;
  const basePelletDmg = WEAPONS.shotgun.dmg(player.baseDamage) * (player.isDrunk ? 1.85 : 1.0);

  for (let p = 0; p < pellets; p++) {
    const conePos = (p / (pellets - 1)) - 0.5;
    const jitter = (Math.random() - 0.5) * 0.08;
    const spreadSpan = drunkAim() ? 0.40 : 0.24;
    const pelletAngle = player.angle + conePos * spreadSpan + jitter;
    const speed = 23 + Math.random() * 5.5;
    let isCrit = Math.random() < player.critChance;
    let dmg = basePelletDmg * (isCrit ? player.critMult : 1.0);

    bullets.push({
      x: muzzle.x + Math.cos(pelletAngle) * 4,
      y: muzzle.y + Math.sin(pelletAngle) * 4,
      ox: muzzle.x, // откуда вылетела: урон дроби падает с расстоянием
      oy: muzzle.y,
      prevX: muzzle.x,
      prevY: muzzle.y,
      vx: Math.cos(pelletAngle) * speed,
      vy: Math.sin(pelletAngle) * speed,
      angle: pelletAngle,
      speed: speed,
      drag: 0.965,
      radius: 3.2,
      damage: dmg,
      isCrit: isCrit,
      weaponType: 'shotgun',
      trailLen: 32 + Math.random() * 14,
      life: 16, // ~300 px: дальше дробь уже не летит
      maxLife: 16,
      color: isCrit ? '#ef4444' : (player.isDrunk ? '#f97316' : '#fde047')
    });
  }

  const wadAngle = player.angle + (Math.random() - 0.5) * 0.12;
  bullets.push({
    x: muzzle.x,
    y: muzzle.y,
    prevX: muzzle.x,
    prevY: muzzle.y,
    vx: Math.cos(wadAngle) * 11.5,
    vy: Math.sin(wadAngle) * 11.5,
    angle: wadAngle,
    speed: 11.5,
    drag: 0.90,
    radius: 2.5,
    damage: 2,
    isCrit: false,
    weaponType: 'wad',
    trailLen: 10,
    life: 15,
    maxLife: 15,
    color: '#a8a29e'
  });

  spawnDirectionalSparks(muzzle.x, muzzle.y, player.angle, 0.52, 9, '#fb923c', 7, 16, 12);
  spawnGunpowderSmoke(muzzle.x, muzzle.y, player.angle, 5);
  spawnShellCasing(muzzle.x, muzzle.y, player.angle, 'shotgun');

  if (sgAmmo.clip === 0 && sgAmmo.reserve > 0) {
    setTimeout(() => {
      if (player.currentWeapon === 'shotgun' && player.ammo.shotgun.clip === 0) {
        startReload();
      }
    }, 260);
  }
  updateHUD(true);
}

// Насколько 3D-модель выступает за «пятно» здания на земле (замерено по непрозрачной области спрайтов,
// минус ~6 px прозрачной кромки). Крыша рисуется выше пятна — без этого по ней можно было ходить
const BUILDING_ROOF_OVERHANG = {
  khrushchevka: { top: 18, side: 3 },
  brezhnevka: { top: 31, side: 0 },
  boiler_house: { top: 31, side: 3 },
  garage: { top: 9, side: 0 },
  fence_wall: { top: 23, side: 0 }
};

// Насколько модель дома поднимается над его пятном (замерено по силуэтам: до 94 px у брежневки)
const BUILDING_SPRITE_TOP = { panel: 100, boiler_house: 100, garage: 16 };
function buildingSpriteTop(b) {
  if (b.type === 'factory') return Math.round(pzFrame(b.model, 0, 0, b.w).rise);
  return BUILDING_SPRITE_TOP[b.type] || 0;
}

function buildingCollisionRect(b) {
  const o = BUILDING_ROOF_OVERHANG[houseKind(b)] || { top: 0, side: 0 };
  const k = houseScale(b);
  return { x: b.x - o.side * k, y: b.y - o.top * k, w: b.w + o.side * 2 * k, h: b.h + o.top * k };
}

// Дома и гаражи сталкиваются по силуэту своей 3D-модели (threeProps.silhouetteRects): прямоугольник
// «пятна» с выступом крыши был шире модели у котельной и гаражей — врезались в пустоту рядом.
// Пока модель грузится — по пятну (b.col)
const SILHOUETTE_TYPES = new Set(['panel', 'boiler_house', 'garage', 'factory']);
function buildingShape(b) {
  if (!SILHOUETTE_TYPES.has(b.type) || !window.threeProps || !window.threeProps.silhouetteRects) return null;
  return window.threeProps.silhouetteRects(b);
}

// Модели Промзоны грузятся при входе в неё, и пока силуэт цеха не посчитан, коллизия — только пятно на земле.
// Жаба, родившаяся между пятном и крышей, оказалась бы в стене — спавн проверяет всю высоту модели над пятном
function insideFactoryShape(x, y) {
  return buildings.some(b => b.type === 'factory' && !b.noCollide &&
    x > b.x - 20 && x < b.x + b.w + 20 && y < b.y + b.h + 20 && y > b.y - buildingSpriteTop(b) - 20);
}

// Здания (с крышей): блокируют и персонажей, и пули. Возвращает прямоугольник здания или null
function checkBuildingCollision(x, y, radius) {
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (b.noCollide) continue; // козловой кран, эстакада труб: под ними проходят
    if (b.cols === undefined) {
      const shape = buildingShape(b);
      if (shape) {
        b.cols = shape;
        // Габарит всех прямоугольников силуэта — чтобы не перебирать их у далёких домов
        const x1 = Math.min(...shape.map(r => r.x)), y1 = Math.min(...shape.map(r => r.y));
        b.colBox = { x: x1, y: y1, w: Math.max(...shape.map(r => r.x + r.w)) - x1, h: Math.max(...shape.map(r => r.y + r.h)) - y1 };
      } else if (!SILHOUETTE_TYPES.has(b.type)) b.cols = null;
    }
    if (b.cols) {
      const bb = b.colBox;
      if (x + radius <= bb.x || x - radius >= bb.x + bb.w || y + radius <= bb.y || y - radius >= bb.y + bb.h) continue;
      for (let j = 0; j < b.cols.length; j++) {
        const r = b.cols[j];
        if (x + radius > r.x && x - radius < r.x + r.w && y + radius > r.y && y - radius < r.y + r.h) return r;
      }
      continue;
    }
    const r = b.col || b;
    if (x + radius > r.x && x - radius < r.x + r.w &&
        y + radius > r.y && y - radius < r.y + r.h) {
      return r;
    }
  }
  return null;
}

// --- Препятствия для ходьбы: машины, баки, ящики, ларёк, деревья, фонари, скамейки, урны, кусты ---
// Пули их не учитывают (стреляем поверх), персонажи — обходят. Хранятся в сетке 128 px.
const OBSTACLE_CELL = 128;
let obstacleGrid = new Map();

// o: эллипс {x, y, rx, ry, rot} (круг при rx === ry) или прямоугольник {rect: true, x1, y1, x2, y2}
function addObstacle(o) {
  const ext = o.rect ? 0 : Math.max(o.rx, o.ry);
  const x1 = o.rect ? o.x1 : o.x - ext;
  const x2 = o.rect ? o.x2 : o.x + ext;
  const y1 = o.rect ? o.y1 : o.y - ext;
  const y2 = o.rect ? o.y2 : o.y + ext;
  for (let cx = Math.floor(x1 / OBSTACLE_CELL); cx <= Math.floor(x2 / OBSTACLE_CELL); cx++) {
    for (let cy = Math.floor(y1 / OBSTACLE_CELL); cy <= Math.floor(y2 / OBSTACLE_CELL); cy++) {
      const key = cx * 4096 + cy;
      if (!obstacleGrid.has(key)) obstacleGrid.set(key, []);
      obstacleGrid.get(key).push(o);
    }
  }
}

function removeObstacle(o) {
  const ext = o.rect ? 0 : Math.max(o.rx, o.ry);
  const x1 = o.rect ? o.x1 : o.x - ext;
  const x2 = o.rect ? o.x2 : o.x + ext;
  const y1 = o.rect ? o.y1 : o.y - ext;
  const y2 = o.rect ? o.y2 : o.y + ext;
  for (let cx = Math.floor(x1 / OBSTACLE_CELL); cx <= Math.floor(x2 / OBSTACLE_CELL); cx++) {
    for (let cy = Math.floor(y1 / OBSTACLE_CELL); cy <= Math.floor(y2 / OBSTACLE_CELL); cy++) {
      const cell = obstacleGrid.get(cx * 4096 + cy);
      if (!cell) continue;
      const i = cell.indexOf(o);
      if (i >= 0) cell.splice(i, 1);
    }
  }
}

function obstacleHits(o, x, y, r) {
  if (o.rect) return x + r > o.x1 && x - r < o.x2 && y + r > o.y1 && y - r < o.y2;
  let dx = x - o.x;
  let dy = y - o.y;
  if (o.rot) {
    const c = Math.cos(o.rot), s = Math.sin(o.rot);
    const lx = dx * c + dy * s;
    dy = -dx * s + dy * c;
    dx = lx;
  }
  const ax = o.rx + r, ay = o.ry + r;
  return (dx * dx) / (ax * ax) + (dy * dy) / (ay * ay) < 1;
}

// Точка x, y персонажа — середина фигуры, а ступни нарисованы ниже: у Василия на ~31 px, у жаб на ~20,
// у громилы на ~38, у босса ровно в ней. Ходьба проверяется по ступням: иначе сзади персонаж заходил
// ногами на машину или кромку крыши, а спереди не мог подойти вплотную.
const FOOT_DY = { player: 24, grunt: 14, sniper: 12, brute: 30, stormtrooper: 14, rocketeer: 14, boss: 0, pounder: 0 };
function footDY(ent) {
  return ent === player ? FOOT_DY.player : (FOOT_DY[ent.type] || 0);
}

// Возвращает то, во что упёрлись (прямоугольник здания {x, y, w, h} или препятствие), либо null.
// footOffset — на сколько ступни ниже точки (x, y), см. footDY()
function checkWalkCollision(x, y, radius, footOffset = 0) {
  y += footOffset;
  // Сталкиваются ступни, а не плечи: с полным радиусом урна или столб посреди тротуара перекрывали
  // его целиком, а к дому нельзя было подойти вплотную — ступни вставали в 20 px от стены и края крыши
  const feet = radius * 0.5;
  const b = checkBuildingCollision(x, y, feet);
  if (b) return b;
  for (let cx = Math.floor((x - feet) / OBSTACLE_CELL); cx <= Math.floor((x + feet) / OBSTACLE_CELL); cx++) {
    for (let cy = Math.floor((y - feet) / OBSTACLE_CELL); cy <= Math.floor((y + feet) / OBSTACLE_CELL); cy++) {
      const cell = obstacleGrid.get(cx * 4096 + cy);
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) {
        if (obstacleHits(cell[i], x, y, feet)) return cell[i];
      }
    }
  }
  return null;
}

// Нормаль от препятствия к точке (x, y), по которой персонаж скользит вдоль его края
const SLIDE_CORNER = 12;
function walkBlockerNormal(shape, x, y, radius) {
  let nx, ny;
  if (shape.w !== undefined || shape.rect) {
    const pad = radius * 0.5;
    const x1 = (shape.w !== undefined ? shape.x : shape.x1) - pad;
    const y1 = (shape.w !== undefined ? shape.y : shape.y1) - pad;
    const x2 = (shape.w !== undefined ? shape.x + shape.w : shape.x2) + pad;
    const y2 = (shape.w !== undefined ? shape.y + shape.h : shape.y2) + pad;
    // Углы считаем скруглёнными: у самого угла нормаль косая, и персонаж соскальзывает за угол
    const k = Math.min(SLIDE_CORNER, (x2 - x1) / 2, (y2 - y1) / 2);
    nx = x - Math.max(x1 + k, Math.min(x2 - k, x));
    ny = y - Math.max(y1 + k, Math.min(y2 - k, y));
  } else {
    const feet = radius * 0.5;
    const ax = shape.rx + feet, ay = shape.ry + feet;
    let dx = x - shape.x, dy = y - shape.y;
    const c = shape.rot ? Math.cos(shape.rot) : 1, s = shape.rot ? Math.sin(shape.rot) : 0;
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    // Градиент эллипса в его осях, повёрнутый обратно в мир
    const gx = lx / (ax * ax), gy = ly / (ay * ay);
    nx = gx * c - gy * s;
    ny = gx * s + gy * c;
  }
  const len = Math.hypot(nx, ny);
  return len > 1e-6 ? { x: nx / len, y: ny / len } : null;
}

// Шаг с обтеканием препятствий. Раньше X и Y проверялись по отдельности: у круглых препятствий
// (машины, деревья, урны) при шаге наискосок упирались обе оси разом, и обойти препятствие
// можно было, только отойдя назад. Теперь упёршийся шаг проецируется на касательную к краю.
// steer: для врагов — при упоре почти в лоб всё равно обходят и, выбрав сторону, держатся её
// до конца обхода (иначе у середины борта качаются туда-обратно). Игрок в лоб просто стоит
// и сам выбирает, куда повернуть
const SLIDE_COMMIT_FRAMES = 45;
function slideMove(ent, dx, dy, radius, steer = false) {
  const fo = footDY(ent);
  const tx = ent.x + dx, ty = ent.y + dy;
  const hit = checkWalkCollision(tx, ty, radius, fo);
  if (!hit) {
    ent.x = tx;
    ent.y = ty;
    if (ent.slideCommit > 0) ent.slideCommit--;
    return;
  }
  const n = walkBlockerNormal(hit, ent.x, ent.y + fo, radius);
  if (n) {
    const vn = dx * n.x + dy * n.y;
    if (vn < 0) {
      let sdx = dx - n.x * vn, sdy = dy - n.y * vn;
      let forced = false;
      if (steer) {
        const step = Math.hypot(dx, dy);
        const along = sdx * -n.y + sdy * n.x;
        const committed = ent.slideCommit > 0;
        if (Math.abs(along) < step * 0.5 || (committed && Math.sign(along) !== ent.slideSide)) {
          const side = committed ? ent.slideSide
            : (Math.abs(along) > step * 0.05 ? Math.sign(along) : (ent.slideSide || 1));
          ent.slideSide = side;
          ent.slideCommit = SLIDE_COMMIT_FRAMES;
          sdx = -n.y * side * step * 0.6;
          sdy = n.x * side * step * 0.6;
          forced = true;
        }
      }
      const sx = ent.x + sdx, sy = ent.y + sdy;
      if (Math.abs(sdx) + Math.abs(sdy) > 0.05 && !checkWalkCollision(sx, sy, radius, fo)) {
        ent.x = sx;
        ent.y = sy;
        return;
      }
      // С этой стороны тупик — в следующий раз обходим с другой
      if (forced) ent.slideSide = -ent.slideSide;
    }
  }
  // Касательная упёрлась во второе препятствие — по осям, как раньше
  if (!checkWalkCollision(tx, ent.y, radius, fo)) ent.x = tx;
  if (!checkWalkCollision(ent.x, ty, radius, fo)) ent.y = ty;
}

// --- БИО-ЛУЖИ КВАКО-ГНЁЗД ---
// Слизь жжёт и замедляет Василия, а жаб в ней подлечивает. По пять луж в каждом угловом гнезде;
// места одинаковы при каждом запуске и не лезут под дома, тайники и в центр логова Мясника.
// Спрайты — assets/sprites/props/bio_puddle_*.webp (tools/make_bio_puddle_sprites.py)
const BIO_PUDDLE_SPRITES = ['bio_puddle_eggs', 'bio_puddle_vents', 'bio_puddle_pod'];
const BIO_PUDDLE_W = 170;             // ширина спрайта в мире, px
const BIO_PUDDLE_RX = 56;             // зона слизи — эллипс в центре спрайта
const BIO_PUDDLE_RY = 38;
const BIO_PUDDLE_SLOW = 0.6;          // скорость Василия в слизи
const BIO_PUDDLE_DPS = 6;             // кислота, HP в секунду
const BIO_PUDDLE_HEAL = 0.015;        // жабы лечатся: доля здоровья в секунду
const BIO_PUDDLES_PER_NEST = 7;
// Угловые полосы карты между краем и кольцевыми дорогами (MAP.BANDS)
const BIO_NESTS = (() => {
  const [a, , , d] = MAP.BANDS;
  const r = (bx, by) => ({ x: bx[0], y: by[0], w: bx[1] - bx[0], h: by[1] - by[0] });
  return [r(a, a), r(d, a), r(a, d), r(d, d)];
})();
let bioPuddles = [];
// Шлам-пруды Промзоны: западная полоса между проспектом и южной кольцевой (район pz_sludge)
const SLUDGE_PONDS = [{ x: 0, y: MAP.MAIN.pos + MAP.MAIN.size, w: MAP.ROADS[0].pos, h: MAP.ROADS[2].pos - (MAP.MAIN.pos + MAP.MAIN.size) }];

function generateBioPuddles() {
  bioPuddles = [];
  (currentLocation === 'promzona' ? SLUDGE_PONDS : BIO_NESTS).forEach((z, zi) => {
    let seed = 1234567 + zi * 7919; // свой генератор у каждого гнезда — раскладка не плывёт
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let placed = 0;
    for (let tries = 0; tries < 300 && placed < BIO_PUDDLES_PER_NEST; tries++) {
      const x = Math.round(z.x + 110 + rnd() * (z.w - 220));
      const y = Math.round(z.y + 110 + rnd() * (z.h - 220));
      if (checkBuildingCollision(x, y, 70)) continue;
      if (containers.some(c => Math.hypot(c.x - x, c.y - y) < 110)) continue;
      if (bioPuddles.some(p => Math.hypot(p.x - x, p.y - y) < 200)) continue;
      if (Math.hypot(x - BOSS_HOME.x, y - BOSS_HOME.y) < 160) continue;
      bioPuddles.push({ x, y, sprite: BIO_PUDDLE_SPRITES[(zi + placed) % BIO_PUDDLE_SPRITES.length], flip: rnd() < 0.5 });
      placed++;
    }
  });
  if (window.environmentRenderer) {
    window.environmentRenderer.bioPuddles = bioPuddles;
    window.environmentRenderer.invalidateGround();
  }
}

// (x, y) — точка ступней
function inBioPuddle(x, y) {
  const out = v => v < MAP.RING_A || v > MAP.RING_B;
  if (currentLocation === 'city' && !(out(x) && out(y))) return false; // в городе лужи только в угловых гнёздах
  for (let i = 0; i < bioPuddles.length; i++) {
    const dx = (x - bioPuddles[i].x) / BIO_PUDDLE_RX;
    const dy = (y - bioPuddles[i].y) / BIO_PUDDLE_RY;
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

// Пузыри над видимыми лужами — чтобы было видно, что слизь живая
function spawnBioPuddleBubbles() {
  if (bioPuddles.length === 0 || Math.random() > 0.35) return;
  const p = bioPuddles[Math.floor(Math.random() * bioPuddles.length)];
  if (Math.abs(p.x - player.x) > viewW * 0.6 || Math.abs(p.y - player.y) > viewH * 0.6) return;
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.8;
  particles.push({
    x: p.x + Math.cos(a) * BIO_PUDDLE_RX * r,
    y: p.y + Math.sin(a) * BIO_PUDDLE_RY * r,
    vx: (Math.random() - 0.5) * 0.2,
    vy: -0.35 - Math.random() * 0.3,
    radius: 1.6 + Math.random() * 2,
    color: Math.random() < 0.5 ? '#a3e635' : '#4ade80',
    drag: 0.99,
    life: 34,
    maxLife: 34
  });
}

// --- РЕПЛИКИ ВАСИЛИЯ ---
// Короткая фраза в облачке над головой — подсказка игроку. Одна и та же — не чаще раза в SPEECH_REPEAT
const SPEECH_FRAMES = 180;     // 3 с на экране
const SPEECH_REPEAT = 600;     // 10 с
const speech = { key: null, t: 0, clock: 0, lastAt: {} };

function sayLine(key) {
  // Реплика — тому Василию, чей ход: свой говорит у себя, товарищу она уходит по сети (src/net.js)
  if (player !== localPlayer) {
    if (window.Net) window.Net.sayTo(player, key);
    return;
  }
  const last = speech.lastAt[key];
  if (last !== undefined && speech.clock - last < SPEECH_REPEAT) return;
  speech.lastAt[key] = speech.clock;
  speech.key = key;
  speech.t = SPEECH_FRAMES;
}

function updateSpeech() {
  speech.clock++;
  if (speech.t > 0) speech.t--;
}

// Облачко как в комиксе: светлое, с чёрной обводкой и хвостиком к голове
function drawSpeech(ctx) {
  if (!speech.key || speech.t <= 0) return;
  const text = t(speech.key);
  ctx.save();
  ctx.globalAlpha = Math.min(1, speech.t / 15, (SPEECH_FRAMES - speech.t) / 6);
  ctx.font = 'italic 700 13px Arial';
  const maxW = 200, lh = 16;
  const lines = [];
  text.split(' ').forEach(word => {
    const last = lines[lines.length - 1];
    if (last && ctx.measureText(last + ' ' + word).width <= maxW) lines[lines.length - 1] = last + ' ' + word;
    else lines.push(word);
  });
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 22;
  const h = lines.length * lh + 14;
  const headX = player.x + 4, headY = player.y - 70;
  const bx = headX + 14 - w * 0.25, by = headY - 22 - h;
  ctx.fillStyle = '#fffbeb';
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 10);
  ctx.fill();
  ctx.stroke();
  // Хвостик: перекрывает кромку облачка и смотрит на голову
  ctx.beginPath();
  ctx.moveTo(bx + w * 0.22, by + h - 1);
  ctx.lineTo(headX + 2, headY - 6);
  ctx.lineTo(bx + w * 0.22 + 14, by + h - 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx + w * 0.22, by + h);
  ctx.lineTo(headX + 2, headY - 6);
  ctx.lineTo(bx + w * 0.22 + 14, by + h);
  ctx.stroke();
  ctx.fillStyle = '#1c1917';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + 11, by + 8 + i * lh));
  ctx.restore();
}

// --- ОГЛУШЕНИЕ ВАСИЛИЯ (удар громилы по земле, землетрясение берсерка-Мясника) ---
// stun — кадры без управления (ни шагу, ни выстрела, ни переката), daze — замедление после него
function dazePlayer(stunFrames, dazeFrames, speedMult) {
  player.stunTimer = Math.max(player.stunTimer || 0, stunFrames);
  player.knockFrames = 0;
  if (!(player.dazeTimer > 0) || speedMult < player.dazeMult) player.dazeMult = speedMult;
  player.dazeTimer = Math.max(player.dazeTimer || 0, dazeFrames);
  addFloatingText(player.x - 30, player.y - 50, currentLang === 'ru' ? '💫 ОГЛУШЁН!' : '💫 DAZED!', '#fbbf24');
  createParticles(player.x, player.y - 30, '#fde68a', 10);
}

function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5;
    const rr = k % 2 ? r * 0.45 : r;
    if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// Над оглушённым Василием кружат звёздочки
function drawDazeStars(ctx) {
  if (!(player.dazeTimer > 0)) return;
  const t = performance.now() / 1000;
  ctx.save();
  for (let k = 0; k < 4; k++) {
    const a = t * 4 + k * Math.PI / 2;
    const front = Math.sin(a) > 0;
    ctx.globalAlpha = front ? 1 : 0.55;
    drawStar(ctx, player.x + Math.cos(a) * 15, player.y - 70 + Math.sin(a) * 5, front ? 5 : 3.6, '#fde047');
  }
  ctx.restore();
}

// Удары по земле бьют по эллипсу вокруг ступней (как и рисуются): по вертикали он сжат, как лужи
const GROUND_SQUASH = 0.62;
function inGroundEllipse(px, py, cx, cy, r) {
  const dx = (px - cx) / r, dy = (py - cy) / (r * GROUND_SQUASH);
  return dx * dx + dy * dy < 1;
}

// Ударные волны по земле: кольцо пыли расходится до radius
let shockwaves = [];
function spawnShockwave(x, y, radius, color, frames) {
  shockwaves.push({ x, y, radius, color, t: 0, life: frames });
  for (let k = 0; k < 18; k++) {
    const a = k / 18 * Math.PI * 2;
    const maxL = 30 + Math.floor(Math.random() * 12);
    particles.push({
      x: x + Math.cos(a) * radius * 0.25,
      y: y + Math.sin(a) * radius * 0.25 * GROUND_SQUASH,
      vx: Math.cos(a) * (3 + radius / 60),
      vy: Math.sin(a) * (3 + radius / 60) * GROUND_SQUASH,
      radius: 6 + Math.random() * 6,
      color: k % 2 ? '#a8a29e' : '#78716c',
      type: 'smoke',
      drag: 0.9,
      life: maxL,
      maxLife: maxL
    });
  }
}

function updateShockwaves() {
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    if (++shockwaves[i].t >= shockwaves[i].life) shockwaves.splice(i, 1);
  }
  if (screenShake.t > 0) {
    screenShake.t--;
    const k = screenShake.t / screenShake.life;
    cameraKickX += (Math.random() - 0.5) * screenShake.amp * k;
    cameraKickY += (Math.random() - 0.5) * screenShake.amp * k;
  }
}

function drawShockwaves(ctx) {
  for (let i = 0; i < shockwaves.length; i++) {
    const s = shockwaves[i];
    const k = s.t / s.life;
    const r = s.radius * (0.15 + 0.85 * (1 - (1 - k) * (1 - k)));
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3 + 9 * (1 - k);
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, r, r * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Тряска экрана на несколько кадров (землетрясение берсерка); короткие толчки — cameraKick
const screenShake = { t: 0, life: 1, amp: 0 };
function shakeScreen(frames, amp) {
  screenShake.t = Math.max(screenShake.t, frames);
  screenShake.life = Math.max(1, screenShake.t);
  screenShake.amp = Math.max(screenShake.t > 0 ? screenShake.amp : 0, amp);
}

// --- ГРОМИЛА БЬЁТ ПО ЗЕМЛЕ ---
// Нечасто, когда Василий рядом: поднимает оба кулака над головой (на земле разгорается круг)
// и бьёт по асфальту. Кто в круге и не в перекате — оглушён и на пару секунд замедлен
const SLAM_RADIUS = 170;
const SLAM_TRIGGER = 160;      // начинает замах, если Василий ближе
const SLAM_WINDUP = 48;
const SLAM_RECOVER = 30;
const SLAM_FIRST = 240;        // первый удар — не раньше 4 с после того, как заметил
const SLAM_COOLDOWN = 720;     // + до 240 случайно: 12–16 с между ударами
const SLAM_STUN = 24;          // 0,4 с без управления
const SLAM_DAZE = 150;         // 2,5 с замедления
const SLAM_DAZE_SPEED = 0.6;

// true — громила занят ударом по земле и никуда не идёт
function updateBruteSlam(e, distToPlayer) {
  if (e.slamCooldown === undefined) e.slamCooldown = SLAM_FIRST + Math.floor(Math.random() * 300);
  if (e.slamCooldown > 0) e.slamCooldown--;
  const S = e.slam;
  if (!S) {
    if (e.slamCooldown > 0 || e.throwState || distToPlayer > SLAM_TRIGGER) return false;
    e.slam = { phase: 'windup', t: 0 };
    return true;
  }
  S.t++;
  if (S.phase === 'windup') {
    // Поднимает оба кулака над головой — те же позы, что при подъёме предмета
    e.throwPose = S.t < 10 ? 'lift1' : (S.t < 20 ? 'lift2' : 'lift3');
    if (S.t >= SLAM_WINDUP) {
      S.phase = 'recover';
      S.t = 0;
      e.throwPose = 'slam';
      bruteSlamImpact(e);
    }
    return true;
  }
  if (S.t >= SLAM_RECOVER) {
    e.slam = null;
    e.throwPose = null;
    e.slamCooldown = SLAM_COOLDOWN + Math.floor(Math.random() * 240);
    return false;
  }
  return true;
}

function bruteSlamImpact(e) {
  const fx = e.x, fy = e.y + footDY(e);
  spawnShockwave(fx, fy, SLAM_RADIUS, '#d6b98c', 28);
  spawnDirectionalSparks(fx, fy, -Math.PI / 2, Math.PI * 2, 12, '#a8a29e', 3, 8, 14);
  SoundFX.bossFx('brute_slam', fx, fy);
  if (Math.hypot(player.x - e.x, player.y - e.y) < 520) {
    cameraKickX += (Math.random() - 0.5) * 22;
    cameraKickY += (Math.random() - 0.5) * 22;
  }
  forEachPlayer(() => {
    const inSafe = Math.hypot(player.x - safeZone.x, player.y - safeZone.y) < safeZone.radius;
    if (!player.isRolling && !inSafe && inGroundEllipse(player.x, player.y + footDY(player), fx, fy, SLAM_RADIUS)) {
      if (!playerDodged()) dazePlayer(SLAM_STUN, SLAM_DAZE, SLAM_DAZE_SPEED);
    }
  });
}

// Круг на земле, пока громила замахивается: кольцо — докуда достанет, заливка — сколько осталось
function drawSlamTelegraphs(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.slam || e.slam.phase !== 'windup') continue;
    if (e.x < viewMinX - 200 || e.x > viewMaxX + 200 || e.y < viewMinY - 200 || e.y > viewMaxY + 200) continue;
    const k = Math.min(1, e.slam.t / SLAM_WINDUP);
    const fx = e.x, fy = e.y + footDY(e);
    ctx.save();
    ctx.fillStyle = `rgba(217, 119, 6, ${0.08 + 0.16 * k})`;
    ctx.beginPath();
    ctx.ellipse(fx, fy, SLAM_RADIUS * k, SLAM_RADIUS * GROUND_SQUASH * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = k > 0.75 ? 'rgba(254, 243, 199, 0.95)' : 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = k > 0.75 ? 3 : 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.ellipse(fx, fy, SLAM_RADIUS, SLAM_RADIUS * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// --- НОВЫЕ ЖАБЫ ПРОМЗОНЫ: ШТУРМОВИК И РАКЕТЧИК (docs/LEVEL2_PROMZONA.md, раздел 3) ---
// Позы оружия — e.gunPose ('aim' | 'fire' | 'rest' | null), их рисует three_enemies.js; дуло — gunMuzzle

// Где дуло на карте сейчас. Пока модель грузится — примерно у правого бедра
// Снайпер: за столько кадров до выстрела вскидывает винтовку; столько кадров держит отдачу
const SN_AIM = 40;
const SN_KICK = 6;

function gunMuzzle(e) {
  const m = window.threeEnemies && window.threeEnemies.getMuzzle(e);
  if (m) return { x: e.x + m.x, y: e.y + m.y, behind: m.behind };
  const a = e.angle || 0;
  return { x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30 - 18, behind: Math.sin(a) < -0.2 };
}

// Громкость выстрелов жаб: чем дальше от Василия, тем тише; за экраном не слышно
// Громкость звука от расстояния — плавно, без обрыва: (1 − d/R)². Половина громкости — на ~530 px, четверть —
// на ~900 (край экрана), тишина — на SOUND_RANGE, уже за краем. Раньше было линейно до 950 px: ограничитель
// громкости выравнивал тихое, и звук на краю экрана просто пропадал
const SOUND_RANGE = 1800;
function soundFalloff(d, range = SOUND_RANGE) {
  const x = Math.min(1, d / range);
  return (1 - x) * (1 - x);
}

// Громкость звука на карте. Сетевой хост считает от ближайшего игрока (иначе звук у далёкого от хоста товарища
// не прозвучал бы вовсе) и помечает место: при воспроизведении громкость пересчитается от своего Василия.
// ownOnly — только для себя (непрерывный треск огня, src/perks_pz.js)
function enemySoundVolume(x, y, ownOnly = false) {
  const own = soundFalloff(Math.hypot(x - localPlayer.x, y - localPlayer.y));
  if (ownOnly || !(window.Net && window.Net.isHost())) return own;
  let v = own;
  players.forEach(p => { if (!p.dead) v = Math.max(v, soundFalloff(Math.hypot(x - p.x, y - p.y))); });
  window.Net.noteSoundAt(x, y, v);
  return v;
}

// Штурмовик держит среднюю дистанцию и ходит боком, стреляя очередями из плазменного автомата.
// После ST_OVERHEAT_SHOTS выстрелов подряд автомат перегревается: ствол светится, из радиаторов пар,
// ST_OVERHEAT кадров стрелять нельзя — окно, чтобы подойти. Нагрев спадает, только если давно не стрелял
const ST_RANGE_MIN = 180;
const ST_RANGE_MAX = 380;
const ST_AIM_RANGE = 460;          // ближе — вскидывает автомат
const ST_BURST = 4;
const ST_SHOT_GAP = 7;
const ST_BURST_PAUSE = 40;         // + до 20 случайно
const ST_FIRST_BURST = 40;         // + до 30: заметив Василия, сначала вскидывает автомат
const ST_OVERHEAT_SHOTS = 12;
const ST_COOL_DELAY = 100;
const ST_OVERHEAT = 240;           // 4 с
const ST_BULLET_SPEED = 10.5;
const ST_SPREAD = 0.07;
const ST_DAMAGE = { 2: 6, 3: 8, 4: 10 };
const ST_STRAFE = 0.65;            // доля скорости, с которой ходит боком

function updateStormtrooper(e, distToPlayer, angle, eSpeed) {
  if (e.heat === undefined) {
    e.heat = 0;
    e.sinceShot = 0;
    e.burstLeft = ST_BURST;
    e.overheat = 0;
    e.shootCooldown = ST_FIRST_BURST + Math.floor(Math.random() * 30);
    e.strafeDir = Math.random() < 0.5 ? 1 : -1;
    e.strafeTimer = 60 + Math.floor(Math.random() * 90);
  }
  e.angle = angle;
  e.sinceShot++;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  // ЭМИ (src/workshop.js): автомат заглох — опущен, жаба пятится от Василия
  if (e.empT > 0) {
    e.gunPose = 'rest';
    if (distToPlayer < ST_RANGE_MIN + 40) slideMove(e, -cos * eSpeed * 0.5, -sin * eSpeed * 0.5, e.radius, true);
    return;
  }

  if (e.overheat > 0) {
    // Остывает: автомат опущен, пар из радиаторов, от Василия пятится
    e.gunPose = 'rest';
    e.overheat--;
    if (e.overheat % 4 === 0) spawnSteam(gunMuzzle(e));
    if (distToPlayer < ST_RANGE_MIN + 40) slideMove(e, -cos * eSpeed * 0.6, -sin * eSpeed * 0.6, e.radius, true);
    if (e.overheat === 0) {
      e.heat = 0;
      e.burstLeft = ST_BURST;
      e.shootCooldown = 20;
    }
    return;
  }
  if (e.sinceShot > ST_COOL_DELAY) e.heat = Math.max(0, e.heat - 0.04);

  // Подходит или отступает к своей дистанции, а в зоне стрельбы ещё и смещается боком
  let mx = 0, my = 0;
  if (distToPlayer > ST_RANGE_MAX) { mx = cos; my = sin; }
  else if (distToPlayer < ST_RANGE_MIN) { mx = -cos; my = -sin; }
  if (--e.strafeTimer <= 0) {
    e.strafeTimer = 80 + Math.floor(Math.random() * 90);
    e.strafeDir = -e.strafeDir;
  }
  if (distToPlayer < ST_RANGE_MAX + 60) {
    mx += -sin * e.strafeDir * ST_STRAFE;
    my += cos * e.strafeDir * ST_STRAFE;
  }
  const len = Math.hypot(mx, my);
  if (len > 0.01) {
    const k = eSpeed * Math.min(1, len) / len;
    const bx = e.x, by = e.y;
    slideMove(e, mx * k, my * k, e.radius, true);
    // Упёрся — в другую сторону
    if (Math.hypot(e.x - bx, e.y - by) < eSpeed * 0.2) e.strafeDir = -e.strafeDir;
  }

  const inRange = distToPlayer < ST_AIM_RANGE;
  e.gunPose = inRange ? 'aim' : null;
  if (e.fireKick > 0) {
    e.fireKick--;
    e.gunPose = 'fire';
  }
  if (e.shootCooldown > 0) e.shootCooldown--;
  if (!inRange || e.shootCooldown > 0) return;

  stormtrooperShot(e);
  e.burstLeft--;
  if (e.burstLeft > 0) {
    e.shootCooldown = ST_SHOT_GAP;
  } else {
    e.burstLeft = ST_BURST;
    e.shootCooldown = ST_BURST_PAUSE + Math.floor(Math.random() * 20);
  }
  if (e.heat >= ST_OVERHEAT_SHOTS) {
    e.overheat = ST_OVERHEAT;
    e.fireKick = 0;
    e.gunPose = 'rest';
    if (enemySoundVolume(e.x, e.y) > 0.2) SoundFX.overheat();
    addFloatingText(e.x, e.y - 58, currentLang === 'ru' ? 'ПЕРЕГРЕВ' : 'OVERHEAT', '#fb923c');
  }
}

function stormtrooperShot(e) {
  e.fireKick = 4;
  e.gunPose = 'fire';
  e.heat++;
  e.sinceShot = 0;
  const m = gunMuzzle(e);
  const a = Math.atan2(player.y - m.y, player.x - m.x) + (Math.random() - 0.5) * 2 * ST_SPREAD;
  enemyBullets.push({
    x: m.x, y: m.y,
    vx: Math.cos(a) * ST_BULLET_SPEED, vy: Math.sin(a) * ST_BULLET_SPEED,
    angle: a, radius: 5, kind: 'plasma',
    damage: ST_DAMAGE[e.tier] || ST_DAMAGE[3]
  });
  muzzleFlashes.push({ x: m.x, y: m.y, angle: a, type: 'toad_plasma', life: 3, maxLife: 3, scale: 0.8 });
  spawnDirectionalSparks(m.x, m.y, a, 0.5, 3, '#f0abfc', 3, 7, 8);
  const vol = enemySoundVolume(e.x, e.y);
  if (vol > 0) SoundFX.toadPlasma(vol);
}

// Пар из радиаторов перегретого автомата
function spawnSteam(m) {
  const maxL = 26 + Math.floor(Math.random() * 10);
  particles.push({
    x: m.x + (Math.random() - 0.5) * 10, y: m.y - 4,
    vx: (Math.random() - 0.5) * 0.8, vy: -1.1 - Math.random() * 0.8,
    radius: 3 + Math.random() * 3,
    color: '#e2e8f0', type: 'smoke', drag: 0.96,
    life: maxL, maxLife: maxL
  });
}

// Раскалённый ствол перегретого автомата: пульсирующее оранжевое свечение у дула
function drawOverheatGlow(ctx, e) {
  if (!(e.overheat > 0)) return;
  const m = gunMuzzle(e);
  const k = Math.min(1, e.overheat / 60);
  const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 70);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55 * k * pulse;
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(m.x, m.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8 * k * pulse;
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(m.x, m.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Ракетчик держится далеко, 350–700 px. Залп — RK_SALVO ракет подряд; перед залпом на земле загораются
// круги мест попадания. Взрывы задевают и жаб. После залпа пусковая пуста RK_RELOAD кадров: ракетчик
// с опущенной пусковой отходит подальше — это окно, чтобы его догнать
const RK_RANGE_MIN = 350;
const RK_RANGE_MAX = 700;
const RK_FIRE_MAX = 780;           // дальше не стреляет
const RK_FIRE_MIN = 120;           // в упор тоже: накроет себя
const RK_SALVO = 4;
const RK_WINDUP = 54;              // круги уже горят, ракетчик целится
const RK_GAP = 18;                 // кадров между ракетами залпа: 4 ракеты ~1,2 с вместе с прицелом
const RK_RELOAD = 2400;            // 40 с
const RK_FIRST = 90;               // + до 90 случайно: первый залп после того, как заметил
const RK_BLAST_R = 70;
const RK_DAMAGE = { 3: 30, 4: 36 };
let rockets = [];
let rocketBlasts = [];             // вспышки взрывов

// Места попадания: первая ракета — туда, где Василий стоит, остальные — вокруг, не в стены
function pickRocketTargets() {
  const px = player.x, py = player.y + footDY(player);
  const list = [{ x: px, y: py }];
  const base = Math.random() * Math.PI * 2;
  for (let i = 1; i < RK_SALVO; i++) {
    let t = null;
    for (let k = 0; k < 6 && !t; k++) {
      const a = base + (i - 1) * (Math.PI * 2 / (RK_SALVO - 1)) + (Math.random() - 0.5) * 0.9;
      const d = 75 + Math.random() * 60;
      const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d * GROUND_SQUASH;
      if (!checkBuildingCollision(x, y, 10)) t = { x, y };
    }
    list.push(t || { x: px + (Math.random() - 0.5) * 40, y: py + (Math.random() - 0.5) * 24 });
  }
  return list;
}

function updateRocketeer(e, distToPlayer, angle, eSpeed) {
  if (!e.rk) e.rk = { phase: 'ready', t: RK_FIRST + Math.floor(Math.random() * 90), shots: 0, targets: null };
  const R = e.rk;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  if (e.fireKick > 0) e.fireKick--;

  if (R.phase === 'reload') {
    // Пусковая пуста: опускает её и уходит от Василия
    e.gunPose = 'rest';
    if (--R.t <= 0) {
      R.phase = 'ready';
      R.t = 30;
    }
    if (distToPlayer < RK_RANGE_MAX + 150) {
      e.angle = angle + Math.PI;
      slideMove(e, -cos * eSpeed, -sin * eSpeed, e.radius, true);
    } else {
      e.angle = angle;
    }
    return;
  }

  e.angle = angle;
  if (R.phase === 'ready') {
    e.gunPose = distToPlayer < RK_FIRE_MAX + 100 ? 'aim' : null;
    const step = distToPlayer > RK_RANGE_MAX ? eSpeed : (distToPlayer < RK_RANGE_MIN ? -eSpeed : 0);
    if (step !== 0) slideMove(e, cos * step, sin * step, e.radius, true);
    if (R.t > 0) R.t--;
    else if (distToPlayer < RK_FIRE_MAX && distToPlayer > RK_FIRE_MIN) {
      R.phase = 'windup';
      R.t = 0;
      R.shots = 0;
      R.targets = pickRocketTargets();
    }
    return;
  }

  // Прицел и залп — стоит на месте
  e.gunPose = e.fireKick > 0 ? 'fire' : 'aim';
  R.t++;
  if (R.phase === 'windup') {
    if (R.t < RK_WINDUP) return;
    R.phase = 'salvo';
    R.t = 0;
  }
  if (R.shots < RK_SALVO && R.t >= R.shots * RK_GAP) {
    launchRocket(e, R.targets[R.shots]);
    R.shots++;
  }
  if (R.shots >= RK_SALVO && R.t >= RK_SALVO * RK_GAP) {
    R.phase = 'reload';
    R.t = RK_RELOAD;
    R.targets = null;
  }
}

// Стрелок потерял Василия: прицел и залп обрываются (выпущенные ракеты долетают), перегрев и перезарядка идут дальше
function updateGunnerIdle(e) {
  e.fireKick = 0;
  if (e.type === 'stormtrooper') {
    if (e.overheat > 0 && --e.overheat === 0) e.heat = 0;
    e.gunPose = e.overheat > 0 ? 'rest' : null;
    return;
  }
  const R = e.rk;
  if (R && (R.phase === 'windup' || R.phase === 'salvo')) {
    R.phase = R.shots > 0 ? 'reload' : 'ready';
    R.t = R.shots > 0 ? RK_RELOAD : RK_FIRST;
    R.targets = null;
  }
  if (R && R.phase === 'reload' && --R.t <= 0) {
    R.phase = 'ready';
    R.t = RK_FIRST;
  }
  e.gunPose = R && R.phase === 'reload' ? 'rest' : null;
}

function launchRocket(e, target) {
  e.fireKick = 6;
  e.gunPose = 'fire';
  const m = gunMuzzle(e);
  const fx = e.x, fy = e.y + footDY(e);
  const d = Math.hypot(target.x - fx, target.y - fy);
  rockets.push({
    mx: m.x, my: m.y, fx, fy, tx: target.x, ty: target.y,
    t: 0, T: Math.round(26 + d / 12), peak: 50 + d * 0.18,
    x: m.x, y: m.y, prevX: m.x, prevY: m.y, gx: fx, gy: fy,
    dmg: RK_DAMAGE[e.tier] || RK_DAMAGE[3]
  });
  const a = Math.atan2(target.y - m.y, target.x - m.x);
  muzzleFlashes.push({ x: m.x, y: m.y, angle: a, type: 'shotgun', life: 4, maxLife: 4, scale: 0.7 });
  spawnGunpowderSmoke(m.x, m.y, a + Math.PI, 4);
  const vol = enemySoundVolume(e.x, e.y);
  if (vol > 0) SoundFX.rocketLaunch(vol);
}

function updateRockets() {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.t++;
    const s = Math.min(1, r.t / r.T);
    r.prevX = r.x;
    r.prevY = r.y;
    // Летит дугой: по экрану — от дула к цели, выше на высоту полёта; тень — от ног ракетчика к цели
    r.x = r.mx + (r.tx - r.mx) * s;
    r.y = r.my + (r.ty - r.my) * s - 4 * r.peak * s * (1 - s);
    r.gx = r.fx + (r.tx - r.fx) * s;
    r.gy = r.fy + (r.ty - r.fy) * s;
    if (r.t % 2 === 0) {
      particles.push({
        x: r.x, y: r.y, vx: (Math.random() - 0.5) * 0.6, vy: -0.3,
        radius: 3 + Math.random() * 2, color: '#a8a29e', type: 'smoke', drag: 0.94, life: 24, maxLife: 24
      });
    }
    if (s >= 1) {
      rocketExplode(r);
      rockets.splice(i, 1);
    }
  }
  for (let i = rocketBlasts.length - 1; i >= 0; i--) {
    if (++rocketBlasts[i].t >= rocketBlasts[i].life) rocketBlasts.splice(i, 1);
  }
}

function rocketExplode(r) {
  // Граната и ЭМИ-граната Василия (src/workshop.js)
  if (r.player) {
    if (window.Workshop) window.Workshop.explode(r);
    return;
  }
  const x = r.tx, y = r.ty;
  spawnShockwave(x, y, RK_BLAST_R + 18, '#fb923c', 22);
  spawnDirectionalSparks(x, y - 6, -Math.PI / 2, Math.PI * 2, 14, '#fde047', 4, 11, 14);
  createParticles(x, y - 6, '#f97316', 12);
  spawnGunpowderSmoke(x, y - 4, -Math.PI / 2, 6);
  rocketBlasts.push({ x, y, t: 0, life: 12 });
  const near = Math.hypot(player.x - x, player.y - y);
  if (near < 600) {
    const kick = 14 * (1 - near / 600);
    cameraKickX += (Math.random() - 0.5) * kick;
    cameraKickY += (Math.random() - 0.5) * kick;
  }
  const vol = enemySoundVolume(x, y);
  if (vol > 0) SoundFX.explosion(vol);

  forEachPlayer(() => {
    const inSafe = Math.hypot(player.x - safeZone.x, player.y - safeZone.y) < safeZone.radius;
    if (!player.isRolling && !inSafe && inGroundEllipse(player.x, player.y + footDY(player), x, y, RK_BLAST_R + player.radius * 0.5)
        && !playerDodged()) {
      player.hp -= armorAbsorb(r.dmg, 'ranged');
      const a = Math.atan2(player.y - y, player.x - x);
      slideMove(player, Math.cos(a) * 18, Math.sin(a) * 18, player.radius);
      createParticles(player.x, player.y, '#ef4444', 10);
      addFloatingText(player.x, player.y - 30, `-${r.dmg}`, '#ef4444');
      if (player.hp <= 0) gameOver();
    }
  });
  // Своих не жалеет: взрыв бьёт и жаб
  enemies.forEach(en => {
    if (en.type === 'boss' || en.type === 'pounder') return;
    if (inGroundEllipse(en.x, en.y + footDY(en), x, y, RK_BLAST_R + en.radius * 0.5)) {
      const hit = damageEnemy(en, r.dmg, 'rocket', x, y);
      en.hitFlash = 6;
      addFloatingText(en.x, en.y - 22, `-${Math.round(hit.dealt)}`, '#fbbf24');
    }
  });
}

// Круги мест попадания — под фигурами: горят с начала прицела, пока ракета не упадёт.
// Внутренний круг растёт по мере подлёта
function drawRocketTargets(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
  const pulse = Math.sin(performance.now() / 1000 * 14);
  const mark = (x, y, k) => {
    if (x < viewMinX - 100 || x > viewMaxX + 100 || y < viewMinY - 100 || y > viewMaxY + 100) return;
    const r = RK_BLAST_R;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.45 * k;
    ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2 + pulse * 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (k > 0) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * k, r * GROUND_SQUASH * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };
  for (let i = 0; i < enemies.length; i++) {
    const R = enemies[i].rk;
    if (!R || !R.targets) continue;
    for (let j = R.shots; j < R.targets.length; j++) mark(R.targets[j].x, R.targets[j].y, 0);
  }
  for (let i = 0; i < rockets.length; i++) {
    if (!rockets[i].player) mark(rockets[i].tx, rockets[i].ty, Math.min(1, rockets[i].t / rockets[i].T));
  }
}

// Ракеты в полёте и вспышки взрывов — поверх фигур
function drawRockets(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
  for (let i = 0; i < rockets.length; i++) {
    const r = rockets[i];
    if (r.x < viewMinX || r.x > viewMaxX || r.y < viewMinY - 300 || r.y > viewMaxY) continue;
    if (r.player) {
      if (window.Workshop) window.Workshop.drawProjectile(ctx, r);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(r.gx, r.gy, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(Math.atan2(r.y - r.prevY, r.x - r.prevX));
    // Факел двигателя, корпус, красная боеголовка
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(251, 146, 60, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(-15 - Math.random() * 6, 0);
    ctx.lineTo(-6, 3);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#57534e';
    ctx.fillRect(-7, -2.5, 12, 5);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(5, -2.5);
    ctx.lineTo(10, 0);
    ctx.lineTo(5, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < rocketBlasts.length; i++) {
    const b = rocketBlasts[i];
    if (b.x < viewMinX - 100 || b.x > viewMaxX + 100 || b.y < viewMinY - 100 || b.y > viewMaxY + 100) continue;
    const k = b.t / b.life;
    const grow = 0.5 + 0.6 * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (1 - k) * 0.9;
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - 10, RK_BLAST_R * grow, RK_BLAST_R * 0.75 * grow, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(b.x, b.y - 12, RK_BLAST_R * 0.35 * (1 - k), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- ТРИ КАРТЫ ПОСЛЕ БОССА (src/cards.js показывает, здесь — что дают) ---
const CARD_EFFECTS = {
  speed: 0.12,          // +12% к бегу
  agilityRoll: 0.3,     // перекат дешевле и чаще на 30%
  agilityDodge: 0.1,    // 10% шанс увернуться от удара, пули, языка, броска
  vitalityHp: 40,       // +40 к максимуму здоровья
  vitalityBandage: 0.5, // бинт лечит на 50% больше
  // Карты Долбильщика (кадры при 60 Гц)
  laserCharge: 1800,    // накопитель бластера: 30 с огня без остановки
  laserRecharge: 300,   // перезарядка накопителя — 5 с (сама, когда сел, или по R)
  dashDist: 600,        // рывок на 15 м (~40 px на метр, как машины города)
  dashFrames: 12,
  dashCooldown: 600,    // 10 с
  regenPerSec: 3,       // гиперрегенерация: по 3 здоровья в секунду
  regenFrames: 600,     // 10 с
  regenCooldown: 5400   // 90 с
};

// Способность на ПКМ — от карты Долбильщика: рывок или гиперрегенерация (тянут одну карту из трёх)
function cardAbility() {
  if (player.cards.dash > 0) return 'dash';
  if (player.cards.regen > 0) return 'regen';
  return null;
}

function useCardAbility() {
  const ab = cardAbility();
  if (!ab || player.stunTimer > 0) return;
  if (player.abilityCd > 0) {
    addFloatingText(player.x, player.y - 30, currentLang === 'ru' ? `⏳ ${Math.ceil(player.abilityCd / 60)} С` : `⏳ ${Math.ceil(player.abilityCd / 60)}s`, '#94a3b8');
    return;
  }
  if (ab === 'dash') performDash();
  else {
    player.regenLeft = CARD_EFFECTS.regenFrames;
    player.abilityCd = CARD_EFFECTS.regenCooldown;
    addFloatingText(player.x, player.y - 34, currentLang === 'ru' ? '💚 ГИПЕРРЕГЕНЕРАЦИЯ' : '💚 HYPER-REGENERATION', '#4ade80');
    createParticles(player.x, player.y - 20, '#4ade80', 18);
  }
  updateHUD(true);
}

// Рывок: тот же перекат (неуязвимость, движение в update), только быстрый, далёкий и без кувырка
function performDash() {
  if (player.isRolling) return;
  let dx = 0, dy = 0;
  if (keys['KeyW']) dy -= 1;
  if (keys['KeyS']) dy += 1;
  if (keys['KeyA']) dx -= 1;
  if (keys['KeyD']) dx += 1;
  if (dx === 0 && dy === 0) {
    dx = Math.cos(player.angle);
    dy = Math.sin(player.angle);
  } else {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }
  player.isRolling = true;
  player.isDashing = true;
  player.rollDuration = CARD_EFFECTS.dashFrames;
  player.rollDx = dx;
  player.rollDy = dy;
  player.abilityCd = CARD_EFFECTS.dashCooldown;
  SoundFX.batSwing(false);
  createParticles(player.x, player.y, '#a5f3fc', 14);
}

// Лазер: накопитель сел (или R) — 5 с перезарядки, потом снова полный
function rechargeLaser() {
  if (player.laserRecharge > 0 || player.laserCharge >= CARD_EFFECTS.laserCharge) return;
  player.laserRecharge = CARD_EFFECTS.laserRecharge;
  SoundFX.laserRecharge();
  addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? '🔋 НАКОПИТЕЛЬ ЗАРЯЖАЕТСЯ (5 С)' : '🔋 RECHARGING CELL (5s)', '#facc15');
}

// Луч бьёт сразу: первая жаба на линии прицела в пределах range, стены зданий его останавливают
function fireLaserBeam(muzzle) {
  const W = WEAPONS.laser;
  const ang = player.angle + (Math.random() - 0.5) * (drunkAim() ? 0.08 : 0.01);
  const cx = Math.cos(ang), cy = Math.sin(ang);
  let len = W.range;
  for (let d = 16; d < W.range; d += 12) {
    if (checkBuildingCollision(muzzle.x + cx * d, muzzle.y + cy * d + 20, 2)) {
      len = d;
      break;
    }
  }
  let target = null, best = len;
  enemies.forEach(e => {
    // ближайшая к лучу точка тела жабы (центр чуть выше ног)
    const ex = e.x - muzzle.x, ey = e.y - 20 - muzzle.y;
    const along = ex * cx + ey * cy;
    if (along < 0 || along > best) return;
    if (Math.abs(ex * cy - ey * cx) < e.radius + 8) {
      best = along;
      target = e;
    }
  });
  const x2 = muzzle.x + cx * best, y2 = muzzle.y + cy * best;
  muzzleFlashes.push({ x: muzzle.x, y: muzzle.y, x2, y2, angle: ang, type: 'laser_beam', life: 3, maxLife: 3, scale: 1 });
  player.laserTick = (player.laserTick || 0) + 1;
  if (player.laserTick % 3 === 0) SoundFX.laser();
  if (window.threeCharacter && player.laserTick % 2 === 0) window.threeCharacter.triggerRecoil(0.25);
  if (!target) {
    if (best < W.range) spawnDirectionalSparks(x2, y2, ang + Math.PI, 0.9, 3, '#fca5a5', 3, 8, 7);
    return;
  }
  let dmg = W.dmg(player.baseDamage) * (player.isDrunk ? 1.5 : 1.0);
  const isCrit = Math.random() < player.critChance;
  if (isCrit) dmg *= player.critMult;
  const hit = damageEnemy(target, dmg, 'laser', player.x, player.y);
  target.hitFlash = 3;
  spawnDirectionalSparks(x2, y2, ang + Math.PI, 0.9, 4, '#f87171', 3, 9, 8);
  // Цифра урона — раз в несколько тиков, иначе луч засыпает экран цифрами
  if (isCrit || player.laserTick % 4 === 0) {
    addFloatingText(target.x, target.y - 20, damageLabel(hit, `${isCrit ? 'КРИТ! ' : ''}-${Math.round(hit.dealt)}`), isCrit ? '#ef4444' : '#fca5a5');
  }
}
let cardOfferTimer = 0;

// Уворот (карта «Ловкость»): удар, пуля, язык или брошенный предмет проходят мимо
const LUCKY_CHARM_DODGE = 0.03;
function playerDodged() {
  const agi = (player.cards && player.cards.agility) || 0;
  const chance = CARD_EFFECTS.agilityDodge * agi + (player.hasPerk('lucky_charm') ? LUCKY_CHARM_DODGE : 0);
  if (chance > 0 && Math.random() < chance) {
    addFloatingText(player.x - 26, player.y - 44, currentLang === 'ru' ? 'УВОРОТ!' : 'DODGE!', '#a5f3fc');
    return true;
  }
  return false;
}

function offerBossCards() {
  if (!window.BossCards || gameState !== 'PLAYING') return;
  gameState = 'CARDS';
  window.BossCards.open(applyBossCard, currentLocation === 'promzona' ? 'kicker_pounder' : 'kicker');
}

function applyBossCard(id) {
  player.cards[id] = (player.cards[id] || 0) + 1;
  if (id === 'vitality') {
    player.maxHp += CARD_EFFECTS.vitalityHp;
    player.hp += CARD_EFFECTS.vitalityHp;
  } else if (id === 'laser') {
    // Бластер сразу в руках и в хотбаре
    player.unlockedWeapons.laser = true;
    player.equipped.laser = true;
    player.laserCharge = CARD_EFFECTS.laserCharge;
    player.laserRecharge = 0;
    if (player === localPlayer) {
      applyHotbarOrder();
      window.switchWeapon('laser');
    } else player.currentWeapon = 'laser';
  } else if (id === 'dash' || id === 'regen') {
    player.abilityCd = 0;
    addFloatingText(player.x, player.y - 44, currentLang === 'ru' ? 'ПКМ — СПОСОБНОСТЬ' : 'RMB — ABILITY', '#facc15');
  }
  player.pendingCards = false;
  createParticles(player.x, player.y - 20, '#facc15', 24);
  if (player !== localPlayer) return; // товарищ выбрал у себя (src/coop.js)
  gameState = 'PLAYING';
  updateHUD(true);
  if (window.Menu) window.Menu.requestSave();
}
// Какие карты дают за босса этой локации (id — как в src/cards.js)
const BOSS_CARD_IDS = { city: ['speed', 'agility', 'vitality'], promzona: ['laser', 'dash', 'regen'] };

// --- ПРОЛОМ В ЗАБОРЕ (переход между городом и Промзоной) ---
// Удары берсерка-Мясника по земле трескают пролёт бетонного забора прямо за его логовом. Когда
// город зачищен, Василий проламывает треснувший пролёт — за ним Промзона. Состояние: intact → cracked → open.
// В Промзоне тот же пролёт — в нижнем заборе (side: 'bottom'), он открыт всегда. Рисует пролом EnvironmentRenderer.
// x — плита забора (сегменты через 110 px от 55) прямо над логовом BOSS_HOME
const fenceBreach = { x: 5555, halfW: 55, side: 'top', state: 'intact', cracks: 0 };
window.fenceBreach = fenceBreach;
// Линия забора с пролётом: у верхнего забора — y = 40, у нижнего — край карты
const breachFenceY = () => (fenceBreach.side === 'top' ? 40 : WORLD_HEIGHT - 40);
// В какую сторону от забора — внутрь карты (+1 вниз от верхнего, -1 вверх от нижнего)
const breachInward = () => (fenceBreach.side === 'top' ? 1 : -1);

function crackFence() {
  if (fenceBreach.state === 'open') return;
  fenceBreach.state = 'cracked';
  fenceBreach.cracks = Math.min(3, fenceBreach.cracks + 1);
}

// Коллизия забора с пролётом разрезается: в пролёте можно пройти
function openBreachCollision() {
  const side = fenceBreach.side;
  const i = buildings.findIndex(b => b.type === 'border_fence' && b.side === side);
  if (i < 0) return;
  const r = buildings[i];
  const gapL = fenceBreach.x - fenceBreach.halfW, gapR = fenceBreach.x + fenceBreach.halfW;
  buildings.splice(i, 1,
    { type: 'border_fence', side: side + '_l', x: r.x, y: r.y, w: gapL - r.x, h: r.h },
    { type: 'border_fence', side: side + '_r', x: gapR, y: r.y, w: r.x + r.w - gapR, h: r.h });
}

function breakFence() {
  fenceBreach.state = 'open';
  openBreachCollision();
  const x = fenceBreach.x, y = breachFenceY();
  if (window.threeCharacter && window.threeCharacter.triggerSwing) window.threeCharacter.triggerSwing();
  for (let k = 0; k < 4; k++) spawnGunpowderSmoke(x - 40 + k * 26, y + 10, Math.PI / 2 + (Math.random() - 0.5), 6);
  spawnDirectionalSparks(x, y, Math.PI / 2, 2.6, 24, '#9ca3af', 4, 12, 18);
  createParticles(x, y + 20, '#6b7280', 30);
  shakeScreen(30, 18);
  SoundFX.bossFx('fence_break', x, y);
  showToast(t('breach_title'), t('breach_sub'));
  if (window.Menu) window.Menu.requestSave();
}

// Пролом открыт и Василий шагнул в него — переход в другую локацию. В Промзону в первый раз — через
// комикс перехода (src/comic.js, 8 кадров; пропуск по ESC — тоже переход), дальше — сразу
// Василий вышел в пролом
function atBreach(p) {
  if (Math.abs(p.x - fenceBreach.x) > fenceBreach.halfW) return false;
  return fenceBreach.side === 'top' ? p.y < 48 : p.y > WORLD_HEIGHT - 48;
}

let breachWaitT = 0;
function checkBreachTransit() {
  if (fenceBreach.state !== 'open') return;
  // Кооп: уходят все вместе — когда в проломе все, кто не погиб (упавшего сначала надо поднять)
  const team = players.filter(p => !p.dead);
  const ready = team.filter(atBreach).length;
  if (ready === 0) return;
  if (ready < team.length) {
    if (atBreach(localPlayer) && --breachWaitT <= 0) {
      breachWaitT = 120;
      addFloatingText(localPlayer.x - 60, localPlayer.y - 70, currentLang === 'ru' ? `Ждём остальных: ${ready}/${team.length}` : `Waiting for the rest: ${ready}/${team.length}`, '#facc15');
    }
    return;
  }
  breachWaitT = 0;
  const target = currentLocation === 'city' ? 'promzona' : 'city';
  if (locationsVisited.has(target) || target !== 'promzona' || !window.Comic) {
    travelTo(target);
    return;
  }
  gameState = 'TRANSIT';
  window.Comic.play(() => travelTo(target), 'promzona');
}

// Василий стоит у пролома с внутренней стороны забора
function placePlayerAtBreach() {
  // Кооп: все рядом, в ряд поперёк прохода
  players.forEach((p, i) => {
    p.x = fenceBreach.x + (i - (players.length - 1) / 2) * 50;
    p.y = breachFenceY() + breachInward() * (110 + (i % 2) * 30);
    p.isRolling = false;
  });
}

// Где встать, придя в локацию: в подвал — у лестницы, из подвала в город — у его двери, иначе — у пролома
function placePlayersOnArrival(from) {
  if (currentLocation === 'basement' && window.Basement) window.Basement.placeInside();
  else if (currentLocation === 'city' && from === 'basement' && window.Basement) window.Basement.placeAtDoor();
  else placePlayerAtBreach();
}

// Переход в другую локацию: мир текущей запоминается тем же снимком, что пишет сохранение,
// другая строится заново и, если Василий там уже был, восстанавливается
function travelTo(target) {
  if (window.Net) window.Net.onTravel(target);
  autoScale.hold(6000);
  if (window.Menu) locationWorlds[currentLocation] = window.Menu.snapshotWorld();
  const from = currentLocation;
  currentLocation = target;
  locationsVisited.add(target);
  generateWorld();
  const saved = locationWorlds[target];
  delete locationWorlds[target];
  if (saved && window.Menu) window.Menu.applyWorld(saved);
  placePlayersOnArrival(from);
  lastPlayerDistrictId = '';
  // Модели новой локации и её кадры — на экране загрузки, а не в игре; оборона — уже после неё
  Loading.start(() => {
    if (target === 'basement') showToast(t('location_basement'), t('location_basement_sub'));
    else if (from !== 'basement') showToast(t(target === 'city' ? 'location_city' : 'location_promzona'), t('location_sub'));
    // Первый раз в Промзоне — оборона у пролома (src/defense.js)
    if (window.Defense) window.Defense.onEnter();
    if (window.Menu) window.Menu.requestSave();
  });
}

// Надпись на асфальте у пролома и полоска света из него (в сторону карты от забора)
function drawBreachGround(ctx) {
  if (fenceBreach.state !== 'open') return;
  const x = fenceBreach.x;
  const y0 = breachFenceY(), dir = breachInward();
  const t = performance.now() / 1000;
  ctx.save();
  const g = ctx.createLinearGradient(x, y0 - dir * 10, x, y0 + dir * 150);
  g.addColorStop(0, `rgba(250, 204, 21, ${0.22 + Math.sin(t * 2) * 0.05})`);
  g.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - fenceBreach.halfW + 8, y0);
  ctx.lineTo(x + fenceBreach.halfW - 8, y0);
  ctx.lineTo(x + 80, y0 + dir * 150);
  ctx.lineTo(x - 80, y0 + dir * 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(250, 204, 21, 0.55)';
  ctx.font = '900 16px Arial';
  ctx.textAlign = 'center';
  const label = currentLocation === 'city'
    ? (currentLang === 'ru' ? '▲ ПРОМЗОНА ▲' : '▲ INDUSTRIAL ZONE ▲')
    : (currentLang === 'ru' ? '▼ НОВОХМУРИНСК ▼' : '▼ NOVOKHMURINSK ▼');
  ctx.fillText(label, x, y0 + dir * 110);
  ctx.restore();
}

// Над треснувшим пролётом, когда локация зачищена: прыгающая золотая стрелка и подсветка плиты
function drawBreachHint(ctx) {
  if (!levelCleared || fenceBreach.state !== 'cracked') return;
  const now = performance.now() / 1000;
  const x = fenceBreach.x;
  const pulse = 0.5 + 0.5 * Math.sin(now * 4);
  ctx.save();
  // Подсветка треснувшей плиты
  ctx.fillStyle = `rgba(250, 204, 21, ${0.12 + 0.12 * pulse})`;
  ctx.strokeStyle = `rgba(253, 224, 71, ${0.5 + 0.4 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - 56, -20, 112, 68, 6);
  ctx.fill();
  ctx.stroke();
  // Стрелка вниз, на плиту
  const y = -44 - Math.abs(Math.sin(now * 3.2)) * 16;
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y + 26);
  ctx.lineTo(x - 18, y + 4);
  ctx.lineTo(x - 7, y + 4);
  ctx.lineTo(x - 7, y - 16);
  ctx.lineTo(x + 7, y - 16);
  ctx.lineTo(x + 7, y + 4);
  ctx.lineTo(x + 18, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.font = '900 13px Arial';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeText(t('breach_here'), x, y - 24);
  ctx.fillText(t('breach_here'), x, y - 24);
  ctx.restore();
}

// Когда город зачищен, золотая стрелка у края экрана показывает, где пролом, и сколько до него
function drawBreachMarker() {
  if (gameState !== 'PLAYING' || fenceBreach.state === 'intact') return;
  // Только в городе, когда он зачищен, и только до первого перехода: показывает, куда идти дальше.
  // Кто уже был в Промзоне, дорогу знает. В самой Промзоне стрелки нет
  if (currentLocation !== 'city' || !levelCleared || locationsVisited.has('promzona')) return;
  const markY = breachFenceY() + breachInward() * 20;
  const sx = fenceBreach.x - camera.x, sy = markY - camera.y;
  const w = viewW, h = viewH;
  if (sx > 0 && sx < w && sy > 0 && sy < h) return;
  const left = 40, right = w - 40, top = 80, bottom = h - 110;
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const dx = sx - cx, dy = sy - cy;
  const k = Math.min((right - cx) / Math.max(1e-3, Math.abs(dx)), (bottom - cy) / Math.max(1e-3, Math.abs(dy)));
  const ax = cx + dx * k, ay = cy + dy * k;
  const a = Math.atan2(dy, dx);
  const pulse = 0.8 + Math.sin(performance.now() / 200) * 0.2;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(a);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-14, -17);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-14, 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Подпись — ближе к центру экрана, без поворота
  const meters = Math.round(Math.hypot(fenceBreach.x - player.x, markY - player.y) / 45);
  const label = `${t('breach_marker')} · ${meters} ${currentLang === 'ru' ? 'м' : 'm'}`;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.font = '900 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lx = ax - Math.cos(a) * 44, ly = ay - Math.sin(a) * 30;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.strokeText(label, lx, ly);
  ctx.fillStyle = '#fde047';
  ctx.fillText(label, lx, ly);
  ctx.restore();
}

// --- АУРА ПЕРЕГАРА (перк «Аура перегара») ---
// Вокруг Василия стелется облако перегара. Клубы рождаются у него под ногами, расползаются и тают
// ровно на границе действия — по ним видно, докуда достаёт аура. Жабы в облаке хмелеют
// (над головой кружат пузыри) и двигаются медленнее
const FUME_AURA_RADIUS = 140;
// Пьяная рука: разброс растёт, если не взят «Заговорённый спирт»
function drunkAim() {
  // Настойка на печени (src/canteen.js) — рука твёрдая, как с «Заговорённым спиртом»
  return player.isDrunk && !player.hasPerk('charmed_spirit') && !(window.Canteen && window.Canteen.steady());
}
// С «Заговорённым спиртом» облако у пьяного Василия шире
function fumeAuraRadius() {
  return player.isDrunk && player.hasPerk('charmed_spirit') ? FUME_AURA_RADIUS * 1.4 : FUME_AURA_RADIUS;
}
const FUME_AURA_SLOW = 0.55;
const FUME_PUFFS = 18;
let fumePuffSprite = null;

// Мягкий клуб дыма, рисуется один раз и дальше только тиражируется
function getFumePuff() {
  if (fumePuffSprite) return fumePuffSprite;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(214, 211, 120, 0.85)');
  grad.addColorStop(0.45, 'rgba(176, 186, 84, 0.45)');
  grad.addColorStop(1, 'rgba(150, 160, 70, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  fumePuffSprite = c;
  // В <img>, как кадры кэша: «уснувший» при скрытой вкладке холст потом рисуется в разы медленнее
  c.toBlob((blob) => {
    if (!blob) return;
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    img.decode().then(() => { fumePuffSprite = img; }).catch(() => {});
  });
  return c;
}

function drawFumeAura(ctx) {
  const t = performance.now() / 1000;
  const cx = player.x, cy = player.y + 6;
  const R = fumeAuraRadius();
  ctx.save();
  // Едва заметная дымка: гуще у Василия, к краю сходит на нет
  const haze = ctx.createRadialGradient(cx, cy, 8, cx, cy, R);
  haze.addColorStop(0, 'rgba(190, 196, 90, 0.24)');
  haze.addColorStop(0.75, 'rgba(160, 170, 70, 0.09)');
  haze.addColorStop(1, 'rgba(150, 160, 60, 0)');
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  // Клубы: каждый живёт по кругу — от ног наружу, закручиваясь, и тает у границы
  const puff = getFumePuff();
  for (let i = 0; i < FUME_PUFFS; i++) {
    const seed = i * 2.399963; // золотой угол — клубы не слипаются
    const life = (t * (0.16 + (i % 5) * 0.015) + i / FUME_PUFFS) % 1;
    const r = 18 + (R - 18) * life;
    const a = seed + t * (i % 2 ? 0.22 : -0.18) + life * 0.9;
    const size = 26 + 34 * life;
    ctx.globalAlpha = Math.sin(Math.PI * life) * 0.65;
    ctx.drawImage(puff, cx + Math.cos(a) * r - size / 2, cy + Math.sin(a) * r - size / 2, size, size);
  }
  ctx.restore();
}

// Хмельная жаба: над головой кружат пузыри перегара
// Оглушённая жаба: жёлтые звёздочки кружат над головой
function drawStunStars(ctx, e) {
  const t = performance.now() / 1000 + e.x * 0.01;
  const headY = e.y - (e.type === 'brute' ? 96 : 56);
  ctx.save();
  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 3; k++) {
    const a = t * 5 + k * (Math.PI * 2 / 3);
    const x = e.x + Math.cos(a) * 16;
    const y = headY + Math.sin(a) * 5.5;
    const r = Math.sin(a) > 0 ? 5.6 : 4.2;
    ctx.globalAlpha = Math.sin(a) > 0 ? 1 : 0.6;
    ctx.beginPath();
    for (let j = 0; j < 10; j++) {
      const rr = j % 2 ? r * 0.45 : r;
      const aa = -Math.PI / 2 + j * Math.PI / 5 + t * 2;
      ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawFumeTipsy(ctx, e) {
  const t = performance.now() / 1000 + e.x * 0.01;
  const headY = e.y - (e.type === 'boss' || e.type === 'pounder' ? 118 : e.type === 'brute' ? 92 : 52);
  ctx.save();
  for (let k = 0; k < 3; k++) {
    const a = t * 3 + k * (Math.PI * 2 / 3);
    const x = e.x + Math.cos(a) * 11;
    const y = headY + Math.sin(a) * 4;
    const front = Math.sin(a) > 0;
    ctx.globalAlpha = front ? 0.95 : 0.55;
    ctx.fillStyle = k === 1 ? '#facc15' : '#bef264';
    ctx.beginPath();
    ctx.arc(x, y, front ? 3.2 : 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 0.8;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 0.9, y - 1, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- ВЫПАД ЯЗЫКОМ (пехотинцы) ---
// Кружить вокруг пехотинцев больше не выйдет. Подпустив Василия ближе TONGUE_REACH, жаба приседает,
// раздувает горло и стреляет языком туда, где Василий был в конце замаха (TONGUE_AIM_LOCK),
// а сама прыгает следом. От языка уходят перекатом или шагом в сторону. Удар битой или дрелью
// во время замаха сбивает его, а после выпада жаба на полсекунды открыта — так её и бьют битой
const TONGUE_REACH = 128;
const TONGUE_MIN = 34;
const TONGUE_WINDUP = 24;
const TONGUE_AIM_LOCK = 9;
const TONGUE_OUT = 7;
const TONGUE_HOLD = 4;
const TONGUE_BACK = 9;
const TONGUE_RECOVER = 28;
const TONGUE_COOLDOWN = 110;      // + до 70 случайно
const TONGUE_DAMAGE = 11;         // + 1,6 за тир района
const TONGUE_PULL = 22;           // язык подтягивает Василия к жабе
const TONGUE_STAGGER = 26;        // сбитая с замаха жаба столько кадров приходит в себя

// Рот жабы на экране (от её точки): по 3D-модели, пока она грузится — примерно
function gruntMouth(e) {
  const m = window.threeEnemies && window.threeEnemies.getGruntMouth(e);
  if (m) return { x: e.x + m.x, y: e.y + m.y };
  return { x: e.x + Math.cos(e.angle || 0) * 10, y: e.y - 30 + Math.sin(e.angle || 0) * 4 };
}

// Куда целится язык — грудь Василия
function tongueTarget() {
  return { x: player.x, y: player.y - 18 };
}

function interruptTongue(e) {
  e.lunge = null;
  e.squash = 0;
  e.stagger = TONGUE_STAGGER;
  e.tongueCooldown = 60;
  addFloatingText(e.x, e.y - 40, currentLang === 'ru' ? 'СБИТ!' : 'STAGGERED!', '#fbbf24');
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// true — в этом кадре жаба занята выпадом (или приходит в себя) и не идёт к Василию.
// slowed — жаба в облаке перегара: замах и язык медленнее
function updateGruntTongue(e, distToPlayer, angle, slowed) {
  if (e.tongueCooldown > 0) e.tongueCooldown--;
  if (e.stagger > 0) {
    e.stagger--;
    return true;
  }
  let L = e.lunge;
  if (!L) {
    if (e.tongueCooldown > 0 || distToPlayer > TONGUE_REACH || distToPlayer < TONGUE_MIN) return false;
    // Сквозь стену языком не достать
    const m = gruntMouth(e), tg = tongueTarget();
    for (let k = 1; k < 5; k++) {
      if (checkBuildingCollision(m.x + (tg.x - m.x) * k / 5, m.y + (tg.y - m.y) * k / 5 + 18, 4)) return false;
    }
    L = e.lunge = { phase: 'windup', t: 0, tx: tg.x, ty: tg.y, ext: 0, hit: false, side: Math.random() < 0.5 ? 1 : -1 };
  }
  L.t += slowed ? 0.7 : 1;
  if (L.phase === 'windup') {
    if (L.t <= TONGUE_WINDUP - TONGUE_AIM_LOCK) {
      e.angle = angle;
      const tg = tongueTarget();
      L.tx = tg.x;
      L.ty = tg.y;
    }
    e.squash = Math.min(1, L.t / TONGUE_WINDUP);
    if (L.t >= TONGUE_WINDUP) {
      // Цель — не дальше длины языка
      const m = gruntMouth(e);
      const d = Math.hypot(L.tx - m.x, L.ty - m.y) || 1;
      const reach = TONGUE_REACH + 10;
      if (d > reach) {
        L.tx = m.x + (L.tx - m.x) / d * reach;
        L.ty = m.y + (L.ty - m.y) / d * reach;
      }
      L.phase = 'out';
      L.t = 0;
      SoundFX.tongue();
    }
    return true;
  }
  if (L.phase === 'out') {
    L.ext = Math.min(1, L.t / TONGUE_OUT);
    e.squash = -0.6;
    // Выпад: жаба прыгает следом за языком
    slideMove(e, Math.cos(e.angle) * 3, Math.sin(e.angle) * 3, e.radius, true);
    if (L.t >= TONGUE_OUT) {
      L.phase = 'hold';
      L.t = 0;
    }
  } else if (L.phase === 'hold') {
    L.ext = 1;
    if (L.hit) {
      // Прилип к Василию: кончик языка держится на нём
      const tg = tongueTarget();
      L.tx = tg.x;
      L.ty = tg.y;
    }
    if (L.t >= TONGUE_HOLD) {
      L.phase = 'back';
      L.t = 0;
    }
  } else if (L.phase === 'back') {
    L.ext = Math.max(0, 1 - L.t / TONGUE_BACK);
    e.squash = -0.6 * L.ext;
    if (L.t >= TONGUE_BACK) {
      L.phase = 'recover';
      L.t = 0;
      L.ext = 0;
      e.squash = 0;
    }
  } else if (L.phase === 'recover') {
    if (L.t >= TONGUE_RECOVER) {
      e.lunge = null;
      e.tongueCooldown = TONGUE_COOLDOWN + Math.floor(Math.random() * 70);
      return false;
    }
    return true;
  }
  // Попадание: кончик языка задел Василия (перекат проскакивает)
  if (!L.hit && L.ext > 0.55 && !player.isRolling) {
    const m = gruntMouth(e);
    const tipX = m.x + (L.tx - m.x) * L.ext, tipY = m.y + (L.ty - m.y) * L.ext;
    const tg = tongueTarget();
    if (distToSegment(tg.x, tg.y, m.x, m.y, tipX, tipY) < player.radius + 4) {
      L.hit = true;
      if (playerDodged()) return true;
      const dmg = Math.round(TONGUE_DAMAGE + (e.tier || 1) * 1.6);
      player.hp -= armorAbsorb(dmg, 'melee');
      addFloatingText(player.x, player.y - 34, `-${dmg}`, '#fb7185');
      createParticles(player.x, player.y - 14, '#f472b6', 8);
      const a = Math.atan2(e.y - player.y, e.x - player.x);
      slideMove(player, Math.cos(a) * TONGUE_PULL, Math.sin(a) * TONGUE_PULL, player.radius);
      if (player.hp <= 0) gameOver();
    }
  }
  return true;
}

// Язык: розовый, сужается к липкой подушечке на кончике, при выстреле изгибается хлыстом
function drawGruntTongue(ctx, e) {
  const L = e.lunge;
  if (!L) return;
  const m = gruntMouth(e);
  if (L.phase === 'windup') {
    // Раздувается горло — вот-вот выстрелит
    const k = Math.min(1, L.t / TONGUE_WINDUP);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.5 * k;
    ctx.fillStyle = '#f9a8d4';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y + 5, 4 + 6 * k, 3 + 4 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (!(L.ext > 0.02)) return;
  const tipX = m.x + (L.tx - m.x) * L.ext, tipY = m.y + (L.ty - m.y) * L.ext;
  const dx = tipX - m.x, dy = tipY - m.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  // Хлыст: изгиб сильнее, пока язык летит, и почти прямой, когда натянут
  const bend = (L.phase === 'hold' ? 3 : 11) * Math.sin(L.ext * Math.PI) * L.side;
  const qx = m.x + dx * 0.5 + nx * bend, qy = m.y + dy * 0.5 + ny * bend;
  ctx.save();
  ctx.lineCap = 'round';
  // Контур, тело и влажный блик — три прохода по одной кривой, к кончику тоньше
  const passes = [['#881337', 7.5, 4.5], ['#e11d48', 5.5, 3], ['#fda4af', 1.6, 1]];
  passes.forEach(([color, w0, w1], pi) => {
    ctx.strokeStyle = color;
    const steps = 6;
    let px = m.x, py = m.y;
    for (let k = 1; k <= steps; k++) {
      const s = k / steps;
      const x = (1 - s) * (1 - s) * m.x + 2 * (1 - s) * s * qx + s * s * tipX;
      const y = (1 - s) * (1 - s) * m.y + 2 * (1 - s) * s * qy + s * s * tipY;
      ctx.lineWidth = w0 + (w1 - w0) * s;
      ctx.beginPath();
      ctx.moveTo(pi === 2 ? px - 0.8 : px, pi === 2 ? py - 1 : py);
      ctx.lineTo(pi === 2 ? x - 0.8 : x, pi === 2 ? y - 1 : y);
      ctx.stroke();
      px = x;
      py = y;
    }
  });
  // Липкая подушечка
  ctx.fillStyle = '#9f1239';
  ctx.beginPath();
  ctx.ellipse(tipX, tipY, 6.5, 5.5, Math.atan2(dy, dx), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.ellipse(tipX, tipY, 4.5, 3.8, Math.atan2(dy, dx), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(tipX - 1.5, tipY - 1.8, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- ГРОМИЛЫ МЕТАЮТ ПРЕДМЕТЫ ---
// Громила подходит к баку, ящику или урне (элитный из гнезда — ещё и к машине), поднимает над головой
// и швыряет туда, где Василий. Место падения заранее подсвечено красным кругом — от броска уходят
// перекатом. Предмет остаётся там, где упал (тайник можно обыскать там же), и задевает жаб тоже.
// o.airborne — предмет поднят или летит: тогда он рисуется поверх фигур, а его препятствие снято
// bottom — насколько видимое дно предмета ниже его центра на экране (по кадрам моделей):
// по нему предмет кладётся днищем на ладони громилы
const THROWABLE = {
  bin: { dmg: 26, radius: 40, weight: 0.6, bottom: 14 },
  trash: { dmg: 42, radius: 56, weight: 1.0, bottom: 30 },
  box: { dmg: 38, radius: 50, weight: 0.9, bottom: 13 },
  car: { dmg: 64, radius: 84, weight: 1.6, bottom: 42 },
  barrel: { dmg: 40, radius: 46, weight: 0.95, bottom: 24 }
};
// Высота кулаков громилы над его точкой, пока 3D-модель не загрузилась (потом — точно по кадру позы,
// threeEnemies.getBruteFists): у груди и над головой
const BRUTE_HANDS_CHEST = 55;
const BRUTE_HANDS_UP = 93;
const THROW_HOLD_STEPS = 3;       // позы подъёма lift0…lift3 (BRUTE_THROW_POSES в three_enemies.js)

// Где предмет в руках громилы на шаге подъёма step: у груди кулаки держат его за бока (середина
// предмета на кулаках), над головой — днищем на кулаках, между ними — по шагу
function throwHoldPos(e, o, kind, step) {
  const fists = window.threeEnemies && window.threeEnemies.getBruteFists(e, 'lift' + step);
  const k = step / THROW_HOLD_STEPS;
  const fx = fists ? fists.x : 0;
  const fy = fists ? fists.y : -(BRUTE_HANDS_CHEST + (BRUTE_HANDS_UP - BRUTE_HANDS_CHEST) * k);
  const bottom = (kind === 'car' ? (o.subType === 'uaz' ? 47 : 36) : THROWABLE[kind].bottom) * k;
  return { x: e.x + fx, y: e.y + 2, z: 2 - fy + bottom };
}
const THROW_RANGE_MIN = 170;
// Ближе THROW_RANGE_MIN громила за предметом не ходит, но то, что лежит прямо у него под рукой
// (часто тот же бак, который он только что швырнул в Василия), поднимает и бросает в упор
const THROW_CLOSE_MIN = 60;
const THROW_CLOSE_REACH = 100;
const THROW_RANGE_MAX = 520;
const THROW_SEEK_RADIUS = 240;    // ищет предмет не дальше этого от себя
const THROW_LIFT_FRAMES = 34;     // подъём и замах: подхват, три шага вверх, удержание над головой
const THROW_GRAB_FRAMES = 8;      // предмет идёт с земли в кулаки у груди
const THROW_LIFT_STEP = 6;        // кадров на каждый следующий шаг подъёма
const THROW_COOLDOWN = 240;       // 4–6 с между бросками одного громилы (+ случайная добавка)
const BRUTE_TURN_RATE = 0.035;    // рад/кадр: громила разворачивается ~1,5 с — за спину успевают зайти
let thrownProps = [];             // летящие предметы

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(cur, target, rate) {
  const d = angleDelta(target, cur);
  return cur + Math.max(-rate, Math.min(rate, d));
}

// Что громила может поднять: баки, ящики, машины города, бочки Промзоны и урны; вагоны и грузовики — нет (null)
function throwableKind(o) {
  if (THROWABLE[o.type]) return o.type;
  return PZ_CONTAINERS[o.type] ? null : 'bin';
}

function findThrowable(e, radius) {
  const env = window.environmentRenderer;
  const pool = containers.concat(env ? env.courtyardBins.concat(env.staticSidewalkBins) : []);
  let best = null, bestD = radius;
  for (let i = 0; i < pool.length; i++) {
    const o = pool[i];
    if (o.airborne || o.claimedBy || !throwableKind(o)) continue;
    if (o.type === 'car' && (e.tier || 0) < 4) continue; // машины поднимают только элитные громилы
    // Под куполом не берёт; у края — берёт (туда падает брошенное в стоящего у купола Василия)
    if (Math.hypot(o.x - safeZone.x, o.y - safeZone.y) < safeZone.radius + 10) continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

// Отменить бросок: поднятый предмет падает к ногам громилы, без урона
function cancelThrow(e) {
  const st = e.throwState;
  if (!st) return;
  st.obj.claimedBy = null;
  if (st.phase === 'lift') {
    st.obj.x = Math.round(e.x);
    st.obj.y = Math.round(e.y + e.radius * 0.6);
    st.obj.z = 0;
    st.obj.airborne = false;
    st.obj.heldBehind = false;
    st.obj.moved = true;
    placeObstacleFor(st.obj, st.kind);
  }
  e.throwState = null;
  e.throwPose = null;
}

// true — в этом кадре громила занят броском (подходит к предмету или замахивается)
function updateBruteThrow(e, distToPlayer, eSpeed) {
  if (e.throwCooldown > 0) e.throwCooldown--;
  if (e.throwPoseTimer > 0 && --e.throwPoseTimer === 0) e.throwPose = null;
  const st = e.throwState;
  if (!st) {
    if (e.throwCooldown > 0 || distToPlayer < THROW_CLOSE_MIN || distToPlayer > THROW_RANGE_MAX) return false;
    const far = distToPlayer >= THROW_RANGE_MIN;
    const o = findThrowable(e, far ? THROW_SEEK_RADIUS : e.radius + THROW_CLOSE_REACH);
    if (!o) {
      if (far) e.throwCooldown = 90;
      return false;
    }
    o.claimedBy = e;
    e.throwState = { phase: 'seek', obj: o, kind: throwableKind(o), t: 0 };
    return false;
  }
  st.t++;
  const o = st.obj;
  if (st.phase === 'seek') {
    // Дотянуться — по размеру препятствия предмета: к машине сбоку иначе было не подойти
    const ob = o.obstacle;
    const reach = e.radius + (ob ? Math.max(ob.rx, ob.ry) : THROWABLE[st.kind].radius * 0.5) + 12;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    // Василий подошёл, пока громила шёл за предметом, — бросает затею (если предмет не под рукой)
    if (o.airborne || st.t > 200 || (d > reach && distToPlayer < 110) || distToPlayer < THROW_CLOSE_MIN) {
      cancelThrow(e);
      e.throwCooldown = 120;
      return false;
    }
    if (d > reach) {
      const a = Math.atan2(o.y - e.y, o.x - e.x);
      e.angle = turnToward(e.angle, a, BRUTE_TURN_RATE * 2);
      slideMove(e, Math.cos(a) * eSpeed, Math.sin(a) * eSpeed, e.radius, true);
      return true;
    }
    // Поднимает
    removeObstacle(o.obstacle);
    o.airborne = true;
    o.z = 0;
    st.phase = 'lift';
    st.t = 0;
    st.ox = o.x;
    st.oy = o.y;
    SoundFX.liftProp(st.kind, enemySoundVolume(o.x, o.y), SoundFX.pan(o.x));
    return true;
  }
  // Подъём: подхватывает предмет у груди и шагами поднимает над головой, доворачиваясь к Василию.
  // Предмет всё время в кулаках текущей позы
  e.angle = turnToward(e.angle, Math.atan2(player.y - e.y, player.x - e.x), BRUTE_TURN_RATE);
  const step = st.t < THROW_GRAB_FRAMES ? 0
    : Math.min(THROW_HOLD_STEPS, 1 + Math.floor((st.t - THROW_GRAB_FRAMES) / THROW_LIFT_STEP));
  e.throwPose = 'lift' + step;
  const hold = throwHoldPos(e, o, st.kind, step);
  if (st.t < THROW_GRAB_FRAMES) {
    // Подхват: предмет идёт с земли в кулаки, а не телепортируется
    const g = 1 - Math.pow(1 - (st.t + 1) / THROW_GRAB_FRAMES, 2);
    o.x = st.ox + (hold.x - st.ox) * g;
    o.y = st.oy + (hold.y - st.oy) * g;
    o.z = hold.z * g;
  } else {
    o.x = hold.x;
    o.y = hold.y;
    o.z = hold.z;
  }
  // Громила спиной к камере держит предмет перед собой — его закрывает фигура
  o.heldBehind = step <= 1 && Math.sin(e.angle) < -0.3;
  if (st.t >= THROW_LIFT_FRAMES) {
    o.heldBehind = false;
    launchThrowable(e, o, st.kind);
    e.throwState = null;
    e.throwPose = 'throw';
    e.throwPoseTimer = 14;
    e.throwCooldown = THROW_COOLDOWN + Math.floor(Math.random() * 120);
  }
  return true;
}

function launchThrowable(e, o, kind) {
  const def = THROWABLE[kind];
  // Цель — где Василий будет через полсекунды, если продолжит идти
  let tx = player.x + (player.lastDx || 0) * player.speed * 30;
  let ty = player.y + (player.lastDy || 0) * player.speed * 30;
  const maxRange = THROW_RANGE_MAX / Math.sqrt(def.weight);
  let dx = tx - o.x, dy = ty - o.y;
  const len = Math.hypot(dx, dy) || 1;
  if (len > maxRange) {
    tx = o.x + dx / len * maxRange;
    ty = o.y + dy / len * maxRange;
  }
  // Купол Михалыча предметы не пропускает: падают у его края
  const sd = Math.hypot(tx - safeZone.x, ty - safeZone.y);
  const minSafe = safeZone.radius + def.radius * 0.5;
  if (sd < minSafe) {
    const a = Math.atan2(ty - safeZone.y, tx - safeZone.x);
    tx = safeZone.x + Math.cos(a) * minSafe;
    ty = safeZone.y + Math.sin(a) * minSafe;
  }
  const dist = Math.hypot(tx - o.x, ty - o.y);
  thrownProps.push({
    o, kind, thrower: e,
    x0: o.x, y0: o.y, z0: o.z,
    x1: tx, y1: ty,
    t: 0,
    T: Math.max(30, Math.round(dist / (8.5 / Math.pow(def.weight, 0.3)))),
    peak: 70 + dist * 0.2,
    spin: (Math.random() < 0.5 ? -1 : 1) * (0.06 + Math.random() * 0.05)
  });
  o.claimedBy = null;
  SoundFX.bossFx(kind === 'car' ? 'brute_throw_heavy' : 'brute_throw', o.x, o.y);
}

function updateThrownProps() {
  for (let i = thrownProps.length - 1; i >= 0; i--) {
    const f = thrownProps[i];
    f.t++;
    const s = Math.min(1, f.t / f.T);
    f.o.x = f.x0 + (f.x1 - f.x0) * s;
    f.o.y = f.y0 + (f.y1 - f.y0) * s;
    f.o.z = f.z0 * (1 - s) + 4 * f.peak * s * (1 - s);
    f.o.tilt = f.spin * f.t;
    if (s >= 1) {
      landThrowable(f);
      thrownProps.splice(i, 1);
    }
  }
}

function landThrowable(f) {
  const o = f.o;
  const def = THROWABLE[f.kind];
  // В стену не влетает: если место занято зданием, предмет падает раньше по траектории
  let x = f.x1, y = f.y1;
  for (let k = 0; k < 12 && checkBuildingCollision(x, y, def.radius * 0.45); k++) {
    x -= (f.x1 - f.x0) / 12;
    y -= (f.y1 - f.y0) / 12;
  }
  o.x = Math.round(x);
  o.y = Math.round(y);
  o.z = 0;
  o.tilt = 0;
  o.airborne = false;
  o.moved = true;
  if (f.kind === 'car' || f.kind === 'box') o.dirIdx = Math.floor(Math.random() * 16);
  placeObstacleFor(o, f.kind);

  const hitR = def.radius + 26;
  forEachPlayer(() => {
    if (!player.isRolling && Math.hypot(player.x - x, player.y + footDY(player) - y) < hitR && !playerDodged()) {
      player.hp -= armorAbsorb(def.dmg, 'melee');
      const a = Math.atan2(player.y - y, player.x - x);
      slideMove(player, Math.cos(a) * 30, Math.sin(a) * 30, player.radius);
      createParticles(player.x, player.y, '#ef4444', 12);
      addFloatingText(player.x, player.y - 30, `-${def.dmg}`, '#ef4444');
      if (player.hp <= 0) gameOver();
    }
  });
  // По своим тоже прилетает
  enemies.forEach(en => {
    if (en === f.thrower || en.type === 'boss' || en.type === 'pounder') return;
    if (Math.hypot(en.x - x, en.y + footDY(en) - y) < hitR) {
      const hit = damageEnemy(en, def.dmg, 'thrown', x, y);
      en.hitFlash = 6;
      addFloatingText(en.x, en.y - 22, `-${Math.round(hit.dealt)}`, '#fbbf24');
    }
  });
  createParticles(x, y, '#78716c', 14 + Math.round(def.weight * 10));
  spawnGunpowderSmoke(x, y, -Math.PI / 2, 4 + Math.round(def.weight * 3));
  cameraKickX += (Math.random() - 0.5) * 10 * def.weight;
  cameraKickY += (Math.random() - 0.5) * 10 * def.weight;
  // Урна, бак, ящик, машина, бочка — у каждого свой звук падения (src/sounds.js)
  SoundFX.impact(f.kind, Math.max(0.3, enemySoundVolume(x, y)), SoundFX.pan(x));
}

// Красные круги на земле там, куда упадёт брошенное — рисуются под фигурами
function drawThrowTargets(ctx) {
  const t = performance.now() / 1000;
  for (let i = 0; i < thrownProps.length; i++) {
    const f = thrownProps[i];
    const r = THROWABLE[f.kind].radius + 26;
    const s = Math.min(1, f.t / f.T);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.35 * s;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2 + Math.sin(t * 14) * 0.8;
    ctx.beginPath();
    ctx.ellipse(f.x1, f.y1, r, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(f.x1, f.y1, r * s, r * 0.62 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Поднятые и летящие предметы — поверх фигур, с тенью на земле. Кроме тех, что громила держит
// перед собой, стоя спиной к камере: их рисует drawHeldBehind до его фигуры
function drawAirborneProps(ctx) {
  const env = window.environmentRenderer;
  if (!env) return;
  const draw = (o, isBin) => {
    if (o.airborne && !o.heldBehind) drawAirborneProp(ctx, o, isBin);
  };
  for (let i = 0; i < containers.length; i++) draw(containers[i], false);
  env.courtyardBins.forEach(b => draw(b, true));
  env.staticSidewalkBins.forEach(b => draw(b, true));
}

function drawHeldBehind(ctx, e) {
  const o = e.throwState && e.throwState.obj;
  if (o && o.heldBehind && window.environmentRenderer) drawAirborneProp(ctx, o, !containers.includes(o));
}

function drawAirborneProp(ctx, o, isBin) {
  const env = window.environmentRenderer;
  const z = o.z || 0;
  ctx.save();
  ctx.globalAlpha = Math.max(0.15, 0.4 - z / 600);
  ctx.fillStyle = '#000';
  const w = isBin ? 14 : (o.type === 'car' ? 62 : 26);
  ctx.beginPath();
  ctx.ellipse(o.x, o.y + 8, w * (1 - Math.min(0.5, z / 400)), w * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(o.x, o.y - z);
  ctx.rotate(o.tilt || 0);
  ctx.translate(-o.x, -o.y);
  if (isBin) env.drawBin(ctx, o);
  else env.drawContainer(ctx, o);
  ctx.restore();
}

// Размеры — по нижней части спрайтов (крыша машины и крона дерева рисуются выше и не мешают ходить за ними)
// Препятствие под машиной, баком или ящиком. Ссылка хранится в c.obstacle: громила может поднять
// предмет и бросить — тогда препятствие снимается и ставится заново на месте падения
function containerObstacle(c) {
  const pz = PZ_CONTAINERS[c.type];
  if (pz) {
    // Вагоны, грузовики и бочки Промзоны стоят вдоль оси X: препятствие — пятно модели на земле
    const f = pzFrame(pz.model, c.x, c.y, pz.len);
    if (c.type === 'barrel') return { x: c.x, y: c.y, rx: pz.len * 0.45, ry: Math.max(8, f.depth * 0.5), rot: 0 };
    return { rect: true, x1: c.x - pz.len * 0.47, y1: c.y - f.depth / 2, x2: c.x + pz.len * 0.47, y2: c.y + f.depth / 2 };
  }
  const rot = typeof c.dirIdx === 'number' ? -(c.dirIdx / 16) * Math.PI * 2 : 0;
  if (c.type === 'car') {
    const isUaz = c.subType === 'uaz';
    return { x: c.x, y: c.y + 6, rx: isUaz ? 80 : 76, ry: isUaz ? 36 : 30, rot };
  }
  if (c.type === 'trash') return { x: c.x, y: c.y + 6, rx: 24, ry: 22, rot: 0 };
  return { x: c.x, y: c.y + 4, rx: 26, ry: 16, rot };
}

function binObstacle(b) {
  return { x: b.x, y: b.y + 4, rx: 10, ry: 8, rot: 0 };
}

// Переставить предмет: снять старое препятствие и поставить новое на текущем месте
function placeObstacleFor(o, kind) {
  if (o.obstacle) removeObstacle(o.obstacle);
  o.obstacle = kind === 'bin' ? binObstacle(o) : containerObstacle(o);
  addObstacle(o.obstacle);
}

function buildObstacles() {
  obstacleGrid = new Map();
  containers.forEach(c => {
    c.obstacle = containerObstacle(c);
    addObstacle(c.obstacle);
  });
  // Ларёк Михалыча: тело киоска; подойти к прилавку для торговли можно спереди
  addObstacle({ rect: true, x1: safeZone.shopX - 100, y1: safeZone.shopY - 80, x2: safeZone.shopX + 100, y2: safeZone.shopY + 45 });
  // Баррикада обороны у пролома в Промзоне (src/defense.js)
  if (window.Defense) window.Defense.addObstacles();
  // Пост, мастерская и столовая спасённых в городе (src/settlers.js)
  if (window.Settlers) window.Settlers.addObstacles();
  if (window.Basement) window.Basement.addObstacles();

  const env = window.environmentRenderer;
  if (!env) return;
  env.ensureCourtyardLayout(buildings);
  env.courtyardTrees.forEach(t => addObstacle({ x: t.x, y: t.y + 2, rx: 16, ry: 12, rot: 0 }));
  env.staticStreetLamps.forEach(l => addObstacle({ x: l.x, y: l.y, rx: 7, ry: 6, rot: 0 }));
  env.courtyardBenches.forEach(b => addObstacle({ x: b.x, y: b.y + 4, rx: 30, ry: 12, rot: 0 }));
  env.courtyardBins.concat(env.staticSidewalkBins).forEach(b => {
    b.obstacle = binObstacle(b);
    addObstacle(b.obstacle);
  });
  env.courtyardBushes.forEach(b => addObstacle({ x: b.x, y: b.y + 6, rx: 28 * b.scale, ry: 14 * b.scale, rot: 0 }));
}

const _hudCache = {
  hpPct: -1,
  stamPct: -1,
  vodka: -1,
  stew: -1,
  bandage: -1,
  scrap: -1,
  bottles: -1,
  mil_parts: -1,
  alien_core: -1,
  isDrunk: null,
  inSafeZone: null,
  districtId: null,
  lang: null,
  weapon: null
};

// Пишем в DOM только изменившиеся значения: каждая запись innerText в кадре
// пересоздаёт текстовый узел и заставляет браузер заново считать стили и раскладку хотбара
function setHudText(el, text) {
  if (el && el._hudText !== text) {
    el._hudText = text;
    el.innerText = text;
  }
}

function setHudStyle(el, prop, value) {
  if (!el) return;
  const key = '_hudStyle_' + prop;
  if (el[key] !== value) {
    el[key] = value;
    el.style[prop] = value;
  }
}

function updateHUD(forceWeaponRefresh = false) {
  if (player !== localPlayer) return; // HUD — своего Василия (кооп: ход товарища тоже зовёт)
  const hpPct = Math.round(Math.max(0, (player.hp / player.maxHp) * 100));
  if (_hudCache.hpPct !== hpPct) {
    _hudCache.hpPct = hpPct;
    document.getElementById('hp-bar').style.width = `${hpPct}%`;
  }

  const stamPct = Math.round(Math.max(0, (player.stamina / player.maxStamina) * 100));
  if (_hudCache.stamPct !== stamPct) {
    _hudCache.stamPct = stamPct;
    document.getElementById('stamina-bar').style.width = `${stamPct}%`;
  }

  refreshConsumableSlots(); // ячейки 1–3: что в них и сколько
  const toadsLeft = enemies.filter(e => e.type !== 'boss' && e.type !== 'pounder' && !e.defense && !e.summon).length;
  // Босс своей локации: Мясник в городе, Долбильщик в Промзоне
  const bossAlive = currentLocation === 'promzona' ? !!pounderRef : !!bossRef;
  const bossStatus = currentLocation === 'promzona'
    ? (bossAlive ? t('pounder_alive') : t('pounder_dead'))
    : (bossAlive ? t('boss_alive') : t('boss_dead'));
  const clearKey = currentLocation === 'basement' ? 'basement' + currentLang
    : levelCleared ? 'cleared' + currentLang : `${toadsLeft}/${levelEnemyTotal}/${bossAlive ? 1 : 0}/${currentLocation}/${currentLang}`;
  if (_hudCache.clearKey !== clearKey) {
    _hudCache.clearKey = clearKey;
    const el = document.getElementById('clear-counter');
    el.classList.toggle('done', levelCleared);
    el.textContent = currentLocation === 'basement' ? t('basement_hud') : levelCleared ? t('cleared_hud')
      : `🐸 ${t('toads_left')}: ${toadsLeft} / ${levelEnemyTotal}  ·  ${bossStatus}`;
  }
  const cdPct = Math.ceil(player.itemCooldown / CONSUMABLE_COOLDOWN * 20) * 5;
  if (_hudCache.cdPct !== cdPct) {
    _hudCache.cdPct = cdPct;
    document.querySelectorAll('.slot-cd').forEach(el => { el.style.height = cdPct + '%'; });
  }
  // Ресурсы и трофеи на экране не висят — они в инвентаре (I, src/inventory.js)

  if (_hudCache.inSlime !== !!player.inSlime) {
    _hudCache.inSlime = !!player.inSlime;
    const slimeBadge = document.getElementById('slime-badge');
    slimeBadge.textContent = t('status_slime');
    slimeBadge.style.display = player.inSlime ? 'block' : 'none';
  }
  if (_hudCache.isDrunk !== player.isDrunk) {
    _hudCache.isDrunk = player.isDrunk;
    const statusBadge = document.getElementById('status-badge');
    statusBadge.style.display = player.isDrunk ? 'block' : 'none';
  }

  const inSafeZone = Math.hypot(player.x - safeZone.x, player.y - safeZone.y) < safeZone.radius;
  if (_hudCache.inSafeZone !== inSafeZone) {
    _hudCache.inSafeZone = inSafeZone;
    document.getElementById('safe-zone-tag').style.display = inSafeZone ? 'block' : 'none';
  }

  const dist = getDistrictAt(player.x, player.y);
  if (dist && (_hudCache.districtId !== dist.id || _hudCache.lang !== currentLang)) {
    _hudCache.districtId = dist.id;
    _hudCache.lang = currentLang;
    const badgeEl = document.getElementById('district-badge');
    const titleEl = document.getElementById('district-title');
    const metaEl = document.getElementById('district-meta');
    if (badgeEl && titleEl && metaEl) {
      titleEl.innerText = currentLang === 'ru' ? dist.name_ru : dist.name_en;
      titleEl.style.color = dist.color;
      metaEl.innerText = currentLang === 'ru' ? dist.meta_ru : dist.meta_en;
      badgeEl.style.borderColor = dist.color;
    }
  }

  // Полоска здоровья босса — пока он сражается с Василием
  const hudBoss = bossRef || pounderRef;
  const showBossBar = !!(hudBoss && hudBoss.isAggroed && (gameState === 'PLAYING' || gameState === 'PAUSED'));
  setHudStyle(document.getElementById('boss-bar'), 'display', showBossBar ? 'flex' : 'none');
  if (showBossBar && hudBoss === pounderRef) {
    const pct = Math.max(0, Math.round((pounderRef.hp / pounderRef.maxHp) * 1000) / 10);
    setHudStyle(document.getElementById('boss-bar-fill'), 'width', `${pct}%`);
    setHudStyle(document.getElementById('boss-shield-bg'), 'display', 'none');
    const tag = pounderRef.blinking > 0 ? t('pounder_blink') : pounderMiniAlive() ? t('pounder_shielded')
      : pounderRef.phase >= 2 ? t('boss_enraged') : '';
    setHudText(document.getElementById('boss-name'), tag ? `${t('pounder_name')} — ${tag}` : t('pounder_name'));
  } else if (showBossBar) {
    const bossPct = Math.max(0, Math.round((bossRef.hp / bossRef.maxHp) * 1000) / 10);
    setHudStyle(document.getElementById('boss-bar-fill'), 'width', `${bossPct}%`);
    const shieldPct = Math.max(0, Math.round((bossRef.shield / BOSS_SHIELD_MAX) * 1000) / 10);
    setHudStyle(document.getElementById('boss-shield-bg'), 'display', shieldPct > 0 ? 'block' : 'none');
    setHudStyle(document.getElementById('boss-shield-fill'), 'width', `${shieldPct}%`);
    const tag = bossRef.shield > 0 ? t('boss_shield_tag') : bossRef.invuln > 0 ? t('boss_invuln') : bossRef.berserk ? t('boss_berserk') : bossRef.enraged ? t('boss_enraged') : '';
    setHudText(document.getElementById('boss-name'), tag ? `${t('boss_name')} — ${tag}` : t('boss_name'));
  }
  const dazed = player.dazeTimer > 0;
  if (_hudCache.dazed !== dazed || (dazed && _hudCache.dazeLang !== currentLang)) {
    _hudCache.dazed = dazed;
    _hudCache.dazeLang = currentLang;
    const dazeBadge = document.getElementById('daze-badge');
    dazeBadge.textContent = t('status_daze');
    dazeBadge.style.display = dazed ? 'block' : 'none';
  }

  if (gameState === 'PLAYING' && dist && dist.id !== lastPlayerDistrictId) {
    lastPlayerDistrictId = dist.id;
    const label = currentLang === 'ru' ? dist.name_ru : dist.name_en;
    addFloatingText(player.x, player.y - 52, `📍 ${label}`, dist.color);
  }

  // Отображаем в хотбаре ТОЛЬКО купленное/открытое оружие (без спойлера всего арсенала на старте!)
  const allW = [...HOTBAR_WEAPONS];
  allW.forEach(w => {
    const slotEl = document.getElementById(`slot-w-${w}`);
    if (!slotEl) return;

    const unlocked = isEquipped(w);
    setHudStyle(slotEl, 'display', unlocked ? 'flex' : 'none');
    if (!unlocked) return;

    slotEl.classList.toggle('active', player.currentWeapon === w);

    if (w === 'drill') {
      setHudText(document.getElementById('sub-w-drill'), upg('drill_coil') ? '-2.9 ВЫН' : '-4.5 ВЫН');
    } else if (w === 'launcher' || w === 'arc' || w === 'emp') {
      // Мастерская Толика: гранаты, заряд и ячейки, сколько ЭМИ-гранат
      if (window.Workshop) setHudText(document.getElementById(`ammo-w-${w}`), window.Workshop.slotText(w));
      slotEl.classList.toggle('overheated', w === 'arc' && player.empT > 0);
    } else if (w === 'makarov' || w === 'shotgun' || w === 'nagant') {
      const ammoEl = document.getElementById(`ammo-w-${w}`);
      const wrapEl = document.getElementById(`wrap-w-${w}`);
      const barEl = document.getElementById(`bar-w-${w}`);
      // Наган заряжается по патрону — видно, сколько уже в барабане
      if (player.reloadingWeapon === w && w !== 'nagant') {
        setHudText(ammoEl, 'R...');
      } else {
        setHudText(ammoEl, `${player.ammo[w].clip}/${player.ammo[w].reserve}`);
      }
      if (wrapEl && barEl) {
        if (player.reloadingWeapon === w && player.reloadMaxTimer > 0) {
          setHudStyle(wrapEl, 'display', 'block');
          const pct = Math.round((1 - player.reloadTimer / player.reloadMaxTimer) * 100);
          setHudStyle(barEl, 'width', `${pct}%`);
        } else {
          setHudStyle(wrapEl, 'display', 'none');
        }
      }
    } else if (w === 'plasma') {
      const ammoEl = document.getElementById('ammo-w-plasma');
      const wrapEl = document.getElementById('wrap-w-plasma');
      const barEl = document.getElementById('bar-w-plasma');
      slotEl.classList.toggle('overheated', !!player.plasmaOverheated || player.empT > 0);
      if (player.empT > 0) {
        setHudText(ammoEl, `ЭМИ ${Math.ceil(player.empT / 60)}`);
        setHudStyle(ammoEl, 'color', '#7dd3fc');
      } else if (player.plasmaOverheated) {
        setHudText(ammoEl, 'КЛИН!');
        setHudStyle(ammoEl, 'color', '#ef4444');
      } else {
        setHudText(ammoEl, `${Math.round(player.plasmaHeat)}%`);
        setHudStyle(ammoEl, 'color', player.plasmaHeat > 70 ? '#fb923c' : '#38bdf8');
      }
      if (wrapEl && barEl) {
        if (player.plasmaHeat > 0 || player.plasmaOverheated) {
          setHudStyle(wrapEl, 'display', 'block');
          setHudStyle(barEl, 'width', `${Math.round(player.plasmaHeat)}%`);
        } else {
          setHudStyle(wrapEl, 'display', 'none');
        }
      }
    } else if (w === 'laser') {
      // Заряд накопителя, а пока он заряжается — сколько секунд осталось
      const ammoEl = document.getElementById('ammo-w-laser');
      const barEl = document.getElementById('bar-w-laser');
      const charging = player.laserRecharge > 0;
      const pct = charging
        ? Math.round((1 - player.laserRecharge / CARD_EFFECTS.laserRecharge) * 100)
        : Math.round(player.laserCharge / CARD_EFFECTS.laserCharge * 100);
      setHudText(ammoEl, player.empT > 0 ? `ЭМИ ${Math.ceil(player.empT / 60)}` : (charging ? `🔋${Math.ceil(player.laserRecharge / 60)}с` : `${pct}%`));
      slotEl.classList.toggle('overheated', player.empT > 0);
      setHudStyle(ammoEl, 'color', charging ? '#facc15' : '#fca5a5');
      if (barEl) setHudStyle(barEl, 'width', `${pct}%`);
    }
  });

  // Способность на ПКМ (карта Долбильщика или горючая жижа): значок, перезарядка, сколько их на F
  const ab = currentRmbAbility();
  const abEl = document.getElementById('rmb-ability');
  if (abEl) {
    setHudStyle(abEl, 'display', ab ? 'flex' : 'none');
    if (ab) {
      const cdFrames = rmbCooldown(ab);
      const cd = cdFrames > 0 ? Math.ceil(cdFrames / 60) : 0;
      setRmbIcon(document.getElementById('rmb-ability-icon'), ab);
      setHudText(document.getElementById('rmb-ability-more'), rmbAbilities().length > 1 ? 'F ⇄' : '');
      setHudText(document.getElementById('rmb-ability-cd'), cd ? `${cd}` : (currentLang === 'ru' ? 'ПКМ' : 'RMB'));
      abEl.classList.toggle('cooling', cd > 0);
      abEl.classList.toggle('active', player.regenLeft > 0 || player.isDashing);
    }
  }
  updateArmorHud();
}

function createParticles(x, y, color, count = 6) {
  count = count > 0 ? Math.max(1, Math.round(count * particleScale)) : 0;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3.5 + 1.2;
    const maxL = 18 + Math.floor(Math.random() * 10);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 2.8 + 1.6,
      color,
      drag: 0.92,
      life: maxL,
      maxLife: maxL
    });
  }
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 45, vy: -1.2 });
}

// --- ЖАБЬИ ТРОФЕИ ---
// Глаза, лапки и печень падают только с жаб и только с шансом. На них Михалыч ставит все перки
// Василия и собирает Плазмаган: обыском тайников их не набрать, за ними нужно драться.
// Шансы — у каждого вида свой главный трофей; в Квако-гнёздах он падает чаще
const TROPHY_DROPS = {
  grunt: [['toad_leg', 0.5], ['toad_eye', 0.15], ['toad_liver', 0.08]],
  sniper: [['toad_eye', 0.65], ['toad_leg', 0.15], ['toad_liver', 0.05]],
  brute: [['toad_liver', 0.65], ['toad_eye', 0.2], ['toad_leg', 0.2]],
  // Новые жабы Промзоны: главный трофей — плазменная ячейка из автомата штурмовика и квако-заряд ракетчика
  // (лут Промзоны, PZ_LOOT_NAMES), плюс жабьи трофеи
  stormtrooper: [['plasma_cell', 0.5], ['toad_leg', 0.45], ['toad_eye', 0.3], ['toad_liver', 0.1]],
  rocketeer: [['kvako_charge', 0.5], ['toad_liver', 0.45], ['toad_eye', 0.35], ['toad_leg', 0.25]]
};
const TROPHY_NEST_BONUS = 0.15;
// С жаб чермета больше, чем раньше: тайники урезаны (STASH_YIELD), доход сдвинут в сторону боя
const ENEMY_SCRAP_YIELD = 1.4;
const TROPHY_NAMES = {
  toad_eye: ['ЖАБИЙ ГЛАЗ', 'TOAD EYE', '#fde047'],
  toad_leg: ['ЖАБЬЯ ЛАПКА', 'TOAD LEG', '#86efac'],
  toad_liver: ['ЖАБЬЯ ПЕЧЕНЬ', 'TOAD LIVER', '#fda4af']
};

// --- ЛУТ ПРОМЗОНЫ (docs/LEVEL2_PROMZONA.md, раздел 8) ---
// Тратится в новых местах города — мастерской, столовой, подвале (этапы 6–7). Цветмет — из вагонов и грузовиков
// и с жаб в цехах и на сортировке, техспирт — из цистерн, бочек и с жаб у заводоуправления и резервуаров
// (pzLoot района), плазменные ячейки и квако-заряды — трофеи штурмовиков и ракетчиков, чертежи — только
// из сейфов (SAFE_LOOT в src/safes.js). В городе не падает. Виден в инвентаре (I, src/inventory.js)
// и в кошельке лавки — когда Василий побывал в Промзоне
const PZ_LOOT_NAMES = {
  nonferrous: ['ЦВЕТМЕТ', 'NON-FERROUS METAL', '#fb923c'],
  blueprint: ['ЧЕРТЁЖ', 'BLUEPRINT', '#60a5fa'],
  tech_spirit: ['ТЕХСПИРТ', 'TECH ALCOHOL', '#cbd5e1'],
  plasma_cell: ['ПЛАЗМЕННАЯ ЯЧЕЙКА', 'PLASMA CELL', '#67e8f9'],
  kvako_charge: ['КВАКО-ЗАРЯД', 'KVAKO CHARGE', '#a3e635'],
  electronics: ['ПРОДВИНУТАЯ ЭЛЕКТРОНИКА', 'ADVANCED ELECTRONICS', '#7dd3fc']
};

// Лут района Промзоны с убитой жабы (pzLoot района): громилы роняют вдвое чаще
function dropPromzonaLoot(x, y, eType, dist) {
  if (!dist.pzLoot) return;
  dist.pzLoot.forEach(([kind, chance], i) => {
    if (Math.random() < chance * (eType === 'brute' ? 2 : 1)) spawn3DLootItem(x - 14 + i * 28, y + 22, kind, 1);
  });
}

function dropTrophies(x, y, eType, districtId) {
  const list = TROPHY_DROPS[eType];
  if (!list) return;
  let n = 0;
  list.forEach(([kind, chance], i) => {
    const p = chance + (i === 0 && districtId === 'nest' ? TROPHY_NEST_BONUS : 0);
    if (Math.random() >= p) return;
    const a = -Math.PI / 2 + (n - 0.5) * 1.1;
    spawn3DLootItem(x + Math.cos(a) * 24, y + Math.sin(a) * 18 - 4, kind, 1);
    n++;
  });
}

function spawnLootDrop(enemyOrX, yOpt) {
  const isEnemyObj = (typeof enemyOrX === 'object' && enemyOrX !== null);
  if (isEnemyObj && enemyOrX.noLoot) return; // повтор обороны у пролома (src/defense.js)
  const x = isEnemyObj ? enemyOrX.x : enemyOrX;
  const y = isEnemyObj ? enemyOrX.y : yOpt;
  const eType = isEnemyObj ? (enemyOrX.type || 'grunt') : 'grunt';
  // Свой лут у новых жаб — на этапе 4 (новые ресурсы); пока штурмовик — как снайпер, ракетчик — как громила
  const lootType = eType === 'stormtrooper' ? 'sniper' : (eType === 'rocketeer' ? 'brute' : eType);
  const dist = getDistrictAt(x, y);
  const prof = PZ_ENEMY_PROFILE[dist.id] || dist.id; // район Промзоны — как городской той же угрозы
  const bMult = dist.bottleMult || 1.0;
  const sMult = (dist.scrapMult || 1.0) * ENEMY_SCRAP_YIELD;

  if (lootType === 'brute') {
    const scrapVal = Math.round((2 + Math.floor(Math.random() * 3)) * sMult);
    const bottleVal = Math.round((2 + Math.floor(Math.random() * 2)) * bMult);
    spawn3DLootItem(x - 16, y - 6, 'scrap', scrapVal);
    spawn3DLootItem(x + 16, y - 6, 'bottle', bottleVal);

    if (prof === 'cordon') {
      if (Math.random() < 0.7) spawn3DLootItem(x, y + 16, 'mil_parts', 1);
    } else if (prof === 'nest') {
      if (Math.random() < 0.25) spawn3DLootItem(x - 12, y + 16, 'alien_core', 1);
      if (Math.random() < 0.2) spawn3DLootItem(x + 14, y + 16, 'mil_parts', 1);
    } else if (Math.random() < 0.55) {
      const supplyPool = ['vodka', 'stew', 'bandage'];
      spawn3DLootItem(x, y + 16, supplyPool[Math.floor(Math.random() * supplyPool.length)], 1);
    }
  } else if (lootType === 'sniper') {
    const bottleVal = Math.round((2 + Math.floor(Math.random() * 2)) * bMult);
    spawn3DLootItem(x - 10, y, 'bottle', bottleVal);
    if (prof === 'nest' && Math.random() < 0.2) {
      spawn3DLootItem(x + 12, y + 6, 'alien_core', 1);
    } else if (prof === 'cordon' && Math.random() < 0.3) {
      spawn3DLootItem(x + 12, y + 6, 'mil_parts', 1);
    } else if (Math.random() < 0.42) {
      spawn3DLootItem(x + 12, y + 6, Math.random() < 0.5 ? 'bandage' : 'ammo_9x18', 6);
    } else if (prof === 'garages') {
      spawn3DLootItem(x + 12, y + 6, 'scrap', Math.round(2 * sMult));
    }
  } else {
    const r = Math.random();
    const scrapBias = prof === 'garages' ? 0.78 : (prof === 'courtyards' ? 0.30 : 0.58);
    if (r < scrapBias) {
      const val = Math.max(1, Math.round((1 + Math.floor(Math.random() * 2)) * sMult));
      spawn3DLootItem(x, y, 'scrap', val);
    } else {
      const val = Math.max(1, Math.round((1 + Math.floor(Math.random() * 2)) * bMult));
      spawn3DLootItem(x, y, 'bottle', val);
    }
    if (prof === 'cordon' && Math.random() < 0.15) {
      spawn3DLootItem(x + 14, y - 8, 'mil_parts', 1);
    } else if (prof === 'nest' && Math.random() < 0.1) {
      spawn3DLootItem(x + 14, y - 8, 'alien_core', 1);
    }
  }
  if (isEnemyObj) {
    dropTrophies(x, y, eType, prof);
    // Прорыв (spawnBreakthrough): громила несёт свою долю того, чего не хватает на Плазмаган
    if (enemyOrX.bonusLoot) {
      let i = 0;
      for (const k in enemyOrX.bonusLoot) {
        const a = Math.PI / 2 + (i++) * 0.9;
        spawn3DLootItem(x + Math.cos(a) * 30, y + Math.sin(a) * 20 + 10, k === 'bottles' ? 'bottle' : k, enemyOrX.bonusLoot[k]);
      }
    }
    dropPromzonaLoot(x, y, eType, dist);
  }
}

function handleEnemyKilled(index) {
  const dead = enemies[index];
  if (!dead) return;
  if (dead.type === 'boss') {
    // Босс появляется один раз за забег — без респавна
    enemies.splice(index, 1);
    onBossDefeated(dead);
    return;
  }
  if (dead.type === 'pounder') {
    enemies.splice(index, 1);
    onPounderDefeated(dead);
    return;
  }
  if (dead.throwState) cancelThrow(dead);
  createParticles(dead.x, dead.y, dead.type === 'brute' ? '#a855f7' : '#16a34a', 22);
  spawnLootDrop(dead);
  enemies.splice(index, 1);
  // Респауна нет: цель локации — перебить всех (см. checkLevelCleared)
}

// --- БОСС ПРОМЗОНЫ «МЕЖПРОСТРАНСТВЕННЫЙ ДОЛБИЛЬЩИК» (логово в СЗ углу у градирен, docs/LEVEL2_PROMZONA.md, этап 9) ---
// Молот-долбёжник: удар сверху (кольцо перед собой), размах на 240°, электрический молот — разряд по земле
// прямой с оглушением, прыжок с ударом при приземлении. Фазы:
//   - с 50% здоровья — «электробуря»: удар в землю, от него расходятся электрические кольца (урон и
//     оглушение, перекатом можно перепрыгнуть), сразу за ним — юла: крутится с молотом и несётся на Василия;
//     потом шатается — окно для атаки. Комбо повторяется раз в POUNDER_STORM_CD;
//   - с 20% — мерцание: 15 с неуязвим и перескакивает, и расслаивается — две копии чуть слабее, с теми же
//     приёмами. Мерцание повторяется раз в 40 с. Погиб он — копии рассыпаются.
// Щита, как у Мясника, нет. Рисует его window.threePounder (three_boss.js), клипы —
// tools/build_promzona_boss_blender.py
const POUNDER_HOME = { x: 660, y: 640 };
const POUNDER_LAIR_R = 330;            // площадка логова на земле; жабы и деревья туда не ставятся
const POUNDER_LEASH = 1050;            // дальше Василий — уходит домой и зализывает раны
const POUNDER_MAX_HP = 9000;            // чистого урона ~40–75 с при базовом 56 и мастерской (docs/BALANCE.md, «Бой в Промзоне»)
const POUNDER_ARMOR = 0.35;            // ржавые наплечники спереди, со спины — полный урон
const POUNDER_REGEN = 0.0004;          // доля здоровья за кадр вне боя
// Тайминги — кадры при 60 Гц, как фазы клипов. reach — насколько впереди центр кольца удара сверху;
// arc — половина угла размаха; у прыжка windup = присед (squat) + полёт
const POUNDER_ATTACKS = {
  slam: { windup: 44, active: 6, recover: 42, range: 160, reach: 70, damage: 70 },
  sweep: { windup: 30, active: 10, recover: 34, range: 190, arc: 2.09, damage: 50 },
  electric: { windup: 56, active: 12, recover: 40, range: 480, width: 64, damage: 35, stun: 90, cooldown: 540 },
  leap: { windup: 70, squat: 36, active: 6, recover: 44, range: 140, maxJump: 400, height: 120, damage: 60, cooldown: 420 },
  // Электробуря: удар в землю, кольца расходятся (rings штук через ringGap кадров, ringSpeed px/кадр до range)
  storm: { windup: 50, active: 6, recover: 20, range: 560, rings: 3, ringGap: 26, ringSpeed: 6, ringWidth: 26, damage: 25, stun: 60 },
  // Юла: active кадров несётся на Василия, доворачивая не быстрее turn рад/кадр; касание — урон раз в hitEvery
  spin: { windup: 16, active: 240, recover: 110, speed: 3.7, turn: 0.035, range: 70, damage: 30, hitEvery: 30 },
  // Притягивание: луч к Василию (видно в замахе), кто в луче — рывком к Долбильщику и оглушён. Раз в 40 с
  hook: { windup: 44, active: 10, recover: 30, range: 620, width: 70, land: 105, damage: 20, stun: 60, cooldown: 2400 },
  // Лёгкие удары малой копии: те же удар сверху и размах, только короче и слабее
  miniSlam: { base: 'slam', windup: 30, active: 6, recover: 28, range: 100, reach: 45, damage: 70 },
  miniSweep: { base: 'sweep', windup: 22, active: 8, recover: 24, range: 120, arc: 2.09, damage: 50 }
};
// Малая копия: раз в 1,5 мин отщепляется (первая — через 20 с боя), быстрая, только простые удары,
// своё здоровье; пока она жива, Долбильщика не взять
const POUNDER_MINI = { first: 1200, every: 5400, hp: 1000, speed: 3.0, scale: 0.62, dmg: 0.4 };
// На 40% здоровья призывает кольцом вокруг себя снайперов гнезда: стоят на месте и стреляют
const POUNDER_SNIPERS_AT = 0.4;
const POUNDER_SNIPERS = 10;
const POUNDER_STORM_AT = 0.5;
const POUNDER_STORM_CD = 1200;         // 20 с между электробурями
const POUNDER_CLONES_AT = 0.2;
const POUNDER_CLONE_HP = 0.25;         // доля здоровья хозяина у копии
const POUNDER_CLONE_DMG = 0.75;        // и доля урона
const POUNDER_BLINK = 900;             // 15 с неуязвимости
const POUNDER_BLINK_CD = 2400;         // 40 с перезарядки после мерцания
const POUNDER_HOP = 120;               // перескок раз в ~2 с (+ до 40 случайно)
// «Не уйдёшь»: бой начат, когда снято больше 15% здоровья. Дальше из логова не уйти: убежал дальше
// дальнего удара (разряд молота) — через 2 с его выдёргивает к Долбильщику
const POUNDER_PULL_AT = 0.85;
const POUNDER_PULL_DELAY = 120;
// Энергетический барьер: с начала боя (то же — снято 15%) вокруг места боя встаёт кольцо, сквозь которое
// Василию не выйти, и перекатом тоже. Радиус — шире дальнего удара; держится, пока Долбильщик жив
const POUNDER_ARENA_R = 600;
const POUNDER_ARENA_RISE = 40;         // кадров, пока стена поднимается
let pounderRef = null;
let pounderRings = [];                 // электрические кольца бури: { x, y, r, life, owner, hit }

function newPounder(x, y, hp, extra) {
  return Object.assign({
    type: 'pounder',
    x, y,
    radius: 40,
    hp, maxHp: hp,
    armor: POUNDER_ARMOR,
    dmgMult: 1,
    speed: 1.8,
    aggroRadius: 420,
    isAggroed: false,
    districtId: 'pz_cooling', tier: 4,
    hitFlash: 0,
    angle: Math.PI / 2,
    animTimer: 0,
    isMoving: false,
    attack: null,
    attackCooldown: 0,
    electricCd: 0,
    leapCd: 0,
    stormCd: 0,
    hookCd: 300,                         // первое притягивание — через 5 с боя
    phase: 1,
    blinking: 0,
    blinkCd: 0,
    hopTimer: 0,
    blinkAnim: 0,
    z: 0,
    introShown: false
  }, extra);
}

function spawnPounder() {
  pounderRef = newPounder(POUNDER_HOME.x, POUNDER_HOME.y, POUNDER_MAX_HP, {});
  enemies.push(pounderRef);
}

// Свободное место в 120–200 px от точки, внутри логова
function pounderFreeSpot(e, cx, cy) {
  for (let k = 0; k < 16; k++) {
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 80;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * GROUND_SQUASH;
    if (Math.hypot(x - POUNDER_HOME.x, y - POUNDER_HOME.y) > POUNDER_LEASH * 0.8) continue;
    if (x < 80 || y < 80 || checkWalkCollision(x, y, e.radius, footDY(e))) continue;
    return { x, y };
  }
  return null;
}

// Перескок через измерения: вспышка там и тут
function pounderHop(e, tx, ty) {
  let x = tx, y = ty;
  if (x === undefined) {
    const s = pounderFreeSpot(e, e.x, e.y);
    if (!s) return;
    x = s.x;
    y = s.y;
  }
  spawnDirectionalSparks(e.x, e.y - 60, -Math.PI / 2, Math.PI * 2, 14, '#c084fc', 3, 10, 14);
  createParticles(e.x, e.y - 40, '#a855f7', 10);
  e.x = x;
  e.y = y;
  e.blinkAnim = 16;
  spawnDirectionalSparks(x, y - 60, -Math.PI / 2, Math.PI * 2, 14, '#e9d5ff', 3, 10, 14);
  const vol = enemySoundVolume(x, y);
  if (vol > 0) SoundFX.toadPlasma(vol);
}

// 20%: расслаивается — две копии рядом, сразу в бой
function spawnPounderClones(e) {
  for (let i = 0; i < 2; i++) {
    const s = pounderFreeSpot(e, e.x, e.y) || { x: e.x + (i ? 90 : -90), y: e.y };
    const c = newPounder(s.x, s.y, Math.round(e.maxHp * POUNDER_CLONE_HP), {
      isClone: true, dmgMult: POUNDER_CLONE_DMG, isAggroed: true, introShown: true,
      phase: 2, stormCd: 300 + i * 360, electricCd: 120 + i * 200, blinkAnim: 16, attackCooldown: 40 + i * 30
    });
    enemies.push(c);
    spawnDirectionalSparks(s.x, s.y - 60, -Math.PI / 2, Math.PI * 2, 20, '#e9d5ff', 4, 12, 16);
  }
}

function startPounderAttack(e, key) {
  const def = POUNDER_ATTACKS[key];
  const tempo = e.phase >= 2 ? 0.85 : 1.0;
  const a = {
    key, kind: def.base || key, phase: 'windup', t: 0,
    windup: Math.round(def.windup * tempo),
    recover: Math.round(def.recover * tempo),
    aim: Math.atan2(player.y - e.y, player.x - e.x),
    hit: false
  };
  if (key === 'electric') e.electricCd = def.cooldown;
  if (key === 'leap') {
    e.leapCd = def.cooldown;
    a.squat = Math.round(def.squat * tempo);
  }
  if (key === 'storm') e.stormCd = POUNDER_STORM_CD;
  if (key === 'hook') e.hookCd = def.cooldown;
  // Замах: энергоядро молота заряжается — слышно перед электрическими приёмами
  if (key === 'electric' || key === 'storm' || key === 'hook') SoundFX.bossFx('pounder_wind', e.x, e.y);
  e.attack = a;
}

// Куда приземлится прыжок: к Василию, не дальше maxJump, на свободное место
function pounderLeapTarget(e, def) {
  const d = Math.min(def.maxJump, Math.hypot(player.x - e.x, player.y - e.y));
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  for (let s = d; s > 0; s -= 20) {
    const x = e.x + Math.cos(a) * s, y = e.y + Math.sin(a) * s;
    if (!checkWalkCollision(x, y, e.radius, footDY(e))) return { x, y };
  }
  return { x: e.x, y: e.y };
}

// Центр кольца удара сверху: молот бьёт в землю перед ним
function pounderSlamCenter(e, a) {
  const def = POUNDER_ATTACKS[a.key];
  return { x: e.x + Math.cos(a.aim) * def.reach, y: e.y + 4 + Math.sin(a.aim) * def.reach * GROUND_SQUASH };
}

// Удар по Василию с учётом силы копии
function pounderHit(e, damage, kind = 'melee') {
  bossHitPlayer(e, Math.round(damage * e.dmgMult), kind);
}

function onPounderStrike(e, a, def) {
  if (a.kind === 'slam') {
    const c = pounderSlamCenter(e, a);
    spawnShockwave(c.x, c.y, def.range, '#a855f7', 28);
    spawnDirectionalSparks(c.x, c.y, -Math.PI / 2, Math.PI * 2, 16, '#c084fc', 4, 12, 16);
    shakeScreen(16, 14);
    SoundFX.bossFx('pounder_slam', c.x, c.y);
  } else if (a.kind === 'sweep') {
    muzzleFlashes.push({ x: e.x, y: e.y - 30, angle: a.aim, type: 'boss_slash', life: 12, maxLife: 12, scale: def.range / 54 });
    SoundFX.bossFx('pounder_sweep', e.x, e.y);
  } else if (a.key === 'electric') {
    // Боёк в землю — разряд бежит по земле прямой
    a.bolt = { x: e.x + Math.cos(a.aim) * 50, y: e.y + 4 + Math.sin(a.aim) * 50 * GROUND_SQUASH };
    spawnDirectionalSparks(a.bolt.x, a.bolt.y, -Math.PI / 2, Math.PI * 2, 18, '#e9d5ff', 4, 12, 14);
    shakeScreen(10, 8);
    SoundFX.bossFx('pounder_electric', e.x, e.y);
  } else if (a.key === 'leap') {
    e.z = 0;
    spawnShockwave(e.x, e.y + 4, def.range, '#a855f7', 30);
    spawnDirectionalSparks(e.x, e.y, -Math.PI / 2, Math.PI * 2, 20, '#c084fc', 4, 12, 16);
    shakeScreen(22, 18);
    SoundFX.bossFx('pounder_land', e.x, e.y);
  } else if (a.key === 'storm') {
    spawnShockwave(e.x, e.y + 4, 180, '#c084fc', 30);
    spawnDirectionalSparks(e.x, e.y, -Math.PI / 2, Math.PI * 2, 26, '#e9d5ff', 4, 13, 18);
    shakeScreen(28, 20);
    SoundFX.bossFx('pounder_storm', e.x, e.y);
    a.ringsLeft = def.rings;
    a.ringTimer = 0;
  } else if (a.key === 'spin') {
    SoundFX.bossFx('pounder_spin', e.x, e.y);
  } else if (a.key === 'hook') {
    // Луч схватил: кто в луче и не в перекате — рывок к Долбильщику
    const fy = player.y + footDY(player);
    const along = (player.x - e.x) * Math.cos(a.aim) + (fy - e.y) * Math.sin(a.aim);
    const across = Math.abs(-(player.x - e.x) * Math.sin(a.aim) + (fy - e.y) * Math.cos(a.aim));
    a.bolt = { x: e.x, y: e.y - 60, len: def.range };
    SoundFX.bossFx('pounder_hook', e.x, e.y);
    if (along > 0 && along < def.range && across < def.width / 2 + player.radius * 0.5 && !player.isRolling && !playerDodged()) {
      let to = null;
      for (let r = def.land; r <= def.land + 120 && !to; r += 20) {
        for (const off of [0, 0.4, -0.4, 0.8, -0.8]) {
          const x = e.x + Math.cos(a.aim + off) * r, y = e.y + Math.sin(a.aim + off) * r * GROUND_SQUASH;
          if (!checkWalkCollision(x, y, player.radius, footDY(player))) { to = { x, y }; break; }
        }
      }
      if (to) {
        a.drag = { fx: player.x, fy: player.y, tx: to.x, ty: to.y };
        player.isRolling = false;
        const dmg = Math.round(def.damage * e.dmgMult);
        player.hp -= armorAbsorb(dmg, 'energy');
        addFloatingText(player.x - 40, player.y - 80, currentLang === 'ru' ? `↯ Притянул! -${dmg}` : `↯ Hooked! -${dmg}`, '#e9d5ff');
        if (player.hp <= 0) gameOver();
      }
    }
  }
}

function updatePounderStrike(e, a, def) {
  const dx = player.x - e.x, dy = player.y - e.y;
  const dist = Math.hypot(dx, dy);
  const footY = player.y + footDY(player);
  // Площадные удары задевают всех, кто в зоне (кооп: forEachPlayer), а не только того, на кого шёл
  if (a.kind === 'slam') {
    const c = pounderSlamCenter(e, a);
    if (a.t === 1) forEachPlayer(() => {
      if (inGroundEllipse(player.x, player.y + footDY(player), c.x, c.y, def.range + player.radius * 0.5)) pounderHit(e, def.damage);
    });
  } else if (a.kind === 'sweep') {
    if (a.t === 3) forEachPlayer(() => {
      const dx = player.x - e.x, dy = player.y - e.y;
      if (Math.hypot(dx, dy) >= def.range + player.radius) return;
      let diff = Math.atan2(dy, dx) - a.aim;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const hp0 = player.hp;
      if (Math.abs(diff) < def.arc) pounderHit(e, def.damage);
      if (player.hp < hp0) {
        // Размах отбрасывает
        player.stunTimer = Math.max(player.stunTimer || 0, 14);
        player.knockFrames = 14;
        player.knockVx = Math.cos(Math.atan2(dy, dx)) * 12;
        player.knockVy = Math.sin(Math.atan2(dy, dx)) * 12;
      }
    });
  } else if (a.key === 'electric') {
    // Фронт разряда за active кадров пробегает всю длину; кого догнал в полосе — урон и оглушение
    const front = def.range * Math.min(1, a.t / def.active);
    const fx = a.bolt.x + Math.cos(a.aim) * front, fy = a.bolt.y + Math.sin(a.aim) * front;
    spawnDirectionalSparks(fx, fy, -Math.PI / 2, Math.PI * 1.5, 3, '#d8b4fe', 3, 8, 10);
    const hits = a.hits || (a.hits = new Set());
    forEachPlayer(p => {
      const fy0 = player.y + footDY(player);
      const along = (player.x - a.bolt.x) * Math.cos(a.aim) + (fy0 - a.bolt.y) * Math.sin(a.aim);
      const across = Math.abs(-(player.x - a.bolt.x) * Math.sin(a.aim) + (fy0 - a.bolt.y) * Math.cos(a.aim));
      if (!hits.has(p) && along > -player.radius && along < front && across < def.width / 2 + player.radius * 0.5) {
        hits.add(p);   // кого фронт прошёл — того уже не ударит, даже если увернулся
        const hp0 = player.hp;
        pounderHit(e, def.damage, 'energy');
        if (player.hp < hp0) dazePlayer(def.stun, def.stun, 0.6);
      }
    });
  } else if (a.key === 'leap') {
    if (a.t === 1) forEachPlayer(() => {
      if (inGroundEllipse(player.x, player.y + footDY(player), e.x, e.y + 4, def.range + player.radius * 0.5)) pounderHit(e, def.damage);
    });
  } else if (a.key === 'storm') {
    // Кольца выпускаются и в фазе восстановления — см. advancePounderAttack
  } else if (a.key === 'hook') {
    // Тащит рывком по лучу; в конце — оглушение
    if (a.drag) {
      const k = Math.min(1, a.t / def.active);
      player.x = a.drag.fx + (a.drag.tx - a.drag.fx) * k;
      player.y = a.drag.fy + (a.drag.ty - a.drag.fy) * k;
      player.stunTimer = Math.max(player.stunTimer || 0, 2);
      if (a.t % 2 === 0) createParticles(player.x, player.y - 30, '#c084fc', 3);
      if (a.t >= def.active) dazePlayer(def.stun, def.stun, 0.6);
    }
  } else if (a.key === 'spin') {
    // Юла: несётся на Василия, доворачивая медленно — от неё можно уйти в сторону
    const want = Math.atan2(dy, dx);
    a.dir = turnToward(a.dir === undefined ? want : a.dir, want, def.turn);
    const px = e.x, py = e.y;
    slideMove(e, Math.cos(a.dir) * def.speed, Math.sin(a.dir) * def.speed, e.radius, true);
    a.aim += 0.55;                          // модель крутится
    if (a.t % 3 === 0) spawnDirectionalSparks(e.x, e.y - 20, a.aim, 0.6, 2, '#c084fc', 3, 9, 10);
    if (a.t % 4 === 0) createParticles(e.x, e.y + 10, '#78716c', 2);
    // Задевает всех, на кого налетела; у каждого своя пауза между ударами
    const cds = a.hitCds || (a.hitCds = new Map());
    forEachPlayer(p => {
      const cd = Math.max(0, (cds.get(p) || 0) - 1);
      cds.set(p, cd);
      const away = Math.atan2(player.y - e.y, player.x - e.x);
      if (cd === 0 && Math.hypot(player.x - e.x, player.y - e.y) < def.range + player.radius) {
        cds.set(p, def.hitEvery);
        const hp0 = player.hp;
        pounderHit(e, def.damage);
        if (player.hp < hp0) {
          player.stunTimer = Math.max(player.stunTimer || 0, 12);
          player.knockFrames = 12;
          player.knockVx = Math.cos(away) * 14;
          player.knockVy = Math.sin(away) * 14;
        }
      }
    });
    // Упёрся в стену надолго — раскрутка кончается раньше
    a.stuck = Math.hypot(e.x - px, e.y - py) < def.speed * 0.2 ? (a.stuck || 0) + 1 : 0;
    if (a.stuck > 40) a.t = def.active;
  }
}

// Кольца бури расходятся и после удара, пока он стоит в восстановлении
function emitStormRings(e, a) {
  const def = POUNDER_ATTACKS.storm;
  if (!(a.ringsLeft > 0)) return;
  if (--a.ringTimer > 0) return;
  a.ringTimer = def.ringGap;
  a.ringsLeft--;
  pounderRings.push({ x: e.x, y: e.y + 4, r: 30, owner: e, hit: false });
}

function updatePounderRings() {
  const def = POUNDER_ATTACKS.storm;
  for (let i = pounderRings.length - 1; i >= 0; i--) {
    const ring = pounderRings[i];
    const prev = ring.r;
    ring.r += def.ringSpeed;
    if (ring.r > def.range) {
      pounderRings.splice(i, 1);
      continue;
    }
    // Василий там, где прошла кромка кольца: оглушение и урон, перекат — перепрыгнул. Кольцо бьёт каждого раз
    const hits = ring.hits || (ring.hits = new Set());
    enemyActing = ring.owner;
    forEachPlayer(p => {
      if (hits.has(p) || player.isRolling) return;
      const d = Math.hypot((player.x - ring.x), (player.y + footDY(player) - ring.y) / GROUND_SQUASH);
      if (d > prev - def.ringWidth / 2 && d < ring.r + def.ringWidth / 2) {
        hits.add(p);
        const hp0 = player.hp;
        pounderHit(ring.owner, def.damage, 'energy');
        if (player.hp < hp0) dazePlayer(def.stun, def.stun, 0.6);
      }
    });
    enemyActing = null;
  }
}

function advancePounderAttack(e) {
  const a = e.attack;
  const def = POUNDER_ATTACKS[a.key];
  a.t++;
  if (a.phase === 'windup') {
    if (a.key === 'leap') {
      if (a.t <= a.squat) {
        // Приседает и целится: место приземления — где Василий в конце приседа
        a.aim = Math.atan2(player.y - e.y, player.x - e.x);
        a.target = pounderLeapTarget(e, def);
        a.from = { x: e.x, y: e.y };
      } else {
        const k = Math.min(1, (a.t - a.squat) / Math.max(1, a.windup - a.squat));
        e.x = a.from.x + (a.target.x - a.from.x) * k;
        e.y = a.from.y + (a.target.y - a.from.y) * k;
        e.z = 4 * def.height * k * (1 - k);
      }
    } else if (a.windup - a.t > BOSS_AIM_LOCK_FRAMES) {
      a.aim = Math.atan2(player.y - e.y, player.x - e.x);
    }
    e.angle = a.aim;
    if (a.t >= a.windup) {
      a.phase = 'active';
      a.t = 0;
      onPounderStrike(e, a, def);
    }
  } else if (a.phase === 'active') {
    updatePounderStrike(e, a, def);
    if (a.key === 'storm') emitStormRings(e, a);
    if (a.t >= def.active) {
      a.phase = 'recover';
      a.t = 0;
      if (a.key === 'spin') addFloatingText(e.x - 30, e.y - 150, currentLang === 'ru' ? '💫 шатается' : '💫 dizzy', '#e9d5ff');
    }
  } else {
    if (a.key === 'storm') emitStormRings(e, a);
    if (a.t >= a.recover && !(a.ringsLeft > 0)) {
      // За бурей — сразу юла
      if (a.key === 'storm') {
        startPounderAttack(e, 'spin');
        return;
      }
      e.attack = null;
      e.attackCooldown = e.phase >= 2 ? 14 : 26;
    }
  }
}

function choosePounderAttack(e, dist) {
  if (e.isMini) return dist < 110 ? (Math.random() < 0.5 ? 'miniSlam' : 'miniSweep') : null;
  if (e.hookCd <= 0 && dist > 200 && dist < POUNDER_ATTACKS.hook.range - 40) return 'hook';
  if (e.phase >= 2 && e.stormCd <= 0 && dist < 500) return 'storm';
  if (dist < 150) return Math.random() < 0.45 ? 'slam' : 'sweep';
  if (dist < 470 && dist > 160 && e.electricCd <= 0) return 'electric';
  if (dist > 250 && dist < 470 && e.leapCd <= 0) return 'leap';
  return null;
}

// Домой — шагом; застрял — домой перескоком (он же межпространственный)
function pounderWalkHome(e, speed) {
  const hx = POUNDER_HOME.x - e.x, hy = POUNDER_HOME.y - e.y;
  const d = Math.hypot(hx, hy);
  e.isMoving = d > 6;
  if (!e.isMoving) return;
  e.angle = Math.atan2(hy, hx);
  const step = Math.min(speed, d);
  const px = e.x, py = e.y;
  slideMove(e, (hx / d) * step, (hy / d) * step, e.radius, true);
  e.stuckFrames = Math.hypot(e.x - px, e.y - py) < step * 0.2 ? (e.stuckFrames || 0) + 1 : 0;
  if (e.stuckFrames > 120) {
    e.stuckFrames = 0;
    pounderHop(e, POUNDER_HOME.x, POUNDER_HOME.y);
  }
}

// Переходы фаз — только у хозяина, не у копий
function updatePounderPhases(e) {
  if (e.phase < 2 && e.hp < e.maxHp * POUNDER_STORM_AT) {
    e.phase = 2;
    e.stormCd = 0;
    addFloatingText(e.x - 60, e.y - 150, `⚡ ${t('pounder_storm')}`, '#c084fc');
    spawnDirectionalSparks(e.x, e.y - 40, -Math.PI / 2, Math.PI * 2, 24, '#a855f7', 4, 11, 18);
    SoundFX.bossFx('pounder_phase', e.x, e.y);
  }
  if (!e.snipersCalled && e.hp < e.maxHp * POUNDER_SNIPERS_AT) {
    e.snipersCalled = true;
    summonPounderSnipers(e);
  }
  if (e.phase < 3 && e.hp < e.maxHp * POUNDER_CLONES_AT) {
    e.phase = 3;
    e.attack = null;
    e.z = 0;
    e.blinking = POUNDER_BLINK;
    e.hopTimer = 30;
    e.blinkAnim = 16;
    addFloatingText(e.x - 120, e.y - 150, `✦ ${t('pounder_clones')}`, '#e9d5ff');
    spawnDirectionalSparks(e.x, e.y - 60, -Math.PI / 2, Math.PI * 2, 30, '#c084fc', 4, 12, 18);
    shakeScreen(24, 16);
    SoundFX.bossFx('pounder_phase', e.x, e.y);
    spawnPounderClones(e);
  }
}

function updatePounder(e, playerInSafe, hasFumeAura) {
  e.animTimer++;
  if (e.hitFlash > 0) e.hitFlash--;
  if (e.attackCooldown > 0) e.attackCooldown -= players.length > 1 ? coopScale().bossRate : 1;
  if (e.electricCd > 0) e.electricCd--;
  if (e.leapCd > 0) e.leapCd--;
  if (e.stormCd > 0) e.stormCd--;
  if (e.hookCd > 0) e.hookCd--;
  // Малая копия: раз в 1,5 мин, если прежняя уже убита (только у хозяина, в бою)
  if (!e.isClone && e.isAggroed) {
    if (e.miniCd === undefined) e.miniCd = POUNDER_MINI.first;
    if (e.miniCd > 0) e.miniCd--;
    else if (!pounderMiniAlive()) {
      e.miniCd = POUNDER_MINI.every;
      spawnPounderMini(e);
    }
  }
  if (e.blinkAnim > 0) e.blinkAnim--;
  if (!(e.z > 0)) unstickBoss(e);

  const dx = player.x - e.x, dy = player.y - e.y;
  const dist = Math.hypot(dx, dy);
  const playerInLair = Math.hypot(player.x - POUNDER_HOME.x, player.y - POUNDER_HOME.y) < POUNDER_LEASH;
  if (!e.isAggroed && dist < e.aggroRadius && !playerInSafe) {
    e.isAggroed = true;
    if (!e.isClone && !e.isMini) introducePounder();
  }
  if (e.isAggroed && !e.isClone && e.hp < e.maxHp * POUNDER_PULL_AT && !e.engaged) {
    e.engaged = true;
    raisePounderArena(e);
  }
  // Бой начат — не остывает и за пределами логова; его копии держатся вместе с ним
  const engaged = e.engaged || (e.isClone && pounderRef && pounderRef.engaged);
  if (e.isAggroed && !engaged && (!playerInLair || playerInSafe) && !(e.attack && e.attack.key === 'leap')) {
    e.isAggroed = false;
    e.attack = null;
    e.z = 0;
  }
  if (e.isAggroed && !e.introShown) {
    e.introShown = true;
    addFloatingText(e.x - 110, e.y - 150, `⚔ ${t('pounder_name')}`, '#c084fc');
  }

  if (e.engaged) updatePounderPull(e, dist);
  if (e.arena) updatePounderArena(e);

  let speed = e.speed * (e.phase >= 2 ? 1.2 : 1.0);
  if (hasFumeAura && dist < fumeAuraRadius()) speed *= FUME_AURA_SLOW;

  if (!e.isAggroed) {
    // Василий ушёл из логова: мерцание гаснет, возвращается домой и зализывает раны.
    // Копия без хозяина рядом не нужна — растворяется
    if (e.isClone) {
      e.hp = 0;
      return;
    }
    e.blinking = 0;
    pounderWalkHome(e, speed);
    if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * POUNDER_REGEN);
    return;
  }

  if (!e.isClone) updatePounderPhases(e);

  // Мерцание (с 20%): неуязвим, раз в ~2 с перескакивает, но бить не перестаёт
  if (e.blinking > 0) {
    e.blinking--;
    if (e.blinking === 0) e.blinkCd = POUNDER_BLINK_CD;
    else if (!e.attack && --e.hopTimer <= 0) {
      pounderHop(e);
      e.hopTimer = POUNDER_HOP + Math.floor(Math.random() * 40);
    }
  } else if (e.phase >= 3 && !e.isClone) {
    if (e.blinkCd > 0) e.blinkCd--;
    else if (!e.attack) {
      e.blinking = POUNDER_BLINK;
      e.hopTimer = 30;
      e.blinkAnim = 16;
      addFloatingText(e.x - 80, e.y - 150, `✦ ${t('pounder_blink')}`, '#e9d5ff');
      SoundFX.bossFx('pounder_blink', e.x, e.y);
      spawnDirectionalSparks(e.x, e.y - 60, -Math.PI / 2, Math.PI * 2, 24, '#c084fc', 4, 12, 18);
    }
  }

  if (e.attack) {
    e.isMoving = false;
    advancePounderAttack(e);
    return;
  }

  e.angle = Math.atan2(dy, dx);
  if (e.attackCooldown <= 0) {
    const key = choosePounderAttack(e, dist);
    if (key) {
      e.isMoving = false;
      startPounderAttack(e, key);
      return;
    }
  }
  e.isMoving = dist > 100;
  if (e.isMoving) slideMove(e, (dx / dist) * speed, (dy / dist) * speed, e.radius, true);

  // Тело непроходимое: выталкивает Василия
  const overlap = e.radius + player.radius - dist;
  if (overlap > 0 && dist > 0.01 && !player.isRolling) {
    const px = player.x + (dx / dist) * overlap, py = player.y + (dy / dist) * overlap;
    if (!checkWalkCollision(px, py, player.radius, footDY(player))) {
      player.x = px;
      player.y = py;
    }
  }
}

const pounderMiniAlive = () => enemies.some(o => o.isMini && o.hp > 0);

// Малая копия: уменьшенная, быстрая, только простые удары, своё здоровье; пока жива — хозяин неуязвим
function spawnPounderMini(e) {
  const s = pounderFreeSpot(e, e.x, e.y) || { x: e.x + 80, y: e.y + 20 };
  const m = newPounder(s.x, s.y, POUNDER_MINI.hp, {
    isClone: true, isMini: true, scale: POUNDER_MINI.scale, dmgMult: POUNDER_MINI.dmg, speed: POUNDER_MINI.speed,
    radius: 26, isAggroed: true, introShown: true, phase: 1, attackCooldown: 30, blinkAnim: 16, hookCd: 1e9
  });
  enemies.push(m);
  spawnDirectionalSparks(s.x, s.y - 40, -Math.PI / 2, Math.PI * 2, 20, '#e9d5ff', 4, 12, 16);
  addFloatingText(e.x - 140, e.y - 160, `✦ ${t('pounder_mini')}`, '#e9d5ff');
  SoundFX.bossFx('pounder_mini', s.x, s.y);
}

// 40%: снайперы гнезда появляются кольцом вокруг Долбильщика — вспышкой, как он сам перескакивает
function summonPounderSnipers(e) {
  let n = 0;
  for (let i = 0; i < POUNDER_SNIPERS * 3 && n < POUNDER_SNIPERS; i++) {
    const a = (n / POUNDER_SNIPERS) * Math.PI * 2 + (i >= POUNDER_SNIPERS ? Math.random() * 0.5 : 0);
    const r = 210 + (i >= POUNDER_SNIPERS ? Math.random() * 120 : 0);
    const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r * GROUND_SQUASH;
    if (x < 80 || y < 80 || checkWalkCollision(x, y, 17, FOOT_DY.sniper)) continue;
    const hp = Math.round(180 * ENEMY_HP_SCALE);
    enemies.push({
      x, y, startX: x, startY: y, bounds: { x1: x - 50, y1: y - 50, x2: x + 50, y2: y + 50 },
      districtId: 'pz_cooling', tier: 4, radius: 17, hp, maxHp: hp, speed: 2.25, type: 'sniper', color: '#84cc16',
      armor: 0, throwCooldown: 0, aggroRadius: 3000, isAggroed: true, hitFlash: 0, patrolAngle: 0, patrolTimer: 90,
      shootCooldown: 40 + Math.random() * 80, stationary: true, summon: true
    });
    spawnDirectionalSparks(x, y - 30, -Math.PI / 2, Math.PI * 2, 12, '#c084fc', 3, 10, 12);
    createParticles(x, y - 20, '#84cc16', 8);
    n++;
  }
  addFloatingText(e.x - 120, e.y - 160, `✦ ${t('pounder_snipers')}`, '#84cc16');
  shakeScreen(14, 10);
}

// Барьер встаёт вокруг места боя — посередине между Долбильщиком и Василием (оба внутри)
// Кадр представления (src/comic.js, набор pounder): один раз, когда Долбильщик впервые заметил Василия.
// Пока кадр не загрузился (или его нет) — бой без представления, флаг не ставится
const pounderIntroImg = new Image();
pounderIntroImg.src = 'assets/comic/pounder_intro.webp';
function introducePounder() {
  if (!window.Comic || window.Comic.seen('pounder') || gameState !== 'PLAYING') return;
  if (!pounderIntroImg.complete || !pounderIntroImg.naturalWidth) return;
  gameState = 'TRANSIT';
  window.Comic.play(() => {
    gameState = 'PLAYING';
    autoScale.hold(2000);
  }, 'pounder');
}

function raisePounderArena(e) {
  e.arena = { x: (e.x + player.x) / 2, y: (e.y + player.y) / 2, r: POUNDER_ARENA_R, t: 0, hitCd: 0 };
  addFloatingText(player.x - 70, player.y - 90, currentLang === 'ru' ? '⛔ Барьер — не уйти!' : '⛔ Barrier — no way out!', '#c084fc');
  shakeScreen(14, 8);
  SoundFX.bossFx('arena_up', e.arena.x, e.arena.y);
}

// Где Василий относительно кольца: 1 — на стене (в осях земли: по вертикали сжато, как всё на земле)
function arenaDist(ar, x, y) {
  return Math.hypot(x - ar.x, (y - ar.y) / GROUND_SQUASH) / ar.r;
}

// Сквозь стену не пройти: Василия возвращает на кромку изнутри — искры, треск
function updatePounderArena(e) {
  const ar = e.arena;
  if (ar.t < POUNDER_ARENA_RISE) ar.t++;
  if (ar.hitCd > 0) ar.hitCd--;
  const fy = player.y + footDY(player);
  const d = arenaDist(ar, player.x, fy);
  const edge = 1 - 8 / ar.r;
  if (d <= edge) return;
  const k = edge / d;
  const nx = ar.x + (player.x - ar.x) * k;
  const ny = ar.y + (fy - ar.y) * k - footDY(player);
  if (!checkWalkCollision(nx, ny, player.radius, footDY(player))) {
    player.x = nx;
    player.y = ny;
  }
  player.isRolling = false;
  if (ar.hitCd === 0) {
    ar.hitCd = 30;
    const a = Math.atan2(player.y - ar.y, player.x - ar.x);
    spawnDirectionalSparks(player.x + Math.cos(a) * 14, player.y - 20, a + Math.PI, 1.6, 10, '#e9d5ff', 3, 10, 12);
    addFloatingText(player.x - 30, player.y - 70, currentLang === 'ru' ? 'Барьер!' : 'Barrier!', '#c084fc');
    SoundFX.bossFx('arena_hit', player.x, player.y);
  }
}

// Стена барьера: кольцо на земле и светящаяся завеса над ним. Дальняя половина (север) — до фигур,
// ближняя (юг) — после, иначе фигура внутри оказалась бы за стеной
function drawPounderArena(ctx, e, front) {
  const ar = e && e.arena;
  if (!ar) return;
  const rise = Math.min(1, ar.t / POUNDER_ARENA_RISE);
  const H = 70 * rise;
  const now = performance.now() / 1000;
  const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2;
  const n = 64;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Завеса: вертикальные полосы, бегущие по кругу
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i + 0.5) / n;
    const x = ar.x + Math.cos(a) * ar.r, y = ar.y + Math.sin(a) * ar.r * GROUND_SQUASH;
    const pulse = 0.5 + 0.5 * Math.sin(now * 4 + i * 0.6);
    const g = ctx.createLinearGradient(x, y, x, y - H);
    g.addColorStop(0, `rgba(168, 85, 247, ${0.22 + 0.18 * pulse})`);
    g.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = g;
    const w = (Math.PI * ar.r / n) * Math.abs(Math.sin(a)) + 4;
    ctx.fillRect(x - w / 2, y - H, w, H);
  }
  // Кромка на земле и верхняя кромка
  [[0, 3, 0.75], [H, 1.5, 0.35]].forEach(([dy, lw, al]) => {
    ctx.strokeStyle = `rgba(233, 213, 255, ${al * (0.8 + 0.2 * Math.sin(now * 6))})`;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(ar.x, ar.y - dy, ar.r, ar.r * GROUND_SQUASH, 0, a0, a1);
    ctx.stroke();
  });
  ctx.restore();
}

// Отсчёт «не уйдёшь»: дальше дальнего удара — копится, вернулся — сброшен; дотикал — выдёргивает
function updatePounderPull(e, dist) {
  if (dist <= POUNDER_ATTACKS.electric.range || (e.attack && e.attack.key === 'leap')) {
    e.pullT = 0;
    return;
  }
  e.pullT = (e.pullT || 0) + 1;
  if (e.pullT === 1) {
    addFloatingText(player.x - 50, player.y - 80, currentLang === 'ru' ? '↯ Не уйдёшь!' : '↯ You won\'t escape!', '#c084fc');
  }
  if (e.pullT >= POUNDER_PULL_DELAY) {
    e.pullT = 0;
    pounderPull(e);
  }
}

// Разрыв пространства: Василий оказывается перед Долбильщиком, на свободном месте, и на миг оглушён
function pounderPull(e) {
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  let spot = null;
  for (let r = 140; r <= 260 && !spot; r += 30) {
    for (let k = 0; k < 9 && !spot; k++) {
      const ang = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35;
      const x = e.x + Math.cos(ang) * r, y = e.y + Math.sin(ang) * r * GROUND_SQUASH;
      if (!checkWalkCollision(x, y, player.radius, footDY(player))) spot = { x, y };
    }
  }
  if (!spot) return;
  spawnDirectionalSparks(player.x, player.y - 40, -Math.PI / 2, Math.PI * 2, 18, '#c084fc', 3, 11, 14);
  createParticles(player.x, player.y - 30, '#a855f7', 14);
  player.x = spot.x;
  player.y = spot.y;
  player.isRolling = false;
  player.stunTimer = Math.max(player.stunTimer || 0, 30);
  player.knockFrames = 0;
  spawnDirectionalSparks(player.x, player.y - 40, -Math.PI / 2, Math.PI * 2, 22, '#e9d5ff', 4, 12, 16);
  shakeScreen(16, 12);
  SoundFX.bossFx('pounder_pull', player.x, player.y);
  addFloatingText(player.x - 40, player.y - 80, currentLang === 'ru' ? '↯ Выдернуло!' : '↯ Pulled back!', '#e9d5ff');
}

// Нить разрыва от Долбильщика к Василию, пока идёт отсчёт: мерцает и разгорается
function drawPounderTether(ctx, e) {
  if (!(e.pullT > 0)) return;
  const k = Math.min(1, e.pullT / POUNDER_PULL_DELAY);
  const x1 = e.x, y1 = e.y - 70, x2 = player.x, y2 = player.y - 40;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const cos = (x2 - x1) / len, sin = (y2 - y1) / len;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  [[6 + 6 * k, `rgba(168, 85, 247, ${0.25 + 0.4 * k})`], [1.5 + 1.5 * k, `rgba(245, 243, 255, ${0.4 + 0.5 * k})`]].forEach(([w, c]) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let s = 30; s < len; s += 30) {
      const j = (Math.random() - 0.5) * (8 + 18 * k);
      ctx.lineTo(x1 + cos * s - sin * j, y1 + sin * s + cos * j);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  ctx.restore();
}

// Разовая награда за Долбильщика: больше, чем за Мясника — он сильнее
const POUNDER_REWARD = [
  ['alien_core', 3], ['alien_core', 3], ['alien_core', 3], ['mil_parts', 4], ['mil_parts', 4], ['mil_parts', 4],
  ['scrap', 25], ['scrap', 25], ['bottle', 25], ['bottle', 25],
  ['ammo_12g', 16], ['ammo_9x18', 30], ['vodka', 3], ['bandage', 4]
];

// Копия рассыпается без награды; хозяин — с наградой, и его копии рассыпаются вместе с ним
function onPounderDefeated(e) {
  if (e.isClone) {
    spawnDirectionalSparks(e.x, e.y - 60, -Math.PI / 2, Math.PI * 2, 22, '#e9d5ff', 4, 12, 16);
    createParticles(e.x, e.y - 40, '#a855f7', 24);
    return;
  }
  pounderRef = null;
  pounderRings = [];
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].isClone) {
      onPounderDefeated(enemies[i]);
      enemies.splice(i, 1);
    }
  }
  if (window.Menu) window.Menu.requestSave();
  createParticles(e.x, e.y, '#a855f7', 40);
  spawnDirectionalSparks(e.x, e.y - 40, -Math.PI / 2, Math.PI * 2, 30, '#e9d5ff', 5, 14, 22);
  shakeScreen(30, 18);
  SoundFX.bossFx('pounder_death', e.x, e.y);
  addFloatingText(e.x - 140, e.y - 100, t('pounder_defeated'), '#c084fc');
  // Кооп: карту выбирает каждый, кто не погиб, — у каждого своя раскладка
  players.forEach(p => { if (!p.dead) p.pendingCards = true; });
  cardOfferTimer = 150;
  POUNDER_REWARD.forEach(([type, val], i) => {
    const a = (i / POUNDER_REWARD.length) * Math.PI * 2;
    spawn3DLootItem(e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 42, type, val);
  });
}

// Площадка логова: выжженный круг с фиолетовой кромкой
function drawPounderLair(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
  if (currentLocation !== 'promzona') return;
  const R = POUNDER_LAIR_R;
  if (POUNDER_HOME.x + R < viewMinX || POUNDER_HOME.x - R > viewMaxX || POUNDER_HOME.y + R < viewMinY || POUNDER_HOME.y - R > viewMaxY) return;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 8, 18, 0.42)';
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.ellipse(POUNDER_HOME.x, POUNDER_HOME.y + 10, R, R * GROUND_SQUASH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Зоны будущих ударов — под фигурами: заливка растёт с замахом, после фиксации прицела контур светлеет
function drawPounderTelegraph(ctx, e) {
  const a = e.attack;
  if (!a || a.phase !== 'windup') return;
  const def = POUNDER_ATTACKS[a.key];
  const p = Math.min(1, a.t / a.windup);
  const locked = a.key === 'leap' ? a.t > a.squat : a.windup - a.t <= BOSS_AIM_LOCK_FRAMES;
  const stroke = locked ? 'rgba(243, 232, 255, 0.95)' : 'rgba(168, 85, 247, 0.7)';
  ctx.save();
  ctx.lineWidth = locked ? 3 : 2;
  if (a.kind === 'slam' || a.key === 'leap' || a.key === 'storm' || a.key === 'spin') {
    const c = a.kind === 'slam' ? pounderSlamCenter(e, a)
      : (a.key === 'leap' && a.target ? { x: a.target.x, y: a.target.y + 4 } : { x: e.x, y: e.y + 4 });
    const r = a.key === 'spin' ? def.range * 2 : def.range;
    ctx.fillStyle = `rgba(168, 85, 247, ${(a.key === 'storm' ? 0.04 : 0.08) + 0.18 * p})`;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r * p, r * GROUND_SQUASH * p, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (a.key === 'hook') {
    // Луч-аркан к Василию: тонкий, к концу замаха наливается
    const len = Math.min(def.range, Math.hypot(player.x - e.x, player.y - e.y) + 40);
    ctx.translate(e.x, e.y - 30);
    ctx.rotate(a.aim);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(216, 180, 254, ${0.25 + 0.6 * p})`;
    ctx.lineWidth = 2 + 4 * p;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
  } else if (a.kind === 'sweep') {
    ctx.translate(e.x, e.y);
    ctx.scale(1, GROUND_SQUASH);
    ctx.fillStyle = `rgba(168, 85, 247, ${0.1 + 0.2 * p})`;
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, def.range, a.aim - def.arc, a.aim + def.arc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (a.key === 'electric') {
    // Линия разряда по земле
    ctx.translate(e.x, e.y + 4);
    ctx.rotate(a.aim);
    ctx.fillStyle = `rgba(192, 132, 252, ${0.1 + 0.22 * p})`;
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.rect(40, -def.width / 2, def.range, def.width);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// Ломаная молния вдоль пути: от (x, y) по направлению dir на len
function drawZigzag(ctx, x, y, cos, sin, len, jitter) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let s = 24; s < len; s += 24) {
    const j = (Math.random() - 0.5) * jitter;
    ctx.lineTo(x + cos * s - sin * j, y + sin * s + cos * j * GROUND_SQUASH);
  }
  ctx.lineTo(x + cos * len, y + sin * len);
  ctx.stroke();
}

// Разряд электрического молота и кольца бури — поверх земли
function drawPounderBolt(ctx, e) {
  const a = e.attack;
  if (!a || a.key !== 'electric' || !a.bolt || a.phase === 'windup') return;
  const def = POUNDER_ATTACKS.electric;
  const k = a.phase === 'active' ? Math.min(1, a.t / def.active) : 1;
  const fade = a.phase === 'active' ? 1 : Math.max(0, 1 - a.t / 16);
  if (fade <= 0) return;
  const len = def.range * k;
  const cos = Math.cos(a.aim), sin = Math.sin(a.aim);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = fade;
  [[7, 'rgba(168, 85, 247, 0.7)'], [2.5, '#f5f3ff']].forEach(([w, c]) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    drawZigzag(ctx, a.bolt.x, a.bolt.y, cos, sin, len, 22);
  });
  ctx.restore();
}

// Электрические кольца бури: рваная кромка, к краю логова гаснут
function drawPounderRings(ctx) {
  if (pounderRings.length === 0) return;
  const def = POUNDER_ATTACKS.storm;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  pounderRings.forEach(ring => {
    const fade = Math.max(0, 1 - ring.r / def.range);
    const n = Math.max(24, Math.round(ring.r / 10));
    [[def.ringWidth * 0.6, `rgba(168, 85, 247, ${0.45 * fade + 0.1})`], [2.5, `rgba(245, 243, 255, ${0.8 * fade + 0.2})`]].forEach(([w, c]) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const rr = ring.r + (Math.random() - 0.5) * 10;
        const x = ring.x + Math.cos(ang) * rr, y = ring.y + Math.sin(ang) * rr * GROUND_SQUASH;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
  });
  ctx.restore();
}

// Пока модель грузится — фиолетовый силуэт с молотом
function drawPounder(ctx, e) {
  if (e.isMini && pounderRef) drawPounderLink(ctx, e, pounderRef);
  if (window.threePounder && window.threePounder.draw(ctx, e)) {
    if (e.isClone) drawPounderCopyBar(ctx, e);
    return;
  }
  ctx.save();
  ctx.translate(e.x, e.y - (e.z || 0));
  ctx.globalAlpha = e.blinking > 0 || e.isClone ? 0.5 : 1;
  ctx.fillStyle = '#3b2f4a';
  ctx.beginPath();
  ctx.ellipse(0, -60, 30, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(28, -90, 10, 70);
  ctx.restore();
}

// Здоровье копии — полоской над головой (у хозяина — большая полоса сверху экрана)
function drawPounderCopyBar(ctx, e) {
  const w = e.isMini ? 50 : 70, y = e.y - (e.isMini ? 112 : 172) - (e.z || 0);
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = e.isMini ? '#e9d5ff' : '#a855f7';
  ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 4);
  ctx.restore();
}

// Связь малой копии с хозяином: пока она тянется, его не взять
function drawPounderLink(ctx, m, e) {
  const x1 = m.x, y1 = m.y - 50, x2 = e.x, y2 = e.y - 80;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;
  const cos = (x2 - x1) / len, sin = (y2 - y1) / len;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(216, 180, 254, ${0.35 + Math.sin(performance.now() / 120) * 0.15})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let s = 26; s < len; s += 26) {
    const j = (Math.random() - 0.5) * 10;
    ctx.lineTo(x1 + cos * s - sin * j, y1 + sin * s + cos * j);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// --- БОСС «ЗОЛОТОЙ МЯСНИК» (логово в СВ Квако-гнезде, появляется один раз за забег) ---
const BOSS_HOME = { x: 5520, y: 495 };
const BOSS_LEASH_RADIUS = 1080;
const BOSS_MAX_HP = 4800;
// Золотая кожа: спереди гасит почти половину урона; со спины — только во время его ударов,
// пока он не доворачивается. Числа брони — в damageBoss
const BOSS_ARMOR = 0.45;
const BOSS_ARMOR_FLAT = 10;      // столько срезает с каждого попадания огнестрела, дрели, биты
const BOSS_ARMOR_MIN = 0.25;     // но четверть урона проходит всегда
const BOSS_PLASMA_VS_SKIN = 0.12;
// Энергощит: снимает только плазма. Пока Василий вне логова, щит возвращается за 5 с, а
// здоровье — полностью, но медленно (~40 с)
const BOSS_SHIELD_MAX = 1800;
const BOSS_SHIELD_REGEN = BOSS_SHIELD_MAX / (60 * 5);
const BOSS_REGEN = 0.0004;       // доля здоровья за кадр вне боя
// Берсерк на последней четверти здоровья: бьёт мечом по земле — трясётся всё логово, Василия оглушает.
// Пока замахивается в первый раз и ещё немного после, неуязвим: его не добить, пока он не начал
const BOSS_BERSERK_AT = 0.25;
const BOSS_BERSERK_INVULN = 60 * 4;
const BOSS_QUAKE_RADIUS = 380;
const BOSS_QUAKE_EVERY = 420;    // кадров между землетрясениями (~7 с)
const BOSS_QUAKE_STUN = 60;      // 1 с без управления
const BOSS_QUAKE_DAZE = 180;     // 3 с замедления
const BOSS_QUAKE_SLOW = 0.55;
// Тайминги — в кадрах симуляции (60 в секунду); arc — половина угла сектора в радианах
const BOSS_ATTACKS = {
  slash: { windup: 34, active: 8, recover: 30, range: 165, arc: 1.2, damage: 36 },
  chop: { windup: 52, active: 6, recover: 50, range: 235, width: 56, damage: 62 },
  spin: { windup: 38, active: 30, recover: 44, range: 150, damage: 26 },
  lunge: { windup: 40, active: 14, recover: 36, range: 300, damage: 40 },
  // Захват — наказание за стояние вплотную: хватает и швыряет
  grab: { windup: 24, active: 6, recover: 40, range: 125, damage: 48 },
  // Землетрясение берсерка: удар мечом по земле на всё логово, оглушает
  quake: { windup: 56, active: 4, recover: 46, range: BOSS_QUAKE_RADIUS, damage: 0 }
};
// Сколько кадров можно стоять рядом с Мясником, прежде чем он схватит (накапливается вблизи,
// убывает вдали)
const BOSS_GRAB_AFTER = 120;
const BOSS_GRAB_NEAR = 140;
// На половине здоровья из капсул логова вылезает подмога
const BOSS_ADDS = 4;
// За столько кадров до удара босс перестаёт доворачиваться — окно, чтобы уйти перекатом
const BOSS_AIM_LOCK_FRAMES = 14;
// Следы погони: в логово он возвращается тем же путём, каким пришёл, — в обход домов
const BOSS_TRAIL_STEP = 40;
const BOSS_STUCK_FRAMES = 180;
let bossRef = null;

// Пока гонится — ставит след каждые BOSS_TRAIL_STEP px; вернулся к старому следу — петля срезается
function recordBossTrail(e) {
  const trail = e.trail || (e.trail = []);
  const last = trail.length ? trail[trail.length - 1] : BOSS_HOME;
  if (Math.hypot(e.x - last.x, e.y - last.y) < BOSS_TRAIL_STEP) return;
  if (Math.hypot(e.x - BOSS_HOME.x, e.y - BOSS_HOME.y) < BOSS_TRAIL_STEP * 0.75) {
    trail.length = 0;
    return;
  }
  for (let i = 0; i < trail.length - 1; i++) {
    if (Math.hypot(e.x - trail[i].x, e.y - trail[i].y) < BOSS_TRAIL_STEP * 0.75) {
      trail.length = i + 1;
      return;
    }
  }
  trail.push({ x: e.x, y: e.y });
}

// Оказался в доме или в препятствии (старое сохранение, толчок) — на ближайшее свободное место
function unstickBoss(e) {
  const fo = footDY(e);
  if (!checkWalkCollision(e.x, e.y, e.radius, fo)) return;
  for (let r = 16; r <= 480; r += 16) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
      if (!checkWalkCollision(x, y, e.radius, fo)) {
        e.x = x;
        e.y = y;
        return;
      }
    }
  }
}

// Игрок ушёл из логова: обратно по своим следам, со столкновениями. Застрял — пропускает след,
// следов нет и не сдвинуться — просто оказывается дома (Василия в логове нет, никто не видит)
function bossWalkHome(e, speed) {
  const trail = e.trail || (e.trail = []);
  while (trail.length && Math.hypot(trail[trail.length - 1].x - e.x, trail[trail.length - 1].y - e.y) < 14) trail.pop();
  const target = trail.length ? trail[trail.length - 1] : BOSS_HOME;
  const hx = target.x - e.x;
  const hy = target.y - e.y;
  const d = Math.hypot(hx, hy);
  e.isMoving = d > 6;
  if (!e.isMoving) {
    e.stuckFrames = 0;
    return;
  }
  e.angle = Math.atan2(hy, hx);
  const step = Math.min(speed, d);
  const px = e.x, py = e.y;
  slideMove(e, (hx / d) * step, (hy / d) * step, e.radius, true);
  e.stuckFrames = Math.hypot(e.x - px, e.y - py) < step * 0.2 ? (e.stuckFrames || 0) + 1 : 0;
  if (e.stuckFrames > BOSS_STUCK_FRAMES) {
    e.stuckFrames = 0;
    if (trail.length) trail.pop();
    else {
      e.x = BOSS_HOME.x;
      e.y = BOSS_HOME.y;
    }
  }
}

function spawnBoss() {
  bossRef = {
    type: 'boss',
    x: BOSS_HOME.x,
    y: BOSS_HOME.y,
    radius: 40,
    hp: BOSS_MAX_HP,
    maxHp: BOSS_MAX_HP,
    armor: BOSS_ARMOR,
    closeFrames: 0,
    speed: 1.9,
    aggroRadius: 360,
    isAggroed: false,
    hitFlash: 0,
    angle: Math.PI / 2,
    animTimer: 0,
    isMoving: false,
    attack: null,
    attackCooldown: 0,
    lungeCooldown: 0,
    enraged: false,
    shield: BOSS_SHIELD_MAX,
    shieldFlash: 0,
    berserk: false,
    invuln: 0,
    quakeTimer: 0,
    introShown: false
  };
  enemies.push(bossRef);
}

// kind — для шламовой брони: молот, удары, захват — ближний бой; разряды Долбильщика — 'energy'
function bossHitPlayer(e, damage, kind = 'melee') {
  if (player.isRolling) return; // перекат даёт неуязвимость
  if (playerDodged()) return;
  player.hp -= armorAbsorb(damage, kind);
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  const kx = player.x + Math.cos(a) * 26;
  const ky = player.y + Math.sin(a) * 26;
  if (!checkWalkCollision(kx, ky, player.radius, footDY(player))) {
    player.x = kx;
    player.y = ky;
  }
  cameraKickX += Math.cos(a) * 9;
  cameraKickY += Math.sin(a) * 9;
  createParticles(player.x, player.y, '#ef4444', 10);
  addFloatingText(player.x, player.y - 30, `-${damage}`, '#ef4444');
  if (player.hp <= 0) gameOver();
}

function startBossAttack(e, key) {
  const def = BOSS_ATTACKS[key];
  const tempo = e.berserk ? 0.7 : (e.enraged ? 0.8 : 1.0);
  e.attack = {
    key,
    phase: 'windup',
    t: 0,
    windup: Math.round(def.windup * tempo),
    recover: Math.round(def.recover * tempo),
    aim: Math.atan2(player.y - e.y, player.x - e.x),
    hit: false
  };
  if (key === 'lunge') e.lungeCooldown = 240;
  // Замах тесаком над головой — скрежет металла перед рубящим и землетрясением
  if (key === 'chop' || key === 'quake') SoundFX.bossFx('butcher_wind', e.x, e.y);
}

function onBossStrike(e, a, def) {
  SoundFX.bossFx('butcher_' + a.key, e.x, e.y);
  if (a.key === 'quake') {
    // Меч в землю: волна на всё логово, трещины по асфальту и по забору за логовом
    spawnShockwave(e.x, e.y + 4, def.range, '#f59e0b', 42);
    spawnShockwave(e.x, e.y + 4, def.range * 0.55, '#fde68a', 30);
    spawnDirectionalSparks(e.x + Math.cos(a.aim) * 90, e.y + Math.sin(a.aim) * 60, -Math.PI / 2, 2.6, 18, '#fbbf24', 4, 12, 16);
    shakeScreen(40, 26);
    addLairCrack(e.x + Math.cos(a.aim) * 80, e.y + Math.sin(a.aim) * 50);
    crackFence();
    return;
  }
  if (a.key === 'slash') {
    muzzleFlashes.push({ x: e.x, y: e.y - 18, angle: a.aim, type: 'boss_slash', life: 10, maxLife: 10, scale: def.range / 54 });
  } else if (a.key === 'spin') {
    muzzleFlashes.push({ x: e.x, y: e.y - 12, angle: a.aim, type: 'boss_spin', life: def.active, maxLife: def.active, scale: def.range / 54 });
  } else if (a.key === 'chop') {
    muzzleFlashes.push({ x: e.x, y: e.y, angle: a.aim, type: 'boss_chop', life: 45, maxLife: 45, scale: 1.0, range: def.range });
    const tipX = e.x + Math.cos(a.aim) * def.range;
    const tipY = e.y + Math.sin(a.aim) * def.range;
    spawnDirectionalSparks(tipX, tipY, a.aim + Math.PI, 2.4, 14, '#fbbf24', 4, 12, 14);
    spawnGunpowderSmoke(e.x + Math.cos(a.aim) * def.range * 0.5, e.y + Math.sin(a.aim) * def.range * 0.5, a.aim, 6);
    cameraKickX += (Math.random() - 0.5) * 16;
    cameraKickY += (Math.random() - 0.5) * 16;
  }
}

// Удары Мясника: захват — только того, на кого шёл; остальное задевает всех, кто попал (кооп)
function updateBossStrike(e, a, def) {
  if (a.key === 'lunge') {
    const step = def.range / def.active;
    const nx = e.x + Math.cos(a.aim) * step;
    const ny = e.y + Math.sin(a.aim) * step;
    if (!checkWalkCollision(nx, e.y, e.radius, footDY(e))) e.x = nx;
    if (!checkWalkCollision(e.x, ny, e.radius, footDY(e))) e.y = ny;
    if (a.t % 2 === 0) createParticles(e.x, e.y + 14, '#78716c', 2);
    if (a.t === def.active - 3) {
      muzzleFlashes.push({ x: e.x, y: e.y - 18, angle: a.aim, type: 'boss_slash', life: 10, maxLife: 10, scale: 2.4 });
    }
  }
  if (a.key === 'grab') bossStrikeOn(e, a, def, player);
  else forEachPlayer(p => bossStrikeOn(e, a, def, p));
}

function bossStrikeOn(e, a, def, p) {
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy);

  if (a.key === 'slash') {
    if (a.t === 2 && dist < def.range + player.radius) {
      let diff = Math.atan2(dy, dx) - a.aim;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < def.arc) bossHitPlayer(e, def.damage);
    }
  } else if (a.key === 'chop') {
    if (a.t === 1) {
      const along = dx * Math.cos(a.aim) + dy * Math.sin(a.aim);
      const across = Math.abs(-dx * Math.sin(a.aim) + dy * Math.cos(a.aim));
      if (along > -player.radius && along < def.range + player.radius && across < def.width / 2 + player.radius) {
        bossHitPlayer(e, def.damage);
      }
    }
  } else if (a.key === 'spin') {
    if ((a.t === 4 || a.t === 19) && dist < def.range + player.radius) bossHitPlayer(e, def.damage);
  } else if (a.key === 'quake') {
    if (a.t === 1 && !player.isRolling && inGroundEllipse(player.x, player.y + footDY(player), e.x, e.y + 4, def.range)) {
      if (!playerDodged()) dazePlayer(BOSS_QUAKE_STUN, BOSS_QUAKE_DAZE, BOSS_QUAKE_SLOW);
    }
  } else if (a.key === 'grab') {
    if (a.t === 1 && !player.isRolling && dist < def.range + player.radius && !playerDodged()) {
      // Схватил: урон и бросок на пару шагов, Василий оглушён
      player.hp -= armorAbsorb(def.damage, 'melee');
      const ang = Math.atan2(dy, dx);
      player.stunTimer = 42;
      player.knockFrames = 18;
      player.knockVx = Math.cos(ang) * 14;
      player.knockVy = Math.sin(ang) * 14;
      cameraKickX += Math.cos(ang) * 16;
      cameraKickY += Math.sin(ang) * 16;
      createParticles(player.x, player.y, '#ef4444', 16);
      addFloatingText(player.x - 30, player.y - 40, `${currentLang === 'ru' ? 'ЗАХВАТ!' : 'GRABBED!'} -${def.damage}`, '#f97316');
      if (player.hp <= 0) gameOver();
    }
  } else if (a.key === 'lunge') {
    const hits = a.hits || (a.hits = new Set());
    if (!hits.has(p) && dist < e.radius + player.radius + 34) {
      hits.add(p);
      bossHitPlayer(e, def.damage);
    }
  }
}

function advanceBossAttack(e) {
  const a = e.attack;
  const def = BOSS_ATTACKS[a.key];
  a.t++;

  if (a.phase === 'windup') {
    if (a.windup - a.t > BOSS_AIM_LOCK_FRAMES) {
      a.aim = Math.atan2(player.y - e.y, player.x - e.x);
    }
    e.angle = a.aim;
    if (a.t >= a.windup) {
      a.phase = 'active';
      a.t = 0;
      onBossStrike(e, a, def);
    }
  } else if (a.phase === 'active') {
    updateBossStrike(e, a, def);
    if (a.t >= def.active) {
      a.phase = 'recover';
      a.t = 0;
    }
  } else if (a.t >= a.recover) {
    if (a.key === 'quake') e.quakeTimer = BOSS_QUAKE_EVERY;
    e.attack = null;
    e.attackCooldown = e.enraged ? 12 : 24;
  }
}

function chooseBossAttack(e, dist) {
  if (e.berserk && e.quakeTimer <= 0) return 'quake';
  if (e.closeFrames >= BOSS_GRAB_AFTER) {
    e.closeFrames = 0;
    return 'grab';
  }
  if (dist < 175) {
    const r = Math.random();
    const spinChance = e.enraged ? 0.38 : 0.22;
    if (r < spinChance) return 'spin';
    if (r < spinChance + 0.33) return 'chop';
    return 'slash';
  }
  if (dist > 240 && dist < 470 && e.lungeCooldown <= 0) return 'lunge';
  return null;
}

function updateBoss(e, playerInSafe, hasFumeAura) {
  e.animTimer++;
  if (e.hitFlash > 0) e.hitFlash--;
  if (e.attackCooldown > 0) e.attackCooldown -= players.length > 1 ? coopScale().bossRate : 1;
  if (e.lungeCooldown > 0) e.lungeCooldown--;
  if (e.shieldFlash > 0) e.shieldFlash--;
  if (e.shieldRipples) e.shieldRipples = e.shieldRipples.filter(r => ++r.t < 34);
  if (e.quakeTimer > 0) e.quakeTimer--;

  if (e.invuln > 0) e.invuln--;
  unstickBoss(e);
  if (e.isAggroed) recordBossTrail(e);

  // Последняя четверть (щит уже снят): берсерк. Бросает текущий удар и сразу бьёт мечом по земле
  if (!e.berserk && e.shield <= 0 && e.hp < e.maxHp * BOSS_BERSERK_AT) {
    e.berserk = true;
    e.invuln = BOSS_BERSERK_INVULN;
    e.attack = null;
    addFloatingText(e.x - 50, e.y - 120, `💢 ${t('boss_berserk')}`, '#ef4444');
    spawnDirectionalSparks(e.x, e.y - 40, -Math.PI / 2, Math.PI * 2, 24, '#ef4444', 4, 11, 18);
    SoundFX.bossFx('butcher_berserk', e.x, e.y);
    startBossAttack(e, 'quake');
    return;
  }

  if (!e.enraged && e.hp < e.maxHp * 0.5) {
    e.enraged = true;
    addFloatingText(e.x - 30, e.y - 96, `🔥 ${t('boss_enraged')}`, '#f97316');
    spawnDirectionalSparks(e.x, e.y - 30, -Math.PI / 2, Math.PI * 2, 24, '#f97316', 4, 11, 18);
    SoundFX.bossFx('butcher_enrage', e.x, e.y);
    spawnBossAdds();
  }

  // Шкала «стоит вплотную» копится и во время его ударов: кто стоит рядом и бьёт — того схватят
  const near = Math.hypot(player.x - e.x, player.y - e.y) < BOSS_GRAB_NEAR;
  e.closeFrames = near ? e.closeFrames + 1 : Math.max(0, e.closeFrames - 2);

  if (e.attack) {
    e.isMoving = false;
    advanceBossAttack(e);
    return;
  }

  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy);
  const playerInLair = Math.hypot(player.x - BOSS_HOME.x, player.y - BOSS_HOME.y) < BOSS_LEASH_RADIUS;

  if (!e.isAggroed && dist < e.aggroRadius && !playerInSafe) e.isAggroed = true;
  if (e.isAggroed && (!playerInLair || playerInSafe)) e.isAggroed = false;
  if (e.isAggroed && !e.introShown) {
    e.introShown = true;
    addFloatingText(e.x - 60, e.y - 96, `⚔ ${t('boss_name')}`, '#facc15');
  }

  let speed = e.speed * (e.berserk ? 1.4 : (e.enraged ? 1.25 : 1.0));
  if (hasFumeAura && dist < fumeAuraRadius()) speed *= FUME_AURA_SLOW;

  if (!e.isAggroed) {
    // Игрок ушёл из логова: возвращаемся домой и зализываем раны
    bossWalkHome(e, speed);
    // Щит возвращается быстро, здоровье — полностью, но медленно
    if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * BOSS_REGEN);
    if (e.shield < BOSS_SHIELD_MAX) e.shield = Math.min(BOSS_SHIELD_MAX, e.shield + BOSS_SHIELD_REGEN);
    if (e.berserk && e.hp >= e.maxHp * BOSS_BERSERK_AT) e.berserk = false;
    return;
  }

  e.angle = Math.atan2(dy, dx);
  if (e.attackCooldown <= 0) {
    const key = chooseBossAttack(e, dist);
    if (key) {
      e.isMoving = false;
      startBossAttack(e, key);
      return;
    }
  }

  e.isMoving = dist > 95;
  if (e.isMoving) {
    slideMove(e, (dx / dist) * speed, (dy / dist) * speed, e.radius, true);
  }

  // Тело босса непроходимое: выталкиваем Василия, а не наносим контактный урон
  const overlap = e.radius + player.radius - dist;
  if (overlap > 0 && dist > 0.01 && !player.isRolling) {
    const px = player.x + (dx / dist) * overlap;
    const py = player.y + (dy / dist) * overlap;
    if (!checkWalkCollision(px, py, player.radius, footDY(player))) {
      player.x = px;
      player.y = py;
    }
  }
}

// Капсулы логова лопаются: рядом с Мясником появляются жабы-пехотинцы гнезда (один раз за бой)
function spawnBossAdds() {
  let spawned = 0;
  for (let i = 0; i < BOSS_ADDS * 6 && spawned < BOSS_ADDS; i++) {
    const a = (i / BOSS_ADDS) * Math.PI * 2 + Math.random() * 0.6;
    const x = BOSS_HOME.x + Math.cos(a) * (150 + Math.random() * 90);
    const y = BOSS_HOME.y + Math.sin(a) * (110 + Math.random() * 70);
    if (x < 80 || y < 80 || x > WORLD_WIDTH - 80 || checkWalkCollision(x, y, 24, FOOT_DY.grunt)) continue;
    const hp = Math.round(230 * ENEMY_HP_SCALE);
    enemies.push({
      x, y, startX: x, startY: y,
      bounds: { x1: BOSS_HOME.x - 400, y1: 80, x2: WORLD_WIDTH - 80, y2: BOSS_HOME.y + 400 },
      districtId: 'nest', tier: 4, radius: 24, armor: 0, throwCooldown: 0,
      hp, maxHp: hp, speed: 2.92, type: 'grunt', color: '#22c55e', aggroRadius: 600,
      isAggroed: true, hitFlash: 0,
      patrolAngle: Math.random() * Math.PI * 2, patrolTimer: 90, shootCooldown: 60
    });
    createParticles(x, y, '#84cc16', 18);
    spawnGunpowderSmoke(x, y, -Math.PI / 2, 5);
    spawned++;
  }
  levelEnemyTotal += spawned;
  if (spawned) addFloatingText(BOSS_HOME.x - 90, BOSS_HOME.y - 140, t('boss_adds'), '#84cc16');
}

// --- ПРОРЫВ: страховка на Плазмаган (docs/BALANCE.md, «Прорыв») ---
// Щит Мясника снимает только плазма. Если в городе перебиты все жабы, Мясник жив, а Плазмагана нет и купить его
// не на что (ядра потрачены на перки или не выпали), в одном из гнёзд — не в логове Мясника — лопается капсула:
// дрожь земли, реплика Василия и пять элитных громил, с которых падает ровно то, чего не хватает на Плазмаган.
// Без объявлений: к громилам ведут обычные стрелки к последним жабам. Повторяется, пока Плазмаган не по карману
const BREACH_BRUTES = 5;
const BREACH_DELAY = 60 * 12;   // проверка — через 12 с после последней жабы (и после загрузки)
let breachTimer = 0;

// Чего не хватает на Плазмаган — тому из живых, кому не хватает меньше всех (кооп: лут общий); null — хватает
// или Плазмаган уже есть
function plasmaShortfall() {
  const item = SHOP_ARSENAL_ITEMS.find(i => i.id === 'plasma');
  let best = null, bestSum = Infinity;
  for (const p of players) {
    if (p.dead || p.left) continue;
    if (p.unlockedWeapons.plasma) return null;
    const s = {};
    let sum = 0;
    for (const k in item.cost) {
      const d = item.cost[k] - (p.resources[k] || 0);
      if (d > 0) { s[k] = d; sum += d; }
    }
    if (sum < bestSum) { best = s; bestSum = sum; }
  }
  return best && bestSum > 0 ? best : null;
}

function updateBreakthrough() {
  if (currentLocation !== 'city' || levelCleared) return;
  if (enemies.some(e => e.type !== 'boss')) { breachTimer = 0; return; }   // жабы ещё есть (и громилы прорыва тоже)
  if (!bossRef || bossRef.hp <= 0) return;                                  // Мясник побеждён — плазма не обязательна
  if (++breachTimer < BREACH_DELAY) return;
  breachTimer = 0;
  const need = plasmaShortfall();
  if (need) spawnBreakthrough(need);
}

function spawnBreakthrough(need) {
  // Гнездо — любое из трёх, кроме северо-восточного: там логово Мясника
  const a = MAP.RING_A, b = MAP.RING_B, s = MAP.SIZE;
  const nests = [[120, 120, a - 120, a - 120], [120, b + 120, a - 120, s - 120], [b + 120, b + 120, s - 120, s - 120]];
  const r = nests[Math.floor(Math.random() * nests.length)];
  const spots = [];
  for (let i = 0; i < 120 && spots.length < BREACH_BRUTES; i++) {
    const x = r[0] + Math.random() * (r[2] - r[0]), y = r[1] + Math.random() * (r[3] - r[1]);
    if (Math.hypot(x - safeZone.x, y - safeZone.y) < 520) continue;
    if (checkWalkCollision(x, y, 37, FOOT_DY.brute)) continue;
    if (spots.some(p => Math.hypot(p.x - x, p.y - y) < 90)) continue;
    spots.push({ x, y });
  }
  if (!spots.length) return;
  // Нехватка — по громилам, по штуке по кругу: убил всех — хватает ровно
  const shares = spots.map(() => ({}));
  let n = 0;
  for (const k in need) {
    for (let i = 0; i < need[k]; i++, n++) {
      const sh = shares[n % spots.length];
      sh[k] = (sh[k] || 0) + 1;
    }
  }
  spots.forEach((p, i) => {
    const hp = Math.round(680 * ENEMY_HP_SCALE);
    enemies.push({
      x: p.x, y: p.y, startX: p.x, startY: p.y, bounds: { x1: r[0], y1: r[1], x2: r[2], y2: r[3] },
      districtId: 'nest', tier: 4, radius: 37, armor: 0.65, throwCooldown: 120 + Math.floor(Math.random() * 240),
      hp, maxHp: hp, speed: 1.98, type: 'brute', color: '#a855f7', aggroRadius: 365, isAggroed: false, hitFlash: 0,
      patrolAngle: Math.random() * Math.PI * 2, patrolTimer: Math.random() * 120 + 60, shootCooldown: 60,
      bonusLoot: shares[i]
    });
    createParticles(p.x, p.y, '#a855f7', 18);
    spawnDirectionalSparks(p.x, p.y - 10, -Math.PI / 2, Math.PI * 2, 14, '#c084fc', 3, 9, 14);
  });
  levelEnemyTotal += spots.length;
  // Дрожь земли у всех, гул — у себя, реплика — каждому
  if (window.Net && window.Net.shakeAll) window.Net.shakeAll(70, 9); else shakeScreen(70, 9);
  SoundFX.bossFx('fence_break', localPlayer.x, localPlayer.y);
  forEachPlayer(() => sayLine('say_breach'));
  if (window.Menu) window.Menu.requestSave();
}

// Разовая крупная награда за Мясника (учтена в расчёте экономики, docs/BALANCE.md)
const BOSS_REWARD = [
  ['alien_core', 3], ['alien_core', 3], ['mil_parts', 4], ['mil_parts', 4],
  ['scrap', 20], ['scrap', 20], ['bottle', 20], ['bottle', 20],
  ['ammo_12g', 12], ['ammo_9x18', 24], ['vodka', 2], ['bandage', 3]
];

function onBossDefeated(e) {
  bossRef = null;
  if (window.Menu) window.Menu.requestSave();
  createParticles(e.x, e.y, '#facc15', 40);
  spawnDirectionalSparks(e.x, e.y - 30, -Math.PI / 2, Math.PI * 2, 30, '#fde047', 5, 14, 22);
  cameraKickX += (Math.random() - 0.5) * 20;
  cameraKickY += (Math.random() - 0.5) * 20;
  SoundFX.bossFx('butcher_death', e.x, e.y);
  addFloatingText(e.x - 110, e.y - 80, t('boss_defeated'), '#facc15');
  // Забор за логовом трещит (если берсерк не успел его расколоть), а Василию — выбор из трёх карт
  crackFence();
  // Кооп: карту выбирает каждый, кто не погиб, — у каждого своя раскладка
  players.forEach(p => { if (!p.dead) p.pendingCards = true; });
  cardOfferTimer = 150;

  // Разовая крупная награда, раскиданная вокруг тела
  BOSS_REWARD.forEach(([type, val], i) => {
    const a = (i / BOSS_REWARD.length) * Math.PI * 2;
    spawn3DLootItem(e.x + Math.cos(a) * 56, e.y + Math.sin(a) * 40, type, val);
  });
}

function drawBossLair(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
  if (currentLocation !== 'city') return;
  if (BOSS_HOME.x + 220 < viewMinX || BOSS_HOME.x - 220 > viewMaxX || BOSS_HOME.y + 170 < viewMinY || BOSS_HOME.y - 170 > viewMaxY) return;
  ctx.save();
  ctx.fillStyle = 'rgba(14, 9, 6, 0.38)';
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.ellipse(BOSS_HOME.x, BOSS_HOME.y + 10, 205, 150, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Красная зона будущего удара: заливка растёт с замахом, после фиксации прицела контур светлеет
function drawBossTelegraph(ctx, e) {
  const a = e.attack;
  if (!a || a.phase !== 'windup') return;
  const def = BOSS_ATTACKS[a.key];
  const p = Math.min(1, a.t / a.windup);
  if (a.key === 'quake') {
    // Землетрясение: огромный круг вокруг Мясника, к удару наливается
    ctx.save();
    ctx.fillStyle = `rgba(239, 68, 68, ${0.06 + 0.16 * p})`;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 4, def.range * p, def.range * GROUND_SQUASH * p, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p > 0.75 ? 'rgba(254, 226, 226, 0.95)' : 'rgba(239, 68, 68, 0.7)';
    ctx.lineWidth = p > 0.75 ? 4 : 2.5;
    ctx.setLineDash([16, 10]);
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 4, def.range, def.range * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const locked = a.windup - a.t <= BOSS_AIM_LOCK_FRAMES;
  const lungeHalfW = e.radius + 34;

  const shape = (scale) => {
    ctx.beginPath();
    if (a.key === 'slash') {
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, def.range * scale, -def.arc, def.arc);
      ctx.closePath();
    } else if (a.key === 'chop') {
      ctx.rect(0, -def.width / 2, def.range * scale, def.width);
    } else if (a.key === 'spin' || a.key === 'grab') {
      ctx.arc(0, 0, def.range * scale, 0, Math.PI * 2);
    } else {
      ctx.rect(0, -lungeHalfW, (def.range + e.radius) * scale, lungeHalfW * 2);
    }
  };

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(a.aim);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
  ctx.strokeStyle = locked ? 'rgba(254, 226, 226, 0.95)' : 'rgba(239, 68, 68, 0.6)';
  ctx.lineWidth = locked ? 3 : 2;
  shape(1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + 0.2 * p})`;
  shape(p);
  ctx.fill();
  ctx.restore();
}

// Угол тесака для временной 2D-отрисовки (пока нет 3D-модели); lift — насколько клинок поднят над головой
function bossSwordPose(e) {
  const a = e.attack;
  const rest = (a ? a.aim : e.angle) + 1.1 + Math.sin(e.animTimer * 0.08) * 0.08;
  if (!a) return { angle: rest, lift: 0 };
  const def = BOSS_ATTACKS[a.key];
  const aim = a.aim;
  const wp = Math.min(1, a.t / a.windup);
  const ap = Math.min(1, a.t / def.active);
  const rp = Math.min(1, a.t / a.recover);
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const lerp = (from, to, k) => from + (to - from) * k;

  if (a.key === 'slash') {
    if (a.phase === 'windup') return { angle: lerp(rest, aim - 1.7, ease(wp)), lift: 0 };
    if (a.phase === 'active') return { angle: lerp(aim - 1.5, aim + 1.5, ease(ap)), lift: 0 };
    return { angle: lerp(aim + 1.5, rest, rp), lift: 0 };
  }
  if (a.key === 'chop') {
    if (a.phase === 'windup') return { angle: lerp(rest, aim + Math.PI, ease(wp)), lift: ease(wp) };
    if (a.phase === 'active') return { angle: aim, lift: 1 - ap };
    return { angle: lerp(aim, rest, rp * rp), lift: 0 };
  }
  if (a.key === 'spin') {
    if (a.phase === 'windup') return { angle: lerp(rest, aim - 2.2, ease(wp)), lift: 0 };
    if (a.phase === 'active') return { angle: aim - 2.2 + ap * Math.PI * 4, lift: 0 };
    return { angle: lerp(aim - 2.2, rest, rp), lift: 0 };
  }
  if (a.phase === 'windup') return { angle: lerp(rest, aim + Math.PI * 0.85, ease(wp)), lift: 0 };
  if (a.phase === 'active') return { angle: aim, lift: 0 };
  return { angle: lerp(aim, rest, rp), lift: 0 };
}

function drawBossSword(ctx, pose) {
  const len = 118 * (1 - pose.lift * 0.6);
  ctx.save();
  ctx.rotate(pose.angle);
  ctx.fillStyle = '#3b2f25';
  ctx.fillRect(-4, -4, 26, 8);
  ctx.fillStyle = '#57534e';
  ctx.fillRect(20, -9, 5, 18);
  ctx.fillStyle = '#7c4a2d';
  ctx.beginPath();
  ctx.moveTo(25, -9);
  ctx.lineTo(25 + len, -12);
  ctx.lineTo(25 + len, 10);
  ctx.lineTo(25, 7);
  ctx.closePath();
  ctx.fill();
  // Зубья пилы по обуху
  ctx.fillStyle = '#5b3a24';
  for (let x = 32; x < 18 + len; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, -9.5);
    ctx.lineTo(x + 4, -15);
    ctx.lineTo(x + 8, -9.5);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(214, 211, 209, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(27, 6);
  ctx.lineTo(23 + len, 9);
  ctx.stroke();
  ctx.restore();
}

// Временная 2D-фигура босса; заменяется 3D-моделью, когда она загружена (window.threeBoss)
function drawBossPlaceholder(ctx, e) {
  const aim = e.attack ? e.attack.aim : e.angle;
  const flip = Math.cos(aim) < 0 ? -1 : 1;
  const bob = e.isMoving ? Math.sin(e.animTimer * 0.25) * 2 : Math.sin(e.animTimer * 0.06) * 1.2;
  const step = e.isMoving ? Math.sin(e.animTimer * 0.25) * 5 : 0;
  const pose = bossSwordPose(e);
  const swordBehind = Math.sin(pose.angle) < -0.2 || pose.lift > 0.5;

  ctx.save();
  ctx.translate(e.x, e.y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 46, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  if (e.enraged) {
    ctx.strokeStyle = `rgba(249, 115, 22, ${0.45 + Math.sin(e.animTimer * 0.2) * 0.2})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 12, 54, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const handX = flip * 30;
  const handY = -34 + bob;
  if (swordBehind) {
    ctx.save();
    ctx.translate(handX, handY);
    drawBossSword(ctx, pose);
    ctx.restore();
  }

  ctx.save();
  ctx.scale(flip, 1);
  // Ноги в армейских штанах и ботинки
  ctx.fillStyle = '#3f4a2e';
  ctx.beginPath(); ctx.ellipse(-12, 2 + step, 11, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 2 - step, 11, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2420';
  ctx.beginPath(); ctx.ellipse(-12, 17 + step, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 17 - step, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Золотой торс
  ctx.fillStyle = '#c9a227';
  ctx.beginPath(); ctx.ellipse(0, -30 + bob, 30, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c547';
  ctx.beginPath(); ctx.ellipse(-7, -38 + bob, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3b2f25';
  ctx.fillRect(-28, -8 + bob, 56, 8);
  // Цепи крест-накрест
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-24, -52 + bob); ctx.lineTo(22, -12 + bob);
  ctx.moveTo(24, -52 + bob); ctx.lineTo(-22, -12 + bob);
  ctx.stroke();
  // Руки, наручи и шипастый наплечник
  ctx.fillStyle = '#c9a227';
  ctx.beginPath(); ctx.ellipse(-33, -30 + bob, 9, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(31, -32 + bob, 9, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b5b4b';
  ctx.fillRect(-40, -24 + bob, 14, 9);
  ctx.fillRect(24, -26 + bob, 14, 9);
  ctx.fillStyle = '#57493d';
  ctx.beginPath(); ctx.ellipse(-28, -52 + bob, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a8a29e';
  for (const sx of [-38, -28, -18]) {
    ctx.beginPath();
    ctx.moveTo(sx - 4, -58 + bob);
    ctx.lineTo(sx, -70 + bob);
    ctx.lineTo(sx + 4, -58 + bob);
    ctx.fill();
  }
  // Голова с бородой
  ctx.fillStyle = '#d4ae2f';
  ctx.beginPath(); ctx.arc(0, -68 + bob, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6d1d';
  ctx.beginPath(); ctx.ellipse(2, -59 + bob, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (e.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath(); ctx.ellipse(0, -36 + bob, 34, 42, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  if (!swordBehind) {
    ctx.save();
    ctx.translate(handX, handY);
    drawBossSword(ctx, pose);
    ctx.restore();
  }
  ctx.restore();
}

function drawBoss(ctx, e) {
  if (e.shield > 0) drawBossShield(ctx, e, false);
  if (!(window.threeBoss && window.threeBoss.draw(ctx, e))) drawBossPlaceholder(ctx, e);
  if (e.shield > 0) drawBossShield(ctx, e, true);
}

// Энергощит: сфера из сот, медленно вращается вокруг Мясника. Задняя половина рисуется за ним,
// передняя — перед ним. К краю сферы соты ярче (как у мыльного пузыря), от попаданий по ним бегут
// волны, почти пробитый щит мерцает, пробитый — разлетается сотами (shieldShards)
const SHIELD_R = 96;            // радиус сферы, px
const SHIELD_SQUASH_X = 0.8;    // по горизонтали сфера уже — по фигуре Мясника
const SHIELD_CY = -58;          // центр сферы над ступнями
const SHIELD_TILT = 0.35;       // сфера наклонена к камере, как и весь мир
const SHIELD_CELLS = (() => {
  const cells = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const phi = lat * Math.PI / 180;
    const n = Math.max(6, Math.round(24 * Math.cos(phi)));
    const shift = (Math.abs(lat / 15) % 2) * 0.5;
    for (let k = 0; k < n; k++) cells.push({ phi, lam: (k + shift) / n * Math.PI * 2 });
  }
  return cells;
})();
let shieldShards = [];

// Шестиугольник радиуса r в текущих координатах
function hexPath(ctx, r) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3 + Math.PI / 6;
    if (k) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

// front — передняя половина (перед фигурой) или задняя (за ней)
function drawBossShield(ctx, e, front) {
  const t = performance.now() / 1000;
  const k = e.shield / BOSS_SHIELD_MAX;
  const flash = (e.shieldFlash || 0) / 8;
  // Почти пробит — мерцает
  const flicker = k < 0.3 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 23 + Math.sin(t * 7) * 3)) : 1;
  const alpha = (0.35 + 0.65 * Math.min(1, k * 2)) * flicker;
  const cx = e.x, cy = e.y + SHIELD_CY;
  const spin = t * 0.35;
  const ct = Math.cos(SHIELD_TILT), st = Math.sin(SHIELD_TILT);
  const ripples = e.shieldRipples || [];
  ctx.save();
  if (!front) {
    // Свечение изнутри: к краю гуще
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(SHIELD_SQUASH_X, 1);
    const g = ctx.createRadialGradient(0, 0, SHIELD_R * 0.25, 0, 0, SHIELD_R);
    g.addColorStop(0, 'rgba(34, 211, 238, 0)');
    g.addColorStop(0.75, `rgba(34, 211, 238, ${(0.06 + 0.08 * flash) * alpha})`);
    g.addColorStop(1, `rgba(165, 243, 252, ${(0.22 + 0.3 * flash) * alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, SHIELD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineJoin = 'round';
  for (let i = 0; i < SHIELD_CELLS.length; i++) {
    const c = SHIELD_CELLS[i];
    const lam = c.lam + spin;
    const x = SHIELD_R * Math.cos(c.phi) * Math.sin(lam);
    const y0 = -SHIELD_R * Math.sin(c.phi);
    const z0 = SHIELD_R * Math.cos(c.phi) * Math.cos(lam);
    const y = y0 * ct - z0 * st;
    const z = y0 * st + z0 * ct;
    if ((z > 0) !== front) continue;
    const f = Math.abs(z) / SHIELD_R;            // 1 — смотрит на камеру, 0 — по краю
    const sx = cx + x * SHIELD_SQUASH_X, sy = cy + y;
    // Волны от попаданий: кольцо бежит от точки удара
    let boost = 0;
    for (let r = 0; r < ripples.length; r++) {
      const rp = ripples[r];
      const d = Math.hypot(sx - (cx + rp.x), sy - (cy + rp.y));
      boost += Math.max(0, 1 - Math.abs(d - rp.t * 5) / 16) * (1 - rp.t / 34);
    }
    const fres = Math.pow(1 - f, 1.4);
    let a = (0.08 + 0.6 * fres + 0.9 * boost + 0.25 * flash) * alpha;
    if (!front) a *= 0.4;
    if (a < 0.02) continue;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(sy - cy, (sx - cx) / SHIELD_SQUASH_X));
    ctx.scale(Math.max(0.22, f), 1);
    hexPath(ctx, SHIELD_R * 0.115);
    if (boost > 0.05) {
      ctx.fillStyle = `rgba(165, 243, 252, ${Math.min(0.55, boost * 0.5) * alpha})`;
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(103, 232, 249, ${Math.min(1, a)})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
  if (front) {
    // Кромка и блик сверху слева
    ctx.translate(cx, cy);
    ctx.scale(SHIELD_SQUASH_X, 1);
    ctx.strokeStyle = `rgba(207, 250, 254, ${(0.45 + 0.4 * flash) * alpha})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, SHIELD_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * alpha})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, SHIELD_R * 0.86, Math.PI * 1.08, Math.PI * 1.38);
    ctx.stroke();
  }
  ctx.restore();
}

// Удар по щиту: волна по сотам от точки, обращённой к стрелку
function shieldRipple(e, hitAngle) {
  if (!e.shieldRipples) e.shieldRipples = [];
  if (e.shieldRipples.length >= 4) e.shieldRipples.shift();
  e.shieldRipples.push({ x: Math.cos(hitAngle) * SHIELD_R * SHIELD_SQUASH_X * 0.8, y: Math.sin(hitAngle) * SHIELD_R * 0.55, t: 0 });
}

// Пробитый щит разлетается шестиугольными осколками
function shatterShield(e) {
  for (let i = 0; i < 34; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 5;
    shieldShards.push({
      x: e.x + Math.cos(a) * SHIELD_R * SHIELD_SQUASH_X * 0.9,
      y: e.y + SHIELD_CY + Math.sin(a) * SHIELD_R * 0.9,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      size: 5 + Math.random() * 7, life: 40 + Math.floor(Math.random() * 20), t: 0
    });
  }
}

function updateShieldShards() {
  for (let i = shieldShards.length - 1; i >= 0; i--) {
    const s = shieldShards[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.95;
    s.vy = s.vy * 0.95 + 0.12;
    s.rot += s.vr;
    if (++s.t >= s.life) shieldShards.splice(i, 1);
  }
}

function drawShieldShards(ctx) {
  if (shieldShards.length === 0) return;
  ctx.save();
  for (let i = 0; i < shieldShards.length; i++) {
    const s = shieldShards[i];
    const a = 1 - s.t / s.life;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    hexPath(ctx, s.size);
    ctx.fillStyle = `rgba(165, 243, 252, ${0.25 * a})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(103, 232, 249, ${0.9 * a})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// Трещины по асфальту логова от ударов берсерка (остаются до конца забега)
let lairCracks = [];
function addLairCrack(x, y) {
  if (lairCracks.length >= 8) lairCracks.shift();
  const lines = [];
  for (let k = 0; k < 5; k++) {
    let a = Math.random() * Math.PI * 2;
    let px = x, py = y;
    const pts = [[px, py]];
    const n = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      a += (Math.random() - 0.5) * 0.9;
      const len = 14 + Math.random() * 22;
      px += Math.cos(a) * len;
      py += Math.sin(a) * len * GROUND_SQUASH;
      pts.push([px, py]);
    }
    lines.push(pts);
  }
  lairCracks.push(lines);
}

function drawLairCracks(ctx) {
  if (lairCracks.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  lairCracks.forEach(lines => lines.forEach(pts => {
    [['rgba(10, 8, 6, 0.75)', 3.2], ['rgba(251, 146, 60, 0.25)', 1]].forEach(([color, w]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    });
  }));
  ctx.restore();
}

let _lastPromptKey = '';

// Текущий Василий подбирает лут, до которого дотянулся (scrap, bottle, mil_parts, alien_core, патроны, расходники)
function pickUpLoot() {
  const pickupRadius = player.radius + 22;
  for (let i = lootItems.length - 1; i >= 0; i--) {
    const item = lootItems[i];
    if (item.noPick > 0 && item.by === player.id) continue; // только что выкинул сам
    if (Math.abs(item.x - player.x) < pickupRadius && Math.abs(item.y - player.y) < pickupRadius) {
      if (Math.hypot(item.x - player.x, item.y - player.y) < pickupRadius) {
        if (item.type.startsWith('weapon:')) {
          // Выкинутый товарищем ствол: свой такой уже есть — лежит дальше
          const w = item.type.slice(7);
          if (player.unlockedWeapons[w]) continue;
          player.unlockedWeapons[w] = true;
          player.equipped[w] = true;
          if (player.ammo[w] && item.ammo) player.ammo[w].clip = Math.min(player.ammo[w].maxClip, player.ammo[w].clip + item.ammo);
          applyHotbarOrder();
          addFloatingText(item.x, item.y - 22, `+ ${weaponTitle(w)}`, '#38bdf8');
          updateHUD(true);
        } else if (item.type.startsWith('item:')) {
          const id = item.type.slice(5);
          player.items[id] = (player.items[id] || 0) + item.val;
          const info = itemInfo(id);
          addFloatingText(item.x, item.y - 20, `+${item.val} ${info ? info.name.toUpperCase() : id}`, '#4ade80');
        } else if (item.type === 'scrap') {
          player.resources.scrap += item.val;
          addFloatingText(item.x, item.y - 16, `+${item.val} Чермет`, '#38bdf8');
        } else if (item.type === 'bottle') {
          player.resources.bottles += item.val;
          addFloatingText(item.x, item.y - 16, `+${item.val} Стеклотара`, '#22c55e');
        } else if (item.type === 'mil_parts') {
          player.resources.mil_parts += item.val;
          addFloatingText(item.x, item.y - 22, `+${item.val} ОРУЖЕЙНЫЕ ДЕТАЛИ!`, '#f87171');
        } else if (item.type === 'alien_core') {
          player.resources.alien_core += item.val;
          addFloatingText(item.x, item.y - 22, `+${item.val} КВАКО-ЯДРО!`, '#c084fc');
        } else if (item.type === 'ammo_9x18') {
          player.ammo.makarov.reserve += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} ПАТР. 9×18`, '#facc15');
        } else if (item.type === 'ammo_12g') {
          player.ammo.shotgun.reserve += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} ПАТР. 12К`, '#fb923c');
        } else if (item.type === 'ammo_762n') {
          player.ammo.nagant.reserve += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} ПАТР. 7,62 Н`, '#facc15');
        } else if (item.type === 'stew') {
          player.items.stew += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} ТУШЁНКА`, '#fbbf24');
        } else if (item.type === 'vodka') {
          player.items.vodka += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} ВОДКА`, '#f59e0b');
        } else if (item.type === 'bandage') {
          player.items.bandage += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} БИНТЫ`, '#4ade80');
        } else if (TROPHY_NAMES[item.type] || PZ_LOOT_NAMES[item.type]) {
          const [ru, en, color] = TROPHY_NAMES[item.type] || PZ_LOOT_NAMES[item.type];
          player.resources[item.type] += item.val;
          addFloatingText(item.x, item.y - 22, `+${item.val} ${currentLang === 'ru' ? ru : en}`, color);
        }
        lootItems.splice(i, 1);
      }
    }
  }
}

// Ход одного Василия (текущего, usePlayer): здоровье, выносливость, перезарядка, движение, стрельба, лут рядом
function updatePlayerSelf() {
  if (player.hasPerk('shaman_carpet') && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + 0.018);
  }
  // Био-лужа: кислота жжёт (перекат проскакивает без урона), скорость режется ниже
  player.inSlime = inBioPuddle(player.x, player.y + footDY(player));
  updateSlimeArmor();
  const sludgeProof = !!(window.Canteen && window.Canteen.sludgeProof()); // мазь, компресс (src/canteen.js)
  if (player.inSlime && !player.isRolling && !sludgeProof) {
    player.hp -= BIO_PUDDLE_DPS / 60;
    player.slimeTick = (player.slimeTick || 0) + 1;
    if (player.slimeTick % 10 === 0) createParticles(player.x, player.y + 24, '#84cc16', 2);
    if (player.hp <= 0) gameOver();
  }
  spawnBioPuddleBubbles();
  if (player.itemCooldown > 0) player.itemCooldown--;
  if (player.unarmedHintCd > 0) player.unarmedHintCd--;
  if (player.healLeft > 0) {
    const h = Math.min(player.healLeft, Math.max(player.healRate || 0, BANDAGE_HEAL / BANDAGE_HEAL_FRAMES));
    player.healLeft -= h;
    player.hp = Math.min(player.maxHp, player.hp + h);
    if (player.healLeft <= 0) player.healRate = 0;
  }

  // Восстановление выносливости (медленнее, чтобы в бою на битах нужно было следить за дыханием и пить тушёнку!)
  if (!player.isRolling && player.stamina < player.maxStamina) {
    const regenRate = (player.hasPerk('slime_skin') ? 0.34 : 0.25) * (window.Basement ? window.Basement.restStamina() : 1);
    player.stamina = Math.min(player.maxStamina, player.stamina + regenRate);
  }

  // Прогресс перезарядки огнестрельного оружия (ПМ, обрез, гранатомёт, наган — по патрону)
  if (player.reloadingWeapon) {
    player.reloadTimer--;
    if (player.reloadTimer <= 0) {
      const rw = player.reloadingWeapon;
      const aState = player.ammo[rw];
      // Наган: в барабан — один патрон, и дальше, пока не полон и есть чем
      if (rw === 'nagant' && aState.reserve > 0 && aState.clip < aState.maxClip) {
        aState.clip++;
        aState.reserve--;
        SoundFX.nagantRound();
        if (aState.clip < aState.maxClip && aState.reserve > 0) player.reloadTimer = player.reloadMaxTimer;
      }
    }
    if (player.reloadingWeapon && player.reloadTimer <= 0) {
      const rw = player.reloadingWeapon;
      const aState = player.ammo[rw];
      const needed = aState.maxClip - aState.clip;
      const loadCount = Math.min(needed, aState.reserve);
      aState.clip += loadCount;
      aState.reserve -= loadCount;
      SoundFX.reloadEnd(player.reloadingWeapon);
      player.reloadingWeapon = null;
      player.reloadTimer = 0;
      addFloatingText(player.x, player.y - 34, `${aState.clip}/${aState.reserve} ГОТОВО!`, '#4ade80');
    }
  }

  // Охлаждение и перегрев Трофейного Плазмагана
  if (player.plasmaOverheated) {
    player.plasmaOverheatTimer--;
    player.plasmaHeat = Math.max(0, (player.plasmaOverheatTimer / 180) * 100);
    if (player.plasmaOverheatTimer <= 0) {
      player.plasmaOverheated = false;
      player.plasmaHeat = 0;
      addFloatingText(player.x, player.y - 34, currentLang === 'ru' ? '❄️ ПЛАЗМА ОСТЫЛА' : '❄️ PLASMA COOLED', '#38bdf8');
    }
  } else if (player.plasmaHeat > 0) {
    player.plasmaHeat = Math.max(0, player.plasmaHeat - 0.36); // ~22% в секунду
  }

  // Накопитель лазерного бластера и способности карт Долбильщика
  if (player.laserRecharge > 0 && --player.laserRecharge === 0) {
    player.laserCharge = CARD_EFFECTS.laserCharge;
    addFloatingText(player.x, player.y - 34, currentLang === 'ru' ? '🔋 НАКОПИТЕЛЬ ЗАРЯЖЕН' : '🔋 CELL CHARGED', '#4ade80');
  }
  if (player.abilityCd > 0) player.abilityCd--;
  if (player.regenLeft > 0) {
    player.regenLeft--;
    player.hp = Math.min(player.maxHp, player.hp + CARD_EFFECTS.regenPerSec / 60);
    if (player.regenLeft % 12 === 0) createParticles(player.x + (Math.random() - 0.5) * 30, player.y - 30, '#4ade80', 2);
  }

  if (player.isDrunk) {
    player.drunkTimer--;
    if (player.drunkTimer <= 0) player.isDrunk = false;
  }

  let currentSpeed = player.speed;
  if (player.hasPerk('slime_skin')) currentSpeed *= 1.22;
  if (player.inSlime && !(window.Canteen && window.Canteen.sludgeProof())) currentSpeed *= BIO_PUDDLE_SLOW;
  if (player.dazeTimer > 0) {
    player.dazeTimer--;
    currentSpeed *= player.dazeMult;
  }
  currentSpeed *= 1 + CARD_EFFECTS.speed * (player.cards.speed || 0);

  if (player.rollCooldown > 0) player.rollCooldown--;
  // Страховка: если Василия всё же вытолкнуло внутрь препятствия, даём из него выйти, а не запираем
  const playerStuck = checkWalkCollision(player.x, player.y, player.radius, footDY(player));
  if (player.stunTimer > 0) {
    // Захват Мясника: Василия швырнуло, пару мгновений он не управляем
    player.stunTimer--;
    player.isMoving = false;
    if (player.knockFrames > 0) {
      player.knockFrames--;
      slideMove(player, player.knockVx, player.knockVy, player.radius);
      player.knockVx *= 0.86;
      player.knockVy *= 0.86;
    }
  } else if (player.isRolling) {
    if (player.isDashing) {
      // Рывок: 50 px за кадр, шагами по 10 px — сквозь тонкие стены не проскакивает
      const step = CARD_EFFECTS.dashDist / CARD_EFFECTS.dashFrames / 5;
      for (let k = 0; k < 5; k++) slideMove(player, player.rollDx * step, player.rollDy * step, player.radius);
      createParticles(player.x, player.y - 30, '#a5f3fc', 2);
    } else {
      const v = player.hasPerk('frog_legs') ? 9 * FROG_LEGS.roll : 9;
      if (playerStuck) {
        player.x += player.rollDx * v;
        player.y += player.rollDy * v;
      } else {
        slideMove(player, player.rollDx * v, player.rollDy * v, player.radius);
      }
    }

    player.rollDuration--;
    createParticles(player.x, player.y, '#64748b', 1);
    if (player.rollDuration <= 0) {
      if (!player.isDashing && player.hasPerk('frog_legs')) frogLegsLanding();
      player.isRolling = false;
      player.isDashing = false;
    }
  } else {
    let dx = 0, dy = 0;
    if (keys['KeyW']) dy -= 1;
    if (keys['KeyS']) dy += 1;
    if (keys['KeyA']) dx -= 1;
    if (keys['KeyD']) dx += 1;
    
    const isMoveKey = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];
    player.isMoving = !!isMoveKey;
    player.lastDx = dx;
    player.lastDy = dy;
    if (player.isMoving) {
      player.animTimer++;
    } else {
      player.animTimer = 0;
    }

    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
    
    if (playerStuck) {
      player.x += dx * currentSpeed;
      player.y += dy * currentSpeed;
    } else if (dx !== 0 || dy !== 0) {
      slideMove(player, dx * currentSpeed, dy * currentSpeed, player.radius);
    }
  }

  player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));

  player.angle = Math.atan2(mouseWorld.y - player.y, mouseWorld.x - player.x);

  const angleDeg = (player.angle * 180 / Math.PI + 360) % 360;
  if (angleDeg > 230 && angleDeg < 310) {
    player.moveDir = 'up';
  } else if (angleDeg > 50 && angleDeg < 130) {
    player.moveDir = 'down';
  } else {
    player.moveDir = 'side';
  }
  player.facingLeft = (angleDeg > 90 && angleDeg < 270);

  const inSafe = Math.hypot(player.x - safeZone.x, player.y - safeZone.y) < safeZone.radius || currentLocation === 'basement';
  player.inSafe = inSafe;
  if (shootCooldown > 0) shootCooldown--;
  if (mouseDown && !player.isRolling && !inSafe && !(player.stunTimer > 0)) {
    shootPlayerWeapon();
  }

  nearbyInteractable = null;
  let basementNear = null;
  const distToShop = Math.hypot(player.x - safeZone.shopX, player.y - safeZone.shopY);
  const fallen = players.length > 1 && players.find(o => o.downT > 0 && Math.hypot(o.x - player.x, o.y - player.y) < REVIVE_RADIUS);
  if (fallen) {
    nearbyInteractable = { type: 'revive', target: fallen }; // держать E — поднять (updateDowned)
  } else if (distToShop < safeZone.shopRadius + player.radius + 20) {
    nearbyInteractable = { type: 'shop' };
  } else if (fenceBreach.state === 'cracked' && Math.abs(player.x - fenceBreach.x) < 90 && player.y < 150) {
    nearbyInteractable = { type: 'breach' };
  } else if (window.Settlers && window.Settlers.nearest()) {
    nearbyInteractable = { type: 'settler', target: window.Settlers.nearest() };
  } else if (window.Quests && window.Quests.nearSample()) {
    nearbyInteractable = { type: 'sample' }; // квест Лены «Проба шлама» (src/quests.js)
  } else if (window.Basement && (basementNear = window.Basement.nearest())) {
    nearbyInteractable = basementNear; // дверь подвала, лестница, обстановка логова (src/basement.js)
  } else {
    for (let i = 0; i < containers.length; i++) {
      const c = containers[i];
      if (!c.searched && !c.airborne && canReachContainer(c)) {
        nearbyInteractable = { type: 'container', target: c };
        break;
      }
    }
  }

  if (player === localPlayer) updateInteractPrompt();

  const pullRadius = player.hasPerk('tentacle_arm') ? 185 : 58;
  const pullSpeed = player.hasPerk('tentacle_arm') ? 5.5 : 3.2;
  for (let i = 0; i < lootItems.length; i++) {
    const item = lootItems[i];
    if (item.noPick > 0 && item.by === player.id) continue;
    if (Math.abs(player.x - item.x) < pullRadius && Math.abs(player.y - item.y) < pullRadius) {
      const dist = Math.hypot(player.x - item.x, player.y - item.y);
      if (dist < pullRadius) {
        const pullAngle = Math.atan2(player.y - item.y, player.x - item.x);
        item.x += Math.cos(pullAngle) * pullSpeed;
        item.y += Math.sin(pullAngle) * pullSpeed;
      }
    }
  }

  // Баффы столовой и ЭМИ на самом Василии — у каждого свои (src/canteen.js, src/workshop.js)
  if (window.Canteen) window.Canteen.update();
  if (window.Workshop && window.Workshop.updatePlayer) window.Workshop.updatePlayer();
  if (window.Basement) window.Basement.updatePlayer(); // ковёр и спортуголок логова
}

// Подсказка «E — …» над тем, что рядом со своим Василием (DOM — только у себя)
function updateInteractPrompt() {
  const toadsLeft = enemies.filter(e => e.type !== 'boss' && e.type !== 'pounder' && !e.defense && !e.summon).length;
  const safeTarget = nearbyInteractable && nearbyInteractable.type === 'container' && window.Safes &&
    window.Safes.isSafe(nearbyInteractable.target) ? nearbyInteractable.target : null;
  const safePrompt = safeTarget ? window.Safes.prompt(safeTarget) : '';
  const settlerPrompt = nearbyInteractable && nearbyInteractable.type === 'settler' ? window.Settlers.prompt(nearbyInteractable.target) : '';
  const basementPrompt = nearbyInteractable && /^basement_/.test(nearbyInteractable.type) ? window.Basement.prompt(nearbyInteractable) : '';
  const revivePrompt = nearbyInteractable && nearbyInteractable.type === 'revive'
    ? (currentLang === 'ru' ? `Держи E — поднять: ${nearbyInteractable.target.name}` : `Hold E — revive ${nearbyInteractable.target.name}`) : '';
  const nextPromptKey = nearbyInteractable ? `${nearbyInteractable.type}_${currentLang}_${levelCleared}_${toadsLeft}_${safePrompt}_${settlerPrompt}_${revivePrompt}_${basementPrompt}` : '';
  if (_lastPromptKey !== nextPromptKey) {
    _lastPromptKey = nextPromptKey;
    const promptEl = document.getElementById('interact-prompt');
    if (nearbyInteractable) {
      promptEl.style.display = 'block';
      const type = nearbyInteractable.type;
      promptEl.innerText = type === 'revive' ? revivePrompt
        : type === 'shop' ? t('prompt_shop')
        : type === 'breach' ? (levelCleared ? t('prompt_breach') : t('prompt_breach_wait') + toadsLeft)
        : type === 'sample' ? window.Quests.samplePrompt()
        : settlerPrompt || safePrompt || basementPrompt || t('prompt_search');
    } else {
      promptEl.style.display = 'none';
    }
  }
}


// Состояния, в которых мир сетевого коопа живёт дальше: у игрока открыто меню, а остальные играют
const NET_LIVE_STATES = new Set(['PLAYING', 'PAUSED', 'INVENTORY', 'SHOP', 'WORKSHOP', 'CANTEEN', 'BASEMENT', 'DIALOG', 'CARDS']);
function worldLive() {
  return gameState === 'PLAYING' || (!!window.Net && window.Net.started && NET_LIVE_STATES.has(gameState));
}

// Вспышки, гильзы, частицы, всплывающие цифры — живут сами по себе (у сетевого клиента — тоже, src/net.js)
function updateCosmetics() {
  for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
    muzzleFlashes[i].life--;
    if (muzzleFlashes[i].life <= 0) muzzleFlashes.splice(i, 1);
  }

  for (let i = shellCasings.length - 1; i >= 0; i--) {
    const sc = shellCasings[i];
    if (sc.z > 0 || sc.vz !== 0) {
      sc.x += sc.vx;
      sc.y += sc.vy;
      sc.rot += sc.vRot;
      sc.z += sc.vz;
      sc.vz -= 0.45;
      if (sc.z <= 0) {
        sc.z = 0;
        if (Math.abs(sc.vz) > 1.0) {
          sc.vz = -sc.vz * 0.42;
          sc.vx *= 0.55;
          sc.vy *= 0.55;
          sc.vRot *= 0.5;
        } else {
          sc.vz = 0;
          sc.vx = 0;
          sc.vy = 0;
          sc.vRot = 0;
        }
      }
    }
    sc.life--;
    if (sc.life <= 0) shellCasings.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.drag) {
      p.vx *= p.drag;
      p.vy *= p.drag;
    }
    if (p.type === 'smoke') {
      p.radius += 0.32;
    }
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i]; ft.y += ft.vy; ft.life--;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function update() {
  // Сетевой клиент мир не считает: берёт его у хоста (src/net.js)
  if (window.Net && window.Net.isClient()) {
    if (NET_LIVE_STATES.has(gameState)) window.Net.clientUpdate();
    return;
  }
  if (!worldLive()) return;
  if (window.Net) window.Net.hostBegin();

  usePlayer(localPlayer);
  mouseWorld.x = mouseScreen.x + camera.x;
  mouseWorld.y = mouseScreen.y + camera.y;
  // В меню свой Василий стоит: клавиши и мышь — меню, а не ему
  const menuOpen = gameState !== 'PLAYING';
  const ownInput = localPlayer.input;
  if (menuOpen) {
    localPlayer.input = { keys: {}, mouse: { x: mouseWorld.x, y: mouseWorld.y }, down: false };
    keys = localPlayer.input.keys;
    mouseWorld = localPlayer.input.mouse;
    mouseDown = false;
  }
  mouseWorld.x = mouseScreen.x + camera.x;
  mouseWorld.y = mouseScreen.y + camera.y;
  // Ввод остальных игроков: по сети или от отладочного бота (src/coop.js)
  if (window.Coop) window.Coop.beforeUpdate();
  for (let pi = 0; pi < players.length; pi++) {
    const p = players[pi];
    if (p.dead) continue;
    usePlayer(p);
    // Отдача и тряска от чужой стрельбы — не наша камера
    const kickX = cameraKickX, kickY = cameraKickY;
    if (p.downT > 0) updateDowned();
    else updatePlayerSelf();
    tagBulletOwners();
    if (p !== localPlayer) { cameraKickX = kickX; cameraKickY = kickY; }
  }
  usePlayer(localPlayer);
  if (menuOpen) {
    localPlayer.input = ownInput;
    keys = ownInput.keys;
    mouseWorld = ownInput.mouse;
    mouseDown = false;
  }

  cameraKickX *= 0.72;
  cameraKickY *= 0.72;
  if (Math.abs(cameraKickX) < 0.05) cameraKickX = 0;
  if (Math.abs(cameraKickY) < 0.05) cameraKickY = 0;

  // Погиб насовсем — камера следит за живым товарищем
  const camP = localPlayer.dead ? (alivePlayers()[0] || localPlayer) : localPlayer;
  camera.x = camP.x - viewW / 2 + cameraKickX;
  camera.y = camP.y - viewH / 2 + cameraKickY;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.vx;
    b.y += b.vy;

    if (b.drag) {
      b.vx *= b.drag;
      b.vy *= b.drag;
    }
    if (b.life !== undefined) {
      b.life--;
      if (b.life <= 0) {
        bullets.splice(i, 1);
        continue;
      }
    }

    if (b.weaponType === 'plasma' && (b.life % 2 === 0)) {
      particles.push({
        x: b.x - b.vx * 0.4 + (Math.random() - 0.5) * 4,
        y: b.y - b.vy * 0.4 + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: 2.2,
        color: '#38bdf8',
        drag: 0.85,
        life: 8,
        maxLife: 8
      });
    }
    
    if (checkBuildingCollision(b.x, b.y, b.radius)) {
      if (b.weaponType !== 'wad') {
        const bounceAngle = (b.angle || 0) + Math.PI + (Math.random() - 0.5) * 1.1;
        const sparkColor = b.weaponType === 'plasma' ? '#38bdf8' : '#fde047';
        spawnDirectionalSparks(b.prevX || b.x, b.prevY || b.y, bounceAngle, 1.2, 5, sparkColor, 4, 10, 10);
        createParticles(b.prevX || b.x, b.prevY || b.y, '#94a3b8', 2);
        if (Math.random() < 0.35) SoundFX.ricochet();
      }
      bullets.splice(i, 1);
      continue;
    }

    if (b.weaponType === 'wad') continue;
    if (b.owner && b.owner !== player) usePlayer(b.owner);

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.abs(b.x - e.x) > b.radius + e.radius + 10 || Math.abs(b.y - e.y) > b.radius + e.radius + 10) continue;
      if (b.hits && b.hits.includes(e)) continue;
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.radius + e.radius) {
        // Удар пришёл оттуда, откуда летела пуля
        const dmg = b.weaponType === 'shotgun' ? b.damage * shotgunFalloff(Math.hypot(b.x - b.ox, b.y - b.oy)) : b.damage;
        const hit = damageEnemy(e, dmg, b.weaponType, b.x - b.vx * 4, b.y - b.vy * 4);
        e.hitFlash = 5;

        const hitAngle = b.angle !== undefined ? b.angle : Math.atan2(b.vy, b.vx);
        const bloodColor = e.type === 'brute' || e.type === 'pounder' ? '#a855f7' : (e.type === 'boss' ? '#facc15' : '#22c55e');
        spawnDirectionalSparks(b.x, b.y, hitAngle, 0.85, 5, b.weaponType === 'plasma' ? '#38bdf8' : '#fde047', 4, 10, 9);
        for (let k = 0; k < 4; k++) {
          const spA = hitAngle + (Math.random() - 0.5) * 0.9;
          const spV = 2.5 + Math.random() * 4.5;
          particles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(spA) * spV,
            vy: Math.sin(spA) * spV,
            radius: 2.2 + Math.random() * 2.2,
            color: bloodColor,
            drag: 0.88,
            life: 16,
            maxLife: 16
          });
        }

        addFloatingText(e.x + (Math.random() - 0.5) * 14, e.y - 16, damageLabel(hit, `${b.isCrit ? 'CRIT! ' : ''}-${Math.round(hit.dealt)}`), b.isCrit ? '#ef4444' : '#f87171');
        
        if (player.hasPerk('car_battery')) {
          enemies.forEach(otherE => {
            if (otherE !== e && Math.hypot(e.x - otherE.x, e.y - otherE.y) < 140) {
              damageEnemy(otherE, 22, 'chain', e.x, e.y);
              otherE.hitFlash = 5;
              addFloatingText(otherE.x, otherE.y - 15, '-22 ⚡', '#38bdf8');
            }
          });
        }

        // Наган: пуля прошивает жабу (кроме боссов) и летит дальше слабее
        if (b.pierce > 0 && e.type !== 'boss' && e.type !== 'pounder') {
          b.pierce--;
          (b.hits || (b.hits = [])).push(e);
          b.damage *= WEAPONS[b.weaponType].pierceMult || 1;
          break;
        }
        bullets.splice(i, 1);
        break;
      }
    }
  }

  usePlayer(localPlayer);
  updateThrownProps();
  updateRockets();
  updateFireGoo();
  if (window.Safes) window.Safes.update();
  if (window.Workshop) window.Workshop.update();
  if (window.Basement) window.Basement.update(); // самогонка и закатки копят запас
  if (window.Defense) window.Defense.update();
  if (window.Settlers) window.Settlers.update();
  if (window.Quests) window.Quests.update();
  SoundFX.updateSteps(); // шаги Василия, жаб и выживших (src/sounds.js)
  updatePounderRings();
  updateShockwaves();
  updateShieldShards();
  updateSpeech();
  if (cardOfferTimer > 0 && --cardOfferTimer === 0 && player.pendingCards) offerBossCards();
  checkBreachTransit();
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      handleEnemyKilled(i);
    }
  }
  checkLevelCleared();
  updateBreakthrough();

  const activeSimRadius = Math.max(viewW, viewH) * 0.72 + 220;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    // Цель — один из игроков (pickTarget): на время хода жабы он «текущий», её AI работает с ним как с player
    if (!e.coopScaled) coopScaleEnemy(e);
    const tgt = pickTarget(e);
    if (!tgt) continue;
    usePlayer(tgt);
    enemyActing = e;
    const inSafe = tgt.inSafe;
    const hasFumeAura = tgt.hasPerk('fume_aura');
    if (e.type === 'boss') {
      updateBoss(e, inSafe, hasFumeAura);
      continue;
    }
    if (e.type === 'pounder') {
      updatePounder(e, inSafe, hasFumeAura);
      continue;
    }
    const dxP = player.x - e.x;
    const dyP = player.y - e.y;

    if (!e.isAggroed && Math.abs(dxP) > activeSimRadius && Math.abs(dyP) > activeSimRadius) {
      continue;
    }

    const distToPlayer = Math.hypot(dxP, dyP);
    if (!e.isAggroed && distToPlayer > activeSimRadius) {
      continue;
    }

    // Страховка поверх забора: враг никогда не оказывается за пределами карты
    e.x = Math.max(60, Math.min(WORLD_WIDTH - 60, e.x));
    e.y = Math.max(60, Math.min(WORLD_HEIGHT - 60, e.y));

    const distToSafe = Math.hypot(e.x - safeZone.x, e.y - safeZone.y);

    if (distToSafe < safeZone.radius) {
      const angleFromSafe = Math.atan2(e.y - safeZone.y, e.x - safeZone.x);
      e.x += Math.cos(angleFromSafe) * 3;
      e.y += Math.sin(angleFromSafe) * 3;
      e.angle = angleFromSafe;
      e.isAggroed = false;
      continue;
    }

    if (distToPlayer < e.aggroRadius && !inSafe) {
      if (!e.isAggroed) {
        e.isAggroed = true;
        addFloatingText(e.x, e.y - 25, '!', '#ef4444');
        // Заметив Василия издалека, громила первым делом ищет, чем швырнуть
        if (e.type === 'brute') e.throwCooldown = Math.min(e.throwCooldown || 0, 15 + Math.floor(Math.random() * 30));
      }
    } else if (inSafe || distToPlayer > e.aggroRadius * 1.5) {
      // Под куполом Михалыча Василия не видно: жабы теряют цель, снайперы перестают стрелять
      e.isAggroed = false;
    }

    // Оглушена приземлением «Жабьих ног»: стоит столбом, не бьёт и не стреляет
    if (e.stunCd > 0) e.stunCd--;
    if (e.stunT > 0) {
      e.stunT--;
      if (e.hitFlash > 0) e.hitFlash--;
      continue;
    }

    let eSpeed = e.speed;
    if (hasFumeAura && distToPlayer < fumeAuraRadius()) {
      eSpeed *= FUME_AURA_SLOW;
    }

    if (!e.animTimer) e.animTimer = 0;
    e.animTimer += 0.15;
    if (e.hitFlash > 0) e.hitFlash--;
    // Жабам слизь гнезда в радость: стоя в луже, они понемногу лечатся
    if (e.hp < e.maxHp && inBioPuddle(e.x, e.y + footDY(e))) {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * BIO_PUDDLE_HEAL / 60);
      if (Math.random() < 0.06) createParticles(e.x, e.y - 10, '#4ade80', 1);
    }

    if (e.isAggroed) {
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      if (e.type === 'brute') {
        // Тяжёлый: разворачивается медленно и идёт туда, куда смотрит — за спину можно зайти перекатом.
        // На расстоянии ищет, чем бы швырнуть
        if (!updateBruteSlam(e, distToPlayer) && !updateBruteThrow(e, distToPlayer, eSpeed)) {
          e.angle = turnToward(typeof e.angle === 'number' ? e.angle : angle, angle, BRUTE_TURN_RATE);
          slideMove(e, Math.cos(e.angle) * eSpeed, Math.sin(e.angle) * eSpeed, e.radius, true);
        }
        // Бьёт только тех, кто перед ним: со спины громила не достаёт
        const facing = Math.abs(angleDelta(angle, e.angle)) < 1.3;
        if (facing && !e.throwState && distToPlayer < player.radius + e.radius && !player.isRolling) {
          const tierMult = 1 + (e.tier || 1) * 0.22;
          player.hp -= armorAbsorb(1.65 * tierMult, 'melee');
          createParticles(player.x, player.y, '#ef4444', 3);
          if (player.hp <= 0) gameOver();
        }
      } else if (e.type === 'grunt') {
        if (!updateGruntTongue(e, distToPlayer, angle, hasFumeAura && distToPlayer < fumeAuraRadius())) {
          e.angle = angle;
          slideMove(e, Math.cos(angle) * eSpeed, Math.sin(angle) * eSpeed, e.radius, true);
        }

        if (distToPlayer < player.radius + e.radius && !player.isRolling) {
          // Усиленный контактный урон по тирам зоны!
          const tierMult = 1 + (e.tier || 1) * 0.22;
          const dmg = 0.78 * tierMult;
          player.hp -= armorAbsorb(dmg, 'melee');
          createParticles(player.x, player.y, '#ef4444', 3);
          if (player.hp <= 0) gameOver();
        }
      } else if (e.type === 'stormtrooper') {
        updateStormtrooper(e, distToPlayer, angle, eSpeed);
      } else if (e.type === 'rocketeer') {
        updateRocketeer(e, distToPlayer, angle, eSpeed);
      } else if (e.type === 'sniper') {
        e.angle = angle;
        // Держит дистанцию 200–320 px: подходит или отступает, но, как и все, не сквозь стены
        // Призванные Долбильщиком стоят кольцом вокруг него (stationary)
        const step = e.stationary ? 0 : (distToPlayer > 320 ? eSpeed : (distToPlayer < 200 ? -eSpeed : 0));
        if (step !== 0) slideMove(e, Math.cos(angle) * step, Math.sin(angle) * step, e.radius, true);
        if (distToPlayer > 320) {
          e.angle = angle;
        } else if (distToPlayer < 200) {
          // Отходит спиной к Василию, пока не пора вскидывать винтовку
          if (e.shootCooldown > SN_AIM) {
            e.angle = angle + Math.PI;
          } else {
            e.angle = angle;
          }
        } else {
          e.angle = angle;
        }

        if (!(e.empT > 0)) e.shootCooldown--; // ЭМИ (src/workshop.js): лазерный прицел молчит
        // Винтовку вскидывает за SN_AIM кадров до выстрела (тогда же — лазерный прицел), после — отдача
        if (e.fireKick > 0) {
          e.fireKick--;
          e.gunPose = 'fire';
        } else {
          e.gunPose = e.shootCooldown < SN_AIM ? 'aim' : null;
        }
        if (e.shootCooldown <= 0) {
          e.shootCooldown = e.tier >= 3 ? 92 : 105;
          e.angle = angle;
          e.gunPose = 'aim';
          // Пуля — из дула винтовки (кость Muzzle модели) в Василия
          const m = gunMuzzle(e);
          const shotA = Math.atan2(player.y - 12 - m.y, player.x - m.x);
          const ebSpeed = e.tier >= 3 ? 10.8 : 9.6;
          const shotDmg = e.tier >= 4 ? 38 : (e.tier === 3 ? 30 : 22);
          enemyBullets.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(shotA) * ebSpeed,
            vy: Math.sin(shotA) * ebSpeed,
            angle: shotA,
            radius: 5,
            damage: shotDmg
          });
          muzzleFlashes.push({
            x: m.x,
            y: m.y,
            angle: shotA,
            type: 'sniper',
            life: 4,
            maxLife: 4,
            scale: 0.9
          });
          spawnDirectionalSparks(m.x, m.y, shotA, 0.45, 6, '#a3e635', 4, 9, 10);
          e.fireKick = SN_KICK;
          e.gunPose = 'fire';
        }
      }
    } else {
      if (e.throwState) cancelThrow(e);
      e.throwPose = null;
      e.lunge = null;
      e.squash = 0;
      e.slam = null;
      if (e.type === 'stormtrooper' || e.type === 'rocketeer') updateGunnerIdle(e);
      if (e.type === 'sniper') e.gunPose = null; // не видит Василия — винтовка как при ходьбе
      e.patrolTimer--;
      if (e.patrolTimer <= 0) {
        e.patrolTimer = Math.random() * 140 + 70;
        e.patrolAngle = Math.random() * Math.PI * 2;
      }
      e.angle = e.patrolAngle;
      const pnx = e.x + Math.cos(e.patrolAngle) * 0.8;
      const pny = e.y + Math.sin(e.patrolAngle) * 0.8;
      if (!checkWalkCollision(pnx, pny, e.radius, footDY(e))) {
        e.x = pnx; e.y = pny;
      }
    }
  }

  usePlayer(localPlayer);
  enemyActing = null;

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    eb.x += eb.vx; eb.y += eb.vy;
    if (checkBuildingCollision(eb.x, eb.y, eb.radius)) {
      spawnDirectionalSparks(eb.x, eb.y, (eb.angle || 0) + Math.PI, 1.0, 5, eb.kind === 'plasma' ? '#f0abfc' : '#84cc16', 3, 7, 9);
      enemyBullets.splice(i, 1);
      continue;
    }
    // Купол Михалыча гасит выстрелы жаб: вспышка на поверхности купола
    if (Math.hypot(eb.x - safeZone.x, eb.y - safeZone.y) < safeZone.radius) {
      spawnDirectionalSparks(eb.x, eb.y, (eb.angle || 0) + Math.PI, 1.6, 10, '#34d399', 3, 9, 14);
      createParticles(eb.x, eb.y, '#6ee7b7', 4);
      enemyBullets.splice(i, 1);
      continue;
    }
    const hitP = playerAt(eb.x, eb.y, eb.radius);
    if (hitP) {
      usePlayer(hitP);
      if (!player.isRolling && !playerDodged()) {
        // Плазма штурмовиков броню почти не замечает, кислота снайперов — наполовину
        player.hp -= armorAbsorb(eb.damage, eb.kind === 'plasma' ? 'energy' : 'ranged');
        createParticles(player.x, player.y, '#10b981', 8);
        addFloatingText(player.x, player.y - 20, `-${eb.damage}`, '#ef4444');
        if (player.hp <= 0) gameOver();
      }
      usePlayer(localPlayer);
      enemyBullets.splice(i, 1);
    }
  }

  // Подбор лута: кто ближе успел, того и вещь
  for (let pi = 0; pi < players.length; pi++) {
    if (players[pi].dead || players[pi].downT > 0) continue;
    usePlayer(players[pi]);
    pickUpLoot();
  }
  usePlayer(localPlayer);
  for (let i = 0; i < lootItems.length; i++) if (lootItems[i].noPick > 0) lootItems[i].noPick--;

  updateCosmetics();

  updateHUD();
  if (window.Net) window.Net.hostSend(); // снимок мира — сетевым товарищам
}

function drawMuzzleFlashes(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
  for (let i = 0; i < muzzleFlashes.length; i++) {
    const mf = muzzleFlashes[i];
    if (mf.x < viewMinX || mf.x > viewMaxX || mf.y < viewMinY || mf.y > viewMaxY) continue;
    const t = mf.life / mf.maxLife;
    const s = (mf.scale || 1.0) * (0.75 + t * 0.35);

    ctx.save();
    ctx.translate(mf.x, mf.y);
    ctx.rotate(mf.angle);

    if (mf.type === 'bat_slash') {
      // Динамический серповидный росчерк удара битой справа налево (от +0.95 до -0.95)
      const prog = 1.0 - t; // 0 -> 1
      const leadAngle = 0.95 - prog * 1.90;
      const trailAngle = Math.min(0.95, leadAngle + 0.95 * Math.sin(prog * Math.PI + 0.25));
      const rOuter = 54 * (mf.scale || 1.0);
      const rInner = 40 * (mf.scale || 1.0);

      ctx.fillStyle = `rgba(241, 245, 249, ${0.42 * Math.sin(prog * Math.PI)})`;
      ctx.beginPath();
      ctx.arc(0, 0, rOuter, leadAngle, trailAngle, false);
      ctx.arc(0, 0, rInner, trailAngle, leadAngle, true);
      ctx.closePath();
      ctx.fill();

      // Острая кромка гвоздей на внешнем радиусе замаха
      ctx.strokeStyle = `rgba(248, 113, 113, ${0.75 * Math.sin(prog * Math.PI)})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, rOuter + 2, leadAngle, trailAngle, false);
      ctx.stroke();

    } else if (mf.type === 'makarov') {
      // Компактная хлесткая вспышка пистолета Макарова 9х18
      ctx.fillStyle = `rgba(251, 146, 60, ${0.88 * t})`;
      ctx.beginPath();
      ctx.moveTo(0, -3 * s);
      ctx.lineTo(22 * s, 0);
      ctx.lineTo(0, 3 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(3 * s, 0, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();

    } else if (mf.type === 'shotgun') {
      ctx.fillStyle = `rgba(251, 146, 60, ${0.22 * t})`;
      ctx.beginPath();
      ctx.ellipse(16 * s, 0, 34 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(234, 88, 12, ${0.82 * t})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14 * s, -15 * s);
      ctx.lineTo(6 * s, -4 * s);
      ctx.lineTo(14 * s, 15 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(249, 115, 22, ${0.92 * t})`;
      ctx.beginPath();
      ctx.moveTo(-2, -4 * s);
      ctx.lineTo(22 * s, -11 * s);
      ctx.lineTo(16 * s, -4 * s);
      ctx.lineTo(42 * s, 0);
      ctx.lineTo(16 * s, 4 * s);
      ctx.lineTo(22 * s, 11 * s);
      ctx.lineTo(-2, 4 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(254, 240, 138, ${0.98 * t})`;
      ctx.beginPath();
      ctx.moveTo(0, -2.5 * s);
      ctx.lineTo(14 * s, -5.5 * s);
      ctx.lineTo(26 * s, 0);
      ctx.lineTo(14 * s, 5.5 * s);
      ctx.lineTo(0, 2.5 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4 * s, 0, 4.2 * s, 0, Math.PI * 2);
      ctx.fill();

    } else if (mf.type === 'laser_beam') {
      // Луч рисуется от дула до цели в мировых координатах, а не повёрнутым от дула
      ctx.restore();
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(248, 113, 113, ${0.35 * t})`;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(mf.x, mf.y);
      ctx.lineTo(mf.x2, mf.y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(254, 226, 226, ${0.95 * t})`;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.fillStyle = `rgba(254, 202, 202, ${0.8 * t})`;
      ctx.beginPath();
      ctx.arc(mf.x, mf.y, 5, 0, Math.PI * 2);
      ctx.arc(mf.x2, mf.y2, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (mf.type === 'plasma') {
      ctx.fillStyle = `rgba(6, 182, 212, ${0.32 * t})`;
      ctx.beginPath();
      ctx.arc(8 * s, 0, 22 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10 * s, -7 * s);
      ctx.lineTo(22 * s, -2 * s);
      ctx.moveTo(0, 0);
      ctx.lineTo(12 * s, 8 * s);
      ctx.lineTo(24 * s, 3 * s);
      ctx.stroke();

      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(4 * s, 0, 5.5 * s, 0, Math.PI * 2);
      ctx.fill();

    } else if (mf.type === 'drill') {
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.85 * t})`;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(10, 0, 24 * s, -0.75, 0.75);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * t})`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(16, 0, 32 * s, -0.55, 0.55);
      ctx.stroke();

    } else if (mf.type === 'sniper') {
      ctx.fillStyle = `rgba(132, 204, 22, ${0.88 * t})`;
      ctx.beginPath();
      ctx.moveTo(0, -3 * s);
      ctx.lineTo(24 * s, 0);
      ctx.lineTo(0, 3 * s);
      ctx.closePath();
      ctx.fill();

    } else if (mf.type === 'toad_plasma') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(232, 121, 249, ${0.9 * t})`;
      ctx.beginPath();
      ctx.moveTo(0, -4 * s);
      ctx.lineTo(18 * s, 0);
      ctx.lineTo(0, 4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2, 0, 5 * s, 0, Math.PI * 2);
      ctx.fill();

    } else if (mf.type === 'boss_slash') {
      // Широкий росчерк тесака Золотого Мясника (серп как у биты, но крупнее)
      const prog = 1.0 - t;
      const fade = Math.sin(prog * Math.PI);
      const leadAngle = 1.2 - prog * 2.4;
      const trailAngle = Math.min(1.2, leadAngle + 1.2 * Math.sin(prog * Math.PI + 0.25));
      const rOuter = 54 * mf.scale;
      const rInner = 36 * mf.scale;

      ctx.fillStyle = `rgba(254, 215, 170, ${0.5 * fade})`;
      ctx.beginPath();
      ctx.arc(0, 0, rOuter, leadAngle, trailAngle, false);
      ctx.arc(0, 0, rInner, trailAngle, leadAngle, true);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 * fade})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, rOuter + 3, leadAngle, trailAngle, false);
      ctx.stroke();

    } else if (mf.type === 'boss_spin') {
      // Два оборота вихря: яркий хвост бежит по окружности
      const sweep = (1.0 - t) * Math.PI * 4;
      const r = 54 * mf.scale;
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.55)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, sweep - 1.8, sweep);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r, sweep - 1.4, sweep);
      ctx.stroke();

    } else if (mf.type === 'boss_chop') {
      // Трещина в асфальте по линии удара сверху (ось X — направление удара)
      ctx.strokeStyle = `rgba(20, 16, 12, ${0.85 * t})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(24, 0);
      for (let x = 40; x <= mf.range; x += 16) {
        ctx.lineTo(x, Math.sin(x * 0.37) * 7);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(168, 162, 158, ${0.22 * t})`;
      ctx.beginPath();
      ctx.ellipse(mf.range * 0.55, 0, mf.range * 0.5, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Кадры персонажей и лута для слоя теней (environment.drawCastShadows): их тени ложатся на землю
// вместе с тенями домов и деревьев, до всех предметов
function collectActorShadows(minX, maxX, minY, maxY) {
  const list = [];
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (p.dead || p.downT > 0 || !p.char) continue;
    const pc = p.char.shadowSprite(p);
    if (pc) list.push(pc);
  }
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.x < minX || e.x > maxX || e.y < minY || e.y > maxY) continue;
    const sp = e.type === 'boss' ? window.threeBoss && window.threeBoss.shadowSprite(e)
      : e.type === 'pounder' ? window.threePounder && window.threePounder.shadowSprite(e)
        : window.threeEnemies && window.threeEnemies.shadowSprite(e);
    if (sp) list.push(sp);
  }
  const tp = window.threeProps;
  for (let i = 0; tp && i < lootItems.length; i++) {
    const l = lootItems[i];
    if (l.x < minX || l.x > maxX || l.y < minY || l.y > maxY) continue;
    const sp = tp.lootSprite(l);
    if (sp) list.push({ img: sp.frame, x: sp.x, y: sp.y, w: sp.w, h: sp.h });
  }
  if (window.Defense) window.Defense.addShadows(list);
  if (window.Settlers) window.Settlers.addShadows(list);
  return list;
}

// Один Василий (текущий, usePlayer): лазерный целеуказатель, модель, у чужих — имя; у упавшего — сколько осталось
function drawOnePlayer(ctx) {
  if (player.hasPerk && player.hasPerk('laser_eye') && !player.isRolling && !(player.downT > 0) && !player.dead) {
    const muz = (window.threeCharacter && window.threeCharacter.getMuzzlePosition)
      ? window.threeCharacter.getMuzzlePosition(player)
      : { x: player.x + Math.cos(player.angle) * 44, y: player.y - 18 + Math.sin(player.angle) * 44 };
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(muz.x, muz.y);
    ctx.lineTo(muz.x + Math.cos(player.angle) * 480, muz.y + Math.sin(player.angle) * 480);
    ctx.stroke();
    ctx.restore();
  }
  SpriteRenderer.drawVasiliy(ctx, player);
  if (players.length > 1) drawPlayerTag(ctx, player);
}

// Над чужим Василием — имя его цветом; упавший — красный круг: сколько секунд осталось, и полоска подъёма
function drawPlayerTag(ctx, p) {
  const color = COOP_COLORS[p.color] || '#e5e7eb';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px Arial';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  const lying = p.downT > 0 || p.dead;
  if (p !== localPlayer) {
    const label = p.dead ? `✝ ${p.name}` : p.name;
    const hk = p.char && p.char.k ? p.char.k.height / 1.9 : 1;   // герой выше Василия — подпись выше
    const ly = p.y - (lying ? 58 : 82 * hk);
    ctx.strokeText(label, p.x, ly);
    ctx.fillStyle = p.dead ? '#94a3b8' : color;
    ctx.fillText(label, p.x, ly);
  }
  if (p.downT > 0) {
    // Сколько секунд осталось поднять — красной дугой, и полоска, пока поднимают
    const k = p.downT / DOWN_FRAMES;
    const cy = p.y - 34;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.arc(p.x, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    // Поднимают — круг зелёный: таймер стоит
    ctx.strokeStyle = p.reviving ? 'rgba(74, 222, 128, 0.95)' : 'rgba(239, 68, 68, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, cy, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();
    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(Math.ceil(p.downT / 60), p.x, cy + 4);
    if (p.reviveT > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(p.x - 30, p.y + 14, 60, 6);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(p.x - 30, p.y + 14, 60 * Math.min(1, p.reviveT / REVIVE_FRAMES), 6);
    } else if (p !== localPlayer && !localPlayer.dead && !(localPlayer.downT > 0) &&
        Math.hypot(localPlayer.x - p.x, localPlayer.y - p.y) < 260) {
      // Подсказка тем, кто рядом: подойти и держать E
      ctx.font = 'bold 12px Arial';
      ctx.strokeText(currentLang === 'ru' ? 'подойди и держи E' : 'come close, hold E', p.x, p.y + 26);
      ctx.fillStyle = '#86efac';
      ctx.fillText(currentLang === 'ru' ? 'подойди и держи E' : 'come close, hold E', p.x, p.y + 26);
    }
  }
  ctx.restore();
}

function render() {
  ctx.save();
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0); // всё ниже — в логических пикселях окна
  ctx.fillStyle = '#0f131a';
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  if (player.isDrunk) {
    const wobbleX = Math.sin(Date.now() * 0.007) * 7;
    const wobbleY = Math.cos(Date.now() * 0.008) * 5;
    ctx.translate(wobbleX, wobbleY);
  }

  const viewMinX = camera.x - 120;
  const viewMaxX = camera.x + viewW + 120;
  const viewMinY = camera.y - 120;
  const viewMaxY = camera.y + viewH + 120;

  // Ступни и высоты фигур на экране: по ним предметы, за которыми кто-то стоит, рисуются поверх (9.2)
  const actors = players.filter(p => !p.left).map(p => ({ x: p.x, y: p.y + footDY(p), h: p.downT > 0 || p.dead ? 30 : 88 }));
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.x < viewMinX || e.x > viewMaxX || e.y < viewMinY || e.y > viewMaxY) continue;
    actors.push({ x: e.x, y: e.y + footDY(e), h: e.type === 'boss' || e.type === 'pounder' ? 160 : (e.type === 'brute' ? 110 : (GUNNER_STATS[e.type] ? 72 : 62)) });
  }

  if (window.environmentRenderer) {
    if (window.Defense) window.Defense.addActors(actors);
    if (window.Settlers) window.Settlers.addActors(actors);
    window.environmentRenderer.shadowActors = collectActorShadows(viewMinX, viewMaxX, viewMinY, viewMaxY);
    window.environmentRenderer.planDeferredContainers(actors, containers, camera, viewW, viewH);
    window.environmentRenderer.draw(ctx, camera, viewW, viewH, WORLD_WIDTH, WORLD_HEIGHT, roads, buildings, containers, safeZone);
  } else {
    ctx.fillStyle = '#161b24';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  // 5.5. Стреляные гильзы 9х18 ПМ, 12-го калибра и энергоячейки на асфальте
  for (let i = 0; i < shellCasings.length; i++) {
    const sc = shellCasings[i];
    if (sc.x < viewMinX || sc.x > viewMaxX || sc.y < viewMinY || sc.y > viewMaxY) continue;
    const alpha = sc.life < 40 ? (sc.life / 40) : 1.0;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (sc.z > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(sc.x - 3, sc.y + 2, 6, 2);
    }
    ctx.translate(sc.x, sc.y - sc.z);
    ctx.rotate(sc.rot);

    if (sc.type === 'plasma') {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-4, -1.6, 5.5, 3.2);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(1.5, -1.6, 2.5, 3.2);
    } else if (sc.type === 'makarov') {
      // Латунная гильза 9х18 ПМ
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-3.2, -1.3, 4.8, 2.6);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(0.8, -1.3, 1.4, 2.6);
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-4.5, -1.8, 6.2, 3.6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(1.7, -1.9, 2.6, 3.8);
    }
    ctx.restore();
  }

  // 6. Выпавший 3D лут (шестеренки, бутылки, консервы) — только в пределах экрана!
  for (let i = 0; i < lootItems.length; i++) {
    const l = lootItems[i];
    if (l.x < viewMinX || l.x > viewMaxX || l.y < viewMinY || l.y > viewMaxY) continue;
    if (window.environmentRenderer && window.environmentRenderer.drawLootItem) {
      window.environmentRenderer.drawLootItem(ctx, l);
    } else {
      ctx.font = '18px Arial';
      ctx.fillText(l.icon, l.x, l.y);
    }
  }

  // 6.5. Логово босса и красные зоны его ударов (под фигурами)
  drawBossLair(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);
  drawPounderLair(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);
  drawLairCracks(ctx);
  drawBreachGround(ctx);
  if (window.Basement) window.Basement.drawDoors(ctx); // двери подвалов на фасадах
  drawThrowTargets(ctx); // куда упадёт брошенное громилой
  if (window.Defense) window.Defense.drawGround(ctx); // баррикада у пролома — низкая, под фигурами
  if (window.Settlers) window.Settlers.drawGround(ctx); // мешки поста у пролома в городе
  if (window.Quests) window.Quests.drawWorld(ctx); // предметы квестов на земле и «!» над тайниками
  drawRocketTargets(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY); // куда упадут ракеты
  drawFirePools(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY); // горючая жижа Василия
  drawSlamTelegraphs(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);
  drawShockwaves(ctx);
  if (bossRef) drawBossTelegraph(ctx, bossRef);
  // Телеграфы и кольца бури — у хозяина и у копий
  enemies.forEach(e => { if (e.type === 'pounder') drawPounderTelegraph(ctx, e); });
  if (pounderRef) drawPounderArena(ctx, pounderRef, false); // дальняя половина барьера — за фигурами
  drawPounderRings(ctx);
  const fumeOn = player.hasPerk('fume_aura');
  if (fumeOn) drawFumeAura(ctx); // облако перегара стелется по земле, под фигурами

  // 6.9. Выжившие обороны у пролома (src/defense.js); спасённые в городе — те, что за Василием (src/settlers.js)
  if (window.Defense) window.Defense.drawActors(ctx);
  if (window.Settlers) window.Settlers.drawActors(ctx, false);
  if (window.Basement) window.Basement.drawActors(ctx, false); // обстановка логова за Василием

  // 7. Враги через ThreeEnemyManager (3D WebGL) + Лазерный прицел снайперов перед выстрелом
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.x < viewMinX || e.x > viewMaxX || e.y < viewMinY || e.y > viewMaxY) continue;

    const tipsy = fumeOn && Math.hypot(e.x - player.x, e.y - player.y) < fumeAuraRadius();
    // Горящие (горючая жижа, src/perks_pz.js): огонь за фигурой, фигура дёргается и темнеет, огонь перед ней
    if (e.type === 'boss' || e.type === 'pounder') {
      drawBurningBack(ctx, e);
      ctx.save();
      burnTransform(ctx, e);
      if (e.type === 'boss') drawBoss(ctx, e); else drawPounder(ctx, e);
      ctx.restore();
      drawBurningFront(ctx, e);
      if (tipsy) drawFumeTipsy(ctx, e);
      continue;
    }

    // Лазерный луч прицеливания Жабы-Снайпера за 32 кадра до выстрела — из дула вскинутой винтовки
    if (e.type === 'sniper' && e.isAggroed && !(e.empT > 0) && e.shootCooldown > 0 && e.shootCooldown < 32) {
      const m = gunMuzzle(e);
      const sx = m.x, sy = m.y;
      ctx.save();
      ctx.strokeStyle = e.shootCooldown < 12 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = e.shootCooldown < 12 ? 1.8 : 1.0;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(player.x, player.y - 12);
      ctx.stroke();
      ctx.restore();
    }

    if (e.type === 'brute') drawHeldBehind(ctx, e);
    // Язык жабы, отвернувшейся от камеры, уходит за её голову — рисуется до фигуры
    const tongueBehind = e.lunge && Math.sin(e.angle || 0) < -0.2;
    if (tongueBehind) drawGruntTongue(ctx, e);
    // Раскалённый ствол штурмовика: за фигурой, если жаба стоит спиной
    const glowBehind = e.overheat > 0 && gunMuzzle(e).behind;
    if (glowBehind) drawOverheatGlow(ctx, e);
    drawBurningBack(ctx, e);
    ctx.save();
    burnTransform(ctx, e);
    if (!(window.threeEnemies && window.threeEnemies.draw(ctx, e))) {
      if (e.type === 'grunt') {
        SpriteRenderer.drawToadGrunt(ctx, e);
      } else if (e.type === 'brute') {
        if (SpriteRenderer.drawToadBrute) SpriteRenderer.drawToadBrute(ctx, e);
        else SpriteRenderer.drawToadGrunt(ctx, e);
      } else {
        SpriteRenderer.drawToadSniper(ctx, e);
      }
    }
    ctx.restore();
    drawBurningFront(ctx, e);
    if (e.lunge && !tongueBehind) drawGruntTongue(ctx, e);
    if (e.overheat > 0 && !glowBehind) drawOverheatGlow(ctx, e);
    if (e.stunT > 0) drawStunStars(ctx, e);
    else if (tipsy) drawFumeTipsy(ctx, e);
  }
  drawShieldShards(ctx);
  drawRockets(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);
  if (window.Defense) window.Defense.drawShots(ctx);
  if (window.Workshop) window.Workshop.drawEffects(ctx); // дуги разрядника, кольцо ЭМИ
  if (window.Settlers) window.Settlers.drawShots(ctx);
  enemies.forEach(e => {
    if (e.type !== 'pounder') return;
    drawPounderBolt(ctx, e);
    drawPounderTether(ctx, e);
  });
  drawBreachHint(ctx);

  // 8. Выстрелы и баллистические трассеры — только в пределах экрана
  // 8A. Инопланетные кислотно-плазменные иглы снайперов
  for (let i = 0; i < enemyBullets.length; i++) {
    const eb = enemyBullets[i];
    if (eb.x < viewMinX || eb.x > viewMaxX || eb.y < viewMinY || eb.y > viewMaxY) continue;
    const a = eb.angle !== undefined ? eb.angle : Math.atan2(eb.vy, eb.vx);
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    if (eb.kind === 'plasma') {
      // Сгусток плазмы штурмовика: розовый ореол и белое ядро
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.5)';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eb.x - cosA * 14, eb.y - sinA * 14);
      ctx.lineTo(eb.x, eb.y);
      ctx.stroke();
      ctx.strokeStyle = '#fdf4ff';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(eb.x - cosA * 7, eb.y - sinA * 7);
      ctx.lineTo(eb.x + cosA * 2, eb.y + sinA * 2);
      ctx.stroke();
      continue;
    }

    // Кислотный шлейф
    ctx.strokeStyle = 'rgba(132, 204, 22, 0.45)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(eb.x - cosA * 22, eb.y - sinA * 22);
    ctx.lineTo(eb.x, eb.y);
    ctx.stroke();

    // Яркое ядро снайперской иглы
    ctx.strokeStyle = '#ecfccb';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(eb.x - cosA * 12, eb.y - sinA * 12);
    ctx.lineTo(eb.x + cosA * 3, eb.y + sinA * 3);
    ctx.stroke();
  }

  // 8B. Выстрелы Василия (баллистические трассеры картечи, пыжи, плазменные разряды)
  ctx.lineCap = 'round';
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (b.x < viewMinX || b.x > viewMaxX || b.y < viewMinY || b.y > viewMaxY) continue;
    const a = b.angle !== undefined ? b.angle : Math.atan2(b.vy, b.vx);
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    if (b.weaponType === 'plasma') {
      // Высокоэнергетический плазменный болт с электрическим ореолом
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(a);

      // Внешняя ионная оболочка
      ctx.fillStyle = b.isCrit ? 'rgba(244, 63, 94, 0.35)' : 'rgba(6, 182, 212, 0.36)';
      ctx.beginPath();
      ctx.ellipse(-6, 0, 20, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Основное тело плазменного снаряда
      ctx.fillStyle = b.isCrit ? '#fb7185' : '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-22, -3.0, 28, 6.0, 3);
      ctx.fill();

      // Ослепительно-белое ядро
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-14, -1.5, 18, 3.0, 1.5);
      ctx.fill();

      ctx.restore();

    } else if (b.weaponType === 'wad') {
      // Дымящийся войлочный пыж из ствола двустволки
      ctx.fillStyle = 'rgba(168, 162, 158, 0.75)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Сверхзвуковой баллистический трассер картечины 12-го калибра
      const lifeRatio = b.life !== undefined ? (b.life / b.maxLife) : 1.0;
      const tLen = (b.trailLen || 32) * (0.45 + 0.55 * lifeRatio);
      const tailX = b.x - cosA * tLen;
      const tailY = b.y - sinA * tLen;
      const midX = b.x - cosA * (tLen * 0.48);
      const midY = b.y - sinA * (tLen * 0.48);

      // 1. Внешний горячий оранжево-золотой след раскалённого воздуха
      ctx.strokeStyle = b.isCrit
        ? `rgba(239, 68, 68, ${0.52 * lifeRatio})`
        : `rgba(249, 115, 22, ${0.48 * lifeRatio})`;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // 2. Яркий огненно-желтый сердечник трассера
      ctx.strokeStyle = b.isCrit ? '#fca5a5' : '#fde047';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // 3. Раскалённая свинцовая головка картечины на острие
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 9. Василии (в коопе — все, свой последним, поверх) с экипировкой + Лазерный целеуказатель (перк laser_eye)
  for (let pi = 0; pi < players.length; pi++) {
    const p = players[pi];
    if (p === localPlayer || p.left || p.x < viewMinX || p.x > viewMaxX || p.y < viewMinY || p.y > viewMaxY) continue;
    usePlayer(p);
    drawOnePlayer(ctx);
  }
  usePlayer(localPlayer);
  drawOnePlayer(ctx);
  if (window.Settlers) window.Settlers.drawActors(ctx, true); // спасённые и их места перед Василием
  if (window.Basement) window.Basement.drawActors(ctx, true);
  drawDazeStars(ctx);
  if (pounderRef) drawPounderArena(ctx, pounderRef, true); // ближняя половина барьера — перед фигурами

  // 9.2. Машины, деревья, фонари и прочее, за чем стоит Василий или враг, — поверх фигур
  if (window.environmentRenderer) {
    window.environmentRenderer.drawOccludingProps(ctx, actors, camera, viewW, viewH, buildings);
    // 9.25. Предметы в руках громил и в полёте
    drawAirborneProps(ctx);
    // 9.3. Плафоны фонарей, ореолы и конусы света — поверх персонажей
    window.environmentRenderer.drawLampGlows(ctx, camera, viewW, viewH);
  }
  // 9.4. Подвал: темнота к углам, лампочка, отсвет буржуйки
  if (window.Basement) window.Basement.drawLight(ctx);

  // 9.5. Направленные дульные вспышки поверх среза ствола
  drawMuzzleFlashes(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);
  // 9.6. Реплика спасённого облачком над головой (src/settlers.js)
  if (window.Settlers) window.Settlers.drawBubble(ctx);
  if (window.Quests) window.Quests.drawOverlay(ctx); // «!» над тайниками с предметами квестов

  // 10. Частицы (искры, пороховой дым, брызги) и текст — только в пределах экрана
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.x < viewMinX || p.x > viewMaxX || p.y < viewMinY || p.y > viewMaxY) continue;

    if (p.type === 'spark') {
      // Огненная искра в виде росчерка по вектору скорости
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.radius;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.1, p.y - p.vy * 2.1);
      ctx.stroke();
    } else if (p.type === 'smoke') {
      // Полупрозрачный клуб порохового дыма
      const alpha = Math.max(0, (p.life / (p.maxLife || 25)) * 0.36);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (floatingTexts.length > 0) {
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    for (let i = 0; i < floatingTexts.length; i++) {
      const ft = floatingTexts[i];
      if (ft.x < viewMinX || ft.x > viewMaxX || ft.y < viewMinY || ft.y > viewMaxY) continue;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
  }
  drawSpeech(ctx);

  ctx.restore();
  ctx.restore();

  drawLastEnemyMarkers();
  drawBreachMarker();
  if (window.Minimap) window.Minimap.frame(ctx); // миникарта, зов на помощь (src/minimap.js)
}

// Когда жаб осталось мало, у края экрана стрелки показывают, где они: иначе последнюю
// приходится искать по всей карте
const LAST_ENEMIES_MARKED = 5;
function drawLastEnemyMarkers() {
  if (gameState !== 'PLAYING' || levelCleared || enemies.length === 0 || enemies.length > LAST_ENEMIES_MARKED) return;
  const w = viewW, h = viewH;
  // Рамка для стрелок: сверху — полоски здоровья и плашка района, снизу — хотбар
  const left = 34, right = w - 34, top = 72, bottom = h - 104;
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const t = performance.now() / 1000;
  ctx.save();
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const sx = e.x - camera.x, sy = e.y - camera.y;
    if (sx > 0 && sx < w && sy > 0 && sy < h) continue; // и так видно
    const dx = sx - cx, dy = sy - cy;
    const k = Math.min((right - cx) / Math.max(1e-3, Math.abs(dx)), (bottom - cy) / Math.max(1e-3, Math.abs(dy)));
    const ax = cx + dx * k, ay = cy + dy * k;
    const a = Math.atan2(dy, dx);
    ctx.translate(ax, ay);
    ctx.rotate(a);
    ctx.globalAlpha = 0.75 + Math.sin(t * 5 + i) * 0.2;
    ctx.fillStyle = e.type === 'boss' ? '#facc15' : '#ef4444';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-9, -10);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  }
  ctx.restore();
}

// Все жабы и босс перебиты — локация зачищена (дальше здесь откроется пролом в заборе)
function checkLevelCleared() {
  if (levelCleared || levelEnemyTotal === 0 || enemies.length > 0) return;
  levelCleared = true;
  showToast(t('level_cleared'), t(currentLocation === 'city' ? 'level_cleared_sub' : 'level_cleared_sub_pz'));
  SoundFX.reload();
  if (window.Menu) window.Menu.requestSave();
}

let toastTimer = 0;
function showToast(title, sub) {
  const el = document.getElementById('toast');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-sub').textContent = sub || '';
  el.classList.add('shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('shown'), 5000);
}

// --- ОВЕРЛЕЙ ПРОИЗВОДИТЕЛЬНОСТИ (F3 или ?perf в адресе) ---
const perfStats = {
  visible: /[?&]perf\b/.test(location.search),
  frameMs: 16.7,
  updateMs: 0,
  renderMs: 0,
  // Фризы: кадры дольше 50 мс. «Игра» — сколько из них заняли наши update+render;
  // если фриз большой, а игра маленькая — тормозит браузер/видеокарта, а не код игры
  hitches: 0,
  lastHitchMs: 0,
  lastHitchGameMs: 0,
  prevFrameGameMs: 0
};

function drawPerfOverlay() {
  if (!perfStats.visible) return;
  const lines = [
    `FPS ${Math.round(1000 / perfStats.frameMs)}  (${perfStats.frameMs.toFixed(1)} мс/кадр)`,
    `CPU: update ${perfStats.updateMs.toFixed(2)} мс, render ${perfStats.renderMs.toFixed(2)} мс`,
    perfStats.hitches > 0
      ? `Фризы >50 мс: ${perfStats.hitches}, последний ${Math.round(perfStats.lastHitchMs)} мс (игра ${perfStats.lastHitchGameMs.toFixed(1)} мс)`
      : 'Фризы >50 мс: нет',
    `Враги ${enemies.length}  Частицы ${particles.length}  Пули ${bullets.length + enemyBullets.length}  ` +
      `Разрешение ${Math.round(renderScale * 100)}%${renderScaleSetting === 'auto' ? ' (авто)' : ''}`
  ];
  ctx.save();
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.fillStyle = 'rgba(8, 10, 14, 0.78)';
  ctx.fillRect(10, viewH - 95, 420, 85);
  ctx.font = '12px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = perfStats.frameMs > 18 ? '#f87171' : '#4ade80';
  lines.forEach((line, i) => ctx.fillText(line, 18, viewH - 87 + i * 19));
  ctx.restore();
}

// --- ТАБЛИЦА БАЛАНСА (F4): за сколько секунд оружие убивает врага ---
// Считается по WEAPONS, броне и здоровью живых врагов текущей карты и текущему урону Василия
// (перки учтены). «Чистое» время непрерывной атаки: без выносливости, промахов и беготни;
// перезарядка ПМ и обреза и перегрев плазмы учтены. Через дробь — то же со спины
const balanceStats = { visible: false };
// Строки таблицы: оружие и (для обреза) расстояние, на котором считается урон дроби
const BALANCE_ROWS = [
  ['bat', 'Бита'], ['makarov', 'ПМ'], ['drill', 'Дрель'],
  ['shotgun', 'Обрез≤60', 40], ['shotgun', 'Обрез150', 150], ['plasma', 'Плазма']
];
const BALANCE_NAMES = {
  bat: 'Бита', makarov: 'ПМ', drill: 'Дрель', shotgun: 'Обрез', plasma: 'Плазма',
  grunt: 'Пех', sniper: 'Снай', brute: 'Гром', stormtrooper: 'Штур', rocketeer: 'Ракет', boss: 'МЯСНИК', pounder: 'ДОЛБ',
  courtyards: 'дв', garages: 'гар', heating: 'тепл', cordon: 'корд', nest: 'гн',
  pz_breach: 'прол', pz_admin: 'упр', pz_railyard: 'сорт', pz_depot: 'авто', pz_foundry: 'лит',
  pz_workshops: 'мех', pz_warehouses: 'скл', pz_tankfarm: 'рез', pz_cooling: 'град', pz_sludge: 'шлам'
};

// Урон одного попадания (для обреза — одной дробины)
function weaponHit(w, base) {
  return WEAPONS[w].dmg(base);
}

function weaponDps(w, base) {
  const W = WEAPONS[w];
  if (w === 'shotgun') return W.dmg(base) * W.pellets * W.clip * 60 / (W.clip * W.cooldown + W.reload);
  if (w === 'makarov') {
    const clip = player.ammo.makarov.maxClip, reload = player.ammo.makarov.reloadTime;
    return W.dmg(base) * clip * 60 / (clip * W.cooldown + reload);
  }
  if (w === 'nagant') {
    const clip = player.ammo.nagant.maxClip, reload = clip * player.ammo.nagant.reloadTime;
    return W.dmg(base) * clip * 60 / (clip * W.cooldown + reload);
  }
  if (w === 'plasma') return W.dmg(base) * 7 * 60 / (7 * W.cooldown + 180); // 7 выстрелов до перегрева + 3 с
  return W.dmg(base) * 60 / W.cooldown;
}

function drawBalanceOverlay() {
  if (!balanceStats.visible) return;
  const groups = new Map();
  enemies.forEach(e => {
    const key = e.type === 'boss' ? 'boss' : e.type + ':' + e.districtId;
    if (!groups.has(key)) groups.set(key, { e, n: 0 });
    groups.get(key).n++;
  });
  const cols = Array.from(groups.values()).sort((a, b) => a.e.maxHp - b.e.maxHp).slice(0, 11);
  const colW = 74, rowH = 18, x0 = 12, y0 = 110, firstW = 112;
  const w = firstW + cols.length * colW + 10;
  const h = rowH * (BALANCE_ROWS.length + 3) + 14;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 14, 0.86)';
  ctx.fillRect(x0, y0, w, h);
  ctx.font = '11px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`TTK, с (спереди/сзади) · урон ${player.baseDamage} · F4`, x0 + 8, y0 + 6);
  cols.forEach((g, i) => {
    const e = g.e;
    const name = e.type === 'boss' ? BALANCE_NAMES.boss : `${BALANCE_NAMES[e.type]}·${BALANCE_NAMES[e.districtId] || ''}`;
    const cx = x0 + firstW + i * colW;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`${name}×${g.n}`, cx, y0 + 6 + rowH);
    ctx.fillStyle = '#94a3b8';
    const armorTag = e.type === 'boss' ? ` −${BOSS_ARMOR_FLAT}/уд +щит ${BOSS_SHIELD_MAX}` : (e.armor ? ' 🛡' + Math.round(e.armor * 100) : '');
    ctx.fillText(`${Math.round(e.maxHp)}${armorTag}`, cx, y0 + 6 + rowH * 2);
  });
  BALANCE_ROWS.forEach(([wk, label, range], r) => {
    const y = y0 + 6 + rowH * (r + 3);
    const dps = weaponDps(wk, player.baseDamage) * (range ? shotgunFalloff(range) : 1);
    ctx.fillStyle = player.unlockedWeapons[wk] ? '#f8fafc' : '#64748b';
    ctx.fillText(`${label} ${Math.round(dps)}/с`, x0 + 8, y);
    cols.forEach((g, i) => {
      const e = g.e;
      let front = e.maxHp / (dps * armorFactor(e.armor || 0, wk));
      let back = e.maxHp / (dps * (e.armor ? BACKSTAB_MULT : 1));
      if (e.type === 'boss') {
        // Только здоровье, без щита: золотая кожа срезает с каждого попадания
        const hit = weaponHit(wk, player.baseDamage) * (range ? shotgunFalloff(range) : 1);
        const k = wk === 'plasma' ? BOSS_PLASMA_VS_SKIN : Math.max(BOSS_ARMOR_MIN, 1 - BOSS_ARMOR_FLAT / hit);
        front = e.maxHp / (dps * k);
        back = e.maxHp / (dps * (wk === 'plasma' ? BOSS_PLASMA_VS_SKIN : BACKSTAB_MULT));
      }
      ctx.fillStyle = front > 20 ? '#f87171' : (front > 8 ? '#fbbf24' : '#4ade80');
      ctx.fillText(e.armor ? `${front.toFixed(1)}/${back.toFixed(1)}` : front.toFixed(1), x0 + firstW + i * colW, y);
    });
  });
  ctx.restore();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    e.preventDefault();
    perfStats.visible = !perfStats.visible;
  }
  if (e.code === 'F4') {
    e.preventDefault();
    balanceStats.visible = !balanceStats.visible;
  }
});

// Фиксированный шаг симуляции 60 Гц: все таймеры и скорости в update() рассчитаны «на кадр при 60 FPS»,
// поэтому на мониторах 120/144 Гц игра раньше ускорялась в 2–2.4 раза, а при просадках FPS — замедлялась
const SIM_STEP_MS = 1000 / 60;
const MAX_SIM_STEPS_PER_FRAME = 4;
let simAccumulator = 0;
let lastLoopTime = performance.now();
let lastRenderTime = 0;
// Пауза, меню, магазин: мир стоит, поэтому рисуем один кадр и дальше не грузим видеокарту.
// Хранит состояние, для которого застывший кадр уже нарисован
let frozenFrameState = null;
window.addEventListener('resize', () => { frozenFrameState = null; }); // ресайз очищает канвас

function loop(now = performance.now()) {
  const gap = now - lastLoopTime;
  // Паузы дольше секунды — это свёрнутая вкладка, а не фриз
  if (gap > 50 && gap < 1000 && gameState === 'PLAYING') {
    perfStats.hitches++;
    perfStats.lastHitchMs = gap;
    perfStats.lastHitchGameMs = perfStats.prevFrameGameMs;
  }
  simAccumulator += Math.min(gap, 100);
  lastLoopTime = now;

  // Порог в полшага: при 60 Гц ровно один update() на кадр даже при дрожании vsync
  const t0 = performance.now();
  let steps = 0;
  while (simAccumulator > SIM_STEP_MS * 0.5 && steps < MAX_SIM_STEPS_PER_FRAME) {
    update();
    simAccumulator -= SIM_STEP_MS;
    steps++;
  }
  if (steps === MAX_SIM_STEPS_PER_FRAME) simAccumulator = 0;

  // Без нового шага симуляции кадр совпадает с предыдущим — не тратим на него GPU
  const frozen = gameState !== 'PLAYING' && !(window.Net && window.Net.started && NET_LIVE_STATES.has(gameState));
  if (steps > 0 && !(frozen && frozenFrameState === gameState)) {
    const t1 = performance.now();
    render();
    drawPerfOverlay();
    drawBalanceOverlay();
    frozenFrameState = frozen ? gameState : null;
    const t2 = performance.now();

    if (lastRenderTime > 0) {
      perfStats.frameMs += (Math.min(now - lastRenderTime, 250) - perfStats.frameMs) * 0.05;
      autoScale.frame(now - lastRenderTime);
    }
    lastRenderTime = now;
    perfStats.updateMs += ((t1 - t0) / steps - perfStats.updateMs) * 0.05;
    perfStats.renderMs += ((t2 - t1) - perfStats.renderMs) * 0.05;
    perfStats.prevFrameGameMs = t2 - t0;
  }
  requestAnimationFrame(loop);
}

// Запуск
updateUILanguage();
initHotbarDrag();
updateHUD();
loop();
