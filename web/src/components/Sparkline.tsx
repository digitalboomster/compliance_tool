/** Decorative trend line — not real data */
export function Sparkline({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 16" fill="none" aria-hidden>
      <path
        d="M0 12 Q8 4 16 10 T32 6 T48 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-primary/40"
      />
    </svg>
  )
}
