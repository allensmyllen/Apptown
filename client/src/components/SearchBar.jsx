import { useSearchParams } from 'react-router-dom';

export default function SearchBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get('search') || '';

  function handleChange(e) {
    const params = Object.fromEntries(searchParams);
    if (e.target.value) {
      params.search = e.target.value;
    } else {
      delete params.search;
    }
    params.page = '1';
    setSearchParams(params);
  }

  return (
    <input
      type="search"
      placeholder="Search products..."
      value={value}
      onChange={handleChange}
      aria-label="Search products"
    />
  );
}
