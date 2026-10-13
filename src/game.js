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
        cost: { bottles: 10, scrap: 18 },
        statMods: { damage: 12 },
        locks: ["tentacle_arm"]
      },
      car_battery: {
        id: "car_battery",
        name_ru: "Аккумулятор от КАМАЗа",
        name_en: "Truck Battery Pack",
        desc_ru: "Цепная молния бьёт 2 соседние жабы при попадании",
        desc_en: "Chain lightning arcs to 2 nearby toads",
        cost: { bottles: 14, scrap: 28, mil_parts: 2 },
        statMods: {},
        locks: ["shaman_carpet"]
      },
      laser_eye: {
        id: "laser_eye",
        name_ru: "Лазерный прицел-глаз",
        name_en: "Cybernetic Bionic Eye",
        desc_ru: "Лазерный целеуказатель, +25% шанс крита (x2.5)",
        desc_en: "Red laser sight, +25% crit chance (x2.5)",
        cost: { bottles: 20, scrap: 38, mil_parts: 4, alien_core: 2 },
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
        cost: { bottles: 14, scrap: 12 },
        statMods: {},
        locks: ["drill_arm"]
      },
      slime_skin: {
        id: "slime_skin",
        name_ru: "Токсичная Слизь",
        name_en: "Toxic Mucus Skin",
        desc_ru: "+22% к скорости бега и +30% реген выносливости",
        desc_en: "+22% move speed & +30% stamina regen",
        cost: { bottles: 18, scrap: 22, mil_parts: 2 },
        statMods: {},
        locks: []
      },
      third_frog_eye: {
        id: "third_frog_eye",
        name_ru: "Жабий Глаз-Пузырь",
        name_en: "Amphibian Bulging Eye",
        desc_ru: "+35 макс. Выносливости и снижение расхода на 25%",
        desc_en: "+35 Max Stamina & -25% stamina cost",
        cost: { bottles: 22, scrap: 30, mil_parts: 3, alien_core: 3 },
        statMods: { bonusMaxStamina: 35 },
        locks: ["laser_eye"]
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
        desc_ru: "Враги рядом замедлены на 45%",
        desc_en: "Nearby enemies slowed by 45%",
        cost: { bottles: 16, scrap: 15 },
        statMods: {},
        locks: []
      },
      shaman_carpet: {
        id: "shaman_carpet",
        name_ru: "Плащ из Советского Ковра",
        name_en: "Soviet Rug Cloak",
        desc_ru: "+60 макс. HP и пассивная регенерация здоровья",
        desc_en: "+60 max HP & passive health regeneration",
        cost: { bottles: 22, scrap: 24, mil_parts: 2 },
        statMods: { bonusMaxHp: 60 },
        locks: ["car_battery"]
      },
      pigeon_familiar: {
        id: "pigeon_familiar",
        name_ru: "Призрачный Голубь Гена",
        name_en: "Ghost Pigeon Gena",
        desc_ru: "+20 к базовому урону всех видов оружия",
        desc_en: "+20 base damage to all weapons",
        cost: { bottles: 28, scrap: 35, mil_parts: 3, alien_core: 3 },
        statMods: { damage: 20 },
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

    // 1. АУРА ПЕРЕГАРА (Шаманская способность)
    if (player.hasPerk && player.hasPerk('fume_aura')) {
      const time = Date.now() * 0.004;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 75 + Math.sin(time) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

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
    controls_items: "1–8 — Слоты хотбара (порядок меняется перетаскиванием) | Q — Следующее оружие",
    hp: "ЗДОРОВЬЕ",
    stamina: "ВЫНОСЛИВ.",
    vodka: "Водка",
    stew: "Тушенка",
    bandage: "Бинты",
    game_over: "ПОТРАЧЕНО",
    game_over_sub: "Василий не вернулся с вылазки в Новохмуринск...",
    status_drunk: "ПОД МУХОЙ (+Урон, -Точность!)",
    safe_zone: "БЕЗОПАСНАЯ ЗОНА: У МИХАЛЫЧА",
    prompt_shop: "[E] Открыть лавку и верстак Михалыча",
    prompt_search: "[E] Обыскать тайник",
    shop_title: "ЛАВКА И ВЕРСТАК «У МИХАЛЫЧА»",
    shop_sub: "Покупай оружие, патроны, припасы и собирай армейские/инопланетные модификации!",
    tab_weapons: "Арсенал и Патроны",
    tab_supplies: "Припасы",
    tab_upgrades: "Ветки прокачки",
    shop_bandage: "Бинты (+45 HP)",
    shop_stew: "Тушенка (+65 Вынослив.)",
    shop_vodka: "Водка (+Урон берсерка)",
    shop_close: "ВЕРНУТЬСЯ В ГОРОД [ESC]",
    installed: "УСТАНОВЛЕНО",
    locked_by: "БЛОКИРУЕТСЯ:",
    cost_scrap: "чермета",
    cost_bottles: "бут.",
    boss_name: "ЗОЛОТОЙ МЯСНИК",
    boss_enraged: "ЯРОСТЬ!",
    boss_defeated: "🏆 ЗОЛОТОЙ МЯСНИК ПОВЕРЖЕН!"
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
    controls_items: "1–8 — Hotbar slots (drag to reorder) | Q — Next weapon",
    hp: "HEALTH",
    stamina: "STAMINA",
    vodka: "Vodka",
    stew: "Stew",
    bandage: "Bandages",
    game_over: "WASTED",
    game_over_sub: "Vasiliy never returned from the raid...",
    status_drunk: "DRUNK BERSERK (+DMG, -Accuracy!)",
    safe_zone: "SAFE ZONE: MIKHALYCH'S SCRAP",
    prompt_shop: "[E] Open Mikhalych's Workbench",
    prompt_search: "[E] Scavenge stash",
    shop_title: "MIKHALYCH'S SHOP & WORKBENCH",
    shop_sub: "Buy weapons, ammo, rations and craft military/alien augmentations!",
    tab_weapons: "Arsenal & Ammo",
    tab_supplies: "Supplies",
    tab_upgrades: "Skill Trees",
    shop_bandage: "Bandages (+45 HP)",
    shop_stew: "Stew (+65 Stamina)",
    shop_vodka: "Vodka (+Berserk DMG)",
    shop_close: "RETURN TO CITY [ESC]",
    installed: "INSTALLED",
    locked_by: "LOCKED BY:",
    cost_scrap: "scrap",
    cost_bottles: "bot.",
    boss_name: "THE GOLDEN BUTCHER",
    boss_enraged: "ENRAGED!",
    boss_defeated: "🏆 THE GOLDEN BUTCHER IS DOWN!"
  }
};

let currentLang = 'ru';
function t(key) { return LANGS[currentLang][key] || key; }

function updateUILanguage() {
  document.getElementById('lbl-hp').innerText = t('hp');
  document.getElementById('lbl-stamina').innerText = t('stamina');
  document.getElementById('lbl-vodka').innerText = t('vodka');
  document.getElementById('lbl-stew').innerText = t('stew');
  document.getElementById('lbl-bandage').innerText = t('bandage');
  const lblBat = document.getElementById('lbl-w-bat');
  if (lblBat) lblBat.innerText = currentLang === 'ru' ? 'Бита' : 'Spiked Bat';
  const lblMakarov = document.getElementById('lbl-w-makarov');
  if (lblMakarov) lblMakarov.innerText = currentLang === 'ru' ? 'ПМ 9×18' : 'Makarov PM';
  const lblShotgun = document.getElementById('lbl-w-shotgun');
  if (lblShotgun) lblShotgun.innerText = currentLang === 'ru' ? 'Обрез' : 'Shotgun';
  const lblDrill = document.getElementById('lbl-w-drill');
  if (lblDrill) lblDrill.innerText = currentLang === 'ru' ? 'Дрель' : 'Drill';
  const lblPlasma = document.getElementById('lbl-w-plasma');
  if (lblPlasma) lblPlasma.innerText = currentLang === 'ru' ? 'Плазма' : 'Plasma';
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

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const camera = { x: 0, y: 0 };
let gameState = 'MENU';

const player = {
  x: 2000,
  y: 2000,
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
  items: {
    vodka: 0,
    stew: 1,
    bandage: 2
  },
  resources: {
    bottles: 0,
    scrap: 0,
    mil_parts: 0,
    alien_core: 0
  },
  unlockedWeapons: {
    bat: true,
    makarov: false,
    drill: false,
    shotgun: false,
    plasma: false
  },
  ammo: {
    makarov: { clip: 8, maxClip: 8, reserve: 16, reloadTime: 80 },
    shotgun: { clip: 2, maxClip: 2, reserve: 8, reloadTime: 110 }
  },
  reloadingWeapon: null,
  reloadTimer: 0,
  reloadMaxTimer: 0,
  plasmaHeat: 0,
  plasmaOverheated: false,
  plasmaOverheatTimer: 0,
  currentWeapon: 'bat',
  unlockedPerks: new Set(),
  blockedPerks: new Set(),
  hasPerk(id) {
    return this.unlockedPerks.has(id);
  }
};

const safeZone = {
  x: 2000,
  y: 2000,
  radius: 280,
  shopX: 2000,
  shopY: 1940,
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
let cameraKickX = 0;
let cameraKickY = 0;

// --- СИСТЕМА РАЙОНОВ НОВОХМУРИНСКА И МАТРИЦА ЗАВИСИМОСТЕЙ (TIER 0 -> TIER 4) ---
const DISTRICTS = {
  hub: {
    id: 'hub',
    tier: 0,
    name_ru: '🟢 ПЯТАЧОК У МИХАЛЫЧА',
    name_en: '🟢 MIKHALYCH SAFE HUB',
    meta_ru: 'Угроза: Безопасно | Лавка Оружия, Патронов и Верстак',
    meta_en: 'Threat: Safe | Arsenal, Ammo & Workbench',
    color: '#10b981',
    lootMult: 1.0
  },
  courtyards: {
    id: 'courtyards',
    tier: 1,
    name_ru: '🟡 СПАЛЬНЫЕ ХРУЩЁВКИ',
    name_en: '🟡 RESIDENTIAL COURTYARDS',
    meta_ru: 'Угроза: ★☆☆☆ (Болотные Прыгуны) | Ресурс: Стеклотара, Бинты',
    meta_en: 'Threat: ★☆☆☆ (Swamp Leapers) | Loot: Bottles, Bandages',
    color: '#eab308',
    lootMult: 1.0
  },
  garages: {
    id: 'garages',
    tier: 2,
    name_ru: '🟠 ГАРАЖНЫЙ КООПЕРАТИВ «ВОСТОК»',
    name_en: '🟠 GARAGE COOPERATIVE',
    meta_ru: 'Угроза: ★★☆☆ (Плевальщики и Пехота) | Ресурс: Чермет ×1.5 (на ПМ и Дрель)',
    meta_en: 'Threat: ★★☆☆ (Spitters & Grunts) | Loot: Scrap ×1.5 (for PM & Drill)',
    color: '#f97316',
    lootMult: 1.5
  },
  heating: {
    id: 'heating',
    tier: 2,
    name_ru: '🔵 МАГИСТРАЛЬ ТЕПЛОТРАССЫ',
    name_en: '🔵 HEATING PIPELINE SECTOR',
    meta_ru: 'Угроза: ★★☆☆ (Засады у труб) | Ресурс: Чермет, Водка, Тушёнка ×1.5',
    meta_en: 'Threat: ★★☆☆ (Pipe Ambushes) | Loot: Scrap, Vodka, Stew ×1.5',
    color: '#38bdf8',
    lootMult: 1.5
  },
  cordon: {
    id: 'cordon',
    tier: 3,
    name_ru: '🔴 ВОЕННЫЙ КОРДОН',
    name_en: '🔴 MILITARY CORDON',
    meta_ru: 'Угроза: ★★★☆ (Штурмовики и Громилы) | Особый ресурс: Оружейные детали (на Обрез)',
    meta_en: 'Threat: ★★★☆ (Troopers & Brutes) | Special Loot: Gun Parts (for Shotgun)',
    color: '#ef4444',
    lootMult: 1.9
  },
  nest: {
    id: 'nest',
    tier: 4,
    name_ru: '🟣 КВАКО-ГНЕЗДО (ЗОНА ВЫСАДКИ)',
    name_en: '🟣 TOAD NEST (DROP ZONE)',
    meta_ru: 'Угроза: ★★★★ (Элитные Квако-Танки) | Особый ресурс: Квако-ядра (на Плазмаган)',
    meta_en: 'Threat: ★★★★ (Elite Toad Tanks) | Special Loot: Alien Cores (for Plasma Gun)',
    color: '#a855f7',
    lootMult: 2.5
  }
};

function getDistrictAt(x, y) {
  if (Math.hypot(x - safeZone.x, y - safeZone.y) < 420) {
    return DISTRICTS.hub;
  }
  const isOuterX = (x < 870 || x > 3170);
  const isOuterY = (y < 870 || y > 3170);

  // 4 дальних угла карты — Квако-Гнезда (Tier 4)
  if (isOuterX && isOuterY) {
    return DISTRICTS.nest;
  }
  // Западный сектор — Гаражный кооператив «Восток» (Tier 2A)
  if (x < 870) {
    return DISTRICTS.garages;
  }
  // Восточный сектор — Магистраль Теплотрассы (Tier 2B)
  if (x > 3170) {
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

function generateWorld() {
  buildings = [];
  roads = [];
  containers = [];
  enemies = [];
  bullets = [];
  enemyBullets = [];
  particles = [];
  muzzleFlashes = [];
  shellCasings = [];
  floatingTexts = [];
  lootItems = [];
  cameraKickX = 0;
  cameraKickY = 0;

  roads.push({ x: 0, y: 1900, w: WORLD_WIDTH, h: 200 });
  roads.push({ x: 1900, y: 0, w: 200, h: WORLD_HEIGHT });
  roads.push({ x: 0, y: 800, w: WORLD_WIDTH, h: 140 });
  roads.push({ x: 0, y: 3100, w: WORLD_WIDTH, h: 140 });
  roads.push({ x: 800, y: 0, w: 140, h: WORLD_HEIGHT });
  roads.push({ x: 3100, y: 0, w: 140, h: WORLD_HEIGHT });

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

  const tryAddBuilding = (x, y, w, h, type, extra = {}) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (rx < 70 || ry < 70 || rx + w > WORLD_WIDTH - 70 || ry + h > WORLD_HEIGHT - 70) return null;
    if (Math.hypot(rx + w / 2 - safeZone.x, ry + h / 2 - safeZone.y) < 390) return null;
    if (isNearRoad(rx, ry, w, h, 30)) return null;
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

    const cRadius = type === 'car' ? 48 : (type === 'trash' ? 26 : 22);
    const pad = type === 'car' ? 56 : 38;

    const insideBuilding = buildings.some(b =>
      cx >= b.x - pad && cx <= b.x + b.w + pad &&
      cy >= b.y - pad && cy <= b.y + b.h + pad
    );
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

  // Сетка 16 городских кварталов, образованных дорогами (800, 1900, 3100)
  const colRanges = [
    [110, 740],
    [990, 1840],
    [2150, 3040],
    [3290, 3890]
  ];
  const rowRanges = [
    [110, 740],
    [990, 1840],
    [2150, 3040],
    [3290, 3890]
  ];

  // Враги появляются после того, как расставлены все препятствия, иначе жаба может родиться внутри машины
  const pendingSpawns = [];

  // 0. Стартовые мусорные баки вокруг площади Михалыча (Tier 0 -> Tier 1 переход)
  tryAddContainer(1660, 1845, 'trash', null, 0);
  tryAddContainer(2340, 1845, 'trash', null, 0);
  tryAddContainer(1660, 2155, 'trash', null, 0);

  // 1. Генерация архитектуры, контейнеров и патрулей по каждому из 16 кварталов согласно правилам района
  colRanges.forEach(([x1, x2], cIdx) => {
    rowRanges.forEach(([y1, y2], rIdx) => {
      const bcx = (x1 + x2) * 0.5;
      const bcy = (y1 + y2) * 0.5;
      const dist = getDistrictAt(bcx, bcy);
      const blockBuildings = [];

      if (dist.id === 'courtyards') {
        // 🟡 TIER 1: СПАЛЬНЫЕ ХРУЩЁВКИ — просторные дворы из 5-этажных Хрущёвок и 9-этажных Брежневок
        const b1 = tryAddBuilding(x1 + 60, y1 + 70, 320, 160, 'panel', { subType: 'khrushchevka' });
        const b2 = tryAddBuilding(x2 - 290, y2 - 320, 220, 260, 'panel', { subType: 'brezhnevka' });
        const b3 = tryAddBuilding(x1 + 90, y2 - 240, 320, 160, 'panel', { subType: 'khrushchevka' });
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
          tryAddContainer(b.x - 48, b.y + b.h - 24, 'trash', null, 0);
          tryAddContainer(b.x + 80, b.y + b.h + 48, 'trash', null, 1);
        });
        tryAddContainer(bcx, y1 + 25, 'car', 'zhiguli', 0);

        // Враги: ТОЛЬКО слабые Жабы-Пехотинцы (65 HP), никаких Громил и Снайперов у базы!
        for (let i = 0; i < 3; i++) {
          pendingSpawns.push([x1 + 40, y1 + 40, x2 - 40, y2 - 40, dist]);
        }

      } else if (dist.id === 'garages') {
        // 🟠 TIER 2A: ГАРАЖНЫЙ КООПЕРАТИВ «ВОСТОК» — ряды 3D гаражных боксов №74, заборы ПО-2, много машин и чермета
        const g1 = tryAddBuilding(x1 + 40, y1 + 80, 140, 100, 'garage');
        const g2 = tryAddBuilding(x1 + 220, y1 + 80, 140, 100, 'garage');
        const g3 = tryAddBuilding(x1 + 40, y1 + 360, 140, 100, 'garage');
        const g4 = tryAddBuilding(x1 + 220, y1 + 360, 140, 100, 'garage');
        const g5 = tryAddBuilding(x1 + 80, y2 - 190, 140, 100, 'garage');
        [g1, g2, g3, g4, g5].forEach(g => { if (g) blockBuildings.push(g); });

        // Бетонные заборы ПО-2 продолжают линии гаражного кооператива
        if (g2) tryAddBuilding(g2.x + g2.w + 4, g2.y + g2.h - 32, 220, 30, 'fence_wall', { segments: 2 });
        if (g4) tryAddBuilding(g4.x + g4.w + 4, g4.y + g4.h - 32, 220, 30, 'fence_wall', { segments: 2 });
        if (g5) tryAddBuilding(g5.x + g5.w + 4, g5.y + g5.h - 32, 220, 30, 'fence_wall', { segments: 2 });

        // Контейнеры: Жигули и УАЗы перед гаражами + мусорные баки + армейский ящик с инструментами в глубине
        if (g1) tryAddContainer(g1.x + 70, g1.y + g1.h + 72, 'car', 'zhiguli', 0);
        if (g3) tryAddContainer(g3.x + 70, g3.y + g3.h + 72, 'car', 'uaz', 8);
        tryAddContainer(x2 - 90, bcy - 120, 'car', 'zhiguli', 1);
        tryAddContainer(x1 + 420, y1 + 230, 'box', null, 0);
        tryAddContainer(x1 + 60, y2 - 50, 'trash', null, 0);
        tryAddContainer(x2 - 110, y2 - 110, 'box', null, 1);

        // Враги: Пехотинцы + Снайперы в засадах между гаражами
        for (let i = 0; i < 5; i++) {
          pendingSpawns.push([x1 + 40, y1 + 40, x2 - 40, y2 - 40, dist]);
        }

      } else if (dist.id === 'heating') {
        // 🔵 TIER 2B: МАГИСТРАЛЬ ТЕПЛОТРАССЫ — Кирпичные Котельные ТЭЦ, Брежневки и длинные линии труб теплотрассы
        const p1 = tryAddBuilding(x1 + 45, y1 + 90, 220, 260, 'panel', { subType: 'brezhnevka' });
        const g1 = tryAddBuilding(x1 + 55, y1 + 440, 140, 100, 'garage');
        const p2 = tryAddBuilding(x1 + 45, y2 - 230, 320, 160, 'boiler_house');

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
        tryAddContainer(x1 + 330, y1 + 290, 'trash', null, 0);
        tryAddContainer(x1 + 420, y1 + 380, 'box', null, 0);
        tryAddContainer(x1 + 260, y1 + 575, 'trash', null, 1);
        tryAddContainer(x1 + 480, y2 - 280, 'box', null, 0);
        tryAddContainer(x1 + 160, y1 + 38, 'car', 'uaz', 0);
        tryAddContainer(x2 - 110, bcy + 40, 'car', 'zhiguli', 8);

        // Враги: Снайперы и Штурмовики вдоль труб
        for (let i = 0; i < 5; i++) {
          pendingSpawns.push([x1 + 40, y1 + 40, x2 - 40, y2 - 40, dist]);
        }

      } else if (dist.id === 'cordon') {
        // 🔴 TIER 3: ВОЕННЫЙ КОРДОН — Командный Бункер/Казарма с РЛС, блокпосты из плит ПО-2, санитарные УАЗы, склады
        const b1 = tryAddBuilding(x1 + 70, y1 + 90, 320, 160, 'military_hq');
        const g1 = tryAddBuilding(x1 + 120, y2 - 220, 140, 100, 'garage');
        const g2 = tryAddBuilding(x2 - 360, y1 + 120, 140, 100, 'garage');

        // Длинные защитные рубежи из бетонных заборов ПО-2
        if (b1) tryAddBuilding(b1.x + b1.w + 4, b1.y + b1.h - 32, 220, 30, 'fence_wall', { segments: 2 });
        if (g1) tryAddBuilding(g1.x + g1.w + 4, g1.y + g1.h - 32, 330, 30, 'fence_wall', { segments: 3 });
        if (g2) tryAddBuilding(g2.x + g2.w + 4, g2.y + g2.h - 32, 220, 30, 'fence_wall', { segments: 2 });

        // Контейнеры: преобладают Армейские ящики (55%) и УАЗ-Буханки (35%)
        tryAddContainer(bcx - 90, bcy - 20, 'box', null, 0);
        tryAddContainer(bcx + 40, bcy + 30, 'box', null, 1);
        tryAddContainer(x2 - 180, y2 - 140, 'box', null, 0);
        tryAddContainer(x1 + 220, bcy + 60, 'car', 'uaz', 0);
        tryAddContainer(x2 - 210, y1 + 60, 'car', 'uaz', 8);
        tryAddContainer(x1 + 60, y2 - 70, 'trash', null, 0);

        // Враги: Громилы (35%) + Снайперы (35%) + Ветераны-пехотинцы (30%)
        for (let i = 0; i < 6; i++) {
          pendingSpawns.push([x1 + 40, y1 + 40, x2 - 40, y2 - 40, dist]);
        }

      } else if (dist.id === 'nest') {
        // 🟣 TIER 4: КВАКО-ГНЕЗДО (4 УГЛА КАРТЫ) — захваченные командные бункеры и котельные, элитные склады спецхрана (лут ×2.5)
        const g1 = tryAddBuilding(x1 + 50, y1 + 70, 140, 100, 'garage');
        const pType = ((cIdx + rIdx) % 2 === 0) ? 'military_hq' : 'boiler_house';
        const p1 = tryAddBuilding(x1 + 50, y2 - 230, 320, 160, pType);

        if (g1) tryAddBuilding(g1.x + g1.w + 4, g1.y + g1.h - 32, 220, 30, 'fence_wall', { segments: 2 });
        if (p1) tryAddBuilding(p1.x + p1.w + 4, Math.round(p1.y + p1.h * 0.62 - 20), 252, 40, 'heating_line', { segments: 2 });

        // СВ угол — логово босса: вместо центрального склада открытая арена, ящики-трофеи по краям
        const isBossLair = (cIdx === 3 && rIdx === 0);
        if (isBossLair) {
          tryAddContainer(x2 - 40, y1 + 40, 'box', null, 1);
          tryAddContainer(x2 - 40, y2 - 260, 'box', null, 2);
        } else {
          // Богатое хранилище армейских спец-ящиков и санитарных УАЗов в центре гнезда
          tryAddContainer(bcx - 65, bcy - 45, 'box', null, 0);
          tryAddContainer(bcx + 55, bcy - 40, 'box', null, 1);
          tryAddContainer(bcx - 50, bcy + 55, 'box', null, 2);
          tryAddContainer(bcx + 65, bcy + 60, 'box', null, 0);
          tryAddContainer(x2 - 140, y1 + 140, 'car', 'uaz', 8);
        }
        tryAddContainer(x1 + 150, bcy + 10, 'car', 'uaz', 0);

        // Враги: Элитные стаи (50% Элитные Громилы 320 HP + 35% Снайперы + 15% Мутанты-пехотинцы);
        // в логове — только небольшая охрана, чтобы бой с боссом не превращался в свалку
        const packSize = isBossLair ? 3 : 8;
        for (let i = 0; i < packSize; i++) {
          pendingSpawns.push([x1 + 35, y1 + 35, x2 - 35, y2 - 35, dist]);
        }
      }
    });
  });

  // Бетонный забор ПО-2 по периметру карты: не выпускает ни Василия, ни жаб, пули в него упираются.
  // Рисует его EnvironmentRenderer.drawBorderFence; здесь — только коллизия (с запасом наружу)
  const out = 400;
  [
    { x: -out, y: -out, w: WORLD_WIDTH + out * 2, h: out + 40 },
    { x: -out, y: WORLD_HEIGHT - 40, w: WORLD_WIDTH + out * 2, h: out + 40 },
    { x: -out, y: -out, w: out + 32, h: WORLD_HEIGHT + out * 2 },
    { x: WORLD_WIDTH - 32, y: -out, w: out + 32, h: WORLD_HEIGHT + out * 2 }
  ].forEach(r => buildings.push(Object.assign({ type: 'border_fence' }, r)));

  buildObstacles();
  pendingSpawns.forEach(args => spawnEnemyInRect(...args));
  spawnBoss();
}

function spawnEnemyInRect(x1, y1, x2, y2, distOverride = null) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const ex = x1 + Math.random() * (x2 - x1);
    const ey = y1 + Math.random() * (y2 - y1);

    // Строгий буфер безопасности вокруг базы Михалыча (не ближе 520px!)
    if (Math.hypot(ex - safeZone.x, ey - safeZone.y) < 520) continue;

    // Не спавнить внутри зданий/заборов/труб
    if (checkWalkCollision(ex, ey, 36)) continue;

    const dist = distOverride || getDistrictAt(ex, ey);
    if (dist.id === 'hub') continue;

    const rand = Math.random();
    let type = 'grunt';
    let radius = 22;
    let hp = 110;
    let speed = 2.65;
    let aggroRadius = 290;
    let color = '#22c55e';

    if (dist.id === 'courtyards') {
      // 🟡 TIER 1 (Спальные дворы): Болотные Прыгуны (92 HP — требует 4 полных удара битой с гвоздями и контроля выносливости!)
      type = 'grunt';
      radius = 21;
      hp = 92;
      speed = 2.52;
      aggroRadius = 250;
      color = '#22c55e';
    } else if (dist.id === 'garages') {
      // 🟠 TIER 2A (Гаражи): 55% Пехотинец (135 HP), 38% Кислотный Снайпер (110 HP), 7% Громила (360 HP)
      if (rand < 0.07) {
        type = 'brute'; radius = 34; hp = 360; speed = 1.75; aggroRadius = 310; color = '#a855f7';
      } else if (rand < 0.45) {
        type = 'sniper'; radius = 16; hp = 110; speed = 2.1; aggroRadius = 370; color = '#84cc16';
      } else {
        type = 'grunt'; radius = 22; hp = 135; speed = 2.7; aggroRadius = 300; color = '#22c55e';
      }
    } else if (dist.id === 'heating') {
      // 🔵 TIER 2B (Теплотрасса): 50% Пехотинец (140 HP), 38% Снайпер (115 HP), 12% Громила (380 HP)
      if (rand < 0.12) {
        type = 'brute'; radius = 34; hp = 380; speed = 1.8; aggroRadius = 320; color = '#a855f7';
      } else if (rand < 0.50) {
        type = 'sniper'; radius = 16; hp = 115; speed = 2.12; aggroRadius = 380; color = '#84cc16';
      } else {
        type = 'grunt'; radius = 22; hp = 140; speed = 2.72; aggroRadius = 305; color = '#22c55e';
      }
    } else if (dist.id === 'cordon') {
      // 🔴 TIER 3 (Военный кордон): 38% Бронированный Громила (480 HP), 35% Снайпер (145 HP), 27% Штурмовик (185 HP)
      if (rand < 0.38) {
        type = 'brute'; radius = 35; hp = 480; speed = 1.88; aggroRadius = 345; color = '#a855f7';
      } else if (rand < 0.73) {
        type = 'sniper'; radius = 16; hp = 145; speed = 2.2; aggroRadius = 405; color = '#84cc16';
      } else {
        type = 'grunt'; radius = 23; hp = 185; speed = 2.82; aggroRadius = 325; color = '#22c55e';
      }
    } else if (dist.id === 'nest') {
      // 🟣 TIER 4 (Квако-Гнездо): 52% Элитный Квако-Танк (680 HP), 33% Элитный Снайпер (180 HP), 15% Мутант (230 HP)
      if (rand < 0.52) {
        type = 'brute'; radius = 37; hp = 680; speed = 1.98; aggroRadius = 365; color = '#a855f7';
      } else if (rand < 0.85) {
        type = 'sniper'; radius = 17; hp = 180; speed = 2.25; aggroRadius = 420; color = '#84cc16';
      } else {
        type = 'grunt'; radius = 24; hp = 230; speed = 2.92; aggroRadius = 345; color = '#22c55e';
      }
    }
    // Ступни этого типа тоже должны стоять на свободном месте (см. footDY)
    if (checkWalkCollision(ex, ey, radius, FOOT_DY[type])) continue;

    enemies.push({
      x: ex,
      y: ey,
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

function spawnPatrolEnemy(deadEnemy = null) {
  if (deadEnemy && deadEnemy.bounds) {
    const b = deadEnemy.bounds;
    const dist = DISTRICTS[deadEnemy.districtId] || getDistrictAt((b.x1 + b.x2) * 0.5, (b.y1 + b.y2) * 0.5);
    if (Math.hypot(player.x - (b.x1 + b.x2) * 0.5, player.y - (b.y1 + b.y2) * 0.5) > 550) {
      spawnEnemyInRect(b.x1, b.y1, b.x2, b.y2, dist);
    }
    return;
  }
  spawnEnemyInRect(200, 200, WORLD_WIDTH - 200, WORLD_HEIGHT - 200, null);
}

// --- УПРАВЛЕНИЕ ---
const keys = {};
let mouseScreen = { x: 0, y: 0 };
let mouseWorld = { x: 0, y: 0 };
let mouseDown = false;
let shootCooldown = 0;
let nearbyInteractable = null;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && gameState === 'PLAYING') handleInteract();
  // ESC: закрыть настройки / магазин, поставить или снять паузу (src/menu.js)
  if (e.code === 'Escape') {
    if (window.Menu) window.Menu.onEscape();
    else if (gameState === 'SHOP') closeShop();
  }

  if (gameState === 'PLAYING') {
    if (e.code === 'Space') performRoll();
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyQ') cycleWeapon();
    // Цифры 1–8 — видимые слоты хотбара по порядку (порядок игрок меняет перетаскиванием)
    const digit = /^Digit[1-8]$/.test(e.code) ? Number(e.code.slice(5)) : 0;
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
window.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });

// --- ХОТБАР: слоты перетаскиваются мышью, клавиши 1–8 идут по видимому порядку, порядок сохраняется ---
const HOTBAR_DEFAULT_ORDER = ['vodka', 'stew', 'bandage', 'bat', 'makarov', 'drill', 'shotgun', 'plasma'];
const HOTBAR_WEAPONS = new Set(['bat', 'makarov', 'drill', 'shotgun', 'plasma']);
const HOTBAR_STORAGE_KEY = 'vasiliy.hotbarOrder';
let hotbarOrder = loadHotbarOrder();

function loadHotbarOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(HOTBAR_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === HOTBAR_DEFAULT_ORDER.length &&
        HOTBAR_DEFAULT_ORDER.every(id => saved.includes(id))) {
      return saved;
    }
  } catch (e) { /* хранилище недоступно — порядок по умолчанию */ }
  return HOTBAR_DEFAULT_ORDER.slice();
}

function saveHotbarOrder() {
  try { localStorage.setItem(HOTBAR_STORAGE_KEY, JSON.stringify(hotbarOrder)); } catch (e) { /* не критично */ }
}

// Ещё не купленное оружие в хотбаре скрыто и номера не занимает
function visibleHotbarSlots() {
  return hotbarOrder.filter(id => !HOTBAR_WEAPONS.has(id) || player.unlockedWeapons[id]);
}

function activateHotbarSlot(id) {
  if (HOTBAR_WEAPONS.has(id)) window.switchWeapon(id);
  else window.useItem(id);
}

// Расставляет слоты в DOM по hotbarOrder и подписывает клавиши [1]..[N] у видимых
function applyHotbarOrder() {
  const bar = document.getElementById('hotbar');
  if (!bar) return;
  const visible = visibleHotbarSlots();
  hotbarOrder.forEach(id => {
    const slot = bar.querySelector(`[data-slot="${id}"]`);
    if (!slot) return;
    bar.appendChild(slot);
    const n = visible.indexOf(id);
    slot.querySelector('.slot-key').textContent = n >= 0 ? `[${n + 1}]` : '';
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
      hotbarOrder = [...bar.querySelectorAll('.hotbar-slot')].map(s => s.dataset.slot);
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
function startGame(save = null) {
  gameState = 'PLAYING';
  document.getElementById('screen-menu').style.display = 'none';

  player.x = safeZone.x;
  player.y = safeZone.y + 70;
  player.maxHp = 100;
  player.hp = player.maxHp;
  player.maxStamina = 100;
  player.stamina = player.maxStamina;
  player.isDrunk = false;
  player.drunkTimer = 0;
  player.items = { vodka: 0, stew: 1, bandage: 2 };
  player.resources = { bottles: 0, scrap: 0, mil_parts: 0, alien_core: 0 };
  player.unlockedWeapons = {
    bat: true,
    makarov: false,
    drill: false,
    shotgun: false,
    plasma: false
  };
  player.ammo = {
    makarov: { clip: 8, maxClip: 8, reserve: 16, reloadTime: 80 },
    shotgun: { clip: 2, maxClip: 2, reserve: 8, reloadTime: 110 }
  };
  player.reloadingWeapon = null;
  player.reloadTimer = 0;
  player.reloadMaxTimer = 0;
  player.plasmaHeat = 0;
  player.plasmaOverheated = false;
  player.plasmaOverheatTimer = 0;
  player.currentWeapon = 'bat';
  player.baseDamage = 24;
  player.critChance = 0.05;
  player.critMult = 1.6;
  player.unlockedPerks.clear();
  player.blockedPerks.clear();
  lastPlayerDistrictId = 'hub';

  generateWorld();
  if (save && window.Menu) window.Menu.applyRun(save);
  if (window.threeCharacter) window.threeCharacter.setWeapon(player.currentWeapon);
  applyHotbarOrder();
  updateHUD(true);
}

function gameOver() {
  gameState = 'GAMEOVER';
  // Рогалик: смерть заканчивает забег, сохранение стирается
  if (window.Menu) window.Menu.onGameOver();
  document.getElementById('screen-menu').style.display = 'flex';
  updateUILanguage();
}

// --- ВЗАИМОДЕЙСТВИЕ И МАГАЗИН/ВЕРСТАК ---
function handleInteract() {
  if (!nearbyInteractable) return;
  if (nearbyInteractable.type === 'shop') openShop();
  else if (nearbyInteractable.type === 'container') scavengeContainer(nearbyInteractable.target);
}

function spawn3DLootItem(x, y, type, val = 1) {
  const icons = {
    scrap: '⚙️',
    bottle: '🍾',
    mil_parts: '🧰',
    alien_core: '🔮',
    ammo_9x18: '🔫',
    ammo_12g: '💥',
    stew: '🥫',
    vodka: '🍾',
    bandage: '🩹'
  };
  lootItems.push({
    x: Math.round(x),
    y: Math.round(y),
    type: type,
    icon: icons[type] || '⚙️',
    val: Math.max(1, Math.round(val))
  });
}

function scavengeContainer(c) {
  if (c.searched) return;
  c.searched = true;

  const dist = getDistrictAt(c.x, c.y);
  const mult = dist.lootMult || 1.0;
  const toPlayerAngle = Math.atan2(player.y - c.y, player.x - c.x);

  let bottleRoll = 1;
  let scrapRoll = 0;
  const bonusDrops = [];

  if (c.type === 'trash') {
    // Мусорный бак ЖЭК-4: в спальных дворах — главный источник стеклотары и бинтов
    bottleRoll = Math.max(1, Math.round((2 + Math.floor(Math.random() * 2)) * mult));
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
    scrapRoll = Math.max(1, Math.round((2 + Math.floor(Math.random() * 3) + garageBonus) * mult));
    bottleRoll = 1 + Math.floor(Math.random() * 2);
    const r = Math.random();
    if (r < 0.38) bonusDrops.push('stew');
    else if (r < 0.62) bonusDrops.push('ammo_9x18');
  } else if (c.type === 'car' && c.subType === 'uaz') {
    // Санитарный УАЗ-452 «Буханка»: чермет + медицина, а на Кордоне — Оружейные детали!
    scrapRoll = Math.round((3 + Math.floor(Math.random() * 3)) * mult);
    bottleRoll = 1 + Math.floor(Math.random() * 2);
    bonusDrops.push('bandage');
    if (dist.id === 'cordon' || dist.id === 'nest') {
      bonusDrops.push('mil_parts');
    }
    if (Math.random() < 0.5) bonusDrops.push('ammo_12g');
  } else {
    // Армейский ящик (Военторг / Спецхран):
    scrapRoll = Math.round((4 + Math.floor(Math.random() * 3)) * mult);
    bottleRoll = 1 + Math.floor(Math.random() * 2);
    bonusDrops.push('stew');
    if (dist.id === 'cordon') {
      // На Военном Кордоне гарантированно падают Оружейные детали!
      bonusDrops.push('mil_parts');
      if (Math.random() < 0.55) bonusDrops.push('ammo_12g');
    } else if (dist.id === 'nest') {
      // В Квако-Гнезде падают Квако-ядра и Оружейные детали!
      bonusDrops.push('alien_core');
      if (Math.random() < 0.65) bonusDrops.push('mil_parts');
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
      itemType === 'ammo_9x18' ? 8 : (itemType === 'ammo_12g' ? 4 : 1)
    );
  });

  createParticles(c.x, c.y, dist.color || '#94a3b8', 14);
  updateHUD(true);
}

// --- КАТАЛОГ ОРУЖИЯ, ПАТРОНОВ И ПРИПАСОВ МИХАЛЫЧА (С PNG-РЕНДЕРАМИ) ---
const SHOP_ARSENAL_ITEMS = [
  {
    id: 'makarov',
    type: 'weapon',
    weaponKey: 'makarov',
    slotKey: '[5]',
    img: 'assets/sprites/weapons/weapon_makarov.png?v=1026',
    name_ru: 'Пистолет Макарова (ПМ 9×18)',
    name_en: 'Makarov Pistol (PM 9×18)',
    desc_ru: 'Урон: 34 | Магазин: 8 патр. (+24 в комплекте). Надёжное табельное оружие против плевальщиков.',
    desc_en: 'DMG: 34 | Mag: 8 rds (+24 included). Reliable sidearm against ranged spitters.',
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
    desc_ru: 'Урон: 36/тик | Тратит выносливость (-4.5/тик). Перемалывает жаб в ближнем бою без патронов.',
    desc_en: 'DMG: 36/tick | Drains stamina (-4.5/tick). Shreds armor at close range.',
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
    desc_ru: 'Урон: 7×18 картечь | Стволы: 2 патр. (+12 в комплекте). Сносит штурмовиков в упор.',
    desc_en: 'DMG: 7×18 buckshot | Barrels: 2 shells (+12 included). Devastating stopping power.',
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
    zone_ru: '🟣 Нужны Квако-ядра из угловых Квако-Гнёзд!',
    zone_en: '🟣 Requires Alien Cores from corner Toad Nests!',
    cost: { bottles: 30, scrap: 35, mil_parts: 6, alien_core: 5 }
  }
];

const SHOP_SUPPLY_ITEMS = [
  {
    id: 'bandage',
    img: 'assets/sprites/loot/loot_bandage.png?v=1026',
    name_ru: 'Стерильный бинт (+45 HP)',
    name_en: 'Sterile Bandage (+45 HP)',
    desc_ru: 'Перевязка ран после укусов и кислотных плевков (клавиша [3]).',
    desc_en: 'Restores 45 Health in combat (key [3]).',
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
  if (cost.bottles && player.resources.bottles < cost.bottles) return false;
  if (cost.scrap && player.resources.scrap < cost.scrap) return false;
  if (cost.mil_parts && player.resources.mil_parts < cost.mil_parts) return false;
  if (cost.alien_core && player.resources.alien_core < cost.alien_core) return false;
  return true;
}

function payCost(cost) {
  if (cost.bottles) player.resources.bottles -= cost.bottles;
  if (cost.scrap) player.resources.scrap -= cost.scrap;
  if (cost.mil_parts) player.resources.mil_parts -= cost.mil_parts;
  if (cost.alien_core) player.resources.alien_core -= cost.alien_core;
}

function formatCostHTML(cost) {
  const parts = [];
  if (cost.bottles) {
    parts.push(`<span><img class="inline-res-icon" src="assets/sprites/loot/loot_bottle.png?v=1026">${cost.bottles}</span>`);
  }
  if (cost.scrap) {
    parts.push(`<span><img class="inline-res-icon" src="assets/sprites/loot/loot_scrap.png?v=1026">${cost.scrap}</span>`);
  }
  if (cost.mil_parts) {
    parts.push(`<span style="color:#fca5a5;"><img class="inline-res-icon" src="assets/sprites/loot/loot_mil_parts.png?v=1026">${cost.mil_parts}</span>`);
  }
  if (cost.alien_core) {
    parts.push(`<span style="color:#d8b4fe;"><img class="inline-res-icon" src="assets/sprites/loot/loot_alien_core.png?v=1026">${cost.alien_core}</span>`);
  }
  return parts.join(' ');
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
  const wB = document.getElementById('shop-res-bottles');
  const wS = document.getElementById('shop-res-scrap');
  const wM = document.getElementById('shop-res-mil');
  const wC = document.getElementById('shop-res-core');
  if (wB) wB.innerText = player.resources.bottles;
  if (wS) wS.innerText = player.resources.scrap;
  if (wM) wM.innerText = player.resources.mil_parts;
  if (wC) wC.innerText = player.resources.alien_core;

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

      const isOwnedWeapon = item.type === 'weapon' && player.unlockedWeapons[item.weaponKey];
      const card = document.createElement('div');
      card.className = `shop-card ${isOwnedWeapon ? 'owned' : ''}`;

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
        btn.disabled = true;
        btn.style.background = '#166534';
        btn.style.borderColor = '#22c55e';
        btn.style.color = '#fff';
        btn.innerHTML = currentLang === 'ru' ? `✅ КУПЛЕНО ${item.slotKey}` : `✅ OWNED ${item.slotKey}`;
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

function buyArsenalItem(item) {
  if (!canAffordCost(item.cost)) return;
  if (item.type === 'weapon' && player.unlockedWeapons[item.weaponKey]) return;

  payCost(item.cost);
  if (item.type === 'weapon') {
    player.unlockedWeapons[item.weaponKey] = true;
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

window.buyItem = function(item, costBottles) {
  if (player.resources.bottles >= costBottles) {
    player.resources.bottles -= costBottles;
    player.items[item]++;
    addFloatingText(player.x, player.y - 30, `+1 ${t(item).toUpperCase()}`, '#4ade80');
    updateHUD(true);
    renderArsenalAndSupplies();
  }
};

function renderUpgradeTrees() {
  const container = document.getElementById('tree-container');
  if (!container) return;
  container.innerHTML = '';

  const wB = document.getElementById('shop-res-bottles');
  const wS = document.getElementById('shop-res-scrap');
  const wM = document.getElementById('shop-res-mil');
  const wC = document.getElementById('shop-res-core');
  if (wB) wB.innerText = player.resources.bottles;
  if (wS) wS.innerText = player.resources.scrap;
  if (wM) wM.innerText = player.resources.mil_parts;
  if (wC) wC.innerText = player.resources.alien_core;

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
      const isInstalled = player.hasPerk(perk.id);
      const isLocked = player.blockedPerks.has(perk.id);

      const card = document.createElement('div');
      card.className = `perk-card ${isInstalled ? 'installed' : ''} ${isLocked ? 'locked' : ''}`;

      const nameEl = document.createElement('div');
      nameEl.className = 'perk-name';
      nameEl.innerText = currentLang === 'ru' ? perk.name_ru : perk.name_en;

      const descEl = document.createElement('div');
      descEl.className = 'perk-desc';
      descEl.innerText = currentLang === 'ru' ? perk.desc_ru : perk.desc_en;

      const costEl = document.createElement('div');
      costEl.className = 'perk-cost';
      costEl.innerHTML = formatCostHTML(perk.cost);

      card.appendChild(nameEl);
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

function buyPerk(perk) {
  if (!canAffordCost(perk.cost)) return;
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

  addFloatingText(player.x, player.y - 35, `${perk.name_ru.toUpperCase()}`, '#38bdf8');
  createParticles(player.x, player.y, '#38bdf8', 20);

  updateHUD(true);
  renderUpgradeTrees();
}

window.useItem = function(itemType) {
  if (gameState !== 'PLAYING') return;
  if (player.items[itemType] <= 0) return;

  player.items[itemType]--;
  if (itemType === 'vodka') {
    player.isDrunk = true;
    player.drunkTimer = 600;
    addFloatingText(player.x, player.y - 30, t('status_drunk'), '#f59e0b');
    createParticles(player.x, player.y, '#f59e0b', 14);
  } else if (itemType === 'stew') {
    player.stamina = Math.min(player.maxStamina, player.stamina + 65);
    addFloatingText(player.x, player.y - 30, "+65 ВЫНОСЛИВ.", '#38bdf8');
    createParticles(player.x, player.y, '#38bdf8', 10);
  } else if (itemType === 'bandage') {
    player.hp = Math.min(player.maxHp, player.hp + 45);
    addFloatingText(player.x, player.y - 30, "+45 HP", '#22c55e');
    createParticles(player.x, player.y, '#22c55e', 12);
  }
  updateHUD(true);
};

function performRoll() {
  const stamMult = player.hasPerk('third_frog_eye') ? 0.75 : 1.0;
  const rollCost = Math.round(25 * stamMult);
  if (player.isRolling || player.rollCooldown > 0 || player.stamina < rollCost) return;
  
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
  player.rollCooldown = 35;
  player.rollDx = dx;
  player.rollDy = dy;
  player.stamina -= rollCost;
  createParticles(player.x, player.y, '#94a3b8', 8);

  if (player.hasPerk('drill_arm')) {
    createParticles(player.x, player.y, '#eab308', 15);
    enemies.forEach(e => {
      if (Math.hypot(player.x - e.x, player.y - e.y) < 75) {
        e.hp -= 35;
        addFloatingText(e.x, e.y - 20, '-35 УДАР', '#eab308');
      }
    });
  }
}

window.switchWeapon = function(weaponKey) {
  const allWeapons = ['bat', 'makarov', 'drill', 'shotgun', 'plasma'];
  if (!allWeapons.includes(weaponKey)) return;

  if (!player.unlockedWeapons[weaponKey]) {
    SoundFX.emptyClick();
    addFloatingText(player.x, player.y - 38, currentLang === 'ru' ? '🔒 КУПИТЕ В ЛАВКЕ МИХАЛЫЧА!' : '🔒 BUY AT MIKHALYCH SHOP!', '#f87171');
    return;
  }

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
    plasma: currentLang === 'ru' ? 'ТРОФЕЙНЫЙ ПЛАЗМАГАН' : 'TROPHY PLASMA GUN'
  };
  addFloatingText(player.x, player.y - 35, `${names[weaponKey]}`, '#38bdf8');
  createParticles(player.x, player.y, '#38bdf8', 8);
  updateHUD(true);
};

window.cycleWeapon = function() {
  // Q перебирает открытое оружие в порядке хотбара
  const weapons = hotbarOrder.filter(w => HOTBAR_WEAPONS.has(w) && player.unlockedWeapons[w]);
  if (weapons.length <= 1) return;
  const curIdx = weapons.indexOf(player.currentWeapon);
  const nextIdx = (curIdx + 1) % weapons.length;
  window.switchWeapon(weapons[nextIdx]);
};

function startReload() {
  const wKey = player.currentWeapon;
  if (wKey !== 'makarov' && wKey !== 'shotgun') return;
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
  SoundFX.reload();
  addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? 'ПЕРЕЗАРЯДКА [R]...' : 'RELOADING [R]...', '#facc15');
  updateHUD(true);
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

  const wKey = player.currentWeapon || 'bat';
  if (!player.unlockedWeapons[wKey]) return;

  // Если оружие сейчас перезаряжается — ждём окончания перезарядки
  if (player.reloadingWeapon === wKey) return;

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

  // =========================================================================
  // [4] БИТА С ГВОЗДЯМИ (Рукопашное оружие, старт игры, тратит 18 выносливости)
  // =========================================================================
  if (wKey === 'bat') {
    const batStamCost = 18 * stamMult;
    const isExhausted = player.stamina < batStamCost;

    if (isExhausted) {
      player.stamina = Math.max(0, player.stamina - 6);
      shootCooldown = 36;
      addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? 'ВЫДОХСЯ! (-УРОН)' : 'EXHAUSTED!', '#f97316');
    } else {
      player.stamina = Math.max(0, player.stamina - batStamCost);
      shootCooldown = 22;
    }

    if (window.threeCharacter && typeof window.threeCharacter.triggerSwing === 'function') {
      window.threeCharacter.triggerSwing();
    }

    const batReach = 84;
    let hitAny = false;

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
          let dmg = (player.baseDamage + 2) * (player.isDrunk ? 1.8 : 1.0);
          if (isExhausted) dmg *= 0.45;
          const isCrit = !isExhausted && (Math.random() < player.critChance);
          if (isCrit) dmg *= player.critMult;

          e.hp -= dmg;
          e.isAggroed = true;
          e.hitFlash = 6;

          // Отбрасывание жабы шипованной битой (чтобы можно было держать дистанцию в стартовой зоне!)
          const kb = e.type === 'boss' ? 0 : (isExhausted ? 7 : (e.type === 'brute' ? 8 : 20));
          const kx = e.x + Math.cos(toEnemyAngle) * kb;
          const ky = e.y + Math.sin(toEnemyAngle) * kb;
          if (!checkWalkCollision(kx, ky, e.radius, footDY(e))) {
            e.x = kx;
            e.y = ky;
          }

          spawnDirectionalSparks(e.x, e.y - 8, toEnemyAngle, 1.0, 9, '#ef4444', 4, 11, 12);
          createParticles(e.x, e.y, '#22c55e', 6);
          addFloatingText(e.x, e.y - 20, `${isCrit ? 'КРИТ! ' : ''}-${Math.round(dmg)}`, isCrit ? '#ef4444' : '#f8fafc');
        }
      }
    });

    SoundFX.batSwing(hitAny);
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
    shootCooldown = 14;
    SoundFX.makarov();
    if (window.threeCharacter) {
      window.threeCharacter.triggerRecoil(0.65);
    }

    const spread = player.isDrunk ? 0.14 : 0.035;
    const angle = player.angle + (Math.random() - 0.5) * spread;
    const speed = 25;
    const isCrit = Math.random() < (player.critChance + 0.05);
    let dmg = (player.baseDamage + 12) * (player.isDrunk ? 1.6 : 1.0) * (isCrit ? player.critMult : 1.0);

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
  // [6] УДАРНАЯ ДРЕЛЬ ИЭ-1035 (Контактный бур, тратит 4.5 выносливости за тик)
  // =========================================================================
  if (wKey === 'drill') {
    const drillStamCost = 4.5 * stamMult;
    if (player.stamina < drillStamCost) {
      shootCooldown = 18;
      SoundFX.emptyClick();
      addFloatingText(player.x, player.y - 36, currentLang === 'ru' ? 'НЕТ ВЫНОСЛИВОСТИ ДЛЯ ДРЕЛИ!' : 'NO STAMINA FOR DRILL!', '#f97316');
      return;
    }

    player.stamina = Math.max(0, player.stamina - drillStamCost);
    shootCooldown = 12;
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

    enemies.forEach(e => {
      const dist = Math.hypot(e.x - player.x, e.y - (player.y - 20));
      if (dist < drillReach + e.radius) {
        const toEnemyAngle = Math.atan2(e.y - (player.y - 20), e.x - player.x);
        let angleDiff = Math.abs(toEnemyAngle - player.angle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff < 1.05) {
          const dmg = (player.baseDamage + 14) * (player.isDrunk ? 1.8 : 1.0);
          e.hp -= dmg;
          e.isAggroed = true;
          e.hitFlash = 5;
          spawnDirectionalSparks(e.x, e.y - 8, toEnemyAngle, 1.1, 10, '#f97316', 5, 12, 12);
          createParticles(e.x, e.y, '#22c55e', 6);
          addFloatingText(e.x, e.y - 20, `-${Math.round(dmg)} БУР`, '#eab308');
        }
      }
    });
    updateHUD();
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

    shootCooldown = 10;
    SoundFX.plasma();
    if (window.threeCharacter) {
      window.threeCharacter.triggerRecoil(0.7);
    }

    player.plasmaHeat = Math.min(100, player.plasmaHeat + 16);
    if (player.plasmaHeat >= 100) {
      player.plasmaOverheated = true;
      player.plasmaOverheatTimer = 180; // 3.0 сек аварийного охлаждения
      SoundFX.overheat();
      spawnGunpowderSmoke(muzzle.x, muzzle.y, player.angle, 9);
      addFloatingText(player.x, player.y - 42, currentLang === 'ru' ? '🔥 ПЕРЕГРЕВ ПЛАЗМЫ (3 СЕК)!' : '🔥 PLASMA OVERHEAT (3s)!', '#ef4444');
    }

    let dmg = (player.baseDamage + 24) * (player.isDrunk ? 1.5 : 1.0);
    let isCrit = Math.random() < player.critChance;
    if (isCrit) dmg *= player.critMult;

    const angle = player.angle + (Math.random() - 0.5) * (player.isDrunk ? 0.16 : 0.025);
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
  shootCooldown = 26;
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

  const pellets = 7;
  const basePelletDmg = (player.baseDamage * 0.72) * (player.isDrunk ? 1.85 : 1.0);

  for (let p = 0; p < pellets; p++) {
    const conePos = (p / (pellets - 1)) - 0.5;
    const jitter = (Math.random() - 0.5) * 0.08;
    const spreadSpan = player.isDrunk ? 0.40 : 0.24;
    const pelletAngle = player.angle + conePos * spreadSpan + jitter;
    const speed = 23 + Math.random() * 5.5;
    let isCrit = Math.random() < player.critChance;
    let dmg = basePelletDmg * (isCrit ? player.critMult : 1.0);

    bullets.push({
      x: muzzle.x + Math.cos(pelletAngle) * 4,
      y: muzzle.y + Math.sin(pelletAngle) * 4,
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
      life: 24,
      maxLife: 24,
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
  military_hq: { top: 13, side: 3 },
  garage: { top: 9, side: 0 },
  fence_wall: { top: 23, side: 0 }
};

function buildingCollisionRect(b) {
  const key = b.type === 'panel' ? (b.w >= 300 ? 'khrushchevka' : 'brezhnevka') : b.type;
  const o = BUILDING_ROOF_OVERHANG[key] || { top: 0, side: 0 };
  return { x: b.x - o.side, y: b.y - o.top, w: b.w + o.side * 2, h: b.h + o.top };
}

// Здания (с крышей): блокируют и персонажей, и пули. Возвращает прямоугольник здания или null
function checkBuildingCollision(x, y, radius) {
  for (let i = 0; i < buildings.length; i++) {
    const r = buildings[i].col || buildings[i];
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
const FOOT_DY = { player: 24, grunt: 14, sniper: 12, brute: 30, boss: 0 };
function footDY(ent) {
  return ent === player ? FOOT_DY.player : (FOOT_DY[ent.type] || 0);
}

// Возвращает то, во что упёрлись (прямоугольник здания {x, y, w, h} или препятствие), либо null.
// footOffset — на сколько ступни ниже точки (x, y), см. footDY()
function checkWalkCollision(x, y, radius, footOffset = 0) {
  y += footOffset;
  const b = checkBuildingCollision(x, y, radius);
  if (b) return b;
  // С мелкими препятствиями сталкиваются ступни, а не плечи: с полным радиусом урна или столб
  // посреди тротуара перекрывали его целиком, и мимо них нельзя было пройти
  const feet = radius * 0.5;
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
    const pad = shape.w !== undefined ? radius : radius * 0.5;
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

// Размеры — по нижней части спрайтов (крыша машины и крона дерева рисуются выше и не мешают ходить за ними)
function buildObstacles() {
  obstacleGrid = new Map();
  containers.forEach(c => {
    const rot = typeof c.dirIdx === 'number' ? -(c.dirIdx / 16) * Math.PI * 2 : 0;
    if (c.type === 'car') {
      const isUaz = c.subType === 'uaz';
      addObstacle({ x: c.x, y: c.y + 6, rx: isUaz ? 80 : 76, ry: isUaz ? 36 : 30, rot });
    } else if (c.type === 'trash') {
      addObstacle({ x: c.x, y: c.y + 6, rx: 24, ry: 22, rot: 0 });
    } else {
      addObstacle({ x: c.x, y: c.y + 4, rx: 26, ry: 16, rot });
    }
  });
  // Ларёк Михалыча: тело киоска; подойти к прилавку для торговли можно спереди
  addObstacle({ rect: true, x1: safeZone.shopX - 100, y1: safeZone.shopY - 80, x2: safeZone.shopX + 100, y2: safeZone.shopY + 45 });

  const env = window.environmentRenderer;
  if (!env) return;
  env.ensureCourtyardLayout(buildings);
  env.courtyardTrees.forEach(t => addObstacle({ x: t.x, y: t.y + 2, rx: 16, ry: 12, rot: 0 }));
  env.staticStreetLamps.forEach(l => addObstacle({ x: l.x, y: l.y, rx: 7, ry: 6, rot: 0 }));
  env.courtyardBenches.forEach(b => addObstacle({ x: b.x, y: b.y + 4, rx: 30, ry: 12, rot: 0 }));
  env.courtyardBins.concat(env.staticSidewalkBins).forEach(b => addObstacle({ x: b.x, y: b.y + 4, rx: 10, ry: 8, rot: 0 }));
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

  if (_hudCache.vodka !== player.items.vodka) {
    _hudCache.vodka = player.items.vodka;
    document.getElementById('count-vodka').innerText = player.items.vodka;
  }
  if (_hudCache.stew !== player.items.stew) {
    _hudCache.stew = player.items.stew;
    document.getElementById('count-stew').innerText = player.items.stew;
  }
  if (_hudCache.bandage !== player.items.bandage) {
    _hudCache.bandage = player.items.bandage;
    document.getElementById('count-bandage').innerText = player.items.bandage;
  }
  if (_hudCache.scrap !== player.resources.scrap) {
    _hudCache.scrap = player.resources.scrap;
    document.getElementById('res-scrap').innerText = player.resources.scrap;
  }
  if (_hudCache.bottles !== player.resources.bottles) {
    _hudCache.bottles = player.resources.bottles;
    document.getElementById('res-bottles').innerText = player.resources.bottles;
  }
  if (_hudCache.mil_parts !== player.resources.mil_parts) {
    _hudCache.mil_parts = player.resources.mil_parts;
    const el = document.getElementById('res-mil-parts');
    if (el) el.innerText = player.resources.mil_parts;
  }
  if (_hudCache.alien_core !== player.resources.alien_core) {
    _hudCache.alien_core = player.resources.alien_core;
    const el = document.getElementById('res-alien-core');
    if (el) el.innerText = player.resources.alien_core;
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
  const showBossBar = !!(bossRef && bossRef.isAggroed && (gameState === 'PLAYING' || gameState === 'PAUSED'));
  setHudStyle(document.getElementById('boss-bar'), 'display', showBossBar ? 'flex' : 'none');
  if (showBossBar) {
    const bossPct = Math.max(0, Math.round((bossRef.hp / bossRef.maxHp) * 1000) / 10);
    setHudStyle(document.getElementById('boss-bar-fill'), 'width', `${bossPct}%`);
    setHudText(document.getElementById('boss-name'), bossRef.enraged ? `${t('boss_name')} — ${t('boss_enraged')}` : t('boss_name'));
  }

  if (gameState === 'PLAYING' && dist && dist.id !== lastPlayerDistrictId) {
    lastPlayerDistrictId = dist.id;
    const label = currentLang === 'ru' ? dist.name_ru : dist.name_en;
    addFloatingText(player.x, player.y - 52, `📍 ${label}`, dist.color);
  }

  // Отображаем в хотбаре ТОЛЬКО купленное/открытое оружие (без спойлера всего арсенала на старте!)
  const allW = ['bat', 'makarov', 'drill', 'shotgun', 'plasma'];
  allW.forEach(w => {
    const slotEl = document.getElementById(`slot-w-${w}`);
    if (!slotEl) return;

    const unlocked = !!player.unlockedWeapons[w];
    setHudStyle(slotEl, 'display', unlocked ? 'flex' : 'none');
    if (!unlocked) return;

    slotEl.classList.toggle('active', player.currentWeapon === w);

    if (w === 'drill') {
      setHudText(document.getElementById('sub-w-drill'), '-4.5 ВЫН');
    } else if (w === 'makarov' || w === 'shotgun') {
      const ammoEl = document.getElementById(`ammo-w-${w}`);
      const wrapEl = document.getElementById(`wrap-w-${w}`);
      const barEl = document.getElementById(`bar-w-${w}`);
      if (player.reloadingWeapon === w) {
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
      slotEl.classList.toggle('overheated', !!player.plasmaOverheated);
      if (player.plasmaOverheated) {
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
    }
  });
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

function spawnLootDrop(enemyOrX, yOpt) {
  const isEnemyObj = (typeof enemyOrX === 'object' && enemyOrX !== null);
  const x = isEnemyObj ? enemyOrX.x : enemyOrX;
  const y = isEnemyObj ? enemyOrX.y : yOpt;
  const eType = isEnemyObj ? (enemyOrX.type || 'grunt') : 'grunt';
  const dist = getDistrictAt(x, y);
  const mult = dist.lootMult || 1.0;

  if (eType === 'brute') {
    const scrapVal = Math.round((2 + Math.floor(Math.random() * 3)) * mult);
    const bottleVal = Math.round((1 + Math.floor(Math.random() * 2)) * mult);
    spawn3DLootItem(x - 16, y - 6, 'scrap', scrapVal);
    spawn3DLootItem(x + 16, y - 6, 'bottle', bottleVal);

    if (dist.id === 'cordon') {
      spawn3DLootItem(x, y + 16, 'mil_parts', 1);
    } else if (dist.id === 'nest') {
      spawn3DLootItem(x - 12, y + 16, 'alien_core', 1);
      if (Math.random() < 0.65) spawn3DLootItem(x + 14, y + 16, 'mil_parts', 1);
    } else if (Math.random() < 0.55) {
      const supplyPool = ['vodka', 'stew', 'bandage'];
      spawn3DLootItem(x, y + 16, supplyPool[Math.floor(Math.random() * supplyPool.length)], 1);
    }
  } else if (eType === 'sniper') {
    const bottleVal = Math.round((1 + Math.floor(Math.random() * 2)) * mult);
    spawn3DLootItem(x - 10, y, 'bottle', bottleVal);
    if (dist.id === 'nest' && Math.random() < 0.55) {
      spawn3DLootItem(x + 12, y + 6, 'alien_core', 1);
    } else if (dist.id === 'cordon' && Math.random() < 0.50) {
      spawn3DLootItem(x + 12, y + 6, 'mil_parts', 1);
    } else if (Math.random() < 0.42) {
      spawn3DLootItem(x + 12, y + 6, Math.random() < 0.5 ? 'bandage' : 'ammo_9x18', 6);
    } else if (dist.id === 'garages') {
      spawn3DLootItem(x + 12, y + 6, 'scrap', Math.round(2 * mult));
    }
  } else {
    const r = Math.random();
    const scrapBias = dist.id === 'garages' ? 0.78 : (dist.id === 'courtyards' ? 0.30 : 0.58);
    if (r < scrapBias) {
      const val = Math.max(1, Math.round((1 + Math.floor(Math.random() * 2)) * (dist.id === 'courtyards' ? 0.8 : mult)));
      spawn3DLootItem(x, y, 'scrap', val);
    } else {
      const val = Math.max(1, Math.round((1 + Math.floor(Math.random() * 2)) * mult));
      spawn3DLootItem(x, y, 'bottle', val);
    }
    if (dist.id === 'cordon' && Math.random() < 0.28) {
      spawn3DLootItem(x + 14, y - 8, 'mil_parts', 1);
    } else if (dist.id === 'nest' && Math.random() < 0.30) {
      spawn3DLootItem(x + 14, y - 8, 'alien_core', 1);
    }
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
  createParticles(dead.x, dead.y, dead.type === 'brute' ? '#a855f7' : '#16a34a', 22);
  spawnLootDrop(dead);
  enemies.splice(index, 1);
  setTimeout(() => spawnPatrolEnemy(dead), 12000);
}

// --- БОСС «ЗОЛОТОЙ МЯСНИК» (логово в СВ Квако-гнезде, появляется один раз за забег) ---
const BOSS_HOME = { x: 3680, y: 330 };
const BOSS_LEASH_RADIUS = 720;
const BOSS_MAX_HP = 4200;
// Тайминги — в кадрах симуляции (60 в секунду); arc — половина угла сектора в радианах
const BOSS_ATTACKS = {
  slash: { windup: 34, active: 8, recover: 30, range: 165, arc: 1.2, damage: 30 },
  chop: { windup: 52, active: 6, recover: 50, range: 235, width: 56, damage: 55 },
  spin: { windup: 38, active: 30, recover: 44, range: 150, damage: 22 },
  lunge: { windup: 40, active: 14, recover: 36, range: 300, damage: 34 }
};
// За столько кадров до удара босс перестаёт доворачиваться — окно, чтобы уйти перекатом
const BOSS_AIM_LOCK_FRAMES = 14;
let bossRef = null;

function spawnBoss() {
  bossRef = {
    type: 'boss',
    x: BOSS_HOME.x,
    y: BOSS_HOME.y,
    radius: 40,
    hp: BOSS_MAX_HP,
    maxHp: BOSS_MAX_HP,
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
    introShown: false
  };
  enemies.push(bossRef);
}

function bossHitPlayer(e, damage) {
  if (player.isRolling) return; // перекат даёт неуязвимость
  player.hp -= damage;
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
  const tempo = e.enraged ? 0.8 : 1.0;
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
}

function onBossStrike(e, a, def) {
  SoundFX.bossSwing(a.key === 'chop');
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

function updateBossStrike(e, a, def) {
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
  } else if (a.key === 'lunge') {
    const step = def.range / def.active;
    const nx = e.x + Math.cos(a.aim) * step;
    const ny = e.y + Math.sin(a.aim) * step;
    if (!checkWalkCollision(nx, e.y, e.radius, footDY(e))) e.x = nx;
    if (!checkWalkCollision(e.x, ny, e.radius, footDY(e))) e.y = ny;
    if (a.t % 2 === 0) createParticles(e.x, e.y + 14, '#78716c', 2);
    if (!a.hit && dist < e.radius + player.radius + 34) {
      a.hit = true;
      bossHitPlayer(e, def.damage);
    }
    if (a.t === def.active - 3) {
      muzzleFlashes.push({ x: e.x, y: e.y - 18, angle: a.aim, type: 'boss_slash', life: 10, maxLife: 10, scale: 2.4 });
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
    e.attack = null;
    e.attackCooldown = e.enraged ? 12 : 24;
  }
}

function chooseBossAttack(e, dist) {
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
  if (e.attackCooldown > 0) e.attackCooldown--;
  if (e.lungeCooldown > 0) e.lungeCooldown--;

  if (!e.enraged && e.hp < e.maxHp * 0.5) {
    e.enraged = true;
    addFloatingText(e.x - 30, e.y - 96, `🔥 ${t('boss_enraged')}`, '#f97316');
    spawnDirectionalSparks(e.x, e.y - 30, -Math.PI / 2, Math.PI * 2, 24, '#f97316', 4, 11, 18);
    SoundFX.bossSwing(true);
  }

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

  let speed = e.speed * (e.enraged ? 1.25 : 1.0);
  if (hasFumeAura && dist < 140) speed *= 0.55;

  if (!e.isAggroed) {
    // Игрок ушёл из логова: возвращаемся домой и зализываем раны
    const hx = BOSS_HOME.x - e.x;
    const hy = BOSS_HOME.y - e.y;
    const homeDist = Math.hypot(hx, hy);
    e.isMoving = homeDist > 6;
    if (e.isMoving) {
      e.angle = Math.atan2(hy, hx);
      e.x += (hx / homeDist) * Math.min(speed, homeDist);
      e.y += (hy / homeDist) * Math.min(speed, homeDist);
    }
    if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.0015);
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

function onBossDefeated(e) {
  bossRef = null;
  if (window.Menu) window.Menu.requestSave();
  createParticles(e.x, e.y, '#facc15', 40);
  spawnDirectionalSparks(e.x, e.y - 30, -Math.PI / 2, Math.PI * 2, 30, '#fde047', 5, 14, 22);
  cameraKickX += (Math.random() - 0.5) * 20;
  cameraKickY += (Math.random() - 0.5) * 20;
  SoundFX.bossSwing(true);
  addFloatingText(e.x - 110, e.y - 80, t('boss_defeated'), '#facc15');

  // Разовая крупная награда, раскиданная вокруг тела
  const reward = [
    ['alien_core', 3], ['alien_core', 3], ['mil_parts', 4], ['mil_parts', 4],
    ['scrap', 20], ['scrap', 20], ['bottle', 12], ['bottle', 12],
    ['ammo_12g', 12], ['ammo_9x18', 24], ['vodka', 2], ['bandage', 3]
  ];
  reward.forEach(([type, val], i) => {
    const a = (i / reward.length) * Math.PI * 2;
    spawn3DLootItem(e.x + Math.cos(a) * 56, e.y + Math.sin(a) * 40, type, val);
  });
}

function drawBossLair(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY) {
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
    } else if (a.key === 'spin') {
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
  if (window.threeBoss && window.threeBoss.draw(ctx, e)) return;
  drawBossPlaceholder(ctx, e);
}

let _lastPromptKey = '';

function update() {
  if (gameState !== 'PLAYING') return;

  mouseWorld.x = mouseScreen.x + camera.x;
  mouseWorld.y = mouseScreen.y + camera.y;

  if (player.hasPerk('shaman_carpet') && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + 0.018);
  }

  // Восстановление выносливости (медленнее, чтобы в бою на битах нужно было следить за дыханием и пить тушёнку!)
  if (!player.isRolling && player.stamina < player.maxStamina) {
    const regenRate = player.hasPerk('slime_skin') ? 0.34 : 0.25;
    player.stamina = Math.min(player.maxStamina, player.stamina + regenRate);
  }

  // Прогресс перезарядки огнестрельного оружия (ПМ и Обрез)
  if (player.reloadingWeapon) {
    player.reloadTimer--;
    if (player.reloadTimer <= 0) {
      const rw = player.reloadingWeapon;
      const aState = player.ammo[rw];
      const needed = aState.maxClip - aState.clip;
      const loadCount = Math.min(needed, aState.reserve);
      aState.clip += loadCount;
      aState.reserve -= loadCount;
      player.reloadingWeapon = null;
      player.reloadTimer = 0;
      SoundFX.reload();
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

  if (player.isDrunk) {
    player.drunkTimer--;
    if (player.drunkTimer <= 0) player.isDrunk = false;
  }

  let currentSpeed = player.speed;
  if (player.hasPerk('slime_skin')) currentSpeed *= 1.22;

  if (player.rollCooldown > 0) player.rollCooldown--;
  // Страховка: если Василия всё же вытолкнуло внутрь препятствия, даём из него выйти, а не запираем
  const playerStuck = checkWalkCollision(player.x, player.y, player.radius, footDY(player));
  if (player.isRolling) {
    if (playerStuck) {
      player.x += player.rollDx * 9;
      player.y += player.rollDy * 9;
    } else {
      slideMove(player, player.rollDx * 9, player.rollDy * 9, player.radius);
    }

    player.rollDuration--;
    createParticles(player.x, player.y, '#64748b', 1);
    if (player.rollDuration <= 0) player.isRolling = false;
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

  cameraKickX *= 0.72;
  cameraKickY *= 0.72;
  if (Math.abs(cameraKickX) < 0.05) cameraKickX = 0;
  if (Math.abs(cameraKickY) < 0.05) cameraKickY = 0;

  camera.x = player.x - canvas.width / 2 + cameraKickX;
  camera.y = player.y - canvas.height / 2 + cameraKickY;
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

  const inSafe = Math.hypot(player.x - safeZone.x, player.y - safeZone.y) < safeZone.radius;
  if (shootCooldown > 0) shootCooldown--;
  if (mouseDown && !player.isRolling && !inSafe) {
    shootPlayerWeapon();
  }

  nearbyInteractable = null;
  const distToShop = Math.hypot(player.x - safeZone.shopX, player.y - safeZone.shopY);
  if (distToShop < safeZone.shopRadius + player.radius + 20) {
    nearbyInteractable = { type: 'shop' };
  } else {
    for (let i = 0; i < containers.length; i++) {
      const c = containers[i];
      if (!c.searched && Math.abs(player.x - c.x) < 80 && Math.abs(player.y - c.y) < 80) {
        if (Math.hypot(player.x - c.x, player.y - c.y) < c.radius + player.radius + 20) {
          nearbyInteractable = { type: 'container', target: c };
          break;
        }
      }
    }
  }

  const nextPromptKey = nearbyInteractable ? `${nearbyInteractable.type}_${currentLang}` : '';
  if (_lastPromptKey !== nextPromptKey) {
    _lastPromptKey = nextPromptKey;
    const promptEl = document.getElementById('interact-prompt');
    if (nearbyInteractable) {
      promptEl.style.display = 'block';
      promptEl.innerText = nearbyInteractable.type === 'shop' ? t('prompt_shop') : t('prompt_search');
    } else {
      promptEl.style.display = 'none';
    }
  }

  const pullRadius = player.hasPerk('tentacle_arm') ? 185 : 58;
  const pullSpeed = player.hasPerk('tentacle_arm') ? 5.5 : 3.2;
  for (let i = 0; i < lootItems.length; i++) {
    const item = lootItems[i];
    if (Math.abs(player.x - item.x) < pullRadius && Math.abs(player.y - item.y) < pullRadius) {
      const dist = Math.hypot(player.x - item.x, player.y - item.y);
      if (dist < pullRadius) {
        const pullAngle = Math.atan2(player.y - item.y, player.x - item.x);
        item.x += Math.cos(pullAngle) * pullSpeed;
        item.y += Math.sin(pullAngle) * pullSpeed;
      }
    }
  }

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

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.abs(b.x - e.x) > b.radius + e.radius + 10 || Math.abs(b.y - e.y) > b.radius + e.radius + 10) continue;
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.radius + e.radius) {
        e.hp -= b.damage;
        e.isAggroed = true;
        e.hitFlash = 5;

        const hitAngle = b.angle !== undefined ? b.angle : Math.atan2(b.vy, b.vx);
        const bloodColor = e.type === 'brute' ? '#a855f7' : (e.type === 'boss' ? '#facc15' : '#22c55e');
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

        addFloatingText(e.x + (Math.random() - 0.5) * 14, e.y - 16, `${b.isCrit ? 'CRIT! ' : ''}-${Math.round(b.damage)}`, b.isCrit ? '#ef4444' : '#f87171');
        
        if (player.hasPerk('car_battery')) {
          enemies.forEach(otherE => {
            if (otherE !== e && Math.hypot(e.x - otherE.x, e.y - otherE.y) < 140) {
              otherE.hp -= 22;
              otherE.isAggroed = true;
              otherE.hitFlash = 5;
              addFloatingText(otherE.x, otherE.y - 15, '-22 ⚡', '#38bdf8');
            }
          });
        }

        bullets.splice(i, 1);
        break;
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      handleEnemyKilled(i);
    }
  }

  const hasFumeAura = player.hasPerk('fume_aura');
  const activeSimRadius = Math.max(canvas.width, canvas.height) * 0.72 + 220;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.type === 'boss') {
      updateBoss(e, inSafe, hasFumeAura);
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
      }
    } else if (distToPlayer > e.aggroRadius * 1.5) {
      e.isAggroed = false;
    }

    let eSpeed = e.speed;
    if (hasFumeAura && distToPlayer < 140) {
      eSpeed *= 0.55;
    }

    if (!e.animTimer) e.animTimer = 0;
    e.animTimer += 0.15;
    if (e.hitFlash > 0) e.hitFlash--;

    if (e.isAggroed) {
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      e.angle = angle;
      if (e.type === 'grunt' || e.type === 'brute') {
        slideMove(e, Math.cos(angle) * eSpeed, Math.sin(angle) * eSpeed, e.radius, true);

        if (distToPlayer < player.radius + e.radius && !player.isRolling) {
          // Усиленный контактный урон по тирам зоны!
          const tierMult = 1 + (e.tier || 1) * 0.22;
          const dmg = (e.type === 'brute' ? 1.65 : 0.78) * tierMult;
          player.hp -= dmg;
          createParticles(player.x, player.y, '#ef4444', 3);
          if (player.hp <= 0) gameOver();
        }
      } else if (e.type === 'sniper') {
        // Держит дистанцию 200–320 px: подходит или отступает, но, как и все, не сквозь стены
        const step = distToPlayer > 320 ? eSpeed : (distToPlayer < 200 ? -eSpeed : 0);
        if (step !== 0) slideMove(e, Math.cos(angle) * step, Math.sin(angle) * step, e.radius, true);
        if (distToPlayer > 320) {
          e.angle = angle;
        } else if (distToPlayer < 200) {
          if (e.shootCooldown > 25) {
            e.angle = angle + Math.PI;
          } else {
            e.angle = angle;
          }
        } else {
          e.angle = angle;
        }

        e.shootCooldown--;
        if (e.shootCooldown <= 0) {
          e.shootCooldown = e.tier >= 3 ? 92 : 105;
          const muzX = e.x + Math.cos(angle) * 26;
          const muzY = e.y + Math.sin(angle) * 26 - 8;
          const ebSpeed = e.tier >= 3 ? 10.8 : 9.6;
          const shotDmg = e.tier >= 4 ? 38 : (e.tier === 3 ? 30 : 22);
          enemyBullets.push({
            x: muzX,
            y: muzY,
            vx: Math.cos(angle) * ebSpeed,
            vy: Math.sin(angle) * ebSpeed,
            angle: angle,
            radius: 5,
            damage: shotDmg
          });
          muzzleFlashes.push({
            x: muzX,
            y: muzY,
            angle: angle,
            type: 'sniper',
            life: 4,
            maxLife: 4,
            scale: 0.9
          });
          spawnDirectionalSparks(muzX, muzY, angle, 0.45, 6, '#a3e635', 4, 9, 10);
        }
      }
    } else {
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

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    eb.x += eb.vx; eb.y += eb.vy;
    if (checkBuildingCollision(eb.x, eb.y, eb.radius)) {
      spawnDirectionalSparks(eb.x, eb.y, (eb.angle || 0) + Math.PI, 1.0, 5, '#84cc16', 3, 7, 9);
      enemyBullets.splice(i, 1);
      continue;
    }
    if (Math.hypot(eb.x - player.x, eb.y - player.y) < eb.radius + player.radius) {
      if (!player.isRolling) {
        player.hp -= eb.damage;
        createParticles(player.x, player.y, '#10b981', 8);
        addFloatingText(player.x, player.y - 20, `-${eb.damage}`, '#ef4444');
        if (player.hp <= 0) gameOver();
      }
      enemyBullets.splice(i, 1);
    }
  }

  // Подбор всех типов 3D-лута (scrap, bottle, mil_parts, alien_core, ammo_9x18, ammo_12g, stew, vodka, bandage)
  const pickupRadius = player.radius + 22;
  for (let i = lootItems.length - 1; i >= 0; i--) {
    const item = lootItems[i];
    if (Math.abs(item.x - player.x) < pickupRadius && Math.abs(item.y - player.y) < pickupRadius) {
      if (Math.hypot(item.x - player.x, item.y - player.y) < pickupRadius) {
        if (item.type === 'scrap') {
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
        } else if (item.type === 'stew') {
          player.items.stew += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} ТУШЁНКА`, '#fbbf24');
        } else if (item.type === 'vodka') {
          player.items.vodka += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} ВОДКА`, '#f59e0b');
        } else if (item.type === 'bandage') {
          player.items.bandage += item.val;
          addFloatingText(item.x, item.y - 20, `+${item.val} БИНТЫ`, '#4ade80');
        }
        lootItems.splice(i, 1);
      }
    }
  }

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

  updateHUD();
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

function render() {
  ctx.save();
  ctx.fillStyle = '#0f131a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  if (player.isDrunk) {
    const wobbleX = Math.sin(Date.now() * 0.007) * 7;
    const wobbleY = Math.cos(Date.now() * 0.008) * 5;
    ctx.translate(wobbleX, wobbleY);
  }

  const viewMinX = camera.x - 120;
  const viewMaxX = camera.x + canvas.width + 120;
  const viewMinY = camera.y - 120;
  const viewMaxY = camera.y + canvas.height + 120;

  // Ступни и высоты фигур на экране: по ним предметы, за которыми кто-то стоит, рисуются поверх (9.2)
  const actors = [{ x: player.x, y: player.y + footDY(player), h: 88 }];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.x < viewMinX || e.x > viewMaxX || e.y < viewMinY || e.y > viewMaxY) continue;
    actors.push({ x: e.x, y: e.y + footDY(e), h: e.type === 'boss' ? 160 : (e.type === 'brute' ? 110 : 62) });
  }

  if (window.environmentRenderer) {
    window.environmentRenderer.planDeferredContainers(actors, containers, camera, canvas.width, canvas.height);
    window.environmentRenderer.draw(ctx, camera, canvas.width, canvas.height, WORLD_WIDTH, WORLD_HEIGHT, roads, buildings, containers, safeZone);
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
  if (bossRef) drawBossTelegraph(ctx, bossRef);

  // 7. Враги через ThreeEnemyManager (3D WebGL) + Лазерный прицел снайперов перед выстрелом
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.x < viewMinX || e.x > viewMaxX || e.y < viewMinY || e.y > viewMaxY) continue;

    if (e.type === 'boss') {
      drawBoss(ctx, e);
      continue;
    }

    // Лазерный луч прицеливания Жабы-Снайпера за 32 кадра до выстрела
    if (e.type === 'sniper' && e.isAggroed && e.shootCooldown > 0 && e.shootCooldown < 32) {
      const aimA = e.angle || 0;
      const sx = e.x + Math.cos(aimA) * 24;
      const sy = e.y + Math.sin(aimA) * 24 - 8;
      ctx.save();
      ctx.strokeStyle = e.shootCooldown < 12 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = e.shootCooldown < 12 ? 1.8 : 1.0;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(player.x, player.y - 12);
      ctx.stroke();
      ctx.restore();
    }

    if (window.threeEnemies && window.threeEnemies.draw(ctx, e)) {
      continue;
    }
    if (e.type === 'grunt') {
      SpriteRenderer.drawToadGrunt(ctx, e);
    } else if (e.type === 'brute') {
      if (SpriteRenderer.drawToadBrute) SpriteRenderer.drawToadBrute(ctx, e);
      else SpriteRenderer.drawToadGrunt(ctx, e);
    } else {
      SpriteRenderer.drawToadSniper(ctx, e);
    }
  }

  // 8. Выстрелы и баллистические трассеры — только в пределах экрана
  // 8A. Инопланетные кислотно-плазменные иглы снайперов
  for (let i = 0; i < enemyBullets.length; i++) {
    const eb = enemyBullets[i];
    if (eb.x < viewMinX || eb.x > viewMaxX || eb.y < viewMinY || eb.y > viewMaxY) continue;
    const a = eb.angle !== undefined ? eb.angle : Math.atan2(eb.vy, eb.vx);
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

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

  // 9. Василий с экипировкой + Лазерный целеуказатель (если взят перк laser_eye)
  if (player.hasPerk && player.hasPerk('laser_eye') && !player.isRolling) {
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

  // 9.2. Машины, деревья, фонари и прочее, за чем стоит Василий или враг, — поверх фигур
  if (window.environmentRenderer) {
    window.environmentRenderer.drawOccludingProps(ctx, actors, camera, canvas.width, canvas.height);
    // 9.3. Плафоны фонарей, ореолы и конусы света — поверх персонажей
    window.environmentRenderer.drawLampGlows(ctx, camera, canvas.width, canvas.height);
  }

  // 9.5. Направленные дульные вспышки поверх среза ствола
  drawMuzzleFlashes(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);

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

  ctx.restore();
  ctx.restore();
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
    `Враги ${enemies.length}  Частицы ${particles.length}  Пули ${bullets.length + enemyBullets.length}`
  ];
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 14, 0.78)';
  ctx.fillRect(10, canvas.height - 95, 420, 85);
  ctx.font = '12px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = perfStats.frameMs > 18 ? '#f87171' : '#4ade80';
  lines.forEach((line, i) => ctx.fillText(line, 18, canvas.height - 87 + i * 19));
  ctx.restore();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    e.preventDefault();
    perfStats.visible = !perfStats.visible;
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
  const frozen = gameState !== 'PLAYING';
  if (steps > 0 && !(frozen && frozenFrameState === gameState)) {
    const t1 = performance.now();
    render();
    drawPerfOverlay();
    frozenFrameState = frozen ? gameState : null;
    const t2 = performance.now();

    if (lastRenderTime > 0) {
      perfStats.frameMs += (Math.min(now - lastRenderTime, 250) - perfStats.frameMs) * 0.05;
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
