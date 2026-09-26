import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, LogIn, LogOut, MapPin, Pencil, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LocalAuthModal } from './LocalAuthModal';
import './workspaceChrome.css';

type WorkspaceChromeProps = {
  section?: string;
  location?: string;
  backHref?: string;
};

export function WorkspaceAccountMenu() {
  const { user, isAuthenticated, isLoading, openAuthModal, signOut, updateProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', picture: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', picture: user?.picture || '' });
  }, [user]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const choosePhoto = (file?: File) => {
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('Choose a PNG, JPEG, or WebP photo under 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, picture: String(reader.result || '') }));
    reader.onerror = () => setError('The selected photo could not be read.');
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const result = await updateProfile(draft);
    if (result.success) setNotice(result.message);
    else setError(result.message);
  };

  const initials = (user?.name || 'FLX').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return <>
    <div className="workspace-account" ref={menuRef}>
      <button className="workspace-account-trigger" type="button" aria-label={isAuthenticated ? 'Open profile menu' : 'Sign in'} aria-haspopup="menu" aria-expanded={isOpen} disabled={isLoading} onClick={() => isAuthenticated ? setIsOpen((open) => !open) : openAuthModal()}>
        {user?.picture ? <img src={user.picture} alt="" /> : <span>{isAuthenticated ? initials : <UserRound size={17} />}</span>}
        {isAuthenticated && <ChevronDown size={13} />}
      </button>
      {isOpen && user && <div className="workspace-account-menu" role="menu">
        <div className="workspace-account-summary">
          <strong>{user.name}</strong><span>{user.email}</span><small>{user.role}{user.clientCategory ? ` · ${user.clientCategory}` : ''}</small>
        </div>
        <button type="button" role="menuitem" onClick={() => { setDraft({ name: user.name, email: user.email, phone: user.phone || '', picture: user.picture || '' }); setNotice(''); setError(''); setIsEditing(true); setIsOpen(false); }}><Pencil size={14} />Edit profile</button>
        <button type="button" role="menuitem" className="workspace-account-signout" onClick={() => { setIsOpen(false); signOut(); openAuthModal(); }}><LogOut size={14} />Sign out</button>
      </div>}
    </div>

    {isEditing && createPortal(<div className="workspace-profile-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsEditing(false); }}>
      <section className="workspace-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-profile-title">
        <header><div><span>FLX ACCOUNT</span><h2 id="workspace-profile-title">Edit your profile</h2></div><button type="button" aria-label="Close profile editor" onClick={() => setIsEditing(false)}><X size={18} /></button></header>
        <form onSubmit={saveProfile}>
          <div className="workspace-profile-photo-row">
            {draft.picture ? <img src={draft.picture} alt="Profile preview" /> : <span>{initials}</span>}
            <label>Profile photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0])} /><small>PNG, JPEG, or WebP · up to 1 MB</small></label>
          </div>
          <label>Full name<input autoComplete="name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label>Email address<input type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} required /></label>
          <label>Phone number<input type="tel" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} /></label>
          {error && <p className="workspace-profile-message is-error" role="alert">{error}</p>}
          {notice && <p className="workspace-profile-message" role="status">{notice}</p>}
          <footer><button type="button" onClick={() => setIsEditing(false)}>Close</button><button type="submit">Save profile</button></footer>
        </form>
      </section>
    </div>, document.body)}
    <LocalAuthModal />
  </>;
}

export function WorkspaceTopBar({ section = 'Workspace', location = 'Dar es Salaam', backHref = '/' }: WorkspaceChromeProps) {
  return <header className="workspace-topbar">
    <div className="workspace-topbar-inner">
      <a className="workspace-topbar-brand" href={backHref} aria-label="FLX Real Estate home"><img src="/assets/flx-logo-round.jpeg" alt="" /><span>FLX Real Estate</span></a>
      <span className="workspace-topbar-location"><MapPin size={14} />{location}</span>
      <span className="workspace-topbar-section">{section}</span>
      <WorkspaceAccountMenu />
    </div>
  </header>;
}

export function ProtectedWorkspaceShell({
  section,
  location,
  backHref,
  children,
}: WorkspaceChromeProps & { children: ReactNode }) {
  return <div className="protected-workspace-shell">
    <WorkspaceTopBar section={section} location={location} backHref={backHref} />
    {children}
  </div>;
}
