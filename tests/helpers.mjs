import { chromium } from "playwright";
import fs from "node:fs";
import { once } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createPreviewServer } = require("../scripts/serve.cjs");

/** Every suite owns its origin/cache and closes resources on assertion failures.
 * No externally running server, fixed port, or rewritten production HTML is needed. */
export async function withGameBrowser(
  run,
  { expectedConsoleErrors = [], root = process.env.PINBALL_TEST_ROOT } = {},
) {
  fs.mkdirSync("output", { recursive: true });
  const server = createPreviewServer({ root });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const errors = [];
  try {
    browser = await chromium.launch({ headless: true });
    const newContext = async (options) => {
      const context = await browser.newContext(options);
      context.on("page", (page) => {
        page.on("pageerror", (error) => errors.push(String(error)));
        page.on("console", (message) => {
          if (
            message.type() === "error" &&
            !expectedConsoleErrors.some((pattern) =>
              pattern.test(message.text()),
            )
          )
            errors.push(message.text());
        });
      });
      return context;
    };
    await run({ browser, newContext, origin });
    if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

export const readState = (page) =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
export const stepTime = (page, ms) =>
  page.evaluate((ms) => window.advanceTime(ms), ms);
export async function openGame(context, origin, { manual = true } = {}) {
  const page = await context.newPage();
  await page.goto(`${origin}/index.html${manual ? "?test=1" : ""}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await window.pinballReady;
    await Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    );
  });
  return page;
}

/** Send an actual active pointer so pointer capture and cancellation are tested too. */
export async function holdTouch(page, selector, ms) {
  const session = await page.context().newCDPSession(page);
  try {
    const rect = await page.locator(selector).boundingBox();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id: 1 },
      ],
    });
    await stepTime(page, ms);
    const held = await readState(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    return held;
  } finally {
    await session.detach();
  }
}
