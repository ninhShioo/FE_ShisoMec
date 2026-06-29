import { Fragment, useState, useEffect, useContext, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/auth-context';
import { useNavigate, Link } from 'react-router-dom';

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN') + ' đ';

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

    useEffect(() => {
        if (!authLoading && !user) navigate('/login');
    }, [user, authLoading, navigate]);

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
                                                <tr className="hover:bg-blue-50/40">
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
                            <SectionTitle title="Hóa đơn" description="Theo dõi chi phí khám và trạng thái thanh toán." />
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
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-50">
                                            {invoices.map(invoice => (
                                                <tr key={invoice.id} className="hover:bg-blue-50/40">
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
