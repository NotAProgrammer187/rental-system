const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: true
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  guests: {
    adults: {
      type: Number,
      required: true,
      min: 1
    },
    children: {
      type: Number,
      default: 0,
      min: 0
    },
    infants: {
      type: Number,
      default: 0,
      min: 0
    },
    pets: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  pricing: {
    basePrice: {
      type: Number,
      required: true
    },
    cleaningFee: {
      type: Number,
      default: 0
    },
    serviceFee: {
      type: Number,
      default: 0
    },
    securityDeposit: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date,
    refundedAt: Date
  },
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['guest', 'host', 'system']
    },
    cancelledAt: Date,
    reason: String,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'completed'],
      default: 'pending'
    }
  },
  specialRequests: String,
  checkInInstructions: String,
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
bookingSchema.index({ property: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1 });
bookingSchema.index({ host: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'payment.status': 1 });
bookingSchema.index({ createdAt: -1 });

// Update timestamp
bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for calculating number of nights
bookingSchema.virtual('nights').get(function() {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((this.checkOut - this.checkIn) / oneDay));
});

// Method to check if booking is active
bookingSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && this.checkIn <= now && this.checkOut > now;
};

// Method to check if booking is upcoming
bookingSchema.methods.isUpcoming = function() {
  const now = new Date();
  return this.status === 'confirmed' && this.checkIn > now;
};

// Method to check if booking is completed
bookingSchema.methods.isCompleted = function() {
  const now = new Date();
  return this.status === 'completed' || (this.status === 'active' && this.checkOut <= now);
};

// Static method to check availability for a rental
bookingSchema.statics.checkAvailability = async function(rentalId, checkIn, checkOut) {
  const conflictingBooking = await this.findOne({
    property: rentalId,
    status: { $in: ['confirmed', 'active'] },
    $or: [
      {
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn }
      }
    ]
  });
  
  return !conflictingBooking;
};

// Static method to get rental bookings for a date range
bookingSchema.statics.getRentalBookings = async function(rentalId, startDate, endDate) {
  return this.find({
    property: rentalId,
    status: { $in: ['confirmed', 'active'] },
    $or: [
      {
        checkIn: { $gte: startDate, $lte: endDate }
      },
      {
        checkOut: { $gte: startDate, $lte: endDate }
      },
      {
        checkIn: { $lte: startDate },
        checkOut: { $gte: endDate }
      }
    ]
  }).populate('guest', 'name email');
};

module.exports = mongoose.model('Booking', bookingSchema);
