import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    if (!amount) return 'Liên hệ';
    return `${amount.toLocaleString('vi-VN')} đ`;
};

export default function Pricing() {
    const [services, setServices] = useState([]);

    useEffect(() => {
        api.get('/services').then((res) => setServices(res.data.data || []));
    }, []);

    return (
        <main className="min-h-screen bg-[#f7fbff]">
            <section className="bg-white">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <p className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black uppercase text-blue-700">Bảng giá</p>
                    <h1 className="mt-5 text-4xl font-black text-blue-950 sm:text-5xl">Chi phí dịch vụ minh bạch</h1>
                    <p className="mt-4 max-w-3xl leading-8 text-slate-600">Bảng giá tham khảo được đồng bộ từ database. Chi phí cuối cùng có thể thay đổi sau khi bác sĩ thăm khám.</p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">
                    <div className="grid grid-cols-[1.3fr_0.7fr_0.6fr_0.7fr] bg-blue-700 px-5 py-4 text-sm font-black uppercase text-white">
                        <span>Dịch vụ</span>
                        <span>Danh mục</span>
                        <span>Thời lượng</span>
                        <span className="text-right">Giá</span>
                    </div>
                    {services.map((service) => (
                        <div key={service.id} className="grid grid-cols-[1.3fr_0.7fr_0.6fr_0.7fr] items-center border-t border-blue-50 px-5 py-4 text-sm">
                            <span className="font-black text-blue-950">{service.name}</span>
                            <span className="text-slate-600">{service.categoryName || 'Nha khoa'}</span>
                            <span className="font-bold text-slate-600">{service.duration || 30} phút</span>
                            <span className="text-right font-black text-blue-700">{formatCurrency(service.price)}</span>
                        </div>
                    ))}
                </div>

                <Link to="/book-appointment" className="mt-6 inline-flex rounded-xl bg-blue-700 px-6 py-3 text-sm font-black uppercase text-white hover:bg-blue-800">
                    Đặt lịch theo bảng giá
                </Link>
            </section>
        </main>
    );
}
