/**
 * Bakes the canonical section sidebar into EVERY page of every section,
 * replacing inconsistent hand-authored sidebars and inserting missing ones.
 * This makes navigation uniform across the tree, restores navigation and
 * current-page marking without JavaScript, and keeps first paint stable.
 *
 * Idempotent: re-running produces byte-identical output (the canonical HTML
 * is deterministic). The canon below MUST stay in sync with the runtime
 * fallback lists in js/app.js.
 *
 * Run: node scripts/bake-sidebars.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const SECTIONS = {
  api: {
    label: "API",
    groups: [["API", [["Overview", "index.html"], ["Authentication", "authentication.html"], ["Errors", "errors.html"], ["Filtering", "filtering.html"], ["Request validation", "request-validation.html"], ["Sorting", "sorting.html"], ["Pagination", "pagination.html"], ["Rate limits", "rate-limits.html"], ["Idempotency", "idempotency.html"], ["Versioning", "versioning.html"], ["Reference", "reference.html"], ["Endpoints", "endpoints.html"]]]],
  },
  changelog: {
    label: "Changelog",
    groups: [["Changelog", [["Overview", "index.html"], ["Breaking changes", "breaking-changes.html"], ["July 2026", "2026/july.html"], ["August 2026", "2026/august.html"], ["September 2026", "2026/september.html"], ["October 2026", "2026/october.html"]]]],
  },
  environments: {
    label: "Environments",
    groups: [["Environments", [["Overview", "index.html"], ["Environment variables", "environment-variables.html"], ["Sandbox", "sandbox.html"], ["Staging", "staging.html"], ["Production", "production.html"]]]],
  },
  errors: {
    label: "Errors",
    groups: [["Errors", [["Overview", "index.html"], ["Authentication", "authentication.html"], ["Authorization", "authorization.html"], ["Validation", "validation.html"], ["Not found", "not-found.html"], ["Conflict", "conflict.html"], ["Rate limit", "rate-limit.html"], ["Server errors", "server-errors.html"], ["Error codes", "error-codes.html"]]]],
  },
  security: {
    label: "Security",
    groups: [["Security", [["Overview", "index.html"], ["Authentication", "authentication.html"], ["Authorization", "authorization.html"], ["API key security", "api-key-security.html"], ["Data protection", "data-protection.html"], ["Encryption", "encryption.html"], ["Tenant isolation", "tenant-isolation.html"], ["Webhook security", "webhook-security.html"], ["Responsible disclosure", "responsible-disclosure.html"]]]],
  },
  webhooks: {
    label: "Webhooks",
    groups: [["Webhooks", [["Overview", "index.html"], ["Event catalog", "event-catalog.html"], ["Verification", "verification.html"], ["Retries", "retries.html"], ["transaction.created", "transaction-created.html"], ["transaction.matched", "transaction-matched.html"], ["transaction.unmatched", "transaction-unmatched.html"], ["reconciliation.completed", "reconciliation-completed.html"], ["anomaly.detected", "anomaly-detected.html"]]]],
  },
  testing: {
    label: "Testing",
    groups: [
      ["Testing", [["Overview", "index.html"], ["Testing against staging", "sandbox-testing.html"], ["Integration testing", "integration-testing.html"], ["Test transactions", "test-transactions.html"], ["Failure scenarios", "failure-scenarios.html"], ["Webhook testing", "webhook-testing.html"], ["Load and stress testing", "load-testing.html"]]],
      ["Foundations", [["Staging", "../environments/staging.html"], ["Idempotency", "../concepts/idempotency.html"], ["Tenant isolation", "../concepts/tenants.html"], ["API errors", "../api/errors.html"]]],
    ],
  },
  support: {
    label: "Support",
    groups: [
      ["Support", [["Overview", "index.html"], ["FAQ", "faq.html"], ["Troubleshooting", "troubleshooting.html"], ["Contact support", "contact.html"]]],
      ["Reference", [["API errors", "../api/errors.html"], ["Service status", "https://status.pesaguard.co.ke/"], ["Responsible disclosure", "../security/responsible-disclosure.html"]]],
    ],
  },
  guides: {
    label: "Guides",
    groups: [
      ["Guides", [["Overview", "index.html"]]],
      ["Authentication", [["Authentication overview", "authentication/index.html"], ["API keys", "authentication/api-keys.html"], ["Bearer tokens", "authentication/bearer-tokens.html"], ["Key rotation", "authentication/key-rotation.html"], ["OAuth support", "authentication/oauth.html"]]],
      ["Reconciliation", [["Reconciliation overview", "reconciliation/index.html"], ["Configure reconciliation", "reconciliation/configure-reconciliation.html"], ["Matching rules", "reconciliation/matching-rules.html"], ["Unmatched transactions", "reconciliation/unmatched-transactions.html"], ["Exceptions", "reconciliation/exceptions.html"], ["Reconciliation reports", "reconciliation/reconciliation-reports.html"]]],
      ["Transactions", [["Transaction overview", "transactions/index.html"], ["Create a transaction", "transactions/create-transaction.html"], ["Retrieve a transaction", "transactions/retrieve-transaction.html"], ["Search transactions", "transactions/search-transactions.html"], ["Transaction status", "transactions/transaction-status.html"], ["Handle failures", "transactions/handle-failures.html"]]],
    ],
  },
  sdks: {
    label: "SDKs",
    groups: [
      ["SDKs", [["Overview", "index.html"], ["OpenAPI contract", "../api-reference/openapi.json"]]],
      ["Client examples", [["curl", "curl.html"], ["JavaScript", "javascript.html"], ["TypeScript", "typescript.html"], ["Python", "python.html"], ["Java", "java.html"]]],
      ["Integration foundations", [["Authentication", "../api/authentication.html"], ["Errors", "../api/errors.html"], ["Idempotency", "../api/idempotency.html"], ["Pagination", "../api/pagination.html"]]],
    ],
  },
  migration: {
    label: "Migration",
    groups: [["Migration", [["Overview", "index.html"], ["API v1 to v2", "api-v1-to-v2.html"], ["Deprecated endpoints", "deprecated-endpoints.html"], ["Webhook migrations", "webhook-migrations.html"]]]],
  },
  concepts: {
    label: "Concepts",
    groups: [["Concepts", [["Overview", "index.html"], ["Architecture", "architecture.html"], ["Reconciliation", "reconciliation.html"], ["Transaction lifecycle", "transaction-lifecycle.html"], ["Idempotency", "idempotency.html"], ["Tenants", "tenants.html"], ["Anomalies", "anomalies.html"], ["Fraud detection", "fraud-detection.html"], ["Audit trails", "audit-trails.html"], ["Glossary", "glossary.html"]]]],
  },
  "getting-started": {
    label: "Getting started",
    groups: [["Getting started", [["Overview", "index.html"], ["Quickstart", "quickstart.html"], ["Create an account", "create-account.html"], ["Create an API key", "create-api-key.html"], ["First request", "first-request.html"], ["First transaction", "first-transaction.html"], ["First webhook", "first-webhook.html"], ["First reconciliation", "first-reconciliation.html"], ["Test environment", "test-environment.html"], ["Production checklist", "production-checklist.html"]]]],
  },
};

function sectionPrefix(file, sectionName) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const belowSection = rel.split("/").slice(1); // directories + filename under the section
  const depth = belowSection.length - 1;
  return "../".repeat(depth);
}

function sidebarHtml(file, sectionName, section) {
  const prefix = sectionPrefix(file, sectionName);
  const pagePath = "/" + path.relative(ROOT, file).split(path.sep).join("/").replace(/index\.html$/, "");
  const groups = section.groups.map(function (group) {
    const items = group[1].map(function (item) {
      const target = ("/" + sectionName + "/" + item[1]).replace(/index\.html$/, "");
      const current = target === pagePath || target === pagePath.replace(/\/$/, "") + "/";
      return "    <li><a href=\"" + prefix + item[1] + "\"" + (current ? " aria-current=\"page\"" : "") + ">" + item[0] + "</a></li>";
    }).join("\n");
    return "  <div class=\"docs-nav-group\"><p>" + group[0] + "</p><ul>\n" + items + "\n  </ul></div>";
  }).join("\n");
  return "<aside class=\"docs-sidebar\" aria-label=\"" + section.label + " navigation\">\n" + groups + "\n</aside>";
}

let baked = 0;
let replaced = 0;

for (const sectionName of Object.keys(SECTIONS)) {
  const dir = path.join(ROOT, sectionName);
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (!entry.name.endsWith(".html")) continue;

      const html = fs.readFileSync(full, "utf8");
      const canonical = sidebarHtml(full, sectionName, SECTIONS[sectionName]);
      const existingAside = /<aside class="docs-sidebar"[^>]*>[\s\S]*?<\/aside>/.exec(html);
      let updated;
      let action;

      if (existingAside) {
        if (existingAside[0] === canonical) continue;
        updated = html.slice(0, existingAside.index) + canonical + html.slice(existingAside.index + existingAside[0].length);
        action = "replaced";
        replaced += 1;
      } else {
        const marker = "<div class=\"docs-shell\">";
        const at = html.indexOf(marker);
        if (at < 0) {
          console.error("SKIP (no shell marker): " + path.relative(ROOT, full));
          continue;
        }
        const insertAt = at + marker.length;
        updated = html.slice(0, insertAt) + "\n" + canonical + html.slice(insertAt);
        action = "inserted";
        baked += 1;
      }

      fs.writeFileSync(full, updated);
      console.log(action + " sidebar: " + path.relative(ROOT, full));
    }
  }
}

console.log("inserted " + baked + " sidebar(s); replaced " + replaced + " sidebar(s) with the canonical version");
