import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io('http://localhost:3001', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

/** Join a ticket room, listen for new_message and typing events. */
export function useTicketSocket(ticketId, onNewMessage, onTyping) {
  const msgRef = useRef(onNewMessage);
  const typingRef = useRef(onTyping);
  msgRef.current = onNewMessage;
  typingRef.current = onTyping;

  useEffect(() => {
    if (!ticketId) return;
    const socket = getSocket();
    socket.emit('join_ticket', ticketId);

    function handleMessage(msg) { msgRef.current?.(msg); }
    function handleTyping(data) { typingRef.current?.(data); }

    socket.on('new_message', handleMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.emit('leave_ticket', ticketId);
      socket.off('new_message', handleMessage);
      socket.off('typing', handleTyping);
    };
  }, [ticketId]);
}

/** Emit a typing event for a ticket. */
export function emitTyping(ticketId, role) {
  const socket = getSocket();
  socket.emit('typing', { ticketId, role });
}
