type IconName =
  | "overview"
  | "graph"
  | "requests"
  | "audit"
  | "risk"
  | "search"
  | "bell"
  | "chevron"
  | "arrow"
  | "filter"
  | "download"
  | "check"
  | "clock";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "overview") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    );
  }

  if (name === "graph") {
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="7" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="m8.2 7.1 7.5-.1M7.3 8.1l3.5 7.7m5.9-6.7-3.5 6.7" />
      </svg>
    );
  }

  if (name === "requests") {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M8 8h8M8 12h5M8 16h3" />
      </svg>
    );
  }

  if (name === "audit") {
    return (
      <svg {...common}>
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 7v5l3 2M17 3h4v4" />
      </svg>
    );
  }

  if (name === "risk") {
    return (
      <svg {...common}>
        <path d="M12 3 3.8 18a2 2 0 0 0 1.8 3h12.8a2 2 0 0 0 1.8-3Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }

  if (name === "chevron") {
    return (
      <svg {...common}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg {...common}>
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
    );
  }

  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
