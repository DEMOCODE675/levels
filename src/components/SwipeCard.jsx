import {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useState,
} from 'react'
import {
    motion,
    useAnimationControls,
    useMotionValue,
    useTransform,
} from 'framer-motion'

const SWIPE_THRESHOLD = 120
const EXIT_DISTANCE = 560
const MotionArticle = motion.article
const MotionBadge = motion.p

const SwipeCard = forwardRef(function SwipeCard(
    {
        profile,
        busy,
        onSwipe,
        onSwipeComplete,
    },
    ref,
) {
    const controls = useAnimationControls()
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-220, 0, 220], [-10, 0, 10])
    const likeOpacity = useTransform(x, [30, 140], [0, 1])
    const skipOpacity = useTransform(x, [-30, -140], [0, 1])

    const [animating, setAnimating] = useState(false)
    const interests = Array.isArray(profile.interests) ? profile.interests : []
    const visibleInterests = interests.slice(0, 4)
    const extraInterests = interests.length - visibleInterests.length

    const resetCardPosition = useCallback(async () => {
        await controls.start({
            x: 0,
            transition: {
                type: 'spring',
                stiffness: 380,
                damping: 30,
            },
        })
    }, [controls])

    const runSwipe = useCallback(
        async (action) => {
            if (busy || animating) {
                return
            }

            setAnimating(true)

            const wasSaved = await onSwipe(action)

            if (!wasSaved) {
                await resetCardPosition()
                setAnimating(false)
                return
            }

            await controls.start({
                x: action === 'like' ? EXIT_DISTANCE : -EXIT_DISTANCE,
                opacity: 0,
                transition: {
                    duration: 0.22,
                    ease: 'easeOut',
                },
            })

            onSwipeComplete(action)
            controls.set({ x: 0, opacity: 1 })
            setAnimating(false)
        },
        [animating, busy, controls, onSwipe, onSwipeComplete, resetCardPosition],
    )

    useImperativeHandle(
        ref,
        () => ({
            swipe(actionType) {
                void runSwipe(actionType)
            },
        }),
        [runSwipe],
    )

    const handleDragEnd = useCallback(
        async (_, dragInfo) => {
            if (dragInfo.offset.x > SWIPE_THRESHOLD) {
                await runSwipe('like')
                return
            }

            if (dragInfo.offset.x < -SWIPE_THRESHOLD) {
                await runSwipe('skip')
                return
            }

            await resetCardPosition()
        },
        [resetCardPosition, runSwipe],
    )

    return (
        <div className="mx-auto w-full max-w-lg px-1">
            <MotionArticle
                drag="x"
                dragElastic={0.2}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x, rotate }}
                className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm"
            >
                <img
                    src={profile.photoUrl || 'https://placehold.co/720x880?text=No+Photo'}
                    alt={`${profile.name}'s profile`}
                    className="h-[44dvh] min-h-[14rem] max-h-[26rem] w-full bg-gray-100 object-contain sm:h-[50vh] sm:min-h-[18rem] sm:max-h-[34rem]"
                />

                <MotionBadge
                    style={{ opacity: likeOpacity }}
                    className="absolute left-4 top-4 rounded-full bg-[#7a1f2b] px-4 py-1 text-sm font-bold uppercase tracking-[0.16em] text-white"
                >
                    Like
                </MotionBadge>

                <MotionBadge
                    style={{ opacity: skipOpacity }}
                    className="absolute right-4 top-4 rounded-full border border-gray-200 bg-gray-100 px-4 py-1 text-sm font-bold uppercase tracking-[0.16em] text-gray-900"
                >
                    Skip
                </MotionBadge>

                <div className="space-y-2 p-3 sm:space-y-3 sm:p-5">
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{profile.name}</h2>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a1f2b]">
                            {profile.gender || 'Student'}
                        </p>
                    </div>

                    <p
                        className="text-sm leading-relaxed text-gray-500"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {profile.bio || 'No bio yet.'}
                    </p>

                    <div>
                        {visibleInterests.length === 0 ? (
                            <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                                No interests yet
                            </p>
                        ) : (
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7a1f2b]">
                                {visibleInterests.join(' • ')}
                                {extraInterests > 0 ? ` • +${extraInterests}` : ''}
                            </p>
                        )}
                    </div>
                </div>
            </MotionArticle>
        </div>
    )
})

export default SwipeCard
