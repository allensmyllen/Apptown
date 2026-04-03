import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.get('/admin/metrics').then((res) => setMetrics(res.data));
  }, []);

  if (!metrics) return <p>Loading...</p>;

  return (
    <main>
      <h1>Admin Dashboard</h1>
      <dl>
        <dt>Total Revenue</dt>
        <dd>${(metrics.total_revenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
        <dt>Completed Orders</dt>
        <dd>{metrics.completed_orders}</dd>
        <dt>Registered Users</dt>
        <dd>{metrics.registered_users}</dd>
      </dl>
    </main>
  );
}
