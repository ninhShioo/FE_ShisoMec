import { useCallback, useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import GoogleAuthButton from '../components/GoogleAuthButton';
import AuthShell from '../components/AuthShell';

const getAuthErrorMessage = (err, fallback) => {
    if (err.response?.data?.message) return err.response.data.message;
    if (err.code === 'ECONNABORTED') return 'Backend phản hồi quá lâu, vui lòng thử lại.';
    if (err.request) return 'Không kết nối được backend. Hãy chạy backend ở http://localhost:8080 và kiểm tra VITE_API_URL.';
    return fallback;
};

export default function Register() {
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', phone: '' });
    const [error, setError] = useState('');
    const { register, googleLogin } = useContext(AuthContext);
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
            setError(getAuthErrorMessage(err, 'Không thể tạo tài khoản. Vui lòng thử lại.'));
        }
    };

    const handleGoogleRegister = useCallback(async (idToken) => {
        setError('');

        try {
            await googleLogin(idToken);
            navigate('/profile');
        } catch (err) {
            setError(getAuthErrorMessage(err, 'Không thể đăng ký bằng Google.'));
        }
    }, [googleLogin, navigate]);

    return (
        <AuthShell title="Tạo tài khoản" subtitle="Tiếp tục tới">
            <div className="mx-auto w-full max-w-[460px]">
                {error && <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">{error}</div>}

                <GoogleAuthButton label="Đăng ký với Google" onSuccess={handleGoogleRegister} onError={setError} />

                <div className="my-6 flex items-center gap-3">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-black uppercase text-slate-400">hoặc tạo bằng email</span>
                    <span className="h-px flex-1 bg-slate-200" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Họ và tên" name="fullName" placeholder="Nguyễn Văn A" value={formData.fullName} onChange={handleChange} required />
                    <Field label="Số điện thoại" name="phone" placeholder="0987654321" value={formData.phone} onChange={handleChange} />
                    <Field label="Email" name="email" type="email" placeholder="email@example.com" value={formData.email} onChange={handleChange} required />
                    <Field label="Mật khẩu" name="password" type="password" placeholder="Tạo mật khẩu" value={formData.password} onChange={handleChange} required />

                    <button type="submit" className="w-full rounded-full bg-[#4A6FA5] px-5 py-3.5 font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800">
                        Tạo tài khoản
                    </button>
                </form>

                <p className="mt-7 text-center text-sm text-slate-600">
                    Đã có tài khoản? <Link to="/login" className="font-black text-blue-700 hover:text-blue-800">Đăng nhập</Link>
                </p>
            </div>
        </AuthShell>
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
