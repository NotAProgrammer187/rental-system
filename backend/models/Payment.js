const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  stripePaymentIntentId: String,
  stripeChargeId: String,
  paypalOrderId: String,
  paypalCaptureId: String,
  transactionId: String,
  description: String,
  metadata: {
    type: Map,
    of: String
  },
  refunds: [{
    amount: {
      type: Number,
      required: true
    },
    reason: String,
    stripeRefundId: String,
    paypalRefundId: String,
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },
  processedAt: Date,
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
paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ paypalOrderId: 1 });
paymentSchema.index({ createdAt: -1 });

// Update timestamp
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total refunded amount
paymentSchema.virtual('totalRefunded').get(function() {
  return this.refunds.reduce((total, refund) => {
    return total + (refund.status === 'succeeded' ? refund.amount : 0);
  }, 0);
});

// Virtual for remaining amount after refunds
paymentSchema.virtual('remainingAmount').get(function() {
  return this.amount - this.totalRefunded;
});

// Method to check if payment is fully refunded
paymentSchema.methods.isFullyRefunded = function() {
  return this.totalRefunded >= this.amount;
};

// Method to check if payment can be refunded
paymentSchema.methods.canRefund = function() {
  return this.status === 'completed' && !this.isFullyRefunded();
};

// Static method to get user's payment history
paymentSchema.statics.getUserPayments = async function(userId, options = {}) {
  const { limit = 10, skip = 0, status } = options;
  
  const query = { user: userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('booking', 'property checkIn checkOut status')
    .populate('booking.property', 'title location images')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        // Only count amounts from completed payments as "spent"
        totalAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        totalRefunded: {
          $sum: {
            $reduce: {
              input: '$refunds',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  { $cond: [{ $eq: ['$$this.status', 'succeeded'] }, '$$this.amount', 0] }
                ]
              }
            }
          }
        },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalPayments: 0,
    totalAmount: 0,
    totalRefunded: 0,
    completedPayments: 0,
    failedPayments: 0
  };
};

module.exports = mongoose.model('Payment', paymentSchema);
