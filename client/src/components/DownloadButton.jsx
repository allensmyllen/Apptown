import { useState } from 'react';

export default function DownloadButton({ productId }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setError('');
    setLoading(true);
    try {
      // Use fetch to follow the redirect and get the final URL
      // We include credentials so the auth cookie is sent
      const response = await fetch(`/api/downloads/${productId}`, {
        credentials: 'include',
        redirect: 'follow',
      });

      if (response.status === 403) {
        setError('Purchase required to download.');
        return;
      }
      if (!response.ok) {
        setError('Download failed. Please try again.');
        return;
      }

      // Get the file as a blob and trigger browser download
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'download';

      // Try to extract filename from content-disposition header
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) filename = match[1].replace(/['"]/g, '');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right shrink-0">
      <button onClick={handleDownload} disabled={loading}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {loading ? 'Preparing…' : 'Download'}
      </button>
      {error && <p role="alert" className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
