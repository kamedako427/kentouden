'use strict';

// ============================================================
//  ファイター
// ============================================================
class Fighter {
  constructor(def, palette, game) {
    this.def = def;
    this.game = game;
    this.name = def.name;
    this.pal = makePalette(palette ? { ...def.colors, ...def.alt } : def.colors);
    this.baseSize = def.size || 1;
    this.size = this.baseSize;
    this.thick = def.thick || 1;
    this.maxHp = Math.round(HP_BASE + (def.stats.hp - 100) * HP_SPREAD);
    // 通常技：共通技（COMMON）にキャラごとの通常技（normals.js）を重ねる
    const n = CHAR_NORMALS[def.id] || {};
    this.normals = {};
    for (const key of new Set([...Object.keys(COMMON), ...Object.keys(n)])) {
      this.normals[key] = { ...MOVE_DEFAULTS, ...COMMON[key], ...n[key], key };
    }
    // 必殺技はヒット・ガード時に超必殺技でキャンセル可能。派生技も同じ形に整える
    const norm = m => {
      // 必殺技は「超必殺技」と「別の必殺技（1コンボ1回）」にキャンセル可能。地上の打ち上げ必殺技はジャンプキャンセルも可
      const groundLauncher = (m.launch || 0) >= 6 && !m.air && !!m.box;
      const o = { ...MOVE_DEFAULTS, cancel: m.super ? null : { super: true, special: true, jump: groundLauncher }, ...m };
      if (m.follow) {
        o.follow = { ...m.follow };
        for (const k of FOLLOW_KEYS) if (m.follow[k]) o.follow[k] = norm(m.follow[k]);
      }
      // 大ボタンで出した時の強化版
      if (m.heavy) o.heavyMove = norm({ ...m, ...m.heavy, heavy: undefined });
      return o;
    };
    this.moves = [...def.moves, ...METER_MOVES].map(norm);
    // ロマンキャンセル（Y）はコマンドでは出ない
    // 同じコマンドなら、強さを指定した技（大K だけ など）を先に調べる
    this.cmdOrder = this.moves.filter(m => !m.rcKey).sort((a, b) => cmdPriority(a) - cmdPriority(b) || (b.btn || '').length - (a.btn || '').length);
    this.wins = 0;
    this.reset(STAGE_W / 2, 1);
  }

  reset(x, facing) {
    this.x = x;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.lagHp = this.maxHp;
    this.meter = 0;
    this.state = 'idle';
    this.stateTime = 0;
    this.animTime = 0;
    this.attack = null;
    this.attackMult = 1;
    this.hitCount = 0;
    this.hitCooldown = 0;
    this.rushStopped = false;
    this.airAttackUsed = false;
    this.stun = 0;
    this.combo = 0;
    this.knockdown = false;
    this.juggle = 0;
    this.connected = false;
    this.throwBack = false;
    this.throwing = null;
    this.throwRot = 0;
    this.throwImmune = 0;
    this.rollDir = 0;
    this.lastGuard = 'crouch';
    this.size = this.baseSize;
    // 技の効果で付く状態
    this.bound = 0;        // 泡で拘束
    this.curse = 0;        // 呪い（被ダメージ増加）
    this.doom = 0;         // 死の宣告（時間差ダメージ）
    this.doomDamage = 0;
    this.wallBounce = false;
    this.groundBounce = false;
    this.bounceStop = 0;   // バウンド直前の硬直
    this.bounceV = null;
    this.bounceUsed = { ground: false, wall: false }; // 1コンボにつき各1回まで
    this.bindImmune = 0;
    this.comboMoves = new Set();
    this.trapImmune = 0;
    this.crumpled = 0;      // よろけ・凍結の残り時間
    this.crumpleUsed = false;
    this.comboStart = 0;
    this.moverPopped = false;
    this.armorHits = 0;    // アーマー強化
    this.armorTimer = 0;
    this.speedTimer = 0;   // スピード強化
    this.speedMult = 1;
    this.transform = 0;    // 変身
    this.transformArmor = 0;
    this.lockTarget = null; // 多段技が最後まで当たるように固定する相手
    this.bounceCount = 0;   // 1コンボ中のバウンド回数
    this.bounceLaunch = false;
    this.carry = null;     // 相手を抱えて運ぶ技
    this.presses = [];     // 連打コマンド用
    this.rawX = 0;
    this.invuln = 0;
    this.counterStrike = 0;
    this.buff = null;
    this.alpha = 1;
    this.jumpDir = 0;
    // コマンド入力
    this.clock = 0;
    this.log = [{ dir: 5, frame: 0 }];
    this.curDir = 5;
    this.chargeBack = 0;
    this.chargeDown = 0;
    this.backMem = 0;
    this.backMemAt = -99;
    this.downMem = 0;
    this.downMemAt = -99;
    this.buffer = null;
    this.forceMove = null;
  }

  get onGround() {
    return this.y >= GROUND;
  }

  setState(s) {
    if (this.state !== s) {
      this.state = s;
      this.stateTime = 0;
    }
  }

  buffMult() {
    return this.buff ? this.buff.mult : 1;
  }

  hurtbox() {
    const s = this.size;
    const low = this.state === 'guard' || this.state === 'jumpsquat' ||
      (this.state === 'blockstun' && this.lastGuard === 'crouch') ||
      (this.state === 'attack' && (this.attack.crouch ||
        (this.attack.lowProfile && this.stateTime < this.attack.startup + this.attack.active)));
    const h = (low ? 108 : 150) * s;
    return { x: this.x - 24 * s, y: this.y - h, w: 48 * s, h };
  }

  hitbox(b) {
    const s = this.size;
    const x = this.facing === 1 ? this.x + b.x * s : this.x - (b.x + b.w) * s;
    return { x, y: this.y + b.y * s, w: b.w * s, h: b.h * s };
  }

  // ignoreJuggle: 空中追撃の回数制限を無視する（ゲージ技）
  isInvuln(ignoreJuggle = false) {
    if (this.invuln > 0 || this.state === 'down') return true;
    if (this.state === 'backstep' && this.stateTime <= 8) return true;
    if (this.state === 'thrown' || this.state === 'roll' || this.throwing) return true;
    if (!ignoreJuggle && this.state === 'hitstun' && !this.onGround && this.juggle >= JUGGLE_LIMIT) return true;
    if (this.state === 'attack') {
      const a = this.attack, t = this.stateTime;
      if (a.invuln && t >= a.invuln[0] && t <= a.invuln[1]) return true;
      if (a.teleport && t < a.startup + 6) return true;
    }
    return false;
  }

  // 現在のガード状態: 'stand' / 'crouch' / null
  guardType() {
    if (!this.onGround) return null;
    const d = this.curDir;
    if (this.state === 'guard') return 'crouch';
    if (this.state === 'blockstun') return d <= 3 ? 'crouch' : d === 4 ? 'stand' : this.lastGuard;
    if ((this.state === 'idle' || this.state === 'walk') && d === 4) return 'stand';
    return null;
  }

  isCountering() {
    if (this.state !== 'attack' || !this.attack.counter) return false;
    const a = this.attack, t = this.stateTime;
    return t >= a.startup && t < a.startup + a.active;
  }

  // ---------- コマンド入力 ----------
  // frozen: ヒットストップ中など、時間を進めずに入力だけ受け付ける
  recordInput(input, frozen = false) {
    if (!frozen) this.clock++;
    const x = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * this.facing;
    const y = input.up ? 1 : input.down ? -1 : 0;
    const d = 5 + x + y * 3;
    if (d !== this.log[this.log.length - 1].dir) {
      this.log.push({ dir: d, frame: this.clock });
      if (this.log.length > 24) this.log.shift();
    }
    this.curDir = d;

    const back = d === 1 || d === 4 || d === 7;
    const down = d === 1 || d === 2 || d === 3;
    if (back) {
      this.chargeBack++;
    } else {
      if (this.chargeBack > 0) { this.backMem = this.chargeBack; this.backMemAt = this.clock; }
      this.chargeBack = 0;
    }
    if (down) {
      this.chargeDown++;
    } else {
      if (this.chargeDown > 0) { this.downMem = this.chargeDown; this.downMemAt = this.clock; }
      this.chargeDown = 0;
    }

    this.rawX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    // ボタン：P / K / G（つかみ）。heavy は大パンチ・大キック
    const btn = input.grab ? 'G' : (input.punch || input.hpunch) ? 'P' : (input.kick || input.hkick) ? 'K' : null;
    const heavy = btn === 'P' ? !!input.hpunch && !input.punch : btn === 'K' ? !!input.hkick && !input.kick : false;
    if (btn) this.buffer = { btn, heavy, at: this.clock, dir: d };
    if (input.gauge) this.gaugeAt = this.clock; // R：ゲージ衝撃波
    if (btn === 'P' || btn === 'K') {
      this.presses.push({ btn, at: this.clock });
      if (this.presses.length > 10) this.presses.shift();
    }
    if (input.force != null) {
      this.forceMove = input.force;
      this.forceHeavy = !!input.forceHeavy;
    }
  }

  matchCommand(m) {
    if (m.cmd === 'mash') {
      return this.presses.filter(p => p.btn === m.btn && this.clock - p.at <= 24).length >= 4;
    }
    const charge = m.cmd.match(/^\[(\d)\](\d)$/);
    if (charge) {
      const to = charge[2] === '6' ? [3, 6, 9] : [7, 8, 9];
      if (!to.includes(this.curDir)) return false;
      const [mem, at] = charge[1] === '4' ? [this.backMem, this.backMemAt] : [this.downMem, this.downMemAt];
      return mem >= CHARGE_FRAMES && this.clock - at <= 12;
    }
    const seq = [...m.cmd].map(Number);
    return this.matchSeq(seq, seq.length >= 5 ? 34 : 20);
  }

  matchSeq(seq, win) {
    let idx = seq.length - 1;
    for (let i = this.log.length - 1; i >= 0; i--) {
      const endFrame = i === this.log.length - 1 ? this.clock : this.log[i + 1].frame;
      if (this.clock - endFrame > win) break;
      if (this.log[i].dir === seq[idx]) {
        idx--;
        if (idx < 0) return true;
      }
    }
    return false;
  }

  takeButton() {
    const b = this.buffer;
    this.buffer = null;
    if (!b || this.clock - b.at > 8) return null;
    return b;
  }

  canUse(m) {
    if ((m.cost || 0) > this.meter) return false;
    const spec = m.projectile || (m.projectiles && m.projectiles[0]);
    if (spec && this.game) {
      const mine = this.game.projectiles.filter(p => p.owner === this);
      if (PROJ_TRAVEL.has(spec.kind) && mine.some(p => p.travel)) return false;
      if (spec.limit && mine.some(p => p.kind === spec.kind)) return false;
    }
    if (m.buff && m.buff.transform && this.transform > 0) return false;
    return true;
  }

  tryForce() {
    const i = this.forceMove;
    this.forceMove = null;
    if (i == null) return false;
    const m = this.moves[i];
    if (m && (m.anyAir || !!m.air === !this.onGround) && this.canUse(m)) {
      this.startMove(this.forceHeavy && m.heavyMove ? m.heavyMove : m);
      return true;
    }
    return false;
  }

  tryButton() {
    const b = this.takeButton();
    if (!b) return false;
    const btn = b.btn;
    const air = !this.onGround;
    if (btn === 'G') {
      // ゲージ技（↓↘→ / ↓↙← + つかみ）。衝撃波は空中でも出せる
      const gm = this.cmdOrder.find(m => m.btn === 'G' && (m.anyAir || !!m.air === air) && this.canUse(m) && this.matchCommand(m));
      if (gm) {
        this.startMove(gm);
        return true;
      }
      if (air) {
        if (this.airAttackUsed || !this.normals.airH) return false;
        this.startMove(this.normals.airH);
        return true;
      }
      this.throwBack = b.dir === 4 || b.dir === 1 || b.dir === 7;
      this.startMove(this.normals.throw);
      return true;
    }
    for (const m of this.cmdOrder) {
      if (btnMatch(m.btn, b) && !!m.air === air && this.canUse(m) && this.matchCommand(m)) {
        this.startMove(b.heavy && m.heavyMove ? m.heavyMove : m);
        return true;
      }
    }
    if (air && this.airAttackUsed) return false;
    const key = this.state === 'dash'
      ? (btn === 'P' ? 'dashPunch' : 'slide')
      : this.selectNormal(btn, b.dir, b.heavy);
    this.startMove(this.normals[key]);
    return true;
  }

  // 方向キーとボタン（小・大）から通常技を選ぶ
  selectNormal(btn, d = this.curDir, heavy = false) {
    return pickNormal(btn, d, heavy, !this.onGround, this.normals);
  }

  canThrow() {
    const o = this.opp;
    return !!o && o.onGround && Math.abs(o.x - this.x) < 30 * (this.size + o.size) + 10 &&
      !['hitstun', 'blockstun', 'down', 'ko'].includes(o.state);
  }

  // 技のヒット・ガード後に、連続技・必殺技・超必殺技へキャンセル
  tryCancel() {
    const c = this.attack.cancel;
    const air = !this.onGround;
    const fromSpecial = !!(this.attack.name && !this.attack.super);
    const allowed = m => {
      if ((!m.anyAir && !!m.air !== air) || !this.canUse(m)) return false;
      if (m.meterMove && this.attack.meterMove) return false; // ゲージ技 → ゲージ技は不可（永久コンボ防止）
      if (m.super || m.meterMove) return !!(c.super || c.special);
      if (!c.special) return false;
      // 移動多段技から移動多段技へはキャンセルできない
      if (isMoverMove(this.attack) && isMoverMove(m)) return false;
      // 必殺技から必殺技へは1コンボ MAX_SPECIAL_CHAIN 回まで（同じ技はコンボ中に当たらない）
      if (fromSpecial) return this.spChain < MAX_SPECIAL_CHAIN;
      return true;
    };
    const start = m => {
      if (fromSpecial && !m.super && !m.meterMove) this.spChain++;
      this.startMove(m);
    };

    if (this.forceMove != null) {
      const m = this.moves[this.forceMove];
      if (m && allowed(m)) {
        this.forceMove = null;
        start(this.forceHeavy && m.heavyMove ? m.heavyMove : m);
        return true;
      }
    }
    // ジャンプキャンセル（打ち上げ技から空中コンボへ）
    const d = this.curDir;
    if (c.jump && this.onGround && d >= 7) {
      const jx = d === 9 ? 1 : d === 7 ? -1 : 0;
      this.attack = null;
      this.vy = -15.5 * LAUNCH_SCALE; // 打ち上げた相手と同じくらいの高さまで跳ぶ
      this.vx = jx * this.facing * this.def.stats.jumpX;
      this.airAttackUsed = false;
      this.setState('jump');
      SFX.jump();
      return true;
    }

    // ダッシュキャンセル：→→ で技を途中で止めてダッシュ（ジンなど）
    if (c.dash && this.onGround && d === 6 && this.matchSeq([6, 5, 6], 14)) {
      this.attack = null;
      this.setState('dash');
      return true;
    }

    const b = this.buffer;
    if (!b || this.clock - b.at > 8) return false;
    // つかみボタンはゲージ技のコマンドだけキャンセルで出せる（投げは出ない）
    if (b.btn === 'G') {
      const gm = this.cmdOrder.find(m => m.btn === 'G' && allowed(m) && this.matchCommand(m));
      if (gm) {
        this.buffer = null;
        start(gm);
        return true;
      }
      // 空中技から空中H へ
      const h = air && ((c.target && c.target.G) || (c.chain && c.chain.includes('airH') && 'airH'));
      if (!h || !this.normals[h]) return false;
      this.buffer = null;
      this.startMove(this.normals[h]);
      return true;
    }

    let next = this.cmdOrder.find(m => btnMatch(m.btn, b) && allowed(m) && this.matchCommand(m)) || null;
    if (next && b.heavy && next.heavyMove) next = next.heavyMove;
    // P → P → K などの決まった連続技は、レバーがニュートラルか前の時だけ（↓P や ←P は別の技になる）
    // 空中では ↑ が入っていても関係ない
    const neutral = b.dir === 5 || b.dir === 6 || (air && (b.dir === 8 || b.dir === 9));
    // target のキー：'P' / 'K' は小、'HP' / 'HK' は大
    const tk = b.heavy ? 'H' + b.btn : b.btn;
    if (!next && c.target && c.target[tk] && neutral) next = this.normals[c.target[tk]];
    if (!next && c.chain) {
      const k = this.selectNormal(b.btn, b.dir, b.heavy);
      if (c.chain.includes(k)) next = this.normals[k];
    }
    if (!next) return false;
    this.buffer = null;
    if (next.name) start(next);
    else this.startMove(next);
    return true;
  }

  // 技の途中からゲージ技（↓↘→ / ↓↙← + つかみ）を出す
  tryGaugeCancel() {
    const air = !this.onGround;
    // R ボタン：方向キーに関係なくゲージ衝撃波（移動しながら出せる）
    if (this.gaugeAt != null && this.clock - this.gaugeAt <= 6) {
      const rc = this.moves.find(m => m.rcKey && this.canUse(m));
      if (rc && !(this.state === 'attack' && this.attack && this.attack.meterMove)) {
        this.gaugeAt = null;
        this.startMove(rc);
        return true;
      }
    }
    const b = this.buffer;
    if (!b || b.btn !== 'G' || this.clock - b.at > 8) return false;
    const gm = this.cmdOrder.find(m => m.meterMove && (m.anyAir || !!m.air === air) && this.canUse(m) && this.matchCommand(m));
    if (!gm) return false;
    this.buffer = null;
    this.startMove(gm);
    return true;
  }

  startMove(m, mult = 1) {
    if (this.state !== 'attack' || m.meterMove) this.spChain = 0; // 何もしていない状態・ゲージ技から出したらリセット
    if (m.meterMove && this.game) this.game.addPopup('ゲージ -1/3', this.x, this.y - 200 * this.size, '#7affc8');
    if (!this.onGround) this.airAttackUsed = true;
    this.attack = m;
    this.attackSerial = (this.attackSerial || 0) + 1; // 同じ技を続けて出しても区別できるように
    this.state = 'attack';
    this.stateTime = 0;
    this.hitCount = 0;
    this.hitCooldown = 0;
    this.connected = false;
    this.armorUsed = false;
    this.carry = null;
    this.lockTarget = null;
    this.rushStopped = false;
    this.attackMult = mult;
    if (this.onGround && !m.keepMomentum) this.vx = 0; // keepMomentum: ステップの勢いを残す（ゲージ衝撃波）
    if (m.cost) this.meter -= m.cost;
    // 空中で出したゲージ衝撃波は、その場に浮いたまま（ロマンキャンセルのように）
    this.hovering = !!m.airHover && !this.onGround;
    if (this.hovering) {
      this.vy = 0;
      this.vx *= 0.5;
    }
    if (m.name) {
      // 使ったコマンドの入力履歴を消す（次のボタンで同じ技が暴発しないように）
      this.log = [{ dir: this.curDir, frame: this.clock }];
      this.backMem = 0;
      this.downMem = 0;
      this.presses = [];
      this.game.onSpecial(this, m);
    }
    SFX.swing();
  }

  // ---------- 更新 ----------
  update(input, opp) {
    this.opp = opp;
    this.stateTime++;
    this.animTime++;
    this.recordInput(input);
    if (this.invuln > 0) this.invuln--;
    if (this.counterStrike > 0) this.counterStrike--;
    if (this.throwImmune > 0) this.throwImmune--;
    if (this.buff && --this.buff.timer <= 0) this.buff = null;
    if (this.armorTimer > 0 && --this.armorTimer <= 0) this.armorHits = 0;
    if (this.speedTimer > 0) this.speedTimer--;
    if (this.curse > 0) this.curse--;
    if (this.bindImmune > 0) this.bindImmune--;
    if (this.trapImmune > 0) this.trapImmune--;
    if (this.crumpled > 0 && (--this.crumpled === 0 || this.state !== 'hitstun')) this.crumpled = 0;
    if (this.transform > 0 && --this.transform <= 0) this.size = this.baseSize;
    if (this.doom > 0 && --this.doom <= 0 && this.game) this.game.doomHit(this);
    this.alpha = 1;

    switch (this.state) {
      case 'blockstun':
        // プッシュガード：ガード硬直中につかみボタンで相手を押し返す
        if (this.buffer && this.buffer.btn === 'G' && this.clock - this.buffer.at <= 8 && this.meter >= 25 && this.game) {
          this.buffer = null;
          this.meter -= 25;
          this.game.pushGuard(this, opp);
          break;
        }
        // fallthrough
      case 'hitstun':
        this.stun--;
        if (this.stun <= 0 && this.onGround) {
          this.setState(this.state === 'blockstun' && input.down ? 'guard' : 'idle');
          this.throwImmune = 8;
        }
        break;

      case 'down':
        if (--this.stun <= 0) {
          this.facing = opp.x >= this.x ? 1 : -1;
          this.throwImmune = 14;
          // ← か → で受け身転がり（回避起き上がり）。
          // ↓ を含めて入れておく（↙ など）と転がらずに起き上がり、最初のフレームからしゃがみガードできる
          const raw = (input.right ? 1 : 0) - (input.left ? 1 : 0);
          if (raw && !input.down) {
            this.rollDir = raw;
            this.setState('roll');
          } else {
            this.setState(input.down ? 'guard' : 'idle');
            this.invuln = 12; // 起き上がり無敵（重ねられた攻撃をすかし、その後はガードが間に合う）
          }
          this.trapImmune = 60; // 起き上がり直後は設置技（渦・地雷）に当たらない（渦が出て消えるまでの時間より長く）
        }
        break;

      case 'roll':
        this.vx = this.rollDir * 7;
        if (this.stateTime >= 22) {
          this.vx = 0;
          this.facing = opp.x >= this.x ? 1 : -1;
          this.invuln = 4;
          this.trapImmune = 60;
          this.setState('idle');
        }
        break;

      case 'thrown':
        break;

      case 'landlag':
        // 着地の硬直
        if (--this.stun <= 0) this.setState('idle');
        break;

      case 'jumpsquat':
        if (this.tryForce() || this.tryButton()) break;
        if (this.stateTime >= 3) {
          const sp = this.speedTimer > 0 ? this.speedMult : 1;
          this.vy = -this.def.stats.jump * (sp > 1 ? 1.08 : 1);
          this.vx = this.jumpDir * this.def.stats.jumpX * sp;
          this.airAttackUsed = false;
          this.setState('jump');
          SFX.jump();
        }
        break;

      case 'attack':
        this.updateAttack(opp);
        break;

      case 'dash':
        this.vx = this.facing * Math.max(3, 9.5 - this.stateTime * 0.4);
        if (this.tryGaugeCancel()) break; // ステップしながらゲージ技
        if (this.stateTime > 4 && (this.tryForce() || this.tryButton())) break;
        if (this.stateTime >= 16) this.setState('idle');
        break;

      case 'backstep':
        this.vx = -this.facing * Math.max(1, 8 - this.stateTime * 0.4);
        if (this.stateTime > 2 && this.tryGaugeCancel()) break;
        if (this.stateTime >= 18) {
          this.vx = 0;
          this.setState('idle');
        }
        break;

      case 'ko':
      case 'win':
        break;

      default:
        if (this.counterStrike <= 0) this.handleControl(input, opp);
    }
    this.forceMove = null;

    // 物理
    if (this.state === 'thrown') return;
    if (this.bound > 0) {
      // 泡の中でふわふわ浮かぶ
      this.bound--;
      this.vy = 0;
      this.vx *= 0.8;
      this.y = Math.max(GROUND - 90, this.y - 1.5);
      this.x = clamp(this.x + this.vx, STAGE_MIN, STAGE_MAX);
      if (this.bound === 0) {
        this.knockdown = true;
        this.bindImmune = BIND_IMMUNE;
      }
      return;
    }
    if (this.bounceStop > 0) {
      // 壁・地面に叩きつけられた瞬間、一瞬止まってから跳ね返る
      this.vx = 0;
      this.vy = 0;
      if (--this.bounceStop === 0 && this.bounceV) {
        this.vx = this.bounceV.vx;
        this.vy = this.bounceV.vy;
        this.bounceV = null;
      }
      return;
    }
    if (this.hovering) {
      if (this.state === 'attack') this.vy = -GRAVITY; // 浮いている間は落ちない
      else this.hovering = false;
    }
    if (!this.onGround || this.vy < 0) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND) {
        this.y = GROUND;
        this.vy = 0;
        this.land();
      }
    }
    this.x = clamp(this.x + this.vx, STAGE_MIN, STAGE_MAX);
    if (this.wallBounce && this.state === 'hitstun' && (this.x <= STAGE_MIN || this.x >= STAGE_MAX)) {
      this.wallBounce = false;
      this.startBounce(this.x <= STAGE_MIN ? 6 : -6, -12, 'WALL BOUNCE!');
    }

    if (this.onGround && ['hitstun', 'blockstun', 'ko', 'attack', 'win', 'down', 'jumpsquat', 'landlag'].includes(this.state)) {
      // ステップの勢いを残す技（ゲージ衝撃波）は滑るように止まる
      this.vx *= this.state === 'attack' && this.attack && this.attack.keepMomentum ? 0.94 : 0.82;
    }

    if (this.lagHp > this.hp && this.state !== 'hitstun') {
      this.lagHp = Math.max(this.hp, this.lagHp - 0.7);
    }
  }

  handleControl(input, opp) {
    if (this.onGround) {
      this.facing = opp.x >= this.x ? 1 : -1;
      if (this.tryGaugeCancel() || this.tryForce() || this.tryButton()) return;

      if (input.down) {
        this.vx = 0;
        this.setState('guard');
        return;
      }
      const last = this.log[this.log.length - 1];
      if (last.frame === this.clock && (last.dir === 6 || last.dir === 4) && this.matchSeq([last.dir, 5, last.dir], 14)) {
        this.setState(last.dir === 6 ? 'dash' : 'backstep');
        if (this.game) this.game.spawnDust(this.x);
        return;
      }

      const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (input.up) {
        this.jumpDir = move;
        this.vx = 0;
        this.setState('jumpsquat');
        return;
      }
      const st = this.def.stats;
      if (move) {
        const sp = this.speedTimer > 0 ? this.speedMult : 1;
        this.vx = move * (move === this.facing ? st.walk : st.back) * sp;
        this.setState('walk');
      } else {
        this.vx = 0;
        this.setState('idle');
      }
    } else if (this.state === 'jump') {
      if (!this.tryGaugeCancel() && !this.tryForce()) this.tryButton();
    }
  }

  updateAttack(opp) {
    const a = this.attack;
    const t = this.stateTime;
    const end = a.startup + a.active;
    if (this.throwing) {
      this.updateThrow();
      return;
    }
    // 派生技（追加入力で次の技へ）
    const fl = a.follow;
    const b = this.buffer;
    const fm = fl && b && (fl[(b.heavy ? 'H' : 'L') + b.btn] || fl[b.btn]);
    if (fm && this.clock - b.at <= 8 && t >= (fl.from ?? a.startup) &&
        t <= (fl.to ?? end + a.recovery) && (!fl.needHit || this.connected)) {
      this.buffer = null;
      this.startMove(fm);
      return;
    }
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (a.hop && t === 1) {
      this.vy = a.hop.vy;
      this.vx = a.hop.vx * this.facing;
    }
    if (t >= a.startup && t < end) {
      if (a.steer) this.vx = this.rawX * a.steer;
      if (a.heal) this.hp = Math.min(this.maxHp, this.hp + a.heal / a.active);
      if (a.meterGain) this.meter = Math.min(METER_MAX, this.meter + a.meterGain / a.active);
    }
    // 相手を抱えて運ぶ
    if (this.carry) {
      const d = this.carry;
      if (this.hitCount >= a.hits || t >= end || d.state !== 'hitstun') {
        this.carry = null;
      } else {
        d.x = clamp(this.x + this.facing * 42 * this.size, STAGE_MIN, STAGE_MAX);
        d.y = Math.min(GROUND, this.y - 10);
        d.vx = 0;
        d.vy = 0;
        d.stun = Math.max(d.stun, 12);
      }
    }
    if (this.hovering && t >= end + 8) {
      this.endAttack();
      return;
    }
    // ゲージ技は後隙・空振り関係なく、いつでも出せる（ゲージ技の後隙からは出せない）
    if (!a.meterMove && this.tryGaugeCancel()) return;
    if (this.connected && a.cancel && t <= end + 10 && this.tryCancel()) return;
    if (a.step && t < a.startup) this.vx = a.step * this.facing;
    if (t === a.startup) this.activate(a, opp);
    if (t >= a.startup && t < end && a.move) {
      if (a.move.vx != null && !this.rushStopped) this.vx = a.move.vx * this.facing;
      if (a.move.sustainY) this.vy = a.move.vy;
    }
    // 移動しながら当てる技は、攻撃が終わったらその場で止まる（勢いで相手の裏に回り込まないように）
    if (t === end && a.move && a.move.vx != null && this.onGround) this.vx = 0;
    if (a.teleport) this.alpha = t < a.startup ? 1 - t / a.startup : Math.min(1, (t - a.startup) / 6);
    if (t >= end + a.recovery) this.endAttack();
  }

  // 投げのモーション：つかむ → 持ち上げる → 投げる
  updateThrow() {
    const th = this.throwing;
    const d = th.target;
    const f = this.facing;
    const s = this.size;
    th.t++;
    d.facing = -f;
    if (th.t <= th.hold) {
      d.x = clamp(this.x + f * 46 * s, STAGE_MIN, STAGE_MAX);
      d.y = GROUND;
      d.throwRot = 0;
      // 投げ抜け
      if (th.techable && d.buffer && d.buffer.btn === 'G' && d.clock - d.buffer.at <= 10) {
        d.buffer = null;
        this.game.techThrow(this, d);
      }
      return;
    }
    const p = Math.min(1, (th.t - th.hold) / th.swing);
    if (th.style === 'pile') {
      // 相手を逆さに担いで跳び上がり、脳天から叩きつける
      this.y = GROUND - Math.sin(p * Math.PI) * (th.big ? 200 : 140) * s;
      this.vy = 0;
      d.x = clamp(this.x + f * 6 * s, STAGE_MIN, STAGE_MAX);
      d.y = this.y - 125 * s;
      d.throwRot = Math.PI;
      if (p >= 1) {
        this.y = GROUND;
        this.game.releaseThrow(this, d, th);
      }
      return;
    }
    if (th.style === 'slam') {
      // 空中で捕まえて、着地と同時に叩きつける
      d.x = clamp(this.x + f * 30 * s, STAGE_MIN, STAGE_MAX);
      d.y = Math.min(GROUND, this.y - 40 * s);
      d.throwRot = Math.PI * 0.5;
      if (this.onGround && th.t > th.hold + 2) this.game.releaseThrow(this, d, th);
      return;
    }
    let ang, fx;
    if (th.back) {
      // 前 → 頭上 → 後ろへ
      ang = p * Math.PI;
      fx = Math.cos(ang) * 60;
    } else {
      // 持ち上げてから前へ叩きつける
      ang = (p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5) * Math.PI * 0.55;
      fx = Math.cos(ang) * 50 + (p > 0.5 ? (p - 0.5) * 90 : 0);
    }
    d.x = clamp(this.x + f * fx * s, STAGE_MIN, STAGE_MAX);
    d.y = GROUND - Math.sin(ang) * (th.big ? 150 : 115) * s;
    d.throwRot = p * Math.PI * (th.back ? 1.1 : 0.6);
    if (p >= 1) this.game.releaseThrow(this, d, th);
  }

  activate(a, opp) {
    const g = this.game;
    if (a.fx && g) g.areaBurst(this, a);
    if (a.move && a.move.vy && !a.move.sustainY) this.vy = a.move.vy;
    if (a.projectile || a.projectiles) g.spawnProjectiles(this, a);
    if (a.teleport) {
      g.spawnSmoke(this.x, this.y - 70 * this.size, this.pal.aura);
      if (a.teleport === 'above') {
        // 相手の真上に現れて落下攻撃
        this.x = clamp(opp.x, STAGE_MIN, STAGE_MAX);
        this.y = GROUND - 230;
        this.vy = 2;
      } else {
        const side = Math.sign(opp.x - this.x) || this.facing;
        let nx = opp.x + side * 80;
        if (nx < STAGE_MIN + 10 || nx > STAGE_MAX - 10) nx = opp.x - side * 80;
        this.x = clamp(nx, STAGE_MIN, STAGE_MAX);
        this.y = GROUND;
        this.vy = 0;
        this.facing = opp.x >= this.x ? 1 : -1;
      }
      g.spawnSmoke(this.x, this.y - 70 * this.size, this.pal.aura);
      SFX.teleport();
    }
    if (a.buff) {
      const bf = a.buff;
      let label = 'POWER UP!';
      if (bf.armor) {
        this.armorHits = bf.armor;
        this.armorTimer = bf.frames;
        label = 'ARMOR UP!';
      } else if (bf.speed) {
        this.speedTimer = bf.frames;
        this.speedMult = bf.speed;
        label = 'SPEED UP!';
      } else if (bf.transform) {
        this.transform = bf.frames;
        this.transformArmor = bf.armorHits || 4;
        this.buff = { mult: bf.mult, timer: bf.frames };
        this.size = this.baseSize * bf.grow;
        label = '鬼神化!';
        g.shake = Math.max(g.shake, 12);
      } else {
        this.buff = { mult: bf.mult, timer: bf.frames };
      }
      g.spawnRing(this.x, this.y - 80, this.pal.aura, 3);
      g.addPopup(label, this.x, this.y - 180 * this.size, this.pal.aura);
      SFX.power();
    }
    if (a.heal) g.addPopup('回復', this.x, this.y - 180 * this.size, '#7aff8a');
  }

  endAttack() {
    const a = this.attack;
    this.attack = null;
    if (this.onGround) {
      this.setState('idle');
    } else {
      // 空中のゲージ衝撃波の後は、もう一度空中技を出せる
      this.airAttackUsed = !(a && (a.resetAir || this.hovering));
      this.hovering = false;
      this.setState('jump');
    }
  }

  land() {
    this.moverPopped = false;
    if (this.state === 'thrown') return;
    if (this.groundBounce && this.state === 'hitstun') {
      // 地面に叩きつけられて高く跳ね上がる
      this.groundBounce = false;
      this.y = GROUND - 1;
      this.startBounce(this.vx * 0.2, GROUND_BOUNCE_VY, 'BOUND!');
      return;
    }
    this.juggle = 0;
    this.wallBounce = false;
    if (this.state === 'jump') {
      this.setState('idle');
    } else if (this.state === 'attack' && (this.attack.air || this.attack.endOnLand)) {
      const lag = this.attack.landRecovery || 0;
      if (this.attack.landWave && this.game) {
        this.game.spawnProjectiles(this, { projectiles: this.attack.landWave });
        this.game.shake = Math.max(this.game.shake, 8);
        this.game.spawnDust(this.x);
      }
      this.attack = null;
      this.vx = 0;
      this.setState(lag ? 'landlag' : 'idle');
      this.stun = lag;
    } else if (this.state === 'hitstun' && this.knockdown) {
      this.knockdown = false;
      this.setState('down');
      this.stun = 40;
      this.vx *= 0.3;
      if (this.game) this.game.spawnDust(this.x);
    } else if (this.state === 'ko') {
      this.vx *= 0.4;
      if (this.game) this.game.spawnDust(this.x);
    }
  }

  // バウンド：一瞬止まってから指定の速度で跳ね返る
  startBounce(vx, vy, label) {
    vy *= kbScale((this.combo || 1) - (this.comboBase || 0)); // コンボが長いほどバウンドも低くなる
    this.groundBounce = false;
    this.wallBounce = false;
    this.bounceCount++;
    this.bounceLaunch = this.bounceCount === 1; // 1回目のバウンドの後だけ、次の技で吹っ飛ぶ
    this.bounceStop = BOUNCE_STOP;
    this.bounceV = { vx, vy };
    this.vx = 0;
    this.vy = 0;
    this.knockdown = true;
    this.stun = Math.max(this.stun, BOUNCE_STOP + 20);
    if (this.game) {
      this.game.addPopup(label, this.x, this.y - 160, '#ffd84a');
      this.game.spawnDust(this.x);
      this.game.spawnSparks(this.x, this.y - 70, '#fff', 10);
      this.game.shake = Math.max(this.game.shake, 10);
      SFX.burst();
    }
  }
}
