import { useEffect, useState } from 'react';
import { Bot, LoaderCircle, X } from 'lucide-react';
import FormField from './FormField.jsx';
import SeverityBadge from './SeverityBadge.jsx';
import { listPromotions } from '../services/promotion-service.js';
import { listCoupons } from '../services/coupon-service.js';
import { SEVERITIES, typeLabel } from '../utils/alert-format.js';

function initialValues(record) {
  return {
    title: record?.title ?? '',
    description: record?.description ?? '',
    severity: record?.severity ?? 'medium',
    notes: record?.notes ?? '',
    relatedEntityType: record?.relatedEntityType ?? '',
    relatedEntityId: record?.relatedEntityId ?? '',
    relatedEntityLabel: record?.relatedEntityLabel ?? ''
  };
}

// Loads real promotions or coupons from the Promotion Service for the "Related to" picker.
function useRelatedOptions(open, kind) {
  const [state, setState] = useState({ options: [], loading: false, error: '' });

  useEffect(() => {
    if (!open || !kind) return undefined;
    let active = true;
    setState({ options: [], loading: true, error: '' });
    const request = kind === 'promotion' ? listPromotions({ limit: 100 }) : listCoupons({ limit: 100 });
    request
      .then((result) => {
        if (!active) return;
        setState({
          loading: false,
          error: '',
          options: result.data.map((item) => ({ id: item._id, label: kind === 'promotion' ? `${item.title} (${item.code})` : item.code }))
        });
      })
      .catch(() => active && setState({ options: [], loading: false, error: 'Could not load records from the Promotion Service.' }));
    return () => { active = false; };
  }, [open, kind]);

  return state;
}

export default function AlertForm({ open, record, onClose, onSubmit }) {
  const [values, setValues] = useState(() => initialValues(record));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const automatic = record && record.source !== 'manual';
  const related = useRelatedOptions(open && !automatic, values.relatedEntityType);

  useEffect(() => {
    if (open) {
      setValues(initialValues(record));
      setErrors({});
      setBusy(false);
    }
  }, [open, record]);

  if (!open) return null;

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!automatic) {
      if (values.title.trim().length < 3) nextErrors.title = 'Enter a title of at least 3 characters.';
      if (values.relatedEntityType && !values.relatedEntityId) nextErrors.relatedEntityId = `Choose a ${values.relatedEntityType}.`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    let payload;
    if (automatic) {
      // Automatic alerts are owned by the detection engine; only notes can change.
      payload = { notes: values.notes.trim() };
    } else {
      payload = { title: values.title.trim(), description: values.description.trim(), severity: values.severity, notes: values.notes.trim() };
      if (values.relatedEntityType) {
        const option = related.options.find((item) => item.id === values.relatedEntityId);
        payload.relatedEntityType = values.relatedEntityType;
        payload.relatedEntityId = values.relatedEntityId;
        payload.relatedEntityLabel = option?.label ?? values.relatedEntityLabel;
      } else {
        payload.relatedEntityType = null;
      }
    }

    setBusy(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors);
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="alert-form-title">
        <div className="form-dialog-header"><div><span className="eyebrow">ALERT DETAILS</span><h3 id="alert-form-title">{record ? 'Edit alert' : 'Create alert'}</h3><p>{automatic ? 'This alert was raised by Smart Alert Detection.' : 'Flag an important event for the admin team.'}</p></div><button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit} noValidate>
          {automatic ? (
            <div className="form-grid">
              <div className="automatic-note form-span-2">
                <span className="automatic-note-icon"><Bot size={17} /></span>
                <div><strong>{record.title}</strong><span>{typeLabel(record.type)} · <SeverityBadge severity={record.severity} /></span><small>Title, severity and related record are kept in sync by the detection rules, so only your notes can be edited.</small></div>
              </div>
              <div className="form-span-2"><FormField label="Admin notes" name="notes" hint="Optional · what was done or who is handling it"><textarea id="notes" rows="4" maxLength={1000} value={values.notes} onChange={(event) => update('notes', event.target.value)} placeholder="e.g. Marketing confirmed the discount is intentional." /></FormField></div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-span-2"><FormField label="Alert title" name="title" error={errors.title}><input id="title" value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Review unusually high discounts before the seasonal sale" maxLength={150} /></FormField></div>
              <div className="form-span-2">
                <span className="field-label">Severity</span>
                <div className="severity-picker" role="radiogroup" aria-label="Severity">
                  {[...SEVERITIES].reverse().map((option) => (
                    <button type="button" key={option.value} role="radio" aria-checked={values.severity === option.value} className={`severity-option severity-option-${option.value} ${values.severity === option.value ? 'severity-option-selected' : ''}`} onClick={() => update('severity', option.value)}><span />{option.label}</button>
                  ))}
                </div>
                {errors.severity && <span className="field-error" role="alert">{errors.severity}</span>}
              </div>
              <div className="form-span-2"><FormField label="Description" name="description" error={errors.description} hint="Optional · what needs attention and why"><textarea id="description" rows="3" maxLength={1000} value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe the situation" /></FormField></div>
              <FormField label="Related to" name="relatedEntityType" error={errors.relatedEntityType}>
                <select id="relatedEntityType" value={values.relatedEntityType} onChange={(event) => { update('relatedEntityType', event.target.value); update('relatedEntityId', ''); }}>
                  <option value="">Nothing specific</option><option value="promotion">A promotion</option><option value="coupon">A coupon</option>
                </select>
              </FormField>
              <FormField label={values.relatedEntityType === 'coupon' ? 'Coupon' : 'Promotion'} name="relatedEntityId" error={errors.relatedEntityId || related.error} hint={related.loading ? 'Loading…' : undefined}>
                <select id="relatedEntityId" value={values.relatedEntityId} disabled={!values.relatedEntityType || related.loading} onChange={(event) => update('relatedEntityId', event.target.value)}>
                  <option value="">{values.relatedEntityType ? 'Choose…' : '—'}</option>
                  {values.relatedEntityId && !related.options.some((item) => item.id === values.relatedEntityId) && <option value={values.relatedEntityId}>{values.relatedEntityLabel || values.relatedEntityId}</option>}
                  {related.options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </FormField>
              <div className="form-span-2"><FormField label="Admin notes" name="notes" error={errors.notes} hint="Optional"><textarea id="notes" rows="2" maxLength={1000} value={values.notes} onChange={(event) => update('notes', event.target.value)} /></FormField></div>
            </div>
          )}
          <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy && <LoaderCircle size={16} className="spin" />}{busy ? 'Saving…' : record ? 'Save changes' : 'Create alert'}</button></div>
        </form>
      </section>
    </div>
  );
}
