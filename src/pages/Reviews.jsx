import { useEffect, useState } from 'react';
import api from '../services/api';
import Seo from '../components/Seo';

const stars = (rating) => '★'.repeat(Number(rating || 0)).padEnd(5, '☆');

export default function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reviews/public')
            .then((res) => setReviews(res.data.data || []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen bg-[#f7fbff]">
            <Seo title="Đánh giá khách hàng | Phenikaa Dental" description="Cảm nhận của khách hàng sau khi sử dụng dịch vụ tại Phenikaa Dental." />
            <section className="bg-white">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <p className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black uppercase text-blue-700">Feedback</p>
                    <h1 className="mt-5 max-w-3xl text-4xl font-black text-blue-950 sm:text-5xl">Khách hàng nói gì sau khi khám</h1>
                    <p className="mt-4 max-w-3xl leading-8 text-slate-600">Các đánh giá đã được phòng khám duyệt và hiển thị công khai.</p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {loading ? (
                    <div className="rounded-2xl bg-white p-8 text-center font-bold text-slate-500">Đang tải đánh giá...</div>
                ) : reviews.length === 0 ? (
                    <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center text-sm font-bold text-slate-500">Chưa có đánh giá công khai.</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {reviews.map((review) => (
                            <article key={review.id} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm shadow-blue-50">
                                <p className="text-lg font-black text-amber-400">{stars(review.rating)}</p>
                                <p className="mt-4 leading-7 text-slate-600">{review.comment}</p>
                                <div className="mt-5 border-t border-blue-50 pt-4">
                                    <p className="font-black text-blue-950">{review.patientName}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">{review.serviceName || 'Dịch vụ nha khoa'}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
