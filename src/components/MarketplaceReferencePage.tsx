import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
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
  badge: string;
  tag: string;
  verification: string;
  description: string;
  status: string;
  type: 'Student Living' | 'Commercial' | 'Land' | 'Residential';
  lat: number;
  lng: number;
};

type Notice = { tone: 'success' | 'error'; message: string } | null;

const fallbackListings: MarketListing[] = [
  { id: 1, title: 'Mlimani Comfort Hostel', city: 'Mwenge / UDSM Main Gate', price: 'TZS 280k', period: 'per semester', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85', badge: 'STUDENT LIVING', tag: 'High Demand', verification: 'Verified title', description: 'Turnkey student living verified with university wardens, biometric gate entry, silent auto-genset for blackouts, daily housekeeping and high-speed fiber.', status: 'Approved', type: 'Student Living', lat: -6.772, lng: 39.205 },
  { id: 2, title: 'Posta Golden Tower Suites', city: 'Ilala Central / Financial District', price: 'TZS 1.8M', period: 'per month', image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85', badge: 'COMMERCIAL', tag: 'Bank Grade Security', verification: 'Verified title', description: 'Direct frontage to Dar es Salaam BRT Terminal. Turnkey modular floorplate with dedicated telecommunications riser, HVAC chiller and resilient backup power.', status: 'Approved', type: 'Commercial', lat: -6.816, lng: 39.285 },
  { id: 3, title: 'Coastal Parcel #492 (800 SQM)', city: 'Kigamboni Municipality / Beachfront Zone', price: 'TZS 38.0M', period: 'outright conveyance', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85', badge: 'MINISTRY TITLE DEED', tag: 'Cadastral Survey #492', verification: 'Ministry title deed', description: 'Zero encumbrances, zero customary inheritance liens. Officially gazetted under Dar es Salaam Master Plan 2030 for low-density residential development.', status: 'Approved', type: 'Land', lat: -6.88, lng: 39.27 },
  { id: 4, title: 'Masaki Ocean Breeze Residence', city: 'Kinondoni Peninsula / Tour Drive', price: 'TZS 2.4M', period: 'per month', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85', badge: 'DIPLOMATIC ENCLAVE', tag: 'Oceanfront', verification: 'Verified title', description: 'Uninterrupted views of Masasani Bay. Turnkey Italian fitted kitchen, private ocean-facing terrace, dual elevator cores, and dedicated parking.', status: 'Approved', type: 'Residential', lat: -6.75, lng: 39.29 },
];

const normalizeListing = (row: any, index: number): MarketListing => {
  const rawPrice = String(row.price ?? '');
  const lowerTitle = String(row.title ?? '').toLowerCase();
  const type: MarketListing['type'] = lowerTitle.includes('hostel') ? 'Student Living' : lowerTitle.includes('office') || lowerTitle.includes('tower') ? 'Commercial' : lowerTitle.includes('parcel') || lowerTitle.includes('land') ? 'Land' : 'Residential';
  return {
    id: Number(row.id ?? index + 1),
    title: row.title ?? fallbackListings[index % fallbackListings.length].title,
    city: row.city ?? fallbackListings[index % fallbackListings.length].city,
    price: rawPrice.replace('/sem', '').replace('/mo', ''),
    period: row.period ?? fallbackListings[index % fallbackListings.length].period,
    image: row.image ?? fallbackListings[index % fallbackListings.length].image,
    badge: type === 'Student Living' ? 'STUDENT LIVING' : type === 'Commercial' ? 'COMMERCIAL' : type === 'Land' ? 'MINISTRY TITLE DEED' : 'DIPLOMATIC ENCLAVE',
    tag: row.tag ?? 'Verified payment terms',
    verification: row.verification ?? 'Verified title',
    description: row.description ?? fallbackListings[index % fallbackListings.length].description,
    status: row.status ?? 'Approved',
    type,
    lat: Number(row.lat ?? fallbackListings[index % fallbackListings.length].lat),
    lng: Number(row.lng ?? fallbackListings[index % fallbackListings.length].lng),
  };
};

const toMapProperty = (listing: MarketListing): Property => ({
  id: String(listing.id),
  created_at: new Date().toISOString(),
  title: listing.title,
  property_type: listing.type === 'Land' || listing.type === 'Commercial' ? 'Invest' : 'Live',
  status: 'Approved',
  price: Number(listing.price.replace(/[^0-9]/g, '')) || 0,
  video_url: '',
  thumbnail_url: listing.image,
  images: [listing.image],
  location: { lat: listing.lat, lng: listing.lng, address: listing.city, city: 'Dar es Salaam', state: 'Tanzania', zip: '14111' },
  agent: { id: 'flx-market', name: 'FLX Realty', avatar: '', phone: '+255 712 345 678', email: 'hello@flxrealty.com', license: 'FLX', role: 'Agent' },
  metadata: { beds: listing.type === 'Student Living' ? 4 : 0, baths: 2, sqft: listing.type === 'Land' ? 800 : 2300 },
  description: listing.description,
});

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
    {isOpen && <div className="market-account-backdrop" onClick={() => setIsOpen(false)}>
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
    </div>}
  </>;
}

export function MarketplaceReferencePage() {
  const [listings, setListings] = useState<MarketListing[]>(fallbackListings);
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
  const [mapLayer, setMapLayer] = useState<'Cadastral' | 'Satellite' | 'DAWASA' | 'BRT'>('Cadastral');

  useEffect(() => {
    Promise.all([fetch('/api/properties'), fetch('/api/saved?email=admin@flx.local')])
      .then(async ([propertyResponse, savedResponse]) => {
        if (propertyResponse.ok) {
          const payload = await propertyResponse.json();
          if (payload.properties?.length) setListings(payload.properties.map(normalizeListing));
        }
        if (savedResponse.ok) {
          const payload = await savedResponse.json();
          setSaved(payload.savedIds || []);
        }
      })
      .catch(() => setNotice({ tone: 'error', message: 'Live inventory is unavailable. Showing the latest cached market view.' }));
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

  const mapProperties = useMemo(() => visibleListings.map(toMapProperty), [visibleListings]);

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
    if (!selected || !inspectionName || !inspectionEmail) return;
    try {
      const response = await fetch('/api/agent/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Inspection request: ${selected.title}`, note: `${inspectionName} (${inspectionEmail}) requested an inspection for ${selected.city}.` }) });
      if (!response.ok) throw new Error('Request failed');
      setInspectionOpen(false);
      setNotice({ tone: 'success', message: 'Inspection request sent to the FLX field team.' });
      setInspectionName('');
      setInspectionEmail('');
    } catch { setNotice({ tone: 'error', message: 'Inspection request could not be sent.' }); }
  };

  return <div className="market-reference-page">
    <header className="market-reference-header"><button className="market-reference-brand" type="button" onClick={() => { window.location.hash = 'marketplace'; window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span>FLX</span> Realty</button><div className="market-reference-location"><MapPin size={14} /><span><small>ZONE</small>Dar es Salaam</span><ChevronDown size={13} /></div><nav><a href="#marketplace">Marketplace & Geospatial Search</a><a href="#hostels">Hostels & Student Living</a><a href="#commercial">Commercial & Offices</a><a href="/cadastral">Cadastral Land & Titles</a><a href="/legal/escrow">Escrow Deals</a><a href="/owner">Owner OS</a></nav><div className="market-reference-tools"><span>TZS</span><span>EN • SW</span><button type="button" aria-label="Saved" onClick={() => setNotice({ tone: 'success', message: `${saved.length} listings saved.` })}><Heart size={15} /></button><button type="button" aria-label="Notifications"><Bell size={15} /></button><MarketplaceAccountAccess role="Client" /></div></header>
    <main className="market-reference-main" id="marketplace">
      <div className="market-reference-search"><div><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dar es Salaam Central • UDSM Commute Radius • Kinondoni Coastal" /></div><button type="button" onClick={() => setNotice({ tone: 'success', message: `${visibleListings.length} live units match your query.` })}><CircleDollarSign size={14} /> Execute Geo-Query</button><button type="button"><Layers3 size={14} /> Layers</button></div>
      <div className="market-reference-categories">{['All Units', 'Student Hostels', 'Commercial Offices', 'Cadastral Plots & Land', 'Luxury Flats'].map((category) => <button key={category} type="button" className={activeCategory === category ? 'is-active' : ''} onClick={() => setActiveCategory(category)}>{category}<b>{category === 'All Units' ? 142 : category === 'Student Hostels' ? 58 : category === 'Commercial Offices' ? 24 : category === 'Cadastral Plots & Land' ? 38 : 22}</b></button>)}<label>Sort: <select value={sort} onChange={(event) => setSort(event.target.value)}><option>Ministry Vetted (NLLS Live)</option><option>Price: Low to High</option></select></label></div>
      <div className="market-reference-constraints"><span>CONSTRAINTS:</span><b>✓ Near UDSM (&lt;5km)</b><b>✓ 24/7 DAWASA Reserve</b><b>✓ 100% Redundant Genset</b><b>✓ e-Ardhi Title Clean</b><b>✓ BOT Escrow Safe</b><strong>Price Cap: TZS 280k - 50M+</strong></div>
      <div className="market-reference-layout"><section className="market-reference-results"><div className="market-reference-results-heading"><div><h1>Dar es Salaam Verified Marketplace</h1><p>{visibleListings.length} active units • live local verification</p></div><strong>99.8% title vetting</strong></div>{visibleListings.map((listing) => <article className={`market-reference-listing ${compared.includes(listing.id) ? 'is-compared' : ''}`} key={listing.id}><button className="market-reference-listing-image" type="button" onClick={() => { setSelected(listing); setInspectionOpen(true); }}><img src={listing.image} alt={listing.title} /><span>{listing.badge}</span><Heart size={19} fill={saved.includes(listing.id) ? 'currentColor' : 'none'} onClick={(event) => { event.stopPropagation(); void toggleSaved(listing); }} /><small>{listing.type === 'Student Living' ? '12-min walk to UDSM Gate 2' : listing.city}</small></button><div className="market-reference-listing-copy"><div className="market-reference-listing-topline"><span>{listing.type.toUpperCase()} • {listing.city.toUpperCase()}</span><strong>{listing.price}<small>{listing.period}</small></strong></div><h2>{listing.title}</h2><div className="market-reference-tags"><span>✓ {listing.verification}</span><span>⚡ {listing.tag}</span></div><p>{listing.description}</p><label><input type="checkbox" checked={compared.includes(listing.id)} onChange={() => toggleCompare(listing)} /> Compare property specs</label><div className="market-reference-listing-actions"><button type="button" onClick={() => { setSelected(listing); setInspectionOpen(true); }}>Book Inspection</button><button type="button" className="is-primary" onClick={() => { setSelected(listing); setNotice({ tone: 'success', message: `Escrow hold started for ${listing.title}.` }); void toggleSaved(listing); }}>Lock Escrow Hold</button></div></div></article>)}<div className="market-reference-pagination"><span>Showing 1 to {visibleListings.length} of 142 cadastral assets</span><button type="button">Previous</button><b>1</b><button type="button">2</button><button type="button">3</button><button type="button">Next</button></div></section><aside className="market-reference-map"><div className="market-reference-map-toolbar"><span>MAP LAYERS</span>{(['Cadastral', 'Satellite', 'DAWASA', 'BRT'] as const).map((layer) => <button type="button" key={layer} className={mapLayer === layer ? 'is-active' : ''} onClick={() => setMapLayer(layer)}>{layer}</button>)}</div><div className="market-reference-map-canvas"><RealEstateLeafletMap properties={mapProperties} selectedProperty={selected ? toMapProperty(selected) : null} onSelectProperty={(property) => setSelected(listings.find((listing) => String(listing.id) === property.id) || null)} onOpenDetails={(property) => { setSelected(listings.find((listing) => String(listing.id) === property.id) || null); setInspectionOpen(true); }} userLocation={null} /></div><div className="market-reference-index"><h3>Dar es Salaam Cadastral Index <small>RTK KGPS 2.0</small></h3><div><span>DAWASA Pressure<strong>3.8 Bar</strong><small>Normal Flow</small></span><span>TANESCO Grid<strong>99.1%</strong><small>Sub-station Ubungo</small></span><span>e-Ardhi Sync<strong>&lt;3 mins</strong><small>Live API Hook</small></span></div></div></aside></div>
    </main>
    <section className="market-reference-conveyance"><ShieldCheck size={20} /><div><strong>FLX Sovereign Conveyance Framework</strong><span>Every parcel and property reconciled against the Ministry of Lands & Bank of Tanzania Escrow.</span></div><b>e-Ardhi NLLS Verified</b><b>BOT Escrow Safeguarded</b><b>RTK GPS Demarcation</b></section><footer className="market-reference-footer"><div><strong>FLX Realty</strong><span>Fast, authoritative proptech infrastructure for coastal East Africa.</span><small>Verified title validation, automated escrow instruments, and live cadastral mapping across Tanzania.</small></div><div><b>Marketplace</b><span>Verified Beach Plots</span><span>Masaki Luxury Villas</span><span>Mikocheni Commercial Hubs</span></div><div><b>Due Diligence</b><span>Ministry Title Verification</span><span>Cadastral Boundary Surveys</span><span>BOT Escrow Safeguards</span></div><div><b>FLX Portal</b><span>Owner Operating System</span><span>Diaspora Remittance Escrow</span><span>Dar es Salaam Market Pulse</span></div><small className="market-reference-copyright">© 2025 FLX Realty Technologies Ltd. All rights reserved.</small></footer>
    {compared.length > 0 && <div className="market-reference-compare"><span><b>{compared.length}</b> selected</span><strong>Side-by-Side Comparison</strong><small>{compared.map((id) => listings.find((listing) => listing.id === id)?.title).filter(Boolean).join(' vs ')}</small><button type="button" onClick={() => setCompared([])}>Clear</button><button type="button" className="is-primary" onClick={() => setNotice({ tone: 'success', message: 'Comparison matrix is ready.' })}>Launch Specs Matrix <ArrowRight size={15} /></button></div>}
    {notice && <div className={`market-reference-notice ${notice.tone}`}><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)}><X size={15} /></button></div>}
    {inspectionOpen && selected && <div className="market-reference-modal-backdrop" onClick={() => setInspectionOpen(false)}><form className="market-reference-modal" onSubmit={submitInspection} onClick={(event) => event.stopPropagation()}><button type="button" className="market-reference-modal-close" onClick={() => setInspectionOpen(false)}><X size={18} /></button><Sparkles size={22} /><h2>Book an inspection</h2><p>{selected.title} • {selected.city}</p><input required value={inspectionName} onChange={(event) => setInspectionName(event.target.value)} placeholder="Your name" /><input required type="email" value={inspectionEmail} onChange={(event) => setInspectionEmail(event.target.value)} placeholder="Email address" /><button className="is-primary" type="submit">Send inspection request <ArrowRight size={16} /></button></form></div>}
  </div>;
}
