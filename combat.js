'use strict';

// 戦闘処理（当たり判定・ガード・投げ・技の特殊効果）
// （Game クラスの続き。メソッドを prototype に追加する）
Object.assign(Game.prototype, {
  checkHit(att, def) {
    if (att.state !== 'attack') return;
    const a = att.attack;
    if (!a.box) return;
    const t = att.stateTime;
    if (t < a.startup || t >= a.startup + a.active) return;
    if (att.hitCount >= a.hits || att.hitCooldown > 0) return;
    // 着地の直前（地面から landingHit 以内まで落ちてきた時）だけ当たる
    if (a.landingHit && (att.vy <= 0 || GROUND - att.y > a.landingHit * att.size)) return;

    const hb = att.hitbox(a.box);
    const hu = def.hurtbox();
    // 多段技は1発目が当たったら、残りも必ず当たる
    const locked = att.lockTarget === def && att.hitCount > 0;
    const hit = overlap(hb, hu);
    if (!hit && !locked) return;

    const px = hit ? (Math.max(hb.x, hu.x) + Math.min(hb.x + hb.w, hu.x + hu.w)) / 2 : def.x - att.facing * 10;
    const py = hit ? (Math.max(hb.y, hu.y) + Math.min(hb.y + hb.h, hu.y + hu.h)) / 2 : def.y - 90 * def.size;
    const final = att.hitCount + 1 >= a.hits;
    const res = this.applyHit(att, def, a, att.facing, px, py, { mult: att.attackMult * att.buffMult(), final, locked });
    if (!res) {
      if (locked) att.lockTarget = null;
      return;
    }
    if (res === true && a.hits > 1 && !locked) {
      att.lockTarget = def;
      // 運ぶ時の相手との間隔（重ならない程度）
      att.lockOffset = att.facing * Math.max(Math.abs(def.x - att.x), 30 * (att.size + def.size));
    }

    att.hitCount++;
    att.hitCooldown = a.hitInterval;
    att.connected = true;
    if (a.carry && def.state === 'hitstun') att.carry = def;
    if (res === 'countered') {
      att.hitCount = a.hits;
      return;
    }
    // 多段の突進技は当たっても止まらず、相手を運びながら最後まで進む
    if (a.stopOnHit && a.hits <= 1) {
      att.rushStopped = true;
      att.vx = 0;
      if (a.hits === 1) att.stateTime = a.startup + a.active;
    }
  },

  // 戻り値: false=当たらず / true=ヒットorガード / 'reflect' / 'countered'
  applyHit(att, def, data, dir, px, py, opt = {}) {
    const { projectile = false, mult = 1, final = true, unblockable = false, locked = false } = opt;
    if (this.state !== 'fight' || def.state === 'ko') return false;
    // 多段技の途中は、空中追撃の回数制限などで抜けないようにする
    const lockedOn = locked && (def.state === 'hitstun' || def.state === 'blockstun');
    if (def.isInvuln(!!data.resetCombo) && !lockedOn) return false;
    if (data.airOnly && def.onGround) return false; // 空中の相手にだけ当たる（ゲージ衝撃波）
    const multi = (data.hits || 1) > 1 && !final;
    // 移動多段技で浮かされた相手に、つなぎで移動多段技は当たらない（運び続けるループ防止）
    // ※ 必殺技キャンセルで続けた移動多段は当たる
    const isMover = !projectile && isMoverMove(data);
    // 同じ技はコンボ中に1回しか当たらない（多段技の2段目以降は続きなので当たる）
    const moveKey = projectile ? 'proj:' + (data.moveName || data.kind) : (data.name || data.key || data.label);
    const continuing = locked || (projectile ? data.hitCount > 0 : (att.attack === data && att.hitCount > 0));
    if (def.state === 'hitstun' && def.comboMoves && def.comboMoves.has(moveKey) && !continuing && !data.meterMove) return false;
    // 重量級はコンボの上限がある（上限を超えたら新しい技は当たらない。出している多段技の続きと超必殺技は当たる）
    const cap = att.def && att.def.comboCap;
    if (cap && def.state === 'hitstun' && !data.super && !data.fromSuper && (def.combo >= cap + 1 || (def.combo >= cap && !continuing))) return false;
    // 超必殺技（とそこから出た飛び道具）ではゲージが増えない。通常技・必殺技では溜まる
    // ゲージ技でリセットした後のコンボではゲージが溜まらない（ゲージ技を使い続ける永久コンボの防止）
    const gainsMeter = !data.super && !data.fromSuper && !data.noMeter && !(def.state === 'hitstun' && def.comboBase > 0);
    if (isMover && !locked && !projectile && def.moverPopped && !def.onGround && !(att.spChain >= 1)) return false;
    if (data.grab) {
      // grabStun：よろけ中の相手（空中投げなら浮いている相手）もコンボの途中でつかめる
      const stunGrab = data.grabStun && def.state === 'hitstun' && (data.airGrab ? !def.onGround : def.crumpled > 0);
      if (!stunGrab && (def.throwImmune > 0 || ['hitstun', 'blockstun', 'thrown', 'roll'].includes(def.state))) return false;
      // 空中投げは空中の相手だけ、通常の投げは地上の相手だけ
      if (data.airGrab ? def.onGround : !def.onGround) return false;
    }

    if (def.isCountering()) {
      const c = def.attack.counter;
      const applies = !(c.airOnly && (att.onGround || projectile));
      if (applies) {
        if (c.parry) {
          this.parry(def, att, projectile);
          return projectile ? 'parried' : 'countered';
        }
        if (projectile) return 'reflect';
        this.counterHit(def, att);
        return 'countered';
      }
    }

    // 投げ・コマンド投げは投げモーションへ
    if (data.grab) return this.beginThrow(att, def, data);

    // アーマー：怯まずに耐える（技のアーマー / 鬼酒 / 鬼神化）
    const da = def.state === 'attack' ? def.attack : null;
    const vsSuper = data.super || data.fromSuper; // 覚醒必殺技はアーマーで耐えられない
    const moveArmor = !vsSuper && da && da.armor && !def.armorUsed && def.stateTime >= da.armor[0] && def.stateTime <= da.armor[1];
    const transArmor = !vsSuper && def.transform > 0 && def.transformArmor > 0;
    if (moveArmor || (!vsSuper && def.armorHits > 0) || transArmor) {
      let rate = 0.5;
      if (moveArmor) {
        def.armorUsed = true;
      } else if (def.armorHits > 0) {
        def.armorHits--;
        rate = 0.75;
      } else {
        def.transformArmor--;
        rate = 0.85;
      }
      def.hp -= data.damage * mult * rate;
      this.addPopup('ARMOR!', def.x, def.y - 170 * def.size, '#ffb04a');
      this.spawnSparks(px, py, '#ffb04a', 14);
      this.hitstop = Math.max(this.hitstop, 6);
      SFX.block();
      this.checkKO(def, dir, px, py);
      return true;
    }

    const level = data.level || 'mid';
    const gt = unblockable ? null : def.guardType();
    const blocked = !!gt && !(gt === 'stand' && level === 'low') && !(gt === 'crouch' && level === 'high');

    if (blocked && data.crush) {
      // ガードクラッシュ：ガードを崩して無防備にする
      def.state = 'hitstun';
      def.stateTime = 0;
      def.stun = data.crush;
      def.vx = dir * 4;
      def.combo = 0;
      this.addPopup('GUARD CRUSH!', def.x, def.y - 170 * def.size, '#ff7a3a');
      this.spawnSparks(px, py, '#ff7a3a', 18);
      this.hitstop = Math.max(this.hitstop, 10);
      this.shake = Math.max(this.shake, 8);
      SFX.burst();
    } else if (blocked) {
      def.lastGuard = gt;
      // 削りダメージは、ゲージがあればゲージで肩代わりする（体力は減らない）
      const chip = (data.chip || 0) * mult;
      const cost = chip * CHIP_METER_RATE;
      const meterGuard = chip > 0 && def.meter >= cost;
      if (meterGuard) def.meter -= cost;
      else def.hp = Math.max(0, def.hp - chip);
      def.stun = data.blockstun;
      def.state = 'blockstun';
      def.stateTime = 0;
      def.vx = dir * data.push * 0.7;
      if (multi) {
        // 多段の途中はガードでも押し出しすぎない
        def.vx = projectile ? (data.vx || 0) * 0.9 : att.vx;
        def.stun = Math.max(def.stun, (data.hitInterval || 6) + 8);
      }
      if (gainsMeter) {
        att.meter = Math.min(METER_MAX, att.meter + (data.meter || 0) / 2 * METER_GAIN);
        if (!meterGuard) def.meter = Math.min(METER_MAX, def.meter + 2 * METER_GAIN);
      }
      this.spawnSparks(px, py, meterGuard ? '#ffe14a' : '#9cf', 8);
      this.hitstop = Math.max(this.hitstop, 4);
      SFX.block();
    } else {
      if (gt) {
        this.addPopup(level === 'low' ? '下段!' : '中段!', def.x, def.y - 170 * def.size, '#ffd84a');
      }
      const wasAir = !def.onGround;
      const wasHitstun = def.state === 'hitstun';
      // カウンター：相手が技を出している最中（出始め・攻撃中・空振りの隙）に当てた。多段技は1発目で決まる
      const counter = (def.state === 'attack' && !!def.attack) || (continuing && def.counteredBy === moveKey);
      def.counteredBy = counter ? moveKey : null;
      // 空中追撃の回数は、多段技なら1回とまとめて数える
      if (wasAir && !locked) def.juggle++;
      def.combo = wasHitstun ? def.combo + 1 : 1;
      if (def.combo === 1) {
        def.comboStart = def.clock;
        def.comboMoves = new Set();
        def.bounceUsed = { ground: false, wall: false };
        def.bounceCount = 0;
        def.bounceLaunch = false;
        def.comboBase = 0;
        def.crumpleUsed = false;
      }
      // ゲージ技：吹っ飛び率・のけぞりの短さ・空中追撃の回数・バウンドの回数をリセット
      if (data.resetCombo && def.combo > 1) {
        def.comboBase = def.combo - 1;
        def.juggle = 0;
        def.bounceUsed = { ground: false, wall: false };
        def.bounceCount = 0;
        def.bounceLaunch = false;
        def.comboMoves = new Set(); // 使った技をもう一度当てられる
        this.addPopup('RESET!', def.x, def.y - 200 * def.size, '#7affc8');
      }
      def.comboMoves.add(moveKey);
      def.bounceStop = 0; // バウンド硬直中に追撃されたらバウンドは取り消し
      def.bounceV = null;
      const scale = Math.max(0.4, 1 - 0.08 * (def.combo - 1));
      const dmg = data.damage * mult * scale * (def.curse > 0 ? 1.25 : 1);
      def.hp -= dmg;
      // ヒット数が増えるほど、のけぞり時間が短くなる（長いコンボほど繋がりにくい）
      def.stun = Math.round(data.hitstun * Math.max(HITSTUN_MIN, 1 - HITSTUN_DECAY * (def.combo - 1 - (def.comboBase || 0))));
      def.attack = null;
      def.carry = null;
      def.state = 'hitstun';
      def.stateTime = 0;
      def.vx = dir * data.push;
      def.crumpled = 0;
      // よろけ（凍結）：地上の相手がその場で長く動けなくなる。1コンボ1回。crumpleCounter はカウンターの時だけ
      if (data.crumple && def.onGround && final && !def.crumpleUsed && (!data.crumpleCounter || counter)) {
        def.crumpleUsed = true;
        def.crumpled = data.crumple;
        def.stun = Math.max(def.stun, data.crumple);
        def.vx = dir * 0.6;
        this.addPopup(data.crumpleLabel || 'よろけ!', def.x, def.y - 185 * def.size, data.crumpleColor || '#ffb04a');
      }
      if (def.bound > 0 && !data.bind) {
        def.bound = 0;
        def.bindImmune = BIND_IMMUNE;
        this.addPopup('POP!', def.x, def.y - 160, '#8ad8ff');
      }
      if (final && data.launch) {
        if (data.launch >= 6) {
          // 打ち上げ技はほぼ真上に。launchMul で高さ、launchVx で前への勢い（斜めに飛ばす）を変えられる
          def.vy = -LAUNCH_HEIGHT * (data.launchMul || 1);
          def.vx = dir * (data.launchVx ?? 0.8);
        } else {
          def.vy = -data.launch * LAUNCH_SCALE;
          def.vx = dir * Math.max(data.push, 3);
        }
        def.knockdown = true;
      } else if (wasAir) {
        // 空中の相手には浮かせ続ける（空中コンボ用）
        def.vy = Math.min(def.vy, -5, att.onGround ? -5 : att.vy - 1);
        def.knockdown = true;
      }
      // 空中H：相手を上に蹴り上げる（自分も上昇しているので、そのまま空中コンボを続けられる）
      if (data.airLift && final) {
        def.vy = data.airLift;
        def.vx = dir * 1;
        def.knockdown = true;
        // 当てた側も一緒に上がる（少しだけ低く。次の空中技が届く）
        if (!projectile && !att.onGround) att.vy = Math.min(att.vy, data.airLift + 1.2);
      }
      // しゃがみキックで空中の相手をすくい上げる（少しだけ浮かせて移動多段などに繋げられる）
      if (data.scoop && wasAir) {
        def.vy = -8.5;
        def.vx = dir * 0.5;
        def.knockdown = true;
        def.stun = Math.max(def.stun, 26);
      }
      this.applyEffects(att, def, data, dir, dmg, wasAir, wasHitstun, final, counter);

      if (multi && !data.lift && !data.carry && !data.bind) {
        // 多段の途中は相手をその場（攻撃側と一緒）に留める
        def.vx = projectile ? (data.vx || 0) * 0.9 : att.vx;
        if (!def.onGround) def.vy = -1.5;
        def.stun = Math.max(def.stun, (data.hitInterval || 6) + 10);
      }

      // 移動多段技の最後の1発は相手を少し浮かせる（技が終わってから昇竜拳などで拾える）
      if (final && isMover && !data.launch && !projectile) {
        def.moverPopped = true;
        def.vy = Math.min(def.vy, MOVER_POP);
        def.vx = dir * 0.5;
        def.knockdown = true;
        def.stun = Math.max(def.stun, 20);
      }

      // 1回目のバウンドの後に当てた技は大きく吹っ飛ぶ
      // 1回目のバウンドの後に当てた技は大きく吹っ飛び、落ちた先（地面か壁）で2回目のバウンド
      if (final && def.bounceLaunch && def.bounceStop === 0 && !def.wallBounce && !def.groundBounce && !data.bind) {
        def.bounceLaunch = false;
        def.vy = -LAUNCH_HEIGHT * 0.85;
        def.vx = dir * 6;
        def.knockdown = true;
        def.groundBounce = true;
        def.wallBounce = true;
        this.addPopup('吹っ飛び!', def.x, def.y - 170 * def.size, '#ffd84a');
      }

      // 吹っ飛び率：コンボが長くなるほど浮き・押し出しが弱くなる（後半は拾えなくなる）
      if (final && def.combo > 1 && def.bounceStop === 0 && !data.bind) {
        const kb = kbScale(def.combo - (def.comboBase || 0));
        def.vx *= kb;
        if (def.vy < 0) def.vy *= kb;
      }

      if (gainsMeter) {
        att.meter = Math.min(METER_MAX, att.meter + (data.meter || 0) * METER_GAIN);
        def.meter = Math.min(METER_MAX, def.meter + 5 * METER_GAIN);
      }
      if (def.combo >= 2) this.combo = { count: def.combo, owner: att, timer: 70 };

      const big = dmg >= 10 || data.grab;
      this.spawnSparks(px, py, data.grab ? '#fff' : '#ffd84a', big ? 20 : 12);
      this.hitstop = Math.max(this.hitstop, data.grab ? 14 : big ? 9 : final ? 6 : 3);
      this.shake = Math.max(this.shake, Math.min(14, dmg * 0.8));
      if (data.grab) SFX.burst();
      SFX.hit(big);
    }

    // 画面端対策：相手が端を背負っていたら、攻撃側が押し戻される
    if (!projectile && (def.x <= STAGE_MIN + 24 || def.x >= STAGE_MAX - 24)) {
      att.rushStopped = true;
      att.vx = -dir * Math.max(4, data.push * 1.1);
    }

    this.checkKO(def, dir, px, py);
    return true;
  },

  // 技ごとの特殊な効果
  applyEffects(att, def, data, dir, dmg, wasAir, wasHitstun, final = true, counter = false) {
    // 壁・地面バウンドや引き寄せは、多段技なら最後の1発だけ
    const lastHit = final || (data.hits || 1) <= 1;
    // 投げキャラの一部の技は、カウンターで当てた時だけバウンドする（狙って当てないと出ない）
    const cb = counter && lastHit ? data.counterBounce : null;
    if (data.popBounce) {
      // 上に浮かせて、着地でバウンド（ゲージ衝撃波）
      def.vy = -14;
      def.vx = dir * 0.5;
      def.knockdown = true;
      def.groundBounce = true;
    }
    if (cb) this.addPopup('COUNTER!', def.x, def.y - 190 * def.size, '#ffb04a');
    if ((data.wallBounce || cb === 'wall') && lastHit) {
      // 横に吹っ飛ばす。壁に当たるとバウンド（1コンボ1回）
      def.vx = dir * 18;
      def.vy = -7;
      def.knockdown = true;
      if (!def.bounceUsed.wall && def.bounceCount < 2) {
        def.bounceUsed.wall = true;
        def.wallBounce = true;
      }
    }
    if ((data.groundBounce || cb === 'ground') && lastHit) {
      // 地面に叩きつける。高く跳ね上がる（1コンボ1回）
      def.knockdown = true;
      if (!def.bounceUsed.ground && def.bounceCount < 2) {
        def.bounceUsed.ground = true;
        if (wasAir) {
          def.groundBounce = true;
          def.vy = 16;
          def.vx = dir * 1;
        } else {
          def.y = GROUND - 1;
          def.startBounce(dir * 1, GROUND_BOUNCE_VY, 'BOUND!');
        }
      } else if (wasAir) {
        def.vy = 12;
      }
    }
    if (data.pull && lastHit) def.vx = -dir * data.pull;
    if (data.pullToOwner && lastHit) {
      const tx = att.x + att.facing * 60 * att.size;
      def.vx = clamp((tx - def.x) / 5.5, -30, 30);
      if (!def.onGround) def.vy = Math.min(def.vy, -2);
    }
    if (data.toCenter) {
      // 渦の真ん中へ吹っ飛ばす（少し浮かせて、ちょうど中心に落ちる速さで）
      const vy = -10;
      const air = (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * Math.max(0, GROUND - def.y))) / GRAVITY;
      def.vx = clamp((data.x - def.x) / air, -14, 14);
      def.vy = vy;
      def.knockdown = true;
      this.spawnRing(data.x, GROUND - 40, data.color, 2);
    }
    if (data.lift) {
      def.vy = -data.lift;
      def.vx = (data.x - def.x) * 0.2;
      def.knockdown = true;
    }
    // 泡：のけぞり中や、割れた直後は閉じ込められない
    if (data.bind && def.bindImmune <= 0 && !wasHitstun && def.bound <= 0) {
      def.bound = data.bind;
      def.stun = data.bind + 12;
      def.vx = 0;
      def.vy = 0;
      this.addPopup('BUBBLE!', def.x, def.y - 170, '#8ad8ff');
    }
    if (data.drain) {
      att.hp = Math.min(att.maxHp, att.hp + dmg * 0.7);
      this.addPopup('DRAIN', att.x, att.y - 180 * att.size, '#7aff8a');
    }
    if (data.curse) {
      def.curse = data.curse;
      this.addPopup('呪い!', def.x, def.y - 170, '#b07aff');
    }
    if (data.doom) {
      def.doom = data.doom;
      def.doomDamage = data.doomDamage;
      this.addPopup('死の宣告', def.x, def.y - 175, '#b07aff');
    }
    if (data.bigSlash) {
      this.hitstop = 40;
      this.slashFx = { t: 40, y: def.y - 90, color: att.pal.aura };
    }
  },

  // 死の宣告のカウントが0になった
  doomHit(def) {
    if (this.state !== 'fight' || def.state === 'ko') return;
    def.hp -= def.doomDamage;
    def.attack = null;
    def.state = 'hitstun';
    def.stateTime = 0;
    def.stun = 30;
    def.vy = -LAUNCH_HEIGHT * 0.7;
    def.vx = 0;
    def.knockdown = true;
    this.spawnSparks(def.x, def.y - 80, '#b07aff', 30);
    this.spawnRing(def.x, def.y - 80, '#b07aff', 3);
    this.addPopup('DOOM!', def.x, def.y - 180, '#b07aff');
    this.shake = 14;
    this.hitstop = 12;
    SFX.ko();
    this.checkKO(def, def.facing * -1, def.x, def.y - 80);
  },

  // 弾き：当たった攻撃を弾いて相手を無防備にする
  parry(def, att, projectile) {
    def.attack = null;
    def.setState('idle');
    def.invuln = 6;
    this.addPopup('弾き!', def.x, def.y - 170 * def.size, def.pal.aura);
    this.spawnSparks(def.x + def.facing * 30, def.y - 100, '#fff', 16);
    SFX.block();
    this.hitstop = 10;
    if (!projectile) {
      att.attack = null;
      att.throwing = null;
      att.state = 'hitstun';
      att.stateTime = 0;
      att.stun = 34;
      att.vx = -Math.sign(def.x - att.x) * 3;
    }
  },

  checkKO(def, dir, px, py) {
    if (def.hp > 0) return;
    if (this.mode === 'training') {
      // トレーニングでは倒れない（体力は後で全回復）
      def.hp = 1;
      return;
    }
    def.hp = 0;
    def.attack = null;
    def.state = 'ko';
    def.stateTime = 0;
    def.vx = dir * 6;
    def.vy = -9 * LAUNCH_SCALE;
    this.hitstop = 24;
    this.shake = 16;
    this.spawnSparks(px, py, '#fff', 30);
    SFX.ko();
  },

  beginThrow(att, def, data) {
    const style = data.style || (data.throw ? (att.throwBack ? 'back' : 'front') : 'back');
    att.throwing = {
      target: def, data, t: 0, style, back: style === 'back', big: !!data.super,
      hold: style === 'slam' ? 0 : data.throw ? 10 : 5,
      swing: style === 'pile' ? (data.super ? 40 : 30) : data.super ? 30 : 18,
      techable: !!data.throw,
    };
    att.vx = 0;
    def.attack = null;
    def.state = 'thrown';
    def.stateTime = 0;
    def.vx = 0;
    def.vy = 0;
    def.throwRot = 0;
    def.buffer = null;
    this.hitstop = Math.max(this.hitstop, 4);
    SFX.block();
    return true;
  },

  releaseThrow(att, def, th) {
    const data = th.data;
    const a = att.attack;
    att.throwing = null;
    att.stateTime = a.startup + a.active + Math.max(0, a.recovery - 14);
    def.throwRot = 0;
    def.state = 'hitstun';
    def.stateTime = 0;
    if (this.state !== 'fight') {
      def.y = GROUND;
      def.setState('idle');
      return;
    }
    const dir = th.back ? -att.facing : att.facing;
    const dmg = data.damage * att.attackMult * att.buffMult() * (def.curse > 0 ? 1.25 : 1);
    def.hp -= dmg;
    def.combo = 1;
    def.juggle = JUGGLE_LIMIT - 2;
    def.stun = data.hitstun;
    def.knockdown = true;
    def.vx = dir * (data.push || 5);
    def.vy = th.back ? -(data.launch || 8) * LAUNCH_SCALE : -5 * LAUNCH_SCALE;
    if (!th.back) def.y = GROUND - 4;
    if (th.style === 'pile' || th.style === 'slam') {
      def.vx = dir * 2;
      def.vy = -7;
    }
    // 超必殺技の投げではゲージが増えない
    if (!data.super) {
      att.meter = Math.min(METER_MAX, att.meter + (data.meter || 0) * METER_GAIN);
      def.meter = Math.min(METER_MAX, def.meter + 5 * METER_GAIN);
    }
    this.spawnSparks(def.x, def.y - 40, '#fff', 20);
    this.spawnDust(def.x);
    this.shake = Math.max(this.shake, th.big ? 18 : 10);
    this.hitstop = Math.max(this.hitstop, 8);
    SFX.burst();
    SFX.hit(true);
    this.checkKO(def, dir, def.x, def.y - 60);
  },

  techThrow(att, def) {
    const f = att.facing;
    att.throwing = null;
    att.attack = null;
    for (const [fi, v] of [[att, -f * 7], [def, f * 7]]) {
      fi.state = 'blockstun';
      fi.stateTime = 0;
      fi.stun = 14;
      fi.lastGuard = 'stand';
      fi.vx = v;
      fi.throwImmune = 10;
    }
    def.y = GROUND;
    def.throwRot = 0;
    this.addPopup('投げ抜け!', (att.x + def.x) / 2, def.y - 170, '#9cf');
    this.spawnSparks((att.x + def.x) / 2, def.y - 100, '#fff', 14);
    SFX.block();
  },

  // プッシュガード：攻めている相手を大きく押し返す（画面端対策）
  pushGuard(def, att) {
    const dir = Math.sign(att.x - def.x) || def.facing;
    def.setState('idle');
    def.stun = 0;
    def.throwImmune = 10;
    att.vx = dir * 14;
    att.rushStopped = true;
    if (att.state === 'attack' && !att.attack.super) att.stateTime = Math.max(att.stateTime, att.attack.startup + att.attack.active);
    this.spawnRing(def.x + dir * 30, def.y - 80, '#9cf', 2);
    this.addPopup('PUSH GUARD!', def.x, def.y - 170 * def.size, '#9cf');
    SFX.block();
  },

  counterHit(def, att) {
    const c = def.attack.counter;
    const dir = Math.sign(att.x - def.x) || def.facing;
    def.attack = null;
    def.setState('idle');
    def.facing = dir;
    def.counterStrike = 18;
    this.addPopup('COUNTER!', def.x, def.y - 170 * def.size, def.pal.aura);
    this.spawnRing(def.x, def.y - 80, def.pal.aura, 2);
    this.applyHit(def, att, { name: '当て身', damage: c.damage, hitstun: 30, push: 6, launch: c.launch, meter: 0, chip: 0 },
      dir, att.x - dir * 10, att.y - 100 * att.size, { unblockable: true });
    this.hitstop = 14;
  }
});
