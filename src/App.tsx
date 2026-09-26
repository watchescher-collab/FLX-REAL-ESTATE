import React, { useEffect, useMemo, useState } from 'react';
import { fetchSessionUser, registerUser, signIn, signOut } from './auth';
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Heart,
  Home,
  House,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  Wallet,
  Zap,
  Camera,
  Upload,
  Trash2,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings2,
  UsersRound,
  Wifi,
  LocateFixed,
  CalendarDays,
  Phone,
  Mail,
  BadgeCheck,
} from 'lucide-react';
import { RealEstateLeafletMap } from './components/RealEstateLeafletMap';
import type { Property } from './types';

type Screen = 'market' | 'saved' | 'detail' | 'deal-room' | 'account';
type LandingView = 'home' | 'properties' | 'about' | 'services' | 'more' | 'profile' | 'client-detail' | 'client-checkout' | 'client-success';
type Role = 'Client' | 'Investor' | 'Agent' | 'Owner' | 'Admin';

type Listing = {
  id: number;
  title: string;
  city: string;
  price: string;
  period: string;
  image: string;
  badge: string;
  tag: string;
  verification: string;
  status: 'Verified' | 'Hot' | 'New';
  category?: 'Student' | 'Commercial' | 'Land' | 'Homes';
};

const navItems: Array<{ id: Screen; label: string; icon: typeof House }> = [
  { id: 'market', label: 'Discover', icon: House },
  { id: 'saved', label: 'Saved', icon: Heart },
  { id: 'detail', label: 'Detail', icon: MapPin },
  { id: 'deal-room', label: 'Offer', icon: BriefcaseBusiness },
  { id: 'account', label: 'Account', icon: UserRound },
];

const fallbackListings: Listing[] = [
  {
    id: 1,
    title: 'Mlimani Comfort Hostel',
    city: 'UDSM West � Dar es Salaam',
    price: 'TZS 280k/sem',
    period: '2 Bed � Wi-Fi',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    badge: 'Verified',
    tag: 'Water 24/7',
    verification: 'Clean ministry title deed',
    status: 'Verified',
    category: 'Student',
  },
  {
    id: 2,
    title: 'Posta Golden Tower',
    city: 'CBD � Dar es Salaam',
    price: 'TZS 1.8M/mo',
    period: 'Commercial Office',
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
    badge: 'Hot',
    tag: 'Backup Generator',
    verification: 'Power backup ready',
    status: 'Hot',
    category: 'Commercial',
  },
  {
    id: 3,
    title: 'Gezaulo Coastal Parcel',
    city: 'Kigamboni � Dar es Salaam',
    price: 'TZS 38M',
    period: 'Land � 80sqm',
    image: 'https://images.unsplash.com/photo-1472224371017-08207f84aaae?auto=format&fit=crop&w=900&q=80',
    badge: 'New',
    tag: 'Title Deed',
    verification: 'Surveyed parcel',
    status: 'New',
    category: 'Land',
  },
];

const bedRows = [
  { id: 'A', label: 'Bed A', status: 'Occupied' },
  { id: 'B', label: 'Bed B', status: 'Selected' },
  { id: 'C', label: 'Bed C', status: 'Available' },
  { id: 'D', label: 'Bed D', status: 'Available' },
];

const flxServiceCatalog = [
  { slug: 'house-renting', title: 'House renting & leasing', description: 'Long-term and flexible rentals for families, professionals, and relocations.', roles: ['Client', 'Owner'], category: 'Homes' as const, accent: '🏡' },
  { slug: 'apartment-renting', title: 'Apartment renting & leasing', description: 'Modern apartments for solo renters, roommates, and growing households.', roles: ['Client', 'Owner'], category: 'Apartments' as const, accent: '🏙️' },
  { slug: 'rooms-hostels', title: 'Rooms & hostel rentals', description: 'Secure student, worker, and short-stay room inventory with verified management.', roles: ['Client', 'Owner', 'Agent'], category: 'Student' as const, accent: '🛏️' },
  { slug: 'short-stay', title: 'Airbnb & short-stay properties', description: 'Managed short-stay assets for guest experience, daily occupancy, and turnover.', roles: ['Owner', 'Investor'], category: 'Homes' as const, accent: '✨' },
  { slug: 'property-sales', title: 'Property buying & selling', description: 'End-to-end acquisition and resale support for homes, assets, and income properties.', roles: ['Client', 'Investor', 'Owner'], category: 'Homes' as const, accent: '💰' },
  { slug: 'land-sales', title: 'Plot/land buying & selling', description: 'Residential, commercial, and strategic land transactions with due diligence support.', roles: ['Client', 'Investor', 'Owner'], category: 'Land' as const, accent: '🌱' },
  { slug: 'farm-sales', title: 'Farms buying & selling', description: 'Agricultural land and farm operations for income generation or expansion.', roles: ['Investor', 'Owner'], category: 'Land' as const, accent: '🚜' },
  { slug: 'investment-consultation', title: 'Real estate investment consultation', description: 'Portfolio advisory, buyer guidance, and yield assessment for growth-focused investors.', roles: ['Investor', 'Client'], category: 'Commercial' as const, accent: '📊' },
  { slug: 'warehouse-sales', title: 'Warehouses/godowns renting & selling', description: 'Storage, logistics, and industrial facilities for tenants and operators.', roles: ['Client', 'Investor', 'Owner'], category: 'Commercial' as const, accent: '📦' },
  { slug: 'industrial-yards', title: 'Industrial yards & open spaces', description: 'Flexible industrial land and open spaces for operations, staging, and expansion.', roles: ['Investor', 'Owner'], category: 'Commercial' as const, accent: '🏭' },
  { slug: 'valuation', title: 'Property valuation assistance', description: 'Accurate value guidance for pricing strategy, financing, and acquisition decisions.', roles: ['Owner', 'Investor', 'Agent'], category: 'Commercial' as const, accent: '📐' },
  { slug: 'sourcing', title: 'Property sourcing on request', description: 'Bespoke acquisition support, targeting the right asset and right terms.', roles: ['Client', 'Investor'], category: 'Commercial' as const, accent: '🔎' },
  { slug: 'management', title: 'Property management', description: 'Operations, tenant support, and portfolio oversight for owners and landlords.', roles: ['Owner', 'Agent', 'Admin'], category: 'Homes' as const, accent: '🧭' },
  { slug: 'marketing', title: 'Property marketing & listing', description: 'Branding, listing campaigns, and go-to-market preparation for real estate owners.', roles: ['Owner', 'Agent', 'Admin'], category: 'Commercial' as const, accent: '📢' },
  { slug: 'commercial-leasing', title: 'Commercial property leasing & sales', description: 'Retail, office, and mixed-use spaces aligned to business strategy and location.', roles: ['Client', 'Owner', 'Investor'], category: 'Commercial' as const, accent: '🏬' },
  { slug: 'office-renting', title: 'Office space renting', description: 'Flexible office solutions for startups, SMEs, and growing businesses.', roles: ['Client', 'Owner'], category: 'Commercial' as const, accent: '💼' },
  { slug: 'retail-renting', title: 'Shops & retail space renting', description: 'Prime retail units and storefronts for traders, brands, and businesses.', roles: ['Client', 'Owner'], category: 'Commercial' as const, accent: '🛍️' },
  { slug: 'documentation', title: 'Land & property documentation assistance', description: 'Support on title checks, paperwork, and transaction files for safer closings.', roles: ['Owner', 'Client', 'Agent'], category: 'Land' as const, accent: '📄' },
  { slug: 'viewing-assistance', title: 'Property viewing & inspection assistance', description: 'Guided tours, inspection scheduling, and decision support before commitment.', roles: ['Client', 'Investor'], category: 'Homes' as const, accent: '👀' },
  { slug: 'tenant-support', title: 'Tenant & landlord support', description: 'Conflict resolution, paperwork, occupancy support, and day-to-day property guidance.', roles: ['Owner', 'Client', 'Agent'], category: 'Homes' as const, accent: '🤝' },
];

const paymentMethods = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'CRDB', 'NMB'];
const dealSteps = ['Reservation Paid', 'Digital Lease', 'Document Review', 'Move-In Pass'];

type DashboardSummary = {
  totalRevenue: string;
  occupancy: string;
  paymentBalance: string;
  propertiesCount: number;
};

type DealSummary = {
  id: number;
  title: string;
  progress: number;
  status: string;
  amount: string;
};

type OwnerPortfolio = {
  totalRevenue: string;
  occupancy: string;
  paymentBalance: string;
  units: Array<{ name: string; label: string; value: string; status: string }>;
};

const BrandWordmark = ({ compact = false }: { compact?: boolean }) => (
  <div className={`fx-brand-wordmark ${compact ? 'fx-brand-wordmark--compact' : ''}`}>
    <img
      src={compact ? '/assets/flx-logo-round.jpeg' : '/assets/flx-logo-wordmark.png'}
      alt="FLX Real Estate"
    />
  </div>
);

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('market');
  const [selectedRole, setSelectedRole] = useState<Role>('Client');
  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string>(flxServiceCatalog[0].slug);
  const [selectedShowcaseTab, setSelectedShowcaseTab] = useState<'Rent' | 'Sell' | 'Buy'>('Rent');
  const [landingView, setLandingView] = useState<LandingView>('home');
  const [mapFilter, setMapFilter] = useState<'All' | 'Rent' | 'Buy'>('All');
  const [mapSelectedProperty, setMapSelectedProperty] = useState<Property | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('Dar es Salaam market coverage');
  const [propertyCategory, setPropertyCategory] = useState<'All' | 'Homes' | 'Apartments' | 'Land' | 'Commercial' | 'Student'>('All');
  const [clientIntent, setClientIntent] = useState<'Rent' | 'Buy'>('Rent');
  const [clientRequest, setClientRequest] = useState({ name: '', email: '', phone: '', date: '', time: '', note: '' });
  const [workspaceRole, setWorkspaceRole] = useState<Exclude<Role, 'Client'> | null>(null);
  const [workspaceLoginRole, setWorkspaceLoginRole] = useState<Exclude<Role, 'Client'>>('Owner');
  const [workspaceLoginEmail, setWorkspaceLoginEmail] = useState('');
  const [workspaceLoginPassword, setWorkspaceLoginPassword] = useState('');
  const [workspaceLoginError, setWorkspaceLoginError] = useState('');
  const [marketSummary, setMarketSummary] = useState({
    overview: {
      averageAskingPrice: 'TZS 0',
      averageYield: '0%',
      hottestMarket: 'Dar es Salaam',
      activeAreas: '0 areas',
    },
    hotspots: [] as Array<{ city: string; label: string; value: string; tone: string }>,
    recommendations: [] as string[],
    lastUpdated: new Date().toISOString(),
  });
  const [neighborhoods, setNeighborhoods] = useState<Array<{ name: string; city: string; avgPrice: number; avgYield: number; demandScore: number; trend: string; note: string }>>([]);

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const selectLandingView = (nextView: LandingView, sectionId?: string) => {
    setLandingView(nextView);
    requestAnimationFrame(() => {
      const targetSection = sectionId ?? (nextView === 'home' ? 'home' : undefined);
      if (targetSection) {
        scrollToSection(targetSection);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };
  const [listings, setListings] = useState<Listing[]>(fallbackListings);
  const [mapLocations, setMapLocations] = useState<Property[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([1]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(fallbackListings[0]);
  const [selectedBed, setSelectedBed] = useState('B');
  const [dashboard, setDashboard] = useState<DashboardSummary>({
    totalRevenue: 'TZS 0',
    occupancy: '0%',
    paymentBalance: 'TZS 0',
    propertiesCount: 0,
  });
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [ownerPortfolio, setOwnerPortfolio] = useState<OwnerPortfolio>({
    totalRevenue: 'TZS 0',
    occupancy: '0%',
    paymentBalance: 'TZS 0',
    units: [],
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [accountUser, setAccountUser] = useState({
    name: 'Aisha Mtega',
    email: 'admin@flx.local',
    role: 'Admin',
    phone: '+255 712 345 678',
    location: 'Dar es Salaam, Tanzania',
    bio: 'Property professional helping people find better places to live, work, and invest.',
    photo: '',
  });
  const [adminProperties, setAdminProperties] = useState<Listing[]>([]);
  const [adminPropertyForm, setAdminPropertyForm] = useState({
    title: '',
    city: '',
    price: '',
    period: 'On request',
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
    badge: 'New',
    tag: 'Verified',
    verification: 'Ready for intake',
    status: 'New',
    description: '',
  });
  const [profileDraft, setProfileDraft] = useState(accountUser);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: 'Aisha Mtega',
    email: 'admin@flx.local',
    password: 'admin123',
  });

  const apiBase = '';
  const userInitials = (accountUser.name || 'FLX User').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'FLX';

  const openProfileEditor = () => {
    setProfileDraft(accountUser);
    setProfileSaved(false);
    setIsProfileModalOpen(true);
  };

  const updateProfileDraft = (field: keyof typeof profileDraft, value: string) => {
    setProfileDraft((current) => ({ ...current, [field]: value }));
    setProfileSaved(false);
  };

  const handleProfilePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProfileDraft('photo', reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const saveProfile = () => {
    setAccountUser(profileDraft);
    localStorage.setItem('flx-user', JSON.stringify(profileDraft));
    setProfileSaved(true);
    setIsProfileModalOpen(false);
  };

  const removeProfilePhoto = () => updateProfileDraft('photo', '');

  const getListingCategory = (listing: Listing) => listing.category || (listing.id === 1 ? 'Student' : listing.id === 2 ? 'Commercial' : listing.id === 3 ? 'Land' : 'Homes');
  const openClientProperty = (listing: Listing) => {
    setSelectedListing(listing);
    setLandingView('client-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openClientCheckout = (intent: 'Rent' | 'Buy') => {
    setClientIntent(intent);
    setLandingView('client-checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitClientRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLandingView('client-success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mapProperties = useMemo<Property[]>(() => {
    const propertyList = mapLocations.length ? mapLocations : listings.map((listing, index) => ({
      id: String(listing.id),
      created_at: new Date().toISOString(),
      title: listing.title,
      property_type: listing.id === 3 ? 'Invest' : 'Live',
      status: listing.status === 'New' ? 'Pending' : 'Approved',
      price: Number(String(listing.price).replace(/[^0-9]/g, '')) || 0,
      video_url: '',
      thumbnail_url: listing.image,
      images: [listing.image],
      location: {
        lat: Number((listing as any).lat ?? -6.8 + index * 0.08),
        lng: Number((listing as any).lng ?? 39.22 + index * 0.15),
        address: listing.city,
        city: listing.city.split('•')[0].trim(),
        state: 'Tanzania',
        zip: '14111',
      },
      agent: { id: 'flx-demo', name: 'FLX Real Estate', avatar: '', phone: '+255 712 345 678', email: 'hello@flxrealty.com', license: 'FLX', role: 'Agent' },
      metadata: { beds: listing.id === 1 ? 2 : 0, baths: listing.id === 1 ? 2 : 0, sqft: listing.id === 3 ? 80 : 2300 },
      description: listing.verification,
      featured: listing.id === 1,
    }));

    return propertyList.map((property) => ({
      ...property,
      location: {
        ...property.location,
        lat: Number(property.location.lat) || -6.7924,
        lng: Number(property.location.lng) || 39.2083,
        city: property.location.city || 'Dar es Salaam',
        state: property.location.state || 'Tanzania',
      },
    }));
  }, [listings, mapLocations]);

  const filteredMapProperties = useMemo(
    () => mapProperties.filter((property) => mapFilter === 'All' || (mapFilter === 'Buy' ? property.property_type === 'Invest' : property.property_type === 'Live')),
    [mapFilter, mapProperties],
  );

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('GPS is not available in this browser. Showing Dar es Salaam coverage.');
      return;
    }

    setLocationMessage('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationMessage(`Near you: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      },
      () => setLocationMessage('Location permission was not granted. Showing Dar es Salaam coverage.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const enterRoleWorkspace = async () => {
    if (!workspaceLoginEmail.trim() || !workspaceLoginPassword.trim()) {
      setWorkspaceLoginError('Enter an email and password to open the workspace.');
      return;
    }

    setAuthLoading(true);
    setWorkspaceLoginError('');

    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: workspaceLoginEmail, password: workspaceLoginPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      if (result.user?.role !== workspaceLoginRole) {
        throw new Error(`This account is registered as ${result.user?.role || 'Client'}. Choose the matching workspace.`);
      }

      const nextUser = {
        ...accountUser,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      };
      setAccountUser(nextUser);
      setProfileDraft(nextUser);
      setSelectedRole(workspaceLoginRole);
      setWorkspaceRole(workspaceLoginRole);
      localStorage.setItem('flx-user', JSON.stringify(nextUser));
      localStorage.setItem('flx-workspace-role', workspaceLoginRole);
    } catch (error) {
      setWorkspaceLoginError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setAuthLoading(false);
    }
  };

  const renderRoleWorkspace = () => {
    if (!workspaceRole) return null;

    const workspaceCopy: Record<Exclude<Role, 'Client'>, { eyebrow: string; title: string; description: string; stats: Array<[string, string, string]>; items: Array<[string, string, string]> }> = {
      Owner: {
        eyebrow: 'OWNER OPERATIONS',
        title: 'Your property portfolio, under control.',
        description: 'Track listings, enquiries, approvals, and property performance from one calm operational desk.',
        stats: [['Registered assets', String(ownerPortfolio.units.length || dashboard.propertiesCount || 9), 'portfolio'], ['Occupancy', ownerPortfolio.occupancy || dashboard.occupancy || '86%', 'live rate'], ['Payment balance', ownerPortfolio.paymentBalance || dashboard.paymentBalance || 'TZS 42M', 'reconciled funds']],
        items: [['Asset board', 'Review property status and publication readiness.', 'Open portfolio'], ['Leads inbox', 'Follow up on new enquiries and viewing requests.', 'View enquiries'], ['Compliance desk', 'Keep title deeds and owner documents current.', 'Review documents']],
      },
      Agent: {
        eyebrow: 'AGENT OPERATIONS',
        title: 'Turn every intake into a signed deal.',
        description: 'Capture property details, coordinate tours, and keep your active pipeline moving without leaving the workspace.',
        stats: [['Active leads', '12', 'needs follow-up'], ['Tours this week', '8', 'scheduled'], ['Conversion rate', '34%', 'last 30 days']],
        items: [['New intake', 'Register a property with location, media, and ownership details.', 'Start intake'], ['Viewing calendar', 'Keep every client tour and follow-up in one place.', 'Open calendar'], ['Client pipeline', 'Move qualified buyers from enquiry to offer.', 'View pipeline']],
      },
      Investor: {
        eyebrow: 'INVESTOR DESK',
        title: 'See the opportunity before the market does.',
        description: 'Compare yields, demand signals, and deal readiness across FLX investment opportunities.',
        stats: [['Tracked deals', '5', 'watchlist'], ['Average cap rate', '8.8%', 'portfolio yield'], ['Available capital', 'TZS 180M', 'ready to deploy']],
        items: [['Opportunity radar', 'Scan high-demand zones and new investment inventory.', 'Open radar'], ['Yield calculator', 'Model rent, costs, and exit scenarios before committing.', 'Run model'], ['Deal room', 'Review documents and payment progress for active offers.', 'Open deals']],
      },
      Admin: {
        eyebrow: 'ADMIN CONTROL ROOM',
        title: 'Keep the FLX marketplace trusted.',
        description: 'Moderate inventory, verify documents, and monitor the health of every active workflow.',
        stats: [['Pending approvals', '28', 'in queue'], ['Live properties', String(dashboard.propertiesCount || 80), 'published'], ['Open cases', '7', 'needs review']],
        items: [['Approval queue', 'Review new properties and ownership submissions.', 'Open queue'], ['Operations analytics', 'Track platform activity and marketplace health.', 'View analytics'], ['Access control', 'Manage role access and account verification.', 'Manage access']],
      },
    };

    const copy = workspaceCopy[workspaceRole];

    return (
      <div className="fx-role-workspace">
        <aside className="fx-workspace-sidebar">
          <div className="fx-workspace-logo"><BrandWordmark compact /></div>
          <div className="fx-workspace-sidebar-user">
            <span className="fx-avatar-badge">{userInitials}</span>
            <div><strong>{accountUser.name}</strong><span>{workspaceRole} workspace</span></div>
          </div>
          <nav className="fx-workspace-nav" aria-label="Workspace navigation">
            <button className="active" type="button"><LayoutDashboard size={16} />Overview</button>
            <button type="button"><Building2 size={16} />Inventory</button>
            <button type="button"><UsersRound size={16} />People & leads</button>
            <button type="button"><ClipboardCheck size={16} />Tasks</button>
            <button type="button"><Settings2 size={16} />Settings</button>
          </nav>
          <button className="fx-workspace-exit" type="button" onClick={() => {
            if (workspaceRole !== 'Admin') {
              signOut();
            }
            setWorkspaceRole(null);
          }}><LogOut size={15} />Back to client site</button>
        </aside>

        <main className="fx-workspace-main">
          <header className="fx-workspace-topbar">
            <div><span className="fx-workspace-kicker">FLX / {copy.eyebrow}</span><h1>{copy.title}</h1></div>
            <button className="fx-workspace-profile" type="button" onClick={() => setWorkspaceRole(null)}><span className="fx-avatar-badge">{userInitials}</span>{accountUser.name}</button>
          </header>
          <p className="fx-workspace-description">{copy.description}</p>
          <div className="fx-workspace-stat-grid">
            {copy.stats.map(([label, value, detail]) => <div className="fx-workspace-stat" key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}
          </div>
          {workspaceRole === 'Admin' ? (
            <section className="fx-workspace-section" style={{ marginTop: 24 }}>
              <div className="fx-workspace-section-heading"><div><span className="fx-workspace-kicker">PROPERTY CRUD</span><h2>Admin property board</h2></div><span className="fx-workspace-live"><span />Live inventory</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)', gap: 16 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <input value={adminPropertyForm.title} onChange={(event) => setAdminPropertyForm((current) => ({ ...current, title: event.target.value }))} placeholder="Property title" style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #dfe7f1', background: '#fff' }} />
                  <input value={adminPropertyForm.city} onChange={(event) => setAdminPropertyForm((current) => ({ ...current, city: event.target.value }))} placeholder="City / location" style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #dfe7f1', background: '#fff' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input value={adminPropertyForm.price} onChange={(event) => setAdminPropertyForm((current) => ({ ...current, price: event.target.value }))} placeholder="Price" style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #dfe7f1', background: '#fff' }} />
                    <input value={adminPropertyForm.period} onChange={(event) => setAdminPropertyForm((current) => ({ ...current, period: event.target.value }))} placeholder="Period" style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #dfe7f1', background: '#fff' }} />
                  </div>
                  <input value={adminPropertyForm.image} onChange={(event) => setAdminPropertyForm((current) => ({ ...current, image: event.target.value }))} placeholder="Image URL" style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #dfe7f1', background: '#fff' }} />
                  <textarea value={adminPropertyForm.description} onChange={(event) => setAdminPropertyForm((current) => ({ ...current, description: event.target.value }))} placeholder="Property description" rows={4} style={{ resize: 'vertical', padding: '12px 14px', borderRadius: 12, border: '1px solid #dfe7f1', background: '#fff' }} />
                  <button type="button" onClick={() => void handleCreateProperty()} style={{ border: 'none', borderRadius: 12, background: '#1a5cff', color: '#fff', fontWeight: 700, padding: '12px 16px', cursor: 'pointer' }}>Publish listing</button>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {adminProperties.length === 0 ? (
                    <div style={{ padding: 18, borderRadius: 16, background: '#f3f6fb', color: '#53657c' }}>No inventory yet. Add your first FLX listing.</div>
                  ) : (
                    adminProperties.slice(0, 5).map((property) => (
                      <div key={property.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid #e7edf4' }}>
                        <div>
                          <strong style={{ display: 'block' }}>{property.title}</strong>
                          <span style={{ color: '#5f6d7a', fontSize: 12 }}>{property.city}</span>
                        </div>
                        <button type="button" onClick={() => void handleDeleteProperty(property.id)} style={{ border: 'none', background: '#fff1f2', color: '#c62828', padding: '8px 10px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}
          <section className="fx-workspace-section">
            <div className="fx-workspace-section-heading"><div><span className="fx-workspace-kicker">WORK QUEUE</span><h2>What needs your attention</h2></div><span className="fx-workspace-live"><span />Live workspace</span></div>
            <div className="fx-workspace-tool-grid">
              {copy.items.map(([title, description, action]) => <article className="fx-workspace-tool" key={title}><div className="fx-workspace-tool-icon"><ClipboardCheck size={18} /></div><h3>{title}</h3><p>{description}</p><button type="button">{action}<ArrowRight size={14} /></button></article>)}
            </div>
          </section>
          <section className="fx-workspace-table">
            <div className="fx-workspace-section-heading"><div><span className="fx-workspace-kicker">RECENT ACTIVITY</span><h2>Latest updates</h2></div><button type="button">View all</button></div>
            <div className="fx-workspace-activity"><span className="fx-activity-dot" /><div><strong>{workspaceRole === 'Admin' ? 'Three new listings are awaiting verification' : workspaceRole === 'Agent' ? 'A client requested a tour for Mlimani Comfort Hostel' : workspaceRole === 'Owner' ? 'Your Kigamboni parcel received a new enquiry' : 'Posta Golden Tower yield model was updated'}</strong><span>Updated a few minutes ago</span></div><ChevronRight size={16} /></div>
          </section>
        </main>
      </div>
    );
  };

  const fetchAdminProperties = async () => {
    try {
      const response = await fetch(`${apiBase}/api/admin/properties`);
      if (!response.ok) return;
      const payload = await response.json();
      if (Array.isArray(payload.properties)) {
        setAdminProperties(payload.properties);
      }
    } catch {
      setAdminProperties([]);
    }
  };

  const handleCreateProperty = async () => {
    const payload = {
      title: adminPropertyForm.title.trim(),
      city: adminPropertyForm.city.trim(),
      price: adminPropertyForm.price.trim(),
      period: adminPropertyForm.period.trim() || 'On request',
      image: adminPropertyForm.image.trim() || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
      badge: adminPropertyForm.badge.trim() || 'New',
      tag: adminPropertyForm.tag.trim() || 'Verified',
      verification: adminPropertyForm.verification.trim() || 'Ready for intake',
      status: adminPropertyForm.status.trim() || 'New',
      description: adminPropertyForm.description.trim() || 'Fresh listing added from FLX operations.',
    };

    if (!payload.title || !payload.city || !payload.price) {
      setAuthMessage('Add a title, city, and price before publishing the property.');
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/admin/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unable to publish property.' }));
        throw new Error(error.error || 'Unable to publish property.');
      }

      const result = await response.json();
      setAdminProperties(result.properties || []);
      setAdminPropertyForm({
        title: '',
        city: '',
        price: '',
        period: 'On request',
        image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
        badge: 'New',
        tag: 'Verified',
        verification: 'Ready for intake',
        status: 'New',
        description: '',
      });
      setAuthMessage('');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to publish property.');
    }
  };

  const handleDeleteProperty = async (propertyId: number) => {
    try {
      const response = await fetch(`${apiBase}/api/admin/properties/${propertyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) return;
      const result = await response.json();
      setAdminProperties(result.properties || []);
    } catch {
      void fetchAdminProperties();
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, dealsRes, ownerRes] = await Promise.all([
        fetch(`${apiBase}/api/dashboard`),
        fetch(`${apiBase}/api/deals`),
        fetch(`${apiBase}/api/owner`),
      ]);

      if (dashboardRes.ok) {
        const dashboardPayload = await dashboardRes.json();
        setDashboard({
          totalRevenue: dashboardPayload.totalRevenue || 'TZS 0',
          occupancy: dashboardPayload.occupancy || '0%',
          paymentBalance: dashboardPayload.paymentBalance || 'TZS 0',
          propertiesCount: Number(dashboardPayload.propertiesCount || 0),
        });
      }

      if (dealsRes.ok) {
        const dealsPayload = await dealsRes.json();
        if (Array.isArray(dealsPayload.deals)) {
          setDeals(dealsPayload.deals);
        }
      }

      if (ownerRes.ok) {
        const ownerPayload = await ownerRes.json();
        if (ownerPayload?.portfolio) {
          setOwnerPortfolio(ownerPayload.portfolio);
        }
      }
    } catch {
      setDashboard({ totalRevenue: 'TZS 0', occupancy: '0%', paymentBalance: 'TZS 0', propertiesCount: 0 });
      setDeals([]);
      setOwnerPortfolio({ totalRevenue: 'TZS 0', occupancy: '0%', paymentBalance: 'TZS 0', units: [] });
    }
  };

  const submitAuth = async (mode: 'login' | 'register') => {
    setAuthLoading(true);
    setAuthMessage('');

    const normalizedEmail = String((mode === 'login' ? authForm.email : authForm.email || 'admin@flx.local')).trim().toLowerCase();
    const demoCredentials = normalizedEmail === 'admin@flx.local' && String(mode === 'login' ? authForm.password : authForm.password).trim() === 'admin123';

    try {
      const user = mode === 'login'
        ? await signIn(authForm.email, authForm.password)
        : await registerUser(authForm.name || 'FLX User', authForm.email, authForm.password, selectedRole);

      const userRole = String((user.role || selectedRole) as string);
      const userProfile = {
        id: user.id || 'demo-user',
        name: user.name || authForm.name || 'FLX User',
        email: user.email || authForm.email || 'admin@flx.local',
        role: userRole,
      };
      setSelectedRole(userRole as Role);
      setAccountUser(userProfile);
      setActiveScreen('market');
      setAuthMessage('');
      localStorage.setItem('flx-user', JSON.stringify(userProfile));
      return;
    } catch (error: unknown) {
      if (demoCredentials && mode === 'login') {
        const demoUser = {
          id: 'demo-user',
          name: 'Aisha Mtega',
          email: 'admin@flx.local',
          role: 'Admin',
        };

        setSelectedRole('Admin');
        setAccountUser(demoUser);
        setActiveScreen('market');
        setAuthMessage('');
        localStorage.setItem('flx-user', JSON.stringify(demoUser));
        return;
      }

      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const loadListings = async () => {
      try {
        const response = await fetch(`${apiBase}/api/properties`);
        if (!response.ok) throw new Error('Failed to load properties');
        const payload = await response.json();
        const nextListings = Array.isArray(payload.properties) && payload.properties.length > 0 ? payload.properties : fallbackListings;
        setListings(nextListings);
        setSelectedListing((current) => current ?? nextListings[0]);
      } catch {
        setListings(fallbackListings);
        setSelectedListing((current) => current ?? fallbackListings[0]);
      }
    };

    const loadLocations = async () => {
      try {
        const response = await fetch(`${apiBase}/api/locations`);
        if (!response.ok) throw new Error('Failed to load locations');
        const payload = await response.json();
        if (Array.isArray(payload.locations)) {
          const nextMapLocations = payload.locations.map((item: any) => ({
            id: String(item.id),
            created_at: new Date().toISOString(),
            title: item.title,
            property_type: item.price && String(item.price).includes('M') ? 'Invest' : 'Live',
            status: item.status === 'New' ? 'Pending' : 'Approved',
            price: Number(String(item.price).replace(/[^0-9]/g, '')) || 0,
            video_url: '',
            thumbnail_url: '',
            images: [''],
            location: {
              lat: Number(item.lat) || -6.7924,
              lng: Number(item.lng) || 39.2083,
              address: item.city,
              city: item.city?.split('•')[0]?.trim() || item.city || 'Dar es Salaam',
              state: 'Tanzania',
              zip: '14111',
            },
            agent: { id: 'flx-db', name: 'FLX Real Estate', avatar: '', phone: '+255 712 345 678', email: 'hello@flxrealty.com', license: 'FLX', role: 'Agent' },
            metadata: { beds: 0, baths: 0, sqft: 0 },
            description: item.description || item.title,
            featured: false,
          }));
          setMapLocations(nextMapLocations);
        }
      } catch {
        setMapLocations([]);
      }
    };

    const loadSaved = async () => {
      try {
        const response = await fetch(`${apiBase}/api/saved?email=admin@flx.local`);
        if (!response.ok) return;
        const payload = await response.json();
        if (Array.isArray(payload.savedIds)) {
          setSavedIds(payload.savedIds.length ? payload.savedIds : [1]);
        }
      } catch {
        setSavedIds((current) => (current.length ? current : [1]));
      }
    };

    const loadMarketInsights = async () => {
      try {
        const [summaryResponse, neighborhoodsResponse] = await Promise.all([
          fetch(`${apiBase}/api/market-summary`),
          fetch(`${apiBase}/api/neighborhoods`),
        ]);

        if (summaryResponse.ok) {
          const summaryPayload = await summaryResponse.json();
          if (summaryPayload?.overview) {
            setMarketSummary(summaryPayload);
          }
        }

        if (neighborhoodsResponse.ok) {
          const neighborhoodsPayload = await neighborhoodsResponse.json();
          if (Array.isArray(neighborhoodsPayload.areas)) {
            setNeighborhoods(neighborhoodsPayload.areas);
          }
        }
      } catch {
        setMarketSummary({
          overview: {
            averageAskingPrice: 'TZS 32.8M',
            averageYield: '9.6%',
            hottestMarket: 'Dar es Salaam',
            activeAreas: '18 micro-markets',
          },
          hotspots: [
            { city: 'Dar es Salaam', label: 'Best overall momentum', value: '11.4% average yield', tone: 'strong' },
            { city: 'Arusha', label: 'Fastest investor demand', value: '9.8% average yield', tone: 'neutral' },
            { city: 'Dodoma', label: 'Affordable growth zone', value: '7.6% avg rental yield', tone: 'warm' },
          ],
          recommendations: [
            'Student housing in UDSM and Mbezi remains highly liquid for rent-first buyers.',
            'Commercial office inventory in CBD is outperforming for investor-focused clients.',
            'Coastal and peri-urban land is gaining momentum as a diversification strategy.',
          ],
          lastUpdated: new Date().toISOString(),
        });
        setNeighborhoods([
          { name: 'Mbezi Beach', city: 'Dar es Salaam', avgPrice: 56000000, avgYield: 11.8, demandScore: 92, trend: 'Rising', note: 'Strong rental demand and lifestyle appeal.' },
          { name: 'Kijitonyama', city: 'Dar es Salaam', avgPrice: 47000000, avgYield: 10.5, demandScore: 89, trend: 'Stable', note: 'Balanced buyer demand for family homes and rentals.' },
        ]);
      }
    };

    const hydrateSession = async () => {
      try {
        const currentSession = await fetchSessionUser();
        if (currentSession) {
          const nextUser = {
            name: currentSession.name,
            email: currentSession.email,
            role: currentSession.role,
            phone: accountUser.phone,
            location: accountUser.location,
            bio: accountUser.bio,
            photo: accountUser.photo,
          };
          setAccountUser(nextUser);
          setSelectedRole((currentSession.role || selectedRole) as Role);
          localStorage.setItem('flx-user', JSON.stringify(nextUser));
          return;
        }
      } catch {
        // fall through to stored user fallback below
      }

      const savedUser = localStorage.getItem('flx-user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser) as { name?: string; email?: string; role?: string };
          const storedUser = parsedUser as Partial<typeof accountUser>;
          setAccountUser((current) => ({
            ...current,
            ...storedUser,
            name: storedUser.name || current.name,
            email: storedUser.email || current.email,
            role: storedUser.role || current.role,
          }));
        } catch {
          setAccountUser({
            name: 'Aisha Mtega',
            email: 'admin@flx.local',
            role: selectedRole,
            phone: '+255 712 345 678',
            location: 'Dar es Salaam, Tanzania',
            bio: 'Property professional helping people find better places to live, work, and invest.',
            photo: '',
          });
        }
      }
    };

    void hydrateSession();
    loadListings();
    loadLocations();
    loadSaved();
    loadMarketInsights();
    fetchDashboardData();
    void fetchAdminProperties();
  }, [selectedRole]);

  const savedListings = useMemo(
    () => listings.filter((listing) => savedIds.includes(listing.id)),
    [listings, savedIds],
  );

  const selectedService = useMemo(
    () => flxServiceCatalog.find((service) => service.slug === selectedServiceSlug) ?? flxServiceCatalog[0],
    [selectedServiceSlug],
  );

  const selectedServiceListings = useMemo(
    () => listings.filter((listing) => {
      const category = getListingCategory(listing);
      const matchesServiceCategory = selectedService.category === 'Commercial'
        ? category === 'Commercial' || category === 'Student'
        : category === selectedService.category;
      return matchesServiceCategory;
    }),
    [listings, selectedService],
  );

  const clientListings = useMemo(
    () => listings.filter((listing) => {
      const category = getListingCategory(listing);
      const categoryMatches = propertyCategory === 'All'
        || propertyCategory === category
        || (propertyCategory === 'Apartments' && category === 'Homes');
      const intentMatches = clientIntent === 'Rent' ? category !== 'Land' : true;
      return categoryMatches && intentMatches;
    }),
    [clientIntent, listings, propertyCategory],
  );

  const toggleSaved = async (id: number) => {
    const currentlySaved = savedIds.includes(id);
    setSavedIds((current) =>
      currentlySaved ? current.filter((item) => item !== id) : [...current, id],
    );

    try {
      const response = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@flx.local', propertyId: id }),
      });

      if (!response.ok) throw new Error('Unable to save listing');
      const payload = await response.json();
      if (Array.isArray(payload.savedIds)) {
        setSavedIds(payload.savedIds);
      }
    } catch {
      setSavedIds((current) =>
        currentlySaved ? [...new Set([...current, id])] : current.filter((item) => item !== id),
      );
    }
  };

  const openProperty = (listing: Listing) => {
    setSelectedListing(listing);
    setActiveScreen('detail');
  };

  const renderTopBar = () => (
    <header className="fx-header">
      <div className="fx-topbar">
        <div className="fx-brand-wrap">
          <BrandWordmark compact />
          <div className="fx-brand-text">
            <span className="fx-brand-subtitle">FLX Real Estate</span>
            <span className="fx-brand-city">Your Trusted Property Partner</span>
          </div>
        </div>

        <div className="fx-header-actions">
          <button className="fx-circle-btn" aria-label="Notifications">
            <Bell size={16} />
          </button>
          <button className="fx-avatar-btn" aria-label="Account">
            <span className="fx-avatar-badge">{userInitials}</span>
            <span className="fx-avatar-name">{accountUser.name}</span>
          </button>
        </div>
      </div>

      <div className="fx-search-box">
        <Search size={16} />
        <input value="Search hostels near UDSM, office in P..." readOnly />
      </div>

      <div className="fx-flow-strip" aria-label="User journey navigation">
        {[
          { id: 'market', label: 'Discover' },
          { id: 'saved', label: 'Saved' },
          { id: 'detail', label: 'Details' },
          { id: 'deal-room', label: 'Offer' },
          { id: 'account', label: 'Account' },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`fx-flow-card ${activeScreen === id ? 'fx-flow-card--active' : ''}`}
            onClick={() => setActiveScreen(id as Screen)}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>
    </header>
  );

  const renderMarket = () => (
    <div className="fx-screen fx-screen--market">
      <div className="fx-chip-row">
        <button className="fx-chip fx-chip--active">{selectedRole === 'Client' ? 'Hostels' : selectedRole === 'Investor' ? 'Opportunities' : selectedRole === 'Agent' ? 'Listings' : selectedRole === 'Owner' ? 'Portfolio' : 'Approvals'}</button>
        <button className="fx-chip">{selectedRole === 'Client' ? 'Commercial' : 'Yield'}</button>
        <button className="fx-chip">{selectedRole === 'Client' ? 'Land' : 'Nearby'}</button>
      </div>

      <div className="fx-map-panel">
        <div className="fx-map-radar" />
        <div className="fx-map-pin fx-map-pin--1">TZS 280k/sem</div>
        <div className="fx-map-pin fx-map-pin--2">TZS 1.8M/mo</div>
        <div className="fx-map-pin fx-map-pin--3">TZS 38M</div>
        <div className="fx-map-legend">
          <span className="fx-map-dot" />
          UDSM � high-demand zone
        </div>
      </div>

      <button className="fx-compare-pill">
        <Check size={12} />
        Compare Selected Properties
      </button>

      <div className="fx-section-head">
        <h2>Live market feed</h2>
        <button className="fx-link-btn">Filters</button>
      </div>

      <div className="fx-listings">
        {listings.map((listing) => {
          const saved = savedIds.includes(listing.id);

          return (
            <article
              key={listing.id}
              className="fx-card"
              onClick={() => openProperty(listing)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openProperty(listing);
                }
              }}
            >
              <img src={listing.image} alt={listing.title} />
              <div className="fx-card-body">
                <div className="fx-card-topline">
                  <span className="fx-badge fx-badge--soft">{listing.badge}</span>
                  <button
                    className="fx-save-btn"
                    aria-label="Save listing"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSaved(listing.id);
                    }}
                    type="button"
                  >
                    <Heart size={14} className={saved ? 'fill-current' : ''} />
                  </button>
                </div>

                <div className="fx-card-title-row">
                  <div>
                    <h3>{listing.title}</h3>
                    <div className="fx-meta-line">
                      <MapPin size={12} />
                      {listing.city}
                    </div>
                  </div>
                  <div className="fx-card-price">
                    {listing.price}
                    <small>{listing.period}</small>
                  </div>
                </div>

                <div className="fx-tag-row">
                  <span className="fx-tag">{listing.tag}</span>
                  <span className="fx-tag">{listing.verification}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderSaved = () => (
    <div className="fx-screen fx-screen--saved">
      <div className="fx-section-head fx-section-head--stack">
        <div>
          <span className="fx-eyebrow">Your shortlist</span>
          <h2>Saved homes</h2>
        </div>
        <button className="fx-link-btn">Compare</button>
      </div>

      <div className="fx-listings">
        {savedListings.length === 0 ? (
          <div className="fx-stock-panel">
            <div className="fx-section-head fx-section-head--compact">
              <h3>No saved homes yet</h3>
              <span>Start browsing</span>
            </div>
            <p style={{ margin: 0, color: '#6b7280' }}>Save a few properties to compare prices, locations, and move-in options.</p>
          </div>
        ) : (
          savedListings.map((listing) => (
            <article key={listing.id} className="fx-card" onClick={() => openProperty(listing)} role="button" tabIndex={0} onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openProperty(listing);
              }
            }}>
              <img src={listing.image} alt={listing.title} />
              <div className="fx-card-body">
                <div className="fx-card-topline">
                  <span className="fx-badge fx-badge--soft">{listing.badge}</span>
                  <button className="fx-save-btn" aria-label="Open listing" onClick={(event) => { event.stopPropagation(); openProperty(listing); }} type="button">
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="fx-card-title-row">
                  <div>
                    <h3>{listing.title}</h3>
                    <div className="fx-meta-line">
                      <MapPin size={12} />
                      {listing.city}
                    </div>
                  </div>
                  <div className="fx-card-price">
                    {listing.price}
                    <small>{listing.period}</small>
                  </div>
                </div>

                <div className="fx-tag-row">
                  <span className="fx-tag">{listing.tag}</span>
                  <span className="fx-tag">{listing.verification}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedListing) {
      return null;
    }

    return (
      <div className="fx-screen fx-screen--detail">
        <button className="fx-back-link" onClick={() => setActiveScreen('market')}>
          <ChevronRight size={14} className="rotate-180" />
          Back to market
        </button>

        <div className="fx-detail-card">
          <img src={selectedListing.image} alt={selectedListing.title} />

          <div className="fx-detail-content">
            <div className="fx-detail-header-row">
              <div>
                <span className="fx-badge fx-badge--soft">{selectedListing.badge}</span>
                <h2>{selectedListing.title}</h2>
              </div>
              <button
                className="fx-save-btn fx-save-btn--large"
                onClick={() => toggleSaved(selectedListing.id)}
                type="button"
              >
                <Heart size={16} className={savedIds.includes(selectedListing.id) ? 'fill-current' : ''} />
              </button>
            </div>

            <div className="fx-meta-line fx-meta-line--large">
              <MapPin size={12} />
              {selectedListing.city}
            </div>

            <div className="fx-price-row">
              <div>
                <span>Room investment</span>
                <strong>{selectedListing.price}</strong>
              </div>
              <div className="fx-rating-pill">
                <Star size={12} className="fill-current" />
                4.9
              </div>
            </div>

            <div className="fx-stat-grid">
              <div className="fx-stat-box">
                <Clock3 size={14} />
                <span>11 min walk</span>
                <strong>UDSM</strong>
              </div>
              <div className="fx-stat-box">
                <Wallet size={14} />
                <span>Fare</span>
                <strong>TZS 200</strong>
              </div>
              <div className="fx-stat-box fx-stat-box--wide">
                <ShieldCheck size={14} />
                <span>Night safety</span>
                <strong>9.2/10</strong>
              </div>
            </div>

            <div className="fx-bed-section">
              <div className="fx-section-head fx-section-head--compact">
                <h3>Floor bed selector</h3>
                <span>Room 204</span>
              </div>

              <div className="fx-bed-grid">
                {bedRows.map((bed) => {
                  const isSelected = bed.id === selectedBed;
                  const isOccupied = bed.status === 'Occupied';

                  return (
                    <button
                      key={bed.id}
                      className={`fx-bed ${isSelected ? 'fx-bed--selected' : ''} ${isOccupied ? 'fx-bed--occupied' : ''}`}
                      onClick={() => setSelectedBed(bed.id)}
                      type="button"
                    >
                      <div className="fx-bed-id">{bed.id}</div>
                      <div className="fx-bed-label">{bed.label}</div>
                      <span>{bed.status}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="fx-feature-stack">
              <div className="fx-feature-item">
                <div className="fx-feature-icon fx-feature-icon--lime">
                  <Zap size={16} />
                </div>
                <div>
                  <strong>Zero-downtime power</strong>
                  <span>Backup generator + UPS</span>
                </div>
              </div>
              <div className="fx-feature-item">
                <div className="fx-feature-icon fx-feature-icon--blue">
                  <Sparkles size={16} />
                </div>
                <div>
                  <strong>Fiber internet</strong>
                  <span>Stable and ready for study</span>
                </div>
              </div>
              <div className="fx-feature-item">
                <div className="fx-feature-icon fx-feature-icon--amber">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong>Water & security</strong>
                  <span>24/7 monitored and insured</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fx-booking-bar">
          <div>
            <span>Instant reservation</span>
            <strong>Bed {selectedBed} � TZS 280,000</strong>
          </div>
          <button onClick={() => setActiveScreen('deal-room')} type="button">Reserve</button>
        </div>
      </div>
    );
  };

  const renderDealRoom = () => (
    <div className="fx-screen fx-screen--deal">
      <div className="fx-section-head fx-section-head--stack">
        <div>
          <span className="fx-eyebrow">Digital deal room</span>
          <h2>Lease and payment flow</h2>
        </div>
        <button className="fx-link-btn">Review</button>
      </div>

      <div className="fx-stepper">
        {dealSteps.map((step, index) => {
          const isActive = index === 2;
          return (
            <div key={step} className={`fx-step ${isActive ? 'fx-step--active' : ''}`}>
              <span>{index + 1}</span>
              {step}
            </div>
          );
        })}
      </div>

      <div className="fx-lease-card">
        <div className="fx-section-head fx-section-head--compact">
          <h3>Lease clauses</h3>
          <span>EN � SW</span>
        </div>

        <div className="fx-clause-list">
          <div className="fx-clause">
            <FileText size={14} />
            <div>
              <strong>Mkataba wa Upangishaji</strong>
              <span>Tenant and landlord responsibilities are digitally locked.</span>
            </div>
          </div>
          <div className="fx-clause">
            <Check size={14} />
            <div>
              <strong>Dual E-sign</strong>
              <span>Signed by both parties, tracked in real time.</span>
            </div>
          </div>
          <div className="fx-clause">
            <ShieldCheck size={14} />
            <div>
              <strong>Payment tracking</strong>
              <span>BOT standard compliance with encrypted storage.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fx-payments-panel">
        <div className="fx-section-head fx-section-head--compact">
          <h3>Payment rails</h3>
          <span>Local payout</span>
        </div>

        <div className="fx-payment-row">
          {paymentMethods.map((method) => (
            <button key={method} className="fx-payment-pill" type="button">
              {method}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="fx-screen fx-screen--owner">
      <div className="fx-owner-banner">
        <div className="fx-owner-banner-top">
          <span className="fx-owner-dot" />
          Client profile
        </div>
        <div className="fx-owner-banner-row">
          <div>
            <span className="fx-eyebrow fx-eyebrow--light">Buyer status</span>
            <h2>Pre-qualified</h2>
          </div>
          <span className="fx-rising-badge">Ready</span>
        </div>
        <div className="fx-owner-subrow">
          <span className="fx-status-dot" />
          Verified for renting or purchase
        </div>
      </div>

      <div className="fx-summary-grid">
        <div className="fx-summary-box">
          <div className="fx-summary-label"><Wallet size={14} /> Budget</div>
          <strong>{dashboard.totalRevenue}</strong>
        </div>
        <div className="fx-summary-box">
          <div className="fx-summary-label"><Home size={14} /> Preferred</div>
          <strong>{selectedRole === 'Client' ? '2 Bed' : 'Portfolio'}</strong>
        </div>
        <div className="fx-summary-box">
          <div className="fx-summary-label"><CreditCard size={14} /> Offers</div>
          <strong>{Math.max(1, deals.length)} active</strong>
        </div>
      </div>

      <div className="fx-stock-panel">
        <div className="fx-section-head fx-section-head--compact">
          <h3>Client checklist</h3>
          <button className="fx-link-btn">Update</button>
        </div>

        <div className="fx-stock-list">
          <div className="fx-stock-item">
            <span>Identity verified</span>
            <strong>Done</strong>
          </div>
          <div className="fx-stock-item">
            <span>Income proof</span>
            <strong>Uploaded</strong>
          </div>
          <div className="fx-stock-item">
            <span>Tour schedule</span>
            <strong>3 booked</strong>
          </div>
        </div>
      </div>

      <div className="fx-reviews-panel">
        <div className="fx-section-head fx-section-head--compact">
          <h3>Preferred locations</h3>
          <span>Top picks</span>
        </div>

        <div className="fx-review-card">
          <div className="fx-review-avatar">UD</div>
          <div>
            <strong>UDSM West</strong>
            <span>Student-friendly � Water 24/7</span>
          </div>
          <button type="button">Focus</button>
        </div>
      </div>

      <div className="fx-dispatch-card">
        <div className="fx-section-head fx-section-head--compact">
          <h3>Move-in support</h3>
          <span>Included</span>
        </div>
        <div className="fx-dispatch-row">
          <div className="fx-dispatch-chip">Lease</div>
          <div className="fx-dispatch-copy">Agent and legal review included for your selected home.</div>
        </div>
        <button type="button">Book advisor</button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeScreen === 'market') return renderMarket();
    if (activeScreen === 'saved') return renderSaved();
    if (activeScreen === 'detail') return renderDetail();
    if (activeScreen === 'deal-room') return renderDealRoom();
    return renderAccount();
  };

  const renderAuthScreen = () => {
    const roleOptions: Array<{ role: Role; accent: string; description: string; metric: string }> = [
      { role: 'Client', accent: 'Rent or buy', description: 'Lifestyle-first search, verified homes, and move-in support.', metric: '3 homes' },
      { role: 'Investor', accent: 'Yield', description: 'Track deals, cap rate, and exit-readiness across high-opportunity zones.', metric: '5 deals' },
      { role: 'Agent', accent: 'CRM', description: 'Capture intake, schedule viewings, and convert leads into signed deals.', metric: '12 leads' },
      { role: 'Owner', accent: 'Portfolio', description: 'Manage occupancy, pricing, and maintenance from one dashboard.', metric: '9 units' },
      { role: 'Admin', accent: 'Ops', description: 'Moderate listings, verify payments, and watch live operational KPIs.', metric: '28 tasks' },
    ];

    return (
      <div className="fx-auth-shell">
        <div className="fx-auth-card">
          <div className="fx-auth-header">
            <div className="fx-brand-wrap fx-brand-wrap--auth">
              <BrandWordmark />
              <div className="fx-brand-text">
                <span className="fx-brand-subtitle">FLX Real Estate</span>
                <span className="fx-brand-city">Operational platform</span>
              </div>
            </div>
            <span className="fx-auth-tag">Secure workspace</span>
          </div>

          <div className="fx-auth-copy">
            <h1>Welcome to FLX</h1>
            <p>Select the role you are operating in to personalize the platform for your workflow.</p>
          </div>

          <div className="fx-demo-bar">
            <div>
              <span>Demo account</span>
              <strong>admin@flx.local / admin123</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Admin');
                setAuthForm({ name: 'Aisha Mtega', email: 'admin@flx.local', password: 'admin123' });
                void submitAuth('login');
              }}
            >
              Use demo
            </button>
          </div>

          <div className="fx-auth-role-grid">
            {roleOptions.map(({ role, accent, description, metric }) => (
              <button
                key={role}
                className={`fx-role-card ${selectedRole === role ? 'fx-role-card--active' : ''}`}
                onClick={() => setSelectedRole(role)}
                type="button"
              >
                <div className="fx-role-card-top">
                  <span>{role}</span>
                  <strong>{accent}</strong>
                </div>
                <p>{description}</p>
                <div className="fx-role-metric">{metric}</div>
              </button>
            ))}
          </div>

          <div className="fx-auth-form">
            <label>
              Full name
              <input
                value={authForm.name}
                onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
          </div>

          {authMessage ? <div className="fx-auth-message">{authMessage}</div> : null}

          <div className="fx-auth-actions">
            <button
              className="fx-primary-cta"
              onClick={() => void submitAuth('login')}
              type="button"
              disabled={authLoading}
            >
              {authLoading ? 'Connecting...' : 'Enter FLX Workspace'}
            </button>
            <button
              className="fx-secondary-cta"
              onClick={() => void submitAuth('register')}
              type="button"
              disabled={authLoading}
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    );
  };

  const landingProperties = listings.slice(0, 4);

  if (workspaceRole) {
    return renderRoleWorkspace();
  }

  return (
    <div className="fx-landing-shell">
      <header className="fx-landing-header">
        <div className="fx-landing-brand">
          <img src="/assets/flx-logo-wordmark.png" alt="FLX Real Estate" />
        </div>

        <nav className="fx-landing-nav" aria-label="Landing page navigation">
          <button type="button" onClick={() => selectLandingView('home', 'home')}>Home</button>
          <button type="button" onClick={() => selectLandingView('about', 'about')}>About</button>
          <button type="button" onClick={() => selectLandingView('properties', 'properties')}>Properties</button>
          <button type="button" onClick={() => selectLandingView('services', 'services')}>Services</button>
          <button type="button" onClick={() => selectLandingView('more', 'more')}>More</button>
        </nav>

        <div className="fx-landing-header-actions">
          <button
            type="button"
            className="fx-landing-cta"
            onClick={() => window.open('https://wa.me/255723730285', '_blank', 'noopener,noreferrer')}
          >
            WhatsApp
          </button>
          <button className="fx-avatar-btn" aria-label="Edit profile" onClick={openProfileEditor}>
            {accountUser.photo ? <img className="fx-avatar-photo" src={accountUser.photo} alt="" /> : <span className="fx-avatar-badge">{userInitials}</span>}
            <span className="fx-avatar-name">{accountUser.name}</span>
          </button>
        </div>
      </header>

      {isProfileModalOpen && (
        <div className="fx-profile-modal-backdrop" onClick={() => setIsProfileModalOpen(false)}>
          <div className="fx-profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="fx-profile-close-btn" aria-label="Close profile editor" onClick={() => setIsProfileModalOpen(false)}>
              ×
            </button>

            <div className="fx-profile-screen" id="profile">
              <div className="fx-profile-heading">
                <div>
                  <span className="fx-about-kicker" id="profile-modal-title">YOUR ACCOUNT</span>
                  <h2>Edit your profile</h2>
                  <p>Keep your details current so the FLX team can personalize every property conversation.</p>
                </div>
                {profileSaved ? <span className="fx-profile-saved"><Check size={14} /> Saved</span> : null}
              </div>

              <div className="fx-profile-layout">
                <div className="fx-profile-photo-panel">
                  <div className="fx-profile-photo-frame">
                    {profileDraft.photo ? (
                      <img src={profileDraft.photo} alt="Profile preview" />
                    ) : (
                      <span className="fx-profile-large-initials">{userInitials}</span>
                    )}
                    <span className="fx-profile-camera-badge"><Camera size={18} /></span>
                  </div>
                  <h3>Profile photo</h3>
                  <p>Use a clear image where your face is easy to recognize.</p>
                  <div className="fx-profile-photo-actions">
                    <label className="fx-profile-upload-btn">
                      <Upload size={15} />
                      {profileDraft.photo ? 'Change photo' : 'Upload photo'}
                      <input type="file" accept="image/*" onChange={handleProfilePhoto} />
                    </label>
                    {profileDraft.photo ? (
                      <button type="button" className="fx-profile-remove-btn" onClick={removeProfilePhoto} aria-label="Remove profile photo">
                        <Trash2 size={15} /> Remove
                      </button>
                    ) : null}
                  </div>
                  <span className="fx-profile-photo-note">JPG, PNG or WEBP. Maximum 5 MB.</span>
                </div>

                <div className="fx-profile-form-panel">
                  <div className="fx-profile-form-grid">
                    <label>
                      Full name
                      <input value={profileDraft.name} onChange={(event) => updateProfileDraft('name', event.target.value)} placeholder="Your full name" />
                    </label>
                    <label>
                      Email address
                      <input type="email" value={profileDraft.email} onChange={(event) => updateProfileDraft('email', event.target.value)} placeholder="you@example.com" />
                    </label>
                    <label>
                      Phone number
                      <input value={profileDraft.phone} onChange={(event) => updateProfileDraft('phone', event.target.value)} placeholder="+255 ..." />
                    </label>
                    <label>
                      Location
                      <input value={profileDraft.location} onChange={(event) => updateProfileDraft('location', event.target.value)} placeholder="City, country" />
                    </label>
                    <label className="fx-profile-field-full">
                      Account role
                      <input value={profileDraft.role} readOnly aria-label="Account role" />
                    </label>
                    <label className="fx-profile-field-full">
                      About you
                      <textarea value={profileDraft.bio} onChange={(event) => updateProfileDraft('bio', event.target.value)} rows={5} placeholder="Tell clients a little about yourself" />
                    </label>
                  </div>

                  <div className="fx-profile-form-footer">
                    <span>Your profile is private and only shared when needed for a property transaction.</span>
                    <div>
                      <button type="button" className="fx-profile-cancel-btn" onClick={() => setIsProfileModalOpen(false)}>Cancel</button>
                      <button type="button" className="fx-profile-save-btn" onClick={saveProfile}>Save changes</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="fx-landing-main">
        {landingView === 'home' && (
          <>
            <section className="fx-landing-hero" id="home">
              <div className="fx-hero-visual">
                <div className="fx-hero-visual-inner">
                  <div className="fx-hero-title-wrap">
                    <h1>Your Trusted Property Partner</h1>
                    <p>Houses, apartments, plots, and land for buyers, renters, sellers, and investors across Tanzania. We make property decisions clear, confident, and stress-free.</p>
                    <div className="fx-hero-actions">
                      <button type="button" onClick={() => window.open('https://wa.me/255723730285', '_blank', 'noopener,noreferrer')}>WhatsApp now</button>
                      <button type="button" className="fx-hero-ghost" onClick={() => window.open('https://www.instagram.com/flxrealestate_/', '_blank', 'noopener,noreferrer')}>Instagram</button>
                    </div>
                    <div className="fx-hero-service-tags" aria-label="Property categories">
                      <span>Houses</span>
                      <span>Apartments</span>
                      <span>Plots</span>
                      <span>Land</span>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="fx-hero-stat-panel">
                <span className="fx-eyebrow fx-eyebrow--dark">Who we are</span>
                <h3>Your trusted property partner for buying, selling, rent, and marketing.</h3>
                <div className="fx-metric-row">
                  <div>
                    <strong>80+</strong>
                    <span>Premium homes</span>
                  </div>
                  <div>
                    <strong>500+</strong>
                    <span>Happy clients</span>
                  </div>
                  <div>
                    <strong>2K+</strong>
                    <span>Families helped</span>
                  </div>
                </div>
              </aside>
            </section>

            <section className="fx-feature-strip" aria-label="Platform benefits">
              {[
                { title: 'Verified listings', copy: 'Only reviewed homes, offices, and land with clear ownership and local trust checks.', icon: '✓' },
                { title: 'Zanzibar & Dar demand', copy: 'Track where buyers and renters are moving fastest across major Tanzanian growth areas.', icon: '◎' },
                { title: 'Financing support', copy: 'Plan budgets, compare deposits, and move from interest to offer with confidence.', icon: '▣' },
              ].map((feature) => (
                <article key={feature.title} className="fx-feature-item">
                  <span className="fx-feature-icon">{feature.icon}</span>
                  <div>
                    <strong>{feature.title}</strong>
                    <p>{feature.copy}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="fx-booking-panel" aria-label="Book a property viewing">
              <div className="fx-booking-copy">
                <span className="fx-eyebrow fx-eyebrow--dark">Book a viewing</span>
                <h2>Find your next home before the market moves.</h2>
                <p>Tell us your preferred area, budget, and timeline. We’ll send the right options on WhatsApp.</p>
              </div>

              <form
                className="fx-whatsapp-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const name = (formData.get('name') as string | null)?.trim() || 'Client';
                  const phone = (formData.get('phone') as string | null)?.trim() || 'Not provided';
                  const interest = (formData.get('interest') as string | null)?.trim() || 'Property enquiry';
                  const budget = (formData.get('budget') as string | null)?.trim() || 'Budget flexible';
                  const message = `Hello FLX Real Estate, my name is ${name}. I am interested in ${interest}. My budget is ${budget}. My phone number is ${phone}. Please send me suitable options and arrange a viewing.`;
                  window.open(`https://wa.me/255723730285?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                }}
              >
                <div className="fx-form-grid">
                  <label>
                    Full name
                    <input name="name" type="text" placeholder="Aisha Mtega" required />
                  </label>
                  <label>
                    Phone number
                    <input name="phone" type="tel" placeholder="+255 7xx xxx xxx" required />
                  </label>
                  <label>
                    Property type
                    <select name="interest" defaultValue="House" required>
                      <option value="House">House</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Plot">Plot</option>
                      <option value="Land">Land</option>
                      <option value="Commercial property">Commercial property</option>
                    </select>
                  </label>
                  <label>
                    Budget
                    <select name="budget" defaultValue="TZS 30M - 80M" required>
                      <option value="Under TZS 30M">Under TZS 30M</option>
                      <option value="TZS 30M - 80M">TZS 30M - 80M</option>
                      <option value="TZS 80M - 200M">TZS 80M - 200M</option>
                      <option value="TZS 200M+">TZS 200M+</option>
                      <option value="Budget flexible">Budget flexible</option>
                    </select>
                  </label>
                </div>
                <button type="submit" className="fx-primary-whatsapp-btn">Send on WhatsApp</button>
              </form>
            </section>

            <section className="fx-market-insights-panel" aria-label="Market insights">
              <div className="fx-section-header">
                <h2>Tanzania market intelligence</h2>
                <p>Live demand and investment signals from the regions that matter most to buyers and investors.</p>
              </div>

              <div className="fx-insight-metric-grid">
                <div className="fx-insight-card">
                  <span>Average asking price</span>
                  <strong>{marketSummary.overview.averageAskingPrice}</strong>
                  <small>Across active listings</small>
                </div>
                <div className="fx-insight-card">
                  <span>Average yield</span>
                  <strong>{marketSummary.overview.averageYield}</strong>
                  <small>Portfolio cap rate</small>
                </div>
                <div className="fx-insight-card">
                  <span>Hottest market</span>
                  <strong>{marketSummary.overview.hottestMarket}</strong>
                  <small>{marketSummary.overview.activeAreas}</small>
                </div>
              </div>

              <div className="fx-insight-content-row">
                <div className="fx-insight-summary-panel">
                  <span className="fx-kicker">LIVE RECOMMENDATIONS</span>
                  <ul>
                    {marketSummary.recommendations.map((recommendation) => (
                      <li key={recommendation}>{recommendation}</li>
                    ))}
                  </ul>
                </div>

                <div className="fx-insight-region-panel">
                  {marketSummary.hotspots.map((hotspot) => (
                    <div key={`${hotspot.city}-${hotspot.label}`} className={`fx-region-pill fx-region-pill--${hotspot.tone}`}>
                      <strong>{hotspot.city}</strong>
                      <span>{hotspot.label}</span>
                      <em>{hotspot.value}</em>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fx-neighborhood-list">
                {neighborhoods.slice(0, 5).map((area) => (
                  <article key={`${area.name}-${area.city}`} className="fx-neighborhood-item">
                    <div>
                      <span className="fx-neighborhood-name">{area.name}</span>
                      <small>{area.city}</small>
                    </div>
                    <div className="fx-neighborhood-metrics">
                      <span>{area.trend}</span>
                      <strong>{area.avgYield.toFixed(1)}% yield</strong>
                    </div>
                    <p>{area.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="fx-match-section" id="properties">
              <div className="fx-section-header">
                <h2>Discover Your Perfect Property Match</h2>
                <p>Explore curated homes with better value, cleaner design, and smarter locations.</p>
              </div>

              <div className="fx-match-grid">
                <article className="fx-match-featured">
                  <div className="fx-card-image-wrap">
                    <img src={landingProperties[0]?.image || fallbackListings[0].image} alt={landingProperties[0]?.title || fallbackListings[0].title} />
                  </div>
                  <div className="fx-featured-card-meta">
                    <div className="fx-featured-price">{landingProperties[0]?.price || fallbackListings[0].price}</div>
                    <div className="fx-featured-details">
                      <span>{landingProperties[0]?.city || fallbackListings[0].city}</span>
                      <div className="fx-feature-badges">
                        <span>2 Beds</span>
                        <span>2 Baths</span>
                        <span>2,300 sq ft</span>
                      </div>
                    </div>
                  </div>
                </article>

                <div className="fx-mini-gallery">
                  {landingProperties.slice(1).map((property, index) => (
                    <div key={property.id} className={`fx-mini-card fx-mini-card--${index + 1}`}>
                      <img src={property.image} alt={property.title} />
                      <div className="fx-mini-card-overlay">
                        <span>{property.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="fx-market-map-section" id="map">
              <div className="fx-section-header fx-market-map-header">
                <div>
                  <span className="fx-eyebrow">Live availability map</span>
                  <h2>Explore places near you</h2>
                </div>
                <div className="fx-market-map-actions">
                  <div className="fx-map-filter-group" role="tablist" aria-label="Map property filter">
                    {(['All', 'Rent', 'Buy'] as const).map((filter) => <button key={filter} type="button" className={mapFilter === filter ? 'active' : ''} onClick={() => setMapFilter(filter)}>{filter === 'All' ? 'All places' : filter === 'Rent' ? 'For rent' : 'For sale'}</button>)}
                  </div>
                  <button type="button" className="fx-locate-btn" onClick={requestUserLocation}><LocateFixed size={15} /> Use my location</button>
                </div>
              </div>
              <div className="fx-market-map-status"><span className="fx-map-live-dot" />{locationMessage}<strong>{filteredMapProperties.length} places visible</strong></div>
              <div className="fx-market-map-frame">
                <RealEstateLeafletMap
                  properties={filteredMapProperties}
                  selectedProperty={mapSelectedProperty}
                  onSelectProperty={setMapSelectedProperty}
                  onOpenDetails={setMapSelectedProperty}
                  userLocation={userLocation}
                />
                {userLocation ? <div className="fx-user-location-indicator" title="Your approximate location"><span /></div> : null}
              </div>
            </section>

            <section className="fx-about-section" id="about">
              <div className="fx-about-copy">
                <h2>About Us</h2>
                <p>
                  FLX Real Estate is your trusted property partner for homes, apartments, plots, and land.
                  We help buyers, sellers, tenants, and investors move with clarity from search to signing.
                </p>
                <p>
                  Whether you are buying, selling, renting, or marketing a property, we make the process simple, transparent, and tailored to your goals.
                </p>
              </div>

              <div className="fx-about-photo">
                <img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80" alt="Happy clients" />
              </div>
            </section>

            <section className="fx-showcase-section" id="services">
              <div className="fx-showcase-header">
                <h2>Property Showcase</h2>
                <div className="fx-showcase-actions">
                  {(['Rent', 'Sell', 'Buy'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`fx-pill ${selectedShowcaseTab === tab ? 'active' : ''}`}
                      onClick={() => setSelectedShowcaseTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fx-showcase-grid">
                {landingProperties.map((property) => (
                    <article key={property.id} className="fx-showcase-card" onClick={() => openClientProperty(property)} role="button" tabIndex={0} onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openClientProperty(property);
                      }
                    }}>
                    <img src={property.image} alt={property.title} />
                    <div className="fx-showcase-body">
                      <div className="fx-showcase-topline">
                        <span>{property.city}</span>
                        <strong>{property.price}</strong>
                      </div>
                      <h3>{property.title}</h3>
                      <div className="fx-showcase-meta">
                        <span>{property.period}</span>
                        <span>{property.badge}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {landingView === 'properties' && (
          <section className="fx-property-screen" id="properties">
            <div className="fx-screen-crumbs">
              <span>Property Collection</span>
            </div>
            <div className="fx-client-discovery-toolbar">
              <div>
                <span className="fx-kicker">YOUR PROPERTY JOURNEY</span>
                <h2>Explore the right place for you</h2>
              </div>
              <div className="fx-intent-switcher" role="tablist" aria-label="Choose rent or buy">
                {(['Rent', 'Buy'] as const).map((intent) => <button key={intent} type="button" className={clientIntent === intent ? 'active' : ''} onClick={() => setClientIntent(intent)}>{intent}</button>)}
              </div>
            </div>
            <div className="fx-category-row" role="tablist" aria-label="Property categories">
              {(['All', 'Homes', 'Apartments', 'Land', 'Commercial', 'Student'] as const).map((category) => <button key={category} type="button" className={propertyCategory === category ? 'active' : ''} onClick={() => setPropertyCategory(category)}>{category}</button>)}
            </div>
            <div className="fx-property-grid">
              {clientListings.length === 0 ? <div className="fx-empty-discovery"><h3>No matches yet</h3><p>Try another category or switch between renting and buying.</p></div> : clientListings.map((property) => (
                <article key={property.id} className="fx-property-card" onClick={() => openClientProperty(property)} role="button" tabIndex={0} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openClientProperty(property);
                  }
                }}>
                  <img src={property.image} alt={property.title} />
                  <div className="fx-property-card-body">
                    <div className="fx-property-card-top">
                      <span>{property.city}</span>
                      <strong>{property.price}</strong>
                    </div>
                    <h3>{property.title}</h3>
                    <div className="fx-property-card-meta">
                      <span>{getListingCategory(property)} · {property.period}</span>
                      <span>{property.badge}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {landingView === 'client-detail' && selectedListing && (
          <section className="fx-client-detail-screen">
            <div className="fx-mobile-detail-shell">
              <div className="fx-mobile-hero-media">
                <img src={selectedListing.image} alt={selectedListing.title} />
                <div className="fx-mobile-hero-overlay" />
                <div className="fx-mobile-top-badges">
                  <span className="fx-detail-badge"><BadgeCheck size={14} /> FLX Verified</span>
                  <span className="fx-detail-badge fx-detail-badge--soft">Female Only Block A</span>
                </div>
                <div className="fx-mobile-hero-meta">
                  <div className="fx-mobile-hero-copy">
                    <h2>{selectedListing.title}</h2>
                    <p>
                      <MapPin size={14} />
                      {selectedListing.city}
                    </p>
                  </div>
                  <div className="fx-mobile-rating">
                    <Star size={14} className="fill-current" />
                    4.8
                    <span>(42)</span>
                  </div>
                </div>
              </div>

              <div className="fx-mobile-gallery">
                {[selectedListing.image, selectedListing.image, selectedListing.image, selectedListing.image].map((image, index) => (
                  <div key={`${selectedListing.id}-${index}`} className={`fx-gallery-thumb ${index === 3 ? 'fx-gallery-thumb--more' : ''}`}>
                    <img src={image} alt="" />
                    {index === 3 ? <span>+8 more</span> : null}
                  </div>
                ))}
              </div>

              <div className="fx-mobile-detail-stack">
                <div className="fx-mobile-panel">
                  <div className="fx-mobile-panel-header">
                    <h3><span className="fx-panel-icon"><Clock3 size={18} /></span> Commute &amp; Neighborhood Living</h3>
                    <span className="fx-panel-pill">UDSM Ward</span>
                  </div>

                  <div className="fx-commute-grid">
                    <div className="fx-mini-metric">
                      <div className="fx-mini-metric-top"><MapPin size={15} /> <span>Campus Walk</span></div>
                      <strong>11 mins</strong>
                      <small>900m to Yombo LT</small>
                    </div>
                    <div className="fx-mini-metric">
                      <div className="fx-mini-metric-top"><CalendarDays size={15} /> <span>Daladala</span></div>
                      <strong>TZS 200</strong>
                      <small>Msewe - Mwenge</small>
                    </div>
                    <div className="fx-mini-metric">
                      <div className="fx-mini-metric-top"><ShieldCheck size={15} /> <span>Night Safety</span></div>
                      <strong>9.2 / 10</strong>
                      <small>Solar lit path</small>
                    </div>
                  </div>

                  <div className="fx-security-banner">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>24/7 Security Guard + Perimeter Wall</strong>
                      <span>Biometric entry lock at Block A main gate for peace of mind.</span>
                    </div>
                  </div>
                </div>

                <div className="fx-mobile-panel">
                  <div className="fx-mobile-panel-header">
                    <h3><span className="fx-panel-icon fx-panel-icon--secondary"><Zap size={18} /></span> Zero-Downtime Guarantee</h3>
                    <span className="fx-live-pill"><span /> 100% Active</span>
                  </div>

                  <div className="fx-utility-list">
                    <div className="fx-utility-row">
                      <div className="fx-utility-left">
                        <span className="fx-utility-icon fx-utility-icon--primary"><Home size={18} /></span>
                        <div>
                          <strong>24/7 Running Water</strong>
                          <small>DAWASA direct mains + 5,000L underground tank</small>
                        </div>
                      </div>
                      <Check size={18} className="fx-utility-check" />
                    </div>
                    <div className="fx-utility-row">
                      <div className="fx-utility-left">
                        <span className="fx-utility-icon fx-utility-icon--orange"><Zap size={18} /></span>
                        <div>
                          <strong>Automatic Standby Power</strong>
                          <small>25kVA generator kicks in 15s during TANESCO outage</small>
                        </div>
                      </div>
                      <Check size={18} className="fx-utility-check" />
                    </div>
                    <div className="fx-utility-row">
                      <div className="fx-utility-left">
                        <span className="fx-utility-icon fx-utility-icon--neutral"><Wifi size={18} /></span>
                        <div>
                          <strong>100 Mbps Dedicated Fiber</strong>
                          <small>Unlimited student study quota with dual AP on floor 2</small>
                        </div>
                      </div>
                      <Check size={18} className="fx-utility-check" />
                    </div>
                  </div>
                </div>

                <div className="fx-mobile-panel">
                  <div className="fx-mobile-panel-header fx-mobile-panel-header--tight">
                    <div>
                      <span className="fx-panel-kicker">Interactive Floor Selection</span>
                      <h3>Room 204 - 4-Bed Deluxe</h3>
                    </div>
                    <div className="fx-room-tag-wrap">
                      <span className="fx-panel-pill fx-panel-pill--muted">Floor 2</span>
                      <span className="fx-room-count">2 spaces left</span>
                    </div>
                  </div>

                  <div className="fx-mobile-bed-panel">
                    <div className="fx-mobile-bed-grid">
                      {bedRows.map((bed) => {
                        const isSelected = bed.id === selectedBed;
                        const isOccupied = bed.status === 'Occupied';
                        return (
                          <button
                            key={bed.id}
                            type="button"
                            className={`fx-mobile-bed-card ${isSelected ? 'fx-mobile-bed-card--selected' : ''} ${isOccupied ? 'fx-mobile-bed-card--occupied' : ''}`}
                            onClick={() => setSelectedBed(bed.id)}
                          >
                            <div className="fx-mobile-bed-top">
                              <span className="fx-mobile-bed-name">Bed {bed.id}</span>
                              <span className={`fx-mobile-bed-status ${isOccupied ? 'is-occupied' : ''}`}>{bed.status}</span>
                            </div>
                            <div className="fx-mobile-bed-price">TZS 280,000</div>
                            <small>{isOccupied ? 'Current resident' : 'Garden view / lower bunk'}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="fx-mobile-panel">
                  <div className="fx-mobile-panel-header fx-mobile-panel-header--tight">
                    <h3>Lease Duration</h3>
                    <span className="fx-panel-text">Academic Year 2024/25</span>
                  </div>

                  <div className="fx-lease-tabs">
                    <button type="button" className={`fx-lease-tab active`} onClick={() => setSelectedBed(selectedBed)}>
                      <span>1 Semester</span>
                      <small>5 Mos • TZS 280,000</small>
                    </button>
                    <button type="button" className="fx-lease-tab">
                      <span>Full Academic Year</span>
                      <small>Save TZS 40,000</small>
                    </button>
                  </div>

                  <div className="fx-finance-card">
                    <div className="fx-finance-row">
                      <span>Room Bed Rent (1 Semester)</span>
                      <strong>TZS 280,000</strong>
                    </div>
                    <div className="fx-finance-row">
                      <span>Booking Confirmation Fee</span>
                      <strong>TZS 50,000</strong>
                    </div>
                    <div className="fx-finance-row fx-finance-row--muted">
                      <span>Student Amenities &amp; WiFi</span>
                      <strong>FREE</strong>
                    </div>
                    <div className="fx-finance-divider" />
                    <div className="fx-finance-row fx-finance-row--total">
                      <div>
                        <strong>Due Today to Confirm</strong>
                        <small>M-Pesa / TigoPesa / Airtel Money</small>
                      </div>
                      <span>TZS 330,000</span>
                    </div>
                  </div>

                  <div className="fx-trust-note">
                    <Lock size={16} />
                    <span>Payment confirmation is shared with the hostel owner and tenant immediately.</span>
                  </div>
                </div>

                <div className="fx-mobile-panel">
                  <h3 className="fx-house-rules-title">House Standards &amp; Highlights</h3>
                  <div className="fx-house-rules-grid">
                    <div><ShieldCheck size={16} /> Curfew: 11:30 PM Gate</div>
                    <div><Home size={16} /> Laundry Area Available</div>
                    <div><Home size={16} /> Shared Kitchenette</div>
                    <div><Sparkles size={16} /> Twice-weekly Cleaning</div>
                  </div>
                </div>
              </div>

              <div className="fx-mobile-reserve-bar">
                <button type="button" className="fx-chat-button" aria-label="Chat with caretaker">
                  <Phone size={20} />
                </button>
                <div className="fx-reserve-copy">
                  <span>Bed {selectedBed} (Deluxe)</span>
                  <strong>TZS 280,000</strong>
                  <small>+50k dep</small>
                </div>
                <button type="button" className="fx-mobile-primary-btn" onClick={() => openClientCheckout(clientIntent)}>
                  Reserve Space
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {landingView === 'client-checkout' && selectedListing && (
          <section className="fx-client-checkout-screen">
            <div className="fx-screen-crumbs"><button type="button" className="fx-ghost-link" onClick={() => setLandingView('client-detail')}>← BACK TO PROPERTY</button><span>STEP 2 OF 3 · {clientIntent === 'Rent' ? 'RENT' : 'BUY'}</span></div>
            <div className="fx-client-checkout-layout">
              <div className="fx-client-checkout-copy"><span className="fx-kicker">{clientIntent === 'Rent' ? 'RENT WITH CONFIDENCE' : 'BUY WITH CLARITY'}</span><h2>{clientIntent === 'Rent' ? 'Tell us when you want to see it.' : 'Start your purchase conversation.'}</h2><p>Share a few details and a FLX advisor will guide you through the next step for <strong>{selectedListing.title}</strong>.</p><div className="fx-checkout-summary"><img src={selectedListing.image} alt="" /><div><strong>{selectedListing.title}</strong><span>{selectedListing.price} · {selectedListing.city}</span></div></div></div>
              <form className="fx-client-request-form" onSubmit={submitClientRequest}><label>Full name<input required value={clientRequest.name} onChange={(event) => setClientRequest((current) => ({ ...current, name: event.target.value }))} placeholder="Aisha Mtega" /></label><label>Email address<input required type="email" value={clientRequest.email} onChange={(event) => setClientRequest((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" /></label><label>Phone number<input required value={clientRequest.phone} onChange={(event) => setClientRequest((current) => ({ ...current, phone: event.target.value }))} placeholder="+255 ..." /></label><div className="fx-request-form-row"><label>Preferred date<input required type="date" value={clientRequest.date} onChange={(event) => setClientRequest((current) => ({ ...current, date: event.target.value }))} /></label><label>Preferred time<select required value={clientRequest.time} onChange={(event) => setClientRequest((current) => ({ ...current, time: event.target.value }))}><option value="">Choose time</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label></div><label>Message<textarea rows={4} value={clientRequest.note} onChange={(event) => setClientRequest((current) => ({ ...current, note: event.target.value }))} placeholder="Tell us what matters to you..." /></label><button type="submit" className="fx-client-primary-btn">Send request <ArrowRight size={15} /></button><span className="fx-form-reassurance"><Mail size={14} /> An advisor will respond within one business day.</span></form>
            </div>
          </section>
        )}

        {landingView === 'client-success' && selectedListing && (
          <section className="fx-client-success-screen"><div className="fx-success-mark"><Check size={28} /></div><span className="fx-kicker">REQUEST RECEIVED</span><h2>You are one step closer to {selectedListing.title}.</h2><p>Your FLX advisor will contact you using the details you provided to confirm the tour and next steps.</p><div className="fx-success-actions"><button type="button" className="fx-client-primary-btn" onClick={() => setLandingView('home')}>Return home <Home size={15} /></button><button type="button" className="fx-client-secondary-btn" onClick={() => setLandingView('properties')}>Explore more places</button></div></section>
        )}

        {landingView === 'about' && (
          <section className="fx-about-detail-screen" id="about">
            <div className="fx-about-detail-layout">
              <div className="fx-about-detail-copy">
                <span className="fx-about-kicker">OUR MISSION</span>
                <h2>We make property decisions easier, smarter, and more personal.</h2>
                <p>
                  From first search to final close, we help buyers, renters, investors,
                  and owners move with confidence.
                </p>

                <div className="fx-about-detail-stats">
                  <div>
                    <strong>12+</strong>
                    <span>Years helping clients</span>
                  </div>
                  <div>
                    <strong>4.9/5</strong>
                    <span>Average client rating</span>
                  </div>
                  <div>
                    <strong>98%</strong>
                    <span>Client retention</span>
                  </div>
                </div>
              </div>

              <div className="fx-about-detail-photo-wrap">
                <img
                  src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
                  alt="Modern office interior"
                />
              </div>
            </div>
          </section>
        )}

        {landingView === 'services' && (
          <section className="fx-service-screen" id="services">
            <div className="fx-screen-crumbs">
              <span>Property services</span>
            </div>

            <div className="fx-service-layout">
              <div className="fx-service-grid">
                {flxServiceCatalog.map((service) => (
                  <article
                    key={service.slug}
                    className={`fx-service-card ${selectedServiceSlug === service.slug ? 'is-selected' : ''}`}
                    onClick={() => setSelectedServiceSlug(service.slug)}
                    aria-pressed={selectedServiceSlug === service.slug}
                  >
                    <div className="fx-service-icon">{service.accent}</div>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <div className="fx-service-role-row">
                      {service.roles.map((role) => (
                        <span key={role} className="fx-role-pill">{role}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <aside className="fx-service-detail-card">
                <span className="fx-kicker">{selectedService.accent} SERVICE SCREEN</span>
                <h2>{selectedService.title}</h2>
                <p>{selectedService.description}</p>

                <div className="fx-service-role-panel">
                  <strong>Best for</strong>
                  <div className="fx-service-role-row">
                    {selectedService.roles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={`fx-role-pill ${selectedRole === role ? 'is-active' : ''}`}
                        onClick={() => setSelectedRole(role as Role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fx-service-action-row">
                  <button
                    type="button"
                    className="fx-client-primary-btn"
                    onClick={() => {
                      setPropertyCategory(selectedService.category);
                      setClientIntent(selectedService.category === 'Land' ? 'Buy' : 'Rent');
                      setLandingView('properties');
                    }}
                  >
                    View {selectedService.title.toLowerCase()} listings
                  </button>
                  <button
                    type="button"
                    className="fx-client-secondary-btn"
                    onClick={() => {
                      setSelectedRole((selectedService.roles[0] || 'Client') as Role);
                      setLandingView('more');
                    }}
                  >
                    Talk to FLX
                  </button>
                </div>

                <div className="fx-service-match-block">
                  <strong>{selectedServiceListings.length} live matches</strong>
                  <span>Connected to the property API and filtered by the current service category.</span>
                </div>
              </aside>
            </div>
          </section>
        )}

        {landingView === 'more' && (
          <section className="fx-more-screen" id="more">
            <div className="fx-screen-crumbs">
              <span>More</span>
            </div>
            <div className="fx-more-layout">
              <div className="fx-more-panel">
                <span className="fx-kicker">Need help?</span>
                <h2>Talk to a property advisor</h2>
                <p>Call or WhatsApp us for home tours, financing guidance, or a tailored investment assessment.</p>
                <div className="fx-contact-row">
                  <span>WhatsApp: +255 723 730 285</span>
                  <span>Instagram: @flxrealestate_</span>
                </div>
              </div>
              <div className="fx-faq-panel">
                <div className="fx-faq-item"><strong>How fast can I tour?</strong><span>Usually within 24 hours.</span></div>
                <div className="fx-faq-item"><strong>Do you offer financing?</strong><span>Yes, through trusted local partners.</span></div>
                <div className="fx-faq-item"><strong>Is the process digital?</strong><span>Yes, documents and payment flows are managed online.</span></div>
              </div>
            </div>
          </section>
        )}

        {!isProfileModalOpen && landingView === 'profile' && (
          <section className="fx-profile-screen" id="profile">
            <div className="fx-profile-heading">
              <div>
                <span className="fx-about-kicker">YOUR ACCOUNT</span>
                <h2>Edit your profile</h2>
                <p>Keep your details current so the FLX team can personalize every property conversation.</p>
              </div>
              {profileSaved ? <span className="fx-profile-saved"><Check size={14} /> Saved</span> : null}
            </div>

            <div className="fx-profile-layout">
              <div className="fx-profile-photo-panel">
                <div className="fx-profile-photo-frame">
                  {profileDraft.photo ? (
                    <img src={profileDraft.photo} alt="Profile preview" />
                  ) : (
                    <span className="fx-profile-large-initials">{userInitials}</span>
                  )}
                  <span className="fx-profile-camera-badge"><Camera size={18} /></span>
                </div>
                <h3>Profile photo</h3>
                <p>Use a clear image where your face is easy to recognize.</p>
                <div className="fx-profile-photo-actions">
                  <label className="fx-profile-upload-btn">
                    <Upload size={15} />
                    {profileDraft.photo ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/*" onChange={handleProfilePhoto} />
                  </label>
                  {profileDraft.photo ? (
                    <button type="button" className="fx-profile-remove-btn" onClick={removeProfilePhoto} aria-label="Remove profile photo">
                      <Trash2 size={15} /> Remove
                    </button>
                  ) : null}
                </div>
                <span className="fx-profile-photo-note">JPG, PNG or WEBP. Maximum 5 MB.</span>
              </div>

              <div className="fx-profile-form-panel">
                <div className="fx-profile-form-grid">
                  <label>
                    Full name
                    <input value={profileDraft.name} onChange={(event) => updateProfileDraft('name', event.target.value)} placeholder="Your full name" />
                  </label>
                  <label>
                    Email address
                    <input type="email" value={profileDraft.email} onChange={(event) => updateProfileDraft('email', event.target.value)} placeholder="you@example.com" />
                  </label>
                  <label>
                    Phone number
                    <input value={profileDraft.phone} onChange={(event) => updateProfileDraft('phone', event.target.value)} placeholder="+255 ..." />
                  </label>
                  <label>
                    Location
                    <input value={profileDraft.location} onChange={(event) => updateProfileDraft('location', event.target.value)} placeholder="City, country" />
                  </label>
                  <label className="fx-profile-field-full">
                    Account role
                    <input value={profileDraft.role} readOnly aria-label="Account role" />
                  </label>
                  <label className="fx-profile-field-full">
                    About you
                    <textarea value={profileDraft.bio} onChange={(event) => updateProfileDraft('bio', event.target.value)} rows={5} placeholder="Tell clients a little about yourself" />
                  </label>
                </div>

                <div className="fx-profile-form-footer">
                  <span>Your profile is private and only shared when needed for a property transaction.</span>
                  <div>
                    <button type="button" className="fx-profile-cancel-btn" onClick={() => setLandingView('home')}>Cancel</button>
                    <button type="button" className="fx-profile-save-btn" onClick={saveProfile}>Save changes</button>
                  </div>
                </div>
              </div>
            </div>

            <section className="fx-role-access-panel">
              <div className="fx-role-access-copy">
                <span className="fx-about-kicker">FOR PROPERTY PROFESSIONALS</span>
                <h2>Need an operational workspace?</h2>
                <p>Clients can complete their property journey here. Owners, agents, investors, and admins use a separate desktop workspace built for repeated daily work.</p>
              </div>
              <div className="fx-role-login-box">
                <div className="fx-role-selector" role="tablist" aria-label="Choose workspace role">
                  {(['Owner', 'Agent', 'Investor', 'Admin'] as const).map((role) => <button key={role} className={workspaceLoginRole === role ? 'active' : ''} type="button" onClick={() => { setWorkspaceLoginRole(role); setWorkspaceLoginError(''); }}>{role}</button>)}
                </div>
                <div className="fx-role-login-fields">
                  <input type="email" value={workspaceLoginEmail} onChange={(event) => setWorkspaceLoginEmail(event.target.value)} placeholder={`${workspaceLoginRole.toLowerCase()}@flxrealty.com`} aria-label="Workspace email" />
                  <input type="password" value={workspaceLoginPassword} onChange={(event) => setWorkspaceLoginPassword(event.target.value)} placeholder="Password" aria-label="Workspace password" />
                  <button type="button" className="fx-profile-save-btn" onClick={() => void enterRoleWorkspace()} disabled={authLoading}>{authLoading ? 'Signing in...' : 'Open workspace'} {!authLoading ? <ArrowRight size={14} /> : null}</button>
                </div>
                {workspaceLoginError ? <span className="fx-role-login-error">{workspaceLoginError}</span> : <span className="fx-role-login-hint">Demo: {workspaceLoginRole.toLowerCase()}@flx.local / {workspaceLoginRole.toLowerCase()}123</span>}
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
