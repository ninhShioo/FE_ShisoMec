import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const emptyPromotion = { id: null, name: '', description: '', discountPercent: '', startDate: '', endDate: '', isActive: true };

const getDateOnly = (value) => {
    if (!value) return '';
    return String(value).split('T')[0];
};

const getPromotionStatus = (promo) => {
    if (promo.effectiveStatus) return promo.effectiveStatus;

    const isManuallyActive = promo.isActive === 1 || promo.isActive === true;
    if (!isManuallyActive) return 'inactive';

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const startDate = getDateOnly(promo.startDate);
    const endDate = getDateOnly(promo.endDate);

    if (startDate && startDate > today) return 'upcoming';
    if (endDate && endDate < today) return 'expired';
    return 'active';
};

const statusMeta = {
    active: {
        label: 'Hoạt động',
        className: 'text-emerald-700',
        dotClassName: 'bg-emerald-500'
    },
    upcoming: {
        label: 'Sắp diễn ra',
        className: 'text-blue-700',
        dotClassName: 'bg-blue-500'
    },
    expired: {
        label: 'Hết hạn',
        className: 'text-amber-700',
        dotClassName: 'bg-amber-500'
    },
    inactive: {
        label: 'Đã tắt',
        className: 'text-slate-500',
        dotClassName: 'bg-slate-400'
    }
};

const formatDate = (value) => {
    const dateOnly = getDateOnly(value);
    if (!dateOnly) return 'Không giới hạn';
    return new Date(dateOnly).toLocaleDateString('vi-VN');
};

export default function PromotionsTab() {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(emptyPromotion);
    const [isEditing, setIsEditing] = useState(false);

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const res = await api.get('/promotions');
            setPromotions(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải danh sách khuyến mãi.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const closeForm = () => {
        setFormData(emptyPromotion);
        setIsEditing(false);
        setShowForm(false);
    };

    const openCreateForm = () => {
        setFormData(emptyPromotion);
        setIsEditing(false);
        setShowForm(true);
    };

    const openEditForm = (promo) => {
        setFormData({
            id: promo.id,
            name: promo.name || '',
            description: promo.description || '',
            discountPercent: promo.discountPercent || '',
            startDate: getDateOnly(promo.startDate),
            endDate: getDateOnly(promo.endDate),
            isActive: promo.isActive === 1 || promo.isActive === true
        });
        setIsEditing(true);
        setShowForm(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
            toast.error('Ngày kết thúc không được trước ngày bắt đầu.');
            return;
        }

        try {
            if (isEditing) {
                await api.put(`/promotions/${formData.id}`, formData);
                toast.success('Đã cập nhật khuyến mãi.');
            } else {
                await api.post('/promotions', formData);
                toast.success('Đã thêm khuyến mãi.');
            }

            closeForm();
            fetchPromotions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lưu khuyến mãi.');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        if (!window.confirm('Xác nhận đổi trạng thái khuyến mãi này?')) return;

        try {
            const promo = promotions.find(item => item.id === id);
            await api.put(`/promotions/${id}`, { ...promo, isActive: !currentStatus });
            toast.success('Đã cập nhật trạng thái khuyến mãi.');
            fetchPromotions();
        } catch {
            toast.error('Không thể cập nhật trạng thái.');
        }
    };

    if (loading) {
        return (
            <Panel>
                <div className="p-10 text-center font-bold text-slate-500">Đang tải danh sách khuyến mãi...</div>
            </Panel>
        );
    }

    return (
        <div className="space-y-6">
            <Panel>
                <div className="flex flex-col gap-5 border-b border-blue-100 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Khuyến mãi</p>
                        <h3 className="mt-1 text-2xl font-black text-blue-950">Quản lý chương trình ưu đãi</h3>
                        <p className="mt-2 text-sm text-slate-500">Tạo và bật/tắt các chương trình khuyến mãi của phòng khám.</p>
                    </div>
                    <button onClick={showForm ? closeForm : openCreateForm} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                        {showForm ? 'Đóng form' : 'Thêm khuyến mãi'}
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="border-b border-blue-100 bg-blue-50/50 p-6">
                        <div className="mb-4">
                            <p className="text-sm font-black uppercase text-blue-700">{isEditing ? 'Cập nhật' : 'Tạo mới'}</p>
                            <h4 className="text-xl font-black text-blue-950">{isEditing ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Tên chương trình" required value={formData.name} onChange={value => setFormData({ ...formData, name: value })} />
                            <Field label="Phần trăm giảm giá (%)" type="number" required min="0" max="100" value={formData.discountPercent} onChange={value => setFormData({ ...formData, discountPercent: value })} />
                            <Field label="Ngày bắt đầu" type="date" value={formData.startDate} onChange={value => setFormData({ ...formData, startDate: value })} />
                            <Field label="Ngày kết thúc" type="date" value={formData.endDate} onChange={value => setFormData({ ...formData, endDate: value })} />
                            <label className="block text-sm font-bold text-slate-700 md:col-span-2">
                                Mô tả chi tiết
                                <textarea value={formData.description} onChange={event => setFormData({ ...formData, description: event.target.value })} rows="3" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                            </label>
                        </div>
                        <div className="mt-5 flex justify-end gap-3">
                            <button type="button" onClick={closeForm} className="rounded-xl border border-blue-100 bg-white px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-blue-50">Hủy</button>
                            <button type="submit" className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-800">{isEditing ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}</button>
                        </div>
                    </form>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-blue-100">
                        <thead>
                            <tr className="bg-blue-50/60 text-left text-xs font-black uppercase text-slate-500">
                                <th className="px-6 py-3">Chương trình</th>
                                <th className="px-6 py-3">Giảm giá</th>
                                <th className="px-6 py-3">Thời gian</th>
                                <th className="px-6 py-3">Trạng thái</th>
                                <th className="px-6 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                            {promotions.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-sm font-bold text-slate-500">Chưa có khuyến mãi nào.</td></tr>
                            ) : promotions.map(promo => {
                                const isActive = promo.isActive === 1 || promo.isActive === true;
                                const status = getPromotionStatus(promo);
                                const meta = statusMeta[status] || statusMeta.inactive;
                                return (
                                    <tr key={promo.id} className="hover:bg-blue-50/40">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-blue-950">{promo.name}</div>
                                            <div className="max-w-xs truncate text-xs text-slate-500">{promo.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-lg font-black text-blue-700">{promo.discountPercent}%</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-2 text-sm font-black ${meta.className}`}>
                                                <span className={`h-2 w-2 rounded-full ${meta.dotClassName}`} />
                                                {promo.effectiveLabel || meta.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => openEditForm(promo)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100">Sửa</button>
                                            <button onClick={() => handleToggleStatus(promo.id, isActive)} className={`ml-2 rounded-lg px-3 py-1.5 text-xs font-black ${isActive ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                                {isActive ? 'Tắt' : 'Bật'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function Field({ label, value, onChange, ...props }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <input value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </label>
    );
}
