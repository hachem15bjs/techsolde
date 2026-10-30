import { Bot, Check, CircleCheckBig, Pencil, RotateCcw, Trash2, UserRound, X } from 'lucide-react';
import SeverityBadge from './SeverityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import { detailRows, formatDateTime, statusInfo, typeLabel } from '../utils/alert-format.js';

export default function AlertDetailsDialog({ alert, busyAction, onClose, onAction, onEdit, onDelete }) {
  if (!alert) return null;
  const status = statusInfo(alert.status);
  const rows = detailRows(alert.details);
  const usage = alert.type === 'coupon_usage' ? alert.details?.percentUsed : null;
  const automatic = alert.source !== 'manual';

  const timeline = [
    { label: 'Created', value: alert.createdAt },
    { label: 'Last detected', value: automatic ? alert.lastDetectedAt : null },
    { label: 'Acknowledged', value: alert.acknowledgedAt },
    { label: 'Resolved', value: alert.resolvedAt },
    { label: 'Last updated', value: alert.updatedAt }
  ].filter((entry) => entry.value);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busyAction && onClose()}>
      <section className={`form-dialog alert-details alert-details-${alert.severity}`} role="dialog" aria-modal="true" aria-labelledby="alert-details-title">
        <div className="form-dialog-header">
          <div>
            <div className="alert-details-badges"><SeverityBadge severity={alert.severity} /><StatusBadge tone={status.tone}>{status.label}</StatusBadge><span className="code-chip">{typeLabel(alert.type)}</span></div>
            <h3 id="alert-details-title">{alert.title}</h3>
            <p>{alert.description || 'No description.'}</p>
          </div>
          <button className="icon-button" onClick={onClose} disabled={Boolean(busyAction)} aria-label="Close"><X size={19} /></button>
        </div>

        <div className="alert-details-grid">
          <div className="detail-tile"><span>Source</span><strong>{automatic ? <><Bot size={13} /> Smart detection ({alert.source})</> : <><UserRound size={13} /> Created manually</>}</strong></div>
          <div className="detail-tile"><span>Related record</span><strong>{alert.relatedEntityLabel || '—'}</strong>{alert.relatedEntityId && <small>{alert.relatedEntityType} · {alert.relatedEntityId}</small>}</div>
        </div>

        {rows.length > 0 && (
          <div className="detail-section">
            <h4>Detected values</h4>
            {usage != null && <div className="usage-meter"><i style={{ width: `${Math.min(100, usage)}%` }} /></div>}
            <dl className="detail-list">{rows.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
          </div>
        )}

        <div className="detail-section">
          <h4>Timeline</h4>
          <ol className="alert-timeline">{timeline.map((entry) => <li key={entry.label}><span>{entry.label}</span><strong>{formatDateTime(entry.value)}</strong></li>)}</ol>
          {alert.resolutionReason && <p className="resolution-note">{alert.autoResolved ? 'Auto-resolved: ' : ''}{alert.resolutionReason}</p>}
        </div>

        {alert.notes && <div className="detail-section"><h4>Admin notes</h4><p className="notes-box">{alert.notes}</p></div>}

        <div className="dialog-actions alert-details-actions">
          <button className="button button-secondary delete-text" onClick={() => onDelete(alert)} disabled={Boolean(busyAction)}><Trash2 size={15} /> Delete</button>
          <button className="button button-secondary" onClick={() => onEdit(alert)} disabled={Boolean(busyAction)}><Pencil size={15} /> Edit</button>
          {alert.status === 'new' && <button className="button button-secondary" onClick={() => onAction(alert, 'acknowledge')} disabled={Boolean(busyAction)}><Check size={15} /> {busyAction === 'acknowledge' ? 'Saving…' : 'Acknowledge'}</button>}
          {alert.status !== 'resolved' && <button className="button button-primary" onClick={() => onAction(alert, 'resolve')} disabled={Boolean(busyAction)}><CircleCheckBig size={15} /> {busyAction === 'resolve' ? 'Saving…' : 'Resolve'}</button>}
          {alert.status === 'resolved' && <button className="button button-primary" onClick={() => onAction(alert, 'reopen')} disabled={Boolean(busyAction)}><RotateCcw size={15} /> {busyAction === 'reopen' ? 'Saving…' : 'Reopen'}</button>}
        </div>
      </section>
    </div>
  );
}
