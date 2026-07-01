import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/auth-context';

export default function VnpayReturn() {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('checking');
    const [message, setMessage] = useState('Đang xác nhận giao dịch VNPay...');
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const invoiceId = params.get('vnp_TxnRef')?.split('-')?.[0] || '';

    useEffect(() => {
        let mounted = true;

        const confirmPayment = async () => {
            try {
                const payload = Object.fromEntries(params.entries());
                const res = await api.post('/invoices/vnpay-confirm', payload);
                if (!mounted) return;

                setStatus('success');
                setMessage(res.data?.message || 'Đã ghi nhận thanh toán VNPay.');
                toast.success('Đã ghi nhận thanh toán VNPay.');

                const target = user?.role === 'patient'
                    ? `/profile?tab=invoices${invoiceId ? `&highlightType=invoice&highlightId=${invoiceId}` : ''}`
                    : `/dashboard?tab=invoices${invoiceId ? `&highlightType=invoice&highlightId=${invoiceId}` : ''}`;

                window.setTimeout(() => navigate(target, { replace: true }), 1200);
            } catch (error) {
                if (!mounted) return;
                setStatus('failed');
                setMessage(error.response?.data?.message || 'Không thể xác nhận giao dịch VNPay.');
                toast.error(error.response?.data?.message || 'Không thể xác nhận giao dịch VNPay.');
            }
        };

        confirmPayment();

        return () => {
            mounted = false;
        };
    }, [invoiceId, navigate, params, user?.role]);

    const isSuccess = status === 'success';
    const isChecking = status === 'checking';
    const target = user?.role === 'patient' ? '/profile?tab=invoices' : '/dashboard?tab=invoices';

    return (
        <main className="grid min-h-screen place-items-center bg-[#F8FCFC] px-4 py-10">
            <section className="w-full max-w-xl rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-xl shadow-blue-100">
                <p className="text-sm font-black uppercase text-emerald-700">VNPay</p>
                <h1 className="mt-3 text-3xl font-black text-blue-950">
                    {isChecking ? 'Đang xác nhận thanh toán' : isSuccess ? 'Thanh toán thành công' : 'Chưa xác nhận được thanh toán'}
                </h1>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{message}</p>
                {invoiceId && (
                    <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
                        Hóa đơn INV-{invoiceId}
                    </p>
                )}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link to={target} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                        Về hóa đơn
                    </Link>
                    <Link to="/" className="rounded-xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-600 hover:bg-blue-50">
                        Trang chủ
                    </Link>
                </div>
            </section>
        </main>
    );
}
