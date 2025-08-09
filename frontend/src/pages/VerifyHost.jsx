import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const VerifyHost = () => {
  const { showToast } = useToast();
  const [status, setStatus] = useState('pending');
  const [reason, setReason] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState({ id: null, property_proof: [], bank_proof: null });
  const [dragOver, setDragOver] = useState({ id: false, property_proof: false, bank_proof: false });

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/verification/status');
      setStatus(data.status);
      setReason(data.reason || null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const onFileChange = (e) => {
    const { name, files: fileList } = e.target;
    if (name === 'property_proof') {
      setFiles((prev) => ({ ...prev, property_proof: Array.from(fileList) }));
    } else {
      setFiles((prev) => ({ ...prev, [name]: fileList[0] }));
    }
  };

  const onDrop = (e, field) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver((d) => ({ ...d, [field]: false }));
    const list = e.dataTransfer?.files || [];
    if (!list.length) return;
    if (field === 'property_proof') {
      setFiles((prev) => ({ ...prev, property_proof: [...prev.property_proof, ...Array.from(list)] }));
    } else {
      setFiles((prev) => ({ ...prev, [field]: list[0] }));
    }
  };

  const dropHandlers = (field) => ({
    onDragOver: (e) => { e.preventDefault(); setDragOver((d) => ({ ...d, [field]: true })); },
    onDragLeave: (e) => { e.preventDefault(); setDragOver((d) => ({ ...d, [field]: false })); },
    onDrop: (e) => onDrop(e, field)
  });

  const removeFile = (field, index = 0) => {
    if (field === 'property_proof') {
      setFiles((prev) => ({ ...prev, property_proof: prev.property_proof.filter((_, i) => i !== index) }));
    } else {
      setFiles((prev) => ({ ...prev, [field]: null }));
    }
  };

  const docStatus = useMemo(() => ({
    id: files.id ? 'uploaded' : 'pending',
    property_proof: files.property_proof?.length ? 'uploaded' : 'pending',
    bank_proof: files.bank_proof ? 'uploaded' : 'pending',
  }), [files]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (status === 'pending' || status === 'approved') {
        showToast({ type: 'warning', message: 'Verification already in progress or completed.' });
        setSubmitting(false);
        return;
      }
      const form = new FormData();
      if (files.id) form.append('id', files.id);
      files.property_proof.forEach((f) => form.append('property_proof', f));
      if (files.bank_proof) form.append('bank_proof', files.bank_proof);

      await api.post('/verification', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchStatus();
      showToast({ type: 'success', message: 'Verification submitted. We will review your documents shortly.' });
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', message: err.response?.data?.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const StatusBadge = () => {
    const styles = status === 'approved'
      ? 'bg-green-100 text-green-800'
      : status === 'rejected'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${styles}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">Account / Host Verification</p>
        <h1 className="text-2xl font-bold">Become a Verified Host</h1>
        <p className="text-gray-600">Submit your documents to unlock property listing and payouts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status card */}
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status === 'approved' ? 'bg-green-100 text-green-700' : status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {status === 'approved' ? '✔' : status === 'rejected' ? '!' : '…'}
                </div>
                <div>
                  <p className="font-semibold">Current status</p>
                  <div className="mt-1"><StatusBadge /></div>
                </div>
              </div>
              <div className="w-48 hidden sm:block">
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden" aria-label="Verification progress">
                  <div className={`h-2 transition-all duration-300 ${status === 'approved' ? 'bg-green-500 w-full' : status === 'pending' ? 'bg-yellow-500 w-2/3' : 'bg-red-500 w-1/3'}`} />
                </div>
              </div>
            </div>
            {status === 'rejected' && reason && (
              <p className="mt-3 text-sm text-red-600">Rejection reason: {reason}</p>
            )}
          </div>

          {/* Upload cards */}
          <form onSubmit={onSubmit} className="space-y-6">
            { /* Disable form actions when pending/approved for clearer UX */ }
            { /* We still show files but prevent re-submission */ }
            { /* isDisabled used below for button state */ }
            
            {/* ID */}
            <div className={`p-6 bg-white rounded-2xl shadow-soft border ${dragOver.id ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`} {...dropHandlers('id')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5V4H2v16h5m10 0V10M7 20v-6h10v6M7 10h10"/></svg>
                  </div>
                  <div>
                    <p className="font-semibold">Government-issued ID</p>
                    <p className="text-xs text-gray-500">JPG/PNG/PDF, max 8MB</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${docStatus.id === 'uploaded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{docStatus.id === 'uploaded' ? 'Uploaded' : 'Pending'}</span>
              </div>
              <label className="block">
                <input type="file" name="id" accept="image/*,application/pdf" onChange={onFileChange} className="hidden" />
                <div className="border border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:bg-gray-50">
                  {files.id ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate">{files.id.name}</span>
                      <button type="button" className="text-red-600 text-sm" onClick={() => removeFile('id')}>Remove</button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
                  )}
                </div>
              </label>
            </div>

            {/* Property Proof */}
            <div className={`p-6 bg-white rounded-2xl shadow-soft border ${dragOver.property_proof ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`} {...dropHandlers('property_proof')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m5 0H6a2 2 0 01-2-2V7"/></svg>
                  </div>
                  <div>
                    <p className="font-semibold">Property Ownership Proof</p>
                    <p className="text-xs text-gray-500">Up to 3 files (JPG/PNG/PDF), max 8MB each</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${docStatus.property_proof === 'uploaded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{docStatus.property_proof === 'uploaded' ? 'Uploaded' : 'Pending'}</span>
              </div>
              <label className="block">
                <input type="file" multiple name="property_proof" accept="image/*,application/pdf" onChange={onFileChange} className="hidden" />
                <div className="border border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:bg-gray-50">
                  {files.property_proof?.length ? (
                    <div className="space-y-2">
                      {files.property_proof.map((f, i) => (
                        <div key={`${f.name}-${i}`} className="flex items-center justify-between text-sm">
                          <span className="truncate text-gray-700">{f.name}</span>
                          <button type="button" className="text-red-600" onClick={() => removeFile('property_proof', i)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
                  )}
                </div>
              </label>
            </div>

            {/* Bank Proof */}
            <div className={`p-6 bg-white rounded-2xl shadow-soft border ${dragOver.bank_proof ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`} {...dropHandlers('bank_proof')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>
                  </div>
                  <div>
                    <p className="font-semibold">Bank Proof for Payouts</p>
                    <p className="text-xs text-gray-500">JPG/PNG/PDF, max 8MB</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${docStatus.bank_proof === 'uploaded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{docStatus.bank_proof === 'uploaded' ? 'Uploaded' : 'Pending'}</span>
              </div>
              <label className="block">
                <input type="file" name="bank_proof" accept="image/*,application/pdf" onChange={onFileChange} className="hidden" />
                <div className="border border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:bg-gray-50">
                  {files.bank_proof ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate">{files.bank_proof.name}</span>
                      <button type="button" className="text-red-600 text-sm" onClick={() => removeFile('bank_proof')}>Remove</button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
                  )}
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3">
              {(() => {
                const isDisabled = submitting || status === 'pending' || status === 'approved';
                const title = status === 'pending' ? 'Verification already pending' : status === 'approved' ? 'Already verified' : '';
                return (
                  <button
                    type="submit"
                    disabled={isDisabled}
                    title={title}
                    className={
                      isDisabled
                        ? 'inline-flex items-center px-4 py-2 rounded-xl font-medium bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'btn-primary hover:opacity-90'
                    }
                  >
                    {submitting ? 'Submitting…' : 'Submit for Review'}
                  </button>
                );
              })()}
              {status === 'rejected' && (
                <span className="text-sm text-gray-500">After fixing the issues, resubmit your documents.</span>
              )}
            </div>
          </form>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">What you need</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span className="mt-1 text-green-600">✓</span> Clear photo/scan of your government-issued ID</li>
              <li className="flex items-start gap-2"><span className="mt-1 text-green-600">✓</span> Proof that you own or manage the property</li>
              <li className="flex items-start gap-2"><span className="mt-1 text-green-600">✓</span> Bank proof for payouts (statement or letterhead)</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">We review within 24–48 hours. You’ll receive a notification when your status changes.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Make sure text is readable and not cropped.</li>
              <li>• Match your profile name to your ID.</li>
              <li>• Redact sensitive bank numbers if desired.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyHost;


