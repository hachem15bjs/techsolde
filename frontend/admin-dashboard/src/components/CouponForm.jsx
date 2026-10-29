import { useEffect, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import FormField from './FormField.jsx';

function initialValues(record) {
  return {
    code: record?.code ?? '',
    description: record?.description ?? '',
    discountType: record?.discountType ?? 'percentage',
    discountValue: record?.discountValue ?? '',
    usageLimit: record?.usageLimit ?? '',
    usedCount: record?.usedCount ?? 0,
    expirationDate: record?.expirationDate ? new Date(record.expirationDate).toISOString().slice(0, 10) : '',
    isActive: record?.isActive ?? true
  };
}

export default function CouponForm({ open, record, onClose, onSubmit }) {
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
    if (!values.code.trim()) nextErrors.code = 'Enter a coupon code.';
    if (!values.discountValue || Number(values.discountValue) <= 0) nextErrors.discountValue = 'Enter a value greater than zero.';
    if (values.discountType === 'percentage' && Number(values.discountValue) > 100) nextErrors.discountValue = 'A percentage cannot exceed 100.';
    if (!values.expirationDate) nextErrors.expirationDate = 'Choose an expiration date.';
    if (values.usageLimit !== '' && (!Number.isInteger(Number(values.usageLimit)) || Number(values.usageLimit) < 0)) nextErrors.usageLimit = 'Use a non-negative whole number.';
    if (values.usageLimit !== '' && Number(values.usedCount) > Number(values.usageLimit)) nextErrors.usedCount = 'Used count cannot exceed the limit.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const payload = {
        ...values,
        code: values.code.trim().toUpperCase(),
        discountValue: Number(values.discountValue),
        usedCount: Number(values.usedCount),
        expirationDate: `${values.expirationDate}T23:59:59.999Z`
      };
      if (values.usageLimit === '') payload.usageLimit = null;
      else payload.usageLimit = Number(values.usageLimit);
      await onSubmit(payload);
    } catch (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors);
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="coupon-form-title">
        <div className="form-dialog-header"><div><span className="eyebrow">COUPON DETAILS</span><h3 id="coupon-form-title">{record ? 'Edit coupon' : 'Create coupon'}</h3><p>Configure a reusable coupon code.</p></div><button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <FormField label="Coupon code" name="code" error={errors.code}><input id="code" value={values.code} onChange={(event) => update('code', event.target.value.toUpperCase())} placeholder="e.g. WELCOME10" maxLength={40} /></FormField>
            <FormField label="Discount type" name="discountType"><select id="discountType" value={values.discountType} onChange={(event) => update('discountType', event.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed amount (€)</option></select></FormField>
            <FormField label="Discount value" name="discountValue" error={errors.discountValue}><input id="discountValue" type="number" min="0.01" max={values.discountType === 'percentage' ? 100 : undefined} step="0.01" value={values.discountValue} onChange={(event) => update('discountValue', event.target.value)} /></FormField>
            <FormField label="Usage limit" name="usageLimit" error={errors.usageLimit} hint="Leave empty for unlimited uses"><input id="usageLimit" type="number" min="0" step="1" value={values.usageLimit} onChange={(event) => update('usageLimit', event.target.value)} placeholder="Unlimited" /></FormField>
            <FormField label="Times used" name="usedCount" error={errors.usedCount}><input id="usedCount" type="number" min="0" step="1" value={values.usedCount} onChange={(event) => update('usedCount', event.target.value)} /></FormField>
            <FormField label="Expiration date" name="expirationDate" error={errors.expirationDate}><input id="expirationDate" type="date" value={values.expirationDate} onChange={(event) => update('expirationDate', event.target.value)} /></FormField>
            <div className="form-span-2"><FormField label="Description" name="description" hint="Optional · a short note for your team"><textarea id="description" rows="3" maxLength={1000} value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Add context about this coupon" /></FormField></div>
            <label className="toggle-row form-span-2"><span><strong>Coupon enabled</strong><small>Customers can apply this coupon while it is available.</small></span><input type="checkbox" checked={values.isActive} onChange={(event) => update('isActive', event.target.checked)} /><span className="toggle-ui" /></label>
          </div>
          <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy && <LoaderCircle size={16} className="spin" />}{busy ? 'Saving…' : record ? 'Save changes' : 'Create coupon'}</button></div>
        </form>
      </section>
    </div>
  );
}
