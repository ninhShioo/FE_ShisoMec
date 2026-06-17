import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/auth-context';

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
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const today = useMemo(() => getTodayValue(), []);

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
                if (nextDentists.length) setDentistId(String(nextDentists[0].id));
            } catch {
                setError('Không thể tải dữ liệu đặt lịch. Vui lòng thử lại sau.');
            }
        };

        fetchData();
    }, [authLoading, user, navigate, location.pathname, location.search]);

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
                setSlots(res.data.data || []);
                setTime('');
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
        () => services.filter((service) => selectedServices.includes(service.id)),
        [services, selectedServices]
    );
    const totalPrice = selectedServiceItems.reduce((sum, service) => sum + Number(service.price || 0), 0);
    const totalDuration = selectedServiceItems.reduce((sum, service) => sum + Number(service.duration || 0), 0);
    const selectedDentist = dentists.find((dentist) => String(dentist.id) === String(dentistId));

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
        setSelectedServices((prev) => prev.includes(id) ? prev.filter((serviceId) => serviceId !== id) : [...prev, id]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');

        if (!dentistId) return setError('Vui lòng chọn bác sĩ.');
        if (!date || !time) return setError('Vui lòng chọn ngày và khung giờ khám.');
        if (selectedServices.length === 0) return setError('Vui lòng chọn ít nhất một dịch vụ.');

        setSubmitting(true);
        try {
            await api.post('/appointments', {
                dentistId: Number(dentistId),
                appointmentDate: date,
                appointmentTime: `${time}:00`,
                notes,
                serviceIds: selectedServices
            });

            setMessage('Đặt lịch thành công. Nhân viên phòng khám sẽ xác nhận lịch hẹn của bạn.');
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

    if (authLoading) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#f7fbff] px-4">
                <div className="rounded-2xl border border-blue-100 bg-white p-6 text-center shadow-xl shadow-blue-100">
                    <p className="text-sm font-black uppercase text-blue-700">Đang kiểm tra đăng nhập</p>
                    <p className="mt-2 text-sm font-bold text-slate-500">Vui lòng chờ trong giây lát.</p>
                </div>
            </main>
        );
    }

    if (!user) return null;

    return (
        <main className="min-h-screen bg-[#f7fbff]">
            <section className="border-b border-blue-100 bg-[linear-gradient(115deg,#eef7ff_0%,#ffffff_50%,#e8f3ff_100%)]">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
                    <div>
                        <p className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black uppercase text-blue-700">Đặt lịch khám</p>
                        <h1 className="mt-5 text-4xl font-black leading-tight text-blue-950 sm:text-5xl">Chọn bác sĩ, ngày khám và khung giờ trống</h1>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                            Xin chào, <span className="font-black text-blue-800">{user.fullName}</span>. Khung giờ đã được kiểm tra theo lịch bác sĩ để hạn chế trùng lịch.
                        </p>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100">
                        {['Chọn bác sĩ', 'Chọn slot trống', 'Gửi yêu cầu'].map((label, index) => (
                            <div key={label} className="flex items-center gap-3">
                                <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${index === 0 ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'}`}>{String(index + 1).padStart(2, '0')}</span>
                                <span className="text-sm font-black text-slate-700">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
                <form onSubmit={handleSubmit} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100 sm:p-6">
                    {message && (
                        <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                            {message}
                            <Link to="/profile" className="ml-2 font-black underline">Xem hồ sơ</Link>
                        </div>
                    )}
                    {error && <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">{error}</div>}

                    <div className="grid gap-4 lg:grid-cols-3">
                        <label className="text-sm font-black text-slate-700 lg:col-span-3">
                            Bác sĩ
                            <select
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                value={dentistId}
                                onChange={(event) => setDentistId(event.target.value)}
                                required
                            >
                                <option value="">Chọn bác sĩ</option>
                                {dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.fullName}</option>)}
                            </select>
                        </label>

                        <label className="text-sm font-black text-slate-700">
                            Ngày khám
                            <input
                                type="date"
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                value={date}
                                onChange={(event) => setDate(event.target.value)}
                                min={today}
                                required
                            />
                        </label>

                        <div className="lg:col-span-2">
                            <p className="text-sm font-black text-slate-700">Khung giờ trống</p>
                            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                                {loadingSlots ? (
                                    <div className="col-span-full rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">Đang tải khung giờ...</div>
                                ) : slots.length ? slots.map((slot) => (
                                    <button
                                        type="button"
                                        key={slot.time}
                                        disabled={!slot.available}
                                        onClick={() => setTime(slot.time)}
                                        className={`h-11 rounded-xl border text-sm font-black transition ${
                                            time === slot.time
                                                ? 'border-blue-700 bg-blue-700 text-white'
                                                : slot.available
                                                    ? 'border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-white'
                                                    : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'
                                        }`}
                                    >
                                        {slot.time}
                                    </button>
                                )) : (
                                    <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-500">
                                        Chọn bác sĩ và ngày khám để xem slot trống.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-7">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                            <div>
                                <p className="text-sm font-black uppercase text-blue-700">Dịch vụ cần khám</p>
                                <h2 className="mt-1 text-2xl font-black text-blue-950">Chọn một hoặc nhiều dịch vụ</h2>
                            </div>
                            <Link to="/services" className="text-sm font-black text-blue-700 hover:text-blue-800">Xem bảng dịch vụ</Link>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                            <input
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="Tìm dịch vụ..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                            <select
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                            >
                                <option value="all">Tất cả danh mục</option>
                                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </div>

                        <div className="mt-4 grid max-h-[520px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                            {filteredServices.map((service) => {
                                const checked = selectedServices.includes(service.id);
                                return (
                                    <label key={service.id} className={`cursor-pointer rounded-2xl border p-4 transition ${checked ? 'border-blue-400 bg-blue-50 shadow-sm shadow-blue-100' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'}`}>
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-200"
                                                checked={checked}
                                                onChange={() => toggleService(service.id)}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-blue-950">{service.name}</p>
                                                <p className="mt-1 text-xs font-bold uppercase text-blue-600">{service.categoryName || 'Nha khoa'}</p>
                                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{service.description || 'Dịch vụ đang tiếp nhận lịch hẹn.'}</p>
                                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                                                    <span className="rounded-full bg-white px-3 py-1.5 text-blue-700">{formatCurrency(service.price)}</span>
                                                    <span className="rounded-full bg-white px-3 py-1.5 text-slate-600">{service.duration || 30} phút</span>
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}

                            {filteredServices.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-bold text-slate-600 sm:col-span-2">
                                    {services.length === 0 ? 'Hiện chưa có dịch vụ nào để đặt lịch.' : 'Không tìm thấy dịch vụ phù hợp.'}
                                </div>
                            )}
                        </div>
                    </div>

                    <label className="mt-6 block text-sm font-black text-slate-700">
                        Ghi chú triệu chứng
                        <textarea
                            rows="4"
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            placeholder="Ví dụ: đau răng hàm trái, muốn tư vấn niềng răng..."
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3.5 font-black uppercase text-white shadow-xl shadow-blue-100 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                        {submitting ? 'Đang gửi lịch hẹn...' : 'Gửi lịch hẹn'}
                    </button>
                </form>

                <aside className="h-fit space-y-4 lg:sticky lg:top-24">
                    <div className="rounded-2xl bg-gradient-to-br from-blue-800 to-blue-600 p-6 text-white shadow-xl shadow-blue-100">
                        <p className="text-sm font-black uppercase text-blue-100">Tóm tắt lịch hẹn</p>
                        <h2 className="mt-2 text-2xl font-black">Thông tin đặt lịch</h2>

                        <div className="mt-5 space-y-3">
                            <div className="rounded-xl bg-white/12 p-4">
                                <p className="text-xs font-black uppercase text-blue-100">Bác sĩ</p>
                                <p className="mt-1 font-black">{selectedDentist?.fullName || 'Chưa chọn'}</p>
                            </div>
                            <div className="rounded-xl bg-white/12 p-4">
                                <p className="text-xs font-black uppercase text-blue-100">Thời gian</p>
                                <p className="mt-1 font-black">{date || 'Chưa chọn ngày'} {time && `- ${time}`}</p>
                            </div>
                            <div className="rounded-xl bg-white/12 p-4">
                                <p className="text-xs font-black uppercase text-blue-100">Dịch vụ đã chọn</p>
                                <p className="mt-1 font-black">{selectedServiceItems.length} dịch vụ</p>
                            </div>
                            <div className="rounded-xl bg-white/12 p-4">
                                <p className="text-xs font-black uppercase text-blue-100">Chi phí dự kiến</p>
                                <p className="mt-1 font-black">{formatCurrency(totalPrice)}</p>
                            </div>
                            <div className="rounded-xl bg-white/12 p-4">
                                <p className="text-xs font-black uppercase text-blue-100">Thời lượng dự kiến</p>
                                <p className="mt-1 font-black">{totalDuration || 0} phút</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100">
                        <p className="font-black text-blue-950">Lưu ý trước khi gửi lịch</p>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                            <li>• Lịch hẹn cần nhân viên xác nhận trước khi khám.</li>
                            <li>• Khung giờ mờ là đã qua hoặc đã có lịch.</li>
                            <li>• Chi phí có thể thay đổi sau khi bác sĩ thăm khám.</li>
                        </ul>
                    </div>
                </aside>
            </section>
        </main>
    );
}
