import { Link } from 'react-router-dom';

export default function Contact() {
    return (
        <main className="min-h-screen bg-[#f7fbff]">
            <section className="bg-white">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <p className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black uppercase text-blue-700">Liên hệ</p>
                    <h1 className="mt-5 text-4xl font-black text-blue-950 sm:text-5xl">Phenikaa Dental luôn sẵn sàng hỗ trợ</h1>
                    <p className="mt-4 max-w-3xl leading-8 text-slate-600">Liên hệ phòng khám hoặc đặt lịch trực tuyến để được nhân viên xác nhận.</p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
                <div className="rounded-2xl bg-blue-700 p-8 text-white shadow-xl shadow-blue-100">
                    <h2 className="text-2xl font-black">Thông tin phòng khám</h2>
                    <div className="mt-6 space-y-4 text-sm font-bold leading-7">
                        <p>Hotline: 0869 800 318</p>
                        <p>Email: contact@phenikaadental.vn</p>
                        <p>Địa chỉ: Tòa nhà Phenikaa Tower, Hà Đông, Hà Nội</p>
                        <p>Thời gian: 08:00 - 17:00, Thứ 2 - Chủ nhật</p>
                    </div>
                    <Link to="/book-appointment" className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black uppercase text-blue-700">
                        Đặt lịch khám
                    </Link>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100">
                    <div className="grid min-h-[360px] place-items-center rounded-2xl bg-gradient-to-br from-blue-50 via-white to-cyan-50 text-center">
                        <div>
                            <p className="text-sm font-black uppercase text-blue-700">Bản đồ phòng khám</p>
                            <h2 className="mt-3 text-3xl font-black text-blue-950">Phenikaa Tower</h2>
                            <p className="mt-3 max-w-md leading-7 text-slate-600">Khu vực này có thể thay bằng Google Maps iframe khi deploy thật.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
