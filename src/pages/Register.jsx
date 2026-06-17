import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import logoImage from '../assets/phenikaa-dental-logo.svg';

export default function Register() {
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', phone: '' });
    const [error, setError] = useState('');
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        try {
            await register(formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
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
                            <p className="text-sm font-black uppercase text-blue-700">Tài khoản khách hàng</p>
                            <h1 className="mt-3 text-4xl font-black leading-tight text-blue-950">Đặt lịch nhanh hơn trong những lần khám sau</h1>
                            <p className="mt-5 leading-7 text-slate-600">Tạo tài khoản để theo dõi lịch hẹn, hồ sơ khám và hóa đơn của bạn.</p>
                        </div>
                    </section>

                    <section className="p-6 sm:p-10">
                        <div className="mx-auto max-w-md">
                            <h2 className="text-3xl font-black text-blue-950">Đăng ký</h2>
                            <p className="mt-2 text-sm text-slate-500">Dành cho khách hàng đặt lịch khám.</p>

                            {error && <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">{error}</div>}

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                <Field label="Họ và tên" name="fullName" placeholder="Nguyễn Văn A" value={formData.fullName} onChange={handleChange} required />
                                <Field label="Số điện thoại" name="phone" placeholder="0987654321" value={formData.phone} onChange={handleChange} />
                                <Field label="Email" name="email" type="email" placeholder="email@example.com" value={formData.email} onChange={handleChange} required />
                                <Field label="Mật khẩu" name="password" type="password" placeholder="Tạo mật khẩu" value={formData.password} onChange={handleChange} required />

                                <button type="submit" className="w-full rounded-xl bg-blue-700 px-5 py-3 font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800">
                                    Tạo tài khoản
                                </button>
                            </form>

                            <p className="mt-6 text-center text-sm text-slate-600">
                                Đã có tài khoản? <Link to="/login" className="font-black text-blue-700 hover:text-blue-800">Đăng nhập</Link>
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

function Field({ label, name, value, onChange, ...props }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <input name={name} value={value} onChange={event => onChange(name, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </label>
    );
}
