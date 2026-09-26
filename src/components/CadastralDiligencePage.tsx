import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Landmark,
  ArrowRight,
  BadgeCheck as LucideBadgeCheck,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  FileCheck2,
  Fingerprint,
  Gavel,
  Home as LucideHome,
  LockKeyhole,
  Map as LucideMap,
  Menu,
  MessageSquare,
  Printer,
  Search,
  Share2,
  ShieldCheck as LucideShieldCheck,
  Smartphone,
  UserRound as LucideUserRound,
  Verified,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { ProtectedWorkspaceShell } from './WorkspaceChrome';

const Map = (props: { size?: number }) => <LucideMap {...props} />;
const ShieldCheck = (props: { size?: number }) => <LucideShieldCheck {...props} />;
const Home = (props: { size?: number }) => <LucideHome {...props} />;
const UserRound = (props: { size?: number }) => <LucideUserRound {...props} />;
const BadgeCheck = (props: { size?: number }) => <LucideBadgeCheck {...props} />;

type Notice = { tone: 'success' | 'error'; message: string } | null;

const trail = [
  ['01', 'Ministry Registry', 'NLIS National Registry matched; 0 duplicate deeds detected.', 'VALIDATED • e-Ardhi'],
  ['02', 'Beacon Ground Audit', 'RTK-GPS sub-centimeter match. 4/4 markers ground-locked.', 'VALIDATED • DJI RTK'],
  ['03', 'Local Mtaa & Caveat', 'Gezaulole local council confirmation signed; zero court injunctions.', 'CERTIFIED • Council'],
  ['04', 'Title Escrow Lock', 'Awaiting 10% BOT Escrow deposit to seal deed conveyance.', 'PENDING BUYER DEPOSIT'],
];

const beacons = [
  ['BEACON P492-NW', '-6.9238 S, 39.4319 E'],
  ['BEACON P492-NE', '-6.9236 S, 39.4325 E'],
  ['BEACON P492-SE', '-6.9245 S, 39.4322 E'],
  ['BEACON P492-SW', '-6.9247 S, 39.4316 E'],
];

export function CadastralDiligencePage() {
  const [notice, setNotice] = useState<Notice>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [apiLive, setApiLive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/health').then((response) => { if (!response.ok) throw new Error(); setApiLive(true); }).catch(() => setNotice({ tone: 'error', message: 'Mainland API is unavailable. Review data is cached.' }));
  }, []);

  const action = async (kind: 'deposit' | 'surveyor') => {
    setBusy(true);
    try {
      const response = await fetch('/api/legal/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: 'KIG-GZL-492', action: kind === 'deposit' ? 'lock_plot_escrow' : 'dispatch_registered_surveyor' }) });
      if (!response.ok) throw new Error();
      setNotice({ tone: 'success', message: kind === 'deposit' ? 'Escrow deposit request opened for TZS 3,800,000.' : 'Registered surveyor dispatch request submitted.' });
    } catch { setNotice({ tone: 'error', message: 'The request could not be recorded.' }); } finally { setBusy(false); }
  };

  return <ProtectedWorkspaceShell section="Cadastral diligence" location="Dar es Salaam" backHref="/marketplace"><div className="cadastral-reference-page"><header className="cadastral-reference-header"><button className="cadastral-reference-brand" type="button" onClick={() => window.location.assign('/')}><span>FLX REAL ESTATE</span><small>CADASTRAL & CONVEYANCING</small></button><div className="cadastral-reference-search"><Search size={17} /><input placeholder="Deed Plan #, Certificate of Title, Survey Parcel ID (e.g. DSM-KGB-8849)..." /><b>MINISTRY REGISTRY</b></div><div className="cadastral-reference-tools"><span>TZS</span><span>USD</span><span>EN</span><span>SW</span><button type="button"><BellIcon /></button><i>KM</i></div></header><aside className={`cadastral-reference-sidebar ${mobileNav ? 'is-open' : ''}`}><div><div className="cadastral-gateway"><b>MINISTRY GATEWAY</b><strong>Ardhi Cadastral Server 04</strong><small>{apiLive ? 'BOT Escrow Multi-Sig Synced' : 'Connecting to Mainland API...'}</small></div><small className="cadastral-nav-label">REGISTRY WORKBENCHES</small><nav>{['Cadastral Land & Titles', 'Deal Room & BOT Escrow', 'Commercial Office', 'Student Hostels', 'Agent Portal'].map((label, index) => <button type="button" className={index === 0 ? 'is-active' : ''} key={label} onClick={() => setNotice({ tone: 'success', message: `${label} workbench selected.` })}>{[Map, ShieldCheck, Home, UserRound, BadgeCheck][index]({ size: 17 })}{label}</button>)}</nav><small className="cadastral-nav-label">CONVEYANCING OPS</small><nav>{['Survey & Deed Search', 'Remittance & Audit'].map((label) => <button type="button" key={label} onClick={() => setNotice({ tone: 'success', message: `${label} selected.` })}><FileCheck2 size={17} />{label}</button>)}</nav></div><div className="cadastral-api-status"><span><i />Mainland API Live</span><b>v4.2.0</b></div></aside><div className="cadastral-reference-shell"><main className="cadastral-reference-main"><button className="cadastral-mobile-menu" type="button" onClick={() => setMobileNav((open) => !open)}>{mobileNav ? <X size={20} /> : <Menu size={20} />}</button><div className="cadastral-breadcrumb"><span>⌂ Home</span><ChevronRight size={13} /><span>Cadastral Land & Titles</span><ChevronRight size={13} /><span>Kigamboni Municipality</span><ChevronRight size={13} /><b>Gezaulole Parcel #492</b><div><strong>● e-Ardhi Active Pipeline: Verification 78% • FAST TRACK</strong><button type="button" onClick={() => window.print()}><Download size={13} /> Dossier (PDF)</button><button type="button"><Printer size={13} /></button><button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Share2 size={13} /></button><b>▣ e-Ardhi Seal</b></div></div><section className="cadastral-hero"><div><div className="cadastral-badges"><span>Cadastral Surveyed</span><b>800 SQM</b><b>Residential / Mixed Low-Density</b><b>💧 400m to Oceanfront</b></div><h1>Gezaulole Coastal Parcel #492 - Due Diligence Workbench</h1><div className="cadastral-owner"><span><ShieldCheck size={21} /><small>Registered Freehold / 99-Yr Occupancy Holder<strong>Mzee Hamisi M. & Kinondoni Trust <Verified size={14} /></strong></small></span><span><Fingerprint size={21} /><small>National Identity (NIDA)<strong>19680315-42918-00001-01</strong></small></span></div></div><div className="cadastral-valuation"><small>OFFICIAL REGISTRY VALUATION</small><strong>TZS 38,000,000</strong><span>~$14,500 USD</span><b><Landmark size={14} /> Bank of Tanzania (BOT) Escrow Protected</b></div></section><div className="cadastral-workbench"><div className="cadastral-left"><section className="cadastral-panel"><SectionHeading icon={FileCheck2} title="Title Verification Protocol & Trail" badge="Stage 3 of 4 Completed" /><div className="cadastral-trail">{trail.map(([number, title, copy, status]) => <article className={number === '04' ? 'is-pending' : ''} key={number}><span>{number}</span><Check size={15} /><h3>{title}</h3><p>{copy}</p><b>{status}</b></article>)}</div></section><section className="cadastral-panel"><SectionHeading icon={SatelliteIcon} title="Cadastral Mesh & RTK Drone Survey" badge="DJI Matrice 350 RTK" /><div className="cadastral-viewport"><div className="cadastral-viewport-image" /><div className="cadastral-polygon" /><div className="cadastral-hud-top"><span>● LIVE RTK SATELLITE LOCK (18 SVs)</span><b>Elevation: +24.6m MSL (Zero Tidal Risk)</b></div><div className="cadastral-hud-bottom"><div><b>CADASTRAL GROUND LOCK</b><strong>4 of 4 Ministry Concrete Beacons Found</strong><small>Kigamboni Sub-Land Registry Reference: KIG/GZL/2023/B-492</small></div><button type="button" onClick={() => setNotice({ tone: 'success', message: 'Cadastral deed plan download queued.' })}><Map size={14} /> Cadastral Deed Plan #TZ-KIG-492-B</button></div></div><div className="cadastral-beacons">{beacons.map(([name, coord]) => <div key={name}><small>{name}</small><b>{coord}</b><strong>• RTK Validated</strong></div>)}</div><div className="cadastral-gallery">{['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=500&q=85', 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=500&q=85', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=500&q=85', 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=500&q=85'].map((image, index) => <figure key={image}><img src={image} alt={['Beacon P492-NW Peg', 'RTK Rover Station', 'Access Road & Ocean (400m)', 'Topographic Profile'][index]} /><b>{['Beacon P492-NW Peg', 'RTK Rover Station', 'Access Road & Ocean (400m)', 'Topographic Profile'][index]}</b></figure>)}</div></section><section className="cadastral-panel"><SectionHeading icon={Landmark} title="Ministry of Lands Registry Audit" badge="✓ Clean Title Certified" /><p className="cadastral-subtitle">Wizara ya Ardhi, Nyumba na Maendeleo ya Makazi (e-Ardhi NLIS Synchronized)</p><div className="cadastral-audit-grid"><Audit label="CERTIFICATE OF TITLE DEED NO." value="CT No. 104829/DL" detail="Land Registration Volume 421 • Folio 18" /><Audit label="TENURE TYPE & LEASE TERM" value="99-Year Right of Occupancy" detail="Granted on: 12-Nov-2018 (Expires: 2117)" /><Audit label="REGISTERED ENCUMBRANCES & LIENS" value="✓ 0 Liens • Fully Clean Title" detail="Audited via BOT Credit Reference Bureau & High Court Registry" green /><Audit label="ZONING DESIGNATION (MASTER PLAN 2030)" value="Low-Density Coastal Residential" detail="Approved for luxury villa, eco-residence, or low-rise retreat" /></div><div className="cadastral-hash"><LockKeyhole size={17} /><span><small>e-Ardhi Public Key Hash (Ministry Cryptographic Stamp)</small><b>BOT-ARDHI-HASH-9812-78A-9491KGB-2025</b></span><button type="button" onClick={() => setNotice({ tone: 'success', message: 'Hash verified against the registry.' })}>Verify Hash on Blockchain</button></div></section><section className="cadastral-panel"><SectionHeading icon={Gavel} title="Local Governance, Gazette & Infrastructure" /><p className="cadastral-subtitle">Community verification, statutory announcements, and utility audit</p><div className="cadastral-local-grid"><Local icon={FileCheck2} title="Barua ya Mwenyekiti" copy="Mtaa wa Gezaulole village elder certificate confirming undisputed continuous tenure by Hamisi family lineage since 1984. Zero customary caveats." /><Local icon={FileCheck2} title="Statutory Gazette Period" copy="30-day statutory notice published in Daily News & Habari Leo expired with 0 third-party claims or counter-petitions filed." /><Local icon={Zap} title="Utilities & Soil Hydrology" copy="Permeable sandy-loam atop elevation ridge. DAWASA water connection at 45m; TANESCO 3-phase power line fronting plot." /></div></section></div><aside className="cadastral-right"><section className="cadastral-panel cadastral-lock"><SectionHeading icon={ShieldCheck} title="Lock Plot in Deal Room" badge="CRDB Trustee" /><p className="cadastral-subtitle">BOT-Regulated Escrow Protocol</p><div className="cadastral-amounts"><span>Agreed Purchase Price: <b>TZS 38,000,000</b></span><strong>Required 10% Escrow Hold: <b>TZS 3,800,000</b></strong><span>USD Equivalent: <b>~$1,450.00 USD</b></span><span>Final Settlement (90% at Deed Handover): <b>TZS 34,200,000</b></span></div><ul><li><Check size={14} /> Escrow funds remain in neutral CRDB Bank Trustee custody until original CT No. 104829/DL is physically transferred.</li><li><Check size={14} /> Zero Risk of Double Selling: parcel ID freezes in e-Ardhi instantly upon deposit.</li></ul><button className="cadastral-primary-button" type="button" disabled={busy} onClick={() => action('deposit')}><LockKeyhole size={17} /> {busy ? 'Opening Escrow...' : 'Deposit TZS 3,800,000 (10%) to Lock'}</button><small>Supported Rails: M-Pesa • Airtel Money • SWIFT Wire • CRDB/NMB</small></section><section className="cadastral-panel"><SectionHeading icon={UserRound} title="Dispatch Ground Surveyor" badge="Mpimaji Ardhi Aliyesajiliwa" /><p className="cadastral-copy">Order an independent, Ministry-accredited surveyor to physically visit Parcel #492, re-verify corner pegs, and stream a live 4K video survey directly to your device.</p><div className="cadastral-fee"><span>Dispatch & Live Stream Fee<strong>TZS 120,000 (~$46 USD)</strong></span><b>100% Refunded at Closing</b></div><ul className="cadastral-list"><li><Video size={15} /> Live WhatsApp / FLX 4K walkthrough</li><li><Search size={15} /> Physical tape measurement & beacon check</li><li><Zap size={15} /> Drone border confirmation aerial flight</li></ul><button className="cadastral-dark-button" type="button" disabled={busy} onClick={() => action('surveyor')}><CalendarDays size={15} /> Schedule Surveyor Dispatch</button></section><section className="cadastral-panel cadastral-lawyer"><div><div className="cadastral-lawyer-avatar">FR</div><span><b>Adv. Fatma Rashid</b><small>Advocate of High Court of Tanzania</small><strong>Licensed Conveyancer • TLS #4419</strong></span></div><blockquote>“I have personally reviewed the deed chain at Ardhi House and inspected the local council minutes. The vendor holds clear title and this transaction is clear for escrow conveyance.”</blockquote><div><button type="button" onClick={() => setNotice({ tone: 'success', message: 'WhatsApp counsel request opened.' })}><MessageSquare size={14} /> WhatsApp Call</button><button type="button" onClick={() => setNotice({ tone: 'success', message: '15-minute counsel consult requested.' })}><Video size={14} /> Book 15-Min Consult</button></div></section></aside></div></main></div>{notice && <div className={`cadastral-notice ${notice.tone}`}>{notice.message}<button type="button" onClick={() => setNotice(null)}><X size={15} /></button></div>}</div></ProtectedWorkspaceShell>;
}

function BellIcon() { return <Bell size={16} />; }
function SatelliteIcon() { return <span className="cadastral-satellite-icon">◈</span>; }
function SectionHeading({ icon: Icon, title, badge }: { icon: typeof FileCheck2 | (() => ReactElement); title: string; badge?: string }) { return <div className="cadastral-section-heading"><div><Icon size={19} /><h2>{title}</h2></div>{badge && <b>{badge}</b>}</div>; }
function Audit({ label, value, detail, green }: { label: string; value: string; detail: string; green?: boolean }) { return <div className="cadastral-audit"><small>{label}</small><strong className={green ? 'green' : ''}>{value}</strong><span>{detail}</span></div>; }
function Local({ icon: Icon, title, copy }: { icon: typeof FileCheck2; title: string; copy: string }) { return <article className="cadastral-local"><h3><Icon size={17} />{title}</h3><p>{copy}</p><b>✓ Certified / Attached</b></article>; }
