interface PropsIcono {
  s?: number;
}

const base = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Mic = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </svg>
);

export const Camera = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const Paperclip = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <path d="m21 12-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" />
  </svg>
);

export const Send = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.8">
    <path d="m5 12 14-7-7 14-2-5z" />
  </svg>
);

export const Brain = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.5">
    <path d="M9 4a3 3 0 0 0-3 3v.5A3.5 3.5 0 0 0 4 11a3.5 3.5 0 0 0 1 5.5A3 3 0 0 0 9 20V4z" />
    <path d="M15 4a3 3 0 0 1 3 3v.5A3.5 3.5 0 0 1 20 11a3.5 3.5 0 0 1-1 5.5A3 3 0 0 1 15 20V4z" />
  </svg>
);

export const Map = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

export const Doc = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);

export const Coin = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10M9 9.5h4a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3h4" />
  </svg>
);

export const Arrow = ({ s = 14 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.8">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

export const Check = ({ s = 14 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="2.2">
    <path d="m4 12 5 5L20 6" />
  </svg>
);

export const Alert = ({ s = 18 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.8">
    <path d="M12 3 2 21h20z" />
    <path d="M12 10v5M12 18.5v.5" />
  </svg>
);

export const Phone = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.8">
    <path d="M22 17v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L7.9 9.6a16 16 0 0 0 6.5 6.5l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2" />
  </svg>
);

export const Plus = ({ s = 14 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Reset = ({ s = 14 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.8">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const Pulse = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.8">
    <path d="M3 12h4l2-6 4 12 2-6h6" />
  </svg>
);

export const Cal = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const Pin = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export const Lock = ({ s = 14 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.6">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const Settings = ({ s = 16 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const Sparkle = ({ s = 14 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2 13.5 9 21 12 13.5 15 12 22 10.5 15 3 12 10.5 9z" />
  </svg>
);

export const Sun = ({ s = 14 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.7">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
  </svg>
);

export const Moon = ({ s = 14 }: PropsIcono) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth="1.7">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export const BrandMark = ({ s = 26 }: PropsIcono) => (
  <div className="brand-mark" style={{ width: s, height: s, borderRadius: s * 0.27 }} />
);
