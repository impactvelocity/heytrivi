/** Line icons for the demo stage, drawn on a 24px grid. */

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (p: P): P => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  ...p,
});

export const ChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5 10 17.5 19 7" />
  </svg>
);

export const Close = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Plus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Trash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

export const Mic = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const Stop = (p: P) => (
  <svg {...base(p)}>
    <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" stroke="none" />
  </svg>
);

export const Play = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 5.8v12.4a1 1 0 0 0 1.5.86l10-6.2a1 1 0 0 0 0-1.72l-10-6.2A1 1 0 0 0 8 5.8z" fill="currentColor" stroke="none" />
  </svg>
);

export const Info = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5v.01" />
  </svg>
);

export const Send = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const Sliders = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);

export const Crown = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 18H5z" fill="currentColor" />
  </svg>
);

export const Flame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3c.5 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5.5.5 1.5 1.5 2.5 2.5 2.5-.5-2.5 0-5 0-7.5z" />
  </svg>
);

export const Broom = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 4 9.5 12.5M6 13l6.5 3.5L10 21c-3-1-6-3.5-7-6.5zM9.5 12.5l3 1.6" />
  </svg>
);

export const Sparkle = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 2.5l1.9 5.6 5.6 1.9-5.6 1.9L11 17.5l-1.9-5.6L3.5 10l5.6-1.9z" fill="currentColor" stroke="none" />
    <path d="M19 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" stroke="none" />
  </svg>
);

export const Users = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.6 3.5 5.7" />
  </svg>
);

export const Cards = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="3" width="16" height="18" rx="3" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.7-.8 1.2v.4M12 16.5v.01" />
  </svg>
);

export const Palette = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.5-1.9-.3-1 .4-2.1 1.5-2.1H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z" />
    <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
    <circle cx="10.5" cy="7.5" r="1.2" fill="currentColor" />
    <circle cx="15" cy="7.5" r="1.2" fill="currentColor" />
  </svg>
);

export const Trophy = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
  </svg>
);

export const Shuffle = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 7h3.5c2.5 0 3.5 1.5 5 5s2.5 5 5 5H21M3 17h3.5c1.4 0 2.3-.5 3-1.4M14.5 8.4c.7-.9 1.6-1.4 3-1.4H21M18 4l3 3-3 3M18 14l3 3-3 3" />
  </svg>
);
