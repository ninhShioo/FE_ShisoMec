import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const emptyForm = { id: null, fullName: '', email: '', password: '', phone: '', role: 'dentist', avatar: '' };

const roleLabels = {
    admin: 'Quản trị viên',
    dentist: 'Bác sĩ',
    staff: 'Lễ tân',
    patient: 'Khách hàng'
};

const roleBadges = {
    admin: 'bg-violet-50 text-violet-700',
    dentist: 'bg-blue-50 text-blue-700',
    staff: 'bg-emerald-50 text-emerald-700',
    patient: 'bg-rose-50 text-rose-700'
};

export default function UsersTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const usersPerPage = 10;

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            setUsers(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải danh sách tài khoản.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const closeForm = () => {
        setFormData(emptyForm);
        setIsEditing(false);
        setShowForm(false);
    };

    const openCreateForm = () => {
        setFormData(emptyForm);
        setIsEditing(false);
        setShowForm(true);
    };

    const openEditForm = (user) => {
        setFormData({
            id: user.id,
            fullName: user.fullName || '',
            email: user.email || '',
            password: '',
            phone: user.phone || '',
            role: user.role,
            avatar: user.avatar || ''
        });
        setIsEditing(true);
        setShowForm(true);
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            setUploadingAvatar(true);
            const res = await api.post('/upload/single', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFormData(prev => ({ ...prev, avatar: res.data.data.url }));
            toast.success('Đã tải avatar.');
        } catch (error) {
            console.error(error);
            toast.error('Không thể tải avatar.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            if (isEditing) {
                await api.put(`/users/${formData.id}`, {
                    fullName: formData.fullName,
                    phone: formData.phone,
                    role: formData.role,
                    avatar: formData.avatar
                });
                toast.success('Đã cập nhật tài khoản.');
            } else {
                await api.post('/users/staff', formData);
                toast.success(`Đã tạo tài khoản ${roleLabels[formData.role]}.`);
            }

            closeForm();
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lưu tài khoản.');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const actionLabel = newStatus === 'active' ? 'mở khóa' : 'khóa';
        if (!window.confirm(`Xác nhận ${actionLabel} tài khoản này?`)) return;

        try {
            await api.put(`/users/${id}/status`, { status: newStatus });
            toast.success(`Đã ${actionLabel} tài khoản.`);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể cập nhật trạng thái.');
        }
    };

    const handleResetPassword = async (id) => {
        if (!window.confirm('Đặt lại mật khẩu tài khoản này về mặc định?')) return;

        try {
            const res = await api.put(`/users/${id}/reset-password`);
            toast.success(res.data.message || 'Đã đặt lại mật khẩu.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể đặt lại mật khẩu.');
        }
    };

    const filteredUsers = useMemo(() => {
        const keyword = searchQuery.trim().toLowerCase();

        return users.filter(user => {
            const matchRole = roleFilter === 'all' || user.role === roleFilter;
            const matchStatus = statusFilter === 'all' || user.status === statusFilter;
            const source = `${user.fullName || ''} ${user.email || ''} ${user.phone || ''}`.toLowerCase();
            const matchSearch = !keyword || source.includes(keyword);
            return matchRole && matchStatus && matchSearch;
        });
    }, [users, roleFilter, statusFilter, searchQuery]);

    const currentUsers = useMemo(() => {
        const indexOfLastUser = currentPage * usersPerPage;
        const indexOfFirstUser = indexOfLastUser - usersPerPage;
        return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const roleCounts = {
        admin: users.filter(user => user.role === 'admin').length,
        dentist: users.filter(user => user.role === 'dentist').length,
        staff: users.filter(user => user.role === 'staff').length,
        patient: users.filter(user => user.role === 'patient').length
    };

    if (loading) {
        return (
            <Panel>
                <div className="p-10 text-center font-bold text-slate-500">Đang tải danh sách tài khoản...</div>
            </Panel>
        );
    }

    return (
        <div className="space-y-6">
            <Panel>
                <div className="flex flex-col gap-5 border-b border-blue-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Quản lý tài khoản</p>
                        <h2 className="mt-1 text-2xl font-black text-blue-950">Nhân sự và khách hàng</h2>
                        <p className="mt-2 text-sm text-slate-500">Quản lý tài khoản đăng nhập, vai trò, avatar và trạng thái hoạt động.</p>
                    </div>
                    <button onClick={showForm ? closeForm : openCreateForm} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                        {showForm ? 'Đóng form' : 'Thêm nhân sự'}
                    </button>
                </div>

                <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard label="Quản trị viên" value={roleCounts.admin} tone="violet" />
                    <SummaryCard label="Bác sĩ" value={roleCounts.dentist} tone="blue" />
                    <SummaryCard label="Lễ tân" value={roleCounts.staff} tone="emerald" />
                    <SummaryCard label="Khách hàng" value={roleCounts.patient} tone="rose" />
                </div>

                <div className="grid gap-3 border-t border-blue-100 px-6 py-5 lg:grid-cols-[1fr_200px_200px]">
                    <input
                        value={searchQuery}
                        onChange={event => {
                            setSearchQuery(event.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Tìm tên, email hoặc số điện thoại"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <select
                        value={roleFilter}
                        onChange={event => {
                            setRoleFilter(event.target.value);
                            setCurrentPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                        <option value="all">Tất cả vai trò</option>
                        <option value="patient">Khách hàng</option>
                        <option value="dentist">Bác sĩ</option>
                        <option value="staff">Lễ tân</option>
                        <option value="admin">Quản trị viên</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={event => {
                            setStatusFilter(event.target.value);
                            setCurrentPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Đã khóa</option>
                    </select>
                </div>
            </Panel>

            {showForm && (
                <Panel>
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-black uppercase text-blue-700">{isEditing ? 'Cập nhật' : 'Tạo mới'}</p>
                                <h3 className="text-xl font-black text-blue-950">{isEditing ? 'Sửa thông tin tài khoản' : 'Tạo tài khoản nhân sự'}</h3>
                                {!isEditing && <p className="mt-1 text-sm text-slate-500">Khách hàng tự đăng ký ở trang đăng ký. Form này dùng để tạo admin, bác sĩ hoặc lễ tân.</p>}
                            </div>
                            <button type="button" onClick={closeForm} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-blue-50">Hủy</button>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[150px_1fr]">
                            <div>
                                <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full border border-blue-100 bg-blue-50">
                                    {formData.avatar ? (
                                        <img src={formData.avatar} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-center text-sm font-bold text-slate-400">Chưa có avatar</span>
                                    )}
                                </div>
                                <label className="mt-3 block cursor-pointer rounded-xl border border-blue-100 bg-white px-4 py-2 text-center text-sm font-black text-blue-700 hover:bg-blue-50">
                                    {uploadingAvatar ? 'Đang tải...' : 'Tải avatar'}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <Field label="Họ tên" required value={formData.fullName} onChange={value => setFormData({ ...formData, fullName: value })} />
                                <Field label="Email đăng nhập" type="email" required disabled={isEditing} value={formData.email} onChange={value => setFormData({ ...formData, email: value })} />
                                {!isEditing && <Field label="Mật khẩu" required value={formData.password} onChange={value => setFormData({ ...formData, password: value })} />}
                                <Field label="Số điện thoại" value={formData.phone} onChange={value => setFormData({ ...formData, phone: value })} />
                                <Select label="Vai trò" value={formData.role} onChange={value => setFormData({ ...formData, role: value })}>
                                    {isEditing && <option value="patient">Khách hàng</option>}
                                    <option value="dentist">Bác sĩ</option>
                                    <option value="staff">Lễ tân</option>
                                    <option value="admin">Quản trị viên</option>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button type="submit" className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-black text-white hover:bg-blue-800">
                                {isEditing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                            </button>
                        </div>
                    </form>
                </Panel>
            )}

            <Panel>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-blue-100">
                        <thead>
                            <tr className="bg-blue-50/60 text-left text-xs font-black uppercase text-slate-500">
                                <th className="px-6 py-3">Họ và tên</th>
                                <th className="px-6 py-3">Vai trò</th>
                                <th className="px-6 py-3">Liên hệ</th>
                                <th className="px-6 py-3">Trạng thái</th>
                                <th className="px-6 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                            {currentUsers.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-sm font-bold text-slate-500">Không tìm thấy tài khoản nào.</td></tr>
                            ) : currentUsers.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50/40">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {item.displayAvatar || item.avatar ? (
                                                <img src={item.displayAvatar || item.avatar} alt={item.fullName} className="h-10 w-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700">
                                                    {(item.fullName || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-black text-blue-950">{item.fullName}</p>
                                                <p className="text-xs font-semibold text-slate-400">ID #{item.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${roleBadges[item.role] || 'bg-slate-100 text-slate-600'}`}>
                                            {roleLabels[item.role] || item.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-800">{item.email}</div>
                                        <div className="text-xs text-slate-500">{item.phone || 'Chưa cập nhật số điện thoại'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.status === 'active'
                                            ? <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Hoạt động</span>
                                            : <span className="inline-flex items-center gap-2 text-sm font-black text-rose-600"><span className="h-2 w-2 rounded-full bg-rose-500" />Đã khóa</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleResetPassword(item.id)} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100">Reset MK</button>
                                            <button onClick={() => openEditForm(item)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100">Sửa</button>
                                            <button onClick={() => handleToggleStatus(item.id, item.status)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${item.status === 'active' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                                {item.status === 'active' ? 'Khóa' : 'Mở khóa'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>

            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-3">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="rounded-xl border border-blue-100 bg-white px-4 py-2 font-black text-slate-600 disabled:opacity-50 hover:bg-blue-50"
                    >
                        Trước
                    </button>
                    <span className="text-sm font-black text-blue-950">Trang {currentPage} / {totalPages}</span>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="rounded-xl border border-blue-100 bg-white px-4 py-2 font-black text-slate-600 disabled:opacity-50 hover:bg-blue-50"
                    >
                        Sau
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
        violet: 'bg-violet-50 text-violet-800',
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
            <input value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100" {...props} />
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
