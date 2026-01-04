
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      if (isLogin) {
        const { data: user, error: fetchError } = await supabase
          .from('eli5_users')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!user) {
          setError("No account found with this email.");
          setIsLoading(false);
          return;
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
          setError("Incorrect password.");
          setIsLoading(false);
          return;
        }

        onLogin({ id: user.id, email: user.email, name: user.name });
      } else {
        if (!name.trim()) {
          setError("Please enter your name.");
          setIsLoading(false);
          return;
        }

        // Check if user exists
        const { data: existingUser, error: checkError } = await supabase
          .from('eli5_users')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
          setError("This email is already registered. Try signing in!");
          setIsLogin(true);
          setIsLoading(false);
          return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { data: newUser, error: insertError } = await supabase
          .from('eli5_users')
          .insert([
            {
              email: email.toLowerCase().trim(),
              name: name.trim(),
              password_hash: hashedPassword
            }
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        onLogin({ id: newUser.id, email: newUser.email, name: newUser.name });
      }
    } catch (err: any) {
      console.error("Auth Exception:", err);
      
      let message = err.message || "An unexpected error occurred.";
      
      // Handle the common 'Failed to fetch' error with specific advice
      if (message.includes('Failed to fetch') || err.name === 'TypeError') {
        message = "Connection Failed: Could not reach Supabase. Check that VITE_SUPABASE_URL in your .env is correct and has no trailing slashes.";
      } else if (err.code === '42P01') {
        message = "Database Error: The 'eli5_users' table was not found. Did you run the SQL script in Supabase?";
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#131314]">
      <div className="max-w-md w-full space-y-8 bg-[#1e1f20] p-10 rounded-[32px] shadow-2xl border border-gray-800 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <i className="fas fa-brain text-3xl text-white"></i>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            {isLogin ? 'Sign in to ELI5' : 'Join ELI5 Bot'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isLogin ? 'Continue simplifying the world' : 'Start your journey of clarity today'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-medium flex items-start gap-3 animate-in slide-in-from-top-2">
            <i className="fas fa-exclamation-circle shrink-0 mt-0.5"></i>
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-700 bg-[#131314] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-700"
                placeholder="How should we call you?"
              />
            </div>
          )}
          
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-gray-700 bg-[#131314] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-700"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-gray-700 bg-[#131314] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-700"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
            {isLogin ? 'Sign In' : 'Create My Account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            disabled={isLoading}
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-sm font-semibold text-blue-500 hover:text-blue-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
