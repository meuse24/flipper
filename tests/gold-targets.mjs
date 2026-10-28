import assert from "node:assert/strict";
import { withGameBrowser, openGame, readState, stepTime } from "./helpers.mjs";

await withGameBrowser(async ({ newContext, origin }) => {
  const context = await newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "block",
  });
  const page = await openGame(context, origin);
  const hit = (index, count) =>
    page.evaluate(
      ({ index, count }) => {
        const test = window.__pinballTest;
        const target = test.state().targets[index];
        test.configure({
          balls: [
            { x: target.x + 13, y: target.y, vx: -200, vy: 0, entered: true },
            ...Array.from({ length: count - 1 }, (_, i) => ({
              x: 180 + (i % 6) * 22,
              y: 550 + Math.floor(i / 6) * 22,
              vx: 0,
              vy: 0,
              entered: true,
            })),
          ],
        });
        test.stepTicks();
      },
      { index, count },
    );

  // Lock applies immediately, including unusually large existing multiballs.
  for (const count of [3, 4, 20]) {
    await page.evaluate(() => window.__pinballTest.reset());
    for (let i = 0; i < 3; i++) await hit(i, count);
    const state = await readState(page);
    assert.equal(state.goldTargetsEnabled, false);
    assert.equal(state.score, 0);
    assert.equal(state.multiplier, 1);
    assert.equal(state.balls.length, count);
    assert.ok(state.targets.every((t) => !t.down));
    assert.ok(state.balls[0].vx > 0, "Locked targets still rebound balls");
  }

  await page.evaluate(() => window.__pinballTest.reset());
  for (let i = 0; i < 3; i++) await hit(i, 1);
  let state = await readState(page);
  assert.equal(state.balls.length, 3);
  assert.equal(state.multiplier, 2);
  assert.equal(
    state.goldTargetsEnabled,
    false,
    "Gold Rush immediately locks its reset bank",
  );
  await stepTime(page, 0);
  assert.equal(
    await page.evaluate(() => window.__pinballTest.rendering().targets),
    8,
  );
  await page.screenshot({ path: "output/gold-targets-locked.png" });

  // A real drain unlocks the bank, without a timer or a new session.
  await page.evaluate(() => {
    const test = window.__pinballTest;
    test.configure({
      ballSave: 0,
      balls: [
        { x: 200, y: 600, vx: 0, vy: 0, entered: true },
        { x: 240, y: 600, vx: 0, vy: 0, entered: true },
        { x: 260, y: 850, vx: 0, vy: 100, entered: true },
      ],
    });
    test.stepTicks();
  });
  state = await readState(page);
  assert.equal(state.balls.length, 2);
  assert.equal(state.goldTargetsEnabled, true);
  await stepTime(page, 0);
  assert.equal(
    await page.evaluate(() => window.__pinballTest.rendering().targets),
    0,
  );
  await page.screenshot({ path: "output/gold-targets-enabled.png" });
  for (let i = 0; i < 3; i++) await hit(i, 2);
  state = await readState(page);
  assert.equal(
    state.balls.length,
    4,
    "Two remaining balls can earn another pair",
  );
  assert.equal(state.multiplier, 3);
  assert.equal(state.goldTargetsEnabled, false);
  await hit(0, 4);
  assert.ok((await readState(page)).targets.every((t) => !t.down));
  await context.close();
});
console.log(
  "Gold target lock, physical rebound, drain unlock and retrigger PASS",
);
