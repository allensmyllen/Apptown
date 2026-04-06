import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';

// Generic category icon SVG
function CategoryIcon({ className = 'w-6 h-6' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Keep local search input in sync with URL
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const activeCategory = searchParams.get('category') || '';
  const hasFilters = searchParams.get('search') || activeCategory;

  // Fetch products when search params change
  useEffect(() => {
    const params = Object.fromEntries(searchParams);
    api.get('/products', { params }).then((res) => {
      setProducts(res.data.products || []);
      setHasNext((res.data.products || []).length === 20);
    }).catch(() => setProducts([]));
  }, [searchParams]);

  // Fetch categories from API (dynamic)
  useEffect(() => {
    api.get('/categories').then((res) => {
      setCategories(res.data.categories || []);
    }).catch(() => setCategories([]));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const params = Object.fromEntries(searchParams);
    if (search) params.search = search;
    else delete params.search;
    params.page = '1';
    setSearchParams(params);
  }

  function setCategory(slug) {
    const params = Object.fromEntries(searchParams);
    if (slug) params.category = slug;
    else delete params.category;
    params.page = '1';
    setSearchParams(params);
  }

  // Find active category name for display
  const activeCategoryName = categories.find(c => c.slug === activeCategory)?.name || activeCategory.replace(/_/g, ' ');

  return (
    <div className="-mx-4">
      {/* Hero */}
      <div
        className="relative text-white py-16 sm:py-28 px-4 sm:px-6 overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1600&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(13,13,26,0.82)' }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4 text-white">
            Premium Digital Assets<br />
            <span style={{ color: '#3781EE' }}>for Every Project</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg mb-8">
            Discover thousands of themes, plugins, scripts and source code made by world-class developers.
          </p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <input
              type="search"
              placeholder="e.g. responsive WordPress theme..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-5 py-3 rounded-lg text-gray-900 text-sm focus:outline-none"
              style={{ outline: 'none' }}
            />
            <button type="submit"
              style={{ backgroundColor: '#3781EE' }}
              className="text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors hover:opacity-90">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Dynamic category cards */}
        {!hasFilters && categories.length > 0 && (
          <div className="mb-10">
            <div className={`grid gap-4 ${categories.length <= 2 ? 'grid-cols-2' : categories.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setCategory(cat.slug)}
                  className="bg-white border border-gray-100 rounded-xl p-5 text-left shadow-sm hover:shadow-md hover:border-primary/40 transition-all group">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                    <CategoryIcon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-gray-800 group-hover:text-primary capitalize">{cat.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{cat.slug}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm text-gray-500">Showing results for:</span>
            {activeCategory && (
              <span className="bg-blue-100 text-primary text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 capitalize">
                {activeCategoryName}
                <button onClick={() => setCategory('')} className="ml-1 hover:text-primary">✕</button>
              </span>
            )}
            {searchParams.get('search') && (
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                "{searchParams.get('search')}"
                <button onClick={() => { setSearch(''); const p = Object.fromEntries(searchParams); delete p.search; setSearchParams(p); }}
                  className="ml-1 hover:text-blue-900">✕</button>
              </span>
            )}
          </div>
        )}

        {/* Featured panel + product grid */}
        <div className="flex gap-6 items-start">
          {/* Left featured panel */}
          {!hasFilters && (
            <div className="hidden lg:flex w-64 shrink-0 bg-white border border-gray-200 rounded-xl p-6 flex-col justify-between min-h-[420px]">
              <div>
                <h2 className="text-xl font-bold text-gray-800 leading-snug mb-3">
                  Browse this week's best selling digital assets
                </h2>
                <p className="text-sm text-gray-500">
                  The best web themes, plugins &amp; scripts have arrived.
                </p>
                {/* Dynamic category links in panel */}
                {categories.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {categories.slice(0, 5).map(cat => (
                      <li key={cat.id}>
                        <button onClick={() => setCategory(cat.slug)}
                          className="text-sm text-gray-600 hover:text-primary flex items-center gap-2 transition-colors capitalize">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          {cat.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {categories.length > 0 && (
                <button onClick={() => setCategory(categories[0].slug)}
                  className="mt-6 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors w-fit">
                  View more bestsellers
                </button>
              )}
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-500">No products found</p>
                <button onClick={() => setSearchParams({})} className="mt-4 text-primary hover:underline text-sm">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
            {products.length > 0 && <div className="mt-10"><Pagination hasNext={hasNext} /></div>}
          </div>
        </div>
      </div>

      {/* End of content */}
    </div>
  );
}
