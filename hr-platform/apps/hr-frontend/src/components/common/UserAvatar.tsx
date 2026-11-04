import React from "react";
import { colors } from "../../design-system/tokens";

interface UserAvatarProps {
  name: string;
  /** Shown when there is no photo. Defaults to the initials of `name`. */
  initials?: string;
  photoUrl?: string | null;
  size?: number;
  background?: string;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, initials, photoUrl, size = 30, background = colors.indigoAction }) => {
  const box: React.CSSProperties = { width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden" };
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} style={{ ...box, objectFit: "cover", display: "block" }} />;
  }
  return (
    <div
      role="img"
      aria-label={name}
      style={{
        ...box,
        backgroundColor: background,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, Math.round(size * 0.37)),
        fontWeight: 700,
      }}
    >
      {initials || initialsOf(name)}
    </div>
  );
};
