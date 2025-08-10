import React from 'react';
import { CalendarIcon, FunnelIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const AnalyticsFilters = ({ filters, onFilterChange }) => {
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

  const handlePeriodChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      // TODO: Implement custom date range picker
      onFilterChange({ period: '30d' });
    } else {
      onFilterChange({ period: value });
    }
  };

  const handlePropertyChange = (e) => {
    onFilterChange({ propertyId: e.target.value });
  };

  const handleGroupByChange = (e) => {
    onFilterChange({ groupBy: e.target.value });
  };

  return (
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
        >
          <option value="">All Properties</option>
          {/* TODO: Populate with user's properties */}
          <option value="property1">Property 1</option>
          <option value="property2">Property 2</option>
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
          onClick={() => onFilterChange({ period: '30d', propertyId: '', groupBy: 'day' })}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset
        </button>
        <button
          onClick={() => onFilterChange({ period: '7d', propertyId: '', groupBy: 'day' })}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Quick Week
        </button>
      </div>
    </div>
  );
};

export default AnalyticsFilters;

