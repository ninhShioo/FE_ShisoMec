import { Link } from 'react-router-dom';
import logoImage from '../assets/phenikaa-dental-logo.svg';

function GoogleMark() {
    return (
        <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-white text-base font-black leading-none shadow-sm">
            <span className="bg-[linear-gradient(90deg,#4285F4_0_25%,#34A853_25%_50%,#FBBC05_50%_75%,#EA4335_75%)] bg-clip-text text-transparent">G</span>
        </span>
    );
}

export default function AuthShell({ title, subtitle, appName = 'Phenikaa Dental', children, footer }) {
    return (
        <main className="min-h-screen bg-[#EEF3F9] px-4 py-8 text-slate-900">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
                <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_22px_70px_rgba(45,55,72,0.08)]">
                    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700">
                        <GoogleMark />
                        <span>Đăng nhập bằng Google</span>
                    </div>

                    <div className="grid gap-8 px-6 py-9 sm:px-9 lg:grid-cols-[1fr_1.05fr] lg:px-12 lg:py-12">
                        <div className="min-w-0">
                            <Link to="/" className="inline-flex">
                                <img src={logoImage} alt={appName} className="h-12 w-auto max-w-[210px] object-contain" />
                            </Link>
                            <h1 className="mt-10 text-[clamp(2.15rem,5vw,3.35rem)] font-normal leading-tight tracking-normal text-slate-950">
                                {title}
                            </h1>
                            <p className="mt-4 text-base leading-7 text-slate-700">
                                {subtitle}{' '}
                                <Link to="/" className="font-semibold text-blue-700 hover:text-blue-800">
                                    {appName}
                                </Link>
                            </p>
                        </div>

                        <div className="flex min-w-0 flex-col justify-center">
                            {children}
                        </div>
                    </div>
                </section>

                <div className="mt-6 flex flex-col gap-4 px-4 text-xs text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" className="inline-flex items-center gap-2 font-medium hover:text-slate-950">
                        Tiếng Việt
                        <span className="text-[10px]">▾</span>
                    </button>
                    <div className="flex gap-8">
                        <a href="/contact" className="hover:text-slate-950">Trợ giúp</a>
                        <a href="/profile" className="hover:text-slate-950">Quyền riêng tư</a>
                        <a href="/services" className="hover:text-slate-950">Điều khoản</a>
                    </div>
                </div>

                {footer}
            </div>
        </main>
    );
}
