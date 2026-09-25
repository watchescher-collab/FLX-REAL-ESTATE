import { useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  Bell,
  Bus,
  Check,
  ChevronRight,
  CircleAlert,
  Droplets,
  ExternalLink,
  Fingerprint,
  Heart,
  Home,
  Info,
  MapPin,
  Menu,
  Navigation,
  Phone,
  Printer,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Utensils,
  VolumeX,
  WalletCards,
  Wifi,
  Wind,
  X,
  Zap,
} from 'lucide-react';

const galleryImages = [
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCdYeDGScvUa9ZV4U60PXfCNGfy2NK3d1nwZu9ERiEzCziWMWxfXZOtQEmECLc9lW_hOqu6npdOjBVpd5C5UnLiCNQazhxECZ5tzWtGhaNbi1xF0PoeXuuSYb1Qz7heI9s9Ns1VHWdDmsD5MPCB6c-CwcFld0ARmjye_OUUQGznKjnCJZqmwEDvJXukW-UISQMm3-FBHaYXYne5MuoatqQ-cdFGMR_xbpIj4IhH3fI-UyLwM1ajvf0',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBfZ-F4zc2WRvfFPZgo6WT-d-sx-hVMeRb_WCb_XXZcb4sUAschOpIdIFm0XXWmfiUMgryy4AapZfRMPfwXFToz9SJBegeE-n6s0qecdxbcjJQOW7au0Dqv5QrgQIVS1DkjrcSZAu1qf0G9PnapIVjchTlH0lz7XvEVebzQFUZvqE_1zhyBJkPGsgaED61lb9Db0Rwb0mdzaWfhcx0draP3GWO3BvCjUK2p0esQ18yBFMng21H3K6k',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAllF8bwgVNBdz-kJdOtb-xiGP3sPEBLN6thbv4drG-Yw_UO9NETnWspiz5LuAScewEbCqpawWLuPw8H6NFdWv-lHnWWWu5cXCBul3Hj-xIT6b2VKy0jqtu-N1z6yM9ArcreBQZnh-cXL5s4Gm8YTIoz4Oe82weIPaslvwFnoCVH2DNoZrzVuT6gsJ4WcCYFwWsuXafuYg8WPoplt1XFAQaAuZRQwUTraa86AtUKn0VZCvgIO9f_QM',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCDOGrCtBgVhutXMIqaeWMnK3ovi-iBS1f1Q3KEvAh9RBLt-jcGtQ9DajfSf4dBF2vzoyRuU98KIPXCOxsfyS1cnU7GHFaqoM9vGVkzRgrpNAVAN11Hp9_TnkSbGepvjwG5JB0DG9AR-b0NovrKJNzgSAvniAxMNkv49lWtRJA0uZgwfCcHT_LOAc1gjqAuU1WFi4A6Z9R5JonDu5AQRKFShbY7GCrXT2Njab_HMqPVqAHFmxOBCc4',
];

const radar = [
  { icon: Navigation, value: '11', unit: 'min', label: '900m to Yombo LT Lecture Complex', note: 'Primary', progress: 88 },
  { icon: Bus, value: 'TZS 200', unit: '', label: 'Msewe corner to Mwenge Bus Hub', note: 'Fare Fixed', progress: 0 },
  { icon: ShieldCheck, value: '9.2', unit: '/ 10', label: 'Street Solar Lighting & Active Bodas', note: 'Top 5%', progress: 92 },
  { icon: Fingerprint, value: '24/7 RFID Gate', unit: '', label: 'Biometric card turnstiles + Uniformed Guards', note: 'Secured', progress: 0 },
];

const utilities = [
  { icon: Droplets, title: '24/7 Pressurized Water', badge: '100% Online', body: 'Direct DAWASA municipal mains coupled with a 5,000L underground reserve tank & dual rooftop pressurized booster pumps.', foot: 'Clean multi-stage sediment filters replaced monthly.' },
  { icon: Zap, title: '25kVA Standby Generator', badge: '<15s Transfer', body: 'Automatic synchronized ATS failover. Powers room study sockets, high-speed WiFi, stairwell lights and security grid.', foot: 'Uninterrupted exams and online study sessions guaranteed.' },
  { icon: Wifi, title: '100 Mbps Dedicated Fiber', badge: 'Dual APs Floor 2', body: 'Low latency connection configured for video lectures, Zoom conferences, GitHub, and academic downloads. No data quotas.', foot: 'Uncapped speeds included free in base semester rent.' },
];

const bedDetails = {
  A: { name: 'Bed A (Upper Bunk)', note: 'Window North', status: 'Occupied', body: 'Sarah M. - Yr 2 CompSci', meta: 'Quiet studier - Early riser' },
  B: { name: 'Bed B (Lower Bunk)', note: 'Garden Breeze Window', status: 'Your Selection', body: 'Private reading light', meta: 'Dedicated 240V plug' },
  C: { name: 'Bed C (Lower Bunk)', note: 'En-suite Side', status: 'Deposit In Escrow', body: 'Reserved by UDSM Economics student.', meta: 'Under final BOT verification audit.' },
  D: { name: 'Bed D (Upper Bunk)', note: 'Skylight & Wall Desk', status: 'Available Now', body: 'Wide wall desk', meta: 'Skylight breeze' },
};

type BedId = keyof typeof bedDetails;

export function HostelDetailPage() {
  const [saved, setSaved] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedId>('B');
  const [lease, setLease] = useState<'semester' | 'year'>('semester');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const selected = bedDetails[selectedBed];
  const total = lease === 'semester' ? 'TZS 330,000' : 'TZS 570,000';

  const shareListing = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Mlimani Comfort Hostel', url: window.location.href });
    } else {
      await navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="hostel-page">
      <header className="hostel-header">
        <div className="hostel-header__inner">
          <button className="hostel-brand" type="button" onClick={() => window.location.assign('/#explore')}>
            <span className="hostel-brand__mark">FLX</span>
            <span>Real Estate</span>
          </button>
          <div className="hostel-search"><Search size={17} /><input aria-label="Search" placeholder="Search city, ward, or title deed..." /></div>
          <nav className="hostel-nav" aria-label="Primary navigation">
            <a href="/#explore">Explore Properties</a>
            <a className="is-active" href="#student-hostels">Student Hostels</a>
            <a href="#commercial">Commercial Spaces</a>
            <a href="#land">Land & Deeds</a>
            <a href="#escrow">BOT Escrow</a>
            <a href="#agent">Agent Portal</a>
          </nav>
          <div className="hostel-header__actions">
            <div className="hostel-toggle"><button type="button" className="is-selected">TZS</button><button type="button">USD</button></div>
            <div className="hostel-toggle hostel-toggle--language"><button type="button" className="is-selected">SW</button><button type="button">EN</button></div>
            <button className="hostel-icon-button" aria-label="Notifications" type="button"><Bell size={19} /></button>
            <button className="hostel-avatar" aria-label="Profile" type="button">AM</button>
          </div>
          <button className="hostel-menu-button" aria-label="Open menu" type="button" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {menuOpen && <nav className="hostel-mobile-nav"><a href="/#explore">Explore Properties</a><a href="#student-hostels">Student Hostels</a><a href="#commercial">Commercial Spaces</a><a href="#land">Land & Deeds</a><a href="#escrow">BOT Escrow</a></nav>}
      </header>

      <main>
        <div className="hostel-utility-bar">
          <nav className="hostel-breadcrumbs"><a href="/#explore"><Home size={14} /> Home</a><span>/</span><a href="#dar">Dar es Salaam</a><span>/</span><a href="#mwenge">Mwenge & UDSM Corridor</a><span>/</span><a href="#hostels">Hostels</a><span>/</span><strong>Mlimani Comfort Hostel</strong></nav>
          <div className="hostel-actions"><button type="button" onClick={shareListing}><Share2 size={15} /> Share Listing</button><button type="button" onClick={() => setSaved((value) => !value)} className={saved ? 'is-active' : ''}><Heart size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save to Wishlist'}</button><button type="button" onClick={() => window.print()}><Printer size={15} /> Print Dossier</button></div>
        </div>

        <section className="hostel-intro">
          <div>
            <div className="hostel-badges"><span className="badge badge--primary"><ShieldCheck size={14} /> FLX VERIFIED HOSTEL</span><span className="badge badge--amber">Female Only Block A</span><span className="badge badge--soft"><Star size={14} fill="currentColor" /> 4.8 <em>(42 verified reviews)</em></span><span className="availability-dot">Only 2 Bed-Spaces Left for Semester 1</span></div>
            <h1>Mlimani Comfort Hostel - Deluxe 4-Bed Suites</h1>
            <div className="hostel-location"><MapPin size={17} /><strong>Msewe Road</strong><span>•</span><span>900m from UDSM CoICT & Yombo LT Corridor</span><span>•</span><b>Direct Paved Walking Path</b><span>•</span><span>Sinza / Ubungo Municipal Zone</span></div>
          </div>
          <div className="hostel-price"><small>From</small><strong>TZS 280,000</strong><span>/ semester</span></div>
        </section>

        <section className="hostel-gallery">
          <button className="hostel-gallery__hero" type="button" onClick={() => setShowGallery(true)}><img src={galleryImages[0]} alt="Sunlit Mlimani hostel bedroom" /><span className="gallery-overlay"><b>FLOOR 2 • ROOM 204 MAIN VIEW</b><strong>Direct Morning Light & High Ceiling Ventilation</strong></span><span className="gallery-inspected"><Check size={14} /> Inspected Yesterday</span></button>
          <div className="hostel-gallery__grid">{galleryImages.slice(1).map((image, index) => <button key={image} type="button" onClick={() => setShowGallery(true)}><img src={image} alt={['Private en-suite bathroom', 'Silent study lounge', 'Induction kitchenette', 'Secure compound'][index]} /><span>{index === 0 ? 'Private En-suite' : index === 1 ? 'Silent Study Lounge' : index === 2 ? 'Induction Kitchenette' : '+8 More Photos'}</span></button>)}</div>
        </section>

        <div className="hostel-content-grid">
          <div className="hostel-main-column">
            <section className="hostel-section"><div className="section-heading"><div><Navigation size={22} /><h2>Commute & Safety Mobility Radar</h2></div><span>Validated via GPS & Student Surveys</span></div><div className="radar-grid">{radar.map(({ icon: Icon, value, unit, label, note, progress }) => <article className="radar-card" key={label}><div className="radar-card__top"><Icon size={21} /><span>{note}</span></div><strong>{value} <small>{unit}</small></strong><p>{label}</p>{progress > 0 && <div className="progress"><i style={{ width: `${progress}%` }} /></div>}</article>)}</div></section>

            <section className="hostel-section"><div className="section-heading"><div><ShieldCheck size={22} /><h2>Zero-Downtime Student Utilities</h2></div></div><div className="utility-grid">{utilities.map(({ icon: Icon, title, badge, body, foot }) => <article className="utility-card" key={title}><div className="utility-card__top"><span><Icon size={22} /></span><b>{badge}</b></div><h3>{title}</h3><p>{body}</p><small>{foot}</small></article>)}</div></section>

            <section className="hostel-section"><div className="section-heading section-heading--wrap"><div><BedDouble size={22} /><h2>Floor 2 - Room 204 Bed Selector</h2></div><p>4-Bed Deluxe Female En-suite • Click a bed to inspect roommate compatibility & position</p><div className="floor-tabs"><button type="button" className="is-selected">Floor 2 (Quiet Study Wing)</button><button type="button">Floor 1 (Fully Booked)</button></div></div><div className="bed-grid">{(Object.keys(bedDetails) as BedId[]).map((id) => { const bed = bedDetails[id]; const isSelected = id === selectedBed; return <button type="button" className={`bed-card bed-card--${bed.status.toLowerCase().replaceAll(' ', '-')}${isSelected ? ' is-selected' : ''}`} key={id} onClick={() => setSelectedBed(id)}><div className="bed-card__header"><div className="bed-id">{id}</div><div><strong>{bed.name}</strong><small>{bed.note}</small></div><span>{bed.status}</span></div><div className="bed-card__detail">{id === 'A' ? <><b>SM</b><span>{bed.body}<small>{bed.meta}</small></span></> : <><span>{bed.body}</span><span>{bed.meta}</span></>}</div><div className="bed-card__footer">{id === 'A' ? 'Reserved through July 2026' : id === 'B' ? 'Instant Escrow Hold' : id === 'C' ? 'Move-in: Oct 2025' : <><b>TZS 280,000</b> / semester</>}</div></button> })}</div><div className="lease-picker"><strong>Select Your Academic Lease Term:</strong><label className={lease === 'semester' ? 'is-selected' : ''}><input type="radio" checked={lease === 'semester'} onChange={() => setLease('semester')} /> <span><b>1 Academic Semester</b><small>5 Months Continuous Stay</small></span><strong>TZS 280,000</strong></label><label className={lease === 'year' ? 'is-selected' : ''}><input type="radio" checked={lease === 'year'} onChange={() => setLease('year')} /> <span><b>Full Academic Year</b><small>10 Months (Semester 1 & 2)</small></span><strong>TZS 520,000</strong></label></div></section>

            <section className="hostel-section"><div className="section-heading"><div><CircleAlert size={22} /><h2>Hostel Standards & Community Life</h2></div></div><div className="rules-grid"><article className="rules-card"><h3>Included Facilities</h3><ul><li><Droplets size={16} /> <span><b>Laundry Balcony:</b> Twin heavy-duty washing sinks + coin-op high-speed spin dryer.</span></li><li><Utensils size={16} /> <span><b>Induction Cooking:</b> Safe smokeless stoves with individually tagged food lockers.</span></li><li><ShieldCheck size={16} /> <span><b>Professional Janitor:</b> Common areas cleaned daily; en-suite sanitized twice weekly.</span></li><li><Home size={16} /> <span><b>Bicycle & Scooter Bay:</b> Covered ground rack with security anchor chains.</span></li></ul></article><article className="rules-card"><h3>Community Conduct Rules</h3><ul><li><Bell size={16} /> <span><b>Main Gate Lock:</b> 11:30 PM sharp nightly. Late study library pass requires prior SMS.</span></li><li><VolumeX size={16} /> <span><b>Quiet Hours:</b> 10:00 PM - 6:00 AM observed across all residence floors.</span></li><li><ShieldCheck size={16} /> <span><b>Guest Policy:</b> Day visitors allowed in ground study lounge only until 8:00 PM.</span></li><li><CircleAlert size={16} /> <span><b>Zero Tolerance:</b> 100% smoke-free and alcohol-free learning environment.</span></li></ul></article></div><div className="caretaker-card"><div className="caretaker-avatar">BB</div><div><h3>Bahati B. <small>(On-Duty Caretaker)</small></h3><p>Hostel Warden & Facilities Head • Office located in Ground Block C</p><span>● On-Duty Today &nbsp; Speaks Swahili & English</span></div><div className="caretaker-actions"><a href="tel:+255712345678"><Phone size={15} /> Call Caretaker</a><a href="https://wa.me/255712345678"><ExternalLink size={15} /> WhatsApp Bahati</a></div></div></section>
          </div>

          <aside className="hostel-sidebar"><section className="escrow-card" id="escrow"><div className="escrow-card__topline" /><div className="escrow-card__title"><span>ROOM 204 • LOWER BUNK {selectedBed}</span><b>Instant Hold</b></div><div className="escrow-price">TZS 280,000 <small>/ sem</small></div><p>Covers 5 months (Nov 2025 - Mar 2026)</p><div className="ledger"><div><span>Room Bed Rent (1 Semester)</span><b>TZS 280,000</b></div><div><span>Caution / Security Deposit <Info size={13} /></span><b>TZS 50,000</b></div><div><span>Water, 100M Fiber & Trash</span><b className="green">FREE (Inclusive)</b></div><div><span>Agency & Broker Search Fee</span><b>TZS 0 (Direct)</b></div><hr /><div className="ledger-total"><span>Total to Lock Space:</span><b>{total}</b></div></div><div className="escrow-trust"><WalletCards size={21} /><span><b>Bank of Tanzania (BOT) Escrow Protected</b><small>Funds remain locked in custodial trust. Released to hostel owner only after you inspect and check into Room 204.</small></span></div><span className="gateway-label">Accepted Direct Gateways:</span><div className="gateway-grid"><b>M-Pesa</b><b>Airtel</b><b>Tigo Pesa</b><b>CRDB/NMB</b></div><button className="escrow-cta" type="button" onClick={() => alert(`Reservation started for Bed ${selectedBed}`)}>Reserve Bed {selectedBed} via BOT Escrow <ArrowRight size={18} /></button><button className="walkthrough-button" type="button"><Phone size={16} /> Request Live WhatsApp Video Walkthrough</button><div className="refund-note"><Check size={14} /> 100% Refund guarantee if room does not match photos</div></section><section className="map-card"><div><b>Campus Proximity Map</b><a href="https://maps.google.com/?q=Msewe+Road+Dar+es+Salaam" target="_blank" rel="noreferrer">Open Full Map</a></div><div className="map-placeholder"><MapPin size={24} /><span>Msewe UDSM Gate (900m)</span></div><p>Paved walking path illuminated with solar road lanterns direct to Yombo LT 1-5.</p></section></aside>
        </div>
      </main>

      <footer className="hostel-footer"><strong>FLX Real Estate - Pangisha, nunua, kaa from anywhere</strong><span>Secured transactions powered by Bank of Tanzania escrow protocols.</span><small>© 2025 FLX Realty Ltd. Dar es Salaam, Tanzania. All rights reserved.</small></footer>
      {showGallery && <div className="hostel-lightbox" role="dialog" aria-modal="true" onClick={() => setShowGallery(false)}><button type="button" aria-label="Close gallery" onClick={() => setShowGallery(false)}><X size={22} /></button><img src={galleryImages[0]} alt="Mlimani hostel gallery" /><span>Room 204 Main View</span></div>}
    </div>
  );
}
