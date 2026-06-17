import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const paymentLabels = {
    cash: 'Tiền mặt',
    card: 'Thẻ',
    transfer: 'Chuyển khoản',
    bank_transfer: 'Chuyển khoản',
    vnpay: 'VNPay',
    momo: 'MoMo'
};

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return amount.toLocaleString('vi-VN') + ' đ';
};

export default function InvoicesTab() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMethods, setSelectedMethods] = useState({});
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await api.get('/invoices');
            setInvoices(res.data.data || []);
        } catch {
            toast.error('Không thể tải danh sách hóa đơn.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handlePay = async (id) => {
        if (!window.confirm('Xác nhận khách hàng đã thanh toán hóa đơn này?')) return;

        try {
            await api.put(`/invoices/${id}/pay`, {
                paymentMethod: selectedMethods[id] || 'cash'
            });
            toast.success('Đã xác nhận thanh toán.');
            fetchInvoices();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xác nhận thanh toán.');
        }
    };

    const filteredInvoices = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();

        return invoices.filter(invoice => {
            const matchStatus = statusFilter === 'all' || invoice.status === statusFilter;
            const source = `inv-${invoice.id} ${invoice.patientName || ''} ${invoice.patientPhone || ''}`.toLowerCase();
            const matchSearch = !keyword || source.includes(keyword);
            return matchStatus && matchSearch;
        });
    }, [invoices, statusFilter, searchTerm]);

    const paidInvoices = invoices.filter(invoice => invoice.status === 'paid');
    const unpaidInvoices = invoices.filter(invoice => invoice.status === 'unpaid');
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const pendingAmount = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);

    if (loading) {
        return (
            <Panel>
                <div className="p-10 text-center font-bold text-slate-500">Đang tải hóa đơn...</div>
            </Panel>
        );
    }

    return (
        <div className="space-y-6">
            <Panel>
                <div className="flex flex-col gap-5 border-b border-blue-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Hóa đơn</p>
                        <h2 className="mt-1 text-2xl font-black text-blue-950">Thanh toán và doanh thu</h2>
                        <p className="mt-2 text-sm text-slate-500">Theo dõi hóa đơn sau khám và xác nhận khoản thu tại quầy.</p>
                    </div>
                    <button onClick={fetchInvoices} className="rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-blue-50 hover:text-blue-700">
                        Làm mới
                    </button>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-4">
                    <SummaryCard label="Tổng hóa đơn" value={invoices.length} tone="blue" />
                    <SummaryCard label="Đã thanh toán" value={paidInvoices.length} tone="emerald" />
                    <SummaryCard label="Chưa thanh toán" value={unpaidInvoices.length} tone="rose" />
                    <SummaryCard label="Đã thu" value={formatCurrency(totalRevenue)} tone="violet" compact />
                </div>

                <div className="grid gap-3 border-t border-blue-100 px-6 py-5 md:grid-cols-[1fr_220px]">
                    <input
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                        placeholder="Tìm mã hóa đơn hoặc tên khách hàng"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <select
                        value={statusFilter}
                        onChange={event => setStatusFilter(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="paid">Đã thanh toán</option>
                        <option value="unpaid">Chưa thanh toán</option>
                    </select>
                </div>
            </Panel>

            <Panel>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-blue-100">
                        <thead>
                            <tr className="bg-blue-50/60 text-left text-xs font-black uppercase text-slate-500">
                                <th className="px-6 py-3">Mã hóa đơn</th>
                                <th className="px-6 py-3">Khách hàng</th>
                                <th className="px-6 py-3">Tổng tiền</th>
                                <th className="px-6 py-3">Thanh toán</th>
                                <th className="px-6 py-3">Trạng thái</th>
                                <th className="px-6 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                            {filteredInvoices.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-sm font-bold text-slate-500">Không có hóa đơn phù hợp.</td></tr>
                            ) : filteredInvoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-blue-50/40">
                                    <td className="px-6 py-4 font-black text-slate-500">INV-{invoice.id}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-blue-950">{invoice.patientName}</p>
                                        {invoice.patientPhone && <p className="text-xs text-slate-500">{invoice.patientPhone}</p>}
                                    </td>
                                    <td className="px-6 py-4 font-black text-blue-700">{formatCurrency(invoice.totalAmount)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700">
                                        {invoice.status === 'paid' ? (
                                            <div>
                                                <p className="font-black text-slate-800">{paymentLabels[invoice.lastPaymentMethod || invoice.paymentMethod] || invoice.lastPaymentMethod || invoice.paymentMethod}</p>
                                                {invoice.paidAt && <p className="text-xs text-slate-400">{new Date(invoice.paidAt).toLocaleString('vi-VN')}</p>}
                                            </div>
                                        ) : (
                                            <select
                                                value={selectedMethods[invoice.id] || invoice.paymentMethod || 'cash'}
                                                onChange={(event) => setSelectedMethods({ ...selectedMethods, [invoice.id]: event.target.value })}
                                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                                            >
                                                <option value="cash">Tiền mặt</option>
                                                <option value="card">Thẻ</option>
                                                <option value="transfer">Chuyển khoản</option>
                                                <option value="vnpay">VNPay</option>
                                                <option value="momo">MoMo</option>
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                            {invoice.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {invoice.status === 'unpaid' ? (
                                            <button onClick={() => handlePay(invoice.id)} className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white hover:bg-blue-800">
                                                Xác nhận thu tiền
                                            </button>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-400">Đã hoàn tất</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>

            <Panel>
                <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-rose-600">Cần theo dõi</p>
                        <p className="mt-1 text-sm text-slate-500">Tổng tiền chưa thu từ các hóa đơn chưa thanh toán.</p>
                    </div>
                    <p className="text-2xl font-black text-rose-700">{formatCurrency(pendingAmount)}</p>
                </div>
            </Panel>
        </div>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function SummaryCard({ label, value, tone, compact = false }) {
    const toneClass = {
        blue: 'bg-blue-50 text-blue-800',
        emerald: 'bg-emerald-50 text-emerald-800',
        rose: 'bg-rose-50 text-rose-800',
        violet: 'bg-violet-50 text-violet-800'
    }[tone];

    return (
        <div className={`rounded-2xl p-5 ${toneClass}`}>
            <p className={`${compact ? 'text-xl' : 'text-3xl'} font-black`}>{value}</p>
            <p className="mt-1 text-sm font-black uppercase opacity-80">{label}</p>
        </div>
    );
}
