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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Agent' | 'Investor' | 'Owner' | 'Admin' | 'Client'>('Client');
  const [clientCategory, setClientCategory] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isAuthModalOpen) {
      setName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setIdentifier('');
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

    if (!password) {
      setError('Please enter your password or PIN.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter a display name for your account.');
        return;
      }
      if (!email.trim() && !phone.trim()) {
        setError('Add an email address or phone number to create an account.');
        return;
      }

      const result = await registerAccount({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
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
      identifier: identifier.trim() || email.trim(),
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
              <>
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
                <label className="flx-auth-field">
                  <span>Username (optional)</span>
                  <input
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="yourname123"
                    className="flx-auth-input"
                  />
                </label>
              </>
            )}

            {mode === 'login' ? (
              <label className="flx-auth-field">
                <span>Email, phone or username</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@flx.local, +255..., or username"
                  className="flx-auth-input"
                  required
                />
              </label>
            ) : (
              <>
                <label className="flx-auth-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flx-auth-input"
                  />
                </label>
                <label className="flx-auth-field">
                  <span>Phone number</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+255 712 345 678"
                    className="flx-auth-input"
                  />
                </label>
              </>
            )}

            <label className="flx-auth-field">
              <span>Password or PIN</span>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? 'Your password or PIN' : 'Minimum 6 characters'}
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
