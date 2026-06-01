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

  // Fetch wrapper that auto-redirects to /login on 401 or 403
  const fetchAuth = async (url, options = {}) => {
    const res = await fetch(url, {
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
