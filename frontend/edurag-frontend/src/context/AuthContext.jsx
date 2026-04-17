import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      id: decoded.sub || decoded.nameid,
      username: decoded.unique_name,
      email: decoded.email,
      role: decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token');
    return t ? decodeJWT(t) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setUser(decodeJWT(token));
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = async (usernameOrEmail, password) => {
    const res = await authApi.post('/Auth/login', { usernameOrEmail, password });
    setToken(res.data.accessToken);
    return res.data;
  };

  const register = async (username, email, password) => {
    console.log(username,email,password)
    const res = await authApi.post('/Auth/register', { username, email, password });
    return res.data;
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
