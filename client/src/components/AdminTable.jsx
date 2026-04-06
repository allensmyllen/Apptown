/**
 * Shared professional table component for admin pages.
 * Usage:
 *   <AdminTable cols={['Name','Email','Status']} empty="No users found.">
 *     <tr>...</tr>
 *   </AdminTable>
 */
export function AdminTable({ cols = [], children, empty = 'No data found.', loading = false }) {
  const colSpan = cols.length;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm border-collapse" style={{ minWidth: colSpan * 120 }}>
        <thead>
          <tr className="bg-[#f8fafc] border-b border-gray-200">
            {cols.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap
                  ${i === cols.length - 1 ? 'text-right pr-5' : 'text-left'}`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading…
                </div>
              </td>
            </tr>
          ) : !children || (Array.isArray(children) && children.length === 0) ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-400 text-sm">{empty}</td>
            </tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

/** Reusable TD with consistent padding */
export function Td({ children, right = false, mono = false, className = '' }) {
  return (
    <td className={`px-4 py-3.5 align-middle ${right ? 'text-right pr-5' : ''} ${mono ? 'font-mono' : ''} ${className}`}>
      {children}
    </td>
  );
}

/** Status badge */
export function Badge({ status }) {
  const map = {
    completed: 'bg-blue-50 text-primary ring-primary/30',
    active:    'bg-blue-50 text-primary ring-primary/30',
    open:      'bg-blue-50 text-blue-700 ring-blue-200',
    pending:   'bg-amber-50 text-amber-700 ring-amber-200',
    blocked:   'bg-amber-50 text-amber-700 ring-amber-200',
    failed:    'bg-red-50 text-red-700 ring-red-200',
    banned:    'bg-red-50 text-red-700 ring-red-200',
    closed:    'bg-gray-100 text-gray-600 ring-gray-200',
  };
  const cls = map[status] || 'bg-gray-50 text-gray-600 ring-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ring-1 ring-inset capitalize ${cls}`}>
      {status}
    </span>
  );
}

/** Action button variants */
export function ActionBtn({ onClick, variant = 'default', children }) {
  const variants = {
    default: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200',
    primary: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200',
    danger:  'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200',
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${variants[variant]}`}
    >
      {children}
    </button>
  );
}
