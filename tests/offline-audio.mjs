import assert from "node:assert/strict";
import { withGameBrowser, openGame, readState } from "./helpers.mjs";

await withGameBrowser(
  async ({ newContext, origin }) => {
    const context = await newContext();
    const page = await openGame(context, origin, { manual: false });
    assert.equal(
      await page.evaluate(() => window.__pinballTest),
      undefined,
      "No scenario adapter in normal play",
    );
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    const ranges = await page.evaluate(async () => {
      const file = "assets/lucky-seven-song.mp3";
      const result = [];
      for (const range of ["bytes=0-127", "bytes=-128", "bytes=999999999-"]) {
        const response = await fetch(file, { headers: { Range: range } });
        result.push({
          status: response.status,
          bytes: (await response.arrayBuffer()).byteLength,
          type: response.headers.get("Content-Type"),
        });
      }
      return result;
    });
    assert.equal(ranges[0].status, 206);
    assert.equal(ranges[0].bytes, 128);
    assert.equal(ranges[0].type, "audio/mpeg");
    assert.equal(ranges[1].status, 206);
    assert.equal(ranges[1].bytes, 128);
    assert.equal(ranges[2].status, 416);
    await page.click(".menu-blaster");
    await page.waitForFunction(
      () => JSON.parse(render_game_to_text()).music.time > 0.3,
    );
    assert.equal((await readState(page)).music.playing, true);
    await page.click(".menu-blaster");
    await page.waitForFunction(() => {
      const s = JSON.parse(render_game_to_text());
      return s.music.mode === 2 && s.music.time > 0.3;
    });
    assert.equal((await readState(page)).music.playing, true);
    await page.click(".menu-blaster");
    const off = await readState(page);
    assert.equal(off.music.mode, 0);
    assert.equal(off.music.playing, false);
    console.log("Offline vocal, instrumental, OFF and audio byte ranges PASS");
  },
  {
    // The unsatisfiable-range assertion deliberately produces a Chromium resource error.
    expectedConsoleErrors: [
      /^Failed to load resource: the server responded with a status of 416/,
    ],
  },
);
