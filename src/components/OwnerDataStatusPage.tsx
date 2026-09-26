import { ArrowLeft, CircleAlert, Wallet } from 'lucide-react';
import { WorkspaceTopBar } from './WorkspaceChrome';
import './marketAccount.css';

export function OwnerDataStatusPage() {
  return <main className="owner-data-status-page">
    <WorkspaceTopBar section="Owner workspace" />
    <section className="owner-data-status-panel" aria-labelledby="owner-data-status-title">
      <div className="owner-data-status-icon"><CircleAlert size={22} /></div>
      <span>OWNER WORKSPACE STATUS</span>
      <h1 id="owner-data-status-title">Owner records are not connected</h1>
      <p>The current portfolio screen contains sample balances and occupancy data. It is hidden until property ownership and live transaction records are available.</p>
      <p>Property owners can now create and edit their listing records in the shared workbench. New and changed listings remain private until an Admin approves the details.</p>
      <div className="owner-data-status-warning"><Wallet size={17} /><span>Withdrawals and payout actions are disabled. No owner balance or payment connector is verified.</span></div>
      <p>Marketplace requests are recorded for FLX team review; they are not yet routed to owners because listings do not have an owner account mapping.</p>
      <div className="owner-data-status-actions"><a className="owner-data-status-back" href="/"><ArrowLeft size={16} /> Return to marketplace</a><a className="owner-data-status-back" href="/properties/manage">Open property workbench</a></div>
    </section>
  </main>;
}
