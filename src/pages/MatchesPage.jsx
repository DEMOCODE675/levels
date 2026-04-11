import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import ConversationItem from '../components/ConversationItem'
import MatchAvatar from '../components/MatchAvatar'
import { useAuth } from '../hooks/useAuth'
import { notify } from '../lib/notify'
import { subscribeToMatches } from '../services/chatService'

const OPENED_MATCHES_STORAGE_KEY = 'bubbles_opened_matches_v1'

function getTimestampMs(timestamp) {
    if (!timestamp || typeof timestamp.toMillis !== 'function') {
        return 0
    }

    return timestamp.toMillis()
}

function getRelativeTimestamp(timestamp) {
    const timestampMs = getTimestampMs(timestamp)

    if (!timestampMs) {
        return 'now'
    }

    const seconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000))

    if (seconds < 60) {
        return `${seconds}s ago`
    }

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) {
        return `${minutes}m ago`
    }

    const hours = Math.floor(minutes / 60)
    if (hours < 24) {
        return `${hours}h ago`
    }

    const days = Math.floor(hours / 24)
    if (days < 7) {
        return `${days}d ago`
    }

    return new Date(timestampMs).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    })
}

function readOpenedMatchMap() {
    if (typeof window === 'undefined') {
        return {}
    }

    try {
        const rawValue = localStorage.getItem(OPENED_MATCHES_STORAGE_KEY)
        if (!rawValue) {
            return {}
        }

        const parsedValue = JSON.parse(rawValue)
        return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
    } catch {
        return {}
    }
}

function writeOpenedMatchMap(openedMap) {
    if (typeof window === 'undefined') {
        return
    }

    localStorage.setItem(OPENED_MATCHES_STORAGE_KEY, JSON.stringify(openedMap))
}

function getStartChatConfig(match, currentUserId) {
    if (match.status === 'blocked') {
        return {
            label: 'Blocked',
            disabled: true,
            hint: 'This match is blocked.',
        }
    }

    if (!match.lastMessagePreview && match.status === 'pending') {
        if (match.femaleUserId === currentUserId) {
            return {
                label: 'Start Chat',
                disabled: false,
                hint: 'You can send the first message.',
            }
        }

        return {
            label: 'Waiting...',
            disabled: true,
            hint: 'Waiting for her to start the chat.',
        }
    }

    return {
        label: 'Open Chat',
        disabled: false,
        hint: 'Continue your conversation.',
    }
}

function AvatarSkeleton() {
    return (
        <div className="w-30 shrink-0 animate-pulse">
            <div className="mx-auto h-20 w-20 rounded-full bg-gray-200" />
            <div className="mx-auto mt-3 h-3 w-16 rounded-full bg-gray-200" />
            <div className="mx-auto mt-2 h-8 w-full rounded-xl bg-gray-50" />
        </div>
    )
}

function ConversationSkeleton() {
    return (
        <div className="animate-pulse rounded-2xl border border-gray-200 bg-gray-100 p-3">
            <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded-full bg-gray-200" />
                    <div className="h-3 w-40 rounded-full bg-gray-50" />
                </div>
                <div className="h-3 w-12 rounded-full bg-gray-50" />
            </div>
        </div>
    )
}

export default function MatchesPage() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [matches, setMatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [openedMatches, setOpenedMatches] = useState(() => readOpenedMatchMap())

    const markMatchOpened = (matchId) => {
        setOpenedMatches((previousOpened) => {
            const nextOpened = {
                ...previousOpened,
                [matchId]: Date.now(),
            }

            writeOpenedMatchMap(nextOpened)
            return nextOpened
        })
    }

    const handleOpenChat = (matchId) => {
        markMatchOpened(matchId)
        navigate(`/chat/${matchId}`)
    }

    useEffect(() => {
        if (!user?.uid) {
            return undefined
        }

        const unsubscribe = subscribeToMatches(
            user.uid,
            (updatedMatches) => {
                setMatches(updatedMatches)
                setError('')
                setLoading(false)
            },
            (listenerError) => {
                setLoading(false)
                setError(listenerError.message || 'Unable to load matches right now.')
                notify.error(listenerError.message || 'Unable to load matches right now.')
            },
        )

        return () => unsubscribe()
    }, [user?.uid])

    const filteredMatches = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase()

        return matches
            .map((match) => {
                const partnerId = match.members?.find((memberId) => memberId !== user?.uid)
                const partner = partnerId ? match.memberDetails?.[partnerId] : null
                const partnerName = partner?.name || 'Student'
                const preview = (match.lastMessagePreview || '').trim()
                const hasConversation = Boolean(preview)
                const openedAt = openedMatches[match.id] || 0
                const updatedAtMs = getTimestampMs(match.updatedAt)

                const isUnopened = openedAt === 0
                const hasUnread = hasConversation && (isUnopened || updatedAtMs > openedAt)
                const action = getStartChatConfig(match, user?.uid)

                return {
                    ...match,
                    partnerName,
                    partnerPhoto: partner?.photoUrl || 'https://placehold.co/220x220?text=Student',
                    partnerOnline: Boolean(partner?.isOnline),
                    preview: preview || 'No messages yet.',
                    hasConversation,
                    hasUnread,
                    isUnopened,
                    timestampLabel: getRelativeTimestamp(match.updatedAt),
                    actionLabel: action.label,
                    actionDisabled: action.disabled,
                    actionHint: action.hint,
                }
            })
            .filter((match) => {
                if (!normalizedSearch) {
                    return true
                }

                return (
                    match.partnerName.toLowerCase().includes(normalizedSearch) ||
                    match.preview.toLowerCase().includes(normalizedSearch)
                )
            })
    }, [matches, openedMatches, search, user?.uid])

    const newMatches = useMemo(
        () => filteredMatches.filter((match) => !match.hasConversation),
        [filteredMatches],
    )

    const conversations = useMemo(
        () => filteredMatches.filter((match) => match.hasConversation),
        [filteredMatches],
    )

    return (
        <AppShell title="Matches" subtitle="New matches and active conversations">
            <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                <header className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-900 md:text-2xl">Your Matches</h2>
                            <p className="text-sm text-gray-500">Find new connections and continue chats.</p>
                        </div>
                        <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                            {filteredMatches.length} total
                        </span>
                    </div>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Search</span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by name or message"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                        />
                    </label>
                </header>

                {error ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {error}
                    </p>
                ) : null}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <svg className="h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                ) : null}

                {!loading && matches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-100 px-6 py-10 text-center">
                        <h3 className="text-2xl font-bold text-gray-900">No matches yet</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                            Keep swiping and your mutual likes will appear here.
                        </p>
                        <Link
                            className="mt-5 inline-flex rounded-xl bg-[#7a1f2b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#651924]"
                            to="/swipe"
                        >
                            Go to Swipe
                        </Link>
                    </div>
                ) : null}

                {!loading && matches.length > 0 && filteredMatches.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-100 p-5 text-center text-sm font-medium text-gray-500">
                        No matches found for this search.
                    </div>
                ) : null}

                {!loading && filteredMatches.length > 0 ? (
                    <div className="space-y-7">
                        <section className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-lg font-bold text-gray-900">New Matches</h3>
                                <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                    {newMatches.length}
                                </span>
                            </div>

                            {newMatches.length === 0 ? (
                                <p className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500">
                                    No new matches right now.
                                </p>
                            ) : (
                                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-1">
                                    {newMatches.map((match, index) => (
                                        <MatchAvatar
                                            key={match.id}
                                            name={match.partnerName}
                                            photoUrl={match.partnerPhoto}
                                            hasNewIndicator={match.isUnopened}
                                            hasUnread={match.hasUnread}
                                            isOnline={match.partnerOnline}
                                            actionLabel={match.actionLabel}
                                            actionDisabled={match.actionDisabled}
                                            actionHint={match.actionHint}
                                            onOpenChat={() => handleOpenChat(match.id)}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-lg font-bold text-gray-900">Conversations</h3>
                                <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                    {conversations.length}
                                </span>
                            </div>

                            {conversations.length === 0 ? (
                                <p className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500">
                                    Start a chat with a new match to see conversations here.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {conversations.map((match, index) => (
                                        <ConversationItem
                                            key={match.id}
                                            name={match.partnerName}
                                            photoUrl={match.partnerPhoto}
                                            preview={match.preview}
                                            timestamp={match.timestampLabel}
                                            hasUnread={match.hasUnread}
                                            unreadCount={match.hasUnread ? 1 : 0}
                                            isOnline={match.partnerOnline}
                                            onOpenChat={() => handleOpenChat(match.id)}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                ) : null}
            </section>
        </AppShell>
    )
}
