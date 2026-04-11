import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
    getAllowedCollegeDomains,
    isCollegeEmail,
    loginWithEmail,
    signUpWithCollegeEmail,
} from '../services/authService'
import BrandMark from '../components/BrandMark'

const INITIAL_FORM = {
    email: '',
    password: '',
}

function getFriendlyAuthError(error) {
    const code = error?.code || ''

    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        return 'Wrong password or email. Please try again.'
    }

    if (code === 'auth/user-not-found') {
        return 'No account found for this email.'
    }

    if (code === 'auth/email-already-in-use') {
        return 'This email is already registered. Please login.'
    }

    if (code === 'auth/weak-password') {
        return 'Password must be at least 6 characters.'
    }

    return error?.message || 'Authentication failed. Please try again.'
}

export default function AuthPage() {
    const [mode, setMode] = useState('login')
    const [form, setForm] = useState(INITIAL_FORM)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const { profile, refreshProfile, user } = useAuth()
    const navigate = useNavigate()
    const hasProfilePhoto = Boolean(profile?.photoUrl)

    const allowedDomain = getAllowedCollegeDomains()[0] || 'miet.ac.in'

    useEffect(() => {
        if (!user) {
            return
        }

        navigate(profile && hasProfilePhoto ? '/swipe' : '/profile?edit=1', { replace: true })
    }, [hasProfilePhoto, navigate, profile, user])

    const handleChange = (event) => {
        const { name, value } = event.target
        setForm((current) => ({
            ...current,
            [name]: value,
        }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')

        const email = form.email.trim().toLowerCase()
        const password = form.password

        if (!email || !password) {
            setError('Email and password are required.')
            return
        }

        if (!isCollegeEmail(email)) {
            setError(`Only @${allowedDomain} email addresses are allowed.`)
            return
        }

        if (mode === 'signup' && password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }

        setBusy(true)

        try {
            const userCredential =
                mode === 'signup'
                    ? await signUpWithCollegeEmail(email, password)
                    : await loginWithEmail(email, password)

            const latestProfile = await refreshProfile(userCredential.user.uid)
            navigate(latestProfile?.photoUrl ? '/swipe' : '/profile?edit=1', { replace: true })
        } catch (authError) {
            setError(getFriendlyAuthError(authError))
        } finally {
            setBusy(false)
        }
    }

    return (
        <main className="grid min-h-screen place-items-center bg-gray-50 px-4 py-8">
            <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
                <BrandMark className="mb-3" />
                <h1 className="text-2xl font-bold text-gray-900">{mode === 'login' ? 'Login' : 'Sign Up'}</h1>
                <p className="mt-1 text-sm text-gray-500">Only college students allowed.</p>

                <div className="mt-5 inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('login')
                            setError('')
                        }}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === 'login'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('signup')
                            setError('')
                        }}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === 'signup'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">College Email</span>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder={`you@${allowedDomain}`}
                            autoComplete="username"
                            required
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            required
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                        />
                    </label>

                    {error ? (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                            {error}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7a1f2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#651924] disabled:cursor-not-allowed disabled:bg-[#b6808a]"
                    >
                        {busy ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                {mode === 'signup' ? 'Creating account...' : 'Logging in...'}
                            </>
                        ) : mode === 'signup' ? (
                            'Sign Up'
                        ) : (
                            'Login'
                        )}
                    </button>
                </form>
            </section>
        </main>
    )
}
