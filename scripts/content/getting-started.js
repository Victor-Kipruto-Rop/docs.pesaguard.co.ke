/**
 * Getting started — provisioning, first calls, the staging variant and the
 * production checklist. Grounded in the repository: routes, environment keys,
 * tables and tests.
 */
"use strict";

const { B } = require("../engine");
const { statusNote, FACTS } = require("./shared");

const GROUP = "getting-started";
const pages = [];

pages.push({
  file: "getting-started/index.html",
  group: GROUP,
  section: "Getting started",
  title: "Getting started",
  description:
    "From a running PesaGuard deployment to a production-ready integration: provisioning, credentials, the first authenticated call and the go-live checklist.",
  status: "Live",
  lede:
    "Access is provisioned with the pilot team because reconciliation scope is agreed per operation — which Daraja flow, which internal records, which escalation path. These pages take you from a running deployment to a production-ready integration.",
  blocks: [
    B.cards([
      { href: "getting-started/quickstart.html", title: "Quickstart", body: "One health probe, one contract read. Five minutes to a proven connection.", go: "Start →" },
      { href: "getting-started/create-account.html", title: "Create an account", body: "What provisioning creates: tenant, Daraja flow, users, plan.", go: "Read →" },
      { href: "getting-started/create-api-key.html", title: "Create an API key", body: "Scopes, expiry, rotation and the handling rules that keep credentials safe.", go: "Read →" },
      { href: "getting-started/first-request.html", title: "First request", body: "The bearer pattern, the response envelope and the request id you quote in support.", go: "Read →" },
      { href: "getting-started/first-transaction.html", title: "First transaction", body: "One M-Pesa payment from callback to matched record, with the evidence.", go: "Read →" },
      { href: "getting-started/test-environment.html", title: "Test environment", body: "The staging variant: its own database, its own Kafka listeners.", go: "Read →" },
      { href: "getting-started/production-checklist.html", title: "Production checklist", body: "Required settings, sign-offs and the pre-go-live review.", go: "Read →" },
    ]),
    B.h2("What you are connecting to"),
    B.p(
      `PesaGuard is ${FACTS.stack}. ${FACTS.production}. Kafka carries events between them, and Redis backs rate limits, short-lived state and RQ jobs.`
    ),
    B.kv([
      ["Active payment scope", `${FACTS.scope} — STK Push and PayBill callbacks, validated, de-duplicated, then matched or exceptioned.`],
      ["Public API base", "<code>/api/v1</code> for resource routes, with unversioned operational routes for <code>/health</code>, <code>/metrics</code> and the OpenAPI document."],
      ["Callback endpoints", "<code>/webhook/mpesa/confirmation</code> and <code>/webhook/mpesa/validation</code> — provider-facing, source and payload validated."],
      ["Async work", "Redis and RQ (queue <code>transaction_events</code>) for publishing, scheduled reports, retention cleanup and failure handling."],
      ["Schema migrations", "Alembic revisions only. Production schema is never created by <code>Base.metadata.create_all()</code>."],
    ]),
    B.h2("The proven path"),
    B.steps([
      {
        title: "Confirm the deployment answers",
        body: "Probe <code>/health</code> before anything else. A failed probe is the fastest explanation for every other symptom.",
        code: { method: "GET", label: "/health", lang: "bash", text: 'curl -sS "$PESAGUARD_API_URL/health" | python -m json.tool' },
      },
      {
        title: "Read the contract your deployment publishes",
        body: "The live OpenAPI document is authoritative — this site mirrors it. Check the version before you generate a client.",
        code: {
          method: "GET",
          label: "/openapi.json",
          lang: "bash",
          text: 'curl -sS "$PESAGUARD_API_URL/openapi.json" -o openapi.json\npython -c "import json;print(json.load(open(\'openapi.json\'))[\'info\'][\'version\'])"',
        },
      },
      {
        title: "Make one authenticated call",
        body: "Every protected route takes a scoped bearer credential. The first request page shows the envelope to expect — including the failure shape.",
        code: {
          method: "GET",
          label: "/tenant/current",
          lang: "bash",
          text: 'curl -sS "$PESAGUARD_API_URL/tenant/current" \\\n  -H "Authorization: Bearer $PESAGUARD_TOKEN"',
        },
      },
      {
        title: "Watch one real payment become a record",
        body: "The first transaction page walks a Daraja callback through ingestion, idempotency, matching and evidence, naming the tables each step writes.",
      },
    ]),
    B.h2("What you need before you start"),
    B.checklist([
      "A deployment base URL reachable from your network (staging or production).",
      "A Daraja flow agreed for the tenant: STK Push shortcode or PayBill, with credentials held by the operator — never in your repository.",
      "The internal record source reconciliation will read: a table, a connector or an export path, plus the field mapping.",
      "Named escalation contacts and the on-call window alerts should respect.",
      "An agreed residency and retention position for the tenant, if it differs from the default.",
    ]),
    B.note(
      "Scope, stated up front",
      `PesaGuard reconciles <strong>${FACTS.scope}</strong> today. ${FACTS.scopeDetail} Every page labels each capability <em>Live</em>, <em>Draft</em> or <em>Planned</em> for exactly this reason.`,
      "warn"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Quickstart", "getting-started/quickstart.html", "A running deployment, two probes, five minutes."],
    ["Concepts", "concepts/index.html", "The five ideas behind every page here."],
    ["Environments", "environments/index.html", "Staging, production and the settings that separate them."],
  ],
});

pages.push({
  file: "getting-started/quickstart.html",
  group: GROUP,
  section: "Getting started",
  title: "Quickstart",
  description:
    "Prove the connection in five minutes: probe health, read the OpenAPI document your deployment publishes, and make one authenticated request.",
  status: "Live",
  lede:
    "Everything here runs against a deployment that already exists. No signup, no key generation, no mocked rail — the point is to prove the real service answers and to see the contract it publishes.",
  blocks: [
    B.h2("Before you begin"),
    B.kv([
      ["Base URL", "Exported as <code>PESAGUARD_API_URL</code> in the deployment environment file. Confirm the value with the operator rather than guessing a hostname."],
      ["Credential", "A scoped bearer token or API key issued during provisioning — see <a href=\"getting-started/create-api-key.html\">Create an API key</a>."],
      ["Network", "Outbound HTTPS to the deployment, plus inbound delivery from Safaricom to the callback endpoints once a live flow is wired."],
    ]),
    B.h2("1 · Probe health"),
    B.code('curl -sS "$PESAGUARD_API_URL/health" | python -m json.tool', { method: "GET", label: "/health", lang: "bash" }),
    B.p(
      "The health handler checks the dependencies that decide whether the service can do its job: a database ping, Kafka broker connectivity, Redis, and a cached Daraja OAuth probe. Each check reports its own status, so a partial outage stays visible instead of collapsing into one green light."
    ),
    B.table(
      [
        ["Check", "What it proves", "If it fails"],
        ["<code>database</code>", "A connection opens and <code>SELECT 1</code> runs.", "Nothing durable can be written — treat as a hard stop."],
        ["<code>kafka</code>", "The producer bootstraps against <code>KAFKA_BOOTSTRAP_SERVERS</code>.", "Callbacks may be accepted but not fanned out; watch consumer lag and the outbox."],
        ["<code>redis</code>", "Rate-limit and short-lived state storage is reachable.", "Rate limiting and queueing degrade: expect 429s and delayed jobs."],
        ["<code>daraja</code>", "An OAuth token can be obtained (cached for <code>PESAGUARD_DARAJA_HEALTH_CACHE_SECONDS</code>, default 180s).", "Outbound Daraja calls fail; inbound callbacks still reconcile."],
      ],
      { caption: "Optional dependencies count toward overall health only when explicitly required — PESAGUARD_HEALTH_REQUIRE_KAFKA and PESAGUARD_HEALTH_REQUIRE_REDIS." }
    ),
    B.h2("2 · Read the contract"),
    B.code(
      'curl -sS "$PESAGUARD_API_URL/openapi.json" -o openapi.json\npython -c "import json;d=json.load(open(\'openapi.json\'));print(d[\'info\'][\'title\'], d[\'info\'][\'version\'])"',
      { method: "GET", label: "/openapi.json", lang: "bash" }
    ),
    B.p(
      "A running deployment publishes its own OpenAPI 3.0.3 document. This site keeps a mirror at <a href=\"api-reference/openapi.json\">api-reference/openapi.json</a> for offline reading, but the deployment's document is what a generated client should be built from."
    ),
    B.h2("3 · One authenticated request"),
    B.code(
      'curl -sS "$PESAGUARD_API_URL/tenant/current" \\\n  -H "Authorization: Bearer $PESAGUARD_TOKEN" \\\n  -H "Accept: application/json"',
      { method: "GET", label: "/tenant/current", lang: "bash" }
    ),
    B.p(
      "A 200 proves the whole chain: network, TLS, credential verification, scope check and tenant resolution. <a href=\"getting-started/first-request.html\">First request</a> unpacks the response envelope — and the failure envelope you should be handling anyway."
    ),
    B.h2("When the first five minutes go wrong"),
    B.table([
      ["Symptom", "Most likely cause", "What to check"],
      ["Connection refused or DNS failure", "Wrong base URL, or the deployment binds to loopback only.", "<code>PESAGUARD_BIND_HOST</code> on the host, and the value of <code>PESAGUARD_API_URL</code>."],
      ["<code>401</code> with a valid-looking token", "Expired, revoked, or issued for a different issuer or audience.", "Reissue the credential, then compare its <code>iss</code> and <code>aud</code> claims with the deployment's configuration."],
      ["<code>403</code>", "Valid credential, insufficient scope.", "Read the scope table in <a href=\"getting-started/create-api-key.html\">Create an API key</a> and request the narrowest scope that works."],
      ["<code>429</code>", "Rate limit reached for the credential or route.", "Back off and retry — writes are idempotent, so a retry cannot double-post."],
      ["<code>500</code>", "Unhandled server error.", "Quote <code>request_id</code> from the response body; it is the correlation key for logs and traces."],
    ]),
    B.note(
      "There is no public sandbox signup",
      "PesaGuard has no self-serve account creation. Deployments are scoped with the pilot team; see <a href=\"getting-started/create-account.html\">Create an account</a> for exactly what provisioning covers.",
      "info"
    ),
    statusNote("Live"),
  ],
  related: [
    ["First request", "getting-started/first-request.html", "The envelope every response uses, success and failure."],
    ["API overview", "api/index.html", "The full operations surface."],
    ["Errors", "api/errors.html", "What each status code means and how to react."],
  ],
});

pages.push({
  file: "getting-started/create-account.html",
  group: GROUP,
  section: "Getting started",
  title: "Create an account",
  description:
    "What provisioning actually creates: a tenant, a provider account, dashboard users, limits, and the settings that govern reconciliation.",
  status: "Live",
  lede:
    "There is no self-serve signup. A tenant is provisioned with the pilot team because reconciliation scope is an operational decision — which Daraja flow, which internal records, which escalation path — not a form field.",
  blocks: [
    B.note(
      "Why provisioning is a conversation",
      "A tenant that is provisioned badly produces exceptions nobody can explain. Fifteen minutes of scoping — flow, shortcode, internal record source, tolerance, escalation contacts — prevents weeks of reconciliation archaeology later.",
      "info"
    ),
    B.h2("What provisioning creates"),
    B.table([
      ["Object", "Table", "Why it exists"],
      ["Tenant", "<code>tenant_configurations</code>, <code>tenant_limits</code>, <code>tenant_usage</code>", "The isolation boundary: every query, job and export carries this identifier."],
      ["Provider account", "<code>payment_providers</code>", "The Daraja flow this tenant reconciles: shortcode, environment, credentials reference, connection and health state."],
      ["Dashboard users", "<code>user_accounts</code>, <code>organizations</code>, <code>organization_memberships</code>, <code>teams</code>, <code>departments</code>", "Who can see and resolve what, and in which part of the business."],
      ["Credentials", "<code>api_key_records</code>", "Scoped, hashed, expiring credentials — one per integration."],
      ["Alerting configuration", "<code>escalation_rules</code>, <code>on_call_rotations</code>", "Who is told when, and who is on call when nobody answers."],
      ["Webhook endpoints", "<code>webhook_configs</code>", "Where events are delivered, and with which signing secret."],
    ]),
    B.h2("Enrolment: what we ask for"),
    B.checklist([
      "Legal name of the organisation, and the tenant identifier to use.",
      "The Daraja flow: STK Push shortcode or PayBill, and the environment it will run in.",
      "The callback endpoint that will receive provider traffic, and who owns its TLS certificate.",
      "The internal record source for reconciliation: table, view or REST endpoint, plus the field mapping.",
      "The matching tolerance and window, if the default of 0.5% and 15 minutes does not fit.",
      "Named escalation contacts, the on-call window, and the channels alerts should use.",
      "Residency and retention choices, if they differ from the defaults.",
    ]),
    B.h2("Identity and access"),
    B.p(
      "Dashboard access is role-based and least-privilege. Roles and permissions are enforced server-side on every route — a hidden button is user experience, not a control. Grants and revocations are themselves recorded as audit events, so the answer to \"who could see this in March?\" is discoverable."
    ),
    B.kv([
      ["Users and roles", "<code>user_accounts</code> bound to roles through <code>organization_memberships</code>."],
      ["Sessions", "<code>user_sessions</code> — revoking a session closes access immediately, without waiting for expiry."],
      ["Machine access", "Per-integration credentials with explicit scopes; never a shared admin token."],
      ["SSO", "OpenID Connect providers can be registered per tenant with claim mapping and group restriction."],
    ]),
    B.h2("After provisioning"),
    B.ol([
      "Receive the deployment base URL and confirm <code>/health</code> answers.",
      "Read <code>/openapi.json</code> and check the version you will build against.",
      "Create your first credential with the narrowest scope that works.",
      "Make one authenticated call — see <a href=\"getting-started/first-request.html\">First request</a>.",
      "Agree the reconciliation window for the first real payment.",
      "Walk the <a href=\"getting-started/production-checklist.html\">production checklist</a> before go-live.",
    ]),
    statusNote("Live"),
  ],
  related: [
    ["Quickstart", "getting-started/quickstart.html", "Prove the connection."],
    ["Create an API key", "getting-started/create-api-key.html", "Scopes and rotation."],
    ["Tenants", "concepts/tenants.html", "How the boundary is enforced."],
  ],
});

pages.push({
  file: "getting-started/create-api-key.html",
  group: GROUP,
  section: "Getting started",
  title: "Create an API key",
  description:
    "How API keys are provisioned, tenant-bound, scoped, optionally expired, stored by digest, and handled securely.",
  status: "Live",
  lede:
    "API keys are provisioned through the deployment's authorized operator workflow, not a public self-serve endpoint in the canonical dashboard API. A key record is tenant-bound and carries a role, explicit scopes, active/revocation state, optional expiry, and last-used metadata.",
  blocks: [
    B.h2("What a credential carries"),
    B.table([
      ["Field", "Meaning"],
      ["Scopes", "The key's explicit scopes are intersected with the permissions granted to its role."],
      ["Tenant binding", "The key principal is associated with its stored tenant; route and resource code must still enforce that context."],
      ["Expiry", "Optional in the key record. Set a finite expiry and rotation date as an issuance policy."],
      ["Usage metadata", "Successful verification updates the last-used timestamp; review this when retiring credentials."],
      ["Revocation", "The verifier rejects inactive or revoked records. Confirm rejection after revocation is persisted."],
      ["Storage", "The verifier looks up a SHA-256 digest rather than the submitted plaintext key."],
    ]),
    B.h2("The scope model"),
    B.p(
      "The backend defines named permission strings and constrains a key to its configured scopes intersected with its role grants. Use only scopes supported by the deployed API and choose the narrowest set an integration needs."
    ),
    B.table([
      ["Scope", "Allows"],
      ["<code>read:discrepancies</code> / <code>write:discrepancies</code>", "Reading and updating discrepancies where the route requires these permissions."],
      ["<code>read:analytics</code>", "Reading analytics on routes that enforce this permission."],
      ["<code>read:transactions</code>", "Reading transactions on supported routes."],
      ["<code>manage:webhooks</code>", "Managing webhook configuration where authorized."],
      ["<code>manage:api_keys</code>", "Managing API keys where the deployment exposes an authorized management workflow."],
      ["<code>manage:all_tenants</code>", "Explicit cross-tenant administration; do not grant to ordinary integration credentials."],
    ]),
    B.h2("Issuing, rotating, revoking"),
    B.p("The canonical dashboard app does not expose a public API-key creation route. Ask the deployment operator to provision a key with the tenant, role, supported scopes, expiry policy, owner, and environment recorded."),
    B.ol([
      "Request provisioning with the narrowest role and scopes, a finite expiry, and a named owner.",
      "Transfer the secret through an approved channel and store it in the integration's server-side secret manager.",
      "Test a read-only request against the intended tenant, then verify an out-of-scope operation is denied.",
      "For scheduled rotation, coordinate replacement and revocation with the operator; after a suspected leak, request revocation immediately and review recent use.",
    ]),
    B.h2("Handling rules"),
    B.checklist([
      "Never commit a credential to source, a notebook, a screenshot or a ticket.",
      "Never log a credential, an <code>Authorization</code> header, or a token payload.",
      "Use separate credentials per integration and environment; never share one between unrelated workloads.",
      "Treat anything pasted into a chat or an issue as compromised: rotate first, investigate second.",
      "Review last-used metadata quarterly and retire the dead weight.",
    ]),
    statusNote("Live"),
  ],
  related: [
    ["First request", "getting-started/first-request.html", "Using the credential you just created."],
    ["Authentication", "api/authentication.html", "How credentials verify."],
    ["API key security", "security/api-key-security.html", "Storage, scope and rotation in depth."],
  ],
});

pages.push({
  file: "getting-started/first-request.html",
  group: GROUP,
  section: "Getting started",
  title: "First request",
  description:
    "The bearer pattern, the success envelope, and the failure envelope you should be handling before you need it.",
  status: "Live",
  lede:
    "One authenticated call proves the whole chain — network, TLS, credential verification, scope check and tenant resolution. It also shows you the envelopes every later call will use.",
  blocks: [
    B.h2("Send it"),
    B.code(
      'curl -sS "$PESAGUARD_API_URL/tenant/current" \\\n  -H "Authorization: Bearer $PESAGUARD_TOKEN" \\\n  -H "Accept: application/json" | python -m json.tool',
      { method: "GET", label: "/tenant/current", lang: "bash" }
    ),
    B.p(
      "The tenant endpoint answers for the tenant your credential is bound to. If it 200s, your credential works, your scope covers tenant reads, and your client handles the envelope."
    ),
    B.h2("Success looks like this"),
    B.code(
      '{\n  "status": "success",\n  "data": { "...": "..." },\n  "request_id": "7d2b…",\n  "tenant_id": "sacco-nairobi"\n}',
      { lang: "json", label: "200 response" }
    ),
    B.kv([
      ["<code>data</code>", "The payload. Its shape belongs to the endpoint; this is the only field whose shape varies."],
      ["<code>request_id</code>", "The correlation key. Log it with anything you do with this response."],
      ["<code>tenant_id</code>", "The tenant you were authorised for — echo, not input."],
      ["<code>meta</code>", "Present on list endpoints: <code>page</code>, <code>limit</code>, <code>total</code>, <code>total_pages</code>."],
    ]),
    B.h2("Failure looks like this — handle it first"),
    B.code(
      '{\n  "status": "error",\n  "error": {\n    "code": "UNAUTHORIZED",\n    "message": "Authentication failed."\n  },\n  "request_id": "7d2b…",\n  "tenant_id": "…",\n  "ResultCode": 1,\n  "ResultDesc": "Authentication failed."\n}',
      { lang: "json", label: "401 response" }
    ),
    B.table([
      ["What you sent", "What comes back", "Meaning"],
      ["No credential", "<code>401 UNAUTHORIZED</code>", "There is no anonymous path."],
      ["Expired or revoked credential", "<code>401 UNAUTHORIZED</code>", "Refresh it; do not retry it."],
      ["Valid credential, wrong scope", "<code>403 FORBIDDEN</code>", "Request the narrowest scope that covers the call."],
      ["Valid credential, unknown id", "<code>404</code>", "The identifier is not in your tenant."],
    ]),
    B.note(
      "Write the error path before the happy path",
      "Integrations that handle the envelope on day one survive their first incident. Integrations that only parse <code>data</code> throw a <code>KeyError</code> at 02:00 and wake somebody up.",
      "tip"
    ),
    B.h2("Then do it properly"),
    B.ol([
      "Read the class, not the code: the <a href=\"errors/index.html\">error pages</a> explain what each failure demands.",
      "Copy the <a href=\"api/errors.html\">reference retry implementation</a> rather than inventing your own backoff.",
      "Capture <code>request_id</code> in your logs so a support conversation starts with evidence.",
    ]),
    statusNote("Live"),
  ],
  related: [
    ["Errors overview", "errors/index.html", "One page per failure class."],
    ["First transaction", "getting-started/first-transaction.html", "What to do once reads work."],
    ["API overview", "api/index.html", "The whole operations surface."],
  ],
});

// __END__

module.exports = pages;
