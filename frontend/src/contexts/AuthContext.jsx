import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp > currentTime) {
          setUser(decoded);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          logout();
        }
      } catch (err) {
        console.log(err);
        logout();
      }
    } else {
      setUser(null);
    }
    // Admin token check
    if (adminToken) {
      try {
        const decoded = jwtDecode(adminToken);
        const currentTime = Date.now() / 1000;
        if (decoded.exp > currentTime) {
          setAdmin(decoded);
          axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
        } else {
          logoutAdmin();
        }
      } catch (error) {
        logoutAdmin();
      }
    } else {
      setAdmin(null);
    }
    setLoading(false);
  }, [token, adminToken]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  // Admin login
  const adminLogin = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/admin-login', { email, password });
      const { token: newToken, admin: adminData } = response.data;
      setAdminToken(newToken);
      setAdmin(adminData);
      localStorage.setItem('adminToken', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true, admin: adminData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Admin login failed'
      };
    }
  };

  const signup = async (email, password, name) => {
    try {
      const response = await axios.post('/api/auth/signup', { 
        email, 
        password, 
        name 
      });
      const { token: newToken, user: userData } = response.data;
      if (!newToken || !userData) {
        return {
          success: false,
          error: 'Signup failed: Invalid server response.'
        };
      }
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true };
    } catch (error) {
      let errorMsg = 'Signup failed';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      return { 
        success: false, 
        error: errorMsg
      };
    }
  };


  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const logoutAdmin = () => {
    setAdmin(null);
    setAdminToken(null);
    localStorage.removeItem('adminToken');
    delete axios.defaults.headers.common['Authorization'];
  };


  const isAdmin = () => {
    return !!admin;
  };

  const isAdminAuthenticated = () => {
    return !!adminToken && !!admin;
  };

  const value = {
    user,
    admin,
    token,
    adminToken,
    login,
    adminLogin,
    signup,
    logout,
    logoutAdmin,
    isAdmin,
    isAdminAuthenticated,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 