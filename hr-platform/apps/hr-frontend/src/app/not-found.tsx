import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#1e1b4b", marginBottom: "0.5rem" }}>
        404 — Page Not Found
      </h1>
      <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
        The requested resource could not be found within the ScoRePerf ecosystem.
      </p>
      <Link
        href="/"
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#4f46e5",
          color: "#ffffff",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "14px",
        }}
      >
        Return to Command Centre
      </Link>
    </div>
  );
}

