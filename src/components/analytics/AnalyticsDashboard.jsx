import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import RevenueSummary from './RevenueSummary';
import PropertyPerformanceChart from './PropertyPerformanceChart';
import BookingTrendsChart from './BookingTrendsChart';
import FinancialSummary from './FinancialSummary';
import UserBehaviorAnalytics from './UserBehaviorAnalytics';
import AnalyticsFilters from './AnalyticsFilters';
import ExportOptions from './ExportOptions';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: '30d',
    propertyId: '',
    groupBy: 'day'
  });

  const [analyticsData, setAnalyticsData] = useState({
    propertyPerformance: null,
    revenueSummary: null,
    bookingTrends: null,
    financialSummary: null,
    userBehavior: null
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const [
        propertyPerformanceRes,
        revenueSummaryRes,
        bookingTrendsRes,
        financialSummaryRes
      ] = await Promise.all([
        api.get(`/analytics/property-performance?period=${filters.period}${filters.propertyId ? `&propertyId=${filters.propertyId}` : ''}`),
        api.get(`/analytics/revenue-summary?period=${filters.period}`),
        api.get(`/analytics/booking-trends?period=${filters.period}&groupBy=${filters.groupBy}`),
        api.get(`/analytics/financial-summary?period=${filters.period}`)
      ]);

      // Load user behavior data only for admins
      let userBehaviorRes = null;
      if (user?.role === 'admin') {
        try {
          userBehaviorRes = await api.get(`/analytics/user-behavior?period=${filters.period}`);
        } catch (error) {
          console.log('User behavior data not available for non-admin users');
        }
      }

      setAnalyticsData({
        propertyPerformance: propertyPerformanceRes.data,
        revenueSummary: revenueSummaryRes.data,
        bookingTrends: bookingTrendsRes.data,
        financialSummary: financialSummaryRes.data,
        userBehavior: userBehaviorRes?.data || null
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
      showToast({ type: 'error', message: 'Failed to load analytics data' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExport = async (type, format) => {
    try {
      const response = await api.get(`/analytics/export/${type}?period=${filters.period}&format=${format}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report-${filters.period}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast({ type: 'success', message: `${type} report exported successfully` });
    } catch (error) {
      console.error('Export error:', error);
      showToast({ type: 'error', message: 'Failed to export report' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track your property performance, revenue, and booking trends
              </p>
            </div>
            <ExportOptions onExport={handleExport} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <AnalyticsFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Revenue Summary Cards */}
          <RevenueSummary data={analyticsData.revenueSummary} />

          {/* Property Performance */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Performance</h2>
            <PropertyPerformanceChart data={analyticsData.propertyPerformance} />
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Financial Overview</h2>
            <FinancialSummary data={analyticsData.financialSummary} />
          </div>

          {/* Booking Trends */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Trends</h2>
            <BookingTrendsChart data={analyticsData.bookingTrends} />
          </div>

          {/* User Behavior Analytics (Admin Only) */}
          {user?.role === 'admin' && analyticsData.userBehavior && (
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">User Behavior Insights</h2>
              <UserBehaviorAnalytics data={analyticsData.userBehavior} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

