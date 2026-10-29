import { FileSearch } from 'lucide-react';

export default function DataTable({ columns, rows, rowKey, loading, emptyTitle, emptyDescription, onRowClick }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr>{columns.map((column) => <th key={column.key} className={column.className}>{column.label}</th>)}</tr></thead>
        <tbody>
          {loading && Array.from({ length: 5 }, (_, index) => (
            <tr key={`loading-${index}`}><td colSpan={columns.length}><div className="skeleton table-skeleton" /></td></tr>
          ))}
          {!loading && rows.map((row) => (
            <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}>
              {columns.map((column) => <td key={column.key} className={column.className}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (
        <div className="table-empty"><span className="empty-icon"><FileSearch size={21} /></span><strong>{emptyTitle}</strong><p>{emptyDescription}</p></div>
      )}
    </div>
  );
}
