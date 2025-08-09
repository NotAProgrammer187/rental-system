import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getImageUrl } from '../services/api';
import PaymentForm from '../components/PaymentForm';
import BookingCalendar from '../components/BookingCalendar';

const BookingPage = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disabledDates, setDisabledDates] = useState([]);
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
  const [booking, setBooking] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const fetchRental = async () => {
      try {
        const response = await api.get(`/rentals/${id}`);
        setRental(response.data);
      } catch (error) {
        setError('Failed to fetch property details');
        console.error('Error fetching rental:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchDisabledDates = async () => {
      try {
        const resp = await api.get(`/bookings/rental/${id}/paid-dates`);
        if (resp.data && resp.data.success) {
          setDisabledDates(resp.data.dates || []);
        }
      } catch (e) {
        console.warn('Failed to load blocked dates:', e);
      }
    };

    if (id) {
      fetchRental();
      fetchDisabledDates();
    }
  }, [id]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: `/booking/${id}` } });
    }
  }, [user, loading, navigate, id]);

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

  const handleDateSelect = ({ checkIn, checkOut }) => {
    // Format dates properly to avoid timezone issues
    const formatDateForInput = (date) => {
      if (!date) return '';
      // Use local date formatting to avoid timezone shifts
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setFormData(prev => ({
      ...prev,
      checkIn: formatDateForInput(checkIn),
      checkOut: formatDateForInput(checkOut)
    }));
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
    setSubmitLoading(true);
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
      setSubmitLoading(false);
    }
  };

  const handlePaymentSuccess = (payment) => {
    navigate(`/bookings/${booking._id}`);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setBooking(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error && !rental) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-soft p-8">
            <svg className="h-16 w-16 text-error-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Property</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link to="/rentals" className="btn-primary">
              Browse Other Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-soft p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h2>
            <p className="text-gray-600 mb-6">The property you're looking for doesn't exist or has been removed.</p>
            <Link to="/rentals" className="btn-primary">
              Browse Other Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (showPayment && booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-soft max-w-md w-full">
          <PaymentForm
            booking={booking}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    );
  }

  const totalGuests = formData.guests.adults + formData.guests.children + formData.guests.infants;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-soft sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Link 
              to={`/rentals/${id}`}
              className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors group"
            >
              <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Property
            </Link>
            <div className="text-left sm:text-right">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Complete Your Booking</h1>
              <p className="text-sm text-gray-500">Secure and fast checkout</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Property Information */}
          <div className="space-y-6 animate-slide-in-left">
            {/* Property Card */}
            <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
              {/* Property Image */}
              <div className="relative h-64">
                {rental.images && rental.images.length > 0 ? (
                  <img
                    src={getImageUrl(rental.images[0], rental._id, 0)}
                    alt={rental.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center" style={{ display: rental.images?.length > 0 ? 'none' : 'flex' }}>
                  <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {/* Property Type Badge */}
                <div className="absolute top-4 left-4 bg-primary-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                  Entire Place
                </div>
              </div>

              {/* Property Details */}
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{rental.title}</h2>
                <p className="text-gray-600 flex items-center mb-4">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {rental.location}
                </p>

                {/* Property Features */}
                <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{rental.bedrooms || 1}</p>
                    <p className="text-xs text-gray-500">bedroom{(rental.bedrooms || 1) !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 6h8" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{rental.bathrooms || 1}</p>
                    <p className="text-xs text-gray-500">bathroom{(rental.bathrooms || 1) !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900">8</p>
                    <p className="text-xs text-gray-500">max guests</p>
                  </div>
                </div>

                {/* Host Information */}
                {rental.owner && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {rental.owner.name?.charAt(0).toUpperCase() || 'H'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Hosted by {rental.owner.name}</p>
                        <p className="text-sm text-gray-500">Superhost · 2 years hosting</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancellation policy</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Free cancellation for 48 hours after booking.</p>
                <p>Cancel before check-in on Dec 15 for a partial refund.</p>
                <p className="text-primary-600 font-medium cursor-pointer hover:underline">
                  Learn more about cancellation policies
                </p>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="space-y-6 animate-slide-in-right">
            {/* Booking Card */}
            <div className="bg-white rounded-2xl shadow-soft p-4 lg:p-6 xl:sticky xl:top-32">
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <span className="text-3xl font-bold text-gray-900">${rental.price.toLocaleString()}</span>
                  <span className="text-lg text-gray-500 ml-1">night</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">4.9</span>
                  <span className="text-sm text-gray-500">· 127 reviews</span>
                </div>
              </div>

                              {error && (
                <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl animate-bounce-in">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-error-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-error-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Enhanced Calendar */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    Select Your Dates
                  </label>
                  <div className="border border-gray-300 rounded-xl overflow-hidden">
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
                </div>

                {/* Guests */}
                <div className="border border-gray-300 rounded-xl p-3">
                  <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1">
                    Guests
                  </label>
                  <div className="text-sm text-gray-900">
                    {totalGuests} guest{totalGuests !== 1 ? 's' : ''}
                  </div>
                  
                  {/* Guest Details */}
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Adults</p>
                        <p className="text-xs text-gray-500">Ages 13 or above</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            guests: { ...prev.guests, adults: Math.max(1, prev.guests.adults - 1) }
                          }))}
                          disabled={formData.guests.adults <= 1}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Decrease number of adults"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{formData.guests.adults}</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            guests: { ...prev.guests, adults: Math.min(8, prev.guests.adults + 1) }
                          }))}
                          disabled={formData.guests.adults >= 8}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Increase number of adults"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Children</p>
                        <p className="text-xs text-gray-500">Ages 2-12</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            guests: { ...prev.guests, children: Math.max(0, prev.guests.children - 1) }
                          }))}
                          disabled={formData.guests.children <= 0}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Decrease number of children"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{formData.guests.children}</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            guests: { ...prev.guests, children: Math.min(5, prev.guests.children + 1) }
                          }))}
                          disabled={formData.guests.children >= 5}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Increase number of children"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Infants</p>
                        <p className="text-xs text-gray-500">Under 2</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            guests: { ...prev.guests, infants: Math.max(0, prev.guests.infants - 1) }
                          }))}
                          disabled={formData.guests.infants <= 0}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Decrease number of infants"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{formData.guests.infants}</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            guests: { ...prev.guests, infants: Math.min(3, prev.guests.infants + 1) }
                          }))}
                          disabled={formData.guests.infants >= 3}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Increase number of infants"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message the host (optional)
                  </label>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Let the host know if you have any special requests..."
                  />
                </div>

                {/* Pricing Breakdown */}
                {calculateNights() > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        ${rental.price.toLocaleString()} × {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                      </span>
                      <span className="font-medium">
                        ${(rental.price * calculateNights()).toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-gray-900">
                          ${calculateTotal().toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reserve Button */}
                <button
                  type="submit"
                  disabled={submitLoading || !formData.checkIn || !formData.checkOut}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating reservation...
                    </div>
                  ) : (
                    `Reserve${calculateNights() > 0 ? ` for $${calculateTotal().toFixed(0)}` : ''}`
                  )}
                </button>

                <p className="text-center text-xs text-gray-500">
                  You won't be charged yet
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
