import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const tabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const StatusBadge = ({ status }) => {
  const classes = status === 'approved'
    ? 'bg-green-100 text-green-800'
    : status === 'rejected'
    ? 'bg-red-100 text-red-800'
    : 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${classes}`}>{status}</span>
  );
};

const SkeletonCard = () => (
  <div className="bg-white p-4 rounded-2xl shadow-soft border border-gray-200 animate-pulse">
    <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
    <div className="h-4 w-56 bg-gray-100 rounded" />
    <div className="grid grid-cols-3 gap-3 mt-4">
      <div className="h-16 bg-gray-100 rounded" />
      <div className="h-16 bg-gray-100 rounded" />
      <div className="h-16 bg-gray-100 rounded" />
    </div>
  </div>
);

const AdminVerifications = () => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState({ open: false, userId: null });
  const [reason, setReason] = useState('');

  const fetchRequests = async (status = 'pending') => {
    setLoading(true);
    try {
      const { data } = await api.get(`/verification/admin/requests?status=${status}`);
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const [p, a, r] = await Promise.all([
        api.get('/verification/admin/requests?status=pending'),
        api.get('/verification/admin/requests?status=approved'),
        api.get('/verification/admin/requests?status=rejected'),
      ]);
      setCounts({ pending: p.data.length, approved: a.data.length, rejected: r.data.length });
    } catch (e) {
      // ignore silently
    }
  };

  useEffect(() => {
    fetchRequests(activeTab);
    fetchCounts();
  }, [activeTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const approve = async (userId) => {
    await api.post(`/verification/admin/${userId}/approve`);
    showToast({ type: 'success', message: 'User approved' });
    await fetchRequests(activeTab);
    await fetchCounts();
  };

  const reject = async () => {
    if (!rejectModal.userId) return;
    await api.post(`/verification/admin/${rejectModal.userId}/reject`, { reason });
    setRejectModal({ open: false, userId: null });
    setReason('');
    showToast({ type: 'warning', message: 'Verification rejected' });
    await fetchRequests(activeTab);
    await fetchCounts();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Admin / Verifications</p>
          <h1 className="text-2xl font-bold">Host Verification Requests</h1>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="input-field"
            aria-label="Search requests"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-2 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-pressed={activeTab === t.id}
          >
            {t.label}
            <span className="ml-2 inline-flex items-center justify-center min-w-[24px] h-6 text-xs rounded-full bg-gray-100 text-gray-700">
              {counts[t.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9m-4-6H9a2 2 0 00-2 2v5h10V5a2 2 0 00-2-2z"/></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No {activeTab} requests</h3>
          <p className="text-gray-600">Try switching tabs or adjusting your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <div key={r._id} className="bg-white p-5 rounded-2xl shadow-soft border border-gray-200 flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                    {r.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    <p className="text-sm text-gray-500">{r.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={activeTab} />
                  <p className="text-xs text-gray-500 mt-1">Submitted {r.verificationSubmittedAt ? new Date(r.verificationSubmittedAt).toLocaleString() : '—'}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(r.documents || []).map((d) => (
                  <div key={d._id} className="border rounded-xl p-3 flex items-center gap-3 hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      {d.mimeType?.includes('pdf') ? (
                        <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11V3m0 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4-4 4 4m4-8l4 4-4 4"/></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate capitalize">{d.documentType.replace('_', ' ')}</p>
                      <a href={`/api/verification/admin/document/${d._id}`} target="_blank" rel="noreferrer" className="text-primary-600 text-xs">Preview</a>
                    </div>
                  </div>
                ))}
              </div>

              {activeTab === 'pending' && (
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => approve(r._id)} className="btn-primary flex-1">Approve</button>
                  <button onClick={() => setRejectModal({ open: true, userId: r._id })} className="btn-secondary flex-1">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-large w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Reject verification</h3>
            <p className="text-sm text-gray-600 mb-4">Provide a clear reason to help the user resubmit correctly.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field w-full h-28"
              placeholder="Reason for rejection"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="btn-ghost" onClick={() => { setRejectModal({ open: false, userId: null }); setReason(''); }}>Cancel</button>
              <button className="btn-secondary" onClick={reject} disabled={!reason.trim()}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerifications;


