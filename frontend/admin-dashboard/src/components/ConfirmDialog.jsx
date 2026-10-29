import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', busy = false, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <button className="icon-button dialog-close" onClick={onCancel} aria-label="Close dialog" disabled={busy}><X size={18} /></button>
        <span className="dialog-warning"><AlertTriangle size={21} /></span>
        <h3 id="confirm-title">{title}</h3>
        <p>{description}</p>
        <div className="dialog-actions">
          <button className="button button-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="button button-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
