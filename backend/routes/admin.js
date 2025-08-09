const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const VerificationDocument = require('../models/VerificationDocument');

// All routes require admin
router.use(auth, isAdmin);

// GET /api/admin/verifications
router.get('/verifications', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const users = await User.find({ verificationStatus: status })
      .select('name email verificationSubmittedAt verificationStatus')
      .sort({ verificationSubmittedAt: -1 })
      .lean();

    const userIds = users.map(u => u._id);
    const docs = await VerificationDocument.find({ user: { $in: userIds } }).lean();
    const userIdToDocs = docs.reduce((acc, d) => {
      const key = d.user.toString();
      acc[key] = acc[key] || [];
      acc[key].push(d);
      return acc;
    }, {});

    const response = users.map(u => ({ ...u, documents: userIdToDocs[u._id.toString()] || [] }));
    res.json(response);
  } catch (error) {
    console.error('Admin verifications list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/verifications/:id/approve
router.post('/verifications/:id/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.verificationStatus = 'approved';
    user.verificationReason = null;
    user.verificationReviewedAt = new Date();
    user.verificationReviewedBy = req.user._id;
    user.verificationLog.push({ action: 'approved', admin: req.user._id });
    if (user.role === 'user') user.role = 'host';
    await user.save();

    res.json({ message: 'User approved as host' });
  } catch (error) {
    console.error('Admin approve error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/verifications/:id/reject
router.post('/verifications/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.verificationStatus = 'rejected';
    user.verificationReason = reason.trim();
    user.verificationReviewedAt = new Date();
    user.verificationReviewedBy = req.user._id;
    user.verificationLog.push({ action: 'rejected', admin: req.user._id, reason: user.verificationReason });
    await user.save();

    res.json({ message: 'Verification rejected' });
  } catch (error) {
    console.error('Admin reject error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


