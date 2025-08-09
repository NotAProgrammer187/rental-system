const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');

// Guard: must be host or admin
router.use(auth, (req, res, next) => {
  if (req.user.role !== 'host' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Host role required.' });
  }
  if (req.user.role !== 'admin' && req.user.verificationStatus !== 'approved') {
    return res.status(403).json({ message: 'You must be verified by an admin' });
  }
  next();
});

// GET /api/host/earnings - summary and monthly stats
router.get('/earnings', async (req, res) => {
  try {
    const hostId = req.user._id;

    // Total earned (sum of paid bookings)
    const summary = await Booking.aggregate([
      { $match: { host: hostId, 'payment.status': 'paid' } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$pricing.totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly earnings for last 12 months
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthly = await Booking.aggregate([
      { $match: { host: hostId, 'payment.status': 'paid', createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          amount: { $sum: '$pricing.totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Upcoming payouts placeholder: paid bookings in last 7 days
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const recentPaid = await Booking.aggregate([
      { $match: { host: hostId, 'payment.status': 'paid', 'payment.paidAt': { $gte: sevenDaysAgo } } },
      { $group: { _id: null, amount: { $sum: '$pricing.totalAmount' }, count: { $sum: 1 } } }
    ]);

    res.json({
      totalEarned: summary[0]?.totalEarned || 0,
      totalPaidBookings: summary[0]?.count || 0,
      monthly,
      upcomingPayouts: { amount: recentPaid[0]?.amount || 0, count: recentPaid[0]?.count || 0 }
    });
  } catch (error) {
    console.error('Host earnings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/host/earnings/export?format=csv
router.get('/earnings/export', async (req, res) => {
  try {
    const hostId = req.user._id;
    const bookings = await Booking.find({ host: hostId, 'payment.status': 'paid' })
      .populate('property', 'title location')
      .lean();

    const rows = [
      ['BookingID', 'Property', 'Location', 'CheckIn', 'CheckOut', 'Amount', 'Currency', 'PaidAt']
    ];
    for (const b of bookings) {
      rows.push([
        b._id.toString(),
        b.property?.title || '',
        b.property?.location || '',
        b.checkIn?.toISOString() || '',
        b.checkOut?.toISOString() || '',
        (b.pricing?.totalAmount ?? 0).toString(),
        (b.pricing?.currency ?? 'USD').toString(),
        b.payment?.paidAt ? new Date(b.payment.paidAt).toISOString() : ''
      ]);
    }

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="host-earnings.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Host earnings export error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET blocked dates for a rental
router.get('/rental/:id/blocked-dates', async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id).select('owner blockedDates');
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (rental.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ blockedDates: rental.blockedDates || [] });
  } catch (error) {
    console.error('Get blocked dates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT blocked dates for a rental
router.put('/rental/:id/blocked-dates', async (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ message: 'dates must be an array' });
    const rental = await Rental.findById(req.params.id).select('owner blockedDates');
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (rental.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    rental.blockedDates = dates;
    await rental.save();
    res.json({ blockedDates: rental.blockedDates });
  } catch (error) {
    console.error('Update blocked dates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


