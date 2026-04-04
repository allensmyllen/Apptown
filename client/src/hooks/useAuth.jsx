import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Synchronously restore user on first render to avoid flash redirect in protected routes
    try {
      const stored = sessionStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Also restore from server cookie on mount (handles Paystack redirect losing sessionStorage)
  useEffect(() => {
    if (!sessionStorage.getItem('user')) {
      api.get('/auth/me').then(res => {
        const decoded = res.data.user;
        setUser(decoded);
        sessionStorage.setItem('user', JSON.stringify(decoded));
      }).catch(() => {});
    }
  }, []);

  async function register(email, displayName, password) {
    const res = await api.post('/auth/register', { email, display_name: displayName, password });
    const decoded = parseJwt(res.data.token);
    setUser(decoded);
    sessionStorage.setItem('user', JSON.stringify(decoded));
    return decoded;
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const decoded = parseJwt(res.data.token);
    setUser(decoded);
    sessionStorage.setItem('user', JSON.stringify(decoded));
    return decoded;
  }

  function loginWithToken(token) {
    const decoded = parseJwt(token);
    setUser(decoded);
    sessionStorage.setItem('user', JSON.stringify(decoded));
    return decoded;
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    sessionStorage.removeItem('user');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
