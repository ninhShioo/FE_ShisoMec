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
    const [paymentAmounts, setPaymentAmounts] = useState({});
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

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
                paymentMethod: selectedMethods[id] || 'cash',
                amount: paymentAmounts[id] ? Number(paymentAmounts[id]) : undefined
            });
            toast.success('Đã xác nhận thanh toán.');
            fetchInvoices();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xác nhận thanh toán.');
        }
    };

    const openInvoiceDetail = async (invoice) => {
        try {
            setLoadingInvoiceDetail(true);
            const res = await api.get(`/invoices/${invoice.id}`);
            setSelectedInvoice(res.data.data || invoice);
        } catch {
            setSelectedInvoice(invoice);
            toast.error('Không thể tải chi tiết mới nhất, đang hiển thị dữ liệu trong bảng.');
        } finally {
            setLoadingInvoiceDetail(false);
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
    const unpaidInvoices = invoices.filter(invoice => ['unpaid', 'partial'].includes(invoice.status));
    const collectedAmount = invoices.reduce((sum, invoice) => {
        const paidAmount = Number(invoice.paidAmount || 0);
        if (paidAmount > 0) return sum + paidAmount;
        return invoice.status === 'paid' ? sum + Number(invoice.totalAmount || 0) : sum;
    }, 0);
    const pendingAmount = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount ?? invoice.totalAmount ?? 0), 0);

    const invoiceStatusMeta = (status) => {
        if (status === 'paid') return ['Đã thanh toán', 'bg-emerald-50 text-emerald-700'];
        if (status === 'partial') return ['Thanh toán một phần', 'bg-amber-50 text-amber-700'];
        if (status === 'cancelled') return ['Đã hủy', 'bg-slate-100 text-slate-600'];
        return ['Chưa thanh toán', 'bg-rose-50 text-rose-700'];
    };

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
                    <SummaryCard label="Đã thu" value={formatCurrency(collectedAmount)} tone="violet" compact />
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
                        <option value="partial">Thanh toán một phần</option>
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
                                    <td className="px-6 py-4">
                                        <p className="font-black text-blue-700">{formatCurrency(invoice.totalAmount)}</p>
                                        {Number(invoice.discountAmount || 0) > 0 && (
                                            <p className="text-xs font-bold text-emerald-600">Giảm {formatCurrency(invoice.discountAmount)}</p>
                                        )}
                                        <p className="text-xs text-slate-500">Đã thu {formatCurrency(invoice.paidAmount)}</p>
                                        {Number(invoice.outstandingAmount || 0) > 0 && (
                                            <p className="text-xs font-black text-rose-600">Còn {formatCurrency(invoice.outstandingAmount)}</p>
                                        )}
                                        {Array.isArray(invoice.items) && invoice.items.length > 0 && (
                                            <div className="mt-2 space-y-1 rounded-xl bg-blue-50/60 p-2">
                                                {invoice.items.map((item) => (
                                                    <p key={item.id} className="flex justify-between gap-3 text-xs text-slate-600">
                                                        <span>{item.description}</span>
                                                        <span className="font-bold">{formatCurrency(item.totalPrice)}</span>
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">
                                        {invoice.status === 'paid' ? (
                                            <div>
                                                <p className="font-black text-slate-800">{paymentLabels[invoice.lastPaymentMethod || invoice.paymentMethod] || invoice.lastPaymentMethod || invoice.paymentMethod}</p>
                                                {invoice.paidAt && <p className="text-xs text-slate-400">{new Date(invoice.paidAt).toLocaleString('vi-VN')}</p>}
                                            </div>
                                        ) : (
                                            <div>
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
                                            <input
                                                type="number"
                                                min="1"
                                                max={Number(invoice.outstandingAmount || invoice.totalAmount)}
                                                value={paymentAmounts[invoice.id] || ''}
                                                onChange={(event) => setPaymentAmounts({ ...paymentAmounts, [invoice.id]: event.target.value })}
                                                placeholder={`Tối đa ${formatCurrency(invoice.outstandingAmount || invoice.totalAmount)}`}
                                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                            />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${invoiceStatusMeta(invoice.status)[1]}`}>
                                            {invoiceStatusMeta(invoice.status)[0]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openInvoiceDetail(invoice)} className="mr-2 rounded-xl border border-blue-100 bg-white px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">
                                            Chi tiết
                                        </button>
                                        {['unpaid', 'partial'].includes(invoice.status) ? (
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

            {selectedInvoice && (
                <InvoiceDetailModal
                    invoice={selectedInvoice}
                    loading={loadingInvoiceDetail}
                    onClose={() => setSelectedInvoice(null)}
                />
            )}
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

function InvoiceDetailModal({ invoice, loading, onClose }) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-6 print:static print:bg-white print:p-0" onMouseDown={onClose} role="presentation">
            <div className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl print:my-0 print:max-w-none print:rounded-none print:shadow-none" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-blue-50/60 p-6 print:bg-white">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Chi tiết hóa đơn</p>
                        <h3 className="mt-1 text-2xl font-black text-blue-950">INV-{invoice.id}</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-500">{invoice.patientName} · {invoice.patientPhone || invoice.patientEmail || ''}</p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                        <button type="button" onClick={handlePrint} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">In/PDF</button>
                        <button type="button" onClick={onClose} className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-blue-50">Đóng</button>
                    </div>
                </div>

                <div className="space-y-5 p-6">
                    {loading && <p className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">Đang tải chi tiết mới nhất...</p>}

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Info label="Ngày khám" value={invoice.appointmentDate ? new Date(invoice.appointmentDate).toLocaleDateString('vi-VN') : '-'} />
                        <Info label="Bác sĩ" value={invoice.dentistName || '-'} />
                        <Info label="Trạng thái" value={invoice.status} />
                    </div>

                    <section className="rounded-2xl border border-blue-100">
                        <div className="border-b border-blue-100 px-4 py-3">
                            <p className="font-black text-blue-950">Dịch vụ tính tiền</p>
                        </div>
                        <div className="divide-y divide-blue-50">
                            {(invoice.items || []).map((item) => (
                                <div key={item.id} className="grid grid-cols-[1fr_80px_130px] gap-3 px-4 py-3 text-sm">
                                    <span className="font-bold text-slate-700">{item.description}</span>
                                    <span className="text-center text-slate-500">x{item.quantity}</span>
                                    <span className="text-right font-black text-blue-700">{formatCurrency(item.totalPrice)}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                        <Meta label="Tạm tính" value={formatCurrency(invoice.subtotalAmount)} />
                        <Meta label="Giảm giá" value={formatCurrency(invoice.discountAmount)} />
                        <Meta label="Đã thu" value={formatCurrency(invoice.paidAmount)} />
                        <Meta label="Còn lại" value={formatCurrency(invoice.outstandingAmount)} strong />
                    </section>

                    <section className="rounded-2xl border border-blue-100 p-4">
                        <p className="font-black text-blue-950">Lịch sử thanh toán</p>
                        {(invoice.payments || []).length === 0 ? (
                            <p className="mt-3 text-sm font-bold text-slate-500">Chưa ghi nhận thanh toán.</p>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {invoice.payments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between gap-4 rounded-xl bg-blue-50/60 px-4 py-3 text-sm">
                                        <div>
                                            <p className="font-black text-blue-950">{paymentLabels[payment.paymentMethod] || payment.paymentMethod}</p>
                                            <p className="text-xs font-semibold text-slate-500">{payment.createdAt ? new Date(payment.createdAt).toLocaleString('vi-VN') : ''}</p>
                                        </div>
                                        <p className="font-black text-emerald-700">{formatCurrency(payment.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="rounded-2xl border border-blue-100 p-4">
            <p className="text-xs font-black uppercase text-slate-400">{label}</p>
            <p className="mt-2 font-black text-blue-950">{value}</p>
        </div>
    );
}

function Meta({ label, value, strong = false }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <span className={`${strong ? 'text-xl text-rose-700' : 'text-base text-blue-950'} font-black`}>{value}</span>
        </div>
    );
}
