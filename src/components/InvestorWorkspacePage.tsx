import { useEffect, useState } from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProtectedWorkspaceShell } from './WorkspaceChrome';
import './investorWorkspace.css';

type Opportunity = {
  id: number | string;
  title: string;
  city: string;
  price: string;
  period: string;
  image: string;
  kind: string;
  description: string;
};

export function InvestorWorkspacePage() {
  const { user, isLoading, openAuthModal, signOut } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'Investor') return;
    let isCurrent = true;
    fetch('/api/properties', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Investment inventory is unavailable.');
        const records = Array.isArray(payload?.properties) ? payload.properties : [];
        return records
          .filter((record: Record<string, unknown>) => {
            const kind = `${record.property_kind ?? ''} ${record.property_type ?? ''} ${record.title ?? ''}`;
            return record.approval_status !== 'Pending' && /land|plot|parcel|commercial|office|invest|sale/i.test(`${kind} ${record.transaction_type ?? ''}`);
          })
          .map((record: Record<string, unknown>) => ({
            id: record.id as number | string,
            title: String(record.title ?? 'Investment property'),
            city: String(record.city ?? 'Tanzania'),
            price: String(record.price ?? 'Price on request'),
            period: String(record.period ?? record.transaction_type ?? 'For sale'),
            image: String(record.image ?? record.thumbnail_url ?? ''),
            kind: /land|plot|parcel/i.test(String(record.title ?? ''))
              ? 'Land'
              : /office|commercial/i.test(String(record.title ?? ''))
                ? 'Commercial'
                : String(record.property_kind ?? record.transaction_type ?? 'Investment'),
            description: String(record.description ?? ''),
          } satisfies Opportunity));
      })
      .then((rows) => { if (isCurrent) setOpportunities(rows); })
      .catch((cause) => { if (isCurrent) setError(cause instanceof Error ? cause.message : 'Investment inventory is unavailable.'); })
      .finally(() => { if (isCurrent) setIsLoadingInventory(false); });
    return () => { isCurrent = false; };
  }, [user?.role]);

  if (isLoading) return <ProtectedWorkspaceShell section="Investor workspace" location="Dar es Salaam" backHref="/marketplace"><main className="investor-workspace-page"><p className="investor-workspace-state">Checking your FLX account…</p></main></ProtectedWorkspaceShell>;
  if (user?.role !== 'Investor') return <ProtectedWorkspaceShell section="Investor workspace" location="Dar es Salaam" backHref="/marketplace"><main className="investor-workspace-page"><section className="investor-workspace-access"><TrendingUp size={27} /><h1>Investor access required</h1><p>Sign in with an approved FLX Investor account to view investment opportunities.</p><button type="button" onClick={user ? signOut : openAuthModal}>{user ? 'Sign out' : 'Investor sign in'}</button></section></main></ProtectedWorkspaceShell>;

  return <ProtectedWorkspaceShell section="Investor workspace" location="Dar es Salaam" backHref="/marketplace"><main className="investor-workspace-page"><section className="investor-workspace-main">
      <div className="investor-workspace-heading"><div><span>INVESTOR DESK</span><h1>Investment opportunities</h1><p>Approved land, commercial, and sale listings from the FLX marketplace.</p></div><strong><TrendingUp size={17} /> {opportunities.length} opportunities</strong></div>
      {error && <p className="investor-workspace-error" role="alert">{error}</p>}
      {isLoadingInventory ? <p className="investor-workspace-state">Loading approved opportunities…</p> : opportunities.length ? <div className="investor-opportunity-grid">
        {opportunities.map((opportunity) => <article className="investor-opportunity" key={opportunity.id}>
          {opportunity.image ? <img src={opportunity.image} alt={opportunity.title} loading="lazy" /> : <div className="investor-opportunity-placeholder"><TrendingUp size={24} /></div>}
          <div className="investor-opportunity-body"><div className="investor-opportunity-meta"><span>{opportunity.kind}</span><span>{opportunity.city}</span></div><h2>{opportunity.title}</h2><p>{opportunity.description || 'Contact FLX to review the available listing details.'}</p><div className="investor-opportunity-footer"><strong>{opportunity.price}</strong><span>{opportunity.period}</span></div></div>
        </article>)}
      </div> : <section className="investor-workspace-empty"><TrendingUp size={25} /><h2>No approved opportunities yet</h2><p>New investment listings will appear here after they are approved for publication.</p><a href="/#properties">Browse all properties <ArrowUpRight size={15} /></a></section>}
    </section></main></ProtectedWorkspaceShell>;
}