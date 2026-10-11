/**
 * Navigation declaration for the docs tree.
 *
 * Group order here is the order readers see in the sidebar, in the pager and in
 * navigation.json. Every page declares a `group`; pages keep their authoring
 * order inside a group.
 */
"use strict";

const NAV_GROUPS = [
  { id: "getting-started", label: "Getting started", href: "getting-started/" },
  { id: "concepts", label: "Concepts", href: "concepts/" },
  { id: "guides", label: "Guides", href: "guides/" },
  { id: "guides-authentication", label: "Guide · Authentication", href: "guides/authentication/" },
  { id: "guides-transactions", label: "Guide · Transactions", href: "guides/transactions/" },
  { id: "guides-reconciliation", label: "Guide · Reconciliation", href: "guides/reconciliation/" },
  { id: "guides-anomalies", label: "Guide · Anomalies", href: "guides/anomalies/" },
  { id: "guides-webhooks", label: "Guide · Webhooks", href: "guides/webhooks/" },
  { id: "guides-integrations", label: "Guide · Integrations", href: "guides/integrations/" },
  { id: "api", label: "API", href: "api/" },
  { id: "api-reference", label: "API reference", href: "api-reference/" },
  { id: "webhooks", label: "Webhooks", href: "webhooks/" },
  { id: "errors", label: "Errors", href: "errors/" },
  { id: "security", label: "Security", href: "security/" },
  { id: "environments", label: "Environments", href: "environments/" },
  { id: "testing", label: "Testing", href: "testing/" },
  { id: "sdks", label: "SDKs & tooling", href: "sdks/" },
  { id: "migration", label: "Migration", href: "migration/" },
  { id: "changelog", label: "Changelog", href: "changelog/" },
  { id: "support", label: "Support", href: "support/" },
  { id: "meta", label: "Status & search", href: "status/" },
];

module.exports = { NAV_GROUPS };
