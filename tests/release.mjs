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
for (let i = 0; i < captures[0].length; i++) {
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
  assert.ok(
    captures[0][i].equals(captures[1][i]),
    `Source/release capture ${i} differs`,
  );
}
console.log(
  "Reproducibility, file allowlist, source/release UI and state parity PASS",
);
for (const suite of [
  "smoke",
  "natural-drain",
  "responsive",
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
