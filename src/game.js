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
        desc_ru: "+15 урона, сплеш-удар дрелью при перекате",
        desc_en: "+15 melee dmg, shockwave during roll",
        cost: { scrap: 15, bottles: 5 },
        statMods: { damage: 15 },
        locks: ["tentacle_arm"]
      },
      car_battery: {
        id: "car_battery",
        name_ru: "Аккумулятор от КАМАЗа",
        name_en: "Truck Battery Pack",
        desc_ru: "Электро-разряды рикошетят в 2 соседние жабы",
        desc_en: "Chain lightning arcs to 2 nearby toads",
        cost: { scrap: 25, bottles: 10 },
        statMods: {},
        locks: ["shaman_carpet"]
      },
      laser_eye: {
        id: "laser_eye",
        name_ru: "Лазерный прицел-глаз",
        name_en: "Cybernetic Bionic Eye",
        desc_ru: "Красный луч, +25% шанс крита (x2.5)",
        desc_en: "Red laser sight, +25% crit chance (x2.5)",
        cost: { scrap: 35, bottles: 15 },
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
        desc_ru: "Авто-притягивание лута и чермета на 180px",
        desc_en: "Auto-pull loot & scrap from 180px radius",
        cost: { scrap: 10, bottles: 12 },
        statMods: {},
        locks: ["drill_arm"]
      },
      slime_skin: {
        id: "slime_skin",
        name_ru: "Токсичная Слизь",
        name_en: "Toxic Mucus Skin",
        desc_ru: "+20% к скорости перемещения",
        desc_en: "+20% move speed bonus",
        cost: { scrap: 20, bottles: 15 },
        statMods: {},
        locks: []
      },
      third_frog_eye: {
        id: "third_frog_eye",
        name_ru: "Жабий Глаз-Пузырь",
        name_en: "Amphibian Bulging Eye",
        desc_ru: "Круговой сектор внимания 360°",
        desc_en: "360° visual awareness",
        cost: { scrap: 25, bottles: 18 },
        statMods: {},
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
        cost: { scrap: 15, bottles: 15 },
        statMods: {},
        locks: []
      },
      shaman_carpet: {
        id: "shaman_carpet",
        name_ru: "Плащ из Советского Ковра",
        name_en: "Soviet Rug Cloak",
        desc_ru: "+50 макс. HP, регенерация 1 HP в секунду",
        desc_en: "+50 max HP, passive 1 HP/sec regen",
        cost: { scrap: 20, bottles: 20 },
        statMods: { bonusMaxHp: 50 },
        locks: ["car_battery"]
      },
      pigeon_familiar: {
        id: "pigeon_familiar",
        name_ru: "Призрачный Голубь Гена",
        name_en: "Ghost Pigeon Gena",
        desc_ru: "Призывает летающего призрачного голубя",
        desc_en: "Summons spectral companion pigeon",
        cost: { scrap: 35, bottles: 25 },
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
    this.loadAssets();
  }

  loadAssets() {
    let toLoad = 16 + 2 + 3 + 2;
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

    // 3. Модульное оружие (Откалиброванные пиксельные спрайты 80x48)
    const weaponDefs = [
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
    controls_aim: "Мышь — Прицел и Огонь",
    controls_roll: "ПРОБЕЛ — Перекат",
    controls_interact: "E — Обыск / Магазин",
    controls_items: "1, 2, 3 — Расходники",
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
    shop_sub: "Сдавай вторсырье, закупай припасы и улучшай Василия!",
    tab_supplies: "🥫 Припасы",
    tab_upgrades: "🧬 Ветки прокачки",
    shop_bandage: "Бинты (+45 HP)",
    shop_stew: "Тушенка (+60 Вынослив.)",
    shop_vodka: "Водка (+Урон берсерка)",
    shop_close: "ВЕРНУТЬСЯ В ГОРОД [ESC]",
    installed: "УСТАНОВЛЕНО",
    locked_by: "БЛОКИРУЕТСЯ:",
    cost_scrap: "чермета",
    cost_bottles: "бут."
  },
  en: {
    game_title: "Vasiliy vs Aliens",
    subtitle: "Novokhmurinsk Toadpocalypse",
    start_game: "VENTURE INTO CITY",
    restart: "START OVER",
    controls_title: "CONTROLS:",
    controls_move: "WASD — Move around town",
    controls_aim: "Mouse — Aim & Shoot",
    controls_roll: "SPACE — Dodge Roll",
    controls_interact: "E — Scavenge / Shop",
    controls_items: "1, 2, 3 — Consumables",
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
    shop_sub: "Trade salvage, buy rations and augment Vasiliy!",
    tab_supplies: "🥫 Supplies",
    tab_upgrades: "🧬 Skill Trees",
    shop_bandage: "Bandages (+45 HP)",
    shop_stew: "Stew (+60 Stamina)",
    shop_vodka: "Vodka (+Berserk DMG)",
    shop_close: "RETURN TO CITY [ESC]",
    installed: "INSTALLED",
    locked_by: "LOCKED BY:",
    cost_scrap: "scrap",
    cost_bottles: "bot."
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
  document.getElementById('tab-btn-supplies').innerText = t('tab_supplies');
  document.getElementById('tab-btn-upgrades').innerText = t('tab_upgrades');
  document.getElementById('shop-txt-bandage').innerText = t('shop_bandage');
  document.getElementById('shop-txt-stew').innerText = t('shop_stew');
  document.getElementById('shop-txt-vodka').innerText = t('shop_vodka');
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
    renderUpgradeTrees();
  }
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
  baseDamage: 25,
  critChance: 0.05,
  critMult: 1.5,
  isDrunk: false,
  drunkTimer: 0,
  items: {
    vodka: 0,
    stew: 1,
    bandage: 1
  },
  resources: {
    scrap: 0,
    bottles: 0
  },
  currentWeapon: 'shotgun',
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
let floatingTexts = [];
let lootItems = [];

function generateWorld() {
  buildings = [];
  roads = [];
  containers = [];
  enemies = [];
  bullets = [];
  enemyBullets = [];
  particles = [];
  floatingTexts = [];
  lootItems = [];

  roads.push({ x: 0, y: 1900, w: WORLD_WIDTH, h: 200 });
  roads.push({ x: 1900, y: 0, w: 200, h: WORLD_HEIGHT });
  roads.push({ x: 0, y: 800, w: WORLD_WIDTH, h: 140 });
  roads.push({ x: 0, y: 3100, w: WORLD_WIDTH, h: 140 });
  roads.push({ x: 800, y: 0, w: 140, h: WORLD_HEIGHT });
  roads.push({ x: 3100, y: 0, w: 140, h: WORLD_HEIGHT });

  const blockTypes = [
    { w: 320, h: 160, type: 'panel' },
    { w: 220, h: 260, type: 'panel' },
    { w: 140, h: 100, type: 'garage' }
  ];

  for (let bx = 300; bx < WORLD_WIDTH - 400; bx += 480) {
    for (let by = 300; by < WORLD_HEIGHT - 400; by += 450) {
      if (Math.hypot(bx - safeZone.x, by - safeZone.y) < 450) continue;
      const block = blockTypes[Math.floor(Math.random() * blockTypes.length)];
      buildings.push({
        x: bx + (Math.random() - 0.5) * 80,
        y: by + (Math.random() - 0.5) * 80,
        w: block.w,
        h: block.h,
        type: block.type
      });
    }
  }

  let containerAttempts = 0;
  while (containers.length < 85 && containerAttempts < 400) {
    containerAttempts++;
    const cx = Math.random() * (WORLD_WIDTH - 400) + 200;
    const cy = Math.random() * (WORLD_HEIGHT - 400) + 200;
    if (Math.hypot(cx - safeZone.x, cy - safeZone.y) < 340) continue;

    // Проверяем, чтобы контейнер не спавнился внутри здания
    const insideBuilding = buildings.some(b => 
      cx >= b.x - 30 && cx <= b.x + b.w + 30 &&
      cy >= b.y - 30 && cy <= b.y + b.h + 30
    );
    if (insideBuilding) continue;

    const types = ['trash', 'car', 'box'];
    containers.push({
      x: cx,
      y: cy,
      radius: 22,
      type: types[Math.floor(Math.random() * types.length)],
      searched: false
    });
  }

  for (let i = 0; i < 75; i++) {
    spawnPatrolEnemy();
  }
}

function spawnPatrolEnemy() {
  let ex = Math.random() * (WORLD_WIDTH - 400) + 200;
  let ey = Math.random() * (WORLD_HEIGHT - 400) + 200;
  if (Math.hypot(ex - safeZone.x, ey - safeZone.y) < 480) return;

  const rand = Math.random();
  let type = 'grunt';
  let radius = 22;
  let hp = 85;
  let speed = 2.6;
  let aggroRadius = 300;
  let color = '#22c55e';

  if (rand < 0.15) {
    type = 'brute';
    radius = 34;
    hp = 260;
    speed = 1.7;
    aggroRadius = 320;
    color = '#a855f7';
  } else if (rand < 0.45) {
    type = 'sniper';
    radius = 16;
    hp = 45;
    speed = 2.0;
    aggroRadius = 380;
    color = '#84cc16';
  }

  enemies.push({
    x: ex,
    y: ey,
    startX: ex,
    startY: ey,
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
    shootCooldown: Math.random() * 80 + 60
  });
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
  if (e.code === 'KeyE') handleInteract();
  if (e.code === 'Escape' && gameState === 'SHOP') closeShop();

  if (gameState === 'PLAYING') {
    if (e.code === 'Space') performRoll();
    if (e.code === 'KeyQ') cycleWeapon();
    if (e.code === 'Digit1') useItem('vodka');
    if (e.code === 'Digit2') useItem('stew');
    if (e.code === 'Digit3') useItem('bandage');
    if (e.code === 'Digit4') switchWeapon('shotgun');
    if (e.code === 'Digit5') switchWeapon('drill');
    if (e.code === 'Digit6') switchWeapon('plasma');
    if (e.code === 'Digit7') togglePerkDebug('shaman_carpet');
    if (e.code === 'Digit8') togglePerkDebug('car_battery');
    if (e.code === 'Digit9') togglePerkDebug('laser_eye');
  }
});

window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousemove', (e) => {
  mouseScreen.x = e.clientX;
  mouseScreen.y = e.clientY;
});
window.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });

document.getElementById('btn-start').addEventListener('click', startGame);

function startGame() {
  gameState = 'PLAYING';
  document.getElementById('screen-menu').style.display = 'none';

  player.x = safeZone.x;
  player.y = safeZone.y + 70;
  player.hp = player.maxHp;
  player.stamina = player.maxStamina;
  player.isDrunk = false;
  player.drunkTimer = 0;
  player.items = { vodka: 0, stew: 1, bandage: 1 };
  player.resources = { scrap: 0, bottles: 0 };
  player.baseDamage = 25;
  player.unlockedPerks.clear();
  player.blockedPerks.clear();

  generateWorld();
  updateHUD();
}

function gameOver() {
  gameState = 'GAMEOVER';
  document.getElementById('screen-menu').style.display = 'flex';
  updateUILanguage();
}

// --- ВЗАИМОДЕЙСТВИЕ И МАГАЗИН/ВЕРСТАК ---
function handleInteract() {
  if (!nearbyInteractable) return;
  if (nearbyInteractable.type === 'shop') openShop();
  else if (nearbyInteractable.type === 'container') scavengeContainer(nearbyInteractable.target);
}

function scavengeContainer(c) {
  if (c.searched) return;
  c.searched = true;

  const bottleRoll = Math.floor(Math.random() * 3) + 1;
  const scrapRoll = Math.floor(Math.random() * 4) + 1;
  player.resources.bottles += bottleRoll;
  player.resources.scrap += scrapRoll;

  addFloatingText(c.x, c.y - 25, `+${bottleRoll} 🍾 +${scrapRoll} ⚙️`, '#38bdf8');

  const foodRoll = Math.random();
  if (foodRoll < 0.35) {
    player.items.stew += 1;
    addFloatingText(c.x, c.y - 45, "+1 🥫", '#fbbf24');
  } else if (foodRoll < 0.60) {
    player.items.bandage += 1;
    addFloatingText(c.x, c.y - 45, "+1 🩹", '#4ade80');
  } else if (foodRoll < 0.75) {
    player.items.vodka += 1;
    addFloatingText(c.x, c.y - 45, "+1 🍾", '#f59e0b');
  }

  createParticles(c.x, c.y, '#94a3b8', 12);
  updateHUD();
}

function openShop() {
  gameState = 'SHOP';
  document.getElementById('shop-modal').style.display = 'flex';
  updateShopButtons();
  renderUpgradeTrees();
}

window.closeShop = function() {
  document.getElementById('shop-modal').style.display = 'none';
  gameState = 'PLAYING';
};

window.switchShopTab = function(tab) {
  const suppliesView = document.getElementById('shop-view-supplies');
  const upgradesView = document.getElementById('shop-view-upgrades');
  const btnSupplies = document.getElementById('tab-btn-supplies');
  const btnUpgrades = document.getElementById('tab-btn-upgrades');

  if (tab === 'supplies') {
    suppliesView.style.display = 'block';
    upgradesView.style.display = 'none';
    btnSupplies.classList.add('active');
    btnUpgrades.classList.remove('active');
  } else {
    suppliesView.style.display = 'none';
    upgradesView.style.display = 'block';
    btnSupplies.classList.remove('active');
    btnUpgrades.classList.add('active');
    renderUpgradeTrees();
  }
};

function updateShopButtons() {
  document.getElementById('btn-buy-bandage').disabled = player.resources.bottles < 3;
  document.getElementById('btn-buy-stew').disabled = player.resources.bottles < 4;
  document.getElementById('btn-buy-vodka').disabled = player.resources.bottles < 5;
}

window.buyItem = function(item, costBottles) {
  if (player.resources.bottles >= costBottles) {
    player.resources.bottles -= costBottles;
    player.items[item]++;
    addFloatingText(player.x, player.y - 30, `+1 ${t(item).toUpperCase()}`, '#4ade80');
    updateHUD();
    updateShopButtons();
  }
};

function renderUpgradeTrees() {
  const container = document.getElementById('tree-container');
  container.innerHTML = '';

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
      costEl.innerText = `⚙️ ${perk.cost.scrap} ${t('cost_scrap')} | 🍾 ${perk.cost.bottles} ${t('cost_bottles')}`;

      card.appendChild(nameEl);
      card.appendChild(descEl);
      card.appendChild(costEl);

      if (isLocked) {
        const lockWarn = document.createElement('div');
        lockWarn.className = 'perk-lock-warn';
        lockWarn.innerText = `⚠️ ${t('locked_by')} несовместимый апгрейд!`;
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
        
        const canAfford = player.resources.scrap >= perk.cost.scrap && player.resources.bottles >= perk.cost.bottles;
        buyBtn.disabled = !canAfford;

        buyBtn.onclick = () => buyPerk(perk);
        card.appendChild(buyBtn);
      }

      col.appendChild(card);
    }

    container.appendChild(col);
  }
}

function buyPerk(perk) {
  if (player.resources.scrap < perk.cost.scrap || player.resources.bottles < perk.cost.bottles) return;
  if (player.blockedPerks.has(perk.id)) return;

  player.resources.scrap -= perk.cost.scrap;
  player.resources.bottles -= perk.cost.bottles;
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
  if (perk.statMods.critChance) player.critChance += perk.statMods.critChance;
  if (perk.statMods.critMult) player.critMult = perk.statMods.critMult;

  addFloatingText(player.x, player.y - 35, `🧬 ${perk.name_ru.toUpperCase()}`, '#38bdf8');
  createParticles(player.x, player.y, '#38bdf8', 20);

  updateHUD();
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
    player.stamina = Math.min(player.maxStamina, player.stamina + 60);
    addFloatingText(player.x, player.y - 30, "+60 ВЫНОСЛИВ.", '#38bdf8');
    createParticles(player.x, player.y, '#38bdf8', 10);
  } else if (itemType === 'bandage') {
    player.hp = Math.min(player.maxHp, player.hp + 45);
    addFloatingText(player.x, player.y - 30, "+45 HP", '#22c55e');
    createParticles(player.x, player.y, '#22c55e', 12);
  }
  updateHUD();
};

function performRoll() {
  if (player.isRolling || player.rollCooldown > 0 || player.stamina < 25) return;
  
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
  player.stamina -= 25;
  createParticles(player.x, player.y, '#94a3b8', 8);

  if (player.hasPerk('drill_arm')) {
    createParticles(player.x, player.y, '#eab308', 15);
    enemies.forEach(e => {
      if (Math.hypot(player.x - e.x, player.y - e.y) < 70) {
        e.hp -= 30;
        addFloatingText(e.x, e.y - 20, '-30 ДРЕЛЬ', '#eab308');
      }
    });
  }
}

window.switchWeapon = function(weaponKey) {
  if (['shotgun', 'drill', 'plasma'].includes(weaponKey)) {
    player.currentWeapon = weaponKey;
    const names = {
      shotgun: currentLang === 'ru' ? 'ОБРЕЗ ДВУСТВОЛКИ' : 'SAWED-OFF SHOTGUN',
      drill: currentLang === 'ru' ? 'РУКА-ПЕРФОРАТОР' : 'DRILL ARM',
      plasma: currentLang === 'ru' ? 'ПЛАЗМЕННЫЙ КАРАБИН' : 'PLASMA CARBINE'
    };
    addFloatingText(player.x, player.y - 35, `🔫 ${names[weaponKey]}`, '#38bdf8');
    createParticles(player.x, player.y, '#38bdf8', 8);
    updateHUD();
  }
};

window.cycleWeapon = function() {
  const weapons = ['shotgun', 'drill', 'plasma'];
  const curIdx = weapons.indexOf(player.currentWeapon);
  const nextIdx = (curIdx + 1) % weapons.length;
  window.switchWeapon(weapons[nextIdx]);
};

window.togglePerkDebug = function(perkId) {
  if (player.hasPerk(perkId)) {
    player.unlockedPerks.delete(perkId);
    addFloatingText(player.x, player.y - 35, `- СНЯТО: ${perkId}`, '#94a3b8');
  } else {
    player.unlockedPerks.add(perkId);
    addFloatingText(player.x, player.y - 35, `+ НАДЕТО: ${perkId}`, '#22c55e');
  }
  updateHUD();
};

function shootPlayerWeapon() {
  if (shootCooldown > 0) return;
  if (window.threeCharacter) window.threeCharacter.triggerRecoil();

  const wKey = player.currentWeapon || 'shotgun';

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

  if (wKey === 'drill') {
    // 1. Рука-перфоратор: ближний секторный удар шнеком
    shootCooldown = 18;
    const drillReach = 85;

    createParticles(muzzle.x, muzzle.y, '#eab308', 14);

    let hitCount = 0;
    enemies.forEach(e => {
      const dist = Math.hypot(e.x - player.x, e.y - (player.y - 20));
      if (dist < drillReach + e.radius) {
        const toEnemyAngle = Math.atan2(e.y - (player.y - 20), e.x - player.x);
        let angleDiff = Math.abs(toEnemyAngle - player.angle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff < 1.0) { // В конусе удара
          const dmg = (player.baseDamage + 25) * (player.isDrunk ? 1.8 : 1.0);
          e.hp -= dmg;
          e.isAggroed = true;
          hitCount++;
          createParticles(e.x, e.y, '#f59e0b', 8);
          addFloatingText(e.x, e.y - 20, `-${Math.round(dmg)} 💥 БУР`, '#eab308');
        }
      }
    });
    return;
  }

  if (wKey === 'plasma') {
    // 2. Кустарный плазмомёт: высокоскоростной сгусток плазмы из дульных электродов
    shootCooldown = 9;
    let dmg = (player.baseDamage * 0.9);
    let isCrit = Math.random() < player.critChance;
    if (isCrit) dmg *= player.critMult;

    const angle = player.angle + (Math.random() - 0.5) * (player.isDrunk ? 0.2 : 0.02);

    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(angle) * 16,
      vy: Math.sin(angle) * 16,
      radius: 5,
      damage: dmg,
      isCrit: isCrit,
      color: '#38bdf8'
    });

    createParticles(muzzle.x, muzzle.y, '#06b6d4', 8);
    return;
  }

  // 3. Обрез двустволки: картечный разлет из спаренных стволов
  shootCooldown = 28;
  const pellets = 4;
  const basePelletDmg = (player.baseDamage * 0.65) * (player.isDrunk ? 2.0 : 1.0);

  for (let p = 0; p < pellets; p++) {
    const spread = (Math.random() - 0.5) * (player.isDrunk ? 0.45 : 0.22);
    const pelletAngle = player.angle + spread;
    const speed = 11 + Math.random() * 3;
    let isCrit = Math.random() < player.critChance;
    let dmg = basePelletDmg * (isCrit ? player.critMult : 1.0);

    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(pelletAngle) * speed,
      vy: Math.sin(pelletAngle) * speed,
      radius: 3.5,
      damage: dmg,
      isCrit: isCrit,
      color: isCrit ? '#ef4444' : (player.isDrunk ? '#f59e0b' : '#fbbf24')
    });
  }

  createParticles(muzzle.x, muzzle.y, '#fbbf24', 12);
}

function checkBuildingCollision(x, y, radius) {
  for (let b of buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w &&
        y + radius > b.y && y - radius < b.y + b.h) {
      return true;
    }
  }
  return false;
}

function updateHUD() {
  document.getElementById('hp-bar').style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  document.getElementById('stamina-bar').style.width = `${Math.max(0, (player.stamina / player.maxStamina) * 100)}%`;
  document.getElementById('count-vodka').innerText = player.items.vodka;
  document.getElementById('count-stew').innerText = player.items.stew;
  document.getElementById('count-bandage').innerText = player.items.bandage;
  document.getElementById('res-scrap').innerText = player.resources.scrap;
  document.getElementById('res-bottles').innerText = player.resources.bottles;
  
  const statusBadge = document.getElementById('status-badge');
  statusBadge.style.display = player.isDrunk ? 'block' : 'none';

  const inSafeZone = Math.hypot(player.x - safeZone.x, player.y - safeZone.y) < safeZone.radius;
  document.getElementById('safe-zone-tag').style.display = inSafeZone ? 'block' : 'none';

  // Подсветка активного оружия в хотбаре
  ['shotgun', 'drill', 'plasma'].forEach(w => {
    const el = document.getElementById(`slot-w-${w}`);
    if (el) {
      if (player.currentWeapon === w) el.classList.add('active');
      else el.classList.remove('active');
    }
  });
}

function createParticles(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 2,
      color,
      life: 25
    });
  }
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 45, vy: -1.2 });
}

function spawnLootDrop(x, y) {
  const r = Math.random();
  if (r < 0.6) {
    lootItems.push({ x, y, type: 'scrap', icon: '⚙️', val: Math.floor(Math.random()*2)+1 });
  } else {
    lootItems.push({ x, y, type: 'bottle', icon: '🍾', val: 1 });
  }
}

function update() {
  if (gameState !== 'PLAYING') return;

  mouseWorld.x = mouseScreen.x + camera.x;
  mouseWorld.y = mouseScreen.y + camera.y;

  if (player.hasPerk('shaman_carpet') && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + 0.016);
  }

  if (!player.isRolling && player.stamina < player.maxStamina) {
    player.stamina += 0.35;
  }
  
  if (player.isDrunk) {
    player.drunkTimer--;
    if (player.drunkTimer <= 0) player.isDrunk = false;
  }

  let currentSpeed = player.speed;
  if (player.hasPerk('slime_skin')) currentSpeed *= 1.2;

  if (player.rollCooldown > 0) player.rollCooldown--;
  if (player.isRolling) {
    const nextX = player.x + player.rollDx * 9;
    const nextY = player.y + player.rollDy * 9;
    if (!checkBuildingCollision(nextX, player.y, player.radius)) player.x = nextX;
    if (!checkBuildingCollision(player.x, nextY, player.radius)) player.y = nextY;
    
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
    
    const nextX = player.x + dx * currentSpeed;
    const nextY = player.y + dy * currentSpeed;
    
    if (!checkBuildingCollision(nextX, player.y, player.radius)) player.x = nextX;
    if (!checkBuildingCollision(player.x, nextY, player.radius)) player.y = nextY;
  }

  player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));

  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
  player.angle = Math.atan2(mouseWorld.y - player.y, mouseWorld.x - player.x);

  // Direction and aiming: follows mouse cursor (Twin-Stick / Top-Down Shooter)
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
    for (let c of containers) {
      if (!c.searched && Math.hypot(player.x - c.x, player.y - c.y) < c.radius + player.radius + 20) {
        nearbyInteractable = { type: 'container', target: c };
        break;
      }
    }
  }

  const promptEl = document.getElementById('interact-prompt');
  if (nearbyInteractable) {
    promptEl.style.display = 'block';
    promptEl.innerText = nearbyInteractable.type === 'shop' ? t('prompt_shop') : t('prompt_search');
  } else {
    promptEl.style.display = 'none';
  }

  if (player.hasPerk('tentacle_arm')) {
    lootItems.forEach(item => {
      const dist = Math.hypot(player.x - item.x, player.y - item.y);
      if (dist < 180) {
        const pullAngle = Math.atan2(player.y - item.y, player.x - item.x);
        item.x += Math.cos(pullAngle) * 5;
        item.y += Math.sin(pullAngle) * 5;
      }
    });
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    
    if (checkBuildingCollision(b.x, b.y, b.radius)) {
      createParticles(b.x, b.y, '#94a3b8', 4);
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.radius + e.radius) {
        e.hp -= b.damage;
        e.isAggroed = true;
        e.hitFlash = 6;
        createParticles(b.x, b.y, '#22c55e', 5);
        addFloatingText(e.x, e.y - 15, `${b.isCrit ? 'CRIT! ' : ''}-${Math.round(b.damage)}`, b.isCrit ? '#ef4444' : '#f87171');
        
        if (player.hasPerk('car_battery')) {
          enemies.forEach(otherE => {
            if (otherE !== e && Math.hypot(e.x - otherE.x, e.y - otherE.y) < 140) {
              otherE.hp -= 20;
              otherE.isAggroed = true;
              otherE.hitFlash = 6;
              addFloatingText(otherE.x, otherE.y - 15, '-20 ⚡', '#38bdf8');
            }
          });
        }

        bullets.splice(i, 1);
        
        if (e.hp <= 0) {
          createParticles(e.x, e.y, '#16a34a', 20);
          spawnLootDrop(e.x, e.y);
          enemies.splice(j, 1);
          setTimeout(spawnPatrolEnemy, 4000);
        }
        break;
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
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
    if (player.hasPerk('fume_aura') && distToPlayer < 140) {
      eSpeed *= 0.55;
    }

    if (!e.animTimer) e.animTimer = 0;
    e.animTimer += 0.15;
    if (e.hitFlash > 0) e.hitFlash--;

    if (e.isAggroed) {
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      e.angle = angle;
      if (e.type === 'grunt' || e.type === 'brute') {
        const nx = e.x + Math.cos(angle) * eSpeed;
        const ny = e.y + Math.sin(angle) * eSpeed;
        if (!checkBuildingCollision(nx, e.y, e.radius)) e.x = nx;
        if (!checkBuildingCollision(e.x, ny, e.radius)) e.y = ny;

        if (distToPlayer < player.radius + e.radius && !player.isRolling) {
          const dmg = e.type === 'brute' ? 1.4 : 0.6;
          player.hp -= dmg;
          createParticles(player.x, player.y, '#ef4444', 3);
          if (player.hp <= 0) gameOver();
        }
      } else if (e.type === 'sniper') {
        if (distToPlayer > 320) {
          e.x += Math.cos(angle) * eSpeed;
          e.y += Math.sin(angle) * eSpeed;
          e.angle = angle;
        } else if (distToPlayer < 200) {
          e.x -= Math.cos(angle) * eSpeed;
          e.y -= Math.sin(angle) * eSpeed;
          // Face running direction while sprinting away, face player when preparing to shoot
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
          e.shootCooldown = 110;
          enemyBullets.push({
            x: e.x + Math.cos(angle) * 22,
            y: e.y + Math.sin(angle) * 22 - 6,
            vx: Math.cos(angle) * 5.5,
            vy: Math.sin(angle) * 5.5,
            radius: 5,
            damage: 20
          });
          createParticles(e.x + Math.cos(angle) * 22, e.y + Math.sin(angle) * 22 - 6, '#22c55e', 6);
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
      if (!checkBuildingCollision(pnx, pny, e.radius)) {
        e.x = pnx; e.y = pny;
      }
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    eb.x += eb.vx; eb.y += eb.vy;
    if (checkBuildingCollision(eb.x, eb.y, eb.radius)) {
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

  for (let i = lootItems.length - 1; i >= 0; i--) {
    const item = lootItems[i];
    if (Math.hypot(item.x - player.x, item.y - player.y) < player.radius + 16) {
      if (item.type === 'scrap') player.resources.scrap += item.val;
      if (item.type === 'bottle') player.resources.bottles += item.val;
      addFloatingText(item.x, item.y - 15, `+${item.val} ${item.icon}`, '#38bdf8');
      lootItems.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i]; ft.y += ft.vy; ft.life--;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }

  updateHUD();
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

  // 1-5. Высокодетализированный 2.5D мир Новохмуринска (асфальт, дворы, тротуары, разметка, здания, пропсы, магазин)
  if (window.environmentRenderer) {
    window.environmentRenderer.draw(ctx, camera, canvas.width, canvas.height, WORLD_WIDTH, WORLD_HEIGHT, roads, buildings, containers, safeZone);
  } else {
    // Fallback
    ctx.fillStyle = '#161b24';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  // 6. Выпавший лут
  lootItems.forEach(l => {
    ctx.font = '18px Arial';
    ctx.fillText(l.icon, l.x, l.y);
  });

  // 7. Враги через ThreeEnemyManager (3D WebGL) / SpriteRenderer
  enemies.forEach(e => {
    if (window.threeEnemies && window.threeEnemies.draw(ctx, e)) {
      return;
    }
    if (e.type === 'grunt') {
      SpriteRenderer.drawToadGrunt(ctx, e);
    } else if (e.type === 'brute') {
      if (SpriteRenderer.drawToadBrute) SpriteRenderer.drawToadBrute(ctx, e);
      else SpriteRenderer.drawToadGrunt(ctx, e);
    } else {
      SpriteRenderer.drawToadSniper(ctx, e);
    }
  });

  // 8. Пули
  enemyBullets.forEach(eb => {
    ctx.fillStyle = '#a3e635';
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // 9. Василий с экипировкой
  SpriteRenderer.drawVasiliy(ctx, player);

  // 10. Частицы и текст
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  floatingTexts.forEach(ft => {
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillText(ft.text, ft.x, ft.y);
  });

  ctx.restore();
  ctx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// Запуск
updateUILanguage();
updateHUD();
loop();
