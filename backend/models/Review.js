const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Links the review to a booking to enforce eligibility (one review per booking per reviewer per type)
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },

  // The user who wrote the review
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // What is being reviewed
  revieweeType: {
    type: String,
    enum: ['rental', 'user'],
    required: true
  },
  rental: { // present when revieweeType === 'rental'
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental'
  },
  revieweeUser: { // present when revieweeType === 'user' (e.g., host reviews guest)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  host: { // convenience for property reviews to compute host rating
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Rating and content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // Optional photos
  photos: [{
    path: String, // e.g., /uploads/reviews/<file>
    originalName: String,
    width: Number,
    height: Number,
    size: Number,
    mimeType: String
  }],

  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Editing window support
  editableUntil: { type: Date },

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
reviewSchema.index({ rental: 1, status: 1, createdAt: -1 });
reviewSchema.index({ revieweeUser: 1, status: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ booking: 1, reviewer: 1, revieweeType: 1 }, { unique: true });

// Update timestamp and editableUntil on create
reviewSchema.pre('save', function(next) {
  const now = Date.now();
  if (!this.createdAt) {
    this.createdAt = now;
  }
  this.updatedAt = now;
  if (!this.editableUntil) {
    this.editableUntil = new Date(now + 48 * 60 * 60 * 1000);
  }
  next();
});

// Static: can a guest review a rental for this booking?
reviewSchema.statics.canGuestReviewRental = async function(bookingId, userId) {
  const Booking = mongoose.model('Booking');
  const booking = await Booking.findById(bookingId);
  if (!booking) return false;
  const now = new Date();
  if (booking.status !== 'completed' && booking.checkOut > now) return false;
  if (booking.guest.toString() !== userId.toString()) return false;
  const existing = await this.findOne({ booking: bookingId, reviewer: userId, revieweeType: 'rental' });
  return !existing;
};

// Static: can a host review the guest for this booking?
reviewSchema.statics.canHostReviewGuest = async function(bookingId, userId) {
  const Booking = mongoose.model('Booking');
  const booking = await Booking.findById(bookingId);
  if (!booking) return false;
  const now = new Date();
  if (booking.status !== 'completed' && booking.checkOut > now) return false;
  if (booking.host.toString() !== userId.toString()) return false;
  const existing = await this.findOne({ booking: bookingId, reviewer: userId, revieweeType: 'user' });
  return !existing;
};

module.exports = mongoose.model('Review', reviewSchema);


