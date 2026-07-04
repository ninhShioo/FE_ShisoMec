import { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/auth-context';
import { SOCKET_URL } from '../config/env';

export default function ChatBox() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [search, setSearch] = useState('');
    const [conversationFilter, setConversationFilter] = useState('all');
    const [input, setInput] = useState('');
    const [assistantTyping, setAssistantTyping] = useState(false);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const selectedPatientRef = useRef(null);
    const chatOpenParams = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            shouldOpen: params.get('openChat') === '1',
            search: params.get('chatSearch') || ''
        };
    }, [location.search]);

    const isStaffChat = user && ['admin', 'staff'].includes(user.role);
    const patientSuggestions = [
        'Em đau răng khôn thì đăng ký như nào?',
        'Bác sĩ nào còn trống gần nhất?',
        'Em muốn tư vấn niềng răng',
        'Thanh toán VNPay QR như nào?',
        'Quy trình khi đến khám ra sao?'
    ];
    const totalUnread = useMemo(
        () => contacts.reduce((sum, contact) => sum + Number(contact.unreadCount || 0), 0),
        [contacts]
    );
    const contactStats = useMemo(() => ({
        all: contacts.length,
        needsStaff: contacts.filter((contact) => Number(contact.needsStaff || 0) === 1).length,
        unread: contacts.filter((contact) => Number(contact.unreadCount || 0) > 0).length,
        open: contacts.filter((contact) => ['new', 'open'].includes(contact.conversationStatus || 'new')).length
    }), [contacts]);

    const formatChatTime = (value) => {
        if (!value) return '';
        return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const parseMetadata = (metadata) => {
        if (!metadata) return {};
        if (typeof metadata === 'object') return metadata;
        try {
            return JSON.parse(metadata);
        } catch (error) {
            return {};
        }
    };

    const filteredContacts = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return contacts.filter((contact) => {
            if (conversationFilter === 'needsStaff' && Number(contact.needsStaff || 0) !== 1) return false;
            if (conversationFilter === 'unread' && Number(contact.unreadCount || 0) <= 0) return false;
            if (conversationFilter === 'open' && !['new', 'open'].includes(contact.conversationStatus || 'new')) return false;
            if (!keyword) return true;

            const text = `${contact.fullName || ''} ${contact.phone || ''} ${contact.email || ''}`.toLowerCase();
            return text.includes(keyword);
        });
    }, [contacts, conversationFilter, search]);

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen, assistantTyping]);

    useEffect(() => {
        selectedPatientRef.current = selectedPatient;
    }, [selectedPatient]);

    useEffect(() => {
        if (!user || !chatOpenParams.shouldOpen) return;

        setIsOpen(true);
        if (isStaffChat && chatOpenParams.search) {
            setSearch(chatOpenParams.search);
        }
    }, [chatOpenParams, isStaffChat, user]);

    useEffect(() => {
        if (!isStaffChat || !chatOpenParams.shouldOpen || !chatOpenParams.search || contacts.length === 0) return;

        const keyword = chatOpenParams.search.trim().toLowerCase();
        const matchedContact = contacts.find((contact) => (
            `${contact.fullName || ''} ${contact.phone || ''} ${contact.email || ''}`.toLowerCase().includes(keyword)
        ));

        if (matchedContact && selectedPatient?.id !== matchedContact.id) {
            setSelectedPatient(matchedContact);
        }
    }, [chatOpenParams, contacts, isStaffChat, selectedPatient?.id]);

    useEffect(() => {
        if (!isOpen || !user) return undefined;

        const token = localStorage.getItem('token');
        socketRef.current = io(SOCKET_URL, { auth: { token } });
        socketRef.current.on('receive_message', (data) => {
            if (isStaffChat) {
                setContacts((current) => {
                    if (!data.patientId) return current;
                    const exists = current.some((item) => item.id === data.patientId);
                    const shouldCountUnread = data.role === 'patient';

                    if (!exists) {
                        return [{
                            id: data.patientId,
                            fullName: data.senderName,
                            lastMessage: data.message,
                            unreadCount: shouldCountUnread ? 1 : 0,
                            needsStaff: data.needsStaff ? 1 : 0,
                            priorityReason: data.priorityReason || ''
                        }, ...current];
                    }

                    return current.map((item) => (
                        item.id === data.patientId
                            ? {
                                ...item,
                                lastMessage: data.message,
                                lastMessageAt: data.createdAt,
                                needsStaff: data.needsStaff ? 1 : item.needsStaff,
                                priorityReason: data.priorityReason || item.priorityReason,
                                unreadCount: selectedPatientRef.current?.id === data.patientId
                                    ? 0
                                    : !shouldCountUnread
                                        ? Number(item.unreadCount || 0)
                                        : Number(item.unreadCount || 0) + 1
                            }
                            : item
                    ));
                });

                if (selectedPatientRef.current && data.patientId === selectedPatientRef.current.id) {
                    if (data.needsStaff) {
                        setSelectedPatient((current) => current ? {
                            ...current,
                            needsStaff: 1,
                            priorityReason: data.priorityReason || current.priorityReason
                        } : current);
                    }
                    setMessages((prev) => [...prev, data]);
                }
                return;
            }

            if (data.role === 'assistant' || Number(data.isAssistant || 0) === 1) {
                setAssistantTyping(false);
            }
            setMessages((prev) => [...prev, data]);
        });
        socketRef.current.on('assistant_typing', (data) => {
            setAssistantTyping(Boolean(data?.typing));
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [isOpen, user, isStaffChat]);

    useEffect(() => {
        if (!isOpen || !user) return;

        const load = async () => {
            if (isStaffChat) {
                const res = await api.get('/chat/contacts');
                const nextContacts = res.data.data || [];
                setContacts(nextContacts);
                if (nextContacts.length) {
                    setSelectedPatient(current => {
                        if (current) return current;

                        const keyword = chatOpenParams.search.trim().toLowerCase();
                        if (keyword) {
                            const matchedContact = nextContacts.find((contact) => (
                                `${contact.fullName || ''} ${contact.phone || ''} ${contact.email || ''}`.toLowerCase().includes(keyword)
                            ));
                            if (matchedContact) return matchedContact;
                        }

                        return nextContacts[0];
                    });
                }
                return;
            }

            const res = await api.get('/chat/history');
            setMessages(res.data.data || []);
        };

        load().catch((error) => console.error('Không thể tải chat:', error));
    }, [isOpen, user, isStaffChat, chatOpenParams.search]);

    useEffect(() => {
        if (!isOpen || !selectedPatient || !isStaffChat) return;

        api.get('/chat/history', { params: { patientId: selectedPatient.id } })
            .then((res) => {
                setMessages(res.data.data || []);
                setContacts((current) => current.map((item) => (
                    item.id === selectedPatient.id ? { ...item, unreadCount: 0 } : item
                )));
            })
            .catch((error) => console.error('Không thể tải hội thoại:', error));
    }, [isOpen, selectedPatient, isStaffChat]);

    const emitMessage = (message) => {
        const content = String(message || '').trim();
        if (!content || !socketRef.current) return;
        if (isStaffChat && !selectedPatient) return;

        socketRef.current.emit('send_message', {
            message: content,
            receiverId: isStaffChat ? selectedPatient.id : undefined
        });
        if (!isStaffChat) {
            setAssistantTyping(true);
        }
    };

    const sendMessage = (event) => {
        event.preventDefault();
        if (!input.trim()) return;

        emitMessage(input);
        setInput('');
    };

    const handleQuickAction = (action) => {
        if (!action) return;

        if (action.type === 'route' && action.value) {
            navigate(action.value);
            setIsOpen(false);
            return;
        }

        if (action.type === 'url' && action.value) {
            window.open(action.value, '_blank', 'noopener,noreferrer');
            return;
        }

        if (action.type === 'message' && action.value) {
            emitMessage(action.value);
        }
    };

    const closeChat = () => {
        setIsOpen(false);
        const params = new URLSearchParams(location.search);
        if (!params.has('openChat')) return;

        params.delete('openChat');
        params.delete('chatSearch');
        const nextSearch = params.toString();
        navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
    };

    const updateConversationStatus = async (status) => {
        if (!selectedPatient) return;

        try {
            await api.put(`/chat/conversations/${selectedPatient.id}`, { status });
            const nextPatient = { ...selectedPatient, conversationStatus: status, assignedTo: user.id, assignedToName: user.fullName };
            setSelectedPatient(nextPatient);
            setContacts((current) => current.map((contact) => (
                contact.id === selectedPatient.id ? nextPatient : contact
            )));
        } catch (error) {
            console.error('Không thể cập nhật hội thoại:', error);
        }
    };

    const conversationStatusLabel = (status) => ({
        new: 'Mới',
        open: 'Đang xử lý',
        closed: 'Đã đóng'
    }[status] || 'Mới');

    if (!user) return null;

    const title = isStaffChat ? 'Hộp chat khách hàng' : 'Hỗ trợ trực tuyến';

    return (
        <div className="fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end sm:left-auto sm:right-6 sm:bottom-6">
            {isOpen && (
                <div className="mb-4 flex h-[min(78vh,640px)] min-h-[500px] w-full overflow-hidden rounded-[28px] border-2 border-blue-200 bg-white shadow-[0_24px_80px_rgba(45,55,72,0.20)] ring-4 ring-blue-100/70 sm:w-[min(calc(100vw-3rem),940px)] [box-shadow:0_24px_80px_rgba(45,55,72,0.20),inset_0_0_0_1px_rgba(255,255,255,0.9)]">
                    {isStaffChat && (
                        <aside className="hidden h-full w-80 shrink-0 flex-col border-r-2 border-blue-100 bg-[#F8FCFC] md:flex">
                            <div className="shrink-0 border-b-2 border-blue-100 bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-black text-blue-950">Khách hàng</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{contacts.length} hội thoại</p>
                                    </div>
                                    {totalUnread > 0 && (
                                        <span className="rounded-full bg-rose-600 px-2 py-1 text-xs font-black text-white">{totalUnread}</span>
                                    )}
                                </div>
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Tìm khách..."
                                    className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                />
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {[
                                        ['all', 'Tất cả', contactStats.all],
                                        ['needsStaff', 'Cần xử lý', contactStats.needsStaff],
                                        ['unread', 'Chưa đọc', contactStats.unread],
                                        ['open', 'Đang mở', contactStats.open]
                                    ].map(([key, label, count]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setConversationFilter(key)}
                                            className={`rounded-xl px-3 py-2 text-left text-[11px] font-black transition ${
                                                conversationFilter === key
                                                    ? 'bg-blue-700 text-white shadow-sm shadow-blue-100'
                                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                            }`}
                                        >
                                            {label}: {count}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                                {filteredContacts.length === 0 ? (
                                    <p className="p-3 text-sm font-semibold text-slate-500">{contacts.length ? 'Không tìm thấy khách phù hợp.' : 'Chưa có hội thoại.'}</p>
                                ) : filteredContacts.map((contact) => (
                                    <button
                                        key={contact.id}
                                        type="button"
                                        onClick={() => setSelectedPatient(contact)}
                                        className={`mb-2 w-full rounded-xl p-3 text-left text-sm transition ${selectedPatient?.id === contact.id ? 'bg-blue-700 text-white' : 'bg-white text-slate-700 hover:bg-blue-50'}`}
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="min-w-0 truncate font-black">{contact.fullName}</span>
                                            {Number(contact.unreadCount || 0) > 0 && (
                                                <span className="grid min-h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                                                    {Number(contact.unreadCount) > 9 ? '9+' : contact.unreadCount}
                                                </span>
                                            )}
                                        </span>
                                        <span className="mt-1 block truncate text-xs opacity-75">{contact.lastMessage || contact.phone || contact.email}</span>
                                        <span className="mt-2 flex flex-wrap items-center gap-1">
                                            <span className="inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                                                {conversationStatusLabel(contact.conversationStatus)}
                                            </span>
                                            {Number(contact.needsStaff || 0) === 1 && (
                                                <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700">
                                                    Cần xử lý
                                                </span>
                                            )}
                                            {contact.lastMessageAt && (
                                                <span className="ml-auto text-[10px] font-bold opacity-70">{formatChatTime(contact.lastMessageAt)}</span>
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </aside>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col">
                        <div className="shrink-0 border-b-2 border-blue-100 bg-[#F8FCFC] px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700">
                                        Trực tuyến
                                    </div>
                                    <h3 className="mt-2 truncate text-lg font-black leading-6 text-blue-950">{title}</h3>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {isStaffChat && selectedPatient && (
                                        <button
                                            type="button"
                                            onClick={() => updateConversationStatus(selectedPatient.conversationStatus === 'closed' ? 'open' : 'closed')}
                                            className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
                                        >
                                            {selectedPatient.conversationStatus === 'closed' ? 'Mở lại' : 'Đóng xử lý'}
                                        </button>
                                    )}
                                    <button
                                        onClick={closeChat}
                                        className="grid h-10 w-10 place-items-center rounded-full border border-blue-200 bg-white text-2xl font-black text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                                        aria-label="Đóng chat"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2 min-w-0">
                                {isStaffChat && contacts.length > 0 && (
                                    <select
                                        value={selectedPatient?.id || ''}
                                        onChange={(event) => {
                                            const nextPatient = contacts.find((contact) => String(contact.id) === event.target.value);
                                            if (nextPatient) setSelectedPatient(nextPatient);
                                        }}
                                        className="mb-2 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-950 outline-none focus:border-blue-400 md:hidden"
                                    >
                                        {contacts.map((contact) => (
                                            <option key={contact.id} value={contact.id}>
                                                {contact.fullName} {Number(contact.unreadCount || 0) > 0 ? `(${contact.unreadCount})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {isStaffChat && selectedPatient && (
                                    <>
                                    <p className="text-xs font-bold text-slate-500">
                                        {conversationStatusLabel(selectedPatient.conversationStatus)}{selectedPatient.assignedToName ? ` - ${selectedPatient.assignedToName}` : ''}
                                    </p>
                                    {Number(selectedPatient.needsStaff || 0) === 1 && (
                                        <p className="mt-1 max-w-2xl text-xs font-black leading-5 text-rose-600">
                                            Cần xử lý: {selectedPatient.priorityReason || 'Khách cần nhân viên hỗ trợ'}
                                        </p>
                                    )}
                                    </>
                                )}
                                <p className="text-xs text-slate-500">
                                    {isStaffChat ? (selectedPatient?.fullName || 'Chọn khách hàng') : 'Hội thoại riêng với phòng khám'}
                                </p>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#F8FCFC] p-4">
                            {isStaffChat && !selectedPatient ? (
                                <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-5 text-center text-sm font-bold text-slate-500 shadow-sm">
                                    Chọn một khách hàng để mở hội thoại.
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-5 text-center text-sm font-bold text-slate-500 shadow-sm">
                                    Chưa có tin nhắn trong hội thoại này.
                                </div>
                            ) : messages.map((msg, index) => {
                                const isAssistant = msg.role === 'assistant' || Number(msg.isAssistant || 0) === 1;
                                const isMe = !isAssistant && msg.senderId === user.id;
                                const metadata = parseMetadata(msg.metadata);
                                const quickActions = Array.isArray(metadata.quickActions) ? metadata.quickActions : [];
                                return (
                                    <div key={`${msg.id || index}-${index}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <span className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                                            <span>{isMe ? 'Bạn' : msg.senderName}</span>
                                            {msg.createdAt && <span className="font-semibold text-slate-400">{formatChatTime(msg.createdAt)}</span>}
                                        </span>
                                        <div className={`max-w-[min(86%,620px)] whitespace-pre-line rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${isMe ? 'rounded-tr-none bg-blue-700 text-white' : isAssistant ? 'rounded-tl-none border border-teal-200 bg-teal-50 text-slate-800' : 'rounded-tl-none border border-slate-200 bg-white text-slate-800'}`}>
                                            {msg.message}
                                        </div>
                                        {isAssistant && quickActions.length > 0 && (
                                            <div className="mt-2 flex max-w-[min(86%,620px)] flex-wrap gap-2">
                                                {quickActions.map((item, actionIndex) => (
                                                    <button
                                                        key={`${msg.id || index}-action-${actionIndex}`}
                                                        type="button"
                                                        onClick={() => handleQuickAction(item)}
                                                        className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-black text-teal-700 shadow-sm transition hover:bg-teal-50"
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {assistantTyping && !isStaffChat && (
                                <div className="flex flex-col items-start">
                                    <span className="mb-1 text-xs font-bold text-slate-500">Trợ lý Phenikaa Dental</span>
                                    <div className="rounded-2xl rounded-tl-none border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-700 shadow-sm">
                                        Đang trả lời...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {!isStaffChat && (
                            <div className="flex gap-2 overflow-x-auto border-t-2 border-blue-100 bg-white px-4 py-3">
                                {patientSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => emitMessage(suggestion)}
                                        className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 transition hover:bg-teal-100"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={sendMessage} className="shrink-0 flex items-center gap-3 border-t-2 border-blue-100 bg-white p-4">
                            <input
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                disabled={isStaffChat && !selectedPatient}
                                placeholder="Nhập tin nhắn..."
                                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || (isStaffChat && !selectedPatient)}
                                className="rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-800 disabled:opacity-50"
                            >
                                Gửi
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative flex h-14 min-w-14 items-center justify-center gap-2 rounded-full border border-blue-100 bg-white px-5 text-sm font-black text-blue-700 shadow-[0_16px_40px_rgba(45,55,72,0.14)] transition hover:scale-105 hover:bg-blue-50"
                    aria-label="Mở chat hỗ trợ"
                >
                    Chat
                    {isStaffChat && totalUnread > 0 && (
                        <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                            {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}
