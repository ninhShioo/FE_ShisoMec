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

const emptyFeedbackSummary = {
    total: 0,
    helpful: 0,
    unhelpful: 0,
    recentUnhelpful: [],
    quality: {
        days: 30,
        observedResponses: 0,
        totalResponses: 0,
        legacyResponses: 0,
        telemetryCoverage: 0,
        totalFeedback: 0,
        helpfulRate: 0,
        groundedRate: 0,
        reviewRecommended: 0,
        reviewRate: 0,
        averageConfidence: 0,
        averageGroundingConfidence: 0,
        byIntent: [],
        byAiMode: [],
        daily: []
    }
};

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

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
    const [feedbackSummary, setFeedbackSummary] = useState(emptyFeedbackSummary);
    const [qaResult, setQaResult] = useState(null);
    const [qaLoading, setQaLoading] = useState(false);
    const [previewQuestion, setPreviewQuestion] = useState('');

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
            setFeedbackSummary(res.data.data || emptyFeedbackSummary);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải thống kê phản hồi AI.');
        }
    };

    useEffect(() => {
        fetchItems();
        // Search text is submitted explicitly; only status changes reload automatically.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setQaResult(null);
        setPreviewQuestion('');
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
        setQaResult(null);
        setPreviewQuestion('');
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
        setQaResult(null);
        setPreviewQuestion(sample.userMessage || '');
        setIsEditing(false);
        setShowForm(true);
        revealForm();
    };

    const closeForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setFormData(emptyKnowledge);
        setQaResult(null);
        setPreviewQuestion('');
    };

    const updateFormData = (changes) => {
        setFormData((current) => ({ ...current, ...changes }));
        setQaResult(null);
    };

    const runKnowledgeCheck = async (candidate = formData, showSuccess = true) => {
        try {
            setQaLoading(true);
            const res = await api.post('/ai-knowledge/validate', {
                ...candidate,
                testQuestions: previewQuestion.trim() ? [previewQuestion.trim()] : []
            });
            const result = res.data.data;
            setQaResult(result);
            if (showSuccess) {
                if (result.ready) toast.success('Tri thức đạt kiểm tra chất lượng.');
                else toast.error('Tri thức còn lỗi cần sửa trước khi lưu.');
            }
            return result;
        } catch (error) {
            const result = error.response?.data?.data?.qa;
            if (result) setQaResult(result);
            toast.error(error.response?.data?.message || 'Không thể kiểm tra tri thức AI.');
            return null;
        } finally {
            setQaLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const qa = await runKnowledgeCheck(formData, false);
            if (!qa?.ready) {
                toast.error('Hãy sửa các lỗi QA trước khi lưu tri thức.');
                return;
            }

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
        openTrainingSampleForm(sample);
        toast('Kiểm tra và chỉnh câu trả lời trước khi đưa vào AI Knowledge.');
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

                <div className="border-t border-blue-100 bg-slate-50/70 px-6 py-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase text-blue-700">Chất lượng AI</p>
                            <h3 className="mt-1 text-lg font-black text-blue-950">Theo dõi trong {feedbackSummary.quality?.days || 30} ngày</h3>
                        </div>
                        <p className="text-sm font-bold text-slate-500">
                            {feedbackSummary.quality?.totalResponses || 0}/{feedbackSummary.quality?.observedResponses || 0} câu trả lời có telemetry
                        </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <QualityMetric label="Tỷ lệ hữu ích" value={formatPercent(feedbackSummary.quality?.helpfulRate)} detail={`${feedbackSummary.quality?.totalFeedback || 0} lượt đánh giá`} />
                        <QualityMetric label="Có nguồn dữ liệu" value={formatPercent(feedbackSummary.quality?.groundedRate)} detail="Grounding từ DB hoặc kho tri thức" />
                        <QualityMetric label="Tin cậy intent" value={formatPercent(feedbackSummary.quality?.averageConfidence)} detail="Điểm nhận diện ý định trung bình" />
                        <QualityMetric label="Cần admin review" value={feedbackSummary.quality?.reviewRecommended || 0} detail={`${formatPercent(feedbackSummary.quality?.reviewRate)} tổng câu trả lời`} tone="rose" />
                    </div>

                    {feedbackSummary.quality?.byIntent?.length > 0 && (
                        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Intent</th>
                                        <th className="px-4 py-3 text-center">Câu trả lời</th>
                                        <th className="px-4 py-3 text-center">Có nguồn</th>
                                        <th className="px-4 py-3 text-center">Tin cậy</th>
                                        <th className="px-4 py-3 text-center">Cần review</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {feedbackSummary.quality.byIntent.slice(0, 6).map((row) => (
                                        <tr key={row.intent}>
                                            <td className="px-4 py-3 font-black text-blue-950">{row.intent}</td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-600">{row.responses}</td>
                                            <td className="px-4 py-3 text-center font-bold text-teal-700">{formatPercent(row.groundedRate)}</td>
                                            <td className="px-4 py-3 text-center font-bold text-blue-700">{formatPercent(row.averageConfidence)}</td>
                                            <td className="px-4 py-3 text-center font-bold text-rose-600">{row.reviewRecommended}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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
                                    {item.comment && <p className="mt-2 text-xs font-black text-rose-600">Lý do: {item.comment}</p>}
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
                                        Kiểm tra
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
                                <Field inputRef={titleInputRef} label="Tiêu đề" value={formData.title} onChange={(value) => updateFormData({ title: value })} required />
                                <Select label="Nhóm kiến thức" value={formData.category} onChange={(value) => updateFormData({ category: value })}>
                                    {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </Select>
                                <label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-black text-blue-950">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(event) => updateFormData({ isActive: event.target.checked })}
                                        className="h-5 w-5 rounded border-blue-200 text-blue-700 focus:ring-blue-200"
                                    />
                                    Cho chatbot sử dụng
                                </label>
                                <div className="lg:col-span-3">
                                    <Textarea
                                        label="Từ khóa, cách hỏi thường gặp"
                                        rows={3}
                                        value={formData.keywords}
                                        onChange={(value) => updateFormData({ keywords: value })}
                                        placeholder="Ví dụ: đau răng, nhức răng, ê buốt, sâu răng"
                                        required
                                    />
                                </div>
                                <div className="lg:col-span-3">
                                    <Textarea
                                        label="Câu trả lời mẫu"
                                        rows={6}
                                        value={formData.answer}
                                        onChange={(value) => updateFormData({ answer: value })}
                                        placeholder="Nội dung chatbot sẽ ưu tiên dùng khi khớp từ khóa."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-5 border-t border-blue-100 pt-5">
                                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                    <input
                                        value={previewQuestion}
                                        onChange={(event) => {
                                            setPreviewQuestion(event.target.value);
                                            setQaResult(null);
                                        }}
                                        placeholder="Nhập một câu khách có thể hỏi để kiểm tra độ khớp"
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => runKnowledgeCheck()}
                                        disabled={qaLoading}
                                        className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-black text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {qaLoading ? 'Đang kiểm tra...' : 'Kiểm tra trước'}
                                    </button>
                                </div>

                                {qaResult && <KnowledgeQaReport result={qaResult} />}
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

function QualityMetric({ label, value, detail, tone = 'blue' }) {
    const valueClass = tone === 'rose' ? 'text-rose-600' : 'text-blue-800';

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-black ${valueClass}`}>{value}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">{detail}</p>
        </div>
    );
}

function KnowledgeQaReport({ result }) {
    return (
        <div className={`mt-4 rounded-xl border p-4 ${result.ready ? 'border-teal-200 bg-teal-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className={`text-sm font-black ${result.ready ? 'text-teal-800' : 'text-rose-700'}`}>
                        {result.ready ? 'Đạt kiểm tra chất lượng' : 'Cần chỉnh sửa trước khi lưu'}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">Điểm sẵn sàng: {result.readinessScore}/100</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${result.ready ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-700'}`}>
                    {result.errors.length} lỗi · {result.warnings.length} cảnh báo
                </span>
            </div>

            {result.errors.length > 0 && (
                <div className="mt-3 space-y-1 text-sm font-bold text-rose-700">
                    {result.errors.map((message) => <p key={message}>Lỗi: {message}</p>)}
                </div>
            )}
            {result.warnings.length > 0 && (
                <div className="mt-3 space-y-1 text-sm font-semibold text-amber-700">
                    {result.warnings.map((message) => <p key={message}>Cảnh báo: {message}</p>)}
                </div>
            )}

            {result.preview.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-white/80 bg-white">
                    <table className="w-full min-w-[560px] text-left text-xs">
                        <thead className="bg-slate-50 font-black uppercase text-slate-500">
                            <tr>
                                <th className="px-3 py-2">Câu hỏi kiểm tra</th>
                                <th className="px-3 py-2 text-center">Hạng</th>
                                <th className="px-3 py-2 text-center">Điểm khớp</th>
                                <th className="px-3 py-2">Khớp cao nhất</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {result.preview.map((item) => (
                                <tr key={item.question}>
                                    <td className="px-3 py-2 font-bold text-slate-700">{item.question}</td>
                                    <td className="px-3 py-2 text-center font-black text-blue-700">{item.candidateRank || '-'}</td>
                                    <td className="px-3 py-2 text-center font-black text-teal-700">{Math.round(item.candidateScore * 100)}%</td>
                                    <td className="px-3 py-2 font-semibold text-slate-500">{item.topMatches[0]?.title || 'Không có kết quả'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
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
