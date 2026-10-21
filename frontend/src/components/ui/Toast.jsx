import { motion, AnimatePresence } from 'framer-motion'
import styles from './Toast.module.css'

export default function Toast({ toasts, onDismiss }) {
  return (
    <div className={styles.toastContainer} aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`${styles.toastItem} ${styles[toast.type] || styles.info}`}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.toastIcon}>
              {toast.type === 'success' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="12" y1="7" x2="12.01" y2="7" />
                </svg>
              )}
            </div>
            <div className={styles.toastContent}>
              <div className={styles.toastTitle}>{toast.title}</div>
              {toast.message && <div className={styles.toastMsg}>{toast.message}</div>}
            </div>
            <button
              className={styles.dismissBtn}
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss toast"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
