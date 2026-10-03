/**
 * Verifies that every external http(s) URL referenced from docs pages via
 * href/src is reachable over the network: GET with redirects followed, 15s
 * timeout, and any status below 400 counts as reachable. Dependency-free;
 * network required.
 *
 * Run: npm run check:external (or node scripts/check-external-links.js).
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 5;

/* Preconnect hints point at service origins whose bare root is allowed to be
 * a 404; they are reachability hints, not document links. */
const EXEMPT = new Set([
  "https://fonts.gstatic.com",
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function fetchStatus(url, redirectsLeft) {
  return new Promise(function (resolve, reject) {
    const client = url.indexOf("https:") === 0 ? https : http;
    const request = client.get(url, {
      headers: { "User-Agent": "pesaguard-docs-linkcheck/1.0 (+docs site maintenance)" },
      timeout: TIMEOUT_MS,
    }, function (response) {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location && redirectsLeft > 0) {
        response.resume();
        const next = new URL(response.headers.location, url).toString();
        resolve(fetchStatus(next, redirectsLeft - 1));
        return;
      }
      response.resume();
      resolve(status);
    });
    request.on("timeout", function () { request.destroy(new Error("timeout after " + TIMEOUT_MS + "ms")); });
    request.on("error", reject);
  });
}

const urls = new Set();
for (const file of walk(ROOT)) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
    const url = match[1];
    if (EXEMPT.has(url)) continue;
    urls.add(url);
  }
}

(async function () {
  console.log("checking " + urls.size + " external URL(s)...");
  let failed = 0;
  for (const url of urls) {
    try {
      const status = await fetchStatus(url, MAX_REDIRECTS);
      if (status >= 400) {
        console.error("  FAIL " + url + " -> HTTP " + status);
        failed += 1;
      } else {
        console.log("  " + status + " " + url);
      }
    } catch (err) {
      console.error("  FAIL " + url + " -> " + err.message);
      failed += 1;
    }
  }
  if (failed) {
    console.error("external link check failed: " + failed + " unreachable URL(s)");
    process.exit(1);
  }
  console.log("all external links reachable");
})();
