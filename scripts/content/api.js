/**
 * API — the operations surface for integrations. Envelopes, auth, pagination,
 * filtering, sorting, versioning, rate limits, idempotency, validation, errors.
 */
"use strict";

const { B } = require("../engine");
const { statusNote, FACTS, tenantInvariant } = require("./shared");

const GROUP = "api";
const pages = [];

pages.push({
  file: "api/index.html",
  group: GROUP,
  section: "API",
  title: "API overview",
  description:
    "The PesaGuard operations API: base path, authentication, the response envelope, pagination and the status codes you should handle.",
  status: "Live",
  lede:
    "The operations API exposes the same data the dashboard runs on — transactions, discrepancies, providers, tenant configuration — so integrations never have to scrape a screen or read the database.",
  blocks: [
    B.h2("Base path and shape"),
    B.kv([
      ["Versioned base", "<code>/api/v1</code>. Resource routes live under it; <code>/health</code>, <code>/metrics</code> and the OpenAPI document stay unversioned because they are operational, not contractual."],
      ["Method", "REST-style JSON over HTTPS. No form encoding, no XML."],
      ["Auth", "<code>Authorization: Bearer &lt;token&gt;</code>, verified server-side on every request."],
      ["Envelope", "One success shape, one error shape, both carrying <code>request_id</code> and the authorized <code>tenant_id</code>."],
      ["Contract", "The deployment's own <code>/openapi.json</code> (OpenAPI 3.0.3) is authoritative. This site mirrors it at <a href=\"api-reference/openapi.json\">api-reference/openapi.json</a>."],
    ]),
    B.h2("Response envelopes"),
    B.p("Success responses wrap the payload and echo the identifiers you need for support and audit:"),
    B.code(
      '{\n  "status": "success",\n  "data": { "...": "..." },\n  "request_id": "8f1c…",\n  "tenant_id": "sacco-nairobi",\n  "meta": { "page": 1, "limit": 25, "total": 412, "total_pages": 17 }\n}',
      { lang: "json", label: "success envelope" }
    ),
    B.p("Failures return the same identifiers with a structured error object, plus a Daraja-compatible pair so provider callbacks behave unchanged:"),
    B.code(
      '{\n  "status": "error",\n  "error": {\n    "code": "VALIDATION_FAILED",\n    "message": "TransAmount must be greater than zero.",\n    "details": { "field": "TransAmount" }\n  },\n  "request_id": "8f1c…",\n  "tenant_id": "sacco-nairobi",\n  "ResultCode": 1,\n  "ResultDesc": "TransAmount must be greater than zero."\n}',
      { lang: "json", label: "error envelope" }
    ),
    B.note(
      "Quote the request id",
      "<code>request_id</code> is the correlation key: the same value appears in structured logs, traces and audit rows. Support questions move much faster when it is included in the report.",
      "tip"
    ),
    B.h2("Endpoint families"),
    B.endpoints([
      { method: "GET", path: "/health", summary: "Dependency-aware health report (database, Kafka, Redis, Daraja).", badge: "Live" },
      { method: "GET", path: "/metrics", summary: "Operational metrics payload for scraping and alerting.", badge: "Live" },
      { method: "GET", path: "/openapi.json", summary: "The deployment's own contract document.", badge: "Live" },
      { method: "GET", path: "/tenant/current", summary: "Tenant configuration for the authenticated tenant.", badge: "Live" },
      { method: "GET", path: "/discrepancies", summary: "List reconciliation exceptions with filters.", badge: "Live" },
      { method: "POST", path: "/discrepancies/{discrepancy_id}/resolve", summary: "Resolve one exception with a recorded reason.", badge: "Live" },
      { method: "POST", path: "/discrepancies/bulk-resolve", summary: "Resolve a batch; each item is audited individually.", badge: "Live" },
      { method: "GET", path: "/providers", summary: "List payment providers configured for the tenant.", badge: "Live" },
      { method: "POST", path: "/providers/{provider_id}/health", summary: "Record provider health for reconciliation gating.", badge: "Live" },
      { method: "POST", path: "/webhook/mpesa/confirmation", summary: "Daraja confirmation callback (provider-facing).", badge: "Live" },
      { method: "POST", path: "/webhook/mpesa/validation", summary: "Daraja validation callback (provider-facing).", badge: "Live" },
    ]),
    B.h2("Status codes you will actually see"),
    B.table(
      [["Code", "Code name", "Meaning and the correct reaction"]].concat(
        FACTS.errors.map(([code, name, meaning]) => [code, `<code>${name}</code>`, meaning])
      ),
      { caption: "Codes are part of the public contract. Message copy is not — match on the code, never on the prose." }
    ),
    B.h2("Where to go next"),
    B.cards([
      { href: "api/authentication.html", title: "Authentication", body: "Bearer tokens, scopes and what a rejected credential tells you.", go: "Read →" },
      { href: "api/errors.html", title: "Errors", body: "The envelope, the codes and the client behaviour each one implies.", go: "Read →" },
      { href: "api/idempotency.html", title: "Idempotency", body: "Why a retry is safe, and what a duplicate returns.", go: "Read →" },
      { href: "api/pagination.html", title: "Pagination", body: "Stable iteration over large result sets.", go: "Read →" },
    ]),
    tenantInvariant(),
    statusNote("Live"),
  ],
  related: [
    ["API reference", "api-reference/index.html", "The OpenAPI document, mirrored and explained."],
    ["Errors", "errors/index.html", "One page per error class."],
    ["Webhooks", "webhooks/index.html", "Events leaving the platform instead of data entering it."],
  ],
});

pages.push({
  file: "api/errors.html",
  group: GROUP,
  section: "API",
  title: "Errors",
  description:
    "How to handle API failures in code: the envelope, the classes, a reference retry implementation, and what not to do.",
  status: "Live",
  lede:
    "Every failure returns the same envelope, so error handling is one decision per class rather than one branch per endpoint. This page is the implementation view — see the Errors section for one page per class.",
  blocks: [
    B.h2("The three fields that matter"),
    B.table([
      ["Field", "Use it for", "Never use it for"],
      ["<code>error.code</code>", "Branching, alerting, retry classification.", "—"],
      ["<code>request_id</code>", "Correlation, support, log linking.", "—"],
      ["<code>error.message</code>", "Log text and operator hints.", "Branching: copy changes without notice."],
      ["<code>error.details</code>", "Pointing at the offending field or conflicting key.", "Parsing as a stable schema."],
    ]),
    B.h2("Classify, then act"),
    B.table([
      ["Class", "Codes", "Action"],
      ["Retryable", "<code>RATE_LIMITED</code>, <code>INTERNAL_ERROR</code>, gateway timeouts", "Exponential backoff with jitter, bounded attempts. Safe on write paths because writes are idempotent."],
      ["Terminal — fix the request", "<code>VALIDATION_FAILED</code>, <code>UNAUTHORIZED</code>, <code>FORBIDDEN</code>", "Change the payload or the credential. Retrying unchanged is waste."],
      ["Terminal — resolve", "<code>DUPLICATE_EVENT</code>", "Read the existing record and continue. This is a success in disguise."],
      ["Terminal — investigate", "<code>TRANSACTION_NOT_FOUND</code>", "Confirm the identifier belongs to your tenant before escalating."],
    ]),
    B.h2("A reference implementation"),
    B.p(
      "One wrapper, one classification table, one place that logs the request id. The exact class names are yours; the shape is what matters."
    ),
    B.code(
      'RETRYABLE_STATUS = {429, 500, 502, 503, 504}\nMAX_ATTEMPTS = 5\n\nclass ApiError(Exception):\n    def __init__(self, status, body):\n        self.status = status\n        self.code = (body or {}).get("error", {}).get("code", f"HTTP_{status}")\n        self.request_id = (body or {}).get("request_id")\n        self.details = (body or {}).get("error", {}).get("details")\n        super().__init__(f"{self.code} ({self.request_id})")\n\n    @property\n    def retryable(self):\n        return self.status in RETRYABLE_STATUS or self.code == "RATE_LIMITED"\n\n\ndef request(session, method, path, **kwargs):\n    for attempt in range(MAX_ATTEMPTS):\n        try:\n            resp = session.request(method, path, timeout=15, **kwargs)\n        except (Timeout, ConnectionError) as exc:          # transport: retryable\n            if attempt == MAX_ATTEMPTS - 1:\n                raise\n            time.sleep(2 ** attempt + random.random())\n            continue\n\n        if resp.status_code < 400:\n            return resp.json()\n\n        error = ApiError(resp.status_code, resp.json() if resp.content else None)\n        log.warning("api error", extra={"code": error.code, "request_id": error.request_id})\n        if not error.retryable or attempt == MAX_ATTEMPTS - 1:\n            raise error\n        time.sleep(2 ** attempt + random.random())\n\n    raise RuntimeError("unreachable")',
      { lang: "python", label: "client_errors.py" }
    ),
    B.ul([
      "The request id is logged at the point of failure, not only where the exception is caught — otherwise the context is gone by the time anyone sees it.",
      "Only 429, 5xx and transport failures are retried. A 422 retried five times is five times the log volume and zero progress.",
      "Backoff includes jitter, so a hundred workers failing at once do not retry in lockstep.",
    ]),
    B.h2("What not to do"),
    B.ul([
      "<strong>Do not swallow and continue.</strong> A failed write reported as success downstream is how a ledger and a system of record diverge.",
      "<strong>Do not retry a 4xx unchanged.</strong> Nothing about the retry is different, so nothing about the outcome will be.",
      "<strong>Do not build a second credential to dodge a 429.</strong> Raise the limit with the operator instead.",
      "<strong>Do not log the whole request.</strong> The <code>Authorization</code> header and customer identifiers do not belong in a log file.",
    ]),
    B.h2("Error observability"),
    B.p(
      "If you run your own dashboard, track the error rate by code rather than by HTTP status: a rise in <code>DUPLICATE_EVENT</code> usually means a provider retry pattern changed, while a rise in <code>INTERNAL_ERROR</code> means the deployment needs attention. PesaGuard exports <code>pesaguard_runtime_errors_total</code> and <code>pesaguard_runtime_timeouts_total</code> for the server side."
    ),
    tenantInvariant(),
    statusNote("Live"),
  ],
  related: [
    ["Errors overview", "errors/index.html", "One page per failure class."],
    ["Error codes", "errors/error-codes.html", "The stable code list."],
    ["Retries and dead letters", "webhooks/retries.html", "The same backoff shape, on delivery."],
  ],
});

pages.push({
  file: "api/pagination.html",
  group: GROUP,
  section: "API",
  title: "Pagination",
  description: "Stable iteration over large result sets: page and limit, the meta object, and how to walk a list without missing or repeating rows.",
  status: "Live",
  lede:
    "List endpoints return pages with a <code>meta</code> object that describes the whole set. Walk it forwards from page one to <code>total_pages</code> and you will see every row exactly once — the contract's promise, not an implementation detail to lean on.",
  blocks: [
    B.h2("The shape"),
    B.code(
      '{\n  "status": "success",\n  "data": [ "...", "..." ],\n  "meta": { "page": 2, "limit": 25, "total": 412, "total_pages": 17 },\n  "request_id": "…",\n  "tenant_id": "sacco-nairobi"\n}',
      { lang: "json", label: "paginated response" }
    ),
    B.table([
      ["Field", "Means", "Rules"],
      ["<code>page</code>", "The page you are looking at, 1-based.", "Defaults sensibly; beyond <code>total_pages</code> returns an empty set, not an error."],
      ["<code>limit</code>", "Rows per page.", "Bounded server-side: requesting a million rows gets you the documented maximum instead."],
      ["<code>total</code>", "Rows in the filtered set.", "Computed for the tenant-scoped, filter-scoped query — not the whole table."],
      ["<code>total_pages</code>", "Pages available at this limit.", "The number to loop to, not a guess from row counts."],
    ]),
    B.h2("Walking a list correctly"),
    B.code(
      'page, limit = 1, 100\nseen = 0\nwhile True:\n    body = call(f"/discrepancies?page={page}&limit={limit}").json()\n    for item in body["data"]:\n        handle(item)\n        seen += 1\n    if page >= body["meta"]["total_pages"]:\n        break\n    page += 1\nassert seen == body["meta"]["total"]',
      { lang: "python", label: "iterate.py" }
    ),
    B.ul([
      "Iterate to <code>total_pages</code> rather than looping until a short page arrives: a boundary-alignment bug looks exactly like a short page.",
      "Keep the filters identical across pages. Changing a filter between page 2 and page 3 redefines the set you are walking.",
      "Do not treat the order as stable unless the endpoint documents ordering — see sorting for the deterministic variant.",
    ]),
    B.h2("Paginating writes and exports"),
    B.p(
      "Bulk reads belong to the export endpoints (<code>/discrepancies/export/csv</code> and the communications CSV export), which stream the set rather than paging it. Do not page a million-row export through the JSON list endpoint: it wastes the server, wastes your time, and produces a snapshot that is already stale."
    ),
    statusNote("Live"),
  ],
  related: [
    ["Filtering", "api/filtering.html", "Narrow the set before you page it."],
    ["Sorting", "api/sorting.html", "Make the row order deterministic."],
    ["Request validation", "api/request-validation.html", "What happens to an out-of-range page or limit."],
  ],
});

pages.push({
  file: "api/filtering.html",
  group: GROUP,
  section: "API",
  title: "Filtering",
  description: "Query parameters that narrow list endpoints: exact names come from the endpoint contract, and filters can never widen tenant scope.",
  status: "Live",
  lede:
    "Filters narrow a list to the rows you care about. They compose with pagination, they never widen your tenant scope, and their exact names are whatever the endpoint contract says — not whatever you guess.",
  blocks: [
    B.h2("How filters behave"),
    B.table([
      ["Behaviour", "Rule"],
      ["Tenant first", "Every filter runs inside the caller's tenant. No parameter can reach another tenant's rows."],
      ["Unknown parameters", "Per endpoint: ignored or rejected — read the spec rather than assuming, and treat a rejected parameter as information, not defiance."],
      ["Composition", "Filters AND together and compose with pagination: the <code>meta.total</code> you receive describes the filtered set."],
      ["Stability", "Filter names are part of the endpoint contract. A name that worked last month still works unless the changelog and the OpenAPI document say otherwise."],
    ]),
    B.h2("The filters you will use most"),
    B.table([
      ["Parameter", "On", "Meaning"],
      ["<code>status</code> / <code>resolved</code>", "Discrepancies and incidents", "Open versus resolved work."],
      ["<code>severity</code>", "Incidents", "<code>critical</code> versus <code>warning</code>: the triage axis."],
      ["<code>days</code>", "Reports and analytics", "The window the numbers describe."],
      ["<code>limit</code> / <code>page</code>", "Every list endpoint", "Paging; see pagination."],
    ], { caption: "Exact parameter names and their accepted values come from each endpoint's contract. This table names the concepts, not the spellings." }),
    B.h2("A worked example"),
    B.code(
      '# Critical, still open, first page of 25\ncurl -sS "$PESAGUARD_API_URL/discrepancies?severity=critical&resolved=open&page=1&limit=25" \\\n  -H "Authorization: Bearer $PESAGUARD_TOKEN" | jq \'.meta, (.data | length)\'',
      { method: "GET", label: "/discrepancies", lang: "bash" }
    ),
    B.p(
      "Check <code>.meta.total</code> after filtering: it tells you how much work the queue holds, which is the number to trend rather than the size of the page you fetched."
    ),
    B.note(
      "Never pass a tenant identifier as a filter",
      "Tenant identity is resolved from the verified credential, not from a query parameter. If you think you need <code>?tenant_id=…</code>, you have the wrong credential.",
      "warn"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Pagination", "api/pagination.html", "Walking the filtered set."],
    ["Sorting", "api/sorting.html", "Deterministic ordering."],
    ["Discrepancies guide", "guides/reconciliation/exceptions.html", "Filtering the exception queue in practice."],
  ],
});

pages.push({
  file: "api/idempotency.html",
  group: GROUP,
  section: "API",
  title: "Idempotency",
  description:
    "The interface contract for safe retries: same key, same logical event, one record — and a 409 that resolves to the original.",
  status: "Live",
  lede:
    "At the API level, idempotency is a contract about effects, not requests: delivering the same logical event twice must produce one record. The key is derived server-side, so callers participate by retrying deliberately rather than by manufacturing keys.",
  blocks: [
    B.h2("The contract"),
    B.table([
      ["Statement", "What it guarantees"],
      ["Same logical event, any number of deliveries", "Exactly one financial record."],
      ["Concurrent deliveries of the same event", "Exactly one record: the claim is a unique-constraint race the database settles, not a check-then-act the application can lose."],
      ["A duplicate after the fact", "<code>409 DUPLICATE_EVENT</code>; the original record is untouched and authoritative."],
      ["A replay from a dead letter", "The same key, the same record — replay is safe by construction."],
    ]),
    B.h2("What the client should do"),
    B.ol([
      "Retry transport failures and 429s with bounded backoff — server-side derivation makes repeats safe.",
      "On <code>409</code>, fetch the existing record by the identifier you sent and continue with it.",
      "Do not mutate a payload to escape a 409. If the payment is genuinely different it carries its own transaction id; if it does not, forcing a second write is exactly the failure the guard exists to prevent.",
      "Log conflicts at info level. A steady 409 rate is usually the sign of a healthy retry pattern, not an incident.",
    ]),
    B.h2("Where it is (and is not) a promise"),
    B.table([
      ["Path", "Promise"],
      ["M-Pesa callbacks", "Derived <code>transid:</code> or <code>hash:</code> key; unique constraint; 409 on conflict."],
      ["API writes", "Safe to retry: the effect is applied once."],
      ["Bulk resolution", "Each item is keyed so a double submission cannot resolve the same exception twice with different reasons."],
      ["Reads", "Naturally idempotent: no side effects, nothing to guard."],
    ]),
    B.p(
      "For the full derivation — normalisation of msisdn, amount and time, and the claim ordering that makes the guard race-safe — see <a href=\"concepts/idempotency.html\">Concepts · Idempotency</a>."
    ),
    statusNote("Live"),
  ],
  related: [
    ["Concepts · Idempotency", "concepts/idempotency.html", "The derivation and enforcement in full."],
    ["409 · Conflict", "errors/conflict.html", "Handling the duplicate response."],
    ["Retries and dead letters", "webhooks/retries.html", "Why duplicates are routine everywhere."],
  ],
});

pages.push({
  file: "api/sorting.html",
  group: GROUP,
  section: "API",
  title: "Sorting",
  description: "Where ordering is supported it is documented in the endpoint contract. Everything else is unstable — and this page explains how to cope.",
  status: "Draft",
  lede:
    "Unless an endpoint documents its ordering, treat the row order as unstable. The principle is live; the per-endpoint sort keys are still being settled into the OpenAPI document, so this page is marked draft and deliberately vague.",
  blocks: [
    B.h2("The rule"),
    B.table([
      ["Case", "Behaviour"],
      ["The endpoint documents a default order", "Trust it. It is part of the contract."],
      ["The endpoint accepts a sort parameter", "Use it for deterministic iteration — see the endpoint's contract for the accepted keys."],
      ["Neither is documented", "Assume unstable. Paginate for completeness, never for sequence."],
    ]),
    B.h2("Why unstable ordering exists"),
    B.p(
      "Rows arrive through concurrent workers, database plans change with data volume, and a replica answers read traffic with its own lag. Any of these can move a row between two identical queries. The service promises completeness (the set), not sequence (the order) — unless it says otherwise."
    ),
    B.h2("Patterns that survive"),
    B.ul([
      "Paginate to <code>total_pages</code> and collect, then sort in your own code on a field you trust.",
      "Use a stable cursor where one is offered rather than assuming page N+1 continues page N.",
      "Never poll \"the latest page\" for newness without a time filter: an unstable order means the boundary row can move.",
    ]),
    B.note(
      "Confirm before you code",
      "If your use case needs an ordering guarantee — a chronological export, a change feed, a report boundary — confirm the exact sort key against your deployment's OpenAPI document before building on it.",
      "warn"
    ),
    statusNote("Draft"),
  ],
  related: [
    ["Pagination", "api/pagination.html", "Walking the set completely."],
    ["Filtering", "api/filtering.html", "Narrowing the set."],
    ["Reconciliation reports", "guides/reconciliation/reconciliation-reports.html", "Ordering in reports."],
  ],
});

// __END__

module.exports = pages;
