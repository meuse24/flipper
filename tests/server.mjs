import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createPreviewServer, parseByteRange } = require("../scripts/serve.cjs");

// The HTTP preview and the worker both use inclusive byte offsets for media seeking.
assert.deepEqual(parseByteRange("bytes=0-127", 1000), { start: 0, end: 127 });
assert.deepEqual(parseByteRange("bytes=-128", 1000), { start: 872, end: 999 });
assert.deepEqual(parseByteRange("bytes=900-", 1000), { start: 900, end: 999 });
for (const header of ["bytes=1000-", "bytes=30-20", "bytes=-0", "invalid"])
  assert.equal(parseByteRange(header, 1000), null);
const server = createPreviewServer();
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  const head = await fetch(`${origin}/`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.match(head.headers.get("Content-Type"), /^text\/html/);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  const manifest = await fetch(`${origin}/manifest.webmanifest`);
  assert.equal(
    manifest.headers.get("Content-Type"),
    "application/manifest+json",
  );
  assert.equal((await manifest.json()).short_name, "BADBOY");
  const audio = await fetch(`${origin}/assets/lucky-seven-song.mp3`, {
    headers: { Range: "bytes=0-127" },
  });
  assert.equal(audio.status, 206);
  assert.equal(audio.headers.get("Content-Type"), "audio/mpeg");
  assert.equal((await audio.arrayBuffer()).byteLength, 128);
  const missing = await fetch(`${origin}/missing-file`);
  assert.equal(missing.status, 404);
  const outside = await fetch(`${origin}/%2e%2e%2fpackage.json`);
  assert.equal(outside.status, 403);
  console.log(
    "Preview server MIME, HEAD, ranges, missing files and path bounds PASS",
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}
