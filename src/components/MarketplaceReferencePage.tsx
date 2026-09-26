import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  Heart,
  Layers3,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  BriefcaseBusiness,
  LogOut,
  UserRound,
} from 'lucide-react';
import { RealEstateLeafletMap } from './RealEstateLeafletMap';
import { useAuth } from '../context/AuthContext';
import { signOut as signOutApi } from '../auth';
import './marketAccount.css';
import type { Property, PropertyType } from '../types';

type MarketListing = {
  id: number;
  title: string;
  city: string;
  price: string;
  period: string;
  image: string;
  images: string[];
  videoUrl: string;
  badge: string;
  tag: string;
  verification: string;
  description: string;
  status: string;
  type: 'Student Living' | 'Commercial' | 'Land' | 'Residential';
  intent: 'Buy' | 'Rent';
  lat: number | null;
  lng: number | null;
};

type Notice = { tone: 'success' | 'error'; message: string } | null;

const normalizeListing = (row: any, index: number): MarketListing => {
  const title = String(row.title ?? `Property ${index + 1}`);
  const period = String(row.period ?? '');
  const rawPrice = String(row.price ?? '');
  const lowerTitle = title.toLowerCase();
  const type: MarketListing['type'] = lowerTitle.includes('hostel') || lowerTitle.includes('student') ? 'Student Living' : lowerTitle.includes('office') || lowerTitle.includes('tower') || lowerTitle.includes('commercial') ? 'Commercial' : lowerTitle.includes('parcel') || lowerTitle.includes('land') || /\bland\b/i.test(period) ? 'Land' : 'Residential';
  const image = String(row.image ?? row.thumbnail_url ?? '');
  const images = Array.isArray(row.images) ? row.images.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0) : [];
  const lat = Number(row.lat ?? row.latitude);
  const lng = Number(row.lng ?? row.longitude);
  const intent: MarketListing['intent'] = type === 'Land' || !/\/(?:mo|month)|per\s+(?:month|semester|week|night)|\bsemester\b/i.test(`${rawPrice} ${period}`) ? 'Buy' : 'Rent';
  return {
    id: Number(row.id ?? index + 1),
    title,
    city: String(row.city ?? ''),
    price: rawPrice.replace('/sem', '').replace('/mo', ''),
    period,
    image,
    images: [...new Set([image, ...images].filter(Boolean))],
    videoUrl: String(row.video_url ?? row.videoUrl ?? ''),
    badge: String(row.badge ?? type),
    tag: String(row.tag ?? ''),
    verification: String(row.verification ?? ''),
    description: String(row.description ?? ''),
    status: String(row.status ?? 'Status unavailable'),
    type,
    intent,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
};

const toMapProperty = (listing: MarketListing): Property => ({
  id: String(listing.id),
  created_at: new Date().toISOString(),
  title: listing.title,
  property_type: listing.intent === 'Buy' ? 'Invest' : 'Live',
  status: 'Approved',
  price: parseMarketplacePrice(listing.price),
  video_url: listing.videoUrl,
  thumbnail_url: listing.image,
  images: listing.images,
  location: { lat: listing.lat ?? 0, lng: listing.lng ?? 0, address: listing.city, city: listing.city, state: 'Tanzania', zip: '' },
  agent: { id: 'flx-market', name: 'FLX Real Estate', avatar: '', phone: '+255 712 345 678', email: 'hello@flxrealty.com', license: 'FLX', role: 'Agent' },
  metadata: { beds: listing.type === 'Student Living' ? 4 : 0, baths: 2, sqft: listing.type === 'Land' ? 800 : 2300 },
  description: listing.description,
});

export function parseMarketplacePrice(price: string | number): number {
  const normalizedPrice = String(price).toLowerCase().replace(/,/g, '');
  const amount = Number(normalizedPrice.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
  if (/\d\s*(?:k|thousand)\b/.test(normalizedPrice)) return amount * 1000;
  if (/\d\s*(?:m|million)\b/.test(normalizedPrice)) return amount * 1_000_000;
  return amount;
}

export function getFallbackMarketplaceMapProperties(): Property[] {
  return [];
}

export function MarketplaceAccountAccess({ role, variant = 'marketplace' }: { role: 'Client' | 'Owner'; variant?: 'marketplace' | 'owner' }) {
  const { user, signOut } = useAuth();
  const storageKey = `flx-profile-${role.toLowerCase()}`;
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(() => {
    const fallback = { name: user?.name || (role === 'Owner' ? 'Mzee Hamisi' : 'Aisha Mtega'), email: user?.email || (role === 'Owner' ? 'hamisi@flx.local' : 'aisha@flx.local'), phone: '+255 712 345 678' };
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? { ...fallback, ...JSON.parse(stored) as Partial<typeof fallback> } : fallback;
    } catch {
      return fallback;
    }
  });
  const [notice, setNotice] = useState('');

  const updateProfile = (field: keyof typeof profile, value: string) => setProfile((current) => ({ ...current, [field]: value }));
  const openWorkspace = (nextRole: 'Client' | 'Agent' | 'Owner' | 'Ops') => {
    const destinations = { Client: '/#marketplace', Agent: '/workspace#agent', Owner: '/owner', Ops: '/workspace#ops' };
    window.location.assign(destinations[nextRole]);
  };
  const handleSignOut = () => {
    signOut();
    signOutApi();
    localStorage.removeItem('flx-user');
    window.location.assign('/');
  };

  return <>
    <button className={variant === 'owner' ? 'market-account-owner-trigger' : 'market-reference-avatar'} type="button" aria-label="Open profile and workspace menu" onClick={() => { setIsOpen(true); setNotice(''); }}>
      {variant === 'owner' ? <><span className="market-account-owner-initials">{profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><b>{profile.name}<small>Property owner</small></b><ChevronDown size={14} /></> : profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
    </button>
    {isOpen && createPortal(<div className="market-account-backdrop" onClick={() => setIsOpen(false)}>
      <section className="market-account-modal" role="dialog" aria-modal="true" aria-labelledby="market-account-title" onClick={(event) => event.stopPropagation()}>
        <header><div><span>FLX ACCOUNT</span><h2 id="market-account-title">Profile & workspaces</h2></div><button type="button" aria-label="Close profile" onClick={() => setIsOpen(false)}><X size={18} /></button></header>
        <div className="market-account-identity"><span>{profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{profile.name}</strong><small>{profile.email} · {role} profile</small></div></div>
        <form onSubmit={(event) => { event.preventDefault(); localStorage.setItem(storageKey, JSON.stringify(profile)); setNotice('Profile changes saved.'); }}>
          <label>Full name<input value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} required /></label>
          <label>Email address<input type="email" value={profile.email} onChange={(event) => updateProfile('email', event.target.value)} required /></label>
          <label>Phone number<input value={profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} /></label>
          <button className="market-account-save" type="submit"><Check size={15} /> Save profile</button>
        </form>
        {notice && <p className="market-account-notice" role="status">{notice}</p>}
        <div className="market-account-workspaces"><span>LOG IN AS ANOTHER ROLE</span>{([
          ['Client', 'Marketplace', UserRound],
          ['Agent', 'Agent workspace', BriefcaseBusiness],
          ['Owner', 'Owner workspace', Building2],
          ['Ops', 'Operations center', ShieldCheck],
        ] as const).map(([nextRole, label, Icon]) => <button type="button" key={nextRole} onClick={() => openWorkspace(nextRole)}><Icon size={16} /><span>{label}</span><ArrowRight size={14} /></button>)}</div>
        <button className="market-account-signout" type="button" onClick={handleSignOut}><LogOut size={15} /> Sign out and return to marketplace</button>
      </section>
    </div>, document.body)}
  </>;
}

export function MarketplaceReferencePage() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Units');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Ministry Vetted (NLLS Live)');
  const [compared, setCompared] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [selected, setSelected] = useState<MarketListing | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionName, setInspectionName] = useState('');
  const [inspectionEmail, setInspectionEmail] = useState('');
  const [inspectionPhone, setInspectionPhone] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [activeMedia, setActiveMedia] = useState<'photos' | 'video'>('photos');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [mapLayer, setMapLayer] = useState<'Cadastral' | 'Satellite' | 'DAWASA' | 'BRT'>('Cadastral');

  useEffect(() => {
    let isCurrent = true;
    fetch('/api/properties', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Inventory request failed (${response.status}).`);
        return response.json();
      })
      .then((payload) => {
        if (isCurrent) setListings(Array.isArray(payload.properties) ? payload.properties.map(normalizeListing) : []);
      })
      .catch((error) => {
        if (isCurrent) setInventoryError(error instanceof Error ? error.message : 'Inventory is unavailable.');
      })
      .finally(() => { if (isCurrent) setInventoryLoading(false); });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    const syncCategoryFromHash = () => {
      const hashCategories: Record<string, string> = {
        '#marketplace': 'All Units',
        '#hostels': 'Student Hostels',
        '#commercial': 'Commercial Offices',
        '#land': 'Cadastral Plots & Land',
      };
      const category = hashCategories[window.location.hash.toLowerCase()];
      if (category) setActiveCategory(category);
    };

    syncCategoryFromHash();
    window.addEventListener('hashchange', syncCategoryFromHash);
    return () => window.removeEventListener('hashchange', syncCategoryFromHash);
  }, []);

  const visibleListings = useMemo(() => {
    const categoryTypes: Record<string, MarketListing['type'][]> = {
      'Student Hostels': ['Student Living'],
      'Commercial Offices': ['Commercial'],
      'Cadastral Plots & Land': ['Land'],
      'Luxury Flats': ['Residential'],
    };
    const categoryTypesForFilter = categoryTypes[activeCategory];
    const filtered = listings.filter((listing) => {
      const haystack = `${listing.title} ${listing.city} ${listing.type} ${listing.tag}`.toLowerCase();
      return (!query || haystack.includes(query.toLowerCase())) && (!categoryTypesForFilter || categoryTypesForFilter.includes(listing.type));
    });
    return [...filtered].sort((a, b) => sort === 'Price: Low to High' ? Number(a.price.replace(/[^0-9]/g, '')) - Number(b.price.replace(/[^0-9]/g, '')) : a.id - b.id);
  }, [activeCategory, listings, query, sort]);

  const mapProperties = useMemo(() => visibleListings.filter((listing) => listing.lat !== null && listing.lng !== null).map(toMapProperty), [visibleListings]);

  const toggleCompare = (listing: MarketListing) => {
    setCompared((current) => current.includes(listing.id) ? current.filter((id) => id !== listing.id) : current.length < 2 ? [...current, listing.id] : current);
  };

  const toggleSaved = async (listing: MarketListing) => {
    try {
      const response = await fetch('/api/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@flx.local', propertyId: listing.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setSaved(payload.savedIds || []);
      setNotice({ tone: 'success', message: payload.saved ? `${listing.title} saved to your watchlist.` : `${listing.title} removed from your watchlist.` });
    } catch { setNotice({ tone: 'error', message: 'Could not update your watchlist.' }); }
  };

  const submitInspection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !inspectionName.trim() || (!inspectionEmail.trim() && !inspectionPhone.trim()) || !contactConsent || requestBusy) return;
    setRequestBusy(true);
    setRequestMessage('');
    try {
      const response = await fetch(`/api/properties/${selected.id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: inspectionName.trim(),
          client_email: inspectionEmail.trim(),
          client_phone: inspectionPhone.trim(),
          intent: selected.intent,
          preferred_date: inspectionDate ? new Date(inspectionDate).toISOString() : null,
          consent: contactConsent,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Request could not be recorded.');
      setRequestMessage(payload.message || 'Request recorded for review.');
      setNotice({ tone: 'success', message: 'Your request is with the FLX team for availability review. No payment has been taken.' });
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : 'Request could not be recorded.');
    } finally {
      setRequestBusy(false);
    }
  };

  return <div className="market-reference-page">
    <header className="market-reference-header"><button className="market-reference-brand" type="button" onClick={() => { window.location.hash = 'marketplace'; window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span>FLX</span> Realty</button><div className="market-reference-location"><MapPin size={14} /><span><small>ZONE</small>Dar es Salaam</span><ChevronDown size={13} /></div><nav><a href="#marketplace">Marketplace & Geospatial Search</a><a href="#hostels">Hostels & Student Living</a><a href="#commercial">Commercial & Offices</a><a href="/cadastral">Cadastral Land & Titles</a><a href="/legal/escrow">Escrow Deals</a><a href="/owner">Owner OS</a></nav><div className="market-reference-tools"><span>TZS</span><span>EN • SW</span><button type="button" aria-label="Saved" onClick={() => setNotice({ tone: 'success', message: `${saved.length} listings saved.` })}><Heart size={15} /></button><button type="button" aria-label="Notifications"><Bell size={15} /></button><MarketplaceAccountAccess role="Client" /></div></header>
    <main className="market-reference-main" id="marketplace">
      <div className="market-reference-search"><div><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dar es Salaam Central • UDSM Commute Radius • Kinondoni Coastal" /></div><button type="button" onClick={() => setNotice({ tone: 'success', message: `${visibleListings.length} live units match your query.` })}><CircleDollarSign size={14} /> Execute Geo-Query</button><button type="button"><Layers3 size={14} /> Layers</button></div>
      <div className="market-reference-categories">{['All Units', 'Student Hostels', 'Commercial Offices', 'Cadastral Plots & Land', 'Luxury Flats'].map((category) => <button key={category} type="button" className={activeCategory === category ? 'is-active' : ''} onClick={() => setActiveCategory(category)}>{category}<b>{category === 'All Units' ? 142 : category === 'Student Hostels' ? 58 : category === 'Commercial Offices' ? 24 : category === 'Cadastral Plots & Land' ? 38 : 22}</b></button>)}<label>Sort: <select value={sort} onChange={(event) => setSort(event.target.value)}><option>Ministry Vetted (NLLS Live)</option><option>Price: Low to High</option></select></label></div>
      <div className="market-reference-constraints"><span>CONSTRAINTS:</span><b>✓ Near UDSM (&lt;5km)</b><b>✓ 24/7 DAWASA Reserve</b><b>✓ 100% Redundant Genset</b><b>✓ e-Ardhi Title Clean</b><b>✓ BOT Escrow Safe</b><strong>Price Cap: TZS 280k - 50M+</strong></div>
      <div className="market-reference-layout"><section className="market-reference-results"><div className="market-reference-results-heading"><div><h1>Dar es Salaam Verified Marketplace</h1><p>{visibleListings.length} active units • live local verification</p></div><strong>99.8% title vetting</strong></div>{visibleListings.map((listing) => <article className={`market-reference-listing ${compared.includes(listing.id) ? 'is-compared' : ''}`} key={listing.id}><button className="market-reference-listing-image" type="button" onClick={() => { setSelected(listing); setInspectionOpen(true); }}><img src={listing.image} alt={listing.title} /><span>{listing.badge}</span><Heart size={19} fill={saved.includes(listing.id) ? 'currentColor' : 'none'} onClick={(event) => { event.stopPropagation(); void toggleSaved(listing); }} /><small>{listing.type === 'Student Living' ? '12-min walk to UDSM Gate 2' : listing.city}</small></button><div className="market-reference-listing-copy"><div className="market-reference-listing-topline"><span>{listing.type.toUpperCase()} • {listing.city.toUpperCase()}</span><strong>{listing.price}<small>{listing.period}</small></strong></div><h2>{listing.title}</h2><div className="market-reference-tags"><span>✓ {listing.verification}</span><span>⚡ {listing.tag}</span></div><p>{listing.description}</p><label><input type="checkbox" checked={compared.includes(listing.id)} onChange={() => toggleCompare(listing)} /> Compare property specs</label><div className="market-reference-listing-actions"><button type="button" onClick={() => { setSelected(listing); setInspectionOpen(true); }}>Book Inspection</button><button type="button" className="is-primary" onClick={() => { setSelected(listing); setNotice({ tone: 'success', message: `Escrow hold started for ${listing.title}.` }); void toggleSaved(listing); }}>Lock Escrow Hold</button></div></div></article>)}<div className="market-reference-pagination"><span>Showing 1 to {visibleListings.length} of 142 cadastral assets</span><button type="button">Previous</button><b>1</b><button type="button">2</button><button type="button">3</button><button type="button">Next</button></div></section><aside className="market-reference-map"><div className="market-reference-map-toolbar"><span>MAP LAYERS</span>{(['Cadastral', 'Satellite', 'DAWASA', 'BRT'] as const).map((layer) => <button type="button" key={layer} className={mapLayer === layer ? 'is-active' : ''} onClick={() => setMapLayer(layer)}>{layer}</button>)}</div><div className="market-reference-map-canvas"><RealEstateLeafletMap properties={mapProperties} selectedProperty={selected ? toMapProperty(selected) : null} onSelectProperty={(property) => setSelected(listings.find((listing) => String(listing.id) === property.id) || null)} onOpenDetails={(property) => { setSelected(listings.find((listing) => String(listing.id) === property.id) || null); setInspectionOpen(true); }} userLocation={null} /></div><div className="market-reference-index"><h3>Dar es Salaam Cadastral Index <small>RTK KGPS 2.0</small></h3><div><span>DAWASA Pressure<strong>3.8 Bar</strong><small>Normal Flow</small></span><span>TANESCO Grid<strong>99.1%</strong><small>Sub-station Ubungo</small></span><span>e-Ardhi Sync<strong>&lt;3 mins</strong><small>Live API Hook</small></span></div></div></aside></div>
    </main>
    <section className="market-reference-conveyance"><ShieldCheck size={20} /><div><strong>FLX Sovereign Conveyance Framework</strong><span>Every parcel and property reconciled against the Ministry of Lands & Bank of Tanzania Escrow.</span></div><b>e-Ardhi NLLS Verified</b><b>BOT Escrow Safeguarded</b><b>RTK GPS Demarcation</b></section><footer className="market-reference-footer"><div><strong>FLX Real Estate</strong><span>Fast, authoritative proptech infrastructure for coastal East Africa.</span><small>Verified title validation, automated escrow instruments, and live cadastral mapping across Tanzania.</small></div><div><b>Marketplace</b><span>Verified Beach Plots</span><span>Masaki Luxury Villas</span><span>Mikocheni Commercial Hubs</span></div><div><b>Due Diligence</b><span>Ministry Title Verification</span><span>Cadastral Boundary Surveys</span><span>BOT Escrow Safeguards</span></div><div><b>FLX Portal</b><span>Owner Operating System</span><span>Diaspora Remittance Escrow</span><span>Dar es Salaam Market Pulse</span></div><small className="market-reference-copyright">© 2025 FLX Real Estate Technologies Ltd. All rights reserved.</small></footer>
    {compared.length > 0 && <div className="market-reference-compare"><span><b>{compared.length}</b> selected</span><strong>Side-by-Side Comparison</strong><small>{compared.map((id) => listings.find((listing) => listing.id === id)?.title).filter(Boolean).join(' vs ')}</small><button type="button" onClick={() => setCompared([])}>Clear</button><button type="button" className="is-primary" onClick={() => setNotice({ tone: 'success', message: 'Comparison matrix is ready.' })}>Launch Specs Matrix <ArrowRight size={15} /></button></div>}
    {notice && <div className={`market-reference-notice ${notice.tone}`}><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)}><X size={15} /></button></div>}
    {inspectionOpen && selected && <div className="market-reference-modal-backdrop" onClick={() => setInspectionOpen(false)}><form className="market-reference-modal" onSubmit={submitInspection} onClick={(event) => event.stopPropagation()}><button type="button" className="market-reference-modal-close" onClick={() => setInspectionOpen(false)}><X size={18} /></button><Sparkles size={22} /><h2>Book an inspection</h2><p>{selected.title} • {selected.city}</p><input required value={inspectionName} onChange={(event) => setInspectionName(event.target.value)} placeholder="Your name" /><input required type="email" value={inspectionEmail} onChange={(event) => setInspectionEmail(event.target.value)} placeholder="Email address" /><button className="is-primary" type="submit">Send inspection request <ArrowRight size={16} /></button></form></div>}
  </div>;
}
