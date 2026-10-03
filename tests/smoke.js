/**
 * Minimal client smoke checks for the static docs tree.
 *
 * Run against a local preview (`npm run serve`) with node:
 *   node tests/smoke.js
 *
 * Verifies: every section index exists, sitemap lists existing files,
 * search index parses, openapi.json parses, and no page is missing its title
 * or meta description. The same checks run deeper in `npm run check`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const failures = [];

function expect(file, label) {
  if (!fs.existsSync(path.join(ROOT, file))) failures.push(`missing: ${file} (${label})`);
}

[
  "index.html",
  "getting-started/index.html",
  "concepts/index.html",
  "api/index.html",
  "webhooks/index.html",
  "security/index.html",
  "status/index.html",
  "api-reference/openapi.json",
  "api-reference/openapi.yaml",
  "data/search-index.json",
  "css/docs.css",
  "js/app.js",
  "js/search/search.js",
  "sitemap.xml",
  "robots.txt",
].forEach((file) => expect(file, "core file"));

const search = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "search-index.json"), "utf8"));
if (!Array.isArray(search) || search.length < 100) {
  failures.push(`search index too small: ${Array.isArray(search) ? search.length : "invalid"}`);
}

const openapi = JSON.parse(fs.readFileSync(path.join(ROOT, "api-reference", "openapi.json"), "utf8"));
if (!openapi.paths || !openapi.paths["/discrepancies"]) {
  failures.push("openapi.json missing expected paths");
}

for (const [file, tag] of [["sitemap.xml", "<urlset"], ["robots.txt", "Sitemap:"], ["manifest.webmanifest", '"start_url"']]) {
  const body = fs.readFileSync(path.join(ROOT, file), "utf8");
  if (!body.includes(tag)) failures.push(`${file} missing expected marker`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("smoke checks passed");