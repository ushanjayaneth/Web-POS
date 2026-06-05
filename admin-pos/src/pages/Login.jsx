import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ShoppingBag } from 'lucide-react';

const Login = () => {
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
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password. Please check your admin login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.25),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(74,222,128,0.18),transparent_28%)]" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] bg-[#10121d]/95 border border-white/10 shadow-2xl overflow-hidden rounded-2xl">
        <div className="hidden lg:flex flex-col justify-between p-10 bg-[#0a0b12] border-r border-white/10">
          <div>
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-xl">
              <ShoppingBag className="text-brand-green" size={24} />
              <span className="text-xl font-black tracking-wide">
                Shop<span className="text-brand-purple">LK</span> POS
              </span>
            </div>

            <h1 className="mt-10 text-4xl font-black leading-tight">
              Secure counter operations for your live store.
            </h1>
            <p className="mt-4 text-gray-400 max-w-md leading-7">
              Manage stock, checkout sales, settle loans, and update online orders from one protected dashboard.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['Inventory', 'Billing', 'Reports'].map((item) => (
              <div key={item} className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{item}</p>
                <p className="mt-2 text-brand-green font-black">Ready</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center mb-5">
              <ShieldCheck className="text-brand-green" size={28} />
            </div>
            <h2 className="text-3xl font-black">Admin Login</h2>
            <p className="text-gray-400 mt-2">Sign in with your Firebase admin account.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-300 border border-red-500/30 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="block w-full h-12 pl-12 pr-4 bg-[#0a0b12] border border-white/10 rounded-xl text-white placeholder:text-gray-600 outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="block w-full h-12 pl-12 pr-12 bg-[#0a0b12] border border-white/10 rounded-xl text-white placeholder:text-gray-600 outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white rounded-lg"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brand-green text-black rounded-xl font-black uppercase tracking-wide hover:bg-[#92ff00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_rgba(74,222,128,0.18)]"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
