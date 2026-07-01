const getText = (notification) => `${notification?.title || ''} ${notification?.message || ''}`;
const recentlyOpenedNotificationKey = 'recentlyOpenedNotificationId';
const recentlyOpenedNotificationTtlMs = 4200;

const findAppointmentId = (notification) => {
    const text = getText(notification);
    const match = text.match(/(?:lịch hẹn|lich hen|appointment)\s*#?(\d+)/i) || text.match(/#(\d+)/);
    return match ? match[1] : '';
};

const findInvoiceId = (notification) => {
    const text = getText(notification);
    const match = text.match(/INV-?(\d+)/i)
        || text.match(/(?:hóa đơn|hoa don|invoice)\s*#?(\d+)/i)
        || text.match(/#(\d+)/);
    return match ? match[1] : '';
};

export const resolveNotificationTarget = (notification, userRole) => {
    const type = notification?.type || 'system';
    const isPatient = userRole === 'patient';

    if (type === 'appointment') {
        const appointmentId = findAppointmentId(notification);
        return isPatient
            ? `/profile?tab=appointments${appointmentId ? `&highlightType=appointment&highlightId=${appointmentId}` : ''}`
            : `/dashboard?tab=appointments${appointmentId ? `&highlightType=appointment&highlightId=${appointmentId}` : ''}`;
    }

    if (type === 'payment') {
        const invoiceId = findInvoiceId(notification);
        return isPatient
            ? `/profile?tab=invoices${invoiceId ? `&highlightType=invoice&highlightId=${invoiceId}` : ''}`
            : `/dashboard?tab=invoices${invoiceId ? `&highlightType=invoice&highlightId=${invoiceId}` : ''}`;
    }

    if (type === 'leave') {
        return userRole === 'dentist' ? '/dashboard?tab=dayOff' : '/dashboard?tab=schedules';
    }

    if (type === 'system') {
        return isPatient
            ? '/profile'
            : `/dashboard?tab=notifications&highlightType=notification&highlightId=${notification?.id || ''}`;
    }

    if (type === 'chat') {
        return isPatient ? '/profile' : '/dashboard?tab=appointments';
    }

    return isPatient ? '/profile' : '/dashboard';
};

export const getHighlightClass = (isHighlighted) => (
    isHighlighted
        ? 'bg-[#FFF8F0] ring-2 ring-[#7FD8BE] ring-inset shadow-[0_0_0_4px_rgba(127,216,190,0.16)] transition'
        : ''
);

export const notificationRowHoverClass = 'transition hover:bg-[#F8FCFC] hover:ring-2 hover:ring-[#7FD8BE] hover:ring-inset hover:shadow-[0_0_0_4px_rgba(127,216,190,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FD8BE]';

export const rememberOpenedNotification = (notificationId) => {
    if (!notificationId || String(notificationId).startsWith('live-')) return '';

    const nextId = String(notificationId);
    try {
        window.sessionStorage.setItem(recentlyOpenedNotificationKey, JSON.stringify({
            id: nextId,
            expiresAt: Date.now() + recentlyOpenedNotificationTtlMs
        }));
    } catch {
        // Ignore storage errors, navigation should still work.
    }

    return nextId;
};

export const getRememberedNotificationId = () => {
    try {
        const raw = window.sessionStorage.getItem(recentlyOpenedNotificationKey);
        if (!raw) return '';

        const parsed = JSON.parse(raw);
        if (!parsed?.id || Number(parsed.expiresAt || 0) < Date.now()) {
            window.sessionStorage.removeItem(recentlyOpenedNotificationKey);
            return '';
        }

        return parsed.id;
    } catch {
        return '';
    }
};

export const clearRememberedNotification = () => {
    try {
        window.sessionStorage.removeItem(recentlyOpenedNotificationKey);
    } catch {
        // Ignore storage errors.
    }
};
