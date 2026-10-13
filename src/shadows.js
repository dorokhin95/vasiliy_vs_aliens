/**
 * Отбрасываемые тени предметов и персонажей.
 *
 * Тень — силуэт спрайта или кадра 3D-модели, положенный на землю: свет с той же стороны, что у моделей
 * (three_props keyLight — справа спереди), но ниже — сумеречное солнце, поэтому тени длинные и ложатся
 * влево-назад. Опора — нижний непрозрачный ряд силуэта, там предмет касается земли. Всё, что выше опоры
 * на h px, уходит влево на SHEAR·h и назад (вверх по экрану) на SQUASH·h.
 *
 * Тени кадра собираются в отдельный слой и кладутся на землю одним полупрозрачным проходом:
 * где тени пересекаются, земля не темнеет вдвойне, а предметы рисуются уже поверх теней.
 */
const SHADOW = {
  SHEAR: 0.62,
  SQUASH: 0.22,
  ALPHA: 0.55,
  COLOR: '#03060d',  // чуть синее чёрного — сумерки
  RES: 320,          // разрешение силуэта по большей стороне: тень мягкая, крупнее не нужно
  BLUR: 2            // размытие края силуэта, px силуэта
};

class ShadowCaster {
  constructor() {
    this.silhouettes = new WeakMap(); // кадр → { canvas, pad, w, h, foot }
    this.layer = document.createElement('canvas');
    this.lctx = this.layer.getContext('2d');
    this.live = new Map();            // меняющиеся каждый кадр холсты (Василий, Мясник) → свой силуэт
    this.tmp = document.createElement('canvas');      // маска: остаётся в видеопамяти
    this.tmpCtx = this.tmp.getContext('2d');
    this.probe = document.createElement('canvas');    // замер опоры: читается на процессоре
    this.probeCtx = this.probe.getContext('2d', { willReadFrequently: true });
    this.open = false;
  }

  /**
   * Чёрный размытый силуэт кадра. foot — доля высоты, где предмет стоит на земле: считается
   * при первой надобности (у персонажей опору задаёт вызывающий).
   * live — кадр перерисовывается каждый кадр игры: силуэт строится заново.
   */
  silhouette(img, live) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    let s = live ? this.live.get(img) : this.silhouettes.get(img);
    if (s && !live) return s;

    const k = Math.min(1, SHADOW.RES / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
    const pad = SHADOW.BLUR * 2;
    if (!s) {
      s = { canvas: document.createElement('canvas'), pad, w, h, foot: undefined };
      s.canvas.width = w + pad * 2;
      s.canvas.height = h + pad * 2;
      if (live) this.live.set(img, s);
    }

    // Маска: кадр, залитый цветом тени по своей непрозрачности
    const t = this.tmp, g = this.tmpCtx;
    if (t.width !== w || t.height !== h) { t.width = w; t.height = h; } else g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(img, 0, 0, w, h);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = SHADOW.COLOR;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';

    const sg = s.canvas.getContext('2d');
    sg.clearRect(0, 0, s.canvas.width, s.canvas.height);
    sg.filter = `blur(${SHADOW.BLUR}px)`;
    sg.drawImage(t, pad, pad);
    sg.filter = 'none';
    if (!live) this.silhouettes.set(img, s);
    return s;
  }

  // Нижний ряд, где непрозрачно хотя бы несколько пикселей — там предмет касается земли (доля высоты)
  footRow(img, w, h) {
    const t = this.probe, g = this.probeCtx;
    if (t.width !== w || t.height !== h) { t.width = w; t.height = h; } else g.clearRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    const a = g.getImageData(0, 0, w, h).data;
    const need = Math.max(2, Math.round(w * 0.01));
    for (let y = h - 1; y >= 0; y--) {
      let n = 0;
      for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 64 && ++n >= need) return (y + 1) / h;
    }
    return null; // кадр ещё пуст — замерим, когда появится
  }

  // Начать слой теней кадра: тот же размер и та же камера, что у основного холста
  begin(ctx) {
    const c = ctx.canvas;
    if (this.layer.width !== c.width || this.layer.height !== c.height) {
      this.layer.width = c.width;
      this.layer.height = c.height;
    } else {
      this.lctx.setTransform(1, 0, 0, 1, 0, 0);
      this.lctx.clearRect(0, 0, c.width, c.height);
    }
    this.lctx.setTransform(ctx.getTransform());
    this.open = true;
  }

  /**
   * Тень кадра img, нарисованного в прямоугольнике (x, y, w, h) карты.
   * opts.footY — где стоит на земле (y карты), иначе по силуэту; opts.flip — кадр отражён по x;
   * opts.live — кадр меняется каждый кадр игры.
   */
  cast(img, x, y, w, h, opts) {
    if (!this.open || !img) return;
    const live = !!(opts && opts.live);
    const s = this.silhouette(img, live);
    if (!s) return;
    let gy = opts && opts.footY;
    if (typeof gy !== 'number') {
      if (s.foot === undefined) {
        const foot = this.footRow(img, s.w, s.h);
        if (foot === null) return;
        s.foot = foot;
      }
      gy = y + s.foot * h;
    }
    const g = this.lctx;
    g.save();
    // x' = x + SHEAR·(y − gy), y' = gy + SQUASH·(y − gy): выше опоры — влево и назад
    g.transform(1, 0, SHADOW.SHEAR, SHADOW.SQUASH, -SHADOW.SHEAR * gy, gy * (1 - SHADOW.SQUASH));
    if (opts && opts.flip) {
      g.translate(x + w / 2, 0);
      g.scale(-1, 1);
      g.translate(-(x + w / 2), 0);
    }
    const sx = w / s.w, sy = h / s.h;
    g.drawImage(s.canvas, x - s.pad * sx, y - s.pad * sy, (s.w + s.pad * 2) * sx, (s.h + s.pad * 2) * sy);
    g.restore();
  }

  // Положить собранные тени на землю
  end(ctx) {
    if (!this.open) return;
    this.open = false;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = SHADOW.ALPHA;
    ctx.drawImage(this.layer, 0, 0);
    ctx.restore();
  }

  // Насколько тень предмета высотой h уходит влево — для отсечения по экрану
  reach(h) {
    return SHADOW.SHEAR * h;
  }
}

window.shadowCaster = new ShadowCaster();
