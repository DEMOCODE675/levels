import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import BrandMark from './BrandMark'

export default function ProtectedRoute({ children, requireProfile = false }) {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return (
            <main className="grid min-h-screen place-items-center bg-gray-50 px-4 py-8">
                <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <BrandMark className="mb-4 justify-center" />
                    <svg className="h-10 w-10 animate-spin text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </section>
            </main>
        )
    }

    if (!user) {
        return <Navigate to="/auth" replace />
    }

    if (requireProfile && !profile) {
        return <Navigate to="/profile" replace />
    }

    return children
}
