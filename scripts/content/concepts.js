/**
 * Concepts — the mental model: architecture, reconciliation, lifecycle,
 * idempotency, tenants, anomalies, fraud detection and audit trails.
 */
"use strict";

const { B } = require("../engine");
const { statusNote, FACTS, tenantInvariant } = require("./shared");

const GROUP = "concepts";
const pages = [];

pages.push({
  file: "concepts/index.html",
  group: GROUP,
  section: "Concepts",
  title: "Concepts",
  description:
    "The ideas PesaGuard is built on: deterministic matching, idempotent writes, enforced tenants and append-only evidence.",
  status: "Live",
  lede:
    "Five ideas carry the whole platform. Understand them and every page in this documentation becomes predictable — including the pages that say a capability is not built yet.",
  blocks: [
    B.card ? null : null,
    B.cards([
      { href: "concepts/architecture.html", title: "Architecture", body: "Ingest, validate, reconcile, analyze, alert, resolve, report — and the processes that run each step.", tag: "Model" },
      { href: "concepts/reconciliation.html", title: "Reconciliation", body: "Deterministic matching with exceptions instead of silence, and the evidence each outcome keeps.", tag: "Core" },
      { href: "concepts/transaction-lifecycle.html", title: "Transaction lifecycle", body: "The states a payment moves through, and what each one means to finance.", tag: "Model" },
      { href: "concepts/idempotency.html", title: "Idempotency", body: "A retry never becomes a second financial record — and how the key is derived.", tag: "Invariant" },
      { href: "concepts/tenants.html", title: "Tenants", body: "Database-enforced boundaries, with every query carrying the tenant predicate.", tag: "Invariant" },
      { href: "concepts/anomalies.html", title: "Anomalies", body: "Named signals to review — never automatic verdicts.", tag: "Signal" },
      { href: "concepts/fraud-detection.html", title: "Fraud detection", body: "Anomaly, suspicion, high risk, confirmed fraud: four different things.", tag: "Signal" },
      { href: "concepts/audit-trails.html", title: "Audit trails", body: "Append-only evidence, hashed and signed, for every decision.", tag: "Evidence" },
    ]),
    B.h2("How to use this section"),
    B.p(
      "Each concept is written as an invariant first and an implementation second. The invariant is what a reviewer or auditor relies on; the implementation is what the repository currently does. When the two differ, the page says so instead of smoothing it over."
    ),
    B.h3("The reference workflow"),
    B.p(
      "Every capability follows the same path. Read it once here and you can predict the design of a page you have not opened yet."
    ),
    B.ol([
      "Authenticate the caller, or verify the provider's signature.",
      "Resolve tenant and provider-account identity from trusted context — never from an unvalidated request field.",
      "Validate and normalize the request or event into the canonical shape.",
      "Enforce idempotency before performing any side effect.",
      "Persist the durable record and its audit event in one transaction.",
      "Publish or enqueue work through the outbox or worker boundary.",
      "Reconcile, notify, measure, and expose a traceable result.",
    ]),
    B.note(
      "Why the order matters",
      "Idempotency sits before the side effect, and the audit event shares the transaction with the record. Reorder either and a retry can duplicate money or a decision can exist without a reason attached to it.",
      "info"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Getting started", "getting-started/index.html", "Where these ideas appear in the first hour."],
    ["API reference", "api/index.html", "The same invariants at the interface."],
    ["Security overview", "security/index.html", "How the boundaries are enforced and proven."],
  ],
});

pages.push({
  file: "concepts/architecture.html",
  group: GROUP,
  section: "Concepts",
  title: "Architecture",
  description:
    "How PesaGuard is put together: a few processes sharing one database, Kafka and Redis between them, an outbox for durability, and evidence at every step.",
  status: "Live",
  lede:
    "PesaGuard is a modular backend, not a microservice estate: a small number of processes sharing one PostgreSQL database, with Kafka and Redis carrying work between them. The design goal is durability and traceability, not service count.",
  blocks: [
    B.h2("The processes"),
    B.table([
      ["Process", "Responsibility", "Entry point"],
      ["Webhook receiver", "Validates Daraja callbacks, normalizes the payload, hands off durably.", "<code>/webhook/mpesa/validation</code>, <code>/webhook/mpesa/confirmation</code>"],
      ["Operations API", "Tenant, provider, discrepancy, analytics and admin routes.", "<code>/api/v1</code> resources plus operational routes"],
      ["Reconciliation consumer", "Applies matching rules to accepted events; writes matches, exceptions, audit.", "<code>event_consumer.py</code>, <code>reconciliation_engine.py</code>"],
      ["RQ worker", "Async publishing, scheduled reports, retention cleanup, failure handling.", "<code>background_tasks.py</code>, queue <code>transaction_events</code>"],
      ["Alerting consumer", "Routes exceptions and notifications to SMS, email, Slack or webhooks.", "<code>alerting_consumer.py</code>"],
    ]),
    B.h2("Kafka topics"),
    B.p(
      "Topics live in one registry with deliberate partition counts and retention. Names are overridable per environment with <code>PESAGUARD_TOPIC_*</code> variables; replication defaults to <code>KAFKA_REPLICATION_FACTOR</code> (2)."
    ),
    B.table(
      [["Topic", "Parts", "Retention", "Carries"]].concat(
        FACTS.topics.map(([name, partitions, retention]) => [
          `<code>${name}</code>`,
          partitions,
          retention,
          {
            "mpesa.transactions.raw": "Accepted callbacks in canonical form.",
            "mpesa.transactions.validated": "Events that passed validation, before matching.",
            "mpesa.transactions.matched": "Decided match outcomes with their evidence.",
            "mpesa.discrepancies": "Exceptions raised for human review.",
            "mpesa.transactions.fraud": "Transactions carrying a risk assessment.",
            "mpesa.dead_letters": "Work exhausted beyond automatic recovery.",
            "mpesa.audit.events": "Append-only audit events.",
            "notification.events": "Notification requests awaiting delivery.",
            "notification.status": "Delivery outcomes per channel.",
            "communication.audit": "Communication audit trail.",
          }[name],
        ])
      )
    ),
    B.h2("Where reliability is enforced"),
    B.table([
      ["Concern", "Mechanism", "Where to look"],
      ["Duplicate delivery", "Derived idempotency key with a unique constraint.", "<code>idempotency_records</code>, <code>idempotency.py</code>"],
      ["Lost work", "Outbox tables drained by a worker, plus a dead-letter topic and table.", "<code>transaction_outbox</code>, <code>dead_letters</code>"],
      ["Schema drift", "Alembic revisions for transactions, webhooks, providers, auth state, audit integrity, outbox delivery, retention and encrypted configuration.", "<code>alembic/</code>"],
      ["Silent failure", "Structured logs with correlation ids, Prometheus metrics, health checks, Grafana dashboards, Alertmanager rules.", "<code>observability.py</code>, <code>metrics.py</code>, <code>monitoring/</code>"],
      ["Tampered history", "Audit entries are append-only, hash-chained and signed.", "<code>action_audit.py</code>"],
    ]),
    B.note(
      "Why an outbox, not a direct publish",
      "The record and the intent to publish are committed in one database transaction, then a worker drains the outbox to Kafka. A crash between commit and publish cannot lose the event; a crash after publish cannot duplicate money because consumers are idempotent. Pending depth is exported as <code>pesaguard_transaction_outbox_pending</code>.",
      "info"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Reconciliation", "concepts/reconciliation.html", "What the consumer actually decides."],
    ["Transaction lifecycle", "concepts/transaction-lifecycle.html", "The states a payment moves through."],
    ["Audit trails", "concepts/audit-trails.html", "How evidence is kept verifiable."],
  ],
});

pages.push({
  file: "concepts/reconciliation.html",
  group: GROUP,
  section: "Concepts",
  title: "Reconciliation",
  description: "Deterministic matching: the rules, the tolerance, the score, and the evidence every outcome keeps.",
  status: "Live",
  lede:
    "Reconciliation answers one question — does this payment correspond to something you expected? — and then keeps the reasoning. Determinism matters because an explanation that changes each time you ask is not an explanation.",
  blocks: [
    B.h2("The comparison"),
    B.p(
      "Each accepted payment is compared against internal records on four fields. Both sides are normalised first: amounts are quantised to two decimal places, references are trimmed and compared exactly, phone numbers are reduced to digits, and timestamps are compared inside a window."
    ),
    B.table([
      ["Field", "Rule", "Weight"],
      ["Reference", "Exact match after trimming (<code>reference_exact</code>).", "0.45"],
      ["Amount", "Exact (<code>amount_exact</code>) or within tolerance (<code>amount_within_tolerance</code>).", "0.30 / 0.15"],
      ["Timestamp", "Within the matching window (<code>timestamp_within_window</code>).", "0.15"],
      ["Phone", "Exact match on normalised digits.", "0.10"],
    ], { caption: "Rules are named in the evidence, so an outcome states which comparisons produced it." }),
    B.h2("The outcomes"),
    B.table([
      ["Status", "Means", "What happens next"],
      ["<code>EXACT</code>", "Reference, amount and time all agree.", "Marked matched with its evidence; no human involved."],
      ["<code>PARTIAL</code>", "Amount and time agree within tolerance but the reference does not.", "Recorded with the rules it matched on, surfaced for review rather than silently accepted."],
      ["<code>MISMATCH</code>", "An amount match exists but the time or reference does not.", "An exception is raised with the delta and the candidate considered."],
      ["<code>UNMATCHED</code>", "No candidate was found.", "Queues as unmatched with its reason — never dropped."],
      ["<code>original_reference</code>", "A reversal or adjustment matched against its originating payment.", "Linked to the original instead of becoming an orphan credit."],
    ]),
    B.h2("Tolerance is configuration"),
    B.kv([
      ["Amount tolerance", "<code>tolerance_percent</code>, default <strong>0.5%</strong>, floored at one cent so small amounts are not compared with a zero tolerance."],
      ["Time window", "<code>window_seconds</code>, default <strong>900</strong> (15 minutes), mirrored by <code>RECONCILIATION_WINDOW_MINUTES=15</code>."],
      ["Changing it", "A tolerance change changes financial outcomes: it is a reviewed change scoped per tenant, not a quiet config edit."],
    ]),
    B.note(
      "Why a tolerance exists at all",
      "Some rails round, some charges are absorbed, and a member occasionally pays a shilling short. A zero tolerance produces exceptions nobody can act on; a wide tolerance matches things that are not the same. 0.5% is the documented default, not a universal truth — set it with the reconciliation owner.",
      "info"
    ),
    B.h2("Evidence kept with every decision"),
    B.ul([
      "<strong>The candidate</strong> considered, whether or not it won.",
      "<strong>The rules</strong> that fired, by name (<code>reference_exact</code>, <code>amount_mismatch</code>, …).",
      "<strong>The score</strong> from the weighted comparison, so near misses stay auditable.",
      "<strong>The engine version</strong>, so a decision can be re-derived after a rule change.",
      "<strong>Timestamp and processing latency</strong>, which is how an operator answers \"how long did this take?\".",
    ]),
    B.h2("Measuring reconciliation quality"),
    B.p(
      "Ground truth can be recorded (<code>reconciliation_ground_truth</code>), which makes precision and recall measurable rather than asserted. They are exported as <code>pesaguard_reconciliation_precision</code>, <code>..._recall</code>, <code>..._false_positives</code> and <code>..._false_negatives</code>, so a rule change that makes matching look better while reconciliation gets worse is visible."
    ),
    B.table([
      ["Table", "Holds"],
      ["<code>reconciliation_matches</code>", "Decided matches with their evidence."],
      ["<code>reconciliation_ground_truth</code>", "Known-correct outcomes used to measure precision and recall."],
      ["<code>discrepancies</code>, <code>discrepancy_events</code>", "Exceptions and their lifecycle, including who resolved them and why."],
      ["<code>reconciliation_outbox</code>", "Decisions awaiting publication, so a crash cannot lose an outcome."],
    ]),
    B.h2("Rules for changing matching logic"),
    B.checklist([
      "Add tests for exact matches, near matches, mismatches, duplicates, missing records, reversals and partial payments first.",
      "Never change a rule to make one case disappear — fix the data or record an exception.",
      "Keep the engine version alongside the decision so outcomes stay explainable after the change.",
      "Watch precision and recall afterwards; a silent shift in either is an incident, not a tuning success.",
    ]),
    statusNote("Live"),
  ],
  related: [
    ["Matching rules guide", "guides/reconciliation/matching-rules.html", "Configuring rules for a tenant."],
    ["Exceptions", "guides/reconciliation/exceptions.html", "Working the queue."],
    ["Anomalies", "concepts/anomalies.html", "Signals that are not matching failures."],
  ],
});

pages.push({
  file: "concepts/idempotency.html",
  group: GROUP,
  section: "Concepts",
  title: "Idempotency",
  description:
    "How the key is derived, where it is enforced, and why a retry can never become a second financial record.",
  status: "Live",
  lede:
    "A retry must be safe to run more than once. That is an interface invariant, not a client courtesy — provider retries, consumer replays and operator re-runs all arrive eventually, and none of them may create a second financial effect.",
  blocks: [
    B.h2("How the key is derived"),
    B.p(
      "The key is computed server-side from the payload, so a client cannot opt out of the guard by omitting a header. Two shapes exist, in this order:"
    ),
    B.code(
      '# 1. Preferred: the provider transaction id\ntransid:SGK7XYZ123\n\n# 2. Fallback when there is no transaction id:\n#    sha256 over the normalised tuple (msisdn|amount|transtime)\nhash:9f2c1e0d4a…',
      { lang: "text", label: "idempotency key" }
    ),
    B.table([
      ["Input", "Normalisation", "Why"],
      ["<code>TransID</code>", "Uppercased, trimmed. <code>transid:&lt;value&gt;</code>.", "The provider's own identity for the payment is the strongest available key."],
      ["MSISDN", "Digits only, so <code>+254 712 345 678</code> and <code>254712345678</code> agree.", "Formatting must not create two keys for one payment."],
      ["Amount", "Formatted to two decimal places (<code>2500</code> and <code>2500.00</code> agree).", "The same shilling is the same money regardless of notation."],
      ["TransTime", "Normalised to <code>YYYYMMDDHHMMSS</code>, accepting <code>Z</code> and ISO-8601 input.", "Timestamp formats vary between flows and versions."],
    ]),
    B.h2("Where it is enforced"),
    B.ol([
      "A callback is received and validated.",
      "The key is derived from the payload — before any side effect.",
      "A unique constraint on <code>idempotency_records</code> claims the key.",
      "The financial record and its audit event are written in the same transaction as that claim.",
      "If the claim fails, the request returns <code>409 DUPLICATE_EVENT</code> and the original record stays untouched.",
    ]),
    B.note(
      "Why the claim comes first",
      "If the record were written before the key was claimed, two concurrent deliveries could both pass the check and both write. Claiming the key first makes the duplicate a database-level impossibility rather than an application-level hope.",
      "info"
    ),
    B.h2("What a duplicate looks like"),
    B.code(
      '{\n  "status": "error",\n  "error": {\n    "code": "DUPLICATE_EVENT",\n    "message": "This event has already been processed."\n  },\n  "request_id": "…",\n  "tenant_id": "sacco-nairobi",\n  "ResultCode": 1,\n  "ResultDesc": "This event has already been processed."\n}',
      { lang: "json", label: "409 duplicate" }
    ),
    B.p(
      "A caller should treat this as confirmation that the work is already done and read the existing record — not as a failure to retry."
    ),
    B.h2("Where the same rule applies"),
    B.table([
      ["Path", "What is de-duplicated"],
      ["M-Pesa callbacks", "The payment record, via the derived key."],
      ["Outbound webhook delivery", "A replayed delivery cannot create a second financial effect in a well-built consumer, because the event id is stable."],
      ["Operator actions", "Bulk resolution and administrative changes are keyed so a double-click cannot resolve the same exception twice with different reasons."],
      ["Dead-letter replay", "Replay is supported and equally safe: the same key resolves to the same original record."],
    ]),
    B.h2("What idempotency does not do"),
    B.ul([
      "It does not make a <em>different</em> request safe. Change the amount and the fallback key changes, because it should.",
      "It does not replace validation: a malformed payload is rejected before the key is derived.",
      "It does not hide duplicates from you. Every conflict is observable, because a conflict rate change is a useful signal about provider behaviour.",
    ]),
    B.checklist([
      "Assert the retry path in staging: send the same payload twice and confirm one record.",
      "Log conflicts at info level — a 409 on a callback path is usually the guard working correctly.",
      "Never build around the guard by mutating a payload until it is accepted. That is how double-credit happens.",
    ]),
    statusNote("Live"),
  ],
  related: [
    ["Idempotency (API)", "api/idempotency.html", "The interface contract."],
    ["409 · Conflict", "errors/conflict.html", "Handling the duplicate response."],
    ["Transaction lifecycle", "concepts/transaction-lifecycle.html", "Where the guard sits in the flow."],
  ],
});

pages.push({
  file: "concepts/transaction-lifecycle.html",
  group: GROUP,
  section: "Concepts",
  title: "Transaction lifecycle",
  description:
    "The states a payment moves through from callback to resolution, what each one means to finance, and how the state is recorded.",
  status: "Live",
  lede:
    "A payment is never just \"a row\". It moves through named states — accepted, validated, matched, excepted, resolved — and every transition keeps a reason and an actor. Read this once and the dashboard stops being ambiguous.",
  blocks: [
    B.h2("The states"),
    B.table([
      ["State", "Means", "Written where"],
      ["Received", "The callback arrived and was accepted at the edge.", "<code>transactions</code> (initial row), <code>transaction_events</code>"],
      ["Validated", "Payload parsed into the canonical shape; the offending field is named on failure.", "Same rows, plus <code>quarantine_records</code> when validation fails but must not be lost."],
      ["Deduplicated", "The idempotency key was claimed; a duplicate returns 409 without writing.", "<code>idempotency_records</code>"],
      ["Published", "The committed record was drained to Kafka via the outbox.", "<code>transaction_outbox</code> → <code>mpesa.transactions.raw</code>"],
      ["Reconciling", "The consumer is comparing it against internal records.", "In-flight; visible through consumer lag and <code>pesaguard_reconciliation_processing</code>."],
      ["Matched", "A rule set agreed with an expected record; evidence attached.", "<code>reconciliation_matches</code>, <code>processed_transactions</code>"],
      ["Exception", "Matched nothing, or matched wrongly: an account of what was considered and why.", "<code>discrepancies</code>, <code>discrepancy_events</code>"],
      ["Investigating", "A human has the case and is working it.", "Discrepancy assignment and status events."],
      ["Resolved", "A human recorded a decision and a reason.", "The discrepancy row, the resolution audit entry, and the resolving actor."],
      ["Archived", "Retention moved it out of the live set.", "Export and archival records, per the retention policy."],
    ]),
    B.h2("What moves it forward"),
    B.ol([
      "The provider moves it from nothing to received: Daraja posts the callback.",
      "Validation moves it to validated or quarantined — a quarantined payment is still evidence, not garbage.",
      "The idempotency guard moves it to deduplicated, or returns the existing record on conflict.",
      "The publisher and the broker move it through published to reconciling.",
      "The matching engine moves it to matched or exception — the only decision point, and the one that keeps evidence.",
      "A human moves an exception through investigating to resolved, with the reason recorded.",
      "Retention moves resolved or aged records to archived, on the schedule the tenant agreed.",
    ]),
    B.note(
      "States are observed, not assumed",
      "A state exists when a durable row says so. \"Accepted\" without a persisted record is a claim, not a state — which is why the ingest path persists before acknowledging.",
      "info"
    ),
    B.h2("States that finance cares about"),
    B.kv([
      ["Matched", "The money is accounted for: the record, the evidence and the candidate. Nothing further to do."],
      ["Exception", "The queue to work: each item carries the delta, the candidate and the rules that fired."],
      ["Investigating", "Someone owns it. If this state grows, the team is falling behind, not the engine."],
      ["Resolved", "Closed with a decision and a reason. This is what an auditor reads at month-end."],
      ["Unmatched in queue", "Payments with no candidate: either expected records have not arrived yet, or the expectation is wrong. Both have different remedies."],
    ]),
    B.h2("Reading state in the API"),
    B.p(
      "Status names come from the engine (<code>EXACT</code>, <code>PARTIAL</code>, <code>MISMATCH</code>, <code>UNMATCHED</code>) and the evidence beside them states the rules. Do not build a dashboard that collapses every non-match into one bucket: the difference between a mismatch and an unmatched payment is the difference between investigating the data and investigating the expectation."
    ),
    statusNote("Live"),
  ],
  related: [
    ["Reconciliation", "concepts/reconciliation.html", "The decision at the centre of the lifecycle."],
    ["First transaction", "getting-started/first-transaction.html", "One payment, end to end."],
    ["Idempotency", "concepts/idempotency.html", "The guard that protects every transition."],
  ],
});

pages.push({
  file: "concepts/tenants.html",
  group: GROUP,
  section: "Concepts",
  title: "Tenants",
  description:
    "How tenant isolation is enforced: the identifier, the predicate, the stores it must appear in, and how isolation is proven.",
  status: "Live",
  lede:
    "A tenant is an isolation boundary, not a label. Every query, mutation, export, cache key, event, audit record and replay carries the authorized tenant — and an identifier without that tenant returns nothing.",
  blocks: [
    B.h2("Where the tenant comes from"),
    B.ol([
      "The caller authenticates: a bearer credential whose claims name the tenant, or a provider callback whose account identifies it.",
      "The server resolves the tenant from that trusted context — never from an unvalidated request field.",
      "The resolved tenant travels with the request into every query, job, event, cache key and audit row.",
    ]),
    B.note(
      "Never trust tenant_id from the request",
      "A <code>tenant_id</code> supplied by the caller without verified authorization is an attack, not a feature. The response envelope echoes the authorized tenant; it does not accept one.",
      "danger"
    ),
    B.h2("The predicate rule"),
    B.p(
      "Every tenant-owned read or write includes the tenant predicate alongside any identifier. A detail route fetches <em>this id within this tenant</em>, never <em>this id</em>:"
    ),
    B.code(
      "-- The lookup that cannot leak\nSELECT * FROM discrepancies\nWHERE id = :id AND tenant_id = :tenant_id;  -- both bound, both required",
      { lang: "sql", label: "isolation" }
    ),
    B.ul([
      "A resource in another tenant answers <code>404</code>, never <code>403</code> — the API must not confirm that an identifier exists elsewhere.",
      "List endpoints score and filter inside the tenant first; cross-tenant rows can never enter a page.",
      "Exports carry the tenant filter, and bulk operations audit the tenant on every item.",
    ]),
    B.h2("Everywhere the tenant must appear"),
    B.table([
      ["Surface", "How isolation holds"],
      ["Database rows", "Tenant column with not-null and index; foreign keys carry the tenant where the domain requires it."],
      ["Kafka events", "Tenant and provider-account on the envelope, so a replayed event cannot land in the wrong stream consumer."],
      ["Cache keys", "Namespaced by tenant; a shared cache key is a cross-tenant read waiting to happen."],
      ["Outbox rows", "Drained only for their own tenant's consumer; a poison row cannot stall a neighbour's delivery."],
      ["Logs, metrics, traces", "Tenant on the structured fields, so a query for one tenant never surfaces another's traffic."],
      ["Reports and exports", "Scoped like a list, then audited: the export itself is a recorded action with an actor and a tenant."],
      ["Background jobs", "The job carries the tenant it was enqueued for; a worker never re-derives it from loose data."],
    ]),
    B.h2("How isolation is proven"),
    B.checklist([
      "A request with another tenant's identifier returns 404 and logs the attempt.",
      "A list with a crafted filter contains no other tenant's rows.",
      "A replayed event for tenant A never changes tenant B's balances.",
      "An export contains one tenant's data and records who exported it.",
      "Isolation is tested continuously — the test suite asserts the 404 rule on detail routes.",
    ]),
    B.note(
      "Boundaries are checked, not believed",
      "Tenant isolation is a property the tests assert on every protected surface, including error paths. If you add a route, the isolation test comes with it.",
      "warn"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Tenant isolation", "security/tenant-isolation.html", "The security view of the same boundary."],
    ["404 · Not found", "errors/not-found.html", "Why cross-tenant reads return 404."],
    ["Audit trails", "concepts/audit-trails.html", "How boundary enforcement itself is evidenced."],
  ],
});

// __END__

module.exports = pages;
