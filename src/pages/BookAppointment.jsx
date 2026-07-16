import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/auth-context';
import toast from 'react-hot-toast';

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    if (!amount) return 'Liên hệ';
    return `${amount.toLocaleString('vi-VN')} đ`;
};

const getTodayValue = () => {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDate = (value) => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
};

const getInitials = (name = '') => name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((item) => item[0])
    .join('')
    .toUpperCase() || 'BS';

const getProfileImage = (item = {}) => (
    item.avatarUrl || item.avatar || item.photoUrl || item.imageUrl || item.profileImage || item.profileImageUrl || ''
);

const MAX_SERVICES_PER_APPOINTMENT = 4;
const MAX_APPOINTMENT_DURATION_MINUTES = 180;

const getServiceDurationValue = (service = {}) => Math.max(Number(service.duration || 30), 30);

const buildDateOptions = () => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' });
    const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

    return { value, weekday, day };
});

export default function BookAppointment() {
    const { user, loading: authLoading } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const preSelectedServiceId = Number(queryParams.get('serviceId'));

    const [services, setServices] = useState([]);
    const [dentists, setDentists] = useState([]);
    const [selectedServices, setSelectedServices] = useState(Number.isInteger(preSelectedServiceId) && preSelectedServiceId > 0 ? [preSelectedServiceId] : []);
    const [dentistId, setDentistId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [slots, setSlots] = useState([]);
    const [notes, setNotes] = useState('');
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [loadingDentistAvailability, setLoadingDentistAvailability] = useState(false);
    const [dentistAvailability, setDentistAvailability] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const today = useMemo(() => getTodayValue(), []);
    const dateOptions = useMemo(() => buildDateOptions(), []);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        if (!user) {
            navigate('/login', {
                replace: true,
                state: { from: `${location.pathname}${location.search}` }
            });
            return;
        }

        const fetchData = async () => {
            try {
                const [serviceRes, dentistRes] = await Promise.all([
                    api.get('/services'),
                    api.get('/users/public/dentists')
                ]);
                const nextServices = serviceRes.data.data || [];
                const nextDentists = dentistRes.data.data || [];
                setServices(nextServices);
                setDentists(nextDentists);
                setDentistId((current) => current || '');
            } catch {
                setError('Không thể tải dữ liệu đặt lịch. Vui lòng thử lại sau.');
            }
        };

        fetchData();
    }, [authLoading, user, navigate, location.pathname, location.search]);

    useEffect(() => {
        if (!date || dentists.length === 0) {
            setDentistAvailability({});
            return;
        }

        let cancelled = false;

        const fetchDentistAvailability = async () => {
            setLoadingDentistAvailability(true);
            try {
                const results = await Promise.all(dentists.map(async (dentist) => {
                    try {
                        const res = await api.get('/appointments/slots', {
                            params: {
                                date,
                                dentistId: dentist.id,
                                serviceIds: selectedServices.join(',')
                            }
                        });
                        const nextSlots = res.data.data || [];
                        const availableSlots = nextSlots.filter((slot) => slot.available);

                        return [
                            String(dentist.id),
                            {
                                total: nextSlots.length,
                                available: availableSlots.length,
                                firstTime: availableSlots[0]?.time || ''
                            }
                        ];
                    } catch {
                        return [String(dentist.id), { total: 0, available: 0, firstTime: '' }];
                    }
                }));

                if (!cancelled) {
                    setDentistAvailability(Object.fromEntries(results));
                }
            } finally {
                if (!cancelled) setLoadingDentistAvailability(false);
            }
        };

        fetchDentistAvailability();

        return () => {
            cancelled = true;
        };
    }, [date, dentists, selectedServices]);

    useEffect(() => {
        if (!date || !dentistId) {
            setSlots([]);
            setTime('');
            return;
        }

        const fetchSlots = async () => {
            setLoadingSlots(true);
            setError('');
            try {
                const res = await api.get('/appointments/slots', {
                    params: {
                        date,
                        dentistId,
                        serviceIds: selectedServices.join(',')
                    }
                });
                const nextSlots = res.data.data || [];
                setSlots(nextSlots);
                setTime((current) => (
                    current && nextSlots.some((slot) => slot.time === current && slot.available) ? current : ''
                ));
            } catch (err) {
                setSlots([]);
                setError(err.response?.data?.message || 'Không thể tải khung giờ trống.');
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [date, dentistId, selectedServices]);

    const selectedServiceItems = useMemo(
        () => services.filter((service) => selectedServices.includes(Number(service.id))),
        [services, selectedServices]
    );
    const totalPrice = selectedServiceItems.reduce((sum, service) => sum + Number(service.price || 0), 0);
    const totalDuration = selectedServiceItems.reduce((sum, service) => sum + getServiceDurationValue(service), 0);
    const selectedDentist = dentists.find((dentist) => String(dentist.id) === String(dentistId));
    const hasReachedServiceLimit = selectedServices.length >= MAX_SERVICES_PER_APPOINTMENT;
    const hasReachedDurationLimit = totalDuration >= MAX_APPOINTMENT_DURATION_MINUTES;
    const sortedDentists = useMemo(() => {
        if (!date) return dentists;

        return [...dentists].sort((first, second) => {
            const firstAvailability = dentistAvailability[String(first.id)]?.available ?? 0;
            const secondAvailability = dentistAvailability[String(second.id)]?.available ?? 0;
            return secondAvailability - firstAvailability;
        });
    }, [dentists, date, dentistAvailability]);

    const categories = useMemo(() => {
        const unique = new Set();
        services.forEach((service) => {
            if (service.categoryName) unique.add(service.categoryName);
        });
        return Array.from(unique);
    }, [services]);

    const filteredServices = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return services.filter((service) => {
            const matchCategory = category === 'all' || service.categoryName === category;
            const text = `${service.name} ${service.description || ''} ${service.categoryName || ''}`.toLowerCase();
            return matchCategory && (!keyword || text.includes(keyword));
        });
    }, [services, category, search]);

    const toggleService = (id) => {
        const value = Number(id);
        const targetService = services.find((service) => Number(service.id) === value);

        setSelectedServices((prev) => {
            if (prev.includes(value)) {
                return prev.filter((serviceId) => serviceId !== value);
            }

            if (prev.length >= MAX_SERVICES_PER_APPOINTMENT) {
                const message = `Mỗi lịch hẹn chỉ được chọn tối đa ${MAX_SERVICES_PER_APPOINTMENT} dịch vụ.`;
                setError(message);
                toast.error(message);
                return prev;
            }

            const currentDuration = services
                .filter((service) => prev.includes(Number(service.id)))
                .reduce((sum, service) => sum + getServiceDurationValue(service), 0);
            const nextDuration = currentDuration + getServiceDurationValue(targetService);

            if (nextDuration > MAX_APPOINTMENT_DURATION_MINUTES) {
                const message = `Tổng thời lượng đang vượt ${MAX_APPOINTMENT_DURATION_MINUTES} phút. Bạn nên tách thành lịch hẹn khác để dễ chọn slot.`;
                setError(message);
                toast.error(message);
                return prev;
            }

            setError('');
            return [...prev, value];
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!dentistId) return setError('Vui lòng chọn bác sĩ.');
        if (!date || !time) return setError('Vui lòng chọn ngày và khung giờ khám.');
        if (selectedServices.length === 0) return setError('Vui lòng chọn ít nhất một dịch vụ.');
        if (selectedServices.length > MAX_SERVICES_PER_APPOINTMENT) return setError(`Mỗi lịch hẹn chỉ được chọn tối đa ${MAX_SERVICES_PER_APPOINTMENT} dịch vụ.`);
        if (totalDuration > MAX_APPOINTMENT_DURATION_MINUTES) return setError(`Tổng thời lượng không nên vượt ${MAX_APPOINTMENT_DURATION_MINUTES} phút cho một lịch hẹn.`);

        setSubmitting(true);
        try {
            await api.post('/appointments', {
                dentistId: Number(dentistId),
                appointmentDate: date,
                appointmentTime: `${time}:00`,
                notes,
                serviceIds: selectedServices
            });

            toast.success('Đặt lịch thành công. Nhân viên phòng khám sẽ xác nhận lịch hẹn của bạn.');
            setDate('');
            setTime('');
            setNotes('');
            setSelectedServices([]);
            setSlots([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể đặt lịch. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { label: 'Ngày', ready: Boolean(date) },
        { label: 'Dịch vụ', ready: selectedServices.length > 0 },
        { label: 'Bác sĩ', ready: Boolean(dentistId) },
        { label: 'Giờ khám', ready: Boolean(time) }
    ];

    if (authLoading) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#F8FCFC] px-4">
                <div className="rounded-2xl border border-blue-100 bg-white p-6 text-center shadow-lg">
                    <p className="text-sm font-black uppercase text-blue-700">Đang kiểm tra đăng nhập</p>
                    <p className="mt-2 text-sm font-bold text-slate-500">Vui lòng chờ trong giây lát.</p>
                </div>
            </main>
        );
    }

    if (!user) return null;

    return (
        <main className="min-h-screen bg-[#F8FCFC] text-slate-800">
            <section className="border-b border-blue-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Phenikaa Dental</p>
                            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">Đặt lịch khám nha khoa</h1>
                            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                                Chọn dịch vụ, bác sĩ và khung giờ phù hợp. Lễ tân sẽ xác nhận lịch trước khi bạn đến phòng khám.
                            </p>
                        </div>

                        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-2">
                            {steps.map((step, index) => (
                                <div
                                    key={step.label}
                                    className={`rounded-xl px-4 py-3 text-center transition ${
                                        step.ready ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
                                    }`}
                                >
                                    <p className="text-xs font-black">{String(index + 1).padStart(2, '0')}</p>
                                    <p className="mt-1 whitespace-nowrap text-xs font-black">{step.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
                            {error}
                        </div>
                    )}

                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-md">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Ngày khám</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Chọn ngày như chọn suất</h2>
                            </div>
                            <label className="block sm:w-56">
                                <span className="sr-only">Ngày khám</span>
                                <input
                                    type="date"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    value={date}
                                    onChange={(event) => setDate(event.target.value)}
                                    min={today}
                                    required
                                />
                            </label>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                            {dateOptions.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setDate(item.value)}
                                    className={`rounded-2xl border px-3 py-3 text-center transition ${
                                        date === item.value
                                            ? 'border-blue-600 bg-blue-700 text-white shadow-md'
                                            : 'border-blue-100 bg-blue-50 text-slate-700 hover:border-blue-300 hover:bg-white'
                                    }`}
                                >
                                    <span className="block text-xs font-black uppercase">{item.weekday}</span>
                                    <span className="mt-1 block text-base font-black">{item.day}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-md">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Dịch vụ</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Bạn cần khám gì hôm nay?</h2>
                            </div>
                            <Link to="/services" className="text-sm font-black text-blue-700 hover:text-blue-800">Xem bảng dịch vụ</Link>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                            <input
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Tìm dịch vụ..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                            <select
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                            >
                                <option value="all">Tất cả danh mục</option>
                                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </div>

                        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
                            hasReachedServiceLimit || hasReachedDurationLimit
                                ? 'border-amber-200 bg-[#FFF8F0] text-amber-800'
                                : 'border-blue-100 bg-blue-50 text-slate-600'
                        }`}>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    Đã chọn {selectedServices.length}/{MAX_SERVICES_PER_APPOINTMENT} dịch vụ · {totalDuration}/{MAX_APPOINTMENT_DURATION_MINUTES} phút
                                </span>
                                {(hasReachedServiceLimit || hasReachedDurationLimit) && (
                                    <span className="text-xs font-black uppercase">
                                        Nên tách thêm lịch nếu cần làm nhiều dịch vụ
                                    </span>
                                )}
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                <div
                                    className={`h-full rounded-full ${hasReachedDurationLimit ? 'bg-amber-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min((totalDuration / MAX_APPOINTMENT_DURATION_MINUTES) * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-4 grid max-h-[480px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                            {filteredServices.map((service) => {
                                const checked = selectedServices.includes(Number(service.id));
                                const serviceDuration = getServiceDurationValue(service);
                                const wouldExceedCount = !checked && selectedServices.length >= MAX_SERVICES_PER_APPOINTMENT;
                                const wouldExceedDuration = !checked && totalDuration + serviceDuration > MAX_APPOINTMENT_DURATION_MINUTES;
                                const blocked = wouldExceedCount || wouldExceedDuration;
                                return (
                                    <button
                                        key={service.id}
                                        type="button"
                                        onClick={() => toggleService(service.id)}
                                        className={`group rounded-2xl border p-4 text-left transition ${
                                            checked
                                                ? 'border-blue-400 bg-blue-50 shadow-sm'
                                                : blocked
                                                    ? 'border-slate-200 bg-slate-50 opacity-70 hover:border-amber-200 hover:bg-[#FFF8F0]'
                                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/60'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="line-clamp-2 text-base font-black text-slate-900">{service.name}</p>
                                                <p className="mt-1 text-xs font-black uppercase text-blue-700">{service.categoryName || 'Nha khoa'}</p>
                                            </div>
                                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-black ${
                                                checked
                                                    ? 'border-blue-500 bg-blue-500 text-white'
                                                    : blocked
                                                        ? 'border-amber-100 bg-[#FFF8F0] text-amber-700'
                                                        : 'border-blue-100 bg-blue-50 text-blue-700'
                                            }`}>
                                                {checked ? '✓' : blocked ? '!' : '+'}
                                            </span>
                                        </div>
                                        <p className="mt-3 line-clamp-2 min-h-[44px] text-sm font-semibold leading-6 text-slate-500">
                                            {service.description || 'Dịch vụ đang tiếp nhận lịch hẹn.'}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                                            <span className="rounded-full bg-white px-3 py-1.5 text-blue-700 shadow-sm">{formatCurrency(service.price)}</span>
                                            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-slate-600">{serviceDuration} phút</span>
                                            {blocked && (
                                                <span className="rounded-full bg-[#FFF8F0] px-3 py-1.5 text-amber-700">
                                                    Vượt giới hạn
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}

                            {filteredServices.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-bold text-slate-600 sm:col-span-2">
                                    {services.length === 0 ? 'Hiện chưa có dịch vụ nào để đặt lịch.' : 'Không tìm thấy dịch vụ phù hợp.'}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-md">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Bác sĩ</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Bác sĩ phù hợp với ngày đã chọn</h2>
                            </div>
                            {loadingDentistAvailability && (
                                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                                    Đang kiểm tra slot
                                </span>
                            )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {sortedDentists.map((dentist) => {
                                const selected = String(dentist.id) === String(dentistId);
                                const avatar = getProfileImage(dentist);
                                const availability = dentistAvailability[String(dentist.id)];
                                const unavailable = Boolean(date && availability && availability.available === 0);
                                return (
                                    <button
                                        key={dentist.id}
                                        type="button"
                                        disabled={unavailable && !selected}
                                        onClick={() => setDentistId(String(dentist.id))}
                                        className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                                            selected
                                                ? 'border-blue-400 bg-blue-50 shadow-sm'
                                                : unavailable
                                                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
                                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/60'
                                        }`}
                                    >
                                        {avatar ? (
                                            <img src={avatar} alt={dentist.fullName} className="h-14 w-14 rounded-2xl object-cover" />
                                        ) : (
                                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-100 text-base font-black text-blue-700">
                                                {getInitials(dentist.fullName)}
                                            </span>
                                        )}
                                        <span className="min-w-0">
                                            <span className="block font-black text-slate-900">{dentist.fullName}</span>
                                            <span className="mt-1 block text-sm font-semibold text-slate-500">{dentist.specialty || 'Bác sĩ nha khoa'}</span>
                                            {date && (
                                                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                                                    availability?.available > 0
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                    {availability
                                                        ? availability.available > 0
                                                            ? `${availability.available} slot trống${availability.firstTime ? ` · sớm nhất ${availability.firstTime}` : ''}`
                                                            : 'Hết slot ngày này'
                                                        : 'Đang kiểm tra'}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}

                            {dentists.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-bold text-slate-600 md:col-span-2">
                                    Hiện chưa có bác sĩ đang hoạt động.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-md">
                        <div>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Khung giờ</p>
                                    <h2 className="mt-1 text-xl font-black text-slate-900">Chọn suất khám còn trống</h2>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                        {date && selectedDentist
                                            ? `${selectedDentist.fullName} · ${formatDate(date)}`
                                            : 'Chọn ngày và bác sĩ để xem giờ còn trống.'}
                                    </p>
                                </div>
                                {loadingSlots && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Đang tải</span>}
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                                {loadingSlots ? (
                                    <div className="col-span-full rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
                                        Đang kiểm tra lịch bác sĩ...
                                    </div>
                                ) : slots.length ? slots.map((slot) => (
                                    <button
                                        type="button"
                                        key={slot.time}
                                        disabled={!slot.available}
                                        onClick={() => setTime(slot.time)}
                                        title={slot.available ? `Chọn ${slot.time}` : 'Slot này không khả dụng'}
                                        className={`h-12 rounded-2xl border text-sm font-black transition ${
                                            time === slot.time
                                                ? 'border-blue-700 bg-blue-700 text-white shadow-md'
                                                : slot.available
                                                    ? 'border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-white'
                                                    : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'
                                        }`}
                                    >
                                        {slot.time}
                                    </button>
                                )) : (
                                    <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                                        {!date
                                            ? 'Chọn ngày khám trước để hệ thống gợi ý bác sĩ còn slot.'
                                            : !dentistId
                                                ? 'Chọn một bác sĩ còn slot để xem giờ khám.'
                                                : 'Bác sĩ này không còn khung giờ phù hợp với dịch vụ/ngày đã chọn.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-md">
                        <label className="block">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Ghi chú</span>
                            <textarea
                                rows="4"
                                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Ví dụ: đau răng hàm trái, muốn tư vấn niềng răng..."
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                            />
                        </label>
                    </section>
                </form>

                <aside className="h-fit space-y-4 lg:sticky lg:top-24">
                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-md">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Lịch bạn chọn</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900">Tóm tắt đặt lịch</h2>

                        <div className="mt-5 space-y-3">
                            <div className="rounded-2xl bg-blue-50 p-4">
                                <p className="text-xs font-black uppercase text-slate-500">Dịch vụ</p>
                                {selectedServiceItems.length ? (
                                    <div className="mt-2 space-y-2">
                                        {selectedServiceItems.slice(0, 3).map((service) => (
                                            <div key={service.id} className="flex items-start justify-between gap-3 text-sm">
                                                <span className="font-bold text-slate-700">{service.name}</span>
                                                <span className="shrink-0 font-black text-blue-700">{formatCurrency(service.price)}</span>
                                            </div>
                                        ))}
                                        {selectedServiceItems.length > 3 && (
                                            <p className="text-xs font-black text-slate-500">+{selectedServiceItems.length - 3} dịch vụ khác</p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="mt-2 font-black text-slate-900">Chưa chọn dịch vụ</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-black uppercase text-slate-500">Bác sĩ</p>
                                    <p className="mt-2 min-h-[44px] font-black text-slate-900">{selectedDentist?.fullName || 'Chưa chọn'}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-black uppercase text-slate-500">Thời gian</p>
                                    <p className="mt-2 min-h-[44px] font-black text-slate-900">{date ? formatDate(date) : 'Chưa chọn'}{time ? ` · ${time}` : ''}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-[#FFF8F0] p-4">
                                    <p className="text-xs font-black uppercase text-slate-500">Chi phí dự kiến</p>
                                    <p className="mt-2 whitespace-nowrap text-lg font-black text-slate-900">{formatCurrency(totalPrice)}</p>
                                </div>
                                <div className="rounded-2xl bg-[#FFE5EC] p-4">
                                    <p className="text-xs font-black uppercase text-slate-500">Thời lượng</p>
                                    <p className="mt-2 text-lg font-black text-slate-900">{totalDuration || 0} phút</p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleSubmit}
                            className="mt-5 w-full rounded-2xl bg-blue-700 px-5 py-4 font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            {submitting ? 'Đang gửi lịch hẹn...' : 'Gửi yêu cầu đặt lịch'}
                        </button>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <p className="font-black text-slate-900">Cần hỗ trợ nhanh?</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Hotline 24/7: <span className="font-black text-blue-700">0869 800 318</span></p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Lịch hẹn sẽ được xác nhận bởi lễ tân trước khi khám.</p>
                    </section>
                </aside>
            </section>
        </main>
    );
}
