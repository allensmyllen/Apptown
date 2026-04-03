import { useState } from 'react';
import api from '../services/api';

export default function DownloadButton({ productId }) {
  const [error, setError] = useState('');

  async function handleDownload() {
    setError('');
    try {
      const res = await api.get(`/downloads/${productId}`, { maxRedirects: 0 });
      // If the server redirects, axios follows it — open the final URL
      window.location.href = res.request?.responseURL || res.config.url;
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Purchase required to download this product.');
      } else {
        setError('Download failed. Please try again.');
      }
    }
  }

  return (
    <div>
      <button onClick={handleDownload}>Download</button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
