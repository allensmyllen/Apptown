const PRIMARY = '#3781EE';

function FileAttachment({ url }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img src={url} alt="attachment" className="max-w-[200px] rounded-lg border border-white/20" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-2 text-xs underline opacity-80 hover:opacity-100">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      View attachment
    </a>
  );
}

export function MessageBubble({ msg, formatTime }) {
  const isUser = msg.sender_role === 'user';
  return (
    <div className={`flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className="max-w-[80%] rounded-xl px-3 py-2 text-sm"
        style={isUser
          ? { backgroundColor: PRIMARY, color: '#fff' }
          : { backgroundColor: '#f3f4f6', color: '#1f2937' }
        }
      >
        {msg.body && <p>{msg.body}</p>}
        <FileAttachment url={msg.file_url} />
      </div>
      <p className="text-xs text-gray-400 mt-0.5 px-1">
        {msg.sender_name || (isUser ? 'You' : 'Support')} · {formatTime ? formatTime(msg.created_at) : new Date(msg.created_at).toLocaleString()}
      </p>
    </div>
  );
}

export function TypingIndicator({ role }) {
  if (!role) return null;
  const label = role === 'admin' ? 'Support is typing' : 'User is typing';
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-xs text-gray-400">{label}…</span>
    </div>
  );
}
