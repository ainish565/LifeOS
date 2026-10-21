import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import styles from './Topbar.module.css'

export default function Topbar({
  pageTitle = 'Executive Overview',
  onMobileMenuOpen,
  onOpenSearch,
}) {
  const [timeStr, setTimeStr] = useState('')
  const [dateStr, setDateStr] = useState('')
  const { isDark, toggleMode } = useTheme()

  // Dynamic live clock formatting matching "Tue, Aug 18 • 12:06 AM"
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const dStr = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const tStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      setDateStr(dStr)
      setTimeStr(tStr)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        {/* Mobile menu trigger */}
        <button
          className={styles.mobileMenuBtn}
          onClick={onMobileMenuOpen}
          aria-label="Open sidebar navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <h1 className={styles.pageTitle}>{pageTitle}</h1>

        {/* Date & Time Capsule Badge matching screenshot */}
        <div className={styles.dateTimeCapsule}>
          <svg
            className={styles.calendarIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{dateStr || 'Today'}</span>
          <span className={styles.capsuleDot}>•</span>
          <span>{timeStr || '12:00 PM'}</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        {/* Search Icon Button */}
        <button
          className={styles.actionBtn}
          onClick={onOpenSearch}
          aria-label="Search"
          aria-keyshortcuts="Control+K"
          title="Search (Ctrl + K)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Light / Dark Mode Toggle Button */}
        <button
          className={styles.actionBtn}
          onClick={toggleMode}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Notifications Icon Button */}
        <button className={styles.actionBtn} aria-label="Notifications" title="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className={styles.notificationDot} />
        </button>

        {/* User Avatar with Green Online Indicator & Settings Link */}
        <Link to="/settings" className={styles.userAvatarPill} aria-label="Open Settings">
          <div className={styles.avatarCircle}>LO</div>
          <span className={styles.onlineBadge} />
        </Link>
      </div>
    </header>
  )
}
