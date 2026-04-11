import { useCallback, useEffect, useMemo, useState } from 'react'
import BottomNav from '../components/BottomNav'
import SwipeCard from '../components/SwipeCard'
import SwipeHeader from '../components/SwipeHeader'
import { useAuth } from '../hooks/useAuth'
import { notify } from '../lib/notify'
import { getSwipeCandidates, swipeOnUser } from '../services/swipeService'

export default function SwipePage() {
    const { user } = useAuth()

    const [candidates, setCandidates] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [matchPopup, setMatchPopup] = useState(null)

    const loadCandidates = useCallback(async () => {
        if (!user?.uid) {
            return
        }

        setLoading(true)
        setError('')

        try {
            const nextCandidates = await getSwipeCandidates(user.uid)
            setCandidates(nextCandidates)
            setCurrentIndex(0)
        } catch (candidateError) {
            setError(candidateError.message || 'Unable to load profiles right now.')
            notify.error(candidateError.message || 'Unable to load profiles right now.')
        } finally {
            setLoading(false)
        }
    }, [user?.uid])

    useEffect(() => {
        loadCandidates()
    }, [loadCandidates])

    useEffect(() => {
        if (!matchPopup) {
            return
        }

        const timer = setTimeout(() => {
            setMatchPopup(null)
        }, 2200)

        return () => clearTimeout(timer)
    }, [matchPopup])

    const currentCandidate = useMemo(
        () => candidates[currentIndex] || null,
        [candidates, currentIndex],
    )

    const handleSwipe = async (action) => {
        if (!currentCandidate || !user?.uid) {
            return false
        }

        setBusy(true)
        setError('')

        try {
            const swipeResult = await swipeOnUser({
                fromUserId: user.uid,
                toUserId: currentCandidate.id,
                action,
            })

            if (swipeResult.matched) {
                setMatchPopup({
                    name: currentCandidate.name || 'your new connection',
                    matchId: swipeResult.matchId,
                })
            }

            return true
        } catch (swipeError) {
            setError(swipeError.message || 'Swipe failed. Please try again.')
            notify.error(swipeError.message || 'Swipe failed. Please try again.')
            return false
        } finally {
            setBusy(false)
        }
    }

    const handleSwipeComplete = () => {
        setCurrentIndex((indexValue) => indexValue + 1)
    }

    return (
        <div className="h-screen min-h-[100dvh] overflow-hidden">
            <div className="mx-auto flex h-full w-full max-w-lg flex-col">
                <SwipeHeader />

                <main className="relative flex-1 overflow-y-auto">
                    <div className="flex min-h-full flex-col items-center justify-start px-3 pb-16 pt-2 sm:pb-20 sm:pt-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 sm:mb-2">
                            Drag left or right
                        </p>

                        {error ? (
                            <p className="mb-2 text-center text-xs font-semibold text-[#7a1f2b]">
                                {error}
                            </p>
                        ) : null}

                        {loading ? (
                            <div className="mb-3 flex justify-center">
                                <svg className="h-8 w-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                        ) : null}

                        {!loading && currentCandidate ? (
                            <SwipeCard
                                profile={currentCandidate}
                                busy={busy}
                                onSwipe={handleSwipe}
                                onSwipeComplete={handleSwipeComplete}
                            />
                        ) : null}

                        {!loading && !currentCandidate ? (
                            <div className="mt-1 text-center">
                                <h2 className="text-xl font-bold text-gray-900">No more profiles</h2>
                                <p className="mt-1 text-sm text-gray-500">New people will appear soon.</p>
                            </div>
                        ) : null}
                    </div>

                    {matchPopup ? (
                        <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
                            <p className="rounded-full bg-[#7a1f2b] px-4 py-2 text-xs font-semibold text-white shadow-lg">
                                It is a Match with {matchPopup.name}
                            </p>
                        </div>
                    ) : null}
                </main>

                <BottomNav />
            </div>
        </div>
    )
}
