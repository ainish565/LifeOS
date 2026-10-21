import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInitials } from '../utils/user'
import styles from './Profile.module.css'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Profile() {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      setLoggingOut(false)
    }
  }

  return (
    <div className={styles.profile}>
      <section className={styles.headerCard} aria-labelledby="profile-name">
        <div className={styles.avatar} aria-hidden="true">{getInitials(user.name)}</div>
        <div className={styles.identity}>
          <h2 className={styles.name} id="profile-name">{user.name}</h2>
          <span className={styles.email}>{user.email}</span>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="account-heading">
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle} id="account-heading">Account details</h3>
          <p className={styles.cardSubtitle}>The information tied to your Life OS account.</p>
        </div>

        <dl className={styles.details}>
          <div className={styles.row}>
            <dt>Full name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className={styles.row}>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className={styles.row}>
            <dt>Member since</dt>
            <dd>{formatDate(user.created_at)}</dd>
          </div>
          <div className={styles.row}>
            <dt>Session</dt>
            <dd>Signed in on this device · stays active for 7 days</dd>
          </div>
        </dl>

        <div className={styles.actions}>
          <Link to="/settings" className={styles.secondaryBtn}>Open settings</Link>
          <button type="button" className={styles.dangerBtn} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </section>
    </div>
  )
}
