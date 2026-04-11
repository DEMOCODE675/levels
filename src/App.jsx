import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import ChatInboxPage from './pages/ChatInboxPage'
import ChatPage from './pages/ChatPage'
import MatchesPage from './pages/MatchesPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import SettingsPage from './pages/SettingsPage'
import SwipePage from './pages/SwipePage'
import BrandMark from './components/BrandMark'

function HomeRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50 px-4 py-8">
        <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
          <BrandMark className="mb-3 justify-center" />
          <h2 className="text-xl font-bold text-gray-900">Loading app...</h2>
        </section>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (!profile) {
    return <Navigate to="/profile" replace />
  }

  return <Navigate to="/swipe" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/auth" element={<AuthPage />} />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileSetupPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/swipe"
        element={
          <ProtectedRoute requireProfile>
            <SwipePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/matches"
        element={
          <ProtectedRoute requireProfile>
            <MatchesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute requireProfile>
            <ChatInboxPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat/:matchId"
        element={
          <ProtectedRoute requireProfile>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute requireProfile>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}