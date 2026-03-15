import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, GraduationCap, LogIn, Eye, EyeOff } from 'lucide-react';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.user.role !== 'student') {
        throw new Error("Only students can log in to the CodeGurukul App.");
      }
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));


      navigate('/app/home');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute top-4 left-4 text-slate-500 font-mono text-sm flex items-center gap-2" aria-hidden="true">
        <Lock size={16} aria-hidden="true" /> CodeGurukul Secure Environment 1.0
      </div>

      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700" role="main">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20" aria-hidden="true">
            <GraduationCap size={32} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Student Login</h1>
          <p className="text-slate-400 text-sm mt-2 text-center leading-relaxed">
            You are entering a secure examination and lab environment. 
            All keyboard shortcuts and background activities are restricted.
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5" aria-label="Student login form" noValidate>
          <div>
            <label htmlFor="login-email" className="block text-slate-400 text-sm mb-2 font-medium">School Email</label>
            <input 
              id="login-email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              required
              autoComplete="email"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-slate-400 text-sm mb-2 font-medium">Password</label>
            <div className="relative">
              <input 
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                required 
                autoComplete="current-password"
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-controls="login-password"
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? 'Authenticating, please wait' : 'Log in to enter workspace'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Authenticating...' : <><LogIn size={20} aria-hidden="true" /> Enter Workspace</>}
          </button>
        </form>
      </div>
    </div>
  );
}
