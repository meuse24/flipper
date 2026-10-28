import assert from "node:assert/strict";
import { withGameBrowser, openGame, readState, stepTime } from "./helpers.mjs";

await withGameBrowser(async ({ newContext, origin }) => {
  const context = await newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    serviceWorkers: "block",
  });
  const page = await openGame(context, origin);
  const reset = () => page.evaluate(() => window.__pinballTest.reset());
  const targetHits = (count) =>
    page.evaluate((count) => {
      const test = window.__pinballTest;
      for (const target of test.state().targets.slice(0, count)) {
        test.configure({
          balls: [
            { x: target.x + 13, y: target.y, vx: -200, vy: 0, entered: true },
          ],
        });
        test.stepTicks();
      }
    }, count);
  const rendering = () => page.evaluate(() => window.__pinballTest.rendering());
  await reset();
  await targetHits(3);
  assert.equal((await readState(page)).callout.kind, "multiball");
  assert.equal((await readState(page)).balls.length, 3);
  await stepTime(page, 240);
  await page.screenshot({ path: "output/callout-multiball.png" });
  const built = await rendering();
  // Animation must reuse the cached artwork rather than repaint glows/text.
  for (let i = 0; i < 10; i++) await stepTime(page, 16.667);
  assert.equal((await rendering()).calloutBuilds, built.calloutBuilds);
  await page.keyboard.press("n");
  assert.equal(
    (await readState(page)).callout.kind,
    "multiball",
    "Small events cannot hide multiball immediately",
  );
  await page.keyboard.press("n");
  await page.keyboard.press("n");
  assert.equal(
    (await readState(page)).callout.kind,
    "tilt",
    "Tilt preempts celebrations",
  );
  await stepTime(page, 240);
  await page.screenshot({ path: "output/callout-tilt.png" });

  await reset();
  await page.evaluate(() => {
    window.__pinballTest.configure({
      balls: [{ x: 390, y: 465, vx: 0, vy: -450, entered: true }],
    });
    window.__pinballTest.stepTicks();
  });
  assert.equal((await readState(page)).callout.kind, "cash");
  await stepTime(page, 240);
  await page.screenshot({ path: "output/callout-cash.png" });

  await reset();
  await targetHits(2);
  await page.evaluate(() => {
    window.__pinballTest.configure({
      balls: [{ x: 190, y: 231, vx: 0, vy: 200, entered: true }],
    });
    window.__pinballTest.stepTicks();
  });
  assert.equal((await readState(page)).callout.kind, "combo");
  await stepTime(page, 240);
  await page.screenshot({ path: "output/callout-combo.png" });

  await reset();
  await page.evaluate(() => {
    window.__pinballTest.configure({
      ballSave: 1,
      balls: [{ x: 260, y: 850, vx: 0, vy: 100 }],
    });
    window.__pinballTest.stepTicks();
  });
  assert.equal((await readState(page)).callout.kind, "save");
  await stepTime(page, 240);
  await page.screenshot({ path: "output/callout-save.png" });
  await page.keyboard.press("p");
  const paused = await readState(page);
  await stepTime(page, 1000);
  assert.deepEqual(
    await readState(page),
    paused,
    "Pause freezes the show with the game",
  );
  await page.keyboard.press("p");
  await stepTime(page, 2200);
  assert.equal((await readState(page)).callout, null, "Callouts expire");

  // Repeated new score values cannot grow the text cache without limit.
  await reset();
  await page.evaluate(() => {
    const test = window.__pinballTest;
    for (let i = 0; i < 60; i++) {
      test.configure({
        balls: [{ x: 390, y: 465, vx: 0, vy: -450, entered: true }],
        multiplier: (i % 5) + 1,
      });
      test.stepTicks();
      window.advanceTime(0);
    }
  });
  let info = await rendering();
  assert.ok(info.popupEntries <= 12);
  assert.ok(info.effectLayers <= 14);
  assert.ok(info.effectBytes < 2 * 1024 * 1024, "Bounded mobile effect memory");
  const builds = info.calloutBuilds;
  await page.setViewportSize({ width: 760, height: 360 });
  await page.waitForFunction(
    (generation) => window.__pinballTest.rendering().generation > generation,
    info.generation,
  );
  await stepTime(page, 0);
  info = await rendering();
  assert.ok(
    info.calloutBuilds > builds,
    "Resize rebuilds the current sprite at the new resolution",
  );
  assert.ok(info.effectBytes < 2 * 1024 * 1024);
  await page.screenshot({ path: "output/callout-landscape.png" });
  await context.close();

  const reducedContext = await newContext({
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const reducedPage = await openGame(reducedContext, origin);
  await reducedPage.evaluate(() => window.__pinballTest.reset());
  await reducedPage.keyboard.press("n");
  await stepTime(reducedPage, 240);
  assert.equal((await readState(reducedPage)).callout.kind, "warning");
  assert.equal(
    (await reducedPage.evaluate(() => window.__pinballTest.rendering()))
      .effectLayers,
    1,
    "Reduced motion keeps the readable plate without a sheen sprite",
  );
  await reducedContext.close();
  console.log(
    "Event priority, sprite reuse, bounded memory, expiry, pause/rotation and reduced motion PASS",
  );
});
