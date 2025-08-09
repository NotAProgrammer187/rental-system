import React, { useState } from 'react';
import StarRating from './StarRating';

const MAX_PHOTOS = 5;

const ReviewForm = ({ booking, type = 'rental', onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const minChars = 40;

  const onFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const next = [...files, ...selected].slice(0, MAX_PHOTOS);
    setFiles(next);
    const nextPreviews = next.map((f) => URL.createObjectURL(f));
    setPreviews(nextPreviews);
  };

  const removePhoto = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const canSubmit = rating >= 1 && comment.trim().length >= minChars && (!files || files.length <= MAX_PHOTOS);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('rating', rating);
      form.append('comment', comment.trim());
      files.forEach((f) => form.append('photos', f));

      const endpoint = type === 'rental' ? `/reviews/booking/${booking._id}/rental` : `/reviews/booking/${booking._id}/guest`;
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: form
      });
      if (!res.ok) throw new Error('Failed to submit review');
      onSubmitted && onSubmitted();
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{type === 'rental' ? 'Rate your stay' : 'Rate your guest'}</h3>
          <p className="text-gray-500 text-sm">
            {type === 'rental' ? `${booking.property?.title || ''}` : `${booking.guest?.name || ''}`}
          </p>
        </div>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Your review</label>
        <textarea
          className="input-field w-full h-28"
          placeholder={`Share details (min ${minChars} characters)`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className={`text-sm ${comment.trim().length < minChars ? 'text-gray-500' : 'text-green-600'}`}>
          {comment.trim().length}/{minChars}
        </div>
      </div>

      {type === 'rental' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Photos (optional)</label>
          <div className="mt-2">
            <input type="file" accept="image/*" multiple onChange={onFileChange} />
          </div>
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`preview-${i}`} className="w-full h-20 object-cover rounded" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1 opacity-0 group-hover:opacity-100">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={!canSubmit || submitting} className={`btn-primary ${(!canSubmit || submitting) ? 'opacity-60 cursor-not-allowed' : ''}`}>
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
};

export default ReviewForm;


