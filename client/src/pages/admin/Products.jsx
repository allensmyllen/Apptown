import { useEffect, useState } from 'react';
import api from '../../services/api';

const EMPTY_FORM = { title: '', description: '', price_cents: '', category: 'theme', preview_link: '' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const res = await api.get('/products?page=1');
    setProducts(res.data.products);
  }

  useEffect(() => { load(); }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/products/${editing}`, form);
        setEditing(null);
      } else {
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => v && data.append(k, v));
        if (file) data.append('file', file);
        await api.post('/products', data);
      }
      setForm(EMPTY_FORM);
      setFile(null);
      load();
    } catch (err) {
      const status = err.response?.status;
      if (status === 413) setError('File too large (max 500 MB)');
      else if (status === 415) setError('Unsupported file format (zip, rar, tar.gz only)');
      else setError(err.response?.data?.error || 'Failed to save product');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  function startEdit(p) {
    setEditing(p.id);
    setForm({ title: p.title, description: p.description, price_cents: p.price_cents, category: p.category, preview_link: p.preview_link || '' });
  }

  return (
    <main>
      <h1>Manage Products</h1>
      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required />
        <input name="price_cents" type="number" placeholder="Price (cents)" value={form.price_cents} onChange={handleChange} required />
        <select name="category" value={form.category} onChange={handleChange}>
          {['theme','plugin','script','source_code'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="preview_link" placeholder="Preview URL (optional)" value={form.preview_link} onChange={handleChange} />
        {!editing && <input type="file" accept=".zip,.rar,.tar.gz" onChange={(e) => setFile(e.target.files[0])} />}
        {error && <p role="alert">{error}</p>}
        <button type="submit">{editing ? 'Update' : 'Create'}</button>
        {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_FORM); }}>Cancel</button>}
      </form>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            <span>{p.title}</span>
            <button onClick={() => startEdit(p)}>Edit</button>
            <button onClick={() => handleDelete(p.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
