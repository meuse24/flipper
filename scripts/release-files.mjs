// One allowlist shared by packaging and deployment. Never upload the repository root.
export function deploymentBaseURL(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Deployment needs a public HTTPS URL without credentials");
  }
  url.search = "";
  url.hash = "";
  // ftp.txt can name either /apps/flipper, /apps/flipper/ or its index.html.
  // URL('./', '/apps/flipper') alone would mistakenly select the parent /apps/.
  if (!url.pathname.endsWith("/") && !/\/[^/]+\.[^/]+$/.test(url.pathname))
    url.pathname += "/";
  return new URL("./", url);
}

export const releaseFiles = [
  "assets/icon-180.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/lucky-seven-song.mp3",
  "assets/lucky-seven-theme.mp3",
  "manifest.webmanifest",
  "MEDIA-LICENSE.md",
  "SLOT-PWA-LICENSE.txt",
  "pwa.js",
  "index.html",
  "sw.js", // Publish last: all assets must exist before a worker can cache them.
];
