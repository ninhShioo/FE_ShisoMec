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

const defaultSchedule = (dayOfWeek) => ({
    dayOfWeek,
    startTime: '',
    endTime: '',
    breakStart: '',
    breakEnd: '',
    slotIntervalMinutes: 30,
    isActive: false
});

const normalizeSchedule = (rows) => {
    const byDay = new Map((rows || []).map((row) => [Number(row.dayOfWeek), row]));
    return dayLabels.map((_, dayOfWeek) => {
        const row = byDay.get(dayOfWeek);
        if (!row) return defaultSchedule(dayOfWeek);

        return {
            dayOfWeek,
            startTime: String(row.startTime || '').slice(0, 5),
            endTime: String(row.endTime || '').slice(0, 5),
            breakStart: row.breakStart ? String(row.breakStart).slice(0, 5) : '',
            breakEnd: row.breakEnd ? String(row.breakEnd).slice(0, 5) : '',
            slotIntervalMinutes: Number(row.slotIntervalMinutes || 30),
            isActive: Number(row.isActive) === 1
        };
    });
};

const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

const timeToMinutes = (value) => {
    if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return NaN;
    const [hour, minute] = String(value).split(':').map(Number);
    return hour * 60 + minute;
};

const minutesToTime = (minutes) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const rangesOverlap = (startA, endA, startB, endB) => startA < endB && startB < endA;

const getSlotPreview = (schedule) => {
    if (!schedule.isActive) return [];

    const start = timeToMinutes(schedule.startTime);
    const end = timeToMinutes(schedule.endTime);
    const interval = Number(schedule.slotIntervalMinutes || 30);
    const hasBreak = schedule.breakStart && schedule.breakEnd;
    const breakStart = hasBreak ? timeToMinutes(schedule.breakStart) : null;
    const breakEnd = hasBreak ? timeToMinutes(schedule.breakEnd) : null;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || interval < 15) return [];

    const slots = [];
    for (let minutes = start; minutes + interval <= end; minutes += interval) {
        const slotEnd = minutes + interval;
        if (hasBreak && rangesOverlap(minutes, slotEnd, breakStart, breakEnd)) continue;
        slots.push(minutesToTime(minutes));
    }
    return slots;
};

export default function DentistDayOffTab() {
    const { user } = useContext(AuthContext);
    const [schedule, setSchedule] = useState(dayLabels.map((_, index) => defaultSchedule(index)));
    const [daysOff, setDaysOff] = useState([]);
    const [requests, setRequests] = useState([]);
    const [form, setForm] = useState({ offDate: '', reason: '' });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const userId = user?.id;

    const pendingCount = useMemo(() => requests.filter((request) => request.status === 'pending').length, [requests]);
    const activeSchedules = useMemo(() => schedule.filter((item) => item.isActive), [schedule]);
    const weeklySlotCount = useMemo(
        () => schedule.reduce((sum, item) => sum + getSlotPreview(item).length, 0),
        [schedule]
    );
    const nextApprovedDaysOff = useMemo(
        () => daysOff
            .filter((item) => String(item.offDate).slice(0, 10) >= todayValue())
            .slice(0, 3),
        [daysOff]
    );

    const fetchData = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const [scheduleRes, daysOffRes, requestsRes] = await Promise.all([
                api.get(`/schedules/dentist/${userId}`),
                api.get('/schedules/days-off'),
                api.get('/schedules/day-off-requests')
            ]);
            setSchedule(normalizeSchedule(scheduleRes.data.data || []));
            setDaysOff(daysOffRes.data.data || []);
            setRequests(requestsRes.data.data || []);
        } catch {
            toast.error('Không thể tải lịch làm việc.');
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
        return <Panel><div className="p-10 text-center font-bold text-slate-500">Đang tải lịch làm việc...</div></Panel>;
    }

    return (
        <div className="space-y-6">
            <Panel>
                <div className="border-b border-blue-100 bg-white px-6 py-5">
                    <p className="text-sm font-black uppercase text-blue-700">Lịch làm việc cá nhân</p>
                    <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-blue-950">Ca làm và ngày nghỉ của tôi</h2>
                            <p className="mt-2 text-sm text-slate-500">Bác sĩ chỉ xem lịch đã được admin/lễ tân cấu hình và gửi yêu cầu nghỉ khi cần.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <Summary label="Ngày làm" value={activeSchedules.length} />
                            <Summary label="Slot/tuần" value={weeklySlotCount} />
                            <Summary label="Chờ duyệt" value={pendingCount} />
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
                    <section>
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-black text-blue-950">Lịch tuần</h3>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Chỉ xem</span>
                        </div>
                        <div className="mt-4 grid gap-3">
                            {schedule.map((item) => <ScheduleRow key={item.dayOfWeek} item={item} />)}
                        </div>
                    </section>

                    <aside className="space-y-4">
                        <div className="rounded-2xl border border-blue-100 bg-[#F8FCFC] p-5">
                            <p className="text-sm font-black uppercase text-blue-700">Ngày nghỉ sắp tới</p>
                            <div className="mt-4 grid gap-2">
                                {nextApprovedDaysOff.length === 0 ? (
                                    <p className="rounded-xl bg-white p-3 text-sm font-bold text-slate-500">Chưa có ngày nghỉ đã duyệt.</p>
                                ) : nextApprovedDaysOff.map((item) => (
                                    <article key={item.id} className="rounded-xl bg-white p-3">
                                        <p className="font-black text-blue-950">{formatDate(item.offDate)}</p>
                                        <p className="mt-1 text-sm text-slate-500">{item.reason || 'Nghỉ'}</p>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-blue-100 bg-[#F8FCFC] p-5">
                            <p className="text-sm font-black uppercase text-blue-700">Tạo yêu cầu nghỉ</p>
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
                        </div>
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
                        <h3 className="font-black text-blue-950">Tất cả ngày nghỉ đã duyệt</h3>
                        <p className="mt-1 text-sm text-slate-500">Những ngày này sẽ không hiển thị slot đặt lịch cho khách.</p>
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

function ScheduleRow({ item }) {
    const slots = getSlotPreview(item);

    return (
        <article className={`rounded-2xl border p-4 ${item.isActive ? 'border-blue-100 bg-white' : 'border-slate-100 bg-slate-50'}`}>
            <div className="grid gap-4 xl:grid-cols-[150px_1fr_120px] xl:items-center">
                <div className="flex items-center justify-between gap-3 xl:block">
                    <p className="font-black text-blue-950">{dayLabels[item.dayOfWeek]}</p>
                    <span className={`mt-0 inline-flex rounded-full px-3 py-1 text-xs font-black xl:mt-2 ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.isActive ? 'Làm việc' : 'Nghỉ'}
                    </span>
                </div>

                {item.isActive ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <InfoPill label="Ca làm" value={`${item.startTime} - ${item.endTime}`} />
                        <InfoPill label="Nghỉ giữa ca" value={item.breakStart && item.breakEnd ? `${item.breakStart} - ${item.breakEnd}` : 'Không có'} />
                        <InfoPill label="Khoảng slot" value={`${item.slotIntervalMinutes} phút`} />
                    </div>
                ) : (
                    <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-500">Không nhận lịch trong ngày này.</div>
                )}

                <div className="rounded-xl bg-blue-50 px-4 py-3 text-center text-sm font-black text-blue-800">
                    {item.isActive ? `${slots.length} slot` : '0 slot'}
                </div>
            </div>

            {item.isActive && slots.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {slots.slice(0, 10).map((slot) => (
                        <span key={slot} className="rounded-full bg-[#F8FCFC] px-3 py-1 text-xs font-black text-slate-600">{slot}</span>
                    ))}
                    {slots.length > 10 && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">+{slots.length - 10}</span>}
                </div>
            )}
        </article>
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

function InfoPill({ label, value }) {
    return (
        <div className="rounded-xl bg-[#F8FCFC] px-4 py-3">
            <p className="text-xs font-black uppercase text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-black text-slate-700">{value}</p>
        </div>
    );
}

function Summary({ label, value }) {
    return (
        <div className="rounded-xl bg-blue-50 px-4 py-3">
            <p className="text-xl font-black text-blue-800">{value}</p>
            <p className="text-xs font-black uppercase text-slate-400">{label}</p>
        </div>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}
