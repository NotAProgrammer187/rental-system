const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const rentalRoutes = require('./rentals');
const bookingRoutes = require('./bookings');
const paymentRoutes = require('./payments');
const verificationRoutes = require('./verification');
const hostRoutes = require('./host');
const adminRoutes = require('./admin');

// Use routes
router.use('/auth', authRoutes);
router.use('/rentals', rentalRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/verification', verificationRoutes);
router.use('/host', hostRoutes);
router.use('/admin', adminRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

module.exports = router;


