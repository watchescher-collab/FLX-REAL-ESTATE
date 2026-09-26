import { ArrowLeft, CircleAlert, Wallet } from 'lucide-react';
import './marketAccount.css';

export function OwnerDataStatusPage() {
  return <main className="owner-data-status-page">
    <header><a href="/">FLX Real Estate</a><nav aria-label="Owner navigation"><a href="/">Marketplace</a><a href="/workspace#agent">Agent workspace</a><a href="/legal/escrow">Legal & escrow</a></nav></header>
    <section className="owner-data-status-panel" aria-labelledby="owner-data-status-title">
      <div className="owner-data-status-icon"><CircleAlert size={22} /></div>
      <span>OWNER WORKSPACE STATUS</span>
      <h1 id="owner-data-status-title">Owner records are not connected</h1>
      <p>The current portfolio screen contains sample balances and occupancy data. It is hidden until property ownership and live transaction records are available.</p>
      <div className="owner-data-status-warning"><Wallet size={17} /><span>Withdrawals and payout actions are disabled. No owner balance or payment connector is verified.</span></div>
      <p>Marketplace requests are recorded for FLX team review; they are not yet routed to owners because listings do not have an owner account mapping.</p>
      <a className="owner-data-status-back" href="/"><ArrowLeft size={16} /> Return to marketplace</a>
    </section>
  </main>;
}
