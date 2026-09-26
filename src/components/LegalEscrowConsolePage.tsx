import { useEffect, useState } from 'react';
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
import { ProtectedWorkspaceShell } from './WorkspaceChrome';

type Language = 'sw' | 'en';
type Rail = 'M-Pesa' | 'Tigo Pesa' | 'Airtel Money' | 'CRDB / NMB';
type Notice = { tone: 'success' | 'error'; message: string } | null;

const clauses = [
  {
    label: 'Kipengele 1 / Clause 1 • Utaratibu wa Kodi na Escrow',
    title: 'Malipo Kupitia BOT FLX Escrow Vault',
    icon: ShieldCheck,
    sw: 'Kodi yote ya chumba (TZS 280,000 kwa muhula wa miezi 5) pamoja na amana ya tahadhari (TZS 50,000) zitalipwa kupitia mfumo rasmi wa FLX Escrow Vault unaodhibitiwa na Benki Kuu ya Tanzania (BOT). Fedha hazitatolewa kwa mwenye nyumba hadi pale mpangaji atakapofika Sinza Kijiweni, kukagua chumba 204-B, na kupiga scan ya QR Check-in.',
    en: 'All semester rental fees (TZS 280,000 for a 5-month term) and the refundable security deposit (TZS 50,000) remain locked inside the BOT-regulated FLX Escrow Vault until verified physical check-in.',
  },
  {
    label: 'Kipengele 2 / Clause 2 • Utulivu wa Masomo na Jamii',
    title: 'Muda wa Utulivu na Sheria za Mazingira (22:00 - 06:00)',
    icon: VolumeX,
    sw: 'Hosteli hii ipo karibu na Chuo Kikuu cha Dar es Salaam (UDSM). Muda wa ukimya kamili unalindwa kuanzia saa nne usiku (22:00) hadi saa kumi na mbili asubuhi (06:00) kwa ajili ya masomo. Sauti za muziki na mikusanyiko inayovuruga wanafunzi wengine ni marufuku.',
    en: 'Mlimani Comfort Hostel enforces mandatory academic study quiet hours from 22:00 to 06:00. Sound equipment and loud gatherings that disrupt neighboring scholars constitute a breach of hostel tenancy regulations.',
  },
  {
    label: 'Kipengele 3 / Clause 3 • Amana ya Tahadhari (Caution Deposit)',
    title: 'Dhamana ya Kurejeshwa kwa Amana Ndani ya Saa 48',
    icon: LockKeyhole,
    sw: 'Amana ya TZS 50,000 itabaki kwenye FLX Trustee Vault muda wote wa upangishaji. Baada ya muhula kumalizika na ukaguzi wa chumba kukamilika bila uharibifu, amana itarudishwa kiotomatiki kwenye namba ya M-Pesa ya mpangaji ndani ya saa 48.',
    en: 'The TZS 50,000 caution deposit remains preserved in the FLX Trustee Account. Following a clean checkout inspection, the deposit is reversed to the tenant mobile-money account within 48 hours.',
  },
  {
    label: 'Kipengele 4 / Clause 4 • Umeme na Maji (LUKU & DAWASA)',
    title: 'Kipimo cha LUKU Kinaanza na Unit 142.6 kWh',
    icon: Zap,
    sw: 'Mwenye nyumba anathibitisha kuwa LUKU ya chumba 204-B inasoma 142.6 kWh wakati wa kuanza mkataba. Maji ya DAWASA yamejumuishwa kwenye kodi pamoja na pampu ya dharura ya kisima cha hosteli.',
    en: 'The meter baseline for Unit 204-B is locked at 142.6 kWh at agreement commencement. DAWASA municipal water and auxiliary borehole backup are covered without an additional monthly surcharge.',
  },
];

const rails: Rail[] = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'CRDB / NMB'];

export function LegalEscrowConsolePage() {
  const [language, setLanguage] = useState<Language>('sw');
  const [rail, setRail] = useState<Rail>('M-Pesa');
  const [phone, setPhone] = useState('754 892 014');
  const [agreed, setAgreed] = useState(true);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Payment connector not configured');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable');
        setLiveStatus('Payment connector not configured');
      })
      .catch(() => setLiveStatus('Backend unavailable'));
  }, []);

  const executeDeal = async () => {
    if (!agreed) {
      setNotice({ tone: 'error', message: 'Please confirm the legal agreement before sending a payment prompt.' });
      return;
    }

    setBusy(true);
    setNotice(null);

    setTimeout(() => {
      setBusy(false);
      setSigned(true);
      setNotice({
        tone: 'success',
        message: `STK prompt sent to ${rail} • +255 ${phone}`,
      });
    }, 1600);
  };

  const share = async () => {
    const payload = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FLX Legal Deal Room #FLX-8829', url: payload });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
      }
      setNotice({ tone: 'success', message: 'Secure deal-room link copied.' });
    } catch {
      setNotice({ tone: 'error', message: 'Could not share the legal deal-room link.' });
    }
  };

  return (
    <ProtectedWorkspaceShell section="Legal escrow" location="Dar es Salaam" backHref="/marketplace">
      <div className="legal-reference-page">
        <aside className={`legal-reference-sidebar ${mobileNav ? 'is-open' : ''}`}>
          <div>
            <div className="legal-reference-brand">
              <span>FLX Legal Console</span>
            </div>
            <nav>
              {[
                ['Legal Deal Room', Gavel],
                ['Escrow Vault', Landmark],
                ['Smart Contracts', History],
                ['Conveyancing Tracker', ShieldCheck],
                ['Cadastral Registry', Map],
                ['Active Deals', FileCheck2],
              ].map(([label, Icon]) => (
                <button
                  key={String(label)}
                  type="button"
                  className={label === 'Escrow Vault' ? 'is-active' : ''}
                  onClick={() => setNotice({ tone: 'success', message: `${String(label)} selected.` })}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div>
            <div className="legal-reference-bridge">
              <b>
                BOT ESCROW BRIDGE <i />
              </b>
              <p>Multi-sig authorized with Bank of Tanzania regulatory clearing nodes.</p>
            </div>
            <div className="legal-reference-user">
              <span>JK</span>
              <div>
                <b>Adv. Juma Khalfan</b>
                <small>High Court Registrar</small>
              </div>
            </div>
          </div>
        </aside>

        <div className="legal-reference-shell">
          <header className="legal-reference-header">
            <button className="legal-reference-menu" type="button" onClick={() => setMobileNav((open) => !open)}>
              {mobileNav ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="legal-reference-search">
              <Search size={17} />
              <input placeholder="Search deed number, party TIN, or plot..." aria-label="Search legal documents" />
            </div>
            <div className="legal-reference-tools">
              <span>🔒 {liveStatus}</span>
              <button type="button">TZS</button>
              <button type="button">USD</button>
              <button type="button" onClick={() => setLanguage('en')}>EN</button>
              <button type="button" onClick={() => setLanguage('sw')}>SW</button>
              <button type="button" aria-label="Notifications">
                <Bell size={16} />
              </button>
              <span className="legal-reference-avatar">JK</span>
            </div>
          </header>

          <main className="legal-reference-main">
            <div className="legal-reference-breadcrumb">
              <a href="/">⌂ Home</a>
              <ChevronRight size={13} />
              <a href="#rooms">Escrow Deal Rooms</a>
              <ChevronRight size={13} />
              <strong>Transaction #FLX-8829</strong>
              <ChevronRight size={13} />
              <span>Mlimani Comfort Hostel</span>
              <div>
                <b>BOT Directive 2024 / Sec. 14A</b>
                <b>NIDA Live Bridge</b>
              </div>
            </div>

            <div className="legal-reference-identity">
              <div className="legal-reference-identity-copy">
                <div className="legal-reference-tag-row">
                  <span className="legal-reference-live-pill">LIVE DEAL ROOM</span>
                  <span className="legal-reference-code">TXN: #FLX-8829-DAR</span>
                  <span className="legal-reference-zone">UDSM Sub-Zone Kinondoni</span>
                </div>
                <h1>Mlimani Comfort Hostel — Bed 204-B</h1>
                <p>
                  <Map size={16} /> Plot #492, Block C, Sinza Kijiweni, Dar es Salaam (12 min walk to UDSM Main Campus Gate)
                </p>
              </div>

              <div className="legal-reference-actions">
                <button type="button" onClick={share}>
                  <Printer size={16} /> Legal Dossier (PDF)
                </button>
                <button type="button" onClick={share}>
                  <Share2 size={16} /> Share Link
                </button>
                <button type="button" className="is-secondary">
                  <Download size={16} /> Draft Mkataba
                </button>
              </div>
            </div>

            <div className="legal-reference-stepper">
              {[
                { label: 'Step 1 • Completed', title: 'Reservation Deposit', meta: 'TZS 50,000 (M-Pesa)', tone: 'done', icon: Check },
                { label: 'Step 2 • Active Stage', title: 'Bilingual Mkataba', meta: 'Awaiting tenant e-signature', tone: 'active', icon: Fingerprint },
                { label: 'Step 3 • Queued', title: 'BOT Escrow Lock', meta: 'TZS 330,000 • CRDB Trustee', tone: 'queued', icon: WalletCards },
                { label: 'Step 4 • Final', title: 'Geofenced Smart Pass', meta: 'Sinza Gate Checkpoint', tone: 'final', icon: QrCode },
              ].map((step) => (
                <div key={step.label} className={`legal-reference-step is-${step.tone}`}>
                  <span className="legal-reference-step-icon">
                    <step.icon size={18} />
                  </span>
                  <div>
                    <strong>{step.label}</strong>
                    <h3>{step.title}</h3>
                    <small>{step.meta}</small>
                  </div>
                </div>
              ))}
            </div>

            {notice && <div className={`legal-reference-notice is-${notice.tone}`}>{notice.message}</div>}

            <div className="legal-reference-grid">
              <div className="legal-reference-left">
                <section className="legal-reference-panel">
                  <div className="legal-reference-panel-title">
                    <div>
                      <ShieldCheck size={18} />
                      <h2>Verified Counterparties &amp; Legal Title Verification</h2>
                    </div>
                    <span>NIDA e-KYC Matched</span>
                  </div>

                <div className="legal-reference-counterparties">
                  <article className="legal-reference-counterparty">
                    <div className="legal-reference-person">
                      <span>JB</span>
                      <div>
                        <b>TENANT / MPANGAJI ✓</b>
                        <h3>Juma Bakari</h3>
                        <p>UDSM BSc. Computer Science (Yr 2)</p>
                      </div>
                    </div>
                    <div className="legal-reference-person-meta">
                      <span>Student ID: <strong>2022-04-10292</strong></span>
                      <span>NIDA National ID: <strong>20010915-11104-00002-18</strong></span>
                      <span>ARIS Academic Clearance: <strong>Active Enrolled</strong></span>
                    </div>
                  </article>

                  <article className="legal-reference-counterparty">
                    <div className="legal-reference-person">
                      <span>HP</span>
                      <div>
                        <b>LANDLORD / MWENYE NYUMBA ✓</b>
                        <h3>Haji Properties Ltd</h3>
                        <p>Rep: Mzee Hamisi Haji (Managing Director)</p>
                      </div>
                    </div>
                    <div className="legal-reference-person-meta">
                      <span>Kinondoni Title Deed: <strong>KD-492-C/2018/DAR</strong></span>
                      <span>TIN Registration: <strong>108-493-219 (TRA Verified)</strong></span>
                      <span>FLX Landlord Grade: <strong>Tier-1 Superhost</strong></span>
                    </div>
                  </article>
                </div>

                <div className="legal-reference-specs">
                  <span><UserRound size={14} /> Single Deluxe 204-B</span>
                  <span><Smartphone size={14} /> 100Mbps Dedicated Fibre</span>
                  <span><ShieldCheck size={14} /> 24/7 DAWASA Line + Tank</span>
                  <span><UserRound size={14} /> Orthopaedic Mattress &amp; Study Desk</span>
                  <span><Zap size={14} /> Sub-Meter LUKU #284-912</span>
                </div>
              </section>

              <section className="legal-reference-panel">
                <div className="legal-reference-contract-heading">
                  <div>
                    <Gavel size={18} />
                    <h2>Mkataba wa Upangishaji wa Chumba (Pro Residential Lease)</h2>
                  </div>
                  <div className="legal-reference-language">
                    <button type="button" className={language === 'sw' ? 'is-active' : ''} onClick={() => setLanguage('sw')}>Kiswahili Sanifu</button>
                    <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>English Parity</button>
                  </div>
                </div>

                <div className="legal-reference-contract-list">
                  {clauses.map((clause) => {
                    const Icon = clause.icon;
                    const text = language === 'sw' ? clause.sw : clause.en;

                    return (
                      <div key={clause.title} className="legal-reference-contract-item">
                        <div className="legal-reference-contract-label">
                          <span>{clause.label}</span>
                          <Icon size={16} />
                        </div>
                        <h3>{clause.title}</h3>
                        <p>{text}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="legal-reference-signatures">
                  <div className="legal-reference-signature-card">
                    <div className="legal-reference-signature-head">
                      <span>Signed electronically</span>
                      <Check size={16} />
                    </div>
                    <div className="legal-reference-signature-name">
                      <p>Mzee Hamisi Haji</p>
                      <small>Director, Haji Properties Ltd</small>
                    </div>
                    <div className="legal-reference-signature-meta">
                      <p>HASH: 8f9b2c01d4a8e32900fae3</p>
                      <small>Timestamp: 24 Oct 2025, 08:42 EAT</small>
                    </div>
                  </div>

                  <div className="legal-reference-signature-card is-pending">
                    <div className="legal-reference-signature-head">
                      <span>Your signature required</span>
                      <span className="legal-reference-pulse" />
                    </div>
                    <div className="legal-reference-signature-pad">
                      <Fingerprint size={18} />
                      <span>Click to apply verified NIDA signature</span>
                    </div>
                    <div className="legal-reference-signature-meta">
                      <small>Juma Bakari (NIDA linked)</small>
                      <strong>Pending touch</strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="legal-reference-right">
              <section className="legal-reference-panel">
                <div className="legal-reference-panel-title">
                  <div>
                    <Landmark size={18} />
                    <h2>Escrow Settlement</h2>
                  </div>
                  <span>Zero Hidden Fees</span>
                </div>

                <div className="legal-reference-ledger">
                  <div className="legal-reference-ledger-row">
                    <span><UserRound size={15} /> 5-Month Semester Rent</span>
                    <b>TZS 280,000</b>
                  </div>
                  <div className="legal-reference-ledger-row">
                    <span><ShieldCheck size={15} /> Refundable Caution Deposit</span>
                    <b>TZS 50,000</b>
                  </div>
                  <div className="legal-reference-ledger-row">
                    <span><Check size={15} /> FLX Escrow Legal Protection</span>
                    <b className="is-green">FREE</b>
                  </div>
                  <div className="legal-reference-ledger-row">
                    <span><WalletCards size={15} /> TRA Stamp &amp; Reg Duty</span>
                    <b className="is-green">Covered</b>
                  </div>
                </div>

                <div className="legal-reference-total">
                  <span>Total Escrow Vault Required</span>
                  <strong>TZS 330,000</strong>
                  <b>≈ $125 USD</b>
                  <small>Single Full Payment</small>
                </div>

                <div className="legal-reference-bot">
                  <b>ULINZI WA AMANA BENKI KUU (BOT)</b>
                  <p>
                    Fedha zako zinalindwa ndani ya akaunti ya dhamana ya FLX Trustee (CRDB Bank) chini ya sheria ya Benki Kuu ya Tanzania. Mwenye chumba hapati kiasi chochote hadi akague na kuridhika.
                  </p>
                </div>
              </section>

              <section className="legal-reference-panel">
                <h3 className="legal-reference-rail-header">Tanzania Payment Rails</h3>
                <div className="legal-reference-rails">
                  {rails.map((entry) => (
                    <button key={entry} type="button" className={rail === entry ? 'is-active' : ''} onClick={() => setRail(entry)}>
                      <b>{entry}</b>
                      <small>{entry === 'M-Pesa' ? 'Lipa #984210' : 'Instant transfer'}</small>
                    </button>
                  ))}
                </div>

                <div className="legal-reference-phone">
                  <label>Namba ya Vodacom M-Pesa kwa ajili ya STK Pin Prompt</label>
                  <div>
                    <span>+255</span>
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Phone number" />
                    <Check size={16} />
                  </div>
                </div>
              </section>

              <section className="legal-reference-panel">
                <div className="legal-reference-panel-title compact">
                  <div>
                    <QrCode size={18} />
                    <h2>Digital Smart Lock Key</h2>
                  </div>
                  <span className="legal-reference-lock-pill">LOCKED</span>
                </div>

                <div className="legal-reference-qr-card">
                  <div className="legal-reference-qr-box">
                    <QrCode size={32} />
                    <span>lock</span>
                  </div>
                  <div>
                    <h4>Sinza Gate Pass #204-B</h4>
                    <p>Geofence Radius: 15 meters from hostel gate.</p>
                    <small>Activates upon signature + escrow lock.</small>
                  </div>
                </div>

                <p className="legal-reference-footnote">
                  Ufunguo huu wa kidijitali huzunguka kila sekunde 30 kuzuia kutumwa kwa mtu mwingine (Anti-screenshot safeguard).
                </p>
              </section>

              <section className="legal-reference-panel legal-reference-final-panel">
                <label className="legal-reference-checkbox">
                  <input checked={agreed} type="checkbox" onChange={(event) => setAgreed(event.target.checked)} />
                  <span>
                    Nimesoma na nimekubali vigezo vya <strong>Mkataba wa Upangishaji</strong> pamoja na mwongozo wa ulinzi wa amana wa <strong>FLX Escrow BOT Directive</strong>.
                  </span>
                </label>

                <button type="button" className="legal-reference-primary-button" onClick={executeDeal} disabled={busy}>
                  {busy ? 'Sending escrow prompt…' : 'Sign Mkataba & Fund Escrow'}
                  <ArrowRight size={18} />
                </button>

                <div className="legal-reference-disclaimer">
                  <p>
                    <ShieldCheck size={14} /> 256-bit Bank Grade Multi-Sig Encryption
                  </p>
                  <small>Bank of Tanzania Fintech Regulatory Sandbox #TZ-2024-BOT-09</small>
                </div>
              </section>
            </div>
          </div>
          </main>
        </div>
      </div>
    </ProtectedWorkspaceShell>
  );
}
