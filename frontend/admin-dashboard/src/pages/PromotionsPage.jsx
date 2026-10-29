import { useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PromotionForm from '../components/PromotionForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import usePagedRecords from '../hooks/usePagedRecords.js';
import { createPromotion, deletePromotion, listPromotions, updatePromotion } from '../services/promotion-service.js';
import { getApiErrorMessage } from '../services/api-client.js';
import { formatDate, formatDiscount } from '../utils/format.js';

const searchFields = { search: 'Search title or code…', status: 'All statuses' };

function fieldErrors(error) {
  return Object.fromEntries((error.response?.data?.error?.details ?? []).map(({ field, message }) => [field, message]));
}

export default function PromotionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const records = usePagedRecords(listPromotions);
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
      if (selected) await updatePromotion(selected._id, payload);
      else await createPromotion(payload);
      toast.success(selected ? 'Promotion updated' : 'Promotion created', { description: `${payload.code} is ready in your promotions.` });
      setFormOpen(false);
      setSelected(null);
      records.reload();
    } catch (error) {
      const errors = fieldErrors(error);
      if (error.response?.status === 409) errors.code = 'This code is already in use.';
      toast.error(getApiErrorMessage(error));
      throw Object.assign(new Error('Promotion could not be saved.'), { fieldErrors: errors });
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deletePromotion(deleting._id);
      toast.success('Promotion deleted', { description: `${deleting.title} has been removed.` });
      setDeleting(null);
      records.reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: 'title', label: 'Promotion', render: (row) => <div className="table-primary"><strong>{row.title}</strong><span>{row.description || 'No description'}</span></div> },
    { key: 'code', label: 'Code', render: (row) => <span className="code-chip">{row.code}</span> },
    { key: 'discountValue', label: 'Discount', render: (row) => <strong className="discount-value">{formatDiscount(row.discountType, row.discountValue)}</strong> },
    { key: 'startDate', label: 'Start date', render: (row) => formatDate(row.startDate) },
    { key: 'endDate', label: 'End date', render: (row) => formatDate(row.endDate) },
    { key: 'isActive', label: 'Status', render: (row) => <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge> },
    { key: 'actions', label: '', className: 'actions-cell', render: (row) => <div className="row-actions"><button title="Edit promotion" aria-label={`Edit ${row.title}`} onClick={() => { setSelected(row); setFormOpen(true); }}><Pencil size={15} /></button><button title="Delete promotion" aria-label={`Delete ${row.title}`} className="delete-action" onClick={() => setDeleting(row)}><Trash2 size={15} /></button></div> }
  ];

  return (
    <>
      <PageHeader eyebrow="OFFER MANAGEMENT" title="Promotions" description="Create and manage the offers your customers see." action={<button className="button button-primary" onClick={() => { setSelected(null); setFormOpen(true); }}><Plus size={17} /> New promotion</button>} />
      <section className="content-card management-card">
        <div className="management-toolbar">
          <div className="toolbar-intro"><span className="toolbar-icon toolbar-icon-brown"><span /></span><div><h3>All promotions</h3><p>{records.meta.totalItems} {records.meta.totalItems === 1 ? 'offer' : 'offers'} in your workspace</p></div></div>
          <div className="toolbar-controls">
            <label className="search-field"><Search size={16} /><input value={records.search} onChange={(event) => records.changeSearch(event.target.value)} placeholder={searchFields.search} aria-label="Search promotions" /></label>
            <select className="filter-select" value={records.status} onChange={(event) => records.changeStatus(event.target.value)} aria-label="Filter promotions by status"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            <button className="icon-button refresh-button" aria-label="Refresh promotions" onClick={records.reload}><RefreshCw size={16} /></button>
          </div>
        </div>
        {records.error && <div className="inline-error" role="alert"><span>{records.error}</span><button className="button button-secondary button-small" onClick={records.reload}>Retry</button></div>}
        <DataTable columns={columns} rows={records.records} rowKey={(row) => row._id} loading={records.loading} emptyTitle={records.error ? 'Promotions could not be loaded' : 'No promotions found'} emptyDescription={records.error ? 'Check that the Promotion Service and database are running.' : 'Try a different search or create your first promotion.'} />
        <Pagination meta={records.meta} page={records.page} setPage={records.setPage} loading={records.loading} />
      </section>
      <PromotionForm open={formOpen} record={selected} onClose={() => { setFormOpen(false); setSelected(null); }} onSubmit={save} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete this promotion?" description={deleting ? `“${deleting.title}” (${deleting.code}) will be permanently removed. This cannot be undone.` : ''} busy={busy} onCancel={() => !busy && setDeleting(null)} onConfirm={confirmDelete} />
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
