import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { EyeIcon, CursorArrowRaysIcon, MagnifyingGlassIcon, UserGroupIcon, ArrowTrendingUpIcon, MapPinIcon } from '@heroicons/react/24/outline';

const UserBehaviorAnalytics = ({ data }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!data) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const topViewedProperties = data.topViewedProperties?.slice(0, 10) || [];
  const conversionRates = data.conversionRates || [];
  const searchPatterns = data.searchPatterns || [];
  const userSegments = data.userSegments || [];

  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: EyeIcon },
    { id: 'properties', label: 'Property Insights', icon: MapPinIcon },
    { id: 'conversions', label: 'Conversion Analysis', icon: ArrowTrendingUpIcon },
    { id: 'search', label: 'Search Patterns', icon: MagnifyingGlassIcon },
    { id: 'users', label: 'User Segments', icon: UserGroupIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <EyeIcon className="h-8 w-8 text-blue-100" />
                <div className="ml-4">
                  <p className="text-blue-100 text-sm font-medium">Total Views</p>
                  <p className="text-2xl font-bold">{formatNumber(data.totalViews || 0)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <CursorArrowRaysIcon className="h-8 w-8 text-green-100" />
                <div className="ml-4">
                  <p className="text-green-100 text-sm font-medium">Conversion Rate</p>
                  <p className="text-2xl font-bold">{formatPercentage(data.conversionRate || 0)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <MagnifyingGlassIcon className="h-8 w-8 text-purple-100" />
                <div className="ml-4">
                  <p className="text-purple-100 text-sm font-medium">Search Sessions</p>
                  <p className="text-2xl font-bold">{formatNumber(data.searchSessions || 0)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-orange-100" />
                <div className="ml-4">
                  <p className="text-orange-100 text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold">{formatNumber(data.activeUsers || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Activity Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity Over Time</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.userActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="views" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="searches" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="bookings" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'properties' && (
        <div className="space-y-6">
          {/* Most Viewed Properties */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Viewed Properties</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topViewedProperties}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="propertyName" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="views" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Property Conversion Rates */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Conversion Rates</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.propertyConversions || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="propertyName" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="conversionRate" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'conversions' && (
        <div className="space-y-6">
          {/* Conversion Trends */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rate Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conversionRates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="conversionRate" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              {data.conversionFunnel?.map((step, index) => (
                <div key={step.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{step.name}</span>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${step.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">{step.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Pattern Frequency */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Pattern Frequency</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={searchPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pattern" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="frequency" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Popular Search Terms */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Search Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.popularSearches?.map((search, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{search.term}</span>
                  <span className="text-sm text-gray-500">{search.count} searches</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Segmentation */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
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
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Behavior Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Duration</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average</span>
                  <span className="text-sm font-medium">{data.avgSessionDuration || '0'} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Median</span>
                  <span className="text-sm font-medium">{data.medianSessionDuration || '0'} min</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bounce Rate</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Overall</span>
                  <span className="text-sm font-medium">{formatPercentage(data.bounceRate || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mobile</span>
                  <span className="text-sm font-medium">{formatPercentage(data.mobileBounceRate || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Device Usage */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Usage</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.deviceUsage || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.deviceUsage?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBehaviorAnalytics;
