import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'
import { ToastProvider, showToast } from './context/ToastContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Projects from './pages/Projects'
import TimeLog from './pages/TimeLog'
import Settings from './pages/Settings'
import Kanban from './pages/Kanban'

function errorMessage(err) {
  return err?.response?.data?.detail || err?.message || 'Something went wrong'
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
  mutationCache: new MutationCache({
    onError: (err) => showToast(errorMessage(err)),
  }),
  queryCache: new QueryCache({
    onError: (err) => showToast(errorMessage(err), 'warning'),
  }),
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <SettingsProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="projects" element={<Projects />} />
            <Route path="timelog" element={<TimeLog />} />
            <Route path="kanban" element={<Kanban />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
      </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
