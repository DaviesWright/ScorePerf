const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const appDir = path.resolve(__dirname, "..");
const openNextDir = path.join(appDir, ".open-next");
const bundledDir = path.join(openNextDir, "bundled-worker");
const pagesDistDir = path.join(openNextDir, "pages-dist");
const assetsDir = path.join(openNextDir, "assets");

console.log("1. Bundling OpenNext worker via Wrangler dry-run...");
execSync("npx wrangler deploy --dry-run --outdir=.open-next/bundled-worker", {
  cwd: appDir,
  stdio: "inherit",
});

console.log("2. Preparing .open-next/pages-dist directory...");
fs.rmSync(pagesDistDir, { recursive: true, force: true });
fs.mkdirSync(pagesDistDir, { recursive: true });
fs.cpSync(assetsDir, pagesDistDir, { recursive: true });

let workerCode = fs.readFileSync(path.join(bundledDir, "worker.js"), "utf8");
workerCode = workerCode.replace(
  /BucketCachePurge,\r?\n\s*DOQueueHandler,\r?\n\s*DOShardedTagCache,\r?\n\s*worker_default as default/,
  "worker_default as default"
);
fs.writeFileSync(path.join(pagesDistDir, "_worker.js"), workerCode, "utf8");

console.log("3. Deploying to Cloudflare Pages project: bscscoreview-staging...");
execSync(
  "npx wrangler pages deploy .open-next/pages-dist --project-name=bscscoreview-staging --branch=main --commit-dirty=true",
  {
    cwd: appDir,
    stdio: "inherit",
  }
);
