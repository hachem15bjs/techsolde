export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}
