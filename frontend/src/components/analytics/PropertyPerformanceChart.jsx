import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PropertyPerformanceChart = ({ data }) => {
  if (!data || !data.performance || data.performance.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
        <p className="text-gray-500">No property performance data available for the selected period.</p>
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

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  // Prepare data for the chart
  const chartData = data.performance.map(property => ({
    name: property.propertyTitle || 'Unknown Property',
    revenue: property.totalRevenue,
    bookings: property.totalBookings,
    occupancyRate: Math.min(property.occupancyRate || 0, 100), // Cap at 100%
    averageRate: property.averageNightlyRate || 0
  }));

  // Sort by revenue for better visualization
  chartData.sort((a, b) => b.revenue - a.revenue);

  // Limit to top 10 properties for better chart readability
  const topProperties = chartData.slice(0, 10);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Revenue: <span className="font-medium text-green-600">{formatCurrency(data.revenue)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Bookings: <span className="font-medium text-blue-600">{data.bookings}</span>
            </p>
            <p className="text-sm text-gray-600">
              Occupancy: <span className="font-medium text-purple-600">{formatPercentage(data.occupancyRate)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Avg Rate: <span className="font-medium text-orange-600">{formatCurrency(data.averageRate)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-600">Total Properties</p>
          <p className="text-2xl font-bold text-gray-900">{data.performance.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(data.performance.reduce((sum, p) => sum + p.totalRevenue, 0))}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-600">Avg Occupancy Rate</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatPercentage(
              data.performance.reduce((sum, p) => sum + (p.occupancyRate || 0), 0) / data.performance.length
            )}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topProperties} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
              interval={0}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
              {topProperties.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Property List */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-3">Top Performing Properties</h4>
        <div className="space-y-2">
          {topProperties.map((property, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="font-medium text-gray-900">{property.name}</span>
              </div>
              <div className="flex items-center space-x-4 text-gray-600">
                <span>{formatCurrency(property.revenue)}</span>
                <span>{property.bookings} bookings</span>
                <span>{formatPercentage(property.occupancyRate)} occupancy</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyPerformanceChart;

