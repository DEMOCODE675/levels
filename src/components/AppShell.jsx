import BottomNav from './BottomNav'
import BrandMark from './BrandMark'

export default function AppShell({ title, subtitle, children }) {
    return (
        <div className="mx-auto min-h-screen w-full max-w-5xl px-3 pb-24 pt-4 sm:px-4 lg:px-5">
            <header className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
                <BrandMark compact className="mb-1" />
                <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
            </header>

            <main>{children}</main>

            <div className="fixed inset-x-0 bottom-0 z-50">
                <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 lg:px-5">
                    <BottomNav />
                </div>
            </div>
        </div>
    )
}
