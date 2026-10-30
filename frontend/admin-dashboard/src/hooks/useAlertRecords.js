import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/api-client.js';
import { listAlerts } from '../services/alert-service.js';

const emptyFilters = { search: '', severity: '', status: '', type: '', sort: 'severity' };

// Same idea as usePagedRecords, with the extra alert filters (severity, type, sort).
export default function useAlertRecords() {
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 10, sort: filters.sort };
        for (const key of ['search', 'severity', 'status', 'type']) {
          if (filters[key].trim()) params[key] = filters[key].trim();
        }
        const result = await listAlerts(params);
        if (!active) return;
        setRecords(result.data);
        setMeta(result.meta);
        if (result.meta.totalPages > 0 && page > result.meta.totalPages) setPage(result.meta.totalPages);
      } catch (requestError) {
        if (active) {
          setRecords([]);
          setMeta({ page, limit: 10, totalItems: 0, totalPages: 0 });
          setError(getApiErrorMessage(requestError, 'Alert Service'));
        }
      } finally {
        if (active) setLoading(false);
      }
    }, filters.search ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, filters, refreshKey]);

  function changeFilter(field, value) {
    setPage(1);
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(emptyFilters);
  }

  const filtered = Boolean(filters.search || filters.severity || filters.status || filters.type);

  return { records, meta, page, setPage, filters, changeFilter, clearFilters, filtered, loading, error, reload };
}
