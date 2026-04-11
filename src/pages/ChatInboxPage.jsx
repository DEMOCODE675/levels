import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import ConversationItem from '../components/ConversationItem'
import { useAuth } from '../hooks/useAuth'
import { notify } from '../lib/notify'
import { subscribeToMatches } from '../services/chatService'

function getTimestampMs(timestamp) {
    if (!timestamp || typeof timestamp.toMillis !== 'function') {
        return 0
    }

    return timestamp.toMillis()
}

function formatRelative(timestamp) {
    const timestampMs = getTimestampMs(timestamp)
    if (!timestampMs) {
        return 'now'
    }

    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000))
    if (diffSeconds < 60) {
        return `${diffSeconds}s ago`
    }

    const minutes = Math.floor(diffSeconds / 60)
    if (minutes < 60) {
        return `${minutes}m ago`
    }

    const hours = Math.floor(minutes / 60)
    if (hours < 24) {
        return `${hours}h ago`
    }

    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

export default function ChatInboxPage() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [matches, setMatches] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!user?.uid) {
            return undefined
        }

        const unsubscribe = subscribeToMatches(
            user.uid,
            (nextMatches) => {
                setMatches(nextMatches)
                setError('')
                setLoading(false)
            },
            (listenerError) => {
                setLoading(false)
                setError(listenerError.message || 'Unable to load chats right now.')
                notify.error(listenerError.message || 'Unable to load chats right now.')
            },
        )

        return () => unsubscribe()
    }, [user?.uid])

    const conversations = useMemo(() => {
        const term = search.trim().toLowerCase()

        return matches
            .map((match) => {
                const partnerId = match.members?.find((memberId) => memberId !== user?.uid)
                const partner = partnerId ? match.memberDetails?.[partnerId] : null
                const partnerName = partner?.name || 'Student'
                const preview = (match.lastMessagePreview || '').trim()

                return {
                    id: match.id,
                    partnerName,
                    partnerPhoto: partner?.photoUrl || 'https://placehold.co/220x220?text=Student',
                    partnerOnline: Boolean(partner?.isOnline),
                    preview: preview || 'No messages yet.',
                    hasConversation: Boolean(preview),
                    timestamp: formatRelative(match.updatedAt),
                }
            })
            .filter((item) => item.hasConversation)
            .filter((item) => {
                if (!term) {
                    return true
                }

                return (
                    item.partnerName.toLowerCase().includes(term) ||
                    item.preview.toLowerCase().includes(term)
                )
            })
    }, [matches, search, user?.uid])

    return (
        <AppShell title="Chat" subtitle="Your active conversations">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Search chats</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name or message"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                    />
                </label>

                {error ? (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {error}
                    </p>
                ) : null}

                {loading ? (
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div key={`chat-skeleton-${index}`} className="animate-pulse rounded-2xl border border-gray-200 bg-gray-100 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-gray-200" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-28 rounded-full bg-gray-200" />
                                        <div className="h-3 w-40 rounded-full bg-gray-50" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {!loading && conversations.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-100 p-6 text-center">
                        <h2 className="text-xl font-bold text-gray-900">No conversations yet</h2>
                        <p className="mt-2 text-sm text-gray-500">When chats start, they will appear here.</p>
                        <Link
                            to="/matches"
                            className="mt-4 inline-flex rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Go to Matches
                        </Link>
                    </div>
                ) : null}

                {!loading && conversations.length > 0 ? (
                    <div className="mt-4 space-y-3">
                        {conversations.map((conversation, index) => (
                            <ConversationItem
                                key={conversation.id}
                                name={conversation.partnerName}
                                photoUrl={conversation.partnerPhoto}
                                preview={conversation.preview}
                                timestamp={conversation.timestamp}
                                hasUnread={false}
                                unreadCount={0}
                                isOnline={conversation.partnerOnline}
                                onOpenChat={() => navigate(`/chat/${conversation.id}`)}
                                index={index}
                            />
                        ))}
                    </div>
                ) : null}
            </section>
        </AppShell>
    )
}
