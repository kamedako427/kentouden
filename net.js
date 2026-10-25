'use strict';

// ============================================================
//  オンライン対戦（PeerJS で2台のブラウザを直接つなぐ）
// ============================================================
// しくみ：お互いが毎フレームのボタン入力だけを送り合い、両方の入力がそろったフレームだけ
// 両方の画面で同じ計算をして試合を進める（ロックステップ）。通信の待ち時間を吸収するため、
// 自分の入力は NET_DELAY フレーム後に反映される。
// 部屋を作った人が 1P、部屋コードで入った人が 2P。
const NET_PREFIX = 'kentouden-v1-';
const NET_DELAY = 4;
const NET_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const NET_INPUT_KEYS = ['left', 'right', 'up', 'down', 'punch', 'hpunch', 'kick', 'hkick', 'grab', 'gauge'];

// 入力を数字1つにまとめる（送るデータを小さく）
const packInput = inp => NET_INPUT_KEYS.reduce((n, k, i) => n | (inp[k] ? 1 << i : 0), 0);
const unpackInput = n => {
  const inp = { ...NO_INPUT };
  NET_INPUT_KEYS.forEach((k, i) => { inp[k] = !!(n & (1 << i)); });
  return inp;
};

class Net {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.conn = null;
    this.side = 0;
    this.code = '';
  }

  available() {
    return typeof Peer !== 'undefined';
  }

  // 部屋を作る（1P）
  host() {
    this.close();
    this.side = 0;
    this.code = Array.from({ length: 5 }, () => NET_CODE_CHARS[Math.floor(Math.random() * NET_CODE_CHARS.length)]).join('');
    this.peer = new Peer(NET_PREFIX + this.code);
    this.peer.on('open', () => this.game.onNetStatus('host-ready', this.code));
    this.peer.on('connection', conn => {
      if (this.conn) {
        conn.close(); // 2人目以降は入れない
        return;
      }
      this.attach(conn);
    });
    this.peer.on('error', err => this.game.onNetStatus('error', err.type));
  }

  // 部屋に入る（2P）
  join(code) {
    this.close();
    this.side = 1;
    this.code = code;
    this.peer = new Peer();
    this.peer.on('open', () => {
      this.attach(this.peer.connect(NET_PREFIX + code, { reliable: true, serialization: 'json' }));
      this.game.onNetStatus('joining', code);
    });
    this.peer.on('error', err => this.game.onNetStatus('error', err.type));
  }

  attach(conn) {
    this.conn = conn;
    conn.on('open', () => this.game.onNetConnected());
    conn.on('data', d => this.game.onNetData(d));
    conn.on('close', () => this.game.onNetClosed());
    conn.on('error', () => this.game.onNetClosed());
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }

  close() {
    const conn = this.conn, peer = this.peer;
    this.conn = null;
    this.peer = null;
    try { if (conn) conn.close(); } catch (e) { /* もう切れている */ }
    try { if (peer) peer.destroy(); } catch (e) { /* もう切れている */ }
  }
}

Object.assign(Game.prototype, {
  // ---------- 部屋（ロビー） ----------
  openLobby() {
    this.state = 'lobby';
    this.mode = 'online';
    this.netRunning = false;
    if (!this.net) this.net = new Net(this);
    ui.title.classList.add('hidden');
    ui.online.classList.remove('hidden');
    $('net-showcode').textContent = '';
    this.setNetStatus(this.net.available()
      ? '部屋を作って相手に部屋コードを教えるか、相手の部屋コードを入力してください'
      : '通信の仕組みを読み込めませんでした。インターネットにつながっているか確かめて、ページを開き直してください');
  },

  setNetStatus(text) {
    $('net-status').textContent = text;
  },

  onNetStatus(kind, info) {
    if (kind === 'host-ready') {
      $('net-showcode').textContent = info;
      this.setNetStatus('この部屋コードを相手に送ってください。相手が入るのを待っています…');
    } else if (kind === 'joining') {
      this.setNetStatus(`部屋 ${info} に接続しています…`);
    } else if (kind === 'error') {
      const msg = info === 'peer-unavailable' ? 'その部屋コードの部屋が見つかりません。コードを確かめてください'
        : info === 'unavailable-id' ? 'その部屋コードは使われています。もう一度「部屋を作る」を押してください'
        : info === 'network' || info === 'server-error' ? '通信サーバーにつながりません。インターネット接続を確かめてください'
        : `通信エラー（${info}）`;
      this.setNetStatus(msg);
    }
  },

  onNetConnected() {
    SFX.confirm();
    ui.online.classList.add('hidden');
    this.netRematch = [false, false];
    this.goSelect('online');
  },

  onNetClosed() {
    if (this.mode !== 'online' || !this.net) return;
    this.net.close();
    this.netRunning = false;
    if (this.state === 'title') return;
    this.goTitle();
    announce('通信が切れました', true);
  },

  leaveOnline() {
    if (this.net) {
      this.net.send({ t: 'bye' });
      this.net.close();
    }
    this.netRunning = false;
    ui.online.classList.add('hidden');
    this.goTitle();
  },

  // 相手から届いたデータ
  onNetData(d) {
    if (!d || typeof d !== 'object') return;
    const s = this.sel;
    const other = 1 - this.net.side;
    switch (d.t) {
      case 'cur':
        if (this.state === 'select' && !s.locked[other]) s.cursor[other] = d.c;
        break;
      case 'lock':
        s.cursor[other] = d.c;
        s.pick[other] = d.pick;
        s.locked[other] = true;
        SFX.confirm();
        break;
      case 'unlock':
        s.locked[other] = false;
        s.pick[other] = null;
        break;
      case 'start':
        this.netStart(d.seed, d.pick);
        break;
      case 'in':
        if (this.lock) this.lock.remote[d.f] = d.i;
        break;
      case 'sum':
        if (this.lock) {
          const mine = this.lock.sums[d.f];
          if (mine != null && mine !== d.h) this.netDesync();
          else this.lock.theirSums[d.f] = d.h;
        }
        break;
      case 'rematch':
        this.netRematch[other] = true;
        this.checkRematch();
        break;
      case 'bye':
        this.onNetClosed();
        break;
    }
  },

  // ---------- キャラ選択 ----------
  updateOnlineSelect() {
    const s = this.sel;
    const side = this.net.side;
    const map = CONTROLS.p1; // 自分のキャラは、どちらの側でも 1P のキーで操作する
    const before = s.cursor[side];
    if (s.locked[side]) {
      if (tapped(map.kick)) {
        this.unlockSide(side);
        this.net.send({ t: 'unlock' });
      }
    } else {
      this.selInput(side, map);
      if (s.locked[side]) this.net.send({ t: 'lock', c: s.cursor[side], pick: s.pick[side] });
      else if (s.cursor[side] !== before) this.net.send({ t: 'cur', c: s.cursor[side] });
    }
    // 両方決まったら、1P（部屋を作った人）が試合開始を知らせる
    if (s.locked[0] && s.locked[1] && side === 0) {
      if (++s.timer >= 45) {
        const seed = (Math.random() * 2 ** 31) >>> 0;
        const pick = [...s.pick];
        this.net.send({ t: 'start', seed, pick });
        this.netStart(seed, pick);
      }
    } else {
      s.timer = 0;
    }
  },

  // ---------- 試合（ロックステップ） ----------
  netStart(seed, pick) {
    setSeed(seed);
    this.sel.pick = [...pick];
    this.lock = { frame: 0, sent: NET_DELAY, local: {}, remote: {}, sums: {}, theirSums: {}, wait: 0 };
    // 最初の数フレームはお互い何も押していない
    for (let f = 0; f < NET_DELAY; f++) {
      this.lock.local[f] = 0;
      this.lock.remote[f] = 0;
    }
    this.netRunning = true;
    this.netRematch = [false, false];
    this.startMatch();
  },

  // 毎フレーム呼ばれる。両方の入力がそろっていれば1フレーム進める
  netUpdate() {
    const L = this.lock;
    if (tapped(['Escape'])) {
      this.leaveOnline();
      return;
    }
    // 自分の入力（NET_DELAY フレーム後の分）を送る
    if (L.sent <= L.frame + NET_DELAY) {
      const packed = packInput(humanInput(CONTROLS.p1));
      L.local[L.sent] = packed;
      this.net.send({ t: 'in', f: L.sent, i: packed });
      L.sent++;
    }
    const theirs = L.remote[L.frame];
    if (theirs === undefined) {
      // 相手の入力がまだ届いていない → 待つ
      if (++L.wait === 40) announce('通信待ち…');
      this.updateEffects();
      return;
    }
    if (L.wait >= 40) clearAnnounce();
    L.wait = 0;
    const mine = L.local[L.frame];
    const side = this.net.side;
    this.netInputs = side === 0 ? [unpackInput(mine), unpackInput(theirs)] : [unpackInput(theirs), unpackInput(mine)];
    delete L.local[L.frame - 60];
    delete L.remote[L.frame - 60];
    this.netStepping = true;
    this.update();
    this.netStepping = false;
    this.netInputs = null;
    // ずれていないか、ときどき確かめる
    if (L.frame % 120 === 0 && this.p1 && this.p2) {
      const h = Math.round(this.p1.hp * 100) * 7 + Math.round(this.p1.x * 10) * 13 + Math.round(this.p2.hp * 100) * 17 +
        Math.round(this.p2.x * 10) * 19 + Math.round(this.p1.y) * 23 + Math.round(this.p2.y) * 29;
      L.sums[L.frame] = h;
      this.net.send({ t: 'sum', f: L.frame, h });
      if (L.theirSums[L.frame] != null && L.theirSums[L.frame] !== h) this.netDesync();
    }
    L.frame++;
  },

  netDesync() {
    if (this.netDesynced) return;
    this.netDesynced = true;
    this.addPopup('同期がずれました（ブラウザの種類が違うと起きることがあります）', W / 2 + this.camX, 120, '#ff7a7a');
  },

  // ---------- 試合のあと ----------
  updateOnlineResult() {
    this.stateTimer++;
    this.stepFighters(NO_INPUT, NO_INPUT);
    if (this.stateTimer <= 30) return;
    if (tapped(['Enter', 'Space', ...CONTROLS.p1.punch]) && !this.netRematch[this.net.side]) {
      this.netRematch[this.net.side] = true;
      this.net.send({ t: 'rematch' });
      SFX.confirm();
      ui.resultText.textContent = '相手を待っています…';
      this.checkRematch();
    } else if (tapped(['Escape'])) {
      this.leaveOnline();
    }
  },

  checkRematch() {
    if (this.state === 'result' && this.netRematch[0] && this.netRematch[1]) {
      this.netRematch = [false, false];
      this.goSelect('online');
    }
  },
});

// 部屋の画面のボタン
$('net-host').addEventListener('click', () => {
  initAudio();
  if (!game.net.available()) return;
  game.setNetStatus('部屋を作っています…');
  game.net.host();
});
$('net-join').addEventListener('click', () => {
  initAudio();
  if (!game.net.available()) return;
  const code = $('net-code').value.trim().toUpperCase();
  if (code.length < 5) {
    game.setNetStatus('5文字の部屋コードを入力してください');
    return;
  }
  game.net.join(code);
});
$('net-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('net-join').click();
  if (e.key === 'Escape') e.target.blur();
});
$('net-back').addEventListener('click', () => game.leaveOnline());
