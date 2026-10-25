'use strict';

// ============================================================
//  ゲーム本体
// ============================================================
// トレーニングモードのダミーの動き
const DUMMY_MODES = [
  { id: 'idle', label: '棒立ち' },
  { id: 'crouch', label: 'しゃがみガード' },
  { id: 'stand', label: '立ちガード' },
  { id: 'jump', label: 'ジャンプし続ける' },
  { id: 'cpu', label: 'CPU' },
  { id: 'replay', label: '記録した動きをくり返す' },
];
const RECORD_MAX = 600; // 記録できる長さ（10秒）

class Game {
  constructor() {
    this.cpu = new CPU();
    this.bg = buildBackground();
    this.vignette = buildVignette();
    this.projectiles = [];
    this.particles = [];
    this.popups = [];
    this.petals = Array.from({ length: 36 }, () => this.newPetal(true));
    this.frame = 0;
    this.camX = (STAGE_W - W) / 2;
    this.hitstop = 0;
    this.freeze = 0;
    this.shake = 0;
    this.combo = null;
    this.moveText = null;
    this.paused = false;
    this.menuIndex = 0;
    this.mode = 'cpu';
    this.sel = { cursor: [0, 1], col: [0, 1], pick: [null, null], locked: [false, false], timer: 0 };

    ui.buttons.forEach((btn, i) => {
      btn.addEventListener('mouseenter', () => this.selectMenu(i));
      btn.addEventListener('click', () => {
        initAudio();
        if (this.state === 'title') this.goSelect(btn.dataset.mode);
      });
    });

    // 操作設定
    $('config-reset').addEventListener('click', () => {
      resetControls();
      this.binding = null;
      SFX.select();
      this.renderConfig();
    });
    $('config-back').addEventListener('click', () => this.goTitle());
    window.addEventListener('keydown', e => {
      if (this.state !== 'config' || !this.binding) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code !== 'Escape') bindControl(this.binding.p, this.binding.a, e.code);
      this.binding = null;
      SFX.select();
      this.renderConfig();
    }, true);

    this.buildRoster();
    this.goTitle();
  }

  openConfig() {
    this.state = 'config';
    this.binding = null;
    ui.title.classList.add('hidden');
    ui.config.classList.remove('hidden');
    this.renderConfig();
  }

  renderConfig() {
    for (const p of ['p1', 'p2']) {
      const rows = CONTROL_ACTIONS.map(([a, label]) => {
        const wait = this.binding && this.binding.p === p && this.binding.a === a;
        return `<tr><th>${label}</th><td><button data-p="${p}" data-a="${a}" class="${wait ? 'waiting' : ''}">${wait ? 'キーを押す…' : keysLabel(CONTROLS[p][a])}</button></td></tr>`;
      }).join('');
      const el = $('config-' + p);
      el.innerHTML = `<caption>${p === 'p1' ? '1P' : '2P'}</caption>${rows}`;
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        this.binding = { p: b.dataset.p, a: b.dataset.a };
        this.renderConfig();
      }));
    }
    $('config-help').textContent = this.binding
      ? '使いたいキーを押してください（Esc でやめる）'
      : '変えたい項目をクリックして、使いたいキーを押してください（同じキーは1つの項目にしか使えません）';
  }

  // タイトル画面の操作表（今の操作設定から作る）
  renderControlsTable() {
    const table = (p, title) => {
      const c = CONTROLS[p];
      const row = (th, td) => `<tr><th>${th}</th><td>${td}</td></tr>`;
      return `<table><caption>${title}</caption>
        ${row('移動 / ジャンプ', `${keysLabel(c.left)} ${keysLabel(c.right)} / ${keysLabel(c.up)}`)}
        ${row('ガード（しゃがみ）', keysLabel(c.down))}
        ${row('弱パンチ / 大パンチ', `${keysLabel(c.punch)} / ${keysLabel(c.hpunch)}`)}
        ${row('弱キック / 大キック', `${keysLabel(c.kick)} / ${keysLabel(c.hkick)}`)}
        ${row('つかみ（投げ）', keysLabel(c.grab))}
        ${row('ゲージ衝撃波', keysLabel(c.gauge))}</table>`;
    };
    ui.controlsTable.innerHTML = table('p1', '1P') + table('p2', '2P');
  }

  newPetal(randomY) {
    return {
      x: Math.random() * W,
      y: randomY ? Math.random() * H : -10,
      vx: -0.4 - Math.random() * 0.6,
      vy: 0.5 + Math.random() * 0.8,
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 0.1,
      r: 3 + Math.random() * 3,
      phase: Math.random() * TAU,
    };
  }

  // ---------- キャラクター選択 ----------
  buildRoster() {
    const pick = i => {
      if (this.state !== 'select') return;
      const online = this.mode === 'online';
      const side = online ? this.net.side : this.mode !== 'pvp' && this.sel.locked[0] ? 1 : 0;
      if (this.sel.locked[side]) return;
      this.sel.cursor[side] = i;
      this.lockSide(side);
      if (online) this.net.send({ t: 'lock', c: i, pick: this.sel.pick[side] });
      this.renderSelect();
    };
    this.cards = CHARACTERS.map((def, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      const cv = document.createElement('canvas');
      cv.width = 96;
      cv.height = 96;
      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = def.name;
      card.append(cv, name);
      card.addEventListener('click', () => pick(i));
      ui.roster.append(card);

      const f = new Fighter(def, 0, null);
      const g = cv.getContext('2d');
      f.x = 48;
      f.y = 28 + 140 * f.size;
      f.draw(g);
      return card;
    });

    // ランダム
    const rnd = document.createElement('div');
    rnd.className = 'card random';
    const q = document.createElement('div');
    q.className = 'random-mark';
    q.textContent = '?';
    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = 'ランダム';
    rnd.append(q, name);
    rnd.addEventListener('click', () => pick(RANDOM_INDEX));
    ui.roster.append(rnd);
    this.cards.push(rnd);
  }

  goSelect(mode) {
    if (mode === 'config') {
      this.openConfig();
      return;
    }
    // オンライン対戦：つながっていなければ、まず部屋を作る／入る画面へ
    if (mode === 'online' && !(this.net && this.net.conn && this.net.conn.open)) {
      this.openLobby();
      return;
    }
    if (mode) this.mode = mode;
    this.state = 'select';
    this.sel.locked = [false, false];
    this.sel.pick = [null, null];
    this.sel.timer = 0;
    this.shown = [null, null];
    ui.title.classList.add('hidden');
    ui.result.classList.add('hidden');
    ui.hud.classList.add('hidden');
    ui.training.classList.add('hidden');
    ui.select.classList.remove('hidden');
    clearAnnounce();
    SFX.confirm();
    this.renderSelect();
  }

  lockSide(side) {
    const s = this.sel;
    const c = s.cursor[side];
    s.pick[side] = c === RANDOM_INDEX ? Math.floor(Math.random() * CHARACTERS.length) : c;
    s.locked[side] = true;
    SFX.confirm();
  }

  unlockSide(side) {
    this.sel.locked[side] = false;
    this.sel.pick[side] = null;
    SFX.cancel();
  }

  selInput(side, map) {
    const s = this.sel;
    // 最後の行がランダム
    const cols = ROSTER_COLS, rows = ROSTER_ROWS;
    let c = s.cursor[side];
    let row = c === RANDOM_INDEX ? rows : Math.floor(c / cols);
    let col = s.col[side];
    if (row < rows) {
      if (tapped(map.left)) col = (col + cols - 1) % cols;
      if (tapped(map.right)) col = (col + 1) % cols;
    }
    if (tapped(map.down)) row = (row + 1) % (rows + 1);
    if (tapped(map.up)) row = (row + rows) % (rows + 1);
    s.col[side] = col;
    c = row === rows ? RANDOM_INDEX : Math.min(CHARACTERS.length - 1, row * cols + col);
    if (c !== s.cursor[side]) {
      s.cursor[side] = c;
      SFX.select();
    }
    const confirm = side === 0 || this.mode !== 'pvp' ? [...map.punch, 'Enter'] : map.punch;
    if (tapped(confirm)) this.lockSide(side);
  }

  updateSelect() {
    const s = this.sel;
    if (tapped(['Escape'])) {
      SFX.cancel();
      if (this.mode === 'online') this.leaveOnline();
      else this.goTitle();
      return;
    }
    if (this.mode === 'online') {
      this.updateOnlineSelect();
      this.renderSelect();
      return;
    }
    if (this.mode !== 'pvp') {
      const map = CONTROLS.p1;
      if (!s.locked[0]) {
        this.selInput(0, map);
      } else if (!s.locked[1]) {
        if (tapped(map.kick)) this.unlockSide(0); else this.selInput(1, map);
      } else if (tapped(map.kick)) {
        this.unlockSide(1);
      }
    } else {
      [CONTROLS.p1, CONTROLS.p2].forEach((map, side) => {
        if (s.locked[side]) {
          if (tapped(map.kick)) this.unlockSide(side);
        } else {
          this.selInput(side, map);
        }
      });
    }

    if (s.locked[0] && s.locked[1]) {
      if (++s.timer >= 45) this.startMatch();
    } else {
      s.timer = 0;
    }
    this.renderSelect();
  }

  renderSelect() {
    const s = this.sel;
    const cpu = this.mode !== 'pvp' && this.mode !== 'online';
    const p2Label = this.mode === 'training' ? 'ダミー' : cpu ? 'CPU' : '2P';
    const showP2 = !cpu || s.locked[0];
    this.cards.forEach((card, i) => {
      const c1 = s.cursor[0] === i;
      const c2 = showP2 && s.cursor[1] === i;
      card.classList.toggle('c1', c1);
      card.classList.toggle('c2', c2);
      let badges = '';
      if (c1) badges += '<span class="badge b1">1P</span>';
      if (c2) badges += `<span class="badge b2">${p2Label}</span>`;
      card.querySelectorAll('.badge').forEach(b => b.remove());
      card.insertAdjacentHTML('beforeend', badges);
    });

    this.previews = this.previews || [];
    for (let side = 0; side < 2; side++) {
      // 決定後は選ばれたキャラ（ランダムなら抽選結果）を表示
      const idx = s.locked[side] ? s.pick[side] : s.cursor[side];
      const other = s.locked[0] ? s.pick[0] : s.cursor[0];
      const alt = side === 1 && idx === other ? 1 : 0;
      const key = `${idx}-${alt}`;
      const el = ui.side[side];
      el.panel.classList.toggle('locked', s.locked[side]);
      if (this.shown[side] === key) continue;
      this.shown[side] = key;
      const label = side === 0 ? '1P' : p2Label;
      if (idx === RANDOM_INDEX) {
        el.meta.innerHTML = `
          <div class="ch-side">${label}</div>
          <div class="ch-name">ランダム</div>
          <div class="ch-title">？？？</div>
          <div class="ch-desc">決定すると、${CHARACTERS.length}人の中からランダムでキャラクターが選ばれます。</div>`;
        el.moves.innerHTML = '';
        this.previews[side] = null;
        continue;
      }
      const def = CHARACTERS[idx];
      el.meta.innerHTML = metaHTML(def, label);
      el.moves.innerHTML = movesHTML(def);
      const pv = new Fighter(def, alt, null);
      pv.facing = side === 0 ? 1 : -1;
      this.previews[side] = pv;
    }
    ui.side[1].panel.style.opacity = showP2 ? 1 : 0.35;

    if (cpu) {
      ui.selectTitle.textContent = s.locked[0]
        ? (this.mode === 'training' ? '練習相手（ダミー）を選んでください' : '対戦相手を選んでください')
        : 'キャラクターを選んでください';
      const c1 = CONTROLS.p1;
      ui.selectHelp.textContent = `${keysLabel(c1.left)}${keysLabel(c1.right)}${keysLabel(c1.up)}${keysLabel(c1.down)}：選択 ／ ${keysLabel(c1.punch)}・Enter：決定 ／ ${keysLabel(c1.kick)}：戻る ／ Esc：タイトル`;
    } else {
      ui.selectTitle.textContent = 'CHARACTER SELECT';
      const c1 = CONTROLS.p1, c2 = CONTROLS.p2;
      if (this.mode === 'online') {
        ui.selectHelp.textContent = `あなたは ${this.net.side === 0 ? '1P（左）' : '2P（右）'} ／ ${keysLabel(c1.left)}${keysLabel(c1.right)}${keysLabel(c1.up)}${keysLabel(c1.down)}：選択 ／ ${keysLabel(c1.punch)}・Enter：決定 ／ ${keysLabel(c1.kick)}：戻る ／ Esc：対戦をやめる`;
      } else {
        ui.selectHelp.textContent = `1P：${keysLabel(c1.punch)} 決定・${keysLabel(c1.kick)} 戻る ／ 2P：${keysLabel(c2.punch)} 決定・${keysLabel(c2.kick)} 戻る ／ Esc：タイトル`;
      }
    }
  }

  drawPreviews() {
    if (!this.previews) return;
    for (let side = 0; side < 2; side++) {
      const pv = this.previews[side];
      const cv = ui.side[side].preview;
      const g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      if (!pv) {
        // ランダムにカーソルがある時は「？」を表示
        g.save();
        g.font = '900 120px Impact, "Arial Black", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = `hsl(${(this.frame * 4) % 360}, 90%, 65%)`;
        g.fillText('?', cv.width / 2, cv.height / 2 + 6);
        g.restore();
        continue;
      }
      pv.animTime++;
      pv.stateTime++;
      pv.setState(this.sel.locked[side] ? 'win' : 'idle');
      const sc = 1 / Math.max(1, pv.size);
      g.save();
      g.translate(cv.width / 2, 0);
      g.scale(sc, sc);
      pv.x = 0;
      pv.y = (cv.height - 8) / sc;
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.beginPath();
      g.ellipse(0, pv.y + 2, 40 * pv.size, 7, 0, 0, TAU);
      g.fill();
      pv.draw(g);
      g.restore();
    }
  }

  // ---------- 画面遷移 ----------
  goTitle() {
    this.state = 'title';
    this.paused = false;
    const a = Math.floor(Math.random() * CHARACTERS.length);
    const b = (a + 1 + Math.floor(Math.random() * (CHARACTERS.length - 1))) % CHARACTERS.length;
    this.p1 = new Fighter(CHARACTERS[a], 0, this);
    this.p2 = new Fighter(CHARACTERS[b], 0, this);
    this.p1.reset(STAGE_W / 2 - 160, 1);
    this.p2.reset(STAGE_W / 2 + 160, -1);
    this.snapCamera();
    this.projectiles = [];
    ui.hud.classList.add('hidden');
    ui.result.classList.add('hidden');
    ui.config.classList.add('hidden');
    ui.online.classList.add('hidden');
    this.renderControlsTable();
    ui.select.classList.add('hidden');
    ui.pause.classList.add('hidden');
    ui.training.classList.add('hidden');
    ui.title.classList.remove('hidden');
    clearAnnounce();
  }

  selectMenu(i) {
    if (this.menuIndex !== i) SFX.select();
    this.menuIndex = i;
    ui.buttons.forEach((b, j) => b.classList.toggle('selected', j === i));
  }

  startMatch() {
    const [i1, i2] = this.sel.pick;
    this.p1 = new Fighter(CHARACTERS[i1], 0, this);
    this.p2 = new Fighter(CHARACTERS[i2], i1 === i2 ? 1 : 0, this);
    this.round = 1;
    ui.select.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    ui.p1.name.textContent = this.p1.name;
    ui.p2.name.textContent = this.p2.name + (this.mode === 'cpu' ? '（CPU）' : this.mode === 'training' ? '（ダミー）' : '');
    if (this.mode === 'online') {
      const me = this.net.side;
      ui.p1.name.textContent = this.p1.name + (me === 0 ? '（あなた）' : '（相手）');
      ui.p2.name.textContent = this.p2.name + (me === 1 ? '（あなた）' : '（相手）');
    }
    ui.training.classList.toggle('hidden', this.mode !== 'training');
    if (this.mode === 'training') {
      this.training = { dummy: 0, boxes: false, maxMeter: false, combo: null, best: 0, refill: 0, idleHp: this.p2.maxHp, recording: false, record: [], replayAt: 0 };
      this.renderTraining();
    }
    this.startRound();
  }

  startRound() {
    this.p1.reset(STAGE_W / 2 - 180, 1);
    this.p2.reset(STAGE_W / 2 + 180, -1);
    this.snapCamera();
    this.cpu.reset();
    this.projectiles = [];
    this.combo = null;
    this.moveText = null;
    this.freeze = 0;
    this.time = ROUND_TIME;
    this.timeFrames = 0;
    this.state = 'intro';
    this.stateTimer = 0;
    this.renderWins();
    const final = this.p1.wins === WINS_NEEDED - 1 && this.p2.wins === WINS_NEEDED - 1;
    announce(this.mode === 'training' ? 'TRAINING' : final ? 'FINAL ROUND' : `ROUND ${this.round}`);
  }

  endRound(reason) {
    const { p1, p2 } = this;
    this.state = 'roundEnd';
    this.stateTimer = 0;
    this.projectiles = [];
    this.freeze = 0;

    const r1 = p1.hp / p1.maxHp, r2 = p2.hp / p2.maxHp;
    let winner = null;
    if (r1 > r2) winner = p1;
    else if (r2 > r1) winner = p2;
    if (winner) winner.wins++;
    this.roundWinner = winner;
    this.renderWins();

    let text = 'K.O.';
    if (reason === 'time') text = 'TIME UP';
    else if (p1.hp <= 0 && p2.hp <= 0) text = 'DOUBLE K.O.';
    announce(text, true);
  }

  showResult() {
    this.state = 'result';
    this.stateTimer = 0;
    this.netRunning = false;
    clearAnnounce();
    const w = this.p1.wins >= this.p2.wins ? this.p1 : this.p2;
    let text;
    if (this.p1.wins === this.p2.wins) text = 'DRAW GAME';
    else if (this.mode === 'cpu') text = w === this.p1 ? 'YOU WIN!' : 'YOU LOSE...';
    else if (this.mode === 'online') text = (w === this.p1) === (this.net.side === 0) ? 'YOU WIN!' : 'YOU LOSE...';
    else text = `${w === this.p1 ? '1P' : '2P'} ${w.name} の勝利！`;
    ui.resultText.textContent = text;
    ui.result.classList.remove('hidden');
  }

  togglePause() {
    this.paused = !this.paused;
    ui.pause.classList.toggle('hidden', !this.paused);
    if (this.paused) {
      $('pause-name-p1').textContent = `1P ${this.p1.name}`;
      $('pause-name-p2').textContent = `${this.mode === 'cpu' ? 'CPU' : this.mode === 'training' ? 'ダミー' : '2P'} ${this.p2.name}`;
      $('pause-p1').innerHTML = movesHTML(this.p1.def) + normalsHTML(this.p1);
      $('pause-p2').innerHTML = movesHTML(this.p2.def) + normalsHTML(this.p2);
      const c1 = CONTROLS.p1;
      const btnInfo = `弱P=${keysLabel(c1.punch)} 大P=${keysLabel(c1.hpunch)} 弱K=${keysLabel(c1.kick)} 大K=${keysLabel(c1.hkick)} つかみ=${keysLabel(c1.grab)} ロマキャン=${keysLabel(c1.gauge)}（技表の P・K は弱）`;
      $('pause-common').innerHTML = [...SHARED_NORMALS.map(k => COMMON[k]), ...COMMON_EXTRA.map(m => m.label === 'ボタン' ? { ...m, input: btnInfo } : m)].map(m =>
        `<li><span class="mv-name">${m.label}</span><span class="mv-cmd">${m.input}</span></li>`).join('');
    }
  }

  // ---------- 更新 ----------
  update() {
    // オンライン対戦の試合中は、両方の入力がそろったフレームだけ進める（net.js）
    if (this.mode === 'online' && this.netRunning && !this.netStepping) {
      this.netUpdate();
      this.updateCamera();
      this.updateHUD();
      return;
    }
    this.frame++;
    if (!this.paused) this.updateEffects();

    switch (this.state) {
      case 'lobby':
        if (tapped(['Escape'])) this.leaveOnline();
        this.stepFighters(NO_INPUT, NO_INPUT);
        break;

      case 'config':
        if (!this.binding && tapped(['Escape'])) this.goTitle();
        this.stepFighters(NO_INPUT, NO_INPUT);
        break;

      case 'title':
        if (tapped(['KeyW', 'ArrowUp'])) this.selectMenu((this.menuIndex + ui.buttons.length - 1) % ui.buttons.length);
        if (tapped(['KeyS', 'ArrowDown'])) this.selectMenu((this.menuIndex + 1) % ui.buttons.length);
        if (tapped(['Enter', 'Space'])) {
          this.goSelect(ui.buttons[this.menuIndex].dataset.mode);
          break;
        }
        this.stepFighters(NO_INPUT, NO_INPUT);
        break;

      case 'select':
        this.updateSelect();
        break;

      case 'intro':
        this.stateTimer++;
        if (this.stateTimer === 80) {
          announce('FIGHT!');
          SFX.fight();
        }
        if (this.stateTimer >= 110) this.state = 'fight';
        this.stepFighters(NO_INPUT, NO_INPUT);
        break;

      case 'fight': {
        if (!this.netInputs && tapped(['Escape'])) this.togglePause();
        if (this.paused) {
          if (tapped(['KeyQ'])) this.goTitle();
          break;
        }
        const training = this.mode === 'training';
        if (training) this.trainingKeys();
        let i1 = this.netInputs ? this.netInputs[0] : humanInput(CONTROLS.p1);
        const i2 = this.netInputs ? this.netInputs[1]
          : training ? this.dummyInput(i1)
          : this.mode === 'cpu' ? this.cpu.getInput(this.p2, this.p1, this)
          : humanInput(CONTROLS.p2);
        if (training && this.training.recording) i1 = { ...NO_INPUT }; // 記録中は自分のキャラは立ったまま
        this.stepFighters(i1, i2);
        if (training) {
          // トレーニング：時間切れもKOもない
          this.updateTraining();
          break;
        }

        if (this.p1.hp <= 0 || this.p2.hp <= 0) {
          this.endRound('ko');
          break;
        }
        if (this.freeze <= 0) {
          this.timeFrames++;
          if (this.timeFrames % 60 === 0 && this.time > 0) {
            this.time--;
            if (this.time === 0) this.endRound('time');
          }
        }
        break;
      }

      case 'roundEnd': {
        this.stateTimer++;
        const slow = this.stateTimer < 60 && this.stateTimer % 3 !== 0;
        if (!slow) this.stepFighters(NO_INPUT, NO_INPUT);

        const w = this.roundWinner;
        if (this.stateTimer === 100) {
          if (w) {
            w.attack = null;
            w.vx = 0;
            w.setState('win');
            announce(w.hp >= w.maxHp ? 'PERFECT!' : `${w.name} WIN`, true);
          } else {
            announce('DRAW', true);
          }
        }
        if (this.stateTimer >= 230) {
          if (this.p1.wins >= WINS_NEEDED || this.p2.wins >= WINS_NEEDED || this.round >= 9) {
            this.showResult();
          } else {
            this.round++;
            this.startRound();
          }
        }
        break;
      }

      case 'result':
        if (this.mode === 'online') {
          this.updateOnlineResult();
          break;
        }
        this.stateTimer++;
        this.stepFighters(NO_INPUT, NO_INPUT);
        if (this.stateTimer > 30) {
          if (tapped(['Enter', 'Space'])) this.goSelect();
          else if (tapped(['Escape'])) this.goTitle();
        }
        break;
    }

    this.updateCamera();
    this.updateHUD();
  }

  // ---------- トレーニングモード ----------
  trainingKeys() {
    const tr = this.training;
    let changed = false;
    if (tapped(['Digit1'])) { tr.dummy = (tr.dummy + 1) % DUMMY_MODES.length; changed = true; }
    if (tapped(['Digit2'])) { tr.boxes = !tr.boxes; changed = true; }
    if (tapped(['Digit4'])) {
      // 記録の開始・終了。終わったら自動で「くり返す」にする
      if (tr.recording) this.stopRecording();
      else {
        tr.recording = true;
        tr.record = [];
      }
      changed = true;
    }
    if (tapped(['Digit5']) && tr.record.length) {
      // 再生のオン・オフ
      tr.dummy = DUMMY_MODES[tr.dummy].id === 'replay' ? 0 : DUMMY_MODES.findIndex(m => m.id === 'replay');
      tr.replayAt = 0;
      changed = true;
    }
    if (tapped(['Digit3'])) { tr.maxMeter = !tr.maxMeter; changed = true; }
    if (tapped(['Digit6'])) {
      // 位置をリセット
      this.p1.reset(STAGE_W / 2 - 180, 1);
      this.p2.reset(STAGE_W / 2 + 180, -1);
      this.projectiles = [];
      this.cpu.reset();
      tr.replayAt = 0;
      this.snapCamera();
      changed = true;
    }
    if (changed) {
      SFX.select();
      this.renderTraining();
    }
  }

  stopRecording() {
    const tr = this.training;
    tr.recording = false;
    if (tr.record.length) {
      tr.dummy = DUMMY_MODES.findIndex(m => m.id === 'replay');
      tr.replayAt = 0;
    }
  }

  // ダミーの動き。live は自分の入力（記録中はそれでダミーを動かす）
  dummyInput(live) {
    const tr = this.training;
    const d = this.p2, a = this.p1;
    const inp = { ...NO_INPUT };
    // ← → は「ダミーから見た前・後ろ」で記録・再生する（左右が入れ替わっても同じ動きになる）
    const fwdKey = d.facing > 0 ? 'right' : 'left';
    const backKey = d.facing > 0 ? 'left' : 'right';
    if (tr.recording) {
      tr.record.push({ fwd: live[fwdKey], back: live[backKey], up: live.up, down: live.down, punch: live.punch, hpunch: live.hpunch, kick: live.kick, hkick: live.hkick, grab: live.grab, gauge: live.gauge });
      if (tr.record.length >= RECORD_MAX) {
        this.stopRecording();
        this.renderTraining();
      }
      return { ...live };
    }
    const mode = DUMMY_MODES[tr.dummy].id;
    if (mode === 'replay') {
      if (!tr.record.length) return inp;
      const r = tr.record[tr.replayAt % tr.record.length];
      tr.replayAt++;
      return { ...inp, [fwdKey]: r.fwd, [backKey]: r.back, up: r.up, down: r.down, punch: r.punch, hpunch: r.hpunch, kick: r.kick, hkick: r.hkick, grab: r.grab, gauge: r.gauge };
    }
    const back = a.x < d.x ? 'right' : 'left';
    if (mode === 'crouch') inp.down = true;
    else if (mode === 'stand') {
      // 攻撃が来た時だけ後ろに入れてガード（普段は歩いて逃げない）
      const threat = a.state === 'attack' || d.state === 'blockstun' || this.projectiles.some(p => p.owner === a);
      if (threat) inp[back] = true;
    }
    else if (mode === 'jump') inp.up = true;
    else if (mode === 'cpu') return this.cpu.getInput(d, a, this);
    return inp;
  }

  updateTraining() {
    const tr = this.training, d = this.p2, a = this.p1;
    if (tr.maxMeter) a.meter = METER_MAX;
    const inCombo = d.state === 'hitstun';
    const neutral = !['hitstun', 'down', 'thrown', 'blockstun', 'roll'].includes(d.state) &&
      !['hitstun', 'down', 'thrown', 'blockstun', 'roll'].includes(a.state);
    if (inCombo && d.combo > 0) {
      // 新しいコンボが始まったら記録し直す
      if (!tr.combo || tr.combo.done || d.combo < tr.combo.hits) tr.combo = { hits: 0, startHp: tr.idleHp, dmg: 0, done: false };
      tr.combo.hits = d.combo;
      tr.combo.dmg = tr.combo.startHp - d.hp;
      tr.refill = 50;
      this.renderTraining();
    } else {
      if (tr.combo && !tr.combo.done && !inCombo) {
        tr.combo.done = true;
        tr.best = Math.max(tr.best, tr.combo.hits);
        this.renderTraining();
      }
      // コンボが終わって少ししたら体力を全回復
      if (tr.refill > 0 && neutral && --tr.refill === 0) {
        for (const f of [a, d]) {
          f.hp = f.maxHp;
          f.lagHp = f.maxHp;
        }
      }
      if (!inCombo) tr.idleHp = d.hp;
    }
  }

  renderTraining() {
    const tr = this.training;
    if (!tr) return;
    const c = tr.combo;
    ui.trCombo.textContent = c && c.hits > 0
      ? `${c.hits} HIT　ダメージ ${c.dmg.toFixed(1)}　（最高 ${Math.max(tr.best, c.done ? c.hits : 0)} HIT）`
      : 'コンボを入れてみよう';
    ui.trHelp.innerHTML = [
      `<b>1</b> ダミー：${DUMMY_MODES[tr.dummy].label}${DUMMY_MODES[tr.dummy].id === 'replay' && !tr.record.length ? '（未記録）' : ''}`,
      tr.recording
        ? `<b>4</b> <span class="tr-rec">● 記録中（ダミーを操作中）… もう一度 4 で終了</span>`
        : `<b>4</b> ダミーの動きを記録 ／ <b>5</b> 記録した動きの再生 ${tr.record.length ? `（${(tr.record.length / 60).toFixed(1)}秒）` : ''}`,
      `<b>2</b> 当たり判定の表示：${tr.boxes ? 'オン' : 'オフ'}`,
      `<b>3</b> ゲージ常にMAX：${tr.maxMeter ? 'オン' : 'オフ'}`,
      '<b>6</b> 位置をリセット ／ <b>Esc</b> 技表・タイトルへ',
    ].join('<br>');
  }

  // カメラ：2人の中間を追ってスクロール
  cameraTarget() {
    const mid = (this.p1.x + this.p2.x) / 2;
    return clamp(mid - W / 2, 0, STAGE_W - W);
  }

  updateCamera() {
    this.camX += (this.cameraTarget() - this.camX) * 0.18;
  }

  snapCamera() {
    this.camX = this.cameraTarget();
  }

  stepFighters(i1, i2) {
    if (this.freeze > 0 || this.hitstop > 0) {
      // 止まっている間も入力は受け付ける（キャンセルの先行入力用）
      this.p1.recordInput(i1, true);
      this.p2.recordInput(i2, true);
      if (this.freeze > 0) this.freeze--;
      else this.hitstop--;
      return;
    }
    this.p1.update(i1, this.p2);
    this.p2.update(i2, this.p1);
    this.separate();
    this.carryLocked(this.p1);
    this.carryLocked(this.p2);
    this.checkHit(this.p1, this.p2);
    this.checkHit(this.p2, this.p1);
    this.updateProjectiles();
  }

  // 移動しながらの多段技：当たった相手を自分の前に固定して一緒に運ぶ
  carryLocked(f) {
    const d = f.lockTarget, a = f.attack;
    if (!d || f.state !== 'attack' || !a || f.rushStopped) return;
    if (!((a.move && a.move.vx) || a.steer)) return;
    const t = f.stateTime;
    if (t < a.startup || t >= a.startup + a.active || f.hitCount >= a.hits || d.state !== 'hitstun') return;
    d.x = clamp(f.x + f.lockOffset, STAGE_MIN, STAGE_MAX);
    d.vx = 0;
    // 空中の相手は、運んでいる間はその高さに浮かせておく（最後の段まで落ちないように）
    if (!d.onGround) d.vy = -GRAVITY;
  }

  separate() {
    const a = this.p1, b = this.p2;
    // 2人が画面の幅より離れないようにする
    const spread = b.x - a.x;
    if (Math.abs(spread) > MAX_SPREAD) {
      const ex = (Math.abs(spread) - MAX_SPREAD) / 2 * Math.sign(spread);
      a.x = clamp(a.x + ex, STAGE_MIN, STAGE_MAX);
      b.x = clamp(b.x - ex, STAGE_MIN, STAGE_MAX);
    }
    if (a.state === 'ko' || b.state === 'ko' || a.state === 'down' || b.state === 'down') return;
    const phasing = f => (f.state === 'attack' && f.attack.phase) || f.state === 'roll' || f.state === 'thrown' || f.throwing;
    if (phasing(a) || phasing(b)) return;
    // 押し合い判定は体より低い（足元〜胸くらい）。ジャンプで頭の上を越えられる
    const top = f => f.y - PUSH_H * f.size;
    if (a.y <= top(b) || b.y <= top(a)) return;

    const minDist = 24 * a.size + 24 * b.size;
    const dx = b.x - a.x;
    if (Math.abs(dx) >= minDist) return;
    const dir = dx === 0 ? a.facing : Math.sign(dx);
    const push = (minDist - Math.abs(dx)) / 2;
    a.x = clamp(a.x - dir * push, STAGE_MIN, STAGE_MAX);
    b.x = clamp(b.x + dir * push, STAGE_MIN, STAGE_MAX);

    if (Math.abs(b.x - a.x) < minDist) {
      const aAtWall = a.x <= STAGE_MIN || a.x >= STAGE_MAX;
      if (aAtWall) b.x = clamp(a.x + dir * minDist, STAGE_MIN, STAGE_MAX);
      else a.x = clamp(b.x - dir * minDist, STAGE_MIN, STAGE_MAX);
    }
  }
}
