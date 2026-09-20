export type IconName =
  | "home"
  | "sell"
  | "stockIn"
  | "stock"
  | "money"
  | "activity"
  | "camera";

export function Icon({
  name,
  size = 22,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
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
    className,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3.5 10.5 12 3l8.5 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );
    case "sell":
      return (
        <svg {...common}>
          <path d="M4 7h16l-1 12H5L4 7Z" />
          <path d="M8 7a4 4 0 0 1 8 0" />
          <path d="M9 12h6" />
          <path d="m12 9 3 3-3 3" />
        </svg>
      );
    case "stockIn":
      return (
        <svg {...common}>
          <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
          <path d="M4.5 7.7 12 12l7.5-4.3" />
          <path d="M12 12v9" />
          <path d="M9 6.7 16.5 11" />
        </svg>
      );
    case "stock":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "money":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 12h.01M17 12h.01" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4v-10Z" />
          <circle cx="12" cy="13.5" r="3" />
        </svg>
      );
  }
}
