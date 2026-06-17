import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const emptyService = { id: null, name: '', description: '', price: '', duration: '', status: 'active', image: '', categoryId: '' };
const emptyCategory = { id: null, name: '', description: '' };

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    if (!amount) return 'Liên hệ';
    return amount.toLocaleString('vi-VN') + ' đ';
};

export default function ServicesTab() {
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState(emptyService);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [categoryForm, setCategoryForm] = useState(emptyCategory);
    const [editingCategory, setEditingCategory] = useState(false);

    const servicesPerPage = 6;

    const fetchData = async () => {
        try {
            setLoading(true);
            const [resServices, resCategories] = await Promise.all([
                api.get('/services/manage/all'),
                api.get('/categories')
            ]);
            setServices(resServices.data.data || []);
            setCategories(resCategories.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải dữ liệu dịch vụ.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetServiceForm = () => {
        setFormData({ ...emptyService, categoryId: categories.length > 0 ? categories[0].id : '' });
        setIsEditing(false);
    };

    const openCreateForm = () => {
        setFormData({ ...emptyService, categoryId: categories.length > 0 ? categories[0].id : '' });
        setIsEditing(false);
        setShowForm(true);
    };

    const openEditForm = (service) => {
        setFormData({
            id: service.id,
            name: service.name || '',
            description: service.description || '',
            price: service.price || '',
            duration: service.duration || '',
            status: service.status || 'active',
            image: service.image || '',
            categoryId: service.categoryId || ''
        });
        setIsEditing(true);
        setShowForm(true);
    };

    const closeForm = () => {
        resetServiceForm();
        setShowForm(false);
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            setUploadingImage(true);
            const res = await api.post('/upload/single', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFormData(prev => ({ ...prev, image: res.data.data.url }));
            toast.success('Đã tải ảnh dịch vụ.');
        } catch (error) {
            console.error(error);
            toast.error('Không thể tải ảnh.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            if (isEditing) {
                await api.put(`/services/${formData.id}`, formData);
                toast.success('Đã cập nhật dịch vụ.');
            } else {
                await api.post('/services', formData);
                toast.success('Đã thêm dịch vụ.');
            }

            closeForm();
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lưu dịch vụ.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn muốn vô hiệu hóa dịch vụ này?')) return;

        try {
            await api.delete(`/services/${id}`);
            toast.success('Đã vô hiệu hóa dịch vụ.');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể vô hiệu hóa dịch vụ.');
        }
    };

    const resetCategoryForm = () => {
        setCategoryForm(emptyCategory);
        setEditingCategory(false);
    };

    const handleCategorySubmit = async (event) => {
        event.preventDefault();

        try {
            if (editingCategory) {
                await api.put(`/categories/${categoryForm.id}`, categoryForm);
                toast.success('Đã cập nhật danh mục.');
            } else {
                await api.post('/categories', categoryForm);
                toast.success('Đã thêm danh mục.');
            }

            resetCategoryForm();
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lưu danh mục.');
        }
    };

    const openEditCategory = (category) => {
        setCategoryForm({
            id: category.id,
            name: category.name,
            description: category.description || ''
        });
        setEditingCategory(true);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Bạn muốn xóa danh mục này? Dịch vụ thuộc danh mục này sẽ mất phân loại.')) return;

        try {
            await api.delete(`/categories/${id}`);
            toast.success('Đã xóa danh mục.');
            if (categoryFilter === String(id)) setCategoryFilter('all');
            resetCategoryForm();
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa danh mục.');
        }
    };

    const filteredServices = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();

        return services.filter(service => {
            const matchCategory = categoryFilter === 'all' || service.categoryId === Number(categoryFilter);
            const matchStatus = statusFilter === 'all' || service.status === statusFilter;
            const source = `${service.name || ''} ${service.description || ''} ${service.categoryName || ''}`.toLowerCase();
            const matchSearch = !keyword || source.includes(keyword);
            return matchCategory && matchStatus && matchSearch;
        });
    }, [services, categoryFilter, statusFilter, searchTerm]);

    const currentServices = useMemo(() => {
        const indexOfLastItem = currentPage * servicesPerPage;
        const indexOfFirstItem = indexOfLastItem - servicesPerPage;
        return filteredServices.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredServices, currentPage]);

    const totalPages = Math.ceil(filteredServices.length / servicesPerPage);
    const activeCount = services.filter(service => service.status === 'active').length;
    const inactiveCount = services.filter(service => service.status === 'inactive').length;

    if (loading) {
        return (
            <Panel>
                <div className="p-10 text-center font-bold text-slate-500">Đang tải dịch vụ...</div>
            </Panel>
        );
    }

    return (
        <div className="space-y-6">
            <Panel>
                <div className="flex flex-col gap-5 border-b border-blue-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Quản lý dịch vụ</p>
                        <h2 className="mt-1 text-2xl font-black text-blue-950">Danh mục và dịch vụ nha khoa</h2>
                        <p className="mt-2 text-sm text-slate-500">Quản lý dịch vụ hiển thị cho khách hàng, giá, thời lượng, ảnh và trạng thái kinh doanh.</p>
                    </div>
                    <button onClick={showForm ? closeForm : openCreateForm} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                        {showForm ? 'Đóng form' : 'Thêm dịch vụ'}
                    </button>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-3">
                    <SummaryCard label="Tổng dịch vụ" value={services.length} tone="blue" />
                    <SummaryCard label="Đang mở" value={activeCount} tone="emerald" />
                    <SummaryCard label="Tạm ngưng" value={inactiveCount} tone="rose" />
                </div>

                <div className="grid gap-3 border-t border-blue-100 px-6 py-5 lg:grid-cols-[1fr_220px_180px]">
                    <input
                        value={searchTerm}
                        onChange={event => {
                            setSearchTerm(event.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Tìm dịch vụ, mô tả hoặc danh mục"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <select
                        value={categoryFilter}
                        onChange={(event) => {
                            setCategoryFilter(event.target.value);
                            setCurrentPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                        <option value="all">Tất cả danh mục</option>
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setCurrentPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang mở</option>
                        <option value="inactive">Tạm ngưng</option>
                    </select>
                </div>
            </Panel>

            {showForm && (
                <Panel>
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-black uppercase text-blue-700">{isEditing ? 'Cập nhật' : 'Tạo mới'}</p>
                                <h3 className="text-xl font-black text-blue-950">{isEditing ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'}</h3>
                            </div>
                            <button type="button" onClick={closeForm} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-blue-50">Hủy</button>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
                            <div>
                                <div className="grid h-40 place-items-center overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">
                                    {formData.image ? (
                                        <img src={formData.image} alt="Dịch vụ" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="px-4 text-center text-sm font-bold text-slate-400">Chưa có ảnh dịch vụ</span>
                                    )}
                                </div>
                                <label className="mt-3 block cursor-pointer rounded-xl border border-blue-100 bg-white px-4 py-2 text-center text-sm font-black text-blue-700 hover:bg-blue-50">
                                    {uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <Field label="Tên dịch vụ" required value={formData.name} onChange={value => setFormData({ ...formData, name: value })} />
                                <Select label="Danh mục" value={formData.categoryId} onChange={value => setFormData({ ...formData, categoryId: value })}>
                                    <option value="">Chọn danh mục</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </Select>
                                <Field label="Giá tiền (VNĐ)" type="number" min="0" required value={formData.price} onChange={value => setFormData({ ...formData, price: value })} />
                                <Field label="Thời gian (phút)" type="number" min="0" value={formData.duration} onChange={value => setFormData({ ...formData, duration: value })} />
                                <Select label="Trạng thái" value={formData.status} onChange={value => setFormData({ ...formData, status: value })}>
                                    <option value="active">Đang mở</option>
                                    <option value="inactive">Tạm ngưng</option>
                                </Select>
                                <div className="md:col-span-2 xl:col-span-3">
                                    <Textarea label="Mô tả chi tiết" value={formData.description} onChange={value => setFormData({ ...formData, description: value })} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button type="submit" className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-black text-white hover:bg-blue-800">
                                {isEditing ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
                            </button>
                        </div>
                    </form>
                </Panel>
            )}

            <Panel>
                <div className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
                    <form onSubmit={handleCategorySubmit} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                        <p className="text-sm font-black uppercase text-blue-700">Danh mục</p>
                        <h3 className="mt-1 text-lg font-black text-blue-950">{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
                        <div className="mt-4 space-y-3">
                            <Field label="Tên danh mục" required value={categoryForm.name} onChange={value => setCategoryForm({ ...categoryForm, name: value })} />
                            <Textarea label="Mô tả ngắn" rows={2} value={categoryForm.description} onChange={value => setCategoryForm({ ...categoryForm, description: value })} />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800">
                                {editingCategory ? 'Lưu danh mục' : 'Thêm danh mục'}
                            </button>
                            {editingCategory && (
                                <button type="button" onClick={resetCategoryForm} className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-blue-50">
                                    Hủy
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-blue-100">
                            <thead>
                                <tr className="bg-blue-50/60 text-left text-xs font-black uppercase text-slate-500">
                                    <th className="px-4 py-3">Danh mục</th>
                                    <th className="px-4 py-3">Mô tả</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {categories.length === 0 ? (
                                    <tr><td colSpan="3" className="px-4 py-8 text-center text-sm font-bold text-slate-500">Chưa có danh mục.</td></tr>
                                ) : categories.map(category => (
                                    <tr key={category.id}>
                                        <td className="px-4 py-3 font-black text-blue-950">{category.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{category.description || 'Không có mô tả'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => openEditCategory(category)} className="rounded-lg px-3 py-1.5 text-sm font-black text-blue-700 hover:bg-blue-50">Sửa</button>
                                            <button onClick={() => handleDeleteCategory(category.id)} className="rounded-lg px-3 py-1.5 text-sm font-black text-rose-600 hover:bg-rose-50">Xóa</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Panel>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {currentServices.length === 0 ? (
                    <Panel>
                        <div className="p-8 text-center text-sm font-bold text-slate-500">Không có dịch vụ phù hợp bộ lọc.</div>
                    </Panel>
                ) : currentServices.map(service => (
                    <article key={service.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm shadow-blue-50 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100">
                        {service.displayImage || service.image ? (
                            <img src={service.displayImage || service.image} alt={service.name} className="h-44 w-full object-cover" />
                        ) : (
                            <div className="grid h-44 place-items-center bg-gradient-to-br from-blue-50 to-white text-4xl font-black text-blue-700">
                                {String(service.name || 'D')[0]}
                            </div>
                        )}

                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase text-blue-700">{service.categoryName || 'Chưa phân loại'}</p>
                                    <h4 className="mt-2 text-xl font-black text-blue-950">{service.name}</h4>
                                </div>
                                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${service.status === 'inactive' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                    {service.status === 'inactive' ? 'Tạm ngưng' : 'Đang mở'}
                                </span>
                            </div>

                            <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">{service.description || 'Không có mô tả'}</p>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-blue-50 p-3">
                                    <p className="text-xs font-black uppercase text-blue-500">Chi phí</p>
                                    <p className="mt-1 font-black text-blue-800">{formatCurrency(service.price)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs font-black uppercase text-slate-400">Thời gian</p>
                                    <p className="mt-1 font-black text-slate-800">{service.duration ? `${service.duration} phút` : 'Chưa rõ'}</p>
                                </div>
                            </div>

                            <div className="mt-5 flex justify-end gap-2 border-t border-blue-50 pt-4">
                                <button onClick={() => openEditForm(service)} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">Sửa</button>
                                <button onClick={() => handleDelete(service.id)} className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-100">Vô hiệu hóa</button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="rounded-xl border border-blue-100 bg-white px-4 py-2 font-black text-slate-600 disabled:opacity-50 hover:bg-blue-50"
                    >
                        Trang trước
                    </button>
                    <span className="text-sm font-black text-blue-950">{currentPage} / {totalPages}</span>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="rounded-xl border border-blue-100 bg-white px-4 py-2 font-black text-slate-600 disabled:opacity-50 hover:bg-blue-50"
                    >
                        Trang sau
                    </button>
                </div>
            )}
        </div>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function SummaryCard({ label, value, tone }) {
    const toneClass = {
        blue: 'bg-blue-50 text-blue-800',
        emerald: 'bg-emerald-50 text-emerald-800',
        rose: 'bg-rose-50 text-rose-800'
    }[tone];

    return (
        <div className={`rounded-2xl p-5 ${toneClass}`}>
            <p className="text-3xl font-black">{value}</p>
            <p className="mt-1 text-sm font-black uppercase opacity-80">{label}</p>
        </div>
    );
}

function Field({ label, value, onChange, ...props }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <input value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </label>
    );
}

function Select({ label, value, onChange, children }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <select value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                {children}
            </select>
        </label>
    );
}

function Textarea({ label, value, onChange, rows = 3 }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <textarea rows={rows} value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>
    );
}
