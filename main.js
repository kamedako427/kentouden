'use strict';

// ============================================================
//  メインループ（固定 60fps でロジック更新）
// ============================================================
const game = new Game();
const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;

function loop(now) {
  acc += Math.min(now - last, 100);
  last = now;
  while (acc >= STEP) {
    game.update();
    pressed = {};
    acc -= STEP;
  }
  game.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
