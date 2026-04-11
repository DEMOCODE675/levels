import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../hooks/useAuth'
import { notify } from '../lib/notify'
import { reportUser } from '../services/chatService'
import {
    DEFAULT_USER_SETTINGS,
    saveUserSettings,
    subscribeToBlockedUsers,
    subscribeToUserSettings,
} from '../services/settingsService'

export default function SettingsPage() {
    const { user, signOutCurrentUser } = useAuth()
    const navigate = useNavigate()

    const [settings, setSettings] = useState(DEFAULT_USER_SETTINGS)
    const [blockedUsers, setBlockedUsers] = useState([])
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [loadingBlocked, setLoadingBlocked] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!user?.uid) {
            return undefined
        }

        const unsubscribeSettings = subscribeToUserSettings(
            user.uid,
            (nextSettings) => {
                setSettings(nextSettings)
                setLoadingSettings(false)
            },
            (settingsError) => {
                setLoadingSettings(false)
                setError(settingsError.message || 'Unable to load settings.')
            },
        )

        const unsubscribeBlocked = subscribeToBlockedUsers(
            user.uid,
            (nextBlockedUsers) => {
                setBlockedUsers(nextBlockedUsers)
                setLoadingBlocked(false)
            },
            (blockedError) => {
                setLoadingBlocked(false)
                setError(blockedError.message || 'Unable to load blocked users.')
            },
        )

        return () => {
            unsubscribeSettings()
            unsubscribeBlocked()
        }
    }, [user?.uid])

    const handleToggle = async (fieldName) => {
        if (!user?.uid || saving) {
            return
        }

        setSaving(true)
        setError('')

        const nextSettings = {
            ...settings,
            [fieldName]: !settings[fieldName],
        }

        setSettings(nextSettings)

        try {
            await saveUserSettings(user.uid, nextSettings)
            notify.success('Settings saved.')
        } catch (saveError) {
            setError(saveError.message || 'Unable to save settings.')
            notify.error(saveError.message || 'Unable to save settings.')
        } finally {
            setSaving(false)
        }
    }

    const handleQuickReport = async (blockedUser) => {
        if (!user?.uid) {
            return
        }

        try {
            await reportUser({
                reporterId: user.uid,
                reportedUserId: blockedUser.blockedUserId,
                matchId: blockedUser.matchId,
                reason: 'Safety concern from settings page',
            })
            notify.success('Report submitted.')
        } catch (reportError) {
            notify.error(reportError.message || 'Unable to report this user.')
        }
    }

    const handleLogout = async () => {
        await signOutCurrentUser()
        navigate('/auth', { replace: true })
    }

    return (
        <AppShell title="Settings" subtitle="Safety and privacy controls">
            <section className="space-y-4">
                <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                    <h2 className="text-lg font-bold text-gray-900">Safety Options</h2>
                    <div className="mt-4 space-y-3">
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Only girls message first</p>
                                <p className="text-xs text-gray-500">Enable female-first first-message rule for pending matches.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggle('onlyGirlsMessageFirst')}
                                disabled={saving || loadingSettings}
                                className={`h-7 w-12 rounded-full p-1 transition ${settings.onlyGirlsMessageFirst ? 'bg-[#7a1f2b]' : 'bg-gray-300'}`}
                            >
                                <span className={`block h-5 w-5 rounded-full bg-white transition ${settings.onlyGirlsMessageFirst ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </label>

                        <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Private profile</p>
                                <p className="text-xs text-gray-500">Hide profile from swipe feed until you disable this setting.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggle('privateProfile')}
                                disabled={saving || loadingSettings}
                                className={`h-7 w-12 rounded-full p-1 transition ${settings.privateProfile ? 'bg-[#7a1f2b]' : 'bg-gray-300'}`}
                            >
                                <span className={`block h-5 w-5 rounded-full bg-white transition ${settings.privateProfile ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </label>
                    </div>
                </article>

                <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                    <h2 className="text-lg font-bold text-gray-900">Blocked Users</h2>

                    {loadingBlocked ? (
                        <div className="mt-6 flex justify-center">
                            <svg className="h-8 w-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : null}

                    {!loadingBlocked && blockedUsers.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-500">No blocked users.</p>
                    ) : null}

                    {!loadingBlocked && blockedUsers.length > 0 ? (
                        <ul className="mt-4 space-y-3">
                            {blockedUsers.map((blockedUser) => (
                                <li key={blockedUser.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={blockedUser.blockedUserPhotoUrl || 'https://placehold.co/120x120?text=User'}
                                            alt={blockedUser.blockedUserName}
                                            className="h-11 w-11 rounded-full border border-gray-200 object-cover"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{blockedUser.blockedUserName}</p>
                                            <p className="text-xs text-gray-500">{blockedUser.blockedUserId}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleQuickReport(blockedUser)}
                                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Report user
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </article>

                <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        Logout
                    </button>
                </article>

                {error ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {error}
                    </p>
                ) : null}
            </section>
        </AppShell>
    )
}
