'use strict';

// ============================================================
//  定数・ユーティリティ
// ============================================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const GROUND = 480;
const FLOOR_TOP = 440;
const GRAVITY = 0.8;
const STAGE_MIN = 40;
const STAGE_W = 1440;          // ステージの幅（画面より広く、カメラがスクロールする）
const STAGE_MAX = STAGE_W - 40;
const MAX_SPREAD = W - 120;     // 2人がこれ以上離れられない距離（画面に収まるように）
const ROUND_TIME = 99;
const WINS_NEEDED = 2;
const METER_MAX = 100;
const CHARGE_FRAMES = 36;
const TAU = Math.PI * 2;

const P = (x, y) => ({ x, y });
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const target = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const ch = v => Math.round(v + (target - v) * k);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

const ARROWS = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 6: '→', 7: '↖', 8: '↑', 9: '↗' };

// 試合中に使うランダム。種（seed）が同じなら同じ順番で出る（オンライン対戦で2台の結果をそろえる）
let rngState = 1;
function setSeed(seed) {
  rngState = (seed >>> 0) || 1;
}
function gameRand() {
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ボタンの表示名：'P' / 'K' は小でも大でも
const BTN_LABEL = { P: 'P', K: 'K', LP: '小P', HP: '大P', LK: '小K', HK: '大K', G: 'つかみ' };
function cmdLabel(m) {
  const btn = (BTN_LABEL[m.btn] || m.btn) + (m.heavy ? '（大で強化）' : '');
  if (m.cmd === 'mash') return `${btn} 連打${m.followLabel || ''}`;
  const charge = m.cmd.match(/^\[(\d)\](\d)$/);
  const dirs = charge
    ? `${ARROWS[charge[1]]}溜め ${ARROWS[charge[2]]}`
    : [...m.cmd].map(d => ARROWS[d]).join('');
  return `${m.air ? '空中 ' : ''}${dirs} + ${btn}${m.followLabel || ''}`;
}


// ============================================================
//  バトルの調整値
// ============================================================
const PUSH_H = 80;            // 押し合い判定の高さ（これより上を飛べば相手を飛び越えられる）
const JUGGLE_LIMIT = 8;
// 体力 = HP_BASE + (キャラの元の体力 - 100) × HP_SPREAD
// 全員の体力を底上げしつつ、キャラごとの差は縮める（倍率だと体力の高いキャラが倒せなくなるため）
const HP_BASE = 128;
const HP_SPREAD = 0.5;
const CHIP_METER_RATE = 3;     // 削りダメージ1をゲージで受けるのに使う量
// コンボ関連
const HITSTUN_DECAY = 0.015;    // ヒット数が増えるごとに、のけぞり時間がこの割合ずつ短くなる
const HITSTUN_MIN = 0.5;        // のけぞり時間は最短でも元の半分
const METER_GAIN = 0.6;          // ゲージの溜まる速さ（全体の倍率。1ラウンドに超必殺技を2回程度撃てるよう調整）
const MOVER_POP = -11;          // 移動多段技の最後の1発で相手を浮かせる強さ
// 吹っ飛び率：コンボのヒット数が増えるほど吹っ飛び（浮き・押し出し・バウンド）が弱くなる
// 後半ほど相手が浮かなくなって拾えなくなり、自然にコンボが終わる
const KB_DECAY = 0.03;          // 1ヒットごとに吹っ飛びがこの割合ずつ弱くなる
const KB_MIN = 0.35;            // 吹っ飛びは最低でも元の35%
const kbScale = combo => Math.max(KB_MIN, 1 - KB_DECAY * (combo - 1));
const MAX_SPECIAL_CHAIN = 2;    // 必殺技 → 必殺技のキャンセルは1コンボ2回まで（同じ技は不可）
const BOUNCE_STOP = 10;        // バウンドの瞬間に止まるフレーム数
const GROUND_BOUNCE_VY = -17;  // 地面バウンドの跳ね上がり
const BIND_IMMUNE = 150;       // 泡が割れた後、再び閉じ込められない時間
const LAUNCH_SCALE = 1.25; // 吹っ飛びの高さ（全技共通の倍率）
const LAUNCH_HEIGHT = 15 * LAUNCH_SCALE; // 打ち上げ技はすべて P→P→K と同じ高さで真上に飛ぶ
