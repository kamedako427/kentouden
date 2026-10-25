'use strict';

// ============================================================
//  入力
// ============================================================
const keys = {};
let pressed = {};

// 初期設定（操作設定で変えられる。変えた設定はブラウザに保存する）
const DEFAULT_CONTROLS = {
  p1: {
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    punch: ['KeyJ'], kick: ['KeyK'], hpunch: ['KeyU'], hkick: ['KeyI'], grab: ['KeyL'], gauge: ['KeyH'],
  },
  p2: {
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    punch: ['Comma', 'Numpad1'], kick: ['Period', 'Numpad2'], hpunch: ['Semicolon', 'Numpad4'], hkick: ['Quote', 'Numpad5'],
    grab: ['Slash', 'Numpad3'], gauge: ['KeyP', 'Numpad6'],
  },
};
// 操作設定の項目（表示の順番）
const CONTROL_ACTIONS = [
  ['up', 'ジャンプ（↑）'], ['down', 'しゃがみ（↓）'], ['left', '左（←）'], ['right', '右（→）'],
  ['punch', '弱パンチ'], ['kick', '弱キック'], ['hpunch', '大パンチ'], ['hkick', '大キック'],
  ['grab', 'つかみ'], ['gauge', 'ゲージ衝撃波（ロマキャン）'],
];
const CONTROLS_KEY = 'kentou-controls-v2';
const cloneControls = c => JSON.parse(JSON.stringify(c));
let CONTROLS = cloneControls(DEFAULT_CONTROLS);
try {
  const saved = JSON.parse(localStorage.getItem(CONTROLS_KEY) || 'null');
  if (saved) for (const p of ['p1', 'p2']) for (const [k] of CONTROL_ACTIONS) if (Array.isArray(saved[p] && saved[p][k])) CONTROLS[p][k] = saved[p][k];
} catch (e) { /* 保存できない環境では初期設定のまま */ }

let GAME_KEYS = new Set();
function rebuildGameKeys() {
  GAME_KEYS = new Set(Object.values(CONTROLS).flatMap(m => Object.values(m).flat()).concat(['Enter', 'Space', 'Escape']));
}
rebuildGameKeys();

function saveControls() {
  rebuildGameKeys();
  try { localStorage.setItem(CONTROLS_KEY, JSON.stringify(CONTROLS)); } catch (e) { /* 保存できなくても今回は使える */ }
}
function resetControls() {
  CONTROLS = cloneControls(DEFAULT_CONTROLS);
  saveControls();
}
// キーの割り当てを変える（同じキーが他の項目にあれば外す）
function bindControl(player, action, code) {
  for (const p of ['p1', 'p2']) for (const [k] of CONTROL_ACTIONS) CONTROLS[p][k] = CONTROLS[p][k].filter(c => c !== code);
  CONTROLS[player][action] = [code];
  saveControls();
}

// キーの表示名
const KEY_NAMES = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'スペース', Enter: 'Enter',
  Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: ':', BracketLeft: '[', BracketRight: ']',
  Backslash: '\\', Minus: '-', Equal: '^', Backquote: '@', ShiftLeft: '左Shift', ShiftRight: '右Shift',
  ControlLeft: '左Ctrl', ControlRight: '右Ctrl', AltLeft: '左Alt', AltRight: '右Alt', Tab: 'Tab',
};
function keyName(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'テンキー' + code.slice(6);
  return code;
}
const keysLabel = codes => (codes || []).map(keyName).join(' / ') || '—';

window.addEventListener('keydown', e => {
  // 文字を入力する欄（部屋コード）では、キーをそのまま使えるようにする
  if (e.target && e.target.tagName === 'INPUT') return;
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  initAudio();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const held = codes => codes.some(c => keys[c]);
const tapped = codes => codes.some(c => pressed[c]);

const NO_INPUT = Object.freeze({
  left: false, right: false, up: false, down: false,
  punch: false, hpunch: false, kick: false, hkick: false, grab: false, gauge: false, force: null, forceHeavy: false,
});

function humanInput(map) {
  return {
    left: held(map.left),
    right: held(map.right),
    up: held(map.up),
    down: held(map.down),
    punch: tapped(map.punch),
    hpunch: tapped(map.hpunch),
    hkick: tapped(map.hkick),
    kick: tapped(map.kick),
    grab: tapped(map.grab),
    gauge: tapped(map.gauge),
    force: null,
  };
}
