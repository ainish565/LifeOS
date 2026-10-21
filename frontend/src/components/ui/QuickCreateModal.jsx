import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import styles from './QuickCreateModal.module.css'

const tabIconProps = {
  width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

const TABS = [
  { id: 'task', label: 'New Task', icon: <svg {...tabIconProps}><polyline points="20 6 9 17 4 12" /></svg> },
  { id: 'note', label: 'Quick Note', icon: <svg {...tabIconProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg> },
  { id: 'expense', label: 'Log Expense', icon: <svg {...tabIconProps}><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
  { id: 'goal', label: 'New Goal', icon: <svg {...tabIconProps}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg> },
]

// Mounted only while open (parent wraps it in AnimatePresence), so form
// state and the starting tab are fresh every time it appears.
export default function QuickCreateModal({ onClose, onAddItem, defaultTab = 'task' }) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Form states
  const [taskName, setTaskName] = useState('')
  const [taskCategory, setTaskCategory] = useState('Work')
  const [taskPriority, setTaskPriority] = useState('high')
  const [taskDue, setTaskDue] = useState('Today, 6 PM')

  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('Personal')

  const [goalTitle, setGoalTitle] = useState('')
  const [goalTarget, setGoalTarget] = useState('By next month')

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (activeTab === 'task') {
      if (!taskName.trim()) return
      onAddItem({
        type: 'task',
        data: {
          name: taskName,
          category: taskCategory,
          priority: taskPriority,
          due: taskDue,
          status: 'pending',
        },
      })
      setTaskName('')
    } else if (activeTab === 'note') {
      if (!noteTitle.trim()) return
      onAddItem({
        type: 'note',
        data: { title: noteTitle, content: noteContent },
      })
      setNoteTitle('')
      setNoteContent('')
    } else if (activeTab === 'expense') {
      if (!expenseTitle.trim() || !expenseAmount) return
      onAddItem({
        type: 'expense',
        data: { title: expenseTitle, amount: parseFloat(expenseAmount), category: expenseCategory },
      })
      setExpenseTitle('')
      setExpenseAmount('')
    } else if (activeTab === 'goal') {
      if (!goalTitle.trim()) return
      onAddItem({
        type: 'goal',
        data: { title: goalTitle, target: goalTarget },
      })
      setGoalTitle('')
    }
    onClose()
  }

  return (
    <motion.div
      className={styles.backdrop}
      onMouseDown={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Quick create"
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.tabsNav}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className={styles.formBody}>
          {activeTab === 'task' && (
            <div className={styles.fields}>
              <div className={styles.fieldGroup}>
                <label htmlFor="qc-task-title">Task Title</label>
                <input
                  id="qc-task-title"
                  type="text"
                  placeholder="e.g. Design executive quarterly presentation"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className={styles.gridFields}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="qc-task-category">Category</label>
                  <select id="qc-task-category" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)}>
                    <option value="Work">Work</option>
                    <option value="Dev">Dev</option>
                    <option value="Meetings">Meetings</option>
                    <option value="Study">Study</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="qc-task-priority">Priority</label>
                  <select id="qc-task-priority" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="qc-task-due">Due Time</label>
                <input
                  id="qc-task-due"
                  type="text"
                  placeholder="e.g. Today, 5 PM or Tomorrow, 11 AM"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'note' && (
            <div className={styles.fields}>
              <div className={styles.fieldGroup}>
                <label htmlFor="qc-note-title">Note Title</label>
                <input
                  id="qc-note-title"
                  type="text"
                  placeholder="e.g. Architecture decisions for Q3"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="qc-note-content">Content</label>
                <textarea
                  id="qc-note-content"
                  rows={4}
                  placeholder="Write key ideas, highlights, or links..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'expense' && (
            <div className={styles.fields}>
              <div className={styles.gridFields}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="qc-expense-title">Description</label>
                  <input
                    id="qc-expense-title"
                    type="text"
                    placeholder="e.g. Figma Pro Subscription"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="qc-expense-amount">Amount ($)</label>
                  <input
                    id="qc-expense-amount"
                    type="number"
                    placeholder="45.00"
                    step="0.01"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="qc-expense-category">Category</label>
                <select id="qc-expense-category" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>
                  <option value="Work">Software & Work</option>
                  <option value="Personal">Personal & Living</option>
                  <option value="Education">Education & Books</option>
                  <option value="Health">Health & Fitness</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'goal' && (
            <div className={styles.fields}>
              <div className={styles.fieldGroup}>
                <label htmlFor="qc-goal-title">Goal Objective</label>
                <input
                  id="qc-goal-title"
                  type="text"
                  placeholder="e.g. Master TypeScript and GraphQL APIs"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="qc-goal-target">Timeline / Deadline</label>
                <input
                  id="qc-goal-target"
                  type="text"
                  placeholder="e.g. Complete by Oct 15"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Save Item
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
