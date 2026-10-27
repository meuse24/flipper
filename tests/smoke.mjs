import assert from "node:assert/strict";
import {
  withGameBrowser,
  openGame,
  readState,
  stepTime,
  holdTouch,
} from "./helpers.mjs";

await withGameBrowser(async ({ newContext, origin }) => {
  const context = await newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
  });
  const page = await openGame(context, origin);
  assert.equal(await page.evaluate(() => !!window.__pinballTest), true);
  await page.screenshot({ path: "output/desktop-start.png" });
  await page.click("#start-btn");
  await page.keyboard.down("Space");
  await stepTime(page, 1100);
  await page.keyboard.up("Space");
  const trace = [];
  for (let i = 0; i < 10; i++) {
    await stepTime(page, 300);
    trace.push(await readState(page));
  }
  assert.ok(
    trace.some((state) =>
      state.balls.some((ball) => ball.x < 440 && ball.launched),
    ),
    "Launcher exits its lane",
  );
  await page.screenshot({ path: "output/desktop-play.png" });
  const beforeWait = await readState(page);
  await page.waitForTimeout(150);
  assert.deepEqual(
    await readState(page),
    beforeWait,
    "Manual clock cannot receive hidden RAF physics steps",
  );
  await page.keyboard.press("p");
  assert.equal((await readState(page)).mode, "paused");
  await page.keyboard.press("p");
  await page.keyboard.down("ArrowLeft");
  await stepTime(page, 100);
  assert.ok((await readState(page)).flippers[0].angle < -0.4);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("ShiftRight");
  await stepTime(page, 100);
  let shifts = await readState(page);
  assert.ok(
    shifts.flippers.every((flipper) => flipper.held),
    "Both Shift keys hold their flippers",
  );
  assert.ok(
    shifts.flippers[0].angle < -0.4 && shifts.flippers[1].angle > 3.5,
    "Shift keys move both flippers",
  );
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.up("ShiftLeft");
  assert.equal(
    (await readState(page)).flippers[0].held,
    true,
    "Other held left key keeps the flipper up",
  );
  await page.keyboard.up("ArrowLeft");
  shifts = await readState(page);
  assert.equal(shifts.flippers[0].held, false);
  assert.equal(
    shifts.flippers[1].held,
    true,
    "Releasing left Shift does not release right Shift",
  );
  await page.keyboard.up("ShiftRight");
  assert.ok((await readState(page)).flippers.every((flipper) => !flipper.held));
  await page.keyboard.down("ShiftLeft");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(
    (await readState(page)).flippers[0].held,
    false,
    "Blur releases Shift input",
  );
  await page.keyboard.up("ShiftLeft");

  // Scenarios use the explicit test adapter; assertions inspect observable outcomes.
  const mechanics = await page.evaluate(() => {
    const test = window.__pinballTest;
    test.reset();
    test.configure({
      ballSave: 0,
      balls: [{ x: 190, y: 231, vx: 0, vy: 200 }],
    });
    let state = test.stepTicks();
    const bumper = state.score > 0 && state.balls[0].vy < 0;
    for (const target of state.targets) {
      test.configure({
        balls: [{ x: target.x + 13, y: target.y, vx: -200, vy: 0 }],
      });
      state = test.stepTicks();
    }
    const multiball = state.balls.length === 3 && state.multiplier === 2;
    test.configure({ balls: [{ x: 390, y: 465, vx: 0, vy: -450 }] });
    const ramp = test.stepTicks().balls[0].ramp;
    const rampReturned = !test.stepTicks(300).balls[0].ramp;
    test.configure({
      ballSave: 0,
      balls: [{ x: 260, y: 850, vx: 0, vy: 100 }],
    });
    state = test.stepTicks();
    const drain = state.lives === 2 && !state.balls[0].launched;
    for (let i = 0; i < 2; i++) {
      test.configure({
        ballSave: 0,
        balls: [{ x: 260, y: 850, vx: 0, vy: 100 }],
      });
      state = test.stepTicks();
    }
    const gameover = state.mode === "gameover";
    state = test.reset();
    return {
      bumper,
      multiball,
      ramp,
      rampReturned,
      drain,
      gameover,
      restart: state.mode === "playing" && state.lives === 3,
    };
  });
  for (const [name, passed] of Object.entries(mechanics))
    assert.ok(passed, name);
  const nudgeRuns = [];
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      window.__pinballTest.reset();
      window.__pinballTest.configure({
        balls: [{ x: 260, y: 500, vx: 0, vy: 100 }],
      });
    });
    await page.keyboard.press("n");
    nudgeRuns.push((await readState(page)).balls[0]);
  }
  assert.deepEqual(
    nudgeRuns[0],
    nudgeRuns[1],
    "Nudge randomness resets with the scenario seed",
  );
  await page.evaluate(() => window.__pinballTest.reset());
  for (let i = 0; i < 3; i++) await page.keyboard.press("n");
  assert.ok((await readState(page)).tilt > 0);
  await stepTime(page, 4100);
  assert.equal((await readState(page)).tilt, 0);
  await page.click("#sound");
  assert.equal(
    await page.locator("#sound").getAttribute("aria-pressed"),
    "false",
  );
  await context.close();

  const mobile = await newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "block",
  });
  const touchPage = await openGame(mobile, origin);
  await touchPage.tap("#start-btn");
  const held = await holdTouch(touchPage, "#launch-touch", 700);
  assert.ok(held.charge > 0.4, "Touch hold charges the spring");
  assert.ok(
    (await readState(touchPage)).balls[0].launched,
    "Touch release launches",
  );
  await stepTime(touchPage, 600);
  await touchPage.screenshot({ path: "output/mobile-play.png" });
  await mobile.close();
  console.log(
    "Gameplay, clock ownership and real pointer controls PASS",
    mechanics,
  );
});
