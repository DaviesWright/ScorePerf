# CUSTOMIZATIONS

Internal record of how **ScoReview Performance** — a product of
**Senrab Technologies** — differs from the stock Horilla HR release it was
based on, and where our customizations live. This is a living document —
update it whenever you add or change a customization.

## Origin

| Field | Value |
|---|---|
| Product name | **ScoReview Performance** |
| Brand | **ScoReview** |
| Company | **Senrab Technologies** |
| Source | https://github.com/horilla/horilla-hr |
| Branch we copied from | `2.0` |
| Commit/tag at copy time | `c49300c8f` (tip of `2.0`) |
| Date copied | 2026-11-03 |
| License | LGPL-2.1 (see "License notes") |
| Owner | **Senrab Technologies** |

ScoReview Performance is maintained internally by Senrab Technologies as
its own product. We do not track Horilla upstream. The commit/tag above is
recorded only for historical context (e.g. security advisories that may
apply to that version).

Git layout: `main-custom` is the working branch. `2.0` is a frozen copy of
upstream at copy time and is not committed to. An `upstream` remote
(push disabled) is kept only so we can look up or cherry-pick security
fixes if we choose to.

## Naming conventions

Keep these consistent across the codebase, UI, docs, and infra. When in
doubt, check here first.

| Context | Use | Notes |
|---|---|---|
| User-facing product name | **ScoReview Performance** | Full name in UI, docs, emails |
| Short brand reference | **ScoReview** | After first mention, or where space is tight |
| Company / legal entity | **Senrab Technologies** | Contracts, license headers, footers |
| Repo / package slug | `scoreview-performance` | Lowercase, hyphenated. The GitHub repo is currently `DaviesWright/ScorePerf`; rename pending |
| Django app name | `scoreview_performance` | Lowercase, underscore |
| Environment prefix | `SCOREVIEW_` | For env vars, where applicable |

> Note: the brand is spelled "ScoReview" (one 'c'), but the slug and app
> name use `scoreview`. This is intentional and fixed — do not "correct"
> it to `sco-review` or `score_review` anywhere.

## Brand removal policy

All references to Horilla must be expunged from the local setup. This is
handled in two layers:

**Layer 1 — user-visible branding (required).** Replace all Horilla
branding the end user sees: login page, app title, favicon, emails,
footer. Achieved via Horilla's White Labelling feature plus template and
static overrides. See "Product identity" below.

**Layer 2 — infrastructure naming (as required).** Rename Horilla-derived
names in deployment config: database name, database user, Docker image
tags, environment variable prefixes. These are not user-visible but should
match ScoReview naming for operational clarity.

**Status (rebrand run 2026-11-03).** The word "Horilla" was replaced with
"ScoReview" in every tracked text file: Python strings, docstrings and comments,
templates, JavaScript, translation catalogs (`.po`), JSON demo and mail data,
Dockerfile labels, Compose files, scripts and the README (about 1,760
replacements in about 180 files). Sample email addresses on the upstream
project's domain (written `@horilla` plus `.com`) were changed to `@example.com`,
a reserved domain nobody owns.

- The system user `Horilla Bot` is now `ScoReview Bot`. Code looks it up by
  username, so migration `scoreview_performance/migrations/0002_rename_bot_user.py`
  renames the existing row.
- `.po` files changed but `.mo` files are not committed. Run `compilemessages`
  at deploy time (needs GNU gettext).

**Deliberately left as "Horilla" or "horilla"** (renaming would break the app
or falsify provenance):

- Code identifiers: the `horilla/` package and `from horilla…` imports, the
  `horilla_*` apps, `Horilla*` classes, the `createhorillauser` command, the
  `horillafilters` template-tag library, URL and template names.
- `HORILLA_*` environment variables and the `horilla_db` / `horilla_user`
  Docker database defaults (Layer 2, not done yet).
- The health check's `"product": "horilla"` (mobile and API clients may rely on
  it), the cache `KEY_PREFIX`, and the LDAP default DNs.
- URLs and domains: `docs.horilla.com` and `www.horilla.com` (in-app help links;
  override with `DOC_BASE_URL` in `local_settings.py`) and every
  `github.com/horilla/…` link.
- `LICENSE` and the upstream project documents `CHANGELOG.md`, `SECURITY.md`,
  `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`, plus `.github/` and
  `docker/dockerhub/`. These describe the upstream project and its channels.
  `SECURITY.md` still sends reports to upstream, so replace it with Senrab's own
  process before external release.

When writing new text that names the upstream project (provenance, licence),
keep the word "Horilla". Do not re-run a blanket replacement over this file.

**Explicitly out of scope: renaming the `horilla/` Python package and
directory.** Django package renaming requires coordinated changes to
`DJANGO_SETTINGS_MODULE`, `ROOT_URLCONF`, `WSGI_APPLICATION`, `manage.py`,
`wsgi.py`, and every internal `from horilla.xxx import` statement. A single
missed reference breaks startup. The cost outweighs the benefit since the
package name is not user-visible. This decision can be revisited if a
hard requirement emerges.

## Module activation

ScoReview Performance ships with a focused module set. Other Horilla
modules are suppressed but not removed — data is retained and modules can
be re-enabled at any time.

**Active modules:**

| Module | Horilla module | Notes |
|---|---|---|
| Employee database (HRIS) | Core HR / Employee | Foundation module, always on |
| Leave Management | Leave | |
| Performance Management | Performance / OKR | |
| Time & Attendance | Attendance | With biometric device integration |
| Reports & dashboards | Reports / Dashboard | All existing reports retained |

**Suppressed modules** (Recruitment, Onboarding, Payroll, Assets, Help
Desk, and others not listed above):

**Hidden now (decided 2026-11-03): Payroll, Recruitment, Onboarding,
Offboarding.** Hidden for everyone, superusers included. Permissions alone
cannot do that, because superusers bypass them. How it works:

- `HIDDEN_MODULES` in `horilla/settings/local_settings.py` lists the four
  modules. They are removed from `SIDEBARS`, so no sidebar entries.
- `scoreview_performance/middleware.py` answers 404 for their URLs:
  `/<module>/`, `/api/v1/<module>/` and `/dashboard/api/<module>-…`.
- `scoreview_performance/static/scoreview_performance/hidden_modules.css`
  hides leftover entry points: quick-create buttons, dashboard cards and
  chart cards, and the module sections in Settings.
- The apps stay in `INSTALLED_APPS`. Tables, migrations, data and foreign keys
  are untouched, because other apps (employee, attendance, base) reference
  them. Nothing is deleted.
- Known gap: the background scheduler still registers these modules' jobs
  (for example automatic payslips and recruitment close). They have no data to
  act on while the modules are unused.
- To bring a module back: delete it from `HIDDEN_MODULES` and delete its
  selectors from `hidden_modules.css`. Then grant roles the permissions they
  need under `Settings → Employee Permissions`.

Other modules not listed as active (Assets, Help Desk, Projects) are not
hidden yet; use Employee Permissions per role, or add them to
`HIDDEN_MODULES`, if they should be.

## Time & Attendance integration

Biometric device integration is part of the active scope.

| Field | Value |
|---|---|
| Device brand(s) | `<e.g. e-Time Office / Dahua / other>` |
| Integration path | `<native Horilla support / custom app in scoreview_performance>` |
| Where configured | `Attendance → Biometric Devices` (native) or `scoreview_performance/` (custom) |
| Employee matching | Badge ID / Emp Code mapped to Horilla employee record |
| Sync method | `<manual fetch / scheduled pull>` |

If the device brand is natively supported by Horilla (e-Time Office,
Dahua), configure it through the Attendance module UI. If not, implement
the integration inside `scoreview_performance/` rather than modifying core
Attendance code.

## How we customize (policy)

Changes are made in this order of preference. Prefer the highest option
that solves the problem.

1. **Config / `.env` / settings** — branding, company name, email,
   timezone, feature flags. No code change where possible.
2. **Template & static overrides** — logo, colors, CSS. Live in
   `scoreview_performance/templates/` and
   `scoreview_performance/static_overrides/`, wired into settings ahead of
   upstream (see "Template & static overrides"). Avoid editing original
   template files when an override will do.
3. **Own Django app(s)** — new features, custom models/fields, linked to
   existing models via FK/OneToOne where needed. Do not add fields to
   upstream models.
4. **Core edits** — when 1–3 genuinely can't work. Prefer small, localized
   edits over sprawling ones, tag them `# CUSTOM:`, and log every one in the
   table below so future maintainers know where to look.

The ordering is about **maintainability**, not upstream merging: fewer
touched core files means easier upgrades of Django, Python deps, and the
underlying Horilla codebase when *we* choose to update it.

## Product identity

Where the ScoReview Performance name and Senrab Technologies branding
appear, and what drives each one. Keep this in sync when branding changes.

| Surface | Driven by | Notes |
|---|---|---|
| App name / title | `<.env var or setting>` | `<e.g. SITE_NAME>` |
| Logo | HQ Company record + `static/<path>` | Upload via `Settings → Base → Company`, `Is Hq = True` |
| Favicon | `static/<path>` | Override |
| Email sender name | `<.env var>` | Should read as Senrab Technologies or ScoReview Performance |
| Login / landing page copy | `templates/<path>` + White Labelling | Override |
| Footer / legal text | `templates/<path>` | Include Senrab Technologies as the company |
| Copyright line | `templates/<path>` | `© <year> Senrab Technologies` |

## Custom Django app(s)

Our features live here. This is where most new work should go.

| App | Purpose | Depends on / references |
|---|---|---|
| `scoreview_performance/` | ScoReview Performance custom features; template and static overrides; custom biometric integration if needed. Currently an empty scaffold (no models, views or urls yet) | `<models via FK/OneToOne>` |

## Core file edits

Files in the original Horilla codebase that we have modified. Keep this
list short and accurate — it is the map of where to look when something
behaves unexpectedly. `grep -rn "CUSTOM:" .` finds tagged lines.

| File | What changed | Why | Date | Author |
|---|---|---|---|---|
| `horilla/settings/local_settings.py` | Registers `scoreview_performance` in `INSTALLED_APPS`, adds our templates dir to the template loaders, adds `static_overrides` to `STATICFILES_DIRS`, turns on `WHITE_LABELLING`, sets `HIDDEN_MODULES`, trims `SIDEBARS` and adds `HideModulesMiddleware` | Upstream's official client-override hook; the only settings file we edit | 2026-11-03 | paa.barnes |
| `.dockerignore` | Removed the `local_settings.py` line | Otherwise the Docker image ships without our settings | 2026-11-03 | paa.barnes |
| `static/images/ionicons/package.json` | `svgo` devDependency `1.3.2` to `2.8.4` | Closes Dependabot alerts GHSA-2p49-hgcm-8545, GHSA-4vpr-x523-8j87, GHSA-w27v-7q3p-w38r. Vendored icon-package metadata with no build scripts shipped, so nothing runs it | 2026-11-03 | paa.barnes |

Gotcha: `horilla/settings/__init__.py` wraps the `local_settings` import in
`try/except ImportError`. A bad import in that file silently disables it,
`addons.py` included. After editing it, run `python manage.py check` and
confirm the overrides still apply.

## Template & static overrides

| Override file | Replaces | Registered in |
|---|---|---|
| `scoreview_performance/templates/<same path as upstream>` | The upstream template at that path | `_TEMPLATE_LOADERS` slot 1 in `horilla/settings/local_settings.py` |
| `scoreview_performance/static_overrides/<same path as upstream>` | The upstream static file at that path | `STATICFILES_DIRS[0]` in `horilla/settings/local_settings.py` |
| `scoreview_performance/templates/index.html` | `horilla_theme/templates/index.html` (base layout) | Template loader slot above. A full copy with 4 lines added at the end of `<head>` (tagged `CUSTOM:`) that load `colors.css`, `hidden_modules.css` and `colors.js`. Re-apply those lines if you ever refresh this copy from upstream |

Template lookup order: DB templates (`horilla_dbtemplate`), then
`scoreview_performance/templates`, then `horilla_theme/templates`, then
every app's `templates/`, then the root `templates/`. Static lookup:
`static_overrides`, then `static/`, then app static dirs. Verified
2026-11-03 for `403.html`, `common_form.html`, `login.html` and a static
image. Note that `login.html` and `common_form.html` also exist in
`horilla_theme/templates`, and our copy still wins.

Dir names are deliberately not `static/`: a `static/` folder inside the app
would also be picked up by the app-directories finder and collide.

## Colours and charts

| Piece | Where | What it does |
|---|---|---|
| Brand theme | `scoreview_performance/migrations/0001_scoreview_theme.py` | Creates "ScoReview Theme" (`HorillaColorTheme`) and makes it the default for all companies. Brand tokens: logo blue `#5B97F5` (`primary_500`), button blue `#2157D4` (`primary_600`, the primary on senrabconsultech.com, white text 6.3:1), charcoal `#383838`. Applied by `migrate`, so every environment gets it. On a fresh database it also stops upstream's 13 sample themes from being created, because it runs before them |
| Vivid charts | `scoreview_performance/static/scoreview_performance/colors.js` | Wraps the global `Chart` so every chart's dataset colours come out vivid (pastels lifted, greys replaced from a 10-colour palette that includes brand emerald `#16C57F` and cyan `#00B8CC`). Upstream chart scripts are untouched, so new charts are covered automatically. Also sets `--sco-accent` per dashboard tile |
| Colourful tiles | `scoreview_performance/static/scoreview_performance/colors.css` | Coloured top border, tint and count colour on `.oh-card-dashboard` tiles |

Branding source: https://senrabconsultech.com/ (parent group "Senrab ConsulTech Group", subsidiaries Senrab Technologies and PeopleOptix; font Outfit, foreground `#151B28`, accent cyan `#00B8CC`). That site's favicon is a stock placeholder, so there is no favicon to reuse.

Notes: Chart.js is loaded from `cdn.jsdelivr.net` by upstream, so charts need internet access. After adding files under a `static/` folder, run `collectstatic` and restart the server, because WhiteNoise indexes files at startup.

## Config-only changes

No code impact, but useful context for anyone standing up a new environment.

| Setting | Location | Value / note |
|---|---|---|
| `WHITE_LABELLING` | `horilla/settings/local_settings.py` | `True` (applied 2026-11-03) — replaces user-visible Horilla branding with the HQ company's name and logo. The HQ company record is data, not code: set its name and logo in `Settings → Base → Company` |
| `TIME_ZONE` | `.env` | `Africa/Accra` (local dev; confirm for production) |
| `DB_ENGINE`, `DB_NAME` | `.env` | Local dev: SQLite, `TestDB.sqlite3`. Production: Postgres |
| `POSTGRES_DB` | Docker Compose / `.env` | `scoreview_db` (if infrastructure rename performed) |
| `POSTGRES_USER` | Docker Compose / `.env` | `scoreview_user` (if infrastructure rename performed) |
| `<SETTING>` | `.env` / `settings.py` | `<value>` |

## Dependency & version notes

Record anything we've pinned, upgraded, or held back deliberately, and why.
Especially important since we're not tracking upstream — upgrades are now
our responsibility.

| Package | Version | Note |
|---|---|---|
| Python | 3.12.x | Upstream supports 3.12 to 3.14; 3.15 does not work yet (`spacy`) |
| `pdfkit` | `1.0.0` | Open Dependabot alert GHSA-9g3x-6x24-vf9f (`from_string` script execution and local-file read). **No patched release exists** (1.0.0 is the latest). Mitigated in code: every PDF goes through `base/methods.py:generate_pdf`, which refuses HTML that fails the XSS check (test: `base/tests/test_pdf_xss_guard.py`). Never call `pdfkit` or `template_pdf` directly. Revisit when a fixed release appears |
| `<package>` | `<version>` | `<e.g. pinned due to known bug in >=X>` |

## Environment setup

Brief pointer to how a new dev gets ScoReview Performance running. Keep it
short — full details belong in the README.

- Python version: 3.12
- Canonical local path: `venv` (SQLite). Docker for staging and production
- Env file: `.env.dist` → `.env` (gitignored)
- First-run steps: `python -m venv venv`, activate it, `python -m pip install --upgrade pip`,
  `pip install -r requirements.txt`, copy `.env.dist` to `.env` and edit it,
  `python manage.py migrate`, `python manage.py collectstatic`,
  `python manage.py runserver`, then `python manage.py run_scheduler` in a
  second terminal. On a new database, sign in page → Initialize Database,
  using `DB_INIT_PASSWORD` from `.env`. `compilemessages` needs GNU gettext
  installed; skip it if you only need English.

## License notes

The underlying Horilla codebase is **LGPL-2.1**. Modifications to the
library itself carry copyleft obligations **if the modified work is
distributed**. Our separate custom app(s) calling into Horilla is generally
fine, but if Senrab Technologies distributes ScoReview Performance (a
modified Horilla work), the LGPL terms apply. Confirm with
`<legal/compliance owner at Senrab>` before any external distribution.

## Change log

Newest first. One line per significant customization batch or dependency
change.

| Date | Summary | Author |
|---|---|---|
| 2026-11-03 | Rebrand run: "Horilla" replaced by "ScoReview" across code, templates, translations, data and scripts; `Horilla Bot` user renamed by migration; sample emails moved to `@example.com`; identifiers, URLs and upstream docs intentionally kept (see Brand removal policy) | paa.barnes |
| 2026-11-03 | Hid Payroll, Recruitment, Onboarding and Offboarding for all users (sidebar, 404 middleware, CSS); modules stay installed with data intact | paa.barnes |
| 2026-11-03 | Dependabot: bumped `svgo` in the vendored ionicons `package.json` to 2.8.4 (3 alerts); `pdfkit` alert has no patched release, mitigated in code and documented | paa.barnes |
| 2026-11-03 | Colour pass: ScoReview theme migration, vivid chart palette and colourful tiles (`colors.js`/`colors.css`), base layout override `index.html`; logo uploaded to the HQ company; White Labelling on | paa.barnes |
| 2026-11-03 | Forked Horilla `2.0` at `c49300c8f`; local setup; added `scoreview_performance` scaffold with template and static override wiring | paa.barnes |
