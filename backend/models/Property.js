const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'villa', 'cabin', 'studio', 'loft'],
    required: true
  },
  category: {
    type: String,
    enum: ['entire-place', 'private-room', 'shared-room'],
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    coordinates: {
      lat: Number,
      lng: Number
    },
    formattedAddress: String
  },
  pricing: {
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
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
    weeklyDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    monthlyDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  capacity: {
    guests: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    bedrooms: {
      type: Number,
      required: true,
      min: 0
    },
    beds: {
      type: Number,
      required: true,
      min: 1
    },
    bathrooms: {
      type: Number,
      required: true,
      min: 0
    }
  },
  amenities: [{
    category: {
      type: String,
      enum: ['essentials', 'features', 'location', 'safety']
    },
    items: [String]
  }],
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    instantBookable: {
      type: Boolean,
      default: false
    },
    minStay: {
      type: Number,
      default: 1
    },
    maxStay: {
      type: Number,
      default: 365
    },
    checkInTime: {
      type: String,
      default: '15:00'
    },
    checkOutTime: {
      type: String,
      default: '11:00'
    },
    blockedDates: [{
      startDate: Date,
      endDate: Date,
      reason: String
    }]
  },
  rules: {
    smoking: {
      type: Boolean,
      default: false
    },
    pets: {
      type: Boolean,
      default: false
    },
    parties: {
      type: Boolean,
      default: false
    },
    children: {
      type: Boolean,
      default: true
    },
    additionalRules: [String]
  },
  ratings: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    cleanliness: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    communication: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    location: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    checkIn: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'suspended'],
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0
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
propertySchema.index({ 'location.coordinates': '2dsphere' });
propertySchema.index({ host: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ 'pricing.basePrice': 1 });
propertySchema.index({ 'capacity.guests': 1 });
propertySchema.index({ createdAt: -1 });

// Update timestamp
propertySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total price calculation
propertySchema.virtual('totalPrice').get(function() {
  return this.pricing.basePrice + this.pricing.cleaningFee + this.pricing.serviceFee;
});

// Method to check availability for a date range
propertySchema.methods.isAvailableForDates = async function(startDate, endDate) {
  const Booking = mongoose.model('Booking');
  
  // Check for existing bookings in the date range
  const conflictingBooking = await Booking.findOne({
    property: this._id,
    status: { $in: ['confirmed', 'active'] },
    $or: [
      {
        checkIn: { $lt: endDate },
        checkOut: { $gt: startDate }
      }
    ]
  });
  
  return !conflictingBooking;
};

module.exports = mongoose.model('Property', propertySchema);


