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
  const [user, setUser] = useState(null);

  // Restore user from cookie-based JWT on mount by calling a lightweight endpoint
  // For simplicity, we store decoded payload in state after login/register
  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
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

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    sessionStorage.removeItem('user');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
