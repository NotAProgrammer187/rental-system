const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const StripeService = require('../services/stripeService');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent for a booking
router.post('/create-payment-intent/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id.toString();

    const paymentIntent = await StripeService.createPaymentIntent(bookingId, userId);
    
    res.json({
      success: true,
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Confirm payment (webhook or manual confirmation)
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    const payment = await StripeService.confirmPayment(paymentIntentId);
    
    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      payment: payment
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Process refund for a booking
router.post('/refund/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { amount, reason } = req.body;
    const userId = req.user._id.toString();

    // Check if user is authorized to refund this booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only the guest or host can request refunds
    if (booking.guest.toString() !== userId && booking.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to refund this booking'
      });
    }

    const refund = await StripeService.processRefund(bookingId, amount, reason);
    
    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: refund
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get payment details
router.get('/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id.toString();

    const payment = await StripeService.getPaymentDetails(paymentId);
    
    // Check if user is authorized to view this payment
    if (payment.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.json({
      success: true,
      payment: payment
    });
  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get user's payment history
router.get('/history/user', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { limit = 10, skip = 0, status } = req.query;

    const payments = await StripeService.getUserPaymentHistory(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      status
    });

    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get user's payment statistics
router.get('/stats/user', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const stats = await StripeService.getUserPaymentStats(userId);

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error getting payment stats:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get payment history for a specific booking
router.get('/history/booking/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id.toString();

    // Check if user is authorized to view this booking's payments
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.guest.toString() !== userId && booking.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking\'s payments'
      });
    }

    const payments = await Payment.find({ booking: bookingId })
      .populate('booking', 'property checkIn checkOut status')
      .populate('booking.property', 'title location images')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Error getting booking payment history:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await StripeService.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

module.exports = router;
