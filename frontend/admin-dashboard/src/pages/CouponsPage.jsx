import { useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, TicketPercent, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CouponForm from '../components/CouponForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import usePagedRecords from '../hooks/usePagedRecords.js';
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '../services/coupon-service.js';
import { getApiErrorMessage } from '../services/api-client.js';
import { formatDate, formatDiscount, getCouponAvailability } from '../utils/format.js';

function fieldErrors(error) {
  return Object.fromEntries((error.response?.data?.error?.details ?? []).map(({ field, message }) => [field, message]));
}

export default function CouponsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const records = usePagedRecords(listCoupons);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setSelected(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function save(payload) {
    try {
      if (selected) await updateCoupon(selected._id, payload);
      else await createCoupon(payload);
      toast.success(selected ? 'Coupon updated' : 'Coupon created', { description: `${payload.code} is ready in your coupons.` });
      setFormOpen(false);
      setSelected(null);
      records.reload();
    } catch (error) {
      const errors = fieldErrors(error);
      if (error.response?.status === 409) errors.code = 'This code is already in use.';
      toast.error(getApiErrorMessage(error));
      throw Object.assign(new Error('Coupon could not be saved.'), { fieldErrors: errors });
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deleteCoupon(deleting._id);
      toast.success('Coupon deleted', { description: `${deleting.code} has been removed.` });
      setDeleting(null);
      records.reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: 'code', label: 'Coupon', render: (row) => <div className="coupon-identity"><span className="coupon-icon"><TicketPercent size={17} /></span><div className="table-primary"><strong>{row.code}</strong><span>{row.description || 'No description'}</span></div></div> },
    { key: 'discountValue', label: 'Discount', render: (row) => <strong className="discount-value">{formatDiscount(row.discountType, row.discountValue)}</strong> },
    { key: 'usage', label: 'Usage', render: (row) => <div className="usage-cell"><strong>{row.usedCount}{row.usageLimit != null ? ` / ${row.usageLimit}` : ''}</strong>{row.usageLimit != null && <span className="usage-track"><i style={{ width: `${Math.min(100, row.usageLimit ? row.usedCount / row.usageLimit * 100 : 100)}%` }} /></span>}</div> },
    { key: 'expirationDate', label: 'Expires', render: (row) => formatDate(row.expirationDate) },
    { key: 'availability', label: 'Availability', render: (row) => { const availability = getCouponAvailability(row); return <StatusBadge tone={availability.tone}>{availability.label}</StatusBadge>; } },
    { key: 'actions', label: '', className: 'actions-cell', render: (row) => <div className="row-actions"><button title="Edit coupon" aria-label={`Edit ${row.code}`} onClick={() => { setSelected(row); setFormOpen(true); }}><Pencil size={15} /></button><button title="Delete coupon" aria-label={`Delete ${row.code}`} className="delete-action" onClick={() => setDeleting(row)}><Trash2 size={15} /></button></div> }
  ];

  return (
    <>
      <PageHeader eyebrow="CUSTOMER INCENTIVES" title="Coupons" description="Keep an eye on your coupon codes, usage, and availability." action={<button className="button button-primary" onClick={() => { setSelected(null); setFormOpen(true); }}><Plus size={17} /> New coupon</button>} />
      <section className="content-card management-card">
        <div className="management-toolbar">
          <div className="toolbar-intro"><span className="toolbar-icon toolbar-icon-lavender"><TicketPercent size={17} /></span><div><h3>All coupons</h3><p>{records.meta.totalItems} {records.meta.totalItems === 1 ? 'coupon' : 'coupons'} in your workspace</p></div></div>
          <div className="toolbar-controls">
            <label className="search-field"><Search size={16} /><input value={records.search} onChange={(event) => records.changeSearch(event.target.value)} placeholder="Search code or description…" aria-label="Search coupons" /></label>
            <select className="filter-select" value={records.status} onChange={(event) => records.changeStatus(event.target.value)} aria-label="Filter coupons by status"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            <button className="icon-button refresh-button" aria-label="Refresh coupons" onClick={records.reload}><RefreshCw size={16} /></button>
          </div>
        </div>
        {records.error && <div className="inline-error" role="alert"><span>{records.error}</span><button className="button button-secondary button-small" onClick={records.reload}>Retry</button></div>}
        <DataTable columns={columns} rows={records.records} rowKey={(row) => row._id} loading={records.loading} emptyTitle={records.error ? 'Coupons could not be loaded' : 'No coupons found'} emptyDescription={records.error ? 'Check that the Promotion Service and database are running.' : 'Try a different search or create your first coupon.'} />
        <Pagination meta={records.meta} page={records.page} setPage={records.setPage} loading={records.loading} />
      </section>
      <CouponForm open={formOpen} record={selected} onClose={() => { setFormOpen(false); setSelected(null); }} onSubmit={save} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete this coupon?" description={deleting ? `“${deleting.code}” will be permanently removed. This cannot be undone.` : ''} busy={busy} onCancel={() => !busy && setDeleting(null)} onConfirm={confirmDelete} />
    </>
  );
}

function Pagination({ meta, page, setPage, loading }) {
  if (!meta.totalItems) return null;
  const start = (page - 1) * meta.limit + 1;
  const end = Math.min(page * meta.limit, meta.totalItems);
  return (
    <div className="pagination">
      <span>Showing <strong>{start}–{end}</strong> of <strong>{meta.totalItems}</strong></span>
      <div><button className="button button-secondary button-small" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="page-count">Page {page} of {Math.max(meta.totalPages, 1)}</span><button className="button button-secondary button-small" disabled={page >= meta.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div>
    </div>
  );
}
