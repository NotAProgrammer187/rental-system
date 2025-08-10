import React, { useState, useEffect } from 'react';
import { CalendarIcon, FunnelIcon, ChartBarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const AnalyticsFilters = ({ filters, onFilterChange }) => {
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDates, setCustomDates] = useState({
    startDate: '',
    endDate: ''
  });

  const periods = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const groupByOptions = [
    { value: 'hour', label: 'Hourly' },
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' }
  ];

  useEffect(() => {
    loadUserProperties();
  }, []);

  useEffect(() => {
    // Show custom date picker when custom period is selected
    if (filters.period === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
      // Clear custom dates when switching away from custom period
      setCustomDates({ startDate: '', endDate: '' });
    }
  }, [filters.period]);

  const loadUserProperties = async () => {
    setLoadingProperties(true);
    try {
      const response = await api.get('/properties/my-properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handlePeriodChange = (e) => {
    const newPeriod = e.target.value;
    onFilterChange({ period: newPeriod });
    
    // If switching to custom, initialize with last 30 days as default
    if (newPeriod === 'custom') {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      setCustomDates({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    }
  };

  const handlePropertyChange = (e) => {
    onFilterChange({ propertyId: e.target.value });
  };

  const handleGroupByChange = (e) => {
    onFilterChange({ groupBy: e.target.value });
  };

  const handleCustomDateChange = (field, value) => {
    const newDates = { ...customDates, [field]: value };
    setCustomDates(newDates);
    
    // Only update filters if both dates are set
    if (newDates.startDate && newDates.endDate) {
      onFilterChange({ 
        period: 'custom',
        startDate: newDates.startDate,
        endDate: newDates.endDate
      });
    }
  };

  const handleQuickWeek = () => {
    onFilterChange({ period: '7d' });
  };

  const handleReset = () => {
    onFilterChange({ period: '30d', propertyId: '', groupBy: 'day' });
    setCustomDates({ startDate: '', endDate: '' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Period Filter */}
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filters.period}
            onChange={handlePeriodChange}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        {/* Property Filter */}
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filters.propertyId}
            onChange={handlePropertyChange}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loadingProperties}
          >
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.title}
              </option>
            ))}
          </select>
        </div>

        {/* Group By Filter */}
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filters.groupBy}
            onChange={handleGroupByChange}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {groupByOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-2 ml-auto">
          <button
            onClick={handleQuickWeek}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Quick Week
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomDatePicker && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Custom Date Range</h3>
            <button
              onClick={() => {
                setShowCustomDatePicker(false);
                onFilterChange({ period: '30d' });
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                Start Date:
              </label>
              <input
                type="date"
                id="startDate"
                value={customDates.startDate}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                max={customDates.endDate || undefined}
                className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                End Date:
              </label>
              <input
                type="date"
                id="endDate"
                value={customDates.endDate}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                min={customDates.startDate || undefined}
                max={new Date().toISOString().split('T')[0]}
                className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            {customDates.startDate && customDates.endDate && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Selected:</span> {formatDate(customDates.startDate)} - {formatDate(customDates.endDate)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsFilters;
