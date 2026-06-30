import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { applyTheme, themeOptions } from '../../utils/theme';

const defaultSettings = {
    clinicName: 'Phenikaa Dental',
    phone: '0869 800 318',
    email: 'contact@phenikaadental.vn',
    address: 'Tòa nhà Phenikaa Tower, Hà Nội',
    openingHours: '08:00 - 20:00',
    mapUrl: '',
    facebookUrl: '',
    zaloPhone: '0869 800 318',
    bookingLeadHours: 24,
    appointmentReminderHours: 4,
    cancellationLeadHours: 6,
    rescheduleLeadHours: 12,
    autoNoShowMinutes: 30,
    maxServicesPerAppointment: 4,
    slotIntervalMinutes: 30,
    maintenanceMode: false,
    allowOnlineBooking: true,
    allowPatientCancellation: true,
    allowPatientReschedule: true,
    notifyStaffOnNewAppointment: true,
    notifyPatientOnStatusChange: true,
    theme: 'light'
};

const numberFields = [
    'bookingLeadHours',
    'appointmentReminderHours',
    'cancellationLeadHours',
    'rescheduleLeadHours',
    'autoNoShowMinutes',
    'maxServicesPerAppointment',
    'slotIntervalMinutes'
];

const slotIntervals = [15, 20, 30, 45, 60];

export default function SettingsTab() {
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                const nextSettings = { ...defaultSettings, ...res.data.data };
                setSettings(nextSettings);
                applyTheme(nextSettings.theme);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Không thể tải cấu hình hệ thống.');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const summary = useMemo(() => {
        const bookingState = settings.maintenanceMode
            ? 'Bảo trì'
            : settings.allowOnlineBooking
                ? 'Đang mở'
                : 'Chỉ nhận qua lễ tân';

        return [
            { label: 'Đặt lịch online', value: bookingState },
            { label: 'Đặt trước', value: `${settings.bookingLeadHours || 0} giờ` },
            { label: 'Nhắc xác nhận', value: `${settings.appointmentReminderHours || 0} giờ` },
            { label: 'Slot mặc định', value: `${settings.slotIntervalMinutes || 30} phút` }
        ];
    }, [settings]);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setSettings((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : numberFields.includes(name) ? Number(value) : value
        }));

        if (name === 'theme') {
            applyTheme(value);
        }
    };

    const handleThemeChange = (theme) => {
        applyTheme(theme);
        setSettings((current) => ({ ...current, theme }));
    };

    const validateBeforeSave = () => {
        if (!settings.clinicName.trim()) return 'Tên phòng khám là bắt buộc.';
        if (!settings.phone.trim()) return 'Hotline là bắt buộc.';
        if (!settings.address.trim()) return 'Địa chỉ là bắt buộc.';
        if (!settings.openingHours.trim()) return 'Giờ làm việc là bắt buộc.';
        if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) return 'Email liên hệ không hợp lệ.';
        if (settings.mapUrl && !/^https?:\/\/.+/i.test(settings.mapUrl)) return 'Link bản đồ phải bắt đầu bằng http hoặc https.';
        if (settings.facebookUrl && !/^https?:\/\/.+/i.test(settings.facebookUrl)) return 'Link Facebook phải bắt đầu bằng http hoặc https.';
        if (!slotIntervals.includes(Number(settings.slotIntervalMinutes))) return 'Bước thời gian slot không hợp lệ.';
        return null;
    };

    const handleSave = async (event) => {
        event.preventDefault();

        const validationError = validateBeforeSave();
        if (validationError) {
            toast.error(validationError);
            return;
        }

        try {
            setSaving(true);
            const res = await api.put('/settings', settings);
            const nextSettings = { ...defaultSettings, ...res.data.data };
            setSettings(nextSettings);
            applyTheme(nextSettings.theme);
            toast.success('Đã lưu cấu hình hệ thống.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lưu cấu hình hệ thống.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Panel>
                <div className="p-10 text-center font-bold text-slate-500">Đang tải cấu hình hệ thống...</div>
            </Panel>
        );
    }

    return (
        <Panel>
            <div className="border-b border-blue-100 bg-white px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Cài đặt</p>
                        <h3 className="mt-1 text-2xl font-black text-blue-950">Cấu hình vận hành phòng khám</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Quản lý thông tin hiển thị, chính sách đặt lịch, quyền thao tác của khách hàng và thông báo nội bộ.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {summary.map((item) => (
                            <div key={item.label} className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                                <p className="text-[11px] font-black uppercase text-slate-500">{item.label}</p>
                                <p className="mt-1 text-sm font-black text-blue-950">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 bg-slate-50/50 p-6">
                <Section title="Thông tin phòng khám" description="Dữ liệu dùng cho trang chủ, footer, liên hệ và các thông báo gửi khách hàng.">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field label="Tên phòng khám" name="clinicName" value={settings.clinicName} onChange={handleChange} required />
                        <Field label="Hotline" name="phone" value={settings.phone} onChange={handleChange} required />
                        <Field label="Email liên hệ" name="email" type="email" value={settings.email} onChange={handleChange} />
                        <Field label="Zalo/SĐT tư vấn" name="zaloPhone" value={settings.zaloPhone} onChange={handleChange} />
                        <Field label="Giờ làm việc hiển thị" name="openingHours" value={settings.openingHours} onChange={handleChange} placeholder="08:00 - 20:00" required />
                        <Field label="Địa chỉ" name="address" value={settings.address} onChange={handleChange} required />
                        <Field label="Link bản đồ" name="mapUrl" value={settings.mapUrl} onChange={handleChange} placeholder="https://maps.google.com/..." className="md:col-span-2" />
                        <Field label="Link Facebook" name="facebookUrl" value={settings.facebookUrl} onChange={handleChange} placeholder="https://facebook.com/..." className="md:col-span-2" />
                    </div>
                </Section>

                <Section title="Chính sách đặt lịch" description="Các giá trị này được backend dùng để kiểm tra đặt, hủy và dời lịch của khách hàng.">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <Field label="Đặt lịch trước tối thiểu (giờ)" name="bookingLeadHours" type="number" min="0" max="168" value={settings.bookingLeadHours} onChange={handleChange} required />
                        <Field label="Cho hủy trước tối thiểu (giờ)" name="cancellationLeadHours" type="number" min="0" max="168" value={settings.cancellationLeadHours} onChange={handleChange} required />
                        <Field label="Cho đổi lịch trước tối thiểu (giờ)" name="rescheduleLeadHours" type="number" min="0" max="168" value={settings.rescheduleLeadHours} onChange={handleChange} required />
                        <Field label="Nhắc xác nhận trước giờ hẹn (giờ)" name="appointmentReminderHours" type="number" min="1" max="24" value={settings.appointmentReminderHours} onChange={handleChange} required />
                        <Field label="Gợi ý không đến sau (phút)" name="autoNoShowMinutes" type="number" min="0" max="240" value={settings.autoNoShowMinutes} onChange={handleChange} required />
                        <Field label="Số dịch vụ tối đa/lịch" name="maxServicesPerAppointment" type="number" min="1" max="10" value={settings.maxServicesPerAppointment} onChange={handleChange} required />
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <label className="block rounded-2xl border border-blue-100 bg-white p-5 text-sm font-bold text-slate-700">
                            Bước thời gian slot
                            <select name="slotIntervalMinutes" value={settings.slotIntervalMinutes} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                                {slotIntervals.map((interval) => (
                                    <option key={interval} value={interval}>{interval} phút</option>
                                ))}
                            </select>
                        </label>
                    </div>
                </Section>

                <Section title="Trạng thái vận hành" description="Bật/tắt những quyền khách hàng có thể tự thao tác trên website.">
                    <div className="grid gap-4 md:grid-cols-2">
                        <ToggleCard
                            title="Cho phép đặt lịch online"
                            description="Tắt khi phòng khám chỉ muốn lễ tân tiếp nhận lịch."
                            name="allowOnlineBooking"
                            checked={settings.allowOnlineBooking}
                            onChange={handleChange}
                        />
                        <ToggleCard
                            title="Chế độ bảo trì"
                            description="Khóa luồng khách hàng tự đặt lịch trong thời gian bảo trì."
                            name="maintenanceMode"
                            checked={settings.maintenanceMode}
                            onChange={handleChange}
                            tone="rose"
                        />
                        <ToggleCard
                            title="Khách hàng được tự hủy lịch"
                            description="Vẫn bị giới hạn bởi số giờ hủy tối thiểu ở phần chính sách."
                            name="allowPatientCancellation"
                            checked={settings.allowPatientCancellation}
                            onChange={handleChange}
                        />
                        <ToggleCard
                            title="Khách hàng được tự đổi lịch"
                            description="Vẫn bị giới hạn bởi số giờ đổi lịch tối thiểu ở phần chính sách."
                            name="allowPatientReschedule"
                            checked={settings.allowPatientReschedule}
                            onChange={handleChange}
                        />
                    </div>
                </Section>

                <Section title="Thông báo và giao diện" description="Quy định cách hệ thống báo tin khi có lịch mới hoặc thay đổi trạng thái lịch.">
                    <div className="grid gap-4 md:grid-cols-2">
                        <ToggleCard
                            title="Báo lễ tân khi có lịch mới"
                            description="Tạo thông báo cho admin/lễ tân sau khi khách đặt lịch thành công."
                            name="notifyStaffOnNewAppointment"
                            checked={settings.notifyStaffOnNewAppointment}
                            onChange={handleChange}
                        />
                        <ToggleCard
                            title="Báo khách khi trạng thái đổi"
                            description="Gửi thông báo khi lịch được xác nhận, hủy hoặc dời lịch."
                            name="notifyPatientOnStatusChange"
                            checked={settings.notifyPatientOnStatusChange}
                            onChange={handleChange}
                        />
                        <div className="rounded-2xl border border-blue-100 bg-white p-5 md:col-span-2">
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-black text-blue-950">Màu giao diện</p>
                                <p className="text-sm leading-6 text-slate-500">Chọn palette màu chủ đạo cho website và khu làm việc.</p>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {themeOptions.map((theme) => (
                                    <button
                                        key={theme.value}
                                        type="button"
                                        onClick={() => handleThemeChange(theme.value)}
                                        className={`rounded-2xl border p-4 text-left transition ${settings.theme === theme.value ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'}`}
                                    >
                                        <span className="flex items-center justify-between gap-3">
                                            <span className="font-black text-blue-950">{theme.label}</span>
                                            <span className={`grid h-5 w-5 place-items-center rounded-full border ${settings.theme === theme.value ? 'border-blue-700 bg-blue-700' : 'border-slate-300 bg-white'}`}>
                                                {settings.theme === theme.value && <span className="h-2 w-2 rounded-full bg-white" />}
                                            </span>
                                        </span>
                                        <span className="mt-3 flex gap-2">
                                            {theme.swatches.map((color) => (
                                                <span key={color} className="h-7 flex-1 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
                                            ))}
                                        </span>
                                        <span className="mt-3 block text-xs font-semibold leading-5 text-slate-500">{theme.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Section>

                <div className="sticky bottom-4 z-10 flex justify-end">
                    <button type="submit" disabled={saving} className="rounded-2xl bg-blue-700 px-7 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 disabled:opacity-60">
                        {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </button>
                </div>
            </form>
        </Panel>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function Section({ title, description, children }) {
    return (
        <section className="rounded-3xl border border-blue-100 bg-white p-5">
            <div className="mb-5">
                <h4 className="text-lg font-black text-blue-950">{title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            {children}
        </section>
    );
}

function Field({ label, className = '', ...props }) {
    return (
        <label className={`block text-sm font-bold text-slate-700 ${className}`}>
            {label}
            <input className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </label>
    );
}

function ToggleCard({ title, description, name, checked, onChange, tone = 'blue' }) {
    const activeClass = tone === 'rose' ? 'peer-checked:bg-rose-500' : 'peer-checked:bg-blue-700';

    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-5">
            <div>
                <p className="font-black text-blue-950">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input type="checkbox" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
                <span className="sr-only">{title}</span>
                <div className={`h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] ${activeClass} peer-checked:after:translate-x-full peer-checked:after:border-white`} />
            </label>
        </div>
    );
}
