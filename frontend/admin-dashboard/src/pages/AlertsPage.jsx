import { useCallback, useEffect, useState } from 'react';
import { BellRing, Check, CircleCheckBig, Eye, Pencil, Plus, RefreshCw, RotateCcw, Search, ShieldAlert, Siren, Trash2, Bot, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AlertForm from '../components/AlertForm.jsx';
import AlertDetailsDialog from '../components/AlertDetailsDialog.jsx';
import DetectionPanel from '../components/DetectionPanel.jsx';
import useAlertRecords from '../hooks/useAlertRecords.js';
import { changeAlertStatus, createAlert, deleteAlert, getAlertStats, getScanStatus, runScan, updateAlert } from '../services/alert-service.js';
import { getApiErrorMessage } from '../services/api-client.js';
import { ALERT_STATUSES, ALERT_TYPES, SEVERITIES, formatDateTime, statusInfo, typeLabel } from '../utils/alert-format.js';
import './alerts.css';

const actionMessages = { acknowledge: 'Alert acknowledged', resolve: 'Alert resolved', reopen: 'Alert reopened' };
const alertError = (error) => getApiErrorMessage(error, 'Alert Service');

function fieldErrors(error) {
  return Object.fromEntries((error.response?.data?.error?.details ?? []).map(({ field, message }) => [field, message]));
}

export default function AlertsPage() {
  const records = useAlertRecords();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const [nextStats, nextStatus] = await Promise.all([getAlertStats(), getScanStatus()]);
      setStats(nextStats);
      setScanStatus(nextStatus);
      setStatusError('');
    } catch (error) {
      setStatusError(alertError(error));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  function refreshAll() {
    records.reload();
    loadOverview();
  }

  async function scanNow() {
    setScanning(true);
    setScanError('');
    try {
      const result = await runScan();
      toast.success('Scan complete', { description: result.message });
    } catch (error) {
      const message = alertError(error);
      setScanError(message);
      toast.error('Scan failed', { description: message });
    } finally {
      setScanning(false);
      refreshAll();
    }
  }

  async function applyAction(alert, action) {
    setBusyAction(action);
    try {
      const updated = await changeAlertStatus(alert._id, action);
      toast.success(actionMessages[action], { description: updated.title });
      if (viewing?._id === alert._id) setViewing(updated);
      refreshAll();
    } catch (error) {
      toast.error(alertError(error));
    } finally {
      setBusyAction('');
    }
  }

  async function save(payload) {
    try {
      const saved = editing ? await updateAlert(editing._id, payload) : await createAlert(payload);
      toast.success(editing ? 'Alert updated' : 'Alert created', { description: saved.title });
      if (viewing?._id === saved._id) setViewing(saved);
      setFormOpen(false);
      setEditing(null);
      refreshAll();
    } catch (error) {
      toast.error(alertError(error));
      throw Object.assign(new Error('Alert could not be saved.'), { fieldErrors: fieldErrors(error) });
    }
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    try {
      await deleteAlert(deleting._id);
      toast.success('Alert deleted', { description: deleting.title });
      if (viewing?._id === deleting._id) setViewing(null);
      setDeleting(null);
      refreshAll();
    } catch (error) {
      toast.error(alertError(error));
    } finally {
      setDeleteBusy(false);
    }
  }

  function openEdit(alert) {
    setEditing(alert);
    setFormOpen(true);
  }

  const stop = (handler) => (event) => { event.stopPropagation(); handler(); };

  const columns = [
    { key: 'severity', label: 'Severity', render: (row) => <SeverityBadge severity={row.severity} /> },
    { key: 'title', label: 'Alert', render: (row) => <div className="alert-identity"><span className={`alert-source-icon alert-source-${row.source === 'manual' ? 'manual' : 'auto'}`} title={row.source === 'manual' ? 'Created manually' : 'Smart detection'}>{row.source === 'manual' ? <UserRound size={14} /> : <Bot size={14} />}</span><div className="table-primary alert-title-cell"><strong>{row.title}</strong><span>{row.description || 'No description'}</span></div></div> },
    { key: 'type', label: 'Category', render: (row) => <span className="code-chip">{typeLabel(row.type)}</span> },
    { key: 'related', label: 'Related entity', render: (row) => row.relatedEntityLabel ? <div className="table-primary"><strong>{row.relatedEntityLabel}</strong><span>{row.relatedEntityType}</span></div> : <span className="muted-dash">—</span> },
    { key: 'status', label: 'Status', render: (row) => { const status = statusInfo(row.status); return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>; } },
    { key: 'createdAt', label: 'Created at', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'actions', label: '', className: 'actions-cell alert-actions-cell', render: (row) => (
        <div className="row-actions">
          <button title="View details" aria-label={`View ${row.title}`} onClick={stop(() => setViewing(row))}><Eye size={15} /></button>
          {row.status === 'new' && <button title="Acknowledge" aria-label={`Acknowledge ${row.title}`} className="ack-action" disabled={Boolean(busyAction)} onClick={stop(() => applyAction(row, 'acknowledge'))}><Check size={15} /></button>}
          {row.status !== 'resolved' && <button title="Resolve" aria-label={`Resolve ${row.title}`} className="resolve-action" disabled={Boolean(busyAction)} onClick={stop(() => applyAction(row, 'resolve'))}><CircleCheckBig size={15} /></button>}
          {row.status === 'resolved' && <button title="Reopen" aria-label={`Reopen ${row.title}`} disabled={Boolean(busyAction)} onClick={stop(() => applyAction(row, 'reopen'))}><RotateCcw size={15} /></button>}
          <button title="Edit" aria-label={`Edit ${row.title}`} onClick={stop(() => openEdit(row))}><Pencil size={15} /></button>
          <button title="Delete" aria-label={`Delete ${row.title}`} className="delete-action" onClick={stop(() => setDeleting(row))}><Trash2 size={15} /></button>
        </div>
      )
    }
  ];

  const maxCategory = Math.max(1, ...(stats?.byType ?? []).map((entry) => entry.count));

  return (
    <>
      <PageHeader eyebrow="ALERT INTELLIGENCE CENTER" title="Alerts" description="Detect, investigate and act on the conditions that need your attention." action={<button className="button button-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={17} /> New alert</button>} />

      <section className="stats-grid">
        <StatCard label="Total alerts" value={stats?.total ?? '—'} note="All records" icon={BellRing} tone="brown" loading={statsLoading} />
        <StatCard label="Critical alerts" value={stats?.openCritical ?? '—'} note={stats ? `${stats.critical} critical in total` : 'Still open'} icon={Siren} tone="red" loading={statsLoading} />
        <StatCard label="New alerts" value={stats?.new ?? '—'} note={stats ? `${stats.acknowledged} acknowledged` : 'Awaiting review'} icon={ShieldAlert} tone="sand" loading={statsLoading} />
        <StatCard label="Resolved alerts" value={stats?.resolved ?? '—'} note="Handled" icon={CircleCheckBig} tone="green" loading={statsLoading} />
      </section>

      <div className="alerts-overview">
        <DetectionPanel status={scanStatus} statusError={statusError} scanning={scanning} scanError={scanError} onScan={scanNow} />
        <section className="content-card category-card">
          <div className="card-heading"><div><h3>Alerts per category</h3><p>Counted by MongoDB · darker = still open</p></div></div>
          <ul className="category-list">
            {(stats?.byType ?? []).map((entry) => (
              <li key={entry.type}>
                <button type="button" className={records.filters.type === entry.type ? 'category-selected' : ''} onClick={() => records.changeFilter('type', records.filters.type === entry.type ? '' : entry.type)} title="Filter the table by this category">
                  <span className="category-name">{typeLabel(entry.type)}</span>
                  <span className="category-bar"><i style={{ width: `${(entry.count / maxCategory) * 100}%` }} /><b style={{ width: `${(entry.open / maxCategory) * 100}%` }} /></span>
                  <strong>{entry.count}</strong>
                </button>
              </li>
            ))}
            {!stats && <li className="category-empty">{statsLoading ? 'Loading…' : 'Statistics unavailable'}</li>}
          </ul>
          {stats && (
            <div className="severity-breakdown">
              <span>By severity</span>
              <div>{SEVERITIES.map((option) => <button type="button" key={option.value} className={`severity-chip severity-${option.value} ${records.filters.severity === option.value ? 'severity-chip-selected' : ''}`} onClick={() => records.changeFilter('severity', records.filters.severity === option.value ? '' : option.value)} title="Filter the table by this severity"><strong>{stats.bySeverity[option.value]}</strong>{option.label}</button>)}</div>
            </div>
          )}
        </section>
      </div>

      <section className="content-card management-card">
        <div className="management-toolbar">
          <div className="toolbar-intro"><span className="toolbar-icon toolbar-icon-alert"><Siren size={17} /></span><div><h3>All alerts</h3><p>{records.meta.totalItems} {records.meta.totalItems === 1 ? 'alert' : 'alerts'}{records.filtered ? ' match your filters' : ' in your workspace'}</p></div></div>
          <div className="toolbar-controls alert-toolbar-controls">
            <label className="search-field"><Search size={16} /><input value={records.filters.search} onChange={(event) => records.changeFilter('search', event.target.value)} placeholder="Search title or description…" aria-label="Search alerts" /></label>
            <select className="filter-select" value={records.filters.severity} onChange={(event) => records.changeFilter('severity', event.target.value)} aria-label="Filter by severity"><option value="">All severities</option>{SEVERITIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <select className="filter-select" value={records.filters.status} onChange={(event) => records.changeFilter('status', event.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{ALERT_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <select className="filter-select" value={records.filters.type} onChange={(event) => records.changeFilter('type', event.target.value)} aria-label="Filter by category"><option value="">All categories</option>{ALERT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <select className="filter-select" value={records.filters.sort} onChange={(event) => records.changeFilter('sort', event.target.value)} aria-label="Sort alerts"><option value="severity">Critical first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
            <button className="icon-button refresh-button" aria-label="Refresh alerts" onClick={refreshAll}><RefreshCw size={16} /></button>
          </div>
        </div>
        {records.error && <div className="inline-error" role="alert"><span>{records.error}</span><button className="button button-secondary button-small" onClick={refreshAll}>Retry</button></div>}
        <div className="alerts-table">
          <DataTable columns={columns} rows={records.records} rowKey={(row) => row._id} loading={records.loading} onRowClick={setViewing}
            emptyTitle={records.error ? 'Alerts could not be loaded' : records.filtered ? 'No alerts match these filters' : 'No alerts yet'}
            emptyDescription={records.error ? 'Check that the Alert Service and MongoDB are running.' : records.filtered ? 'Try another search or clear the filters.' : 'Click “Scan Now” to run the detection rules, or create an alert.'} />
        </div>
        {records.filtered && !records.loading && <div className="clear-filters"><button className="text-link" onClick={records.clearFilters}>Clear all filters</button></div>}
        <Pagination meta={records.meta} page={records.page} setPage={records.setPage} loading={records.loading} />
      </section>

      <AlertDetailsDialog alert={viewing} busyAction={busyAction} onClose={() => setViewing(null)} onAction={applyAction} onEdit={openEdit} onDelete={setDeleting} />
      <AlertForm open={formOpen} record={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={save} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete this alert?" description={deleting ? `“${deleting.title}” will be permanently removed from MongoDB. This cannot be undone.` : ''} busy={deleteBusy} onCancel={() => !deleteBusy && setDeleting(null)} onConfirm={confirmDelete} />
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
