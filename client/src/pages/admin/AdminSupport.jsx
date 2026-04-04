import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';
import { AdminTable, Td, Badge } from '../../components/AdminTable';

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
];

function FileAttachment({ url }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  return isImage ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1">
      <img src={url} alt="attachment" className="max-w-[200px] rounded-lg border border-gray-200" />
    </a>
  ) : (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-1 text-xs text-blue-600 hover:underline bg-blue-50 border border-blue-100 rounded px-2 py-1">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      View attachment
    </a>
  );
}

function TicketModal({ ticket, onClose, onTicketClosed }) {
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [msgInput, setMsgInput] = useState('');
  const [attachFile, setAttachFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(ticket.status);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchMessages(); }, [ticket.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function fetchMessages() {
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/support-tickets/${ticket.id}/messages`);
      setMessages(res.data.messages || []);
    } catch { setMessages([]); }
    finally { setLoadingMsgs(false); }
  }

  async function handleSend() {
    if (!msgInput.trim() && !attachFile) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('body', msgInput.trim());
      if (attachFile) formData.append('file', attachFile);
      const res = await api.post(`/admin/support-tickets/${ticket.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages(prev => [...prev, res.data.message]);
      setMsgInput('');
      setAttachFile(null);
    } catch { /* silently fail */ }
    finally { setSending(false); }
  }

  async function handleCloseTicket() {
    setClosing(true);
    try {
      await api.patch(`/admin/support-tickets/${ticket.id}/close`);
      setTicketStatus('closed');
      onTicketClosed?.(ticket.id);
    } catch { }
    finally { setClosing(false); }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{ticket.product_name}</p>
              <p className="text-xs text-gray-400 truncate">{ticket.user_email} · #{ticket.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge status={ticketStatus} />
            {ticketStatus === 'open' && (
              <button onClick={handleCloseTicket} disabled={closing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50">
                {closing ? 'Closing…' : 'Close Ticket'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loadingMsgs ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No messages yet.</p>
          ) : messages.map(msg => (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.sender_role === 'admin' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.sender_role === 'admin' ? 'bg-green-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.body && <p>{msg.body}</p>}
                <FileAttachment url={msg.file_url} />
              </div>
              <p className="text-[11px] text-gray-400 px-1">{msg.sender_name} · {formatTime(msg.created_at)}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {ticketStatus === 'open' ? (
          <div className="px-4 py-3 border-t border-gray-100 space-y-2">
            {attachFile && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-xs text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="flex-1 truncate">{attachFile.name}</span>
                <button onClick={() => setAttachFile(null)} className="text-blue-400 hover:text-blue-600">✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={msgInput} onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a reply…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => setAttachFile(e.target.files[0] || null)} />
              <button onClick={() => fileInputRef.current?.click()}
                className="border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors" title="Attach file">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <button onClick={handleSend} disabled={sending || (!msgInput.trim() && !attachFile)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-gray-100 text-center text-sm text-gray-400">
            This ticket is closed.
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => { fetchTickets(); }, [statusFilter]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await api.get('/admin/support-tickets', { params });
      setTickets(res.data.tickets || []);
    } catch { setTickets([]); }
    finally { setLoading(false); }
  }

  function handleTicketClosed(ticketId) {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t));
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Support Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setSelectedTicket(null); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.value ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <AdminTable cols={['Ticket ID', 'License Key', 'Product', 'User Email', 'Date', 'Status']} loading={loading} empty="No tickets found.">
        {tickets.map(ticket => (
          <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)}
            className="cursor-pointer hover:bg-gray-50 transition-colors">
            <Td mono className="text-gray-400 text-xs">{ticket.id.slice(0, 8)}…</Td>
            <Td mono className="text-gray-500 text-xs max-w-[160px]"><span className="truncate block">{ticket.license_key || '—'}</span></Td>
            <Td className="font-medium text-gray-800 max-w-[180px]"><span className="line-clamp-1">{ticket.product_name}</span></Td>
            <Td className="text-gray-600 text-xs max-w-[180px] truncate">{ticket.user_email}</Td>
            <Td className="text-gray-400 text-xs whitespace-nowrap">{formatDate(ticket.created_at)}</Td>
            <Td right><Badge status={ticket.status} /></Td>
          </tr>
        ))}
      </AdminTable>

      {selectedTicket && (
        <TicketModal
          key={selectedTicket.id}
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketClosed={handleTicketClosed}
        />
      )}
    </AdminLayout>
  );
}
