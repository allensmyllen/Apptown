import { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';
import { AdminTable, Td, ActionBtn } from '../../components/AdminTable';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  async function load() {
    const res = await api.get('/categories');
    setCategories(res.data.categories || []);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault(); setCreateError(''); setCreating(true);
    try { await api.post('/categories', { name: newName }); setNewName(''); load(); }
    catch (err) { setCreateError(err.response?.data?.error || 'Failed to create'); }
    finally { setCreating(false); }
  }

  async function handleEdit(e, id) {
    e.preventDefault(); setEditError('');
    try { await api.put(`/categories/${id}`, { name: editName }); setEditingId(null); load(); }
    catch (err) { setEditError(err.response?.data?.error || 'Failed to update'); }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    setDeleteError('');
    try { await api.delete(`/categories/${cat.id}`); load(); }
    catch (err) { setDeleteError(err.response?.data?.error || 'Failed to delete'); }
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Categories</h1>
          <p className="text-sm text-gray-400 mt-0.5">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New category name…" required className={inputCls + ' w-48 sm:w-56'} />
          <button type="submit" disabled={creating} className="bg-primary hover:bg-primary/90 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
            {creating ? 'Adding…' : '+ Add'}
          </button>
        </form>
      </div>

      {createError && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createError}</p>}
      {deleteError && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>}

      <AdminTable cols={['Name', 'Slug', 'Created', 'Actions']} empty="No categories yet. Add one above.">
        {categories.map(cat => (
          <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
            <Td>
              {editingId === cat.id ? (
                <form onSubmit={e => handleEdit(e, cat.id)} className="flex items-center gap-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)} required autoFocus className={inputCls} />
                  <button type="submit" className="text-primary text-xs font-semibold hover:text-primary whitespace-nowrap">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 text-xs hover:text-gray-600 whitespace-nowrap">Cancel</button>
                  {editError && <span className="text-red-500 text-xs">{editError}</span>}
                </form>
              ) : (
                <span className="font-medium text-gray-800">{cat.name}</span>
              )}
            </Td>
            <Td mono className="text-gray-500 text-xs">{cat.slug}</Td>
            <Td className="text-gray-400 text-xs whitespace-nowrap">
              {new Date(cat.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </Td>
            <Td right>
              {editingId !== cat.id && (
                <div className="flex items-center justify-end gap-2">
                  <ActionBtn variant="primary" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditError(''); }}>Edit</ActionBtn>
                  <ActionBtn variant="danger" onClick={() => handleDelete(cat)}>Delete</ActionBtn>
                </div>
              )}
            </Td>
          </tr>
        ))}
      </AdminTable>
    </AdminLayout>
  );
}
