import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ── 6 Color Families — each with light + dark color sets ──
export const COLOR_THEMES = [
  {
    id: 'lavender',
    name: 'Lavender Bloom',
    darkName: 'Midnight Lavender',
    emoji: '💜',
    feel: 'Elegant, soft, calm, aesthetic',
    accentColor: '#7657C5',
    light: {
      bg: '#F7F4FC',
      surface: '#FFFFFF',
      surfaceSoft: '#F1ECF9',
      primary: '#7657C5',
      secondary: '#A88BE8',
      accentSoft: '#E9E2F8',
      text: '#252230',
      textMuted: '#777080',
      border: '#E4DFF0',
    },
    dark: {
      bg: '#111019',
      surface: '#191722',
      surfaceSoft: '#211E2D',
      primary: '#9A88E5',
      secondary: '#B19DEB',
      accentSoft: '#302A43',
      text: '#F3F0FA',
      textMuted: '#9691A5',
      border: '#302C3B',
    },
  },
  {
    id: 'sage',
    name: 'Sage Serenity',
    darkName: 'Deep Sage',
    emoji: '🌿',
    feel: 'Natural, peaceful, organic',
    accentColor: '#5F8871',
    light: {
      bg: '#F4F7F1',
      surface: '#FFFFFF',
      surfaceSoft: '#EAF1E9',
      primary: '#5F8871',
      secondary: '#86A992',
      accentSoft: '#E1ECE3',
      text: '#263129',
      textMuted: '#747D76',
      border: '#DDE6DE',
    },
    dark: {
      bg: '#101713',
      surface: '#18201B',
      surfaceSoft: '#202A23',
      primary: '#82B095',
      secondary: '#9CC2A9',
      accentSoft: '#293D31',
      text: '#EFF5F0',
      textMuted: '#929E96',
      border: '#2C3830',
    },
  },
  {
    id: 'sky',
    name: 'Skyline',
    darkName: 'Midnight Sky',
    emoji: '☁️',
    feel: 'Clean, fresh, professional',
    accentColor: '#4F82C2',
    light: {
      bg: '#F2F6FB',
      surface: '#FFFFFF',
      surfaceSoft: '#E8F0F8',
      primary: '#4F82C2',
      secondary: '#75A7DC',
      accentSoft: '#E1ECF8',
      text: '#202A36',
      textMuted: '#737D88',
      border: '#DCE5EF',
    },
    dark: {
      bg: '#0E141D',
      surface: '#161E29',
      surfaceSoft: '#1E2936',
      primary: '#6D9FDE',
      secondary: '#8CB7E8',
      accentSoft: '#26384D',
      text: '#F0F4F8',
      textMuted: '#929EAA',
      border: '#2A3542',
    },
  },
  {
    id: 'rose',
    name: 'Dusty Rose',
    darkName: 'Plum Noir',
    emoji: '🌹',
    feel: 'Soft, sophisticated, warm',
    accentColor: '#A45D78',
    light: {
      bg: '#FBF4F7',
      surface: '#FFFFFF',
      surfaceSoft: '#F5E8ED',
      primary: '#A45D78',
      secondary: '#C08098',
      accentSoft: '#F1E0E7',
      text: '#30242A',
      textMuted: '#7E7076',
      border: '#EADCE2',
    },
    dark: {
      bg: '#171115',
      surface: '#21171D',
      surfaceSoft: '#2A1D24',
      primary: '#C47B99',
      secondary: '#D49AAF',
      accentSoft: '#432A35',
      text: '#F7EFF2',
      textMuted: '#A09399',
      border: '#38272F',
    },
  },
  {
    id: 'peach',
    name: 'Terracotta Glow',
    darkName: 'Ember Terracotta',
    emoji: '🍑',
    feel: 'Warm, friendly, energetic',
    accentColor: '#C86F4B',
    light: {
      bg: '#FFF6F0',
      surface: '#FFFFFF',
      surfaceSoft: '#FBE9DE',
      primary: '#C86F4B',
      secondary: '#DF9875',
      accentSoft: '#F7DFD2',
      text: '#30251F',
      textMuted: '#81736C',
      border: '#EEDDD2',
    },
    dark: {
      bg: '#18120F',
      surface: '#221915',
      surfaceSoft: '#2B201B',
      primary: '#D98962',
      secondary: '#E3A07F',
      accentSoft: '#4A2D22',
      text: '#F8F1ED',
      textMuted: '#A0958F',
      border: '#3A2922',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo Tide',
    darkName: 'Deep Indigo',
    emoji: '🩵',
    feel: 'Modern, clean, slightly energetic',
    accentColor: '#566BB8',
    light: {
      bg: '#F2F5FC',
      surface: '#FFFFFF',
      surfaceSoft: '#E8ECF9',
      primary: '#566BB8',
      secondary: '#4EAFC1',
      accentSoft: '#E1E6F8',
      text: '#222A40',
      textMuted: '#737B91',
      border: '#DCE2F0',
    },
    dark: {
      bg: '#0F121C',
      surface: '#181D2A',
      surfaceSoft: '#202638',
      primary: '#7185D4',
      secondary: '#61B9C9',
      accentSoft: '#29324F',
      text: '#F1F4FA',
      textMuted: '#9299AA',
      border: '#2A3142',
    },
  },
]

const DEFAULT_THEME = 'lavender'
const DEFAULT_MODE = 'light'
const THEME_STORAGE_KEY = 'lifeos-theme'
const MODE_STORAGE_KEY = 'lifeos-mode'

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  mode: DEFAULT_MODE,
  setTheme: () => {},
  setMode: () => {},
  toggleMode: () => {},
  isDark: false,
  colorThemes: COLOR_THEMES,
  currentTheme: COLOR_THEMES[0],
  currentColors: COLOR_THEMES[0].light,
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (saved && COLOR_THEMES.some((t) => t.id === saved)) return saved
    } catch { /* ignore */ }
    return DEFAULT_THEME
  })

  const [mode, setModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* ignore */ }
    // First visit: follow the OS preference
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
    return DEFAULT_MODE
  })

  // Apply both attributes to <html> and persist
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-mode', mode)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
      localStorage.setItem(MODE_STORAGE_KEY, mode)
    } catch { /* ignore */ }
  }, [theme, mode])

  // Change color family — keeps current mode
  const setTheme = useCallback((newTheme) => {
    if (COLOR_THEMES.some((t) => t.id === newTheme)) {
      setThemeState(newTheme)
    }
  }, [])

  // Change mode explicitly — keeps current theme
  const setMode = useCallback((newMode) => {
    if (newMode === 'light' || newMode === 'dark') {
      setModeState(newMode)
    }
  }, [])

  // Toggle light ↔ dark — keeps current theme
  const toggleMode = useCallback(() => {
    setModeState((m) => (m === 'light' ? 'dark' : 'light'))
  }, [])

  const currentTheme = COLOR_THEMES.find((t) => t.id === theme) || COLOR_THEMES[0]
  const currentColors = currentTheme[mode]
  const isDark = mode === 'dark'

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        setTheme,
        setMode,
        toggleMode,
        isDark,
        colorThemes: COLOR_THEMES,
        currentTheme,
        currentColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}

export default ThemeContext
