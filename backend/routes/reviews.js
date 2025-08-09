const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { auth, isAdmin } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const User = require('../models/User');

// Ensure uploads directory exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const reviewsUploadDir = path.join(__dirname, '..', 'uploads', 'reviews');
ensureDir(reviewsUploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, reviewsUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeBase = (req.user?._id?.toString() || 'anon') + '-' + uniqueSuffix;
    cb(null, `${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024, files: 5 }, // 6MB per image, max 5 images
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Allowed: JPG, PNG, WEBP'));
    }
    cb(null, true);
  },
});

async function compressImage(filePath) {
  // compress to webp with max width 1600px
  const outputPath = filePath.replace(/\.[^.]+$/, '.webp');
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const width = Math.min(metadata.width || 1600, 1600);
    await image.resize({ width }).webp({ quality: 80 }).toFile(outputPath);
    fs.unlinkSync(filePath); // remove original
    return { outputPath, width, height: Math.round((metadata.height || width) * (width / (metadata.width || width))) };
  } catch (e) {
    // If compression fails, keep the original
    return { outputPath: filePath, width: undefined, height: undefined };
  }
}

async function recomputeRentalRatings(rentalId) {
  const agg = await Review.aggregate([
    { $match: { revieweeType: 'rental', rental: new (require('mongoose')).Types.ObjectId(rentalId), status: 'approved' } },
    { $group: { _id: '$rental', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await Rental.findByIdAndUpdate(rentalId, { ratingAverage: Number(avg.toFixed(1)) || 0, reviewCount: count });
}

// Guest creates review for rental
router.post('/booking/:bookingId/rental', auth, sanitizeInput, upload.array('photos', 5), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, comment } = req.body;

    const canReview = await Review.canGuestReviewRental(bookingId, req.user._id);
    if (!canReview) {
      return res.status(400).json({ message: 'You are not eligible to review this stay or you already left a review.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const photos = [];
    if (req.files && req.files.length) {
      for (const f of req.files) {
        const { outputPath, width, height } = await compressImage(f.path);
        photos.push({
          path: `/uploads/reviews/${path.basename(outputPath)}`,
          originalName: f.originalname,
          width,
          height,
          size: f.size,
          mimeType: 'image/webp'
        });
      }
    }

    const review = new Review({
      booking: booking._id,
      reviewer: req.user._id,
      revieweeType: 'rental',
      rental: booking.property,
      host: booking.host,
      rating: Number(rating),
      comment: comment?.toString().trim(),
      photos,
      status: 'pending'
    });

    await review.save();
    res.status(201).json({ message: 'Review submitted and pending approval', review });
  } catch (error) {
    console.error('Create rental review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Host creates review for guest
router.post('/booking/:bookingId/guest', auth, sanitizeInput, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, comment } = req.body;

    const canReview = await Review.canHostReviewGuest(bookingId, req.user._id);
    if (!canReview) {
      return res.status(400).json({ message: 'You are not eligible to review this guest or you already left a review.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const review = new Review({
      booking: booking._id,
      reviewer: req.user._id,
      revieweeType: 'user',
      revieweeUser: booking.guest,
      rating: Number(rating),
      comment: comment?.toString().trim(),
      status: 'pending'
    });
    await review.save();
    res.status(201).json({ message: 'Guest review submitted and pending approval', review });
  } catch (error) {
    console.error('Create guest review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get rental reviews (approved only)
router.get('/rental/:rentalId', async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const sortSpec = sort === 'rating' ? { rating: -1 } : { createdAt: -1 };
    const query = { revieweeType: 'rental', rental: rentalId, status: 'approved' };
    const reviews = await Review.find(query)
      .populate('reviewer', 'name avatar')
      .sort(sortSpec)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();
    const total = await Review.countDocuments(query);
    res.json({ reviews, pagination: { currentPage: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    console.error('List rental reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reviews for a user (approved only)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const query = { revieweeType: 'user', revieweeUser: userId, status: 'approved' };
    const reviews = await Review.find(query)
      .populate('reviewer', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();
    const total = await Review.countDocuments(query);
    res.json({ reviews, pagination: { currentPage: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    console.error('List user reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if current user has reviews for booking
router.get('/booking/:bookingId/me', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const mine = await Review.find({ booking: bookingId, reviewer: req.user._id }).select('revieweeType createdAt').lean();
    res.json({ reviews: mine });
  } catch (error) {
    console.error('Check my review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit review within 48 hours
router.put('/:id', auth, sanitizeInput, upload.array('photos', 5), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (new Date() > new Date(review.editableUntil)) {
      return res.status(400).json({ message: 'Editing window has expired' });
    }

    const { rating, comment } = req.body;
    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment.toString().trim();

    if (req.files && req.files.length) {
      // Replace photos
      review.photos = [];
      for (const f of req.files) {
        const { outputPath, width, height } = await compressImage(f.path);
        review.photos.push({
          path: `/uploads/reviews/${path.basename(outputPath)}`,
          originalName: f.originalname,
          width,
          height,
          size: f.size,
          mimeType: 'image/webp'
        });
      }
    }

    // Re-moderate after edit
    review.status = 'pending';
    await review.save();
    res.json({ message: 'Review updated and pending approval', review });
  } catch (error) {
    console.error('Edit review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Report a review
router.post('/:id/report', auth, sanitizeInput, async (req, res) => {
  try {
    const { reason, comment } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.reports.push({ user: req.user._id, reason, comment });
    if (review.status === 'approved') review.status = 'flagged';
    await review.save();
    res.json({ message: 'Review reported', review });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin moderation endpoints
router.get('/admin', auth, isAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const query = { status };
    const reviews = await Review.find(query)
      .populate('reviewer', 'name email')
      .populate('revieweeUser', 'name email')
      .populate('rental', 'title')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Review.countDocuments(query);
    res.json({ reviews, pagination: { currentPage: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    console.error('Admin list reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.status = 'approved';
    await review.save();
    if (review.revieweeType === 'rental' && review.rental) {
      await recomputeRentalRatings(review.rental);
    }
    res.json({ message: 'Review approved' });
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/:id/reject', auth, isAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.status = 'rejected';
    await review.save();
    if (review.revieweeType === 'rental' && review.rental) {
      await recomputeRentalRatings(review.rental);
    }
    res.json({ message: 'Review rejected' });
  } catch (error) {
    console.error('Reject review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

