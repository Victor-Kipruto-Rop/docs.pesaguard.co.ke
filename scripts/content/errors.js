/**
 * Errors — the envelope and one page per failure class.
 */
"use strict";

const { B } = require("../engine");
const { statusNote, FACTS, tenantInvariant } = require("./shared");
const { errorFamily } = require("./factories");

const GROUP = "errors";
const pages = [];

pages.push({
  file: "errors/index.html",
  group: GROUP,
  section: "Errors",
  title: "Errors",
  description:
    "One envelope for every failure, stable codes you can branch on, and the client behaviour each class implies.",
  status: "Live",
  lede:
    "Every failure — validation, authentication, rate limiting, a database outage — returns the same shape: a code, a human message, a request id, and the tenant the caller was authorized for. You never have to parse a stack trace to decide what to do.",
  blocks: [
    B.h2("The envelope"),
    B.code(
      '{\n  "status": "error",\n  "error": {\n    "code": "VALIDATION_FAILED",\n    "message": "TransAmount must be greater than zero.",\n    "details": { "field": "TransAmount" }\n  },\n  "request_id": "5f2a9c31-…",\n  "tenant_id": "sacco-nairobi",\n  "ResultCode": 1,\n  "ResultDesc": "TransAmount must be greater than zero."\n}',
      { lang: "json", label: "error envelope" }
    ),
    B.kv([
      ["<code>error.code</code>", "Stable and machine-readable. This is the field to branch on; it is part of the public contract."],
      ["<code>error.message</code>", "Written for a human reading a log at 02:00. Copy may change without notice — never match on it."],
      ["<code>error.details</code>", "Present when there is something specific to say: the offending field, the conflicting key, the limit that was hit."],
      ["<code>request_id</code>", "The correlation key. The same value appears in structured logs, traces and audit rows."],
      ["<code>tenant_id</code>", "The tenant the caller was authorized for. The response never echoes an unverified tenant."],
      ["<code>ResultCode</code> / <code>ResultDesc</code>", "Daraja-compatible pair so provider callbacks keep working with payloads that expect it."],
    ]),
    B.h2("One page per class"),
    B.cards([
      { href: "errors/authentication.html", title: "401 · Authentication", body: "No verified identity. Refresh or reissue the credential rather than retrying blindly.", go: "Read →" },
      { href: "errors/authorization.html", title: "403 · Authorization", body: "Verified, but the scope or tenant does not permit this action.", go: "Read →" },
      { href: "errors/validation.html", title: "400 / 422 · Validation", body: "The request failed validation and the response names the field.", go: "Read →" },
      { href: "errors/rate-limit.html", title: "429 · Rate limit", body: "Back off and retry; writes are idempotent, so a retry is safe.", go: "Read →" },
      { href: "errors/conflict.html", title: "409 · Conflict", body: "Usually a duplicate under idempotency — read the existing record instead.", go: "Read →" },
      { href: "errors/not-found.html", title: "404 · Not found", body: "No such resource inside the caller's tenant scope.", go: "Read →" },
      { href: "errors/server-errors.html", title: "5xx · Server errors", body: "Server or gateway failure: retry with backoff and quote the request id.", go: "Read →" },
      { href: "errors/error-codes.html", title: "Error codes", body: "The stable code list and the rules that govern how it evolves.", go: "Read →" },
    ]),
    B.h2("How to handle errors well"),
    B.ol([
      "Branch on <code>error.code</code>, and log <code>request_id</code> with the failing operation.",
      "Classify: retryable (429, 5xx, timeouts) versus terminal (400, 401, 403, 404, 409).",
      "Retry only retryable classes, with bounded backoff and jitter — and only where the operation is idempotent.",
      "Never swallow a failure and report success downstream: a false acknowledgement hides real money problems.",
      "When escalating, include the request id, the route, the timestamp, and the response body with secrets removed.",
    ]),
    B.table(
      [["Status", "Code", "Meaning"]].concat(FACTS.errors.map(([status, code, meaning]) => [status, `<code>${code}</code>`, meaning])),
      { caption: "Status codes are conventional; the code name is the contract." }
    ),
    tenantInvariant(),
    statusNote("Live"),
  ],
  related: [
    ["Error codes", "errors/error-codes.html", "The stable list, and how it grows."],
    ["API · Errors", "api/errors.html", "The envelope in the API reference."],
    ["Troubleshooting", "support/troubleshooting.html", "Symptom-first diagnosis."],
  ],
});

pages.push(errorFamily({
  file: "errors/error-codes.html",
  title: "Error codes",
  description: "The stable error code list, how it evolves, and how codes map onto HTTP status.",
  status: "Live",
  lede:
    "Status codes tell you how to transport a failure; error codes tell you what it was. The code list is a contract and only ever grows — a code is never reused for a different meaning.",
  intro:
    "Match on <code>error.code</code>. Message copy is written for humans and will change; codes are the part clients may depend on, and this page is their reference.",
  facts: [
    ["Where it appears", "<code>error.code</code> in every failure envelope, alongside the HTTP status."],
    ["Evolution", "Additive: new codes appear for new conditions, and existing codes keep their meaning."],
    ["Provider compatibility", "<code>ResultCode</code>/<code>ResultDesc</code> are set on provider-facing paths that expect the Daraja pair."],
    ["Uniqueness", "One condition, one code — never repurposed, because downstream logic branches on it."],
  ],
  causes: [
    ["Branching on the message text", "Works in one environment, breaks after a copy edit.", "Branch on the code, log the message."],
    ["Treating every non-2xx as retryable", "Duplicate attempts against terminal failures and noise in the logs.", "Classify: 400/401/403/404/409 are terminal for that request."],
    ["Raising on the body before reading the envelope", "The request id is lost and tracing takes hours.", "Keep the raw envelope for non-2xx responses."],
  ],
  client: [
    "Map <code>error.code</code> to a decision in exactly one place in your code.",
    "Retry only <code>RATE_LIMITED</code>, <code>INTERNAL_ERROR</code>, gateway errors and timeouts.",
    "Never retry <code>VALIDATION_FAILED</code>, <code>UNAUTHORIZED</code> or <code>FORBIDDEN</code> unchanged.",
    "On <code>DUPLICATE_EVENT</code>, fetch the existing record and continue: the original is authoritative.",
    "Attach <code>request_id</code> to your own logs so support can jump to the right trace.",
  ],
  retry: [
    ["Retryable", "<code>RATE_LIMITED</code>, <code>INTERNAL_ERROR</code>, gateway timeouts, connection failures."],
    ["Terminal for this request", "<code>VALIDATION_FAILED</code>, <code>UNAUTHORIZED</code>, <code>FORBIDDEN</code>, <code>TRANSACTION_NOT_FOUND</code>."],
    ["Not an error at all", "<code>DUPLICATE_EVENT</code> — confirmation that the work is already done."],
    ["Backoff", "Exponential with jitter and a cap. Retries are safe on write paths because writes are idempotent."],
  ],
  note: [
    "Codes in this list, not invented ones",
    "If a deployment returns a code you do not recognise, treat it as the nearest retryable or terminal class and report it — do not match on a prefix and guess.",
    "info",
  ],
  related: [
    ["Errors overview", "errors/index.html", "The envelope every code arrives in."],
    ["API · Errors", "api/errors.html", "Client behaviour per status class."],
    ["Troubleshooting", "support/troubleshooting.html", "Symptom-first diagnosis."],
  ],
}));

pages.push(errorFamily({
  file: "errors/authentication.html",
  title: "401 · Authentication",
  description: "The credential was missing, malformed, expired or revoked — and why retrying the same request will not help.",
  status: "Live",
  lede:
    "A 401 means the server has no verified identity for this request. There is no anonymous path and no degraded mode: the service answers nothing until a credential verifies.",
  intro:
    "Authentication failures are terminal for the request as sent. Fix the credential; do not loop. A retry storm against a revoked token hides the real problem in noise.",
  facts: [
    ["HTTP status", "<code>401</code>"],
    ["Code", "<code>UNAUTHORIZED</code>"],
    ["Retryable", "No — identical until the credential changes."],
    ["Recorded", "Yes: recorded as a security event with the request id."],
  ],
  causes: [
    ["No <code>Authorization</code> header", "The request carries no credentials at all.", "Send <code>Authorization: Bearer &lt;token&gt;</code>."],
    ["Malformed header", "Missing scheme, or whitespace from a copy-paste.", "Build the header from configuration, not by hand."],
    ["Expired token", "Structurally valid, past its expiry.", "Obtain a fresh token from the documented token route."],
    ["Revoked token", "Revoked directly, or its session was closed.", "Issue a new credential; check for a half-finished rotation."],
    ["Wrong issuer or audience", "Minted for another environment or service.", "Point the client at the right environment and compare <code>iss</code> and <code>aud</code>."],
  ],
  client: [
    "Stop — do not retry.",
    "Confirm the header exists and is well formed before blaming the server.",
    "Refresh the credential, or ask the operator to reissue it.",
    "Log the route and timestamp; never log the credential, not even a prefix.",
  ],
  server: [
    "Signature, expiry, issuer and audience are validated on every request.",
    "Revocation is checked, so a leaked credential closes immediately rather than at expiry.",
    "Responses disclose nothing about which check failed, so the endpoint cannot enumerate credentials.",
  ],
  retry: [
    ["Retry as-is?", "No. Terminal for this request."],
    ["After refreshing?", "Yes — one attempt with the new credential is reasonable."],
    ["Still failing?", "Check client clock skew, then contact the operator with the request id."],
  ],
  note: ["Never log the credential", "Not the header, not the token, not a prefix. A partially logged token is still a leak, and a leaked secret must be rotated.", "danger"],
  related: [
    ["Authentication guide", "api/authentication.html", "How the credential model works."],
    ["403 · Authorization", "errors/authorization.html", "Verified, but not permitted."],
    ["API key security", "security/api-key-security.html", "Storage, scoping and rotation."],
  ],
}));

pages.push(errorFamily({
  file: "errors/authorization.html",
  title: "403 · Authorization",
  description: "The credential verified, but its scopes or tenant do not permit this action.",
  status: "Live",
  lede:
    "403 is the honest refusal: the caller is who it claims to be, and still may not do this. It is a configuration answer, not a bug — the fix is the narrowest additional scope, never a wider credential.",
  intro:
    "Authorization composes identity, scope, tenant, resource ownership and the requested action. A 403 says one of those five did not hold; the operator can read which from the audit record.",
  facts: [
    ["HTTP status", "<code>403</code>"],
    ["Code", "<code>FORBIDDEN</code>"],
    ["Retryable", "No."],
    ["Distinct from 404", "A resource in another tenant returns <strong>404</strong>, not 403 — the API never confirms that an identifier exists elsewhere."],
  ],
  causes: [
    ["Missing scope", "The credential is valid for other routes only.", "Request the narrowest scope that covers the call."],
    ["Wrong tenant", "The credential is bound to a different tenant than the data.", "Use the credential issued for this tenant; tenants are never switched by a request header."],
    ["Read-only credential on a write route", "Scoped <code>*:read</code> but calling a mutating endpoint.", "Issue a separate credential with the write scope."],
    ["Role lacks the permission", "A dashboard user whose role excludes the action.", "Change the role through user management; the change is audited."],
  ],
  client: [
    "Read the scope the endpoint needs, and request just that.",
    "Do not retry: an unchanged request is refused identically.",
    "Do not widen an existing credential — split credentials per integration instead.",
    "Surface the failure rather than degrading silently to partial data.",
  ],
  server: [
    "Scopes are checked per route, not per session, so a broad login does not imply broad access.",
    "Role and permission changes are themselves audit events.",
    "Resource ownership is verified with a tenant predicate, so an identifier alone never grants access.",
  ],
  retry: [
    ["Retryable?", "No."],
    ["After a scope change?", "Yes — the change takes effect without waiting for token expiry."],
    ["Proof of who changed what?", "Read the audit entries for the credential or user."],
  ],
  note: ["Least privilege, not fastest path", "The temptation is to issue an admin credential to unblock an integration. That trade converts one narrow build problem into a permanent, unauditable blast radius.", "warn"],
  related: [
    ["Authorization", "security/authorization.html", "The permission model."],
    ["401 · Authentication", "errors/authentication.html", "When there is no verified identity at all."],
    ["Audit trails", "concepts/audit-trails.html", "Who did what, and when."],
  ],
}));

pages.push(errorFamily({
  file: "errors/validation.html",
  title: "400 / 422 · Validation",
  description: "The request failed validation and the response names the offending field. Fix the payload; do not retry it unchanged.",
  status: "Live",
  lede:
    "Validation runs before anything is trusted — before matching, before persistence, before any decision. A rejected payload never reaches reconciliation, so the response can afford to be specific about what was wrong.",
  intro:
    "400 means the body could not be parsed as the documented shape; 422 means it parsed but broke a business rule. Both are terminal for that request and both name the field when a single field is at fault.",
  facts: [
    ["Statuses", "<code>400</code> malformed, <code>422</code> rule violated"],
    ["Code", "<code>VALIDATION_FAILED</code>"],
    ["Retryable", "No — the same payload fails identically."],
    ["Side effects", "None: nothing is written and nothing is matched."],
  ],
  causes: [
    ["Amount zero, negative or unparseable", "<code>TransAmount</code> is not a positive decimal.", "Send a positive amount; values are quantised to two decimal places."],
    ["Reference missing", "No reference, or one that trims to empty.", "Send the reference your internal record uses — it is a matching key."],
    ["Malformed JSON", "Trailing comma, single quotes, or a form-encoded body.", "Send <code>Content-Type: application/json</code> with valid JSON."],
    ["Unknown field or enum", "A typo in a field name, or a value outside the documented set.", "Read the field from <code>error.details</code> and correct it."],
  ],
  client: [
    "Read <code>error.details</code> rather than diffing your payload against the documentation by hand.",
    "Fix and send once; retrying unchanged wastes budget and pollutes the logs.",
    "Validate before sending: a client that rejects its own bad amount never has to handle this.",
  ],
  server: [
    "Validation sits in front of matching, so malformed data can never become a plausible-looking match.",
    "Invalid records are rejected or quarantined with a reason — never silently converted into successes.",
    "A non-positive amount is rejected rather than defaulted to zero.",
  ],
  retry: [
    ["Retry unchanged?", "No."],
    ["Retry after fixing?", "Yes — that is a new request."],
    ["Batch with one bad item?", "Expect whole-batch rejection unless the endpoint documents per-item results."],
  ],
  note: ["Why validation precedes matching", "If malformed payloads reached reconciliation they could match a real record by coincidence — and a coincidence in a ledger is indistinguishable from fraud months later.", "info"],
  related: [
    ["Request validation", "api/request-validation.html", "What is validated, in what order."],
    ["409 · Conflict", "errors/conflict.html", "Valid payload, already processed."],
    ["Reconciliation", "concepts/reconciliation.html", "What happens after validation."],
  ],
}));

pages.push(errorFamily({
  file: "errors/rate-limit.html",
  title: "429 · Rate limit",
  description: "Too many requests. Back off and retry — writes are idempotent, so a retry cannot duplicate money.",
  status: "Live",
  lede:
    "Rate limits protect durability: a flood of writes must never be served at the cost of reconciliation correctness, so the service pushes back instead of degrading the guarantees that matter.",
  intro:
    "A 429 is a scheduling instruction, not a failure. The work is still valid; it needs to arrive later — and because writes are idempotent, a delayed retry is safe.",
  facts: [
    ["Status", "<code>429</code>"],
    ["Code", "<code>RATE_LIMITED</code>"],
    ["Retryable", "Yes, with backoff."],
    ["Scope", "Per credential and route. Limits are deployment configuration, not documented constants."],
  ],
  causes: [
    ["Batch job burst", "A loop firing requests as fast as it can iterate.", "Throttle concurrency; think in requests per second, not per loop."],
    ["Many workers, one credential", "Ten processes sharing a token exceed the aggregate limit.", "One credential per logical integration, with coordinated concurrency."],
    ["Retry storm", "A client retrying failures with no backoff.", "Exponential backoff with jitter and a hard attempt cap."],
    ["Polling where a webhook exists", "A tight poll loop for state you could be told about.", "Subscribe to the relevant webhook event instead."],
  ],
  client: [
    "Back off exponentially with jitter rather than retrying on a fixed interval.",
    "Cap attempts, then surface the failure to an operator instead of looping forever.",
    "Keep the request id from the 429; if the retry fails too, that is the id to quote.",
    "Do not switch credentials to bypass the limit — ask for the limit you actually need.",
  ],
  server: [
    "Limits are enforced per credential and route, backed by Redis so they hold across processes.",
    "The response uses the standard envelope, so client handling is identical to every other error.",
    "Provider callbacks are not throttled by the client-facing limit, so ingestion realism is preserved.",
  ],
  retry: [
    ["Backoff shape", "Exponential with jitter, capped — the same shape used for webhook delivery."],
    ["How many attempts?", "Enough to ride out a burst. If the limit persists, your request rate is the problem."],
    ["Safe to repeat a write?", "Yes — idempotency keys are derived server-side, so a duplicate resolves to the original record."],
  ],
  note: ["Numbers are configuration, not contract", "Limits are set per deployment and tenant. Publishing a number here would create a page that drifts from reality, so ask the operator for the values that apply to you.", "warn"],
  related: [
    ["Rate limits (API)", "api/rate-limits.html", "The design principle."],
    ["Errors overview", "errors/index.html", "The envelope every 429 uses."],
    ["Idempotency", "concepts/idempotency.html", "Why a retry is safe."],
  ],
}));

pages.push(errorFamily({
  file: "errors/conflict.html",
  title: "409 · Conflict",
  description: "Usually a duplicate under idempotency. Read the existing record instead of re-sending — the original is authoritative.",
  status: "Live",
  lede:
    "A 409 on a write path is the idempotency guard doing its job: the event was already accepted, so the caller has a record to read rather than a second record to create.",
  intro:
    "Provider retries, consumer retries and manual replays are all routine, so duplicates are expected events rather than exceptional ones. The guard exists so a duplicate cannot become a second financial effect.",
  facts: [
    ["Status", "<code>409</code>"],
    ["Code", "<code>DUPLICATE_EVENT</code>"],
    ["Retryable", "Not as a retry — this is a resolution step."],
    ["Key derivation", "<code>transid:&lt;TRANSID&gt;</code>, else <code>hash:sha256(msisdn|amount|transtime)</code>"],
  ],
  causes: [
    ["Daraja re-delivered a callback", "The same <code>TransID</code> arrives twice — normal provider behaviour.", "Acknowledge and continue: the payment is already recorded."],
    ["Your retry after a timeout", "The first request succeeded and the response was lost.", "Treat the 409 as success-with-existing-record, then read the record."],
    ["Manual replay of a dead letter", "An operator replayed work that had already succeeded.", "Confirm the intended outcome before replaying; the guard prevents harm, not confusion."],
    ["Same payment, different reference", "No transaction id, so the fallback hash collides on amount, phone and time.", "Inspect both records; a genuine second payment carries its own transaction id."],
  ],
  client: [
    "Do not retry the same call — it will conflict again.",
    "Fetch the existing record by the identifier you sent, then continue with it.",
    "Record conflicts as an expected outcome, not as errors in your dashboards, so a healthy retry is not an incident.",
    "If the duplicate is genuinely a new payment, escalate with both transaction ids rather than forcing a second write.",
  ],
  server: [
    "The key is derived server-side from the payload, so a client cannot opt out of the guard.",
    "The idempotency record and the financial record are written in one transaction, leaving no window between them.",
    "A conflict never mutates the original row: the existing record stays authoritative.",
  ],
  retry: [
    ["Retry the write?", "No."],
    ["Read the existing record?", "Yes — that is the resolution."],
    ["Replay a dead letter?", "Safe, and it conflicts identically if the work already landed."],
  ],
  note: ["A 409 is often good news", "On a callback path it usually means the guard caught a provider retry that would otherwise have created phantom double-credit. Log it at info level, not as a failure.", "tip"],
  related: [
    ["Idempotency concept", "concepts/idempotency.html", "How the key is derived."],
    ["Idempotency (API)", "api/idempotency.html", "The interface contract."],
    ["Retries and dead letters", "webhooks/retries.html", "Why duplicates are routine."],
  ],
}));

pages.push(errorFamily({
  file: "errors/not-found.html",
  title: "404 · Not found",
  description: "No such resource inside the caller's tenant scope. Cross-tenant identifiers return 404, never 403.",
  status: "Live",
  lede:
    "A 404 means the resource does not exist for this caller. It is also the answer for a resource that exists in another tenant — deliberately, so the API cannot be used to discover identifiers.",
  intro:
    "Detail lookups carry the tenant predicate as well as the identifier. That one rule removes the most common cross-tenant leak: an identifier that is unique but not accessible.",
  facts: [
    ["Status", "<code>404</code>"],
    ["Code", "<code>TRANSACTION_NOT_FOUND</code> and resource-specific equivalents"],
    ["Retryable", "No."],
    ["Cross-tenant", "Returns 404 rather than 403, so existence is never confirmed."],
  ],
  causes: [
    ["Identifier from another tenant", "Valid id, different tenant.", "Use identifiers issued within your own tenant; never synthesise them."],
    ["Typo or truncated id", "A copy-paste that lost trailing characters.", "Read ids from the list endpoint rather than retyping them."],
    ["Deleted or archived", "Retention or archival removed the row from the live set.", "Reach archived data through export, not detail routes."],
    ["Wrong version prefix", "The path belongs to a different API version.", "Confirm the path against your deployment's OpenAPI document."],
  ],
  client: [
    "Do not retry.",
    "Confirm the identifier came from a list response for the same tenant.",
    "If it should exist, escalate with the request id rather than probing neighbouring identifiers.",
  ],
  server: [
    "Every detail lookup includes the tenant predicate, so an id alone is never sufficient.",
    "The response is identical to a genuinely missing resource, so status codes leak nothing.",
    "Lookups are logged with the request id, which is what makes the investigation possible.",
  ],
  retry: [
    ["Retryable?", "No."],
    ["Retry after the resource is created?", "Yes — but with the identifier the service actually issued."],
    ["Cross-tenant by design?", "No: tenants never share identifiers, and the API never confirms another tenant's data."],
  ],
  note: ["404 over 403 is a security decision", "Returning 403 for another tenant's identifier would confirm that it exists. The uniform 404 removes that signal entirely.", "info"],
  related: [
    ["Tenant isolation", "security/tenant-isolation.html", "How the boundary is enforced."],
    ["Tenants", "concepts/tenants.html", "Why identifiers are never global."],
    ["403 · Authorization", "errors/authorization.html", "When the refusal is about permission."],
  ],
}));

pages.push(errorFamily({
  file: "errors/server-errors.html",
  title: "5xx · Server errors",
  description: "The server or a gateway failed. Retry with backoff, and never assume a failure means the write did not happen.",
  status: "Live",
  lede:
    "A 5xx means the request could not be completed — not that it had no effect. On a write path the honest assumption is that the outcome is unknown until you read the record back.",
  intro:
    "This is the class where clients cause the most damage: retrying blindly is safe here (writes are idempotent) but assuming \"500 means nothing happened\" is not.",
  facts: [
    ["Common statuses", "<code>500</code> unhandled, <code>502</code> / <code>504</code> gateway, <code>503</code> unavailable"],
    ["Code", "Usually <code>INTERNAL_ERROR</code>"],
    ["Retryable", "Yes, with bounded backoff — transient by assumption."],
    ["Body", "Never a stack trace, a query or an internal path. Just the envelope."],
  ],
  causes: [
    ["Unhandled exception", "A defect on the path; logged with the request id and reported.", "Retry a few times, then escalate with the request id."],
    ["Database failover or pool exhaustion", "Connections unavailable during failover or saturation.", "Back off; check pool metrics before assuming it cleared."],
    ["Broker or worker outage", "Kafka or the RQ worker is down.", "Reads may succeed while writes queue in the outbox — check health first."],
    ["Upstream timeout", "A dependency such as Daraja did not answer in time.", "Back off; immediate retries can deepen an upstream incident."],
  ],
  client: [
    "Retry with exponential backoff, jitter and a cap — never in a tight loop.",
    "On a write, read the record back after the retry before deciding what happened.",
    "Capture the request id; it is the only efficient path to the server logs.",
    "Alert on a sustained 5xx rate, not on a single failure — one 503 during a deploy is expected.",
  ],
  server: [
    "Errors are logged with the request id, route and correlation context — never with secrets or customer payloads.",
    "Client-facing bodies stay generic so internal detail never leaves the deployment.",
    "Health endpoints expose which dependency is degraded so acting beats guessing.",
  ],
  retry: [
    ["Retryable?", "Yes — treat 5xx and timeouts as transient by assumption."],
    ["How many attempts?", "A handful with backoff, then escalate. Still failing means an incident, not a blip."],
    ["Was my write applied?", "Read it back. The retry is idempotent, but only the read tells the truth."],
  ],
  note: ["Never assume a 500 means nothing happened", "The failure may have happened after the commit and before the response. Read the record: that is the only way to know.", "danger"],
  related: [
    ["Status", "status/index.html", "How incidents are surfaced."],
    ["Errors overview", "errors/index.html", "The envelope every 5xx uses."],
    ["High error rate runbook", "support/troubleshooting.html", "Where to look when 5xx climbs."],
  ],
}));

// __END__

module.exports = pages;
