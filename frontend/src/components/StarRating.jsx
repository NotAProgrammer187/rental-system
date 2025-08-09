import React from 'react';

const StarRating = ({ value = 0, onChange, size = 28, readOnly = false, className = '' }) => {
  const stars = [1, 2, 3, 4, 5];
  const starSizeClass = size >= 28 ? 'w-7 h-7' : size >= 20 ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className={`inline-flex items-center ${className}`} role={readOnly ? undefined : 'radiogroup'} aria-label="Rating">
      {stars.map((star) => {
        const active = value >= star;
        return (
          <button
            key={star}
            type="button"
            className={`transition-transform ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${star !== 1 ? 'ml-1' : ''}`}
            onClick={() => !readOnly && onChange && onChange(star)}
            onKeyDown={(e) => {
              if (readOnly) return;
              if (e.key === 'ArrowRight') onChange && onChange(Math.min(5, value + 1));
              if (e.key === 'ArrowLeft') onChange && onChange(Math.max(1, value - 1));
            }}
            aria-checked={active}
            role={readOnly ? undefined : 'radio'}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <svg className={`${starSizeClass} ${active ? 'text-yellow-400' : 'text-gray-300'} fill-current`} viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;


