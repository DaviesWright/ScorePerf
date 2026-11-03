# ScoReview Performance

[![License: LGPL v2.1](https://img.shields.io/badge/License-LGPL%20v2.1-blue.svg)](https://www.gnu.org/licenses/lgpl-2.1)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Django](https://img.shields.io/badge/django-5.2-green.svg)](https://www.djangoproject.com/)

> **A performance management platform from Senrab Technologies, built on the Horilla HR foundation.** ScoReview helps organisations set objectives, track progress, run reviews and report on results, with HR records, leave and attendance in the same system.

## Status

ScoReview is under active development. This table is the honest picture of what exists today.

| Capability | Status |
|---|---|
| **OKR** (objectives, key results, progress tracking) | **Available.** Inherited from the Performance module and protected by regression tests. |
| 360 feedback, one-to-one meetings, bonus points | **Available** (Performance module) |
| Employee records, departments, reporting lines | **Available** |
| Leave management | **Available** |
| Time and attendance, biometric device integration | **Available** |
| Dashboards and reports (export and scheduled email) | **Available** |
| **Configurable performance cycles** (one framework per cycle) | Planned |
| **MBO** (Management by Objectives) | Planned |
| **Balanced Scorecard** (four perspectives, strategy maps) | Planned |
| Scoring, calibration, certification workflow | Planned |
| AI-assisted drafting with human approval | Planned |

Payroll, Recruitment, Onboarding and Offboarding are present in the code base but **hidden** for all users. Their data and tables are untouched, and they can be brought back (see [CUSTOMIZATIONS.md](CUSTOMIZATIONS.md)).

The roadmap, architecture rules and delivery phases are in [BUILD.md](BUILD.md). The current-state assessment is in [docs/architecture/BASELINE_ASSESSMENT.md](docs/architecture/BASELINE_ASSESSMENT.md).

## Technology

- **Backend:** Python 3.12 to 3.14, Django 5.2, Django REST Framework with JWT, APScheduler for scheduled jobs.
- **Data:** PostgreSQL (production) or SQLite (local only), Redis for shared cache and sessions.
- **Frontend:** server-rendered Django templates with HTMX, Alpine and `_hyperscript`.
- **Deployment:** Docker Compose (web, scheduler, database, Redis, nginx), gunicorn, WhiteNoise.
- **Quality:** ruff, pre-commit, gitleaks, Django test runner.

## Quick start (local)

Requires Python 3.12, 3.13 or 3.14 and pip 21.3 or newer. Python 3.15 is not supported yet.

```bash
git clone https://github.com/DaviesWright/ScorePerf.git
cd ScorePerf
git checkout main-custom

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

cp .env.dist .env                 # then edit .env, see below
python manage.py migrate
python manage.py collectstatic
python manage.py runserver

# second terminal: scheduled jobs only run while this is running
python manage.py run_scheduler
```

**Local database.** `.env.dist` defaults to the Docker PostgreSQL settings. To run without Docker, comment out `DATABASE_URL`, `REDIS_URL`, `DB_HOST` and `DB_PORT`, then set:

```bash
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=TestDB.sqlite3
```

SQLite is for one person on one machine. Use PostgreSQL whenever more than one process writes (for example web and scheduler together), or you may see "database is locked".

**First sign-in.** On an empty database the sign-in page shows **Initialize Database**. Enter the `DB_INIT_PASSWORD` from your `.env`, then create the first administrator.

**Always set strong values** for `SECRET_KEY` and `DB_INIT_PASSWORD`. With `DEBUG=False` Django refuses known-insecure secrets.

**Translations.** `python manage.py compilemessages` needs GNU gettext (`msgfmt`). Skip it if you only need English.

## Docker

```bash
docker compose up -d --build      # development stack, builds the image from this repository
```

There is **no published ScoReview image**. Build from this repository. Do not pull `horilla/horilla-hr`: that is the unmodified upstream product.

For production, create a `.env` with strong secrets, set `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`, then run `make prod` (or `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d`). The first start applies all migrations before the web server is ready and takes a few minutes. Details and tuning: [docker/README.md](docker/README.md).

ScoReview-specific cloud and on-premises deployment guides are planned (see [BUILD.md](BUILD.md) §12).

## Customisation

ScoReview is a customised fork. All ScoReview code lives in the `scoreview_performance/` app, and upstream files are edited only when unavoidable. [CUSTOMIZATIONS.md](CUSTOMIZATIONS.md) is the map: what differs from stock, where overrides live, how modules are hidden, how branding and colours work, and what was and was not renamed.

- Branding: White Labelling is on. The company name and logo come from the HQ company record (`Settings` then `Company`), and the colour theme is a data migration.
- Template and static overrides: `scoreview_performance/templates/` and `scoreview_performance/static_overrides/`.
- Hidden modules: `HIDDEN_MODULES` in `horilla/settings/local_settings.py`.

## Development

```bash
pip install pre-commit && pre-commit install     # ruff, formatting and secret-scan hooks
python -m ruff check .
python manage.py check
python manage.py test pms                        # OKR domain tests
make test-smoke                                  # CI smoke set across first-party apps
```

- The working branch is `main-custom`. Work in small, reviewable changes with tests, as set out in [BUILD.md](BUILD.md) §20 and §27.
- Follow PEP 8, format with Black and isort (`--profile black`), and pass new user-visible strings through Django's translation functions.
- Never commit secrets or `.env`. Do not change existing OKR behaviour without evidence and approval.
- Document decisions that affect data, deployment, security, APIs or scoring in an Architecture Decision Record.

## Security

Built-in controls include permission-based access with per-company scoping, optional two-factor sign-in by email, brute-force lockout and API rate limiting, change history on records, and XSS checks on saved text. Always run behind HTTPS in production and keep dependencies current.

**Reporting a vulnerability.** Do not open a public issue. Follow [SECURITY.md](SECURITY.md): contact Senrab Technologies privately at contactus@senrabconsultech.com.

## Contact

**Senrab Technologies**, a subsidiary of Senrab ConsulTech Group.
Website: https://senrabconsultech.com/ · Email: contactus@senrabconsultech.com

## License and attribution

ScoReview is a modified version of **Horilla HR** (https://github.com/horilla/horilla-hr), which is licensed under the **GNU Lesser General Public License v2.1**. This work remains under that licence; see [LICENSE](LICENSE). Modified versions of the library carry obligations if you distribute them, including making the corresponding source available under the LGPL. If you plan to distribute ScoReview outside your organisation, take legal advice first.

Horilla is a trademark of its owners and is used here only to identify the upstream project.
