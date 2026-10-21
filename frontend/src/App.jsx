import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import CommandPalette from './components/ui/CommandPalette'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Settings from './pages/Settings'
import Placeholder from './pages/Placeholder'
import NotFound from './pages/NotFound'

// Every page: sidebar-style label (used by search) + header title
const PAGES = [
  { path: '/',          label: 'Overview',        title: 'Executive Overview' },
  { path: '/tasks',     label: 'Tasks',           title: 'Task Workspace' },
  { path: '/calendar',  label: 'Calendar',        title: 'Calendar & Schedule' },
  { path: '/habits',    label: 'Habits',          title: 'Habit Compounding' },
  { path: '/goals',     label: 'Goals',           title: 'Objectives & Goals' },
  { path: '/study',     label: 'Study & Focus',   title: 'Study & Deep Focus' },
  { path: '/expenses',  label: 'Finances',        title: 'Financial Ledger' },
  { path: '/notes',     label: 'Notes & Journal', title: 'Knowledge & Notes' },
  { path: '/analytics', label: 'Performance',     title: 'Performance Analytics' },
  { path: '/settings',  label: 'Settings',        title: 'System Settings' },
]

const SIDEBAR_STORAGE_KEY = 'lifeos-sidebar-collapsed'

function AppShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // New key per open, so a quick reopen mid-exit-animation starts with an empty search
  const [paletteSession, setPaletteSession] = useState(0)

  const openPalette = () => {
    setPaletteSession((n) => n + 1)
    setPaletteOpen(true)
  }

  const handleToggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
    } catch { /* ignore */ }
  }

  // Reset mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Global shortcuts: Ctrl/⌘ + K opens search, Escape closes the mobile nav
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteSession((n) => n + 1)
        setPaletteOpen((open) => !open)
      } else if (e.key === 'Escape') {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const pageTitle = PAGES.find((p) => p.path === location.pathname)?.title ?? 'Page Not Found'

  useEffect(() => {
    document.title = `${pageTitle} · Life OS`
  }, [pageTitle])

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="main-content">
        <Topbar
          pageTitle={pageTitle}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onOpenSearch={openPalette}
        />

        <main className="page-content" role="main">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/calendar" element={<Placeholder module="calendar" />} />
                <Route path="/goals" element={<Placeholder module="goals" />} />
                <Route path="/habits" element={<Placeholder module="habits" />} />
                <Route path="/study" element={<Placeholder module="study" />} />
                <Route path="/expenses" element={<Placeholder module="expenses" />} />
                <Route path="/notes" element={<Placeholder module="notes" />} />
                <Route path="/analytics" element={<Placeholder module="analytics" />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {paletteOpen && (
          <CommandPalette key={paletteSession} pages={PAGES} onClose={() => setPaletteOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <AppShell />
      </MotionConfig>
    </ThemeProvider>
  )
}
