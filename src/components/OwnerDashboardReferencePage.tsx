import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Bolt,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileCheck2,
  Landmark,
  LockKeyhole,
  Menu,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  TableProperties,
  WalletCards,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { getFallbackMarketplaceMapProperties, MarketplaceAccountAccess, parseMarketplacePrice } from './MarketplaceReferencePage';
import { RealEstateLeafletMap } from './RealEstateLeafletMap';
import type { Property } from '../types';
import './ownerDealPipeline.css';

type Notice = { tone: 'success' | 'error'; message: string } | null;
type Unit = { name: string; label: string; value: string; status: string };
type Dashboard = { totalRevenue: string; occupancy: string; paymentBalance: string; propertiesCount: number };
type OwnerData = { portfolio?: { totalRevenue: string; occupancy: string; paymentBalance: string; units: Unit[] }; maintenance?: Array<{ title: string; location: string; state: string }> };
type OwnerDeal = { id: number; title: string; status: string; amount?: string; note?: string };
type AgentData = { deals?: OwnerDeal[]; leads?: Array<{ id: number; title: string; note: string }> };
type OwnerListingRow = Record<string, unknown>;
type OwnerSearchResult = { id: string; kind: 'Deal' | 'Unit'; title: string; detail: string; workspace: string };

const fallbackUnits: Unit[] = [
  { name: 'Room 102-A', label: 'Mlimani Comfort Hostel', value: 'TZS 1,200,000', status: 'Move-in Pending' },
  { name: 'Bed 204-B', label: 'Mlimani Comfort Hostel', value: 'TZS 320,000 / mo', status: 'VACANT • Clean & Ready' },
  { name: 'Suite 4B', label: 'Posta Office Suites', value: 'TZS 2,000,000', status: 'Handover Scheduled' },
  { name: 'Apt 3 (2-Bedroom)', label: 'Kijitonyama Residential', value: 'TZS 1,100,000', status: 'Current (Paid 6 Mos)' },
];

const summaryFallback: Dashboard = { totalRevenue: 'TZS 14,800,000', occupancy: '94.1%', paymentBalance: 'TZS 3,200,000', propertiesCount: 34 };
const fallbackDeals: OwnerDeal[] = [
  { id: 1, title: 'Kassim & Friends (4 Scholars)', status: 'Urgent SLA 15m', note: 'Active lead with strong conversion signal.' },
  { id: 2, title: 'Adv. Brenda K. (LexAfrica TZ)', status: 'Walkthrough Today', note: 'Active lead with strong conversion signal.' },
  { id: 3, title: 'Dr. Josephat M. (UK Diaspora)', status: 'Drone Verification', note: 'Active lead with strong conversion signal.' },
];

function mapAvailableListing(row: OwnerListingRow): Property | null {
  const status = String(row.status ?? 'Approved').toLowerCase();
  const lat = Number(row.lat ?? row.latitude);
  const lng = Number(row.lng ?? row.longitude);
  if (!['approved', 'available'].includes(status) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const title = String(row.title ?? 'Available property');
  const city = String(row.city ?? 'Dar es Salaam');
  const image = String(row.image ?? row.thumbnail_url ?? '');
  const propertyType = String(row.property_type ?? row.type ?? title).toLowerCase();
  const images = Array.isArray(row.images) ? row.images.map(String) : image ? [image] : [];

  return {
    id: String(row.id ?? title),
    created_at: String(row.created_at ?? new Date().toISOString()),
    title,
    property_type: /invest|land|commercial|parcel|office/.test(propertyType) ? 'Invest' : 'Live',
    status: 'Approved',
    price: parseMarketplacePrice(String(row.price ?? '')),
    video_url: '',
    thumbnail_url: image,
    images,
    location: { lat, lng, address: city, city, state: 'Tanzania', zip: '14111' },
    agent: { id: 'flx-owner-map', name: 'FLX Realty', avatar: '', phone: '', email: '', license: 'FLX', role: 'Agent' },
    metadata: { beds: Number(String(row.beds ?? 0)) || 0, baths: Number(String(row.baths ?? 0)) || 0, sqft: Number(String(row.sqft ?? 0)) || 0 },
    description: String(row.description ?? ''),
  };
}

export function OwnerDashboardReferencePage() {
  const [dashboard, setDashboard] = useState<Dashboard>(summaryFallback);
  const [owner, setOwner] = useState<OwnerData>({ portfolio: { totalRevenue: summaryFallback.totalRevenue, occupancy: summaryFallback.occupancy, paymentBalance: summaryFallback.paymentBalance, units: fallbackUnits }, maintenance: [] });
  const [agent, setAgent] = useState<AgentData>({ deals: fallbackDeals });
  const [activeTab, setActiveTab] = useState('All Units');
  const [activeWorkspace, setActiveWorkspace] = useState('Dashboard / Overview');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [unitModal, setUnitModal] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [unitValue, setUnitValue] = useState('');
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const units = owner.portfolio?.units?.length ? owner.portfolio.units : fallbackUnits;
  const filteredUnits = useMemo(() => units.filter((unit) => `${unit.name} ${unit.label} ${unit.status}`.toLowerCase().includes(query.toLowerCase())), [query, units]);

  useEffect(() => {
    Promise.all([fetch('/api/dashboard'), fetch('/api/owner'), fetch('/api/agent/dashboard')])
      .then(async ([summaryResponse, ownerResponse, agentResponse]) => {
        if (summaryResponse.ok) setDashboard(await summaryResponse.json());
        if (ownerResponse.ok) setOwner(await ownerResponse.json());
        if (agentResponse.ok) setAgent(await agentResponse.json());
      })
      .catch(() => setNotice({ tone: 'error', message: 'Live owner data is unavailable. Showing the latest cached dashboard.' }));
  }, []);

  const syncOwner = async () => {
    const response = await fetch('/api/owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(owner) });
    if (!response.ok) throw new Error('Owner sync failed');
  };

  const addUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/owner/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: unitName, label: unitLabel, value: unitValue, status: 'New' }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setOwner((current) => ({ ...current, portfolio: payload.portfolio }));
      setUnitModal(false); setUnitName(''); setUnitLabel(''); setUnitValue('');
      setNotice({ tone: 'success', message: 'New unit added to the owner ledger.' });
    } catch { setNotice({ tone: 'error', message: 'The unit could not be added.' }); }
  };

  const dispatchFundi = async () => {
    setMaintenanceBusy(true);
    try {
      const response = await fetch('/api/ops/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Water Booster Pump Pressure Fault', summary: 'Mlimani Hostel - 3rd Floor Header Tank pressure dropped below 1.2 Bar.', action: 'Dispatch Fundi Hamisi' }) });
      if (!response.ok) throw new Error('Dispatch failed');
      setNotice({ tone: 'success', message: 'Fundi Hamisi has been dispatched and the SLA incident is logged.' });
    } catch { setNotice({ tone: 'error', message: 'Could not dispatch the fundi.' }); } finally { setMaintenanceBusy(false); }
  };

  const executePayout = async () => {
    try { await syncOwner(); setNotice({ tone: 'success', message: 'Payout request synced to the owner ledger.' }); } catch { setNotice({ tone: 'error', message: 'Payout sync failed.' }); }
  };

  const downloadCsv = () => {
    const csv = ['Unit,Property,Rate,Status', ...filteredUnits.map((unit) => `${unit.name},${unit.label},${unit.value},${unit.status}`)].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'flx-owner-units.csv'; link.click(); URL.revokeObjectURL(link.href);
  };

  return <div className="owner-reference-page">
    <aside className={`owner-reference-sidebar ${mobileNav ? 'is-open' : ''}`}><div className="owner-reference-logo"><span>FLX Realty</span><small>Deal OS Tanzania</small></div><div className="owner-reference-portfolio"><i /> <span><b>Haji Properties Ltd</b><small>Mwenge & Posta Portfolio</small></span><ChevronDown size={14} /></div><small className="owner-reference-nav-label">Enterprise Navigation</small><nav>{[['Dashboard / Overview', Activity], ['Deal Pipeline', ArrowRight], ['Property Portfolio & Units', Building2], ['Financials & Escrow Ledger', WalletCards], ['Maintenance & Fundis', Wrench], ['Contracts (Mkataba Pro)', FileCheck2], ['System Settings', Settings]].map(([label, Icon]) => <button key={String(label)} className={label === activeWorkspace ? 'is-active' : ''} type="button" onClick={() => { setActiveWorkspace(String(label)); setMobileNav(false); }}><Icon size={17} /><span>{label}</span></button>)}</nav><div className="owner-reference-node"><span>NODE STATUS <i /></span><b>TRA & Ardhi Mesh Sync</b><small>Dar es Salaam Tier-4 Gateway</small></div></aside>
    <div className="owner-reference-shell"><header className="owner-reference-header"><button className="owner-reference-menu" type="button" aria-label="Open navigation" onClick={() => setMobileNav((open) => !open)}>{mobileNav ? <X size={20} /> : <Menu size={20} />}</button><div className="owner-reference-place"><MapPinIcon /> Dar es Salaam, TZ</div><div className="owner-reference-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search deals, title deeds, Masaki / Upanga units, tenants..." /></div><button className="owner-reference-add" type="button" onClick={() => setUnitModal(true)}><Plus size={16} /> Add Unit / Listing</button><button className="owner-reference-notify" type="button" aria-label="Notifications"><Bell size={18} /></button><MarketplaceAccountAccess role="Owner" variant="owner" /></header>
      <main className="owner-reference-main"><section className="owner-reference-welcome"><div><div className="owner-reference-title"><h1>Karibu, Haji Properties</h1><span>✓ Super Landlord Tier-1</span><b>Mwenge, Posta & Kigamboni Holdings</b></div><p><CalendarDays size={14} /> Semester 1 Cycle (2024/2025) <i /> <strong>●</strong> Syncing M-Pesa Rails, Airtel Money & CRDB Escrow Gateway <i /> Last audited 4 mins ago</p></div><div className="owner-reference-welcome-actions"><button type="button" onClick={() => setNotice({ tone: 'success', message: 'TRA tax pack is ready to export.' })}><ClipboardList size={15} /> TRA Tax Pack</button><button type="button" onClick={() => setNotice({ tone: 'success', message: 'Bank rails are synchronized.' })}><Landmark size={15} /> Manage Bank Rails</button><button className="is-primary" type="button" onClick={executePayout}><Bolt size={15} /> Withdraw TZS 11,600,000 Liquid</button></div></section>
        <section className="owner-reference-kpis"><Metric label="Total Semester Revenue" value={dashboard.totalRevenue} note="+18.4% vs Q1 baseline (BOT Indexed)" icon={CircleDollarSign} tone="red" progress="82%" /><Metric label="BOT Escrow Vault" value={dashboard.paymentBalance} note="2 Pending Handover OTPs • CRDB Trustee Trust" icon={LockKeyhole} tone="orange" progress="45%" /><Metric label="Portfolio Occupancy" value={dashboard.occupancy} note="32 / 34 Active Units & Beds • 2 Vacant (Surge Hot)" icon={Building2} tone="ink" progress="94%" /><Metric label="Net Liquid Cashout" value="TZS 11,600,000" note="TRA 10% WHT Deducted • Instant M-Pesa / Tigo" icon={WalletCards} tone="dark" progress="100%" /></section>
        <div className="owner-reference-grid"><div className="owner-reference-left"><section className="owner-reference-panel"><PanelTitle icon={ShieldCheck} title="Real-Time Approvals & Key Handover Gate" badge="2 Action Required" action="Audit Trail Logs" onAction={() => setNotice({ tone: 'success', message: 'Audit trail loaded.' })} /><div className="owner-reference-deals"><Deal title="Amina K. (UDSM Year 1 Scholar)" meta="Bed 102-A • Mlimani Comfort Hostel (Mwenge Survey)" amount="TZS 1,200,000 (Sem 1 Wire in BOT Escrow)" tag="NIDA #1998*** Verified" icon={Building2} onClick={() => setNotice({ tone: 'success', message: 'Move-in review opened.' })} /><Deal title="Baraka M. (LexAfrica Advocates TZ)" meta="Suite 4B (Grade-A) • Posta Office Suites, Samora Ave" amount="TZS 2,000,000 (Monthly Wire Locked)" tag="TIN & BRELA Verified" icon={Landmark} onClick={() => setNotice({ tone: 'success', message: 'Handover OTP confirmed.' })} dark /><Deal title="Dr. Josephat M. (UK Diaspora - London)" meta="Cadastral Plot #492 (1,200 SQM) • Gezaulole, Kigamboni South" amount="TZS 38,000,000" tag="Diaspora ID Verified" icon={ShieldCheck} onClick={() => setNotice({ tone: 'success', message: 'Title escrow details opened.' })} /></div></section>
          <section className="owner-reference-panel"><PanelTitle icon={TableProperties} title="Active Portfolio & Bed Stock Ledger" subtitle="Real-time occupancy, LUKU sub-meter balances, and smart lease telemetry" /><div className="owner-reference-table-tools"><div>{['All Units', 'Student Hostels (20 Beds)', 'Commercial Suites (2)', 'Apartments (8)', 'Titled Land (4)', 'Vacant & Surging (2)'].map((tab) => <button type="button" className={activeTab === tab ? 'is-active' : ''} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div><span><button type="button"><SlidersIcon /> Filter</button><button type="button" onClick={downloadCsv}><Download size={13} /> CSV</button></span></div><div className="owner-reference-table-wrap"><table><thead><tr><th>Unit & Property</th><th>Corridor / Area</th><th>Current Tenant / Bed</th><th>Rate & Lease Cycle</th><th>IoT & LUKU Telemetry</th><th>Actions</th></tr></thead><tbody>{filteredUnits.map((unit, index) => <tr className={unit.status.includes('VACANT') ? 'is-vacant' : ''} key={`${unit.name}-${index}`}><td><b><i />{unit.name}</b><small>{unit.label}</small></td><td><b>{index % 2 ? 'Mwenge Survey' : 'Samora Avenue'}</b><small>{index % 2 ? 'Near UDSM Gate 2' : 'Dar CBD Posta'}</small></td><td><b>{unit.status.includes('VACANT') ? 'VACANT • Clean & Ready' : index === 0 ? 'Amina K. (Incoming)' : 'LexAfrica Advocates'}</b><small>{unit.status}</small></td><td><b>{unit.value}</b><small>{index % 2 ? 'Monthly Commercial' : 'Sem 1 (5 Months)'}</small></td><td><b className="telemetry">⚡ TZS {index ? '78,000' : '34,200'} LUKU</b><small>{index ? 'DAWASA Direct Line' : 'Water Tank 94%'}</small></td><td><button type="button" onClick={() => setNotice({ tone: 'success', message: `${unit.name} management panel opened.` })}>{unit.status.includes('VACANT') ? 'Promote Deal' : 'Manage'}</button></td></tr>)}</tbody></table></div><div className="owner-reference-table-footer"><span>Showing {filteredUnits.length} of {dashboard.propertiesCount || 34} Active Units & Plots across Dar es Salaam</span><span><button type="button"><ChevronLeft size={14} /></button> Page 1 of 9 <button type="button"><ChevronRight size={14} /></button></span></div></section><div className="owner-reference-property-previews"><PreviewCard image="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85" title="Survey Corridor Asset" subtitle="High student intake demand from UDSM & Ardhi" value="90% Full" badge="18 / 20 Beds Leased" /><PreviewCard image="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85" title="Corporate Legal Suites" subtitle="Long-term tenancy, CRDB automated direct debit" value="TZS 4.0M/mo" badge="100% Leased" /></div></div>
          <div className="owner-reference-right"><section className="owner-reference-panel owner-reference-maintenance"><PanelTitle icon={AlertTriangle} title="Urgent SLA Maintenance" badge="Level 1 Critical" /><div className="owner-reference-alert"><div><b>Water Booster Pump Pressure Fault</b><span>⏱ 2h 14m SLA</span></div><p>Mlimani Hostel • 3rd Floor Header Tank (Feeds Room 301 & 304). Pressure dropped below 1.2 Bar at 08:14 EAT.</p><button className="is-primary" type="button" disabled={maintenanceBusy} onClick={dispatchFundi}>{maintenanceBusy ? 'Dispatching...' : '☎ Dispatch Fundi Hamisi'}</button><button type="button" onClick={() => setNotice({ tone: 'success', message: 'IoT reset command queued.' })}>IoT Reset</button></div><span className="owner-reference-subhead">SMART BUILDING TELEMETRY</span><Telemetry label="DAWASA Mains Supply" value="36,000L Reserve (90%)" icon="💧" /><Telemetry label="LUKU Master Mwenge" value="TZS 184,500 (~24 Days)" icon="⚡" /><Telemetry label="Standby Generator" value="98% Diesel Tank Ready" icon="⛽" /></section><section className="owner-reference-panel"><PanelTitle icon={Activity} title="Intake Surge Engine" badge="+14% Index" /><h3>UDSM & Ardhi Corridor Spike</h3><p className="owner-reference-body-copy">Admissions window starts in 3 days. Demand for single beds within 800m of Survey bus stop has spiked 3.4x this week.</p><div className="owner-reference-surge"><span>Vacant Bed 301 (Mlimani): <s>TZS 280,000</s></span><strong>Recommended Listing Price: <b>TZS 290,000</b></strong><button type="button" onClick={() => setNotice({ tone: 'success', message: 'TZS 10k surge applied to Bed 301.' })}>Apply +TZS 10k Surge</button><button type="button">Dismiss</button></div></section><section className="owner-reference-panel"><PanelTitle icon={Zap} title="Instant Escrow Disbursement" /><div className="owner-reference-payout"><span>Available Liquid Balance: <b>TZS 11,600,000</b></span><span>TRA 10% Withholding Tax (WHT): <b>- TZS 1,160,000</b></span><strong>Net Disbursed to Account: <b>TZS 10,440,000</b></strong></div><label className="owner-reference-radio"><input type="radio" defaultChecked name="payout" /> <span><b>Vodacom M-Pesa Boma Lipa</b><small>Till #984210 (Haji Properties)</small></span><em>Instant (0s)</em></label><label className="owner-reference-radio"><input type="radio" name="payout" /> <span><b>CRDB Bank Corporate RTGS</b><small>Acct #015029***4400</small></span><em>&lt; 15 mins</em></label><label className="owner-reference-radio"><input type="radio" name="payout" /> <span><b>Airtel Money Agent Wallet</b><small>+255 784 *** 902</small></span><em>Instant (0s)</em></label><button className="owner-reference-payout-button" type="button" onClick={executePayout}><Smartphone size={17} /> Execute Instant Payout (TZS 10,440,000)</button><small className="owner-reference-protection">Protected by Bank of Tanzania (BOT) FinTech Directive 2024 & 256-bit Ardhi Ledger</small></section></div>
        </div>
      </main>
      {activeWorkspace !== 'Dashboard / Overview' && <OwnerWorkspacePage workspace={activeWorkspace} dashboard={dashboard} units={units} deals={agent.deals ?? []} maintenance={owner.maintenance ?? []} onClose={() => setActiveWorkspace('Dashboard / Overview')} onNavigate={setActiveWorkspace} onAddUnit={() => setUnitModal(true)} onPayout={executePayout} onDispatch={dispatchFundi} onExport={downloadCsv} onNotice={(message) => setNotice({ tone: 'success', message })} />}
    </div>
    {notice && <div className={`owner-reference-notice ${notice.tone}`}>{notice.message}<button type="button" onClick={() => setNotice(null)}><X size={15} /></button></div>}
    {unitModal && <div className="owner-reference-modal-backdrop" onClick={() => setUnitModal(false)}><form className="owner-reference-modal" onClick={(event) => event.stopPropagation()} onSubmit={addUnit}><button className="owner-reference-modal-close" type="button" onClick={() => setUnitModal(false)}><X size={17} /></button><Plus size={23} /><h2>Add unit to portfolio</h2><input required value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Unit name" /><input required value={unitLabel} onChange={(event) => setUnitLabel(event.target.value)} placeholder="Property name" /><input required value={unitValue} onChange={(event) => setUnitValue(event.target.value)} placeholder="Rate" /><button className="is-primary" type="submit">Add unit <ArrowRight size={15} /></button></form></div>}
  </div>;
}

function OwnerWorkspacePage({ workspace, dashboard, units, deals, maintenance, onClose, onNavigate, onAddUnit, onPayout, onDispatch, onExport, onNotice }: { workspace: string; dashboard: Dashboard; units: Unit[]; deals: Array<{ id: number; title: string; status: string; amount?: string; note?: string }>; maintenance: Array<{ title: string; location: string; state: string }>; onClose: () => void; onNavigate: (workspace: string) => void; onAddUnit: () => void; onPayout: () => void; onDispatch: () => void; onExport: () => void; onNotice: (message: string) => void }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [mapProperties, setMapProperties] = useState<Property[]>(getFallbackMarketplaceMapProperties);
  const [mapError, setMapError] = useState('');
  const [selectedMapProperty, setSelectedMapProperty] = useState<Property | null>(null);
    useEffect(() => {
      const bodyOverflow = document.body.style.overflow;
      const documentOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = bodyOverflow;
        document.documentElement.style.overflow = documentOverflow;
      };
    }, []);
  useEffect(() => {
    let isCurrent = true;
    fetch('/api/properties')
      .then(async (response) => {
        if (!response.ok) throw new Error('Property inventory request failed');
        return response.json() as Promise<{ properties?: OwnerListingRow[] }>;
      })
      .then((payload) => {
        if (!isCurrent) return;
        const availableProperties = (payload.properties ?? []).map(mapAvailableListing).filter((property): property is Property => property !== null);
        setMapProperties(availableProperties);
        setMapError(availableProperties.length ? '' : 'No approved properties are available right now.');
      })
      .catch(() => {
        if (!isCurrent) return;
        setMapProperties(getFallbackMarketplaceMapProperties());
        setMapError('Live inventory is unavailable. Showing cached properties.');
      });
    return () => { isCurrent = false; };
  }, []);
  const searchResults = useMemo<OwnerSearchResult[]>(() => {
    const normalizedQuery = headerSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];
    const dealResults = deals
      .filter((deal) => `${deal.title} ${deal.status} ${deal.note ?? ''}`.toLowerCase().includes(normalizedQuery))
      .map((deal) => ({ id: `deal-${deal.id}`, kind: 'Deal' as const, title: deal.title, detail: deal.status, workspace: 'Deal Pipeline' }));
    const unitResults = units
      .filter((unit) => `${unit.name} ${unit.label} ${unit.status} ${unit.value}`.toLowerCase().includes(normalizedQuery))
      .map((unit) => ({ id: `unit-${unit.name}`, kind: 'Unit' as const, title: unit.name, detail: `${unit.label} · ${unit.status}`, workspace: 'Property Portfolio & Units' }));
    return [...dealResults, ...unitResults].slice(0, 7);
  }, [deals, headerSearch, units]);
  const titles: Record<string, string> = {
    'Deal Pipeline': 'Deal pipeline',
    'Property Portfolio & Units': 'Property portfolio & units',
    'Financials & Escrow Ledger': 'Financials & escrow ledger',
    'Maintenance & Fundis': 'Maintenance & fundis',
    'Contracts (Mkataba Pro)': 'Contracts',
    'System Settings': 'System settings',
  };

  return <section className={`owner-reference-workspace ${workspace === 'Deal Pipeline' ? 'is-deal-pipeline' : ''}`} style={{ background: '#f6f5f2' }}>
    <header className="owner-workspace-topbar">
      <div className="owner-workspace-searchbox">
        <label className="owner-workspace-search-field"><Search size={16} /><input aria-label="Search deals and portfolio units" value={headerSearch} onChange={(event) => setHeaderSearch(event.target.value)} placeholder="Search deals, units, tenants..." />{headerSearch && <button type="button" aria-label="Clear search" onClick={() => setHeaderSearch('')}><X size={15} /></button>}</label>
        {headerSearch.trim() && <div className="owner-workspace-search-results" role="listbox" aria-label="Search results">
          {searchResults.length ? searchResults.map((result) => <button type="button" role="option" aria-selected="false" key={result.id} onClick={() => { setHeaderSearch(''); onNavigate(result.workspace); }}><span><b>{result.title}</b><small>{result.detail}</small></span><em>{result.kind}</em></button>) : <p>No matching deals or units.</p>}
        </div>}
      </div>
      <div className="owner-workspace-utilities"><button className="owner-workspace-place" type="button" aria-label="Open map of available properties" aria-expanded={mapOpen} onClick={() => { setSelectedMapProperty(null); setMapOpen((open) => !open); }}><MapPin size={15} /><span>Dar es Salaam, TZ</span></button><button className="owner-workspace-notifications" type="button" aria-label="Notifications" onClick={() => onNotice('You are all caught up.')}><Bell size={18} /></button><MarketplaceAccountAccess role="Owner" variant="owner" /></div>
    </header>
    <div className={`owner-workspace-content ${workspace === 'Deal Pipeline' ? 'is-deal-pipeline' : ''}`} style={{ padding: workspace === 'Deal Pipeline' ? '20px clamp(14px, 3vw, 38px)' : '32px max(24px, calc((100vw - 1120px) / 2))' }}>
    <header className="owner-reference-panel-title"><div><Building2 size={18} /><h1>{titles[workspace] ?? workspace}</h1></div></header>
    {workspace === 'Deal Pipeline' && <OwnerDealPipeline deals={deals} />}
    {workspace === 'Property Portfolio & Units' && <section className="owner-reference-panel"><PanelTitle icon={Building2} title="Portfolio units" subtitle={`${units.length} registered units`} /><div className="owner-reference-table-tools"><span><button type="button" onClick={onAddUnit}><Plus size={13} /> Add unit</button><button type="button" onClick={onExport}><Download size={13} /> Export CSV</button></span></div><div className="owner-reference-table-wrap"><table><thead><tr><th>Unit</th><th>Property</th><th>Rate</th><th>Status</th></tr></thead><tbody>{units.map((unit) => <tr key={unit.name}><td><b>{unit.name}</b></td><td>{unit.label}</td><td>{unit.value}</td><td>{unit.status}</td></tr>)}</tbody></table></div></section>}
    {workspace === 'Financials & Escrow Ledger' && <section className="owner-reference-panel"><PanelTitle icon={WalletCards} title="Owner ledger" badge="BOT escrow synced" /><div className="owner-reference-kpis"><Metric label="Semester revenue" value={dashboard.totalRevenue} note="Current reporting cycle" icon={CircleDollarSign} tone="red" progress="82%" /><Metric label="Escrow balance" value={dashboard.paymentBalance} note="Pending settlement" icon={LockKeyhole} tone="orange" progress="45%" /><Metric label="Occupancy" value={dashboard.occupancy} note="Across registered units" icon={Building2} tone="ink" progress="94%" /></div><button className="is-primary" type="button" onClick={onPayout}><Bolt size={15} /> Request withdrawal</button></section>}
    {workspace === 'Maintenance & Fundis' && <section className="owner-reference-panel"><PanelTitle icon={Wrench} title="Maintenance requests" badge={`${maintenance.length} logged`} /><div className="owner-reference-alert"><b>Water Booster Pump Pressure Fault</b><p>Mlimani Hostel • Fundi dispatch available</p><button className="is-primary" type="button" onClick={onDispatch}>Dispatch Fundi Hamisi</button></div>{maintenance.map((item, index) => <article className="owner-reference-deal" key={`${item.title}-${index}`}><div className="owner-reference-deal-body"><b>{item.title}</b><p>{item.location}</p><span>{item.state}</span></div></article>)}</section>}
    {workspace === 'Contracts (Mkataba Pro)' && <section className="owner-reference-panel"><PanelTitle icon={FileCheck2} title="Contracts & handovers" badge={`${deals.length} active records`} />{deals.map((deal) => <article className="owner-reference-deal" key={deal.id}><div className="owner-reference-deal-body"><b>{deal.title}</b><span>{deal.status}</span><p>{deal.note || 'Lease documents are ready for review.'}</p></div><a href="/legal/escrow">Open escrow room <ArrowRight size={13} /></a></article>)}{deals.length === 0 && <a href="/legal/escrow">Open escrow deal room <ArrowRight size={13} /></a>}</section>}
    {workspace === 'System Settings' && <section className="owner-reference-panel"><PanelTitle icon={Settings} title="Workspace preferences" subtitle="Settings apply to this browser profile." /><label className="owner-reference-setting"><span><b>Operational notifications</b><small>Maintenance, payment, and handover alerts</small></span><input type="checkbox" checked={notificationsEnabled} onChange={() => setNotificationsEnabled((enabled) => !enabled)} /></label><label className="owner-reference-setting"><span><b>Automatic payout reminders</b><small>Notify when escrow funds become available</small></span><input type="checkbox" checked={autoPayoutEnabled} onChange={() => setAutoPayoutEnabled((enabled) => !enabled)} /></label></section>}
    </div>
    {mapOpen && <div className="owner-property-map-overlay" onClick={() => setMapOpen(false)}><section className="owner-property-map-dialog" role="dialog" aria-modal="true" aria-labelledby="owner-property-map-title" onClick={(event) => event.stopPropagation()}>
      <header><div><span>FLX PROPERTY INVENTORY</span><h2 id="owner-property-map-title">Available properties</h2><small>{mapProperties.length} mapped listings</small></div><button type="button" aria-label="Close property map" onClick={() => setMapOpen(false)}><X size={18} /></button></header>
      {mapError && <p className="owner-property-map-notice">{mapError}</p>}
      <div className="owner-property-map-canvas">{mapProperties.length ? <RealEstateLeafletMap properties={mapProperties} selectedProperty={selectedMapProperty} onSelectProperty={setSelectedMapProperty} onOpenDetails={setSelectedMapProperty} userLocation={null} /> : <p>No approved properties are available to display.</p>}</div>
      <footer>{selectedMapProperty ? <div><strong>{selectedMapProperty.title}</strong><span>{selectedMapProperty.location.city} · TZS {selectedMapProperty.price.toLocaleString()}</span></div> : <span>Select a marker to inspect a property.</span>}<span className="owner-property-map-legend"><i /> Available</span></footer>
    </section></div>}
  </section>;
}

const dealPipelineStages = ['New inquiry', 'Viewing', 'Due diligence', 'Offer & escrow', 'Closing'] as const;
type DealPipelineStage = (typeof dealPipelineStages)[number];

function getDealPipelineStage(status: string): DealPipelineStage {
  const normalizedStatus = status.toLowerCase();
  if (/(closed|handover|move-in|disburse|release)/.test(normalizedStatus)) return 'Closing';
  if (/(offer|escrow|contract|lease|document)/.test(normalizedStatus)) return 'Offer & escrow';
  if (/(verification|survey|title|diligence|drone)/.test(normalizedStatus)) return 'Due diligence';
  if (/(walkthrough|viewing|inspection|tour|scheduled)/.test(normalizedStatus)) return 'Viewing';
  return 'New inquiry';
}

function OwnerDealPipeline({ deals }: { deals: OwnerDeal[] }) {
  const [search, setSearch] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<OwnerDeal | null>(null);
  const filteredDeals = useMemo(() => deals.filter((deal) => `${deal.title} ${deal.status} ${deal.note || ''}`.toLowerCase().includes(search.toLowerCase())), [deals, search]);
  const needsAttention = deals.filter((deal) => /(urgent|sla|overdue|action required)/i.test(deal.status)).length;
  const verificationCount = deals.filter((deal) => getDealPipelineStage(deal.status) === 'Due diligence').length;
  const escrowCount = deals.filter((deal) => getDealPipelineStage(deal.status) === 'Offer & escrow').length;

  return <div className="owner-deal-pipeline">
    <div className="owner-pipeline-summary" aria-label="Deal pipeline summary">
      <div><span>Active deals</span><strong>{deals.length}</strong></div>
      <div><span>Needs attention</span><strong>{needsAttention}</strong></div>
      <div><span>In verification</span><strong>{verificationCount}</strong></div>
      <div><span>Offer & escrow</span><strong>{escrowCount}</strong></div>
    </div>
    <div className="owner-pipeline-toolbar">
      <label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search deals, clients, or status" /></label>
      <span>{filteredDeals.length} of {deals.length} deals</span>
    </div>
    <div className="owner-pipeline-board">
      {dealPipelineStages.map((stage) => {
        const stageDeals = filteredDeals.filter((deal) => getDealPipelineStage(deal.status) === stage);
        return <section className="owner-pipeline-lane" data-stage={stage.toLowerCase().replaceAll(' ', '-').replace('&', 'and')} key={stage}>
          <header><h2>{stage}</h2><span>{stageDeals.length}</span></header>
          <div className="owner-pipeline-cards">
            {stageDeals.length ? stageDeals.map((deal) => <article className={`owner-pipeline-card ${selectedDeal?.id === deal.id ? 'is-selected' : ''}`} key={deal.id}>
              <div className="owner-pipeline-card-status"><span className={/(urgent|sla|overdue)/i.test(deal.status) ? 'is-urgent' : ''}>{deal.status}</span><small>#{deal.id}</small></div>
              <h3>{deal.title}</h3>
              <p>{deal.note || 'No additional notes.'}</p>
              <footer><span><CircleDollarSign size={14} /> {deal.amount || 'Value pending'}</span><button type="button" onClick={() => setSelectedDeal(deal)}>Review <ArrowRight size={14} /></button></footer>
            </article>) : <p className="owner-pipeline-empty">{search ? 'No matching deals.' : 'No deals at this stage.'}</p>}
          </div>
        </section>;
      })}
    </div>
    {selectedDeal && <section className="owner-pipeline-detail" aria-label="Selected deal details">
      <div className="owner-pipeline-detail-heading"><div><span>DEAL REVIEW</span><h2>{selectedDeal.title}</h2></div><button type="button" aria-label="Close deal details" onClick={() => setSelectedDeal(null)}><X size={17} /></button></div>
      <dl><div><dt>Pipeline stage</dt><dd>{getDealPipelineStage(selectedDeal.status)}</dd></div><div><dt>Current status</dt><dd>{selectedDeal.status}</dd></div><div><dt>Deal value</dt><dd>{selectedDeal.amount || 'Not provided'}</dd></div></dl>
      <p>{selectedDeal.note || 'No additional notes have been added to this deal.'}</p>
      <a href="/legal/escrow">Open escrow workspace <ArrowRight size={14} /></a>
    </section>}
  </div>;
}

function MapPinIcon() { return <span className="owner-reference-pin">●</span>; }
function SlidersIcon() { return <SlidersIconInner />; }
function SlidersIconInner() { return <Settings size={13} />; }
function Metric({ label, value, note, icon: Icon, tone, progress }: { label: string; value: string; note: string; icon: typeof Activity; tone: string; progress: string }) { return <article className={`owner-reference-metric ${tone === 'dark' ? 'is-dark' : ''}`}><div><span>{label}</span><strong>{value}</strong></div><Icon size={21} /><p>{note}</p><i><b style={{ width: progress }} /></i></article>; }
function PanelTitle({ icon: Icon, title, subtitle, badge, action, onAction }: { icon: typeof Activity; title: string; subtitle?: string; badge?: string; action?: string; onAction?: () => void }) { return <div className="owner-reference-panel-title"><div><Icon size={18} /><h2>{title}</h2>{badge && <span>{badge}</span>}</div>{subtitle && <p>{subtitle}</p>}{action && <button type="button" onClick={onAction}>{action} <ChevronRight size={14} /></button>}</div>; }
function Deal({ title, meta, amount, tag, icon: Icon, onClick, dark }: { title: string; meta: string; amount: string; tag: string; icon: typeof Building2; onClick: () => void; dark?: boolean }) { return <article className="owner-reference-deal"><div className={`owner-reference-deal-icon ${dark ? 'is-orange' : ''}`}><Icon size={22} /></div><div className="owner-reference-deal-body"><div><b>{title}</b><span>{tag}</span></div><p>{meta}</p><strong>{amount}</strong><small>● {dark ? 'Ready to disburse' : 'Reservation hold window expires in 42 minutes'}</small></div><button type="button" className={dark ? 'is-dark' : ''} onClick={onClick}>{dark ? '✓ Confirm Handover & Release' : 'Review & Accept Move-In →'}</button></article>; }
function Telemetry({ label, value, icon }: { label: string; value: string; icon: string }) { return <div className="owner-reference-telemetry"><span>{icon} {label}</span><b>{value}</b></div>; }
function PreviewCard({ image, title, subtitle, value, badge }: { image: string; title: string; subtitle: string; value: string; badge: string }) { return <article className="owner-reference-preview"><div><img src={image} alt={title} /><b>{badge}</b></div><span><strong>{title}</strong><small>{subtitle}</small></span><em>{value}</em></article>; }
