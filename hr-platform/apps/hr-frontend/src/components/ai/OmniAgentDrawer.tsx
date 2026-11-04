"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";

interface OmniAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteWorkflow?: (workflow: string, data?: any) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  actions?: { label: string; action: string }[];
  metadata?: {
    type: "leave_draft" | "doc_ingest" | "travel_intel";
    title?: string;
    details?: string;
  };
}

export const OmniAgentDrawer: React.FC<OmniAgentDrawerProps> = ({
  isOpen,
  onClose,
  onExecuteWorkflow,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "agent",
      text: "Good afternoon, Paa. I'm Dede, your ScoReview AI Copilot. I execute multi-step HR workflows, file claims from documents, and monitor team intelligence proactively. How can I assist you?",
      actions: [
        { label: "Draft Friday off to travel to Accra", action: "accra_leave" },
        { label: "Scan medical certificate", action: "scan_doc" },
        { label: "Review Q4 OKR calibration status", action: "okr_status" },
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    setTimeout(() => {
      let agentReply: ChatMessage;

      const lower = query.toLowerCase();
      if (lower.includes("accra") || lower.includes("friday") || lower.includes("leave")) {
        agentReply = {
          id: `a-${Date.now()}`,
          sender: "agent",
          text: "I analyzed your workforce profile: You currently have 18 days of Annual Leave. Your practice (Cloud & Edge Engineering) is operating at 96% coverage with 0 conflicting absences on Friday. I have drafted and submitted the leave request to your manager.",
          metadata: {
            type: "leave_draft",
            title: "Leave Request Submitted",
            details: "Friday, May 8 • 1.0 Day Annual Leave • Handover to Marcus Chen",
          },
          actions: [
            { label: "Look up flights to Accra (ACC)", action: "accra_flights" },
            { label: "View Team Coverage Schedule", action: "view_coverage" },
          ],
        };
        onExecuteWorkflow?.("accra_leave");
      } else if (lower.includes("flight") || lower.includes("accra_flights")) {
        agentReply = {
          id: `a-${Date.now()}`,
          sender: "agent",
          text: "Here are non-stop corporate partner flights from London Heathrow (LHR) to Accra (ACC) on Friday:\n\n• British Airways BA081 — Dept 13:40 GMT, Arr 19:55 GMT\n• Virgin Atlantic VS401 — Dept 22:15 GMT, Arr 04:30+1 GMT\n\nCorporate booking code SEN-CORP-LON is pre-applied.",
          metadata: {
            type: "travel_intel",
            title: "Corporate Flight Options",
            details: "LHR → ACC • Corporate discount active",
          },
        };
      } else if (lower.includes("scan") || lower.includes("sick") || lower.includes("receipt") || lower.includes("doc")) {
        agentReply = {
          id: `a-${Date.now()}`,
          sender: "agent",
          text: "Document ingested and OCR extracted: 'Dr. Mensah & Associates Medical Certificate — 2 Days Medical Leave'. I've parsed the diagnosis code, registered medical absence, and notified People & Culture. No further action needed.",
          metadata: {
            type: "doc_ingest",
            title: "Claim Processed",
            details: "Verified Doctor Signature • Prorated Medical Allowance: 100%",
          },
        };
      } else {
        agentReply = {
          id: `a-${Date.now()}`,
          sender: "agent",
          text: `Understood: "${query}". I have executed this contextual workflow across the Senrab ConsulTech platform and updated your records.`,
        };
      }

      setMessages((prev) => [...prev, agentReply]);
      setIsProcessing(false);
    }, 700);
  };

  const handleFileUpload = (fileName: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: `Uploaded document: ${fileName}`,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: "agent",
        text: `Extracted data from ${fileName}: Validated Medical Note from St. Thomas' Hospital London. 2 days of Medical Leave recorded with 0 deduction from Annual Leave.`,
        metadata: {
          type: "doc_ingest",
          title: "Automated OCR Extraction Complete",
          details: "Type: Medical Absence • Status: Verified & Approved",
        },
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsProcessing(false);
    }, 800);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: colors.surface,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: shadows.drawer,
          borderLeft: `1px solid ${colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.surface,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: radii.md,
                backgroundColor: colors.brandBlue,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <Icons.Sparkles size={16} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.textPrimary }}>
                  Dede — AI Copilot
                </span>
                <Badge variant="info" size="sm">Dede AI</Badge>
              </div>
              <span style={{ fontSize: "11px", color: colors.textMuted }}>
                Conversational multi-step HR workflow intelligence
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Proactive Intelligence Banner */}
        <div
          style={{
            padding: "0.65rem 1rem",
            backgroundColor: "#faf5ff",
            borderBottom: "1px solid #f3e8ff",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "11px",
            color: "#6b21a8",
          }}
        >
          <Icons.Sparkles size={14} color="#9333ea" />
          <div style={{ flex: 1 }}>
            <strong>Proactive Nudge:</strong> Bank Holiday coming up May 4th. You have 18 leave days remaining.
          </div>
          <button
            onClick={() => handleSend("Draft next Friday leave for a 4-day long weekend")}
            style={{
              background: "#9333ea",
              color: "#ffffff",
              border: "none",
              borderRadius: radii.sm,
              padding: "0.2rem 0.5rem",
              fontSize: "10px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Draft
          </button>
        </div>

        {/* Chat Stream */}
        <div style={{ flex: 1, padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {messages.map((m) => {
            const isAgent = m.sender === "agent";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isAgent ? "flex-start" : "flex-end",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "0.75rem 1rem",
                    borderRadius: radii.lg,
                    backgroundColor: isAgent ? colors.surfaceSubtle : colors.brandNavy,
                    color: isAgent ? colors.textPrimary : "#ffffff",
                    fontSize: typography.sizes.sm,
                    lineHeight: 1.5,
                    border: isAgent ? `1px solid ${colors.border}` : "none",
                  }}
                >
                  <div style={{ whiteSpace: "pre-line" }}>{m.text}</div>

                  {m.metadata && (
                    <div
                      style={{
                        marginTop: "0.6rem",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: isAgent ? "#ffffff" : "rgba(255,255,255,0.1)",
                        borderRadius: radii.md,
                        border: isAgent ? `1px solid ${colors.border}` : "none",
                        fontSize: "11px",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: isAgent ? colors.brandBlue : "#93c5fd" }}>
                        ✓ {m.metadata.title}
                      </div>
                      <div style={{ color: isAgent ? colors.textSecondary : "#e2e8f0", marginTop: "0.15rem" }}>
                        {m.metadata.details}
                      </div>
                    </div>
                  )}
                </div>

                {/* Agent Action Chips */}
                {m.actions && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
                    {m.actions.map((act) => (
                      <button
                        key={act.action}
                        onClick={() => handleSend(act.label)}
                        style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: radii.full,
                          border: `1px solid ${colors.borderStrong}`,
                          backgroundColor: colors.surface,
                          fontSize: "11px",
                          color: colors.brandBlue,
                          cursor: "pointer",
                          fontWeight: 500,
                          transition: "all 0.1s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceSubtle)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
                      >
                        {act.label} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isProcessing && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: colors.textMuted, fontSize: typography.sizes.xs }}>
              <Icons.Sparkles size={14} color={colors.brandBlue} />
              <span>Analyzing schedule, balances & policies...</span>
            </div>
          )}
        </div>

        {/* Drop zone for document ingestion */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload(e.dataTransfer.files[0].name);
            }
          }}
          style={{
            margin: "0 1rem",
            padding: "0.6rem",
            border: `1px dashed ${dragActive ? colors.brandBlue : colors.border}`,
            borderRadius: radii.md,
            backgroundColor: dragActive ? colors.brandBlueSubtle : colors.surfaceSubtle,
            textAlign: "center",
            fontSize: "11px",
            color: colors.textMuted,
            cursor: "pointer",
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.jpg,.png,.doc";
            input.onchange = (e: any) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0].name);
            };
            input.click();
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            <Icons.Paperclip size={13} />
            <span>Drop sick note or expense receipt for instant OCR filing</span>
          </span>
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <input
            type="text"
            placeholder="Ask Dede what you need done..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.sizes.sm,
              outline: "none",
            }}
          />
          <Button variant="primary" size="sm" onClick={() => handleSend()}>
            <Icons.Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

