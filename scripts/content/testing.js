/**
 * Testing — how PesaGuard validates its own behaviour, and how you validate an
 * integration against staging.
 */
"use strict";

const { B } = require("../engine");
const { statusNote } = require("./shared");
const { testingFamily } = require("./factories");

const GROUP = "testing";
const pages = [];

pages.push({
  file: "testing/index.html",
  group: GROUP,
  section: "Testing",
  title: "Testing",
  description:
    "How to test an integration meaningfully: drive the real paths on staging, assert the invariants, and treat failure recovery as a first-class case.",
  status: "Live",
  lede:
    "PesaGuard is validated with focused tests for normal paths, boundary conditions, cross-tenant isolation, retries and failure recovery. Test your integration the same way — against real staging behaviour, not against a mock that agrees with you.",
  blocks: [
    B.h2("The invariants worth testing"),
    B.table([
      ["Invariant", "How to prove it", "What it protects"],
      ["One callback, one record", "Deliver the same Daraja payload twice and assert a single <code>transactions</code> row plus one idempotency record.", "Double-credit — the most expensive class of bug in a ledger."],
      ["Deterministic matching", "Replay the same event and internal records twice; assert identical status and matching rules.", "Month-end explanations that change every time you ask."],
      ["Tenant isolation", "Call a detail route with another tenant's identifier and assert 404, and that no other tenant's rows appear in a list.", "Cross-tenant leakage."],
      ["No silent loss", "Stop a consumer, publish work, restart, and assert the work completes or lands in dead letters — never vanishes.", "Transactions that exist in the provider's world and not in yours."],
      ["Honest failure", "Fail a downstream dependency and assert a non-2xx with the standard envelope, not a false success.", "False acknowledgements."],
      ["Recovery", "Replay a dead letter and assert exactly one outcome.", "Duplicate processing during recovery."],
    ]),
    B.h2("Where to run what"),
    B.cards([
      { href: "testing/sandbox-testing.html", title: "Testing without a sandbox", body: "There is no mock rail: how to build a meaningful test path anyway.", go: "Read →" },
      { href: "testing/test-transactions.html", title: "Test transactions", body: "Crafting payloads that exercise matching, tolerance and mismatch.", go: "Read →" },
      { href: "testing/webhook-testing.html", title: "Webhook testing", body: "Verifying signatures, replays and out-of-order delivery.", go: "Read →" },
      { href: "testing/failure-scenarios.html", title: "Failure scenarios", body: "The failures worth rehearsing before go-live.", go: "Read →" },
      { href: "testing/integration-testing.html", title: "Integration testing", body: "A repeatable end-to-end script against staging.", go: "Read →" },
    ]),
    B.h2("A minimum acceptance run"),
    B.steps([
      {
        title: "Prove the connection and the contract",
        body: "Health probe, contract read, one authenticated call — the quickstart path, run against staging.",
        code: { method: "GET", label: "/health", lang: "bash", text: 'curl -sS "$STAGING_API_URL/health" | python -m json.tool' },
      },
      {
        title: "Land one payment and reconcile it",
        body: "Publish a payload that should match exactly, then assert the match status, the matching rules and the evidence recorded with it.",
      },
      {
        title: "Land one payment that should not match",
        body: "Publish an amount outside the tolerance and assert a <code>MISMATCH</code> or exception rather than a forced match.",
      },
      {
        title: "Replay everything twice",
        body: "Re-send both payloads and assert the counts do not move. This is the test that proves idempotency end to end.",
      },
      {
        title: "Break something on purpose",
        body: "Stop the consumer, publish, restart, and assert the work completes exactly once — or that it is visible in a dead-letter queue.",
      },
    ]),
    B.note(
      "No mocked sandbox exists",
      "There is no test rail that fabricates provider behaviour. Everything meaningful is tested on staging with real reconciliation, which is why these pages focus on payloads, assertions and failure paths rather than on a fake.",
      "info"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Test environment", "getting-started/test-environment.html", "The staging variant, from the onboarding side."],
    ["Idempotency", "concepts/idempotency.html", "The invariant most tests target."],
    ["Reconciliation", "concepts/reconciliation.html", "What matching decides, and with what evidence."],
  ],
});

pages.push(testingFamily({
  file: "testing/sandbox-testing.html",
  title: "Testing without a sandbox",
  description: "There is no mocked rail. How to build a meaningful test path on staging using real payloads and real reconciliation.",
  status: "Live",
  lede:
    "The absence of a mock is the constraint that shapes everything else: to test, you publish payloads that look like Daraja's and assert what reconciliation does with them on staging.",
  intro:
    "This is not a workaround. A test that runs the same matching rules, the same idempotency guard and the same audit path as production is evidence; a test against a mock is a rehearsal of your own assumptions.",
  proves: [
    "That your payloads survive validation and become records, rather than being rejected for a field you assumed was optional.",
    "That matching behaves as you expect at the tolerance boundary, not just in the happy case.",
    "That a duplicate delivery does not create a second record on the real code path.",
    "That the envelope your client parses is the envelope the service actually sends.",
  ],
  steps: [
    {
      title: "Provision a staging tenant and credential",
      body: "Two tenants if you intend to test isolation, which you should.",
    },
    {
      title: "Build payload fixtures from real field names",
      body: "Use the Daraja field names the callback path expects (<code>TransID</code>, <code>TransAmount</code>, <code>MSISDN</code>, <code>TransTime</code>, <code>BillRefNumber</code>) so validation is genuinely exercised.",
      code: {
        method: "POST",
        label: "/webhook/mpesa/confirmation",
        lang: "bash",
        text: 'curl -sS -X POST "$STAGING_API_URL/webhook/mpesa/confirmation" \\\n  -H "Content-Type: application/json" \\\n  --data @fixtures/mpesa-confirmation.json',
      },
    },
    {
      title: "Insert the internal record you expect it to match",
      body: "Include amount, reference, phone and timestamp, because those are the fields the rules compare.",
    },
    {
      title: "Send it twice",
      body: "The second delivery is the idempotency assertion. The record count must not move.",
    },
    {
      title: "Read back the evidence",
      body: "Assert the match status, the matching rules applied, the score and the audit entry — not just the HTTP code.",
    },
  ],
  tableRows: [
    ["Exact amount, reference and time", "Match with <code>reference_exact</code>, <code>amount_exact</code>, <code>timestamp_within_window</code>.", "A matching rule that silently stops applying."],
    ["Amount just inside the tolerance", "Match recorded with <code>amount_within_tolerance</code>.", "Off-by-one in the tolerance boundary."],
    ["Amount outside the tolerance", "Mismatch or exception, with the delta retained.", "A forced match that hides a real discrepancy."],
    ["Same payload delivered twice", "One record; second delivery conflicts.", "Duplicate credit."],
    ["Two tenants, same reference text", "Each tenant sees only its own outcome.", "Cross-tenant leakage."],
  ],
  reading: [
    "Compare the recorded matching rules against what you expected — a match on the wrong rule is a latent bug even when the status is right.",
    "Check the audit entry for the decision; if the reason is missing, the run is not reproducible.",
    "Assert counts before and after a replay rather than trusting the response code alone.",
    "Treat a rejected payload as information: it usually means a fixture that does not match the documented contract.",
  ],
  limits:
    "Staging is not sized for peak-volume claims, and a payload you craft is not a provider's timing distribution. Use this to prove correctness, and a separate load exercise to make performance claims.",
  note: ["Fixtures are not fake data", "A fixture is a request you deliberately send to a real service. That is different from inventing an outcome: never assert on a value the service did not actually produce.", "info"],
  related: [
    ["Test transactions", "testing/test-transactions.html", "Fixtures that exercise the matching rules."],
    ["Integration testing", "testing/integration-testing.html", "A repeatable end-to-end script."],
    ["Staging", "environments/staging.html", "Where these runs happen."],
  ],
}));

pages.push(testingFamily({
  file: "testing/test-transactions.html",
  title: "Test transactions",
  description: "Fixtures that exercise the matching rules: exact, inside tolerance, outside tolerance, reversals and partial payments.",
  status: "Live",
  lede:
    "A test transaction is a payload you send deliberately. Build a small matrix of them once and you can prove, in minutes, that matching behaves as documented at each boundary.",
  intro:
    "Use Daraja's own field names so validation is genuinely exercised, and pair each payload with the internal record you expect it to compare against. The interesting tests are at the boundaries, not in the middle.",
  proves: [
    "That the exact-match path fires with the rules you expect attached to it.",
    "That the tolerance boundary behaves as documented rather than as assumed.",
    "That a mismatch raises an exception with a usable delta rather than matching anyway.",
    "That a reversal links to its original payment instead of creating an orphan credit.",
  ],
  steps: [
    {
      title: "Write the fixture once",
      body: "One JSON file per scenario, with the internal record alongside it so the pair is obvious in a review.",
      code: {
        lang: "json",
        label: "fixtures/exact-match.json",
        text: '{\n  "TransID": "SGK7TEST001",\n  "TransAmount": "2500.00",\n  "MSISDN": "254712345678",\n  "TransTime": "20260920143000",\n  "BillRefNumber": "INV-2026-0042",\n  "BusinessShortCode": "174379"\n}',
      },
    },
    {
      title: "Publish it to staging",
      body: "Send it as a confirmation callback, exactly as the provider would.",
    },
    {
      title: "Send it again",
      body: "The second send is the idempotency assertion: one record, one conflict.",
    },
    {
      title: "Shift one field at a time",
      body: "Change the amount, then the time, then the reference — one scenario per run, so a failure identifies itself.",
    },
  ],
  tableRows: [
    ["Everything equal", "<code>EXACT</code> with <code>reference_exact</code>, <code>amount_exact</code>, <code>timestamp_within_window</code>.", "A rule that quietly stops being applied."],
    ["Amount 0.4% off", "Match within tolerance, evidence records <code>amount_within_tolerance</code>.", "Change to the tolerance calculation."],
    ["Amount 5% off", "Mismatch or exception with the delta retained.", "A forced match hiding a real discrepancy."],
    ["Reference different, amount and time equal", "<code>PARTIAL</code>, surfaced for review.", "Silent acceptance of a near match."],
    ["Timestamp well outside the window", "Mismatch with <code>timestamp_mismatch</code>.", "A window that widened without anyone noticing."],
    ["Second payment for the same amount", "Its own record, matched to its own internal record.", "Over-eager matching on amount alone."],
    ["Reversal referencing the original", "Linked via the <code>*_original_reference</code> rule.", "Orphan credits and duplicated debits."],
  ],
  reading: [
    "Read the recorded <code>matching_rules</code>, not just the status: the right answer from the wrong rule is a latent bug.",
    "Check the match score for near matches; a score that drifts over releases signals a rule change.",
    "Compare record counts before and after the replay step.",
    "Keep failures as fixtures — a payload that broke matching once should be a regression test forever.",
  ],
  limits:
    "These fixtures prove matching behaviour, not provider behaviour. Timing distributions, retry storms and duplicate delivery patterns come from the provider and are best rehearsed by replaying real production payload shapes into staging.",
  note: ["One change per run", "If a fixture differs from the expected record in three ways and the assertion fails, you have learned nothing. Vary one field at a time and the test tells you where the boundary actually is.", "tip"],
  related: [
    ["Matching rules", "guides/reconciliation/matching-rules.html", "The rules these fixtures test."],
    ["Reconciliation", "concepts/reconciliation.html", "The tolerance and the evidence."],
    ["Testing without a sandbox", "testing/sandbox-testing.html", "Why fixtures, not mocks."],
  ],
}));

// __END__

module.exports = pages;
