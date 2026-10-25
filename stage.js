'use strict';

// ============================================================
//  背景（スクロールに合わせて奥ほどゆっくり動く3層）
//   sky : 空・星・夕日（動かない）
//   far : 遠くの山（カメラの半分の速さで動く）
//   near: 鳥居・灯籠・床（ステージと一緒に動く）
// ============================================================
const FAR_PARALLAX = 0.5;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function buildBackground() {
  // ---- 空 ----
  const [sky, gs] = makeCanvas(W, FLOOR_TOP);
  const grad = gs.createLinearGradient(0, 0, 0, FLOOR_TOP);
  grad.addColorStop(0, '#140c2e');
  grad.addColorStop(0.45, '#4a2366');
  grad.addColorStop(0.8, '#d9645a');
  grad.addColorStop(1, '#ffb36b');
  gs.fillStyle = grad;
  gs.fillRect(0, 0, W, FLOOR_TOP);
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5) % W;
    const y = (i * 71.3) % 200;
    gs.fillStyle = `rgba(255,255,255,${0.15 + ((i * 13) % 10) / 16})`;
    gs.fillRect(x, y, 1.6, 1.6);
  }
  const sun = gs.createRadialGradient(640, 330, 10, 640, 330, 170);
  sun.addColorStop(0, 'rgba(255,245,210,1)');
  sun.addColorStop(0.3, 'rgba(255,180,110,0.95)');
  sun.addColorStop(1, 'rgba(255,120,80,0)');
  gs.fillStyle = sun;
  gs.fillRect(400, 120, 480, 330);

  // ---- 遠くの山 ----
  const farW = Math.ceil(W + (STAGE_W - W) * FAR_PARALLAX);
  const [far, gf] = makeCanvas(farW, FLOOR_TOP);
  const ridge = (baseY, amp, color, seed) => {
    gf.fillStyle = color;
    gf.beginPath();
    gf.moveTo(0, FLOOR_TOP);
    for (let x = 0; x <= farW; x += 6) {
      const y = baseY
        - amp * (0.5 + 0.5 * Math.sin(x * 0.006 + seed)) * (0.6 + 0.4 * Math.sin(x * 0.017 + seed * 2))
        - 8 * Math.sin(x * 0.05 + seed);
      gf.lineTo(x, y);
    }
    gf.lineTo(farW, FLOOR_TOP);
    gf.closePath();
    gf.fill();
  };
  ridge(330, 130, '#5a2a5e', 1);
  ridge(385, 90, '#3a1b45', 4);
  ridge(425, 45, '#24122e', 7);

  // ---- 手前（鳥居・灯籠・床） ----
  const [near, g] = makeCanvas(STAGE_W, H);
  const torii = cx => {
    g.fillStyle = '#1a0b1f';
    g.fillRect(cx - 62, 296, 13, 144);
    g.fillRect(cx + 49, 296, 13, 144);
    g.fillRect(cx - 76, 318, 152, 9);
    g.fillRect(cx - 8, 300, 16, 20);
    g.beginPath();
    g.moveTo(cx - 92, 282);
    g.quadraticCurveTo(cx, 296, cx + 92, 282);
    g.lineTo(cx + 88, 296);
    g.quadraticCurveTo(cx, 306, cx - 88, 296);
    g.closePath();
    g.fill();
  };
  const lantern = x => {
    g.fillStyle = '#1a0b1f';
    g.fillRect(x - 3, 380, 6, 60);
    g.fillRect(x - 12, 372, 24, 8);
    g.fillStyle = 'rgba(255,190,90,0.9)';
    g.fillRect(x - 8, 354, 16, 18);
    g.fillStyle = '#1a0b1f';
    g.beginPath();
    g.moveTo(x - 16, 356);
    g.lineTo(x, 342);
    g.lineTo(x + 16, 356);
    g.fill();
  };
  torii(180);
  torii(STAGE_W / 2);
  lantern(STAGE_W / 2 - 170);
  lantern(STAGE_W / 2 + 170);
  lantern(STAGE_W - 260);
  lantern(STAGE_W - 190);

  const fl = g.createLinearGradient(0, FLOOR_TOP, 0, H);
  fl.addColorStop(0, '#6a4440');
  fl.addColorStop(1, '#1e1216');
  g.fillStyle = fl;
  g.fillRect(0, FLOOR_TOP, STAGE_W, H - FLOOR_TOP);

  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 1.5;
  const vy = 300;
  const cx = STAGE_W / 2;
  for (let i = -20; i <= 20; i++) {
    const xb = cx + i * 90;
    const xt = cx + i * 90 * ((FLOOR_TOP - vy) / (H - vy));
    g.beginPath();
    g.moveTo(xt, FLOOR_TOP);
    g.lineTo(xb, H);
    g.stroke();
  }
  for (let k = 1; k <= 6; k++) {
    const y = FLOOR_TOP + (H - FLOOR_TOP) * Math.pow(k / 6, 1.6);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(STAGE_W, y);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,200,150,0.3)';
  g.fillRect(0, FLOOR_TOP, STAGE_W, 2);

  return { sky, far, near };
}

function buildVignette() {
  const [c, g] = makeCanvas(W, H);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return c;
}
