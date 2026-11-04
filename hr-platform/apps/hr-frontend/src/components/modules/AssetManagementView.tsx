import React, { useState, useMemo, useRef } from "react";
import { colors, typography, radii } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { MetricCard } from "../../design-system/MetricCard";
import { Icons } from "../../design-system/Icons";
import { Button } from "../../design-system/Button";
import { DataTable, Column } from "../../design-system/DataTable";
import { AssetRecord, EmployeeRecord } from "./WorkforceDirectoryView";
import { ASSET_CATEGORIES, DEMO_ASSETS, DEMO_STAFF } from "../../data/demoData";

interface AssetManagementViewProps {
  assets: AssetRecord[];
  employees: EmployeeRecord[];
}

const CODE_PREFIX: Record<string, string> = { Vehicles: "VEH", Laptops: "LAP", "Mobile Phones": "MOB" };

export const AssetManagementView: React.FC<AssetManagementViewProps> = ({
  assets: apiAssets,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  // Demo registry when the API returns nothing. Assets added here live in this view's state only.
  const [assets, setAssets] = useState<AssetRecord[]>(apiAssets.length > 0 ? apiAssets : DEMO_ASSETS);
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState<string>(ASSET_CATEGORIES[0]);
  const [newName, setNewName] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const prefix = CODE_PREFIX[newCategory] ?? "AST";
    const sameCategory = assets.filter((a) => a.category_name === newCategory).length;
    const code = `SEN-${prefix}-${String(sameCategory + 1).padStart(3, "0")}`;
    const assignee = DEMO_STAFF.find((s) => s.id === newAssignee);
    const [firstName, ...rest] = assignee ? assignee.name.split(" ") : [];
    const record: AssetRecord = {
      id: Math.max(0, ...assets.map((a) => a.id)) + 1,
      name,
      asset_code: code,
      category_name: newCategory,
      status: assignee ? "allocated" : "available",
      ...(assignee ? { first_name: firstName, last_name: rest.join(" ") } : {}),
    };
    setAssets([record, ...assets]);
    setFeedback(`${code} added to Hardware and Fleet.`);
    setShowAdd(false);
    setNewName("");
    setNewAssignee("");
  };

  const categories = useMemo(() => {
    const set = new Set<string>(ASSET_CATEGORIES);
    assets.forEach((a) => {
      if (a.category_name) set.add(a.category_name);
    });
    return ["ALL", ...Array.from(set)];
  }, [assets]);

  const allocatedCount = assets.filter((a) => a.status === "allocated").length;
  const availableCount = assets.filter((a) => a.status === "available").length;
  const assigneeCount = new Set(assets.filter((a) => a.first_name).map((a) => `${a.first_name} ${a.last_name}`)).size;

  // Drill-down: the KPI cards filter the table below, or switch it to a per-person breakdown.
  const [byStaff, setByStaff] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollToTable = () => setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  const filtersActive = byStaff || selectedStatus !== "ALL" || selectedCat !== "ALL" || search !== "";

  const clearFilters = () => {
    setByStaff(false);
    setSelectedStatus("ALL");
    setSelectedCat("ALL");
    setSearch("");
  };
  const drillStatus = (status: string) => {
    clearFilters();
    setSelectedStatus(status);
    scrollToTable();
  };
  const drillStaff = () => {
    clearFilters();
    setByStaff(true);
    scrollToTable();
  };
  const drillPerson = (name: string) => {
    clearFilters();
    setSearch(name);
  };

  const staffRows = useMemo(() => {
    const byName = new Map<string, AssetRecord[]>();
    assets.forEach((a) => {
      if (!a.first_name) return;
      const name = `${a.first_name} ${a.last_name}`;
      byName.set(name, [...(byName.get(name) ?? []), a]);
    });
    return [...byName.entries()].map(([name, items]) => ({ name, items })).sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name));
  }, [assets]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.asset_code.toLowerCase().includes(search.toLowerCase()) ||
        `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase().includes(search.toLowerCase());

      const matchesCat = selectedCat === "ALL" || a.category_name === selectedCat;
      const matchesStatus = selectedStatus === "ALL" || a.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [assets, search, selectedCat, selectedStatus]);

  const columns: Column<AssetRecord>[] = [
    {
      header: "Asset Code",
      width: "140px",
      accessor: (asset) => (
        <span style={{ fontFamily: typography.fontMono, fontSize: "12px", fontWeight: 600, color: colors.brandBlue }}>
          {asset.asset_code}
        </span>
      ),
    },
    {
      header: "Asset",
      accessor: (asset) => (
        <div>
          <div style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary }}>
            {asset.name}
          </div>
          <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
            {asset.category_name}
          </div>
        </div>
      ),
    },
    {
      header: "Allocated Staff Member",
      accessor: (asset) => {
        if (!asset.first_name || !asset.last_name) {
          return (
            <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
              Depot Buffer (Unassigned)
            </span>
          );
        }
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                backgroundColor: colors.brandNavy,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 600,
              }}
            >
              {asset.first_name[0]}{asset.last_name[0]}
            </div>
            <span style={{ fontSize: typography.sizes.sm, color: colors.textPrimary, fontWeight: typography.weights.medium }}>
              {asset.first_name} {asset.last_name}
            </span>
          </div>
        );
      },
    },
    {
      header: "Status",
      width: "110px",
      align: "center",
      accessor: (asset) => (
        <Badge variant={asset.status === "allocated" ? "success" : "info"} size="sm" dot>
          {asset.status === "allocated" ? "In Service" : "Depot Buffer"}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
        <div>
          <h1
            style={{
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.bold,
              color: colors.textPrimary,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Hardware and Fleet
          </h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Icons.Plus size={14} />
            <span>Add Asset</span>
          </span>
        </Button>
      </div>
      {feedback && (
        <div
          role="status"
          style={{ marginBottom: "1rem", padding: "0.6rem 0.9rem", borderRadius: radii.md, backgroundColor: colors.emeraldSubtle, color: colors.emeraldDark, fontSize: typography.sizes.sm }}
        >
          {feedback}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <MetricCard
          label="Total Hardware Assets"
          value={assets.length}
          subtext="Corporate tagged devices"
          badge={<Badge variant="neutral" size="sm">Active Registry</Badge>}
          onClick={() => drillStatus("ALL")}
          selected={!filtersActive}
        />
        <MetricCard
          label="Assigned Workstations"
          value={allocatedCount}
          subtext="Assigned directly to workforce"
          badge={<Badge variant="success" size="sm">In Service</Badge>}
          onClick={() => drillStatus("allocated")}
          selected={!byStaff && selectedStatus === "allocated"}
        />
        <MetricCard
          label="Depot Buffer"
          value={availableCount}
          subtext="Standby reserve laptops & peripherals"
          badge={<Badge variant="info" size="sm">Ready to Deploy</Badge>}
          onClick={() => drillStatus("available")}
          selected={!byStaff && selectedStatus === "available"}
        />
        <MetricCard
          label="Staff With Assets"
          value={assigneeCount}
          subtext="Staff holding company equipment"
          badge={<Badge variant="success" size="sm">Assigned</Badge>}
          onClick={drillStaff}
          selected={byStaff}
        />
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, maxWidth: "600px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: "0.4rem 0.75rem",
              flex: 1,
            }}
          >
            <Icons.Search size={15} color={colors.textMuted} />
            <input
              type="text"
              placeholder="Search by model, asset code (SEN-LAP-XXX), or staff name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                width: "100%",
                fontSize: typography.sizes.sm,
                color: colors.textPrimary,
                backgroundColor: "transparent",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", padding: 0 }}
              >
                <Icons.X size={14} />
              </button>
            )}
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              fontSize: typography.sizes.sm,
              color: colors.textPrimary,
              outline: "none",
              cursor: "pointer",
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All Categories" : c}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              fontSize: typography.sizes.sm,
              color: colors.textPrimary,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="allocated">In Service (Allocated)</option>
            <option value="available">Depot Reserve (Available)</option>
          </select>
        </div>

        <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span>
            {byStaff ? (
              <>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>{staffRows.length}</span> staff holding assets
              </>
            ) : (
              <>
                Showing <span style={{ fontWeight: 600, color: colors.textPrimary }}>{filtered.length}</span> of {assets.length} assets
              </>
            )}
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              style={{ background: "none", border: "none", padding: 0, color: colors.indigoAction, fontWeight: 600, fontSize: typography.sizes.xs, cursor: "pointer" }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Asset Table (or per-person breakdown) */}
      <div ref={tableRef} style={{ scrollMarginTop: "1rem" }}>
        {byStaff ? (
          <DataTable
            columns={[
              { header: "Staff Member", accessor: (r) => <strong style={{ color: colors.textPrimary }}>{r.name}</strong> },
              { header: "Assets", width: "90px", align: "center", accessor: (r) => r.items.length },
              {
                header: "Equipment",
                accessor: (r) => (
                  <span style={{ color: colors.textSecondary }}>
                    {r.items.map((i) => `${i.category_name}: ${i.name}`).join(" · ")}
                  </span>
                ),
              },
            ]}
            data={staffRows}
            keyExtractor={(r) => r.name}
            onRowClick={(r) => drillPerson(r.name)}
            emptyMessage="No staff hold company equipment."
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(a) => a.id}
            emptyMessage="No assets found matching the search criteria."
          />
        )}
      </div>

      {showAdd && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add asset"
          onClick={() => setShowAdd(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
        >
          <form
            onSubmit={handleAddAsset}
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.surface, borderRadius: radii.md, padding: "1.5rem", width: "min(440px, 92vw)", display: "flex", flexDirection: "column", gap: "0.9rem" }}
          >
            <h2 style={{ margin: 0, fontSize: typography.sizes.lg, color: colors.textPrimary }}>Add Asset</h2>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
              Category
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
              Name or model
              <input
                autoFocus
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={newCategory === "Vehicles" ? "Toyota Hilux (GR 1234-26)" : newCategory === "Laptops" ? "Dell Latitude 7450" : "iPhone 16 128GB"}
                style={{ padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
              Assign to
              <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} style={{ padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                <option value="">Unassigned (depot)</option>
                {DEMO_STAFF.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.25rem" }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit">Add Asset</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
