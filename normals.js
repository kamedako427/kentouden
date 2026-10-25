'use strict';

// ============================================================
//  キャラごとの通常技（コマンド技以外のすべての技）
// ============================================================
// COMMON（moves.js）を土台に、キャラごとに名前・見た目（pose）・性能・連携（target / chain）を上書きする。
// 指定しなかった項目は COMMON のまま。COMMON にないキー（例: 'ren3'）も追加でき、target から派生させられる。
// cancel を書くと COMMON の cancel は丸ごと置き換わる（つながる先はキャラごとに決める）。
//
// 戦い方ごとの作り:
//   手数型（レン・ネオン）… ほぼ全部の通常技が多段で、何から何へでもつながる。1発は軽い
//   重量級（ゴウテツ・シュテン）… 単発で重い。ジャンプキャンセルなし。コンボは6ヒットまで（characters.js の comboCap）
//   投げキャラ（ゴウテツ・マックス・シュテン）… 一部の技は、相手の攻撃中に当てた（カウンター）時だけバウンドする
//   空中戦（リン・ハヤテ）… 空中で長くつながる連携
//   リーチ型（ヤマト・ミコト・セツナ・カゲトラ・ヨミ）… 手数は少ないが届く。ヨミは引き寄せる
// カイは COMMON のまま。

// 連携の途中・締めでよく使う形
const lift = (o) => ({ pose: 'upkick', startup: 7, active: 5, recovery: 20, damage: 7, chip: 1, hitstun: 26, blockstun: 12, push: 2, meter: 8, launch: 15,
  box: { x: 10, y: -165, w: 82, h: 115 }, cancel: { special: true, jump: true }, ...o });
const link = (o) => ({ pose: 'punch', startup: 5, active: 3, recovery: 10, damage: 6, chip: 0, hitstun: 17, blockstun: 11, push: 2, meter: 6,
  box: { x: 20, y: -130, w: 74, h: 38 }, ...o });
// 空中の連携パーツ（空中の相手は自分と一緒に浮いたまま、空中で続けられる）
const airLink = (o) => ({ air: true, pose: 'airpunch', startup: 4, active: 6, recovery: 8, damage: 4, chip: 0, hitstun: 18, blockstun: 10, push: 2, meter: 5,
  box: { x: 15, y: -124, w: 66, h: 40 }, ...o });

// 何から何へでもつながる（手数型）
const GATLING = ['jab', 'crouchJab', 'kick', 'sweep', 'elbow', 'uppercut'];
const gat = (...extra) => ({ special: true, chain: GATLING, ...Object.assign({}, ...extra) });

// ネオンのリズムラッシュ（基本の P）。P を押すたびに最大5段まで続き、最後に打ち上げる
const rhythm = i => link({
  label: i === 1 ? 'リズムラッシュ' : `リズムラッシュ ${i}`,
  input: i === 1 ? 'P' : `P × ${i}`,
  pose: i % 2 ? 'punch' : 'elbow',
  startup: i === 1 ? 3 : 4, recovery: 9, damage: 2.6 + i * 0.45, hitstun: 17, push: 1.2,
  box: { x: 20, y: -135, w: 78, h: 44 },
  cancel: { special: true, target: { P: `rhythm${i + 1}` }, ...(i === 1 ? { chain: GATLING } : {}) },
});

// 重量級：通常技は必殺技にしかつながらない
const HEAVY = { special: true };

const CHAR_NORMALS = {
  // カイ：今までの共通技そのまま
  kai: {},

  // ================= レン：忍（手数型）。苦無の多段と、何でもつながる連携 =================
  ren: {
    airH: airLink({ label: '空中苦無乱れ（発生が速い）', input: '空中 つかみ', pose: 'slash', startup: 2, active: 9, hits: 3, hitInterval: 3, damage: 2.4,
      box: { x: 10, y: -140, w: 80, h: 80 }, cancel: { special: true, chain: ['airPunch', 'airKick', 'diveKick'] } }),
    jab: { label: '苦無突き', pose: 'slash', startup: 2, recovery: 6, damage: 3.2, box: { x: 20, y: -134, w: 70, h: 40 },
      cancel: gat({ target: { P: 'straight' } }) },
    straight: { label: '二段苦無', input: 'P → P', pose: 'slash', startup: 4, active: 6, hits: 2, hitInterval: 3, damage: 2.9,
      cancel: { special: true, target: { P: 'ren3' }, chain: ['kick', 'sweep', 'uppercut'] } },
    ren3: link({ label: '三段苦無', input: 'P → P → P', pose: 'iai', startup: 4, active: 8, hits: 3, hitInterval: 3, damage: 2.3,
      box: { x: 20, y: -138, w: 84, h: 48 }, cancel: { special: true, target: { K: 'finisher' } } }),
    finisher: { label: '燕返し蹴り', input: 'P → P → P → K', pose: 'flip', startup: 6, active: 8, hits: 2, hitInterval: 4, damage: 4.5 },
    kick: { label: '影二段蹴り', pose: 'kickflurry', startup: 6, active: 8, hits: 2, hitInterval: 4, damage: 4.5, push: 3,
      cancel: gat({ target: { K: 'renK2' } }) },
    renK2: link({ label: '影三段蹴り', input: 'K → K', pose: 'kickflurry', startup: 5, active: 10, hits: 3, hitInterval: 3, damage: 2.9,
      box: { x: 20, y: -112, w: 86, h: 44 }, cancel: { special: true, chain: ['uppercut', 'sweep'] } }),
    crouchJab: { label: '伏せ苦無', pose: 'slide', startup: 3, damage: 3.2, box: { x: 20, y: -60, w: 70, h: 40 }, cancel: gat() },
    sweep: { label: '影払い（下段）', pose: 'slide', startup: 7, active: 8, hits: 2, hitInterval: 4, damage: 4.5, box: { x: 10, y: -46, w: 124, h: 46 },
      cancel: { special: true, chain: ['uppercut'] } },
    elbow: { label: '影踏み', pose: 'rush', step: 11, startup: 7, active: 6, hits: 2, hitInterval: 3, damage: 3.9, cancel: gat() },
    overhead: { label: '宙返り踵（中段）', pose: 'flip', startup: 16, damage: 9.1, cancel: { special: true } },
    throw: { label: '影縛り投げ' },
    uppercut: { label: '昇り苦無（打ち上げ）', pose: 'slash', startup: 5, active: 6, hits: 2, hitInterval: 3, damage: 3.9, box: { x: 5, y: -182, w: 74, h: 124 } },
    dashPunch: { label: '影突き', pose: 'iai', startup: 4, move: { vx: 9 }, hits: 2, hitInterval: 3, active: 8, damage: 4.5, cancel: gat() },
    slide: { label: '影滑り（下段）', startup: 4, active: 14, move: { vx: 10 }, damage: 7.8, cancel: { special: true, chain: ['uppercut'] } },
    diveKick: { label: '飛燕急降下', startup: 3, move: { vx: 6, vy: 11, sustainY: true }, damage: 6.5 },
    airPunch: { label: '空中苦無', pose: 'slash', startup: 3, active: 6, hits: 2, hitInterval: 3, damage: 2.9,
      cancel: { special: true, chain: ['airKick', 'diveKick'], target: { P: 'renAir2' } } },
    renAir2: airLink({ label: '空中三連苦無', input: '空中 P → P', pose: 'slash', active: 8, hits: 3, hitInterval: 3, damage: 2.3,
      cancel: { special: true, chain: ['airKick', 'diveKick'] } }),
    airKick: { label: '空中二段蹴り', pose: 'kickflurry', hits: 2, hitInterval: 4, damage: 4.5, cancel: { special: true, chain: ['diveKick'] } },
  },

  // ================= ネオン：ダンサー（手数型）。P はリズムラッシュ、K はブレイクダンスの連携 =================
  neon: {
    airH: airLink({ label: 'エアヘッドスピン（自分も上昇）', input: '空中 つかみ', pose: 'spin', startup: 4, active: 10, hits: 3, hitInterval: 3, damage: 2.4,
      hop: { vx: 1, vy: -8 }, airLift: -10, box: { x: -40, y: -150, w: 130, h: 110 }, cancel: { special: true, chain: ['airPunch', 'airKick', 'diveKick'] } }),
    jab: rhythm(1),
    rhythm2: rhythm(2),
    rhythm3: rhythm(3),
    rhythm4: rhythm(4),
    rhythm5: lift({ label: 'リズムラッシュ 5', input: 'P × 5', pose: 'upper', startup: 4, damage: 5.2, box: { x: 15, y: -170, w: 78, h: 120 } }),
    kick: { label: 'ストリートキック', pose: 'kick', startup: 6, damage: 4.6, push: 2, cancel: gat({ target: { K: 'neonK2' } }) },
    neonK2: link({ label: 'トーマス', input: 'K → K', pose: 'windmill', startup: 5, active: 12, hits: 3, hitInterval: 4, damage: 2.5,
      box: { x: -40, y: -100, w: 140, h: 70 }, cancel: { special: true, target: { K: 'neonK3' } } }),
    neonK3: lift({ label: 'エアフレア上げ', input: 'K → K → K', pose: 'spin', startup: 5, active: 8, hits: 2, hitInterval: 4, damage: 3.4,
      box: { x: -30, y: -170, w: 120, h: 130 } }),
    crouchJab: { label: 'フロアタッチ', pose: 'cpunch', startup: 3, damage: 2.9, cancel: gat() },
    sweep: { label: 'フットワーク（下段）', pose: 'windmill', startup: 7, active: 12, hits: 3, hitInterval: 4, damage: 2.8,
      box: { x: -30, y: -50, w: 140, h: 50 }, cancel: { special: true, chain: ['uppercut'] } },
    elbow: { label: 'ポップ', pose: 'elbow', step: 6, hits: 2, hitInterval: 4, active: 7, damage: 3.4, cancel: gat() },
    overhead: { label: 'フリップキック（中段）', pose: 'flip', startup: 17, cancel: { special: true } },
    throw: { label: 'ダンスホールド' },
    uppercut: { label: 'トゥーロック（打ち上げ）', pose: 'upkick', hits: 2, hitInterval: 4, active: 7, damage: 4 },
    dashPunch: { label: 'スライドパンチ', move: { vx: 8 }, hits: 2, hitInterval: 3, active: 8, damage: 4, cancel: gat() },
    slide: { label: 'ニースライド（下段）', pose: 'slide', move: { vx: 9 }, cancel: { special: true, chain: ['uppercut'] } },
    diveKick: { label: 'エアトラックス', pose: 'spin', hits: 2, hitInterval: 6, damage: 4, box: { x: -20, y: -70, w: 90, h: 70 } },
    airPunch: { label: 'エアポーズ', pose: 'airpunch', hits: 2, hitInterval: 3, active: 7, damage: 2.9 },
    airKick: { label: 'エアフレア', pose: 'windmill', hits: 3, hitInterval: 4, active: 12, damage: 2.8, box: { x: -30, y: -80, w: 120, h: 50 },
      cancel: { special: true, chain: ['diveKick'] } },
  },

  // ================= ゴウテツ：力士（重量級）。単発で重い。コンボは短い =================
  goutetsu: {
    airH: { label: '空中つかみ張り（重い一撃）', input: '空中 つかみ', pose: 'palm', startup: 7, active: 5, damage: 12, hitstun: 22, push: 8, hop: null, airLift: 0, cancel: null },
    jab: { label: '張り手', pose: 'palm', startup: 6, recovery: 12, damage: 9, hitstun: 20, push: 6, box: { x: 20, y: -132, w: 76, h: 48 }, cancel: HEAVY },
    kick: { label: '蹴たぐり', pose: 'stomp', startup: 12, recovery: 20, damage: 15, hitstun: 22, push: 10, box: { x: 15, y: -70, w: 100, h: 70 }, cancel: HEAVY },
    crouchJab: { label: 'しゃがみ張り手', pose: 'palm', startup: 6, damage: 7, push: 4, cancel: HEAVY },
    sweep: { label: '足取り（下段・ダウン）', startup: 11, recovery: 24, damage: 12, launch: 7, scoop: false, box: { x: 10, y: -50, w: 112, h: 50 }, cancel: null },
    elbow: { label: '寄り身（カウンターで壁バウンド）', pose: 'rush', counterBounce: 'wall', step: 8, startup: 10, damage: 12, push: 14, cancel: HEAVY },
    overhead: { label: '頭突き落とし（中段）', pose: 'slam', startup: 19, damage: 14, cancel: HEAVY },
    throw: { label: '上手投げ', damage: 17 },
    uppercut: { label: 'かち上げ肘（打ち上げ）', pose: 'elbow', startup: 7, damage: 11, box: { x: 5, y: -180, w: 80, h: 124 }, cancel: HEAVY },
    dashPunch: { label: 'ぶつかり', pose: 'rush', startup: 7, damage: 13, push: 12, cancel: HEAVY },
    slide: { label: '寄り切り足払い（下段）', pose: 'sweep', startup: 8, damage: 11, cancel: null },
    diveKick: { label: 'ボディ落とし', pose: 'slam', startup: 6, damage: 13, box: { x: -10, y: -80, w: 84, h: 80 }, cancel: null },
    airPunch: { label: '空中張り手', pose: 'palm', startup: 5, damage: 10, cancel: null },
    airKick: { label: '空中蹴たぐり', startup: 7, damage: 13, cancel: null },
  },

  // ================= シュテン：鬼（重量級）。連携なしの重い一撃 =================
  shuten: {
    airH: { label: '空中鬼爪（重い一撃）', input: '空中 つかみ', pose: 'slash', startup: 7, active: 5, damage: 12, hitstun: 22, push: 8, hop: null, airLift: 0, cancel: null },
    jab: { label: '鬼の拳', startup: 7, recovery: 16, damage: 11, hitstun: 22, blockstun: 14, push: 8, meter: 9, box: { x: 20, y: -138, w: 86, h: 50 }, cancel: HEAVY },
    kick: { label: '鬼蹴り', pose: 'stomp', startup: 13, recovery: 22, damage: 14, hitstun: 24, push: 10, box: { x: 15, y: -80, w: 100, h: 80 }, cancel: HEAVY },
    crouchJab: { label: '鬼の小突き', startup: 6, damage: 7, cancel: HEAVY },
    sweep: { label: '鬼払い（下段・ダウン）', startup: 11, recovery: 24, damage: 12, launch: 7, scoop: false, box: { x: 10, y: -50, w: 120, h: 50 }, cancel: null },
    elbow: { label: '鬼の体当たり（カウンターで壁バウンド）', pose: 'rush', counterBounce: 'wall', step: 8, startup: 10, damage: 12, push: 14, cancel: HEAVY },
    overhead: { label: '金棒落とし（中段）', pose: 'slam', startup: 20, damage: 14, box: { x: 15, y: -180, w: 96, h: 180 }, cancel: HEAVY },
    throw: { label: '鬼の大投げ', damage: 15 },
    uppercut: { label: '鬼の突き上げ（打ち上げ）', startup: 8, damage: 11, box: { x: 5, y: -190, w: 86, h: 130 }, cancel: HEAVY },
    dashPunch: { label: '鬼の突進拳', pose: 'rush', startup: 8, damage: 11, push: 9, cancel: HEAVY },
    slide: { label: '地鳴らし（下段）', pose: 'stomp', startup: 8, damage: 11, cancel: null },
    diveKick: { label: '鬼落とし', pose: 'slam', startup: 6, damage: 12, box: { x: -10, y: -80, w: 84, h: 80 }, cancel: null },
    airPunch: { label: '空中鬼拳', startup: 5, damage: 10, cancel: null },
    airKick: { label: '空中鬼蹴り', startup: 8, damage: 11, cancel: null },
  },

  // ================= マックス：プロレス。バウンドさせる技が多い =================
  max: {
    airH: { label: 'フライングボディアタック', input: '空中 つかみ', pose: 'pounce', startup: 6, active: 8, damage: 10, hitstun: 22, push: 6, hop: null, airLift: 0,
      box: { x: -10, y: -130, w: 90, h: 100 }, cancel: { special: true } },
    jab: { label: 'チョップ', pose: 'slash', startup: 5, damage: 7, hitstun: 17, push: 4,
      cancel: { special: true, chain: ['crouchJab', 'sweep'], target: { P: 'straight' } } },
    straight: { label: 'ビッグエルボー', input: 'P → P', pose: 'elbow', startup: 7, damage: 10, hitstun: 26, push: 8,
      box: { x: 15, y: -138, w: 76, h: 56 }, cancel: { special: true } },
    kick: { label: 'ビッグブーツ（カウンターで壁バウンド）', counterBounce: 'wall', startup: 11, damage: 11, push: 14, box: { x: 20, y: -130, w: 92, h: 50 } },
    crouchJab: { label: 'ローチョップ', pose: 'slash', startup: 5, damage: 6, cancel: { special: true, chain: ['sweep'] } },
    sweep: { label: 'ローリングソバット（下段）', pose: 'sweep', startup: 9, damage: 10 },
    elbow: { label: 'ショルダータックル', pose: 'rush', step: 7, startup: 9, damage: 10, push: 9 },
    overhead: { label: 'ギロチンドロップ（中段・カウンターで叩きつけ）', pose: 'slam', counterBounce: 'ground', startup: 19, damage: 12 },
    throw: { label: 'ボディスラム', damage: 16 },
    uppercut: { label: 'ヨーロピアンアッパー（打ち上げ）', pose: 'elbow', startup: 7, damage: 10, box: { x: 5, y: -182, w: 80, h: 126 } },
    dashPunch: { label: 'ランニングエルボー', pose: 'elbow', startup: 6, damage: 10 },
    slide: { label: 'ドロップ足払い（下段）', pose: 'sweep', damage: 9 },
    diveKick: { label: 'ダイビングボディプレス', pose: 'slam', startup: 6, damage: 11, box: { x: -10, y: -80, w: 84, h: 80 } },
    airPunch: { label: '空中チョップ', pose: 'slash', startup: 5, damage: 8, cancel: { special: true } },
    airKick: { label: 'ミサイルキック', pose: 'dive', startup: 7, damage: 11, push: 9 },
  },

  // ================= リン：拳法娘（空中戦）。空中で4段つながり、急降下で叩きつけて拾い直す =================
  rin: {
    // 高く跳ね上がって、そこから空中の4段へ
    airH: airLink({ label: '昇り鷹爪（自分も大きく上昇）', input: '空中 つかみ', pose: 'upkick', startup: 4, active: 7, damage: 5,
      hop: { vx: 1.5, vy: -11 }, airLift: -12.5, box: { x: 5, y: -180, w: 74, h: 130 },
      cancel: { special: true, chain: ['airPunch', 'airKick', 'diveKick'], target: { P: 'rinAir2', K: 'rinAir3' } } }),
    jab: { label: '連拳', cancel: { special: true, chain: ['kick', 'sweep', 'uppercut'], target: { P: 'straight' } } },
    straight: { label: '連拳・二', input: 'P → P', pose: 'elbow' },
    finisher: link({ label: '連脚', input: 'P → P → K', pose: 'kick', startup: 6, damage: 6, box: { x: 20, y: -110, w: 86, h: 40 }, cancel: { special: true, target: { K: 'rin4' } } }),
    rin4: lift({ label: '鷹爪脚（打ち上げ）', input: 'P → P → K → K', startup: 6, damage: 7 }),
    kick: { label: '旋脚', pose: 'spin', startup: 6, damage: 7, cancel: { special: true, chain: ['uppercut'] } },
    crouchJab: { label: '低い連拳', pose: 'cpunch', startup: 2 },
    sweep: { label: '掃腿（下段）', pose: 'windmill', box: { x: -20, y: -50, w: 130, h: 50 }, cancel: { special: true, chain: ['uppercut'] } },
    elbow: { label: '鉄肘', pose: 'elbow', step: 5 },
    overhead: { label: '落踵（中段）', startup: 16 },
    throw: { label: '擒拿投げ' },
    uppercut: { label: '鶴の一蹴（打ち上げ）', pose: 'crane', startup: 5 },
    dashPunch: { label: '飛燕拳', move: { vx: 8 } },
    slide: { label: '低空掃腿（下段）', pose: 'slide' },
    // 空中：P → P → K → K の4段。どこからでも急降下（↓K）で叩きつけられる
    airPunch: { label: '空中連拳', startup: 3, hits: 2, hitInterval: 3, active: 7, damage: 2.5,
      cancel: { special: true, chain: ['diveKick'], target: { P: 'rinAir2', K: 'rinAir3' } } },
    rinAir2: airLink({ label: '空中連拳・二', input: '空中 P → P', pose: 'elbow', damage: 4, cancel: { special: true, chain: ['diveKick'], target: { K: 'rinAir3' } } }),
    rinAir3: airLink({ label: '空中旋脚', input: '空中 P → P → K', pose: 'spin', active: 8, hits: 2, hitInterval: 4, damage: 3, box: { x: -20, y: -100, w: 106, h: 60 },
      cancel: { special: true, chain: ['diveKick'], target: { K: 'rinAir4' } } }),
    rinAir4: airLink({ label: '空中鷹爪（浮かせ）', input: '空中 P → P → K → K', pose: 'upkick', startup: 5, damage: 5, launch: 5, box: { x: 10, y: -150, w: 76, h: 100 },
      cancel: { special: true, chain: ['diveKick'] } }),
    airKick: { label: '空中旋風脚', pose: 'spin', hits: 3, hitInterval: 4, active: 12, damage: 2.6, box: { x: -20, y: -100, w: 106, h: 60 },
      cancel: { special: true, chain: ['diveKick'] } },
    diveKick: { label: '鷹爪落とし', pose: 'dive', startup: 3, move: { vx: 5, vy: 11, sustainY: true } },
  },

  // ================= ハヤテ：風の少年（空中戦）。空中の多段と、浮かせる風 =================
  hayate: {
    airH: airLink({ label: '風の昇り蹴り（自分も上昇）', input: '空中 つかみ', pose: 'spin', startup: 4, active: 8, hits: 2, hitInterval: 4, damage: 3.5,
      hop: { vx: 2, vy: -10 }, airLift: -11.5, box: { x: -20, y: -170, w: 100, h: 120 }, cancel: { special: true, chain: ['airPunch', 'airKick', 'diveKick'] } }),
    jab: { label: '風拳', startup: 2 },
    straight: { label: '風拳・二', input: 'P → P', pose: 'elbow' },
    finisher: { label: '旋風上げ', input: 'P → P → K', pose: 'spin', hits: 2, hitInterval: 4, active: 7, damage: 4 },
    kick: { label: '疾風蹴り', startup: 7, pose: 'kick' },
    crouchJab: { label: '低い風拳', pose: 'cpunch', startup: 2 },
    sweep: { label: 'つむじ払い（下段）', pose: 'windmill', box: { x: -20, y: -50, w: 124, h: 50 } },
    elbow: { label: '風の踏み込み', pose: 'rush', step: 9 },
    overhead: { label: '風車落とし（中段）', pose: 'flip', startup: 16 },
    throw: { label: '風投げ' },
    uppercut: { label: '昇り風（打ち上げ）', pose: 'upkick' },
    dashPunch: { label: '疾風突き', move: { vx: 9 } },
    slide: { label: '風すべり（下段）', move: { vx: 10 } },
    airPunch: { label: '空中風拳', startup: 3, cancel: { special: true, chain: ['airKick', 'diveKick'], target: { P: 'hayateAir2' } } },
    hayateAir2: airLink({ label: '空中つむじ', input: '空中 P → P', pose: 'spin', hits: 2, hitInterval: 4, active: 8, damage: 3,
      box: { x: -20, y: -110, w: 100, h: 70 }, cancel: { special: true, chain: ['airKick', 'diveKick'] } }),
    airKick: { label: '空中旋風脚', pose: 'spin', hits: 2, hitInterval: 4, damage: 4, box: { x: -20, y: -90, w: 110, h: 56 }, cancel: { special: true, chain: ['diveKick'] } },
    diveKick: { label: '急降下つむじ', pose: 'spin', hits: 2, hitInterval: 6, damage: 3.5, box: { x: -20, y: -70, w: 90, h: 70 } },
  },

  // ================= ジン：ボクサー。パンチだけの4段、蹴りなし =================
  jin: {
    airH: airLink({ label: '空中アッパー（発生が速い）', input: '空中 つかみ', pose: 'upper', startup: 3, active: 5, damage: 6, airLift: -9,
      box: { x: 10, y: -170, w: 66, h: 110 }, cancel: { special: true, chain: ['airPunch', 'airKick', 'diveKick'] } }),
    jab: { label: 'ジャブ', startup: 2, recovery: 6 },
    straight: { label: 'ワンツー', input: 'P → P', startup: 4, damage: 6, cancel: { special: true, target: { P: 'hook' } } },
    hook: link({ label: 'フック', input: 'P → P → P', pose: 'elbow', startup: 5, damage: 7, cancel: { special: true, target: { P: 'finisher' } } }),
    finisher: lift({ label: 'ガゼルアッパー', input: 'P → P → P → P', pose: 'upper', startup: 6, damage: 7, box: { x: 5, y: -178, w: 78, h: 120 } }),
    kick: { label: 'レバーブロー', pose: 'elbow', startup: 7, damage: 9, box: { x: 20, y: -112, w: 70, h: 40 }, cancel: { special: true, chain: ['uppercut'] } },
    crouchJab: { label: 'ダッキングジャブ', pose: 'cpunch', startup: 2 },
    sweep: { label: 'ローブロー（下段）', pose: 'cpunch', startup: 7, damage: 7, box: { x: 15, y: -56, w: 84, h: 50 } },
    elbow: { label: 'ステップストレート', pose: 'rush', step: 8, startup: 6, damage: 8 },
    overhead: { label: 'チョッピングライト（中段）', pose: 'slam', startup: 17, damage: 9, box: { x: 15, y: -160, w: 70, h: 160 } },
    throw: { label: 'クリンチ投げ' },
    uppercut: { label: 'ショートアッパー（打ち上げ）', pose: 'upper', startup: 5 },
    dashPunch: { label: 'フラッシュストレート', startup: 4, move: { vx: 10 }, damage: 10 },
    slide: { label: 'ダッキング（下段）', pose: 'cpunch', move: { vx: 7 }, damage: 6, box: { x: 20, y: -60, w: 64, h: 46 } },
    diveKick: { label: '打ち下ろし', pose: 'slam', box: { x: 10, y: -80, w: 60, h: 70 } },
    airPunch: { label: '空中ジャブ', startup: 3 },
    airKick: { label: '空中ストレート', pose: 'airpunch', startup: 5, damage: 8, box: { x: 15, y: -120, w: 78, h: 40 } },
  },

  // ================= フレア：炎の舞姫。キックの3段と、多段の炎の蹴り =================
  flare: {
    jab: { label: '掌底', pose: 'palm' },
    straight: { label: '炎掌', input: 'P → P', pose: 'palm' },
    finisher: { label: '火の粉蹴り', input: 'P → P → K', pose: 'spin', hits: 2, hitInterval: 4, active: 7, damage: 4 },
    kick: { label: '炎脚', startup: 7, damage: 6, hitstun: 18, push: 2, cancel: { special: true, target: { K: 'flare2' } } },
    flare2: link({ label: '二段炎脚', input: 'K → K', pose: 'kickflurry', startup: 6, active: 8, hits: 2, hitInterval: 4, damage: 3.5,
      box: { x: 20, y: -110, w: 88, h: 40 }, cancel: { special: true, target: { K: 'flare3' } } }),
    flare3: lift({ label: '昇り炎脚', input: 'K → K → K', startup: 7, hits: 2, hitInterval: 4, active: 8, damage: 4.5 }),
    crouchJab: { label: '低い炎脚', pose: 'sweep', startup: 4, damage: 3.5, box: { x: 15, y: -50, w: 80, h: 40 } },
    sweep: { label: '炎の円舞（下段）', pose: 'windmill', startup: 8, active: 10, hits: 2, hitInterval: 5, damage: 4.5, box: { x: -30, y: -50, w: 140, h: 50 } },
    elbow: { label: '踏み込み炎掌', pose: 'palm', step: 6 },
    overhead: { label: '火輪落とし（中段）', pose: 'flip', startup: 17 },
    throw: { label: '炎の抱擁' },
    uppercut: { label: '昇り火（打ち上げ）', pose: 'upkick', startup: 6 },
    dashPunch: { label: '駆け炎脚', pose: 'kick', box: { x: 15, y: -110, w: 80, h: 40 } },
    slide: { label: '火走り（下段）', pose: 'slide', move: { vx: 9 } },
    diveKick: { label: '流星脚', pose: 'dive', move: { vx: 7, vy: 10, sustainY: true } },
    airPunch: { label: '空中炎掌', pose: 'palm' },
    airKick: { label: '空中回し蹴り', pose: 'spin', hits: 2, hitInterval: 5, damage: 4.5, box: { x: -20, y: -90, w: 110, h: 56 } },
  },

  // ================= ガルム：狼。爪の多段で引っかき回す =================
  garm: {
    jab: { label: '爪', pose: 'slash', startup: 3 },
    straight: { label: '爪連撃', input: 'P → P', pose: 'slash', hits: 2, hitInterval: 4, active: 7, damage: 3.5, box: { x: 20, y: -140, w: 80, h: 56 } },
    finisher: { label: '牙上げ', input: 'P → P → K', pose: 'upper', hits: 2, hitInterval: 4, active: 8, damage: 4 },
    kick: { label: '跳ね蹴り', pose: 'pounce', box: { x: 20, y: -110, w: 86, h: 50 } },
    crouchJab: { label: '低い爪', pose: 'slash', box: { x: 20, y: -70, w: 72, h: 40 } },
    sweep: { label: '這い爪（下段）', pose: 'slide', hits: 2, hitInterval: 4, active: 8, damage: 4, box: { x: 10, y: -44, w: 116, h: 44 } },
    elbow: { label: '飛びかかり爪', pose: 'pounce', step: 10, startup: 8, hits: 2, hitInterval: 4, active: 8, damage: 3.5 },
    overhead: { label: '叩きつけ爪（中段）', pose: 'slam', startup: 17 },
    throw: { label: '噛みつき投げ' },
    uppercut: { label: '月への爪（打ち上げ）', pose: 'upper', hits: 2, hitInterval: 4, active: 7, damage: 3.5 },
    dashPunch: { label: '疾走爪', pose: 'slash', move: { vx: 9 }, hits: 2, hitInterval: 4, active: 8, damage: 4 },
    slide: { label: '低空疾走（下段）', pose: 'slide', move: { vx: 10 } },
    diveKick: { label: '急降下爪', pose: 'pounce' },
    airPunch: { label: '空中爪', pose: 'slash' },
    airKick: { label: '空中十字爪', pose: 'slash', hits: 2, hitInterval: 4, damage: 4.5, box: { x: 10, y: -120, w: 84, h: 70 } },
  },

  // ================= ミコト：巫女（リーチ型）。御幣で遠くから =================
  mikoto: {
    jab: { label: '御幣突き', pose: 'whip', startup: 4, box: { x: 20, y: -132, w: 92, h: 38 } },
    straight: { label: '御幣払い', input: 'P → P', pose: 'slash', box: { x: 20, y: -140, w: 108, h: 56 } },
    finisher: { label: '舞い上げ', input: 'P → P → K', pose: 'spin', box: { x: -20, y: -170, w: 120, h: 130 } },
    kick: { label: '鈴蹴り', pose: 'kick', box: { x: 20, y: -96, w: 100, h: 34 } },
    crouchJab: { label: '低い御幣', pose: 'whip', damage: 3.5, box: { x: 20, y: -80, w: 92, h: 32 } },
    sweep: { label: '裾払い（下段）', pose: 'sweep', box: { x: 10, y: -46, w: 126, h: 46 } },
    elbow: { label: '祓いの一振り', pose: 'slash', step: 4, startup: 9, damage: 8, box: { x: 15, y: -140, w: 106, h: 56 } },
    overhead: { label: '御幣叩き（中段）', pose: 'slam', startup: 18, box: { x: 15, y: -170, w: 96, h: 170 } },
    throw: { label: '神送り' },
    uppercut: { label: '天への祈り（打ち上げ）', pose: 'raise', startup: 7, box: { x: 0, y: -195, w: 86, h: 136 } },
    dashPunch: { label: '駆け祓い', pose: 'whip', damage: 7, box: { x: 15, y: -135, w: 96, h: 42 } },
    slide: { label: '滑り舞い（下段）', pose: 'slide' },
    // ふわっと降りる：降下がゆっくり
    diveKick: { label: '降臨蹴り', pose: 'dive', move: { vx: 4, vy: 7, sustainY: true } },
    airPunch: { label: '空中御幣', pose: 'whip', box: { x: 15, y: -124, w: 96, h: 38 } },
    airKick: { label: '天女の蹴り', pose: 'airkick', box: { x: 10, y: -80, w: 90, h: 40 } },
  },

  // ================= セツナ：剣士（リーチ型）。少ない手数で重く斬る =================
  setsuna: {
    jab: { label: '柄打ち', pose: 'elbow', startup: 4 },
    straight: { label: '袈裟斬り', input: 'P → P', pose: 'slash', startup: 6, recovery: 12, damage: 7, box: { x: 25, y: -140, w: 98, h: 60 } },
    finisher: { label: '斬り上げ', input: 'P → P → K', pose: 'upper', damage: 9, box: { x: 10, y: -175, w: 104, h: 125 } },
    kick: { label: '払い斬り', pose: 'slash', startup: 10, damage: 8, box: { x: 25, y: -110, w: 100, h: 50 } },
    crouchJab: { label: '低い突き', pose: 'iai', box: { x: 20, y: -80, w: 92, h: 30 } },
    sweep: { label: '足斬り（下段）', pose: 'sweep', damage: 8, box: { x: 15, y: -44, w: 120, h: 44 } },
    elbow: { label: '踏み込み突き', pose: 'iai', step: 6, startup: 9, damage: 7, box: { x: 20, y: -132, w: 108, h: 36 } },
    overhead: { label: '唐竹割り（中段）', pose: 'slam', damage: 10, box: { x: 15, y: -175, w: 92, h: 175 } },
    throw: { label: '峰打ち投げ' },
    uppercut: { label: '氷の斬り上げ（打ち上げ）', pose: 'upper', box: { x: 5, y: -185, w: 96, h: 130 } },
    dashPunch: { label: '抜き胴', pose: 'iai', damage: 9, box: { x: 15, y: -130, w: 104, h: 40 } },
    slide: { label: '低い抜き胴（下段）', pose: 'slide' },
    diveKick: { label: '落下突き', pose: 'dive', damage: 8 },
    airPunch: { label: '空中斬り', pose: 'slash', damage: 7, box: { x: 15, y: -130, w: 100, h: 56 } },
    airKick: { label: '空中払い斬り', pose: 'slash', damage: 8, box: { x: 10, y: -90, w: 100, h: 50 } },
  },

  // ================= カゲトラ：侍（リーチ型）。一刀の重さと抜き打ちの速さ =================
  kagetora: {
    jab: { label: '抜き打ち', pose: 'iai', startup: 4, damage: 5, box: { x: 20, y: -132, w: 90, h: 36 } },
    straight: { label: '袈裟斬り', input: 'P → P', pose: 'slash', startup: 6, recovery: 12, damage: 9, box: { x: 25, y: -140, w: 108, h: 60 } },
    finisher: { label: '逆袈裟', input: 'P → P → K', pose: 'upper', damage: 9, box: { x: 10, y: -175, w: 104, h: 125 } },
    kick: { label: '前蹴り', pose: 'kick', push: 10 },
    crouchJab: { label: '低い抜き', pose: 'iai', box: { x: 20, y: -82, w: 92, h: 30 } },
    sweep: { label: '脛斬り（下段）', pose: 'sweep', damage: 9, box: { x: 15, y: -44, w: 132, h: 44 } },
    elbow: { label: '踏み込み抜刀', pose: 'iai', step: 7, startup: 9, damage: 10, box: { x: 20, y: -132, w: 108, h: 40 } },
    overhead: { label: '兜割り（中段）', pose: 'slam', damage: 11, box: { x: 15, y: -175, w: 96, h: 175 } },
    throw: { label: '柔術投げ' },
    uppercut: { label: '昇り斬り（打ち上げ）', pose: 'upper', box: { x: 5, y: -185, w: 96, h: 130 } },
    dashPunch: { label: '駆け抜け斬り', pose: 'iai', damage: 10, box: { x: 15, y: -132, w: 108, h: 40 } },
    slide: { label: '低い駆け斬り（下段）', pose: 'slide' },
    diveKick: { label: '落下斬り', pose: 'slam', damage: 9 },
    airPunch: { label: '空中抜き', pose: 'iai', damage: 7, box: { x: 15, y: -126, w: 100, h: 36 } },
    airKick: { label: '空中袈裟', pose: 'slash', damage: 10, box: { x: 10, y: -110, w: 108, h: 70 } },
  },

  // ================= ヤマト：僧兵（リーチ型）。棍がいちばん長い =================
  yamato: {
    jab: { label: '棍突き', pose: 'whip', startup: 4, box: { x: 20, y: -132, w: 100, h: 40 } },
    straight: { label: '棍打ち', input: 'P → P', pose: 'slash', startup: 6, damage: 7, box: { x: 20, y: -134, w: 124, h: 42 } },
    finisher: { label: '棍上げ', input: 'P → P → K', pose: 'upper', box: { x: 10, y: -175, w: 110, h: 125 } },
    kick: { label: '棍払い', pose: 'slash', startup: 9, damage: 10, box: { x: 20, y: -96, w: 124, h: 36 } },
    crouchJab: { label: '低い棍突き', pose: 'whip', box: { x: 20, y: -80, w: 104, h: 30 } },
    sweep: { label: '足払い棍（下段）', box: { x: 10, y: -46, w: 146, h: 46 } },
    elbow: { label: '踏み込み棍', pose: 'whip', step: 5, box: { x: 15, y: -132, w: 110, h: 42 } },
    overhead: { label: '棍落とし（中段）', pose: 'slam', damage: 10, box: { x: 15, y: -175, w: 110, h: 175 } },
    throw: { label: '棍投げ' },
    uppercut: { label: '棍天突き（打ち上げ）', pose: 'raise', box: { x: 0, y: -200, w: 84, h: 146 } },
    dashPunch: { label: '駆け突き', pose: 'whip', box: { x: 15, y: -132, w: 106, h: 40 } },
    slide: { label: '低い棍滑り（下段）' },
    diveKick: { label: '棍落下', pose: 'dive', box: { x: 0, y: -90, w: 70, h: 90 } },
    airPunch: { label: '空中棍突き', pose: 'whip', box: { x: 15, y: -124, w: 104, h: 38 } },
    airKick: { label: '空中棍回し', pose: 'spin', box: { x: -40, y: -110, w: 150, h: 60 } },
  },

  // ================= ヨミ：冥府の使者（リーチ型）。鎌で引き寄せる =================
  yomi: {
    jab: { label: '冥手', pose: 'palm' },
    straight: { label: '鎌引き（引き寄せ）', input: 'P → P', pose: 'slash', pull: 6, push: 0, damage: 5, box: { x: 20, y: -140, w: 100, h: 56 } },
    finisher: { label: '鎌上げ', input: 'P → P → K', pose: 'upper', box: { x: 10, y: -175, w: 104, h: 125 } },
    kick: { label: '亡者蹴り', pose: 'kick' },
    crouchJab: { label: '低い冥手', pose: 'cpunch' },
    sweep: { label: '刈り取り（下段）', pose: 'sweep', box: { x: 10, y: -44, w: 124, h: 44 } },
    elbow: { label: '踏み込み鎌', pose: 'slash', step: 5, box: { x: 15, y: -140, w: 96, h: 56 } },
    overhead: { label: '首刈り落とし（中段）', pose: 'slam' },
    throw: { label: '冥府送り' },
    uppercut: { label: '魂刈り（打ち上げ）', pose: 'upper', box: { x: 5, y: -185, w: 96, h: 130 } },
    dashPunch: { label: '滑る鎌（引き寄せ）', pose: 'slash', pull: 6, push: 0 },
    slide: { label: '影すべり（下段）', pose: 'slide' },
    diveKick: { label: '冥落', pose: 'dive' },
    airPunch: { label: '空中冥手', pose: 'palm' },
    airKick: { label: '空中鎌引き（引き寄せ）', pose: 'slash', pull: 6, push: 0, box: { x: 10, y: -110, w: 112, h: 64 } },
  },

  // ================= ゲンサイ：仙人。掌で吹き飛ばして壁に跳ね返す =================
  gensai: {
    jab: { label: '指突', pose: 'palm', startup: 3 },
    straight: { label: '掌打', input: 'P → P', pose: 'palm', damage: 7, push: 6 },
    finisher: lift({ label: '気功上げ', input: 'P → P → K', pose: 'palm' }),
    kick: { label: '仙人蹴り', startup: 7 },
    crouchJab: { label: '低い指突', pose: 'palm', box: { x: 20, y: -80, w: 64, h: 32 } },
    sweep: { label: '杖払い（下段）', pose: 'sweep' },
    elbow: { label: '寸勁', pose: 'palm', step: 4, startup: 9, damage: 9, push: 12 },
    overhead: { label: '天の掌（中段）', pose: 'slam' },
    throw: { label: '仙人投げ' },
    uppercut: { label: '昇り掌（打ち上げ）', pose: 'raise' },
    dashPunch: { label: '縮地掌', pose: 'palm', push: 10 },
    slide: { label: '地這い（下段）' },
    diveKick: { label: '仙人落とし', pose: 'stomp' },
    airPunch: { label: '空中掌', pose: 'palm', push: 8 },
    airKick: { label: '雲蹴り', pose: 'airkick' },
  },

  // ================= ボルト：兵士。速い下段と、浮かせるスライディング =================
  bolt: {
    jab: { label: 'ショートジャブ', startup: 3 },
    straight: { label: 'コンバットナイフ', input: 'P → P', pose: 'slash', box: { x: 20, y: -136, w: 84, h: 44 } },
    finisher: { label: 'サマーキック', input: 'P → P → K', pose: 'flip' },
    kick: { label: 'ハイキック', damage: 10, box: { x: 20, y: -140, w: 90, h: 36 } },
    crouchJab: { label: 'しゃがみナイフ', pose: 'iai', box: { x: 20, y: -82, w: 74, h: 30 } },
    sweep: { label: 'ローキック（下段）', pose: 'sweep', startup: 6 },
    elbow: { label: 'ストンピングエルボー', pose: 'elbow', step: 5 },
    overhead: { label: 'ブーツスタンプ（中段）', pose: 'stomp', startup: 17 },
    throw: { label: 'CQC投げ' },
    uppercut: { label: 'ナイフアッパー（打ち上げ）', pose: 'upper' },
    dashPunch: { label: 'タックルナイフ', pose: 'iai' },
    slide: { label: 'スライディングキック（下段・浮かせ）', startup: 4, active: 14, move: { vx: 10 }, damage: 8, launch: 10, cancel: { special: true } },
    diveKick: { label: '降下ニー', pose: 'knee' },
    airPunch: { label: '空中ナイフ', pose: 'slash' },
    airKick: { label: '空中ハイキック', pose: 'airkick' },
  },

  // ================= マキナ：サイボーグ。腕が伸びる長い突き、動きは重い =================
  makina: {
    jab: { label: 'アームジャブ', startup: 4 },
    straight: { label: 'ロングアーム', input: 'P → P', startup: 7, damage: 8, box: { x: 20, y: -132, w: 130, h: 40 } },
    finisher: lift({ label: 'ジェットアッパー', input: 'P → P → K', pose: 'upper' }),
    kick: { label: 'ニーバット', pose: 'knee', startup: 7, damage: 9, box: { x: 15, y: -120, w: 64, h: 50 } },
    crouchJab: { label: 'ローアーム', pose: 'cpunch', box: { x: 20, y: -86, w: 92, h: 32 } },
    sweep: { label: 'レッグスイープ（下段）' },
    elbow: { label: 'ブーストエルボー', pose: 'elbow', step: 7 },
    overhead: { label: 'ハンマーアーム（中段）', pose: 'slam', damage: 10 },
    throw: { label: 'クレーン投げ' },
    uppercut: { label: 'アームリフト（打ち上げ）', pose: 'raise' },
    dashPunch: { label: 'ブーストナックル', move: { vx: 9 }, damage: 9 },
    slide: { label: 'ローラースライド（下段）' },
    diveKick: { label: 'メテオドロップ', pose: 'stomp', damage: 9 },
    airPunch: { label: '空中アーム', box: { x: 15, y: -124, w: 100, h: 38 } },
    airKick: { label: '空中ニー', pose: 'knee', box: { x: 10, y: -100, w: 60, h: 50 } },
  },

  // ================= シズク：水の舞い手。水の鞭で長く、引き寄せる =================
  shizuku: {
    jab: { label: '水打ち', pose: 'palm', box: { x: 20, y: -130, w: 72, h: 38 } },
    straight: { label: '水流掌', input: 'P → P', pose: 'palm' },
    finisher: { label: '水柱蹴り', input: 'P → P → K', pose: 'spin', box: { x: -20, y: -170, w: 110, h: 130 } },
    kick: { label: '舞い蹴り', pose: 'spin' },
    crouchJab: { label: '水面打ち（引き寄せ）', pose: 'whip', pull: 6, push: 0, box: { x: 20, y: -70, w: 110, h: 30 } },
    sweep: { label: '水流払い（下段）', pose: 'sweep' },
    elbow: { label: '水の踏み込み', pose: 'whip', step: 5, box: { x: 15, y: -132, w: 100, h: 40 } },
    overhead: { label: '滝落とし（中段）', pose: 'slam' },
    throw: { label: '渦の投げ' },
    uppercut: { label: '水の噴き上げ（打ち上げ）', pose: 'raise' },
    dashPunch: { label: '流れ掌', pose: 'palm' },
    slide: { label: '水すべり（下段）', pose: 'slide' },
    diveKick: { label: '雫落とし', pose: 'dive' },
    airPunch: { label: '空中水打ち', pose: 'whip', box: { x: 15, y: -124, w: 96, h: 38 } },
    airKick: { label: '空中水舞い', pose: 'spin' },
  },
};

// ============================================================
//  キャラごとの大攻撃（大P＝R / 大K＝T）
// ============================================================
// hp 立ち大P / hk 立ち大K / chp しゃがみ大P / chk しゃがみ大K / ahp 空中大P / ahk 空中大K
// 指定しなかった項目は COMMON の大攻撃のまま（カイは COMMON のまま）
const CHAR_HEAVY = {
  // 手数型：大攻撃も多段
  ren: {
    hp: { label: '苦無連斬', pose: 'slash', startup: 5, active: 7, hits: 2, hitInterval: 4, damage: 4.5, box: { x: 20, y: -138, w: 90, h: 50 } },
    hk: { label: '影回し蹴り', pose: 'spin', startup: 8, active: 9, hits: 2, hitInterval: 5, damage: 5.5, box: { x: -20, y: -130, w: 120, h: 60 } },
    chp: { label: '昇り苦無突き（対空）', pose: 'slash', hits: 2, hitInterval: 3, active: 6, damage: 4 },
    chk: { label: '影大払い（下段・ダウン）', pose: 'slide', startup: 8, box: { x: 10, y: -46, w: 150, h: 46 } },
    ahp: { label: '空中大苦無', pose: 'slash', hits: 2, hitInterval: 3, active: 6, damage: 4.5 },
    ahk: { label: '空中影旋風', pose: 'spin', hits: 3, hitInterval: 3, active: 10, damage: 3.4, box: { x: -30, y: -110, w: 120, h: 70 } },
  },
  neon: {
    hp: { label: 'ポップ・ヒット', pose: 'elbow', startup: 6, hits: 2, hitInterval: 4, active: 7, damage: 4.5 },
    hk: { label: 'ハリケーンキック', pose: 'spin', startup: 8, active: 12, hits: 3, hitInterval: 4, damage: 3.8, box: { x: -30, y: -130, w: 130, h: 70 } },
    chp: { label: 'ヘッドトゥ（対空）', pose: 'upkick' },
    chk: { label: 'ウィンドミル払い（下段・ダウン）', pose: 'windmill', active: 10, hits: 3, hitInterval: 4, damage: 3.6, box: { x: -40, y: -50, w: 160, h: 50 } },
    ahp: { label: 'エアロック', hits: 2, hitInterval: 3, active: 7, damage: 4.5 },
    ahk: { label: 'エアウィンドミル', pose: 'windmill', hits: 3, hitInterval: 4, active: 12, damage: 3.4, box: { x: -40, y: -90, w: 140, h: 56 } },
  },
  // 重量級：単発でとても重い
  goutetsu: {
    hp: { label: '大張り手', pose: 'palm', startup: 9, recovery: 20, damage: 14, push: 10, box: { x: 20, y: -136, w: 92, h: 54 }, cancel: HEAVY },
    hk: { label: '四股蹴り', pose: 'stomp', startup: 13, recovery: 24, damage: 16, push: 11, box: { x: 15, y: -90, w: 110, h: 90 }, cancel: HEAVY },
    chp: { label: '突き上げ張り手（対空）', pose: 'raise', startup: 8, damage: 12, cancel: HEAVY },
    chk: { label: '大足取り（下段・ダウン）', startup: 11, damage: 13, cancel: null },
    ahp: { label: '空中大張り手', pose: 'palm', startup: 7, damage: 13, cancel: null },
    ahk: { label: '空中のしかかり', pose: 'slam', startup: 8, damage: 14, box: { x: -10, y: -90, w: 90, h: 90 }, cancel: null },
  },
  shuten: {
    hp: { label: '鬼の大拳', startup: 10, recovery: 22, damage: 15, push: 11, box: { x: 20, y: -140, w: 96, h: 56 }, cancel: HEAVY },
    hk: { label: '鬼の大蹴り', pose: 'stomp', startup: 14, recovery: 26, damage: 17, push: 12, box: { x: 15, y: -100, w: 112, h: 100 }, cancel: HEAVY },
    chp: { label: '鬼の大突き上げ（対空）', startup: 9, damage: 13, cancel: HEAVY },
    chk: { label: '鬼の大払い（下段・ダウン）', startup: 12, damage: 14, box: { x: 10, y: -50, w: 140, h: 50 }, cancel: null },
    ahp: { label: '空中鬼大拳', startup: 7, damage: 13, cancel: null },
    ahk: { label: '空中鬼大蹴り', pose: 'stomp', startup: 9, damage: 14, cancel: null },
  },
  max: {
    hp: { label: 'ナックルアロー', pose: 'slam', startup: 9, damage: 13, push: 8 },
    hk: { label: 'ジャンピングニー', pose: 'knee', startup: 9, damage: 12, box: { x: 15, y: -130, w: 70, h: 70 } },
    chp: { label: 'ラリアット上げ（対空）', pose: 'lariat', startup: 8, damage: 11 },
    chk: { label: 'ローリングソバット大（下段・ダウン）', startup: 10, damage: 12 },
    ahp: { label: '空中エルボードロップ', pose: 'elbow', startup: 7, damage: 12, cancel: { special: true } },
    ahk: { label: 'ミサイルドロップキック', pose: 'dive', startup: 8, damage: 13, push: 10, cancel: { special: true } },
  },
  // 空中戦：空中の大攻撃でも相手を浮かせ続ける
  rin: {
    hp: { label: '冲拳', startup: 6, damage: 8 },
    hk: { label: '旋風脚', pose: 'spin', startup: 8, hits: 2, hitInterval: 5, active: 9, damage: 5.5, box: { x: -20, y: -140, w: 120, h: 70 } },
    chp: { label: '鶴嘴（対空）', pose: 'crane', startup: 5 },
    chk: { label: '掃堂腿（下段・ダウン）', pose: 'windmill', box: { x: -30, y: -50, w: 150, h: 50 } },
    ahp: { label: '空中冲拳', hits: 2, hitInterval: 3, active: 7, damage: 4.5 },
    ahk: { label: '空中鷹蹴り（浮かせ）', pose: 'upkick', hits: 2, hitInterval: 4, active: 8, damage: 4.5, airLift: -8, box: { x: 5, y: -150, w: 80, h: 110 } },
  },
  hayate: {
    hp: { label: '風拳・大', startup: 5, damage: 10 },
    hk: { label: '旋風大蹴り', pose: 'spin', hits: 2, hitInterval: 5, active: 9, damage: 6.5, box: { x: -20, y: -140, w: 120, h: 70 } },
    chp: { label: '昇り風拳（対空）', pose: 'upkick' },
    chk: { label: 'つむじ大払い（下段・ダウン）', pose: 'windmill', hits: 2, hitInterval: 5, active: 9, damage: 5.5, box: { x: -30, y: -50, w: 150, h: 50 } },
    ahp: { label: '空中風拳・大', startup: 5 },
    ahk: { label: '空中旋風大蹴り（浮かせ）', pose: 'spin', hits: 2, hitInterval: 4, active: 8, damage: 5, airLift: -8, box: { x: -20, y: -110, w: 110, h: 70 } },
  },
  // ボクサー：大Kもパンチ
  jin: {
    hp: { label: 'ライトストレート', startup: 5, damage: 9, box: { x: 20, y: -134, w: 96, h: 40 } },
    hk: { label: 'ボディアッパー', pose: 'elbow', startup: 8, damage: 10, box: { x: 20, y: -116, w: 76, h: 50 } },
    chp: { label: 'ショベルフック（対空）', pose: 'upper', startup: 5 },
    chk: { label: 'ローブロー・大（下段・ダウン）', pose: 'cpunch', box: { x: 15, y: -56, w: 100, h: 50 } },
    ahp: { label: '空中ストレート・大', startup: 5 },
    ahk: { label: '空中フック', pose: 'elbow', startup: 6, damage: 9, box: { x: 15, y: -126, w: 80, h: 50 } },
  },
  flare: {
    hp: { label: '炎掌打', pose: 'palm', damage: 9 },
    hk: { label: '炎の回し蹴り', pose: 'spin', hits: 2, hitInterval: 5, active: 9, damage: 5.5, box: { x: -20, y: -130, w: 124, h: 64 } },
    chp: { label: '昇り炎（対空）', pose: 'upkick' },
    chk: { label: '炎円舞・大（下段・ダウン）', pose: 'windmill', hits: 2, hitInterval: 5, active: 9, damage: 5.5, box: { x: -30, y: -50, w: 150, h: 50 } },
    ahp: { label: '空中炎掌', pose: 'palm' },
    ahk: { label: '空中炎脚', pose: 'spin', hits: 2, hitInterval: 4, active: 8, damage: 5, box: { x: -20, y: -100, w: 114, h: 60 } },
  },
  garm: {
    hp: { label: '大爪', pose: 'slash', hits: 3, hitInterval: 3, active: 9, damage: 3.4, box: { x: 20, y: -142, w: 90, h: 60 } },
    hk: { label: '飛び爪蹴り', pose: 'pounce', step: 6, damage: 11 },
    chp: { label: '月爪（対空）', pose: 'upper', hits: 2, hitInterval: 4, active: 7, damage: 4.5 },
    chk: { label: '這い大爪（下段・ダウン）', pose: 'slide', hits: 2, hitInterval: 4, active: 8, damage: 5.5 },
    ahp: { label: '空中大爪', pose: 'slash', hits: 2, hitInterval: 4, active: 7, damage: 4.5 },
    ahk: { label: '空中十字大爪', pose: 'slash', hits: 3, hitInterval: 3, active: 9, damage: 3.5, box: { x: 10, y: -130, w: 90, h: 80 } },
  },
  // リーチ型：大攻撃はとても長い
  mikoto: {
    hp: { label: '大御幣振り', pose: 'slash', startup: 8, box: { x: 20, y: -142, w: 124, h: 60 } },
    hk: { label: '鈴の舞い蹴り', pose: 'spin', box: { x: -30, y: -130, w: 140, h: 70 } },
    chp: { label: '天への御幣（対空）', pose: 'raise', box: { x: 0, y: -205, w: 90, h: 145 } },
    chk: { label: '裾大払い（下段・ダウン）', box: { x: 10, y: -48, w: 150, h: 48 } },
    ahp: { label: '空中大幣', pose: 'whip', box: { x: 15, y: -128, w: 116, h: 44 } },
    ahk: { label: '天女の舞', pose: 'spin', box: { x: -40, y: -110, w: 140, h: 70 } },
  },
  setsuna: {
    hp: { label: '大袈裟斬り', pose: 'slash', startup: 9, damage: 11, box: { x: 25, y: -146, w: 124, h: 66 } },
    hk: { label: '回し斬り', pose: 'spin', startup: 10, damage: 11, box: { x: -40, y: -130, w: 160, h: 64 } },
    chp: { label: '大斬り上げ（対空）', pose: 'upper', box: { x: 5, y: -195, w: 100, h: 140 } },
    chk: { label: '大足斬り（下段・ダウン）', box: { x: 15, y: -44, w: 150, h: 44 } },
    ahp: { label: '空中大斬り', pose: 'slash', box: { x: 15, y: -136, w: 116, h: 60 } },
    ahk: { label: '空中回転斬り', pose: 'spin', box: { x: -40, y: -120, w: 150, h: 80 } },
  },
  kagetora: {
    hp: { label: '抜刀斬り', pose: 'iai', startup: 8, damage: 11, box: { x: 20, y: -134, w: 128, h: 42 } },
    hk: { label: '踏み込み蹴り', step: 6, push: 12 },
    chp: { label: '逆袈裟・大（対空）', pose: 'upper', box: { x: 5, y: -195, w: 100, h: 140 } },
    chk: { label: '脛大払い（下段・ダウン）', box: { x: 15, y: -44, w: 150, h: 44 } },
    ahp: { label: '空中抜刀', pose: 'iai', box: { x: 15, y: -128, w: 124, h: 40 } },
    ahk: { label: '空中大袈裟', pose: 'slash', box: { x: 10, y: -120, w: 120, h: 80 } },
  },
  yamato: {
    hp: { label: '大棍突き', pose: 'whip', startup: 8, box: { x: 20, y: -134, w: 144, h: 42 } },
    hk: { label: '棍大回し', pose: 'spin', startup: 10, box: { x: -50, y: -110, w: 180, h: 50 } },
    chp: { label: '天突き棍（対空）', pose: 'raise', box: { x: 0, y: -215, w: 86, h: 160 } },
    chk: { label: '棍大払い（下段・ダウン）', box: { x: 10, y: -46, w: 168, h: 46 } },
    ahp: { label: '空中大棍', pose: 'whip', box: { x: 15, y: -126, w: 136, h: 40 } },
    ahk: { label: '空中棍旋回', pose: 'spin', box: { x: -50, y: -120, w: 170, h: 70 } },
  },
  yomi: {
    hp: { label: '大鎌振り（引き寄せ）', pose: 'slash', startup: 9, pull: 6, push: 0, box: { x: 20, y: -142, w: 130, h: 60 } },
    hk: { label: '亡者回し', pose: 'spin', box: { x: -30, y: -130, w: 140, h: 64 } },
    chp: { label: '魂刈り上げ（対空）', pose: 'upper', box: { x: 5, y: -195, w: 100, h: 140 } },
    chk: { label: '大刈り取り（下段・ダウン）', box: { x: 10, y: -44, w: 156, h: 44 } },
    ahp: { label: '空中冥手・大', pose: 'palm' },
    ahk: { label: '空中大鎌（引き寄せ）', pose: 'slash', pull: 5, push: 0, box: { x: 10, y: -120, w: 124, h: 80 } },
  },
  // そのほか
  bolt: {
    hp: { label: 'ナイフ突き', pose: 'iai', startup: 6, box: { x: 20, y: -132, w: 96, h: 36 } },
    hk: { label: 'ソバット', pose: 'kick', damage: 11 },
    chp: { label: 'ナイフアッパー・大（対空）', pose: 'upper' },
    chk: { label: 'スライドキック（下段・ダウン）', pose: 'slide', step: 5 },
    ahp: { label: '空中ナイフ・大', pose: 'slash' },
    ahk: { label: '空中ニー', pose: 'knee', box: { x: 10, y: -110, w: 70, h: 60 } },
  },
  gensai: {
    hp: { label: '大掌打', pose: 'palm', damage: 11, push: 3 },
    hk: { label: '仙脚', pose: 'kick', damage: 13 },
    chp: { label: '天掌（対空）', pose: 'raise' },
    chk: { label: '杖大払い（下段・ダウン）' },
    ahp: { label: '空中大掌', pose: 'palm', push: 9 },
    ahk: { label: '雲脚', pose: 'airkick' },
  },
  makina: {
    hp: { label: 'ロケットアーム', startup: 10, damage: 10, box: { x: 20, y: -132, w: 156, h: 42 } },
    hk: { label: 'ブーストキック', pose: 'kick', step: 6 },
    chp: { label: 'アッパーアーム（対空）', pose: 'raise' },
    chk: { label: 'レッグスライサー（下段・ダウン）' },
    ahp: { label: '空中ロケットアーム', box: { x: 15, y: -128, w: 136, h: 40 } },
    ahk: { label: '空中ブースト蹴り', pose: 'dive' },
  },
  shizuku: {
    hp: { label: '水流大掌', pose: 'palm', push: 9 },
    hk: { label: '水の舞い大蹴り', pose: 'spin', box: { x: -30, y: -130, w: 130, h: 64 } },
    chp: { label: '水柱（対空）', pose: 'raise', box: { x: 0, y: -200, w: 86, h: 140 } },
    chk: { label: '水流大払い（下段・ダウン）', box: { x: 10, y: -48, w: 146, h: 48 } },
    ahp: { label: '空中水鞭', pose: 'whip', box: { x: 15, y: -126, w: 120, h: 40 } },
    ahk: { label: '空中水舞い・大', pose: 'spin', hits: 2, hitInterval: 4, active: 8, damage: 5 },
  },
};
for (const [id, h] of Object.entries(CHAR_HEAVY)) Object.assign(CHAR_NORMALS[id], h);

// ============================================================
//  キャラごとのコンボの流れ（どの技からどの技へつながるか・どう吹っ飛ぶか）
// ============================================================
// COMMON の通常技は必殺技にしかキャンセルできないので、つながりはここでキャラごとに決める。
// キャラによって、打ち上げられる技・飛ぶ方向や高さ・空中でつながる技・大攻撃の効果がまったく違う。
const S = (extra = {}) => ({ special: true, ...extra });
const CHAR_ROUTES = {
  // カイ：昔ながらの型。小P×3 → 小K で真上に打ち上げ → 空中P → 空中K。大Pはカウンターでよろけ
  kai: {
    jab: { cancel: S({ chain: ['crouchJab'], target: { P: 'straight' } }) },
    straight: { cancel: S({ target: { K: 'finisher' } }) },
    finisher: { cancel: S({ jump: true }) },
    crouchJab: { cancel: S({ chain: ['jab', 'hp'] }) },
    uppercut: { cancel: S({ jump: true }) },
    hp: { label: '正拳突き（カウンターでよろけ）', crumple: 40, crumpleCounter: true },
    airPunch: { cancel: S({ chain: ['airKick'] }) },
  },
  // レン：何でもつながる手数。打ち上げは低く前へ（すぐ追いかけられる）。空中は苦無の連打 → 空中H
  ren: {
    uppercut: { launchMul: 0.8, launchVx: 3, cancel: S({ jump: true }) },
    finisher: { launchMul: 0.8, launchVx: 3, cancel: S({ jump: true }) },
    hp: { cancel: S({ chain: ['hk', 'uppercut'] }) },
    hk: { cancel: S({ chain: ['uppercut'] }) },
    renAir2: { cancel: S({ chain: ['airKick', 'airH', 'diveKick'] }) },
    airKick: { cancel: S({ chain: ['airH', 'diveKick'] }) },
  },
  // ネオン：P は5段のリズム、K は3段のブレイク。どちらも最後に高く打ち上げ → 空中Kの回転 → 空中H
  neon: {
    rhythm5: { launchMul: 1.15 },
    neonK3: { launchMul: 1.15 },
    hk: { cancel: S({ chain: ['uppercut'] }) },
    uppercut: { cancel: S({ jump: true }) },
    airKick: { cancel: S({ chain: ['airH', 'diveKick'] }) },
  },
  // ゴウテツ：大Pで相手をよろけさせ、そこへコマンド投げ（大銀杏投げ）や百裂張り手
  goutetsu: {
    hp: { label: '大張り手（よろけ）', crumple: 42 },
  },
  // シュテン：大Kで相手をよろけさせ、鬼走りでつかむ
  shuten: {
    hk: { label: '鬼の大蹴り（よろけ）', crumple: 40 },
  },
  // マックス：大Pでよろけ → パイルドライバー。しゃがみ大Pで浮かせ → キャッチ＆スラムで空中の相手をつかむ
  max: {
    hp: { label: 'ナックルアロー（よろけ）', crumple: 38 },
    chp: { label: 'ラリアット上げ（打ち上げ）', launch: 12, launchMul: 0.8 },
  },
  // リン：小P → 小P → 小K → 小K で高く打ち上げ → 空中の4段 → 空中H で自分も上がって続ける
  rin: {
    rin4: { launchMul: 1.15 },
    uppercut: { launchMul: 1.15, cancel: S({ jump: true }) },
    chp: { launch: 15, launchMul: 1.1, cancel: S({ jump: true }) },
  },
  // ハヤテ：P → K → しゃがみ大P の風で斜め前に打ち上げ → 前ジャンプで追いかけて空中の多段
  hayate: {
    jab: { cancel: S({ chain: ['kick'] }) },
    kick: { cancel: S({ chain: ['chp'] }) },
    chp: { label: '昇り風拳（斜めに打ち上げ）', launch: 15, launchVx: 3.5, cancel: S({ jump: true }) },
    airKick: { cancel: S({ chain: ['airH', 'diveKick'] }) },
  },
  // ジン：空中戦はしない。P の4段や大P を →→ でダッシュキャンセル → ダッシュP → 必殺技と地上で押し込む
  jin: {
    jab: { cancel: S({ chain: ['crouchJab', 'hp'], target: { P: 'straight' }, dash: true }) },
    straight: { cancel: S({ target: { P: 'hook' }, dash: true }) },
    hook: { cancel: S({ target: { P: 'finisher' }, dash: true }) },
    finisher: { label: 'ガゼルアッパー（→→ でダッシュキャンセル）', cancel: S({ dash: true }) },
    hp: { label: 'ライトストレート（→→ でダッシュキャンセル）', cancel: S({ dash: true }) },
    dashPunch: { cancel: S({ chain: ['jab', 'hp'] }) },
  },
  // フレア：K の3段で斜め前に高く蹴り上げ → 前ジャンプ → 空中K → 空中大K（炎の多段）
  flare: {
    flare3: { launchVx: 4.5, launchMul: 1.05 },
    airKick: { cancel: S({ chain: ['ahk'] }) },
  },
  // セツナ：P → 大P の袈裟斬りで相手を凍らせる → 居合・閃などで打ち上げ
  setsuna: {
    jab: { cancel: S({ chain: ['hp'] }) },
    hp: { label: '大袈裟斬り（凍結）', crumple: 36, crumpleLabel: '凍結!', crumpleColor: '#9ae8ff' },
    airPunch: { cancel: S({ chain: ['ahp'] }) },
  },
  // カゲトラ：P → K → 大K の三太刀。大攻撃をカウンターで当てるとよろけ、そこから居合
  kagetora: {
    jab: { cancel: S({ target: { K: 'straight' } }) },
    straight: { input: 'P → K', cancel: S({ target: { HK: 'finisher' } }) },
    finisher: { input: 'P → K → 大K' },
    hp: { label: '抜刀斬り（カウンターでよろけ）', damage: 9, crumple: 34, crumpleCounter: true },
    hk: { label: '踏み込み蹴り（カウンターでよろけ）', crumple: 34, crumpleCounter: true },
  },
  // ヤマト：P → 大P の長い突き → ←P の棍で高く打ち上げ → 空中大K の大回転。小K → 小K で両側を払う
  yamato: {
    jab: { cancel: S({ chain: ['hp', 'uppercut'] }) },
    hp: { damage: 11, cancel: S({ chain: ['uppercut'] }) },
    kick: { cancel: S({ target: { K: 'yamaK2' } }) },
    yamaK2: link({ label: '棍返し', input: 'K → K', pose: 'spin', startup: 6, active: 10, hits: 2, hitInterval: 5, damage: 4.5,
      box: { x: -60, y: -110, w: 180, h: 60 }, cancel: S() }),
    uppercut: { launchMul: 1.1, cancel: S({ jump: true }) },
    airPunch: { cancel: S({ chain: ['ahk'] }) },
  },
  // ヨミ：大P の鎌で引き寄せ → P → P → 大K
  yomi: {
    jab: { cancel: S({ target: { P: 'straight' } }) },
    straight: { cancel: S({ target: { HK: 'finisher' } }) },
    finisher: { input: 'P → P → 大K' },
    hp: { cancel: S({ chain: ['jab', 'crouchJab'] }) },
  },
  // ゲンサイ：P → 大P → K の気功で斜め遠くへ飛ばす → 気功弾で拾う
  gensai: {
    jab: { cancel: S({ chain: ['hp'] }) },
    hp: { cancel: S({ target: { K: 'finisher' } }) },
    finisher: { input: 'P → 大P → K', launchVx: 5, launchMul: 0.9 },
  },
  // ガルム：P → P → P の爪で低く打ち上げて（すぐ届く）、空中P → 空中K → 空中H と畳みかける
  garm: {
    jab: { cancel: S({ chain: ['crouchJab'], target: { P: 'straight' } }) },
    straight: { cancel: S({ target: { P: 'finisher' } }) },
    finisher: { input: 'P → P → P', launchMul: 0.75, cancel: S({ jump: true }) },
    airPunch: { cancel: S({ chain: ['airKick'] }) },
    airKick: { cancel: S({ chain: ['airH'] }) },
  },
  // マキナ：大P のロケットアームで遠くの相手を引き寄せ → 小P から連携
  makina: {
    hp: { label: 'ロケットアーム（引き寄せ）', pullToOwner: true, push: 0, cancel: S({ chain: ['jab', 'crouchJab'] }) },
    jab: { cancel: S({ target: { P: 'straight' } }) },
    straight: { cancel: S({ target: { K: 'finisher' } }) },
  },
  // シズク：P → ↓P（引き寄せ）→ 大K で相手を泡に閉じ込めて浮かせる → 渦引きなどで追撃
  shizuku: {
    hk: { label: '水の舞い大蹴り（泡で浮かせる）', bind: 40 },
    jab: { cancel: S({ chain: ['crouchJab'] }) },
    crouchJab: { cancel: S({ chain: ['hk'] }) },
  },
  // ミコト：P → K でふわっと高く舞い上げ → 空中P → 空中K（御幣の長いリーチ）
  mikoto: {
    jab: { cancel: S({ target: { K: 'finisher' } }) },
    finisher: { input: 'P → K', launchMul: 1.25, launchVx: 0, cancel: S({ jump: true }) },
    airPunch: { cancel: S({ chain: ['airKick'] }) },
  },
  // ボルト：P → ↓P → ↓K の下段連携。ダッシュ中の K（スライディング）で浮かせ → ジャンプキャンセルで空中へ
  bolt: {
    jab: { cancel: S({ chain: ['crouchJab'] }) },
    crouchJab: { cancel: S({ chain: ['sweep'] }) },
    slide: { label: 'スライディングキック（下段・打ち上げ）', launch: 12, launchMul: 0.9, launchVx: 1, cancel: S({ jump: true }) },
    airPunch: { cancel: S({ chain: ['airKick'] }) },
  },
};
for (const [id, keys] of Object.entries(CHAR_ROUTES)) {
  for (const [k, v] of Object.entries(keys)) CHAR_NORMALS[id][k] = { ...(CHAR_NORMALS[id][k] || {}), ...v };
}

// ============================================================
//  コマンド通常技（↙ ↘ ← → ＋ 大P / 大K）
// ============================================================
// d1 = ↙、d3 = ↘、d4 = ←、d6 = → 。hp = 大P、hk = 大K（例：d3hk は ↘ ＋ 大K）
// そのキャラのコンボパーツになるように作る。重量級以外は 小P・しゃがみ小P からつながる
const lowLaunch = (o) => ({ pose: 'sweep', crouch: true, level: 'low', startup: 9, active: 5, recovery: 22, damage: 8, chip: 1, hitstun: 28, push: 1,
  launch: 12, box: { x: 10, y: -52, w: 120, h: 52 }, cancel: S({ jump: true }), ...o });
const hopKick = (o) => ({ pose: 'flip', level: 'high', hop: { vx: 4, vy: -9 }, endOnLand: true, startup: 10, active: 14, recovery: 10,
  damage: 8, chip: 1, hitstun: 24, push: 3, box: { x: 0, y: -120, w: 90, h: 100 }, cancel: S(), ...o });
const CHAR_CMD_NORMALS = {
  kai: {
    d3hk: lowLaunch({ label: '払い上げ蹴り（下段・浮かせ）', input: '↘ + 大K', launchMul: 0.85 }),
    d6hp: { label: '鳩尾砕き（2段）', input: '→ + 大P', pose: 'elbow', step: 6, startup: 8, active: 8, hits: 2, hitInterval: 4, damage: 5, hitstun: 22, push: 2,
      box: { x: 15, y: -132, w: 72, h: 48 }, cancel: S() },
  },
  ren: {
    d3hk: { label: '影すり抜け（下段・相手の裏へ）', input: '↘ + 大K', pose: 'slide', crouch: true, level: 'low', phase: true, move: { vx: 10 }, startup: 6, active: 12,
      recovery: 12, damage: 5, hitstun: 24, push: 0, box: { x: 0, y: -46, w: 80, h: 46 }, cancel: S({ chain: ['jab', 'crouchJab'] }) },
    d6hk: hopKick({ label: '飛び越え踵（中段）', input: '→ + 大K', hop: { vx: 6, vy: -10 }, damage: 6 }),
    d1hp: { label: '苦無投げ上げ（対空・浮かせ）', input: '↙ + 大P', pose: 'slash', startup: 6, active: 6, recovery: 18, damage: 6, hitstun: 26, launch: 12,
      launchMul: 0.8, launchVx: 3, box: { x: 0, y: -185, w: 80, h: 130 }, cancel: S({ jump: true }) },
  },
  neon: {
    d3hk: lowLaunch({ label: 'ヘッドスピンキック（下段・浮かせ）', input: '↘ + 大K', pose: 'windmill', active: 12, hits: 3, hitInterval: 4, damage: 3.2,
      launch: 13, launchMul: 1.15, box: { x: -40, y: -60, w: 150, h: 60 } }),
    d4hk: { label: 'バックスピンキック（後ろにも当たる）', input: '← + 大K', pose: 'spin', startup: 8, active: 10, recovery: 16, hits: 2, hitInterval: 5,
      damage: 5, hitstun: 22, push: 2, box: { x: -90, y: -130, w: 180, h: 60 }, cancel: S() },
  },
  goutetsu: {
    d6hp: { label: '鉄砲（壁まで押し出す）', input: '→ + 大P', pose: 'palm', step: 4, startup: 12, active: 5, recovery: 22, damage: 13, hitstun: 24, push: 18,
      box: { x: 20, y: -140, w: 90, h: 60 }, cancel: HEAVY },
    d3hk: { label: '大銀杏払い（下段・よろけ）', input: '↘ + 大K', pose: 'sweep', crouch: true, level: 'low', startup: 12, active: 5, recovery: 24, damage: 10,
      hitstun: 24, push: 2, crumple: 36, box: { x: 10, y: -50, w: 120, h: 50 }, cancel: HEAVY },
  },
  shuten: {
    d6hp: { label: '金棒振り下ろし（中段・よろけ）', input: '→ + 大P', pose: 'slam', level: 'high', startup: 18, active: 5, recovery: 22, damage: 14, hitstun: 24,
      push: 3, crumple: 38, box: { x: 15, y: -185, w: 100, h: 185 }, cancel: HEAVY },
    d1hk: { label: '鬼の地団駄（下段）', input: '↙ + 大K', pose: 'stomp', crouch: true, level: 'low', startup: 12, active: 6, recovery: 24, damage: 12, hitstun: 24,
      push: 6, box: { x: -20, y: -40, w: 150, h: 40 }, cancel: HEAVY },
  },
  max: {
    d3hp: { label: 'ラリアット（浮かせ → キャッチ＆スラム）', input: '↘ + 大P', pose: 'lariat', step: 5, startup: 9, active: 6, recovery: 20, damage: 11, hitstun: 28,
      launch: 12, launchMul: 0.8, push: 1, box: { x: 0, y: -150, w: 100, h: 70 }, cancel: S() },
    d6hk: hopKick({ label: 'ドロップキック（吹っ飛ばし）', input: '→ + 大K', pose: 'dive', level: 'mid', hop: { vx: 6, vy: -7 }, damage: 12, push: 16 }),
  },
  rin: {
    d3hk: { label: '旋風脚・昇（高く浮かせ）', input: '↘ + 大K', pose: 'spin', startup: 7, active: 9, recovery: 20, hits: 2, hitInterval: 4, damage: 4.5,
      hitstun: 28, launch: 15, launchMul: 1.15, push: 1, box: { x: -20, y: -170, w: 110, h: 130 }, cancel: S({ jump: true }) },
    d6hk: hopKick({ label: '鷹爪蹴り（中段）', input: '→ + 大K', hop: { vx: 3, vy: -8 } }),
  },
  hayate: {
    d3hp: { label: '風の突き上げ（斜めに浮かせ）', input: '↘ + 大P', pose: 'upkick', startup: 6, active: 6, recovery: 20, damage: 7, hitstun: 28,
      launch: 15, launchVx: 3.5, push: 1, box: { x: 5, y: -180, w: 80, h: 130 }, cancel: S({ jump: true }) },
    d6hk: hopKick({ label: '疾風の飛び蹴り', input: '→ + 大K', pose: 'airkick', level: 'mid', hop: { vx: 7, vy: -7 }, damage: 9 }),
  },
  jin: {
    d6hp: { label: 'ステップフック（→→ でダッシュキャンセル）', input: '→ + 大P', pose: 'elbow', step: 9, startup: 8, active: 4, recovery: 16, damage: 10,
      hitstun: 22, push: 2, box: { x: 20, y: -132, w: 76, h: 46 }, cancel: S({ dash: true }) },
    d3hp: { label: 'ボディアッパー（浮かせ・→→ でダッシュキャンセル）', input: '↘ + 大P', pose: 'upper', startup: 7, active: 5, recovery: 18, damage: 9,
      hitstun: 26, launch: 9, launchMul: 0.7, push: 1, box: { x: 10, y: -150, w: 76, h: 100 }, cancel: S({ dash: true }) },
  },
  flare: {
    d3hk: lowLaunch({ label: '炎の昇り円舞（斜めに浮かせ）', input: '↘ + 大K', pose: 'windmill', hits: 2, hitInterval: 5, active: 9, damage: 4.5,
      launch: 15, launchVx: 4, box: { x: -30, y: -60, w: 150, h: 60 } }),
    d6hk: { label: '炎の踵落とし（中段）', input: '→ + 大K', pose: 'axe', level: 'high', step: 3, startup: 16, active: 5, recovery: 16, damage: 10,
      hitstun: 22, push: 3, box: { x: 15, y: -170, w: 80, h: 170 }, cancel: S() },
  },
  setsuna: {
    d6hp: { label: '氷突き（遠くまで届く）', input: '→ + 大P', pose: 'iai', step: 4, startup: 10, active: 5, recovery: 20, damage: 9, hitstun: 22, push: 3,
      box: { x: 20, y: -132, w: 150, h: 36 }, cancel: S() },
    d3hk: { label: '低い薙ぎ払い（下段）', input: '↘ + 大K', pose: 'sweep', crouch: true, level: 'low', startup: 10, active: 5, recovery: 20, damage: 8,
      hitstun: 22, push: 3, box: { x: 15, y: -44, w: 160, h: 44 }, cancel: S() },
  },
  kagetora: {
    d6hp: { label: '踏み込み袈裟（大きく踏み込む・カウンターでよろけ）', input: '→ + 大P', pose: 'slash', step: 12, startup: 12, active: 5, recovery: 20,
      damage: 11, hitstun: 24, push: 3, crumple: 34, crumpleCounter: true, box: { x: 25, y: -146, w: 120, h: 66 }, cancel: S() },
    d1hk: { label: '足払い斬り（下段・ダウン）', input: '↙ + 大K', pose: 'sweep', crouch: true, level: 'low', startup: 10, active: 5, recovery: 24,
      damage: 10, hitstun: 26, launch: 7, push: 4, box: { x: 15, y: -44, w: 150, h: 44 }, cancel: S() },
  },
  yamato: {
    d6hp: { label: '棍突き出し（いちばん遠い）', input: '→ + 大P', pose: 'whip', step: 3, startup: 11, active: 5, recovery: 20, damage: 9, hitstun: 24, push: 2,
      box: { x: 20, y: -134, w: 175, h: 40 }, cancel: S({ chain: ['uppercut'] }) },
    d3hk: lowLaunch({ label: '棍掬い上げ（下段・浮かせ）', input: '↘ + 大K', launch: 13, launchMul: 1.05, box: { x: 10, y: -50, w: 150, h: 50 } }),
  },
  yomi: {
    d6hk: { label: '鎌刈り（下段・引き寄せ）', input: '→ + 大K', pose: 'sweep', crouch: true, level: 'low', startup: 10, active: 5, recovery: 20, damage: 7,
      hitstun: 26, pull: 8, push: 0, box: { x: 10, y: -44, w: 150, h: 44 }, cancel: S({ chain: ['jab', 'crouchJab'] }) },
    d3hp: { label: '魂刈り上げ（浮かせ）', input: '↘ + 大P', pose: 'upper', startup: 7, active: 6, recovery: 20, damage: 7, hitstun: 28, launch: 15, push: 1,
      box: { x: 5, y: -185, w: 96, h: 130 }, cancel: S({ jump: true }) },
  },
  gensai: {
    d6hp: { label: '発勁掌（遠くへ吹き飛ばす）', input: '→ + 大P', pose: 'palm', step: 4, startup: 11, active: 5, recovery: 22, damage: 12, hitstun: 30,
      push: 20, launch: 5, box: { x: 20, y: -136, w: 76, h: 56 }, cancel: S() },
    d3hk: lowLaunch({ label: '仙人払い（下段・斜めに浮かせ）', input: '↘ + 大K', launch: 11, launchVx: 3, cancel: S() }),
  },
  garm: {
    d6hk: hopKick({ label: '飛びかかり蹴り（2段）', input: '→ + 大K', pose: 'pounce', level: 'mid', hop: { vx: 7, vy: -8 }, hits: 2, hitInterval: 5, damage: 5 }),
    d3hp: lowLaunch({ label: '這い爪上げ（下段・低く浮かせ）', input: '↘ + 大P', pose: 'slide', launch: 11, launchMul: 0.75 }),
  },
  makina: {
    d6hp: { label: 'ロケットストレート（遠くまで）', input: '→ + 大P', pose: 'punch', startup: 12, active: 5, recovery: 22, damage: 10, hitstun: 22, push: 4,
      box: { x: 20, y: -134, w: 190, h: 40 }, cancel: S() },
    d3hk: { label: 'レッグスピン（下段・2段）', input: '↘ + 大K', pose: 'windmill', crouch: true, level: 'low', startup: 9, active: 10, recovery: 20, hits: 2,
      hitInterval: 5, damage: 5, hitstun: 22, push: 2, box: { x: -30, y: -50, w: 150, h: 50 }, cancel: S() },
  },
  shizuku: {
    d6hk: hopKick({ label: '水の跳ね蹴り（中段）', input: '→ + 大K', hop: { vx: 4, vy: -9 } }),
    d3hp: { label: '水柱突き上げ（高く浮かせ）', input: '↘ + 大P', pose: 'raise', startup: 7, active: 6, recovery: 20, damage: 7, hitstun: 28, launch: 14,
      launchMul: 1.1, push: 1, box: { x: 0, y: -200, w: 86, h: 150 }, cancel: S({ jump: true }) },
  },
  mikoto: {
    d6hp: { label: '御幣の大振り（前後に当たる）', input: '→ + 大P', pose: 'spin', startup: 10, active: 8, recovery: 18, damage: 9, hitstun: 22, push: 3,
      box: { x: -70, y: -140, w: 200, h: 70 }, cancel: S() },
    d3hk: lowLaunch({ label: '舞い上げ脚（下段・ふわっと浮かせ）', input: '↘ + 大K', pose: 'upkick', launch: 14, launchMul: 1.25 }),
  },
  bolt: {
    d6hp: { label: 'ナイフ連突き（3段）', input: '→ + 大P', pose: 'iai', startup: 7, active: 9, recovery: 16, hits: 3, hitInterval: 3, damage: 3.5, hitstun: 20,
      push: 2, box: { x: 20, y: -132, w: 86, h: 36 }, cancel: S() },
    d3hk: lowLaunch({ label: 'スライドキック（下段・浮かせ）', input: '↘ + 大K', pose: 'slide', move: { vx: 7 }, launch: 11 }),
  },
};
for (const [id, keys] of Object.entries(CHAR_CMD_NORMALS)) {
  const n = CHAR_NORMALS[id];
  for (const [k, v] of Object.entries(keys)) n[k] = { ...v };
  // 重量級以外：小P・しゃがみ小P からコマンド通常技につながる（手数型は何からでも）
  if (id === 'goutetsu' || id === 'shuten') continue;
  const from = (id === 'ren' || id === 'neon') ? Object.keys(n).filter(k => n[k].cancel && Array.isArray(n[k].cancel.chain) && n[k].cancel.chain.includes('jab')) : [];
  for (const k of new Set(['jab', 'crouchJab', ...from])) {
    const base = n[k] && n[k].cancel !== undefined ? n[k].cancel : COMMON[k].cancel;
    if (!base) continue;
    const chain = base.chain || [];
    // 出の遅い技（中段の踵落としなど）は小攻撃から間に合わないので入れない
    const add = Object.keys(keys).filter(x => !chain.includes(x) && (keys[x].startup || 8) <= 12);
    n[k] = { ...(n[k] || {}), cancel: { ...base, chain: [...chain, ...add] } };
  }
}
