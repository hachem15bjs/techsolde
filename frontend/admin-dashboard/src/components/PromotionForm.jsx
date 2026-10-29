import { useEffect, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import FormField from './FormField.jsx';

function dateToInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function initialValues(record) {
  return {
    title: record?.title ?? '',
    description: record?.description ?? '',
    code: record?.code ?? '',
    discountType: record?.discountType ?? 'percentage',
    discountValue: record?.discountValue ?? '',
    startDate: dateToInput(record?.startDate),
    endDate: dateToInput(record?.endDate),
    isActive: record?.isActive ?? true
  };
}

export default function PromotionForm({ open, record, onClose, onSubmit }) {
  const [values, setValues] = useState(() => initialValues(record));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

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
    if (!values.title.trim()) nextErrors.title = 'Enter a promotion title.';
    if (!values.code.trim()) nextErrors.code = 'Enter a promotion code.';
    if (!values.discountValue || Number(values.discountValue) <= 0) nextErrors.discountValue = 'Enter a value greater than zero.';
    if (values.discountType === 'percentage' && Number(values.discountValue) > 100) nextErrors.discountValue = 'A percentage cannot exceed 100.';
    if (!values.startDate) nextErrors.startDate = 'Choose a start date.';
    if (!values.endDate) nextErrors.endDate = 'Choose an end date.';
    if (values.startDate && values.endDate && values.endDate <= values.startDate) nextErrors.endDate = 'End date must be after the start date.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        code: values.code.trim().toUpperCase(),
        discountValue: Number(values.discountValue),
        startDate: `${values.startDate}T00:00:00.000Z`,
        endDate: `${values.endDate}T23:59:59.999Z`
      });
    } catch (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors);
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="promotion-form-title">
        <div className="form-dialog-header"><div><span className="eyebrow">PROMOTION DETAILS</span><h3 id="promotion-form-title">{record ? 'Edit promotion' : 'Create promotion'}</h3><p>Set up an offer for your TechSolde customers.</p></div><button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <FormField label="Promotion title" name="title" error={errors.title}><input id="title" value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Summer tech edit" maxLength={120} /></FormField>
            <FormField label="Promotion code" name="code" error={errors.code}><input id="code" value={values.code} onChange={(event) => update('code', event.target.value.toUpperCase())} placeholder="e.g. SUMMER20" maxLength={40} /></FormField>
            <FormField label="Discount type" name="discountType"><select id="discountType" value={values.discountType} onChange={(event) => update('discountType', event.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed amount (€)</option></select></FormField>
            <FormField label="Discount value" name="discountValue" error={errors.discountValue}><input id="discountValue" type="number" min="0.01" max={values.discountType === 'percentage' ? 100 : undefined} step="0.01" value={values.discountValue} onChange={(event) => update('discountValue', event.target.value)} placeholder={values.discountType === 'percentage' ? '20' : '25.00'} /></FormField>
            <FormField label="Start date" name="startDate" error={errors.startDate}><input id="startDate" type="date" value={values.startDate} onChange={(event) => update('startDate', event.target.value)} /></FormField>
            <FormField label="End date" name="endDate" error={errors.endDate}><input id="endDate" type="date" value={values.endDate} onChange={(event) => update('endDate', event.target.value)} /></FormField>
            <div className="form-span-2"><FormField label="Description" name="description" hint="Optional · a short note for your team"><textarea id="description" rows="3" maxLength={1000} value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="What makes this promotion special?" /></FormField></div>
            <label className="toggle-row form-span-2"><span><strong>Promotion enabled</strong><small>Customers can use this promotion during its scheduled dates.</small></span><input type="checkbox" checked={values.isActive} onChange={(event) => update('isActive', event.target.checked)} /><span className="toggle-ui" /></label>
          </div>
          <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy && <LoaderCircle size={16} className="spin" />}{busy ? 'Saving…' : record ? 'Save changes' : 'Create promotion'}</button></div>
        </form>
      </section>
    </div>
  );
}
