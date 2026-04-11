export default function BrandMark({
    className = '',
    showName = true,
    compact = false,
}) {
    return (
        <div className={`inline-flex items-center gap-2 ${className}`} aria-label="Levels brand">
            <span
                className={`rounded-full bg-pink-500 shadow-sm ${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}`}
                aria-hidden="true"
            />
            {showName ? (
                <span className={`font-semibold text-gray-900 ${compact ? 'text-xs tracking-wide' : 'text-sm tracking-[0.08em]'}`}>
                    Levels
                </span>
            ) : null}
        </div>
    )
}