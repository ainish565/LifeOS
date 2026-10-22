import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Chart, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  fetchExpenses, fetchExpenseStats, fetchExpenseChart,
  fetchBudget, setBudget, createExpense, updateExpense, deleteExpense,
  EXPENSE_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS,
  formatCurrency, formatCurrencyCompact,
} from '../api/expenses'
import styles from './Expenses.module.css'

// Register Chart.js components
Chart.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler)

// ── Helpers ──────────────────────────────────────────────────────────────── //

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const date = new Date(+y, +m - 1, +d)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const SORT_OPTIONS = [
  { value: 'date_desc',   label: 'Newest first' },
  { value: 'date_asc',    label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc',  label: 'Lowest amount' },
]

// ── Expense Form Modal ────────────────────────────────────────────────────── //

function ExpenseModal({ expense, onClose, onSaved }) {
  const isEdit = !!expense
  const [form, setForm] = useState({
    amount:       expense?.amount ?? '',
    category:     expense?.category ?? 'Food',
    description:  expense?.description ?? '',
    expense_date: expense?.expense_date ?? todayISO(),
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const amountRef = useRef(null)

  useEffect(() => { amountRef.current?.focus() }, [])

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive amount.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, amount: amt }
      const saved = isEdit
        ? await updateExpense(expense.id, payload)
        : await createExpense(payload)
      onSaved(saved, isEdit)
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // Close on backdrop click
  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className={styles.modalBackdrop} onClick={onBackdrop} role="dialog" aria-modal="true">
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className={styles.modalTitle}>{isEdit ? 'Edit Expense' : 'Log New Expense'}</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup} style={{ marginBottom: '0.9rem' }}>
            <label className={styles.formLabel} htmlFor="exp-amount">Amount (₹)</label>
            <input
              id="exp-amount"
              ref={amountRef}
              type="number"
              min="0.01"
              step="0.01"
              className={styles.formInput}
              placeholder="e.g. 250"
              value={form.amount}
              onChange={e => handleChange('amount', e.target.value)}
            />
          </div>

          <div className={styles.formRowHalf} style={{ marginBottom: '0.9rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="exp-category">Category</label>
              <select
                id="exp-category"
                className={styles.formSelect}
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="exp-date">Date</label>
              <input
                id="exp-date"
                type="date"
                className={styles.formInput}
                value={form.expense_date}
                onChange={e => handleChange('expense_date', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
            <label className={styles.formLabel} htmlFor="exp-desc">Description</label>
            <input
              id="exp-desc"
              type="text"
              className={styles.formInput}
              placeholder="e.g. Lunch with team"
              maxLength={255}
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
            />
          </div>

          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Expense' : 'Log Expense'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Budget Modal ──────────────────────────────────────────────────────────── //

function BudgetModal({ current, onClose, onSaved }) {
  const [amount, setAmount] = useState(current ?? '')
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive budget amount.')
      return
    }
    setSaving(true)
    try {
      const saved = await setBudget(currentMonthStr(), amt)
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save budget.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.2 }}
      >
        <h2 className={styles.modalTitle}>Set Monthly Budget</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
            <label className={styles.formLabel} htmlFor="budget-amount">Budget Amount (₹)</label>
            <input
              id="budget-amount"
              ref={inputRef}
              type="number"
              min="1"
              step="1"
              className={styles.formInput}
              placeholder="e.g. 10000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Budget applies to {currentMonthStr()}
            </p>
          </div>
          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : 'Set Budget'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Doughnut Chart ────────────────────────────────────────────────────────── //

function CategoryChart({ data }) {
  const isDark = document.documentElement.dataset.mode === 'dark'
  const textColor = isDark ? '#c4bcd4' : '#777080'

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No spending data this month yet.
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.amount - a.amount)

  const chartData = {
    labels: sorted.map(d => d.category),
    datasets: [{
      data:            sorted.map(d => d.amount),
      backgroundColor: sorted.map(d => CATEGORY_COLORS[d.category] ?? '#6b7280'),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${formatCurrency(ctx.raw)}`,
        },
      },
    },
  }

  return (
    <>
      <div className={styles.chartContainer}>
        <Doughnut data={chartData} options={options} />
      </div>
      <div className={styles.categoryLegend}>
        {sorted.map(row => (
          <div key={row.category} className={styles.legendRow}>
            <div className={styles.legendLeft}>
              <div className={styles.legendDot} style={{ background: CATEGORY_COLORS[row.category] }} />
              <span className={styles.legendLabel}>{CATEGORY_ICONS[row.category]} {row.category}</span>
            </div>
            <span className={styles.legendAmt}>{formatCurrencyCompact(row.amount)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Line Chart ────────────────────────────────────────────────────────────── //

function SpendingLineChart({ data }) {
  const isDark = document.documentElement.dataset.mode === 'dark'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const textColor = isDark ? '#c4bcd4' : '#777080'

  if (!data || data.length === 0) return null

  // Show only last 14 days for clarity
  const slice = data.slice(-14)

  const labels = slice.map(d => {
    const [, m, day] = d.date.split('-')
    return `${parseInt(day)}/${parseInt(m)}`
  })

  const chartData = {
    labels,
    datasets: [{
      data:             slice.map(d => d.amount),
      borderColor:      '#7657C5',
      backgroundColor:  'rgba(118,87,197,0.12)',
      tension:          0.4,
      fill:             true,
      pointRadius:      slice.map(d => d.amount > 0 ? 4 : 0),
      pointBackgroundColor: '#7657C5',
      pointBorderColor:     '#fff',
      pointBorderWidth:     2,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0].dataIndex
            return fmtDate(slice[idx].date)
          },
          label: (ctx) => ` ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 10 } },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { size: 10 },
          callback: v => formatCurrencyCompact(v),
        },
        beginAtZero: true,
      },
    },
  }

  return (
    <div className={styles.chartContainer}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// ── Main Expenses Page ────────────────────────────────────────────────────── //

export default function Expenses() {
  const [expenses,   setExpenses]   = useState([])
  const [stats,      setStats]      = useState(null)
  const [chartData,  setChartData]  = useState(null)
  const [budget,     setBudgetState] = useState(null)
  const [loading,    setLoading]    = useState(true)

  // Filters
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [sort,     setSort]     = useState('date_desc')

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense,   setEditingExpense]   = useState(null)
  const [showBudgetModal,  setShowBudgetModal]  = useState(false)

  // ── Load data ──────────────────────────────────────────────── //

  const loadExpenses = useCallback(async () => {
    try {
      const data = await fetchExpenses({ search, category, date_from: dateFrom, date_to: dateTo, sort })
      setExpenses(data)
    } catch { /* ignore */ }
  }, [search, category, dateFrom, dateTo, sort])

  const loadStats = useCallback(async () => {
    try { setStats(await fetchExpenseStats()) } catch { /* ignore */ }
  }, [])

  const loadChart = useCallback(async () => {
    try { setChartData(await fetchExpenseChart()) } catch { /* ignore */ }
  }, [])

  const loadBudget = useCallback(async () => {
    try { setBudgetState(await fetchBudget(currentMonthStr())) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadExpenses(), loadStats(), loadChart(), loadBudget()])
      .finally(() => setLoading(false))
  }, [loadExpenses, loadStats, loadChart, loadBudget])

  // ── Handlers ──────────────────────────────────────────────── //

  const handleSavedExpense = (saved, isEdit) => {
    setExpenses(prev =>
      isEdit
        ? prev.map(e => e.id === saved.id ? saved : e)
        : [saved, ...prev]
    )
    loadStats()
    loadChart()
    loadBudget()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    try {
      await deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
      loadStats()
      loadChart()
      loadBudget()
    } catch { /* ignore */ }
  }

  const handleBudgetSaved = (saved) => {
    setBudgetState(saved)
    loadStats()
  }

  // ── Budget bar ─────────────────────────────────────────────── //

  const budgetAmount    = budget?.amount ?? null
  const monthSpending   = stats?.month ?? 0
  const budgetPct       = budgetAmount ? Math.min(100, Math.round((monthSpending / budgetAmount) * 100)) : 0
  const budgetRemaining = budgetAmount != null ? budgetAmount - monthSpending : null
  const budgetBarClass  = budgetPct >= 100
    ? styles.budgetBarDanger
    : budgetPct >= 80
      ? styles.budgetBarWarning
      : styles.budgetBarSafe

  // ── Stat cards ─────────────────────────────────────────────── //

  const statCards = [
    {
      id: 'today', label: "Today's Spending", value: formatCurrencyCompact(stats?.today ?? 0),
      emoji: '📅', cardClass: styles.statCardToday,
      sub: stats?.today > 0 ? 'spent today' : 'nothing spent today',
    },
    {
      id: 'week', label: 'This Week', value: formatCurrencyCompact(stats?.week ?? 0),
      emoji: '📆', cardClass: styles.statCardWeek,
      sub: 'weekly total',
    },
    {
      id: 'month', label: 'This Month', value: formatCurrencyCompact(monthSpending),
      emoji: '🗓️', cardClass: styles.statCardMonth,
      sub: stats?.top_category ? `Top: ${CATEGORY_ICONS[stats.top_category]} ${stats.top_category}` : 'this month',
    },
    {
      id: 'total', label: 'All Time', value: formatCurrencyCompact(stats?.total ?? 0),
      emoji: '💰', cardClass: styles.statCardTotal,
      sub: `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`,
    },
  ]

  return (
    <div className={styles.page}>

      {/* ── Stat Cards ── */}
      <section className={styles.statsGrid} aria-label="Spending overview">
        {statCards.map(card => (
          <motion.div
            key={card.id}
            className={`${styles.statCard} ${card.cardClass}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 * statCards.indexOf(card) }}
          >
            <span className={styles.statEmoji} aria-hidden="true">{card.emoji}</span>
            <span className={styles.statLabel}>{card.label}</span>
            <span className={styles.statValue}>{loading ? '—' : card.value}</span>
            <span className={styles.statSub}>{card.sub}</span>
          </motion.div>
        ))}
      </section>

      {/* ── Main Content ── */}
      <div className={styles.contentRow}>

        {/* ── Left: Expenses List ── */}
        <div className={styles.expensesPanel}>
          <div className={styles.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h2 className={styles.panelTitle}>Expenses</h2>
              <span className={styles.panelCount}>{expenses.length}</span>
            </div>
            <button
              id="add-expense-btn"
              className={styles.addBtn}
              onClick={() => { setEditingExpense(null); setShowExpenseModal(true) }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log Expense
            </button>
          </div>

          {/* Filters */}
          <div className={styles.filtersBar}>
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="expense-search"
                type="text"
                className={styles.searchInput}
                placeholder="Search description…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select
              id="expense-category-filter"
              className={styles.filterSelect}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>

            <input
              id="expense-date-from"
              type="date"
              className={styles.filterSelect}
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              title="From date"
            />
            <input
              id="expense-date-to"
              type="date"
              className={styles.filterSelect}
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              title="To date"
            />

            <select
              id="expense-sort"
              className={styles.filterSelect}
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* List */}
          <div className={styles.expenseList} role="list">
            {expenses.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon} aria-hidden="true">💸</span>
                <p className={styles.emptyText}>
                  {search || category || dateFrom || dateTo
                    ? 'No expenses match your filters.'
                    : 'No expenses logged yet. Click "Log Expense" to start tracking.'}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {expenses.map(exp => {
                  const color = CATEGORY_COLORS[exp.category] ?? '#6b7280'
                  return (
                    <motion.div
                      key={exp.id}
                      role="listitem"
                      className={styles.expenseRow}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0, padding: 0 }}
                      transition={{ duration: 0.18 }}
                      layout
                    >
                      {/* Category icon */}
                      <div
                        className={styles.categoryDot}
                        style={{ background: `${color}20` }}
                        aria-hidden="true"
                      >
                        <span style={{ fontSize: '1.2rem' }}>{CATEGORY_ICONS[exp.category]}</span>
                      </div>

                      {/* Info */}
                      <div className={styles.expenseInfo}>
                        <div className={styles.expenseDescription}>
                          {exp.description || exp.category}
                        </div>
                        <div className={styles.expenseMeta}>
                          {fmtDate(exp.expense_date)}
                          <span
                            className={styles.catBadge}
                            style={{
                              marginLeft: '0.5rem',
                              background: `${color}18`,
                              color,
                            }}
                          >
                            {exp.category}
                          </span>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className={styles.expenseRight}>
                        <span className={styles.expenseAmount}>
                          {formatCurrency(exp.amount)}
                        </span>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.iconBtn}
                            title="Edit"
                            onClick={() => { setEditingExpense(exp); setShowExpenseModal(true) }}
                            aria-label="Edit expense"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.deleteBtn}`}
                            title="Delete"
                            onClick={() => handleDelete(exp.id)}
                            aria-label="Delete expense"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Right: Charts + Budget ── */}
        <div className={styles.chartsPanel}>

          {/* Budget card */}
          <div className={styles.budgetCard}>
            <div className={styles.budgetHeader}>
              <h3 className={styles.budgetTitle}>Monthly Budget</h3>
              <button
                className={styles.editBudgetBtn}
                onClick={() => setShowBudgetModal(true)}
                id="set-budget-btn"
              >
                {budgetAmount ? 'Edit Budget' : 'Set Budget'}
              </button>
            </div>

            {budgetAmount ? (
              <>
                <div className={styles.budgetNumbers}>
                  <div>
                    <div className={styles.budgetSpent}>{formatCurrencyCompact(monthSpending)}</div>
                    <div className={styles.budgetTotal}>of {formatCurrency(budgetAmount)}</div>
                  </div>
                  <div
                    className={`${styles.budgetRemaining} ${
                      budgetRemaining >= 0 ? styles.budgetRemainingPos : styles.budgetRemainingNeg
                    }`}
                  >
                    {budgetRemaining >= 0
                      ? `${formatCurrencyCompact(budgetRemaining)} left`
                      : `${formatCurrencyCompact(Math.abs(budgetRemaining))} over`}
                  </div>
                </div>
                <div className={styles.bigBudgetBar}>
                  <div
                    className={`${styles.bigBudgetBarFill} ${budgetBarClass}`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
                <div className={styles.budgetPct}>{budgetPct}% used</div>
              </>
            ) : (
              <div className={styles.noBudgetMsg}>
                No budget set for this month.{' '}
                <button className={styles.setBudgetLink} onClick={() => setShowBudgetModal(true)}>
                  Set one now →
                </button>
              </div>
            )}
          </div>

          {/* Category doughnut */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Spending by Category</h3>
            <CategoryChart data={chartData?.by_category} />
          </div>

          {/* Spending over time */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Spending (Last 14 Days)</h3>
            <SpendingLineChart data={chartData?.over_time} />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showExpenseModal && (
          <ExpenseModal
            expense={editingExpense}
            onClose={() => { setShowExpenseModal(false); setEditingExpense(null) }}
            onSaved={handleSavedExpense}
          />
        )}
        {showBudgetModal && (
          <BudgetModal
            current={budgetAmount}
            onClose={() => setShowBudgetModal(false)}
            onSaved={handleBudgetSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
