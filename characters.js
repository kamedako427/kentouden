'use strict';

// ============================================================
//  キャラクター
// ============================================================
const CHARACTERS = [
  {
    id: 'kai', name: 'カイ', title: '求道の空手家',
    desc: '基本に忠実なバランス型。飛び道具と対空で堅実に戦う。',
    rating: { power: 3, speed: 3, range: 3, diff: 1 },
    stats: { hp: 100, walk: 4.2, back: 3.2, jump: 17, jumpX: 4.5 },
    colors: { top: '#d93a3a', pants: '#d93a3a', skin: '#f0c08a', hair: '#2a1a14', accent: '#ffffff', aura: '#ff7a2a', belt: '#1a1a1a', shoe: '#2a1a1a' },
    alt: { top: '#f2f2f2', pants: '#f2f2f2', accent: '#d93a3a' },
    hair: 'short', head: 'band', extra: [],
    moves: [
      {
        name: '波動弾', heavy: { startup: 11, recovery: 24, projBoost: { speed: 1.6, damage: 1.1 } }, cmd: '236', btn: 'P', ai: 'zone', pose: 'cast', startup: 13, active: 1, recovery: 22,
        projectile: { kind: 'orb', speed: 8, w: 36, h: 30, damage: 12, chip: 3, hitstun: 22, push: 7, color: '#ff7a2a' },
      },
      {
        name: '昇竜拳', heavy: { invuln: [1, 14], hits: 4, active: 17, damage: 5.5, move: { vx: 3, vy: -17 } }, cmd: '623', btn: 'P', ai: 'anti', pose: 'upper', startup: 3, active: 13, recovery: 24, invuln: [1, 10],
        move: { vx: 2.5, vy: -15 }, hits: 3, hitInterval: 4, box: { x: 5, y: -175, w: 50, h: 125 }, damage: 6.0, hitstun: 30, launch: 12, push: 3,
      },
      {
        name: '旋風脚', cmd: '214', btn: 'LK', ai: 'rush', pose: 'spin', startup: 8, active: 21, recovery: 14,
        move: { vx: 3 }, hits: 5, hitInterval: 4, box: { x: -50, y: -110, w: 140, h: 34 },
        damage: 3.3, hitstun: 16, launch: 8, push: 3,
      },
      {
        name: '踏み込み正拳', followLabel: '（→ P 追い突き / → K 払い蹴り・下段）',
        follow: {
          from: 12, to: 34,
          P: { name: '追い突き', pose: 'punch', step: 5, startup: 7, active: 4, recovery: 18, box: { x: 20, y: -135, w: 80, h: 42 }, damage: 7, hitstun: 26, launch: 12, push: 2 },
          K: { name: '払い蹴り', pose: 'sweep', level: 'low', startup: 8, active: 5, recovery: 22, box: { x: 10, y: -48, w: 120, h: 48 }, damage: 8, hitstun: 26, launch: 7, push: 4 },
        }, cmd: '214', btn: 'P', ai: 'close', pose: 'rush', step: 6, startup: 9, active: 16, recovery: 18,
        hits: 3, hitInterval: 5, box: { x: 20, y: -135, w: 76, h: 42 }, damage: 4.4, hitstun: 30, push: 13,
      },
      {
        name: '空中竜巻', cmd: '214', btn: 'K', air: true, ai: 'air', pose: 'spin', startup: 4, active: 20, recovery: 8, endOnLand: true,
        move: { vx: 5.5, vy: -1, sustainY: true }, hits: 2, hitInterval: 9, box: { x: -40, y: -110, w: 130, h: 40 },
        damage: 7, hitstun: 16, launch: 8, push: 2,
      },
      riser({ name: '昇り旋風', cmd: '214', btn: 'HK', pose: 'kickflurry', hits: 6, damage: 2.6 }),
      {
        name: '真・波動砲', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'cast',
        startup: 10, active: 50, recovery: 30,
        projectile: { kind: 'beam', h: 60, life: 48, hits: 9, hitInterval: 5, damage: 4.5, chip: 1, hitstun: 14, blockstun: 10, push: 2, launch: 12, color: '#ff7a2a' },
      },
    ],
  },
  {
    id: 'ren', name: 'レン', title: '影の忍',
    desc: '素早い動きと瞬間移動で翻弄する忍者。体力は低め。',
    rating: { power: 2, speed: 5, range: 2, diff: 3 },
    stats: { hp: 88, walk: 5.0, back: 4.2, jump: 18, jumpX: 5.2 }, size: 0.95,
    colors: { top: '#2a3150', pants: '#2a3150', skin: '#f0c08a', hair: '#15151f', accent: '#e23a3a', aura: '#b06aff', belt: '#e23a3a', shoe: '#15151f' },
    alt: { top: '#3a4a2a', pants: '#3a4a2a', accent: '#f0d040', belt: '#f0d040' },
    hair: 'spiky', head: 'mask', extra: ['scarf'],
    moves: [
      {
        name: '手裏剣', cmd: '236', btn: 'P', ai: 'zone', pose: 'cast', startup: 8, active: 1, recovery: 16,
        projectile: { kind: 'shuriken', speed: 13, w: 26, h: 26, damage: 7, chip: 1, hitstun: 16, blockstun: 10, push: 4, color: '#d8dde8' },
      },
      { name: '影走り', cmd: '214', btn: 'P', ai: 'tele', pose: 'teleport', startup: 12, active: 1, recovery: 10, teleport: true },
      {
        name: '飛燕落とし', cmd: '236', btn: 'K', air: true, ai: 'air', pose: 'dive', startup: 4, active: 40, recovery: 6,
        endOnLand: true, move: { vx: 7, vy: 11, sustainY: true }, box: { x: 5, y: -60, w: 62, h: 60 }, damage: 10, hitstun: 20, push: 6,
      },
      {
        name: '連影脚', cmd: '214', btn: 'K', ai: 'rush', pose: 'spin', startup: 6, active: 40, recovery: 16,
        move: { vx: 8.8 }, hits: 15, hitInterval: 2, box: { x: -20, y: -112, w: 115, h: 42 },
        damage: 1.2, hitstun: 15, push: 2,
      },
      {
        name: '昇影脚', followLabel: '（当たったら 大P で燕落とし）',
        follow: { from: 10, to: 32, needHit: true, HP: { name: '燕落とし', pose: 'dive', air: true, endOnLand: true, startup: 4, active: 20, recovery: 8,
          move: { vx: 8, vy: 9, sustainY: true }, box: { x: 0, y: -120, w: 90, h: 120 }, damage: 9, hitstun: 30, push: 18, launch: 4 } }, cmd: '623', btn: 'K', ai: 'launch', pose: 'flip', startup: 4, active: 12, recovery: 20,
        move: { vx: 2, vy: -12 }, box: { x: -10, y: -180, w: 80, h: 140 }, damage: 9, hitstun: 26, launch: 14, push: 2,
      },
      {
        name: '影分身乱舞', cmd: '236236', btn: 'K', super: true, cost: 100, ai: 'superRush', pose: 'rush', afterimage: true,
        startup: 8, active: 40, recovery: 10, move: { vx: 8.8 }, stopOnHit: true, hits: 8, hitInterval: 4,
        box: { x: 5, y: -140, w: 70, h: 120 }, damage: 4.5, hitstun: 14, launch: 14, push: 1.5,
      },
    ],
  },
  {
    id: 'goutetsu', name: 'ゴウテツ', title: '不動の巨岩',
    desc: '圧倒的な体力とパワーの力士。コマンド投げで一発逆転を狙う。',
    rating: { power: 5, speed: 1, range: 3, diff: 3 },
    stats: { hp: 125, walk: 3.0, back: 2.5, jump: 15.5, jumpX: 4.8 }, size: 1.18, thick: 1.45,
    comboCap: 6, // 重量級：コンボは短い
    bareArms: true, barefoot: true,
    colors: { top: '#e8b07a', pants: '#e8b07a', skin: '#e8b07a', hair: '#1a1a1a', accent: '#4a3a8a', aura: '#ffd84a', belt: '#4a3a8a', shoe: '#1a1a1a' },
    alt: { belt: '#c8202a', accent: '#c8202a' },
    hair: 'topknot', head: 'none', extra: ['mawashi'],
    moves: [
      {
        name: '鉄山突進', counterBounce: 'wall', cmd: '[4]6', btn: 'P', ai: 'rush', pose: 'rush', startup: 8, active: 16, recovery: 18,
        move: { vx: 9 }, hits: 2, hitInterval: 5, box: { x: 10, y: -140, w: 50, h: 120 }, damage: 7.7, hitstun: 30, push: 12,
      },
      {
        name: '百裂張り手', cmd: '22', btn: 'P', ai: 'close', pose: 'flurry', startup: 6, active: 30, recovery: 16,
        hits: 6, hitInterval: 5, box: { x: 20, y: -140, w: 72, h: 60 }, damage: 3.5, hitstun: 14, blockstun: 8, push: 2.5,
      },
      {
        name: '大銀杏投げ', grabStun: true, cmd: '63214', btn: 'P', ai: 'grab', pose: 'grab', grab: true, startup: 5, active: 3, recovery: 28,
        box: { x: 10, y: -130, w: 58, h: 110 }, damage: 20, hitstun: 30, launch: 13, push: 5,
      },
      {
        name: '四股踏み', counterBounce: 'ground', cmd: '22', btn: 'K', ai: 'close', pose: 'stomp', fx: 'quake', level: 'low', startup: 12, active: 16, recovery: 20,
        hits: 3, hitInterval: 5, box: { x: -60, y: -32, w: 200, h: 32 }, damage: 4.0, hitstun: 22, push: 3,
      },
      {
        name: 'かち上げ', cmd: '623', btn: 'P', ai: 'launch', pose: 'upper', startup: 7, active: 13, recovery: 22,
        move: { vy: -6 }, hits: 3, hitInterval: 4, box: { x: 5, y: -180, w: 66, h: 140 }, damage: 4.8, hitstun: 30, launch: 15, push: 2,
      },
      {
        name: '天地返し', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superGrab', pose: 'grab', grab: true,
        startup: 3, active: 5, recovery: 34, box: { x: 5, y: -140, w: 80, h: 130 }, damage: 40, hitstun: 40, launch: 18, push: 4,
      },
    ],
  },
  {
    id: 'mikoto', name: 'ミコト', title: '神域の巫女',
    desc: '御札で間合いを支配し、結界で攻撃も飛び道具も跳ね返す。',
    rating: { power: 2, speed: 3, range: 4, diff: 4 },
    stats: { hp: 94, walk: 3.8, back: 3.4, jump: 17, jumpX: 4.4 },
    colors: { top: '#f6f6f6', pants: '#c8202a', skin: '#f6d0a8', hair: '#1a1018', accent: '#c8202a', aura: '#ff6a8a', belt: '#c8202a', shoe: '#f6f6f6' },
    alt: { pants: '#3a5ac8', accent: '#3a5ac8', belt: '#3a5ac8', aura: '#6a9aff' },
    hair: 'long', head: 'ribbon', extra: [],
    moves: [
      {
        name: '御札', heavy: { projBoost: { speed: 1.5 } }, cmd: '236', btn: 'P', ai: 'zone', pose: 'cast', startup: 12, active: 1, recovery: 20,
        projectile: { kind: 'ofuda', speed: 6, w: 30, h: 22, damage: 10, chip: 2, hitstun: 22, color: '#ff6a8a' },
      },
      {
        name: '結界', cmd: '214', btn: 'P', ai: 'counter', pose: 'counter', startup: 3, active: 22, recovery: 16,
        counter: { damage: 14, launch: 11 },
      },
      {
        name: '神楽舞', cmd: '623', btn: 'K', ai: 'anti', pose: 'flip', startup: 4, active: 14, recovery: 20, invuln: [1, 8],
        move: { vx: 2, vy: -13 }, hits: 3, hitInterval: 4, box: { x: -30, y: -175, w: 95, h: 135 },
        damage: 5.1, hitstun: 24, launch: 11, push: 3,
      },
      {
        name: '祓串打ち', cmd: '236', btn: 'K', ai: 'close', pose: 'flurry', startup: 5, active: 13, recovery: 16,
        hits: 3, hitInterval: 4, box: { x: 20, y: -140, w: 82, h: 62 }, damage: 4.4, hitstun: 18, launch: 10, push: 2,
      },
      {
        name: '舞い進み', followLabel: '（K で舞い上げ）',
        follow: { from: 10, to: 30, K: { name: '舞い上げ', pose: 'upkick', startup: 5, active: 6, recovery: 18, box: { x: 0, y: -180, w: 90, h: 140 }, damage: 7, hitstun: 28, launch: 15, push: 1 } }, cmd: '214', btn: 'K', ai: 'rush', pose: 'spin', startup: 6, active: 18, recovery: 16,
        move: { vx: 3 }, hits: 3, hitInterval: 6, box: { x: -30, y: -120, w: 120, h: 60 }, damage: 4.5, hitstun: 16, launch: 9, push: 1,
      },
      {
        name: '神威', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'cast',
        startup: 10, active: 1, recovery: 44, projectiles: [holy(130, 6), holy(250, 16), holy(370, 26)],
      },
    ],
  },
  {
    id: 'jin', name: 'ジン', title: '閃光のボクサー',
    desc: '最速のパンチを持つボクサー。溜め技とラッシュで攻め立てる。',
    rating: { power: 3, speed: 4, range: 2, diff: 2 },
    stats: { hp: 100, walk: 4.6, back: 3.8, jump: 15.5, jumpX: 4.9 },
    bareArms: true,
    colors: { top: '#c58a5a', pants: '#f0c020', skin: '#c58a5a', hair: '#3a2210', accent: '#f0c020', aura: '#ffe04a', belt: '#ffffff', shoe: '#f2f2f2', glove: '#d42a2a' },
    alt: { pants: '#2a2a2a', glove: '#2a6ad4', belt: '#d4a020', aura: '#6ac8ff' },
    hair: 'short', head: 'none', extra: ['gloves'],
    moves: [
      {
        name: 'ダッシュストレート', cmd: '[4]6', btn: 'P', ai: 'rush', pose: 'rush', startup: 6, active: 14, recovery: 14,
        move: { vx: 10 }, stopOnHit: true, box: { x: 20, y: -138, w: 62, h: 34 }, damage: 13, hitstun: 30, push: 10,
      },
      {
        name: 'スマッシュアッパー', followLabel: '（当たったら 大P でチョッピングライト）',
        follow: { from: 10, to: 30, needHit: true, HP: { name: 'チョッピングライト', pose: 'slam', air: true, endOnLand: true, startup: 4, active: 16, recovery: 8,
          move: { vx: 6, vy: 8, sustainY: true }, box: { x: 0, y: -130, w: 90, h: 130 }, damage: 8, hitstun: 30, push: 18, launch: 4 } }, cmd: '[2]8', btn: 'P', ai: 'anti', pose: 'upper', startup: 4, active: 10, recovery: 22,
        invuln: [1, 8], move: { vx: 1.5, vy: -12 }, box: { x: 5, y: -170, w: 55, h: 120 }, damage: 14, hitstun: 28, launch: 13, push: 3,
      },
      {
        name: 'ハリケーンラッシュ', heavy: { active: 46, hits: 17, recovery: 22 }, cmd: '236', btn: 'P', ai: 'rush', pose: 'flurry', startup: 5, active: 40, recovery: 16,
        hits: 15, hitInterval: 2, move: { vx: 8.8 }, box: { x: 20, y: -142, w: 76, h: 50 },
        damage: 1.2, hitstun: 12, blockstun: 8, push: 2,
      },
      {
        name: 'ボディブロー', cmd: '214', btn: 'P', ai: 'close', pose: 'elbow', step: 3, startup: 6, active: 4, recovery: 16,
        box: { x: 20, y: -112, w: 66, h: 42 }, damage: 10, hitstun: 40, push: 2,
      },
      {
        name: 'スウェー', cmd: '236', btn: 'K', ai: 'evade', pose: 'sway', invuln: [1, 16], startup: 1, active: 16, recovery: 10,
        followLabel: '（P でカウンターブロー）',
        follow: {
          from: 3,
          P: {
            name: 'カウンターブロー', pose: 'punch', step: 6, startup: 5, active: 4, recovery: 16,
            box: { x: 20, y: -135, w: 80, h: 44 }, damage: 14, hitstun: 26, launch: 15, push: 2,
          },
        },
      },
      {
        name: 'ギガトンブロー', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superRush', pose: 'flurry', afterimage: true,
        startup: 8, active: 36, recovery: 26, move: { vx: 12 }, stopOnHit: true, hits: 8, hitInterval: 4,
        box: { x: 15, y: -145, w: 72, h: 80 }, damage: 5, hitstun: 14, launch: 16, push: 1.5,
      },
    ],
  },
  {
    id: 'flare', name: 'フレア', title: '紅蓮の舞姫',
    desc: '炎を操る踊り子。多段ヒットの炎と火柱で相手を焼き尽くす。',
    rating: { power: 4, speed: 3, range: 4, diff: 3 },
    stats: { hp: 94, walk: 4.0, back: 3.4, jump: 17, jumpX: 4.6 },
    colors: { top: '#ff6a1a', pants: '#3a1a10', skin: '#f4c898', hair: '#b01818', accent: '#ffd23a', aura: '#ff5a1a', belt: '#ffd23a', shoe: '#3a1a10' },
    alt: { top: '#8a2ad8', aura: '#c06aff', hair: '#2a1050', accent: '#6af0ff', belt: '#6af0ff' },
    hair: 'ponytail', head: 'none', extra: [],
    moves: [
      {
        name: '火炎弾', cmd: '236', btn: 'P', ai: 'zone', pose: 'cast', startup: 12, active: 1, recovery: 22,
        projectile: { kind: 'fire', speed: 7, w: 44, h: 36, hits: 2, hitInterval: 6, damage: 6.5, chip: 2, hitstun: 18, push: 4, color: '#ff5a1a' },
      },
      {
        name: '爆炎柱', cmd: '623', btn: 'P', ai: 'zone2', pose: 'slam', startup: 10, active: 1, recovery: 28,
        projectile: { kind: 'pillar', offset: 170, delay: 12, life: 26, w: 58, h: 170, hits: 3, hitInterval: 7, damage: 5, chip: 1, hitstun: 20, launch: 11, push: 1, color: '#ff5a1a' },
      },
      {
        name: '炎の爪', cmd: '214', btn: 'K', ai: 'rush', pose: 'slide', startup: 7, active: 14, recovery: 16,
        move: { vx: 8 }, stopOnHit: true, box: { x: 20, y: -60, w: 72, h: 44 }, damage: 12, hitstun: 22, launch: 7, push: 6,
      },
      {
        name: '炎舞連脚', cmd: '236', btn: 'K', ai: 'rush', pose: 'spin', startup: 6, active: 40, recovery: 16,
        move: { vx: 8.8 }, hits: 15, hitInterval: 2, box: { x: -30, y: -112, w: 125, h: 42 },
        damage: 1.2, hitstun: 16, push: 2,
      },
      riser({ name: '昇炎脚', cmd: '623', btn: 'K', pose: 'kickflurry', hits: 6, rise: 5.5, damage: 2.6 }),
      {
        name: 'フェニックス', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'cast',
        startup: 12, active: 1, recovery: 30,
        projectile: { kind: 'fire', speed: 6, w: 96, h: 96, hits: 6, hitInterval: 5, damage: 6, chip: 1, hitstun: 14, push: 1.5, launch: 14, color: '#ff5a1a', big: true },
      },
    ],
  },
  {
    id: 'setsuna', name: 'セツナ', title: '氷華の剣士',
    desc: '刀のリーチで間合いを制する剣士。居合斬りは相手をすり抜ける。',
    rating: { power: 4, speed: 3, range: 5, diff: 3 },
    stats: { hp: 95, walk: 4.2, back: 3.4, jump: 17, jumpX: 4.5 },
    colors: { top: '#cfe8ff', pants: '#1e3a6a', skin: '#f4d4b0', hair: '#dde6f0', accent: '#7ae0ff', aura: '#7ae0ff', belt: '#1e3a6a', shoe: '#1a1a2a' },
    alt: { top: '#2a2a2a', pants: '#5a1a2a', hair: '#1a1a1a', aura: '#ff4a6a', accent: '#ff4a6a' },
    hair: 'long', head: 'none', extra: ['sword'],
    moves: [
      {
        name: '氷刃', cmd: '236', btn: 'P', ai: 'zone', pose: 'slash', startup: 11, active: 1, recovery: 20,
        projectile: { kind: 'blade', speed: 9, w: 30, h: 70, damage: 11, chip: 3, hitstun: 20, push: 6, color: '#7ae0ff' },
      },
      {
        name: '居合斬り', cmd: '214', btn: 'LP', ai: 'rush', pose: 'iai', startup: 10, active: 11, recovery: 24,
        move: { vx: 16 }, phase: true, hits: 2, hitInterval: 5, box: { x: -70, y: -140, w: 150, h: 100 }, damage: 7.7, hitstun: 26, launch: 6, push: 4,
      },
      {
        name: '氷柱斬', cmd: '623', btn: 'P', ai: 'anti', pose: 'upper', startup: 4, active: 13, recovery: 24, invuln: [1, 9],
        move: { vx: 2, vy: -14 }, hits: 3, hitInterval: 4, box: { x: 0, y: -190, w: 70, h: 140 }, damage: 5.6, hitstun: 28, launch: 12, push: 3,
      },
      {
        name: '燕返し', cmd: '236', btn: 'K', ai: 'close', pose: 'slash', startup: 6, active: 13, recovery: 20,
        move: { vx: 2 }, hits: 3, hitInterval: 4, box: { x: 10, y: -170, w: 95, h: 140 },
        damage: 5.1, hitstun: 22, launch: 11, push: 2,
      },
      {
        name: '空中疾風斬', cmd: '214', btn: 'P', air: true, ai: 'air', pose: 'iai', startup: 5, active: 12, recovery: 8, endOnLand: true,
        move: { vx: 12, vy: 0, sustainY: true }, box: { x: -20, y: -140, w: 120, h: 90 }, damage: 10, hitstun: 22, launch: 8, push: 3,
      },
      {
        // 大きく踏み込みながら斬り上げる居合。当たるとジャンプキャンセルで空中コンボへ
        name: '居合・閃', cmd: '214', btn: 'HP', ai: 'launch', pose: 'upper', step: 10, startup: 11, active: 6, recovery: 24,
        box: { x: 10, y: -185, w: 120, h: 150 }, damage: 10, hitstun: 30, launch: 15, push: 1,
      },
      {
        name: '絶対零度', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superRush', pose: 'iai', afterimage: true, phase: true,
        startup: 12, active: 15, recovery: 30, move: { vx: 18 }, hits: 5, hitInterval: 2,
        box: { x: -100, y: -150, w: 220, h: 120 }, damage: 7, hitstun: 20, launch: 14, push: 0.5,
      },
    ],
  },
  {
    id: 'bolt', name: 'ボルト', title: '迅雷の兵士',
    desc: '溜め技を駆使する守りの達人。ナックルとニーで接近戦も強い。',
    rating: { power: 3, speed: 3, range: 4, diff: 4 },
    stats: { hp: 105, walk: 3.8, back: 3.4, jump: 16, jumpX: 4.3 },
    bareArms: true,
    colors: { top: '#4a6a2a', pants: '#6a6a4a', skin: '#f0c08a', hair: '#e8d070', accent: '#ffe14a', aura: '#ffe14a', belt: '#2a2a1a', shoe: '#2a2a1a' },
    alt: { top: '#2a3a6a', pants: '#3a3a4a', hair: '#f0f0f0', aura: '#6ae0ff', accent: '#6ae0ff' },
    hair: 'flat', head: 'none', extra: ['tags'],
    moves: [
      {
        name: 'ソニックボルト', cmd: '[4]6', btn: 'P', ai: 'zone', pose: 'cast', startup: 9, active: 1, recovery: 16,
        projectile: { kind: 'bolt', speed: 10, w: 44, h: 26, damage: 10, chip: 2, hitstun: 20, push: 6, color: '#ffe14a' },
      },
      {
        name: 'サマーソルト', cmd: '[2]8', btn: 'K', ai: 'anti', pose: 'flip', startup: 3, active: 13, recovery: 26, invuln: [1, 10],
        move: { vx: 1, vy: -13 }, hits: 3, hitInterval: 4, box: { x: -10, y: -185, w: 85, h: 150 }, damage: 6.0, hitstun: 30, launch: 13, push: 3,
      },
      {
        name: 'ボルトナックル', heavy: { damage: 14, startup: 10 }, cmd: '214', btn: 'P', ai: 'close', pose: 'rush', startup: 7, active: 10, recovery: 16,
        move: { vx: 7 }, stopOnHit: true, hits: 2, hitInterval: 5, box: { x: 15, y: -135, w: 62, h: 42 },
        damage: 6, hitstun: 18, push: 3,
      },
      {
        name: 'ニーバズーカ', cmd: '236', btn: 'K', ai: 'rush', pose: 'knee', startup: 8, active: 12, recovery: 18,
        move: { vx: 9 }, hits: 2, hitInterval: 5, box: { x: 10, y: -115, w: 56, h: 55 }, damage: 6.1, hitstun: 22, launch: 9, push: 4,
      },
      {
        name: 'グレネード', cmd: '22', btn: 'P', ai: 'zone2', pose: 'slam', startup: 12, active: 1, recovery: 22,
        projectile: { kind: 'grenade', speed: 5, vy: -8, gravity: 0.45, limit: true, w: 20, h: 20, damage: 12, chip: 3, hitstun: 26, launch: 15, push: 2, color: '#ffe14a' },
      },
      {
        name: 'ライトニングストーム', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'raise',
        startup: 10, active: 1, recovery: 40,
        projectiles: [thunder(10, '#ffe14a'), thunder(24, '#ffe14a'), thunder(38, '#ffe14a')],
      },
    ],
  },
  {
    id: 'garm', name: 'ガルム', title: '月下の狂狼',
    desc: '獣の跳躍力で飛びかかる野性の戦士。遠吠えで攻撃力が上がる。',
    rating: { power: 4, speed: 4, range: 2, diff: 2 },
    stats: { hp: 100, walk: 4.8, back: 3.8, jump: 18.5, jumpX: 5.4 },
    bareArms: true, barefoot: true, glowEyes: true,
    colors: { top: '#9a8aa8', pants: '#3a2a3a', skin: '#9a8aa8', hair: '#4a3a5a', accent: '#d0ff3a', aura: '#c06aff', belt: '#2a1a2a', shoe: '#2a1a2a' },
    alt: { top: '#b8a070', skin: '#b8a070', hair: '#6a4a20', pants: '#2a3a2a', aura: '#ff9a3a', accent: '#ff3a3a' },
    hair: 'wild', head: 'none', extra: ['claws'],
    moves: [
      {
        name: '獣爪撃', cmd: '236', btn: 'P', ai: 'rush', pose: 'rush', startup: 6, active: 40, recovery: 16,
        move: { vx: 8.8 }, hits: 15, hitInterval: 2, box: { x: 15, y: -130, w: 65, h: 60 },
        damage: 1.2, hitstun: 18, push: 4,
      },
      {
        name: '跳躍牙', cmd: '623', btn: 'K', ai: 'anti', pose: 'pounce', startup: 6, active: 40, recovery: 8, endOnLand: true,
        move: { vx: 8, vy: -14 }, box: { x: 0, y: -130, w: 75, h: 90 }, damage: 12, hitstun: 24, push: 4,
      },
      {
        name: '旋爪', cmd: '214', btn: 'LP', ai: 'close', pose: 'spin', startup: 6, active: 16, recovery: 16,
        move: { vx: 2 }, hits: 4, hitInterval: 4, box: { x: -40, y: -132, w: 135, h: 62 },
        damage: 3.5, hitstun: 14, launch: 10, push: 1.5,
      },
      { name: '遠吠え', cmd: '22', btn: 'P', ai: 'buff', pose: 'buff', startup: 10, active: 1, recovery: 30, buff: { mult: 1.3, frames: 480 } },
      {
        name: '月輪脚', cmd: '214', btn: 'K', ai: 'rush', pose: 'flip', startup: 6, active: 18, recovery: 16,
        move: { vx: 8 }, hits: 2, hitInterval: 8, box: { x: -20, y: -140, w: 100, h: 120 }, damage: 6.5, hitstun: 16, launch: 10, push: 1,
      },
      riser({ name: '月昇り爪', cmd: '214', btn: 'HP', pose: 'slash', hits: 6, rise: 5, damage: 2.6 }),
      {
        name: '狂乱牙', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superRush', pose: 'rush', afterimage: true,
        startup: 8, active: 44, recovery: 10, move: { vx: 8.8 }, stopOnHit: true, hits: 10, hitInterval: 3,
        box: { x: 5, y: -145, w: 72, h: 110 }, damage: 3.8, hitstun: 12, launch: 15, push: 1,
      },
    ],
  },
  {
    id: 'gensai', name: 'ゲンサイ', title: '千年の仙人',
    desc: '小柄な老師。大きな気功弾と瞬身、地を這う震脚でトリッキーに戦う。',
    rating: { power: 3, speed: 2, range: 5, diff: 5 },
    stats: { hp: 90, walk: 3.4, back: 3.0, jump: 16, jumpX: 4.2 }, size: 0.9,
    colors: { top: '#7a5a32', pants: '#5a4024', skin: '#e8c098', hair: '#f2f2f2', accent: '#ffd84a', aura: '#7aff6a', belt: '#ffd84a', shoe: '#3a2a1a' },
    alt: { top: '#4a4a5a', pants: '#3a3a4a', aura: '#6ab0ff', belt: '#c8c8d8' },
    hair: 'sage', head: 'none', extra: ['beard'],
    moves: [
      {
        name: '気功弾', cmd: '236', btn: 'P', ai: 'zone', pose: 'cast', startup: 14, active: 1, recovery: 22,
        projectile: { kind: 'orb', speed: 5, w: 52, h: 52, damage: 13, chip: 3, hitstun: 24, push: 7, color: '#7aff6a' },
      },
      { name: '瞬身', cmd: '214', btn: 'K', ai: 'tele', pose: 'teleport', startup: 10, active: 1, recovery: 8, teleport: true },
      {
        name: '震脚', cmd: '22', btn: 'K', ai: 'zone2', pose: 'stomp', startup: 14, active: 1, recovery: 22,
        projectile: { kind: 'wave', speed: 7, w: 44, h: 44, damage: 10, chip: 2, hitstun: 22, launch: 7, push: 4, color: '#7aff6a' },
      },
      {
        name: '双掌打', cmd: '214', btn: 'P', ai: 'close', pose: 'palm', step: 3, startup: 8, active: 16, recovery: 18,
        hits: 3, hitInterval: 5, box: { x: 20, y: -132, w: 72, h: 62 }, damage: 4.4, hitstun: 30, push: 14,
      },
      {
        name: '昇気掌', cmd: '623', btn: 'P', ai: 'launch', pose: 'upper', startup: 6, active: 13, recovery: 22,
        move: { vy: -5 }, hits: 3, hitInterval: 4, box: { x: 5, y: -185, w: 75, h: 150 }, damage: 4.5, hitstun: 30, launch: 16, push: 1,
      },
      kickUp({ name: '天昇脚', cmd: '214', btn: 'HK', damage: 9 }, { name: '掌底波', pose: 'palm', hop: { vx: 3, vy: -12 }, push: 22, damage: 12 }),
      {
        name: '天地気功', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'cast',
        startup: 12, active: 1, recovery: 30,
        projectile: { kind: 'orb', speed: 4.5, w: 110, h: 110, hits: 5, hitInterval: 6, damage: 7, chip: 1.5, hitstun: 16, push: 1.5, launch: 14, color: '#7aff6a', big: true },
      },
    ],
  },
  {
    id: 'yamato', name: 'ヤマト', title: '鉄棍の僧兵',
    desc: '長い棍で間合いを支配する僧兵。棍の回転で飛び道具をかき消し、読経で体力を回復する。',
    rating: { power: 3, speed: 2, range: 5, diff: 2 },
    stats: { hp: 105, walk: 3.8, back: 3.2, jump: 16, jumpX: 4.3 },
    colors: { top: '#d8a040', pants: '#6a4a2a', skin: '#e0b080', hair: '#1a1a1a', accent: '#f0f0f0', aura: '#ffcf4a', belt: '#6a3a1a', shoe: '#3a2a1a' },
    alt: { top: '#4a4a4a', pants: '#2a2a2a', aura: '#9ad0ff', belt: '#9ad0ff' },
    hair: 'bald', head: 'none', extra: ['staff'],
    moves: [
      {
        name: '棍旋回陣', cmd: '214', btn: 'P', ai: 'close', pose: 'lariat', erase: true, startup: 5, active: 26, recovery: 16,
        hits: 5, hitInterval: 5, box: { x: -75, y: -160, w: 180, h: 120 }, damage: 3.0, hitstun: 16, push: 3,
      },
      {
        name: '棒高跳び', cmd: '236', btn: 'K', ai: 'rush', pose: 'dive', level: 'high', hop: { vx: 6.5, vy: -14 }, endOnLand: true, landingHit: 60,
        startup: 16, active: 30, recovery: 10, hits: 3, hitInterval: 5, box: { x: 0, y: -72, w: 72, h: 72 }, damage: 4.0, hitstun: 22, push: 5,
      },
      {
        name: '地擦り棍', cmd: '22', btn: 'K', ai: 'close', pose: 'sweep', crouch: true, level: 'low', startup: 9, active: 16, recovery: 22,
        hits: 3, hitInterval: 5, box: { x: 10, y: -34, w: 150, h: 34 }, damage: 3.3, hitstun: 24, launch: 4, push: 4,
      },
      {
        name: '天衝棍', heavy: { invuln: [1, 12] }, cmd: '623', btn: 'P', ai: 'anti', pose: 'raise', startup: 5, active: 13, recovery: 24, invuln: [1, 10],
        hits: 3, hitInterval: 4, box: { x: -10, y: -245, w: 72, h: 205 }, damage: 4.8, hitstun: 28, launch: 13, push: 1,
      },
      { name: '読経', cmd: '22', btn: 'P', ai: 'heal', pose: 'meditate', startup: 8, active: 90, recovery: 10, heal: 18 },
      {
        name: '大地割り', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'slam', startup: 12, active: 6, recovery: 30,
        box: { x: -40, y: -90, w: 140, h: 90 }, damage: 14, hitstun: 30, push: 2,
        projectiles: [
          { kind: 'wave', speed: 9, w: 60, h: 70, hits: 3, hitInterval: 6, damage: 6, chip: 2, hitstun: 20, launch: 12, push: 2, color: '#ffcf4a', big: true },
          { kind: 'wave', speed: 9, w: 60, h: 70, hits: 3, hitInterval: 6, damage: 6, chip: 2, hitstun: 20, launch: 12, push: 2, color: '#ffcf4a', big: true, reverse: true },
        ],
      },
    ],
  },
  {
    id: 'rin', name: 'リン', title: '疾風の拳法娘',
    desc: 'K を追加入力して続ける連環脚や、K 連打の百裂脚など入力で魅せる拳法家。発勁は相手を壁まで吹き飛ばす。',
    rating: { power: 2, speed: 5, range: 3, diff: 4 },
    stats: { hp: 90, walk: 4.8, back: 4.0, jump: 18, jumpX: 5.2 }, size: 0.92,
    colors: { top: '#2a8a5a', pants: '#1a1a1a', skin: '#f6d4b0', hair: '#1a1010', accent: '#ffd23a', aura: '#6affb0', belt: '#ffd23a', shoe: '#1a1a1a' },
    alt: { top: '#c82a5a', aura: '#ff8ad0', belt: '#f0f0f0', accent: '#f0f0f0' },
    hair: 'buns', head: 'none', extra: [],
    moves: [
      {
        name: '連環脚', cmd: '236', btn: 'K', ai: 'close', pose: 'kick', followLabel: ' → K → K',
        startup: 6, active: 4, recovery: 16, box: { x: 20, y: -100, w: 88, h: 40 }, damage: 6, hitstun: 18, push: 3,
        follow: {
          from: 4,
          K: {
            name: '連環脚・二', pose: 'kick', startup: 5, active: 4, recovery: 18,
            box: { x: 20, y: -132, w: 88, h: 40 }, damage: 6, hitstun: 18, push: 3,
            follow: {
              from: 4,
              K: {
                name: '連環脚・三', pose: 'upkick', startup: 6, active: 5, recovery: 22,
                box: { x: 10, y: -165, w: 85, h: 115 }, damage: 8, hitstun: 26, launch: 15, push: 2,
              },
            },
          },
        },
      },
      {
        name: '百裂脚', cmd: 'mash', btn: 'K', ai: 'close', pose: 'kickflurry', startup: 4, active: 40, recovery: 16,
        move: { vx: 8.8 }, hits: 15, hitInterval: 2, box: { x: 20, y: -122, w: 92, h: 72 }, damage: 1.2, hitstun: 12, blockstun: 8, push: 1.2,
      },
      {
        name: '発勁', cmd: '214', btn: 'P', ai: 'close', pose: 'palm', startup: 10, active: 4, recovery: 20,
        box: { x: 20, y: -135, w: 72, h: 62 }, damage: 12, hitstun: 32, push: 16,
      },
      {
        name: '鶴の構え', cmd: '623', btn: 'LK', ai: 'anti', pose: 'crane', startup: 2, active: 26, recovery: 14,
        counter: { damage: 12, launch: 13, airOnly: true },
      },
      {
        name: '天空脚', cmd: '236', btn: 'K', air: true, ai: 'air', pose: 'upkick', hop: { vx: 3, vy: -11 }, startup: 3, active: 10, recovery: 10,
        box: { x: 10, y: -150, w: 82, h: 112 }, damage: 7, hitstun: 20, launch: 15, push: 2,
      },
      riser({ name: '昇龍百裂脚', cmd: '623', btn: 'HK', pose: 'kickflurry', hits: 8, rise: 4.5, damage: 2.2 }),
      {
        name: '鳳凰天舞', cmd: '236236', btn: 'K', super: true, cost: 100, ai: 'superRush', pose: 'kickflurry', afterimage: true,
        step: 9, startup: 8, active: 34, recovery: 20, move: { vy: -12 }, carry: true, hits: 8, hitInterval: 4,
        box: { x: 5, y: -150, w: 88, h: 120 }, damage: 4.5, hitstun: 16, launch: 15, push: 0,
      },
    ],
  },
  {
    id: 'shuten', name: 'シュテン', title: '大江山の鬼',
    desc: '巨体の鬼。跳ねる岩とアーマーで押し込み、咆哮でガードを砕く。超必殺技で鬼神に変身する。',
    rating: { power: 5, speed: 1, range: 3, diff: 3 },
    stats: { hp: 130, walk: 2.8, back: 2.3, jump: 15.5, jumpX: 4.8 }, size: 1.22, thick: 1.5,
    comboCap: 6, // 重量級：コンボは短い
    bareArms: true, barefoot: true, glowEyes: true,
    colors: { top: '#c84a3a', pants: '#d8a020', skin: '#c84a3a', hair: '#2a1a1a', accent: '#ffe14a', aura: '#ff6a2a', belt: '#2a1a1a', shoe: '#2a1a1a', hat: '#f2e8d0' },
    alt: { top: '#3a6ac8', skin: '#3a6ac8', aura: '#6ad0ff', accent: '#ffffff' },
    hair: 'wild', head: 'horns', extra: [],
    moves: [
      {
        name: '鬼岩投げ', heavy: { projBoost: { speed: 1.4, damage: 1.1 } }, cmd: '236', btn: 'P', ai: 'zone', pose: 'slam', startup: 14, active: 1, recovery: 24,
        projectile: { kind: 'rock', speed: 6.5, vy: -9, gravity: 0.5, bounces: 1, w: 44, h: 44, damage: 13, chip: 3, hitstun: 24, push: 5, color: '#7a6a5a' },
      },
      {
        name: 'ぶちかまし', counterBounce: 'wall', cmd: '214', btn: 'P', ai: 'rush', pose: 'rush', armor: [1, 16], startup: 12, active: 14, recovery: 20,
        move: { vx: 8 }, hits: 2, hitInterval: 5, box: { x: 10, y: -145, w: 55, h: 125 }, damage: 8.2, hitstun: 30, push: 10,
      },
      {
        name: '鬼走り', grabStun: true, cmd: '63214', btn: 'K', ai: 'grab', pose: 'grab', grab: true, style: 'front', startup: 6, active: 16, recovery: 26,
        move: { vx: 7 }, box: { x: 10, y: -130, w: 60, h: 110 }, damage: 20, hitstun: 30, launch: 8, push: 6,
      },
      {
        name: '鬼の咆哮', cmd: '22', btn: 'P', ai: 'anti', pose: 'buff', fx: 'roar', startup: 12, active: 13, recovery: 26, crush: 42,
        hits: 3, hitInterval: 4, box: { x: -90, y: -235, w: 180, h: 235 }, damage: 3.7, hitstun: 26, launch: 13, push: 6,
      },
      { name: '鬼酒', cmd: '22', btn: 'K', ai: 'buff', pose: 'meditate', startup: 10, active: 30, recovery: 24, buff: { armor: 2, frames: 360 } },
      {
        name: '鬼神化', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superBuff', pose: 'buff', startup: 10, active: 1, recovery: 20,
        buff: { transform: true, frames: 300, mult: 1.15, grow: 1.15, armorHits: 4 },
      },
    ],
  },
  {
    id: 'kagetora', name: 'カゲトラ', title: '流浪の侍',
    desc: '居合の構えから抜刀と踏み込みを選ぶ剣客。弾きで攻撃を受け流し、血振りで気を溜める。',
    rating: { power: 4, speed: 3, range: 4, diff: 5 },
    stats: { hp: 98, walk: 4.0, back: 3.3, jump: 16.5, jumpX: 4.4 },
    colors: { top: '#2a2a3a', pants: '#5a5a6a', skin: '#e8c098', hair: '#1a1a1a', accent: '#d43a3a', aura: '#ff5a4a', belt: '#d43a3a', shoe: '#1a1a1a', hat: '#c8a050' },
    alt: { top: '#e8e0d0', pants: '#3a3a5a', accent: '#3a6ad4', aura: '#7ad0ff', belt: '#3a6ad4' },
    hair: 'ponytail', head: 'kasa', extra: ['sword'],
    moves: [
      {
        name: '居合の構え', cmd: '214', btn: 'P', ai: 'close', pose: 'stance', followLabel: '（P 抜刀 / K 踏み込み斬り）',
        startup: 4, active: 50, recovery: 10,
        follow: {
          from: 4,
          P: {
            name: '抜刀', pose: 'iai', startup: 3, active: 4, recovery: 20,
            box: { x: 10, y: -140, w: 125, h: 80 }, damage: 16, hitstun: 26, launch: 15, push: 2,
          },
          K: {
            name: '踏み込み斬り', pose: 'slash', step: 10, startup: 8, active: 5, recovery: 18,
            box: { x: 20, y: -150, w: 100, h: 90 }, damage: 12, hitstun: 22, push: 8,
          },
        },
      },
      {
        name: '影討ち', heavy: { damage: 13 }, cmd: '236', btn: 'K', ai: 'close', pose: 'slash', startup: 6, active: 16, recovery: 14,
        move: { vx: -6 }, hits: 3, hitInterval: 5, box: { x: 10, y: -145, w: 108, h: 70 }, damage: 3.7, hitstun: 20, push: 6,
      },
      {
        name: '月輪斬り', cmd: '623', btn: 'P', ai: 'anti', pose: 'raise', startup: 5, active: 16, recovery: 24, invuln: [1, 9],
        hits: 3, hitInterval: 5, box: { x: -40, y: -235, w: 145, h: 135 }, damage: 4.4, hitstun: 32, push: 1,
      },
      { name: '血振り', cmd: '22', btn: 'P', ai: 'meter', pose: 'stance', startup: 6, active: 40, recovery: 10, meterGain: 30 },
      { name: '鍔弾き', cmd: '214', btn: 'K', ai: 'counter', pose: 'counter', startup: 2, active: 14, recovery: 20, counter: { parry: true } },
      {
        name: '一刀両断', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superRush', pose: 'iai', step: 14, startup: 10, active: 6, recovery: 34,
        bigSlash: true, box: { x: 0, y: -160, w: 140, h: 130 }, damage: 40, hitstun: 50, launch: 15, push: 2,
      },
    ],
  },
  {
    id: 'neon', name: 'ネオン', title: '路上のダンサー',
    desc: 'P を押すたびに続くリズムラッシュ（最大5段）が基本技。ヘッドスピン、回避のバックフリップや裏に回るクロスステップで翻弄する。',
    rating: { power: 2, speed: 5, range: 3, diff: 4 },
    stats: { hp: 92, walk: 4.9, back: 4.0, jump: 17.5, jumpX: 5.0 },
    bareArms: true,
    colors: { top: '#2ad8ff', pants: '#2a2a3a', skin: '#c88a5a', hair: '#ff3ad8', accent: '#ff3ad8', aura: '#ff5ae8', belt: '#f2f2f2', shoe: '#f2f2f2' },
    alt: { top: '#ffd23a', hair: '#3aff8a', accent: '#3aff8a', aura: '#7aff8a' },
    hair: 'mohawk', head: 'none', extra: [],
    moves: [
      {
        // その場で回転して前後をまとめて巻き込み、最後に浮かせる
        name: 'ヘッドスピン', heavy: { hits: 6, active: 26, damage: 2.6 }, cmd: '236', btn: 'P', ai: 'close', pose: 'spin', startup: 7, active: 18, recovery: 20,
        hits: 4, hitInterval: 5, box: { x: -70, y: -120, w: 150, h: 110 }, damage: 3, hitstun: 20, launch: 13, push: 0.5,
      },
      {
        name: 'ウィンドミル', cmd: '214', btn: 'K', ai: 'rush', pose: 'windmill', level: 'low', startup: 6, active: 40, recovery: 16,
        move: { vx: 8.8 }, hits: 15, hitInterval: 2, box: { x: -40, y: -60, w: 130, h: 60 }, damage: 1.2, hitstun: 16, push: 1.5,
      },
      {
        name: 'バックフリップ', cmd: '214', btn: 'P', ai: 'evade', pose: 'flip', hop: { vx: -6, vy: -10 }, invuln: [1, 18], endOnLand: true,
        startup: 1, active: 20, recovery: 6,
      },
      {
        name: 'ロックステップ', followLabel: '（当たったら 大P でウィンドキック）',
        follow: { from: 9, to: 30, needHit: true, HP: { name: 'ウィンドキック', pose: 'spin', hop: { vx: 4, vy: -13 }, endOnLand: true, startup: 5, active: 14, recovery: 10,
          hits: 2, hitInterval: 5, box: { x: -20, y: -160, w: 110, h: 120 }, damage: 5.5, hitstun: 34, push: 20, launch: 5 } }, cmd: '623', btn: 'K', ai: 'anti', pose: 'upkick', lowProfile: true, startup: 7, active: 6, recovery: 22,
        box: { x: 0, y: -178, w: 82, h: 130 }, damage: 11, hitstun: 28, launch: 15, push: 2,
      },
      {
        name: 'クロスステップ', cmd: '22', btn: 'K', ai: 'tele', pose: 'slide', phase: true, invuln: [1, 16], startup: 2, active: 16, recovery: 10,
        move: { vx: 8.8 },
      },
      {
        name: 'ダンスバトル', cmd: '236236', btn: 'K', super: true, cost: 100, ai: 'superRush', pose: 'windmill', startup: 8, active: 40, recovery: 22,
        hits: 10, hitInterval: 4, box: { x: -130, y: -150, w: 260, h: 150 }, damage: 4, hitstun: 14, launch: 15, push: 0.5,
      },
    ],
  },
  {
    id: 'makina', name: 'マキナ', title: '鋼鉄のサイボーグ',
    desc: '戻ってくるロケットパンチ、設置型の地雷、踏み込みのパイルバンカーで戦う戦闘用サイボーグ。',
    rating: { power: 4, speed: 2, range: 5, diff: 3 },
    stats: { hp: 110, walk: 3.6, back: 3.0, jump: 15.5, jumpX: 4.7 }, size: 1.05,
    bareArms: true, glowEyes: true,
    colors: { top: '#3a4a5a', pants: '#3a4a5a', skin: '#a8b4c0', hair: '#3a4a5a', accent: '#ff3a3a', aura: '#ff7a3a', belt: '#ff3a3a', shoe: '#2a3440' },
    alt: { skin: '#d4b04a', top: '#5a3a2a', pants: '#5a3a2a', accent: '#3affff', aura: '#3affff', belt: '#3affff' },
    hair: 'flat', head: 'none', extra: [],
    moves: [
      {
        name: 'ロケットパンチ', heavy: { startup: 13, projBoost: { speed: 1.4, damage: 1.2 } }, cmd: '236', btn: 'P', ai: 'zone', pose: 'punch', startup: 11, active: 1, recovery: 20,
        projectile: { kind: 'fist', speed: 11, returnAt: 30, w: 44, h: 28, damage: 9, chip: 2, hitstun: 20, push: 5, color: '#ff7a3a' },
      },
      {
        // 踏み込んで腕の杭を打ち込む。当たると壁までふっ飛んで跳ね返る
        name: 'パイルバンカー', cmd: '214', btn: 'P', ai: 'close', pose: 'rush', step: 7, startup: 14, active: 5, recovery: 26,
        box: { x: 20, y: -135, w: 80, h: 44 }, damage: 12, hitstun: 30, push: 15,
      },
      {
        name: 'ホバーダッシュ', cmd: '236', btn: 'K', air: true, ai: 'air', pose: 'pounce', startup: 2, active: 22, recovery: 4,
        endOnLand: true, resetAir: true, move: { vx: 8, vy: 0, sustainY: true },
      },
      {
        name: '対空レーザー', cmd: '623', btn: 'P', ai: 'anti', pose: 'raise', startup: 6, active: 1, recovery: 24,
        projectile: { kind: 'laser', speed: 12, vy: -12, yOff: 130, w: 34, h: 34, life: 40, damage: 10, chip: 2, hitstun: 26, launch: 13, push: 2, color: '#ff3a3a' },
      },
      {
        name: '地雷', cmd: '22', btn: 'K', ai: 'zone2', pose: 'slam', startup: 12, active: 1, recovery: 24,
        projectile: { kind: 'mine', offset: 90, limit: true, life: 240, arm: 40, w: 44, h: 22, level: 'low', damage: 7, chip: 0, hitstun: 24, launch: 12, push: 1, color: '#ff3a3a' },
      },
      {
        name: 'フルバースト', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'cast', startup: 10, active: 1, recovery: 34,
        projectiles: [
          ...[0, 5, 10, 15, 20, 25].map((delay, i) => ({
            kind: 'missile', delay, speed: 6 + (i % 3), vy: -3 - (i % 3), homing: true, yOff: 110, w: 24, h: 18, life: 160,
            damage: 4, chip: 1, hitstun: 16, push: 2, color: '#ff9a3a',
          })),
          { kind: 'fist', delay: 30, speed: 13, w: 64, h: 40, hits: 2, hitInterval: 6, big: true, damage: 10, chip: 2, hitstun: 24, launch: 15, push: 2, color: '#ff3a3a' },
        ],
      },
    ],
  },
  {
    id: 'shizuku', name: 'シズク', title: '流水の舞手',
    desc: '水を操る少女。泡で相手を閉じ込め、渦で引き寄せ、水鞭で手繰り寄せる。雨乞いで相手の頭上に雨を降らせる。',
    rating: { power: 3, speed: 3, range: 4, diff: 4 },
    stats: { hp: 94, walk: 4.0, back: 3.5, jump: 17, jumpX: 4.5 },
    colors: { top: '#3a9ad8', pants: '#1a3a6a', skin: '#f6d8c0', hair: '#2a5a9a', accent: '#bff0ff', aura: '#4ac8ff', belt: '#bff0ff', shoe: '#1a3a6a' },
    alt: { top: '#6a3ad8', hair: '#3a1a6a', aura: '#b07aff', accent: '#ffd0ff', belt: '#ffd0ff' },
    hair: 'long', head: 'ribbon', extra: [],
    moves: [
      {
        name: 'バブル', cmd: '236', btn: 'P', ai: 'zone', pose: 'cast', startup: 14, active: 1, recovery: 30,
        projectile: { kind: 'bubble', speed: 3.5, w: 46, h: 46, life: 150, damage: 4, chip: 0, hitstun: 10, push: 0, bind: 45, color: '#8ad8ff' },
      },
      {
        // 前方の決まった位置の地面から渦潮が噴き上がり、巻き込んで高く打ち上げる（P は近く、K は遠く）
        name: '渦引き', cmd: '214', btn: 'P', ai: 'zone2', pose: 'slam', startup: 10, active: 1, recovery: 22,
        projectile: { kind: 'vortex', offset: 140, delay: 8, life: 14, limit: true, pullRange: 150, pullPower: 3, w: 230, h: 50, hits: 3, hitInterval: 4, damage: 3.4, chip: 0.6, hitstun: 22, launch: 17, push: 0, color: '#4ac8ff' },
      },
      {
        name: '渦引き・遠', cmd: '214', btn: 'K', ai: 'zone2', pose: 'slam', startup: 10, active: 1, recovery: 24,
        projectile: { kind: 'vortex', offset: 290, delay: 12, life: 14, limit: true, pullRange: 150, pullPower: 3, w: 230, h: 50, hits: 3, hitInterval: 4, damage: 3.4, chip: 0.6, hitstun: 22, launch: 17, push: 0, color: '#4ac8ff' },
      },
      {
        name: '水鞭', heavy: { hits: 4, pull: 14, startup: 12 }, cmd: '236', btn: 'K', ai: 'rush', pose: 'whip', startup: 10, active: 16, recovery: 20,
        hits: 3, hitInterval: 5, box: { x: 30, y: -125, w: 190, h: 34 }, damage: 2.6, hitstun: 26, pull: 10, push: 0,
      },
      {
        name: '水壁', cmd: '623', btn: 'P', ai: 'anti', pose: 'raise', startup: 5, active: 1, recovery: 24, invuln: [1, 6],
        projectile: { kind: 'barrier', offset: 55, life: 50, w: 46, h: 200, erase: true, hits: 1, damage: 9, chip: 2, hitstun: 26, launch: 15, push: 1, color: '#4ac8ff' },
      },
      {
        name: '雨乞い', cmd: '22', btn: 'P', ai: 'zone2', pose: 'raise', startup: 14, active: 1, recovery: 26,
        projectiles: Array.from({ length: 8 }, (_, i) => ({
          kind: 'drop', delay: 10 + i * 9, w: 14, h: 22, life: 90, damage: 2.5, chip: 0.5, hitstun: 12, push: 1, color: '#8ad8ff',
        })),
      },
      {
        name: '大津波', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'cast', startup: 12, active: 1, recovery: 30,
        projectile: { kind: 'tsunami', speed: 5, w: 150, h: 280, big: true, hits: 7, hitInterval: 6, damage: 5, chip: 1, hitstun: 16, push: 5, launch: 15, color: '#4ac8ff' },
      },
    ],
  },
  {
    id: 'max', name: 'マックス', title: '覆面の暴れ牛',
    desc: '覆面のプロレスラー。動かせるダブルラリアット、空中キャッチ、パイルドライバーなど豪快なプロレス技で戦う。',
    rating: { power: 5, speed: 2, range: 2, diff: 3 },
    stats: { hp: 120, walk: 3.2, back: 2.7, jump: 15.5, jumpX: 4.7 }, size: 1.12, thick: 1.3,
    bareArms: true,
    colors: { top: '#d8a070', pants: '#d42a2a', skin: '#d8a070', hair: '#1a1a1a', accent: '#ffd23a', aura: '#ff9a3a', belt: '#ffd23a', shoe: '#ffd23a', hat: '#d42a2a' },
    alt: { pants: '#2a5ad4', hat: '#2a5ad4', accent: '#f0f0f0', belt: '#f0f0f0', shoe: '#f0f0f0', aura: '#6ab0ff' },
    hair: 'none', head: 'luchamask', extra: [],
    moves: [
      {
        name: 'ダブルラリアット', heavy: { hits: 6, active: 42, recovery: 32 }, cmd: '236', btn: 'P', ai: 'close', pose: 'lariat', steer: 3, startup: 6, active: 30, recovery: 28,
        followLabel: '（← → で移動）', hits: 4, hitInterval: 7, box: { x: -75, y: -150, w: 150, h: 60 }, damage: 4.5, hitstun: 18, launch: 15, push: 1,
      },
      {
        name: 'ドロップキック', counterBounce: 'wall', cmd: '214', btn: 'K', ai: 'rush', pose: 'dive', hop: { vx: 7, vy: -8 }, endOnLand: true, landRecovery: 16, landingHit: 60, startup: 8, active: 22, recovery: 12,
        box: { x: 10, y: -110, w: 72, h: 70 }, damage: 11, hitstun: 30, push: 14,
      },
      {
        name: 'パイルドライバー', grabStun: true, cmd: '63214', btn: 'P', ai: 'grab', pose: 'grab', grab: true, style: 'pile', startup: 5, active: 3, recovery: 30,
        box: { x: 10, y: -130, w: 60, h: 110 }, damage: 22, hitstun: 30, push: 3,
      },
      {
        name: 'キャッチ＆スラム', grabStun: true, cmd: '623', btn: 'P', ai: 'anti', pose: 'raise', grab: true, airGrab: true, style: 'slam',
        hop: { vx: 1, vy: -9 }, startup: 6, active: 10, recovery: 20, box: { x: 0, y: -215, w: 72, h: 135 }, damage: 16, hitstun: 30, push: 3,
      },
      {
        name: 'ボディプレス', counterBounce: 'ground', cmd: '214', btn: 'P', air: true, ai: 'air', pose: 'dive', startup: 4, active: 40, recovery: 14, endOnLand: true,
        move: { vx: 1, vy: 13, sustainY: true }, box: { x: -30, y: -90, w: 90, h: 90 }, damage: 12, hitstun: 22, push: 3,
        landWave: [
          { kind: 'wave', speed: 6, w: 40, h: 34, life: 30, damage: 5, chip: 1, hitstun: 18, launch: 5, push: 3, color: '#ffb04a' },
          { kind: 'wave', speed: 6, w: 40, h: 34, life: 30, reverse: true, damage: 5, chip: 1, hitstun: 18, launch: 5, push: 3, color: '#ffb04a' },
        ],
      },
      {
        name: 'ギガントボム', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superGrab', pose: 'grab', grab: true, style: 'pile',
        startup: 3, active: 5, recovery: 34, box: { x: 5, y: -140, w: 82, h: 130 }, damage: 42, hitstun: 40, push: 4,
      },
    ],
  },
  {
    id: 'yomi', name: 'ヨミ', title: '冥府の使者',
    desc: '追尾する魂、引き寄せる冥鎖、体力を吸う魂吸い、被ダメージを増やす呪縛を操る死神。死の宣告は時間差で大ダメージ。',
    rating: { power: 3, speed: 3, range: 5, diff: 5 },
    stats: { hp: 92, walk: 3.8, back: 3.6, jump: 17, jumpX: 4.6 },
    glowEyes: true,
    colors: { top: '#2a2238', pants: '#2a2238', skin: '#d8d0e0', hair: '#2a2238', accent: '#b07aff', aura: '#9a5aff', belt: '#b07aff', shoe: '#1a1428', hat: '#1a1428' },
    alt: { top: '#d8d8e8', pants: '#d8d8e8', hat: '#e8e8f0', aura: '#ff5a8a', accent: '#ff5a8a', belt: '#ff5a8a' },
    hair: 'none', head: 'hood', extra: ['cape'],
    moves: [
      {
        name: '魂弾', heavy: { projBoost: { speed: 1.5 } }, cmd: '236', btn: 'P', ai: 'zone', pose: 'cast', startup: 13, active: 1, recovery: 22,
        projectile: { kind: 'orb', speed: 4, homing: true, w: 36, h: 36, life: 220, damage: 9, chip: 2, hitstun: 20, push: 4, color: '#9a5aff' },
      },
      {
        name: '冥鎖', cmd: '214', btn: 'P', ai: 'zone', pose: 'whip', startup: 10, active: 1, recovery: 36,
        projectile: { kind: 'chain', speed: 15, life: 16, w: 30, h: 24, damage: 6, chip: 1, hitstun: 30, push: 0, pullToOwner: true, syncRecovery: true, color: '#b07aff' },
      },
      {
        name: '落影', cmd: '214', btn: 'K', ai: 'tele', pose: 'dive', teleport: 'above', level: 'high', startup: 12, active: 40, recovery: 10, endOnLand: true,
        box: { x: -20, y: -80, w: 72, h: 80 }, damage: 10, hitstun: 22, push: 3,
      },
      {
        name: '魂吸い', cmd: '623', btn: 'P', ai: 'close', pose: 'grab', startup: 7, active: 16, recovery: 22,
        hits: 3, hitInterval: 5, box: { x: 15, y: -140, w: 66, h: 90 }, damage: 4.4, hitstun: 24, drain: true, push: 4,
      },
      {
        name: '呪縛', cmd: '22', btn: 'P', ai: 'zone2', pose: 'raise', startup: 14, active: 1, recovery: 24,
        projectile: { kind: 'curse', offset: 150, delay: 6, life: 30, w: 70, h: 150, damage: 3, chip: 0, hitstun: 14, push: 0, curse: 420, color: '#b07aff' },
      },
      {
        name: '死の宣告', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'slash', startup: 10, active: 1, recovery: 30,
        projectile: { kind: 'scythe', speed: 9, w: 60, h: 120, big: true, damage: 8, chip: 2, hitstun: 24, push: 4, doom: 180, doomDamage: 28, color: '#9a5aff' },
      },
    ],
  },
  {
    id: 'hayate', name: 'ハヤテ', title: '風を纏う少年',
    desc: '小柄で最速の少年。相手を巻き上げる竜巻、押し返すつむじ風、3段の風刃、風の加護で風のように戦う。',
    rating: { power: 2, speed: 5, range: 3, diff: 3 },
    stats: { hp: 86, walk: 5.2, back: 4.4, jump: 19, jumpX: 5.6 }, size: 0.85,
    colors: { top: '#f2f2f2', pants: '#3a6ad4', skin: '#f0c08a', hair: '#3a8a3a', accent: '#3aff9a', aura: '#7affc8', belt: '#3a6ad4', shoe: '#3a3a3a' },
    alt: { top: '#2a2a2a', pants: '#8a2a2a', hair: '#8a5a2a', accent: '#ff9a3a', aura: '#ffb06a', belt: '#ff9a3a' },
    hair: 'spiky', head: 'none', extra: ['scarf'],
    moves: [
      {
        name: '竜巻', cmd: '236', btn: 'P', ai: 'zone', pose: 'cast', startup: 12, active: 1, recovery: 22,
        projectile: { kind: 'tornado', speed: 5.5, w: 48, h: 90, life: 120, hits: 4, hitInterval: 9, damage: 3.5, chip: 1, hitstun: 20, push: 0, lift: 8, color: '#7affc8' },
      },
      {
        name: 'つむじ風', cmd: '214', btn: 'P', ai: 'close', pose: 'palm', startup: 8, active: 6, recovery: 16,
        box: { x: 20, y: -150, w: 92, h: 150 }, damage: 1, chip: 0, hitstun: 24, blockstun: 12, push: 20,
      },
      {
        name: '風刃乱舞', cmd: '236', btn: 'K', ai: 'zone2', pose: 'cast', startup: 12, active: 1, recovery: 22,
        projectiles: [40, 90, 140].map(yOff => ({
          kind: 'windblade', speed: 10, yOff, w: 22, h: 26, damage: 4, chip: 1, hitstun: 14, push: 3, color: '#7affc8',
        })),
      },
      {
        name: '昇風', cmd: '623', btn: 'K', ai: 'anti', pose: 'raise', startup: 5, active: 1, recovery: 24, invuln: [1, 7],
        projectile: { kind: 'updraft', offset: 50, life: 30, w: 60, h: 220, hits: 3, hitInterval: 8, damage: 4, chip: 1, hitstun: 22, lift: 9, push: 0, color: '#7affc8' },
      },
      { name: '風の加護', cmd: '22', btn: 'P', ai: 'buff', pose: 'meditate', startup: 10, active: 1, recovery: 20, buff: { speed: 1.4, frames: 600 } },
      {
        name: '疾風連脚', cmd: '214', btn: 'K', ai: 'rush', pose: 'spin', startup: 5, active: 40, recovery: 16,
        move: { vx: 8.8 }, hits: 15, hitInterval: 2, box: { x: -30, y: -115, w: 125, h: 44 }, damage: 1.2, hitstun: 15, push: 1,
      },
      kickUp({ name: '旋風蹴り上げ', cmd: '421', btn: 'HK', pose: 'spin' }, { name: '風の吹き飛ばし', pose: 'airkick', push: 22 }),
      {
        name: '天嵐', cmd: '236236', btn: 'P', super: true, cost: 100, ai: 'superFar', pose: 'raise', startup: 12, active: 1, recovery: 34,
        projectile: { kind: 'tornado', speed: 2, w: 130, h: 300, big: true, life: 200, pullRange: 260, hits: 8, hitInterval: 7, damage: 4, chip: 1, hitstun: 18, lift: 7, push: 0, color: '#7affc8' },
      },
    ],
  },
];

const RANDOM_INDEX = CHARACTERS.length; // キャラクター選択の「ランダム」
const ROSTER_COLS = 5;
const ROSTER_ROWS = Math.ceil(CHARACTERS.length / ROSTER_COLS);

// コマンドの判定優先度（長いコマンド・超必殺技を先に調べる）
function cmdPriority(m) {
  if (m.super) return 0;
  if (m.cmd === 'mash') return 1;
  if (m.cmd.length >= 5) return 1;
  if (m.cmd === '236' || m.cmd === '214') return 2;
  if (m.cmd === '623' || m.cmd === '421') return 3;
  if (m.cmd.startsWith('[')) return 4;
  return 5;
}

function makePalette(c) {
  const glove = c.glove || '#d42a2a';
  return {
    top: c.top, topD: shade(c.top, -0.3),
    pants: c.pants, pantsD: shade(c.pants, -0.3),
    skin: c.skin, skinD: shade(c.skin, -0.2),
    hair: c.hair, accent: c.accent, aura: c.aura, belt: c.belt,
    shoe: c.shoe, shoeD: shade(c.shoe, -0.2),
    glove, gloveD: shade(glove, -0.3),
    hat: c.hat || '#c8a050', hatD: shade(c.hat || '#c8a050', -0.3),
  };
}

function flatPalette(color) {
  const keys = ['top', 'topD', 'pants', 'pantsD', 'skin', 'skinD', 'hair', 'accent', 'aura', 'belt', 'shoe', 'shoeD', 'glove', 'gloveD', 'hat', 'hatD'];
  return { ...Object.fromEntries(keys.map(k => [k, color])), flat: true };
}
const WHITE_PAL = flatPalette('#ffffff');
