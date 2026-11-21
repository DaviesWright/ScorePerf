# Frozen Django/Horilla workflows

These workflows built, tested, scanned and published the Django/Horilla stack. They were moved out of
`.github/workflows/` on 2026-11-21, which stops GitHub from running them, because that stack is frozen
as a read-only reference and will be removed from the branch by 2026-11-30.

Two reasons beyond the freeze:
- They only ever triggered on the `2.0` and `dev/v2.0` branches, so they never checked `main-custom`.
- `docker-publish.yml` pushed images named `horilla/horilla-hr`, the upstream Horilla namespace.

The ScoReview HR platform (`hr-platform/`) needs its own workflow (install, typecheck, API tests).
