export default function SkeletonLoading({ type = 'table', count = 3 }) {
    if (type === 'cards') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-slate-200 h-28 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    if (type === 'chart') {
        return (
            <div className="bg-slate-200 h-80 rounded-2xl animate-pulse w-full"></div>
        );
    }

    return (
        <div className="space-y-4 animate-pulse">
            {Array(count).fill(0).map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 rounded-lg w-full"></div>
            ))}
        </div>
    );
}
