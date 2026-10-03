/**
 * Environments — sandbox (does not exist), staging and production, plus the
 * configuration variables that separate them.
 */
"use strict";

const { B } = require("../engine");
const { statusNote } = require("./shared");
const { environmentFamily } = require("./factories");

const GROUP = "environments";
const pages = [];

pages.push({
  file: "environments/index.html",
  group: GROUP,
  section: "Environments",
  title: "Environments",
  description:
    "What separates staging from production: separate databases, separate Kafka listeners, and the configuration that must change between them.",
  status: "Live",
  lede:
    "There are two real environments — staging and production — and no mocked sandbox. That is a deliberate choice: a mocked rail proves your code compiles, while a staging deployment proves your integration reconciles.",
  blocks: [
    B.h2("The three names, honestly"),
    B.table([
      ["Environment", "Exists?", "What it is"],
      ["Sandbox", "No", "There is no mocked rail and no self-serve playground. Staging runs the same reconciliation behaviour as production, which is what makes testing on it meaningful."],
      ["Staging", "Yes", "A real deployment with its own PostgreSQL database and its own Kafka listeners. Used for integration testing and rehearsal."],
      ["Production", "Yes", "The deployment the pilot runs on. Real money, real callbacks, real reconciliation, with backups and reviewed exposure."],
    ]),
    B.note(
      "Do not test against production",
      "Production carries live money. Use staging for anything that creates, mutates or replays records. The one legitimate production read is a health probe from your monitoring.",
      "warn"
    ),
    B.h2("What must differ between them"),
    B.table([
      ["Concern", "Staging", "Production"],
      ["Database", "Its own database (<code>STAGING_POSTGRES_DB</code>).", "Its own database, with backups, PITR and a tested restore path."],
      ["Kafka", "Its own advertised listeners (<code>STAGING_KAFKA_ADVERTISED_LISTENERS</code>) so consumer groups never cross.", "<code>KAFKA_BOOTSTRAP_SERVERS_DOCKER</code> with <code>KAFKA_REPLICATION_FACTOR</code> of 2 or more."],
      ["Daraja credentials", "Sandbox credentials where the flow allows (<code>DARAJA_BASE_URL=https://sandbox.safaricom.co.ke</code>).", "Live production credentials held by the operator."],
      ["Secrets", "Throwaway values; never reuse a production secret here.", "Real secrets from a secret manager — <code>JWT_SECRET_KEY</code>, database password, provider credentials."],
      ["Exposure", "Internal only, reachable from the team network.", "Public HTTPS, restricted CORS (<code>PESAGUARD_ALLOWED_ORIGIN</code>), bind host set deliberately."],
      ["Backups", "Optional; take one before a destructive test.", "Encrypted, uploaded off-site, freshness monitored (<code>pesaguard_backup_age_seconds</code>)."],
    ]),
    B.h2("Pages in this section"),
    B.cards([
      { href: "environments/sandbox.html", title: "Sandbox", body: "Why there is not one, and what to use instead.", go: "Read →" },
      { href: "environments/staging.html", title: "Staging", body: "The rehearsal environment: same code, separate state.", go: "Read →" },
      { href: "environments/production.html", title: "Production", body: "What production demands before it accepts traffic.", go: "Read →" },
      { href: "environments/environment-variables.html", title: "Environment variables", body: "The configuration surface, grouped by concern.", go: "Read →" },
    ]),
    B.h2("Choosing where to work"),
    B.ol([
      "New integration, first call: staging. Prove the envelope and the credential.",
      "First reconciliation: staging, with a controlled set of internal records.",
      "Rehearsing a go-live: staging, then walking the production checklist item by item.",
      "Investigating an incident: production reads only, and only with the operator's agreement.",
    ]),
    statusNote("Live"),
  ],
  related: [
    ["Production checklist", "getting-started/production-checklist.html", "Everything that must be true before go-live."],
    ["Environment variables", "environments/environment-variables.html", "The full configuration surface."],
    ["Testing", "testing/index.html", "How to test against staging properly."],
  ],
});

pages.push(environmentFamily({
  file: "environments/sandbox.html",
  title: "Sandbox",
  status: "Planned",
  description: "There is no mocked sandbox. This page explains why, and what to use instead of one.",
  lede:
    "PesaGuard has no mocked sandbox, no fake Daraja rail and no self-serve playground. Saying so plainly is more useful than documenting a capability that does not exist.",
  intro:
    "A mocked rail proves your code compiles and your JSON parses. It cannot prove that your integration reconciles against real callbacks, real timing and real failure behaviour — which is the entire point of the exercise.",
  facts: [
    ["Availability", "Not available."],
    ["Why", "A mock would have to invent provider behaviour, and invented provider behaviour is worse than no test at all."],
    ["Use instead", "Staging: a real deployment, real reconciliation, its own database and Kafka listeners."],
    ["Daraja-side testing", "Safaricom's own sandbox environment can be used for outbound STK Push work; separate from PesaGuard's environments."],
  ],
  settings: [
    ["Nothing to configure", "There is no sandbox endpoint, hostname or credential set to point at."],
    ["<code>DARAJA_BASE_URL</code>", "Where outbound Daraja calls go. Sandbox credentials point at Safaricom's sandbox, not at a PesaGuard mock."],
    ["Staging settings", "See <a href=\"environments/staging.html\">Staging</a> for the separate database and Kafka listener configuration."],
  ],
  can: [
    "Use Safaricom's own sandbox for outbound STK Push and query work, with sandbox credentials.",
    "Rehearse the full reconciliation path on staging, including failure and replay.",
    "Replay historical payloads into staging to test rules against real shapes.",
  ],
  cannot: [
    "Generate a throwaway tenant without provisioning.",
    "Simulate a provider outage from a switch — stop the consumer or the broker instead, which is closer to reality.",
    "Test against production data volumes without a deliberate decision and a maintenance window.",
  ],
  note: ["What to say to a stakeholder", "There is no demo mode. Anything that needs to be demonstrated is demonstrated on staging with real reconciliation behaviour — which is a stronger claim than a mock, not a weaker one.", "info"],
  related: [
    ["Staging", "environments/staging.html", "The environment to use instead."],
    ["Testing", "testing/index.html", "How to test meaningfully."],
    ["Test environment", "getting-started/test-environment.html", "The onboarding view of staging."],
  ],
}));

pages.push(environmentFamily({
  file: "environments/staging.html",
  title: "Staging",
  description: "A real deployment with its own database and Kafka listeners: the environment where integration testing is meaningful.",
  lede:
    "Staging runs the same code as production with separate state. That is what makes it useful: an idempotency test on staging proves something about production because the code path is identical.",
  intro:
    "Do the destructive work here. Create records, replay deliveries, stop consumers and watch retries land in dead letters. None of that should ever be rehearsed against live money.",
  facts: [
    ["State", "Its own PostgreSQL database (<code>STAGING_POSTGRES_DB</code>) — no shared rows with production."],
    ["Events", "Its own Kafka advertised listeners (<code>STAGING_KAFKA_ADVERTISED_LISTENERS</code>), so consumer groups never cross environments."],
    ["Access", "Internal to the team, reachable from the development network."],
    ["Data", "Test data only. Never copy production rows into staging without redaction."],
  ],
  settings: [
    ["<code>STAGING_POSTGRES_DB</code>", "Separate database name; the compose variants read it explicitly."],
    ["<code>STAGING_KAFKA_ADVERTISED_LISTENERS</code>", "Keeps brokers from advertising a production address to staging consumers."],
    ["<code>DARAJA_BASE_URL</code>", "Point at Safaricom's sandbox when exercising outbound calls."],
    ["<code>PESAGUARD_ENVIRONMENT</code>", "Labels logs, metrics and Sentry events so staging noise never hides production signal."],
    ["Topic overrides", "<code>PESAGUARD_TOPIC_*</code> variables let staging use its own topic names if the cluster is shared."],
  ],
  code:
    '# Bring up staging with its own state, then prove the wiring\nPOSTGRES_USER=pesaguard STAGING_POSTGRES_DB=pesaguard_staging \\\n  docker compose -f infra/docker-compose.staging.yml up -d\n\ncurl -sS "$STAGING_API_URL/health" | python -m json.tool',
  codeOptions: { lang: "bash", label: "staging" },
  can: [
    "Run end-to-end reconciliation with controlled internal records.",
    "Deliver the same callback twice and assert exactly one record.",
    "Stop a consumer, watch retries accumulate, then replay and assert one outcome.",
    "Test cross-tenant isolation with two provisioned tenants.",
    "Rehearse the production checklist item by item before touching production.",
  ],
  cannot: [
    "Be treated as disposable — a broken staging environment blocks the next rehearsal.",
    "Hold production data without redaction and an agreed retention window.",
    "Replace a load test: staging is sized for correctness work, not for peak-volume claims.",
  ],
  note: ["Reset deliberately", "If staging drifts into a state nobody understands, rebuild it from a fresh migration run rather than debugging the drift. A known-clean staging environment is what makes the next test result trustworthy.", "tip"],
  related: [
    ["Production", "environments/production.html", "What changes when real money is involved."],
    ["Testing", "testing/index.html", "Test practices that use staging well."],
    ["Failure scenarios", "testing/failure-scenarios.html", "Deliberately breaking things here."],
  ],
}));

pages.push(environmentFamily({
  file: "environments/production.html",
  title: "Production",
  description: "What production demands before it accepts traffic: required settings, backups, exposure review and monitoring.",
  status: "Live",
  lede:
    "Production carries live money. Every setting below exists because an incident taught somebody that it mattered — treat the list as the minimum, not as an aspiration.",
  intro:
    "Nothing on this page is optional. A deployment missing any of it is not production, whatever hostname it answers on.",
  facts: [
    ["Database", "PostgreSQL with backups, point-in-time recovery and a tested restore path."],
    ["Events", "Kafka with <code>KAFKA_REPLICATION_FACTOR</code> of 2 or more, and consumer lag monitored."],
    ["Secrets", "From a secret manager or the runtime environment — never in source, never in an image layer."],
    ["Exposure", "HTTPS only, restricted CORS, deliberate bind host, security headers on every response."],
  ],
  settings: [
    ["<code>DATABASE_URL_DOCKER</code> / <code>POSTGRES_PASSWORD</code>", "Real credentials, rotated on a schedule, never reused from staging."],
    ["<code>JWT_SECRET_KEY</code>", "Signs dashboard sessions. Rotating it invalidates existing sessions, so plan the window."],
    ["<code>KAFKA_BOOTSTRAP_SERVERS_DOCKER</code>, <code>REDIS_URL_DOCKER</code>", "Durable, monitored dependencies — not a laptop broker."],
    ["<code>PESAGUARD_BIND_HOST_DOCKER</code>", "Where the service listens. Set it deliberately rather than exposing everything."],
    ["<code>PESAGUARD_ALLOWED_ORIGIN</code>", "Restricts browser origins; empty means no cross-origin browser access."],
    ["<code>PESAGUARD_ENVIRONMENT=production</code>", "Labels logs, metrics and error reports so production is never confused with staging."],
    ["<code>PESAGUARD_BACKUP_ENCRYPT_COMMAND</code>, <code>PESAGUARD_BACKUP_UPLOAD_COMMAND</code>", "Encrypt and ship backups off-site. A backup on the same host is not a backup."],
    ["<code>RECONCILIATION_WINDOW_MINUTES</code>", "The matching window; 15 minutes by default. Change it only with the reconciliation owner."],
    ["<code>PESAGUARD_HEALTH_REQUIRE_KAFKA</code>, <code>..._REDIS</code>", "Decide explicitly whether a dependency outage should fail the health check."],
    ["<code>SENTRY_DSN</code>", "Error reporting with <code>SENTRY_SEND_DEFAULT_PII=false</code> so customer data stays out of the trace payload."],
  ],
  code:
    '# Prove the deployment is production-shaped before announcing it\ncurl -sS "$PESAGUARD_API_URL/health" | python -m json.tool\ncurl -sS "$PESAGUARD_API_URL/metrics" | grep -E "backup_age|outbox_pending|consumer_lag"',
  codeOptions: { lang: "bash", label: "pre-flight" },
  can: [
    "Serve the pilot with real Daraja callbacks, real reconciliation and real alerting.",
    "Be restored from an encrypted off-site backup within an agreed recovery target.",
    "Be monitored against the documented service-level objectives.",
  ],
  cannot: [
    "Be used as a test environment, ever.",
    "Accept a configuration change without a deploy record and a rollback plan.",
    "Run with an unverified restore path: an untested backup is a hope, not a control.",
  ],
  note: ["Two people, one change", "Production changes should be applied by someone who can read the diff and reviewed by someone who can revert it. The rule is cheap; the alternative is an outage at month-end.", "warn"],
  related: [
    ["Production checklist", "getting-started/production-checklist.html", "The item-by-item pre-go-live list."],
    ["Environment variables", "environments/environment-variables.html", "The whole configuration surface."],
    ["Data protection", "security/data-protection.html", "Encryption and retention in production."],
  ],
}));

// __END__

module.exports = pages;
