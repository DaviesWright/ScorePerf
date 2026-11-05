const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const appDir = path.resolve(__dirname, "..");
const openNextDir = path.join(appDir, ".open-next");
const bundledDir = path.join(openNextDir, "bundled-worker");
const distDir = path.join(openNextDir, "dist");
const pagesDistDir = path.join(openNextDir, "pages-dist");
const assetsDir = path.join(openNextDir, "assets");

console.log("1. Bundling OpenNext worker via Wrangler dry-run...");
execSync("npx wrangler deploy --dry-run --outdir=.open-next/bundled-worker", {
  cwd: appDir,
  stdio: "inherit",
});

console.log("2. Preparing .open-next/dist directory with static assets and _routes.json...");
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.cpSync(assetsDir, distDir, { recursive: true });

// _routes.json tells Cloudflare Pages to serve static chunks & images directly from CDN
const routesConfig = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/_next/static/*",
    "/login-backgrounds/*",
    "/BUILD_ID",
  ],
};
fs.writeFileSync(
  path.join(distDir, "_routes.json"),
  JSON.stringify(routesConfig, null, 2),
  "utf8"
);

let workerCode = fs.readFileSync(path.join(bundledDir, "worker.js"), "utf8");
workerCode = workerCode.replace(
  /BucketCachePurge,\r?\n\s*DOQueueHandler,\r?\n\s*DOShardedTagCache,\r?\n\s*worker_default as default/,
  "worker_default as default"
);
// Belt-and-suspenders: if a static asset request ever reaches _worker.js on Pages, serve via env.ASSETS
workerCode = workerCode.replace(
  "async fetch(request, env, ctx) {",
  'async fetch(request, env, ctx) { const _u = new URL(request.url); if (env && env.ASSETS && (_u.pathname.startsWith("/_next/static/") || _u.pathname.startsWith("/login-backgrounds/") || _u.pathname === "/BUILD_ID")) { return env.ASSETS.fetch(request); }'
);
fs.writeFileSync(path.join(distDir, "_worker.js"), workerCode, "utf8");

// Keep .open-next/pages-dist mirrored as well
fs.rmSync(pagesDistDir, { recursive: true, force: true });
fs.cpSync(distDir, pagesDistDir, { recursive: true });

console.log("3. Deploying .open-next/dist to Cloudflare Pages project: bscscoreview-staging...");
execSync(
  "npx wrangler pages deploy .open-next/dist --project-name=bscscoreview-staging --branch=main --commit-dirty=true",
  {
    cwd: appDir,
    stdio: "inherit",
  }
);
