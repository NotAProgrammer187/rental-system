import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getImageUrl } from '../services/api';
import PaymentHistory from '../components/PaymentHistory';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const [userRentals, setUserRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('rentals');

  useEffect(() => {
    const fetchUserRentals = async () => {
      try {
        const response = await api.get('/rentals');
        // Filter rentals to show only user's rentals
        const userRentals = response.data.filter(rental => 
          rental.owner && rental.owner._id === user.id
        );
        setUserRentals(userRentals);
      } catch (error) {
        setError('Failed to fetch your rentals');
        console.error('Error fetching user rentals:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserRentals();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Please log in to view your profile</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600 mt-2">Manage your account and view your activity</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Information */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Name</label>
                  <p className="text-lg text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Email</label>
                  <p className="text-lg text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Member Since</label>
                  <p className="text-lg text-gray-900">
                    {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={logout}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'rentals', label: 'My Rentals', icon: '🏠' },
              { id: 'payments', label: 'Payment History', icon: '💳' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'rentals' && (
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Rentals</h2>
            
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-gray-600">Loading your rentals...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            ) : userRentals.length === 0 ? (
              <div className="text-center py-8">
                <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-600 text-lg mb-4">You haven't listed any rentals yet.</p>
                <a
                  href="/create-rental"
                  className="btn-primary"
                >
                  List Your First Property
                </a>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userRentals.map((rental) => (
                  <div key={rental._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-soft hover:shadow-lg transition-shadow">
                    {rental.images && rental.images.length > 0 && (
                      <img
                        src={getImageUrl(rental.images[0], rental._id, 0)}
                        alt={rental.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{rental.title}</h3>
                      <p className="text-gray-600 mb-2">{rental.location}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-primary-600">
                          ${rental.price?.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">per night</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment History</h2>
            <PaymentHistory />
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;


