import { useCallback, useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import GoogleAuthButton from '../components/GoogleAuthButton';
import AuthShell from '../components/AuthShell';

const getAuthErrorMessage = (err, fallback) => {
    if (err.response?.data?.message) return err.response.data.message;
    if (err.code === 'ECONNABORTED') return 'Backend phản hồi quá lâu, vui lòng thử lại.';
    if (err.request) return 'Không kết nối được backend. Hãy chạy backend ở http://localhost:8080 và kiểm tra VITE_API_URL.';
    return fallback;
};

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, googleLogin } = useContext(AuthContext);
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
            setError(getAuthErrorMessage(err, 'Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.'));
        }
    };

    const handleGoogleLogin = useCallback(async (idToken) => {
        setError('');

        try {
            await googleLogin(idToken);
            navigate(redirectPath, { replace: true });
        } catch (err) {
            setError(getAuthErrorMessage(err, 'Không thể đăng nhập bằng Google.'));
        }
    }, [googleLogin, navigate, redirectPath]);

    return (
        <AuthShell title="Chọn tài khoản" subtitle="Tiếp tục tới">
            <div className="mx-auto w-full max-w-[460px]">
                {error && <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">{error}</div>}

                <GoogleAuthButton onSuccess={handleGoogleLogin} onError={setError} />

                <div className="my-6 flex items-center gap-3">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-black uppercase text-slate-400">hoặc đăng nhập thủ công</span>
                    <span className="h-px flex-1 bg-slate-200" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Field label="Email" type="email" placeholder="email@example.com" value={email} onChange={setEmail} required />
                    <Field label="Mật khẩu" type="password" placeholder="Nhập mật khẩu" value={password} onChange={setPassword} required />

                    <button type="submit" className="w-full rounded-full bg-[#4A6FA5] px-5 py-3.5 font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800">
                        Đăng nhập
                    </button>
                </form>

                <p className="mt-7 text-center text-sm text-slate-600">
                    Chưa có tài khoản? <Link to="/register" className="font-black text-blue-700 hover:text-blue-800">Đăng ký khách hàng</Link>
                </p>
            </div>
        </AuthShell>
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
