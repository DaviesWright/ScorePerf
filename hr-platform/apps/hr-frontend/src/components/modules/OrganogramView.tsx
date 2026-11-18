"use client";

import React, { useMemo, useState } from "react";
import { colors, radii, shadows, space, text } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import {
  SEEDED_DEPARTMENTS,
  SEEDED_EMPLOYEES,
  SEEDED_PERFORMANCE_RECORDS,
  SeedEmployee,
} from "../../data/enterpriseSeedData";
import type { ExperienceContext } from "../../domain/orgCore";

export interface OrgPerson {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string | null;
  office: string | null;
  managerId: number | null;
  managerName: string | null;
  dottedManagerId?: number | null;
  dottedManagerName?: string | null;
}

export function OrganogramView() {
  const [employees] = useState<SeedEmployee[]>(SEEDED_EMPLOYEES);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedExperience, setSelectedExperience] = useState<ExperienceContext | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"tree" | "matrix_table">("tree");
  const [rootFocusId, setRootFocusId] = useState<number>(1); // Default root: #1 Paa Kwesi Barnes
  const [collapsedIds, setCollapsedIds] = useState<Record<number, boolean>>({});
  const [selectedPerson, setSelectedPerson] = useState<SeedEmployee | null>(SEEDED_EMPLOYEES[0]);

  // Build adjacency map (managerId -> direct reports) and compute subtree sizes
  const { childrenMap, subtreeCountMap, depthMap } = useMemo(() => {
    const cMap = new Map<number, SeedEmployee[]>();
    for (const emp of employees) {
      if (emp.managerId !== null) {
        const list = cMap.get(emp.managerId) || [];
        list.push(emp);
        cMap.set(emp.managerId, list);
      }
    }

    const sMap = new Map<number, number>();
    const countSubtree = (id: number): number => {
      if (sMap.has(id)) return sMap.get(id)!;
      const directs = cMap.get(id) || [];
      let total = directs.length;
      for (const d of directs) {
        total += countSubtree(d.id);
      }
      sMap.set(id, total);
      return total;
    };
    for (const emp of employees) countSubtree(emp.id);

    const dMap = new Map<number, number>();
    const computeDepth = (emp: SeedEmployee, visited = new Set<number>()): number => {
      if (dMap.has(emp.id)) return dMap.get(emp.id)!;
      if (!emp.managerId || visited.has(emp.id)) {
        dMap.set(emp.id, 0);
        return 0;
      }
      visited.add(emp.id);
      const parent = employees.find((e) => e.id === emp.managerId);
      const depth = parent ? computeDepth(parent, visited) + 1 : 0;
      dMap.set(emp.id, depth);
      return depth;
    };
    for (const emp of employees) computeDepth(emp);

    return { childrenMap: cMap, subtreeCountMap: sMap, depthMap: dMap };
  }, [employees]);

  const perfByEmpId = useMemo(
    () => new Map(SEEDED_PERFORMANCE_RECORDS.map((p) => [p.employeeId, p])),
    []
  );

  // Filter employees for search/table or highlight in tree
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (selectedDepartment !== "ALL" && e.departmentId !== selectedDepartment) return false;
      if (selectedExperience !== "ALL" && !e.experiences.includes(selectedExperience)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          e.name.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q) ||
          e.departmentName.toLowerCase().includes(q) ||
          e.staffId.toLowerCase().includes(q) ||
          e.architecturalRole.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [employees, selectedDepartment, selectedExperience, searchQuery]);

  const toggleCollapse = (id: number) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => setCollapsedIds({});
  const collapseToDeptHeads = () => {
    const next: Record<number, boolean> = {};
    for (const e of employees) {
      if ((depthMap.get(e.id) ?? 0) >= 2 && (childrenMap.get(e.id)?.length ?? 0) > 0) {
        next[e.id] = true;
      }
    }
    setCollapsedIds(next);
  };

  // Experience summary counts
  const essCount = employees.filter((e) => e.experiences.includes("ESS")).length;
  const mssCount = employees.filter((e) => e.experiences.includes("MSS")).length;
  const hrmsCount = employees.filter((e) => e.experiences.includes("HRMS")).length;

  const renderTreeNode = (emp: SeedEmployee, level: number): React.ReactNode => {
    const directs = childrenMap.get(emp.id) || [];
    const totalSubtree = subtreeCountMap.get(emp.id) || 0;
    const isCollapsed = !!collapsedIds[emp.id];
    const isSelected = selectedPerson?.id === emp.id;

    // Check if this node or any descendant matches current filters
    const matchesFilter = filteredEmployees.some((f) => f.id === emp.id);

    return (
      <div
        key={emp.id}
        style={{
          marginLeft: level === 0 ? 0 : space[5],
          borderLeft: level === 0 ? "none" : `2px solid ${colors.border}`,
          paddingLeft: level === 0 ? 0 : space[4],
          marginTop: space[3],
        }}
      >
        <div
          onClick={() => setSelectedPerson(emp)}
          style={{
            backgroundColor: isSelected ? colors.indigoSubtle : colors.surface,
            border: `1.5px solid ${isSelected ? colors.indigoAction : matchesFilter ? colors.borderStrong : colors.borderSubtle}`,
            borderLeft: emp.experiences.includes("HRMS")
              ? `4px solid ${colors.textPrimary}`
              : emp.experiences.includes("MSS")
              ? `4px solid ${colors.indigoAction}`
              : `4px solid ${colors.emeraldDark}`,
            borderRadius: radii.md,
            padding: space[3],
            boxShadow: isSelected ? shadows.md : shadows.xs,
            opacity: matchesFilter ? 1 : 0.45,
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: space[3],
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            {directs.length > 0 ? (
              <button
                type="button"
                aria-label={isCollapsed ? `Expand ${emp.name}` : `Collapse ${emp.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(emp.id);
                }}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: radii.sm,
                  border: `1px solid ${colors.borderStrong}`,
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isCollapsed ? "+" : "−"}
              </button>
            ) : (
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textSecondary,
                  fontSize: text.micro.fontSize,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {emp.firstName[0]}
                {emp.lastName[0]}
              </span>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
                <span style={{ fontSize: text.bodyStrong.fontSize, fontWeight: 700, color: colors.textPrimary }}>
                  {emp.name}
                </span>
                <span style={{ fontSize: text.mono.fontSize, fontFamily: "var(--font-mono)", color: colors.textMuted }}>
                  {emp.staffId}
                </span>
                <Badge variant="neutral" size="sm">
                  {emp.grade} · {emp.architecturalRole}
                </Badge>
              </div>
              <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary, marginTop: "2px" }}>
                <strong>{emp.jobTitle}</strong> · {emp.departmentName} ({emp.office})
                {emp.dottedManagerName && (
                  <span style={{ color: colors.indigoAction, marginLeft: space[2] }}>
                    · Dotted Line: {emp.dottedManagerName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Three-Experience Badges & Subtree Counter */}
          <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
            {emp.experiences.map((exp) => (
              <Badge
                key={exp}
                variant={exp === "HRMS" ? "info" : exp === "MSS" ? "okr" : "success"}
                size="sm"
              >
                {exp}
              </Badge>
            ))}
            <Badge variant="neutral" size="sm">
              Scope: {emp.scopeType}
            </Badge>
            {directs.length > 0 && (
              <span
                style={{
                  fontSize: text.micro.fontSize,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: radii.full,
                  backgroundColor: colors.indigoSubtle,
                  color: colors.indigoPrimary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {directs.length} Direct / {totalSubtree} Subtree
              </span>
            )}
          </div>
        </div>

        {!isCollapsed && directs.length > 0 && (
          <div>{directs.map((child) => renderTreeNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

  const focusedRootEmployee =
    employees.find((e) => e.id === rootFocusId) || employees[0];

  return (
    <div style={{ padding: `${space[5]} ${space[6]}`, maxWidth: "1360px", margin: "0 auto", display: "flex", flexDirection: "column", gap: space[5] }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: space[4],
          boxShadow: shadows.sm,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: space[4],
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
            <Icons.GitBranch size={22} color={colors.indigoAction} />
            <h1 style={{ fontSize: text.h1.fontSize, fontWeight: text.h1.fontWeight, color: colors.textPrimary, margin: 0 }}>
              Enterprise Organogram &amp; Reporting-Line Hierarchy
            </h1>
            <Badge variant="info" size="sm">
              {employees.length} Employees · {SEEDED_DEPARTMENTS.length} Departments · 5 Levels
            </Badge>
          </div>
          <p style={{ fontSize: text.body.fontSize, color: colors.textSecondary, margin: `${space[1]} 0 0 0` }}>
            Interactive reporting-line graph mapping every staff member to their department, position, manager, subtree scope, and Three-Experience contexts (ESS · MSS · HRMS).
          </p>
        </div>

        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
          <Button
            variant={viewMode === "tree" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("tree")}
          >
            Interactive Hierarchy Tree
          </Button>
          <Button
            variant={viewMode === "matrix_table" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("matrix_table")}
          >
            Role &amp; Experience Directory ({filteredEmployees.length})
          </Button>
        </div>
      </div>

      {/* KPI Strip: Three-Experience & Hierarchy Coverage */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: space[3], fontVariantNumeric: "tabular-nums" }}>
        <div style={{ backgroundColor: colors.surface, padding: space[3], borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>
            Total Seeded Headcount
          </div>
          <div style={{ fontSize: text.h1.fontSize, fontWeight: 700, color: colors.indigoPrimary, marginTop: "2px" }}>
            {employees.length} FTEs
          </div>
          <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary }}>
            Across {SEEDED_DEPARTMENTS.length} departments &amp; 3 hubs
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, padding: space[3], borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>
            ESS (Employee Self-Service)
          </div>
          <div style={{ fontSize: text.h1.fontSize, fontWeight: 700, color: colors.emeraldDark, marginTop: "2px" }}>
            {essCount} / {employees.length} (100%)
          </div>
          <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary }}>
            Every staff member holds ESS (SELF scope)
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, padding: space[3], borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>
            MSS (Manager Self-Service)
          </div>
          <div style={{ fontSize: text.h1.fontSize, fontWeight: 700, color: colors.indigoAction, marginTop: "2px" }}>
            {mssCount} Managers
          </div>
          <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary }}>
            Division Heads, Dept Heads &amp; Squad Leads
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, padding: space[3], borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: text.micro.fontSize, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>
            HRMS (Governance &amp; Exec)
          </div>
          <div style={{ fontSize: text.h1.fontSize, fontWeight: 700, color: colors.textPrimary, marginTop: "2px" }}>
            {hrmsCount} Staff
          </div>
          <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary }}>
            Super Admin, HR Manager, HR Officers &amp; Execs
          </div>
        </div>
      </div>

      {/* Filter & Navigation Controls Bar */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: space[3],
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: space[3],
        }}
      >
        <div style={{ display: "flex", gap: space[2], alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search by name, title, ID, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              height: "36px",
              width: "240px",
              padding: `0 ${space[3]}`,
              borderRadius: radii.sm,
              border: `1px solid ${colors.border}`,
              fontSize: text.body.fontSize,
            }}
          />

          <select
            aria-label="Filter by Department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            style={{
              height: "36px",
              padding: `0 ${space[2]}`,
              borderRadius: radii.sm,
              border: `1px solid ${colors.border}`,
              fontSize: text.body.fontSize,
              backgroundColor: colors.surface,
            }}
          >
            <option value="ALL">All 8 Departments ({employees.length})</option>
            {SEEDED_DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} (Head: {d.headName})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Experience Context"
            value={selectedExperience}
            onChange={(e) => setSelectedExperience(e.target.value as ExperienceContext | "ALL")}
            style={{
              height: "36px",
              padding: `0 ${space[2]}`,
              borderRadius: radii.sm,
              border: `1px solid ${colors.border}`,
              fontSize: text.body.fontSize,
              backgroundColor: colors.surface,
            }}
          >
            <option value="ALL">All Experience Contexts</option>
            <option value="ESS">ESS Holders ({essCount})</option>
            <option value="MSS">MSS Managers ({mssCount})</option>
            <option value="HRMS">HRMS Governance ({hrmsCount})</option>
          </select>

          {viewMode === "tree" && (
            <select
              aria-label="Focus Subtree Root"
              value={rootFocusId}
              onChange={(e) => setRootFocusId(Number(e.target.value))}
              style={{
                height: "36px",
                padding: `0 ${space[2]}`,
                borderRadius: radii.sm,
                border: `1px solid ${colors.indigoAction}`,
                backgroundColor: colors.indigoSubtle,
                color: colors.indigoPrimary,
                fontWeight: 600,
                fontSize: text.body.fontSize,
              }}
            >
              <option value={1}>Root: Paa Kwesi Barnes (Full Company · 54)</option>
              <option value={14}>Subtree: Sarah Jenkins (Technology Division · 27)</option>
              <option value={15}>Subtree: Kwame Mensah (Finance &amp; Client Ops · 11)</option>
              <option value={3}>Subtree: Jemima Richards (People &amp; Culture · 6)</option>
              <option value={6}>Subtree: Ndapewa Shikongo (Enterprise Advisory · 8)</option>
              <option value={2}>Subtree: Benedicta Agbesi (Cloud &amp; Edge · 12)</option>
              <option value={18}>Subtree: Marcus Chen (FinTech &amp; Payments · 8)</option>
              <option value={11}>Subtree: Priya Nair (Data &amp; AI Platforms · 6)</option>
            </select>
          )}
        </div>

        {viewMode === "tree" && (
          <div style={{ display: "flex", gap: space[2] }}>
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All Levels
            </Button>
            <Button variant="outline" size="sm" onClick={collapseToDeptHeads}>
              Collapse to Dept Heads
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Split: Tree / Matrix (Left) + Selected Node Inspector (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: space[4], alignItems: "start" }}>
        {viewMode === "tree" ? (
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: space[4],
              boxShadow: shadows.sm,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space[2] }}>
              <h2 style={{ fontSize: text.h3.fontSize, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                Reporting-Line Hierarchy ({focusedRootEmployee.name})
              </h2>
              <span style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                Click any node to inspect reporting chain &amp; Three-Experience scope
              </span>
            </div>
            {renderTreeNode(focusedRootEmployee, 0)}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              overflow: "hidden",
              boxShadow: shadows.sm,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: text.body.fontSize, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>STAFF MEMBER</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>DEPARTMENT &amp; POSITION</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>REPORTS TO</th>
                  <th style={{ padding: space[3], fontSize: text.small.fontSize, color: colors.textSecondary }}>ROLE &amp; EXPERIENCES</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedPerson(emp)}
                    style={{
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: selectedPerson?.id === emp.id ? colors.indigoSubtle : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ padding: space[3] }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>{emp.name}</div>
                      <div style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>
                        {emp.staffId} · {emp.office}
                      </div>
                    </td>
                    <td style={{ padding: space[3] }}>
                      <div style={{ fontWeight: 600 }}>{emp.jobTitle}</div>
                      <div style={{ fontSize: text.small.fontSize, color: colors.textSecondary }}>{emp.departmentName}</div>
                    </td>
                    <td style={{ padding: space[3], color: colors.textSecondary }}>
                      {emp.managerName || "Board of Directors"}
                    </td>
                    <td style={{ padding: space[3] }}>
                      <div style={{ display: "flex", gap: space[1], flexWrap: "wrap" }}>
                        <Badge variant="neutral" size="sm">{emp.architecturalRole}</Badge>
                        {emp.experiences.map((ex) => (
                          <Badge
                            key={ex}
                            variant={ex === "HRMS" ? "info" : ex === "MSS" ? "okr" : "success"}
                            size="sm"
                          >
                            {ex}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected Node Detail Inspector Card */}
        {selectedPerson && (() => {
          const directs = childrenMap.get(selectedPerson.id) || [];
          const totalSub = subtreeCountMap.get(selectedPerson.id) || 0;
          const perf = perfByEmpId.get(selectedPerson.id);
          return (
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: space[4],
                boxShadow: shadows.sm,
                position: "sticky",
                top: "5rem",
                display: "flex",
                flexDirection: "column",
                gap: space[3],
              }}
            >
              <div style={{ borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: space[3] }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: text.mono.fontSize, fontFamily: "var(--font-mono)", color: colors.indigoAction, fontWeight: 700 }}>
                      {selectedPerson.staffId} · Grade {selectedPerson.grade}
                    </span>
                    <h3 style={{ fontSize: text.h2.fontSize, fontWeight: 700, color: colors.textPrimary, margin: "2px 0" }}>
                      {selectedPerson.name}
                    </h3>
                    <div style={{ fontSize: text.body.fontSize, color: colors.textSecondary }}>
                      {selectedPerson.jobTitle}
                    </div>
                  </div>
                  <Badge variant="success" size="sm">{selectedPerson.office}</Badge>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: space[2], fontSize: text.small.fontSize }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Department:</span>
                  <strong>{selectedPerson.departmentName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Squad / Team:</span>
                  <strong>{selectedPerson.teamName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Solid-Line Manager:</span>
                  <strong>{selectedPerson.managerName || "Board of Directors (Root)"}</strong>
                </div>
                {selectedPerson.dottedManagerName && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: colors.textMuted }}>Dotted-Line Matrix Lead:</span>
                    <strong style={{ color: colors.indigoAction }}>{selectedPerson.dottedManagerName}</strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Architectural Role:</span>
                  <strong>{selectedPerson.architecturalRole}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Assigned Experiences:</span>
                  <strong>{selectedPerson.experiences.join(" + ")} (Scope: {selectedPerson.scopeType})</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Resolved Reporting Subtree:</span>
                  <strong>{directs.length} Direct · {totalSub} Total Reports</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Leave Balance (FY2026):</span>
                  <strong>
                    {selectedPerson.annualAvailable}d avail / {selectedPerson.annualEntitlement}d ({selectedPerson.annualUsed}d used)
                  </strong>
                </div>
                {perf && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: colors.textMuted }}>Latest Appraisal ({perf.framework}):</span>
                    <strong style={{ color: colors.emeraldDark }}>
                      {perf.normalizedScore}/100 ({perf.ratingBand})
                    </strong>
                  </div>
                )}
              </div>

              {directs.length > 0 && (
                <div style={{ borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: space[3] }}>
                  <div style={{ fontSize: text.micro.fontSize, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", marginBottom: space[2] }}>
                    Direct Reports ({directs.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: space[1] }}>
                    {directs.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedPerson(d)}
                        style={{
                          textAlign: "left",
                          padding: "6px 10px",
                          borderRadius: radii.sm,
                          border: `1px solid ${colors.borderSubtle}`,
                          backgroundColor: colors.surfaceSubtle,
                          fontSize: text.small.fontSize,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          <strong>{d.name}</strong> · {d.jobTitle}
                        </span>
                        <span style={{ color: colors.indigoAction }}>{d.experiences.join("/")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
