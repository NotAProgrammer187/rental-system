const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const rentalRoutes = require('./rentals');
const bookingRoutes = require('./bookings');

// Use routes
router.use('/auth', authRoutes);
router.use('/rentals', rentalRoutes);
router.use('/bookings', bookingRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

module.exports = router;


