import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import styles from './CommandPalette.module.css'

// Searchable launcher for pages and quick actions — opened with Ctrl/⌘ + K
export default function CommandPalette({ pages, onClose }) {
  const navigate = useNavigate()
  const { isDark, toggleMode } = useTheme()
  const { logout } = useAuth()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef(null)

  const commands = useMemo(() => [
    ...pages.map((p) => ({
      id: p.path,
      group: 'Go to',
      label: p.label,
      hint: p.title,
      run: () => navigate(p.path),
    })),
    {
      id: 'toggle-mode',
      group: 'Actions',
      label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
      hint: 'Appearance',
      keywords: 'theme toggle dark light mode',
      run: toggleMode,
    },
    {
      id: 'logout',
      group: 'Actions',
      label: 'Log out',
      hint: 'Account',
      keywords: 'sign out logout',
      run: logout,
    },
  ], [pages, navigate, isDark, toggleMode, logout])

  // Every typed word must appear somewhere in the command's searchable text
  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return commands
    return commands.filter((c) => {
      const text = `${c.label} ${c.hint} ${c.keywords ?? ''}`.toLowerCase()
      return terms.every((t) => text.includes(t))
    })
  }, [commands, query])

  // Keep the highlighted option visible while arrowing through the list
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const runCommand = (cmd) => {
    onClose()
    cmd.run()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runCommand(results[activeIndex])
    }
  }

  return (
    <motion.div
      className={styles.backdrop}
      onMouseDown={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Search Life OS"
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.searchRow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search pages and actions…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={results[activeIndex] ? `cmd-${results[activeIndex].id}` : undefined}
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>

        <div className={styles.list} id="command-palette-list" role="listbox" ref={listRef}>
          {results.length === 0 && (
            <div className={styles.empty}>No results for “{query.trim()}”</div>
          )}

          {results.map((cmd, i) => (
            <div key={cmd.id}>
              {(i === 0 || results[i - 1].group !== cmd.group) && (
                <div className={styles.groupLabel}>{cmd.group}</div>
              )}
              <div
                id={`cmd-${cmd.id}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`${styles.option} ${i === activeIndex ? styles.optionActive : ''}`}
                onMouseMove={() => setActiveIndex(i)}
                onClick={() => runCommand(cmd)}
              >
                <span className={styles.optionLabel}>{cmd.label}</span>
                <span className={styles.optionHint}>{cmd.hint}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <span><kbd className={styles.kbd}>↑</kbd><kbd className={styles.kbd}>↓</kbd> navigate</span>
          <span><kbd className={styles.kbd}>Enter</kbd> open</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
