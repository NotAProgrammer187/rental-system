import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api, { getImageUrl } from '../services/api';

const BookingDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await api.get(`/bookings/${id}`);
        setBooking(response.data);
      } catch (error) {
        setError('Failed to fetch booking details');
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBooking();
    }
  }, [id, user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate - checkInDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleCancelBooking = async () => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await api.put(`/bookings/${id}/cancel`, {
          reason: 'Cancelled by guest'
        });
        window.location.reload();
      } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Failed to cancel booking');
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view booking details</h2>
          <Link to="/login" className="btn-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
            <svg className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">Something went wrong</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Link to="/bookings" className="btn-primary">
              Back to Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Booking not found</h2>
          <Link to="/bookings" className="btn-primary">
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            to="/bookings" 
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          {/* Booking Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Booking Details
                </h1>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                  <span className="text-gray-500">
                    Booking ID: {booking._id}
                  </span>
                </div>
              </div>
              {booking.status === 'pending' && (
                <button
                  onClick={handleCancelBooking}
                  className="mt-4 sm:mt-0 btn-ghost text-error-600 hover:bg-error-50"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Property Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Information</h2>
                {booking.property && (
                  <div className="space-y-4">
                    {booking.property.images && booking.property.images.length > 0 && (
                      <img
                        src={getImageUrl(booking.property.images[0])}
                        alt={booking.property.title}
                        className="w-full h-48 object-cover rounded-xl"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.property.title}
                      </h3>
                      <p className="text-gray-600">{booking.property.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Details */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Check-in</label>
                      <p className="text-gray-900">{formatDate(booking.checkIn)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Check-out</label>
                      <p className="text-gray-900">{formatDate(booking.checkOut)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p className="text-gray-900">{calculateNights(booking.checkIn, booking.checkOut)} nights</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guests</label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <span className="text-gray-600">Adults:</span>
                        <span className="ml-2 font-medium">{booking.guests?.adults || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Children:</span>
                        <span className="ml-2 font-medium">{booking.guests?.children || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Infants:</span>
                        <span className="ml-2 font-medium">{booking.guests?.infants || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Pets:</span>
                        <span className="ml-2 font-medium">{booking.guests?.pets || 0}</span>
                      </div>
                    </div>
                  </div>

                  {booking.specialRequests && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Special Requests</label>
                      <p className="text-gray-900 mt-1">{booking.specialRequests}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing</h2>
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Base Price ({calculateNights(booking.checkIn, booking.checkOut)} nights)</span>
                    <span>${booking.pricing?.basePrice?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cleaning Fee</span>
                    <span>${booking.pricing?.cleaningFee?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee</span>
                    <span>${booking.pricing?.serviceFee?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${booking.pricing?.totalAmount?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Host Information */}
            {booking.host && (
              <div className="mt-8 border-t border-gray-200 pt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Host Information</h2>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {booking.host.name?.charAt(0).toUpperCase() || 'H'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{booking.host.name}</p>
                    <p className="text-gray-600">{booking.host.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetail;
