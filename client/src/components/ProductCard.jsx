import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const { id, title, price_cents, category } = product;
  return (
    <article>
      <Link to={`/products/${id}`}>
        <h2>{title}</h2>
        <p>{category}</p>
        <p>${(price_cents / 100).toFixed(2)}</p>
      </Link>
    </article>
  );
}
