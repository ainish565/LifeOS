import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import styles from './Placeholder.module.css'

const MODULE_DATA = {
  tasks: {
    title: 'Tasks & Projects Engine',
    category: 'Productivity',
    badge: 'Phase 3 Target',
    desc: 'Next-gen Kanban boards, recurring tasks, priority tagging, Gantt views, and automatic calendar sync.',
    features: ['Kanban & List Multi-View', 'Natural Language Date Parser', 'Subtasks & Project Trees', 'GitHub & Calendar Sync'],
    stats: [
      { label: 'Total Tasks', value: '12 Active' },
      { label: 'Completion Rate', value: '84%' },
    ],
  },
  calendar: {
    title: 'Time & Calendar Hub',
    category: 'Productivity',
    badge: 'Phase 4 Target',
    desc: 'Unify Google Calendar, Outlook, and local timeblocks in a unified, clutter-free schedule view.',
    features: ['Two-way Google Calendar Sync', 'Focus Time Block Generator', 'Conflict Resolution Engine', 'Meeting Notes Linker'],
    stats: [
      { label: 'Synced Calendars', value: '2 Linked' },
      { label: 'Time Blocks', value: '4 Today' },
    ],
  },
  goals: {
    title: 'Objectives & Key Results (OKR)',
    category: 'Personal Growth',
    badge: 'Phase 7 Target',
    desc: 'Break down multi-year visions into quarter milestones, target milestones, and track compounding progress.',
    features: ['Quarterly OKR Framework', 'Visual Progress Milestones', 'Compound Habit Attachments', 'Weekly Review Prompts'],
    stats: [
      { label: 'Active Targets', value: '4 Goals' },
      { label: 'Milestones Done', value: '9/14' },
    ],
  },
  habits: {
    title: 'Habit Compounding System',
    category: 'Personal Growth',
    badge: 'Phase 7 Target',
    desc: 'Build unbreakable positive routines with streak tracking, frequency heatmaps, and micro-rewards.',
    features: ['GitHub-style Streak Heatmaps', 'Morning & Evening Routine Bundles', 'Time-of-day Push Reminders', 'Analytics & Dropoff Insights'],
    stats: [
      { label: 'Current Streak', value: '18 Days' },
      { label: 'Active Habits', value: '7 Tracked' },
    ],
  },
  study: {
    title: 'Study & Deep Work Lab',
    category: 'Focus & Learning',
    badge: 'Phase 8 Target',
    desc: 'Pomodoro focus timer, active recall flashcards, study session analytics, and spaced repetition.',
    features: ['Ambient White Noise Generator', 'Spaced Repetition Flashcards', 'Subject Time Allocation', 'Deep Work Scoreboard'],
    stats: [
      { label: 'Hours This Week', value: '14.5 hrs' },
      { label: 'Focus Score', value: '92/100' },
    ],
  },
  expenses: {
    title: 'Wealth & Expense Ledger',
    category: 'Finance',
    badge: 'Phase 5 Target',
    desc: 'Clean transaction tracking, category budgeting, recurring subscription audit, and cashflow charts.',
    features: ['Category Budget Limits', 'Subscription Auto-detector', 'Export to CSV / PDF', 'Monthly Runway Estimator'],
    stats: [
      { label: 'Monthly Budget', value: '$342 / $500' },
      { label: 'Saved vs Target', value: '+$158' },
    ],
  },
  notes: {
    title: 'Distraction-Free Journal & Notes',
    category: 'Knowledge',
    badge: 'Phase 6 Target',
    desc: 'Markdown editor, bi-directional backlinks, daily journal prompts, and instant quick-search.',
    features: ['Markdown & Slash Commands', 'Bi-directional Wiki Links', 'Encrypted Private Vault', 'Daily Log Templates'],
    stats: [
      { label: 'Total Notes', value: '28 Entries' },
      { label: 'Words Written', value: '12.4k' },
    ],
  },
  analytics: {
    title: 'Executive Insights & Metrics',
    category: 'Analytics',
    badge: 'Phase 9 Target',
    desc: 'Deep correlation between your habits, task output, study hours, and financial discipline.',
    features: ['Weekly Productivity Audits', 'Habit vs Focus Correlation', 'Burnout Risk Alerts', 'Custom KPI Builder'],
    stats: [
      { label: 'Weekly Score', value: '88/100' },
      { label: 'Peak Focus Day', value: 'Wednesday' },
    ],
  },
  settings: {
    title: 'Workspace Configuration',
    category: 'Preferences',
    badge: 'Core Engine',
    desc: 'Customize typography, color themes, notifications, API keys, export databases, and backup snapshots.',
    features: ['Light / Dark Mode Overrides', 'SQLite Database Export', 'Custom Accent Themes', 'Keyboard Shortcut Matrix'],
    stats: [
      { label: 'Database', value: 'SQLite Local' },
      { label: 'Version', value: 'Life OS v1.0' },
    ],
  },
}

export default function Placeholder({ module }) {
  const data = MODULE_DATA[module] || {
    title: `${module.charAt(0).toUpperCase() + module.slice(1)} Module`,
    category: 'System',
    badge: 'In Development',
    desc: 'This dedicated module is being crafted for an upcoming phase release.',
    features: ['Integrated API Sync', 'Dedicated Layout View', 'Real-time Metrics', 'Custom Automation'],
    stats: [
      { label: 'Status', value: 'Scheduled' },
      { label: 'Architecture', value: 'REST API' },
    ],
  }

  return (
    <motion.div
      className={styles.placeholderContainer}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className={styles.heroCard}>
        <div className={styles.badgeRow}>
          <span className={styles.categoryPill}>{data.category}</span>
          <span className={styles.phaseBadge}>{data.badge}</span>
        </div>

        <h2 className={styles.moduleTitle}>{data.title}</h2>
        <p className={styles.moduleDesc}>{data.desc}</p>

        {/* Quick Module Stats */}
        <div className={styles.quickStatsRow}>
          {data.stats.map((stat, i) => (
            <div key={i} className={styles.statBox}>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statVal}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Planned Features Deck */}
        <div className={styles.featureSection}>
          <span className={styles.featuresHeading}>Planned Module Capabilities</span>
          <div className={styles.featuresGrid}>
            {data.features.map((feat, i) => (
              <div key={i} className={styles.featureItem}>
                <span className={styles.checkBullet} aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className={styles.featureText}>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actionRow}>
          <Link to="/" className={styles.backBtn}>
            ← Return to Overview
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
