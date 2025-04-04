
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

interface User {
  email: string;
  name: string;
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState({
    isAuthenticated: authService.isAuthenticated(),
    user: authService.getCurrentUser(),
    loading: true,
  });

  useEffect(() => {
    setState({
      isAuthenticated: authService.isAuthenticated(),
      user: authService.getCurrentUser(),
      loading: false,
    });

    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(() => {
      setState({
        isAuthenticated: authService.isAuthenticated(),
        user: authService.getCurrentUser(),
        loading: false,
      });
    });

    return unsubscribe;
  }, []);

  const value = {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    loading: state.loading,
    login: authService.login,
    logout: authService.logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
