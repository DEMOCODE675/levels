import BrandMark from './BrandMark'

export default function SwipeHeader() {
    return (
        <header className="h-14 shrink-0 border-b border-gray-200 bg-white">
            <div className="mx-auto flex h-full w-full max-w-lg items-center justify-center px-4">
                <BrandMark />
            </div>
        </header>
    )
}