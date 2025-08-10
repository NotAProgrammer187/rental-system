import React from 'react';
import { getImageUrl } from '../services/api';

const ImageDebug = ({ imagePath, alt, className, ...props }) => {
  const fullUrl = getImageUrl(imagePath);
  
  console.log('ImageDebug:', {
    originalPath: imagePath,
    fullUrl: fullUrl,
          baseURL: import.meta.env.VITE_API_URL || window.location.origin
  });

  return (
    <img
      src={fullUrl}
      alt={alt}
      className={className}
      onError={(e) => {
        console.error('Image failed to load:', {
          originalPath: imagePath,
          fullUrl: fullUrl,
          error: e
        });
        // Fallback for broken images
        e.target.style.display = 'none';
        if (e.target.nextSibling) {
          e.target.nextSibling.style.display = 'flex';
        }
      }}
      onLoad={() => {
        console.log('Image loaded successfully:', fullUrl);
      }}
      {...props}
    />
  );
};

export default ImageDebug;

