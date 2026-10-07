/**
 * Walks the docs tree, collects every internal href/src, and fails when a
 * target does not exist. Run: `npm run check` (or `node scripts/check-docs.js`).
 *
 * Deliberately dependency-free so CI needs nothing beyond Node.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];
let pagesChecked = 0;
let linksChecked = 0;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function normalize(href) {
  const clean = href.split("#")[0].split("?")[0];
  return clean.length === 0 ? "index.html" : clean;
}

const files = walk(ROOT);

for (const indexFile of ["llms.txt", "llms-full.txt"]) {
  const fullPath = path.join(ROOT, indexFile);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
    problems.push(`${indexFile} -> required AI documentation index is missing or empty`);
  }
}

for (const file of files.filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  if (!/<html(?:\s|>)/i.test(html)) continue;
  pagesChecked += 1;
  const dir = path.dirname(file);
  const attrs = html.match(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g) || [];

  for (const raw of attrs) {
    const value = raw.slice(raw.indexOf('"') + 1, -1);
    if (/^(https?:|mailto:|data:|\/\/)/.test(value)) continue;
    linksChecked += 1;
    const target = path.resolve(dir, normalize(value));
    if (!fs.existsSync(target)) {
      problems.push(`${rel(file)} -> broken link: ${value}`);
    }
  }

  if (!/<title>[^<]+<\/title>/.test(html)) {
    problems.push(`${rel(file)} -> missing <title>`);
  }
  if (!/<meta name="description" content="[^"]+"/.test(html)) {
    problems.push(`${rel(file)} -> missing meta description`);
  }
  if (!/<meta name="theme-color" content="#ffffff" media="\(prefers-color-scheme: light\)">/.test(html) ||
      !/<meta name="theme-color" content="#121416" media="\(prefers-color-scheme: dark\)">/.test(html) ||
      !/<meta name="color-scheme" content="light dark">/.test(html)) {
    problems.push(`${rel(file)} -> missing device-based light/dark theme metadata`);
  }
  if (/fonts\.googleapis\.com|pg-theme|docs-theme-toggle|data-theme=/.test(html)) {
    problems.push(`${rel(file)} -> contains an external font or manual theme override`);
  }
}

for (const source of ["scripts/generate-pages.js", "scripts/engine.js"]) {
  const contents = fs.readFileSync(path.join(ROOT, source), "utf8");
  if (/fonts\.googleapis\.com|pg-theme|docs-theme-toggle|data-theme=/.test(contents)) {
    problems.push(`${rel(path.join(ROOT, source))} -> can reintroduce an external font or manual theme override`);
  }
}

const jsonFiles = files.filter((f) => f.endsWith(".json"));
for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    problems.push(`${rel(file)} -> invalid JSON: ${err.message}`);
  }

  for (const file of files.filter((f) => /\.(?:html|json|ya?ml|xml)$/i.test(f))) {
    const contents = fs.readFileSync(file, "utf8");
    if (/https?:\/\/(?:[a-z0-9-]+\.)*pesaguard\.victorkipruto\.com/i.test(contents)) {
      problems.push(`${rel(file)} -> production-facing PesaGuard links must use the canonical .co.ke domains`);
    }
  }
}

console.log(`checked ${pagesChecked} pages, ${linksChecked} internal links, ${jsonFiles.length} json files`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error("  " + problem);
  process.exit(1);
}
console.log("all internal links and metadata OK");
