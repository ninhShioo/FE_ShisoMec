import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const defaultSettings = {
    clinicName: 'Phenikaa Dental',
    phone: '0869 800 318',
    email: 'contact@phenikaadental.vn',
    address: 'Tòa nhà Phenikaa Tower, Hà Nội',
    openingHours: '08:00 - 20:00',
    bookingLeadHours: 24,
    appointmentReminderHours: 4,
    maintenanceMode: false,
    allowOnlineBooking: true,
    theme: 'light'
};

export default function SettingsTab() {
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                setSettings({ ...defaultSettings, ...res.data.data });
            } catch (err) {
                toast.error(err.response?.data?.message || 'Không thể tải cấu hình hệ thống.');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setSettings((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            const res = await api.put('/settings', settings);
            setSettings({ ...defaultSettings, ...res.data.data });
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
                <p className="text-sm font-black uppercase text-blue-700">Cài đặt</p>
                <h3 className="mt-1 text-2xl font-black text-blue-950">Cấu hình hệ thống</h3>
                <p className="mt-2 text-sm text-slate-500">Quản lý thông tin phòng khám, quy tắc đặt lịch và trạng thái vận hành.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-6">
                <Section title="Thông tin phòng khám" description="Các thông tin này dùng cho trang chủ, liên hệ và footer.">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field label="Tên phòng khám" name="clinicName" value={settings.clinicName} onChange={handleChange} required />
                        <Field label="Hotline" name="phone" value={settings.phone} onChange={handleChange} required />
                        <Field label="Email liên hệ" name="email" type="email" value={settings.email} onChange={handleChange} />
                        <Field label="Giờ làm việc" name="openingHours" value={settings.openingHours} onChange={handleChange} placeholder="08:00 - 20:00" required />
                        <Field label="Địa chỉ" name="address" value={settings.address} onChange={handleChange} className="md:col-span-2" required />
                    </div>
                </Section>

                <Section title="Quy tắc đặt lịch" description="Các giá trị này dùng để thống nhất chính sách vận hành.">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field label="Đặt lịch trước tối thiểu (giờ)" name="bookingLeadHours" type="number" min="0" max="168" value={settings.bookingLeadHours} onChange={handleChange} required />
                        <Field label="Nhắc xác nhận trước giờ hẹn (giờ)" name="appointmentReminderHours" type="number" min="1" max="24" value={settings.appointmentReminderHours} onChange={handleChange} required />
                    </div>
                </Section>

                <Section title="Trạng thái vận hành" description="Tắt/mở các chức năng khách hàng có thể dùng.">
                    <div className="grid gap-4 md:grid-cols-2">
                        <ToggleCard
                            title="Cho phép đặt lịch online"
                            description="Tắt lựa chọn này khi phòng khám chỉ nhận lịch qua lễ tân."
                            name="allowOnlineBooking"
                            checked={settings.allowOnlineBooking}
                            onChange={handleChange}
                            tone="blue"
                        />
                        <ToggleCard
                            title="Chế độ bảo trì"
                            description="Dùng khi cần khóa tạm thời chức năng khách hàng."
                            name="maintenanceMode"
                            checked={settings.maintenanceMode}
                            onChange={handleChange}
                            tone="rose"
                        />
                        <div className="rounded-2xl border border-blue-100 bg-white p-5">
                            <label className="block text-sm font-bold text-slate-700">
                                Giao diện
                                <select name="theme" value={settings.theme} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                                    <option value="light">Sáng</option>
                                    <option value="dark">Tối</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </Section>

                <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">
                        {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </button>
                </div>
            </form>
        </Panel>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function Section({ title, description, children }) {
    return (
        <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="mb-5">
                <h4 className="font-black text-blue-950">{title}</h4>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
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

function ToggleCard({ title, description, name, checked, onChange, tone }) {
    const activeClass = tone === 'rose' ? 'peer-checked:bg-rose-500' : 'peer-checked:bg-blue-700';

    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-5">
            <div>
                <p className="font-black text-blue-950">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input type="checkbox" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
                <div className={`h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] ${activeClass} peer-checked:after:translate-x-full peer-checked:after:border-white`} />
            </label>
        </div>
    );
}
