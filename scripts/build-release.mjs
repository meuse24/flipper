// Packaging is optional: editable sources remain runnable without a build step.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { gzipSync } from "node:zlib";
import { minify as minifyJS } from "terser";
import { minify as minifyCSS } from "csso";
import { minify as minifyHTML } from "html-minifier-terser";
import { releaseFiles } from "./release-files.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file));
const hash = (data) => createHash("sha256").update(data).digest("hex");
const compactJS = async (source, inline = false) => {
  const result = await minifyJS(source, {
    ecma: 2022,
    compress: { passes: 2 },
    mangle: true, // Keep property names and public game/PWA hooks intact.
    format: { inline_script: inline, comments: /@license|copyright/i },
  });
  assert(result.code, "Empty JavaScript release");
  new vm.Script(result.code);
  return result.code;
};
let html = read("index.html").toString("utf8");
for (const match of [
  ...html.matchAll(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi),
].reverse()) {
  if (/\bsrc\s*=/i.test(match[1])) continue;
  assert(
    !/\btype\s*=/i.test(match[1]),
    "Review nonclassic scripts before packaging",
  );
  html =
    html.slice(0, match.index) +
    match[1] +
    (await compactJS(match[2], true)) +
    match[3] +
    html.slice(match.index + match[0].length);
}
html = html.replace(
  /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
  (_, open, css, close) =>
    open + minifyCSS(css, { comments: false, restructure: false }).css + close,
);
// Retain a separator between inline labels and preserve SVG spelling/tag boundaries.
html = await minifyHTML(html, {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  removeAttributeQuotes: true,
  removeRedundantAttributes: true,
  collapseBooleanAttributes: true,
  removeOptionalTags: false,
  caseSensitive: true,
  keepClosingSlash: true,
  minifyJS: false,
  minifyCSS: false,
});
const generated = {
  "index.html": html.trim() + "\n",
  "pwa.js": (await compactJS(read("pwa.js").toString("utf8"))) + "\n",
  "sw.js": (await compactJS(read("sw.js").toString("utf8"))) + "\n",
  "manifest.webmanifest":
    JSON.stringify(JSON.parse(read("manifest.webmanifest"))) + "\n",
};
const release = path.join(root, "release");
fs.mkdirSync(release, { recursive: true });
// Refuse unknown files rather than deleting arbitrary output or leaking stale files.
for (const entry of fs.readdirSync(release, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!entry.isFile()) continue;
  const relative = path
    .relative(release, path.join(entry.parentPath, entry.name))
    .split(path.sep)
    .join("/");
  assert(
    releaseFiles.includes(relative),
    `Unexpected file in release/: ${relative}`,
  );
}
const files = [];
for (const file of releaseFiles) {
  const source = read(file);
  const data =
    generated[file] === undefined ? source : Buffer.from(generated[file]);
  const target = path.join(release, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
  files.push({
    file,
    sourceBytes: source.length,
    bytes: data.length,
    gzipBytes: gzipSync(data).length,
    sourceSha256: hash(source),
    sha256: hash(data),
  });
}
const sourceBytes = files.reduce((sum, f) => sum + f.sourceBytes, 0);
const bytes = files.reduce((sum, f) => sum + f.bytes, 0);
assert(bytes < sourceBytes, "Release must be smaller than source");
const report = {
  sourceBytes,
  bytes,
  savedBytes: sourceBytes - bytes,
  savedPercent: Number((100 * (1 - bytes / sourceBytes)).toFixed(2)),
  lockSha256: hash(read("package-lock.json")),
  files,
};
fs.mkdirSync(path.join(root, "output"), { recursive: true });
fs.writeFileSync(
  path.join(root, "output/release-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Release: ${sourceBytes} -> ${bytes} bytes (${report.savedPercent}% smaller), ${files.length} files in release/`,
);
