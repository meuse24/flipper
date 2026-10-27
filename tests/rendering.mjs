import assert from "node:assert/strict";
import { withGameBrowser, openGame, stepTime, readState } from "./helpers.mjs";

const rendering = (page) =>
  page.evaluate(() => window.__pinballTest.rendering());

await withGameBrowser(async ({ newContext, origin }) => {
  const context = await newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    serviceWorkers: "block",
  });
  const page = await openGame(context, origin);
  assert.equal(await page.locator("html").getAttribute("translate"), "no");
  assert.ok(
    (await page.locator("html").getAttribute("class"))
      .split(/\s+/)
      .includes("notranslate"),
  );
  assert.equal(
    await page.locator('meta[name="google"]').getAttribute("content"),
    "notranslate",
  );
  let info = await rendering(page);
  assert.ok(info.width <= 650 && info.height <= 1025, "Mobile pixel budget");
  assert.equal(
    info.sprites,
    26,
    "All 13 flash phases for both bumper sizes are warm",
  );
  assert.equal(info.layers, 29, "Three board layers and a bounded sprite set");
  assert.ok(info.bytes < 15 * 1024 * 1024, "Bounded mobile cache storage");
  await page.waitForTimeout(80);
  info = await rendering(page);
  await page.waitForTimeout(150);
  assert.equal(
    (await rendering(page)).frames,
    info.frames,
    "Idle menu does not redraw",
  );

  await page.click("#start-btn");
  await page.evaluate(() => window.__pinballTest.reset());
  await stepTime(page, 0);
  const initial = await rendering(page);
  const target = (await readState(page)).targets[0];
  await page.evaluate((target) => {
    window.__pinballTest.configure({
      balls: [{ x: target.x + 13, y: target.y, vx: -200, vy: 0 }],
    });
    window.__pinballTest.stepTicks();
    window.advanceTime(0);
  }, target);
  info = await rendering(page);
  assert.equal(info.targets, 1, "Target layer reflects a hit");
  assert.ok(info.combo > 0, "Insert layer reflects scoring");
  assert.equal(
    info.generation,
    initial.generation,
    "Hits do not rebuild all caches",
  );
  await page.evaluate(() => {
    window.__pinballTest.configure({
      balls: [{ x: 190, y: 231, vx: 0, vy: 200 }],
    });
    window.__pinballTest.stepTicks();
    window.advanceTime(0);
  });
  assert.equal(
    (await rendering(page)).sprites,
    26,
    "Bumper hits reuse warm sprites",
  );
  await page.screenshot({ path: "output/rendering-mobile-hit.png" });

  await page.keyboard.press("p");
  await page.waitForTimeout(80);
  info = await rendering(page);
  await page.waitForTimeout(150);
  assert.equal(
    (await rendering(page)).frames,
    info.frames,
    "Paused table does not redraw",
  );
  await page.click("#fps-toggle");
  await page.waitForFunction(
    () => document.getElementById("fps-display").textContent === "FPS PAUSED",
  );
  await page.keyboard.press("p");
  await stepTime(page, 0);
  assert.equal((await readState(page)).mode, "playing");

  for (const [width, height] of [
    [844, 390],
    [390, 844],
    [760, 360],
    [360, 640],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(80);
    info = await rendering(page);
    assert.ok(info.width <= 650 && info.height <= 1025);
    assert.equal(info.layers, 29, "Rotation replaces obsolete caches");
    assert.equal(info.sprites, 26);
    assert.ok(info.bytes < 15 * 1024 * 1024);
    const generation = info.generation;
    await page.evaluate(() => {
      for (let i = 0; i < 8; i++) window.dispatchEvent(new Event("resize"));
    });
    assert.equal(
      (await rendering(page)).generation,
      generation,
      "Same-size resize preserves caches",
    );
  }
  await page.screenshot({ path: "output/rendering-mobile-rotation.png" });
  await context.close();

  const desktop = await newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    serviceWorkers: "block",
  });
  const desktopPage = await openGame(desktop, origin);
  info = await rendering(desktopPage);
  assert.ok(
    info.width > 650 && info.width <= 1040,
    "Desktop keeps a higher pixel budget",
  );
  assert.equal(
    await desktopPage.evaluate(() => matchMedia("(pointer: coarse)").matches),
    false,
  );
  await desktop.close();
  console.log(
    "Rendering budgets, warm/bounded caches, hit invalidation, idle/pause and rotation PASS",
  );
});
