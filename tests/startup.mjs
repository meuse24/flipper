import assert from "node:assert/strict";
import { withGameBrowser, openGame, readState } from "./helpers.mjs";

await withGameBrowser(async ({ newContext, origin }) => {
  for (const firstButton of ["#fps-toggle", ".header-blaster"]) {
    const context = await newContext({
      viewport: { width: 1440, height: 900 },
      serviceWorkers: "block",
    });
    const page = await openGame(context, origin, { manual: false });
    assert.equal(
      (await readState(page)).music.mode,
      0,
      "Audio waits for user activation",
    );
    await page.click(firstButton);
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        !!document.fullscreenElement &&
        state.music.mode === 1 &&
        state.music.playing
      );
    });
    assert.equal(
      (await readState(page)).mode,
      "ready",
      "First settings click does not start a round",
    );
    await page.click(".header-blaster");
    assert.equal(
      (await readState(page)).music.mode,
      2,
      "Next music click chooses instrumental",
    );
    await page.click(".header-blaster");
    assert.equal((await readState(page)).music.mode, 0);
    await page.click("#start-btn");
    assert.equal(
      (await readState(page)).music.mode,
      0,
      "Explicit music OFF survives start",
    );
    await context.close();
  }
  const context = await newContext({ serviceWorkers: "block" });
  await context.addInitScript(() => {
    Element.prototype.requestFullscreen = () =>
      Promise.reject(new Error("Fullscreen denied for test"));
  });
  const page = await openGame(context, origin, { manual: false });
  await page.click("#start-btn");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).music.playing,
  );
  const state = await readState(page);
  assert.equal(state.mode, "playing");
  assert.equal(state.music.mode, 1);
  assert.equal(
    state.viewport.fullscreen,
    false,
    "Denied fullscreen keeps windowed play usable",
  );
  await context.close();
  console.log(
    "First-click fullscreen/vocals, music cycling, explicit OFF and denied-fullscreen fallback PASS",
  );
});
