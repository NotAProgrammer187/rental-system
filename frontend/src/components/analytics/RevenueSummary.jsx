import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, CalendarIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';

const RevenueSummary = ({ data }) => {
  if (!data) return null;

  const { currentPeriod, previousPeriod, growthRate } = data;
  const isPositiveGrowth = growthRate >= 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const metrics = [
    {
      name: 'Total Revenue',
      value: formatCurrency(currentPeriod.totalRevenue),
      change: growthRate,
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      changeColor: isPositiveGrowth ? 'text-green-600' : 'text-red-600'
    },
    {
      name: 'Total Bookings',
      value: formatNumber(currentPeriod.totalBookings),
      icon: UserGroupIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Average Booking Value',
      value: formatCurrency(currentPeriod.averageBookingValue),
              icon: ArrowTrendingUpIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Total Nights',
      value: formatNumber(currentPeriod.totalNights),
      icon: ClockIcon,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
          <div className="flex items-center">
            <div className={`flex-shrink-0 p-3 rounded-xl ${metric.color} bg-opacity-10`}>
              <metric.icon className={`h-6 w-6 ${metric.color.replace('bg-', 'text-').replace('-500', '-600')}`} />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">{metric.name}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              {metric.change !== undefined && (
                <div className="flex items-center mt-1">
                  {isPositiveGrowth ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                                          <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${metric.changeColor}`}>
                    {isPositiveGrowth ? '+' : ''}{growthRate.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs previous period</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RevenueSummary;
