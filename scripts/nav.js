/**
 * Navigation declaration for the docs tree.
 *
 * Group order here is the order readers see in the sidebar, in the pager and in
 * navigation.json. Every page declares a `group`; pages keep their authoring
 * order inside a group.
 */
"use strict";

const NAV_GROUPS = [
  { id: "getting-started", label: "Getting started", href: "getting-started/index.html" },
  { id: "concepts", label: "Concepts", href: "concepts/index.html" },
  { id: "guides", label: "Guides", href: "guides/index.html" },
  { id: "guides-authentication", label: "Guide · Authentication", href: "guides/authentication/index.html" },
  { id: "guides-transactions", label: "Guide · Transactions", href: "guides/transactions/index.html" },
  { id: "guides-reconciliation", label: "Guide · Reconciliation", href: "guides/reconciliation/index.html" },
  { id: "guides-anomalies", label: "Guide · Anomalies", href: "guides/anomalies/index.html" },
  { id: "guides-webhooks", label: "Guide · Webhooks", href: "guides/webhooks/index.html" },
  { id: "guides-integrations", label: "Guide · Integrations", href: "guides/integrations/index.html" },
  { id: "api", label: "API", href: "api/index.html" },
  { id: "api-reference", label: "API reference", href: "api-reference/index.html" },
  { id: "webhooks", label: "Webhooks", href: "webhooks/index.html" },
  { id: "errors", label: "Errors", href: "errors/index.html" },
  { id: "security", label: "Security", href: "security/index.html" },
  { id: "environments", label: "Environments", href: "environments/index.html" },
  { id: "testing", label: "Testing", href: "testing/index.html" },
  { id: "sdks", label: "SDKs & tooling", href: "sdks/index.html" },
  { id: "migration", label: "Migration", href: "migration/index.html" },
  { id: "changelog", label: "Changelog", href: "changelog/index.html" },
  { id: "support", label: "Support", href: "support/index.html" },
  { id: "meta", label: "Status & search", href: "status/index.html" },
];

module.exports = { NAV_GROUPS };
