import React, { useState } from 'react';
import { api } from '@/api/client';
import { useAppStore } from '@/store/useAppStore';

// Login page is always dark — it's the first impression, standalone branding experience.
// Does NOT follow the app theme toggle.

const LoginPage: React.FC = () => {
  const { setUser } = useAppStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login({ username, password });
      if (res.success) {
        setUser(res.data.user);
      } else {
        setError(res.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Fixed dark palette — always looks premium regardless of app theme
  const bg       = '#0d0d14';
  const surface  = '#14141e';
  const border   = 'rgba(255,255,255,0.08)';
  const accent   = '#f59e0b';
  const text1    = '#f0f0f5';
  const text2    = '#a0a0b8';
  const text3    = '#5a5a72';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: bg,
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      {/* Left Column: Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '48px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: text1, letterSpacing: '-0.04em' }}>Supply</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: accent, letterSpacing: '-0.04em' }}>X</span>
            <span style={{ fontSize: '13px', fontWeight: 400, color: text3, marginLeft: '4px', letterSpacing: '0.02em' }}>ERP</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: text1, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '14px', color: text2, margin: 0, marginTop: '8px' }}>
              Sign in to your workspace
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: text3, marginBottom: '8px' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
                placeholder="admin"
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  background: surface,
                  border: `1px solid ${border}`,
                  borderRadius: '8px',
                  color: text1,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms',
                }}
                onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px rgba(245,158,11,0.15)`; }}
                onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: text3, marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  background: surface,
                  border: `1px solid ${border}`,
                  borderRadius: '8px',
                  color: text1,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms',
                }}
                onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px rgba(245,158,11,0.15)`; }}
                onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                background: accent,
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 150ms, transform 100ms',
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.opacity = '0.9'; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.opacity = '1'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <a href="#" style={{ fontSize: '12px', color: accent, textDecoration: 'none', fontWeight: 500, opacity: 0.8 }}>
                Forgot password?
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Brand Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        background: surface,
        borderLeft: `1px solid ${border}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px',
          background: `radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', maxWidth: '340px' }}>
          {/* Big Monogram */}
          <div style={{
            width: '120px', height: '120px',
            borderRadius: '28px',
            background: `linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)`,
            border: `1px solid rgba(245,158,11,0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '48px', fontWeight: 900, color: accent, letterSpacing: '-0.05em' }}>SX</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: text3, marginBottom: '12px' }}>
              SupplyX ERP
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: text1, lineHeight: 1.3, margin: 0, letterSpacing: '-0.02em' }}>
              Operations management,{' '}
              <span style={{ color: accent }}>optimized.</span>
            </h2>
            <p style={{ fontSize: '13px', color: text2, marginTop: '12px', lineHeight: 1.6 }}>
              Seven modules. One platform. Zero compromise.
              The definitive system for modern industrial logistics.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {['Procurement', 'Quality Gate', 'Deal Flow', 'Logistics', 'Analytics'].map(f => (
              <span key={f} style={{
                fontSize: '11px', fontWeight: 600,
                padding: '4px 12px', borderRadius: '100px',
                background: 'rgba(245,158,11,0.1)',
                color: accent,
                border: '1px solid rgba(245,158,11,0.2)',
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: '24px',
          fontSize: '10px', fontWeight: 600,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          color: text3, opacity: 0.5,
        }}>
          Powered by TechLogix Solutions
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
