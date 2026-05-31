import React, { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Lock, User as UserIcon, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, loading } = useAdmin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsSubmitting(true);
    const success = await login(username, password);
    setIsSubmitting(false);
    
    if (success) {
      setUsername('');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/60 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-orange-500 rounded-2xl shadow-xl mb-4 font-extrabold text-white text-2xl">
            FS
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">FoodSphere Workspace</h2>
          <p className="text-sm text-slate-400 mt-1.5">Sign in to control your dining networks</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <UserIcon size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or manager_seenbanao"
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                required
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading || isSubmitting ? 'Authenticating Workspace...' : 'Access Console'}
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <div className="flex gap-2 items-center text-xs font-semibold text-amber-500 mb-3">
            <ShieldAlert size={14} />
            <span>Developer Test Credentials</span>
          </div>
          <div className="grid grid-cols-1 gap-3 text-[11px] text-slate-400">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/30">
              <span className="block font-bold text-slate-300">Super-Admin (Live/Demo)</span>
              <span className="block mt-0.5">User: <code className="text-blue-400 font-bold bg-slate-800 px-1 py-0.5 rounded">admin</code></span>
              <span>Pass: <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">admin123</code></span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/30">
              <span className="block font-bold text-slate-300">Live SeenBanao Manager (Connected to Live API)</span>
              <span className="block mt-0.5">User: <code className="text-orange-400 font-bold bg-slate-800 px-1 py-0.5 rounded">manager_seenbanao</code></span>
              <span>Pass: <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">seenbanao@2025</code></span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/30">
              <span className="block font-bold text-slate-300">Demo SeenBanao Manager (Mock / Local Fallback)</span>
              <span className="block mt-0.5">User: <code className="text-orange-400 font-bold bg-slate-800 px-1 py-0.5 rounded">seenbanao_mgr</code></span>
              <span>Pass: <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">manager123</code></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
