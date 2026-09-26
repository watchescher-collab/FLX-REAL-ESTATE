import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement, FormEvent } from "react";
import { RealEstateLeafletMap } from "./components/RealEstateLeafletMap";
import { HostelDetailPage } from "./components/HostelDetailPage";
import { MarketplaceClientFlow } from "./components/MarketplaceClientFlow";
import { LocalAuthModal } from "./components/LocalAuthModal";
import { WorkspaceAccountMenu, WorkspaceTopBar } from "./components/WorkspaceChrome";
import "./components/workspaceAccess.css";
import "./components/opsControl.css";
import { getStoredToken, signIn as signInApi, signOut as signOutApi } from "./auth";
import { useAuth } from "./context/AuthContext";
import { useLocation } from "react-router-dom";
import type { Property } from "./types";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Camera,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ClipboardCheck,
  FileCheck2,
  Heart,
  Home,
  Landmark,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Utensils,
  UserRound,
  UsersRound,
  Wallet,
  Wrench,
  Wifi,
  X,
  Zap,
} from "lucide-react";

type Role = "Explore" | "Client" | "Agent" | "Owner" | "Ops";
type Listing = {
  id: number;
  title: string;
  city: string;
  price: string;
  period: string;
  image: string;
  badge?: string;
  tag?: string;
  category?: string;
};

type ClientDashboard = {
  resident?: { name: string; property: string; room: string; status: string };
  stats?: Array<{ label: string; value: string; meta: string }>;
  reminders?: Array<{ time: string; title: string; body: string }>;
  tickets?: Array<{ id: number; title: string; status: string; eta: string }>;
};

type AgentLead = {
  id: string;
  title: string;
  note: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  source?: string;
  intent?: "Buy" | "Rent";
  budget?: number | null;
  preferred_area?: string;
  stage?: "New" | "Contacted" | "Qualified" | "Viewing" | "Offer" | "Won" | "Lost";
  urgency?: string;
  next_contact_at?: string | null;
  assigned_agent_id?: string | null;
  created_at?: string;
};

type NewAgentLead = {
  title: string;
  note: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  source: string;
  intent: "Buy" | "Rent";
  budget: string;
  preferred_area: string;
  property_id: string;
  consent: boolean;
  urgency: string;
  next_contact_at: string;
  assigned_agent_id: string;
};

type AgentDashboard = {
  profile?: { name: string; title: string };
  accessError?: string;
  stats?: Array<{ label: string; value: string; delta: string }>;
  leads?: AgentLead[];
  deals?: Array<{ id: number; title: string; status: string; note: string }>;
  contracts?: Array<{ id: number; title: string; note: string }>;
};

const crmAuthHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const serviceCatalog = [
  { slug: "house-renting", title: "House renting & leasing", description: "Long-term and flexible rentals for families, professionals, and relocations.", category: "Homes", accent: "🏡", roles: ["Client", "Owner"] },
  { slug: "apartment-renting", title: "Apartment renting & leasing", description: "Modern apartments for solo renters, roommates, and growing households.", category: "Apartments", accent: "🏙️", roles: ["Client", "Owner"] },
  { slug: "rooms-hostels", title: "Rooms & hostel rentals", description: "Secure student and worker accommodation with verified onboarding and support.", category: "Student", accent: "🛏️", roles: ["Client", "Owner", "Agent"] },
  { slug: "short-stay", title: "Airbnb & short-stay properties", description: "Managed short-stay assets for guest experience, daily occupancy, and turnover.", category: "Homes", accent: "✨", roles: ["Owner", "Investor"] },
  { slug: "property-sales", title: "Property buying & selling", description: "End-to-end acquisition and resale support for homes, assets, and income properties.", category: "Homes", accent: "💰", roles: ["Client", "Investor", "Owner"] },
  { slug: "land-sales", title: "Plot / land buying & selling", description: "Residential, commercial, and strategic land transactions with due diligence support.", category: "Land", accent: "🌱", roles: ["Client", "Investor", "Owner"] },
  { slug: "farm-sales", title: "Farms buying & selling", description: "Agricultural land and farm operations for income generation or expansion.", category: "Land", accent: "🚜", roles: ["Investor", "Owner"] },
  { slug: "investment-consultation", title: "Real estate investment consultation", description: "Portfolio advisory, buyer guidance, and yield assessment for growth-focused investors.", category: "Commercial", accent: "📊", roles: ["Investor", "Client"] },
  { slug: "warehouse-sales", title: "Warehouses & godowns renting & selling", description: "Storage, logistics, and industrial facilities for tenants and operators.", category: "Commercial", accent: "📦", roles: ["Client", "Investor", "Owner"] },
  { slug: "industrial-yards", title: "Industrial yards & open spaces", description: "Flexible industrial land and open spaces for operations, staging, and expansion.", category: "Commercial", accent: "🏭", roles: ["Investor", "Owner"] },
  { slug: "valuation", title: "Property valuation assistance", description: "Accurate value guidance for pricing strategy, financing, and acquisition decisions.", category: "Commercial", accent: "📐", roles: ["Owner", "Investor", "Agent"] },
  { slug: "sourcing", title: "Property sourcing on request", description: "Bespoke acquisition support targeting the right asset and right terms.", category: "Commercial", accent: "🔎", roles: ["Client", "Investor"] },
  { slug: "management", title: "Property management", description: "Operations, tenant support, and portfolio oversight for owners and landlords.", category: "Homes", accent: "🧭", roles: ["Owner", "Agent", "Admin"] },
  { slug: "marketing", title: "Property marketing & listing", description: "Branding, listing campaigns, and go-to-market preparation for real estate owners.", category: "Commercial", accent: "📢", roles: ["Owner", "Agent", "Admin"] },
  { slug: "commercial-leasing", title: "Commercial property leasing & sales", description: "Retail, office, and mixed-use spaces aligned to business strategy and location.", category: "Commercial", accent: "🏬", roles: ["Client", "Owner", "Investor"] },
  { slug: "office-renting", title: "Office space renting", description: "Flexible office solutions for startups, SMEs, and growing businesses.", category: "Commercial", accent: "💼", roles: ["Client", "Owner"] },
  { slug: "retail-renting", title: "Shops & retail space renting", description: "Prime retail units and storefronts for traders, brands, and businesses.", category: "Commercial", accent: "🛍️", roles: ["Client", "Owner"] },
  { slug: "documentation", title: "Land & property documentation assistance", description: "Support on title checks, paperwork, and transaction files for safer closings.", category: "Land", accent: "📄", roles: ["Owner", "Client", "Agent"] },
  { slug: "viewing-assistance", title: "Property viewing & inspection assistance", description: "Guided tours, inspection scheduling, and decision support before commitment.", category: "Homes", accent: "👀", roles: ["Client", "Investor"] },
  { slug: "tenant-support", title: "Tenant & landlord support", description: "Conflict resolution, paperwork, occupancy support, and day-to-day property guidance.", category: "Homes", accent: "🤝", roles: ["Owner", "Client", "Agent"] },
];

type OwnerDashboard = {
  portfolio?: {
    totalRevenue: string;
    occupancy: string;
    paymentBalance: string;
    units: Array<{ name: string; label: string; value: string; status: string }>;
  };
  maintenance?: Array<{ title: string; location: string; state: string }>;
};

type OpsDashboard = {
  queue?: Array<{ label: string; status: string; details: string }>;
  paymentSummary?: { balance?: string; flags?: string } | null;
  disputes?: Array<{ title: string; summary: string; action: string; status?: string; resolvedAt?: string }>;
  auditTrail?: Array<{ id: string; action: string; target: string; at: string }>;
};

type OpsSearchCategory = 'Property' | 'Parcel' | 'Person' | 'Case' | 'Escrow deal' | 'Transaction';
type OpsSearchRecord = { id: string; category: OpsSearchCategory; title: string; detail: string; source: string; status?: string };
type OpsHealthState = 'Checking' | 'Connected' | 'Stale' | 'Unavailable' | 'Not configured' | 'Configured, not probed';
type OpsHealthItem = { id: string; label: string; state: OpsHealthState; detail: string; checkedAt?: string };
type EscrowDealRecord = { id: number; title: string; status: string; amount: string; progress: number; created_at?: string };
type PendingOpsAction = { title: string; message: string; confirmLabel: string; run: () => void };

const fallbackListings: Listing[] = [
  {
    id: 1,
    title: "Mlimani Comfort Hostel (Block B)",
    city: "Mwenge / UDSM Main Gate, Dar",
    price: "TZS 280,000",
    period: "per semester - TZS 65k/mo",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85",
    badge: "Student Verified",
    tag: "Water 24/7",
    category: "Hostels",
  },
  {
    id: 2,
    title: "Victoria Office Hub (Floor 4)",
    city: "New Bagamoyo Rd, Kijitonyama",
    price: "TZS 1,400,000",
    period: "per month - VAT inclusive",
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85",
    badge: "Commercial Ready",
    tag: "Dedicated Fiber",
    category: "Commercial",
  },
  {
    id: 3,
    title: "Ardhi Breeze Hostel",
    city: "Mikocheni, Kinondoni, Dar",
    price: "TZS 320,000",
    period: "per semester - Self-Contained",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=85",
    badge: "Quiet Study Zone",
    tag: "Borehole Water",
    category: "Hostels",
  },
  {
    id: 4,
    title: "Prime Residential Plot (Surveyed)",
    city: "Bunju A, Kinondoni / Bagamoyo Rd",
    price: "TZS 28,000,000",
    period: "Title Deed / Family Land Ministry",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85",
    badge: "Title Deed Cleared",
    tag: "600 sqm",
    category: "Land",
  },
];

const roleNavItems: Record<Role, Array<{ id: string; role: Role; label: string; icon: typeof Home }>> = {
  Explore: [
    { id: "market", role: "Explore", label: "Market", icon: Search },
    { id: "home", role: "Client", label: "Hostels", icon: UserRound },
    { id: "overview", role: "Agent", label: "Offices", icon: ClipboardCheck },
    { id: "overview", role: "Owner", label: "Land", icon: Building2 },
    { id: "live", role: "Ops", label: "Ops", icon: ShieldCheck },
  ],
  Client: [
    { id: "home", role: "Client", label: "Home", icon: Home },
    { id: "rent", role: "Client", label: "Bills", icon: Wallet },
    { id: "tickets", role: "Client", label: "Tickets", icon: Wrench },
    { id: "visitors", role: "Client", label: "Visit", icon: UsersRound },
    { id: "safety", role: "Client", label: "Safety", icon: ShieldCheck },
  ],
  Agent: [
    { id: "overview", role: "Agent", label: "Overview", icon: Activity },
    { id: "leads", role: "Agent", label: "Leads", icon: UsersRound },
    { id: "deals", role: "Agent", label: "Deals", icon: ClipboardCheck },
    { id: "contracts", role: "Agent", label: "Contracts", icon: FileCheck2 },
    { id: "settings", role: "Agent", label: "Settings", icon: Settings2 },
  ],
  Owner: [
    { id: "overview", role: "Owner", label: "Overview", icon: LayoutDashboard },
    { id: "pipeline", role: "Owner", label: "Pipeline", icon: Activity },
    { id: "units", role: "Owner", label: "Units", icon: Building2 },
    { id: "finance", role: "Owner", label: "Finance", icon: Wallet },
    { id: "repairs", role: "Owner", label: "Repairs", icon: Wrench },
  ],
  Ops: [
    { id: "live", role: "Ops", label: "Live", icon: Activity },
    { id: "verify", role: "Ops", label: "Verify", icon: Check },
    { id: "monitor", role: "Ops", label: "Monitor", icon: ShieldCheck },
    { id: "disputes", role: "Ops", label: "Disputes", icon: Bell },
    { id: "audit", role: "Ops", label: "Audit", icon: FileCheck2 },
  ],
};

const money = (value: string) => value.replace("/mo", "").replace("/sem", "");
const defaultProfilePhoto = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85";

function FlxMark() {
  return (
    <div className="os-brand">
      <img src="/assets/flx-logo-round.jpeg" alt="" />
      <span>REAL ESTATE</span>
    </div>
  );
}

function TopBar({
  role,
  onRole,
}: {
  role: Role;
  onRole: (role: Role) => void;
}) {
  const productLinks: Array<{ label: string; target: Role }> =
    role === "Explore"
      ? [
          { label: "Marketplace", target: "Explore" },
          { label: "Student living", target: "Client" },
          { label: "Commercial", target: "Agent" },
          { label: "Land & titles", target: "Owner" },
        ]
      : role === "Client"
        ? [
            { label: "Residence", target: "Client" },
            { label: "Ledger", target: "Client" },
            { label: "Tickets", target: "Client" },
            { label: "Security", target: "Client" },
          ]
        : role === "Agent"
          ? [
              { label: "Leads", target: "Agent" },
              { label: "Deals", target: "Agent" },
              { label: "Contracts", target: "Agent" },
              { label: "Commissions", target: "Agent" },
            ]
          : role === "Owner"
            ? [
                { label: "Portfolio", target: "Owner" },
                { label: "Finance", target: "Owner" },
                { label: "Maintenance", target: "Owner" },
                { label: "Contracts", target: "Owner" },
              ]
            : [
                { label: "Live queue", target: "Ops" },
                { label: "Verifications", target: "Ops" },
                { label: "Payments", target: "Ops" },
                { label: "Audit", target: "Ops" },
              ];

  return (
    <header className="os-topbar">
      <div className="os-topbar-inner">
        <FlxMark />
        <div className="os-location">
          <MapPin size={12} /> Dar es Salaam <ChevronRight size={12} />
        </div>
        {role === "Explore" ? (
          <div className="os-marketplace-links">
            {productLinks.map(({ label, target }) => (
              <button
                key={label}
                type="button"
                className={target === role ? "is-active" : ""}
                onClick={() => onRole(target)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="os-top-actions">
          <button className="os-currency">
            TZS <ChevronRight size={11} />
          </button>
          <button className="os-icon-button" aria-label="Notifications">
            <Bell size={17} />
          </button>
          <WorkspaceAccountMenu />
        </div>
      </div>
      {role !== "Explore" ? (
        <div className="os-context-row">
          <div>
            <span className="os-kicker">FLX REAL ESTATE • DAR ES SALAAM</span>
            <h1>
              {role === "Client"
                ? "Client Dashboard"
                : role === "Agent"
                  ? "Estate Agent CRM"
                  : role === "Owner"
                    ? "Property Owner OS"
                    : "FLX Ops Center"}
            </h1>
          </div>
          <button className="os-qr-button" aria-label="Open QR">
            <QrCode size={18} />
          </button>
        </div>
      ) : null}
    </header>
  );
}

function ListingCard({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (listing: Listing) => void;
}) {
  return (
    <article className="os-listing-card">
      <button className="os-listing-media" onClick={() => onOpen(listing)}>
        <img src={listing.image} alt={listing.title} />
        <span className="os-listing-badge">
          <Check size={12} /> {listing.badge}
        </span>
        <span className="os-listing-heart">
          <Heart size={17} />
        </span>
        <div className="os-image-caption">
          <strong>{listing.price}</strong>
          <small>{listing.period}</small>
        </div>
      </button>
      <div className="os-listing-body">
        <div className="os-listing-title-row">
          <h3>{listing.title}</h3>
          <span className="os-rating">
            <Star size={12} className="fill-current" /> 4.8 (34)
          </span>
        </div>
        <p className="os-muted">
          <MapPin size={13} /> {listing.city}
        </p>
        <div className="os-chip-row">
          <span>{listing.tag}</span>
          <span>
            {listing.category === "Land"
              ? "TANESCO LUCU Connected"
              : "Free Fiber WiFi"}
          </span>
        </div>
        <div className="os-listing-actions">
          <button className="os-primary-button" onClick={() => onOpen(listing)}>
            Request viewing <CalendarDays size={14} />
          </button>
          <button className="os-secondary-button">
            <MessageSquare size={14} /> Ongea
          </button>
        </div>
      </div>
    </article>
  );
}

function ExploreScreen({
  listings,
  onOpen,
}: {
  listings: Listing[];
  onOpen: (listing: Listing) => void;
}) {
  const [filter, setFilter] = useState("Hostels");
  const [compareIds, setCompareIds] = useState<number[]>([1, 2]);
  const mapLookup = useMemo(() => new Map(listings.map((listing) => [String(listing.id), listing])), [listings]);
  const mapProperties = useMemo<Property[]>(() => listings.map((listing, index) => ({
    id: String(listing.id),
    created_at: new Date().toISOString(),
    title: listing.title,
    property_type: listing.category === "Commercial" ? "Invest" : "Live",
    status: "Approved",
    price: Number(String(listing.price).replace(/[^0-9]/g, "")) || 0,
    video_url: "",
    thumbnail_url: listing.image,
    images: [listing.image],
    location: {
      lat: [-6.7720, -6.8190, -6.7420, -6.7380][index] ?? -6.7924,
      lng: [39.2050, 39.2830, 39.2500, 39.2750][index] ?? 39.2083,
      address: listing.city,
      city: listing.city.split(",")[0].trim(),
      state: "Tanzania",
      zip: "14111",
    },
    agent: {
      id: "flx-demo",
      name: "FLX Real Estate",
      avatar: "",
      phone: "+255 712 345 678",
      email: "hello@flxrealty.com",
      license: "FLX",
      role: "Agent",
    },
    metadata: {
      beds: listing.category === "Hostels" ? 2 : 0,
      baths: listing.category === "Hostels" ? 2 : 0,
      sqft: listing.category === "Land" ? 600 : 2200,
    },
    description: listing.badge || listing.title,
    featured: listing.id === 1,
  })), [listings]);
  const filtered = listings.filter(
    (item) =>
      filter === "All" ||
      (filter === "Hostels" && item.category === "Hostels") ||
      (filter === "Commercial" && item.category === "Commercial") ||
      (filter === "Land" && item.category === "Land"),
  );
  const visibleListings = filtered.length ? filtered : listings;
  const toggleCompare = (id: number) => setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-3));
  return (
    <main className="os-marketplace">
      <div className="os-marketplace-search"><div><Search size={16} /><span>Search hostels near UDSM, office in Posta, land in Kigamboni...</span></div><button><SlidersHorizontal size={15} /> Filters</button></div>
      <div className="os-marketplace-location"><strong><span className="os-live-dot" /> Dar es Salaam Verified Marketplace</strong><span>142 Active Units • MLHHSD Real-Time Cadastral Geocodes</span><button>Change Metro</button></div>
      <div className="os-marketplace-filters"><div className="os-marketplace-pills">{[["All Units", "142"], ["Student Hostels", "58"], ["Commercial Offices", "24"], ["Cadastral Plots & Land", "38"], ["Luxury Flats", "22"]].map(([label, count], index) => <button key={label} className={index === 0 || (filter === "Hostels" && index === 1) ? "active" : ""} onClick={() => setFilter(index === 1 ? "Hostels" : index === 2 ? "Commercial" : index === 3 ? "Land" : "All")}>{label}<b>{count}</b></button>)}</div><select aria-label="Sort listings" defaultValue="Ministry vetted"><option>Ministry vetted</option><option>Nearest first</option><option>Price low to high</option></select></div>
      <div className="os-marketplace-constraints"><span>CONSTRAINTS:</span><b>Near UDSM (&lt;5km)</b><b>24/7 DAWASA Reserve</b><b>100% Redundant Genset</b><b>e-Ardhi Title Clean</b><b>Verified payment terms</b><em>Price cap: TZS 280k - 50M+</em></div>
      <div className="os-marketplace-grid"><section className="os-marketplace-results"><div className="os-marketplace-results-heading"><div><h1>Dar es Salaam Verified Marketplace</h1><span>142 active units • live local verification</span></div><strong>99.8% title vetting</strong></div>{visibleListings.map((listing) => <article className={`os-market-listing ${compareIds.includes(listing.id) ? "is-compared" : ""}`} key={listing.id}><button className="os-market-listing-image" onClick={() => onOpen(listing)}><img src={listing.image} alt={listing.title} /><span>{listing.badge}</span><Heart size={16} /></button><div className="os-market-listing-copy"><div className="os-market-listing-topline"><span>{listing.category === "Land" ? "KIGAMBONI MUNICIPALITY" : listing.category === "Commercial" ? "ILALA CENTRAL • FINANCIAL DISTRICT" : "STUDENT LIVING"}</span><strong>{listing.price}<small>{listing.period}</small></strong></div><h2>{listing.title}</h2><div className="os-market-tags"><span><Check size={11} /> Verified title</span><span><Zap size={11} /> DAWASA / power ready</span></div><p>Turnkey property listing verified with local partners. Clear location context, practical amenities, and direct viewing support.</p><div className="os-market-actions"><label><input type="checkbox" checked={compareIds.includes(listing.id)} onChange={() => toggleCompare(listing.id)} /> Compare {listing.category?.toLowerCase()}</label><button className="os-secondary-button" onClick={() => onOpen(listing)}>View dossier</button><button className="os-primary-button" onClick={() => onOpen(listing)}>Request viewing <ArrowRight size={13} /></button></div></div></article>)}</section><aside className="os-market-map-panel"><div className="os-market-map-toolbar"><span>MAP LAYERS</span><button className="active">Cadastral</button><button>Satellite</button><button>DAWASA</button><button>BRT</button></div><RealEstateLeafletMap
          properties={mapProperties}
          selectedProperty={mapProperties[0] ?? null}
          onSelectProperty={(property) => {
            const match = mapLookup.get(property.id);
            if (match) onOpen(match);
          }}
          onOpenDetails={(property) => {
            const match = mapLookup.get(property.id);
            if (match) onOpen(match);
          }}
          userLocation={null}
        /><div className="os-cadastral-index"><div><span>DAWASA pressure</span><strong>3.8 Bar</strong><small>Normal flow</small></div><div><span>TANESCO grid</span><strong>99.1%</strong><small>Sub-station Ubugo</small></div><div><span>e-Ardhi Sync</span><strong>&lt;3 mins</strong><small>Live API hook</small></div></div></aside></div>
      {compareIds.length > 0 ? <div className="os-market-compare-tray"><span><b>{compareIds.length}</b> selected</span><strong>Side-by-Side Comparison</strong><small>Compare selected property specifications</small><button onClick={() => setCompareIds([])}>Clear</button><button className="os-primary-button">Launch specs matrix <ArrowRight size={13} /></button></div> : null}
      <div className="os-market-pagination"><span>Showing 1 to {visibleListings.length} of 142 cadastral assets</span><button>Previous</button><b>1</b><button>2</button><button>3</button><button>Next</button></div>
      <section className="os-conveyance-band"><ShieldCheck size={20} /><div><strong>FLX Sovereign Conveyance Framework</strong><span>Every parcel and property is reconciled against the Ministry of Lands and Bank of Tanzania standards.</span></div><span>e-Ardhi verified</span><span>RTK GPS demarcation</span></section>
      <footer className="os-market-footer"><div><strong>FLX Real Estate</strong><span>Property information from the FLX field team.</span></div><div><b>Marketplace</b><span>Dar es Salaam properties</span><span>Student living</span></div><div><b>Due diligence</b><span>Title and location records</span><span>Property map</span></div><div><b>Contact</b><span>Send a question to FLX</span><span>Availability confirmed by an agent</span></div></footer>
    </main>
  );
}

function ClientScreen({
  onOpen,
  activeView,
  dashboard,
  onAddTicket,
  onQuickAction,
}: {
  onOpen: (listing: Listing) => void;
  activeView: string;
  dashboard: ClientDashboard;
  onAddTicket: (title: string, status: string, eta: string) => void;
  onQuickAction: (action: string) => void;
}) {
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const stats = dashboard.stats ?? [];
  const reminders = dashboard.reminders ?? [];
  const tickets = dashboard.tickets ?? [];

  const clientViews: Record<string, ReactElement> = {
    home: (
      <>
        <section className="os-profile-card">
          <div className="os-profile-avatar">JB</div>
          <div className="os-profile-copy">
            <strong>Juma Bakari</strong>
            <span>UDSM Computer Science Scholar</span>
          </div>
          <span className="os-semester">Semester 1</span>
          <div className="os-profile-status">
            <span><ShieldCheck size={13} /> NIDA<br /><b>Verified</b></span>
            <span><Check size={13} /> UDSM<br /><b>Validated</b></span>
            <span><Landmark size={13} /> Tier-1<br /><b>Trust</b></span>
          </div>
        </section>
        <section className="os-residence-card">
          <div className="os-residence-top">
            <div>
              <span className="os-kicker">CURRENT RESIDENCE</span>
              <h2>Mlimani Comfort<br />Hostel</h2>
              <p>Mwenge / Survey, Room 204-B</p>
            </div>
            <span className="os-lease-tag"><Check size={14} /> Lease Active</span>
          </div>
          <div className="os-residence-stats">
            <div><span>Next Due Cycle</span><strong>62 Days Left</strong><small>Due: Dec 31, 2024</small></div>
            <div><span>Rent Ledger</span><strong>TZS 1,200,000</strong><small>Paid to date</small></div>
          </div>
          <div className="os-caretaker">
            <span>◉</span>
            <strong>Bahati (Caretaker)<small>Gate 1 Station</small></strong>
            <button><Phone size={14} /> Call</button>
            <button className="os-danger-button"><QrCode size={14} /> QR Pass</button>
          </div>
        </section>
        <section>
          <div className="os-section-heading"><h2>Resident Operations</h2><span>Quick Hub</span></div>
          <div className="os-quick-grid">
            {[
              ["Pay Rent", "M-Pesa / Tigo", Wallet],
              ["Tickets", "Luku / Water", Wrench],
              ["Visitor QR", "One-Tap Pass", UsersRound],
              ["Laundry", "Schedule slot", CalendarDays],
              ["Expenses", "Bajaji & Food", CircleDollarSign],
              ["SOS Help", "Security / Ops", ShieldCheck],
            ].map(([title, sub, Icon]) => (
              <button key={title as string} onClick={() => onQuickAction(title as string)} className={title === "SOS Help" ? "os-quick-item danger" : "os-quick-item"}>
                <Icon size={18} />
                <strong>{title as string}</strong>
                <small>{sub as string}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="os-utility-card">
          <div className="os-section-heading"><h2><Sparkles size={17} /> Living snapshot</h2><span>Today</span></div>
          <div className="os-stat-grid">
            {stats.map((item) => (
              <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.meta}</small></div>
            ))}
          </div>
        </section>

        <section className="os-utility-card">
          <div className="os-section-heading"><h2><CalendarDays size={17} /> Smart reminders</h2><span>Next 7 days</span></div>
          {reminders.map((reminder) => (
            <div key={`${reminder.time}-${reminder.title}`} className="os-ticket"><span>{reminder.time}</span><strong>{reminder.title}</strong><small>{reminder.body}</small></div>
          ))}
        </section>

        <section className="os-utility-card">
          <div className="os-section-heading"><h2><FileCheck2 size={17} /> Access & documents</h2><span>Resident vault</span></div>
          <div className="os-stat-grid">
            <div><span>Lease</span><strong>Signed</strong><small>Valid through Dec 2024</small></div>
            <div><span>Identity</span><strong>Verified</strong><small>NIDA + UDSM</small></div>
            <div><span>QR access</span><strong>Ready</strong><small>Entry granted</small></div>
            <div><span>Care plan</span><strong>Healthy</strong><small>2 maintenance tasks</small></div>
          </div>
        </section>

        <section className="os-utility-card">
          <div className="os-section-heading"><h2><Wrench size={17} /> Live service tools</h2><span>Request support</span></div>
          <div className="os-ticket-form">
            <input value={newTicketTitle} onChange={(event) => setNewTicketTitle(event.target.value)} placeholder="Describe an issue or request" />
            <button className="os-primary-button" onClick={() => { if (!newTicketTitle.trim()) return; onAddTicket(newTicketTitle.trim(), 'Open', 'Assigned now'); setNewTicketTitle(''); }}>Create ticket</button>
          </div>
          {tickets.map((ticket) => (
            <div key={ticket.id} className="os-ticket"><span>Ticket #{ticket.id}</span><strong>{ticket.title}</strong><small>{ticket.status} • {ticket.eta}</small></div>
          ))}
        </section>
      </>
    ),
    rent: (
      <section className="os-utility-card">
        <div className="os-section-heading"><h2><Wallet size={17} /> Rent & Payment Ledger</h2><span>Updated today</span></div>
        <div className="os-ledger-total">
          <span>Outstanding</span>
          <strong>TZS 280,000 <small>Due</small></strong>
          <button className="os-primary-button" onClick={() => onQuickAction('Pay Rent')}>Pay now</button>
        </div>
        <div className="os-pipeline-row"><span>Semester balance<small>Due 22 Oct</small></span><strong>TZS 1,200,000</strong></div>
      </section>
    ),
    tickets: (
      <section className="os-utility-card">
        <div className="os-section-heading"><h2><Wrench size={17} /> Service Tickets</h2><span>2 open</span></div>
        <div className="os-ticket"><span>Ticket #T-104</span><strong>Desk lamp socket fix</strong><small>Technician: Hamisi • ETA 3:00 PM</small></div>
        <div className="os-ticket"><span>Ticket #T-118</span><strong>Water pressure check</strong><small>Assigned: Facilities team • Tracking</small></div>
      </section>
    ),
    visitors: (
      <section className="os-profile-card">
        <div className="os-profile-avatar">GV</div>
        <div className="os-profile-copy"><strong>Guest Passes</strong><span>5 valid entries this week</span></div>
        <span className="os-semester">2 active</span>
        <div className="os-profile-status">
          <span><UsersRound size={13} /> Visitor<br /><b>3 today</b></span>
          <span><QrCode size={13} /> QR pass<br /><b>Ready</b></span>
          <span><ShieldCheck size={13} /> Security<br /><b>Checked</b></span>
        </div>
      </section>
    ),
    safety: (
      <section className="os-utility-card">
        <div className="os-section-heading"><h2><ShieldCheck size={17} /> Safety & Security</h2><span>Live status</span></div>
        <div className="os-stat-grid"><div><span>Gate</span><strong>Open</strong><small>Night guard active</small></div><div><span>Alerts</span><strong className="os-red-text">1</strong><small>High risk area</small></div></div>
      </section>
    ),
  };

  return <main className="os-main">{clientViews[activeView] ?? clientViews.home}</main>;
}

function AgentScreen({ activeView, dashboard, onAddLead, onUpdateLeadStage, onBulkAssign, onReviewDeal, onAuthenticate }: { activeView: string; dashboard: AgentDashboard; onAddLead: (lead: NewAgentLead) => Promise<void>; onUpdateLeadStage: (leadId: string, stage: NonNullable<AgentLead["stage"]>, lossReason?: string) => Promise<void>; onBulkAssign: (leadIds: string[], assignedAgentId: string) => Promise<void>; onReviewDeal: (dealId: number) => void; onAuthenticate: () => Promise<void>; }) {
  const [leadForm, setLeadForm] = useState<NewAgentLead>({ title: "", note: "", client_name: "", client_email: "", client_phone: "", source: "Agent intake", intent: "Buy", budget: "", preferred_area: "", property_id: "", consent: false, urgency: "Normal", next_contact_at: "", assigned_agent_id: "" });
  const [leadFormMessage, setLeadFormMessage] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStageFilter, setLeadStageFilter] = useState("All");
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [activityByLead, setActivityByLead] = useState<Record<string, Array<{ type: string; body: string; actor_id: string; created_at: string }>>>({});
  const [lossLeadId, setLossLeadId] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [leadActionMessage, setLeadActionMessage] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [assignmentAgentId, setAssignmentAgentId] = useState("");
  const [reviewingDeal, setReviewingDeal] = useState<NonNullable<AgentDashboard["deals"]>[number] | null>(null);
  const leads = dashboard.leads ?? [];
  const visibleLeads = leads.filter((lead) => {
    const query = leadSearch.trim().toLowerCase();
    const matchesSearch = !query || `${lead.title} ${lead.client_name ?? ""} ${lead.client_email ?? ""} ${lead.client_phone ?? ""} ${lead.preferred_area ?? ""}`.toLowerCase().includes(query);
    return matchesSearch && (leadStageFilter === "All" || lead.stage === leadStageFilter);
  });
  const deals = dashboard.deals ?? [];
  const contracts = dashboard.contracts ?? [];
  const agentName = dashboard.profile?.name || 'Agent';
  const agentInitials = agentName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const leadStages: NonNullable<AgentLead["stage"]>[] = ["New", "Contacted", "Qualified", "Viewing", "Offer", "Won", "Lost"];

  if (dashboard.accessError) {
    return <main className="os-main"><section className="crm-access-state"><h2>CRM access unavailable</h2><p>{dashboard.accessError}</p><form onSubmit={async (event) => { event.preventDefault(); setAuthMessage(""); try { await signInApi(authEmail, authPassword); await onAuthenticate(); } catch (error) { setAuthMessage(error instanceof Error ? error.message : "Sign-in failed."); } }}><label>Email<input type="email" autoComplete="username" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required /></label><button className="os-primary-button" type="submit">Sign in</button>{authMessage && <p role="alert">{authMessage}</p>}</form></section></main>;
  }

  const updateLeadForm = (field: keyof NewAgentLead, value: string | boolean) => setLeadForm((current) => ({ ...current, [field]: value }));
  const submitLead = async () => {
    setLeadFormMessage("");
    try {
      await onAddLead(leadForm);
      setLeadForm({ title: "", note: "", client_name: "", client_email: "", client_phone: "", source: "Agent intake", intent: "Buy", budget: "", preferred_area: "", property_id: "", consent: false, urgency: "Normal", next_contact_at: "", assigned_agent_id: "" });
      setLeadFormMessage("Lead saved.");
    } catch (error) {
      setLeadFormMessage(error instanceof Error ? error.message : "Lead could not be saved.");
    }
  };

  const toggleLeadActivity = async (leadId: string) => {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      return;
    }
    setExpandedLeadId(leadId);
    if (activityByLead[leadId]) return;
    const response = await fetch(`/api/agent/leads/${encodeURIComponent(leadId)}/activities`, { headers: crmAuthHeaders() });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setLeadActionMessage(payload?.error || "Activity history could not be loaded.");
      return;
    }
    setActivityByLead((current) => ({ ...current, [leadId]: payload.activities ?? [] }));
  };

  const changeLeadStage = async (leadId: string, stage: NonNullable<AgentLead["stage"]>) => {
    setLeadActionMessage("");
    if (stage === "Lost") {
      setLossLeadId(leadId);
      return;
    }
    try {
      await onUpdateLeadStage(leadId, stage);
      setLeadActionMessage("Lead stage updated.");
      setActivityByLead((current) => { const next = { ...current }; delete next[leadId]; return next; });
    } catch (error) {
      setLeadActionMessage(error instanceof Error ? error.message : "Lead stage could not be updated.");
    }
  };

  const agentViews: Record<string, ReactElement> = {
    overview: (
      <>
        <section className="os-profile-card os-agent-card">
          <div className="os-profile-avatar">{agentInitials}</div>
          <div className="os-profile-copy"><strong>{agentName}</strong><span>{dashboard.profile?.title || 'Agent account'}</span></div>
          <QrCode size={23} />
          <div className="os-agent-metrics">
            <div><span>Active leads</span><strong>{leads.filter((lead) => lead.stage !== "Won" && lead.stage !== "Lost").length}</strong><small>CRM records excluding Won and Lost</small></div>
            <div><span>Target attainment</span><strong>Unavailable</strong><small>No configured target source</small></div>
            <div><span>Conversion</span><strong>Unavailable</strong><small>Outcome history is not complete</small></div>
          </div>
        </section>
        <section className="os-ledger-card">
          <div className="os-section-heading"><h2><Landmark size={17} /> Commission ledger</h2><span>Unavailable</span></div>
          <p className="crm-ledger-notice">No verified transaction or payout connector is configured. Commission balances and cashout are disabled.</p>
        </section>
        <section className="os-utility-card crm-property-workbench-card">
          <div className="os-section-heading"><h2><Building2 size={17} /> Property records</h2><span>Field listings</span></div>
          <p>Create or update a property after the site visit. New and changed details remain private until Admin approval.</p>
          <a href="/properties/manage">Open property workbench <ArrowRight size={15} /></a>
        </section>
        <section className="os-utility-card">
          <div className="os-section-heading"><h2><UsersRound size={17} /> Qualify a lead</h2><span>CRM record</span></div>
          <div className="crm-lead-form">
            <label>Contact name<input value={leadForm.client_name} onChange={(event) => updateLeadForm("client_name", event.target.value)} autoComplete="name" required /></label>
            <label>Email<input type="email" value={leadForm.client_email} onChange={(event) => updateLeadForm("client_email", event.target.value)} autoComplete="email" /></label>
            <label>Phone<input type="tel" value={leadForm.client_phone} onChange={(event) => updateLeadForm("client_phone", event.target.value)} autoComplete="tel" /></label>
            <label>Lead / campaign<input value={leadForm.title} onChange={(event) => updateLeadForm("title", event.target.value)} placeholder="e.g. Mbezi rental search" required /></label>
            <label>Source<input value={leadForm.source} onChange={(event) => updateLeadForm("source", event.target.value)} /></label>
            <label>Intent<select value={leadForm.intent} onChange={(event) => updateLeadForm("intent", event.target.value)}><option>Buy</option><option>Rent</option></select></label>
            <label>Budget (TZS)<input type="number" min="0" value={leadForm.budget} onChange={(event) => updateLeadForm("budget", event.target.value)} /></label>
            <label>Preferred area<input value={leadForm.preferred_area} onChange={(event) => updateLeadForm("preferred_area", event.target.value)} /></label>
            <label>Preferred property ID<input value={leadForm.property_id} onChange={(event) => updateLeadForm("property_id", event.target.value)} /></label>
            <label>Urgency<select value={leadForm.urgency} onChange={(event) => updateLeadForm("urgency", event.target.value)}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label>
            <label>Next contact<input type="datetime-local" value={leadForm.next_contact_at ? new Date(new Date(leadForm.next_contact_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(event) => updateLeadForm("next_contact_at", event.target.value ? new Date(event.target.value).toISOString() : "")} /></label>
            <label>Assigned agent ID<input value={leadForm.assigned_agent_id} onChange={(event) => updateLeadForm("assigned_agent_id", event.target.value)} /></label>
            <label className="crm-consent"><input type="checkbox" checked={leadForm.consent} onChange={(event) => updateLeadForm("consent", event.target.checked)} /> Contact consent recorded</label>
            <label className="crm-form-wide">Requirements / notes<textarea value={leadForm.note} onChange={(event) => updateLeadForm("note", event.target.value)} rows={2} /></label>
            <button className="os-primary-button crm-form-submit" onClick={() => void submitLead()} disabled={!leadForm.client_name.trim() || !leadForm.title.trim() || (!leadForm.client_email.trim() && !leadForm.client_phone.trim())}>Save lead</button>
            {leadFormMessage && <p className="crm-form-message" role="status">{leadFormMessage}</p>}
          </div>
        </section>
      </>
    ),
    leads: (
      <section>
        <div className="os-section-heading"><h2>Lead pipeline</h2><span>{visibleLeads.length} of {leads.length}</span></div>
        <div className="crm-lead-toolbar"><label>Search leads<input type="search" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder="Name, email, phone, area" /></label><label>Stage<select value={leadStageFilter} onChange={(event) => setLeadStageFilter(event.target.value)}><option>All</option>{leadStages.map((stage) => <option key={stage}>{stage}</option>)}</select></label></div>
        <div className="crm-bulk-toolbar"><span>{selectedLeadIds.length} selected</span><label>Assign agent ID<input value={assignmentAgentId} onChange={(event) => setAssignmentAgentId(event.target.value)} /></label><button disabled={!selectedLeadIds.length || !assignmentAgentId.trim()} onClick={async () => { try { await onBulkAssign(selectedLeadIds, assignmentAgentId.trim()); setSelectedLeadIds([]); setLeadActionMessage("Selected leads assigned."); } catch (error) { setLeadActionMessage(error instanceof Error ? error.message : "Assignment failed."); } }}>Assign selected</button></div>
        {leadActionMessage && <p className="crm-form-message" role="status">{leadActionMessage}</p>}
        {visibleLeads.length === 0 ? <p className="crm-empty-state">No leads match these filters.</p> : visibleLeads.map((lead) => (
          <article className="crm-lead-row" key={lead.id}>
            <div className="crm-lead-summary"><label className="crm-lead-select"><input type="checkbox" aria-label={`Select ${lead.client_name || lead.title}`} checked={selectedLeadIds.includes(lead.id)} onChange={(event) => setSelectedLeadIds((current) => event.target.checked ? [...current, lead.id] : current.filter((id) => id !== lead.id))} /> Select</label><strong>{lead.client_name || lead.title}</strong><span>{lead.title} · {lead.intent || "Intent not set"} · {lead.urgency || "Normal"}</span><small>{[lead.client_email, lead.client_phone, lead.preferred_area, lead.budget ? `TZS ${Number(lead.budget).toLocaleString()}` : ""].filter(Boolean).join(" · ") || lead.note || "Contact details not provided"}</small></div>
            <label className="crm-stage-control">Lifecycle<select value={lead.stage || "New"} onChange={(event) => void changeLeadStage(lead.id, event.target.value as NonNullable<AgentLead["stage"]>)}>{leadStages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
            <button className="crm-activity-toggle" onClick={() => void toggleLeadActivity(lead.id)} aria-expanded={expandedLeadId === lead.id}>Activity</button>
            {lossLeadId === lead.id && <div className="crm-loss-entry"><label>Reason for loss<input value={lossReason} onChange={(event) => setLossReason(event.target.value)} /></label><button disabled={!lossReason.trim()} onClick={async () => { try { await onUpdateLeadStage(lead.id, "Lost", lossReason); setLossLeadId(null); setLossReason(""); setLeadActionMessage("Lead marked Lost."); setActivityByLead((current) => { const next = { ...current }; delete next[lead.id]; return next; }); } catch (error) { setLeadActionMessage(error instanceof Error ? error.message : "Stage update failed."); } }}>Confirm loss</button><button onClick={() => { setLossLeadId(null); setLossReason(""); }}>Cancel</button></div>}
            {expandedLeadId === lead.id && <ol className="crm-timeline">{(activityByLead[lead.id] ?? []).map((activity, index) => <li key={`${activity.created_at}-${index}`}><strong>{activity.type.replaceAll("_", " ")}</strong><span>{activity.body}</span><time>{new Date(activity.created_at).toLocaleString()}</time></li>)}</ol>}
          </article>
        ))}
      </section>
    ),
    deals: (
      <section>
        <div className="os-section-heading"><h2>Deals Funnel</h2><span>{deals.length} in pipe</span></div>
        {deals.length === 0 ? <p className="crm-empty-state">No verified deal records are connected.</p> : deals.map((deal) => (
          <article className="os-deal-row" key={deal.id}><div><span className="os-deal-status">{deal.status}</span><strong>{deal.title}</strong><p>{deal.note}</p></div><button onClick={() => setReviewingDeal(deal)}>Open deal</button></article>
        ))}
        {reviewingDeal && <div className="crm-deal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewingDeal(null); }}><section className="crm-deal-dialog" role="dialog" aria-modal="true" aria-labelledby="crm-deal-title"><div className="os-section-heading"><h2 id="crm-deal-title">Deal record</h2><button onClick={() => setReviewingDeal(null)} aria-label="Close deal record">Close</button></div><dl><dt>Record ID</dt><dd>{reviewingDeal.id}</dd><dt>Current status</dt><dd>{reviewingDeal.status}</dd><dt>Summary</dt><dd>{reviewingDeal.note}</dd></dl><p>This imported deal summary has no verified offer, escrow, approval, or closing documents attached.</p><button className="os-primary-button" onClick={() => { onReviewDeal(reviewingDeal.id); setReviewingDeal({ ...reviewingDeal, status: "Reviewed" }); }}>Mark reviewed</button></section></div>}
      </section>
    ),
    contracts: (
      <section>
        <div className="os-section-heading"><h2>Contracts</h2><span>Unavailable</span></div>
        {contracts.length ? <div className="os-action-grid">
          {contracts.map((contract) => (
            <button key={contract.id}><FileCheck2 size={18} /><strong>{contract.title}</strong><small>{contract.note}</small></button>
          ))}
        </div> : <p className="crm-empty-state">No document service or contract records are connected.</p>}
      </section>
    ),
    settings: (
      <section className="os-utility-card">
        <div className="os-section-heading"><h2><Settings2 size={17} /> Agent Settings</h2><span>Account</span></div>
        <div className="os-stat-grid"><div><span>Account</span><strong>{agentName}</strong><small>{dashboard.profile?.title || 'Agent'}</small></div><div><span>Communications</span><strong>Unavailable</strong><small>No approved delivery provider</small></div></div>
      </section>
    ),
  };

  return <main className="os-main">{agentViews[activeView] ?? agentViews.overview}</main>;
}

function OwnerScreen({
  activeView,
  onChangeView,
  dashboard,
  onAddUnit,
  onUpdateUnitStatus,
  onAddMaintenance,
}: {
  activeView: string;
  onChangeView: (view: string) => void;
  dashboard: OwnerDashboard;
  onAddUnit: (name: string, label: string, value: string, status: string) => void;
  onUpdateUnitStatus: (unitName: string, nextStatus: string) => void;
  onAddMaintenance: (title: string, location: string, state: string) => void;
}) {
  const [ownerData, setOwnerData] = useState({ totalRevenue: "TZS 14,800,000", occupancy: "94.1%", paymentBalance: "TZS 3,200,000", units: [] as Array<{ name: string; label: string; value: string; status: string }> });
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitLabel, setNewUnitLabel] = useState("");
  const [newUnitValue, setNewUnitValue] = useState("TZS 0");
  const [newMaintenanceTitle, setNewMaintenanceTitle] = useState("");
  const [newMaintenanceLocation, setNewMaintenanceLocation] = useState("");
  const [newMaintenanceState, setNewMaintenanceState] = useState("Pending");
  useEffect(() => {
    const payload = dashboard.portfolio;
    if (payload) {
      setOwnerData((current) => ({ ...current, totalRevenue: payload.totalRevenue || current.totalRevenue, occupancy: payload.occupancy || current.occupancy, paymentBalance: payload.paymentBalance || current.paymentBalance, units: payload.units || current.units }));
    }
  }, [dashboard]);
  const units = ownerData.units.length ? ownerData.units : [
    { name: "Room 102-A", label: "Mlimani Comfort Hostel", value: "TZS 1,200,000 / sem", status: "Ready" },
    { name: "Bed 204-B", label: "Mlimani Comfort Hostel", value: "TZS 280,000 / sem", status: "Vacant" },
    { name: "Suite 4B", label: "Posta Office Suites", value: "TZS 2,000,000 / month", status: "Leased" },
    { name: "Apt 3", label: "Kijitonyama Apartments", value: "TZS 1,100,000 / month", status: "Occupied" },
  ];
  const maintenanceItems = dashboard.maintenance?.length ? dashboard.maintenance : [
    { title: "Water pressure fix", location: "Mlimani Comfort Hostel", state: "Waiting for plumber" },
    { title: "Gate sensor replacement", location: "Kijitonyama Apartments", state: "Technician on site" },
    { title: "Roof leak inspection", location: "Posta Office Suites", state: "Approved by owner" },
  ];

  const ownerViews: Record<string, ReactElement> = {
    overview: (
      <>
        <section className="os-owner-banner">
          <div>
            <span className="os-kicker">PROPERTY OWNER OS</span>
            <h1>Haiji Properties</h1>
            <p><span className="os-owner-status-dot" /> 3 active locations • Dar es Salaam</p>
          </div>
          <div className="os-owner-banner-actions">
            <button onClick={() => onChangeView("finance")}>Cash flow</button>
            <button className="os-danger-button" onClick={() => onChangeView("finance")}>Withdraw {ownerData.paymentBalance}</button>
          </div>
        </section>

        <div className="os-owner-kpi-grid">
          <div>
            <span>Monthly revenue</span>
            <strong>{ownerData.totalRevenue}</strong>
            <small className="positive">+18.4%</small>
          </div>
          <div>
            <span>Occupancy</span>
            <strong>{ownerData.occupancy || "94.1%"}</strong>
            <small>32 / 34 units</small>
          </div>
          <div>
            <span>Balance</span>
            <strong>{ownerData.paymentBalance}</strong>
            <small>2 settlements</small>
          </div>
        </div>

        <div className="os-owner-dashboard-grid">
          <section className="os-owner-approvals">
            <div className="os-owner-section-title">
              <div>
                <h2><Check size={16} /> Active listings</h2>
                <span>{units.length} units</span>
              </div>
            </div>
            {units.slice(0, 3).map((unit) => (
              <article className="os-owner-approval" key={unit.name}>
                <div className="os-owner-approval-icon"><Building2 size={14} /></div>
                <div>
                  <strong>{unit.name}</strong>
                  <small>{unit.label}</small>
                </div>
                <button onClick={() => onUpdateUnitStatus(unit.name, unit.status === 'Ready' ? 'Occupied' : 'Ready')}>{unit.status}</button>
              </article>
            ))}
          </section>

          <section className="os-owner-table">
            <div className="os-owner-section-title">
              <div>
                <h2><Wallet size={16} /> Finance</h2>
                <span>This month</span>
              </div>
            </div>
            <div className="os-owner-ledger-row">
              <span>Rent received</span>
              <strong>{ownerData.totalRevenue}</strong>
              <span>Due</span>
              <strong>{ownerData.paymentBalance}</strong>
            </div>
          </section>
        </div>
      </>
    ),
    pipeline: (
      <section className="os-owner-table">
        <div className="os-owner-section-title">
          <div>
            <h2><Activity size={16} /> Leasing pipeline</h2>
            <span>{units.length} units in portfolio</span>
          </div>
        </div>
        <div className="os-owner-kpi-grid">
          <div><span>Occupied / leased</span><strong>{units.filter((unit) => /occupied|leased/i.test(unit.status)).length}</strong><small>Active agreements</small></div>
          <div><span>Available</span><strong>{units.filter((unit) => /vacant|ready|new/i.test(unit.status)).length}</strong><small>Ready for placement</small></div>
          <div><span>Portfolio occupancy</span><strong>{ownerData.occupancy}</strong><small>Across all locations</small></div>
        </div>
        <div className="os-owner-ledger-row">
          <span>Next step<small>Review available units and update their status</small></span>
          <button className="os-primary-button" onClick={() => onChangeView("units")}>Manage units <ArrowRight size={13} /></button>
          <button className="os-secondary-button" onClick={() => onChangeView("finance")}>View cash flow</button>
        </div>
      </section>
    ),
    units: (
      <section className="os-owner-approvals">
        <div className="os-owner-section-title">
          <div>
            <h2><Building2 size={16} /> Units & listings</h2>
            <span>{units.length} units</span>
          </div>
        </div>
        {units.map((unit) => (
          <article className="os-owner-approval" key={`${unit.name}-listing`}>
            <div className="os-owner-approval-icon"><Building2 size={14} /></div>
            <div>
              <strong>{unit.name}</strong>
              <small>{unit.label}</small>
            </div>
            <button onClick={() => onUpdateUnitStatus(unit.name, unit.status === 'Leased' ? 'Vacant' : 'Leased')}>{unit.status}</button>
          </article>
        ))}
      </section>
    ),
    finance: (
      <section className="os-owner-table">
        <div className="os-owner-section-title">
          <div>
            <h2><Wallet size={16} /> Finance</h2>
            <span>Cash flow</span>
          </div>
        </div>
        <div className="os-owner-ledger-row">
          <span>Revenue</span>
          <strong>{ownerData.totalRevenue}</strong>
          <span>Balance</span>
          <strong>{ownerData.paymentBalance}</strong>
        </div>
        <div className="os-owner-ledger-row">
          <span>Occupancy Rate</span>
          <strong>{ownerData.occupancy}</strong>
          <span>Due</span>
          <strong>{ownerData.paymentBalance}</strong>
        </div>
      </section>
    ),
    repairs: (
      <section className="os-owner-approvals">
        <div className="os-owner-section-title">
          <div>
            <h2><Wrench size={16} /> Repairs & maintenance</h2>
            <span>{(dashboard.maintenance ?? []).length + 1} active tickets</span>
          </div>
        </div>
        <div className="os-ticket-form" style={{ marginBottom: 16 }}>
          <input value={newMaintenanceTitle} onChange={(event) => setNewMaintenanceTitle(event.target.value)} placeholder="Issue title" />
          <input value={newMaintenanceLocation} onChange={(event) => setNewMaintenanceLocation(event.target.value)} placeholder="Property location" />
          <input value={newMaintenanceState} onChange={(event) => setNewMaintenanceState(event.target.value)} placeholder="Status" />
          <button className="os-primary-button" onClick={() => { if (!newMaintenanceTitle.trim() || !newMaintenanceLocation.trim()) return; onAddMaintenance(newMaintenanceTitle.trim(), newMaintenanceLocation.trim(), newMaintenanceState.trim() || 'Pending'); setNewMaintenanceTitle(''); setNewMaintenanceLocation(''); setNewMaintenanceState('Pending'); }}>Add maintenance task</button>
        </div>
        {maintenanceItems.map((item) => (
          <article className="os-owner-approval" key={`${item.title}-${item.location}`}>
            <div className="os-owner-approval-icon"><Wrench size={14} /></div>
            <div>
              <strong>{item.title}</strong>
              <small>{item.location}</small>
            </div>
            <button>{item.state}</button>
          </article>
        ))}
      </section>
    ),
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "pipeline", label: "Pipeline", icon: Activity },
    { id: "units", label: "Units", icon: Building2 },
    { id: "finance", label: "Finance", icon: Wallet },
    { id: "repairs", label: "Repairs", icon: Wrench },
  ];

  return (
    <main className="os-owner-os">
      <aside className="os-owner-sidebar">
        <FlxMark />
        <span className="os-owner-sidebar-label">OWNER NAV</span>
        {sidebarItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={activeView === id ? "active" : ""} onClick={() => onChangeView(id)}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </aside>

      <div className="os-owner-content">
        <div className="os-owner-toolbar">
          <span>Dar es Salaam</span>
          <div className="os-owner-search"><Search size={14} /> Search units</div>
          <button className="os-primary-button" onClick={() => { if (!newUnitName.trim() || !newUnitLabel.trim()) return; onAddUnit(newUnitName.trim(), newUnitLabel.trim(), newUnitValue || 'TZS 0', 'New'); setNewUnitName(''); setNewUnitLabel(''); setNewUnitValue('TZS 0'); }}>+ New unit</button>
          <Bell size={16} />
          <span className="os-owner-user">Mzee Hamisi<small>Owner</small></span>
        </div>

        <div className="os-owner-add-form">
          <input value={newUnitName} onChange={(event) => setNewUnitName(event.target.value)} placeholder="Unit name" />
          <input value={newUnitLabel} onChange={(event) => setNewUnitLabel(event.target.value)} placeholder="Location / label" />
          <input value={newUnitValue} onChange={(event) => setNewUnitValue(event.target.value)} placeholder="Value" />
        </div>

        {ownerViews[activeView] ?? ownerViews.overview}
      </div>
    </main>
  );
}

function OpsScreen({ activeView, dashboard, onAddIncident, onResolveIncident, onAddQueueItem, onReviewQueueItem, onDashboardUpdate }: { activeView: string; dashboard: OpsDashboard; onAddIncident: (title: string, summary: string, action: string) => Promise<void>; onResolveIncident: (incidentTitle: string) => Promise<void>; onAddQueueItem: (label: string, status: string, details: string) => Promise<void>; onReviewQueueItem: (itemLabel: string) => Promise<void>; onDashboardUpdate: (dashboard: OpsDashboard) => void; }) {
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentSummary, setIncidentSummary] = useState("");
  const [queueLabel, setQueueLabel] = useState("");
  const [queueStatus, setQueueStatus] = useState("Pending");
  const [queueDetails, setQueueDetails] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('All records');
  const [selectedRecord, setSelectedRecord] = useState<OpsSearchRecord | null>(null);
  const [searchRecords, setSearchRecords] = useState<OpsSearchRecord[]>([]);
  const [serviceHealth, setServiceHealth] = useState<OpsHealthItem[]>([]);
  const [dataFreshness, setDataFreshness] = useState<'checking' | 'current' | 'stale' | 'unavailable'>('checking');
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingOpsAction | null>(null);
  const confirmationReturnFocus = useRef<HTMLElement | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const queue = dashboard.queue ?? [];
  const disputes = dashboard.disputes ?? [];
  const paymentSummary = dashboard.paymentSummary;
  const activeDisputes = disputes.filter((item) => item.status !== 'Resolved');
  const openQueue = queue.filter((item) => !/(verified|approved|resolved|closed|passed|completed|validated)/i.test(item.status));
  const sourceIsAvailable = (id: string) => ['Connected', 'Stale'].includes(serviceHealth.find((item) => item.id === id)?.state ?? '');
  const propertyRecords = searchRecords.filter((record) => record.category === 'Property' || record.category === 'Parcel');
  const availablePropertyCount = propertyRecords.filter((record) => !record.status || /approved|available|active|verified|published|listed/i.test(record.status)).length;
  const escrowDealRecords = searchRecords.filter((record) => record.category === 'Escrow deal');
  const isSearchOpen = Boolean(searchQuery.trim()) || searchCategory !== 'All records';
  const freshnessText = dataFreshness === 'current' ? 'Current snapshot' : dataFreshness === 'stale' ? 'Some sources are stale' : dataFreshness === 'unavailable' ? 'Data unavailable' : 'Checking sources';
  const lastRefreshText = lastSuccessfulRefresh ? `Last successful refresh ${new Date(lastSuccessfulRefresh).toLocaleTimeString()}` : 'No successful refresh yet';
  const runOpsAction = async (action: () => Promise<void>, successMessage: string) => {
    setActionFeedback(null);
    try {
      await action();
      setActionFeedback({ tone: 'success', message: successMessage });
      return true;
    } catch (error) {
      setActionFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'The action could not be saved.' });
      return false;
    }
  };
  const requestOpsConfirmation = (trigger: HTMLElement, action: PendingOpsAction) => {
    confirmationReturnFocus.current = trigger;
    setPendingAction(action);
  };
  const closeOpsConfirmation = () => {
    setPendingAction(null);
    requestAnimationFrame(() => confirmationReturnFocus.current?.focus());
  };
  const handleOpsConfirmationKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeOpsConfirmation();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const operationalMetrics = [
    { label: 'Cases awaiting review', value: sourceIsAvailable('ops') ? String(openQueue.length) : 'Unavailable', method: 'Count of Ops queue records not marked verified, approved, resolved, or closed.', source: 'Ops dashboard · current snapshot', category: 'Cases' },
    { label: 'Active disputes', value: sourceIsAvailable('ops') ? String(activeDisputes.length) : 'Unavailable', method: 'Count of dispute records not marked resolved.', source: 'Ops dashboard · current snapshot', category: 'Cases' },
    { label: 'Available properties', value: sourceIsAvailable('properties') ? String(availablePropertyCount) : 'Unavailable', method: 'Count of property/parcel records with an approved, available, or active status.', source: 'Property registry · current snapshot', category: 'Properties' },
    { label: 'Escrow deal records', value: sourceIsAvailable('deals') ? String(escrowDealRecords.length) : 'Unavailable', method: 'Count of deal workflow records; not a measure of money received or released.', source: 'Escrow deals API · current snapshot', category: 'Escrow deals' },
    { label: 'Settlement volume (24h)', value: 'Unavailable', method: 'Requires timestamped payment transaction records; no settlement feed is connected.', source: 'No transaction source configured', category: 'Transactions' },
    { label: 'SLA compliance', value: 'Unavailable', method: 'Requires case due times and timestamped resolution events; these are not available.', source: 'No SLA event history configured', category: 'Cases' },
  ];

  useEffect(() => {
    let isCurrent = true;
    const sources = [
      { id: 'backend', label: 'Backend API', path: '/api/health' },
      { id: 'properties', label: 'Property registry', path: '/api/properties' },
      { id: 'people', label: 'People and leads', path: '/api/agent/dashboard' },
      { id: 'clients', label: 'Client records', path: '/api/client/dashboard' },
      { id: 'ops', label: 'Ops cases', path: '/api/ops/dashboard' },
      { id: 'deals', label: 'Escrow deal records', path: '/api/deals' },
    ];

    const refresh = async () => {
      setIsRefreshing(true);
      setDataFreshness((current) => current === 'current' ? 'current' : 'checking');
      const results = await Promise.all(sources.map(async (source) => {
        try {
          const response = await fetch(source.path, { cache: 'no-store', ...(source.id === 'people' ? { headers: crmAuthHeaders() } : {}) });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return { ...source, ok: true, payload: await response.json() as Record<string, unknown>, error: '' };
        } catch (error) {
          return { ...source, ok: false, payload: null, error: error instanceof Error ? error.message : 'Request failed' };
        }
      }));
      if (!isCurrent) return;

      const byId = new Map(results.map((result) => [result.id, result]));
      const opsResult = byId.get('ops');
      if (opsResult?.ok && opsResult.payload) onDashboardUpdate(opsResult.payload as OpsDashboard);

      const sourceRecords = new Map<string, OpsSearchRecord[]>();
      const propertyResult = byId.get('properties');
      if (propertyResult?.ok && propertyResult.payload) {
        const rows = Array.isArray(propertyResult.payload.properties) ? propertyResult.payload.properties : [];
        sourceRecords.set('properties', rows.map((entry, index) => {
          const property = entry as Record<string, unknown>;
          const title = String(property.title ?? `Property ${index + 1}`);
          const location = String(property.city ?? property.address ?? 'Location unavailable');
          const isParcel = /parcel|cadastral|land|plot/i.test(`${title} ${location} ${String(property.property_type ?? '')}`);
          return { id: `property-${String(property.id ?? index)}`, category: isParcel ? 'Parcel' : 'Property', title, detail: `${location} · ${String(property.status ?? 'Status unavailable')}`, source: 'properties', status: String(property.status ?? '') };
        }));
      }

      const peopleResult = byId.get('people');
      if (peopleResult?.ok && peopleResult.payload) {
        const payload = peopleResult.payload;
        const personRecords: OpsSearchRecord[] = [];
        for (const lead of (Array.isArray(payload.leads) ? payload.leads : []) as Array<Record<string, unknown>>) {
          personRecords.push({ id: `lead-${String(lead.id ?? personRecords.length)}`, category: 'Person', title: String(lead.title ?? 'Lead'), detail: String(lead.note ?? 'Lead record'), source: 'people', status: 'Lead' });
        }
        for (const deal of (Array.isArray(payload.deals) ? payload.deals : []) as Array<Record<string, unknown>>) {
          personRecords.push({ id: `contact-${String(deal.id ?? personRecords.length)}`, category: 'Person', title: String(deal.title ?? 'Contact'), detail: `${String(deal.status ?? 'Deal')} · ${String(deal.note ?? '')}`.trim(), source: 'people', status: String(deal.status ?? 'Deal') });
        }
        sourceRecords.set('people', personRecords);
      }

      const clientResult = byId.get('clients');
      if (clientResult?.ok && clientResult.payload) {
        const payload = clientResult.payload;
        const clientRecords: OpsSearchRecord[] = [];
        const resident = payload.resident as Record<string, unknown> | undefined;
        if (resident?.name) clientRecords.push({ id: `resident-${String(resident.name)}`, category: 'Person', title: String(resident.name), detail: `${String(resident.property ?? '')} · ${String(resident.room ?? '')}`.trim(), source: 'clients', status: String(resident.status ?? 'Resident') });
        sourceRecords.set('clients', clientRecords);
      }

      if (opsResult?.ok && opsResult.payload) {
        const payload = opsResult.payload;
        const cases: OpsSearchRecord[] = [];
        for (const item of (Array.isArray(payload.queue) ? payload.queue : []) as Array<Record<string, unknown>>) {
          cases.push({ id: `case-${String(item.label)}`, category: 'Case', title: String(item.label ?? 'Verification case'), detail: String(item.details ?? ''), source: 'ops', status: String(item.status ?? 'Open') });
        }
        for (const item of (Array.isArray(payload.disputes) ? payload.disputes : []) as Array<Record<string, unknown>>) {
          cases.push({ id: `dispute-${String(item.title)}`, category: 'Case', title: String(item.title ?? 'Dispute'), detail: String(item.summary ?? ''), source: 'ops', status: String(item.status ?? 'Open') });
        }
        sourceRecords.set('ops', cases);
      }

      const dealsResult = byId.get('deals');
      if (dealsResult?.ok && dealsResult.payload) {
        const rows = Array.isArray(dealsResult.payload.deals) ? dealsResult.payload.deals : [];
        sourceRecords.set('deals', rows.map((entry, index) => {
          const deal = entry as Record<string, unknown>;
          return { id: `escrow-${String(deal.id ?? index)}`, category: 'Escrow deal', title: String(deal.title ?? `Escrow deal ${index + 1}`), detail: `${String(deal.status ?? 'Status unavailable')} · ${String(deal.amount ?? 'Amount unavailable')}`, source: 'deals', status: String(deal.status ?? '') };
        }));
      }

      setSearchRecords((current) => {
        let next = current;
        for (const [source, records] of sourceRecords) next = [...next.filter((record) => record.source !== source), ...records];
        return next;
      });

      const checkedAt = new Date().toISOString();
      setServiceHealth((previousItems) => {
        const internalHealth = results.map((result) => {
          const previous = previousItems.find((item) => item.id === result.id);
          return { id: result.id, label: result.label, state: result.ok ? 'Connected' as const : previous?.state === 'Connected' || previous?.state === 'Stale' ? 'Stale' as const : 'Unavailable' as const, detail: result.ok ? 'Endpoint responded successfully.' : `Last check failed: ${result.error}`, checkedAt };
        });
        return [
          ...internalHealth,
          { id: 'ardhi', label: 'e-Ardhi registry', state: 'Not configured', detail: 'No integration health endpoint is configured.' },
          { id: 'identity', label: 'NIDA identity checks', state: 'Not configured', detail: 'No integration health endpoint is configured.' },
          { id: 'payments', label: 'Banks and mobile money', state: 'Not configured', detail: 'No settlement connector or health endpoint is configured.' },
          { id: 'maps', label: 'Map tiles', state: 'Configured, not probed', detail: 'Map provider is configured; tile-service health is not probed.' },
          { id: 'notifications', label: 'Notifications', state: 'Not configured', detail: 'No delivery provider or health endpoint is configured.' },
        ];
      });

      const successfulSources = results.filter((result) => result.ok).length;
      const failedSources = results.length - successfulSources;
      setDataFreshness(successfulSources === 0 ? 'unavailable' : failedSources > 0 ? 'stale' : 'current');
      if (successfulSources > 0) setLastSuccessfulRefresh(checkedAt);
      setIsRefreshing(false);
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => { isCurrent = false; window.clearInterval(interval); };
  }, [refreshVersion, onDashboardUpdate]);

  const categories = ['All records', 'Properties', 'People', 'Parcels', 'Cases', 'Escrow deals', 'Transactions'];
  const matchingRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return searchRecords.filter((record) => {
      const categoryMatches = searchCategory === 'All records'
        || (searchCategory === 'Properties' && record.category === 'Property')
        || (searchCategory === 'People' && record.category === 'Person')
        || (searchCategory === 'Parcels' && record.category === 'Parcel')
        || (searchCategory === 'Cases' && record.category === 'Case')
        || (searchCategory === 'Escrow deals' && record.category === 'Escrow deal')
        || (searchCategory === 'Transactions' && record.category === 'Transaction');
      const queryMatches = !query || `${record.title} ${record.detail} ${record.status ?? ''} ${record.category}`.toLowerCase().includes(query);
      return categoryMatches && queryMatches;
    }).slice(0, 12);
  }, [searchCategory, searchQuery, searchRecords]);

  const opsViews: Record<string, ReactElement> = {
    live: (
      <>
        <section className="os-ops-hero">
          <div><span className="os-kicker">REAL-TIME CADASTRAL VERIFICATION & PAYMENT CLEARING</span><h2>Dar Ops Command</h2><p>Automated compliance and settlement control.</p></div>
          <div><span>CASE SLA</span><strong>Unavailable</strong><small>No timestamped case history connected</small></div>
          <div className="os-ops-total"><span>SETTLEMENT VOLUME · 24H</span><strong>Unavailable</strong><small>No transaction ledger connected</small></div>
        </section>
        <div className="os-stat-grid"><div><span>VERIFICATION CASES</span><strong>{sourceIsAvailable('ops') ? `${openQueue.length} Open` : 'Unavailable'}</strong><small>Ops API · current snapshot</small></div><div><span>DISPUTES</span><strong className="os-red-text">{sourceIsAvailable('ops') ? `${activeDisputes.length} Active` : 'Unavailable'}</strong><small>{freshnessText} · {lastRefreshText}</small></div></div>
        <section className="os-ops-health-card" aria-labelledby="ops-health-title">
          <div className="os-section-heading"><h2 id="ops-health-title">Service and integration health</h2><button type="button" onClick={() => setRefreshVersion((version) => version + 1)} disabled={isRefreshing}>{isRefreshing ? 'Checking…' : 'Retry checks'}</button></div>
          <p className="os-health-summary" role="status" aria-live="polite">{freshnessText}. {lastRefreshText}.</p>
          <div className="os-health-grid">{serviceHealth.map((item) => <div className="os-health-item" key={item.id}><span className={`os-health-state is-${item.state.toLowerCase().replace(/[, ]+/g, '-')}`} aria-label={`${item.label}: ${item.state}`}>{item.state}</span><strong>{item.label}</strong><small>{item.detail}</small></div>)}</div>
        </section>
        <section className="os-utility-card">
          <div className="os-section-heading"><h2><Bell size={17} /> Escalate incident</h2><span>Ops ledger</span></div>
          <div className="os-ticket-form">
            <label><span className="os-sr-only">Incident title</span><input aria-label="Incident title" value={incidentTitle} onChange={(event) => setIncidentTitle(event.target.value)} placeholder="Incident title" /></label>
            <label><span className="os-sr-only">Incident summary</span><input aria-label="Incident summary" value={incidentSummary} onChange={(event) => setIncidentSummary(event.target.value)} placeholder="Incident summary" /></label>
            <button className="os-primary-button" type="button" disabled={!incidentTitle.trim() || !incidentSummary.trim()} onClick={() => { void runOpsAction(() => onAddIncident(incidentTitle.trim(), incidentSummary.trim(), 'Escalate case'), 'Incident saved to the Ops case log.').then((saved) => { if (saved) { setIncidentTitle(''); setIncidentSummary(''); } }); }}>Save incident</button>
          </div>
        </section>
      </>
    ),
    verify: (
      <section>
        <div className="os-section-heading"><h2><Activity size={17} /> Verification Queue</h2><span className="os-red-text">{queue.length} PENDING</span></div>
        <div className="os-ticket-form" style={{ marginBottom: 16 }}>
          <label><span className="os-sr-only">Verification item</span><input aria-label="Verification item" value={queueLabel} onChange={(event) => setQueueLabel(event.target.value)} placeholder="Verification item" /></label>
          <label><span className="os-sr-only">Verification status</span><select aria-label="Verification status" value={queueStatus} onChange={(event) => setQueueStatus(event.target.value)}><option>Pending</option><option>In review</option><option>Evidence required</option></select></label>
          <label><span className="os-sr-only">Verification details</span><input aria-label="Verification details" value={queueDetails} onChange={(event) => setQueueDetails(event.target.value)} placeholder="Details" /></label>
          <button className="os-primary-button" type="button" disabled={!queueLabel.trim() || !queueDetails.trim()} onClick={() => { void runOpsAction(() => onAddQueueItem(queueLabel.trim(), queueStatus, queueDetails.trim()), 'Verification case saved.').then((saved) => { if (saved) { setQueueLabel(''); setQueueStatus('Pending'); setQueueDetails(''); } }); }}>Add queue item</button>
        </div>
        {queue.length === 0 && <div className="os-empty-state" role="status"><h3>No verification cases</h3><p>Cases from registry, identity, and property workflows will appear when connected sources provide them.</p></div>}
        {queue.map((item, index) => (
          <article className="os-verification-row" key={`${item.label}-${index}`}><div className="os-verification-icon">{index === 0 ? <MapPin size={16} /> : index === 1 ? <Home size={16} /> : <UserRound size={16} />}</div><div><span className="os-case-status" aria-label={`Case status: ${item.status}`}>{item.status}</span><strong>{item.label}</strong><small>{item.details}</small></div>{/(verified|approved|passed|validated|completed)/i.test(item.status) ? <span className="os-case-reviewed">Reviewed</span> : <button type="button" onClick={(event) => requestOpsConfirmation(event.currentTarget, { title: 'Approve verification case?', message: `Confirm review of ${item.label}. This records a verified status in the Ops dashboard.`, confirmLabel: 'Confirm approval', run: () => { void runOpsAction(() => onReviewQueueItem(item.label), 'Case approval saved.').then((saved) => { if (saved) closeOpsConfirmation(); }); } })}>Review and approve</button>}</article>
        ))}
      </section>
    ),
    monitor: (
      <section className="os-vault-card"><div className="os-section-heading"><h2>Payment Monitor</h2><span>{sourceIsAvailable('deals') ? `${escrowDealRecords.length} escrow deal records` : 'Source unavailable'}</span></div><strong>Settlement volume unavailable</strong><p>No settlement transaction source is connected. Escrow deal records below describe workflow status and are not proof of funds received or released.</p><div className="os-escrow-records">{escrowDealRecords.length ? escrowDealRecords.map((record) => <article key={record.id}><strong>{record.title}</strong><span>{record.status}</span><small>{record.detail}</small></article>) : <p>No escrow deal records loaded.</p>}</div><button className="os-primary-button" type="button" disabled aria-disabled="true">Funds release disabled · no payment connector</button></section>
    ),
    disputes: (
      activeDisputes.length ? <section className="os-dispute-list">{activeDisputes.map((item) => <article className="os-alert-card" key={item.title}><span className="os-orange-pill" aria-label={`Case status: ${item.status || 'Open'}`}>{item.status || 'OPEN CASE'}</span><h3>{item.title}</h3><p>{item.summary}</p><div><button className="os-secondary-button" type="button" onClick={() => setSelectedRecord({ id: `dispute-${item.title}`, category: 'Case', title: item.title, detail: item.summary, source: 'Ops disputes', status: item.status || 'Open' })}>Review case</button><button className="os-danger-button" type="button" onClick={(event) => requestOpsConfirmation(event.currentTarget, { title: 'Resolve dispute?', message: `Confirm that ${item.title} has been reviewed and resolved. This action records a resolution status; it does not freeze an account or release funds.`, confirmLabel: 'Confirm resolution', run: () => { void runOpsAction(() => onResolveIncident(item.title), 'Dispute resolution saved.').then((saved) => { if (saved) closeOpsConfirmation(); }); } })}>Mark resolved</button></div></article>)}</section> : <section className="os-empty-state" role="status"><h2>No active disputes</h2><p>Disputes will appear here when they are created from a verified case or payment record.</p></section>
    ),
    audit: (
      <div className="os-ops-analytics-stack"><section className="os-ops-analytics"><div className="os-section-heading"><div><h2>Operational analytics</h2><p>Actual record snapshots only; no forecast model is connected. {freshnessText} · {lastRefreshText}</p></div><button type="button" onClick={() => setRefreshVersion((version) => version + 1)} disabled={isRefreshing}>{isRefreshing ? 'Refreshing…' : 'Refresh data'}</button></div><div className="os-analytics-grid">{operationalMetrics.map((metric) => <button className="os-analytics-metric" type="button" key={metric.label} disabled={metric.value === 'Unavailable'} onClick={() => { setSearchCategory(metric.category); setSearchQuery(''); setSelectedRecord(null); }}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.method}</small><em>{metric.source} · {metric.value === 'Unavailable' ? 'No drill-down available' : 'Open source records'}</em></button>)}</div></section><section className="os-ops-audit" aria-labelledby="ops-audit-title"><div className="os-section-heading"><h2 id="ops-audit-title">Recent Ops actions</h2><span>{dashboard.auditTrail?.length ?? 0} recorded</span></div>{dashboard.auditTrail?.length ? dashboard.auditTrail.slice(0, 20).map((entry) => <article key={entry.id}><strong>{entry.action}</strong><span>{entry.target}</span><time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time></article>) : <p>No Ops action history has been recorded yet.</p>}</section></div>
    ),
  };

  return <main className="os-main">
    {actionFeedback && <div className={`os-action-feedback is-${actionFeedback.tone}`} role={actionFeedback.tone === 'error' ? 'alert' : 'status'} aria-live={actionFeedback.tone === 'error' ? 'assertive' : 'polite'}><span>{actionFeedback.message}</span><button type="button" aria-label="Dismiss action message" onClick={() => setActionFeedback(null)}><X size={15} /></button></div>}
    <section className="os-global-search" aria-label="Global operations search">
      <label><Search size={18} /><input aria-label="Search properties, people, parcels, cases, and transactions" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setSelectedRecord(null); }} placeholder="Search properties, people, parcels, cases, transactions..." /></label>
      <select aria-label="Filter search category" value={searchCategory} onChange={(event) => { setSearchCategory(event.target.value); setSelectedRecord(null); }}>
        {categories.map((category) => <option key={category}>{category}</option>)}
      </select>
      <span className={`os-data-freshness is-${dataFreshness}`} role="status" aria-live="polite">{freshnessText}</span>
    </section>
    {isSearchOpen && <section className="os-global-search-results" aria-label="Global search results">
      <header><strong>{matchingRecords.length} matching records</strong><span>{lastRefreshText}</span></header>
      {matchingRecords.length ? <div>{matchingRecords.map((record) => <button type="button" role="option" aria-selected={selectedRecord?.id === record.id} key={record.id} onClick={() => setSelectedRecord(record)}><span><strong>{record.title}</strong><small>{record.detail}</small></span><em>{record.category}</em></button>)}</div> : <p>{searchCategory === 'Transactions' ? 'No settlement transaction feed is connected. Escrow deal workflow records can be searched under Escrow deals.' : 'No matching records in the currently connected sources.'}</p>}
    </section>}
    {selectedRecord && <section className="os-search-record-detail" aria-label="Selected record details"><div><span>{selectedRecord.category} · {selectedRecord.source}</span><button type="button" aria-label="Close record details" onClick={() => setSelectedRecord(null)}><X size={16} /></button></div><h2>{selectedRecord.title}</h2><p>{selectedRecord.detail}</p>{selectedRecord.status && <small>Status: {selectedRecord.status}</small>}</section>}
    {opsViews[activeView] ?? opsViews.live}
    {pendingAction && <div className="os-confirm-backdrop"><section className="os-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ops-confirm-title" aria-describedby="ops-confirm-message" onKeyDown={handleOpsConfirmationKeyDown}><h2 id="ops-confirm-title">{pendingAction.title}</h2><p id="ops-confirm-message">{pendingAction.message}</p><div><button type="button" autoFocus onClick={closeOpsConfirmation}>Cancel</button><button type="button" className="os-danger-button" onClick={pendingAction.run}>{pendingAction.confirmLabel}</button></div></section></div>}
  </main>;
}

function DetailModal({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const [selectedBed, setSelectedBed] = useState("B");
  const gallery = [listing.image, listing.image, listing.image, listing.image];
  const isHostel = listing.category === "Hostels";
  return (
    <div className="os-detail-backdrop">
      <section className="os-detail-workspace">
        <header className="os-detail-header">
          <button className="os-detail-back-button" onClick={onClose}><ArrowLeft size={15} /> Back to listings</button>
          <div className="os-detail-header-actions"><button>Share listing</button><button>Save to wishlist</button><button>Print dossier</button></div>
        </header>
        <div className="os-detail-breadcrumb">Home / Dar es Salaam / {listing.city} / {isHostel ? "Hostels" : listing.category}</div>
        <div className="os-detail-heading-row">
          <div><div className="os-detail-badges"><span><Check size={11} /> FLX Verified</span><span><MapPin size={11} /> Dar es Salaam</span><span><Star size={11} /> 4.8 (34 reviews)</span></div><h1>{isHostel ? `${listing.title} - Deluxe 4-Bed Suites` : listing.title}</h1><p><MapPin size={14} /> {listing.city} <span>•</span> Verified local property information</p></div>
          <div className="os-detail-price"><small>From</small><strong>{listing.price}</strong><span>{isHostel ? "/ semester" : listing.period}</span></div>
        </div>

        <div className="os-detail-gallery">
          <div className="os-detail-gallery-main"><img src={gallery[0]} alt={`${listing.title} main view`} /><span>Floor 2 • Main property view</span><strong>Bright morning light and practical space</strong></div>
          <div className="os-detail-gallery-grid">{gallery.slice(1).map((image, index) => <div key={`${listing.id}-detail-${index}`}><img src={image} alt={`${listing.title} gallery ${index + 2}`} />{index === 2 ? <span>+8 more photos</span> : <small>{index === 0 ? "Private ensuite" : index === 1 ? "Study lounge" : "Shared kitchenette"}</small>}</div>)}</div>
        </div>

        <div className="os-detail-columns">
          <div className="os-detail-main-column">
            <section className="os-detail-section"><div className="os-detail-section-title"><h2><Activity size={17} /> Commute &amp; Safety Mobility Radar</h2><span>Validated by GPS &amp; local surveys</span></div><div className="os-detail-metric-grid"><div><MapPin size={15} /><small>Walking time</small><strong>11 mins</strong><span>900m to campus</span></div><div><Clock3 size={15} /><small>Fare fixed</small><strong>TZS 200</strong><span>Daladala route</span></div><div><ShieldCheck size={15} /><small>Top 5%</small><strong>9.2 / 10</strong><span>Street safety score</span></div><div><Check size={15} /><small>Secured</small><strong>24/7</strong><span>Verified gate</span></div></div></section>
            <section className="os-detail-section"><div className="os-detail-section-title"><h2><Zap size={17} /> Zero-Downtime Student Utilities</h2><span>Real-time status</span></div><div className="os-detail-utility-grid"><div><DropletIcon /><strong>24/7 Pressurized Water</strong><span>DAWASA mains plus underground tank reserve for reliable daily service.</span></div><div><Zap size={17} /><strong>25kVA Standby Generator</strong><span>Automatic transfer during TANESCO outages and study hours.</span></div><div><Wifi size={17} /><strong>100 Mbps Dedicated Fiber</strong><span>Unlimited connection configured for video lectures and remote work.</span></div></div></section>
            <section className="os-detail-section"><div className="os-detail-section-title"><div><h2><Home size={17} /> Floor 2 - Room 204 Bed Selector</h2><span>Choose your room space and compare compatibility</span></div><span className="os-detail-muted-pill">Female block / quiet study</span></div><div className="os-bed-grid">{["A", "B", "C", "D"].map((bed) => <button key={bed} className={selectedBed === bed ? "selected" : ""} onClick={() => setSelectedBed(bed)}><div><strong>Bed {bed} ({bed === "A" || bed === "B" ? "Lower" : "Upper"} Bunk)</strong><span>{bed === "A" ? "Occupied" : bed === "B" ? "Your selection" : bed === "C" ? "Deposit in review" : "Available now"}</span></div><small>{bed === "B" ? "Garden breeze window • Dedicated 240V plug" : "Quiet study • Walk-in access"}</small><b>{bed === "B" || bed === "D" ? "TZS 280,000" : "View availability"}</b></button>)}</div><div className="os-lease-selector"><span>Select your academic lease term</span><button className="selected"><strong>1 Academic Semester</strong><small>5 months continuous stay</small><b>TZS 280,000</b></button><button><strong>Full Academic Year</strong><small>10 months, save TZS 40,000</small><b>TZS 520,000</b></button></div></section>
            <section className="os-detail-section"><div className="os-detail-section-title"><h2><Utensils size={17} /> Hostel Standards &amp; Community Life</h2><span>What residents can expect</span></div><div className="os-standards-grid"><div><strong>Included facilities</strong><p>Laundry balcony, induction cooking, professional janitor, bicycle and scooter bay.</p></div><div><strong>Community conduct rules</strong><p>Quiet hours from 10:00 PM, guest policy at the study lounge, and a smoke-free environment.</p></div></div></section>
          </div>
          <aside className="os-detail-side-column"><section className="os-booking-card"><span className="os-kicker">ROOM 204 • LOWER BUNK B</span><h2>TZS 280,000 <small>/ semester</small></h2><p>Covers 5 months of residence</p><div className="os-booking-lines"><span>Room bed rent <b>TZS 280,000</b></span><span>Booking confirmation fee <b>TZS 50,000</b></span><span>Amenities &amp; WiFi <b>FREE</b></span></div><strong className="os-booking-total">Total to confirm: <b>TZS 330,000</b></strong><p className="os-booking-note"><ShieldCheck size={14} /> Payment terms are shared clearly with both tenant and property owner before confirmation.</p><button className="os-primary-button os-full-button" onClick={onClose}>Request this space <ArrowRight size={15} /></button><button className="os-secondary-button os-full-button"><MessageSquare size={14} /> Request WhatsApp walkthrough</button></section><section className="os-proximity-card"><div className="os-detail-section-title"><h2>Campus proximity map</h2><span>Open full map</span></div><div className="os-mini-map"><MapPin size={22} /><span>UDSM Gate • 900m</span></div><p>Paved walking path with reliable landmarks direct to campus.</p></section></aside>
        </div>
        <footer className="os-caretaker-card"><div className="os-profile-avatar">BB</div><div><strong>Bahati B. (On-Duty Caretaker)</strong><span>Hostel warden and facilities lead • On duty today</span></div><button><Phone size={14} /> Call caretaker</button><button className="os-primary-button"><MessageSquare size={14} /> WhatsApp Bahati</button></footer>
      </section>
    </div>
  );
}

function DropletIcon() {
  return <span className="os-droplet-icon">◌</span>;
}

function ProfileModal({
  role,
  onRole,
  onClose,
  onSignOut,
}: {
  role: Role;
  onRole: (role: Role) => void;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const profile = role === "Agent"
    ? { name: "Daudi M.", title: "Registered Estate Agent", email: "daudi.m@flx.co.tz", phone: "+255 754 884 120", location: "Dar es Salaam, Tanzania", initials: "DM", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=85" }
    : role === "Owner"
      ? { name: "Neema Joseph", title: "Property Owner", email: "neema.j@flx.co.tz", phone: "+255 712 345 678", location: "Mikocheni, Dar es Salaam", initials: "NJ", photo: defaultProfilePhoto }
      : role === "Ops"
        ? { name: "Amina Hassan", title: "FLX Operations Admin", email: "amina.h@flx.co.tz", phone: "+255 713 880 222", location: "FLX Ops Center, Dar es Salaam", initials: "AH", photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=180&q=85" }
        : { name: "Juma Bakari", title: "UDSM Computer Science Scholar", email: "juma.b@udsm.ac.tz", phone: "+255 766 204 204", location: "Mwenge, Dar es Salaam", initials: "JB", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&q=85" };
  const [draft, setDraft] = useState(() => {
    const saved = localStorage.getItem(`flx-profile-${role}`);
    return saved ? { ...profile, ...(JSON.parse(saved) as Partial<typeof profile>) } : profile;
  });
  const [photoFailed, setPhotoFailed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const updateDraft = (field: keyof typeof profile, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const saveDraft = () => {
    localStorage.setItem(`flx-profile-${role}`, JSON.stringify(draft));
    onClose();
  };
  const updatePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateDraft("photo", String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="os-profile-backdrop" onClick={onClose}>
      <section className="os-profile-modal" onClick={(event) => event.stopPropagation()}>
        <div className="os-profile-modal-top">
          <div>
            <span className="os-kicker">ACCOUNT CENTER</span>
            <h2>My profile</h2>
          </div>
          <button className="os-modal-close os-profile-close" onClick={onClose} aria-label="Close profile menu"><X size={18} /></button>
        </div>

        <div className="os-profile-identity">
          <div className="os-profile-large-avatar"><img src={draft.photo} alt={`${draft.name} profile`} onError={() => setPhotoFailed(true)} /><span className={photoFailed ? "is-visible" : ""}>{draft.initials}</span></div>
          <div>
            <h3>{draft.name}</h3>
            <p>{draft.title}</p>
            <span className="os-profile-verified"><Check size={12} /> Identity verified</span>
          </div>
        </div>

        <div className="os-profile-detail-list">
          <label><span>Full name</span><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} /></label>
          <label><span>Role title</span><input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
          <label><span>Email address</span><input type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} /></label>
          <label><span>Phone number</span><input value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} /></label>
          <label><span>Location</span><input value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} /></label>
          <label className="os-photo-field"><span>Profile photo</span><span className="os-photo-upload"><Camera size={14} /> Change photo<input type="file" accept="image/*" onChange={(event) => { setPhotoFailed(false); updatePhoto(event); }} /></span></label>
        </div>

        <div className="os-profile-section-label">Workspace access</div>
        <div className="os-profile-role-grid">
          {([
            { role: "Client", label: "Client OS", icon: Home },
            { role: "Agent", label: "Agent CRM", icon: Activity },
            { role: "Owner", label: "Owner OS", icon: LayoutDashboard },
            { role: "Ops", label: "Ops Center", icon: ShieldCheck },
          ] as const).map(({ role: workspaceRole, label, icon: Icon }) => (
            <button key={`${workspaceRole}-${label}`} className={role === workspaceRole ? "active" : ""} onClick={() => { onRole(workspaceRole); onClose(); }}>
              <Icon size={16} />
              <span>{label}</span>
              {role === workspaceRole ? <Check size={13} /> : null}
            </button>
          ))}
        </div>

        <div className="os-profile-preferences">
          <button type="button" onClick={() => setNotificationsEnabled((current) => !current)}><span className="os-profile-preference-icon"><Bell size={15} /></span><div><strong>Notifications</strong><small>Alerts and property updates are on</small></div><span className={`os-toggle ${notificationsEnabled ? "is-on" : ""}`} /></button>
          <div><span className="os-profile-preference-icon"><MapPin size={15} /></span><div><strong>Market location</strong><small>Dar es Salaam</small></div><ChevronRight size={15} /></div>
        </div>

        <div className="os-profile-form-actions"><button className="os-profile-cancel" onClick={onClose}>Cancel</button><button className="os-profile-save" onClick={saveDraft}>Save changes</button></div>
        <button className="os-signout-button" onClick={onSignOut}><LogOut size={16} /> Sign out of FLX</button>
        <p className="os-profile-footnote">Your account stays protected across Explore, Client OS, Agent, Owner, and Ops workspaces.</p>
      </section>
    </div>
  );
}

function ServiceRequestPage() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '');
  const slug = pathname.split('/').filter(Boolean).slice(-1)[0] || 'house-renting';
  const service = serviceCatalog.find((item) => item.slug === slug) ?? serviceCatalog[0];
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    intent: 'Rent',
    note: '',
    consent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: 'error' | 'success' | 'info'; message: string } | null>(null);

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.consent) {
      setStatus({ tone: 'error', message: 'Please confirm consent before sending your request.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_slug: service.slug,
          service_title: service.title,
          client_name: form.name.trim(),
          client_email: form.email.trim(),
          client_phone: form.phone.trim(),
          intent: form.intent,
          preferred_date: form.preferredDate || null,
          note: form.note.trim(),
          consent: true,
        }),
      });
      const payload = await response.json().catch(() => ({ error: 'Service request could not be created.' }));
      if (!response.ok) throw new Error(payload?.error || 'Service request could not be created.');
      setStatus({ tone: 'success', message: payload.message || 'Your service request was sent to the FLX team.' });
      setForm({ name: '', email: '', phone: '', preferredDate: '', intent: 'Rent', note: '', consent: false });
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Service request could not be created.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="market-reference-page market-landing-page">
      <header className="market-reference-header market-landing-header">
        <a className="market-reference-brand market-landing-brand" href="/" aria-label="Back to FLX home">
          <img src="/assets/flx-logo-round.jpeg" alt="FLX Real Estate" />
        </a>
        <div className="market-reference-location">
          <MapPin size={14} />
          <span>
            <small>SERVICE</small>
            {service.title}
          </span>
        </div>
        <a className="market-landing-header-cta" href="/marketplace">
          Browse all properties
        </a>
      </header>

      <main className="market-landing-about" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)', gap: 24, alignItems: 'start' }}>
        <section className="market-landing-hero" style={{ position: 'relative', minHeight: 360 }}>
          <div className="market-landing-hero-copy" style={{ margin: 0 }}>
            <span className="market-landing-eyebrow">{service.accent} FLX SERVICE</span>
            <h1>{service.title}</h1>
            <p>{service.description}</p>
            <div className="fx-service-role-row" style={{ marginTop: 20 }}>
              {service.roles.map((role) => (
                <span key={role} className="fx-role-pill" style={{ display: 'inline-flex' }}>{role}</span>
              ))}
            </div>
            <small style={{ display: 'block', marginTop: 20 }}>Best fit for: {service.category} · FLX team support available</small>
          </div>
        </section>

        <section className="fx-client-request-form" style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 24, border: '1px solid rgba(15,23,42,0.06)' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '1.9rem', letterSpacing: '-0.06em' }}>Request this service</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Full name
              <input required value={form.name} onChange={(event) => handleChange('name', event.target.value)} placeholder="Your full name" />
            </label>
            <label>
              Email address
              <input required type="email" value={form.email} onChange={(event) => handleChange('email', event.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              Phone number
              <input required value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} placeholder="+255 ..." />
            </label>
            <div className="fx-request-form-row">
              <label>
                Service intent
                <select value={form.intent} onChange={(event) => handleChange('intent', event.target.value)}>
                  <option value="Rent">Rent</option>
                  <option value="Buy">Buy</option>
                </select>
              </label>
              <label>
                Preferred date
                <input type="date" value={form.preferredDate} onChange={(event) => handleChange('preferredDate', event.target.value)} />
              </label>
            </div>
            <label>
              Project note
              <textarea rows={4} value={form.note} onChange={(event) => handleChange('note', event.target.value)} placeholder="Tell us what you need and the urgency of the request." />
            </label>
            <label className="fx-checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <input type="checkbox" checked={form.consent} onChange={(event) => handleChange('consent', event.target.checked)} />
              <span>I consent to the FLX team contacting me about this service request.</span>
            </label>

            {status ? (
              <div className={status.tone === 'success' ? 'fx-auth-message' : 'fx-auth-message'} style={{ marginTop: 16, background: status.tone === 'success' ? '#e8fff3' : '#fff1f2', color: status.tone === 'success' ? '#0d8a5f' : '#a11d33' }}>
                {status.message}
              </div>
            ) : null}

            <button type="submit" className="fx-client-primary-btn" disabled={isSubmitting} style={{ marginTop: 16 }}>
              {isSubmitting ? 'Sending request...' : 'Send service request'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function FlxOsApp() {
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname === '/hostel/milimani') {
    return <HostelDetailPage />;
  }

  if (pathname.startsWith('/service/') || pathname.startsWith('/services/')) {
    return <ServiceRequestPage />;
  }

  if (pathname === '/' || pathname === '/marketplace') {
    return <MarketplaceClientFlow />;
  }

  const roleHash = location.hash.replace(/^#/, '').toLowerCase();
  const requiredRole = pathname === '/agent/intake' || (pathname === '/workspace' && roleHash === 'agent')
    ? 'Agent'
    : pathname === '/owner/portfolio' || (pathname === '/workspace' && roleHash === 'owner')
      ? 'Owner'
      : undefined;
  return <WorkspaceRoleRoute requiredRole={requiredRole} />;
}

function WorkspaceRoleRoute({ requiredRole }: { requiredRole?: 'Agent' | 'Owner' }) {
  const { user, isLoading, openAuthModal } = useAuth();

  useEffect(() => {
    if (!isLoading && requiredRole && user?.role !== requiredRole) {
      openAuthModal();
    }
  }, [isLoading, requiredRole, user?.role, openAuthModal]);

  if (isLoading) return <main className="workspace-access-page"><p>Checking your FLX account…</p></main>;
  if (requiredRole && user?.role !== requiredRole) {
    return <LocalAuthModal />;
  }

  return <WorkspaceDashboard />;
}

function WorkspaceDashboard() {

  const emptyClientDashboard: ClientDashboard = { stats: [], reminders: [], tickets: [] };
  const emptyAgentDashboard: AgentDashboard = { stats: [], leads: [], deals: [], contracts: [] };
  const emptyOwnerDashboard: OwnerDashboard = { portfolio: { totalRevenue: 'TZS 0', occupancy: '0%', paymentBalance: 'TZS 0', units: [] }, maintenance: [] };
  const emptyOpsDashboard: OpsDashboard = { queue: [], paymentSummary: null, disputes: [] };

  const [clientDashboard, setClientDashboard] = useState<ClientDashboard>(emptyClientDashboard);
  const [agentDashboard, setAgentDashboard] = useState<AgentDashboard>(emptyAgentDashboard);
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboard>(emptyOwnerDashboard);
  const [opsDashboard, setOpsDashboard] = useState<OpsDashboard>(emptyOpsDashboard);

  const resolveRoleFromHash = () => {
    if (window.location.pathname === '/agent/intake') return 'Agent';
    if (window.location.pathname === '/owner/portfolio') return 'Owner';
    const raw = window.location.hash.replace(/^#/, "").toLowerCase();
    if (!raw || raw === "explore") return "Explore";
    if (raw === "client") return "Client";
    if (raw === "agent") return "Agent";
    if (raw === "owner") return "Owner";
    if (raw === "ops") return "Ops";
    return "Explore";
  };

  const [role, setRole] = useState<Role>(resolveRoleFromHash());
  const [listings, setListings] = useState<Listing[]>(fallbackListings);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
    const { signOut } = useAuth();
  const [activeView, setActiveView] = useState<Record<Role, string>>({
    Explore: "market",
    Client: "home",
    Agent: "overview",
    Owner: "overview",
    Ops: "live",
  });

  useEffect(() => {
    const syncRoleFromHash = () => {
      const nextRole = resolveRoleFromHash();
      setRole((currentRole) => (currentRole === nextRole ? currentRole : nextRole));
    };

    syncRoleFromHash();
    window.addEventListener("hashchange", syncRoleFromHash);
    window.addEventListener("popstate", syncRoleFromHash);
    return () => {
      window.removeEventListener("hashchange", syncRoleFromHash);
      window.removeEventListener("popstate", syncRoleFromHash);
    };
  }, []);

  useEffect(() => {
    const nextHash = role === "Explore" ? "#explore" : `#${role.toLowerCase()}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }, [role]);

  useEffect(() => {
    fetch("/api/properties")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.properties?.length) setListings(payload.properties);
      })
      .catch(() => undefined);

    Promise.all([
      fetch("/api/client/dashboard"),
      fetch("/api/agent/dashboard", { headers: crmAuthHeaders() }),
      fetch("/api/owner"),
      fetch("/api/ops/dashboard"),
    ])
      .then(async ([clientRes, agentRes, ownerRes, opsRes]) => {
        const clientPayload = clientRes.ok ? await clientRes.json() : emptyClientDashboard;
        const agentPayload = agentRes.ok ? await agentRes.json() : { ...emptyAgentDashboard, accessError: agentRes.status === 401 ? "Sign in with an Agent or Admin account to view CRM records." : "Your account is not authorized to access these CRM records." };
        const ownerPayload = ownerRes.ok ? await ownerRes.json() : emptyOwnerDashboard;
        const opsPayload = opsRes.ok ? await opsRes.json() : emptyOpsDashboard;
        setClientDashboard(clientPayload);
        setAgentDashboard(agentPayload);
        setOwnerDashboard(ownerPayload);
        setOpsDashboard(opsPayload);
      })
        .catch(() => setAgentDashboard({ ...emptyAgentDashboard, accessError: "The CRM service is unavailable. Check the API connection and try again." }));
  }, []);

  const handleAddTicket = (title: string, status: string, eta: string) => {
    fetch('/api/client/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status, eta }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.dashboard) setClientDashboard(payload.dashboard);
      })
      .catch(() => undefined);
  };

  const handleClientQuickAction = (action: string) => {
    setClientDashboard((current) => {
      const nextDashboard: ClientDashboard = {
        ...current,
        reminders: [
          { time: 'Now', title: action, body: 'This action was recorded in your live resident workspace.' },
          ...(current.reminders ?? []).slice(0, 3),
        ],
        stats: (current.stats ?? []).map((item) =>
          item.label === 'Open requests'
            ? { ...item, value: String(Number(item.value.replace(/[^0-9]/g, '')) + 1 || 1) }
            : item,
        ),
      };
      fetch('/api/client/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextDashboard),
      }).catch(() => undefined);
      return nextDashboard;
    });
  };

  const handleAddLead = async (lead: NewAgentLead) => {
    const response = await fetch('/api/agent/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...crmAuthHeaders() },
      body: JSON.stringify({
        ...lead,
        budget: lead.budget.trim() ? Number(lead.budget) : null,
        next_contact_at: lead.next_contact_at || null,
        assigned_agent_id: lead.assigned_agent_id || null,
        property_id: lead.property_id || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Lead could not be saved.');
    if (payload?.dashboard) setAgentDashboard(payload.dashboard);
  };

  const handleUpdateLeadStage = async (leadId: string, stage: NonNullable<AgentLead['stage']>, lossReason?: string) => {
    const response = await fetch(`/api/agent/leads/${encodeURIComponent(leadId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...crmAuthHeaders() },
      body: JSON.stringify({ stage, loss_reason: lossReason, actor_id: 'agent' }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Lead stage could not be updated.');
    if (payload?.dashboard) setAgentDashboard(payload.dashboard);
  };

  const handleBulkAssign = async (leadIds: string[], assignedAgentId: string) => {
    const response = await fetch('/api/agent/leads/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...crmAuthHeaders() },
      body: JSON.stringify({ lead_ids: leadIds, assigned_agent_id: assignedAgentId }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Assignment could not be saved.');
    if (payload?.dashboard) setAgentDashboard(payload.dashboard);
  };

  const refreshAgentDashboard = async () => {
    const response = await fetch('/api/agent/dashboard', { headers: crmAuthHeaders() });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'CRM access could not be verified.');
    setAgentDashboard(payload);
  };

  const handleReviewDeal = (dealId: number) => {
    setAgentDashboard((current) => {
      const nextDashboard: AgentDashboard = {
        ...current,
        deals: (current.deals ?? []).map((deal) =>
          deal.id === dealId ? { ...deal, status: 'Reviewed' } : deal,
        ),
      };
      fetch('/api/agent/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...crmAuthHeaders() },
        body: JSON.stringify(nextDashboard),
      }).catch(() => undefined);
      return nextDashboard;
    });
  };

  const handleAddUnit = (name: string, label: string, value: string, status: string) => {
    fetch('/api/owner/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, label, value, status }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const normalizedDashboard: OwnerDashboard = payload?.dashboard && typeof payload.dashboard === 'object'
          ? payload.dashboard
          : {
              ...(emptyOwnerDashboard as OwnerDashboard),
              portfolio: payload?.portfolio || emptyOwnerDashboard.portfolio,
            };

        if (normalizedDashboard.portfolio) {
          setOwnerDashboard(normalizedDashboard);
        }
      })
      .catch(() => undefined);
  };

  const handleUpdateUnitStatus = (unitName: string, nextStatus: string) => {
    setOwnerDashboard((current) => {
      const portfolio = current.portfolio ?? { totalRevenue: 'TZS 0', occupancy: '0%', paymentBalance: 'TZS 0', units: [] };
      const nextDashboard: OwnerDashboard = {
        ...current,
        portfolio: {
          ...portfolio,
          units: (portfolio.units ?? []).map((unit) =>
            unit.name === unitName ? { ...unit, status: nextStatus } : unit,
          ),
        },
      };
      fetch('/api/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextDashboard),
      }).catch(() => undefined);
      return nextDashboard;
    });
  };

  const handleAddIncident = async (title: string, summary: string, action: string) => {
    const response = await fetch('/api/ops/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary, action }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.dashboard) throw new Error(payload?.error || 'Incident could not be saved.');
    setOpsDashboard(payload.dashboard);
  };

  const handleAddMaintenance = (title: string, location: string, state: string) => {
    setOwnerDashboard((current) => {
      const nextDashboard: OwnerDashboard = {
        ...current,
        maintenance: [{ title, location, state }, ...(current.maintenance ?? [])],
      };
      fetch('/api/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextDashboard),
      }).catch(() => undefined);
      return nextDashboard;
    });
  };

  const handleAddQueueItem = async (label: string, status: string, details: string) => {
    const createdAt = new Date().toISOString();
    const nextDashboard: OpsDashboard = {
      ...opsDashboard,
      queue: [{ label, status, details }, ...(opsDashboard.queue ?? [])],
      auditTrail: [{ id: crypto.randomUUID(), action: 'Case created', target: label, at: createdAt }, ...(opsDashboard.auditTrail ?? [])],
    };
    const response = await fetch('/api/ops/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextDashboard) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Verification case could not be saved.');
    setOpsDashboard(payload?.dashboard ?? nextDashboard);
  };

  const handleReviewQueueItem = async (itemLabel: string) => {
    const reviewedAt = new Date().toISOString();
    const nextDashboard: OpsDashboard = {
      ...opsDashboard,
      queue: (opsDashboard.queue ?? []).map((item) => item.label === itemLabel ? { ...item, status: 'Verified', details: `${item.details} • Reviewed and approved.` } : item),
      auditTrail: [{ id: crypto.randomUUID(), action: 'Case approved', target: itemLabel, at: reviewedAt }, ...(opsDashboard.auditTrail ?? [])],
    };
    const response = await fetch('/api/ops/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextDashboard) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Case approval could not be saved.');
    setOpsDashboard(payload?.dashboard ?? nextDashboard);
  };

  const handleResolveIncident = async (incidentTitle: string) => {
    const resolvedAt = new Date().toISOString();
    const nextDashboard: OpsDashboard = {
      ...opsDashboard,
      disputes: (opsDashboard.disputes ?? []).map((item) => item.title === incidentTitle ? { ...item, status: 'Resolved', resolvedAt } : item),
      auditTrail: [{ id: crypto.randomUUID(), action: 'Dispute resolved', target: incidentTitle, at: resolvedAt }, ...(opsDashboard.auditTrail ?? [])],
    };
    const response = await fetch('/api/ops/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextDashboard) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Dispute resolution could not be saved.');
    setOpsDashboard(payload?.dashboard ?? nextDashboard);
  };

  const goToRole = (nextRole: Role) => {
    setSelectedListing(null);
    if (nextRole === role) return;
    const destinations: Record<Role, string> = {
      Explore: "/#marketplace",
      Client: "/#marketplace",
      Agent: "/agent/intake",
      Owner: "/owner/portfolio",
      Ops: "/workspace#ops",
    };
    window.location.assign(destinations[nextRole]);
  };

  const currentScreen = useMemo(
    () =>
      ({
        Explore: (
          <ExploreScreen listings={listings} onOpen={setSelectedListing} />
        ),
        Client: <ClientScreen onOpen={setSelectedListing} activeView={activeView.Client} dashboard={clientDashboard} onAddTicket={handleAddTicket} onQuickAction={handleClientQuickAction} />,
        Agent: <AgentScreen activeView={activeView.Agent} dashboard={agentDashboard} onAddLead={handleAddLead} onUpdateLeadStage={handleUpdateLeadStage} onBulkAssign={handleBulkAssign} onReviewDeal={handleReviewDeal} onAuthenticate={refreshAgentDashboard} />,
        Owner: (
          <OwnerScreen
            activeView={activeView.Owner}
            onChangeView={(view) =>
              setActiveView((current) => ({ ...current, Owner: view }))
            }
            dashboard={ownerDashboard}
            onAddUnit={handleAddUnit}
            onUpdateUnitStatus={handleUpdateUnitStatus}
            onAddMaintenance={handleAddMaintenance}
          />
        ),
        Ops: <OpsScreen activeView={activeView.Ops} dashboard={opsDashboard} onAddIncident={handleAddIncident} onResolveIncident={handleResolveIncident} onAddQueueItem={handleAddQueueItem} onReviewQueueItem={handleReviewQueueItem} onDashboardUpdate={setOpsDashboard} />,
      })[role],
    [activeView, clientDashboard, agentDashboard, ownerDashboard, opsDashboard, listings, role],
  );

  return (
    <div className="os-app">
      <TopBar role={role} onRole={goToRole} />
      {currentScreen}
      <nav className={`os-bottom-nav ${role === "Explore" ? "os-explore-nav" : ""} ${role === "Owner" ? "os-owner-nav" : ""}`}>
        {roleNavItems[role].map(({ id, role: navRole, label, icon: Icon }) => (
          <button
            key={`${navRole}-${id}`}
            className={activeView[role] === id ? "active" : ""}
            onClick={() => {
              setActiveView((current) => ({ ...current, [role]: id }));
              if (navRole !== role) {
                if (role === "Explore" && navRole === "Client") {
                  window.location.assign("/#hostels");
                  return;
                }
                goToRole(navRole);
              }
            }}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {selectedListing ? (
        <DetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      ) : null}
    </div>
  );
}

