import assert from "node:assert/strict";
import { withGameBrowser, openGame } from "./helpers.mjs";

const viewports = [
  [1440, 900, false],
  [1280, 720, false],
  [1920, 1080, false],
  [390, 844, true],
  [360, 640, true],
  [844, 390, true],
  [760, 360, true],
  [1024, 768, true],
  [768, 1024, true],
];
async function checkLayout(page, label) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const layout = await page.evaluate(() => {
    const rect = (element) => {
      const r = element.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      };
    };
    const overlay = document.getElementById("overlay");
    return {
      width: visualViewport?.width || innerWidth,
      height: visualViewport?.height || innerHeight,
      pageWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      canvas: rect(document.querySelector("canvas")),
      cabinet: rect(document.querySelector(".table-wrap")),
      column: rect(document.querySelector(".table-column")),
      verticalTouchSpace:
        getComputedStyle(document.querySelector(".touch-controls")).position !==
          "fixed" &&
        getComputedStyle(document.querySelector(".touch-controls")).display !==
          "none"
          ? 52
          : 0,
      buttons: [...document.querySelectorAll(".touch-controls button")]
        .map(rect)
        .filter((r) => r.width > 0 && r.height > 0),
      start: overlay.hidden ? null : rect(document.getElementById("start-btn")),
    };
  });
  const fits = (r) =>
    r.x >= -1 &&
    r.y >= -1 &&
    r.right <= layout.width + 1 &&
    r.bottom <= layout.height + 1;
  assert.ok(
    layout.pageWidth <= layout.width + 1 &&
      layout.pageHeight <= layout.height + 1,
    `${label}: page overflow`,
  );
  assert.ok(fits(layout.canvas), `${label}: whole table visible`);
  assert.ok(
    Math.abs(layout.canvas.y - layout.cabinet.y) < 1 &&
      Math.abs(layout.canvas.bottom - layout.cabinet.bottom) < 1,
    `${label}: artwork reaches both cabinet edges`,
  );
  const expectedHeight = Math.min(
    layout.column.height - layout.verticalTouchSpace,
    (layout.column.width * 820) / 520,
  );
  assert.ok(
    layout.canvas.height >= expectedHeight - 3,
    `${label}: table uses available height or width limit`,
  );
  if (layout.start)
    assert.ok(fits(layout.start), `${label}: start/resume accessible`);
  for (const button of layout.buttons) {
    assert.ok(fits(button), `${label}: touch button visible`);
    const overlaps =
      button.x < layout.canvas.right &&
      button.right > layout.canvas.x &&
      button.y < layout.canvas.bottom &&
      button.bottom > layout.canvas.y;
    assert.equal(
      overlaps,
      false,
      `${label}: touch button must not cover table`,
    );
  }
}
await withGameBrowser(async ({ newContext, origin }) => {
  for (const [width, height, touch] of viewports) {
    const context = await newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
      serviceWorkers: "block",
    });
    const page = await openGame(context, origin);
    await checkLayout(page, `${width}x${height} menu`);
    await page.screenshot({ path: `output/fit-${width}x${height}-menu.png` });
    await page.click("#start-btn");
    await checkLayout(page, `${width}x${height} play`);
    await page.screenshot({ path: `output/fit-${width}x${height}-play.png` });
    await page.click("#fullscreen");
    await page.waitForFunction(() => !!document.fullscreenElement);
    await checkLayout(page, `${width}x${height} fullscreen`);
    await page.click("#pause-btn");
    await checkLayout(page, `${width}x${height} pause`);
    await context.close();
    console.log(
      `Layout PASS ${width}x${height}: menu, play, fullscreen, pause`,
    );
  }
  // Rotate one existing game, so state and inputs survive the resize rather than being reloaded.
  const context = await newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "block",
  });
  const page = await openGame(context, origin);
  await page.click("#start-btn");
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await checkLayout(page, "orientation change");
  }
});
