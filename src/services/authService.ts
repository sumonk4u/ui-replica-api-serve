
import { toast } from "sonner";

interface User {
  email: string;
  name: string;
  username: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

// Initial auth state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null
};

// Try to load auth state from localStorage
const loadAuthState = (): AuthState => {
  try {
    const storedState = localStorage.getItem('authState');
    if (storedState) {
      return JSON.parse(storedState);
    }
  } catch (error) {
    console.error('Failed to load auth state from localStorage:', error);
  }
  return initialState;
};

// Save auth state to localStorage
const saveAuthState = (state: AuthState): void => {
  try {
    localStorage.setItem('authState', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save auth state to localStorage:', error);
  }
};

// Current auth state
let currentState = loadAuthState();

// Listeners for state changes
const listeners: (() => void)[] = [];

// Get current auth state
const getAuthState = (): AuthState => currentState;

// Update auth state and notify listeners
const updateAuthState = (newState: Partial<AuthState>): void => {
  currentState = { ...currentState, ...newState };
  saveAuthState(currentState);
  listeners.forEach(listener => listener());
};

// Subscribe to auth state changes
const subscribe = (listener: () => void): (() => void) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

// Login with redirect to PingFederate
const login = (): void => {
  window.location.href = 'http://localhost:8000/api/auth/login';
};

// Handle SSO callback
const handleCallback = async (code: string): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:8000/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    updateAuthState({
      isAuthenticated: true,
      user: data.user,
      token: data.access_token,
    });

    toast.success("Authentication successful!");
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

// Logout
const logout = (): void => {
  updateAuthState({
    isAuthenticated: false,
    user: null,
    token: null,
  });
  toast.info("You've been logged out");
};

// Get auth header for API requests
const getAuthHeader = (): Record<string, string> => {
  return currentState.token
    ? { Authorization: `Bearer ${currentState.token}` }
    : {};
};

// Check if current user is authenticated
const isAuthenticated = (): boolean => {
  return currentState.isAuthenticated && !!currentState.token;
};

// Get current user
const getCurrentUser = (): User | null => {
  return currentState.user;
};

export const authService = {
  getAuthState,
  subscribe,
  login,
  handleCallback,
  logout,
  getAuthHeader,
  isAuthenticated,
  getCurrentUser,
};
