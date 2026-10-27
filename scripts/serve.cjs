// Static preview only; the shipped game does not depend on Node.js.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
};

function resolveFile(root, requestURL) {
  const pathname = decodeURIComponent(
    new URL(requestURL, "http://localhost").pathname,
  );
  let file = path.resolve(root, "." + pathname);
  if (file === root) file = path.join(root, "index.html");
  // Check the resolved path, including encoded separators, before touching the filesystem.
  return file.startsWith(root + path.sep) ? file : null;
}

/** A single inclusive byte range; null means unsatisfiable or unsupported.
 * Audio elements use both ordinary ranges and suffixes such as bytes=-128. */
function parseByteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match) return null;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end =
    match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start > end ||
    start >= size
  )
    return null;
  return { start, end };
}

function sendFile(request, response, file) {
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.setHeader(
      "Content-Type",
      MIME_TYPES[path.extname(file)] || "application/octet-stream",
    );
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Accept-Ranges", "bytes");
    let range = { start: 0, end: stat.size - 1 };
    if (request.headers.range) {
      range = parseByteRange(request.headers.range, stat.size);
      if (!range) {
        response.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
        response.end();
        return;
      }
      response.statusCode = 206;
      response.setHeader(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${stat.size}`,
      );
    }
    response.setHeader(
      "Content-Length",
      Math.max(0, range.end - range.start + 1),
    );
    if (request.method === "HEAD" || stat.size === 0) {
      response.end();
      return;
    }
    // A file can disappear between stat() and open(); report it through the response.
    const stream = fs.createReadStream(file, range);
    stream.on("error", (error) => response.destroy(error));
    stream.pipe(response);
  });
}

// Tests create an isolated server on port 0. npm start keeps the familiar fixed port.
function createPreviewServer({ root = PROJECT_ROOT } = {}) {
  root = path.resolve(root);
  return http.createServer((request, response) => {
    let file;
    try {
      file = resolveFile(root, request.url);
    } catch {
      response.writeHead(400);
      response.end();
      return;
    }
    if (!file) {
      response.writeHead(403);
      response.end();
      return;
    }
    sendFile(request, response, file);
  });
}

if (require.main === module) {
  const port = Number(process.env.PINBALL_PORT) || 8090;
  createPreviewServer().listen(port, "127.0.0.1", () =>
    console.log(`BADBOY Pinball: http://127.0.0.1:${port}`),
  );
}
module.exports = { createPreviewServer, parseByteRange };
