import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const HostDashboard = () => {
  const { showToast } = useToast();
  const [earnings, setEarnings] = useState(null);
  // Removed blocked dates management UI per request
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/host/earnings');
        setEarnings(data);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const params = new URLSearchParams();
      if (bookingFilter) params.set('status', bookingFilter);
      const { data } = await api.get(`/bookings/host?${params.toString()}`);
      setBookings(data.bookings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [bookingFilter]);

  // Blocked dates helpers removed

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold">Host Dashboard</h1>

      <section className="bg-white p-6 rounded-2xl shadow-soft">
        <h2 className="text-xl font-semibold mb-4">Earnings</h2>
        {earnings ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Total Earned</p>
              <p className="text-2xl font-bold">${earnings.totalEarned.toFixed(2)}</p>
            </div>
            <div>
              <a href="/api/host/earnings/export" className="btn-secondary">Export CSV</a>
            </div>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Bookings</h2>
          <select value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)} className="input-field w-auto">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {bookingsLoading ? (
          <p>Loading...</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-600">No bookings found.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b._id} className="border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{b.property?.title || 'Property'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()} · {b.guests?.adults || 1} guests
                  </p>
                  <p className="text-sm"><span className="text-gray-500">Status:</span> <span className="capitalize">{b.status}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {b.status === 'pending' && (
                    <>
                      <button onClick={async () => { await api.put(`/bookings/${b._id}/confirm`); showToast({ type: 'success', message: 'Booking approved' }); fetchBookings(); }} className="btn-primary">Approve</button>
                      <button onClick={async () => { await api.put(`/bookings/${b._id}/cancel`, { reason: 'Declined by host' }); showToast({ type: 'warning', message: 'Booking declined' }); fetchBookings(); }} className="btn-secondary">Decline</button>
                    </>
                  )}
                  {new Date(b.checkOut) <= new Date() && (
                    <a href={`/bookings/${b._id}`} className="btn-secondary">Leave a review</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Blocked dates section removed */}
    </div>
  );
};

export default HostDashboard;


