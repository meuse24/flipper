import assert from "node:assert/strict";
import fs from "node:fs";
import { withGameBrowser, openGame } from "./helpers.mjs";

await withGameBrowser(async ({ newContext, origin }) => {
  const context = await newContext({ serviceWorkers: "block" });
  const page = await openGame(context, origin);
  const result = await page.evaluate(() => {
    const test = window.__pinballTest;
    const { launcher, step } = test.constants;
    // This captured outlane state used to loop above y=522 for over 60 seconds.
    const scenarios = [
      // Captured resting pockets between the old guide ends and flipper pivots.
      // These must empty under gravity, without flipper input or a nudge.
      {
        name: "settled left pivot pocket",
        x: 149.55,
        y: 693.4,
        vx: 0,
        vy: 0,
        entered: true,
      },
      {
        name: "settled right pivot pocket",
        x: 365.25,
        y: 691.6,
        vx: 0,
        vy: 0,
        entered: true,
      },
      ...[140, 145, 150, 155, 360, 365, 370, 375].map((x) => ({
        name: `slow pivot approach x=${x}`,
        x,
        y: 685,
        vx: 0,
        vy: 0,
        entered: true,
      })),
      // Near-zero-speed drops also catch a small uphill lip at the pivot.
      ...[
        157, 158, 159, 160, 161, 162, 163, 353, 354, 355, 356, 357, 358, 359,
      ].map((x) => ({
        name: `pivot lip drop x=${x}`,
        x,
        y: 680,
        vx: 0,
        vy: 0,
        entered: true,
      })),
      {
        name: "captured right-outlane orbit",
        x: 438,
        y: 520.1,
        vx: -396.1,
        vy: 738.2,
        entered: true,
      },
      ...Array.from({ length: 21 }, (_, i) => i / 20).map((power) => ({
        name: `unattended launch ${power}`,
        x: launcher.x,
        y: launcher.y,
        vx: launcher.vx,
        vy: -(launcher.minSpeed + launcher.speedRange * power),
        entered: false,
      })),
    ];
    return scenarios.map((setup) => {
      test.reset();
      let state = test.configure({
        ballSave: 0,
        balls: [{ ...setup, launched: true }],
      });
      let elapsed = 0,
        maxY = setup.y,
        reachedFlippers = false,
        ball = state.balls[0];
      const originalBallId = ball.id;
      // Preserve the original tracked ball after it drains during multiball.
      for (; elapsed < 60; elapsed += step) {
        state = test.stepTicks();
        ball =
          state.balls.find((value) => value.id === originalBallId) ||
          state.drainedBalls.find((value) => value.id === originalBallId) ||
          ball;
        maxY = Math.max(maxY, ball.y);
        if (ball.y > 685 && ball.x < 440) reachedFlippers = true;
        if (state.lives < 3 || !state.balls.some((ball) => ball.launched))
          break;
      }
      return {
        name: setup.name,
        seconds: +elapsed.toFixed(2),
        reachedFlippers,
        maxY: +maxY.toFixed(1),
        drained: state.lives < 3,
        score: state.score,
        ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
      };
    });
  });
  fs.writeFileSync(
    "output/natural-drain-results.json",
    JSON.stringify(result, null, 2),
  );
  console.table(
    result.map(({ name, seconds, reachedFlippers, drained }) => ({
      name,
      seconds,
      reachedFlippers,
      drained,
    })),
  );
  for (const run of result) {
    assert.ok(run.reachedFlippers, `${run.name}: lower playfield`);
    assert.ok(run.drained, `${run.name}: natural drain`);
  }
});
