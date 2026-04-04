import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const EMPTY_FORM = { title: '', description: '', price_cents: '', category: '', preview_link: '' };

function ProductModal({ open, editing, form, onChange, onSubmit, onClose, categories, file, setFile, imageFile, setImageFile, imagePreview, setImagePreview, error, success }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-base">
            {editing ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="product-form" onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input name="title" placeholder="e.g. Responsive Admin Dashboard" value={form.title} onChange={onChange} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                <select name="category" value={form.category} onChange={onChange} className={inputCls}>
                  <option value="">Select category</option>
                  {categories.map(cat => <option key={cat.id} value={cat.slug}>{cat.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <textarea name="description" placeholder="Describe your product..." value={form.description} onChange={onChange} required rows={3} className={inputCls} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price (in cents) *</label>
                <input name="price_cents" type="number" min="1" placeholder="e.g. 500000 = ₦5,000" value={form.price_cents} onChange={onChange} required className={inputCls} />
                {form.price_cents && <p className="text-xs text-gray-400 mt-1">= ₦{(form.price_cents / 100).toFixed(2)}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preview URL</label>
                <input name="preview_link" type="url" placeholder="https://demo.example.com" value={form.preview_link} onChange={onChange} className={inputCls} />
              </div>
            </div>

            {!editing && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product File * (.zip, .rar, .tar.gz)</label>
                <input type="file" accept=".zip,.rar,.tar.gz" onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-sm file:font-medium hover:file:bg-green-100 cursor-pointer" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Product Image <span className="text-gray-400 font-normal">(jpg, png, webp — max 5MB)</span>
              </label>
              <p className="text-xs text-gray-400 mb-1.5">Recommended: <strong>800 × 500px</strong></p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files[0];
                  setImageFile(f || null);
                  setImagePreview(f ? URL.createObjectURL(f) : null);
                }}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100 cursor-pointer"
              />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 h-24 w-auto rounded-lg border border-gray-200 object-cover" />
              )}
            </div>

            {error && <p role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" form="product-form"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
            {editing ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    const res = await api.get('/products?page=1');
    setProducts(res.data.products || []);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.categories || []));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editing) {
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => v && data.append(k, v));
        if (imageFile) data.append('image', imageFile);
        await api.put(`/products/${editing}`, data);
        setSuccess('Product updated successfully.');
        setEditing(null);
      } else {
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => v && data.append(k, v));
        if (file) data.append('file', file);
        if (imageFile) data.append('image', imageFile);
        await api.post('/products', data);
        setSuccess('Product created successfully.');
      }
      setForm(EMPTY_FORM);
      setFile(null);
      setImageFile(null);
      setImagePreview(null);
      setModalOpen(false);
      load();
    } catch (err) {
      const status = err.response?.status;
      if (status === 413) setError('File too large (max 500 MB)');
      else if (status === 415) setError('Unsupported image format (jpg, png, webp only)');
      else if (status === 403) setError('Session expired — please log out and log back in.');
      else if (status === 401) setError('Not authenticated — please log in again.');
      else setError(err.response?.data?.error || 'Failed to save product');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this product? It will be unpublished.')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  function startEdit(p) {
    setEditing(p.id);
    setForm({ title: p.title, description: p.description, price_cents: p.price_cents, category: p.category, preview_link: p.preview_link || '' });
    setImagePreview(p.image_url || null);
    setError('');
    setSuccess('');
    setModalOpen(true);
  }

  function openAddModal() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setSuccess('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setImageFile(null);
    setImagePreview(null);
    setError('');
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
        </div>
        <button onClick={openAddModal}
          className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No products yet. Add your first one above.</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.title} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                      : <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 shrink-0" />
                    }
                    <div>
                      <p className="font-medium text-gray-800">{p.title}</p>
                      {p.preview_link && <a href={p.preview_link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">Live Preview ↗</a>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">{p.category?.replace('_', ' ')}</span>
                </td>
                <td className="px-5 py-3.5 font-semibold text-gray-700">₦{(p.price_cents / 100).toFixed(2)}</td>
                <td className="px-5 py-3.5 text-right space-x-3">
                  <button onClick={() => startEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductModal
        open={modalOpen}
        editing={editing}
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        categories={categories}
        file={file}
        setFile={setFile}
        imageFile={imageFile}
        setImageFile={setImageFile}
        imagePreview={imagePreview}
        setImagePreview={setImagePreview}
        error={error}
        success={success}
      />
    </AdminLayout>
  );
}
