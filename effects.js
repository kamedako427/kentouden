'use strict';

// エフェクト（火花・煙・表示）と HUD
// （Game クラスの続き。メソッドを prototype に追加する）
Object.assign(Game.prototype, {
  // ---------- エフェクト ----------
  onSpecial(f, m) {
    this.moveText = { text: m.name, owner: f, timer: 80, super: !!m.super };
    if (m.super) {
      this.freeze = 42;
      this.flashOwner = f;
      this.spawnRing(f.x, f.y - 80 * f.size, f.pal.aura, 3);
      SFX.super();
    }
  },

  spawnSparks(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * TAU;
      const sp = 2 + Math.random() * 7;
      this.particles.push({
        type: 'spark', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 0, max: 12 + Math.random() * 10, color, size: 2 + Math.random() * 3,
      });
    }
    this.particles.push({ type: 'ring', x, y, vx: 0, vy: 0, life: 0, max: 12, color, size: 3 });
  },

  spawnRing(x, y, color, n = 1) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ type: 'ring', x, y, vx: 0, vy: 0, life: -i * 5, max: 22, color, size: 4 });
    }
  },

  spawnSmoke(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * TAU;
      this.particles.push({
        type: 'smoke', x: x + Math.cos(ang) * 20, y: y + Math.sin(ang) * 40,
        vx: Math.cos(ang) * 1.5, vy: -0.5 - Math.random(), life: 0, max: 28,
        color, size: 12 + Math.random() * 10,
      });
    }
  },

  spawnDust(x) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        type: 'smoke', x: x + (Math.random() - 0.5) * 60, y: GROUND - 4,
        vx: (Math.random() - 0.5) * 3, vy: -Math.random(), life: 0, max: 22,
        color: '#c8a090', size: 8 + Math.random() * 6,
      });
    }
  },

  // 範囲攻撃の演出（技が出た瞬間）
  areaBurst(f, a) {
    const box = f.hitbox(a.box);
    const cx = box.x + box.w / 2;
    if (a.fx === 'shockwave') {
      // ゲージ衝撃波：画面全体に広がるリング
      for (let i = 0; i < 3; i++) {
        this.particles.push({ type: 'shock', x: f.x, y: f.y - 80 * f.size, vx: 0, vy: 0, life: -i * 3, max: 26, color: '#7affc8', size: 8, rx: 1100, ry: 900 });
      }
      this.shake = Math.max(this.shake, 12);
      SFX.burst();
      return;
    }
    if (a.fx === 'roar') {
      // 咆哮：体のまわりに衝撃波が広がる
      for (let i = 0; i < 3; i++) {
        this.particles.push({ type: 'shock', x: cx, y: box.y + box.h * 0.55, vx: 0, vy: 0, life: -i * 4, max: 22, color: f.pal.aura, size: 6, rx: box.w / 2, ry: box.h / 2 });
      }
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * TAU;
        this.particles.push({
          type: 'spark', x: cx + Math.cos(ang) * 30, y: box.y + box.h * 0.55 + Math.sin(ang) * 40,
          vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9, life: 0, max: 18, color: '#ffd84a', size: 3,
        });
      }
      this.shake = Math.max(this.shake, 14);
      SFX.burst();
      SFX.power();
    } else if (a.fx === 'quake') {
      // 四股踏み：地面を衝撃波と土煙が走る
      for (let x = box.x; x <= box.x + box.w; x += 18) {
        this.particles.push({
          type: 'smoke', x, y: GROUND - 6, vx: (x - cx) * 0.02, vy: -1 - Math.random() * 1.5,
          life: -Math.abs(x - f.x) / 12, max: 30, color: '#c8a090', size: 12 + Math.random() * 8,
        });
        this.particles.push({
          type: 'spark', x, y: GROUND - 4, vx: (Math.random() - 0.5) * 2, vy: -4 - Math.random() * 4,
          life: -Math.abs(x - f.x) / 12, max: 20, color: '#8a6a4a', size: 4,
        });
      }
      this.particles.push({ type: 'quake', x: cx, y: GROUND, vx: 0, vy: 0, life: 0, max: 20, color: '#ffd84a', size: 4, rx: box.w / 2 });
      this.shake = Math.max(this.shake, 16);
      SFX.burst();
      SFX.thunder();
    }
  },

  addPopup(text, x, y, color) {
    this.popups.push({ text, x: clamp(x, this.camX + 80, this.camX + W - 80), y, color, t: 0 });
  },

  updateEffects() {
    for (const p of this.particles) {
      p.life++;
      if (p.life <= 0) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.9;
      p.vy *= 0.9;
      if (p.type === 'spark') p.vy += 0.15;
    }
    this.particles = this.particles.filter(p => p.life < p.max);

    for (const pu of this.popups) pu.t++;
    this.popups = this.popups.filter(pu => pu.t < 60);

    for (let i = 0; i < this.petals.length; i++) {
      const pt = this.petals[i];
      pt.x += pt.vx + Math.sin(this.frame * 0.02 + pt.phase) * 0.4;
      pt.y += pt.vy;
      pt.rot += pt.vr;
      if (pt.y > H + 10 || pt.x < -10) this.petals[i] = this.newPetal(false);
    }

    this.shake *= 0.85;
    if (this.slashFx && --this.slashFx.t <= 0) this.slashFx = null;
    if (this.combo && --this.combo.timer <= 0) this.combo = null;
    if (this.moveText && --this.moveText.timer <= 0) this.moveText = null;
  },

  // ---------- HUD ----------
  updateHUD() {
    if (this.state === 'title' || this.state === 'select') return;
    for (const [f, el] of [[this.p1, ui.p1], [this.p2, ui.p2]]) {
      el.hp.style.width = (f.hp / f.maxHp) * 100 + '%';
      el.lag.style.width = (f.lagHp / f.maxHp) * 100 + '%';
      el.hp.classList.toggle('low', f.hp / f.maxHp <= 0.25);
      el.meter.style.width = f.meter + '%';
      el.meter.classList.toggle('ready', f.meter >= METER_MAX);
    }
    ui.timer.textContent = this.mode === 'training' ? '∞' : String(this.time).padStart(2, '0');
    ui.timer.classList.toggle('danger', this.time <= 10);
  },

  renderWins() {
    for (const [f, el] of [[this.p1, ui.p1], [this.p2, ui.p2]]) {
      el.wins.innerHTML = Array.from({ length: WINS_NEEDED },
        (_, i) => `<span class="win-dot${i < f.wins ? ' on' : ''}"></span>`).join('');
    }
  }
});
