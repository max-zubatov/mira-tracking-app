import { JobStatus } from '@/lib/types'

// All icons use the Mira lilac accent
const ICON_COLOR = '#C8BCFF'

const icons: Record<JobStatus, (size: number) => React.ReactNode> = {
  tracking: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICON_COLOR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  applied: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICON_COLOR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2" stroke={ICON_COLOR} fill="none"/>
    </svg>
  ),
  interview: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICON_COLOR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  offer: (s) => (
    <svg width={s} height={s} viewBox="0 0 96 96" fill="none">
      {/* Four-point spark — Mira's brand atom */}
      <path d="M48,6 L57,39 L90,48 L57,57 L48,90 L39,57 L6,48 L39,39 Z"
        fill={ICON_COLOR}/>
    </svg>
  ),
  rejected: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICON_COLOR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  archived: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICON_COLOR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  ),
}

interface StatusIconProps { status: JobStatus; size?: number }

export default function StatusIcon({ status, size = 12 }: StatusIconProps) {
  return <span className="shrink-0 flex items-center">{icons[status](size)}</span>
}
