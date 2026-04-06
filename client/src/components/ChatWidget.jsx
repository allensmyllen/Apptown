import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useTicketSocket, emitTyping } from '../hooks/useSocket';
import { playNotificationSound } from '../hooks/useNotificationSound';
import { MessageBubble, TypingIndicator } from './MessageBubble';

const PRIMARY = '#3781EE';

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [unread, setUnread] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [typingRole, setTypingRole] = useState(null);
  const typingTimeout = useRef(null);
  const bottomRef = useRef(null);

  // Only for logged-in non-admin users
  if (!user || user.role === 'admin') return null;

  // Real-time messages via WebSocket
  useTicketSocket(selectedTicket?.id, (msg) => {
    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    setTypingRole(null);
    fetchTickets();
    if (msg.sender_role === 'admin') {
      playNotificationSound();
    }
  }, ({ role }) => {
    setTypingRole(role);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTypingRole(null), 3000);
  });

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchTickets() {
    try {
      const res = await api.get('/support-tickets');
      const list = res.data.tickets || [];
      setTickets(list);
      setUnread(list.reduce((sum, t) => sum + (parseInt(t.unread_count) || 0), 0));
    } catch {}
  }

  async function openTicket(ticket) {
    setSelectedTicket(ticket);
    setReplyBody('');
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/support-tickets/${ticket.id}/messages`);
      setMessages(res.data.messages || []);
    } catch { setMessages([]); }
    finally { setLoadingMsgs(false); }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await api.post(`/support-tickets/${selectedTicket.id}/messages`, { body: replyBody.trim() });
      // Don't add to state here — socket broadcasts new_message to all room members including sender
      setReplyBody('');
      fetchTickets();
    } catch {}
    finally { setSending(false); }
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden"
          style={{ height: '600px', width: '400px' }}
        >
          {/* Header */}
          <div style={{ backgroundColor: PRIMARY }} className="px-4 py-3 flex items-center justify-between">
            {selectedTicket ? (
              <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-white text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {selectedTicket.product_title}
              </button>
            ) : (
              <p className="text-white text-sm font-semibold">Support Chat</p>
            )}
            <div className="flex items-center gap-2">
              <Link to="/support?tab=helpcenter" onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-xs">
                View all
              </Link>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Ticket list */}
          {!selectedTicket && (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {tickets.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm text-gray-400">No support tickets yet.</p>
                  <Link to="/support?tab=helpcenter" onClick={() => setOpen(false)}
                    style={{ backgroundColor: PRIMARY }}
                    className="inline-block text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                    Open Help Center
                  </Link>
                </div>
              ) : tickets.map(ticket => (
                <button key={ticket.id} onClick={() => openTicket(ticket)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3">
                  <div className="mt-1.5 shrink-0">
                    {parseInt(ticket.unread_count) > 0
                      ? <span className="w-2 h-2 rounded-full block bg-red-500" />
                      : <span className="w-2 h-2 rounded-full block bg-gray-200" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${parseInt(ticket.unread_count) > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {ticket.product_title}
                      </p>
                      <span className="text-[11px] text-gray-400 shrink-0">{formatTime(ticket.created_at)}</span>
                    </div>
                    {ticket.latest_message && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{ticket.latest_message}</p>
                    )}
                    <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ticket.status === 'open' ? 'bg-blue-50' : 'bg-gray-100 text-gray-400'}`}
                      style={ticket.status === 'open' ? { color: PRIMARY } : {}}>
                      {ticket.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Chat thread */}
          {selectedTicket && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: '460px' }}>
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">No messages yet.</p>
                ) : messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} formatTime={formatTime} />
                ))}
                <TypingIndicator role={typingRole === 'admin' ? 'admin' : null} />
                <div ref={bottomRef} />
              </div>

              {selectedTicket.status === 'open' ? (
                <form onSubmit={handleSend} className="px-3 py-2 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={replyBody}
                    onChange={e => { setReplyBody(e.target.value); if (selectedTicket) emitTyping(selectedTicket.id, 'user'); }}
                    placeholder="Type a message…"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  />
                  <button type="submit" disabled={sending || !replyBody.trim()}
                    style={{ backgroundColor: PRIMARY }}
                    className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {sending ? '…' : 'Send'}
                  </button>
                </form>
              ) : (
                <p className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">This ticket is closed.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(v => !v); setSelectedTicket(null); }}
        style={{ backgroundColor: PRIMARY }}
        className="fixed bottom-8 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity z-50"
        title="Support Chat"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </>
  );
}
