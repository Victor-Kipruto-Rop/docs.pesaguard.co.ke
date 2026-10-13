# PesaGuard docs (docs.pesaguard.co.ke)

Static developer documentation for the PesaGuard reconciliation platform.
No build step: pages are hand-written HTML sharing one stylesheet and one
script. Each page declares its own title and description honestly; anything
without an adapter, test suite or shipped behaviour is labelled planned or
not-started rather than implied.

## Site address

The intended canonical host is `https://docs.pesaguard.co.ke`. DNS and
certificate provisioning remain hosting-provider configuration; a `CNAME`
file does not configure DNS or publish the site.

Product and API links use their intended `.co.ke` origins. The status link
uses `status.pesaguard.co.ke`. The support quicklinks open
`support@pesaguard.co.ke` in the visitor's email client. Links in this
repository are not evidence of DNS, deployment, TLS, availability or API
reachability; verify each target before using it.

The site uses the PesaGuard public-site green-and-white brand, defaults to
light mode, and provides a theme toggle in the shared header. A selected theme
is saved in this browser for future visits.

## Preview

```powershell
npm run serve
# http://localhost:4173/
```

Documentation pages use clean URLs: leaf pages omit `.html` and section
landing pages end in `/`. The local preview resolves these URLs to the static
HTML files and redirects legacy `.html` URLs to their clean equivalents.

## Detailed integration playbooks

The Guides section includes detailed, contract-first playbooks for the platform lifecycle, API authentication and credential safety, Customer Dashboard integration, reconciliation operations, webhook engineering, production go-live, troubleshooting, Customer Dashboard operations, data quality and ingestion, risk alert review, and M-Pesa integration. Start at [docs.pesaguard.co.ke/guides](https://docs.pesaguard.co.ke/guides/). These guides distinguish conceptual patterns from verified API behavior and direct developers to [developers.pesaguard.co.ke](https://developers.pesaguard.co.ke/) for enabled developer workflows and [api.pesaguard.co.ke](https://api.pesaguard.co.ke/) plus the published OpenAPI contract for exact request/response behavior.

## Validate

When adding or renaming pages, run `node scripts/build-search-index.js` to
refresh the search indexes and sitemap. `npm run check` walks every internal
link in the HTML tree and fails on a target that does not exist. It also checks
canonical URLs, search results and sitemap coverage for extension-bearing or
missing page URLs. Images, fonts and the OpenAPI files are covered by the same
walk.

## Deploy

The `Docs checks` workflow validates page links, metadata, the OpenAPI mirror,
and documentation drift before staging and deploying the public site to
Cloudflare Pages. Pull requests validate but do not deploy. Configure the
Cloudflare Pages project as `docs-pesaguard`, add repository secrets
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (Account Cloudflare Pages:
Edit), and bind `docs.pesaguard.co.ke` to the project in Cloudflare Pages.
Configure the custom domain's DNS there and verify its HTTPS response after
the first release. Disable the previous GitHub Pages publishing source and
move the custom-domain DNS record to Cloudflare as part of the host cutover.

## Status labels

- `Live`: behaviour verified in the repository (tests, routes, or docs).
- `Draft`: design intent recorded here; not yet verified against shipped code.
- `Planned`: named roadmap scope with no implementation.

## API contract and checks

`api-reference/openapi.json` is generated. Edit the hand-written parts (summaries, descriptions, info) in `api-reference/openapi.base.json`, then rebuild. `api-reference/openapi.yaml` is a JSON-compatible YAML mirror of the same canonical contract; the parity check fails if the downloads diverge:

```sh
# needs the backend checkout and its Python dependencies
python scripts/dump-flask-routes.py ..     # api-reference/routes.snapshot.json
python scripts/generate-openapi.py  ..     # api-reference/openapi.json
```

Checks (Node only, no dependencies):

- `npm run check` validates links, metadata, OpenAPI structure, and exact JSON/YAML contract parity.
- `npm run check:drift` compares the docs and the spec with the backend's real routes.
- `npm run check:openapi` validates OpenAPI structure and JSON/YAML parity.
- `npm run check:strict` fails on warnings and drift too.

AI-assistant indexes are published at `llms.txt` and `llms-full.txt`. They
repeat the same contract and environment caveats as the human-readable pages;
they are indexes, not an independent source of API behavior.

## Connection to the backend

The docs are static and stay that way: there is no docs backend. The API
reference targets `https://api.pesaguard.co.ke` and is rebuilt from
the canonical ASGI entry point (`canonical_app:app`) in
`pesaguard_backend_pipeline` in `Victor-Kipruto-Rop/api.pesaguard`. That entry
point is FastAPI and mounts the dashboard and authentication Flask apps through
WSGI; both the direct FastAPI routes and mounted Flask routes belong in the
route inventory.

```
backend push to main (backend routes, contracts, or dependency changes)
  -> backend .github/workflows/sync-docs.yml (notify-docs job)
       sends repository_dispatch "backend-updated" to this docs repository
  -> this repo .github/workflows/sync-openapi.yml
       regenerates api-reference/openapi.json and routes.snapshot.json,
       runs `npm run check`, opens the pull request "Sync API reference ..."
```

- `sync-openapi.yml` also runs daily and from the Actions tab, so a missed
  dispatch or an unset token only delays the update.
- A change that only moves the recorded backend commit is discarded
  (`scripts/discard-stamp-only-changes.py`), so pull requests appear only
  when a route, parameter or response changed.
- Merge the sync pull request, then run `npm run check:drift` to see which
  new operations still need a hand-written page.
- The route generator needs `DATABASE_URL` and `PESAGUARD_API_URL`
  set (any values; nothing is contacted) and `jsonschema` installed, which the
  backend's `requirements.txt` omits.

Repository settings needed once: Actions may create pull requests in this docs
repository, and the backend has a `DOCS_DISPATCH_TOKEN` secret (a fine-grained
token with Contents read/write on this repo only). Without the token, the
daily schedule and manual workflow dispatch still refresh the API reference.

Do not run `scripts/generate-pages.js`: it predates the current pages and overwrites them.
