import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Toast from '../components/ui/Toast'
import {
  fetchCalendarFeed,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../api/events'
import styles from './Calendar.module.css'

const CATEGORIES = ['Study', 'Personal', 'Work', 'Meeting', 'Birthday', 'Other']

const CATEGORY_CLASS_MAP = {
  Study: styles.catStudy,
  Personal: styles.catPersonal,
  Work: styles.catWork,
  Meeting: styles.catMeeting,
  Birthday: styles.catBirthday,
  Other: styles.catOther,
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toISODateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatMonthHeading(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function formatDisplayDate(iso) {
  if (!iso) return ''
  const parts = iso.split('-')
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hStr, mStr] = timeStr.split(':')
  let hour = parseInt(hStr, 10)
  const minute = mStr || '00'
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${ampm}`
}

export default function Calendar() {
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => toISODateString(today), [today])

  // Current viewed month and year
  const [viewDate, setViewDate] = useState(() => new Date())
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  // Feed data (events + deadlines)
  const [events, setEvents] = useState([])
  const [deadlines, setDeadlines] = useState([])
  const [toasts, setToasts] = useState([])

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showDeadlines, setShowDeadlines] = useState(true)

  // Modals state
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null) // null if creating, object if editing

  // View details modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [viewingItem, setViewingItem] = useState(null) // { type: 'event'|'deadline', data: {...} }

  // Form fields
  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState('Personal')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

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

  // Fetch month data
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`

  const loadCalendarData = useCallback(async () => {
    try {
      const data = await fetchCalendarFeed(monthKey)
      setEvents(data.events || [])
      setDeadlines(data.deadlines || [])
    } catch (err) {
      showToast('Error loading calendar', err.message, 'error')
    }
  }, [monthKey])

  useEffect(() => {
    loadCalendarData()
  }, [loadCalendarData])

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1))
  }

  const handleToday = () => {
    setViewDate(new Date())
  }

  // Pure Vanilla JavaScript Monthly Calendar Grid computation
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0)

    const daysInMonth = lastDay.getDate()
    const daysInPrevMonth = prevMonthLastDay.getDate()
    const startDayIndex = firstDay.getDay() // 0 is Sunday

    const cells = []

    // Trailing days of previous month
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i
      const d = new Date(viewYear, viewMonth - 1, dNum)
      cells.push({
        date: d,
        dateString: toISODateString(d),
        dayNumber: dNum,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const d = new Date(viewYear, viewMonth, dNum)
      cells.push({
        date: d,
        dateString: toISODateString(d),
        dayNumber: dNum,
        isCurrentMonth: true,
      })
    }

    // Leading days of next month to complete 5 or 6 rows (multiple of 7)
    const totalCells = cells.length > 35 ? 42 : 35
    const remaining = totalCells - cells.length
    for (let dNum = 1; dNum <= remaining; dNum++) {
      const d = new Date(viewYear, viewMonth + 1, dNum)
      cells.push({
        date: d,
        dateString: toISODateString(d),
        dayNumber: dNum,
        isCurrentMonth: false,
      })
    }

    return cells
  }, [viewYear, viewMonth])

  // Items grouped by dateString
  const itemsByDate = useMemo(() => {
    const map = {}

    // Group events
    for (const ev of events) {
      if (selectedCategory !== 'All' && ev.category !== selectedCategory) {
        continue
      }
      if (!map[ev.event_date]) map[ev.event_date] = []
      map[ev.event_date].push({ type: 'event', ...ev })
    }

    // Group task deadlines if enabled
    if (showDeadlines) {
      for (const tk of deadlines) {
        if (!tk.due_date) continue
        if (!map[tk.due_date]) map[tk.due_date] = []
        map[tk.due_date].push({ type: 'deadline', ...tk })
      }
    }

    // Sort items inside each day: events by start_time, then deadlines
    for (const dateKey of Object.keys(map)) {
      map[dateKey].sort((a, b) => {
        if (a.type === 'event' && b.type === 'event') {
          return (a.start_time || '99:99').localeCompare(b.start_time || '99:99')
        }
        if (a.type === 'event' && b.type === 'deadline') return -1
        if (a.type === 'deadline' && b.type === 'event') return 1
        return 0
      })
    }

    return map
  }, [events, deadlines, selectedCategory, showDeadlines])

  // Open Create Modal
  const openCreateModal = (dateStr = todayStr) => {
    setEditingEvent(null)
    setSelectedDateForCreate(dateStr)
    setFormTitle('')
    setFormCategory('Personal')
    setFormDate(dateStr)
    setFormStartTime('')
    setFormEndTime('')
    setFormDescription('')
    setFormError('')
    setEventModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (event) => {
    setEditingEvent(event)
    setFormTitle(event.title || '')
    setFormCategory(event.category || 'Other')
    setFormDate(event.event_date || todayStr)
    setFormStartTime(event.start_time || '')
    setFormEndTime(event.end_time || '')
    setFormDescription(event.description || '')
    setFormError('')
    setDetailsModalOpen(false)
    setEventModalOpen(true)
  }

  // View Details Modal
  const openItemDetails = (item, e) => {
    e.stopPropagation()
    setViewingItem(item)
    setDetailsModalOpen(true)
  }

  // Save Event (Create or Edit)
  const handleSaveEvent = async (e) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFormError('Title is required')
      return
    }
    if (!formDate) {
      setFormError('Date is required')
      return
    }
    if (formStartTime && formEndTime && formStartTime > formEndTime) {
      setFormError('Start time cannot be after end time')
      return
    }

    setSaving(true)
    setFormError('')

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      event_date: formDate,
      start_time: formStartTime || null,
      end_time: formEndTime || null,
      description: formDescription.trim() || null,
    }

    try {
      if (editingEvent) {
        const updated = await updateEvent(editingEvent.id, payload)
        setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)))
        showToast('Event updated', updated.title, 'success')
      } else {
        const created = await createEvent(payload)
        setEvents((prev) => [...prev, created])
        showToast('Event scheduled', created.title, 'success')
      }
      setEventModalOpen(false)
    } catch (err) {
      setFormError(err.message || 'Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  // Delete Event
  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }
    try {
      await deleteEvent(eventId)
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId))
      setDetailsModalOpen(false)
      setEventModalOpen(false)
      showToast('Event deleted', title, 'info')
    } catch (err) {
      showToast('Error deleting event', err.message, 'error')
    }
  }

  return (
    <div className={styles.calendarPage}>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* ── Top Navigation & Action Controls ── */}
      <header className={styles.headerBar}>
        <div className={styles.titleArea}>
          <h2 className={styles.monthHeading}>{formatMonthHeading(viewYear, viewMonth)}</h2>
          <div className={styles.navControls}>
            <button
              className={styles.iconBtn}
              onClick={handlePrevMonth}
              title="Previous Month"
              aria-label="Previous Month"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className={styles.todayBtn} onClick={handleToday}>
              Today
            </button>
            <button
              className={styles.iconBtn}
              onClick={handleNextMonth}
              title="Next Month"
              aria-label="Next Month"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.actionsRight}>
          <span className={styles.summaryBadge}>
            {events.length} event{events.length === 1 ? '' : 's'} · {deadlines.length} task deadline{deadlines.length === 1 ? '' : 's'}
          </span>
          <button className={styles.primaryAddBtn} onClick={() => openCreateModal(todayStr)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Event</span>
          </button>
        </div>
      </header>

      {/* ── Category & Task Deadline Filters Bar ── */}
      <section className={styles.filterBar}>
        <div className={styles.categoriesList}>
          <button
            className={`${styles.catPill} ${selectedCategory === 'All' ? styles.catPillActive : ''}`}
            onClick={() => setSelectedCategory('All')}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.catPill} ${selectedCategory === cat ? styles.catPillActive : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <label className={styles.toggleDeadlineWrap}>
          <input
            type="checkbox"
            checked={showDeadlines}
            onChange={(e) => setShowDeadlines(e.target.checked)}
          />
          <span>Show Task Deadlines</span>
        </label>
      </section>

      {/* ── Calendar Monthly Grid ── */}
      <div className={styles.calendarContainer}>
        {/* Weekday Labels */}
        <div className={styles.weekdaysHeader}>
          {WEEKDAYS.map((day) => (
            <div key={day} className={styles.weekdayCell}>
              {day}
            </div>
          ))}
        </div>

        {/* 7-column Date Cells Grid */}
        <div className={styles.daysGrid}>
          {calendarCells.map((cell) => {
            const isToday = cell.dateString === todayStr
            const items = itemsByDate[cell.dateString] || []
            const maxVisible = 3
            const visibleItems = items.slice(0, maxVisible)
            const remainingCount = items.length - maxVisible

            return (
              <div
                key={cell.dateString}
                className={`${styles.dayCell} ${!cell.isCurrentMonth ? styles.otherMonthDay : ''} ${isToday ? styles.todayCell : ''}`}
                onClick={() => openCreateModal(cell.dateString)}
                title="Click to schedule an event on this date"
              >
                <div className={styles.dayCellHeader}>
                  <span className={styles.dayNumber}>{cell.dayNumber}</span>
                  <span className={styles.addHoverPlus} title="Add Event">+</span>
                </div>

                {/* List of events & deadlines */}
                <div className={styles.eventsList}>
                  {visibleItems.map((item) => {
                    if (item.type === 'deadline') {
                      return (
                        <div
                          key={`deadline-${item.id}`}
                          className={`${styles.deadlinePill} ${item.status === 'Completed' ? styles.deadlineDone : ''}`}
                          onClick={(e) => openItemDetails(item, e)}
                          title={`Deadline: ${item.title} (${item.priority} Priority, ${item.status})`}
                        >
                          <span className={styles.deadlineIcon}>⏰</span>
                          <span className={styles.eventPillTitle}>{item.title}</span>
                        </div>
                      )
                    }

                    // Event Item
                    const catClass = CATEGORY_CLASS_MAP[item.category] || styles.catOther
                    return (
                      <div
                        key={`event-${item.id}`}
                        className={`${styles.eventPill} ${catClass}`}
                        onClick={(e) => openItemDetails(item, e)}
                        title={`${item.title} (${item.category}${item.start_time ? ` · ${formatTime(item.start_time)}` : ''})`}
                      >
                        {item.start_time && (
                          <span className={styles.eventPillTime}>
                            {formatTime(item.start_time)}
                          </span>
                        )}
                        <span className={styles.eventPillTitle}>{item.title}</span>
                      </div>
                    )
                  })}

                  {remainingCount > 0 && (
                    <span className={styles.moreItemsBadge}>
                      +{remainingCount} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Create / Edit Event Modal ── */}
      <AnimatePresence>
        {eventModalOpen && (
          <div className={styles.modalBackdrop} onClick={() => setEventModalOpen(false)}>
            <motion.div
              className={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {editingEvent ? 'Edit Event' : 'Schedule New Event'}
                </h3>
                <button
                  className={styles.closeBtn}
                  onClick={() => setEventModalOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEvent}>
                <div className={styles.modalBody}>
                  {formError && <div className={styles.errorBanner}>{formError}</div>}

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Title *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Design review, Team sync, Birthday dinner"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Category</label>
                      <select
                        className={styles.formSelect}
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Date *</label>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Start Time</label>
                      <input
                        type="time"
                        className={styles.formInput}
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>End Time</label>
                      <input
                        type="time"
                        className={styles.formInput}
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description / Notes</label>
                    <textarea
                      className={styles.formTextarea}
                      placeholder="Add details, agenda, location, or notes..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  {editingEvent && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteEvent(editingEvent.id, editingEvent.title)}
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setEventModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={saving}>
                    {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Save Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── View Item Details Modal (Event or Task Deadline) ── */}
      <AnimatePresence>
        {detailsModalOpen && viewingItem && (
          <div className={styles.modalBackdrop} onClick={() => setDetailsModalOpen(false)}>
            <motion.div
              className={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {viewingItem.type === 'deadline' ? 'Task Deadline' : 'Event Details'}
                </h3>
                <button
                  className={styles.closeBtn}
                  onClick={() => setDetailsModalOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {viewingItem.title}
                </h2>

                {viewingItem.type === 'deadline' ? (
                  <>
                    <div className={styles.detailsMetaRow}>
                      <span>📅 Due: <strong>{formatDisplayDate(viewingItem.due_date)}</strong></span>
                      <span>·</span>
                      <span>Priority: <strong>{viewingItem.priority}</strong></span>
                      <span>·</span>
                      <span>Status: <strong>{viewingItem.status}</strong></span>
                    </div>

                    {viewingItem.description && (
                      <div className={styles.detailsDesc}>
                        {viewingItem.description}
                      </div>
                    )}

                    <div style={{ marginTop: '0.5rem' }}>
                      <Link
                        to="/tasks"
                        className={styles.submitBtn}
                        style={{ display: 'inline-block', textDecoration: 'none' }}
                      >
                        Open in Tasks Workspace →
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.detailsMetaRow}>
                      <span className={`${styles.catPill} ${CATEGORY_CLASS_MAP[viewingItem.category] || styles.catOther}`}>
                        {viewingItem.category}
                      </span>
                      <span>📅 {formatDisplayDate(viewingItem.event_date)}</span>
                      {viewingItem.start_time && (
                        <span>
                          🕒 {formatTime(viewingItem.start_time)}
                          {viewingItem.end_time ? ` - ${formatTime(viewingItem.end_time)}` : ''}
                        </span>
                      )}
                    </div>

                    {viewingItem.description ? (
                      <div className={styles.detailsDesc}>
                        {viewingItem.description}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                        No description provided.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className={styles.modalFooter}>
                {viewingItem.type === 'event' ? (
                  <>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteEvent(viewingItem.id, viewingItem.title)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setDetailsModalOpen(false)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={() => openEditModal(viewingItem)}
                    >
                      Edit Event
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setDetailsModalOpen(false)}
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
