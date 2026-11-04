import React, { useRef, useState } from "react";
import { colors, typography, radii } from "../../design-system/tokens";

interface PhotoUploadButtonProps {
  label: string;
  /** Resolves to an error message to show, or null on success. */
  onUpload: (file: File) => Promise<string | null>;
  buttonStyle?: React.CSSProperties;
}

export const PhotoUploadButton: React.FC<PhotoUploadButtonProps> = ({ label, onUpload, buttonStyle }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again
    if (!file) return;
    setBusy(true);
    setError(await onUpload(file));
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          input.current?.click();
        }}
        style={{
          padding: "0.4rem 0.75rem",
          border: `1px solid ${colors.indigoBorder}`,
          borderRadius: radii.md,
          backgroundColor: colors.indigoSubtle,
          color: colors.indigoPrimary,
          fontSize: typography.sizes.xs,
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
          ...buttonStyle,
        }}
      >
        {busy ? "Uploading…" : label}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} style={{ display: "none" }} aria-label={label} />
      {error && (
        <span role="alert" style={{ display: "block", marginTop: "0.3rem", fontSize: "11px", color: colors.error }}>
          {error}
        </span>
      )}
    </>
  );
};
