import { useEffect, useState } from 'react';
import api from '../../services/api';

const formatValue = (item) => {
    if (!item.currency) return item.value;
    return `${Number(item.value || 0).toLocaleString('vi-VN')}đ`;
};

const toneClasses = {
    blue: 'border-blue-100 bg-blue-50/70 text-blue-800',
    amber: 'border-amber-100 bg-amber-50/80 text-amber-800',
    rose: 'border-rose-100 bg-rose-50/80 text-rose-800',
    emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-800',
    cyan: 'border-cyan-100 bg-cyan-50/80 text-cyan-800',
    violet: 'border-violet-100 bg-violet-50/80 text-violet-800',
    slate: 'border-slate-100 bg-slate-50 text-slate-800'
};

export default function WorkspaceSummary() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        api.get('/dashboard/workspace')
            .then((res) => setItems(res.data.data || []))
            .catch(() => setItems([]));
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
                <article key={item.label} className={`rounded-2xl border p-5 shadow-sm ${toneClasses[item.tone] || 'border-blue-100 bg-white text-blue-800'}`}>
                    <p className="text-sm font-black uppercase opacity-75">{item.label}</p>
                    <p className="mt-3 text-3xl font-black">{formatValue(item)}</p>
                    {item.helper && <p className="mt-2 text-sm font-semibold opacity-70">{item.helper}</p>}
                </article>
            ))}
        </div>
    );
}
