import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgePercent, CalendarClock, CircleCheck, Plus, TicketPercent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPromotionStats, listPromotions } from '../services/promotion-service.js';
import { getApiErrorMessage } from '../services/api-client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate, formatDiscount } from '../utils/format.js';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date())
    .toUpperCase();

  useEffect(() => {
    let active = true;
    Promise.all([getPromotionStats(), listPromotions({ limit: 5, sort: 'desc' })])
      .then(([nextStats, promotions]) => {
        if (!active) return;
        setStats(nextStats);
        setRecent(promotions.data);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reload]);

  const columns = [
    { key: 'title', label: 'Promotion', render: (row) => <div className="table-primary"><strong>{row.title}</strong><span>{row.description || '—'}</span></div> },
    { key: 'code', label: 'Code', render: (row) => <span className="code-chip">{row.code}</span> },
    { key: 'discountValue', label: 'Discount', render: (row) => <strong className="discount-value">{formatDiscount(row.discountType, row.discountValue)}</strong> },
    { key: 'endDate', label: 'Ends', render: (row) => formatDate(row.endDate) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge> }
  ];

  return (
    <>
      <PageHeader eyebrow="YOUR STORE AT A GLANCE" title="Good things are happening." description="Here’s what’s going on across your promotions workspace." />
      {error && <div className="error-banner" role="alert"><div><strong>Couldn’t load your dashboard</strong><span>{error}</span></div><button className="button button-secondary button-small" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Try again</button></div>}
      <section className="welcome-strip">
        <div className="welcome-orb welcome-orb-one" /><div className="welcome-orb welcome-orb-two" />
        <div className="welcome-copy"><span>{dateLabel}</span><h3>Your next great offer starts here.</h3><p>Keep your promotions fresh and give shoppers a reason to come back.</p></div>
        <div className="welcome-actions">
          <Link className="button button-white" to="/promotions?create=1"><Plus size={16} /> Create promotion</Link>
          <Link className="welcome-link" to="/coupons?create=1">Create a coupon <ArrowRight size={15} /></Link>
        </div>
        <div className="welcome-decoration"><BadgePercent size={74} strokeWidth={1} /></div>
      </section>
      <div className="section-heading"><div><h3>At a glance</h3><p>Live numbers from your Promotion Service</p></div><span className="live-indicator"><i /> Live data</span></div>
      <section className="stats-grid">
        <StatCard label="Total promotions" value={stats?.totalPromotions ?? '—'} note="All records" icon={BadgePercent} tone="brown" loading={loading} />
        <StatCard label="Currently active" value={stats?.activePromotions ?? '—'} note="In date range" icon={CircleCheck} tone="green" loading={loading} />
        <StatCard label="Expired promotions" value={stats?.expiredPromotions ?? '—'} note="Ended offers" icon={CalendarClock} tone="lavender" loading={loading} />
        <StatCard label="Available coupons" value={stats?.availableCoupons ?? '—'} note="Ready to use" icon={TicketPercent} tone="sand" loading={loading} />
      </section>
      <section className="content-card recent-card">
        <div className="card-heading"><div><h3>Recent promotions</h3><p>A quick look at your latest offers</p></div><Link to="/promotions" className="text-link">View all <ArrowUpRight size={15} /></Link></div>
        <DataTable columns={columns} rows={recent} rowKey={(row) => row._id} loading={loading} emptyTitle="No promotions yet" emptyDescription="Create your first promotion to see it here." />
      </section>
      <section className="quick-actions">
        <Link to="/promotions?create=1" className="quick-action-card"><span className="quick-action-icon quick-action-brown"><Plus size={19} /></span><span><strong>Launch a promotion</strong><small>Share an offer with your customers</small></span><ArrowRight size={17} /></Link>
        <Link to="/coupons?create=1" className="quick-action-card"><span className="quick-action-icon quick-action-lavender"><TicketPercent size={19} /></span><span><strong>Create a coupon</strong><small>Give your shoppers a little extra</small></span><ArrowDownRight size={17} /></Link>
      </section>
      <p className="auth-notice"><span>i</span> Admin routes are a local preview. Authentication and authorization will be integrated with the User Service.</p>
    </>
  );
}
