/**
 * Security — authentication, authorization, keys, webhooks, encryption,
 * isolation, data protection and responsible disclosure.
 */
"use strict";

const { B } = require("../engine");
const { statusNote } = require("./shared");
const { securityFamily } = require("./factories");

const GROUP = "security";
const pages = [];

pages.push({
  file: "security/index.html",
  group: GROUP,
  section: "Security",
  title: "Security",
  description:
    "Implemented PesaGuard backend security controls, repository evidence, and deployment responsibilities for authentication, authorization, tenant isolation, encryption, and audit.",
  status: "Live",
  lede:
    "This section describes security controls visible in the PesaGuard backend, the evidence available in its code and tests, and deployment responsibilities that cannot be verified from source alone. A control marked live is not a certification or a guarantee about every customer deployment.",
  blocks: [
    B.h2("The layers"),
    B.cards([
      { href: "security/authentication.html", title: "Authentication", body: "Short-lived JWT bearer tokens and tenant-bound API keys protect configured routes; callback authentication is integration-specific.", go: "Read →" },
      { href: "security/authorization.html", title: "Authorization", body: "Server-side route, tenant, and resource checks constrain actions available to each principal.", go: "Read →" },
      { href: "security/api-key-security.html", title: "API key security", body: "Tenant-bound keys are checked by digest and constrained by state, optional expiry, role grants, and explicit scopes.", go: "Read →" },
      { href: "security/webhook-security.html", title: "Webhook security", body: "Outbound signatures and destination checks differ from verification required for inbound provider callbacks.", go: "Read →" },
      { href: "security/encryption.html", title: "Encryption", body: "Application-level encryption protects selected provider configuration and payload values; infrastructure encryption is deployment-specific.", go: "Read →" },
      { href: "security/tenant-isolation.html", title: "Tenant isolation", body: "Authenticated tenant context and route/query helpers can enforce tenant- and resource-scoped access.", go: "Read →" },
      { href: "security/data-protection.html", title: "Data protection", body: "Redaction and field protection are path-specific; a versioned retention policy requires operational approval and enforcement.", go: "Read →" },
      { href: "security/responsible-disclosure.html", title: "Responsible disclosure", body: "How to report a vulnerability safely, and what happens next.", go: "Read →" },
    ]),
    B.h2("The posture in one table"),
    B.table([
      ["Control area", "Implemented behavior", "Deployment responsibility"],
      ["Authentication", "JWT verification checks signature, issuer, audience, time claims, token ID, tenant, and current account/session state; API keys are resolved by digest.", "Use production signing keys and review authentication requirements for each exposed route."],
      ["Authorization", "Protected routes can enforce named permissions, tenant access, and resource-specific permissions server-side.", "Assign only necessary roles and scopes; review elevated access."],
      ["Webhooks", "Outbound destinations are checked for HTTPS and unsafe addresses; inbound callback checks are provider-specific.", "Verify signatures, reject replay where timestamps are available, and secure receiver endpoints."],
      ["Encryption", "Application helpers encrypt selected payload values and provider configuration.", "Configure TLS termination and storage/backup encryption; protect and rotate keys."],
      ["Data protection", "Audit and provider redaction paths exist, along with a versioned retention policy.", "Confirm approval, cleanup jobs, storage lifecycle rules, legal holds, and deletion."],
      ["Tenant isolation", "Authenticated tenant context and route/query helpers can enforce scoped access.", "Preserve tenant scope in every route, query, job, cache, export, and administrative path."],
      ["Audit evidence", "Entries can be append-only, hash-linked, integrity-checked, and optionally signed.", "Configure signing keys and immutable archive destinations; monitor integrity checks."],
    ]),
    B.h2("Deployment boundary"),
    B.ul([
      "Use HTTPS, configure trusted-proxy handling deliberately, and store production secrets in a protected secret-management system.",
      "Restrict CORS to intended origins, keep production authentication enabled, and do not enable development-only bypasses in production.",
      "Database, object-storage, queue, and backup encryption; network segmentation; host patching; key custody; monitoring; and operational retention enforcement depend on the deployment and are not proven by application source alone.",
      "No third-party security certification is represented here. Request deployment-specific assurance information before treating these pages as contractual commitments.",
    ]),
    B.h2("Repository evidence"),
    B.ul([
      "JWT lifecycle and refresh-token behavior: <code>tests/test_auth_lifecycle.py</code>.",
      "Authorization enforcement: <code>tests/test_rbac_enforcement.py</code>.",
      "Audit redaction and append-only behavior: <code>tests/test_action_audit.py</code>.",
      "Payload encryption and identifier tokenization: <code>tests/test_data_protection.py</code>.",
    ]),
    B.note(
      "Control scope matters",
      "Repository tests establish behavior for the paths they exercise; they do not prove that every route, dependency, or production setting has been reviewed. Consult the endpoint contract and the relevant integration guide because authentication and callback verification vary by route and provider.",
      "warn"
    ),
    statusNote("Live"),
  ],
  related: [
    ["Tenant isolation", "security/tenant-isolation.html", "The boundary that carries everything else."],
    ["Responsible disclosure", "security/responsible-disclosure.html", "Reporting a vulnerability."],
    ["Authentication (API)", "api/authentication.html", "The credential model."],
  ],
});

// __END__

module.exports = pages;
