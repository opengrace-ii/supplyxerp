import React, { useState } from 'react';
import OperationPanel from '../components/OperationPanel';
import ContextPanel from '../components/ContextPanel';
import AgentTracePanel from '../components/AgentTracePanel';
import InventoryGrid from '../components/InventoryGrid';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';

const OperatorPage: React.FC = () => {
  const { wsStatus, user, setUser } = useAppStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.login({ username, password });
      if (res.success) {
        setUser(res.data.user);
        setLoginError('');
      } else {
        setLoginError(res.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error?.message || 'Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 border border-zinc-800">
        <form onSubmit={handleLogin} className="bg-zinc-800 p-8 rounded shadow-lg w-96 border border-zinc-700">
          <h2 className="text-2xl font-bold text-white mb-6">ERPLite Login</h2>
          {loginError && <div className="bg-red-900 text-red-100 p-3 mb-4 rounded border border-red-700 text-sm">{loginError}</div>}
          <div className="mb-4">
            <label className="block text-zinc-400 mb-2">Username</label>
            <input 
              type="text" 
              className="w-full p-2 bg-zinc-900 text-white rounded border border-zinc-700 focus:outline-none focus:border-indigo-500" 
              value={username} onChange={e => setUsername(e.target.value)} 
            />
          </div>
          <div className="mb-6">
            <label className="block text-zinc-400 mb-2">Password</label>
            <input 
              type="password" 
              className="w-full p-2 bg-zinc-900 text-white rounded border border-zinc-700 focus:outline-none focus:border-indigo-500" 
              value={password} onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-['Space_Grotesk'] overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center justify-between px-6 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-indigo-400 tracking-tight">ERPLite</span>
          <div className="h-4 w-px bg-zinc-700 mx-2"></div>
          <span className="text-sm font-medium text-zinc-400">WS: 
            <span className={`ml-2 inline-block w-2.5 h-2.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-700 text-zinc-300">
              {user.username}
            </span>
            <span className="text-xs uppercase bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded border border-indigo-800/50">
              {user.role}
            </span>
          </div>
          <button onClick={handleLogout} className="hover:text-white transition-colors duration-200">
            Logout
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Operation Panel - 50% */}
        <div className="w-1/2 flex flex-col border-r border-zinc-800 bg-zinc-950">
          <OperationPanel />
        </div>

        {/* Context Panel - 25% */}
        <div className="w-1/4 flex flex-col border-r border-zinc-800 bg-zinc-900/50 p-6 overflow-y-auto w-full max-h-full">
          <ContextPanel />
        </div>

        {/* Agent Trace Panel - 25% */}
        <div className="w-1/4 flex flex-col bg-zinc-950">
          <AgentTracePanel />
        </div>
      </div>

      {/* Bottom Inventory Grid */}
      <div className="h-64 border-t border-zinc-800 bg-zinc-900/30 overflow-y-auto">
        <InventoryGrid />
      </div>
    </div>
  );
};

export default OperatorPage;
