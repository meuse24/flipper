import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { withGameBrowser, openGame, readState } from "./helpers.mjs";

// A disposable release folder permits a real waiting-worker update without changing working files.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "badboy-pwa-test-"));
const files = [
  "index.html",
  "pwa.js",
  "sw.js",
  "manifest.webmanifest",
  "assets/icon-180.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/lucky-seven-song.mp3",
  "assets/lucky-seven-theme.mp3",
];
try {
  for (const file of files) {
    const destination = path.join(root, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
  }
  await withGameBrowser(
    async ({ newContext, origin }) => {
      const nativeContext = await newContext();
      const nativePage = await openGame(nativeContext, origin);
      await nativePage.locator("#install-app").waitFor({ state: "visible" });
      await nativePage.evaluate(() => {
        window.installCalls = 0;
        const event = new Event("beforeinstallprompt");
        event.prompt = async () => {
          window.installCalls++;
        };
        event.userChoice = Promise.resolve({ outcome: "accepted" });
        dispatchEvent(event);
      });
      await nativePage.click("#install-app");
      await nativePage.waitForFunction(
        () => document.getElementById("install-app").hidden,
      );
      assert.equal(await nativePage.evaluate(() => window.installCalls), 1);
      await nativeContext.close();

      const context = await newContext();
      await context.addInitScript(() =>
        addEventListener("beforeinstallprompt", (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
        }),
      );
      const page = await openGame(context, origin);
      await page.locator("#install-app").waitFor({ state: "visible" });
      await page.click("#install-app");
      await page.waitForFunction(
        () => document.getElementById("install-help").open,
      );
      assert.ok(
        (await page.locator("#install-instructions").textContent()).length > 30,
      );
      await page.click("#install-close");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await page.click("#start-btn");
      const nextCache = "badboy-pinball-test-update";
      const worker = fs
        .readFileSync(path.join(root, "sw.js"), "utf8")
        .replace(
          /const CACHE_NAME = "[^"]+";/,
          `const CACHE_NAME = "${nextCache}";`,
        );
      fs.writeFileSync(path.join(root, "sw.js"), worker);
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration.update();
      });
      await page.waitForFunction(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
      );
      assert.equal(
        (await readState(page)).mode,
        "playing",
        "A waiting worker cannot reload an active run",
      );
      assert.equal(await page.locator("#update-notice").isHidden(), true);
      await page.click("#pause-btn");
      assert.equal((await readState(page)).mode, "paused");
      assert.equal(
        await page.locator("#update-notice").isHidden(),
        true,
        "Paused runs also retain their version",
      );
      await page.click("#start-btn");
      await page.evaluate(() => {
        window.__pinballTest.configure({
          lives: 1,
          ballSave: 0,
          balls: [{ x: 260, y: 850, vx: 0, vy: 100 }],
        });
        window.__pinballTest.stepTicks();
      });
      await page.locator("#update-notice").waitFor({ state: "visible" });
      await Promise.all([page.waitForEvent("load"), page.click("#update-yes")]);
      assert.equal((await readState(page)).mode, "ready");
      assert.deepEqual(
        await page.evaluate(() => caches.keys()),
        [nextCache],
        "Only the confirmed version remains active",
      );
      await context.setOffline(true);
      await page.reload();
      assert.equal(await page.locator("#start-btn").isVisible(), true);
      console.log(
        "Native install, fallback instructions, protected runs and confirmed PWA update PASS",
      );
    },
    { root },
  );
} finally {
  // Only remove the exact task-created directory under the operating-system temp root.
  assert.ok(
    path
      .resolve(root)
      .startsWith(path.resolve(os.tmpdir()) + path.sep + "badboy-pwa-test-"),
  );
  fs.rmSync(root, { recursive: true, force: true });
}
