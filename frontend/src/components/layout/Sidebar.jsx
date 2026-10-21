import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../utils/user'
import styles from './Sidebar.module.css'

const NAV_GROUPS = [
  {
    title: 'WORKSPACE',
    items: [
      { to: '/', label: 'Overview', icon: IconOverview, exact: true },
      { to: '/tasks', label: 'Tasks', icon: IconTasks, badge: '5' },
      { to: '/calendar', label: 'Calendar', icon: IconCalendar },
    ],
  },
  {
    title: 'SELF & LIFE',
    items: [
      { to: '/habits', label: 'Habits', icon: IconHabits },
      { to: '/goals', label: 'Goals', icon: IconGoals },
      { to: '/study', label: 'Study & Focus', icon: IconStudy },
    ],
  },
  {
    title: 'FINANCE & RECORDS',
    items: [
      { to: '/expenses', label: 'Finances', icon: IconFinances },
      { to: '/notes', label: 'Notes & Journal', icon: IconNotes },
      { to: '/analytics', label: 'Performance', icon: IconAnalytics },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user } = useAuth()
  const userName = user?.name ?? ''

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''}`}
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div className={styles.brand}>
          <div className={styles.logoBadge}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                className={styles.brandText}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
              >
                <span className={styles.brandTitle}>Life OS</span>
                <span className={styles.brandSub}>Workspace</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Collapse Button */}
          <button
            className={styles.collapseToggle}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className={styles.navContainer}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className={styles.navGroup}>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    className={styles.groupTitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {group.title}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={styles.itemsList}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className={styles.itemIcon}>
                      <item.icon />
                    </span>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          className={styles.itemLabel}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && item.badge && (
                      <span className={styles.itemBadge}>{item.badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logged-in User Footer */}
        <div className={styles.sidebarFooter}>
          <NavLink
            to="/profile"
            className={({ isActive }) => `${styles.footerItem} ${isActive ? styles.activeFooter : ''}`}
            title={collapsed ? `${userName} — Profile` : undefined}
          >
            <div className={styles.avatarMini}>{getInitials(userName)}</div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  className={styles.footerUser}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <span className={styles.userName}>{userName}</span>
                  <span className={styles.userRole}>View profile</span>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <span className={styles.settingsIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            )}
          </NavLink>
        </div>
      </motion.aside>
    </>
  )
}

/* ── Minimalist Clean Vector Icons matching Screenshot ── */
const iconProps = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }

function IconOverview() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
    </svg>
  )
}

function IconTasks() {
  return (
    <svg {...iconProps}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconHabits() {
  return (
    <svg {...iconProps}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function IconGoals() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function IconStudy() {
  return (
    <svg {...iconProps}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function IconFinances() {
  return (
    <svg {...iconProps}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function IconNotes() {
  return (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconAnalytics() {
  return (
    <svg {...iconProps}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
