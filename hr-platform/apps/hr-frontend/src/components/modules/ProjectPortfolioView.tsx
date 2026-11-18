import React, { useRef, useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { ProjectsMiniDashboard } from "./ProjectsMiniDashboard";

export interface ProjectRecord {
  id: number;
  name: string;
  description: string;
  status: string;
}

interface ProjectPortfolioViewProps {
  initialProjects: ProjectRecord[];
}

export const ProjectPortfolioView: React.FC<ProjectPortfolioViewProps> = ({ initialProjects }) => {
  const [projects, setProjects] = useState(initialProjects);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const listRef = useRef<HTMLDivElement>(null);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newProject: ProjectRecord = {
      id: projects.length + 1,
      name,
      description,
      status,
    };

    setProjects([newProject, ...projects]);
    setShowModal(false);
    setName("");
    setDescription("");
  };

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
            Client Engagements
          </h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Icons.Plus size={14} />
            <span>New Engagement</span>
          </span>
        </Button>
      </div>

      <ProjectsMiniDashboard projects={projects} onOpenFull={() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />

      {/* Projects Grid */}
      <div ref={listRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
        {projects.map((p, idx) => {
          const progress = idx === 0 ? 75 : idx === 1 ? 40 : 85;
          return (
            <div
              key={p.id}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = colors.borderStrong)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.border)}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "11px", fontFamily: typography.fontMono, color: colors.brandBlue, fontWeight: 600 }}>
                    ENG-00{p.id}
                  </span>
                  <Badge variant={p.status === "ACTIVE" ? "success" : "neutral"} size="sm" dot>
                    {p.status}
                  </Badge>
                </div>

                <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textPrimary, margin: "0.25rem 0 1rem 0" }}>
                  {p.name}
                </h3>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: colors.textMuted, marginBottom: "0.35rem" }}>
                  <span>Sprint Delivery Progress</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{progress}%</span>
                </div>
                <div style={{ height: "6px", backgroundColor: colors.surfaceSubtle, borderRadius: radii.full, overflow: "hidden", marginBottom: "0.85rem" }}>
                  <div style={{ width: `${progress}%`, height: "100%", backgroundColor: colors.brandBlue, borderRadius: radii.full }} />
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${colors.borderSubtle}`,
                    paddingTop: "0.65rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: typography.sizes.xs,
                    color: colors.textMuted,
                  }}
                >
                  <span>Practice: Cloud Architecture</span>
                  <span style={{ color: colors.brandBlue, fontWeight: 500, cursor: "pointer" }}>
                    View Sprints →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Engagement Modal */}
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
              maxWidth: "520px",
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
                Initiate New Client Engagement
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textMuted, marginBottom: "0.35rem" }}>
                  Engagement Title
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Modern Data Platform Migration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textMuted, marginBottom: "0.35rem" }}>
                  Scope of Work & Client Brief
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize client objectives, deliverables, and team requirements..."
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
                  Launch Engagement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
