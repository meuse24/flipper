// Explicit FTPS deployment. ftp.txt stays local; credentials go to curl via stdin.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { releaseFiles, deploymentBaseURL } from "./release-files.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
assert(
  args.every((arg) => ["--dry-run", "--tls12", "--force"].includes(arg)),
  "Unknown deployment option",
);
const read = (file) => fs.readFileSync(path.join(root, file));
const hash = (data) => createHash("sha256").update(data).digest("hex");
const report = JSON.parse(read("output/release-report.json"));
assert.equal(
  report.lockSha256,
  hash(read("package-lock.json")),
  "Dependencies changed; run npm run build",
);
assert.deepEqual(
  report.files.map((f) => f.file),
  releaseFiles,
  "Release allowlist changed; rebuild",
);
for (const file of report.files) {
  assert.equal(
    hash(read(file.file)),
    file.sourceSha256,
    `${file.file} changed; rebuild`,
  );
  assert.equal(
    hash(read(`release/${file.file}`)),
    file.sha256,
    `Modified release: ${file.file}; rebuild`,
  );
}
const lines = read("ftp.txt")
  .toString("utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const field = (name) =>
  lines
    .find((line) => new RegExp(`^(?:${name})\\s*[:=]`, "i").test(line))
    ?.replace(/^[^:=]*[:=]\s*/, "");
const gameURL = new URL(lines.find((line) => /^https:\/\//i.test(line)));
assert(
  !gameURL.username && !gameURL.password,
  "The public game URL must not contain credentials",
);
const baseURL = deploymentBaseURL(gameURL);
const host = field("server|host"),
  user = field("username|user|benutzer"),
  password = field("passwort|password|pass");
assert(host && user && password, "ftp.txt needs Server, Username and Passwort");
assert(
  /^[a-z0-9.-]+(?::\d+)?$/i.test(host),
  "Server must be an FTP hostname, optionally with a port",
);
const remoteDir = baseURL.pathname.replace(/^\/+|\/+$/g, "");
assert(remoteDir, "Refusing deployment to the server root");
const cache = read("sw.js")
  .toString("utf8")
  .match(/CACHE_NAME\s*=\s*"([^"]+)"/)?.[1];
assert(cache, "Missing worker cache name");
const download = async (file) => {
  const url = new URL(file, baseURL);
  url.searchParams.set("release-check", Date.now());
  return fetch(url, { cache: "no-store", signal: AbortSignal.timeout(60000) });
};
const live = await download("sw.js");
assert(
  live.ok || live.status === 404,
  `Live worker check failed: HTTP ${live.status}`,
);
assert(
  args.includes("--force") || !live.ok || !(await live.text()).includes(cache),
  "Live worker already has this version; bump CACHE_NAME and rebuild",
);
console.log(`Target: ${baseURL.href}; worker ${cache}`);
for (const file of report.files)
  console.log(`  ${file.file}: ${file.bytes} bytes`);
if (args.includes("--dry-run")) {
  console.log("Dry run complete; nothing uploaded.");
  process.exit(0);
}
const quote = (value) =>
  '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
assert(!/[\r\n\0]/.test(user + password), "Invalid credential characters");
for (const file of releaseFiles) {
  const result = spawnSync(
    process.platform === "win32" ? "curl.exe" : "curl",
    [
      "--silent",
      "--show-error",
      "--fail",
      "--ssl-reqd",
      "--ftp-create-dirs",
      "--connect-timeout",
      "30",
      "--max-time",
      "180",
      ...(args.includes("--tls12") ? ["--tlsv1.2", "--tls-max", "1.2"] : []),
      "-K",
      "-",
      "-T",
      path.join(root, "release", file),
      `ftp://${host}/${remoteDir}/${file}`,
    ],
    {
      input: `user = ${quote(`${user}:${password}`)}\n`,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(
    result.status,
    0,
    `Upload failed (${file}): ${result.stderr?.replaceAll(password, "[redacted]")}`,
  );
  console.log(`Uploaded ${file}`);
  // Confirm every prerequisite over HTTPS before publishing the final worker.
  let actual;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await download(file);
    if (response.ok) actual = hash(Buffer.from(await response.arrayBuffer()));
    if (actual === report.files.find((entry) => entry.file === file).sha256)
      break;
  }
  assert.equal(
    actual,
    report.files.find((entry) => entry.file === file).sha256,
    `HTTPS hash mismatch: ${file}`,
  );
  console.log(`Verified ${file}`);
}
console.log(`Deployment verified: ${baseURL.href}`);
