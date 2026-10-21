import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { safeNextPath } from '../../utils/user'
import styles from './RouteGuards.module.css'

function AuthStatusScreen() {
  const { isLoading, error, retry } = useAuth()

  if (isLoading) {
    return (
      <div className={styles.screen} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden="true" />
        <span className={styles.text}>Loading your workspace…</span>
      </div>
    )
  }

  return (
    <div className={styles.screen} role="alert">
      <h1 className={styles.title}>Can’t reach the Life OS server</h1>
      <p className={styles.text}>
        {error?.message || 'Something went wrong.'} Make sure the backend is running
        (<code>python app.py</code> in <code>backend/</code>), then try again.
      </p>
      <button type="button" className={styles.retryBtn} onClick={() => retry()}>
        Try again
      </button>
    </div>
  )
}

// Renders children only for logged-in users; everyone else goes to /login
export function RequireAuth({ children }) {
  const { user, isLoading, error, loggedOut } = useAuth()
  const location = useLocation()

  if (isLoading || (error && !user)) return <AuthStatusScreen />

  if (!user) {
    const here = location.pathname + location.search
    const target = loggedOut || here === '/' ? '/login' : `/login?next=${encodeURIComponent(here)}`
    return <Navigate to={target} replace />
  }

  return children
}

// Login/register pages: logged-in users are sent on to where they were headed
export function GuestOnly({ children }) {
  const { user, isLoading, error } = useAuth()
  const [searchParams] = useSearchParams()

  if (isLoading || (error && !user)) return <AuthStatusScreen />
  if (user) return <Navigate to={safeNextPath(searchParams.get('next'))} replace />

  return children
}
