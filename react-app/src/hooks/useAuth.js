import { API_BASE } from '../lib/api';

export function useAuth() {
  const getToken = () => localStorage.getItem('jwt');

  const authHeader = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
  };

  // Prefixes path with API_BASE so calls work on both dev and production
  const fetchAuth = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...authHeader(), ...options.headers },
    });
    if (res.status === 401 || res.status === 403) {
      logout();
      window.location.href = '/login';
      return null;
    }
    return res;
  };

  return { getToken, authHeader, logout, fetchAuth };
}
