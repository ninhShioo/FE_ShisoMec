import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    if (!amount) return 'Liên hệ';
    return `${amount.toLocaleString('vi-VN')} đ`;
};

export default function ServicesList() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await api.get('/services');
                setServices(res.data.data || []);
            } catch {
                setError('Không thể tải danh sách dịch vụ.');
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, []);

    const categories = useMemo(() => [...new Set(services.map((service) => service.categoryName).filter(Boolean))], [services]);

    const filteredServices = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        return services.filter((service) => {
            const matchesCategory = categoryFilter === 'all' || service.categoryName === categoryFilter;
            const source = `${service.name || ''} ${service.description || ''} ${service.categoryName || ''}`.toLowerCase();
            return matchesCategory && (!keyword || source.includes(keyword));
        });
    }, [services, searchTerm, categoryFilter]);

    return (
        <main className="min-h-screen bg-[#f7fbff]">
            <section className="border-b border-blue-100 bg-[linear-gradient(115deg,#eef7ff_0%,#ffffff_52%,#e8f3ff_100%)]">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <p className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black uppercase text-blue-700">Dịch vụ nha khoa</p>
                    <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-blue-950 sm:text-5xl">
                        Dịch vụ rõ giá, rõ thời lượng, dễ đặt lịch
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                        Danh sách dịch vụ được lấy trực tiếp từ hệ thống quản trị. Khách hàng có thể tham khảo chi phí trước khi chọn lịch khám.
                    </p>

                    <div className="mt-8 grid gap-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm shadow-blue-50 md:grid-cols-[1fr_260px]">
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm theo tên dịch vụ, mô tả hoặc danh mục"
                            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                        <select
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="all">Tất cả danh mục</option>
                            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {loading && <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center font-bold text-slate-500">Đang tải dịch vụ...</div>}
                {!loading && error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center font-bold text-rose-700">{error}</div>}
                {!loading && !error && filteredServices.length === 0 && (
                    <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm shadow-blue-50">
                        <h2 className="text-xl font-black text-blue-950">Không tìm thấy dịch vụ</h2>
                        <p className="mt-2 text-sm text-slate-500">Thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.</p>
                    </div>
                )}

                {!loading && !error && filteredServices.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredServices.map((service) => (
                            <article key={service.id} className="flex overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm shadow-blue-50 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100">
                                <div className="flex w-full flex-col">
                                    {service.displayImage || service.image ? (
                                        <img src={service.displayImage || service.image} alt={service.name} className="h-52 w-full object-cover" />
                                    ) : (
                                        <div className="grid h-52 w-full place-items-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
                                            <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-4xl font-black text-blue-700 shadow-sm">
                                                {String(service.name || 'D')[0]}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-1 flex-col p-5">
                                        <p className="text-xs font-black uppercase text-blue-700">{service.categoryName || 'Nha khoa'}</p>
                                        <h2 className="mt-2 text-xl font-black text-blue-950">{service.name}</h2>
                                        <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-600">
                                            {service.description || 'Dịch vụ hiện chưa có mô tả chi tiết.'}
                                        </p>

                                        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-blue-50 pt-4">
                                            <div className="rounded-xl bg-blue-50 p-3">
                                                <p className="text-xs font-black uppercase text-blue-500">Chi phí</p>
                                                <p className="mt-1 text-base font-black text-blue-800">{formatCurrency(service.price)}</p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 p-3">
                                                <p className="text-xs font-black uppercase text-slate-400">Thời gian</p>
                                                <p className="mt-1 text-base font-black text-slate-800">{service.duration || 30} phút</p>
                                            </div>
                                        </div>

                                        <Link
                                            to={`/book-appointment?serviceId=${service.id}`}
                                            className="mt-5 rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-black uppercase text-white shadow-xl shadow-blue-100 hover:bg-blue-800"
                                        >
                                            Đặt lịch dịch vụ này
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
