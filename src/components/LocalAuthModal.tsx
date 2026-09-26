import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { X, ShieldCheck, UserRound, BriefcaseBusiness, Building2, Crown, LogIn } from 'lucide-react';

export const LocalAuthModal: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthModalOpen, closeAuthModal, signInWithEmail, registerAccount } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Agent' | 'Investor' | 'Owner' | 'Admin' | 'Client'>('Client');
  const [clientCategory, setClientCategory] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isAuthModalOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setError('');
      setNotice('');
      setMode('login');
      setRole('Client');
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email || !password) {
      setError('Please fill in your email and password.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter a display name for your account.');
        return;
      }

      const result = await registerAccount({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        clientCategory,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }
      if (result.pendingApproval) {
        setNotice(result.message);
        return;
      }

      const homePath = {
        Agent: '/agent/intake',
        Owner: '/owner/portfolio',
        Admin: '/admin/dashboard',
        Investor: '/investor/opportunities',
        Client: '/marketplace',
      }[result.role || role] || '/marketplace';

      closeAuthModal();
      navigate(homePath, { replace: true });
      return;
    }

    const result = await signInWithEmail({
      email: email.trim(),
      password,
    });

    if (!result.success) {
      setError(result.message);
      return;
    }

    const homePath = {
      Agent: '/agent/intake',
      Owner: '/owner/portfolio',
      Admin: '/admin/dashboard',
      Investor: '/investor/opportunities',
      Client: '/marketplace',
    }[result.role || 'Client'] || '/marketplace';

    closeAuthModal();
    navigate(homePath, { replace: true });
  };

  return createPortal(
    <div className="flx-auth-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAuthModal(); }}>
      <section className="flx-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="flx-auth-title">
        <header className="flx-auth-header">
          <div className="flx-auth-brand">
            <img src="/assets/flx-logo-round.jpeg" alt="FLX Real Estate" className="flx-auth-logo" />
            <div className="flx-auth-heading">
              <div className="flx-auth-kicker">FLX Real Estate</div>
              <h2 id="flx-auth-title" className="flx-auth-title">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
            </div>
          </div>
          <button type="button" onClick={closeAuthModal} className="flx-auth-close" aria-label="Close sign-in dialog">
            <X size={18} />
          </button>
        </header>

        <div className="flx-auth-content">
          <div className="flx-auth-tabs" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
              className={`flx-auth-tab ${mode === 'login' ? 'is-active' : ''}`}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => setMode('register')}
              className={`flx-auth-tab ${mode === 'register' ? 'is-active' : ''}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flx-auth-form">
            {mode === 'register' && (
              <label className="flx-auth-field">
                <span>Full name</span>
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="flx-auth-input"
                  required
                />
              </label>
            )}

            <label className="flx-auth-field">
              <span>{mode === 'login' ? 'Email or admin username' : 'Email'}</span>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                autoComplete={mode === 'login' ? 'username' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'Email or FLX admin' : 'you@example.com'}
                className="flx-auth-input"
                required
              />
            </label>

            <label className="flx-auth-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? 'Password or PIN' : '••••••••'}
                className="flx-auth-input"
                required
              />
            </label>

            {mode === 'register' && role === 'Client' && <label className="flx-auth-field">
              <span>Client category</span>
              <select className="flx-auth-input" value={clientCategory} onChange={(event) => setClientCategory(event.target.value)} required>
                <option value="">Choose a category</option>
                <option value="University scholar (hostel)">University scholar (hostel)</option>
                <option value="Frame (business space)">Frame (business space)</option>
                <option value="Apartment (residential tenants)">Apartment (residential tenants)</option>
                <option value="Land or property buyers">Land or property buyers</option>
              </select>
            </label>}

            {mode === 'register' && <div className="flx-auth-role-field">
              <span className="flx-auth-field-label">Account type</span>
              <div className="flx-auth-roles">
                {[
                  { label: 'Client', value: 'Client', icon: <UserRound size={15} /> },
                  { label: 'Investor', value: 'Investor', icon: <BriefcaseBusiness size={15} /> },
                  { label: 'Owner', value: 'Owner', icon: <Building2 size={15} /> },
                  { label: 'Agent', value: 'Agent', icon: <ShieldCheck size={15} /> },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={role === option.value}
                    onClick={() => setRole(option.value as typeof role)}
                    className={`flx-auth-role ${role === option.value ? 'is-active' : ''}`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>}

            {error && <div className="flx-auth-error" role="alert">{error}</div>}
            {notice && <div className="flx-auth-notice" role="status">{notice}</div>}

            <button type="submit" className="flx-auth-submit">
              <LogIn size={17} />
              {mode === 'login' ? 'Continue' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </div>,
    document.body,
  );
};
