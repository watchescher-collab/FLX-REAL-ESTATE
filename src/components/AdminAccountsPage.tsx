import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Check, Clock3, LogOut, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../auth';
import { WorkspaceTopBar } from './WorkspaceChrome';
import './adminAccounts.css';

type AccountRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  client_category: string;
  approval_status: string;
  approved_at: string | null;
  last_login_at: string | null;
  created_at: string;
};

type AccountEvent = {
  id: number;
  event_type: string;
  created_at: string;
  user_id: number;
  name: string;
  email: string;
  role: string;
  client_category: string;
};

type PropertyRecord = {
  id: number;
  title: string;
  city: string;
  price: string;
  period: string;
  approval_status: string;
  approval_note: string;
  deleted_at?: string | null;
};

type AdminTab = 'accounts' | 'applications' | 'properties' | 'activity';
const clientCategories = [
  'University scholar (hostel)',
  'Frame (business space)',
  'Apartment (residential tenants)',
  'Land or property buyers',
];

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getStoredToken()}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
  return payload as T;
}

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Never';

export function AdminAccountsPage() {
  const { user, isLoading: authLoading, openAuthModal, signOut } = useAuth();
  const [tab, setTab] = useState<AdminTab>('accounts');
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [events, setEvents] = useState<AccountEvent[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [category, setCategory] = useState('All accounts');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const refresh = useCallback(async () => {
    if (user?.role !== 'Admin') return;
    setError('');
    try {
      const [accountData, propertyData] = await Promise.all([
        requestJson<{ accounts: AccountRecord[]; events: AccountEvent[] }>('/api/admin/accounts'),
        requestJson<{ properties: PropertyRecord[] }>('/api/admin/properties'),
      ]);
      setAccounts(accountData.accounts || []);
      setEvents(accountData.events || []);
      setProperties(propertyData.properties || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Admin records could not be loaded.');
    }
  }, [user?.role]);

  useEffect(() => { void refresh(); }, [refresh]);

  const clients = useMemo(() => accounts.filter((account) => account.role === 'Client'), [accounts]);
  const visibleAccounts = category === 'All accounts'
    ? accounts
    : clientCategories.includes(category)
      ? clients.filter((account) => account.client_category === category)
      : accounts.filter((account) => account.role === category);
  const staffAccounts = accounts.filter((account) => ['Owner', 'Agent'].includes(account.role));
  const applications = staffAccounts.filter((account) => account.approval_status === 'Pending');
  const pendingProperties = properties.filter((property) => property.approval_status === 'Pending' && !property.deleted_at);

  const decideAccount = async (account: AccountRecord, decision: 'Approved' | 'Rejected') => {
    const key = `account-${account.id}`;
    setBusyKey(key);
    setNotice('');
    try {
      await requestJson(`/api/admin/accounts/${account.id}/approval`, { method: 'PATCH', body: JSON.stringify({ decision }) });
      setNotice(`${account.role} account ${decision.toLowerCase()}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Account review could not be saved.');
    } finally {
      setBusyKey('');
    }
  };

  const decideProperty = async (property: PropertyRecord, decision: 'Approved' | 'Needs_Revision') => {
    const key = `property-${property.id}`;
    setBusyKey(key);
    setNotice('');
    try {
      await requestJson(`/api/property-workbench/${property.id}/approval`, { method: 'PATCH', body: JSON.stringify({ decision, note: decision === 'Needs_Revision' ? 'Please review and resubmit this listing.' : '' }) });
      setNotice(decision === 'Approved' ? 'Property approved and published.' : 'Property returned for revision.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Property review could not be saved.');
    } finally {
      setBusyKey('');
    }
  };

  if (authLoading) return <main className="admin-accounts-page"><p>Checking administrator access…</p></main>;

  if (user?.role !== 'Admin') return <main className="admin-accounts-page">
    <WorkspaceTopBar section="Administration" />
    <section className="admin-access-panel">
      <ShieldCheck size={28} />
      <h1>{user ? 'Administrator access required' : 'Sign in to FLX administration'}</h1>
      <p>{user ? 'This account does not have permission to review accounts or listings.' : 'Use your FLX administrator account to manage applications, account activity, and listing approvals.'}</p>
      {user ? <button type="button" onClick={signOut}>Sign out</button> : <button type="button" onClick={openAuthModal}>Administrator sign in</button>}
    </section>
  </main>;

  return <main className="admin-accounts-page">
    <WorkspaceTopBar section="Administration" />
    <div className="admin-accounts-main">
      <div className="admin-accounts-title"><div><span>ADMINISTRATION</span><h1>Account & approval center</h1></div><button type="button" onClick={() => void refresh()} aria-label="Refresh records"><RefreshCw size={16} /></button></div>
      <section className="admin-accounts-stats" aria-label="Account overview">
        <div><Users size={17} /><span>Total accounts</span><strong>{accounts.length}</strong></div>
        <div><Clock3 size={17} /><span>Applications waiting</span><strong>{applications.length}</strong></div>
        <div><Building2 size={17} /><span>Listings waiting</span><strong>{pendingProperties.length}</strong></div>
        <div><ShieldCheck size={17} /><span>Recorded sign-ins</span><strong>{events.filter((event) => event.event_type === 'login').length}</strong></div>
      </section>
      <nav className="admin-accounts-tabs" aria-label="Admin review sections">
        {([['accounts', 'All accounts'], ['applications', `Agent / Owner (${applications.length})`], ['properties', `Property approvals (${pendingProperties.length})`], ['activity', 'Sign-ins & sign-ups']] as const).map(([key, label]) => <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}
      </nav>
      {error && <p className="admin-accounts-message is-error" role="alert">{error}</p>}
      {notice && <p className="admin-accounts-message" role="status">{notice}</p>}

      {tab === 'accounts' && <section className="admin-accounts-section">
        <div className="admin-accounts-section-heading"><div><h2>Account directory</h2><p>Browse all roles or filter clients by their service category.</p></div><span>{visibleAccounts.length} accounts</span></div>
        <div className="admin-category-tabs" role="group" aria-label="Filter client category">
          {['All accounts', ...clientCategories, 'Agent', 'Owner', 'Investor', 'Admin'].map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}<b>{item === 'All accounts' ? accounts.length : clientCategories.includes(item) ? clients.filter((account) => account.client_category === item).length : accounts.filter((account) => account.role === item).length}</b></button>)}
        </div>
        <div className="admin-account-list">{visibleAccounts.length ? visibleAccounts.map((account) => <article className="admin-account-row" key={account.id}>
          <div className="admin-account-avatar">{account.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div className="admin-account-detail"><strong>{account.name} <i>{account.role}</i></strong><span>{account.email}{account.phone ? ` · ${account.phone}` : ''}</span><small>{account.role === 'Client' ? account.client_category || 'Category not recorded' : account.approval_status}</small></div>
          <div className="admin-account-times"><span>Joined {formatDate(account.created_at)}</span><span>Last sign-in {formatDate(account.last_login_at)}</span></div>
        </article>) : <p className="admin-accounts-empty">No accounts match this filter.</p>}</div>
      </section>}

      {tab === 'applications' && <section className="admin-accounts-section">
        <div className="admin-accounts-section-heading"><div><h2>Agent and Owner applications</h2><p>Approve accounts before they can access their workspace.</p></div><span>{applications.length} pending</span></div>
        <div className="admin-account-list">{staffAccounts.length ? staffAccounts.map((account) => <article className="admin-account-row" key={account.id}>
          <div className="admin-account-avatar">{account.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div className="admin-account-detail"><strong>{account.name} <i>{account.role}</i></strong><span>{account.email}{account.phone ? ` · ${account.phone}` : ''}</span><small>{account.approval_status} · Applied {formatDate(account.created_at)}</small></div>
          {account.approval_status === 'Pending' && <div className="admin-account-actions"><button type="button" disabled={busyKey === `account-${account.id}`} onClick={() => void decideAccount(account, 'Approved')}><Check size={15} />Approve</button><button type="button" className="is-reject" disabled={busyKey === `account-${account.id}`} onClick={() => void decideAccount(account, 'Rejected')}><X size={15} />Reject</button></div>}
        </article>) : <p className="admin-accounts-empty">No Agent or Owner accounts yet.</p>}</div>
      </section>}

      {tab === 'properties' && <section className="admin-accounts-section">
        <div className="admin-accounts-section-heading"><div><h2>Property publication queue</h2><p>Approved listings become visible in the marketplace.</p></div><span>{pendingProperties.length} pending</span></div>
        <div className="admin-account-list">{pendingProperties.length ? pendingProperties.map((property) => <article className="admin-account-row admin-property-row" key={property.id}>
          <div className="admin-account-detail"><strong>{property.title}</strong><span>{property.city}</span><small>{property.price} {property.period}</small></div>
          <div className="admin-account-actions"><button type="button" disabled={busyKey === `property-${property.id}`} onClick={() => void decideProperty(property, 'Approved')}><Check size={15} />Approve & publish</button><button type="button" className="is-reject" disabled={busyKey === `property-${property.id}`} onClick={() => void decideProperty(property, 'Needs_Revision')}><X size={15} />Request revision</button></div>
        </article>) : <p className="admin-accounts-empty">No properties awaiting publication.</p>}</div>
      </section>}

      {tab === 'activity' && <section className="admin-accounts-section">
        <div className="admin-accounts-section-heading"><div><h2>Sign-ins and sign-ups</h2><p>Recent account events, including approval decisions.</p></div><span>{events.length} recent events</span></div>
        <div className="admin-event-list">{events.length ? events.map((event) => <article className="admin-event-row" key={event.id}>
          <span className={`admin-event-kind event-${event.event_type}`}>{event.event_type.replaceAll('_', ' ')}</span>
          <div><strong>{event.name}</strong><small>{event.email}{event.client_category ? ` · ${event.client_category}` : ''}</small></div>
          <time>{formatDate(event.created_at)}</time>
        </article>) : <p className="admin-accounts-empty">No sign-in or sign-up events recorded yet.</p>}</div>
      </section>}
    </div>
  </main>;
}