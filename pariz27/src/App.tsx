import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { ConfirmProvider } from './components/ui'
import { AuthProvider, DataProvider, useAuth } from './state/app'
import { ToastProvider } from './state/toast'
import { DashboardPage } from './pages/DashboardPage'
import { BudgetPage } from './pages/BudgetPage'
import { NotesPage } from './pages/NotesPage'
import { NoteEditorPage } from './pages/NoteEditorPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage, RecoveryPage, SetupPage } from './pages/AuthPages'
import { Wordmark } from './components/brand'

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream">
      <Wordmark className="animate-pulse text-[44px] text-navy" />
    </div>
  )
}

function Gate() {
  const { mode } = useAuth()
  if (mode.kind === 'loading') return <Splash />
  if (mode.kind === 'setup') return <SetupPage />
  if (mode.kind === 'signed-out') return <LoginPage />
  if (mode.kind === 'recovery') return <RecoveryPage />
  return (
    <DataProvider key={mode.userId} userId={mode.userId} email={mode.email} local={mode.local}>
      <Routes>
        <Route path="/napady/:id" element={<NoteEditorPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/rozpocet" element={<BudgetPage />} />
          <Route path="/napady" element={<NotesPage />} />
          <Route path="/nastaveni" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
