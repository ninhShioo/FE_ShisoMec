import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import AppointmentsTab from '../components/dashboard/AppointmentsTab';
import ServicesTab from '../components/dashboard/ServicesTab';
import InvoicesTab from '../components/dashboard/InvoicesTab';
import AnalyticsTab from '../components/dashboard/AnalyticsTab';
import UsersTab from '../components/dashboard/UsersTab';
import SettingsTab from '../components/dashboard/SettingsTab';
import PromotionsTab from '../components/dashboard/PromotionsTab';
import SchedulesTab from '../components/dashboard/SchedulesTab';
import DentistDayOffTab from '../components/dashboard/DentistDayOffTab';
import WorkspaceSummary from '../components/dashboard/WorkspaceSummary';
import ReviewsTab from '../components/dashboard/ReviewsTab';
import NotificationsHistoryTab from '../components/dashboard/NotificationsHistoryTab';

const roleLabels = {
    admin: 'Quản trị viên',
    staff: 'Nhân viên lễ tân',
    dentist: 'Bác sĩ',
    patient: 'Khách hàng'
};

const roleSubtitles = {
    admin: 'Theo dõi vận hành phòng khám, doanh thu, dịch vụ, tài khoản và cấu hình hệ thống.',
    staff: 'Tiếp nhận lịch hẹn, xác nhận lịch, phân công bác sĩ và xử lý hóa đơn.',
    dentist: 'Xem lịch khám được phân công, cập nhật hồ sơ điều trị và hoàn tất ca khám.'
};

const roleWorkflows = {
    admin: [
        ['Tổng quan', 'Theo dõi số liệu vận hành và doanh thu.'],
        ['Dịch vụ', 'Quản lý danh mục, giá, thời lượng và trạng thái dịch vụ.'],
        ['Tài khoản', 'Tạo và khóa/mở khóa tài khoản nhân sự.']
    ],
    staff: [
        ['Tiếp nhận lịch', 'Kiểm tra yêu cầu đặt lịch từ khách hàng.'],
        ['Phân công bác sĩ', 'Gán bác sĩ phù hợp và xác nhận lịch khám.'],
        ['Hóa đơn', 'Xuất hóa đơn sau khi lịch hẹn hoàn tất.']
    ],
    dentist: [
        ['Lịch của tôi', 'Xem các lịch hẹn được phân công.'],
        ['Hồ sơ điều trị', 'Ghi chẩn đoán, đơn thuốc, ghi chú và tài liệu đính kèm.'],
        ['Đăng ký nghỉ', 'Gửi yêu cầu nghỉ để admin/lễ tân duyệt và khóa lịch đặt khám.']
    ]
};

export default function Dashboard() {
    const { user, loading: authLoading } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('appointments');

    const tabs = useMemo(() => {
        if (!user) return [];

        const appointmentLabel = user.role === 'dentist' ? 'Lịch khám của tôi' : 'Lịch hẹn';

        return [
            user.role === 'admin' && ['analytics', 'Tổng quan'],
            ['appointments', appointmentLabel],
            user.role === 'admin' && ['services', 'Dịch vụ'],
            (user.role === 'admin' || user.role === 'staff') && ['invoices', 'Hóa đơn'],
            (user.role === 'admin' || user.role === 'staff') && ['schedules', 'Lịch làm việc'],
            user.role === 'dentist' && ['dayOff', 'Đăng ký nghỉ'],
            ['notifications', 'Thông báo'],
            user.role === 'admin' && ['promotions', 'Khuyến mãi'],
            user.role === 'admin' && ['reviews', 'Đánh giá'],
            user.role === 'admin' && ['users', 'Tài khoản'],
            user.role === 'admin' && ['settings', 'Cài đặt']
        ].filter(Boolean);
    }, [user]);

    const tabNames = useMemo(() => Object.fromEntries(tabs), [tabs]);

    useEffect(() => {
        if (!authLoading && (!user || user.role === 'patient')) {
            navigate('/');
            return;
        }

        if (!authLoading && user) {
            const requestedTab = new URLSearchParams(location.search).get('tab');
            const availableTabs = tabs.map(([key]) => key);
            setActiveTab(availableTabs.includes(requestedTab) ? requestedTab : (user.role === 'admin' ? 'analytics' : 'appointments'));
        }
    }, [user, authLoading, navigate, location.search, tabs]);

    useEffect(() => {
        if (tabs.length > 0 && !tabs.some(([key]) => key === activeTab)) {
            setActiveTab(tabs[0][0]);
        }
    }, [tabs, activeTab]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#f7fbff] p-10 text-center font-bold text-slate-500">
                Đang mở khu làm việc...
            </div>
        );
    }

    if (!user || user.role === 'patient') return null;

    const workflows = roleWorkflows[user.role] || [];

    return (
        <main className="min-h-screen bg-[#f7fbff] px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Link to="/" className="hover:text-blue-700">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-blue-950">{tabNames[activeTab] || 'Khu làm việc'}</span>
                </div>

                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">
                    <div className="bg-[linear-gradient(115deg,#eef7ff_0%,#ffffff_52%,#e8f3ff_100%)] p-6 sm:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-3xl">
                                <p className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black uppercase text-blue-700">
                                    {roleLabels[user.role]}
                                </p>
                                <h1 className="mt-4 text-4xl font-black tracking-normal text-blue-950">Khu làm việc</h1>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{roleSubtitles[user.role]}</p>
                            </div>

                            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-50">
                                <p className="text-xs font-black uppercase text-blue-600">Đang đăng nhập</p>
                                <p className="mt-1 font-black text-blue-950">{user.fullName}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{user.email}</p>
                            </div>
                        </div>

                        <div className="mt-7 grid gap-4 md:grid-cols-3">
                            {workflows.map(([title, description], index) => (
                                <article key={title} className="rounded-2xl border border-blue-100 bg-white p-5">
                                    <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-700 text-sm font-black text-white">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h2 className="mt-4 font-black text-blue-950">{title}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto border-t border-blue-100 bg-white px-4 py-3 sm:px-6">
                        {tabs.map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black transition ${
                                    activeTab === key
                                        ? 'bg-blue-700 text-white shadow-lg shadow-blue-100'
                                        : 'border border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                <WorkspaceSummary />

                <div className="mt-6">
                    {activeTab === 'analytics' && user.role === 'admin' && <AnalyticsTab />}
                    {activeTab === 'appointments' && <AppointmentsTab />}
                    {activeTab === 'services' && user.role === 'admin' && <ServicesTab />}
                    {activeTab === 'invoices' && (user.role === 'admin' || user.role === 'staff') && <InvoicesTab />}
                    {activeTab === 'schedules' && (user.role === 'admin' || user.role === 'staff') && <SchedulesTab />}
                    {activeTab === 'dayOff' && user.role === 'dentist' && <DentistDayOffTab />}
                    {activeTab === 'notifications' && <NotificationsHistoryTab />}
                    {activeTab === 'promotions' && user.role === 'admin' && <PromotionsTab />}
                    {activeTab === 'reviews' && user.role === 'admin' && <ReviewsTab />}
                    {activeTab === 'users' && user.role === 'admin' && <UsersTab />}
                    {activeTab === 'settings' && user.role === 'admin' && <SettingsTab />}
                </div>
            </div>
        </main>
    );
}
