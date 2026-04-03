import { useEffect, useState } from 'react';
import api from '../services/api';
import DownloadButton from '../components/DownloadButton';

export default function MyDownloads() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get('/orders').then((res) => setOrders(res.data.orders));
  }, []);

  return (
    <main>
      <h1>My Downloads</h1>
      {orders.length === 0 && <p>No purchases yet.</p>}
      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            <span>{order.product_title}</span>
            <span>{new Date(order.created_at).toLocaleDateString()}</span>
            <DownloadButton productId={order.product_id} />
          </li>
        ))}
      </ul>
    </main>
  );
}
