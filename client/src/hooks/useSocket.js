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

/**
 * Join a ticket room and listen for new_message events.
 * Automatically leaves the room on cleanup.
 */
export function useTicketSocket(ticketId, onNewMessage) {
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  useEffect(() => {
    if (!ticketId) return;
    const socket = getSocket();

    socket.emit('join_ticket', ticketId);

    function handleMessage(msg) {
      callbackRef.current?.(msg);
    }

    socket.on('new_message', handleMessage);

    return () => {
      socket.emit('leave_ticket', ticketId);
      socket.off('new_message', handleMessage);
    };
  }, [ticketId]);
}
