/**
 * Tasks.jsx — Full-featured Task Management page for Life OS.
 *
 * Features:
 *  - Live stats bar (total / completed / pending / overdue)
 *  - Filterable, searchable, sortable task list
 *  - Create / Edit task modal with all fields
 *  - Delete confirmation dialog
 *  - Inline status toggle
 *  - Toast feedback
 *  - Empty states
 *  - Overdue visual indicators
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_STATS_QUERY_KEY } from "../api/tasks";
import Toast from "../components/ui/Toast";
import styles from "./Tasks.module.css";

const API = "/api/tasks";

/* ────────────────────────────── constants ────────────────────────────── */
const STATUSES = ["Pending", "In Progress", "Completed"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const FILTER_TABS = [
  { key: "All",         label: "All" },
  { key: "Pending",     label: "Pending" },
  { key: "In Progress", label: "In Progress" },
  { key: "Completed",   label: "Completed" },
  { key: "Overdue",     label: "Overdue" },
];

const PRIORITY_COLOR = {
  Low:    "priority-low",
  Medium: "priority-medium",
  High:   "priority-high",
  Urgent: "priority-urgent",
};

const STATUS_COLOR = {
  Pending:     "status-pending",
  "In Progress": "status-inprogress",
  Completed:   "status-completed",
};

/* ────────────────────────────── helpers ────────────────────────────── */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function isOverdue(task) {
  if (task.status === "Completed" || !task.due_date) return false;
  return task.due_date < todayISO();
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeDate(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `${diff}d left`;
  return formatDate(iso);
}

/* ────────────────────────────── sub-components ────────────────────────────── */

function StatsBar({ stats }) {
  const items = [
    { label: "Total",     value: stats.total,     color: "stat-total" },
    { label: "Completed", value: stats.completed, color: "stat-completed" },
    { label: "Pending",   value: stats.pending,   color: "stat-pending" },
    { label: "Overdue",   value: stats.overdue,   color: "stat-overdue" },
  ];

  return (
    <div className={styles.statsBar}>
      {items.map((item) => (
        <div key={item.label} className={`${styles.statItem} ${styles[item.color]}`}>
          <span className={styles.statValue}>{item.value}</span>
          <span className={styles.statLabel}>{item.label}</span>
        </div>
      ))}
      <div className={styles.statProgress}>
        <div className={styles.progressLabel}>
          <span>Completion</span>
          <span className={styles.progressPct}>{stats.completion_pct ?? 0}%</span>
        </div>
        <div className={styles.progressTrack}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${stats.completion_pct ?? 0}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`${styles.badge} ${styles[PRIORITY_COLOR[priority] ?? "priority-medium"]}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${styles[STATUS_COLOR[status] ?? "status-pending"]}`}>
      {status}
    </span>
  );
}

const emptyIconProps = {
  width: 40, height: 40, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
};

const EMPTY_ICONS = {
  clipboard: (
    <svg {...emptyIconProps}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  ),
  clock: (
    <svg {...emptyIconProps}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  ),
  play: (
    <svg {...emptyIconProps}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="10 8.5 16 12 10 15.5 10 8.5" />
    </svg>
  ),
  checkCircle: (
    <svg {...emptyIconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  ),
  calendarCheck: (
    <svg {...emptyIconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M9 16l2 2 4-4" />
    </svg>
  ),
};

function EmptyState({ filter }) {
  const msgs = {
    All:         { icon: EMPTY_ICONS.clipboard, title: "No tasks yet", sub: 'Click "New Task" to get started.' },
    Pending:     { icon: EMPTY_ICONS.clock, title: "Nothing pending", sub: "You're all caught up!" },
    "In Progress": { icon: EMPTY_ICONS.play, title: "Nothing in progress", sub: "Pick a task to start working on." },
    Completed:   { icon: EMPTY_ICONS.checkCircle, title: "No completed tasks", sub: "Finish a task and it will appear here." },
    Overdue:     { icon: EMPTY_ICONS.calendarCheck, title: "No overdue tasks", sub: "Great — you're on top of everything!" },
  };
  const m = msgs[filter] ?? msgs.All;
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{m.icon}</div>
      <h3 className={styles.emptyTitle}>{m.title}</h3>
      <p className={styles.emptySub}>{m.sub}</p>
    </div>
  );
}

function TaskCard({ task, onStatusToggle, onEdit, onDelete }) {
  const overdue = isOverdue(task);
  const rel = relativeDate(task.due_date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className={`${styles.taskCard} ${task.status === "Completed" ? styles.taskDone : ""} ${overdue ? styles.taskOverdue : ""}`}
    >
      {/* Checkbox / Status toggle */}
      <button
        className={`${styles.checkbox} ${task.status === "Completed" ? styles.checkboxDone : ""}`}
        onClick={() => onStatusToggle(task)}
        aria-label={task.status === "Completed" ? "Mark incomplete" : "Mark complete"}
        title={task.status === "Completed" ? "Click to unmark" : "Mark as complete"}
      >
        {task.status === "Completed" && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Main content */}
      <div className={styles.taskBody}>
        <div className={styles.taskTop}>
          <span className={`${styles.taskTitle} ${task.status === "Completed" ? styles.taskTitleDone : ""}`}>
            {task.title}
          </span>
          <div className={styles.taskActions}>
            <button className={styles.iconBtn} onClick={() => onEdit(task)} aria-label="Edit task" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => onDelete(task)} aria-label="Delete task" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>

        {task.description && (
          <p className={styles.taskDesc}>{task.description}</p>
        )}

        <div className={styles.taskMeta}>
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {task.category && (
            <span className={styles.categoryTag}>{task.category}</span>
          )}
          {rel && (
            <span className={`${styles.dueDateTag} ${overdue ? styles.dueDateOverdue : ""}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {rel}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────── task modal ────────────────────────────── */
const EMPTY_FORM = {
  title:       "",
  description: "",
  category:    "",
  priority:    "Medium",
  status:      "Pending",
  due_date:    "",
};

function TaskModal({ task, onClose, onSaved, showToast }) {
  const isEdit = Boolean(task?.id);
  const [form, setForm] = useState(
    task
      ? {
          title:       task.title ?? "",
          description: task.description ?? "",
          category:    task.category ?? "",
          priority:    task.priority ?? "Medium",
          status:      task.status ?? "Pending",
          due_date:    task.due_date ?? "",
        }
      : { ...EMPTY_FORM }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        due_date: form.due_date || null,
      };
      const url    = isEdit ? `${API}/${task.id}` : `${API}/`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      onSaved(data, isEdit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>
            {isEdit ? "Edit Task" : "New Task"}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="task-title">Title <span className={styles.required}>*</span></label>
            <input
              id="task-title"
              ref={firstInputRef}
              className={styles.formInput}
              type="text"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={set("title")}
              required
              maxLength={255}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              className={`${styles.formInput} ${styles.formTextarea}`}
              placeholder="Add details (optional)..."
              value={form.description}
              onChange={set("description")}
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="task-category">Category</label>
              <input
                id="task-category"
                className={styles.formInput}
                type="text"
                placeholder="e.g. Work, Study, Personal"
                value={form.category}
                onChange={set("category")}
                maxLength={100}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="task-due">Due Date</label>
              <input
                id="task-due"
                className={styles.formInput}
                type="date"
                value={form.due_date}
                onChange={set("due_date")}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="task-priority">Priority</label>
              <select id="task-priority" className={`${styles.formInput} ${styles.formSelect}`} value={form.priority} onChange={set("priority")}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            {isEdit && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="task-status">Status</label>
                <select id="task-status" className={`${styles.formInput} ${styles.formSelect}`} value={form.status} onChange={set("status")}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────── delete confirm dialog ────────────────────────────── */
function ConfirmDialog({ task, onConfirm, onCancel }) {
  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        className={`${styles.modal} ${styles.confirmModal}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.16 }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className={styles.confirmIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <h3 id="confirm-title" className={styles.confirmTitle}>Delete Task?</h3>
        <p className={styles.confirmSub}>
          <strong>"{task.title}"</strong> will be permanently removed. This cannot be undone.
        </p>
        <div className={styles.confirmActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>Cancel</button>
          <button className={styles.btnDanger} onClick={onConfirm}>Delete</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────── main page ────────────────────────────── */
export default function Tasks() {
  const [tasks,   setTasks]   = useState([]);
  const queryClient = useQueryClient();
  const [stats,   setStats]   = useState({ total: 0, completed: 0, pending: 0, overdue: 0, completion_pct: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab,       setActiveTab]       = useState("All");
  const [search,          setSearch]          = useState("");
  const [filterPriority,  setFilterPriority]  = useState("");
  const [filterCategory,  setFilterCategory]  = useState("");
  const [sortBy,          setSortBy]          = useState("created_at");

  // Modal state
  const [modalTask, setModalTask] = useState(null);    // null = closed, {} = new, task = edit
  const [modalOpen, setModalOpen] = useState(false);

  // Delete confirm state
  const [deleteTask, setDeleteTask] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((title, message = "", type = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* fetch tasks */
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "All") params.set("status", activeTab);
      if (search) params.set("search", search);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterCategory) params.set("category", filterCategory);
      if (sortBy) params.set("sort", sortBy);

      const [tasksRes, statsRes] = await Promise.all([
        fetch(`${API}/?${params}`),
        fetch(`${API}/stats`),
      ]);
      const tasksData = await tasksRes.json();
      const statsData = await statsRes.json();
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setStats(statsData);
      // Keep the sidebar badge in sync without another request
      queryClient.setQueryData(TASK_STATS_QUERY_KEY, statsData);
    } catch {
      showToast("Error", "Could not load tasks. Is the server running?", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, filterPriority, filterCategory, sortBy, showToast, queryClient]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* handlers */
  const openCreate = () => { setModalTask({}); setModalOpen(true); };
  const openEdit   = (task) => { setModalTask(task); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setModalTask(null); };

  const handleSaved = (saved, isEdit) => {
    closeModal();
    showToast(
      isEdit ? "Task updated" : "Task created",
      saved.title,
      "success"
    );
    fetchTasks();
  };

  const handleStatusToggle = async (task) => {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    try {
      const res = await fetch(`${API}/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      showToast(
        nextStatus === "Completed" ? "Task completed!" : "Task reopened",
        task.title
      );
      fetchTasks();
    } catch {
      showToast("Error", "Could not update status", "error");
    }
  };

  const handleDeleteClick  = (task) => setDeleteTask(task);
  const handleDeleteCancel = () => setDeleteTask(null);
  const handleDeleteConfirm = async () => {
    if (!deleteTask) return;
    try {
      const res = await fetch(`${API}/${deleteTask.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Task deleted", deleteTask.title, "info");
      setDeleteTask(null);
      fetchTasks();
    } catch {
      showToast("Error", "Could not delete task", "error");
    }
  };

  /* derive unique categories for filter dropdown */
  const uniqueCategories = [...new Set(tasks.map((t) => t.category).filter(Boolean))];

  /* ─── render ─── */
  return (
    <div className={styles.page}>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <TaskModal
            key="task-modal"
            task={modalTask?.id ? modalTask : null}
            onClose={closeModal}
            onSaved={handleSaved}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTask && (
          <ConfirmDialog
            key="confirm-dialog"
            task={deleteTask}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Tasks</h1>
          <p className={styles.pageSubtitle}>Manage what needs to get done.</p>
        </div>
        <button id="new-task-btn" className={styles.btnPrimary} onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Task
        </button>
      </header>

      {/* ── Stats Bar ── */}
      <StatsBar stats={stats} />

      {/* ── Filters & Search ── */}
      <div className={styles.controlsBar}>
        {/* Status Tabs */}
        <div className={styles.tabRow}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key === "Overdue" && stats.overdue > 0 && (
                <span className={styles.overdueCount}>{stats.overdue}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className={styles.filterRow}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="task-search"
              className={styles.searchInput}
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch("")} aria-label="Clear search">×</button>
            )}
          </div>

          <select
            id="priority-filter"
            className={styles.filterSelect}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>

          {uniqueCategories.length > 0 && (
            <select
              id="category-filter"
              className={styles.filterSelect}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}

          <select
            id="sort-select"
            className={styles.filterSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at">Sort: Newest</option>
            <option value="due_date">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
          </select>
        </div>
      </div>

      {/* ── Task List ── */}
      <div className={styles.taskList} aria-live="polite">
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading tasks…</span>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState filter={activeTab} />
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusToggle={handleStatusToggle}
                onEdit={openEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
