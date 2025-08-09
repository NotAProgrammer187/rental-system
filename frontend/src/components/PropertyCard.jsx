import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../services/api';

const PropertyCard = ({ property, showHost = true }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: property.pricing?.currency || 'USD'
    }).format(price);
  };

  const getAverageRating = () => {
    if (!property.ratings?.overall) return null;
    return property.ratings.overall.toFixed(1);
  };

  const getPrimaryImage = () => {
    if (!property.images || property.images.length === 0) return null;
    const primaryImage = property.images.find(img => img.isPrimary) || property.images[0];
    return getImageUrl(primaryImage.url);
  };

  return (
    <div className="group bg-white rounded-2xl shadow-soft overflow-hidden hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1">
      {/* Image Section */}
      <div className="relative aspect-w-16 aspect-h-12 overflow-hidden">
        {getPrimaryImage() ? (
          <img
            src={getPrimaryImage()}
            alt={property.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        {/* Fallback for when image fails to load or doesn't exist */}
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: getPrimaryImage() ? 'none' : 'flex' }}>
          <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        
        {/* Instant Book Badge */}
        {property.availability?.instantBookable && (
          <div className="absolute top-3 left-3 bg-primary-600 text-white text-xs font-medium px-2 py-1 rounded-full">
            Instant Book
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 font-semibold px-3 py-1 rounded-full">
          {formatPrice(property.pricing?.basePrice || 0)}
          <span className="text-sm font-normal text-gray-600">/night</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Title and Rating */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
            {property.title}
          </h3>
          {getAverageRating() && (
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{getAverageRating()}</span>
            </div>
          )}
        </div>

        {/* Location */}
        <p className="text-gray-600 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {property.location?.formattedAddress || property.location?.address?.city || 'Location not specified'}
        </p>

        {/* Property Details */}
        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            {property.capacity?.bedrooms || 0} bed{property.capacity?.bedrooms !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 6h8" />
            </svg>
            {property.capacity?.bathrooms || 0} bath{property.capacity?.bathrooms !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {property.capacity?.guests || 0} guest{property.capacity?.guests !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Host Info */}
        {showHost && property.host && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              {property.host.avatar ? (
                <img
                  src={getImageUrl(property.host.avatar)}
                  alt={property.host.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {property.host.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{property.host.name}</p>
                <p className="text-xs text-gray-500">Host</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <Link
            to={`/rentals/${property._id}`}
            className="block w-full text-center bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            View Details
          </Link>
          <Link
            to={`/booking/${property._id}`}
            className="block w-full text-center bg-primary-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;


