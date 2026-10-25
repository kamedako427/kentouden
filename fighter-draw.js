'use strict';

// ファイターの描画
// （Fighter クラスの続き。メソッドを prototype に追加する）
Object.assign(Fighter.prototype, {
  // ---------- 描画 ----------
  draw(g) {
    const p = this.getPose();
    const flash = this.state === 'hitstun' && this.stateTime < 4;
    const a = this.attack;

    g.save();
    g.translate(this.x, this.y);
    g.scale(this.facing * this.size, this.size);

    // 強化オーラ
    if (this.buff) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.25 + Math.sin(this.animTime * 0.4) * 0.1;
      const gr = g.createRadialGradient(0, -80, 10, 0, -80, 95);
      gr.addColorStop(0, this.pal.aura);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(0, -80, 60, 100, 0, 0, TAU);
      g.fill();
      g.restore();
    }

    // 残像
    if (this.state === 'attack' && a.afterimage && this.stateTime >= a.startup && this.stateTime < a.startup + a.active) {
      const ghost = flatPalette(this.pal.aura);
      for (let i = 3; i >= 1; i--) {
        g.save();
        g.globalAlpha = 0.18 * this.alpha;
        g.translate(-i * 24, 0);
        this.drawFigure(g, p, ghost);
        g.restore();
      }
    }

    // 速度強化の残像
    if (this.speedTimer > 0 && (this.state === 'walk' || this.state === 'dash' || this.state === 'jump')) {
      g.save();
      g.globalAlpha = 0.2;
      g.translate(-18, 0);
      this.drawFigure(g, p, flatPalette(this.pal.aura));
      g.restore();
    }

    g.globalAlpha = this.alpha;
    this.drawFigure(g, p, flash ? WHITE_PAL : this.pal);

    // アーマー・呪い・泡
    if (this.armorHits > 0 || (this.transform > 0 && this.transformArmor > 0)) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.35 + Math.sin(this.animTime * 0.3) * 0.15;
      g.strokeStyle = this.transform > 0 ? '#ff5a2a' : '#ffd84a';
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(0, -78, 46, 92, 0, 0, TAU);
      g.stroke();
      g.restore();
    }
    if (this.curse > 0) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = this.animTime * 0.1 + i * 2.1;
        g.globalAlpha = 0.5;
        glow(g, Math.cos(a) * 30, -60 - ((this.animTime * 2 + i * 40) % 110), 9, '#b07aff');
      }
      g.restore();
    }
    if (this.bound > 0) {
      g.save();
      g.globalAlpha = 0.55;
      g.fillStyle = 'rgba(140,216,255,0.25)';
      g.strokeStyle = '#bff0ff';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, -75, 82, 0, TAU);
      g.fill();
      g.stroke();
      g.restore();
    }

    // 技のエフェクト
    if (this.state === 'attack') {
      const t = this.stateTime;
      g.globalCompositeOperation = 'lighter';
      if ((a.pose === 'cast' || a.pose === 'raise') && a.name && t < a.startup) {
        const hand = p.fa[1];
        glow(g, hand.x, hand.y, 6 + t * 1.3, this.pal.aura);
      }
      if (this.isCountering()) {
        g.strokeStyle = this.pal.aura;
        g.lineWidth = 4;
        g.globalAlpha = 0.5 + Math.sin(t * 0.8) * 0.3;
        g.beginPath();
        g.arc(14, -82, 74, 0, TAU);
        g.stroke();
        g.globalAlpha = 0.15;
        g.fillStyle = this.pal.aura;
        g.fill();
      }
      if ((a.pose === 'upper' || a.pose === 'flip' || a.pose === 'iai') && t >= a.startup && t < a.startup + a.active) {
        const hand = a.pose === 'flip' ? P(0, -80) : p.fa[1];
        glow(g, hand.x, hand.y, 26, this.pal.aura);
      }
      if (a.pose === 'gaugeUpper') {
        // 溜めで拳に力が集まり、突き上げで大きな光の柱
        const hand = p.fa[1];
        if (t < a.startup) glow(g, 0, -60, 30, '#7affc8');
        else if (t < a.startup + a.active) {
          glow(g, hand.x, hand.y, 40, '#7affc8');
          // 足元から拳までの軌跡（下まで当たることがわかるように）
          g.globalAlpha = 0.35;
          g.fillStyle = '#bfffe8';
          g.fillRect(hand.x - 12, hand.y, 24, -hand.y);
          g.globalAlpha = 1;
        }
      }
    }
    g.restore();
  },

  drawFigure(g, p, c) {
    const d = this.def;
    const th = this.thick;
    const extra = d.extra || [];
    const arm = d.bareArms ? c.skin : c.top;
    const armD = d.bareArms ? c.skinD : c.topD;
    const foot = d.barefoot ? c.skin : c.shoe;
    const footD = d.barefoot ? c.skinD : c.shoeD;
    const h = p.head;
    const wave = Math.sin(this.animTime * 0.3) * 4;

    g.save();
    if (p.rot) {
      const py = p.pivotY || -75;
      g.translate(0, py);
      g.rotate(p.rot);
      g.translate(0, -py);
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // マント
    if (extra.includes('cape')) {
      g.fillStyle = c.hatD;
      g.beginPath();
      g.moveTo(p.sh.x + 4, p.sh.y - 4);
      g.quadraticCurveTo(p.sh.x - 30, p.sh.y + 20, p.hip.x - 42 + wave, p.hip.y + 44);
      g.lineTo(p.hip.x - 6 + wave * 0.5, p.hip.y + 40);
      g.quadraticCurveTo(p.hip.x - 10, p.hip.y - 10, p.sh.x + 4, p.sh.y - 4);
      g.fill();
    }

    // マフラー
    if (extra.includes('scarf')) {
      g.strokeStyle = c.accent;
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(p.sh.x, p.sh.y - 6);
      g.quadraticCurveTo(p.sh.x - 30, p.sh.y - 12 + wave, p.sh.x - 62, p.sh.y + wave * 2);
      g.stroke();
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(p.sh.x, p.sh.y - 4);
      g.quadraticCurveTo(p.sh.x - 24, p.sh.y + 4 - wave, p.sh.x - 46, p.sh.y + 14 - wave);
      g.stroke();
    }

    this.drawHairBack(g, h, c, wave);

    const line = c.flat ? null : OUTLINE;

    // 奥側の脚・腕
    drawLimb2(g, p.hip, p.bl, 17 * th, 13 * th, c.pantsD, line);
    drawFoot(g, p.bl[0], p.bl[1], 7 * th, footD, line);
    drawLimb2(g, p.sh, p.ba, 12 * th, 10 * th, armD, line);
    this.drawHand(g, p.ba, c, true, line);

    // 胴体（肩幅が広く腰が細い）
    drawTorso(g, p.hip, p.sh, 17 * th, 12 * th, c.top, c.topD, line);
    if (d.bareArms && !c.flat) {
      // 裸の上半身：胸と腹の筋
      g.strokeStyle = 'rgba(0,0,0,0.18)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(lerp(p.hip.x, p.sh.x, 0.62) + 4, lerp(p.hip.y, p.sh.y, 0.62));
      g.lineTo(lerp(p.hip.x, p.sh.x, 0.62) + 14 * th, lerp(p.hip.y, p.sh.y, 0.55));
      g.moveTo(lerp(p.hip.x, p.sh.x, 0.2) + 8, lerp(p.hip.y, p.sh.y, 0.2));
      g.lineTo(lerp(p.hip.x, p.sh.x, 0.5) + 8, lerp(p.hip.y, p.sh.y, 0.5));
      g.stroke();
    }

    // 帯・まわし
    const ang = Math.atan2(p.sh.y - p.hip.y, p.sh.x - p.hip.x);
    g.save();
    g.translate(p.hip.x, p.hip.y);
    g.rotate(ang + Math.PI / 2);
    g.fillStyle = c.belt;
    if (line) g.strokeStyle = line;
    g.lineWidth = 2;
    if (extra.includes('mawashi')) {
      g.fillRect(-20, -9, 40, 18);
      g.fillRect(4, 6, 10, 16);
      if (line) g.strokeRect(-20, -9, 40, 18);
    } else {
      g.fillRect(-14 * th, -4, 28 * th, 8);
      g.fillRect(-16, 2, 6, 12);
      if (line) g.strokeRect(-14 * th, -4, 28 * th, 8);
    }
    g.restore();

    if (extra.includes('tags')) drawDot(g, P(p.sh.x + 8, p.sh.y + 16), 3, c.accent);

    // 首・頭
    if (line) strokePath(g, [p.sh, h], 10 * th + 4, line);
    strokePath(g, [p.sh, h], 10 * th, c.skin);
    if (line) {
      g.fillStyle = line;
      g.beginPath();
      g.ellipse(h.x, h.y, 16.5, 18, 0, 0, TAU);
      g.fill();
    }
    g.fillStyle = c.skin;
    g.beginPath();
    g.ellipse(h.x, h.y, 14.5, 16, 0, 0, TAU);
    g.fill();
    // 鼻とあご（横顔）
    g.beginPath();
    g.moveTo(h.x + 12, h.y - 2);
    g.lineTo(h.x + 17, h.y + 4);
    g.lineTo(h.x + 12, h.y + 6);
    g.fill();
    // 耳
    if (!c.flat) drawDot(g, P(h.x - 3, h.y + 1), 3.5, c.skinD);
    this.drawHair(g, h, c);
    this.drawHeadgear(g, h, c, wave);

    // ヒゲ
    if (extra.includes('beard')) {
      g.fillStyle = c.hair;
      g.beginPath();
      g.moveTo(h.x + 13, h.y + 3);
      g.lineTo(h.x + 4, h.y + 38);
      g.lineTo(h.x - 6, h.y + 8);
      g.closePath();
      g.fill();
    }

    // 目・眉
    if (this.state !== 'ko' && this.state !== 'down' && !c.flat) {
      const hurt = this.state === 'hitstun';
      if (d.glowEyes) {
        g.fillStyle = c.accent;
        g.shadowColor = c.accent;
        g.shadowBlur = 8;
        g.fillRect(h.x + 5, h.y - 4, 6, 3);
        g.shadowBlur = 0;
      } else {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.ellipse(h.x + 8, h.y - 2, 3.4, hurt ? 1 : 2.6, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#1a1010';
        g.fillRect(h.x + 8.5, h.y - (hurt ? 1 : 3.2), 2.4, hurt ? 2 : 4.4);
      }
      g.strokeStyle = '#1a1010';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(h.x + 3, h.y - (hurt ? 8 : 6));
      g.lineTo(h.x + 12, h.y - (hurt ? 6 : 8));
      g.stroke();
    }

    // 手前の脚・腕
    drawLimb2(g, p.hip, p.fl, 17.5 * th, 13.5 * th, c.pants, line);
    drawFoot(g, p.fl[0], p.fl[1], 7.5 * th, foot, line);
    drawLimb2(g, p.sh, p.fa, 13 * th, 11 * th, arm, line);
    this.drawHand(g, p.fa, c, false, line);

    g.restore();
  },

  drawHand(g, [el, hd], c, back, line = null) {
    const extra = this.def.extra || [];
    if (extra.includes('gloves')) {
      drawFist(g, hd, 10, back ? c.gloveD : c.glove, line);
    } else {
      drawFist(g, hd, 7.5 * this.thick, back ? c.skinD : c.skin, line);
    }
    const ang = Math.atan2(hd.y - el.y, hd.x - el.x);
    if (extra.includes('claws')) {
      g.strokeStyle = back ? '#bbbbbb' : '#f4f4f4';
      g.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) {
        const a2 = ang + i * 0.35;
        g.beginPath();
        g.moveTo(hd.x + Math.cos(a2) * 6, hd.y + Math.sin(a2) * 6);
        g.lineTo(hd.x + Math.cos(a2) * 18, hd.y + Math.sin(a2) * 18);
        g.stroke();
      }
    }
    if (!back && extra.includes('staff')) {
      const ux = Math.cos(ang), uy = Math.sin(ang);
      g.strokeStyle = '#7a4a24';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(hd.x - ux * 70, hd.y - uy * 70);
      g.lineTo(hd.x + ux * 80, hd.y + uy * 80);
      g.stroke();
      g.strokeStyle = '#d4a020';
      g.lineWidth = 7;
      for (const k of [-70, 80]) {
        g.beginPath();
        g.moveTo(hd.x + ux * k, hd.y + uy * k);
        g.lineTo(hd.x + ux * (k - Math.sign(k) * 8), hd.y + uy * (k - Math.sign(k) * 8));
        g.stroke();
      }
    }
    if (!back && extra.includes('sword')) {
      const ux = Math.cos(ang), uy = Math.sin(ang);
      // 刃
      g.save();
      g.globalAlpha *= 0.4;
      g.strokeStyle = c.aura;
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(hd.x + ux * 10, hd.y + uy * 10);
      g.lineTo(hd.x + ux * 80, hd.y + uy * 80);
      g.stroke();
      g.restore();
      g.strokeStyle = '#eef8ff';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(hd.x + ux * 10, hd.y + uy * 10);
      g.lineTo(hd.x + ux * 80, hd.y + uy * 80);
      g.stroke();
      // 柄とつば
      g.strokeStyle = '#3a2a2a';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(hd.x - ux * 10, hd.y - uy * 10);
      g.lineTo(hd.x + ux * 6, hd.y + uy * 6);
      g.stroke();
      g.strokeStyle = '#d4a020';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(hd.x + ux * 8 - uy * 7, hd.y + uy * 8 + ux * 7);
      g.lineTo(hd.x + ux * 8 + uy * 7, hd.y + uy * 8 - ux * 7);
      g.stroke();
    }
  },

  drawHairBack(g, h, c, wave) {
    const style = this.def.hair;
    g.fillStyle = c.hair;
    g.strokeStyle = c.hair;
    if (this.def.head === 'hood') {
      g.fillStyle = c.hat;
      g.beginPath();
      g.arc(h.x - 3, h.y - 1, 21, 0, TAU);
      g.fill();
      g.beginPath();
      g.moveTo(h.x - 20, h.y + 4);
      g.lineTo(h.x - 26 + wave * 0.4, h.y + 36);
      g.lineTo(h.x + 6, h.y + 20);
      g.fill();
    }
    if (style === 'long' || style === 'sage') {
      const len = style === 'long' ? 50 : 34;
      g.beginPath();
      g.moveTo(h.x + 6, h.y - 13);
      g.quadraticCurveTo(h.x - 30, h.y - 10, h.x - 24 + wave * 0.5, h.y + len);
      g.lineTo(h.x - 8 + wave * 0.5, h.y + len - 4);
      g.quadraticCurveTo(h.x - 12, h.y + 6, h.x + 6, h.y - 13);
      g.fill();
    } else if (style === 'ponytail') {
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(h.x - 12, h.y - 10);
      g.quadraticCurveTo(h.x - 34, h.y - 14, h.x - 42, h.y + 18 + wave);
      g.stroke();
    }
  },

  drawHair(g, h, c) {
    const style = this.def.hair;
    g.fillStyle = c.hair;
    const cap = () => {
      g.beginPath();
      g.arc(h.x, h.y - 2, 15.5, Math.PI * 0.95, Math.PI * 2.05);
      g.fill();
    };
    const poly = pts => {
      g.beginPath();
      g.moveTo(h.x + pts[0][0], h.y + pts[0][1]);
      for (const [x, y] of pts.slice(1)) g.lineTo(h.x + x, h.y + y);
      g.closePath();
      g.fill();
    };
    switch (style) {
      case 'short':
      case 'long':
      case 'ponytail':
        cap();
        break;
      case 'spiky':
        cap();
        poly([[12, -10], [10, -26], [2, -15], [-6, -30], [-9, -14], [-24, -24], [-15, -2]]);
        break;
      case 'wild':
        cap();
        poly([[10, -12], [6, -30], [-2, -18], [-10, -34], [-14, -16], [-32, -22], [-20, -4], [-34, 8], [-14, 6]]);
        // 耳
        poly([[0, -12], [4, -34], [12, -14]]);
        break;
      case 'flat':
        cap();
        g.fillRect(h.x - 14, h.y - 26, 26, 14);
        break;
      case 'buns':
        cap();
        drawDot(g, P(h.x - 11, h.y - 13), 7, c.hair);
        drawDot(g, P(h.x + 3, h.y - 17), 6.5, c.hair);
        break;
      case 'mohawk':
        poly([[10, -11], [8, -30], [2, -17], [-4, -34], [-8, -16], [-16, -30], [-15, -8]]);
        break;
      case 'bald':
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.beginPath();
        g.ellipse(h.x + 2, h.y - 10, 5, 2.5, 0, 0, TAU);
        g.fill();
        break;
      case 'topknot':
        g.beginPath();
        g.arc(h.x, h.y - 1, 15.5, Math.PI * 1.0, Math.PI * 1.95);
        g.fill();
        g.beginPath();
        g.ellipse(h.x - 3, h.y - 18, 8, 5, -0.3, 0, TAU);
        g.fill();
        break;
      case 'sage':
        g.beginPath();
        g.arc(h.x, h.y, 16, Math.PI * 0.55, Math.PI * 1.25);
        g.lineTo(h.x - 2, h.y - 2);
        g.closePath();
        g.fill();
        // 頭頂のツヤ
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.beginPath();
        g.ellipse(h.x + 2, h.y - 10, 5, 2.5, 0, 0, TAU);
        g.fill();
        break;
    }
  },

  drawHeadgear(g, h, c, wave) {
    switch (this.def.head) {
      case 'band':
        g.strokeStyle = c.accent;
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(h.x - 15, h.y - 4);
        g.lineTo(h.x + 15, h.y - 4);
        g.stroke();
        g.lineWidth = 3.5;
        g.beginPath();
        g.moveTo(h.x - 14, h.y - 4);
        g.quadraticCurveTo(h.x - 24, h.y - 6 + wave, h.x - 34, h.y + wave * 1.5);
        g.moveTo(h.x - 14, h.y - 3);
        g.quadraticCurveTo(h.x - 22, h.y + 2 - wave, h.x - 30, h.y + 8 - wave);
        g.stroke();
        break;
      case 'kasa':
        g.fillStyle = c.hat;
        g.beginPath();
        g.moveTo(h.x - 32, h.y - 6);
        g.lineTo(h.x + 2, h.y - 32);
        g.lineTo(h.x + 34, h.y - 6);
        g.quadraticCurveTo(h.x + 2, h.y - 12, h.x - 32, h.y - 6);
        g.fill();
        g.strokeStyle = c.hatD;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(h.x + 2, h.y - 32);
        g.lineTo(h.x - 14, h.y - 8);
        g.moveTo(h.x + 2, h.y - 32);
        g.lineTo(h.x + 18, h.y - 8);
        g.stroke();
        break;
      case 'horns':
        g.fillStyle = c.hat;
        for (const [bx, tx] of [[-6, -14], [6, 10]]) {
          g.beginPath();
          g.moveTo(h.x + bx - 4, h.y - 11);
          g.lineTo(h.x + tx, h.y - 34);
          g.lineTo(h.x + bx + 4, h.y - 13);
          g.closePath();
          g.fill();
        }
        break;
      case 'hood':
        g.fillStyle = c.hat;
        g.beginPath();
        g.arc(h.x - 1, h.y - 2, 17.5, Math.PI * 1.0, Math.PI * 2.0);
        g.fill();
        break;
      case 'luchamask':
        g.fillStyle = c.hat;
        g.beginPath();
        g.arc(h.x, h.y, 15.8, 0, TAU);
        g.fill();
        g.fillStyle = c.accent;
        g.beginPath();
        g.ellipse(h.x + 7, h.y - 2, 6, 4, 0, 0, TAU);
        g.fill();
        g.fillStyle = c.skin;
        g.fillRect(h.x + 4, h.y + 6, 8, 3);
        break;
      case 'mask':
        g.fillStyle = c.topD;
        g.beginPath();
        g.arc(h.x, h.y, 15.8, -0.05, Math.PI * 0.95);
        g.closePath();
        g.fill();
        break;
      case 'ribbon':
        g.fillStyle = c.accent;
        g.beginPath();
        g.moveTo(h.x - 14, h.y - 8);
        g.lineTo(h.x - 26, h.y - 16);
        g.lineTo(h.x - 26, h.y);
        g.closePath();
        g.moveTo(h.x - 14, h.y - 8);
        g.lineTo(h.x - 6, h.y - 20);
        g.lineTo(h.x - 2, h.y - 10);
        g.closePath();
        g.fill();
        break;
    }
  },

  drawShadow(g) {
    const height = GROUND - this.y;
    const s = Math.max(0.4, 1 - height / 300) * this.size;
    const lying = (this.state === 'ko' || this.state === 'down') && this.onGround;
    g.fillStyle = `rgba(0,0,0,${0.35 * this.alpha})`;
    g.beginPath();
    g.ellipse(this.x - (lying ? this.facing * 10 : 0), GROUND + 2, (lying ? 70 : 40) * s, 8 * s, 0, 0, TAU);
    g.fill();
  }
});
