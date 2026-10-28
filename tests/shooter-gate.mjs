import assert from "node:assert/strict";
import { withGameBrowser, openGame, readState, stepTime } from "./helpers.mjs";

await withGameBrowser(async ({ newContext, origin }) => {
  const context = await newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block",
  });
  const page = await openGame(context, origin);
  const result = await page.evaluate(() => {
    const test = window.__pinballTest,
      { launcher, gate, step } = test.constants;
    return Array.from({ length: 21 }, (_, i) => i / 20).map((power) => {
      test.reset();
      test.configure({
        ballSave: 0,
        balls: [
          {
            x: launcher.x,
            y: launcher.y,
            vx: launcher.vx,
            vy: -(launcher.minSpeed + power * launcher.speedRange),
            entered: false,
          },
        ],
      });
      let passedAt = null,
        openAtPass = 0,
        clearance = 0,
        maxOpen = 0;
      for (let tick = 0; tick < 4 / step; tick++) {
        const state = test.stepTicks();
        maxOpen = Math.max(maxOpen, state.shooterGate.angle);
        if (!passedAt && state.shooterGate.passes) {
          passedAt = (tick + 1) * step;
          openAtPass = state.shooterGate.angle;
          const ball = state.balls[0],
            angle = gate.rest + openAtPass;
          const dx = Math.cos(angle) * gate.length,
            dy = Math.sin(angle) * gate.length;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((ball.x - gate.x) * dx + (ball.y - gate.y) * dy) /
                gate.length ** 2,
            ),
          );
          clearance = Math.hypot(
            ball.x - gate.x - dx * t,
            ball.y - gate.y - dy * t,
          );
        }
      }
      const state = test.state();
      return {
        power,
        passedAt,
        openAtPass,
        maxOpen,
        clearance,
        passes: state.shooterGate.passes,
        closed: state.shooterGate.angle === 0,
      };
    });
  });
  for (const run of result) {
    assert.ok(
      run.passedAt > 0 && run.passedAt < 2.5,
      `Power ${run.power}: visible gate passage`,
    );
    assert.ok(
      run.openAtPass > 0.5,
      `Power ${run.power}: gate opens before passage`,
    );
    assert.ok(
      run.clearance >= 11.9,
      `Power ${run.power}: ball clears actual moving metal`,
    );
    assert.equal(run.passes, 1, `Power ${run.power}: one passage`);
    assert.ok(run.closed, `Power ${run.power}: gate returns closed`);
  }
  // The upper lane receives gravity, not the old hidden leftwards acceleration.
  const free = await page.evaluate(() => {
    const test = window.__pinballTest;
    test.reset();
    test.configure({
      balls: [{ x: 470, y: 165, vx: 0, vy: -100, entered: false }],
    });
    return test.stepTicks().balls[0];
  });
  assert.equal(free.vx, 0, "No invisible lateral steering in the clear lane");
  // A playfield shot hits the closed one-way flap and cannot reopen it backwards.
  const reverse = await page.evaluate(() => {
    const test = window.__pinballTest,
      { gate } = test.constants;
    const nx = Math.sin(gate.rest),
      ny = -Math.cos(gate.rest);
    test.reset();
    test.configure({
      balls: [
        {
          x: gate.x + (Math.cos(gate.rest) * gate.length) / 2 - nx * 22,
          y: gate.y + (Math.sin(gate.rest) * gate.length) / 2 - ny * 22,
          vx: nx * 400,
          vy: ny * 400,
          entered: true,
        },
      ],
    });
    let furthest = -Infinity,
      opened = false;
    for (let i = 0; i < 40; i++) {
      const state = test.stepTicks(),
        ball = state.balls[0];
      furthest = Math.max(
        furthest,
        (ball.x - gate.x) * nx + (ball.y - gate.y) * ny,
      );
      opened ||= state.shooterGate.angle > 0;
    }
    return { furthest, opened };
  });
  assert.ok(
    reverse.furthest < -11.9,
    "Closed flap stops reverse shot on its visible surface",
  );
  assert.equal(reverse.opened, false, "Reverse shot cannot open the flap");

  await page.evaluate(() => window.__pinballTest.reset());
  await stepTime(page, 0);
  await page.screenshot({ path: "output/shooter-gate-closed.png" });
  await page.evaluate(() => {
    const test = window.__pinballTest,
      { launcher } = test.constants;
    test.configure({
      balls: [
        {
          x: launcher.x,
          y: launcher.y,
          vx: launcher.vx,
          vy: -(launcher.minSpeed + launcher.speedRange * 0.5),
          entered: false,
        },
      ],
    });
    for (let i = 0; i < 500; i++) {
      if (test.stepTicks().shooterGate.passes) break;
    }
    window.advanceTime(0);
  });
  await page.screenshot({ path: "output/shooter-gate-open.png" });
  await stepTime(page, 500);
  assert.equal((await readState(page)).shooterGate.angle, 0);
  await context.close();
  console.log(
    "21 launch powers, real flap clearance, gravity-only steering, reverse collision and closure PASS",
  );
});
