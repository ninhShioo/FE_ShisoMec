import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import logoImage from '../assets/phenikaa-dental-logo.svg';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const redirectPath = location.state?.from || '/';

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        try {
            await login(email, password);
            navigate(redirectPath, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.');
        }
    };

    return (
        <main className="min-h-screen bg-[linear-gradient(115deg,#eef7ff_0%,#ffffff_52%,#e8f3ff_100%)] px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
                <div className="grid w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-100 lg:grid-cols-[0.95fr_1.05fr]">
                    <section className="hidden bg-blue-50/70 p-10 lg:block">
                        <Link to="/" className="inline-flex items-center">
                            <img src={logoImage} alt="Phenikaa Dental" className="h-14 w-auto" />
                        </Link>
                        <div className="mt-20">
                            <p className="text-sm font-black uppercase text-blue-700">Chào mừng trở lại</p>
                            <h1 className="mt-3 text-4xl font-black leading-tight text-blue-950">Tiếp tục hành trình chăm sóc nụ cười</h1>
                            <p className="mt-5 leading-7 text-slate-600">Đăng nhập để đặt lịch, xem hồ sơ khám hoặc tiếp tục công việc tại phòng khám.</p>
                        </div>
                    </section>

                    <section className="p-6 sm:p-10">
                        <div className="mx-auto max-w-md">
                            <h2 className="text-3xl font-black text-blue-950">Đăng nhập</h2>
                            <p className="mt-2 text-sm text-slate-500">Nhập thông tin tài khoản của bạn.</p>

                            {error && <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">{error}</div>}

                            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                <Field label="Email" type="email" placeholder="email@example.com" value={email} onChange={setEmail} required />
                                <Field label="Mật khẩu" type="password" placeholder="Nhập mật khẩu" value={password} onChange={setPassword} required />

                                <button type="submit" className="w-full rounded-xl bg-blue-700 px-5 py-3 font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800">
                                    Đăng nhập
                                </button>
                            </form>

                            <p className="mt-6 text-center text-sm text-slate-600">
                                Chưa có tài khoản? <Link to="/register" className="font-black text-blue-700 hover:text-blue-800">Đăng ký khách hàng</Link>
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

function Field({ label, value, onChange, ...props }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <input value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </label>
    );
}
