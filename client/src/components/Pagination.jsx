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
    <nav aria-label="Pagination">
      <button onClick={() => go(-1)} disabled={page <= 1}>Previous</button>
      <span>Page {page}</span>
      <button onClick={() => go(1)} disabled={!hasNext}>Next</button>
    </nav>
  );
}
