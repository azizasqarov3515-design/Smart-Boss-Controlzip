import React, { useEffect, useState } from "react";
import { useColors } from "../hooks/useColors";

export function LiveClock() {
  const colors = useColors();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 14px",
        borderRadius: "10px",
        border: `1px solid ${colors.primary}26`, // ~15% opacity primary
        backgroundColor: `${colors.primary}10`, // ~6% opacity primary
        userSelect: "none",
        width: "fit-content"
      }}
    >
      <span
        className="material-icons"
        style={{
          fontSize: "20px",
          color: colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        schedule
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "16px",
            fontWeight: 700,
            color: colors.foreground,
            lineHeight: 1.2
          }}
        >
          {timeStr}
        </span>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "11px",
            color: colors.mutedForeground,
            lineHeight: 1.2,
            textTransform: "capitalize"
          }}
        >
          {dateStr}
        </span>
      </div>
    </div>
  );
}
export default LiveClock;
