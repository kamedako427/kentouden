'use strict';

// ファイターのポーズ（関節の位置）
// （Fighter クラスの続き。メソッドを prototype に追加する）
Object.assign(Fighter.prototype, {
  // ---------- ポーズ ----------
  getPose() {
    const t = this.stateTime;
    const b = Math.sin(this.animTime * 0.12) * 2.5;
    const stance = {
      hip: P(0, -68 + b * 0.4), sh: P(4, -118 + b), head: P(7, -138 + b),
      fa: [P(24, -102 + b), P(34, -120 + b)], ba: [P(-4, -98 + b), P(18, -112 + b)],
      fl: [P(18, -34), P(26, 0)], bl: [P(-10, -36), P(-24, 0)],
    };
    const jump = {
      hip: P(0, -80), sh: P(4, -128), head: P(8, -148),
      fa: [P(24, -112), P(32, -130)], ba: [P(-2, -108), P(18, -120)],
      fl: [P(24, -58), P(16, -30)], bl: [P(-2, -54), P(-18, -30)],
    };
    const crouch = {
      hip: P(0, -44), sh: P(10, -90), head: P(16, -108),
      fa: [P(30, -80), P(30, -104)], ba: [P(18, -74), P(26, -96)],
      fl: [P(30, -28), P(28, 0)], bl: [P(-18, -20), P(-30, 0)],
    };
    const lying = {
      hip: P(0, -10), sh: P(-50, -12), head: P(-72, -14),
      fa: [P(-40, -24), P(-22, -8)], ba: [P(-60, -4), P(-80, -2)],
      fl: [P(30, -16), P(60, -6)], bl: [P(28, -8), P(62, 0)],
    };
    const airHit = {
      hip: P(0, -70), sh: P(-34, -104), head: P(-50, -114),
      fa: [P(-10, -122), P(0, -140)], ba: [P(-50, -118), P(-62, -136)],
      fl: [P(22, -48), P(40, -30)], bl: [P(16, -40), P(30, -14)],
    };

    // 投げている側：両手で相手をつかむ
    if (this.throwing) {
      const d = this.throwing.target;
      const sh = P(6, -118);
      const tx = (d.x - this.x) * this.facing / this.size;
      const ty = (d.y - this.y) / this.size - 95;
      const vx = tx - sh.x, vy = ty - sh.y;
      const len = Math.hypot(vx, vy) || 1;
      const reach = Math.min(len, 64);
      const hand = P(sh.x + vx / len * reach, sh.y + vy / len * reach);
      const elbow = P((sh.x + hand.x) / 2 - vy / len * 8, (sh.y + hand.y) / 2 + vx / len * 8);
      const lean = clamp(tx / 6, -14, 14);
      return {
        hip: P(0, -64), sh: P(sh.x + lean * 0.4, sh.y + 2), head: P(sh.x + lean * 0.6 + 4, -136),
        fa: [elbow, hand], ba: [P(elbow.x - 6, elbow.y + 6), P(hand.x - 8, hand.y + 8)],
        fl: [P(26, -32), P(40, 0)], bl: [P(-18, -32), P(-34, 0)],
      };
    }

    if (this.counterStrike > 0) {
      return {
        hip: P(2, -66), sh: P(16, -118), head: P(21, -137),
        fa: [P(52, -122), P(89, -122)], ba: [P(-6, -100), P(10, -108)],
        fl: [P(26, -34), P(38, 0)], bl: [P(-14, -34), P(-30, 0)],
      };
    }

    const standGuard = {
      ...stance,
      hip: P(-2, -68), sh: P(-2, -118), head: P(0, -138),
      fa: [P(22, -110), P(24, -134)], ba: [P(16, -104), P(22, -124)],
    };

    switch (this.state) {
      case 'walk': {
        const o = this.opp;
        if (this.curDir === 4 && o && (o.state === 'attack' || (this.game && this.game.projectiles.some(p => p.owner === o))) &&
            Math.abs(o.x - this.x) < 260) {
          return standGuard;
        }
        const s = Math.sin(this.animTime * 0.3);
        const u1 = Math.max(0, s), u2 = Math.max(0, -s);
        return {
          ...stance,
          fl: [P(18 + s * 8, -36 - u1 * 6), P(26 + s * 14, -u1 * 8)],
          bl: [P(-10 - s * 8, -36 - u2 * 6), P(-24 - s * 14, -u2 * 8)],
        };
      }
      case 'guard':
        return crouch;
      case 'blockstun':
        if (this.lastGuard === 'stand') return { ...standGuard, sh: P(-8, -116), head: P(-6, -136) };
        return { ...crouch, hip: P(-5, -44), sh: P(5, -90), head: P(11, -108) };
      case 'dash': {
        const s = Math.sin(this.animTime * 0.6);
        return {
          hip: P(6, -64), sh: P(20, -110), head: P(28, -128),
          fa: [P(26, -96), P(40, -106)], ba: [P(-12, -96), P(-26, -88)],
          fl: [P(30 + s * 10, -30), P(40 + s * 16, -2)], bl: [P(-16 - s * 10, -30), P(-36 - s * 16, -2)],
        };
      }
      case 'backstep':
        return {
          ...jump,
          hip: P(-4, -76), sh: P(-14, -122), head: P(-16, -142),
          fl: [P(14, -44), P(10, -12)], bl: [P(-12, -40), P(-22, -10)],
        };
      case 'jumpsquat':
      case 'landlag':
        return { ...crouch, hip: P(0, -54), sh: P(6, -102), head: P(10, -122) };
      case 'jump':
        return jump;
      case 'attack':
        return this.attackPose(stance, jump, crouch, t);
      case 'hitstun': {
        if (!this.onGround) return airHit;
        if (this.crumpled > 0) {
          // よろけ：ひざをついて、ふらふら揺れる
          const w = Math.sin(this.animTime * 0.25) * 6;
          return {
            hip: P(-4 + w, -44), sh: P(4 + w, -88), head: P(10 + w, -100),
            fa: [P(14 + w, -64), P(20, -40)], ba: [P(-8 + w, -66), P(-4, -42)],
            fl: [P(16, -24), P(26, 0)], bl: [P(-18, -10), P(-40, 0)],
          };
        }
        const j = t < 6 ? (t % 2 ? 2 : -2) : 0;
        return {
          hip: P(-6 + j, -66), sh: P(-16 + j, -114), head: P(-24 + j, -130),
          fa: [P(6, -98), P(14, -82)], ba: [P(-30, -104), P(-40, -122)],
          fl: [P(14, -34), P(22, 0)], bl: [P(-16, -34), P(-28, 0)],
        };
      }
      case 'down':
        return lying;
      case 'thrown':
        return { ...airHit, rot: this.throwRot };
      case 'roll':
        return { ...crouch, rot: (this.stateTime / 22) * TAU * (this.rollDir === this.facing ? 1 : -1) };
      case 'ko':
        return this.onGround ? lying : airHit;
      case 'win':
        return {
          ...stance,
          sh: P(0, -120), head: P(1, -141),
          fa: [P(14, -150), P(18, -180)], ba: [P(-14, -98), P(-6, -80)],
        };
      default:
        return stance;
    }
  },

  attackPose(stance, jump, crouch, t) {
    const a = this.attack;
    const su = a.startup, ac = a.active, rec = a.recovery;
    const act = t >= su && t < su + ac;
    const e = t < su ? 0 : act ? 1 : Math.max(0, 1 - (t - su - ac) / rec);
    const w = t < su ? t / su : 0;
    const wide = { fl: [P(26, -34), P(38, 0)], bl: [P(-14, -34), P(-30, 0)] };

    switch (a.pose) {
      case 'punch':
        return {
          ...wide,
          hip: P(2, -66), sh: P(4 + e * 12, -118), head: P(7 + e * 14, -137),
          fa: [P(lerp(24, 52, e) - w * 8, lerp(-102, -122, e)), P(lerp(34, 89, e) - w * 14, lerp(-120, -122, e))],
          ba: [P(-6, -100), P(10, -108)],
        };

      case 'kick':
        return {
          ...stance,
          hip: P(-4, -70), sh: P(4 - e * 14 - w * 4, -118), head: P(4 - e * 18, -138),
          fl: [P(lerp(18, 50, e) + w * 10, lerp(-34, -80, e) - w * 20), P(lerp(26, 108, e), lerp(0, -74, e) - w * 25)],
          bl: [P(-8, -36), P(-18, 0)],
        };

      case 'upkick':
        if (t < su) return { ...stance, hip: P(-2, -70), fl: [P(30, -66), P(30, -36)] };
        return {
          ...stance,
          hip: P(-4, -72), sh: P(-12 * e, -116), head: P(-16 * e, -136),
          fl: [P(lerp(18, 26, e), lerp(-34, -118, e)), P(lerp(26, 42, e), lerp(0, -170, e))],
          bl: [P(-8, -36), P(-14, 0)],
        };

      case 'cpunch':
        return {
          ...crouch,
          sh: P(10 + e * 8, -90), head: P(16 + e * 8, -108),
          fa: [P(lerp(30, 52, e), lerp(-80, -84, e)), P(lerp(30, 86, e), lerp(-104, -82, e))],
        };

      case 'sweep':
        if (t < su) return crouch;
        return {
          hip: P(0, -30), sh: P(-8, -74), head: P(-6, -94),
          fa: [P(-14, -52), P(-22, -16)], ba: [P(8, -60), P(18, -38)],
          fl: [P(lerp(20, 52, e), -14), P(lerp(30, 110, e), -6)], bl: [P(-10, -14), P(-30, 0)],
        };

      case 'elbow':
        return {
          ...wide,
          fl: [P(30, -34), P(44, 0)],
          hip: P(4, -64), sh: P(6 + e * 14, -114), head: P(10 + e * 16, -133),
          fa: [P(lerp(24, 58, e), lerp(-102, -118, e)), P(lerp(34, 34, e), lerp(-120, -108, e))],
          ba: [P(-6, -98), P(8, -106)],
        };

      case 'knee':
        if (t < su) return { ...stance, sh: P(-6, -114), head: P(-4, -134) };
        return {
          hip: P(4, -78), sh: P(12, -124), head: P(18, -142),
          fa: [P(-10, -112), P(-22, -96)], ba: [P(-16, -106), P(-30, -94)],
          fl: [P(44, -96), P(26, -62)], bl: [P(-10, -46), P(-22, -16)],
        };

      case 'palm':
        if (t < su) return { ...stance, ...wide, fa: [P(6, -100), P(-6, -110)], ba: [P(0, -96), P(-10, -104)] };
        return {
          hip: P(2, -60), sh: P(14 + e * 6, -108), head: P(18 + e * 6, -126),
          fa: [P(lerp(26, 46, e), -116), P(lerp(36, 78, e), -122)],
          ba: [P(lerp(22, 40, e), -96), P(lerp(30, 74, e), -92)],
          fl: [P(34, -30), P(48, 0)], bl: [P(-22, -30), P(-38, 0)],
        };

      case 'axe':
        if (t < su) {
          return {
            ...stance,
            sh: P(-4 - w * 6, -118), head: P(-2 - w * 8, -138),
            fl: [P(lerp(18, 34, w), lerp(-34, -110, w)), P(lerp(26, 52, w), lerp(0, -175, w))],
          };
        }
        return {
          ...stance,
          hip: P(2, -64), sh: P(8 + e * 6, -112), head: P(12 + e * 8, -130),
          fl: [P(lerp(18, 50, e), lerp(-34, -76, e)), P(lerp(26, 84, e), lerp(0, -24, e))],
        };

      case 'airpunch':
        return {
          ...jump,
          sh: P(4 + e * 8, -128), head: P(8 + e * 10, -147),
          fa: [P(lerp(24, 46, e), lerp(-112, -122, e)), P(lerp(32, 84, e), lerp(-130, -118, e))],
        };

      case 'stance':
        return {
          ...crouch,
          hip: P(-4, -52), sh: P(4, -98), head: P(10, -116),
          fa: [P(4, -76), P(-10, -64)], ba: [P(10, -82), P(-6, -70)],
        };

      case 'meditate':
        return {
          ...stance,
          hip: P(0, -62), sh: P(2, -112), head: P(4, -132),
          fa: [P(18, -100), P(20, -120)], ba: [P(14, -98), P(19, -118)],
          fl: [P(22, -30), P(30, 0)], bl: [P(-18, -30), P(-28, 0)],
        };

      case 'whip':
        return {
          ...wide,
          hip: P(2, -66), sh: P(6 + e * 10, -116), head: P(10 + e * 10, -136),
          fa: [P(lerp(20, 54, e), lerp(-104, -114, e)), P(lerp(10, 104, e), lerp(-130, -116, e))],
          ba: [P(-6, -100), P(8, -108)],
        };

      case 'lariat': {
        if (!act) return { ...stance, ...wide };
        const k = Math.floor(t / 4) % 2;
        const front = [P(40, -118), P(78, -122)];
        const rear = [P(-40, -118), P(-78, -122)];
        return {
          ...wide,
          hip: P(0, -66), sh: P(0, -118), head: P(k ? 4 : -4, -138),
          fa: k ? front : rear, ba: k ? rear : front,
        };
      }

      case 'crane':
        return {
          ...stance,
          hip: P(0, -72), sh: P(2, -122), head: P(6, -142),
          fl: [P(24, -84), P(28, -52)], bl: [P(-4, -36), P(-6, 0)],
          fa: [P(30, -128), P(46, -140)], ba: [P(-20, -118), P(-40, -128)],
        };

      case 'sway':
        return {
          ...stance, ...wide,
          hip: P(-6, -64), sh: P(-26, -106), head: P(-36, -120),
          fa: [P(-6, -110), P(2, -124)], ba: [P(-14, -104), P(-4, -118)],
        };

      case 'kickflurry': {
        if (!act) return { ...stance, hip: P(-2, -70), fl: [P(30, -66), P(32, -36)] };
        const k = Math.floor(t / 2) % 2;
        return {
          ...stance,
          hip: P(-4, -72), sh: P(-10, -118), head: P(-12, -138),
          fl: [P(48, -86 - k * 12), P(100, k ? -112 : -74)], bl: [P(-8, -36), P(-16, 0)],
        };
      }

      case 'windmill': {
        if (!act) return crouch;
        return {
          rot: (t - su) * 0.55, pivotY: -30,
          hip: P(0, -30), sh: P(-40, -34), head: P(-58, -36),
          fa: [P(-30, -16), P(-22, 0)], ba: [P(-46, -14), P(-40, 0)],
          fl: [P(30, -50), P(62, -70)], bl: [P(26, -18), P(62, -8)],
        };
      }

      case 'airkick':
        return {
          ...jump,
          sh: P(-2 - e * 6, -126), head: P(-e * 8, -146),
          fl: [P(lerp(24, 40, e), lerp(-58, -64, e)), P(lerp(16, 84, e), lerp(-30, -50, e))],
        };

      case 'cast': {
        if (t < su) {
          const k = t / su;
          const hand = P(lerp(30, -22, k), lerp(-115, -96, k));
          return {
            ...stance, ...wide,
            sh: P(4 - k * 6, -116), head: P(7 - k * 6, -136),
            fa: [P(lerp(20, -6, k), -100), hand], ba: [P(lerp(14, -10, k), -98), P(hand.x - 4, hand.y + 6)],
          };
        }
        return {
          ...stance,
          sh: P(4 + e * 10, -116), head: P(7 + e * 12, -135),
          fa: [P(lerp(20, 38, e), -110), P(lerp(30, 64, e), -108)],
          ba: [P(lerp(14, 32, e), -100), P(lerp(26, 60, e), -100)],
          fl: [P(26, -34), P(40, 0)], bl: [P(-14, -34), P(-32, 0)],
        };
      }

      case 'raise':
        if (t < su) return { ...crouch, fa: [P(22, -70), P(10, -60)] };
        return {
          ...stance, ...wide,
          sh: P(2, -120), head: P(6, -140),
          fa: [P(14, -148), P(20, -180)], ba: [P(-12, -98), P(-4, -80)],
        };

      case 'upper':
        if (t < su) return { ...crouch, fa: [P(26, -70), P(20, -56)] };
        return {
          hip: P(4, -74), sh: P(10, -124), head: P(14, -144),
          fa: [P(lerp(30, 22, e), lerp(-110, -150, e)), P(lerp(40, 28, e), lerp(-120, -184, e))],
          ba: [P(-8, -104), P(4, -92)],
          fl: [P(22, -56), P(14, -30)], bl: [P(-6, -38), P(-14, -4)],
        };

      case 'gaugeUpper': {
        // ゲージ打ち上げ：しゃがんで半回転（背中側に腕が回る）→ 前を向きながら、足元の拳を真上まで突き上げる
        if (t < su) {
          return {
            hip: P(-4, -52), sh: P(-18, -94), head: P(-20, -112),
            fa: [P(-34, -80), P(-52, -60)], ba: [P(-26, -84), P(-44, -66)],
            fl: [P(26, -28), P(40, 0)], bl: [P(-22, -26), P(-38, 0)],
          };
        }
        // 前半は低い姿勢のまま踏み込み（拳は足元）、後半で立ち上がってアッパー
        const up = Math.max(0, (e - 0.35) / 0.65);
        return {
          hip: P(8, lerp(-50, -94, up)), sh: P(lerp(26, 12, up), lerp(-88, -142, up)), head: P(lerp(36, 16, up), lerp(-100, -162, up)),
          fa: [P(lerp(48, 26, up), lerp(-50, -180, up)), P(lerp(74, 30, up), lerp(-24, -226, up))],
          ba: [P(lerp(-8, -14, up), lerp(-80, -112, up)), P(lerp(-28, -32, up), lerp(-66, -96, up))],
          fl: [P(lerp(34, 28, up), lerp(-26, -60, up)), P(lerp(50, 32, up), lerp(0, -30, up))], bl: [P(-22, lerp(-24, -36, up)), P(-40, 0)],
        };
      }

      case 'flip': {
        const rot = act ? -((t - su) / ac) * TAU : 0;
        if (t < su) return crouch;
        return {
          rot,
          hip: P(0, -74), sh: P(-4, -122), head: P(-6, -142),
          fa: [P(-24, -112), P(-36, -126)], ba: [P(-18, -104), P(-32, -116)],
          fl: [P(40, -76), P(84, -82)], bl: [P(6, -50), P(-6, -28)],
        };
      }

      case 'spin': {
        if (!act) return { ...stance, hip: P(0, -74), fl: [P(26, -52), P(22, -26)] };
        const ph = Math.floor((t - su) / 4) % 2;
        const armsOut = { fa: [P(28, -112), P(52, -116)], ba: [P(-20, -112), P(-44, -116)] };
        return ph === 0
          ? { ...armsOut, hip: P(0, -82), sh: P(0, -130), head: P(2, -150), fl: [P(44, -90), P(92, -94)], bl: [P(-6, -48), P(-10, -20)] }
          : { ...armsOut, hip: P(0, -82), sh: P(0, -130), head: P(-2, -150), fl: [P(6, -48), P(10, -20)], bl: [P(-44, -90), P(-92, -94)] };
      }

      case 'rush': {
        if (t < su) return { ...stance, sh: P(-6, -114), head: P(-4, -134) };
        const s = Math.sin(this.animTime * 0.6);
        return {
          hip: P(6, -62), sh: P(26, -106), head: P(34, -122),
          fa: [P(52, -108), P(lerp(60, 86, e), -112)], ba: [P(10, -96), P(28, -104)],
          fl: [P(30 + s * 10, -30), P(40 + s * 16, 0)], bl: [P(-16 - s * 10, -30), P(-36 - s * 16, 0)],
        };
      }

      case 'flurry': {
        if (!act) return { ...stance, ...wide, fa: [P(22, -100), P(26, -116)] };
        const k = Math.floor(t / 2) % 2;
        const jy = ((t * 7) % 5) * 3 - 6;
        const out = [P(52, -120 + jy), P(90, -122 + jy)];
        const mid = [P(30, -108), P(48, -114 - jy)];
        return {
          ...wide,
          hip: P(4, -66), sh: P(14, -118), head: P(18, -137),
          fa: k ? out : mid, ba: k ? mid : out,
        };
      }

      case 'grab':
        return {
          ...wide,
          hip: P(2, -66), sh: P(10 + e * 8, -116), head: P(14 + e * 10, -134),
          fa: [P(38, -108), P(lerp(40, 64, e), -112)], ba: [P(30, -100), P(lerp(36, 58, e), -96)],
        };

      case 'counter':
        return {
          hip: P(0, -60), sh: P(6, -110), head: P(10, -130),
          fa: [P(28, -112), P(44, -122)], ba: [P(22, -100), P(42, -100)],
          fl: [P(28, -30), P(40, 0)], bl: [P(-20, -30), P(-36, 0)],
        };

      case 'slam':
        if (t < su) return { ...stance, ...wide, fa: [P(10, -150), P(18, -180)] };
        return {
          hip: P(0, -50), sh: P(24, -92), head: P(32, -108),
          fa: [P(40, -60), P(56, -8)], ba: [P(14, -70), P(30, -40)],
          fl: [P(30, -28), P(40, 0)], bl: [P(-24, -28), P(-38, 0)],
        };

      case 'stomp':
        if (t < su) return { ...stance, fl: [P(26, -76), P(30, -42)] };
        return {
          hip: P(0, -48), sh: P(6, -96), head: P(10, -116),
          fa: [P(30, -92), P(54, -88)], ba: [P(-20, -92), P(-44, -88)],
          fl: [P(34, -30), P(44, 0)], bl: [P(-28, -30), P(-42, 0)],
        };

      case 'slash':
        if (t < su) {
          return { ...stance, ...wide, sh: P(-2, -118), head: P(2, -138), fa: [P(4, -132), P(-8, -152)] };
        }
        return {
          ...wide,
          hip: P(2, -64), sh: P(4 + e * 12, -114), head: P(8 + e * 12, -134),
          fa: [P(lerp(8, 40, e), lerp(-130, -112, e)), P(lerp(-4, 76, e), lerp(-150, -100, e))],
          ba: [P(-6, -100), P(10, -108)],
        };

      case 'iai':
        if (t < su) return { ...crouch, fa: [P(-4, -76), P(-16, -66)] };
        return {
          hip: P(0, -52), sh: P(26, -94), head: P(36, -108),
          fa: [P(52, -96), P(86, -92)], ba: [P(-10, -80), P(-30, -70)],
          fl: [P(40, -26), P(56, 0)], bl: [P(-30, -22), P(-52, 0)],
        };

      case 'slide':
        if (t < su) return crouch;
        return {
          hip: P(-6, -34), sh: P(-20, -72), head: P(-26, -90),
          fa: [P(6, -60), P(-10, -40)], ba: [P(-34, -60), P(-48, -30)],
          fl: [P(34, -26), P(lerp(44, 82, e), -18)], bl: [P(-10, -14), P(-30, 0)],
        };

      case 'pounce':
        if (t < su) return crouch;
        return {
          hip: P(0, -74), sh: P(20, -112), head: P(32, -124),
          fa: [P(44, -110), P(68, -104)], ba: [P(36, -100), P(60, -92)],
          fl: [P(-6, -56), P(-30, -46)], bl: [P(-16, -62), P(-44, -60)],
        };

      case 'dive':
        return {
          hip: P(0, -80), sh: P(-6, -126), head: P(-6, -146),
          fa: [P(-24, -116), P(-34, -132)], ba: [P(-18, -108), P(-30, -120)],
          fl: [P(28, -52), P(54, -18)], bl: [P(-4, -66), P(-18, -48)],
        };

      case 'buff':
        if (t < su) return { ...crouch, fa: [P(26, -76), P(10, -62)], ba: [P(-14, -76), P(-2, -62)] };
        return {
          ...stance, ...wide,
          sh: P(0, -120), head: P(4, -142),
          fa: [P(30, -136), P(44, -160)], ba: [P(-18, -136), P(-30, -160)],
        };

      case 'teleport':
        return { ...stance, fa: [P(18, -100), P(12, -120)], ba: [P(10, -98), P(12, -116)] };

      default:
        return stance;
    }
  }
});
