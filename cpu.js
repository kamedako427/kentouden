'use strict';

// ============================================================
//  CPU
// ============================================================
class CPU {
  constructor() {
    this.reset();
  }

  reset() {
    this.action = null;
    this.combo = null;
    this.wait = 40;
    this.guard = 0;
    this.guardKind = 'crouch';
    this.threat = false;
    this.antiAir = false;
    this.seenAttack = null;
    this.techTried = false;
    this.pushTried = false;
    this.punished = null;
    this.pendingCombo = 0;
    this.juggleWait = 0;
    this.lastJuggle = null;
    this.lastEnder = null;
    this.recentCombos = this.recentCombos || [];
  }

  // 役割に合う技を探す（複数あればランダム）
  find(me, role) {
    const list = [];
    me.moves.forEach((m, i) => {
      if (m.ai === role && !!m.air === !me.onGround && me.canUse(m)) list.push(i);
    });
    return list.length ? list[Math.floor(Math.random() * list.length)] : -1;
  }

  // 相手の攻撃の段に合わせたガード（一定確率で読み違える）
  pickGuard(level) {
    const right = Math.random() < 0.8;
    if (level === 'high') return right ? 'stand' : 'crouch';
    if (level === 'low') return right ? 'crouch' : 'stand';
    return Math.random() < 0.6 ? 'crouch' : 'stand';
  }

  getInput(me, opp, game) {
    const inp = { ...NO_INPUT };
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const fwd = dx > 0 ? 'right' : 'left';
    const back = dx > 0 ? 'left' : 'right';
    const free = ['idle', 'walk', 'guard'].includes(me.state);
    const nearWall = me.x < STAGE_MIN + 90 || me.x > STAGE_MAX - 90;

    // 投げ抜け
    if (me.state === 'thrown') {
      if (!this.techTried) {
        this.techTried = true;
        if (Math.random() < 0.5) inp.grab = true;
      }
      return inp;
    }
    this.techTried = false;

    // プッシュガード（画面端だと使いやすい）
    if (me.state === 'blockstun') {
      if (!this.pushTried) {
        this.pushTried = true;
        if (me.meter >= 25 && Math.random() < (nearWall ? 0.35 : 0.1)) {
          inp.grab = true;
          return inp;
        }
      }
    } else {
      this.pushTried = false;
    }

    // 受け身転がり（端なら相手側へ転がって脱出）
    if (me.state === 'down' && me.stun <= 2) {
      const r = Math.random();
      if (nearWall ? r < 0.7 : r < 0.25) {
        inp[nearWall ? fwd : (r < 0.12 ? fwd : back)] = true;
      } else if (Math.random() < 0.6) {
        // 起き上がりにしゃがみガードを仕込む
        inp[back] = true;
        inp.down = true;
      }
      return inp;
    }

    // 派生技の追加入力・操作できる技
    if (me.state === 'attack' && me.attack) {
      const a = me.attack;
      if (a.steer) {
        inp[fwd] = true;
        return inp;
      }
      const fl = a.follow;
      if (fl && (!fl.needHit || me.connected) && me.stateTime >= (fl.from ?? a.startup) && Math.random() < 0.2) {
        const opts = FOLLOW_KEYS.filter(k => fl[k]);
        const k = opts[Math.floor(Math.random() * opts.length)];
        inp[k === 'HP' ? 'hpunch' : k === 'HK' ? 'hkick' : k.endsWith('P') ? 'punch' : 'kick'] = true;
        return inp;
      }
    }

    // 相手の攻撃・飛び道具への反応
    const oa = opp.state === 'attack' ? opp.attack : null;
    const oppStriking = oa && oa.box && opp.stateTime <= oa.startup + oa.active && dist < 180;
    const incoming = game.projectiles.some(p =>
      p.owner === opp && p.travel && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 230);
    const threat = oppStriking || incoming;
    if (threat && !this.threat && free && !this.combo) {
      const r = Math.random();
      const ctr = [this.find(me, 'counter'), this.find(me, 'evade')].find(i => i >= 0) ?? -1;
      const tele = this.find(me, 'tele');
      if (ctr >= 0 && r < 0.3) {
        this.action = { type: 'move', idx: ctr, t: 1 };
      } else if (incoming && r < 0.45) {
        this.action = tele >= 0 && r < 0.25 ? { type: 'move', idx: tele, t: 1 } : { type: 'jumpFwd', t: 4 };
      } else if (r < 0.9) {
        this.guard = 14 + Math.floor(Math.random() * 12);
        this.guardKind = this.pickGuard(oa ? oa.level : 'mid');
      }
    }
    this.threat = threat;

    // ガード中に相手が新しい技を出したら、段を見てガードを切り替える
    if (oa && oa !== this.seenAttack) {
      this.seenAttack = oa;
      if (this.guard > 0 || me.state === 'blockstun') {
        this.guardKind = this.pickGuard(oa.level);
        this.guard = Math.max(this.guard, 12);
      }
    }
    if (!oa) this.seenAttack = null;

    // 対空
    const oppAir = (!opp.onGround && opp.state === 'jump') || (oa && !opp.onGround && oa.air);
    if (oppAir && !this.antiAir && free && dist < 150 && opp.vy > -3) {
      this.antiAir = true;
      const r = Math.random();
      const anti = this.find(me, 'anti');
      if (anti >= 0 && r < 0.75) {
        this.action = { type: 'move', idx: anti, t: 1 };
        this.guard = 0;
      } else if (r < 0.92) {
        this.guard = 20;
        this.guardKind = 'stand';
      }
    }
    if (opp.onGround) this.antiAir = false;

    if (this.guard > 0 && !(this.action && this.action.type === 'move')) {
      this.guard--;
      if (this.guardKind === 'stand') inp[back] = true;
      else inp.down = true;
      return inp;
    }

    if (['hitstun', 'blockstun', 'ko', 'win', 'down', 'roll', 'landlag'].includes(me.state)) {
      this.combo = null;
      return inp;
    }

    if (this.combo) return this.runCombo(me, opp, inp, fwd, back);

    // 浮いた相手・バウンド中の相手への追撃（バウンド → 吹っ飛ばし → 2回目のバウンド → 追撃）
    if (free && opp.state === 'hitstun' && (!opp.onGround || opp.bounceStop > 0) && opp.juggle < JUGGLE_LIMIT) {
      return this.juggle(me, opp, inp, fwd, back, dist);
    }

    // 相手の技の隙に反撃（確定反撃）
    if (free && oa && oa !== this.punished && opp.stateTime > oa.startup + oa.active && dist < 140 && opp.onGround) {
      this.punished = oa;
      if (Math.random() < 0.85) {
        this.combo = this.buildCombo(me);
        this.action = null;
        return this.runCombo(me, opp, inp, fwd, back);
      }
    }

    // 空中
    if (me.state === 'jump') {
      const airMove = this.find(me, 'air');
      if (airMove >= 0 && dist > 60 && dist < 260 && me.vy > -4 && Math.random() < 0.08) inp.force = airMove;
      else if (me.vy > 0 && dist < 130 && Math.random() < 0.3) inp[Math.random() < 0.5 ? 'kick' : 'punch'] = true;
      return inp;
    }

    if (this.action) {
      const a = this.action;
      switch (a.type) {
        case 'walk': inp[fwd] = true; break;
        case 'back': inp[back] = true; break;
        case 'jumpFwd': inp.up = true; inp[fwd] = true; break;
        case 'punch': inp.punch = true; break;
        case 'kick': inp.kick = true; break;
        case 'guard': inp.down = true; break;
        case 'move': inp.force = a.idx; inp.forceHeavy = Math.random() < 0.5; break;
        case 'throw': inp.grab = true; break;
        case 'overhead': inp[fwd] = true; inp.kick = true; break;
        case 'sweep': inp.down = true; inp.kick = true; break;
        case 'dash': if (a.t !== 2) inp[fwd] = true; break;
      }
      if (a.type === 'jumpFwd' && me.state === 'jumpsquat') a.t = 0;
      a.t--;
      if (a.t <= 0 || (a.type === 'walk' && dist < a.stopAt)) {
        this.action = null;
        this.wait = 2 + Math.floor(Math.random() * 8);
        if (a.then === 'combo') {
          this.pendingCombo = 30;
          this.wait = 0;
        }
      }
      return inp;
    }

    // ダッシュ後、近づけたらそのままコンボ
    if (this.pendingCombo > 0) {
      this.pendingCombo--;
      if (dist < 120 && free) {
        this.pendingCombo = 0;
        this.combo = this.buildCombo(me);
        return this.runCombo(me, opp, inp, fwd, back);
      }
      if (me.state === 'dash') return inp;
    }
    if (this.wait > 0) {
      this.wait--;
      return inp;
    }
    this.choose(me, opp, dist);
    return inp;
  }

  // 浮いた相手・バウンド中の相手への追撃。このコンボでまだ使っていない技で拾い、最後は必殺技で締める
  juggle(me, opp, inp, fwd, back, dist) {
    const h = GROUND - opp.y;
    const reach = 70 + 25 * me.size;
    // 落ちてくる場所へ寄る
    if (dist > reach + 30) {
      inp[fwd] = true;
      return inp;
    }
    if (this.juggleWait > 0) {
      this.juggleWait--;
      return inp;
    }
    const falling = opp.vy >= 0 || opp.bounceStop > 0;
    if (!(h < 160 && falling)) return inp;

    const used = new Set(opp.comboMoves || []);
    const sp = this.comboParts(me, used);
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const free = key => !used.has(key);

    const opts = {};
    if (sp.air.length) {
      const a = pick(sp.air);
      opts.lift = [{ force: a }, ...this.chainSteps(me, sp, a, new Set([...used, moveKeyOf(me.moves[a])]))];
    }
    if (sp.multi.length && h < 110) {
      const a = pick(sp.multi);
      opts.multi = [{ force: a }, ...this.chainSteps(me, sp, a, new Set([...used, moveKeyOf(me.moves[a])]))];
    }
    if (free('uppercut')) opts.upper = [{ btn: 'P', dir: 'back' }, ...this.finisherSteps(me, sp, used)];
    if (h > 50 && opp.bounceStop === 0 && free('airPunch') && free('airKick')) {
      opts.air = [{ hop: true }, ...this.airString(me, false), ...sp.airEnd];
    }
    // 低く浮いている相手は、しゃがみキックですくい上げてから移動多段で運ぶ
    if (h < 60 && opp.vy > 0 && sp.movers.length && free('sweep')) {
      const m = pick(sp.movers);
      opts.scoop = [{ btn: 'K', dir: 'down' }, { force: m }, ...this.finisherSteps(me, sp, new Set([...used, moveKeyOf(me.moves[m])]))];
    }
    let keys = Object.keys(opts);
    if (!keys.length) return inp;
    if (keys.length > 1) keys = keys.filter(k => k !== this.lastJuggle);
    // 必殺技から入る拾い方（lift / multi）を優先して、最後を必殺技で締めやすくする
    const weighted = keys.flatMap(k => (k === 'lift' ? [k, k, k] : k === 'multi' ? [k, k] : [k]));
    const k = pick(weighted);
    this.lastJuggle = k;
    this.juggleWait = 6;
    this.combo = { steps: opts[k].map(st => ({ ...st })), i: 0, pressedFor: null, age: 0 };
    return this.runCombo(me, opp, inp, fwd, back);
  }

  // コンボ：前の技が当たったら（ガードされても）次の技を入力する
  // ステップ: {btn, dir} 通常技 / {force} 必殺技 / {jump} ジャンプキャンセル / {hop} その場からジャンプ / {air} 空中通常技
  runCombo(me, opp, inp, fwd, back) {
    const c = this.combo;
    c.age++;
    // ジャンプキャンセルの↑は数フレーム押し続ける（ヒットストップ中に押して離すと出ないため）
    if (c.holdUp > 0 && !me.onGround && me.state !== 'attack') c.holdUp = 0; // 跳んだら離す
    if (c.holdUp > 0) {
      c.holdUp--;
      inp.up = true;
      inp[fwd] = true;
    }
    // 決まった順番の入力（ダッシュキャンセルの → ・ →）
    if (c.seq && c.seq.length) {
      const k = c.seq.shift();
      if (k) inp[k] = true;
      return inp;
    }
    // しゃがみ攻撃が続く間は↓を押しっぱなしにする（離すと ↓↓+P のコマンド技が暴発するため）
    if (c.holdDown) inp.down = true;
    const prev = c.steps[c.i - 1];
    const free = ['idle', 'walk', 'guard'].includes(me.state);
    const dist = Math.abs(opp.x - me.x);
    const afterJump = prev && (prev.jump || prev.hop);

    let ready;
    if (c.i === 0) {
      ready = free;
    } else if (prev && prev.dash) {
      ready = me.state === 'dash' && me.stateTime >= 5;
    } else if (afterJump) {
      ready = me.state === 'jump' && dist < 110 && Math.abs(me.y - opp.y) < 80;
    } else {
      // 多段技は全段当て終わってから次へ（途中でキャンセルすると運ぶ距離が短くなる）
      ready = me.state === 'attack' && me.attackSerial !== c.pressedFor && me.connected &&
        me.hitCount >= (me.attack.hits || 1);
    }

    // 途切れたら終了（空振り・ガードされて終わった等）
    const waitingAir = prev && (afterJump || prev.air || (prev.force != null && !me.onGround));
    const broken = c.i > 0 && !ready && (
      (free && !(prev && prev.hop)) ||
      (me.state === 'jump' && !waitingAir) ||
      c.age > 150
    );
    if (broken) {
      this.combo = null;
      this.wait = 3 + Math.floor(Math.random() * 6);
      return inp;
    }
    if (!ready) return inp;

    const step = c.steps[c.i];
    if (step.force != null) {
      // 予定の必殺技が今の位置では届かないなら、届く必殺技に差し替える（必殺技で締めるため）
      const used = opp.comboMoves || new Set();
      const planned = me.moves[step.force];
      const ok = !used.has(moveKeyOf(planned)) && this.canReach(me, opp, planned);
      inp.force = ok ? step.force : this.reachableSpecial(me, opp, step.force);
      inp.forceHeavy = Math.random() < 0.5;
      // 自分が空中にいる時のゲージ技は衝撃波（空中でも出せる）
      if (planned && planned.meterMove && !planned.anyAir && !me.onGround) inp.force = me.moves.findIndex(m => m.meterMove && m.anyAir);
      // 地上の相手には衝撃波が当たらないので打ち上げに
      if (planned && planned.airOnly && opp.onGround && me.onGround) inp.force = me.moves.findIndex(m => m.meterMove && !m.airOnly);
    } else if (step.dash) {
      inp[fwd] = true;
      c.seq = [null, fwd, fwd, fwd, fwd, fwd, fwd, fwd, fwd, fwd, fwd]; // ヒットストップ中も → を押し続ける
    } else if (step.jump || step.hop) {
      inp.up = true;
      inp[fwd] = true;
      if (step.jump) c.holdUp = 16; // 重い技はヒットストップが長いので長めに
    } else if (step.air) {
      inp[step.air === 'H' ? 'grab' : step.air === 'P' ? (step.heavy ? 'hpunch' : 'punch') : (step.heavy ? 'hkick' : 'kick')] = true;
      if (step.dir === 'down') inp.down = true;
    } else {
      inp[step.btn === 'P' ? (step.heavy ? 'hpunch' : 'punch') : (step.heavy ? 'hkick' : 'kick')] = true;
      inp.down = step.dir === 'down' || step.dir === 'downback' || step.dir === 'downfwd';
      if (step.dir === 'fwd' || step.dir === 'downfwd') inp[fwd] = true;
      if (step.dir === 'back' || step.dir === 'downback') inp[back] = true;
    }
    const nextStep = c.steps[c.i + 1];
    const downDir = st => !!st && (st.dir === 'down' || st.dir === 'downback' || st.dir === 'downfwd');
    c.holdDown = downDir(step) && downDir(nextStep);
    c.pressedFor = me.state === 'attack' ? me.attackSerial : null;
    c.i++;
    if (c.i >= c.steps.length) {
      this.combo = null;
      this.wait = 4 + Math.floor(Math.random() * 6);
    }
    return inp;
  }

  // 最近使ったコンボと同じ形にはしない
  buildCombo(me) {
    let best = null;
    for (let tries = 0; tries < 10; tries++) {
      const c = this.makeCombo(me);
      const sig = c.steps.map(st => JSON.stringify(st)).join('|');
      best = { c, sig };
      if (!this.recentCombos.includes(sig)) break;
    }
    this.recentCombos.push(best.sig);
    if (this.recentCombos.length > 6) this.recentCombos.shift();
    return best.c;
  }

  // 技が今の相手に届きそうか（攻撃判定・踏み込み・移動・上昇と、相手の位置・高さ・落下から見積もる）
  canReach(me, opp, m) {
    if (!m) return false;
    const dist = Math.abs(opp.x - me.x);
    const h = GROUND - opp.y;
    // 地上でのけぞっている相手は、のけぞりが解ける前に技が出ないと当たらない
    if (opp.onGround && opp.state === 'hitstun' && opp.bounceStop <= 0 && opp.stun + 2 < m.startup) return false;
    if (m.projectile || m.projectiles) return h < 110 && dist < 500;
    if (m.airOnly && opp.onGround) return false;
    if (!m.box) return false;
    const s = me.size;
    const fwd = (m.step || 0) * m.startup + (m.move && m.move.vx > 0 ? m.move.vx * Math.min(m.active, 16) : 0);
    const front = (m.box.x + m.box.w) * s + fwd;
    const back = m.box.x * s;
    const half = 24 * opp.size;
    if (dist - half > front || dist + half < back) return false;
    // 縦：技の判定の高さと、技が出る頃の相手の体の高さ
    const fall = opp.onGround || opp.bounceStop > 0 ? 0 : opp.vy * m.startup + 0.4 * m.startup * m.startup;
    const bottom = Math.max(0, h - fall);
    const top = bottom + 150 * opp.size;
    let boxTop = -m.box.y * s;
    const boxBottom = -(m.box.y + m.box.h) * s;
    if (m.move && m.move.vy < 0) boxTop += (m.move.vy * m.move.vy) / (2 * GRAVITY);
    return top > boxBottom && bottom < boxTop;
  }

  reachableSpecial(me, opp, fallback) {
    const list = me.moves.map((m, i) => i).filter(i => {
      const m = me.moves[i];
      if (opp.comboMoves && opp.comboMoves.has(moveKeyOf(m))) return false;
      return !m.air === me.onGround && !m.grab && !m.counter && !m.buff && !m.teleport && me.canUse(m) &&
        (m.super ? m.ai !== 'superGrab' : true) && this.canReach(me, opp, m);
    });
    if (!list.length) return fallback;
    // 多段の必殺技を優先、超必殺技は元の予定が超必殺技の時だけ
    const want = me.moves[fallback] && me.moves[fallback].super;
    const pool = list.filter(i => !!me.moves[i].super === !!want);
    const use = pool.length ? pool : list.filter(i => !me.moves[i].super);
    if (!use.length) return fallback;
    use.sort((a, b) => (me.moves[b].hits || 1) - (me.moves[a].hits || 1));
    return use[Math.floor(Math.random() * Math.min(2, use.length))];
  }

  // コンボに使える技の分類（used に入っている技＝このコンボで使用済みの技は除く）
  comboParts(me, used = new Set()) {
    const usable = pred => me.moves.map((m, i) => i).filter(i => {
      const m = me.moves[i];
      return !m.super && !m.meterMove && !m.air && !m.grab && !m.counter && me.canUse(m) && !used.has(moveKeyOf(m)) && pred(m);
    });
    const isLaunch = m => (m.launch || 0) >= 6 && !!m.box;
    const opp = me.opp;
    const nearWall = opp && (opp.x < STAGE_MIN + 220 || opp.x > STAGE_MAX - 220);
    const movers = usable(m => isMoverMove(m));
    const launch = usable(m => isLaunch(m) && !m.groundBounce && !m.wallBounce && !isMoverMove(m));
    // 空中の相手に当たる技（対空・打ち上げ用の技、上に飛び上がる技、高い所まで届く技）
    const airHit = m => m.ai === 'anti' || m.ai === 'launch' || (m.move && m.move.vy < 0) || (m.box && m.box.y <= -165);
    const air = usable(m => !!m.box && airHit(m) && !isMoverMove(m));
    // 壁バウンド・地面バウンドの技は相手が大きく飛ぶので、途中ではなく締め（bounce）だけに使う
    const multi = usable(m => !!m.box && (m.hits || 1) >= 2 && !isLaunch(m) && !m.teleport && !isMoverMove(m) && !m.wallBounce && !m.groundBounce);
    const melee = usable(m => !!m.box && !m.teleport && !isMoverMove(m) && !m.wallBounce && !m.groundBounce);
    const bounce = usable(m => m.groundBounce || (m.wallBounce && nearWall));
    const proj = usable(m => !!m.projectile && PROJ_TRAVEL.has(m.projectile.kind));
    const airSpIdx = me.moves.findIndex(m => m.air && !m.super && m.box && !used.has(moveKeyOf(m)));
    const rushSuper = me.moves.findIndex(m => m.super && m.ai === 'superRush' && me.canUse(m));
    const superIdx = rushSuper >= 0 ? rushSuper : me.moves.findIndex(m => m.super && !m.grab && !m.buff && me.canUse(m));
    return {
      movers, launch, air, multi, melee, bounce, proj, superIdx,
      airEnd: airSpIdx >= 0 ? [{ force: airSpIdx }] : [],
    };
  }

  // 必殺技 → 必殺技キャンセル（最大 MAX_SPECIAL_CHAIN 回、同じ技は使わない）→ ゲージがあれば超必殺技
  // 直前の技が打ち上げ技なら、次は空中の相手に当たる技だけ
  chainSteps(me, sp, after, used) {
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const steps = [];
    const usedNow = new Set(used || []);
    let prev = after;
    for (let n = 0; n < MAX_SPECIAL_CHAIN; n++) {
      const pm = prev != null ? me.moves[prev] : null;
      const afterLaunch = pm && (pm.launch || 0) >= 6;
      const pool = (afterLaunch ? sp.air : [...sp.launch, ...sp.multi, ...sp.bounce, ...sp.melee])
        .filter(i => !usedNow.has(moveKeyOf(me.moves[i])) && !(isMoverMove(pm) && isMoverMove(me.moves[i])));
      if (!pool.length || Math.random() > 0.95) break;
      const nx = pick(pool);
      steps.push({ force: nx });
      usedNow.add(moveKeyOf(me.moves[nx]));
      prev = nx;
    }
    if (sp.superIdx >= 0 && me.meter >= 100 && Math.random() < 0.6) steps.push({ force: sp.superIdx });
    else if (me.meter >= 50 && Math.random() < 0.45) {
      // ゲージ技で追撃して吹っ飛び率をリセット（その後は juggle() が拾い直す）
      const g = me.moves.map((m, i) => i).filter(i => me.moves[i].meterMove && !usedNow.has(moveKeyOf(me.moves[i])));
      if (g.length) steps.push({ force: pick(g) });
    }
    return steps;
  }

  // コンボの締め（必ず必殺技で終わる）
  finisherSteps(me, sp, used = new Set()) {
    const pick = list => list[Math.floor(Math.random() * list.length)];
    // 近接の必殺技がないキャラは飛び道具で締める（近接があっても時々は飛び道具）
    let first = [...sp.multi, ...sp.multi, ...sp.melee, ...sp.launch].filter(i => !used.has(moveKeyOf(me.moves[i])));
    if (!first.length || (sp.proj.length && Math.random() < 0.2)) first = [...first, ...sp.proj, ...sp.proj];
    if (!first.length) return [];
    const a = pick(first);
    return [{ force: a }, ...this.chainSteps(me, sp, a, new Set([...used, moveKeyOf(me.moves[a])]))];
  }

  // そのキャラの通常技でつながる並び（P / K / ↓P / ↓K / ←P / →P の組み合わせ）を全部調べる
  starters(me) {
    if (me.cpuStarters) return me.cpuStarters;
    // [ボタン, 方向, 大か]
    const TOK = {
      P: ['P', 5], K: ['K', 5], dP: ['P', 2], dK: ['K', 2], bP: ['P', 4], fP: ['P', 6],
      HP: ['P', 5, true], HK: ['K', 5, true], dHP: ['P', 2, true], dHK: ['K', 2, true],
      // コマンド通常技（↙ ↘ ← → ＋ 大P / 大K）
      d1HP: ['P', 1, true], d1HK: ['K', 1, true], d3HP: ['P', 3, true], d3HK: ['K', 3, true],
      d4HP: ['P', 4, true], d4HK: ['K', 4, true], d6HP: ['P', 6, true], d6HK: ['K', 6, true],
    };
    const pick = (btn, d, heavy) => pickNormal(btn, d, heavy, false, me.normals);
    // 前の技から、そのボタン・方向で出る技（つながらなければ null）。fighter.tryCancel と同じ決まり
    const next = (prev, tok) => {
      const [btn, d, heavy] = TOK[tok];
      if (!prev) return pick(btn, d, heavy);
      const c = prev.cancel || {};
      const tk = heavy ? 'H' + btn : btn;
      if (c.target && c.target[tk] && (d === 5 || d === 6)) return c.target[tk];
      const k = pick(btn, d, heavy);
      return c.chain && c.chain.includes(k) ? k : null;
    };
    const launchStarters = [], groundStarters = [];
    const walk = (seq, keys) => {
      const last = keys.length ? me.normals[keys[keys.length - 1]] : null;
      if (last) {
        seq.lastKey = keys[keys.length - 1];
        const launcher = (last.launch || 0) >= 10 && last.cancel && last.cancel.jump;
        const airGrab = me.moves.some(m => m.grabStun && m.airGrab);
        if (launcher) launchStarters.push(seq);
        else if (last.cancel && last.cancel.special && (!last.launch || airGrab)) groundStarters.push(seq);
      }
      if (seq.length >= 5 || launchStarters.length + groundStarters.length > 600) return;
      // 壁・地面バウンドさせる技の後は通常技が届かないので、必殺技で締めるだけ
      if (last && (last.wallBounce || last.groundBounce)) return;
      for (const tok of Object.keys(TOK)) {
        if (tok === 'fP' && seq.length) continue; // →P は始動だけ
        // コマンド通常技はキャラが持っている時だけ（持っていなければ普通の技と同じなので調べない）
        if (tok[0] === 'd' && tok[1] >= '1' && tok[1] <= '9' && !me.normals[tok.slice(0, 2) + tok.slice(2).toLowerCase()]) continue;
        // ↓ → ニュートラル → ↓ と続くと ↓↓ + ボタンのコマンド技が暴発するので使わない
        const isDown = t => t[0] === 'd' && t[1] !== '4' && t[1] !== '6';
        if (isDown(tok) && seq.length >= 2 && !isDown(seq[seq.length - 1]) && isDown(seq[seq.length - 2])) continue;
        // ↓ の直後の ↘ ↙ ← → は 623 や 214 などのコマンドに化けるので使わない
        if (/^d[1346]/.test(tok) && seq.length && (isDown(seq[seq.length - 1]) || seq[seq.length - 1] === 'fP')) continue;
        const k = next(last, tok);
        if (!k || keys.includes(k) || k === 'overhead' || !me.normals[k]) continue;
        walk([...seq, tok], [...keys, k]);
      }
    };
    walk([], []);
    // 長すぎる並び（しゃがみパンチ・ジャブで数を稼ぐだけのもの）は控えめに
    const trim = list => list.filter(s => s.length <= 3 || !s.slice(0, -3).some(t => t === 'dP'));
    me.cpuStarters = { launchStarters: trim(launchStarters), groundStarters: trim(groundStarters) };
    return me.cpuStarters;
  }

  // そのキャラの空中技でつながる並び。dive=true なら急降下（↓K）で終わるもの
  airString(me, dive) {
    if (!me.cpuAir) {
      const TOK = { P: ['P', 5], K: ['K', 5], dK: ['K', 2], H: ['G', 5], HP: ['P', 5, true], HK: ['K', 5, true] };
      const pick = (btn, d, heavy) => pickNormal(btn, d, heavy, true);
      const next = (prev, tok) => {
        const [btn, d, heavy] = TOK[tok];
        if (!prev) return pick(btn, d, heavy);
        const c = prev.cancel || {};
        const tk = heavy ? 'H' + btn : btn;
        if (c.target && c.target[tk] && (d === 5 || d === 6)) return c.target[tk];
        const k = pick(btn, d, heavy);
        return c.chain && c.chain.includes(k) ? k : null;
      };
      const all = [];
      // 空中H は 'G' ボタンのキーで target に入っていることもある
      const walk = (seq, keys) => {
        const last = keys.length ? me.normals[keys[keys.length - 1]] : null;
        if (seq.length) all.push({ seq, dive: keys[keys.length - 1] === 'diveKick' });
        if (seq.length >= 5 || all.length > 400 || (last && keys[keys.length - 1] === 'diveKick')) return;
        for (const tok of Object.keys(TOK)) {
          if (!seq.length && tok === 'dK') continue;
          const k = next(last, tok);
          if (!k || keys.includes(k) || !me.normals[k]) continue;
          walk(Object.assign([...seq, tok]), [...keys, k]);
        }
      };
      walk([], []);
      me.cpuAir = all;
    }
    // 長い並びを優先して選ぶ（空中戦が得意なキャラほど長くつながる）
    const list = me.cpuAir.filter(a => a.dive === dive);
    const pool = list.length ? list : me.cpuAir;
    const max = Math.max(...pool.map(a => a.seq.length));
    const long = pool.filter(a => a.seq.length >= max - 1);
    const a = long[Math.floor(Math.random() * long.length)];
    return a.seq.map(t => t === 'dK' ? { air: 'K', dir: 'down' } : { air: t[t.length - 1], heavy: t.length === 2 });
  }

  // コンボを毎回組み立てる：短い通常技（同じ技は使わない）→ 必殺技を2〜3つ → 超必殺技
  makeCombo(me) {
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const sp = this.comboParts(me);
    const N = {
      P: { btn: 'P' }, K: { btn: 'K' }, dP: { btn: 'P', dir: 'down' }, dK: { btn: 'K', dir: 'down' },
      bP: { btn: 'P', dir: 'back' }, fP: { btn: 'P', dir: 'fwd' },
      HP: { btn: 'P', heavy: true }, HK: { btn: 'K', heavy: true }, dHP: { btn: 'P', dir: 'down', heavy: true }, dHK: { btn: 'K', dir: 'down', heavy: true },
      d1HP: { btn: 'P', dir: 'downback', heavy: true }, d1HK: { btn: 'K', dir: 'downback', heavy: true },
      d3HP: { btn: 'P', dir: 'downfwd', heavy: true }, d3HK: { btn: 'K', dir: 'downfwd', heavy: true },
      d4HP: { btn: 'P', dir: 'back', heavy: true }, d4HK: { btn: 'K', dir: 'back', heavy: true },
      d6HP: { btn: 'P', dir: 'fwd', heavy: true }, d6HK: { btn: 'K', dir: 'fwd', heavy: true },
    };
    // 通常技の連携はキャラごとに違うので、そのキャラでつながる並びを使う（同じ技は使わない）
    const { launchStarters, groundStarters } = this.starters(me);
    const launched = launchStarters.length && (!sp.movers.length && Math.random() < 0.6 || sp.movers.length && Math.random() < 0.25);
    // そのキャラらしい連携を出すため、長い並びや、よろけ・ダッシュキャンセルなどの特徴がある技で終わる並びを選びやすく
    const weight = q => {
      const ln = me.normals[q.lastKey] || {};
      return q.length * q.length + (ln.crumple && !ln.crumpleCounter ? 12 : 0) + (ln.cancel && ln.cancel.dash ? 10 : 0) +
        (ln.pullToOwner || ln.bind ? 8 : 0) + ((ln.launch || 0) >= 6 ? 6 : 0);
    };
    const pickW = list => {
      const ws = list.map(weight);
      let r = Math.random() * ws.reduce((a, b) => a + b, 0);
      for (let i = 0; i < list.length; i++) if ((r -= ws[i]) <= 0) return list[i];
      return list[list.length - 1];
    };
    const st = pickW(launched ? launchStarters : groundStarters);
    const steps = st.map(k => ({ ...N[k] }));
    const lastN = me.normals[st.lastKey];
    if (!launched && lastN) {
      // よろけさせたら（空中投げなら浮かせたら）コマンド投げでつかむ
      const grab = me.moves.findIndex(m => m.grabStun && !!m.airGrab === ((lastN.launch || 0) >= 6) && me.canUse(m));
      if (grab >= 0 && (lastN.crumple || (lastN.launch || 0) >= 6) && !lastN.crumpleCounter && Math.random() < 0.75) {
        steps.push({ force: grab });
        return { steps, i: 0, pressedFor: null, age: 0 };
      }
      // ダッシュキャンセル → ダッシュP（ジン）
      if (lastN.cancel && lastN.cancel.dash && Math.random() < 0.65) steps.push({ dash: true }, { btn: 'P' });
    }
    // 通常技で使う技の名前（同じ技を必殺技側で重ねないための記録）
    const used = new Set();

    const routes = [];
    if (launched) {
      routes.push('air');
      if (sp.air.length) routes.push('cancel', 'cancel');
    } else {
      routes.push('special', 'special');
      if (sp.movers.length) routes.push('mover', 'mover', 'mover', 'mover');
      if (sp.bounce.length) routes.push('bounce');
    }
    let options = routes.filter(r => r !== this.lastEnder || r === 'mover' || r === 'special');
    if (!options.length) options = routes;
    const route = pick(options);
    this.lastEnder = route;

    switch (route) {
      case 'air':
        if (!sp.airEnd.length || Math.random() < 0.5) {
          // 空中の連携 → 急降下キック（地面バウンド）→ 跳ね上がりを juggle() が必殺技で拾う
          steps.push({ jump: true }, ...this.airString(me, true));
        } else {
          steps.push({ jump: true }, ...this.airString(me, false), ...sp.airEnd);
        }
        break;
      case 'cancel': {
        const a = pick(sp.air);
        steps.push({ force: a }, ...this.chainSteps(me, sp, a, new Set([moveKeyOf(me.moves[a])])));
        break;
      }
      case 'mover': {
        // 移動多段で運び、空中の相手に当たる技などで締める（移動多段どうしはつながらない）
        const m = pick(sp.movers);
        steps.push({ force: m }, ...this.chainSteps(me, { ...sp, multi: sp.air.length ? sp.air : sp.multi, launch: [], melee: [] }, m, new Set([moveKeyOf(me.moves[m])])));
        break;
      }
      case 'bounce': {
        const a = pick(sp.bounce);
        steps.push({ force: a });
        break;
      }
      default:
        steps.push(...this.finisherSteps(me, sp, used));
    }
    return { steps, i: 0, pressedFor: null, age: 0 };
  }

  choose(me, opp, dist) {
    const opts = [];
    const add = (w, action) => { if (w > 0) opts.push([w, action]); };
    const mv = (role, w) => {
      const i = this.find(me, role);
      if (i >= 0) add(w, { type: 'move', idx: i, t: 1 });
    };
    const oppGuarding = opp.state === 'guard' || opp.state === 'blockstun' || opp.curDir === 4;
    const buffed = me.buff || me.armorHits > 0 || me.speedTimer > 0;

    if (dist > 320) {
      add(30, { type: 'walk', t: 40, stopAt: 90 });
      add(12, { type: 'dash', t: 3 });
      add(8, { type: 'jumpFwd', t: 4 });
      mv('zone', 40);
      mv('zone2', 30);
      if (!buffed) mv('buff', 25);
      mv('heal', me.hp < me.maxHp * 0.7 ? 30 : 0);
      mv('meter', me.meter < METER_MAX ? 18 : 0);
      if (!me.transform) mv('superBuff', 35);
      mv('tele', 8);
      mv('superFar', 30);
      mv('superRush', 6);
    } else if (dist > 110) {
      add(25, { type: 'walk', t: 25, stopAt: 70 });
      add(18, { type: 'dash', t: 3 });
      add(22, { type: 'dash', t: 3, then: 'combo' });
      add(14, { type: 'jumpFwd', t: 4 });
      add(6, { type: 'back', t: 15 });
      add(6, { type: 'guard', t: 20 });
      mv('zone', 15);
      mv('zone2', 10);
      mv('rush', 22);
      mv('tele', 8);
      mv('superRush', 18);
      mv('superFar', 12);
      if (!buffed) mv('buff', 5);
      if (!me.transform) mv('superBuff', 20);
    } else {
      add(80, { type: 'combo' });
      add(5, { type: 'punch', t: 1 });
      add(10, { type: 'guard', t: 18 });
      add(6, { type: 'back', t: 16 });
      add(4, { type: 'jumpFwd', t: 4 });
      add(oppGuarding ? 18 : 8, { type: 'overhead', t: 1 });
      add(oppGuarding ? 14 : 8, { type: 'sweep', t: 1 });
      if (me.canThrow()) add(oppGuarding ? 30 : 15, { type: 'throw', t: 1 });
      if (me.canThrow()) mv('grab', oppGuarding ? 25 : 12);
      mv('close', 10);
      mv('launch', 10);
      if (me.canThrow()) mv('superGrab', 40);
      mv('superRush', 10);
    }

    const total = opts.reduce((s, o) => s + o[0], 0);
    let r = Math.random() * total;
    for (const [w, action] of opts) {
      r -= w;
      if (r <= 0) {
        if (action.type === 'combo') this.combo = this.buildCombo(me);
        else this.action = { ...action };
        return;
      }
    }
  }
}
