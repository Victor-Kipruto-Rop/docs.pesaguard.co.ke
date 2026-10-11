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
  return href.split("#")[0].split("?")[0];
}

function resolveTarget(file, href) {
  const clean = normalize(href);
  const target = clean.startsWith("/")
    ? path.resolve(ROOT, clean.slice(1))
    : path.resolve(path.dirname(file), clean || "index.html");
  if (fs.existsSync(target)) return target;
  if (!path.extname(target) && fs.existsSync(`${target}.html`)) return `${target}.html`;
  if (!path.extname(target) && fs.existsSync(path.join(target, "index.html"))) {
    return path.join(target, "index.html");
  }
  return target;
}

function publicRoute(file) {
  const relative = rel(file);
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative.replace(/\.html$/, "")}`;
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
  const attrs = [...html.matchAll(/\b(?:href|src)="([^"]*)"/g)];

  for (const raw of attrs) {
    const value = raw[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/|#)/.test(value)) continue;
    linksChecked += 1;
    const target = resolveTarget(file, value);
    if (!fs.existsSync(target)) {
      problems.push(`${rel(file)} -> broken link: ${value}`);
    }
    if (/\.html(?:[?#]|$)/i.test(value) && fs.existsSync(target) && target.endsWith(".html") &&
        /<html(?:\s|>)/i.test(fs.readFileSync(target, "utf8"))) {
      problems.push(`${rel(file)} -> page link exposes .html: ${value}`);
    }
  }

  const canonical = (html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i) || [])[1];
  if (!canonical) problems.push(`${rel(file)} -> missing canonical URL`);
  else if (/\.html(?:[?#]|$)/i.test(canonical)) problems.push(`${rel(file)} -> canonical URL exposes .html: ${canonical}`);
  else if (canonical !== `https://docs.pesaguard.co.ke${publicRoute(file)}`) {
    problems.push(`${rel(file)} -> canonical URL does not match clean route ${publicRoute(file)}: ${canonical}`);
  }
  if (/data-path="[^"]+\.html"/i.test(html)) problems.push(`${rel(file)} -> body data-path exposes .html`);

  if (!/<title>[^<]+<\/title>/.test(html)) {
    problems.push(`${rel(file)} -> missing <title>`);
  }
  if (!/<meta name="description" content="[^"]+"/.test(html)) {
    problems.push(`${rel(file)} -> missing meta description`);
  }
  if (!/<meta name="theme-color" content="#ffffff">/.test(html) ||
      !/<meta name="color-scheme" content="light dark">/.test(html)) {
    problems.push(`${rel(file)} -> missing light-default theme metadata`);
  }
  if (/fonts\.googleapis\.com|pg-theme/.test(html)) {
    problems.push(`${rel(file)} -> contains an external font or unsupported theme override`);
  }
  if (!/<script[^>]+js\/app\.js/.test(html)) {
    problems.push(`${rel(file)} -> missing shared theme and navigation behaviour`);
  }
}

for (const source of ["scripts/generate-pages.js", "scripts/engine.js"]) {
  const contents = fs.readFileSync(path.join(ROOT, source), "utf8");
  if (/fonts\.googleapis\.com|pg-theme/.test(contents)) {
    problems.push(`${rel(path.join(ROOT, source))} -> can reintroduce an external font or unsupported theme override`);
  }
}

const themeHeader = fs.readFileSync(path.join(ROOT, "components", "header.html"), "utf8");
const footerComponent = fs.readFileSync(path.join(ROOT, "components", "footer.html"), "utf8");
const themeApp = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
if (!/class="theme-toggle docs-theme-toggle"/.test(themeHeader) ||
    !/pesaguard-site-theme/.test(themeApp) ||
    !/localStorage\.setItem/.test(themeApp)) {
  problems.push("shared header or app is missing the persistent theme toggle");
}
if (!/mailto:support@pesaguard\.co\.ke/.test(footerComponent) ||
    !/mailto:support@pesaguard\.co\.ke/.test(themeApp)) {
  problems.push("shared docs chrome is missing the direct email support link");
}

const jsonFiles = files.filter((f) => f.endsWith(".json"));
for (const file of jsonFiles) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (["data/search-index.json", "search/search-index.json"].includes(rel(file))) {
      if (!Array.isArray(parsed)) {
        problems.push(`${rel(file)} -> search index must be an array`);
      } else {
        if (parsed.length !== pagesChecked) {
          problems.push(`${rel(file)} -> expected ${pagesChecked} pages, found ${parsed.length}`);
        }
        for (const entry of parsed) {
          if (!entry.href || /\.html(?:[?#]|$)/i.test(entry.href)) {
            problems.push(`${rel(file)} -> invalid or extension-bearing search URL: ${entry.href}`);
            continue;
          }
          const target = resolveTarget(path.join(ROOT, "index.html"), entry.href);
          if (!fs.existsSync(target)) problems.push(`${rel(file)} -> search URL does not resolve: ${entry.href}`);
        }
      }
    }
  } catch (err) {
    problems.push(`${rel(file)} -> invalid JSON: ${err.message}`);
  }
}

for (const file of files.filter((f) => /\.(?:html|json|ya?ml|xml)$/i.test(f))) {
  const contents = fs.readFileSync(file, "utf8");
  const legacyDomain = /https?:\/\/(?:[a-z0-9-]+\.)*pesaguard\.victorkipruto\.com/ig;
  for (const match of contents.matchAll(legacyDomain)) {
    if (match[0].toLowerCase() === "https://status.pesaguard.victorkipruto.com") continue;
    problems.push(`${rel(file)} -> production-facing PesaGuard links must use the canonical .co.ke domains`);
    break;
  }
}

const sitemapPath = path.join(ROOT, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  problems.push("sitemap.xml -> required sitemap is missing");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (locations.length !== pagesChecked) {
    problems.push(`sitemap.xml -> expected ${pagesChecked} page URLs, found ${locations.length}`);
  }
  if (new Set(locations).size !== locations.length) {
    problems.push("sitemap.xml -> contains duplicate page URLs");
  }
  for (const location of locations) {
    if (/\.html(?:[?#]|$)/i.test(location)) problems.push(`sitemap.xml -> page URL exposes .html: ${location}`);
    const pathname = new URL(location).pathname;
    if (!fs.existsSync(resolveTarget(path.join(ROOT, "index.html"), pathname))) {
      problems.push(`sitemap.xml -> page URL does not resolve: ${location}`);
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
