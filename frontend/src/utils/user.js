// "Ada Lovelace" → "AL", "ada" → "A"
export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const letters = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return letters.toUpperCase()
}

export function getFirstName(name = '') {
  return name.trim().split(/\s+/)[0] || ''
}

// Only allow redirects to paths inside this app (blocks open redirects like //evil.com)
export function safeNextPath(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/'
  }
  if (next.startsWith('/login') || next.startsWith('/register')) return '/'
  return next
}
