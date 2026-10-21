import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ToastProvider } from './components/Toasts'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    // Octokit's retry plugin already retries transient failures.
    queries: { refetchOnWindowFocus: false, retry: false, staleTime: 60_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
