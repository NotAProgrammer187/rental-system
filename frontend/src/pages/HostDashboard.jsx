import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  CurrencyDollarIcon,
  CalendarIcon,
  HomeIcon,
  UserGroupIcon,
  ChartBarIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const HostDashboard = () => {
  const { showToast } = useToast();
  const [earnings, setEarnings] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState('');
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    averageRating: 0,
    totalViews: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load earnings data
        const { data: earningsData } = await api.get('/host/earnings');
        setEarnings(earningsData);

        // Load properties data
        const { data: propertiesData } = await api.get('/properties?owner=me');
        setProperties(propertiesData.properties || []);
        setPropertiesLoading(false);

        // Load bookings data
        await fetchBookings();

        // Calculate stats
        calculateStats(propertiesData.properties || [], bookings);
      } catch (e) {
        console.error('Error loading dashboard data:', e);
        showToast({ type: 'error', message: 'Failed to load dashboard data' });
      }
    };
    loadData();
  }, []);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const params = new URLSearchParams();
      if (bookingFilter) params.set('status', bookingFilter);
      const { data } = await api.get(`/bookings/host?${params.toString()}`);
      setBookings(data.bookings || []);
      calculateStats(properties, data.bookings || []);
    } catch (e) {
      console.error('Error fetching bookings:', e);
      showToast({ type: 'error', message: 'Failed to load bookings' });
    } finally {
      setBookingsLoading(false);
    }
  };

  const calculateStats = (props, bks) => {
    const activeBookings = bks.filter(b => ['confirmed', 'active'].includes(b.status)).length;
    const pendingBookings = bks.filter(b => b.status === 'pending').length;
    const completedBookings = bks.filter(b => b.status === 'completed').length;
    
    // Calculate average rating from properties
    const totalRating = props.reduce((sum, prop) => sum + (prop.rating || 0), 0);
    const averageRating = props.length > 0 ? (totalRating / props.length).toFixed(1) : 0;
    
    // Calculate total views (placeholder - would need backend support)
    const totalViews = props.reduce((sum, prop) => sum + (prop.views || 0), 0);

    setStats({
      totalProperties: props.length,
      activeBookings,
      pendingBookings,
      completedBookings,
      averageRating,
      totalViews
    });
  };

  useEffect(() => {
    fetchBookings();
  }, [bookingFilter]);

  const handleBookingAction = async (bookingId, action) => {
    try {
      if (action === 'confirm') {
        await api.put(`/bookings/${bookingId}/confirm`);
        showToast({ type: 'success', message: 'Booking approved successfully' });
      } else if (action === 'decline') {
        await api.put(`/bookings/${bookingId}/cancel`, { reason: 'Declined by host' });
        showToast({ type: 'warning', message: 'Booking declined' });
      }
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      showToast({ type: 'error', message: 'Failed to update booking' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'confirmed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'active': return <CheckCircleIcon className="w-4 h-4" />;
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'cancelled': return <XCircleIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your properties and track your earnings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings */}
          <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {earnings ? formatCurrency(earnings.totalEarned) : 'Loading...'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+12.5%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>

          {/* Properties */}
          <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Properties</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <HomeIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/create-rental" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                + Add Property
              </Link>
            </div>
          </div>

          {/* Active Bookings */}
          <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeBookings}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <CalendarIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">{stats.pendingBookings} pending</span>
            </div>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <StarIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <StarIcon 
                    key={i} 
                    className={`w-4 h-4 ${i < Math.floor(stats.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Properties & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Properties Overview */}
            <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">My Properties</h2>
                <Link to="/create-rental" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  + Add New
                </Link>
              </div>
              
              {propertiesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading properties...</p>
                </div>
              ) : properties.length === 0 ? (
                <div className="text-center py-8">
                  <HomeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No properties yet</p>
                  <Link to="/create-rental" className="btn-primary">
                    List Your First Property
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {properties.slice(0, 3).map((property) => (
                    <div key={property._id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0">
                        {property.images && property.images[0] ? (
                          <img 
                            src={property.images[0]} 
                            alt={property.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <HomeIcon className="w-full h-full text-gray-400 p-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{property.title}</p>
                        <p className="text-xs text-gray-500">{property.location?.formattedAddress}</p>
                        <div className="flex items-center mt-1">
                          <StarIcon className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                          <span className="text-xs text-gray-600">{property.rating || 0}</span>
                          <span className="text-xs text-gray-500 ml-2">${property.pricing?.basePrice || 0}/night</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {properties.length > 3 && (
                    <Link to="/host" className="block text-center text-primary-600 hover:text-primary-700 text-sm font-medium py-2">
                      View all {properties.length} properties
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link to="/create-rental" className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <HomeIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700 font-medium">List New Property</span>
                </Link>
                <Link to="/messages" className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <UserGroupIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700 font-medium">View Messages</span>
                </Link>
                <Link to="/bookings" className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <CalendarIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-700 font-medium">Manage Bookings</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Bookings & Earnings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bookings Section */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
                  <select 
                    value={bookingFilter} 
                    onChange={(e) => setBookingFilter(e.target.value)} 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Bookings</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div className="p-6">
                {bookingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading bookings...</p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No bookings found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.slice(0, 5).map((booking) => (
                      <div key={booking._id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <UserGroupIcon className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{booking.property?.title || 'Property'}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {booking.guests?.adults || 1} guests • {formatCurrency(booking.pricing?.totalAmount || 0)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(booking.status)}
                              <span className="capitalize">{booking.status}</span>
                            </div>
                          </span>
                          
                          {booking.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleBookingAction(booking._id, 'confirm')}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleBookingAction(booking._id, 'decline')}
                                className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          
                          {new Date(booking.checkOut) <= new Date() && (
                            <Link 
                              to={`/bookings/${booking._id}`}
                              className="px-3 py-1 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              Review
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {bookings.length > 5 && (
                      <div className="text-center pt-4">
                        <Link to="/bookings" className="text-primary-600 hover:text-primary-700 font-medium">
                          View all {bookings.length} bookings
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Earnings Chart Section */}
            {earnings && earnings.monthly && earnings.monthly.length > 0 && (
              <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Earnings Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Monthly Breakdown</h3>
                    <div className="space-y-3">
                      {earnings.monthly.slice(-6).map((month, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {new Date(2024, month._id.month - 1).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="font-medium text-gray-900">{formatCurrency(month.amount)}</span>
                          <span className="text-sm text-gray-500">({month.bookings} bookings)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Bookings:</span>
                        <span className="font-medium">{earnings.totalPaidBookings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recent Payouts:</span>
                        <span className="font-medium">{formatCurrency(earnings.upcomingPayouts.amount)}</span>
                      </div>
                      <div className="pt-3">
                        <a 
                          href="/api/host/earnings/export" 
                          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <ChartBarIcon className="w-4 h-4 mr-2" />
                          Export Earnings Report
                        </a>
                      </div>
                    </div>
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

export default HostDashboard;


