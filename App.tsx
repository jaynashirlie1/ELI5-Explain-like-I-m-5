
import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import { AuthState, User } from './types';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking session from localStorage
    const savedUser = localStorage.getItem('eli5_user');
    if (savedUser) {
      setAuthState({
        user: JSON.parse(savedUser),
        isAuthenticated: true,
      });
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('eli5_user', JSON.stringify(user));
    setAuthState({ user, isAuthenticated: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('eli5_user');
    setAuthState({ user: null, isAuthenticated: false });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#131314] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131314]">
      {authState.isAuthenticated ? (
        <Dashboard user={authState.user!} onLogout={handleLogout} />
      ) : (
        <AuthPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
