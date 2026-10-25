'use strict';

// ============================================================
//  描画ヘルパー
// ============================================================
function drawLimb(g, a, [b, c], width, color) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.lineTo(c.x, c.y);
  g.stroke();
}

// 輪郭線つきの体のパーツ（line が null なら輪郭なし：残像など）
const OUTLINE = '#17121f';
function strokePath(g, pts, w, color) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.stroke();
}
// 腕・脚：根元が太く、先が細い2本の線（先に輪郭をまとめて描いてから中を塗る）
function drawLimb2(g, a, [b, c], w1, w2, color, line) {
  if (line) {
    strokePath(g, [a, b], w1 + 4, line);
    strokePath(g, [b, c], w2 + 4, line);
  }
  strokePath(g, [a, b], w1, color);
  strokePath(g, [b, c], w2, color);
}
// 胴体：肩幅が広く、腰が細い台形。背中側に影
function drawTorso(g, hip, sh, wSh, wHip, color, dark, line) {
  const dx = sh.x - hip.x, dy = sh.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // 背骨に直角（+ が前）
  const pts = [
    P(hip.x - nx * wHip, hip.y - ny * wHip), P(sh.x - nx * wSh - dx * 0.06, sh.y - ny * wSh - dy * 0.06),
    P(sh.x + nx * wSh * 0.9 - dx * 0.06, sh.y + ny * wSh * 0.9 - dy * 0.06), P(hip.x + nx * wHip, hip.y + ny * wHip),
  ];
  const path = () => {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    g.lineTo(pts[1].x, pts[1].y);
    g.quadraticCurveTo(sh.x + dx * 0.12, sh.y + dy * 0.12, pts[2].x, pts[2].y);
    g.quadraticCurveTo((pts[2].x + pts[3].x) / 2 + nx * 4, (pts[2].y + pts[3].y) / 2 + ny * 4, pts[3].x, pts[3].y);
    g.closePath();
  };
  g.lineJoin = 'round';
  if (line) {
    path();
    g.strokeStyle = line;
    g.lineWidth = 5;
    g.stroke();
  }
  path();
  g.fillStyle = color;
  g.fill();
  // 背中側の影
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  g.lineTo(pts[1].x, pts[1].y);
  g.lineTo(pts[1].x + nx * wSh * 0.55, pts[1].y + ny * wSh * 0.55);
  g.lineTo(pts[0].x + nx * wHip * 0.55, pts[0].y + ny * wHip * 0.55);
  g.closePath();
  g.fill();
}
// 拳
function drawFist(g, pt, r, color, line) {
  if (line) drawDot(g, pt, r + 2, line);
  drawDot(g, pt, r, color);
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(pt.x + r * 0.2, pt.y - r * 0.6);
  g.lineTo(pt.x + r * 0.2, pt.y + r * 0.6);
  g.stroke();
}
// 足：すねの向きに合わせて前を向いた靴の形
function drawFoot(g, knee, ankle, r, color, line) {
  const a = Math.atan2(ankle.y - knee.y, ankle.x - knee.x) - Math.PI / 2;
  g.save();
  g.translate(ankle.x, ankle.y);
  g.rotate(a);
  const shape = () => {
    g.beginPath();
    g.ellipse(r * 0.55, 0, r * 1.45, r * 0.75, 0, 0, TAU);
  };
  if (line) {
    g.strokeStyle = line;
    g.lineWidth = 4;
    shape();
    g.stroke();
  }
  g.fillStyle = color;
  shape();
  g.fill();
  g.restore();
}

function drawDot(g, pt, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(pt.x, pt.y, r, 0, TAU);
  g.fill();
}

function glow(g, x, y, r, color) {
  const gr = g.createRadialGradient(x, y, 1, x, y, r);
  gr.addColorStop(0, '#fff');
  gr.addColorStop(0.35, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
