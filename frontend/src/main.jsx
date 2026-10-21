import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AUTH_QUERY_KEY } from './context/AuthContext'
import './styles/globals.css'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Session expired or was revoked: clear the user so route guards send them to /login
    onError: (error, query) => {
      if (error?.status === 401 && query.queryKey[0] !== AUTH_QUERY_KEY[0]) {
        queryClient.setQueryData(AUTH_QUERY_KEY, null)
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry once for flaky networks, never for auth failures
      retry: (failureCount, error) => error?.status !== 401 && failureCount < 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
