import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const emptyKnowledge = {
    id: null,
    sampleId: null,
    title: '',
    category: 'clinical',
    keywords: '',
    answer: '',
    isActive: true
};

const categoryOptions = [
    ['clinical', 'Triệu chứng'],
    ['booking', 'Đặt lịch'],
    ['payment', 'Thanh toán'],
    ['procedure', 'Quy trình'],
    ['support', 'Hỗ trợ'],
    ['general', 'Khác']
];

const categoryLabels = Object.fromEntries(categoryOptions);

const categoryForIntent = (intent) => {
    if (['booking', 'patient_appointments', 'patient_followups'].includes(intent)) return 'booking';
    if (['payment', 'patient_invoices'].includes(intent)) return 'payment';
    if (['human_support'].includes(intent)) return 'support';
    if (['procedure'].includes(intent)) return 'procedure';
    if (['patient_medical_records', 'emergency', 'toothache', 'wisdom_tooth'].includes(intent)) return 'clinical';
    return 'general';
};

const formatDateTime = (value) => value
    ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

export default function AiKnowledgeTab() {
    const formRef = useRef(null);
    const titleInputRef = useRef(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(emptyKnowledge);
    const [filters, setFilters] = useState({ q: '', status: 'all' });
    const [trainingSamples, setTrainingSamples] = useState([]);
    const [trainingLoading, setTrainingLoading] = useState(true);
    const [feedbackSummary, setFeedbackSummary] = useState({ total: 0, helpful: 0, unhelpful: 0, recentUnhelpful: [] });

    const activeCount = useMemo(() => items.filter((item) => Number(item.isActive) === 1).length, [items]);
    const inactiveCount = items.length - activeCount;

    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await api.get('/ai-knowledge', {
                params: {
                    q: filters.q || undefined,
                    status: filters.status
                }
            });
            setItems(res.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải kho tri thức AI.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrainingSamples = async () => {
        try {
            setTrainingLoading(true);
            const res = await api.get('/ai-knowledge/training-samples', {
                params: { status: 'pending' }
            });
            setTrainingSamples(res.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải câu hỏi cần training.');
        } finally {
            setTrainingLoading(false);
        }
    };

    const fetchFeedbackSummary = async () => {
        try {
            const res = await api.get('/ai-knowledge/feedback-summary');
            setFeedbackSummary(res.data.data || { total: 0, helpful: 0, unhelpful: 0, recentUnhelpful: [] });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải thống kê phản hồi AI.');
        }
    };

    useEffect(() => {
        fetchItems();
    }, [filters.status]);

    useEffect(() => {
        fetchTrainingSamples();
        fetchFeedbackSummary();
    }, []);

    const revealForm = () => {
        window.setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            titleInputRef.current?.focus({ preventScroll: true });
        }, 60);
    };

    const openCreateForm = () => {
        setFormData(emptyKnowledge);
        setIsEditing(false);
        setShowForm(true);
        revealForm();
    };

    const openEditForm = (item) => {
        setFormData({
            id: item.id,
            sampleId: null,
            title: item.title || '',
            category: item.category || 'general',
            keywords: item.keywords || '',
            answer: item.answer || '',
            isActive: Number(item.isActive) === 1
        });
        setIsEditing(true);
        setShowForm(true);
        revealForm();
    };

    const openTrainingSampleForm = (sample) => {
        setFormData({
            ...emptyKnowledge,
            sampleId: sample.id,
            title: String(sample.userMessage || '').slice(0, 140),
            category: categoryForIntent(sample.intent),
            keywords: sample.userMessage || '',
            answer: sample.assistantReply || '',
            isActive: true
        });
        setIsEditing(false);
        setShowForm(true);
        revealForm();
    };

    const closeForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setFormData(emptyKnowledge);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            if (isEditing) {
                await api.put(`/ai-knowledge/${formData.id}`, formData);
                toast.success('Đã cập nhật tri thức AI.');
            } else {
                if (formData.sampleId) {
                    await api.post(`/ai-knowledge/training-samples/${formData.sampleId}/promote`, formData);
                } else {
                    await api.post('/ai-knowledge', formData);
                }
                toast.success('Đã thêm tri thức AI.');
            }

            closeForm();
            fetchItems();
            fetchTrainingSamples();
            fetchFeedbackSummary();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể lưu tri thức AI.');
        }
    };

    const handleDisable = async (item) => {
        if (!window.confirm(`Tắt tri thức "${item.title}"? Chat AI sẽ không dùng mục này nữa.`)) return;

        try {
            await api.delete(`/ai-knowledge/${item.id}`);
            toast.success('Đã tắt tri thức AI.');
            fetchItems();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tắt tri thức AI.');
        }
    };

    const handleSearch = (event) => {
        event.preventDefault();
        fetchItems();
    };

    const handlePromoteSample = async (sample) => {
        try {
            await api.post(`/ai-knowledge/training-samples/${sample.id}/promote`, {
                title: String(sample.userMessage || '').slice(0, 140),
                category: categoryForIntent(sample.intent),
                keywords: sample.userMessage || '',
                answer: sample.assistantReply || 'Cần bổ sung câu trả lời phù hợp.',
                isActive: true
            });
            toast.success('Đã lưu mẫu training vào AI Knowledge.');
            fetchItems();
            fetchTrainingSamples();
            fetchFeedbackSummary();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể lưu mẫu training.');
        }
    };

    const handleIgnoreSample = async (sample) => {
        if (!window.confirm('Bỏ qua câu hỏi training này?')) return;

        try {
            await api.patch(`/ai-knowledge/training-samples/${sample.id}`, { status: 'ignored' });
            toast.success('Đã bỏ qua mẫu training.');
            fetchTrainingSamples();
            fetchFeedbackSummary();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật mẫu training.');
        }
    };

    return (
        <div className="space-y-6">
            <Panel>
                <div className="flex flex-col gap-5 border-b border-blue-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">AI Knowledge</p>
                        <h2 className="mt-1 text-2xl font-black text-blue-950">Kho tri thức huấn luyện chat AI</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Thêm câu trả lời mẫu và từ khóa để chatbot hiểu nhiều cách hỏi hơn mà không cần sửa code.
                        </p>
                    </div>
                    <button type="button" onClick={openCreateForm} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                        Thêm tri thức
                    </button>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-5">
                    <SummaryCard label="Tổng tri thức" value={items.length} tone="blue" />
                    <SummaryCard label="Đang dùng" value={activeCount} tone="emerald" />
                    <SummaryCard label="Đã tắt" value={inactiveCount} tone="rose" />
                    <SummaryCard label="AI hữu ích" value={feedbackSummary.helpful} tone="teal" />
                    <SummaryCard label="AI chưa ổn" value={feedbackSummary.unhelpful} tone="amber" />
                </div>

                <form onSubmit={handleSearch} className="grid gap-3 border-t border-blue-100 px-6 py-5 lg:grid-cols-[1fr_220px_auto]">
                    <input
                        value={filters.q}
                        onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                        placeholder="Tìm theo tiêu đề, từ khóa hoặc câu trả lời"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <select
                        value={filters.status}
                        onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang dùng</option>
                        <option value="inactive">Đã tắt</option>
                    </select>
                    <button type="submit" className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 hover:bg-blue-100">
                        Tìm
                    </button>
                </form>
            </Panel>

            <Panel>
                <div className="flex flex-col gap-3 border-b border-blue-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-teal-700">Training inbox</p>
                        <h3 className="mt-1 text-xl font-black text-blue-950">Câu hỏi AI cần cải thiện</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Các câu hỏi chưa khớp intent rõ sẽ được gom ở đây để admin bổ sung tri thức.
                        </p>
                    </div>
                    <button type="button" onClick={fetchTrainingSamples} className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-black text-teal-700 hover:bg-teal-100">
                        Tải lại
                    </button>
                </div>

                {feedbackSummary.recentUnhelpful?.length > 0 && (
                    <div className="border-b border-blue-50 bg-amber-50/50 px-6 py-4">
                        <p className="text-sm font-black text-amber-800">Phản hồi "chưa ổn" gần đây</p>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            {feedbackSummary.recentUnhelpful.slice(0, 4).map((item) => (
                                <div key={item.id} className="rounded-xl border border-amber-100 bg-white px-4 py-3">
                                    <p className="text-xs font-bold text-slate-400">{item.userName} • {formatDateTime(item.createdAt)}</p>
                                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">{item.assistantReply}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {trainingLoading ? (
                    <div className="p-6 text-sm font-bold text-slate-500">Đang tải câu hỏi cần training...</div>
                ) : trainingSamples.length === 0 ? (
                    <div className="p-6 text-sm font-bold text-slate-500">Chưa có câu hỏi nào cần training. AI đang khá ngoan.</div>
                ) : (
                    <div className="divide-y divide-blue-50">
                        {trainingSamples.map((sample) => (
                            <article key={sample.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_260px]">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                                            {sample.intent || 'general'}
                                        </span>
                                        {sample.patientName && (
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                                {sample.patientName}
                                            </span>
                                        )}
                                        <span className="text-xs font-bold text-slate-400">{formatDateTime(sample.createdAt)}</span>
                                    </div>
                                    <p className="mt-3 text-sm font-black text-blue-950">Khách hỏi</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-700">{sample.userMessage}</p>
                                    <p className="mt-3 text-sm font-black text-blue-950">AI đã trả lời</p>
                                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-500">{sample.assistantReply}</p>
                                    {sample.reviewReason && (
                                        <p className="mt-3 text-xs font-bold text-amber-700">{sample.reviewReason}</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-start justify-end gap-2">
                                    <button type="button" onClick={() => handlePromoteSample(sample)} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-black text-white hover:bg-teal-700">
                                        Lưu nhanh
                                    </button>
                                    <button type="button" onClick={() => openTrainingSampleForm(sample)} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">
                                        Sửa trước
                                    </button>
                                    <button type="button" onClick={() => handleIgnoreSample(sample)} className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-100">
                                        Bỏ qua
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </Panel>

            {showForm && (
                <div ref={formRef} className="scroll-mt-24">
                    <Panel>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-black uppercase text-blue-700">{isEditing ? 'Cập nhật' : 'Tạo mới'}</p>
                                    <h3 className="mt-1 text-xl font-black text-blue-950">{isEditing ? 'Sửa tri thức AI' : 'Thêm tri thức AI'}</h3>
                                </div>
                                <button type="button" onClick={closeForm} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-blue-50">
                                    Hủy
                                </button>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-3">
                                <Field inputRef={titleInputRef} label="Tiêu đề" value={formData.title} onChange={(value) => setFormData({ ...formData, title: value })} required />
                                <Select label="Nhóm kiến thức" value={formData.category} onChange={(value) => setFormData({ ...formData, category: value })}>
                                    {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </Select>
                                <label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-black text-blue-950">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
                                        className="h-5 w-5 rounded border-blue-200 text-blue-700 focus:ring-blue-200"
                                    />
                                    Cho chatbot sử dụng
                                </label>
                                <div className="lg:col-span-3">
                                    <Textarea
                                        label="Từ khóa, cách hỏi thường gặp"
                                        rows={3}
                                        value={formData.keywords}
                                        onChange={(value) => setFormData({ ...formData, keywords: value })}
                                        placeholder="Ví dụ: đau răng, nhức răng, ê buốt, sâu răng"
                                        required
                                    />
                                </div>
                                <div className="lg:col-span-3">
                                    <Textarea
                                        label="Câu trả lời mẫu"
                                        rows={6}
                                        value={formData.answer}
                                        onChange={(value) => setFormData({ ...formData, answer: value })}
                                        placeholder="Nội dung chatbot sẽ ưu tiên dùng khi khớp từ khóa."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button type="submit" className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-black text-white hover:bg-blue-800">
                                    {isEditing ? 'Lưu thay đổi' : 'Thêm vào training'}
                                </button>
                            </div>
                        </form>
                    </Panel>
                </div>
            )}

            <Panel>
                {loading ? (
                    <div className="p-10 text-center text-sm font-bold text-slate-500">Đang tải kho tri thức...</div>
                ) : items.length === 0 ? (
                    <div className="p-10 text-center text-sm font-bold text-slate-500">Chưa có tri thức phù hợp.</div>
                ) : (
                    <div className="divide-y divide-blue-50">
                        {items.map((item) => (
                            <article key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_170px]">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                            {categoryLabels[item.category] || item.category || 'Khác'}
                                        </span>
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${Number(item.isActive) === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {Number(item.isActive) === 1 ? 'Đang dùng' : 'Đã tắt'}
                                        </span>
                                    </div>
                                    <h3 className="mt-3 text-lg font-black text-blue-950">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                                    <p className="mt-3 text-xs font-bold text-slate-400">
                                        Từ khóa: <span className="text-slate-600">{item.keywords}</span>
                                    </p>
                                </div>
                                <div className="flex items-start justify-end gap-2">
                                    <button type="button" onClick={() => openEditForm(item)} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">
                                        Sửa
                                    </button>
                                    {Number(item.isActive) === 1 && (
                                        <button type="button" onClick={() => handleDisable(item)} className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-100">
                                            Tắt
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    );
}

function Panel({ children }) {
    return <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</section>;
}

function SummaryCard({ label, value, tone }) {
    const toneClass = {
        blue: 'bg-blue-50 text-blue-800',
        emerald: 'bg-emerald-50 text-emerald-800',
        rose: 'bg-rose-50 text-rose-800',
        teal: 'bg-teal-50 text-teal-800',
        amber: 'bg-amber-50 text-amber-800'
    }[tone];

    return (
        <div className={`rounded-2xl p-5 ${toneClass}`}>
            <p className="text-3xl font-black">{value}</p>
            <p className="mt-1 text-sm font-black uppercase opacity-80">{label}</p>
        </div>
    );
}

function Field({ label, value, onChange, inputRef, ...props }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </label>
    );
}

function Select({ label, value, onChange, children }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                {children}
            </select>
        </label>
    );
}

function Textarea({ label, value, onChange, rows = 3, ...props }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props} />
        </label>
    );
}
