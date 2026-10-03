/**
 * Shared vocabulary for the content modules.
 *
 * Two rules govern everything in scripts/content:
 *
 * 1. Status labels are honest. `Live` means the behaviour is verifiable in the
 *    repository today (route, model, migration, test or runbook). `Draft` means
 *    the contract is designed but the exact fields must be confirmed against the
 *    deployment. `Planned` means there is no implementation.
 * 2. Facts are quoted from the repository, not invented. The constants below
 *    are the ones used repeatedly across pages; quoted evidence (file paths,
 *    metric names, topic names) stays in the page text.
 */
"use strict";

const { B } = require("../engine");

/** The status note every generated page ends with. */
const statusNote = (status) =>
  B.note(
    "Status",
    status === "Planned"
      ? "This capability has no implementation today, and this page says so rather than implying otherwise. Nothing here can be used in production yet."
      : status === "Draft"
        ? "This page documents a designed contract. Confirm the exact fields against your own deployment's <code>/openapi.json</code> and its configured values before coding against it."
        : "Verified against the shipped behaviour recorded in the repository: the route, model, migration, test or runbook that implements it.",
    status === "Live" ? "info" : "warn"
  );

/* Ground truth quoted across pages — keep these in sync with the repository. */
const FACTS = {
  stack:
    "a Flask and SQLAlchemy backend deployed as separate processes: an M-Pesa webhook receiver, a dashboard API, a Kafka reconciliation consumer and an RQ worker",
  production: "PostgreSQL in production, with SQLite used for tests and local development paths",
  scope: "M-Pesa (Safaricom Daraja) only",
  scopeDetail:
    "Airtel Money, bank rails and point-of-sale feeds are <em>planned</em>: they have no adapter, tests or documentation yet.",
  topics: [
    ["mpesa.transactions.raw", "6", "7 days"],
    ["mpesa.transactions.validated", "6", "7 days"],
    ["mpesa.transactions.matched", "3", "30 days"],
    ["mpesa.discrepancies", "3", "30 days"],
    ["mpesa.transactions.fraud", "3", "30 days"],
    ["mpesa.dead_letters", "3", "30 days"],
    ["mpesa.audit.events", "3", "365 days"],
    ["notification.events", "3", "30 days"],
    ["notification.status", "3", "30 days"],
    ["communication.audit", "3", "365 days"],
  ],
  tolerance: "0.5%",
  windowMinutes: "15 minutes",
  retryBase: "2<sup>attempt</sup> seconds (1s, then 2s, then 4s for a three-attempt delivery)",
  auditKey: "Ed25519",
  errors: [
    ["401", "UNAUTHORIZED", "Authentication failed."],
    ["403", "FORBIDDEN", "Insufficient permissions or tenant scope."],
    ["404", "TRANSACTION_NOT_FOUND", "No such resource within the caller's tenant scope."],
    ["409", "DUPLICATE_EVENT", "Duplicate under idempotency; the original record stays authoritative."],
    ["422", "VALIDATION_FAILED", "Request failed validation; the field is named."],
    ["429", "RATE_LIMITED", "Too many requests."],
    ["500", "INTERNAL_ERROR", "Unhandled server error."],
  ],
};

/** Standard note block used by the reference families. */
const liveNote = (body, title = "Verified behaviour") => B.note(title, body, "info");
const draftNote = (body, title = "Confirm before you code") => B.note(title, body, "warn");

/** The footer every page that describes a boundary should carry. */
const tenantInvariant = () =>
  B.note(
    "Tenant rule",
    "Every read and write in this page is scoped by the authenticated tenant and provider account. A resource id is never trusted on its own: detail lookups always carry the tenant predicate, so an identifier from another tenant returns nothing.",
    "info"
  );

module.exports = { statusNote, FACTS, liveNote, draftNote, tenantInvariant };
