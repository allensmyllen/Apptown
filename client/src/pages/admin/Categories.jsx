import { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

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
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/categories', { name: newName });
      setNewName('');
      load();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditError('');
    setDeleteError('');
  }

  async function handleEdit(e, id) {
    e.preventDefault();
    setEditError('');
    try {
      await api.put(`/categories/${id}`, { name: editName });
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update');
    }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    setDeleteError('');
    try {
      await api.delete(`/categories/${cat.id}`);
      load();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete category');
    }
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400';

  return (
    <AdminLayout>
      {/* Header + inline create */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Categories</h1>
          <p className="text-sm text-gray-400 mt-0.5">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <form onSubmit={handleCreate} className="flex gap-2 items-center">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name…"
            required
            className={inputCls + ' w-52'}
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
            {creating ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>

      {createError && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createError}</p>
      )}
      {deleteError && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-gray-400 text-sm">No categories yet. Add one above.</td>
              </tr>
            )}
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  {editingId === cat.id ? (
                    <form onSubmit={(e) => handleEdit(e, cat.id)} className="flex gap-2 items-center">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        autoFocus
                        className={inputCls}
                      />
                      <button type="submit" className="text-green-600 text-xs font-semibold hover:text-green-800">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 text-xs hover:text-gray-600">Cancel</button>
                      {editError && <span className="text-red-500 text-xs">{editError}</span>}
                    </form>
                  ) : (
                    <span className="font-medium text-gray-800">{cat.name}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{cat.slug}</td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  {new Date(cat.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-right space-x-3">
                  {editingId !== cat.id && (
                    <>
                      <button onClick={() => startEdit(cat)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                      <button onClick={() => handleDelete(cat)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
