import { createContext, useContext, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

export const AUTH_QUERY_KEY = ['auth', 'me']

const AuthContext = createContext(null)

async function fetchCurrentUser() {
  const data = await apiFetch('/api/auth/me')
  return data.user
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  // Set on explicit logout so guards send the user to plain /login (no ?next=)
  const [loggedOut, setLoggedOut] = useState(false)

  const { data: user, isPending, error, refetch } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  })

  const setUser = useCallback(
    (nextUser) => queryClient.setQueryData(AUTH_QUERY_KEY, nextUser),
    [queryClient]
  )

  const login = useCallback(async ({ email, password }) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
    setLoggedOut(false)
    setUser(data.user)
    return data.user
  }, [setUser])

  const register = useCallback(async ({ name, email, password, confirmPassword }) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: { name, email, password, confirm_password: confirmPassword },
    })
    setLoggedOut(false)
    setUser(data.user)
    return data.user
  }, [setUser])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', body: {} })
    } finally {
      // Drop every cached response so the next user never sees this user's data
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
      setLoggedOut(true)
      setUser(null)
    }
  }, [queryClient, setUser])

  const value = {
    user: user ?? null,
    isLoading: isPending,
    error,
    retry: refetch,
    loggedOut,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
