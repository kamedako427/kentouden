'use strict';

// ============================================================
//  技データ
// ============================================================
// box は「前方向へのx, 足元からのy, 幅, 高さ」（キャラの大きさで拡縮）
// level: 'mid'（立ち・しゃがみ両方でガード可）/ 'low'（しゃがみガードのみ）/ 'high'（立ちガードのみ）
// cancel.special: ヒット・ガードさせた時に必殺技でキャンセル可能
// cancel.chain:   続けて出せる通常技 / cancel.target: 特定のボタンで派生する連続技
// ※ COMMON はどれも「必殺技にだけキャンセルできる」。通常技どうしのつながりはキャラごとに normals.js で決める
const COMMON = {
  jab: {
    label: 'ジャブ', input: 'P', pose: 'punch', startup: 3, active: 3, recovery: 7,
    damage: 4, chip: 0, hitstun: 14, blockstun: 9, push: 1.5, meter: 4,
    box: { x: 20, y: -130, w: 62, h: 38 },
    cancel: { special: true },
  },
  straight: {
    label: 'ストレート', input: 'P → P', pose: 'punch', startup: 5, active: 3, recovery: 10,
    damage: 6, chip: 0, hitstun: 17, blockstun: 11, push: 2, meter: 6,
    box: { x: 20, y: -130, w: 74, h: 38 },
    cancel: { special: true },
  },
  finisher: {
    label: '打ち上げ蹴り', input: 'P → P → K', pose: 'upkick', startup: 7, active: 5, recovery: 20,
    damage: 7, chip: 1, hitstun: 26, blockstun: 12, push: 2, meter: 8, launch: 15,
    box: { x: 10, y: -165, w: 82, h: 115 },
    cancel: { special: true },
  },
  kick: {
    label: '回し蹴り', input: 'K', pose: 'kick', startup: 8, active: 5, recovery: 15,
    damage: 9, chip: 1, hitstun: 19, blockstun: 12, push: 7, meter: 8,
    box: { x: 20, y: -92, w: 88, h: 32 },
    cancel: { special: true },
  },
  crouchJab: {
    label: 'しゃがみパンチ', input: '↓ + P', pose: 'cpunch', crouch: true, startup: 3, active: 3, recovery: 7,
    damage: 3.5, chip: 0, hitstun: 13, blockstun: 8, push: 1.5, meter: 4,
    box: { x: 20, y: -86, w: 62, h: 32 },
    cancel: { special: true },
  },
  sweep: {
    label: '足払い（下段・空中の相手はすくい上げ）', input: '↓ + K', pose: 'sweep', crouch: true, level: 'low', startup: 8, active: 5, recovery: 20,
    damage: 8, chip: 1, hitstun: 24, blockstun: 12, push: 4, meter: 8, launch: 4, scoop: true,
    box: { x: 10, y: -50, w: 104, h: 50 },
    cancel: { special: true },
  },
  elbow: {
    label: '踏み込み肘', input: '→ + P', pose: 'elbow', step: 5, startup: 8, active: 4, recovery: 12,
    damage: 7, chip: 1, hitstun: 18, blockstun: 11, push: 2, meter: 6,
    box: { x: 15, y: -132, w: 58, h: 46 },
    cancel: { special: true },
  },
  overhead: {
    label: '踵落とし（中段）', input: '→ + K', pose: 'axe', level: 'high', step: 2, startup: 18, active: 4, recovery: 14,
    damage: 8, chip: 1, hitstun: 20, blockstun: 12, push: 4, meter: 6,
    box: { x: 15, y: -165, w: 72, h: 165 },
  },
  throw: {
    label: '投げ（空振りあり）', input: 'つかみ / ← + つかみで後ろ投げ', pose: 'grab', grab: true, throw: true,
    startup: 4, active: 3, recovery: 26,
    damage: 12, hitstun: 30, push: 6, launch: 8, meter: 8,
    box: { x: 10, y: -130, w: 46, h: 110 },
  },
  uppercut: {
    label: '対空アッパー（打ち上げ）', input: '← + P', pose: 'upper', startup: 6, active: 4, recovery: 18,
    damage: 7, chip: 1, hitstun: 26, blockstun: 12, push: 2, meter: 8, launch: 15,
    box: { x: 5, y: -178, w: 78, h: 120 },
    cancel: { special: true },
  },
  dashPunch: {
    label: 'ダッシュストレート', input: 'ダッシュ中 P', pose: 'rush', step: 6, startup: 5, active: 6, recovery: 14,
    move: { vx: 7 }, stopOnHit: true,
    damage: 8, chip: 1, hitstun: 18, blockstun: 11, push: 6, meter: 7,
    box: { x: 15, y: -135, w: 60, h: 42 },
    cancel: { special: true },
  },
  slide: {
    label: 'スライディング（下段）', input: 'ダッシュ中 K', pose: 'slide', crouch: true, level: 'low', startup: 5, active: 12, recovery: 16,
    move: { vx: 8 }, stopOnHit: true,
    damage: 7, chip: 1, hitstun: 22, blockstun: 12, push: 4, meter: 7, launch: 4,
    box: { x: 20, y: -50, w: 72, h: 46 },
  },
  diveKick: {
    label: '急降下キック', input: '空中 ↓ + K', pose: 'dive', air: true, endOnLand: true, startup: 4, active: 30, recovery: 6,
    move: { vx: 5, vy: 9, sustainY: true },
    damage: 7, chip: 1, hitstun: 16, blockstun: 10, push: 5, meter: 6,
    box: { x: 5, y: -62, w: 62, h: 62 },
    cancel: { special: true },
  },
  airPunch: {
    label: '空中パンチ', input: '空中 P', pose: 'airpunch', air: true, startup: 4, active: 6, recovery: 8,
    damage: 6, chip: 0, hitstun: 16, blockstun: 10, push: 4, meter: 5,
    box: { x: 15, y: -124, w: 62, h: 38 },
    cancel: { special: true },
  },
  // ---------- 大攻撃（大P＝R / 大K＝T）。小攻撃からつながり、必殺技でキャンセルできる ----------
  hp: {
    label: '正拳突き', input: '大P', pose: 'punch', startup: 7, active: 4, recovery: 16,
    damage: 9, chip: 1, hitstun: 21, blockstun: 13, push: 2, meter: 9,
    box: { x: 20, y: -134, w: 88, h: 44 }, cancel: { special: true },
  },
  hk: {
    label: '上段回し蹴り', input: '大K', pose: 'kick', startup: 10, active: 5, recovery: 20,
    damage: 11, chip: 1, hitstun: 22, blockstun: 13, push: 3, meter: 10,
    box: { x: 20, y: -140, w: 104, h: 44 }, cancel: { special: true },
  },
  chp: {
    label: 'しゃがみ突き上げ（対空）', input: '↓ + 大P', pose: 'upper', crouch: true, startup: 6, active: 5, recovery: 18,
    damage: 8, chip: 1, hitstun: 22, blockstun: 12, push: 3, meter: 8,
    box: { x: 10, y: -175, w: 92, h: 135 }, cancel: { special: true },
  },
  chk: {
    label: '大足払い（下段・ダウン）', input: '↓ + 大K', pose: 'sweep', crouch: true, level: 'low', startup: 9, active: 5, recovery: 24,
    damage: 10, chip: 1, hitstun: 26, blockstun: 13, push: 4, meter: 10, launch: 7,
    box: { x: 10, y: -48, w: 132, h: 48 }, cancel: { special: true },
  },
  ahp: {
    label: '空中正拳', input: '空中 大P', pose: 'airpunch', air: true, startup: 6, active: 5, recovery: 10,
    damage: 9, chip: 1, hitstun: 20, blockstun: 11, push: 4, meter: 8,
    box: { x: 15, y: -132, w: 78, h: 50 }, cancel: { special: true },
  },
  ahk: {
    label: '飛び横蹴り', input: '空中 大K', pose: 'airkick', air: true, startup: 7, active: 8, recovery: 10,
    damage: 10, chip: 1, hitstun: 20, blockstun: 11, push: 6, meter: 9,
    box: { x: 10, y: -86, w: 92, h: 44 }, cancel: { special: true },
  },
  airH: {
    // 相手を上に蹴り上げながら、自分も一緒に上昇する（空中コンボを高い所で続けられる）
    label: '空中蹴り上げ（自分も上昇）', input: '空中 つかみ', pose: 'upkick', air: true, startup: 5, active: 6, recovery: 10,
    hop: { vx: 1.5, vy: -9 }, airLift: -10.5,
    damage: 6, chip: 1, hitstun: 22, blockstun: 10, push: 1, meter: 6,
    box: { x: 5, y: -175, w: 70, h: 120 },
    cancel: { special: true },
  },
  airKick: {
    label: '飛び蹴り', input: '空中 K', pose: 'airkick', air: true, startup: 5, active: 10, recovery: 8,
    damage: 9, chip: 1, hitstun: 18, blockstun: 11, push: 6, meter: 8,
    box: { x: 10, y: -72, w: 76, h: 34 },
    cancel: { special: true },
  },
};

// ゲージを使う全キャラ共通の追撃技（つかみボタン・ゲージ1/3）。
// どの技の後隙からでも出せる（ゲージ技どうしは除く）。当たると吹っ飛び率がリセットされ、使った技をもう一度当てられる。
// 永久コンボ防止：ゲージ技自身の後隙は長く、リセット後のコンボではゲージが溜まらない
const GAUGE_COST = METER_MAX / 3;
const METER_MOVES = [
  {
    // しゃがんで半回転しながら、ステップ2回分ほど踏み込み、前を向きつつ立ち上がってアッパー。
    // 出が速く、足元から頭の上まで当たる。当たった後の隙が短く、ジャンプキャンセルや必殺技で追撃できる
    name: 'ゲージ打ち上げ', cmd: '236', btn: 'G', cost: GAUGE_COST, meterMove: true, noMeter: true, resetCombo: true,
    ai: 'gauge', pose: 'gaugeUpper', startup: 3, active: 16, recovery: 14, move: { vx: 11 }, stopOnHit: true,
    box: { x: 5, y: -190, w: 72, h: 190 }, damage: 6, chip: 0, hitstun: 30, launch: 15, push: 2,
  },
  {
    // 全方向に衝撃波（ロマンキャンセルのように空中・ステップ中・技の後隙からでも出せ、ステップの勢いは残る）。
    // 空中にいる相手にだけ当たる単発攻撃。上に浮かせて、着地でバウンドしたところを追撃できる
    name: 'ゲージ衝撃波', cmd: '5', cost: GAUGE_COST, meterMove: true, noMeter: true, resetCombo: true, popBounce: true, anyAir: true,
    airOnly: true, keepMomentum: true, airHover: true, rcKey: true, btn: 'Y',
    ai: 'gauge', pose: 'buff', fx: 'shockwave', startup: 10, active: 4, recovery: 30,
    box: { x: -3000, y: -3000, w: 6000, h: 3000 }, damage: 5, chip: 0, hitstun: 34, push: 0,
  },
];

const COMMON_EXTRA = [
  { label: 'ゲージ打ち上げ（ゲージ1/3・リセット）', input: '↓↘→ + つかみ（技の後隙からでも可）' },
  { label: 'ロマンキャンセル（ゲージ衝撃波・ゲージ1/3）', input: 'Y（2Pは U）。空中の相手に全方向・バウンド・リセット。空中なら浮いたまま' },
  { label: 'ボタン', input: '小P=F 大P=R 小K=G 大K=T つかみ=H ロマキャン=Y（技表の P・K は小）' },
  { label: '小攻撃 → 大攻撃 → 必殺技', input: '小攻撃が当たったら大攻撃につながる' },
  { label: 'ダッシュ / バックステップ', input: '→→ / ←←' },
  { label: 'ジャンプキャンセル（空中コンボ）', input: '打ち上げ技ヒット時に ↑' },
  { label: '投げ抜け', input: 'つかまれた瞬間に つかみ' },
  { label: 'プッシュガード（ゲージ25%）', input: 'ガード硬直中に つかみ' },
  { label: 'ゲージガード（削りダメージ無効）', input: 'ゲージがあれば自動' },
  { label: '受け身転がり', input: 'ダウン中に → / ←' },
  { label: '立ちガード（中段を防ぐ）', input: '←' },
  { label: 'しゃがみガード（下段を防ぐ）', input: '↓' },
  { label: '必殺技キャンセル', input: '通常技ヒット中にコマンド' },
  { label: '必殺技 → 別の必殺技（1コンボ1回）', input: '必殺技ヒット中にコマンド' },
  { label: '打ち上げ必殺技のジャンプキャンセル', input: 'ヒット時に ↑' },
  { label: '超必殺技キャンセル', input: '必殺技ヒット中にコマンド' },
];


const MOVE_DEFAULTS = {
  startup: 8, active: 4, recovery: 16, damage: 10, chip: 2,
  hitstun: 20, blockstun: 14, push: 6, meter: 8, hits: 1, hitInterval: 99,
};

const PROJ_DEFAULTS = {
  speed: 8, w: 36, h: 30, damage: 10, chip: 2, hitstun: 20, blockstun: 14,
  push: 6, meter: 6, hits: 1, hitInterval: 99, life: 400, delay: 0,
};

// 飛んでいくタイプの飛び道具（画面に1つまで・相殺あり）
const PROJ_TRAVEL = new Set([
  'orb', 'shuriken', 'ofuda', 'fire', 'blade', 'bolt', 'wave', 'rock', 'fist',
  'missile', 'tornado', 'bubble', 'scythe', 'tsunami', 'chain', 'windblade',
]);
// その場に出る飛び道具（自分の前方 offset の位置に発生）
const PROJ_STATIONARY = new Set(['pillar', 'holy', 'mine', 'vortex', 'barrier', 'curse', 'updraft']);

// 技のボタン指定: 'P' / 'K' は小でも大でも、'LP' 'HP' 'LK' 'HK' はその強さだけ、'G' はつかみ
function btnMatch(want, b) {
  if (!want || !b) return false;
  if (want === b.btn) return true;
  return want.length === 2 && want[1] === b.btn && want[0] === (b.heavy ? 'H' : 'L');
}
// 派生技（follow）のキー
const FOLLOW_KEYS = ['P', 'K', 'LP', 'HP', 'LK', 'HK'];

// 方向キーとボタン（小・大）から通常技を選ぶ。
// 地上で ↙ ↘ ← → ＋ 大P / 大K には、キャラごとのコマンド通常技（d1hk = ↙＋大K など）がある時はそれが出る
const CMD_NORMAL_DIRS = { 1: 'd1', 3: 'd3', 4: 'd4', 6: 'd6' };
function pickNormal(btn, d, heavy, air, normals) {
  if (btn === 'G') return 'airH';
  if (!air && heavy && normals && CMD_NORMAL_DIRS[d]) {
    const k = CMD_NORMAL_DIRS[d] + (btn === 'P' ? 'hp' : 'hk');
    if (normals[k]) return k;
  }
  if (air) {
    if (btn === 'P') return heavy ? 'ahp' : 'airPunch';
    return d <= 3 ? 'diveKick' : heavy ? 'ahk' : 'airKick';
  }
  if (d <= 3) return btn === 'P' ? (heavy ? 'chp' : 'crouchJab') : (heavy ? 'chk' : 'sweep');
  if (btn === 'P') return d === 6 ? 'elbow' : d === 4 ? 'uppercut' : heavy ? 'hp' : 'jab';
  return d === 6 ? 'overhead' : heavy ? 'hk' : 'kick';
}
// 大攻撃のキー
const HEAVY_KEYS = ['hp', 'hk', 'chp', 'chk', 'ahp', 'ahk'];

// 「同じ技はコンボ中に1回だけ」の判定に使う技の名前（飛び道具は 'proj:技名'）
function moveKeyOf(m) {
  if (!m) return '';
  return m.projectile || m.projectiles ? 'proj:' + m.name : (m.name || m.key || m.label);
}

// 移動しながら当てる多段技（移動多段技）かどうか
function isMoverMove(m) {
  return !!m && (m.hits || 1) >= 3 && !!m.box && ((m.move && m.move.vx >= 4) || (m.steer || 0) >= 6);
}

const holy = (offset, delay) => ({
  kind: 'holy', offset, delay, life: 24, w: 60, h: 210, hits: 2, hitInterval: 9,
  damage: 8, chip: 2, hitstun: 24, launch: 12, push: 2, color: '#ff9ab0',
});
// ネオンのリズムラッシュ：タイミングよく P を押すと最大5段まで続く
function rhythmStep(i) {
  const last = i === 4;
  return {
    name: i === 0 ? 'リズムラッシュ' : `リズムラッシュ ${i + 1}`,
    pose: last ? 'upper' : 'punch', startup: 4, active: 3, recovery: last ? 22 : 12,
    box: { x: 20, y: last ? -170 : -135, w: 78, h: last ? 120 : 44 },
    damage: 3 + i, hitstun: 18, push: 1.5, ...(last ? { launch: 15 } : { follow: { from: 8, to: 13, P: rhythmStep(i + 1) } }),
  };
}

// 段々上にいく多段技：相手を抱えたまま少しずつ上昇し、最後に軽く浮かせる。
// 終わった後は空中で動けるので、そのまま空中コンボに入れる
function riser(o) {
  const hits = o.hits || 6;
  return {
    ai: 'launch', startup: 6, active: hits * 4 + 2, recovery: 10, hits, hitInterval: 4,
    move: { vx: 1.5, vy: -(o.rise || 5), sustainY: true }, carry: true, resetAir: true,
    box: { x: 0, y: -170, w: 84, h: 160 }, damage: 2.4, hitstun: 24, launch: 5, push: 1, ...o,
  };
}

// 蹴り上げ：当たっていたら 大P（R）で前に蹴り飛ばす派生。押さなければ相手はそのまま落ちてくるので、
// ジャンプキャンセルや必殺技で追撃できる（蹴り飛ばすとダメージは大きいがコンボは終わる）
function kickUp(o, blast) {
  return {
    ai: 'launch', pose: 'upkick', startup: 6, active: 6, recovery: 20,
    box: { x: 5, y: -178, w: 78, h: 138 }, damage: 7, hitstun: 30, launch: 15, push: 1,
    followLabel: '（当たったら 大P で前に蹴り飛ばす）',
    follow: {
      from: 8, to: 30, needHit: true,
      HP: {
        pose: 'airkick', hop: { vx: 4, vy: -13 }, endOnLand: true, startup: 6, active: 14, recovery: 10,
        box: { x: 0, y: -150, w: 100, h: 110 }, damage: 10, hitstun: 34, push: 20, launch: 5, ...blast,
      },
    },
    ...o,
  };
}

const thunder = (delay, color) => ({
  kind: 'lightning', delay, life: 10, w: 46, damage: 10, chip: 2, hitstun: 24,
  launch: 9, push: 1, color, track: true,
});
