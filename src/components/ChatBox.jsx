import { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { AuthContext } from '../context/auth-context';
import { SOCKET_URL } from '../config/env';

export default function ChatBox() {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [search, setSearch] = useState('');
    const [input, setInput] = useState('');
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const selectedPatientRef = useRef(null);

    const isStaffChat = user && ['admin', 'staff'].includes(user.role);
    const totalUnread = useMemo(
        () => contacts.reduce((sum, contact) => sum + Number(contact.unreadCount || 0), 0),
        [contacts]
    );

    const filteredContacts = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return contacts;
        return contacts.filter((contact) => {
            const text = `${contact.fullName || ''} ${contact.phone || ''} ${contact.email || ''}`.toLowerCase();
            return text.includes(keyword);
        });
    }, [contacts, search]);

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    useEffect(() => {
        selectedPatientRef.current = selectedPatient;
    }, [selectedPatient]);

    useEffect(() => {
        if (!isOpen || !user) return undefined;

        const token = localStorage.getItem('token');
        socketRef.current = io(SOCKET_URL, { auth: { token } });
        socketRef.current.on('receive_message', (data) => {
            if (isStaffChat) {
                setContacts((current) => {
                    if (!data.patientId || data.role !== 'patient') return current;
                    const exists = current.some((item) => item.id === data.patientId);

                    if (!exists) {
                        return [{ id: data.patientId, fullName: data.senderName, lastMessage: data.message, unreadCount: 1 }, ...current];
                    }

                    return current.map((item) => (
                        item.id === data.patientId
                            ? {
                                ...item,
                                lastMessage: data.message,
                                lastMessageAt: data.createdAt,
                                unreadCount: selectedPatientRef.current?.id === data.patientId ? 0 : Number(item.unreadCount || 0) + 1
                            }
                            : item
                    ));
                });

                if (selectedPatientRef.current && data.patientId === selectedPatientRef.current.id) {
                    setMessages((prev) => [...prev, data]);
                }
                return;
            }

            setMessages((prev) => [...prev, data]);
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
                    setSelectedPatient(current => current || nextContacts[0]);
                }
                return;
            }

            const res = await api.get('/chat/history');
            setMessages(res.data.data || []);
        };

        load().catch((error) => console.error('Không thể tải chat:', error));
    }, [isOpen, user, isStaffChat]);

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

    const sendMessage = (event) => {
        event.preventDefault();
        if (!input.trim() || !socketRef.current) return;
        if (isStaffChat && !selectedPatient) return;

        socketRef.current.emit('send_message', {
            message: input.trim(),
            receiverId: isStaffChat ? selectedPatient.id : undefined
        });
        setInput('');
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
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 flex h-[520px] w-[min(92vw,840px)] overflow-hidden rounded-[28px] border-2 border-blue-300 bg-white shadow-[0_24px_80px_rgba(45,55,72,0.20)] ring-4 ring-blue-100/70 [box-shadow:0_24px_80px_rgba(45,55,72,0.20),inset_0_0_0_1px_rgba(255,255,255,0.9)]">
                    {isStaffChat && (
                        <aside className="hidden w-72 border-r-2 border-blue-200 bg-[#F8FCFC] md:block">
                            <div className="border-b-2 border-blue-200 bg-white p-4">
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
                            </div>
                            <div className="h-[450px] overflow-y-auto p-2">
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
                                        <span className="mt-2 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                                            {conversationStatusLabel(contact.conversationStatus)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </aside>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between border-b-2 border-blue-200 bg-[#F8FCFC] px-5 py-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700">
                                    Trực tuyến
                                </div>
                                <h3 className="mt-2 text-lg font-black text-blue-950">{title}</h3>
                                {isStaffChat && selectedPatient && (
                                    <p className="mt-1 text-xs font-bold text-slate-500">
                                        {conversationStatusLabel(selectedPatient.conversationStatus)}{selectedPatient.assignedToName ? ` - ${selectedPatient.assignedToName}` : ''}
                                    </p>
                                )}
                                <p className="text-xs text-slate-500">
                                    {isStaffChat ? (selectedPatient?.fullName || 'Chọn khách hàng') : 'Hội thoại riêng với phòng khám'}
                                </p>
                            </div>
                            {isStaffChat && selectedPatient && (
                                <button
                                    type="button"
                                    onClick={() => updateConversationStatus(selectedPatient.conversationStatus === 'closed' ? 'open' : 'closed')}
                                    className="mr-2 rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
                                >
                                    {selectedPatient.conversationStatus === 'closed' ? 'Mở lại' : 'Đóng xử lý'}
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="grid h-10 w-10 place-items-center rounded-full border border-blue-200 bg-white text-2xl font-black text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                                aria-label="Đóng chat"
                            >
                                ×
                            </button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FCFC] p-4">
                            {isStaffChat && !selectedPatient ? (
                                <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-5 text-center text-sm font-bold text-slate-500 shadow-sm">
                                    Chọn một khách hàng để mở hội thoại.
                                </div>
                            ) : messages.map((msg, index) => {
                                const isMe = msg.senderId === user.id;
                                return (
                                    <div key={`${msg.id || index}-${index}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <span className="mb-1 text-xs font-bold text-slate-500">{isMe ? 'Bạn' : msg.senderName}</span>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? 'rounded-tr-none bg-blue-700 text-white' : 'rounded-tl-none border border-slate-200 bg-white text-slate-800'}`}>
                                            {msg.message}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={sendMessage} className="flex items-center gap-3 border-t-2 border-blue-200 bg-white p-4">
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
                    className="flex h-14 min-w-14 items-center justify-center gap-2 rounded-full border border-blue-100 bg-white px-5 text-sm font-black text-blue-700 shadow-[0_16px_40px_rgba(45,55,72,0.14)] transition hover:scale-105 hover:bg-blue-50"
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
