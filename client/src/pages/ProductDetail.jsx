import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/products/${id}`).then((res) => setProduct(res.data));
  }, [id]);

  async function handleBuy() {
    try {
      const res = await api.post('/orders', { productId: id });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Purchase failed');
    }
  }

  if (!product) return <p>Loading...</p>;

  return (
    <main>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <p>${(product.price_cents / 100).toFixed(2)}</p>
      <p>{product.category}</p>
      {product.preview_link && (
        <a href={product.preview_link} target="_blank" rel="noopener noreferrer">
          Live Preview
        </a>
      )}
      {error && <p role="alert">{error}</p>}
      {user && <button onClick={handleBuy}>Buy Now</button>}
      {!user && <p><a href="/login">Log in</a> to purchase</p>}
    </main>
  );
}
