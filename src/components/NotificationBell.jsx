import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { SOCKET_URL } from '../config/env';
import { AuthContext } from '../context/auth-context';
import {
    clearRememberedNotification,
    getHighlightClass,
    getRememberedNotificationId,
    notificationRowHoverClass,
    rememberOpenedNotification,
    resolveNotificationTarget
} from '../utils/notificationNavigation';

const typeLabels = {
    appointment: 'Lịch hẹn',
    payment: 'Hóa đơn',
    chat: 'Chat',
    leave: 'Nghỉ phép',
    system: 'Hệ thống'
};

const typeClasses = {
    appointment: 'bg-blue-50 text-blue-700',
    payment: 'bg-emerald-50 text-emerald-700',
    chat: 'bg-cyan-50 text-cyan-700',
    leave: 'bg-amber-50 text-amber-700',
    system: 'bg-slate-100 text-slate-700'
};

const visibleTypesByRole = {
    patient: ['appointment', 'payment', 'chat'],
    dentist: ['appointment', 'chat', 'leave', 'system'],
    staff: ['appointment', 'payment', 'chat', 'leave', 'system'],
    admin: ['appointment', 'payment', 'chat', 'leave', 'system']
};

const getVisibleTypes = (role) => visibleTypesByRole[role] || ['appointment', 'payment', 'chat'];

export default function NotificationBell() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recentlyOpenedId, setRecentlyOpenedId] = useState(() => getRememberedNotificationId());
    const [typeFilter, setTypeFilter] = useState('all');
    const dropdownRef = useRef(null);

    const visibleTypes = useMemo(() => getVisibleTypes(user?.role), [user?.role]);
    const visibleTypeEntries = useMemo(
        () => visibleTypes.map((type) => [type, typeLabels[type]]),
        [visibleTypes]
    );
    const visibleNotifications = useMemo(
        () => notifications.filter((item) => visibleTypes.includes(item.type || 'system')),
        [notifications, visibleTypes]
    );
    const filteredNotifications = useMemo(
        () => visibleNotifications.filter((item) => typeFilter === 'all' || (item.type || 'system') === typeFilter),
        [visibleNotifications, typeFilter]
    );
    const unreadCount = useMemo(
        () => visibleNotifications.filter((item) => !Number(item.isRead)).length,
        [visibleNotifications]
    );

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const res = await api.get('/notifications');
            setNotifications(res.data.data || []);
            setSummary(res.data.summary || null);
        } catch {
            toast.error('Không thể tải thông báo.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();

        const token = localStorage.getItem('token');
        const socket = io(SOCKET_URL, { auth: { token } });
        const handleNotification = (notification) => {
            if (!visibleTypes.includes(notification.type || 'system')) return;

            setNotifications((current) => [
                { ...notification, isRead: 0, id: notification.id || `live-${Date.now()}` },
                ...current
            ].slice(0, 50));
            toast(notification.message || notification.title || 'Bạn có thông báo mới.');
        };

        socket.on('notification:new', handleNotification);
        socket.on('notification:role', handleNotification);

        return () => socket.disconnect();
    }, [visibleTypes]);

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, []);

    useEffect(() => {
        if (!recentlyOpenedId) return undefined;

        const timer = window.setTimeout(() => {
            clearRememberedNotification();
            setRecentlyOpenedId('');
        }, 4200);

        return () => window.clearTimeout(timer);
    }, [recentlyOpenedId]);

    useEffect(() => {
        if (!visibleTypes.includes(typeFilter) && typeFilter !== 'all') {
            setTypeFilter('all');
        }
    }, [typeFilter, visibleTypes]);

    const markAsRead = async (notification) => {
        if (!notification.id || String(notification.id).startsWith('live-') || Number(notification.isRead)) return;

        try {
            await api.put(`/notifications/${notification.id}/read`);
            setNotifications((current) => current.map((item) => (
                item.id === notification.id ? { ...item, isRead: 1 } : item
            )));
        } catch {
            toast.error('Không thể đánh dấu thông báo.');
        }
    };

    const openNotification = async (notification) => {
        await markAsRead(notification);
        setRecentlyOpenedId(rememberOpenedNotification(notification.id));
        setOpen(false);
        navigate(resolveNotificationTarget(notification, user?.role));
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications((current) => current.map((item) => ({ ...item, isRead: 1 })));
        } catch {
            toast.error('Không thể đánh dấu tất cả.');
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => {
                    setRecentlyOpenedId(getRememberedNotificationId());
                    setOpen((value) => !value);
                }}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-blue-100 bg-white text-sm font-black text-blue-700 hover:bg-blue-50"
                aria-label="Thông báo"
            >
                TB
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-3 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-100">
                    <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
                        <div>
                            <p className="font-black text-blue-950">Thông báo</p>
                            <p className="text-xs font-semibold text-slate-500">{unreadCount} chưa đọc</p>
                        </div>
                        <button type="button" onClick={markAllAsRead} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
                            Đọc hết
                        </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {summary?.byType && (
                            <div className="grid grid-cols-2 gap-2 border-b border-blue-50 p-3">
                                <button
                                    type="button"
                                    onClick={() => setTypeFilter('all')}
                                    className={`rounded-xl px-3 py-2 text-left text-xs font-black transition ${
                                        typeFilter === 'all'
                                            ? 'bg-blue-700 text-white shadow-sm shadow-blue-100'
                                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    }`}
                                >
                                    Tất cả: {unreadCount}
                                </button>
                                {visibleTypeEntries.map(([type, label]) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setTypeFilter((current) => current === type ? 'all' : type)}
                                        className={`rounded-xl px-3 py-2 text-left text-xs font-black transition ${
                                            typeFilter === type
                                                ? 'bg-blue-700 text-white shadow-sm shadow-blue-100'
                                                : `${typeClasses[type] || typeClasses.system} hover:ring-2 hover:ring-[#7FD8BE] hover:ring-inset`
                                        }`}
                                    >
                                        {label}: {summary.byType[type]?.unread || 0}
                                    </button>
                                ))}
                            </div>
                        )}
                        {loading ? (
                            <div className="p-5 text-sm font-bold text-slate-500">Đang tải thông báo...</div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-5 text-sm font-bold text-slate-500">
                                {typeFilter === 'all' ? 'Chưa có thông báo.' : `Không có thông báo ${typeLabels[typeFilter]?.toLowerCase() || ''}.`}
                            </div>
                        ) : filteredNotifications.map((notification) => (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() => openNotification(notification)}
                                className={`block w-full border-b border-blue-50 px-4 py-3 text-left last:border-b-0 ${notificationRowHoverClass} ${Number(notification.isRead) ? 'bg-white' : 'bg-blue-50/60'} ${getHighlightClass(recentlyOpenedId === String(notification.id))}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-blue-950">{notification.title}</p>
                                        <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                                    </div>
                                    {!Number(notification.isRead) && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-700" />}
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className={`rounded-full px-2 py-1 text-[11px] font-black ${typeClasses[notification.type] || typeClasses.system}`}>
                                        {typeLabels[notification.type] || 'Thông báo'}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-400">
                                        {notification.createdAt ? new Date(notification.createdAt).toLocaleString('vi-VN') : ''}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
