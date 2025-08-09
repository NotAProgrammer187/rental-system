import React, { useEffect, useMemo, useState } from 'react';
import api, { getImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

const STATUSES = ['pending', 'flagged', 'approved', 'rejected'];

const ConfirmModal = ({ open, title, message, confirmText, onConfirm, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-large max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600 mt-2">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const Lightbox = ({ open, src, alt, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <img src={src} alt={alt} className="max-h-[90vh] max-w-[95vw] object-contain" />
    </div>
  );
};

const Tag = ({ children, tone = 'gray' }) => {
  const tones = {
    pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    flagged: 'bg-orange-50 text-orange-800 border-orange-200',
    approved: 'bg-green-50 text-green-800 border-green-200',
    rejected: 'bg-red-50 text-red-800 border-red-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tones[tone] || tones.gray}`}>{children}</span>;
};

const AdminReviews = () => {
  const { showToast } = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ reviews: [], pagination: null });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent | rating | reports
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState({ open: false, ids: [], action: 'approve' });
  const [lightbox, setLightbox] = useState({ open: false, src: '', alt: '' });

  const load = async (resetPage = false) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reviews/admin?status=${status}&page=${resetPage ? 1 : page}&limit=10`);
      setData(data);
      if (resetPage) setPage(1);
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', message: 'Failed to load reviews' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    let list = data.reviews || [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) =>
        (r.comment || '').toLowerCase().includes(q) ||
        (r.reviewer?.name || '').toLowerCase().includes(q) ||
        (r.rental?.title || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'reports') list = [...list].sort((a, b) => (b.reports?.length || 0) - (a.reports?.length || 0));
    else list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [data.reviews, query, sortBy]);

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const bulkModerate = async (action) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirm({ open: true, ids, action });
  };

  const confirmModeration = async () => {
    const { ids, action } = confirm;
    setConfirm({ ...confirm, open: false });
    try {
      await Promise.all(ids.map((id) => api.post(`/reviews/admin/${id}/${action}`)));
      showToast({ type: 'success', message: `Reviews ${action}d` });
      load();
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', message: 'Action failed' });
    }
  };

  const moderateOne = async (id, action) => {
    try {
      await api.post(`/reviews/admin/${id}/${action}`);
      showToast({ type: 'success', message: `Review ${action}d` });
      load();
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', message: 'Action failed' });
    }
  };

  const statusTone = (s) => (s === 'pending' ? 'pending' : s === 'flagged' ? 'flagged' : s === 'approved' ? 'approved' : 'rejected');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Review Moderation</h1>
        <div className="hidden md:flex items-center gap-2 bg-white p-1 rounded-xl shadow-soft">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === s ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select className="md:hidden input-field w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <input
          className="input-field flex-1"
          placeholder="Search by comment, reviewer, or rental"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input-field w-44" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">Sort: Most recent</option>
          <option value="rating">Sort: Highest rating</option>
          <option value="reports">Sort: Most reports</option>
        </select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <button className="btn-primary" onClick={() => bulkModerate('approve')}>Approve Selected</button>
            <button className="btn-secondary" onClick={() => bulkModerate('reject')}>Reject Selected</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-soft divide-y">
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No reviews found.</div>
        ) : (
          filtered.map((r) => (
            <div key={r._id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <input
                    type="checkbox"
                    className="mt-1.5"
                    checked={selected.has(r._id)}
                    onChange={() => toggleSelect(r._id)}
                    aria-label="Select review"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Tag tone={statusTone(r.status)}>{r.status}</Tag>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100">{r.revieweeType}</span>
                      {r.rental && <span>•</span>}
                      {r.rental && <span className="font-medium">{r.rental.title}</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      <span className="text-sm font-medium">{Number(r.rating).toFixed(1)}</span>
                      <span className="text-sm text-gray-500">by {r.reviewer?.name || 'User'}</span>
                      <span className="text-xs text-gray-400">· {new Date(r.createdAt).toLocaleString()}</span>
                      {r.reports?.length > 0 && (
                        <button className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full"
                          onClick={() => alert(r.reports.map(rep => `• ${rep.reason}${rep.comment ? ` — ${rep.comment}` : ''}`).join('\n') || 'No report details')}
                        >{r.reports.length} reports</button>
                      )}
                    </div>
                    <p className="mt-2 text-gray-800 whitespace-pre-wrap leading-6">{r.comment}</p>
                    {r.photos?.length > 0 && (
                      <div className="mt-3 grid grid-cols-6 gap-2">
                        {r.photos.map((p, i) => (
                          <button key={i} type="button" onClick={() => setLightbox({ open: true, src: getImageUrl(p.path), alt: p.originalName || 'photo' })}>
                            <img src={getImageUrl(p.path)} alt={p.originalName || 'photo'} className="w-full h-20 object-cover rounded" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {r.status !== 'approved' && (
                    <button onClick={() => moderateOne(r._id, 'approve')} className="btn-primary">Approve</button>
                  )}
                  {r.status !== 'rejected' && (
                    <button onClick={() => moderateOne(r._id, 'reject')} className="btn-secondary">Reject</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {data.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => { setPage(page - 1); load(); }}>Prev</button>
          <span className="text-sm text-gray-600">Page {data.pagination.currentPage} / {data.pagination.totalPages}</span>
          <button className="btn-secondary" disabled={page >= data.pagination.totalPages} onClick={() => { setPage(page + 1); load(); }}>Next</button>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title={`Confirm ${confirm.action}`}
        message={`Are you sure you want to ${confirm.action} ${confirm.ids.length} review(s)?`}
        confirmText={confirm.action === 'approve' ? 'Approve' : 'Reject'}
        onConfirm={confirmModeration}
        onClose={() => setConfirm({ ...confirm, open: false })}
      />

      <Lightbox open={lightbox.open} src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox({ open: false, src: '', alt: '' })} />
    </div>
  );
};

export default AdminReviews;

