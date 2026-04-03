import { useSearchParams } from 'react-router-dom';

const CATEGORIES = ['theme', 'plugin', 'script', 'source_code'];

export default function FilterPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get('category') || '';

  function handleChange(e) {
    const params = Object.fromEntries(searchParams);
    if (e.target.checked) {
      params.category = e.target.value;
    } else {
      delete params.category;
    }
    params.page = '1';
    setSearchParams(params);
  }

  return (
    <fieldset>
      <legend>Category</legend>
      {CATEGORIES.map((cat) => (
        <label key={cat}>
          <input
            type="checkbox"
            value={cat}
            checked={current === cat}
            onChange={handleChange}
          />
          {cat}
        </label>
      ))}
    </fieldset>
  );
}
