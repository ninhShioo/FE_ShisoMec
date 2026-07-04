import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const todayValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('vi-VN');
};

const formatDateTime = (date, time) => {
    const clock = String(time || '').slice(0, 5);
    return `${formatDate(date)}${clock ? ` · ${clock}` : ''}`;
};

const parseList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export default function RecordsTab() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [followUpFilter, setFollowUpFilter] = useState('all');
    const [selectedRecord, setSelectedRecord] = useState(null);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const params = {};
            if (search.trim()) params.search = search.trim();
            if (followUpFilter !== 'all') params.followUp = followUpFilter;

            const res = await api.get('/records', { params });
            setRecords(res.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải hồ sơ khám.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const summary = useMemo(() => {
        const today = todayValue();
        const due = records.filter(record => record.nextAppointmentDate && String(record.nextAppointmentDate).slice(0, 10) <= today).length;
        const upcoming = records.filter(record => record.nextAppointmentDate && String(record.nextAppointmentDate).slice(0, 10) > today).length;
        const reminded = records.filter(record => record.nextAppointmentReminderSentAt || record.nextAppointmentEmailReminderSentAt).length;

        return { total: records.length, due, upcoming, reminded };
    }, [records]);

    const handleFilterSubmit = (event) => {
        event.preventDefault();
        fetchRecords();
    };

    if (loading) {
        return <Panel><div className="p-10 text-center font-bold text-slate-500">Đang tải hồ sơ khám...</div></Panel>;
    }

    return (
        <Panel>
            <div className="border-b border-blue-100 bg-white px-6 py-5">
                <p className="text-sm font-black uppercase text-blue-700">Hồ sơ khám điện tử</p>
                <h2 className="mt-1 text-2xl font-black text-blue-950">Danh sách hồ sơ điều trị</h2>
                <p className="mt-2 text-sm text-slate-500">Tra cứu chẩn đoán, kế hoạch điều trị, răng điều trị, tài liệu và lịch tái khám.</p>
            </div>

            <div className="grid gap-3 border-b border-blue-100 bg-[#F8FCFC] p-5 md:grid-cols-4">
                <Summary label="Tổng hồ sơ" value={summary.total} />
                <Summary label="Tái khám đến hạn" value={summary.due} tone="rose" />
                <Summary label="Tái khám sắp tới" value={summary.upcoming} tone="blue" />
                <Summary label="Đã nhắc" value={summary.reminded} tone="emerald" />
            </div>

            <form onSubmit={handleFilterSubmit} className="flex flex-col gap-3 border-b border-blue-100 bg-white p-5 md:flex-row md:items-end">
                <label className="flex-1 text-sm font-black text-slate-700">
                    Tìm hồ sơ
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Tên khách, SĐT, chẩn đoán, bác sĩ..."
                        className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    />
                </label>
                <label className="text-sm font-black text-slate-700 md:w-56">
                    Tái khám
                    <select
                        value={followUpFilter}
                        onChange={(event) => setFollowUpFilter(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    >
                        <option value="all">Tất cả</option>
                        <option value="due">Đến hạn</option>
                        <option value="upcoming">Sắp tới</option>
                    </select>
                </label>
                <button type="submit" className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                    Lọc
                </button>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                    <thead className="bg-blue-50 text-xs font-black uppercase text-slate-500">
                        <tr>
                            <th className="px-5 py-4">Khách hàng</th>
                            <th className="px-5 py-4">Ngày khám</th>
                            <th className="px-5 py-4">Bác sĩ</th>
                            <th className="px-5 py-4">Chẩn đoán</th>
                            <th className="px-5 py-4">Tái khám</th>
                            <th className="px-5 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50 bg-white">
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                                    Chưa có hồ sơ khám phù hợp.
                                </td>
                            </tr>
                        ) : records.map((record) => (
                            <tr key={record.id} className="hover:bg-blue-50/40">
                                <td className="px-5 py-4">
                                    <p className="font-black text-blue-950">{record.patientName || `Bệnh nhân #${record.patientId}`}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">{record.patientPhone || record.patientEmail || '-'}</p>
                                </td>
                                <td className="px-5 py-4 text-sm font-bold text-slate-600">{formatDateTime(record.appointmentDate, record.appointmentTime)}</td>
                                <td className="px-5 py-4 text-sm font-bold text-slate-600">{record.dentistName || '-'}</td>
                                <td className="max-w-xs px-5 py-4">
                                    <p className="line-clamp-2 text-sm font-bold text-blue-950">{record.diagnosis}</p>
                                    {record.serviceNames && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{record.serviceNames}</p>}
                                </td>
                                <td className="px-5 py-4">
                                    <FollowUpBadge record={record} />
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRecord(record)}
                                        className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                                    >
                                        Chi tiết
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedRecord && (
                <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
            )}
        </Panel>
    );
}

function Panel({ children }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">
            {children}
        </section>
    );
}

function Summary({ label, value, tone = 'slate' }) {
    const tones = {
        slate: 'bg-white text-blue-950',
        rose: 'bg-rose-50 text-rose-700',
        blue: 'bg-blue-50 text-blue-700',
        emerald: 'bg-emerald-50 text-emerald-700'
    };

    return (
        <div className={`rounded-2xl border border-blue-100 p-4 ${tones[tone] || tones.slate}`}>
            <p className="text-xs font-black uppercase opacity-70">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
        </div>
    );
}

function FollowUpBadge({ record }) {
    if (!record.nextAppointmentDate) {
        return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Không hẹn</span>;
    }

    const date = String(record.nextAppointmentDate).slice(0, 10);
    const isDue = date <= todayValue();
    const reminded = record.nextAppointmentReminderSentAt || record.nextAppointmentEmailReminderSentAt;

    return (
        <div className="space-y-1">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${isDue ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>
                {isDue ? 'Đến hạn' : 'Sắp tới'} · {formatDate(record.nextAppointmentDate)}
            </span>
            {reminded && <p className="text-xs font-bold text-emerald-700">Đã gửi nhắc</p>}
        </div>
    );
}

function RecordDetailModal({ record, onClose }) {
    const toothPositions = parseList(record.toothPositions);
    const sessions = parseList(record.treatmentSessions);
    const attachments = parseList(record.attachments);

    return (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/40 p-4">
            <div className="mx-auto my-8 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-[#F8FCFC] px-6 py-5">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Hồ sơ khám #{record.id}</p>
                        <h3 className="mt-1 text-2xl font-black text-blue-950">{record.patientName || `Bệnh nhân #${record.patientId}`}</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                            {formatDateTime(record.appointmentDate, record.appointmentTime)} · {record.dentistName || 'Bác sĩ phụ trách'}
                        </p>
                    </div>
                    <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white text-xl font-black text-slate-500 hover:bg-blue-50">×</button>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-2">
                    <Info title="Lý do khám" value={record.chiefComplaint} />
                    <Info title="Chẩn đoán" value={record.diagnosis} />
                    <Info title="Kế hoạch điều trị" value={record.treatmentPlan} wide />
                    <Info title="Thủ thuật đã thực hiện" value={record.procedures} wide />
                    <Info title="Đơn thuốc" value={record.prescription} />
                    <Info title="Dặn dò" value={record.notes} />
                    <Info
                        title="Tái khám"
                        value={record.nextAppointmentDate ? `${formatDate(record.nextAppointmentDate)}${record.nextAppointmentNote ? ` - ${record.nextAppointmentNote}` : ''}` : 'Không hẹn tái khám'}
                        wide
                    />
                    <Info title="Răng điều trị" value={toothPositions.length ? toothPositions.join(', ') : 'Chưa chọn'} />
                    <Info title="Dịch vụ" value={record.serviceNames || '-'} />
                </div>

                {sessions.length > 0 && (
                    <div className="border-t border-blue-100 px-6 py-5">
                        <h4 className="font-black text-blue-950">Kế hoạch nhiều buổi</h4>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {sessions.map((session, index) => (
                                <div key={`${session.title || index}-${index}`} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-sm">
                                    <p className="font-black text-blue-950">{session.title || `Buổi ${index + 1}`}</p>
                                    <p className="mt-1 text-slate-600">{session.plannedDate ? formatDate(session.plannedDate) : 'Chưa có ngày'} · {session.status || 'planned'}</p>
                                    {session.note && <p className="mt-2 text-slate-600">{session.note}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {attachments.length > 0 && (
                    <div className="border-t border-blue-100 px-6 py-5">
                        <h4 className="font-black text-blue-950">Tài liệu đính kèm</h4>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {attachments.map((url, index) => (
                                <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
                                    Tài liệu {index + 1}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Info({ title, value, wide = false }) {
    return (
        <div className={`rounded-xl border border-blue-100 bg-[#F8FCFC] p-4 ${wide ? 'md:col-span-2' : ''}`}>
            <p className="text-xs font-black uppercase text-slate-500">{title}</p>
            <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-blue-950">{value || '-'}</p>
        </div>
    );
}
