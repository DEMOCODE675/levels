import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark'

export default function NotFoundPage() {
    return (
        <main className="grid min-h-screen place-items-center bg-gray-50 px-4 py-8">
            <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                <BrandMark className="mb-3 justify-center" />
                <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
                <p className="mt-2 text-sm text-gray-500">That route does not exist in this app.</p>
                <Link
                    className="mt-5 inline-flex rounded-xl bg-[#7a1f2b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#651924]"
                    to="/"
                >
                    Go home
                </Link>
            </section>
        </main>
    )
}
