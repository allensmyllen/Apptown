import { useSearchParams, Link } from 'react-router-dom';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  if (success) {
    return (
      <main>
        <h1>Purchase Successful</h1>
        <p>Thank you! Your order is confirmed. Check your email for a confirmation.</p>
        <Link to="/downloads">Go to My Downloads</Link>
      </main>
    );
  }

  if (canceled) {
    return (
      <main>
        <h1>Purchase Canceled</h1>
        <p>Your purchase was canceled. No charge was made.</p>
        <Link to="/">Back to Marketplace</Link>
      </main>
    );
  }

  return (
    <main>
      <p>Processing your order...</p>
    </main>
  );
}
