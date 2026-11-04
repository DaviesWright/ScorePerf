import React from "react";
import { colors, typography, radii } from "./tokens";

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  width?: string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  density?: "compact" | "normal";
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "No records found.",
  density = "normal",
}: DataTableProps<T>) {
  const rowPadding = density === "compact" ? "0.5rem 0.85rem" : "0.75rem 1rem";

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: typography.sizes.sm,
          fontFamily: typography.fontFamily,
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: colors.surfaceSubtle,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: "0.65rem 1rem",
                  fontSize: "0.6875rem", // 11px
                  fontWeight: typography.weights.semibold,
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  width: col.width,
                  textAlign: col.align || "left",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "3rem 1rem",
                  textAlign: "center",
                  color: colors.textMuted,
                  fontSize: typography.sizes.sm,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={keyExtractor(row, rowIdx)}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: rowIdx === data.length - 1 ? "none" : `1px solid ${colors.borderSubtle}`,
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background-color 0.12s ease",
                  backgroundColor: colors.surface,
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = colors.surface;
                }}
              >
                {columns.map((col, colIdx) => {
                  let content: React.ReactNode = null;
                  if (typeof col.accessor === "function") {
                    content = col.accessor(row);
                  } else if (col.accessor) {
                    content = row[col.accessor] as unknown as React.ReactNode;
                  }
                  return (
                    <td
                      key={colIdx}
                      style={{
                        padding: rowPadding,
                        color: colors.textSecondary,
                        textAlign: col.align || "left",
                        verticalAlign: "middle",
                      }}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

