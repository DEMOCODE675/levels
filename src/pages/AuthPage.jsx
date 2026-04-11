import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { continueWithGoogleCollege, getAllowedCollegeDomains } from '../services/authService'
import BrandMark from '../components/BrandMark'

function GoogleIcon() {
    return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path
                d="M21.805 10.023h-9.76v3.955h5.605c-.457 2.55-2.63 3.957-5.605 3.957-3.409 0-6.171-2.82-6.171-6.302s2.762-6.301 6.171-6.301c1.54 0 2.94.594 4.006 1.563l2.826-2.88C17.084 2.312 14.703 1.3 12.045 1.3 6.472 1.3 1.955 5.914 1.955 11.633s4.517 10.334 10.09 10.334c5.826 0 9.662-4.197 9.662-10.103 0-.68-.07-1.19-.202-1.84z"
                fill="#FBBB00"
            />
            <path
                d="M3.119 6.225l3.257 2.447c.88-2.007 2.84-3.34 5.669-3.34 1.54 0 2.94.594 4.006 1.563l2.826-2.88C17.084 2.312 14.703 1.3 12.045 1.3 8.166 1.3 4.792 3.531 3.119 6.225z"
                fill="#EA4335"
            />
            <path
                d="M12.045 21.967c2.591 0 4.942-.979 6.715-2.814l-3.102-2.469c-.88.637-2.012 1.251-3.613 1.251-2.92 0-5.083-1.971-5.593-4.626L3.24 15.82c1.655 3.36 5.042 6.147 8.805 6.147z"
                fill="#34A853"
            />
            <path
                d="M21.805 10.023h-9.76v3.955h5.605c-.218 1.213-.898 2.124-1.992 2.957l3.102 2.469c1.788-1.686 2.947-4.177 2.947-7.77 0-.68-.07-1.19-.202-1.84z"
                fill="#4285F4"
            />
        </svg>
    )
}

function getFriendlyAuthError(error, allowedDomain) {
    const code = error?.code || ''

    if (code === 'auth/popup-closed-by-user') {
        return 'Google sign-in was canceled. Please try again.'
    }

    if (code === 'auth/popup-blocked') {
        return 'Popup was blocked by your browser. Please allow popups and try again.'
    }

    if (code === 'auth/unauthorized-domain') {
        return 'This app domain is not authorized in Firebase Authentication settings.'
    }

    if (code === 'auth/college-domain-required') {
        return `Only @${allowedDomain} Google accounts are allowed.`
    }

    return error?.message || 'Google sign-in failed. Please try again.'
}

export default function AuthPage() {
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

    const handleContinueWithGoogle = async () => {
        setError('')
        setBusy(true)

        try {
            const userCredential = await continueWithGoogleCollege()
            if (!userCredential?.user?.uid) {
                return
            }

            const latestProfile = await refreshProfile(userCredential.user.uid)
            navigate(latestProfile?.photoUrl ? '/swipe' : '/profile?edit=1', { replace: true })
        } catch (authError) {
            setError(getFriendlyAuthError(authError, allowedDomain))
        } finally {
            setBusy(false)
        }
    }

    return (
        <main className="grid min-h-screen place-items-center bg-gray-50 px-4 py-8">
            <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
                <BrandMark className="mb-3" />
                <h1 className="text-2xl font-bold text-gray-900">Continue with Google</h1>
                <p className="mt-1 text-sm text-gray-500">Only @{allowedDomain} college accounts are allowed.</p>

                <button
                    type="button"
                    onClick={handleContinueWithGoogle}
                    disabled={busy}
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {busy ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-700 border-t-transparent" />
                            Connecting Google...
                        </>
                    ) : (
                        <>
                            <GoogleIcon />
                            Continue with Google
                        </>
                    )}
                </button>

                {error ? (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {error}
                    </p>
                ) : null}
            </section>
        </main>
    )
}
