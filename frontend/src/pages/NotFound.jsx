import { Link, useLocation } from 'react-router-dom'
import styles from './Placeholder.module.css'

export default function NotFound() {
  const { pathname } = useLocation()

  return (
    <div className={styles.placeholderContainer}>
      <div className={styles.heroCard}>
        <div className={styles.badgeRow}>
          <span className={styles.phaseBadge}>404</span>
        </div>

        <h2 className={styles.moduleTitle}>Page not found</h2>
        <p className={styles.moduleDesc}>
          Nothing lives at <code>{pathname}</code>. Check the address, or head back to your overview.
        </p>

        <div className={styles.actionRow}>
          <Link to="/" className={styles.backBtn}>
            ← Return to Overview
          </Link>
        </div>
      </div>
    </div>
  )
}
