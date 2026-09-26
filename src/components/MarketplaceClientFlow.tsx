import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Menu, MapPin, Search, X } from 'lucide-react';
import { RealEstateLeafletMap } from './RealEstateLeafletMap';
import { parseMarketplacePrice } from './MarketplaceReferencePage';
import type { Property } from '../types';
import './marketAccount.css';

type ListingType = 'Student Living' | 'Commercial' | 'Land' | 'Residential';
type ClientIntent = 'Buy' | 'Rent';
type Listing = {
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
  type: ListingType;
  intent: ClientIntent;
  lat: number | null;
  lng: number | null;
};

type RequestForm = {
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  consent: boolean;
};

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
};

const categories: Array<{ label: string; type: ListingType | null }> = [
  { label: 'All properties', type: null },
  { label: 'Student living', type: 'Student Living' },
  { label: 'Commercial', type: 'Commercial' },
  { label: 'Land', type: 'Land' },
  { label: 'Residential', type: 'Residential' },
];

const getListingType = (row: Record<string, unknown>): ListingType => {
  const title = String(row.title ?? '').toLowerCase();
  const period = String(row.period ?? '').toLowerCase();
  if (/hostel|student/.test(title)) return 'Student Living';
  if (/office|tower|commercial/.test(title)) return 'Commercial';
  if (/parcel|land|plot/.test(`${title} ${period}`)) return 'Land';
  return 'Residential';
};

const normalizeListing = (row: Record<string, unknown>, index: number): Listing => {
  const title = String(row.title ?? `Property ${index + 1}`);
  const type = getListingType(row);
  const price = String(row.price ?? '');
  const period = String(row.period ?? '');
  const image = String(row.image ?? row.thumbnail_url ?? '');
  let extraImages: string[] = [];
  if (Array.isArray(row.images)) extraImages = row.images.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  if (typeof row.images === 'string') {
    try {
      const parsed: unknown = JSON.parse(row.images);
      if (Array.isArray(parsed)) extraImages = parsed.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
    } catch {
      extraImages = [];
    }
  }
  const isRental = type !== 'Land' && /\/(?:mo|sem)|per\s+(?:month|semester|week|night)|\bsemester\b/i.test(`${price} ${period}`);
  const lat = Number(row.lat ?? row.latitude);
  const lng = Number(row.lng ?? row.longitude);
  return {
    id: Number(row.id ?? index + 1),
    title,
    city: String(row.city ?? ''),
    price: price.replace('/sem', '').replace('/mo', ''),
    period,
    image,
    images: [...new Set([image, ...extraImages].filter(Boolean))],
    videoUrl: String(row.video_url ?? ''),
    badge: String(row.badge ?? type),
    tag: String(row.tag ?? ''),
    verification: String(row.verification ?? ''),
    description: String(row.description ?? ''),
    status: String(row.status ?? 'Status unavailable'),
    type,
    intent: isRental ? 'Rent' : 'Buy',
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
};

const toMapProperty = (listing: Listing): Property => ({
  id: String(listing.id),
  created_at: '',
  title: listing.title,
  property_type: listing.intent === 'Buy' ? 'Invest' : 'Live',
  status: 'Approved',
  price: parseMarketplacePrice(listing.price),
  video_url: listing.videoUrl,
  thumbnail_url: listing.image,
  images: listing.images,
  location: {
    lat: listing.lat ?? 0,
    lng: listing.lng ?? 0,
    address: listing.city,
    city: listing.city,
    state: 'Tanzania',
    zip: '',
  },
  agent: { id: 'flx-team', name: 'FLX Field Team', avatar: '', phone: '', email: '', license: '', role: 'Agent' },
  metadata: { beds: 0, baths: 0, sqft: 0 },
  description: listing.description,
});

const isRequestable = (listing: Listing) => !/sold|full|unavailable|occupied|leased/i.test(listing.status);

export function MarketplaceClientFlow() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  const [activeCategory, setActiveCategory] = useState<ListingType | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'inventory' | 'price'>('inventory');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestForm>({ name: '', email: '', phone: '', preferredDate: '', consent: false });
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>({ name: '', email: '', phone: '', message: '', consent: false });
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

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
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected]);

  const visibleListings = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = listings.filter((listing) => {
      const matchesCategory = !activeCategory || listing.type === activeCategory;
      const matchesSearch = !search || `${listing.title} ${listing.city} ${listing.type} ${listing.tag}`.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
    return [...filtered].sort((left, right) => sort === 'price'
      ? parseMarketplacePrice(left.price) - parseMarketplacePrice(right.price)
      : left.id - right.id);
  }, [activeCategory, listings, query, sort]);

  const mapProperties = useMemo(() => visibleListings
    .filter((listing) => listing.lat !== null && listing.lng !== null)
    .map(toMapProperty), [visibleListings]);

  const openDetails = (listing: Listing) => {
    setSelected(listing);
    setActivePhoto(0);
    setShowVideo(false);
    setRequestMessage('');
    setRequestError('');
    setRequestForm({ name: '', email: '', phone: '', preferredDate: '', consent: false });
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !requestForm.consent || isSubmitting) return;
    setIsSubmitting(true);
    setRequestError('');
    setRequestMessage('');
    try {
      const response = await fetch(`/api/properties/${selected.id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: requestForm.name.trim(),
          client_email: requestForm.email.trim(),
          client_phone: requestForm.phone.trim(),
          intent: selected.intent,
          preferred_date: requestForm.preferredDate ? new Date(requestForm.preferredDate).toISOString() : null,
          consent: requestForm.consent,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Request could not be recorded.');
      setRequestMessage(payload.message || 'Request recorded for FLX review.');
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Request could not be recorded.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRequestForm = (field: keyof RequestForm, value: string | boolean) => {
    setRequestForm((current) => ({ ...current, [field]: value }));
  };

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (contactBusy || !contactForm.consent) return;
    setContactBusy(true);
    setContactError('');
    setContactSuccess('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: contactForm.name.trim(),
          client_email: contactForm.email.trim(),
          client_phone: contactForm.phone.trim(),
          message: contactForm.message.trim(),
          consent: contactForm.consent,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Your message could not be sent.');
      setContactSuccess('Message sent to the FLX team. No reservation or payment has been created.');
      setContactForm({ name: '', email: '', phone: '', message: '', consent: false });
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Your message could not be sent.');
    } finally {
      setContactBusy(false);
    }
  };

  const heroImage = listings.find((listing) => listing.image)?.image;

  return <div className="market-reference-page market-landing-page">
    <header className="market-reference-header market-landing-header">
      <a className="market-reference-brand" href="#home" onClick={() => setIsMenuOpen(false)}><span>FLX</span> Real Estate</a>
      <div className="market-reference-location"><MapPin size={14} /><span><small>ZONE</small>Dar es Salaam</span></div>
      <button className="market-reference-menu-toggle" type="button" aria-expanded={isMenuOpen} aria-controls="market-reference-nav" aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setIsMenuOpen((open) => !open)}>{isMenuOpen ? <X size={18} /> : <Menu size={18} />}</button>
      <nav id="market-reference-nav" className={isMenuOpen ? 'is-open' : ''} aria-label="Main navigation">
        {[['Home', '#home'], ['About us', '#about'], ['Properties', '#properties'], ['Map', '#map'], ['Contact us', '#contact']].map(([label, target]) => <a key={target} href={target} onClick={() => setIsMenuOpen(false)}>{label}</a>)}
      </nav>
      <a className="market-landing-header-cta" href="#properties" onClick={() => setIsMenuOpen(false)}>Explore properties</a>
    </header>

    <main>
      <section className="market-landing-hero" id="home">
        {heroImage && <img className="market-landing-hero-image" src={heroImage} alt="Featured property from the current FLX inventory" />}
        <div className="market-landing-hero-copy"><span className="market-landing-eyebrow">FLX REAL ESTATE · DAR ES SALAAM</span><h1>Find a place for your next move.</h1><p>Explore current property listings, view their locations, and contact the FLX team about availability.</p><div className="market-landing-hero-actions"><a className="market-landing-button is-primary" href="#properties">Browse properties <ArrowRight size={16} /></a><a className="market-landing-button" href="#about">About FLX</a></div><small>{isLoading ? 'Loading live inventory…' : `${listings.length} properties currently listed`}</small></div>
        <a className="market-landing-scroll-cue" href="#about">Discover FLX <span aria-hidden="true">↓</span></a>
      </section>

      <section className="market-landing-about" id="about" aria-labelledby="market-about-title">
        <div><span className="market-landing-eyebrow">ABOUT US</span><h2 id="market-about-title">Property search, grounded in local detail.</h2></div>
        <div><p>FLX brings property listings and location context together for people looking to buy or rent in Tanzania. The available inventory below comes from property records maintained by the FLX team.</p><p>Listing details and map coordinates are shown only when recorded. An inquiry asks the team to confirm availability; it does not reserve a property or collect payment.</p><a href="#contact">Talk to the FLX team <ArrowRight size={15} /></a></div>
      </section>

      <section className="market-landing-properties" id="properties" aria-labelledby="market-results-title">
        <div className="market-landing-section-heading"><div><span className="market-landing-eyebrow">AVAILABLE PROPERTIES</span><h2 id="market-results-title">Find your place</h2><p>{isLoading ? 'Loading live inventory…' : `${visibleListings.length} matching properties from ${listings.length} live records`}</p></div><a href="#map">View property map <MapPin size={15} /></a></div>
        <section className="market-reference-search market-landing-search" aria-label="Property search">
          <label><Search size={16} /><span className="visually-hidden">Search properties</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by property, area, or type" /></label>
          <label className="market-reference-sort">Sort<select value={sort} onChange={(event) => setSort(event.target.value as 'inventory' | 'price')}><option value="inventory">Inventory order</option><option value="price">Price: low to high</option></select></label>
        </section>
        <div className="market-reference-categories" role="group" aria-label="Filter property type">
          {categories.map((category) => {
            const count = category.type ? listings.filter((listing) => listing.type === category.type).length : listings.length;
            return <button key={category.label} type="button" className={activeCategory === category.type ? 'is-active' : ''} aria-pressed={activeCategory === category.type} onClick={() => setActiveCategory(category.type)}>{category.label}<b>{count}</b></button>;
          })}
          {(activeCategory || query) && <button type="button" className="market-landing-clear-filter" onClick={() => { setActiveCategory(null); setQuery(''); }}>Clear filters</button>}
        </div>
        {inventoryError && <div className="market-reference-state is-error" role="alert"><strong>Inventory unavailable</strong><span>{inventoryError}. Refresh to try again.</span></div>}
        {!isLoading && !inventoryError && visibleListings.length === 0 && <div className="market-reference-state"><strong>{listings.length ? 'No matching properties' : 'No properties published yet'}</strong><span>{listings.length ? 'Change the search or property type filter.' : 'FLX agents will publish field listings here.'}</span></div>}
        <div className="market-landing-listings">
          {visibleListings.map((listing, index) => <article className="market-reference-listing" key={listing.id} style={{ animationDelay: `${index * 75}ms` }}>
            <button className="market-reference-listing-image" type="button" onClick={() => openDetails(listing)} aria-label={`View details for ${listing.title}`}>
              {listing.image ? <img src={listing.image} alt={listing.title} loading="lazy" /> : <span className="market-reference-no-media">No property photo</span>}
              <span>{listing.badge}</span><small>{listing.city}</small>
            </button>
            <div className="market-reference-listing-copy">
              <div className="market-reference-listing-topline"><span>{listing.type} · {listing.status}</span><strong>{listing.price}<small>{listing.period}</small></strong></div>
              <h3>{listing.title}</h3>
              {listing.verification && <div className="market-reference-tags"><span>{listing.verification}</span></div>}
              {listing.tag && <p>{listing.tag}</p>}
              <div className="market-reference-listing-actions"><button type="button" onClick={() => openDetails(listing)}>View details</button><button type="button" className="is-primary" disabled={!isRequestable(listing)} onClick={() => openDetails(listing)}>Ask to {listing.intent.toLowerCase()}</button></div>
            </div>
          </article>)}
        </div>
      </section>

      <section className="market-landing-map-section" id="map" aria-labelledby="market-map-title">
        <div className="market-landing-section-heading"><div><span className="market-landing-eyebrow">PROPERTY LOCATIONS</span><h2 id="market-map-title">Explore the map</h2><p>Only listings with recorded coordinates appear here.</p></div></div>
        <div className="market-landing-map-layout">
          <div className="market-landing-map-canvas">{mapProperties.length ? <RealEstateLeafletMap properties={mapProperties} selectedProperty={selected ? toMapProperty(selected) : null} onSelectProperty={(property) => { const listing = listings.find((item) => String(item.id) === property.id); if (listing) openDetails(listing); }} onOpenDetails={(property) => { const listing = listings.find((item) => String(item.id) === property.id); if (listing) openDetails(listing); }} userLocation={null} /> : <div className="market-reference-map-empty">No property coordinates are available.</div>}</div>
          <div className="market-landing-map-list"><strong>{mapProperties.length} mapped properties</strong>{visibleListings.filter((listing) => listing.lat !== null && listing.lng !== null).map((listing) => <button type="button" key={listing.id} onClick={() => openDetails(listing)}><span><b>{listing.title}</b><small>{listing.city}</small></span><MapPin size={16} /></button>)}</div>
        </div>
      </section>

      <section className="market-landing-contact" id="contact" aria-labelledby="market-contact-title">
        <div className="market-landing-contact-copy"><span className="market-landing-eyebrow">CONTACT US</span><h2 id="market-contact-title">Let’s find the right next step.</h2><p>Send a question to the FLX team. We’ll review your message and contact you using the details you provide.</p><p className="market-landing-contact-note">Contact requests do not reserve a property or initiate payment.</p></div>
        <form className="market-landing-contact-form" onSubmit={submitContact}>
          <label>Your name<input autoComplete="name" value={contactForm.name} onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label>Email<input type="email" autoComplete="email" value={contactForm.email} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Phone<input type="tel" autoComplete="tel" value={contactForm.phone} onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label className="market-landing-message-field">How can we help?<textarea rows={4} value={contactForm.message} onChange={(event) => setContactForm((current) => ({ ...current, message: event.target.value }))} required /></label>
          <label className="market-landing-contact-consent"><input type="checkbox" checked={contactForm.consent} onChange={(event) => setContactForm((current) => ({ ...current, consent: event.target.checked }))} required /> I consent to FLX using these details to respond to my message.</label>
          <button type="submit" disabled={contactBusy || !contactForm.consent || (!contactForm.email.trim() && !contactForm.phone.trim())}>{contactBusy ? 'Sending…' : 'Send message'} <ArrowRight size={15} /></button>
          {contactError && <p className="market-reference-request-error" role="alert">{contactError}</p>}
          {contactSuccess && <p className="market-reference-request-success" role="status">{contactSuccess}</p>}
        </form>
      </section>
    </main>

    <footer className="market-landing-footer"><a className="market-reference-brand" href="#home"><span>FLX</span> Real Estate</a><span>Property information from the FLX field team.</span><nav aria-label="Footer navigation"><a href="#about">About us</a><a href="#properties">Properties</a><a href="#map">Map</a><a href="#contact">Contact us</a></nav><small>Availability is confirmed by an agent before any transaction.</small></footer>

    {selected && <div className="market-reference-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section className="market-reference-modal market-reference-dossier" role="dialog" aria-modal="true" aria-labelledby="property-dossier-title">
        <header className="market-reference-dossier-header"><div><span>{selected.type} · {selected.status}</span><h2 id="property-dossier-title">{selected.title}</h2></div><button type="button" className="market-reference-modal-close" aria-label="Close property details" onClick={() => setSelected(null)}><X size={18} /></button></header>
        <div className="market-reference-media-tabs" role="tablist" aria-label="Property media">
          <button type="button" role="tab" aria-selected={!showVideo} onClick={() => setShowVideo(false)}>Photos ({selected.images.length})</button>
          <button type="button" role="tab" aria-selected={showVideo} disabled={!selected.videoUrl} onClick={() => setShowVideo(true)}>Video{selected.videoUrl ? '' : ' unavailable'}</button>
        </div>
        <div className="market-reference-dossier-media">
          {showVideo && selected.videoUrl ? <video src={selected.videoUrl} poster={selected.image || undefined} controls playsInline /> : selected.images.length ? <img src={selected.images[activePhoto]} alt={`${selected.title} property view ${activePhoto + 1}`} /> : <div className="market-reference-media-empty">No property photos have been uploaded.</div>}
        </div>
        {selected.images.length > 1 && !showVideo && <div className="market-reference-thumbnails">{selected.images.map((image, index) => <button key={`${image}-${index}`} type="button" className={activePhoto === index ? 'is-active' : ''} aria-label={`Show photo ${index + 1}`} onClick={() => setActivePhoto(index)}><img src={image} alt="" /></button>)}</div>}
        <div className="market-reference-dossier-grid">
          <section><h3>Property details</h3><p>{selected.description || 'No additional description has been recorded by the field team.'}</p><dl><dt>Location</dt><dd>{selected.city || 'Not recorded'}</dd><dt>Price</dt><dd>{selected.price} {selected.period}</dd><dt>Request type</dt><dd>{selected.intent}</dd><dt>Status</dt><dd>{selected.status}; confirm availability with an agent</dd></dl></section>
          <section><h3>Map location</h3>{selected.lat !== null && selected.lng !== null ? <div className="market-reference-dossier-map"><RealEstateLeafletMap properties={[toMapProperty(selected)]} selectedProperty={toMapProperty(selected)} onSelectProperty={() => undefined} onOpenDetails={() => undefined} userLocation={null} /></div> : <p className="market-reference-map-empty">This listing has no recorded coordinates.</p>}</section>
        </div>
        <section className="market-reference-request-section"><h3>Request to {selected.intent.toLowerCase()}</h3><p>This sends a request to the FLX team. It does not reserve the property or take payment.</p>
          {isRequestable(selected) ? <form className="market-reference-request-form" onSubmit={submitRequest}>
            <label>Name<input autoComplete="name" value={requestForm.name} onChange={(event) => updateRequestForm('name', event.target.value)} required /></label>
            <label>Email<input type="email" autoComplete="email" value={requestForm.email} onChange={(event) => updateRequestForm('email', event.target.value)} /></label>
            <label>Phone<input type="tel" autoComplete="tel" value={requestForm.phone} onChange={(event) => updateRequestForm('phone', event.target.value)} /></label>
            <label>Preferred contact date<input type="datetime-local" value={requestForm.preferredDate} onChange={(event) => updateRequestForm('preferredDate', event.target.value)} /></label>
            <label className="market-reference-consent"><input type="checkbox" checked={requestForm.consent} onChange={(event) => updateRequestForm('consent', event.target.checked)} required /> I consent to FLX sharing these details with its team to respond to this request.</label>
            <button className="is-primary" type="submit" disabled={isSubmitting || !requestForm.consent || (!requestForm.email.trim() && !requestForm.phone.trim())}>{isSubmitting ? 'Sending…' : `Request to ${selected.intent.toLowerCase()}`} <ArrowRight size={15} /></button>
          </form> : <p className="market-reference-state is-error">This listing is not accepting requests.</p>}
          {requestError && <p className="market-reference-request-error" role="alert">{requestError}</p>}
          {requestMessage && <p className="market-reference-request-success" role="status">{requestMessage}</p>}
        </section>
      </section>
    </div>}
  </div>;
}
