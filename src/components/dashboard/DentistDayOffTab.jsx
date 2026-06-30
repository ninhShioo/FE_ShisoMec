import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { AuthContext } from '../../context/auth-context';

const dayLabels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const todayValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const statusMeta = {
    pending: ['Chờ duyệt', 'bg-amber-50 text-amber-700'],
    approved: ['Đã duyệt', 'bg-emerald-50 text-emerald-700'],
    rejected: ['Từ chối', 'bg-rose-50 text-rose-700']
};

const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

export default function DentistDayOffTab() {
    const { user } = useContext(AuthContext);
    const [schedule, setSchedule] = useState([]);
    const [daysOff, setDaysOff] = useState([]);
    const [requests, setRequests] = useState([]);
    const [form, setForm] = useState({ offDate: '', reason: '' });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const userId = user?.id;

    const pendingCount = useMemo(() => requests.filter((request) => request.status === 'pending').length, [requests]);

    const fetchData = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const [scheduleRes, daysOffRes, requestsRes] = await Promise.all([
                api.get(`/schedules/dentist/${userId}`),
                api.get('/schedules/days-off'),
                api.get('/schedules/day-off-requests')
            ]);
            setSchedule(scheduleRes.data.data || []);
            setDaysOff(daysOffRes.data.data || []);
            setRequests(requestsRes.data.data || []);
        } catch {
            toast.error('Không thể tải lịch nghỉ.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) fetchData();
    }, [fetchData, userId]);

    const submitRequest = async (event) => {
        event.preventDefault();
        try {
            setSubmitting(true);
            await api.post('/schedules/day-off-requests', form);
            setForm({ offDate: '', reason: '' });
            await fetchData();
            toast.success('Đã gửi yêu cầu nghỉ.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu nghỉ.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <Panel><div className="p-10 text-center font-bold text-slate-500">Đang tải lịch nghỉ...</div></Panel>;
    }

    return (
        <div className="space-y-6">
            <Panel>
                <div className="border-b border-blue-100 bg-white px-6 py-5">
                    <p className="text-sm font-black uppercase text-blue-700">Đăng ký nghỉ</p>
                    <h2 className="mt-1 text-2xl font-black text-blue-950">Yêu cầu ngày nghỉ của tôi</h2>
                    <p className="mt-2 text-sm text-slate-500">Gửi yêu cầu nghỉ để admin/lễ tân duyệt trước khi hệ thống khóa lịch đặt khám.</p>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
                    <section>
                        <h3 className="font-black text-blue-950">Lịch làm việc cố định</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {schedule.map((item) => (
                                <article key={item.dayOfWeek} className={`rounded-2xl border p-4 ${Number(item.isActive) === 1 ? 'border-blue-100 bg-white' : 'border-slate-100 bg-slate-50'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-black text-blue-950">{dayLabels[item.dayOfWeek]}</p>
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${Number(item.isActive) === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {Number(item.isActive) === 1 ? 'Làm việc' : 'Nghỉ'}
                                        </span>
                                    </div>
                                    {Number(item.isActive) === 1 && (
                                        <p className="mt-3 text-sm font-bold text-slate-600">
                                            {String(item.startTime).slice(0, 5)} - {String(item.endTime).slice(0, 5)}
                                            {item.breakStart && item.breakEnd ? ` · Nghỉ ${String(item.breakStart).slice(0, 5)}-${String(item.breakEnd).slice(0, 5)}` : ''}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>

                    <aside className="rounded-2xl border border-blue-100 bg-[#F8FCFC] p-5">
                        <p className="text-sm font-black uppercase text-blue-700">Tạo yêu cầu</p>
                        <form onSubmit={submitRequest} className="mt-4 space-y-4">
                            <label className="block text-sm font-bold text-slate-700">
                                Ngày muốn nghỉ
                                <input type="date" min={todayValue()} value={form.offDate} onChange={(event) => setForm({ ...form, offDate: event.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500" />
                            </label>
                            <label className="block text-sm font-bold text-slate-700">
                                Lý do
                                <textarea rows="4" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Ví dụ: nghỉ cá nhân, công tác, đào tạo..." className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500" />
                            </label>
                            <button disabled={submitting} className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:bg-slate-300">
                                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu nghỉ'}
                            </button>
                        </form>
                    </aside>
                </div>
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel>
                    <div className="border-b border-blue-100 px-6 py-5">
                        <h3 className="font-black text-blue-950">Yêu cầu đã gửi</h3>
                        <p className="mt-1 text-sm text-slate-500">{pendingCount} yêu cầu đang chờ duyệt.</p>
                    </div>
                    <RequestList requests={requests} />
                </Panel>

                <Panel>
                    <div className="border-b border-blue-100 px-6 py-5">
                        <h3 className="font-black text-blue-950">Ngày nghỉ đã duyệt</h3>
                        <p className="mt-1 text-sm text-slate-500">Những ngày này sẽ không hiển thị slot đặt lịch.</p>
                    </div>
                    <div className="grid gap-2 p-6">
                        {daysOff.length === 0 ? (
                            <p className="text-sm font-bold text-slate-500">Chưa có ngày nghỉ đã duyệt.</p>
                        ) : daysOff.map((item) => (
                            <article key={item.id} className="rounded-xl border border-blue-100 bg-white p-4">
                                <p className="font-black text-blue-950">{formatDate(item.offDate)}</p>
                                <p className="mt-1 text-sm text-slate-500">{item.reason || 'Nghỉ'}</p>
                            </article>
                        ))}
                    </div>
                </Panel>
            </div>
        </div>
    );
}

function RequestList({ requests }) {
    if (requests.length === 0) {
        return <div className="p-6 text-sm font-bold text-slate-500">Chưa gửi yêu cầu nghỉ nào.</div>;
    }

    return (
        <div className="grid gap-2 p-6">
            {requests.map((request) => {
                const [label, className] = statusMeta[request.status] || [request.status, 'bg-slate-100 text-slate-600'];
                return (
                    <article key={request.id} className="rounded-xl border border-blue-100 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-black text-blue-950">{formatDate(request.offDate)}</p>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>
                        </div>
                        {request.reason && <p className="mt-2 text-sm text-slate-600">{request.reason}</p>}
                        {request.reviewNote && <p className="mt-2 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-800">{request.reviewNote}</p>}
                    </article>
                );
            })}
        </div>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}
