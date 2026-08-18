import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

function SvgIcon({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ActivityIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M3 12h4l2.2-6 4.2 12 2.2-6H21" /></SvgIcon>;
}

export function AlertIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M10.3 3.7 2.4 17.3A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.7L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></SvgIcon>;
}

export function BuildingIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M4 21V5a2 2 0 0 1 2-2h8v18" /><path d="M14 9h4a2 2 0 0 1 2 2v10" /><path d="M8 7h2M8 11h2M8 15h2M17 13h.01M17 17h.01M2 21h20" /></SvgIcon>;
}

export function ChevronDownIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="m6 9 6 6 6-6" /></SvgIcon>;
}

export function ClockIcon(props: IconProps) {
  return <SvgIcon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></SvgIcon>;
}

export function DatabaseIcon(props: IconProps) {
  return <SvgIcon {...props}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></SvgIcon>;
}

export function DownloadIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></SvgIcon>;
}

export function GlobeIcon(props: IconProps) {
  return <SvgIcon {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></SvgIcon>;
}

export function LayersIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></SvgIcon>;
}

export function MapPinIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></SvgIcon>;
}

export function MenuIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M4 7h16M4 12h16M4 17h16" /></SvgIcon>;
}

export function RadarIcon(props: IconProps) {
  return <SvgIcon {...props}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 12 18 6M12 2v2M12 20v2M2 12h2M20 12h2" /></SvgIcon>;
}

export function RefreshIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 9M5.5 15A7 7 0 0 0 17.8 17.8L20 15" /></SvgIcon>;
}

export function SearchIcon(props: IconProps) {
  return <SvgIcon {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></SvgIcon>;
}

export function SendIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></SvgIcon>;
}

export function ShieldIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></SvgIcon>;
}

export function SlidersIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="13" cy="18" r="2" /></SvgIcon>;
}

export function SparklesIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" /><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" /><path d="m5 13 .8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z" /></SvgIcon>;
}

export function UsersIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></SvgIcon>;
}
