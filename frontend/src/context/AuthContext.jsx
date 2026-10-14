import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { initialAdminData } from '../services/mockData';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('readyup_auth_user');
      return saved ? JSON.parse(saved) : initialAdminData.users[0]; // Default to student Aarav Sharma
    } catch {
      return initialAdminData.users[0];
    }
  });

  const [token, setToken] = useState(() => apiClient.getToken() || 'mock_jwt_token_student');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('readyup_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('readyup_auth_user');
    }
  }, [user]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      setToken(data.token);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const data = await authService.register(userData);
      setUser(data.user);
      setToken(data.token);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // offline logout
    } finally {
      setUser(null);
      setToken(null);
      apiClient.clearToken();
    }
  };

  const updateProfile = async (updateData) => {
    const updated = await authService.updateProfile(updateData);
    setUser((prev) => ({ ...prev, ...updated }));
    return updated;
  };

  // Developer convenience switcher to quickly test Student, Coordinator, and Admin roles
  const switchRoleDev = useCallback((newRole) => {
    const matchingUser = initialAdminData.users.find((u) => u.role === newRole) || {
      _id: 'usr_dev_' + newRole,
      name: newRole === 'admin' ? 'Dr. Vikram Malhotra' : newRole === 'coordinator' ? 'Prof. Sunita Patil' : 'Aarav Sharma',
      email: `${newRole}@readyup.edu`,
      role: newRole,
      department: newRole === 'coordinator' ? 'Training & Placement Cell' : newRole === 'admin' ? 'Dean Office' : 'Computer Science & Engineering',
      college: 'National Institute of Technology',
      graduationYear: 2026,
      studentId: newRole === 'student' ? 'CS2026-042' : `EMP-${newRole.toUpperCase()}-01`,
      isActive: true
    };

    const devToken = `mock_jwt_token_${newRole}_dev`;
    apiClient.setToken(devToken);
    setToken(devToken);
    setUser(matchingUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'student',
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        switchRoleDev
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
