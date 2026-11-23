import React from "react";

// For actions that are shown but not built yet. The control is visibly disabled and says so on hover,
// instead of a pop-up pretending the action happened.
export const COMING_SOON_TITLE = "Coming soon. This action is not available yet.";

export const comingSoonProps = {
  disabled: true,
  "aria-disabled": true,
  title: COMING_SOON_TITLE,
} as const;

export const ComingSoonTag: React.FC = () => (
  <span
    style={{
      marginLeft: "0.35rem",
      padding: "0.05rem 0.4rem",
      borderRadius: "999px",
      backgroundColor: "#f1f5f9",
      border: "1px solid #cbd5e1",
      color: "#475569",
      fontSize: "10px",
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}
  >
    Coming soon
  </span>
);
