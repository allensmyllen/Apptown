import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/admin/orders', { params });
    setOrders(res.data.orders);
  }

  useEffect(() => { load(); }, []);

  async function handleExport() {
    const res = await api.get('/admin/orders/export', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <h1>Orders</h1>
      <div>
        <label>From: <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To: <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button onClick={load}>Filter</button>
        <button onClick={handleExport}>Export CSV</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Order ID</th><th>Buyer</th><th>Product</th><th>Amount</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.buyer_email}</td>
              <td>{o.product_title}</td>
              <td>${(o.amount_cents / 100).toFixed(2)}</td>
              <td>{o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
