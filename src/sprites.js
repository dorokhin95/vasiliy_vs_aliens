// Василий против пришельцев | Vasiliy vs Aliens
// Модульный процедурный визуализатор спрайтов и экипировки

export class SpriteRenderer {
  // --- ОТРИСОВКА ВАСИЛИЯ С ДИНАМИЧЕСКИМИ СЛОЯМИ ЭКИПИРОВКИ ---
  static drawVasiliy(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // 1. АУРА (Шаман: пары перегара / фиолетовый туман)
    if (p.hasPerk && p.hasPerk('fume_aura')) {
      const time = Date.now() * 0.004;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
      ctx.beginPath();
      ctx.arc(Math.sin(time) * 4, Math.cos(time) * 4, p.radius + 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 2. СЛОЙ СПИНЫ
    if (p.hasPerk && p.hasPerk('shaman_carpet')) {
      // Плащ из советского шерстяного ковра с узором
      ctx.fillStyle = '#991b1b'; // Бордовый ковер
      ctx.beginPath();
      ctx.moveTo(-12, -18);
      ctx.lineTo(-34, -24);
      ctx.lineTo(-38, 0);
      ctx.lineTo(-34, 24);
      ctx.lineTo(-12, 18);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#450a0a';
      ctx.stroke();

      // Геометрический орнамент ковра
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-28, -12, 14, 24);
    } else if (p.hasPerk && p.hasPerk('car_battery')) {
      // Аккумулятор от КАМАЗа со свисающими проводами и искрами
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-28, -14, 16, 28);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeRect(-28, -14, 16, 28);

      // Клеммы (+ и -)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-26, -18, 5, 4);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-26, 14, 5, 4);

      // Электрические искры
      if (Math.random() < 0.35) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-26, -18);
        ctx.lineTo(-32 + Math.random()*6, -24);
        ctx.stroke();
      }
    }

    // 3. ТЕЛО ВАСИЛИЯ
    if (p.hasPerk && p.hasPerk('slime_skin')) {
      // Мутировавшая токсичная кожа
      ctx.fillStyle = '#15803d'; // Темно-зеленая кожа со слизью
    } else {
      // Стеганая советская фуфайка
      ctx.fillStyle = p.isRolling ? '#475569' : '#334155';
    }

    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Швы фуфайки
    if (!p.hasPerk || !p.hasPerk('slime_skin')) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -p.radius + 4);
      ctx.lineTo(-10, p.radius - 4);
      ctx.moveTo(0, -p.radius + 3);
      ctx.lineTo(0, p.radius - 3);
      ctx.stroke();
    }

    // 4. ГОЛОВА И УШАНКА
    // Шапка-ушанка Василия
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-15, -p.radius - 4, 30, 9);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(-15, -p.radius - 4, 30, 9);
    
    // Красная звездочка на ушанке
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -p.radius - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. МОДИФИКАЦИИ ГОЛОВЫ / ГЛАЗ
    if (p.hasPerk && p.hasPerk('laser_eye')) {
      // Кибернетический глаз с красным лазерным диодом
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(8, -6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Лазерный луч прицеливания вперед
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(12, -6);
      ctx.lineTo(350, -6);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (p.hasPerk && p.hasPerk('third_frog_eye')) {
      // Третий выпуклый жабий глаз
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -p.radius + 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(0, -p.radius + 5, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. ОРУЖИЕ ВАСИЛИЯ (РУКА)
    if (p.hasPerk && p.hasPerk('drill_arm')) {
      // РУКА-ПЕРФОРАТОР (Киберпанк)
      ctx.fillStyle = '#eab308'; // Желтый строительный корпус
      ctx.fillRect(12, -6, 16, 12);
      ctx.strokeRect(12, -6, 16, 12);

      // Вращающееся сверло/бур
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(28, -5);
      ctx.lineTo(44, 0);
      ctx.lineTo(28, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.hasPerk && p.hasPerk('tentacle_arm')) {
      // ЖАБИЙ ХЛЫСТ-ЯЗЫК (Биомутация)
      ctx.strokeStyle = '#ec4899'; // Ярко-розовый токсичный язык
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      const wag = Math.sin(Date.now() * 0.015) * 6;
      ctx.quadraticCurveTo(24, wag, 36, 0);
      ctx.stroke();

      // Капли слизи
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(38, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // БАЗОВАЯ ШОК-ТРУБА
      ctx.fillStyle = p.isDrunk ? '#f59e0b' : '#38bdf8';
      ctx.fillRect(14, -5, 24, 9);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(14, -5, 24, 9);

      // Изолента синяя на трубе
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(17, -5, 5, 9);
    }

    ctx.restore();

    // 7. ПРИЗРАЧНЫЙ ГОЛУБЬ ГЕНА (Летает рядом с Василием)
    if (p.hasPerk && p.hasPerk('pigeon_familiar')) {
      const petAngle = Date.now() * 0.003;
      const petX = p.x + Math.cos(petAngle) * 45;
      const petY = p.y + Math.sin(petAngle) * 45;

      ctx.save();
      ctx.translate(petX, petY);
      // Крылья голубя
      ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 14, Math.sin(Date.now() * 0.02) * 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Голова
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(6, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      // Клюв
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(10, -1, 3, 2);
      ctx.restore();
    }
  }

  // --- ДЕТАЛИЗИРОВАННЫЙ СПРАЙТ ЖАБЫ-ПЕХОТИНЦА ---
  static drawToadGrunt(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // Восклицательный знак при агре
    if (e.isAggroed) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -e.radius - 14);
    }

    // Задние мускулистые лапы жабы
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(-14, 10, 8, 14, Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(14, 10, 8, 14, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Массивное туловище с бородавками
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#052e16';
    ctx.stroke();

    // Броня из дорожного знака «ВНИМАНИЕ» на груди
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-10, -6, 20, 14);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(-10, -6, 20, 14);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-2, -3, 4, 8); // восклицательный знак знака

    // Выпуклые жабьи глаза
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(7, -10, 6, 0, Math.PI * 2);
    ctx.arc(-7, -10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#052e16';
    ctx.stroke();

    // Кибер-имплант в левом глазу
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-7, -10, 3, 0, Math.PI * 2);
    ctx.fill();

    // Зрачок в правом
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(7, -10, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Плазменный кислотный бластер в лапах
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, -2, 18, 7);
    ctx.fillStyle = '#a3e635';
    ctx.fillRect(18, -3, 8, 9); // светящаяся колба кислоты

    // Полоска здоровья
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-16, -e.radius - 8, 32, 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-16, -e.radius - 8, (e.hp / e.maxHp) * 32, 5);
    }

    ctx.restore();
  }

  // --- ДЕТАЛИЗИРОВАННЫЙ СПРАЙТ ЖАБЫ-СНАЙПЕРА ---
  static drawToadSniper(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    if (e.isAggroed) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -e.radius - 12);
    }

    // Тонкое тело в болотном камуфляже
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#14532d';
    ctx.stroke();

    // Длинная снайперская винтовка из трубы
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, -3, 26, 6);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(24, -4, 4, 8); // прицел

    // Глаза
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(5, -6, 4, 0, Math.PI * 2);
    ctx.arc(-5, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Зрачки-щелочки
    ctx.fillStyle = '#000';
    ctx.fillRect(4, -8, 2, 4);
    ctx.fillRect(-6, -8, 2, 4);

    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-14, -e.radius - 7, 28, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-14, -e.radius - 7, (e.hp / e.maxHp) * 28, 4);
    }

    ctx.restore();
  }
}
