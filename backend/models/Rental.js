const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  location: {
    type: String,
    required: true
  },
  bedrooms: {
    type: Number,
    default: 0,
    min: 0
  },
  bathrooms: {
    type: Number,
    default: 0,
    min: 0
  },
  squareFeet: {
    type: Number,
    default: 0,
    min: 0
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'townhouse', 'studio'],
    default: 'apartment'
  },
  images: [{
    data: {
      type: String, // Base64 encoded image data
      required: false
    },
    contentType: {
      type: String, // MIME type (e.g., 'image/jpeg', 'image/png')
      required: false
    },
    filename: {
      type: String,
      required: false
    },
    size: {
      type: Number, // File size in bytes
      required: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  blockedDates: [{
    type: String // store as 'YYYY-MM-DD'
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

// Update the updatedAt field before saving
rentalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Aggregate rating fields (computed from approved reviews)
rentalSchema.add({
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Rental', rentalSchema);


