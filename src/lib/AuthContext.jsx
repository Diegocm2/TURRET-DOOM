import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Mock as authenticated
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'turret-doom', public_settings: {} });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // Mock app state check
    setIsLoadingPublicSettings(false);
  };

  const checkUserAuth = async () => {
    // Mock user auth
    setUser({ id: 'mock-user', name: 'Player' });
    setIsAuthenticated(true);
  };

  const login = async (email, password) => {
    // Mock login
    setUser({ id: 'mock-user', name: 'Player' });
    setIsAuthenticated(true);
  };

  const logout = async () => {
    // Mock logout
    setUser(null);
    setIsAuthenticated(false);
  };

  const register = async (userData) => {
    // Mock register
    setUser({ id: 'mock-user', name: userData.name || 'Player' });
    setIsAuthenticated(true);
  };

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    checkUserAuth,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
