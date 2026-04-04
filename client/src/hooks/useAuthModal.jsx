import { createContext, useContext, useState, useRef, useEffect } from 'react';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('login');
  const triggerRef = useRef(null);

  function openModal(initialView = 'login') {
    triggerRef.current = document.activeElement;
    setView(initialView);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setTimeout(() => {
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    }, 0);
  }

  // Open login modal when a protected API call returns 401 (session expired)
  useEffect(() => {
    function handleUnauthorized() {
      openModal('login');
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthModalContext.Provider value={{ isOpen, view, setView, openModal, closeModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}
