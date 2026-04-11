import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { notify } from '../lib/notify'
import {
    blockUser,
    getMessagePermission,
    reportUser,
    sendMessage,
    subscribeToMatch,
    subscribeToMessages,
} from '../services/chatService'
import { toggleAllowMaleFirst, cleanupExpiredMatches } from '../services/matchService'
import BrandMark from '../components/BrandMark'

function ThreeDotIcon() {
    return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8H9.5V10H10.5V8ZM10.5 14.5H9.5V16.5H10.5V14.5Z" />
        </svg>
    )
}

function SendIcon() {
    return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16142766 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.4953874 C0.994623095,2.08026972 0.837654326,3.0228539 1.15159189,3.8083408 L3.03521743,10.2493339 C3.03521743,10.4064313 3.34915502,10.5635286 3.50612381,10.5635286 L16.6915026,11.3490155 C16.6915026,11.3490155 17.1624089,11.3490155 17.1624089,10.8777233 L17.1624089,12.0031671 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
        </svg>
    )
}

function formatTimestamp(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return 'now'
    }

    return timestamp.toDate().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function MessageBubble({ message, isMine }) {
    return (
        <div className={`flex gap-2 animate-fade-in ${isMine ? 'flex-row-reverse' : ''}`}>
            <article
                className={`max-w-xs px-4 py-2 rounded-2xl ${isMine
                    ? 'bg-[#E11D48] text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
            >
                <p className="text-sm break-words">{message.text}</p>
                <p
                    className={`mt-1 text-xs ${isMine ? 'text-red-100' : 'text-gray-500'
                        }`}
                >
                    {formatTimestamp(message.createdAt)}
                </p>
            </article>
        </div>
    )
}

export default function ChatPage() {
    const { matchId } = useParams()
    const { user } = useAuth()

    const [match, setMatch] = useState(null)
    const [messages, setMessages] = useState([])
    const [draft, setDraft] = useState('')
    const [reportReason, setReportReason] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [_actionMessage, setActionMessage] = useState('')
    const [chatStarted, setChatStarted] = useState(false)
    const [showSafetyMenu, setShowSafetyMenu] = useState(false)
    const [keyboardHeight, setKeyboardHeight] = useState(0)
    const [isTyping, setIsTyping] = useState(false)
    const [permission, setPermission] = useState(null)
    const [togglingMaleFirst, setTogglingMaleFirst] = useState(false)

    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const textareaRef = useRef(null)

    // Auto scroll to latest message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Handle keyboard visibility on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                const viewportHeight = window.visualViewport.height
                const screenHeight = window.screen.height
                const keyboardHeight = screenHeight - viewportHeight
                setKeyboardHeight(Math.max(0, keyboardHeight))
            }
        }

        window.addEventListener('resize', handleResize)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize)
        }

        return () => {
            window.removeEventListener('resize', handleResize)
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize)
            }
        }
    }, [])

    // Auto focus input
    useEffect(() => {
        if (!loading && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 300)
        }
    }, [loading])

    // Subscribe to messages
    useEffect(() => {
        if (!matchId || !user?.uid) {
            return undefined
        }

        const unsubscribeMatch = subscribeToMatch(
            matchId,
            (nextMatch) => {
                setMatch(nextMatch)
                setLoading(false)
            },
            (listenerError) => {
                setLoading(false)
                setError(listenerError.message || 'Unable to load this conversation.')
            },
        )

        const unsubscribeMessages = subscribeToMessages(
            matchId,
            (nextMessages) => {
                setMessages(nextMessages)
            },
            (listenerError) => {
                setError(listenerError.message || 'Unable to load messages right now.')
            },
        )

        return () => {
            unsubscribeMatch()
            unsubscribeMessages()
        }
    }, [matchId, user?.uid])

    // Cleanup expired matches on load
    useEffect(() => {
        if (user?.uid) {
            cleanupExpiredMatches(user.uid).catch((err) => {
                console.error('Cleanup expired matches error:', err)
            })
        }
    }, [user?.uid])

    // Calculate permission whenever match changes
    useEffect(() => {
        if (match && user?.uid) {
            setPermission(getMessagePermission(match, user.uid))
        }
    }, [match, user?.uid])

    const partnerId = useMemo(() => {
        if (!match?.members || !user?.uid) {
            return null
        }

        return match.members.find((memberId) => memberId !== user.uid) || null
    }, [match?.members, user?.uid])

    const partner = partnerId ? match?.memberDetails?.[partnerId] : null

    const isFemaleUser = match?.femaleUserId === user?.uid
    const allowMaleFirst = match?.allowMaleFirst || false

    const waitingForFemaleFirstMessage =
        match?.status === 'pending' &&
        messages.length === 0 &&
        match.femaleUserId &&
        match.femaleUserId !== user?.uid &&
        !allowMaleFirst

    const femaleCanStartChat =
        match?.status === 'pending' &&
        messages.length === 0 &&
        match.femaleUserId === user?.uid

    const canShowComposer =
        !loading &&
        match &&
        (messages.length > 0 || match.status === 'unlocked' || (femaleCanStartChat && chatStarted)) &&
        permission.allowed

    const handleSendMessage = async (event) => {
        event.preventDefault()
        setError('')
        setActionMessage('')

        if (!permission.allowed) {
            setError(permission.reason)
            notify.error(permission.reason)
            return
        }

        if (!draft.trim()) {
            return
        }

        setBusy(true)

        try {
            await sendMessage({
                matchId,
                senderId: user.uid,
                text: draft,
            })
            setDraft('')
            setChatStarted(true)
            setTimeout(() => {
                textareaRef.current?.focus()
            }, 0)
        } catch (sendError) {
            setError(sendError.message || 'Failed to send message.')
            notify.error(sendError.message || 'Failed to send message.')
        } finally {
            setBusy(false)
        }
    }

    const handleKeyDown = (event) => {
        // Send on Enter (desktop), but allow Shift+Enter for new line
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSendMessage(event)
        }
    }

    const handleTypingChange = (event) => {
        setDraft(event.target.value)
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 1000)
    }

    const handleReport = async () => {
        if (!partnerId) {
            return
        }

        setBusy(true)
        setError('')
        setActionMessage('')

        try {
            await reportUser({
                reporterId: user.uid,
                reportedUserId: partnerId,
                matchId,
                reason: reportReason,
            })
            setReportReason('')
            setActionMessage('Report submitted.')
            notify.success('Report submitted.')
        } catch (reportError) {
            setError(reportError.message || 'Unable to submit report.')
            notify.error(reportError.message || 'Unable to submit report.')
        } finally {
            setBusy(false)
        }
    }

    const handleBlock = async () => {
        if (!partnerId) {
            return
        }

        const confirmed = window.confirm(
            'Block this user? You will no longer be able to message each other.',
        )

        if (!confirmed) {
            return
        }

        setBusy(true)
        setError('')
        setActionMessage('')

        try {
            await blockUser({
                blockerId: user.uid,
                blockedUserId: partnerId,
                matchId,
            })
            setActionMessage('User blocked. Chat disabled for this match.')
            notify.success('User blocked.')
        } catch (blockError) {
            setError(blockError.message || 'Unable to block this user.')
            notify.error(blockError.message || 'Unable to block this user.')
        } finally {
            setBusy(false)
        }
    }

    const handleToggleMaleFirst = async () => {
        if (!isFemaleUser) {
            return
        }

        setTogglingMaleFirst(true)
        setError('')

        try {
            await toggleAllowMaleFirst(matchId, user.uid, !allowMaleFirst)
            const newState = !allowMaleFirst
            notify.success(
                newState
                    ? 'He can now message first!'
                    : 'Only you can start the chat again.',
            )
        } catch (toggleError) {
            setError(toggleError.message || 'Unable to change setting.')
            notify.error(toggleError.message || 'Unable to change setting.')
        } finally {
            setTogglingMaleFirst(false)
        }
    }

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white">
                <svg className="h-8 w-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        )
    }

    if (!match) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">This match does not exist.</h2>
                <Link
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    to="/matches"
                >
                    Back to Matches
                </Link>
            </div>
        )
    }

    if (!match.members?.includes(user.uid)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">You cannot access this conversation.</h2>
                <Link
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    to="/matches"
                >
                    Back to Matches
                </Link>
            </div>
        )
    }

    return (
        <div className="h-screen w-full bg-gray-50 flex flex-col fixed inset-0">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-40">
                <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 flex-1">
                        <Link
                            to="/matches"
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            ← Back
                        </Link>
                        <BrandMark compact className="shrink-0" />
                        <img
                            src={partner?.photoUrl || 'https://placehold.co/120x120?text=User'}
                            alt={partner?.name || 'Match profile'}
                            className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{partner?.name || 'Campus match'}</p>
                            <p className="text-xs text-gray-500">
                                {match.status === 'pending' ? 'Pending' : 'Active'}
                            </p>
                        </div>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowSafetyMenu(!showSafetyMenu)}
                            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 transition hover:bg-gray-50"
                        >
                            <ThreeDotIcon />
                        </button>
                        {showSafetyMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-lg z-50 max-h-96 overflow-y-auto">
                                {/* Female-first messaging toggle */}
                                {isFemaleUser && match?.status === 'pending' && (
                                    <>
                                        <div className="mb-3 pb-3 border-b border-gray-200">
                                            <h3 className="text-sm font-bold text-gray-900 mb-2">Chat Control</h3>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={allowMaleFirst}
                                                    onChange={handleToggleMaleFirst}
                                                    disabled={togglingMaleFirst}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="text-xs font-medium text-gray-700">
                                                    Let him message first
                                                </span>
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {allowMaleFirst
                                                    ? 'He can now start the conversation'
                                                    : 'Only you can send the first message'}
                                            </p>
                                        </div>
                                    </>
                                )}

                                <h3 className="text-sm font-bold text-gray-900 mb-3">Safety</h3>

                                <label className="block mb-3">
                                    <span className="mb-1.5 block text-xs font-semibold text-gray-500">Report reason</span>
                                    <input
                                        value={reportReason}
                                        onChange={(event) => setReportReason(event.target.value)}
                                        placeholder="Reason for report"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                                    />
                                </label>

                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleReport()
                                            setShowSafetyMenu(false)
                                        }}
                                        disabled={busy || !reportReason.trim()}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Report user
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleBlock()
                                            setShowSafetyMenu(false)
                                        }}
                                        disabled={busy}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Block user
                                    </button>
                                </div>

                                {error ? (
                                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                        {error}
                                    </p>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto pt-20 pb-48 px-4 max-w-5xl mx-auto w-full space-y-3"
            >
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-center text-sm text-gray-500">
                            {waitingForFemaleFirstMessage
                                ? 'Waiting for her to start...'
                                : 'No messages yet. Start the conversation!'}
                        </p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isMine = message.senderId === user.uid
                        return (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isMine={isMine}
                                user={user}
                            />
                        )
                    })
                )}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="flex gap-2">
                        <div className="space-x-1 flex">
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {femaleCanStartChat && !chatStarted ? (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
                    <button
                        type="button"
                        onClick={() => setChatStarted(true)}
                        className="w-full rounded-xl bg-[#E11D48] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#BE123C]"
                    >
                        Start Chat
                    </button>
                </div>
            ) : permission && !permission.allowed && waitingForFemaleFirstMessage ? (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
                    <div className="max-w-5xl mx-auto rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-center">
                        <p className="text-sm font-medium text-blue-900">
                            ⏳ Waiting for her to start the conversation...
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                            She has 24 hours to send the first message
                        </p>
                    </div>
                </div>
            ) : canShowComposer ? (
                <form
                    ref={inputRef}
                    onSubmit={handleSendMessage}
                    className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40"
                    style={{ paddingBottom: `${12 + keyboardHeight}px` }}
                >
                    <div className="flex items-end gap-2 max-w-5xl mx-auto">
                        <textarea
                            ref={textareaRef}
                            value={draft}
                            onChange={handleTypingChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="flex-1 max-h-24 resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E11D48] focus:ring-2 focus:ring-red-100 focus:ring-opacity-50"
                            style={{
                                minHeight: '44px',
                                overflow: draft.split('\n').length > 3 ? 'auto' : 'hidden',
                            }}
                        />
                        <button
                            className="rounded-full bg-[#E11D48] p-3 text-white transition hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:bg-gray-300 flex-shrink-0"
                            type="submit"
                            disabled={busy || !draft.trim()}
                            title="Send message"
                        >
                            <SendIcon />
                        </button>
                    </div>
                </form>
            ) : permission && !permission.allowed ? (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
                    <div className="max-w-5xl mx-auto rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center">
                        <p className="text-sm font-medium text-red-900">
                            {permission.reason || 'Cannot send messages at this time'}
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    )
}