const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const User = require('../models/User');

// Utility to expand a date range into an array of YYYY-MM-DD strings (check-in inclusive, check-out exclusive)
function expandDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  // normalize to midnight UTC for stable string output
  while (current < end) {
    const y = current.getUTCFullYear();
    const m = (current.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = current.getUTCDate().toString().padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

// GET /api/bookings - Get user's bookings
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { guest: req.user._id };
    
    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate('property', 'title images location price')
      .populate('host', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);

    res.json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bookings/rental/:rentalId/paid-dates - Dates blocked by paid bookings for a rental
router.get('/rental/:rentalId/paid-dates', async (req, res) => {
  try {
    const { rentalId } = req.params;
    // only consider bookings that are actually paid
    const bookings = await Booking.find({
      property: rentalId,
      'payment.status': 'paid'
    }).select('checkIn checkOut');

    const disabledDatesSet = new Set();
    bookings.forEach(b => {
      expandDateRange(b.checkIn, b.checkOut).forEach(ds => disabledDatesSet.add(ds));
    });

    res.json({
      success: true,
      dates: Array.from(disabledDatesSet)
    });
  } catch (error) {
    console.error('Error fetching paid dates:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/bookings/host - Get host's bookings
router.get('/host', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { host: req.user._id };
    
    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate('property', 'title images location')
      .populate('guest', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);

    res.json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching host bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bookings/:id - Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('property', 'title images location price owner')
      .populate('guest', 'name email phone avatar')
      .populate('host', 'name email phone avatar');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is authorized to view this booking
    const guestId = booking.guest._id ? booking.guest._id.toString() : booking.guest.toString();
    const hostId = booking.host._id ? booking.host._id.toString() : booking.host.toString();
    const userId = req.user._id.toString();

    if (guestId !== userId && hostId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/bookings - Create new booking
router.post('/', auth, async (req, res) => {
  try {
    const {
      propertyId,
      checkIn,
      checkOut,
      guests,
      specialRequests,
      paymentMethod
    } = req.body;

    // Validate rental exists
    const rental = await Rental.findById(propertyId);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Check if rental is available
    if (!rental.isAvailable) {
      return res.status(400).json({ message: 'Rental is not available' });
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const now = new Date();

    if (checkInDate < now) {
      return res.status(400).json({ message: 'Check-in date cannot be in the past' });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    // Check minimum stay (1 night)
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (nights < 1) {
      return res.status(400).json({ 
        message: 'Minimum stay is 1 night' 
      });
    }

    // Check maximum stay (30 nights)
    if (nights > 30) {
      return res.status(400).json({ 
        message: 'Maximum stay is 30 nights' 
      });
    }

    // Check availability (only block on confirmed/active stays which correspond to paid)
    const isAvailable = await Booking.checkAvailability(propertyId, checkInDate, checkOutDate);
    if (!isAvailable) {
      return res.status(400).json({ message: 'Rental is not available for the selected dates' });
    }

    // Calculate pricing
    const basePrice = rental.price * nights;
    const totalAmount = basePrice;

    // Create booking
    const booking = new Booking({
      property: propertyId,
      guest: req.user._id,
      host: rental.owner,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: typeof guests === 'string' ? JSON.parse(guests) : guests,
      pricing: {
        basePrice,
        cleaningFee: 0,
        serviceFee: 0,
        securityDeposit: 0,
        taxes: 0,
        totalAmount,
        currency: 'USD'
      },
      payment: {
        method: paymentMethod || 'stripe',
        status: 'pending'
      },
      specialRequests
    });

    await booking.save();

    // Populate references for response
    await booking.populate('property', 'title images location price');
    await booking.populate('host', 'name email');

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/bookings/:id/confirm - Confirm booking (host only)
router.put('/:id/confirm', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is the host
    const hostId = booking.host._id ? booking.host._id.toString() : booking.host.toString();
    if (hostId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if booking is pending
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking is not pending' });
    }

    booking.status = 'confirmed';
    await booking.save();

    res.json(booking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/bookings/:id/cancel - Cancel booking
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is authorized to cancel
    const guestId = booking.guest._id ? booking.guest._id.toString() : booking.guest.toString();
    const hostId = booking.host._id ? booking.host._id.toString() : booking.host.toString();
    const userId = req.user._id.toString();

    if (guestId !== userId && hostId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({ message: 'Booking cannot be cancelled' });
    }

    // Determine who is cancelling
    const cancelledBy = guestId === userId ? 'guest' : 'host';

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy,
      cancelledAt: new Date(),
      reason,
      refundAmount: booking.pricing.totalAmount,
      refundStatus: 'pending'
    };

    await booking.save();

    res.json(booking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/bookings/:id/complete - Complete booking (host only)
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is the host
    const hostId = booking.host._id ? booking.host._id.toString() : booking.host.toString();
    if (hostId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if booking is active and check-out date has passed
    if (booking.status !== 'active') {
      return res.status(400).json({ message: 'Booking is not active' });
    }

    const now = new Date();
    if (booking.checkOut > now) {
      return res.status(400).json({ message: 'Check-out date has not passed' });
    }

    booking.status = 'completed';
    await booking.save();

    res.json(booking);
  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/bookings/:id/messages - Send message
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is authorized to send messages
    const guestId = booking.guest._id ? booking.guest._id.toString() : booking.guest.toString();
    const hostId = booking.host._id ? booking.host._id.toString() : booking.host.toString();
    const userId = req.user._id.toString();

    if (guestId !== userId && hostId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.messages.push({
      sender: req.user._id,
      message,
      timestamp: new Date()
    });

    await booking.save();
    res.json(booking.messages[booking.messages.length - 1]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
