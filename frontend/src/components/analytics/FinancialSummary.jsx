import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  CurrencyDollarIcon, 
  BanknotesIcon, 
  CreditCardIcon, 
  DocumentTextIcon,
  ClockIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const FinancialSummary = ({ data }) => {
  if (!data) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value, total) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  // Prepare data for the pie chart
  const pieData = [
    { name: 'Net Revenue', value: data.netRevenue, color: '#10B981' },
    { name: 'Platform Fee', value: data.platformFee, color: '#EF4444' },
    { name: 'Cleaning Fees', value: data.totalCleaningFees, color: '#3B82F6' },
    { name: 'Service Fees', value: data.totalServiceFees, color: '#8B5CF6' },
    { name: 'Taxes', value: data.totalTaxes, color: '#F59E0B' }
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-500">
            {formatPercentage(data.value, data.netRevenue + data.platformFee + data.totalCleaningFees + data.totalServiceFees + data.totalTaxes)}
          </p>
        </div>
      );
    }
    return null;
  };

  const metrics = [
    {
      name: 'Gross Revenue',
      value: data.grossRevenue,
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      description: 'Total revenue before fees'
    },
    {
      name: 'Net Revenue',
      value: data.netRevenue,
      icon: BanknotesIcon,
      color: 'bg-blue-500',
      description: 'Revenue after platform fees'
    },
    {
      name: 'Platform Fee',
      value: data.platformFee,
      icon: CreditCardIcon,
      color: 'bg-red-500',
      description: '10% platform service fee'
    },
    {
      name: 'Pending Payouts',
      value: data.pendingPayouts,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      description: 'Amount pending transfer'
    }
  ];

  const breakdownItems = [
    { label: 'Cleaning Fees', value: data.totalCleaningFees, color: 'text-blue-600' },
    { label: 'Service Fees', value: data.totalServiceFees, color: 'text-purple-600' },
    { label: 'Taxes', value: data.totalTaxes, color: 'text-orange-600' },
    { label: 'Total Bookings', value: data.totalBookings, color: 'text-gray-600' },
    { label: 'Average Booking Value', value: data.averageBookingValue, color: 'text-green-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-xl ${metric.color} bg-opacity-10`}>
                <metric.icon className={`h-6 w-6 ${metric.color.replace('bg-', 'text-').replace('-500', '-600')}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metric.value)}</p>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h3>
          <div className="space-y-4">
            {breakdownItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <span className="text-sm font-medium text-gray-600">{item.label}</span>
                <span className={`text-sm font-semibold ${item.color}`}>
                  {typeof item.value === 'number' && item.label.includes('Value') 
                    ? formatCurrency(item.value)
                    : typeof item.value === 'number' && item.label.includes('Fees') || item.label.includes('Taxes')
                    ? formatCurrency(item.value)
                    : item.value.toString()
                  }
                </span>
              </div>
            ))}
          </div>

          {/* Profit Margin */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Profit Margin</span>
              <span className="text-lg font-bold text-green-600">
                {formatPercentage(data.netRevenue, data.grossRevenue)}
              </span>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
                                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              {formatCurrency(data.netRevenue)} net from {formatCurrency(data.grossRevenue)} gross
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Financial Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-medium">Revenue Efficiency</p>
            <p>
              Your properties are generating {formatCurrency(data.averageBookingValue)} per booking on average, 
              with a {formatPercentage(data.netRevenue, data.grossRevenue)} profit margin after platform fees.
            </p>
          </div>
          <div>
            <p className="font-medium">Payout Status</p>
            <p>
              You have {formatCurrency(data.pendingPayouts)} in pending payouts. 
              Platform fees are automatically deducted at {formatPercentage(data.platformFee, data.grossRevenue)} of gross revenue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
