import type { SVGProps } from "react";

/** Shared geometry for every icon: 24-grid, 1.6 stroke, round joins. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const PlusIcon = (p: P) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const SearchIcon = (p: P) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Icon>;
export const PanelIcon = (p: P) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9.5 4v16" /></Icon>
);
export const SlidersIcon = (p: P) => (
  <Icon {...p}><path d="M5 20v-7M5 9V4M12 20v-9M12 7V4M19 20v-4M19 12V4" /><circle cx="5" cy="11" r="2" /><circle cx="12" cy="9" r="2" /><circle cx="19" cy="14" r="2" /></Icon>
);
export const SunIcon = (p: P) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>
);
export const MoonIcon = (p: P) => <Icon {...p}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" /></Icon>;
export const MonitorIcon = (p: P) => (
  <Icon {...p}><rect x="2.5" y="4" width="19" height="12.5" rx="2" /><path d="M8.5 20.5h7M12 16.5v4" /></Icon>
);
export const ArrowUpIcon = (p: P) => <Icon {...p}><path d="M12 19V6M6 12l6-6 6 6" /></Icon>;
export const StopIcon = (p: P) => <Icon {...p}><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" /></Icon>;
export const CopyIcon = (p: P) => (
  <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2.2" /><path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h8.5A1.5 1.5 0 0 1 15 5v.5" /></Icon>
);
export const CheckIcon = (p: P) => <Icon {...p}><path d="m4.5 12.5 5 5 10-11" /></Icon>;
export const RetryIcon = (p: P) => (
  <Icon {...p}><path d="M20 11a8 8 0 1 0-2.3 6.1" /><path d="M20 4.5V11h-6.5" /></Icon>
);
export const PencilIcon = (p: P) => (
  <Icon {...p}><path d="M4 20h4L19.5 8.5a2.6 2.6 0 0 0-3.7-3.7L4.3 16.3 4 20Z" /><path d="m14.8 6 3.5 3.5" /></Icon>
);
export const TrashIcon = (p: P) => (
  <Icon {...p}><path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7M6.5 6.5 7.3 19a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12.5" /></Icon>
);
export const PinIcon = (p: P) => (
  <Icon {...p}><path d="M9 3.5h6l-.7 5.2 3.2 3.1H6.5l3.2-3.1L9 3.5ZM12 11.8V20.5" /></Icon>
);
export const DotsIcon = (p: P) => (
  <Icon {...p}><circle cx="5.5" cy="12" r="1.35" fill="currentColor" /><circle cx="12" cy="12" r="1.35" fill="currentColor" /><circle cx="18.5" cy="12" r="1.35" fill="currentColor" /></Icon>
);
export const ChevronDownIcon = (p: P) => <Icon {...p}><path d="m6 9.5 6 6 6-6" /></Icon>;
export const ChevronRightIcon = (p: P) => <Icon {...p}><path d="m9.5 6 6 6-6 6" /></Icon>;
export const CloseIcon = (p: P) => <Icon {...p}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const ChipIcon = (p: P) => (
  <Icon {...p}><rect x="7" y="7" width="10" height="10" rx="2" /><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" opacity="0.35" /><path d="M10 3.5v-2M14 3.5v-2M10 22.5v-2M14 22.5v-2M3.5 10h-2M3.5 14h-2M22.5 10h-2M22.5 14h-2" /></Icon>
);
export const BoltIcon = (p: P) => <Icon {...p}><path d="M13.5 2.5 5 13.5h6L10.5 21.5 19 10.5h-6l.5-8Z" /></Icon>;
export const ClockIcon = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></Icon>;
export const LayersIcon = (p: P) => (
  <Icon {...p}><path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" /><path d="m3.5 12.2 8.5 4.5 8.5-4.5M3.5 16.7 12 21.2l8.5-4.5" /></Icon>
);
export const WarnIcon = (p: P) => (
  <Icon {...p}><path d="M12 4.5 21 19.5H3L12 4.5Z" /><path d="M12 10v4M12 17h.01" /></Icon>
);
export const ChatIcon = (p: P) => (
  <Icon {...p}><path d="M20.5 12.5A7.5 7.5 0 0 1 13 20H4.5l1.8-3.2A7.5 7.5 0 1 1 20.5 12.5Z" /></Icon>
);
export const SparkIcon = (p: P) => (
  <Icon {...p}><path d="M12 3.5c.9 4 2.6 5.7 6.5 6.5-3.9.8-5.6 2.5-6.5 6.5-.9-4-2.6-5.7-6.5-6.5 3.9-.8 5.6-2.5 6.5-6.5Z" /><path d="M18.5 16.5c.4 1.7 1.1 2.4 2.8 2.8-1.7.4-2.4 1.1-2.8 2.7-.4-1.6-1.1-2.3-2.8-2.7 1.7-.4 2.4-1.1 2.8-2.8Z" /></Icon>
);
export const TerminalIcon = (p: P) => (
  <Icon {...p}><rect x="2.5" y="4" width="19" height="16" rx="2.5" /><path d="m7 10 2.5 2L7 14M12.5 14.5h4.5" /></Icon>
);
export const BookIcon = (p: P) => (
  <Icon {...p}><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" /><path d="M4 17.5h15" /></Icon>
);
export const PenIcon = (p: P) => (
  <Icon {...p}><path d="M3.5 20.5 5 16l10-10a2.8 2.8 0 0 1 4 4L9 20l-5.5.5Z" /><path d="M13 8.5 15.5 11" /></Icon>
);
export const CompassIcon = (p: P) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5.2-5.2 2 2-5.2 5.2-2Z" /></Icon>
);
export const RefreshIcon = (p: P) => (
  <Icon {...p}><path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20.5 8.5" /><path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.5" /><path d="M20.5 4v4.5H16M3.5 20v-4.5H8" /></Icon>
);
export const DownloadIcon = (p: P) => (
  <Icon {...p}><path d="M12 3.5v11M7.5 10 12 14.5 16.5 10M4 19.5h16" /></Icon>
);
