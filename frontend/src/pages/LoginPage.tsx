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
    <div style={{ position: 'relative', height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Background Layer */}
      <div className="login-bg">
        <div className="aurora-glow" style={{ top: '-10%', left: '-10%' }}></div>
        <div className="aurora-glow" style={{ bottom: '-10%', right: '-10%', animationDelay: '-5s' }}></div>
      </div>

      {/* Main Glass Console */}
      <div className="glass" style={{ 
        width: 'min(900px, 95vw)', 
        minHeight: '520px', 
        borderRadius: '24px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        
        {/* Left Side: Auth Form */}
        <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>Please Login</h1>
          <p style={{ color: 'var(--techlogix-slate)', fontSize: '14px', marginBottom: '32px' }}>Access your SupplyX ERP control panel</p>

          {error && (
            <div style={{ 
              padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', 
              borderRadius: '8px', marginBottom: '24px', fontSize: '13px' 
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--techlogix-slate)' }}>Username</label>
              <input 
                type="text" 
                placeholder="Enter your username"
                className="input-underlined"
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--techlogix-slate)' }}>Password</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter your password"
                className="input-underlined"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                disabled={loading}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0', bottom: '12px',
                  background: 'transparent', border: 'none', color: 'var(--techlogix-slate)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                }}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '14px', color: '#fff' }} 
                disabled={loading}
              >
                {loading ? 'AUTHENTICATING...' : 'LOGIN'}
              </button>
              <button 
                type="button" 
                className="btn btn-glass" 
                style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '14px' }}
              >
                REGISTER
              </button>
            </div>
          </form>
          
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <a href="#" style={{ color: 'var(--techlogix-slate)', fontSize: '12px', textDecoration: 'none', borderBottom: '1px solid transparent', transition: '0.2s' }}>Forgot Password?</a>
          </div>
        </div>

        {/* Right Side: Brand Splash */}
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.03)', 
          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          {/* Mock Logo */}
          <div style={{ 
            width: '64px', height: '64px', background: 'var(--techlogix-blue)', 
            borderRadius: '16px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', marginBottom: '24px',
            boxShadow: '0 0 30px var(--techlogix-glow)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', maxWidth: '280px', lineHeight: '1.3' }}>
            Operations management, <span style={{ color: 'var(--techlogix-blue)' }}>optimized.</span>
          </h2>
          <p style={{ color: 'var(--techlogix-slate)', fontSize: '13px', marginTop: '16px', maxWidth: '260px', lineHeight: '1.6' }}>
            Get started using the simplified warehouse management system for modern logistics.
          </p>

          <div style={{ marginTop: 'auto', paddingTop: '48px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.1)', letterSpacing: '0.1em', fontWeight: '700' }}>POWERED BY TECHLOGIX SOLUTIONS</div>
          </div>
        </div>

      </div>
      
      {/* Bottom Footer */}
      <footer style={{ position: 'absolute', bottom: '24px', width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>
        &copy; 2026 SupplyX ERP v1.0. All rights reserved.
      </footer>
    </div>
  );
};

export default LoginPage;
