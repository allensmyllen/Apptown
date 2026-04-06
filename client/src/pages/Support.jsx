import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

export default function Support() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Payment verification after redirect ---
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'verifying' | { key, product_title } | 'failed'

  // --- Verify License section ---
  const [licenseKey, setLicenseKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [license, setLicense] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  // --- Support request form ---
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  // --- My Tickets section ---
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replyFile, setReplyFile] = useState(null);

  // On mount, check if we're returning from a Paystack payment
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference || !reference.startsWith('SLREF-')) return;

    setPaymentStatus('verifying');
    // Clear the query params from the URL
    setSearchParams({}, { replace: true });

    api.get(`/support-licenses/verify-payment?reference=${encodeURIComponent(reference)}`)
      .then(res => {
        if (res.data.status === 'success') {
          setPaymentStatus({ key: res.data.license_key, product_title: res.data.product_title });
          // Auto-fill the verify input with the new key
          setLicenseKey(res.data.license_key);
        } else {
          setPaymentStatus('failed');
        }
      })
      .catch(() => setPaymentStatus('failed'));
  }, []);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setTicketsLoading(true);
    try {
      const res = await api.get('/support-tickets');
      setTickets(res.data.tickets || []);
    } catch {
      // silently fail — tickets section will just be empty
    } finally {
      setTicketsLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyError('');
    setLicense(null);
    setShowRequestForm(false);
    setConfirmation(null);
    if (!licenseKey.trim()) return;
    setVerifying(true);
    try {
      const res = await api.get(`/support-licenses/verify?key=${encodeURIComponent(licenseKey.trim())}`);
      setLicense(res.data);
    } catch (err) {
      setVerifyError(err.response?.data?.error || 'Invalid or unrecognised license key.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    setSubmitError('');
    if (!requestMessage.trim()) {
      setSubmitError('Message is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/support-tickets', {
        supportLicenseId: license.id,
        message: requestMessage.trim(),
      });
      setConfirmation({ ticketId: res.data.ticket.id });
      setShowRequestForm(false);
      setRequestMessage('');
      // Refresh license usage and ticket list
      const verifyRes = await api.get(`/support-licenses/verify?key=${encodeURIComponent(licenseKey.trim())}`);
      setLicense(verifyRes.data);
      fetchTickets();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTicketClick(ticket) {
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket(null);
      setMessages([]);
      return;
    }
    setSelectedTicket(ticket);
    setReplyBody('');
    setReplyError('');
    setMessagesLoading(true);
    try {
      const res = await api.get(`/support-tickets/${ticket.id}/messages`);
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    setReplyError('');
    if (!replyBody.trim()) {
      setReplyError('Message is required');
      return;
    }
    setSendingReply(true);
    try {
      const res = await api.post(`/support-tickets/${selectedTicket.id}/messages`, {
        body: replyBody.trim(),
      });
      setMessages((prev) => [...prev, res.data.message]);
      setReplyBody('');
    } catch (err) {
      setReplyError(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSendingReply(false);
    }
  }

  const exhausted = license && license.requests_used >= license.requests_total;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Help Center</h1>
        <p className="text-sm text-gray-500 mt-1">Verify your support license and submit a support request.</p>
      </div>

      {/* Payment verification banner */}
      {paymentStatus === 'verifying' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-sm text-indigo-700">Confirming your support license payment…</p>
        </div>
      )}

      {paymentStatus && typeof paymentStatus === 'object' && (
        <div className="bg-blue-50 border border-primary/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-primary">Support License Activated!</p>
          </div>
          <p className="text-xs text-primary mb-2">Product: {paymentStatus.product_title}</p>
          <p className="text-xs text-primary mb-1">Your license key:</p>
          <div className="bg-white border border-primary/30 rounded-lg px-3 py-2 font-mono text-sm font-bold text-gray-800 tracking-wider">
            {paymentStatus.key}
          </div>
          <p className="text-xs text-primary mt-2">A confirmation email has been sent to you. Use this key below to submit support requests.</p>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600">Could not verify your payment. If you were charged, please contact support.</p>
        </div>
      )}

      {/* ── Verify License ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Verify License</h2>
        <form onSubmit={handleVerify} className="flex gap-2">
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="SL-XXXXXXXX-XXXXXXXX-XXXXXXXX"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={verifying}
            className="bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        {verifyError && (
          <p className="mt-3 text-sm text-red-500">{verifyError}</p>
        )}

        {license && (
          <div className="mt-4 space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{license.product_title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {license.requests_used} / {license.requests_total} used
                </p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${exhausted ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-primary'}`}>
                {exhausted ? 'Exhausted' : 'Active'}
              </span>
            </div>

            {confirmation && (
              <div className="bg-blue-50 border border-primary/30 rounded-xl p-4 text-sm text-primary">
                Support request submitted. Ticket ID: <span className="font-mono font-semibold">{confirmation.ticketId}</span>
              </div>
            )}

            {!exhausted && !showRequestForm && !confirmation && (
              <button
                onClick={() => setShowRequestForm(true)}
                className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Request Support
              </button>
            )}

            {exhausted && (
              <div className="space-y-2">
                <button
                  disabled
                  className="bg-gray-100 text-gray-400 text-sm font-semibold px-4 py-2 rounded-lg cursor-not-allowed"
                >
                  No requests remaining
                </button>
                <p className="text-sm text-gray-500">
                  You&apos;ve used all your support requests.{' '}
                  <a href="/" className="text-primary hover:underline">Purchase another support license</a> to continue.
                </p>
              </div>
            )}

            {showRequestForm && (
              <form onSubmit={handleSubmitRequest} className="space-y-3">
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Describe your issue…"
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {submitting ? 'Submitting…' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRequestForm(false); setSubmitError(''); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── My Tickets ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">My Tickets</h2>

        {ticketsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No support tickets yet.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <div key={ticket.id}>
                <button
                  onClick={() => handleTicketClick(ticket)}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {parseInt(ticket.unread_count) > 0 && (
                      <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ticket.product_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(ticket.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {ticket.latest_message && (
                          <span className="ml-2 text-gray-500 truncate">— {ticket.latest_message}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${ticket.status === 'open' ? 'bg-blue-50 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                    {ticket.status}
                  </span>
                </button>

                {/* Chat thread */}
                {selectedTicket?.id === ticket.id && (
                  <div className="mt-2 ml-2 border-l-2 border-gray-100 pl-4 space-y-3">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No messages yet.</p>
                    ) : (
                      <div className="space-y-2 py-2">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${msg.sender_role === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.sender_role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'}`}>
                              {msg.body}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {msg.sender_name} · {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {ticket.status === 'closed' ? (
                      <p className="text-xs text-gray-400 italic py-1">This ticket is closed.</p>
                    ) : (
                      <form onSubmit={handleSendReply} className="flex gap-2 pb-2">
                        <input
                          type="text"
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder="Type a message…"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="submit"
                          disabled={sendingReply}
                          className="bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
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
