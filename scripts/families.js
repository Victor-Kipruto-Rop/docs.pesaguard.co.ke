/**
 * Leaf-page families for the docs tree.
 *
 * Repetitive pages (error classes, SDK languages, security layers, guide
 * subtrees) are declared as data here rather than hand-written, so every entry
 * carries a real status label and grounded description. `scripts/generate-pages.js`
 * renders these with the same chrome as the hand-written pages.
 *
 * Status labels: Live = verified against shipped behaviour; Draft = designed
 * contract, confirm against the deployment's OpenAPI document; Planned = no
 * implementation today.
 */

const crumb = (...parts) =>
  parts
    .filter(Boolean)
    .map(([label, href]) =>
      href ? `<a href="${href}">${label}</a><span aria-hidden="true">/</span>` : `<span>${label}</span>`
    )
    .join("\n          ");

const noteBlock = (status) => ({
  note: [
    "Status",
    status === "Planned"
      ? "This capability has no implementation today, and this page says so rather than implying otherwise."
      : status === "Draft"
        ? "This page documents a designed contract. Confirm the exact fields against your deployment's /openapi.json before coding against it."
        : "Verified against the shipped behaviour recorded in the repository documentation.",
  ],
  noteTone: status === "Live" ? "info" : "warn",
});

function page(file, section, title, lede, status, blocks, related) {
  return {
    file,
    path: "/" + file.replace(/index\.html$/, ""),
    section,
    title,
    lede,
    description: lede,
    status,
    sidebar: null,
    crumbs: null,
    blocks: [...(blocks || []), noteBlock(status)],
    related: related || [["Documentation home", "index.html"]],
  };
}

const API_MORE = [
  ["api/reference.html", "Reference", "The authoritative contract is the deployment's own /openapi.json; this site mirrors it.", "Live", [
    { code: { method: "GET", label: "/openapi.json", lang: "bash", text: 'curl -sS "$PESAGUARD_API_URL/openapi.json" -o openapi.json' } },
    { ul: ["Dashboard spec: OpenAPI 3.0.3, version 2.0.0.", "Public routes sit under /api/v1.", "Every error shares one envelope carrying a request id."] },
  ], [["OpenAPI document", "api-reference/openapi.json"], ["API overview", "api/index.html"]]],
  ["api/filtering.html", "Filtering", "Query parameters narrow list endpoints; exact names come from the endpoint contract.", "Live", [
    { ul: ["Filters are scoped to the caller's tenant and cannot widen it.", "Unknown parameters are ignored or rejected per endpoint: read the spec, do not assume.", "Tenant identifiers are never trusted from the client."] },
  ], [["Pagination", "api/pagination.html"], ["Sorting", "api/sorting.html"]]],
  ["api/sorting.html", "Sorting", "Where an endpoint supports ordering it is documented in its OpenAPI entry.", "Draft", [
    { p: "Treat unspecified ordering as unstable. Paginate deterministically and do not rely on insertion order surviving a filter change." },
  ], [["Pagination", "api/pagination.html"], ["Filtering", "api/filtering.html"]]],
  ["api/request-validation.html", "Request validation", "Schema, currency, amount and reference are validated before anything is trusted.", "Live", [
    { ul: ["Malformed input returns 400 or 422 with the offending field named.", "Validation runs before matching, so bad data never reaches reconciliation.", "Invalid records are never silently converted into plausible successes."] },
  ], [["Data quality concept", "concepts/reconciliation.html"], ["Errors", "api/errors.html"]]],
];

const SDK_LANGS = [
  ["sdks/curl.html", "curl", "Every example on this site runs with curl against your deployment."],
  ["sdks/python.html", "Python", "Use requests or a client generated from the OpenAPI document; no official Python SDK yet."],
  ["sdks/javascript.html", "JavaScript", "Use fetch or a generated client; no official JavaScript SDK yet."],
  ["sdks/typescript.html", "TypeScript", "Generate typed models from the OpenAPI document for compile-time safety."],
  ["sdks/java.html", "Java", "Generate a Java client from the OpenAPI document; no official SDK yet."],
];

const WEBHOOK_EVENTS = [
  ["webhooks/transaction-created.html", "transaction.created", "A payment event was accepted and validated, and is now a PesaGuard record."],
  ["webhooks/transaction-matched.html", "transaction.matched", "A deterministic pairing succeeded and the evidence is retained with the record."],
  ["webhooks/transaction-unmatched.html", "transaction.unmatched", "No internal candidate was found, so the payment queues with the reason attached."],
  ["webhooks/anomaly-detected.html", "anomaly.detected", "A named rule or statistical check flagged the transaction for human review."],
  ["webhooks/reconciliation-completed.html", "reconciliation.completed", "A reconciliation run finished, with its match and exception counts."],
];

const ERROR_CLASSES = [
  ["errors/authentication.html", "401 · Authentication", "The caller was not authenticated. Refresh or reissue the credential."],
  ["errors/authorization.html", "403 · Authorization", "Authenticated, but the scope or tenant does not permit this action."],
  ["errors/validation.html", "400 / 422 · Validation", "The request failed validation; the response names the offending field."],
  ["errors/rate-limit.html", "429 · Rate limit", "Too many requests. Back off and retry: writes are idempotent, so a retry is safe."],
  ["errors/conflict.html", "409 · Conflict", "Usually a duplicate under idempotency. Read the existing record instead of re-sending."],
  ["errors/not-found.html", "404 · Not found", "No such resource within the caller's tenant scope."],
  ["errors/server-errors.html", "5xx · Server errors", "Server or gateway failure. Retry with backoff and quote the request id to the operator."],
  ["errors/error-codes.html", "Error codes", "Stable codes are part of the public contract; message copy is not. Match on codes, never on prose."],
];

const SECURITY_LAYERS = [
  ["security/authentication.html", "Authentication", "Short-lived JWT bearer tokens and tenant-bound API keys protect configured routes; provider callback authentication is integration-specific."],
  ["security/authorization.html", "Authorization", "Server-side route, tenant, and resource checks constrain the actions available to each principal."],
  ["security/api-key-security.html", "API key security", "Tenant-bound keys are checked by digest and constrained by active state, optional expiry, role grants, and explicit scopes."],
  ["security/webhook-security.html", "Webhook security", "Outbound HMAC signatures and destination checks differ from the provider-specific verification required for inbound callbacks."],
  ["security/encryption.html", "Encryption", "Application-level encryption protects selected provider configuration and sensitive payload values; infrastructure encryption is deployment-specific."],
  ["security/data-protection.html", "Data protection", "Redaction and field protection are path-specific; a versioned retention policy requires operational approval and enforcement."],
];

const SECURITY_DETAILS = {
  "security/authentication.html": [
    { h2: "JWT bearer tokens" },
    { p: "Protected routes accept <code>Authorization: Bearer &lt;token&gt;</code>. Verification pins the algorithm and checks the signature, issuer, audience, time claims, required identity and tenant claims, token type, authorization version, scope, and token ID. The token ID is checked against revocation state; user sessions and machine identities are also checked against current persisted state." },
    { p: "Access-token lifetime is configurable from 1 to 15 minutes and defaults to 15. Signing-key IDs support a controlled key-ring rotation. Refresh tokens are persisted and rotated; reuse of an old refresh token revokes its token family." },
    { h2: "API keys and provider callbacks" },
    { p: "Where supported, API keys arrive in <code>X-API-Key</code> and are tenant-bound. The verifier looks up a SHA-256 digest, checks active/revoked/optional-expiry state, and intersects the key's scopes with the role's permissions. Provider callbacks use provider-specific checks; Daraja source validation fails closed when neither shared-secret nor IP/CIDR restrictions are configured." },
    { h2: "Configuration and failure behavior" },
    { ul: ["Set a unique production <code>JWT_SECRET_KEY</code> of at least 32 bytes and protect it with managed secret storage.", "Keep <code>PESAGUARD_ALLOW_INSECURE_DEV_SECRET</code> disabled in production; configure key-ring variables consistently when rotating.", "Missing, invalid, expired, or revoked credentials are rejected. If current authentication state cannot be checked, the protected operation fails unavailable rather than treating the caller as authenticated.", "Send credentials only over HTTPS and never in URLs, source control, client-side bundles, screenshots, or logs."] },
    { p: "Backend evidence: <code>auth_rbac.py</code> and <code>tests/test_auth_lifecycle.py</code>. Route-level exposure is determined by each route and deployment configuration; health and documentation routes may have intentional exceptions." },
  ],
  "security/authorization.html": [
    { h2: "Server-side authorization model" },
    { p: "Authentication establishes the principal; authorization evaluates the requested action against its role, permissions, tenant, and sometimes a specific resource. The backend provides guards for named permissions, tenant access, and resource-level permissions. Hiding a button or navigation item in a client is not an access-control check." },
    { h2: "Roles and scopes" },
    { p: "Role grants are defined in the backend policy map and can evolve. Roles include owner, admin, finance, operations, analyst, and read-only variants; the actual permission list, not the role label, determines access. For example, <code>manage:all_tenants</code> is granted to the owner role and is not a general administrator default. Machine-key permissions are constrained by both role grants and explicit key scopes." },
    { h2: "Operational review" },
    { ol: ["Identify the principal, tenant, and exact actions required.", "Grant the narrowest role and machine scopes; keep cross-tenant privileges exceptional and approved.", "Use individual credentials for people and separate credentials for integrations.", "Re-review grants after role changes, integration replacement, and incidents; revoke obsolete access promptly.", "Test allowed and denied behavior for every protected route and confirm authorization-state failures fail closed."] },
    { p: "Relevant failures distinguish unauthenticated requests (401), authenticated but denied requests (403), and decisions that cannot be made because required authorization state is unavailable (503). The repository's <code>tests/test_rbac_enforcement.py</code> includes a denied privileged-route case; it does not establish coverage for every role-route combination." },
  ],
  "security/api-key-security.html": [
    { h2: "Verification and effective permissions" },
    { ol: ["Send the key in <code>X-API-Key</code> over HTTPS; never use a query string.", "The verifier expects the <code>pk_</code> prefix, hashes the presented key with SHA-256, and finds the matching tenant-bound record by digest.", "The record must be active, not revoked, and not past its optional expiry. Expiry is nullable, so operators should set an expiry policy explicitly.", "Effective permissions are the intersection of role grants and the record's explicit scopes; successful verification updates last-used time.", "The resulting principal uses the tenant recorded for the key, not a tenant ID supplied by the client."] },
    { h2: "Issuance, storage, and rotation" },
    { ul: ["Create separate keys for each integration, environment, and purpose.", "Grant only required scopes; use read-only access when writes are unnecessary.", "Store keys in a managed secret store, restrict workload and operator access, and keep them out of source, logs, tickets, screenshots, and browser code.", "Track owner, tenant, purpose, scopes, approver, expiry, and rotation date in a credential inventory.", "For rotation, provision a replacement, deploy it, verify usage, and revoke the old key; if exposure is suspected, revoke first and investigate recent use."] },
    { p: "Backend evidence includes <code>ApiKeyRecord</code>, the tenant-key hardening migration, and verification in <code>auth_rbac.py</code>. The model supports active/revoked state, optional expiry, and a rotation predecessor reference; exact issuance routes and overlap behavior depend on the deployed API version." },
  ],
  "security/webhook-security.html": [
    { h2: "Outbound webhook controls" },
    { p: "Registration requires HTTPS and rejects hosts that resolve to private, loopback, link-local, reserved, multicast, unspecified, or selected metadata destinations. The destination is checked again before delivery, and HTTP redirects are not followed. Network egress restrictions should supplement this application-level check." },
    { p: "The sender computes HMAC-SHA-256 over the timestamp, a dot, and canonical JSON with sorted keys and compact separators. The header format is <code>t=&lt;unix-seconds&gt;,v1=&lt;hex-digest&gt;</code>. Defaults are a 10-second timeout and three attempts; configured retries and timeouts are capped, and retries use backoff." },
    { h2: "Receiver verification" },
    { ol: ["Parse the event and reproduce the sender's canonical JSON serialization.", "Compute HMAC-SHA-256 with the endpoint's signing secret over <code>timestamp + \".\" + canonical_json</code>.", "Compare the digest in constant time, enforce a timestamp window, and deduplicate event IDs.", "Validate schema and apply business effects only after successful verification; make processing idempotent."] },
    { p: "Do not apply this outbound format to inbound providers. Communications callbacks authenticate the raw body and validate timestamps when supplied; Daraja callbacks use configured shared-secret and/or IP/CIDR source restrictions and reject if no restriction is configured." },
    { p: "Implementation evidence: <code>webhook_manager.py</code>, <code>communications/webhooks.py</code>, and <code>security_helpers.py</code>. These are distinct flows with different signature formats." },
  ],
  "security/encryption.html": [
    { h2: "Application-level protection" },
    { p: "Provider configuration uses Fernet authenticated encryption and an <code>enc:v1:</code> storage prefix. Payload protection encrypts selected sensitive JSON leaves, including configured phone, account, customer-name, national-ID, and authorization-code fields. Identifier tokenization uses a keyed HMAC-SHA-256 digest for equality lookup." },
    { h2: "Key management and rotation" },
    { ul: ["Production provider configuration requires <code>PROVIDER_ENCRYPTION_KEY</code>; payload protection accepts an active key and an optional previous key during rotation.", "Keep encryption keys in managed secret storage, limit workload access, and do not reuse JWT signing keys for unrelated encryption purposes.", "Deploy new and previous keys together, re-encrypt existing values, verify reads with the new key, then remove the previous key.", "Ciphertext cannot be recovered if all corresponding keys are lost; test backup restoration and key recovery under controlled procedures."] },
    { h2: "Transport and infrastructure boundary" },
    { p: "Use HTTPS for API and operator traffic. The dashboard API adds HSTS when it recognizes the request as HTTPS; verify TLS termination and the external response headers at the public endpoint. Database, disk, object-store, queue, and backup encryption are infrastructure controls and are not established by the application helpers alone." },
    { p: "Evidence is in <code>provider_management_service.py</code>, <code>data_protection.py</code>, and the rotation operation. This page does not claim universal at-rest encryption, customer-managed keys, an HSM, or a centralized vault integration." },
  ],
  "security/data-protection.html": [
    { h2: "Declared retention policy" },
    { p: "The backend's versioned <code>retention_policy.json</code> is marked as requiring approval. It declares 2,555 days for transactions, audit data, and raw provider data; 90 days for application logs; 730 days for security logs; 1,825 days for analytics; and 365 days for user data. These values do not prove that every live storage system enforces deletion on schedule." },
    { h2: "Redaction and minimization" },
    { p: "Audit details are bounded and sanitized for recognized secret keys and values; provider serialization masks credential-like fields; payload protection encrypts a defined set of sensitive fields. These controls apply to particular code paths and do not guarantee that every log, export, or downstream copy is automatically redacted." },
    { h2: "Operator verification" },
    { ol: ["Obtain policy approval and map categories to each database, object store, log sink, queue, export, and backup.", "Verify lifecycle and cleanup jobs are scheduled, observable, tenant-scoped, and safe to retry.", "Check legal holds, approvals, archive integrity, downstream copies, and derived data before deletion.", "Use synthetic records to inspect logs, audit entries, provider responses, and exports for sensitive values.", "Exercise restore and deletion procedures, including key availability for encrypted records."] },
    { p: "Relevant implementation evidence: <code>retention_policy.json</code>, <code>data_protection.py</code>, <code>provider_management_service.py</code>, and <code>action_audit.py</code>. Confirm deployment enforcement before representing policy periods as achieved retention." },
  ],
};

const ENVIRONMENTS = [
  ["environments/staging.html", "Staging", "A real deployment with its own database and Kafka listeners, used for integration testing."],
  ["environments/production.html", "Production", "The live deployment: production credentials, backups, reviewed exposure and the strictest change discipline."],
  ["environments/sandbox.html", "Sandbox", "There is no mocked sandbox. Staging runs the same reconciliation behaviour, which is what makes testing meaningful."],
];

const TESTING_TOPICS = [
  ["testing/sandbox-testing.html", "Testing against staging", "Scope a staging tenant, then drive the same flows production will see."],
  ["testing/test-transactions.html", "Test transactions", "Send events into staging and assert the match, the exception reason and the audit entry."],
  ["testing/webhook-testing.html", "Webhook testing", "Stand up a consumer in staging, verify the signature, force a failure and replay from the dead letter."],
  ["testing/failure-scenarios.html", "Failure scenarios", "Test duplicate delivery, malformed payloads, consumer downtime and tenant-scope violations."],
  ["testing/integration-testing.html", "Integration testing", "Test the invariants, not the happy path: one record per event, one decision per exception, zero cross-tenant reads."],
];

const CHANGELOG_ENTRIES = [
  ["changelog/breaking-changes.html", "Breaking changes", "Any breaking change ships behind a new versioned prefix, with at least 90 days of notice for the previous version."],
  ["changelog/2026/september.html", "September 2026", "This documentation site was published. No API breaking changes."],
  ["changelog/2026/august.html", "August 2026", "No public changelog entries were published for this month."],
  ["changelog/2026/july.html", "July 2026", "No public changelog entries were published for this month."],
];

const MIGRATION_TOPICS = [
  ["migration/api-v1-to-v2.html", "API v1 to v2", "No public v1-to-v2 transition has been announced. The public contract remains /api/v1; the dashboard spec is versioned 2.0.0."],
  ["migration/webhook-migrations.html", "Webhook migrations", "Consumer-affecting changes are announced through release notes and the OpenAPI document before any signature or payload change."],
  ["migration/deprecated-endpoints.html", "Deprecated endpoints", "No endpoints are deprecated today. When one is, it is listed here with its replacement and sunset date."],
];

const SUPPORT_TOPICS = [
  ["support/troubleshooting.html", "Troubleshooting", "Start with the request id, then the status classes in Errors. Most failures are scope, tenant or an unverified assumption about a payload."],
  ["support/faq.html", "FAQ", "Straight answers on scope: M-Pesa only today, no self-serve signup, no official SDKs, no certifications claimed."],
  ["support/contact.html", "Contact", "Pilots are supported personally. Use the source repository for documentation issues and private advisories for security reports."],
];

const GUIDE_TREES = [
  ["guides/authentication/", "Authentication guides", "Live", [
    ["api-keys.html", "API keys", "Scopes, expiry, rotation metadata, and one credential per integration."],
    ["bearer-tokens.html", "Bearer tokens", "The Authorization header, tenant claims, and what a rejected token returns."],
    ["oauth.html", "OAuth", "Not supported today. Service access uses scoped bearer tokens issued per deployment."],
    ["key-rotation.html", "Key rotation", "Rotate on a schedule and on suspicion; revocation takes effect immediately."],
  ]],
  ["guides/transactions/", "Transaction guides", "Live", [
    ["create-transaction.html", "Create a transaction", "The write path is documented in the OpenAPI contract: confirm the schema against your deployment."],
    ["retrieve-transaction.html", "Retrieve a transaction", "Detail lookups always include tenant predicates; IDs are not globally trusted."],
    ["search-transactions.html", "Search transactions", "Paginate deterministically and treat unspecified ordering as unstable."],
    ["transaction-status.html", "Transaction status", "See the lifecycle concept page for states and their preconditions."],
    ["handle-failures.html", "Handle failures", "Retry with backoff, match on stable codes, and quote the request id."],
  ]],
  ["guides/reconciliation/", "Reconciliation guides", "Live", [
    ["configure-reconciliation.html", "Configure reconciliation", "Match keys and timestamp tolerance are configured per flow, scoped with the pilot team."],
    ["matching-rules.html", "Matching rules", "Amount, reference and tolerance decide the outcome; the same inputs give the same result."],
    ["unmatched-transactions.html", "Unmatched transactions", "Queue with the reason attached: never silently discarded."],
    ["exceptions.html", "Exceptions", "Differences are first-class: the delta is stated and a reviewer decides with a written reason."],
    ["reconciliation-reports.html", "Reconciliation reports", "Reports read the reconciled record and its exceptions, so the queue and the numbers agree."],
  ]],
];

/* ---------------------------------------------------------------------------
 * Assemble and export.
 * ------------------------------------------------------------------------- */

const out = [];

for (const [file, title, lede, status, blocks, related] of API_MORE)
  out.push(page(file, "API", title, lede, status, blocks, related));
for (const [file, label, lede] of SDK_LANGS)
  out.push(page(file, "SDKs", label, lede, "Planned", null, [["SDKs", "sdks/index.html"], ["OpenAPI document", "api-reference/openapi.json"]]));
for (const [file, label, lede] of WEBHOOK_EVENTS)
  out.push(page(file, "Webhooks", label, lede, "Draft", [{ p: "Payload fields are still being stabilized; subscribe to the OpenAPI document rather than hard-coding shapes." }], [["Event catalog", "webhooks/event-catalog.html"], ["Verification", "webhooks/verification.html"]]));
for (const [file, label, lede] of ERROR_CLASSES)
  out.push(page(file, "Errors", label, lede, "Live", [{ p: "See <a href=\"../api/errors.html\">API · Errors</a> for the envelope and client behaviour." }], [["API · Errors", "api/errors.html"], ["Error codes", "errors/error-codes.html"]]));
for (const [file, label, lede] of SECURITY_LAYERS)
  out.push(page(file, "Security", label, lede, "Live", SECURITY_DETAILS[file] || null, [["Security overview", "security/index.html"], ["Tenant isolation", "security/tenant-isolation.html"]]));
for (const [file, label, lede] of ENVIRONMENTS)
  out.push(page(file, "Environments", label, lede, "Live", null, [["Environments", "environments/index.html"], ["Environment variables", "environments/environment-variables.html"]]));
for (const [file, label, lede] of TESTING_TOPICS)
  out.push(page(file, "Testing", label, lede, "Live", null, [["Testing", "testing/index.html"], ["Test environment", "getting-started/test-environment.html"]]));
for (const [file, label, lede] of CHANGELOG_ENTRIES)
  out.push(page(file, "Changelog", label, lede, "Draft", null, [["Changelog", "changelog/index.html"], ["Versioning", "api/versioning.html"]]));
for (const [file, label, lede] of MIGRATION_TOPICS)
  out.push(page(file, "Migration", label, lede, "Live", null, [["Migration", "migration/index.html"], ["Versioning", "api/versioning.html"]]));
for (const [file, label, lede] of SUPPORT_TOPICS)
  out.push(page(file, "Support", label, lede, "Draft", null, [["Support", "support/index.html"], ["Errors", "api/errors.html"]]));

for (const [dir, label, treeStatus, leaves] of GUIDE_TREES) {
  out.push({
    file: `${dir}index.html`,
    path: `/${dir}`,
    section: label,
    title: label,
    lede: `${label} for PesaGuard integrations.`,
    description: `${label} for PesaGuard integrations.`,
    status: treeStatus,
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Guides", "guides/index.html"], [label], null),
    blocks: [
      { table: [["Page", "Focus"]].concat(leaves.map(([f, t, l]) => [`<a href="${f}">${t}</a>`, l])) },
      noteBlock(treeStatus),
    ],
    related: [["Guides", "guides/index.html"], ["Getting started", "getting-started/index.html"]],
  });
  for (const [leaf, title, lede] of leaves) {
    out.push({
      file: `${dir}${leaf}`,
      path: `/${dir}${leaf}`,
      section: label,
      title,
      lede,
      description: lede,
      status: dir.includes("integrations") && !/M-Pesa/.test(title) ? "Planned" : "Live",
      sidebar: null,
      crumbs: crumb(["Docs", "index.html"], ["Guides", "guides/index.html"], [label, "index.html"], [title], null),
      blocks: [{ p: lede }, noteBlock(dir.includes("integrations") && !/M-Pesa/.test(title) ? "Planned" : "Live")],
      related: [[label, `${dir}index.html`], ["Guides", "guides/index.html"]],
    });
  }
}

module.exports = out;