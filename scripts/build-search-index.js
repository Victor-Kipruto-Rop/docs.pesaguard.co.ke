/**
 * Builds data/search-index.json by reading every page's <title> and
 * meta description. Run after scripts/generate-pages.js.
 *
 * The index intentionally contains only public page metadata: no page bodies,
 * no analytics, nothing user-specific.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "search-index.json");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

const index = [];
for (const file of walk(ROOT)) {
  const html = fs.readFileSync(file, "utf8");
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1];
  const description = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1];
  if (!title || !description) continue;
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const section = rel.includes("/") ? rel.split("/")[0] : "docs";
  const eyebrow = (html.match(/<p class="docs-eyebrow">([^<]+)<\/p>/) || [])[1] || section;
  index.push({
    href: rel,
    title: title.replace(/ — PesaGuard docs$/, ""),
    description,
    section: eyebrow
  });
}

index.sort((a, b) => a.href.localeCompare(b.href));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(index, null, 2) + "\n", "utf8");
// Mirror for the /search/ route, which is served as a directory.
fs.writeFileSync(path.join(ROOT, "search", "search-index.json"), JSON.stringify(index, null, 2) + "\n", "utf8");
console.log(`search index: ${index.length} pages`);