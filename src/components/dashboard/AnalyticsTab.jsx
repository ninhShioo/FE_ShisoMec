import { useEffect, useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import SkeletonLoading from '../SkeletonLoading';

const COLORS = ['#1d4ed8', '#0891b2', '#059669', '#7c3aed', '#f59e0b', '#e11d48', '#475569', '#0ea5e9'];

const revenueViews = [
    {
        key: 'day',
        label: 'Ngày',
        title: 'Doanh thu 7 ngày gần nhất',
        description: 'Tính theo ngày thanh toán thành công.'
    },
    {
        key: 'week',
        label: 'Tuần',
        title: 'Doanh thu 8 tuần gần nhất',
        description: 'Gộp theo tuần thanh toán thành công.'
    },
    {
        key: 'month',
        label: 'Tháng',
        title: `Doanh thu theo tháng ${new Date().getFullYear()}`,
        description: '12 tháng trong năm hiện tại.'
    },
    {
        key: 'year',
        label: 'Năm',
        title: 'Doanh thu theo năm',
        description: 'So sánh 5 năm gần nhất.'
    }
];

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const compactCurrency = (value) => {
    const amount = Number(value || 0);
    if (amount >= 1000000000) return `${Math.round(amount / 100000000) / 10}tỷ`;
    if (amount >= 1000000) return `${Math.round(amount / 100000) / 10}tr`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
    return String(amount);
};

export default function AnalyticsTab() {
    const [stats, setStats] = useState({
        totalPatients: 0,
        totalDentists: 0,
        todayAppointments: 0,
        monthlyRevenue: 0
    });
    const [revenueSets, setRevenueSets] = useState({
        day: [],
        week: [],
        month: [],
        year: []
    });
    const [revenueView, setRevenueView] = useState('day');
    const [activityLogs, setActivityLogs] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/dashboard/summary');
            const summary = res.data.data || {};

            setStats(summary.stats || {});
            setRevenueSets({
                day: summary.revenueData || [],
                week: summary.weeklyRevenueData || [],
                month: summary.monthlyRevenueData || [],
                year: summary.yearlyRevenueData || []
            });
            setActivityLogs(summary.activityLogs || []);
            setPieData(summary.serviceUsage || []);
        } catch {
            toast.error('Không thể tải số liệu tổng quan.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const activeRevenueView = useMemo(
        () => revenueViews.find((item) => item.key === revenueView) || revenueViews[0],
        [revenueView]
    );
    const activeRevenueData = revenueSets[revenueView] || [];

    if (loading) {
        return (
            <div className="space-y-6">
                <SkeletonLoading type="cards" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SkeletonLoading type="chart" />
                    <SkeletonLoading type="chart" />
                </div>
            </div>
        );
    }

    const cards = [
        ['Khách hàng', stats.totalPatients, 'Tổng tài khoản khách hàng', 'blue'],
        ['Bác sĩ', stats.totalDentists, 'Bác sĩ đang có trong hệ thống', 'emerald'],
        ['Lịch hôm nay', stats.todayAppointments, 'Lịch khám trong ngày', 'rose'],
        ['Doanh thu tháng', formatCurrency(stats.monthlyRevenue), 'Thanh toán thành công', 'violet']
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-black uppercase text-blue-700">Tổng quan</p>
                    <h2 className="mt-1 text-2xl font-black text-blue-950">Số liệu vận hành phòng khám</h2>
                    <p className="mt-2 text-sm text-slate-500">Doanh thu được tính theo thời điểm thanh toán thành công.</p>
                </div>
                <button
                    type="button"
                    onClick={fetchData}
                    className="rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                >
                    Làm mới số liệu
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cards.map(([label, value, helper, tone]) => (
                    <SummaryCard key={label} label={label} value={value} helper={helper} tone={tone} />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <RevenuePanel
                    view={activeRevenueView}
                    viewKey={revenueView}
                    data={activeRevenueData}
                    onViewChange={setRevenueView}
                />

                <Panel>
                    <div className="border-b border-blue-100 px-6 py-5">
                        <h3 className="text-lg font-black text-blue-950">Dịch vụ được sử dụng</h3>
                        <p className="mt-1 text-sm text-slate-500">Dựa trên dịch vụ gắn với lịch hẹn.</p>
                    </div>
                    <div className="h-80 p-5">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={58} outerRadius={92} paddingAngle={4} dataKey="value">
                                        {pieData.map((entry, index) => (
                                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <RechartsTooltip
                                        formatter={(value) => [`${value} lượt`, 'Sử dụng']}
                                        contentStyle={{ borderRadius: '14px', border: '1px solid #dbeafe' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="grid h-full place-items-center text-center text-sm font-bold text-slate-400">
                                Chưa có dữ liệu sử dụng dịch vụ.
                            </div>
                        )}
                    </div>
                </Panel>
            </div>

            <Panel>
                <div className="flex flex-col gap-2 border-b border-blue-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-black text-blue-950">Hoạt động gần đây</h3>
                        <p className="mt-1 text-sm text-slate-500">Các thao tác quản trị mới nhất trong hệ thống.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-blue-100">
                        <thead>
                            <tr className="bg-blue-50/60 text-left text-xs font-black uppercase text-slate-500">
                                <th className="px-6 py-3">Hành động</th>
                                <th className="px-6 py-3">Đối tượng</th>
                                <th className="px-6 py-3">Người thực hiện</th>
                                <th className="px-6 py-3 text-right">Thời gian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                            {activityLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-sm font-bold text-slate-500">
                                        Chưa có hoạt động nào.
                                    </td>
                                </tr>
                            ) : (
                                activityLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-blue-50/40">
                                        <td className="px-6 py-4 text-sm font-black text-blue-950">{log.action}</td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                                {log.entity} #{log.entityId}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{log.userName || 'Không rõ'}</td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-slate-500">
                                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}

function RevenuePanel({ view, viewKey, data, onViewChange }) {
    const useLine = viewKey === 'day';

    return (
        <Panel>
            <div className="flex flex-col gap-4 border-b border-blue-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h3 className="text-lg font-black text-blue-950">{view.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{view.description}</p>
                </div>
                <div className="flex rounded-xl border border-blue-100 bg-blue-50 p-1">
                    {revenueViews.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onViewChange(item.key)}
                            className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                                viewKey === item.key ? 'bg-blue-700 text-white shadow-sm' : 'text-blue-700 hover:bg-white'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-80 p-5">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        {useLine ? (
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={compactCurrency} dx={-10} />
                                <RechartsTooltip
                                    formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                                    contentStyle={{ borderRadius: '14px', border: '1px solid #dbeafe' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#1d4ed8"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        ) : (
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={compactCurrency} dx={-10} />
                                <RechartsTooltip
                                    formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                                    contentStyle={{ borderRadius: '14px', border: '1px solid #dbeafe' }}
                                />
                                <Bar dataKey="revenue" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                ) : (
                    <div className="grid h-full place-items-center text-center text-sm font-bold text-slate-400">
                        Chưa có dữ liệu doanh thu.
                    </div>
                )}
            </div>
        </Panel>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function SummaryCard({ label, value, helper, tone }) {
    const toneClass = {
        blue: 'bg-blue-50 text-blue-800',
        emerald: 'bg-emerald-50 text-emerald-800',
        rose: 'bg-rose-50 text-rose-800',
        violet: 'bg-violet-50 text-violet-800'
    }[tone];

    return (
        <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100">
            <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl text-lg font-black ${toneClass}`}>
                {String(label)[0]}
            </div>
            <p className="text-sm font-black uppercase text-slate-500">{label}</p>
            <h3 className="mt-2 text-3xl font-black text-blue-950">{value}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
        </article>
    );
}
