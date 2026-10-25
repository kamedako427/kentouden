'use strict';

// 画面全体の描画
// （Game クラスの続き。メソッドを prototype に追加する）
Object.assign(Game.prototype, {
  // ---------- 描画 ----------
  draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (this.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    // 背景（奥ほどゆっくり動く）
    const cam = this.camX;
    ctx.drawImage(this.bg.sky, 0, 0);
    ctx.drawImage(this.bg.far, -cam * FAR_PARALLAX, 0);
    ctx.drawImage(this.bg.near, -cam, 0);

    ctx.fillStyle = 'rgba(255,180,210,0.75)';
    for (const pt of this.petals) {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.r, pt.r * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 超必殺技の暗転
    if (this.freeze > 0 && this.flashOwner) {
      const f = this.flashOwner;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const k = 1 - this.freeze / 42;
      ctx.globalAlpha = 0.6;
      glow(ctx, f.x - cam, f.y - 80 * f.size, 80 + k * 140, f.pal.aura);
      ctx.restore();
    }

    // ここから先はステージ上の座標（カメラ分ずらす）
    ctx.translate(-cam, 0);
    if (this.state !== 'select') {
      this.p1.drawShadow(ctx);
      this.p2.drawShadow(ctx);
      const order = this.p1.state === 'attack' || this.flashOwner === this.p1 && this.freeze > 0
        ? [this.p2, this.p1] : [this.p1, this.p2];
      order.forEach(f => f.draw(ctx));
      this.drawAreaFx();
      this.drawProjectiles();
      if (this.mode === 'training' && this.training && this.training.boxes && this.state === 'fight') this.drawBoxes();
    }
    this.drawParticles();
    ctx.restore();

    ctx.drawImage(this.vignette, 0, 0);
    if (this.slashFx) {
      // 一刀両断の斬撃
      const k = this.slashFx.t / 40;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.strokeStyle = '#fff';
      ctx.shadowColor = this.slashFx.color;
      ctx.shadowBlur = 30;
      ctx.lineWidth = 6 + (1 - k) * 10;
      ctx.beginPath();
      ctx.moveTo(-20, this.slashFx.y + 120);
      ctx.lineTo(W + 20, this.slashFx.y - 120);
      ctx.stroke();
      ctx.restore();
    }
    // 死の宣告のカウントと吹き出し文字（ステージ上の座標）
    ctx.save();
    ctx.translate(-cam, 0);
    for (const f of [this.p1, this.p2]) {
      if (f.doom > 0 && this.state !== 'select') {
        ctx.save();
        ctx.font = '900 30px Impact, "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#c08aff';
        const n = String(Math.ceil(f.doom / 60));
        ctx.strokeText(n, f.x, f.y - 175 * f.size);
        ctx.fillText(n, f.x, f.y - 175 * f.size);
        ctx.restore();
      }
    }
    this.drawPopups();
    ctx.restore();
    this.drawCombo();
    this.drawMoveText();
    this.drawSuperCutIn();

    if (this.state === 'select') this.drawPreviews();
  },


  // 範囲攻撃の当たる範囲を、攻撃判定が出ている間だけ表示する
  drawAreaFx() {
    for (const f of [this.p1, this.p2]) {
      const a = f.attack;
      if (f.state !== 'attack' || !a || !a.fx) continue;
      const t = f.stateTime;
      const box = f.hitbox(a.box);
      const cx = box.x + box.w / 2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (a.fx === 'shockwave') {
        // ゲージ衝撃波：溜め → 全方向にリングが広がる
        const cy = f.y - 80 * f.size;
        if (t < a.startup) {
          ctx.globalAlpha = 0.3 + (t / a.startup) * 0.6;
          glow(ctx, f.x, cy, 20 + (t / a.startup) * 60, '#7affc8');
        } else {
          const p = Math.min(1, (t - a.startup) / (a.active + 10));
          ctx.globalAlpha = 0.9 * (1 - p);
          ctx.strokeStyle = '#bfffe8';
          ctx.lineWidth = 10;
          for (const r of [p * 1200, p * 800, p * 450]) {
            ctx.beginPath();
            ctx.arc(f.x, cy, Math.max(4, r), 0, TAU);
            ctx.stroke();
          }
        }
        ctx.restore();
        continue;
      }
      if (t < a.startup) {
        // 溜め：口元／足元に力が集まる
        const k = t / a.startup;
        ctx.globalAlpha = 0.25 + k * 0.5;
        if (a.fx === 'roar') glow(ctx, f.x + f.facing * 14 * f.size, f.y - 138 * f.size, 10 + k * 40, f.pal.aura);
        else glow(ctx, f.x, GROUND - 6, 20 + k * 50, '#ffb04a');
      } else if (t < a.startup + a.active) {
        const p = (t - a.startup) / a.active;
        const fade = 1 - p * 0.6;
        if (a.fx === 'roar') {
          // 当たる範囲（楕円）を塗り、外周を光らせる
          const cy = box.y + box.h * 0.55;
          const gr = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(box.w, box.h) / 2);
          gr.addColorStop(0, 'rgba(0,0,0,0)');
          gr.addColorStop(0.7, f.pal.aura);
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 0.45 * fade;
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.ellipse(cx, cy, box.w / 2, box.h / 2, 0, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 0.9 * fade;
          ctx.strokeStyle = '#ffe9a0';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(cx, cy, box.w / 2, box.h / 2, 0, 0, TAU);
          ctx.stroke();
        } else {
          // 地面に沿った衝撃波の帯（ギザギザ）
          ctx.globalAlpha = 0.6 * fade;
          const gr = ctx.createLinearGradient(0, GROUND - box.h - 20, 0, GROUND);
          gr.addColorStop(0, 'rgba(0,0,0,0)');
          gr.addColorStop(1, '#ffb04a');
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.moveTo(box.x, GROUND);
          for (let x = box.x; x <= box.x + box.w; x += 12) {
            const spike = ((x * 7 + t * 13) % 23) / 23;
            ctx.lineTo(x, GROUND - box.h - spike * 22);
          }
          ctx.lineTo(box.x + box.w, GROUND);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 0.9 * fade;
          ctx.strokeStyle = '#fff2c0';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(box.x, GROUND - 2);
          ctx.lineTo(box.x + box.w, GROUND - 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  },

  // トレーニング：くらい判定（青）・攻撃判定（赤）・飛び道具（黄）を表示
  drawBoxes() {
    ctx.save();
    ctx.lineWidth = 2;
    const rect = (b, stroke, fill) => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    };
    for (const f of [this.p1, this.p2]) {
      const inv = f.isInvuln();
      rect(f.hurtbox(), inv ? 'rgba(255,255,255,0.9)' : 'rgba(80,160,255,0.95)', inv ? 'rgba(255,255,255,0.12)' : 'rgba(80,160,255,0.18)');
      const a = f.attack;
      if (f.state === 'attack' && a && a.box && f.stateTime >= a.startup && f.stateTime < a.startup + a.active) {
        rect(f.hitbox(a.box), 'rgba(255,70,70,0.95)', 'rgba(255,70,70,0.25)');
      }
    }
    for (const p of this.projectiles) {
      if (p.delay <= 0) rect(this.projBox(p), 'rgba(255,220,60,0.95)', 'rgba(255,220,60,0.2)');
    }
    ctx.restore();
  },

  drawParticles() {
    ctx.save();
    ctx.lineCap = 'round';
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        ctx.stroke();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 + p.life * 4, 0, TAU);
        ctx.stroke();
      } else if (p.type === 'shock') {
        // 広がる衝撃波の輪
        const k = p.life / p.max;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * (1 - k) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx * (0.4 + k * 0.8), p.ry * (0.4 + k * 0.8), 0, 0, TAU);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.type === 'quake') {
        // 地面を左右に走る波
        const k = p.life / p.max;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(p.x + s * p.rx * k, GROUND - 2, 30, 6, 0, 0, TAU);
          ctx.stroke();
        }
      } else if (p.type === 'smoke') {
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.5 - a * 0.5), 0, TAU);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
  },

  drawPopups() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'italic 900 26px Impact, "Arial Black", sans-serif';
    for (const pu of this.popups) {
      ctx.globalAlpha = Math.min(1, (60 - pu.t) / 15);
      const y = pu.y - pu.t * 0.8;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000';
      ctx.strokeText(pu.text, pu.x, y);
      ctx.fillStyle = pu.color;
      ctx.fillText(pu.text, pu.x, y);
    }
    ctx.restore();
  },

  drawCombo() {
    const c = this.combo;
    if (!c) return;
    const left = c.owner === this.p1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, c.timer / 20);
    ctx.font = 'italic 900 38px Impact, "Arial Black", sans-serif';
    ctx.textAlign = left ? 'left' : 'right';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#600';
    ctx.fillStyle = '#ffd84a';
    const x = left ? 40 : W - 40;
    const text = `${c.count} HITS!`;
    ctx.strokeText(text, x, 160);
    ctx.fillText(text, x, 160);
    ctx.restore();
  },

  drawMoveText() {
    const m = this.moveText;
    if (!m || m.super || this.state === 'title') return;
    const left = m.owner === this.p1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, m.timer / 15);
    ctx.font = '900 24px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
    ctx.textAlign = left ? 'left' : 'right';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = m.owner.pal.aura;
    const x = left ? 40 : W - 40;
    ctx.strokeText(m.text, x, 200);
    ctx.fillText(m.text, x, 200);
    ctx.restore();
  },

  drawSuperCutIn() {
    if (this.freeze <= 0 || !this.flashOwner || !this.moveText) return;
    const f = this.flashOwner;
    const k = 42 - this.freeze;
    const slide = Math.min(1, k / 8);
    const out = this.freeze < 8 ? this.freeze / 8 : 1;
    const left = f === this.p1;
    const y = H * 0.66;
    ctx.save();
    ctx.globalAlpha = out;
    const gr = ctx.createLinearGradient(0, 0, W, 0);
    const col = f.pal.aura;
    gr.addColorStop(left ? 0 : 1, col);
    gr.addColorStop(0.5, 'rgba(0,0,0,0.6)');
    gr.addColorStop(left ? 1 : 0, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, y - 40, W, 80);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, y - 42, W, 3);
    ctx.fillRect(0, y + 39, W, 3);

    ctx.font = 'italic 900 52px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = W / 2 + (left ? -1 : 1) * (1 - slide) * W * 0.6;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000';
    ctx.strokeText(this.moveText.text, x, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(this.moveText.text, x, y);
    ctx.restore();
  }
});
