import { motion } from 'framer-motion'

const MotionButton = motion.button

export default function ConversationItem({
    name,
    photoUrl,
    preview,
    timestamp,
    hasUnread,
    unreadCount,
    isOnline,
    onOpenChat,
    index,
}) {
    return (
        <MotionButton
            type="button"
            onClick={onOpenChat}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: index * 0.035, ease: 'easeOut' }}
            className={`group w-full rounded-2xl border p-3 text-left shadow-sm transition duration-200 hover:bg-gray-100 ${hasUnread
                ? 'border-gray-200 bg-gray-100'
                : 'border-gray-200 bg-white'
                }`}
        >
            <div className="flex items-center gap-3">
                <span className="relative shrink-0">
                    <img
                        src={photoUrl || 'https://placehold.co/140x140?text=Student'}
                        alt={`${name}'s profile`}
                        className="h-14 w-14 rounded-full border border-gray-200 object-cover"
                    />
                    <span
                        className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white ${isOnline ? 'bg-[#7a1f2b]' : 'bg-gray-300'}`}
                        aria-hidden="true"
                    />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-gray-900">{name}</p>
                        <div className="flex items-center gap-2">
                            {hasUnread ? (
                                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#7a1f2b] px-1 text-[0.62rem] font-bold text-white">
                                    {unreadCount}
                                </span>
                            ) : null}
                            <span className="text-xs font-medium text-gray-500">{timestamp}</span>
                        </div>
                    </div>
                    <p className={`mt-1 truncate text-sm ${hasUnread ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
                        {preview}
                    </p>
                </div>
            </div>
        </MotionButton>
    )
}
