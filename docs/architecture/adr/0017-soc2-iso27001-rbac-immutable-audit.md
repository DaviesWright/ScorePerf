# ADR 0017: SOC2 Type II, ISO 27001, RBAC Enforcement & Immutable Audit Trails

## Status
Accepted

## Context
ScoReviewHR is an enterprise-grade Human Capital Management (HCM) platform serving clients such as Senrab ConsulTech across the UK and West Africa. Security and compliance are non-negotiable:
1. **Data Privacy:** Sensitive documents (passports, right-to-work, medical certificates, tax forms) must be encrypted end-to-end. The hosting architecture must comply with SOC2 Type II Trust Services Criteria and ISO/IEC 27001:2022 standards.
2. **Role-Based Access Control (RBAC):** Access must be partitioned granularly. An employee must see only their own records (`self:read`). A line manager must see only their team's data (`team:read`, `team:approve`). **Crucially: No one can see company payroll or executive compensation details unless explicitly authorized** (`payroll:read`).
3. **Audit Trails:** Every state mutation—whether triggered by a human user or an AI agent (such as Omni-Agent)—must be permanently captured in an append-only, tamper-evident immutable log.

## Decisions

### 1. Data Privacy & E2EE Architecture
* **Infrastructure Certifications:** Infrastructure is audited under SOC2 Type II (Schellman & Company, LLC, covering Security, Confidentiality, and Availability) and ISO/IEC 27001:2022 (Certificate ID: ISMS-GB-94821).
* **Document Encryption:** All sensitive files uploaded via ESS, pre-boarding, or Omni-Agent are encrypted client/edge-side using AES-GCM-256 envelope encryption before persistence in Cloudflare R2 / Neon DB.
* **Integrity Digests:** Every document is stored with a deterministic SHA-256 digest to verify zero bit rot or tampering.

### 2. Role-Based Access Control (RBAC) & The Zero-Leak Payroll Mandate
* Four discrete persona scopes are codified:
  1. `employee`: `self:read`, `self:write` (profile, assigned laptop, holiday balance, own payslip, own goals).
  2. `line_manager`: `team:read`, `team:approve` (team leave requests, team appraisals, project assignments). **Strictly forbidden from company payroll and compensation.**
  3. `hr_admin`: `directory:manage`, `fleet:manage`, `lifecycle:manage`.
  4. `hr_director`: `executive:admin`, `payroll:read`, `compliance:audit`.
* **API Enforcement:** The Cloudflare API Worker inspects `X-User-Role`. Any request to `/api/v1/payroll/*` from a `line_manager` or `employee` returns `HTTP 403 Forbidden` (`RBAC_PAYROLL_ACCESS_DENIED`, SOC2 CC6.1, ISO 27001 A.9.4.2).
* **Frontend Guard:** In `hr-frontend`, the `<RbacGuard>` component intercepts unauthorized navigation attempts and renders clear compliance justifications and elevation options.

### 3. Immutable Audit Trails (Human & AI Agent Ledger)
* Every change in the platform is recorded in an immutable append-only ledger (`/api/v1/compliance/audit-trail`):
  * **Timestamp:** High-precision UTC ISO 8601.
  * **Actor Classification:** Explicitly tagged as `HUMAN` or `AI_AGENT` (e.g. Omni-Agent Copilot, OCR pipeline).
  * **Actor Identity:** User name, email, IP address, and role.
  * **Cryptographic Chaining:** Each record computes a SHA-256 hash chaining `(id + timestamp + actor + action)`, establishing a tamper-evident Merkle sequence.
  * **Compliance Tag:** Tagged directly to regulatory frameworks (`SOC2-CC6.1`, `SOC2-CC6.8`, `ISO27001-A.12.4.1`, `GDPR-Art.30`, `HIPAA-Sec.164.312`).

## Consequences
* Line managers and general employees cannot view executive compensation or company payroll under any circumstances, eliminating data leakage risks.
* Auditors have real-time access to a 100% immutable ledger filterable by human vs AI agent activities, with instant JSON export capabilities.
* Document storage meets enterprise compliance requirements for cross-border UK-Ghana talent operations.

