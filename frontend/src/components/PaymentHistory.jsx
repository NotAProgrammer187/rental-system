import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../services/api';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [filter, page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: 10,
        skip: (page - 1) * 10
      });
      
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await api.get(`/payments/history/user?${params}`);
      
      if (response.data.success) {
        if (page === 1) {
          setPayments(response.data.payments);
        } else {
          setPayments(prev => [...prev, ...response.data.payments]);
        }
        
        setHasMore(response.data.payments.length === 10);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/payments/stats/user');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
    setPayments([]);
  };

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">Loading payment history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Payments</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalPayments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats.totalAmount || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Refunded</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats.totalRefunded || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-lg font-semibold text-gray-900">{stats.completedPayments || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-soft p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Payments' },
            { id: 'completed', label: 'Completed' },
            { id: 'pending', label: 'Pending' },
            { id: 'failed', label: 'Failed' },
            { id: 'refunded', label: 'Refunded' }
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => handleFilterChange(filterOption.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === filterOption.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment List */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-soft p-8 text-center">
          <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? "You haven't made any payments yet."
              : `No ${filter} payments found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment._id} className="bg-white rounded-xl shadow-soft p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                {/* Payment Info */}
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    {payment.booking?.property?.images && payment.booking.property.images.length > 0 && (
                      <img
                        src={getImageUrl(payment.booking.property.images[0], payment.booking.property._id, 0)}
                        alt={payment.booking.property.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {payment.booking?.property?.title || 'Property'}
                      </h3>
                      <p className="text-gray-600 mb-2">
                        {payment.booking?.property?.location || 'Location not available'}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>Payment ID: {payment._id.slice(-8)}</span>
                        <span>Date: {formatDate(payment.createdAt)}</span>
                        <span>Method: {payment.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                      {getStatusText(payment.status)}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">
                      {formatCurrency(payment.amount, payment.currency)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.refunds && payment.refunds.length > 0 && (
                        <span className="text-red-600">
                          Refunded: {formatCurrency(payment.totalRefunded, payment.currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      to={`/bookings/${payment.booking?._id}`}
                      className="btn-secondary text-sm"
                    >
                      View Booking
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;

