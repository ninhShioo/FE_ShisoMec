import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { getHighlightClass } from '../../utils/notificationNavigation';
import Icon from '../ui/Icons';

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

function MoneyText({ value, className = '' }) {
    return <span className={`whitespace-nowrap tabular-nums ${className}`}>{formatCurrency(value)}</span>;
}

const getQrImageUrl = (paymentUrl) => (
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(paymentUrl)}`
);

const isInvoicePaid = (invoice) => invoice?.status === 'paid' || Number(invoice?.outstandingAmount || 0) <= 0;

const getInvoiceDisplayCode = (invoice) => `HD-${invoice?.appointmentId || invoice?.id}`;

const isInvoiceHighlighted = (invoice, highlight) => (
    (highlight.type === 'invoice' && highlight.id === String(invoice.id))
    || (highlight.type === 'appointment' && highlight.id === String(invoice.appointmentId))
);

export default function InvoicesTab() {
    const location = useLocation();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [completedAppointments, setCompletedAppointments] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMethods, setSelectedMethods] = useState({});
    const [paymentAmounts, setPaymentAmounts] = useState({});
    const [selectedPromotions, setSelectedPromotions] = useState({});
    const [applyingPromotion, setApplyingPromotion] = useState({});
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
    const [vnpayPayment, setVnpayPayment] = useState(null);
    const [checkingVnpay, setCheckingVnpay] = useState(false);
    const getSelectedMethod = (invoice) => selectedMethods[invoice.id] || invoice.paymentMethod || 'cash';
    const queryHighlight = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            type: params.get('highlightType'),
            id: params.get('highlightId')
        };
    }, [location.search]);
    const [highlight, setHighlight] = useState(queryHighlight);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const [invoiceRes, promotionRes, appointmentRes] = await Promise.all([
                api.get('/invoices'),
                api.get('/promotions/active'),
                api.get('/appointments', { params: { status: 'completed' } })
            ]);
            const nextInvoices = invoiceRes.data.data || [];
            setInvoices(nextInvoices);
            setCompletedAppointments(appointmentRes.data.data || []);
            setPromotions(promotionRes.data.data || []);
            setSelectedPromotions(Object.fromEntries(nextInvoices.map(invoice => [invoice.id, invoice.promotionId ? String(invoice.promotionId) : ''])));
        } catch {
            toast.error('Không thể tải danh sách hóa đơn.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    useEffect(() => {
        setHighlight(queryHighlight);
        if (!queryHighlight.type || !queryHighlight.id) return undefined;

        const timer = window.setTimeout(() => {
            setHighlight({ type: null, id: null });

            const params = new URLSearchParams(location.search);
            params.delete('highlightType');
            params.delete('highlightId');
            const nextSearch = params.toString();
            navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
        }, 4200);
        return () => window.clearTimeout(timer);
    }, [location.pathname, location.search, navigate, queryHighlight]);

    useEffect(() => {
        if (loading || !highlight.type || !highlight.id) return;

        const timer = window.setTimeout(() => {
            const targetInvoice = invoices.find((invoice) => isInvoiceHighlighted(invoice, highlight));
            if (targetInvoice) {
                document.getElementById(`invoice-row-${targetInvoice.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (highlight.type === 'appointment') {
                document.getElementById(`invoice-appointment-row-${highlight.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 120);

        return () => window.clearTimeout(timer);
    }, [invoices, loading, highlight]);

    const mergeInvoice = useCallback((nextInvoice) => {
        setInvoices(current => current.map(invoice => (
            invoice.id === nextInvoice.id ? { ...invoice, ...nextInvoice } : invoice
        )));
        setSelectedPromotions(current => ({
            ...current,
            [nextInvoice.id]: nextInvoice.promotionId ? String(nextInvoice.promotionId) : ''
        }));
        setSelectedInvoice(current => (
            current?.id === nextInvoice.id ? { ...current, ...nextInvoice } : current
        ));
        setVnpayPayment(current => (
            current?.invoice?.id === nextInvoice.id ? { ...current, invoice: { ...current.invoice, ...nextInvoice } } : current
        ));
        setPaymentAmounts(current => {
            const currentAmount = Number(current[nextInvoice.id] || 0);
            const maxAmount = Number(nextInvoice.outstandingAmount || nextInvoice.totalAmount || 0);
            if (!currentAmount || currentAmount <= maxAmount) return current;

            const next = { ...current };
            delete next[nextInvoice.id];
            return next;
        });
    }, []);

    const refreshInvoicePayment = useCallback(async (invoiceId, showToast = true) => {
        try {
            setCheckingVnpay(true);
            const res = await api.get(`/invoices/${invoiceId}`);
            const nextInvoice = res.data.data;
            if (!nextInvoice) return;

            mergeInvoice(nextInvoice);
            if (showToast) {
                if (isInvoicePaid(nextInvoice)) {
                    toast.success('Hóa đơn đã thanh toán, có thể in/PDF.');
                } else {
                    toast.error('Chưa ghi nhận thanh toán VNPay. Vui lòng thử lại sau vài giây.');
                }
            }
        } catch (err) {
            if (showToast) toast.error(err.response?.data?.message || 'Không thể kiểm tra trạng thái thanh toán.');
        } finally {
            setCheckingVnpay(false);
        }
    }, [mergeInvoice]);

    useEffect(() => {
        if (!vnpayPayment || isInvoicePaid(vnpayPayment.invoice)) return undefined;

        const timer = window.setInterval(() => {
            refreshInvoicePayment(vnpayPayment.invoice.id, false);
        }, 5000);

        return () => window.clearInterval(timer);
    }, [vnpayPayment, refreshInvoicePayment]);

    const handleCreateInvoice = async (appointmentId) => {
        if (!window.confirm(`Lập hóa đơn cho lịch hẹn #${appointmentId}?`)) return;

        try {
            const res = await api.post('/invoices', { appointmentId, paymentMethod: 'cash' });
            toast.success(`Đã lập hóa đơn ${getInvoiceDisplayCode(res.data.data)}.`);
            await fetchInvoices();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể lập hóa đơn.');
        }
    };

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

    const handleVnpayPayment = async (invoice) => {
        try {
            const amount = paymentAmounts[invoice.id] ? Number(paymentAmounts[invoice.id]) : undefined;
            const res = await api.post(`/invoices/${invoice.id}/vnpay-url`, { amount });
            const paymentUrl = res.data.data?.paymentUrl;
            if (!paymentUrl) {
                toast.error('Không nhận được link thanh toán VNPay.');
                return;
            }
            setVnpayPayment({
                invoice,
                paymentUrl,
                amount: res.data.data?.amount,
                txnRef: res.data.data?.txnRef
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể tạo thanh toán VNPay.');
        }
    };

    const handleApplyPromotion = async (invoice) => {
        const promotionId = selectedPromotions[invoice.id] || '';
        try {
            setApplyingPromotion(current => ({ ...current, [invoice.id]: true }));
            const res = await api.put(`/invoices/${invoice.id}/promotion`, { promotionId });
            const nextInvoice = res.data.data;
            if (nextInvoice) mergeInvoice(nextInvoice);
            toast.success(res.data.message || (promotionId ? 'Đã áp voucher.' : 'Đã bỏ voucher.'));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể áp voucher cho hóa đơn.');
        } finally {
            setApplyingPromotion(current => ({ ...current, [invoice.id]: false }));
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
            const source = [
                `inv-${invoice.id}`,
                getInvoiceDisplayCode(invoice),
                invoice.appointmentId ? `lich-${invoice.appointmentId}` : '',
                invoice.appointmentId ? `lịch #${invoice.appointmentId}` : '',
                invoice.patientName || '',
                invoice.patientPhone || ''
            ].join(' ').toLowerCase();
            const matchSearch = !keyword || source.includes(keyword);
            return matchStatus && matchSearch;
        });
    }, [invoices, statusFilter, searchTerm]);

    const pendingInvoiceAppointments = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        return completedAppointments
            .filter((appointment) => !appointment.invoiceId)
            .filter((appointment) => {
                const source = [
                    `lich-${appointment.id}`,
                    `lịch #${appointment.id}`,
                    appointment.patientName || '',
                    appointment.patientPhone || '',
                    appointment.dentistName || '',
                    appointment.serviceNames || ''
                ].join(' ').toLowerCase();
                return !keyword || source.includes(keyword);
            });
    }, [completedAppointments, searchTerm]);

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
                        <p className="mt-2 text-sm text-slate-500">Theo dõi hóa đơn sau khám, xác nhận khoản thu tại quầy hoặc mở VNPay/QR cho khách.</p>
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

            {pendingInvoiceAppointments.length > 0 && (
                <Panel>
                    <div className="flex flex-col gap-2 border-b border-blue-100 bg-amber-50/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase text-amber-700">Chờ lập hóa đơn</p>
                            <h3 className="mt-1 text-xl font-black text-blue-950">Lịch khám đã hoàn thành</h3>
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700">
                            {pendingInvoiceAppointments.length} lịch
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] table-fixed divide-y divide-amber-100">
                            <thead>
                                <tr className="bg-white text-left text-xs font-black uppercase text-slate-500">
                                    <th className="w-[110px] px-5 py-3">Mã lịch</th>
                                    <th className="w-[190px] px-5 py-3">Khách hàng</th>
                                    <th className="w-[170px] px-5 py-3">Thời gian khám</th>
                                    <th className="w-[190px] px-5 py-3">Bác sĩ</th>
                                    <th className="px-5 py-3">Dịch vụ</th>
                                    <th className="w-[150px] px-5 py-3 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-50">
                                {pendingInvoiceAppointments.map((appointment) => (
                                    <tr
                                        key={appointment.id}
                                        id={`invoice-appointment-row-${appointment.id}`}
                                        className={`hover:bg-amber-50/50 ${getHighlightClass(highlight.type === 'appointment' && highlight.id === String(appointment.id))}`}
                                    >
                                        <td className="px-5 py-4 align-middle font-black text-blue-950">Lịch #{appointment.id}</td>
                                        <td className="px-5 py-4 align-middle">
                                            <p className="font-black text-blue-950">{appointment.patientName}</p>
                                            {appointment.patientPhone && <p className="text-xs text-slate-500">{appointment.patientPhone}</p>}
                                        </td>
                                        <td className="px-5 py-4 align-middle text-sm font-semibold text-slate-600">
                                            {appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString('vi-VN') : '-'}
                                            {appointment.appointmentTime ? ` · ${String(appointment.appointmentTime).slice(0, 5)}` : ''}
                                        </td>
                                        <td className="px-5 py-4 align-middle text-sm font-semibold text-slate-600">{appointment.dentistName || '-'}</td>
                                        <td className="px-5 py-4 align-middle text-sm text-slate-600">{appointment.serviceNames || '-'}</td>
                                        <td className="px-5 py-4 text-center align-middle">
                                            <button
                                                type="button"
                                                onClick={() => handleCreateInvoice(appointment.id)}
                                                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-50 px-4 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
                                            >
                                                Lập hóa đơn
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}

            <Panel>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] table-fixed divide-y divide-blue-100">
                        <thead>
                            <tr className="bg-blue-50/60 text-left text-xs font-black uppercase text-slate-500">
                                <th className="w-[95px] px-5 py-3">Mã hóa đơn</th>
                                <th className="w-[170px] px-5 py-3">Khách hàng</th>
                                <th className="w-[305px] px-5 py-3">Tổng tiền</th>
                                <th className="w-[285px] px-5 py-3">Thanh toán</th>
                                <th className="w-[145px] px-5 py-3 text-center">Trạng thái</th>
                                <th className="w-[180px] px-5 py-3 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                            {filteredInvoices.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-sm font-bold text-slate-500">Không có hóa đơn phù hợp.</td></tr>
                            ) : filteredInvoices.map(invoice => (
                                <tr
                                    key={invoice.id}
                                    id={`invoice-row-${invoice.id}`}
                                    className={`hover:bg-blue-50/40 ${getHighlightClass(isInvoiceHighlighted(invoice, highlight))}`}
                                >
                                    <td className="px-5 py-4 align-middle">
                                        <p className="font-black text-blue-950">{getInvoiceDisplayCode(invoice)}</p>
                                        {invoice.appointmentId && <p className="mt-1 text-xs font-bold text-slate-400">Lịch #{invoice.appointmentId}</p>}
                                    </td>
                                    <td className="px-5 py-4 align-middle">
                                        <p className="font-black text-blue-950">{invoice.patientName}</p>
                                        {invoice.patientPhone && <p className="text-xs text-slate-500">{invoice.patientPhone}</p>}
                                    </td>
                                    <td className="px-5 py-4 align-middle">
                                        <p className="font-black text-blue-700"><MoneyText value={invoice.totalAmount} /></p>
                                        {Number(invoice.discountAmount || 0) > 0 && (
                                            <p className="text-xs font-bold text-emerald-600">Giảm <MoneyText value={invoice.discountAmount} /></p>
                                        )}
                                        {invoice.promotionName && (
                                            <p className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                                                {invoice.promotionName} -{Number(invoice.promotionDiscountPercent || 0)}%
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500">Đã thu <MoneyText value={invoice.paidAmount} /></p>
                                        {Number(invoice.outstandingAmount || 0) > 0 && (
                                            <p className="text-xs font-black text-rose-600">Còn <MoneyText value={invoice.outstandingAmount} /></p>
                                        )}
                                        {Array.isArray(invoice.items) && invoice.items.length > 0 && (
                                            <div className="mt-3 space-y-2 rounded-xl bg-blue-50/60 p-3">
                                                {invoice.items.map((item) => (
                                                    <div key={item.id} className="grid min-h-[34px] grid-cols-[minmax(150px,1fr)_max-content] items-center gap-4 text-xs leading-5 text-slate-600">
                                                        <span className="min-w-0 break-words">{item.description}</span>
                                                        <MoneyText value={item.totalPrice} className="justify-self-end font-bold text-slate-700" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-middle text-sm text-slate-700">
                                        {invoice.status === 'paid' ? (
                                            <div>
                                                <p className="font-black text-slate-800">{paymentLabels[invoice.lastPaymentMethod || invoice.paymentMethod] || invoice.lastPaymentMethod || invoice.paymentMethod}</p>
                                                {invoice.paidAt && <p className="text-xs text-slate-400">{new Date(invoice.paidAt).toLocaleString('vi-VN')}</p>}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                            {invoice.status === 'unpaid' && (
                                                <div className="grid grid-cols-[1fr_auto] gap-2">
                                                    <select
                                                        value={selectedPromotions[invoice.id] ?? (invoice.promotionId ? String(invoice.promotionId) : '')}
                                                        onChange={(event) => setSelectedPromotions({ ...selectedPromotions, [invoice.id]: event.target.value })}
                                                        className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                                                    >
                                                        <option value="">Không dùng voucher</option>
                                                        {promotions.map((promotion) => (
                                                            <option key={promotion.id} value={promotion.id}>
                                                                {promotion.name} -{promotion.discountPercent}%
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        disabled={Boolean(applyingPromotion[invoice.id])}
                                                        onClick={() => handleApplyPromotion(invoice)}
                                                        className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                                    >
                                                        {applyingPromotion[invoice.id] ? '...' : 'Áp'}
                                                    </button>
                                                </div>
                                            )}
                                            <select
                                                value={getSelectedMethod(invoice)}
                                                onChange={(event) => setSelectedMethods({ ...selectedMethods, [invoice.id]: event.target.value })}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                                            >
                                                <option value="cash">Tiền mặt</option>
                                                <option value="card">Thẻ</option>
                                                <option value="transfer">Chuyển khoản</option>
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                max={Number(invoice.outstandingAmount || invoice.totalAmount)}
                                                value={paymentAmounts[invoice.id] || ''}
                                                onChange={(event) => setPaymentAmounts({ ...paymentAmounts, [invoice.id]: event.target.value })}
                                                placeholder={`Còn phải thu ${formatCurrency(invoice.outstandingAmount || invoice.totalAmount)}`}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs font-semibold text-slate-400">
                                                Để trống nếu thu toàn bộ số tiền còn lại.
                                            </p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center align-middle">
                                        <span className={`inline-flex min-w-[112px] justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${invoiceStatusMeta(invoice.status)[1]}`}>
                                            {invoiceStatusMeta(invoice.status)[0]}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center align-middle">
                                        <div className="mx-auto inline-flex max-w-full items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-white/90 p-1.5 shadow-sm">
                                            <InvoiceIconAction label="Chi tiết" shortLabel="Xem" icon="eye" tone="blue" onClick={() => openInvoiceDetail(invoice)} />
                                            {['unpaid', 'partial'].includes(invoice.status) ? (
                                                <>
                                                    {getSelectedMethod(invoice) === 'transfer' && (
                                                        <InvoiceIconAction label="VNPay/QR" shortLabel="QR" icon="qr" tone="emerald" onClick={() => handleVnpayPayment(invoice)} />
                                                    )}
                                                    <InvoiceIconAction label="Thu tiền" shortLabel="Thu" icon="wallet" tone="solidBlue" onClick={() => handlePay(invoice.id)} />
                                                </>
                                            ) : (
                                                <span title="Đã hoàn tất" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 text-xs font-black text-emerald-700">
                                                    <Icon name="check" className="h-4 w-4" />
                                                    OK
                                                </span>
                                            )}
                                        </div>
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
                    <p className="text-2xl font-black text-rose-700"><MoneyText value={pendingAmount} /></p>
                </div>
            </Panel>

            {selectedInvoice && (
                <InvoiceDetailModal
                    invoice={selectedInvoice}
                    loading={loadingInvoiceDetail}
                    onClose={() => setSelectedInvoice(null)}
                />
            )}

            {vnpayPayment && (
                <VnpayQrModal
                    payment={vnpayPayment}
                    checking={checkingVnpay}
                    onClose={() => setVnpayPayment(null)}
                    onCheck={() => refreshInvoicePayment(vnpayPayment.invoice.id, true)}
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

function VnpayQrModal({ payment, checking, onClose, onCheck }) {
    const paid = isInvoicePaid(payment.invoice);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4" onMouseDown={onClose} role="presentation">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-emerald-50/70 p-6">
                    <div>
                        <p className="text-sm font-black uppercase text-emerald-700">VNPay QR</p>
                        <h3 className="mt-1 text-2xl font-black text-blue-950">Thanh toán {getInvoiceDisplayCode(payment.invoice)}</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-600">Khách quét mã, thanh toán xong hệ thống sẽ tự ghi nhận nếu IPN hoạt động.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-emerald-50">Đóng</button>
                </div>

                <div className="grid gap-6 p-6 md:grid-cols-[300px_1fr]">
                    <div className="rounded-2xl border border-emerald-100 bg-white p-5 text-center">
                        <img src={getQrImageUrl(payment.paymentUrl)} alt="QR thanh toán VNPay" className="mx-auto h-[260px] w-[260px] rounded-xl" />
                        <p className="mt-4 text-xs font-bold text-slate-500">Mã QR chứa link thanh toán VNPay sandbox.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase text-slate-400">Số tiền</p>
                            <p className="mt-1 text-2xl font-black text-emerald-700"><MoneyText value={payment.amount || payment.invoice.outstandingAmount} /></p>
                        </div>
                        <div className={`rounded-2xl p-4 ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            <p className="text-xs font-black uppercase opacity-80">Trạng thái</p>
                            <p className="mt-1 font-black">{paid ? 'Đã ghi nhận thanh toán' : 'Đang chờ khách thanh toán'}</p>
                        </div>
                        <div className="rounded-2xl border border-blue-100 p-4 text-sm font-semibold text-slate-600">
                            <p>Sau khi khách thanh toán, bấm kiểm tra trạng thái. Nếu VNPay gọi IPN thành công, hóa đơn sẽ chuyển sang đã thanh toán và có thể in/PDF.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <a href={payment.paymentUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white hover:bg-emerald-700">
                                Mở trang VNPay
                            </a>
                            <button type="button" onClick={onCheck} disabled={checking} className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                                {checking ? 'Đang kiểm tra...' : 'Đã thanh toán, kiểm tra lại'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InvoiceDetailModal({ invoice, loading, onClose }) {
    const paid = isInvoicePaid(invoice);
    const handlePrint = () => {
        if (!paid) return;
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-6 print:static print:bg-white print:p-0" onMouseDown={onClose} role="presentation">
            <div className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl print:my-0 print:max-w-none print:rounded-none print:shadow-none" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-blue-50/60 p-6 print:bg-white">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Chi tiết hóa đơn</p>
                        <h3 className="mt-1 text-2xl font-black text-blue-950">{getInvoiceDisplayCode(invoice)}</h3>
                        {invoice.appointmentId && <p className="mt-1 text-sm font-bold text-slate-500">Lịch hẹn #{invoice.appointmentId}</p>}
                        <p className="mt-2 text-sm font-semibold text-slate-500">{invoice.patientName} · {invoice.patientPhone || invoice.patientEmail || ''}</p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                        <button type="button" onClick={handlePrint} disabled={!paid} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">In/PDF</button>
                        <button type="button" onClick={onClose} className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-blue-50">Đóng</button>
                    </div>
                </div>

                <div className="space-y-5 p-6">
                    {loading && <p className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">Đang tải chi tiết mới nhất...</p>}
                    {!paid && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-700">Chỉ in/PDF sau khi hóa đơn đã thanh toán đủ.</p>}

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
                                <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_56px_max-content] items-start gap-3 px-4 py-3 text-sm">
                                    <span className="min-w-0 font-bold text-slate-700">{item.description}</span>
                                    <span className="text-center text-slate-500">x{item.quantity}</span>
                                    <MoneyText value={item.totalPrice} className="text-right font-black text-blue-700" />
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                        <Meta label="Tạm tính" value={formatCurrency(invoice.subtotalAmount)} />
                        <Meta label="Giảm giá" value={formatCurrency(invoice.discountAmount)} />
                        {invoice.promotionName && (
                            <Meta label="Voucher" value={`${invoice.promotionName} -${Number(invoice.promotionDiscountPercent || 0)}%`} />
                        )}
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
                                        <p className="font-black text-emerald-700"><MoneyText value={payment.amount} /></p>
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

function InvoiceIconAction({ label, shortLabel, icon, tone = 'blue', onClick }) {
    const tones = {
        blue: 'border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-blue-100',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100',
        solidBlue: 'border-blue-700 bg-blue-700 text-white hover:border-blue-800 hover:bg-blue-800',
        slate: 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-slate-100'
    };

    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 text-xs font-black transition ${tones[tone] || tones.blue}`}
        >
            <Icon name={icon} className="h-4 w-4" />
            <span>{shortLabel || label}</span>
        </button>
    );
}

function Meta({ label, value, strong = false }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <span className={`whitespace-nowrap tabular-nums ${strong ? 'text-xl text-rose-700' : 'text-base text-blue-950'} font-black`}>{value}</span>
        </div>
    );
}
