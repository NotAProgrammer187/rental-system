import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { EyeIcon, MousePointerClickIcon, SearchIcon, UserGroupIcon, TrendingUpIcon, MapPinIcon } from '@heroicons/react/24/outline';

const UserBehaviorAnalytics = ({ data }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!data) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      0: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Prepare data for charts
  const topViewedProperties = data.topViewedProperties?.slice(0, 10) || [];
  const conversionRates = data.conversionRates || [];
  const searchPatterns = data.searchPatterns || [];
  const userSegments = data.userSegments || [];

  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {data.views && (
              <p className="text-sm text-gray-600">
                Views: <span className="font-medium text-blue-600">{formatNumber(data.views)}</span>
              </p>
            )}
            {data.conversionRate && (
              <p className="text-sm text-gray-600">
                Conversion: <span className="font-medium text-green-600">{formatPercentage(data.conversionRate)}</span>
              </p>
            )}
            {data.revenue && (
              <p className="text-sm text-gray-600">
                Revenue: <span className="font-medium text-purple-600">{formatCurrency(data.revenue)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUpIcon },
    { id: 'properties', label: 'Property Insights', icon: EyeIcon },
    { id: 'conversions', label: 'Conversion Analysis', icon: MousePointerClickIcon },
    { id: 'search', label: 'Search Patterns', icon: SearchIcon },
    { id: 'users', label: 'User Segments', icon: UserGroupIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center">
                <EyeIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total Views</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(data.totalViews || 0)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center">
                <MousePointerClickIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-green-900">{formatPercentage(data.overallConversionRate || 0)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center">
                <SearchIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">Search Sessions</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(data.totalSearchSessions || 0)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-600">Active Users</p>
                  <p className="text-2xl font-bold text-orange-900">{formatNumber(data.activeUsers || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Behavior Trends */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Behavior Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.behaviorTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="views" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="searches" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="bookings" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'properties' && (
        <div className="space-y-6">
          {/* Top Viewed Properties */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Viewed Properties</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topViewedProperties}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="propertyTitle" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="views" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Property Performance Table */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Performance Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topViewedProperties.map((property, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {property.propertyTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(property.views)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(property.conversionRate || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(property.revenue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'conversions' && (
        <div className="space-y-6">
          {/* Conversion Rate Trends */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rate Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conversionRates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip />
                  <Line type="monotone" dataKey="conversionRate" stroke="#10B981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              {data.conversionFunnel?.map((step, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{step.name}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${step.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatNumber(step.count)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(step.percentage)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Patterns */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Pattern Analysis</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={searchPatterns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="pattern" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Popular Search Terms */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Search Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.popularSearchTerms?.map((term, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{term.query}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatNumber(term.count)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(term.conversionRate || 0)} conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Segments */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Segmentation</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userSegments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userSegments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Behavior Insights */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Behavior Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Session Duration</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Session</span>
                    <span className="text-sm font-medium text-gray-900">{data.avgSessionDuration || 0} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Bounce Rate</span>
                    <span className="text-sm font-medium text-gray-900">{formatPercentage(data.bounceRate || 0)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Device Usage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Mobile</span>
                    <span className="text-sm font-medium text-gray-900">{formatPercentage(data.mobileUsage || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Desktop</span>
                    <span className="text-sm font-medium text-gray-900">{formatPercentage(data.desktopUsage || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBehaviorAnalytics;

