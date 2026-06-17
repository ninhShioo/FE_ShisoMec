import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Doctors() {
    const [dentists, setDentists] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/users/public/dentists')
            .then((res) => setDentists(res.data.data || []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen bg-[#f7fbff]">
            <section className="border-b border-blue-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <p className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black uppercase text-blue-700">Đội ngũ bác sĩ</p>
                    <h1 className="mt-5 max-w-3xl text-4xl font-black text-blue-950 sm:text-5xl">Bác sĩ đang tiếp nhận lịch khám</h1>
                    <p className="mt-4 max-w-3xl leading-8 text-slate-600">Danh sách bác sĩ active lấy từ database, dùng trực tiếp trong bước chọn slot đặt lịch.</p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {loading ? (
                    <div className="rounded-2xl bg-white p-8 text-center font-bold text-slate-500">Đang tải bác sĩ...</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {dentists.map((doctor) => (
                            <article key={doctor.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm shadow-blue-50">
                                <div className="grid min-h-44 place-items-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
                                    {doctor.displayAvatar || doctor.avatar ? (
                                        <img src={doctor.displayAvatar || doctor.avatar} alt={doctor.fullName} className="h-36 w-36 rounded-full object-cover" />
                                    ) : (
                                        <div className="grid h-28 w-28 place-items-center rounded-full bg-blue-100 text-4xl font-black text-blue-700">
                                            {String(doctor.fullName || 'B')[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <p className="text-xs font-black uppercase text-blue-700">Bác sĩ nha khoa</p>
                                    <h2 className="mt-2 text-lg font-black text-blue-950">{doctor.fullName}</h2>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">Phụ trách thăm khám, tạo hồ sơ bệnh án và theo dõi điều trị.</p>
                                    {doctor.phone && <p className="mt-4 text-sm font-black text-blue-700">{doctor.phone}</p>}
                                    <Link to="/book-appointment" className="mt-5 block rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-black uppercase text-white hover:bg-blue-800">
                                        Đặt lịch
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
