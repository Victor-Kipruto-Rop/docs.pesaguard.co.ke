/**
 * Webhooks — outbound delivery: overview, the event catalog, signature
 * verification, retries and dead letters, plus one page per event family.
 */
"use strict";

const { B } = require("../engine");
const { statusNote, FACTS } = require("./shared");

const GROUP = "webhooks";
const pages = [];

pages.push({
  file: "webhooks/index.html",
  group: GROUP,
  section: "Webhooks",
  title: "Webhook delivery",
  description:
    "Signed outbound events with bounded retries and a dead-letter path you can inspect and replay — never a silent drop.",
  status: "Live",
  lede:
    "Outbound webhooks carry exceptions and notifications into systems you run. Every delivery is signed, retried on failure with bounded backoff, and dead-lettered when exhausted.",
  blocks: [
    B.h2("The delivery contract"),
    B.kv([
      ["Transport", "HTTPS <code>POST</code> with a JSON body. Redirects are not followed — a 3xx is treated as a failure, deliberately, so a hijacked DNS record cannot move your traffic."],
      ["Content type", "<code>application/json</code>."],
      ["User-Agent", "<code>PesaGuard-Webhook-Dispatcher/2.0</code>."],
      ["Event header", "<code>X-Webhook-Event</code> — the event type, e.g. <code>transaction.matched</code>."],
      ["Timestamp header", "<code>X-Webhook-Timestamp</code> — Unix seconds, part of the signed payload."],
      ["Signature header", "<code>X-Webhook-Signature: t=&lt;timestamp&gt;,v1=&lt;hex&gt;</code> — HMAC-SHA256 over <code>&lt;timestamp&gt;.&lt;canonical_json&gt;</code>."],
      ["Success", "Any 2xx. The body is captured up to 500 characters for diagnostics."],
      ["Failure", "Non-2xx, timeout, connection error or redirect. Retried up to the configured attempt count (default 3, capped at 5)."],
      ["Backoff", FACTS.retryBase + "."],
    ]),
    B.h2("Four guarantees"),
    B.ul([
      "<strong>Signed by default</strong> — a consumer parses bounded JSON as untrusted input to reconstruct the canonical form, verifies the timestamped signature, then performs business processing.",
      "<strong>Attempts are recorded</strong> — each delivery keeps its attempt count, HTTP status, a truncated response body and the final outcome.",
      "<strong>Exhausted deliveries are retained</strong> — a failed delivery becomes a dead letter rather than disappearing, so it can be inspected and replayed.",
      "<strong>Replay is safe</strong> — idempotency applies to delivery exactly as it does to ingestion, so a replayed event cannot create a second financial effect.",
    ]),
    B.h2("Where deliveries are stored"),
    B.table([
      ["Table", "What it holds", "Why you care"],
      ["<code>webhook_configs</code>", "Endpoint URL, tenant, subscribed event types, signing secret reference, retry attempts and timeout.", "The source of truth for what should be delivered where."],
      ["<code>webhook_deliveries</code>", "One row per delivery attempt sequence: event type, payload, status, attempt count, response status and body.", "The audit trail you read when a consumer says an event never arrived."],
      ["<code>dead_letters</code>", "Work items exhausted across consumers and deliveries, with the reason and the original payload.", "The recovery queue — inspect, fix the consumer, replay."],
    ]),
    B.h2("Building a consumer that survives"),
    B.steps([
      {
        title: "Verify before you parse",
        body: "Read <code>X-Webhook-Signature</code> and <code>X-Webhook-Timestamp</code>, recompute the HMAC over <code>timestamp + \".\" + raw_body</code> with your shared secret, and compare in constant time.",
        code: {
          lang: "python",
          label: "verify.py",
          text:
            'import hmac, hashlib\n\ndef verify(secret: str, timestamp: str, raw_body: bytes, header: str) -> bool:\n    expected = hmac.new(\n        secret.encode(), f"{timestamp}.".encode() + raw_body, hashlib.sha256\n    ).hexdigest()\n    provided = dict(p.split("=", 1) for p in header.split(",")).get("v1", "")\n    return hmac.compare_digest(expected, provided)',
        },
      },
      {
        title: "Reject replays",
        body: "Persist accepted <code>(event_id, timestamp)</code> pairs, or reject deliveries whose timestamp is outside a short window. A captured body replayed tomorrow must not be honoured.",
      },
      {
        title: "Acknowledge fast, process durably",
        body: "Write the event to your own store and return 2xx, then process asynchronously. Slow handlers cause timeouts, timeouts cause retries, and retries are only harmless because both sides are idempotent.",
      },
      {
        title: "Answer with a 2xx only when you mean it",
        body: "A 2xx tells PesaGuard the event is accepted. If your handler failed to persist, return 5xx and let the retry happen — the retry is safe.",
      },
    ]),
    B.note(
      "Consumer faults are invisible until they are not",
      "A consumer that swallows errors and returns 200 will never receive a retry and will never appear in a dead-letter queue. Prefer an honest 5xx over a false acknowledgement.",
      "warn"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Event catalog", "webhooks/event-catalog.html", "Every event family and when it fires."],
    ["Verification", "webhooks/verification.html", "Signature verification in detail."],
    ["Retries and dead letters", "webhooks/retries.html", "Backoff, attempts and safe replay."],
  ],
});

pages.push({
  file: "webhooks/event-catalog.html",
  group: GROUP,
  section: "Webhooks",
  title: "Event catalog",
  description:
    "The event families PesaGuard produces, when each one fires, and how to subscribe to them safely.",
  status: "Draft",
  lede:
    "Events are produced by the reconciliation pipeline and the operations surface. This catalog names the families and when they fire; the exact payload schemas come from your deployment's OpenAPI document, because field-level shapes are still stabilising.",
  blocks: [
    B.note(
      "Why this page is a draft",
      "Event names and the families that produce them are settled. Field-level payload shapes are still being stabilised against the pilot, so treat the examples below as illustrative of structure rather than as a frozen schema — subscribe to the contract, not to a copied sample.",
      "warn"
    ),
    B.h2("Naming"),
    B.p(
      "Events are named <code>&lt;resource&gt;.&lt;past-tense-action&gt;</code> — <code>transaction.matched</code>, <code>reconciliation.completed</code>. A name describes something that has already happened, so a consumer never has to guess whether an event is a request or a record of fact."
    ),
    B.h2("The families"),
    B.table([
      ["Family", "Event", "Fires when", "A consumer typically"],
      [
        "Transactions",
        "<code>transaction.created</code>",
        "A callback was accepted, validated and recorded.",
        "Reconciles its own books against the new record.",
      ],
      [
        "Transactions",
        "<code>transaction.matched</code>",
        "A deterministic pairing succeeded.",
        "Closes a receivable and stops watching for that payment.",
      ],
      [
        "Transactions",
        "<code>transaction.unmatched</code>",
        "No internal candidate was found.",
        "Opens an investigation or notifies the member.",
      ],
      [
        "Anomalies",
        "<code>anomaly.detected</code>",
        "A rule or statistical check flagged the payment for review.",
        "Creates a review task — never an automatic verdict.",
      ],
      [
        "Reconciliation",
        "<code>reconciliation.completed</code>",
        "A reconciliation run finished.",
        "Publishes a summary or starts a downstream report.",
      ],
      [
        "Delivery",
        "—",
        "A callback was received, retried, or dead-lettered.",
        "Watches delivery health rather than business state.",
      ],
      [
        "Notifications",
        "—",
        "An alert was routed to SMS, email, Slack or a webhook.",
        "Feeds an internal on-call or communications system.",
      ],
    ]),
    B.h2("How each event is delivered"),
    B.kv([
      ["Transport", "HTTPS <code>POST</code>, JSON body, redirects not followed."],
      ["Signature", "HMAC-SHA256 over <code>&lt;timestamp&gt;.&lt;body&gt;</code>, sent as <code>X-Webhook-Signature: t=…,v1=…</code>."],
      ["Type header", "<code>X-Webhook-Event</code> carries the event name, so a router can branch before parsing."],
      ["Retries", "Bounded attempts with exponential backoff; exhausted deliveries become dead letters rather than disappearing."],
      ["Ordering", "Not guaranteed. A consumer that requires order should sequence by the timestamp inside the payload, not by arrival."],
    ]),
    B.h2("Verifying one by hand"),
    B.code(
      'curl -sS -X POST "$CONSUMER_URL/pesaguard" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Webhook-Event: transaction.matched" \\\n  -H "X-Webhook-Timestamp: 1789000000" \\\n  -H "X-Webhook-Signature: t=1789000000,v1=<hex>" \\\n  --data @payload.json',
      { method: "POST", label: "replay to your consumer", lang: "bash" }
    ),
    B.h2("Subscribing safely"),
    B.checklist([
      "Parse bounded JSON without side effects, reconstruct canonical JSON, verify the signature and timestamp, then reject mismatches before persistence or business processing.",
      "Record accepted event ids so a replay is a no-op rather than a second financial effect.",
      "Acknowledge with 2xx only after you have persisted the event.",
      "Expect at-least-once delivery: duplicates are routine, so the consumer must be idempotent.",
      "Treat the payload as untrusted input even though it is signed — validate it like any other external data.",
    ]),
    statusNote("Draft"),
  ],
  related: [
    ["Delivery overview", "webhooks/index.html", "The delivery contract in full."],
    ["Verification", "webhooks/verification.html", "Signature verification step by step."],
    ["Transaction lifecycle", "concepts/transaction-lifecycle.html", "The states these events describe."],
  ],
});

pages.push({
  file: "webhooks/verification.html",
  group: GROUP,
  section: "Webhooks",
  title: "Verification",
  description: "Verify outbound webhooks with timestamped HMAC-SHA-256 over canonical JSON, enforce replay protection, and process event IDs idempotently.",
  status: "Live",
  lede:
    "PesaGuard outbound webhooks use a timestamped HMAC-SHA-256 signature over canonical JSON. Parse bounded input only to reconstruct that representation; do not persist or act on the event until its signature and freshness have been verified. Inbound provider callbacks may use different formats.",
  blocks: [
    B.h2("The signature scheme"),
    B.table([
      ["Item", "Value"],
      ["Algorithm", "HMAC-SHA256, hex-encoded."],
      ["Signed payload", "The UTF-8 bytes of <code>&lt;timestamp&gt;.&lt;canonical_json&gt;</code>, where canonical JSON uses recursively sorted keys and compact separators."],
      ["Secret", "The per-endpoint signing secret provisioned for this webhook. Keep it private and out of logs."],
      ["Header", "<code>X-Webhook-Signature: t=&lt;timestamp&gt;,v1=&lt;hex&gt;</code>"],
      ["Timestamp", "<code>X-Webhook-Timestamp</code>, Unix seconds, part of what is signed."],
    ]),
    B.h2("Verifying, step by step"),
    B.steps([
      {
        title: "Read headers and parse bounded JSON",
        body: "Reject missing or malformed signature/timestamp headers. Parse only as untrusted input under a strict request-size limit; do not persist, forward, or act on it yet.",
      },
      {
        title: "Reconstruct canonical JSON",
        body: "Serialize the parsed event with recursively sorted keys and compact separators, then construct <code>timestamp + \".\" + canonical_json</code>. Do not sign arbitrary raw whitespace or key order.",
        code: {
          lang: "python",
          label: "canonicalize.py",
          text: "import json\n\ncanonical = json.dumps(\n    event,\n    sort_keys=True,\n    separators=(',', ':'),\n    ensure_ascii=False,\n)\nsigned = f'{timestamp}.{canonical}'.encode('utf-8')",
        },
      },
      {
        title: "Check freshness and signature",
        body: "Reject a timestamp outside your short acceptance window using a synchronized clock. Compute HMAC-SHA-256 over the reconstructed signed bytes and compare the lowercase hexadecimal digest in constant time.",
        code: {
          lang: "python",
          label: "verify.py",
          text: "import hashlib, hmac\n\nexpected = hmac.new(secret.encode('utf-8'), signed, hashlib.sha256).hexdigest()\nif not hmac.compare_digest(expected, provided_digest):\n    return respond(401, 'invalid signature')",
        },
      },
      {
        title: "Deduplicate, then process",
        body: "After verification, persist a stable event identifier and processing result. Make duplicate deliveries a no-op, then return the response appropriate to your transient/permanent failure policy.",
      },
    ]),
    B.h2("What a broken consumer admits"),
    B.table([
      ["Fault", "Exposure"],
      ["Applying business logic before verifying", "An unauthenticated body could trigger state changes."],
      ["Accepting without a timestamp window", "A captured, valid delivery could be replayed after its original arrival."],
      ["A string comparison with early exit", "The digest leaks byte by byte to a patient attacker."],
      ["Returning 2xx on a transient processing failure", "The sender stops retrying although the event may not have been applied."],
    ]),
    B.note(
      "Rotate the secret like a credential",
      "Webhook secrets are credentials and must be protected and rotated when exposed. The backend's registration response and key-rotation support depend on the deployed webhook-management workflow; verify that workflow before promising overlap or automatic expiry.",
      "warn"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Retries and dead letters", "webhooks/retries.html", "What happens when a delivery fails."],
    ["Webhook security", "security/webhook-security.html", "The control behind this page."],
    ["Event catalog", "webhooks/event-catalog.html", "What can be delivered."],
  ],
});

pages.push({
  file: "webhooks/retries.html",
  group: GROUP,
  section: "Webhooks",
  title: "Retries and dead letters",
  description:
    "Bounded attempts with exponential backoff, visible attempt history, dead-letter retention, and replay that is safe to run.",
  status: "Live",
  lede:
    "A transient failure is retried; a persistent one is promoted, not hidden. Exhausted deliveries become dead letters that stay visible and replayable — a failed delivery never disappears.",
  blocks: [
    B.h2("The retry schedule"),
    B.table([
      ["Item", "Value"],
      ["Attempts", "Up to the endpoint's <code>retry_attempts</code>; default 3, capped at 5. A missing value means the service default, not zero."],
      ["Wait", "<code>2^attempt</code> seconds between attempts: 1s, then 2s, then 4s for a three-attempt delivery."],
      ["Timeout", "Per-attempt <code>timeout_seconds</code>; a delivery that hangs past it counts as a failure, not a wait."],
      ["Success", "Any 2xx. The response body is kept to 500 characters for diagnostics."],
      ["Immediate failure", "A 3xx redirect: not followed, and the delivery is aborted rather than retried — a redirecting endpoint is a security event."],
    ]),
    B.h2("Attempt history is the audit trail"),
    B.p(
      "Each delivery keeps its id, type, payload, per-attempt status, attempt count, response status and a truncated response body. When a consumer team reports that an event never arrived, this is the row that settles the question: it states what was sent, when, and what the consumer answered."
    ),
    B.h2("When attempts are exhausted"),
    B.ol([
      "The delivery is marked failed with its final attempt count.",
      "The item becomes a dead letter with the reason and the original payload attached.",
      "An operator can inspect it, fix the consumer, and replay it.",
      "Replay is safe: idempotency applies to delivery exactly as it does to ingestion, so a replayed event cannot create a second financial effect.",
    ]),
    B.note(
      "Dead letters are a queue, not a bin",
      "Every dead letter is observable, investigable and replayable. Records are never deleted without an explicit retention policy, and replay is a supported recovery path rather than a manual hack.",
      "info"
    ),
    B.h2("Designing your side for retries"),
    B.ul([
      "Accept the same delivery twice: at-least-once means duplicates are routine, not exceptional.",
      "Persist before acknowledging. A 2xx promises you hold the event; a crash between receipt and persistence is the failure the retries exist for.",
      "Answer a parse failure with 4xx or 5xx and let it arrive as a dead letter if persistent — never with a false 200.",
      "Watch your own acceptance rate per event type. A sudden rise in redeliveries for one type usually means your handler changed, not the platform.",
    ]),
    statusNote("Live"),
  ],
  related: [
    ["Verification", "webhooks/verification.html", "The signature every delivery carries."],
    ["Retries guide", "guides/webhooks/idempotency.html", "Idempotency on the consumer side."],
    ["Consumer failures", "testing/webhook-testing.html", "Proving your consumer survives retries."],
  ],
});

// __END__

module.exports = pages;
