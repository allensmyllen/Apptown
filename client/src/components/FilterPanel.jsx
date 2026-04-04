import { useSearchParams } from 'react-router-dom';

const CATEGORIES = ['theme', 'plugin', 'script', 'source_code'];

export default function FilterPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get('category') || '';

  function handleChange(e) {
    const params = Object.fromEntries(searchParams);
    if (e.target.checked) params.category = e.target.value;
    else delete params.category;
    params.page = '1';
    setSearchParams(params);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Category</h3>
      <div className="space-y-2">
        {CATEGORIES.map((cat) => (
          <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-indigo-600">
            <input
              type="checkbox"
              value={cat}
              checked={current === cat}
              onChange={handleChange}
              className="accent-indigo-600"
            />
            {cat.replace('_', ' ')}
          </label>
        ))}
      </div>
    </div>
  );
}
