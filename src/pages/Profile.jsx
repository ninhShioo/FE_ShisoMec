import { Fragment, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/auth-context';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getHighlightClass } from '../utils/notificationNavigation';

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN') + ' đ';

const getQrImageUrl = (paymentUrl) => (
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(paymentUrl)}`
);

const isInvoicePaid = (invoice) => invoice?.status === 'paid' || Number(invoice?.outstandingAmount || 0) <= 0;

const paymentLabels = {
    cash: 'Tiền mặt',
    card: 'Thẻ',
    transfer: 'Chuyển khoản',
    bank_transfer: 'Chuyển khoản',
    vnpay: 'VNPay',
    momo: 'MoMo'
};

export default function Profile() {
    const { user, loading: authLoading, refreshUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [appointments, setAppointments] = useState([]);
    const [records, setRecords] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [reviewForms, setReviewForms] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('appointments');
    const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', avatar: '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [vnpayPayment, setVnpayPayment] = useState(null);
    const [checkingVnpay, setCheckingVnpay] = useState(false);
    const queryHighlight = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            type: params.get('highlightType'),
            id: params.get('highlightId')
        };
    }, [location.search]);
    const [highlight, setHighlight] = useState(queryHighlight);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('method') !== 'vnpay') return;

        if (params.get('payment') === 'success') {
            toast.success(`Thanh toán VNPay thành công${params.get('invoiceId') ? ` cho hóa đơn INV-${params.get('invoiceId')}` : ''}.`);
        } else {
            toast.error('Thanh toán VNPay chưa thành công hoặc đã bị hủy.');
        }

        navigate('/profile', { replace: true });
    }, [location.search, navigate]);

    useEffect(() => {
        if (!authLoading && !user) navigate('/login');
    }, [user, authLoading, navigate]);

    useEffect(() => {
        const requestedTab = new URLSearchParams(location.search).get('tab');
        if (['appointments', 'history', 'invoices'].includes(requestedTab)) {
            setActiveTab(requestedTab);
        }
    }, [location.search]);

    useEffect(() => {
        setHighlight(queryHighlight);
        if (!queryHighlight.type || !queryHighlight.id) return undefined;

        const timer = window.setTimeout(() => setHighlight({ type: null, id: null }), 4200);
        return () => window.clearTimeout(timer);
    }, [queryHighlight]);

    useEffect(() => {
        if (loading || !highlight.type || !highlight.id) return;

        const targetPrefix = highlight.type === 'invoice' ? 'profile-invoice-row' : 'profile-appointment-row';
        const timer = window.setTimeout(() => {
            document.getElementById(`${targetPrefix}-${highlight.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);

        return () => window.clearTimeout(timer);
    }, [loading, highlight.type, highlight.id, activeTab]);

    useEffect(() => {
        if (!user) return;
        setProfileForm({
            fullName: user.fullName || '',
            phone: user.phone || '',
            avatar: user.avatar || ''
        });
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const [resAppointments, resRecords, resInvoices, resReviews] = await Promise.all([
                    api.get('/appointments'),
                    api.get(`/records/patient/${user.id}`),
                    api.get('/invoices'),
                    api.get('/reviews/my')
                ]);
                setAppointments(resAppointments.data.data || []);
                setRecords(resRecords.data.data || []);
                setInvoices(resInvoices.data.data || []);
                setReviews(resReviews.data.data || []);
            } catch {
                toast.error('Không thể tải thông tin cá nhân.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const getStatusText = (status) => ({
        arrived: 'Khách đã đến',
        in_progress: 'Đang khám',
        no_show: 'Không đến',
        pending: 'Chờ xác nhận',
        confirmed: 'Đã xác nhận',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy'
    }[status] || status);

    const getStatusClass = (status) => ({
        arrived: 'bg-cyan-50 text-cyan-700',
        in_progress: 'bg-indigo-50 text-indigo-700',
        no_show: 'bg-slate-100 text-slate-600',
        pending: 'bg-amber-50 text-amber-700',
        confirmed: 'bg-blue-50 text-blue-700',
        completed: 'bg-emerald-50 text-emerald-700',
        cancelled: 'bg-rose-50 text-rose-700'
    }[status] || 'bg-slate-100 text-slate-600');

    const getInvoiceStatusMeta = (status) => ({
        paid: ['Đã thanh toán', 'bg-emerald-50 text-emerald-700'],
        partial: ['Thanh toán một phần', 'bg-amber-50 text-amber-700'],
        unpaid: ['Chưa thanh toán', 'bg-rose-50 text-rose-700'],
        cancelled: ['Đã hủy', 'bg-slate-100 text-slate-600']
    }[status] || [status, 'bg-slate-100 text-slate-600']);

    const handleVnpayPayment = async (invoice) => {
        try {
            const res = await api.post(`/invoices/${invoice.id}/vnpay-url`);
            const paymentUrl = res.data.data?.paymentUrl;
            if (!paymentUrl) {
                toast.error('Không nhận được link thanh toán VNPay.');
                return;
            }
            setVnpayPayment({
                invoice,
                paymentUrl,
                amount: res.data.data?.amount,
                txnRef: res.data.data?.txnRef
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể tạo thanh toán VNPay.');
        }
    };

    const mergeInvoice = useCallback((nextInvoice) => {
        setInvoices(current => current.map(invoice => (
            invoice.id === nextInvoice.id ? { ...invoice, ...nextInvoice } : invoice
        )));
        setVnpayPayment(current => (
            current?.invoice?.id === nextInvoice.id ? { ...current, invoice: { ...current.invoice, ...nextInvoice } } : current
        ));
    }, []);

    const refreshInvoicePayment = useCallback(async (invoiceId, showToast = true) => {
        try {
            setCheckingVnpay(true);
            const res = await api.get(`/invoices/${invoiceId}`);
            const nextInvoice = res.data.data;
            if (!nextInvoice) return;

            mergeInvoice(nextInvoice);
            if (showToast) {
                if (isInvoicePaid(nextInvoice)) {
                    toast.success('Hóa đơn đã thanh toán thành công.');
                } else {
                    toast.error('Chưa ghi nhận thanh toán VNPay. Vui lòng thử lại sau vài giây.');
                }
            }
        } catch (err) {
            if (showToast) toast.error(err.response?.data?.message || 'Không thể kiểm tra trạng thái thanh toán.');
        } finally {
            setCheckingVnpay(false);
        }
    }, [mergeInvoice]);

    useEffect(() => {
        if (!vnpayPayment || isInvoicePaid(vnpayPayment.invoice)) return undefined;

        const timer = window.setInterval(() => {
            refreshInvoicePayment(vnpayPayment.invoice.id, false);
        }, 5000);

        return () => window.clearInterval(timer);
    }, [vnpayPayment, refreshInvoicePayment]);

    const handleCancelAppointment = async (appointmentId) => {
        if (!window.confirm('Bạn muốn hủy lịch hẹn này?')) return;

        try {
            await api.put(`/appointments/${appointmentId}/status`, { status: 'cancelled' });
            setAppointments((current) => current.map((appointment) => (
                appointment.id === appointmentId ? { ...appointment, status: 'cancelled' } : appointment
            )));
            toast.success('Đã hủy lịch hẹn.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể hủy lịch hẹn.');
        }
    };

    const handleReviewChange = (appointmentId, key, value) => {
        setReviewForms((current) => ({
            ...current,
            [appointmentId]: {
                rating: 5,
                comment: '',
                ...(current[appointmentId] || {}),
                [key]: value
            }
        }));
    };

    const submitReview = async (appointmentId) => {
        const form = reviewForms[appointmentId] || { rating: 5, comment: '' };
        try {
            await api.post('/reviews', {
                appointmentId,
                rating: Number(form.rating || 5),
                comment: form.comment || ''
            });
            toast.success('Đã gửi đánh giá. Đánh giá sẽ hiển thị sau khi duyệt.');
            const res = await api.get('/reviews/my');
            setReviews(res.data.data || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể gửi đánh giá.');
        }
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            setUploadingAvatar(true);
            const res = await api.post('/upload/single', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setProfileForm((current) => ({ ...current, avatar: res.data.data.url }));
            toast.success('Đã tải ảnh đại diện.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể tải ảnh đại diện.');
        } finally {
            setUploadingAvatar(false);
            event.target.value = '';
        }
    };

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        if (!profileForm.fullName.trim()) {
            toast.error('Họ tên không được để trống.');
            return;
        }

        try {
            setSavingProfile(true);
            await api.put(`/users/${user.id}`, {
                fullName: profileForm.fullName.trim(),
                phone: profileForm.phone.trim(),
                avatar: profileForm.avatar || null
            });
            await refreshUser();
            toast.success('Đã cập nhật hồ sơ.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể cập nhật hồ sơ.');
        } finally {
            setSavingProfile(false);
        }
    };

    const stats = useMemo(() => {
        const upcoming = appointments.filter(item => ['pending', 'confirmed', 'arrived', 'in_progress'].includes(item.status)).length;
        const completed = appointments.filter(item => item.status === 'completed').length;
        const unpaid = invoices.filter(item => item.status === 'unpaid').length;

        return [
            ['Lịch sắp tới', upcoming, 'Lịch chờ hoặc đã xác nhận', 'blue'],
            ['Đã khám', completed, 'Lịch hẹn hoàn thành', 'emerald'],
            ['Hồ sơ khám', records.length, 'Kết quả điều trị đã lưu', 'violet'],
            ['Chưa thanh toán', unpaid, 'Hóa đơn cần theo dõi', 'rose']
        ];
    }, [appointments, records, invoices]);

    if (authLoading || loading) {
        return <div className="min-h-screen bg-[#f7fbff] p-20 text-center font-bold text-slate-500">Đang tải hồ sơ...</div>;
    }

    if (!user) return null;

    const reviewedAppointmentIds = new Set(reviews.map((review) => review.appointmentId));

    const tabs = [
        ['appointments', 'Lịch hẹn'],
        ['history', 'Hồ sơ khám'],
        ['invoices', 'Hóa đơn']
    ];

    return (
        <main className="min-h-screen bg-[#f7fbff] px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">
                    <div className="bg-[linear-gradient(115deg,#eef7ff_0%,#ffffff_52%,#e8f3ff_100%)] p-6 sm:p-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-3xl font-black text-blue-700 ring-4 ring-white/70">
                                {profileForm.avatar ? <img src={profileForm.avatar} alt="Ảnh đại diện" className="h-full w-full object-cover" /> : user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black uppercase text-blue-700">Hồ sơ khách hàng</p>
                                <h1 className="mt-2 text-3xl font-black text-blue-950">{user.fullName}</h1>
                                <p className="mt-1 text-sm text-slate-600">{user.email} {user.phone ? `- ${user.phone}` : ''}</p>
                            </div>
                            <Link to="/book-appointment" className="rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-black uppercase text-white shadow-lg shadow-blue-100 hover:bg-blue-800">
                                Đặt lịch mới
                            </Link>
                        </div>

                        <div className="mt-7 grid gap-4 md:grid-cols-4">
                            {stats.map(([label, value, helper, tone]) => (
                                <SummaryCard key={label} label={label} value={value} helper={helper} tone={tone} />
                            ))}
                        </div>
                    </div>
                </section>

                <form onSubmit={handleProfileSubmit} className="mt-6 rounded-2xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100">
                    <div className="mb-5">
                        <p className="text-sm font-black uppercase text-blue-700">Thông tin cá nhân</p>
                        <h2 className="mt-1 text-xl font-black text-blue-950">Cập nhật hồ sơ liên hệ</h2>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-end">
                        <div>
                            <label className="inline-flex cursor-pointer rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100">
                                {uploadingAvatar ? 'Đang tải ảnh...' : 'Đổi ảnh đại diện'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                            </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Field label="Họ và tên" value={profileForm.fullName} onChange={value => setProfileForm({ ...profileForm, fullName: value })} required />
                            <Field label="Số điện thoại" value={profileForm.phone} onChange={value => setProfileForm({ ...profileForm, phone: value })} />
                            <Field label="Email" disabled value={user.email} onChange={() => {}} />
                        </div>
                        <button type="submit" disabled={savingProfile || uploadingAvatar} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">
                            {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
                        </button>
                    </div>
                </form>

                <div className="mt-6 flex flex-wrap gap-2">
                    {tabs.map(([key, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)} className={`rounded-xl px-5 py-3 text-sm font-black transition ${activeTab === key ? 'bg-blue-700 text-white shadow-lg shadow-blue-100' : 'border border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                <section className="mt-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100">
                    {activeTab === 'appointments' && (
                        <div>
                            <SectionTitle title="Lịch hẹn của tôi" description="Theo dõi trạng thái lịch khám và hủy lịch nếu cần trước khi khám." />
                            {appointments.length === 0 ? <Empty text="Bạn chưa có lịch hẹn nào." /> : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-blue-100">
                                        <thead>
                                            <tr className="bg-blue-50/60 text-left text-xs font-black uppercase text-slate-500">
                                                <th className="px-4 py-3">Thời gian</th>
                                                <th className="px-4 py-3">Dịch vụ</th>
                                                <th className="px-4 py-3">Bác sĩ</th>
                                                <th className="px-4 py-3">Trạng thái</th>
                                                <th className="px-4 py-3 text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-50">
                                            {appointments.map((appointment) => (
                                                <Fragment key={appointment.id}>
                                                <tr
                                                    id={`profile-appointment-row-${appointment.id}`}
                                                    className={`hover:bg-blue-50/40 ${getHighlightClass(highlight.type === 'appointment' && highlight.id === String(appointment.id))}`}
                                                >
                                                    <td className="px-4 py-4">
                                                        <p className="font-black text-blue-950">{new Date(appointment.appointmentDate).toLocaleDateString('vi-VN')}</p>
                                                        <p className="text-sm font-bold text-blue-700">{appointment.appointmentTime}</p>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-slate-600">{appointment.serviceNames || 'Chưa có dịch vụ'}</td>
                                                    <td className="px-4 py-4 text-sm text-slate-600">{appointment.dentistName || 'Chưa phân công'}</td>
                                                    <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(appointment.status)}`}>{getStatusText(appointment.status)}</span></td>
                                                    <td className="px-4 py-4 text-right">
                                                        {['pending', 'confirmed'].includes(appointment.status) ? (
                                                            <button onClick={() => handleCancelAppointment(appointment.id)} className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-black text-rose-600 hover:bg-rose-100">Hủy lịch</button>
                                                        ) : appointment.status === 'completed' && !reviewedAppointmentIds.has(appointment.id) ? (
                                                            <button onClick={() => handleReviewChange(appointment.id, 'open', true)} className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-700 hover:bg-amber-100">Đánh giá</button>
                                                        ) : appointment.status === 'completed' ? (
                                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Đã đánh giá</span>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                </tr>
                                                {reviewForms[appointment.id]?.open && !reviewedAppointmentIds.has(appointment.id) && (
                                                    <tr>
                                                        <td colSpan="5" className="bg-amber-50/40 px-4 py-4">
                                                            <div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
                                                                <select value={reviewForms[appointment.id]?.rating || 5} onChange={(event) => handleReviewChange(appointment.id, 'rating', event.target.value)} className="rounded-xl border border-amber-100 px-3 py-2 font-black text-amber-700">
                                                                    {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}
                                                                </select>
                                                                <input value={reviewForms[appointment.id]?.comment || ''} onChange={(event) => handleReviewChange(appointment.id, 'comment', event.target.value)} placeholder="Chia sẻ trải nghiệm sau khi khám" className="rounded-xl border border-amber-100 px-4 py-2" />
                                                                <button type="button" onClick={() => submitReview(appointment.id)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white">Gửi đánh giá</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            <SectionTitle title="Hồ sơ khám" description="Xem lại chẩn đoán, đơn thuốc, ghi chú và tài liệu điều trị đã được bác sĩ lưu." />
                            {records.length === 0 ? <Empty text="Bạn chưa có hồ sơ khám nào." /> : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {records.map(record => (
                                        <article key={record.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
                                            <div className="flex justify-between gap-4">
                                                <div>
                                                    <p className="text-xs font-black uppercase text-slate-400">Ngày khám</p>
                                                    <p className="mt-1 font-black text-blue-950">{new Date(record.appointmentDate).toLocaleDateString('vi-VN')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black uppercase text-slate-400">Bác sĩ</p>
                                                    <p className="mt-1 font-black text-blue-700">{record.dentistName || 'Bác sĩ phụ trách'}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600">
                                                {record.serviceNames && <p><span className="font-black text-blue-950">Dịch vụ:</span> {record.serviceNames}</p>}
                                                {record.chiefComplaint && <p className="mt-2"><span className="font-black text-blue-950">Lý do khám:</span> {record.chiefComplaint}</p>}
                                                <p className="mt-2"><span className="font-black text-blue-950">Chẩn đoán:</span> {record.diagnosis}</p>
                                                {record.treatmentPlan && <p className="mt-2"><span className="font-black text-blue-950">Kế hoạch điều trị:</span> {record.treatmentPlan}</p>}
                                                {record.procedures && <p className="mt-2"><span className="font-black text-blue-950">Thủ thuật:</span> {record.procedures}</p>}
                                                {record.prescription && <p className="mt-2"><span className="font-black text-blue-950">Đơn thuốc:</span> {record.prescription}</p>}
                                                {record.notes && <p className="mt-2"><span className="font-black text-blue-950">Ghi chú:</span> {record.notes}</p>}
                                                {record.nextAppointmentDate && <p className="mt-2"><span className="font-black text-blue-950">Tái khám:</span> {new Date(record.nextAppointmentDate).toLocaleDateString('vi-VN')}{record.nextAppointmentNote ? ` - ${record.nextAppointmentNote}` : ''}</p>}
                                                {Array.isArray(record.attachments) && record.attachments.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {record.attachments.map((url, index) => (
                                                            <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 hover:bg-blue-100">
                                                                Tài liệu {index + 1}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'invoices' && (
                        <div>
                            <SectionTitle title="Hóa đơn" description="Theo dõi chi phí khám và thanh toán bằng VNPay/QR khi còn công nợ." />
                            {invoices.length === 0 ? <Empty text="Bạn chưa có hóa đơn nào." /> : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-blue-100">
                                        <thead>
                                            <tr className="bg-blue-50/60 text-left text-xs font-black uppercase text-slate-500">
                                                <th className="px-4 py-3">Mã</th>
                                                <th className="px-4 py-3">Ngày tạo</th>
                                                <th className="px-4 py-3">Thanh toán</th>
                                                <th className="px-4 py-3">Tổng tiền</th>
                                                <th className="px-4 py-3">Trạng thái</th>
                                                <th className="px-4 py-3 text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-50">
                                            {invoices.map(invoice => (
                                                <tr
                                                    key={invoice.id}
                                                    id={`profile-invoice-row-${invoice.id}`}
                                                    className={`hover:bg-blue-50/40 ${getHighlightClass(highlight.type === 'invoice' && highlight.id === String(invoice.id))}`}
                                                >
                                                    <td className="px-4 py-4 font-black text-blue-950">INV-{invoice.id}</td>
                                                    <td className="px-4 py-4 text-sm text-slate-600">{new Date(invoice.createdAt).toLocaleDateString('vi-VN')}</td>
                                                    <td className="px-4 py-4 text-sm text-slate-600">{paymentLabels[invoice.lastPaymentMethod || invoice.paymentMethod] || invoice.paymentMethod || '-'}</td>
                                                    <td className="px-4 py-4">
                                                        <p className="font-black text-blue-700">{formatCurrency(invoice.totalAmount)}</p>
                                                        {Number(invoice.paidAmount || 0) > 0 && (
                                                            <p className="mt-1 text-xs font-bold text-emerald-700">Đã thu {formatCurrency(invoice.paidAmount)}</p>
                                                        )}
                                                        {Number(invoice.outstandingAmount || 0) > 0 && (
                                                            <p className="mt-1 text-xs font-bold text-rose-600">Còn {formatCurrency(invoice.outstandingAmount)}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${getInvoiceStatusMeta(invoice.status)[1]}`}>
                                                            {getInvoiceStatusMeta(invoice.status)[0]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        {['unpaid', 'partial'].includes(invoice.status) ? (
                                                            <button onClick={() => handleVnpayPayment(invoice)} className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                                                                Thanh toán VNPay/QR
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs font-bold text-slate-400">Đã hoàn tất</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
            {vnpayPayment && (
                <VnpayQrModal
                    payment={vnpayPayment}
                    checking={checkingVnpay}
                    onClose={() => setVnpayPayment(null)}
                    onCheck={() => refreshInvoicePayment(vnpayPayment.invoice.id, true)}
                />
            )}
        </main>
    );
}

function SummaryCard({ label, value, helper, tone }) {
    const toneClass = {
        blue: 'bg-blue-50 text-blue-800',
        emerald: 'bg-emerald-50 text-emerald-800',
        violet: 'bg-violet-50 text-violet-800',
        rose: 'bg-rose-50 text-rose-800'
    }[tone];

    return (
        <article className={`rounded-2xl p-5 ${toneClass}`}>
            <p className="text-3xl font-black">{value}</p>
            <p className="mt-1 text-sm font-black uppercase opacity-80">{label}</p>
            <p className="mt-2 text-sm leading-6 opacity-75">{helper}</p>
        </article>
    );
}

function VnpayQrModal({ payment, checking, onClose, onCheck }) {
    const paid = isInvoicePaid(payment.invoice);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4" onMouseDown={onClose} role="presentation">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-emerald-50/70 p-6">
                    <div>
                        <p className="text-sm font-black uppercase text-emerald-700">VNPay QR</p>
                        <h3 className="mt-1 text-2xl font-black text-blue-950">Thanh toán INV-{payment.invoice.id}</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-600">Quét mã để thanh toán hóa đơn nha khoa.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-emerald-50">Đóng</button>
                </div>

                <div className="grid gap-6 p-6 md:grid-cols-[300px_1fr]">
                    <div className="rounded-2xl border border-emerald-100 bg-white p-5 text-center">
                        <img src={getQrImageUrl(payment.paymentUrl)} alt="QR thanh toán VNPay" className="mx-auto h-[260px] w-[260px] rounded-xl" />
                        <p className="mt-4 text-xs font-bold text-slate-500">Mã QR chứa link thanh toán VNPay sandbox.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase text-slate-400">Số tiền</p>
                            <p className="mt-1 text-2xl font-black text-emerald-700">{formatCurrency(payment.amount || payment.invoice.outstandingAmount)}</p>
                        </div>
                        <div className={`rounded-2xl p-4 ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            <p className="text-xs font-black uppercase opacity-80">Trạng thái</p>
                            <p className="mt-1 font-black">{paid ? 'Đã ghi nhận thanh toán' : 'Đang chờ thanh toán'}</p>
                        </div>
                        <div className="rounded-2xl border border-blue-100 p-4 text-sm font-semibold text-slate-600">
                            <p>Sau khi thanh toán xong, bấm kiểm tra trạng thái. Hóa đơn chỉ hoàn tất khi hệ thống ghi nhận thanh toán từ VNPay.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <a href={payment.paymentUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white hover:bg-emerald-700">
                                Mở trang VNPay
                            </a>
                            <button type="button" onClick={onCheck} disabled={checking} className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                                {checking ? 'Đang kiểm tra...' : 'Đã thanh toán, kiểm tra lại'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, ...props }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <input value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500" {...props} />
        </label>
    );
}

function SectionTitle({ title, description }) {
    return (
        <div className="mb-5">
            <h2 className="text-xl font-black text-blue-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
    );
}

function Empty({ text }) {
    return <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-10 text-center text-sm font-bold text-slate-500">{text}</div>;
}
