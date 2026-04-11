import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'framer-motion'
import {
    AlertTriangle,
    ArrowLeft,
    Ban,
    MoreVertical,
    SendHorizontal,
    ShieldAlert,
} from 'lucide-react'
import TextareaAutosize from 'react-textarea-autosize'
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
        <motion.div
            layout
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`flex gap-2 ${isMine ? 'justify-end' : ''}`}
        >
            <article
                className={`max-w-[82%] rounded-3xl px-4 py-2.5 shadow-sm sm:max-w-md ${isMine
                    ? 'rounded-br-md bg-[#E11D48] text-white'
                    : 'rounded-bl-md border border-white/70 bg-white text-gray-900'
                    }`}
            >
                <p className="text-sm wrap-break-word">{message.text}</p>
                <p
                    className={`mt-1 text-xs ${isMine ? 'text-red-100' : 'text-gray-500'
                        }`}
                >
                    {formatTimestamp(message.createdAt)}
                </p>
            </article>
        </motion.div>
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
    const [safetyMenuOpen, setSafetyMenuOpen] = useState(false)
    const [keyboardOffset, setKeyboardOffset] = useState(0)
    const [bottomDockHeight, setBottomDockHeight] = useState(96)
    const [isTyping, setIsTyping] = useState(false)
    const [permission, setPermission] = useState(null)
    const [togglingMaleFirst, setTogglingMaleFirst] = useState(false)

    const messagesEndRef = useRef(null)
    const bottomDockRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const textareaRef = useRef(null)

    // Auto scroll to latest message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Keep bottom dock aligned with mobile keyboard using Visual Viewport API.
    useEffect(() => {
        if (!window.visualViewport) {
            setKeyboardOffset(0)
            return undefined
        }

        let rafId = null

        const updateViewportInset = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId)
            }

            rafId = requestAnimationFrame(() => {
                const viewport = window.visualViewport
                if (!viewport) {
                    setKeyboardOffset(0)
                    return
                }

                const overlap = window.innerHeight - viewport.height - viewport.offsetTop
                setKeyboardOffset(Math.max(0, Math.round(overlap)))
            })
        }

        updateViewportInset()
        window.visualViewport.addEventListener('resize', updateViewportInset)
        window.visualViewport.addEventListener('scroll', updateViewportInset)
        window.addEventListener('resize', updateViewportInset)
        window.addEventListener('orientationchange', updateViewportInset)

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateViewportInset)
                window.visualViewport.removeEventListener('scroll', updateViewportInset)
            }

            window.removeEventListener('resize', updateViewportInset)
            window.removeEventListener('orientationchange', updateViewportInset)

            if (rafId !== null) {
                cancelAnimationFrame(rafId)
            }
        }
    }, [])

    // Auto focus input
    useEffect(() => {
        if (!loading && textareaRef.current) {
            setTimeout(() => {
                textareaRef.current?.focus()
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

    const canStartPendingChat =
        match?.status === 'pending' &&
        messages.length === 0 &&
        permission?.canStartChat

    const canShowComposer =
        !loading &&
        match &&
        (messages.length > 0 || match.status === 'unlocked' || (canStartPendingChat && (isFemaleUser ? chatStarted : true))) &&
        permission?.allowed

    const bottomDockStyle = {
        transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    }

    const messageListBottomPadding = Math.max(96, bottomDockHeight + keyboardOffset + 16)

    useEffect(() => {
        const dockElement = bottomDockRef.current

        if (!dockElement) {
            setBottomDockHeight(0)
            return undefined
        }

        const updateDockHeight = () => {
            const nextHeight = dockElement.getBoundingClientRect().height
            setBottomDockHeight(Math.ceil(nextHeight))
        }

        updateDockHeight()

        if (typeof ResizeObserver === 'undefined') {
            return undefined
        }

        const observer = new ResizeObserver(updateDockHeight)
        observer.observe(dockElement)

        return () => {
            observer.disconnect()
        }
    }, [femaleCanStartChat, chatStarted, waitingForFemaleFirstMessage, canShowComposer, permission?.allowed, canStartPendingChat, isFemaleUser])

    useEffect(() => {
        if (keyboardOffset > 0) {
            scrollToBottom()
        }
    }, [keyboardOffset])

    const handleSendMessage = async (event) => {
        event.preventDefault()
        setError('')
        setActionMessage('')

        if (!permission?.allowed) {
            const blockedReason = permission?.reason || 'Cannot send messages right now.'
            setError(blockedReason)
            notify.error(blockedReason)
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
        <div className="fixed inset-0 flex h-screen w-full flex-col bg-[radial-gradient(circle_at_top,#ffe4ea_0%,#f9fafb_45%,#f3f4f6_100%)]">
            {/* Header */}
            <header className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200/80 bg-white/90 px-4 py-3 backdrop-blur">
                <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 flex-1">
                        <Link
                            to="/matches"
                            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
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
                    <DropdownMenu.Root open={safetyMenuOpen} onOpenChange={setSafetyMenuOpen}>
                        <DropdownMenu.Trigger asChild>
                            <button
                                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 transition hover:bg-gray-50"
                                title="Open chat controls"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                align="end"
                                sideOffset={8}
                                className="z-50 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl outline-none"
                            >
                                {isFemaleUser && match?.status === 'pending' && (
                                    <div className="mb-3 border-b border-gray-200 pb-3">
                                        <h3 className="mb-2 text-sm font-bold text-gray-900">Chat Control</h3>
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={allowMaleFirst}
                                                onChange={handleToggleMaleFirst}
                                                disabled={togglingMaleFirst}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <span className="text-xs font-medium text-gray-700">
                                                Let him message first
                                            </span>
                                        </label>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {allowMaleFirst
                                                ? 'He can now start the conversation'
                                                : 'Only you can send the first message'}
                                        </p>
                                    </div>
                                )}

                                <div className="mb-3 flex items-center gap-2 text-gray-900">
                                    <ShieldAlert className="h-4 w-4" />
                                    <h3 className="text-sm font-bold">Safety</h3>
                                </div>

                                <label className="mb-3 block">
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
                                            setSafetyMenuOpen(false)
                                        }}
                                        disabled={busy || !reportReason.trim()}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Report user
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleBlock()
                                            setSafetyMenuOpen(false)
                                        }}
                                        disabled={busy}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Ban className="h-3.5 w-3.5" />
                                        Block user
                                    </button>
                                </div>

                                {error ? (
                                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                        {error}
                                    </p>
                                ) : null}
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </div>
            </header>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className="mx-auto w-full max-w-5xl flex-1 space-y-3 overflow-y-auto px-4 pt-20"
                style={{ paddingBottom: `${messageListBottomPadding}px` }}
            >
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="rounded-2xl border border-gray-200/80 bg-white/80 px-4 py-2 text-center text-sm text-gray-500 shadow-sm">
                            {waitingForFemaleFirstMessage
                                ? 'Waiting for her to start...'
                                : 'No messages yet. Start the conversation!'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="sticky top-0 z-10 flex justify-center pb-1 pt-1">
                            <span className="rounded-full border border-gray-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 shadow-sm backdrop-blur">
                                Today
                            </span>
                        </div>
                        <AnimatePresence initial={false}>
                            {messages.map((message) => {
                                const isMine = message.senderId === user.uid
                                return (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        isMine={isMine}
                                        user={user}
                                    />
                                )
                            })}
                        </AnimatePresence>
                    </>
                )}

                {/* Typing indicator */}
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2"
                    >
                        <div className="flex space-x-1 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm">
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {femaleCanStartChat && !chatStarted ? (
                <div
                    ref={bottomDockRef}
                    className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40"
                    style={bottomDockStyle}
                >
                    <button
                        type="button"
                        onClick={() => setChatStarted(true)}
                        className="w-full rounded-xl bg-[#E11D48] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#BE123C]"
                    >
                        Start Chat
                    </button>
                </div>
            ) : permission && !permission.allowed && waitingForFemaleFirstMessage ? (
                <div
                    ref={bottomDockRef}
                    className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40"
                    style={bottomDockStyle}
                >
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
                    ref={bottomDockRef}
                    onSubmit={handleSendMessage}
                    className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-3"
                    style={bottomDockStyle}
                >
                    <div className="flex items-end gap-2 max-w-5xl mx-auto">
                        <TextareaAutosize
                            ref={textareaRef}
                            value={draft}
                            onChange={handleTypingChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            minRows={1}
                            maxRows={4}
                            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E11D48] focus:ring-2 focus:ring-red-100"
                        />
                        <button
                            className="rounded-full bg-[#E11D48] p-3 text-white transition hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:bg-gray-300 shrink-0"
                            type="submit"
                            disabled={busy || !draft.trim()}
                            title="Send message"
                        >
                            <SendHorizontal className="h-5 w-5" />
                        </button>
                    </div>
                </form>
            ) : permission && !permission.allowed ? (
                <div
                    ref={bottomDockRef}
                    className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40"
                    style={bottomDockStyle}
                >
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