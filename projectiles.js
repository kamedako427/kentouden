'use strict';

// 飛び道具（発生・移動・当たり判定・描画）
// （Game クラスの続き。メソッドを prototype に追加する）
Object.assign(Game.prototype, {
  // ---------- 飛び道具 ----------
  spawnProjectiles(f, a) {
    const list = a.projectiles || [a.projectile];
    // 雨は出した瞬間の相手の位置に固定して降らせる
    const opp = f === this.p1 ? this.p2 : this.p1;
    const rainX = clamp(opp.x, STAGE_MIN + 60, STAGE_MAX - 60);
    const boost = a.projBoost; // 大ボタンで出した時：速く・重く
    for (const base of list) {
      const spec = boost ? { ...base, speed: (base.speed || PROJ_DEFAULTS.speed) * (boost.speed || 1), damage: (base.damage || PROJ_DEFAULTS.damage) * (boost.damage || 1) } : base;
      const p = this.makeProjectile(f, spec);
      p.moveName = a.name; // 同じ技はコンボ中に1回だけ当たる判定に使う
      p.fromSuper = !!a.super; // 超必殺技の飛び道具ではゲージが増えない
      if (p.kind === 'drop') p.x = clamp(rainX + (gameRand() - 0.5) * 170, STAGE_MIN - 20, STAGE_MAX + 20);
      this.projectiles.push(p);
    }
  },

  makeProjectile(f, spec) {
    const s = { ...PROJ_DEFAULTS, ...spec };
    const opp = f === this.p1 ? this.p2 : this.p1;
    const sz = f.size;
    const p = {
      ...s, owner: f, target: opp, dir: f.facing, mult: f.attackMult * f.buffMult(),
      age: 0, hitCount: 0, hitTimer: 0, dead: false, travel: PROJ_TRAVEL.has(s.kind), delayMax: s.delay || 0,
      x: 0, y: 0, vx: 0, vy: s.vy || 0,
    };
    switch (s.kind) {
      case 'pillar':
      case 'holy':
      case 'mine':
      case 'vortex':
      case 'barrier':
      case 'curse':
      case 'updraft':
        p.x = clamp(f.x + f.facing * s.offset, STAGE_MIN - 10, STAGE_MAX + 10);
        p.y = GROUND - s.h / 2;
        break;
      case 'drop':
        // 位置は spawnProjectiles で固定する
        p.x = opp.x;
        p.y = -20;
        break;
      case 'tornado':
      case 'tsunami':
        p.x = f.x + f.facing * 60 * sz;
        p.y = GROUND - s.h / 2;
        p.vx = f.facing * s.speed;
        break;
      case 'lightning':
        p.x = opp.x;
        p.y = GROUND / 2;
        break;
      case 'wave': {
        const dm = s.reverse ? -1 : 1;
        p.dir = f.facing * dm;
        p.x = f.x + p.dir * 50 * sz;
        p.y = GROUND - s.h / 2;
        p.vx = p.dir * s.speed;
        break;
      }
      case 'beam':
        p.x = f.x + f.facing * 60 * sz;
        p.y = f.y - 108 * sz;
        break;
      default:
        p.x = f.x + f.facing * 58 * sz;
        p.y = f.y - (s.yOff ?? (s.gravity ? 125 : 82)) * sz;
        p.vx = f.facing * s.speed;
    }
    if (p.delay <= 0) this.onProjectileActive(p);
    return p;
  },

  onProjectileActive(p) {
    if (p.kind === 'drop') {
      p.y = -20;
      p.vy = 9;
      return;
    }
    switch (p.kind) {
      case 'lightning':
        SFX.thunder();
        this.shake = Math.max(this.shake, 8);
        this.spawnSparks(p.x, GROUND - 10, p.color, 12);
        break;
      case 'pillar':
      case 'holy':
        SFX.burst();
        this.shake = Math.max(this.shake, 5);
        break;
      case 'shuriken':
      case 'blade':
        SFX.slash();
        break;
      default:
        SFX.fireball();
    }
  },

  moveProjectile(p) {
    // 追尾
    if (p.homing && p.target) {
      const ty = p.target.y - 80 * p.target.size;
      p.vy = clamp(p.vy + Math.sign(ty - p.y) * 0.12, -2.2, 2.2);
    }
    // ブーメラン
    if (p.returnAt && p.age === p.returnAt) {
      p.vx = -p.vx;
      p.returning = true;
      p.hitCount = 0;
    }
    if (p.returning && Math.abs(p.x - p.owner.x) < 30) p.dead = true;

    p.x += p.vx;
    if (p.gravity) p.vy += p.gravity;
    if (p.vy) p.y += p.vy;
    if ((p.gravity || p.vy > 0) && !p.landed && p.y >= GROUND - p.h / 2) {
      p.y = GROUND - p.h / 2;
      if (p.kind === 'grenade') {
        p.landed = true;
        p.vx = 0;
        p.vy = 0;
        p.gravity = 0;
        p.fuse = 36;
      } else if (p.bounces > 0) {
        p.bounces--;
        p.vy = -Math.abs(p.vy) * 0.6;
        this.spawnDust(p.x);
      } else {
        p.dead = true;
        if (p.kind !== 'drop') {
          this.spawnDust(p.x);
          this.shake = Math.max(this.shake, 4);
          SFX.burst();
        }
      }
    }
    if (p.y < -80) p.dead = true;

    // グレネードの爆発
    if (p.landed && p.fuse > 0 && --p.fuse === 0) {
      p.exploded = true;
      p.w = 150;
      p.h = 150;
      p.y = GROUND - 75;
      p.age = 0;
      p.life = 10;
      this.shake = Math.max(this.shake, 10);
      SFX.burst();
      SFX.thunder();
    }

    this.applyPull(p);
  },

  // 吸い込み（渦・竜巻）。pullAir なら空中の相手も吸い込む
  applyPull(p) {
    if (!p.pullRange) return;
    const tg = p.target;
    const dx = p.x - tg.x;
    if (['thrown', 'down', 'ko', 'roll'].includes(tg.state)) return;
    if (Math.abs(dx) >= p.pullRange || (!tg.onGround && !p.pullAir)) return;
    const power = p.pullPower || 2.6;
    tg.x = clamp(tg.x + Math.sign(dx) * Math.min(power, Math.abs(dx)), STAGE_MIN, STAGE_MAX);
  },

  projBox(p) {
    if (p.kind === 'beam') {
      return p.dir > 0
        ? { x: p.x, y: p.y - p.h / 2, w: STAGE_W - p.x + 40, h: p.h }
        : { x: -40, y: p.y - p.h / 2, w: p.x + 40, h: p.h };
    }
    if (p.kind === 'lightning') return { x: p.x - p.w / 2, y: 0, w: p.w, h: GROUND };
    return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
  },

  updateProjectiles() {
    const ps = this.projectiles;
    for (const p of ps) {
      if (p.delay > 0) {
        p.delay--;
        this.applyPull(p); // 予兆の間から吸い込む
        if (p.track && p.delay > 8) p.x = clamp(p.target.x, STAGE_MIN - 20, STAGE_MAX + 20);
        if (p.delay === 0) this.onProjectileActive(p);
        continue;
      }
      p.age++;
      if (p.kind === 'beam') {
        p.x = p.owner.x + p.dir * 60 * p.owner.size;
        if (p.owner.state !== 'attack') p.dead = true;
      }
      this.moveProjectile(p);
      if (p.hitTimer > 0) p.hitTimer--;
      if (p.age >= p.life) p.dead = true;
      if (p.travel && p.age % 2 === 0) {
        this.particles.push({
          type: 'glow', x: p.x - p.vx, y: p.y + (Math.random() - 0.5) * p.h * 0.5,
          vx: -p.vx * 0.1, vy: (Math.random() - 0.5), life: 0, max: 16,
          color: p.color, size: Math.min(20, p.w * 0.3),
        });
      }
    }

    // 相殺
    const live = ps.filter(p => !p.dead && p.delay <= 0 && (p.travel || p.kind === 'beam'));
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        if (a.owner === b.owner || a.dead || b.dead) continue;
        if (!overlap(this.projBox(a), this.projBox(b))) continue;
        const strongA = a.big || a.kind === 'beam';
        const strongB = b.big || b.kind === 'beam';
        if (strongA && !strongB) b.dead = true;
        else if (strongB && !strongA) a.dead = true;
        else if (a.kind !== 'beam' || b.kind !== 'beam') { a.dead = true; b.dead = true; }
        if (a.dead || b.dead) {
          this.spawnSparks((a.x + b.x) / 2, (a.y + b.y) / 2, '#fff', 14);
          SFX.block();
        }
      }
    }

    // 飛び道具を消す技（バリア・棍旋回陣など）
    const erasers = ps.filter(p => !p.dead && p.erase && p.delay <= 0).map(p => ({ owner: p.owner, box: this.projBox(p) }));
    for (const f of [this.p1, this.p2]) {
      const a = f.attack;
      if (f.state === 'attack' && a.erase && a.box && f.stateTime >= a.startup && f.stateTime < a.startup + a.active) {
        erasers.push({ owner: f, box: f.hitbox(a.box) });
      }
    }
    for (const er of erasers) {
      for (const p of ps) {
        if (!p.dead && p.travel && p.owner !== er.owner && overlap(this.projBox(p), er.box)) {
          p.dead = true;
          this.spawnSparks(p.x, p.y, '#fff', 10);
          SFX.block();
        }
      }
    }

    // ヒット判定
    for (const p of ps) {
      if (p.dead || p.delay > 0 || p.hitTimer > 0 || p.hitCount >= p.hits) continue;
      if (p.kind === 'grenade' && !p.exploded) continue;
      if (p.kind === 'mine' && p.age < (p.arm || 0)) continue;
      // 地雷は起き上がった直後の相手には当たらない（置きっぱなしでのループ防止）。
      // 渦引きは起き上がり無敵が切れたら当たる（ガードは間に合うので、普通の起き攻めとして扱う）
      if (p.kind === 'mine' && p.target.trapImmune > 0) continue;
      const target = p.owner === this.p1 ? this.p2 : this.p1;
      if (target.state === 'ko') continue;
      if (p.kind === 'mine' && !target.onGround) continue;
      const box = this.projBox(p);
      const locked = p.lockTarget === target && p.hitCount > 0;
      if (!locked && !overlap(box, target.hurtbox())) continue;
      const dir = p.vx ? Math.sign(p.vx) : (Math.sign(target.x - p.owner.x) || p.dir);
      const py = PROJ_STATIONARY.has(p.kind) || p.kind === 'lightning' || locked ? target.y - 80 * target.size : p.y;
      const res = this.applyHit(p.owner, target, p, dir, target.x - dir * 16, py, {
        projectile: true, mult: p.mult, final: p.hitCount + 1 >= p.hits, locked,
      });
      if (res === true && p.hits > 1) p.lockTarget = target;
      // 当たったら、撃った側が相手と同じタイミングで動けるようにする
      if (res === true && p.syncRecovery && p.owner.state === 'attack' && p.owner.attack) {
        const a = p.owner.attack;
        p.owner.stateTime = a.startup + a.active + a.recovery - Math.max(1, target.stun);
      }
      if (!res && locked) p.lockTarget = null;
      if (res === 'parried') {
        p.dead = true;
        continue;
      }
      if (res === 'reflect') {
        if (p.travel) {
          p.owner = target;
          p.target = p.owner === this.p1 ? this.p2 : this.p1;
          p.vx = -p.vx * 1.2;
          p.dir = -p.dir;
          p.hitCount = 0;
          p.mult = 1;
          this.addPopup('REFLECT!', target.x, target.y - 170 * target.size, target.pal.aura);
          SFX.block();
        } else {
          p.dead = true;
        }
        continue;
      }
      if (res) {
        p.hitCount++;
        p.hitTimer = p.hitInterval;
        if ((p.travel || p.kind === 'mine' || p.kind === 'drop' || p.kind === 'laser' || p.kind === 'vortex') && p.hitCount >= p.hits) p.dead = true;
      }
    }

    this.projectiles = ps.filter(p => !p.dead && p.x > -80 && p.x < STAGE_W + 80);
  },


  drawProjectiles() {
    for (const p of this.projectiles) {
      ctx.save();
      if (p.delay > 0) {
        this.drawWarning(p);
      } else {
        this.drawProjectile(p);
      }
      ctx.restore();
    }
  },

  drawWarning(p) {
    const blink = Math.floor(this.frame / 3) % 2;
    ctx.globalCompositeOperation = 'lighter';
    if (p.kind === 'vortex') {
      // 地面に渦巻く予兆（だんだん大きく）
      const k = 1 - p.delay / (p.delayMax || 14);
      ctx.globalAlpha = 0.5 + k * 0.4;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(p.x, GROUND - 4, (14 + i * 16) * (0.5 + k * 0.6), (4 + i * 3) * (0.5 + k * 0.6), 0, this.frame * 0.4 + i, this.frame * 0.4 + i + 4.4);
        ctx.stroke();
      }
      glow(ctx, p.x, GROUND - 6, 30 + k * 30, p.color);
      return;
    }
    if (p.kind === 'drop') {
      // 雨雲（降る場所に止まっている）
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#3a4a6a';
      ctx.beginPath();
      ctx.arc(p.x, 34, 24, 0, TAU);
      ctx.arc(p.x + 18, 40, 18, 0, TAU);
      ctx.fill();
      return;
    }
    if (p.kind === 'lightning') {
      ctx.globalAlpha = 0.4 + blink * 0.3;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, GROUND, 34, 8, 0, 0, TAU);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#2a2a3a';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(p.x + i * 22, 30 + Math.abs(i) * 6, 22, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.globalAlpha = 0.3 + blink * 0.3;
      glow(ctx, p.x, GROUND - 6, 40, p.color);
    }
  },

  drawProjectile(p) {
    const c = p.color;
    const t = p.age;
    ctx.globalCompositeOperation = 'lighter';
    switch (p.kind) {
      case 'orb': {
        const r = p.w * 0.72 + Math.sin(t * 0.5) * 3;
        glow(ctx, p.x, p.y, r, c);
        break;
      }
      case 'missile':
      case 'laser': {
        const ang = Math.atan2(p.vy, p.vx);
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        if (p.kind === 'laser') {
          ctx.strokeStyle = '#fff';
          ctx.shadowColor = c;
          ctx.shadowBlur = 16;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(-40, 0);
          ctx.lineTo(16, 0);
          ctx.stroke();
        } else {
          glow(ctx, -14, 0, 12, c);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#d0d8e0';
          ctx.fillRect(-10, -4, 20, 8);
          ctx.fillStyle = '#ff3a3a';
          ctx.beginPath();
          ctx.moveTo(10, -4);
          ctx.lineTo(16, 0);
          ctx.lineTo(10, 4);
          ctx.fill();
        }
        break;
      }
      case 'tornado':
      case 'updraft': {
        const hh = p.h, ww = p.w;
        const fade = p.kind === 'updraft' ? Math.min(1, (p.life - t) / 8) : 1;
        ctx.globalAlpha = 0.75 * fade;
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
          const yy = p.y + hh / 2 - (i + 0.5) * (hh / 7);
          const rw = ww * (0.3 + 0.7 * (i / 6)) / 2;
          const ph = t * 0.5 + i;
          ctx.beginPath();
          ctx.ellipse(p.x + Math.sin(ph) * 6, yy, rw, rw * 0.25, 0, 0, TAU);
          ctx.stroke();
        }
        glow(ctx, p.x, p.y + hh / 2 - 8, ww * 0.6, c);
        break;
      }
      case 'bubble': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = 'rgba(140,216,255,0.3)';
        ctx.strokeStyle = '#bff0ff';
        ctx.lineWidth = 2;
        const r = p.w / 2 + Math.sin(t * 0.3) * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        ctx.stroke();
        drawDot(ctx, P(p.x - r * 0.35, p.y - r * 0.35), r * 0.18, '#ffffff');
        break;
      }
      case 'vortex': {
        // 足元の渦潮から、ねじれた水柱が噴き上がる
        const fade = Math.min(1, (p.life - t) / 6);
        const hgt = p.h * Math.min(1, t / 5);
        const half = p.w / 2;
        ctx.globalAlpha = 0.8 * fade;
        ctx.globalCompositeOperation = 'source-over';
        // 渦潮（地面の大きな渦）
        ctx.fillStyle = 'rgba(30, 90, 160, 0.55)';
        ctx.beginPath();
        ctx.ellipse(p.x, GROUND - 3, half * 1.2, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bff0ff';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
          const r = half * (0.3 + i * 0.3);
          ctx.beginPath();
          ctx.ellipse(p.x, GROUND - 3, r, r * 0.16, 0, -t * 0.35 + i * 1.6, -t * 0.35 + i * 1.6 + 3.6);
          ctx.stroke();
        }
        // 水柱：輪を積み重ね、上に行くほど細く、ねじれて揺れる
        ctx.globalCompositeOperation = 'lighter';
        for (let y = 0; y < hgt; y += 10) {
          const k = y / p.h;
          const r = half * (0.95 - k * 0.3);
          const sway = Math.sin(t * 0.5 + k * 6) * 6 * k;
          ctx.strokeStyle = k > 0.8 ? '#ffffff' : c;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(p.x + sway, GROUND - y, r, r * 0.22, 0, t * 0.6 + k * 8, t * 0.6 + k * 8 + 4.2);
          ctx.stroke();
        }
        // しぶき
        for (let i = 0; i < 6; i++) {
          const ang = t * 0.3 + i;
          const yy = GROUND - hgt + ((t * 7 + i * 30) % 60);
          ctx.fillStyle = '#dff8ff';
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(ang) * half * 0.8, yy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        glow(ctx, p.x, GROUND - hgt, 26, c);
        break;
      }
      case 'drop': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 12);
        ctx.quadraticCurveTo(p.x + 7, p.y + 2, p.x, p.y + 8);
        ctx.quadraticCurveTo(p.x - 7, p.y + 2, p.x, p.y - 12);
        ctx.fill();
        break;
      }
      case 'barrier': {
        const fade = Math.min(1, (p.life - t) / 10);
        const grow = Math.min(1, t / 4);
        ctx.globalAlpha = 0.7 * fade;
        const hgt = p.h * grow;
        const gr = ctx.createLinearGradient(p.x - p.w / 2, 0, p.x + p.w / 2, 0);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.5, c);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(p.x - p.w / 2, GROUND - hgt, p.w, hgt);
        ctx.strokeStyle = '#e0f8ff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const yy = GROUND - ((t * 6 + i * 50) % hgt);
          ctx.beginPath();
          ctx.moveTo(p.x - 8, yy);
          ctx.lineTo(p.x + 8, yy - 10);
          ctx.stroke();
        }
        break;
      }
      case 'curse': {
        const fade = Math.min(1, (p.life - t) / 8);
        ctx.globalAlpha = fade;
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, GROUND - 4, 46, 11, 0, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const a = t * 0.15 + (i / 5) * TAU;
          glow(ctx, p.x + Math.cos(a) * 30, GROUND - 20 - ((t * 3 + i * 25) % 120), 10, c);
        }
        break;
      }
      case 'chain': {
        const hx = p.owner.x + p.dir * 40 * p.owner.size;
        const hy = p.owner.y - 110 * p.owner.size;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#8a7aa0';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#d8d0e8';
        ctx.beginPath();
        ctx.moveTo(p.x + p.dir * 16, p.y);
        ctx.lineTo(p.x - p.dir * 4, p.y - 10);
        ctx.lineTo(p.x - p.dir * 4, p.y + 10);
        ctx.fill();
        break;
      }
      case 'mine': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#3a3a42';
        ctx.beginPath();
        ctx.ellipse(p.x, GROUND - 6, 20, 7, 0, 0, TAU);
        ctx.fill();
        const on = p.age >= (p.arm || 0) && Math.floor(t / 10) % 2 === 0;
        drawDot(ctx, P(p.x, GROUND - 11), 3.5, on ? '#ff3a3a' : '#5a2a2a');
        break;
      }
      case 'grenade': {
        if (p.exploded) {
          const k = 1 - t / p.life;
          glow(ctx, p.x, GROUND - 60, 110 * (1.2 - k * 0.4), '#ffb03a');
          glow(ctx, p.x, GROUND - 40, 70, '#fff');
        } else {
          ctx.globalCompositeOperation = 'source-over';
          drawDot(ctx, P(p.x, p.y), 9, '#4a5a2a');
          if (p.landed && Math.floor(p.fuse / 4) % 2 === 0) drawDot(ctx, P(p.x, p.y - 9), 3, '#ff3a3a');
        }
        break;
      }
      case 'tsunami': {
        ctx.globalAlpha = 0.85;
        const gr = ctx.createLinearGradient(0, p.y - p.h / 2, 0, GROUND);
        gr.addColorStop(0, '#e0f8ff');
        gr.addColorStop(0.3, c);
        gr.addColorStop(1, '#1a4a8a');
        ctx.fillStyle = gr;
        ctx.beginPath();
        const front = p.x + p.dir * p.w / 2;
        const backX = p.x - p.dir * p.w / 2;
        ctx.moveTo(backX - p.dir * 40, GROUND);
        ctx.lineTo(backX, p.y - p.h * 0.2);
        ctx.quadraticCurveTo(p.x, p.y - p.h / 2 - 20, front + p.dir * 20, p.y - p.h * 0.3 + Math.sin(t * 0.4) * 8);
        ctx.quadraticCurveTo(front - p.dir * 10, p.y - p.h * 0.1, front, GROUND);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'scythe':
      case 'windblade': {
        const sc = p.kind === 'scythe' ? 1.6 : 0.6;
        ctx.translate(p.x, p.y);
        ctx.scale(p.dir * sc, sc);
        ctx.rotate(p.kind === 'scythe' ? Math.sin(t * 0.2) * 0.2 : 0);
        ctx.shadowColor = c;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(-14, 0, 34, -1.1, 1.1);
        ctx.stroke();
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-22, 0, 34, -1.0, 1.0);
        ctx.stroke();
        break;
      }
      case 'rock': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(p.x, p.y);
        ctx.rotate(t * 0.25 * p.dir);
        const r = p.w / 2;
        ctx.fillStyle = '#7a6a5a';
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU;
          const rr = r * (0.82 + ((i * 37) % 7) / 30);
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a4a3a';
        drawDot(ctx, P(-r * 0.3, -r * 0.2), r * 0.25, '#5a4a3a');
        drawDot(ctx, P(r * 0.35, r * 0.25), r * 0.18, '#5a4a3a');
        break;
      }
      case 'fist': {
        glow(ctx, p.x - p.dir * 26, p.y, 22, c);
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(p.x, p.y);
        ctx.scale(p.dir, 1);
        ctx.fillStyle = '#8a96a4';
        ctx.fillRect(-30, -8, 26, 16);
        drawDot(ctx, P(4, 0), 13, '#c8d0dc');
        ctx.strokeStyle = '#5a6470';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(8, -8);
        ctx.lineTo(8, 8);
        ctx.stroke();
        break;
      }
      case 'shuriken': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(p.x, p.y);
        ctx.rotate(t * 0.6);
        ctx.fillStyle = c;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? 4 : 15;
          const a = (i / 8) * TAU;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        drawDot(ctx, P(0, 0), 3, '#333');
        break;
      }
      case 'ofuda': {
        glow(ctx, p.x, p.y, 30, c);
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(t * 0.3) * 0.25);
        ctx.fillStyle = '#fffbe8';
        ctx.fillRect(-14, -9, 28, 18);
        ctx.strokeStyle = '#c8202a';
        ctx.lineWidth = 2;
        ctx.strokeRect(-11, -6, 22, 12);
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.moveTo(0, -4);
        ctx.lineTo(0, 4);
        ctx.stroke();
        break;
      }
      case 'fire': {
        const s = p.w / 44;
        for (let i = 0; i < 6; i++) {
          const ox = -p.dir * i * 7 * s + Math.sin(t * 0.7 + i) * 3 * s;
          const oy = Math.cos(t * 0.5 + i * 1.7) * 5 * s;
          glow(ctx, p.x + ox, p.y + oy, (22 - i * 2.5) * s, i < 2 ? '#ffd23a' : c);
        }
        break;
      }
      case 'blade': {
        ctx.translate(p.x, p.y);
        ctx.scale(p.dir, 1);
        ctx.shadowColor = c;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#eefcff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(-14, 0, 34, -1.1, 1.1);
        ctx.stroke();
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-22, 0, 34, -1.0, 1.0);
        ctx.stroke();
        break;
      }
      case 'bolt': {
        ctx.translate(p.x, p.y);
        ctx.scale(p.dir, 1);
        const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
        gr.addColorStop(0, '#fff');
        gr.addColorStop(0.4, c);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.ellipse(0, 0, 32, 16, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        for (let i = 1; i <= 5; i++) ctx.lineTo(-30 + i * 12, (Math.random() - 0.5) * 16);
        ctx.stroke();
        break;
      }
      case 'wave': {
        const gr = ctx.createLinearGradient(0, GROUND - p.h * 1.4, 0, GROUND);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(1, c);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.ellipse(p.x, GROUND, p.w * 0.8, p.h * 1.3 + Math.sin(t * 0.8) * 6, 0, Math.PI, TAU);
        ctx.fill();
        glow(ctx, p.x, GROUND - 6, 26, c);
        break;
      }
      case 'pillar':
      case 'holy': {
        const fade = Math.min(1, (p.life - t) / 8);
        const grow = Math.min(1, t / 5);
        const hgt = p.h * grow;
        const wob = p.w * (0.85 + Math.sin(t * 1.3) * 0.15);
        ctx.globalAlpha = fade;
        const gr = ctx.createLinearGradient(p.x - wob / 2, 0, p.x + wob / 2, 0);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.3, c);
        gr.addColorStop(0.5, '#fff');
        gr.addColorStop(0.7, c);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(p.x - wob / 2, GROUND - hgt, wob, hgt);
        glow(ctx, p.x, GROUND - 4, wob, c);
        break;
      }
      case 'lightning': {
        const fade = Math.min(1, (p.life - t) / 4);
        ctx.globalAlpha = fade;
        const pts = [];
        let x = p.x;
        for (let y = 0; y <= GROUND; y += 30) {
          pts.push([x, y]);
          x = p.x + (Math.random() - 0.5) * 30;
        }
        pts.push([p.x, GROUND]);
        for (const [lw, col] of [[16, c], [5, '#fff']]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.globalAlpha = fade * (lw > 10 ? 0.5 : 1);
          ctx.beginPath();
          pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          ctx.stroke();
        }
        ctx.globalAlpha = fade;
        glow(ctx, p.x, GROUND - 10, 60, c);
        break;
      }
      case 'beam': {
        const box = this.projBox(p);
        const fade = Math.min(1, (p.life - t) / 8);
        const hgt = p.h * (0.85 + Math.sin(t * 0.9) * 0.15) * Math.min(1, t / 4);
        ctx.globalAlpha = fade;
        const gr = ctx.createLinearGradient(0, p.y - hgt / 2, 0, p.y + hgt / 2);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.25, c);
        gr.addColorStop(0.5, '#fff');
        gr.addColorStop(0.75, c);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(box.x, p.y - hgt / 2, box.w, hgt);
        glow(ctx, p.x, p.y, hgt, c);
        break;
      }
    }
  }
});
