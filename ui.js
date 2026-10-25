'use strict';

// ============================================================
//  DOM
// ============================================================
const $ = id => document.getElementById(id);
const ui = {
  hud: $('hud'),
  timer: $('timer'),
  announce: $('announce'),
  title: $('title'),
  select: $('select'),
  selectTitle: $('select-title'),
  selectHelp: $('select-help'),
  roster: $('roster'),
  pause: $('pause'),
  config: $('config'),
  online: $('online'),
  controlsTable: $('controls-table'),
  training: $('training'),
  trCombo: $('tr-combo'),
  trHelp: $('tr-help'),
  result: $('result'),
  resultText: $('result-text'),
  buttons: [...document.querySelectorAll('.menu button')],
  p1: { name: $('p1-name'), hp: $('p1-hp'), lag: $('p1-lag'), meter: $('p1-meter'), wins: $('p1-wins') },
  p2: { name: $('p2-name'), hp: $('p2-hp'), lag: $('p2-lag'), meter: $('p2-meter'), wins: $('p2-wins') },
  side: [
    { preview: $('preview-p1'), meta: $('meta-p1'), moves: $('moves-p1'), panel: document.querySelector('.side-p1') },
    { preview: $('preview-p2'), meta: $('meta-p2'), moves: $('moves-p2'), panel: document.querySelector('.side-p2') },
  ],
};

function announce(text, stay = false) {
  ui.announce.textContent = text;
  ui.announce.className = '';
  void ui.announce.offsetWidth; // アニメーションを再始動
  ui.announce.className = stay ? 'stay' : 'show';
}

function clearAnnounce() {
  ui.announce.className = '';
}

function movesHTML(def) {
  return def.moves.map(m =>
    `<li class="${m.super ? 'super' : ''}"><span class="mv-name">${m.name}</span><span class="mv-cmd">${cmdLabel(m)}</span></li>`
  ).join('');
}

// そのキャラが出せる通常技（連携の順に並べる）。投げは全員共通なので除く
const SHARED_NORMALS = ['throw'];
function normalKeys(f) {
  const keys = [];
  const visit = k => {
    const m = f.normals[k];
    if (!m || keys.includes(k)) return;
    keys.push(k);
    const t = m.cancel && m.cancel.target;
    if (t) for (const next of Object.values(t)) visit(next);
  };
  for (const k of ['jab', 'kick', 'hp', 'hk', 'crouchJab', 'sweep', 'chp', 'chk', 'elbow', 'overhead', 'uppercut',
    'd6hp', 'd6hk', 'd3hp', 'd3hk', 'd1hp', 'd1hk', 'd4hp', 'd4hk', 'dashPunch', 'slide',
    'airPunch', 'airKick', 'ahp', 'ahk', 'airH', 'diveKick']) visit(k);
  return keys;
}

function normalsHTML(f) {
  return normalKeys(f).map(k => {
    const m = f.normals[k];
    return `<li class="normal"><span class="mv-name">${m.label}</span><span class="mv-cmd">${m.input}</span></li>`;
  }).join('');
}

function metaHTML(def, sideLabel) {
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const r = def.rating;
  return `
    <div class="ch-side">${sideLabel}</div>
    <div class="ch-name">${def.name}</div>
    <div class="ch-title">${def.title}</div>
    <div class="ch-desc">${def.desc}</div>
    <div class="ch-stats">
      <span>パワー</span><b>${stars(r.power)}</b>
      <span>スピード</span><b>${stars(r.speed)}</b>
      <span>リーチ</span><b>${stars(r.range)}</b>
      <span>難易度</span><b>${stars(r.diff)}</b>
    </div>`;
}
