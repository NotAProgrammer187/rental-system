import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getImageUrl } from '../services/api';


const RentalDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  const [disabledDates, setDisabledDates] = useState([]);

  useEffect(() => {
    const fetchRental = async () => {
      try {
        const response = await api.get(`/rentals/${id}`);
        setRental(response.data);
      } catch (error) {
        setError('Failed to fetch rental details');
        console.error('Error fetching rental:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchDisabledDates = async () => {
      try {
        const resp = await api.get(`/bookings/rental/${id}/paid-dates`);
        if (resp.data && resp.data.success) {
          setDisabledDates(resp.data.dates || []);
        }
      } catch (e) {
        console.warn('Failed to load blocked dates:', e);
      }
    };

    fetchRental();
    fetchDisabledDates();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this rental?')) {
      try {
        await api.delete(`/rentals/${id}`);
        navigate('/rentals');
      } catch (error) {
        setError('Failed to delete rental');
        console.error('Error deleting rental:', error);
      }
    }
  };

  const handleBookNow = () => {
    if (!user) {
      navigate('/login', { state: { from: `/booking/${id}` } });
      return;
    }
    navigate(`/booking/${id}`);
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-error-50 border border-error-200 rounded-xl p-6 max-w-md mx-auto">
            <svg className="h-12 w-12 text-error-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-error-800 mb-2">Something went wrong</h3>
            <p className="text-error-700 mb-4">{error}</p>
            <Link to="/rentals" className="btn-primary">
              Back to Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Property not found</h2>
          <Link to="/rentals" className="btn-primary">
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && rental.owner && user.id === rental.owner._id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            to="/rentals" 
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Properties
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-8">
              {rental.images && rental.images.length > 0 ? (
                <div className="relative">
                  <div className="relative w-full h-96">
                    <img
                      src={getImageUrl(rental.images[currentImageIndex], rental._id, currentImageIndex)}
                      alt={rental.title}
                      className="w-full h-full object-contain cursor-pointer bg-gray-100"
                      onClick={() => setShowImageModal(true)}
                      onError={(e) => {
                        // Fallback for broken images
                        console.warn('Image failed to load:', rental.images[currentImageIndex]);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback for when image fails to load */}
                    <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center" style={{ display: 'none' }}>
                      <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Image Navigation */}
                  {rental.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(prev => prev === 0 ? rental.images.length - 1 : prev - 1)}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-medium transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(prev => prev === rental.images.length - 1 ? 0 : prev + 1)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-medium transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Image Thumbnails */}
                  {rental.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {rental.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-3 h-3 rounded-full transition-all ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-96 bg-gray-200 flex items-center justify-center">
                  <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-2xl shadow-soft p-8 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {rental.title}
                  </h1>
                  <p className="text-xl text-gray-600 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {rental.location}
                  </p>
                </div>
                <div className="mt-4 lg:mt-0 text-right">
                  <div className="text-3xl font-bold text-primary-600">
                    ${rental.price.toLocaleString()}
                    <span className="text-lg font-normal text-gray-500">/month</span>
                  </div>
                  {rental.isAvailable ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-error-100 text-error-800">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Not Available
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">About this property</h3>
                <p className="text-gray-700 leading-relaxed">{rental.description}</p>
              </div>

              {rental.owner && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Property Owner</h3>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {rental.owner.name?.charAt(0).toUpperCase() || 'O'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">{rental.owner.name}</p>
                      <p className="text-gray-600">{rental.owner.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {isOwner && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Owner Actions</h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      to={`/rentals/${id}/edit`}
                      className="btn-secondary"
                    >
                      Edit Property
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="btn-ghost text-error-600 hover:bg-error-50"
                    >
                      Delete Property
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-2xl shadow-soft p-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-primary-600">
                    ${rental.price.toLocaleString()}
                    <span className="text-lg font-normal text-gray-500">/month</span>
                  </div>
                </div>

                {rental.isAvailable ? (
                  <button
                    onClick={handleBookNow}
                    className="w-full btn-primary text-lg py-4"
                  >
                    {user ? 'Book Now' : 'Sign in to Book'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 px-6 py-4 rounded-xl font-medium cursor-not-allowed"
                  >
                    Not Available
                  </button>
                )}

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Property Type</span>
                    <span className="font-medium">Apartment</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Bedrooms</span>
                    <span className="font-medium">{rental.bedrooms || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Bathrooms</span>
                    <span className="font-medium">{rental.bathrooms || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">Square Feet</span>
                    <span className="font-medium">{rental.squareFeet || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && rental.images && rental.images.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh]">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={getImageUrl(rental.images[currentImageIndex], rental._id, currentImageIndex)}
              alt={rental.title}
              className="w-full h-full max-h-[80vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}


    </div>
  );
};

export default RentalDetail;

