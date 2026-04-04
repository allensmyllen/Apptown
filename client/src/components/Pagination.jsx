import { useSearchParams } from 'react-router-dom';

export default function Pagination({ hasNext }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  function go(delta) {
    const params = Object.fromEntries(searchParams);
    params.page = String(page + delta);
    setSearchParams(params);
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
      <button
        onClick={() => go(-1)}
        disabled={page <= 1}
        className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ← Previous
      </button>
      <span className="text-sm text-gray-600">Page {page}</span>
      <button
        onClick={() => go(1)}
        disabled={!hasNext}
        className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </nav>
  );
}
