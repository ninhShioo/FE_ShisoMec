import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const dayLabels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const todayValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const defaultSchedule = (dayOfWeek, slotIntervalMinutes = 30) => ({
    dayOfWeek,
    startTime: '08:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    slotIntervalMinutes,
    isActive: ![0].includes(dayOfWeek)
});

const normalizeSchedule = (rows, defaultSlotInterval = 30) => {
    const byDay = new Map(rows.map((row) => [Number(row.dayOfWeek), row]));
    return dayLabels.map((_, dayOfWeek) => {
        const row = byDay.get(dayOfWeek);
        if (!row) return defaultSchedule(dayOfWeek, defaultSlotInterval);

        return {
            dayOfWeek,
            startTime: String(row.startTime || '08:00').slice(0, 5),
            endTime: String(row.endTime || '17:00').slice(0, 5),
            breakStart: row.breakStart ? String(row.breakStart).slice(0, 5) : '',
            breakEnd: row.breakEnd ? String(row.breakEnd).slice(0, 5) : '',
            slotIntervalMinutes: Number(row.slotIntervalMinutes || defaultSlotInterval),
            isActive: Boolean(row.isActive)
        };
    });
};

const timeToMinutes = (value) => {
    if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return NaN;
    const [hour, minute] = String(value || '00:00').slice(0, 5).split(':').map(Number);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return NaN;
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

const validateSchedule = (schedule) => {
    if (!schedule.isActive) return null;

    const start = timeToMinutes(schedule.startTime);
    const end = timeToMinutes(schedule.endTime);
    const interval = Number(schedule.slotIntervalMinutes);

    if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Giờ làm việc phải theo định dạng 24h HH:mm.';
    if (start >= end) return 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc.';
    if (!Number.isInteger(interval) || interval < 15 || interval > 120) return 'Slot phải từ 15 đến 120 phút.';

    if ((schedule.breakStart && !schedule.breakEnd) || (!schedule.breakStart && schedule.breakEnd)) {
        return 'Cần nhập đủ giờ nghỉ từ và nghỉ đến.';
    }

    if (schedule.breakStart && schedule.breakEnd) {
        const breakStart = timeToMinutes(schedule.breakStart);
        const breakEnd = timeToMinutes(schedule.breakEnd);
        if (!Number.isFinite(breakStart) || !Number.isFinite(breakEnd)) return 'Giờ nghỉ phải theo định dạng 24h HH:mm.';
        if (breakStart >= breakEnd || breakStart < start || breakEnd > end) {
            return 'Giờ nghỉ phải nằm trong giờ làm việc.';
        }
    }

    return null;
};

const presets = {
    office: {
        label: 'Thứ 2-6',
        description: '08:00-17:00, nghỉ 12:00-13:00',
        days: [1, 2, 3, 4, 5],
        schedule: { startTime: '08:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', slotIntervalMinutes: 30 }
    },
    saturday: {
        label: 'Thêm thứ 7',
        description: '08:00-12:00, không nghỉ giữa ca',
        days: [6],
        schedule: { startTime: '08:00', endTime: '12:00', breakStart: '', breakEnd: '', slotIntervalMinutes: 30 }
    },
    resetSunday: {
        label: 'Nghỉ Chủ nhật',
        description: 'Tắt nhận lịch Chủ nhật',
        days: [0],
        schedule: {}
    }
};

export default function SchedulesTab() {
    const [dentists, setDentists] = useState([]);
    const [dentistId, setDentistId] = useState('');
    const [schedules, setSchedules] = useState(dayLabels.map((_, index) => defaultSchedule(index)));
    const [systemSlotInterval, setSystemSlotInterval] = useState(30);
    const [daysOff, setDaysOff] = useState([]);
    const [dayOffRequests, setDayOffRequests] = useState([]);
    const [dayOffForm, setDayOffForm] = useState({ offDate: '', reason: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const selectedDentist = dentists.find((dentist) => String(dentist.id) === String(dentistId));
    const weeklySlotCount = useMemo(
        () => schedules.reduce((sum, schedule) => sum + getSlotPreview(schedule).length, 0),
        [schedules]
    );
    const activeDaysCount = schedules.filter((schedule) => schedule.isActive).length;
    const pendingRequests = dayOffRequests.filter((request) => request.status === 'pending');
    const validationErrors = schedules
        .map((schedule) => [schedule.dayOfWeek, validateSchedule(schedule)])
        .filter(([, error]) => error);

    useEffect(() => {
        const fetchDentists = async () => {
            try {
                const [dentistRes, settingsRes] = await Promise.all([
                    api.get('/users?role=dentist'),
                    api.get('/settings')
                ]);
                const nextDentists = dentistRes.data.data || [];
                const nextSlotInterval = Number(settingsRes.data.data?.slotIntervalMinutes || 30);
                setSystemSlotInterval(nextSlotInterval);
                setSchedules(dayLabels.map((_, index) => defaultSchedule(index, nextSlotInterval)));
                setDentists(nextDentists);
                if (nextDentists.length) setDentistId(String(nextDentists[0].id));
            } catch {
                toast.error('Không thể tải danh sách bác sĩ.');
            } finally {
                setLoading(false);
            }
        };
        fetchDentists();
    }, []);

    useEffect(() => {
        if (!dentistId) return;

        const fetchSchedule = async () => {
            try {
                const [scheduleRes, daysOffRes] = await Promise.all([
                    api.get(`/schedules/dentist/${dentistId}`),
                    api.get('/schedules/days-off', { params: { dentistId } })
                ]);
                setSchedules(normalizeSchedule(scheduleRes.data.data || [], systemSlotInterval));
                setDaysOff(daysOffRes.data.data || []);
                const requestsRes = await api.get('/schedules/day-off-requests', { params: { status: 'pending' } });
                setDayOffRequests(requestsRes.data.data || []);
            } catch {
                toast.error('Không thể tải lịch làm việc.');
            }
        };

        fetchSchedule();
    }, [dentistId, systemSlotInterval]);

    const updateSchedule = (dayOfWeek, key, value) => {
        setSchedules((current) => current.map((item) => (
            item.dayOfWeek === dayOfWeek ? { ...item, [key]: value } : item
        )));
    };

    const applyPreset = (presetKey) => {
        const preset = presets[presetKey];
        setSchedules((current) => current.map((item) => {
            if (!preset.days.includes(item.dayOfWeek)) return item;
            return {
                ...item,
                ...preset.schedule,
                slotIntervalMinutes: presetKey === 'resetSunday' ? item.slotIntervalMinutes : systemSlotInterval,
                isActive: presetKey !== 'resetSunday'
            };
        }));
    };

    const saveSchedules = async () => {
        if (!dentistId) {
            toast.error('Vui lòng chọn bác sĩ.');
            return;
        }

        if (validationErrors.length > 0) {
            const [dayOfWeek, error] = validationErrors[0];
            toast.error(`${dayLabels[dayOfWeek]}: ${error}`);
            return;
        }

        try {
            setSaving(true);
            await api.put(`/schedules/dentist/${dentistId}`, { schedules });
            toast.success('Đã lưu lịch làm việc.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lưu lịch làm việc.');
        } finally {
            setSaving(false);
        }
    };

    const addDayOff = async (event) => {
        event.preventDefault();
        if (!dentistId) return toast.error('Vui lòng chọn bác sĩ.');

        try {
            await api.post('/schedules/days-off', {
                dentistId: Number(dentistId),
                ...dayOffForm
            });
            setDayOffForm({ offDate: '', reason: '' });
            const res = await api.get('/schedules/days-off', { params: { dentistId } });
            setDaysOff(res.data.data || []);
            toast.success('Đã thêm ngày nghỉ.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể thêm ngày nghỉ.');
        }
    };

    const removeDayOff = async (id) => {
        try {
            await api.delete(`/schedules/days-off/${id}`);
            setDaysOff((current) => current.filter((item) => item.id !== id));
            toast.success('Đã xóa ngày nghỉ.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa ngày nghỉ.');
        }
    };

    const reviewDayOffRequest = async (request, status) => {
        const defaultNote = status === 'approved' ? 'Đã duyệt ngày nghỉ.' : 'Chưa phù hợp với lịch làm việc.';
        const reviewNote = window.prompt(status === 'approved' ? 'Ghi chú duyệt:' : 'Lý do từ chối:', defaultNote);
        if (reviewNote === null) return;

        try {
            await api.put(`/schedules/day-off-requests/${request.id}`, { status, reviewNote });
            setDayOffRequests((current) => current.filter((item) => item.id !== request.id));
            if (status === 'approved' && String(request.dentistId) === String(dentistId)) {
                const res = await api.get('/schedules/days-off', { params: { dentistId } });
                setDaysOff(res.data.data || []);
            }
            toast.success(status === 'approved' ? 'Đã duyệt yêu cầu nghỉ.' : 'Đã từ chối yêu cầu nghỉ.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xử lý yêu cầu nghỉ.');
        }
    };

    if (loading) return <Panel><div className="p-10 text-center font-bold text-slate-500">Đang tải lịch làm việc...</div></Panel>;

    return (
        <Panel>
            <div className="border-b border-blue-100 bg-white px-6 py-5">
                <p className="text-sm font-black uppercase text-blue-700">Lịch làm việc</p>
                <h2 className="mt-1 text-2xl font-black text-blue-950">Ca khám và ngày nghỉ bác sĩ</h2>
                <p className="mt-2 text-sm text-slate-500">Lịch ở đây quyết định trực tiếp các khung giờ khách có thể đặt.</p>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[280px_1fr]">
                <aside className="space-y-4">
                    <label className="block text-sm font-black text-slate-700">
                        Bác sĩ
                        <select value={dentistId} onChange={(event) => setDentistId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500">
                            {dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.fullName}</option>)}
                        </select>
                    </label>

                    <div className="rounded-2xl border border-blue-100 bg-[#F8FCFC] p-4">
                        <p className="text-xs font-black uppercase text-slate-400">Tổng quan</p>
                        <p className="mt-2 text-lg font-black text-blue-950">{selectedDentist?.fullName || 'Chưa chọn bác sĩ'}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <Summary label="Ngày làm" value={activeDaysCount} />
                            <Summary label="Slot/tuần" value={weeklySlotCount} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-white p-4">
                        <p className="text-sm font-black text-blue-950">Thao tác nhanh</p>
                        <div className="mt-3 grid gap-2">
                            {Object.entries(presets).map(([key, preset]) => (
                                <button key={key} type="button" onClick={() => applyPreset(key)} className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-left hover:bg-blue-50">
                                    <span className="block text-sm font-black text-blue-800">{preset.label}</span>
                                    <span className="mt-1 block text-xs font-semibold text-slate-500">{preset.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-sm font-black text-amber-800">Yêu cầu nghỉ chờ duyệt</p>
                        <p className="mt-1 text-xs font-bold text-amber-700">{pendingRequests.length} yêu cầu đang chờ</p>
                        <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1">
                            {pendingRequests.length === 0 ? (
                                <p className="rounded-xl bg-white/70 p-3 text-sm font-bold text-slate-500">Không có yêu cầu mới.</p>
                            ) : pendingRequests.map((request) => (
                                <article key={request.id} className="rounded-xl bg-white p-3">
                                    <p className="font-black text-blue-950">{request.dentistName}</p>
                                    <p className="mt-1 text-sm font-bold text-slate-600">{new Date(request.offDate).toLocaleDateString('vi-VN')}</p>
                                    {request.reason && <p className="mt-1 text-sm leading-5 text-slate-500">{request.reason}</p>}
                                    <div className="mt-3 flex gap-2">
                                        <button type="button" onClick={() => reviewDayOffRequest(request, 'approved')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Duyệt</button>
                                        <button type="button" onClick={() => reviewDayOffRequest(request, 'rejected')} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Từ chối</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </aside>

                <section className="space-y-5">
                    {validationErrors.length > 0 && (
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                            {dayLabels[validationErrors[0][0]]}: {validationErrors[0][1]}
                        </div>
                    )}

                    <div className="grid gap-3">
                        {schedules.map((item) => {
                            const slots = getSlotPreview(item);
                            const error = validateSchedule(item);

                            return (
                                <article key={item.dayOfWeek} className={`rounded-2xl border p-4 ${item.isActive ? 'border-blue-100 bg-white' : 'border-slate-100 bg-slate-50'}`}>
                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                                        <div className="flex min-w-[150px] items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={item.isActive}
                                                onChange={(event) => updateSchedule(item.dayOfWeek, 'isActive', event.target.checked)}
                                                className="h-5 w-5 rounded border-slate-300 text-blue-700"
                                            />
                                            <div>
                                                <p className="font-black text-blue-950">{dayLabels[item.dayOfWeek]}</p>
                                                <p className={`text-xs font-bold ${item.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>{item.isActive ? 'Nhận lịch' : 'Nghỉ cố định'}</p>
                                            </div>
                                        </div>

                                        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(96px,1fr)_minmax(96px,1fr)_minmax(96px,1fr)_minmax(96px,1fr)_88px]">
                                            <TimeField label="Bắt đầu" value={item.startTime} disabled={!item.isActive} onChange={(value) => updateSchedule(item.dayOfWeek, 'startTime', value)} />
                                            <TimeField label="Kết thúc" value={item.endTime} disabled={!item.isActive} onChange={(value) => updateSchedule(item.dayOfWeek, 'endTime', value)} />
                                            <TimeField label="Nghỉ từ" value={item.breakStart} disabled={!item.isActive} onChange={(value) => updateSchedule(item.dayOfWeek, 'breakStart', value)} />
                                            <TimeField label="Nghỉ đến" value={item.breakEnd} disabled={!item.isActive} onChange={(value) => updateSchedule(item.dayOfWeek, 'breakEnd', value)} />
                                            <label className="block text-xs font-black uppercase text-slate-400">
                                                Slot
                                                <input
                                                    type="number"
                                                    min="15"
                                                    max="120"
                                                    step="5"
                                                    disabled={!item.isActive}
                                                    value={item.slotIntervalMinutes}
                                                    onChange={(event) => updateSchedule(item.dayOfWeek, 'slotIntervalMinutes', Number(event.target.value))}
                                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                                />
                                            </label>
                                        </div>

                                        <div className="w-full rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 xl:w-[120px] xl:shrink-0">
                                            {item.isActive ? `${slots.length} slot` : 'Không nhận lịch'}
                                        </div>
                                    </div>

                                    {error && (
                                        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">{error}</p>
                                    )}
                                    {item.isActive && slots.length > 0 && (
                                        <p className="mt-3 text-xs font-semibold leading-6 text-slate-500">
                                            Slot đầu: {slots.slice(0, 4).join(', ')}{slots.length > 4 ? ` ... Slot cuối: ${slots[slots.length - 1]}` : ''}
                                        </p>
                                    )}
                                </article>
                            );
                        })}
                    </div>

                    <div className="flex justify-end">
                        <button disabled={saving || validationErrors.length > 0} onClick={saveSchedules} className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto">
                            {saving ? 'Đang lưu...' : 'Lưu lịch làm việc'}
                        </button>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm font-black uppercase text-blue-700">Ngày nghỉ riêng</p>
                                <h3 className="mt-1 font-black text-blue-950">Nghỉ đột xuất, công tác, đào tạo</h3>
                            </div>
                        </div>

                        <form onSubmit={addDayOff} className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]">
                            <input type="date" min={todayValue()} value={dayOffForm.offDate} onChange={(event) => setDayOffForm({ ...dayOffForm, offDate: event.target.value })} required className="rounded-xl border border-slate-200 bg-white px-4 py-3" />
                            <input value={dayOffForm.reason} onChange={(event) => setDayOffForm({ ...dayOffForm, reason: event.target.value })} placeholder="Lý do nghỉ" className="rounded-xl border border-slate-200 bg-white px-4 py-3" />
                            <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">Thêm</button>
                        </form>

                        <div className="mt-4 grid gap-2">
                            {daysOff.length === 0 ? <p className="text-sm font-bold text-slate-500">Chưa có ngày nghỉ riêng.</p> : daysOff.map((item) => (
                                <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="text-sm font-bold text-slate-700">{new Date(item.offDate).toLocaleDateString('vi-VN')} - {item.reason || 'Nghỉ'}</span>
                                    <button type="button" onClick={() => removeDayOff(item.id)} className="text-left text-sm font-black text-rose-600 sm:text-right">Xóa</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </Panel>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function Summary({ label, value }) {
    return (
        <div className="rounded-xl bg-white p-3">
            <p className="text-2xl font-black text-blue-800">{value}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-400">{label}</p>
        </div>
    );
}

function TimeField({ label, value, disabled, onChange }) {
    return (
        <label className="block text-xs font-black uppercase text-slate-400">
            {label}
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{2}:[0-9]{2}"
                placeholder="08:00"
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold tabular-nums outline-none disabled:bg-slate-100 disabled:text-slate-400"
            />
        </label>
    );
}
