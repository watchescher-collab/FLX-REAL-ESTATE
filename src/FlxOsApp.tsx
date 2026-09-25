import { useEffect, useMemo, useState } from "react";
import { RealEstateLeafletMap } from "./components/RealEstateLeafletMap";
import { HostelDetailPage } from "./components/HostelDetailPage";
import { MarketplaceReferencePage } from "./components/MarketplaceReferencePage";
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

type AgentDashboard = {
  profile?: { name: string; title: string };
  stats?: Array<{ label: string; value: string; delta: string }>;
  leads?: Array<{ id: number; title: string; note: string }>;
  deals?: Array<{ id: number; title: string; status: string; note: string }>;
  contracts?: Array<{ id: number; title: string; note: string }>;
};

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
  paymentSummary?: { balance: string; flags: string };
  disputes?: Array<{ title: string; summary: string; action: string }>;
};

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
    { id: "hostels", role: "Client", label: "Hostels", icon: UserRound },
    { id: "offices", role: "Agent", label: "Offices", icon: ClipboardCheck },
    { id: "land", role: "Owner", label: "Land", icon: Building2 },
    { id: "ops", role: "Ops", label: "Ops", icon: ShieldCheck },
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
      <span className="os-brand-mark">FLX</span>
      <span>REALTY TZ</span>
    </div>
  );
}

function TopBar({
  role,
  onRole,
  onProfile,
}: {
  role: Role;
  onRole: (role: Role) => void;
  onProfile: () => void;
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
          <button className="os-avatar" onClick={onProfile} aria-label="Open profile menu">
            <img src={defaultProfilePhoto} alt="" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.nextElementSibling?.classList.add("is-visible"); }} />
            <span>NJ</span>
          </button>
        </div>
      </div>
      {role !== "Explore" ? (
        <div className="os-context-row">
          <div>
            <span className="os-kicker">FLX REALTY • DAR ES SALAAM</span>
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
      name: "FLX Realty",
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
      <footer className="os-market-footer"><div><strong>FLX Realty</strong><span>Fast, authoritative property infrastructure for coastal East Africa.</span></div><div><b>Marketplace</b><span>Dar es Salaam properties</span><span>Student living</span></div><div><b>Due diligence</b><span>Ministry title verification</span><span>Cadastral boundary surveys</span></div><div><b>FLX Portal</b><span>Owner operating system</span><span>Market pulse</span></div></footer>
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

  const clientViews: Record<string, JSX.Element> = {
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

function AgentScreen({ activeView, dashboard, onAddLead, onReviewLead, onReviewDeal }: { activeView: string; dashboard: AgentDashboard; onAddLead: (title: string, note: string) => void; onReviewLead: (leadId: number) => void; onReviewDeal: (dealId: number) => void; }) {
  const [leadTitle, setLeadTitle] = useState("");
  const [leadNote, setLeadNote] = useState("");
  const leads = dashboard.leads ?? [];
  const deals = dashboard.deals ?? [];
  const contracts = dashboard.contracts ?? [];

  const agentViews: Record<string, JSX.Element> = {
    overview: (
      <>
        <section className="os-profile-card os-agent-card">
          <div className="os-profile-avatar photo">DM</div>
          <div className="os-profile-copy"><strong>Daudi M.</strong><span>BRELA No. RLCA-2024-TZ-8841 • FLX Verified</span></div>
          <QrCode size={23} />
          <div className="os-agent-metrics">
            <div><span>Active Leads</span><strong>28 <small>+5</small></strong></div>
            <div><span>Target Hit</span><strong>82% <small>Mtd</small></strong></div>
            <div><span>Conversion</span><strong>34% <small>Top 5%</small></strong></div>
          </div>
        </section>
        <section className="os-ledger-card">
          <div className="os-section-heading"><h2><Landmark size={17} /> Financial Ledger</h2><span className="os-orange-pill">BOT Compliant</span></div>
          <div className="os-ledger-total"><span>AVAILABLE LIQUID COMMISSION</span><strong>TZS 2,350,000 <small>Net</small></strong><button className="os-danger-button">⚡ Cashout</button><small>M-Pesa → CRDB Direct</small></div>
          <div className="os-pipeline-row"><span>Active Deal Pipeline<small>3 closings releasing ≤14d</small></span><strong>TZS 4,200,000</strong></div>
        </section>
        <section className="os-utility-card">
          <div className="os-section-heading"><h2><UsersRound size={17} /> Add new lead</h2><span>CRM sync</span></div>
          <div className="os-ticket-form">
            <input value={leadTitle} onChange={(event) => setLeadTitle(event.target.value)} placeholder="Lead name or campaign" />
            <input value={leadNote} onChange={(event) => setLeadNote(event.target.value)} placeholder="Lead note" />
            <button className="os-primary-button" onClick={() => { if (!leadTitle.trim()) return; onAddLead(leadTitle.trim(), leadNote.trim() || 'New lead added from FLX intake'); setLeadTitle(''); setLeadNote(''); }}>Save lead</button>
          </div>
        </section>
      </>
    ),
    leads: (
      <section>
        <div className="os-section-heading"><h2>Fresh Leads</h2><span>{leads.length} active</span></div>
        <div className="os-action-grid">
          {leads.map((lead) => (
            <button key={lead.id} onClick={() => onReviewLead(lead.id)}><UsersRound size={18} /><strong>{lead.title}</strong><small>{lead.note}</small></button>
          ))}
        </div>
      </section>
    ),
    deals: (
      <section>
        <div className="os-section-heading"><h2>Deals Funnel</h2><span>{deals.length} in pipe</span></div>
        {deals.map((deal) => (
          <article className="os-deal-row" key={deal.id}><div><span className="os-deal-status">{deal.status}</span><strong>{deal.title}</strong><p>{deal.note}</p></div><button onClick={() => onReviewDeal(deal.id)}>Review</button></article>
        ))}
      </section>
    ),
    contracts: (
      <section>
        <div className="os-section-heading"><h2>Contracts</h2><span>Mkataba Pro</span></div>
        <div className="os-action-grid">
          {contracts.map((contract) => (
            <button key={contract.id}><FileCheck2 size={18} /><strong>{contract.title}</strong><small>{contract.note}</small></button>
          ))}
        </div>
      </section>
    ),
    settings: (
      <section className="os-utility-card">
        <div className="os-section-heading"><h2><Settings2 size={17} /> Agent Settings</h2><span>Account</span></div>
        <div className="os-stat-grid"><div><span>Brand</span><strong>FLX Agent</strong><small>Active</small></div><div><span>Auto share</span><strong>On</strong><small>WhatsApp + SMS</small></div></div>
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

  const ownerViews: Record<string, JSX.Element> = {
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
    listings: (
      <section className="os-owner-approvals">
        <div className="os-owner-section-title">
          <div>
            <h2><Building2 size={16} /> Listings</h2>
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
        {[(dashboard.maintenance ?? []).length ? dashboard.maintenance : [
          ["Water pressure fix", "Mlimani Comfort Hostel", "Waiting for plumber"],
          ["Gate sensor replacement", "Kijitonyama Apartments", "Technician on site"],
          ["Roof leak inspection", "Posta Office Suites", "Approved by owner"],
        ]].flat().map(([title, location, state]) => (
          <article className="os-owner-approval" key={`${title}-${location}`}>
            <div className="os-owner-approval-icon"><Wrench size={14} /></div>
            <div>
              <strong>{title}</strong>
              <small>{location}</small>
            </div>
            <button>{state}</button>
          </article>
        ))}
      </section>
    ),
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "listings", label: "Listings", icon: Building2 },
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

function OpsScreen({ activeView, dashboard, onAddIncident, onResolveIncident, onReleaseFunds, onAddQueueItem }: { activeView: string; dashboard: OpsDashboard; onAddIncident: (title: string, summary: string, action: string) => void; onResolveIncident: (incidentTitle: string) => void; onReleaseFunds: () => void; onAddQueueItem: (label: string, status: string, details: string) => void; }) {
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentSummary, setIncidentSummary] = useState("");
  const [queueLabel, setQueueLabel] = useState("");
  const [queueStatus, setQueueStatus] = useState("Pending");
  const [queueDetails, setQueueDetails] = useState("");
  const queue = dashboard.queue ?? [];
  const disputes = dashboard.disputes ?? [];
  const paymentSummary = dashboard.paymentSummary ?? { balance: 'TZS 142,500,000', flags: '0 Security Flags • 100% Reconciled' };

  const opsViews: Record<string, JSX.Element> = {
    live: (
      <>
        <section className="os-ops-hero">
          <div><span className="os-kicker">REAL-TIME CADASTRAL VERIFICATION & PAYMENT CLEARING</span><h2>Dar Ops Command</h2><p>Automated compliance and settlement control.</p></div>
          <div><span>SLA COMPLIANCE</span><strong>99.2%</strong></div>
          <div className="os-ops-total"><span>24H PAYMENT FLOW</span><strong>{paymentSummary.balance}</strong><small>BOT FinTech Payment Directives v2.1 <b>ACTIVE</b></small></div>
        </section>
        <div className="os-stat-grid"><div><span>QUEUE</span><strong>{queue.length} Subs</strong><small>NIDA, e-Ardhi, Student</small></div><div><span>DISPUTES</span><strong className="os-red-text">{disputes.length} Active</strong><small>{paymentSummary.flags}</small></div></div>
        <section className="os-utility-card">
          <div className="os-section-heading"><h2><Bell size={17} /> Escalate incident</h2><span>Ops ledger</span></div>
          <div className="os-ticket-form">
            <input value={incidentTitle} onChange={(event) => setIncidentTitle(event.target.value)} placeholder="Incident title" />
            <input value={incidentSummary} onChange={(event) => setIncidentSummary(event.target.value)} placeholder="Incident summary" />
            <button className="os-primary-button" onClick={() => { if (!incidentTitle.trim() || !incidentSummary.trim()) return; onAddIncident(incidentTitle.trim(), incidentSummary.trim(), 'Escalate case'); setIncidentTitle(''); setIncidentSummary(''); }}>Save incident</button>
          </div>
        </section>
      </>
    ),
    verify: (
      <section>
        <div className="os-section-heading"><h2><Activity size={17} /> Verification Queue</h2><span className="os-red-text">{queue.length} PENDING</span></div>
        <div className="os-ticket-form" style={{ marginBottom: 16 }}>
          <input value={queueLabel} onChange={(event) => setQueueLabel(event.target.value)} placeholder="Verification item" />
          <input value={queueStatus} onChange={(event) => setQueueStatus(event.target.value)} placeholder="Status" />
          <input value={queueDetails} onChange={(event) => setQueueDetails(event.target.value)} placeholder="Details" />
          <button className="os-primary-button" onClick={() => { if (!queueLabel.trim() || !queueDetails.trim()) return; onAddQueueItem(queueLabel.trim(), queueStatus.trim() || 'Pending', queueDetails.trim()); setQueueLabel(''); setQueueStatus('Pending'); setQueueDetails(''); }}>Add queue item</button>
        </div>
        {queue.map((item, index) => (
          <article className="os-verification-row" key={`${item.label}-${index}`}><div className="os-verification-icon">{index === 0 ? <MapPin size={16} /> : index === 1 ? <Home size={16} /> : <UserRound size={16} />}</div><div><span>{item.status}</span><strong>{item.label}</strong><small>{item.details}</small></div><button onClick={() => onResolveIncident(item.label)}>{index === 0 ? "Approve NLIS Seal" : "Approve"}</button></article>
        ))}
      </section>
    ),
    monitor: (
      <section className="os-vault-card"><div className="os-section-heading"><h2>Payment Monitor</h2><span>3 Transactions</span></div><strong>{paymentSummary.balance}</strong><p>Custodial Payment Balance<br /><span>{paymentSummary.flags}</span></p><button className="os-primary-button" onClick={onReleaseFunds}>Bulk Release Funds to Owners <Wallet size={15} /></button></section>
    ),
    disputes: (
      <section className="os-alert-card"><span className="os-orange-pill">HIGH THREAT</span><h3>{disputes[0]?.title || 'Ocean View Apartment Masaki'}</h3><p>{disputes[0]?.summary || 'Duplicate match: Cape Town Listing #921'}<br />IP Origin: Johannesburg (Foreign Proxy)</p><div><button className="os-danger-button" onClick={() => onResolveIncident(disputes[0]?.title || 'Ocean View Apartment Masaki')}>{disputes[0]?.action || 'Ban & Freeze Account'}</button><button className="os-secondary-button" onClick={() => onResolveIncident(disputes[0]?.title || 'Ocean View Apartment Masaki')}>Audit</button></div></section>
    ),
    audit: (
      <section className="os-demand-card"><div className="os-section-heading"><h2>Dar Geospatial Demand</h2><span className="os-red-text">LIVE TELEMETRY</span></div><div className="os-demand-map"><span>3 High Surge Hotspots Active</span></div>{["UDSM & Ardhi Corridor", "Posta / CBD FinTech Hub", "Kigamboni Coastal Cadastral"].map((item, index) => <div className="os-demand-row" key={item}><strong>{item}</strong><span>{index === 0 ? "98% Bed Demand" : index === 1 ? "Surge Commercial" : "Diaspora Inquiries +42%"}</span><small>{index === 0 ? "Hostel shortfall: High search intensity from incoming undergraduates" : index === 1 ? "Turnkey suites 100-200 SQM requested by regional payment brokers" : "UK & Nordic remittance buyers prioritizing verified survey beacons"}</small></div>)}</section>
    ),
  };

  return <main className="os-main">{opsViews[activeView] ?? opsViews.live}</main>;
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
  const updatePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          {[
            { role: "Client", label: "Client OS", icon: Home },
            { role: "Agent", label: "Agent CRM", icon: Activity },
            { role: "Owner", label: "Owner OS", icon: LayoutDashboard },
            { role: "Ops", label: "Ops Center", icon: ShieldCheck },
          ].map(({ role: workspaceRole, label, icon: Icon }) => (
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

export default function FlxOsApp() {
  if (window.location.pathname === '/hostel/milimani') {
    return <HostelDetailPage />;
  }

  if (window.location.pathname === '/' || window.location.pathname === '/marketplace') {
    return <MarketplaceReferencePage />;
  }

  const emptyClientDashboard: ClientDashboard = { stats: [], reminders: [], tickets: [] };
  const emptyAgentDashboard: AgentDashboard = { stats: [], leads: [], deals: [], contracts: [] };
  const emptyOwnerDashboard: OwnerDashboard = { portfolio: { totalRevenue: 'TZS 0', occupancy: '0%', paymentBalance: 'TZS 0', units: [] }, maintenance: [] };
  const emptyOpsDashboard: OpsDashboard = { queue: [], paymentSummary: { balance: 'TZS 0', flags: '0 Security Flags • 100% Reconciled' }, disputes: [] };

  const [clientDashboard, setClientDashboard] = useState<ClientDashboard>(emptyClientDashboard);
  const [agentDashboard, setAgentDashboard] = useState<AgentDashboard>(emptyAgentDashboard);
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboard>(emptyOwnerDashboard);
  const [opsDashboard, setOpsDashboard] = useState<OpsDashboard>(emptyOpsDashboard);

  const resolveRoleFromHash = () => {
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
    return () => window.removeEventListener("hashchange", syncRoleFromHash);
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
      fetch("/api/agent/dashboard"),
      fetch("/api/owner"),
      fetch("/api/ops/dashboard"),
    ])
      .then(async ([clientRes, agentRes, ownerRes, opsRes]) => {
        const clientPayload = clientRes.ok ? await clientRes.json() : emptyClientDashboard;
        const agentPayload = agentRes.ok ? await agentRes.json() : emptyAgentDashboard;
        const ownerPayload = ownerRes.ok ? await ownerRes.json() : emptyOwnerDashboard;
        const opsPayload = opsRes.ok ? await opsRes.json() : emptyOpsDashboard;
        setClientDashboard(clientPayload);
        setAgentDashboard(agentPayload);
        setOwnerDashboard(ownerPayload);
        setOpsDashboard(opsPayload);
      })
      .catch(() => undefined);
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

  const handleAddLead = (title: string, note: string) => {
    fetch('/api/agent/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, note }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.dashboard) setAgentDashboard(payload.dashboard);
      })
      .catch(() => undefined);
  };

  const handleReviewLead = (leadId: number) => {
    setAgentDashboard((current) => {
      const nextDashboard: AgentDashboard = {
        ...current,
        leads: (current.leads ?? []).map((lead) =>
          lead.id === leadId ? { ...lead, note: `${lead.note} • Reviewed in the live CRM.` } : lead,
        ),
      };
      fetch('/api/agent/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextDashboard),
      }).catch(() => undefined);
      return nextDashboard;
    });
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
        headers: { 'Content-Type': 'application/json' },
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

  const handleAddIncident = (title: string, summary: string, action: string) => {
    fetch('/api/ops/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary, action }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.dashboard) setOpsDashboard(payload.dashboard);
      })
      .catch(() => undefined);
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

  const handleAddQueueItem = (label: string, status: string, details: string) => {
    setOpsDashboard((current) => {
      const nextDashboard: OpsDashboard = {
        ...current,
        queue: [{ label, status, details }, ...(current.queue ?? [])],
      };
      fetch('/api/ops/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextDashboard),
      }).catch(() => undefined);
      return nextDashboard;
    });
  };

  const handleResolveIncident = (incidentTitle: string) => {
    setOpsDashboard((current) => {
      const nextDashboard: OpsDashboard = {
        ...current,
        disputes: (current.disputes ?? []).filter((item) => item.title !== incidentTitle),
        paymentSummary: {
          balance: current.paymentSummary?.balance || 'TZS 142,500,000',
          flags: 'Resolved • 100% reconciled',
        },
      };
      fetch('/api/ops/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextDashboard),
      }).catch(() => undefined);
      return nextDashboard;
    });
  };

  const handleReleaseFunds = () => {
    setOpsDashboard((current) => {
      const nextDashboard: OpsDashboard = {
        ...current,
        paymentSummary: {
          balance: 'TZS 145,200,000',
          flags: 'Funds released • 100% reconciled',
        },
      };
      fetch('/api/ops/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextDashboard),
      }).catch(() => undefined);
      return nextDashboard;
    });
  };

  const goToRole = (nextRole: Role) => {
    setRole(nextRole);
    setIsProfileOpen(false);
    setSelectedListing(null);
  };

  const currentScreen = useMemo(
    () =>
      ({
        Explore: (
          <ExploreScreen listings={listings} onOpen={setSelectedListing} />
        ),
        Client: <ClientScreen onOpen={setSelectedListing} activeView={activeView.Client} dashboard={clientDashboard} onAddTicket={handleAddTicket} onQuickAction={handleClientQuickAction} />,
        Agent: <AgentScreen activeView={activeView.Agent} dashboard={agentDashboard} onAddLead={handleAddLead} onReviewLead={handleReviewLead} onReviewDeal={handleReviewDeal} />,
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
        Ops: <OpsScreen activeView={activeView.Ops} dashboard={opsDashboard} onAddIncident={handleAddIncident} onResolveIncident={handleResolveIncident} onReleaseFunds={handleReleaseFunds} onAddQueueItem={handleAddQueueItem} />,
      })[role],
    [activeView, clientDashboard, agentDashboard, ownerDashboard, opsDashboard, listings, role],
  );

  return (
    <div className="os-app">
      <TopBar role={role} onRole={goToRole} onProfile={() => setIsProfileOpen(true)} />
      {currentScreen}
      <nav className={`os-bottom-nav ${role === "Explore" ? "os-explore-nav" : ""} ${role === "Owner" ? "os-owner-nav" : ""}`}>
        {roleNavItems[role].map(({ id, role: navRole, label, icon: Icon }) => (
          <button
            key={`${navRole}-${id}`}
            className={activeView[role] === id ? "active" : ""}
            onClick={() => {
              setActiveView((current) => ({ ...current, [role]: id }));
              if (navRole !== role) {
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
      {isProfileOpen ? (
        <ProfileModal
          role={role}
          onRole={goToRole}
          onClose={() => setIsProfileOpen(false)}
          onSignOut={() => {
            localStorage.removeItem("flx-user");
            goToRole("Explore");
          }}
        />
      ) : null}
    </div>
  );
}

