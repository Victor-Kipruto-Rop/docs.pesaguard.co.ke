/**
 * Layout engine for the PesaGuard docs tree.
 *
 * One place decides the page chrome (head, header, sidebar, on-this-page,
 * pager, footer) and how content blocks are rendered. Content modules only
 * describe what a page says, never how it is laid out.
 *
 * Dependency-free: the site ships prebuilt HTML and no build step at runtime.
 */
"use strict";

const path = require("path");

const SITE = {
  origin: "https://docs.pesaguard.co.ke",
  name: "PesaGuard docs",
  product: "https://pesaguard.co.ke",
  status: "https://status.pesaguard.co.ke",
  repo: "https://github.com/Victor-Kipruto-Rop/pesaguard",
  ogImage: "assets/brand/favicon.svg",
};

const ROOT = path.resolve(__dirname, "..");

/* ---------------------------------------------------------------------------
 * Paths and text utilities.
 * ------------------------------------------------------------------------- */

/** `../` repeated to reach the docs root from a page's directory. */
function upFor(file) {
  const dir = path.dirname(file.split(path.sep).join("/"));
  if (!dir || dir === "." || dir === "") return "";
  const depth = dir.split("/").filter(Boolean).length;
  return "../".repeat(depth);
}

/** Anchor id from heading text. Deterministic; collisions handled by caller. */
function slug(text) {
  const cleaned = String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 64) || "section";
}

/** Visible words, used for an honest reading-time estimate. */
function wordCount(html) {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------------------------------------------------------------------
 * Block helpers — content modules author these, the renderer understands them.
 * ------------------------------------------------------------------------- */

const h2 = (text, opts = {}) => ({ h2: text, ...opts });
const h3 = (text, opts = {}) => ({ h3: text, ...opts });
const p = (html) => ({ p: html });
const ul = (items) => ({ ul: items });
const ol = (items) => ({ ol: items });
const table = (rows, opts = {}) => ({ table: rows, ...opts });
const code = (text, opts = {}) => ({ code: { text, ...opts } });
const note = (title, body, tone = "info") => ({ note: [title, body], noteTone: tone });
const cards = (items) => ({ cards: items });
const steps = (items) => ({ steps: items });
const kv = (rows) => ({ kv: rows });
const stats = (items) => ({ stats: items });
const endpoints = (items) => ({ endpoints: items });
const tabs = (items) => ({ tabs: items });
const timeline = (items) => ({ timeline: items });
const checklist = (items) => ({ checklist: items });
const quote = (text, source) => ({ quote: { text, source } });
const diagram = (svg, caption) => ({ diagram: { svg, caption } });
const split = (left, right) => ({ split: [left, right] });
const raw = (html) => ({ raw: html });

const B = {
  h2, h3, p, ul, ol, table, code, note, cards, steps, kv, stats,
  endpoints, tabs, timeline, checklist, quote, diagram, split, raw,
};

/* ---------------------------------------------------------------------------
 * Block rendering.
 * ------------------------------------------------------------------------- */

function renderTable(block) {
  const head = block.table[0].map((h) => `<th scope="col">${h}</th>`).join("");
  const rows = block.table
    .slice(1)
    .map((row) => `        <tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("\n");
  const caption = block.caption ? `\n      <caption>${block.caption}</caption>` : "";
  return [
    `    <div class="table-wrap">`,
    `      <table>`,
    `      <thead><tr>${head}</tr></thead>`,
    `      <tbody>`,
    rows,
    `      </tbody>${caption}`,
    `      </table>`,
    `    </div>`,
  ].join("\n");
}

function renderCode(block, key) {
  const { method, label, text, lang } = block.code;
  const chip = method ? `<span class="method" data-method="${escapeHtml(method)}">${escapeHtml(method)}</span>` : "";
  return [
    `    <figure class="code-block" data-lang="${escapeHtml(lang || "text")}">`,
    `      <figcaption class="code-head">`,
    `        ${chip}<code class="code-path">${escapeHtml(label || lang || "code")}</code>`,
    `        <span class="code-lang">${escapeHtml(lang || "text")}</span>`,
    `        <button class="code-copy" type="button" data-copy>Copy</button>`,
    `      </figcaption>`,
    `      <pre class="docs-code"><code>${escapeHtml(text)}</code></pre>`,
    `    </figure>`,
  ].join("\n");
}

function renderSteps(items) {
  const body = items
    .map((item, i) =>
      [
        `      <li class="step">`,
        `        <span class="step-marker" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>`,
        `        <div class="step-body">`,
        `          <h3 id="${slug(item.title)}">${item.title}</h3>`,
        item.body ? `          <p>${item.body}</p>` : "",
        item.list ? `          <ul>${item.list.map((li) => `<li>${li}</li>`).join("")}</ul>` : "",
        item.code ? renderCode({ code: item.code }, `step-${i}`) : "",
        `        </div>`,
        `      </li>`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");
  return `    <ol class="steps">\n${body}\n    </ol>`;
}

function renderCards(items) {
  const body = items
    .map((card) => {
      const tag = card.tag ? `<span class="card-tag">${card.tag}</span>` : "";
      const inner = `<h3>${card.title}</h3>${tag}<p>${card.body}</p>${card.go ? `<span class="go">${card.go}</span>` : ""}`;
      return card.href ? `      <a class="card" href="${card.href}">${inner}</a>` : `      <div class="card">${inner}</div>`;
    })
    .join("\n");
  return `    <div class="card-grid">\n${body}\n    </div>`;
}

function renderKv(block) {
  const rows = block.kv.map(([key, value]) => `      <div class="kv-row"><dt>${key}</dt><dd>${value}</dd></div>`).join("\n");
  return `    <dl class="kv-list">\n${rows}\n    </dl>`;
}

function renderStats(items) {
  const body = items
    .map(
      (item) =>
        `      <div class="stat"><span class="stat-value">${item.value}</span><span class="stat-label">${item.label}</span></div>`
    )
    .join("\n");
  return `    <div class="stat-grid">\n${body}\n    </div>`;
}

function renderEndpoints(items) {
  const body = items
    .map((item) => {
      const chip = `<span class="verb" data-verb="${escapeHtml(item.method)}">${escapeHtml(item.method)}</span>`;
      const target = item.href ? `<a href="${item.href}">${escapeHtml(item.path)}</a>` : `<code>${escapeHtml(item.path)}</code>`;
      const badge = item.badge
        ? ` <span class="endpoint-badge" data-tone="${escapeHtml(item.badgeTone || "live")}">${escapeHtml(item.badge)}</span>`
        : "";
      return [
        `      <li>`,
        `        ${chip}`,
        `        <div class="endpoint-body">`,
        `          <span class="endpoint-path">${target}${badge}</span>`,
        `          <span class="endpoint-summary">${item.summary}</span>`,
        `        </div>`,
        `      </li>`,
      ].join("\n");
    })
    .join("\n");
  return `    <ul class="endpoint-list">\n${body}\n    </ul>`;
}

function renderTimeline(items) {
  const body = items
    .map(
      (item) =>
        `      <li class="timeline-item"><span class="timeline-when">${item.when}</span><div class="timeline-body"><h3>${item.title}</h3><p>${item.body}</p></div></li>`
    )
    .join("\n");
  return `    <ol class="timeline">\n${body}\n    </ol>`;
}

function renderChecklist(items) {
  const body = items
    .map((item) => `      <li><span class="check" aria-hidden="true">✓</span><span>${item}</span></li>`)
    .join("\n");
  return `    <ul class="checklist">\n${body}\n    </ul>`;
}

/** Tabs render every panel in full, so the page still reads without JavaScript. */
function renderTabs(block) {
  const ids = block.tabs.map((tab, i) => `tab-${slug(tab.label)}-${i}`);
  const buttons = block.tabs
    .map(
      (tab, i) =>
        `        <button type="button" role="tab" id="${ids[i]}-tab" aria-controls="${ids[i]}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab>${tab.label}</button>`
    )
    .join("\n");
  const panels = block.tabs
    .map((tab, i) => {
      const inner = tab.code
        ? renderCode({ code: tab.code }, ids[i])
        : (tab.blocks || []).map((b) => renderBlock(b, ids[i])).join("\n");
      return `      <div class="tab-panel" role="tabpanel" id="${ids[i]}" aria-labelledby="${ids[i]}-tab"${i === 0 ? "" : " hidden"}>\n${inner}\n      </div>`;
    })
    .join("\n");
  return [
    `    <div class="tabs" data-tabs>`,
    `      <div class="tab-list" role="tablist" aria-label="Alternatives">`,
    buttons,
    `      </div>`,
    panels,
    `    </div>`,
  ].join("\n");
}

function renderBlock(block, key = "b") {
  if (block.raw) return block.raw;
  if (block.h2) {
    return `    <h2 id="${block.id}">${block.h2}<a class="anchor" href="#${block.id}" aria-label="Link to this section">#</a></h2>`;
  }
  if (block.h3) {
    return `    <h3 id="${block.id}">${block.h3}<a class="anchor" href="#${block.id}" aria-label="Link to this section">#</a></h3>`;
  }
  if (block.p) return `    <p>${block.p}</p>`;
  if (block.ul) return `    <ul>\n${block.ul.map((item) => `      <li>${item}</li>`).join("\n")}\n    </ul>`;
  if (block.ol) return `    <ol>\n${block.ol.map((item) => `      <li>${item}</li>`).join("\n")}\n    </ol>`;
  if (block.table) return renderTable(block);
  if (block.code) return renderCode(block, key);
  if (block.note) {
    const tone = block.noteTone || "info";
    const icon = { info: "i", warn: "!", danger: "×", tip: "★" }[tone] || "i";
    return [
      `    <aside class="callout" data-tone="${tone}">`,
      `      <span class="callout-icon" aria-hidden="true">${icon}</span>`,
      `      <div class="callout-body"><strong>${block.note[0]}</strong>`,
      `      <p>${block.note[1]}</p></div>`,
      `    </aside>`,
    ].join("\n");
  }
  if (block.cards) return renderCards(block.cards);
  if (block.steps) return renderSteps(block.steps);
  if (block.kv) return renderKv(block);
  if (block.stats) return renderStats(block.stats);
  if (block.endpoints) return renderEndpoints(block.endpoints);
  if (block.tabs) return renderTabs(block);
  if (block.timeline) return renderTimeline(block.timeline);
  if (block.checklist) return renderChecklist(block.checklist);
  if (block.quote) {
    return `    <blockquote><p>${block.quote.text}</p>${block.quote.source ? `<cite>${block.quote.source}</cite>` : ""}</blockquote>`;
  }
  if (block.diagram) {
    return `    <figure class="diagram">${block.diagram.svg}${block.diagram.caption ? `<figcaption>${block.diagram.caption}</figcaption>` : ""}</figure>`;
  }
  if (block.split) {
    const cols = block.split
      .map((side) => `      <div class="split-col">\n${side.map((b) => renderBlock(b, key)).join("\n")}\n      </div>`)
      .join("\n");
    return `    <div class="split">\n${cols}\n    </div>`;
  }
  throw new Error(`engine: unknown block ${JSON.stringify(block).slice(0, 90)}`);
}

/* ---------------------------------------------------------------------------
 * Page preparation: heading ids, on-this-page entries, reading time.
 * ------------------------------------------------------------------------- */

const HEADING_TEXT = (block) =>
  String(block.h2 || block.h3 || "").replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();

function preparePage(page) {
  const seen = new Map();
  const headings = [];
  const blocks = (page.blocks || []).map((block) => {
    if (!block.h2 && !block.h3) return block;
    const base = slug(HEADING_TEXT(block));
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    const next = { ...block, id };
    headings.push({ level: block.h2 ? 2 : 3, id, text: HEADING_TEXT(block) });
    return next;
  });
  const bodyHtml = blocks.map((block, i) => renderBlock(block, `blk-${i}`)).join("\n");
  const words =
    wordCount(page.lede || "") +
    bodyHtml.split("\n").filter((line) => !line.includes("code-block")).join(" ").length / 6;
  const minutes = Math.max(1, Math.round(words / 220));
  return { ...page, blocks, headings, bodyHtml, readingMinutes: minutes };
}

function preparePages(pages) {
  return pages.map(preparePage);
}

/* ---------------------------------------------------------------------------
 * Chrome fragments.
 * ------------------------------------------------------------------------- */

function renderToc(page, up) {
  if (!page.headings.length || page.toc === false) return "";
  const items = page.headings
    .map(
      (h) =>
        `        <li data-level="${h.level}"><a href="#${h.id}">${h.text}</a></li>`
    )
    .join("\n");
  return [
    `<aside class="docs-toc" aria-label="On this page">`,
    `  <div class="docs-toc-inner">`,
    `    <p class="docs-toc-title">On this page</p>`,
    `    <ul class="docs-toc-list">`,
    items,
    `    </ul>`,
    `    <a class="docs-toc-top" href="#main" data-top>Back to top</a>`,
    `  </div>`,
    `</aside>`,
  ].join("\n");
}

/**
 * Sidebar: every group is a <details> so long reference sets stay collapsed
 * until wanted. The current group is open, and the current page is marked by
 * js/app.js from body[data-path].
 */
function renderSidebar(page, groups, up) {
  const blocks = groups
    .map((group) => {
      const isCurrent = group.id === page.group;
      const links = group.pages
        .map((entry) => {
          const href = up + entry.file;
          return `        <li><a href="${href}">${entry.title}</a></li>`;
        })
        .join("\n");
      return [
        `<details class="docs-nav-group"${isCurrent ? " open" : ""}>`,
        `  <summary><span>${group.label}</span><span class="docs-nav-count">${group.pages.length}</span></summary>`,
        `  <ul>`,
        links,
        `  </ul>`,
        `</details>`,
      ].join("\n");
    })
    .join("\n");
  return [
    `<aside class="docs-sidebar" id="sidebar" aria-label="Documentation navigation">`,
    `  <div class="docs-sidebar-inner">`,
    `    <div class="docs-nav-search">`,
    `      <button type="button" class="docs-nav-search-btn" data-palette-open>`,
    `        <span aria-hidden="true">⌕</span> Filter navigation`,
    `      </button>`,
    `    </div>`,
    blocks,
    `    <div class="docs-nav-foot">`,
    `      <a href="${up}index.html">Documentation home</a>`,
    `      <a href="${up}search/index.html">Search all pages</a>`,
    `    </div>`,
    `  </div>`,
    `</aside>`,
  ].join("\n");
}

function renderPager(page, up) {
  const prev = page.__prev;
  const next = page.__next;
  if (!prev && !next) return "";
  const link = (entry, dir) =>
    entry
      ? `<a class="pager-link" data-dir="${dir}" href="${up}${entry.file}"><span class="pager-dir">${dir === "prev" ? "Previous" : "Next"}</span><span class="pager-title">${entry.title}</span></a>`
      : `<span class="pager-link is-empty"></span>`;
  return [
    `<nav class="docs-pager" aria-label="Page navigation">`,
    `  ${link(prev, "prev")}`,
    `  ${link(next, "next")}`,
    `</nav>`,
  ].join("\n");
}

function renderRelated(page, up) {
  if (!page.related || !page.related.length) return "";
  const items = page.related
    .map(([label, href, blurb]) =>
      blurb
        ? `    <a class="card" href="${up}${href}"><h3>${label}</h3><p>${blurb}</p></a>`
        : `    <a class="card" href="${up}${href}"><h3>${label}</h3></a>`
    )
    .join("\n");
  return [
    `<section class="docs-related" aria-label="Related pages">`,
    `  <h2 id="related">Related</h2>`,
    `  <div class="card-grid">`,
    items,
    `  </div>`,
    `</section>`,
  ].join("\n");
}

function renderFeedback(page) {
  return [
    `<aside class="docs-feedback" data-feedback>`,
    `  <p class="docs-feedback-title">Was this page useful?</p>`,
    `  <div class="docs-feedback-actions">`,
    `    <button type="button" data-feedback-value="yes">Yes, it answered my question</button>`,
    `    <button type="button" data-feedback-value="no">No, something is missing</button>`,
    `    <a class="docs-feedback-link" href="${SITE.repo}/issues/new">Open an issue</a>`,
    `  </div>`,
    `  <p class="docs-feedback-note">Feedback is stored in your browser only. Nothing is sent anywhere.</p>`,
    `</aside>`,
  ].join("\n");
}

const PRIMARY_NAV = [
  ["Getting started", "getting-started/"],
  ["Concepts", "concepts/"],
  ["Guides", "guides/"],
  ["API", "api/"],
  ["Webhooks", "webhooks/"],
  ["Security", "security/"],
  ["Support", "support/"],
];

const FOOTER_GROUPS = [
  ["Start here", [["Getting started", "getting-started/index.html"], ["Quickstart", "getting-started/quickstart.html"], ["Concepts", "concepts/index.html"], ["Guides", "guides/index.html"]]],
  ["Reference", [["API overview", "api/index.html"], ["OpenAPI document", "api-reference/index.html"], ["Error codes", "errors/error-codes.html"], ["Webhook events", "webhooks/event-catalog.html"], ["Environments", "environments/index.html"], ["Schemas", "api-reference/index.html"]]],
  ["Operate", [["Status", "status/index.html"], ["Security", "security/index.html"], ["Testing", "testing/index.html"], ["Migration", "migration/index.html"], ["Changelog", "changelog/index.html"], ["Support", "support/index.html"]]],
];

function renderHeader(page, up) {
  const nav = PRIMARY_NAV.map(([label, href]) => `<a href="${up}${href}">${label}</a>`).join("\n    ");
  return [
    `<header class="docs-header">`,
    `  <div class="docs-progress" data-progress aria-hidden="true"><span></span></div>`,
    `  <div class="docs-header-inner">`,
    `    <button class="docs-menu-btn" type="button" data-nav-toggle aria-expanded="false" aria-controls="sidebar"><span aria-hidden="true">☰</span><span class="visually-hidden">Toggle navigation</span></button>`,
    `    <a class="docs-brand" href="${up}index.html">`,
    `      <img src="${up}assets/brand/favicon.svg" alt="" width="26" height="26">`,
    `      <span class="docs-brand-name">PesaGuard</span> <small>Docs</small>`,
    `    </a>`,
    `    <nav class="docs-header-links" aria-label="Primary">`,
    `    ${nav}`,
    `    </nav>`,
    `    <div class="docs-header-tools">`,
    `      <button class="docs-search-trigger" type="button" data-palette-open aria-label="Search documentation">`,
    `        <span aria-hidden="true">⌕</span><span class="docs-search-label">Search docs…</span><kbd>Ctrl</kbd><kbd>K</kbd>`,
    `      </button>`,
    `    </div>`,
    `  </div>`,
    `</header>`,
  ].join("\n");
}

function renderFooter(page, up) {
  const columns = FOOTER_GROUPS.map(
    ([title, links]) => [
      `      <div class="docs-footer-col">`,
      `        <p>${title}</p>`,
      `        <ul>`,
      links.map(([label, href]) => `          <li><a href="${up}${href}">${label}</a></li>`).join("\n"),
      `        </ul>`,
      `      </div>`,
    ].join("\n")
  ).join("\n");
  return [
    `<footer class="docs-footer">`,
    `  <div class="docs-footer-inner">`,
    `    <div class="docs-footer-brand">`,
    `      <img src="${up}assets/brand/favicon.svg" alt="" width="30" height="30">`,
    `      <p><strong>PesaGuard docs</strong><br>M-Pesa (Safaricom Daraja) reconciliation, documented honestly — every capability carries a status you can check.</p>`,
    `    </div>`,
    `    <div class="docs-footer-grid">`,
    columns,
    `    </div>`,
    `  </div>`,
    `  <div class="docs-footer-bottom">`,
    `    <span>© 2026 PesaGuard</span>`,
    `    <nav aria-label="Footer">`,
    `      <a href="${SITE.product}">Product</a>`,
    `      <a href="${SITE.status}">Status</a>`,
    `      <a href="${SITE.repo}">Source</a>`,
    `      <a href="${up}security/responsible-disclosure.html">Report an issue</a>`,
    `    </nav>`,
    `  </div>`,
    `</footer>`,
  ].join("\n");
}

function renderHead(page, up) {
  const title = page.title === "PesaGuard developer documentation" ? page.title : `${page.title} — PesaGuard docs`;
  const canonical = SITE.origin + page.path;
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    url: canonical,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.origin + "/" },
    publisher: { "@type": "Organization", name: "PesaGuard" },
  });
  return [
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${title}</title>`,
    `<meta name="description" content="${page.description}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta name="theme-color" content="#121416" media="(prefers-color-scheme: dark)">`,
    `<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">`,
    `<meta name="color-scheme" content="light dark">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="${SITE.name}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${page.description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${SITE.origin}/${SITE.ogImage}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<link rel="icon" type="image/svg+xml" href="${up}assets/brand/favicon.svg">`,
    `<link rel="manifest" href="${up}manifest.webmanifest">`,
    `<link rel="stylesheet" href="${up}css/docs.css">`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join("\n");
}

/**
 * Rewrites content-authored internal links (always written relative to the docs
 * root) into page-relative links. External, mail, anchor and explicit `../`
 * links are left untouched.
 */
function resolveHrefs(html, up) {
  if (!up) return html;
  return html.replace(/(href|src)="([^"]+)"/g, (match, attr, target) => {
    if (/^(https?:|mailto:|tel:|data:|#|\/|\.\.\/|\/\/)/.test(target)) return match;
    return `${attr}="${up}${target}"`;
  });
}

function renderPage(page) {
  const up = upFor(page.file);
  const wide = page.layout === "home" || page.layout === "wide";
  const body = resolveHrefs(page.bodyHtml, up);
  const crumbs = page.crumbs || [];

  const breadcrumb = [
    `<nav class="docs-crumbs" aria-label="Breadcrumb">`,
    `  <a href="${up}index.html">Docs</a>`,
    crumbs
      .map(([label, href]) =>
        href
          ? `<span aria-hidden="true">/</span><a href="${up}${href}">${label}</a>`
          : `<span aria-hidden="true">/</span><span aria-current="page">${label}</span>`
      )
      .join("\n  "),
    `</nav>`,
  ].join("\n");

  const statusPill = page.status
    ? ` <span class="status-pill" data-tone="${page.status.toLowerCase()}"><i aria-hidden="true"></i>${page.status}</span>`
    : "";
  const meta = [
    `<span>${page.readingMinutes} min read</span>`,
    page.status ? `<span>Status: ${page.status}</span>` : "",
    page.headings.length ? `<span>${page.headings.length} sections</span>` : "",
  ]
    .filter(Boolean)
    .join("\n      ");

  const hero = [
    `<header class="docs-hero">`,
    `  <p class="docs-eyebrow">${page.section}</p>`,
    `  <h1>${page.title}${statusPill}</h1>`,
    `  <p class="docs-lede">${page.lede}</p>`,
    `  <p class="docs-meta">`,
    `    ${meta}`,
    `  </p>`,
    page.hero && page.hero.stats ? renderStats(page.hero.stats) : "",
    `</header>`,
  ]
    .filter(Boolean)
    .join("\n");

  const sidebar = wide ? "" : renderSidebar(page, page.__groups, up);
  const toc = wide ? "" : renderToc(page, up);

  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    renderHead(page, up),
    `</head>`,
    `<body data-path="${page.path}" data-root="${up}"${wide ? ` data-layout="${page.layout}"` : ""}>`,
    `<a class="visually-hidden" href="#main">Skip to content</a>`,
    renderHeader(page, up),
    ``,
    `<main id="main">`,
    `<div class="docs-shell${wide ? " docs-shell-wide" : ""}">`,
    sidebar,
    `  <article class="docs-article${wide ? " docs-content-wide" : ""}" data-article>`,
    breadcrumb,
    hero,
    body,
    renderRelated(page, up),
    renderPager(page, up),
    page.feedback === false ? "" : renderFeedback(page),
    `  </article>`,
    toc,
    `</div>`,
    `</main>`,
    ``,
    renderFooter(page, up),
    ``,
    `<div class="docs-palette" data-palette hidden>`,
    `  <div class="palette-scrim" data-palette-close></div>`,
    `  <div class="palette-panel" role="dialog" aria-modal="true" aria-label="Search documentation">`,
    `    <div class="palette-input">`,
    `      <span aria-hidden="true">⌕</span>`,
    `      <input type="search" id="palette-input" autocomplete="off" spellcheck="false" placeholder="Search pages, concepts and endpoints…" aria-controls="palette-results" aria-expanded="false" role="combobox" aria-autocomplete="list">`,
    `      <kbd>Esc</kbd>`,
    `    </div>`,
    `    <div class="palette-results" id="palette-results" role="listbox" aria-label="Search results"></div>`,
    `    <div class="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>Esc</kbd> close</span></div>`,
    `  </div>`,
    `</div>`,
    ``,
    `<script src="${up}js/app.js" defer></script>`,
    `<script src="${up}js/search/search.js" defer></script>`,
    `</body>`,
    `</html>`,
    ``,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

/**
 * Groups pages by their declared group, orders groups by the navigation
 * declaration, and links each page to its neighbours for the pager.
 */
function organize(pages, navGroups) {
  const buckets = new Map();
  for (const page of pages) {
    if (!buckets.has(page.group)) buckets.set(page.group, []);
    buckets.get(page.group).push(page);
  }
  const declared = new Set(navGroups.map((g) => g.id));
  const groups = navGroups
    .map((g) => ({ id: g.id, label: g.label, href: g.href, pages: buckets.get(g.id) || [] }))
    .concat(
      [...buckets.keys()]
        .filter((id) => !declared.has(id))
        .map((id) => ({ id, label: id, href: `${id}/`, pages: buckets.get(id) }))
    )
    .filter((group) => group.pages.length);
  const ordered = groups.flatMap((group) => group.pages);
  ordered.forEach((page, i) => {
    page.__prev = ordered[i - 1] || null;
    page.__next = ordered[i + 1] || null;
  });
  for (const page of ordered) page.__groups = groups;
  return { groups, ordered };
}

module.exports = {
  SITE,
  ROOT,
  B,
  upFor,
  slug,
  wordCount,
  escapeHtml,
  preparePage,
  preparePages,
  renderPage,
  organize,
  resolveHrefs,
};
