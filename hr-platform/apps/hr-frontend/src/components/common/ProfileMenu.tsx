import React, { useEffect, useRef, useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { UserAvatar } from "./UserAvatar";
import { PhotoUploadButton } from "./PhotoUploadButton";
import type { ModuleViewKey } from "../shell/AppSidebar";

interface ProfileMenuProps {
  user: { name: string; email: string; role: string; avatarText: string };
  photoUrl?: string | null;
  onUploadPhoto: (file: File) => Promise<string | null>;
  onRemovePhoto: () => void;
  onNavigate: (view: ModuleViewKey) => void;
  onSignOut: () => void;
}

const itemStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.85rem",
  textAlign: "left",
  background: "transparent",
  border: "none",
  fontSize: typography.sizes.xs,
  color: colors.textPrimary,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
};

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ user, photoUrl, onUploadPhoto, onRemovePhoto, onNavigate, onSignOut }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const go = (view: ModuleViewKey) => {
    setOpen(false);
    onNavigate(view);
  };

  return (
    <div ref={root} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: radii.full, padding: "0.15rem 0.6rem 0.15rem 0.15rem", cursor: "pointer" }}
      >
        <UserAvatar name={user.name} initials={user.avatarText} photoUrl={photoUrl} size={28} />
        <span style={{ fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textPrimary, whiteSpace: "nowrap" }}>{user.name}</span>
        <Icons.ChevronDown size={12} color={colors.textMuted} />
      </button>

      {open && (
        <div role="menu" style={{ position: "absolute", top: "120%", right: 0, width: "260px", backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, boxShadow: shadows.md, zIndex: 40, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.85rem", borderBottom: `1px solid ${colors.border}` }}>
            <UserAvatar name={user.name} initials={user.avatarText} photoUrl={photoUrl} size={44} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>{user.name}</div>
              <div style={{ fontSize: "11px", color: colors.textMuted }}>{user.role}</div>
              <div style={{ fontSize: "11px", color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
            </div>
          </div>

          <div style={{ padding: "0.6rem 0.85rem", borderBottom: `1px solid ${colors.border}` }}>
            <PhotoUploadButton label={photoUrl ? "Change photo" : "Upload photo"} onUpload={onUploadPhoto} />
            {photoUrl && (
              <button type="button" onClick={onRemovePhoto} style={{ ...itemStyle, width: "auto", padding: "0.3rem 0", marginTop: "0.35rem", color: colors.textMuted }}>
                Remove photo
              </button>
            )}
          </div>

          <button type="button" role="menuitem" style={itemStyle} onClick={() => go("self_service")}>
            <Icons.Users size={14} color={colors.textMuted} />
            <span>My profile</span>
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => go("employee_settings")}>
            <Icons.Settings size={14} color={colors.textMuted} />
            <span>Settings</span>
          </button>
          <button
            type="button"
            role="menuitem"
            style={{ ...itemStyle, color: colors.error, borderTop: `1px solid ${colors.border}` }}
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <Icons.LogOut size={14} color={colors.error} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};
