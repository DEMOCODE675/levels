import { NavLink } from 'react-router-dom'

function HomeIcon({ active }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${active ? 'text-[#7a1f2b]' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.5 10.5V20h13V10.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function MatchesIcon({ active }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${active ? 'text-[#7a1f2b]' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                d="M12 20s-6.2-3.8-8.3-7A4.8 4.8 0 0 1 11 7.4L12 8.6l1-1.2A4.8 4.8 0 0 1 20.3 13C18.2 16.2 12 20 12 20Z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function ChatIcon({ active }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${active ? 'text-[#7a1f2b]' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v6.4a2.8 2.8 0 0 1-2.8 2.8H11l-4.5 4v-4H6.8A2.8 2.8 0 0 1 4 13.2V6.8Z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function ProfileIcon({ active }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${active ? 'text-[#7a1f2b]' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5 19a7 7 0 0 1 14 0" strokeLinecap="round" />
        </svg>
    )
}

const navItems = [
    { to: '/swipe', label: 'Home', icon: HomeIcon },
    { to: '/matches', label: 'Matches', icon: MatchesIcon },
    { to: '/chat', label: 'Chat', icon: ChatIcon },
    { to: '/profile', label: 'Profile', icon: ProfileIcon },
]

export default function BottomNav() {
    return (
        <nav aria-label="Bottom navigation" className="h-16 shrink-0 border-t border-gray-200 bg-white">
            <div className="mx-auto grid h-full w-full max-w-lg grid-cols-4 px-3 pb-2 pt-1">
                {navItems.map((item) => {
                    const Icon = item.icon

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `mx-1 flex flex-col items-center justify-center gap-1 rounded-full px-2 py-1 text-[0.72rem] font-semibold transition-colors ${isActive ? 'text-[#7a1f2b]' : 'text-gray-500 hover:text-[#7a1f2b]'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon active={isActive} />
                                    <span>{item.label}</span>
                                    <span
                                        className={`h-1 w-1 rounded-full ${isActive ? 'bg-[#7a1f2b]' : 'bg-transparent'}`}
                                        aria-hidden="true"
                                    />
                                </>
                            )}
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}