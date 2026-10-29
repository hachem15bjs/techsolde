export default function StatCard({ label, value, note, icon: Icon, tone = 'brown', loading = false }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top"><span className={`stat-icon stat-icon-${tone}`}><Icon size={19} strokeWidth={1.8} /></span><span className="stat-note">{note}</span></div>
      {loading ? <div className="skeleton stat-skeleton" /> : <strong className="stat-value">{value}</strong>}
      <span className="stat-label">{label}</span>
    </article>
  );
}
