import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

const BookingTrendsChart = ({ data }) => {
  const [chartType, setChartType] = useState('bookings'); // 'bookings' or 'revenue'
  
  if (!data || !data.trends || data.trends.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📈</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Trend Data</h3>
        <p className="text-gray-500">No booking trend data available for the selected period.</p>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (item) => {
    if (item._id.hour !== undefined) {
      return `${item._id.month}/${item._id.day} ${item._id.hour}:00`;
    } else if (item._id.day !== undefined) {
      return `${item._id.month}/${item._id.day}`;
    } else if (item._id.week !== undefined) {
      return `Week ${item._id.week}, ${item._id.year}`;
    } else {
      return `${item._id.month}/${item._id.year}`;
    }
  };

  // Prepare data for the chart
  const chartData = data.trends.map(item => ({
    date: formatDate(item),
    bookings: item.bookings || 0,
    revenue: item.revenue || 0,
    averageLeadTime: item.averageLeadTime || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Bookings: <span className="font-medium text-blue-600">{payload[0]?.payload.bookings}</span>
            </p>
            <p className="text-sm text-gray-600">
              Revenue: <span className="font-medium text-green-600">{formatCurrency(payload[0]?.payload.revenue)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Avg Lead Time: <span className="font-medium text-purple-600">{payload[0]?.payload.averageLeadTime?.toFixed(1)} days</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setChartType('bookings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              chartType === 'bookings'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Bookings
          </button>
          <button
            onClick={() => setChartType('revenue')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              chartType === 'revenue'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Revenue
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          Grouped by: <span className="font-medium capitalize">{data.groupBy}</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold text-blue-600">
            {chartData.reduce((sum, item) => sum + item.bookings, 0)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-600">Avg Lead Time</p>
          <p className="text-2xl font-bold text-purple-600">
            {data.averageBookingLength?.toFixed(1) || 0} days
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tickFormatter={(value) => chartType === 'revenue' ? formatCurrency(value) : value.toString()}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey={chartType === 'revenue' ? 'revenue' : 'bookings'}
              stroke={chartType === 'revenue' ? '#10B981' : '#3B82F6'}
              fill={chartType === 'revenue' ? '#10B981' : '#3B82F6'}
              fillOpacity={0.1}
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Analysis */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-3">Trend Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Peak Periods</p>
            <p className="text-sm font-medium text-gray-900">
              {(() => {
                const sorted = [...chartData].sort((a, b) => 
                  chartType === 'revenue' ? b.revenue - a.revenue : b.bookings - a.bookings
                );
                return sorted.slice(0, 3).map(item => item.date).join(', ');
              })()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Average {chartType === 'revenue' ? 'Revenue' : 'Bookings'} per {data.groupBy}</p>
            <p className="text-sm font-medium text-gray-900">
              {chartType === 'revenue' 
                ? formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0) / chartData.length)
                : Math.round(chartData.reduce((sum, item) => sum + item.bookings, 0) / chartData.length)
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTrendsChart;

