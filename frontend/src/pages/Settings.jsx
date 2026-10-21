import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import styles from './Settings.module.css'

// ── Rich Mini Dashboard Preview ──
// Renders the TARGET theme's colors via inline styles regardless of the
// currently applied CSS vars. Respects `previewMode` to show light or dark variant.
function ThemePreview({ themeData, previewMode }) {
  const colors = themeData[previewMode]

  return (
    <div
      className={styles.previewWindow}
      style={{ backgroundColor: colors.bg }}
      aria-hidden="true"
    >
      <div className={styles.previewShell}>
        {/* Mini Sidebar */}
        <div
          className={styles.previewSidebar}
          style={{ backgroundColor: colors.surface, borderRight: `1px solid ${colors.border}` }}
        >
          <div
            className={styles.previewSidebarActive}
            style={{ backgroundColor: colors.primary }}
          />
          <div className={styles.previewSidebarDot} style={{ backgroundColor: colors.textMuted }} />
          <div className={styles.previewSidebarDot} style={{ backgroundColor: colors.textMuted }} />
          <div className={styles.previewSidebarDot} style={{ backgroundColor: colors.textMuted }} />
        </div>

        {/* Mini Main Area */}
        <div className={styles.previewMain} style={{ backgroundColor: colors.bg }}>
          {/* Mini Topbar */}
          <div
            className={styles.previewTopbar}
            style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}
          >
            <div className={styles.previewTopbarTitle} style={{ backgroundColor: colors.textMuted, opacity: 0.5 }} />
            <div className={styles.previewTopbarSpacer} />
            <div
              className={styles.previewTopbarBtn}
              style={{ backgroundColor: colors.surfaceSoft, borderColor: colors.border }}
            />
          </div>

          {/* Mini Content: 2 Cards */}
          <div className={styles.previewContent}>
            {[
              { lineColor: colors.primary, fillPct: '65%' },
              { lineColor: colors.secondary, fillPct: '40%' },
            ].map((card, i) => (
              <div
                key={i}
                className={styles.previewCard}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <div className={styles.previewCardLine} style={{ backgroundColor: colors.textMuted, opacity: 0.4, width: '55%' }} />
                <div className={styles.previewCardLine} style={{ backgroundColor: card.lineColor, width: '75%' }} />
                <div className={styles.previewProgressWrap} style={{ backgroundColor: colors.accentSoft }}>
                  <div className={styles.previewProgressFill} style={{ backgroundColor: card.lineColor, width: card.fillPct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Theme Selection Card ──
function ThemeCard({ themeData, isSelected, previewMode, onSelect }) {
  const colors = themeData[previewMode]

  return (
    <div
      className={`${styles.themeCard} ${isSelected ? styles.themeCardActive : ''}`}
      onClick={() => onSelect(themeData.id)}
      role="radio"
      aria-checked={isSelected}
      aria-label={`Select ${themeData.name} theme`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(themeData.id)
        }
      }}
    >
      {/* Card Header */}
      <div className={styles.cardTopRow}>
        <div className={styles.themeNameRow}>
          <span
            className={styles.themeSwatch}
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
            aria-hidden="true"
          />
          <div>
            <div className={styles.themeName}>{themeData.name}</div>
            {previewMode === 'dark' && (
              <div className={styles.themeDarkName}>{themeData.darkName}</div>
            )}
          </div>
        </div>
        {isSelected && (
          <span className={styles.selectedBadge}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Active
          </span>
        )}
      </div>

      {/* Feel */}
      <span className={styles.themeFeel}>{themeData.feel}</span>

      {/* Rich Dashboard Preview (reflects current mode) */}
      <ThemePreview themeData={themeData} previewMode={previewMode} />

      {/* Color Swatches */}
      <div className={styles.paletteRow}>
        <div className={styles.dotsCluster}>
          {[colors.primary, colors.secondary, colors.bg, colors.accentSoft, colors.surface].map((c, i) => (
            <span key={i} className={styles.colorDot} style={{ backgroundColor: c }} title={c} />
          ))}
        </div>
        <span className={styles.hexChip}>{colors.primary}</span>
      </div>
    </div>
  )
}

export default function Settings() {
  const { theme, mode, setTheme, setMode, isDark, colorThemes, currentTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('appearance')

  return (
    <motion.div
      className={styles.settingsContainer}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Page Header */}
      <div className={styles.headerSection}>
        <div className={styles.breadcrumbNav}>
          <span className={styles.breadcrumbItem}>Settings</span>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbActive}>Appearance</span>
        </div>
        <h1 className={styles.pageHeading}>System Settings</h1>
        <p className={styles.pageSubtitle}>
          Customize your visual environment, workspace preferences, and system behaviour.
        </p>
      </div>

      {/* Tabs */}
      <div className={styles.tabsNav} role="tablist">
        {[
          { id: 'appearance', label: 'Appearance', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
          { id: 'general', label: 'General', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
          { id: 'data', label: 'Data & Storage', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            id={`tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'appearance' && (
          <motion.div
            key="appearance"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {/* ── Color Theme Selection ── */}
            <section className={styles.sectionCard} aria-labelledby="theme-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleGroup}>
                  <h2 className={styles.sectionTitle} id="theme-heading">Color Theme</h2>
                  <p className={styles.sectionDesc}>
                    Choose your color identity. Use the light/dark button in the top bar to switch modes.
                  </p>
                </div>
                <div className={styles.activeThemePill}>
                  <span className={styles.activeDot} />
                  {isDark ? currentTheme.darkName : currentTheme.name}
                  <span style={{ opacity: 0.6, marginLeft: 4 }}>({mode})</span>
                </div>
              </div>

              {/* 6 Theme Cards in 2×3 or 3×2 grid */}
              <div className={styles.themesGrid} role="radiogroup" aria-label="Select color theme">
                {colorThemes.map((t) => (
                  <ThemeCard
                    key={t.id}
                    themeData={t}
                    isSelected={theme === t.id}
                    previewMode={mode}
                    onSelect={setTheme}
                  />
                ))}
              </div>

              <div className={styles.infoBox}>
                <span className={styles.infoIcon} aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
                <div>
                  Previews automatically reflect your current <strong>{mode} mode</strong>. Use the{' '}
                  <strong>light/dark</strong> button in the top bar to toggle — your color theme stays the same.
                  Both preferences are saved to <code>localStorage</code> and restored on next visit.
                </div>
              </div>
            </section>

            {/* ── Light / Dark Mode Toggle ── */}
            <section className={styles.sectionCard} aria-labelledby="mode-heading">
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle} id="mode-heading">Light / Dark Mode</h2>
                <p className={styles.sectionDesc}>Switch independently from your color theme.</p>
              </div>

              <div className={styles.modeToggleRow}>
                <button
                  className={`${styles.modeBtn} ${!isDark ? styles.modeBtnActive : ''}`}
                  onClick={() => setMode('light')}
                  aria-pressed={!isDark}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                  Light Mode
                </button>
                <button
                  className={`${styles.modeBtn} ${isDark ? styles.modeBtnActive : ''}`}
                  onClick={() => setMode('dark')}
                  aria-pressed={isDark}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                  Dark Mode
                </button>
              </div>
            </section>

            {/* ── Live Demo ── */}
            <section className={styles.liveDemoCard} aria-labelledby="demo-heading">
              <div className={styles.sectionTitleGroup}>
                <h3 className={styles.sectionTitle} id="demo-heading">Live Component Preview</h3>
                <p className={styles.sectionDesc}>
                  Sample UI rendered in <strong>{isDark ? currentTheme.darkName : currentTheme.name}</strong>.
                </p>
              </div>
              <div className={styles.demoGrid}>
                <div className={styles.demoItem}>
                  <span className={styles.demoLabel}>Buttons</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className={styles.demoPrimaryBtn}>Primary Action</button>
                    <button className={styles.demoSecondaryBtn}>Secondary</button>
                  </div>
                </div>
                <div className={styles.demoItem}>
                  <span className={styles.demoLabel}>Status Badges</span>
                  <div className={styles.demoBadgeGroup}>
                    <span className={styles.demoBadgeAccent}>Active Theme</span>
                    <span className={styles.demoBadgeSuccess}>84% Done</span>
                    <span className={styles.demoBadgeAmber}>In Progress</span>
                  </div>
                </div>
                <div className={styles.demoItem}>
                  <span className={styles.demoLabel}>Progress Bar</span>
                  <div style={{ height: '8px', borderRadius: '9999px', backgroundColor: 'var(--bg-input)', overflow: 'hidden', marginTop: '6px' }}>
                    <div style={{ width: '72%', height: '100%', borderRadius: '9999px', backgroundColor: 'var(--accent)', transition: 'background-color 180ms ease' }} />
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'general' && (
          <motion.div key="general" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className={styles.sectionCard}>
            <div className={styles.sectionTitleGroup}>
              <h2 className={styles.sectionTitle}>Workspace Preferences</h2>
              <p className={styles.sectionDesc}>Manage general workspace and notification settings.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              {[
                { label: 'Sidebar Auto-Collapse', desc: 'Keep sidebar compact by default on laptop screens', badge: 'Enabled', cls: 'demoBadgeAccent' },
                { label: 'Live Clock in Header', desc: 'Show real-time local date and time in the top bar', badge: 'Active', cls: 'demoBadgeSuccess' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{row.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{row.desc}</div>
                  </div>
                  <span className={styles[row.cls]}>{row.badge}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'data' && (
          <motion.div key="data" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className={styles.sectionCard}>
            <div className={styles.sectionTitleGroup}>
              <h2 className={styles.sectionTitle}>Database & Local Storage</h2>
              <p className={styles.sectionDesc}>Your theme and preferences are persisted locally.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {[
                { label: 'Theme Key', value: `lifeos-theme = "${theme}"` },
                { label: 'Mode Key', value: `lifeos-mode = "${mode}"` },
                { label: 'Active Name', value: isDark ? currentTheme.darkName : currentTheme.name },
                { label: 'Storage Engine', value: 'Browser LocalStorage + SQLite Database' },
              ].map((row) => (
                <div key={row.label} style={{ padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.83rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-primary)', minWidth: '120px' }}>{row.label}:</strong>
                  <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{row.value}</code>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
