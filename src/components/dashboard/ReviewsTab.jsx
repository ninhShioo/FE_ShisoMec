import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const statusClass = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    hidden: 'bg-slate-100 text-slate-600'
};

const statusLabels = {
    pending: 'Chờ duyệt',
    approved: 'Đã hiển thị',
    hidden: 'Đã ẩn'
};

export default function ReviewsTab() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        try {
            const res = await api.get('/reviews');
            setReviews(res.data.data || []);
        } catch {
            toast.error('Không thể tải đánh giá.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/reviews/${id}/status`, { status });
            toast.success('Đã cập nhật đánh giá.');
            fetchReviews();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể cập nhật đánh giá.');
        }
    };

    if (loading) return <Panel><div className="p-10 text-center font-bold text-slate-500">Đang tải đánh giá...</div></Panel>;

    return (
        <Panel>
            <div className="border-b border-blue-100 bg-white px-6 py-5">
                <h2 className="text-xl font-black text-blue-950">Duyệt đánh giá khách hàng</h2>
                <p className="mt-1 text-sm text-slate-500">Chỉ đánh giá đã duyệt mới hiển thị ngoài website.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                    <thead>
                        <tr className="bg-blue-50 text-left text-xs font-black uppercase text-slate-500">
                            <th className="px-6 py-3">Khách hàng</th>
                            <th className="px-6 py-3">Sao</th>
                            <th className="px-6 py-3">Nội dung</th>
                            <th className="px-6 py-3">Trạng thái</th>
                            <th className="px-6 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                        {reviews.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-sm font-bold text-slate-500">Chưa có đánh giá.</td></tr>
                        ) : reviews.map((review) => (
                            <tr key={review.id}>
                                <td className="px-6 py-4 font-black text-blue-950">{review.patientName}</td>
                                <td className="px-6 py-4 font-black text-amber-400">{'★'.repeat(review.rating)}</td>
                                <td className="max-w-xl px-6 py-4 text-sm leading-6 text-slate-600">{review.comment}</td>
                                <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass[review.status] || 'bg-slate-100 text-slate-600'}`}>{statusLabels[review.status] || review.status}</span></td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => updateStatus(review.id, 'approved')} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Duyệt</button>
                                        <button onClick={() => updateStatus(review.id, 'hidden')} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">Ẩn</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}
