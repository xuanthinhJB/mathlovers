type P = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconPlus = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconSend = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const IconCamera = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5Z" />
    <circle cx="12" cy="12.5" r="3.2" />
  </svg>
);

export const IconImage = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17M14.5 15l2-2a2 2 0 0 1 2.8 0L20 13.8" />
  </svg>
);

export const IconLightbulb = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.1 1 1.6l.1.5h4.8l.1-.5c.1-.5.4-1.1 1-1.6A6 6 0 0 0 12 3Z" />
  </svg>
);

export const IconTrash = ({ className, size = 15 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7M6.5 7l.7 12.1A1.5 1.5 0 0 0 8.7 20.5h6.6a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
  </svg>
);

export const IconMenu = ({ className, size = 19 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconSparkle = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z" />
    <path d="M18.5 4.2 19 5.7l1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5Z" />
  </svg>
);

export const IconBook = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2.5 2.5 0 0 1 2 1 2.5 2.5 0 0 1 2-1h4.5A1.5 1.5 0 0 1 20 5.5v12a1.5 1.5 0 0 1-1.5 1.5H14a2.5 2.5 0 0 0-2 1 2.5 2.5 0 0 0-2-1H5.5A1.5 1.5 0 0 1 4 17.5Z" />
    <path d="M12 5v15" />
  </svg>
);

export const IconUsers = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16.5 6.2a3.2 3.2 0 0 1 0 6.1M17.5 14.5a5.5 5.5 0 0 1 3 5" />
  </svg>
);

export const IconChip = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
  </svg>
);

export const IconSliders = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);

export const IconHome = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1Z" />
  </svg>
);

export const IconShapes = ({ className, size = 17 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9.2 3.6 15 13.2H3.4Z" />
    <circle cx="16.6" cy="16.6" r="4.4" />
  </svg>
);

export const IconLogo = ({ className, size = 26 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="9" fill="var(--accent)" />
    <path
      d="M9 21.5V11l4.6 6.2L18.2 11v10.5"
      stroke="var(--on-accent)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="23.4" cy="12.4" r="1.7" fill="var(--on-accent)" />
  </svg>
);
