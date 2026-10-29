import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/api-client.js';

export default function usePagedRecords(listRecords) {
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
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
        const result = await listRecords({
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: status || undefined,
          sort: 'desc'
        });
        if (!active) return;
        setRecords(result.data);
        setMeta(result.meta);
        if (result.meta.totalPages > 0 && page > result.meta.totalPages) setPage(result.meta.totalPages);
      } catch (requestError) {
        if (active) {
          setRecords([]);
          setMeta({ page, limit: 10, totalItems: 0, totalPages: 0 });
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (active) setLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [listRecords, page, search, status, refreshKey]);

  function changeSearch(value) {
    setPage(1);
    setSearch(value);
  }

  function changeStatus(value) {
    setPage(1);
    setStatus(value);
  }

  return { records, meta, page, setPage, search, changeSearch, status, changeStatus, loading, error, reload };
}
