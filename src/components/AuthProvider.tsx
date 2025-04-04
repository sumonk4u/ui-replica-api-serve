
import React, { createContext, useContext, useState } from 'react';
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

// For testing - mock user
const mockUser = {
  email: "test@example.com",
  name: "Test User",
  username: "testuser"
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For testing - always authenticated
  const [state] = useState({
    isAuthenticated: true,
    user: mockUser,
    loading: false,
  });

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
