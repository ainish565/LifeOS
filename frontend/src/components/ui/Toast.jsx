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
              {toast.type === 'success' ? '✓' : 'ℹ'}
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
