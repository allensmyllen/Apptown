import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useTicketSocket } from '../hooks/useSocket';
import { playNotificationSound } from '../hooks/useNotificationSound';

const PRIMARY = '#3781EE';

export default function HelpCenterTab() {
  const [licenseKey, setLicenseKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [license, setLicense] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => { fetchTickets(); }, []);
  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  // Real-time: receive new messages via WebSocket
  useTicketSocket(selectedTicket?.id, (msg) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev; // dedupe
      return [...prev, msg];
    });
    fetchTickets(); // refresh unread count
    if (msg.sender_role === 'admin') playNotificationSound();
  });

  async function fetchTickets() {
    setTicketsLoading(true);
    try {
      const res = await api.get('/support-tickets');
      setTickets(res.data.tickets || []);
    } catch {} finally { setTicketsLoading(false); }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyError(''); setLicense(null); setShowRequestForm(false); setConfirmation(null);
    if (!licenseKey.trim()) return;
    setVerifying(true);
    try {
      const res = await api.get(`/support-licenses/verify?key=${encodeURIComponent(licenseKey.trim())}`);
      setLicense(res.data);
    } catch (err) {
      setVerifyError(err.response?.data?.error || 'Invalid or unrecognised license key.');
    } finally { setVerifying(false); }
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    setSubmitError('');
    if (!requestMessage.trim()) { setSubmitError('Message is required'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/support-tickets', { supportLicenseId: license.id, message: requestMessage.trim() });
      setConfirmation({ ticketId: res.data.ticket.id });
      setShowRequestForm(false); setRequestMessage('');
      const verifyRes = await api.get(`/support-licenses/verify?key=${encodeURIComponent(licenseKey.trim())}`);
      setLicense(verifyRes.data);
      fetchTickets();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit request.');
    } finally { setSubmitting(false); }
  }

  async function handleTicketClick(ticket) {
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket(null); setMessages([]);
      return;
    }
    setSelectedTicket(ticket); setReplyBody(''); setReplyError(''); setMessagesLoading(true);
    try {
      const res = await api.get(`/support-tickets/${ticket.id}/messages`);
      setMessages(res.data.messages || []);
    } catch { setMessages([]); } finally { setMessagesLoading(false); }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    setReplyError('');
    if (!replyBody.trim()) { setReplyError('Message is required'); return; }
    setSendingReply(true);
    try {
      const res = await api.post(`/support-tickets/${selectedTicket.id}/messages`, { body: replyBody.trim() });
      setMessages(prev => [...prev, res.data.message]); setReplyBody('');
    } catch (err) { setReplyError(err.response?.data?.error || 'Failed to send message.'); }
    finally { setSendingReply(false); }
  }

  const exhausted = license && license.requests_used >= license.requests_total;

  return (
    <div className="max-w-3xl space-y-6">

      {/* Verify License */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Verify License</h2>
        <form onSubmit={handleVerify} className="flex gap-2">
          <input type="text" value={licenseKey} onChange={e => setLicenseKey(e.target.value)}
            placeholder="SL-XXXXXXXX-XXXXXXXX-XXXXXXXX"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          <button type="submit" disabled={verifying} style={{ backgroundColor: PRIMARY }}
            className="text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity">
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        {verifyError && <p className="mt-2 text-sm text-red-500">{verifyError}</p>}

        {license && (
          <div className="mt-4 space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{license.product_title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{license.requests_used} / {license.requests_total} used</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${exhausted ? 'bg-red-50 text-red-500' : 'bg-blue-50'}`} style={!exhausted ? { color: PRIMARY } : {}}>
                {exhausted ? 'Exhausted' : 'Active'}
              </span>
            </div>
            {confirmation && (
              <div className="bg-blue-50 border rounded-xl p-4 text-sm" style={{ color: PRIMARY, borderColor: '#bfdbfe' }}>
                Ticket submitted. ID: <span className="font-mono font-semibold">{confirmation.ticketId}</span>
              </div>
            )}
            {!exhausted && !showRequestForm && !confirmation && (
              <button onClick={() => setShowRequestForm(true)} style={{ backgroundColor: PRIMARY }}
                className="text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                Request Support
              </button>
            )}
            {exhausted && (
              <p className="text-sm text-gray-500">All requests used. <a href="/" style={{ color: PRIMARY }} className="hover:underline">Buy another license</a>.</p>
            )}
            {showRequestForm && (
              <form onSubmit={handleSubmitRequest} className="space-y-3">
                <textarea value={requestMessage} onChange={e => setRequestMessage(e.target.value)}
                  placeholder="Describe your issue…" rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} style={{ backgroundColor: PRIMARY }}
                    className="text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity">
                    {submitting ? 'Submitting…' : 'Submit'}
                  </button>
                  <button type="button" onClick={() => { setShowRequestForm(false); setSubmitError(''); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* My Tickets */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">My Tickets</h2>
        {ticketsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }} />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No support tickets yet.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map(ticket => (
              <div key={ticket.id}>
                <button onClick={() => handleTicketClick(ticket)}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    {parseInt(ticket.unread_count) > 0 && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIMARY }} />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ticket.product_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(ticket.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {ticket.latest_message && <span className="ml-2 text-gray-500 truncate">— {ticket.latest_message}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${ticket.status === 'open' ? 'bg-blue-50' : 'bg-gray-100 text-gray-500'}`}
                    style={ticket.status === 'open' ? { color: PRIMARY } : {}}>
                    {ticket.status}
                  </span>
                </button>

                {selectedTicket?.id === ticket.id && (
                  <div className="mt-2 ml-2 border-l-2 border-gray-100 pl-4 space-y-3">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }} />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No messages yet.</p>
                    ) : (
                      <div className="space-y-2 py-2">
                        {messages.map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm"
                              style={msg.sender_role === 'user' ? { backgroundColor: PRIMARY, color: '#fff' } : { backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                              {msg.body}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{msg.sender_name} · {new Date(msg.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {ticket.status === 'closed' ? (
                      <p className="text-xs text-gray-400 italic py-1">This ticket is closed.</p>
                    ) : (
                      <form onSubmit={handleSendReply} className="flex gap-2 pb-2">
                        <input type="text" value={replyBody} onChange={e => setReplyBody(e.target.value)}
                          placeholder="Type a message…"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
                        <button type="submit" disabled={sendingReply} style={{ backgroundColor: PRIMARY }}
                          className="text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity">
                          {sendingReply ? '…' : 'Send'}
                        </button>
                      </form>
                    )}
                    {replyError && <p className="text-xs text-red-500">{replyError}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
