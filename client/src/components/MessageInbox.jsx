import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useTicketSocket } from '../hooks/useSocket';

const PRIMARY = '#3781EE';

export default function MessageInbox() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [unread, setUnread] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  // Only show for logged-in non-admin users
  if (!user || user.role === 'admin') return null;

  // Real-time: receive new messages via WebSocket
  useTicketSocket(selectedTicket?.id, (msg) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    fetchTickets(); // refresh unread badge
  });

  // Poll tickets every 30s for unread count updates
  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll messages when a ticket is selected
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (selectedTicket && selectedTicket.status === 'open') {
      pollRef.current = setInterval(() => fetchMessages(selectedTicket.id), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedTicket]);

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
    await fetchMessages(ticket.id);
    setLoadingMsgs(false);
  }

  async function fetchMessages(ticketId) {
    try {
      const res = await api.get(`/support-tickets/${ticketId}/messages`);
      setMessages(res.data.messages || []);
    } catch {}
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/support-tickets/${selectedTicket.id}/messages`, { body: replyBody.trim() });
      setMessages(prev => [...prev, res.data.message]);
      setReplyBody('');
      fetchTickets(); // refresh unread count
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
    <div className="relative" ref={panelRef}>
      {/* Bell/message icon button */}
      <button
        onClick={() => { setOpen(v => !v); setSelectedTicket(null); }}
        className="relative text-gray-300 hover:text-white transition-colors p-1.5"
        title="Support Messages"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unread > 0 && (
          <span
            style={{ backgroundColor: '#ef4444' }}
            className="absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden" style={{ maxHeight: '480px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            {selectedTicket ? (
              <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {selectedTicket.product_title}
              </button>
            ) : (
              <p className="text-sm font-semibold text-gray-800">Support Messages</p>
            )}
            <Link to="/support" onClick={() => setOpen(false)} className="text-xs font-medium hover:underline" style={{ color: PRIMARY }}>
              View all
            </Link>
          </div>

          {/* Ticket list */}
          {!selectedTicket && (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {tickets.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No support tickets yet.</div>
              ) : tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {parseInt(ticket.unread_count) > 0
                      ? <span className="w-2 h-2 rounded-full block" style={{ backgroundColor: PRIMARY }} />
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
                    <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ticket.status === 'open' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
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
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: '300px' }}>
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">No messages yet.</p>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.sender_role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                      style={msg.sender_role === 'user'
                        ? { backgroundColor: PRIMARY, color: '#fff' }
                        : { backgroundColor: '#f3f4f6', color: '#1f2937' }
                      }
                    >
                      {msg.body}
                    </div>
                    <p className="text-[10px] text-gray-400 px-1">
                      {msg.sender_role === 'admin' ? 'Support' : 'You'} · {formatTime(msg.created_at)}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              {selectedTicket.status === 'open' ? (
                <form onSubmit={handleSend} className="px-3 py-2 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder="Type a reply…"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1"
                    style={{ '--tw-ring-color': PRIMARY }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyBody.trim()}
                    style={{ backgroundColor: PRIMARY }}
                    className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
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
    </div>
  );
}
