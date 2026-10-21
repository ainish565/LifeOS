import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { getFirstName } from '../utils/user'
import StatCard from '../components/ui/StatCard'
import QuickCreateModal from '../components/ui/QuickCreateModal'
import Toast from '../components/ui/Toast'
import styles from './Dashboard.module.css'

// Initial state data matching screenshot
const INITIAL_FOCUS_HABITS = [
  { id: 1, name: 'Morning Focus & Meditation', done: true, color: 'var(--emerald)' },
  { id: 2, name: '30-Min Cardio / Strength', done: false, color: 'var(--accent)' },
  { id: 3, name: 'Read 25 pages of System Design', done: false, color: 'var(--amber)' },
]

// Habits outside today's focus list that are already checked off (mock data)
const OTHER_HABITS_DONE = 3

function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = getFirstName(user?.name)
  const [focusHabits, setFocusHabits] = useState(INITIAL_FOCUS_HABITS)

  // Live task stats from the backend
  const [taskStats, setTaskStats] = useState({
    total: 0, completed: 0, pending: 0, overdue: 0, due_today: 0, completion_pct: 0
  })

  useEffect(() => {
    fetch('/api/tasks/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setTaskStats(data) })
      .catch(() => {}) // silently fail — dashboard still works with defaults
  }, [])

  const tasksCompleted = taskStats.completed
  const totalTasks     = taskStats.total

  const habitsCompleted = OTHER_HABITS_DONE + focusHabits.filter((h) => h.done).length
  const totalHabits = 7

  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false)
  const [modalInitialTab, setModalInitialTab] = useState('task')
  const [toasts, setToasts] = useState([])

  const showToast = (title, message = '', type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, title, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Toggle Focus Habit — side effects stay outside the state updater so
  // StrictMode's double-invoked updaters can't fire duplicate toasts
  const toggleFocusHabit = (id) => {
    const habit = focusHabits.find((h) => h.id === id)
    if (!habit) return
    const nextDone = !habit.done
    setFocusHabits((prev) => prev.map((h) => (h.id === id ? { ...h, done: nextDone } : h)))
    if (nextDone) {
      showToast('Focus habit completed!', habit.name, 'success')
    } else {
      showToast('Habit unmarked', habit.name, 'info')
    }
  }

  const openQuickAction = (tab) => {
    setModalInitialTab(tab)
    setQuickAddModalOpen(true)
  }

  const handleAddItem = ({ type, data }) => {
    if (type === 'task') {
      showToast('Task added to schedule', data.name)
    } else if (type === 'note') {
      showToast('Note created in workspace', data.title)
    } else if (type === 'expense') {
      showToast('Expense recorded', `${data.title} • $${data.amount.toFixed(2)}`)
    } else if (type === 'goal') {
      showToast('Objective target created', data.title)
    }
  }

  // Day score: equal weight on task and habit completion
  const taskRatio = totalTasks > 0 ? tasksCompleted / totalTasks : 0
  const dayScore = Math.round((taskRatio * 0.5 + (habitsCompleted / totalHabits) * 0.5) * 100)

  // 4 Stat Cards matching the screenshot
  const statCards = [
    {
      id: 'tasks',
      label: 'Tasks Completed',
      value: `${tasksCompleted}`,
      sub: totalTasks > 0 ? `/ ${totalTasks}` : null,
      change: taskStats.overdue > 0
        ? `${taskStats.overdue} overdue — needs attention`
        : taskStats.pending > 0
          ? `${taskStats.pending} pending today`
          : 'All tasks done!',
      color: 'emerald',
      sparkProgress: totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0,
      isPositive: true,
    },
    {
      id: 'habits',
      label: 'Daily Habits',
      value: `${habitsCompleted}`,
      sub: `/ ${totalHabits}`,
      change: '18 day streak on focus',
      color: 'purple',
      sparkProgress: Math.round((habitsCompleted / totalHabits) * 100),
      isPositive: false,
    },
    {
      id: 'focus',
      label: 'Focus Score',
      value: `${dayScore}%`,
      sub: null,
      change: 'Keep going strong!',
      color: 'amber',
      sparkProgress: dayScore,
      isPositive: false,
    },
    {
      id: 'allowance',
      label: 'Monthly Allowance',
      value: '$342',
      sub: '/ $500',
      change: '68% of budget utilized',
      color: 'rose',
      sparkProgress: 68,
      isPositive: false,
    },
  ]

  return (
    <div className={styles.dashboard}>
      {/* Feedback Toast */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Quick Action Modal */}
      <AnimatePresence>
        {quickAddModalOpen && (
          <QuickCreateModal
            onClose={() => setQuickAddModalOpen(false)}
            onAddItem={handleAddItem}
            defaultTab={modalInitialTab}
          />
        )}
      </AnimatePresence>

      {/* ── 1. Hero Banner with Mountain Sunset Art & Floating Stat Box ── */}
      <section className={styles.heroBanner}>
        {/* Mountain Sunset Graphic Illustration */}
        <div className={styles.sunsetArtContainer} aria-hidden="true">
          <svg className={styles.sunsetSvg} viewBox="0 0 1000 220" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="35%" stopColor="#f97316" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#ec4899" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="skyAtmosphere" cx="54%" cy="80%" r="50%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
                <stop offset="60%" stopColor="var(--rose)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Atmosphere radial backdrop */}
            <rect width="1000" height="220" fill="url(#skyAtmosphere)" />

            {/* Glowing Sunset Sun */}
            <circle cx="540" cy="155" r="54" fill="url(#sunGlow)" />
            <circle cx="540" cy="155" r="14" fill="#fef08a" opacity="0.95" />

            {/* Distant Mountains Silhouette */}
            <path
              d="M320,220 L420,150 L520,185 L620,135 L740,195 L840,160 L920,220 Z"
              fill="var(--mountain-color)"
              opacity="0.65"
            />

            {/* Foreground Mountain Ridge */}
            <path
              d="M390,220 L490,165 L560,195 L670,145 L790,205 L870,175 L960,220 Z"
              fill="var(--mountain-fg)"
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Hero Left Content */}
        <div className={styles.heroLeft}>
          <span className={styles.heroSalutation}>
            {getGreeting()}{firstName && `, ${firstName}`}
          </span>
          <h2 className={styles.heroTitle}>Focus on what matters today.</h2>
          <p className={styles.heroSubtitle}>
            {totalTasks > 0
              ? `${tasksCompleted} of ${totalTasks} tasks done${taskStats.due_today > 0 ? ` · ${taskStats.due_today} due today` : ''}${taskStats.overdue > 0 ? ` · ${taskStats.overdue} overdue` : ''}`
              : 'No tasks yet — head to Tasks to get started.'
            }
            {' '}You have {habitsCompleted} habits checked off today.
          </p>
        </div>

        {/* Hero Right Stat Box */}
        <div className={styles.heroStatCard}>
          <div className={styles.statCol}>
            <span className={styles.statVal}>
              {tasksCompleted} <span className={styles.statSub}>/ {totalTasks || '—'}</span>
            </span>
            <span className={styles.statLbl}>Tasks Done</span>
          </div>

          <div className={styles.statDivider} />

          <div className={styles.statCol}>
            <span className={styles.statVal}>
              {habitsCompleted} <span className={styles.statSub}>/ {totalHabits}</span>
            </span>
            <span className={styles.statLbl}>Habits Hit</span>
          </div>

          <div className={styles.statDivider} />

          <div className={styles.statCol}>
            <span className={styles.statVal}>{dayScore}%</span>
            <span className={styles.statLbl}>Day Score</span>
          </div>
        </div>
      </section>

      {/* ── 2. Four Key Stat Cards Grid ── */}
      <section className={styles.statCardsGrid} aria-label="Overview Metrics">
        {statCards.map((card) => (
          <StatCard key={card.id} card={card} />
        ))}
      </section>

      {/* ── 3. Bottom Row: Today's Focus & Quick Actions ── */}
      <div className={styles.bottomRowGrid}>
        {/* Left Card: Today's Focus with Potted Plant Silhouette */}
        <section className={styles.focusCard} aria-labelledby="focus-heading">
          {/* Potted Plant Silhouette Graphic in Background */}
          <div className={styles.plantGraphicContainer} aria-hidden="true">
            <svg className={styles.plantSvg} viewBox="0 0 200 280" fill="none">
              {/* Pot Base */}
              <path d="M65 210 L135 210 L125 270 L75 270 Z" fill="var(--plant-pot)" />
              <ellipse cx="100" cy="210" rx="36" ry="7" fill="var(--plant-rim)" />

              {/* Stems & Foliage */}
              <path d="M100 210 Q95 150 90 80" stroke="var(--plant-stem)" strokeWidth="4" strokeLinecap="round" />
              <path d="M98 170 Q70 140 45 110" stroke="var(--plant-stem)" strokeWidth="3" strokeLinecap="round" />
              <path d="M100 150 Q130 120 155 90" stroke="var(--plant-stem)" strokeWidth="3" strokeLinecap="round" />
              <path d="M96 110 Q75 80 60 50" stroke="var(--plant-stem)" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M100 90 Q125 60 140 30" stroke="var(--plant-stem)" strokeWidth="2.5" strokeLinecap="round" />

              {/* Leaves */}
              <ellipse cx="45" cy="110" rx="20" ry="34" transform="rotate(-35 45 110)" fill="var(--plant-fill-1)" opacity="0.6" />
              <ellipse cx="155" cy="90" rx="22" ry="36" transform="rotate(35 155 90)" fill="var(--plant-fill-1)" opacity="0.6" />
              <ellipse cx="60" cy="50" rx="18" ry="30" transform="rotate(-25 60 50)" fill="var(--plant-fill-2)" opacity="0.7" />
              <ellipse cx="140" cy="30" rx="18" ry="30" transform="rotate(25 140 30)" fill="var(--plant-fill-2)" opacity="0.7" />
              <ellipse cx="90" cy="70" rx="19" ry="36" transform="rotate(-5 90 70)" fill="var(--plant-fill-2)" opacity="0.8" />
              <ellipse cx="100" cy="35" rx="16" ry="28" fill="var(--plant-fill-3)" opacity="0.9" />
            </svg>
          </div>

          {/* Card Header */}
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle} id="focus-heading">Today's Focus</h3>
            <p className={styles.cardSubtitle}>Stay on track with your priorities</p>
          </div>

          {/* Focus List Items */}
          <div className={styles.focusList}>
            {focusHabits.map((item) => (
              <div
                key={item.id}
                className={`${styles.focusItem} ${item.done ? styles.focusItemDone : ''}`}
                onClick={() => toggleFocusHabit(item.id)}
                role="checkbox"
                aria-checked={item.done}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleFocusHabit(item.id)
                  }
                }}
              >
                <div
                  className={`${styles.checkCircle} ${item.done ? styles.checkedCircle : ''}`}
                  style={{
                    borderColor: item.done ? 'var(--emerald)' : item.color,
                    backgroundColor: item.done ? 'var(--emerald)' : 'transparent',
                  }}
                >
                  {item.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                <span className={styles.focusText}>{item.name}</span>

                <div className={styles.rightIndicator}>
                  {item.done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="16 9 10 15 8 13" />
                    </svg>
                  ) : (
                    <div className={styles.hollowDot} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Link */}
          <div className={styles.focusFooter}>
            <Link to="/habits" className={styles.viewHabitsLink}>
              View all habits →
            </Link>
          </div>
        </section>

        {/* Right Card: Quick Actions */}
        <section className={styles.actionsCard} aria-labelledby="quick-heading">
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle} id="quick-heading">Quick Actions</h3>
            <p className={styles.cardSubtitle}>Get things done quickly</p>
          </div>

          <div className={styles.quickGrid}>
            {/* Action 1: Add Task */}
            <button
              className={styles.actionBtn}
              onClick={() => openQuickAction('task')}
              aria-label="Add Task"
            >
              <div className={`${styles.actionIconBadge} ${styles.badgeGreen}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className={styles.actionLabel}>Add Task</span>
            </button>

            {/* Action 2: New Note */}
            <button
              className={styles.actionBtn}
              onClick={() => openQuickAction('note')}
              aria-label="New Note"
            >
              <div className={`${styles.actionIconBadge} ${styles.badgeBlue}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <span className={styles.actionLabel}>New Note</span>
            </button>

            {/* Action 3: Log Expense */}
            <button
              className={styles.actionBtn}
              onClick={() => openQuickAction('expense')}
              aria-label="Log Expense"
            >
              <div className={`${styles.actionIconBadge} ${styles.badgeOrange}`}>
                <span className={styles.dollarSign}>$</span>
              </div>
              <span className={styles.actionLabel}>Log Expense</span>
            </button>

            {/* Action 4: Create Goal */}
            <button
              className={styles.actionBtn}
              onClick={() => openQuickAction('goal')}
              aria-label="Create Goal"
            >
              <div className={`${styles.actionIconBadge} ${styles.badgeRose}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <span className={styles.actionLabel}>Create Goal</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
