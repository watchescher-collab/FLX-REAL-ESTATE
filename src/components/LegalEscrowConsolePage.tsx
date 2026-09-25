import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Download,
  FileCheck2,
  Fingerprint,
  Gavel,
  History,
  Home,
  Landmark,
  LockKeyhole,
  Map,
  Menu,
  Printer,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  UserRound,
  VolumeX,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';

type Language = 'sw' | 'en';
type Rail = 'M-Pesa' | 'Tigo Pesa' | 'Airtel Money' | 'CRDB / NMB';
type Notice = { tone: 'success' | 'error'; message: string } | null;

const clauses = [
  { label: 'Kipengele 1 / Clause 1 • Utaratibu wa Kodi na Escrow', title: 'Malipo Kupitia BOT FLX Escrow Vault', icon: ShieldCheck, sw: 'Kodi yote ya chumba (TZS 280,000 kwa muhula wa miezi 5) pamoja na amana ya tahadhari (TZS 50,000) zitalipwa kupitia mfumo rasmi wa FLX Escrow Vault unaodhibitiwa na Benki Kuu ya Tanzania (BOT). Fedha hazitatolewa kwa mwenye nyumba hadi pale mpangaji atakapofika Sinza Kijiweni, kukagua chumba 204-B, na kupiga scan ya QR Check-in.', en: 'All semester rental fees (TZS 280,000 for a 5-month term) and the refundable security deposit (TZS 50,000) remain locked inside the BOT-regulated FLX Escrow Vault until verified physical check-in.' },
  { label: 'Kipengele 2 / Clause 2 • Utulivu wa Masomo na Jamii', title: 'Muda wa Utulivu na Sheria za Mazingira (22:00 - 06:00)', icon: VolumeX, sw: 'Hosteli hii ipo karibu na Chuo Kikuu cha Dar es Salaam (UDSM). Muda wa ukimya kamili unalindwa kuanzia saa nne usiku (22:00) hadi saa kumi na mbili asubuhi (06:00) kwa ajili ya masomo. Sauti za muziki na mikusanyiko inayovuruga wanafunzi wengine ni marufuku.', en: 'Mlimani Comfort Hostel enforces mandatory academic study quiet hours from 22:00 to 06:00. Sound equipment and loud gatherings that disrupt neighboring scholars constitute a breach of hostel tenancy regulations.' },
  { label: 'Kipengele 3 / Clause 3 • Amana ya Tahadhari (Caution Deposit)', title: 'Dhamana ya Kurejeshwa kwa Amana Ndani ya Saa 48', icon: LockKeyhole, sw: 'Amana ya TZS 50,000 itabaki kwenye FLX Trustee Vault muda wote wa upangishaji. Baada ya muhula kumalizika na ukaguzi wa chumba kukamilika bila uharibifu, amana itarudishwa kiotomatiki kwenye namba ya M-Pesa ya mpangaji ndani ya saa 48.', en: 'The TZS 50,000 caution deposit remains preserved in the FLX Trustee Account. Following a clean checkout inspection, the deposit is reversed to the tenant mobile-money account within 48 hours.' },
  { label: 'Kipengele 4 / Clause 4 • Umeme na Maji (LUKU & DAWASA)', title: 'Kipimo cha LUKU Kinaanza na Unit 142.6 kWh', icon: Zap, sw: 'Mwenye nyumba anathibitisha kuwa LUKU ya chumba 204-B inasoma 142.6 kWh wakati wa kuanza mkataba. Maji ya DAWASA yamejumuishwa kwenye kodi pamoja na pampu ya dharura ya kisima cha hosteli.', en: 'The meter baseline for Unit 204-B is locked at 142.6 kWh at agreement commencement. DAWASA municipal water and auxiliary borehole backup are covered without an additional monthly surcharge.' },
];

export function LegalEscrowConsolePage() {
  const [language, setLanguage] = useState<Language>('sw');
  const [rail, setRail] = useState<Rail>('M-Pesa');
  const [phone, setPhone] = useState('754 892 014');
  const [agreed, setAgreed] = useState(true);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [liveStatus, setLiveStatus] = useState('BOT Vault Connected');

  useEffect(() => {
    Promise.all([fetch('/api/health'), fetch('/api/agent/dashboard')]).then(async ([healthResponse, dealResponse]) => {
      if (!healthResponse.ok || !dealResponse.ok) throw new Error('Legal data unavailable');
      const health = await healthResponse.json();
      setLiveStatus(health.database === 'postgres' ? 'BOT Vault Connected' : 'Local Vault Connected');
    }).catch(() => setNotice({ tone: 'error', message: 'Live legal bridge unavailable. Review mode is still available.' }));
  }, []);

  const executeDeal = async () => {
    if (!agreed || !signed) {
      setNotice({ tone: 'error', message: 'Apply your NIDA signature and accept the agreement first.' });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/legal/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: 'FLX-8829-DAR', action: 'sign_and_fund_escrow', rail, phone }) });
      if (!response.ok) throw new Error('Escrow action failed');
      setNotice({ tone: 'success', message: `STK prompt sent to +255 ${phone} via ${rail}.` });
      setLiveStatus('STK Prompt Sent');
    } catch { setNotice({ tone: 'error', message: 'The escrow action could not be recorded.' }); } finally { setBusy(false); }
  };

  const share = async () => { if (navigator.share) await navigator.share({ title: 'FLX Legal Deal Room #FLX-8829', url: window.location.href }); else await navigator.clipboard?.writeText(window.location.href); setNotice({ tone: 'success', message: 'Secure deal-room link copied.' }); };

  return <div className="legal-reference-page"><aside className={`legal-reference-sidebar ${mobileNav ? 'is-open' : ''}`}><div className="legal-reference-brand"><span>FLX Legal Console</span></div><nav>{[['Legal Deal Room', Gavel], ['Escrow Vault', Landmark], ['Smart Contracts', History], ['Conveyancing Tracker', ShieldCheck], ['Cadastral Registry', Map], ['Active Deals', FileCheck2]].map(([label, Icon]) => <button type="button" key={String(label)} className={label === 'Escrow Vault' ? 'is-active' : ''} onClick={() => setNotice({ tone: 'success', message: `${String(label)} selected.` })}><Icon size={17} /> {label}</button>)}</nav><div className="legal-reference-bridge"><b>BOT ESCROW BRIDGE <i /></b><p>Multi-sig authorized with Bank of Tanzania regulatory clearing nodes.</p></div><div className="legal-reference-user"><span>JK</span><div><b>Adv. Juma Khalfan</b><small>High Court Registrar</small></div></div></aside><div className="legal-reference-shell"><header className="legal-reference-header"><button className="legal-reference-menu" type="button" onClick={() => setMobileNav((open) => !open)}>{mobileNav ? <X size={20} /> : <Menu size={20} />}</button><div className="legal-reference-search"><Search size={17} /><input placeholder="Search deed number, party TIN, or plot..." /></div><div className="legal-reference-tools"><span>🔒 {liveStatus}</span><button type="button">TZS</button><button type="button">USD</button><button type="button">EN</button><button type="button">SW</button><button type="button" aria-label="Notifications"><Bell size={16} /></button><span className="legal-reference-avatar">JK</span></div></header><main className="legal-reference-main"><div className="legal-reference-breadcrumb"><a href="/">⌂ Home</a><ChevronRight size={13} /><a href="#rooms">Escrow Deal Rooms</a><ChevronRight size={13} /><strong>Transaction #FLX-8829</strong><ChevronRight size={13} /><span>Mlimani Comfort Hostel</span><div><b>BOT Directive 2024 / Sec. 14A</b><b>NIDA Live Bridge</b></div></div><section className="legal-reference-identity"><div><div className="legal-reference-tags"><span>● LIVE DEAL ROOM</span><code>TXN: #FLX-8829-DAR</code><b>UDSM Sub-Zone Kinondoni</b></div><h1>Mlimani Comfort Hostel - Bed 204-B</h1><p><MapPinIcon /> Plot #492, Block C, Sinza Kijiweni, Dar es Salaam (12 min walk to UDSM Main Campus Gate)</p></div><div className="legal-reference-actions"><button type="button" onClick={() => window.print()}><Printer size={15} /> Legal Dossier (PDF)</button><button type="button" onClick={share}><Share2 size={15} /> Share Link</button><button type="button" onClick={() => setNotice({ tone: 'success', message: 'Mkataba draft downloaded.' })}><Download size={15} /> Draft Mkataba</button></div></section><section className="legal-reference-stepper">{[['Reservation Deposit', 'TZS 50,000 (M-Pesa 09:14 EAT)', 'completed', Check], ['Bilingual Mkataba', 'Awaiting Tenant E-Signature', 'active', FileCheck2], ['BOT Escrow Lock', 'TZS 330,000 CRDB Trustee', 'queued', LockKeyhole], ['Geofenced Smart Pass', 'Sinza Gate Checkpoint', 'final', QrCode]].map(([title, meta, state, Icon]) => <div className={`legal-reference-step ${state}`} key={String(title)}><span><Icon size={17} /></span><div><b>STEP {state === 'completed' ? '1' : state === 'active' ? '2' : state === 'queued' ? '3' : '4'} • {String(state).toUpperCase()}</b><strong>{title}</strong><small>{meta}</small></div></div>)}</section><div className="legal-reference-grid"><div className="legal-reference-left"><section className="legal-reference-panel"><SectionTitle icon={ShieldCheck} title="Verified Counterparties & Legal Title Verification" badge="NIDA e-KYC Matched" /><div className="legal-reference-counterparties"><Counterparty initials="JB" role="TENANT / MPANGAJI" name="Juma Bakari" subtitle="UDSM BSc. Computer Science (Yr 2)" rows={['Student ID: 2022-04-10292', 'NIDA National ID: 20010915-11104-00002-18', 'ARIS Academic Clearance: Active Enrolled']} /><Counterparty initials="HP" role="LANDLORD / MWENYE NYUMBA" name="Haji Properties Ltd" subtitle="Rep: Mzee Hamisi Haji (Managing Director)" rows={['Kinondoni Title Deed: KD-492-C/2018/DAR', 'TIN Registration: 108-493-219 (TRA Verified)', 'FLX Landlord Grade: Tier-1 Superhost']} /></div><div className="legal-reference-specs"><span>🛏 Single Deluxe 204-B</span><span>⌁ 100Mbps Dedicated Fibre</span><span>💧 24/7 DAWASA Line + Tank</span><span>▣ Orthopaedic Mattress & Study Desk</span><span>⚡ Sub-Meter LUKU #284-912</span></div></section><section className="legal-reference-panel"><div className="legal-reference-contract-heading"><div><h2><Gavel size={21} /> Mkataba wa Upangishaji wa Chumba</h2><p>Tanzania Land Act Cap 113 Compliant with automated FLX Escrow Enforcement Clause</p></div><div className="legal-reference-language"><button type="button" className={language === 'sw' ? 'is-active' : ''} onClick={() => setLanguage('sw')}>Kiswahili Sanifu</button><button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>English Parity</button></div></div><div className="legal-reference-clauses">{clauses.map(({ label, title, icon: Icon, sw, en }) => <article key={label}><div><b>{label}</b><Icon size={16} /></div><h3>{title}</h3><p>{language === 'sw' ? sw : en}</p></article>)}</div><section className="legal-reference-signatures"><h3><Fingerprint size={18} /> Cryptographic Execution & Biometric Signature State</h3><div><article><b>✓ SIGNED ELECTRONICALLY</b><strong>Mzee Hamisi Haji</strong><small>Director, Haji Properties Ltd</small><code>HASH: 8f9b2c01d4a8e32900fae3</code><small>Timestamp: 24 Oct 2025, 08:42 EAT</small></article><button type="button" className={signed ? 'is-signed' : ''} onClick={() => { setSigned(true); setNotice({ tone: 'success', message: 'Verified NIDA signature applied.' }); }}><b>{signed ? '✓ SIGNATURE APPLIED' : 'YOUR SIGNATURE REQUIRED'}</b><span>{signed ? 'Juma Bakari (NIDA Linked)' : '✎ Click to Apply Verified NIDA Signature'}</span><small>{signed ? 'Signature hash generated' : 'Pending Touch'}</small></button></div></section></section></div><aside className="legal-reference-right"><section className="legal-reference-panel legal-reference-ledger"><SectionTitle icon={Landmark} title="Escrow Settlement" badge="Zero Hidden Fees" /><LedgerRow icon={Home} label="5-Month Semester Rent" value="TZS 280,000" /><LedgerRow icon={ShieldCheck} label="Refundable Caution Deposit" value="TZS 50,000" /><LedgerRow icon={Check} label="FLX Escrow Legal Protection" value="FREE" green /><LedgerRow icon={FileCheck2} label="TRA Stamp & Reg Duty" value="Covered" green /><div className="legal-reference-total"><span>TOTAL ESCROW VAULT REQUIRED</span><strong>TZS 330,000</strong><b>≈ $125 USD</b></div><div className="legal-reference-bot"><b>ULINZI WA AMANA BENKI KUU (BOT)</b><p>Fedha zako zinalindwa ndani ya akaunti ya dhamana ya FLX Trustee (CRDB Bank). Mwenye chumba hapati kiasi chochote hadi ukague na kuridhika.</p></div></section><section className="legal-reference-panel"><SectionTitle title="Tanzania Payment Rails" badge="Instant STK Push" /><div className="legal-reference-rails">{(['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'CRDB / NMB'] as Rail[]).map((item) => <button type="button" className={rail === item ? 'is-active' : ''} key={item} onClick={() => setRail(item)}><b>{item}</b><small>{item === 'M-Pesa' ? 'Lipa #984210' : item === 'CRDB / NMB' ? 'Direct TISS' : 'Lipa Pesa'}</small></button>)}</div><label className="legal-reference-phone">Namba ya Vodacom M-Pesa kwa ajili ya STK Pin Prompt<div><b>+255</b><input value={phone} onChange={(event) => setPhone(event.target.value)} /><Check size={16} /></div></label></section><section className="legal-reference-panel"><SectionTitle icon={LockKeyhole} title="Digital Smart Lock Key" badge="LOCKED" /><div className="legal-reference-qr"><div><QrCode size={58} /><LockKeyhole size={20} /></div><span><b>Sinza Gate Pass #204-B</b><small>Geofence Radius: 15 meters from hostel gate.</small><em>Activates upon signature + escrow lock.</em></span></div><p className="legal-reference-small">Ufunguo huu wa kidijitali huzunguka kila sekunde 30 kuzuia kutumwa kwa mtu mwingine (Anti-screenshot safeguard).</p></section><section className="legal-reference-panel legal-reference-final"><label><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /> Nimesoma na nimekubali vigezo vya <b>Mkataba wa Upangishaji</b> pamoja na mwongozo wa ulinzi wa amana wa <b>FLX Escrow BOT Directive</b>.</label><button type="button" onClick={executeDeal} disabled={busy}>{busy ? 'Pushing M-Pesa USSD Prompt...' : 'Sign Mkataba & Fund Escrow'} <ArrowRight size={20} /></button><small>🔒 256-bit Bank Grade Multi-Sig Encryption<br />Bank of Tanzania Fintech Regulatory Sandbox #TZ-2024-BOT-09</small></section></aside></div></main></div>{notice && <div className={`legal-reference-notice ${notice.tone}`}>{notice.message}<button type="button" onClick={() => setNotice(null)}><X size={15} /></button></div>}</div>;
}

function MapPinIcon() { return <span className="legal-reference-pin">●</span>; }
function SectionTitle({ icon: Icon = ShieldCheck, title, badge }: { icon?: typeof ShieldCheck; title: string; badge?: string }) { return <div className="legal-reference-section-title"><div><Icon size={19} /><h2>{title}</h2></div>{badge && <b>{badge}</b>}</div>; }
function Counterparty({ initials, role, name, subtitle, rows }: { initials: string; role: string; name: string; subtitle: string; rows: string[] }) { return <article className="legal-reference-counterparty"><div className="legal-reference-person"><span>{initials}</span><div><b>{role} ✓</b><h3>{name}</h3><p>{subtitle}</p></div></div><div className="legal-reference-person-meta">{rows.map((row) => <span key={row}>{row.includes('Active') || row.includes('Tier') ? <strong>{row}</strong> : row}</span>)}</div></article>; }
function LedgerRow({ icon: Icon, label, value, green }: { icon: typeof Home; label: string; value: string; green?: boolean }) { return <div className="legal-reference-ledger-row"><span><Icon size={15} /> {label}</span><b className={green ? 'is-green' : ''}>{value}</b></div>; }
