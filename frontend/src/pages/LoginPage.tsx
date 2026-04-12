import React, { useState } from 'react';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';

const LoginPage: React.FC = () => {
  const { setUser } = useAppStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login({ username, password });
      if (res.success) {
        setUser(res.data.user);
        setError('');
      } else {
        setError(res.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)'}}>
      <form onSubmit={handleLogin} className="card" style={{width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)'}}>
        <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-inverse)', textAlign: 'center'}}>ERPLite Console</h2>
        {error && <div style={{padding: 'var(--space-3)', background: 'var(--color-danger-muted)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', border: '1px solid var(--color-danger)'}}>{error}</div>}
        
        <div>
          <label style={{display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)'}}>Username</label>
          <input 
            type="text" 
            className="input"
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            disabled={loading}
          />
        </div>
        
        <div style={{position: 'relative'}}>
          <label style={{display: 'block', marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)'}}>Password</label>
          <input 
            type={showPassword ? 'text' : 'password'} 
            className="input"
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            disabled={loading}
            style={{paddingRight: '3rem'}}
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute', right: '0.5rem', bottom: '0.5rem',
              background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
              cursor: 'pointer', fontSize: '0.75rem', padding: '0.2rem'
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        
        <button type="submit" className="btn btn-primary" style={{marginTop: 'var(--space-4)'}} disabled={loading}>
          {loading ? 'Authenticating...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
