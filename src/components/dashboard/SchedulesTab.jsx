import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const dayLabels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const defaultSchedule = (dayOfWeek) => ({
    dayOfWeek,
    startTime: '08:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    slotIntervalMinutes: 30,
    isActive: true
});

const normalizeSchedule = (rows) => {
    const byDay = new Map(rows.map((row) => [Number(row.dayOfWeek), row]));
    return dayLabels.map((_, dayOfWeek) => {
        const row = byDay.get(dayOfWeek);
        if (!row) return defaultSchedule(dayOfWeek);

        return {
            dayOfWeek,
            startTime: String(row.startTime || '08:00').slice(0, 5),
            endTime: String(row.endTime || '17:00').slice(0, 5),
            breakStart: row.breakStart ? String(row.breakStart).slice(0, 5) : '',
            breakEnd: row.breakEnd ? String(row.breakEnd).slice(0, 5) : '',
            slotIntervalMinutes: Number(row.slotIntervalMinutes || 30),
            isActive: Boolean(row.isActive)
        };
    });
};

export default function SchedulesTab() {
    const [dentists, setDentists] = useState([]);
    const [dentistId, setDentistId] = useState('');
    const [schedules, setSchedules] = useState(dayLabels.map((_, index) => defaultSchedule(index)));
    const [daysOff, setDaysOff] = useState([]);
    const [dayOffForm, setDayOffForm] = useState({ offDate: '', reason: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDentists = async () => {
            try {
                const res = await api.get('/users?role=dentist');
                const nextDentists = res.data.data || [];
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
                setSchedules(normalizeSchedule(scheduleRes.data.data || []));
                setDaysOff(daysOffRes.data.data || []);
            } catch {
                toast.error('Không thể tải lịch làm việc.');
            }
        };

        fetchSchedule();
    }, [dentistId]);

    const updateSchedule = (dayOfWeek, key, value) => {
        setSchedules((current) => current.map((item) => item.dayOfWeek === dayOfWeek ? { ...item, [key]: value } : item));
    };

    const saveSchedules = async () => {
        try {
            await api.put(`/schedules/dentist/${dentistId}`, { schedules });
            toast.success('Đã lưu lịch làm việc.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lưu lịch làm việc.');
        }
    };

    const addDayOff = async (event) => {
        event.preventDefault();
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
        } catch {
            toast.error('Không thể xóa ngày nghỉ.');
        }
    };

    if (loading) return <Panel><div className="p-10 text-center font-bold text-slate-500">Đang tải lịch làm việc...</div></Panel>;

    return (
        <Panel>
            <div className="border-b border-blue-100 bg-white px-6 py-5">
                <h2 className="text-xl font-black text-blue-950">Lịch làm việc bác sĩ</h2>
                <p className="mt-1 text-sm text-slate-500">Thiết lập giờ làm, giờ nghỉ trưa và ngày nghỉ để hệ thống tạo slot đặt lịch chính xác.</p>
            </div>

            <div className="p-6">
                <label className="block text-sm font-black text-slate-700">
                    Bác sĩ
                    <select value={dentistId} onChange={(event) => setDentistId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500">
                        {dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.fullName}</option>)}
                    </select>
                </label>

                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-blue-100">
                        <thead>
                            <tr className="bg-blue-50 text-left text-xs font-black uppercase text-slate-500">
                                <th className="px-4 py-3">Ngày</th>
                                <th className="px-4 py-3">Làm việc</th>
                                <th className="px-4 py-3">Bắt đầu</th>
                                <th className="px-4 py-3">Kết thúc</th>
                                <th className="px-4 py-3">Nghỉ từ</th>
                                <th className="px-4 py-3">Nghỉ đến</th>
                                <th className="px-4 py-3">Slot</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                            {schedules.map((item) => (
                                <tr key={item.dayOfWeek}>
                                    <td className="px-4 py-3 font-black text-blue-950">{dayLabels[item.dayOfWeek]}</td>
                                    <td className="px-4 py-3">
                                        <input type="checkbox" checked={item.isActive} onChange={(event) => updateSchedule(item.dayOfWeek, 'isActive', event.target.checked)} />
                                    </td>
                                    {['startTime', 'endTime', 'breakStart', 'breakEnd'].map((key) => (
                                        <td key={key} className="px-4 py-3">
                                            <input type="time" value={item[key]} onChange={(event) => updateSchedule(item.dayOfWeek, key, event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" />
                                        </td>
                                    ))}
                                    <td className="px-4 py-3">
                                        <input type="number" min="15" max="120" value={item.slotIntervalMinutes} onChange={(event) => updateSchedule(item.dayOfWeek, 'slotIntervalMinutes', Number(event.target.value))} className="w-20 rounded-lg border border-slate-200 px-3 py-2" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button onClick={saveSchedules} className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">Lưu lịch làm việc</button>

                <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                    <h3 className="font-black text-blue-950">Ngày nghỉ riêng</h3>
                    <form onSubmit={addDayOff} className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]">
                        <input type="date" value={dayOffForm.offDate} onChange={(event) => setDayOffForm({ ...dayOffForm, offDate: event.target.value })} required className="rounded-xl border border-slate-200 px-4 py-3" />
                        <input value={dayOffForm.reason} onChange={(event) => setDayOffForm({ ...dayOffForm, reason: event.target.value })} placeholder="Lý do nghỉ" className="rounded-xl border border-slate-200 px-4 py-3" />
                        <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">Thêm</button>
                    </form>

                    <div className="mt-4 grid gap-2">
                        {daysOff.length === 0 ? <p className="text-sm font-bold text-slate-500">Chưa có ngày nghỉ riêng.</p> : daysOff.map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                                <span className="text-sm font-bold text-slate-700">{new Date(item.offDate).toLocaleDateString('vi-VN')} - {item.reason || 'Nghỉ'}</span>
                                <button onClick={() => removeDayOff(item.id)} className="text-sm font-black text-rose-600">Xóa</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Panel>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}
