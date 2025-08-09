import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api, { getImageUrl } from '../services/api';

const MyBookings = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get('/bookings');
        setBookings(response.data.bookings || response.data);
      } catch (error) {
        setError('Failed to fetch bookings');
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBookings();
    }
  }, [user]);

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

  const filterBookings = (bookings) => {
    const now = new Date();
    switch (activeTab) {
      case 'upcoming':
        // Only confirmed future stays
        return bookings.filter(booking => 
          booking.status === 'confirmed' && new Date(booking.checkIn) > now
        );
      case 'pending':
        // Show all pending (typically future)
        return bookings.filter(booking => booking.status === 'pending');
      case 'active':
        return bookings.filter(booking => 
          booking.status === 'active' || 
          (booking.status === 'confirmed' && 
           new Date(booking.checkIn) <= now && 
           new Date(booking.checkOut) > now)
        );
      case 'past':
        return bookings.filter(booking => 
          booking.status === 'completed' || 
          new Date(booking.checkOut) < now
        );
      case 'cancelled':
        return bookings.filter(booking => booking.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const filteredBookings = filterBookings(bookings);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view your bookings</h2>
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
          <p className="text-gray-600">Loading your bookings...</p>
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
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-gray-600 mt-2">Manage your rental bookings</p>
            </div>
            <Link to="/rentals" className="btn-secondary">
              Browse Properties
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'upcoming', label: 'Upcoming', count: bookings.filter(booking => 
                booking.status === 'confirmed' && new Date(booking.checkIn) > new Date()
              ).length },
              { id: 'pending', label: 'Pending', count: bookings.filter(booking => 
                booking.status === 'pending'
              ).length },
              { id: 'active', label: 'Active', count: bookings.filter(booking => 
                booking.status === 'active' || 
                (booking.status === 'confirmed' && 
                 new Date(booking.checkIn) <= new Date() && 
                 new Date(booking.checkOut) > new Date())
              ).length },
              { id: 'past', label: 'Past', count: bookings.filter(booking => 
                booking.status === 'completed' || 
                new Date(booking.checkOut) < new Date()
              ).length },
              { id: 'cancelled', label: 'Cancelled', count: bookings.filter(booking => 
                booking.status === 'cancelled'
              ).length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
            <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab} bookings</h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'upcoming' && "You don't have any upcoming bookings."}
              {activeTab === 'pending' && "You don't have any pending bookings."}
              {activeTab === 'active' && "You don't have any active bookings."}
              {activeTab === 'past' && "You don't have any past bookings."}
              {activeTab === 'cancelled' && "You don't have any cancelled bookings."}
            </p>
            <Link to="/rentals" className="btn-primary">
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredBookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-2xl shadow-soft overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    {/* Property Info */}
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        {booking.property?.images && booking.property.images.length > 0 && (
                          <img
                            src={getImageUrl(booking.property.images[0], booking.property._id, 0)}
                            alt={booking.property.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {booking.property?.title || 'Property'}
                          </h3>
                          <p className="text-gray-600 mb-2">
                            {booking.property?.location || 'Location not available'}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span>Check-in: {formatDate(booking.checkIn)}</span>
                            <span>Check-out: {formatDate(booking.checkOut)}</span>
                            <span>{calculateNights(booking.checkIn, booking.checkOut)} nights</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col items-end space-y-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">
                          ${booking.pricing?.totalAmount?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-500">Total</div>
                      </div>

                      <div className="flex space-x-2">
                        <Link
                          to={`/bookings/${booking._id}`}
                          className="btn-secondary text-sm"
                        >
                          View Details
                        </Link>
                        {booking.status === 'pending' && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to cancel this booking?')) {
                                try {
                                  await api.put(`/bookings/${booking._id}/cancel`, {
                                    reason: 'Cancelled by guest'
                                  });
                                  window.location.reload();
                                } catch (error) {
                                  console.error('Error cancelling booking:', error);
                                  alert('Failed to cancel booking');
                                }
                              }
                            }}
                            className="btn-ghost text-error-600 hover:bg-error-50 text-sm"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
