import assert from "node:assert/strict";
import { withGameBrowser, openGame, readState, stepTime } from "./helpers.mjs";

await withGameBrowser(async ({ newContext, origin }) => {
  for (const [width, height] of [
    [390, 844],
    [844, 390],
  ]) {
    const context = await newContext({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });
    const page = await openGame(context, origin);
    const session = await context.newCDPSession(page);
    const rect = await page.locator("canvas").boundingBox();
    const finger = {
      x: rect.x + rect.width * 0.35,
      y: rect.y + rect.height * 0.75,
      id: 1,
    };
    const touch = (type, touchPoints) =>
      session.send("Input.dispatchTouchEvent", { type, touchPoints });
    const reset = () =>
      page.evaluate(() => {
        window.__pinballTest.reset();
        window.__pinballTest.configure({
          balls: [{ x: 260, y: 500, vx: 0, vy: 100, entered: true }],
        });
        window.advanceTime(0);
      });
    const swipe = async (dx = 0, dy = -60) => {
      await touch("touchStart", [finger]);
      await touch("touchMove", [
        { ...finger, x: finger.x + dx, y: finger.y + dy },
      ]);
      await touch("touchEnd", []);
    };

    await reset();
    await touch("touchStart", [finger]);
    assert.ok(
      (await readState(page)).flippers[0].held,
      "Touch still holds left flipper",
    );
    await touch("touchMove", [{ ...finger, x: finger.x + 4, y: finger.y - 8 }]);
    assert.equal(
      (await readState(page)).nudge.strength,
      0,
      "Finger jitter is not a nudge",
    );
    await touch("touchEnd", []);
    assert.ok(
      (await readState(page)).flippers.every((f) => !f.held),
      "Tap releases flippers",
    );
    for (const [dx, dy] of [
      [60, -12],
      [0, 60],
    ]) {
      await swipe(dx, dy);
      assert.equal(
        (await readState(page)).nudge.strength,
        0,
        "Only upward swipes nudge",
      );
    }
    await touch("touchStart", [finger]);
    await page.waitForTimeout(500);
    await touch("touchMove", [{ ...finger, y: finger.y - 60 }]);
    await touch("touchEnd", []);
    assert.equal(
      (await readState(page)).nudge.strength,
      0,
      "Slow held drag is not a swipe",
    );
    await page.mouse.move(finger.x, finger.y);
    await page.mouse.down();
    await page.mouse.move(finger.x, finger.y - 60);
    await page.mouse.up();
    assert.equal(
      (await readState(page)).nudge.strength,
      0,
      "Mouse drag does not nudge",
    );

    await reset();
    if (width === 390)
      await page.screenshot({ path: "output/nudge-before.png" });
    await touch("touchStart", [finger]);
    await touch("touchMove", [{ ...finger, y: finger.y - 60 }]);
    const swiped = await readState(page);
    assert.equal(swiped.nudge.strength, 1.2);
    assert.equal(
      swiped.balls[0].vy,
      -25,
      "Swipe applies actual upward impulse",
    );
    await touch("touchMove", [{ ...finger, y: finger.y - 90 }]);
    assert.equal(
      (await readState(page)).nudge.strength,
      1.2,
      "One nudge per gesture",
    );
    await touch("touchEnd", []);
    await stepTime(page, 100);
    assert.ok(
      (await readState(page)).nudge.offsetY < -8,
      "Table visibly moves upward",
    );
    if (width === 390) await page.screenshot({ path: "output/nudge-up.png" });
    await stepTime(page, 160);
    assert.equal(
      (await readState(page)).nudge.offsetY,
      0,
      "Jolt returns to rest",
    );
    if (width === 390) await page.screenshot({ path: "output/nudge-rest.png" });
    await reset();
    await page.keyboard.press("n");
    assert.deepEqual(
      (await readState(page)).balls,
      swiped.balls,
      "Touch and keyboard share nudge physics",
    );
    await stepTime(page, 100);
    assert.ok(
      (await readState(page)).nudge.offsetY < -8,
      "Keyboard has the same jolt",
    );

    // Hold the same flipper from a second finger, on canvas or on its button.
    for (const onButton of [false, true]) {
      await reset();
      const button = await page.locator("#left-touch").boundingBox();
      const other = {
        x: onButton ? button.x + button.width / 2 : finger.x - 10,
        y: onButton ? button.y + button.height / 2 : finger.y + 10,
        id: 2,
      };
      await touch("touchStart", [other]);
      await touch("touchStart", [other, finger]);
      await touch("touchMove", [other, { ...finger, y: finger.y - 60 }]);
      await touch("touchEnd", [other]);
      assert.ok(
        (await readState(page)).flippers[0].held,
        "Other finger retains its flipper hold",
      );
      await touch("touchEnd", []);
      assert.ok(
        (await readState(page)).flippers.every((f) => !f.held),
        "All fingers released cleanly",
      );
    }
    await reset();
    await page.keyboard.down("ShiftLeft");
    await swipe();
    assert.ok(
      (await readState(page)).flippers[0].held,
      "Swipe release preserves keyboard hold",
    );
    await page.keyboard.up("ShiftLeft");
    assert.ok(!(await readState(page)).flippers[0].held);

    await reset();
    await touch("touchStart", [finger]);
    await touch("touchCancel", []);
    assert.equal(
      (await readState(page)).nudge.strength,
      0,
      "Canceled gesture cannot nudge",
    );
    assert.ok((await readState(page)).flippers.every((f) => !f.held));
    // A vertical drag in the plunger lane remains a launch gesture.
    await page.evaluate(() => window.__pinballTest.reset());
    const plunger = {
      id: 1,
      x: rect.x + (rect.width * 470) / 520,
      y: rect.y + (rect.height * 680) / 820,
    };
    await touch("touchStart", [plunger]);
    await stepTime(page, 100);
    await touch("touchMove", [{ ...plunger, y: plunger.y - 60 }]);
    await touch("touchEnd", []);
    assert.equal(
      (await readState(page)).nudge.strength,
      0,
      "Plunger swipe does not nudge",
    );
    assert.ok(
      (await readState(page)).balls[0].launched,
      "Plunger release still launches",
    );
    await page.keyboard.press("p");
    await swipe();
    assert.equal(
      (await readState(page)).nudge.strength,
      0,
      "Pause blocks nudging",
    );
    await page.keyboard.press("p");

    await reset();
    for (let i = 0; i < 3; i++) await swipe();
    assert.equal(
      (await readState(page)).tilt,
      4,
      "Three quick swipes tilt the table",
    );
    const tilted = (await readState(page)).balls;
    await swipe();
    assert.deepEqual(
      (await readState(page)).balls,
      tilted,
      "Tilt blocks further impulses",
    );
    await stepTime(page, 4100);
    assert.equal(
      (await readState(page)).tilt,
      0,
      "Tilt recovers after four seconds",
    );
    await session.detach();
    await context.close();
  }
  const context = await newContext({
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const page = await openGame(context, origin);
  await page.evaluate(() => window.__pinballTest.reset());
  await page.keyboard.press("n");
  await stepTime(page, 100);
  assert.equal(
    (await readState(page)).nudge.offsetY,
    0,
    "Reduced motion disables the jolt",
  );
  assert.ok(
    (await readState(page)).nudge.strength > 0,
    "Reduced motion keeps nudge mechanics",
  );
  await context.close();
  console.log(
    "Touch swipe, jolt, multi-touch holds, cancellation and tilt PASS",
  );
});
