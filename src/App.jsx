import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/auth-context';
import { useContext, useEffect, useMemo, useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import ServicesList from './pages/ServicesList';
import BookAppointment from './pages/BookAppointment';
import Doctors from './pages/Doctors';
import Pricing from './pages/Pricing';
import Knowledge from './pages/Knowledge';
import Contact from './pages/Contact';
import Reviews from './pages/Reviews';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import VnpayReturn from './pages/VnpayReturn';
import ChatBox from './components/ChatBox';
import NotificationBell from './components/NotificationBell';
import api from './services/api';
import heroImage from './assets/hero-pastel-dental.png';
import logoImage from './assets/phenikaa-dental-logo.svg';
import { applyTheme, getStoredTheme } from './utils/theme';

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (!amount) return 'Liên hệ';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
};

const serviceVisuals = [
  'from-blue-50 to-white text-blue-700',
  'from-cyan-50 to-white text-cyan-700',
  'from-[#FFF8F0] to-white text-blue-700',
  'from-[#FFE5EC] to-white text-rose-700',
  'from-blue-50 to-cyan-50 text-blue-800',
  'from-slate-50 to-white text-slate-700'
];

const doctorTones = [
  'bg-blue-100 text-blue-700',
  'bg-cyan-100 text-cyan-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700'
];

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  if (location.pathname === '/login' || location.pathname === '/register') return null;

  const isPatientView = !user || user.role === 'patient';

  return (
    <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={logoImage} alt="Phenikaa Dental" className="h-12 w-auto max-w-[190px] object-contain sm:max-w-[220px]" />
          <span className="hidden">
            
          </span>
          <div className="hidden">
            <span className="block truncate text-lg font-black uppercase tracking-normal text-blue-800"></span>
            <span className="block truncate text-xs font-semibold text-slate-500">Nụ cười khỏe đẹp</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          <Link to="/" className="border-b-2 border-blue-600 py-6 text-sm font-black text-blue-700">Trang chủ</Link>
          <a href="/#services" className="py-6 text-sm font-bold text-slate-700 hover:text-blue-700">Dịch vụ</a>
          <a href="/#doctors" className="py-6 text-sm font-bold text-slate-700 hover:text-blue-700">Bác sĩ</a>
          <a href="/#feedback" className="py-6 text-sm font-bold text-slate-700 hover:text-blue-700">Feedback</a>
          <a href="/#booking" className="py-6 text-sm font-bold text-slate-700 hover:text-blue-700">Liên hệ</a>
          {user && user.role !== 'patient' && <Link to="/dashboard" className="py-6 text-sm font-black text-blue-700">Khu làm việc</Link>}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 xl:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-black text-blue-700">24</span>
            <div className="leading-tight">
              <p className="text-[11px] font-bold text-slate-500">Hotline 24/7</p>
              <p className="text-sm font-black text-blue-700">0869 800 318</p>
            </div>
          </div>

          {user ? (
            <>
              <NotificationBell />
              <Link to={user.role === 'patient' ? '/profile' : '/dashboard'} className="hidden max-w-36 truncate text-sm font-bold text-slate-600 hover:text-blue-700 sm:block">
                {user.fullName}
              </Link>
              {isPatientView && (
                <Link to="/book-appointment" className="hidden rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 sm:block">
                  Đặt lịch khám
                </Link>
              )}
              <button onClick={logout} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-black text-rose-600 hover:bg-rose-100">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden text-sm font-black text-slate-700 hover:text-blue-700 sm:block">Đăng nhập</Link>
              <Link to="/register" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800">
                Đặt lịch khám
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Home() {
  const { user } = useContext(AuthContext);
  const [services, setServices] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [homeReviews, setHomeReviews] = useState([]);
  const [publicSettings, setPublicSettings] = useState(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const isStaff = user && user.role !== 'patient';

  useEffect(() => {
    let mounted = true;

    const loadHomeData = async () => {
      try {
        const [serviceResult, dentistResult, reviewResult, settingsResult] = await Promise.allSettled([
          api.get('/services'),
          api.get('/users/public/dentists'),
          api.get('/reviews/public'),
          api.get('/settings/public')
        ]);

        if (!mounted) return;

        if (serviceResult.status === 'fulfilled') {
          setServices(serviceResult.value.data?.data || []);
        }

        if (dentistResult.status === 'fulfilled') {
          setDentists(dentistResult.value.data?.data || []);
        }

        if (reviewResult.status === 'fulfilled') {
          setHomeReviews(reviewResult.value.data?.data || []);
        }

        if (settingsResult.status === 'fulfilled') {
          const nextSettings = settingsResult.value.data?.data || null;
          setPublicSettings(nextSettings);
          if (nextSettings?.theme) applyTheme(nextSettings.theme);
        }
      } catch (error) {
        console.error('Khong the tai du lieu trang chu:', error);
      } finally {
        if (mounted) setHomeLoading(false);
      }
    };

    loadHomeData();

    return () => {
      mounted = false;
    };
  }, []);

  const featuredServices = useMemo(() => services.slice(0, 6), [services]);
  const featuredDentists = useMemo(() => dentists.slice(0, 4), [dentists]);
  const featuredReviews = useMemo(() => {
    const fallbackReviews = [
      { id: 'fallback-1', rating: 5, comment: 'Lịch khám rõ ràng, nhân viên xác nhận nhanh và không bị trùng giờ.', patientName: 'Thu Trang', serviceName: 'Đặt lịch online' },
      { id: 'fallback-2', rating: 5, comment: 'Dịch vụ hiển thị giá trước nên dễ chọn, bác sĩ tư vấn dễ hiểu.', patientName: 'Hoàng Nam', serviceName: 'Tư vấn nha khoa' },
      { id: 'fallback-3', rating: 5, comment: 'Hồ sơ sau khám lưu lại trên hệ thống, tôi xem lại rất tiện.', patientName: 'Minh Châu', serviceName: 'Hồ sơ điều trị' }
    ];

    return (homeReviews.length ? homeReviews : fallbackReviews).slice(0, 3);
  }, [homeReviews]);

  const clinicInfo = publicSettings || {
    phone: '0869 800 318',
    email: 'contact@phenikaadental.vn',
    address: 'Phenikaa Dental',
    openingHours: '08:00 - 20:00',
    maintenanceMode: false,
    allowOnlineBooking: true
  };
  const bookingEnabled = clinicInfo.allowOnlineBooking && !clinicInfo.maintenanceMode;
  const telHref = `tel:${String(clinicInfo.phone || '').replace(/[^\d+]/g, '')}`;
  const primaryAction = isStaff
    ? { to: '/dashboard', label: 'Mở khu làm việc' }
    : bookingEnabled
      ? { to: user ? '/book-appointment' : '/login', label: user ? 'Đặt lịch ngay' : 'Đăng nhập đặt lịch' }
      : { href: telHref, label: 'Gọi hotline' };

  const stats = [
    ['15+', 'Năm kinh nghiệm', 'Trong lĩnh vực nha khoa'],
    [services.length || '-', 'Dịch vụ', 'Lấy từ hệ thống'],
    [dentists.length || '-', 'Bác sĩ', 'Đang hoạt động'],
    ['99%', 'Hài lòng', 'Chăm sóc tận tâm']
  ];

  return (
    <main className="bg-[#F8FCFC] text-slate-900">
      <section className="relative overflow-hidden bg-[linear-gradient(105deg,#F8FCFC_0%,#FFFFFF_48%,#EAF7F5_100%)]">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-white" />
        <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:px-8">
          <div className="relative z-10 max-w-2xl">
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-normal text-blue-950 sm:text-5xl lg:text-6xl">
              Nụ cười khỏe đẹp chuẩn phòng khám hiện đại
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              Đội ngũ bác sĩ tiếp nhận lịch rõ ràng, dịch vụ được quản lý từ hệ thống, quy trình khám và hồ sơ điều trị minh bạch cho từng khách hàng.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ['Bác sĩ chuyên môn', 'Theo lịch được phân công'],
                ['Dịch vụ rõ ràng', 'Giá và thời lượng minh bạch'],
                ['Hồ sơ điều trị', 'Theo dõi sau mỗi lần khám']
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blue-200 bg-white text-sm font-black text-blue-700">✓</span>
                  <div>
                    <p className="text-sm font-black text-blue-950">{title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {primaryAction.to ? (
                <Link to={primaryAction.to} className="rounded-lg bg-blue-700 px-6 py-3.5 text-center text-sm font-black uppercase text-white shadow-xl shadow-blue-200 hover:bg-blue-800">
                  {primaryAction.label}
                </Link>
              ) : (
                <a href={primaryAction.href} className="rounded-lg bg-blue-700 px-6 py-3.5 text-center text-sm font-black uppercase text-white shadow-xl shadow-blue-200 hover:bg-blue-800">
                  {primaryAction.label}
                </a>
              )}
              <Link to="/services" className="rounded-lg border border-blue-300 bg-white px-6 py-3.5 text-center text-sm font-black uppercase text-blue-700 shadow-sm hover:bg-blue-50">
                Xem dịch vụ
              </Link>
            </div>
          </div>

          <div className="relative min-h-[420px]">
            <img src={heroImage} alt="Không gian phòng khám nha khoa pastel hiện đại" className="absolute inset-0 h-full w-full rounded-[1.25rem] object-cover object-center shadow-xl shadow-blue-100" />
            <div className="absolute bottom-8 right-5 w-[260px] rounded-2xl border border-white/80 bg-white/95 p-5 shadow-lg">
              <p className="text-base font-black text-blue-950">Tư vấn miễn phí</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Chọn dịch vụ, ngày khám và gửi yêu cầu đặt lịch online.</p>
              <div className="mt-4 flex items-center gap-2">
                {featuredDentists.slice(0, 4).map((doctor, index) => (
                  <div key={doctor.id} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-xs font-black ${doctorTones[index % doctorTones.length]}`}>
                    {(doctor.fullName || 'B').trim()[0]}
                  </div>
                ))}
                <span className="text-xs font-black text-blue-700">{dentists.length || 0}+ bác sĩ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100 md:grid-cols-4">
            {stats.map(([value, label, desc]) => (
              <div key={label} className="border-b border-blue-100 p-6 md:border-b-0 md:border-r last:border-r-0">
                <p className="text-3xl font-black text-blue-700">{value}</p>
                <p className="mt-2 text-sm font-black uppercase text-blue-950">{label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black uppercase text-blue-700">Dịch vụ nổi bật</p>
              <h2 className="mt-2 text-3xl font-black text-blue-950">Giải pháp toàn diện cho nụ cười của bạn</h2>
            </div>
            <Link to="/services" className="rounded-lg border border-blue-300 px-5 py-3 text-center text-sm font-black uppercase text-blue-700 hover:bg-blue-50">
              Xem tất cả dịch vụ
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {featuredServices.length ? featuredServices.map((service, index) => (
              <article key={service.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-50 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100">
                <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${serviceVisuals[index % serviceVisuals.length]}`}>
                  <img src={service.displayImage || service.image || service.defaultImage} alt={service.name} className="h-28 w-full object-cover" />
                </div>
                <p className="mt-4 text-xs font-black uppercase text-blue-700">{service.categoryName || 'Nha khoa'}</p>
                <h3 className="mt-1 min-h-12 text-sm font-black uppercase leading-5 text-blue-950">{service.name}</h3>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{service.description || 'Dịch vụ đang tiếp nhận lịch hẹn.'}</p>
                <p className="mt-3 text-xs font-black text-blue-700">{formatCurrency(service.price)}</p>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-sm font-bold text-slate-600 sm:col-span-2 lg:col-span-3 xl:col-span-6">
                {homeLoading ? 'Đang tải dịch vụ...' : 'Chưa có dịch vụ đang hiển thị.'}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="doctors" className="bg-[#F8FCFC] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black uppercase text-blue-700">Đội ngũ bác sĩ</p>
              <h2 className="mt-2 text-3xl font-black text-blue-950">Chuyên môn rõ, lịch khám rõ</h2>
            </div>
            <Link to="/book-appointment" className="rounded-lg border border-blue-300 bg-white px-5 py-3 text-center text-sm font-black uppercase text-blue-700 hover:bg-blue-50">
              Đặt lịch với bác sĩ
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredDentists.length ? featuredDentists.map((doctor, index) => (
              <article key={doctor.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm shadow-blue-50">
                <div className="flex min-h-36 items-end justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 pt-6">
                  {doctor.displayAvatar || doctor.avatar ? (
                    <img src={doctor.displayAvatar || doctor.avatar} alt={doctor.fullName} className="h-32 w-32 rounded-t-3xl object-cover" />
                  ) : (
                    <div className={`mb-5 grid h-24 w-24 place-items-center rounded-full text-3xl font-black ${doctorTones[index % doctorTones.length]}`}>
                      {(doctor.fullName || 'B').trim()[0]}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-black uppercase text-blue-700">Bác sĩ nha khoa</p>
                  <h3 className="mt-1 text-base font-black text-blue-950">{doctor.fullName}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Tiếp nhận và xử lý lịch khám được phân công.</p>
                  {doctor.phone && <p className="mt-4 text-sm font-black text-blue-700">{doctor.phone}</p>}
                </div>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-6 text-sm font-bold text-slate-600 md:col-span-2 xl:col-span-4">
                {homeLoading ? 'Đang tải danh sách bác sĩ...' : 'Chưa có bác sĩ đang hoạt động.'}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="feedback" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase text-blue-700">Khách hàng nói về chúng tôi</p>
          <h2 className="mt-2 text-3xl font-black text-blue-950">Trải nghiệm sau khi đặt lịch online</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {featuredReviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm shadow-blue-50">
                <p className="text-sm font-black text-amber-400">{'★'.repeat(Number(review.rating || 5))}</p>
                <p className="mt-4 leading-7 text-slate-600">{review.comment}</p>
                <p className="mt-5 font-black text-blue-950">{review.patientName}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{review.serviceName || 'Dịch vụ nha khoa'}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 text-right">
            <Link to="/reviews" className="text-sm font-black text-blue-700 hover:text-blue-800">Xem thêm đánh giá</Link>
          </div>
        </div>
      </section>

      <section id="booking" className="bg-[#F8FCFC] pb-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-blue-800 to-blue-700 p-8 text-white shadow-xl shadow-blue-100">
            <h2 className="text-3xl font-black">Đặt lịch khám ngay</h2>
            <p className="mt-3 leading-7 text-blue-50">Để được tư vấn và thăm khám miễn phí theo lịch phù hợp.</p>
            <div className="mt-8 space-y-3 text-sm font-bold">
              {['Tư vấn dịch vụ chuyên sâu', 'Chọn ngày giờ khám online', 'Nhân viên xác nhận lịch', 'Theo dõi hồ sơ sau khám'].map((item) => (
                <p key={item} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">✓</span>{item}</p>
              ))}
            </div>
            <div className="mt-8 rounded-2xl bg-white p-4 text-blue-800">
              <p className="text-xs font-black uppercase text-slate-500">Hotline 24/7</p>
              <p className="mt-1 text-2xl font-black">{clinicInfo.phone}</p>
              <p className="mt-3 text-sm font-bold text-slate-600">{clinicInfo.openingHours}</p>
              <p className="mt-1 text-sm text-slate-500">{clinicInfo.address}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-600">
                Họ và tên
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" placeholder={user?.fullName || 'Nhập họ và tên'} />
              </label>
              <label className="text-sm font-bold text-slate-600">
                Số điện thoại
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" placeholder="Nhập số điện thoại" />
              </label>
              <label className="text-sm font-bold text-slate-600 sm:col-span-2">
                Dịch vụ quan tâm
                <select className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500">
                  <option>Chọn dịch vụ</option>
                  {services.map((service) => <option key={service.id}>{service.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-600">
                Ngày hẹn
                <input type="date" className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm font-bold text-slate-600">
                Thời gian
                <input type="time" className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm font-bold text-slate-600 sm:col-span-2">
                Ghi chú
                <textarea className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" placeholder="Nhu cầu khám hoặc tình trạng hiện tại" />
              </label>
            </div>
            {bookingEnabled ? (
              <Link to="/book-appointment" className="mt-5 block rounded-lg bg-blue-700 px-5 py-3.5 text-center text-sm font-black uppercase text-white hover:bg-blue-800">
                Đặt lịch ngay
              </Link>
            ) : (
              <a href={telHref} className="mt-5 block rounded-lg bg-blue-700 px-5 py-3.5 text-center text-sm font-black uppercase text-white hover:bg-blue-800">
                Liên hệ hotline
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ThemeBootstrap() {
  useEffect(() => {
    applyTheme(getStoredTheme());

    let mounted = true;
    api.get('/settings/public')
      .then((res) => {
        if (mounted) applyTheme(res.data?.data?.theme);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 relative">
          <Toaster position="top-right" />
          <ThemeBootstrap />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/services" element={<ServicesList />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/book-appointment" element={<BookAppointment />} />
            <Route path="/vnpay-return" element={<VnpayReturn />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatBox />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
