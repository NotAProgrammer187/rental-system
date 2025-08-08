import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getImageUrl } from '../services/api';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const [userRentals, setUserRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Name</label>
                <p className="text-lg text-gray-800">{user.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Email</label>
                <p className="text-lg text-gray-800">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Member Since</label>
                <p className="text-lg text-gray-800">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Actions</h2>
            <div className="space-y-3">
              <button
                onClick={logout}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">My Rentals</h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-xl">Loading your rentals...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : userRentals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-lg mb-4">You haven't listed any rentals yet.</p>
            <a
              href="/create-rental"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              List Your First Property
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userRentals.map((rental) => (
              <div key={rental._id} className="bg-gray-50 rounded-lg p-4">
                {rental.images && rental.images.length > 0 && (
                  <img
                    src={getImageUrl(rental.images[0], rental._id, 0)}
                    alt={rental.title}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                )}
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {rental.title}
                </h3>
                <p className="text-gray-600 mb-2">{rental.location}</p>
                <p className="text-lg font-bold text-blue-600 mb-3">
                  ${rental.price}/month
                </p>
                <div className="flex space-x-2">
                  <a
                    href={`/rentals/${rental._id}`}
                    className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded hover:bg-blue-700 transition-colors"
                  >
                    View
                  </a>
                  <a
                    href={`/rentals/${rental._id}/edit`}
                    className="flex-1 bg-gray-600 text-white text-center py-2 px-3 rounded hover:bg-gray-700 transition-colors"
                  >
                    Edit
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;


