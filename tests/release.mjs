import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { withGameBrowser, openGame, readState } from "./helpers.mjs";
import { releaseFiles, deploymentBaseURL } from "../scripts/release-files.mjs";

for (const suffix of [
  "/apps/flipper",
  "/apps/flipper/",
  "/apps/flipper/index.html",
]) {
  assert.equal(
    deploymentBaseURL(`https://example.com${suffix}`).href,
    "https://example.com/apps/flipper/",
  );
}
assert.throws(() =>
  deploymentBaseURL("https://user:secret@example.com/apps/flipper"),
);

const root = path.resolve(import.meta.dirname, "..");
const release = path.join(root, "release");
const digest = (file) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const reportFile = path.join(root, "output/release-report.json");
const before = fs.readFileSync(reportFile, "utf8");
const build = spawnSync(process.execPath, ["scripts/build-release.mjs"], {
  cwd: root,
  stdio: "inherit",
});
assert.equal(build.status, 0);
assert.equal(
  fs.readFileSync(reportFile, "utf8"),
  before,
  "Reproducible release/report",
);
const files = fs
  .readdirSync(release, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) =>
    path
      .relative(release, path.join(entry.parentPath, entry.name))
      .split(path.sep)
      .join("/"),
  )
  .sort();
assert.deepEqual(
  files,
  [...releaseFiles].sort(),
  "Only allowlisted upload files",
);
for (const file of JSON.parse(before).files)
  assert.equal(digest(path.join(release, file.file)), file.sha256);

// Compare actual source and delivery, including inline markup and Canvas artwork.
const captures = [];
for (const servedRoot of [root, release]) {
  const shots = [];
  await withGameBrowser(
    async ({ newContext, origin }) => {
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
        { width: 844, height: 390 },
      ]) {
        const context = await newContext({
          viewport,
          hasTouch: true,
          serviceWorkers: "block",
        });
        const page = await openGame(context, origin);
        await page.mouse.move(0, 0);
        shots.push(await page.screenshot());
        await page.click("#start-btn");
        await page.mouse.move(0, 0);
        shots.push(await page.screenshot());
        const gameState = await readState(page);
        shots.push(Buffer.from(JSON.stringify(gameState)));
        await context.close();
      }
    },
    { root: servedRoot },
  );
  captures.push(shots);
}
// Browser compositing can round a few edge pixels by one RGB level. Keep state
// byte-exact and allow only that bounded rounding in decoded screenshots.
await withGameBrowser(async ({ newContext }) => {
  const context = await newContext();
  const page = await context.newPage();
  for (let i = 0; i < captures[0].length; i++) {
    let matches = captures[0][i].equals(captures[1][i]);
    if (!matches && i % 3 !== 2) {
      matches = await page.evaluate(
        async (images) => {
          const pixels = await Promise.all(
            images.map(async (base64) => {
              const image = new Image();
              image.src = `data:image/png;base64,${base64}`;
              await image.decode();
              const canvas = document.createElement("canvas");
              canvas.width = image.width;
              canvas.height = image.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(image, 0, 0);
              return {
                width: canvas.width,
                height: canvas.height,
                data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
              };
            }),
          );
          const [a, b] = pixels;
          if (a.width !== b.width || a.height !== b.height) return false;
          let changedPixels = 0;
          for (let offset = 0; offset < a.data.length; offset += 4) {
            let changed = false;
            for (let channel = 0; channel < 4; channel++) {
              const delta = Math.abs(
                a.data[offset + channel] - b.data[offset + channel],
              );
              if (delta > 1) return false;
              changed ||= delta > 0;
            }
            if (changed && ++changedPixels > 10) return false;
          }
          return true;
        },
        [captures[0][i].toString("base64"), captures[1][i].toString("base64")],
      );
    }
    if (!captures[0][i].equals(captures[1][i])) {
      fs.writeFileSync(
        path.join(root, `output/release-compare-${i}-source.png`),
        captures[0][i],
      );
      fs.writeFileSync(
        path.join(root, `output/release-compare-${i}-min.png`),
        captures[1][i],
      );
    }
    assert.ok(matches, `Source/release capture ${i} differs`);
  }
  await context.close();
});
console.log(
  "Reproducibility, file allowlist, source/release UI and state parity PASS",
);
for (const suite of [
  "smoke",
  "touch-nudge",
  "callouts",
  "gold-targets",
  "shooter-gate",
  "natural-drain",
  "responsive",
  "rendering",
  "startup",
  "offline-audio",
  "pwa",
]) {
  const result = spawnSync(process.execPath, [`tests/${suite}.mjs`], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PINBALL_TEST_ROOT: release },
  });
  assert.equal(result.status, 0, `Minified release suite failed: ${suite}`);
}
console.log("Minified release verified for deployment.");
