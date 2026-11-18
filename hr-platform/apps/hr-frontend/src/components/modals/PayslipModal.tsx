"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { Button } from "../../design-system/Button";

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName?: string;
  employeeRole?: string;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  employeeName = "Paa Kwesi Barnes",
  employeeRole = "Managing Principal",
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2400);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(6px)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          boxShadow: shadows.modal,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Linear meets Notion Style with Deep Indigo Accents */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: radii.lg,
                backgroundColor: colors.indigoPrimary,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
                letterSpacing: "-0.02em",
                boxShadow: "0 2px 4px rgba(30, 27, 75, 0.2)",
              }}
            >
              SC
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: typography.sizes.lg,
                    fontWeight: 700,
                    color: colors.indigoPrimary,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Official Payslip · November 2026
                </h3>
                {/* Emerald Green Growth & Paid Badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.15rem 0.55rem",
                    borderRadius: radii.full,
                    backgroundColor: colors.emeraldSubtle,
                    color: colors.emeraldDark,
                    border: `1px solid ${colors.emeraldBorder}`,
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: colors.emeraldAction,
                    }}
                  />
                  PAID VIA BACS
                </span>
                {/* Soft Peach Wellness Match Badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.15rem 0.55rem",
                    borderRadius: radii.full,
                    backgroundColor: colors.peachSubtle,
                    color: colors.peachText,
                    border: `1px solid ${colors.peachBorder}`,
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  Pension & Wellness Matched
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Senrab ConsulTech Ltd (UK PAYE: 948/SZ4021) · Pay Date: 28 Nov 2026 · Ref: SEN-PAY-202611-001
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              background: "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              color: colors.textMuted,
              cursor: "pointer",
              padding: "0.4rem 0.55rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "11px",
              fontFamily: typography.fontMono,
              transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surfaceSubtle;
              e.currentTarget.style.color = colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = colors.textMuted;
            }}
          >
            ESC
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: "auto", padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          {/* Executive Net Pay High-Contrast Hero Card */}
          <div
            style={{
              padding: "1.35rem 1.6rem",
              borderRadius: radii.lg,
              background: `linear-gradient(135deg, ${colors.indigoPrimary} 0%, #172554 100%)`,
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 12px rgba(30, 27, 75, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#93c5fd", fontWeight: 600 }}>
                Net Monthly Take-Home Pay
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", marginTop: "2px", color: "#ffffff" }}>
                GH₵28,450.00
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "4px", fontSize: "12px", color: "#cbd5e1" }}>
                <span>Disbursed to Ecobank Ghana (Acc: ••••4892 · Branch: Airport City)</span>
                <span>•</span>
                <span style={{ color: "#86efac", fontWeight: 600 }}>Cleared</span>
              </div>
            </div>

            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                Employee: <strong style={{ color: "#ffffff" }}>{employeeName}</strong>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Role: {employeeRole} · Grade: Principal E8
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: typography.fontMono }}>
                GRA TIN: P0029418492 · SSNIT: D0928419401
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            
            {/* Left: Earnings (Emerald Growth Accent) */}
            <div
              style={{
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: colors.emeraldSubtle,
                  borderBottom: `1px solid ${colors.emeraldBorder}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.emeraldDark, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Earnings (Gross)
                </span>
                <span style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.emeraldDark }}>
                  GH₵42,500.00
                </span>
              </div>
              <div style={{ padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.sm }}>
                  <span style={{ color: colors.textSecondary }}>Basic Salary (Annual GH₵500,000)</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>GH₵41,666.67</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.sm }}>
                  <span style={{ color: colors.textSecondary }}>Executive Remote & Tech Stipend</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>GH₵833.33</span>
                </div>
                <div style={{ borderTop: `1px dashed ${colors.border}`, margin: "0.25rem 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.sm, fontWeight: 700 }}>
                  <span style={{ color: colors.textPrimary }}>Total Gross Taxable</span>
                  <span style={{ color: colors.emeraldDark }}>GH₵42,500.00</span>
                </div>
              </div>
            </div>

            {/* Right: Deductions (Deep Indigo / Controlled Red) */}
            <div
              style={{
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: colors.indigoSubtle,
                  borderBottom: `1px solid ${colors.indigoBorder}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAccent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Statutory Deductions (GRA & SSNIT)
                </span>
                <span style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.indigoPrimary }}>
                  GH₵14,050.00
                </span>
              </div>
              <div style={{ padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.sm }}>
                  <span style={{ color: colors.textSecondary }}>GRA PAYE Income Tax</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>GH₵9,850.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.sm }}>
                  <span style={{ color: colors.textSecondary }}>SSNIT Employee Deduction (5.5%)</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>GH₵2,291.67</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.sm }}>
                  <span style={{ color: colors.textSecondary }}>Tier 3 Provident Fund (Voluntary)</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>GH₵1,908.33</span>
                </div>
                <div style={{ borderTop: `1px dashed ${colors.border}`, margin: "0.25rem 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.sm, fontWeight: 700 }}>
                  <span style={{ color: colors.textPrimary }}>Total Deductions</span>
                  <span style={{ color: colors.indigoPrimary }}>GH₵14,050.00</span>
                </div>
              </div>
            </div>

          </div>

          {/* Employer Direct Contributions (Total Rewards Transparency) */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: radii.lg,
              border: `1px solid ${colors.peachBorder}`,
              backgroundColor: colors.peachSubtle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.peachText, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Employer Invested Benefits (This Period)
              </div>
              <div style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: "2px" }}>
                SSNIT Tier 1 Employer Match (13.5%): <strong>GH₵5,625.00</strong> · Tier 2 Enterprise Trustees (5.0%): <strong>GH₵2,083.33</strong>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: colors.peachText, fontWeight: 600 }}>Total Employer Cost</div>
              <div style={{ fontSize: typography.sizes.md, fontWeight: 700, color: colors.peachDark }}>GH₵50,208.33</div>
            </div>
          </div>

          {/* YTD Cumulative Figures */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.75rem",
              padding: "0.85rem",
              backgroundColor: colors.surfaceSubtle,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 600 }}>YTD Taxable Pay</div>
              <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, marginTop: "2px" }}>GH₵467,500.00</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 600 }}>YTD GRA PAYE</div>
              <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, marginTop: "2px" }}>GH₵108,350.00</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 600 }}>YTD SSNIT Match</div>
              <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, marginTop: "2px" }}>GH₵25,208.00</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 600 }}>YTD Tier 3 Fund</div>
              <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, marginTop: "2px" }}>GH₵20,991.67</div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "1rem 1.75rem",
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
            {downloadSuccess ? (
              <span style={{ color: colors.emeraldDark, fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Icons.Check size={14} color={colors.emeraldDark} />
                Payslip PDF downloaded to your machine!
              </span>
            ) : (
              <span>Certified HMRC Real Time Information (RTI) compliant</span>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              style={{
                backgroundColor: colors.indigoAccent,
                borderColor: colors.indigoAccent,
              }}
            >
              <Icons.Download size={14} />
              <span>Download Official PDF Payslip</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

