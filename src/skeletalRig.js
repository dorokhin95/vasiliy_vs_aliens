// Василий против пришельцев | Vasiliy vs Aliens
// Модульная скелетная 2D система персонажа (Spine-compatible 2D Rig Architecture)

export class SkeletalRig {
  constructor() {
    this.parts = {};
    this.loaded = false;

    // Скелетные узлы (Bones & Joints)
    this.bones = {
      root: { x: 0, y: 0, angle: 0 },
      torso: { x: 0, y: 0, angle: 0 },
      head: { x: 0, y: -28, angle: 0 },
      armLeft: { x: -16, y: -16, angle: 0 },
      armRight: { x: 16, y: -12, angle: 0 },
      weaponSlot: { x: 18, y: -10, angle: 0 },
      legLeft: { x: -10, y: 14, angle: 0 },
      legRight: { x: 10, y: 14, angle: 0 },
      backSlot: { x: 0, y: -8, angle: 0 }
    };

    // Сменные скины и слоты экипировки (Paperdoll Slots)
    this.slots = {
      head: 'head',                 // 'head', 'head_cyber_eye', 'head_frog_eye'
      torso: 'torso',               // 'torso', 'torso_mutant'
      weapon: 'weapon_shotgun',     // 'weapon_shotgun', 'weapon_cyber_drill', 'weapon_toad_tongue'
      back: null,                   // null, 'gear_soviet_carpet', 'gear_car_battery'
      legLeft: 'leg_left',
      legRight: 'leg_right',
      armLeft: 'arm_left'
    };

    this.loadImages();
  }

  loadImages() {
    const list = [
      ['head', 'assets/sprites/vasiliy_rig/head.png'],
      ['torso', 'assets/sprites/vasiliy_rig/torso.png'],
      ['leg_left', 'assets/sprites/vasiliy_rig/leg_left.png'],
      ['leg_right', 'assets/sprites/vasiliy_rig/leg_right.png'],
      ['weapon_shotgun', 'assets/sprites/vasiliy_rig/weapon_shotgun.png'],
      ['arm_left', 'assets/sprites/vasiliy_rig/arm_left.png'],
      ['weapon_cyber_drill', 'assets/sprites/vasiliy/weapon_cyber_drill.png'],
      ['weapon_toad_tongue', 'assets/sprites/vasiliy/weapon_toad_tongue.png'],
      ['gear_soviet_carpet', 'assets/sprites/vasiliy/gear_soviet_carpet.png'],
      ['gear_car_battery', 'assets/sprites/vasiliy/gear_car_battery.png'],
      ['gear_ghost_pigeon', 'assets/sprites/vasiliy/gear_ghost_pigeon.png']
    ];

    let count = 0;
    list.forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        count++;
        if (count >= list.length) this.loaded = true;
      };
      this.parts[key] = img;
    });
  }

  // Обновление физики и анимации скелета (IK & Procedural Walk Cycle)
  update(player) {
    const isMoving = player.isMoving;
    const time = player.animTimer * 0.16;

    if (isMoving) {
      // 1. Походка: естественное движение ног и покачивание торса
      const stride = Math.sin(time);
      const bob = Math.abs(Math.cos(time)) * 4;

      this.bones.torso.y = -bob;
      this.bones.torso.angle = Math.sin(time) * 0.08;

      // Ноги шагают вперед-назад
      this.bones.legLeft.angle = stride * 0.45;
      this.bones.legRight.angle = -stride * 0.45;

      this.bones.head.angle = -Math.sin(time) * 0.05;
      this.bones.armLeft.angle = -stride * 0.35;
    } else {
      // 2. Дыхание (Idle animation)
      const breath = Math.sin(Date.now() * 0.003);
      this.bones.torso.y = breath * 1.5;
      this.bones.torso.angle = 0;
      this.bones.legLeft.angle = 0;
      this.bones.legRight.angle = 0;
      this.bones.head.angle = breath * 0.03;
      this.bones.armLeft.angle = 0;
    }

    // 3. Плавное 360° прицеливание оружия за курсором мыши!
    // Оружие и правая рука вычисляют точный угол к прицелу
    let aimAngle = player.angle;
    if (player.facingLeft) {
      // Коррекция угла при зеркалировании
      aimAngle = Math.PI - player.angle;
    }
    // Сглаживание прицеливания оружия
    this.bones.weaponSlot.angle = aimAngle;
  }

  // Отрисовка скелетной куклы с учетом слотов и костей
  draw(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Зеркалирование влево / вправо
    if (player.facingLeft) {
      ctx.scale(-1, 1);
    }

    const scale = 0.65; // Базовый масштаб костей
    ctx.scale(scale, scale);

    // --- СЛОЙ 1: СПИНА (Ковер или Аккумулятор) ---
    if (player.hasPerk('shaman_carpet') && this.parts['gear_soviet_carpet']) {
      ctx.save();
      ctx.translate(-25, this.bones.torso.y - 10);
      ctx.drawImage(this.parts['gear_soviet_carpet'], -50, -20, 100, 100);
      ctx.restore();
    } else if (player.hasPerk('car_battery') && this.parts['gear_car_battery']) {
      ctx.save();
      ctx.translate(-22, this.bones.torso.y);
      ctx.drawImage(this.parts['gear_car_battery'], -40, -30, 80, 80);
      ctx.restore();
    }

    // --- СЛОЙ 2: ЛЕВАЯ НОГА (Дальняя) ---
    if (this.parts['leg_left']) {
      ctx.save();
      ctx.translate(this.bones.legLeft.x - 12, this.bones.torso.y + this.bones.legLeft.y);
      ctx.rotate(this.bones.legLeft.angle);
      ctx.drawImage(this.parts['leg_left'], -20, 0);
      ctx.restore();
    }

    // --- СЛОЙ 3: ПРАВАЯ НОГА (Ближняя) ---
    if (this.parts['leg_right']) {
      ctx.save();
      ctx.translate(this.bones.legRight.x + 8, this.bones.torso.y + this.bones.legRight.y);
      ctx.rotate(this.bones.legRight.angle);
      ctx.drawImage(this.parts['leg_right'], -22, 0);
      ctx.restore();
    }

    // --- СЛОЙ 4: ЛЕВАЯ РУКА (Задняя) ---
    if (this.parts['arm_left']) {
      ctx.save();
      ctx.translate(this.bones.armLeft.x - 10, this.bones.torso.y + this.bones.armLeft.y);
      ctx.rotate(this.bones.armLeft.angle);
      ctx.drawImage(this.parts['arm_left'], -20, -10);
      ctx.restore();
    }

    // --- СЛОЙ 5: ТОРС В ФУФАЙКЕ ---
    if (this.parts['torso']) {
      ctx.save();
      ctx.translate(this.bones.torso.x, this.bones.torso.y);
      ctx.rotate(this.bones.torso.angle);
      ctx.drawImage(this.parts['torso'], -50, -45);
      ctx.restore();
    }

    // --- СЛОЙ 6: ГОЛОВА С УШАНКОЙ И БОРОДОЙ ---
    if (this.parts['head']) {
      ctx.save();
      ctx.translate(this.bones.head.x, this.bones.torso.y + this.bones.head.y);
      ctx.rotate(this.bones.head.angle);
      ctx.drawImage(this.parts['head'], -42, -50);

      // Модификации головы (Лазерный глаз / Жабий глаз)
      if (player.hasPerk('laser_eye')) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(10, -10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Лазерный луч
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(12, -10);
        ctx.lineTo(500, -10);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // --- СЛОЙ 7: СМЕННОЕ ОРУЖИЕ В РУКЕ (Плавное вращение на 360°) ---
    ctx.save();
    ctx.translate(this.bones.weaponSlot.x + 10, this.bones.torso.y + this.bones.weaponSlot.y);
    ctx.rotate(this.bones.weaponSlot.angle);

    if (player.hasPerk('drill_arm') && this.parts['weapon_cyber_drill']) {
      ctx.drawImage(this.parts['weapon_cyber_drill'], -15, -24, 70, 48);
    } else if (player.hasPerk('tentacle_arm') && this.parts['weapon_toad_tongue']) {
      ctx.drawImage(this.parts['weapon_toad_tongue'], -15, -24, 70, 48);
    } else if (this.parts['weapon_shotgun']) {
      // Базовый дробовик: точка хвата за рукоять
      ctx.drawImage(this.parts['weapon_shotgun'], -25, -22, 110, 52);
    }
    ctx.restore();

    ctx.restore();

    // --- СЛОЙ 8: ГОЛУБЬ ГЕНА (Спутник) ---
    if (player.hasPerk('pigeon_familiar') && this.parts['gear_ghost_pigeon']) {
      const petAngle = Date.now() * 0.003;
      const petX = player.x + Math.cos(petAngle) * 52;
      const petY = player.y + Math.sin(petAngle) * 52;

      ctx.save();
      ctx.translate(petX, petY);
      ctx.drawImage(this.parts['gear_ghost_pigeon'], -22, -22, 44, 44);
      ctx.restore();
    }
  }
}
