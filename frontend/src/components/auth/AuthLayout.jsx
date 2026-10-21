import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import BrandMark from '../ui/BrandMark'
import styles from './AuthLayout.module.css'

// Full-page shell for the login / register screens
export default function AuthLayout({ title, subtitle, children, footer }) {
  const { isDark, toggleMode } = useTheme()

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.modeToggle}
        onClick={toggleMode}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <motion.main
        className={styles.card}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.brand}>
          <div className={styles.logoBadge} aria-hidden="true">
            <BrandMark size={20} />
          </div>
          <span className={styles.brandTitle}>Life OS</span>
        </div>

        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {children}

        {footer && <div className={styles.footer}>{footer}</div>}
      </motion.main>
    </div>
  )
}

// Labelled input with inline error message
export function Field({ id, label, error, hint, trailing, ...inputProps }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          className={`${styles.input} ${error ? styles.inputInvalid : ''} ${trailing ? styles.inputWithTrailing : ''}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {trailing && <div className={styles.trailing}>{trailing}</div>}
      </div>
      {error ? (
        <span id={`${id}-error`} className={styles.error}>{error}</span>
      ) : (
        hint && <span id={`${id}-hint`} className={styles.hint}>{hint}</span>
      )}
    </div>
  )
}

export function PasswordToggle({ visible, onToggle }) {
  return (
    <button
      type="button"
      className={styles.toggleBtn}
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
    >
      {visible ? 'Hide' : 'Show'}
    </button>
  )
}

export function FormAlert({ children }) {
  if (!children) return null
  return <div className={styles.alert} role="alert">{children}</div>
}

export function SubmitButton({ loading, children, loadingText }) {
  return (
    <button type="submit" className={styles.submitBtn} disabled={loading} aria-busy={loading}>
      {loading && <span className={styles.btnSpinner} aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  )
}
