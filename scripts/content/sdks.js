/**
 * SDKs and tooling — curl is live today; language clients are generated from
 * the OpenAPI document because no official library is published yet.
 */
"use strict";

const { B } = require("../engine");
const { statusNote } = require("./shared");
const { sdkFamily } = require("./factories");

const GROUP = "sdks";
const pages = [];

pages.push({
  file: "sdks/index.html",
  group: GROUP,
  section: "SDKs & tooling",
  title: "SDKs and tooling",
  description:
    "What exists today: curl plus generated clients from the OpenAPI document. No official library is published yet, and this page says so.",
  status: "Planned",
  lede:
    "PesaGuard ships no official client library today. That is a deliberate position: an official SDK is a compatibility promise, and the API surface is still stabilising around the pilot. Use curl for exploration and a generated client where you want typed models.",
  blocks: [
    B.h2("What to use right now"),
    B.table([
      ["Tool", "Status", "Best for"],
      ["curl", "Live", "Exploration, reproduction steps, runbooks and support tickets. Every example on this site is curl for that reason."],
      ["Generated client (any language)", "Live", "Typed models and compile-time safety. Generate from your deployment's own <code>/openapi.json</code> so the client matches the contract you are actually calling."],
      ["Official Python / JavaScript / TypeScript / Java SDK", "Planned", "Nothing is published. Do not depend on a package name that does not exist."],
    ]),
    B.h2("Generate a client from the contract"),
    B.code(
      'curl -sS "$PESAGUARD_API_URL/openapi.json" -o openapi.json\nnpx @openapitools/openapi-generator-cli generate \\\n  -i openapi.json -g python -o ./pesaguard-client',
      { lang: "bash", label: "generate" }
    ),
    B.p(
      "Generate from the deployment, not from this site. A generated client that matches an old mirror is worse than no client at all: it will compile, and it will be wrong."
    ),
    B.h2("Language notes"),
    B.cards([
      { href: "sdks/curl.html", title: "curl", body: "The reference tool: every example on this site runs with it.", tag: "Live", go: "Read →" },
      { href: "sdks/python.html", title: "Python", body: "Requests plus generated models; the shape PesaGuard's own backend understands.", tag: "Planned", go: "Read →" },
      { href: "sdks/javascript.html", title: "JavaScript", body: "fetch with an explicit timeout and a retry wrapper.", tag: "Planned", go: "Read →" },
      { href: "sdks/typescript.html", title: "TypeScript", body: "Generate types from the OpenAPI document for compile-time safety.", tag: "Planned", go: "Read →" },
      { href: "sdks/java.html", title: "Java", body: "Generated client with a shared object mapper and bounded retries.", tag: "Planned", go: "Read →" },
    ]),
    B.h2("What every client must handle"),
    B.checklist([
      "Timeouts on every request — an unbounded wait is an outage waiting to happen.",
      "Bounded retries with backoff and jitter, only for retryable classes (429, 5xx, connection errors).",
      "Error codes parsed from the envelope so the caller can branch without string matching.",
      "The request id captured in logs, so a failure can be traced end to end.",
      "Credentials loaded from configuration, never embedded in the client.",
    ]),
    B.note(
      "No SDK, no compatibility promise",
      "Because there is no published library, there is also no library version to pin. Treat the API contract as the only interface you depend on, and keep your own generated client under version control.",
      "warn"
    ),
    statusNote("Planned"),
  ],
  related: [
    ["OpenAPI document", "api-reference/index.html", "The contract a client is generated from."],
    ["API overview", "api/index.html", "Envelopes and status codes."],
    ["Testing", "testing/index.html", "How to prove an integration works before go-live."],
  ],
});

pages.push(sdkFamily({
  file: "sdks/curl.html",
  title: "curl",
  status: "Live",
  lang: "bash",
  clientLabel: "shell",
  requestLabel: "shell",
  errorLabel: "shell",
  description:
    "The reference tool for the API: environment-based configuration, explicit headers, and the response envelopes you will see.",
  lede:
    "curl is the tool every example on this site uses, because it shows exactly what goes on the wire — no library behaviour hiding between you and the contract.",
  intro:
    "Set three variables once and the rest of the examples in this documentation become copy-paste. Nothing here needs a client library, which is what makes it useful for runbooks and support.",
  generateNote: "No generation step is needed: curl is the client. For typed models, generate from the contract instead (see the SDK overview).",
  install:
    '# Nothing to install. Confirm you have curl and jq:\ncurl --version\njq --version   # optional, for readable output',
  client:
    'export PESAGUARD_API_URL="https://api.pesaguard.co.ke"\nexport PESAGUARD_TOKEN="<scoped-token-from-provisioning>"\n\n# Fail fast and loudly rather than hanging\ncurl -sS --max-time 15 --retry 0 \\\n  -H "Authorization: Bearer $PESAGUARD_TOKEN" \\\n  -H "Accept: application/json"',
  request:
    'curl -sS --max-time 15 "$PESAGUARD_API_URL/tenant/current" \\\n  -H "Authorization: Bearer $PESAGUARD_TOKEN" \\\n  -H "Accept: application/json" | jq .',
  requestNote:
    "A 200 proves network, TLS, credential verification, scope check and tenant resolution in one shot. If you want the failure paths too, try the same call with an empty token and confirm you get the 401 envelope.",
  errors:
    '# Capture the status and the body separately\nstatus=$(curl -sS -o /tmp/body.json -w "%{http_code}" \\\n  "$PESAGUARD_API_URL/tenant/current" \\\n  -H "Authorization: Bearer $PESAGUARD_TOKEN")\n\ncase "$status" in\n  200) jq . /tmp/body.json ;;\n  401|403) echo "credential problem: $(jq -r .error.code /tmp/body.json)" ;;\n  429|5??) echo "retryable: $(jq -r .request_id /tmp/body.json)" ;;\n  *) echo "unexpected $status"; jq . /tmp/body.json ;;\nesac',
  errorRules: [
    "Capture the HTTP status and the body separately — <code>jq</code> on an HTML error page is a confusing way to spend an afternoon.",
    "Always surface <code>request_id</code> when something fails; it is what the operator searches for.",
    "Use <code>--max-time</code>: an unbounded curl in a cron job is a stuck worker.",
    "Avoid <code>--retry</code> on writes unless you have read the idempotency page — the retry is safe, but your reconciliation of the result still needs to be deliberate.",
  ],
  patterns: [
    ["Health probing", "<code>curl -sS --max-time 5 \"$PESAGUARD_API_URL/health\"</code> and read the per-dependency status."],
    ["Reading the contract", "<code>curl -sS \"$PESAGUARD_API_URL/openapi.json\" -o openapi.json</code> then generate a client."],
    ["Reproducing a bug", "Ask for the request id first, then reproduce with the same route, credential scope and filters."],
    ["Posting a callback body", "Send <code>Content-Type: application/json</code> and <code>--data @payload.json</code> so the body is not mangled by shell quoting."],
  ],
  pitfalls: [
    "Single quotes around a <code>$VARIABLE</code> prevent expansion — a common cause of \"invalid credential\" reports.",
    "On Windows shells, line continuations differ; put the command on one line inside a script file.",
    "Never paste a real credential into a shared terminal history; export it from a secret manager or an ignored env file.",
  ],
  note: [
    "curl is the reproduction format",
    "When you report a problem, a curl command with the credential redacted is usually the fastest way to a diagnosis: it pins the method, path, headers and body exactly.",
    "tip",
  ],
  related: [
    ["SDK overview", "sdks/index.html", "What exists today and what does not."],
    ["Quickstart", "getting-started/quickstart.html", "The first three commands."],
    ["Errors", "errors/index.html", "One page per failure class."],
  ],
}));

pages.push(sdkFamily({
  file: "sdks/python.html",
  title: "Python",
  status: "Planned",
  lang: "python",
  clientLabel: "client.py",
  requestLabel: "first_call.py",
  errorLabel: "handle.py",
  description:
    "Using PesaGuard from Python today: requests plus models generated from the OpenAPI document. No official Python SDK exists yet.",
  lede:
    "There is no official Python package, and this page will not pretend otherwise. What works well today is <code>requests</code> (or <code>httpx</code>) with models generated from your deployment's OpenAPI document.",
  intro:
    "PesaGuard's own backend is Flask and SQLAlchemy, so the API is unsurprising from Python: JSON in, JSON out, conventional status codes and one error envelope. Everything below is deliberately dependency-light.",
  generateNote:
    "Generate typed models instead of hand-writing dictionaries. Point the generator at your deployment so the client matches the contract you are calling:",
  install:
    'pip install requests\n# Optional: typed models generated from the deployment contract\nnpx @openapitools/openapi-generator-cli generate \\\n  -i openapi.json -g python -o ./pesaguard_client',
  client:
    'import os, requests\n\nBASE_URL = os.environ["PESAGUARD_API_URL"]\nTOKEN = os.environ["PESAGUARD_TOKEN"]\n\nsession = requests.Session()\nsession.headers.update({\n    "Authorization": f"Bearer {TOKEN}",\n    "Accept": "application/json",\n})',
  request:
    'resp = session.get(f"{BASE_URL}/tenant/current", timeout=15)\nresp.raise_for_status()\npayload = resp.json()\nprint(payload["status"], payload["tenant_id"])',
  requestNote:
    "<code>timeout</code> is not optional. An unbounded request in a cron job or a worker becomes a stuck process, and stuck workers are how a small integration outage becomes a big one.",
  errors:
    'try:\n    resp = session.get(f"{BASE_URL}/discrepancies", params={"limit": 25}, timeout=15)\nexcept requests.Timeout:\n    raise  # retry with backoff at the caller, never silently\nexcept requests.RequestException as exc:\n    raise RuntimeError("transport failure") from exc\n\nif resp.status_code >= 400:\n    body = resp.json()\n    code = body["error"]["code"]\n    request_id = body["request_id"]\n    if code in {"RATE_LIMITED", "INTERNAL_ERROR"}:\n        raise RuntimeError(f"retryable {code} ({request_id})")\n    raise ValueError(f"{code}: {body["error"]["message"]}")',
  errorRules: [
    "Branch on <code>error.code</code> — never on the message text.",
    "Keep <code>request_id</code> in your logs and in any exception you raise.",
    "Set an explicit timeout on every call, including inside workers.",
    "Treat <code>DUPLICATE_EVENT</code> as success-with-existing-record, not as a failure.",
  ],
  patterns: [
    ["Idempotent writes", "Send the same logical event twice and assert one record. The key is derived server-side, so a retry is safe."],
    ["Retries", "Wrap transient classes only (429, 5xx, timeouts) with exponential backoff, jitter and a cap."],
    ["Pagination", "Follow <code>meta.total_pages</code> rather than looping until an empty page."],
    ["Session reuse", "One <code>requests.Session</code> per process keeps connection pooling sane under load."],
    ["Async work", "Celery or RQ workers: never hold a request open while waiting on another service."],
  ],
  pitfalls: [
    "Reading credentials from source or notebooks — use the environment or a secret manager.",
    "Catching <code>Exception</code> and continuing, which converts a failed write into silent data loss.",
    "Retrying a 4xx that cannot succeed, doubling load for no benefit.",
  ],
  note: [
    "Pinned to your deployment, not to this site",
    "Regenerate models from <code>/openapi.json</code> after every deployment change. A client generated from a stale mirror compiles perfectly and calls the wrong thing.",
    "warn",
  ],
  related: [
    ["SDK overview", "sdks/index.html", "What exists today."],
    ["API overview", "api/index.html", "Envelopes and codes."],
    ["Idempotency", "concepts/idempotency.html", "Why retries are safe."],
  ],
}));

pages.push(sdkFamily({
  file: "sdks/javascript.html",
  title: "JavaScript",
  status: "Planned",
  lang: "javascript",
  clientLabel: "client.mjs",
  requestLabel: "first-call.mjs",
  errorLabel: "handle.mjs",
  description:
    "Calling PesaGuard from JavaScript with fetch: explicit timeouts, envelope-aware errors and safe retries. No official package exists.",
  lede:
    "There is no published npm package, so this page shows the pattern that works everywhere: <code>fetch</code> with an abort timeout, a small error class built from the envelope, and bounded retries.",
  intro:
    "In Node 18+ and every modern browser, <code>fetch</code> is available without a dependency. The only thing it does not give you is a timeout — and an un-timed request is the most common cause of a hanging integration.",
  generateNote:
    "If you want typed models in a Node service, generate them from the deployment contract rather than hand-writing shapes:",
  install:
    '# Nothing required in Node 18+ or any modern browser.\n# Optional: generate a typed client from the contract\nnpx @openapitools/openapi-generator-cli generate \\\n  -i openapi.json -g typescript-fetch -o ./pesaguard-client',
  client:
    'const BASE_URL = process.env.PESAGUARD_API_URL;\nconst TOKEN = process.env.PESAGUARD_TOKEN;\n\nasync function call(path, init = {}) {\n  const controller = new AbortController();\n  const timer = setTimeout(() => controller.abort(), 15000);\n  try {\n    return await fetch(new URL(path, BASE_URL), {\n      ...init,\n      signal: controller.signal,\n      headers: {\n        Accept: "application/json",\n        Authorization: `Bearer ${TOKEN}`,\n        ...(init.body ? { "Content-Type": "application/json" } : {}),\n        ...init.headers,\n      },\n    });\n  } finally {\n    clearTimeout(timer);\n  }\n}',
  request:
    'const res = await call("/tenant/current");\nconst body = await res.json();\nif (!res.ok) throw new Error(`${body.error.code} (${body.request_id})`);\nconsole.log(body.status, body.tenant_id);',
  requestNote:
    "Read the body before deciding what to do: every failure still carries <code>error.code</code> and <code>request_id</code>, and both are needed for a support conversation.",
  errors:
    'class ApiError extends Error {\n  constructor(status, body) {\n    super(body?.error?.code ?? `HTTP_${status}`);\n    this.status = status;\n    this.code = body?.error?.code;\n    this.requestId = body?.request_id;\n  }\n  get retryable() {\n    return this.status === 429 || this.status >= 500;\n  }\n}\n\nasync function request(path, init) {\n  const res = await call(path, init);\n  const body = await res.json().catch(() => null);\n  if (!res.ok) throw new ApiError(res.status, body);\n  return body;\n}',
  errorRules: [
    "Wrap <code>fetch</code> once, so timeouts and headers cannot be forgotten in one call site.",
    "Treat <code>AbortError</code> as retryable: it means your own timeout fired, not that the request was invalid.",
    "Never log the token: not in an error message, not in a request dump.",
    "Retry only <code>retryable</code> errors, and never more than a handful of times.",
  ],
  patterns: [
    ["Retry with jitter", "<code>await sleep(2 ** attempt * 100 + Math.random() * 100)</code> up to a cap."],
    ["Pagination", "Loop on <code>meta.total_pages</code>, not until a short page appears."],
    ["Browser use", "Never ship a token to the browser. Proxy through your own backend so the credential stays server-side."],
    ["Streaming exports", "Request the CSV export endpoint and stream to disk instead of buffering it in memory."],
  ],
  pitfalls: [
    "Relying on the platform's default timeout, which is often infinite for outbound calls.",
    "Using a shared token in client-side code — visible to anyone with devtools.",
    "Assuming a rejected promise means the write did not happen: check the code before retrying.",
  ],
  note: ["Browser clients need a server", "PesaGuard credentials are bearer tokens for server-to-server use. If a browser needs data, expose it through your own backend so the credential never reaches the client.", "danger"],
  related: [
    ["TypeScript", "sdks/typescript.html", "The same pattern with generated types."],
    ["SDK overview", "sdks/index.html", "What exists today."],
    ["Idempotency", "concepts/idempotency.html", "Why a retry is safe."],
  ],
}));

pages.push(sdkFamily({
  file: "sdks/typescript.html",
  title: "TypeScript",
  status: "Planned",
  lang: "typescript",
  clientLabel: "client.ts",
  requestLabel: "first-call.ts",
  errorLabel: "errors.ts",
  description:
    "Generate types from the deployment contract, then write calls that cannot compile against the wrong field name.",
  lede:
    "TypeScript's value here is not decoration: generated types catch a renamed field at build time instead of at 03:00 in a worker. Generate them from your deployment's contract, not from a copied sample.",
  intro:
    "The envelope is uniform, so one small generic wrapper covers every route: parse the body, narrow on <code>status</code>, and throw a typed error that carries the code and the request id.",
  generateNote: "Generate the client from the deployment so the types match the contract you actually call:",
  install:
    'npx @openapitools/openapi-generator-cli generate \\\n  -i openapi.json -g typescript-fetch -o ./src/pesaguard\nnpx tsc --noEmit',
  client:
    'type Envelope<T> =\n  | { status: "success"; data: T; request_id: string; tenant_id: string; meta?: PageMeta }\n  | { status: "error"; error: { code: string; message: string; details?: unknown }; request_id: string };\n\ninterface PageMeta { page: number; limit: number; total: number; total_pages: number }\n\nconst BASE_URL = process.env.PESAGUARD_API_URL!;\nconst TOKEN = process.env.PESAGUARD_TOKEN!;',
  request:
    'export class ApiError extends Error {\n  constructor(readonly code: string, readonly status: number, readonly requestId: string) {\n    super(`${code} (${requestId})`);\n  }\n}\n\nexport async function call<T>(path: string, init: RequestInit = {}): Promise<T> {\n  const controller = new AbortController();\n  const timer = setTimeout(() => controller.abort(), 15_000);\n  try {\n    const res = await fetch(new URL(path, BASE_URL), {\n      ...init,\n      signal: controller.signal,\n      headers: {\n        Accept: "application/json",\n        Authorization: `Bearer ${TOKEN}`,\n        ...(init.body ? { "Content-Type": "application/json" } : {}),\n      },\n    });\n    const body = (await res.json()) as Envelope<T>;\n    if (body.status === "error") throw new ApiError(body.error.code, res.status, body.request_id);\n    return body.data;\n  } finally {\n    clearTimeout(timer);\n  }\n}',
  requestLabel: "client.ts",
  requestNote:
    "Narrowing on <code>status</code> rather than the HTTP code means a 4xx or 5xx can never be mistaken for a payload — the type system enforces the envelope contract.",
  errors:
    'try {\n  const tenant = await call<{ tenant_id: string }>("/tenant/current");\n  console.log(tenant.tenant_id);\n} catch (err) {\n  if (err instanceof ApiError) {\n    // branch on err.code only, never on err.message\n    if (["RATE_LIMITED", "INTERNAL_ERROR"].includes(err.code)) await scheduleRetry(err.requestId);\n    else report(err.code, err.requestId);\n    return;\n  }\n  throw err; // transport failure: let the caller decide\n}',
  errorLabel: "usage.ts",
  errorRules: [
    "Model the envelope as a discriminated union so an error can never be read as data.",
    "Branch on the code; treat <code>message</code> as log text only.",
    "Keep <code>request_id</code> on the error object so callers can log it without re-parsing.",
    "Enable <code>strict</code> and <code>noUncheckedIndexedAccess</code> — the point of the exercise is compile-time certainty.",
  ],
  patterns: [
    ["Pagination", "Type <code>meta</code> and iterate to <code>total_pages</code> rather than a fixed page count."],
    ["Retries", "A generic <code>withRetry</code> wrapper that only retries codes you list explicitly."],
    ["Config", "Validate <code>PESAGUARD_API_URL</code> and the token at startup; fail fast, not at the first request."],
    ["Test doubles", "Type-level fakes of the envelope keep unit tests honest without inventing provider behaviour."],
  ],
  pitfalls: [
    "Casting the response with <code>as any</code>, which discards exactly the safety you generated types for.",
    "Assuming a thrown fetch error means the write failed — check the code, then reconcile.",
    "Committing generated clients without a note recording which deployment contract they came from.",
  ],
  note: ["Regenerate after every contract change", "Generated types are only as current as the contract they came from. Record the spec version in your client's README so the next engineer knows what to regenerate.", "warn"],
  related: [
    ["JavaScript", "sdks/javascript.html", "The same pattern without types."],
    ["OpenAPI reference", "api-reference/index.html", "The contract to generate from."],
    ["API overview", "api/index.html", "Envelopes and status codes."],
  ],
}));

pages.push(sdkFamily({
  file: "sdks/java.html",
  title: "Java",
  status: "Planned",
  lang: "java",
  clientLabel: "PesaGuardClient.java",
  requestLabel: "Main.java",
  errorLabel: "ErrorHandling.java",
  description:
    "Calling PesaGuard from Java: a generated client from the OpenAPI document, a shared HTTP client with timeouts, and envelope-aware errors.",
  lede:
    "No official Java library is published. Generate the client from your deployment's OpenAPI document, then wrap it in one small layer that applies timeouts, retries and error translation consistently.",
  intro:
    "The API is ordinary JSON over HTTPS, so a generated client plus <code>java.net.http.HttpClient</code> is enough. What matters is not the library choice — it is that timeouts, retry classification and credential handling are decided once rather than per call site.",
  generateNote: "Generate a client bound to the contract you actually call:",
  install:
    'npx @openapitools/openapi-generator-cli generate \\\n  -i openapi.json -g java -o ./pesaguard-client \\\n  --library native --api-package ke.pesaguard.client.api \\\n  --model-package ke.pesaguard.client.model',
  client:
    'HttpClient http = HttpClient.newBuilder()\n    .connectTimeout(Duration.ofSeconds(5))\n    .build();\n\nString baseUrl = System.getenv("PESAGUARD_API_URL");\nString token = System.getenv("PESAGUARD_TOKEN");\n\nHttpRequest.Builder auth = HttpRequest.newBuilder()\n    .timeout(Duration.ofSeconds(15))\n    .header("Accept", "application/json")\n    .header("Authorization", "Bearer " + token);',
  request:
    'HttpRequest request = auth.uri(URI.create(baseUrl + "/tenant/current")).GET().build();\nHttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());\n\nif (response.statusCode() >= 400) {\n    throw ApiException.from(response.statusCode(), response.body());\n}\nSystem.out.println(response.body());',
  requestNote:
    "Parse the body into the envelope type rather than a raw map, so a renamed field fails at compile time or at least at the boundary — not three services later.",
  errors:
    'public final class ApiException extends RuntimeException {\n    private final String code;\n    private final String requestId;\n\n    public static ApiException from(int status, String body) {\n        JsonNode json = mapper.readTree(body);\n        return new ApiException(\n            json.path("error").path("code").asText("HTTP_" + status),\n            json.path("request_id").asText(""));\n    }\n\n    public boolean retryable() {\n        return code.equals("RATE_LIMITED") || code.equals("INTERNAL_ERROR");\n    }\n}',
  errorRules: [
    "Translate the envelope into one exception type carrying <code>code</code> and <code>request_id</code>.",
    "Never branch on <code>message</code>: it is log text and changes without notice.",
    "Retry only the classes you have listed as retryable, with backoff and a cap.",
    "Log the request id at the point of failure, not only where it is caught.",
  ],
  patterns: [
    ["Connection reuse", "One <code>HttpClient</code> per application, not per request: pools and DNS caching depend on it."],
    ["Timeouts", "<code>HttpRequest.timeout(...)</code> per request, plus a <code>connectTimeout</code> on the client."],
    ["Batch endpoints", "Use the bulk discrepancy endpoints rather than looping detail calls."],
    ["Structured logging", "Put <code>request_id</code> on the logging context so a failure is traceable across services."],
  ],
  pitfalls: [
    "Default <code>HttpClient</code> without a request timeout, which waits indefinitely on a hung peer.",
    "Deserialising straight into a domain entity, losing the envelope and therefore the error code.",
    "Holding credentials in a static field that is captured in a heap dump.",
  ],
  note: ["Generated, then wrapped", "Keep the generated client thin and unedited so a regeneration is painless, and put your retry and error policy in the wrapper you own.", "warn"],
  related: [
    ["SDK overview", "sdks/index.html", "What exists today."],
    ["OpenAPI reference", "api-reference/index.html", "The contract to generate from."],
    ["Errors", "errors/index.html", "One page per failure class."],
  ],
}));

// __END__

module.exports = pages;
