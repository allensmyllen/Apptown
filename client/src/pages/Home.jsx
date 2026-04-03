import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import Pagination from '../components/Pagination';

export default function Home() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    const params = Object.fromEntries(searchParams);
    api.get('/products', { params }).then((res) => {
      setProducts(res.data.products);
      setHasNext(res.data.products.length === 20);
    });
  }, [searchParams]);

  return (
    <main>
      <h1>Marketplace</h1>
      <SearchBar />
      <FilterPanel />
      <div>
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      <Pagination hasNext={hasNext} />
    </main>
  );
}
