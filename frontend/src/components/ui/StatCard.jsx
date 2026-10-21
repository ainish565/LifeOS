import styles from './StatCard.module.css'

const THEME_CONFIGS = {
  emerald: {
    color: 'var(--emerald)',
    badgeBg: 'var(--emerald-subtle)',
    badgeBorder: 'var(--emerald-border)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  purple: {
    color: 'var(--accent)',
    badgeBg: 'var(--accent-subtle)',
    badgeBorder: 'var(--accent-border)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  amber: {
    color: 'var(--amber)',
    badgeBg: 'var(--amber-subtle)',
    badgeBorder: 'var(--amber-border)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  rose: {
    color: 'var(--rose)',
    badgeBg: 'var(--rose-subtle)',
    badgeBorder: 'var(--rose-border)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M7 15h0M2 10h20" />
      </svg>
    ),
  },
}

export default function StatCard({ card }) {
  const { label, value, sub, change, color = 'emerald', sparkProgress = 50, isPositive = false } = card

  let themeKey = 'emerald'
  if (color === 'purple' || color === 'indigo') themeKey = 'purple'
  else if (color === 'amber' || color === 'warning') themeKey = 'amber'
  else if (color === 'rose' || color === 'pink' || color === 'danger') themeKey = 'rose'

  const cfg = THEME_CONFIGS[themeKey] || THEME_CONFIGS.emerald

  return (
    <div className={styles.statCard}>
      {/* Top Header with Icon & Label */}
      <div className={styles.header}>
        <div
          className={styles.iconCircle}
          style={{
            color: cfg.color,
            backgroundColor: cfg.badgeBg,
            borderColor: cfg.badgeBorder,
          }}
        >
          {cfg.icon}
        </div>
        <span className={styles.label}>{label}</span>
      </div>

      {/* Main Metric Value */}
      <div className={styles.metricRow}>
        <span className={styles.valueNumber}>{value}</span>
        {sub && <span className={styles.valueSub}> {sub}</span>}
      </div>

      {/* Micro Progress Bar */}
      <div className={styles.progressBarTrack}>
        <div
          className={styles.progressBarFill}
          style={{
            width: `${Math.min(Math.max(sparkProgress, 5), 100)}%`,
            backgroundColor: cfg.color,
          }}
        />
      </div>

      {/* Footer Text / Trend */}
      <div className={styles.footerRow}>
        <span className={`${styles.footerText} ${isPositive ? styles.positiveText : ''}`}>
          {isPositive ? `↑ ${change}` : change}
        </span>
      </div>
    </div>
  )
}
