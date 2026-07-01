import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from '../../context/auth-context';
import { useLocation } from 'react-router-dom';
import { getHighlightClass } from '../../utils/notificationNavigation';

const todayValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const workflowStatusSteps = [
    ['pending', 'Chờ xác nhận'],
    ['confirmed', 'Đã xác nhận'],
    ['arrived', 'Đã đến'],
    ['in_progress', 'Đang khám'],
    ['completed', 'Hoàn thành']
];

const getStatusMeta = (status) => ({
    pending: ['Chờ xác nhận', 'bg-amber-50 text-amber-700'],
    confirmed: ['Đã xác nhận', 'bg-blue-50 text-blue-700'],
    arrived: ['Khách đã đến', 'bg-cyan-50 text-cyan-700'],
    in_progress: ['Đang khám', 'bg-indigo-50 text-indigo-700'],
    completed: ['Hoàn thành', 'bg-emerald-50 text-emerald-700'],
    cancelled: ['Đã hủy', 'bg-rose-50 text-rose-700'],
    no_show: ['Không đến', 'bg-slate-100 text-slate-600']
}[status] || [status, 'bg-slate-100 text-slate-600']);

const emptyRecordForm = {
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    treatmentSessions: [],
    procedures: '',
    toothPositions: [],
    prescription: '',
    notes: '',
    nextAppointmentDate: '',
    nextAppointmentNote: '',
    attachments: []
};

const toothNumbers = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
];

export default function AppointmentsTab() {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const isFrontDesk = user.role === 'admin' || user.role === 'staff';
    const isDentist = user.role === 'dentist';
    const queryHighlight = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            type: params.get('highlightType'),
            id: params.get('highlightId')
        };
    }, [location.search]);
    const [highlight, setHighlight] = useState(queryHighlight);

    const [appointments, setAppointments] = useState([]);
    const [dentists, setDentists] = useState([]);
    const [patients, setPatients] = useState([]);
    const [services, setServices] = useState([]);
    const [changeRequests, setChangeRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedDentists, setSelectedDentists] = useState({});
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [detailAppt, setDetailAppt] = useState(null);
    const [recordForm, setRecordForm] = useState(emptyRecordForm);
    const [rescheduleAppt, setRescheduleAppt] = useState(null);
    const [rescheduleForm, setRescheduleForm] = useState({ appointmentDate: '', appointmentTime: '', reason: '', note: '' });
    const [filters, setFilters] = useState({ date: '', dentistId: 'all', status: 'all', sort: 'date_desc' });
    const [patientRecordHistory, setPatientRecordHistory] = useState([]);

    useEffect(() => {
        setHighlight(queryHighlight);
        if (!queryHighlight.type || !queryHighlight.id) return undefined;

        const timer = window.setTimeout(() => setHighlight({ type: null, id: null }), 4200);
        return () => window.clearTimeout(timer);
    }, [queryHighlight]);

    useEffect(() => {
        if (loading || highlight.type !== 'appointment' || !highlight.id) return;

        const timer = window.setTimeout(() => {
            document.getElementById(`appointment-row-${highlight.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);

        return () => window.clearTimeout(timer);
    }, [loading, highlight.type, highlight.id]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [createForm, setCreateForm] = useState({
        patientId: '',
        dentistId: '',
        appointmentDate: '',
        appointmentTime: '',
        notes: '',
        serviceIds: []
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.date) params.date = filters.date;
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.sort) params.sort = filters.sort;
            if (isFrontDesk && filters.dentistId !== 'all') params.dentistId = filters.dentistId;

            const resAppt = await api.get('/appointments', { params });
            const nextAppointments = resAppt.data.data || [];
            setAppointments(nextAppointments);
            setDetailAppt(current => {
                if (!current) return current;
                return nextAppointments.find(appointment => appointment.id === current.id) || current;
            });

            if (isFrontDesk) {
                const [resDentists, resPatients, resServices] = await Promise.all([
                    api.get('/users?role=dentist'),
                    api.get('/users?role=patient'),
                    api.get('/services')
                ]);
                setDentists(resDentists.data.data || []);
                setPatients(resPatients.data.data || []);
                setServices(resServices.data.data || []);

                if (user.role === 'admin') {
                    const resRequests = await api.get('/appointments/dentist-change-requests');
                    setChangeRequests(resRequests.data.data || []);
                }
            }
        } catch {
            setError('Không thể tải lịch hẹn.');
        } finally {
            setLoading(false);
        }
    }, [filters, isFrontDesk, user.role]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleCreateService = (serviceId) => {
        setCreateForm(current => ({
            ...current,
            serviceIds: current.serviceIds.includes(serviceId)
                ? current.serviceIds.filter(id => id !== serviceId)
                : [...current.serviceIds, serviceId]
        }));
    };

    const resetCreateForm = () => {
        setCreateForm({ patientId: '', dentistId: '', appointmentDate: '', appointmentTime: '', notes: '', serviceIds: [] });
    };

    const patchAppointmentState = (appointmentId, changes) => {
        setAppointments(current => current.map(appointment => (
            appointment.id === appointmentId ? { ...appointment, ...changes } : appointment
        )));
        setDetailAppt(current => (
            current?.id === appointmentId ? { ...current, ...changes } : current
        ));
        setSelectedAppt(current => (
            current?.id === appointmentId ? { ...current, ...changes } : current
        ));
    };

    const handleCreateAppointment = async (event) => {
        event.preventDefault();
        if (!createForm.patientId || !createForm.appointmentDate || !createForm.appointmentTime || createForm.serviceIds.length === 0) {
            toast.error('Vui lòng chọn khách hàng, thời gian và ít nhất một dịch vụ.');
            return;
        }

        try {
            await api.post('/appointments', {
                patientId: Number(createForm.patientId),
                dentistId: createForm.dentistId ? Number(createForm.dentistId) : undefined,
                appointmentDate: createForm.appointmentDate,
                appointmentTime: createForm.appointmentTime,
                notes: createForm.notes,
                serviceIds: createForm.serviceIds
            });
            toast.success('Đã tạo lịch hẹn cho khách hàng.');
            resetCreateForm();
            setShowCreateForm(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể tạo lịch hẹn.');
        }
    };

    const handleConfirmAndAssign = async (appointmentId) => {
        const dentistId = selectedDentists[appointmentId];
        if (!dentistId) {
            toast.error('Vui lòng chọn bác sĩ phụ trách.');
            return;
        }

        try {
            await api.put(`/appointments/${appointmentId}/assign`, { dentistId });
            await api.put(`/appointments/${appointmentId}/status`, { status: 'confirmed' });
            toast.success('Đã xác nhận lịch và phân công bác sĩ.');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xác nhận lịch.');
        }
    };

    const handleReviewDentistChange = async (requestId, status) => {
        try {
            await api.put(`/appointments/dentist-change-requests/${requestId}`, { status });
            toast.success(status === 'approved' ? 'Đã duyệt đổi bác sĩ.' : 'Đã từ chối yêu cầu.');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xử lý yêu cầu đổi bác sĩ.');
        }
    };

    const handleAssignOnly = async (appointmentId) => {
        const dentistId = selectedDentists[appointmentId];
        if (!dentistId) {
            toast.error('Vui lòng chọn bác sĩ mới.');
            return;
        }

        try {
            const res = await api.put(`/appointments/${appointmentId}/assign`, { dentistId });
            toast.success(res.data?.message || 'Đã cập nhật bác sĩ phụ trách.');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể đổi bác sĩ.');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        if (!window.confirm('Bạn muốn cập nhật trạng thái lịch hẹn này?')) return;
        try {
            await api.put(`/appointments/${id}/status`, { status });
            toast.success('Đã cập nhật lịch hẹn.');
            patchAppointmentState(Number(id), { status });
            await fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể cập nhật lịch hẹn.');
        }
    };

    const handleQuickStatus = async (appointment, status, defaultReason = '') => {
        const reason = ['cancelled', 'no_show'].includes(status)
            ? window.prompt(status === 'cancelled' ? 'Lý do hủy lịch:' : 'Ghi chú khách không đến:', defaultReason)
            : defaultReason;

        if (['cancelled', 'no_show'].includes(status) && reason === null) return;

        try {
            await api.put(`/appointments/${appointment.id}/status`, { status, reason, note: reason });
            toast.success('Đã cập nhật trạng thái lịch hẹn.');
            patchAppointmentState(appointment.id, {
                status,
                statusNote: reason || appointment.statusNote,
                cancellationReason: status === 'cancelled' ? reason : appointment.cancellationReason
            });
            await fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể cập nhật lịch hẹn.');
        }
    };

    const openReschedule = (appointment) => {
        setRescheduleAppt(appointment);
        setRescheduleForm({
            appointmentDate: String(appointment.appointmentDate || '').slice(0, 10),
            appointmentTime: String(appointment.appointmentTime || '').slice(0, 5),
            reason: '',
            note: ''
        });
    };

    const submitReschedule = async (event) => {
        event.preventDefault();
        if (!rescheduleAppt) return;

        try {
            await api.put(`/appointments/${rescheduleAppt.id}/reschedule`, rescheduleForm);
            toast.success('Đã dời lịch hẹn.');
            setRescheduleAppt(null);
            setRescheduleForm({ appointmentDate: '', appointmentTime: '', reason: '', note: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể dời lịch hẹn.');
        }
    };

    const openRecordForm = async (appointment) => {
        setSelectedAppt(appointment);
        setRecordForm(emptyRecordForm);
        setPatientRecordHistory([]);

        try {
            setLoadingHistory(true);
            const res = await api.get(`/records/patient/${appointment.patientId}`);
            setPatientRecordHistory((res.data.data || []).filter(record => record.appointmentId !== appointment.id));
        } catch {
            toast.error('Không thể tải lịch sử hồ sơ cũ.');
        } finally {
            setLoadingHistory(false);
        }
    };

    const toggleTooth = (toothNumber) => {
        setRecordForm(current => ({
            ...current,
            toothPositions: current.toothPositions.includes(toothNumber)
                ? current.toothPositions.filter(item => item !== toothNumber)
                : [...current.toothPositions, toothNumber].sort((a, b) => a - b)
        }));
    };

    const addTreatmentSession = () => {
        setRecordForm(current => ({
            ...current,
            treatmentSessions: [
                ...current.treatmentSessions,
                { title: '', plannedDate: '', note: '', status: 'planned' }
            ]
        }));
    };

    const updateTreatmentSession = (index, key, value) => {
        setRecordForm(current => ({
            ...current,
            treatmentSessions: current.treatmentSessions.map((session, sessionIndex) => (
                sessionIndex === index ? { ...session, [key]: value } : session
            ))
        }));
    };

    const removeTreatmentSession = (index) => {
        setRecordForm(current => ({
            ...current,
            treatmentSessions: current.treatmentSessions.filter((_, sessionIndex) => sessionIndex !== index)
        }));
    };

    const handleCreateInvoice = async (appointmentId) => {
        if (!window.confirm(`Xuất hóa đơn cho lịch hẹn #${appointmentId}?`)) return;
        try {
            await api.post('/invoices', { appointmentId, paymentMethod: 'cash' });
            toast.success('Đã xuất hóa đơn.');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xuất hóa đơn.');
        }
    };

    const handleFilesUpload = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const uploadData = new FormData();
        Array.from(files).forEach(file => uploadData.append('files', file));

        try {
            setUploadingFiles(true);
            const res = await api.post('/upload/multiple', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setRecordForm(current => ({ ...current, attachments: [...current.attachments, ...res.data.data.map(file => file.url)] }));
            toast.success('Đã tải tài liệu.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể tải tài liệu.');
        } finally {
            setUploadingFiles(false);
        }
    };

    const submitMedicalRecord = async (event) => {
        event.preventDefault();
        const minNextAppointmentDate = nextDateValueAfter(selectedAppt?.appointmentDate);
        if (recordForm.nextAppointmentDate && recordForm.nextAppointmentDate < minNextAppointmentDate) {
            toast.error('Ngày tái khám phải là lịch tiếp theo, không được là hôm nay hoặc trong quá khứ.');
            return;
        }

        try {
            await api.post('/records', {
                appointmentId: selectedAppt.id,
                ...recordForm,
                toothPositions: JSON.stringify(recordForm.toothPositions || []),
                treatmentSessions: JSON.stringify(recordForm.treatmentSessions || []),
                attachments: JSON.stringify(recordForm.attachments || [])
            });
            toast.success('Đã lưu hồ sơ khám.');
            setSelectedAppt(null);
            setRecordForm(emptyRecordForm);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lưu hồ sơ khám.');
        }
    };

    if (loading) return <Panel><div className="p-10 text-center font-bold text-slate-500">Đang tải lịch hẹn...</div></Panel>;
    if (error) return <Panel><div className="p-10 text-center font-bold text-rose-600">{error}</div></Panel>;

    const title = isDentist ? 'Lịch khám của tôi' : 'Tiếp nhận lịch hẹn';
    const description = isDentist
        ? 'Danh sách khách hàng đã được phân công cho bạn.'
        : 'Theo dõi lịch chờ xác nhận, phân công bác sĩ và xuất hóa đơn sau khi hoàn thành.';
    const appointmentTableColumns = isFrontDesk ? 7 : 6;
    const warningAppointments = appointments.filter(appointment => appointment.warnings?.length > 0);
    const pendingCount = appointments.filter(appointment => appointment.status === 'pending').length;
    const todayAppointments = appointments.filter(appointment => String(appointment.appointmentDate || '').slice(0, 10) === todayValue()).length;
    const minNextAppointmentDate = nextDateValueAfter(selectedAppt?.appointmentDate);

    return (
        <Panel>
            <div className="flex flex-col gap-4 border-b border-blue-100 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-xl font-black text-blue-950">{title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
                <div className="flex gap-2">
                    {isFrontDesk && (
                        <button onClick={() => setShowCreateForm(current => !current)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800">
                            {showCreateForm ? 'Đóng' : 'Tạo lịch hẹn'}
                        </button>
                    )}
                    <button onClick={fetchData} className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-blue-50 hover:text-blue-700">
                        Làm mới
                    </button>
                </div>
            </div>

            {showCreateForm && isFrontDesk && (
                <form onSubmit={handleCreateAppointment} className="m-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                    <h3 className="font-black text-blue-950">Tạo lịch hẹn tại quầy</h3>
                    <div className="mt-4 grid gap-4 lg:grid-cols-4">
                        <Select label="Khách hàng" value={createForm.patientId} onChange={value => setCreateForm({ ...createForm, patientId: value })} required>
                            <option value="">Chọn khách hàng</option>
                            {patients.map(patient => <option key={patient.id} value={patient.id}>{patient.fullName} - {patient.phone || patient.email}</option>)}
                        </Select>
                        <Select label="Bác sĩ phụ trách" value={createForm.dentistId} onChange={value => setCreateForm({ ...createForm, dentistId: value })}>
                            <option value="">Phân công sau</option>
                            {dentists.map(dentist => <option key={dentist.id} value={dentist.id}>{dentist.fullName}</option>)}
                        </Select>
                        <Field label="Ngày khám" type="date" min={todayValue()} value={createForm.appointmentDate} onChange={value => setCreateForm({ ...createForm, appointmentDate: value })} required />
                        <Field label="Giờ khám" type="time" value={createForm.appointmentTime} onChange={value => setCreateForm({ ...createForm, appointmentTime: value })} required />
                    </div>

                    <div className="mt-4">
                        <p className="mb-2 text-sm font-bold text-slate-700">Dịch vụ</p>
                        <div className="grid max-h-48 gap-2 overflow-y-auto rounded-2xl bg-white p-3 md:grid-cols-2 lg:grid-cols-3">
                            {services.map(service => (
                                <label key={service.id} className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm hover:bg-blue-50">
                                    <input type="checkbox" checked={createForm.serviceIds.includes(service.id)} onChange={() => toggleCreateService(service.id)} className="h-4 w-4 rounded border-slate-300 text-blue-700" />
                                    <span className="flex-1 text-slate-700">{service.name}</span>
                                    <span className="font-bold text-blue-700">{Number(service.price || 0).toLocaleString('vi-VN')}đ</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <textarea value={createForm.notes} onChange={event => setCreateForm({ ...createForm, notes: event.target.value })} rows="2" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Ghi chú triệu chứng hoặc yêu cầu của khách hàng" />
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button type="submit" className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-800">Lưu lịch hẹn</button>
                    </div>
                </form>
            )}

            {user.role === 'admin' && changeRequests.some((request) => request.status === 'pending') && (
                <section className="m-6 rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                    <div className="mb-4">
                        <p className="text-sm font-black uppercase text-amber-700">Chờ admin duyệt</p>
                        <h3 className="mt-1 text-lg font-black text-blue-950">Yêu cầu đổi bác sĩ từ lễ tân</h3>
                    </div>
                    <div className="grid gap-3">
                        {changeRequests.filter((request) => request.status === 'pending').map((request) => (
                            <article key={request.id} className="rounded-xl border border-amber-100 bg-white p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="font-black text-blue-950">Lịch #{request.appointmentId} - {request.patientName}</p>
                                        <p className="mt-1 text-sm text-slate-600">
                                            {request.oldDentistName || 'Chưa phân công'} → {request.newDentistName}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Lễ tân: {request.requestedByName} · {new Date(request.createdAt).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => handleReviewDentistChange(request.id, 'approved')} className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                                            Duyệt
                                        </button>
                                        <button type="button" onClick={() => handleReviewDentistChange(request.id, 'rejected')} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">
                                            Từ chối
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <section className="grid gap-4 border-t border-blue-100 bg-slate-50/50 p-6 md:grid-cols-3">
                <SummaryPill label="Lịch trong danh sách" value={appointments.length} />
                <SummaryPill label="Hôm nay" value={todayAppointments} />
                <SummaryPill label="Cần chú ý" value={warningAppointments.length || pendingCount} tone={warningAppointments.length ? 'rose' : 'blue'} />
            </section>

            <section className="grid gap-3 border-t border-blue-100 bg-white px-6 py-5 lg:grid-cols-4 xl:grid-cols-[180px_220px_220px_220px_1fr]">
                <Field label="Lọc theo ngày" type="date" value={filters.date} onChange={value => setFilters(current => ({ ...current, date: value }))} />
                {isFrontDesk && (
                    <Select label="Bác sĩ" value={filters.dentistId} onChange={value => setFilters(current => ({ ...current, dentistId: value }))}>
                        <option value="all">Tất cả bác sĩ</option>
                        {dentists.map(dentist => <option key={dentist.id} value={dentist.id}>{dentist.fullName}</option>)}
                    </Select>
                )}
                <Select label="Trạng thái" value={filters.status} onChange={value => setFilters(current => ({ ...current, status: value }))}>
                    <option value="all">Tất cả trạng thái</option>
                    {workflowStatusSteps.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    <option value="cancelled">Đã hủy</option>
                    <option value="no_show">Không đến</option>
                </Select>
                <Select label="Thứ tự" value={filters.sort} onChange={value => setFilters(current => ({ ...current, sort: value }))}>
                    <option value="date_desc">Lịch mới nhất</option>
                    <option value="date_asc">Lịch sắp tới</option>
                    <option value="created_desc">Đơn mới tạo</option>
                    <option value="created_asc">Đơn cũ nhất</option>
                </Select>
                <div className="flex items-end gap-2">
                    <button type="button" onClick={() => setFilters(current => ({ ...current, date: todayValue(), dentistId: 'all', status: 'all' }))} className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100">
                        Hôm nay
                    </button>
                    <button type="button" onClick={() => setFilters({ date: '', dentistId: 'all', status: 'all', sort: 'date_desc' })} className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-slate-600 hover:bg-blue-50">
                        Xóa lọc
                    </button>
                </div>
            </section>

            {warningAppointments.length > 0 && (
                <section className="mx-6 mb-6 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                    <p className="text-sm font-black uppercase text-amber-700">Cảnh báo lịch hẹn</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {warningAppointments.slice(0, 4).map(appointment => (
                            <button key={appointment.id} type="button" onClick={() => setDetailAppt(appointment)} className="rounded-xl bg-white p-3 text-left text-sm shadow-sm hover:bg-amber-50">
                                <span className="font-black text-blue-950">#{appointment.id} · {appointment.patientName}</span>
                                <span className="mt-1 block font-bold text-amber-700">{appointment.warnings[0]?.label}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                    <thead>
                        <tr className="bg-blue-50/50 text-left text-xs font-black uppercase text-slate-500">
                            <th className="px-6 py-3">Mã</th>
                            <th className="px-6 py-3">Khách hàng</th>
                            <th className="px-6 py-3">Dịch vụ</th>
                            <th className="px-6 py-3">Thời gian</th>
                            {isFrontDesk && <th className="px-6 py-3">Bác sĩ</th>}
                            <th className="px-6 py-3">Trạng thái</th>
                            <th className="px-6 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                        {appointments.length === 0 ? (
                            <tr><td colSpan={appointmentTableColumns} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">Chưa có lịch hẹn.</td></tr>
                        ) : appointments.map(appointment => {
                            const [statusLabel, statusClass] = getStatusMeta(appointment.status);
                            return (
                                <tr
                                    key={appointment.id}
                                    id={`appointment-row-${appointment.id}`}
                                    className={`hover:bg-blue-50/40 ${getHighlightClass(highlight.type === 'appointment' && highlight.id === String(appointment.id))}`}
                                >
                                    <td className="px-6 py-4 text-sm font-black text-slate-500">#{appointment.id}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-blue-950">{appointment.patientName}</p>
                                        <p className="text-xs text-slate-500">{appointment.patientPhone}</p>
                                    </td>
                                    <td className="max-w-xs px-6 py-4 text-sm text-slate-600">{appointment.serviceNames || 'Chưa có dịch vụ'}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{new Date(appointment.appointmentDate).toLocaleDateString('vi-VN')}</p>
                                        <p className="text-sm font-black text-blue-700">{appointment.appointmentTime}</p>
                                    </td>
                                    {isFrontDesk && (
                                        <td className="px-6 py-4">
                                            {['pending', 'confirmed'].includes(appointment.status) ? (
                                                <select value={selectedDentists[appointment.id] || ''} onChange={event => setSelectedDentists({ ...selectedDentists, [appointment.id]: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                                                    <option value="">Chọn bác sĩ</option>
                                                    {dentists.map(dentist => <option key={dentist.id} value={dentist.id}>{dentist.fullName}</option>)}
                                                </select>
                                            ) : <span className="text-sm font-semibold text-slate-700">{appointment.dentistName || 'Chưa phân công'}</span>}
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex min-w-[92px] justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${statusClass}`}>{statusLabel}</span>
                                        {appointment.warnings?.length > 0 && (
                                            <p className="mt-2 text-xs font-black text-amber-700">{appointment.warnings[0].label}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            {isFrontDesk && ['pending', 'confirmed'].includes(appointment.status) && (
                                                <button onClick={() => openReschedule(appointment)} className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-700 hover:bg-cyan-100">Dời lịch</button>
                                            )}
                                            {isFrontDesk && appointment.status === 'confirmed' && (
                                                <>
                                                    <button onClick={() => handleQuickStatus(appointment, 'arrived')} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100">Check-in</button>
                                                    <button onClick={() => handleQuickStatus(appointment, 'no_show')} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200">Không đến</button>
                                                </>
                                            )}
                                            {isDentist && ['confirmed', 'arrived'].includes(appointment.status) && (
                                                <button onClick={() => handleQuickStatus(appointment, 'in_progress')} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100">Bắt đầu khám</button>
                                            )}
                                            {isFrontDesk && appointment.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleConfirmAndAssign(appointment.id)} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100">Xác nhận</button>
                                                    <button onClick={() => handleUpdateStatus(appointment.id, 'cancelled')} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-100">Hủy</button>
                                                </>
                                            )}
                                            {isFrontDesk && appointment.status === 'confirmed' && (
                                                <button onClick={() => handleAssignOnly(appointment.id)} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100">
                                                    Đổi bác sĩ
                                                </button>
                                            )}
                                            {isDentist && ['arrived', 'in_progress'].includes(appointment.status) && (
                                                <button onClick={() => openRecordForm(appointment)} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100">Ghi hồ sơ</button>
                                            )}
                                            {isFrontDesk && appointment.status === 'completed' && !appointment.invoiceId && (
                                                <button onClick={() => handleCreateInvoice(appointment.id)} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 hover:bg-violet-100">Xuất hóa đơn</button>
                                            )}
                                            {isFrontDesk && appointment.status === 'completed' && appointment.invoiceId && (
                                                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Đã xuất hóa đơn</span>
                                            )}
                                            <button onClick={() => setDetailAppt(appointment)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200">
                                                Chi tiết
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {rescheduleAppt && (
                <ModalBackdrop onClose={() => setRescheduleAppt(null)}>
                    <form onSubmit={submitReschedule} className="my-6 w-full max-w-xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-[#F8FCFC] p-6">
                            <div>
                                <p className="text-sm font-black uppercase text-cyan-700">Dời lịch hẹn</p>
                                <h3 className="mt-1 text-xl font-black text-blue-950">Lịch #{rescheduleAppt.id}</h3>
                                <p className="mt-1 text-sm text-slate-500">{rescheduleAppt.patientName}</p>
                            </div>
                            <button type="button" onClick={() => setRescheduleAppt(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-xl font-black text-slate-500 shadow-sm hover:bg-blue-50 hover:text-blue-700" aria-label="Đóng form dời lịch">×</button>
                        </div>
                        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Ngày mới" type="date" min={todayValue()} value={rescheduleForm.appointmentDate} onChange={value => setRescheduleForm({ ...rescheduleForm, appointmentDate: value })} required />
                                <Field label="Giờ mới" type="time" value={rescheduleForm.appointmentTime} onChange={value => setRescheduleForm({ ...rescheduleForm, appointmentTime: value })} required />
                            </div>
                            <QuickRescheduleButtons
                                currentDate={rescheduleForm.appointmentDate}
                                currentTime={rescheduleForm.appointmentTime}
                                onApply={(nextDate, nextTime) => setRescheduleForm(current => ({
                                    ...current,
                                    appointmentDate: nextDate,
                                    appointmentTime: nextTime
                                }))}
                            />
                            <div className="mt-4 space-y-4">
                                <Textarea label="Lý do dời lịch" value={rescheduleForm.reason} onChange={value => setRescheduleForm({ ...rescheduleForm, reason: value })} />
                                <Textarea label="Ghi chú nội bộ" value={rescheduleForm.note} onChange={value => setRescheduleForm({ ...rescheduleForm, note: value })} />
                            </div>
                        </div>
                        <div className="flex justify-end border-t border-blue-100 bg-white p-6">
                            <button type="submit" className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white hover:bg-cyan-800">Lưu lịch mới</button>
                        </div>
                    </form>
                </ModalBackdrop>
            )}

            {selectedAppt && (
                <ModalBackdrop onClose={() => setSelectedAppt(null)}>
                    <form onSubmit={submitMedicalRecord} className="my-6 w-full max-w-5xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="flex flex-col gap-4 border-b border-blue-100 bg-[linear-gradient(115deg,#F8FCFC_0%,#ffffff_55%,#EAF7F5_100%)] p-6 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-sm font-black uppercase text-blue-700">Hồ sơ khám</p>
                                <h3 className="mt-1 text-2xl font-black text-blue-950">{selectedAppt.patientName}</h3>
                                <p className="mt-2 text-sm font-semibold text-slate-500">
                                    Lịch #{selectedAppt.id} · {new Date(selectedAppt.appointmentDate).toLocaleDateString('vi-VN')} · {selectedAppt.appointmentTime}
                                </p>
                            </div>
                            <button type="button" onClick={() => setSelectedAppt(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xl font-black text-slate-500 shadow-sm hover:bg-blue-50 hover:text-blue-700" aria-label="Đóng form ghi hồ sơ">×</button>
                        </div>
                        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto p-6">
                            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                                <section className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Textarea label="Lý do khám" value={recordForm.chiefComplaint} onChange={value => setRecordForm({ ...recordForm, chiefComplaint: value })} />
                                        <Textarea label="Chẩn đoán" required value={recordForm.diagnosis} onChange={value => setRecordForm({ ...recordForm, diagnosis: value })} />
                                    </div>
                                    <ToothChart selected={recordForm.toothPositions} onToggle={toggleTooth} />
                                    <Textarea label="Kế hoạch điều trị" value={recordForm.treatmentPlan} onChange={value => setRecordForm({ ...recordForm, treatmentPlan: value })} />
                                    <TreatmentSessions
                                        sessions={recordForm.treatmentSessions}
                                        minDate={todayValue()}
                                        onAdd={addTreatmentSession}
                                        onUpdate={updateTreatmentSession}
                                        onRemove={removeTreatmentSession}
                                    />
                                    <Textarea label="Thủ thuật đã thực hiện" value={recordForm.procedures} onChange={value => setRecordForm({ ...recordForm, procedures: value })} />
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Textarea label="Đơn thuốc" value={recordForm.prescription} onChange={value => setRecordForm({ ...recordForm, prescription: value })} />
                                        <Textarea label="Ghi chú dặn dò" value={recordForm.notes} onChange={value => setRecordForm({ ...recordForm, notes: value })} />
                                    </div>
                                </section>
                                <aside className="space-y-4 rounded-2xl border border-blue-100 bg-[#F8FCFC] p-4">
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-400">Dịch vụ</p>
                                        <p className="mt-2 text-sm font-black leading-6 text-blue-950">{selectedAppt.serviceNames || 'Chưa có dịch vụ'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-400">Lịch sử khám cũ</p>
                                        {loadingHistory ? (
                                            <p className="mt-2 text-sm font-bold text-slate-500">Đang tải...</p>
                                        ) : patientRecordHistory.length === 0 ? (
                                            <p className="mt-2 text-sm font-bold text-slate-500">Chưa có hồ sơ trước đó.</p>
                                        ) : (
                                            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                                                {patientRecordHistory.slice(0, 5).map(record => (
                                                    <article key={record.id} className="rounded-xl bg-white p-3 text-sm">
                                                        <p className="font-black text-blue-950">{record.diagnosis}</p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                                            {record.appointmentDate ? new Date(record.appointmentDate).toLocaleDateString('vi-VN') : ''} · {record.dentistName}
                                                        </p>
                                                        {record.toothPositions?.length > 0 && (
                                                            <p className="mt-1 text-xs font-bold text-blue-700">Răng: {record.toothPositions.join(', ')}</p>
                                                        )}
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid gap-4">
                                        <Field label="Ngày tái khám" type="date" min={minNextAppointmentDate} value={recordForm.nextAppointmentDate} onChange={value => setRecordForm({ ...recordForm, nextAppointmentDate: value })} />
                                        <Field label="Ghi chú tái khám" value={recordForm.nextAppointmentNote} onChange={value => setRecordForm({ ...recordForm, nextAppointmentNote: value })} />
                                    </div>
                                    <div>
                                        <p className="mb-2 text-sm font-bold text-slate-700">Tài liệu đính kèm</p>
                                        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-black text-blue-700 hover:bg-blue-50">
                                            {uploadingFiles ? 'Đang tải...' : 'Tải ảnh/PDF'}
                                            <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={handleFilesUpload} disabled={uploadingFiles} />
                                        </label>
                                        {recordForm.attachments.length > 0 && (
                                            <div className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-500">
                                                {recordForm.attachments.length} tài liệu đã tải lên.
                                            </div>
                                        )}
                                    </div>
                                </aside>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-blue-100 bg-white p-6 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setSelectedAppt(null)} className="rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-blue-50">
                                Hủy
                            </button>
                            <button type="submit" className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">Lưu hồ sơ và hoàn thành</button>
                        </div>
                    </form>
                </ModalBackdrop>
            )}

            {detailAppt && (
                <AppointmentDetailModal
                    appointment={detailAppt}
                    isFrontDesk={isFrontDesk}
                    isDentist={isDentist}
                    onClose={() => setDetailAppt(null)}
                    onCancel={() => handleUpdateStatus(detailAppt.id, 'cancelled')}
                    onCreateInvoice={() => handleCreateInvoice(detailAppt.id)}
                    onStatusChange={(status) => handleQuickStatus(detailAppt, status)}
                    onReschedule={() => openReschedule(detailAppt)}
                    onOpenRecord={() => {
                        openRecordForm(detailAppt);
                        setDetailAppt(null);
                    }}
                />
            )}
        </Panel>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function ModalBackdrop({ children, onClose }) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-6"
            onMouseDown={onClose}
            role="presentation"
        >
            {children}
        </div>
    );
}

function Field({ label, value, onChange, ...props }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
            <input value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </div>
    );
}

function Select({ label, value, onChange, children, ...props }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
            <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props}>
                {children}
            </select>
        </div>
    );
}

function Textarea({ label, value, onChange, ...props }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
            <textarea rows="3" value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </div>
    );
}

function SummaryPill({ label, value, tone = 'blue' }) {
    const toneClass = tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-800';
    return (
        <div className={`rounded-2xl p-4 ${toneClass}`}>
            <p className="text-2xl font-black">{value}</p>
            <p className="mt-1 text-xs font-black uppercase opacity-80">{label}</p>
        </div>
    );
}

function QuickRescheduleButtons({ currentDate, currentTime, onApply }) {
    const applyOffset = (minutesToAdd) => {
        if (!currentDate || !currentTime) return;
        const date = new Date(`${currentDate}T${currentTime}:00`);
        date.setMinutes(date.getMinutes() + minutesToAdd);
        onApply(todayValueFromDate(date), String(date.toTimeString()).slice(0, 5));
    };

    const applyTomorrow = () => {
        if (!currentDate || !currentTime) return;
        const date = new Date(`${currentDate}T${currentTime}:00`);
        date.setDate(date.getDate() + 1);
        onApply(todayValueFromDate(date), String(date.toTimeString()).slice(0, 5));
    };

    return (
        <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyOffset(30)} className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">+30 phút</button>
            <button type="button" onClick={() => applyOffset(60)} className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">+1 giờ</button>
            <button type="button" onClick={applyTomorrow} className="rounded-full bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 hover:bg-cyan-100">Ngày mai cùng giờ</button>
        </div>
    );
}

function todayValueFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nextDateValueAfter(value) {
    const today = todayValue();
    const baseText = value ? String(value).slice(0, 10) : today;
    const base = /^\d{4}-\d{2}-\d{2}$/.test(baseText) && baseText > today ? baseText : today;
    const date = new Date(`${base}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return todayValueFromDate(date);
}

function ToothChart({ selected, onToggle }) {
    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="font-black text-blue-950">Vị trí răng điều trị</p>
                    <p className="mt-1 text-sm text-slate-500">Chọn theo số răng FDI.</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{selected.length} răng</span>
            </div>
            <div className="mt-4 grid grid-cols-8 gap-2">
                {toothNumbers.map((tooth) => {
                    const active = selected.includes(tooth);
                    return (
                        <button
                            key={tooth}
                            type="button"
                            onClick={() => onToggle(tooth)}
                            className={`aspect-square rounded-xl border text-xs font-black transition ${active ? 'border-blue-700 bg-blue-700 text-white' : 'border-blue-100 bg-blue-50 text-blue-800 hover:bg-white'}`}
                        >
                            {tooth}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function TreatmentSessions({ sessions, minDate, onAdd, onUpdate, onRemove }) {
    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="font-black text-blue-950">Kế hoạch điều trị nhiều buổi</p>
                    <p className="mt-1 text-sm text-slate-500">Dùng cho implant, niềng, điều trị tủy hoặc phục hình.</p>
                </div>
                <button type="button" onClick={onAdd} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">Thêm buổi</button>
            </div>
            <div className="mt-4 space-y-3">
                {sessions.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500">Chưa có buổi điều trị nào.</p>
                ) : sessions.map((session, index) => (
                    <div key={index} className="grid gap-3 rounded-xl bg-blue-50/50 p-3 md:grid-cols-[1fr_150px_150px_auto]">
                        <input value={session.title || ''} onChange={event => onUpdate(index, 'title', event.target.value)} placeholder={`Buổi ${index + 1}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <input type="date" min={minDate} value={session.plannedDate || ''} onChange={event => onUpdate(index, 'plannedDate', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <select value={session.status || 'planned'} onChange={event => onUpdate(index, 'status', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                            <option value="planned">Dự kiến</option>
                            <option value="done">Đã làm</option>
                            <option value="skipped">Hoãn</option>
                        </select>
                        <button type="button" onClick={() => onRemove(index)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-100">Xóa</button>
                        <input value={session.note || ''} onChange={event => onUpdate(index, 'note', event.target.value)} placeholder="Ghi chú buổi điều trị" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 md:col-span-4" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusTimeline({ history }) {
    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-5">
            <p className="font-black text-blue-950">Timeline trạng thái</p>
            {history.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-slate-500">Chưa có lịch sử trạng thái.</p>
            ) : (
                <div className="mt-4 space-y-3">
                    {history.map((item) => {
                        const [label] = getStatusMeta(item.newStatus);
                        return (
                            <div key={item.id} className="border-l-2 border-blue-200 pl-4">
                                <p className="text-sm font-black text-blue-950">{label}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''} · {item.changedByName || 'Hệ thống'}
                                </p>
                                {(item.reason || item.note) && <p className="mt-1 text-sm text-slate-600">{item.reason || item.note}</p>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function AppointmentDetailModal({ appointment, isFrontDesk, isDentist, onClose, onCancel, onCreateInvoice, onStatusChange, onReschedule, onOpenRecord }) {
    const [statusLabel, statusClass] = getStatusMeta(appointment.status);
    const currentStepIndex = workflowStatusSteps.findIndex(([key]) => key === appointment.status);
    const isCancelled = appointment.status === 'cancelled';

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-6"
            onMouseDown={onClose}
            role="presentation"
        >
            <div
                className="relative my-4 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="fixed right-5 top-5 z-[60] grid h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-xl font-black text-slate-500 shadow-lg shadow-slate-900/10 hover:bg-blue-50 hover:text-blue-700"
                    aria-label="Đóng chi tiết lịch hẹn"
                >
                    ×
                </button>
                <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-[linear-gradient(115deg,#eef7ff_0%,#ffffff_55%,#e8f3ff_100%)] p-6 pr-16">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Chi tiết lịch hẹn</p>
                        <h3 className="mt-1 text-2xl font-black text-blue-950">Lịch #{appointment.id}</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                            {new Date(appointment.appointmentDate).toLocaleDateString('vi-VN')} · {appointment.appointmentTime}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-600 shadow-sm hover:bg-slate-100">
                        Đóng
                    </button>
                </div>

                <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <section className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <InfoBox label="Khách hàng" value={appointment.patientName} helper={appointment.patientPhone || 'Chưa có số điện thoại'} />
                            <InfoBox label="Bác sĩ phụ trách" value={appointment.dentistName || 'Chưa phân công'} helper="Theo phân công hiện tại" />
                            <InfoBox label="Dịch vụ" value={appointment.serviceNames || 'Chưa có dịch vụ'} helper={`${appointment.serviceIds?.length || 0} dịch vụ`} />
                            <InfoBox label="Hóa đơn" value={appointment.invoiceId ? `INV-${appointment.invoiceId}` : 'Chưa có hóa đơn'} helper={appointment.invoiceId ? `${appointment.invoiceStatus} · ${formatCurrency(appointment.invoiceTotalAmount)}` : 'Xuất sau khi hoàn thành khám'} />
                        </div>

                        <div className="rounded-2xl border border-blue-100 bg-white p-5">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-black text-blue-950">Trạng thái</p>
                                <span className={`inline-flex min-w-[92px] justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${statusClass}`}>{statusLabel}</span>
                            </div>

                            {appointment.warnings?.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {appointment.warnings.map((warning) => (
                                        <p key={warning.type} className="rounded-xl bg-amber-50 p-3 text-sm font-black text-amber-700">
                                            {warning.label}
                                        </p>
                                    ))}
                                </div>
                            )}

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                {workflowStatusSteps.map(([key, label], index) => {
                                    const done = !isCancelled && currentStepIndex >= index;
                                    return (
                                        <div key={key} className={`rounded-xl border p-4 ${done ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                                            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${done ? 'bg-blue-700 text-white' : 'bg-white text-slate-400'}`}>
                                                {index + 1}
                                            </span>
                                            <p className={`mt-3 text-sm font-black ${done ? 'text-blue-950' : 'text-slate-500'}`}>{label}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {isCancelled && (
                                <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">
                                    Lịch hẹn này đã bị hủy, không thể tiếp tục xử lý.
                                </p>
                            )}
                        </div>

                        <StatusTimeline history={appointment.statusHistory || []} />

                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                            <p className="font-black text-blue-950">Ghi chú</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{appointment.notes || 'Không có ghi chú.'}</p>
                        </div>
                    </section>

                    <aside className="space-y-4">
                        <div className="rounded-2xl border border-blue-100 bg-white p-5">
                            <p className="font-black text-blue-950">Thao tác nhanh</p>
                            <div className="mt-4 grid gap-2">
                                {isFrontDesk && ['pending', 'confirmed'].includes(appointment.status) && (
                                    <button type="button" onClick={onReschedule} className="rounded-xl bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-700 hover:bg-cyan-100">
                                        Dời lịch hẹn
                                    </button>
                                )}
                                {isFrontDesk && appointment.status === 'confirmed' && (
                                    <>
                                        <button type="button" onClick={() => onStatusChange('arrived')} className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100">
                                            Check-in khách đến
                                        </button>
                                        <button type="button" onClick={() => onStatusChange('no_show')} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 hover:bg-slate-200">
                                            Đánh dấu không đến
                                        </button>
                                    </>
                                )}
                                {isDentist && ['confirmed', 'arrived'].includes(appointment.status) && (
                                    <button type="button" onClick={() => onStatusChange('in_progress')} className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-100">
                                        Bắt đầu khám
                                    </button>
                                )}
                                {isFrontDesk && ['pending', 'confirmed'].includes(appointment.status) && (
                                    <button type="button" onClick={onCancel} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-100">
                                        Hủy lịch hẹn
                                    </button>
                                )}
                                {isDentist && ['arrived', 'in_progress'].includes(appointment.status) && (
                                    <button type="button" onClick={onOpenRecord} className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100">
                                        Ghi hồ sơ khám
                                    </button>
                                )}
                                {isFrontDesk && appointment.status === 'completed' && !appointment.invoiceId && (
                                    <button type="button" onClick={onCreateInvoice} className="rounded-xl bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 hover:bg-violet-100">
                                        Xuất hóa đơn
                                    </button>
                                )}
                                {appointment.invoiceId && (
                                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                                        Đã có hóa đơn liên quan
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-blue-100 bg-white p-5">
                            <p className="font-black text-blue-950">Thông tin hệ thống</p>
                            <dl className="mt-4 space-y-3 text-sm">
                                <MetaRow label="Mã khách" value={`#${appointment.patientId}`} />
                                <MetaRow label="Mã bác sĩ" value={appointment.dentistId ? `#${appointment.dentistId}` : '-'} />
                                <MetaRow label="Ngày tạo" value={appointment.createdAt ? new Date(appointment.createdAt).toLocaleString('vi-VN') : '-'} />
                            </dl>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

function InfoBox({ label, value, helper }) {
    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-5">
            <p className="text-xs font-black uppercase text-slate-400">{label}</p>
            <p className="mt-2 font-black text-blue-950">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
    );
}

function MetaRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt className="font-semibold text-slate-500">{label}</dt>
            <dd className="font-black text-blue-950">{value}</dd>
        </div>
    );
}
