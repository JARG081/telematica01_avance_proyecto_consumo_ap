import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import { decodeJWT } from '../utils/tokenUtils';
import { AuthContext } from './AuthContextDef';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token');
    return t ? decodeJWT(t) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(decodeJWT(token));
    } else {
      localStorage.removeItem('token');
       
      setUser(null);
    }
  }, [token]);

  const login = useCallback(async (usernameOrEmail, password) => {
    const res = await authApi.post('/Auth/login', { usernameOrEmail, password });
    setToken(res.data.accessToken);
    return res.data;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await authApi.post('/Auth/register', { username, email, password });
    return res.data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
