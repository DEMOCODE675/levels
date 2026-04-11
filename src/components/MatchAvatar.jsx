import { motion } from 'framer-motion'

const MotionArticle = motion.article

export default function MatchAvatar({
    name,
    photoUrl,
    hasNewIndicator,
    hasUnread,
    isOnline,
    actionLabel,
    actionDisabled,
    actionHint,
    onOpenChat,
    index,
}) {
    return (
        <MotionArticle
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.04, ease: 'easeOut' }}
            className="w-30 shrink-0 snap-start"
        >
            <button
                type="button"
                onClick={onOpenChat}
                className="group flex w-full flex-col items-center text-center"
            >
                <span className="relative inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                    <img
                        src={photoUrl || 'https://placehold.co/180x180?text=Student'}
                        alt={`${name}'s profile`}
                        className="h-20 w-20 rounded-full object-cover transition duration-200 group-hover:scale-[1.03]"
                    />

                    {hasNewIndicator ? (
                        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border border-white bg-[#7a1f2b]" />
                    ) : null}

                    {hasUnread ? (
                        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#7a1f2b] text-[0.62rem] font-bold text-white">
                            1
                        </span>
                    ) : null}

                    <span
                        className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white ${isOnline ? 'bg-[#7a1f2b]' : 'bg-gray-300'}`}
                        aria-hidden="true"
                    />
                </span>

                <span className="mt-2 w-full truncate px-1 text-sm font-semibold text-gray-900">{name}</span>
            </button>

            <button
                type="button"
                onClick={onOpenChat}
                disabled={actionDisabled}
                className={`mt-2 w-full rounded-xl px-2 py-1.5 text-xs font-semibold transition ${actionDisabled
                    ? 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-500'
                    : 'bg-[#7a1f2b] text-white hover:bg-[#651924]'
                    }`}
            >
                {actionLabel}
            </button>

            {actionHint ? (
                <p className="mt-1 px-1 text-center text-[0.68rem] leading-snug text-gray-500">{actionHint}</p>
            ) : null}
        </MotionArticle>
    )
}
