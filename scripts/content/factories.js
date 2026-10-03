/**
 * Page factories for the repetitive leaf families (error classes, SDK
 * languages, webhook events, security layers, environments, testing topics,
 * migration notes, changelog entries, support topics and guide leaves).
 *
 * A factory exists so a leaf page still carries real, page-specific detail —
 * status codes, header names, field lists, checklists — without restating the
 * same scaffolding by hand a hundred times. Every field a factory needs is
 * authored per page below, never inferred.
 */
"use strict";

const { B } = require("../engine");
const { statusNote } = require("./shared");

const page = (spec) => spec;

/* ---------------------------------------------------------------------------
 * Errors — one class of failure, end to end.
 * ------------------------------------------------------------------------- */

function errorFamily(spec) {
  const blocks = [
    B.p(spec.intro),
    B.h2("What it means"),
    B.kv(spec.facts),
    B.h2("Common causes"),
    B.table([["Cause", "How to tell", "Fix"]].concat(spec.causes)),
    B.h2("Client behaviour"),
    B.ol(spec.client),
    spec.server ? B.h2("Server-side checks") : null,
    spec.server ? B.ul(spec.server) : null,
    B.h2("Retry policy"),
    B.table([["Question", "Answer"]].concat(spec.retry)),
    B.note(spec.note[0], spec.note[1], spec.note[2] || "info"),
    statusNote("Live"),
  ].filter(Boolean);
  return page({
    file: spec.file,
    group: spec.group || "errors",
    section: "Errors",
    title: spec.title,
    description: spec.description,
    status: spec.status || "Live",
    lede: spec.lede,
    blocks,
    related: spec.related,
  });
}

/* ---------------------------------------------------------------------------
 * Webhook events — when it fires, what it carries, what a consumer does.
 * ------------------------------------------------------------------------- */

function eventFamily(spec) {
  const blocks = [
    B.p(spec.intro),
    B.h2("When it fires"),
    B.ul(spec.fires),
    B.h2("Delivery headers"),
    B.table([
      ["Header", "Value"],
      ["<code>X-Webhook-Event</code>", `<code>${spec.event}</code>`],
      ["<code>X-Webhook-Timestamp</code>", "Unix seconds; part of the signed payload."],
      ["<code>X-Webhook-Signature</code>", "<code>t=&lt;timestamp&gt;,v1=&lt;hex&gt;</code> — HMAC-SHA256 over <code>timestamp + \".\" + body</code>."],
      ["<code>User-Agent</code>", "<code>PesaGuard-Webhook-Dispatcher/2.0</code>"],
      ["<code>Content-Type</code>", "<code>application/json</code>"],
    ]),
    B.h2("Payload shape"),
    B.p(spec.payloadNote),
    B.code(spec.example, { lang: "json", label: spec.event }),
    spec.fields ? B.h3("Fields a consumer can rely on") : null,
    spec.fields ? B.table([["Field", "Meaning"]].concat(spec.fields)) : null,
    B.h2("What a consumer should do"),
    B.steps(spec.consumer),
    B.note(spec.note[0], spec.note[1], spec.note[2] || "warn"),
    statusNote("Draft"),
  ].filter(Boolean);
  return page({
    file: spec.file,
    group: "webhooks",
    section: "Webhooks",
    title: spec.title,
    description: spec.description,
    status: "Draft",
    lede: spec.lede,
    blocks,
    related: spec.related,
  });
}

/* ---------------------------------------------------------------------------
 * Security layers — threat, control, evidence, verification.
 * ------------------------------------------------------------------------- */

function securityFamily(spec) {
  const blocks = [
    B.p(spec.intro),
    B.h2("The risk being controlled"),
    B.p(spec.risk),
    B.h2("Controls in place"),
    B.table([["Control", "What it does", "Where it lives"]].concat(spec.controls)),
    B.h2("Evidence you can point at"),
    B.ul(spec.evidence),
    B.h2("How to verify it"),
    B.ol(spec.verify),
    spec.limits ? B.h2("Honest limits") : null,
    spec.limits ? B.ul(spec.limits) : null,
    B.note(spec.note[0], spec.note[1], spec.note[2] || "info"),
    statusNote(spec.status || "Live"),
  ].filter(Boolean);
  return page({
    file: spec.file,
    group: "security",
    section: "Security",
    title: spec.title,
    description: spec.description,
    status: spec.status || "Live",
    lede: spec.lede,
    blocks,
    related: spec.related,
  });
}

/* ---------------------------------------------------------------------------
 * SDK languages — install, configure, call, handle failure, test.
 * ------------------------------------------------------------------------- */

function sdkFamily(spec) {
  const blocks = [
    B.p(spec.intro),
    B.h2("Install and generate"),
    B.p(spec.generateNote),
    B.code(spec.install, { lang: "bash", label: "shell" }),
    B.h2("Configure a client"),
    B.code(spec.client, { lang: spec.lang, label: spec.clientLabel }),
    B.h2("First call"),
    B.code(spec.request, { lang: spec.lang, label: spec.requestLabel }),
    B.p(spec.requestNote),
    B.h2("Handling failures"),
    B.code(spec.errors, { lang: spec.lang, label: spec.errorLabel }),
    B.ul(spec.errorRules),
    B.h2("Patterns worth copying"),
    B.table([["Concern", "Approach"]].concat(spec.patterns)),
    spec.pitfalls ? B.h2("Pitfalls") : null,
    spec.pitfalls ? B.ul(spec.pitfalls) : null,
    B.note(spec.note[0], spec.note[1], spec.note[2] || "warn"),
    statusNote(spec.status || "Planned"),
  ].filter(Boolean);
  return page({
    file: spec.file,
    group: "sdks",
    section: "SDKs & tooling",
    title: spec.title,
    description: spec.description,
    status: spec.status || "Planned",
    lede: spec.lede,
    blocks,
    related: spec.related,
  });
}

/* ---------------------------------------------------------------------------
 * Environments — one deployment variant.
 * ------------------------------------------------------------------------- */

function environmentFamily(spec) {
  const blocks = [
    B.p(spec.intro),
    B.h2("What this environment is"),
    B.kv(spec.facts),
    B.h2("Settings that make it this environment"),
    B.table([["Setting", "Why it matters"]].concat(spec.settings)),
    spec.code ? B.code(spec.code, spec.codeOptions || { lang: "bash", label: "shell" }) : null,
    B.h2("What you can do here"),
    B.ul(spec.can),
    spec.cannot ? B.h2("What you cannot do here") : null,
    spec.cannot ? B.ul(spec.cannot) : null,
    B.note(spec.note[0], spec.note[1], spec.note[2] || "info"),
    statusNote(spec.status || "Live"),
  ].filter(Boolean);
  return page({
    file: spec.file,
    group: "environments",
    section: "Environments",
    title: spec.title,
    description: spec.description,
    status: spec.status || "Live",
    lede: spec.lede,
    blocks,
    related: spec.related,
  });
}

/* ---------------------------------------------------------------------------
 * Testing topics — one practice per page.
 * ------------------------------------------------------------------------- */

function testingFamily(spec) {
  const blocks = [
    B.p(spec.intro),
    B.h2("What this practice proves"),
    B.ul(spec.proves),
    B.h2("How to run it"),
    B.steps(spec.steps),
    spec.tableRows ? B.h2("Scenarios worth covering") : null,
    spec.tableRows ? B.table([["Scenario", "Expected outcome", "What it catches"]].concat(spec.tableRows)) : null,
    B.h2("Reading the result"),
    B.ul(spec.reading),
    spec.limits ? B.h2("Limits of this test") : null,
    spec.limits ? B.p(spec.limits) : null,
    B.note(spec.note[0], spec.note[1], spec.note[2] || "info"),
    statusNote(spec.status || "Live"),
  ].filter(Boolean);
  return page({
    file: spec.file,
    group: "testing",
    section: "Testing",
    title: spec.title,
    description: spec.description,
    status: spec.status || "Live",
    lede: spec.lede,
    blocks,
    related: spec.related,
  });
}

/* ---------------------------------------------------------------------------
 * Guides — one task per leaf page.
 * ------------------------------------------------------------------------- */

function guideFamily(spec) {
  const blocks = [
    B.p(spec.intro),
    B.h2("Before you start"),
    B.checklist(spec.before),
    ...(spec.sections || []).flatMap((section) => [
      B.h2(section.h2),
      section.p ? B.p(section.p) : null,
      section.code ? B.code(section.code, section.codeOptions || { lang: "bash", label: "shell" }) : null,
      section.ul ? B.ul(section.ul) : null,
      section.table ? B.table(section.table) : null,
      section.note ? B.note(section.note[0], section.note[1], section.note[2] || "info") : null,
    ]),
    spec.traps ? B.h2("Traps to avoid") : null,
    spec.traps ? B.ul(spec.traps) : null,
    B.h2("How to confirm it worked"),
    B.checklist(spec.confirm),
    B.note(spec.note[0], spec.note[1], spec.note[2] || "info"),
    statusNote(spec.status || "Live"),
  ].filter(Boolean);
  return page({
    file: spec.file,
    group: spec.group,
    section: spec.section,
    title: spec.title,
    description: spec.description,
    status: spec.status || "Live",
    lede: spec.lede,
    blocks,
    related: spec.related,
  });
}

/* ---------------------------------------------------------------------------
 * Operations & governance leaves — migration, changelog, support.
 * ------------------------------------------------------------------------- */

function noteFamily(spec) {
  const blocks = [
    B.p(spec.intro),
    ...(spec.sections || []).flatMap((section) => [
      B.h2(section.h2),
      section.p ? B.p(section.p) : null,
      section.kv ? B.kv(section.kv) : null,
      section.code ? B.code(section.code, section.codeOptions || { lang: "bash", label: "shell" }) : null,
      section.ul ? B.ul(section.ul) : null,
      section.ol ? B.ol(section.ol) : null,
      section.table ? B.table(section.table) : null,
      section.note ? B.note(section.note[0], section.note[1], section.note[2] || "info") : null,
    ]),
    spec.checklist ? B.h2("Checklist") : null,
    spec.checklist ? B.checklist(spec.checklist) : null,
    B.note(spec.note[0], spec.note[1], spec.note[2] || "info"),
    statusNote(spec.status || "Live"),
  ].filter(Boolean);
  return page({
    file: spec.file,
    group: spec.group,
    section: spec.section,
    title: spec.title,
    description: spec.description,
    status: spec.status || "Live",
    lede: spec.lede,
    blocks,
    related: spec.related,
  });
}

// __END__

module.exports = {
  page,
  errorFamily,
  eventFamily,
  securityFamily,
  sdkFamily,
  environmentFamily,
  testingFamily,
  guideFamily,
  noteFamily,
};
