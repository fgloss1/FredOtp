type IconName = string;

type UiIconProps = {
  name: IconName;
  className?: string;
  strokeWidth?: number;
};

export function UiIcon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.8,
}: UiIconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "globe") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
  }

  if (name === "phone") {
    return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" /></svg>;
  }

  if (name === "lock") {
    return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
  }

  if (name === "bolt") {
    return <svg {...common}><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></svg>;
  }

  if (name === "wallet") {
    return <svg {...common}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" /><path d="M4 7h16M16 13h4" /><circle cx="16" cy="13" r=".5" fill="currentColor" /></svg>;
  }

  if (name === "repeat") {
    return <svg {...common}><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
  }

  if (name === "shield") {
    return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>;
  }

  if (name === "code") {
    return <svg {...common}><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></svg>;
  }

  if (name === "naira") {
    return <svg {...common}><path d="M7 5v14M17 5v14M5 8h14M5 12h14M7 5l10 14M17 5 7 19" /></svg>;
  }

  if (name === "receipt") {
    return <svg {...common}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>;
  }

  if (name === "credit-card") {
    return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></svg>;
  }

  if (name === "bank") {
    return <svg {...common}><path d="m3 10 9-6 9 6" /><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" /></svg>;
  }

  if (name === "gift") {
    return <svg {...common}><path d="M20 12v8H4v-8M2 8h20v4H2zM12 8v12" /><path d="M12 8H8.5a2.5 2.5 0 1 1 2.5-2.5V8ZM12 8h3.5A2.5 2.5 0 1 0 13 5.5V8Z" /></svg>;
  }

  if (name === "loader") {
    return <svg {...common}><path d="M21 12a9 9 0 1 1-3.5-7.1" /></svg>;
  }

  if (name === "check") {
    return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  }

  if (name === "alert") {
    return <svg {...common}><path d="M10.3 3.4 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>;
  }

  if (name === "search") {
    return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></svg>;
  }

  if (name === "inbox") {
    return <svg {...common}><path d="M4 4h16l2 10v5H2v-5L4 4Z" /><path d="M2 14h5l2 3h6l2-3h5" /></svg>;
  }

  if (name === "message") {
    return <svg {...common}><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.4-.7L4 20l1.7-3.5A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" /></svg>;
  }

  return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></svg>;
}
