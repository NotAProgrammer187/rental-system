const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { auth, isAdmin } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/validation');
const User = require('../models/User');
const VerificationDocument = require('../models/VerificationDocument');

// Storage for verification documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'verification');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${req.user?._id || 'anon'}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf'
];

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Allowed: JPG, PNG, PDF'));
    }
    cb(null, true);
  },
});

// Limit submissions to avoid spam (3 per hour)
const verificationLimiter = createRateLimiter(60 * 60 * 1000, 3);

// POST /api/verification - submit verification docs
router.post('/', auth, verificationLimiter, upload.fields([
  { name: 'id', maxCount: 1 },
  { name: 'property_proof', maxCount: 3 },
  { name: 'bank_proof', maxCount: 1 },
]), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Prevent duplicate submissions when pending/approved
    if (user.verificationStatus === 'pending') {
      return res.status(400).json({ message: 'You already have a pending verification. Please wait for review.' });
    }
    if (user.verificationStatus === 'approved') {
      return res.status(400).json({ message: 'Your account is already verified.' });
    }

    // Create or replace documents
    const files = req.files || {};
    const createdDocs = [];

    // Clear previous docs on resubmission (status was rejected or not set)
    await VerificationDocument.deleteMany({ user: user._id });

    const createDoc = async (docFile, type) => {
      if (!docFile) return;
      const file = Array.isArray(docFile) ? docFile[0] : docFile;
      const doc = new VerificationDocument({
        user: user._id,
        documentType: type,
        filePath: `/uploads/verification/${file.filename}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
      await doc.save();
      createdDocs.push(doc);
    };

    await createDoc(files.id?.[0], 'id');
    if (files.property_proof?.length) {
      for (const f of files.property_proof) {
        await createDoc(f, 'property_proof');
      }
    }
    await createDoc(files.bank_proof?.[0], 'bank_proof');

    // Update user verification status
    const action = user.verificationStatus === 'rejected' ? 'resubmitted' : 'submitted';
    user.verificationStatus = 'pending';
    user.verificationReason = null;
    user.verificationSubmittedAt = new Date();
    user.verificationLog.push({ action });
    await user.save();

    res.status(201).json({ message: 'Verification submitted', documents: createdDocs });
  } catch (error) {
    console.error('Verification submit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/verification/status - current user's status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('verificationStatus verificationReason verificationSubmittedAt verificationReviewedAt');
    const docs = await VerificationDocument.find({ user: req.user._id }).select('-__v').lean();
    res.json({
      status: user.verificationStatus,
      reason: user.verificationReason,
      submittedAt: user.verificationSubmittedAt,
      reviewedAt: user.verificationReviewedAt,
      documents: docs,
    });
  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN: GET /api/verification/admin/requests?status=pending
router.get('/admin/requests', auth, isAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const users = await User.find({ verificationStatus: status })
      .select('name email verificationSubmittedAt verificationStatus')
      .sort({ verificationSubmittedAt: -1 })
      .lean();

    // attach documents preview
    const userIds = users.map(u => u._id);
    const docs = await VerificationDocument.find({ user: { $in: userIds } }).lean();
    const userIdToDocs = docs.reduce((acc, d) => {
      const key = d.user.toString();
      acc[key] = acc[key] || [];
      acc[key].push(d);
      return acc;
    }, {});

    const response = users.map(u => ({
      ...u,
      documents: userIdToDocs[u._id.toString()] || [],
    }));

    res.json(response);
  } catch (error) {
    console.error('Admin list verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN: Secure preview of a document
router.get('/admin/document/:docId', auth, isAdmin, async (req, res) => {
  try {
    const doc = await VerificationDocument.findById(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const baseDir = path.join(__dirname, '..');
    const relativePath = doc.filePath.startsWith('/') ? doc.filePath.slice(1) : doc.filePath;
    const absolutePath = path.join(baseDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'File missing on server' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName || path.basename(absolutePath)}"`);
    fs.createReadStream(absolutePath).pipe(res);
  } catch (error) {
    console.error('Admin document preview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN: POST /api/verification/admin/:userId/approve
router.post('/admin/:userId/approve', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.verificationStatus = 'approved';
    user.verificationReason = null;
    user.verificationReviewedAt = new Date();
    user.verificationReviewedBy = req.user._id;
    user.verificationLog.push({ action: 'approved', admin: req.user._id });
    // elevate role to host if not already
    if (user.role === 'user') user.role = 'host';

    await user.save();

    // TODO: send notification (email/push)
    res.json({ message: 'User approved as host' });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN: POST /api/verification/admin/:userId/reject
router.post('/admin/:userId/reject', auth, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.verificationStatus = 'rejected';
    user.verificationReason = reason.trim();
    user.verificationReviewedAt = new Date();
    user.verificationReviewedBy = req.user._id;
    user.verificationLog.push({ action: 'rejected', admin: req.user._id, reason: user.verificationReason });
    await user.save();

    // TODO: send notification
    res.json({ message: 'Verification rejected' });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


