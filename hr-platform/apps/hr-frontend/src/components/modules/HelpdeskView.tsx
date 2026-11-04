import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { DataTable, Column } from "../../design-system/DataTable";

export interface TicketRecord {
  id: number;
  title: string;
  priority: string;
  status: string;
  first_name: string;
  last_name: string;
  category_name: string;
}

interface HelpdeskViewProps {
  initialTickets: TicketRecord[];
}

export const HelpdeskView: React.FC<HelpdeskViewProps> = ({ initialTickets }) => {
  const [tickets, setTickets] = useState(initialTickets);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Hardware");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const newTicket: TicketRecord = {
      id: tickets.length + 1,
      title,
      priority,
      status: "OPEN",
      first_name: "Paa",
      last_name: "Barnes",
      category_name: category,
    };

    setTickets([newTicket, ...tickets]);
    setShowModal(false);
    setTitle("");
    setDescription("");
  };

  const columns: Column<TicketRecord>[] = [
    {
      header: "Ticket ID",
      width: "110px",
      accessor: (t) => (
        <span style={{ fontFamily: typography.fontMono, fontSize: "12px", fontWeight: 600, color: colors.brandBlue }}>
          HD-{String(t.id).padStart(4, "0")}
        </span>
      ),
    },
    {
      header: "Issue & Subject",
      accessor: (t) => (
        <div>
          <span style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary }}>
            {t.title}
          </span>
          <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
            Category: {t.category_name}
          </div>
        </div>
      ),
    },
    {
      header: "Requester",
      width: "180px",
      accessor: (t) => (
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
            {t.first_name[0]}{t.last_name[0]}
          </div>
          <span style={{ fontSize: typography.sizes.sm, color: colors.textSecondary }}>
            {t.first_name} {t.last_name}
          </span>
        </div>
      ),
    },
    {
      header: "Priority",
      width: "100px",
      align: "center",
      accessor: (t) => {
        const p = t.priority.toLowerCase();
        return (
          <Badge variant={p === "high" ? "error" : p === "medium" ? "warning" : "info"} size="sm">
            {t.priority.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      header: "Status",
      width: "110px",
      align: "center",
      accessor: (t) => (
        <Badge variant={t.status.toLowerCase() === "open" ? "warning" : "success"} size="sm" dot>
          {t.status.toUpperCase()}
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
            Helpdesk & Service Desk
          </h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Icons.Plus size={14} />
            <span>New Ticket</span>
          </span>
        </Button>
      </div>

      {/* Ticket Table */}
      <DataTable
        columns={columns}
        data={tickets}
        keyExtractor={(t) => t.id}
        emptyMessage="No open support tickets."
      />

      {/* Ticket Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              boxShadow: shadows.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: 0 }}>
                Log Internal Support Ticket
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textMuted, marginBottom: "0.35rem" }}>
                  Subject / Summary
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Request secondary 4K display dock"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.sm,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textMuted, marginBottom: "0.35rem" }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: typography.sizes.sm,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <option value="Hardware">Hardware Provisioning</option>
                    <option value="Access">System / VPN Access</option>
                    <option value="Software">Software Licensing</option>
                    <option value="Facilities">Office & Facilities</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textMuted, marginBottom: "0.35rem" }}>
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: typography.sizes.sm,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <option value="low">Low (Standard)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textMuted, marginBottom: "0.35rem" }}>
                  Description & Details
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide technical specifics or error messages..."
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.sm,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Submit Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
