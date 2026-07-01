import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    getHighlightClass,
    getRememberedNotificationId,
    notificationRowHoverClass,
    clearRememberedNotification,
    rememberOpenedNotification,
    resolveNotificationTarget
} from '../../utils/notificationNavigation';

const typeLabels = {
    all: 'Tất cả',
    appointment: 'Lịch hẹn',
    payment: 'Hóa đơn',
    leave: 'Nghỉ phép',
    chat: 'Chat',
    system: 'Hệ thống'
};

const typeClasses = {
    appointment: 'bg-blue-50 text-blue-700',
    payment: 'bg-emerald-50 text-emerald-700',
    leave: 'bg-amber-50 text-amber-700',
    chat: 'bg-cyan-50 text-cyan-700',
    system: 'bg-slate-100 text-slate-700'
};

const summaryTypes = ['appointment', 'payment'];
const quickFilterTypes = ['all', 'appointment', 'payment', 'chat'];

export default function NotificationsHistoryTab() {
    const navigate = useNavigate();
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('all');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [recentlyOpenedId, setRecentlyOpenedId] = useState(() => getRememberedNotificationId());
    const queryHighlight = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            type: params.get('highlightType'),
            id: params.get('highlightId')
        };
    }, [location.search]);
    const [highlight, setHighlight] = useState(queryHighlight);
    const highlightedNotificationId = highlight.type === 'notification' && highlight.id
        ? highlight.id
        : recentlyOpenedId;

    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/notifications', {
                params: {
                    limit: 100,
                    type: typeFilter,
                    unreadOnly
                }
            });
            setNotifications(res.data.data || []);
            setSummary(res.data.summary || null);
        } catch {
            toast.error('Không thể tải lịch sử thông báo.');
        } finally {
            setLoading(false);
        }
    }, [typeFilter, unreadOnly]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        setHighlight(queryHighlight);
        if (!queryHighlight.type || !queryHighlight.id) return undefined;

        const timer = window.setTimeout(() => setHighlight({ type: null, id: null }), 4200);
        return () => window.clearTimeout(timer);
    }, [queryHighlight]);

    useEffect(() => {
        if (!recentlyOpenedId) return undefined;

        const timer = window.setTimeout(() => {
            clearRememberedNotification();
            setRecentlyOpenedId('');
        }, 4200);

        return () => window.clearTimeout(timer);
    }, [recentlyOpenedId]);

    useEffect(() => {
        if (loading || !highlightedNotificationId) return;

        const timer = window.setTimeout(() => {
            document.getElementById(`notification-row-${highlightedNotificationId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);

        return () => window.clearTimeout(timer);
    }, [loading, highlightedNotificationId]);

    const totals = useMemo(() => ({
        total: summary?.total || notifications.length,
        unread: summary?.unread || notifications.filter(item => !Number(item.isRead)).length
    }), [notifications, summary]);

    const markAsRead = async (notification) => {
        if (Number(notification.isRead)) return;
        try {
            await api.put(`/notifications/${notification.id}/read`);
            setNotifications(current => current.map(item => item.id === notification.id ? { ...item, isRead: 1 } : item));
        } catch {
            toast.error('Không thể đánh dấu đã đọc.');
        }
    };

    const openNotification = async (notification) => {
        await markAsRead(notification);
        setRecentlyOpenedId(rememberOpenedNotification(notification.id));
        navigate(resolveNotificationTarget(notification));
    };

    return (
        <div className="space-y-6">
            <Panel>
                <div className="flex flex-col gap-4 border-b border-blue-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-blue-700">Thông báo</p>
                        <h2 className="mt-1 text-2xl font-black text-blue-950">Lịch sử thông báo</h2>
                        <p className="mt-2 text-sm text-slate-500">Gom thông báo theo lịch hẹn, hóa đơn, nghỉ phép, chat và hệ thống.</p>
                    </div>
                    <button onClick={loadNotifications} className="rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-blue-50">Làm mới</button>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-4">
                    <Summary label="Tổng" value={totals.total} />
                    <Summary label="Chưa đọc" value={totals.unread} tone="rose" />
                    {summaryTypes.map((type) => {
                        const value = summary?.byType?.[type] || { unread: 0 };
                        return (
                        <Summary key={type} label={typeLabels[type] || type} value={value.unread || 0} />
                        );
                    })}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-blue-100 px-6 pt-5">
                    {quickFilterTypes.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setTypeFilter(type)}
                            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                                typeFilter === type
                                    ? 'bg-blue-700 text-white shadow-lg shadow-blue-100'
                                    : 'border border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                        >
                            {typeLabels[type]}
                        </button>
                    ))}
                </div>

                <div className="grid gap-3 px-6 py-5 md:grid-cols-[220px_1fr]">
                    <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500">
                        {Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
                    </select>
                    <label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-slate-600">
                        <input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-700" />
                        Chỉ hiện thông báo chưa đọc
                    </label>
                </div>
            </Panel>

            <Panel>
                {loading ? (
                    <div className="p-10 text-center font-bold text-slate-500">Đang tải thông báo...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-10 text-center font-bold text-slate-500">Không có thông báo phù hợp.</div>
                ) : (
                    <div className="divide-y divide-blue-50">
                        {notifications.map((notification) => (
                            <button
                                key={notification.id}
                                id={`notification-row-${notification.id}`}
                                type="button"
                                onClick={() => openNotification(notification)}
                                className={`block w-full p-5 text-left ${notificationRowHoverClass} ${Number(notification.isRead) ? 'bg-white' : 'bg-blue-50/70'} ${getHighlightClass(highlightedNotificationId === String(notification.id))}`}
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="font-black text-blue-950">{notification.title}</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${typeClasses[notification.type] || typeClasses.system}`}>
                                        {typeLabels[notification.type] || 'Thông báo'}
                                    </span>
                                </div>
                                <p className="mt-3 text-xs font-semibold text-slate-400">{notification.createdAt ? new Date(notification.createdAt).toLocaleString('vi-VN') : ''}</p>
                            </button>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    );
}

function Panel({ children }) {
    return <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100">{children}</div>;
}

function Summary({ label, value, tone = 'blue' }) {
    const className = tone === 'rose' ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800';
    return (
        <div className={`rounded-2xl p-5 ${className}`}>
            <p className="text-3xl font-black">{value}</p>
            <p className="mt-1 text-sm font-black uppercase opacity-80">{label}</p>
        </div>
    );
}
