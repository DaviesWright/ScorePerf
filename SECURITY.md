# Security Policy

Senrab Technologies takes the security of ScoReview Performance seriously. This document explains how to report a vulnerability, what is in and out of scope, and how we handle it.

This policy applies to **ScoReview Performance**, maintained by Senrab Technologies. ScoReview is built on the open-source Horilla HR codebase (see [README.md](README.md) and [CUSTOMIZATIONS.md](CUSTOMIZATIONS.md)). Reports about this repository come to us first, not to the upstream project.

## Supported versions

ScoReview has not yet published tagged releases. Until it does:

| Line | Security support |
|------|------------------|
| `main-custom` (current development line) | **Yes.** Fixes land here. |
| Any other branch or fork | No |

Each client runs its own deployment. A fix reaches a client only when that deployment is upgraded, so we notify affected clients directly. The support policy for tagged releases will be published with the first release.

## Reporting a vulnerability

**Do not** open a public issue, discussion or pull request for a security vulnerability.
**Do not** disclose exploit details publicly until we have published a fix or explicitly agreed otherwise.

### How to report

Email **contactus@senrabconsultech.com** with the subject line **ScoReview security report**. A dedicated security address will replace this when one exists.

We will acknowledge valid reports and keep you informed as we triage and fix. A target acknowledgement time will be published once a dedicated security mailbox is in place.

### What to include

- The affected **version**, commit or deployment (use a commit hash or release name, not a hostname)
- Environment notes (Docker Compose or other, reverse proxy, authentication mode). Use variable *names* and redacted examples only
- Step-by-step reproduction (a minimal proof of concept is preferred)
- Impact: who can exploit it and what they gain
- Whether a fix or workaround is already known

**Never** send live secrets, tokens, database dumps, or personal data. If you have found real personal data, stop and tell us without copying it.

A reporter's severity estimate is useful input. We decide the final severity.

Please wait for triage feedback before sending large batches of unverified findings.

## Scope

### In scope

- Vulnerabilities in code shipped in this repository, including the `scoreview_*` apps, our customisations, and the Horilla code as shipped here
- Unsafe **default configuration** we ship (for example a known default secret that works in production)
- Deployment files in this repository (`Dockerfile`, Compose files, nginx configuration)
- Spreadsheet export injection and similar issues in our export paths
- Dependency vulnerabilities with a **reachable** path in ScoReview

### Out of scope

We will normally not treat the following as ScoReview vulnerabilities. We may still harden or document them.

| Class | Notes |
|-------|-------|
| Privilege escalation by users who already administer users and roles | Trusted-administrator capability by design |
| Issues only on end-of-life Python or Django versions | Upgrade to a supported version |
| Pure deployment misconfiguration by the operator | For example `DEBUG=True`, weak secrets set by the operator, an exposed admin site. **Exception:** an insecure default that works out of the box |
| Files served outside the documented secure media path | Follow the deployment documentation |
| Dependency advisories with no reachable path | Tracked through Dependabot |
| Third-party software or custom code we did not ship | Report to that project |
| Social engineering, physical attacks, or compromise of our email, website or social accounts | Handled as operational incidents |
| Demands for payment | See Rewards |

### Grey areas

- Code that evaluates dynamic input for exports or calculations is treated as **high priority** if a non-administrator can trigger it.
- Default secrets in images or quick-start documentation are **in scope** as product defects.

## Severity (guidance)

| Level | Examples |
|-------|----------|
| Critical | Unauthenticated remote code execution, unauthenticated authentication bypass, mass data exposure without authentication |
| High | Authenticated remote code execution, broad access to other employees' personal or performance records, authenticated authentication bypass |
| Medium | Cross-site scripting needing user interaction, limited access to another user's record, open redirect |
| Low | Low-impact issues, verbose errors without a clear exploit path |

Performance records, appraisal ratings and personal data are treated as confidential. Exposure of another employee's records is rated at least Medium.

## Our process

1. **Intake:** a report arrives privately by email.
2. **Triage:** is it in scope, valid, a duplicate, and on a supported line?
3. **Fix:** on `main-custom`, with a test that fails before the fix and passes after.
4. **Notify:** tell the reporter, and tell affected clients so they can upgrade their deployments.
5. **Disclose:** coordinate the timing of any public disclosure with the reporter.
6. **Credit:** acknowledge the reporter unless they ask for anonymity.

If a vulnerability also affects the unmodified upstream Horilla HR project, we may report it to that project through its own process (https://github.com/horilla/horilla-hr/security/advisories/new) after we have a fix, with the reporter's agreement.

## Known issues

Security findings from our own reviews are tracked internally in `docs/architecture/BASELINE_ASSESSMENT.md`, with their status. That document is not a substitute for reporting a new finding.

## Rewards

There is no cash bug bounty at this time. We offer credit.

## Security tooling

On this repository:

- **Dependabot alerts** are enabled, and alerts are triaged. An alert with no fix available is dismissed only with a recorded reason and a mitigation.
- **Secret scanning** runs in `pre-commit` (gitleaks), and `ruff` runs on every commit.
- CI workflow files for static analysis and tests are present under `.github/workflows`.

These are internal controls. They do not replace reporting a vulnerability.

## Contact

Security reports and questions about this policy: **contactus@senrabconsultech.com** (subject: ScoReview security report).

Senrab Technologies, a subsidiary of Senrab ConsulTech Group. Website: https://senrabconsultech.com/

## Disclaimer

We appreciate responsible disclosure that helps keep our clients and their employees safe. This policy is not a contract and does not create any warranty or obligation beyond those in the project licence and any agreement with a client.
