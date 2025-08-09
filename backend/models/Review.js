const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    accuracy: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    location: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    checkIn: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  response: {
    comment: String,
    respondedAt: Date
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  helpful: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
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
reviewSchema.index({ property: 1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ host: 1 });
reviewSchema.index({ createdAt: -1 });

// Update timestamp
reviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for average rating
reviewSchema.virtual('averageRating').get(function() {
  const ratings = [
    this.rating.cleanliness,
    this.rating.accuracy,
    this.rating.communication,
    this.rating.location,
    this.rating.checkIn,
    this.rating.value
  ];
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

// Method to check if user can review
reviewSchema.statics.canReview = async function(bookingId, userId) {
  const Booking = mongoose.model('Booking');
  const booking = await Booking.findById(bookingId);
  
  if (!booking) return false;
  
  // Check if booking is completed
  const now = new Date();
  if (booking.checkOut > now) return false;
  
  // Check if user is the guest
  if (booking.guest.toString() !== userId) return false;
  
  // Check if review already exists
  const existingReview = await this.findOne({ booking: bookingId });
  return !existingReview;
};

module.exports = mongoose.model('Review', reviewSchema);


