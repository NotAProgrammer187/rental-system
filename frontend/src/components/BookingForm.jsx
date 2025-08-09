import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PaymentForm from './PaymentForm';
import BookingCalendar from './BookingCalendar';

const BookingForm = ({ rental, disabledDates = [], onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: {
      adults: 1,
      children: 0,
      infants: 0,
      pets: 0
    },
    specialRequests: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('guests.')) {
      const guestType = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        guests: {
          ...prev.guests,
          [guestType]: parseInt(value) || 0
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    if (error) setError('');
  };

  const calculateNights = () => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    const diffTime = Math.abs(checkOut - checkIn);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateTotal = () => {
    const nights = calculateNights();
    if (!nights || !rental) return 0;
    
    const basePrice = rental.price * nights;
    return basePrice;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate dates
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      const now = new Date();

      if (checkInDate < now) {
        throw new Error('Check-in date cannot be in the past');
      }

      if (checkOutDate <= checkInDate) {
        throw new Error('Check-out date must be after check-in date');
      }

      const nights = calculateNights();
      if (nights < 1) {
        throw new Error('Minimum stay is 1 night');
      }

      const bookingData = {
        propertyId: rental._id,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        guests: JSON.stringify(formData.guests),
        specialRequests: formData.specialRequests,
        paymentMethod: 'stripe' // Default payment method
      };

      const response = await api.post('/bookings', bookingData);
      
      // Set the booking and show payment form
      setBooking(response.data);
      setShowPayment(true);
    } catch (error) {
      console.error('Booking error:', error);
      setError(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (payment) => {
    if (onSuccess) {
      onSuccess({ ...booking, payment });
    } else {
      navigate(`/bookings/${booking._id}`);
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setBooking(null);
  };

  const handleDateSelect = ({ checkIn, checkOut }) => {
    setFormData(prev => ({
      ...prev,
      checkIn: checkIn ? new Date(checkIn).toISOString().split('T')[0] : '',
      checkOut: checkOut ? new Date(checkOut).toISOString().split('T')[0] : ''
    }));
  };

  if (showPayment && booking) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <PaymentForm
            booking={booking}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Book Your Stay</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Property Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-4">
              {rental.images && rental.images.length > 0 && (
                <img
                  src={rental.images[0]}
                  alt={rental.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{rental.title}</h3>
                <p className="text-gray-600">{rental.location}</p>
                <p className="text-primary-600 font-semibold">${rental.price} per night</p>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="mb-6">
            <BookingCalendar
              property={rental}
              selectedDates={{
                checkIn: formData.checkIn ? new Date(formData.checkIn) : null,
                checkOut: formData.checkOut ? new Date(formData.checkOut) : null,
              }}
              disabledDates={disabledDates}
              onDateSelect={handleDateSelect}
              minStay={1}
              maxStay={30}
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Date *
                </label>
                <input
                  type="date"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Date *
                </label>
                <input
                  type="date"
                  name="checkOut"
                  value={formData.checkOut}
                  onChange={handleChange}
                  required
                  min={formData.checkIn || new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>
            </div>

            {/* Guests */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Guests</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adults
                  </label>
                  <input
                    type="number"
                    name="guests.adults"
                    value={formData.guests.adults}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Children
                  </label>
                  <input
                    type="number"
                    name="guests.children"
                    value={formData.guests.children}
                    onChange={handleChange}
                    min="0"
                    max="10"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Infants
                  </label>
                  <input
                    type="number"
                    name="guests.infants"
                    value={formData.guests.infants}
                    onChange={handleChange}
                    min="0"
                    max="5"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pets
                  </label>
                  <input
                    type="number"
                    name="guests.pets"
                    value={formData.guests.pets}
                    onChange={handleChange}
                    min="0"
                    max="3"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests
              </label>
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleChange}
                rows="3"
                className="input-field"
                placeholder="Any special requests or requirements..."
              />
            </div>

            {/* Pricing Summary */}
            {calculateNights() > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      ${rental.price} × {calculateNights()} nights
                    </span>
                    <span className="font-medium">
                      ${(rental.price * calculateNights()).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-primary-600">
                        ${calculateTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.checkIn || !formData.checkOut}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Booking...
                  </div>
                ) : (
                  `Book for $${calculateTotal().toLocaleString()}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;
