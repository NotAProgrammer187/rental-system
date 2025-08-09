const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');

class StripeService {
  // Create a payment intent for a booking
  static async createPaymentIntent(bookingId, userId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('property', 'title location')
        .populate('guest', 'name email');

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.guest._id.toString() !== userId) {
        throw new Error('Not authorized to pay for this booking');
      }

      if (booking.payment.status === 'paid') {
        throw new Error('Payment already completed');
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.pricing.totalAmount * 100), // Convert to cents
        currency: booking.pricing.currency.toLowerCase(),
        metadata: {
          bookingId: booking._id.toString(),
          userId: userId,
          propertyTitle: booking.property.title,
          checkIn: booking.checkIn.toISOString(),
          checkOut: booking.checkOut.toISOString()
        },
        description: `Payment for ${booking.property.title} - ${booking.checkIn.toLocaleDateString()} to ${booking.checkOut.toLocaleDateString()}`,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create or update payment record
      let payment = await Payment.findOne({ booking: bookingId });
      
      if (!payment) {
        payment = new Payment({
          booking: bookingId,
          user: userId,
          amount: booking.pricing.totalAmount,
          currency: booking.pricing.currency,
          paymentMethod: 'stripe',
          status: 'pending',
          stripePaymentIntentId: paymentIntent.id,
          description: `Payment for ${booking.property.title}`,
          metadata: {
            bookingId: booking._id.toString(),
            propertyTitle: booking.property.title,
            checkIn: booking.checkIn.toISOString(),
            checkOut: booking.checkOut.toISOString()
          }
        });
      } else {
        payment.stripePaymentIntentId = paymentIntent.id;
        payment.status = 'pending';
        payment.updatedAt = new Date();
      }

      await payment.save();

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: booking.pricing.totalAmount,
        currency: booking.pricing.currency
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm payment after successful payment
  static async confirmPayment(paymentIntentId) {
    try {
      // Try to find an existing local payment record first
      let payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });

      // Retrieve payment intent from Stripe (we'll reuse this below)
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // If we don't have a local record, reconstruct it from the payment intent metadata
      if (!payment) {
        const bookingId = paymentIntent.metadata?.bookingId;
        const userId = paymentIntent.metadata?.userId;
        const amount = (paymentIntent.amount || 0) / 100;
        const currency = (paymentIntent.currency || 'usd').toUpperCase();

        if (!bookingId || !userId) {
          throw new Error('Payment not found');
        }

        payment = new Payment({
          booking: bookingId,
          user: userId,
          amount,
          currency,
          paymentMethod: 'stripe',
          status: 'pending',
          stripePaymentIntentId: paymentIntentId,
          description: `Payment for booking ${bookingId} (reconstructed)`,
          metadata: {
            bookingId,
            userId
          }
        });
        await payment.save();
      }

      if (paymentIntent.status === 'succeeded') {
        // Update payment status
        payment.status = 'completed';
        payment.stripeChargeId = paymentIntent.latest_charge;
        payment.transactionId = paymentIntent.latest_charge;
        payment.processedAt = new Date();
        await payment.save();

        // Update booking payment status
        const booking = await Booking.findById(payment.booking);
        if (booking) {
          booking.payment.status = 'paid';
          booking.payment.transactionId = paymentIntent.latest_charge;
          booking.payment.paidAt = new Date();
          booking.status = 'confirmed';
          await booking.save();
        }

        // Update user stats
        const user = await User.findById(payment.user);
        if (user) {
          user.stats.totalSpent += payment.amount;
          user.stats.totalBookings += 1;
          await user.save();
        }

        return payment;
      } else if (paymentIntent.status === 'canceled') {
        payment.status = 'cancelled';
        await payment.save();
        throw new Error('Payment was cancelled');
      } else {
        payment.status = 'failed';
        payment.error = {
          code: paymentIntent.last_payment_error?.code || 'payment_failed',
          message: paymentIntent.last_payment_error?.message || 'Payment failed',
          details: paymentIntent.last_payment_error
        };
        await payment.save();
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  // Process refund for a booking
  static async processRefund(bookingId, amount, reason = 'Cancellation') {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('property', 'title');

      if (!booking) {
        throw new Error('Booking not found');
      }

      const payment = await Payment.findOne({ booking: bookingId });
      
      if (!payment) {
        throw new Error('Payment not found for this booking');
      }

      if (!payment.canRefund()) {
        throw new Error('Payment cannot be refunded');
      }

      // Calculate refund amount (if not specified, refund remaining amount)
      const refundAmount = amount || payment.remainingAmount;
      
      if (refundAmount <= 0) {
        throw new Error('No amount available for refund');
      }

      if (refundAmount > payment.remainingAmount) {
        throw new Error('Refund amount exceeds remaining payment amount');
      }

      // Process refund through Stripe
      const refund = await stripe.refunds.create({
        charge: payment.stripeChargeId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          bookingId: bookingId,
          reason: reason
        }
      });

      // Add refund to payment record
      payment.refunds.push({
        amount: refundAmount,
        reason: reason,
        stripeRefundId: refund.id,
        status: refund.status === 'succeeded' ? 'succeeded' : 'pending'
      });

      // Update payment status if fully refunded
      if (payment.isFullyRefunded()) {
        payment.status = 'refunded';
      }

      await payment.save();

      // Update booking status if fully refunded
      if (payment.isFullyRefunded()) {
        booking.payment.status = 'refunded';
        booking.status = 'cancelled';
        booking.cancellation.refundStatus = 'completed';
        booking.cancellation.refundAmount = refundAmount;
        await booking.save();
      }

      return {
        refundId: refund.id,
        amount: refundAmount,
        status: refund.status,
        payment: payment
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Get payment details
  static async getPaymentDetails(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('booking', 'property checkIn checkOut status')
        .populate('booking.property', 'title location images')
        .populate('user', 'name email');

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      console.error('Error getting payment details:', error);
      throw error;
    }
  }

  // Get user's payment history
  static async getUserPaymentHistory(userId, options = {}) {
    try {
      return await Payment.getUserPayments(userId, options);
    } catch (error) {
      console.error('Error getting user payment history:', error);
      throw error;
    }
  }

  // Get payment statistics for a user
  static async getUserPaymentStats(userId) {
    try {
      return await Payment.getPaymentStats(userId);
    } catch (error) {
      console.error('Error getting user payment stats:', error);
      throw error;
    }
  }

  // Handle webhook events from Stripe
  static async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.confirmPayment(event.data.object.id);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object.id);
          break;
        
        case 'charge.refunded':
          await this.handleRefundSuccess(event.data.object.id);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  // Handle payment failure
  static async handlePaymentFailure(paymentIntentId) {
    try {
      const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
      
      if (payment) {
        payment.status = 'failed';
        payment.error = {
          code: 'payment_failed',
          message: 'Payment failed',
          details: { paymentIntentId }
        };
        await payment.save();
      }
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  // Handle refund success
  static async handleRefundSuccess(chargeId) {
    try {
      const payment = await Payment.findOne({ stripeChargeId: chargeId });
      
      if (payment) {
        const refund = payment.refunds.find(r => r.stripeRefundId);
        if (refund) {
          refund.status = 'succeeded';
          await payment.save();
        }
      }
    } catch (error) {
      console.error('Error handling refund success:', error);
    }
  }
}

module.exports = StripeService;
