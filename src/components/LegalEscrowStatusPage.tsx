import { ArrowLeft, CircleAlert, ShieldAlert } from 'lucide-react';
import './marketAccount.css';

export function LegalEscrowStatusPage() {
  return <main className="legal-reference-page legal-status-page">
    <header className="legal-status-header">
      <a href="/">FLX Real Estate</a>
      <nav aria-label="Legal navigation"><a href="/">Marketplace</a><a href="/owner">Owner workspace</a><a href="/workspace#agent">Agent workspace</a></nav>
    </header>
    <section className="legal-status-panel" aria-labelledby="legal-status-title">
      <div className="legal-status-icon"><CircleAlert size={22} /></div>
      <span>LEGAL & ESCROW STATUS</span>
      <h1 id="legal-status-title">Payments are not available</h1>
      <p>No verified payment provider, bank authorization, or live escrow transaction is connected to this workspace.</p>
      <ul>
        <li>Property requests are availability inquiries only.</li>
        <li>No funds will be requested, transferred, or recorded here.</li>
        <li>This page is not a signed contract, room reservation, or proof of escrow.</li>
      </ul>
      <div className="legal-status-warning"><ShieldAlert size={17} /><span>Do not send money based on a listing or message until an FLX agent confirms availability and provides an independently verifiable payment instruction.</span></div>
      <a className="legal-status-back" href="/"><ArrowLeft size={16} /> Return to properties</a>
    </section>
  </main>;
}
