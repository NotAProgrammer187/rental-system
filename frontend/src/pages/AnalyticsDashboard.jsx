import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import PropertyPerformanceChart from '../components/analytics/PropertyPerformanceChart';
import RevenueSummary from '../components/analytics/RevenueSummary';
import BookingTrendsChart from '../components/analytics/BookingTrendsChart';
import FinancialSummary from '../components/analytics/FinancialSummary';
import UserBehaviorAnalytics from '../components/analytics/UserBehaviorAnalytics';
import AnalyticsFilters from '../components/analytics/AnalyticsFilters';
import ExportOptions from '../components/analytics/ExportOptions';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: '30d',
    propertyId: '',
    groupBy: 'day',
    startDate: '',
    endDate: ''
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
      // Build query parameters for custom date ranges
      const buildQueryParams = (baseParams) => {
        if (filters.period === 'custom' && filters.startDate && filters.endDate) {
          return `${baseParams}&startDate=${filters.startDate}&endDate=${filters.endDate}`;
        }
        return baseParams;
      };

      const [
        propertyPerformanceRes,
        revenueSummaryRes,
        bookingTrendsRes,
        financialSummaryRes
      ] = await Promise.all([
        api.get(`/analytics/property-performance?period=${filters.period}${filters.propertyId ? `&propertyId=${filters.propertyId}` : ''}${buildQueryParams('')}`),
        api.get(`/analytics/revenue-summary?period=${filters.period}${buildQueryParams('')}`),
        api.get(`/analytics/booking-trends?period=${filters.period}&groupBy=${filters.groupBy}${buildQueryParams('')}`),
        api.get(`/analytics/financial-summary?period=${filters.period}${buildQueryParams('')}`)
      ]);

      // Load user behavior data only for admins
      let userBehaviorRes = null;
      if (user?.role === 'admin') {
        try {
          userBehaviorRes = await api.get(`/analytics/user-behavior?period=${filters.period}${buildQueryParams('')}`);
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
      // Build query parameters for custom date ranges
      let queryParams = `period=${filters.period}&format=${format}`;
      if (filters.period === 'custom' && filters.startDate && filters.endDate) {
        queryParams += `&startDate=${filters.startDate}&endDate=${filters.endDate}`;
      }
      
      const response = await api.get(`/analytics/export/${type}?${queryParams}`, {
        responseType: 'blob'
      });
      
      // Create filename with date range info
      let filename = `${type}-report-${filters.period}`;
      if (filters.period === 'custom' && filters.startDate && filters.endDate) {
        filename = `${type}-report-${filters.startDate}-to-${filters.endDate}`;
      }
      filename += `.${format}`;
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
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
