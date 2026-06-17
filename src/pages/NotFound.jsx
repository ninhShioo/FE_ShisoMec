import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function NotFound() {
    return (
        <main className="grid min-h-screen place-items-center bg-[#f7fbff] px-4">
            <Seo title="Không tìm thấy trang | Phenikaa Dental" description="Trang bạn yêu cầu không tồn tại." />
            <section className="max-w-xl rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-xl shadow-blue-100">
                <p className="text-sm font-black uppercase text-blue-700">404</p>
                <h1 className="mt-3 text-4xl font-black text-blue-950">Không tìm thấy trang</h1>
                <p className="mt-4 leading-7 text-slate-600">Đường dẫn có thể đã thay đổi hoặc không tồn tại trong hệ thống.</p>
                <Link to="/" className="mt-6 inline-flex rounded-xl bg-blue-700 px-6 py-3 text-sm font-black uppercase text-white hover:bg-blue-800">
                    Về trang chủ
                </Link>
            </section>
        </main>
    );
}
