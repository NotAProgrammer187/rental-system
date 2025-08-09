const mongoose = require('mongoose');

const verificationDocumentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  documentType: { type: String, enum: ['id', 'property_proof', 'bank_proof'], required: true },
  filePath: { type: String, required: true },
  originalName: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now }
});

verificationDocumentSchema.index({ user: 1, documentType: 1 });

module.exports = mongoose.model('VerificationDocument', verificationDocumentSchema);


