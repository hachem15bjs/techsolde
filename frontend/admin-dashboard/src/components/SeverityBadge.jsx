const labels = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export default function SeverityBadge({ severity }) {
  return <span className={`severity-badge severity-${severity}`}><span />{labels[severity] ?? severity}</span>;
}
