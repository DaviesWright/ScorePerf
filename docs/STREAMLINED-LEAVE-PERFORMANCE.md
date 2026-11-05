# Streamlined ScoReview: Leave Management and Performance Management only

Status: design proposal. Nothing has been built or changed in the app.

## 0. Basis and limits of this review

- **Staging could not be inspected.** `https://staging.bscscoreview.com` loaded only the shell ("ScoReview HR / Loading...") in the built-in browser, in two tabs, for over 30 seconds. No navigation, login screen or modules rendered, so nothing below was observed on the live site.
- **Source used instead.** The page title and loading text match this repository (`hr-platform/apps/hr-frontend`), so the review reads that code and `db/schema.sql`. **Assumption A1:** staging runs an earlier build of this same code. If it does not, section 1 needs re-checking.
- **Not covered:** the deployed environment's data, feature flags, and any module built outside this repository.

## 1. Review findings

### 1.1 Modules in the sidebar (15 views)

| Group | Module (view key) | Keep? |
|---|---|---|
| My workspace | My Self-Service (`self_service`) | Suppress (see 1.4) |
| Workforce intelligence | Command Centre, Strategic Reports & AI, Workforce Directory, Client Engagements | Suppress |
| Talent & career | **Appraisals / PMS (`performance_pms`)**, Skills & Gig Board | Keep PMS only |
| Automation & rewards | Nerve Center & Wallet, Onboarding & Exit | Suppress |
| Time & operations | **Leaves & Shifts (`time_and_leave`)**, Hardware and Fleet, IT Helpdesk | Keep Leave only |
| Governance & data | Employee Settings, Approval Workflows, Data Governance, Disciplinary Management, Policies & Handbooks | Suppress |

Also present outside the sidebar: command palette (Cmd+K), omni-agent drawer, "Create / Jump" quick menu, payslip modal, sandbox/live and EN/FR toggles, persona switcher.

### 1.2 Leave Management today (`TimeAndLeaveView.tsx`, 2,310 lines)

- **Tabs (14):** Dashboard, Department Schedules & Rosters, Attendance by Time Zone, Leave Requests, Resumption Requests, Plan History, Policies, Upload History, Balance, Reserved Days, Additional Days, Blocked Days, Allowances, Settings.
- **Workflow in the UI:** staff submit a request (type, dates, reason, optional attachment) -> status `PENDING` -> approver sets `APPROVED` or `REJECTED` -> resumption record on return.
- **Data (UI):** `LeaveRecord` = id, name, staff id, department, leave type, start, end, requested days, status, reason, attachment, approver.
- **Data (database):** `leave_requests` (employee, leave type, dates, `requested_days`, `status`, `reason`, `approved_by`), `leave_types`, `leave_allocations`, `company_holidays`.
- **API:** only `GET /api/v1/leaves` exists. **There is no endpoint to create, approve or reject a leave request.** The UI changes records in memory only.

### 1.3 Performance Management today (`PerformanceManagementView.tsx`, 5,612 lines)

- **Tabs (14):** Dashboard, Cascading BSC, Sequential Sign-off, Strict Trait Matrix, OKR Heatmap, 9-Box Succession, Appraisal Cycles, Requests, Objectives Setup, Appraisals, Bulk Actions, 1-on-1 Check-ins, Settings, Performance Insights.
- **Workflow:** an HR user creates a cycle under one framework (OKR, MBO or BSC; the framework cannot change once set) -> objectives are set and approved -> self and manager scores -> calibration -> cycle closes.
- **Data (database):** `performance_cycles` (framework, title, dates, `status`), `framework_types`, `framework_configurations`, `kpis`, `performance_assignments`, `performance_reviews` (cycle, employee, reviewer, self/manager/calibrated score, `status`, `feedback`).
- **API:** `GET/POST /cycles`, `POST /cycles/:id/transition`, `GET/POST /appraisals`, `POST /kpis`, `POST /scores/calculate`, `GET /frameworks`. Performance has real endpoints; Leave does not.

### 1.4 Dependencies and what breaks when other modules are suppressed

| Dependency | Effect if suppressed |
|---|---|
| Command Centre (landing view) links to both kept modules and to Directory, Reports, Assets | Must stop being the default view; pick Leave or a new plain home. |
| My Self-Service holds the employee's own leave balance, request button and payslip | Staff lose their "my leave" entry point unless Leave gets a "My requests" view (kept in section 2). |
| Employees / directory data feeds reviewee lists, approver names and balances | **Data must stay.** Only the Directory screen is hidden. |
| Departments and `company_holidays` feed leave rosters and day counts | Keep as read-only reference data. |
| Command palette, quick-create menu, RBAC guard, omni-agent and welcome modal all link to hidden views | Each must filter its links by the enabled-module list, or they open blank screens. |
| Leave tabs "Attendance by Time Zone" and "Department Schedules" | Belong to Time & Attendance, not core leave. Suppress as sub-features. |
| Performance tabs reference Succession, Skills and Reports | Cross-links must be removed or hidden. |
| `employees` has no `manager_id` | **Manager approval and "my team" lists have no data source.** See question Q3. |
| Persona is derived from `employees.access_role` | Keep. Roles drive who sees the approval queue. |

## 2. Scope

### Keep
- **Leave:** request form, my requests (cancel while pending), approval queue, team calendar (list form), balances, leave types and policies (read-only for staff, editable by HR), public holidays.
- **Performance:** appraisal cycles, goal / objective setting, self review, manager review, calibration by HR, results view per person, 1-on-1 check-in log.
- **Platform:** sign-in, user menu (profile, sign out), role-based access, audit trail of approvals.

### Suppress
- **Modules:** Command Centre, Reports & AI, Workforce Directory, Client Engagements, Skills & Gig Board, Nerve Center, Onboarding & Exit, Hardware and Fleet, IT Helpdesk, Employee Settings, Approval Workflows, Data Governance, Disciplinary, Policies & Handbooks, Self-Service.
- **Inside Leave:** Attendance by Time Zone, Department Schedules & Rosters, Upload History, Plan History, Reserved / Additional / Blocked days, Allowances (hold as phase 2, see Q4).
- **Inside Performance:** Cascading BSC grid, Sequential Sign-off, Strict Trait Matrix, OKR Heatmap, 9-Box Succession, Bulk Actions, Performance Insights, PMS Settings.
- **Chrome:** AI drawer and "Dede AI" labels, EN/FR toggle, sandbox toggle, persona switcher (real roles only), payslip shortcut, welcome briefing, decorative badges.

### Suppression approach (reversible)

1. **One module registry.** Add `src/config/modules.ts` with every view key and an `enabled` boolean. Default set: `leave`, `performance`. A deployment override comes from `NEXT_PUBLIC_ENABLED_MODULES` (comma list).
2. **Navigation** is built from the registry: disabled keys are not rendered.
3. **Route guard:** the shell renders a plain "This module is not enabled" page if a disabled key is requested (direct link, palette, stale state).
4. **Cross-links** (palette, quick menu, RBAC guard, welcome brief) call `isEnabled(key)` before showing a link.
5. **API:** keep all routes. Optionally return 404 for disabled modules' routes behind the same list; not required for phase 1.
6. **Nothing is deleted.** Component files, tables and routes stay. Re-enabling is a config change.

## 3. Interface design

### 3.1 Principles
Sidebar with text labels plus a content area; one accent colour (the existing indigo); system sans-serif; white and grey surfaces; 1px borders, no shadows, gradients, animation, emoji or decorative badges. Status is text plus a flat coloured label ("Pending", "Approved"). Every control is reachable by keyboard with a visible focus ring. Minimum width 768 px (tablet); below 1024 px the sidebar becomes a top menu button with text.

### 3.2 Navigation
```
Leave
  My leave
  Request leave
  Approvals            (managers, HR)
  Team calendar        (managers, HR)
  Balances & policies
Performance
  My review
  Goals
  Team reviews         (managers)
  Cycles               (HR)
```
Header: product name on the left; signed-in name, role and "Sign out" on the right.

### 3.3 Screens

**Leave dashboard (My leave)**
```
My leave                                              [Request leave]
-------------------------------------------------------------------
Balance            Annual 18 of 25 days   Sick 8 of 10   Study 3 of 5
-------------------------------------------------------------------
Upcoming and recent requests
Dates              Type    Days  Status       Approver   Action
12-16 Nov 2026     Annual  5     Pending      R. Mamphey [Cancel]
03-04 Oct 2026     Sick    2     Approved     R. Mamphey
-------------------------------------------------------------------
```

**Leave request form**
```
Request leave
Leave type *      [ Annual v ]       Balance after: 13 days
Start date *      [ date ]    End date * [ date ]    Days: 5 (excl. 1 holiday)
Reason            [ text area ]
Attachment        [ choose file ]  (required for sick leave over 2 days)
Approver          Richard Mamphey (from your reporting line)
                              [Cancel]  [Submit request]
```
Errors appear beside the field in text; overlaps with existing requests are blocked with a message.

**Leave approval queue**
```
Approvals (3 pending)       Filter: [Pending v]  [Team v]  Search [____]
Employee      Dates          Type    Days  Cover/clash note        Action
A. Asare      12-16 Nov      Annual  5     2 of 6 team away        [Approve] [Reject]
Reject opens a required "reason" field. Row opens a detail panel (balance, history).
```

**Performance review list**
```
Reviews - Q4 2026 cycle (closes 15 Dec)     Filter: [All v]  Search [____]
Employee      Self review   Manager review   Calibrated   Status
A. Asare      Submitted     Not started      -            Awaiting manager
K. Antwi      Submitted     Submitted        4.0          Calibrated
Row opens the review form.
```

**Goal setting**
```
My goals - Q4 2026 (framework: OKR, set by HR)      [Add goal]
Goal                         Measure              Weight   Status
Reduce query latency < 20ms  p95 latency          40%      Approved
Weights must total 100%  (current 100%)           [Submit for approval]
```
Manager view adds Approve / Return with comment.

**Review form**
```
Review: A. Asare - Q4 2026
Goals (read-only)  table of goals with a score field 1-5 per goal
Overall self score [ 1-5 ]   Comments [ text ]       (employee step)
Manager score      [ 1-5 ]   Feedback [ text ]       (manager step)
Calibrated score   [ 1-5 ]   Reason for change [ ]   (HR step)
Steps shown as plain text: 1 Self  2 Manager  3 Calibration  4 Closed
                              [Save draft]  [Submit]
```

### 3.4 Accessibility and responsiveness
Native form controls, labelled fields, `aria-live` for save and error messages, tables with real header cells, logical tab order, 44 px minimum touch targets on tablet, contrast at least 4.5:1.

## 4. Component reuse

| Component | Plan |
|---|---|
| `DataTable`, `Badge`, `Button`, `MetricCard` | Reuse. Remove the shadow and gradient from `MetricCard`; replace coloured top borders with a plain 1px border. |
| `AppSidebar` | Simplify: text only, driven by the registry, no badges, no persona switcher. |
| `AppHeader` | Replace with the plain header in 3.2. |
| `TimeAndLeaveView` (2,310 lines) | Do not strip in place. Build `LeaveSimple` (request, my requests, approvals, calendar, balances) that reuses its data types; leave the original untouched and disabled. |
| `PerformanceManagementView` (5,612 lines) | Same: build `PerformanceSimple` (cycles, goals, review form, results). Keep the original for later. |
| `ProfileMenu`, `UserAvatar`, `drillProps` | Reuse. |
| `CommandPalette`, `OmniAgentDrawer`, `LoginWelcomeModal` | Remove from the streamlined shell. |
| API routes `/cycles`, `/appraisals`, `/kpis`, `/scores/calculate` | Reuse. |
| Leave API | **Build:** create, cancel, approve, reject and balance endpoints, with audit entries. |

## 5. Reversibility checklist

- [ ] Registry file lists every existing view key with its original component.
- [ ] No component file, table, route or migration is deleted.
- [ ] Setting `NEXT_PUBLIC_ENABLED_MODULES` to the full list restores all 15 views with no code change.
- [ ] Disabled modules' data stays in the database untouched.
- [ ] Cross-links from kept modules to hidden ones are guarded, not removed, so they return when enabled.
- [ ] A test enumerates the registry and fails if a view key is neither enabled nor mapped to a component.
- [ ] Rollback is one config change plus a redeploy.

## 6. Assumptions

- A1: staging runs a build of this repository (see section 0).
- A2: "Performance Management" means appraisal cycles, goals and reviews, not the full succession, skills and insights suite.
- A3: One deployment per client (existing decision), so the module list is per-deployment configuration, not per-user.
- A4: Roles stay `employee`, `line_manager`, `hr_admin`, `hr_director`.
- A5: The leave dashboard figures and the screens' sample content in the current UI are demonstration data, not live records.

## 7. Questions for stakeholders

1. Can someone give a screen recording or working login for staging, so section 1 can be verified?
2. Should the default landing page be Leave or Performance, or a plain two-link home?
3. Where does the reporting line (who approves whom) come from? `employees` has no manager column.
4. Are reserved, blocked, additional days and allowances required for go-live, or phase 2?
5. Is a single approval step enough for leave, or do some types need two?
6. Which performance framework does this client use (OKR, MBO or BSC), and are scores 1-5?
7. Do staff need email notifications for approvals? (No mail provider is wired yet.)
8. Should "Attendance by Time Zone" return with Leave in a later phase for the Windhoek hub?
