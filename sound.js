'use strict';

// ============================================================
//  サウンド（WebAudio で生成）
// ============================================================
let actx = null;
let noiseBuf = null;

function initAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) {
    actx = null;
  }
}

function tone(freq, dur, { type = 'square', vol = 0.1, to = null } = {}) {
  if (!actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(actx.destination);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur, { vol = 0.2, freq = 1000 } = {}) {
  if (!actx) return;
  if (!noiseBuf) {
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = actx.currentTime;
  const src = actx.createBufferSource();
  const f = actx.createBiquadFilter();
  const g = actx.createGain();
  src.buffer = noiseBuf;
  f.type = 'lowpass';
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(actx.destination);
  src.start(t);
  src.stop(t + dur);
}

const SFX = {
  swing: () => noise(0.08, { vol: 0.06, freq: 4000 }),
  hit: big => {
    noise(big ? 0.2 : 0.12, { vol: 0.35, freq: big ? 900 : 1500 });
    tone(big ? 110 : 160, 0.12, { vol: 0.15, to: 50 });
  },
  block: () => {
    tone(1200, 0.05, { vol: 0.06 });
    noise(0.05, { vol: 0.1, freq: 5000 });
  },
  fireball: () => tone(220, 0.35, { type: 'sawtooth', vol: 0.07, to: 660 }),
  slash: () => noise(0.15, { vol: 0.12, freq: 6000 }),
  thunder: () => {
    noise(0.6, { vol: 0.4, freq: 800 });
    tone(80, 0.4, { type: 'sawtooth', vol: 0.1, to: 30 });
  },
  burst: () => noise(0.4, { vol: 0.3, freq: 500 }),
  teleport: () => tone(1400, 0.15, { type: 'sine', vol: 0.08, to: 300 }),
  power: () => tone(160, 0.6, { type: 'sawtooth', vol: 0.08, to: 480 }),
  super: () => {
    tone(300, 0.5, { type: 'sawtooth', vol: 0.1, to: 1200 });
    noise(0.5, { vol: 0.15, freq: 3000 });
  },
  ko: () => {
    tone(300, 0.8, { type: 'sawtooth', vol: 0.12, to: 40 });
    noise(0.5, { vol: 0.3, freq: 600 });
  },
  select: () => tone(880, 0.07, { vol: 0.05 }),
  confirm: () => {
    tone(660, 0.08, { vol: 0.07 });
    setTimeout(() => tone(1320, 0.15, { vol: 0.07 }), 70);
  },
  cancel: () => tone(330, 0.1, { vol: 0.06 }),
  fight: () => {
    tone(440, 0.15, { vol: 0.08 });
    setTimeout(() => tone(880, 0.3, { vol: 0.08 }), 120);
  },
  jump: () => noise(0.05, { vol: 0.04, freq: 2500 }),
};
