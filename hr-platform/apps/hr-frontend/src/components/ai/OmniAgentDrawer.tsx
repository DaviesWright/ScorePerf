"use client";

import React, { useState, useEffect } from "react";
import { colors, typography, radii } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import type { ModuleViewKey, UserPersona } from "../shell/AppSidebar";
import { PERSONA_PROMPT_JOURNEYS, VIEW_CONTEXT_HINTS } from "../shell/FollowThePromptBar";

interface OmniAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: (tab?: "prompts" | "chat") => void;
  initialTab?: "prompts" | "chat";
  persona?: UserPersona;
  currentView?: ModuleViewKey;
  onNavigate?: (view: ModuleViewKey) => void;
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

const SNOOZE_STORAGE_KEY = "scoreview_dede_snooze_until";
const COMPLETED_STEPS_KEY = "scoreview_follow_prompt_completed";

export const OmniAgentDrawer: React.FC<OmniAgentDrawerProps> = ({
  isOpen,
  onClose,
  onOpen,
  initialTab = "prompts",
  persona = "hr_director",
  currentView = "command_centre",
  onNavigate,
  onExecuteWorkflow,
}) => {
  const [activeTab, setActiveTab] = useState<"prompts" | "chat">(initialTab);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  // Sync tab when explicitly opened to a specific tab
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Snooze / "Hide for a period" state (timestamp in ms, or -1 for "Until manually opened")
  const [snoozeUntil, setSnoozeUntil] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
        if (raw) {
          const parsed = Number(raw);
          if (parsed === -1 || parsed > Date.now()) return parsed;
        }
      } catch {}
    }
    return 0;
  });

  const isSnoozed = snoozeUntil === -1 || snoozeUntil > Date.now();

  // Occasional Floating Prompt visibility when sidebar is closed
  const [showOccasionalCard, setShowOccasionalCard] = useState(false);

  // Show occasional floating prompt card briefly when view or persona changes (if not snoozed)
  useEffect(() => {
    if (isSnoozed || isOpen) {
      setShowOccasionalCard(false);
      return;
    }
    const appearTimer = setTimeout(() => {
      setShowOccasionalCard(true);
    }, 450);

    // Auto-tuck away after 14 seconds so the workspace remains clutter-free
    const autoHideTimer = setTimeout(() => {
      setShowOccasionalCard(false);
      setShowSnoozeMenu(false);
    }, 14500);

    return () => {
      clearTimeout(appearTimer);
      clearTimeout(autoHideTimer);
    };
  }, [currentView, persona, isSnoozed, isOpen]);

  const handleSnooze = (durationMs: number | "manual" | "clear") => {
    let nextValue = 0;
    if (durationMs === "clear") {
      nextValue = 0;
    } else if (durationMs === "manual") {
      nextValue = -1;
    } else {
      nextValue = Date.now() + durationMs;
    }
    setSnoozeUntil(nextValue);
    setShowSnoozeMenu(false);
    if (typeof window !== "undefined") {
      try {
        if (nextValue === 0) {
          localStorage.removeItem(SNOOZE_STORAGE_KEY);
        } else {
          localStorage.setItem(SNOOZE_STORAGE_KEY, String(nextValue));
        }
      } catch {}
    }
    if (durationMs !== "clear") {
      setShowOccasionalCard(false);
      onClose();
    }
  };

  // Guided Prompts State
  const journey = PERSONA_PROMPT_JOURNEYS[persona] || PERSONA_PROMPT_JOURNEYS.hr_director;
  const contextHint = VIEW_CONTEXT_HINTS[currentView] || VIEW_CONTEXT_HINTS.command_centre;

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(COMPLETED_STEPS_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  useEffect(() => {
    const firstIncompleteIdx = journey.steps.findIndex((s) => !completedIds.includes(s.id));
    setActiveStepIndex(firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0);
  }, [persona, journey.steps, completedIds]);

  const toggleStepComplete = (stepId: string) => {
    setCompletedIds((prev) => {
      const next = prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(COMPLETED_STEPS_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleResetProgress = () => {
    const personaStepIds = journey.steps.map((s) => s.id);
    setCompletedIds((prev) => {
      const next = prev.filter((id) => !personaStepIds.includes(id));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(COMPLETED_STEPS_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    setActiveStepIndex(0);
  };

  const completedCount = journey.steps.filter((s) => completedIds.includes(s.id)).length;
  const totalCount = journey.steps.length;
  const currentStep = journey.steps[activeStepIndex] || journey.steps[0];

  // Dede Conversational Copilot State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "agent",
      text: "Hello! I'm Dede, your unified AI Copilot & Guided Navigator. Switch to 'Guided Prompts' for your 5-step role checklist, or ask me to execute an HR workflow below.",
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
          text: "I analyzed your workforce profile: You have 18 days of Annual Leave remaining and 96% squad coverage on Friday. I've drafted and submitted your leave request.",
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
          text: "Non-stop corporate partner flights from London Heathrow (LHR) to Accra (ACC) on Friday:\n\n• British Airways BA081 — 13:40 GMT → 19:55 GMT\n• Virgin Atlantic VS401 — 22:15 GMT → 04:30+1 GMT",
          metadata: {
            type: "travel_intel",
            title: "Corporate Flight Options",
            details: "LHR → ACC • Booking code SEN-CORP-LON active",
          },
        };
      } else if (lower.includes("scan") || lower.includes("sick") || lower.includes("receipt") || lower.includes("doc")) {
        agentReply = {
          id: `a-${Date.now()}`,
          sender: "agent",
          text: "Document OCR complete: 'Dr. Mensah & Associates Medical Certificate — 2 Days Medical Leave'. Logged and verified with People & Culture.",
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
          text: `Completed: "${query}". Your records have been updated across the platform.`,
        };
      }

      setMessages((prev) => [...prev, agentReply]);
      setIsProcessing(false);
    }, 650);
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
        text: `Extracted from ${fileName}: Validated Medical Note. 2 days of Medical Leave recorded with 0 deduction from Annual Leave.`,
        metadata: {
          type: "doc_ingest",
          title: "Automated OCR Extraction Complete",
          details: "Type: Medical Absence • Status: Verified & Approved",
        },
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsProcessing(false);
    }, 750);
  };

  const formatSnoozeLabel = () => {
    if (snoozeUntil === -1) return "Hidden until opened manually";
    if (snoozeUntil <= Date.now()) return null;
    const mins = Math.max(1, Math.round((snoozeUntil - Date.now()) / 60000));
    if (mins < 60) return `Hidden for ${mins}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `Hidden for ${hours}h`;
    const days = Math.round(hours / 24);
    return `Hidden for ${days}d`;
  };

  const renderSnoozeDropdown = () => (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: "215px",
        backgroundColor: "#ffffff",
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: radii.md,
        boxShadow: "0 10px 25px rgba(15, 23, 42, 0.16)",
        padding: "0.35rem",
        zIndex: 150,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: colors.textMuted,
          padding: "0.3rem 0.5rem",
        }}
      >
        Hide Auto-Prompts For...
      </div>
      {[
        { label: "1 Hour", value: 60 * 60 * 1000 },
        { label: "4 Hours", value: 4 * 60 * 60 * 1000 },
        { label: "24 Hours (Today)", value: 24 * 60 * 60 * 1000 },
        { label: "7 Days", value: 7 * 24 * 60 * 60 * 1000 },
        { label: "Until I click Dede AI (⌘J)", value: "manual" as const },
      ].map((opt) => (
        <button
          key={opt.label}
          onClick={() => handleSnooze(opt.value)}
          style={{
            width: "100%",
            textAlign: "left",
            background: "none",
            border: "none",
            padding: "0.4rem 0.55rem",
            fontSize: "11px",
            fontWeight: 500,
            color: colors.textPrimary,
            borderRadius: radii.sm,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceSubtle)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <span>{opt.label}</span>
        </button>
      ))}
      {isSnoozed && (
        <button
          onClick={() => handleSnooze("clear")}
          style={{
            width: "100%",
            textAlign: "left",
            background: "#ecfdf5",
            border: "none",
            marginTop: "0.25rem",
            padding: "0.4rem 0.55rem",
            fontSize: "11px",
            fontWeight: 700,
            color: "#059669",
            borderRadius: radii.sm,
            cursor: "pointer",
          }}
        >
          Resume Occasional Prompts
        </button>
      )}
    </div>
  );

  // 1. OCCASIONAL FLOATING CONTEXTUAL PROMPT (When sidebar is closed & not snoozed)
  if (!isOpen) {
    if (!showOccasionalCard || isSnoozed || completedCount === totalCount) {
      return null;
    }

    return (
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "340px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: `1px solid ${colors.indigoBorder}`,
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
          padding: "0.85rem 1rem",
          zIndex: 90,
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
        }}
      >
        {/* Top Row: Dede Identity + Step Counter + Hide Menu + Dismiss */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div
            onClick={() => onOpen?.("prompts")}
            style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}
          >
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "6px",
                backgroundColor: colors.indigoAction,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.Sparkles size={12} />
            </div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary }}>
              Dede AI • Step {currentStep.stepNumber} of {totalCount}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <button
              onClick={() => setShowSnoozeMenu((prev) => !prev)}
              style={{
                background: colors.surfaceSubtle,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.sm,
                padding: "0.15rem 0.45rem",
                fontSize: "10px",
                fontWeight: 600,
                color: colors.textSecondary,
                cursor: "pointer",
              }}
              title="Hide Dede prompts for a period"
            >
              Hide ▾
            </button>
            <button
              onClick={() => setShowOccasionalCard(false)}
              style={{
                background: "none",
                border: "none",
                color: colors.textMuted,
                cursor: "pointer",
                padding: "2px",
                display: "flex",
              }}
              title="Dismiss for now"
            >
              <Icons.X size={14} />
            </button>
          </div>

          {showSnoozeMenu && renderSnoozeDropdown()}
        </div>

        {/* Step Title & Concise Contextual Hint */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textPrimary, lineHeight: 1.35 }}>
            {currentStep.title}
          </div>
          <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "0.2rem", lineHeight: 1.4 }}>
            {contextHint.whatToDoHere}
          </div>
        </div>

        {/* Compact Action Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", paddingTop: "0.15rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <button
              onClick={() => {
                onNavigate?.(currentStep.targetView);
                setShowOccasionalCard(false);
              }}
              style={{
                backgroundColor: colors.indigoAction,
                color: "#ffffff",
                border: "none",
                borderRadius: radii.sm,
                padding: "0.3rem 0.65rem",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <span>{currentStep.actionLabel}</span>
              <Icons.ArrowRight size={11} />
            </button>

            <button
              onClick={() => toggleStepComplete(currentStep.id)}
              style={{
                backgroundColor: colors.surfaceSubtle,
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.sm,
                padding: "0.3rem 0.5rem",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Done ✓
            </button>
          </div>

          <button
            onClick={() => onOpen?.("chat")}
            style={{
              background: "none",
              border: "none",
              color: colors.indigoAction,
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Ask Dede →
          </button>
        </div>
      </div>
    );
  }

  // 2. UNIFIED FLOATING SIDEBAR (Non-blocking, floating on the right edge)
  return (
    <aside
      aria-label="Dede AI and Follow the Prompt Floating Sidebar"
      style={{
        position: "fixed",
        top: "14px",
        bottom: "14px",
        right: "14px",
        width: "390px",
        maxWidth: "calc(100vw - 28px)",
        backgroundColor: colors.surface,
        borderRadius: "16px",
        border: `1px solid ${colors.borderStrong}`,
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)",
        zIndex: 110,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Clean Header */}
      <div
        style={{
          padding: "0.85rem 1rem",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surface,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: radii.md,
              backgroundColor: colors.indigoAction,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
            <Icons.Sparkles size={15} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: colors.textPrimary }}>
                Dede AI
              </span>
              <Badge variant="info" size="sm">
                {completedCount}/{totalCount} Steps
              </Badge>
            </div>
            <div style={{ fontSize: "10px", color: colors.textMuted }}>
              Guided Prompts & Workflow Copilot
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={() => setShowSnoozeMenu((prev) => !prev)}
            style={{
              background: isSnoozed ? "#fffbeb" : colors.surfaceSubtle,
              border: `1px solid ${isSnoozed ? "#fde68a" : colors.border}`,
              borderRadius: radii.sm,
              padding: "0.25rem 0.55rem",
              fontSize: "11px",
              fontWeight: 600,
              color: isSnoozed ? "#92400e" : colors.textSecondary,
              cursor: "pointer",
            }}
            title="Hide occasional auto-prompts for a period"
          >
            {isSnoozed ? "Snoozed ▾" : "Hide ▾"}
          </button>

          <button
            onClick={() => {
              setShowSnoozeMenu(false);
              onClose();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: colors.textMuted,
              padding: "0.25rem",
              display: "flex",
            }}
            title="Close sidebar (⌘J)"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {showSnoozeMenu && renderSnoozeDropdown()}
      </div>

      {/* Snooze Active Notice (Only shown when snoozed) */}
      {isSnoozed && (
        <div
          style={{
            padding: "0.45rem 1rem",
            backgroundColor: "#fffbeb",
            borderBottom: "1px solid #fde68a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#92400e",
          }}
        >
          <span>{formatSnoozeLabel()}</span>
          <button
            onClick={() => handleSnooze("clear")}
            style={{
              background: "none",
              border: "none",
              color: "#b45309",
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Resume
          </button>
        </div>
      )}

      {/* Segmented Mode Switcher: Follow the Prompt vs Ask Dede Chat */}
      <div
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: colors.surfaceSubtle,
          borderBottom: `1px solid ${colors.border}`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.35rem",
        }}
      >
        <button
          onClick={() => setActiveTab("prompts")}
          style={{
            padding: "0.4rem 0.6rem",
            borderRadius: radii.sm,
            border: activeTab === "prompts" ? `1px solid ${colors.border}` : "1px solid transparent",
            backgroundColor: activeTab === "prompts" ? "#ffffff" : "transparent",
            boxShadow: activeTab === "prompts" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            fontSize: "11px",
            fontWeight: 700,
            color: activeTab === "prompts" ? colors.indigoPrimary : colors.textSecondary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
          }}
        >
          <Icons.Compass size={13} color={activeTab === "prompts" ? colors.indigoAction : colors.textMuted} />
          <span>Follow the Prompt ({completedCount}/{totalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          style={{
            padding: "0.4rem 0.6rem",
            borderRadius: radii.sm,
            border: activeTab === "chat" ? `1px solid ${colors.border}` : "1px solid transparent",
            backgroundColor: activeTab === "chat" ? "#ffffff" : "transparent",
            boxShadow: activeTab === "chat" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            fontSize: "11px",
            fontWeight: 700,
            color: activeTab === "chat" ? colors.indigoPrimary : colors.textSecondary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
          }}
        >
          <Icons.Sparkles size={13} color={activeTab === "chat" ? colors.indigoAction : colors.textMuted} />
          <span>Ask Dede Chat</span>
        </button>
      </div>

      {/* TAB 1: FOLLOW THE PROMPT (Clutter-free contextual guide & 5 steps) */}
      {activeTab === "prompts" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Current Screen Context Card */}
          <div
            style={{
              padding: "0.75rem 0.85rem",
              borderRadius: radii.md,
              backgroundColor: colors.indigoSubtle,
              border: `1px solid ${colors.indigoBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: colors.indigoAction }}>
                On This Screen
              </span>
              <button
                onClick={() => onNavigate?.(contextHint.nextSuggestedView)}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.indigoPrimary,
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {contextHint.nextSuggestedLabel}
              </button>
            </div>
            <div style={{ fontSize: "11px", color: colors.textSecondary, lineHeight: 1.45 }}>
              {contextHint.whatToDoHere}
            </div>
          </div>

          {/* Role Journey Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary }}>
              {journey.roleTitle}
            </span>
            <button
              onClick={handleResetProgress}
              style={{
                background: "none",
                border: "none",
                color: colors.textMuted,
                fontSize: "10px",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Reset
            </button>
          </div>

          {/* Compact 5-Step List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {journey.steps.map((step, idx) => {
              const isDone = completedIds.includes(step.id);
              const isCurrent = idx === activeStepIndex;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStepIndex(idx)}
                  style={{
                    padding: "0.7rem 0.8rem",
                    borderRadius: radii.md,
                    border: `1px solid ${isCurrent ? colors.indigoAction : isDone ? "#a7f3d0" : colors.border}`,
                    backgroundColor: isCurrent ? "#ffffff" : isDone ? "rgba(16, 185, 129, 0.03)" : colors.surfaceSubtle,
                    cursor: "pointer",
                    transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStepComplete(step.id);
                      }}
                      title={isDone ? "Mark incomplete" : "Mark done"}
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: isDone ? "none" : `1.5px solid ${isCurrent ? colors.indigoAction : colors.borderStrong}`,
                        backgroundColor: isDone ? "#10b981" : isCurrent ? colors.indigoAction : "#ffffff",
                        color: isDone || isCurrent ? "#ffffff" : colors.textSecondary,
                        fontSize: "10px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        cursor: "pointer",
                        marginTop: "1px",
                      }}
                    >
                      {isDone ? "✓" : step.stepNumber}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: isDone ? colors.textMuted : colors.textPrimary,
                          textDecoration: isDone ? "line-through" : "none",
                          lineHeight: 1.35,
                        }}
                      >
                        {step.title}
                      </div>

                      {isCurrent && (
                        <>
                          <p style={{ margin: "0.3rem 0 0.5rem 0", fontSize: "11px", color: colors.textSecondary, lineHeight: 1.45 }}>
                            {step.promptText}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate?.(step.targetView);
                              }}
                              style={{
                                backgroundColor: colors.indigoAction,
                                color: "#ffffff",
                                border: "none",
                                borderRadius: radii.sm,
                                padding: "0.3rem 0.65rem",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <span>{step.actionLabel}</span>
                              <Icons.ArrowRight size={11} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStepComplete(step.id);
                              }}
                              style={{
                                backgroundColor: colors.surfaceSubtle,
                                color: colors.textSecondary,
                                border: `1px solid ${colors.border}`,
                                borderRadius: radii.sm,
                                padding: "0.3rem 0.55rem",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {isDone ? "Undo" : "Mark Done"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TAB 2: ASK DEDE COPILOT CHAT */
        <>
          <div style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
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
                      maxWidth: "88%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: radii.lg,
                      backgroundColor: isAgent ? colors.surfaceSubtle : colors.brandNavy,
                      color: isAgent ? colors.textPrimary : "#ffffff",
                      fontSize: "12px",
                      lineHeight: 1.5,
                      border: isAgent ? `1px solid ${colors.border}` : "none",
                    }}
                  >
                    <div style={{ whiteSpace: "pre-line" }}>{m.text}</div>

                    {m.metadata && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.45rem 0.65rem",
                          backgroundColor: isAgent ? "#ffffff" : "rgba(255,255,255,0.1)",
                          borderRadius: radii.md,
                          border: isAgent ? `1px solid ${colors.border}` : "none",
                          fontSize: "11px",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: isAgent ? colors.brandBlue : "#93c5fd" }}>
                          ✓ {m.metadata.title}
                        </div>
                        <div style={{ color: isAgent ? colors.textSecondary : "#e2e8f0", marginTop: "0.1rem" }}>
                          {m.metadata.details}
                        </div>
                      </div>
                    )}
                  </div>

                  {m.actions && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.4rem" }}>
                      {m.actions.map((act) => (
                        <button
                          key={act.action}
                          onClick={() => handleSend(act.label)}
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            border: `1px solid ${colors.borderStrong}`,
                            backgroundColor: colors.surface,
                            fontSize: "11px",
                            color: colors.brandBlue,
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: colors.textMuted, fontSize: "11px" }}>
                <Icons.Sparkles size={13} color={colors.brandBlue} />
                <span>Analyzing schedule, balances & policies...</span>
              </div>
            )}
          </div>

          {/* Compact Drop zone for document ingestion */}
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
              margin: "0 0.85rem",
              padding: "0.45rem",
              border: `1px dashed ${dragActive ? colors.brandBlue : colors.border}`,
              borderRadius: radii.md,
              backgroundColor: dragActive ? colors.brandBlueSubtle : colors.surfaceSubtle,
              textAlign: "center",
              fontSize: "11px",
              color: colors.textMuted,
              cursor: "pointer",
            }}
            onClick={() => {
              const fileInput = document.createElement("input");
              fileInput.type = "file";
              fileInput.accept = ".pdf,.jpg,.png,.doc";
              fileInput.onchange = (e: any) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0].name);
              };
              fileInput.click();
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
              <Icons.Paperclip size={12} />
              <span>Drop sick note or receipt for OCR filing</span>
            </span>
          </div>

          {/* Input Bar */}
          <div
            style={{
              padding: "0.75rem 0.85rem",
              borderTop: `1px solid ${colors.border}`,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              marginTop: "0.45rem",
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
                padding: "0.45rem 0.65rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: "12px",
                outline: "none",
              }}
            />
            <Button variant="primary" size="sm" onClick={() => handleSend()}>
              <Icons.Send size={13} />
            </Button>
          </div>
        </>
      )}
    </aside>
  );
};
